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

/* ORDEM ESTÁVEL, sempre: sem ela a lista se remexe a cada repintura e o
   jogador perde o item que estava olhando.

   ST-2.6 (o dono: "tá feio, desorganizado"): COM o pack, a ordem é a do
   CATÁLOGO — as bolas do pack primeiro, depois o catálogo como ele se agrupa
   (pedras, itens de batalha, bolas especiais, poções), a parte de estilhaço
   logo atrás do seu item, e o que o pack não conhece no fim. Pelo id, a
   "Pedra da Água" ficava entre o "Lodo Negro" e o "Elo": a ordem do código,
   que ninguém lê. Sem o pack, o id continua sendo o desempate. */
export function posicaoNaBolsa(pack) {
  const pos = new Map();
  [...(pack?.bolas ?? []).map(b => b.id), ...(pack?.catalogo ?? []).map(i => i.id)]
    .forEach((id, k) => { if (!pos.has(id)) pos.set(id, k); });
  return id => {
    const base = String(id).startsWith('est:') ? String(id).slice(4) : String(id);
    const p = pos.get(base);
    return p == null ? Number.MAX_SAFE_INTEGER : p + (base === id ? 0 : 0.5);
  };
}
export const bolsaEmLista = (e, pack = null) => {
  const pos = pack ? posicaoNaBolsa(pack) : () => 0;
  return Object.entries(e.bolsa)
    .filter(([, q]) => q > 0).map(([id, quantidade]) => ({ id, quantidade }))
    .sort((a, b) => pos(a.id) - pos(b.id) || a.id.localeCompare(b.id));
};
