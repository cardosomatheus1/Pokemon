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
import { elegibilidadeDaConta } from './elegibilidade.mjs';
import { pcTElegivel } from './carteira.mjs';
import { criarTroca, ofertar, pronto, confirmar, cancelar, detalheDaTroca, minhasTrocas, ERRO_TROCA } from './trocas.mjs';

const texto = v => typeof v === 'string' && v.length > 0 && v.length <= 80;
const inteiro = v => Number.isSafeInteger(v) && v >= 1;
const recusa = msg => ({ status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: msg } });

export const STATUS_DA_TROCA = Object.freeze({
  [ERRO_TROCA.NAO]: 404, [ERRO_TROCA.CONTRAPARTE]: 404,
  [ERRO_TROCA.ESTADO]: 409, [ERRO_TROCA.REVISAO]: 409, [ERRO_TROCA.HASH]: 409,
  [ERRO_TROCA.VAZIA]: 400, [ERRO_TROCA.OFERTA]: 400, [ERRO_TROCA.RECUSADA]: 409,
});

/* O checkpoint é o do §25.1 (null). As bandeiras da troca nascem ligadas pela
   DEC-21 (gate C) e o operador as desliga — desligadas, a política responde
   FEATURE_DISABLED. Não existe configuração que ligue valor por fora. */
export function rotasDasTrocas(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    /* A tela pergunta UMA vez o que precisa para abrir (ST-14.7b): as trocas,
       se esta conta pode negociar agora (e o motivo, se não — a bandeira
       desligada é o caso até a DEC-21) e o PC-T elegível para oferecer. */
    'GET /api/trocas': ({ db, userId, agora }) => {
      const conta = elegibilidadeDaConta(db, { userId, acao: 'trade', agora, checkpoint: CHECKPOINT_25_1 });
      return { corpo: { trocas: minhasTrocas(db, { userId }), ligada: conta.allowed,
                        motivo: conta.allowed ? null : { reason_code: conta.reason_code, detalhe: conta.detalhe },
                        pctElegivel: pcTElegivel(db, userId, agora) } };
    },

    'GET /api/trocas/detalhe': ({ db, query, userId }) => {
      const id = query?.get?.('id');
      if (!texto(id)) return recusa('id inválido');
      return tentar(() => detalheDaTroca(db, { trocaId: id, userId }));
    },

    'POST /api/trocas': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.contraparte)) return recusa('contraparte inválida');
      const outro = db.prepare(`SELECT id FROM users WHERE username = ?`).get(corpo.contraparte);
      if (!outro) return daExcecao(Object.assign(new Error('a outra conta não existe'), { codigo: ERRO_TROCA.CONTRAPARTE }));
      return tentar(() => criarTroca(db, { userId, contraparteId: outro.id, pack: PACK, ativos: corpo.ativos ?? {}, agora, checkpoint: CHECKPOINT_25_1 }));
    },

    'POST /api/trocas/oferta': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.id)) return recusa('id inválido');
      return tentar(() => ofertar(db, { trocaId: corpo.id, userId, pack: PACK, ativos: corpo.ativos ?? {}, agora, checkpoint: CHECKPOINT_25_1 }));
    },

    'POST /api/trocas/pronto': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.id) || !inteiro(corpo?.revisao)) return recusa('id ou revisão inválidos');
      return tentar(() => pronto(db, { trocaId: corpo.id, userId, revisao: corpo.revisao, pack: PACK, agora, checkpoint: CHECKPOINT_25_1 }));
    },

    'POST /api/trocas/confirmar': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.id) || !inteiro(corpo?.revisao) || !texto(corpo?.hash)) return recusa('id, revisão ou hash inválidos');
      return tentar(() => confirmar(db, { trocaId: corpo.id, userId, revisao: corpo.revisao, hash: corpo.hash, agora, checkpoint: CHECKPOINT_25_1 }));
    },

    'POST /api/trocas/cancelar': ({ db, corpo, userId, agora }) => {
      if (!texto(corpo?.id)) return recusa('id inválido');
      return tentar(() => cancelar(db, { trocaId: corpo.id, userId, agora }));
    },
  };
}
