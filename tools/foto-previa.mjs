/* AS CAPTURAS DA PRÉVIA DO AVANÇO, para o dono OLHAR (§7.22).
 *
 * O `CLAUDE.md` manda capturar nas larguras em que o arranjo MUDA DE FORMA, e
 * não numa só. Esta prévia muda em duas: abaixo de 1240 a coluna da direita
 * sai, e abaixo de 900 sai também a da esquerda.
 *
 *   > Capturar numa largura só é escolher não ver os dois arranjos que o
 *   > jogador de fato vai encontrar.
 *
 * Sai com as notas de desenho LIGADAS e DESLIGADAS: com elas a prévia explica,
 * sem elas ela se parece com o produto — e é a segunda que responde à pergunta
 * do §atenção especial, *"parece de um jogo publicado, ou parece protótipo?"*.
 *
 * Uso:
 *   node tools/foto-previa.mjs [--base http://localhost:8099]
 */
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO;
const CHROME = process.env.PW_CHROME;
if (!PW) { console.error('falta PW_MODULO — ver tools/README.md'); process.exit(2); }

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const BASE = arg('base', 'http://localhost:8099');
const PASTA = join(RAIZ, '.telas', 'previa-avanco');
mkdirSync(PASTA, { recursive: true });

const VISTAS = [
  ['run',     'A RUN'],
  ['fases',   'ESCOLHER ESTÁGIO'],
  ['ausente', 'MODO AUSENTE'],
];
const LARGURAS = [1920, 1440, 1100];

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

for (const largura of LARGURAS) {
  const pg = await (await b.newContext({ viewport: { width: largura, height: 1000 } })).newPage();
  await pg.goto(`${BASE}/app/previa-avanco.html`, { waitUntil: 'networkidle' });
  /* Os sprites são GIF animado: sem esta espera a captura sai com metade deles
     no primeiro quadro em branco. É o mesmo cuidado do D-033. */
  await pg.waitForTimeout(2200);

  for (const [id, rotulo] of VISTAS) {
    await pg.click(`[data-ir="${id}"]`);
    await pg.waitForTimeout(700);
    for (const notas of [true, false]) {
      /* O botão ALTERNA — clicar sempre inverteria o estado a cada volta do
         laço, e a metade das capturas sairia trocada. Lê-se o estado antes. */
      const ligadas = await pg.$eval('body', el => !el.classList.contains('semNotas'));
      if (ligadas !== notas) { await pg.click('[data-notas]'); await pg.waitForTimeout(250); }
      const nome = `${largura}-${id}${notas ? '-notas' : ''}.png`;
      await pg.screenshot({ path: join(PASTA, nome), fullPage: id !== 'run' });
      console.log(`${rotulo} · ${largura}px${notas ? ' · com notas' : ''} -> ${nome}`);
    }
  }
  await pg.close();
}
await b.close();
console.log(`\nAgora OLHE as capturas em ${PASTA}`);
