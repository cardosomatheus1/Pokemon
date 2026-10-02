/* Q1/Q4 · A STAMINA MAIS RÁPIDA SEM INFLAR O DIA (DEC-29b)
 *
 * O dono pediu a stamina a 30/h (DEC-29) e, vendo o custo medido — o maratona
 * com +50% de XP e +14% de moeda —, completou: "você pode balancear na
 * XP/moeda em vez de subir tudo".
 *
 * O que fica: a VOLTA mais rápida (uma run a cada 46 min, a barra cheia em
 * 3 h 20). O que se balanceia: as runs A MAIS que ela cria, e só elas. As
 * primeiras do dia pagam inteiras — o casual, a sessão de 1 h e as três
 * visitas não perdem nada —, e o dia inteiro do maratona volta ao que era em
 * 20/h. A medição aqui é a conta do dia, derivada do motor (`REGEN_POR_HORA`),
 * e não dos perfis literais da emissão — que são o D-151.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { REGEN_POR_HORA } from '../engine/expedicao.mjs';
import { STAMINA_DO_AVANCO, RUNS_CHEIAS, fatorDoRendimento, falaDoRendimento,
         fatorDoXp, RUNS_XP_CHEIAS } from '../engine/avanco.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { novaRun, avancarRun } from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor, contaDaRun } from '../app/modules/avanco-conta.mjs';

/* O maratona em 20/h, com o piso antigo (0,05) e o XP sem queda — medido em
   02/10, antes da DEC-29: [runs por dia, moeda em runs-cheias, XP em
   criatura-runs], para 1, 2 e 3 em campo, seis criaturas. */
const EM_20 = { 1: [125, 14.28, 125], 2: [62, 11.13, 124], 3: [41, 10.08, 123] };
const soma = (n, f) => { let s = 0; for (let i = 1; i <= n; i++) s += f(i); return s; };
const runsDoDia = emCampo => Math.floor(6 * 24 * REGEN_POR_HORA / STAMINA_DO_AVANCO / emCampo);

export function suite() {
  const s = criarSuite('stamina-balanco');

  s.teste('quem joga pouco não perde nada: as primeiras runs do dia pagam inteiras, moeda e XP', () => {
    for (let n = 1; n <= RUNS_CHEIAS; n++) igual(fatorDoRendimento(n), 1, `a ${n}ª run perdeu moeda`);
    for (let n = 1; n <= RUNS_XP_CHEIAS; n++) igual(fatorDoXp(n), 1, `a ${n}ª run perdeu XP`);
    ok(RUNS_XP_CHEIAS >= 20, `o XP cai cedo demais (${RUNS_XP_CHEIAS}ª run): pega quem joga um dia normal`);
    ok(fatorDoXp(RUNS_XP_CHEIAS + 1) < 1 && fatorDoXp(RUNS_XP_CHEIAS + 1) > 0, 'depois do dia cheio, o XP não cai — ou zera');
  });

  s.teste('DEC-29b · o dia inteiro do maratona em 30/h fica onde estava em 20/h', () => {
    igual(REGEN_POR_HORA, 30, 'a medição supõe a DEC-29');
    for (const k of [1, 2, 3]) {
      const n = runsDoDia(k), [, moeda20, xp20] = EM_20[k];
      const moeda = soma(n, fatorDoRendimento), xp = soma(n, fatorDoXp) * k;
      ok(moeda <= moeda20 * 1.02, `${k} em campo: a moeda do maratona subiu ${moeda20} → ${moeda.toFixed(2)} runs-cheias`);
      ok(xp <= xp20 * 1.06, `${k} em campo: o XP do maratona subiu ${xp20} → ${xp.toFixed(0)}`);
      ok(moeda >= moeda20 * 0.9 && xp >= xp20 * 0.8, `${k} em campo: o balanço cortou demais (moeda ${moeda.toFixed(2)}, XP ${xp.toFixed(0)})`);
    }
  });

  s.teste('a conta da run aplica o XP do dia: a run depois do dia cheio paga metade', () => {
    const T0 = Date.UTC(2026, 9, 2, 15);
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    const eq = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 12 })];
    let run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz: 'balanco', agora: T0 });
    for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: eq, agora: t }).run;
    const cria = { id: 'a', dex: 1, nivel: 12, xp: xpParaNivel(12), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy',
                   naCaixa: false, criadaEm: 1, stamina: 100, staminaEm: T0, vinculo: 3 };
    const feitas = q => Array.from({ length: q }, (_, i) => ({ colhidaEm: T0 - 60_000 * (i + 1) }));
    const conta = q => contaDaRun(PACK, { run, criaturas: [cria], motor: eq, avancos: feitas(q), raiz: 'r', agora: run.fim.em });
    const cheia = conta(0).rendeu.xp, depois = conta(RUNS_XP_CHEIAS).rendeu.xp;
    ok(cheia > 0, 'a run de prova não rendeu XP');
    igual(conta(RUNS_XP_CHEIAS - 1).rendeu.xp, cheia, `a ${RUNS_XP_CHEIAS}ª run já perdeu XP`);
    igual(depois, Math.round(cheia * fatorDoXp(RUNS_XP_CHEIAS + 1)), 'a run depois do dia cheio não aplicou o fator do XP');
  });

  s.teste('a tela avisa antes: a frase do rendimento diz quando o XP também cai', () => {
    ok(!/XP/.test(falaDoRendimento(RUNS_CHEIAS + 1) ?? ''), 'a 7ª run já fala de XP, que ainda paga inteiro');
    ok(/metade do XP/.test(falaDoRendimento(RUNS_XP_CHEIAS + 1) ?? ''), 'depois do dia cheio, a tela não avisa que o XP caiu');
  });

  return s;
}
