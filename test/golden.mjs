/* Q1 · Golden tests — mesma seed, mesmos eventos, byte a byte.
 * Pega qualquer mudança acidental no motor. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as E from './motor.mjs';
import { criarSuite, ok, igual, elencoDeterministico } from './harness.mjs';

const ARQ = new URL('./fixtures/golden.json', import.meta.url);
const SEEDS = [1, 7, 42, 99, 123456789, 2**31, 777, 31337, 8675309, 1010101,
               55, 90210, 4815162342 >>> 0, 271828, 314159, 161803, 112358,
               999999937, 20260818, 65537];

export function gerar() {
  const saida = SEEDS.map((seed, i) => {
    const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, seed + i);
    const r = E.simulate(f, seed, true);
    return {
      seed, elenco: f.map(x => x.n), campeao: r.winner,
      duracao: +r.duration.toFixed(6), nEventos: r.events.length,
      /* impressão digital compacta do fluxo inteiro de eventos */
      digitalEventos: r.events.map(ev => ev.storm ? `S${ev.t.toFixed(3)}:${ev.hits.length}`
        : ev.streak ? `K${ev.t.toFixed(3)}:${ev.a}:${ev.lvl}`
        : `${ev.t.toFixed(3)}:${ev.a}>${ev.d}:${ev.m}:${ev.dmg}:${ev.crit?1:0}:${ev.miss?1:0}:${ev.ko?1:0}`).join('|'),
    };
  });
  writeFileSync(ARQ, JSON.stringify(saida, null, 1));
  return saida;
}

export function suite() {
  const s = criarSuite('golden');
  if (!existsSync(ARQ)) { console.error('fixture ausente — rode: node test/run.mjs --gerar'); process.exit(2); }
  const esperado = JSON.parse(readFileSync(ARQ, 'utf8'));
  for (const [i, exp] of esperado.entries()) {
    s.teste(`seed ${exp.seed}`, () => {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, exp.seed + i);
      igual(f.map(x => x.n).join(','), exp.elenco.join(','), 'elenco divergiu');
      const r = E.simulate(f, exp.seed, true);
      igual(r.winner, exp.campeao, 'campeão divergiu');
      igual(r.events.length, exp.nEventos, 'número de eventos divergiu');
      igual(+r.duration.toFixed(6), exp.duracao, 'duração divergiu');
      const dig = r.events.map(ev => ev.storm ? `S${ev.t.toFixed(3)}:${ev.hits.length}`
        : ev.streak ? `K${ev.t.toFixed(3)}:${ev.a}:${ev.lvl}`
        : `${ev.t.toFixed(3)}:${ev.a}>${ev.d}:${ev.m}:${ev.dmg}:${ev.crit?1:0}:${ev.miss?1:0}:${ev.ko?1:0}`).join('|');
      ok(dig === exp.digitalEventos, 'fluxo de eventos divergiu');
    });
  }
  return s;
}
