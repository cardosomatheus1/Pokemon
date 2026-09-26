/* OLHAR O RETORNO — a segunda metade do Q5 para a ST-9.17.
 *
 *   node tools/olhar-retorno.mjs [endereco] [pasta]
 *
 * Abre o jogo com sessão e uma visita anterior de 26 h atrás: uma expedição
 * pronta, duas criaturas que subiram, doces de duas linhas, e uma linha a duas
 * fichas de dominar. Captura a Início nas larguras em que o arranjo muda, e
 * confere as duas pontas do roteamento: com novidade abre na Início; na
 * primeira visita (sem foto) abre na Arena, sem cartão.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_retorno';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
async function abrir(w, comFoto) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}${comFoto ? '' : '/1a'}: ${e.message}`));
  await pg.addInitScript(comFoto => {
    if (sessionStorage.getItem('ja')) return;      // só na primeira carga: a página grava a foto nova
    sessionStorage.setItem('ja', '1');
    const agora = Date.now(), H = 3600e3;
    const cria = (id, dex, nivel, naCaixa = false) => ({ id, dex, nivel, xp: 0, vinculo: 0, foco: null, iv: [9, 9, 9, 9, 9, 9],
      natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: agora, criadaEm: agora - 90 * H, naCaixa });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, bolsa: {}, encontros: [], jaPossuiu: [4, 7, 1],
      registro: { 4: 6, 5: 0 },
      criaturas: [cria('a', 4, 14), cria('b', 7, 9), cria('c', 1, 6, true)],
      doces: { 4: 7, 7: 3 },
      expedicoes: [{ id: 'x', bioma: 'floresta', perfil: 'trilha', equipe: ['b'], estagio: 1,
                     iniciadaEm: agora - 5 * H, terminaEm: agora - H, colhidaEm: null }] }));
    if (comFoto) localStorage.setItem('ar_retorno', JSON.stringify({ em: agora - 26 * H,
      niveis: { a: 12, b: 8, c: 6 }, doces: { 4: 3, 7: 2 } }));
  }, comFoto);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  /* A tela de carregamento cobre tudo até as odds existirem. */
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.waitForTimeout(600);
  return { ctx, pg };
}

for (const w of [1920, 1440, 1100, 420]) {
  const { ctx, pg } = await abrir(w, true);
  const r = await pg.evaluate(() => ({ home: document.getElementById('viewHome')?.classList.contains('on'),
    cartao: !document.getElementById('retorno')?.hidden, texto: document.getElementById('retorno')?.innerText.replace(/\s+/g, ' ') }));
  achados.push(`${w}: home=${r.home} cartao=${r.cartao} "${r.texto}"`);
  if (!r.home || !r.cartao) erros.push(`${w}: com novidade não abriu na Início com o cartão`);
  await pg.screenshot({ path: `${PASTA}/retorno-${w}.png` });
  /* Recarregar: a foto desta visita já foi gravada — nada é novidade (a
     expedição que esperava é estado), então abre na Arena, sem cartão. */
  await pg.reload({ waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  const d = await pg.evaluate(() => ({ arena: document.getElementById('viewArena')?.classList.contains('on'),
    cartao: !document.getElementById('retorno')?.hidden }));
  achados.push(`${w} (recarregada): arena=${d.arena} cartao=${d.cartao}`);
  if (!d.arena || d.cartao) erros.push(`${w}: recarregar repetiu o cartão ou não abriu na Arena`);
  await ctx.close();
}
{
  const { ctx, pg } = await abrir(1440, false);
  const r = await pg.evaluate(() => ({ arena: document.getElementById('viewArena')?.classList.contains('on'),
    cartao: !document.getElementById('retorno')?.hidden }));
  achados.push(`1a visita: arena=${r.arena} cartao=${r.cartao}`);
  if (!r.arena || r.cartao) erros.push('a primeira visita não abriu na Arena, ou desenhou cartão');
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
