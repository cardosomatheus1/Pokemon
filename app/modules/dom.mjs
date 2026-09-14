/* Utilidades de DOM. Sem estado, sem dependência — é o único módulo que
   todos podem importar sem criar ciclo. */

/* A decisão de QUAIS linhas cabem no mini log é pura e mora em `mini-log.mjs`.
   Aqui fica só o desenho — ver `espelharMini` mais abaixo. É o único import
   deste módulo, e ele aponta para camada 0 sem estado: não cria ciclo. */
import { linhasDoMini } from './mini-log.mjs';

const $ = s => document.querySelector(s);

/* ── O MESMO PAINEL EM DUAS ABAS (A4e) ────────────────────────────────────
 *
 * A Rota OFF nasceu com os mesmos painéis de Rotas — a rota, o estágio, a
 * equipe, o que está em campo. Havia três saídas, e duas são piores:
 *
 *     DUPLICAR o módulo    duas cópias do mesmo desenho, e elas divergem
 *     MOVER o elemento     funciona para o palco (um só, pesado, com canvas),
 *                          e é frágil para meia dúzia de painéis leves
 *     PINTAR NOS DOIS      o mesmo desenho em todos os alvos que existirem
 *
 * A terceira custa uma varredura a mais por pintura e não muda assinatura
 * nenhuma. E ela tem uma propriedade que as outras não têm: **é impossível as
 * duas abas mostrarem coisas diferentes**, porque é literalmente o mesmo
 * código escrevendo nos dois.
 *
 * A aba escondida não é vista, então pintar nela não custa quadro. */
export const nosDois = base =>
  [...document.querySelectorAll('#idle' + base + ', #off' + base)];

/* E a mesma pergunta, do outro lado: o relógio do farm repinta enquanto UMA
   das duas estiver aberta. Olhar só para ROTAS deixaria a Rota OFF congelada
   num número velho — que é pior que não mostrar número nenhum. */
export const nasAbasDoFarm = () =>
  !!($('#viewIdle')?.classList.contains('on') ||
     $('#viewRotaOff')?.classList.contains('on'));

/* O painel de log é o único elemento que este módulo guarda: `log()` é
   chamada de toda parte, e passar o alvo em cada chamada só empurraria o
   acoplamento para quem chama. */
const logBox = $('#log');

/* ── QUEM ROLA NÃO É O `#log` ──────────────────────────────────────────────
 *
 * Medido com a rodada viva: `#log` tem `scrollHeight 87 === clientHeight 87`,
 * e `#ticker` tem `scrollHeight 95 > clientHeight 54`.
 *
 * O `#log` é `overflow:visible` e `height:auto` — ele CRESCE com o conteúdo,
 * então nunca há para onde rolar. `logBox.scrollTop = ...` é atribuição
 * silenciosamente nula: não lança, não avisa, e o feed fica parado na primeira
 * linha a batalha inteira. Quem rola é a caixa em volta.
 *
 * A busca é por ESTILO e não por tamanho: no primeiro `log()` o conteúdo ainda
 * não transbordou, e `scrollHeight > clientHeight` não acharia ninguém.
 * `overflow` diferente de `visible` já basta — inclusive `hidden`, que é o
 * ticker fechado: ele recusa a roda do mouse mas aceita `scrollTop`, e é isso
 * que mantém as duas linhas à mostra exibindo o golpe mais recente. */
let caixa = null;
function caixaDoLog(){
  if (caixa) return caixa;
  for (let e = logBox; e; e = e.parentElement) {
    const o = getComputedStyle(e).overflowY;
    if (o && o !== 'visible') return (caixa = e);
  }
  return (caixa = logBox);
}

/* Acompanhar não pode atropelar quem subiu para reler. Quem rolou para cima
   está LENDO, e puxá-lo de volta a cada golpe torna o log inútil justamente
   durante a luta, que é quando ele importa. `grudado` desliga ao sair do fim e
   religa ao voltar — e como a rolagem automática pousa exatamente no fim, ela
   mesma reafirma o `grudado` sem precisar de bandeira para se distinguir da
   rolagem do jogador. */
const FOLGA = 4;   // arredondamento de zoom: "quase no fim" é no fim
let grudado = true;
let ouvindo = false;

function acompanhar(){
  const e = caixaDoLog();
  if (!ouvindo) {
    ouvindo = true;
    e.addEventListener('scroll', () => {
      grudado = e.scrollHeight - e.clientHeight - e.scrollTop <= FOLGA;
    }, { passive: true });
  }
  if (grudado) e.scrollTop = e.scrollHeight;
}

/* ── O MINI LOG ESPELHA O LOG (R27) ────────────────────────────────────────
 *
 * Aqui e não em quem chama `log()`: são dezenas de chamadas espalhadas por sete
 * módulos, e cada uma teria que lembrar de alimentar o mini também. Garantia
 * que depende de lembrança é garantia ausente — a mesma razão que põe os
 * cabeçalhos de segurança no ponto de saída, e não em cada rota.
 *
 * A DECISÃO de quais linhas cabem mora em `mini-log.mjs`, puro e testado. Aqui
 * fica só o desenho: ler o que o log tem, perguntar quais entram, escrever.
 *
 * `innerHTML` do log em vez de guardar uma lista à parte: uma segunda lista
 * seria uma segunda verdade, e a que divergisse seria a que ninguém olha. */
function espelharMini(){
  const alvo = $('#miniLog');
  if (!alvo) return;
  const linhas = [...logBox.children].map(d => ({ html: d.innerHTML, cls: d.firstElementChild?.className ?? '' }));
  const curtas = linhasDoMini(linhas);
  alvo.innerHTML = curtas.map(l => `<div>${l.html}</div>`).join('');
  alvo.classList.toggle('tem', curtas.length > 0);
}

function log(html){
  const d = document.createElement('div');
  d.innerHTML = html;
  logBox.appendChild(d);
  while (logBox.children.length > 260) logBox.removeChild(logBox.firstChild);
  acompanhar();
  espelharMini();
}

/* Chamada ao começar rodada nova: sem isso, o mini log carrega os últimos
   golpes da rodada ANTERIOR por cima da arena que está sendo montada. */
function limparMini(){
  const alvo = $('#miniLog');
  if (!alvo) return;
  alvo.innerHTML = '';
  alvo.classList.remove('tem');
}

export {
  $,
  log,
  limparMini,
};
