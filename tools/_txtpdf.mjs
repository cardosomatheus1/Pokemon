/* LÊ O TEXTO DE UM PDF COM FONTE EM SUBCONJUNTO.
 *
 * O texto vem como `<002d><004a>...` — IDs de glifo, e não letras. Quem traduz é
 * o `/ToUnicode`, um CMap que o próprio PDF embute justamente para o texto poder
 * ser copiado. Sem ele, extração devolve lixo — foi o que aconteceu na primeira
 * tentativa.
 *
 * Existe para eu conseguir LER o que o dono manda em PDF sem pedir a ele vinte
 * capturas de tela.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const s = fs.readFileSync(process.argv[2]).toString('latin1');

/* ── 1 · O MAPA DE GLIFO PARA LETRA ─────────────────────────────────────── */
const mapa = new Map();
const re = /stream\r?\n?([\s\S]*?)endstream/g;
let m;
while ((m = re.exec(s))) {
  let out;
  try { out = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); }
  catch { continue; }
  if (!out.includes('beginbfchar') && !out.includes('beginbfrange')) continue;

  for (const b of out.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g))
      mapa.set(parseInt(p[1], 16), String.fromCharCode(parseInt(p[2].slice(0, 4), 16)));

  for (const b of out.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const de = parseInt(p[1], 16), ate = parseInt(p[2], 16), alvo = parseInt(p[3].slice(0, 4), 16);
      for (let k = de; k <= ate; k++) mapa.set(k, String.fromCharCode(alvo + (k - de)));
    }
}

/* ── 2 · O TEXTO, JÁ TRADUZIDO ──────────────────────────────────────────── */
const linhas = [];
re.lastIndex = 0;
while ((m = re.exec(s))) {
  let out;
  try { out = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); }
  catch { continue; }
  if (!out.includes('BT')) continue;

  for (const bloco of out.split(/\bBT\b/).slice(1)) {
    const corpo = bloco.split(/\bET\b/)[0];
    let linha = '';
    for (const h of corpo.matchAll(/<([0-9a-fA-F]+)>/g)) {
      const hex = h[1];
      for (let i = 0; i + 4 <= hex.length; i += 4)
        linha += mapa.get(parseInt(hex.slice(i, i + 4), 16)) ?? '';
    }
    /* deslocamento grande entre pedaços é espaço; o CMap costuma dar 0x0001 */
    linha = linha.replace(//g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (linha) linhas.push(linha);
  }
}

console.log('glifos mapeados:', mapa.size, '| linhas:', linhas.length);
console.log('---');
console.log(linhas.join('\n').slice(0, Number(process.argv[3] || 6000)));
