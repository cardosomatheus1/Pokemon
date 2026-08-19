/* Tema da plataforma — Hyper Core e Shadow Arena.
 *
 * O que faz o site inteiro virar de cor sem tocar em uma linha de lógica de
 * jogo: **os nomes dos tokens não mudaram, os valores mudaram**. `--gold`
 * continua sendo `--gold` em cerca de setenta referências espalhadas por arena,
 * HUD, killfeed e carteira; hoje ele significa "a cor de acento do tema", e não
 * amarelo. Trocar o valor converte tudo de uma vez; trocar o nome exigiria
 * caçar setenta lugares.
 *
 * `--goldRGB` existe porque uma vintena de regras usa `rgba()` com o acento em
 * opacidade variável, e `rgba()` não aceita uma cor hexadecimal em variável —
 * precisa do trio cru.
 *
 * O TEMA É APLICADO ANTES DA PRIMEIRA PINTURA, num script inline no `<head>`.
 * É a única coisa inline do projeto: em qualquer outro lugar a página piscaria
 * no tema errado por um quadro, e um quadro é o suficiente para parecer
 * defeito. Este módulo cuida da troca em tempo de execução; o `<head>` cuida do
 * primeiro instante.
 */

export const TEMAS = [
  { id:'hyper',  nm:'Hyper Core',   c1:'#00e5ff', c2:'#a06bff', bg:'#070a12' },
  { id:'shadow', nm:'Shadow Arena', c1:'#b57bff', c2:'#ff3ea5', bg:'#08060f' },
];

const PADRAO = 'hyper';
const CHAVE = 'ar_tema';

/* Id desconhecido cai no padrão em vez de deixar o site sem tema. Vale para
   `localStorage` adulterado e para tema removido da lista numa versão nova —
   quem tinha o antigo guardado não fica com a página sem cor. */
export const temaValido = id => (TEMAS.some(t => t.id === id) ? id : PADRAO);

export function temaAtual() {
  try { return temaValido(localStorage.getItem(CHAVE)); } catch { return PADRAO; }
}

export function aplicarTema(id) {
  const t = temaValido(id);
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem(CHAVE, t); } catch { /* modo privado: aplica sem guardar */ }
  return t;
}
