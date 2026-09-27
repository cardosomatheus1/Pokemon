/* A ESPÉCIE DE UM DEX, para a LUTA (ST-10.18 · L-057).
 *
 * Os lendários moram numa lista à parte (`pack.lendarios`) e nunca na de
 * espécies: tudo que itera espécie — bioma, coleção, shiny, loja, elenco —
 * segue sem vê-los, e não há como virarem captura comum por acidente. Só a
 * luta de treino (o chefe da campanha) precisa conhecê-los, e ela pergunta
 * por aqui. */
export const especieDe = (pack, dex) =>
  (pack?.especies ?? []).find(e => e.dex === Number(dex)) ?? (pack?.lendarios ?? []).find(e => e.dex === Number(dex)) ?? null;
