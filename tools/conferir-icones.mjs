/* A FOLHA DE CONTATO PARA O DONO APONTAR — bloco 1.12b, a L-104.
 *
 * ── POR QUE ESTA FERRAMENTA EXISTE ───────────────────────────────────────
 *
 * Sete itens do catálogo estão com `comoAchei: 'falta'`. A causa está na L-104:
 * a ordem das IMAGENS do PDF não bate com a ordem do TEXTO — a imagem que o
 * casador recebeu como "Choice Specs" é um floco de neve.
 *
 * A tentação é resolver por posição. A folha do BDSP está em ordem canônica de
 * saco, e as catorze âncoras já confirmadas provam isso (Master/Ultra/Great/Poké
 * em 0–3, as pedras em 71–96, o Exp. Share em 185). Bastaria contar.
 *
 *     Identificação por posição é um palpite com aparência de método.
 *
 * É a lição que a própria L-104 registrou, e ela vale mais aqui do que em
 * qualquer outro lugar: um ícone errado é PIOR que nenhum. O `?` avisa que
 * ninguém sabe; o ícone errado parece certo, e ninguém confere o que parece
 * certo. Ele ficaria no jogo para sempre.
 *
 * ── ENTÃO A FERRAMENTA NÃO DECIDE: ELA ESTREITA ──────────────────────────
 *
 * O que a ordem canônica PODE fazer sem virar palpite é reduzir o campo. Os sete
 * são todos held items, e o Exp. Share confirmado em 185 põe o bloco de held
 * items começando por ali. Mostrar 391 células não seria "sete cliques";
 * mostrar a faixa é.
 *
 * Cada célula sai ampliada 4× — a folha é de 32 px, e 4× é múltiplo inteiro
 * (ver `itens-icone.mjs`: arte que nasceu em 32 px só fica nítida em múltiplo).
 * Cada uma leva o número embaixo, e as já confirmadas levam o nome e ficam
 * apagadas: elas servem de RÉGUA, e não de opção.
 *
 * Uso:
 *   node tools/conferir-icones.mjs [--de 176] [--ate 264]
 *
 * O dono responde sete números. `content/itens_v1.mjs` recebe os índices e o
 * `comoAchei` de cada um vira `'apontado'`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : padrao;
};
const DE = arg('de', 176), ATE = arg('ate', 264);
const SAIDA = process.argv.includes('--saida')
  ? process.argv[process.argv.indexOf('--saida') + 1]
  : join(process.env.TEMP || '/tmp', 'pa', 'conferir');

const LADO = 32, COLUNAS = 23, ZOOM = 4;

const { TODOS } = await import(pathToFileURL(join(RAIZ, 'content/itens_v1.mjs')).href);
const dono = new Map();
for (const i of TODOS)
  if (Number.isInteger(i.icone) && i.comoAchei !== 'falta') dono.set(i.icone, i);
const faltam = TODOS.filter(i => i.comoAchei === 'falta');

const folha = readFileSync(join(RAIZ, 'assets/icones/itens.png')).toString('base64');
const linhasFolha = 17;

/* O recorte é o MESMO de `itens-icone.mjs`, e não uma cópia parecida: se as duas
   contas divergirem, esta folha mostra o vizinho errado e o dono aponta errado
   com toda a razão do mundo. */
const celula = i => {
  const k = ZOOM;
  return `background-image:url('data:image/png;base64,${folha}');` +
         `background-size:${COLUNAS * LADO * k}px ${linhasFolha * LADO * k}px;` +
         `background-position:${-(i % COLUNAS) * LADO * k}px ${-Math.floor(i / COLUNAS) * LADO * k}px;` +
         `width:${LADO * k}px;height:${LADO * k}px;background-repeat:no-repeat;` +
         'image-rendering:pixelated';
};

const celulas = [];
for (let i = DE; i <= ATE; i++) {
  const d = dono.get(i);
  celulas.push(`
    <figure class="${d ? 'tem' : 'livre'}">
      <i style="${celula(i)}"></i>
      <figcaption><b>${i}</b>${d ? `<em>${d.en ?? d.nome}</em>` : ''}</figcaption>
    </figure>`);
}

const procurados = faltam.map(i => `
  <li><b>${i.nome}</b> <em>${i.en ?? ''}</em><span>${i.texto}</span></li>`).join('');

const html = `<!doctype html><meta charset="utf-8"><title>conferir icones</title>
<style>
  :root{--fade:${process.argv.includes('--nu') ? 1 : 0.34};--bg:#0b1020;--pan:#121a30;--line:#26314e;--txt:#e8edf7;--dim:#8fa0c0;--ok:#5efc8d}
  *{box-sizing:border-box}
  body{margin:0;padding:28px 32px;background:var(--bg);color:var(--txt);
       font:14px/1.5 "Segoe UI",system-ui,sans-serif}
  h1{font-size:19px;margin:0 0 4px}
  p.sub{color:var(--dim);margin:0 0 22px;font-size:13px}
  ol{margin:0 0 26px;padding-left:22px;columns:2;column-gap:34px}
  ol li{margin-bottom:7px;break-inside:avoid}
  ol b{color:var(--ok)} ol em{color:var(--dim);font-style:normal;margin-left:6px}
  ol span{display:block;color:var(--dim);font-size:12px}
  .grade{display:flex;flex-wrap:wrap;gap:10px}
  figure{margin:0;width:${LADO * ZOOM}px;text-align:center}
  figure i{display:block;border:1px solid var(--line);border-radius:8px;background-color:#0d1426}
  figure.tem{opacity:var(--fade,.34)}
  figure.tem i{border-color:#3a4560}
  figcaption{font:12px/1.3 ui-monospace,monospace;color:var(--dim);margin-top:3px}
  figcaption b{color:var(--txt)}
  figcaption em{display:block;font-style:normal;font-size:10px;color:var(--dim)}
  .livre i{border-color:var(--line)}
</style>
<h1 style="--x:0">Aponte sete ícones</h1>
<p class="sub">Células ${DE} a ${ATE} da folha, ampliadas 4×. As <b>apagadas</b>
já têm dono e servem de régua — não são opção. Responda o número de cada um.</p>
<ol>${procurados}</ol>
<div class="grade">${celulas.join('')}</div>`;

mkdirSync(SAIDA, { recursive: true });
const pagina = join(SAIDA, 'conferir.html');
writeFileSync(pagina, html);

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
await pg.goto(pathToFileURL(pagina).href);
await pg.waitForLoadState('networkidle');

/* CONFERE ANTES DE FOTOGRAFAR. Uma folha de contato vazia é pior que nenhuma:
   ela parece um resultado. Se a folha não carregou, o dono apontaria em cima de
   quadrados escuros — e é a mesma classe do que a `olhar-idle` já guarda. */
const vivas = await pg.evaluate(() => {
  const cs = [...document.querySelectorAll('figure i')];
  return cs.filter(e => getComputedStyle(e).backgroundImage !== 'none').length;
});
if (vivas < ATE - DE) {
  await b.close();
  throw new Error(`só ${vivas} de ${ATE - DE + 1} células têm arte — a folha não carregou`);
}

const arq = join(SAIDA, 'conferir-icones.png');
await pg.screenshot({ path: arq, fullPage: true });
await b.close();

console.log(`folha de contato: ${arq}`);
console.log(`  ${ATE - DE + 1} células · ${dono.size} com dono na folha inteira`);
console.log(`  procurados: ${faltam.map(i => i.en ?? i.nome).join(', ')}`);
