/* AS BANDEIRAS DA LINHA DE COMANDO, COMO DECISÃO PURA (camada 0).
 *
 * Um arquivo só para uma função de três linhas parece exagero até se ler o
 * D-059, que é a razão de ele existir.
 *
 * ── O DEFEITO QUE ORIGINOU ISTO ──────────────────────────────────────────
 *
 * A decisão "esta execução precisa de Chromium?" morava solta no meio do
 * `run.mjs`, entre a montagem das suítes e a filtragem delas:
 *
 *     const precisaNavegador = !SO || SO.some(n => COM_NAVEGADOR.includes(n));
 *
 * Ela consultava `--so` e esquecia `--sem-navegador`. Resultado: `npm run
 * rapido` subia os CINCO Chromium e, trinta e sete linhas depois, removia do
 * resultado toda suíte que precisaria deles. Cinco navegadores sobiam, mediam,
 * e ninguém lia. **3 min 30 s por execução, onde o `CLAUDE.md` documentava 7 s.**
 *
 * O defeito não tinha sintoma: a suíte ficava verde, com a contagem certa. Só o
 * relógio sabia — e ninguém olha o relógio de um comando chamado `rapido`.
 *
 * ── POR QUE VIRAR MÓDULO, E NÃO SÓ CORRIGIR A LINHA ──────────────────────
 *
 * Porque a linha corrigida no lugar continuaria sem teste. `run.mjs` é o ponto
 * de entrada: importá-lo de uma suíte executa a suíte inteira, e a única outra
 * forma de observar a decisão de fora seria cronometrar — que é medir o efeito
 * e não a regra, e devolveria um teste lento e instável.
 *
 * Extraída, ela vira tabela-verdade: quatro casos, microssegundos, e um defeito
 * plantado que a devolve à forma antiga fica VERMELHO na hora.
 *
 * É a mesma correção que `caixas.mjs` recebeu pela mesma razão, e o comentário
 * de lá diz igual: a regra é pequena e determinística; num módulo ela se testa
 * em milissegundos.
 */

/* Precisa subir Chromium?
 *
 *   semNavegador   a bandeira é uma RECUSA, e recusa vence tudo. Ela existe
 *                  exatamente para não pagar navegador; se ela não puder
 *                  impedir a partida, ela não serve para nada.
 *   so             sem `--so`, roda tudo, e "tudo" inclui as que precisam.
 *                  Com `--so`, só se alguma das nomeadas estiver na lista.
 */
export function precisaNavegador({ so, semNavegador, comNavegador }) {
  if (semNavegador) return false;
  if (!so || !so.length) return true;
  return so.some(n => (comNavegador ?? []).includes(n));
}
