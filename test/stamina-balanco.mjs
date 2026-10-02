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
import { STAMINA_DO_AVANCO, fatorDoRendimento, falaDoRendimento, XP_DA_RUN, MOEDA_DA_RUN } from '../engine/avanco.mjs';
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
/* O dia: XP em criatura-runs, moeda em runs-cheias (o rendimento decrescente
   da DEC-14 vale nos dois lados — ele é de antes e fica). */
function dia(time, H, hoje) {
  const n = runsEm(hoje ? REGEN_POR_HORA : 20, time, H), campo = Math.min(2, time);
  let moeda = 0;
  for (let i = 1; i <= n; i++) moeda += fatorDoRendimento(i) * (hoje ? MOEDA_DA_RUN : 1);
  return { n, xp: n * campo * (hoje ? XP_DA_RUN : 1), moeda };
}
const CASOS = [1, 2, 3, 6].flatMap(time => [0.5, 1, 2, 3, 5, 8].map(H => [time, H]));
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

export function suite() {
  const s = criarSuite('stamina-balanco');

  s.teste('DEC-29d · no geral não muda: XP e moeda médios do dia ficam onde estavam em 20/h', () => {
    igual(REGEN_POR_HORA, 30, 'a medição supõe a DEC-29');
    const rx = [], rm = [];
    for (const [time, H] of CASOS) {
      const a = dia(time, H, false), h = dia(time, H, true);
      ok(h.n >= a.n, `time de ${time}, ${H} h: a stamina mais rápida tirou runs (${a.n} → ${h.n})`);
      rx.push(h.xp / a.xp); rm.push(h.moeda / a.moeda);
    }
    ok(Math.abs(media(rx) - 1) <= 0.03, `o XP médio do dia mudou ${((media(rx) - 1) * 100).toFixed(1)}%`);
    ok(Math.abs(media(rm) - 1) <= 0.03, `a moeda média do dia mudou ${((media(rm) - 1) * 100).toFixed(1)}%`);
    ok(Math.min(...rx) >= 0.85 && Math.min(...rm) >= 0.85, `alguém perdeu mais de 15% (XP ${(Math.min(...rx) * 100).toFixed(0)}%, moeda ${(Math.min(...rm) * 100).toFixed(0)}%)`);
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
    ok(XP_DA_RUN < 1 && XP_DA_RUN >= 0.8 && MOEDA_DA_RUN < 1 && MOEDA_DA_RUN >= 0.9, 'o equilíbrio saiu da faixa medida');
    for (const n of [7, 25, 60]) ok(!/XP/.test(falaDoRendimento(n) ?? ''), `a frase da ${n}ª run fala de XP, que não tem corte`);
  });

  return s;
}
