/* O CHÃO DO MAPA NUM CANVAS (ST-10.22e) — camada 4.
 *
 * Pinta a grade que `jornada-chao.mjs` decide: mede onde a tela desenhou cada
 * nó (deitado ou em pé, é a mesma medida), pede a grade à camada 0 e pinta em
 * quatro passadas — o tile de cada célula, a borda em xadrez onde um chão
 * invade o vizinho, a espuma onde a água encosta na terra, e a face de
 * penhasco onde o chão desce. Os tiles são os nossos, de `arte/chao/`
 * (tools/pixel-arte.mjs); a célula é um quarto do tile, e cada uma pinta o
 * quarto dele que lhe cabe — a textura corre contínua de célula a célula. */
import { lerDesenho } from './jornada-desenho.mjs';
import { trechosDaEstrada } from './jornada-estrada.mjs';
import { pintarDesenho } from './jornada-desenho-tela.mjs';
import { gradeDoChao, transicoes, cantos, margens, temFace, COR_DO_CHAO, COR_DA_FACE, CELULA, TILE, MATERIAIS } from './jornada-chao.mjs';

const ARTE_DO_CHAO = '../arte/chao';
let tiles = null;
const carregar = () => (tiles ??= Promise.all(MATERIAIS.map(m => new Promise(fim => {
  const im = new Image();
  im.onload = () => fim([m, im]);
  im.onerror = () => fim([m, null]);   // sem o tile, a cor do chão: o mapa não fica em branco
  im.src = `${ARTE_DO_CHAO}/${m}.svg`;
}))).then(Object.fromEntries));

/* A borda em xadrez de 2 px, rala para dentro: cheia na beira, metade no
   meio, um quarto no fim — o degradê de tile do GBA. */
function borda(ctx, x, y, lado, cor) {
  const C = CELULA;
  ctx.fillStyle = cor;
  for (let i = 0; i < 6; i += 2) for (let j = 0; j < C; j += 2) {
    const xadrez = ((i + j) / 2) % 2 === 0;
    if (!xadrez || (i === 2 && j % 4) || (i === 4 && j % 8)) continue;
    const [px, py] = lado === 'cima' ? [x + j, y + i] : lado === 'baixo' ? [x + j, y + C - 2 - i] : lado === 'esq' ? [x + i, y + j] : [x + C - 2 - i, y + j];
    ctx.fillRect(px, py, 2, 2);
  }
}

/* A espuma da margem: uma linha clara colada à terra e outra pontilhada
   logo atrás — a costa do GBA, e não a água pontilhando a grama. */
function linhaDeEspuma(ctx, x, y, lado, d, cor, pula) {
  const C = CELULA;
  ctx.fillStyle = cor;
  for (let j = 0; j < C; j += 2) {
    if (pula && (j / 2) % 2) continue;
    const [px, py] = lado === 'cima' ? [x + j, y + d] : lado === 'baixo' ? [x + j, y + C - 2 - d] : lado === 'esq' ? [x + d, y + j] : [x + C - 2 - d, y + j];
    ctx.fillRect(px, py, 2, 2);
  }
}
function espuma(ctx, x, y, lado) {
  linhaDeEspuma(ctx, x, y, lado, 0, '#f2fbff', false);
  linhaDeEspuma(ctx, x, y, lado, 2, '#9fd4f2', true);
}

/* O canto arredondado: o triângulo em degraus de 2 px, do tile do vizinho,
   no canto em que os dois vizinhos são ele — o degrau de 16 px vira diagonal. */
function canto(ctx, x, y, qual, im, cor) {
  const C = CELULA, M = C / 2;
  for (let k = 0; k < M; k += 2) {
    const n = M - k;   // a linha k do canto tem n px
    const [px, py, w] = qual === 'ce' ? [x, y + k, n] : qual === 'cd' ? [x + C - n, y + k, n] : qual === 'be' ? [x, y + C - 2 - k, n] : [x + C - n, y + C - 2 - k, n];
    if (im) ctx.drawImage(im, (px % TILE + TILE) % TILE, (py % TILE + TILE) % TILE, Math.min(w, TILE - (px % TILE)), 2, px, py, Math.min(w, TILE - (px % TILE)), 2);
    else { ctx.fillStyle = cor; ctx.fillRect(px, py, w, 2); }
  }
}

