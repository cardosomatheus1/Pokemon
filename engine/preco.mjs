/* Precificação — o Monte Carlo e a conversão de frequência em odd.
 *
 * Estava dentro de app/modules/odds.mjs, misturado com o fatiamento de 12 ms
 * que existe para não travar a animação. O F0.5 separou os dois, e o motivo é
 * concreto: enquanto a matemática morava num módulo que importa o DOM, nenhuma
 * suíte conseguia rodá-la, e a sabotagem que troca a sub-seed derivada por um
 * sorteio solto passava despercebida. Preço que ninguém consegue testar é
 * preço que ninguém consegue auditar.
 *
 * Aqui não há divisão de trabalho por tempo: quem fatia é o app. Este arquivo
 * simula o lote que pedirem e devolve o placar.
 *
 * A FÓRMULA NÃO MUDOU NESTE BLOCO. O F0.7 é quem mexe em precisão de odd, e o
 * F0.6 em clima dentro do modelo; mudar aqui agora misturaria dois blocos.
 */
import { derivarIndice } from './seed.mjs';

/* Simula as batalhas de índice [de, ate) e acumula as vitórias.
 *
 * A sub-seed de cada simulação vem do ÍNDICE, não de um sorteio: com isso o
 * lote 0-500 dá o mesmo resultado tendo sido rodado de uma vez ou em vinte
 * fatias, e a tabela de odds inteira é reproduzível a partir da raiz. */
export function simularLote(simular, fighters, raiz, de, ate, wins) {
  for (let i = de; i < ate; i++) {
    const w = simular(fighters, derivarIndice(raiz, 'simulacao', i), false);
    if (w >= 0) wins[w]++;
  }
  return wins;
}

/* Frequência de vitória -> odd exibida.
 *
 * Suavização de Laplace: ninguém fica com probabilidade 0, o que evitaria uma
 * odd infinita para quem não venceu nenhuma das simulações. */
export function precificar(wins, sims, margem) {
  const n = wins.length;
  return Array.from({ length: n }, (_, i) => {
    const p = (wins[i] + 1) / (sims + n);
    const fair = 1 / p;
    return {
      idx: i, wins: wins[i], prob: p,
      fair: +fair.toFixed(2),
      odd: Math.max(1.05, +(fair * (1 - margem)).toFixed(2)),
    };
  });
}
