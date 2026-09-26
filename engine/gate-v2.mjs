/* OS INDICADORES DO BOLO E O GATE DA V2 (ST-12.10 · F2.8 · Spec §6.14, §6.15).
 *
 * Puro: entram os bolos pagos e as previsões da Liga; saem os números do §6.14
 * e o veredito de cada critério do §6.15 — com o n, ou "amostra insuficiente".
 *
 * ── O GATE MEDE, E NÃO TRANCA (decisão do dono, 26/09) ────────────────────
 *
 * Com 5–10 amigos nenhum critério fecha estatisticamente. O que este arquivo
 * não pode fazer é FINGIR que fechou: abaixo da amostra declarada, a resposta
 * é "amostra insuficiente", e nunca um "passou" por falta de contra-exemplo.
 *
 * ── AS METAS, DECLARADAS AQUI E NÃO NA TELA ──────────────────────────────
 *
 *   LIQUIDEZ          a mediana de jogadores DISTINTOS por bolo com entrada
 *                     chega a 5, medida sobre pelo menos 30 bolos. Com menos
 *                     de 5 pessoas não há "preço formado pelos jogadores" —
 *                     há a opinião de um amigo contra a de outro
 *   CALIBRAÇÃO        o Brier médio das previsões feitas depois da primeira
 *                     semana de conta é MENOR que o da primeira semana (menor
 *                     é melhor), com pelo menos 30 previsões de cada lado
 *   DIVERGÊNCIA       zero bolos em que o que saiu difere do que entrou — este
 *                     não tem amostra mínima: uma divergência já reprova
 */

export const META = Object.freeze({
  entrantesPorBolo: 5, bolosMinimos: 30, previsoesMinimas: 30,
});
const SEMANA = 7 * 24 * 3600 * 1000;

const mediana = v => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Concentração do bolo: Herfindahl das fatias por seleção (0 a 1). 1 = todo o
   dinheiro num lutador só; 1/12 = espalhado por igual. As fatias do líquido e
   do bruto são as mesmas (a taxa é proporcional), então o índice é um só. */
export function concentracao(totais) {
  const soma = totais.reduce((a, b) => a + b, 0);
  if (!soma) return null;
  return totais.reduce((a, t) => a + (t / soma) ** 2, 0);
}

/* `bolos`: [{ entradas: [{ user, selecao, valor }], totais: [por seleção], entrou, saiu }]
   `entrou` = Σ entradas; `saiu` = Σ pagamentos + tesouraria. */
export function indicadoresDoBolo(bolos) {
  const comEntrada = bolos.filter(b => b.entradas.length);
  const pessoas = comEntrada.map(b => new Set(b.entradas.map(e => e.user)).size);
  const conc = comEntrada.map(b => concentracao(b.totais)).filter(x => x !== null);
  return {
    bolos: bolos.length,
    bolosComEntrada: comEntrada.length,
    entradasPorBolo: mediana(comEntrada.map(b => b.entradas.length)),
    entrantesPorBolo: mediana(pessoas),
    concentracaoMedia: conc.length ? conc.reduce((a, b) => a + b, 0) / conc.length : null,
    divergencias: bolos.filter(b => b.entrou !== b.saiu).length,
    jogadores: new Set(comEntrada.flatMap(b => b.entradas.map(e => e.user))).size,
  };
}

/* `previsoes`: [{ score, criadoEm, contaCriadaEm }] (só as pontuadas). */
export function calibracaoPorSemana(previsoes) {
  const primeira = [], depois = [];
  for (const p of previsoes) (p.criadoEm - p.contaCriadaEm < SEMANA ? primeira : depois).push(p.score);
  const media = v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
  return { primeira: { n: primeira.length, brier: media(primeira) }, depois: { n: depois.length, brier: media(depois) } };
}

const INSUF = 'amostra insuficiente';

export function gateDaV2({ indicadores, calibracao, ligaJogadores, ativos }) {
  const liquidez = indicadores.bolosComEntrada < META.bolosMinimos
    ? { veredito: INSUF, n: indicadores.bolosComEntrada, precisa: META.bolosMinimos }
    : { veredito: indicadores.entrantesPorBolo >= META.entrantesPorBolo ? 'passou' : 'não passou',
        n: indicadores.bolosComEntrada, valor: indicadores.entrantesPorBolo, meta: META.entrantesPorBolo };
  const { primeira, depois } = calibracao;
  const melhorando = primeira.n < META.previsoesMinimas || depois.n < META.previsoesMinimas
    ? { veredito: INSUF, n: [primeira.n, depois.n], precisa: META.previsoesMinimas }
    : { veredito: depois.brier < primeira.brier ? 'passou' : 'não passou',
        n: [primeira.n, depois.n], valor: [primeira.brier, depois.brier] };
  const divergencia = { veredito: indicadores.divergencias === 0 ? 'passou' : 'não passou',
                        n: indicadores.bolos, valor: indicadores.divergencias };
  /* Participação na Liga: o §6.15 pede "conhecida", não uma meta. */
  const participacao = { veredito: ativos ? 'medida' : INSUF, valor: ativos ? ligaJogadores / ativos : null,
                         n: ativos };
  const criterios = { liquidez, melhorando, divergencia, participacao };
  const vs = Object.values(criterios).map(c => c.veredito);
  const veredito = vs.includes('não passou') ? 'não passou' : vs.includes(INSUF) ? INSUF : 'passou';
  return { veredito, criterios };
}
