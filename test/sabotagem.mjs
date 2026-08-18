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
 * Uso: node test/sabotagem.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MOTOR  = 'engine/engine.mjs';
const APP    = 'app/index.html';
const ESTADO = 'app/modules/estado.mjs';
const RENDER = 'app/modules/render.mjs';
const DOM    = 'app/modules/dom.mjs';
const EFEITOS= 'app/modules/efeitos.mjs';
const COREO  = 'app/modules/coreografia.mjs';

const DEFEITOS = [
  { id:'S1', arquivo:MOTOR, nome:'tabela de tipos invertida',
    real:'alguém "corrige" uma entrada e inverte a relação Fogo/Água',
    de:'fire:{fire:.5,water:.5', para:'fire:{fire:.5,water:2' },

  { id:'S2', arquivo:MOTOR, nome:'taxa de crítico 8x maior',
    real:'constante de balanceamento trocada por engano',
    de:'CRIT:         0.0625', para:'CRIT:         0.5' },

  { id:'S3', arquivo:MOTOR, nome:'golpe nunca erra',
    real:'checagem de precisão removida numa refatoração',
    de:'const miss = R() >', para:'const miss = false && R() >' },

  { id:'S4', arquivo:MOTOR, nome:'dano fixo em vez de calculado',
    real:'valor de teste esquecido no lugar da fórmula',
    de:'return {dmg: Math.max(1, Math.round(dmg)), eff, crit};',
    para:'return {dmg: 42, eff, crit};' },

  { id:'S5', arquivo:MOTOR, nome:'último lutador da pool nunca age',
    real:'erro de limite em laço',
    de:'let k = -1, best = Infinity;\n    for (let i=0;i<n;i++)',
    para:'let k = -1, best = Infinity;\n    for (let i=0;i<n-1;i++)' },

  { id:'S6', arquivo:MOTOR, nome:'multiplicador de vida alterado',
    real:'ajuste de ritmo aplicado sem medir',
    de:'HP_MULT:      2.1', para:'HP_MULT:      2.6' },

  /* --- defeitos novos do F0.2 ------------------------------------------- */
  { id:'S7', arquivo:MOTOR, nome:'D-001 revertido',
    real:'alguém "simplifica" o desempate de volta para dentro de hits',
    de:'          if (beforePct > ultimoPct){ ultimoPct = beforePct; ultimoIdx = i; }\n',
    para:'' },

  { id:'S8', arquivo:MOTOR, nome:'desempate da tempestade escolhe o mais ferido',
    real:'comparação invertida no desempate',
    de:'if (beforePct > ultimoPct)', para:'if (beforePct < ultimoPct)' },

  { id:'S9', arquivo:APP, nome:'cópia divergente do motor no app',
    real:'alguém cola de volta uma função do motor "só para testar"',
    de:'<script type="module">',
    para:'<script type="module">\nfunction damageOf(A,D,mv,R){ return {dmg:1,eff:1,crit:false}; }' },

  { id:'S10', arquivo:APP, nome:'app deixa de importar o motor',
    real:'import removido durante um merge',
    de:"} from '../engine/engine.mjs';", para:"} from '../engine/copia-local.mjs';" },

  /* --- defeitos do F0.3a: a fronteira de estado ------------------------- */
  { id:'S11', arquivo:APP, nome:'estado compartilhado volta a ser variável de topo',
    real:'alguém "simplifica" S.champ de volta para uma variável solta',
    de:"import { S } from './modules/estado.mjs';",
    para:"import { S } from './modules/estado.mjs';\nlet champ = -1;" },

  { id:'S12', arquivo:ESTADO, nome:'estado.mjs deixa de ser inerte',
    real:'alguém inicializa o saldo direto no módulo de estado',
    de:'  bal:      0,', para:"  bal:      +(localStorage.getItem('ar_bal') || 1000)," },

  { id:'S13', arquivo:ESTADO, nome:'campo some da superfície declarada',
    real:'remoção de campo durante refatoração, sem atualizar quem lê',
    de:'  champ:    -1,', para:'' },

  { id:'S14', arquivo:ESTADO, nome:'superfície cresce sem justificativa',
    real:'estado local promovido a global "só por enquanto"',
    de:'  profile:  null,', para:'  profile:  null,\n  cacheQualquer: {},' },

  /* --- defeitos do F0.3b: o grafo de módulos ---------------------------- */
  { id:'S15', arquivo:RENDER, nome:'módulo usa símbolo do motor sem importar',
    real:'import perdido num merge — foi exatamente o que aconteceu ao extrair',
    de:"import { rng } from '../../engine/engine.mjs';\n", para:'' },

  { id:'S16', arquivo:DOM, nome:'dependência invertida entre camadas',
    real:'utilidade de DOM passa a puxar render "só para uma coisinha"',
    de:'/* Utilidades de DOM.',
    para:"import { W } from './render.mjs';\n/* Utilidades de DOM." },

  { id:'S17', arquivo:APP, nome:'app deixa de importar um módulo de apresentação',
    real:'linha de import removida sem querer',
    de:"} from './modules/clima.mjs';", para:"} from './modules/clima-antigo.mjs';" },

  /* --- defeitos do F0.3c: mutação através de fronteira ------------------ */
  { id:'S18', arquivo:EFEITOS, nome:'módulo atribui a símbolo importado',
    real:'atalho para "guardar" estado de outro módulo — TypeError em execução',
    de:"function pushFx(o){", para:"function pushFx(o){\n  W = 1;" },

  { id:'S19', arquivo:COREO, nome:'ciclo entre módulos da mesma fatia',
    real:'import de conveniência que fecha ciclo e some no code review',
    de:"import { $, log } from './dom.mjs';",
    para:"import { $, log } from './dom.mjs';\nimport { applyEvent } from './eventos.mjs';" },
];

