/* Q4 · Regressão estatística — o agregado não deslocou.
 * Pega mudanças que não alteram nenhum caso isolado mas movem a distribuição:
 * balanceamento, precificação, viés de sorteio. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as E from './motor.mjs';
import { criarSuite, ok, dentro, rngTeste, elencoDeterministico } from './harness.mjs';

const ARQ = new URL('./fixtures/baseline.json', import.meta.url);
const RODADAS = 10000;

function medir() {
  let duracao = 0, abates = 0, comTempestade = 0, mortesPorTempestade = 0;
  let crits = 0, erros = 0, golpes = 0;
  const vitorias = {}, aparicoes = {};
  for (let i = 0; i < RODADAS; i++) {
    const f = elencoDeterministico(E.elenco, E.montarElenco, 100000 + i);
    for (const x of f) aparicoes[x.n] = (aparicoes[x.n] || 0) + 1;
    const r = E.simular(f, 200000 + i, true);
    vitorias[f[r.winner].n] = (vitorias[f[r.winner].n] || 0) + 1;
    duracao += r.duration;
    let teveTempestade = false;
    for (const ev of r.events) {
      if (ev.storm) { teveTempestade = true; for (const h of ev.hits) if (h.ko) mortesPorTempestade++; continue; }
      if (ev.streak) continue;
      golpes++; if (ev.crit) crits++; if (ev.miss) erros++; if (ev.ko) abates++;
    }
    if (teveTempestade) comTempestade++;
  }
  /* taxa de vitória normalizada por aparição — é o número de balanceamento */
  const taxa = {};
  for (const n of Object.keys(aparicoes)) taxa[n] = (vitorias[n] || 0) / aparicoes[n];
  const ord = Object.entries(taxa).sort((a, b) => b[1] - a[1]);
  return {
    rodadas: RODADAS,
    duracaoMedia: duracao / RODADAS,
    abatesPorRodada: abates / RODADAS,
    taxaTempestade: comTempestade / RODADAS,
    mortesPorTempestadePorRodada: mortesPorTempestade / RODADAS,
    taxaCritico: crits / golpes,
    taxaErro: erros / golpes,
    melhor: { nome: ord[0][0], taxa: ord[0][1] },
    pior: { nome: ord[ord.length - 1][0], taxa: ord[ord.length - 1][1] },
    amplitude: ord[0][1] / ord[ord.length - 1][1],
  };
}

export function gerar() { const b = medir(); writeFileSync(ARQ, JSON.stringify(b, null, 1)); return b; }

export function suite() {
  const s = criarSuite('estatistica');
  if (!existsSync(ARQ)) { console.error('fixture ausente — rode: node test/run.mjs --gerar'); process.exit(2); }
  const base = JSON.parse(readFileSync(ARQ, 'utf8'));
  let m = null;
  s.teste(`medir ${RODADAS} rodadas`, () => { m = medir(); });
  /* tolerâncias apertadas de propósito: a seleção de elenco e as seeds são
     determinísticas neste teste, então a única fonte de variação seria uma
     mudança real no motor. */
  s.teste('duração média', () => dentro(m.duracaoMedia, base.duracaoMedia, 0.05, 'duração média'));
  s.teste('abates por rodada', () => dentro(m.abatesPorRodada, base.abatesPorRodada, 0.02, 'abates'));
  s.teste('taxa de tempestade', () => dentro(m.taxaTempestade, base.taxaTempestade, 0.005, 'tempestade'));
  s.teste('mortes por tempestade', () => dentro(m.mortesPorTempestadePorRodada, base.mortesPorTempestadePorRodada, 0.01, 'mortes por tempestade'));
  s.teste('taxa de crítico', () => dentro(m.taxaCritico, base.taxaCritico, 0.004, 'crítico'));
  s.teste('taxa de erro', () => dentro(m.taxaErro, base.taxaErro, 0.004, 'erro'));
  s.teste('lutador mais forte não mudou', () => {
    ok(m.melhor.nome === base.melhor.nome, `melhor virou ${m.melhor.nome}, era ${base.melhor.nome}`);
    dentro(m.melhor.taxa, base.melhor.taxa, 0.02, 'taxa do melhor');
  });
  s.teste('amplitude do elenco', () => dentro(m.amplitude, base.amplitude, base.amplitude * 0.15, 'amplitude'));
  return s;
}
