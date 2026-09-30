/* O STAKE DA LIGA NA FILA DE BÔNUS (ST-11.10 · Spec §9.6, §9.9, §28.3).
 *
 * Puro: entra o tier dos dois, o saldo e o resultado; sai quanto cada um põe,
 * de que balde, o pot, o rake e quem recebe o quê. A gravação é do
 * `server/stake-liga.mjs`, e ela nasce DESLIGADA (a bandeira
 * `league_stake_enabled`, ST-11.9) — ligar é a decisão D2, do dono.
 *
 * ── AS QUATRO REGRAS, E DE ONDE VEM CADA UMA ────────────────────────────
 *
 *   SÓ PC-B E PC-C   a fila de bônus (§9.6) aceita bônus e competitivo, e
 *                    nada mais: misturar com transferível é a rota que a
 *                    simulação mostrou para lavar bônus em valor (§9.6,
 *                    "separação dos pools")
 *   O RAKE É 10%     do pot, explícito ANTES de confirmar, e sai do pot —
 *                    não é cobrado de um lado só
 *   O GANHO É BÔNUS  a parte do adversário que o vencedor leva entra como
 *                    PC-B: "a vitória isolada não transforma a contribuição
 *                    do adversário em PC-C" (§9.6). O stake PRÓPRIO volta
 *                    pelos baldes de onde saiu
 *   NÃO CONTOU,      a partida fora do ranking (ST-11.8) é o cancelamento
 *   DEVOLVE          técnico: os dois recebem 100% de volta, sem rake. O
 *                    empate também devolve, sem rake — não houve vencedor
 *                    de quem cobrar (decisão escrita no PLANO)
 *
 * E a conta que fecha sempre: o que os dois recebem, mais o rake, é o pot.
 */
export const STAKE_DO_TIER = Object.freeze({
  Bronze: 50, Silver: 100, Gold: 250, Platinum: 500, Diamond: 1000, Master: 2500, Champion: 5000,
});
export const RAKE = 0.10;
export const BALDES_DO_STAKE = Object.freeze(['bonus', 'competitivo']);

/* O stake da partida: o do tier MAIS BAIXO dos dois. Ninguém é levado a
   apostar acima do próprio tier porque o adversário está mais alto. */
export function stakeDaPartida(tierA, tierB) {
  const a = STAKE_DO_TIER[tierA], b = STAKE_DO_TIER[tierB];
  return a && b ? Math.min(a, b) : null;
}

export function potDe(stake) {
  const pot = 2 * stake, rake = Math.round(pot * RAKE);
  return { pot, rake, payout: pot - rake };
}

/* De que balde sai o stake: bônus primeiro (a moeda promocional é a que mais
   deve circular), depois competitivo. Transferível e comprado nunca. */
export function planoDoStake(saldos, stake) {
  const composicao = {};
  let falta = stake;
  for (const b of BALDES_DO_STAKE) {
    const usa = Math.min(falta, Math.max(0, Number(saldos?.[b]) || 0));
    if (usa > 0) { composicao[b] = usa; falta -= usa; }
  }
  return falta > 0 ? { ok: false, falta } : { ok: true, composicao };
}

/* A liquidação. `contado`: a partida entrou no ranking. Devolve, para cada
   lado, se o stake volta e quanto ganha além dele; e o rake. */
export function liquidacaoDoStake({ vencedor, stake, contado }) {
  const devolve = { A: { devolve: true, ganho: 0 }, B: { devolve: true, ganho: 0 } };
  if (!contado) return { estado: 'devolvida', rake: 0, ...devolve };
  if (vencedor !== 'A' && vencedor !== 'B') return { estado: 'empate', rake: 0, ...devolve };
  const { rake } = potDe(stake), perdedor = vencedor === 'A' ? 'B' : 'A';
  return { estado: 'liquidada', rake, [vencedor]: { devolve: true, ganho: stake - rake }, [perdedor]: { devolve: false, ganho: 0 } };
}

/* O total que cada lado recebe (o stake de volta, mais o ganho): a conta do aceite. */
export const recebido = (l, lado, stake) => (l[lado].devolve ? stake : 0) + l[lado].ganho;
