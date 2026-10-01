/* OLHAR O "ISTO PRENDE" — a segunda metade do Q5 para a ST-14.3d.
 *
 *   node tools/olhar-prende.mjs [pasta]
 *     padrão: tools/previas/_prende
 *
 * Sobe o servidor NESTE processo (banco em memória), cria uma conta com um
 * Pikachu pronto para evoluir e a primeira Pedra Trovão de lote PRESO (bônus),
 * e doces da linha dele todos presos; abre o idle e captura a equipe (o selo
 * "evoluir ⚠ prende"), o primeiro clique armado, e o Centro (o botão de doce
 * com o aviso e armado). Imprime os erros de página.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { chaveDoDoce } from '../engine/doce.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_prende';
const LARGURAS = (process.env.LARGURAS || '1440,420').split(',').map(Number);
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, servirJogo: true }, banco: ':memory:', sims: 40, laco: false });
const porta = await srv.ouvir(0);
const BASE = `http://127.0.0.1:${porta}`;
const agora = Date.now();
const r = await fetch(BASE + '/api/auth/cadastrar', { method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'Prendedora', email: 'prende@ensaio.test', senha: 'ensaio-senha-longa-1', nascimento: '1994-02-03' }) }).then(x => x.json());
const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Prendedora'`).get().id;
for (const [dex, nivel] of [[25, 22], [4, 18], [7, 17]]) {
  const c = gerar(srv.db, { userId: uid, pack: PACK, dex, origem: 'captura' });
  srv.db.prepare(`UPDATE criaturas SET xp = ?, nivel = ? WHERE id = ?`).run(xpParaNivel(nivel), nivel, c.id);
}
creditarBolsa(srv.db, uid, 'trovao', 1, { classe: 'promotional_bound', fonte: 'bonus', agora: agora - 1000 });
creditarBolsa(srv.db, uid, 'trovao', 1, { classe: 'verified_earned', fonte: 'loja', agora });
srv.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade, presos) VALUES (?, ?, 3, 3)`).run(uid, chaveDoDoce(PACK, 25));
srv.db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade, presos) VALUES (?, ?, 4, 1)`).run(uid, chaveDoDoce(PACK, 4));

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const w of LARGURAS) {
  const ctx = await b.newContext({ viewport: { width: w, height: w > 500 ? 1100 : 1000 } });
  await ctx.addInitScript(([s]) => { localStorage.setItem('ar_sessao', s); localStorage.setItem('ar_session', '1'); }, [r.sessao]);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}: ${String(e).slice(0, 160)}`));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => !document.querySelector('#boot'), null, { timeout: 90000 });
  await pg.$eval('.nav[data-view="viewIdle"]', el => el.click());
  await pg.waitForFunction(() => document.querySelector('.criaEvo.prende'), null, { timeout: 30000 });   // D-139: sem os lotes do save, nunca aparecia
  await pg.waitForTimeout(500);
  const equipe = await pg.$('.criaEvo.prende');
  await equipe.scrollIntoViewIfNeeded();
  const carta = await equipe.evaluateHandle(el => el.closest('button, .idleCard, .card') ?? el.parentElement);
  await carta.screenshot({ path: `${PASTA}/selo-${w}.png` });
  await equipe.click();
  await pg.waitForTimeout(300);
  await carta.screenshot({ path: `${PASTA}/selo-armado-${w}.png` });
  const doce = await pg.$('.idleDarDoce.prende');
  if (doce) {
    await doce.scrollIntoViewIfNeeded();
    const item = await doce.evaluateHandle(el => el.closest('.idleCaixaItem'));
    await item.screenshot({ path: `${PASTA}/doce-${w}.png` });
    await doce.click(); await pg.waitForTimeout(300);
    await item.screenshot({ path: `${PASTA}/doce-armado-${w}.png` });
  } else erros.push(`${w}: o botão de doce com aviso não apareceu`);
  await ctx.close();
}
await b.close();
await srv.fechar();
console.log(erros.length ? `ERROS:\n${erros.join('\n')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
