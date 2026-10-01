/* AS TAXAS DA TROCA E DO MERCADO ENTRE JOGADORES (ST-14.8 · E14 · spec E14 §11) — camada 0.
 *
 * PC é inteiro, e continua inteiro: nenhum centavo implícito. A taxa é
 *
 *     taxa(bruto, bps) = max(1, ceil(bruto × bps / 10 000))   para bruto > 0
 *     taxa(0)          = 0
 *
 * calculada em BigInt — `bruto × bps` passa de 2^53 muito antes de o bruto
 * passar, e o ceil de um float errado por um ulp cobra 1 PC a mais (ou a
 * menos) sem ninguém ver. A taxa QUEIMA: sai do pagador e não é crédito de
 * ninguém, nem da casa.
 *
 * A POLÍTICA TEM VERSÃO E IMPRESSÃO DIGITAL. A oferta grava as duas quando é
 * criada, e a liquidação cobra a taxa DELA — mudar a configuração amanhã não
 * muda o preço de uma oferta já aceita. Os números da spec §11 são a baseline
 * do piloto, em moeda simulada (DEC-21).
 */
import { sha256Hex } from './hash.mjs';

export const POLITICA_PILOTO = Object.freeze({
  versao: 'taxas-v1-piloto',
  anuncioBps: 50,          // criar anúncio / buy order: 0,5%
  vendaBps: 200,           // venda, cobrada do vendedor: 2%
  tradeBps: 100,           // troca direta, por remetente de PC-T: 1%
  minimoTaxa: 1,           // com base positiva, nunca menos de 1 PC
  brutoMinimoAnuncio: 100, // anúncio ou buy order abaixo disto não existe
  minimoLadoTrade: 100,    // o lado monetário de uma troca, se houver, é ≥ 100
});

/* A impressão digital: a política inteira, em ordem fixa de chaves. */
export function hashDaPolitica(p = POLITICA_PILOTO) {
  const ordem = Object.keys(p).sort().map(k => [k, p[k]]);
  return sha256Hex(JSON.stringify(ordem)).slice(0, 16);
}

const inteiroSeguro = n => Number.isSafeInteger(n) && n >= 0;

export function taxa(bruto, bps, minimo = POLITICA_PILOTO.minimoTaxa) {
  if (!inteiroSeguro(bruto)) throw new Error(`bruto inválido: ${bruto}`);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error(`bps inválido: ${bps}`);
  if (bruto === 0) return 0;
  const t = (BigInt(bruto) * BigInt(bps) + 9_999n) / 10_000n;
  const r = t < BigInt(minimo) ? BigInt(minimo) : t;
  if (r > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('taxa fora do inteiro seguro');
  return Number(r);
}

/* A taxa CUMULATIVA, pronta para a entrega D (buy orders com fills parciais):
   cada fill paga a diferença entre a taxa do acumulado depois e a do antes —
   a soma das parcelas é a taxa do total, e o mínimo de 1 PC é cobrado uma vez
   só, não por fill. */
export const taxaParcial = (acumuladoAntes, acumuladoDepois, bps) =>
  taxa(acumuladoDepois, bps) - taxa(acumuladoAntes, bps);

/* ── A TROCA ──────────────────────────────────────────────────────────────
 * Cada lado que manda PC-T paga a própria taxa, ALÉM do que oferece: quem
 * manda 1.000 paga 1.010, o outro recebe 1.000, 10 queimam. Duas pontas
 * monetárias são cobradas SEPARADAMENTE (não se compensa 1.000 contra 400).
 * Criatura por criatura não paga nada — sem valuation inventado. */
export function previewTrade({ valorA = 0, valorB = 0, politica = POLITICA_PILOTO }) {
  const lado = valor => {
    if (!inteiroSeguro(valor)) throw new Error(`valor inválido: ${valor}`);
    if (valor > 0 && valor < politica.minimoLadoTrade) return { ok: false, motivo: `o lado em PC-T é de no mínimo ${politica.minimoLadoTrade}` };
    const t = taxa(valor, politica.tradeBps, politica.minimoTaxa);
    return { ok: true, envia: valor, taxa: t, reservar: valor + t };
  };
  const a = lado(valorA), b = lado(valorB);
  if (!a.ok || !b.ok) return { ok: false, motivo: (a.ok ? b : a).motivo };
  return { ok: true, a, b, queima: a.taxa + b.taxa, versao: politica.versao, hash: hashDaPolitica(politica) };
}

/* ── O ANÚNCIO ────────────────────────────────────────────────────────────
 * Paga-se para anunciar, e o vendedor paga na venda. O exemplo da spec: 1.000
 * PC → 5 para criar, 20 ao vender, recebe 980, líquido 975. */
export function previewAnuncio({ preco, politica = POLITICA_PILOTO }) {
  if (!inteiroSeguro(preco)) throw new Error(`preço inválido: ${preco}`);
  if (preco < politica.brutoMinimoAnuncio) return { ok: false, motivo: `o anúncio é de no mínimo ${politica.brutoMinimoAnuncio}` };
  const taxaAnuncio = taxa(preco, politica.anuncioBps, politica.minimoTaxa);
  const taxaVenda = taxa(preco, politica.vendaBps, politica.minimoTaxa);
  return { ok: true, preco, taxaAnuncio, taxaVenda, recebe: preco - taxaVenda, liquido: preco - taxaVenda - taxaAnuncio,
           versao: politica.versao, hash: hashDaPolitica(politica) };
}
