/* Q1/Q3/Q6 · E14 · A FONTE DO PC-T: A JORNADA VERIFICADA (ST-14.0E · DEC-22)
 *
 * O aceite da ficha, frase a frase:
 *
 *   repetir a vitória não paga de novo; nó sem marca não paga
 *   a soma por conta nunca passa de 850
 *   conta nova não troca o PC-T da jornada antes de 7 dias (relógio do servidor)
 *   o aparelho, sem conta, não credita PC-T nenhum
 *
 * E as sabotagens: pagar a cada vitória; pagar em `bonus`; a maturidade pelo
 * relógio do cliente.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos, pcTElegivel, reservarP2PNoBanco } from '../server/carteira.mjs';
import { lutarNaConta, criaturasParaLuta } from '../server/jornada.mjs';
import { painelE14 } from '../server/economia-e14.mjs';
import { contaDaLuta } from '../app/modules/jornada-conta.mjs';
import { fraseDoPagamento } from '../app/modules/jornada-dados.mjs';
import { pcTDoNo, tetoDaJornada, pcTEmMaturacao, PCT_JORNADA } from '../engine/pct-jornada.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const DIA = 86_400_000;

/* Um time forte o bastante para o primeiro nó, e o primeiro nó com a marca
   pedida — vencer o Campeão num teste custaria a jornada inteira. */
