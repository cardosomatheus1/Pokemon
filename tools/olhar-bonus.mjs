/* OLHAR O BÔNUS DA ARENA NA ROTA — a segunda metade do Q5 para a ST-9.6.
 *
 *   node tools/olhar-bonus.mjs [endereco] [pasta]
 *     padrão: http://127.0.0.1:8099   tools/previas/_bonus
 *
 * Abre ROTAS com uma aposta recente no Caterpie (a linha mora na floresta),
 * escolhe a floresta e captura a prévia de encontros nas larguras em que o
 * arranjo muda: a chance subida com o ×4, e o rodapé dizendo até quando.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_bonus';
const LARGURAS = [1920, 1440, 1100, 420];
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    const agora = Date.now();
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_bonus_arena', JSON.stringify({ linha: 10, ate: agora + 3 * 3600_000 }));
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [],
      criaturas: [{ id: 'olhar-7', dex: 7, nivel: 12, xp: 0, vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                    natureza: 'Bold', origem: 'inicial', stamina: 100, staminaEm: agora, criadaEm: agora }] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForTimeout(800);
  await pg.$eval('#viewIdle [data-bioma="floresta"]', el => el.click()).catch(e => erros.push(`${w}: sem floresta — ${e.message}`));
  await pg.waitForSelector('#idlePrevia .prvGrade', { timeout: 15000 });
  await pg.waitForTimeout(600);
  const el = await pg.$('#idlePrevia');
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${PASTA}/previa-${w}.png` });
  console.log(`  previa-${w}: ${await pg.$$eval('#idlePrevia .prvArena', x => x.length)} marcas ×4`);
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
