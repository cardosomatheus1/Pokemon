/* O MERCADO DE ABATES — quem venceu, pelos eventos do motor (ST-12.2 · F2.2).
 *
 * O primeiro mercado mútuo (§6.5): "quem faz mais abates nesta rodada". A
 * pergunta é simples, e as três formas de errá-la já custaram caro no placar:
 *
 *   A CONTAGEM É A DO MOTOR     `abatesNosEventos`, de `colocacao.mjs`, e mais
 *                               nenhuma. Uma travessia própria aqui seria a
 *                               terceira contagem de abates do projeto — e a
 *                               que paga dinheiro seria a que ninguém olha.
 *   TEMPESTADE NÃO É ABATE      ela derruba, mas não tem autor (S398).
 *   O EMPATE É REGRA DECLARADA  escrita no mercado ao abrir e exibida antes de
 *                               entrar; nunca improvisada na liquidação.
 *
 * ── A REGRA DE EMPATE, E A DO ZERO ────────────────────────────────────────
 *
 * Empate no topo: TODOS os empatados vencem, e o bolo se divide pela entrada
 * (quem acertou qualquer um deles divide com quem acertou os outros). Desempatar
 * por vida, por ordem de slot ou por quem abateu primeiro seria uma segunda
 * pergunta que o jogador não fez ao entrar.
 *
 * Rodada sem abate nenhum (todos caíram na tempestade, ou o tempo acabou antes
 * de alguém cair por golpe): NINGUÉM venceu. "Mais abates" com zero abates não
 * é mais abates, e declarar os doze vencedores seria devolver o bolo inteiro
 * disfarçado de acerto. Vale o destino "sem acerto" do bolo (§6.4), exibido
 * antes.
 */
import { abatesNosEventos } from './colocacao.mjs';

export const REGRA_ABATES = Object.freeze({
  pergunta: 'quem faz mais abates nesta rodada',
  empate: 'todos os empatados no topo vencem; o bolo se divide pela entrada',
  zero: 'sem nenhum abate na rodada, ninguém vence: vale o destino "sem acerto" do bolo',
  tempestade: 'queda por tempestade não é abate de ninguém',
});

/* As seleções são os slots da pool — o mesmo índice gravado em
   `round_fighters`. */
export const selecoesDeAbates = n => Array.from({ length: n }, (_, i) => i);

export function abatesPorSlot(eventos, n) {
  return selecoesDeAbates(n).map(i => abatesNosEventos(i, eventos));
}

export const vencedorasDeAbates = (eventos, n) => vencedorasPorAbates(abatesPorSlot(eventos, n));

/* A mesma regra a partir da contagem já feita — é o que a liquidação recebe
   do `resultadoDaRodada`, que conta pelo `colocacao.mjs` (ST-12.4). */
export function vencedorasPorAbates(abates) {
  const topo = Math.max(0, ...abates);
  if (topo === 0) return [];
  return selecoesDeAbates(abates.length).filter(i => abates[i] === topo);
}
