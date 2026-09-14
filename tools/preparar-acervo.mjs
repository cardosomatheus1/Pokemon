/* PREPARAR O ACERVO — deriva avatares e cenários a partir das fontes.
 *
 * ── POR QUE ISTO É UM SCRIPT VERSIONADO, E NÃO UM RECORTE À MÃO ────────────
 *
 * Mesma razão do `preparar-arte-arena.mjs` (R17): a arte derivada entra no
 * repositório, mas quem explica de onde ela veio é o script. Sem ele, daqui a
 * um ano ninguém sabe por que o Gengar está descontornado e o Snorlax não, nem
 * como refazer se a fonte melhorar.
 *
 * ── ZERO DEPENDÊNCIA ──────────────────────────────────────────────────────
 *
 * O projeto não tem biblioteca de imagem e não vai ter. Tem Chromium, que é o
 * mesmo do portão Q5: `drawImage` num canvas recorta e redimensiona,
 * `getImageData` dá o pixel, `toDataURL` devolve o arquivo. É a mesma saída do
 * `reencodar-baseline.mjs`.
 *
 * ── MODOS ─────────────────────────────────────────────────────────────────
 *
 *   node tools/preparar-acervo.mjs --sondar    mede as fontes e não escreve nada
 *   node tools/preparar-acervo.mjs             deriva tudo para arte/acervo/
 *   node tools/preparar-acervo.mjs coliseu     deriva só um id
 *
 * `--sondar` é o que produziu os números citados no `acervo-dados.mjs`. Ele
 * existe para que o campo `recorte` de cada avatar seja uma MEDIÇÃO conferível
 * e não um palpite — e para que, entrando fonte nova, a pergunta "dá para
 * remover o fundo desta?" tenha resposta em vez de opinião.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  AVATARES_ARTE, CENAS_ARTE, DIR_ACERVO, TAM_AVATAR, TAM_BANNER,
  arquivoAvatar, arquivoCena,
} from '../app/modules/acervo-dados.mjs';
import { FONTES_AVATAR, FONTES_CENA } from './acervo-fontes.mjs';

/* O catálogo do app diz o QUE existe; `acervo-fontes` diz DE ONDE veio e COMO
   recortar. A esteira precisa dos dois juntos, e é o único lugar que precisa. */
const AVATARES = AVATARES_ARTE.map(a => ({ ...a, ...FONTES_AVATAR[a.id] }));
const CENAS    = CENAS_ARTE.map(c => ({ ...c, ...FONTES_CENA[c.id] }));

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = `${RAIZ}/${DIR_ACERVO}/origem`;

/* A pasta de onde as fontes chegam na máquina do dono do projeto. Só é lida
   quando falta fonte em `origem/` — depois de copiadas uma vez, o repositório
   basta e o script roda em qualquer clone. */
const ENTREGA = process.env.ACERVO_ENTREGA ||
  'C:/Users/gdult/OneDrive/Documentos/PokeArena/Artes BANNERS, avatar etc';

/* Os nomes entregues trazem `²`. Fora do Windows isso vira armadilha de
   codificação — o mesmo arquivo com dois bytes diferentes, dependendo de quem
   copiou. As fontes entram no repositório NORMALIZADAS para ASCII. */
const normalizar = n => n.replace(/\u00b2/g, '2');

function garantirFontes() {
  mkdirSync(ORIGEM, { recursive: true });
  const querem = [...AVATARES, ...CENAS].map(x => x.fonte);
  const faltam = querem.filter(f => !existsSync(`${ORIGEM}/${f}`));
  if (!faltam.length) return;
  if (!existsSync(ENTREGA))
    throw new Error(`faltam ${faltam.length} fonte(s) em ${DIR_ACERVO}/origem e ` +
      `a pasta de entrega não existe: ${ENTREGA}\n  ` + faltam.join('\n  '));
  const naEntrega = new Map(readdirSync(ENTREGA).map(n => [normalizar(n), n]));
  for (const f of faltam) {
    const cru = naEntrega.get(f);
    if (!cru) throw new Error(`fonte não encontrada nem em origem/ nem na entrega: ${f}`);
    copyFileSync(`${ENTREGA}/${cru}`, `${ORIGEM}/${f}`);
    console.log(`  copiada  ${cru}${f}`);
  }
}

/* ─── o lado do navegador ─────────────────────────────────────────────────
 *
 * Tudo que precisa de pixel roda lá dentro. As funções abaixo são o texto que
 * é injetado, e por isso são autocontidas: nada de import, nada de fechamento
 * sobre variável do Node.
 */
