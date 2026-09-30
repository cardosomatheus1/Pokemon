/* Q1/Q3 · COM CONTA, A TRILHA DE LOGIN E OS DESAFIOS PAGAM O PC-B (ST-13.9c · D-137 · L-054)
 *
 * O servidor gravava o dia em `login_streak` e respondia `creditou: 7` — e a
 * carteira ficava em 0 (medido em 30/09). Os desafios fechavam e ninguém
 * pagava: o `recompensaDeDesafio` estava importado e sem chamador, e o
 * aparelho creditava o marco na projeção local, que a conta sobrescreve.
 * Três dos cinco tipos de desafio nunca andavam no servidor (L-054).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { criarScheduler, FASE_MS } from '../server/scheduler.mjs';
import { apostar, liquidarRodada } from '../server/aposta.mjs';
import { registrarLogin, registrarFeito, desafiosDe, POOL_PADRAO, LOGIN_POR_DIA } from '../server/progressao.mjs';
import { marcarVistasDaRodada } from '../server/escada.mjs';
import { MARCO_SEMANAL, ORCAMENTO_DESAFIOS_SEMANAL, TETO_SALDO_PC_B } from '../engine/emissao.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const AGORA = Date.UTC(2026, 0, 15, 12);          // quinta-feira: a semana começa na segunda, 12/01
const DIA = 24 * 3600_000;
const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  const uid = cadastrar(db, { username: 'des', email: 'des@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid };
};
const doLedger = (db, uid, tipo) => db.prepare(`SELECT COALESCE(SUM(amount), 0) s, COUNT(*) n FROM wallet_ledger WHERE user_id = ? AND type = ?`).get(uid, tipo);
/* Um desafio de tipo conhecido no dia (o sorteio só roda quando o dia está vazio). */
const desafio = (db, uid, agora, slot, tipo, alvo = 1) =>
  db.prepare(`INSERT INTO challenges (user_id, dia, slot, tipo, alvo) VALUES (?, ?, ?, ?, ?)`)
    .run(uid, new Date(agora).toISOString().slice(0, 10), slot, tipo, alvo);

