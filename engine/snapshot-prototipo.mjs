/* Gera um instantâneo do motor CONGELADO em prototype/index.html.
 *
 * No F0.1 este script produzia o motor de trabalho. No F0.2 o motor virou
 * código próprio em engine/engine.mjs, e este script mudou de papel: agora
 * serve só ao teste de paridade, que compara o motor vivo com o do protótipo
 * e reprova qualquer divergência que não esteja declarada.
 *
 * Extrai por NOME DE DECLARAÇÃO com casamento de chaves, não por intervalo de
 * linhas: intervalo quebraria em silêncio na primeira edição do protótipo.
 *
 * A saída é descartável e não vai para o versionamento.
 *
 * Uso: node engine/snapshot-prototipo.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'prototype/index.html'), 'utf8');

/* o protótipo tem um <script> só; pegamos o maior por segurança */
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) throw new Error('nenhum <script> encontrado no protótipo');
const src = scripts.sort((a, b) => b.length - a.length)[0];

/* Declarações que compõem o motor. Ordem irrelevante: reordenamos na saída
   conforme esta lista, que já está em ordem de dependência. */
const ALVOS = [
  'MOEDA', 'CUR', 'CONF', 'stormRate', 'CHART', 'TCOLOR', 'TIPO_PT',
  'KANTO_DEX_FULL', 'ARENA_DEX', 'KANTO_DEX', 'NAME_FIX',
  'displayName', 'showdownSlug', 'MASTER_MOVES', 'assignMoves',
  'rng', 'newSeed', 'statAt', 'buildRoster', 'effect', 'damageOf', 'simulate',
  'WEATHER_TABLE', 'rollWeather', 'applyWeather', 'pickLineup',
];

/* Acha o início de uma declaração de topo e devolve o trecho completo,
   fechando por contagem de chaves/parênteses/colchetes fora de string. */
function extrair(nome) {
  const re = new RegExp(`^(?:const|let|var|function)\\s+${nome}\\b`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`declaração não encontrada: ${nome}`);
  let i = m.index;
  let prof = 0, emStr = null, emCom = null, viuAbertura = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], p = src[j - 1], n = src[j + 1];
    if (emCom) { if (emCom === '//' && c === '\n') emCom = null;
                 else if (emCom === '/*' && p === '*' && c === '/') emCom = null; continue; }
    if (emStr) { if (c === '\\') { j++; continue; }
                 if (c === emStr) emStr = null; continue; }
    if (c === '/' && n === '/') { emCom = '//'; continue; }
    if (c === '/' && n === '*') { emCom = '/*'; continue; }
    if (c === '"' || c === "'" || c === '`') { emStr = c; continue; }
    if (c === '{' || c === '(' || c === '[') { prof++; viuAbertura = true; continue; }
    if (c === '}' || c === ')' || c === ']') { prof--; continue; }
    /* fim: ';' ou fim de linha no nível zero, depois de ter aberto algo */
    if (prof === 0 && viuAbertura && (c === ';' || c === '\n')) return src.slice(i, j + 1);
    /* arrow de uma linha sem chaves: const newSeed = () => ...; */
    if (prof === 0 && !viuAbertura && c === ';') return src.slice(i, j + 1);
  }
  throw new Error(`não consegui fechar a declaração: ${nome}`);
}

const partes = ALVOS.map(extrair);

const saida = `/* GERADO POR engine/snapshot-prototipo.mjs — NÃO EDITAR, NÃO VERSIONAR.
 * Fonte: prototype/index.html (base v0.8, congelado)
 *
 * Existe apenas para o teste de paridade. O motor de trabalho é
 * engine/engine.mjs.
 */

/* o protótipo resolve sprite pela URL; no motor isso é irrelevante */
function spriteURL(){ return ''; }

${partes.join('\n\n')}

export {
${ALVOS.map(a => '  ' + a + ',').join('\n')}
};
`;

writeFileSync(join(raiz, 'engine/.snapshot-prototipo.mjs'), saida);
console.log(`instantâneo do protótipo · ${ALVOS.length} declarações · ${saida.length} bytes`);