const NO_NAVEGADOR = `
function carregar(dados, mime) {
  return new Promise(async (ok, falha) => {
    const img = new Image();
    img.onerror = () => falha(new Error('a fonte não decodifica'));
    img.onload = async () => { await img.decode(); ok(img); };
    img.src = 'data:image/' + mime + ';base64,' + dados;
  });
}

function pegar(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  return { c, cx, d: cx.getImageData(0, 0, c.width, c.height) };
}

/* Preenchimento a partir das QUATRO BORDAS, com dois limiares.
 *
 * O relativo (entre vizinhos) é o que atravessa DEGRADÊ: dois pixels de fundo
 * colados diferem pouco mesmo quando o degradê inteiro varia muito. Sozinho
 * ele vazaria para dentro de um personagem com sombreado suave — por isso o
 * absoluto, contra a cor de onde a semente saiu, segura a caminhada.
 *
 * O contorno escuro do desenho é o que de fato para o preenchimento; os dois
 * limiares existem para o caso de não haver contorno. */
function removerFundo(d, W, H, TOL_VIZ, TOL_ABS) {
  const p = d.data, idx = (x, y) => (y * W + x) * 4;
  const dist = (a, b) => Math.max(Math.abs(p[a]-p[b]), Math.abs(p[a+1]-p[b+1]), Math.abs(p[a+2]-p[b+2]));
  const fora = new Uint8Array(W * H);
  const pilha = [];
  const semear = (x, y) => { const i = idx(x, y); pilha.push([x, y, i]); };
  for (let x = 0; x < W; x++) { semear(x, 0); semear(x, H - 1); }
  for (let y = 0; y < H; y++) { semear(0, y); semear(W - 1, y); }
  /* a cor de referência absoluta é a do canto, e não a média do anel: média de
     anel que tem personagem encostado não é cor de fundo nenhuma */
  const ref = idx(0, 0);
  while (pilha.length) {
    const [x, y, de] = pilha.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = idx(x, y);
    if (fora[y * W + x]) continue;
    if (dist(i, de) > TOL_VIZ) continue;
    if (dist(i, ref) > TOL_ABS) continue;
    fora[y * W + x] = 1;
    pilha.push([x+1, y, i], [x-1, y, i], [x, y+1, i], [x, y-1, i]);
  }
  /* Alfa em dois passos. O corte seco deixa auréola porque a borda do desenho
     em JPEG é ANTISSERRILHADA: existe uma fileira de pixels meio-fundo que não
     passou no limiar e ficou opaca. O segundo passo dá alfa parcial a quem tem
     vizinho removido — sem isso o avatar ganha um contorno claro visível em
     cima de painel escuro. */
  for (let i = 0; i < W * H; i++) if (fora[i]) p[i * 4 + 3] = 0;
  const suave = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (fora[k]) continue;
    let n = 0;
    if (x > 0 && fora[k-1]) n++;
    if (x < W-1 && fora[k+1]) n++;
    if (y > 0 && fora[k-W]) n++;
    if (y < H-1 && fora[k+W]) n++;
    if (n) suave[k] = Math.max(0, 255 - n * 72);
  }
  for (let i = 0; i < W * H; i++) if (suave[i]) p[i * 4 + 3] = suave[i];
  return fora;
}

/* A caixa do que sobrou opaco. Sem ela o quadrado sairia centrado na IMAGEM, e
   um personagem que não está no meio da fonte apareceria torto no avatar. */
function caixaOpaca(d, W, H, LIM) {
  const p = d.data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (p[(y * W + x) * 4 + 3] > LIM) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/* O quadrado que envolve a caixa, com folga, preso dentro da imagem. */
function quadradoDe(cx0, cy0, lado, W, H) {
  const l = Math.min(lado, Math.min(W, H));
  let x = Math.round(cx0 - l / 2), y = Math.round(cy0 - l / 2);
  x = Math.max(0, Math.min(W - l, x));
  y = Math.max(0, Math.min(H - l, y));
  return { x, y, l };
}
`;

async function abrir() {
  const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
  if (!PW || !CHROME) {
    console.error('PW_MODULO e PW_CHROME precisam apontar para o playwright-core e o Chromium.');
    console.error('ver tools/README.md — o Playwright mora FORA do repositório.');
    process.exit(1);
  }
  const { chromium } = await import(pathToFileURL(PW).href);
  const nav = await chromium.launch({ executablePath: CHROME });
  const pg = await nav.newPage();
  await pg.addScriptTag({ content: NO_NAVEGADOR });
  return { nav, pg };
}

const b64De = f => readFileSync(`${ORIGEM}/${f}`).toString('base64');
const mimeDe = f => (f.endsWith('.png') ? 'png' : 'jpeg');

