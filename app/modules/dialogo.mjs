/* Diálogos do app — confirmar, pedir texto e avisar, sem `window.confirm`.
 *
 * ── O DEFEITO QUE ESTE MÓDULO EXISTE PARA FECHAR ───────────────────────────
 *
 * Seis ações do jogo estavam atrás de `confirm()`, `prompt()` e `alert()`: sair
 * da conta, resetar o perfil, gastar uma vaga de cosmético shiny, zerar a
 * carteira, e as duas do painel de ADM.
 *
 * `window.confirm` NÃO É GARANTIDO. Em iframe sem `allow-modals`, em navegador
 * embutido, em WebView e em várias automações ele devolve `false` na hora, sem
 * mostrar diálogo nenhum. E `false` é exatamente "o usuário cancelou":
 *
 *     if (!confirm('Sair da conta?')) return;   // volta SEMPRE
 *
 * O botão de sair fica clicável, bonito, e não faz nada. Foi assim que o
 * defeito foi encontrado — por alguém tentando deslogar e não conseguindo.
 *
 * **Todas as seis falham FECHADAS**, e isso é sorte de desenho, não cuidado: o
 * `prompt` do PIN devolve `null`, que não casa com o PIN e nega a entrada. Se
 * alguma tivesse sido escrita como `if (confirm(...)) return;` — negando em vez
 * de confirmando — a mesma ausência abriria a porta em vez de fechá-la.
 *
 * ── POR QUE UM MÓDULO E NÃO SEIS CORREÇÕES ─────────────────────────────────
 *
 * É um defeito só, escrito seis vezes. Corrigir cada chamada no lugar deixaria
 * seis diálogos com aparência própria, e a sétima chamada nasceria em
 * `confirm()` de novo, porque é o que está à mão.
 *
 * É a mesma forma da L-015: o app dependia de `onclick` embutido no HTML, que
 * não enxerga escopo de módulo, e a correção foi um ouvinte delegado — trocar a
 * afordância não garantida por uma que o projeto controla.
 *
 * ── CAMADA 0 ──────────────────────────────────────────────────────────────
 *
 * Só importa `dom.mjs`. Um diálogo que soubesse o que é carteira ou perfil não
 * poderia ser chamado por eles sem fechar ciclo.
 */
import { $ } from './dom.mjs';

/* Reusa o `.modal-backdrop` do CSS que já existe, em vez de estilo próprio:
   diálogo que não veste os dois temas é o defeito S68 entrando pela porta dos
   fundos, e um `<div>` com cor solta aqui não seria pego por nada. */
function montar(html) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-backdrop show';
  fundo.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(fundo);
  return fundo;
}

/* O texto vira nós de TEXTO, nunca HTML.
   Os diálogos recebem nome de criatura e **nome de treinador** — o segundo é
   escolhido pelo jogador. Interpolar isso em `innerHTML` seria injeção pela
   porta de casa, e o §16 é explícito sobre não confiar em entrada de usuário. */
const texto = t => String(t).split('\n').map(l => {
  const p = document.createElement('p');
  p.textContent = l;
  return p.outerHTML;
}).join('');

function fechar(fundo, resolver, valor) {
  document.removeEventListener('keydown', fundo._tecla);
  fundo.remove();
  resolver(valor);
}

/* A tecla existe porque o diálogo nativo tinha Esc e o nosso precisa ter:
   trocar uma afordância garantida por outra não pode custar teclado. */
function ligarTeclado(fundo, aoEscapar) {
  fundo._tecla = ev => { if (ev.key === 'Escape') aoEscapar(); };
  document.addEventListener('keydown', fundo._tecla);
}

/* ── O CORPO ENTRA COMO NÓ, E NUNCA COMO TEXTO (1.24) ────────────────────
 *
 * A confirmação de expedição precisa mostrar QUEM vai, PARA ONDE e POR QUANTO
 * TEMPO — com as sprites. Um diálogo de texto puro é exatamente o que a crítica
 * que chegou de fora chamou de *"site de velho, anos 2000"*.
 *
 * Só que este módulo tem uma garantia que não pode cair: **o texto vira nós de
 * TEXTO, nunca HTML**, porque ele recebe nome de treinador, que o jogador
 * escolhe. Aceitar uma string de marcação aqui abriria a injeção pela porta de
 * casa, e o §16 é explícito sobre não confiar em entrada de usuário.
 *
 *   > Então o corpo entra como **HTMLElement já montado**. Quem chama constrói
 *   > o nó com as próprias mãos; este módulo o ANEXA, e não o interpreta.
 *
 * A garantia fica intacta: continua não existindo caminho de string para
 * marcação nova dentro deste arquivo.
 *
 * ── E O `tom` DÁ O ✓ E O ✗ QUE O DONO PEDIU ─────────────────────────────
 *
 * Palavra dele: *"um botão de CONFIRMAR V (VERDE) E AO LADO UM CANCELAR X
 * (VERMELHO)"*. Duas cores opostas e dois símbolos — a decisão se lê antes da
 * palavra, que é o ponto inteiro de um momento de confirmação. */
