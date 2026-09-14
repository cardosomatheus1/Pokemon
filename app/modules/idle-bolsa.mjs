/* A BOLSA — o inventário do jogador (bloco A4e, camada 0).
 *
 * Saiu do `idle-dados.mjs` pela mesma divisão que tirou o banco de lá: são
 * perguntas diferentes, e o arquivo respondia as duas.
 *
 *     idle-dados   A EXPEDIÇÃO — quem foi, para onde, e o que ela trouxe
 *     idle-bolsa   O QUE SE TEM — e as duas guardas de quem mexe nisso
 *
 * E a bolsa nunca foi só da expedição: a loja, as bolas e o baú do Avanço
 * mexem nela sem passar por expedição nenhuma. Ela estava hospedada, não em
 * casa.
 *
 * ── AS DUAS GUARDAS, E POR QUE ELAS SÃO O ARQUIVO INTEIRO ────────────────
 *
 * Débito devolve `false` quando não dá, em vez de deixar a bolsa negativa. É a
 * mesma forma do servidor, e existe porque bolsa negativa é bola de graça, e
 * bola de graça é criatura de graça.
 *
 * Crédito RECUSA valor não-positivo em vez de aceitar calado: um crédito de
 * zero é sempre um erro de quem chamou, e um crédito negativo é um débito sem
 * a guarda acima.
 */
export const quantosNaBolsa = (e, item) => e.bolsa[item] ?? 0;

export function debitarBolsa(e, item, quantos = 1) {
  if (!(quantos > 0)) return false;
  if ((e.bolsa[item] ?? 0) < quantos) return false;
  e.bolsa[item] -= quantos;
  return true;
}

export function creditarBolsa(e, item, quantos) {
  if (!(quantos > 0)) throw new Error('crédito tem de ser positivo');
  e.bolsa[item] = (e.bolsa[item] ?? 0) + quantos;
}

/* ORDENADA PELO ID, sempre. Sem ordem estável a lista se remexe a cada
   repintura e o jogador perde o item que estava olhando. */
export const bolsaEmLista = e => Object.entries(e.bolsa)
  .filter(([, q]) => q > 0).map(([id, quantidade]) => ({ id, quantidade }))
  .sort((a, b) => a.id.localeCompare(b.id));
