/* Q2 · SABOTAGEM — o portão que faz os outros valerem.
 *
 * Uma suíte que nunca ficou vermelha não prova nada. Aqui plantamos defeitos
 * de propósito no motor e exigimos que a suíte fique vermelha para cada um.
 * Defeito que passa = teste decorativo = bloco não fecha.
 *
 * Regras (BUILD_BLOCKS §4):
 *   1. o defeito precisa ser plausível — trocar um sinal, inverter uma
 *      comparação, remover uma checagem. Apagar função inteira não prova nada.
 *   2. precisa falhar no teste CERTO — registramos qual pegou qual.
 *
 * Uso: node test/sabotagem.mjs
 */
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MOTOR = new URL('../engine/generated.mjs', import.meta.url);
const BACKUP = new URL('../engine/generated.mjs.bak', import.meta.url);

/* Cada defeito: nome, o que simula na vida real, e a substituição exata. */
const DEFEITOS = [
  { id: 'S1', nome: 'tabela de tipos invertida',
    real: 'alguém "corrige" uma entrada da tabela e inverte a relação Fogo/Água',
    de: 'fire:{fire:.5,water:.5', para: 'fire:{fire:.5,water:2' },

  { id: 'S2', nome: 'taxa de crítico 8x maior',
    real: 'constante de balanceamento trocada por engano (0.0625 -> 0.5)',
    de: 'CRIT:         0.0625', para: 'CRIT:         0.5' },

  { id: 'S3', nome: 'golpe nunca erra',
    real: 'checagem de precisão removida numa refatoração',
    de: 'const miss = R() >', para: 'const miss = false && R() >' },

  { id: 'S4', nome: 'dano fixo em vez de calculado',
    real: 'valor de teste esquecido no lugar da fórmula',
    de: 'return {dmg: Math.max(1, Math.round(dmg)), eff, crit};',
    para: 'return {dmg: 42, eff, crit};' },

  { id: 'S5', nome: 'último lutador da pool nunca age',
    real: 'erro de limite em laço (i < n vira i < n-1)',
    de: 'let k = -1, best = Infinity;\n    for (let i=0;i<n;i++)',
    para: 'let k = -1, best = Infinity;\n    for (let i=0;i<n-1;i++)' },

  { id: 'S6', nome: 'multiplicador de vida alterado',
    real: 'ajuste de ritmo aplicado sem medir',
    de: 'HP_MULT:      2.1', para: 'HP_MULT:      2.6' },
];

function rodarSuite() {
  try {
    const saida = execFileSync('node', ['test/run.mjs'], { encoding: 'utf8', stdio: 'pipe' });
    return { vermelha: false, saida };
  } catch (e) {
    return { vermelha: true, saida: (e.stdout || '') + (e.stderr || '') };
  }
}

function pegouEm(saida) {
  const linhas = saida.split('\n').filter(l => /^\s{2}\[/.test(l));
  const suites = [...new Set(linhas.map(l => l.match(/^\s{2}\[(\w+)\]/)?.[1]).filter(Boolean))];
  const primeiro = linhas[0]?.replace(/^\s+/, '').replace(/^\[\w+\]\s*/, '') ?? '?';
  return { suites, primeiro, n: linhas.length };
}

console.log('Q2 · SABOTAGEM — cada defeito precisa deixar a suíte VERMELHA\n');

/* linha de base: a suíte precisa estar verde antes de sabotar */
const base = rodarSuite();
if (base.vermelha) { console.error('ABORTADO: a suíte já está vermelha antes de qualquer sabotagem.'); process.exit(2); }
console.log('linha de base: VERDE\n');

copyFileSync(MOTOR, BACKUP);
const original = readFileSync(MOTOR, 'utf8');
const resultados = [];

for (const d of DEFEITOS) {
  if (!original.includes(d.de)) {
    resultados.push({ ...d, status: 'ÂNCORA PERDIDA', detalhe: 'o trecho a sabotar não existe mais no motor' });
    continue;
  }
  writeFileSync(MOTOR, original.replace(d.de, d.para));
  const r = rodarSuite();
  const info = r.vermelha ? pegouEm(r.saida) : null;
  resultados.push({
    ...d,
    status: r.vermelha ? 'PEGOU' : 'PASSOU',
    detalhe: r.vermelha ? `${info.n} teste(s) em [${info.suites.join(', ')}] · primeiro: ${info.primeiro}` : 'nenhum teste falhou',
  });
  writeFileSync(MOTOR, original);
}

copyFileSync(BACKUP, MOTOR); unlinkSync(BACKUP);

console.log('id  defeito                                status        pego por');
console.log('─'.repeat(104));
for (const r of resultados) {
  const marca = r.status === 'PEGOU' ? '✓' : '✗';
  console.log(`${r.id}  ${r.nome.padEnd(38)} ${marca} ${r.status.padEnd(12)} ${r.detalhe}`);
}

const escaparam = resultados.filter(r => r.status !== 'PEGOU');
console.log('');
if (escaparam.length) {
  console.log(`Q2 VERMELHO — ${escaparam.length}/${DEFEITOS.length} defeito(s) passaram despercebidos.`);
  console.log('Os testes correspondentes são decorativos. Escrever cobertura antes de fechar o bloco:');
  for (const r of escaparam) console.log(`  · ${r.id} ${r.nome} — ${r.real}`);
  process.exit(1);
}
console.log(`Q2 VERDE — ${DEFEITOS.length}/${DEFEITOS.length} defeitos detectados.`);
const fim = rodarSuite();
console.log(`motor restaurado: ${fim.vermelha ? 'VERMELHO — RESTAURAÇÃO FALHOU' : 'VERDE'}`);
if (fim.vermelha) process.exit(2);
