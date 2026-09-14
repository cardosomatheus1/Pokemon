/* AS TIRAS DE ANIMAÇÃO PMD, para a prévia usar A MESMA ARTE DA ARENA.
 *
 * ── O ERRO QUE ESTA FERRAMENTA CONSERTA ──────────────────────────────────
 *
 * A primeira prévia do Avanço desenhou os bichos com os GIF do Showdown
 * (`gen5ani/*.gif`). O dono pegou na hora:
 *
 *   > "você está me apresentando POKÉMON EM GIF, tem que ser AS MESMAS SPRITES
 *   >  DOS POKÉMON QUE SÃO USADOS NA ARENA"
 *
 * E ele está certo, e é pior do que parecia. A Arena não usa GIF: ela usa as
 * FOLHAS do PMDCollab, desenhadas quadro a quadro no canvas — arte 3/4 com
 * OITO DIREÇÕES. O companheiro do idle já usa essas mesmas folhas desde o
 * bloco 1.5c(c), justamente para o idle e a Arena não terem dois desenhos do
 * mesmo bicho.
 *
 *   > Uma prévia com a arte errada não erra só o enfeite: ela erra a PERGUNTA.
 *   > Ninguém consegue julgar um arranjo olhando peças que não vão estar nele.
 *
 * E o GIF do Showdown é de PERFIL. Numa cena top-down, ele nunca poderia
 * estar certo — o bicho olharia para fora do mundo. A arte errada estava
 * escondendo isso.
 *
 * ── O QUE ELA FAZ ────────────────────────────────────────────────────────
 *
 * A folha é uma grade: COLUNAS são os quadros, LINHAS são as 8 direções, e a
 * linha 0 é de frente (para baixo na tela) — é o que a `dirOf` documenta.
 *
 * Corta a linha 0 inteira numa tira horizontal, ampliada em número inteiro e
 * sem alisamento. Com ela, um `steps()` de CSS anima o bicho sem uma linha de
 * JavaScript, e o desenho é EXATAMENTE o que o jogador vê na Arena.
 *
 * Uso:
 *   node tools/tira-pmd.mjs --dex 1,10,11,12,13,14,15,25 [--fator 3]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
const DEX = arg('dex', '1,10,11,12,13,14,15,25').split(',').map(Number);
const FATOR = Number(arg('fator', 3));
const ANIM = arg('anim', 'w');            /* w=Walk, i=Idle */
const PASTA = join(RAIZ, 'app', 'previa', 'tiras');

const { PMD, ANIM_FILE } = await import(
  pathToFileURL(join(RAIZ, 'app/modules/sprites-dados.mjs')).href);

/* O caminho local espelha o do PMDCollab, e ele tem DUAS formas: a espécie
   simples em `sprite/0010/`, e a que tem variação em `sprite/0012/0000/0001/`.
   Adivinhar uma só perderia metade do elenco — e perderia calado, com a folha
   faltando e o bicho sumindo da cena sem erro nenhum. */
const CACHE = join(RAIZ, 'assets/raw_githubusercontent_com/PMDCollab/SpriteCollab/master/sprite');
function folhaDe(dex) {
  const d = String(dex).padStart(4, '0');
  const arquivo = `${ANIM_FILE[ANIM]}-Anim.png`;
  for (const p of [join(CACHE, d, arquivo), join(CACHE, d, '0000/0001', arquivo)])
    if (existsSync(p)) return p;
  return null;
}

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
mkdirSync(PASTA, { recursive: true });

const mapa = {};
for (const dex of DEX) {
  const folha = folhaDe(dex);
  const meta = PMD[dex]?.[ANIM];
  if (!folha || !meta) { console.log(`${dex} — sem folha ou sem medida`); continue; }
  const [fw, fh, duracoes] = meta;
  const quadros = duracoes.length;

  const b64 = readFileSync(folha).toString('base64');
  const tira = await pg.evaluate(async ({ b64, fw, fh, quadros, FATOR }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = fw * quadros * FATOR; c.height = fh * FATOR;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    /* LINHA 0 = de frente. Numa cena top-down é a única que faz sentido para
       quem está vindo na direção do jogador. */
    for (let q = 0; q < quadros; q++)
      x.drawImage(img, q * fw, 0, fw, fh,
                       q * fw * FATOR, 0, fw * FATOR, fh * FATOR);
    return { url: c.toDataURL('image/png'), largura: img.width, altura: img.height };
  }, { b64, fw, fh, quadros, FATOR });

  /* CONFERÊNCIA, e ela já pegou coisa: se a folha não tem 8 linhas da altura
     declarada, a medida do `PMD` não corresponde a esta folha — e cortar
     assim mesmo devolveria meio bicho, sem reclamar. */
  const linhas = tira.altura / fh;
  const aviso = Math.abs(linhas - 8) > 0.01
    ? `  ⚠ ${tira.largura}x${tira.altura} dá ${linhas.toFixed(2)} linhas, e não 8` : '';

  const nome = `${String(dex).padStart(4, '0')}-${ANIM}.png`;
  writeFileSync(join(PASTA, nome), Buffer.from(tira.url.split(',')[1], 'base64'));
  mapa[`${dex}-${ANIM}`] = { q: quadros, w: fw * FATOR, h: fh * FATOR,
                ms: duracoes.reduce((a, d) => a + d, 0) * 24 };
  console.log(`${String(dex).padStart(4, '0')}  ${quadros} quadros de ${fw}x${fh}` +
              ` -> ${nome}${aviso}`);
}
await b.close();

/* O mapa se ACUMULA entre execuções: cada chamada traz uma animação, e
   sobrescrever o arquivo perderia as anteriores — foi o que quase aconteceu
   quando o dono pediu as sprites de ataque depois das de andar. */
const ARQ = join(PASTA, 'tiras.json');
const antes = existsSync(ARQ) ? JSON.parse(readFileSync(ARQ, 'utf8')) : {};
writeFileSync(ARQ, JSON.stringify({ ...antes, ...mapa }, null, 1));
console.log(`\n${Object.keys(mapa).length} tira(s) em ${PASTA}`);
