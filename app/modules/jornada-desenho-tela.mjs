/* O MAPA DESENHADO NUM CANVAS (ST-10.23 · L-217) — camada 4.
 *
 * Pinta o desenho do pack pelas decisões de `jornada-desenho.mjs`: a grade
 * do mundo amostrada na caixa, e por cima dela a GRADE DUPLA — uma peça de
 * 16 px entre cada quatro células, com as camadas de chão que os cantos dela
 * pedem, cada uma recortada pela máscara arredondada e contornada. Depois as
 * faces dos penhascos (a máscara de cada altura deslocada para baixo, menos
 * ela mesma), a sombra delas, as escadas e as pontes. Os tiles são os nossos,
 * de `arte/chao/`.
 *
 * ST-10.24: a ESTRADA também é chão — terra batida pintada no canvas, com a
 * borda escura, entre os penhascos e as obras (a ponte e a escada ficam por
 * cima dela, como partes da estrada). O que ela é mora em `jornada-estrada.mjs`. */
import { gradeDoDesenho, camadas, bitsDeAltura, mascara } from './jornada-desenho.mjs';
import { TILE, COR_DO_CHAO } from './jornada-chao.mjs';
import { larguraDaEstrada, faceDoPenhasco, CORES_DA_ESTRADA, curvaDaEstrada, obrasNaEstrada, casasDaEstrada } from './jornada-estrada.mjs';

/* O contorno do chão: a linha escura na borda da máscara — o traço do SMW.
   Sobre a água ele é a espuma: a terra termina numa linha clara. */
const CONTORNO = Object.freeze({
  grama: '#3f7a2e', campo: '#4f8f36', jardim: '#4f8f36', praia: '#f4ecc8', pantano: '#2e4a2a', floresta: '#17361a',
  bosque: '#0f2c26', pedra: '#76552d', praca: '#8f8568', cidade: '#5f6570', usina: '#3a3d44', vulcao: '#241210', planalto: '#5f584c',
});
/* A peça do desenho tem 8 px — meia célula do chão por proximidade: com a
   amostra suave, a curva da borda sai em degraus de 8, e não de 16. */
const PECA = 8;
/* A rocha da face, mais CLARA que a borda de cima: a 2ª rodada do Q7 leu a
   faixa escura como "degrau de um tile, sem face". Com a face clara em
   colunas, a base escura e a quina acesa, ela lê como parede. */
const ROCHA = ['#8f7a62', '#8f7a62', '#7e6a55', '#6d5b48'];

const tela2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

/* A TERRA da estrada: um tile de 16 px feito aqui, a base com grãos claros e
   escuros em posições fixas — a textura corre contínua de peça a peça, como a
   dos tiles do chão. */
let terra = null;
const tileDaTerra = () => {
  if (terra) return terra;
  const [cv, c2] = tela2d(16, 16), cor = CORES_DA_ESTRADA;
  c2.fillStyle = cor.terra; c2.fillRect(0, 0, 16, 16);
  c2.fillStyle = cor.gasto; for (const [x, y] of [[2, 3], [9, 1], [13, 7], [5, 10], [11, 13], [1, 14], [7, 6]]) c2.fillRect(x, y, 2, 1);
  c2.fillStyle = 'rgba(94,63,31,.35)'; for (const [x, y] of [[6, 2], [12, 4], [3, 8], [14, 11], [8, 12], [0, 6]]) c2.fillRect(x, y, 1, 1);
  return (terra = cv);
};

/* A ESTRADA EM TILES (3ª rodada do Q7): as casas que a CURVA cobre viram
   estrada, pintada pela mesma grade dupla do chão — a peça entre quatro
   casas, recortada pela máscara arredondada, com o contorno da borda. Assim
   ela segue a grade do terreno em vez de ser uma fita lisa por cima dele. O
   trecho próximo é a mesma estrada, apagada. Devolve as curvas, para as
   obras saírem delas. */
