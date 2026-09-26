/* A PROBABILIDADE EXIBIDA — "seu time vence 23% (±2)" (ST-10.5 · F4.3 ·
 * Spec §8.1.1).
 *
 * O requisito central da fase: o jogador MANIPULA uma probabilidade e vê o
 * número mexer. Se o número mentir, ele aprende a coisa errada — e o
 * propósito da fase se inverte. Três regras sustentam o número:
 *
 *   O MESMO MOTOR     cada simulação é `simular` da Trainer Battle Engine, com
 *                     o mesmo pack e o mesmo preset do combate real. Nenhuma
 *                     aproximação "mais rápida" ao lado.
 *   COM O ERRO        o número sai com a margem de 95% das simulações que o
 *                     produziram, e o lote declarado é o lote rodado.
 *   ARREDONDAMENTO    NEUTRO: meio ponto vai para o PAR (23,5 → 24, 22,5 → 22).
 *                     Arredondar sempre para cima é arredondar a favor do
 *                     jogador — e é ele quem vai apostar no que aprendeu aqui.
 *
 * ── FATIADO ────────────────────────────────────────────────────────────────
 *
 * `lote` roda um pedaço e acumula; a soma dos pedaços é IGUAL a um lote
 * inteiro (cada simulação i tem a própria semente, derivada da raiz e de i).
 * O cliente fatia por tempo, como faz com as odds da Arena.
 *
 * Empate (ninguém cai até o teto de turnos) não é vitória: a chance exibida é
 * de VENCER.
 */
import { simular } from './treino-batalha.mjs';
import { derivarIndice } from './seed.mjs';
import { efeito } from './primitivas.mjs';

export const SIMS_TREINO = 2000;
const RAMO = 'treino';

/* Acumula `n` simulações a partir da `inicio`-ésima. */
export function lote(pack, timeA, timeB, raiz, inicio, n, acum = { vitorias: 0, empates: 0, sims: 0 }) {
  for (let i = inicio; i < inicio + n; i++) {
    const v = simular(pack, timeA, timeB, derivarIndice(raiz >>> 0, RAMO, i), { registrar: false }).vencedor;
    if (v === 'A') acum.vitorias++;
    else if (v === null) acum.empates++;
    acum.sims++;
  }
  return acum;
}

export function resumo(acum) {
  const p = acum.sims ? acum.vitorias / acum.sims : 0;
  const erro = acum.sims ? 1.96 * Math.sqrt(p * (1 - p) / acum.sims) : 1;
  return { p, erro, sims: acum.sims, empates: acum.empates };
}

export function chanceDeVencer(pack, timeA, timeB, { raiz = 1, sims = SIMS_TREINO } = {}) {
  return resumo(lote(pack, timeA, timeB, raiz, 0, sims));
}

/* Meio ponto vai para o par — nem a favor, nem contra. */
export function arredondarNeutro(x) {
  const f = Math.floor(x), d = x - f;
  if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

export const textoDaChance = ({ p, erro }) =>
  `seu time vence ${arredondarNeutro(p * 100)}% (±${Math.max(1, arredondarNeutro(erro * 100))})`;

/* ── A MAIOR FRAQUEZA, pela tabela de tipos ────────────────────────────────
 *
 * Primeiro o que o jogador pode consertar trocando GOLPE: nenhum golpe dele é
 * super-efetivo contra o tipo mais presente no time rival. Depois o que ele
 * conserta trocando CRIATURA: o tipo de golpe rival que acerta super-efetivo
 * o maior número dos dele. `null` quando não há nenhuma das duas. */
export function maiorFraqueza(pack, timeA, timeB) {
  const chart = pack.tipos.efetividade;
  const nome = t => pack.tipos.nomes?.[t] ?? t;
  const tiposDe = c => (pack.especies ?? []).find(e => e.dex === Number(c.dex))?.t ?? [];
  const tipoDoGolpe = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n)?.t;
  const contagem = new Map();
  for (const c of timeB) for (const t of tiposDe(c)) contagem.set(t, (contagem.get(t) ?? 0) + 1);
  const rival = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  const meus = [...new Set(timeA.flatMap(c => c.golpes ?? []).map(tipoDoGolpe).filter(Boolean))];
  if (rival && !meus.some(t => timeB.some(c => tiposDe(c).includes(rival) && efeito(chart, t, tiposDe(c)) > 1)))
    return { tipo: rival, texto: `nenhum golpe seu é super-efetivo contra ${nome(rival)}` };
  const deles = [...new Set(timeB.flatMap(c => c.golpes ?? []).map(tipoDoGolpe).filter(Boolean))];
  const pior = deles.map(t => ({ t, n: timeA.filter(c => efeito(chart, t, tiposDe(c)) > 1).length }))
    .sort((a, b) => b.n - a.n || a.t.localeCompare(b.t))[0];
  if (pior?.n) return { tipo: pior.t, texto: `${pior.n} de ${timeA.length} dos seus levam dano dobrado de ${nome(pior.t)}` };
  return null;
}
