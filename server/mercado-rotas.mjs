/* AS ROTAS DO BOLO MÚTUO (ST-12.3) — espalhadas em `ROTAS` pelo `rotas.mjs`.
 *
 * Todas exigem sessão (nenhuma entra em `ROTAS_PUBLICAS`), e o usuário sai da
 * sessão, nunca do pedido. O CORPO É LIDO CAMPO A CAMPO: `mercado`, `rodada` e
 * `odd`, se vierem, são descartados aqui — o bolo é sempre o da rodada aberta.
 */
import { anotar } from './telemetria.mjs';
import { entrarNoMercado, sairDoMercado, mercadoParaCliente, resultadoDoMercado, leituraNoBolo } from './mercado.mjs';

const inteiro = v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
/* O MERCADO PEDIDO (ST-12.7): texto curto, e só isso — o bolo confere se ele
   está aberto nesta rodada. Sem pedido, o de abates. */
const tipoPedido = v => (typeof v === 'string' && v.length <= 16 ? v : 'abates');
/* A query chega como `URLSearchParams` (é o que o servidor entrega). Ler
   `query.kind` devolvia sempre o de abates — o teste passava com um objeto
   simples no lugar da forma real (achado no OLHAR do pódio). */
const daQuery = (query, k) => (typeof query?.get === 'function' ? query.get(k) : undefined);

export function rotasDoMercado(daExcecao) {
  return {
    'GET /api/mercado': ({ db, sched, userId, query }) =>
      ({ corpo: { ...(mercadoParaCliente(db, { sched, userId, kind: tipoPedido(daQuery(query, 'kind')) }) ?? { fase: null }),
                  abertos: sched.mercados ?? ['abates'] } }),

    /* O último bolo PAGO, com o preço do modelo ao lado (ST-12.5). Nunca o em
       curso: a consulta só enxerga bolo liquidado e publicado. */
    'GET /api/mercado/resultado': ({ db, userId, query }) =>
      ({ corpo: resultadoDoMercado(db, { userId, kind: tipoPedido(daQuery(query, 'kind')) }) ?? { id: null } }),

    /* A leitura de QUEM PERGUNTA (ST-12.9): contra o bolo, contra o modelo, e
       quem estava certo. Só bolos pagos. */
    'GET /api/mercado/leitura': ({ db, userId }) => ({ corpo: leituraNoBolo(db, { userId }) }),

    'POST /api/mercado/entrar': ({ db, sched, corpo, userId, agora }) => {
      try {
        const e = entrarNoMercado(db, { sched, userId, kind: tipoPedido(corpo?.kind), selecao: inteiro(corpo?.selecao),
                                        valor: inteiro(corpo?.valor), agora });
        /* ST-12.10: a entrada vira evento de produto, anotado AQUI e sem
           amostragem — o cliente nunca diz quanto pôs. Chave = a entrada + o
           valor (trocar é outro fato). */
        anotar(db, { nome: 'market_entry', userId, chave: `${e.id}:${e.selecao}:${e.valor}`, agora,
                     campos: { valor: e.valor, selecao: e.selecao, mercado: e.kind } });
        return { corpo: e };
      } catch (e) { return daExcecao(e); }
    },

    'POST /api/mercado/sair': ({ db, sched, corpo, userId, agora }) => {
      try { return { corpo: sairDoMercado(db, { sched, userId, kind: tipoPedido(corpo?.kind), agora }) }; }
      catch (e) { return daExcecao(e); }
    },
  };
}
