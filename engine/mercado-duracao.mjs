/* O MERCADO DE FAIXA DE DURAÇÃO (ST-12.8 · F2.2 · Spec §6.5).
 *
 * "Fácil de entender, baixa variância; bom para liquidez." Quatro faixas de
 * tempo de luta, em segundos do MOTOR (a duração que `simular` devolve, a
 * mesma que a tela anima) — nenhuma contagem própria.
 *
 * ── OS LIMITES SÃO MEDIDOS, E A MEDIÇÃO É FIXTURE ─────────────────────────
 *
 * Medido em 26/09 sobre 10.000 lutas da árvore de sementes (com o clima,
 * depois do D-119): mínimo 17,5 s, quartis 28,3 · 30,5 · 33,0 s, máximo 44 s.
 * Os limites redondos 28 · 30 · 33 dão 21,9% · 22,8% · 29,8% · 25,5% — cada
 * faixa entre 15% e 35%, como a ficha pede. Redondos de propósito: "30 a 33 s"
 * se lê de relance; "30,46 a 33,01 s" não. A medição mora em
 * `test/fixtures/duracao.json` (`node tools/medir-duracao.mjs` a regrava) e a
 * suíte confere que um lote novo continua compatível — se o motor mudar o
 * ritmo das lutas, a fixture acusa antes de o bolo ficar torto.
 *
 * Sem empate por construção: toda luta cai em exatamente uma faixa.
 */
import { loteDoMercado, SIMS_MERCADO } from './mercado-abates.mjs';

export const LIMITES_DURACAO = Object.freeze([28, 30, 33]);
export const ROTULOS_DURACAO = Object.freeze(['até 28 s', '28 a 30 s', '30 a 33 s', '33 s ou mais']);

export const faixaDaDuracao = d => LIMITES_DURACAO.filter(l => d >= l).length;
export const selecoesDaDuracao = () => ROTULOS_DURACAO.map((_, i) => i);
export const vencedorasPorDuracao = d => (Number.isFinite(d) ? [faixaDaDuracao(d)] : []);

export const REGRA_DURACAO = Object.freeze({
  pergunta: 'quanto tempo a luta dura, do primeiro golpe ao último de pé',
  empate: 'não há empate: toda luta cai em exatamente uma faixa',
  /* A tela só fala em "dividir o bolo no empate" quando há empate. */
  empateDivide: false,
  zero: 'toda luta tem duração, então sempre uma faixa vence',
  tempestade: 'a duração é a do motor, com tempestade e tudo',
});

export function precoDoModeloDuracao(M, pool, raiz, sims = SIMS_MERCADO) {
  const vence = selecoesDaDuracao().map(() => 0);
  loteDoMercado(M, pool, raiz, sims, b => { vence[faixaDaDuracao(b.duration)]++; });
  return { sims, vence };
}
