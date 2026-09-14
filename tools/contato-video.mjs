/* FOLHA DE CONTATO DE UM VÍDEO — para OLHAR uma referência em movimento.
 *
 * Irmão do `contato-gif.mjs`, e existe pela mesma razão: **o dono manda
 * referência em movimento e eu não vejo movimento.** Já disse isso três vezes
 * neste projeto — sobre o vídeo da evolução, sobre o gif da captura, e agora
 * sobre o vídeo dos NPCs das lojas.
 *
 *     "conheço o padrão"   é eu construindo de memória e pedindo correção
 *     "vi a referência"    é eu construindo o que ele mandou
 *
 * Gif se decodifica por índice com `ImageDecoder`. Vídeo não: o caminho é pedir
 * ao `<video>` para PARAR num instante e desenhar o quadro num canvas. Duas
 * consequências honestas, e elas ficam escritas:
 *
 *     o quadro é o mais próximo do instante pedido, e não exatamente ele
 *     o vídeo tem de estar decodificável pelo navegador (H.264, VP9, AV1)
 *
 * Uso:
 *   node tools/contato-video.mjs --video assets/npc/lojas.mp4 [--amostras 12]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME;

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const VIDEO = arg('video', null);
if (!VIDEO) { console.error('falta --video <caminho>'); process.exit(2); }
const AMOSTRAS = Number(arg('amostras', 12));
const COLUNAS = Number(arg('colunas', 4));
const LARGURA = Number(arg('largura', 420));
const SAIDA = arg('saida', join(RAIZ, '.telas', 'contato-video.png'));

/* O vídeo é grande demais para virar `data:` sem estourar a memória do
   avaliador; um servidor de uma linha o entrega como arquivo. */
const bytes = readFileSync(VIDEO);
const srv = createServer((q, res) => {
  if (q.url === '/pagina') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end('<!doctype html><meta charset="utf-8"><title>contato</title>');
  }
  res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': bytes.length });
  res.end(bytes);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port;

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
/* A PAGINA E SERVIDA PELO MESMO SERVIDOR do video: `setContent` deixa a
   origem em `about:blank`, e dali o `<video>` de outra origem nao carrega.
   Mesma familia da lição do `ImageDecoder` no 1.20 — contexto importa. */
await pg.goto(`http://127.0.0.1:${porta}/pagina`, { waitUntil: 'domcontentloaded' });

const saida = await pg.evaluate(async ({ porta, AMOSTRAS, COLUNAS, LARGURA }) => {
  const v = document.createElement('video');
  v.src = `http://127.0.0.1:${porta}/v.mp4`;
  v.muted = true; v.preload = 'auto';
  await new Promise((ok, ruim) => {
    v.onloadedmetadata = ok;
    v.onerror = () => ruim(new Error('o navegador não decodificou este vídeo'));
    setTimeout(() => ruim(new Error('o vídeo não carregou em 30 s')), 30000);
  });

  const razao = v.videoHeight / v.videoWidth;
  const cw = LARGURA, ch = Math.round(LARGURA * razao);
  const linhas = Math.ceil(AMOSTRAS / COLUNAS);
  const c = document.createElement('canvas');
  c.width = cw * COLUNAS; c.height = (ch + 18) * linhas;
  const g = c.getContext('2d');
  g.fillStyle = '#101820'; g.fillRect(0, 0, c.width, c.height);
  g.font = '13px monospace'; g.textBaseline = 'top';

  /* PARAR num instante e esperar o quadro. `seeked` é o sinal certo: sem ele o
     canvas desenha o quadro ANTERIOR, e a folha sai com a mesma imagem N vezes
     — que é exatamente o defeito que o gif teve no 1.20, por outra porta. */
  const irPara = t => new Promise(ok => { v.onseeked = ok; v.currentTime = t; });

  for (let k = 0; k < AMOSTRAS; k++) {
    const t = (k + 0.5) * v.duration / AMOSTRAS;
    await irPara(t);
    const x = (k % COLUNAS) * cw, y = Math.floor(k / COLUNAS) * (ch + 18);
    g.drawImage(v, x, y + 18, cw, ch);
    g.fillStyle = '#5ee7ff';
    g.fillText(`${t.toFixed(1)}s`, x + 5, y + 3);
    g.strokeStyle = 'rgba(94,231,255,.25)';
    g.strokeRect(x + .5, y + .5, cw - 1, ch + 17);
  }
  return { png: c.toDataURL('image/png').split(',')[1],
           w: v.videoWidth, h: v.videoHeight, dur: +v.duration.toFixed(2) };
}, { porta, AMOSTRAS, COLUNAS, LARGURA });

mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, Buffer.from(saida.png, 'base64'));
await b.close(); srv.close();
console.log(`${saida.w}x${saida.h} · ${saida.dur}s -> ${SAIDA}`);
console.log('Agora OLHE a folha.');
