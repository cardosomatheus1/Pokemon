/* AS BANDEIRAS DE FEATURE (ST-11.9 · Spec §15.3, §25.1) — camada 0.
 *
 * Puro: o catálogo e a regra de ligar. O servidor guarda o estado e a
 * auditoria (`server/feature-flags.mjs`); a decisão de PODER mora aqui.
 *
 * Duas espécies de bandeira, e a diferença é o que o §25.1 cobra:
 *
 *   de PRODUTO   liga e desliga à vontade do operador — é o "kill switch"
 *   de VALOR     move valor entre jogadores ou para fora do jogo. NASCE
 *                DESLIGADA, e LIGAR exige o marcador do §25.1 preenchido —
 *                salvo a que move só moeda SIMULADA e o dono liberou por uma
 *                decisão escrita (`liberadaPor`, a DEC-16 do stake da Liga).
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
  /* DEC-21 (o dono, 30/09: "Pode tomar essas 2 decisões e segue"), ligada no
     commit do GATE C da E14: a troca e o Market entre os amigos do piloto,
     em moeda SIMULADA. Como a DEC-16: liberadas pela decisão, nascem ligadas,
     o operador desliga na hora — e o CHECKPOINT_25_1 continua null: saque,
     dinheiro real e Exchange seguem trancados. */
  p2p_transfer_enabled:         Object.freeze({ padrao: true,  valor: true, liberadaPor: 'DEC-21' }),
  /* DEC-16 (o dono, 30/09: "Pode ligar"): o stake da Liga move só moeda
     SIMULADA — entra e sai da fila de bônus, sem saque e sem transferência.
     Ele é LIBERADO pela decisão do dono e nasce ligado; o operador desliga
     na hora (a porta de emergência), e o dinheiro real continua atrás do
     CHECKPOINT_25_1, que esta liberação não toca. */
  league_stake_enabled:         Object.freeze({ padrao: true,  valor: true, liberadaPor: 'DEC-16' }),
  competitive_exchange_enabled: Object.freeze({ padrao: false, valor: true }),
  /* E14 (ST-14.0B2): a troca direta e o Market de jogadores. São de valor e
     COMPÕEM com `p2p_transfer_enabled` (`p2pLiberado`): nenhuma das duas
     contorna a outra, nem numa permuta sem PC-T (spec E14 §2). Ligadas pela
     DEC-21 no gate C (ver acima). */
  p2p_trade_enabled:            Object.freeze({ padrao: true,  valor: true, liberadaPor: 'DEC-21' }),
  player_market_enabled:        Object.freeze({ padrao: true,  valor: true, liberadaPor: 'DEC-21' }),
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
  if (ligada && b.valor && !checkpointValido(checkpoint) && !checkpointValido(b.liberadaPor))
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
  return ligada && b.valor && !checkpointValido(checkpoint) && !checkpointValido(b.liberadaPor) ? false : ligada;
}

/* A troca e o Market da E14 só andam com a transferência P2P TAMBÉM ligada.
   `estado(nome)` responde o estado já lido (com o checkpoint aplicado). */
export const p2pLiberado = (estado, nome) => !!estado('p2p_transfer_enabled') && !!estado(nome);
