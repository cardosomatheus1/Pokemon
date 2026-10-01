/* OS ÍCONES DE ITEM EM ALTA RESOLUÇÃO (bloco 1.30 · L-137).
 *
 *   node tools/itens-hd.mjs --baixar   baixa as fontes de 160 px para assets/icones/itens-sv/
 *   node tools/itens-hd.mjs            monta a folha e regrava o que depende dela
 *
 * ── O QUE O DONO PEDIU, E POR QUE A FOLHA VELHA NÃO CHEGAVA LÁ ────────────
 *
 *   > "eu quero nesse mesmo padrão: ícone do item com qualidade e limpo"
 *
 * O padrão que ele aprovou eram PNG de 160×160, com fundo transparente. A folha
 * de 32 px veio de um JPEG de pixel art já ampliada: o `normalizar-itens.mjs`
 * tirou o ruído, mas 32 px é o teto daquela fonte — e a tela pede 64 e 96.
 *
 * A fonte que casa com o padrão dele é a do Serebii para Scarlet/Violet:
 * `serebii.net/itemdex/sprites/sv/<nome>.png`, 160×160, alfa limpo. Cobre 40
 * dos 41 itens da franquia que o catálogo usa; a Macho Brace não existe no
 * jogo novo e vem do conjunto PGL do mesmo site (80 px). Elo, Essência e
 * PokéCoin são arte NOSSA, de `arte/`, e passam pelo mesmo recorte.
 *
 * ── A MESMA GRADE, TRÊS VEZES MAIS DENSA ─────────────────────────────────
 *
 * A folha nova tem as MESMAS 23 colunas × 17 linhas, com casas de 96 px em vez
 * de 32. O índice de cada item no catálogo não muda, e o recorte por CSS também
 * não: ele fala em pixel de TELA (`itens-icone.mjs`), e a imagem só ficou mais
 * densa. As casas que o jogo não usa saem da folha velha ampliada 3× por vizinho
 * mais próximo — ninguém as vê, e a grade continua inteira. A folha de 32 px
 * fica guardada em `assets/icones/itens-32.png`, como ENTRADA desta ferramenta.
 *
 * Cada fonte é APARADA no alfa e centrada ocupando 88% da casa — o mesmo recorte
 * para toda peça, venha de onde vier (a lição do `montar-itens-nomeados.mjs`:
 * regra aplicada a uma fonte só não é regra).
 *
 * ── O QUE DEPENDE DA FOLHA, E É REGRAVADO JUNTO ──────────────────────────
 *
 *   app/modules/bola-cores.mjs   a cor de cada bola, amostrada do ícone (a
 *                                mesma conta do `folha-captura.mjs`, na casa
 *                                de 96): a Poké Ball era laranja porque o
 *                                ícone velho era
 *   assets/icones/bola-captura.png  a linha da Poké Ball na tira da captura foi
 *                                pintada com aquele laranja: o laranja vira o
 *                                vermelho novo, pixel a pixel, com a mesma luz
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = join(RAIZ, 'assets/icones/itens-sv');
const BASE = 'https://www.serebii.net/itemdex/sprites/';

/* id do catálogo → caminho no Serebii. A tabela mora AQUI, e não no pack: é o
   endereço de uma fonte de terceiros, e não um dado do jogo. */
export const FONTES = {
  fogo: 'sv/firestone', agua: 'sv/waterstone', trovao: 'sv/thunderstone', folha: 'sv/leafstone',
  lua: 'sv/moonstone', sol: 'sv/sunstone', brilho: 'sv/shinystone', crepusculo: 'sv/duskstone',
  aurora: 'sv/dawnstone', oval: 'sv/ovalstone',
  leftovers: 'sv/leftovers', shellbell: 'sv/shellbell', muscleband: 'sv/muscleband', wiseglasses: 'sv/wiseglasses',
  destinyknot: 'sv/destinyknot', blacksludge: 'sv/blacksludge', icyrock: 'sv/icyrock', smoothrock: 'sv/smoothrock',
  heatrock: 'sv/heatrock', damprock: 'sv/damprock', lifeorb: 'sv/lifeorb', flameorb: 'sv/flameorb',
  toxicorb: 'sv/toxicorb', luckyegg: 'sv/luckyegg', expshare: 'sv/exp.share', machobrace: 'pgl/machobrace',
  choiceband: 'sv/choiceband', choicespecs: 'sv/choicespecs', choicescarf: 'sv/choicescarf',
  focusband: 'sv/focusband', focussash: 'sv/focussash',
  quick: 'sv/quickball', dusk: 'sv/duskball', mestra: 'sv/masterball', poke: 'sv/pokeball',
  great: 'sv/greatball', ultra: 'sv/ultraball',
  pocao: 'sv/potion', superpocao: 'sv/superpotion', hiperpocao: 'sv/hyperpotion', pocaomaxima: 'sv/maxpotion',
};
/* A arte NOSSA, que entra pelo mesmo recorte. */
const NOSSAS = { elo: 'arte/itens/elo.svg', essencia: 'arte/itens/essencia.svg', pokecoin: 'arte/moedas/pokecoin.png' };

