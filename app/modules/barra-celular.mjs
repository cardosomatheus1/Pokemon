/* A BARRA DE ABAS DO CELULAR — camada 0: o que fica na barra, o que vai para o
 * "Mais", e o que o botão "Mais" diz.
 *
 * No celular o menu de dez abas quebrava em três linhas e comia ~200 dos 915 px
 * da tela, em TODA aba — o dono abriu o jogo no telefone e disse "tá feião".
 * A forma que os jogos de celular usam é a barra no rodapé, ao alcance do
 * polegar, com quatro ou cinco destinos e o resto atrás de um "Mais".
 *
 * QUEM FICA NA BARRA é o que se joga, na ordem do menu largo (1.18): os dois
 * modos de arena (Arenas, Liga), o idle (Rotas) e o Time. O resto é consulta
 * ou porta de entrada — Início, Rota OFF, Pokédex, Wiki, Como funciona, Regras
 * — e vai para a folha do "Mais".
 *
 * A DIFERENÇA QUE SE NOMEIA: o "Mais" de um app comum diz só "Mais", e quem
 * está dentro dele perde o "você está aqui". Aqui o botão VESTE o nome da aba
 * aberta ("Pokédex") e acende, então a barra nunca fica sem aba marcada. */

export const ABAS_DA_BARRA = Object.freeze(['viewArena', 'viewLiga', 'viewIdle', 'viewTreino']);
export const ABAS_DO_MAIS = Object.freeze(['viewHome', 'viewRotaOff', 'viewPokedex', 'viewWiki', 'viewHow', 'viewRules']);

/* O botão "Mais" para a vista aberta. `nomes` é o rótulo de cada aba como o
 * menu o escreve (vem do próprio botão, para não haver dois textos). */
export function estadoDoMais(vista, nomes = {}) {
  const dentro = ABAS_DO_MAIS.includes(vista);
  return { on: dentro, rotulo: dentro ? (nomes[vista] || 'Mais') : 'Mais' };
}

/* A folha fecha em toda navegação e em todo toque fora dela — folha aberta por
 * cima da tela nova esconderia justamente o que o jogador pediu para ver. */
export function folhaDepois({ aberta, evento }) {
  if (evento === 'alternar') return !aberta;
  return false;
}
