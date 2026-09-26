/* O DOSSIÊ AO LADO DA APOSTA — as notas da rodada (ST-9.4 · F3.12).
 *
 * Lê a escada do jogador (save do idle + marcas da Arena) e devolve uma nota
 * por lutador. A decisão mora em `dossie-ficha.mjs` (camada 0); aqui só se
 * junta o que ela precisa, sem DOM — o teste roda em Node.
 *
 * POR QUE UM GANCHO, E NÃO UM IMPORT NO PAINEL: `odds.mjs` é o módulo que
 * PRECIFICA. "Informação não é probabilidade" tem teste de grafo — nenhum
 * módulo de preço importa o dossiê —, e o painel recebendo a nota por um
 * gancho (`usarNotasDaLinha`, ligado no `index.html`) mantém isso verdadeiro
 * sem separar o painel do preço agora.
 */
import { PACK } from './motor.mjs';
import { carregar } from './idle-dados.mjs';
import { degrauDe, carregarMarcas, dossieDoPack } from './pokedex-estado.mjs';
import { notaDaAposta, legendaDasNotas } from './dossie-ficha.mjs';

/* Uma leitura do save e das marcas por desenho da lista, e não doze. */
export function notasDaRodada(lutadores, { estado = carregar(), marcas = carregarMarcas(), conteudo = PACK } = {}) {
  const dossie = dossieDoPack(conteudo);
  const notas = (lutadores ?? []).map(f => f && notaDaAposta({ dossie, degrau: degrauDe(conteudo, estado, f.dex, marcas), dex: f.dex }));
  /* A legenda viaja junto, como propriedade do array: o painel pinta as duas
     sem saber de onde vieram. */
  return Object.assign(notas, { legenda: legendaDasNotas(notas) });
}
