/* A CAMADA VIVA DO IDLE — o que é elemento e não desenho (camada 4).
 *
 * Separado do idle-mundo.mjs quando ele passou de 600 linhas, e a divisão é
 * por responsabilidade: aquele arquivo decide O QUE aparece na cena; este sabe
 * COMO uma coisa que se anima sozinha vive por cima de um canvas.
 *
 * A regra que justifica os dois existirem separados está escrita abaixo, e é a
 * lição mais cara desta fase: **quem tem animação própria vira elemento; quem eu
 * animo fica no canvas.**
 */
import { $ } from './dom.mjs';

/* ── DE ONDE VEIO ESTA CAMADA ─────────────────────────────────────────────
 *
 * ── O DEFEITO: `drawImage` DE UM GIF DESENHA SEMPRE O PRIMEIRO QUADRO ────
 *
 * Eu jurei que a criatura estava animando e mostrei um número: 2.032 pixels
 * mudavam em 400 ms. O número era verdadeiro e a conclusão era falsa — o que
 * mudava era o TREINADOR andando. Eu nunca isolei o companheiro.
 *
 * O dono viu na tela o que a minha medição não viu, e mandou eu conferir. A
 * medição honesta, com o GIF sozinho num canvas:
 *
 *     solto na memória     0 pixels mudaram em 900 ms
 *     anexado ao documento 0 pixels mudaram em 900 ms
 *
 * `drawImage(gif)` copia o quadro que o elemento está EXIBINDO, e um elemento
 * que o navegador não pinta não avança quadro nenhum. Não há truque de canvas
 * que resolva: a animação de um GIF é um efeito de RENDERIZAÇÃO, não de dado.
 *
 * ── A CORREÇÃO: DEIXAR O NAVEGADOR PINTAR ────────────────────────────────
 *
 * A criatura sai do canvas e vira um `<img>` de verdade, posicionado por cima
 * do mundo. O navegador anima porque é o trabalho dele. Foi assim que a prévia
 * que o dono aprovou funcionava — e eu reescrevi por cima sem olhar.
 *
 * O RECORTE VIRA MOLDURA. Um `<img>` não aceita `sx,sy,sw,sh`, então a caixa do
 * conteúdo (medida uma vez, porque cada GIF tem margem transparente de tamanho
 * diferente) vira um `<span>` com `overflow:hidden` e a imagem deslocada dentro
 * dele. Mesma escala correta, e a animação continua viva.
 *
 * ── O QUE CONTINUA NO CANVAS, E POR QUÊ ──────────────────────────────────
 *
 * O treinador. A folha dele é um PNG de nove quadros que EU fatio — ali o
 * canvas é obrigatório, porque a escolha do quadro é minha. A regra que separa
 * os dois é simples: **quem tem animação própria vira elemento; quem eu animo
 * fica no canvas.**
 */
export const vivos = new Map();          // chave -> { moldura, img, caixa }

export function camadaViva() {
  const palco = $('#idlePalco');
  if (!palco) return null;
  let c = $('#idleVivos');
  if (!c) {
    c = document.createElement('div');
    c.id = 'idleVivos';
    palco.appendChild(c);
  }
  return c;
}

/* Um `<span>` que recorta e um `<img>` que anima dentro dele. */
export function molduraDe(chave, src) {
  /* O CACHE E POR CHAVE **E** POR ARTE, e a segunda metade foi aprendida duas
     vezes com o dono batendo na mesma tecla:

       > "ainda e preciso atualizar o navegador para o pokemon do time trocar,
       >  a troca nao esta simultanea"

     A chave do companheiro e sempre 'comp'. Trocando de Pokemon, o `src` muda
     e a chave nao — e a versao anterior devolvia o elemento em cache sem olhar
     o `src`, com a folha do bicho ANTERIOR dentro. So recarregar a pagina
     resolvia, porque so ai o cache nascia de novo.

     Trocar a arte de um elemento que ja existe e melhor que criar outro: o
     elemento guarda posicao e z-index, e recria-lo faria a cena piscar a cada
     clique no seletor. */
  if (vivos.has(chave)) {
    const v = vivos.get(chave);
    if (v.src !== src) {
      v.src = src;
      v.folha = null;              // a folha nova pode ter outro tamanho
      v.img.src = src;
    }
    return v;
  }
  const camada = camadaViva();
  if (!camada) return null;
  const moldura = document.createElement('span');
  moldura.className = 'vivo';
  const img = document.createElement('img');
  img.alt = '';
  img.onload = () => {
    const v = vivos.get(chave);
    if (!v) return;
    /* O TAMANHO DO QUADRO SAI DA FOLHA: 4 colunas de passo, 8 linhas de
       direcao. Sem tabela escrita a mao, entao folha nova de outro tamanho
       entra sozinha. */
    v.folha = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  };
  img.src = src;
  moldura.appendChild(img);
  camada.appendChild(moldura);
  const v = { moldura, img, folha: null, src };
  vivos.set(chave, v);
  return v;
}

/* A CAIXA DO CONTEÚDO, medida uma vez.
 *
 * O GIF vem com moldura transparente de tamanho diferente em cada espécie: um
 * Onix e um Diglett ocupam frações muito diferentes do mesmo arquivo. Escalar
 * pela moldura daria um Diglett gigante e um Onix miúdo. */
export function caixaDe(im) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  try {
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  } catch { /* canvas manchado: cai na moldura inteira */ }
  if (x1 < 0) return { sx: 0, sy: 0, sw: w, sh: h, w, h };
  return { sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1, w, h };
}

