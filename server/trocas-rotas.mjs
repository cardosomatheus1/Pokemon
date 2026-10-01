/* AS ROTAS DA TROCA DIRETA (ST-14.7 · E14 · spec E14 §9).
 *
 * Toda rota exige sessão (o despacho resolve `userId`), e toda escrita usa o
 * `agora` do SERVIDOR. A contraparte vem pelo NOME — a tela não conhece o id
 * de ninguém — e a resposta nunca devolve o id da outra conta.
 *
 * `/api/idle/trocar` continua sendo o que sempre foi: trocar posições da
 * PRÓPRIA equipe. Nada aqui mora sob `/api/idle`.
 */
import PACK from '../content/escolhido.mjs';
import { CHECKPOINT_25_1 } from '../engine/feature-flags.mjs';
import { criarTroca, ofertar, pronto, confirmar, cancelar, detalheDaTroca, minhasTrocas, ERRO_TROCA } from './trocas.mjs';

const texto = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
const inteiro = v => Number.isSafeInteger(v) && v >= 1;
const recusa = msg => ({ status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: msg } });

export const STATUS_DA_TROCA = Object.freeze({
  [ERRO_TROCA.NAO]: 404, [ERRO_TROCA.CONTRAPARTE]: 404,
  [ERRO_TROCA.ESTADO]: 409, [ERRO_TROCA.REVISAO]: 409, [ERRO_TROCA.HASH]: 409,
  [ERRO_TROCA.VAZIA]: 400, [ERRO_TROCA.OFERTA]: 400, [ERRO_TROCA.RECUSADA]: 409,
});

/* O checkpoint é o do §25.1 (null): as bandeiras de valor seguem desligadas
   até a DEC-21 ligá-las no gate C — e a política responde FEATURE_DISABLED. */
export function rotasDasTrocas(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  /* A COSTURA DO TESTE, e só dele: em `ambiente: 'teste'` a suíte pode passar
     um marcador para exercitar a troca de ponta a ponta pela porta. Fora do
     teste é sempre o do §25.1 — não existe configuração que ligue valor. */
  const cp = config => (config?.ambiente === 'teste' && config.checkpointTeste) ? config.checkpointTeste : CHECKPOINT_25_1;
  return {
    'GET /api/trocas': ({ db, userId }) => ({ corpo: { trocas: minhasTrocas(db, { userId }) } }),

    'GET /api/trocas/detalhe': ({ db, query, userId }) => {
      const id = query?.get?.('id');
      if (!texto(id)) return recusa('id inválido');
      return tentar(() => detalheDaTroca(db, { trocaId: id, userId }));
    },

    'POST /api/trocas': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.contraparte)) return recusa('contraparte inválida');
      const outro = db.prepare(`SELECT id FROM users WHERE username = ?`).get(corpo.contraparte);
      if (!outro) return daExcecao(Object.assign(new Error('a outra conta não existe'), { codigo: ERRO_TROCA.CONTRAPARTE }));
      return tentar(() => criarTroca(db, { userId, contraparteId: outro.id, pack: PACK, ativos: corpo.ativos ?? {}, agora, checkpoint: cp(config) }));
    },

    'POST /api/trocas/oferta': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.id)) return recusa('id inválido');
      return tentar(() => ofertar(db, { trocaId: corpo.id, userId, pack: PACK, ativos: corpo.ativos ?? {}, agora, checkpoint: cp(config) }));
    },

    'POST /api/trocas/pronto': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.id) || !inteiro(corpo?.revisao)) return recusa('id ou revisão inválidos');
      return tentar(() => pronto(db, { trocaId: corpo.id, userId, revisao: corpo.revisao, pack: PACK, agora, checkpoint: cp(config) }));
    },

    'POST /api/trocas/confirmar': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.id) || !inteiro(corpo?.revisao) || !texto(corpo?.hash)) return recusa('id, revisão ou hash inválidos');
      return tentar(() => confirmar(db, { trocaId: corpo.id, userId, revisao: corpo.revisao, hash: corpo.hash, agora, checkpoint: cp(config) }));
    },

    'POST /api/trocas/cancelar': ({ db, corpo, userId, agora, config }) => {
      if (!texto(corpo?.id)) return recusa('id inválido');
      return tentar(() => cancelar(db, { trocaId: corpo.id, userId, agora }));
    },
  };
}
