/* O MAPA DESENHADO À MÃO (ST-10.23 · L-217) — camada 0, sem DOM.
 *
 * O chão por proximidade (`jornada-chao.mjs`) chegou ao teto dele: cinco
 * rodadas de Q7 cego (barra: o mapa do SMW) leram "retalhos gerados". O SMW
 * é desenhado, e o pack passa a trazer o DESENHO (`pack.mapaJornada`): três
 * camadas de texto — o chão, a altura e as obras (ponte, escada).
 *
 * A borda entre dois chãos sai do AUTOTILE POR CANTOS (grade dupla, o
 * marching squares das peças de tile): a peça de 16 px fica entre quatro
 * células do desenho, e cada chão presente pinta uma MÁSCARA arredondada dos
 * cantos que são dele (ou de um chão acima dele) — a curva com contorno do
 * SMW, e não o degrau de uma célula. A água fica por baixo de tudo: a terra
 * arredonda por cima dela, e a costa sai da própria borda.
 *
 * O desenho está no espaço dos nós: deitado, as colunas são o x da jornada e
 * as linhas o y, e ele cobre a caixa do mapa; em pé, as colunas são o y e as
 * linhas o x, entre os 70 px de cima e os 40 de baixo — como os nós. */
import { CELULA } from './jornada-chao.mjs';

export const LEGENDA = Object.freeze({
  '.': 'grama', ',': 'campo', '"': 'jardim', T: 'floresta', Y: 'bosque', '^': 'pedra', ':': 'praia',
  '~': 'agua', '%': 'pantano', '#': 'cidade', '=': 'praca', '&': 'usina', v: 'vulcao', P: 'planalto',
});
/* Quem arredonda por cima de quem — uma ordem ESTRITA: dois chãos na mesma
   ordem disputariam o mesmo canto, e a peça sairia de quem pintou por último. */
export const ORDEM = Object.freeze({
  agua: -1, grama: 0, campo: 1, jardim: 2, praia: 3, pantano: 4, floresta: 5, bosque: 6,
  pedra: 7, praca: 8, cidade: 9, usina: 10, vulcao: 11, planalto: 12,
});

const preso = (v, a, b) => Math.max(a, Math.min(b, v));

export function lerDesenho(cru) {
  if (!cru?.chao?.length) return null;
  const lin = cru.chao.length, col = cru.chao[0].length;
  const iguais = ['chao', 'altura', 'obra'].every(k => cru[k]?.length === lin && cru[k].every(r => r.length === col));
  if (!iguais) throw new Error('desenho do mapa com camadas de tamanhos diferentes');
  return {
    col, lin,
    mat: cru.chao.map(r => [...r].map(ch => LEGENDA[ch] ?? 'grama')),
    alt: cru.altura.map(r => [...r].map(Number)),
    obra: cru.obra.map(r => [...r]),
  };
}

/* A célula do desenho num ponto (u, v) de 0 a 1; fora dele, a borda mais perto. */
export function celulaEm(d, u, v) {
  const c = preso(Math.floor(u * d.col), 0, d.col - 1), l = preso(Math.floor(v * d.lin), 0, d.lin - 1);
  return { mat: d.mat[l][c], alt: d.alt[l][c], obra: d.obra[l][c] };
}

/* Do pixel da caixa ao ponto do desenho — em pé, a faixa do caminho. */
export const noDesenho = (px, py, { largura, altura, emPe = false }) =>
  (emPe ? [px / largura, (py - 70) / (altura - 110)] : [px / largura, py / altura]);

/* O RUÍDO do traço: valor do hash numa rede de 2,5 casas do desenho,
   interpolado — a borda treme devagar, como traço à mão, e sempre igual. */
const hash = (x, y, s) => {
  let v = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0;
  return ((v ^ (v >>> 16)) & 0xffff) / 65535;
};
const liso = t => t * t * (3 - 2 * t);
function ruido(x, y, s, passo = 2.5) {
  const gx = Math.floor(x / passo), gy = Math.floor(y / passo), fx = liso(x / passo - gx), fy = liso(y / passo - gy);
  const a = hash(gx, gy, s), b = hash(gx + 1, gy, s), c = hash(gx, gy + 1, s), e = hash(gx + 1, gy + 1, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (e - c) * fx) * fy;
}

/* A AMOSTRA SUAVE: num ponto contínuo do desenho, cada valor das quatro casas
   em volta pesa pela interpolação bilinear, e ganha o de mais peso — a borda
   segue a curva de 0,5 entre as casas, e não a quina delas. Com a amostra
   pela casa mais perto, o círculo desenhado saía um octógono em degraus
   (1ª rodada do Q7 da ST-10.23). */
