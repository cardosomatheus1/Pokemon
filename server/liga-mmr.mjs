/* O LIGA MMR NO SERVIDOR (ST-11.4 · F5.2 · Spec §9.7).
 *
 * A conta é a de `engine/liga-mmr.mjs`; aqui mora a gravação. O rating muda na
 * MESMA transação que grava a partida (ST-11.2), e o evento é da PARTIDA: a
 * chave primária de `liga_mmr_eventos` é o id dela, então aplicar duas vezes
 * aplica uma. O evento guarda o antes dos dois e o delta — o rating de hoje
 * se refaz somando os eventos, e o livro não se reescreve.
 */
import { MMR, eloDaPartida, tierDe } from '../engine/liga-mmr.mjs';

export const ratingDe = (db, userId) =>
  db.prepare(`SELECT rating, partidas FROM liga_mmr WHERE user_id = ?`).get(userId) ?? { rating: MMR.inicial, partidas: 0 };

/* Aplica o Elo de uma partida gravada. Chamada DENTRO da transação da partida. */
export function aplicarPartida(db, { id, userA, userB, vencedor, agora }) {
  const a = ratingDe(db, userA), b = ratingDe(db, userB);
  const r = eloDaPartida(a.rating, b.rating, vencedor);
  const novo = db.prepare(`INSERT INTO liga_mmr_eventos (partida_id, user_a, user_b, antes_a, antes_b, delta, criado_em)
                           VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (partida_id) DO NOTHING`)
    .run(id, userA, userB, a.rating, b.rating, r.delta, agora);
  if (!novo.changes) return null;
  const gravar = db.prepare(`INSERT INTO liga_mmr (user_id, rating, partidas, atualizado_em) VALUES (?, ?, 1, ?)
                             ON CONFLICT (user_id) DO UPDATE SET rating = excluded.rating, partidas = partidas + 1, atualizado_em = excluded.atualizado_em`);
  gravar.run(userA, r.a, agora);
  gravar.run(userB, r.b, agora);
  return r;
}

/* O que o jogador vê: o TIER e quantas partidas — o número fica no servidor. */
export const tierDaConta = (db, userId) => { const r = ratingDe(db, userId); return { tier: tierDe(r.rating), partidas: r.partidas }; };
