/* A FOLHA DE ÍCONES DE ITEM VIRA UMA GRADE LIMPA, NA RESOLUÇÃO NATIVA.
 *
 * O dono mandou a folha como JPEG com grade azul desenhada e fundo cinza-claro,
 * e pediu duas coisas: *"os ícones também precisam ficar em um recorte padrão,
 * de preferência você poderia remover o fundo"*.
 *
 * ── POR QUE 32 px, E NÃO 48 ──────────────────────────────────────────────
 *
 * A primeira versão normalizou em 48 px, e o dono reprovou duas vezes:
 *
 *   > "a imagem dos ícones está muito distorcida"
 *
 * Ele estava certo, e a causa é aritmética. Estes são sprites de PIXEL ART da
 * Gen 4 — nativos de 32 px — que alguém ampliou para caber numa célula de ~49 px
 * e depois salvou em JPEG. O resultado já chega aqui borrado. Normalizar em 48
 * mantinha o borrão e ainda o reamostrava mais uma vez.
 *
 * Reduzir para 32 DESFAZ a ampliação: a média de 1,5 px de origem por pixel de
 * destino recompõe o bloco original e come o ruído do JPEG junto. Conferido
 * olhando, lado a lado, ampliado 8× — e é visivelmente mais limpo.
 *
 * > **Arte que nasceu em 32 px só volta a ficar nítida em 32 px.** Qualquer
 * > tamanho intermediário é uma segunda reamostragem por cima da primeira.
 *
 * E é a resolução certa para este jogo por outro motivo: **o mundo é GBA.** Um
 * ícone de pixel art ao lado de um sprite de pixel art pertence à cena; um
 * render 3D ao lado dele, não.
 *
 * ── O QUE ESTA FERRAMENTA FAZ, EM ORDEM ──────────────────────────────────
 *
 *   1. ACHA a grade nos pixels — as linhas azuis, agrupadas em faixas
 *   2. RECORTA o interior de cada célula, sem encostar na linha
 *   3. TIRA o fundo cinza-claro por preenchimento a partir da BORDA, com a
 *      chave lida da própria peça
 *   4. APARA o vazio, CENTRALIZA, e REDUZ para 32 px
 *   5. GRAVA uma folha só, com alfa, em 24 colunas
 *
 * ── A ORDEM DA FONTE É PRESERVADA, E ISSO É O QUE TORNA A FOLHA UTILIZÁVEL ─
 *
 * A saída tem as MESMAS 24 colunas da entrada, na mesma ordem. Índice 0 é a
 * primeira célula da folha do dono, 24 é a primeira da segunda linha.
 *
 * A primeira versão saía em 12 colunas, e isso quebrava a única coisa que torna
 * uma folha sem nomes utilizável: **poder olhar a folha original, contar, e
 * saber o índice.** Com o layout mudado, cada identificação visual tinha de ser
 * traduzida de cabeça — e traduzir de cabeça é como a Poké Ball virou "casa 3"
 * e eu a tomei por errada.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';
const FONTE = process.env.FOLHA_ITENS ||
  'C:/Users/gdult/OneDrive/Documentos/PokeArena/ICONES DE ITENS/d167bf61-6df1-4c1c-9775-576389b86125.jpg';

/* O lado nativo do sprite. Ver a nota longa acima: não é escolha de gosto. */
const LADO = 32;
/* Quanto do quadro a peça ocupa. Alto de propósito: em 32 px, cada pixel de
   folga é 3% do ícone, e o item precisa da área toda para ser reconhecido. */
const OCUPACAO = 0.94;

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

const dados = 'data:image/jpeg;base64,' + readFileSync(FONTE).toString('base64');

/* ── A NOSSA ARTE ENTRA NO FIM DA MESMA FOLHA ─────────────────────────────
 *
 * O Elo, a Essencia e o PokeCoin sao deste projeto. Poderiam viver numa folha
 * separada, com um sinalizador de qual usar — e esse sinalizador se paga duas
 * vezes: uma no codigo que escolhe, outra no dia em que alguem esquece.
 *
 * Numa linha extra no fim, o espaco de indice continua UM. */
