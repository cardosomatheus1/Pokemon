/* A CENA DA CAPTURA — quem toca a linha do tempo (bloco 1.23, camada 4).
 *
 * A DECISÃO é pura e mora em `captura-tela.mjs`: fases, durações, qual casa da
 * tira, o texto do laudo. Aqui só se desenha e se espera. É a mesma divisão da
 * transição de evolução, e ela existe porque a parte que se pode errar em
 * silêncio — a ordem, a duração, o vazamento do resultado — é a que precisa de
 * teste sem navegador.
 *
 * ── A CAPTURA É GRAVADA ANTES DA ANIMAÇÃO ────────────────────────────────
 *
 * Como na evolução, e pela mesma razão: **o que aconteceu no jogo aconteceu**.
 * Quem fechar a aba no meio da animação não perde a criatura, porque a tela é o
 * relato e não o fato. Gravar no fim faria o resultado depender de o jogador
 * assistir.
 *
 * Esta cena, então, nunca decide nada. Ela recebe o resultado pronto de
 * `lancarBola` e o encena.
 *
 * ── E O LAUDO ESPERA ─────────────────────────────────────────────────────
 *
 * Pedido literal do dono, e é a metade que conserta a queixa dele: a mensagem
 * antiga aparecia embaixo do botão de mandar expedição e sumia em quatro
 * segundos. O laudo fica de pé até alguém fechá-lo, porque **é ele que carrega
 * a informação** — a animação carrega o momento.
 *
 * Por isso o "pular" pula a ANIMAÇÃO e não o laudo: quem já viu vinte capturas
 * quer o resultado, não quer perdê-lo.
 */
import { $ } from './dom.mjs';
import { PACK } from './motor.mjs';
import { sfx } from './audio.mjs';
import { retratoAnimado, dexImg } from './sprites.mjs';
import {
  fases, casaEm, montar, laudo, laudoHtml, falaDe, msTotal, MS_VEREDITO,
} from './captura-tela.mjs';

const espDe = dex => (PACK.especies ?? []).find(e => e.dex === dex) ?? { n: '?', dex };

let tocando = false;
let cancelar = null;
export const estaTocando = () => tocando;

/* ── "MENOS MOVIMENTO" NÃO É "SEM CENA" — D-076 ──────────────────────────
 *
 * A primeira versão PULAVA a animação inteira e ia direto ao laudo. O dono viu,
 * e as três queixas dele são a mesma coisa:
 *
 *   > "ao capturar ou fugir não acontece mais a animação"
 *   > "não existe mais animação de abertura da ball"
 *   > "quando ganhar não tem muita diferença, ambas parecem a mesma coisa"
 *
 * A terceira é consequência das duas primeiras: sem a cena, o que resta é o
 * laudo — e dois laudos diferem só na cor e na frase.
 *
 * E havia um defeito real dentro disso: **o quadro final não era nem posto**. A
 * bola ficava na casa 0 (fechada) mesmo numa FUGA, que termina com ela aberta.
 * A captura do dono mostra exatamente isso: bola fechada, criatura em cima,
 * laudo de escapou.
 *
 * ── A DISTINÇÃO QUE EU NÃO FIZ ──────────────────────────────────────────
 *
 *     MOVIMENTO   sacudir, voar, pulsar, tremer a tela — isso incomoda quem
 *                 pediu menos movimento, e some
 *     QUADRO      a bola abrir e fechar é INFORMAÇÃO desenhada, e não
 *                 movimento decorativo. Ela fica.
 *
 *   > `prefers-reduced-motion` pede menos MOVIMENTO. Apagar o acontecimento
 *   > inteiro é responder outra pergunta — e deixa o jogador sem saber o que
 *   > houve.
 *
 * Agora a cena SEMPRE toca. O que o modo reduzido faz é encurtar as esperas e
 * desligar as transformações; a troca de quadro continua, e o final continua
 * sendo visivelmente diferente.
 *
 * ── E O JOGADOR PODE MANDAR ─────────────────────────────────────────────
 *
 * Pedido do dono: *"quero opção com animação"*. `pa.anim` no depósito vence o
 * sistema nos dois sentidos — quem tem "reduzir animações" ligado no Windows
 * sem querer não fica sem a cena, e quem quer menos continua podendo. */
const CHAVE_ANIM = 'pa.anim';

