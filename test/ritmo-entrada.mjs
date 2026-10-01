/* Q1/Q3 · O RELÓGIO DA ENTRADA E DA DERROTA (ST-2.21)
 *
 * O dono, jogando como quem chega: "cada wave levou de 1 a 1,5 minuto mesmo na
 * velocidade máxima, e as primeiras falharam várias vezes — não consegui
 * chegar ao chefe da wave 10". A dificuldade da porta é decisão dele (§Q4, o
 * teste da `wave`): ela não muda. Muda o tempo — no estágio 1 a wave anda a
 * 70%, e a wave perdida acaba em 60% do tempo dela.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { passoDaWave, RITMO_DA_ENTRADA, RITMO_DA_DERROTA, RITMO_TETO } from '../engine/wave.mjs';
import { DURACAO_MAX_MS } from '../engine/roteiro-wave.mjs';
import { novaRun, avancarRun, waveAtual } from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor } from '../app/modules/avanco-conta.mjs';

const T0 = Date.UTC(2026, 9, 1, 12);
const inicial = nivel => [paraOMotor(PACK, { id: 'c1', dex: PACK.iniciais[0], nivel })];

export function suite() {
  const s = criarSuite('ritmo-entrada');

  s.teste('o passo: a porta anda a 70%, a derrota acaba em 60%, e o resto como antes', () => {
    igual(RITMO_DA_ENTRADA, 0.7, 'o ritmo da entrada');
    igual(RITMO_DA_DERROTA, 0.6, 'o ritmo da derrota');
    igual(passoDaWave({ venceu: true, estagio: 1 }), 0.7, 'vitória no estágio 1');
    ok(Math.abs(passoDaWave({ venceu: false, estagio: 1 }) - 0.42) < 1e-9, 'derrota no estágio 1');
    igual(passoDaWave({ venceu: true, estagio: 2 }), 1, 'vitória no estágio 2');
    igual(passoDaWave({ venceu: false, estagio: 3 }), 0.6, 'derrota no estágio 3');
  });

  s.teste('a wave do estágio 1 cabe no teto novo, e a perdida no dela', () => {
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    let vistas = { venceu: 0, perdeu: 0 };
    for (let k = 0; k < 60; k++) {
      const run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['c1'], raiz: `rit-${k}`, agora: T0 });
      const w = waveAtual(run, { elenco, equipe: inicial(1) });
      const teto = DURACAO_MAX_MS * RITMO_TETO * RITMO_DA_ENTRADA * (w.venceu ? 1 : RITMO_DA_DERROTA) + 1000;
      ok(w.roteiro.duracao <= teto, `wave ${w.venceu ? 'vencida' : 'perdida'} de ${w.roteiro.duracao} ms, acima de ${teto}`);
      vistas[w.venceu ? 'venceu' : 'perdeu']++;
    }
    ok(vistas.venceu > 0 && vistas.perdeu > 0, `a amostra não teve os dois desfechos: ${JSON.stringify(vistas)}`);
  });

  s.teste('o caso do dono: a run da Floresta com o inicial no nível 1 cabe em ~8 min', () => {
    const elenco = elencoDoEstagio(PACK, 'floresta', 1);
    const tempos = [];
    for (let k = 0; k < 30; k++) {
      let run = novaRun({ bioma: 'floresta', estagio: 1, equipe: ['c1'], raiz: `dono-${k}`, agora: T0 });
      for (let t = T0; !run.fim && t < T0 + 3 * 3600_000; t += 30_000) run = avancarRun(run, { elenco, equipe: inicial(1), agora: t }).run;
      if (run.fim) tempos.push((run.fim.em - T0) / 60_000);
    }
    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    ok(tempos.length === 30, 'alguma run não terminou em 3 h');
    ok(media < 9, `a run média levou ${media.toFixed(1)} min — era ~16 antes da ST-2.21`);
  });

  return s;
}
