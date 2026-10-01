/* AS ROTAS DO MARKET ENTRE JOGADORES (ST-14.9 · E14 · spec E14 §10).
 *
 * `/api/player-market/*`, e não `/api/mercado/*` — esse é o bolo mútuo do
 * E12, e os dois nunca se misturam. Toda rota exige sessão; toda escrita usa
 * o `agora` do SERVIDOR. A busca de verdade (filtros e cursor) é da ST-14.10;
 * aqui a vitrine é a lista dos ativos mais novos.
 */
import PACK from '../content/escolhido.mjs';
import { CHECKPOINT_25_1 } from '../engine/feature-flags.mjs';
import { normalizarBusca, ERRO_BUSCA } from '../engine/busca-mercado.mjs';
import { buscarAnuncios } from './mercado-jogadores-busca.mjs';
import { historicoDaSerie, serieDoPedido, ERRO_HISTORICO } from './mercado-jogadores-historico.mjs';
import { anunciar, comprar, cancelarAnuncio, detalheDoAnuncio, vitrine, meusAnuncios, minhasCompras, ERRO_MERCADO_P2P } from './mercado-jogadores.mjs';

const texto = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
const recusa = msg => ({ status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: msg } });

export const STATUS_DO_MERCADO_P2P = Object.freeze({
  [ERRO_MERCADO_P2P.NAO]: 404, [ERRO_MERCADO_P2P.ENTRADA]: 400,
  [ERRO_BUSCA]: 400, [ERRO_HISTORICO.SERIE]: 400, [ERRO_HISTORICO.NAO]: 404, [ERRO_HISTORICO.JA]: 409,
  [ERRO_MERCADO_P2P.ESTADO]: 409, [ERRO_MERCADO_P2P.DESATUALIZADO]: 409, [ERRO_MERCADO_P2P.RECUSADA]: 409,
});

export function rotasDoMercadoP2P(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  /* A mesma costura de teste das trocas: só em `ambiente: 'teste'`. */
  const cp = config => (config?.ambiente === 'teste' && config.checkpointTeste) ? config.checkpointTeste : CHECKPOINT_25_1;
  return {
    'GET /api/player-market/anuncios': ({ db, agora }) => ({ corpo: { anuncios: vitrine(db, { pack: PACK, agora }) } }),
    /* ST-14.10: a busca — filtros E, ordem de lista fechada, cursor estável. */
    'GET /api/player-market/busca': ({ db, query, agora }) =>
      tentar(() => buscarAnuncios(db, { pack: PACK, agora, busca: normalizarBusca(query) })),
    /* ST-14.12: o histórico de uma série — normal e shiny nunca juntos. */
    'GET /api/player-market/historico': ({ db, query, agora }) =>
      tentar(() => historicoDaSerie(db, { pack: PACK, serie: serieDoPedido(query), agora })),
    'GET /api/player-market/anuncio': ({ db, query, userId, agora }) => {
      const id = query?.get?.('id');
      if (!texto(id)) return recusa('id inválido');
      return tentar(() => detalheDoAnuncio(db, { anuncioId: id, userId, agora }));
    },
    'GET /api/player-market/meus': ({ db, userId }) => ({ corpo: { anuncios: meusAnuncios(db, { userId }), compras: minhasCompras(db, { userId }) } }),
    'POST /api/player-market/anunciar': ({ db, corpo, userId, agora, config }) =>
      tentar(() => anunciar(db, { userId, pack: PACK, ativo: corpo?.ativo ?? {}, preco: corpo?.preco, agora, checkpoint: cp(config) })),
    'POST /api/player-market/comprar': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.id) || !Number.isSafeInteger(corpo?.versao) || !Number.isSafeInteger(corpo?.preco)) return recusa('id, versão ou preço inválidos');
      return tentar(() => comprar(db, { userId, anuncioId: corpo.id, versao: corpo.versao, preco: corpo.preco, chaveIdem: corpo.chave, agora, checkpoint: cp(config) }));
    },
    'POST /api/player-market/cancelar': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.id)) return recusa('id inválido');
      return tentar(() => cancelarAnuncio(db, { userId, anuncioId: corpo.id, agora }));
    },
  };
}
