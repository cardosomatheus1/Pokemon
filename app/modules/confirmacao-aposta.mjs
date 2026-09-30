/* A LINHA DA CONFIRMAÇÃO DA APOSTA (ST-5.9) — camada 0.
 *
 * O Q7 da ST-5.9 (teste dos 3 segundos) achou que antes de confirmar o
 * retorno aparecia só como multiplicador — "x10.82" —, e o valor que se
 * recebe (541) só depois, no cartão da rodada. Quem nunca apostou não faz a
 * conta de cabeça: a linha passa a dizer os dois. A conta é a mesma do resto
 * da tela (`Math.floor(valor × odd)`), agora num lugar só. */
export const retornoSeVencer = (valor, odd) => Math.floor(valor * odd);

export function linhaDaConfirmacao({ cur, valor, nome, odd }) {
  const n = v => v.toLocaleString('pt-BR');
  return `<b>${cur} ${n(valor)}</b> em <b>${nome ?? ''}</b>` +
    (odd ? ` · x${odd.toFixed(2)} · recebe <b>${cur} ${n(retornoSeVencer(valor, odd))}</b>` : '');
}
