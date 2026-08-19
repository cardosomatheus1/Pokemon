/* Q2 · SABOTAGEM — o portão que faz os outros valerem.
 *
 * Uma suíte que nunca ficou vermelha não prova nada. Aqui plantamos defeitos
 * de propósito e exigimos que a suíte fique vermelha para cada um. Defeito
 * que passa = teste decorativo = bloco não fecha.
 *
 * Regras (BUILD_BLOCKS §4):
 *   1. o defeito precisa ser plausível — trocar um sinal, inverter uma
 *      comparação, remover uma checagem. Apagar função inteira não prova nada.
 *   2. precisa falhar no teste CERTO — registramos qual pegou qual.
 *
 * Refinamento do F0.2 (lacuna L-007): cada defeito roda DUAS vezes, com e sem
 * os golden tests. Golden byte-exato pega qualquer mudança de comportamento,
 * então ele sozinho não prova cobertura. O que interessa é a coluna "sem
 * golden": defeito que só o golden pega revela área com propriedade fraca.
 *
 * A execução acontece numa CÓPIA do repositório, fora da árvore de trabalho.
 * As duas primeiras versões plantavam o defeito no lugar e restauravam depois,
 * e isso deu errado duas vezes no F0.3d: um timeout matou o processo no meio e
 * deixou defeito plantado, e o gancho de commit pediu para commitar enquanto a
 * execução estava no meio — o que teria gravado o defeito no repositório.
 *
 * O handler de restauração que eu havia escrito não resolve, e vale registrar
 * por quê: enquanto a execução está parada dentro do `execFileSync` que roda a
 * suíte, o laço de eventos do Node não gira e o handler não dispara.
 *
 * Copiar é a resposta certa. A árvore de trabalho fica intocada do começo ao
 * fim, e matar este processo a qualquer momento não deixa rastro.
 *
 * Uso: node test/sabotagem.mjs
 */
import { existsSync, readFileSync, symlinkSync, writeFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFEITOS } from './defeitos-plantados.mjs';
import { conferirAncoras, filtrarTocados } from './ancoras.mjs';

/* --- COMO A SABOTAGEM RODA, E POR QUE ASSIM -----------------------------
 *
 * Ela roda sem o portão de navegador: ele custa ~40 s por execução e são duas
 * execuções por defeito. Defeito que escapa das duas é reexecutado COM o
 * navegador, porque aí a pergunta muda — não é mais "a suíte pega?", é "alguém
 * pega?".
 *
 * TRÊS COISAS QUE TIRARAM ESTE PORTÃO DE ~95 min:
 *
 * 1. PARADA ANTECIPADA (`PARAR_CEDO=1`). Aqui a pergunta é binária: a suíte
 *    fica vermelha ou não. Rodar as dez suítes seguintes depois da primeira
 *    falha é trabalho jogado fora, 56 vezes. As suítes também passaram a rodar
 *    em ordem de CUSTO, da mais barata para a mais cara — um defeito que a
 *    carteira pega custa 0,3 s em vez de 40 s.
 *
 * 2. SEGUNDA EXECUÇÃO POR DEDUÇÃO. A coluna "sem golden" existe para revelar
 *    defeito que só o golden byte-exato pega. Mas se a suíte ficou vermelha por
 *    uma suíte QUE NÃO É o golden, então rodar de novo sem o golden dá vermelho
 *    de novo — é dedução, não estimativa. A segunda execução só acontece quando
 *    quem pegou foi o golden.
 *
 * 3. EM PARALELO, uma caixa de areia por trabalhador. Nada disso enfraquece o
 *    portão: as mesmas suítes rodam, com os mesmos dados, na mesma máquina.
 */
