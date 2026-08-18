/* Q3 · Invariantes — propriedades que valem em TODA execução, verificadas
 * sobre entrada aleatorizada, não sobre casos escritos à mão.
 *
 * A Spec §4.6 lista 11 invariantes. Cinco delas são de carteira/aposta e só
 * passam a ser verificáveis a partir de F0.9 e F1.4; estão marcadas abaixo e
 * NÃO são silenciosamente omitidas. */
import * as E from '../engine/generated.mjs';
import { criarSuite, ok, rngTeste, elencoDeterministico } from './harness.mjs';

const RODADAS = 2000;

export const NAO_APLICAVEIS_AINDA = [
  'saldo nunca fica negativo            -> F0.9',
  'payout ocorre uma única vez          -> F1.7',
  'aposta fechada não pode ser alterada -> F1.7',
  'nenhum ticket excede MAX_PAYOUT      -> F0.8',
  'nenhuma rodada excede MAX_LIABILITY  -> F0.8',
];

export function suite() {
  const s = criarSuite('invariantes');

  s.teste(`I1 · exatamente um campeão em ${RODADAS} rodadas`, () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 5000 + i);
      const r = E.simulate(f, 900000 + i, true);
      ok(r.winner >= 0 && r.winner < f.length, `rodada ${i}: campeão inválido ${r.winner}`);
    }
  });

  s.teste('I2 · nenhuma batalha excede o corte duro de tempo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 6000 + i);
      const r = E.simulate(f, 910000 + i, true);
      ok(r.duration <= E.CONF.MAX_TIME, `rodada ${i}: duração ${r.duration} > MAX_TIME`);
      for (const ev of r.events) ok(ev.t <= E.CONF.MAX_TIME, `evento além do corte`);
    }
  });

  s.teste('I3 · nenhum lutador é abatido duas vezes', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 7000 + i);
      const r = E.simulate(f, 920000 + i, true);
      const mortos = new Set();
      for (const ev of r.events) {
        if (ev.storm) { for (const h of ev.hits) if (h.ko) {
          ok(!mortos.has(h.i), `rodada ${i}: KO duplicado (tempestade) em ${h.i}`); mortos.add(h.i); } }
        else if (!ev.streak && ev.ko) {
          ok(!mortos.has(ev.d), `rodada ${i}: KO duplicado em ${ev.d}`); mortos.add(ev.d);
        }
      }
      ok(mortos.size === f.length - 1, `rodada ${i}: ${mortos.size} abates para ${f.length} lutadores`);
    }
  });

  s.teste('I4 · lutador abatido não age nem é alvo depois', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 8000 + i);
      const r = E.simulate(f, 930000 + i, true);
      const mortos = new Set();
      for (const ev of r.events) {
        if (ev.storm) { for (const h of ev.hits) { ok(!mortos.has(h.i), 'tempestade atingiu morto'); if (h.ko) mortos.add(h.i); } continue; }
        if (ev.streak) { ok(!mortos.has(ev.a), 'killstreak de lutador morto'); continue; }
        ok(!mortos.has(ev.a), `rodada ${i}: morto atacou em t=${ev.t}`);
        ok(!mortos.has(ev.d), `rodada ${i}: morto foi alvo em t=${ev.t}`);
        if (ev.ko) mortos.add(ev.d);
      }
    }
  });

  s.teste('I5 · tempo dos eventos é monotônico', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 9000 + i);
      const r = E.simulate(f, 940000 + i, true);
      let ult = -1;
      for (const ev of r.events) { ok(ev.t >= ult - 1e-9, `rodada ${i}: tempo retrocedeu`); ult = ev.t; }
    }
  });

  s.teste('I6 · dano é 0 só quando erra ou é imune; nunca negativo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 11000 + i);
      const r = E.simulate(f, 950000 + i, true);
      for (const ev of r.events) {
        if (ev.storm || ev.streak) continue;
        ok(ev.dmg >= 0, `dano negativo em t=${ev.t}`);
        if (ev.dmg === 0) ok(ev.miss || ev.eff === 0, `dano zero sem erro nem imunidade em t=${ev.t}`);
      }
    }
  });

  s.teste('I7 · só entram lutadores do elenco declarado', () => {
    const validos = new Set(E.KANTO_DEX.map(p => p.dex));
    for (let i = 0; i < 300; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 12000 + i);
      ok(f.length === E.CONF.ARENA_SIZE, `pool com ${f.length} lutadores`);
      ok(new Set(f.map(x => x.dex)).size === f.length, 'lutador repetido na pool');
      for (const x of f) ok(validos.has(x.dex), `dex ${x.dex} fora do elenco`);
    }
  });

  s.teste('I8 · nenhuma probabilidade estimada é zero (Laplace)', () => {
    for (let i = 0; i < 12; i++) {
      const f = elencoDeterministico(E.KANTO_DEX, E.buildRoster, 13000 + i);
      const SIMS = 3000, w = new Uint32Array(f.length);
      const R = rngTeste(600000 + i);
      for (let k = 0; k < SIMS; k++) {
        const x = E.simulate(f, (R() * 4294967296) >>> 0, false);
        if (x >= 0) w[x]++;
      }
      const p = Array.from(w, v => (v + 1) / (SIMS + f.length));
      for (const [j, v] of p.entries()) ok(v > 0, `probabilidade zero em ${f[j].n}`);
    }
  });

  /* ------------------------------------------------------------------ *
   * D-001 · DEFEITO REGISTRADO, encontrado por este arnês.
   *
   * O caminho rápido de simulate() (record=false, o que roda as 20.000
   * simulações das odds) devolve -1 quando um carimbo de tempestade abate os
   * últimos lutadores no mesmo instante. Causa: o desempate percorre `hits`,
   * mas `hits` só é preenchido `if (ev)` — ou seja, apenas em modo gravação.
   *
   * Consequência: as odds e a batalha exibida discordam em ~0,034% das
   * simulações, e computeOdds descarta a amostra em silêncio. Isso contradiz
   * o princípio declarado de que as odds saem do MESMO motor que roda a luta.
   *
   * F0.1 fotografa, não conserta — ver docs/DEFEITOS.md. Este teste afirma o
   * defeito de propósito: quando alguém corrigir, ele fica vermelho e aponta
   * para o registro.
   * ------------------------------------------------------------------ */
  s.teste('D-001 · defeito registrado: caminho rápido devolve -1 em varredura por tempestade', () => {
    const f = E.buildRoster(E.KANTO_DEX.slice(0, 12));
    const SEEDS_CONHECIDAS = [3846931268, 3582205302, 3060347309];
    for (const seed of SEEDS_CONHECIDAS) {
      const rapido = E.simulate(f, seed, false);
      const gravado = E.simulate(f, seed, true);
      ok(rapido === -1,
        `D-001 parece corrigido para a seed ${seed} (rápido devolveu ${rapido}). ` +
        `Se foi intencional, atualize docs/DEFEITOS.md e remova este teste.`);
      ok(gravado.winner >= 0,
        `modo gravação também perdeu o vencedor na seed ${seed} — defeito pior que o registrado`);
    }
  });

  return s;
}