function cena(marca = { insignia: 'teste' }) {
  const db = abrirBanco(':memory:'); migrar(db);
  const uid = cadastrar(db, { username: 'Jornada1', email: 'j1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  for (const [i, [dex, nivel]] of [[4, 16], [7, 15], [1, 15], [25, 14], [16, 13], [19, 12]].entries()) {
    const c = gerar(db, { userId: uid, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, criada_em = ? WHERE id = ?`).run(xpParaNivel(nivel), AGORA + i, c.id);
  }
  const pack = { ...PACK, jornada: PACK.jornada.map((n, i) => (i === 0 ? { ...n, ...marca } : n)) };
  return { db, uid, pack, no: pack.jornada[0].id };
}
function vencer(k, { de = 0, agora = AGORA } = {}) {
  let r = null;
  for (let i = de; i < de + 20 && !r?.venceu; i++)
    r = lutarNaConta(k.db, { userId: k.uid, pack: k.pack, id: k.no, chaveIdem: `luta-pct-${i}`, agora: agora + i, semente: i + 1 });
  ok(r?.venceu, 'o time não venceu o primeiro nó — o teste não mede nada');
  return r;
}
const daJornada = db => db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(amount), 0) s, MIN(bucket) b FROM wallet_ledger WHERE type = 'JOURNEY_PCT_REWARD'`).get();

export async function suite() {
  const s = criarSuite('e14-pct-jornada');

  s.teste('a regra: 50 a insígnia, 75 o selo, 150 o final — e o pack soma 850', () => {
    igual(`${pcTDoNo({ insignia: 'x' })}|${pcTDoNo({ selo: 'y' })}|${pcTDoNo({ selo: 'y', final: true })}|${pcTDoNo({ id: 'rota' })}|${pcTDoNo(null)}`,
          '50|75|150|0|0', 'os valores por marca');
    igual(tetoDaJornada(PACK.jornada), 850, 'o teto da jornada do pack');
    igual(PACK.jornada.filter(n => pcTDoNo(n) > 0).length, 13, 'os nós que pagam (8 ginásios, 4 da Liga, o campeão)');
  });

  s.teste('a primeira vitória num nó com marca paga PC-T em transferível, uma vez', () => {
    const k = cena();
    const r = vencer(k);
    igual(r.recompensa.pct, 50, 'a resposta não diz o PC-T');
    const l = daJornada(k.db);
    igual(`${l.n}|${l.s}|${l.b}`, '1|50|transferivel', 'o lançamento');
    igual(`${saldos(k.db, k.uid).transferivel}|${saldos(k.db, k.uid).bonus}`, '50|0', 'o PC-T caiu no bucket errado');
    const outra = vencer(k, { de: 40, agora: AGORA + 1000 });
    ok(!outra.primeiraVez && !outra.recompensa.pct, 'a segunda vitória pagou PC-T');
    igual(daJornada(k.db).n, 1, 'a revanche lançou PC-T');
  });

  s.teste('o progresso perdido não paga de novo: a chave é do nó, não da luta', () => {
    const k = cena({ selo: 'teste', final: true });
    igual(vencer(k).recompensa.pct, 150, 'o final não pagou 150');
    k.db.prepare(`DELETE FROM jornadas WHERE user_id = ?`).run(k.uid);
    const de_novo = vencer(k, { de: 60, agora: AGORA + 2000 });
    ok(de_novo.primeiraVez, 'a jornada apagada não voltou à primeira vez — o teste não mede nada');
    igual(`${de_novo.recompensa.pct}|${daJornada(k.db).s}`, '0|150', 'a primeira vez repetida pagou de novo');
  });

  s.teste('nó sem marca não paga PC-T', () => {
    const k = cena({});
    const r = vencer(k);
    ok(!r.recompensa.pct && daJornada(k.db).n === 0, 'a rota pagou PC-T');
  });

  s.teste('a maturidade: 7 dias de conta pelo relógio do servidor, e só para o PC-T da jornada', () => {
    const k = cena();
    vencer(k);
    creditar(k.db, { userId: k.uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 100, idem: 'pct-adm', agora: AGORA });
    igual(`${pcTElegivel(k.db, k.uid, AGORA + DIA)}|${pcTElegivel(k.db, k.uid, AGORA + 7 * DIA + 1)}`, '100|150', 'a maturidade');
    ok(!reservarP2PNoBanco(k.db, { userId: k.uid, valor: 150, ref: 'x', agora: AGORA + DIA }).ok, 'reservou o PC-T em maturação');
    ok(reservarP2PNoBanco(k.db, { userId: k.uid, valor: 150, ref: 'y', agora: AGORA + 8 * DIA }).ok, 'não reservou depois da maturidade');
    igual(`${pcTEmMaturacao({ criadaEm: 0, agora: 6 * DIA, daJornada: 50 })}|${pcTEmMaturacao({ criadaEm: 0, agora: 7 * DIA, daJornada: 50 })}`, '50|0', 'a fronteira dos 7 dias');
    igual(PCT_JORNADA.maturidadeDias, 7, 'a maturidade da DEC-22');
  });

  s.teste('o aparelho sem conta não credita PC-T; a frase diz o que o servidor pagou', () => {
    const k = cena();
    const c = contaDaLuta({ pack: k.pack, criaturas: criaturasParaLuta(k.db, k.uid, k.pack), jornada: null, id: k.no, semente: 1, dia: 0 });
    ok(c.ok, `a conta do aparelho não lutou: ${c.motivo}`);
    /* ST-2.23: a luta ensina — o XP de quem lutou entra no crédito também. */
    igual(Object.keys(c.credito).sort().join(), 'bolsa,doces,xp', 'o aparelho credita algo além de bolsa, doce e XP');
    ok(!('pct' in c.recompensa) && !Object.keys(c.credito.bolsa).some(x => /pct|transfer/i.test(x)), 'o aparelho creditou PC-T');
    ok(/50 PC-T/.test(fraseDoPagamento(PACK, { motivo: 'primeira', pokecoin: 30, bolas: {}, doces: {}, pct: 50 }, { depois: true })), 'a frase não diz o PC-T');
    ok(!/PC-T/.test(fraseDoPagamento(PACK, { motivo: 'primeira', pokecoin: 30, bolas: {}, doces: {} }, { depois: true })), 'a frase inventou PC-T');
  });

  s.teste('a jornada é a fonte no painel da E14: emissão, sem mint e sem furo', () => {
    const k = cena();
    vencer(k);
    const p = painelE14(k.db, { agora: AGORA });
    igual(`${p.fontes.JOURNEY_PCT_REWARD}|${p.mintP2P}|${p.furoDeConservacao}`, '50|0|0', 'o painel');
  });

  return s;
}
