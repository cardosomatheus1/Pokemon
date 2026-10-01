/* OS FATOS DA NEGOCIABILIDADE, LIDOS DO BANCO (ST-14.5 · E14 · spec E14 §7).
 *
 * A regra mora em `engine/negociabilidade.mjs`; aqui mora só o que precisa de
 * banco: de quem é, de onde veio, onde está, quando chegou, e o estado da
 * conta. O relógio é o do SERVIDOR — `agora` vem de quem chama no servidor, e
 * nenhum caminho daqui aceita horário do cliente.
 *
 * `reservada` vem das reservas (`asset_holds`, ST-14.6) e a reserva de lote
 * vem de `bolsa_lotes.reservada`. `recebidaEm` é o último recebimento entre
 * jogadores PARA O DONO DE HOJE (`criaturas_transferencias`, ST-14.7): a
 * criatura que acabou de chegar numa troca espera o cooldown antes de sair.
 */
import { avaliarCriatura, avaliarItem, avaliarPreso, avaliarMoeda, avaliarConta } from '../engine/negociabilidade.mjs';
import { CHECKPOINT_25_1 } from '../engine/feature-flags.mjs';
import { bandeiraLigada } from './feature-flags.mjs';
import { pausaAtiva } from './protecao.mjs';
import { emCampo } from './idle.mjs';
import { naRun } from './run.mjs';
import { pcTElegivel, saldos } from './carteira.mjs';
import { congelada } from './risco-mercado-jogadores.mjs';
import { emDivergencia } from './conciliacao-economia.mjs';

const P2P = ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'];

export function fatosDaConta(db, { userId, agora, checkpoint = CHECKPOINT_25_1 }) {
  return {
    pausada: !!pausaAtiva(db, userId, agora),
    congelada: congelada(db, userId),
    emDivergencia: emDivergencia(db, userId),
    bandeiras: Object.fromEntries(P2P.map(n => [n, bandeiraLigada(db, n, checkpoint)])),
  };
}

const LENDARIO = (pack, dex) => (pack?.lendarios ?? []).some(e => e.dex === dex);

/* UMA reserva ativa por criatura é regra do banco (o índice único parcial);
   aqui só se pergunta se ela existe. */
export const criaturaReservada = (db, id) =>
  !!db.prepare(`SELECT 1 FROM asset_holds WHERE criatura_id = ? AND estado = 'ativa' AND tipo = 'criatura'`).get(id);

const RECEBIDA = `SELECT em FROM criaturas_transferencias WHERE criatura_id = ? AND para_user = ? ORDER BY id DESC LIMIT 1`;

export function fatosDaCriatura(db, { userId, pack, id, agora }) {
  const l = db.prepare(`SELECT user_id, origem, dex, proveniencia FROM criaturas WHERE id = ?`).get(id);
  if (!l) return { existe: false };
  /* Atividade só se pergunta ao dono: a run e a expedição são dele, e ler as
     de outro jogador para responder NOT_OWNER seria trabalho à toa. */
  const emAtividade = l.user_id === userId
    && (emCampo(db, userId).some(x => JSON.parse(x.equipe_json).includes(id)) || naRun(db, { userId, pack, agora }).has(id));
  return { existe: true, dono: l.user_id, origem: l.origem, lendario: LENDARIO(pack, l.dex),
           proveniencia: l.proveniencia, emAtividade, reservada: criaturaReservada(db, id),
           recebidaEm: db.prepare(RECEBIDA).get(id, l.user_id)?.em ?? null };
}

export const elegibilidadeDaCriatura = (db, { userId, pack, id, acao, agora, checkpoint }) =>
  avaliarCriatura({ userId, acao, agora, criatura: fatosDaCriatura(db, { userId, pack, id, agora }),
                    conta: fatosDaConta(db, { userId, agora, checkpoint }) });

export function elegibilidadeDoItem(db, { userId, pack, itemId, quantidade, acao, agora, checkpoint }) {
  const lotes = db.prepare(`SELECT quantidade, reservada, classe FROM bolsa_lotes WHERE user_id = ? AND item_id = ? AND quantidade > 0`).all(userId, itemId);
  return avaliarItem({ pack, itemId, quantidade, lotes, acao, conta: fatosDaConta(db, { userId, agora, checkpoint }) });
}

export const elegibilidadeDaConta = (db, { userId, acao, agora, checkpoint }) =>
  avaliarConta({ acao, conta: fatosDaConta(db, { userId, agora, checkpoint }) });

export const elegibilidadeDoPreso = (db, { userId, tipo, acao, agora, checkpoint }) =>
  avaliarPreso({ tipo, acao, conta: fatosDaConta(db, { userId, agora, checkpoint }) });

export const elegibilidadeDaMoeda = (db, { userId, bucket, valor, acao, agora, checkpoint }) =>
  avaliarMoeda({ bucket, valor, acao, elegivel: pcTElegivel(db, userId, agora), saldo: saldos(db, userId).transferivel ?? 0,
                 conta: fatosDaConta(db, { userId, agora, checkpoint }) });
