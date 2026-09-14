/* A CAIXA DO LOG — abre, fecha, e cresce.
 *
 * Camada 0: importa o `dom.mjs` e mais nada. Não sabe de rodada, de aposta nem
 * de motor — só do retângulo em que o log aparece.
 *
 * ── POR QUE ISTO SAIU DE UMA LINHA NO `index.html` ─────────────────────────
 *
 * O ticker nasceu assim:
 *
 *     $('#ticker')?.addEventListener('click', () => t.classList.toggle('aberto'));
 *
 * Enquanto a caixa só abria e fechava, aquilo bastava. Com a alça de
 * redimensionamento no canto ele passa a estar errado, e de um jeito que não
 * dá para consertar sem separar: **arrastar a alça termina num `click`**. O
 * jogador puxa a caixa para 400 px, solta, e o ouvinte fecha a caixa que ele
 * acabou de aumentar. Toda tentativa de aumentar o log fecharia o log.
 *
 * A guarda é comparar a altura de antes do `pointerdown` com a de agora: se
 * mudou, houve arrasto e não houve clique. É a única leitura que distingue os
 * dois — a posição do ponteiro não serve, porque a alça mora exatamente sobre
 * o canto que também é área clicável.
 *
 * ── E A ALTURA NÃO PRECISA SER GUARDADA ────────────────────────────────────
 *
 * O `resize` do CSS escreve `height` inline, e inline vence classe. Isso
 * pareceria um problema — a regra de fechado não conseguiria mais encolher a
 * caixa — mas o CSS resolve sozinho: quem fecha é o `max-height` do `#ticker`,
 * e `max-height` vence `height` seja ela inline ou não. Fechada, a caixa
 * encolhe; reaberta, ela volta na altura que o jogador escolheu, sem uma linha
 * de JavaScript para lembrar disso.
 *
 * ── E ELE RECEBE A CAIXA, EM VEZ DE IR BUSCÁ-LA ────────────────────────────
 *
 * `ligarTicker(t)` e não `ligarTicker()` que faz `$('#ticker')`. Assim o
 * módulo não importa nada — não conhece nem o `dom.mjs` nem o id do elemento
 * que dirige, só o comportamento de um retângulo que abre, fecha e cresce.
 */
export function ligarTicker(t){
  if (!t) return;

  /* `null` é "nenhum aperto registrado", e não zero: um `click` sem
     `pointerdown` antes (teclado, ou disparo sintético) tem de contar como
     clique, e comparar com zero o classificaria como arrasto — a caixa nunca
     abriria. Zerar depois de cada clique impede que a altura de uma interação
     antiga decida a próxima. */
  let alturaAoApertar = null;
  t.addEventListener('pointerdown', () => { alturaAoApertar = t.offsetHeight; });

  t.addEventListener('click', () => {
    /* Soltar a alça é um `click`. Se a altura mudou no meio, foi arrasto. */
    const arrastou = alturaAoApertar !== null && t.offsetHeight !== alturaAoApertar;
    alturaAoApertar = null;
    if (arrastou) return;
    /* Marcar texto para copiar também termina em `click`. Fechar a caixa
       embaixo de quem estava selecionando uma linha é apagar o que ele fez. */
    if (String(globalThis.getSelection?.() ?? '')) return;
    t.classList.toggle('aberto');
  });
}
