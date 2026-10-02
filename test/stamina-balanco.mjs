/* Q1/Q4 · A STAMINA A 30/H, EQUILIBRADA NO VALOR DA RUN (DEC-29, DEC-29d)
 *
 * O dono pediu a stamina a 30/h (DEC-29) e que o XP e a moeda "no geral não
 * mudassem tanto". As duas primeiras tentativas cortavam por posição da run no
 * dia (DEC-29b: metade do XP depois da 24ª; DEC-29c: 60% depois de 3 por
 * criatura), e ele recusou as duas: "não deve limitar, zerar XP de quem tá
 * jogando, deve equilibrar pra no geral não mudar tanto".
 *
 * Fica: TODA run paga um pouco menos (XP 88%, moeda e Essência 96%), e
 * nenhuma paga menos por ser a 30ª. A medida é a de quem joga H horas
 * seguidas, começando com as barras cheias, dois em campo (um, se o time é de
 * um): a mesma simulação a 20/h com as regras antigas e a 30/h com as de hoje,
 * derivada do motor — e não dos perfis literais da emissão (D-151).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { REGEN_POR_HORA, STAMINA_MAX } from '../engine/expedicao.mjs';
import { STAMINA_DO_AVANCO, fatorDoRendimento, falaDoRendimento, XP_DA_RUN, MOEDA_DA_RUN,
         QUEDA_POR_RUN, PISO_DO_RENDIMENTO, RUNS_CHEIAS, MOEDA_DOS_VISTOS_NO_TETO } from '../engine/avanco.mjs';
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
/* AS REGRAS DA MOEDA, EXPLÍCITAS (DEC-31): cada momento medido carrega as
   suas, para que mudar a de hoje não reescreva a de ontem.
     Q, P   a queda do dia (por run além das cheias) e o piso
     M      o valor de toda run
     p      quanto dos encontros vistos a run paga DEPOIS do teto
   O teto: 30 encontros, 5 por run — as 6 primeiras runs têm encontros. A run
   depois do teto vale A (os abates) + (1 − A)·p de uma cheia; A = 0,162,
   medido (406 → 66 moedas, 120 runs da Floresta, ST-2.28c). */
const A_DOS_ABATES = 0.162, RUNS_COM_ENCONTROS = 6;
const ANTES = { regen: 20, Q: 0.75, P: 0.05, M: 1, p: 0, xp: 1 };        // DEC-14, 20/h
const DEC29D = { regen: 30, Q: 0.75, P: 0.05, M: 0.96, p: 0, xp: 0.88 }; // o dia que o 6º relato jogou
const HOJE = { regen: REGEN_POR_HORA, Q: QUEDA_POR_RUN, P: PISO_DO_RENDIMENTO, M: MOEDA_DA_RUN, p: MOEDA_DOS_VISTOS_NO_TETO, xp: XP_DA_RUN };
const valorDaRun = (r, i) => r.M * Math.max(r.P, r.Q ** Math.max(0, i - RUNS_CHEIAS)) *
  (i <= RUNS_COM_ENCONTROS ? 1 : A_DOS_ABATES + (1 - A_DOS_ABATES) * r.p);
/* O dia: XP em criatura-runs, moeda em runs-cheias. */
function dia(time, H, regras) {
  const n = runsEm(regras.regen, time, H), campo = Math.min(2, time);
  let moeda = 0;
  for (let i = 1; i <= n; i++) moeda += valorDaRun(regras, i);
  return { n, xp: n * campo * regras.xp, moeda };
}
const CASOS = [1, 2, 3, 6].flatMap(time => [0.5, 1, 2, 3, 5, 8].map(H => [time, H]));
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

