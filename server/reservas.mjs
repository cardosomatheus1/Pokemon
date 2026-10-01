/* AS RESERVAS E O ESCROW (ST-14.6 · E14 · spec E14 §§7–8).
 *
 * Uma troca ou um anúncio PRENDE o que oferece até liquidar, cancelar ou
 * expirar: a criatura não evolui, não sai em expedição nem é solta; a bola
 * oferecida não é lançada; o PC-T oferecido não é gasto. O dono de cada
 * reserva é a oferta (`dono: { tipo: 'trade' | 'market', id }`), e é por ele
 * que tudo se libera ou se consome — de uma vez.
 *
 * TUDO OU NADA, numa transação só (`emTransacao`): a oferta com três ativos e
 * o terceiro inelegível não deixa os dois primeiros presos. A carteira
 * devolve `{ok:false}` em vez de lançar, e um SAVEPOINT desfaz só o passo
 * dela — por isso a recusa da carteira vira exceção aqui (`passo`), e a
 * exceção desfaz a oferta inteira.
 *
 * O que decide se um ativo PODE ser oferecido é a política única
 * (`elegibilidade.mjs`, ST-14.5) — aqui não há uma segunda regra.
 */
import { randomUUID } from 'node:crypto';
import { emTransacao, reservarP2PNoBanco, liberarP2PNoBanco } from './carteira.mjs';
import { elegibilidadeDaCriatura, elegibilidadeDoItem, elegibilidadeDaMoeda, criaturaReservada } from './elegibilidade.mjs';
import { negociavelPelaOrigem } from '../engine/proveniencia.mjs';

export const ERRO_RESERVA = Object.freeze({ RECUSADA: 'RESERVA_RECUSADA', DONO: 'RESERVA_DONO_INVALIDO', VAZIA: 'RESERVA_VAZIA' });
const falha = (codigo, msg, extra = {}) => Object.assign(new Error(msg), { codigo, ...extra });
const ACAO = { trade: 'trade', market: 'market' };

const passo = r => { if (!r?.ok) throw falha(ERRO_RESERVA.RECUSADA, `a carteira recusou: ${r?.motivo ?? '?'}`, { reason_code: 'INSUFFICIENT_FUNDS' }); return r; };
const recusar = (r, oque) => { throw falha(ERRO_RESERVA.RECUSADA, `${oque}: ${r.reason_code}${r.detalhe ? ` (${r.detalhe})` : ''}`, { reason_code: r.reason_code, available_at: r.available_at }); };

