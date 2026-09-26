/* OLHAR A COLEÇÃO — a segunda metade do Q5 para a ST-9.15.
 *
 *   node tools/olhar-colecao.mjs [endereco] [pasta]
 *
 * Abre a Pokédex com uma coleção parcial (medalhas ganhas e perto de sair) e
 * uma semana em andamento (uma missão pronta, uma resgatada, uma no meio), e
 * captura o cartão "Coleção" nas larguras em que o arranjo muda.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_colecao';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const w of [1920, 1440, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    const agora = Date.now();
    const semana = Math.floor(Math.floor((agora - 180 * 60000) / 86400000) / 7);
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_pdx_aba', 'colecao');   // ST-9.16b: o cartão mora na aba
    localStorage.setItem('ar_escada_arena', JSON.stringify({ vistas: [6, 9, 3, 59, 38, 126, 136, 78, 146, 26, 125, 65], encontradas: [6] }));
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: { 10: 40, 16: 5 }, bolsa: {}, expedicoes: [], encontros: [],
      jaPossuiu: [4, 5, 7, 1, 16, 10, 13, 19, 25, 58, 37],
      missoes: { semana, base: { capturar: 9, ver: 0, fichas: 10 }, resgatadas: ['fichas'] },
      criaturas: [] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewPokedex"]', el => el.click());
  await pg.waitForSelector('#pdxColecao .colMissao', { timeout: 15000 });
  await pg.waitForTimeout(400);
  const el = await pg.$('#pdxColecao');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${PASTA}/colecao-${w}.png` });
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