function pintarEstrada(ctx, { andado = [], proximo = [] }, { w, h, C, lin, col }) {
  const raio = larguraDaEstrada(w) / 2 + 2, cor = CORES_DA_ESTRADA, [br, bg, bb] = [1, 3, 5].map(k => parseInt(cor.borda.slice(k, k + 2), 16));
  const pecas = new Map();
  const peca = (bits, x, y) => {
    const ox = ((x % 16) + 16) % 16, oy = ((y % 16) + 16) % 16, chave = `${bits}|${ox}|${oy}`;
    if (pecas.has(chave)) return pecas.get(chave);
    const [cv, c2] = tela2d(C, C);
    c2.fillStyle = c2.createPattern(tileDaTerra(), 'repeat');
    c2.translate(-ox, -oy); c2.fillRect(ox, oy, C, C); c2.setTransform(1, 0, 0, 1, 0, 0);
    if (bits !== 15) {
      /* A BORDA EM DOIS TONS (4ª rodada do Q7: sobre a rocha cinza, a borda de
         1 px sumia e a estrada lia "sem borda"): o contorno escuro e, por
         dentro dele, um anel da terra escurecida — o caminho do SMW. */
      const m = mascara(bits, C), px = c2.getImageData(0, 0, C, C);
      const contorno = (x, y) => x >= 0 && y >= 0 && x < C && y < C && m[y * C + x] === 2;
      for (let k = 0; k < m.length; k++) {
        const x = k % C, y = (k - x) / C;
        if (m[k] === 0) px.data[k * 4 + 3] = 0;
        else if (m[k] === 2) { px.data[k * 4] = br; px.data[k * 4 + 1] = bg; px.data[k * 4 + 2] = bb; }
        else if (contorno(x - 1, y) || contorno(x + 1, y) || contorno(x, y - 1) || contorno(x, y + 1)) {
          for (let q = 0; q < 3; q++) px.data[k * 4 + q] = Math.round(px.data[k * 4 + q] * 0.72);
        }
      }
      c2.putImageData(px, 0, 0);
    }
    pecas.set(chave, cv);
    return cv;
  };
  const trecho = (nos, apagado) => {
    const pts = curvaDaEstrada(nos);
    if (pts.length < 2) return pts;
    const casas = casasDaEstrada(pts, { celula: C, raio, col, lin });
    const em = (l, c) => casas.has(`${l},${c}`);
    const [cv, c2] = tela2d(w, h);
    for (let i = 0; i <= lin; i++) {
      for (let j = 0; j <= col; j++) {
        const bits = (em(i - 1, j - 1) ? 1 : 0) | (em(i - 1, j) ? 2 : 0) | (em(i, j) ? 4 : 0) | (em(i, j - 1) ? 8 : 0);
        if (bits) { const x = j * C - C / 2, y = i * C - C / 2; c2.drawImage(peca(bits, x, y), x, y); }
      }
    }
    ctx.save(); ctx.globalAlpha = apagado ? cor.alfaDoProximo : 1; ctx.drawImage(cv, 0, 0); ctx.restore();
    return pts;
  };
  return { andado: trecho(andado, false), proximo: trecho(proximo, true) };
}

/* A PONTE e a ESCADA onde a estrada as pede: tábuas atravessadas no sentido
   dela sobre a água (uma a cada amostra, com a fresta escura entre elas), e
   degraus de pedra descendo a face do penhasco. */
