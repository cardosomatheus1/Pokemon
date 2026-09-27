/* AS OPERAÇÕES DA COLEÇÃO NO SERVIDOR — caixa, troca, soltar e foco (ST-13.3a · E13 · L-210).
 *
 * A regra é a do aparelho, e do mesmo arquivo: `colecao-regras.mjs` (caixa,
 * troca e soltar) e `engine/foco.mjs` (o foco e o descanso da troca). Aqui
 * mora o que precisa de banco: quem é de quem, a transação, e o doce que a
 * criatura solta vira — no mesmo livro do doce da aposta (`candy_ledger`), com
 * a chave do fato (`soltar:<id>`), para soltar duas vezes pagar uma.
 */
import { motivoDeMover, ordemDaTroca, motivoDeSoltar } from '../app/modules/colecao-regras.mjs';
import { doceAoSoltar } from '../app/modules/doce-dados.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { escolher } from '../engine/foco.mjs';
import { criaturasDaConta, emCampo } from './idle.mjs';
import { naRun } from './run.mjs';

export const ERRO_COLECAO = Object.freeze({ SEM_CRIATURA: 'COLECAO_SEM_CRIATURA' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

/* Uma mudança por vez, e a regra perguntada ANTES de cada uma, com a coleção
   como ela está naquele instante — é o que a troca precisa. */
function moverUm(db, userId, id, paraCaixa) {
  const motivo = motivoDeMover(criaturasDaConta(db, userId), id, paraCaixa);
  if (motivo) throw motivo === 'essa criatura não existe' ? falha(ERRO_COLECAO.SEM_CRIATURA, motivo) : new Error(motivo);
  db.prepare(`UPDATE criaturas SET na_caixa = ? WHERE id = ? AND user_id = ?`).run(paraCaixa ? 1 : 0, id, userId);
}

export const moverNaConta = (db, { userId, id, paraCaixa }) =>
  emTransacao(db, () => { moverUm(db, userId, id, !!paraCaixa); return { id, naCaixa: !!paraCaixa }; });

/* TIRAR E PÔR NA MESMA TRANSAÇÃO: duas gravações deixariam, entre elas, um
   time de cinco ou de sete. */
export const trocarNaConta = (db, { userId, sai, entra }) => emTransacao(db, () => {
  for (const [id, paraCaixa] of ordemDaTroca(criaturasDaConta(db, userId), sai, entra)) moverUm(db, userId, id, paraCaixa);
  return { sai, entra };
});

/* ── SOLTAR ── a criatura some, e o doce da linha dela entra no livro. */
export function soltarNaConta(db, { userId, pack, id, agora }) {
  const c = criaturasDaConta(db, userId).find(x => x.id === id);
  if (!c) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
  const fora = new Set(emCampo(db, userId).flatMap(x => JSON.parse(x.equipe_json)));
  const motivo = motivoDeSoltar(c, fora.has(id) || naRun(db, { userId, pack, agora }).has(id));
  if (motivo) throw new Error(motivo);
  const doce = doceAoSoltar(pack, c.dex), linha = chaveDoDoce(pack, c.dex);
  return emTransacao(db, () => {
    const r = db.prepare(`DELETE FROM criaturas WHERE id = ? AND user_id = ?`).run(id, userId);
    if (!r.changes) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
    if (doce > 0) {
      db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at)
                  VALUES (?, ?, ?, 'soltar', ?, ?)`).run(userId, linha, doce, `soltar:${id}`, agora);
      db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, ?, ?)
                  ON CONFLICT (user_id, species_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade`)
        .run(userId, linha, doce);
    }
    return { ok: true, doce, linha, dex: c.dex };
  });
}

/* ── O FOCO ── `escolher` do motor decide (nível, descanso, a troca cobra). */
export function escolherFocoNaConta(db, { userId, id, foco, agora }) {
  const c = criaturasDaConta(db, userId).find(x => x.id === id);
  if (!c) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
  const novo = escolher(c, foco, agora);
  db.prepare(`UPDATE criaturas SET foco = ?, foco_em = ?, descansa_ate = ? WHERE id = ? AND user_id = ?`)
    .run(novo.foco ?? null, novo.focoEm ?? null, novo.descansaAte ?? null, id, userId);
  return { id, foco: novo.foco, focoEm: novo.focoEm ?? null, descansaAte: novo.descansaAte ?? null };
}
