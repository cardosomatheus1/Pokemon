/* Q1/Q3/Q6/Q8 · O STAKE DA LIGA NA FILA DE BÔNUS (ST-11.10 · Spec §9.6, §9.9, §28.3, §28.4)
 *
 *   DESLIGADO       com a bandeira desligada pelo operador, nada: nem a
 *                   inscrição, nem a partida com stake. Ligado por padrão
 *                   desde a DEC-16 (o dono ligou a D2, moeda simulada)
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
import { criarPartida, buscarPartida } from '../server/partida.mjs';
import { stakeNaTela } from '../app/modules/liga-stake-dados.mjs';
import { linhaDaPartida } from '../app/modules/liga-equipe-dados.mjs';
import { minhasPartidas } from '../server/liga-equipe.mjs';
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
  if (!ligar) {
    /* A bandeira gravada DESLIGADA — o operador puxou a porta de emergência. */
    db.exec('PRAGMA foreign_keys = OFF');
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES ('league_stake_enabled', 0, ?, 'teste')`).run(T0);
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

  s.teste('desligado pelo operador: nem inscrição nem partida com stake; ligado por padrão (DEC-16)', () => {
    const c = cena({ ligar: false });
    igual(recusa(() => inscrever(c.db, { userId: c.v, ativo: true, agora: T0, checkpoint: DEC }))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a inscrição com o stake desligado');
    igual(recusa(() => joga(c, 1))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a partida com stake desligado');
    igual(recusa(() => buscarPartida(c.db, { userId: c.v, meu: c.fraco.id, chaveIdem: 'bstk-desl01', agora: T0, stake: true }))?.codigo, ERRO_BANDEIRA.DESLIGADA, 'a busca com stake desligado');
    igual(stakeDaConta(c.db, { userId: c.v, agora: T0 }).ligado, false, 'a leitura diz ligado com a bandeira desligada');
    /* Sem linha gravada e sem o checkpoint do dinheiro real: a decisão do dono basta. */
    const c2 = cena();
    inscrever(c2.db, { userId: c2.v, ativo: true, agora: T0 });
    igual(stakeDaConta(c2.db, { userId: c2.v, agora: T0 }).ligado, true, 'o stake liberado pelo dono lê desligado');
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

  s.teste('11.11 · a busca com stake: só entre inscritos, e nunca o bot', () => {
    const c = cena();
    inscrever(c.db, { userId: c.v, ativo: true, agora: T0, checkpoint: DEC });
    const busca = k => buscarPartida(c.db, { userId: c.v, meu: c.fraco.id, chaveIdem: `bstk-${String(k).padStart(6, '0')}`, agora: T0, stake: true, checkpoint: DEC });
    const antes = foto(c.db, c.v);
    igual(recusa(() => busca(1))?.codigo, ERRO_STAKE.SEM_ADVERSARIO, 'sem inscrito na fila, a busca caiu no bot');
    igual(`${foto(c.db, c.v)}|${c.db.prepare(`SELECT COUNT(*) AS n FROM league_bot_matches`).get().n}`, `${antes}|0`, 'a busca sem adversário cobrou ou jogou');
    /* Um par da MESMA faixa de força (o pareamento respeita a faixa): o forte não aparece para o fraco. */
    const w = cadastrar(c.db, { username: 'stk2', email: 'stk2@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    creditar(c.db, { userId: w, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 200, idem: 'b-w', agora: T0 });
    const cw = gerar(c.db, { userId: w, pack: PACK, dex: 13, origem: 'captura' });
    c.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(5), cw.id);
    criarSnapshot(c.db, { userId: w, pack: PACK, agora: T0, ids: [cw.id] });
    igual(recusa(() => busca(2))?.codigo, ERRO_STAKE.SEM_ADVERSARIO, 'o da mesma faixa sem inscrição foi pareado');
    inscrever(c.db, { userId: w, ativo: true, agora: T0, checkpoint: DEC });
    const p = busca(3);
    igual(`${p.stake?.valor}|${p.defensor === c.fraco.id ? 'eu' : 'outro'}`, '50|outro', 'a busca com stake');
    const esperado = p.stake.estado !== 'liquidada' ? /^stake devolvido/ : p.vencedor === 'B' ? /^\+40 de stake$/ : /^−50 de stake$/;
    ok(esperado.test(linhaDaPartida(minhasPartidas(c.db, c.v)[0]).stake ?? ''), 'a linha da partida não diz o stake');
    const u2 = linhaDaPartida({ resultado: 'venceu', stake: { valor: 50, rake: 10, estado: 'liquidada' }, contra: {} }).stake;
    const v2 = linhaDaPartida({ resultado: 'perdeu', stake: { valor: 50, rake: 10, estado: 'liquidada' }, contra: {} }).stake;
    igual(`${u2}|${v2}`, '+40 de stake|−50 de stake', 'a linha de quem venceu e de quem perdeu');
    igual([linhaDaPartida({ resultado: 'empate', stake: { valor: 50, rake: 0, estado: 'empate' }, contra: {} }).stake,
           linhaDaPartida({ resultado: 'venceu', stake: { valor: 50, rake: 0, estado: 'devolvida' }, contra: {} }).stake, String(linhaDaPartida({ resultado: 'venceu', contra: {} }).stake)].join('|'),
      'stake devolvido · empate|stake devolvido · não contou|null', 'o empate, a devolvida e a sem stake');
  });

  s.teste('11.11 · a confirmação honesta: o estado da fila, os quatro números com o líquido, e a perda dita', () => {
    const base = { ligado: true, inscrito: true, tier: 'Gold', stake: 250, pot: 500, rake: 50, payout: 450, elegivel: 1300, bonus: 300, competitivo: 1000, pausa: false };
    igual(stakeNaTela({ ...base, ligado: false }), null, 'a seção aparece com o stake desligado');
    igual(stakeNaTela(null), null, 'sem resposta, seção');
    const k = stakeNaTela(base);
    igual(k.numeros.map(n => `${n.rotulo}=${n.valor} (${n.sub})`).join(' | '),
      'você põe=250 PC (do bônus e do competitivo) | se vencer, recebe=450 PC (lucro de 200) | se perder, você perde=250 PC (o stake inteiro) | a casa leva=50 PC (10% do pot, tirado do prêmio)', 'os quatro números');
    igual(k.conta, 'pot 500 = 250 seu + 250 do adversário · a casa tira 50 · o vencedor leva 450', 'a conta do pot');
    ok(k.regras.some(r => /nunca do transferível/.test(r)) && k.regras.some(r => /devolve tudo/.test(r)), 'as regras não dizem o transferível e a devolução');
    igual(`${k.estado.texto}|${k.estado.classe}`, 'Você ESTÁ na fila com stake|dentro', 'o estado da fila');
    ok(/mesmo com você fora do jogo/.test(k.estado.explica), 'o estado não diz que o time pode ser desafiado valendo sem o jogador');
    igual(`${stakeNaTela({ ...base, inscrito: false }).estado.classe}|${stakeNaTela({ ...base, inscrito: false }).inscricao.rotulo}`, 'fora|Entrar na fila com stake', 'fora da fila');
    igual(k.saldo, 'bônus 300 · competitivo 1.000', 'o saldo por balde');
    ok(!/sem aposta/.test(k.lema), 'o lema da aba diz "sem aposta" com o stake ligado');
    igual(`${k.acao.habilitada}|${k.motivo}|${k.confirmacao}`, 'true|null|null', 'pronto para buscar, sem confirmação aberta');
    const c = stakeNaTela(base, { confirmando: true }).confirmacao;
    igual(c.texto, 'Você põe 250 PC do seu bônus e competitivo. Se vencer, recebe 450 PC — lucro de 200, depois de 50 da casa — e o que ganhar volta como bônus. Se perder, perde os 250 PC. Empate, ou partida anulada pelo sistema, devolve tudo.', 'a confirmação');
    igual(c.confirmar, 'Confirmar e buscar valendo 250 PC', 'o botão da confirmação diz o valor');
    igual(stakeNaTela({ ...base, elegivel: 99999, stake: 5000, pot: 10000, rake: 1000, payout: 9000 }).numeros[1].valor, '9.000 PC', 'o milhar');
    const semSaldo = stakeNaTela({ ...base, elegivel: 100 }, { confirmando: true });
    igual(`${semSaldo.acao.habilitada}|${semSaldo.confirmacao}|${semSaldo.motivo}`, 'false|null|faltam 150 PC de bônus ou competitivo — o transferível nunca entra no stake', 'sem saldo');
    ok(/fila com stake primeiro/.test(stakeNaTela({ ...base, inscrito: false }).motivo), 'sem inscrição não diz o que falta');
    ok(/pausa/.test(stakeNaTela({ ...base, pausa: true }).motivo), 'a pausa não aparece');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'stake-liga-st11.10');
    const n = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'liga_stake%'`).get().n;
    m.desce(db); igual(n(), 0, 'a descida deixou restos');
    m.sobe(db); igual(n(), 4, 'a subida não refez tudo');
  });

  s.teste('pela porta: ligado por padrão (DEC-16) — a leitura diz os números e a inscrição passa', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'StkPorta', email: 'stkporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H2 = { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', authorization: `Bearer ${cad.sessao}` };
      const l = await fetch(url('/api/equipe/stake'), { headers: H2 }).then(r => r.json());
      igual(`${l.ligado}|${l.tier}|${l.stake}|${l.pot}|${l.rake}|${l.payout}`, 'true|Bronze|50|100|10|90', 'a leitura');
      igual((await fetch(url('/api/equipe/stake/inscricao'), { method: 'POST', headers: H2, body: JSON.stringify({ ativo: 'sim' }) })).status, 400, 'o corpo inválido');
      igual((await fetch(url('/api/equipe/stake/inscricao'), { method: 'POST', headers: H2, body: JSON.stringify({ ativo: true }) })).status, 200, 'a inscrição com o stake ligado pelo dono');
      igual((await fetch(url('/api/equipe/partida'), { method: 'POST', headers: H2, body: JSON.stringify({ meu: 'x', adversario: 'y', stake: true, chaveIdem: 'porta-00001' }) })).status >= 400, true, 'a partida com stake pela porta');
    } finally { await srv.fechar(); }
  });

  return s;
}