/* ─── sondar ─────────────────────────────────────────────────────────────── */

async function sondar(pg) {
  console.log('anel de borda · alfa que já vem · quanto o preenchimento alcança · ' +
              'risco de comer o desenho\n');
  for (const a of AVATARES) {
    const r = await pg.evaluate(async ({ dados, mime }) => {
      const img = await carregar(dados, mime);
      const { d } = pegar(img);
      const W = img.naturalWidth, H = img.naturalHeight, p = d.data;
      const anel = [];
      const at = (x, y) => { const i = (y * W + x) * 4; return [p[i], p[i+1], p[i+2]]; };
      for (let x = 0; x < W; x++) { anel.push(at(x, 0), at(x, H-1)); }
      for (let y = 0; y < H; y++) { anel.push(at(0, y), at(W-1, y)); }
      const med = [0,1,2].map(k => anel.reduce((s, q) => s + q[k], 0) / anel.length);
      const dp = Math.sqrt(anel.reduce((s, q) =>
        s + [0,1,2].reduce((t, k) => t + (q[k] - med[k]) ** 2, 0) / 3, 0) / anel.length);
      /* TRANSPARENTE É ALFA ~0, E NÃO "NÃO-OPACO".
         A primeira versão contava `alfa < 250` e classificou o
         `avatar_shadowgengar2.png` como já-recortado por causa disso: aquele
         arquivo não tem UM pixel vazado — é semitransparente por inteiro,
         59,8% em alfa ~192 e 40,2% em ~224. Contado como recorte, o derivado
         saiu com uma caixa cinza atrás do personagem.
         Medir "não totalmente opaco" e chamar de "recortado" é afirmar a
         palavra em vez da construção. */
      let transp = 0;
      for (let i = 3; i < p.length; i += 4) if (p[i] < 16) transp++;
      const copia = new ImageData(new Uint8ClampedArray(p), W, H);
      const fora = removerFundo(copia, W, H, 12, 60);
      let n = 0; for (let i = 0; i < fora.length; i++) if (fora[i]) n++;
      let risco = 0;
      for (let i = 0; i < W * H; i++)
        if (!fora[i] && Math.max(...[0,1,2].map(k => Math.abs(p[i*4+k] - med[k]))) <= 32) risco++;
      return { dp: +dp.toFixed(1), alfa: +(transp / (W*H) * 100).toFixed(1),
               fundo: +(n / (W*H) * 100).toFixed(1), risco: +(risco / (W*H) * 100).toFixed(1) };
    }, { dados: b64De(a.fonte), mime: mimeDe(a.fonte) });
    /* O veredito é do script, para que o campo do catálogo possa ser CONFERIDO
       e não só lido.
       ALCANCE SOZINHO NÃO DECIDE, e a primeira versão desta regra errava por
       isso. O preenchimento acompanha degradê de propósito — é o que faz o
       `mewbebe` funcionar. A consequência é que ele também caminha pelo CÉU de
       uma cena de pôr do sol: o `lapras` deu 26,5% de alcance, e aqueles 26,5%
       são a arte, não fundo.
       Quem separa os dois casos é o DESVIO DO ANEL DE BORDA. Fundo de verdade é
       uniforme (`gengarninja`: 1,9); cena que encosta na moldura tem borda
       variada (`lapras`: 50, `snorlaxrei`: 74,9). Só há fundo para remover
       quando as duas coisas valem ao mesmo tempo. */
    const sugerido = r.alfa > 5 ? 'alfa'
      : (r.dp < 30 && r.fundo > 20) ? 'fundo' : 'cena';
    const bate = sugerido === a.recorte ? ' ' : '!';
    console.log(`${bate} ${a.id.padEnd(14)} desvio ${String(r.dp).padStart(5)}  ` +
      `alfa ${String(r.alfa).padStart(5)}%  alcança ${String(r.fundo).padStart(5)}%  ` +
      `risco ${String(r.risco).padStart(5)}%   catálogo:${a.recorte}  medido:${sugerido}`);
  }
  console.log('\n`!` marca fonte cujo catálogo discorda da medição.');
}

/* ─── derivar ────────────────────────────────────────────────────────────── */

