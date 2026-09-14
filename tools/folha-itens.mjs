/* UMA FATIA AMPLIADA DA FOLHA DE ÍCONES, para ESCOLHER a célula olhando.
 *
 * O catálogo aponta cada item para um índice na folha do dono — 23 × 17 = 391
 * células de 32 px. Escolher esse índice de cabeça é como escolher a casa da
 * Poké Ball de cabeça: já custou duas correções do dono neste projeto, e as
 * duas vezes o erro só apareceu quando alguém OLHOU no tamanho certo.
 *
 *   > Olhar num tamanho onde a diferença não cabe é o mesmo que não olhar.
 *
 * Esta ferramenta amplia uma faixa de células com o índice escrito em cima, e
 * é a mesma ideia da `folha-captura.mjs` para as bolas. Ampliação inteira e
 * sem alisamento: a célula tem 32 px, e a 32 px nada se decide.
 *
 * Uso:
 *   node tools/folha-itens.mjs [--de 0] [--ate 46] [--fator 4]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO;
const CHROME = process.env.PW_CHROME;
if (!PW) { console.error('falta PW_MODULO — ver tools/README.md'); process.exit(2); }

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const DE = Number(arg('de', 0));
const ATE = Number(arg('ate', 46));
const FATOR = Number(arg('fator', 4));
const COLS = Number(arg('colunas', 23));
const CELULA = Number(arg('celula', 32));
const FOLHA = join(RAIZ, arg('folha', 'assets/icones/itens.png'));
const SAIDA = join(RAIZ, '.telas', `folha-itens-${DE}-${ATE}.png`);

const b64 = readFileSync(FOLHA).toString('base64');
const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();

const url = await pg.evaluate(async ({ b64, DE, ATE, FATOR, COLS, CELULA }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const n = ATE - DE;
  const porLinha = 8;
  const linhas = Math.ceil(n / porLinha);
  const passo = CELULA * FATOR;
  const rotulo = 16;
  const c = document.createElement('canvas');
  c.width = porLinha * passo;
  c.height = linhas * (passo + rotulo);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#11151c'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < n; i++) {
    const idx = DE + i;
    const sx = (idx % COLS) * CELULA;
    const sy = Math.floor(idx / COLS) * CELULA;
    const dx = (i % porLinha) * passo;
    const dy = Math.floor(i / porLinha) * (passo + rotulo);
    x.drawImage(img, sx, sy, CELULA, CELULA, dx, dy + rotulo, passo, passo);
    x.fillStyle = '#7fd7ff';
    x.font = '12px monospace';
    x.fillText(String(idx), dx + 3, dy + 12);
  }
  return c.toDataURL('image/png');
}, { b64, DE, ATE, FATOR, COLS, CELULA });
await b.close();

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, Buffer.from(url.split(',')[1], 'base64'));
console.log(`células ${DE}..${ATE - 1} -> ${SAIDA}\nAgora OLHE a folha.`);
