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

const MOTOR = 'engine/engine.mjs';
const APP   = 'app/index.html';

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
];

function rodar(semGolden) {
  const env = { ...process.env, ...(semGolden ? { SEM_GOLDEN: '1' } : {}) };
  try { execFileSync('node', ['test/run.mjs'], { encoding:'utf8', stdio:'pipe', env });
        return { vermelha:false, saida:'' }; }
  catch (e) { return { vermelha:true, saida:(e.stdout||'') + (e.stderr||'') }; }
}

const suitesQuePegaram = saida => [...new Set(
  saida.split('\n').filter(l => /^\s{2}\[/.test(l))
       .map(l => l.match(/^\s{2}\[([\w-]+)\]/)?.[1]).filter(Boolean))];

console.log('Q2 · SABOTAGEM\n');
if (rodar(false).vermelha) { console.error('ABORTADO: a suíte já está vermelha.'); process.exit(2); }
console.log('linha de base: VERDE\n');

const originais = new Map();
for (const f of [MOTOR, APP]) { originais.set(f, readFileSync(f,'utf8')); copyFileSync(f, f + '.bak'); }

const res = [];
for (const d of DEFEITOS) {
  const src = originais.get(d.arquivo);
  if (!src.includes(d.de)) { res.push({ ...d, status:'ÂNCORA PERDIDA', com:'-', sem:'-' }); continue; }
  writeFileSync(d.arquivo, src.replace(d.de, d.para));
  const comG = rodar(false);
  const semG = rodar(true);
  writeFileSync(d.arquivo, src);
  res.push({ ...d,
    status: comG.vermelha ? 'PEGOU' : 'PASSOU',
    com: comG.vermelha ? suitesQuePegaram(comG.saida).join(',') : '—',
    sem: semG.vermelha ? suitesQuePegaram(semG.saida).join(',') : 'NADA' });
}

for (const f of [MOTOR, APP]) { copyFileSync(f + '.bak', f); unlinkSync(f + '.bak'); }

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
if (rodar(false).vermelha) { console.error('RESTAURAÇÃO FALHOU'); process.exit(2); }
console.log('motor e app restaurados: VERDE');
