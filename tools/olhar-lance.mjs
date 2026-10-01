/* OLHAR O QUADRO DO LANCE COM O QUE A E14 TROUXE — a segunda metade do Q5 da ST-14.0D.
 *
 *   node tools/olhar-lance.mjs [--saida pasta]
 *     padrão: tools/previas/_lance (fora do versionamento)
 *
 * Planta o idle com quatro encontros (um BRILHANTE), a bolsa com a bola
 * garantida, e pinta o quadro pela MESMA função do jogo (`pintarEncontros`)
 * com lotes em que a Poké Ball mais antiga é de origem presa — o aviso
 * "prende" só existe com conta, e a foto precisa dele. Fotografa o quadro nas
 * larguras em que o arranjo muda, e reprova em erro de página ou rolagem
 * horizontal.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const i = process.argv.indexOf('--saida');
const SAIDA = i > 0 ? process.argv[i + 1] : join(RAIZ, 'tools/previas/_lance');
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
  const B = await import('/engine/bioma.mjs');
  const { PACK } = await import('/app/modules/motor.mjs');
  const agora = Date.now();
  const perfil = P.loadProfile(); perfil.name = perfil.name || 'Treinador'; perfil.since = perfil.since || agora; P.saveProfile(perfil);
  const e = D.VAZIO();
  D.escolherInicial(e, PACK, PACK.iniciais[0], agora);
  const garantida = PACK.catalogo.find(x => x.guaranteed_capture).id;
  e.bolsa = { poke: 5, great: 2, ultra: 1, [garantida]: 1 };
  e.encontros = (PACK.especies ?? []).slice(5, 9).map((esp, k) => ({
    chave: `olhar:${k}`, expedicao: null, origem: 'avanco', dex: esp.dex, raridade: B.raridadeDe(PACK, esp),
    bioma: 'floresta', em: agora, shiny: k === 1 }));
  D.salvar(e);
};

const PINTAR = async () => {
  const D = await import('/app/modules/idle-dados.mjs');
  const { pintarEncontros } = await import('/app/modules/idle-paineis.mjs');
  const e = D.carregar();
  pintarEncontros({ ...e, lotes: { poke: [{ classe: 'promotional_bound', quantidade: 2 }, { classe: 'verified_earned', quantidade: 3 }] } });
  const q = document.querySelector('#idleEncontros');
  q.scrollIntoView({ block: 'center' });
  return { selos: q.querySelectorAll('.encSelo').length, garantidas: q.querySelectorAll('.idleBolaGarantida').length,
           prende: q.querySelectorAll('.bolaPrende').length, doc: document.documentElement.scrollWidth, win: innerWidth };
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
  const aba = await pg.$('[data-view="viewIdle"]');
  if (!aba) throw new Error('a aba do idle não existe — a foto seria da tela errada');
  await aba.click();
  await pg.waitForTimeout(800);
  const r = await pg.evaluate(PINTAR);
  if (!r.selos || !r.garantidas || !r.prende) throw new Error(`o quadro não mostrou o que devia em ${w}: ${JSON.stringify(r)}`);
  if (r.doc > r.win) erros.push(`${w}: ROLAGEM HORIZONTAL ${r.doc} em ${r.win}`);
  await pg.waitForTimeout(300);
  await (await pg.$('#idleEncontros')).screenshot({ path: join(SAIDA, `lance-${w}.png`) });
  console.log(`  ${w}: ${r.selos} selo · ${r.garantidas / 4} garantida por cartão · ${r.prende} avisos`);
  await ctx.close();
}
await b.close(); s.close();
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página, sem rolagem horizontal');
console.log(`capturas em ${SAIDA}`);
if (erros.length) process.exit(1);
