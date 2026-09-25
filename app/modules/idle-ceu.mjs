/* O CÉU DO IDLE — a janela do céu e a luz da hora (camada 3).
 *
 * Ele SÓ PINTA. Quem decide que período é, a cor do céu, onde está o astro,
 * quantas estrelas acendem e quanto a luz do cenário atravessa a noite é o
 * `hora-do-dia.mjs`, em camada 0 e testado em Node. Regra de CUSTO do
 * `CLAUDE.md`: mutante de navegador ~30 s, de Node ~0,1 s.
 *
 * ── O PEDIDO (L-124) ─────────────────────────────────────────────────────
 *
 *     DIA      sol num canto, tela mais clara
 *     TARDE    alaranjado, sol se pondo
 *     NOITE    estrelas, lua NO LADO OPOSTO de onde o sol nasceu
 *
 * ── A PRIMEIRA TENTATIVA FOI REPROVADA OLHANDO, E ESTA É A SEGUNDA ───────
 *
 * A primeira espalhava estrelas pelo campo e soltava um disco de luz no meio
 * dele. Suíte verde, relatório certo — e a foto mostrava poeira na grama e um
 * borrão branco sobre um sprite.
 *
 *   > **Um mundo top-down não tem céu.** Estrela sobre a grama é sujeira na
 *   > tela, e astro solto no campo é adesivo luminoso.
 *
 * Então o céu ganhou um LUGAR: uma janela no canto do palco — *"sol num
 * canto"*, que é literalmente o que o dono escreveu. Dentro dela o astro
 * percorre o arco, nasce e se põe atrás do horizonte, e as estrelas acendem
 * onde estrela faz sentido.
 *
 * ── O DETALHE QUE NINGUÉM PEDIU, E QUE A JANELA PRECISAVA ────────────────
 *
 * Um HORIZONTE: uma linha de morros escuros na base da janela, na cor mais
 * funda do bioma. Sem ele a janela é um retângulo mudando de cor; com ele é um
 * céu, e o sol NASCE de trás de alguma coisa em vez de aparecer. É o §atenção
 * especial, item 2.
 *
 * ── O TEMA ───────────────────────────────────────────────────────────────
 *
 * Dentro da janela é GBA — pixel grande, astro em disco serrilhado de cartucho,
 * estrela de um pixel. A MOLDURA é neon, no CSS. Cada metade escolhe um dos
 * dois de propósito.
 */
import { astroEm, ceuEm, estrelasNaJanela, periodoEm, luzRestanteEm } from './hora-do-dia.mjs';

/* A janela é pintada em resolução de cartucho e esticada pelo CSS com
   `image-rendering: pixelated`. Um pixel aqui vale dois ou três na tela, que é
   o tamanho do pixel do mundo ao redor — sem isso a janela seria a única coisa
   nítida demais no palco. */
export const JANELA_W = 40, JANELA_H = 24;

/* Os morros do horizonte, em altura por coluna. Fixos: o mesmo horizonte em
   toda captura, e o céu não treme. */
const MORROS = Array.from({ length: JANELA_W }, (_, x) =>
  Math.round(3 + 1.6 * Math.sin(x * 0.38) + 1.1 * Math.sin(x * 0.91 + 1.3)));

/* Estrelas em posições fixas, na parte de cima da janela, espalhadas por duas
   progressões irracionais — sem grade visível e sem repetir. */
function estrelaDaJanela(i) {
  return { x: Math.floor(((i * 0.6180339887) % 1) * JANELA_W),
           y: Math.floor(((i * 0.4142135624) % 1) * (JANELA_H - 9)) };
}

const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

/* ── A JANELA ─────────────────────────────────────────────────────────────
 * Devolve o que pintou, para a esteira poder conferir que SAIU pixel. */
