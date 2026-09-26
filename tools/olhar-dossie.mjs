/* OLHAR O DOSSIÊ — a segunda metade do Q5 para a ST-9.3.
 *
 *   node tools/olhar-dossie.mjs [endereco] [pasta]
 *     padrão: http://127.0.0.1:8099   tools/previas/_dossie
 *
 * Abre a Pokédex com três estados da escada e captura a ficha nas larguras em
 * que o arranjo muda: o Charizard só VISTO (uma seção aberta, cinco
 * trancadas), o Charizard CAPTURADO (quatro abertas) e o Charmander, que não
 * luta e aponta para quem luta. Imprime os erros de página. As capturas são
 * para LER, não para conferir que abriram.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_dossie';
const LARGURAS = [1920, 1440, 1100, 420];
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const CASOS = [
  { nome: 'vista', dex: 6, marcas: { vistas: [6, 4], encontradas: [] }, criaturas: [] },
  { nome: 'capturada', dex: 6, marcas: { vistas: [6, 4], encontradas: [6] }, criaturas: [6] },
  { nome: 'dominada', dex: 6, marcas: { vistas: [6, 4], encontradas: [6] }, criaturas: [6], registro: { 4: 99 } },
  /* ST-9.5: com o realizado do servidor ao lado do modelo. A resposta da rota
     é fixa aqui (a captura não depende de quantas rodadas o servidor lutou). */
  { nome: 'servidor', dex: 6, marcas: { vistas: [6, 4], encontradas: [6] }, criaturas: [6],
    realizado: { rodadas: 412, especies: { 6: { n: 68, vitoria: { n: 68, taxa: 0.147 }, abates: { n: 68, media: 1.5 },
                                                caiCedo: { n: 68, taxa: 0.21 } } } } },
  { nome: 'pre-evolucao', dex: 4, marcas: { vistas: [6, 4], encontradas: [] }, criaturas: [4] },
];

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
for (const caso of CASOS) for (const w of LARGURAS) {
  console.log(`  ${caso.nome}@${w}`);
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${caso.nome}@${w}: ${e.message}`));
  await pg.addInitScript(c => {
    const agora = Date.now();
    localStorage.setItem('ar_session', '1');   // sem sessão o boot cai na home
    localStorage.setItem('ar_escada_arena', JSON.stringify(c.marcas));
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: c.registro ?? { 4: 3 }, bolsa: {}, expedicoes: [], encontros: [],
      criaturas: c.criaturas.map((dex, i) => ({ id: `olhar-${i}`, dex, nivel: 10, xp: 0, vinculo: 0, foco: null,
        iv: [20, 20, 20, 20, 20, 20], natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: agora, criadaEm: agora })) }));
  }, caso);
  if (caso.realizado) await pg.route('**/api/rodada/dossie', r => r.fulfill({ status: 200,
    contentType: 'application/json', body: JSON.stringify(caso.realizado) }));
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  /* Esperar ESTADO: o Monte Carlo da primeira rodada cobre a tela até acabar. */
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewPokedex"]', el => el.click());
  await pg.waitForFunction(() => getComputedStyle(document.getElementById('viewPokedex')).display !== 'none', null, { timeout: 8000 });
  await pg.waitForTimeout(800);   // o realizado chega e repinta a lista; clicar antes clica no que vai sumir
  await pg.$eval(`#viewPokedex [data-dex="${caso.dex}"]`, el => el.click());
  await pg.waitForSelector('#pdxFicha .pdxBloco', { timeout: 15000 });
  if (caso.realizado) await pg.waitForFunction(() => /Neste servidor/.test(document.querySelector('#pdxFicha')?.textContent ?? ''),
    null, { timeout: 8000 });
  await pg.waitForTimeout(600);
  /* A ficha rola por dentro: a captura é do bloco "Na Arena", trazido à vista,
     e a da página inteira mostra onde ele cai. */
  const bloco = await pg.evaluateHandle(() => [...document.querySelectorAll('#pdxFicha .pdxBloco')]
    .find(x => /Na Arena/.test(x.querySelector('h5')?.textContent ?? '')));
  await bloco.evaluate(el => el.scrollIntoView({ block: 'start' }));
  await pg.waitForTimeout(200);
  await bloco.asElement().screenshot({ path: `${PASTA}/${caso.nome}-${w}.png` });
  await pg.screenshot({ path: `${PASTA}/${caso.nome}-${w}-pagina.png` });
  await ctx.close();
}
await b.close();
console.log(erros.length ? `ERROS DE PÁGINA:\n  ${erros.join('\n  ')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
