/* AS BANDEIRAS DE FEATURE (ST-11.9 · Spec §15.3, §25.1) — camada 0.
 *
 * Puro: o catálogo e a regra de ligar. O servidor guarda o estado e a
 * auditoria (`server/feature-flags.mjs`); a decisão de PODER mora aqui.
 *
 * Duas espécies de bandeira, e a diferença é o que o §25.1 cobra:
 *
 *   de PRODUTO   liga e desliga à vontade do operador — é o "kill switch"
 *   de VALOR     move valor entre jogadores ou para fora do jogo. NASCE
 *                DESLIGADA, e LIGAR exige o marcador do §25.1 preenchido.
 *                DESLIGAR nunca exige nada: a porta de emergência não pode
 *                depender do mesmo papel que a de entrada.
 *
 * O marcador segue o padrão do `ARTE_EMPRESTADA_DE` (content/escolhido.mjs):
 * uma linha de código, `null` enquanto o checkpoint não aconteceu. Preenchê-la
 * é dizer "a revisão do §25.1 foi feita e está registrada em DEC-###" — e o
 * `test/feature-flags.mjs` recusa um marcador que não aponte para uma decisão
 * escrita. A distância entre construir e LIGAR o dinheiro é esta linha, e ela
 * fica visível no diff de quem a mudar.
 */
export const CHECKPOINT_25_1 = null;

/* O catálogo do §15.3. Bandeira fora dele não existe: ligar um nome errado
   seria ligar nada e achar que ligou. */
export const BANDEIRAS = Object.freeze({
  capture_enabled:              Object.freeze({ padrao: true,  valor: false }),
  idle_enabled:                 Object.freeze({ padrao: true,  valor: false }),
  league_enabled:               Object.freeze({ padrao: true,  valor: false }),
  weather_enabled:              Object.freeze({ padrao: true,  valor: false }),
  season_pass_enabled:          Object.freeze({ padrao: false, valor: true }),
  p2p_transfer_enabled:         Object.freeze({ padrao: false, valor: true }),
  league_stake_enabled:         Object.freeze({ padrao: false, valor: true }),
  competitive_exchange_enabled: Object.freeze({ padrao: false, valor: true }),
  /* o `real_value_…` da moeda do §15.3 — o nome da moeda é do tema, não do motor */
  real_value_currency_enabled:  Object.freeze({ padrao: false, valor: true }),
  cashout_enabled:              Object.freeze({ padrao: false, valor: true }),
});

/* O marcador vale quando nomeia uma decisão: `DEC-` e o número. Texto solto
   ("ok", "sim", a data) não é registro de revisão nenhuma. */
export const checkpointValido = c => typeof c === 'string' && /^DEC-\d{2,}$/.test(c);

/* Pode mudar `nome` para `ligada`? Devolve o motivo da recusa, ou `null`. */
export function recusaDaMudanca(nome, ligada, checkpoint = CHECKPOINT_25_1) {
  const b = BANDEIRAS[nome];
  if (!b) return 'bandeira desconhecida';
  if (typeof ligada !== 'boolean') return 'o estado precisa ser verdadeiro ou falso';
  if (ligada && b.valor && !checkpointValido(checkpoint))
    return 'bandeira de valor: ligar exige o checkpoint do §25.1 registrado (CHECKPOINT_25_1)';
  return null;
}

/* O estado de uma bandeira: o gravado, ou o padrão do catálogo. Uma bandeira
   de valor gravada LIGADA sem o marcador lê DESLIGADA — o banco restaurado de
   outra época, ou uma linha escrita à mão, não liga o dinheiro por fora. */
export function estadoDa(nome, gravada, checkpoint = CHECKPOINT_25_1) {
  const b = BANDEIRAS[nome];
  if (!b) return false;
  const ligada = gravada === undefined || gravada === null ? b.padrao : !!gravada;
  return ligada && b.valor && !checkpointValido(checkpoint) ? false : ligada;
}