function pesado(d, camada, fx, fy) {
  const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5), tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
  const pesos = new Map();
  for (const [dx, dy, w] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]]) {
    const v = d[camada][preso(y0 + dy, 0, d.lin - 1)][preso(x0 + dx, 0, d.col - 1)];
    pesos.set(v, (pesos.get(v) ?? 0) + w);
  }
  let melhor = null, maior = -1;
  for (const [v, w] of pesos) if (w > maior) { melhor = v; maior = w; }
  return melhor;
}

/* A grade do mundo: uma célula por `celula` px da caixa. O chão e a altura
   pela amostra suave, com a borda oscilando `oscila` casas do desenho para
   cada lado; a obra (ponte, escada) pela casa exata — ela mora onde a
   estrada passa, e não pode tremer para fora dela. */
export function gradeDoDesenho(d, { largura, altura, celula = CELULA, emPe = false, suave = true, oscila = 0.45 } = {}) {
  const col = Math.ceil(largura / celula), lin = Math.ceil(altura / celula), g = { mat: [], alt: [], obra: [] };
  for (let l = 0; l < lin; l++) {
    const m = [], a = [], o = [];
    for (let c = 0; c < col; c++) {
      const [u, v] = noDesenho((c + 0.5) * celula, (l + 0.5) * celula, { largura, altura, emPe });
      const exato = celulaEm(d, u, v);
      o.push(exato.obra);
      if (!suave) { m.push(exato.mat); a.push(exato.alt); continue; }
      let fx = u * d.col, fy = v * d.lin;
      if (oscila) { const x = fx, y = fy; fx += oscila * 2 * (ruido(x, y, 1) - 0.5); fy += oscila * 2 * (ruido(x, y, 2) - 0.5); }
      m.push(pesado(d, 'mat', fx, fy)); a.push(pesado(d, 'alt', fx, fy));
    }
    g.mat.push(m); g.alt.push(a); g.obra.push(o);
  }
  return g;
}

/* A MÁSCARA de uma peça: os cantos ligados (1 cima-esquerda, 2 cima-direita,
   4 baixo-direita, 8 baixo-esquerda) somam um campo suave, e dentro é onde o
   campo passa do limiar — um canto sozinho é um quarto de círculo de meia
   peça, dois vizinhos são uma faixa, dois opostos ficam ilhas. 0 fora, 1
   dentro, 2 contorno: dentro, com uma vizinha fora (o campo continua além da
   peça, então não há contorno onde a forma segue na peça do lado). */
const LIMIAR = 0.45, guardadas = new Map();
export function mascara(bits, lado = CELULA) {
  const chave = `${bits}:${lado}`;
  if (guardadas.has(chave)) return guardadas.get(chave);
  const cantos = [[0, 0, 1], [lado, 0, 2], [lado, lado, 4], [0, lado, 8]].filter(([, , b]) => bits & b);
  const raio = (9 * lado) / 16;          // o quarto de círculo tem meia peça, em qualquer tamanho
  const dentro = (x, y) => cantos.reduce((s, [cx, cy]) => s + Math.exp(-((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (raio * raio)), 0) > LIMIAR;
  const m = new Uint8Array(lado * lado);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      if (!dentro(x, y)) continue;
      m[y * lado + x] = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !dentro(x + dx, y + dy)) ? 2 : 1;
    }
  }
  const pronta = Object.freeze([...m]);
  guardadas.set(chave, pronta);
  return pronta;
}

/* Os quatro cantos da peça (i, j) da grade dupla: as células do mundo em
   volta do ponto (j, i) — a peça fica meia célula deslocada do mundo. */
function cantosDe(grade, i, j) {
  const lin = grade.length, col = grade[0].length;
  const em = (l, c) => grade[preso(l, 0, lin - 1)][preso(c, 0, col - 1)];
  return [em(i - 1, j - 1), em(i - 1, j), em(i, j), em(i, j - 1)];
}

/* As camadas da peça, de baixo para cima: cada chão com os cantos que são
   dele ou de um chão mais acima — o mais baixo sai cheio por conta própria,
   e a borda arredondada do chão alto revela o do meio, e não o de baixo. */
export function camadas(g, i, j) {
  const k = cantosDe(g.mat, i, j);
  const ordem = m => ORDEM[m] ?? 0;
  const mats = [...new Set(k)].sort((a, b) => ordem(a) - ordem(b));
  return mats.map(m => ({ mat: m, bits: k.reduce((b, x, q) => b | (ordem(x) >= ordem(m) ? 1 << q : 0), 0) }));
}

/* A altura por cantos: a máscara do chão que está a h ou mais — a tela
   desloca ela para baixo e pinta a diferença como a face do penhasco. */
export const bitsDeAltura = (g, i, j, h) => cantosDe(g.alt, i, j).reduce((b, a, q) => b | (a >= h ? 1 << q : 0), 0);
