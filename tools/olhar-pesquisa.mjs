/* OLHAR A PESQUISA DA COLHEITA — a segunda metade do Q5 para a ST-9.14.
 *
 *   node tools/olhar-pesquisa.mjs [endereco] [pasta]
 *
 * Manda uma expedição que começou há 10 h (pelos módulos do próprio app, e
 * não por um estado forjado), colhe pelo botão, e captura o quadro "A
 * expedição voltou" com as linhas de pesquisa nas larguras em que o arranjo
 * muda.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_pesquisa';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const w of [1920, 1440, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1200 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    const agora = Date.now();
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: { 10: 3 }, bolsa: {}, expedicoes: [], encontros: [],
      criaturas: [{ id: 'c1', dex: 7, nivel: 14, xp: 1500, vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                    natureza: 'Bold', origem: 'inicial', stamina: 192, staminaEm: agora - 20 * 3600e3, criadaEm: agora - 30 * 86400e3 }] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.evaluate(async () => {
    const D = await import('/app/modules/idle-dados.mjs');
    const { PACK } = await import('/app/modules/motor.mjs');
    const e = D.carregar();
    D.iniciarExpedicao(e, { pack: PACK, bioma: 'floresta', perfil: 'trilha', equipe: ['c1'], agora: Date.now() - 10 * 3600e3 });
    D.salvar(e);
  });
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForSelector('#viewIdle [data-colher]', { timeout: 15000 });
  await pg.$eval('#viewIdle [data-colher]', el => el.click());
  await pg.waitForSelector('#idleSaque h4', { timeout: 15000 });
  await pg.waitForTimeout(400);
  const el = await pg.$('#idleSaque');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${PASTA}/colheita-${w}.png` });
  console.log(`  ${w}: ${await pg.$$eval('#idleSaque .saquePesquisa li', x => x.length)} linha(s) de pesquisa`);
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