/* A sabotagem mede se a SUÍTE pega o defeito, então roda sem o portão de
   navegador: ele custa ~40 s por execução e são duas execuções por defeito.
   Defeito que escapa das duas é reexecutado COM o navegador, porque aí a
   pergunta muda — não é mais "a suíte pega?", é "alguém pega?". */
function rodar(semGolden, comVisual) {
  const env = { ...process.env,
    ...(semGolden ? { SEM_GOLDEN: '1' } : {}),
    ...(comVisual ? {} : { SEM_VISUAL: '1' }) };
  try { execFileSync('node', ['test/run.mjs'], { encoding:'utf8', stdio:'pipe', env });
        return { vermelha:false, saida:'' }; }
  catch (e) { return { vermelha:true, saida:(e.stdout||'') + (e.stderr||'') }; }
}

const suitesQuePegaram = saida => {
  const nomes = [...new Set(saida.split('\n').filter(l => /^\s{2}\[/.test(l))
    .map(l => l.match(/^\s{2}\[([\w-]+)\]/)?.[1]).filter(Boolean))];
  /* Defeito que impede o módulo de carregar derruba a execução inteira em vez
     de reprovar um teste. Continua sendo vermelho, mas é outra coisa e o
     relatório não deve fingir que foi uma suíte que pegou. */
  return nomes.length ? nomes : ['(não carrega)'];
};

console.log('Q2 · SABOTAGEM\n');
if (rodar(false, false).vermelha) { console.error('ABORTADO: a suíte já está vermelha.'); process.exit(2); }
console.log('linha de base: VERDE\n');

const ARQUIVOS = [MOTOR, APP, ESTADO, RENDER, DOM, EFEITOS, COREO];
const originais = new Map();
for (const f of ARQUIVOS) { originais.set(f, readFileSync(f,'utf8')); copyFileSync(f, f + '.bak'); }

/* Restaura mesmo se este processo morrer no meio — timeout, Ctrl-C, kill.
   Sem isso, uma execução interrompida deixa um DEFEITO PLANTADO no
   repositório, e a suíte seguinte acusa erros que ninguém escreveu.
   Aconteceu de verdade no F0.3c. */
let restaurado = false;
function restaurar(){
  if (restaurado) return; restaurado = true;
  for (const f of ARQUIVOS) {
    try { if (existsSync(f + '.bak')) { copyFileSync(f + '.bak', f); unlinkSync(f + '.bak'); } } catch {}
  }
}
process.on('exit', restaurar);
for (const sinal of ['SIGINT','SIGTERM','SIGHUP'])
  process.on(sinal, () => { restaurar(); process.exit(130); });
process.on('uncaughtException', e => { restaurar(); console.error(e); process.exit(1); });

const res = [];
for (const d of DEFEITOS) {
  const src = originais.get(d.arquivo);
  if (!src.includes(d.de)) { res.push({ ...d, status:'ÂNCORA PERDIDA', com:'-', sem:'-' }); continue; }
  writeFileSync(d.arquivo, src.replace(d.de, d.para));
  const comG = rodar(false, false);
  const semG = rodar(true, false);
  let navegador = '';
  if (!comG.vermelha) {              // escapou da suíte: o navegador pega?
    const v = rodar(false, true);
    navegador = v.vermelha ? 'só o navegador' : '';
  }
  writeFileSync(d.arquivo, src);
  res.push({ ...d,
    status: comG.vermelha ? 'PEGOU' : (navegador ? 'PEGOU' : 'PASSOU'),
    com: comG.vermelha ? suitesQuePegaram(comG.saida).join(',') : navegador,
    sem: comG.vermelha ? (semG.vermelha ? suitesQuePegaram(semG.saida).join(',') : 'NADA') : navegador });
}

restaurar();

console.log('id   defeito                                 status    sem golden, pego por');
console.log('─'.repeat(96));
for (const r of res)
  console.log(`${r.id.padEnd(4)} ${r.nome.padEnd(39)} ${(r.status==='PEGOU'?'✓':'✗')} ${r.status.padEnd(7)} ${r.sem}`);

const escaparam = res.filter(r => r.status !== 'PEGOU');
const soGolden  = res.filter(r => r.status === 'PEGOU' && r.sem === 'NADA');

console.log('');
if (escaparam.length) {
  console.log(`Q2 VERMELHO — ${escaparam.length}/${DEFEITOS.length} passaram despercebidos:`);
  for (const r of escaparam) console.log(`  · ${r.id} ${r.nome} — ${r.real}`);
}
if (soGolden.length) {
  console.log(`\n⚠ ${soGolden.length} defeito(s) só o golden pega — cobertura de propriedade fraca:`);
  for (const r of soGolden) console.log(`  · ${r.id} ${r.nome}`);
}
if (escaparam.length) process.exit(1);
console.log(`Q2 VERDE — ${DEFEITOS.length}/${DEFEITOS.length} detectados` +
            (soGolden.length ? `, mas ${soGolden.length} dependem do golden.` : ', nenhum dependente só do golden.'));
if (rodar(false, false).vermelha) { console.error('RESTAURAÇÃO FALHOU'); process.exit(2); }
console.log('motor e app restaurados: VERDE');
