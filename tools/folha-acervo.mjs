/* FOLHA DE CONTATO DO ACERVO — o passo OLHAR do R30, em um arquivo.
 *
 * O CLAUDE.md é explícito: bloco que mexe em tela fecha com inspeção visual, e
 * "não é conferir que abriu: é ler o que está escrito". Vinte arquivos derivados
 * automaticamente são vinte chances de o recorte ter saído torto sem que teste
 * nenhum reclame — arquivo existe, tem o tamanho certo, e mostra a orelha do
 * bicho em vez do rosto.
 *
 * Duas coisas que só aparecem aqui:
 *
 *   AURÉOLA. Um recorte com sobra clara na borda é invisível contra branco, que
 *   é o fundo de qualquer visualizador. Os avatares são desenhados sobre
 *   `--bg`/`--panel2`, que é onde eles de fato aparecem no jogo.
 *
 *   OS DOIS ENQUADRAMENTOS. Cada cena aparece na caixa alta do banner E na tira
 *   do topo, com as posições que o catálogo declara. É a comparação que o R30
 *   existe para resolver, e ela não cabe em asserção: a pergunta é "a tira ficou
 *   com um pedaço que se reconhece?".
 *
 *   node tools/folha-acervo.mjs      -> arte/acervo/folha-contato.png
 */
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { AVATARES_ARTE, CENAS_ARTE, arquivoAvatar, arquivoCena } from '../app/modules/acervo-dados.mjs';
import { FONTES_AVATAR } from './acervo-fontes.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = `${RAIZ}/arte/acervo/folha-contato.png`;

const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
if (!PW || !CHROME) { console.error('PW_MODULO e PW_CHROME não definidos.'); process.exit(1); }

/* AS TRÊS CAIXAS, NAS PROPORÇÕES QUE ELAS TÊM DE VERDADE.
 *
 * A primeira versão desta folha desenhou a faixa do topo com proporção ~5,8, e
 * com isso aprovou enquadramentos que na tela pegam o TRONCO do personagem em
 * vez do rosto. A `.fa-cena` real é ~31 (1560 px por ~50): com `cover` sobre uma
 * fonte 16:9, o que aparece é 1,78/31 = 5,7% da altura da imagem — uma fita.
 * Nessa fatia, errar o Y em 10% é errar o personagem inteiro.
 *
 * Régua conferida contra o index.html:
 *     .bnCena             ~380 x 300 na coluna de ação
 *     #profBanner .scene  ~380 x 112
 *     .fa-cena            ~1560 x 50
 */
/* O MAPA é o que faltava na primeira folha.
 *
 * Ver a fita recortada não diz PARA ONDE mover o Y — só que está errado. O mapa
 * mostra a imagem inteira com a fatia marcada em cima dela, e aí a correção é
 * de leitura direta: a faixa está no tronco, o rosto está 12% acima, tira o Y
 * em 12.
 *
 * A conta da altura da fatia: com `cover`, uma caixa de proporção A sobre uma
 * fonte de proporção F (mais estreita) mostra F/A da altura. Para a faixa do
 * topo, 1,78/31 = 5,7%. O topo da fatia fica em Y% do que sobra, que é o mesmo
 * que o `background-position` faz. */
const MAPA_L = 400, MAPA_A = 225;
const fatia = (aspecto) => (16 / 9) / aspecto;

const banda = (pctY, aspecto, cor) => {
  const h = MAPA_A * fatia(aspecto);
  const topo = (MAPA_A - h) * pctY / 100;
  return `<div class="banda" style="top:${topo.toFixed(1)}px;height:${h.toFixed(1)}px;
          box-shadow:0 0 0 2px ${cor}"></div>`;
};