/* A face do penhasco: os 6 px de baixo na cor da rocha, em estratos, com o
   brilho da quina em cima e a sombra caindo na célula de baixo. */
function face(ctx, x, y, cor) {
  const C = CELULA;
  ctx.fillStyle = cor; ctx.fillRect(x, y + C - 6, C, 6);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  for (let j = 3; j < C; j += 7) ctx.fillRect(x + j, y + C - 6, 2, 6);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y + C - 6, C, 1);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y + C, C, 3);
}

/* ST-10.23: o pack que traz o DESENHO do mapa é pintado por ele; o chão por
   proximidade abaixo fica para o pack que não traz. */
export async function pintarChao(alvo, mapa, desenho = null, emPe = false) {
  const tela = alvo.querySelector('.jnChao'), caixa = alvo.querySelector('.jnMapa');
  if (!tela || !caixa) return;
  const w = caixa.clientWidth, h = caixa.clientHeight;
  if (!w || !h) return;
  const r0 = caixa.getBoundingClientRect();
  const nos = [...caixa.querySelectorAll('.jnPos')].filter(p => p.querySelector(':scope > .jnNo'))
    .map((p, i) => { const r = p.getBoundingClientRect(); return { x: r.left - r0.left, y: r.top - r0.top, regiao: mapa.nos[i]?.regiao }; });
  /* ST-10.24: com o desenho, a estrada é pintada no chão, pelos pontos medidos
     dos nós. */
  if (desenho) {
    const iAtual = mapa.atual ? mapa.nos.findIndex(n => n.id === mapa.atual) : -1;
    pintarDesenho(tela, caixa, lerDesenho(desenho), emPe, await carregar(), trechosDaEstrada(nos, iAtual));
    return;
  }
  /* A poça de lava que a cena pôs no mapa reclama o chão de vulcão em volta;
     o ginásio, a PRAÇA — o calçamento é chão da grade, com borda e canto. */
  const centro = el => { const r = el.getBoundingClientRect(); return { x: r.left - r0.left + r.width / 2, y: r.top - r0.top + r.height / 2, r }; };
  const manchas = [
    ...[...caixa.querySelectorAll('.jnLago.jn-lava')].map(el => { const c = centro(el); return { x: c.x, y: c.y, regiao: 'vulcao', raio: Math.max(c.r.width, c.r.height) * 0.8 }; }),
    ...[...caixa.querySelectorAll('.jnPos.jnT-ginasio')].map(el => { const c = centro(el); return { x: c.x, y: c.y, regiao: 'praca', raio: 34 }; }),
  ];
  const grade = gradeDoChao(nos, { largura: w, altura: h, manchas });
  const img = await carregar();
  tela.width = w; tela.height = h;
  const ctx = tela.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const C = CELULA;
  grade.forEach((linha, l) => linha.forEach((m, c) => {
    const q = TILE / CELULA, sx = (c % q) * (TILE / q), sy = (l % q) * (TILE / q);
    if (img[m]) ctx.drawImage(img[m], sx, sy, TILE / q, TILE / q, c * C, l * C, C, C);
    else { ctx.fillStyle = COR_DO_CHAO[m]; ctx.fillRect(c * C, l * C, C, C); }
  }));
  grade.forEach((linha, l) => linha.forEach((m, c) => {
    for (const [qual, v] of Object.entries(cantos(grade, c, l))) canto(ctx, c * C, l * C, qual, img[v], COR_DO_CHAO[v]);
  }));
  grade.forEach((linha, l) => linha.forEach((m, c) => {
    for (const [lado, v] of Object.entries(transicoes(grade, c, l))) borda(ctx, c * C, l * C, lado, COR_DO_CHAO[v]);
  }));
  grade.forEach((linha, l) => linha.forEach((m, c) => { for (const lado of margens(grade, c, l)) espuma(ctx, c * C, l * C, lado); }));
  grade.forEach((linha, l) => linha.forEach((m, c) => { if (temFace(grade, c, l)) face(ctx, c * C, l * C, COR_DA_FACE[m] ?? '#333'); }));
}
