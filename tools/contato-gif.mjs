/* FOLHA DE CONTATO DE UM GIF — para OLHAR uma referência animada (bloco 1.23).
 *
 * ── POR QUE ISTO EXISTE ──────────────────────────────────────────────────
 *
 * O dono manda referência em movimento — gif e vídeo — e **eu não vejo
 * movimento.** Já disse isso duas vezes neste projeto, sobre o vídeo da
 * evolução: busco a página, leio o título, e não vejo os quadros.
 *
 * Com gif dá para resolver, e a diferença importa:
 *
 *     "conheço o padrão"   é eu construindo de memória e pedindo correção
 *     "vi a referência"    é eu construindo o que ele mandou
 *
 * Esta ferramenta decodifica o gif quadro a quadro e monta uma grade — uma
 * imagem parada que eu consigo ler. Não produz nada que entre no jogo: é o
 * mesmo papel do `olhar-telas.mjs`, um passo de LEITURA.
 *
 * ── A DECODIFICAÇÃO É POR ÍNDICE, E ISSO NÃO É DETALHE ───────────────────
 *
 * `drawImage` de um `<img>` de gif no Chromium desenha **sempre o primeiro
 * quadro** — medido no 1.20, onde uma tira de 24 casas saiu com a mesma bola 24
 * vezes e diferença ZERO entre todos os pares vizinhos. `ImageDecoder`
 * (WebCodecs) pede o quadro pelo NÚMERO, e é o único caminho honesto.
 *
 * `ImageDecoder` exige origem segura, então sobe um servidor de uma linha em
 * 127.0.0.1 — mesma solução do `folha-pokebola.mjs`, e pela mesma razão.
 *
 * Uso:
 *   node tools/contato-gif.mjs --gif <caminho> [--colunas 6] [--amostras 30]
 *                              [--largura 200] [--saida .telas/contato.png]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME;

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const GIF = arg('gif', null);
if (!GIF) { console.error('falta --gif <caminho>'); process.exit(2); }
const COLUNAS  = Number(arg('colunas', 6));
const AMOSTRAS = Number(arg('amostras', 30));
const LARGURA  = Number(arg('largura', 200));
const SAIDA    = arg('saida', join(RAIZ, '.telas', 'contato.png'));

const bytes = readFileSync(GIF);
const dados = 'data:image/gif;base64,' + bytes.toString('base64');

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
const srv = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset="utf-8"><title>contato</title>');
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`);

const saida = await pg.evaluate(async ({ dados, COLUNAS, AMOSTRAS, LARGURA }) => {
  const bin = Uint8Array.from(atob(dados.split(',')[1]), c => c.charCodeAt(0));
  const dec = new ImageDecoder({ data: bin, type: 'image/gif' });
  await dec.tracks.ready;
  const total = dec.tracks.selectedTrack.frameCount;
  if (!total) throw new Error('o decodificador não achou quadro nenhum');

  const primeiro = (await dec.decode({ frameIndex: 0 })).image;
  const razao = primeiro.displayHeight / primeiro.displayWidth;
  const cw = LARGURA, ch = Math.round(LARGURA * razao);
  const n = Math.min(AMOSTRAS, total);
  const linhas = Math.ceil(n / COLUNAS);

  const c = document.createElement('canvas');
  c.width = cw * COLUNAS; c.height = (ch + 16) * linhas;
  const g = c.getContext('2d');
  g.fillStyle = '#101820'; g.fillRect(0, 0, c.width, c.height);
  g.font = '11px monospace'; g.textBaseline = 'top';

  for (let k = 0; k < n; k++) {
    const idx = Math.round(k * (total - 1) / Math.max(1, n - 1));
    const { image } = await dec.decode({ frameIndex: idx });
    const x = (k % COLUNAS) * cw, y = Math.floor(k / COLUNAS) * (ch + 16);
    g.drawImage(image, x, y + 16, cw, ch);
    image.close?.();
    /* O NÚMERO DO QUADRO VAI JUNTO. Sem ele a grade mostra o movimento e não
       diz ONDE cada coisa acontece — e é o "onde" que vira duração no código. */
    g.fillStyle = '#5ee7ff';
    g.fillText(`${idx}/${total - 1}`, x + 4, y + 3);
    g.strokeStyle = 'rgba(94,231,255,.25)';
    g.strokeRect(x + .5, y + .5, cw - 1, ch + 15);
  }
  return { png: c.toDataURL('image/png').split(',')[1], total,
           w: primeiro.displayWidth, h: primeiro.displayHeight };
}, { dados, COLUNAS, AMOSTRAS, LARGURA });

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, Buffer.from(saida.png, 'base64'));
await b.close(); srv.close();
console.log(`${saida.total} quadros de ${saida.w}x${saida.h} -> ${SAIDA}`);
console.log('Agora OLHE a folha.');
