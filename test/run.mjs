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
import * as margem from './margem.mjs';
import * as precisao from './precisao.mjs';
import * as exposicao from './exposicao.mjs';
import * as carteira from './carteira.mjs';
import * as banco from './banco.mjs';
import * as informacao from './informacao.mjs';
import * as assets from './assets.mjs';
import * as telemetria from './telemetria.mjs';
import * as commit from './commit.mjs';
import * as saida from './saida-v09.mjs';
import * as progressao from './progressao.mjs';
import * as tema from './tema.mjs';
import * as arenas from './arenas.mjs';
import * as visual from './visual.mjs';

if (process.argv.includes('--gerar')) {
  console.log('gerando fixtures a partir do motor atual...');
  const g = golden.gerar();
  const b = estatistica.gerar();
  const mg = margem.gerar();
  const pr = precisao.gerar();
  const inf = informacao.gerar();
  console.log(`  golden: ${g.length} rodadas`);
  console.log(`  precisão: ${pr.sims} sims x ${pr.repeticoes} cálculos · ` +
              `${(pr.msPorCalculo/1000).toFixed(2)}s cada · erro previsto do pior ` +
              `${(pr.erroPrevistoPior*100).toFixed(2)}% · dispersão ${(pr.dispersaoPior*100).toFixed(2)}%`);
  console.log(`  informação: ${inf.rodadas} rodadas · vantagem do apostador informado ` +
              `${(inf.vantagem.ev*100).toFixed(2)}% ± ${(inf.vantagem.ic95*100).toFixed(2)} · ` +
              `mudou a aposta em ${inf.vantagem.rodadasEmQueMudou} rodadas`);
  console.log(`  margem: ${mg.rodadas} rodadas x ${mg.sims} sims · buffável ${(mg.buffavel.margem*100).toFixed(2)}% · ` +
              `resto ${(mg.neutro.margem*100).toFixed(2)}% · diferença ${(mg.diferenca*100).toFixed(2)} pontos`);
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
/* EXIGE_LOCAL=1 obriga a cópia local dos assets a existir. `npm run portoes`
   exige; `npm test` avisa e segue. Portão que pula em silêncio é decorativo —
   mesmo argumento do Q5. */
const exigeLocal = process.env.EXIGE_LOCAL === '1';
const semVisual = process.env.SEM_VISUAL === '1';   // usado pela sabotagem
let rVisual = null, baseAtual = null, baseGravada = null, digitaisNav = null, rSemRede = null, rTemaCedo = null;
/* Q3 do F0.5 pede a mesma rodada reproduzida em dois ambientes JS. Estas são as
   raízes comparadas — fixas, para que a falha seja reproduzível. */
const RAIZES_Q3 = [1, 42, 0xC0FFEE, 0xFFFFFFFF, 987654321];
if (visual.disponivel() && !semVisual) {
  rVisual = await visual.rodar();
  baseAtual = await visual.capturarBase();
  baseGravada = JSON.parse(readFileSync(new URL('./fixtures/visual-base.json', import.meta.url), 'utf8'));
  digitaisNav = await visual.digitaisNoNavegador(RAIZES_Q3);
  rTemaCedo = await visual.rodarTemaSemModulos();
  if (visual.temAssetsLocais()) rSemRede = await visual.rodarSemRede();
  else if (exigeLocal) { console.error('\nassets locais ausentes: rode npm run assets (ver tools/README.md)'); process.exit(2); }
  else console.log('  · teste de egresso fechado pulado (sem assets locais) — use npm run assets\n');
}
else if (exigeVisual && !semVisual) { console.error('\nQ5 indisponível: instale playwright-core (ver tools/README.md)'); process.exit(2); }
else console.log('  · Q5 visual pulado (sem navegador) — use npm run portoes para exigir\n');

/* PARAR_CEDO=1 encerra na primeira suíte que falhar.
 *
 * Serve à sabotagem, e só a ela: lá a pergunta é binária — "a suíte fica
 * vermelha?" — e rodar as outras dez depois da primeira falha é trabalho
 * jogado fora, 56 vezes. Numa execução normal a lista inteira de falhas é o
 * que interessa, então o modo fica desligado por padrão.
 *
 * A ORDEM ABAIXO É POR CUSTO, do mais barato para o mais caro. Medido:
 * golden 0,07 s, conteudo 0,14 s, carteira 0,16 s, exposicao 0,26 s,
 * semente 0,6 s, estatistica 0,8 s, precisao 1,9 s, invariantes 4,1 s,
 * informacao 12,9 s, margem 13,2 s. Com parada antecipada, um defeito que a
 * carteira pega custa 0,3 s em vez de 40 s. Isso não enfraquece nada: as
 * mesmas suítes rodam, na mesma máquina, com os mesmos dados. */
const pararCedo = process.env.PARAR_CEDO === '1';

const suites = [
  ...(semGolden ? [] : [golden.suite()]),
  /* baratas: varredura de texto e lotes pequenos */
  fonteUnica.suite(), estado.suite(), modulos.suite(), conteudo.suite(),
  carteira.suite(), banco.suite(), exposicao.suite(), assets.suite(), telemetria.suite(), commit.suite(), saida.suite(), progressao.suite(), tema.suite(), arenas.suite(),
  /* médias: lotes de simulação curtos */
  semente.suite(), estatistica.suite(), precisao.suite(), invariantes.suite(),
  ...(visual.disponivel() && !semVisual
     ? [visual.suite(rVisual), visual.suiteBase(baseAtual, baseGravada),
        visual.suiteAmbientes(digitaisNav, RAIZES_Q3), visual.suiteRodadaViva(rVisual),
        visual.suiteTemaCedo(rTemaCedo),
        ...(rSemRede ? [visual.suiteSemRede(rSemRede)] : [])]
     : []),
  await paridade.suite(),
  /* caras: medições estatísticas grandes, por último de propósito */
  informacao.suite(), margem.suite(),
];
let total = 0, falhas = [];
for (const s of suites) {
  const r = await s.rodar();
  total += r.total;
  falhas.push(...r.falhas.map(f => ({ ...f, suite: r.nome })));
  console.log(`  ${r.nome}: ${r.total - r.falhas.length}/${r.total}`);
  if (pararCedo && r.falhas.length) { console.log('  · parada antecipada (PARAR_CEDO=1)'); break; }
}
console.log('');
if (falhas.length) {
  console.log(`VERMELHO — ${falhas.length}/${total} falharam`);
  for (const f of falhas) console.log(`  [${f.suite}] ${f.titulo}\n      ${f.erro}`);
  process.exit(1);
}
console.log(`VERDE — ${total}/${total} passaram`);
console.log('\n§4.8 — critério de saída da v0.9, item a item:');
console.log(saida.relatorio());
console.log('  ⏳ = registrado e pendente; não se resolve escrevendo software.');

console.log('\nInvariantes da Spec §4.6 já verificadas:');
for (const n of invariantes.JA_VERIFICADAS) console.log('  ✓ ' + n);
console.log('\nInvariantes da Spec §4.6 ainda não verificáveis neste bloco:');
for (const n of invariantes.NAO_APLICAVEIS_AINDA) console.log('  · ' + n);
