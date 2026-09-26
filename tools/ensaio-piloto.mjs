/* O ENSAIO DO PILOTO — o laço de um amigo, num navegador de verdade (D-112).
 *
 *   node tools/ensaio-piloto.mjs [endereco]      padrão: http://127.0.0.1:8080
 *
 * Rode com o servidor de pé (`npm run servidor`) ANTES de mandar o link. Ele
 * cria uma conta de ensaio, aposta numa rodada, espera a rodada acabar, e
 * confere no servidor que a aposta foi LIQUIDADA; depois sai e entra de novo.
 *
 * Existe porque o primeiro ensaio achou o D-112: com a suíte inteira verde,
 * nenhuma aposta do servidor era liquidada — a rodada fechava e o dinheiro
 * ficava reservado para sempre. Cada peça estava testada; o encaixe, não.
 *
 * A conta de ensaio fica no banco (e-mail `ensaio-<instante>@ensaio.test`), e
 * o relatório do piloto a conta como qualquer outra — ignore-a lá. */
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');
const { chromium } = await import(pathToFileURL(PW).href);

const b = await chromium.launch({ executablePath: CHROME });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const erros = [], recusas = [];
pg.on('pageerror', e => erros.push(String(e).slice(0, 200)));
pg.on('response', r => {
  const u = r.url().replace(BASE, '');
  if (u.startsWith('/api') && r.status() >= 400) recusas.push(`${r.status()} ${r.request().method()} ${u}`);
});
let falhou = 0;
const passo = async (nome, f) => {
  try { await f(); console.log('  ok     ', nome); }
  catch (e) { falhou++; console.log('  FALHOU ', nome, '—', String(e.message).split('\n')[0].slice(0, 160)); }
};
/* Um passo que falhou torna os seguintes sem sentido — e um "ok" depois de
   uma falha é o pior tipo de relatório. */
const seguir = async (nome, f) => (falhou ? console.log('  —      ', nome, '(não rodou)') : passo(nome, f));
/* Nome e e-mail únicos: o servidor recusa nome repetido, e recusa sem dizer
   o motivo — de propósito (a tela não vira consulta de conta). */
const marca = Date.now().toString(36).slice(-6);
const nome = `Ensaio${marca}`, email = `ensaio-${marca}@ensaio.test`, senha = 'ensaio-senha-longa-1';
const perfil = () => pg.evaluate(() => fetch('/api/perfil', {
  headers: { 'x-api-versao': '1', authorization: 'Bearer ' + localStorage.getItem('ar_sessao') } }).then(r => r.json()));

console.log(`ENSAIO DO PILOTO · ${BASE}`);
await pg.goto(BASE + '/');
await passo('o jogo abre e oferece conta real', async () => {
  await pg.waitForSelector('#btnSignup', { timeout: 60000 });
  await pg.click('#btnSignup');
  await pg.waitForFunction(() => getComputedStyle(document.querySelector('#authContaRow')).display !== 'none',
    null, { timeout: 10000 });
});
await seguir('cria a conta', async () => {
  await pg.fill('#authName', nome); await pg.fill('#authEmail', email);
  await pg.fill('#authSenha', senha); await pg.fill('#authNasc', '1994-02-03'); await pg.check('#authAge');
  await Promise.all([pg.waitForNavigation({ timeout: 20000 }), pg.click('#btnAuthGo')]);
  await pg.waitForSelector('.pick[data-i]', { timeout: 90000 });
});
let xpAntes = 0;
await seguir('aposta 50 numa rodada', async () => {
  xpAntes = (await perfil())?.perfil?.xp ?? 0;
  await pg.waitForFunction(() => /APOSTAS/i.test(document.body.innerText), null, { timeout: 120000 });
  await pg.click('.pick[data-i="0"]'); await pg.waitForTimeout(400);
  await pg.click('#btnConfirmarAposta'); await pg.waitForTimeout(2500);
  const info = (await pg.textContent('#betInfo'))?.replace(/\s+/g, ' ') ?? '';
  if (!/retorno se vencer/.test(info)) throw new Error(`a aposta não foi aceita: ${info.slice(0, 120)}`);
});
await seguir('a rodada acaba e a aposta é LIQUIDADA (XP sobe)', async () => {
  /* Pergunta ao servidor, no Node, a cada 3 s: esperar dentro da página com
     função assíncrona devolveria uma Promise — que é "verdadeira" na hora. */
  for (const fim = Date.now() + 240000; Date.now() < fim; await pg.waitForTimeout(3000)) {
    const r = await perfil();
    if (!r?.perfil) throw new Error(`o perfil não respondeu: ${JSON.stringify(r).slice(0, 100)}`);
    if (r.perfil.xp > xpAntes) return;
  }
  throw new Error('4 minutos e o XP não subiu — a aposta não foi liquidada');
});
await seguir('sai e entra de novo pelo e-mail', async () => {
  await pg.click('button:has-text("⏻")'); await pg.waitForTimeout(400);
  const conf = await pg.$('button:has-text("Sair")'); if (conf) await conf.click();
  await pg.waitForSelector('#btnLogin', { timeout: 20000 });
  await pg.click('#btnLogin'); await pg.waitForTimeout(800);
  await pg.fill('#authEmail', email); await pg.fill('#authSenha', senha);
  await Promise.all([pg.waitForNavigation({ timeout: 20000 }), pg.click('#btnAuthGo')]);
  await pg.waitForFunction(n => document.body.innerText.includes(n), nome, { timeout: 30000 });
});
console.log(`  erros de página: ${erros.length}${erros.length ? ' — ' + erros.slice(0, 3).join(' | ') : ''}`);
console.log(`  recusas da API:  ${recusas.length}${recusas.length ? ' — ' + [...new Set(recusas)].slice(0, 5).join(' | ') : ''}`);
await b.close();
const ok = !falhou && !erros.length && !recusas.length;
console.log(ok ? '\nPRONTO PARA CONVIDAR' : '\nNÃO CONVIDE AINDA — veja o que falhou acima');
process.exit(ok ? 0 : 1);
