/* O EFEITO DE CADA TROCA — "se trocar X por Y: 61%" (ST-10.6 · F4.3 ·
 * Spec §8.1.1).
 *
 * Para cada vaga do time, os K candidatos da caixa de maior power entram no
 * lugar e a chance é medida de novo — com as MESMAS sementes do time atual
 * (números aleatórios comuns). O pareamento é o que torna a comparação
 * barata: a luta i do time trocado enfrenta a mesma sorte da luta i do time
 * atual, e o que sobra na diferença é o efeito da troca, e não o ruído.
 *
 * ── SÓ O QUE SUPERA O ERRO ────────────────────────────────────────────────
 *
 * O erro de cada troca é o da diferença PAREADA (desvio de w'ᵢ − wᵢ ÷ √n, a
 * 95%). Uma troca só aparece quando o ganho passa desse erro — mostrar "+1%"
 * que é ruído ensinaria o jogador a trocar por nada. Das que passam, as três
 * melhores.
 *
 * Fatiado como a chance (ST-10.5): `lotePareado` acumula um pedaço, e a soma
 * dos pedaços é igual ao lote inteiro.
 */
import { simular } from './treino-batalha.mjs';
import { derivarIndice } from './seed.mjs';
import { arredondarNeutro } from './treino-preco.mjs';

export const K_CANDIDATOS = 3;
export const SIMS_TROCAS = 1000;
export const MOSTRAR = 3;
const RAMO = 'treino';

/* As variantes: o time atual (índice 0) e cada troca (vaga × candidato). */
export function variantes(time, candidatos, k = K_CANDIDATOS) {
  const noTime = new Set(time.map(m => m.id));
  const melhores = candidatos.filter(c => !noTime.has(c.id))
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0) || String(a.id).localeCompare(String(b.id))).slice(0, k);
  const lista = [{ vaga: null, sai: null, entra: null, time: time.map(m => m.entrada) }];
  time.forEach((m, j) => melhores.forEach(c =>
    lista.push({ vaga: j, sai: m.id, entra: c.id, time: time.map((x, i) => (i === j ? c.entrada : x.entrada)) })));
  return lista;
}

/* Acumula `n` lutas pareadas: por variante, as vitórias e a soma de dᵢ e dᵢ². */
export function lotePareado(pack, vars, rival, raiz, inicio, n, acum = null) {
  const a = acum ?? { sims: 0, vitorias: vars.map(() => 0), somaD: vars.map(() => 0), somaD2: vars.map(() => 0) };
  for (let i = inicio; i < inicio + n; i++) {
    const semente = derivarIndice(raiz >>> 0, RAMO, i);
    const w = vars.map(v => (simular(pack, v.time, rival, semente, { registrar: false }).vencedor === 'A' ? 1 : 0));
    for (let k = 0; k < vars.length; k++) {
      const d = w[k] - w[0];
      a.vitorias[k] += w[k]; a.somaD[k] += d; a.somaD2[k] += d * d;
    }
    a.sims++;
  }
  return a;
}

export function trocasDoAcumulado(vars, a, mostrar = MOSTRAR) {
  const n = a.sims, p0 = a.vitorias[0] / n;
  return vars.slice(1).map((v, j) => {
    const k = j + 1, media = a.somaD[k] / n;
    const variancia = Math.max(0, a.somaD2[k] / n - media * media);
    const erro = 1.96 * Math.sqrt(variancia / n);
    return { vaga: v.vaga, sai: v.sai, entra: v.entra, p: a.vitorias[k] / n, antes: p0, delta: media, erro };
  }).filter(t => t.delta > 0 && t.delta > t.erro)
    .sort((x, y) => y.delta - x.delta || x.vaga - y.vaga).slice(0, mostrar);
}

export function melhoresTrocas(pack, time, candidatos, rival, { raiz = 1, sims = SIMS_TROCAS, k = K_CANDIDATOS } = {}) {
  const vars = variantes(time, candidatos, k);
  return trocasDoAcumulado(vars, lotePareado(pack, vars, rival, raiz, 0, sims));
}

export const textoDaTroca = (t, nomeDe) =>
  `se trocar ${nomeDe(t.sai)} por ${nomeDe(t.entra)}: ${arredondarNeutro(t.p * 100)}% (era ${arredondarNeutro(t.antes * 100)}%)`;

/* A confirmação que fica na tela enquanto as novas trocas são medidas. */
export const textoDaTrocaFeita = (t, nomeDe) =>
  `Feito: você trocou ${nomeDe(t.sai)} por ${nomeDe(t.entra)} — ${arredondarNeutro(t.antes * 100)}% → ${arredondarNeutro(t.p * 100)}%.`;

