/* O ANTI-WIN-TRADING DA LIGA — antes de qualquer valor (ST-11.8 · F5.8 · Spec §9.12).
 *
 * Puro: entram as partidas recentes (quem contra quem, quem venceu, quando);
 * saem os SINAIS de um par, com o número que os sustenta — e se a partida é
 * elegível. Nada aqui pune: a partida com sinal continua gravada e revista, só
 * fica FORA DO RANKING (não mexe no Liga MMR) e, quando houver valor (ST-11.10),
 * fora do PC-C. Quem decide mais que isso é um operador, pelo registro.
 *
 *   REPETIÇÃO      o mesmo par `repeticaoMax` vezes ou mais em `janelaMs`
 *   ALTERNÂNCIA    as últimas `alternanciaMin` vitórias do par trocando de
 *                  lado, uma a uma — o "hoje você, amanhã eu" do §9.12
 *   CONCENTRAÇÃO   uma conta com `concentracaoFracao` ou mais das partidas da
 *                  janela contra um só adversário, com `concentracaoMin` ou mais
 *
 *   COOLDOWN       o par não se enfrenta de novo em `cooldownMs` — a ação mais
 *                  barata, que não precisa de detecção nenhuma
 *
 * Os sinais de DISPOSITIVO e REDE (§9.12, "padrões de IP/device") esperam a
 * política do dono (L-050): aqui só entra o que o banco já guarda.
 */
export const INTEGRIDADE = Object.freeze({
  cooldownMs: 6 * 3_600_000, janelaMs: 7 * 86_400_000,
  repeticaoMax: 5, alternanciaMin: 4, concentracaoMin: 8, concentracaoFracao: 0.6,
});

const doPar = (a, b) => p => (p.userA === a && p.userB === b) || (p.userA === b && p.userB === a);
const vencedorDe = p => (p.vencedor === 'A' ? p.userA : p.vencedor === 'B' ? p.userB : null);

export const emCooldown = (partidas, a, b, agora, L = INTEGRIDADE) =>
  (partidas ?? []).some(p => doPar(a, b)(p) && agora - p.criadaEm < L.cooldownMs);

export function sinaisDoPar(partidas, a, b, agora, L = INTEGRIDADE) {
  const par = (partidas ?? []).filter(p => doPar(a, b)(p) && p.criadaEm > agora - L.janelaMs).sort((x, y) => x.criadaEm - y.criadaEm);
  const sinais = [];
  if (par.length >= L.repeticaoMax) sinais.push({ sinal: 'repeticao', n: par.length });
  /* A alternância: quantas das últimas vitórias trocam de lado, uma a uma. */
  const venc = par.map(vencedorDe);
  let alterna = venc.length && venc.at(-1) ? 1 : 0;
  for (let i = venc.length - 1; i > 0 && venc[i] && venc[i - 1] && venc[i] !== venc[i - 1]; i--) alterna++;
  if (alterna >= L.alternanciaMin) sinais.push({ sinal: 'alternancia', n: alterna });
  return sinais;
}

export function concentracaoDe(partidas, user, agora, L = INTEGRIDADE) {
  const minhas = (partidas ?? []).filter(p => (p.userA === user || p.userB === user) && p.criadaEm > agora - L.janelaMs);
  if (minhas.length < L.concentracaoMin) return null;
  const por = new Map();
  for (const p of minhas) { const o = p.userA === user ? p.userB : p.userA; por.set(o, (por.get(o) ?? 0) + 1); }
  const [outro, n] = [...por.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
  const fracao = n / minhas.length;
  return fracao >= L.concentracaoFracao ? { sinal: 'concentracao', user, outro, n, total: minhas.length, fracao: +fracao.toFixed(3) } : null;
}

/* Todos os sinais de uma partida recém-jogada entre `a` e `b` (ela incluída). */
export function sinaisDaPartida(partidas, a, b, agora, L = INTEGRIDADE) {
  return [...sinaisDoPar(partidas, a, b, agora, L), concentracaoDe(partidas, a, agora, L), concentracaoDe(partidas, b, agora, L)].filter(Boolean);
}
export const elegivel = sinais => !(sinais ?? []).length;
