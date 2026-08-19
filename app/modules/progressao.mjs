/* Progressão de nível — pura, sem DOM e sem dependência.
 *
 * Separada de `perfil.mjs` porque a curva é aritmética e `perfil.mjs` puxa
 * `desafios` → `controles` → `carteira` → `render`, que abre um canvas. O
 * defeito D-006 vivia aqui dentro e não tinha como ser testado sem levantar
 * meia interface — e defeito que exige teatro para ser testado é defeito que
 * não é testado. Mesmo movimento de `sprites-dados.mjs` e `efeitos-dados.mjs`
 * no F0.12: o que é puro sai da frente do que não é.
 */

/* --- D-006 -----------------------------------------------------------------
   `100·N^1,5` fazia o nível 1 começar em 100 XP em vez de 0. Como todo
   treinador novo tem `xp: 0`, o perfil mostrava "NV1 −100/182 XP" com a barra
   NEGATIVA, desde sempre.

   A correção é o piso do primeiro nível, e ela não move ninguém de nível: o
   outro uso de `xpParaNivel` é dentro de `nivelDe`, que sempre chama com
   `n + 1` — o laço começa em `n = 1`, então a função nunca recebe 1 ali.
   Conferido varrendo de 0 a 3.000.000 de XP: zero divergências.

   O denominador do nível 1 sobe de 182 para 282, que é o tamanho real dele. A
   barra passou a ser honesta sobre quanto falta.

   Encontrado pelo trabalho paralelo da v1.0 — ver docs/PORTE_v1.0.md. */
const xpParaNivel = n => (n <= 1 ? 0 : Math.floor(100 * Math.pow(n, 1.5)));

function nivelDe(xp){
  let n = 1;
  while (n < 200 && xp >= xpParaNivel(n + 1)) n++;
  return n;
}

function progressoNivel(xp){
  const n = nivelDe(xp);
  const ini = xpParaNivel(n), fim = xpParaNivel(n + 1);
  return {nivel:n, ini, fim, atual:xp - ini, falta:fim - xp, pct:((xp-ini)/(fim-ini))*100};
}

export { xpParaNivel, nivelDe, progressoNivel };
