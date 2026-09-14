/* GERADO por `tools/folha-captura.mjs` — não editar à mão.
 *
 * A cor de cada bola, AMOSTRADA do ícone que o jogo já usa
 * (`assets/icones/itens.png`, nas casas que o catálogo do pack declara).
 * Ela tinge o feixe de luz da captura, porque no meio da abertura a arte da
 * bola fica branca e a identidade some justo ali.
 *
 * Regerar junto com `assets/icones/bola-captura.png`: as duas saem da mesma
 * medição, e separá-las seria criar duas verdades sobre a mesma cor. */
export const CORES_DA_BOLA = {
  poke: '#f48d3a',
  great: '#3a83c4',
  ultra: '#fcd436',
};
export const corDaBola = id => CORES_DA_BOLA[id] ?? CORES_DA_BOLA.poke;
