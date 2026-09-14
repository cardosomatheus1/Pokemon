/* A FOLHA DE DECORAÇÃO PERDE O FUNDO E A GRADE.
 *
 * A folha do dono chega com fundo OPACO e com as linhas da grade desenhadas
 * nela: um teal `#008080` de 2 px separando células de 64. Recortada crua, cada
 * peça sai dentro de uma caixa escura com risco verde na borda — e foi
 * exatamente isso que apareceu na primeira aplicação.
 *
 * ── DUAS CORES, E NÃO UMA ────────────────────────────────────────────────
 *
 * `chavear-overworld.mjs` tira UMA cor: a do canto. Aqui o canto é a GRADE, e o
 * fundo das células é outro tom. Tirar só o canto deixaria o retângulo escuro
 * dentro de cada peça; tirar só o fundo deixaria a moldura verde.
 *
 * As duas saem, e as duas são chapadas — é PNG sem perda, então a comparação
 * exata basta e não há franja para limpar. A tolerância existe só para o
 * anti-aliasing das bordas do desenho contra o fundo.
 *
 * ── POR QUE UMA CÓPIA ────────────────────────────────────────────────────
 *
 * Mesma razão do `chavear-overworld`: o original continua sendo o que o dono
 * mandou, e é sempre possível refazer. Uma segunda passada sobre o arquivo
 * chaveado comeria mais pixel a cada vez.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRADA = join(RAIZ, 'assets/icones/decor-amie.png');
const SAIDA = join(RAIZ, 'assets/icones/decor-amie-alfa.png');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

const dados = 'data:image/png;base64,' + readFileSync(ENTRADA).toString('base64');
const r = await pg.evaluate(async dados => {
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dados;
  });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;

  /* A GRADE é a cor do canto (0,0): ela desenha a moldura de toda célula.
     O FUNDO é o pixel do centro de uma célula que sabemos vazia — a folha tem
     sobra no fim, e o meio dela é fundo puro. */
  const cor = i => [p[i], p[i + 1], p[i + 2]];
  const grade = cor(0);
  const meioVazio = ((c.height - 40) * c.width + (c.width - 20)) * 4;
  const fundo = cor(meioVazio);

  const perto = (i, [r0, g0, b0], tol) =>
    Math.abs(p[i] - r0) <= tol && Math.abs(p[i + 1] - g0) <= tol && Math.abs(p[i + 2] - b0) <= tol;

  let n = 0;
  for (let i = 0; i < p.length; i += 4)
    if (perto(i, grade, 22) || perto(i, fundo, 16)) { p[i + 3] = 0; n++; }

  g.putImageData(d, 0, 0);
  return { png: c.toDataURL('image/png'), n, total: c.width * c.height, grade, fundo };
}, dados);

writeFileSync(SAIDA, Buffer.from(r.png.split(',')[1], 'base64'));
await b.close();

console.log(`grade ${r.grade.join(',')} · fundo ${r.fundo.join(',')}`);
console.log(`${r.n} de ${r.total} px tirados (${(r.n / r.total * 100).toFixed(1)}%) → ${SAIDA}`);
