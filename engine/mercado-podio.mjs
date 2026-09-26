/* O MERCADO DE PÓDIO — 1º, 2º e 3º em ordem (ST-12.7 · F2.2 · Spec §6.5).
 *
 * "Maior variância, maior retorno; exige regra de empate." A resposta sai da
 * POSIÇÃO FINAL do motor (`posicaoFinalDe`, de `colocacao.mjs`) e de mais
 * nenhuma — é a mesma que o XP e a tela de resultado usam.
 *
 * ── A SELEÇÃO É A TRINCA ORDENADA, CODIFICADA NUM INTEIRO ────────────────
 *
 * `a·144 + b·12 + c` para (1º, 2º, 3º) em slots de 0 a 11: 1.320 trincas de
 * lutadores distintos. Um inteiro, e não um texto, porque a coluna
 * `selection` do bolo é inteira e o motor de apuração (`mutuo.mjs`) só sabe
 * comparar seleções — ele não precisa saber o que é um pódio.
 *
 * ── A REGRA DE EMPATE ──────────────────────────────────────────────────
 *
 * O motor encerra por tempo, e quem sobrevive sem vencer EMPATA em 2º (ver
 * `posicaoFinalDe`). Então as três casas do pódio são preenchidas pelos grupos
 * de posição, na ordem: a casa k aceita qualquer lutador do grupo que cobre a
 * posição k. Com o campeão e três sobreviventes, a 2ª e a 3ª casa aceitam
 * qualquer par ordenado dos três — seis trincas vencem, e o bolo se divide
 * entre quem pôs em qualquer uma delas. É o "os empatados ocupam a mesma
 * posição" da ficha, sem desempate inventado (nem por slot, nem por vida).
 */
import { ordemDeQuedas, posicaoFinalDe } from './colocacao.mjs';
import { loteDoMercado, SIMS_MERCADO } from './mercado-abates.mjs';

export const BASE = 12;
export const codificar = ([a, b, c]) => a * BASE * BASE + b * BASE + c;
export const decodificar = x => [Math.floor(x / (BASE * BASE)), Math.floor(x / BASE) % BASE, x % BASE];

export const REGRA_PODIO = Object.freeze({
  pergunta: 'quem fica em 1º, 2º e 3º, nesta ordem',
  empate: 'quem empata numa posição ocupa todas as casas que ela cobre; o bolo se divide entre as trincas que o empate permite',
  zero: 'o pódio sempre existe: sempre há um campeão e alguém atrás dele',
  tempestade: 'cair na tempestade conta como cair — a ordem de queda é a do motor',
});

export function selecoesDoPodio(n = BASE) {
  const out = [];
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) for (let c = 0; c < n; c++)
    if (a !== b && a !== c && b !== c) out.push(codificar([a, b, c]));
  return out;
}

export const trincaValida = (x, n = BASE) => {
  if (!Number.isInteger(x) || x < 0 || x >= BASE ** 3) return false;
  const [a, b, c] = decodificar(x);
  return a < n && b < n && c < n && a !== b && a !== c && b !== c;
};

/* `pos[i]` = posição final do slot i. Devolve as trincas vencedoras. */
export function vencedorasPorPosicoes(pos) {
  const slots = pos.map((p, i) => ({ i, p })).sort((x, y) => x.p - y.p);
  /* As casas 1, 2 e 3: cada uma aceita o grupo de posição que a cobre. Um
     grupo de tamanho g que começa na casa k cobre as casas k..k+g-1. */
  const casas = [];
  for (let k = 0; k < slots.length && casas.length < 3;) {
    const grupo = slots.filter(s => s.p === slots[k].p).map(s => s.i);
    for (let j = 0; j < grupo.length && casas.length < 3; j++) casas.push(grupo);
    k += grupo.length;
  }
  const out = [];
  for (const a of casas[0] ?? []) for (const b of casas[1] ?? []) for (const c of casas[2] ?? [])
    if (a !== b && a !== c && b !== c) out.push(codificar([a, b, c]));
  return out;
}

/* A partir dos eventos da luta, pelo mesmo caminho da tela e do XP. */
export function posicoesDaLuta(eventos, campeaoIdx, n) {
  const ordem = ordemDeQuedas(eventos);
  return Array.from({ length: n }, (_, i) => posicaoFinalDe(i, campeaoIdx, ordem, n));
}

/* O PREÇO DO MODELO PARA O PÓDIO (§6.6): a contagem de cada trinca vencedora
   no lote do mercado. Esparso — de 1.320 trincas, só as que venceram alguma
   vez aparecem; `vence[código]` ausente é zero. */
export function precoDoModeloPodio(M, pool, raiz, sims = SIMS_MERCADO) {
  const vence = {};
  loteDoMercado(M, pool, raiz, sims, b => {
    for (const x of vencedorasPorPosicoes(posicoesDaLuta(b.events, b.winner, pool.length)))
      vence[x] = (vence[x] ?? 0) + 1;
  });
  return { sims, vence };
}
