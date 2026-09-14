/* A POKÉBOLA GIRANDO VIRA UMA FOLHA DE SPRITES (bloco 1.20).
 *
 * ── POR QUE NÃO USAR O GIF DIRETO ────────────────────────────────────────
 *
 * O dono mandou o gif e ele é ótimo — e é de **5,71 MB, 516×516, 80 quadros**.
 * Na Pokédex ele apareceria como um selo de 22 px em até 146 linhas ao mesmo
 * tempo. O navegador baixaria 5,7 MB, decodificaria 80 quadros de meio megapixel
 * cada, e reduziria tudo para 22 px — 146 vezes.
 *
 *     Arte pesada não é arte boa: é arte que o jogador espera para ver.
 *
 * ── A FOLHA, E A ANIMAÇÃO POR `steps()` ──────────────────────────────────
 *
 * Uma tira horizontal de N quadros, e o CSS anda de quadro em quadro com
 * `animation-timing-function: steps(N)`. É a técnica de sprite de sempre, e ela
 * dá três coisas que o gif não dá:
 *
 *     UM arquivo pequeno, cacheado uma vez e usado em 146 lugares
 *     CONTROLE do tamanho e da velocidade pelo CSS
 *     PAUSA em `prefers-reduced-motion`, que um gif ignora
 *
 * ── OS QUADROS SAEM POR AMOSTRAGEM, E ISSO ESTÁ DECLARADO ────────────────
 *
 * `drawImage` de um `<img>` animado desenha o quadro que está NA TELA naquele
 * instante — não há como pedir "o quadro 7". Então a ferramenta desenha em N
 * momentos igualmente espaçados dentro de UM laço (3,33 s, medido nos blocos de
 * controle do próprio gif).
 *
 * A consequência honesta: os quadros saem próximos dos originais, não idênticos
 * a eles. Numa rotação suave isso não se vê; num gif com corte seco se veria, e
 * aí a saída certa seria outra. Fica escrito para quem reusar a ferramenta saber
 * o que ela faz de verdade.
 *
 * Uso:
 *   node tools/folha-pokebola.mjs [--quadros 24] [--lado 64]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME;
const FONTE = process.env.POKEBOLA_GIF ||
  'C:/Users/gdult/OneDrive/Documentos/PokeArena/ÍCONES GERAIS/POKEBALLGIF.gif';

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : p;
};
const QUADROS = arg('quadros', 24);
const LADO = arg('lado', 64);

/* A DURAÇÃO SAI DO PRÓPRIO GIF, e não de um palpite. Cada bloco de controle
   gráfico (`21 F9 04`) traz o atraso do quadro em centésimos de segundo. */
const bytes = readFileSync(FONTE);
let msDoLaco = 0;
for (let i = 0; i < bytes.length - 8; i++)
  if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9 && bytes[i + 2] === 0x04)
    msDoLaco += bytes.readUInt16LE(i + 4) * 10;
if (!msDoLaco) throw new Error('não achei os atrasos do gif — a duração seria chute');

const dados = 'data:image/gif;base64,' + bytes.toString('base64');

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
/* ── PRECISA SER CONTEXTO SEGURO ────────────────────────────────────────────
   `ImageDecoder` (WebCodecs) só existe em origem segura. `about:blank` não é
   uma, e a primeira tentativa morreu com `ImageDecoder is not defined`.
   `127.0.0.1` conta como segura, então um servidor de uma linha resolve. */
const srv = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><meta charset="utf-8"><title>folha</title>');
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
await pg.goto(`http://127.0.0.1:${srv.address().port}/`);

