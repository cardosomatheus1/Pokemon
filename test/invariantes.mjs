/* Q3 · Invariantes — propriedades que valem em TODA execução, verificadas
 * sobre entrada aleatorizada, não sobre casos escritos à mão.
 *
 * A Spec §4.6 lista 11 invariantes. Cinco delas são de carteira/aposta e só
 * passam a ser verificáveis a partir de F0.9 e F1.4; estão marcadas abaixo e
 * NÃO são silenciosamente omitidas. */
import * as E from './motor.mjs';
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
      const f = elencoDeterministico(E.elenco, E.montarElenco, 5000 + i);
      const r = E.simular(f, 900000 + i, true);
      ok(r.winner >= 0 && r.winner < f.length, `rodada ${i}: campeão inválido ${r.winner}`);
    }
  });

  s.teste('I2 · nenhuma batalha excede o corte duro de tempo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 6000 + i);
      const r = E.simular(f, 910000 + i, true);
      ok(r.duration <= E.CONF.MAX_TIME, `rodada ${i}: duração ${r.duration} > MAX_TIME`);
      for (const ev of r.events) ok(ev.t <= E.CONF.MAX_TIME, `evento além do corte`);
    }
  });

  s.teste('I3 · nenhum lutador é abatido duas vezes', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 7000 + i);
      const r = E.simular(f, 920000 + i, true);
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
      const f = elencoDeterministico(E.elenco, E.montarElenco, 8000 + i);
      const r = E.simular(f, 930000 + i, true);
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
      const f = elencoDeterministico(E.elenco, E.montarElenco, 9000 + i);
      const r = E.simular(f, 940000 + i, true);
      let ult = -1;
      for (const ev of r.events) { ok(ev.t >= ult - 1e-9, `rodada ${i}: tempo retrocedeu`); ult = ev.t; }
    }
  });

  s.teste('I6 · dano é 0 só quando erra ou é imune; nunca negativo', () => {
    for (let i = 0; i < RODADAS; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 11000 + i);
      const r = E.simular(f, 950000 + i, true);
      for (const ev of r.events) {
        if (ev.storm || ev.streak) continue;
        ok(ev.dmg >= 0, `dano negativo em t=${ev.t}`);
        if (ev.dmg === 0) ok(ev.miss || ev.eff === 0, `dano zero sem erro nem imunidade em t=${ev.t}`);
      }
    }
  });

  s.teste('I7 · só entram lutadores do elenco declarado', () => {
    const validos = new Set(E.elenco.map(p => p.dex));
    for (let i = 0; i < 300; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 12000 + i);
      ok(f.length === E.CONF.ARENA_SIZE, `pool com ${f.length} lutadores`);
      ok(new Set(f.map(x => x.dex)).size === f.length, 'lutador repetido na pool');
      for (const x of f) ok(validos.has(x.dex), `dex ${x.dex} fora do elenco`);
    }
  });

  s.teste('I8 · nenhuma probabilidade estimada é zero (Laplace)', () => {
    for (let i = 0; i < 12; i++) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, 13000 + i);
      const SIMS = 3000, w = new Uint32Array(f.length);
      const R = rngTeste(600000 + i);
      for (let k = 0; k < SIMS; k++) {
        const x = E.simular(f, (R() * 4294967296) >>> 0, false);
        if (x >= 0) w[x]++;
      }
      const p = Array.from(w, v => (v + 1) / (SIMS + f.length));
      for (const [j, v] of p.entries()) ok(v > 0, `probabilidade zero em ${f[j].n}`);
    }
  });

  /* ------------------------------------------------------------------ *
   * D-001 · CORRIGIDO em F0.2.
   *
   * O caminho rápido de simular() devolvia -1 quando um carimbo de
   * tempestade abatia os últimos lutadores no mesmo instante, porque o
   * desempate percorria `hits`, alimentado só em modo gravação. Medido em
   * 0,034% das simulações, e o descarte não era aleatório.
   *
   * Este teste agora afirma a CORREÇÃO. As seeds são as mesmas que
   * demonstravam o defeito: se voltarem a divergir, a regressão aparece
   * aqui e aponta para docs/DEFEITOS.md.
   * ------------------------------------------------------------------ */
  s.teste('D-001 · caminho rápido e modo gravação concordam na varredura por tempestade', () => {
    const f = E.montarElenco(E.elenco.slice(0, 12));
    const SEEDS_DO_DEFEITO = [3846931268, 3582205302, 3060347309];
    for (const seed of SEEDS_DO_DEFEITO) {
      const rapido = E.simular(f, seed, false);
      const gravado = E.simular(f, seed, true);
      ok(rapido >= 0, `D-001 regrediu: caminho rápido devolveu ${rapido} na seed ${seed}`);
      ok(rapido === gravado.winner,
        `seed ${seed}: caminho rápido (${rapido}) discorda do modo gravação (${gravado.winner})`);
    }
  });

  s.teste('D-001 · nenhuma simulação perde o vencedor em 50.000 amostras', () => {
    const f = E.montarElenco(E.elenco.slice(0, 12));
    const R = rngTeste(4242);
    for (let i = 0; i < 50000; i++) {
      const seed = (R() * 4294967296) >>> 0;
      ok(E.simular(f, seed, false) >= 0, `caminho rápido devolveu -1 na seed ${seed}`);
    }
  });

  /* ------------------------------------------------------------------ *
   * L-016 · o corte duro de tempo.
   *
   * `CONF.MAX_TIME` existe para o caso de dois tipos mutuamente imunes
   * sobrarem por último. Medido: NENHUMA das 10.000 rodadas do lote
   * estatístico chega perto dele — a tempestade encerra tudo antes, sempre.
   * Um seguro que nunca dispara não tem cobertura, e foi assim que ele
   * passou despercebido até o F0.3d.
   *
   * Para exercitá-lo é preciso desligar a tempestade e montar a pool que ele
   * existe para cobrir: Normal puro contra Fantasma puro, que não se tocam.
   * ------------------------------------------------------------------ */
  s.teste('L-016 · o corte duro de tempo encerra a batalha e escolhe um vencedor', () => {
    const stormOrig = E.CONF.STORM_FROM;
    try {
      E.CONF.STORM_FROM = 9999;          // desliga a tempestade

      /* O elenco de Kanto NÃO produz empate: o único Fantasma é Gengar, que é
         Fantasma/Venenoso, e os golpes Venenosos atingem Normal normalmente.
         Então o cenário que o corte existe para cobrir precisa ser CONSTRUÍDO:
         Normal puro com golpe Normal contra Fantasma puro com golpe Fantasma.
         Nenhum dos dois toca o outro, e nada mais encerra a batalha. */
      const f = E.montarElenco(E.elenco.slice(0, 2));
      const golpe = (t) => ({ n:`teste ${t}`, t, p:100, cat:'fis', fx:'melee', acc:1 });
      f[0].types = ['normal']; f[0].moves = [golpe('normal')];
      f[1].types = ['ghost'];  f[1].moves = [golpe('ghost')];
      ok(E.efeito('normal', f[1].types) === 0 && E.efeito('ghost', f[0].types) === 0,
        'a imunidade mútua do cenário deixou de valer — a tabela de tipos mudou');

      let alcancou = 0;
      for (let i = 0; i < 200; i++) {
        const r = E.simular(f, 900000 + i, true);
        /* D-003 CORRIGIDO no F0.6. Esta asserção afirmava o defeito de
           propósito — "a duração PASSA do corte" — para ficar vermelha no dia
           em que alguém o endurecesse. Ficou, e virou a invariante que a Spec
           §4.6 sempre pediu: nenhuma batalha excede o corte. Ponto.

           A igualdade é esperada e não é caso de borda: quando a ação seguinte
           cai depois do corte, ela é descartada e a batalha encerra em
           MAX_TIME exatos. */
        ok(r.duration <= E.CONF.MAX_TIME,
          `a batalha durou ${r.duration.toFixed(2)}s, além do corte de ${E.CONF.MAX_TIME}s — ` +
          `D-003 regrediu`);
        ok(r.duration === E.CONF.MAX_TIME,
          `a batalha parou em ${r.duration.toFixed(2)}s; neste cenário nada além do corte a encerra, ` +
          `então ela deveria parar exatamente em ${E.CONF.MAX_TIME}s`);
        ok(r.winner >= 0, `corte de tempo devolveu ${r.winner} em vez de um vencedor`);
        alcancou++;
      }
      ok(alcancou > 0,
        'nenhuma das 200 batalhas alcançou o corte — a pool escolhida não exercita o caminho');
    } finally {
      E.CONF.STORM_FROM = stormOrig;
    }
  });

  s.teste('L-016 · com a tempestade ligada, o corte duro nunca é alcançado', () => {
    /* O outro lado da mesma verdade, e é o que documenta por que o caminho
       acima precisa de um cenário artificial. Se um dia isto ficar vermelho,
       a tempestade deixou de garantir o término e o corte virou o mecanismo
       real de encerramento — o que mudaria a distribuição de duração. */
    const f = elencoDeterministico(E.elenco, E.montarElenco, 77);
    let perto = 0;
    for (let i = 0; i < 500; i++)
      if (E.simular(f, 950000 + i, true).duration >= E.CONF.MAX_TIME - 2) perto++;
    ok(perto === 0,
      `${perto} de 500 rodadas chegaram perto do corte duro — a tempestade parou de encerrar antes`);
  });

  return s;
}