export function pintarJanelaDoCeu(cv, agora, corHorizonte = '#0d1a14') {
  if (!cv) return null;
  if (cv.width !== JANELA_W) cv.width = JANELA_W;
  if (cv.height !== JANELA_H) cv.height = JANELA_H;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  /* O céu, em faixas de um pixel — gradiente de cartucho, sem dithering
     antisserrado que denunciaria o navegador. */
  const { topo, base } = ceuEm(agora);
  for (let y = 0; y < JANELA_H; y++) {
    const t = y / (JANELA_H - 1);
    g.fillStyle = rgb(topo.map((c, i) => Math.round(c + (base[i] - c) * t)));
    g.fillRect(0, y, JANELA_W, 1);
  }

  /* As estrelas, antes do astro e do horizonte: elas estão mais longe. */
  const quantas = estrelasNaJanela(agora);
  for (let i = 1; i <= quantas; i++) {
    const { x, y } = estrelaDaJanela(i);
    const f = 0.45 + ((i * 0.7548776662) % 1) * 0.55;
    g.fillStyle = `rgba(230,240,255,${f.toFixed(2)})`;
    g.fillRect(x, y, 1, 1);
  }

  /* O astro. `x` e `y` da camada 0 são frações; aqui eles viram pixels da
     janela, com o y apoiado no horizonte — nas pontas do arco o astro fica
     ATRÁS dos morros, que é o que faz nascer e pôr parecerem nascer e pôr. */
  const a = astroEm(agora);
  const cx = Math.round(2 + a.x * (JANELA_W - 4));
  const cy = Math.round(a.y * (JANELA_H - 2));
  const sol = a.qual === 'sol';
  const r = 3;
  /* Halo de dois anéis serrilhados — pixel, e não gradiente. */
  g.fillStyle = sol ? `rgba(255,200,110,${(0.28 * a.brilho).toFixed(2)})`
                    : `rgba(170,200,255,${(0.22 * a.brilho).toFixed(2)})`;
  disco(g, cx, cy, r + 2);
  g.fillStyle = sol ? '#fff1b8' : '#e6eeff';
  disco(g, cx, cy, r);
  /* A LUA GANHA A MORDIDA DA FASE. Disco liso é sol; disco mordido é lua. Sem
     isto os dois são a mesma bola trocando de cor, e o jogador lê "ficou azul"
     em vez de "é noite". A mordida é pintada com a cor do céu naquela altura,
     e não apagada: apagar deixaria um buraco transparente mostrando o palco. */
  if (!sol) {
    const t = Math.min(1, Math.max(0, cy / (JANELA_H - 1)));
    g.fillStyle = rgb(topo.map((c, i) => Math.round(c + (base[i] - c) * t)));
    disco(g, cx + 2, cy - 1, r - 0.5);
  }

  /* O horizonte por cima de tudo: é ele que esconde o astro nas pontas. */
  g.fillStyle = corHorizonte;
  for (let x = 0; x < JANELA_W; x++) g.fillRect(x, JANELA_H - MORROS[x], 1, MORROS[x]);

  return { astro: a.qual, x: cx, y: cy, estrelas: quantas };
}

/* Disco serrilhado de cartucho — o `arc` antisserrado seria a única curva lisa
   num quadro todo de pixel. */
function disco(g, cx, cy, r) {
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++)
    for (let x = -Math.ceil(r); x <= Math.ceil(r); x++)
      if (x * x + y * y <= r * r + 0.5) g.fillRect(cx + x, cy + y, 1, 1);
}

/* ── A LUZ DA HORA, COMO ESTILO DA CAMADA `#idleLuz` ──────────────────────
 *
 * Terceira forma, e as duas primeiras foram reprovadas olhando:
 *
 *   1ª  tinta por cima, mistura normal      -> neblina cinza-leitosa
 *   2ª  `multiply` no canvas dos atores      -> azul puro cobrindo o chão:
 *       o canvas é transparente onde não há boneco, e multiplicar sobre
 *       transparente pinta a cor inteira
 *
 * Agora a luz é o FUNDO de um elemento com `mix-blend-mode: multiply`, acima da
 * cena inteira. Quem multiplica é o navegador, sobre chão e bonecos juntos.
 *
 * A luz tem DIREÇÃO: o centro do gradiente fica acima da borda de cima e anda
 * da esquerda para a direita com o astro. Perto da fonte sobra mais luz.
 *
 * Devolve a string do `background`; `none` de dia — a cena intacta, sem nem um
 * elemento de mistura trabalhando à toa. */
export function estiloDaLuz(agora) {
  const m = luzRestanteEm(agora);
  if (m[0] >= 255 && m[1] >= 255 && m[2] >= 255) return 'none';
  const a = astroEm(agora);
  const perto = m.map(c => Math.round(255 + (c - 255) * 0.6));
  const x = Math.round(a.x * 1000) / 10;
  return `radial-gradient(farthest-corner at ${x}% -25%, ` +
         `rgb(${perto.join(',')}) 0%, rgb(${m.join(',')}) 100%)`;
}

/* O rótulo da janela (o `title`). Palavra é decisão, e decisão não mora dentro
   de `innerHTML`. */
export const FALA_DO_PERIODO = { dia: 'Dia', tarde: 'Tarde', noite: 'Noite' };
export const falaDaHora = agora => FALA_DO_PERIODO[periodoEm(agora)] ?? '';
