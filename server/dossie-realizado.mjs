/* O DOSSIÊ REALIZADO — o que as rodadas deste servidor de fato fizeram (ST-9.5 · F3.9 · §7.12, §7.17).
 *
 * O dossiê do pack (ST-9.1) é o MODELO: rodadas simuladas offline. Este é o
 * REALIZADO: as rodadas lutadas aqui, gravadas depois do fim a partir da raiz
 * revelada. A ficha mostra os dois, e a diferença entre eles é o que o §7.17
 * chama de "o modelo contra o mundo".
 *
 * ── SÓ O QUE ACABOU ───────────────────────────────────────────────────────
 *
 * Duas travas, e as duas têm teste:
 *   GRAVAR   só rodada `encerrada` e com a raiz revelada — antes disso a raiz
 *            nem existe no banco, e é essa ausência que o §4.5 promete;
 *   LER      o agregado junta com `rounds` e filtra `encerrada` de novo: uma
 *            linha que entrasse por outro caminho não vira número público.
 *
 * ── A MESMA CONTA DO BOLO ─────────────────────────────────────────────────
 *
 * Posição e abates saem de `resultadoDaRaiz` — o que paga o bolo e dá o XP —,
 * e a pool recalculada é conferida contra `round_fighters` antes de gravar:
 * se o motor de hoje não reproduz a rodada de ontem, ela não entra (e o erro
 * tem endereço), em vez de entrar com a luta errada.
 */
import { lerRaiz } from '../engine/seed.mjs';
import { ESTADOS } from './scheduler.mjs';
import { emTransacao } from './carteira.mjs';

/* Quantas rodadas uma chamada grava, no máximo: o primeiro encerramento num
   banco antigo não pode parar o laço recalculando o histórico inteiro. O
   resto entra nos encerramentos seguintes. */
export const LOTE_RESULTADOS = 200;
/* "Cai cedo": os três primeiros a cair — a mesma régua do dossiê do pack. */
const CAI_CEDO = 3;

export function gravarResultadosPendentes(db, { sched, lote = LOTE_RESULTADOS }) {
  const pendentes = db.prepare(`
    SELECT r.id, r.round_seed_reveal FROM rounds r
     WHERE r.status = ? AND r.round_seed_reveal IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM round_results x WHERE x.round_id = r.id)
     ORDER BY r.betting_opens_at LIMIT ?`).all(ESTADOS.ENCERRADA, lote);
  const inserir = db.prepare(`INSERT OR IGNORE INTO round_results (round_id, slot, dex, pos, abates, clima)
                              VALUES (?, ?, ?, ?, ?, ?)`);
  const erros = [];
  let gravadas = 0;
  for (const r of pendentes) {
    try {
      const resultado = sched.resultadoDaRaiz(lerRaiz(r.round_seed_reveal));
      const pool = db.prepare(`SELECT species_id FROM round_fighters WHERE round_id = ? ORDER BY slot`).all(r.id);
      if (resultado.length !== pool.length || resultado.some((x, i) => x.dex !== pool[i].species_id))
        throw new Error(`a rodada ${r.id} recalculada não bate com a publicada — não entra no dossiê`);
      emTransacao(db, () => resultado.forEach((x, slot) =>
        inserir.run(r.id, slot, x.dex, x.pos, x.abates, resultado.clima ?? null)));
      gravadas++;
    } catch (e) { erros.push(e); }
  }
  if (erros.length) throw erros[0];
  return gravadas;
}

const taxa = (v, n) => ({ n, taxa: n ? v / n : null });

/* O agregado público: por espécie, cada número com o seu n. */
export function dossieRealizado(db) {
  const linhas = db.prepare(`
    SELECT rr.dex AS dex, COUNT(*) AS n, SUM(rr.pos = 1) AS vitorias, SUM(rr.abates) AS abates,
           SUM(rr.pos > t.tam - ${CAI_CEDO}) AS caiCedo
      FROM round_results rr
      JOIN rounds r ON r.id = rr.round_id AND r.status = ?
      JOIN (SELECT round_id, COUNT(*) AS tam FROM round_results GROUP BY round_id) t ON t.round_id = rr.round_id
     GROUP BY rr.dex`).all(ESTADOS.ENCERRADA);
  const rodadas = db.prepare(`SELECT COUNT(DISTINCT rr.round_id) AS k FROM round_results rr
                              JOIN rounds r ON r.id = rr.round_id AND r.status = ?`).get(ESTADOS.ENCERRADA).k;
  const especies = {};
  for (const l of linhas)
    especies[l.dex] = { n: l.n, vitoria: taxa(l.vitorias, l.n), abates: { n: l.n, media: l.n ? l.abates / l.n : null },
                        caiCedo: taxa(l.caiCedo, l.n) };
  return { rodadas, especies };
}
