/* Q1/Q4 · A STAMINA MAIS RÁPIDA SEM INFLAR O DIA (DEC-29, DEC-29c)
 *
 * O dono pediu a stamina a 30/h (DEC-29) e, vendo o custo medido, completou:
 * "sobe a stamina; o que isso gerou de XP e moeda, você diminui, pra
 * equilibrar, e o jogador ter mais tempo de jogo".
 *
 * A primeira tentativa (DEC-29b: XP pela metade depois da 24ª run) só pegava
 * quem joga o dia inteiro: medido por horas jogadas, quem jogava de 3 a 8 h
 * ainda saía com +13% a +33% de XP. A regra que fica é o DIA DO TIME: cada
 * run paga inteira até 3 por criatura do time (no mínimo 6) — que é onde a
 * stamina a 20/h parava quem joga até 2 h —, e 60% depois, em XP, moeda e
 * Essência.
 *
 * A medida é a de quem joga H horas seguidas, começando com as barras cheias,
 * dois em campo (um, se o time é de um): a mesma simulação para 20/h com as
 * regras antigas e para 30/h com as de hoje. Derivada do motor
 * (`REGEN_POR_HORA`, `STAMINA_DO_AVANCO`), e não dos perfis literais da
 * emissão — que são o D-151.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { REGEN_POR_HORA, STAMINA_MAX } from '../engine/expedicao.mjs';
import { STAMINA_DO_AVANCO, RUNS_CHEIAS, QUEDA_POR_RUN, fatorDoRendimento, falaDoRendimento,
         fatorDoDia, limiarDoDia, FATOR_ALEM_DO_DIA } from '../engine/avanco.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { novaRun, avancarRun } from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor, contaDaRun } from '../app/modules/avanco-conta.mjs';

const RUN_H = 5.4 / 60;   // a run medida na Floresta (ST-2.26, 02/10)
const C = STAMINA_DO_AVANCO;

/* Quantas runs cabem em H horas seguidas, com `regen` por hora. */
function runsEm(regen, time, H) {
  const campo = Math.min(2, time);
  let st = Array(time).fill(STAMINA_MAX), t = 0, n = 0;
  const encher = dt => { st = st.map(v => Math.min(STAMINA_MAX, v + regen * dt)); };
  while (t < H - 1e-9) {
    const ord = st.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
    const ultimo = ord[campo - 1][0];
    if (ultimo >= C) { for (let j = 0; j < campo; j++) st[ord[j][1]] -= C; n++; t += RUN_H; encher(RUN_H); }
    else { const falta = (C - ultimo) / regen; t += falta; encher(falta); }
  }
  return n;
}
/* As regras de antes da DEC-29: 20/h, piso de 5%, XP sem dia. */
const moedaAntes = n => Math.max(0.05, QUEDA_POR_RUN ** Math.max(0, n - 6));
function dia(time, H, hoje) {
  const n = runsEm(hoje ? REGEN_POR_HORA : 20, time, H), campo = Math.min(2, time);
  let xp = 0, moeda = 0;
  for (let i = 1; i <= n; i++) {
    xp += (hoje ? fatorDoDia(i, time) : 1) * campo;
    moeda += hoje ? fatorDoRendimento(i) * fatorDoDia(i, time) : moedaAntes(i);
  }
  return { n, xp, moeda };
}
const TIMES = [1, 2, 3, 6];