export async function suite() {
  const s = criarSuite('desafios-conta');

  s.teste('a trilha de login credita o PC-B na carteira, uma vez por dia (D-137)', () => {
    const { db, uid } = novo();
    const r = registrarLogin(db, { userId: uid, agora: AGORA });
    igual(`${r.creditou}|${saldos(db, uid).bonus}`, `${LOGIN_POR_DIA}|${LOGIN_POR_DIA}`, 'o login disse que creditou e a carteira não recebeu');
    registrarLogin(db, { userId: uid, agora: AGORA + 60_000 });
    igual(`${saldos(db, uid).bonus}|${doLedger(db, uid, 'LOGIN_STREAK_REWARD').n}`, `${LOGIN_POR_DIA}|1`, 'entrar duas vezes no dia pagou duas');
    registrarLogin(db, { userId: uid, agora: AGORA + DIA });
    igual(saldos(db, uid).bonus, 2 * LOGIN_POR_DIA, 'o dia seguinte não pagou');
  });

  s.teste('o marco semanal dos desafios paga uma vez, no servidor, e respeita o teto de saldo (D-137)', () => {
    const { db, uid } = novo();
    /* MARCO_SEMANAL desafios de um passo, em dias da mesma semana (3 por dia),
       a partir da SEGUNDA — sobra a sexta para o desafio depois do marco. */
    const SEG = Date.UTC(2026, 0, 12, 12);
    let fechados = 0;
    for (let d = 0; fechados < MARCO_SEMANAL; d++) {
      const agora = SEG + d * DIA;
      for (let slot = 0; slot < 3 && fechados < MARCO_SEMANAL; slot++) desafio(db, uid, agora, slot, 'apostar');
      registrarFeito(db, { userId: uid, tipo: 'apostar', agora });
      fechados = db.prepare(`SELECT COUNT(*) n FROM challenges WHERE user_id = ? AND concluido_em IS NOT NULL`).get(uid).n;
      if (fechados < MARCO_SEMANAL) igual(doLedger(db, uid, 'CHALLENGE_REWARD').s, 0, `pagou antes do marco (${fechados} fechados)`);
    }
    igual(`${doLedger(db, uid, 'CHALLENGE_REWARD').s}|${saldos(db, uid).bonus}`, `${ORCAMENTO_DESAFIOS_SEMANAL}|${ORCAMENTO_DESAFIOS_SEMANAL}`, 'o marco não pagou o orçamento da semana');
    igual(db.prepare(`SELECT COUNT(*) n FROM challenges WHERE user_id = ? AND pago_em IS NOT NULL`).get(uid).n, MARCO_SEMANAL, 'o desafio fechado não ficou marcado como contado');
    /* Mais um desafio na semana (sexta, dia sem desafio): o marco já pagou. */
    const agora = SEG + 4 * DIA;
    desafio(db, uid, agora, 0, 'vencer');
    registrarFeito(db, { userId: uid, tipo: 'vencer', agora });
    igual(doLedger(db, uid, 'CHALLENGE_REWARD').n, 1, 'o marco pagou duas vezes na mesma semana');

    /* O teto de saldo vem antes do orçamento: carteira de bônus cheia não recebe. */
    const b = novo();
    creditar(b.db, { userId: b.uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'bonus', valor: TETO_SALDO_PC_B, idem: 'cheio', agora: AGORA });
    for (let d = 0; d < 4; d++) {
      for (let slot = 0; slot < 3; slot++) desafio(b.db, b.uid, AGORA + d * DIA, slot, 'apostar');
      registrarFeito(b.db, { userId: b.uid, tipo: 'apostar', agora: AGORA + d * DIA });
    }
    igual(doLedger(b.db, b.uid, 'CHALLENGE_REWARD').n, 0, 'a carteira de bônus no teto recebeu o marco');
  });

  s.teste('L-054: "assistir" anda uma vez por rodada; "variedade" por espécie nova no dia; "aposta_alta" saiu', () => {
    const { db, uid } = novo();
    let agora = AGORA;
    const sched = criarScheduler({ db, sims: 600, relogio: () => agora });
    const r = sched.abrirRodada();
    desafio(db, uid, agora, 0, 'assistir', 5);
    desafio(db, uid, agora, 1, 'variedade', 3);
    marcarVistasDaRodada(db, { userId: uid, rodada: r.id, agora });
    marcarVistasDaRodada(db, { userId: uid, rodada: r.id, agora });
    const doTipo = t => desafiosDe(db, { userId: uid, agora }).find(d => d.tipo === t).progresso;
    igual(doTipo('assistir'), 1, 'a mesma rodada assistida contou duas vezes (ou nenhuma)');

    creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 1000, idem: 'seed', agora });
    const fav = db.prepare(`SELECT slot FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(r.id).slot;
    apostar(db, { sched, userId: uid, slot: fav, valor: 50, agora });
    agora += FASE_MS.APOSTA + FASE_MS.PREPARO + FASE_MS.LUTA + 3;
    sched.tick(); sched.tick(); sched.tick();
    liquidarRodada(db, { sched, roundId: r.id, agora });
    igual(doTipo('variedade'), 1, 'a espécie nova do dia não fez a variedade andar');

    ok(!POOL_PADRAO.some(p => p.tipo === 'aposta_alta'), 'o desafio que premia apostar alto voltou ao sorteio (§28)');
  });

  s.teste('com conta, o aparelho não credita desafio: quem paga é o servidor', () => {
    ok(/if \(r\.pcB > 0 && !modoServidor\(\)\)/.test(fonte('app/modules/desafios.mjs')), 'o marco semanal ainda credita na projeção local com conta');
    ok(/if \(!modoServidor\(\)\) creditarRecompensa\('CHALLENGE_REWARD', c\.dia/.test(fonte('app/modules/resultado-tela.mjs')), 'o desafio de variedade ainda credita na projeção local com conta');
    /* Entrar paga o PC-B do dia: a carteira é lida DEPOIS, ou a tela mostra 1000 com 1007 na conta. */
    const html = fonte('app/index.html');
    const corpo = html.slice(html.indexOf('async function ligarModoServidor'), html.indexOf('(async function boot'));
    ok(corpo.indexOf('await hidratarPerfil();') >= 0 && corpo.indexOf('await hidratar();') > corpo.indexOf('await hidratarPerfil();'), 'a carteira é lida antes de o login pagar o dia');
  });

  return s;
}
