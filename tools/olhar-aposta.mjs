/* OLHAR A APOSTA COM A ARENA À VISTA — o Q5 da ST-5.9 (L-207).
 *
 *   node tools/olhar-aposta.mjs [endereco] [pasta]
 *
 * Em 1440×900, 1100×800 e 420×860: entra na arena, espera a fase de APOSTAS,
 * escolhe um lutador pelo DOM (o clique do Playwright rola até o alvo, e foi
 * essa rolagem que confundiu o primeiro vídeo), e mede:
 *
 *   escolha     o botão de CONFIRMAR está dentro da tela? a arena não se mexeu?
 *   confirma    rola até o fim da página, como quem desce para ler, e espera
 *               a aposta fechar: a arena VOLTA à tela sozinha?
 *
 * Captura as três telas de cada largura. Sai com erro se alguma medida falha.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_aposta';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const falhas = [], erros = [];
const caixa = (pg, sel) => pg.evaluate(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null; }, sel);
for (const [w, h] of [[1440, 900], [1100, 800], [420, 860]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.goto(`${BASE}/app/index.html`);
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => document.querySelector('.nav[data-view="viewArena"]')?.click());
  await pg.waitForSelector('.pick[data-i="0"]:not(.fechado)', { state: 'visible', timeout: 150000 });
  /* Tempo para escolher e confirmar antes de a aposta fechar. */
  await pg.waitForFunction(() => /APOSTAS/i.test(document.querySelector('#phase')?.textContent ?? '') && parseInt(document.querySelector('#faSeg')?.textContent ?? '0', 10) >= 12, null, { timeout: 150000 });
  await pg.evaluate(() => scrollTo(0, 0));
  const arena0 = await caixa(pg, '#arena');
  await pg.evaluate(() => document.querySelector('.pick[data-i="0"]').click());
  await pg.waitForTimeout(600);
  const btn = await caixa(pg, '#btnConfirmarAposta'), arena1 = await caixa(pg, '#arena'), y1 = await pg.evaluate(() => scrollY);
  await pg.screenshot({ path: `${PASTA}/escolha-${w}.png` });
  const dentro = btn && btn.top >= 0 && btn.bottom <= h;
  console.log(`${w} escolha: confirmar ${JSON.stringify(btn)} ${dentro ? 'NA TELA' : 'FORA'} · arena ${JSON.stringify(arena0)} → ${JSON.stringify(arena1)} · rolagem ${y1}`);
  if (!dentro) falhas.push(`${w}: o confirmar fora da tela`);
  if (w > 1000 && (arena1?.top !== arena0?.top || y1 !== 0)) falhas.push(`${w}: escolher moveu a arena`);
  await pg.evaluate(() => document.querySelector('#btnConfirmarAposta')?.click());
  await pg.waitForTimeout(500);
  await pg.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(400);
  const antes = await caixa(pg, '#arena');
  await pg.screenshot({ path: `${PASTA}/rolado-${w}.png` });
  await pg.waitForFunction(() => !/APOSTAS/i.test(document.querySelector('#phase')?.textContent ?? ''), null, { timeout: 120000 });
  await pg.waitForTimeout(1500);
  const depois = await caixa(pg, '#arena');
  await pg.screenshot({ path: `${PASTA}/luta-${w}.png` });
  const alt = depois ? depois.bottom - depois.top : 0, vis = depois ? Math.max(0, Math.min(depois.bottom, h) - Math.max(depois.top, 0)) : 0;
  console.log(`${w} luta: arena rolada ${JSON.stringify(antes)} → ${JSON.stringify(depois)} · ${alt ? Math.round((100 * vis) / alt) : 0}% à vista`);
  if (!alt || vis / alt < 0.75) falhas.push(`${w}: a arena não voltou quando a luta começou`);
  await pg.close();
}
await b.close();
console.log(erros.length ? `ERROS DE PÁGINA:\n${erros.join('\n')}` : 'sem erro de página');
if (falhas.length) { console.log(`FALHOU:\n${falhas.join('\n')}`); process.exit(1); }
console.log('a arena fica à vista: VERDE');
