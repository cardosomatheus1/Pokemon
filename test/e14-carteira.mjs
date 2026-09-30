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

  return s;
}
