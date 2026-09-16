/* O CÉU DO IDLE — o astro, as estrelas e a luz da hora (camada 4).
 *
 * Ele SÓ PINTA. Quem decide que período é, quanto escurece, onde está o astro e
 * quantas estrelas acendem é o `hora-do-dia.mjs`, em camada 0 e testado em
 * Node. A divisão é a regra de CUSTO do `CLAUDE.md`, e aqui ela tem número:
 * mutante de navegador ~30 s, mutante de Node ~0,1 s.
 *
 * ── O QUE O DONO PEDIU (L-124) ───────────────────────────────────────────
 *
 *     DIA      sol num canto, tela mais clara
 *     TARDE    alaranjado, sol se pondo
 *     NOITE    estrelas, lua NO LADO OPOSTO de onde o sol nasceu
 *
 * ── E O DETALHE QUE ELE NÃO PEDIU, E QUE A CENA PRECISAVA ────────────────
 *
 * A primeira versão era um adesivo mais um filtro: um disco amarelo no canto e
 * um retângulo escuro por cima de tudo. Funcionava. E lia como dois enfeites
 * empilhados, não como um lugar com luz.
 *
 * O que conserta é a luz ser **direcional**: a tinta da hora não é um
 * retângulo chapado, é um gradiente RADIAL centrado no astro. Perto dele a cena
 * escurece menos; longe, escurece o cheio. É de graça em custo e é a diferença
 * entre *"tem um sol desenhado ali"* e *"o sol está iluminando dali"*.
 *
 * É a regra do `CLAUDE.md`, §atenção especial, item 2: acrescentar um detalhe
 * que não foi pedido e que a cena precisa. Sem ele o pedido não estava cumprido.
 *
 * ── O TEMA: GBA NO MUNDO, NEON NA LUZ ───────────────────────────────────
 *
 * As estrelas são QUADRADOS de um pixel de mundo, e não círculos — o mundo é de
 * cartucho e um disco antisserrado no meio de tiles de 16 px se denuncia na
 * hora. Já o halo do astro é neon: brilho somado, sem contorno. Cada peça
 * escolhe um dos dois de propósito, que é o que a regra pede.
 */
import { luzEm, astroEm, estrelasEm, periodoEm } from './hora-do-dia.mjs';

/* O pixel de mundo, para a estrela ter o tamanho do cartucho e não do monitor. */
const PX = 2;

/* ── AS ESTRELAS TÊM LUGAR FIXO, E ELE NÃO VEM DE `Math.random` ───────────
 *
 * Duas capturas da mesma cena têm de dar a mesma coisa — é o que a linha de
 * base visual cobra, e é o que o D-099 pagou caro para conseguir. Então a
 * posição sai de uma função do ÍNDICE: a mesma estrela nasce sempre no mesmo
 * lugar, e o céu não pisca de quadro em quadro.
 *
 * E elas ficam na FAIXA DE CIMA da janela. Estrela no chão, entre os tiles de
 * grama, não é céu: é sujeira na tela. */
const FAIXA_CEU = 0.42;

function posicaoDaEstrela(i, W, H) {
  /* Duas progressões irracionais — a razão áurea e a raiz de dois. Elas
     espalham sem grade visível e sem repetir, que é o que um `%` simples faz
     mal: com passo racional as estrelas saem alinhadas em diagonais. */
  const x = ((i * 0.6180339887) % 1) * W;
  const y = ((i * 0.4142135624) % 1) * H * FAIXA_CEU;
  return { x: Math.round(x / PX) * PX, y: Math.round(y / PX) * PX };
}

/* ── O CÉU, EM DUAS CHAMADAS ──────────────────────────────────────────────
 *
 * `pintarCeu` vem ANTES dos atores: o astro e as estrelas estão atrás de tudo,
 * como o céu está. `pintarLuz` vem DEPOIS de tudo: a luz da hora cai sobre o
 * treinador, o companheiro e os selvagens junto com o chão — se caísse só no
 * chão, os bonecos ficariam acesos numa cena escura, e é assim que se descobre
 * que a noite é um filtro e não uma hora.
 *
 * Separar em duas é o que faz a ordem ser legível em quem lê o laço do quadro.
 */
