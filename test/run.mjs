/* Executor dos portões Q1, Q3 e Q4 do bloco F0.1.
 * Uso:  node test/run.mjs           roda a suíte
 *       node test/run.mjs --gerar   regrava as fixtures (só quando a mudança é intencional)
 */
import * as golden from './golden.mjs';
import * as invariantes from './invariantes.mjs';
import * as estatistica from './estatistica.mjs';
import * as fonteUnica from './fonte-unica.mjs';
import * as paridade from './paridade.mjs';
import * as estado from './estado.mjs';
import * as modulos from './modulos.mjs';

if (process.argv.includes('--gerar')) {
  console.log('gerando fixtures a partir do motor atual...');
  const g = golden.gerar();
  const b = estatistica.gerar();
  console.log(`  golden: ${g.length} rodadas`);
  console.log(`  baseline: ${b.rodadas} rodadas · duração média ${b.duracaoMedia.toFixed(2)}s · ` +
              `melhor ${b.melhor.nome} ${(b.melhor.taxa*100).toFixed(2)}% · amplitude ${b.amplitude.toFixed(1)}x`);
  process.exit(0);
}

/* SEM_GOLDEN=1 roda tudo menos os golden tests. Serve ao portão Q2: um
   defeito que só o golden pega indica cobertura de propriedade fraca naquela
   área, porque golden byte-exato pega qualquer mudança de comportamento. */
const semGolden = process.env.SEM_GOLDEN === '1';
const suites = [
  ...(semGolden ? [] : [golden.suite()]),
  invariantes.suite(), estatistica.suite(),
  fonteUnica.suite(), estado.suite(), modulos.suite(), await paridade.suite(),
];
let total = 0, falhas = [];
for (const s of suites) {
  process.stdout.write(`${s.rodar ? '' : ''}`);
  const r = await s.rodar();
  total += r.total;
  falhas.push(...r.falhas.map(f => ({ ...f, suite: r.nome })));
  console.log(`  ${r.nome}: ${r.total - r.falhas.length}/${r.total}`);
}
console.log('');
if (falhas.length) {
  console.log(`VERMELHO — ${falhas.length}/${total} falharam`);
  for (const f of falhas) console.log(`  [${f.suite}] ${f.titulo}\n      ${f.erro}`);
  process.exit(1);
}
console.log(`VERDE — ${total}/${total} passaram`);
console.log('\nInvariantes da Spec §4.6 ainda não verificáveis neste bloco:');
for (const n of invariantes.NAO_APLICAVEIS_AINDA) console.log('  · ' + n);
