/* Q1/Q3 · OS TACTICAL PRESETS (ST-10.8 · F4.4 · Spec §8.5)
 *
 * Cada preset é uma regra de alvo e de golpe; cada um tem um cenário em que
 * move a chance além de 3× o erro pareado (as mesmas lutas); Focus Weakness
 * nunca escolhe golpe menos efetivo havendo um mais; Defensive mira quem mais
 * ameaça; o preset entra na chance exibida e nas trocas; a Arena é outra.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { simular, montarLutador, danoEsperado, PRESETS } from '../engine/treino-batalha.mjs';
import { efeito } from '../engine/primitivas.mjs';
import { chanceDeVencer } from '../engine/treino-preco.mjs';
import { derivarIndice } from '../engine/seed.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { PRESETS_NA_TELA, presetValido } from '../app/modules/treino-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const time = lista => lista.map(([dex, nivel]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) }));
/* Achados por busca (27/09): em cada um, o preset move a chance muito além do erro. */
const CENARIOS = {
  aggressive: { A: time([[135, 28], [127, 32], [106, 36]]), B: time([[122, 29], [105, 37], [83, 27]]) },
  defensive:  { A: time([[135, 28], [127, 32], [106, 36]]), B: time([[122, 29], [105, 37], [83, 27]]) },
  /* ST-2.16: o Tauros (128) do lado B ficava PARADO contra o Gengar — normal
     não toca fantasma —, e era parte do efeito medido. Com o último recurso
     ele passou a bater; no lugar, um Machamp, que devolve ao Foco a diferença
     de antes (+0,215 contra +0,14 com o Tauros na regra nova). */
  focus:      { A: time([[94, 28], [65, 33], [76, 36]]),    B: time([[94, 39], [68, 35], [91, 33]]) },
};

function pareado(A, B, preset, n = 600) {
  let s = 0, s2 = 0;
  for (let i = 0; i < n; i++) {
    const sem = derivarIndice(7, 'treino', i);
    const d = (simular(pack, A, B, sem, { registrar: false, preset }).vencedor === 'A' ? 1 : 0)
            - (simular(pack, A, B, sem, { registrar: false }).vencedor === 'A' ? 1 : 0);
    s += d; s2 += d * d;
  }
  const m = s / n;
  return { delta: m, erro: Math.sqrt(Math.max(0, s2 / n - m * m) / n) };
}

export function suite() {
  const s = criarSuite('presets');

  s.teste('cada preset move a chance além de 3× o erro, num cenário', () => {
    igual(PRESETS.join(), 'balanced,aggressive,defensive,focus', 'os presets');
    for (const [preset, { A, B }] of Object.entries(CENARIOS)) {
      const r = pareado(A, B, preset);
      ok(Math.abs(r.delta) > 3 * r.erro && r.erro > 0, `${preset} não mexeu: Δ ${r.delta.toFixed(3)} ± ${r.erro.toFixed(3)}`);
    }
  });

  s.teste('Focus Weakness: nunca um golpe menos efetivo havendo um mais', () => {
    const { A, B } = CENARIOS.focus;
    const chart = pack.tipos.efetividade;
    const lut = { A: A.map((c, i) => montarLutador(pack, c, 'A', i)), B: B.map((c, i) => montarLutador(pack, c, 'B', i)) };
    for (let k = 1; k <= 20; k++) for (const e of simular(pack, A, B, k, { preset: 'focus' }).eventos.filter(e => e.de[0] === 'A')) {
      const eu = lut.A[+e.de.slice(1)], alvo = lut.B[+e.para.slice(1)];
      const melhor = Math.max(...eu.golpes.map(g => efeito(chart, g.t, alvo.types)));
      igual(e.eff, melhor, `semente ${k}: ${e.golpe} (${e.eff}×) havendo ${melhor}×`);
    }
  });

  s.teste('Defensive: o primeiro golpe vai em quem mais ameaça', () => {
    const { A, B } = CENARIOS.defensive;
    const chart = pack.tipos.efetividade;
    const nossos = A.map((c, i) => montarLutador(pack, c, 'A', i)), deles = B.map((c, i) => montarLutador(pack, c, 'B', i));
    const ameaca = D => Math.max(...nossos.map(N => Math.max(...D.golpes.map(g => danoEsperado(chart, D, N, g)))));
    const alvo = `B${deles.indexOf(deles.reduce((m, D) => (ameaca(D) > ameaca(m) ? D : m), deles[0]))}`;
    const primeiro = simular(pack, A, B, 3, { preset: 'defensive' }).eventos.find(e => e.de[0] === 'A');
    igual(primeiro.para, alvo, 'o defensivo não mirou a maior ameaça');
  });

  s.teste('o preset entra na chance exibida e nas trocas; o rival luta Balanced', () => {
    const { A, B } = CENARIOS.focus;
    const bal = chanceDeVencer(pack, A, B, { raiz: 7, sims: 400 }).p, foc = chanceDeVencer(pack, A, B, { raiz: 7, sims: 400, preset: 'focus' }).p;
    ok(foc - bal > 0.2, `a chance exibida não sentiu o preset: ${bal} → ${foc}`);
    igual(JSON.stringify(simular(pack, A, B, 5)), JSON.stringify(simular(pack, A, B, 5, { presetRival: 'balanced' })), 'o rival não é Balanced por padrão');
    let msg = '';
    try { simular(pack, A, B, 5, { preset: 'kamikaze' }); } catch (e) { msg = e.message; }
    ok(/preset desconhecido/.test(msg), 'preset inventado passou');
    ok(/lote\(PACK, A, rival, RAIZ, acum\.sims, .*, acum, preset\);/.test(fonte('../app/modules/treino-tela.mjs'))
       && /lotePareado\(PACK, vars, rival, RAIZ, feitos, .*, a, preset\);/.test(fonte('../app/modules/treino-tela.mjs')),
      'a tela não passa o preset à chance ou às trocas');
    igual(PRESETS_NA_TELA.map(p => p.id).join(), PRESETS.join(), 'a tela não oferece todos os presets');
    igual(presetValido('lixo'), 'balanced', 'um preset guardado inválido');
  });

  s.teste('a Arena é outra: nada de preset no motor da Arena', () => {
    ok(!/preset/i.test(fonte('../engine/engine.mjs').replace(/\/\*[\s\S]*?\*\//g, '')), 'a Arena lê preset');
  });

  return s;
}