const cena = c => `
  <figure>
    <div class="par">
      <div class="mapa" style="background-image:url('${arquivoCena(c.id)}')">
        ${banda(c.faixa[1], 31, '#00e5ff')}
        ${banda(c.faixa[1], 3.4, 'rgba(255,210,0,.85)')}
      </div>
      <div><div class="alto" style="background-image:url('${arquivoCena(c.id)}');
           background-position:${c.foco[0]}% ${c.foco[1]}%"></div>
        <b>banner da rodada · foco ${c.foco.join('/')}</b></div>
      <div><div class="perfil" style="background-image:url('${arquivoCena(c.id)}');
           background-position:${c.faixa[0]}% ${c.faixa[1]}%"></div>
        <b>tira do perfil (~3,4) · tira ${c.faixa.join('/')}</b></div>
      <div class="nome">${c.id}</div>
    </div>
    <div class="topo" style="background-image:url('${arquivoCena(c.id)}');
         background-position:${c.faixa[0]}% ${c.faixa[1]}%"></div>
    <b class="leg">faixa do topo — proporção REAL ~31 · tira ${c.faixa.join('/')}</b>
  </figure>`;

/* A RÉGUA — como se ESCOLHE um valor de `--tira`, em vez de tentar e olhar.
 *
 * A fatia da faixa do topo tem 5,7% da altura. Nessa escala, "mais para cima"
 * não é instrução: é preciso saber que o rosto está em 27% e não em 35%. As
 * linhas de 10% dão essa leitura direta da imagem inteira.
 *
 * As três cenas ANTIGAS entram aqui também. Elas ganharam `--tira` no R30 pelo
 * mesmo motivo das novas, e deixá-las fora da régua seria calibrar dez e chutar
 * três. */
const ANTIGAS = [
  { id:'cidade', nm:'Cidade Neon',     arq:'arte/cidade-neon.jpg' },
  { id:'portal', nm:'Portal da Arena', arq:'arte/portal-arena.jpg' },
  { id:'nucleo', nm:'Núcleo',          arq:'arte/nucleo-orbe.jpg' },
];
/* Os valores das três antigas moram no CSS (elas não passam pelo catálogo do
   acervo). Repetidos aqui só para a régua desenhar a fatia certa — e é uma
   duplicação que incomoda de propósito: ela some quando as três migrarem para
   o catálogo — ver a L-048. */
const TIRA_ANTIGA = { cidade: 30, portal: 45, nucleo: 28 };

const REGUA_L = 520, REGUA_A = 293;

const regua = (id, arq, tiraY) => {
  const linhas = [];
  for (let p = 10; p < 100; p += 10)
    linhas.push(`<div class="lin" style="top:${(REGUA_A * p / 100).toFixed(1)}px"><s>${p}</s></div>`);
  const h = REGUA_A * (16 / 9) / 31;
  const topo = (REGUA_A - h) * tiraY / 100;
  return `<figure>
    <div class="rg" style="background-image:url('${arq}')">
      ${linhas.join('')}
      <div class="fat" style="top:${topo.toFixed(1)}px;height:${h.toFixed(1)}px"></div>
    </div>
    <b>${id} — tira Y=${tiraY} · a fatia cobre ${(topo / REGUA_A * 100).toFixed(0)}%–${((topo + h) / REGUA_A * 100).toFixed(0)}%</b>
  </figure>`;
};

const av = a => `
  <figure class="av">
    <img src="${arquivoAvatar(a.id)}" width="132" height="132">
    <img class="pq" src="${arquivoAvatar(a.id)}" width="66" height="66">
    <figcaption>${a.id} <i>${FONTES_AVATAR[a.id].recorte}</i></figcaption>
  </figure>`;

