/* LEAGUE POINTS — a terceira e ÚLTIMA moeda (ST-11.7a · Spec §9.10, §9.11,
 * §10.1, §10.2, §10.12).
 *
 * Puro: entra o resultado, o tier, o saldo — sai quanto entra ou sai. A
 * gravação é do `server/pontos-liga.mjs`, num livro próprio.
 *
 * O §10.2 cobra quatro coisas de toda moeda, e esta as tem assim:
 *
 *   FONTE     jogar a Liga CONTANDO (a partida fora do ranking e a do bot não
 *             pagam), e o prêmio do tier na virada da temporada
 *   GASTO     a League Shop (ST-11.7c) — cosmético, bola, doce limitado
 *   LIMITE    teto por dia do mundo no que vem de partida, e o reset FORTE na
 *             virada: só 10% do saldo atravessa (o §10.12 sugere 0–20%;
 *             escolhemos o meio de baixo — a moeda é da temporada, e guardar
 *             para sempre a transformaria em poupança)
 *   MOTIVO    dar o que fazer com a Liga que não seja rating: o rating NUNCA
 *             se compra (§9.11), então os pontos são o que se leva da temporada
 *
 * E a regra que não se negocia (§10.12): NUNCA converte na moeda da Arena (PC-T). Por isso
 * não há aqui nenhuma taxa, nenhuma paridade, nenhum "vale X": um número que
 * dissesse quanto um ponto vale em outra moeda seria a conversão esperando
 * alguém escrevê-la.
 *
 * QUEM DESAFIA ganha sempre um pouco (jogou), mais no empate, mais na vitória.
 * QUEM DEFENDE não estava lá: ganha só quando o time dele segura — senão a
 * conta parada renderia pontos por ser atacada. Parâmetros de balanceamento,
 * como os do Elo: revisar com a primeira temporada do piloto (§10.13).
 */
export const PONTOS = Object.freeze({
  vitoria: 30, empate: 15, derrota: 10,
  defesa: 10,
  tetoDiario: 200,
  carryover: 0.10,
  minimoParaPremio: 5,
});

/* O prêmio do fim da temporada, pelo tier em que ela FECHOU (§9.10: quanto
   mais alta a competição, mais prestígio). Só para quem jogou o mínimo nela —
   subir de tier numa partida e sumir não é temporada. */
export const PREMIO_DO_TIER = Object.freeze({
  Bronze: 50, Silver: 100, Gold: 175, Platinum: 275, Diamond: 400, Master: 550, Champion: 750,
});

/* O que o livro aceita. `partida` e `defesa` são a fonte que o teto limita;
   `premio` e `reset` são da virada; `compra` é da loja. */
export const TIPOS_PONTOS = Object.freeze(['partida', 'defesa', 'premio', 'reset', 'compra']);
export const TIPOS_DO_TETO = Object.freeze(['partida', 'defesa']);

/* Quanto uma partida CONTADA rende a um lado. `jaHoje` é o que a conta já
   ganhou de partida neste dia do mundo: o teto corta o excedente, e nunca
   deixa o ganho negativo. */
export function ganhoDaPartida({ papel, vencedor, jaHoje = 0 }) {
  let bruto = 0;
  if (papel === 'desafiante') bruto = vencedor === 'B' ? PONTOS.vitoria : vencedor === 'empate' ? PONTOS.empate : PONTOS.derrota;
  else if (papel === 'defensor') bruto = vencedor === 'A' ? PONTOS.defesa : 0;
  const resta = PONTOS.tetoDiario - Math.max(0, Number(jaHoje) || 0);
  return Math.max(0, Math.min(bruto, resta));
}

/* O que atravessa a virada: 10% do saldo, arredondado para baixo. */
export const carryoverDe = saldo => Math.floor(Math.max(0, Number(saldo) || 0) * PONTOS.carryover);

export const premioDaTemporada = ({ tier, partidas }) =>
  (Number(partidas) || 0) >= PONTOS.minimoParaPremio ? (PREMIO_DO_TIER[tier] ?? 0) : 0;

/* A virada de UMA conta: o lançamento do reset (≤ 0) e o do prêmio (≥ 0). O
   reset vem antes: o prêmio é da temporada que COMEÇA, e não é cortado pelo
   reset da que acabou. */
export function viradaDaConta({ saldo, tier, partidas }) {
  const s = Math.max(0, Number(saldo) || 0);
  return { reset: (carryoverDe(s) - s) || 0, premio: premioDaTemporada({ tier, partidas }) };
}
