/* FOLHA DOS RETRATOS DO BANNER — o passo OLHAR do tamanho dos GIFs.
 *
 * O dono do projeto: "alguns Pokémon estão com os formatos GIF maiores que os
 * outros; padronize um tamanho para os gifs apresentados no banner de batalha".
 *
 * ── O QUE A MEDIÇÃO MOSTROU ──────────────────────────────────────────────
 *
 * Os GIFs do pack variam de 31 px a 117 px de altura — 3,4 vezes. O
 * `object-fit:contain` da `.bnMon` faz cada um PREENCHER a caixa de 118 px,
 * então a ampliação é diferente para cada espécie:
 *
 *     Nidoran♀   35x34    ampliado 3,37x
 *     Bulbasaur  37x38    ampliado 3,11x
 *     Charizard  89x91    ampliado 1,30x
 *     Pidgeotto  82x117   ampliado 1,01x
 *
 * O bicho pequeno vira o maior da tela, e em pixel grosso.
 *
 * ── AS DUAS LEITURAS DE "PADRONIZAR", E ELAS SÃO OPOSTAS ─────────────────
 *
 * MESMO TAMANHO   todos preenchem a caixa. É o que já está lá, e é a causa da
 *                 queixa: a ampliação é que varia.
 * MESMA ESCALA    todos no mesmo fator. O tamanho na tela passa a refletir o
 *                 tamanho da criatura, como já acontece na arena — que usa
 *                 `SPRITE_MAX_H` justamente para isso.
 *
 * A segunda é a que faz o banner concordar com a arena. Esta folha põe as duas
 * lado a lado para a decisão ser tomada olhando.
 *
 *   node tools/folha-gifs.mjs
 */
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = `${RAIZ}/.telas/gifs-banner.png`;
const PASTA = 'assets/play_pokemonshowdown_com/sprites/gen5ani';

const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
if (!PW || !CHROME) { console.error('PW_MODULO e PW_CHROME não definidos.'); process.exit(1); }

/* Seis espécies que cobrem a faixa inteira, do menor ao maior sprite. */
const AMOSTRA = ['nidoranf', 'bulbasaur', 'pikachu', 'charizard', 'gyarados', 'pidgeotto'];

const dimGif = arq => {
  const b = readFileSync(`${RAIZ}/${PASTA}/${arq}.gif`);
  return [b.readUInt16LE(6), b.readUInt16LE(8)];
};

const caixa = (nome, classe) => {
  const [w, h] = dimGif(nome);
  return `<figure>
    <div class="bn"><img class="${classe}" src="${PASTA}/${nome}.gif"></div>
    <figcaption>${nome}<br><i>${w}x${h}</i></figcaption>
  </figure>`;
};

const HTML = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;padding:22px;background:#070a12;color:#dbe6f7;width:1000px;
       font:13px/1.4 system-ui,sans-serif}
  h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#00e5ff;
     margin:0 0 4px;border-bottom:1px solid rgba(0,229,255,.28);padding-bottom:6px}
  h3{font-size:12px;color:#dbe6f7;font-weight:600;margin:22px 0 2px}
  p.sub{font-size:11px;color:#8792a8;margin:0 0 10px}
  .linha{display:flex;gap:10px}
  figure{margin:0;text-align:center}
  figcaption{margin-top:4px;font-size:10px;color:#8792a8}
  figcaption i{color:#5f6b80;font-style:normal}
  /* A caixa REAL do banner: 118 px, o retrato ancorado embaixo à direita. */
  .bn{position:relative;width:150px;height:150px;border-radius:10px;
      border:1px solid rgba(0,229,255,.25);background:#101725;overflow:hidden}
  .bn img{position:absolute;right:6px;bottom:6px;width:118px;height:118px;
          image-rendering:pixelated}
  /* HOJE: preenche a caixa, custe a ampliação que custar. */
  .hoje{object-fit:contain}
  /* PROPOSTO: nunca amplia. Todos no mesmo fator 1x, e o tamanho na tela passa
     a dizer o tamanho da criatura — como a arena já faz. */
  .escala{object-fit:scale-down}
  /* o tamanho vem do script; object-fit deixa de decidir */
  .limitada{object-fit:none;width:auto;height:auto}
</style>
<h2>Os retratos do banner de batalha</h2>

<h3>HOJE — mesmo TAMANHO, ampliação diferente para cada um</h3>
<p class="sub">O de 35 px é esticado 3,4x e vira o maior da tela, em pixel grosso.</p>
<div class="linha">${AMOSTRA.map(n => caixa(n, 'hoje')).join('')}</div>

<h3>ESCALA NATURAL — ninguém é ampliado</h3>
<p class="sub">Some a ampliação, mas o bicho pequeno fica perdido na caixa.</p>
<div class="linha">${AMOSTRA.map(n => caixa(n, 'escala')).join('')}</div>

<h3>APLICADO — ampliação limitada a 1,5x, teto de 100 px</h3>
<p class="sub">O pequeno cresce o suficiente para se ver, o grande não estoura, e
a variação de ampliação cai de 3,4x para 1,5x, e o teto desceu de 118 para 100 px. É o mesmo desenho que a arena já
usa com o <code>SPRITE_MAX_H</code>.</p>
<div class="linha">${AMOSTRA.map(n => caixa(n, 'limitada')).join('')}</div>

<script>
  /* O teto por imagem precisa da dimensão NATURAL, que só existe depois de a
     imagem carregar — daí o script em vez de CSS. É a mesma conta do
     SPRITE_MAX_H da arena, escrita para o retrato. */
  for (const img of document.querySelectorAll('img.limitada')) {
    const ajusta = () => {
      const CAIXA = 100, FATOR = 1.5;
      const f = Math.min(FATOR, CAIXA / Math.max(img.naturalWidth, img.naturalHeight));
      img.style.width = Math.round(img.naturalWidth * f) + 'px';
      img.style.height = Math.round(img.naturalHeight * f) + 'px';
    };
    img.complete ? ajusta() : img.addEventListener('load', ajusta);
  }
</script>
`;

const { chromium } = await import(pathToFileURL(PW).href);
const nav = await chromium.launch({ executablePath: CHROME });
const pg = await nav.newPage({ viewport: { width: 1040, height: 950 } });
const TMP = `${RAIZ}/_folha-gifs.html`;
writeFileSync(TMP, HTML);
await pg.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
await pg.waitForTimeout(900);
writeFileSync(SAIDA, await pg.screenshot({ fullPage: true }));
await nav.close();
unlinkSync(TMP);
console.log(SAIDA);
