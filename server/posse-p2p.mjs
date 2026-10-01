/* A POSSE QUE MUDA DE MÃOS ENTRE JOGADORES (ST-14.9 · E14 · spec E14 §§4, 9, 10).
 *
 * A troca (ST-14.7) e a compra no Market (ST-14.9) terminam do mesmo jeito: o
 * que estava PRESO numa oferta sai de quem ofereceu e chega a quem recebe, na
 * transação de quem chama. Um caminho só, para as duas não divergirem:
 *
 *   criatura   muda de dono, vira `p2p_verified` (veio de outro jogador),
 *              sobe a versão da instância, e ganha uma linha no histórico de
 *              dono (`criaturas_transferencias` — o cooldown sai dela)
 *   lote       sai do reservado de quem manda e nasce na conta de quem
 *              recebe como `p2p_verified`, com a fonte `<ref>:<id>`
 *
 * Só se move o que tem RESERVA ATIVA desta oferta: o que não estava preso
 * não sai. Quem chama consome as reservas depois (`consumirOferta`).
 */
import { creditarBolsa } from './inventario.mjs';

export const ERRO_POSSE = Object.freeze({ FORA: 'POSSE_FORA_DA_OFERTA' });
const falha = msg => Object.assign(new Error(msg), { codigo: ERRO_POSSE.FORA });

export function moverReservados(db, { holds, de, para, refTipo, refId, criaturas, agora }) {
  const meus = holds.filter(h => h.user_id === de);
  for (const id of criaturas) {
    if (!meus.some(h => h.tipo === 'criatura' && h.criatura_id === id)) throw falha(`a criatura ${id} não está presa nesta oferta`);
    const r = db.prepare(`UPDATE criaturas SET user_id = ?, na_caixa = 0, proveniencia = 'p2p_verified', versao = versao + 1 WHERE id = ? AND user_id = ?`).run(para, id, de);
    if (r.changes !== 1) throw falha(`a criatura ${id} não é mais de quem a ofereceu`);
    db.prepare(`INSERT INTO criaturas_transferencias (criatura_id, de_user, para_user, ref_tipo, ref_id, em) VALUES (?, ?, ?, ?, ?, ?)`).run(id, de, para, refTipo, refId, agora);
  }
  for (const h of meus.filter(x => x.tipo === 'item')) {
    if (!db.prepare(`SELECT 1 FROM bolsa_lotes WHERE id = ? AND user_id = ?`).get(h.lote_id, de)) throw falha(`o lote ${h.lote_id} não é mais de quem o ofereceu`);
    db.prepare(`UPDATE bolsa_lotes SET quantidade = quantidade - ?, reservada = reservada - ? WHERE id = ?`).run(h.quantidade, h.quantidade, h.lote_id);
    if (!db.prepare(`UPDATE bolsa SET quantidade = quantidade - ? WHERE user_id = ? AND item_id = ? AND quantidade >= ?`).run(h.quantidade, de, h.item_id, h.quantidade).changes)
      throw falha(`a bolsa de quem manda não tem ${h.item_id}`);
    creditarBolsa(db, para, h.item_id, h.quantidade, { classe: 'p2p_verified', fonte: `${refTipo}:${refId}`, agora });
  }
}
