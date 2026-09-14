/* FOLHA DO SHINY — o passo OLHAR do R34, lado a lado.
 *
 * O pedido do dono do projeto tinha uma condição que vale mais que o pedido:
 * "nada brega nem feio". Isso não se responde com asserção — responde-se
 * pondo o normal e o shiny um ao lado do outro, no tamanho REAL em que cada um
 * aparece, e olhando.
 *
 * Três tamanhos, porque o brilho tem de funcionar nos três:
 *
 *     22 px   o sprite na arena, que é onde ele é menor e mais fácil de errar
 *     118 px  o retrato do banner de batalha
 *     38 px   o quadrinho da grade de escolha
 *
 * E dois fundos: a cratera escura, onde a queixa original do crítico cego
 * vivia, e a praia clara, onde um halo quente corre o risco de sumir.
 *
 *   node tools/folha-shiny.mjs
 */
import { writeFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const SAIDA = `${RAIZ}/.telas/shiny-lado-a-lado.png`;

const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
if (!PW || !CHROME) { console.error('PW_MODULO e PW_CHROME não definidos.'); process.exit(1); }

/* Um sprite qualquer do elenco serve: o que se julga é o BRILHO, e ele é o
   mesmo para toda paleta — foi essa a decisão do R34 (nada é pintado por cima
   da arte). O GIF vem da cópia local, como tudo. */
const GIF  = 'assets/play_pokemonshowdown_com/sprites/gen5ani/arcanine.gif';
const GIFS = 'assets/play_pokemonshowdown_com/sprites/gen5ani-shiny/arcanine.gif';

const par = (titulo, fundo, corpo) => `
  <section>
    <h3>${titulo}</h3>
    <div class="par" style="background:${fundo}">
      <figure>${corpo(false)}<figcaption>normal</figcaption></figure>
      <figure>${corpo(true)}<figcaption>shiny</figcaption></figure>
    </div>
  </section>`;

const HTML = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;padding:20px;background:#070a12;color:#dbe6f7;width:900px;
       font:13px/1.4 system-ui,sans-serif}
  h2{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#00e5ff;
     margin:0 0 14px;border-bottom:1px solid rgba(0,229,255,.28);padding-bottom:6px}
  h3{font-size:11px;color:#8792a8;font-weight:400;margin:16px 0 6px;letter-spacing:.06em}
  .par{display:flex;gap:26px;align-items:flex-end;padding:18px 22px;border-radius:10px;
       border:1px solid rgba(255,255,255,.1)}
  figure{margin:0;text-align:center}
  figcaption{margin-top:8px;font-size:10px;color:#8792a8}

  /* As regras copiadas do index.html, pelos mesmos seletores. Copiar em vez de
     importar é deliberado: a folha precisa rodar sem servidor e sem o app.
     O risco é elas divergirem, e o teste do R34 cobre isso comparando os
     valores desta folha com os do index.html. */
  .mon{position:relative;display:inline-block}
  .mon .body{display:block;
    --contorno:drop-shadow(0 0 1px rgba(0,0,0,.9)) drop-shadow(0 3px 4px rgba(0,0,0,.45));
    filter:var(--contorno)}
  .mon.shiny .body{
    --contorno:drop-shadow(0 0 1px rgba(0,0,0,.9))
               drop-shadow(0 0 5px rgba(255,214,90,.55))
               drop-shadow(0 3px 4px rgba(0,0,0,.45))}
  .mon.shiny::after{content:'✦';position:absolute;right:-2px;top:-4px;
    font-size:9px;line-height:1;color:#ffe58a;pointer-events:none;
    text-shadow:0 0 5px rgba(255,214,90,.95),0 0 2px rgba(0,0,0,.8)}
  img[data-shiny="1"]{filter:drop-shadow(0 0 4px rgba(255,214,90,.75))}
  .temShiny{position:relative;display:inline-block}
  .temShiny::after{content:'✦';position:absolute;right:3px;top:2px;z-index:3;
    font-size:11px;line-height:1;color:#ffe58a;pointer-events:none;
    text-shadow:0 0 6px rgba(255,214,90,.95),0 0 2px rgba(0,0,0,.85)}
  .bnShiny{position:absolute;right:14px;bottom:118px;z-index:3;
    font-size:15px;line-height:1;color:#ffe58a;pointer-events:none;
    text-shadow:0 0 8px rgba(255,214,90,.95),0 0 3px rgba(0,0,0,.85)}
  .caixaBanner{position:relative;width:300px;height:200px;border-radius:12px;
    border:1px solid rgba(0,229,255,.3);overflow:hidden;
    background:#101725}
  .caixaBanner img{position:absolute;right:6px;bottom:14px;width:118px;height:118px;
    object-fit:contain;image-rendering:pixelated}
  .quadrinho{width:52px;height:52px;border:1px solid rgba(0,229,255,.3);border-radius:8px;
    display:flex;align-items:center;justify-content:center;background:rgba(10,17,31,.78)}
  .quadrinho img{width:38px;height:38px;object-fit:contain;image-rendering:pixelated}
</style>
<h2>R34 — o brilho do shiny, nos três tamanhos e nos dois fundos</h2>

${par('arena · 22 px · fundo escuro (a cratera)', '#161d2b', sh => `
  <span class="mon${sh ? ' shiny' : ''}">
    <img class="body" src="${sh ? GIFS : GIF}" width="22" height="22">
  </span>`)}

${par('arena · 22 px · fundo claro (a praia)', '#d9c79a', sh => `
  <span class="mon${sh ? ' shiny' : ''}">
    <img class="body" src="${sh ? GIFS : GIF}" width="22" height="22">
  </span>`)}

${par('arena · 64 px · para ver o desenho de perto', '#161d2b', sh => `
  <span class="mon${sh ? ' shiny' : ''}">
    <img class="body" src="${sh ? GIFS : GIF}" width="64" height="64">
  </span>`)}

${par('banner de batalha · 118 px', '#0b1120', sh => `
  <div class="caixaBanner">
    <img src="${sh ? GIFS : GIF}"${sh ? ' data-shiny="1"' : ''}>
    ${sh ? '<span class="bnShiny">✦</span>' : ''}
  </div>`)}

${par('grade de escolha · 38 px', '#0b1120', sh => `
  <div class="quadrinho${sh ? ' temShiny' : ''}">
    <img src="${sh ? GIFS : GIF}"${sh ? ' data-shiny="1"' : ''}>
  </div>`)}
`;

const { chromium } = await import(pathToFileURL(PW).href);
const nav = await chromium.launch({ executablePath: CHROME });
const pg = await nav.newPage({ viewport: { width: 940, height: 900 } });
const TMP = `${RAIZ}/_folha-shiny.html`;
writeFileSync(TMP, HTML);
await pg.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
await pg.waitForTimeout(700);
writeFileSync(SAIDA, await pg.screenshot({ fullPage: true }));
await nav.close();
unlinkSync(TMP);
console.log(SAIDA);
