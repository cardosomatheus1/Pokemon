/* GOV · A CI NO GITHUB (ST-0.6, DEC-13).
 *
 * A DEC-13 decidiu: `npm test` a cada push, e o Q2 noturno NÃO — a suíte leva
 * ~2 min e responde "quebrei alguma coisa?"; o Q2 fatiado custaria horas de
 * Actions num repositório privado para responder o que o `sabotagem` local já
 * responde.
 *
 * A regra que este arquivo trava é a mesma do `npm run portoes`: **recorte não
 * fecha nada**. Uma CI que rodasse `--so`, `rapido` ou `--sem-navegador` ficaria
 * verde sem ter olhado — é o S109 com um selo do GitHub por cima, e o selo faz
 * o verde parecer mais confiável do que ele é. */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const ARQ = new URL('../.github/workflows/testes.yml', import.meta.url);

export function suite() {
  const s = criarSuite('ci');

  s.teste('a CI roda a suíte inteira a cada push, com navegador', () => {
    ok(existsSync(ARQ), 'sem .github/workflows/testes.yml — a DEC-13 pediu `npm test` a cada push');
    const y = readFileSync(ARQ, 'utf8');
    ok(/^\s*push:/m.test(y), 'o workflow não dispara no push');
    ok(/^\s*run:\s*npm test\s*$/m.test(y), 'o workflow não roda `npm test` — o que ele roda não é a suíte');
    /* POR JOB, e não no arquivo (S1112 escapou quando o job `ensaio` passou a
       ter a mesma linha): cada job que abre navegador aponta o próprio Chromium. */
    const jobs = (y.split(/^jobs:\s*$/m)[1] ?? '').split(/^  (?=[a-z]+:\s*$)/m).slice(1);
    ok(jobs.length >= 2, `esperava os jobs suite e ensaio; achei ${jobs.length}`);
    for (const j of jobs)
      ok(/PW_CHROME=/.test(j), `o job \`${j.split(':')[0]}\` não aponta o Chromium: ele pularia o navegador e ficaria verde sem abrir o jogo`);
    /* D-093 NA CI: sem guardar a base local entre execuções, todo runner novo
       a cria e nunca compara — "VERDE COM LACUNA" para sempre, medido na
       primeira execução no GitHub (25/09). */
    ok(/visual-base-local\.json/.test(y) && /actions\/cache/.test(y),
      'a CI não guarda a linha de base visual local: toda execução a recria e a comparação nunca acontece');
  });

  s.teste('a CI nunca roda um recorte', () => {
    const y = existsSync(ARQ) ? readFileSync(ARQ, 'utf8') : '';
    for (const recorte of ['--so', 'rapido', '--sem-navegador', 'SEM_GOLDEN', 'test:sem-golden'])
      ok(!y.includes(recorte),
        `o workflow usa \`${recorte}\` — recorte não fecha nada, e verde de recorte com selo do GitHub é o S109`);
  });

  /* ST-0.9: A SUÍTE VERDE NÃO SABIA QUE A APOSTA NÃO ERA PAGA (D-112). Quem
     achou foi o ENSAIO — um jogador de verdade, num navegador, contra o
     servidor inteiro. Ele passa a rodar a cada push, e reprova a CI. */
  s.teste('ST-0.9: a CI roda o ensaio do piloto contra o servidor de verdade', () => {
    const y = existsSync(ARQ) ? readFileSync(ARQ, 'utf8') : '';
    ok(/^\s{2}ensaio:\s*$/m.test(y), 'não há o job `ensaio` — o laço de um jogador não roda na CI');
    ok(/npm run servidor &/.test(y), 'o job não sobe o servidor');
    ok(/curl[^\n]*\/saude/.test(y), 'o job não espera o servidor responder antes do ensaio');
    ok(/node tools\/ensaio-piloto\.mjs http:\/\/127\.0\.0\.1:8080/.test(y), 'o job não roda o ensaio contra o servidor');
  });

  return s;
}
