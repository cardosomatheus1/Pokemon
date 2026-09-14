/* CONVERTER OUTFITS EM LOTE, da linha de comando.
 *
 *   node tools/outfit-folha.mjs arte/outfits/trainer_boystandard{2,4,3}.jpg
 *   node tools/outfit-folha.mjs --nome=urbano --altura=52 a.png b.png c.png
 *
 * ── POR QUE ESTA FERRAMENTA EXISTE ────────────────────────────────────────
 *
 * A bancada no navegador serve o dono: ele arrasta um arquivo e vê o resultado.
 * O que ela NÃO serve é converter dezessete outfits, nem aceitar um outfit que
 * veio em três arquivos separados — que foi exatamente como o primeiro chegou.
 *
 * As duas usam `app/modules/outfit.mjs`. O que a bancada mostra é literalmente
 * o que esta ferramenta grava: uma conversão, dois jeitos de chamá-la.
 *
 * ── ZERO DEPENDÊNCIA NO REPOSITÓRIO ───────────────────────────────────────
 *
 * Converter PNG em Node exigiria um decodificador. O `playwright-core` que o
 * portão Q5 já usa mora FORA do projeto (ver tools/README.md) e traz um
 * navegador inteiro — canvas incluso. Usá-lo aqui não acrescenta dependência
 * nenhuma ao repositório.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PW = process.env.PW_ROOT || 'C:/Users/gdult/pw';
const CHROME = process.env.PW_CHROME;

const args = process.argv.slice(2);
const opcoes = Object.fromEntries(args.filter(a => a.startsWith('--'))
  .map(a => a.replace(/^--/, '').split('=')));
let arquivos = args.filter(a => !a.startsWith('--'));

const altura = Number(opcoes.altura ?? 52);
/* A ORDEM EM QUE AS VISTAS CHEGAM, quando são arquivos separados. Numa GRADE a
   posição manda e esta opção é ignorada — ver `converter`. */
const ordem = (opcoes.ordem ?? 'frente,perfil,costas').split(',');
const tolerancia = Number(opcoes.tolerancia ?? 40);

const nomeDe = f => basename(f, extname(f))
  .replace(/^trainer[_-]?/i, '').replace(/[0-9]+$/, '')
  .replace(/[^a-z0-9-]/gi, '').toLowerCase();

/* ── UM LOTE É UMA LISTA DE TRABALHOS, e não uma lista de arquivos ─────────
 *
 * Um outfit pode chegar como UM arquivo em grade ou como TRÊS arquivos de uma
 * vista cada. Os dois formatos existem na pasta do dono ao mesmo tempo, e ele
 * não vai separar — o acordo é que ele joga a arte lá e pede pelo nome.
 *
 * Então o lote agrupa por nome antes de converter: `trainer_boystandard2/3/4`
 * viram UM trabalho de três arquivos, e `trainer_militarcamper` vira um
 * trabalho de um arquivo só. Tratar cada arquivo como um outfit produzia três
 * "boystandard" sobrescrevendo o mesmo PNG, e o último a gravar era o perfil. */
let trabalhos;
if ('lote' in opcoes) {
  const dir = arquivos[0] ?? opcoes.lote;
  const porNome = new Map();
  for (const f of readdirSync(dir).filter(x => /\.(png|jpe?g)$/i.test(x)).sort()) {
    const n = nomeDe(f);
    if (!porNome.has(n)) porNome.set(n, []);
    porNome.get(n).push(join(dir, f));
  }
  trabalhos = [...porNome].map(([nome, arqs]) => ({ nome, arqs }));
} else {
  if (!arquivos.length) {
    console.log('uso: node tools/outfit-folha.mjs [--nome=x] [--altura=52] arquivo...');
    console.log('     node tools/outfit-folha.mjs --lote "pasta"');
    process.exit(1);
  }
  trabalhos = [{ nome: opcoes.nome ?? nomeDe(arquivos[0]), arqs: arquivos }];
}

/* As imagens viram data: URI — a página é `about:blank` e não tem de onde
   carregar arquivo local sem servidor. */
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const comoDados = f => {
  const p = join(RAIZ, f);
  const caminho = existsSync(p) ? p : f;
  const tipo = MIME[extname(caminho).toLowerCase()] ?? 'image/png';
  return `data:${tipo};base64,${readFileSync(caminho).toString('base64')}`;
};

const { chromium } = await import(pathToFileURL(
  join(PW, 'node_modules/playwright-core/index.mjs')).href);

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('about:blank');

/* o módulo entra na página como texto — assim a página usa EXATAMENTE o
   arquivo do repositório, e não uma cópia */
const fonte = readFileSync(join(RAIZ, 'app/modules/outfit.mjs'), 'utf8');
await pg.addScriptTag({ content: fonte.replace(/^export /gm, ''), type: 'module' })
  .catch(() => {});

for (const { nome, arqs } of trabalhos) {
  const resultado = await pg.evaluate(async ({ fonte, dados, altura, tolerancia, ordem }) => {
    const mod = await import('data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(fonte))));
    const imgs = await Promise.all(dados.map(d => new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = d;
    })));
    const r = mod.converter(imgs, { altura, tolerancia, ordem });
    if (!r) return null;
    return { png: r.canvas.toDataURL('image/png'),
             w: r.quadro.w, h: r.quadro.h, grade: r.grade, arranjo: r.arranjo,
             alturas: r.vistas.map(v => v.height),
             larguras: r.vistas.map(v => v.width) };
  }, { fonte, dados: arqs.map(comoDados), altura, tolerancia, ordem });

  if (!resultado) {
    console.log(`  ${nome.padEnd(20)} nada além do fundo — baixe a tolerância`);
    continue;
  }
  writeFileSync(join(RAIZ, 'arte/outfits', nome + '.png'),
                Buffer.from(resultado.png.split(',')[1], 'base64'));
  console.log(
    `  ${nome.padEnd(20)} ${resultado.arranjo.padEnd(5)} · ${arqs.length} arq · ` +
    `grade ${String(resultado.grade).padEnd(2)} · vistas ${resultado.larguras.join('/')} px · ` +
    `quadro ${resultado.w}×${resultado.h} → folha ${resultado.w * 9}×${resultado.h}`);
}

await b.close();
