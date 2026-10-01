/* OLHAR O JOGO NO CELULAR — a segunda metade do Q5, no aparelho de verdade.
 *
 *   node tools/olhar-celular.mjs [pasta] [url]
 *     padrão: tools/previas/_celular  ·  http://localhost:8099/app/index.html
 *
 * Emula um celular (412 × 915, toque, densidade 2,6 — o Android médio) e
 * captura cada aba como o jogador a vê ao abrir: a PRIMEIRA TELA (o que cabe
 * sem rolar) e a página inteira. A primeira tela é a que importa no celular —
 * é nela que o jogador decide se fica. Imprime os erros de página e se alguma
 * coisa vaza para o lado (rolagem horizontal), que no celular é defeito.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_celular';
const URL_ = process.argv[3] || 'http://localhost:8099/app/index.html';
const LARGURA = Number(process.env.LARGURA || 412), ALTURA = Number(process.env.ALTURA || 915);
const ABAS = (process.env.ABAS || 'viewHome,viewArena,viewLiga,viewIdle,viewTreino,viewRotaOff,viewPokedex,viewWiki,viewHow,viewRules').split(',');
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ viewport: { width: LARGURA, height: ALTURA }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36' });
const pg = await ctx.newPage();
const erros = [];
pg.on('pageerror', e => erros.push(String(e).slice(0, 160)));
await pg.goto(URL_);
await pg.waitForFunction(() => !document.querySelector('#boot'), null, { timeout: 120000 });
for (const aba of ABAS) {
  await pg.evaluate(v => document.querySelector(`.nav[data-view="${v}"]`)?.click(), aba);
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => window.scrollTo(0, 0));
  await pg.waitForTimeout(300);
  const vaza = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await pg.screenshot({ path: `${PASTA}/${aba}-tela.png` });
  await pg.screenshot({ path: `${PASTA}/${aba}-inteira.png`, fullPage: true });
  console.log(`${aba}: ${vaza > 1 ? `VAZA ${vaza}px para o lado` : 'sem vazamento lateral'}`);
}
/* a folha do "Mais" aberta — só existe no celular, e só se vê tocando */
await pg.evaluate(() => document.querySelector('#navMais')?.click());
await pg.waitForTimeout(400);
await pg.screenshot({ path: `${PASTA}/mais-aberto.png` });
await b.close();
console.log(erros.length ? `ERROS DE PÁGINA:\n${erros.join('\n')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
