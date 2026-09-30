/* O MAPA DESENHADO NUM CANVAS (ST-10.23 · L-217) — camada 4.
 *
 * Pinta o desenho do pack pelas decisões de `jornada-desenho.mjs`: a grade
 * do mundo amostrada na caixa, e por cima dela a GRADE DUPLA — uma peça de
 * 16 px entre cada quatro células, com as camadas de chão que os cantos dela
 * pedem, cada uma recortada pela máscara arredondada e contornada. Depois as
 * faces dos penhascos (a máscara de cada altura deslocada para baixo, menos
 * ela mesma), a sombra delas, as escadas e as pontes. Os tiles são os nossos,
 * de `arte/chao/`. */
import { gradeDoDesenho, camadas, bitsDeAltura, mascara } from './jornada-desenho.mjs';
import { TILE, COR_DO_CHAO } from './jornada-chao.mjs';

/* O contorno do chão: a linha escura na borda da máscara — o traço do SMW.
   Sobre a água ele é a espuma: a terra termina numa linha clara. */
const CONTORNO = Object.freeze({
  grama: '#3f7a2e', campo: '#4f8f36', jardim: '#4f8f36', praia: '#f4ecc8', pantano: '#2e4a2a', floresta: '#17361a',
  bosque: '#0f2c26', pedra: '#76552d', praca: '#8f8568', cidade: '#5f6570', usina: '#3a3d44', vulcao: '#241210', planalto: '#5f584c',
});
const FACE = 9;                       // px de penhasco sob a borda sul
/* A peça do desenho tem 8 px — meia célula do chão por proximidade: com a
   amostra suave, a curva da borda sai em degraus de 8, e não de 16. */
const PECA = 8;
const ROCHA = ['#6d5c49', '#6d5c49', '#5e5040', '#4f4336'];

const tela2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

export function pintarDesenho(tela, caixa, d, emPe, img) {
  const w = caixa.clientWidth, h = caixa.clientHeight, C = PECA;
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
    const [sombra] = faixa(FACE + 3, 'rgba(0,0,0,.22)');
    ctx.drawImage(sombra, 0, 0);
    const [face, f2] = faixa(FACE, ROCHA[nivel]);
    f2.globalCompositeOperation = 'source-atop';
    f2.fillStyle = 'rgba(0,0,0,.28)'; for (let x = 2; x < w; x += 6) f2.fillRect(x, 0, 2, h);
    f2.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 3; y < h; y += 5) f2.fillRect(0, y, w, 1);
    const [quina] = faixa(2, 'rgba(255,255,255,.35)');
    f2.drawImage(quina, 0, 0);
    ctx.drawImage(face, 0, 0);
  }

  /* 3. AS OBRAS do desenho: a escada onde a estrada sobe a face (degraus
     claros sobre a rocha) e a ponte onde ela passa sobre a água (tábuas com
     os dois corrimões). */
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
