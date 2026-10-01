/* A EMISSÃO CONTROLADA (ST-14.4 · E14 · spec E14 §5.4).
 *
 * O item raro de verdade — a bola de captura garantida — não sai de baú nem de
 * loja: sai de FONTES nomeadas, cada uma com orçamento declarado no pack
 * (`item.emissao.fontes[fonte] = { porConta, global }`, sob `versao`). Aqui
 * mora a única porta de entrada dele na bolsa, e ela responde três coisas:
 *
 *   fonte sem regra       lança — fonte que ninguém aprovou não emite
 *   o mesmo evento        devolve o que já foi emitido (a chave é UNIQUE)
 *   orçamento esgotado    RECUSA o pedido novo; o que já saiu nunca volta
 *
 * O teto é a contagem das linhas, lida e escrita na MESMA transação
 * (`emTransacao`, BEGIN IMMEDIATE): dois pedidos ao mesmo tempo não leem o
 * mesmo saldo de orçamento, porque o segundo espera o primeiro gravar.
 */
import { creditarBolsa } from './inventario.mjs';
import { emTransacao } from './carteira.mjs';

export const ERRO_EMISSAO = Object.freeze({ FONTE: 'EMISSAO_FONTE_NAO_APROVADA' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

export function regraDeEmissao(pack, itemId, fonte) {
  const item = (pack?.catalogo ?? []).find(i => i.id === itemId);
  const f = item?.emissao?.fontes?.[fonte];
  if (!f || !item.emissao.versao) return null;
  return { versao: item.emissao.versao, porConta: f.porConta, global: f.global };
}

const DA_CONTA = `SELECT COALESCE(SUM(quantidade), 0) n FROM emissoes_controladas WHERE item_id = ? AND fonte = ? AND versao = ? AND user_id = ?`;
const NO_TOTAL = `SELECT COALESCE(SUM(quantidade), 0) n FROM emissoes_controladas WHERE item_id = ? AND fonte = ? AND versao = ?`;

export function emitirControlado(db, { userId, pack, itemId, fonte, evento, agora }) {
  const regra = regraDeEmissao(pack, itemId, fonte);
  if (!regra) throw falha(ERRO_EMISSAO.FONTE, `a fonte ${fonte} não emite ${itemId}`);
  return emTransacao(db, () => {
    const ja = db.prepare(`SELECT quantidade, user_id FROM emissoes_controladas WHERE evento = ?`).get(evento);
    if (ja) return { ok: ja.user_id === userId, repetida: true, item: itemId, quantidade: ja.quantidade };
    if (db.prepare(DA_CONTA).get(itemId, fonte, regra.versao, userId).n + 1 > regra.porConta)
      return { ok: false, motivo: 'conta', item: itemId };
    if (db.prepare(NO_TOTAL).get(itemId, fonte, regra.versao).n + 1 > regra.global)
      return { ok: false, motivo: 'global', item: itemId };
    db.prepare(`INSERT INTO emissoes_controladas (item_id, fonte, versao, user_id, evento, quantidade, em) VALUES (?, ?, ?, ?, ?, 1, ?)`)
      .run(itemId, fonte, regra.versao, userId, evento, agora);
    creditarBolsa(db, userId, itemId, 1, { fonte: `emissao:${fonte}:${evento}`, agora });
    return { ok: true, item: itemId, quantidade: 1 };
  });
}

/* Quanto já saiu, para o painel e para o relatório do gate. */
export const emitidos = (db, { itemId, fonte, versao }) => db.prepare(NO_TOTAL).get(itemId, fonte, versao).n;
