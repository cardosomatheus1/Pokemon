/* CASA CADA ITEM NOMEADO COM A CÉLULA DA FOLHA (bloco 1.12).
 *
 * ── O PROBLEMA, E POR QUE ELE JÁ CUSTOU CARO ─────────────────────────────
 *
 * A folha do dono tem 368 ícones e **nenhum nome**. Os PDFs dele têm 35 itens
 * com nome e função, e as 35 imagens correspondentes — mas soltas, sem dizer
 * onde cada uma mora na folha.
 *
 * Eu já tentei resolver isso duas vezes por POSIÇÃO ("o índice 3 é a Poké
 * Ball") e as duas vezes errei em algum ponto — uma delas eu cheguei a declarar
 * a Poké Ball errada porque o render dela sai alaranjado.
 *
 * > **Identificação por posição é um palpite com aparência de método.**
 *
 * ── O QUE MUDOU, E POR QUE AGORA DÁ ──────────────────────────────────────
 *
 * As duas fontes são a MESMA ARTE. O PDF traz os sprites da Gen 4; a folha
 * traz os mesmos sprites, numa grade. Não é "parecido": é a mesma imagem, em
 * dois recipientes.
 *
 * Então o casamento deixa de ser palpite e vira medição: normaliza os dois
 * lados no mesmo quadro e compara pixel a pixel. A resposta certa fica MUITO
 * abaixo das outras — e essa distância é a prova de que a resposta é a certa.
 *
 * Foi assim que o casamento por cor falhou antes: eu comparava um sprite de
 * Gen 4 com um render 3D do Brilliant Diamond, duas artes diferentes do mesmo
 * objeto. A assinatura não discriminava porque não HAVIA o que discriminar.
 *
 * ── E O RESULTADO É CONFERIDO OLHANDO ────────────────────────────────────
 *
 * A ferramenta grava uma tira com os pares lado a lado — referência do PDF em
 * cima, célula escolhida embaixo — e a distância de cada um. Número que ninguém
 * olhou é número em que ninguém pode confiar, e este é o tipo de trabalho em
 * que um acerto de 34 em 35 parece igual a um acerto de 35 em 35.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';
const DIR_PDF = join(RAIZ, 'tools/previas/_pdf/cor');
const LADO = 32, COLUNAS = 23;

/* A ordem em que os PDFs listam os itens. Ela é a ÚNICA fonte dos nomes, e foi
   lida do texto dos próprios PDFs — não digitada de memória. */
export const ORDEM_DO_PDF = [
  'Fire Stone', 'Water Stone', 'Thunder Stone', 'Leaf Stone', 'Moon Stone',
  'Sun Stone', 'Shiny Stone', 'Dusk Stone', 'Dawn Stone', 'Oval Stone',
  'Choice Specs', 'Choice Band', 'Choice Scarf', 'Focus Band', 'Focus Sash',
  'Life Orb', 'Flame Orb', 'Toxic Orb', 'Leftovers', 'Shell Bell',
  'Muscle Band', 'Wise Glasses', 'Destiny Knot', 'Black Sludge',
  'Icy Rock', 'Smooth Rock', 'Heat Rock', 'Damp Rock',
  'Macho Brace', 'Lucky Egg', 'Exp. Share',
  'Master Ball', 'Ultra Ball', 'Quick Ball', 'Dusk Ball',
];

const arquivos = readdirSync(DIR_PDF).filter(f => /^img-\d+-/.test(f))
  .sort((a, b) => Number(a.slice(4, 6)) - Number(b.slice(4, 6)));
if (arquivos.length !== ORDEM_DO_PDF.length)
  console.warn(`aviso: ${arquivos.length} imagens do PDF para ${ORDEM_DO_PDF.length} nomes`);

const b64 = p => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const refs = arquivos.map((f, i) => ({ nome: ORDEM_DO_PDF[i] ?? `(sem nome ${i})`,
                                       arq: f, dados: b64(join(DIR_PDF, f)) }));
const folha = 'data:image/png;base64,' +
  readFileSync(join(RAIZ, 'assets/icones/itens.png')).toString('base64');

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

