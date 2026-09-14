/* ONDE CADA ESPÉCIE VIVE, E QUÃO RARA ELA É (bloco 1.1, §7.13 e §7.17).
 *
 * Fronteira: entra um pack, sai a resposta de "quem aparece neste lugar". Puro,
 * sem DOM, sem estado e sem tema — os nomes dos biomas e a regra de quais tipos
 * moram em cada um vêm do pack, como manda o §0.3.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **O bioma é DERIVADO do tipo, e não escrito espécie a espécie.**
 *
 * Escrever à mão daria 151 linhas de dado morto, que desatualizam no dia em que
 * alguém corrigir um tipo e esquecer o bioma — e que teriam de ser escritas de
 * novo, inteiras, quando a Gen 2 chegar. Derivando, acrescentar cem espécies é
 * acrescentar cem espécies: o mapa de bioma já vale para elas.
 *
 * É o mesmo princípio do §7.11 sobre o comparador de moveset — *chamar a mesma
 * função, jamais uma reimplementação* — aplicado a dado em vez de a código: uma
 * fonte para "de que tipo é", e o resto sai dela.
 *
 * E é isto que faz a fidelidade que o dono do projeto pediu ser automática:
 *
 *   > Uma criatura de gelo não aparece dentro de uma caverna de fogo.
 *
 * Não porque alguém lembrou de não pôr, mas porque não há como pôr.
 *
 * ── A RARIDADE SAI DA FORÇA, E ISSO TAMBÉM É DECISÃO ──────────────────────
 *
 * A soma dos stats base separa quem é comum de quem é raro melhor que qualquer
 * lista escrita à mão, e pelo motivo certo: no material de origem, a criatura
 * mais forte É a mais rara. Derivar mantém as duas coisas coerentes para sempre.
 *
 * As faixas vêm do PACK, não daqui — outro tema pode ter outra escala de força.
 */

/* Quem vive num bioma: quem tem PELO MENOS UM tipo da lista dele.
 *
 * Pelo menos um, e não todos, porque tipo duplo é a regra e não a exceção. Um
 * Gyarados é água e voador; exigir os dois o deixaria de fora da praia, que é
 * exatamente onde ele deveria estar. */
export const moraEm = (e, tipos) => tipos.has((e.t ?? [])[0]) || (e.t ?? []).filter(t => tipos.has(t)).length >= 2;

export const especiesDoBioma = (pack, biomaId) => {
  const b = (pack.biomas ?? []).find(x => x.id === biomaId);
  if (!b) return [];
  const tipos = new Set(b.tipos);
  return (pack.especies ?? []).filter(e => moraEm(e, tipos));
};

/* Em que biomas uma espécie aparece. Pode ser mais de um — e deve: um Pidgeot
   voa sobre a praia e sobre o campo, e prendê-lo a um lugar só empobreceria os
   dois. */
export const biomasDaEspecie = (pack, dex) => {
  const e = (pack.especies ?? []).find(x => x.dex === dex);
  if (!e) return [];
  return (pack.biomas ?? [])
    .filter(b => moraEm(e, new Set(b.tipos)))
    .map(b => b.id);
};

/* A força bruta de uma espécie: a soma dos stats base. É o número que o material
   de origem usa para separar quem é comum de quem é lendário. */
export const forcaDe = e => (e.s ?? []).reduce((a, b) => a + b, 0);

/* A raridade, pelas faixas que o PACK declara.
 *
 * As faixas vêm de fora porque escala de força é característica do tema: um
 * pack com criaturas mais fracas teria as mesmas cinco raridades em números
 * completamente diferentes, e o motor não pode ter opinião sobre isso.
 *
 * Devolve a PRIMEIRA faixa cujo teto a espécie não ultrapassa; a última faixa é
 * o resto. Uma espécie sem stats cai na mais comum — e isso é decisão: dado
 * incompleto não pode virar item raro por acidente, porque item raro por
 * acidente vira preço alto por acidente. */
export function raridadeDe(pack, especie) {
  const faixas = pack.raridade ?? [];
  if (!faixas.length) return null;
  const f = forcaDe(especie);
  for (const [id, teto] of faixas) if (f <= teto) return id;
  return faixas[faixas.length - 1][0];
}

/* O elenco de um bioma já ordenado por raridade — o que o sorteio de encontro
   do bloco 1.2 vai consumir. */
export function elencoDoBioma(pack, biomaId) {
  return especiesDoBioma(pack, biomaId)
    .map(e => ({ dex: e.dex, raridade: raridadeDe(pack, e), forca: forcaDe(e) }))
    .sort((a, b) => a.forca - b.forca);
}
