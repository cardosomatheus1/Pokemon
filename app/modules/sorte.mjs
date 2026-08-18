/* Aleatoriedade da apresentação — dois fluxos, ambos vindos do ramo `visual`
 * da árvore de sementes (Spec §P3).
 *
 * Antes do F0.5 a apresentação sorteava com `Math.random()` em 25 lugares:
 * posição das partículas de chuva, ordem de entrada dos lutadores, deslocamento
 * do tremor de tela, confete, frase da torcida. Nada disso muda quem vence — e
 * é justamente por isso que ficou de fora por tanto tempo. O problema é outro:
 * enquanto existir um `Math.random()` no caminho, "a mesma raiz reproduz a
 * rodada" é falso, e a auditoria do §25.2 vale só para metade da tela.
 *
 * DOIS FLUXOS, e a separação importa:
 *
 *   coreo()    movimento dos lutadores, ordem de entrada. É o antigo
 *              `S.moveRng`, com a mesma sequência de sempre.
 *   enfeite()  partículas, confete, tremor, frases. Puro adorno.
 *
 * Fossem um fluxo só, acrescentar uma partícula de neve deslocaria todos os
 * sorteios da coreografia — e uma mudança de enfeite viraria mudança de
 * movimento. Fluxos separados isolam isso.
 */
import { rng } from './motor.mjs';
import { derivar } from '../../engine/seed.mjs';

/* Sementes de partida, para o caso de alguém desenhar antes da primeira
   rodada (o boot desenha o mapa vazio). Fixas de propósito: nem aqui entra
   Math.random. */
let rCoreo   = rng(0x5EED0001);
let rEnfeite = rng(0x5EED0002);

export function semearVisual(sementeVisual) {
  rCoreo   = rng(derivar(sementeVisual, 'coreografia'));
  rEnfeite = rng(derivar(sementeVisual, 'enfeite'));
}

export function coreo()   { return rCoreo(); }
export function enfeite() { return rEnfeite(); }