const HTML = `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;padding:22px;background:#070a12;color:#dbe6f7;
       font:13px/1.4 system-ui,sans-serif;width:1600px}
  h2{font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#00e5ff;
     margin:26px 0 12px;border-bottom:1px solid rgba(0,229,255,.28);padding-bottom:6px}
  h2:first-child{margin-top:0}
  .grade{display:grid;grid-template-columns:1fr;gap:22px}
  .avs{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  figure{margin:0}
  .par{display:flex;gap:14px;align-items:flex-end}
  .nome{font-size:15px;color:#00e5ff;font-weight:700;padding-bottom:26px}
  b{display:block;margin-top:4px;font-size:10px;color:#8792a8;font-weight:400}
  .leg{margin-top:3px}
  .rgs{display:grid;grid-template-columns:repeat(2,1fr);gap:18px 22px}
  .rg{position:relative;width:520px;height:293px;background-size:cover;
      background-position:center;background-repeat:no-repeat;border-radius:8px;
      border:1px solid rgba(255,255,255,.18)}
  .lin{position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,.34)}
  .lin s{position:absolute;left:3px;top:-13px;font-size:10px;color:#fff;
         text-decoration:none;text-shadow:0 0 4px #000,0 0 4px #000}
  .fat{position:absolute;left:0;right:0;background:rgba(0,229,255,.30);
       box-shadow:0 0 0 2px #00e5ff}
  /* O MAPA: a imagem inteira, com as duas fatias marcadas por cima. Ciano é a
     faixa do topo (~31), amarelo é a tira do perfil (~3,4). */
  .mapa{position:relative;width:400px;height:225px;background-size:cover;
        background-position:center;background-repeat:no-repeat;
        border:1px solid rgba(255,255,255,.18);border-radius:8px}
  .banda{position:absolute;left:0;right:0;background:rgba(0,229,255,.16)}
  .alto{width:380px;height:300px;background-size:cover;background-repeat:no-repeat;
        border:2px solid rgba(0,229,255,.34);border-radius:14px}
  .perfil{width:380px;height:112px;background-size:cover;background-repeat:no-repeat;
        border:1px solid rgba(0,229,255,.34);border-radius:12px}
  /* 1552 / 31 ~ 50 px: a MESMA proporção da .fa-cena na tela */
  .topo{margin-top:10px;height:50px;background-size:cover;background-repeat:no-repeat;
        border:1px solid rgba(0,229,255,.34);border-radius:10px}
  /* o avatar sobre o painel onde ele de fato aparece */
  .av img{background:rgba(10,17,31,.78);border:2px solid #00e5ff;border-radius:12px;
          object-fit:contain;display:block}
  .av .pq{margin-top:6px;border-width:1px;border-radius:8px}
</style>
<h2>Régua — onde a fatia da faixa do topo cai, em % da altura da imagem</h2>
<div class="rgs">${[
  ...CENAS_ARTE.map(c => regua(c.id, arquivoCena(c.id), c.faixa[1])),
  ...ANTIGAS.map(a => regua(a.id, a.arq, TIRA_ANTIGA[a.id])),
].join('')}</div>
<h2>Cenários — caixa do banner (em cima) e tira do topo (embaixo)</h2>
<div class="grade">${CENAS_ARTE.map(cena).join('')}</div>
<h2>Avatares sobre o painel do jogo — 132 px e no tamanho real de 66 px</h2>
<div class="avs">${AVATARES_ARTE.map(av).join('')}</div>`;

const { chromium } = await import(pathToFileURL(PW).href);
const nav = await chromium.launch({ executablePath: CHROME });
const pg = await nav.newPage({ viewport: { width: 1644, height: 900 } });
/* A página é escrita NA RAIZ e aberta por `file://`, e não montada com
   `setContent`: os caminhos do catálogo são relativos à raiz do repositório, e
   `setContent` não tem base para resolvê-los — as imagens viriam todas quebradas
   e a folha de contato mostraria vinte molduras vazias com ar de sucesso. */
const TMP = `${RAIZ}/_folha-acervo.html`;
writeFileSync(TMP, HTML);
await pg.goto(pathToFileURL(TMP).href, { waitUntil: 'load' });
await pg.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
mkdirSync(dirname(SAIDA), { recursive: true });
/* `node tools/folha-acervo.mjs regua` fotografa SÓ a régua. A folha inteira
   passa de 4.800 px de altura, e nessa escala as marcas de 10% ficam ilegíveis
   justamente para quem precisa lê-las. */
const so = process.argv.slice(2).find(a => ['regua', 'cenas', 'avatares'].includes(a));
const sel = { regua: '.rgs', cenas: '.grade', avatares: '.avs' }[so];
writeFileSync(SAIDA, sel ? await pg.locator(sel).screenshot()
                         : await pg.screenshot({ fullPage: true }));
await nav.close();
unlinkSync(TMP);
console.log(SAIDA);
