/* O ENSAIO DA CONTA NO NAVEGADOR — a segunda metade do Q5 da ST-13.5e.
 *
 *   node tools/olhar-conta.mjs [pasta]
 *     padrão: tools/previas/_conta
 *
 * Sobe o servidor NESTE processo (banco em memória, o jogo servido junto) e
 * faz, num Chromium de verdade e pelo modal, o que o jogador faria:
 *
 *   1. um navegador que já jogava sem conta abre o cadastro — o aviso da
 *      DEC-17 tem de estar lá (a coleção do navegador NÃO vai junto);
 *   2. cria a conta: a aba do idle abre VAZIA (a conta começa do zero), ele
 *      escolhe a inicial, e ela vai para o banco;
 *   3. outro navegador, LIMPO, entra na mesma conta: a coleção está lá;
 *   4. sem resposta do servidor, a aba mostra o cache e DIZ que ele pode estar
 *      velho.
 *
 * Cada passo é conferido (sai com código 1 se algum falhar) e capturado nas
 * larguras em que o arranjo muda. Imprime os erros de página. As capturas são
 * para LER, não para conferir que abriram.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import * as D from '../app/modules/idle-dados.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_conta';
const LARGURAS = (process.env.LARGURAS || '1920,1440,1100,420').split(',').map(Number);
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, servirJogo: true }, banco: ':memory:', sims: 40, laco: false });
const porta = await srv.ouvir(0);
const BASE = `http://127.0.0.1:${porta}`;

/* O save de quem jogava SEM conta: uma criatura só do navegador (o 7, que a
   conta nova não vai ter). */
const memoria = new Map();
const semConta = D.carregar({ getItem: k => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v), removeItem: k => memoria.delete(k) });
D.escolherInicial(semConta, PACK, 7, Date.now());
const SAVE_SEM_CONTA = JSON.stringify(semConta);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], falhas = [];
const conferir = (cond, texto) => { if (!cond) falhas.push(texto); console.log(`${cond ? '  ok  ' : 'FALHOU'} ${texto}`); };

async function abrir(w, { seed = null, rotas = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w > 500 ? 1100 : 1000 } });
  if (seed) await ctx.addInitScript(([s]) => { if (!localStorage.getItem('ar_idle')) localStorage.setItem('ar_idle', s); }, [seed]);
  const pg = await ctx.newPage();
  if (rotas) await rotas(pg);
  pg.on('pageerror', e => erros.push(`${w}: ${String(e).slice(0, 160)}`));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => !document.querySelector('#boot'), null, { timeout: 90000 });
  return { ctx, pg };
}
async function modal(pg, modo) {
  await pg.click(modo === 'signup' ? '#btnSignup' : '#btnLogin');
  /* A conta REAL aparece quando o servidor responde (`servidorNoAr`). */
  await pg.waitForFunction(() => getComputedStyle(document.querySelector('#authContaRow')).display !== 'none', null, { timeout: 20000 });
}
async function enviar(pg, campos) {
  for (const [sel, v] of Object.entries(campos)) await pg.fill(sel, v);
  if (await pg.$('#authAge:visible')) await pg.check('#authAge');
  await Promise.all([pg.waitForNavigation({ timeout: 30000 }), pg.click('#btnAuthGo')]);
  await pg.waitForFunction(() => !document.querySelector('#boot'), null, { timeout: 90000 });
}
async function irAoIdle(pg) {
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForFunction(() => document.querySelector('#viewIdle.on'), null, { timeout: 20000 });
  await pg.waitForTimeout(600);
}
const idsNaTela = pg => pg.$$eval('#idleEquipe [data-cria]', l => l.map(x => x.dataset.cria));

for (const w of LARGURAS) {
  const email = `ensaio${w}@conta.test`, senha = 'ensaio-senha-longa-1';
  console.log(`\n── ${w}px`);

  /* 1 · o cadastro num navegador que já tinha coleção. */
  const a = await abrir(w, { seed: SAVE_SEM_CONTA });
  await modal(a.pg, 'signup');
  const info = await a.pg.$eval('#authPerda', el => (el.hidden ? '' : el.textContent));
  conferir(/NÃO passa para a conta nova/.test(info), `${w} · o cadastro avisa que a coleção do navegador não vai junto`);
  await (await a.pg.$('#authModal .modal')).screenshot({ path: `${PASTA}/1-cadastro-aviso-${w}.png` });

  /* 2 · cria a conta: o idle abre vazio, e a inicial vai para o banco. */
  await enviar(a.pg, { '#authName': `Ens${w}`, '#authEmail': email, '#authSenha': senha, '#authNasc': '1994-02-03' });
  await irAoIdle(a.pg);
  const iniciais = await a.pg.$$('#idleIniciais [data-dex]');
  conferir(iniciais.length > 0 && !(await idsNaTela(a.pg)).length, `${w} · a conta nova começa do zero (a coleção do navegador ficou para trás)`);
  await a.pg.click(`#idleIniciais [data-dex="${PACK.iniciais[0]}"]`);
  await a.pg.waitForFunction(() => document.querySelectorAll('#idleEquipe [data-cria]').length > 0, null, { timeout: 20000 });
  const uid = srv.db.prepare(`SELECT id FROM users WHERE email = ?`).get(email)?.id;
  const noBanco = srv.db.prepare(`SELECT id FROM criaturas WHERE user_id = ?`).all(uid).map(l => l.id);
  const naTela = await idsNaTela(a.pg);
  conferir(noBanco.length === 1 && naTela.join() === noBanco.join(), `${w} · a inicial escolhida na tela está no banco (${noBanco.length})`);
  await (await a.pg.$('#viewIdle')).screenshot({ path: `${PASTA}/2-conta-nova-inicial-${w}.png` });
  await a.ctx.close();

  /* 3 · outro navegador, limpo: entra, e a coleção está lá. */
  const c = await abrir(w);
  await modal(c.pg, 'login');
  await enviar(c.pg, { '#authEmail': email, '#authSenha': senha });
  await irAoIdle(c.pg);
  const volta = await idsNaTela(c.pg);
  conferir(volta.join() === noBanco.join(), `${w} · limpa o navegador, entra, a coleção está lá (${volta.length})`);
  await (await c.pg.$('#viewIdle')).screenshot({ path: `${PASTA}/3-navegador-limpo-${w}.png` });

  /* 4 · sem o servidor responder a leitura: o cache fica, e a tela avisa. */
  await c.pg.route('**/api/idle', r => r.abort());
  await c.pg.reload();
  await c.pg.waitForFunction(() => !document.querySelector('#boot'), null, { timeout: 90000 });
  await irAoIdle(c.pg);
  const aviso = await c.pg.$eval('#idleConta', el => (el.hidden ? '' : el.textContent));
  conferir(/desatualizad/i.test(aviso) && (await idsNaTela(c.pg)).join() === noBanco.join(), `${w} · sem servidor, o cache fica e a tela diz que pode estar velho`);
  await (await c.pg.$('#viewIdle')).screenshot({ path: `${PASTA}/4-sem-servidor-${w}.png` });
  await c.ctx.close();
}

await b.close();
await srv.fechar();
console.log(`\nerros de página: ${erros.length}`);
for (const e of erros) console.log('  ' + e);
console.log(falhas.length ? `\nENSAIO VERMELHO — ${falhas.length} passo(s) falharam` : '\nENSAIO VERDE — todos os passos conferidos');
process.exit(falhas.length || erros.length ? 1 : 0);
