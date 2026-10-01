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

/* O AVISO NO MEIO DA ARENA durante a aposta (ST-5.10 · L-215). Com o
   lutador escolhido e ainda não confirmado, "escolha seu lutador" mandava
   fazer o que já estava feito: o passo que falta é CONFIRMAR. A aposta já
   feita continua ganhando — escolher outro é trocar, e ela vale até lá. */
/* E QUEM SÓ ASSISTE (o visitante, no site) não tem passo nenhum a dar na lista:
   o aviso diz que a luta vem sozinha e onde fica a porta para apostar. */
export const AVISO_DE_QUEM_ASSISTE = 'A próxima luta começa sozinha<i>crie o seu treinador para apostar</i>';
export function textoDoAviso({ apostado = null, escolhido = null, assistindo = false } = {}) {
  if (assistindo) return AVISO_DE_QUEM_ASSISTE;
  if (apostado) return `<b>${apostado.nome}</b> é a sua aposta · x${apostado.odd.toFixed(2)}<i>toque em outro para trocar</i>`;
  if (escolhido) return `Confirme <b>${escolhido.nome}</b> no cartão da aposta<i>ou toque em outro lutador</i>`;
  return 'Escolha seu lutador na lista de odds<i>a rodada corre sozinha depois</i>';
}
