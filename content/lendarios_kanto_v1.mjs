/* OS CINCO LENDÁRIOS DE KANTO — fora da Arena e fora do idle (ST-10.18).
 *
 * A decisão é do dono (L-057): "FORA DOS DOIS — Mew, Mewtwo, Articuno, Zapdos,
 * Moltres. Os cinco não são capturáveis no farm normal. Eles são bosses." E o
 * chefe NÃO dropa o lendário: dropa ESSÊNCIA da espécie — quantas montam um é
 * decisão que a L-057 guarda para depois de medir uma raid de verdade.
 *
 * Por isso moram AQUI, e não em `ESPECIES`: bioma, Pokédex, shiny, loja e
 * elenco iteram espécies, e nenhum deles pode vê-los. Só a luta de treino os
 * conhece, pelo `engine/especie.mjs`. Stats base do material de origem. */
export const LENDARIOS = [
  { dex: 144, n: 'articuno', t: ['ice', 'flying'],      s: [90, 85, 100, 95, 125, 85] },
  { dex: 145, n: 'zapdos',   t: ['electric', 'flying'], s: [90, 90, 85, 125, 90, 100] },
  { dex: 146, n: 'moltres',  t: ['fire', 'flying'],     s: [90, 100, 90, 125, 85, 90] },
  { dex: 150, n: 'mewtwo',   t: ['psychic'],            s: [106, 110, 90, 154, 90, 130] },
  { dex: 151, n: 'mew',      t: ['psychic'],            s: [100, 100, 100, 100, 100, 100] },
];
