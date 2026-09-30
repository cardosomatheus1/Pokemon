/* A ARENA VOLTA À TELA QUANDO A LUTA COMEÇA (ST-5.9 · L-207) — camada 0.
 *
 * Medido em 30/09: o app não rolava sozinho. Quem rola é o jogador, para
 * alcançar o cartão da aposta, que nasce abaixo da dobra; e em coluna única a
 * arena mora embaixo da lista durante a aposta. Nos dois casos, quando a
 * aposta fecha, o acontecimento está fora da tela.
 *
 * A regra: ao SAIR da aposta (para a contagem ou direto para a luta), quem
 * apostou tem a arena de volta — se ela estiver mais fora do que dentro. Quem
 * não apostou pode estar lendo outra coisa, e não é levado à força; a arena
 * escondida (outra aba) não conta. Medir a caixa é do navegador; decidir é
 * daqui. */
/* 0,75 e não 0,6: com 0,6 a arena de 420 ficava com 61% à vista e não
   voltava — o K.O. na borda de baixo (medido no Q5). */
export const FRACAO_VISIVEL = 0.75;
const SAIDAS = new Set(['countdown', 'fighting']);

export function deveVoltarArena({ de, para, apostou, arena, altura }) {
  if (de !== 'betting' || !SAIDAS.has(para) || !apostou) return false;
  const h = (arena?.bottom ?? 0) - (arena?.top ?? 0);
  if (!(h > 0) || !(altura > 0)) return false;
  const visivel = Math.max(0, Math.min(arena.bottom, altura) - Math.max(arena.top, 0));
  return visivel / h < FRACAO_VISIVEL;
}
