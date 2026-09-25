/* DUAS ABAS NO MESMO IDLE (ST-3.2).
 *
 * O `ar_idle` mora no navegador, e duas abas abertas carregavam o mesmo estado
 * e gravavam por cima uma da outra — a mesma expedição colhida duas vezes. A
 * gravação passou a ser otimista (`salvar`, em `idle-dados.mjs`): quem carregou
 * uma revisão velha não grava. Este módulo é a outra metade, a da TELA:
 *
 *   vigiarOutraAba   o evento `storage` dispara nas OUTRAS abas quando uma
 *                    grava; recarregar nesse instante faz a recusa do save
 *                    quase nunca precisar acontecer
 *   AVISO_OUTRA_ABA  o que o jogador lê quando ela acontece mesmo assim — o
 *                    disco venceu, e a tela diz por que o que ele viu sumiu
 *
 * Separado da `idle-tela.mjs` porque ela tem teto de tamanho, e porque isto é
 * uma responsabilidade própria: coerência entre abas, e não pintura. */
export const AVISO_OUTRA_ABA = 'Outra aba mexeu no seu idle — recarreguei o que está salvo.';

export function vigiarOutraAba({ chave, aoMudar, alvo = globalThis }) {
  if (typeof alvo?.addEventListener !== 'function') return false;
  alvo.addEventListener('storage', ev => { if (ev?.key === chave) aoMudar(); });
  return true;
}
