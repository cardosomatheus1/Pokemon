/* QUEM TOCA A TRANSIÇÃO (bloco 1.21, camada 4).
 *
 * O `evolucao-tela.mjs` diz O QUE a cena é e quanto dura cada fase; este toca.
 * A divisão é a mesma de sempre — a decisão é pura, o traço é fino —, e aqui ela
 * tem uma consequência prática: os TEMPOS são conferíveis em Node, e o que sobra
 * para o navegador é `setTimeout` e trocar classe.
 *
 * ── PULAR É UM CLIQUE, E É O QUE TORNA 5,8 s ACEITÁVEL ───────────────────
 *
 * Na primeira evolução ninguém pula. Na décima, todo mundo pula — e uma
 * animação que não se pode pular vira imposto. O botão fica visível desde o
 * primeiro quadro, e não aparece só no fim.
 *
 * ── E ELA NÃO PODE PERDER A EVOLUÇÃO ─────────────────────────────────────
 *
 * A criatura é gravada ANTES da animação começar. Se a aba fechar no meio, a
 * evolução aconteceu — porque ela aconteceu no jogo, e a tela é só o relato.
 * Gravar no fim seria fazer o resultado depender de o jogador assistir.
 */
import { $ } from './dom.mjs';
import { retratoAnimado, dexImg } from './sprites.mjs';
import { PACK } from './motor.mjs';
import {
  montar, falaDe, MS_ESCURECER, MS_SILHUETA, TROCAS,
  MS_PRIMEIRA_TROCA, RAZAO, MS_ESTOURO, MS_REVELACAO,
} from './evolucao-tela.mjs';

const espDe = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

let tocando = false;
let cancelar = null;
export const estaTocando = () => tocando;

/* `prefers-reduced-motion` pula a alternância inteira e vai direto à revelação.
   Quem pediu menos movimento não pode receber doze trocas piscando. */
const menosMovimento = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

const esperar = ms => new Promise(r => setTimeout(r, ms));

export async function tocar(de, para, aoFim = null) {
  const cx = $('#evoCaixa');
  if (!cx || tocando) return false;
  tocando = true;

  cx.hidden = false;
  cx.innerHTML = montar(de, para);

  /* Os retratos entram AQUI, e não no `montar`: aquele arquivo é puro de
     propósito, e `sprites.mjs` toca `document` na carga. */
  const imgDe = cx.querySelector('.evoDe');
  const imgPara = cx.querySelector('.evoPara');
  const troca = (alvo, dex) => {
    const html = retratoAnimado(espDe(dex), 'class="evoForma"', false);
    const src = /src="([^"]+)"/.exec(html)?.[1];
    if (src) alvo.src = src;
    else alvo.replaceWith(Object.assign(document.createElement('span'), {
      innerHTML: dexImg(dex, espDe(dex).n, 'class="evoForma"'),
    }));
  };
  troca(imgDe, de);
  troca(imgPara, para);

  const texto = cx.querySelector('.evoTexto');
  const cena = cx.querySelector('.evoCena');

  let parado = false;
  cancelar = () => { parado = true; };

  const fase = nome => { if (cena) cena.dataset.fase = nome; };
  const dizer = f => { if (texto) texto.textContent = falaDe(f, de, para); };

  try {
    fase('escurecer');
    await esperar(MS_ESCURECER);
    if (parado) return terminar(cx, aoFim);

    fase('silhueta');
    dizer('silhueta');
    await esperar(MS_SILHUETA);
    if (parado) return terminar(cx, aoFim);

    /* ── A ALTERNÂNCIA, QUE É A ANIMAÇÃO INTEIRA ────────────────────────
       Acelerando por razão geométrica: linear lê como "está travando";
       geométrica lê como "está chegando". */
    fase('trocando');
    if (!menosMovimento()) {
      let passo = MS_PRIMEIRA_TROCA;
      for (let i = 0; i < TROCAS && !parado; i++) {
        if (cena) cena.dataset.forma = i % 2 === 0 ? 'para' : 'de';
        await esperar(passo);
        passo *= RAZAO;
      }
    }
    if (parado) return terminar(cx, aoFim);

    fase('estouro');
    if (cena) cena.dataset.forma = 'para';
    await esperar(MS_ESTOURO);

    fase('revelacao');
    dizer('revelacao');
    await esperar(parado ? 0 : MS_REVELACAO);
  } finally {
    terminar(cx, aoFim);
  }
  return true;
}

function terminar(cx, aoFim) {
  tocando = false;
  cancelar = null;
  if (cx) { cx.hidden = true; cx.innerHTML = ''; }
  if (typeof aoFim === 'function') aoFim();
  return true;
}

let ligado = false;
export function ligarEvolucao() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', ev => {
    if (!tocando) return;
    if (ev.target.closest('[data-evo-pular]')) cancelar?.();
  });
  /* Esc pula também. Mesmo motivo do botão: a décima evolução não pode custar
     seis segundos, e nem todo mundo procura um botão pequeno. */
  document.addEventListener('keydown', ev => {
    if (tocando && ev.key === 'Escape') cancelar?.();
  });
}
