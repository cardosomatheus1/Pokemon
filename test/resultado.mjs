/* Q1/Q3 · HONESTIDADE DO RESULTADO (F1.9, Spec §28.5).
 *
 * A exigência específica deste produto, e a Spec a escreve em negrito:
 *
 *     **Vitória exibida precisa ser vitória econômica.**
 *
 * O PokéArena tem troféu, confete, KillFeed e pódio — espetáculo bem
 * construído, e exatamente o mecanismo que produz PERDA DISFARÇADA DE GANHO. O
 * teste aqui é sobre a fronteira: onde a festa pode acontecer e onde não pode.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { resultadoDaAposta, retornoLiquidoEstimado, rotuloLiquido } from '../engine/resultado.mjs';

const fases = () => readFileSync(new URL('../app/modules/fases.mjs', import.meta.url).pathname, 'utf8');

export function suite() {
  const s = criarSuite('resultado');

  s.teste('retorno MENOR que a aposta não comemora', () => {
    const r = resultadoDaAposta({ aposta: 100, retorno: 60 });
    igual(r.comemora, false,
      'sessenta de retorno numa aposta de cem acionou a coreografia de vitória. ' +
      'É o exemplo que a própria Spec usa.');
    igual(r.liquido, -40, 'o líquido saiu errado');
    igual(r.desfecho, 'perda_parcial', `desfecho veio "${r.desfecho}"`);
  });

  s.teste('retorno IGUAL à aposta não comemora', () => {
    /* Não é hipótese: `floor(30 × 1,03)` devolve 30. Confete em empate é a
       mesma mentira em dose menor, e a Spec foi corrigida no mesmo commit para
       dizer isto com todas as letras. */
    const r = resultadoDaAposta({ aposta: 30, retorno: 30 });
    igual(r.comemora, false, 'comemorou o dinheiro de volta');
    igual(r.desfecho, 'devolvido', `desfecho veio "${r.desfecho}"`);
  });

  s.teste('retorno MAIOR que a aposta comemora, e essa é a única porta', () => {
    const r = resultadoDaAposta({ aposta: 100, retorno: 185 });
    igual(r.comemora, true, 'ganho de verdade não comemorou — o portão fechou demais');
    igual(r.liquido, 85, 'o líquido saiu errado');
  });

  s.teste('perda total é perda, e não perda parcial', () => {
    igual(resultadoDaAposta({ aposta: 100, retorno: 0 }).desfecho, 'perda',
      'zero de retorno virou perda parcial — são telas diferentes');
  });

  s.teste('o líquido vem antes do bruto no que a função devolve', () => {
    /* A ORDEM DAS CHAVES É O CONTRATO. "O valor exibido na tela de resultado é
       o líquido, com o bruto em segundo plano" — e quem escreve a próxima tela
       lê a primeira chave. */
    igual(Object.keys(resultadoDaAposta({ aposta: 100, retorno: 185 }))[0], 'liquido',
      'a primeira chave não é o líquido');
  });

  s.teste('o rótulo do líquido traz o sinal', () => {
    igual(rotuloLiquido(85), '+85', 'ganho sem sinal');
    igual(rotuloLiquido(-40), '−40', 'perda sem sinal — "40" e "−40" ocupam o mesmo lugar na tela');
    igual(rotuloLiquido(0), '0', 'empate ganhou sinal');
  });

  s.teste('o retorno estimado da tela de odds é LÍQUIDO e usa a mesma conta do settlement', () => {
    /* §28.7: "exibir odd sem exibir, no mesmo lugar, o valor de retorno
       líquido". E o `floor` é o mesmo do settlement: duas contas para o mesmo
       número é como a tela prometer 1.201 e a carteira pagar 1.200. */
    igual(retornoLiquidoEstimado(100, 1.85), Math.floor(100 * 1.85) - 100, 'a conta divergiu');
    igual(retornoLiquidoEstimado(30, 1.03), 0,
      'odd baixa com aposta pequena devolveu retorno líquido diferente de zero');
  });

  s.teste('entrada inválida é recusada', () => {
    for (const mau of [{ aposta: 0, retorno: 10 }, { aposta: -1, retorno: 10 },
                       { aposta: 1.5, retorno: 10 }, { aposta: 100, retorno: -1 },
                       { aposta: 100, retorno: NaN }]) {
      let e = null;
      try { resultadoDaAposta(mau); } catch (x) { e = x; }
      ok(e, `${JSON.stringify(mau)} foi aceito`);
    }
  });

  /* --- A TELA USA A FUNÇÃO, e não uma cópia da regra -------------------- */

  s.teste('a tela de resultado decide a festa pela função, não por "acertei o campeão"', () => {
    const src = fases();
    ok(/resultadoDaAposta/.test(src),
      'a tela de resultado não chama `resultadoDaAposta`. Uma regra reimplementada ' +
      'na tela é uma regra que a PRÓXIMA tela vai reimplementar de outro jeito.');
    ok(/comemora/.test(src),
      'a tela não consulta `comemora` — se ela pergunta "acertei o campeão?", ' +
      'volta a comemorar retorno menor que a aposta');
  });

  s.teste('o confete não é disparado fora do caminho que consulta `comemora`', () => {
    const src = fases();
    /* A DECLARAÇÃO NÃO É CHAMADA: `function dropConfetti(` casaria e o teste
       reprovaria a própria definição. */
    for (const m of src.matchAll(/(?<!function )dropConfetti\(/g)) {
      const antes = src.slice(Math.max(0, m.index - 900), m.index);
      ok(/comemora/.test(antes),
        'há um `dropConfetti` sem `comemora` no caminho até ele. O confete é a ' +
        'coreografia de vitória inteira num nome só, e ele não pode ter dois donos.');
    }
  });

  return s;
}