export function animacaoCheia() {
  try {
    const v = globalThis.localStorage?.getItem(CHAVE_ANIM);
    if (v === 'cheia') return true;
    if (v === 'curta') return false;
  } catch { /* modo privado */ }
  return !(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
}

export function usarAnimacao(modo) {
  try { globalThis.localStorage?.setItem(CHAVE_ANIM, modo === 'cheia' ? 'cheia' : 'curta'); }
  catch { /* modo privado */ }
}

/* O modo curto encurta, e não apaga: a razão está na nota acima. */
export const FATOR_CURTO = 0.34;

const esperar = ms => new Promise(r => setTimeout(r, ms));

export async function tocar(res, aoFim = null) {
  const cx = $('#capCaixa');
  if (!cx || tocando) return false;
  tocando = true;

  const dex = Number(res?.dex);
  const nome = res?.nome ?? espDe(dex).n;
  cx.hidden = false;
  cx.innerHTML = montar(dex, res?.bola);
  /* O FINAL É MARCADO NO PALCO, e o CSS pinta a onda e o retorno a partir dele.
     Ele entra AQUI e não em `montar`: a linha do tempo é pura e não deve saber
     o resultado antes da hora — marcá-lo no HTML seria o vazamento que o teste
     do `casaEm` existe para impedir, chegando por outra porta. Aqui ele é só um
     atributo, e nenhuma regra de fase o lê. */
  cx.querySelector('.capCena')?.setAttribute('data-fim', res?.capturou ? 'pegou' : 'fugiu');

  /* O retrato entra AQUI, e não no `montar`: aquele arquivo é puro de
     propósito, e `sprites.mjs` toca `document` na carga. */
  const alvo = cx.querySelector('.capAlvo');
  if (alvo) {
    const html = retratoAnimado(espDe(dex), 'class="capForma"', false);
    const src = /src="([^"]+)"/.exec(html)?.[1];
    if (src) alvo.src = src;
    else alvo.replaceWith(Object.assign(document.createElement('span'), {
      innerHTML: dexImg(dex, espDe(dex).n, 'class="capForma"'),
    }));
  }

  const cena = cx.querySelector('.capCena');
  const fala = cx.querySelector('.capFala');
  let parado = false;
  cancelar = () => { parado = true; };

  /* ── O SOM DO RESULTADO TEM UMA BOCA SÓ ────────────────────────────────
   *
   * Três caminhos chegam ao veredito: a animação inteira, o "pular", e quem
   * pediu menos movimento. A primeira versão escreveu `sfx(...)` nos três, e
   * o Q2 mostrou o preço: apagar UM deles não reprovava nada, porque os outros
   * dois continuavam soando nos testes que existiam.
   *
   *   > Três cópias da mesma decisão são três lugares onde ela pode divergir,
   *   > e apenas um deles costuma ter teste.
   *
   * A trava de "uma vez só" é do próprio momento, e não defensiva: pular
   * durante o veredito não pode tocar o som duas vezes.
   *
   * O modo de menos movimento é sobre MOVIMENTO, e som não se move — emudecer
   * junto seria tirar informação de quem já abriu mão do espetáculo. */
  let jaSoou = false;
  const soarVeredito = () => {
    if (jaSoou) return;
    jaSoou = true;
    sfx(res?.capturou ? 'capturou' : 'fugiu');
  };

  /* ── O VEREDITO INTEIRO TEM UMA BOCA SÓ ────────────────────────────────
   *
   * Fase, grupo, quadro e som — as quatro coisas juntas, num lugar. Elas
   * estavam em dois, e o Q2 pegou: apagar um não reprovava nada.
   *
   * O QUADRO é a parte que o dono viu faltar. A bola ficava na casa 0, fechada,
   * mesmo numa FUGA — que termina com ela aberta. */
  const porVeredito = () => {
    if (!cena) return;
    cena.dataset.fase = 'veredito';
    cena.dataset.grupo = 'veredito';
    cena.style.setProperty('--casa',
      String(casaEm(msTotal(), { pegou: !!res?.capturou })));
    soarVeredito();
  };

  try {
    {
      /* ── A CENA SEMPRE TOCA (D-076) ────────────────────────────────────
         Ela ficava atrás de um `if (!menosMovimento())` e era PULADA inteira —
         o dono via bola fechada, criatura em cima e o laudo, sem nada
         acontecer. Ver a nota longa em `animacaoCheia`.

         O modo curto ENCURTA: o relógio anda mais rápido e o CSS desliga as
         transformações. A troca de quadro fica, porque ela é informação. */
      const veloz = animacaoCheia() ? 1 : FATOR_CURTO;
      if (cena) cena.dataset.anim = animacaoCheia() ? 'cheia' : 'curta';
      /* ── UM RELÓGIO SÓ, E A CASA SAI DELE ──────────────────────────────
         A primeira ideia era um `setTimeout` por fase. Ela produz duas verdades
         sobre "que horas são" — a soma dos atrasos e o relógio real — e elas
         divergem sob carga, que é justamente quando a aba do idle está aberta
         há horas com um filme do lado.

         Aqui o laço lê o relógio e PERGUNTA à linha do tempo em que fase e em
         que casa ele está. Atrasar um quadro atrasa o desenho, e não a
         história. */
      const t0 = Date.now();
      const lista = fases();
      let ultima = '';
      while (!parado) {
        /* O relógio é DIVIDIDO pelo fator: no modo curto o tempo passa mais
           depressa e a mesma história cabe em um terço. Nada é pulado. */
        const t = (Date.now() - t0) / veloz;
        if (t >= msTotal()) break;
        const f = lista.find(x => t >= x.de && t < x.ate) ?? lista.at(-1);
        if (cena) {
          cena.style.setProperty('--casa', String(casaEm(t, { pegou: !!res?.capturou })));
          if (f.nome !== ultima) {
            /* ── O SOM MARCA O TEMPO, E É ELE QUE FAZ A TENSÃO SER OUVIDA ───
               Pedido do dono: *"poderiam ter sons marcando quando fugir similar
               um som frustrante e ao capturar som similar ou igual realmente
               quando se captura"*.

               O balanço é o que faltava: sem som, três balanços são mímica. A
               pausa entre eles é o suspense, e uma pausa sem som antes e depois
               é apenas ausência. */
            if (f.nome.startsWith('balanco')) sfx('balanco');
            else if (f.nome === 'veredito') soarVeredito();
            cena.dataset.fase = f.nome;
            /* O grupo da fase serve ao CSS: `balanco2` e `balanco3` querem o
               mesmo tratamento, e escrever três regras iguais é como uma delas
               fica para trás numa mudança. */
            cena.dataset.grupo = f.nome.replace(/\d+$/, '');
            if (fala) fala.textContent = falaDe(f.nome, nome);
            ultima = f.nome;
          }
        }
        await esperar(16);
      }
      /* O VEREDITO precisa ser VISTO mesmo quando se pula. Pular a espera dele
         faria a bola travar e o laudo aparecer no mesmo quadro, e o jogador não
         veria a bola travar nunca. */
      if (parado) { porVeredito(); await esperar(Math.round(MS_VEREDITO / 2)); }
    }

    /* O VEREDITO É GARANTIDO, e ele tem UMA boca — como o som. Ver `porVeredito`.

       Estava escrito em DOIS lugares (aqui e no ramo do "pular"), e o Q2 mostrou
       o preço na hora: apagar um não reprovava nada, porque o outro punha o
       quadro do mesmo jeito.

         > Três cópias da mesma decisão são três lugares onde ela pode divergir,
         > e apenas um deles costuma ter teste.

       É a MESMA lição que eu escrevi ontem sobre o som do veredito, e que
       reescrevi errado hoje ao consertar o D-076. */
    porVeredito();

    /* ── O LAUDO, QUE FICA ────────────────────────────────────────────── */
    const l = laudo({
      pegou: !!res?.capturou, nome,
      chance: Number.isFinite(res?.chance) ? res.chance : null,
      foiParaCaixa: !!res?.foiParaCaixa, bola: res?.bola ?? null,
    });
    if (cena) {
      cena.dataset.fase = 'laudo';
      cena.dataset.grupo = 'laudo';
      cena.insertAdjacentHTML('beforeend', laudoHtml(l));
      cena.querySelector('.capOk')?.focus?.();
    }
    await new Promise(pronto => { fechar = pronto; });
  } finally {
    terminar(cx, aoFim);
  }
  return true;
}

/* A promessa que o botão do laudo resolve. Fora da função porque o ouvinte é
   ligado uma vez só e precisa alcançá-la. */
let fechar = null;

function terminar(cx, aoFim) {
  tocando = false;
  cancelar = null;
  fechar = null;
  if (cx) { cx.hidden = true; cx.innerHTML = ''; }
  if (typeof aoFim === 'function') aoFim();
  return true;
}

let ligado = false;
export function ligarCaptura() {
  if (ligado) return;
  ligado = true;
  document.addEventListener('click', ev => {
    if (!tocando) return;
    if (ev.target.closest('[data-cap-fechar]')) { fechar?.(); return; }
    if (ev.target.closest('[data-cap-pular]')) cancelar?.();
  });
  /* Esc faz as duas coisas, na ordem certa: primeiro pula a animação, e depois
     fecha o laudo. Um Esc que fechasse tudo de uma vez engoliria o resultado
     de quem só queria acelerar. */
  document.addEventListener('keydown', ev => {
    if (!tocando || ev.key !== 'Escape') return;
    if (fechar) fechar(); else cancelar?.();
  });
}
