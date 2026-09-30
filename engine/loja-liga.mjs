/* A LOJA DA LIGA — o gasto dos League Points (ST-11.7c · Spec §9.11, §10.2).
 *
 * Puro: entra o pack, sai o que se compra, por quanto e quantas vezes por
 * temporada. A compra é do `server/loja-liga.mjs`.
 *
 * O §9.11 lista o que a loja vende — cosmético, bolas, doce LIMITADO, itens de
 * perfil, colecionáveis da temporada — e o que ela nunca vende: rating ou
 * pontos. Esta primeira prateleira tem as BOLAS e o DOCE, que já têm onde
 * cair no servidor (a bolsa e o doce da linha); as peças de cosmético da Liga
 * precisam de arte própria e entram numa prateleira seguinte (L-213).
 *
 * ── POR QUE TODA PEÇA TEM LIMITE POR TEMPORADA ──────────────────────────
 *
 * A moeda é sazonal e o prêmio de um Champion é 750. Sem limite, quem joga a
 * Liga compraria as bolas que o idle cobra na moeda da Arena, sem teto — e a Liga
 * viraria a torneira de bolas do jogo. Com limite, os pontos são um bônus da
 * temporada, e o idle continua sendo onde a bola se ganha.
 *
 * ── E NENHUMA BOLA DA LOJA É A COMUM NEM A GARANTIDA ────────────────────
 *
 * A comum não vale a moeda de uma temporada; a de captura garantida (se o pack
 * tiver uma) nunca se vende em porta nenhuma (§P5). A loja pega, do pack, as
 * duas bolas logo acima da comum — pela força (`mult`), e não pelo nome: o
 * motor não sabe como a bola se chama.
 */
const PRATELEIRA_DE_BOLAS = Object.freeze([
  Object.freeze({ preco: 40, quantidade: 3, limite: 5 }),
  Object.freeze({ preco: 90, quantidade: 2, limite: 3 }),
]);
export const DOCE_DA_LIGA = Object.freeze({ preco: 60, quantidade: 3, limite: 5 });

/* O catálogo do pack. A garantida (mult ≥ 100) fica fora; a comum é a de
   menor força. */
export function catalogoDaLoja(pack) {
  const bolas = [...(pack?.bolas ?? [])].filter(b => Number(b.mult) < 100).sort((a, b) => a.mult - b.mult).slice(1, 1 + PRATELEIRA_DE_BOLAS.length);
  return [
    ...bolas.map((b, i) => ({ id: `bola:${b.id}`, tipo: 'bola', alvo: b.id, nome: b.rotulo ?? b.id, mult: b.mult, ...PRATELEIRA_DE_BOLAS[i] })),
    { id: 'doce', tipo: 'doce', alvo: null, nome: 'Doce da Liga', ...DOCE_DA_LIGA },
  ];
}

export const itemDaLoja = (pack, id) => catalogoDaLoja(pack).find(i => i.id === id) ?? null;

/* Pode comprar? O motivo da recusa é para o jogador: diz o que falta. */
export function podeComprar(item, { saldo, comprados }) {
  if (!item) return { ok: false, motivo: 'esse item não está na loja' };
  if ((Number(comprados) || 0) >= item.limite) return { ok: false, motivo: `limite desta temporada atingido (${item.limite})` };
  if ((Number(saldo) || 0) < item.preco) return { ok: false, motivo: `faltam ${item.preco - (Number(saldo) || 0)} LP` };
  return { ok: true };
}
