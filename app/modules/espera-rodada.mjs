/* A ESPERA PELA PRÓXIMA RODADA, DITA COMO É — camada 0 (D-113).
 *
 * No modo servidor a arena só aceita aposta com a janela aberta, e quem chega
 * no meio da luta espera a próxima. Essa espera existia e era escondida atrás
 * da tela de carregamento, que dizia "simulando 154.000 batalhas" — falso no
 * modo servidor, e por até 54 s medidos no ensaio do piloto.
 *
 * A conta é do SERVIDOR: `proximaEm` vem na rodada. O cliente não soma
 * duração de fase — as constantes moram no scheduler, e uma cópia aqui
 * envelheceria calada no dia em que a luta mudasse de tamanho. */
export function textoDaEspera(rodada, agora = Date.now()) {
  if (rodada?.fase === 'aberta') return null;
  if (!Number.isFinite(rodada?.proximaEm))
    return { segundos: null, texto: 'Conectando à arena…' };
  const segundos = Math.max(0, Math.ceil((rodada.proximaEm - agora) / 1000));
  return {
    segundos,
    texto: segundos > 0
      ? `A rodada atual já está em luta. A próxima abre em ${segundos} s.`
      : 'A próxima rodada abre em instantes.',
  };
}
