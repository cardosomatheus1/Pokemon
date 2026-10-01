/* AS OPERAÇÕES DA COLEÇÃO NO SERVIDOR — caixa, troca, soltar e foco (ST-13.3a · E13 · L-210).
 *
 * A regra é a do aparelho, e do mesmo arquivo: `colecao-regras.mjs` (caixa,
 * troca e soltar) e `engine/foco.mjs` (o foco e o descanso da troca). Aqui
 * mora o que precisa de banco: quem é de quem, a transação, e o doce que a
 * criatura solta vira — no mesmo livro do doce da aposta (`candy_ledger`), com
 * a chave do fato (`soltar:<id>`), para soltar duas vezes pagar uma.
 */
import { motivoDeMover, ordemDaTroca, motivoDeSoltar } from '../app/modules/colecao-regras.mjs';
import { doceAoSoltar, usoDoDoce } from '../app/modules/doce-dados.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { escolher } from '../engine/foco.mjs';
import { alternarGolpe } from '../app/modules/moveset-dados.mjs';
import { aplicar as aplicarEvolucao } from '../app/modules/evolucao-idle.mjs';
import { criaturasDaConta, bolsaDe, debitarBolsa } from './idle.mjs';
import { maisRestrita } from '../engine/proveniencia.mjs';
import { elegibilidadeDaCriatura } from './elegibilidade.mjs';
import { exigirSemReserva } from './reservas.mjs';

export const ERRO_COLECAO = Object.freeze({ SEM_CRIATURA: 'COLECAO_SEM_CRIATURA', CHAVE: 'COLECAO_CHAVE_INVALIDA' });
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
  /* A POLÍTICA ÚNICA decide se ela está ocupada (expedição, run e, a partir
     da ST-14.6, reservada); a regra da coleção só escreve o motivo de sempre. */
  const pode = elegibilidadeDaCriatura(db, { userId, pack, id, acao: 'soltar', agora });
  const motivo = motivoDeSoltar(c, pode.reason_code === 'ASSET_BUSY');
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

/* ── OS GOLPES (ST-13.3b) ── `alternarGolpe` do aparelho: até quatro, sem
   repetir, só o que o nível (e os exclusivos guardados) liberou. */
export function trocarGolpeNaConta(db, { userId, pack, id, nome }) {
  const c = criaturasDaConta(db, userId).find(x => x.id === id);
  if (!c) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
  const r = alternarGolpe(pack, c, nome);
  if (!r.ok) throw new Error(r.motivo);
  db.prepare(`UPDATE criaturas SET golpes_json = ? WHERE id = ? AND user_id = ?`).run(JSON.stringify(r.golpes), id, userId);
  return { id, golpes: r.golpes };
}

/* ── A EVOLUÇÃO (ST-13.3b) ── `aplicar` do aparelho decide a aresta, os
   exclusivos que vão junto e a pedra consumida; aqui, na MESMA transação,
   muda a espécie, guarda os exclusivos e debita a pedra. */
export function evoluirNaConta(db, { userId, pack, id, alvo = null }) {
  const c = criaturasDaConta(db, userId).find(x => x.id === id);
  if (!c) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
  exigirSemReserva(db, id);   // ST-14.6: a reservada é oferecida como está
  const bolsa = Object.fromEntries(bolsaDe(db, userId).map(b => [b.item_id, b.quantidade]));
  const r = aplicarEvolucao(pack, c, bolsa, alvo);
  return emTransacao(db, () => {
    const pedra = r.consome ? debitarBolsa(db, userId, r.consome, 1) : { classes: [] };
    if (!pedra) throw new Error(`não há ${r.consome} na bolsa`);
    /* A pedra presa prende a forma nova (ST-14.0C): a origem mais presa entre
       a criatura e o insumo. */
    const antes = db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ? AND user_id = ?`).get(id, userId)?.proveniencia;
    db.prepare(`UPDATE criaturas SET dex = ?, exclusivos_json = ?, proveniencia = ? WHERE id = ? AND user_id = ?`)
      .run(r.para, r.criatura.exclusivos ? JSON.stringify(r.criatura.exclusivos) : null, maisRestrita([antes, ...pedra.classes]), id, userId);
    return { id, de: r.de, para: r.para, consome: r.consome, exclusivos: r.criatura.exclusivos ?? null };
  });
}

/* ── DAR DOCE (ST-13.3c) ─────────────────────────────────────────────────
 *
 * `usoDoDoce` do aparelho decide; o saldo é o do LIVRO da conta. Três
 * guardas, cada uma no seu lugar:
 *
 *   o doce é da LINHA da criatura — não há parâmetro de linha
 *   o saldo só desce se tem (a cláusula `quantidade >= ?`, e não um SELECT
 *   antes: entre ler e escrever caberia outro pedido)
 *   a MESMA chave do pedido não gasta duas vezes (`uso:<conta>:<chave>` é
 *   única no livro): o reenvio devolve o que o primeiro gastou */
const CHAVE_OK = /^[\w-]{8,64}$/;
export function darDoceNaConta(db, { userId, pack, id, quantos = 1, chaveIdem, agora }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem))
    throw falha(ERRO_COLECAO.CHAVE, 'chave do pedido inválida');
  const idem = `uso:${userId}:${chaveIdem}`;
  const ja = db.prepare(`SELECT delta FROM candy_ledger WHERE idem_key = ?`).get(idem);
  if (ja) return { ok: true, gastos: -ja.delta, repetido: true };
  exigirSemReserva(db, id);   // ST-14.6: o doce mudaria o nível do que está oferecido
  const c = criaturasDaConta(db, userId).find(x => x.id === id);
  if (!c) throw falha(ERRO_COLECAO.SEM_CRIATURA, 'esta criatura não existe');
  const linha = chaveDoDoce(pack, c.dex);
  const tem = db.prepare(`SELECT quantidade FROM species_candy WHERE user_id = ? AND species_id = ?`).get(userId, linha)?.quantidade ?? 0;
  const r = usoDoDoce(c, { tem, quantos });
  if (!r.ok) throw new Error(r.motivo);
  return emTransacao(db, () => {
    const d = db.prepare(`UPDATE species_candy SET quantidade = quantidade - ? WHERE user_id = ? AND species_id = ? AND quantidade >= ?`)
      .run(r.gastos, userId, linha, r.gastos);
    if (!d.changes) throw new Error('sem doce da linha dela');
    db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, ?, ?, 'uso', ?, ?)`)
      .run(userId, linha, -r.gastos, idem, agora);
    db.prepare(`UPDATE criaturas SET xp = ?, nivel = ? WHERE id = ? AND user_id = ?`).run(r.novo.xp, r.novo.nivel, id, userId);
    return { ok: true, gastos: r.gastos, xp: r.xp, subiu: r.novo.subiu, nivel: r.novo.nivel, linha };
  });
}
