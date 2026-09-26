/* Q1/Q3 · A APOSTA DO SERVIDOR É LIQUIDADA (D-112, achado no ensaio do piloto).
 *
 * `liquidarRodada` existia, testada, idempotente — e o único chamador era a
 * suíte. O laço fechava a rodada (`encerrada`) e abria a seguinte; a aposta
 * ficava `travada` para sempre: sem pagamento, sem perda no limite diário, sem
 * XP, e o valor reservado preso na carteira. Visto no ensaio de 25/09: 50
 * apostados, rodada encerrada, bilhete `travada`, nenhum lançamento.
 *
 * É a quarta vez da mesma forma de defeito (S30, S53, L-033, e o próprio
 * laço do F1.14): **testar a peça não testa o encaixe**. Por isso este arquivo
 * testa o ENCAIXE — o servidor inteiro, com o laço de verdade, a rodada de
 * verdade e o relógio andando.
 *
 *   a rodada que encerra é liquidada   antes de a sala saber que encerrou —
 *                                      o cliente recarrega o saldo ao ouvir
 *   a liquidação não trava o jogo      se ela falhar, a rodada seguinte abre
 *   o que ficou para trás é pago       rodada encerrada com bilhete travado
 *                                      (o servidor caiu no meio) é liquidada
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { criarLaco } from '../server/laco.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { apostar, liquidarPendentes } from '../server/aposta.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);

function montar() {
  let t = T0;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 300,
                            relogio: () => t });
  const u = cadastrar(s.db, { username: 'p', email: 'p@x.test', senha: 'senha-longa-o-bastante-1',
                              nascimento: '1990-01-01', agora: t }).id;
  creditar(s.db, { userId: u, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: 'w', agora: t });
  return { s, u, andar: ms => { t += ms; }, agora: () => t };
}
/* Anda o relógio até a rodada `id` encerrar e o laço transmitir isso. */
function ateEncerrar(c, id) {
  for (let i = 0; i < 400; i++) {
    c.andar(1000); c.s.laco.passo();
    const r = c.s.db.prepare('SELECT status FROM rounds WHERE id = ?').get(id);
    if (r.status === ESTADOS.ENCERRADA) { c.s.laco.passo(); return true; }
  }
  return false;
}
const bilhete = (db, id) => db.prepare('SELECT status, payout FROM bets WHERE id = ?').get(id);