if (process.argv.includes('--baixar')) {
  mkdirSync(PASTA, { recursive: true });
  for (const [id, caminho] of Object.entries(FONTES)) {
    const r = await fetch(`${BASE}${caminho}.png`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/png')) throw new Error(`a fonte de "${id}" não veio: ${r.status} ${BASE}${caminho}.png`);
    writeFileSync(join(PASTA, `${id}.png`), Buffer.from(await r.arrayBuffer()));
  }
  console.log(`  ${Object.keys(FONTES).length} fontes em assets/icones/itens-sv/`);
  process.exit(0);
}

const { LADO, COLUNAS, LINHAS, RESOLUCAO } = await import(pathToFileURL(join(RAIZ, 'app/modules/itens-icone.mjs')).href);
const { default: PACK } = await import(pathToFileURL(join(RAIZ, 'content/escolhido.mjs')).href);
const CASA = Object.fromEntries((PACK.catalogo ?? []).filter(i => Number.isInteger(i.icone)).map(i => [i.id, i.icone]));
const CELA = LADO * RESOLUCAO, OCUPACAO = 0.88;

const mime = p => (p.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
const dados = p => `data:${mime(p)};base64,${readFileSync(join(RAIZ, p)).toString('base64')}`;
const pecas = [];
for (const id of Object.keys(FONTES)) {
  const p = `assets/icones/itens-sv/${id}.png`;
  if (!existsSync(join(RAIZ, p))) throw new Error(`falta a fonte de "${id}" — rode com --baixar`);
  if (!Number.isInteger(CASA[id])) throw new Error(`o catálogo não declara a casa de "${id}"`);
  pecas.push({ id, casa: CASA[id], src: dados(p) });
}
for (const [id, p] of Object.entries(NOSSAS)) pecas.push({ id, casa: CASA[id], src: dados(p) });

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME });
const pg = await b.newPage();
await pg.goto('about:blank');
const r = await pg.evaluate(async ({ pecas, folhaVelha, tira, LADO, COLUNAS, LINHAS, CELA, OCUPACAO }) => {
  const carregar = src => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error(src.slice(0, 40))); i.src = src; });
  const c = document.createElement('canvas');
  c.width = COLUNAS * CELA; c.height = LINHAS * CELA;
  const g = c.getContext('2d');
  /* a grade inteira primeiro, da folha velha ampliada por vizinho */
  g.imageSmoothingEnabled = false;
  g.drawImage(await carregar(folhaVelha), 0, 0, COLUNAS * LADO, LINHAS * LADO, 0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (const p of pecas) {
    const img = await carregar(p.src);
    /* aparar no alfa: desenha grande, acha a caixa do que não é transparente */
    const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tg = t.getContext('2d'); tg.drawImage(img, 0, 0, w, h);
    const d = tg.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) throw new Error(`a peça "${p.id}" é toda transparente`);
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = (CELA * OCUPACAO) / Math.max(bw, bh);
    const cx = (p.casa % COLUNAS) * CELA, cy = Math.floor(p.casa / COLUNAS) * CELA;
    g.clearRect(cx, cy, CELA, CELA);
    g.drawImage(t, x0, y0, bw, bh, cx + (CELA - bw * k) / 2, cy + (CELA - bh * k) / 2, bw * k, bh * k);
  }
  /* A COR DE CADA BOLA — a conta do `folha-captura.mjs`, na casa nova: a cor
     MAIS FREQUENTE da metade de cima do ícone, sem contorno e sem branco. */
  const corDe = casa => {
    const cx = (casa % COLUNAS) * CELA, cy = Math.floor(casa / COLUNAS) * CELA;
    const d = g.getImageData(cx, cy, CELA, Math.floor(CELA * 0.42)).data;
    const conta = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const [r, gg, bl, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 200) continue;
      const luz = (r + gg + bl) / 3;
      if (luz < 40 || luz > 225) continue;
      const k = `${r >> 3},${gg >> 3},${bl >> 3}`;
      const v = conta.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      v.n++; v.r += r; v.g += gg; v.b += bl; conta.set(k, v);
    }
    let m = null; for (const v of conta.values()) if (!m || v.n > m.n) m = v;
    return m ? [Math.round(m.r / m.n), Math.round(m.g / m.n), Math.round(m.b / m.n)] : null;
  };
  const cores = Object.fromEntries(pecas.filter(p => ['poke', 'great', 'ultra'].includes(p.id)).map(p => [p.id, corDe(p.casa)]));
  /* A TIRA DA CAPTURA: a linha da Poké Ball (a primeira) foi pintada com o
     laranja velho. Cada pixel perto dele vira o vermelho novo com a mesma luz
     relativa — o contorno, o branco e as outras linhas não se mexem. */
  const ti = await carregar(tira);
  const tc = document.createElement('canvas'); tc.width = ti.naturalWidth; tc.height = ti.naturalHeight;
  const tg = tc.getContext('2d'); tg.drawImage(ti, 0, 0);
  const linha = tc.height / 3, td = tg.getImageData(0, 0, tc.width, linha);
  const VELHO = [0xf4, 0x8d, 0x3a], novo = cores.poke;
  let trocados = 0;
  for (let i = 0; i < td.data.length; i += 4) {
    if (td.data[i + 3] < 8) continue;
    const [r, gg, bl] = [td.data[i], td.data[i + 1], td.data[i + 2]];
    /* perto do laranja em MATIZ: vermelho alto, azul bem abaixo do verde */
    if (!(r > 150 && gg > 60 && gg < 200 && bl < gg - 30 && r - bl > 120)) continue;
    const luz = (r + gg + bl) / (VELHO[0] + VELHO[1] + VELHO[2]);
    td.data[i] = Math.min(255, Math.round(novo[0] * luz));
    td.data[i + 1] = Math.min(255, Math.round(novo[1] * luz));
    td.data[i + 2] = Math.min(255, Math.round(novo[2] * luz));
    trocados++;
  }
  tg.putImageData(td, 0, 0);
  return { folha: c.toDataURL('image/png'), tira: tc.toDataURL('image/png'), cores, trocados, w: c.width, h: c.height };
}, { pecas, folhaVelha: dados('assets/icones/itens-32.png'), tira: dados('assets/icones/bola-captura.png'), LADO, COLUNAS, LINHAS, CELA, OCUPACAO });
await b.close();

