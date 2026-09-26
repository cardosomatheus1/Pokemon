/* OS TIPOS DE BOLO — o que muda de um mercado para outro (ST-12.7).
 *
 * O bolo (`mercado.mjs`) e a apuração (`engine/mutuo.mjs`) não sabem o que é
 * "abates" ou "pódio": só sabem comparar seleções. O que cada mercado sabe
 * mora aqui, uma linha por mercado, e mais nada:
 *
 *   valida       a seleção existe nesta rodada?
 *   vencedoras   quem venceu, a partir do resultado recalculado da rodada
 *   regra        o texto que o jogador lê ANTES de entrar (§6.4)
 *   lista        as seleções que a tela lista sempre (os 12 lutadores, as 4
 *                faixas) — ou `null`: só as que têm entrada (1.320 trincas não
 *                cabem numa tela)
 *   modelo       o preço carimbado na abertura (§6.6)
 *   espaco       o tamanho do espaço de seleções, para a leitura (ST-12.9)
 *
 * UM MERCADO POR VEZ (§6.5): o padrão é só o de abates. `MERCADOS=abates,podio`
 * abre o pódio junto — decisão de operação, quando a liquidez justificar
 * (ST-12.10 mede).
 */
import { selecoesDeAbates, vencedorasPorAbates, REGRA_ABATES, precoDoModeloAbates } from '../engine/mercado-abates.mjs';
import { trincaValida, vencedorasPorPosicoes, REGRA_PODIO, precoDoModeloPodio, BASE } from '../engine/mercado-podio.mjs';
import { LIMITES_DURACAO, selecoesDaDuracao, vencedorasPorDuracao, REGRA_DURACAO, precoDoModeloDuracao } from '../engine/mercado-duracao.mjs';
import { M, elencoDaRaiz } from './rodada.mjs';

export const TIPOS_DE_MERCADO = Object.freeze({
  abates: {
    valida: (s, n) => Number.isInteger(s) && selecoesDeAbates(n).includes(s),
    vencedoras: resultado => vencedorasPorAbates(resultado.map(x => x.abates)),
    regra: REGRA_ABATES, lista: n => Array.from({ length: n }, (_, i) => i),
    modelo: (raiz, sims) => precoDoModeloAbates(M, elencoDaRaiz(raiz), raiz, sims),
    espaco: n => n,
  },
  podio: {
    valida: (s, n) => trincaValida(s, n),
    vencedoras: resultado => vencedorasPorPosicoes(resultado.map(x => x.pos)),
    regra: REGRA_PODIO, lista: () => null,
    modelo: (raiz, sims) => precoDoModeloPodio(M, elencoDaRaiz(raiz), raiz, sims),
    espaco: () => BASE ** 3,
  },
  /* ST-12.8: a duração vem junto do resultado recalculado (`resultado.duracao`,
     a mesma luta do D-119). */
  duracao: {
    valida: s => selecoesDaDuracao().includes(s),
    vencedoras: resultado => vencedorasPorDuracao(resultado.duracao),
    regra: REGRA_DURACAO, lista: () => selecoesDaDuracao(),
    modelo: (raiz, sims) => precoDoModeloDuracao(M, elencoDaRaiz(raiz), raiz, sims),
    espaco: () => LIMITES_DURACAO.length + 1,
  },
});

export { MERCADOS_CONHECIDOS, MERCADOS_PADRAO, lerMercados } from './mercados-config.mjs';
