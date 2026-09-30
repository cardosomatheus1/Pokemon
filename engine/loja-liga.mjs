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

/* O COSMÉTICO DA LIGA (ST-11.7d): a peça é uma só e é para sempre — o
   "limite" é 1, e quem já tem não compra de novo. O preço é o de um prêmio de
   tier alto: quem fecha a temporada no Platinum (275) compra uma; o Bronze
   precisa de mais que uma temporada de partidas. É o gasto de PRESTÍGIO da
   moeda, e ele tem de custar como prestígio. */
export const PRECO_COSMETICO_DA_LIGA = 400;

/* O catálogo do pack. A garantida (mult ≥ 100) fica fora; a comum é a de
   menor força. */
export function catalogoDaLoja(pack, cosmeticos = []) {
  const bolas = [...(pack?.bolas ?? [])].filter(b => Number(b.mult) < 100).sort((a, b) => a.mult - b.mult).slice(1, 1 + PRATELEIRA_DE_BOLAS.length);
  return [
    ...bolas.map((b, i) => ({ id: `bola:${b.id}`, tipo: 'bola', alvo: b.id, nome: b.rotulo ?? b.id, mult: b.mult, ...PRATELEIRA_DE_BOLAS[i] })),
    { id: 'doce', tipo: 'doce', alvo: null, nome: 'Doce da Liga', ...DOCE_DA_LIGA },
    /* As peças que o TEMA marcou como da Liga — o motor não sabe o que é uma moldura. */
    ...(cosmeticos ?? []).map(c => ({ id: `cosmetico:${c.familia}:${c.id}`, tipo: 'cosmetico', alvo: { familia: c.familia, id: c.id },
                                      nome: c.nome, arte: c.arte ?? null, preco: PRECO_COSMETICO_DA_LIGA, quantidade: 1, limite: 1 })),
  ];
}

export const itemDaLoja = (pack, id, cosmeticos = []) => catalogoDaLoja(pack, cosmeticos).find(i => i.id === id) ?? null;

/* Pode comprar? O motivo da recusa é para o jogador: diz o que falta. */
export function podeComprar(item, { saldo, comprados, jaTem = false }) {
  if (!item) return { ok: false, motivo: 'esse item não está na loja' };
  if (jaTem) return { ok: false, motivo: 'já é seu' };
  if ((Number(comprados) || 0) >= item.limite) return { ok: false, motivo: `limite desta temporada atingido (${item.limite})` };
  if ((Number(saldo) || 0) < item.preco) return { ok: false, motivo: `faltam ${item.preco - (Number(saldo) || 0)} LP` };
  return { ok: true };
}
