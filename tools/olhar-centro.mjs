/* OLHAR O CENTRO — a segunda metade do Q5 para as ST-9.8, 9.10, 9.12 e 9.13.
 *
 *   node tools/olhar-centro.mjs [endereco] [pasta]
 *     padrão: http://127.0.0.1:8099   tools/previas/_centro
 *
 * Abre ROTAS com equipe e caixa, doce na linha de duas criaturas, e captura o
 * painel Centro nas larguras em que o arranjo muda: os botões de dar doce e de
 * soltar (armado e desarmado), e o painel de golpes aberto com o comparador
 * da Arena. As capturas são para LER.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_centro';
const LARGURAS = [1920, 1440, 1100, 420];
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    const agora = Date.now();
    const cria = (id, dex, nivel, naCaixa = false) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 3,
      foco: null, iv: [20, 20, 20, 20, 20, 20], natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: agora, criadaEm: agora, naCaixa });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [],
      doces: { 4: 7, 1: 2 },
      criaturas: [cria('c-char', 5, 24), cria('c-bulba', 1, 12), cria('c-pid', 16, 9, true), cria('c-char2', 4, 6, true)] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForSelector('#idleCentro .idleCaixaItem', { timeout: 15000 });
  await pg.waitForTimeout(500);
  const centro = await pg.$('#idleCentro');
  await centro.scrollIntoViewIfNeeded();
  await centro.screenshot({ path: `${PASTA}/centro-${w}.png` });
  /* Soltar ARMADO: o primeiro clique pede confirmação. */
  await pg.$eval('#idleCentro [data-soltar="c-char2"]', el => el.click());
  /* E o painel de golpes do Charmeleon aberto, com o comparador. */
  await pg.$eval('#idleCentro [data-golpes-de="c-char"]', el => { el.open = true; });
  await pg.waitForTimeout(300);
  await centro.screenshot({ path: `${PASTA}/centro-aberto-${w}.png` });
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