/* ── OS SETE DA L-104 ENTRAM POR AQUI (1.12b) ─────────────────────────────
 *
 * O dono mandou as sete artes que faltavam e disse, sobre elas destoarem da
 * folha do BDSP:
 *
 *   > "não se prenda a isso, não precisa necessariamente seguir um 'padrão' se
 *   >  essas imagens você conseguir aplicar com boa qualidade pode usar"
 *
 * Ele está certo, e o motivo é o tamanho: num ícone de 32 px, LEGIBILIDADE
 * ganha de coerência de estilo. Uma maçã mordida de contorno grosso se lê de
 * relance; a mesma maçã em sombreado suave vira uma mancha vermelha.
 *
 * Entram pela mesma porta da nossa arte — linha extra no fim, recorte por caixa
 * alfa e a MESMA ocupação de quadro do resto. É essa ocupação única que corrigiu
 * o "ultrabll qualidade saiu péssima": arte de fonte diferente com regra de
 * recorte diferente sai de tamanhos diferentes, e o olho lê isso como qualidade.
 *
 * ── E A ORDEM AQUI É A ORDEM DO ÍNDICE ────────────────────────────────────
 *
 * O índice de cada peça é `base + posição nesta lista`. Trocar duas linhas de
 * lugar troca dois ícones no jogo, em silêncio. Por isso a lista é fixa e os
 * que faltam são PULADOS com aviso, e não removidos: sumir com um do meio
 * empurraria todos os seguintes uma casa. */
/* A PASTA E A DO DONO, e nao `arte/itens/`. Ele mandou o caminho:
     C:\Users\gdult\OneDrive\Documentos\PokeArena\ICONES DE ITENS
   E e a MESMA pasta de onde ja sai a folha do BDSP (`FONTE`, acima), o que e a
   coisa certa: uma pasta so para o material de item que o dono manda. */
const PASTA_DONO = process.env.ARTE_ITENS ||
  'C:/Users/gdult/OneDrive/Documentos/PokeArena/ICONES DE ITENS';
const SETE_DA_L104 = [
  'leftovers.png',
  'muscleband.png',
  'lifeorb.png',
  'luckyegg.png',
  'choicescarf.png',
  'focusband.png',
  'focussash.png',
];
const caminhoDono = n => join(PASTA_DONO, n);
const faltando = SETE_DA_L104.filter(n => !existsSync(caminhoDono(n)));
if (faltando.length)
  console.warn(`  · ${faltando.length} das sete artes da L-104 ainda não estão ` +
    `em arte/itens/ — a folha sai sem elas, e o catálogo segue com "?".\n` +
    faltando.map(p => `      falta ${p}`).join('\n'));

const NOSSOS = [
  'arte/itens/elo.svg',
  'arte/itens/essencia.svg',
  'arte/moedas/pokecoin.png',
  ...SETE_DA_L104.filter(n => existsSync(caminhoDono(n))).map(caminhoDono),
].map(p => {
  const abs = p.includes(':') ? p : join(RAIZ, p);
  const mime = p.endsWith('.svg') ? 'image/svg+xml'
             : p.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  return { p, dados: `data:${mime};base64,` + readFileSync(abs).toString('base64') };
});