async function derivarAvatar(pg, a) {
  const b64 = await pg.evaluate(async ({ dados, mime, recorte, foco, tol, zoom, TAM }) => {
    const img = await carregar(dados, mime);
    const W = img.naturalWidth, H = img.naturalHeight;
    const { cx, d } = pegar(img);
    let caixa = null;
    if (recorte === 'fundo') { removerFundo(d, W, H, tol[0], tol[1]); cx.putImageData(d, 0, 0); }
    /* O LIMIAR AQUI É ALTO DE PROPÓSITO (128, e não 8). A borda antisserrilhada
       recebe alfa parcial no suavizador; contá-la como opaca inflaria a caixa
       com a própria sombra do recorte, e o personagem sairia menor e descentrado
       dentro do quadrado. */
    if (recorte === 'fundo' || recorte === 'alfa') caixa = caixaOpaca(d, W, H, 128);

    let q;
    if (caixa) {
      /* 8% de folga em volta do personagem: encostado na borda o avatar fica
         apertado dentro da moldura dourada do perfil. */
      const lado = Math.round(Math.max(caixa.x1 - caixa.x0, caixa.y1 - caixa.y0) * 1.08);
      q = quadradoDe((caixa.x0 + caixa.x1) / 2, (caixa.y0 + caixa.y1) / 2, lado, W, H);
    } else {
      /* `zoom` fecha o enquadramento nas CENAS. Sem ele o quadrado é sempre o
         menor lado inteiro da fonte, e numa arte de corpo inteiro isso põe o
         personagem em 12 dos 66 px que o perfil mostra — a folha de contato
         mostrou exatamente isso no `soneca` e no `mewtwocoro`. */
      q = quadradoDe(W * foco[0] / 100, H * foco[1] / 100, Math.min(W, H) / (zoom || 1), W, H);
    }

    const fonte = document.createElement('canvas');
    fonte.width = W; fonte.height = H;
    fonte.getContext('2d').putImageData(d, 0, 0);

    const saida = document.createElement('canvas');
    saida.width = TAM; saida.height = TAM;
    const sx = saida.getContext('2d');
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(fonte, q.x, q.y, q.l, q.l, 0, 0, TAM, TAM);
    return saida.toDataURL('image/png').split(',')[1];
  }, { dados: b64De(a.fonte), mime: mimeDe(a.fonte), recorte: a.recorte, foco: a.foco,
       tol: a.tol || [12, 60], zoom: a.zoom || 1, TAM: TAM_AVATAR });
  return Buffer.from(b64, 'base64');
}

async function derivarCena(pg, c) {
  const b64 = await pg.evaluate(async ({ dados, mime, TAM }) => {
    const img = await carregar(dados, mime);
    const W = img.naturalWidth, H = img.naturalHeight;
    const [LW, LH] = TAM, alvo = LW / LH;
    /* Corta o EIXO QUE SOBRA, centrado. A escolha fina de enquadramento não é
       feita aqui: ela é `foco`/`faixa` no CSS, que enquadram por caixa. Cortar
       agressivamente no arquivo tiraria essa liberdade de volta. */
    let cw = W, ch = Math.round(W / alvo);
    if (ch > H) { ch = H; cw = Math.round(H * alvo); }
    const cxo = Math.round((W - cw) / 2), cyo = Math.round((H - ch) / 2);
    const saida = document.createElement('canvas');
    saida.width = LW; saida.height = LH;
    const sx = saida.getContext('2d');
    sx.imageSmoothingQuality = 'high';
    sx.drawImage(img, cxo, cyo, cw, ch, 0, 0, LW, LH);
    return saida.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, { dados: b64De(c.fonte), mime: mimeDe(c.fonte), TAM: TAM_BANNER });
  return Buffer.from(b64, 'base64');
}

/* ─── principal ──────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
garantirFontes();
const { nav, pg } = await abrir();

if (args.includes('--sondar')) {
  await sondar(pg);
  await nav.close();
  process.exit(0);
}

const so = args.filter(a => !a.startsWith('--'));
const querAvatar = a => !so.length || so.includes(a.id);
mkdirSync(`${RAIZ}/${DIR_ACERVO}`, { recursive: true });

let n = 0;
for (const a of AVATARES.filter(querAvatar)) {
  const buf = await derivarAvatar(pg, a);
  writeFileSync(`${RAIZ}/${arquivoAvatar(a.id)}`, buf);
  console.log(`avatar  ${a.id.padEnd(14)} ${a.recorte.padEnd(6)} ${(buf.length/1024).toFixed(0).padStart(4)} KB`);
  n++;
}
for (const c of CENAS.filter(querAvatar)) {
  const buf = await derivarCena(pg, c);
  writeFileSync(`${RAIZ}/${arquivoCena(c.id)}`, buf);
  console.log(`cena    ${c.id.padEnd(14)} ${'16:9'.padEnd(6)} ${(buf.length/1024).toFixed(0).padStart(4)} KB`);
  n++;
}
await nav.close();
console.log(`\n${n} arquivo(s) em ${DIR_ACERVO}/`);
