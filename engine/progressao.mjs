/* Progressão de nível e XP da rodada — pura, sem DOM e sem dependência.
 *
 * Separada de `perfil.mjs` porque a curva é aritmética e `perfil.mjs` puxa
 * `desafios` → `controles` → `carteira` → `render`, que abre um canvas. O
 * defeito D-006 vivia aqui dentro e não tinha como ser testado sem levantar
 * meia interface — e defeito que exige teatro para ser testado é defeito que
 * não é testado. Mesmo movimento de `sprites-dados.mjs` e `efeitos-dados.mjs`
 * no F0.12: o que é puro sai da frente do que não é.
 *
 * ── POR QUE ELE SAIU DE `app/modules/` PARA `engine/` (bloco 0.1) ──────────
 *
 * Porque passou a ter DOIS donos. Ao fechar o D-045, a liquidação no servidor
 * passou a conceder o XP da rodada — e o servidor não pode reimplementar a
 * regra que o cliente usa.
 *
 * É o mesmo princípio que o §7.11 escreve para o comparador de moveset: *o
 * comparador chama a mesma função que a Arena, jamais uma reimplementação.
 * Duas implementações divergem no primeiro ajuste de algoritmo e passam a
 * ensinar coisa errada.* Aqui o custo de divergir é pior que ensinar errado: o
 * jogador veria um XP na tela de resultado e outro no perfil depois de
 * recarregar, e nenhum dos dois estaria obviamente errado.
 *
 * `app/modules/progressao.mjs` continua existindo e reexporta este arquivo, de
 * propósito: os quatro módulos de tela que o importam não precisaram saber que
 * a regra mudou de casa, e nem deveriam.
 *
 * O motor continua agnóstico ao tema — não há identificador da franquia aqui,
 * só aritmética de progressão.
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

/* ══════════════════════════════════════════════════════════════════════════
 * O XP DA RODADA (R22)
 *
 * Estava espalhado dentro de `resultado-tela.mjs`, no meio do desenho do
 * overlay de fim de rodada. Ali ele não podia ser testado sem levantar meia
 * interface — e é a mesma razão que trouxe a curva de nível para este arquivo.
 * Aqui entra o que aconteceu na rodada e sai a lista de parcelas.
 *
 * ── O ABATE, QUE TINHA SUMIDO ──────────────────────────────────────────────
 *
 * O modelo da v1.0 pagava por abate numa curva de retornos decrescentes. A
 * migração para a base nova levou as outras quatro parcelas e deixou esta para
 * trás; ninguém sentiu falta porque a soma continuou subindo — só parou de
 * recompensar o lutador que lutou.
 */

/* A CURVA ORIGINAL, e ela fica aqui como REFERÊNCIA, não como valor em uso.
   Está preservada porque é dela que saem as proporções, e porque um dia
   alguém vai querer conferir de onde veio o número. */
export const XP_ABATE_ANTIGO = [0, 30, 50, 70, 90, 100, 110, 120, 130, 140, 150];
export const XP_VITORIA_ANTIGA = 180;

/* O modelo de hoje. Vive num objeto, e não solto no meio do código, para que
   a curva de abate consiga se derivar dele. */
export const XP_RODADA = {
  disputa:   10,
  vitoria:   25,
  desempenho: 15,   // teto, distribuído pela colocação
  azarao:     5,
  oddAzarao:  4,    // odd a partir da qual conta
  posAzarao:  6,    // e só se terminou até esta posição
};

/* ── POR QUE A CURVA É DERIVADA, E NÃO COPIADA ─────────────────────────────
 *
 * As duas escalas são diferentes: no modelo antigo a vitória valia 180, no
 * atual vale 25. Copiar `[0,30,50,…]` para cá faria UM abate valer mais que a
 * vitória inteira, e o jogo passaria a premiar quem mata em vez de quem aposta
 * certo — que inverteria o que a Arena é.
 *
 * Então o que se copia são as PROPORÇÕES contra a vitória, reaplicadas sobre a
 * vitória de hoje. Mexer em `XP_RODADA.vitoria` amanhã reequilibra a curva
 * sozinho, e é isso que impede a dessincronia que este bloco está consertando.
 *
 * O TETO É O TAMANHO DA LISTA. Sem ele, uma tempestade que zerasse a arena
 * pagaria XP sem limite — e tempestade não é mérito de ninguém. */
export function xpDeAbates(n) {
  const k = Math.min(Math.max(0, Math.floor(n || 0)), XP_ABATE_ANTIGO.length - 1);
  if (k === 0) return 0;
  return Math.round((XP_ABATE_ANTIGO[k] / XP_VITORIA_ANTIGA) * XP_RODADA.vitoria);
}

/* Entra o que aconteceu, sai a lista de parcelas — na ordem em que a tela as
   mostra. Parcela de zero NÃO entra: uma linha dizendo "0 abates: 0 XP" ocupa
   espaço para informar que nada aconteceu. */
export function xpDaRodada({ venceu = false, pos = 12, abates = 0, odd = 0 } = {}) {
  const partes = [{ n: 'Rodada disputada', xp: XP_RODADA.disputa }];
  if (venceu) partes.push({ n: 'Vitória', xp: XP_RODADA.vitoria });

  /* Colocação: quantos dos 12 o lutador sobreviveu. 1º lugar sobrevive a 11. */
  const sobrevividos = Math.max(0, 12 - pos);
  const desemp = Math.round((sobrevividos / 11) * XP_RODADA.desempenho);
  if (desemp > 0) partes.push({ n: `Desempenho (${pos}º lugar)`, xp: desemp });

  const xpAb = xpDeAbates(abates);
  if (xpAb > 0) {
    const k = Math.floor(abates);
    partes.push({ n: `${k} abate${k > 1 ? 's' : ''}`, xp: xpAb });
  }

  /* ODD ALTA E TER IDO LONGE, as duas juntas. Odd alta com eliminação cedo é
     aposta ruim que deu errado, não coragem premiada. */
  if (odd >= XP_RODADA.oddAzarao && pos <= XP_RODADA.posAzarao)
    partes.push({ n: 'Azarão que foi longe', xp: XP_RODADA.azarao });

  return partes;
}

export { xpParaNivel, nivelDe, progressoNivel };
