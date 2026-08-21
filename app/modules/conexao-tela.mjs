/* A TELA DA CONEXÃO (F1.14, §5.9) — a faixa que aparece quando a sala cai.
 *
 * Fronteira: pega o estado da sala, pergunta o texto ao módulo puro, e pinta.
 * Não decide o que dizer — isso é do `conexao-texto.mjs`, que se testa sem
 * navegador.
 *
 * ── FAIXA, E NÃO MODAL ─────────────────────────────────────────────────────
 *
 * A escolha é de produto e vale escrever. Um modal bloqueia a tela, e o jogador
 * que caiu no meio de uma luta ainda quer VER a luta: a animação é local, ela
 * continua rodando, e o resultado já está decidido no servidor. Tapar a arena
 * para avisar que a rede caiu tira dele a única coisa que ainda funciona.
 *
 * A faixa também não rouba o foco nem tem botão. Não há nada que o jogador
 * possa fazer — a sala reconecta sozinha —, e um botão "tentar de novo" que
 * não faz diferença nenhuma é pior que nenhum botão: ele sugere que a espera
 * é culpa de quem não clicou.
 */
import { textoDaConexao } from './conexao-texto.mjs';

const ID = 'conexaoFaixa';

function faixa() {
  let el = document.getElementById(ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = ID;
  el.className = 'conexao-faixa';
  /* `polite` e não `assertive`: o leitor de tela termina a frase em que estava
     antes de anunciar. Interromper alguém no meio da leitura da odd para dizer
     que a rede caiu é a versão sonora do modal. */
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

export function pintarConexao(estado) {
  const t = textoDaConexao(estado);
  const el = faixa();
  el.classList.toggle('on', !!t.visivel);
  el.classList.toggle('tentando', !!t.tentando);
  if (!t.visivel) { el.textContent = ''; return; }
  el.innerHTML = `<b>${t.titulo}</b><span>${t.frase}</span>`;
}