/* A ENTRADA é a folha de 32 px guardada à parte (\`itens-32.png\`), e a saída
   é a \`itens.png\`: rodar de novo nunca amplia o que já foi ampliado. */
writeFileSync(join(RAIZ, 'assets/icones/itens.png'), Buffer.from(r.folha.split(',')[1], 'base64'));
writeFileSync(join(RAIZ, 'assets/icones/bola-captura.png'), Buffer.from(r.tira.split(',')[1], 'base64'));
const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
writeFileSync(join(RAIZ, 'app/modules/bola-cores.mjs'),
`/* GERADO por \`tools/itens-hd.mjs\` (bloco 1.30) — não editar à mão.
 *
 * A cor de cada bola, amostrada do ícone que o jogo usa
 * (\`assets/icones/itens.png\`, nas casas que o catálogo do pack declara): a
 * mais frequente da metade de cima, sem contorno e sem branco. Antes do 1.30
 * a Poké Ball dava laranja porque o ícone velho era laranja.
 */
export const CORES_DA_BOLA = {
  poke: '${hex(r.cores.poke)}',
  great: '${hex(r.cores.great)}',
  ultra: '${hex(r.cores.ultra)}',
};
export const corDaBola = id => CORES_DA_BOLA[id] ?? CORES_DA_BOLA.poke;
`);
console.log(`  assets/icones/itens.png ${r.w}×${r.h} · ${pecas.length} peças em alta`);
console.log(`  cores: ${Object.entries(r.cores).map(([k, v]) => `${k} ${hex(v)}`).join(' · ')}`);
console.log(`  bola-captura.png: ${r.trocados} pixels do laranja velho viraram o vermelho novo`);
