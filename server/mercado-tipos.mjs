/* OS TIPOS DE BOLO — o que muda de um mercado para outro (ST-12.7).
 *
 * O bolo (`mercado.mjs`) e a apuração (`engine/mutuo.mjs`) não sabem o que é
 * "abates" ou "pódio": só sabem comparar seleções. O que cada mercado sabe
 * mora aqui, uma linha por mercado, e mais nada:
 *
 *   valida       a seleção existe nesta rodada?
 *   vencedoras   quem venceu, a partir do resultado recalculado da rodada
 *   regra        o texto que o jogador lê ANTES de entrar (§6.4)
 *   listaTodas   a tela lista todas as seleções (12 lutadores) ou só as que
 *                têm entrada (1.320 trincas não cabem numa tela)
 *   modelo       o preço carimbado na abertura (§6.6)
 *   espaco       o tamanho do espaço de seleções, para a leitura (ST-12.9)
 *
 * UM MERCADO POR VEZ (§6.5): o padrão é só o de abates. `MERCADOS=abates,podio`
 * abre o pódio junto — decisão de operação, quando a liquidez justificar
 * (ST-12.10 mede).
 */
import { selecoesDeAbates, vencedorasPorAbates, REGRA_ABATES, precoDoModeloAbates } from '../engine/mercado-abates.mjs';
import { trincaValida, vencedorasPorPosicoes, REGRA_PODIO, precoDoModeloPodio, BASE } from '../engine/mercado-podio.mjs';
import { M, elencoDaRaiz } from './rodada.mjs';

export const TIPOS_DE_MERCADO = Object.freeze({
  abates: {
    valida: (s, n) => Number.isInteger(s) && selecoesDeAbates(n).includes(s),
    vencedoras: resultado => vencedorasPorAbates(resultado.map(x => x.abates)),
    regra: REGRA_ABATES, listaTodas: true,
    modelo: (raiz, sims) => precoDoModeloAbates(M, elencoDaRaiz(raiz), raiz, sims),
    espaco: n => n,
  },
  podio: {
    valida: (s, n) => trincaValida(s, n),
    vencedoras: resultado => vencedorasPorPosicoes(resultado.map(x => x.pos)),
    regra: REGRA_PODIO, listaTodas: false,
    modelo: (raiz, sims) => precoDoModeloPodio(M, elencoDaRaiz(raiz), raiz, sims),
    espaco: () => BASE ** 3,
  },
});

export { MERCADOS_CONHECIDOS, MERCADOS_PADRAO, lerMercados } from './mercados-config.mjs';