export function suite() {
  const s = criarSuite('stamina-balanco');

  s.teste('DEC-29d · no geral não muda: XP e moeda médios do dia ficam onde estavam em 20/h', () => {
    igual(REGEN_POR_HORA, 30, 'a medição supõe a DEC-29');
    const rx = [], rm = [];
    for (const [time, H] of CASOS) {
      const a = dia(time, H, ANTES), h = dia(time, H, HOJE);
      ok(h.n >= a.n, `time de ${time}, ${H} h: a stamina mais rápida tirou runs (${a.n} → ${h.n})`);
      rx.push(h.xp / a.xp); rm.push(h.moeda / a.moeda);
    }
    ok(Math.abs(media(rx) - 1) <= 0.03, `o XP médio do dia mudou ${((media(rx) - 1) * 100).toFixed(1)}%`);
    /* ±5% na moeda (DEC-31): com o TETO modelado, a própria DEC-29d já
       ficava 4% abaixo de 20/h — as runs a mais caíam depois do teto. */
    ok(Math.abs(media(rm) - 1) <= 0.05, `a moeda média do dia mudou ${((media(rm) - 1) * 100).toFixed(1)}%`);
    /* DEC-31: a moeda de toda run desceu a 84% para a run tardia deixar de
       despencar — quem joga pouco perde até 20%, e o dia médio fica igual. */
    ok(Math.min(...rx) >= 0.85 && Math.min(...rm) >= 0.8, `alguém perdeu demais (XP ${(Math.min(...rx) * 100).toFixed(0)}%, moeda ${(Math.min(...rm) * 100).toFixed(0)}%)`);
    ok(Math.max(...rx) <= 1.2 && Math.max(...rm) <= 1.2, `alguém ganhou mais de 20% (XP ${(Math.max(...rx) * 100).toFixed(0)}%, moeda ${(Math.max(...rm) * 100).toFixed(0)}%)`);
  });

  s.teste('não limita quem está jogando: a 30ª run do dia paga o mesmo XP que a 1ª', () => {
    const T0 = Date.UTC(2026, 9, 2, 15);
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    const eq = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 12 })];
    let run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz: 'balanco', agora: T0 });
    for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
    const cria = { id: 'a', dex: 1, nivel: 12, xp: xpParaNivel(12), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy',
                   naCaixa: false, criadaEm: 1, stamina: 100, staminaEm: T0, vinculo: 3 };
    const feitas = q => Array.from({ length: q }, (_, i) => ({ colhidaEm: T0 - 60_000 * (i + 1) }));
    const conta = q => contaDaRun(PACK, { run, criaturas: [cria], motor: eq, avancos: feitas(q), raiz: 'r', agora: run.fim.em });
    const primeira = conta(0).rendeu.xp;
    ok(primeira > 0, 'a run de prova não rendeu XP');
    for (const q of [6, 9, 18, 29, 60]) igual(conta(q).rendeu.xp, primeira, `a ${q + 1}ª run do dia pagou outro XP — o XP voltou a ter limite`);
  });

  s.teste('a conta da run aplica o valor equilibrado, e a tela não fala de corte de XP', () => {
    const fonte = readFileSync(new URL('../app/modules/avanco-conta.mjs', import.meta.url), 'utf8');
    ok(/ganhoCru\.xp \* XP_DA_RUN/.test(fonte), 'a colheita não aplica o XP equilibrado');
    ok(/fatorDoRendimento\(naJanela\) \* MOEDA_DA_RUN/.test(fonte), 'a colheita não aplica a moeda equilibrada');
    ok(XP_DA_RUN < 1 && XP_DA_RUN >= 0.8 && MOEDA_DA_RUN < 0.9 && MOEDA_DA_RUN >= 0.78, 'o equilíbrio saiu da faixa medida');
    for (const n of [7, 25, 60]) ok(!/XP/.test(falaDoRendimento(n) ?? ''), `a frase da ${n}ª run fala de XP, que não tem corte`);
  });

  /* ── DEC-31 · A MOEDA QUE NÃO DESPENCA (6º relato) ────────────────────
     "+46, +30, +33 contra +317 e +436": depois do teto a run pagava só os
     abates (16%), e a queda do dia (0,75 por run) vinha por cima. */
  s.teste('DEC-31 · a run tardia paga 2,5× a 4× mais, e o dia médio fica onde estava', () => {
    const d29 = CASOS.map(([t, H]) => dia(t, H, DEC29D).moeda), hj = CASOS.map(([t, H]) => dia(t, H, HOJE).moeda);
    const razao = media(hj) / media(d29);
    ok(Math.abs(razao - 1) <= 0.03, `a moeda média do dia mudou ${((razao - 1) * 100).toFixed(1)}%`);
    for (const i of [7, 8, 9, 10])
      ok(valorDaRun(HOJE, i) >= 2.5 * valorDaRun(DEC29D, i), `a ${i}ª run paga ${(valorDaRun(HOJE, i) / valorDaRun(DEC29D, i)).toFixed(1)}× o de antes`);
    ok(valorDaRun(HOJE, 15) >= 5 * valorDaRun(DEC29D, 15), `a 15ª run ainda despenca (${valorDaRun(HOJE, 15).toFixed(3)} de uma cheia)`);
    for (const [t, H] of [[3, 1], [3, 3], [3, 8], [6, 8]]) {
      const r = dia(t, H, HOJE).moeda / dia(t, H, DEC29D).moeda;
      ok(r >= 0.8 && r <= 1.35, `time de ${t}, ${H} h: a moeda do dia virou ${(r * 100).toFixed(0)}% — fora da faixa`);
    }
  });

  s.teste('DEC-31 · a run depois do teto paga parte dos encontros vistos — e não só os abates', () => {
    const T0 = Date.UTC(2026, 9, 2, 15);
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    const eq = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 12 })];
    const cria = { id: 'a', dex: 1, nivel: 12, xp: xpParaNivel(12), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy',
                   naCaixa: false, criadaEm: 1, stamina: 100, staminaEm: T0, vinculo: 3 };
    let com = 0, sem = 0;
    for (let k = 0; k < 12; k++) for (const semEncontros of [false, true]) {
      let run = { ...novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz: `teto-${k}`, agora: T0 }), semEncontros };
      for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 20_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
      const m = contaDaRun(PACK, { run, criaturas: [cria], motor: eq, avancos: [], raiz: `r${k}`, agora: run.fim.em }).rendeu.moedas;
      if (semEncontros) sem += m; else com += m;
    }
    const r = sem / com;
    ok(r >= 0.35 && r <= 0.6, `a run com o teto batido paga ${(r * 100).toFixed(0)}% de uma com encontros (antes: 16%)`);
  });

  return s;
}
