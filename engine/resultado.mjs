/* HONESTIDADE DO RESULTADO (§28.5) — o que a tela pode comemorar.
 *
 * Fronteira: recebe aposta e retorno, devolve o que mostrar e se cabe festa.
 * Puro, sem DOM, sem tema, sem moeda. Fica no motor e não na tela porque a
 * regra é do PRODUTO, e tela nova não pode reimplementá-la por conta.
 *
 * ── POR QUE ISTO É UM ARQUIVO, E NÃO UM `if` NA TELA ───────────────────────
 *
 * A Spec §28.5 tem uma exigência específica deste produto:
 *
 *     "Vitória exibida precisa ser vitória econômica."
 *
 * O PokéArena tem tela de campeão, confete, troféu, KillFeed e pódio. É
 * espetáculo bem construído — e é exatamente o mecanismo que, em jogos de
 * aposta, produz PERDA DISFARÇADA DE GANHO: o jogador recebe 60 de retorno numa
 * aposta de 100 e a tela comemora.
 *
 * Um `if` na tela de resultado resolveria a tela de resultado. Há três outras
 * superfícies com a mesma pergunta — o KillFeed, o histórico do perfil e a
 * carteira — e a quarta ainda vai ser escrita. Uma função é o que faz a
 * quarta nascer certa.
 *
 * ── A FRONTEIRA É `> 0`, E NÃO `>= 0` ──────────────────────────────────────
 *
 * A Spec escreve "retorno menor que o valor apostado nunca aciona a coreografia
 * de vitória". Retorno IGUAL à aposta não é menor — e também não é ganho: é o
 * dinheiro de volta. Confete em empate é a mesma mentira em dose menor, e o
 * caso não é hipotético: `floor(aposta × odd)` com odd de 1,03 e aposta de 30
 * devolve exatamente 30.
 *
 * A Spec foi corrigida no mesmo commit para dizer isto explicitamente.
 */

/* Os três desfechos possíveis. Nomes e não booleanos porque "ganhou" e
   "recebeu algo" são perguntas diferentes, e foi confundir as duas que criou a
   regra do §28.5. */
export const DESFECHOS = ['ganho', 'devolvido', 'perda_parcial', 'perda'];

export function resultadoDaAposta({ aposta, retorno }) {
  if (!Number.isInteger(aposta) || aposta <= 0)
    throw new Error(`aposta inválida: ${String(aposta)}`);
  if (!Number.isInteger(retorno) || retorno < 0)
    throw new Error(`retorno inválido: ${String(retorno)}`);

  const liquido = retorno - aposta;
  const desfecho = liquido > 0 ? 'ganho'
                 : liquido === 0 ? 'devolvido'
                 : retorno > 0 ? 'perda_parcial'
                 : 'perda';

  return {
    /* O LÍQUIDO PRIMEIRO, e é essa ordem que a tela deve seguir: "o valor
       exibido na tela de resultado é o líquido, com o bruto em segundo plano". */
    liquido,
    bruto: retorno,
    aposta,
    desfecho,
    /* A ÚNICA PERGUNTA QUE A COREOGRAFIA PODE FAZER. Se a tela perguntar
       "acertei o campeão?" em vez desta, ela volta a comemorar perda. */
    comemora: liquido > 0,
  };
}

/* O texto do valor em destaque, com sinal explícito. O sinal é o que faz um
   número ser lido como resultado e não como prêmio: "1.200" e "−300" ocupam o
   mesmo lugar na tela e dizem coisas opostas. */
export const rotuloLiquido = liquido =>
  `${liquido > 0 ? '+' : liquido < 0 ? '−' : ''}${Math.abs(liquido).toLocaleString('pt-BR')}`;

/* O retorno LÍQUIDO estimado de uma aposta, para a tela de odds (§28.7: "exibir
   odd sem exibir, no mesmo lugar, o valor de retorno líquido"). Mesma conta do
   settlement — `floor` incluído —, porque duas contas diferentes para o mesmo
   número é como a tela promete 1.201 e a carteira paga 1.200. */
export const retornoLiquidoEstimado = (aposta, odd) => Math.floor(aposta * odd) - aposta;
