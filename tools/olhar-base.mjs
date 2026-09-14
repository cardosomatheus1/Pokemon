/* OLHAR a tela que a linha de base reprovou — e não só o número dela.
 *
 * ── POR QUE ISTO EXISTE ──────────────────────────────────────────────────
 *
 * A linha de base do `visual.mjs` compara uma DIGITAL de 32x32 px dividida em
 * 8x8 regiões. Ela responde "a região 3,3 mudou, média 2,1" — e essa resposta é
 * ótima para reprovar e péssima para consertar:
 *
 *   > "região 3,3" é um endereço numa miniatura. Ninguém olha para uma
 *   > miniatura de 32 px e reconhece o que mudou.
 *
 * Esta ferramenta fotografa a MESMA tela, na MESMA largura e no MESMO instante
 * do portão, e desenha por cima a grade de 8x8 com a região acusada marcada.
 * O número vira um lugar, e o lugar é onde o olho vai.
 *
 * Nasceu no 1.27e, quando três telas que o bloco não tocou passaram a divergir
 * e eu gastei quatro experimentos adivinhando a causa — assets, arnês, código —
 * sem nunca ter olhado para a tela.
 */

import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = await import(pathToFileURL(PW).href);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'tools', 'previas', '_base');
mkdirSync(SAIDA, { recursive: true });

const ALVO = process.env.ALVO || 'http://127.0.0.1:8099/app/index.html';
/* As três que o 1.27e viu divergir, com a região que o portão acusou. */
const TELAS = [
  { nome: 'inicio',       hash: '#inicio',       rx: 3, ry: 3 },
  { nome: 'regras',       hash: '#regras',       rx: 1, ry: 2 },
  { nome: 'comofunciona', hash: '#comofunciona', rx: 2, ry: 1 },
];
const LARGURA = 420, ALTURA = 1600;

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
for (const t of TELAS) {
  const ctx = await b.newContext({ viewport: { width: LARGURA, height: ALTURA } });
  const pg = await ctx.newPage();
  await pg.goto(ALVO + t.hash, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(2500);

  /* A GRADE POR CIMA, e a região acusada em vermelho. A digital é da PÁGINA
     INTEIRA, então a grade tem de cobrir a altura toda — marcar só a dobra
     apontaria para o lugar errado. */
  await pg.evaluate(({ rx, ry }) => {
    const alt = document.documentElement.scrollHeight;
    const larg = document.documentElement.clientWidth;
    const c = document.createElement('div');
    c.style.cssText = `position:absolute;left:0;top:0;width:${larg}px;height:${alt}px;` +
      'pointer-events:none;z-index:99999';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const d = document.createElement('div');
      const marcada = x === rx && y === ry;
      d.style.cssText = `position:absolute;left:${x * larg / 8}px;top:${y * alt / 8}px;` +
        `width:${larg / 8}px;height:${alt / 8}px;box-sizing:border-box;` +
        (marcada ? 'border:3px solid #ff2d55;background:rgba(255,45,85,.18)'
                 : 'border:1px solid rgba(255,255,255,.22)');
      c.appendChild(d);
      if (marcada) {
        const r = document.createElement('div');
        r.textContent = `${x},${y}`;
        r.style.cssText = `position:absolute;left:${x * larg / 8 + 4}px;top:${y * alt / 8 + 4}px;` +
          'font:700 14px monospace;color:#ff2d55;background:#000;padding:2px 5px';
        c.appendChild(r);
      }
    }
    document.body.appendChild(c);
  }, t);

  const arq = join(SAIDA, `${t.nome}-${LARGURA}.png`);
  await pg.screenshot({ path: arq, fullPage: true });
  console.log(`  ${t.nome}@${LARGURA}: regiao ${t.rx},${t.ry} marcada — ${arq}`);
  await ctx.close();
}
await b.close();
console.log(`\n  ${TELAS.length} imagem(ns) em ${SAIDA}`);
console.log('  A grade e a da DIGITAL do portao: 8x8 sobre a pagina INTEIRA.\n');
