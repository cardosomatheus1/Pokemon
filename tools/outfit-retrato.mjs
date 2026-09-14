/* O RETRATO DO OUTFIT — a arte original, sem o fundo, em alta.
 *
 *   node tools/outfit-retrato.mjs --nome=militar "caminho/trainer_militarcamper.png"
 *   node tools/outfit-retrato.mjs --lote "C:/.../OUTFITS"
 *
 * ── POR QUE O RETRATO É UM ARQUIVO, E NÃO A FOLHA REDUZIDA ────────────────
 *
 * Ideia do dono, 31/08/2026, e ela está certa: na hora de ESCOLHER um traje, ver
 * o boneco andar não informa nada. O andar vai ser o mesmo para todos — o que
 * muda entre um traje e outro é a roupa, e a roupa se lê parada e em alta.
 *
 * Mostrar a folha de 25×52 ali era gastar uma arte de 683 px para desenhar um
 * selo de 78 px. O retrato usa a arte como ela é: chaveia o fundo rosa, apara o
 * vazio, e entrega. A folha continua existindo — ela é para o MUNDO, onde o
 * boneco de fato anda.
 *
 *     retrato   a vitrine. Alta resolução, parado, uma pose.
 *     folha     o mundo. Nove quadros de 25×52, andando.
 *
 * ── A GRADE 3×3 NÃO ERA O PROBLEMA ───────────────────────────────────────
 *
 * O dono mandou descartar as artes quadradas porque "na bancada fica pequeno".
 * A arte estava certa; a bancada é que cortava errado. Uma imagem 2048×2048 traz
 * NOVE células — linha 0 frente, linha 1 perfil andando, linha 2 costas — e cada
 * célula tem ~683 px de lado. É mais material do que os três arquivos separados,
 * não menos.
 *
 * Este arquivo encontra as células pelos vãos vazios (o mesmo `celulas` da
 * esteira) e sabe qual é qual pela POSIÇÃO, que numa grade não é ambígua.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';
const CHROME = process.env.PW_CHROME;

const args = process.argv.slice(2);
const op = Object.fromEntries(args.filter(a => a.startsWith('--'))
  .map(a => a.replace(/^--/, '').split('=')));
let entradas = args.filter(a => !a.startsWith('--'));

if ('lote' in op) {   // `--lote` sem `=` vira {lote: undefined}, e `!== undefined` mentia
  const dir = entradas[0] ?? op.lote;
  entradas = readdirSync(dir).filter(f => /\.(png|jpe?g)$/i.test(f))
    .map(f => join(dir, f)).filter(f => statSync(f).isFile());
}
if (!entradas.length) {
  console.log('uso: node tools/outfit-retrato.mjs [--nome=x] arquivo...');
  console.log('     node tools/outfit-retrato.mjs --lote "pasta"');
  process.exit(1);
}

const tolerancia = Number(op.tolerancia ?? 40);
/* A LARGURA DO RETRATO. 320 px porque o cartão da aba mostra ~150 e as telas de
   2× existem — entregar exatamente o tamanho da tela deixa a arte borrada em
   metade dos monitores, e é o tipo de erro que só aparece na máquina do outro. */
const largura = Number(op.largura ?? 320);

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const comoDados = f => {
  const p = existsSync(join(RAIZ, f)) ? join(RAIZ, f) : f;
  return `data:${MIME[extname(p).toLowerCase()] ?? 'image/png'};base64,` +
         readFileSync(p).toString('base64');
};
const nomeDe = f => (op.nome ?? basename(f, extname(f)))
  .replace(/^trainer[_-]?/i, '').replace(/[0-9]+$/, '')
  .replace(/[^a-z0-9-]/gi, '').toLowerCase();