export function pintarCeu(g, W, H, agora) {
  if (!g) return 0;
  const quantas = estrelasEm(agora);
  const a = astroEm(agora);

  g.save();
  g.imageSmoothingEnabled = false;

  /* AS ESTRELAS. `lighter` porque elas são luz somada ao que já está lá, e não
     tinta cobrindo — sobre o azul da noite a diferença aparece na hora. */
  if (quantas > 0) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= quantas; i++) {
      const { x, y } = posicaoDaEstrela(i, W, H);
      /* O BRILHO VARIA POR ESTRELA, e não pelo tempo: céu que pisca inteiro
         parece defeito de vídeo. Uma constante por índice dá profundidade —
         algumas são fracas, outras fortes — e continua reproduzível. */
      const f = 0.35 + ((i * 0.7548776662) % 1) * 0.65;
      g.fillStyle = `rgba(226,240,255,${(f * 0.9).toFixed(3)})`;
      g.fillRect(x, y, PX, PX);
      /* Uma em cada sete ganha um risco de brilho — é o que faz o céu ter
         algumas estrelas e não cento e vinte pontos iguais. */
      if (i % 7 === 0) {
        g.fillStyle = `rgba(226,240,255,${(f * 0.35).toFixed(3)})`;
        g.fillRect(x - PX, y, PX, PX); g.fillRect(x + PX, y, PX, PX);
        g.fillRect(x, y - PX, PX, PX); g.fillRect(x, y + PX, PX, PX);
      }
    }
  }

  /* O ASTRO. `x` e `y` vêm em fração da tela — a camada 0 não conhece pixel. */
  const cx = a.x * W, cy = a.y * H * FAIXA_CEU;
  const raio = Math.max(6, Math.round(Math.min(W, H) * 0.028 / PX) * PX);
  const sol = a.qual === 'sol';
  const nucleo = sol ? '255,236,170' : '226,236,255';
  const halo   = sol ? '255,190,90'  : '150,190,255';

  g.globalCompositeOperation = 'lighter';
  /* O HALO PRIMEIRO, e ele é o que tira o astro de "adesivo": um disco chapado
     no céu não tem de onde a luz sair. Três anéis em vez de um gradiente —
     `createRadialGradient` por quadro é caro, e três `arc` com alfa baixo dão a
     mesma leitura num mundo de 16 px. */
  for (const [mult, alfa] of [[4.2, 0.10], [2.6, 0.16], [1.7, 0.26]]) {
    g.fillStyle = `rgba(${halo},${(alfa * a.brilho).toFixed(3)})`;
    g.beginPath(); g.arc(cx, cy, raio * mult, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = `rgba(${nucleo},${(0.92 * a.brilho).toFixed(3)})`;
  g.beginPath(); g.arc(cx, cy, raio, 0, Math.PI * 2); g.fill();

  /* A LUA GANHA A SOMBRA DA FASE, e o sol não ganha nada equivalente: disco
     liso é o sol, e disco com mordida é a lua. Sem isto os dois são a mesma
     bola trocando de cor, e o jogador não lê "noite" — lê "ficou azul". */
  if (!sol) {
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(cx + raio * 0.52, cy - raio * 0.22, raio * 0.86, 0, Math.PI * 2);
    g.fill();
  }

  g.restore();
  return quantas;
}

/* ── A LUZ DA HORA, SOBRE TUDO ────────────────────────────────────────────
 *
 * Gradiente radial e não retângulo: perto do astro a cena escurece menos. É o
 * detalhe do topo deste arquivo, e é ele que faz a luz parecer VIR de algum
 * lugar.
 *
 * Devolve o alfa aplicado. Não é enfeite de relatório: *"a função rodou"* e
 * *"saiu pixel"* são perguntas diferentes, e confundi-las custou o 1.27c
 * inteiro — a mesma razão pela qual o `desenharClima` devolve a contagem. */
export function pintarLuz(g, W, H, agora) {
  if (!g) return 0;
  const { r, g: vg, b, alfa } = luzEm(agora);
  if (alfa <= 0) return 0;
  const a = astroEm(agora);

  g.save();
  const grad = g.createRadialGradient(
    a.x * W, a.y * H * FAIXA_CEU, Math.min(W, H) * 0.05,
    a.x * W, a.y * H * FAIXA_CEU, Math.max(W, H) * 0.95);
  /* No centro sobra 45% da tinta, na borda ela vale cheia. Não é zero no
     centro de propósito: à noite o pé da lua não pode ficar com a cena em luz
     de dia — o gradiente é uma direção, e não um buraco. */
  const perto = (alfa * 0.45).toFixed(3);
  grad.addColorStop(0, `rgba(${r},${vg},${b},${perto})`);
  grad.addColorStop(1, `rgba(${r},${vg},${b},${alfa.toFixed(3)})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.restore();
  return alfa;
}

/* O rótulo que o HUD mostra. Sai daqui e não da tela porque tradução de dado
   em palavra é decisão, e decisão não mora dentro de `innerHTML`. */
export const FALA_DO_PERIODO = { dia: 'Dia', tarde: 'Tarde', noite: 'Noite' };
export const falaDaHora = agora => FALA_DO_PERIODO[periodoEm(agora)] ?? '';
