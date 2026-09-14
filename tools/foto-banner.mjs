/* AS DUAS PROPOSTAS DE BANNER, LADO A LADO E NO MESMO TAMANHO (L-147).
 *
 * O dono pediu as duas para comparar:
 *
 *   A  FAIXA NO TOPO      como o topbanner da Arena, e mais alta — ele pediu
 *                         explicitamente "um pouco pra baixo pra visualizar
 *                         melhor". Custa altura da CENA.
 *   B  NO LUGAR DA EQUIPE ele assume o topo da coluna e a equipe desce, na
 *                         mesma ordem. Custa nada da cena.
 *
 * A única forma honesta de comparar arranjo é ver os dois no MESMO tamanho, na
 * mesma tela e com o mesmo conteúdo — senão a comparação vira memória, e
 * memória de arranjo é a coisa que este projeto mais erra.
 *
 * Uso:
 *   node tools/foto-banner.mjs [--largura 1440]
 */
import { mkdirSync } from 'node:fs';
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
const BASE = arg('base', 'http://localhost:8099');
const LARGURA = Number(arg('largura', 1440));
const PASTA = join(RAIZ, '.telas', 'previa-avanco');
mkdirSync(PASTA, { recursive: true });

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await (await b.newContext({ viewport: { width: LARGURA, height: 1000 } })).newPage();
await pg.goto(`${BASE}/app/previa-avanco.html`, { waitUntil: 'networkidle' });
/* Os sprites são folha PMD animada por `steps()`: sem esta espera metade sai no
   primeiro quadro em branco. Mesmo cuidado do D-033. */
await pg.waitForTimeout(2200);
/* As notas SAEM: o que se compara aqui é o arranjo, e a nota ocupa espaço que
   o produto não vai ocupar. */
await pg.click('[data-notas]');
await pg.waitForTimeout(300);

for (const [classe, nome] of [[false, 'B-na-coluna'], [true, 'A-no-topo']]) {
  const estaNoTopo = await pg.$eval('body', el => el.classList.contains('bnTopo'));
  if (estaNoTopo !== classe) { await pg.click('[data-banner]'); await pg.waitForTimeout(400); }
  const arquivo = `${LARGURA}-banner-${nome}.png`;
  await pg.screenshot({ path: join(PASTA, arquivo) });
  console.log(`${nome} · ${LARGURA}px -> ${arquivo}`);
}
await b.close();
console.log(`\nAgora OLHE as duas em ${PASTA}`);
