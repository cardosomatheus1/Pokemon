/* Executor dos portões Q1, Q3 e Q4 do bloco F0.1.
 * Uso:  node test/run.mjs           roda a suíte
 *       node test/run.mjs --gerar   regrava as fixtures (só quando a mudança é intencional)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as golden from './golden.mjs';
import * as invariantes from './invariantes.mjs';
import * as estatistica from './estatistica.mjs';
import * as fonteUnica from './fonte-unica.mjs';
import * as paridade from './paridade.mjs';
import * as estado from './estado.mjs';
import * as modulos from './modulos.mjs';
import * as conteudo from './conteudo.mjs';
import * as semente from './semente.mjs';
import * as visual from './visual.mjs';

if (process.argv.includes('--gerar')) {
  console.log('gerando fixtures a partir do motor atual...');
  const g = golden.gerar();
  const b = estatistica.gerar();
  console.log(`  golden: ${g.length} rodadas`);
  console.log(`  baseline: ${b.rodadas} rodadas · duração média ${b.duracaoMedia.toFixed(2)}s · ` +
              `melhor ${b.melhor.nome} ${(b.melhor.taxa*100).toFixed(2)}% · amplitude ${b.amplitude.toFixed(1)}x`);
  if (visual.disponivel()) {
    const base = await visual.capturarBase();
    writeFileSync(new URL('./fixtures/visual-base.json', import.meta.url), JSON.stringify(base));
    console.log(`  linha de base visual: ${Object.keys(base).length} telas`);
  } else {
    console.log('  linha de base visual NÃO regravada — sem navegador');
  }
  process.exit(0);
}

/* SEM_GOLDEN=1 roda tudo menos os golden tests. Serve ao portão Q2: um
   defeito que só o golden pega indica cobertura de propriedade fraca naquela
   área, porque golden byte-exato pega qualquer mudança de comportamento. */
const semGolden = process.env.SEM_GOLDEN === '1';
/* Q5 exige navegador. `npm test` pula com aviso; `npm run portoes` exige,
   porque portão que pula em silêncio é decorativo. */
const exigeVisual = process.env.EXIGE_VISUAL === '1';
const semVisual = process.env.SEM_VISUAL === '1';   // usado pela sabotagem
let rVisual = null, baseAtual = null, baseGravada = null, digitaisNav = null;
/* Q3 do F0.5 pede a mesma rodada reproduzida em dois ambientes JS. Estas são as
   raízes comparadas — fixas, para que a falha seja reproduzível. */
const RAIZES_Q3 = [1, 42, 0xC0FFEE, 0xFFFFFFFF, 987654321];
if (visual.disponivel() && !semVisual) {
  rVisual = await visual.rodar();
  baseAtual = await visual.capturarBase();
  baseGravada = JSON.parse(readFileSync(new URL('./fixtures/visual-base.json', import.meta.url), 'utf8'));
  digitaisNav = await visual.digitaisNoNavegador(RAIZES_Q3);
}
else if (exigeVisual && !semVisual) { console.error('\nQ5 indisponível: instale playwright-core (ver tools/README.md)'); process.exit(2); }
else console.log('  · Q5 visual pulado (sem navegador) — use npm run portoes para exigir\n');

const suites = [
  ...(semGolden ? [] : [golden.suite()]),
  invariantes.suite(), estatistica.suite(),
  fonteUnica.suite(), estado.suite(), modulos.suite(), conteudo.suite(), semente.suite(),
  ...(visual.disponivel() && !semVisual
     ? [visual.suite(rVisual), visual.suiteBase(baseAtual, baseGravada),
        visual.suiteAmbientes(digitaisNav, RAIZES_Q3), visual.suiteRodadaViva(rVisual)]
     : []), await paridade.suite(),
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
