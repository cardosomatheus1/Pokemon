/* AS ROTAS DO BOLO MÚTUO (ST-12.3) — espalhadas em `ROTAS` pelo `rotas.mjs`.
 *
 * Todas exigem sessão (nenhuma entra em `ROTAS_PUBLICAS`), e o usuário sai da
 * sessão, nunca do pedido. O CORPO É LIDO CAMPO A CAMPO: `mercado`, `rodada` e
 * `odd`, se vierem, são descartados aqui — o bolo é sempre o da rodada aberta.
 */
import { anotar } from './telemetria.mjs';
import { entrarNoMercado, sairDoMercado, mercadoParaCliente, resultadoDoMercado, leituraNoBolo } from './mercado.mjs';

const inteiro = v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function rotasDoMercado(daExcecao) {
  return {
    'GET /api/mercado': ({ db, sched, userId }) =>
      ({ corpo: mercadoParaCliente(db, { sched, userId }) ?? { fase: null } }),

    /* O último bolo PAGO, com o preço do modelo ao lado (ST-12.5). Nunca o em
       curso: a consulta só enxerga bolo liquidado e publicado. */
    'GET /api/mercado/resultado': ({ db, userId }) => ({ corpo: resultadoDoMercado(db, { userId }) ?? { id: null } }),

    /* A leitura de QUEM PERGUNTA (ST-12.9): contra o bolo, contra o modelo, e
       quem estava certo. Só bolos pagos. */
    'GET /api/mercado/leitura': ({ db, userId }) => ({ corpo: leituraNoBolo(db, { userId }) }),

    'POST /api/mercado/entrar': ({ db, sched, corpo, userId, agora }) => {
      try {
        const e = entrarNoMercado(db, { sched, userId, selecao: inteiro(corpo?.selecao),
                                        valor: inteiro(corpo?.valor), agora });
        /* ST-12.10: a entrada vira evento de produto, anotado AQUI e sem
           amostragem — o cliente nunca diz quanto pôs. Chave = a entrada + o
           valor (trocar é outro fato). */
        anotar(db, { nome: 'market_entry', userId, chave: `${e.id}:${e.selecao}:${e.valor}`, agora,
                     campos: { valor: e.valor, selecao: e.selecao, mercado: e.kind } });
        return { corpo: e };
      } catch (e) { return daExcecao(e); }
    },

    'POST /api/mercado/sair': ({ db, sched, userId, agora }) => {
      try { return { corpo: sairDoMercado(db, { sched, userId, agora }) }; }
      catch (e) { return daExcecao(e); }
    },
  };
}
