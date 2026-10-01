/* AS ROTAS DO DOCE (ST-9.9) — espalhadas em `ROTAS` pelo `rotas.mjs`.
 *
 * As duas exigem sessão, e o usuário sai da sessão: resgatar o doce de outro
 * é impossível por construção, e a QUANTIDADE nunca vem do pedido — o corpo
 * só traz a chave de idempotência.
 */
import { docesDe, docesPresosDe, resgatarDoces } from './doce.mjs';

export function rotasDoDoce(daExcecao) {
  return {
    /* ST-14.3d: e quantos de cada linha são presos — para o aviso de antes. */
    'GET /api/doces': ({ db, userId }) => ({ corpo: { doces: docesDe(db, userId), presos: docesPresosDe(db, userId) } }),

    'POST /api/doces/resgatar': ({ db, corpo, userId, agora }) => {
      try { return { corpo: resgatarDoces(db, { userId, chaveIdem: corpo?.chaveIdem, agora }) }; }
      catch (e) { return daExcecao(e); }
    },
  };
}