/* Posiciona um vivo em coordenadas de MUNDO. `escala` é quantos pixels de tela
   vale um pixel de mundo — sai do zoom, e é o que mantém a criatura do mesmo
   tamanho relativo ao treinador em qualquer aproximação. */
export function porVivo(v, { x, y, alturaMundo, escala, camX, camY, espelhar }) {
  if (!v || !v.caixa) return;
  const { sx, sy, sw, sh, w, h } = v.caixa;
  const A = alturaMundo * escala;
  const L = (sw / sh) * A;
  const k = A / sh;                       // fator do arquivo para a tela
  v.moldura.style.width = L + 'px';
  v.moldura.style.height = A + 'px';
  v.moldura.style.transform =
    `translate(${(x - camX) * escala - L / 2}px, ${(y - camY) * escala - A}px)` +
    (espelhar ? ' scaleX(-1)' : '');
  v.img.style.width = (w * k) + 'px';
  v.img.style.height = (h * k) + 'px';
  v.img.style.marginLeft = (-sx * k) + 'px';
  v.img.style.marginTop = (-sy * k) + 'px';
}


/* ── O DESENHO DA ARENA, TRAZIDO PARA A CENA (1.27) ───────────────────────
 *
 * Cobrança do dono, três vezes, e na terceira com a palavra certa:
 *
 *   > "as sprites estão ficando quebradas [...] na arena SAEM TODOS OS
 *   >  SPRITES, É SÓ VOCÊ COPIAR E TRAZER PRA CÁ"
 *
 * Ele estava certo, e o que faltava copiar não eram as constantes: era a
 * TÉCNICA. `molduraDe` acima usa um `<img>` e mede `naturalWidth` no `onload`
 * — e isso funciona enquanto a folha nunca muda. Quando o A4g fez a folha
 * trocar a cada golpe, cada troca zerava a medida e esperava o carregamento: o
 * mob SUMIA ou saía CORTADO no meio do ataque.
 *
 *   > Uma técnica que só funciona enquanto nada muda não é uma técnica: é uma
 *   > coincidência que ainda não foi cobrada.
 *
 * A arena nunca teve esse problema porque ela nunca mede nada: é um elemento
 * com `background-image`, `background-size` em % e `background-position` em %.
 * Trocar de folha é trocar uma string. O número de quadros vem da TABELA do
 * PMD, que está em memória desde o boot.
 *
 * Este `fundoDe` é a mesma coisa, para a cena do Avanço. O `molduraDe` fica
 * onde está: ele serve o COMPANHEIRO e a fauna, que usam GIF — e GIF precisa
 * ser `<img>` para o navegador animar (é a lição longa no topo deste arquivo).
 */
export const fundos = new Map();          // chave -> { el, folha }

export function fundoDe(chave) {
  const existe = fundos.get(chave);
  if (existe) return existe;
  const camada = camadaViva();
  if (!camada) return null;
  const el = document.createElement('span');
  el.className = 'vivo fundoPMD';
  camada.appendChild(el);
  const v = { el, folha: null };
  fundos.set(chave, v);
  return v;
}

/* Troca a folha SEM medir nada. Guardar o caminho evita reescrever a mesma
   string sessenta vezes por segundo — o navegador não repinta à toa, mas o
   estilo inline reatribuído invalida o layout de qualquer forma. */
export function usarFolha(v, url, colunas, linhas) {
  if (!v) return;
  if (v.folha !== url) {
    v.folha = url;
    v.el.style.backgroundImage = `url(${url})`;
  }
  v.el.style.backgroundSize = (colunas * 100) + '% ' + (linhas * 100) + '%';
}

export function quadroDaFolha(v, quadro, linha, colunas, linhas) {
  if (!v) return;
  /* Em PORCENTAGEM, como a arena: a posição de fundo em % é relativa ao espaço
     que sobra, então `quadro/(colunas-1)` cai exatamente no quadro certo em
     qualquer tamanho de elemento. Em pixel, ela dependeria da escala do zoom —
     e o zoom aqui é do jogador. */
  v.el.style.backgroundPosition =
    (colunas > 1 ? (quadro / (colunas - 1)) * 100 : 0) + '% ' +
    (linhas > 1 ? (linha / (linhas - 1)) * 100 : 0) + '%';
}

export function limparFundos(vale) {
  for (const [k, v] of fundos) {
    if (vale(k)) continue;
    v.el.remove();
    fundos.delete(k);
  }
}


/* ── A SONDA DA FOLHA (D-091) ─────────────────────────────────────────────
 *
 * A única parte da escolha de folha que precisa de navegador: pedir a imagem e
 * ver se ela veio. Não decide nada — só responde, e quem decide é o
 * `folha-viva.mjs`, que é camada 0 e por isso pode ser afirmado sem Chromium.
 *
 * O `background-image` de um `<span>` não avisa quando falha: o elemento fica
 * lá, do tamanho certo, transparente. Foi assim que setenta espécies sumiram no
 * meio do golpe por três dias sem nenhum erro no console.
 *
 *   > Falha silenciosa não é falha rara: é falha que ninguém conta.
 *
 * Um `Image()` do lado, com o MESMO endereço, transforma o silêncio em
 * veredito. O navegador serve as duas do mesmo cache, então a sonda não custa
 * um segundo download. */
const sondadas = new Set();

export function sondarFolha(url, avisar) {
  if (!url || sondadas.has(url)) return;
  sondadas.add(url);
  if (typeof Image === 'undefined') return;
  const img = new Image();
  img.onload  = () => avisar(url, true);
  img.onerror = () => avisar(url, false);
  img.src = url;
}
