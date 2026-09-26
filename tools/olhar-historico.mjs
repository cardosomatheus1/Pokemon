/* OLHAR O HISTÓRICO NA APOSTA — a segunda metade do Q5 para a ST-9.4.
 *
 *   node tools/olhar-historico.mjs [endereco] [pasta]
 *     padrão: http://127.0.0.1:8099   tools/previas/_historico
 *
 * Abre o jogo com TODAS as espécies da Arena marcadas como encontradas (as 12
 * linhas com nota, o pior caso de largura) e com metade delas (a leitura
 * misturada), e captura a lista de apostas nas larguras em que o arranjo
 * muda. Imprime os erros de página e a rolagem horizontal.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import DOSSIE from '../content/dossie_pokemon_kanto_v1.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_historico';
const LARGURAS = [1920, 1440, 1100, 420];
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const todas = Object.keys(DOSSIE.especies).map(Number);
const CASOS = [
  { nome: 'todas', encontradas: todas },
  { nome: 'metade', encontradas: todas.filter((_, i) => i % 2 === 0) },
];

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], avisos = [];
for (const caso of CASOS) for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${caso.nome}@${w}: ${e.message}`));
  await pg.addInitScript(c => {
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_escada_arena', JSON.stringify({ vistas: c.encontradas, encontradas: c.encontradas }));
  }, caso);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.waitForTimeout(800);
  const lista = await pg.$('#pickList');
  await lista.screenshot({ path: `${PASTA}/${caso.nome}-${w}.png` });
  await pg.screenshot({ path: `${PASTA}/${caso.nome}-${w}-pagina.png` });
  const r = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth,
    notas: document.querySelectorAll('.pick .hist').length }));
  if (r.doc > r.win) avisos.push(`${caso.nome}@${w}: ROLAGEM HORIZONTAL ${r.doc} em ${r.win}`);
  console.log(`  ${caso.nome}-${w}: ${r.notas} notas`);
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS DE PÁGINA:\n  ${erros.join('\n  ')}` : 'sem erro de página');
if (avisos.length) console.log(avisos.join('\n'));
console.log(`capturas em ${PASTA}`);
