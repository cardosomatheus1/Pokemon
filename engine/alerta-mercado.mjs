/* OS ALERTAS DO MERCADO: PREÇO FORA DA CURVA E GIRO ANÔMALO (ST-14.14d · E14 · spec E14 §13 · L-227) — camada 0.
 *
 * Os dois sinais clássicos de lavagem por Market, medidos contra o que JÁ
 * existe — nunca contra uma referência inventada:
 *
 *   preço   uma venda muito acima ou abaixo da MEDIANA da série nos 7 dias
 *           antes dela — e só quando a série TEM amostra (a mesma régua da
 *           ST-14.12: 10 vendas, 5 compradores, 5 vendedores). Sem curva, não
 *           há "fora da curva"
 *   giro    a conta que vende, compra e troca demais para o tamanho dela:
 *           quem tem duas criaturas e fez quinze operações na semana está
 *           passando coisa adiante, não colecionando
 *
 * Os limiares são o baseline do piloto (recomendação, como a taxa e os
 * limites da ST-14.14) — calibrar com os dados de liquidez. O alerta é
 * REGISTRO: suspeita com o número, revisada pelo operador, nunca punição.
 */
export const LIMIARES_ALERTA = Object.freeze({ fator: 3, giroMinimo: 10, giroPorTamanho: 2 });

/* `unitario` da venda contra a `mediana` da série; null quando não há curva. */
export function precoForaDaCurva({ unitario, mediana }, l = LIMIARES_ALERTA) {
  if (!(mediana > 0) || !(unitario > 0)) return null;
  const razao = unitario / mediana;
  return razao >= l.fator || razao <= 1 / l.fator ? { razao, acima: razao > 1 } : null;
}

/* `operacoes`: vendas + compras + trocas liquidadas da conta na janela;
   `tamanho`: o que ela tem (criaturas). */
export function giroAnomalo({ operacoes, tamanho }, l = LIMIARES_ALERTA) {
  const t = Math.max(1, tamanho);
  return operacoes >= l.giroMinimo && operacoes > l.giroPorTamanho * t ? { operacoes, tamanho: t, razao: operacoes / t } : null;
}