function rodar(caixa, semGolden, comVisual) {
  const env = { ...process.env,
    /* Marca a caixa de areia. Um teste que confira as âncoras da lista real
       ficaria vermelho para TODOS os defeitos aqui dentro — o `de` do defeito
       plantado deixou de existir por construção —, e a coluna "pego por"
       perderia o sentido. Ver a explicação longa em test/portao.mjs. */
    EM_SANDBOX: '1',
    PARAR_CEDO: comVisual ? '' : '1',
    ...(semGolden ? { SEM_GOLDEN: '1' } : {}),
    ...(comVisual ? {} : { SEM_VISUAL: '1' }) };
  return new Promise(res => {
    execFile('node', ['test/run.mjs'], { encoding:'utf8', env, cwd:caixa, maxBuffer: 32*1024*1024 },
      (err, stdout, stderr) => res({ vermelha: !!err, saida: (stdout||'') + (stderr||'') }));
  });
}

const suitesQuePegaram = saida => {
  const nomes = [...new Set(saida.split('\n').filter(l => /^\s{2}\[/.test(l))
    .map(l => l.match(/^\s{2}\[([\w-]+)\]/)?.[1]).filter(Boolean))];
  /* Defeito que impede o módulo de carregar derruba a execução inteira em vez
     de reprovar um teste. Continua sendo vermelho, mas é outra coisa e o
     relatório não deve fingir que foi uma suíte que pegou. */
  return nomes.length ? nomes : ['(não carrega)'];
};

/* --- PRÉ-VOO: o que se lê em 0,1 s não se descobre em 12 min --------------
 *
 * Antes de montar caixa nenhuma, conferir que cada defeito ainda tem onde ser
 * plantado. O V1.14 pagou 19 dos seus 53 minutos de portão por não ter isto:
 * uma execução morreu com TypeError no defeito 70, e outra rodou inteira para
 * revelar que o S15 tinha perdido a âncora.
 *
 * ABORTA, e não avisa e segue. Defeito sem âncora conta como "não pego" no
 * relatório, e um portão que segue com defeito decorativo é um portão que
 * mente sobre a própria cobertura. */
const problemas = conferirAncoras(DEFEITOS, f => readFileSync(f, 'utf8'));
if (problemas.length) {
  console.error(`\nABORTADO no pré-voo: ${problemas.length} defeito(s) plantado(s) sem valor.\n`);
  for (const p of problemas)
    console.error(`  · ${p.id} [${p.tipo}] ${p.arquivo}\n      ${p.detalhe}`);
  console.error('\nCorrija a lista em test/defeitos-plantados.mjs antes de rodar o portão.');
  console.error('Âncora perdida costuma significar que um bloco moveu o trecho — realve o');
  console.error('defeito para onde o comportamento mora hoje, não apague o defeito.\n');
  process.exit(2);
}

/* --- MODO INCREMENTAL: `--tocados` ---------------------------------------
 *
 * Roda só os defeitos ancorados em arquivo que o `git diff` mostra alterado.
 * No V1.14 seriam 15 de 78 — 2,3 min em vez de 12.
 *
 * SERVE À CONSTRUÇÃO, NUNCA AO FECHAMENTO. Um bloco que mexe no `render.mjs`
 * pode quebrar um defeito ancorado na `coreografia.mjs`, e só a execução
 * completa vê isso. Por isso o modo grita no começo e no fim, e por isso o
 * `npm run portoes` não o usa. */
const INCREMENTAL = process.argv.includes('--tocados');
const tocados = INCREMENTAL ? arquivosTocados() : [];
const ALVOS = INCREMENTAL ? filtrarTocados(DEFEITOS, tocados) : DEFEITOS;

function arquivosTocados() {
  try {
    const saida = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    /* `--porcelain` cobre modificado, novo e não rastreado de uma vez; o
       `git diff` sozinho perderia arquivo recém-criado, que é justamente o
       caso mais comum durante a construção de um bloco. */
    return saida.split('\n').map(l => l.slice(3).trim()).filter(Boolean);
  } catch { return []; }
}

if (INCREMENTAL) {
  console.log(`\n⚠  MODO INCREMENTAL — ${ALVOS.length} de ${DEFEITOS.length} defeitos.`);
  console.log('   Isto NÃO é o portão Q2. Rode `npm run sabotagem` inteiro antes de fechar o bloco.');
  console.log(`   ${tocados.length} arquivo(s) alterado(s) segundo o git.\n`);
}

/* Os arquivos a guardar saem da PRÓPRIA lista de defeitos.
   Escrita à mão, esta lista era uma segunda fonte de verdade — e o V1.14
   provou o custo: dois arquivos novos entraram em `DEFEITOS`, ninguém os
   acrescentou aqui, e a execução morreu com um TypeError no defeito 70 depois
   de vinte minutos de trabalho jogados fora. Derivar não pode dessincronizar. */
const ARQUIVOS = [...new Set(ALVOS.map(d => d.arquivo))];
const originais = new Map();
for (const f of ARQUIVOS) originais.set(f, readFileSync(f, 'utf8'));

/* Uma caixa por trabalhador. A árvore de trabalho fica intocada do começo ao
   fim, e matar este processo a qualquer momento não deixa rastro. */
const N_TRAB = Math.max(1, Math.min(cpus().length, 4));
const CAIXAS = [];
for (let i = 0; i < N_TRAB; i++) {
  const c = mkdtempSync(join(tmpdir(), 'pokearena-sabotagem-'));
  /* `docs/` entra desde o F0.10 (test/saida-v09.mjs confere o §4.8 contra a
     Spec e o registro das lacunas) e `arte/` desde o V1.13 (test/tema.mjs
     confere que a arte referenciada pelo CSS existe). Sem eles a suíte nem
     roda na caixa — e caixa que não roda a suíte reprova tudo por igual. */
  for (const dir of ['engine', 'app', 'test', 'prototype', 'content', 'tools', 'docs', 'arte'])
    cpSync(dir, join(c, dir), { recursive: true });
  cpSync('package.json', join(c, 'package.json'));
  /* `.gitignore` entra porque test/assets.mjs afirma que a arte não é
     versionada, e essa afirmação se lê nele. `assets/` entra por link
     simbólico: são ~10 MB e copiá-los quatro vezes por execução é desperdício
     puro — nenhum defeito plantado mexe em arte. */
  cpSync('.gitignore', join(c, '.gitignore'));
  if (existsSync('assets')) symlinkSync(join(process.cwd(), 'assets'), join(c, 'assets'), 'dir');
  CAIXAS.push(c);
}
console.log(`${N_TRAB} caixa(s) de areia em ${tmpdir()}\n`);

console.log('Q2 · SABOTAGEM\n');
if ((await rodar(CAIXAS[0], false, false)).vermelha) {
  console.error('ABORTADO: a suíte já está vermelha.'); process.exit(2);
}
console.log('linha de base: VERDE\n');

async function avaliar(d, caixa) {
  const src = originais.get(d.arquivo);
  if (src === undefined) return { ...d, status:'ARQUIVO AUSENTE', com:'-', sem:'-' };
  if (!src.includes(d.de)) return { ...d, status:'ÂNCORA PERDIDA', com:'-', sem:'-' };
  const alvo = join(caixa, d.arquivo);
  writeFileSync(alvo, src.replace(d.de, d.para));
  try {
    let comG = await rodar(caixa, false, false);
    let pegouPor = comG.vermelha ? suitesQuePegaram(comG.saida) : [];

    /* Dedução: vermelho por suíte que não é o golden => vermelho sem o golden
       também. Só quando o golden é o único que pega é preciso confirmar. */
    let semVermelha = comG.vermelha && pegouPor.some(n => n !== 'golden');
    let semPor = pegouPor.filter(n => n !== 'golden');
    let instavel = false;

    if (comG.vermelha && !semVermelha) {
      const semG = await rodar(caixa, true, false);
      semVermelha = semG.vermelha;
      semPor = semG.vermelha ? suitesQuePegaram(semG.saida) : [];
      /* CONFIRMAÇÃO DO CASO SUSPEITO. "Vermelho com golden, verde sem" é o sinal
         que este relatório existe para dar — e é TAMBÉM o que uma falha
         transitória produz. Aconteceu no F0.9 com o S35, que em caixa limpa
         passa nos dois modos. Como o caso é raro, confirmar custa pouco. */
      if (!semG.vermelha) {
        const comG2 = await rodar(caixa, false, false);
        if (!comG2.vermelha) { instavel = true; comG = comG2; pegouPor = []; }
      }
    }

    let navegador = '';
    if (!comG.vermelha) {
      navegador = (await rodar(caixa, false, true)).vermelha ? 'só o navegador' : '';
    }
    return { ...d, instavel,
      status: instavel ? 'INSTÁVEL' : (comG.vermelha || navegador ? 'PEGOU' : 'PASSOU'),
      com: comG.vermelha ? pegouPor.join(',') : navegador,
      sem: comG.vermelha ? (semVermelha ? semPor.join(',') : 'NADA') : navegador };
  } finally {
    writeFileSync(alvo, src);   // desfaz dentro da caixa
  }
}

/* Fila simples: cada caixa puxa o próximo defeito quando termina o seu. */
const fila = ALVOS.slice();
const res = [];
let feitos = 0;
await Promise.all(CAIXAS.map(async caixa => {
  for (;;) {
    const d = fila.shift();
    if (!d) return;
    res.push(await avaliar(d, caixa));
    process.stdout.write(`\r  ${++feitos}/${ALVOS.length} avaliados`);
  }
}));
console.log('\n');
/* A fila devolve fora de ordem; o relatório é lido por id. */
const ordem = new Map(ALVOS.map((d, i) => [d.id, i]));
res.sort((a, b) => ordem.get(a.id) - ordem.get(b.id));

for (const c of CAIXAS) rmSync(c, { recursive:true, force:true });

console.log('id   defeito                                 status    sem golden, pego por');
console.log('─'.repeat(96));
for (const r of res)
  console.log(`${r.id.padEnd(4)} ${r.nome.padEnd(39)} ${(r.status==='PEGOU'?'✓':'✗')} ${r.status.padEnd(8)} ${r.sem}`);

const escaparam = res.filter(r => r.status !== 'PEGOU');
const instaveis = res.filter(r => r.instavel);
const soGolden  = res.filter(r => r.status === 'PEGOU' && r.sem === 'NADA');

console.log('');
if (escaparam.length) {
  console.log(`Q2 VERMELHO — ${escaparam.length}/${ALVOS.length} não foram pegos:`);
  /* O STATUS ENTRA NA LINHA, e não é detalhe. "ESCAPOU" e "ÂNCORA PERDIDA" são
     problemas diferentes: no primeiro o defeito foi plantado e a suíte não
     viu; no segundo ele nem chegou a ser plantado, porque o trecho onde ele
     morava deixou de existir. Chamar os dois de "passou despercebido" custou
     um diagnóstico errado no V1.14. */
  for (const r of escaparam)
    console.log(`  · ${r.id} [${r.status}] ${r.nome} — ${r.real}`);
}
if (soGolden.length) {
  console.log(`\n⚠ ${soGolden.length} defeito(s) só o golden pega — cobertura de propriedade fraca:`);
  for (const r of soGolden) console.log(`  · ${r.id} ${r.nome}`);
}
if (instaveis.length) {
  console.log(`\n⚠ ${instaveis.length} defeito(s) com resultado INSTÁVEL entre execuções.`);
  console.log('  Não contam como pegos: dúvida sobre cobertura tem que aparecer como dúvida.');
  for (const r of instaveis) console.log(`  · ${r.id} ${r.nome}`);
}
if (escaparam.length) process.exit(1);
/* O VERDE DO MODO INCREMENTAL NÃO É O VERDE DO PORTÃO, e a linha tem que dizer
   isso — verde parcial lido como verde de portão é exatamente o jeito de um
   bloco fechar com cobertura que ninguém verificou. */
if (INCREMENTAL) {
  console.log(`parcial VERDE — ${ALVOS.length}/${ALVOS.length} dos defeitos tocados detectados.`);
  console.log(`⚠  ${DEFEITOS.length - ALVOS.length} defeito(s) NÃO foram avaliados. Isto não fecha o Q2.`);
  console.log('   Rode `npm run sabotagem` inteiro antes do commit.');
} else {
  console.log(`Q2 VERDE — ${DEFEITOS.length}/${DEFEITOS.length} detectados` +
              (soGolden.length ? `, mas ${soGolden.length} dependem do golden.` : ', nenhum dependente só do golden.'));
}
console.log(`caixas de areia removidas; a árvore de trabalho não foi tocada.`);
