/* TIRA O FUNDO DOS SPRITES DE OVERWORLD.
 *
 * ── O DEFEITO QUE ISTO CORRIGE ────────────────────────────────────────────
 *
 * Parte dos PNGs do `pret/pokeemerald` vem com o fundo OPACO — a cor de
 * transparência do GBA guardada como cor de verdade, porque no cartucho quem
 * decidia o que era vazio era o hardware, não o arquivo.
 *
 * Na prévia isso apareceu na hora: cada árvore de Cut num quadrado ciano, o
 * Skitty numa caixa rosa, o Sudowoodo num retângulo verde. Um cenário com
 * caixas coloridas em volta de cada objeto não é um cenário.
 *
 * Os arquivos da expansão (`pokemon_old`) já vêm com alfa — por isso metade do
 * acervo estava limpa e a outra metade não, o que confunde mais do que se
 * estivessem todos errados.
 *
 * ── POR QUE UMA CÓPIA, E NÃO EDITAR NO LUGAR ─────────────────────────────
 *
 * Porque o download é idempotente: `baixar-overworld.mjs` pula o que já existe.
 * Editando no lugar, um arquivo reprocessado ficaria indistinguível de um
 * arquivo baixado, e uma segunda passada da chave comeria mais pixel a cada vez.
 *
 * A cópia vai para `alfa/`, ao lado do original. O original continua sendo o que
 * o repositório baixou, e é sempre possível refazer.
 *
 * ── A CHAVE É O CANTO, E O CANTO É CONFIÁVEL AQUI ────────────────────────
 *
 * Diferente da arte do dono — que chega com fundo magenta chapado e às vezes com
 * franja de JPEG —, estes são PNGs de paleta, sem compressão com perda. A cor do
 * canto é exatamente a cor do fundo, em todo pixel do fundo. Uma comparação
 * exata basta, e uma tolerância só arriscaria comer a roupa do sprite.
 *
 * Uso:  node tools/chavear-overworld.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'assets/raw_githubusercontent_com/pret/pokeemerald');
const SAIDA = join(DIR, 'alfa');
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';

const alvos = readdirSync(DIR)
  .filter(f => f.endsWith('.png'))
  .filter(f => !f.includes('walking'));   // as folhas de treinador a aba já chaveia

mkdirSync(SAIDA, { recursive: true });

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

const conta = { chaveado: 0, 'já tinha alfa': 0, 'já feito': 0 };

for (const f of alvos) {
  const destino = join(SAIDA, f);
  if (existsSync(destino)) { conta['já feito']++; continue; }
  const dados = 'data:image/png;base64,' + readFileSync(join(DIR, f)).toString('base64');
  const r = await pg.evaluate(async dados => {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dados;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    /* JÁ TEM ALFA? Então o arquivo veio da expansão e não se toca nele — mexer
       num sprite que já está certo é a forma mais fácil de estragá-lo. */
    if (p[3] < 8) return { alfa: true };
    const [r0, g0, b0] = p;
    let n = 0;
    for (let i = 0; i < p.length; i += 4)
      if (p[i] === r0 && p[i + 1] === g0 && p[i + 2] === b0) { p[i + 3] = 0; n++; }
    g.putImageData(d, 0, 0);
    return { png: c.toDataURL('image/png'), n, total: c.width * c.height };
  }, dados);

  if (r.alfa) {
    /* copia como está, para o jogo poder apontar SEMPRE para `alfa/` sem ter de
       saber qual arquivo precisou de tratamento */
    writeFileSync(destino, readFileSync(join(DIR, f)));
    conta['já tinha alfa']++;
    continue;
  }
  writeFileSync(destino, Buffer.from(r.png.split(',')[1], 'base64'));
  conta.chaveado++;
  console.log(`  ${f.padEnd(24)} ${((100 * r.n) / r.total).toFixed(0)}% do arquivo era fundo`);
}

await b.close();
console.log('\n' + Object.entries(conta).map(([k, v]) => `${k}: ${v}`).join(' · '));
