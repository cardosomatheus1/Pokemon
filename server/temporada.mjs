/* A VIRADA DA TEMPORADA NO SERVIDOR (ST-11.5 · F5.2 · Spec §9.8).
 *
 * A temporada é do relógio (`engine/temporada.mjs`); aqui mora o FECHAMENTO:
 * quando o relógio passa de uma temporada para a outra, a que acabou é
 * fechada UMA vez — o ranking final fica gravado e o soft reset é aplicado,
 * conta a conta, num livro só de inserção (`liga_mmr_resets`). O rating de
 * hoje continua a soma dos livros: as partidas e os resets.
 *
 * IDEMPOTENTE por construção: `liga_estado` guarda a temporada corrente, e a
 * virada só acontece se a gravação dela encontrar o valor que foi lido (a
 * guarda na cláusula, a lição do S564). Chamar duas vezes, ou em dois pedidos
 * ao mesmo tempo, fecha uma vez. E é PREGUIÇOSA: quem lê a Liga sincroniza —
 * não há agendador que possa não rodar.
 */
import { temporadaDe, janelaDaTemporada, softReset } from '../engine/temporada.mjs';
import { tierDe } from '../engine/liga-mmr.mjs';
import { virarPontos } from './pontos-liga.mjs';

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

export const temporadaGravada = db => db.prepare(`SELECT temporada FROM liga_estado WHERE id = 1`).get()?.temporada ?? null;

export function participantesDaTemporada(db, numero) {
  const { inicio, fim } = janelaDaTemporada(numero);
  return db.prepare(`WITH atividade AS (
    SELECT m.user_a AS user_id FROM league_matches m JOIN liga_mmr_eventos e ON e.partida_id=m.id
      WHERE m.criada_em >= ? AND m.criada_em < ?
    UNION ALL
    SELECT m.user_b FROM league_matches m JOIN liga_mmr_eventos e ON e.partida_id=m.id
      WHERE m.criada_em >= ? AND m.criada_em < ?
  ) SELECT r.user_id, r.rating, COUNT(*) AS partidas FROM atividade a JOIN liga_mmr r ON r.user_id=a.user_id
    GROUP BY r.user_id ORDER BY r.rating DESC, r.user_id`).all(inicio, fim, inicio, fim);
}

/* Fecha, em ordem, toda temporada que o relógio já deixou para trás. */
export function sincronizarTemporada(db, { agora }) {
  const atual = temporadaDe(agora).numero;
  const gravada = temporadaGravada(db);
  if (gravada === null) {
    /* A primeira leitura: não há temporada a fechar — só a de agora. */
    db.prepare(`UPDATE liga_estado SET temporada = ?, atualizado_em = ? WHERE id = 1 AND temporada IS NULL`).run(atual, agora);
    return { fechadas: [] };
  }
  const fechadas = [];
  for (let n = gravada; n < atual; n++) {
    const fechou = emTransacao(db, () => {
      const vira = db.prepare(`UPDATE liga_estado SET temporada = ?, atualizado_em = ? WHERE id = 1 AND temporada = ?`).run(n + 1, agora, n);
      if (!vira.changes) return false;
      const contas = db.prepare(`SELECT user_id, rating, partidas FROM liga_mmr ORDER BY rating DESC, user_id`).all();
      db.prepare(`INSERT INTO liga_temporadas (numero, fechada_em, ranking_json) VALUES (?, ?, ?)`)
        .run(n, agora, JSON.stringify(participantesDaTemporada(db, n).map((c, i) => ({ posicao: i + 1, user: c.user_id, tier: tierDe(c.rating), partidas: c.partidas }))));
      /* Os pontos viram ANTES do soft reset: o prêmio é do tier em que a
         temporada fechou (ST-11.7a). */
      virarPontos(db, { temporada: n, agora });
      const reset = db.prepare(`INSERT INTO liga_mmr_resets (temporada, user_id, antes, depois, criado_em) VALUES (?, ?, ?, ?, ?)`);
      const grava = db.prepare(`UPDATE liga_mmr SET rating = ?, atualizado_em = ? WHERE user_id = ?`);
      for (const c of contas) {
        const depois = softReset(c.rating);
        reset.run(n, c.user_id, c.rating, depois, agora);
        grava.run(depois, agora, c.user_id);
      }
      return true;
    });
    if (fechou) fechadas.push(n);
  }
  return { fechadas };
}

/* O ranking FINAL de uma temporada fechada — o tier e a posição, nunca o número. */
export function rankingDaTemporada(db, numero) {
  const l = db.prepare(`SELECT ranking_json FROM liga_temporadas WHERE numero = ?`).get(numero);
  return l ? JSON.parse(l.ranking_json) : null;
}
