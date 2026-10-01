/* AS TAXAS NO SERVIDOR (ST-14.8 · E14 · spec E14 §11).
 *
 * A conta é a da camada 0 (`engine/taxas-mercado.mjs`); aqui mora o que mexe
 * na carteira. Duas coisas, e as duas gravam a VERSÃO da política no `memo`
 * do lançamento — o histórico financeiro aponta a operação (`ref`) e a regra
 * que a cobrou:
 *
 *   o anúncio   paga a taxa de criação na hora, do PC-T elegível, e ela queima
 *   a troca     cada remetente reserva valor + taxa junto (a ST-14.6 prende),
 *               e a liquidação queima a taxa do reservado (`DIRECT_TRADE_FEE`)
 *
 * A taxa é a que a OFERTA gravou quando nasceu (`politica`), e não a de hoje.
 */
import { previewAnuncio, previewTrade, POLITICA_PILOTO } from '../engine/taxas-mercado.mjs';
import { queimarTaxaDeAnuncioNoBanco, liquidarP2PNoBanco } from './carteira.mjs';

export function cobrarTaxaDeAnuncio(db, { userId, preco, ref, idem, agora, politica = POLITICA_PILOTO }) {
  const p = previewAnuncio({ preco, politica });
  if (!p.ok) return { ok: false, motivo: p.motivo };
  const r = queimarTaxaDeAnuncioNoBanco(db, { userId, valor: p.taxaAnuncio, ref, idem, agora, memo: `${p.versao}:${p.hash}` });
  return r.ok ? { ok: true, taxa: p.taxaAnuncio, versao: p.versao, hash: p.hash } : r;
}

/* A ponta monetária de UMA troca: de quem envia para quem recebe, com a taxa
   da política gravada na oferta. Quem chama (a liquidação da ST-14.7) já está
   dentro da transação e trata `{ok:false}` como falha do conjunto. */
export function liquidarPontaDaTroca(db, { de, para, valor, ref, agora, politica = POLITICA_PILOTO }) {
  const p = previewTrade({ valorA: valor, politica });
  if (!p.ok) return { ok: false, motivo: p.motivo };
  return liquidarP2PNoBanco(db, { de, para, valor, taxa: p.a.taxa, ref, agora, tipoTaxa: 'DIRECT_TRADE_FEE', memo: `${p.versao}:${p.hash}` });
}
