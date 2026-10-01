/* O HISTÓRICO DE PREÇOS SEM FABRICAR REFERÊNCIA (ST-14.12 · E14 · spec E14 §12) — camada 0.
 *
 * O Market mostra o que ACONTECEU, e só quando aconteceu o bastante para
 * dizer alguma coisa. Daqui saem os números de uma série (pack, espécie ou
 * item, shiny, faixa de potencial) a partir das vendas que o servidor já
 * filtrou — nunca da permuta, nunca do combo, nunca da transferência.
 *
 *   fato         a última venda, o menor anúncio ativo, N: mostram-se sempre
 *   agregado     a mediana e a média de 7 dias, o volume de 24 h e de 7 dias:
 *                só com AMOSTRA — ≥ 10 vendas, ≥ 5 compradores e ≥ 5
 *                vendedores distintos na janela; senão "amostra insuficiente"
 *
 * O preço é POR UNIDADE (o lote de 3 bolas por 300 é 100 cada), e o volume
 * tem duas medidas que não se somam: quantas unidades e quanto PC-T.
 * A janela é UTC, escrita na resposta; a tela mostra no fuso de quem olha.
 * Nada de "valor justo": a resposta diz o método, e não um veredito.
 */
export const AMOSTRA_MIN = Object.freeze({ vendas: 10, compradores: 5, vendedores: 5 });
export const DIA_MS = 86_400_000;
export const FAIXAS_POTENCIAL = Object.freeze([[0, 39], [40, 59], [60, 79], [80, 100]]);

/* A faixa de um potencial: o índice em FAIXAS_POTENCIAL, ou null. */
export function faixaDoPotencial(p) {
  if (!Number.isFinite(p)) return null;
  const i = FAIXAS_POTENCIAL.findIndex(([a, b]) => p >= a && p <= b);
  return i < 0 ? null : i;
}

export const precoUnitario = v => v.preco / v.quantidade;

export function mediana(xs) {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b), m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

export function amostraSuficiente(vendas) {
  return vendas.length >= AMOSTRA_MIN.vendas
    && new Set(vendas.map(v => v.comprador)).size >= AMOSTRA_MIN.compradores
    && new Set(vendas.map(v => v.vendedor)).size >= AMOSTRA_MIN.vendedores;
}

/* `vendas`: [{ preco, quantidade, comprador, vendedor, em }] JÁ filtradas
   pelo servidor (a série e as exclusões). `menorAnuncio`: o preço unitário
   do anúncio ativo mais barato da série, ou null. */
export function resumoDaSerie({ vendas, menorAnuncio = null, agora }) {
  const em7 = vendas.filter(v => v.em > agora - 7 * DIA_MS && v.em <= agora);
  const em24 = em7.filter(v => v.em > agora - DIA_MS);
  const ultima = vendas.reduce((u, v) => (v.em <= agora && (!u || v.em > u.em || (v.em === u.em && v.id > u.id)) ? v : u), null);
  const suficiente = amostraSuficiente(em7);
  const soma = xs => xs.reduce((a, v) => a + v.preco, 0);
  const unidades = xs => xs.reduce((a, v) => a + v.quantidade, 0);
  const unit = em7.map(precoUnitario);
  return {
    janela: { inicio: agora - 7 * DIA_MS, fim: agora, fuso: 'UTC', metodo: 'vendas liquidadas do Market; preço por unidade' },
    n7d: em7.length, n24h: em24.length,
    ultimaVenda: ultima ? { precoUnitario: precoUnitario(ultima), em: ultima.em } : null,
    menorAnuncio,
    suficiente,
    motivo: suficiente ? null : `amostra insuficiente: ${em7.length} venda(s), ${new Set(em7.map(v => v.comprador)).size} comprador(es) e ${new Set(em7.map(v => v.vendedor)).size} vendedor(es) em 7 dias — precisa de ${AMOSTRA_MIN.vendas}, ${AMOSTRA_MIN.compradores} e ${AMOSTRA_MIN.vendedores}`,
    mediana7d: suficiente ? mediana(unit) : null,
    media7d: suficiente ? unit.reduce((a, b) => a + b, 0) / unit.length : null,
    volume24h: suficiente ? { pct: soma(em24), unidades: unidades(em24) } : null,
    volume7d: suficiente ? { pct: soma(em7), unidades: unidades(em7) } : null,
  };
}