function gravarHold(db, h, agora) {
  db.prepare(`INSERT INTO asset_holds (id, dono_tipo, dono_id, user_id, tipo, criatura_id, lote_id, item_id, quantidade, expira_em, criado_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(h.id, h.donoTipo, h.donoId, h.userId, h.tipo, h.criaturaId ?? null, h.loteId ?? null, h.itemId ?? null, h.quantidade, h.expiraEm, agora);
  db.prepare(`INSERT INTO asset_holds_eventos (hold_id, evento, em) VALUES (?, 'ativa', ?)`).run(h.id, agora);
}

/* Os lotes que a oferta prende: só os de classe que NEGOCIA, do mais antigo,
   e só o que ainda está livre — a mesma ordem do débito. */
const LOTES_LIMPOS = `SELECT id, quantidade - reservada AS livre, classe FROM bolsa_lotes
                       WHERE user_id = ? AND item_id = ? AND quantidade - reservada > 0 ORDER BY criado_em, id`;

/* ── RESERVAR ─────────────────────────────────────────────────────────────
 * `ativos = { criaturas: [id], itens: [{ itemId, quantidade }], moeda: n }`.
 * Devolve os ids das reservas criadas. Qualquer recusa desfaz tudo. */
export function reservarOferta(db, { userId, pack, dono, ativos = {}, expiraEm, agora, checkpoint }) {
  if (!ACAO[dono?.tipo] || typeof dono?.id !== 'string' || !dono.id) throw falha(ERRO_RESERVA.DONO, 'oferta sem dono válido');
  const criaturas = ativos.criaturas ?? [], itens = ativos.itens ?? [], moeda = ativos.moeda ?? 0;
  if (!criaturas.length && !itens.length && !moeda) throw falha(ERRO_RESERVA.VAZIA, 'a oferta não tem nada');
  if (!(expiraEm > agora)) throw falha(ERRO_RESERVA.DONO, 'a reserva precisa de prazo no futuro');
  const acao = ACAO[dono.tipo], base = { donoTipo: dono.tipo, donoId: dono.id, userId, expiraEm };
  return emTransacao(db, () => {
    const ids = [];
    for (const id of new Set(criaturas)) {
      const r = elegibilidadeDaCriatura(db, { userId, pack, id, acao, agora, checkpoint });
      if (!r.allowed) recusar(r, `a criatura ${id}`);
      const h = { ...base, id: randomUUID(), tipo: 'criatura', criaturaId: id, quantidade: 1 };
      gravarHold(db, h, agora); ids.push(h.id);
    }
    for (const { itemId, quantidade } of itens) {
      const r = elegibilidadeDoItem(db, { userId, pack, itemId, quantidade, acao, agora, checkpoint });
      if (!r.allowed) recusar(r, `o item ${itemId}`);
      let falta = quantidade;
      for (const l of db.prepare(LOTES_LIMPOS).all(userId, itemId)) {
        if (!falta) break;
        if (!negociavelPelaOrigem(l.classe)) continue;
        const usa = Math.min(falta, l.livre);
        db.prepare(`UPDATE bolsa_lotes SET reservada = reservada + ? WHERE id = ?`).run(usa, l.id);
        const h = { ...base, id: randomUUID(), tipo: 'item', loteId: l.id, itemId, quantidade: usa };
        gravarHold(db, h, agora); ids.push(h.id); falta -= usa;
      }
      if (falta) recusar({ reason_code: 'INSUFFICIENT_ITEMS' }, `o item ${itemId}`);
    }
    if (moeda) {
      const r = elegibilidadeDaMoeda(db, { userId, bucket: 'transferivel', valor: moeda, acao, agora, checkpoint });
      if (!r.allowed) recusar(r, 'a moeda');
      const h = { ...base, id: randomUUID(), tipo: 'moeda', quantidade: moeda };
      gravarHold(db, h, agora); ids.push(h.id);
      passo(reservarP2PNoBanco(db, { userId, valor: moeda, ref: h.id, agora }));
    }
    return { ids };
  });
}

/* ── LIBERAR / EXPIRAR ────────────────────────────────────────────────────
 * Só o que está ATIVO muda (`WHERE estado = 'ativa'`): liberar duas vezes
 * libera uma, e o segundo pedido não devolve o PC-T de novo. */
function encerrar(db, { holds, estado, agora }) {
  let n = 0;
  for (const h of holds) {
    const r = db.prepare(`UPDATE asset_holds SET estado = ?, versao = versao + 1, resolvido_em = ? WHERE id = ? AND estado = 'ativa'`).run(estado, agora, h.id);
    if (!r.changes) continue;
    db.prepare(`INSERT INTO asset_holds_eventos (hold_id, evento, em) VALUES (?, ?, ?)`).run(h.id, estado, agora);
    if (h.tipo === 'item' && estado !== 'consumida') db.prepare(`UPDATE bolsa_lotes SET reservada = reservada - ? WHERE id = ?`).run(h.quantidade, h.lote_id);
    if (h.tipo === 'moeda' && estado !== 'consumida')
      passo(liberarP2PNoBanco(db, { userId: h.user_id, valor: h.quantidade, ref: h.id, idem: `hold:${h.id}:${estado}`, agora }));
    n++;
  }
  return n;
}

const ATIVOS_DO_DONO = `SELECT * FROM asset_holds WHERE dono_tipo = ? AND dono_id = ? AND estado = 'ativa'`;
export const holdsAtivos = (db, dono) => db.prepare(ATIVOS_DO_DONO).all(dono.tipo, dono.id);

export const liberarOferta = (db, { dono, agora }) =>
  emTransacao(db, () => ({ liberadas: encerrar(db, { holds: holdsAtivos(db, dono), estado: 'liberada', agora }) }));

/* O relógio do SERVIDOR decide o vencimento — quem chama passa o `agora` dele. */
export const expirarVencidas = (db, { agora }) =>
  emTransacao(db, () => ({ expiradas: encerrar(db, { holds: db.prepare(`SELECT * FROM asset_holds WHERE estado = 'ativa' AND expira_em <= ?`).all(agora), estado: 'expirada', agora }) }));

/* A pergunta que os caminhos de uso fazem (a consulta mora na elegibilidade,
   que a usa como fato). A liquidação — que consome as reservas e move os
   ativos na mesma transação — é da ST-14.7. */
export function exigirSemReserva(db, id) {
  if (criaturaReservada(db, id))
    throw falha(ERRO_RESERVA.RECUSADA, 'esta criatura está reservada numa troca ou num anúncio — cancele antes', { reason_code: 'ASSET_BUSY' });
}
