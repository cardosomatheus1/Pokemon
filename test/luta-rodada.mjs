/* Q1/Q3 · A LUTA QUE O SERVIDOR PAGA É A LUTA QUE O JOGADOR VÊ (D-119)
 *
 * O servidor simulava a rodada sem o clima; o cliente, com. Medido: em 771 de
 * 2.000 rodadas o campeão pago não era o campeão animado. A correção é UMA
 * função (`engine/luta-rodada.mjs`) chamada pelos dois lados; o teste confere
 * o resultado E que os dois lados de fato a chamam.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import { sementes } from '../engine/seed.mjs';
import { tiposDaPool } from '../engine/engine.mjs';
import { lutaDaRodada } from '../engine/luta-rodada.mjs';
import { criarScheduler } from '../server/scheduler.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

export function suite() {
  const s = criarSuite('luta-rodada');

  s.teste('D-119: em 400 rodadas, o campeão do servidor é o campeão da luta COM clima que o cliente anima', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const sched = criarScheduler({ db, sims: 20 });
    let mudou = 0;
    for (let k = 0; k < 400; k++) {
      const raiz = (k * 2654435761 >>> 0).toString(16).padStart(8, '0').repeat(4);
      const t = sementes(raiz);
      const pool = E.sortearPool(t.elenco);
      /* O caminho do CLIENTE, como `fases.mjs` o fazia antes da função comum:
         sortear o clima pela pool e aplicá-lo antes de simular. */
      const clima = E.sortearClima(t.ambiente, tiposDaPool(pool));
      const cliente = E.simular(E.aplicarClima(pool, clima), t.batalha, true);
      igual(sched.campeaoDaRaiz(raiz), pool[cliente.winner].dex, `rodada ${k}: o servidor paga um campeão que o jogador não viu vencer`);
      const semClima = E.simular(pool, t.batalha, true);
      if (semClima.winner !== cliente.winner) mudou++;
      const f = lutaDaRodada(E.M, { pool, ambiente: t.ambiente, batalha: t.batalha });
      igual(f.batalha.winner, cliente.winner, `rodada ${k}: a função comum não reproduz o cliente`);
    }
    ok(mudou > 40, `o clima quase não muda o campeão (${mudou}/400) — o teste não distinguiria o defeito`);
  });

  s.teste('os dois lados montam a luta pela MESMA função', () => {
    ok(/lutaDaRodada\(/.test(fonte('../server/scheduler.mjs')), 'o servidor não usa a luta comum');
    ok(/lutaDaRodada\(/.test(fonte('../app/modules/fases.mjs')), 'o cliente não usa a luta comum');
    ok(!/\bsimular\(/.test(fonte('../app/modules/fases.mjs')), 'o cliente ainda simula a rodada por conta própria');
    ok(!/M\.simular\(/.test(fonte('../server/scheduler.mjs')), 'o servidor ainda simula a rodada por conta própria');
  });

  return s;
}
