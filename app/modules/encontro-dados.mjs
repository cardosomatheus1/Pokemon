/* O QUADRO DE ENCONTROS COM O QUE A E14 TROUXE (ST-14.0D) — camada 0.
 *
 * O servidor já decide três coisas que a tela do lance não mostrava:
 *
 *   o SHINY       sorteado quando o encontro foi gravado (ST-14.1) — e o
 *                 jogador precisa saber ANTES de escolher a bola
 *   a GARANTIDA   a bola que o pack marca `guaranteed_capture` (ST-14.4) —
 *                 não é das `pack.bolas`, então não aparecia; e por ser a mais
 *                 rara, o lance com ela pede confirmação
 *   o que PRENDE  a bola sai do lote mais antigo (ST-14.0C); se ele é de
 *                 origem presa (bônus, legado), a criatura capturada nasce
 *                 presa — a spec E14 §4.3 pede o aviso ANTES (L-224)
 *
 * Tudo decidido aqui, em Node; a tela só pinta o que sai daqui.
 */
import { garantida } from '../../engine/captura.mjs';
import { negociavelPelaOrigem } from '../../engine/proveniencia.mjs';

/* As bolas do quadro: as do pack, e a garantida só quando a pessoa tem —
   oferecer a que não se tem seria um botão sempre apagado, e um anúncio. */
export function bolasDoLance(pack, bolsa = {}) {
  const comuns = (pack?.bolas ?? []).map(b => ({ id: b.id, rotulo: b.rotulo, tem: bolsa[b.id] ?? 0, garantida: false }));
  const raras = (pack?.catalogo ?? [])
    .filter(i => garantida(pack, i.id) && (bolsa[i.id] ?? 0) > 0)
    .map(i => ({ id: i.id, rotulo: i.nome ?? i.id, tem: bolsa[i.id], garantida: true }));
  return [...comuns, ...raras];
}

export const seloDoEncontro = en => (en?.shiny ? { texto: '✦ brilhante', classe: 'encShiny' } : null);

/* A bola gasta sai do lote MAIS ANTIGO — a mesma ordem do débito do
   servidor. Sem lotes (o aparelho sem conta), não há o que prender. */
export function consequenciaDoLance(lotes, bola) {
  const primeiro = (lotes?.[bola] ?? []).find(l => (l.quantidade ?? 0) > 0);
  if (!primeiro || negociavelPelaOrigem(primeiro.classe)) return null;
  return { classe: primeiro.classe, texto: 'prende', dica: 'esta bola veio de bônus ou de antes da conta — quem ela pegar não vai para troca' };
}

/* A pergunta antes do lance com a garantida. `null` quando não há o que
   perguntar — a tela lança direto. */
export function confirmacaoDoLance(pack, { bola, nome, shiny = false }) {
  if (!garantida(pack, bola)) return null;
  const rotulo = (pack?.catalogo ?? []).find(i => i.id === bola)?.nome ?? bola;
  return `Usar ${rotulo} em ${nome}${shiny ? ' (brilhante)' : ''}? A captura é certa — e esta bola é rara: ela não volta para a bolsa.`;
}
