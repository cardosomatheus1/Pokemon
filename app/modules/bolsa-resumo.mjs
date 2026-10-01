/* O RESUMO DA BOLSA EMBAIXO DA CENA — camada 0 (ST-2.12).
 *
 * O dono: "onde vejo meus itens?". A bolsa existia — o cartão "Bolsa e
 * Pokédex" —, mas no celular ela mora várias telas abaixo da cena, e quem
 * está olhando a cena não sabe que ela existe. Uma linha embaixo do palco diz
 * o que se tem de mais importante PARA A RUN (bolas e poções primeiro) e leva
 * ao cartão inteiro. */

/* `lista`: [{ id, quantidade }]; `primeiro`: ids que vêm na frente (as bolas e
   as curas — é o que a run usa); `rotulo`: id -> nome como a tela escreve. */
export function resumoDaBolsa(lista, { primeiro = [], rotulo = id => id, max = 3 } = {}) {
  const tem = (lista ?? []).filter(i => (Number(i?.quantidade) || 0) > 0);
  if (!tem.length) return { vazia: true, texto: '🎒 a bolsa está vazia — a Loja vende bolas e poções' };
  const ordem = id => { const k = primeiro.indexOf(id); return k < 0 ? primeiro.length : k; };
  const top = [...tem].sort((a, b) => ordem(a.id) - ordem(b.id)).slice(0, max);
  const resto = tem.length - top.length;
  const itens = top.map(i => i.quantidade + ' ' + rotulo(i.id)).join(' · ');
  const mais = resto > 0 ? ' · +' + resto : '';
  return { vazia: false, texto: '🎒 na bolsa: ' + itens + mais + ' — ver tudo ↓' };
}
