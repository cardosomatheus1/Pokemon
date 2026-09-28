/* A TEMPORADA DA LIGA — 28 dias (ST-11.5 · F5.2 · Spec §9.8).
 *
 * Puro: o instante entra, a temporada sai — o número, a fase, o dia e o fim.
 * A temporada é do RELÓGIO, e não de uma tabela: duas máquinas no mesmo
 * instante dizem a mesma temporada, e nenhum botão "abre" uma.
 *
 *   semana 1      colocação (placement/progressão)
 *   semanas 2–3   competição
 *   semana 4      fechamento e evento
 *
 * O dia é o do mundo (`diaDoMundo`, virando às 3 h de Brasília, como a Arena),
 * e a temporada 1 começa no dia do mundo `INICIO` — uma segunda-feira.
 *
 * O SOFT RESET (§9.8) só toca o LIGA MMR: puxa o rating para o inicial pela
 * METADE da distância. Quem terminou alto começa a próxima ainda à frente,
 * mas precisa jogar para voltar — e a calibração e a Arena não são tocadas
 * (os três ratings não se leem, §9.7).
 */
import { diaDoMundo } from './avanco.mjs';
import { MMR } from './liga-mmr.mjs';

export const TEMPORADA = Object.freeze({ dias: 28, INICIO: diaDoMundo(Date.UTC(2026, 8, 28, 12)), fatorReset: 0.5 });
const DIA_MS = 86_400_000, FUSO_MS = 180 * 60_000;

export function temporadaDe(agora) {
  const d = diaDoMundo(agora) - TEMPORADA.INICIO;
  const numero = Math.floor(d / TEMPORADA.dias) + 1;
  const dia = d - (numero - 1) * TEMPORADA.dias + 1;
  const fase = dia <= 7 ? 'colocacao' : dia <= 21 ? 'competicao' : 'fechamento';
  const inicio = (TEMPORADA.INICIO + (numero - 1) * TEMPORADA.dias) * DIA_MS + FUSO_MS;
  return { numero, dia, fase, inicio, fim: inicio + TEMPORADA.dias * DIA_MS };
}

export const softReset = rating => MMR.inicial + Math.round((rating - MMR.inicial) * TEMPORADA.fatorReset);
