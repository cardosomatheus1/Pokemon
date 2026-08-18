/* Verificação visual — abre o app num navegador de verdade e confere que ele
 * roda com os sprites.
 *
 * NÃO é portão ainda. Q5 (visual) entra formalmente no F0.3, com comparação
 * contra captura de referência nos dois temas. Aqui é só prova de vida.
 *
 * Por que intercepta as requisições: em ambiente com proxy de egresso, o
 * Chromium pode não atravessar (ERR_CONNECTION_RESET) enquanto o Node
 * atravessa. Interceptar e servir pelo Node contorna isso SEM tocar no app —
 * o app continua pedindo exatamente as URLs que pediria em produção.
 *
 * Requisitos (fora do repositório, para manter a dependência zero):
 *   mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright-core
 *   python3 -m http.server 8791   (na raiz do repositório)
 *
 * Uso:  NODE_USE_ENV_PROXY=1 node tools/verificar-visual.mjs
 */
import { chromium } from '/tmp/pw/node_modules/playwright-core/index.mjs';
import { writeFileSync } from 'node:fs';

const cache = new Map();
async function buscar(url) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(url);
  const b = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  cache.set(url, b);
  return b;
}

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();

let servidos = 0, faltaram = 0;
await pg.route(/(githubusercontent|jsdelivr|pokemonshowdown)/, async route => {
  const url = route.request().url();
  try {
    const buf = await buscar(url);
    if (!buf) { faltaram++; return route.fulfill({ status:404 }); }
    servidos++;
    route.fulfill({ status:200, contentType: url.endsWith('.gif') ? 'image/gif' : 'image/png', body: buf });
  } catch (e) { faltaram++; route.fulfill({ status:502 }); }
});

pg.on('pageerror', e => console.log('PAGEERROR', String(e).split('\n')[0]));
await pg.goto('http://localhost:8791/app/index.html', { waitUntil:'load', timeout:60000 });
await pg.evaluate(()=>{ document.querySelectorAll('.view').forEach(x=>x.classList.remove('on')); document.querySelector('#viewArena')?.classList.add('on'); });
await pg.waitForTimeout(20000);
await pg.screenshot({ path:'/tmp/arena-com-sprites-apostas.png' });
await pg.waitForFunction(()=>document.querySelector('#phase')?.textContent==='AO VIVO', {timeout:70000}).catch(()=>{});
await pg.waitForTimeout(9000);
console.log('folhas servidas:', servidos, '· sem resposta:', faltaram);
console.log(JSON.stringify(await pg.evaluate(()=>({
  fase: document.querySelector('#phase')?.textContent,
  relogio: document.querySelector('#clock')?.textContent,
  comFundo: [...document.querySelectorAll('.mon .body')].filter(e=>e.style.backgroundImage.includes('http')).length,
}))));
await pg.screenshot({ path:'/tmp/arena-com-sprites.png' });
await b.close();
