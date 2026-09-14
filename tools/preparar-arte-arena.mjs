/* PREPARAR A ARTE DE FUNDO DA ARENA — tira a interface falsa do mockup.
 *
 * ── POR QUE ESTE SCRIPT EXISTE ─────────────────────────────────────────────
 *
 * `arte/Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg` não é uma arte de fundo:
 * é um MOCKUP de tela inteira, com navegação falsa legível embutida no pixel —
 * `Home`, `About Us`, `Events`, `Contact Us`, `ENTER THE ARENA`, `ABOUT` — e o
 * letrado da marca dentro de uma moldura de monitor.
 *
 * Usá-lo como está poria uma barra de navegação falsa atrás da luta. Era o que
 * a lacuna `L-046` registrava, e o dono do projeto decidiu: tirar os textos e
 * ficar com a imagem.
 *
 * ── O QUE ESTE SCRIPT FAZ, E O QUE ELE NÃO FAZ ────────────────────────────
 *
 * RECORTA a faixa que não contém interface, e PINTA POR CIMA do letrado, que
 * está no meio do que sobra. Não redesenha nada, não gera pixel novo, não
 * inventa continuação de cenário: o que sai é a mesma arte, menor, com um
 * retângulo escurecido onde havia texto.
 *
 * É a única operação honesta disponível aqui. "Reconstruir" o que está atrás do
 * letrado exigiria inventar cidade que ninguém desenhou — e inventar arte é
 * exatamente o que a regra do projeto proíbe.
 *
 * ── AS MEDIDAS, E DE ONDE ELAS SAEM ───────────────────────────────────────
 *
 * Medidas sobre a imagem original, 2816 × 1536, lendo a arte:
 *
 *   navegação falsa      y  50 …  95   (topo, à direita)   → fica FORA do corte
 *   botões do rodapé     y 900 … 965   (centro, embaixo)   → fica FORA do corte
 *   letrado na moldura   x 901…1915, y 648…929             → PINTADO por cima
 *
 * O corte guarda `y 150 … 1255`, que contém o Rayquaza inteiro — cabeça,
 * garra e as duas voltas do corpo — e a cidade dos dois lados.
 *
 * Uso:  PW_MODULO=... PW_CHROME=... node tools/preparar-arte-arena.mjs
 * Saída: arte/arena-rayquaza.png
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, extname, join, sep } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const ORIGEM = 'arte/Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg';
const DESTINO = join(RAIZ, 'arte/arena-rayquaza.png');

/* O recorte: tudo entre a navegação falsa e os botões. */
const CORTE = { x: 0, y: 150, w: 2816, h: 1105 };
/* O letrado, em coordenadas da imagem ORIGINAL. A conversão para as do recorte
   é feita abaixo, subtraindo `CORTE.y` — escrever as duas à mão seria manter
   duas medidas em sincronia para sempre. */
const LETRADO = { x: 895, y: 640, w: 1030, h: 300 };

if (!existsSync(PW) || !existsSync(CHROME)) {
  console.error('playwright-core ou o Chromium não estão instalados — ver tools/README.md');
  process.exit(2);
}

const MIME = { '.jpg':'image/jpeg', '.png':'image/png', '.html':'text/html; charset=utf-8' };
const srv = await new Promise(res => {
  const s = createServer((q, r) => {
    const p = join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(RAIZ + sep) || !existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    r.end(readFileSync(p));
  });
  s.listen(0, '127.0.0.1', () => res({ s, porta: s.address().port }));
});

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await (await b.newContext()).newPage();
await pg.goto(`http://127.0.0.1:${srv.porta}/${ORIGEM}`);

const dataURL = await pg.evaluate(async ({ origem, corte, letrado }) => {
  const img = new Image();
  await new Promise((ok, falha) => { img.onload = ok; img.onerror = falha; img.src = '/' + origem; });

  const cv = document.createElement('canvas');
  cv.width = corte.w; cv.height = corte.h;
  const c = cv.getContext('2d');
  c.drawImage(img, corte.x, corte.y, corte.w, corte.h, 0, 0, corte.w, corte.h);

  /* ESCURECER, E NÃO SUBSTITUIR — e esta foi a terceira tentativa.
   *
   * As duas primeiras preenchiam a área com uma cor colhida da arte, e as duas
   * saíram erradas: a primeira pegou um pixel numa zona iluminada e produziu um
   * retângulo ROXO CHAPADO; a segunda amostrou um bloco que caiu na faixa de
   * brilho acima da placa e saiu LAVANDA CLARO, com as letras ainda visíveis
   * por baixo. Olhar a saída pegou as duas; número nenhum teria.
   *
   * A lição: procurar "a cor certa" era a pergunta errada. A placa tem brilho,
   * gradiente e borda própria, e QUALQUER cor chapada por cima dela vira um
   * remendo — porque é um remendo.
   *
   * Escurecer preserva tudo isso. O preto por cima apaga o texto e mantém a
   * FORMA da placa, o brilho da borda e o degradê: lê-se como um painel
   * apagado, que é exatamente o que um monitor sem conteúdo é. E não inventa
   * um pixel sequer — só reduz os que já existiam.
   *
   * A borda é penada para o olho não encontrar o limite da região. */
  const ly = letrado.y - corte.y;
  const pena = 90;
  const preto = a => `rgba(6,8,16,${a})`;
  /* 0,94 ainda deixava o letrado legível como fantasma — as letras são neon
     muito claro, e 6% do brilho delas ainda lê. 0,975 apaga sem transformar a
     placa num buraco preto: a borda e o degradê continuam visíveis. */
  const FORTE = 0.975;

  c.fillStyle = preto(FORTE);
  c.fillRect(letrado.x + pena, ly + pena, letrado.w - pena * 2, letrado.h - pena * 2);
  const faixas = [
    [c.createLinearGradient(letrado.x, 0, letrado.x + pena, 0), letrado.x, ly, pena, letrado.h],
    [c.createLinearGradient(letrado.x + letrado.w, 0, letrado.x + letrado.w - pena, 0),
     letrado.x + letrado.w - pena, ly, pena, letrado.h],
    [c.createLinearGradient(0, ly, 0, ly + pena), letrado.x, ly, letrado.w, pena],
    [c.createLinearGradient(0, ly + letrado.h, 0, ly + letrado.h - pena),
     letrado.x, ly + letrado.h - pena, letrado.w, pena],
  ];
  for (const [gr, x, y, w, h] of faixas) {
    gr.addColorStop(0, preto(0)); gr.addColorStop(1, preto(FORTE));
    c.fillStyle = gr; c.fillRect(x, y, w, h);
  }

  return cv.toDataURL('image/png');
}, { origem: ORIGEM, corte: CORTE, letrado: LETRADO });

const bytes = Buffer.from(dataURL.split(',')[1], 'base64');
writeFileSync(DESTINO, bytes);
await b.close(); srv.s.close();

console.log(`arte/arena-rayquaza.png · ${CORTE.w}×${CORTE.h} · ${(bytes.length/1024).toFixed(0)} KB`);
console.log('recorte tirou a navegação falsa e os botões; o letrado foi coberto.');
