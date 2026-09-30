/* OS LEAGUE POINTS NO SERVIDOR (ST-11.7a · Spec §9.10, §10.1, §10.12).
 *
 * A conta é a de `engine/pontos-liga.mjs`; aqui mora a gravação, no livro
 * `liga_pontos`. Duas regras de forma, e as duas têm teste:
 *
 *   NENHUMA FUNÇÃO DAQUI ABRE TRANSAÇÃO. O crédito da partida roda dentro da
 *   transação dela (a do Liga MMR), e a virada dentro da virada da temporada:
 *   ou entra tudo, ou nada.
 *
 *   NENHUMA FUNÇÃO DAQUI TOCA A CARTEIRA. Este arquivo não importa
 *   `carteira.mjs` e não escreve no `wallet_ledger`: é a ausência que faz o
 *   "nunca converte em PokéCash" (§10.12) ser uma propriedade do código, e
 *   não uma promessa.
 */
import { ganhoDaPartida, viradaDaConta, temPremio, TIPOS_DO_TETO } from '../engine/pontos-liga.mjs';
import { temporadaDe, janelaDaTemporada } from '../engine/temporada.mjs';
import { diaDoMundo } from '../engine/avanco.mjs';
import { tierDe } from '../engine/liga-mmr.mjs';

export const saldoDePontos = (db, userId) =>
  db.prepare(`SELECT COALESCE(SUM(delta), 0) AS s FROM liga_pontos WHERE user_id = ?`).get(userId).s;

/* O extrato: os últimos lançamentos, o mais novo primeiro. */
export const extratoDePontos = (db, userId, limite = 20) =>
  db.prepare(`SELECT tipo, delta, temporada, ref, criado_em AS quando FROM liga_pontos WHERE user_id = ?
              ORDER BY id DESC LIMIT ?`).all(userId, limite);

const lancar = (db, { userId, temporada, dia, tipo, delta, ref, idem, agora }) => {
  if (!delta) return false;
  return db.prepare(`INSERT INTO liga_pontos (user_id, temporada, dia, tipo, delta, ref, idem, criado_em)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (idem) DO NOTHING`)
    .run(userId, temporada, dia, tipo, delta, ref ?? null, idem, agora).changes > 0;
};

/* O que a conta já ganhou de partida HOJE (o dia do mundo): a base do teto. */
const jaHoje = (db, userId, dia) =>
  db.prepare(`SELECT COALESCE(SUM(delta), 0) AS s FROM liga_pontos WHERE user_id = ? AND dia = ?
              AND tipo IN (?, ?)`).get(userId, dia, ...TIPOS_DO_TETO).s;

/* O crédito de uma partida CONTADA, para os dois lados. Chamado DENTRO da
   transação da partida, só quando ela entrou no ranking — a fora do ranking
   (ST-11.8) e a do bot não passam por aqui. */
export function creditarPartida(db, { id, userA, userB, vencedor, agora }) {
  const temporada = temporadaDe(agora).numero, dia = diaDoMundo(agora);
  const ganhos = {};
  for (const [userId, papel] of [[userA, 'defensor'], [userB, 'desafiante']]) {
    const delta = ganhoDaPartida({ papel, vencedor, jaHoje: jaHoje(db, userId, dia) });
    lancar(db, { userId, temporada, dia, tipo: papel === 'defensor' ? 'defesa' : 'partida', delta, ref: id, idem: `partida:${id}:${userId}`, agora });
    ganhos[papel] = delta;
  }
  return ganhos;
}

/* A VIRADA DOS PONTOS, dentro da virada da temporada `n`: todo saldo positivo
   perde o que passa do carryover, e quem jogou o mínimo na temporada recebe o
   prêmio do tier em que ela FECHOU (o rating de antes do soft reset). */
export function virarPontos(db, { temporada: n, agora }) {
  const { inicio, fim } = janelaDaTemporada(n), dia = diaDoMundo(agora);
  const saldos = new Map(db.prepare(`SELECT user_id, SUM(delta) AS s FROM liga_pontos GROUP BY user_id`).all().map(r => [r.user_id, r.s]));
  const jogou = new Map(db.prepare(`
    SELECT u, COUNT(*) AS n FROM (
      SELECT user_a AS u FROM liga_mmr_eventos WHERE criado_em >= ? AND criado_em < ?
      UNION ALL SELECT user_b FROM liga_mmr_eventos WHERE criado_em >= ? AND criado_em < ?)
    GROUP BY u`).all(inicio, fim, inicio, fim).map(r => [r.u, r.n]));
  /* A ORDEM do ranking que a virada grava (rating, depois a conta): a posição da insígnia é a mesma dele. */
  const ordem = db.prepare(`SELECT user_id, rating FROM liga_mmr ORDER BY rating DESC, user_id`).all();
  const rating = new Map(ordem.map(r => [r.user_id, r.rating]));
  const posicao = new Map(ordem.map((r, i) => [r.user_id, i + 1]));
  const insignia = db.prepare(`INSERT INTO liga_insignias (temporada, user_id, tier, posicao, partidas, criado_em)
                               VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (temporada, user_id) DO NOTHING`);
  const contas = [...new Set([...saldos.keys(), ...jogou.keys()])].sort();
  for (const userId of contas) {
    const tier = tierDe(rating.get(userId) ?? -Infinity), partidas = jogou.get(userId) ?? 0;
    const v = viradaDaConta({ saldo: saldos.get(userId) ?? 0, tier, partidas });
    lancar(db, { userId, temporada: n, dia, tipo: 'reset', delta: v.reset, ref: `temporada:${n}`, idem: `reset:${n}:${userId}`, agora });
    lancar(db, { userId, temporada: n + 1, dia, tipo: 'premio', delta: v.premio, ref: `temporada:${n}`, idem: `premio:${n}:${userId}`, agora });
    /* A INSÍGNIA (ST-11.7b): a mesma régua do prêmio — jogou o mínimo na temporada. */
    if (temPremio({ partidas }) && posicao.has(userId)) insignia.run(n, userId, tier, posicao.get(userId), partidas, agora);
  }
}

/* As insígnias da conta, da temporada mais nova para a mais velha. */
export const insigniasDe = (db, userId) =>
  db.prepare(`SELECT temporada, tier, posicao, partidas FROM liga_insignias WHERE user_id = ? ORDER BY temporada DESC`).all(userId);

/* Quanto cada partida rendeu à conta: o lançamento dela, pela chave. */
export const pontosDaPartida = (db, partidaId, userId) =>
  db.prepare(`SELECT delta FROM liga_pontos WHERE idem = 'partida:' || ? || ':' || ?`).get(partidaId, userId)?.delta ?? 0;

/* ── A LOJA (ST-11.7c) ─────────────────────────────────────────────────────
 * O débito de uma compra, chamado DENTRO da transação dela (a loja abre a
 * transação, e não este arquivo). Devolve se lançou: a mesma chave duas vezes
 * lança uma. */
export const debitarPontos = (db, { userId, valor, ref, idem, agora }) =>
  lancar(db, { userId, temporada: temporadaDe(agora).numero, dia: diaDoMundo(agora), tipo: 'compra', delta: -Math.abs(valor), ref, idem, agora });

/* Quantas vezes a conta comprou este item NESTA temporada: o limite lê daqui. */
export const compradosNaTemporada = (db, userId, ref, temporada) =>
  db.prepare(`SELECT COUNT(*) AS n FROM liga_pontos WHERE user_id = ? AND tipo = 'compra' AND ref = ? AND temporada = ?`).get(userId, ref, temporada).n;
