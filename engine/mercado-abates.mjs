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
import { derivarIndice } from './seed.mjs';
import { tiposDaPool } from './engine.mjs';

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

/* ── O PREÇO DO MODELO (ST-12.5 · §6.6) ────────────────────────────────────
 *
 * Com que frequência cada lutador termina no topo de abates — empates
 * incluídos, porque empatado no topo também vence o bolo. É o número que o
 * servidor grava ao ABRIR a rodada e só publica depois de pagar: publicado
 * antes, o bolo convergiria para ele e ler a Arena deixaria de pagar.
 *
 * UM LOTE PRÓPRIO, NUM RAMO PRÓPRIO DA ÁRVORE ('mercado'). Reusar as
 * simulações do preço principal exigiria gravar os eventos delas — e mexer no
 * Monte Carlo que os goldens e a `margem.json` fotografam. Separado, o preço
 * principal fica byte a byte igual, e este custa um lote curto: medido em
 * 26/09, 20.000 simulações com eventos em ~0,8 s (sem eventos: ~0,6 s).
 *
 * O CLIMA ENTRA COMO NA LUTA: sorteado por simulação entre os que a pool
 * suporta — a mesma condicional do `simularLote`, pelo mesmo motivo (F0.6). */
export const SIMS_MERCADO = 20_000;

export function precoDoModeloAbates(M, pool, raiz, sims = SIMS_MERCADO) {
  const tipos = tiposDaPool(pool);
  const vence = new Array(pool.length).fill(0);
  let nenhum = 0;
  for (let i = 0; i < sims; i++) {
    const clima = M.sortearClima(derivarIndice(raiz, 'mercado-ambiente', i), tipos);
    const f = clima.type ? M.aplicarClima(pool, clima) : pool;
    const b = M.simular(f, derivarIndice(raiz, 'mercado', i), true);
    const v = vencedorasDeAbates(b.events, pool.length);
    if (!v.length) nenhum++;
    for (const x of v) vence[x]++;
  }
  return { sims, vence, nenhum };
}
