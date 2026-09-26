/* Q1/Q3/Q8 · A LIQUIDAÇÃO DO BOLO (ST-12.4 · F2.1b · Spec §6.4, §6.11, §6.12)
 *
 * O bolo trava com a rodada e paga quando ela encerra. A invariante é a da
 * ST-12.1, agora conferida no BANCO, por SELECT:
 *
 *   Σ pagamentos lançados + tesouraria (taxa, resíduo, sem acerto) == Σ entradas
 *
 * E as três coisas que não podem acontecer:
 *   metade do bolo pago       uma transação por bolo; falha no meio desfaz tudo
 *   pagar duas vezes          o bolo liquidado não volta; a chave é da entrada
 *   bônus virar transferível  o pagamento volta pelos baldes da entrada
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, reconciliarNoBanco } from '../server/carteira.mjs';
import { entrarNoMercado, liquidarMercado, liquidarMercadosPendentes } from '../server/mercado.mjs';
import { vencedorasPorAbates } from '../engine/mercado-abates.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);
const SENHA = 'senha-longa-o-bastante-1';

function montar({ banco = ':memory:', sims = 60 } = {}) {
  let t = T0;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco, sims, laco: false,
                            relogio: () => t });
  let n = 0;
  const jogador = (saldo = 1000, bucket = 'transferivel') => {
    const id = cadastrar(s.db, { username: `j${n}`, email: `j${n++}@x.test`, senha: SENHA,
                                 nascimento: '1990-01-01', agora: t }).id;
    creditar(s.db, { userId: id, tipo: 'WELCOME_GRANT', bucket, valor: saldo, idem: `w${id}`, agora: t });
    return id;
  };
  return { s, db: s.db, sched: s.sched, jogador, andar: ms => { t += ms; }, agora: () => t };
}
const entrar = (c, userId, selecao, valor) =>
  entrarNoMercado(c.db, { sched: c.sched, userId, selecao, valor, agora: c.agora() });
/* Leva a rodada até ENCERRADA sem liquidar — o laço fica de fora. */
function encerrar(c) {
  for (let i = 0; i < 200 && c.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { c.andar(1000); c.sched.tick(); }
  igual(c.sched.rodadaAtual().status, ESTADOS.ENCERRADA, 'a rodada não encerrou');
}
const mercadoDa = (db, roundId) => db.prepare(`SELECT * FROM markets WHERE round_id = ?`).get(roundId);
const vencedorasDe = c => vencedorasPorAbates(c.sched.resultadoDaRodada(c.sched.rodadaAtual().id).map(x => x.abates));

/* A invariante, pelo banco: o que saiu para jogadores + o que foi à tesouraria
   == o que entrou. */
function conferirBolo(db, m) {
  const entrou = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM market_entries WHERE market_id = ? AND status <> 'cancelada'`).get(m.id).s;
  const pago = db.prepare(`SELECT COALESCE(SUM(l.amount),0) s FROM wallet_ledger l JOIN market_entries e ON e.id = l.reference_id
                            WHERE e.market_id = ? AND l.type LIKE 'MARKET_PAYOUT%'`).get(m.id).s;
  const casa = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM treasury_ledger WHERE reference_id = ?`).get(m.id).s;
  return { entrou, pago, casa, fecha: entrou === pago + casa };
}