const r = await pg.evaluate(async ({ refs, folha, LADO, COLUNAS }) => {
  const carregar = src => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  const F = await carregar(folha);
  const cf = document.createElement('canvas');
  cf.width = F.width; cf.height = F.height;
  const gf = cf.getContext('2d', { willReadFrequently: true });
  gf.drawImage(F, 0, 0);
  const DF = gf.getImageData(0, 0, F.width, F.height).data;
  const linhas = F.height / LADO;

  /* A REFERÊNCIA PASSA PELO MESMO PREPARO QUE A FOLHA: fundo tirado, aparado,
     centrado em 32. Comparar um recorte cru com um normalizado mediria o
     preparo, e não a arte — e o preparo é igual para todos. */
  const tmp = document.createElement('canvas');
  const gt = tmp.getContext('2d', { willReadFrequently: true });
  const prep = document.createElement('canvas');
  prep.width = LADO; prep.height = LADO;
  const gp = prep.getContext('2d', { willReadFrequently: true });

  const preparar = async src => {
    const im = await carregar(src);
    tmp.width = im.width; tmp.height = im.height;
    gt.clearRect(0, 0, im.width, im.height);
    gt.drawImage(im, 0, 0);
    const img = gt.getImageData(0, 0, im.width, im.height);
    const d = img.data, w = im.width, h = im.height;
    /* fundo por preenchimento a partir da borda, chave do próprio anel */
    const anel = [];
    for (let x = 0; x < w; x++) anel.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y++) anel.push([0, y], [w - 1, y]);
    for (let volta = 0; volta < 4; volta++) {
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
      if (!chaves.length) break;
      const perto = (i, j, t) => Math.abs(d[i] - d[j]) <= t &&
        Math.abs(d[i + 1] - d[j + 1]) <= t && Math.abs(d[i + 2] - d[j + 2]) <= t;
      const chave = i => chaves.some(k => Math.abs(d[i] - k[0]) <= 30 &&
        Math.abs(d[i + 1] - k[1]) <= 30 && Math.abs(d[i + 2] - k[2]) <= 30);
      const visto = new Uint8Array(w * h); const fila = []; let tirou = 0;
      for (let x = 0; x < w; x++) fila.push([x, 0, -1], [x, h - 1, -1]);
      for (let y = 0; y < h; y++) fila.push([0, y, -1], [w - 1, y, -1]);
      while (fila.length) {
        const [x, y, veio] = fila.pop();
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const k = y * w + x; if (visto[k]) continue;
        const i = k * 4; const vazio = d[i + 3] < 24;
        if (!vazio && !chave(i) && !(veio >= 0 && d[veio + 3] >= 24 && perto(i, veio, 26))) continue;
        visto[k] = 1; const cor = vazio ? veio : i;
        if (!vazio) { d[i + 3] = 0; tirou++; }
        fila.push([x + 1, y, cor], [x - 1, y, cor], [x, y + 1, cor], [x, y - 1, cor]);
      }
      if (!tirou) break;
    }
    gt.putImageData(img, 0, 0);
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] >= 24) {
        if (x < ax) ax = x; if (x > bx) bx = x;
        if (y < ay) ay = y; if (y > by) by = y;
      }
    gp.clearRect(0, 0, LADO, LADO);
    if (bx < 0) return gp.getImageData(0, 0, LADO, LADO).data.slice();
    const lw = bx - ax + 1, lh = by - ay + 1;
    const esc = Math.min((LADO * 0.94) / lw, (LADO * 0.94) / lh);
    const w2 = Math.max(1, Math.round(lw * esc)), h2 = Math.max(1, Math.round(lh * esc));
    gp.imageSmoothingEnabled = true; gp.imageSmoothingQuality = 'high';
    gp.drawImage(tmp, ax, ay, lw, lh,
      Math.round((LADO - w2) / 2), Math.round((LADO - h2) / 2), w2, h2);
    return gp.getImageData(0, 0, LADO, LADO).data.slice();
  };

  /* A DISTÂNCIA. Só onde ao menos um dos dois tem tinta: comparar transparente
     com transparente premiaria ícones pequenos, que têm mais vazio em comum. */
  const distancia = (A, B) => {
    let soma = 0, n = 0;
    for (let i = 0; i < A.length; i += 4) {
      const aA = A[i + 3] > 40, aB = B[i + 3] > 40;
      if (!aA && !aB) continue;
      n++;
      if (aA !== aB) { soma += 110; continue; }
      soma += (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) +
               Math.abs(A[i + 2] - B[i + 2])) / 3;
    }
    return n ? soma / n : 1e9;
  };

  /* ── OS DOIS LADOS SAO RENORMALIZADOS NO MESMO QUADRO ──────────────────
     A folha NAO amplia icone pequeno — de proposito, para nao reamostrar duas
     vezes. Entao uma celula pode ter 24 px de conteudo e a referencia, 30. A
     primeira versao deste casamento comparava os dois assim, e a distancia
     media ficou em ~95 com margens de meio ponto: eu estava medindo TAMANHO, e
     nao desenho.

     Aparar e escalar ambos para o mesmo quadro tira o tamanho da conta e deixa
     so a forma e a cor — que e o que distingue um item do outro. */
  const CMP = 16;
  const cmpA = document.createElement('canvas'); cmpA.width = CMP; cmpA.height = CMP;
  const gA = cmpA.getContext('2d', { willReadFrequently: true });
  const renorm = (arr) => {
    const t = document.createElement('canvas'); t.width = LADO; t.height = LADO;
    t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(arr), LADO, LADO), 0, 0);
    let ax = 1e9, ay = 1e9, bx = -1, by = -1;
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++)
      if (arr[(y * LADO + x) * 4 + 3] >= 40) {
        if (x < ax) ax = x; if (x > bx) bx = x;
        if (y < ay) ay = y; if (y > by) by = y;
      }
    gA.clearRect(0, 0, CMP, CMP);
    if (bx < 0) return gA.getImageData(0, 0, CMP, CMP).data.slice();
    gA.imageSmoothingEnabled = true; gA.imageSmoothingQuality = 'high';
    gA.drawImage(t, ax, ay, bx - ax + 1, by - ay + 1, 0, 0, CMP, CMP);
    return gA.getImageData(0, 0, CMP, CMP).data.slice();
  };

  const celula = idx => {
    const sx = (idx % COLUNAS) * LADO, sy = Math.floor(idx / COLUNAS) * LADO;
    return renorm(gf.getImageData(sx, sy, LADO, LADO).data);
  };
  const total = COLUNAS * linhas;
  const cache = [];
  for (let i = 0; i < total; i++) cache.push(celula(i));

  const fora = [];
  for (const ref of refs) {
    const A = renorm(await preparar(ref.dados));
    let melhor = -1, d1 = 1e9, d2 = 1e9;
    for (let i = 0; i < total; i++) {
      const d = distancia(A, cache[i]);
      if (d < d1) { d2 = d1; d1 = d; melhor = i; }
      else if (d < d2) d2 = d;
    }
    fora.push({ nome: ref.nome, idx: melhor, d: +d1.toFixed(1), segundo: +d2.toFixed(1),
                folga: +(d2 - d1).toFixed(1) });
  }

  /* A TIRA DE CONFERÊNCIA: referência em cima, escolha embaixo. */
  const K = 4, POR = 12;
  const alt = Math.ceil(fora.length / POR);
  const c = document.createElement('canvas');
  c.width = POR * LADO * K; c.height = alt * (2 * LADO * K + 34);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#141c26'; g.fillRect(0, 0, c.width, c.height);
  for (const [i, o] of fora.entries()) {
    const dx = (i % POR) * LADO * K, dy = Math.floor(i / POR) * (2 * LADO * K + 34);
    const A = renorm(await preparar(refs[i].dados));
    const pin = (arr, ox, oy) => {
      const t2 = document.createElement('canvas'); t2.width = CMP; t2.height = CMP;
      t2.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(arr), CMP, CMP), 0, 0);
      g.drawImage(t2, 0, 0, CMP, CMP, ox, oy, LADO * K, LADO * K);
    };
    g.fillStyle = '#0d141d'; g.fillRect(dx, dy, LADO * K, 2 * LADO * K);
    pin(A, dx, dy);
    pin(cache[o.idx], dx, dy + LADO * K);
    g.fillStyle = o.folga > 12 ? '#7fe' : '#ffb3bb';
    g.font = 'bold 11px monospace';
    g.fillText(`${o.idx} d${o.d} +${o.folga}`, dx + 3, dy + 2 * LADO * K + 13);
    g.fillStyle = '#cfe'; g.font = '10px sans-serif';
    g.fillText(o.nome.slice(0, 18), dx + 3, dy + 2 * LADO * K + 27);
  }
  return { fora, png: c.toDataURL('image/png'), total };
}, { refs, folha, LADO, COLUNAS });

mkdirSync(join(RAIZ, 'tools/previas/_itens'), { recursive: true });
writeFileSync(join(RAIZ, 'tools/previas/_itens/casamento.png'),
  Buffer.from(r.png.split(',')[1], 'base64'));
writeFileSync(join(RAIZ, 'tools/previas/_itens/casamento.json'),
  JSON.stringify(r.fora, null, 1));
await b.close();

console.log(`${r.fora.length} itens contra ${r.total} células\n`);
console.log('idx   dist  folga  item');
for (const o of r.fora)
  console.log(String(o.idx).padStart(3), String(o.d).padStart(7), String(o.folga).padStart(6),
              ' ', o.nome, o.folga <= 12 ? '  ← FOLGA PEQUENA, confira' : '');

const duplicados = r.fora.map(o => o.idx).filter((v, i, a) => a.indexOf(v) !== i);
if (duplicados.length)
  console.log('\nDOIS ITENS NA MESMA CÉLULA: ' + [...new Set(duplicados)].join(', ') +
    '\nUm deles está errado — a folha não tem o mesmo ícone duas vezes.');
console.log('\nconfira olhando: tools/previas/_itens/casamento.png');