const png = await pg.evaluate(async ({ dados, QUADROS, LADO }) => {
  /* ── OS QUADROS SAEM POR ÍNDICE, E NÃO POR RELÓGIO ──────────────────────
   *
   * `ImageDecoder` (WebCodecs) decodifica um gif animado QUADRO A QUADRO, e
   * pede-se o quadro pelo número. É o certo, e as duas tentativas anteriores
   * eram amostragem por tempo — que falhou por um motivo que só a medição
   * mostrou:
   *
   *     `drawImage` de um `<img>` de gif no Chromium desenha SEMPRE o primeiro
   *     quadro. Medi a diferença entre quadros vizinhos e deu ZERO nos vinte e
   *     três pares — a tira era a mesma bola vinte e quatro vezes, com nome de
   *     animação.
   *
   * Sem aquela medição isso teria entrado no jogo como uma bola parada. */
  const bin = Uint8Array.from(atob(dados.split(',')[1]), c => c.charCodeAt(0));
  const dec = new ImageDecoder({ data: bin, type: 'image/gif' });
  await dec.tracks.ready;
  const total = dec.tracks.selectedTrack.frameCount;
  if (!total) throw new Error('o decodificador não achou quadro nenhum');

  const folha = document.createElement('canvas');
  folha.width = LADO * QUADROS; folha.height = LADO;
  const g = folha.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';

  /* ── O FUNDO SAI POR ALAGAMENTO A PARTIR DA BORDA ───────────────────────
     A chave sai da PRÓPRIA borda do quadro, e não de um valor fixo: fundo fixo
     é o que quebra no dia em que a fonte mudar de tom.

     A tolerância é APERTADA. Com 26 o alagamento atravessava a borda suavizada
     e comia a metade CLARA da bola, que é da mesma família de cinza do fundo —
     medido, a ocupação caía para 49% quando um círculo inscrito ocupa 78%. */
  const tiraFundo = (ctx, x0, lado) => {
    const d = ctx.getImageData(x0, 0, lado, lado);
    const px = d.data;
    const k = [px[0], px[1], px[2]];
    const perto = i => Math.abs(px[i] - k[0]) < 12 &&
                       Math.abs(px[i + 1] - k[1]) < 12 &&
                       Math.abs(px[i + 2] - k[2]) < 12;
    const fila = [], visto = new Uint8Array(lado * lado);
    for (let x = 0; x < lado; x++) { fila.push([x, 0]); fila.push([x, lado - 1]); }
    for (let y = 0; y < lado; y++) { fila.push([0, y]); fila.push([lado - 1, y]); }
    while (fila.length) {
      const [x, y] = fila.pop();
      if (x < 0 || y < 0 || x >= lado || y >= lado) continue;
      const p = y * lado + x;
      if (visto[p]) continue;
      const i = p * 4;
      if (!perto(i)) continue;
      visto[p] = 1; px[i + 3] = 0;
      fila.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(d, x0, 0);
  };

  /* Espalha os N pedidos pelo laço inteiro: 80 quadros para 24 casas. */
  for (let k = 0; k < QUADROS; k++) {
    const idx = Math.round(k * total / QUADROS) % total;
    const { image } = await dec.decode({ frameIndex: idx });
    g.drawImage(image, k * LADO, 0, LADO, LADO);
    image.close?.();
    tiraFundo(g, k * LADO, LADO);
  }
  return { png: folha.toDataURL('image/png'), total };
}, { dados, QUADROS, LADO });


await b.close();
srv.close();

mkdirSync(join(RAIZ, 'assets/icones'), { recursive: true });
/* EM `icones/` E NAO EM `artes/`: `artes/` e o acervo de COSMETICOS que o
   jogador escolhe, e ha um teste que reprova arquivo la sem entrada no
   catalogo — com razao, porque cosmetico solto e peso que ninguem consegue
   usar. Esta tira e sprite de INTERFACE, e o lugar dela e ao lado das outras
   folhas de recorte. */
const saida = join(RAIZ, 'assets/icones/pokebola-tira.png');
const bin = Buffer.from(png.png.split(',')[1], 'base64');
writeFileSync(saida, bin);

console.log(`folha: ${saida}`);
console.log(`  ${QUADROS} quadros de ${LADO}px · ${(bin.length / 1024).toFixed(0)} KB` +
            `  (o gif tinha ${(bytes.length / 1048576).toFixed(2)} MB)`);
console.log(`  laço de ${(msDoLaco / 1000).toFixed(2)} s · ${png.total} quadros na fonte`);
