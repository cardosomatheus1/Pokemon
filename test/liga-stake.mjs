/* Q1/Q3/Q6/Q8 · O STAKE DA LIGA NA FILA DE BÔNUS (ST-11.10 · Spec §9.6, §9.9, §28.3, §28.4)
 *
 *   DESLIGADO       sem o checkpoint do §25.1, nada: nem a inscrição, nem a
 *                   partida com stake (ligar é a D2, do dono)
 *   O POT FECHA     o que os dois recebem, mais o rake, é o pot — em todo tier
 *                   e todo resultado
 *   SÓ B E C        o transferível nunca é tocado, e o ganho entra como bônus
 *   UMA TRANSAÇÃO   os dois stakes saem antes da partida; falhou no meio, nem
 *                   partida, nem dinheiro
 *   OS PORTÕES      inscrição dos dois, pausa, limites (somados com a Arena) e
 *                   saldo — recusar não cobra nada
 *   NÃO CONTOU      a partida fora do ranking devolve 100%, sem rake
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida } from '../server/partida.mjs';
import { saldos, creditar, gastar, reconciliarNoBanco } from '../server/carteira.mjs';
import { pausar, ERRO_PROTECAO } from '../server/protecao.mjs';
import { definirLimite } from '../server/limites.mjs';
import { inscrever, stakeDaConta, ERRO_STAKE } from '../server/stake-liga.mjs';
import { ERRO_BANDEIRA } from '../server/feature-flags.mjs';
import { STAKE_DO_TIER, RAKE, BALDES_DO_STAKE, stakeDaPartida, potDe, planoDoStake, liquidacaoDoStake, recebido } from '../engine/stake-liga.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const H = 3_600_000, T0 = Date.UTC(2026, 9, 1, 12), DEC = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena({ ligar = true } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  if (ligar) {
    /* A bandeira gravada LIGADA; ela só lê ligada com o checkpoint que o teste passa (DEC-99). */
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES ('league_stake_enabled', 1, ?, 'teste')`).run(T0);
    db.exec('PRAGMA foreign_keys = ON');
  }
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('stk0'), conta('stk1')];
  for (const x of [u, v]) {
    creditar(db, { userId: x, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 30, idem: `b-${x}`, agora: T0 });
    creditar(db, { userId: x, tipo: 'DAILY_REWARD', bucket: 'competitivo', valor: 100, idem: `c-${x}`, agora: T0 });
    creditar(db, { userId: x, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: `t-${x}`, agora: T0 });
  }
  const snap = (dono, lista) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  }) });
  return { db, u, v, forte: snap(u, [[6, 60], [9, 60], [3, 60]]), fraco: snap(v, [[10, 5]]) };
}
const joga = (c, k, extra = {}) => criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: `stk-${String(k).padStart(6, '0')}`, agora: T0, stake: true, checkpoint: DEC, ...extra });
const foto = (db, id) => { const s = saldos(db, id); return `${s.bonus}/${s.competitivo}/${s.transferivel}`; };
const ambos = c => { inscrever(c.db, { userId: c.u, ativo: true, agora: T0, checkpoint: DEC }); inscrever(c.db, { userId: c.v, ativo: true, agora: T0, checkpoint: DEC }); };

export async function suite() {
  const s = criarSuite('liga-stake');

  s.teste('a conta: o stake do tier mais baixo, o pot fecha em todo tier e todo resultado', () => {
    igual(`${stakeDaPartida('Gold', 'Bronze')}|${stakeDaPartida('Champion', 'Champion')}|${stakeDaPartida('Gold', 'Nada')}`, '50|5000|null', 'o stake da partida');
    igual(JSON.stringify(potDe(50)), '{"pot":100,"rake":10,"payout":90}', 'o pot do Bronze (§9.6)');
    igual(RAKE, 0.10, 'o rake');
    for (const stake of Object.values(STAKE_DO_TIER)) for (const vencedor of ['A', 'B', 'empate']) for (const contado of [true, false]) {
      const l = liquidacaoDoStake({ vencedor, stake, contado });
      igual(recebido(l, 'A', stake) + recebido(l, 'B', stake) + l.rake, 2 * stake, `o pot não fecha: ${stake} ${vencedor} ${contado}`);
    }
    const l = liquidacaoDoStake({ vencedor: 'A', stake: 250, contado: true });
    igual(`${l.estado}|${recebido(l, 'A', 250)}|${recebido(l, 'B', 250)}|${l.rake}`, 'liquidada|450|0|50', 'o vencedor leva o pot menos o rake (§9.6)');
    igual(`${liquidacaoDoStake({ vencedor: 'empate', stake: 50, contado: true }).estado}|${liquidacaoDoStake({ vencedor: 'A', stake: 50, contado: false }).estado}`, 'empate|devolvida', 'o empate e a que não contou');
  });

  s.teste('só bônus e competitivo, bônus primeiro — nunca transferível nem comprado', () => {
    igual(BALDES_DO_STAKE.join(), 'bonus,competitivo', 'os baldes do stake');
    igual(JSON.stringify(planoDoStake({ bonus: 30, competitivo: 100, transferivel: 9999, comprado: 9999 }, 50)), '{"ok":true,"composicao":{"bonus":30,"competitivo":20}}', 'o plano');
    igual(JSON.stringify(planoDoStake({ bonus: 10, competitivo: 5, transferivel: 9999 }, 50)), '{"ok":false,"falta":35}', 'o transferível cobriu a falta');
  });

  s.teste('desligado por padrão: sem o checkpoint, nem inscrição nem partida com stake', () => {
    const c = cena({ ligar: false });
    igual(recusa(() => inscrever(c.db, { userId: c.v, ativo: true, agora: T0 }))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a inscrição com o stake desligado');
    igual(recusa(() => joga(c, 1, { checkpoint: undefined }))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a partida com stake desligado');
    const c2 = cena();
    igual(recusa(() => inscrever(c2.db, { userId: c2.v, ativo: true, agora: T0 }))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a linha gravada ligada sem o checkpoint ligou');
    igual(stakeDaConta(c2.db, { userId: c2.v, agora: T0 }).ligado, false, 'a leitura diz ligado');
  });

  s.teste('a partida com stake: o vencedor leva o pot menos o rake, como bônus; o transferível não se mexe', () => {
    const c = cena(); ambos(c);
    const p = joga(c, 1);
    igual(`${p.vencedor}|${JSON.stringify(p.stake)}`, 'A|{"valor":50,"pot":100,"rake":10,"estado":"liquidada"}', 'a partida e o stake');
    /* u (A) venceu: o stake volta pelos baldes de onde saiu (30 bônus + 20 competitivo) e o ganho de 40 entra como bônus. */
    igual(`${foto(c.db, c.u)}|${foto(c.db, c.v)}`, '70/100/1000|0/80/1000', 'os saldos depois');
    igual(reconciliarNoBanco(c.db, c.u).length + reconciliarNoBanco(c.db, c.v).length, 0, 'o livro não reconcilia');
    const perdas = c.db.prepare(`SELECT user_id, valor FROM player_activity WHERE tipo = 'perda' ORDER BY valor`).all().map(r => `${r.user_id === c.u ? 'u' : 'v'}:${r.valor}`).join();
    igual(perdas, 'u:-40,v:50', 'a perda líquida na janela dos limites');
    igual(JSON.stringify(joga(c, 1).stake), JSON.stringify(p.stake), 'a mesma chave não devolve o stake');
    igual(`${foto(c.db, c.u)}|${foto(c.db, c.v)}`, '70/100/1000|0/80/1000', 'a mesma chave liquidou de novo');
    ok(/append-only/.test(recusa(() => c.db.prepare(`UPDATE liga_stakes SET rake = 0`).run())?.message ?? ''), 'o registro do stake aceitou UPDATE');
  });

  s.teste('os portões: inscrição, pausa, limite e saldo — e recusar não cobra nada', () => {
    const c = cena();
    inscrever(c.db, { userId: c.v, ativo: true, agora: T0, checkpoint: DEC });
    const antes = `${foto(c.db, c.u)}|${foto(c.db, c.v)}`;
    igual(recusa(() => joga(c, 1))?.codigo, ERRO_STAKE.NAO_INSCRITO, 'o defensor sem inscrição');
    inscrever(c.db, { userId: c.u, ativo: true, agora: T0, checkpoint: DEC });
    definirLimite(c.db, { userId: c.v, tipo: 'max_stake_per_round', valor: 10, agora: T0 });
    const lim = recusa(() => joga(c, 2));
    igual(lim?.codigo, ERRO_STAKE.LIMITE, 'o limite por rodada');
    ok(/max_stake_per_round/.test(lim?.message ?? ''), 'a recusa não nomeia o limite');
    const d = cena(); ambos(d);
    gastar(d.db, { userId: d.v, tipo: 'ADMIN_ADJUSTMENT', deltas: { bonus: -30, competitivo: -90 }, idem: 'zera', agora: T0 });
    igual(recusa(() => joga(d, 3))?.codigo, ERRO_STAKE.SALDO, 'sem bônus nem competitivo, com transferível sobrando');
    const e = cena(); ambos(e);
    pausar(e.db, { userId: e.u, tipo: 'cooloff', duracao: '24h', agora: T0 });
    igual(recusa(() => joga(e, 4))?.codigo, ERRO_PROTECAO.PAUSADO, 'o defensor em pausa');
    igual(`${foto(c.db, c.u)}|${foto(c.db, c.v)}`, antes, 'a recusa cobrou');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n + d.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n, 0, 'a recusa jogou a partida');
  });

  s.teste('a partida fora do ranking é o cancelamento técnico: devolve 100%, sem rake', () => {
    const c = cena(); ambos(c);
    creditar(c.db, { userId: c.v, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 500, idem: 'mais', agora: T0 });
    creditar(c.db, { userId: c.u, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 500, idem: 'mais', agora: T0 });
    for (let k = 1; k <= 4; k++) joga(c, k, { agora: T0 + (k - 1) * 7 * H });
    const antes = `${foto(c.db, c.u)}|${foto(c.db, c.v)}`;
    const quinta = joga(c, 5, { agora: T0 + 28 * H });
    igual(`${quinta.rated}|${quinta.stake.estado}|${quinta.stake.rake}`, 'false|devolvida|0', 'a quinta com stake');
    igual(`${foto(c.db, c.u)}|${foto(c.db, c.v)}`, antes, 'a partida fora do ranking mexeu no dinheiro');
  });

  s.teste('falhou no meio, nada aconteceu — nem a partida, nem o dinheiro', () => {
    const c = cena(); ambos(c);
    const antes = `${foto(c.db, c.u)}|${foto(c.db, c.v)}`;
    c.db.exec(`CREATE TRIGGER quebra BEFORE INSERT ON liga_stakes BEGIN SELECT RAISE(ABORT, 'falha simulada'); END`);
    ok(/falha simulada/.test(recusa(() => joga(c, 1))?.message ?? ''), 'a falha não chegou');
    igual(`${foto(c.db, c.u)}|${foto(c.db, c.v)}`, antes, 'o stake saiu sem a partida');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n, 0, 'a partida ficou sem o stake');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'stake-liga-st11.10');
    const n = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'liga_stake%'`).get().n;
    m.desce(db); igual(n(), 0, 'a descida deixou restos');
    m.sobe(db); igual(n(), 4, 'a subida não refez tudo');
  });

  s.teste('pela porta: desligado responde 503, e a leitura diz os números', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'StkPorta', email: 'stkporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H2 = { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', authorization: `Bearer ${cad.sessao}` };
      const l = await fetch(url('/api/equipe/stake'), { headers: H2 }).then(r => r.json());
      igual(`${l.ligado}|${l.tier}|${l.stake}|${l.pot}|${l.rake}|${l.payout}`, 'false|Bronze|50|100|10|90', 'a leitura');
      igual((await fetch(url('/api/equipe/stake/inscricao'), { method: 'POST', headers: H2, body: JSON.stringify({ ativo: 'sim' }) })).status, 400, 'o corpo inválido');
      igual((await fetch(url('/api/equipe/stake/inscricao'), { method: 'POST', headers: H2, body: JSON.stringify({ ativo: true }) })).status, 503, 'a inscrição com o stake desligado');
      igual((await fetch(url('/api/equipe/partida'), { method: 'POST', headers: H2, body: JSON.stringify({ meu: 'x', adversario: 'y', stake: true, chaveIdem: 'porta-00001' }) })).status >= 400, true, 'a partida com stake pela porta');
    } finally { await srv.fechar(); }
  });

  return s;
}
