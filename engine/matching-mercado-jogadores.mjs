/* O LIVRO DE ORDENS DE COMPRA DO MARKET (ST-14.11A · E14 · spec E14 §§10.3, 11) — camada 0.
 *
 * Uma ORDEM DE COMPRA é "quero N deste item, pagando até P cada". Ela fica no
 * livro com o PC-T de N × P preso, e quem tem o item a preenche — inteira ou
 * em partes. Tudo o que decide QUEM casa com quem, QUANTO e a QUE PREÇO mora
 * aqui, em Node; o servidor só grava o que sai daqui.
 *
 *   A PRIORIDADE   melhor preço → a mais antiga (a sequência de criação) → o
 *                  id. Nunca a mais nova: quem chegou antes ao mesmo preço
 *                  enche antes
 *   O PREÇO        o da ordem que JÁ ESTAVA no livro. O vendedor que aceita
 *                  menos recebe o preço da ordem; a ordem nova que acha um
 *                  lote anunciado mais barato paga o preço do lote, e a
 *                  diferença do que ela prendeu volta na mesma hora (a
 *                  MELHORA DE PREÇO)
 *   O PRÓPRIO      a ordem da própria conta é PULADA — sem consumir nada, e
 *                  a próxima do livro é a que casa
 *   O MÍNIMO       um fill tem no mínimo 50 PC de bruto, e não deixa um resto
 *                  menor que isso: o pedaço que deixaria um resto pequeno
 *                  encolhe até o resto caber, ou não acontece
 *   A TAXA         a de venda é do ACUMULADO da ordem vendedora (`taxaParcial`):
 *                  vender 10 de uma vez ou em cinco fills paga a mesma taxa, e
 *                  o mínimo de 1 PC é cobrado uma vez só
 *
 * Inteiros sempre: quantidade e preço unitário são PC inteiros, e nada aqui
 * divide para baixo em silêncio.
 */
import { taxa, taxaParcial, POLITICA_PILOTO, hashDaPolitica } from './taxas-mercado.mjs';

export const MINIMO_FILL = 50;
export const DURACAO_ORDEM_MS = 3 * 24 * 3_600_000;

const positivo = n => Number.isSafeInteger(n) && n > 0;

/* O que a ordem prende e paga ao nascer: N × P no escrow, e a taxa de criação
   (a mesma de anunciar, 0,5%) que queima e não volta ao cancelar. */
export function previewOrdem({ quantidade, precoUnit, politica = POLITICA_PILOTO }) {
  if (!positivo(quantidade)) return { ok: false, motivo: 'quantidade inválida' };
  if (!positivo(precoUnit)) return { ok: false, motivo: 'preço por unidade inválido' };
  const bruto = quantidade * precoUnit;
  if (!Number.isSafeInteger(bruto)) return { ok: false, motivo: 'a ordem passa do limite' };
  if (bruto < politica.brutoMinimoAnuncio) return { ok: false, motivo: `a ordem é de no mínimo ${politica.brutoMinimoAnuncio} no total` };
  const taxaCriacao = taxa(bruto, politica.anuncioBps, politica.minimoTaxa);
  return { ok: true, quantidade, precoUnit, reserva: bruto, taxaCriacao, total: bruto + taxaCriacao, versao: politica.versao, hash: hashDaPolitica(politica) };
}

/* A ordem do livro: preço maior primeiro, depois a sequência, depois o id. */
export const ordemDoLivro = (a, b) => (b.precoUnit - a.precoUnit) || (a.seq - b.seq) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/* QUANTO de uma ordem um vendedor com `oferta` unidades pode levar, ao preço
   `preco`. Zero quando o pedaço não cabe no mínimo. */
