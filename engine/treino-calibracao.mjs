/* A CALIBRAÇÃO DA PROBABILIDADE EXIBIDA (ST-10.5 · Spec §8.1.1).
 *
 * "A probabilidade exibida bate com a frequência observada em pelo menos
 * 20.000 combates simulados, por faixa." Esta é a medição: para cada confronto
 * sorteado, a chance que a tela EXIBIRIA (um lote curto) e o desfecho de UM
 * combate independente — outra semente, o mesmo motor. Por faixa de chance, a
 * média exibida tem de bater com a fração de vitórias observada.
 *
 * Os confrontos são 3 contra 3 (o formato cedo, R11) com espécies do elenco e
 * níveis de 20 a 50 — diferença de nível espalha as chances pelas faixas.
 */
import { lote, resumo } from './treino-preco.mjs';
import { simular } from './treino-batalha.mjs';
import { rng } from './primitivas.mjs';
import { derivar } from './seed.mjs';

export const FAIXAS = 10;

export function confronto(pack, R, golpesDe) {
  const elenco = pack.elenco;
  const um = () => {
    const dex = elenco[Math.floor(R() * elenco.length)], nivel = 20 + Math.floor(R() * 31);
    return { dex, nivel, golpes: golpesDe(dex, nivel) };
  };
  return { A: [um(), um(), um()], B: [um(), um(), um()] };
}

/* `n` confrontos a partir da semente; `sims` por chance exibida. */
export function medirCalibracao(pack, { semente, n, sims, golpesDe }) {
  const R = rng(semente >>> 0);
  const faixas = Array.from({ length: FAIXAS }, () => ({ n: 0, somaP: 0, vitorias: 0 }));
  for (let k = 0; k < n; k++) {
    const { A, B } = confronto(pack, R, golpesDe);
    const raiz = derivar(semente >>> 0, `c${k}`);
    const { p } = resumo(lote(pack, A, B, raiz, 0, sims));
    const real = simular(pack, A, B, derivar(raiz, 'real'), { registrar: false }).vencedor;
    const f = faixas[Math.min(FAIXAS - 1, Math.floor(p * FAIXAS))];
    f.n++; f.somaP += p; if (real === 'A') f.vitorias++;
  }
  return faixas.map((f, i) => ({ faixa: `${i * 10}–${i * 10 + 10}%`, n: f.n,
    exibida: f.n ? +(f.somaP / f.n).toFixed(4) : null, observada: f.n ? +(f.vitorias / f.n).toFixed(4) : null }));
}

/* Compatível: em cada faixa com amostra, a distância cabe em 3 erros-padrão
   da observada, mais 0,02 pelo erro do próprio lote curto. */
export function foraDaTolerancia(faixas, minimo = 30) {
  return faixas.filter(f => f.n >= minimo).filter(f => {
    const se = Math.sqrt(Math.max(f.observada * (1 - f.observada), 0.01) / f.n);
    return Math.abs(f.exibida - f.observada) > 3 * se + 0.02;
  });
}
