/* OLHAR "EVOLUIR OU ESPERAR" — a segunda metade do Q5 para a ST-10.3.
 *
 *   node tools/olhar-exclusivos.mjs [endereco] [pasta]
 *
 * Equipe com um Charmander 18 (pode evoluir, mas perde Dragon Claw), um
 * Charmander 23 (já aprendeu — evoluir não custa nada) e, na caixa, um
 * Charmeleon que guardou o golpe. Captura o selo âmbar, o selo ARMADO depois
 * do primeiro clique, o painel de golpes com a estrela, e confere no save as
 * duas evoluções: a cedo perde o golpe, a esperada o leva.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_exclusivos';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
for (const w of [1920, 1440, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${e.message}`));
  await pg.addInitScript(() => {
    if (sessionStorage.getItem('ja')) return;
    sessionStorage.setItem('ja', '1');
    const agora = Date.now();
    const cria = (id, dex, nivel, extra = {}) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 3,
      foco: null, iv: [20, 20, 20, 20, 20, 20], natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: agora, criadaEm: agora, ...extra });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [], doces: {},
      criaturas: [cria('cedo', 4, 18), cria('espera', 4, 23), cria('meleon', 5, 30, { naCaixa: true, exclusivos: ['Dragon Claw'] })] }));
  });
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForSelector('#viewIdle [data-evoluir="cedo"]', { timeout: 15000 });
  await pg.waitForTimeout(500);
  const selo = await pg.$eval('#viewIdle [data-evoluir="cedo"]', el => ({ cls: el.className, txt: el.textContent.trim(), title: el.title }));
  achados.push(`${w} selo cedo: ${JSON.stringify(selo)}`);
  const cartao = await pg.$('#viewIdle [data-evoluir="cedo"]');
  const caixaDoCartao = await cartao.evaluateHandle(el => el.closest('.criaCard, .idleCria, .cria, section, .card') ?? el.parentElement);
  await caixaDoCartao.asElement().screenshot({ path: `${PASTA}/selo-${w}.png` });
  /* 1º clique: ARMA, e não evolui. */
  await pg.$eval('#viewIdle [data-evoluir="cedo"]', el => el.click());
  await pg.waitForTimeout(300);
  const armado = await pg.evaluate(() => ({
    txt: document.querySelector('#viewIdle [data-evoluir="cedo"]')?.textContent.trim(),
    dex: JSON.parse(localStorage.getItem('ar_idle')).criaturas.find(c => c.id === 'cedo').dex }));
  achados.push(`${w} armado: ${JSON.stringify(armado)}`);
  if (armado.dex !== 4) erros.push(`${w}: o primeiro clique evoluiu`);
  await caixaDoCartao.asElement().screenshot({ path: `${PASTA}/selo-armado-${w}.png` });
  /* O painel de golpes do que ESPEROU: Dragon Claw com a estrela. */
  await pg.$eval('#idleCentro [data-golpes-de="espera"]', el => { el.open = true; });
  await pg.waitForTimeout(300);
  const painel = await pg.$('#idleCentro [data-golpes-de="espera"]');
  await painel.screenshot({ path: `${PASTA}/golpes-${w}.png` });
  achados.push(`${w} chips: ${await pg.$eval('#idleCentro [data-golpes-de="espera"]', el => [...el.querySelectorAll('.idleGolpe')].map(b => b.textContent.trim() + (b.classList.contains('excl') ? '*' : '')).join(', '))}`);
  if (w === 1440) {
    /* 2º clique: evolui SEM o golpe. E o que esperou evolui num clique e o leva. */
    await pg.$eval('#viewIdle [data-evoluir="cedo"]', el => el.click());
    await pg.waitForTimeout(2500);
    await pg.waitForSelector('#viewIdle [data-evoluir="espera"]', { timeout: 15000 });
    await pg.$eval('#viewIdle [data-evoluir="espera"]', el => el.click());
    await pg.waitForTimeout(2500);
    const fim = await pg.evaluate(() => JSON.parse(localStorage.getItem('ar_idle')).criaturas.map(c => `${c.id}:${c.dex}:${JSON.stringify(c.exclusivos ?? null)}`));
    achados.push(`depois das duas: ${fim.join(' ')}`);
    if (!fim.includes('cedo:5:null') || !fim.includes('espera:5:["Dragon Claw"]')) erros.push('as evoluções não guardaram/perderam como deviam');
  }
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
