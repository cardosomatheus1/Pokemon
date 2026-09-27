/* OLHAR O TEAM BUILDER — a segunda metade do Q5 para a ST-10.7.
 *
 *   node tools/olhar-time.mjs [endereco] [pasta]
 *
 * Três saves — sem criatura, time parcial (2 + caixa) e time cheio (6 + caixa)
 * — nas larguras em que o arranjo muda. Espera a chance e as trocas acabarem
 * de calcular, captura, e no parcial aplica a primeira troca sugerida e confere
 * que o número MEXEU.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_time';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const SAVES = {
  vazio: [],
  parcial: [['a', 16, 12], ['b', 10, 11], ['c', 7, 14, true], ['d', 25, 13, true], ['e', 1, 9, true]],
  cheio: [['a', 6, 36], ['b', 9, 34], ['c', 3, 35], ['d', 25, 30], ['e', 143, 31], ['f', 94, 33],
          ['g', 65, 32, true], ['h', 130, 30, true], ['i', 59, 34, true], ['j', 68, 33, true]],
};

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
for (const [nome, lista] of Object.entries(SAVES)) for (const w of [1920, 1440, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${nome}/${w}: ${e.message}`));
  await pg.addInitScript(lista => {
    if (sessionStorage.getItem('ja')) return;
    sessionStorage.setItem('ja', '1');
    const agora = Date.now();
    const cria = ([id, dex, nivel, naCaixa = false]) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 3, foco: null,
      iv: [20, 20, 20, 20, 20, 20], natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: agora, criadaEm: agora, naCaixa });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_treino_adv', 'pedra');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [], doces: {},
      criaturas: lista.map(cria) }));
  }, lista);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewTreino"]', el => el.click());
  if (lista.length) {
    await pg.waitForFunction(() => /lutas simuladas/.test(document.getElementById('tbErro')?.textContent ?? '')
      && !/procurando/.test(document.getElementById('tbTrocas')?.textContent ?? ''), null, { timeout: 120000, polling: 250 });
  } else await pg.waitForSelector('#treinoCorpo .tbVazio', { timeout: 15000 });
  await pg.waitForTimeout(300);
  const card = await pg.$('#viewTreino .card');
  await card.screenshot({ path: `${PASTA}/time-${nome}-${w}.png` });
  const lido = await pg.evaluate(() => ({ numero: document.getElementById('tbNumero')?.textContent, erro: document.getElementById('tbErro')?.textContent,
    fraqueza: document.getElementById('tbFraqueza')?.textContent, trocas: document.querySelectorAll('#tbTrocas .tbTroca').length }));
  achados.push(`${nome}/${w}: ${JSON.stringify(lido)}`);
  if (nome === 'parcial' && w === 1440 && lido.trocas) {
    await pg.$eval('#tbTrocas [data-trocar-sai]', el => el.click());
    await pg.waitForFunction(n => /lutas simuladas/.test(document.getElementById('tbErro')?.textContent ?? '')
      && document.getElementById('tbNumero')?.textContent !== n, lido.numero, { timeout: 120000, polling: 250 });
    const novo = await pg.$eval('#tbNumero', el => el.textContent);
    achados.push(`troca aplicada: ${lido.numero} → ${novo}`);
    await card.screenshot({ path: `${PASTA}/time-depois-da-troca-${w}.png` });
  }
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
