/* Q1/Q3/Q6 · E14 · O DOCE DE ORIGEM PRESA PRENDE A CRIATURA (ST-14.14c · spec E14 §4.3 · L-223)
 *
 * A origem restrita se propaga "pedra/doce → evolução/progresso". A pedra já
 * propagava (ST-14.0C); o doce não, e com o Market ligado (DEC-21) o PC-B
 * virava, pelo doce, nível numa criatura que se vende. O aceite:
 *
 *   a aposta paga com o que não negocia dá doce PRESO; a paga com PC-T, livre
 *   dar doce gasta os livres primeiro; o preso prende a criatura que subiu
 *   soltar uma criatura presa dá doce preso
 *   o resgate leva tudo, e os presos junto
 *   o legado não fica livre por omissão: a migração lê o bilhete
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { darDoceNaConta, soltarNaConta } from '../server/colecao.mjs';
import { creditarDoceDaAposta, resgatarDoces } from '../server/doce.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { doceLivreDaAposta, gastoDoDoce, classeAposDoce, doceLivreAoSoltar } from '../engine/doce-origem.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { creditar } from '../server/carteira.mjs';
import { apostar } from '../server/aposta.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const DEX = 16;
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const uid = cadastrar(db, { username: 'Doce1', email: 'doce1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid, linha: chaveDoDoce(PACK, DEX) };
}
const saldo = (k) => k.db.prepare(`SELECT quantidade, presos FROM species_candy WHERE user_id = ? AND species_id = ?`).get(k.uid, k.linha) ?? { quantidade: 0, presos: 0 };
const pôr = (k, quantidade, presos) => k.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade, presos) VALUES (?, ?, ?, ?)
  ON CONFLICT (user_id, species_id) DO UPDATE SET quantidade = excluded.quantidade, presos = excluded.presos`).run(k.uid, k.linha, quantidade, presos);
const classe = (k, id) => k.db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ?`).get(id).proveniencia;
const aposta = (k, betId, venceu, composicao) => creditarDoceDaAposta(k.db, { pack: PACK, userId: k.uid, betId, speciesId: DEX, venceu, composicao, agora: AGORA });

export async function suite() {
  const s = criarSuite('e14-doce-origem');

  s.teste('a camada 0: livre só o que veio do PC-T; os livres se gastam antes; o preso prende', () => {
    igual(`${doceLivreDaAposta({ transferivel: 50 })}|${doceLivreDaAposta({ bonus: 50 })}|${doceLivreDaAposta({ transferivel: 40, bonus: 10 })}|${doceLivreDaAposta({ competitivo: 50 })}|${doceLivreDaAposta(null)}`,
          'true|false|false|false|false', 'a origem do doce da aposta');
    igual(JSON.stringify(gastoDoDoce({ quantidade: 5, presos: 2, gastos: 3 })), '{"presosUsados":0,"prende":false}', 'os livres cobriam');
    igual(JSON.stringify(gastoDoDoce({ quantidade: 5, presos: 2, gastos: 4 })), '{"presosUsados":1,"prende":true}', 'faltou livre');
    igual(`${classeAposDoce('verified_earned', true)}|${classeAposDoce('p2p_verified', false)}|${classeAposDoce('legacy_unverified', true)}`,
          'promotional_bound|p2p_verified|legacy_unverified', 'a classe depois do doce');
    igual(`${doceLivreAoSoltar('verified_earned')}|${doceLivreAoSoltar('promotional_bound')}`, 'true|false', 'o doce de soltar');
  });

  s.teste('a aposta paga com PC-T dá doce livre; com bônus, preso; a mistura, preso inteiro', () => {
    const k = cena();
    const a = aposta(k, 'b1', true, { transferivel: 100 });
    igual(`${saldo(k).quantidade}|${saldo(k).presos}`, `${a.quantidade}|0`, 'o doce do PC-T');
    const b = aposta(k, 'b2', false, { bonus: 100 });
    igual(`${saldo(k).quantidade}|${saldo(k).presos}`, `${a.quantidade + b.quantidade}|${b.quantidade}`, 'o doce do bônus');
    const c = aposta(k, 'b3', true, { transferivel: 90, bonus: 10 });
    igual(saldo(k).presos, b.quantidade + c.quantidade, 'a mistura soltou parte do doce');
    igual(aposta(k, 'b2', false, { transferivel: 100 }).quantidade, 0, 'reliquidar creditou de novo');
  });

  s.teste('pela liquidação de verdade: quem apostou PC-T ganha doce livre, quem apostou bônus, preso', async () => {
    let t = Date.UTC(2026, 8, 1, 15);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    try {
      const r = srv.sched.abrirRodada();
      const alvo = srv.db.prepare(`SELECT slot, species_id FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(r.id);
      const conta = (n, bucket) => {
        const id = cadastrar(srv.db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: t }).id;
        creditar(srv.db, { userId: id, tipo: 'ADMIN_ADJUSTMENT', bucket, valor: 400, idem: `pc-${n}`, agora: t });
        return id;
      };
      const [pt, pb] = [conta('ApostaPT', 'transferivel'), conta('ApostaPB', 'bonus')];
      for (const u of [pt, pb]) apostar(srv.db, { sched: srv.sched, userId: u, slot: alvo.slot, valor: 50, agora: t });
      for (let i = 0; i < 300 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
      srv.laco.passo();
      const linha = chaveDoDoce(PACK, alvo.species_id);
      const de = u => srv.db.prepare(`SELECT quantidade, presos FROM species_candy WHERE user_id = ? AND species_id = ?`).get(u, linha);
      ok(de(pt)?.quantidade > 0 && de(pb)?.quantidade > 0, 'a liquidação não deu doce — o teste não mede nada');
      igual(`${de(pt).presos}|${de(pb).presos === de(pb).quantidade}`, '0|true', `o doce não seguiu o bolso da aposta: ${JSON.stringify([de(pt), de(pb)])}`);
    } finally { await srv.fechar(); }
  });

  s.teste('dar doce: o livre primeiro não prende; o preso prende a criatura e a tira do Market', () => {
    const k = cena();
    const cr = gerar(k.db, { userId: k.uid, pack: PACK, dex: DEX }).id;
    pôr(k, 3, 2);
    const r1 = darDoceNaConta(k.db, { userId: k.uid, pack: PACK, id: cr, quantos: 1, chaveIdem: 'doce-livre-1', agora: AGORA });
    igual(`${r1.prendeu}|${classe(k, cr)}|${saldo(k).quantidade}|${saldo(k).presos}`, 'false|verified_earned|2|2', 'o livre prendeu ou não saiu');
    ok(elegibilidadeDaCriatura(k.db, { userId: k.uid, pack: PACK, id: cr, acao: 'market', agora: AGORA }).reason_code !== 'ASSET_BOUND', 'o doce livre tirou a criatura do Market');
    const r2 = darDoceNaConta(k.db, { userId: k.uid, pack: PACK, id: cr, quantos: 1, chaveIdem: 'doce-preso-1', agora: AGORA + 1 });
    igual(`${r2.prendeu}|${classe(k, cr)}|${saldo(k).quantidade}|${saldo(k).presos}`, 'true|promotional_bound|1|1', 'o preso não prendeu');
    igual(elegibilidadeDaCriatura(k.db, { userId: k.uid, pack: PACK, id: cr, acao: 'market', agora: AGORA }).reason_code, 'ASSET_BOUND', 'a criatura presa segue indo ao Market');
    const outra = gerar(k.db, { userId: k.uid, pack: PACK, dex: DEX }).id;
    igual(darDoceNaConta(k.db, { userId: k.uid, pack: PACK, id: cr, quantos: 1, chaveIdem: 'doce-preso-1', agora: AGORA + 2 }).repetido, true, 'o reenvio gastou de novo');
    igual(classe(k, outra), 'verified_earned', 'o doce prendeu outra criatura');
  });

  s.teste('soltar a criatura presa dá doce preso; soltar a livre, livre', () => {
    const k = cena();
    const livre = gerar(k.db, { userId: k.uid, pack: PACK, dex: DEX }).id;
    const presa = gerar(k.db, { userId: k.uid, pack: PACK, dex: DEX, proveniencia: 'promotional_bound' }).id;
    k.db.prepare(`UPDATE criaturas SET na_caixa = 1`).run();   // só se solta quem está na caixa
    const a = soltarNaConta(k.db, { userId: k.uid, pack: PACK, id: livre, agora: AGORA });
    igual(saldo(k).presos, 0, 'soltar a livre deu doce preso');
    const b = soltarNaConta(k.db, { userId: k.uid, pack: PACK, id: presa, agora: AGORA + 1 });
    ok(b.doce > 0, 'soltar não deu doce — o teste não mede nada');
    igual(`${saldo(k).quantidade}|${saldo(k).presos}`, `${a.doce + b.doce}|${b.doce}`, 'soltar a presa lavou a origem');
  });

  s.teste('o resgate leva os doces e os presos juntos', () => {
    const k = cena();
    pôr(k, 4, 3);
    resgatarDoces(k.db, { userId: k.uid, chaveIdem: 'resgate-01', agora: AGORA });
    igual(`${saldo(k).quantidade}|${saldo(k).presos}`, '0|0', 'o resgate deixou presos');
  });

  s.teste('a migração: o legado da aposta com bônus nasce preso, até o que a linha ainda tem', () => {
    const db = abrirBanco(':memory:');
    const ultima = MIGRACOES.findIndex(m => m.nome === 'doce-origem-st14.14c');
    ok(ultima > 0, 'a migração não existe');
    migrar(db, ultima);
    const uid = cadastrar(db, { username: 'Doce2', email: 'doce2@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    const linha = chaveDoDoce(PACK, DEX);
    db.exec('PRAGMA foreign_keys = OFF');
    const bilhete = (id, comp) => db.prepare(`INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd, status, stake_breakdown, created_at)
      VALUES (?, ?, ?, 0, ?, 100, 2, 'perdida', ?, ?)`).run(id, uid, `r-${id}`, DEX, JSON.stringify(comp), AGORA);
    const livro = (id, d) => db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, ?, ?, 'aposta', ?, ?)`).run(uid, linha, d, `aposta:${id}`, AGORA);
    bilhete('x1', { transferivel: 100 }); livro('x1', 3);
    bilhete('x2', { bonus: 100 }); livro('x2', 1);
    bilhete('x3', { bonus: 60, transferivel: 40 }); livro('x3', 3);
    db.exec('PRAGMA foreign_keys = ON');
    db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, ?, ?)`).run(uid, linha, 5);
    migrar(db);
    igual(db.prepare(`SELECT presos FROM species_candy WHERE user_id = ?`).get(uid).presos, 4, 'o legado do bônus ficou livre');
    ok(!!(() => { try { db.prepare(`UPDATE species_candy SET quantidade = 3 WHERE user_id = ?`).run(uid); } catch (e) { return e; } })(), 'presos acima da quantidade passou pelo esquema');
  });

  return s;
}
