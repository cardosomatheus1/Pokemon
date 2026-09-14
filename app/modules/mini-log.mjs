/* O MINI LOG DA ARENA — as últimas linhas da luta, dentro do quadro (R27).
 *
 * Entra a lista de linhas do log, sai a lista curta que a arena mostra. Não
 * toca o DOM e não importa nada: por isso "quais linhas, em que ordem, quantas
 * cabem" é uma pergunta que o teste responde em vez de o olho.
 *
 * ── O PAPEL, E COMO ELE SE SEPARA DO TICKER ────────────────────────────────
 *
 * O `#ticker` (R2) já mostra o log inteiro, rola sozinho e cresce ao clicar.
 * Ele fica FORA da arena, embaixo dela — quem está olhando a luta não o alcança
 * sem tirar o olho do combate.
 *
 *     ticker    o HISTÓRICO — tudo, rolável, fora do quadro
 *     mini log  o AGORA — as últimas, fixas, dentro do quadro
 *
 * Os dois convivem de propósito. Um substituindo o outro perderia metade.
 *
 * ── A RESTRIÇÃO QUE O DONO IMPÔS, E ELA DECIDE O DESENHO ───────────────────
 *
 * "Que não interfira na visualização do combate. No centro da tela atrapalha um
 * pouco."
 *
 * Daí vêm as duas decisões deste arquivo: o TETO baixo de linhas e o filtro do
 * que é combate. Um log sem teto dentro da arena vira o log inteiro dentro da
 * arena — e aí ele cobre a luta, que é exatamente o que foi pedido para não
 * acontecer.
 */

/* TRÊS LINHAS. Acima de quatro ele deixa de ser "mini" e passa a disputar
   espaço com o combate; abaixo de três, uma troca de golpes some antes de ser
   lida. Três é o que cabe na faixa da borda sem entrar no campo de luta. */
export const MINI_MAX = 3;

/* As classes que o log usa para o que NÃO é luta. `l-sys` carrega "aguardando",
   "as pokébolas começam a abrir" e o diagnóstico de sprites — informação de
   sistema, que é do ticker. Aqui ela gastaria uma das três vagas para dizer
   algo que não é combate. */
const FORA = new Set(['l-sys', 'l-backdrop']);

export function ehDeCombate(linha) {
  const cls = String(linha?.cls ?? '');
  for (const f of FORA) if (cls.split(/\s+/).includes(f)) return false;
  return true;
}

/* AS ÚLTIMAS, EM ORDEM CRONOLÓGICA.
   As últimas porque um mini log que mostra o começo da luta é um mini log que
   ninguém precisa. Em ordem porque invertido o olho lê o desfecho antes da
   causa — "Charizard caiu" acima de "Blastoise usou Hidrobomba" conta a
   história de trás para frente. */
export function linhasDoMini(linhas, teto = MINI_MAX) {
  const combate = (linhas || []).filter(ehDeCombate);
  return combate.slice(-teto);
}