export async function suite() {
  const s = criarSuite('mercado-liquidacao');

  s.teste('o laço encerra a rodada e o bolo paga: quem acertou divide, a conta fecha no bruto', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const us = Array.from({ length: 12 }, () => c.jogador(1000));
      us.forEach((u, i) => entrar(c, u, i, 100 + i * 10));
      encerrar(c);
      c.s.laco.passo();
      const m = mercadoDa(c.db, c.sched.rodadaAtual().id);
      igual(m.status, 'liquidado', 'o laço não liquidou o bolo');
      const conta = conferirBolo(c.db, m);
      ok(conta.fecha, `o bolo não fecha: entrou ${conta.entrou}, pago ${conta.pago}, casa ${conta.casa}`);
      igual(m.pot_gross, conta.entrou, 'pot_gross');
      igual(m.pot_gross, m.pot_net + m.fee_amount, 'bruto = líquido + taxa');
      const v = vencedorasDe(c);
      for (const [i, u] of us.entries()) {
        const e = c.db.prepare(`SELECT status, payout FROM market_entries WHERE user_id = ?`).get(u);
        if (!v.length) igual(e.status, 'devolvida', 'sem abate, o bolo não devolveu');
        else if (v.includes(i)) ok(e.status === 'ganha' && e.payout > 0, `quem acertou (${i}) não recebeu`);
        else igual(`${e.status}/${e.payout}`, 'perdida/0', `quem errou (${i}) recebeu`);
        igual(reconciliarNoBanco(c.db, u).length, 0, `ledger × saldo de ${i}: ${reconciliarNoBanco(c.db, u)}`);
        const res = c.db.prepare(`SELECT COALESCE(SUM(reserva_delta),0) r FROM wallet_ledger WHERE user_id = ?`).get(u).r;
        igual(res, 0, `sobrou dinheiro reservado para ${i}`);
      }
    } finally { await c.s.fechar(); }
  });

  s.teste('liquidar duas vezes liquida uma', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      [c.jogador(), c.jogador()].forEach((u, i) => entrar(c, u, i, 100));
      encerrar(c);
      const m = mercadoDa(c.db, c.sched.rodadaAtual().id);
      liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() });
      const antes = c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger`).get().n;
      const casa = c.db.prepare(`SELECT COUNT(*) n FROM treasury_ledger`).get().n;
      igual(liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() }).repetida, true, 'liquidou de novo');
      /* E mesmo com o status revertido à mão, as chaves seguram. */
      c.db.prepare(`UPDATE markets SET status = 'travado' WHERE id = ?`).run(m.id);
      c.db.prepare(`UPDATE market_entries SET status = 'travada' WHERE market_id = ?`).run(m.id);
      try { liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() }); } catch { /* a chave da tesouraria recusa */ }
      igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger`).get().n, antes, 'a carteira pagou duas vezes');
      igual(c.db.prepare(`SELECT COUNT(*) n FROM treasury_ledger`).get().n, casa, 'a tesouraria recebeu duas vezes');
    } finally { await c.s.fechar(); }
  });

  s.teste('bolo de rodada que não encerrou não paga; rodada recalculada divergente não paga ninguém', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      [c.jogador(), c.jogador()].forEach((u, i) => entrar(c, u, i, 100));
      for (let i = 0; i < 60 && c.sched.rodadaAtual().status === ESTADOS.ABERTA; i++) { c.andar(1000); c.sched.tick(); }
      const m = mercadoDa(c.db, c.sched.rodadaAtual().id);
      igual(m.status, 'travado', 'o cenário não travou o bolo');
      let lancou = false;
      try { liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() }); } catch { lancou = true; }
      ok(lancou, 'pagou o bolo com a luta ainda por acontecer');
      encerrar(c);
      /* A rodada publicada diz um lutador no slot 0; a recalculada, outro. É
         o motor de hoje não reproduzindo a rodada de ontem. */
      c.db.prepare(`UPDATE round_fighters SET species_id = species_id + 1000 WHERE round_id = ? AND slot = 0`)
        .run(c.sched.rodadaAtual().id);
      lancou = false;
      try { liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() }); } catch { lancou = true; }
      ok(lancou, 'pagou um bolo cuja rodada recalculada não bate com a publicada');
      igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE type LIKE 'MARKET_PAYOUT%'`).get().n, 0, 'pagou alguém');
    } finally { await c.s.fechar(); }
  });

  s.teste('falha no meio desfaz o bolo inteiro — nada pago pela metade', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const us = Array.from({ length: 12 }, () => c.jogador());
      us.forEach((u, i) => entrar(c, u, i, 100));
      encerrar(c);
      const m = mercadoDa(c.db, c.sched.rodadaAtual().id);
      /* A tesouraria é o ÚLTIMO passo: se ela falha, os pagamentos já feitos
         têm de voltar. */
      c.db.exec(`CREATE TRIGGER quebra BEFORE INSERT ON treasury_ledger BEGIN SELECT RAISE(ABORT, 'disco cheio'); END`);
      let lancou = false;
      try { liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() }); } catch { lancou = true; }
      ok(lancou, 'a falha foi engolida');
      igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE type LIKE 'MARKET_PAYOUT%' OR type = 'MARKET_LOSS'`).get().n, 0,
        'metade do bolo ficou paga');
      igual(mercadoDa(c.db, c.sched.rodadaAtual().id).status, 'travado', 'o bolo ficou marcado como liquidado');
      c.db.exec(`DROP TRIGGER quebra`);
      liquidarMercado(c.db, { sched: c.sched, marketId: m.id, agora: c.agora() });
      ok(conferirBolo(c.db, mercadoDa(c.db, c.sched.rodadaAtual().id)).fecha, 'depois da falha, a conta não fechou');
    } finally { await c.s.fechar(); }
  });

  s.teste('entrada em bônus paga em bônus; a perda líquida entra no limite de perda', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const us = Array.from({ length: 12 }, () => c.jogador(500, 'bonus'));
      us.forEach((u, i) => entrar(c, u, i, 200));
      encerrar(c);
      c.s.laco.passo();
      for (const u of us) {
        igual(saldos(c.db, u).transferivel, 0, 'o bolo converteu bônus em transferível');
        const tipos = c.db.prepare(`SELECT DISTINCT type FROM wallet_ledger WHERE user_id = ? AND type LIKE 'MARKET_PAYOUT%'`).all(u);
        ok(tipos.every(t => t.type === 'MARKET_PAYOUT_BONUS'), `pagamento de bônus lançado como ${tipos.map(t => t.type)}`);
        const e = c.db.prepare(`SELECT amount, payout FROM market_entries WHERE user_id = ?`).get(u);
        const perda = c.db.prepare(`SELECT COALESCE(SUM(valor),0) s FROM player_activity WHERE user_id = ? AND tipo = 'perda'`).get(u).s;
        igual(perda, e.amount - e.payout, 'a perda do bolo não entrou no limite');
      }
    } finally { await c.s.fechar(); }
  });

  s.teste('o servidor caiu entre o fim e o pagamento: o outro processo paga pela raiz revelada', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'bolo-'));
    const banco = join(dir, 'b.db');
    try {
      const a = montar({ banco });
      a.sched.abrirRodada();
      const us = Array.from({ length: 12 }, () => a.jogador());
      us.forEach((u, i) => entrar(a, u, i, 100));
      encerrar(a);
      const v = vencedorasDe(a);
      const roundId = a.sched.rodadaAtual().id;
      await a.s.fechar();

      const b = montar({ banco });
      try {
        igual(b.sched.resultadoDaRodada(roundId), null, 'o cenário não reproduziu a queda: o segredo sobreviveu');
        /* O servidor, ao LIGAR, paga o que ficou para trás — sem ninguém pedir. */
        await b.s.ouvir(0);
        const m = mercadoDa(b.db, roundId);
        igual(m.status, 'liquidado', 'o bolo continua travado');
        ok(conferirBolo(b.db, m).fecha, 'a conta não fechou');
        const ganharam = b.db.prepare(`SELECT user_id FROM market_entries WHERE market_id = ? AND payout > 0`).all(m.id)
          .map(x => us.indexOf(x.user_id)).sort((x, y) => x - y);
        if (v.length) igual(JSON.stringify(ganharam), JSON.stringify(v), 'a raiz revelada pagou outra gente');
        igual(liquidarMercadosPendentes(b.db, { sched: b.sched, agora: b.agora() }), 0, 'pagou de novo');
      } finally { await b.s.fechar(); }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('em 1.000 rodadas com entradas ao acaso: zero divergência, Σ saída == Σ entrada em cada bolo', async () => {
    const c = montar({ sims: 20 });
    try {
      const rnd = rngTeste(12);
      const us = Array.from({ length: 8 }, () => c.jogador(1_000_000));
      let semAbate = 0, empates = 0;
      for (let k = 0; k < 1000; k++) {
        c.sched.abrirRodada();
        for (const u of us) if (rnd() < 0.8) entrar(c, u, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 5000));
        encerrar(c);
        const v = vencedorasDe(c);
        c.s.laco.passo();
        const m = mercadoDa(c.db, c.sched.rodadaAtual().id);
        igual(m.status, 'liquidado', `rodada ${k}: bolo não liquidado`);
        const conta = conferirBolo(c.db, m);
        ok(conta.fecha, `rodada ${k}: entrou ${conta.entrou}, pago ${conta.pago}, casa ${conta.casa}`);
        const acertaram = c.db.prepare(`SELECT selection FROM market_entries WHERE market_id = ? AND status = 'ganha'`).all(m.id);
        ok(acertaram.every(x => v.includes(x.selection)), `rodada ${k}: pagou quem não estava no topo de abates`);
        if (!v.length) semAbate++; else if (v.length > 1) empates++;
      }
      for (const u of us) igual(reconciliarNoBanco(c.db, u).length, 0, `ledger × saldo: ${reconciliarNoBanco(c.db, u)}`);
      ok(empates > 0, `a amostra não teve empate (${empates}) — o caso que mais divide não foi exercitado`);
    } finally { await c.s.fechar(); }
  });

  return s;
}
