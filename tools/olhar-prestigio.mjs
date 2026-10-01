/* OLHAR O PRESTÍGIO E O SHINY VERDADEIRO — a segunda metade do Q5 da ST-14.3b.
 *
 *   node tools/olhar-prestigio.mjs [--saida pasta]
 *     padrão: tools/previas/_prestigio (fora do versionamento)
 *
 * Planta um perfil de nível alto com prestígio em duas espécies (uma delas no
 * banner) e um idle com uma criatura BRILHANTE na equipe. Fotografa, pelo
 * caminho do jogador (o chip do perfil, a aba Customizar), a grade do lutador
 * do banner e a de prestígio; e a carta da criatura brilhante no idle. Nas
 * larguras em que o arranjo muda; reprova em erro de página ou rolagem.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const i = process.argv.indexOf('--saida');
const SAIDA = i > 0 ? process.argv[i + 1] : join(RAIZ, 'tools/previas/_prestigio');
mkdirSync(SAIDA, { recursive: true });
const LARGURAS = [1920, 1440, 1100, 420];
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const s = createServer((q, r) => {
  const f = join(RAIZ, decodeURIComponent((q.url || '/').split('?')[0]));
  if (!f.startsWith(RAIZ) || !existsSync(f) || !extname(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
  r.end(readFileSync(f));
});
await new Promise(res => s.listen(0, '127.0.0.1', res));
const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

const PLANTAR = async () => {
  const D = await import('/app/modules/idle-dados.mjs');
  const P = await import('/app/modules/perfil-dados.mjs');
  const { PACK } = await import('/app/modules/motor.mjs');
  const agora = Date.now();
  localStorage.setItem('ar_session', '1');   // o chip do perfil só existe com sessão
  const perfil = P.loadProfile();
  perfil.name = 'Treinador'; perfil.since = perfil.since || agora; perfil.xp = 60000;
  perfil.shiny = { gifs: [6, 25], skins: [6, 25], onGif: {}, onSkin: {} };
  perfil.banner = { ...(perfil.banner ?? {}), dex: 6 };
  P.saveProfile(perfil);
  const e = D.VAZIO();
  D.escolherInicial(e, PACK, PACK.iniciais[0], agora);
  const brilho = D.criarCriatura(PACK, 25, 'captura', agora, 'a'.repeat(12) + 'f0');
  brilho.shiny = true;
  e.criaturas.push(brilho);
  D.salvar(e);
};

const erros = [];
for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', err => erros.push(`${w}: ${err.message}`));
  await pg.goto(`http://127.0.0.1:${s.address().port}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.evaluate(PLANTAR);
  await pg.reload({ waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(1200);

  /* O idle: a carta da criatura brilhante. */
  await (await pg.$('[data-view="viewIdle"]')).click();
  await pg.waitForTimeout(800);
  const carta = await pg.evaluateHandle(() => document.querySelector('img.idleCriaArte[data-shiny="1"]')?.closest('.idleCria') ?? null);
  if (!(await carta.evaluate(x => !!x))) throw new Error(`a carta da criatura brilhante não apareceu em ${w}`);
  await carta.evaluate(x => x.scrollIntoView({ block: 'center' }));
  await pg.waitForTimeout(300);
  await carta.asElement().screenshot({ path: join(SAIDA, `carta-${w}.png`) });

  /* O guarda-roupa, pelo chip do perfil e pela aba Customizar. */
  await (await pg.$('#chipProfile')).click();
  await pg.waitForTimeout(400);
  await (await pg.$('#profileModal .tab[data-pane="paneCustom"]')).click();
  await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => ({
    auras: document.querySelectorAll('#pickShiny img[data-prestigio="1"]').length,
    paleta: document.querySelectorAll('#pickShiny img[data-shiny="1"], #pickBannerMon img[data-shiny="1"]').length,
    marca: document.querySelectorAll('#pickBannerMon .temPrestigio').length,
    doc: document.documentElement.scrollWidth, win: innerWidth }));
  if (!r.auras || r.paleta || !r.marca) throw new Error(`o guarda-roupa não mostrou o prestígio como devia em ${w}: ${JSON.stringify(r)}`);
  if (r.doc > r.win) erros.push(`${w}: ROLAGEM HORIZONTAL ${r.doc} em ${r.win}`);
  for (const [sel, nome] of [['#pickBannerMon', 'banner'], ['#pickShiny', 'prestigio']]) {
    const el = await pg.$(sel);
    await el.evaluate(x => x.scrollIntoView({ block: 'start' }));
    await pg.waitForTimeout(300);
    await el.screenshot({ path: join(SAIDA, `${nome}-${w}.png`) });
  }
  console.log(`  ${w}: ${r.auras} auras na grade · ${r.marca} marca no banner · ${r.paleta} paleta shiny`);
  await ctx.close();
}
await b.close(); s.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página, sem rolagem horizontal');
console.log(`capturas em ${SAIDA}`);
if (erros.length) process.exit(1);
