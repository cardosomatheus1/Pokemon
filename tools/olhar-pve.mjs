/* OLHAR A BATALHA PvE — a segunda metade do Q5 para a ST-10.9.
 *
 *   node tools/olhar-pve.mjs [endereco] [pasta]
 *
 * Um time de começo de jogo (Charmander 8, Pidgey 7) contra o treinador da
 * Rota 1. Espera a chance, clica "lutar", captura NO MEIO da luta (o golpe, o
 * número, o estouro) e no RESULTADO — deixando a luta correr inteira, de ponta
 * a ponta, numa largura, e pulando nas outras.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_pve';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
for (const w of [1440, 1920, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    if (sessionStorage.getItem('ja')) return;
    sessionStorage.setItem('ja', '1');
    const agora = Date.now();
    const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 1, foco: null,
      iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy', origem: 'inicial', stamina: 100, staminaEm: agora, criadaEm: agora, naCaixa: false });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_treino_adv', 'rota1');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [], doces: {},
      criaturas: [cria('a', 4, 8), cria('b', 16, 7)] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewTreino"]', el => el.click());
  await pg.waitForFunction(() => { const b = document.getElementById('tbLutar'); return b && !b.disabled; }, null, { timeout: 120000, polling: 250 });
  await pg.$eval('#tbLutar', el => el.click());
  await pg.waitForSelector('#pvePalco', { timeout: 10000 });
  await pg.waitForTimeout(2600);
  const area = await pg.$('#pveArea');
  await area.screenshot({ path: `${PASTA}/pve-meio-${w}.png` });
  if (w === 1440) {
    await pg.waitForFunction(() => document.getElementById('pveArea')?.dataset.estado === 'fim', null, { timeout: 180000, polling: 500 });
  } else {
    await pg.$eval('[data-pve-pular]', el => el.click());
  }
  await pg.waitForTimeout(500);
  await area.screenshot({ path: `${PASTA}/pve-fim-${w}.png` });
  const r = await pg.evaluate(() => ({ titulo: document.querySelector('#pveFim h4')?.textContent, texto: document.querySelector('#pveFim p')?.textContent,
    caidos: document.querySelectorAll('.pveLutador.caido').length, log: document.getElementById('pveLog')?.textContent }));
  achados.push(`${w}${w === 1440 ? ' (inteira)' : ' (pulada)'}: ${JSON.stringify(r)}`);
  if (!r.titulo) erros.push(`${w}: sem resultado`);
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