/* NOME REPETIDO NO LOTE FICA COM O PRIMEIRO ARQUIVO, e não com o último.
 *
 * Os três `trainer_boystandard2/3/4` viram todos "boystandard". Gravando na
 * ordem, o retrato final saía do arquivo 4 — que é o PERFIL. Um guarda-roupa
 * mostrando o traje de lado não está errado por pouco: está mostrando
 * justamente a vista que menos identifica a roupa, e ninguém repara que foi
 * acidente. Fica com o primeiro, que é a frente. */
const vistos = new Set();
entradas = entradas.filter(f => {
  const n = nomeDe(f);
  if (vistos.has(n)) {
    console.log(`  ${n.padEnd(18)} pulado — já saiu de outro arquivo`);
    return false;
  }
  vistos.add(n); return true;
});

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');
const fonte = readFileSync(join(RAIZ, 'app/modules/outfit.mjs'), 'utf8');

for (const arq of entradas) {
  const nome = nomeDe(arq);
  const r = await pg.evaluate(async ({ fonte, dados, tolerancia, largura }) => {
    const mod = await import('data:text/javascript;base64,' +
      btoa(unescape(encodeURIComponent(fonte))));
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dados;
    });
    const { canvas: chaveado, dados: d } = mod.chavear(img, { tolerancia });
    const { cols } = mod.celulas(d, img.width, img.height);
    if (!cols.length) return null;
    /* AS LINHAS SAEM DE DENTRO DA COLUNA 0. Procurar faixa vazia atravessando a
       imagem inteira falha quando o cabelo de uma fileira encosta nos pes da
       outra — e ai as tres fileiras voltam como uma so, sem erro nenhum. */
    const lins = mod.linhasEm(d, img.width, img.height, cols[0]);
    if (!lins.length) return null;

    /* A FRENTE É A PRIMEIRA CÉLULA DA PRIMEIRA LINHA, e numa grade isso não é
       palpite: a linha 0 é a frente, a 1 o perfil, a 2 as costas. Com um único
       arquivo de uma vista só, cols e lins têm um elemento e cai no mesmo lugar. */
    const [x0, x1] = cols[0], [y0, y1] = lins[0];

    /* APARAR até o conteúdo. A célula tem folga em volta; o retrato não pode
       ter, senão o boneco aparece pequeno dentro de uma moldura invisível — que
       foi exatamente a queixa do dono sobre a bancada. */
    const p = d.data, W = img.width;
    let ax = x1, az = x0, ay = y1, aw = y0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (p[(y * W + x) * 4 + 3] > 8) {
        if (x < ax) ax = x; if (x > az) az = x;
        if (y < ay) ay = y; if (y > aw) aw = y;
      }
    if (az < ax) return null;

    const lw = az - ax + 1, lh = aw - ay + 1;
    const esc = largura / lw;
    const c = document.createElement('canvas');
    c.width = Math.round(lw * esc); c.height = Math.round(lh * esc);
    const g = c.getContext('2d');
    /* SUAVIZAÇÃO DESLIGADA: a arte é pixel, e reduzir pixel com interpolação
       transforma a borda dura em cinza — é o oposto da nitidez que o dono
       pediu duas vezes. */
    g.imageSmoothingEnabled = false;
    g.drawImage(chaveado, ax, ay, lw, lh, 0, 0, c.width, c.height);
    return { png: c.toDataURL('image/png'), w: c.width, h: c.height,
             celulas: `${cols.length}×${lins.length}`, origem: `${lw}×${lh}` };
  }, { fonte, dados: comoDados(arq), tolerancia, largura });

  if (!r) { console.log(`  ${nome.padEnd(18)} nada além do fundo — baixe a tolerância`); continue; }
  writeFileSync(join(RAIZ, 'arte/outfits', nome + '-retrato.png'),
                Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(`  ${nome.padEnd(18)} grade ${r.celulas.padEnd(5)} · ` +
              `frente ${r.origem.padEnd(9)} → ${r.w}×${r.h}  ${nome}-retrato.png`);
}

await b.close();
