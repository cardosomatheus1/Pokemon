/* Q1/Q3 · GRAFO DE MÓDULOS — fronteiras explícitas e numa direção só.
 *
 * O F0.3 separa a interface em módulos. Dois modos de falha justificam um teste
 * em vez de disciplina: um módulo que volta a crescer sem limite, e uma
 * dependência que aponta para o lado errado — apresentação puxando rodada, ou
 * qualquer coisa puxando o motor de volta para a UI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const DIR = new URL('../app/modules/', import.meta.url);
const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const LIMITE = 600;

/* Camadas, da base para o topo. Um módulo só pode importar de camada
   estritamente anterior, ou da mesma. */
const CAMADA = {
  'dom.mjs': 0, 'estado.mjs': 0,
  'sprites.mjs': 1,
  'render.mjs': 2, 'efeitos.mjs': 2, 'clima.mjs': 2,
};

function importsDe(txt) {
  return [...txt.matchAll(/from\s+['"]\.\/([\w.-]+\.mjs)['"]/g)].map(m => m[1]);
}

/* Remove strings, comentários e template literals, para que a varredura de
   símbolos não confunda texto com código. */
function semTexto(src) {
  const out = [...src]; const n = src.length; let k = 0;
  while (k < n) {
    const c = src[k], nx = src[k + 1] ?? '';
    if (c === '/' && nx === '/')      { while (k < n && src[k] !== '\n') out[k++] = ' '; }
    else if (c === '/' && nx === '*') { while (k < n && !(src[k] === '*' && src[k+1] === '/')) out[k++] = ' '; out[k]=' '; out[k+1]=' '; k += 2; }
    else if (c === '"' || c === "'" || c === '`') {
      const q = c; out[k++] = ' ';
      while (k < n && src[k] !== q) { if (src[k] === '\\') out[k++] = ' '; if (k < n) out[k++] = ' '; }
      if (k < n) out[k++] = ' ';
    } else k++;
  }
  return out.join('');
}

const nomesImportados = txt =>
  new Set([...txt.matchAll(/import\s*\{([^}]*)\}/g)]
    .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/).pop()).filter(Boolean)));

const declaradosNoTopo = txt =>
  new Set([...txt.matchAll(/^\s*(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]));

export function suite() {
  const s = criarSuite('modulos');
  const arquivos = readdirSync(DIR).filter(f => f.endsWith('.mjs'));
  const fonte = Object.fromEntries(arquivos.map(f => [f, readFileSync(new URL(f, DIR), 'utf8')]));

  s.teste(`nenhum módulo passa de ${LIMITE} linhas`, () => {
    for (const [f, txt] of Object.entries(fonte)) {
      const n = txt.split('\n').length;
      ok(n <= LIMITE, `${f} tem ${n} linhas. Passou do limite — dividir por responsabilidade, não por tamanho.`);
    }
  });

  s.teste('todo módulo está na tabela de camadas', () => {
    for (const f of arquivos)
      ok(f in CAMADA, `${f} não tem camada declarada. Módulo novo exige decidir onde ele entra no grafo.`);
  });

  s.teste('dependências apontam numa direção só', () => {
    for (const [f, txt] of Object.entries(fonte)) {
      for (const alvo of importsDe(txt)) {
        ok(alvo in CAMADA, `${f} importa ${alvo}, que não está na tabela de camadas`);
        ok(CAMADA[alvo] <= CAMADA[f],
          `${f} (camada ${CAMADA[f]}) importa ${alvo} (camada ${CAMADA[alvo]}) — dependência invertida`);
      }
    }
  });

  s.teste('nenhum módulo importa de volta o app', () => {
    for (const [f, txt] of Object.entries(fonte))
      ok(!/from\s+['"][^'"]*index\.html/.test(txt) && !/\.\.\/index/.test(txt),
        `${f} importa do app — a interface não pode ser dependência dos módulos`);
  });

  s.teste('nenhum módulo redeclara símbolo do motor', () => {
    const doMotor = ['CONF','CHART','simulate','buildRoster','damageOf','pickLineup','rng','effect','assignMoves'];
    for (const [f, txt] of Object.entries(fonte))
      for (const nome of doMotor)
        ok(!new RegExp(`^\\s*(?:const|let|var|function)\\s+${nome}\\b`, 'm').test(txt),
          `${f} redeclara ${nome}, que é do motor`);
  });

  /* Este é o teste que faltava no F0.3b e que custou três erros de import em
     sequência: rng, spriteURL e o par $/log. Ele não é um verificador de
     escopo completo — checa apenas SÍMBOLOS CONHECIDOS, os que algum módulo do
     projeto exporta. É exatamente a classe de erro que a extração produz. */
  s.teste('nenhum módulo usa símbolo conhecido sem importar', () => {
    const motor = readFileSync(new URL('../engine/engine.mjs', import.meta.url), 'utf8');
    /* O dono de um símbolo é quem o EXPORTA. Ler declarações não serve: a
       varredura por linha não distingue topo de corpo de função, e uma
       variável local do motor viraria "símbolo conhecido" por engano. */
    const exportados = txt => (txt.split('export {')[1] ?? '').split('}')[0]
      .split(',').map(x => x.trim()).filter(Boolean);
    const dono = new Map();
    for (const n of exportados(motor)) dono.set(n, 'engine');
    for (const [f, txt] of Object.entries(fonte))
      for (const m of (txt.split('export {')[1] ?? '').split('}')[0].split(','))
        { const n = m.trim(); if (n) dono.set(n, f); }

    const alvos = [...Object.entries(fonte), ['app/index.html', APP]];
    for (const [f, txt] of alvos) {
      const codigo = semTexto(txt);
      const local = new Set([...declaradosNoTopo(txt), ...nomesImportados(txt)]);
      const faltando = new Set();
      for (const [nome, quem] of dono) {
        if (quem === f || local.has(nome)) continue;
        const re = new RegExp(`(?<![.\\w$])${nome.replace(/\$/g,'\\$')}(?![\\w$])`);
        if (re.test(codigo)) faltando.add(`${nome} (de ${quem})`);
      }
      ok(faltando.size === 0,
        `${f} usa sem importar: ${[...faltando].join(', ')}`);
    }
  });

  s.teste('o app importa a apresentação em vez de contê-la', () => {
    for (const mod of ['sprites', 'render', 'efeitos', 'clima'])
      ok(new RegExp(`from ['"]\\./modules/${mod}\\.mjs['"]`).test(APP),
        `o app não importa ./modules/${mod}.mjs`);
  });

  return s;
}