const r = await pg.evaluate(async ({ dados, NOSSOS, LADO, OCUPACAO }) => {
  const im = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dados;
  });
  const fonte = document.createElement('canvas');
  fonte.width = im.width; fonte.height = im.height;
  const gf = fonte.getContext('2d', { willReadFrequently: true });
  gf.drawImage(im, 0, 0);
  const D = gf.getImageData(0, 0, fonte.width, fonte.height).data;
  const W = fonte.width, H = fonte.height;

  /* ── A GRADE, ACHADA NOS PIXELS ────────────────────────────────────────
     Linha de grade é azul E atravessa a imagem inteira. Exigir a travessia é o
     que separa a grade de um item azul: nenhum ícone tem 500 px de altura. */
  const azul = i => D[i + 2] > 140 && D[i + 2] - D[i] > 50;
  const eixo = (n, m, ler) => {
    const brutas = [];
    for (let a = 0; a < n; a++) {
      let c = 0;
      for (let bb = 0; bb < m; bb++) if (azul(ler(a, bb))) c++;
      if (c > m * 0.5) brutas.push(a);
    }
    const g = []; let cur = [brutas[0]];
    for (let i = 1; i < brutas.length; i++) {
      if (brutas[i] - brutas[i - 1] <= 2) cur.push(brutas[i]);
      else { g.push(cur); cur = [brutas[i]]; }
    }
    if (cur.length) g.push(cur);
    return g.map(f => ({ ini: f[0], fim: f[f.length - 1] }));
  };
  const vx = eixo(W, H, (x, y) => (y * W + x) * 4);
  const vy = eixo(H, W, (y, x) => (y * W + x) * 4);

  /* As faixas ENTRE as linhas são as células. A borda da imagem conta como
     linha implícita — senão a primeira e a última coluna somem. */
  const faixas = (linhas, tamanho) => {
    const out = [];
    let a = 0;
    for (const l of linhas) { if (l.ini - a >= 8) out.push([a, l.ini]); a = l.fim + 1; }
    if (tamanho - a >= 8) out.push([a, tamanho]);
    return out;
  };
  const cols = faixas(vx, W), rows = faixas(vy, H);

  const tmp = document.createElement('canvas');
  const gt = tmp.getContext('2d', { willReadFrequently: true });
  const saida = document.createElement('canvas');
  /* Uma linha a mais para a nossa arte. */
  saida.width = cols.length * LADO; saida.height = (rows.length + 1) * LADO;
  const gs = saida.getContext('2d', { willReadFrequently: true });
  gs.imageSmoothingEnabled = true; gs.imageSmoothingQuality = 'high';

  /* ── O FUNDO SAI POR PREENCHIMENTO, COM A CHAVE DA PRÓPRIA PEÇA ────────
     Limiar fixo contra material digitalizado acerta a maioria e mente sobre o
     resto — foi o que deixou três pedras com a caixa inteira na folha do jogo.
     O anel de 1 px é fundo por construção; as cores que o dominam são as cores
     do fundo DESTA célula. E o preenchimento é ENCADEADO: entre o cinza e a
     borda do ícone há uma rampa de compressão que nenhuma chave casa. */
  const limpar = (d, w, h) => {
    const anel = [];
    for (let x = 0; x < w; x++) anel.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y++) anel.push([0, y], [w - 1, y]);
    const conta = new Map(); let vivos = 0;
    for (const [x, y] of anel) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 24) continue;
      vivos++;
      const k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4);
      const e = conta.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
      conta.set(k, e);
    }
    const piso = Math.max(3, Math.round(vivos * 0.10));
    const chaves = [...conta.values()].filter(e => e.n >= piso)
      .map(e => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]);
    if (!chaves.length) return;
    const TOL = 30, SUAVE = 26;
    const perto = (i, j, t) =>
      Math.abs(d[i] - d[j]) <= t && Math.abs(d[i + 1] - d[j + 1]) <= t &&
      Math.abs(d[i + 2] - d[j + 2]) <= t;
    const chave = i => chaves.some(k =>
      Math.abs(d[i] - k[0]) <= TOL && Math.abs(d[i + 1] - k[1]) <= TOL &&
      Math.abs(d[i + 2] - k[2]) <= TOL);
    const visto = new Uint8Array(w * h);
    const fila = [];
    for (let x = 0; x < w; x++) { fila.push([x, 0, -1], [x, h - 1, -1]); }
    for (let y = 0; y < h; y++) { fila.push([0, y, -1], [w - 1, y, -1]); }
    while (fila.length) {
      const [x, y, veio] = fila.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const k = y * w + x;
      if (visto[k]) continue;
      const i = k * 4;
      const vazio = d[i + 3] < 24;
      if (!vazio && !chave(i) && !(veio >= 0 && d[veio + 3] >= 24 && perto(i, veio, SUAVE))) continue;
      visto[k] = 1;
      const cor = vazio ? veio : i;
      if (!vazio) d[i + 3] = 0;
      fila.push([x + 1, y, cor], [x - 1, y, cor], [x, y + 1, cor], [x, y - 1, cor]);
    }
  };

  const rel = [];
  for (let ry = 0; ry < rows.length; ry++)
    for (let cx = 0; cx < cols.length; cx++) {
      const [x0, x1] = cols[cx], [y0, y1] = rows[ry];
      const cw = x1 - x0, ch = y1 - y0;
      tmp.width = cw; tmp.height = ch;
      gt.clearRect(0, 0, cw, ch);
      gt.drawImage(fonte, x0, y0, cw, ch, 0, 0, cw, ch);
      const img = gt.getImageData(0, 0, cw, ch);
      limpar(img.data, cw, ch);
      gt.putImageData(img, 0, 0);

      const d = img.data;
      let ax = 1e9, ay = 1e9, bx = -1, by = -1, op = 0;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        if (d[(y * cw + x) * 4 + 3] < 24) continue;
        op++;
        if (x < ax) ax = x; if (x > bx) bx = x;
        if (y < ay) ay = y; if (y > by) by = y;
      }
      const idx = ry * cols.length + cx;
      if (bx < 0 || op < 12) { rel.push({ idx, vazio: true }); continue; }
      const lw = bx - ax + 1, lh = by - ay + 1;
      /* NUNCA AMPLIA. Reduzir desfaz o esticamento da fonte; ampliar de volta
         desfaria o conserto. Ícone que já cabe fica no tamanho que tem. */
      const esc = Math.min((LADO * OCUPACAO) / lw, (LADO * OCUPACAO) / lh, 1);
      const w2 = Math.max(1, Math.round(lw * esc)), h2 = Math.max(1, Math.round(lh * esc));
      gs.drawImage(tmp, ax, ay, lw, lh,
        cx * LADO + Math.round((LADO - w2) / 2), ry * LADO + Math.round((LADO - h2) / 2), w2, h2);
      rel.push({ idx, op });
    }

  /* A NOSSA ARTE, no comeco da linha extra. Vetor rasteriza grande e reduz —
     de 192 para 32 da borda limpa; desenhar direto em 32 da escada. */
  const base = rows.length * cols.length;
  for (const [k, item] of NOSSOS.entries()) {
    const im2 = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = item.dados;
    });
    const A = item.p.endsWith('.svg') ? 192 : Math.max(im2.naturalWidth, 1);
    const esc2 = document.createElement('canvas');
    esc2.width = A; esc2.height = A;
    esc2.getContext('2d').drawImage(im2, 0, 0, A, A);
    const g2 = esc2.getContext('2d', { willReadFrequently: true });
    const dd = g2.getImageData(0, 0, A, A).data;
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < A; y++) for (let x = 0; x < A; x++)
      if (dd[(y * A + x) * 4 + 3] >= 24) {
        if (x < ax) ax = x; if (x > bx) bx = x;
        if (y < ay) ay = y; if (y > by) by = y;
      }
    if (bx < 0) continue;
    const lw2 = bx - ax + 1, lh2 = by - ay + 1;
    const e2 = Math.min((LADO * OCUPACAO) / lw2, (LADO * OCUPACAO) / lh2);
    const w3 = Math.max(1, Math.round(lw2 * e2)), h3 = Math.max(1, Math.round(lh2 * e2));
    const cx2 = (base + k) % cols.length, ry2 = Math.floor((base + k) / cols.length);
    gs.drawImage(esc2, ax, ay, lw2, lh2,
      cx2 * LADO + Math.round((LADO - w3) / 2), ry2 * LADO + Math.round((LADO - h3) / 2), w3, h3);
  }

  return { png: saida.toDataURL('image/png'), cols: cols.length, rows: rows.length + 1,
           nossos: NOSSOS.length, base,
           cheias: rel.filter(x => !x.vazio).length, total: rel.length };
}, { dados, NOSSOS, LADO, OCUPACAO });

mkdirSync(join(RAIZ, 'assets/icones'), { recursive: true });
writeFileSync(join(RAIZ, 'assets/icones/itens.png'),
  Buffer.from(r.png.split(',')[1], 'base64'));
await b.close();

console.log(`grade da fonte: ${r.cols} colunas × ${r.rows} linhas = ${r.total} células`);
console.log(`${r.cheias} com ícone · ${r.total - r.cheias} vazias`);
console.log(`saída: ${r.cols * LADO}×${r.rows * LADO}, células de ${LADO}px → assets/icones/itens.png`);
console.log(`\níndice = linha × ${r.cols} + coluna, na MESMA ordem da folha do dono.`);
