/* OLHAR O MAPA DE KANTO — a segunda metade do Q5 para a ST-10.12.
 *
 *   node tools/olhar-jornada.mjs [endereco] [pasta]
 *
 * Três pontos do caminho (o começo, o meio, o fim) nas quatro larguras, com a
 * chance do nó escolhido já calculada; e uma luta tirada do mapa em 1440 e
 * 420, com o resultado e o mapa depois dela.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_jornada';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const PONTOS = {
  comeco: { vencidos: [], time: [[4, 6]] },
  meio: { vencidos: ['rota1', 'floresta'], time: [[4, 12], [16, 10], [10, 9]] },
  fim: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra'], time: [[5, 18], [17, 17], [25, 15]] },
};

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
async function abrir(w, ponto) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}/${ponto}: ${e.message}`));
  await pg.addInitScript(p => {
    if (sessionStorage.getItem('ja')) return;
    sessionStorage.setItem('ja', '1');
    const agora = Date.now();
    const cria = (id, dex, nivel) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 1, foco: null,
      iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy', origem: 'inicial', stamina: 100, staminaEm: agora, criadaEm: agora, naCaixa: false });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_treino_aba', 'jornada');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [], doces: {},
      criaturas: p.time.map(([dex, nivel], i) => cria(`c${i}`, dex, nivel)), jornada: { vencidos: p.vencidos, insignias: [] } }));
  }, PONTOS[ponto]);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewTreino"]', el => el.click());
  await pg.waitForFunction(() => { const n = document.getElementById('jnNumero'); return n && !n.classList.contains('parcial') && /%/.test(n.textContent); },
    null, { timeout: 120000, polling: 250 });
  return { ctx, pg };
}

for (const ponto of Object.keys(PONTOS)) for (const w of [1920, 1440, 1100, 420]) {
  const { ctx, pg } = await abrir(w, ponto);
  await (await pg.$('#viewTreino .card')).screenshot({ path: `${PASTA}/mapa-${ponto}-${w}.png` });
  const r = await pg.evaluate(() => {
    const caixa = document.querySelector('.jnMapa').getBoundingClientRect();
    const nos = [...document.querySelectorAll('.jnNo')].map(n => n.getBoundingClientRect());
    const fora = nos.filter(r => r.left < caixa.left || r.right > caixa.right || r.top < caixa.top || r.bottom > caixa.bottom).length;
    let sobre = 0;
    for (let i = 0; i < nos.length; i++) for (let j = i + 1; j < nos.length; j++) {
      const a = nos[i], c = nos[j];
      if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) sobre++;
    }
    return { topo: document.querySelector('.jnTopo')?.textContent.replace(/\s+/g, ' ').trim(), painel: document.querySelector('#jnPainel h4')?.textContent,
      chance: document.getElementById('jnNumero')?.textContent, erro: document.getElementById('jnErro')?.textContent,
      lutar: document.getElementById('jnLutar')?.disabled === false, fora, sobre };
  });
  achados.push(`${ponto} ${w}: ${JSON.stringify(r)}`);
  if (r.fora || r.sobre) erros.push(`${ponto} ${w}: ${r.fora} nós fora da caixa, ${r.sobre} pares sobrepostos`);
  await ctx.close();
}

for (const w of [1440, 420]) {
  const { ctx, pg } = await abrir(w, 'meio');
  await pg.$eval('#jnLutar', el => el.click());
  await pg.waitForSelector('#jnLuta #pvePalco', { timeout: 10000 });
  await pg.waitForTimeout(2400);
  await (await pg.$('#jnLuta')).screenshot({ path: `${PASTA}/luta-meio-${w}.png` });
  await pg.$eval('#jnLuta [data-pve-pular]', el => el.click());
  await pg.waitForTimeout(600);
  await (await pg.$('#jnLuta')).screenshot({ path: `${PASTA}/luta-fim-${w}.png` });
  await pg.waitForFunction(() => { const n = document.getElementById('jnNumero'); return n && !n.classList.contains('parcial'); }, null, { timeout: 120000, polling: 250 });
  await (await pg.$('#viewTreino .card')).screenshot({ path: `${PASTA}/mapa-depois-${w}.png` });
  const r = await pg.evaluate(() => ({ fim: document.querySelector('#pveFim h4')?.textContent, texto: document.querySelector('#pveFim p')?.textContent,
    topo: document.querySelector('.jnTopo')?.textContent.replace(/\s+/g, ' ').trim(), painel: document.querySelector('#jnPainel h4')?.textContent,
    salvo: JSON.parse(localStorage.getItem('ar_idle')).jornada }));
  achados.push(`luta ${w}: ${JSON.stringify(r)}`);
  if (!r.fim) erros.push(`luta ${w}: sem resultado`);
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