function pintarObras(ctx, obras, L, FACE, alfa) {
  ctx.save(); ctx.globalAlpha = alfa; ctx.imageSmoothingEnabled = false;
  for (const o of obras) {
    if (o.tipo === 'ponte') {
      ctx.save(); ctx.translate(Math.round(o.x), Math.round(o.y)); ctx.rotate(Math.atan2(o.dy, o.dx));
      ctx.fillStyle = '#4a2e14'; ctx.fillRect(-3, -(L / 2 + 4), 6, L + 8);
      ctx.fillStyle = '#b07a3e'; ctx.fillRect(-2, -(L / 2 + 3), 4, L + 6);
      ctx.fillStyle = '#d19a58'; ctx.fillRect(-2, -(L / 2 + 3), 4, 1);
      ctx.restore();
    } else {
      const x = Math.round(o.x - (L + 2) / 2), y = Math.round(o.y) - 2;
      ctx.fillStyle = '#5a4a38'; ctx.fillRect(x - 1, y, L + 4, FACE + 5);
      ctx.fillStyle = '#c9b797'; ctx.fillRect(x, y, L + 2, FACE + 4);
      ctx.fillStyle = 'rgba(70,52,30,.6)'; for (let k = y + 3; k < y + FACE + 4; k += 4) ctx.fillRect(x, k, L + 2, 1);
    }
  }
  ctx.restore();
}
export function pintarDesenho(tela, caixa, d, emPe, img, estrada = null) {
  const w = caixa.clientWidth, h = caixa.clientHeight, C = PECA, FACE = faceDoPenhasco(w);
  const g = gradeDoDesenho(d, { largura: w, altura: h, emPe, celula: C });
  tela.width = w; tela.height = h;
  const ctx = tela.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const lin = g.mat.length, col = g.mat[0].length;

  /* A peça (chão, cantos, fase do tile): o tile nosso em padrão ancorado no
     mundo — a textura corre contínua de peça a peça —, recortada pela
     máscara, com o contorno pintado por cima. Guardada: são poucas. */
  const pecas = new Map();
  const peca = (mat, bits, x, y, espuma) => {
    const ox = ((x % TILE) + TILE) % TILE, oy = ((y % TILE) + TILE) % TILE, chave = `${mat}|${bits}|${ox}|${oy}|${espuma}`;
    if (pecas.has(chave)) return pecas.get(chave);
    const [cv, c2] = tela2d(C, C);
    c2.fillStyle = img[mat] ? c2.createPattern(img[mat], 'repeat') : COR_DO_CHAO[mat];
    c2.translate(-ox, -oy); c2.fillRect(ox, oy, C, C); c2.setTransform(1, 0, 0, 1, 0, 0);
    if (bits !== 15) {
      const m = mascara(bits, C), px = c2.getImageData(0, 0, C, C), borda = espuma ? '#eef8ff' : CONTORNO[mat] ?? '#222';
      const [r, gg, b] = [1, 3, 5].map(k => parseInt(borda.slice(k, k + 2), 16));
      for (let k = 0; k < m.length; k++) {
        if (m[k] === 0) px.data[k * 4 + 3] = 0;
        else if (m[k] === 2) { px.data[k * 4] = r; px.data[k * 4 + 1] = gg; px.data[k * 4 + 2] = b; }
      }
      c2.putImageData(px, 0, 0);
    }
    pecas.set(chave, cv);
    return cv;
  };

  /* 1. O CHÃO pela grade dupla: a peça (i, j) cobre o ponto entre as quatro
     células do mundo em volta dele — meia célula para cima e para a esquerda. */
  for (let i = 0; i <= lin; i++) {
    for (let j = 0; j <= col; j++) {
      const x = j * C - C / 2, y = i * C - C / 2;
      /* A terra logo acima da água ganha contorno de ESPUMA: a costa. */
      const cam = camadas(g, i, j);
      cam.forEach(({ mat, bits }, k) => ctx.drawImage(peca(mat, bits, x, y, k === 1 && cam[0].mat === 'agua'), x, y));
    }
  }

  /* 2. OS PENHASCOS: para cada altura, a máscara de "tão alto ou mais",
     deslocada FACE px para baixo, menos ela mesma — a faixa que aparece sob a
     borda sul, na curva exata da borda. Em estratos, com o brilho da quina e a
     sombra que ela joga no chão de baixo. */
  const formas = new Map();
  const forma = bits => {
    if (formas.has(bits)) return formas.get(bits);
    const [cv, c2] = tela2d(C, C), m = mascara(bits, C), px = c2.createImageData(C, C);
    for (let k = 0; k < m.length; k++) if (m[k]) { px.data[k * 4 + 3] = 255; }
    c2.putImageData(px, 0, 0); formas.set(bits, cv);
    return cv;
  };
  for (let nivel = 1; nivel <= 3; nivel++) {
    const [alto, a2] = tela2d(w, h);
    let algum = false;
    for (let i = 0; i <= lin; i++) {
      for (let j = 0; j <= col; j++) {
        const bits = bitsDeAltura(g, i, j, nivel);
        if (bits) { a2.drawImage(forma(bits), j * C - C / 2, i * C - C / 2); algum = true; }
      }
    }
    if (!algum) continue;
    const faixa = (desce, cor) => {
      const [f, f2] = tela2d(w, h);
      f2.drawImage(alto, 0, desce);
      f2.globalCompositeOperation = 'destination-out'; f2.drawImage(alto, 0, 0);
      f2.globalCompositeOperation = 'source-in'; f2.fillStyle = cor; f2.fillRect(0, 0, w, h);
      return [f, f2];
    };
    const [sombra] = faixa(FACE + 5, 'rgba(0,0,0,.3)');
    ctx.drawImage(sombra, 0, 0);
    const [face, f2] = faixa(FACE, ROCHA[nivel]);
    f2.globalCompositeOperation = 'source-atop';
    /* As colunas da rocha: a fresta escura e o lado aceso de cada uma. */
    f2.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < w; x += 6) f2.fillRect(x, 0, 2, h);
    f2.fillStyle = 'rgba(255,255,255,.14)'; for (let x = 3; x < w; x += 6) f2.fillRect(x, 0, 1, h);
    f2.fillStyle = 'rgba(0,0,0,.14)'; for (let y = 4; y < h; y += 7) f2.fillRect(0, y, w, 1);
    /* A base escura (os 3 px de baixo da face) e a quina acesa em cima. */
    const [base] = tela2d(w, h), b2 = base.getContext('2d');
    b2.drawImage(alto, 0, FACE); b2.globalCompositeOperation = 'destination-out'; b2.drawImage(alto, 0, FACE - 3);
    b2.globalCompositeOperation = 'source-in'; b2.fillStyle = 'rgba(30,20,10,.5)'; b2.fillRect(0, 0, w, h);
    f2.drawImage(base, 0, 0);
    const [quina] = faixa(2, 'rgba(255,255,255,.45)');
    f2.drawImage(quina, 0, 0);
    ctx.drawImage(face, 0, 0);
  }

  /* 3. A ESTRADA, por cima do chão e dos penhascos (ST-10.24), e as OBRAS
     que ela pede — a ponte e a escada perguntadas ao chão pela curva dela. */
  if (estrada) {
    const curvas = pintarEstrada(ctx, estrada, { w, h, C, lin, col }), L = larguraDaEstrada(w);
    const casa = (p, k) => k[Math.max(0, Math.min(lin - 1, Math.floor(p.y / C)))][Math.max(0, Math.min(col - 1, Math.floor(p.x / C)))];
    const chao = { matEm: p => casa(p, g.mat), altEm: p => casa(p, g.alt) };
    pintarObras(ctx, obrasNaEstrada(curvas.andado, chao), L, FACE, 1);
    pintarObras(ctx, obrasNaEstrada(curvas.proximo, chao), L, FACE, CORES_DA_ESTRADA.alfaDoProximo);
    return;
  }

  /* 4. Sem estrada (o pack sem os nós medidos), AS OBRAS do desenho: a escada
     onde a estrada sobe a face e a ponte onde ela passa sobre a água. */
  for (let l = 0; l < lin; l++) {
    for (let c = 0; c < col; c++) {
      const x = c * C, y = l * C;
      if (g.obra[l][c] === '/') {
        ctx.fillStyle = '#b8a27a'; ctx.fillRect(x, y - 2, C, FACE + 4);
        ctx.fillStyle = 'rgba(60,40,20,.55)'; for (let k = y; k < y + FACE + 2; k += 3) ctx.fillRect(x, k, C, 1);
      }
      if (g.obra[l][c] === 'H') {
        ctx.fillStyle = '#b07a3e'; ctx.fillRect(x, y, C, C);
        ctx.fillStyle = '#7a5028'; for (let k = x; k < x + C; k += 4) ctx.fillRect(k, y, 1, C);
      }
    }
  }
}
