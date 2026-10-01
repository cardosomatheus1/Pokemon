/* GERADO por `tools/itens-hd.mjs` (bloco 1.30) — não editar à mão.
 *
 * A cor de cada bola, amostrada do ícone que o jogo usa
 * (`assets/icones/itens.png`, nas casas que o catálogo do pack declara): a
 * mais frequente da metade de cima, sem contorno e sem branco. Antes do 1.30
 * a Poké Ball dava laranja porque o ícone velho era laranja.
 */
export const CORES_DA_BOLA = {
  poke: '#f06d57',
  great: '#268ab7',
  ultra: '#f6d044',
};
export const corDaBola = id => CORES_DA_BOLA[id] ?? CORES_DA_BOLA.poke;
