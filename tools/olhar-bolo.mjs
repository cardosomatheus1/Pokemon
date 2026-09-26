/* OLHAR O BOLO — a segunda metade do Q5 para a ST-12.6.
 *
 *   node tools/olhar-bolo.mjs [endereco] [pasta]
 *     padrão: http://127.0.0.1:8080   tools/previas/_bolo
 *
 * Com o servidor de pé: cria quatro contas, põe três delas no bolo (lutadores
 * diferentes), abre o jogo com a quarta e captura o cartão do bolo nas
 * larguras em que o arranjo muda — na APOSTA (com uma escolha feita, para a
 * estimativa e as regras aparecerem) e no RESULTADO. Imprime os erros de
 * página. As capturas são para LER, não para conferir que abriram.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_bolo';
const LARGURAS = [1920, 1440, 1100, 420];
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const H = { 'x-api-versao': '1', 'content-type': 'application/json' };
const pedir = (c, { metodo = 'GET', corpo, sessao } = {}) => fetch(BASE + c, { method: metodo,
  headers: { ...H, ...(sessao ? { authorization: 'Bearer ' + sessao } : {}) },
  ...(corpo ? { body: JSON.stringify(corpo) } : {}) }).then(r => r.json());
const marca = Date.now().toString(36).slice(-5);
const conta = async i => (await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: {
  username: `Bolo${marca}${i}`, email: `bolo-${marca}-${i}@ensaio.test`, senha: 'ensaio-senha-longa-1',
  nascimento: '1994-02-03' } })).sessao;
const esperar = ms => new Promise(r => setTimeout(r, ms));
async function janelaAberta(folga = 25000) {
  for (let i = 0; i < 200; i++) {
    const r = (await pedir('/api/rodada'))?.rodada;
    if (r?.fase === 'aberta' && r.travaEm - Date.now() > folga) return r;
    await esperar(1000);
  }
  throw new Error('a janela não abriu com folga');
}

const sessoes = await Promise.all([0, 1, 2, 3].map(conta));
await janelaAberta();
for (const [i, [sel, valor]] of [[2, 300], [2, 120], [7, 80]].entries())
  await pedir('/api/mercado/entrar', { metodo: 'POST', sessao: sessoes[i], corpo: { selecao: sel, valor } });

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
/* A página do RESULTADO abre já, com quem ENTROU: assim ela chega ao fim
   DESTA rodada — a que tem entradas — e não de uma seguinte. */
const ctxR = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctxR.addInitScript(s => localStorage.setItem('ar_sessao', s), sessoes[0]);
const pgR = await ctxR.newPage();
pgR.on('pageerror', e => erros.push(`resultado: ${String(e).slice(0, 160)}`));
await pgR.goto(BASE + '/');
for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: w > 500 ? 1000 : 900 } });
  await ctx.addInitScript(s => localStorage.setItem('ar_sessao', s), sessoes[3]);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${String(e).slice(0, 160)}`));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => document.querySelectorAll('#boloLista .boloLinha').length === 12, null, { timeout: 90000 });
  await pg.click('.boloLinha[data-sel="7"]');
  await pg.fill('#boloValor', '100');
  await pg.waitForTimeout(600);
  const card = await pg.$('#cardBolo');
  await card.screenshot({ path: `${PASTA}/bolo-aposta-${w}.png` });
  await pg.screenshot({ path: `${PASTA}/pagina-aposta-${w}.png` });
  console.log(`${w}: aposta capturada`);
  await ctx.close();
}

const pg = pgR;
await pg.waitForFunction(() => document.querySelector('#boloResultado .boloRes'), null, { timeout: 200000 });
await pg.waitForTimeout(800);
await (await pg.$('#cardBolo')).screenshot({ path: `${PASTA}/bolo-resultado-1440.png` });
for (const w of [420]) {
  await pg.setViewportSize({ width: w, height: 900 });
  await pg.waitForTimeout(400);
  await (await pg.$('#cardBolo')).screenshot({ path: `${PASTA}/bolo-resultado-${w}.png` });
}
console.log('resultado capturado:', (await pg.textContent('#boloResultado')).replace(/\s+/g, ' ').slice(0, 300));
await b.close();
console.log(`erros de página: ${erros.length}${erros.length ? ' — ' + erros.join(' | ') : ''}`);
process.exit(erros.length ? 1 : 0);
