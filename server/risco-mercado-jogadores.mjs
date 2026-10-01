/* A PROTEÇÃO ANTES DE NEGOCIAR (ST-14.14 · E14 · spec E14 §13).
 *
 * Três portas, e as três ficam no SERVIDOR — a tela escondida não protege
 * nada, e a rota chamada direto tem de dar o mesmo "não":
 *
 *   a conta     congelada por um operador (`p2p_congelamentos`), em pausa ou
 *               autoexclusão (a política única já lê a pausa)
 *   a oferta    quantas a conta já tem abertas daquele tipo, e quantos ativos
 *               de cada lado (`engine/risco-mercado.mjs`)
 *   o outro     nunca a própria conta, nunca uma conta ligada
 *
 * Congelar e descongelar passam pelo `agir` do admin: papel `economia`,
 * motivo escrito, confirmação, e a auditoria gravada ANTES de executar.
 *
 * A EXCEÇÃO, e ela só congela (ST-14.14b · L-228): a conta que tenta negociar
 * com uma conta LIGADA a ela é congelada pelo próprio sinal — `por` é
 * `sistema:conta_ligada`, e só um operador descongela. A simulação do gate C
 * mediu por quê: recusar só a TENTATIVA deixa a conta juntar mais um dia e
 * tentar de novo (o funil cai 7%); congelar na primeira derruba 85%. Não é
 * punição sem revisão: o PC-T e os ativos ficam onde estão, e a revisão é do
 * operador, pelo mesmo `descongelar`.
 */
import { anotar } from './telemetria.mjs';
import { agir } from './admin.mjs';
import { contasLigadas } from './protecao.mjs';
import { avaliarLimites, avaliarContraparte } from '../engine/risco-mercado.mjs';

export const ERRO_RISCO = Object.freeze({ RECUSADA: 'RISCO_RECUSADO', JA: 'RISCO_JA_CONGELADA', NAO: 'RISCO_NAO_CONGELADA' });
const falha = (codigo, msg, extra = {}) => Object.assign(new Error(msg), { codigo, ...extra });

export const congelada = (db, userId) =>
  !!db.prepare(`SELECT 1 FROM p2p_congelamentos WHERE user_id = ? AND levantado_em IS NULL`).get(userId);

export function congelar(db, { operadorId, userId, motivo, confirmado, agora }) {
  return agir(db, { operadorId, acao: 'p2p.congelar', alvo: userId, de: 'livre', para: 'congelada', motivo, confirmado, agora }, op => {
    if (congelada(db, userId)) throw falha(ERRO_RISCO.JA, 'a conta já está congelada');
    db.prepare(`INSERT INTO p2p_congelamentos (user_id, motivo, por, em) VALUES (?, ?, ?, ?)`).run(userId, motivo, op.id, agora);
    return { ok: true };
  });
}

/* O congelamento do SINAL. Roda FORA da transação que recusou (ela desfaz o
   que gravou); repetido, não abre outro — a conta já está em revisão. */
export const POR_SINAL = 'sistema:conta_ligada';
export function congelarPorSinal(db, { userId, outroId, agora }) {
  if (congelada(db, userId)) return { ok: true, ja: true };
  db.prepare(`INSERT INTO p2p_congelamentos (user_id, motivo, por, em) VALUES (?, ?, ?, ?)`)
    .run(userId, `sinal automático: conta_ligada (${outroId})`, POR_SINAL, agora);
  anotar(db, { nome: 'p2p_congelada_por_sinal', userId, campos: { sinal: 'conta_ligada' }, chave: `sinal:${userId}:${agora}`, agora });
  return { ok: true };
}
/* A recusa que carrega `ligada` congela quem tentou, e segue sendo recusa. */
export const comSinalDeLigada = (db, agora, fn) => {
  try { return fn(); }
  catch (e) { if (e.ligada) congelarPorSinal(db, { ...e.ligada, agora }); throw e; }
};
export const recusaDaLigada = (c, userId, outroId) => (c.detalhe === 'conta_ligada' ? { ligada: { userId, outroId } } : {});

export function descongelar(db, { operadorId, userId, motivo, confirmado, agora }) {
  return agir(db, { operadorId, acao: 'p2p.descongelar', alvo: userId, de: 'congelada', para: 'livre', motivo, confirmado, agora }, op => {
    const r = db.prepare(`UPDATE p2p_congelamentos SET levantado_em = ?, levantado_por = ? WHERE user_id = ? AND levantado_em IS NULL`).run(agora, op.id, userId);
    if (!r.changes) throw falha(ERRO_RISCO.NAO, 'a conta não está congelada');
    return { ok: true };
  });
}

/* As ofertas abertas de um tipo: cada DONO distinto com reserva ativa. */
const ABERTAS = `SELECT COUNT(DISTINCT dono_id) n FROM asset_holds WHERE user_id = ? AND dono_tipo = ? AND estado = 'ativa'`;

export function exigirPodeOfertar(db, { userId, tipo, ativosNaOferta, outroId = null }) {
  if (congelada(db, userId)) throw falha(ERRO_RISCO.RECUSADA, 'a negociação desta conta está em revisão', { reason_code: 'ACCOUNT_RESTRICTED' });
  const c = avaliarContraparte({ userId, outroId, ligadas: outroId ? contasLigadas(db, userId) : [] });
  if (!c.allowed) throw falha(ERRO_RISCO.RECUSADA, `a contraparte não pode: ${c.detalhe}`, { reason_code: c.reason_code, ...recusaDaLigada(c, userId, outroId) });
  if (outroId && congelada(db, outroId)) throw falha(ERRO_RISCO.RECUSADA, 'a outra conta está em revisão', { reason_code: 'ACCOUNT_RESTRICTED' });
  const l = avaliarLimites({ tipo, abertas: db.prepare(ABERTAS).get(userId, tipo).n, ativosNaOferta });
  if (!l.allowed) throw falha(ERRO_RISCO.RECUSADA, `limite da oferta: ${l.detalhe}`, { reason_code: l.reason_code });
}