export function quantoPreencher({ restante, preco, oferta, minimo = MINIMO_FILL }) {
  if (!positivo(restante) || !positivo(preco) || !positivo(oferta)) return 0;
  let q = Math.min(oferta, restante);
  /* O resto pequeno: encolhe o pedaço até o que sobra valer o mínimo. */
  if (q < restante && (restante - q) * preco < minimo) q = restante - Math.ceil(minimo / preco);
  if (q <= 0 || q * preco < minimo) return 0;
  return q;
}

/* O VENDEDOR contra o livro: as ordens que casam, na prioridade, até acabar
   o que ele oferece. `pular` marca a ordem que não pode casar com ele (conta
   ligada, conta que não negocia agora, política de outra versão) — pulada
   como a própria, sem consumir. */
export function casarVenda({ livro, vendedorId, oferta, precoMinimo, minimo = MINIMO_FILL }) {
  const fills = [];
  let falta = oferta;
  for (const o of [...(livro ?? [])].sort(ordemDoLivro)) {
    if (falta <= 0) break;
    if (o.precoUnit < precoMinimo) break;                 // o livro está em ordem: daqui para baixo, ninguém paga o mínimo
    if (o.compradorId === vendedorId || o.pular) continue;
    const q = quantoPreencher({ restante: o.restante, preco: o.precoUnit, oferta: falta, minimo });
    if (!q) continue;
    fills.push({ ordemId: o.id, quantidade: q, precoUnit: o.precoUnit, bruto: q * o.precoUnit, reservado: q * o.precoUnit, melhora: 0 });
    falta -= q;
  }
  return fills;
}

/* A TAXA DE VENDA de uma sequência de fills da MESMA ordem vendedora: cada um
   paga a diferença do acumulado. A soma é a taxa do total. */
export function taxasDosFills(fills, { bps = POLITICA_PILOTO.vendaBps, acumuladoAntes = 0 } = {}) {
  let acc = acumuladoAntes;
  return fills.map(f => {
    const t = taxaParcial(acc, acc + f.bruto, bps);
    acc += f.bruto;
    return { ...f, taxaVenda: t, liquido: f.bruto - t };
  });
}

/* A ORDEM NOVA contra os lotes ANUNCIADOS (o lote fechado da etapa C): só o
   lote inteiro casa — a etapa C vendeu a quantidade fechada, e uma ordem não
   muda esse contrato. Do mais barato por unidade (o produto cruzado, sem
   dividir), depois o mais antigo, depois o id. Paga o preço do LOTE, e a
   diferença do que ela prendeu é a melhora de preço. */
const porUnidade = (a, b) => (a.preco * b.quantidade - b.preco * a.quantidade) || (a.criadoEm - b.criadoEm) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export function casarCompra({ anuncios, compradorId, restante, precoUnit, minimo = MINIMO_FILL }) {
  const fills = [];
  let resta = restante;
  for (const a of [...(anuncios ?? [])].sort(porUnidade)) {
    if (resta <= 0) break;
    if (a.preco > precoUnit * a.quantidade) break;        // mais caro por unidade que o limite: os seguintes também são
    if (a.vendedorId === compradorId || a.pular) continue;
    if (a.quantidade > resta) continue;
    if (resta - a.quantidade > 0 && (resta - a.quantidade) * precoUnit < minimo) continue;
    if (a.preco < minimo) continue;
    const reservado = a.quantidade * precoUnit;
    fills.push({ anuncioId: a.id, quantidade: a.quantidade, bruto: a.preco, reservado, melhora: reservado - a.preco });
    resta -= a.quantidade;
  }
  return fills;
}

/* O estado da ordem depois de um conjunto de fills. `original = executado + restante`. */
export function depoisDosFills(ordem, fills) {
  const q = fills.reduce((s, f) => s + f.quantidade, 0);
  const restante = ordem.restante - q;
  if (restante < 0) throw new Error('a ordem encheu além do que pedia');
  return { restante, executado: (ordem.executado ?? 0) + q, estado: restante === 0 ? 'FILLED' : 'ACTIVE' };
}
