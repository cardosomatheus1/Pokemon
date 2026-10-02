/* AS REGRAS DA COLEÇÃO — caixa, troca e soltar (ST-13.3a · E13 · L-210) — camada 0.
 *
 * Puro: entram as criaturas (cada uma com `naCaixa`) e a intenção; sai o
 * motivo da recusa, ou `null`. O aparelho (`idle-dados.mjs`, `doce-dados.mjs`)
 * e o servidor (`server/colecao.mjs`) perguntam aqui — a regra é uma só, e o
 * servidor não pode deixar o que o aparelho recusa, nem o contrário.
 *
 *   A EQUIPE ATIVA tem SEIS. Não é homenagem: é o número que faz a equipe ser
 *   uma ESCOLHA — com equipe infinita, capturar não custa nada.
 *   A CAIXA não tem teto: um teto de caixa faria da coleção um problema de
 *   logística.
 *   A EQUIPE NUNCA FICA VAZIA: sem ninguém ativo não há expedição, e o
 *   jogador se tranca fora do próprio jogo sem aviso.
 *   A CAPTURA NUNCA É RECUSADA por equipe cheia: vai para a caixa.
 *   SÓ SE SOLTA DA CAIXA, e nunca quem está em aventura.
 */
export const PARTY_MAX = 6;

export const ativas = criaturas => (criaturas ?? []).filter(c => !c.naCaixa);
export const equipeCheiaEm = criaturas => ativas(criaturas).length >= PARTY_MAX;

export function motivoDeMover(criaturas, id, paraCaixa) {
  const c = (criaturas ?? []).find(x => x.id === id);
  if (!c) return 'essa criatura não existe';
  /* D-150: pedir o que já é verdade é aceite. O segundo clique de um duplo
     clique chega com ela JÁ no lugar, e recusá-lo virava um 400 na cara. */
  if (!!c.naCaixa === !!paraCaixa) return null;
  if (!paraCaixa && equipeCheiaEm(criaturas) && c.naCaixa)
    return `a equipe já tem ${PARTY_MAX} — guarde uma antes de tirar outra`;
  if (paraCaixa && ativas(criaturas).length <= 1) return 'a equipe não pode ficar vazia';
  return null;
}

/* A TROCA é tirar e pôr NA MESMA gravação, e a ORDEM depende do time: cheio,
   tira antes de pôr (o teto é seis); senão, põe antes de tirar (um time de um
   não pode ficar vazio no meio). */
export const ordemDaTroca = (criaturas, sai, entra) =>
  equipeCheiaEm(criaturas) ? [[sai, true], [entra, false]] : [[entra, false], [sai, true]];

export function motivoDeSoltar(c, emAventura) {
  if (!c) return 'esta criatura não existe';
  if (!c.naCaixa) return 'só dá para soltar quem está na caixa';
  if (emAventura) return 'ela está em aventura — recolha-a antes';
  return null;
}