export function suite() {
  const s = criarSuite('stamina-balanco');

  s.teste('quem joga até 2 h não perde nada, com qualquer time: XP e moeda iguais aos de 20/h', () => {
    igual(REGEN_POR_HORA, 30, 'a medição supõe a DEC-29');
    for (const time of TIMES) for (const H of [0.5, 1, 2]) {
      const a = dia(time, H, false), h = dia(time, H, true);
      ok(h.xp >= a.xp * 0.999, `time de ${time}, ${H} h: o XP caiu ${a.xp} → ${h.xp.toFixed(1)} — o balanço pegou quem não ganhou nada com a stamina`);
      ok(h.moeda >= a.moeda * 0.999, `time de ${time}, ${H} h: a moeda caiu ${a.moeda.toFixed(2)} → ${h.moeda.toFixed(2)}`);
    }
  });

  s.teste('DEC-29c · o que a stamina a 30/h gerou é tirado: o dia de quem joga mais fica onde estava', () => {
    for (const time of TIMES) for (const H of [3, 5, 8, 16]) {
      const a = dia(time, H, false), h = dia(time, H, true);
      const rx = h.xp / a.xp, rm = h.moeda / a.moeda;
      ok(h.n >= a.n, `time de ${time}, ${H} h: a stamina mais rápida não deu mais tempo de jogo (${a.n} → ${h.n} runs)`);
      ok(rx <= 1.21, `time de ${time}, ${H} h: o XP subiu ${(rx * 100 - 100).toFixed(0)}%`);
      ok(rm <= 1.15, `time de ${time}, ${H} h: a moeda subiu ${(rm * 100 - 100).toFixed(0)}%`);
      if (H >= 5) ok(rx <= 1.06 && rm <= 1.03, `time de ${time}, ${H} h: o dia longo ainda rende a mais (XP ${(rx * 100).toFixed(0)}%, moeda ${(rm * 100).toFixed(0)}%)`);
      ok(rx >= 0.85 && rm >= 0.85, `time de ${time}, ${H} h: o balanço cortou demais (XP ${(rx * 100).toFixed(0)}%, moeda ${(rm * 100).toFixed(0)}%)`);
    }
  });

  s.teste('o dia do time: 3 runs por criatura, no mínimo as 6 que já pagavam inteiras', () => {
    igual(limiarDoDia(1), RUNS_CHEIAS, 'o time de um perdeu as runs cheias');
    igual(limiarDoDia(3), 9, 'o dia do time de três');
    igual(limiarDoDia(6), 18, 'o dia do time de seis');
    for (const time of TIMES) {
      igual(fatorDoDia(limiarDoDia(time), time), 1, `time de ${time}: a última run do dia já foi cortada`);
      igual(fatorDoDia(limiarDoDia(time) + 1, time), FATOR_ALEM_DO_DIA, `time de ${time}: a run além do dia não foi cortada`);
    }
    ok(FATOR_ALEM_DO_DIA > 0 && FATOR_ALEM_DO_DIA < 1, 'a run além do dia paga nada — ou tudo');
  });

  s.teste('a conta da run aplica o dia do time ao XP e à moeda, com o banco contando no time', () => {
    const T0 = Date.UTC(2026, 9, 2, 15);
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    const eq = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 12 })];
    let run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz: 'balanco', agora: T0 });
    for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
    const cria = id => ({ id, dex: 1, nivel: 12, xp: xpParaNivel(12), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy',
                          naCaixa: false, criadaEm: 1, stamina: 100, staminaEm: T0, vinculo: 3 });
    const feitas = q => Array.from({ length: q }, (_, i) => ({ colhidaEm: T0 - 60_000 * (i + 1) }));
    const conta = (q, banco = []) => contaDaRun(PACK, { run, criaturas: [cria('a')], banco, motor: eq, avancos: feitas(q), raiz: 'r', agora: run.fim.em });
    const cheia = conta(0).rendeu.xp;
    ok(cheia > 0, 'a run de prova não rendeu XP');
    igual(conta(RUNS_CHEIAS - 1).rendeu.xp, cheia, 'a 6ª run de um time de um já perdeu XP');
    igual(conta(RUNS_CHEIAS).rendeu.xp, Math.round(cheia * FATOR_ALEM_DO_DIA), 'a 7ª run de um time de um não aplicou o dia do time');
    const banco = [cria('k'), cria('b')];
    igual(conta(RUNS_CHEIAS, banco).rendeu.xp, cheia, 'com três no time, a 7ª run já foi cortada — o banco não contou no time');
    igual(conta(9, banco).rendeu.xp, Math.round(cheia * FATOR_ALEM_DO_DIA), 'com três no time, a 10ª run não foi cortada');
  });

  s.teste('a tela avisa antes: a frase diz quando o XP também cai, pelo time de quem joga', () => {
    ok(!/XP/.test(falaDoRendimento(RUNS_CHEIAS + 1, 3) ?? ''), 'com três no time, a 7ª run já fala de XP, que ainda paga inteiro');
    ok(/60% do XP/.test(falaDoRendimento(10, 3) ?? ''), 'além do dia do time, a tela não avisa que o XP caiu');
    ok(/falaDoRendimento\(runsNoDia\([^)]*\) \+ 1, /.test(readFileSync(new URL('../app/modules/avanco-tela.mjs', import.meta.url), 'utf8')),
      'a tela da run não passa o tamanho do time para a frase');
  });

  return s;
}

import { readFileSync } from 'node:fs';
