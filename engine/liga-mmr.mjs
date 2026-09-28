/* O LIGA MMR — Elo simples, rating oculto e tier à vista (ST-11.4 · F5.2 · Spec §9.7).
 *
 * Puro. Três avaliações existem no produto e NENHUMA lê a outra (§9.7):
 *
 *   Arena MMR    previsão dentro da Arena
 *   Calibração   a qualidade das previsões declaradas (§6.7)
 *   Liga MMR     este: o combate com o time próprio
 *
 * Prever bem não faz o time lutar melhor, e vencer na Liga não melhora a
 * calibração — misturá-los destrói o que cada um informa. O teste de grafo
 * (`test/liga-mmr.mjs`) cobra que este arquivo e quem grava o rating não
 * toquem a calibração, e vice-versa.
 *
 * ELO DE SOMA ZERO: o que um ganha o outro perde, exatamente — o arredondamento
 * é feito UMA vez, no delta, e não em cada lado. Sem piso: um piso criaria
 * rating do nada no fundo da tabela.
 *
 * O RATING É OCULTO: a tela mostra o TIER. O número exato vira alvo de
 * otimização ("perder de propósito para cair de faixa") e não diz nada que o
 * tier não diga ao jogador.
 */
export const MMR = Object.freeze({ inicial: 1000, K: 32 });

/* Os tiers do §9.6, pela faixa de rating. Parâmetro de balanceamento, como o
   stake de cada um — revisar com a população do piloto. */
export const TIERS = Object.freeze([
  Object.freeze({ nome: 'Bronze', min: -Infinity }), Object.freeze({ nome: 'Silver', min: 1100 }),
  Object.freeze({ nome: 'Gold', min: 1250 }), Object.freeze({ nome: 'Platinum', min: 1400 }),
  Object.freeze({ nome: 'Diamond', min: 1550 }), Object.freeze({ nome: 'Master', min: 1700 }),
  Object.freeze({ nome: 'Champion', min: 1850 }),
]);
export const tierDe = rating => [...TIERS].reverse().find(t => rating >= t.min).nome;

/* A chance que o Elo dá a A contra B. */
export const esperado = (ra, rb) => 1 / (1 + 10 ** ((rb - ra) / 400));

export function eloDaPartida(ra, rb, vencedor) {
  const s = vencedor === 'A' ? 1 : vencedor === 'B' ? 0 : 0.5;
  const delta = Math.round(MMR.K * (s - esperado(ra, rb)));
  return { a: ra + delta, b: rb - delta, delta };
}
