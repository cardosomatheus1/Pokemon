/* A ORIGEM DO DOCE (ST-14.14c · E14 · spec E14 §4.3 · L-223) — camada 0.
 *
 * O doce é fungível por linha: não há "este doce" para guardar a classe, como
 * há o lote de um item. Então a linha guarda DUAS contas — quantos doces tem e
 * quantos deles são PRESOS — e a regra cabe em três frases:
 *
 *   nasce preso   o doce da aposta paga com algo que não negocia (PC-B, o
 *                 competitivo) e o doce de soltar uma criatura presa
 *   gasta livre   dar doce consome os LIVRES primeiro — a spec pede não gastar
 *                 em silêncio o insumo preso e desvalorizar a criatura
 *   prende        se precisou de doce preso, a criatura que subiu fica presa
 *                 (`promotional_bound`, pela `maisRestrita`): o bônus não vira,
 *                 por um desvio, nível numa criatura que se vende
 *
 * Doce da jornada (PvE), da loja dos League Points e de soltar criatura livre
 * nasce livre: foi ganho jogando.
 */
import { BUCKETS_P2P } from './negociabilidade.mjs';
import { maisRestrita, negociavelPelaOrigem } from './proveniencia.mjs';

/* A aposta paga SÓ com o que negocia dá doce livre; qualquer parcela de outro
   bolso prende o doce inteiro — dividir um doce de 3 em frações não existe. */
export function doceLivreDaAposta(composicao) {
  const partes = Object.entries(composicao ?? {}).filter(([, n]) => n > 0);
  return partes.length > 0 && partes.every(([b]) => BUCKETS_P2P.includes(b));
}

export const doceLivreAoSoltar = classeDaCriatura => negociavelPelaOrigem(classeDaCriatura);

/* Quantos dos `gastos` saem dos presos, com os livres consumidos antes. */
export function gastoDoDoce({ quantidade, presos, gastos }) {
  const livres = Math.max(0, quantidade - presos);
  const presosUsados = Math.max(0, Math.min(presos, gastos - livres));
  return { presosUsados, prende: presosUsados > 0 };
}

export const classeAposDoce = (classe, prende) => (prende ? maisRestrita([classe, 'promotional_bound']) : classe);
