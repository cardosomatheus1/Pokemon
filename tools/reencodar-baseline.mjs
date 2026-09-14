/* REENCODAR UM JPEG PROGRESSIVO COMO BASELINE.
 *
 * ── POR QUE ISTO EXISTE (D-040) ────────────────────────────────────────────
 *
 * `arte/cidade-neon.jpg` era JPEG PROGRESSIVO. Progressivo decodifica em
 * PASSADAS: o navegador pinta uma versão grosseira e vai refinando. Numa foto de
 * hero em conexão lenta isso é ótimo; num fundo de 136 KB dentro da interface é
 * só uma fonte de não-determinismo.
 *
 * E foi exatamente isso que fez o portão Q2 abortar desde o R27. A linha de base
 * fotografava o banner num estágio diferente do refinamento a cada execução —
 * medido, entre duas capturas LOCAIS da mesma tela:
 *
 *     5,35% dos pixels diferentes · desvio médio 8 · pico 175
 *     concentrados nas zonas 1,5 e 0,5 — o banner
 *     em BANDAS HORIZONTAIS, que é a assinatura do progressivo
 *
 * Onze hipóteses foram investigadas antes desta. Nenhuma espera resolve, porque
 * não há evento para esperar: o refinamento é do decodificador, e o `decode()`
 * de uma `Image` paralela não obriga o fundo em CSS a repintar.
 *
 * ── COMO, SEM DEPENDÊNCIA ──────────────────────────────────────────────────
 *
 * O projeto não tem biblioteca de imagem e não vai ter. Mas tem Chromium — o
 * mesmo do portão visual. Desenhar num canvas e exportar com `toDataURL`
 * produz JPEG BASELINE, porque o canvas não conhece progressivo.
 *
 * É a mesma imagem, reencodada. Não é arte de outra fonte, e não é recorte
 * novo: o pixel que entra é o pixel que sai, com a única diferença sendo a
 * ordem em que o arquivo os guarda.
 *
 * ── QUALIDADE ─────────────────────────────────────────────────────────────
 *
 * 0,94 é alto o bastante para uma foto de fundo que aparece desfocada por trás
 * de um véu, e ainda assim menor que o original em quase todos os casos. O
 * script IMPRIME os dois tamanhos: se o novo ficar maior, é decisão de quem
 * roda manter ou não.
 *
 *   node tools/reencodar-baseline.mjs arte/cidade-neon.jpg
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const QUALIDADE = 0.94;

const alvo = process.argv[2];
if (!alvo || !existsSync(alvo)) {
  console.error('uso: node tools/reencodar-baseline.mjs <arquivo.jpg>');
  process.exit(1);
}

/* O marcador do quadro diz o tipo: SOF0 (ffc0) é baseline, SOF2 (ffc2) é
   progressivo. Ler antes evita reencodar o que já está certo — e reencodar sem
   necessidade é perder qualidade de graça. */
function tipoJpeg(buf) {
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xc0) return 'baseline';
    if (m === 0xc2) return 'progressivo';
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return 'desconhecido';
}

const antes = readFileSync(alvo);
const tipo = tipoJpeg(antes);
console.log(`${alvo}: ${tipo}, ${(antes.length / 1024).toFixed(0)} KB`);
if (tipo !== 'progressivo') {
  console.log('nada a fazer — só JPEG progressivo precisa ser reencodado.');
  process.exit(0);
}

const PW = process.env.PW_MODULO, CHROME = process.env.PW_CHROME;
if (!PW || !CHROME) {
  console.error('PW_MODULO e PW_CHROME precisam apontar para o playwright-core e o Chromium.');
  process.exit(1);
}

const { chromium } = await import(pathToFileURL(PW).href);
const nav = await chromium.launch({ executablePath: CHROME });
const pg = await nav.newPage();

const b64 = await pg.evaluate(async ({ dados, q }) => {
  const img = new Image();
  await new Promise((ok, falha) => {
    img.onload = ok; img.onerror = falha;
    img.src = 'data:image/jpeg;base64,' + dados;
  });
  /* `decode()` antes de desenhar: sem ele, um progressivo pode ser desenhado
     numa passada intermediária — e o reencode congelaria justamente o estágio
     grosseiro que este script existe para eliminar. */
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', q).split(',')[1];
}, { dados: antes.toString('base64'), q: QUALIDADE });

await nav.close();

const depois = Buffer.from(b64, 'base64');
const novoTipo = tipoJpeg(depois);
if (novoTipo !== 'baseline') {
  console.error(`o reencode devolveu "${novoTipo}" — nada foi escrito.`);
  process.exit(2);
}

writeFileSync(resolve(alvo), depois);
const delta = ((depois.length - antes.length) / antes.length) * 100;
console.log(`→ ${novoTipo}, ${(depois.length / 1024).toFixed(0)} KB ` +
            `(${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%)`);