export function confirmar(msg, { ok = 'Confirmar', cancelar = 'Cancelar',
                                 perigo = false, corpo = null, tom = null,
                                 titulo = 'Confirmar' } = {}) {
  return new Promise(resolver => {
    const vx = tom === 'vx';
    const fundo = montar(
      `<h2 data-dlg-titulo></h2>
       <div class="dlgTexto">${texto(msg)}</div>
       <div class="dlgCorpo" data-dlg-corpo></div>
       <div class="dlgBotoes${vx ? ' vx' : ''}">
         <button class="tbtn ${vx ? 'dlgNao' : ''}" data-dlg="nao"></button>
         <button class="tbtn ${vx ? 'dlgSim' : (perigo ? 'perigo' : 'gold')}" data-dlg="sim"></button>
       </div>`);
    fundo.querySelector('[data-dlg-titulo]').textContent =
      (perigo ? '⚠ ' : '') + titulo;
    /* `appendChild` de um nó que o CHAMADOR montou — nada de string. */
    if (corpo && typeof corpo === 'object' && corpo.nodeType === 1)
      fundo.querySelector('[data-dlg-corpo]').appendChild(corpo);
    fundo.querySelector('[data-dlg="nao"]').textContent = vx ? '✗ ' + cancelar : cancelar;
    fundo.querySelector('[data-dlg="sim"]').textContent = vx ? '✓ ' + ok : ok;

    const sair = v => fechar(fundo, resolver, v);
    fundo.querySelector('[data-dlg="sim"]').onclick = () => sair(true);
    fundo.querySelector('[data-dlg="nao"]').onclick = () => sair(false);
    /* Clicar fora cancela — nunca confirma. Um clique perdido não pode
       resetar o perfil de ninguém. */
    fundo.onclick = ev => { if (ev.target === fundo) sair(false); };
    ligarTeclado(fundo, () => sair(false));
    fundo.querySelector('[data-dlg="sim"]').focus();
  });
}

/* Entrada de texto. Devolve Promise<string|null> — `null` para cancelar, igual
   ao `prompt`. */
export function pedirTexto(msg, { ok = 'OK', tipo = 'text', placeholder = '' } = {}) {
  return new Promise(resolver => {
    const fundo = montar(
      `<h2 data-dlg="titulo"></h2>
       <input type="${tipo === 'password' ? 'password' : 'text'}" data-dlg="campo">
       <div class="dlgBotoes">
         <button class="tbtn" data-dlg="nao">Cancelar</button>
         <button class="tbtn gold" data-dlg="sim"></button>
       </div>`);
    fundo.querySelector('[data-dlg="titulo"]').textContent = msg;
    fundo.querySelector('[data-dlg="sim"]').textContent = ok;
    const campo = fundo.querySelector('[data-dlg="campo"]');
    campo.placeholder = placeholder;

    const sair = v => fechar(fundo, resolver, v);
    fundo.querySelector('[data-dlg="sim"]').onclick = () => sair(campo.value);
    fundo.querySelector('[data-dlg="nao"]').onclick = () => sair(null);
    fundo.onclick = ev => { if (ev.target === fundo) sair(null); };
    campo.onkeydown = ev => { if (ev.key === 'Enter') sair(campo.value); };
    ligarTeclado(fundo, () => sair(null));
    campo.focus();
  });
}

/* Aviso de uma via. Devolve Promise<void>, e é `await`-ável para que o
   chamador possa esperar antes de seguir — o `alert` bloqueava e havia código
   contando com isso. */
export function avisar(msg, { ok = 'Entendi' } = {}) {
  return new Promise(resolver => {
    const fundo = montar(
      `<h2>Aviso</h2>
       <div class="dlgTexto">${texto(msg)}</div>
       <div class="dlgBotoes"><button class="tbtn gold" data-dlg="sim"></button></div>`);
    fundo.querySelector('[data-dlg="sim"]').textContent = ok;
    const sair = () => fechar(fundo, resolver, undefined);
    fundo.querySelector('[data-dlg="sim"]').onclick = sair;
    fundo.onclick = ev => { if (ev.target === fundo) sair(); };
    ligarTeclado(fundo, sair);
    fundo.querySelector('[data-dlg="sim"]').focus();
  });
}
