/* AS ARTES DE MOEDA PERDEM O FUNDO.
 *
 * O dono desenha as moedas com fundo chapado escuro e manda em JPEG. JPEG não
 * tem cor chapada de verdade — a compressão espalha o mesmo tom numa nuvem de
 * tons parecidos, e sobra franja em volta do desenho.
 *
 * Por isso são DUAS passadas, e a segunda é a que separa isto de um `if` de
 * igualdade:
 *
 *   1. APAGA o que está perto da cor do canto
 *   2. LIMPA A FRANJA — pixel que sobrou vizinho de transparência E ainda
 *      parecido com o fundo. É a mesma correção que a esteira de outfit já
 *      recebeu, pelo mesmo motivo, e sem ela toda moeda fica com um halo.
 *
 * A saída vai para `arte/`, e não `assets/`: moeda é arte NOSSA. Confundir as
 * duas custa dos dois lados — ver `arte/README.md`.
 *
 * ── NEM TODA ARTE DE DINHEIRO É MOEDA ────────────────────────────────────
 *
 * A chave é o CANTO, e ela pressupõe fundo chapado ATRÁS do desenho. Rodei
 * isto no `pokécash` sem olhar: aquilo é uma folha de CÉDULAS sobre papel
 * claro, o canto caiu no próprio papel, e a chave comeu 76% da arte — as
 * cédulas junto.
 *
 * Por isso o sufixo `-bruto` é opt-in e não varredura: entra aqui o que
 * alguém olhou e decidiu que é uma peça sobre fundo chapado. Ferramenta que
 * processa tudo que encontra estraga em silêncio o que não devia tocar.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'arte/moedas');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';

const alvos = readdirSync(DIR).filter(f => /-bruto\.(jpe?g|png)$/i.test(f));
if (!alvos.length) { console.log('nada em arte/moedas/ com sufixo -bruto'); process.exit(0); }

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

for (const f of alvos) {
  const ext = extname(f).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const dados = `data:${mime};base64,` + readFileSync(join(DIR, f)).toString('base64');

  const r = await pg.evaluate(async dados => {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dados;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), p = im.data;

    /* A CHAVE É O CANTO, e aqui ele é confiável: o dono desenha sobre fundo
       chapado. A média dos quatro cantos absorve o ruído do JPEG. */
    const cantos = [[0, 0], [c.width - 1, 0], [0, c.height - 1], [c.width - 1, c.height - 1]]
      .map(([x, y]) => (y * c.width + x) * 4);
    const chave = [0, 1, 2].map(k => Math.round(cantos.reduce((a, i) => a + p[i + k], 0) / 4));

    const dist = i => Math.max(
      Math.abs(p[i] - chave[0]), Math.abs(p[i + 1] - chave[1]), Math.abs(p[i + 2] - chave[2]));

    const TOL = 34;
    let n = 0;
    for (let i = 0; i < p.length; i += 4) if (dist(i) <= TOL) { p[i + 3] = 0; n++; }

    /* ── A FRANJA ─────────────────────────────────────────────────────────
       Pixel que sobrou COM vizinho transparente e ainda parecido com a chave é
       borda comida pela compressão — ela some. Sem esta passada a moeda fica
       com um halo escuro que só aparece sobre fundo claro. */
    const idx = (x, y) => (y * c.width + x) * 4;
    const vizinhoVazio = (x, y) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= c.width || ny >= c.height) continue;
        if (p[idx(nx, ny) + 3] === 0) return true;
      }
      return false;
    };
    let franja = 0;
    const copia = new Uint8ClampedArray(p);
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const i = idx(x, y);
        if (copia[i + 3] === 0) continue;
        if (vizinhoVazio(x, y) && dist(i) <= TOL * 2.1) { p[i + 3] = 0; franja++; }
      }

    g.putImageData(im, 0, 0);
    return { png: c.toDataURL('image/png'), chave, n, franja, total: c.width * c.height,
             tam: [c.width, c.height] };
  }, dados);

  const saida = join(DIR, basename(f).replace(/-bruto\.(jpe?g|png)$/i, '.png'));
  writeFileSync(saida, Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(`${basename(saida)} ${r.tam.join('x')} · chave ${r.chave.join(',')} · ` +
              `${((r.n + r.franja) / r.total * 100).toFixed(1)}% tirado (franja ${r.franja})`);
}
await b.close();
