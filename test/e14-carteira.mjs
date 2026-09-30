/* Q1/Q3 · E14 · A CARTEIRA: O BÔNUS DE CADASTRO É PC-B (ST-14.0B1 · D-135 · DEC-E14-001)
 *
 * A tabela de regressão obrigatória da ST-14.0B (`docs/e14/E14_IMPLEMENTATION_STORIES.md`):
 *   - cadastro novo: `WELCOME_GRANT` em `bonus`, nenhum crédito transferível
 *     causado pelo cadastro, e um grant só;
 *   - aposta 100% PC-B (vitória, derrota, cancelamento): o retorno e a
 *     liberação preservam PC-B — PC-T não aumenta por essa origem;
 *   - o aparelho (sem conta) faz o mesmo.
 * A reserva P2P só de PC-T elegível é a ST-14.0B2.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from '../server/servidor.mjs';
import { criarApi } from '../app/modules/api.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { criarScheduler, FASE_MS } from '../server/scheduler.mjs';
import { apostar, cancelar, liquidarRodada } from '../server/aposta.mjs';
import { SALDO_INICIAL } from '../engine/carteira.mjs';
import { reconciliarNoBanco, pcTElegivel, reservarP2PNoBanco, liberarP2PNoBanco, liquidarP2PNoBanco } from '../server/carteira.mjs';
import { executarOperacao, passo, ERRO_OPERACAO } from '../server/operacoes-economicas.mjs';
import { painelEconomico } from '../server/admin.mjs';
import { BANDEIRAS, estadoDa, recusaDaMudanca } from '../engine/feature-flags.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const AGORA = Date.UTC(2026, 0, 15, 12);
const armazem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

/* Uma conta só com PC-B, e uma rodada aberta. */
function cenario() {
  const db = abrirBanco(':memory:'); migrar(db);
  let agora = AGORA;
  const uid = cadastrar(db, { username: 'b', email: 'b@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora }).id;
  creditar(db, { userId: uid, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: SALDO_INICIAL, idem: `welcome-${uid}`, agora });
  const sched = criarScheduler({ db, sims: 600, relogio: () => agora });
  const r = sched.abrirRodada();
  const porOdd = db.prepare(`SELECT slot, species_id FROM round_fighters WHERE round_id = ? ORDER BY offered_odd`).all(r.id);
  return { db, uid, sched, r, porOdd, avancar: ms => { agora += ms; }, agora: () => agora };
}
function liquidar(c) {
  c.avancar(FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3);
  c.sched.tick(); c.sched.tick(); c.sched.tick();
  liquidarRodada(c.db, { sched: c.sched, roundId: c.r.id, agora: c.agora() });
  return c.db.prepare(`SELECT champion_species_id AS campeao FROM rounds WHERE id = ?`).get(c.r.id).campeao;
}

export async function suite() {
  const s = criarSuite('e14-carteira');

  s.teste('cadastro novo: o grant em bonus, nenhum PC-T, e um grant só (D-135)', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false });
    const porta = await srv.ouvir(0);
    try {
      const api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: armazem() });
      await api.post('/api/auth/cadastrar', { username: 'Pcb1', email: 'pcb1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Pcb1'`).get().id;
      const sd = saldos(srv.db, uid);
      igual(`${sd.bonus}|${sd.transferivel}`, `${SALDO_INICIAL}|0`, 'o cadastro não credita em bonus, ou credita PC-T');
      const linhas = srv.db.prepare(`SELECT bucket, COUNT(*) n FROM wallet_ledger WHERE user_id = ? AND type = 'WELCOME_GRANT' GROUP BY bucket`).all(uid);
      igual(JSON.stringify(linhas), JSON.stringify([{ bucket: 'bonus', n: 1 }]), 'o grant não é um lançamento único em bonus');
    } finally { await srv.fechar(); }
  });

  s.teste('aposta 100% PC-B: vitória e derrota voltam (ou somem) em bonus, e o PC-T não aumenta', () => {
    /* Uma conta por lutador: exatamente uma vence, e as outras perdem — o
       teste não depende de o campeão ser o favorito. */
    const c = cenario();
    const contas = c.porOdd.map((l, i) => {
      const u = i === 0 ? c.uid : cadastrar(c.db, { username: `b${i}`, email: `b${i}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
      if (i > 0) creditar(c.db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: SALDO_INICIAL, idem: `welcome-${u}`, agora: AGORA });
      apostar(c.db, { sched: c.sched, userId: u, slot: l.slot, valor: 10, agora: c.agora() });
      return { u, especie: l.species_id };
    });
    const campeao = liquidar(c);
    const vencedoras = contas.filter(x => x.especie === campeao);
    ok(vencedoras.length >= 1, 'nenhuma conta venceu — o teste não exercitou o pagamento');
    for (const { u, especie } of contas) {
      const sd = saldos(c.db, u);
      igual(`${sd.transferivel}|${sd.reservado_bonus}`, '0|0', `a aposta em PC-B deixou PC-T ou reserva presa: ${JSON.stringify(sd)}`);
      const tipos = c.db.prepare(`SELECT DISTINCT type FROM wallet_ledger WHERE user_id = ? AND type LIKE 'BET_PAYOUT%'`).all(u).map(l => l.type);
      if (especie === campeao) igual(tipos.join(','), 'BET_PAYOUT_BONUS', 'o ganho de PC-B foi pago em outro bolso');
      else igual(`${sd.bonus}`, `${SALDO_INICIAL - 10}`, 'a derrota em PC-B não saiu do bônus');
    }
  });

  s.teste('aposta 100% PC-B cancelada: a liberação devolve para bonus', () => {
    const c = cenario();
    apostar(c.db, { sched: c.sched, userId: c.uid, slot: c.porOdd[0].slot, valor: 100, agora: c.agora() });
    cancelar(c.db, { sched: c.sched, userId: c.uid, agora: c.agora() });
    const sd = saldos(c.db, c.uid);
    igual(`${sd.bonus}|${sd.transferivel}|${sd.reservado_bonus}`, `${SALDO_INICIAL}|0|0`, 'o cancelamento não devolveu a PC-B intacta');
  });

  s.teste('o aparelho (sem conta) também nasce em bonus', () => {
    const t = fonte('app/modules/banco.mjs');
    ok(!/'WELCOME_GRANT',\s*'transferivel'/.test(t), 'o aparelho ainda credita o bônus de cadastro em transferível');
    ok((t.match(/'WELCOME_GRANT', 'bonus'/g) ?? []).length >= 3, 'um dos três caminhos do aparelho (novo, ilegível, reset) não credita em bonus');
  });

  /* ── ST-14.0B2 · a carteira para a troca entre jogadores ───────────── */
  const duas = () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const nova = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    const a = nova('pa'), b = nova('pb');
    for (const u of [a, b]) creditar(db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: SALDO_INICIAL, idem: `welcome-${u}`, agora: AGORA });
    return { db, a, b };
  };
  const pcT = (db, u, valor, idem) => creditar(db, { userId: u, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor, idem, agora: AGORA });

  s.teste('PC-T elegível: o bônus não conta, e a conta antiga com o grant em transferível é inelegível', () => {
    const { db, a } = duas();
    igual(pcTElegivel(db, a), 0, 'o bônus de cadastro contou como PC-T elegível');
    pcT(db, a, 300, 'fonte-a');
    igual(pcTElegivel(db, a), 300, 'o PC-T de fonte verificável não é elegível');
    /* A conta de antes da ST-14.0B1: o grant caiu em transferível. */
    const velha = cadastrar(db, { username: 'velha', email: 'velha@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    creditar(db, { userId: velha, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: SALDO_INICIAL, idem: `welcome-${velha}`, agora: AGORA });
    pcT(db, velha, 200, 'fonte-velha');
    igual(pcTElegivel(db, velha), 0, 'a conta com o grant legado em transferível ficou elegível antes da reconciliação');
    /* E a reserva respeita isso — o bolso tem 1.200, o elegível é 0. */
    igual(reservarP2PNoBanco(db, { userId: velha, valor: 100, ref: 'v', agora: AGORA }).ok, false, 'a conta legada reservou PC-T que não é elegível');
  });

  s.teste('a reserva P2P só aceita PC-T elegível, inteiro e positivo; a liberação devolve exatamente', () => {
    const { db, a } = duas();
    const linhas = () => db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE user_id = ? AND type LIKE 'P2P_%'`).get(a).n;
    let r = reservarP2PNoBanco(db, { userId: a, valor: 100, ref: 'x', agora: AGORA });
    igual(`${r.ok}|${linhas()}|${saldos(db, a).bonus}`, `false|0|${SALDO_INICIAL}`, 'a reserva P2P aceitou o bônus');
    pcT(db, a, 300, 'fonte-a');
    for (const valor of [0, -5, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1, '100'])
      igual(reservarP2PNoBanco(db, { userId: a, valor, ref: 'x', agora: AGORA }).ok, false, `a reserva aceitou ${valor}`);
    igual(reservarP2PNoBanco(db, { userId: a, valor: 301, ref: 'x', agora: AGORA }).ok, false, 'reservou mais que o elegível');
    r = reservarP2PNoBanco(db, { userId: a, valor: 300, ref: 'x', agora: AGORA });
    let sd = saldos(db, a);
    igual(`${r.ok}|${sd.transferivel}|${sd.reservado_transferivel}|${sd.bonus}`, `true|0|300|${SALDO_INICIAL}`, 'a reserva do saldo exato');
    liberarP2PNoBanco(db, { userId: a, valor: 300, ref: 'x', agora: AGORA });
    sd = saldos(db, a);
    igual(`${sd.transferivel}|${sd.reservado_transferivel}|${reconciliarNoBanco(db, a).length}`, '300|0|0', 'a liberação não devolveu exatamente, ou o ledger diverge');
  });

  s.teste('a operação econômica: A paga, B recebe e a taxa queima no MESMO commit; repetir devolve o recibo; outro pedido conflita', () => {
    const { db, a, b } = duas();
    pcT(db, a, 1010, 'fonte-a');
    const pedido = { para: b, valor: 1000, taxa: 10 };
    const fazer = () => {
      passo(reservarP2PNoBanco(db, { userId: a, valor: 1010, ref: 'op1', agora: AGORA }));
      passo(liquidarP2PNoBanco(db, { de: a, para: b, valor: 1000, taxa: 10, ref: 'op1', agora: AGORA }));
      return { enviado: 1000, taxa: 10 };
    };
    const r1 = executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'op-0000001', pedido, agora: AGORA }, fazer);
    const r2 = executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'op-0000001', pedido, agora: AGORA }, fazer);
    igual(`${JSON.stringify(r1)}|${r2.repetida}|${JSON.stringify({ ...r2, repetida: undefined })}`, `${JSON.stringify(r1)}|true|${JSON.stringify(r1)}`, 'repetir a operação não devolveu o mesmo recibo');
    const sa = saldos(db, a), sb = saldos(db, b);
    igual(`${sa.transferivel}|${sa.reservado_transferivel}|${sb.transferivel}|${sb.bonus}`, `0|0|1000|${SALDO_INICIAL}`, 'A não pagou 1010, ou B não recebeu 1000 em PC-T');
    igual(`${reconciliarNoBanco(db, a).length}|${reconciliarNoBanco(db, b).length}`, '0|0', 'o ledger diverge da carteira depois da transferência');
    /* Liquidar sem ter reservado: recusa, e nada muda. */
    pcT(db, a, 50, 'fonte-a2');
    const semReserva = liquidarP2PNoBanco(db, { de: a, para: b, valor: 50, ref: 'sem', agora: AGORA });
    igual(`${semReserva.ok}|${saldos(db, b).transferivel}|${saldos(db, a).reservado_transferivel}`, 'false|1000|0', 'a transferência pagou com reserva que não existia');
    let conflito = null;
    try { executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'op-0000001', pedido: { ...pedido, valor: 999 }, agora: AGORA }, fazer); } catch (e) { conflito = e.codigo; }
    igual(conflito, ERRO_OPERACAO.CONFLITO, 'a mesma chave com outro pedido não conflitou');
    /* A mesma chave em OUTRA conta é outra operação. */
    pcT(db, b, 10, 'fonte-b');
    const rb = executarOperacao(db, { userId: b, tipo: 'teste_p2p', chave: 'op-0000001', pedido: { x: 1 }, agora: AGORA }, () => ({ ok: true }));
    ok(!rb.repetida, 'a chave de uma conta valeu para a outra');
  });

  s.teste('uma recusa no meio ({ok:false}) desfaz a operação inteira — nada de metade', () => {
    const { db, a, b } = duas();
    pcT(db, a, 1000, 'fonte-a');
    let erro = null;
    try {
      executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'op-0000002', pedido: { v: 1 }, agora: AGORA }, () => {
        passo(creditar(db, { userId: b, tipo: 'P2P_TRANSFER_IN', bucket: 'transferivel', valor: 500, ref: 'op2', agora: AGORA }));
        passo(reservarP2PNoBanco(db, { userId: a, valor: 5000, ref: 'op2', agora: AGORA }));   // recusa: não tem
        return { ok: true };
      });
    } catch (e) { erro = e.codigo; }
    igual(`${erro}|${saldos(db, b).transferivel}|${db.prepare(`SELECT COUNT(*) n FROM economic_operations`).get().n}`, `${ERRO_OPERACAO.RECUSA}|0|0`, 'o crédito de B ficou gravado com a recusa de A, ou a operação foi registrada');
    let chave = null;
    try { executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'x', pedido: {}, agora: AGORA }, () => ({})); } catch (e) { chave = e.codigo; }
    igual(chave, ERRO_OPERACAO.CHAVE, 'a chave curta foi aceita');
  });

  s.teste('o painel: a transferência entre jogadores não é emissão; a taxa é queima', () => {
    const { db, a, b } = duas();
    pcT(db, a, 1010, 'fonte-a');
    executarOperacao(db, { userId: a, tipo: 'teste_p2p', chave: 'op-0000003', pedido: { v: 1 }, agora: AGORA }, () => {
      passo(reservarP2PNoBanco(db, { userId: a, valor: 1010, ref: 'op3', agora: AGORA }));
      passo(liquidarP2PNoBanco(db, { de: a, para: b, valor: 1000, taxa: 10, ref: 'op3', agora: AGORA }));
      return { ok: true };
    });
    const p = painelEconomico(db);
    ok(!Object.keys(p.faucets).some(t => t.startsWith('P2P_')), `a transferência recebida contou como emissão: ${JSON.stringify(p.faucets)}`);
    igual(`${p.sinks.P2P_TRANSFER_FEE}|${p.entreJogadores?.P2P_TRANSFER_IN}`, '10|1000', 'a taxa não aparece como queima, ou o movimento entre jogadores sumiu do painel');
  });

  s.teste('as bandeiras da E14 existem, nascem desligadas e são de valor (exigem o checkpoint do §25.1)', () => {
    for (const nome of ['p2p_trade_enabled', 'player_market_enabled']) {
      ok(BANDEIRAS[nome] && BANDEIRAS[nome].padrao === false && BANDEIRAS[nome].valor === true && !BANDEIRAS[nome].liberadaPor, `${nome} não nasce desligada e de valor`);
      igual(estadoDa(nome, true), false, `${nome} gravada ligada leu ligada sem o checkpoint`);
      ok(recusaDaMudanca(nome, true), `${nome} pôde ser ligada sem o checkpoint`);
    }
  });

  return s;
}