export async function suite() {
  const s = criarSuite('liquidacao-ligada');

  s.teste('com o servidor de verdade, a aposta sai de "travada" quando a rodada encerra', async () => {
    const c = montar();
    try {
      c.s.laco.passo();
      const r = c.s.sched.rodadaAtual();
      const t = apostar(c.s.db, { sched: c.s.sched, userId: c.u, slot: 0, valor: 50, agora: c.agora() });
      ok(ateEncerrar(c, r.id), 'a rodada não encerrou');
      const b = bilhete(c.s.db, t.id);
      ok(b.status === 'ganha' || b.status === 'perdida', `o bilhete ficou "${b.status}" — nada liquidou a aposta`);
      const lanc = c.s.db.prepare(`SELECT type FROM wallet_ledger WHERE user_id = ? AND reference_id = ?`).all(c.u, t.id).map(l => l.type);
      ok(lanc.some(x => x === 'BET_LOSS' || /PAYOUT/.test(x)), `sem lançamento de liquidação: ${lanc.join(',')}`);
      const reservado = c.s.db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM wallet_ledger WHERE user_id = ? AND type = 'BET_RESERVE'`).get(c.u).s;
      ok(reservado < 0, 'a reserva nem foi feita');
      const xp = c.s.db.prepare('SELECT xp FROM player_profile WHERE user_id = ?').get(c.u)?.xp ?? 0;
      ok(xp > 0, 'a rodada liquidada não deu XP — o circuito do D-045 continua aberto');
      igual(JSON.stringify(Object.keys(saldos(c.s.db, c.u)).length > 0), 'true');
    } finally { await c.s.fechar(); }
  });

  s.teste('a liquidação acontece ANTES de a sala ouvir "encerrada"', () => {
    const ordem = [];
    let status = ESTADOS.EM_LUTA;
    const r = { id: 'r1', get status() { return status; } };
    const sched = { rodadaAtual: () => r, tick: () => { status = ESTADOS.ENCERRADA; },
                    abrirRodada: () => r, paraCliente: () => ({ fase: status }) };
    const sala = { transmitir: (tipo, e) => ordem.push(`sala:${e.fase}`) };
    const laco = criarLaco({ sched, sala, aoEncerrar: rr => ordem.push(`liquida:${rr.id}`), aoErro: () => {} });
    laco.passo();
    igual(ordem.join(' '), 'liquida:r1 sala:encerrada',
      'a sala soube do fim antes da liquidação — o cliente recarrega o saldo e lê o valor velho');
    laco.passo();
    igual(ordem.filter(x => x.startsWith('liquida')).length, 1, 'a mesma rodada foi liquidada duas vezes pelo laço');
  });

  s.teste('se a liquidação falhar, o jogo segue — e o erro é registrado', () => {
    let status = ESTADOS.EM_LUTA; const erros = [], sala = [];
    const r = { id: 'r2', get status() { return status; } };
    const sched = { rodadaAtual: () => r, tick: () => { status = ESTADOS.ENCERRADA; },
                    abrirRodada: () => ({ id: 'r3', status: ESTADOS.ABERTA }), paraCliente: () => ({ fase: status }) };
    const laco = criarLaco({ sched, sala: { transmitir: (t, e) => sala.push(e.fase) },
                             aoEncerrar: () => { throw new Error('banco ocupado'); }, aoErro: e => erros.push(e.message) });
    laco.passo();
    ok(sala.includes(ESTADOS.ENCERRADA), 'uma liquidação que falhou prendeu a rodada — a sala nunca soube do fim');
    ok(erros.some(m => /banco ocupado/.test(m)), 'a falha da liquidação foi engolida sem registro');
  });

  s.teste('rodada encerrada com bilhete travado (o servidor caiu no meio) é liquidada depois', async () => {
    const c = montar();
    try {
      c.s.laco.passo();
      const r = c.s.sched.rodadaAtual();
      const t = apostar(c.s.db, { sched: c.s.sched, userId: c.u, slot: 1, valor: 60, agora: c.agora() });
      /* Encerra SEM o laço liquidar: é o servidor caindo entre as duas coisas. */
      for (let i = 0; i < 400 && c.s.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { c.andar(1000); c.s.sched.tick(); }
      igual(bilhete(c.s.db, t.id).status, 'travada', 'o cenário não reproduziu a queda');
      const n = liquidarPendentes(c.s.db, { sched: c.s.sched, agora: c.agora() });
      igual(n, 1, 'a rodada pendente não foi liquidada');
      ok(bilhete(c.s.db, t.id).status !== 'travada', 'o bilhete continua travado');
      igual(liquidarPendentes(c.s.db, { sched: c.s.sched, agora: c.agora() }), 0, 'liquidar de novo achou pendência');
    } finally { await c.s.fechar(); }
  });

  s.teste('o servidor liga a liquidação no laço, e confere pendências ao ligar', () => {
    const f = readFileSync(new URL('../server/servidor.mjs', import.meta.url), 'utf8');
    ok(/aoEncerrar:[\s\S]{0,300}?liquidarPendentes\(db/.test(f), 'o laço do servidor não liquida as rodadas');
    ok(/liquidarPendentes\(db, \{ sched, agora: relogio\(\) \}\);\s*\n\s*return laco\.iniciar/.test(f) || /ouvir[\s\S]{0,400}liquidarPendentes\(db/.test(f),
      'ao ligar, o servidor não liquida o que ficou para trás');
  });

  return s;
}
