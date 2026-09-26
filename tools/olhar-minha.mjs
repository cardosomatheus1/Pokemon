/* OLHAR MINHA COLEÇÃO — a segunda metade do Q5 para a ST-9.16b.
 *
 *   node tools/olhar-minha.mjs [endereco] [pasta]
 *
 * Abre a Pokédex na aba "Minha Coleção" com a janela de apostas aberta, em
 * três saves — vazio (jogador novo), parcial e cheio — nas larguras em que o
 * arranjo muda. Depois clica no atalho "Apostar" de uma linha e confere que a
 * Arena abriu com AQUELE lutador escolhido e a confirmação à mostra.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_minha';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const cria = (id, dex, naCaixa = false) => ({ id, dex, nivel: 12, xp: 0, vinculo: 0, foco: null, iv: [9, 9, 9, 9, 9, 9],
  natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: 0, criadaEm: 0, naCaixa });
const SAVES = {
  vazio: { escada: { vistas: [], encontradas: [] }, idle: null },
  parcial: {
    escada: { vistas: [6, 9, 3, 59, 38, 126, 136, 78, 146, 26, 125, 65], encontradas: [6] },
    idle: { v: 1, registro: { 10: 40, 16: 5 }, bolsa: {}, expedicoes: [], encontros: [], jaPossuiu: [4, 5, 7, 1],
            criaturas: [cria('a', 4), cria('b', 7), cria('c', 1, true)], doces: { 4: 3 } },
  },
  cheio: {
    escada: { vistas: Array.from({ length: 151 }, (_, i) => i + 1), encontradas: Array.from({ length: 151 }, (_, i) => i + 1) },
    idle: { v: 1, registro: {}, bolsa: {}, encontros: [], jaPossuiu: Array.from({ length: 80 }, (_, i) => i + 1),
            expedicoes: [{ id: 'x', bioma: 'floresta', perfil: 'trilha', equipe: ['h'], iniciadaEm: 0, terminaEm: 1, colhidaEm: null }],
            criaturas: [1, 4, 7, 25, 63, 92, 133, 147].map((d, i) => cria(String.fromCharCode(97 + i), d, i > 5)),
            doces: { 1: 12, 4: 9, 7: 4, 25: 1, 63: 20, 92: 7, 133: 2, 147: 5 } },
  },
};

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
for (const [nome, save] of Object.entries(SAVES)) for (const w of [1920, 1440, 1100, 420]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${nome}/${w}: ${e.message}`));
  await pg.addInitScript(s => {
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_pdx_aba', 'colecao');
    localStorage.setItem('ar_escada_arena', JSON.stringify(s.escada));
    if (s.idle) localStorage.setItem('ar_idle', JSON.stringify(s.idle));
  }, save);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewPokedex"]', el => el.click());
  await pg.waitForSelector('#pdxMinha .mcLinha', { timeout: 15000 });
  await pg.waitForTimeout(500);
  const el = await pg.$('#pdxAbaColecao');
  await el.screenshot({ path: `${PASTA}/minha-${nome}-${w}.png` });
  /* O ATALHO, uma vez por save na largura larga e na estreita. */
  if (w === 1440 || w === 420) {
    const alvo = await pg.$eval('#pdxMinha .mcLinha:nth-of-type(3) [data-escolher]', x => ({ i: x.dataset.escolher,
      nome: x.closest('.mcLinha').querySelector('.mcNome').firstChild.textContent.trim() }));
    await pg.click(`#pdxMinha [data-escolher="${alvo.i}"]`);
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(i => ({
      arena: document.getElementById('viewArena')?.classList.contains('on'),
      escolhido: document.querySelector('.pick.escolhido')?.dataset.i ?? null,
      caixa: !document.getElementById('confirmaAposta')?.hidden,
      texto: document.getElementById('confirmaAposta')?.innerText.replace(/\s+/g, ' ').slice(0, 120),
    }), alvo.i);
    achados.push(`${nome}/${w}: atalho em ${alvo.nome} (idx ${alvo.i}) → arena=${r.arena} escolhido=${r.escolhido} caixa=${r.caixa} "${r.texto}"`);
    if (!r.arena || r.escolhido !== alvo.i || !r.caixa) erros.push(`${nome}/${w}: o atalho não escolheu ${alvo.i}`);
    await pg.screenshot({ path: `${PASTA}/atalho-${nome}-${w}.png` });
  }
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
