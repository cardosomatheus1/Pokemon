/* Catálogo das arenas — o QUE existe e QUAL sai na rodada. Sem uma linha de
 * desenho e sem tocar o DOM, de propósito: a escolha é lógica, e lógica se
 * testa no Node. A pintura mora em `arenas.mjs`, que precisa do canvas.
 *
 * É a mesma separação de `sprites-dados`/`sprites` e `efeitos-dados`/`efeitos`,
 * e ela existe porque a parte que pode estar ERRADA é esta: um sorteio que não
 * sai da raiz da rodada quebra a reprodutibilidade que o F0.5 comprou, e um
 * peso zerado deixa uma arena inalcançável sem que nada avise.
 *
 * A ARENA É COSMÉTICA, E PRECISA CONTINUAR SENDO. Ela não entra em `simular`,
 * não mexe em stat, não muda a geometria da ilha — a coreografia inteira é
 * calculada sobre a mesma superelipse, e trocá-la por arena significaria
 * recalibrar cinco vezes e abrir a porta para lutador andando fora do mapa.
 * O que muda é a PELE.
 *
 * DIFERENÇA PARA O CLIMA, que é a razão de a arena ser anunciada de cara: o
 * clima dá bônus de stat e por isso fica em segredo até as apostas fecharem
 * (§4.3). A arena não dá nada, então esconder só tiraria informação inócua de
 * quem está escolhendo o lutador.
 */
import { rng } from './motor.mjs';
import { derivar } from '../../engine/seed.mjs';

/* `poeira` é a cor da poeirinha que cada pisada levanta — dado, não desenho:
   quem pinta é o render, que só precisa da cor. Areia clara na ilha, rocha
   escura no vulcão; usar a mesma nas cinco entregava pisada bege na lava. */
export const ARENAS = [
  { key:'tropical', nome:'Ilha Tropical',    emoji:'🏝️', peso:20, poeira:'#efe2bd' },
  { key:'neve',     nome:'Campo Gelado',     emoji:'❄️', peso:20, poeira:'#e8f4fb' },
  { key:'coliseu',  nome:'Coliseu',          emoji:'🏛️', peso:20, poeira:'#e6d7b6' },
  { key:'praia',    nome:'Praia',            emoji:'🏖️', peso:20, poeira:'#f7e8c0' },
  { key:'vulcao',   nome:'Cratera Vulcânica', emoji:'🌋', peso:20, poeira:'#6b524a' },
];

/* O RÓTULO É A DECISÃO DE PROJETO, não o número.
 *
 * A arena sai de `derivar(visual, 'arena')` — um ramo próprio do `visual`,
 * irmão de `coreografia` e `enfeite` (ver `sorte.mjs`). Duas alternativas
 * foram descartadas, e as duas por motivo concreto:
 *
 *   consumir de `enfeite()`  — o sorteio passaria a andar junto com as
 *                              partículas: acrescentar um floco de neve
 *                              trocaria a arena da rodada.
 *   derivar de `batalha`     — a arena é ANUNCIADA na fase de aposta, e o
 *                              ramo da batalha é o que o §4.5 mantém fechado
 *                              até o revelar. Publicar uma função dele seria
 *                              vazar um pedaço do segredo antes da hora.
 */
export function sortearArena(sementeVisual) {
  const R = rng(derivar(sementeVisual, 'arena'));
  const total = ARENAS.reduce((a, x) => a + x.peso, 0);
  let r = R() * total;
  for (const a of ARENAS) { r -= a.peso; if (r <= 0) return a; }
  /* Só se chega aqui por erro de ponto flutuante na última fatia. Devolver a
     primeira é o mesmo que o laço faria; devolver `undefined` derrubaria o
     desenho da rodada inteira por um epsilon. */
  return ARENAS[0];
}

export const arenaPorChave = k => ARENAS.find(a => a.key === k) ?? null;
