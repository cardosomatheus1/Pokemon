/* A PROVENIÊNCIA DOS ATIVOS (ST-14.0C · E14 · spec E14 §4.3) — camada 0.
 *
 * Todo item, doce e criatura tem uma CLASSE de origem, e ela decide se ele
 * pode ir para a troca entre jogadores. As classes, da mais livre para a mais
 * presa:
 *
 *   verified_earned     ganho no jogo, com o evento que o criou no servidor
 *   p2p_verified        recebido de outro jogador, numa troca liquidada
 *   promotional_bound   veio de bônus ou promoção — preso à conta
 *   admin_review        concedido à mão, esperando revisão
 *   legacy_unverified   já estava lá antes da E14, sem prova de origem
 *   test_only           de teste — nunca sai do teste
 *
 * O DERIVADO HERDA A MAIS PRESA do que o gerou (bola → captura, pedra →
 * evolução, moeda → item comprado). Sem isso, gastar um insumo preso numa
 * coisa nova lavaria a origem — o "insumo promocional → ativo negociável" que
 * a tabela de regressão da ST-14.0B proíbe.
 */
export const CLASSES = Object.freeze(['verified_earned', 'p2p_verified', 'promotional_bound', 'admin_review', 'legacy_unverified', 'test_only']);
const PESO = Object.freeze({ verified_earned: 0, p2p_verified: 0, promotional_bound: 2, admin_review: 3, legacy_unverified: 4, test_only: 5 });

export const classeValida = c => CLASSES.includes(c);

/* A mais presa de uma lista; sem insumo nenhum, o derivado nasceu do jogo. */
export function maisRestrita(classes) {
  let pior = 'verified_earned';
  for (const c of classes ?? []) if (classeValida(c) && PESO[c] > PESO[pior]) pior = c;
  return pior;
}

/* Pela ORIGEM, só o que foi ganho no jogo ou recebido numa troca liquidada
   negocia. A regra inteira (tipo, conta, cooldown, reserva) é a ST-14.5. */
export const negociavelPelaOrigem = c => c === 'verified_earned' || c === 'p2p_verified';
