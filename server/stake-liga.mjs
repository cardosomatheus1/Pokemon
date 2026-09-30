/* O STAKE DA LIGA NO SERVIDOR (ST-11.10 · Spec §9.6, §9.9, §28.3, §28.4).
 *
 * A conta é a de `engine/stake-liga.mjs`; aqui mora o dinheiro. Tudo atrás da
 * bandeira `league_stake_enabled` (ST-11.9), que nasce DESLIGADA e só liga com
 * o checkpoint do §25.1 — ligar é a decisão D2, do dono. O `checkpoint` entra
 * por parâmetro para o teste poder exercitar o caminho ligado sem mudar o
 * marcador do repositório.
 *
 * ── A PARTIDA É ASSÍNCRONA, E O STAKE TAMBÉM ────────────────────────────
 *
 * Quem defende não está lá quando o desafio chega. Por isso o consentimento
 * dele é uma INSCRIÇÃO feita antes (`liga_stake_inscricoes`), e a partida com
 * stake só acontece contra quem está inscrito. A luta se resolve na hora, e
 * por isso a reserva e a liquidação cabem na MESMA transação da partida: os
 * dois stakes saem antes de a partida ser gravada, e voltam (ou não) antes de
 * ela fechar. Falhou no meio, nada aconteceu — nem a partida.
 *
 * ── OS PORTÕES, NESTA ORDEM ─────────────────────────────────────────────
 *
 *   a bandeira         desligada, nada — nem a inscrição
 *   a inscrição        os DOIS inscritos
 *   a pausa (§28.4)    `stake_liga` é ação bloqueada; qualquer um dos dois
 *                      em pausa, e a partida com stake não sai
 *   os limites (§28.3) o mesmo `avaliarAposta` da Arena e do bolo: a perda
 *                      da Liga entra na mesma janela, e os limites SOMAM
 *   o saldo            só bônus e competitivo, dos dois
 */
import { stakeDaPartida, potDe, planoDoStake, liquidacaoDoStake } from '../engine/stake-liga.mjs';
import { CHECKPOINT_25_1 } from '../engine/feature-flags.mjs';
import { bandeiraLigada, ERRO_BANDEIRA } from './feature-flags.mjs';
import { saldos, gastar, creditar } from './carteira.mjs';
import { tierDaConta } from './liga-mmr.mjs';
import { podeAgir, ERRO_PROTECAO } from './protecao.mjs';
import { avaliarAposta, registrarPerda } from './limites.mjs';

export const ERRO_STAKE = Object.freeze({
  NAO_INSCRITO: 'STAKE_NAO_INSCRITO',
  LIMITE: 'STAKE_LIMITE',
  SALDO: 'STAKE_SALDO',
  TIER: 'STAKE_TIER',
});
const falha = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });

export const stakeLigado = (db, checkpoint = CHECKPOINT_25_1) => bandeiraLigada(db, 'league_stake_enabled', checkpoint);
function exigirStake(db, checkpoint) {
  if (!stakeLigado(db, checkpoint)) throw falha(ERRO_BANDEIRA.DESLIGADA, 'o stake da Liga está desligado');
}

export const inscrito = (db, userId) => db.prepare(`SELECT ativo FROM liga_stake_inscricoes WHERE user_id = ?`).get(userId)?.ativo === 1;

/* A INSCRIÇÃO: aceitar defender com stake. Sair nunca exige nada além da
   bandeira; entrar exige não estar em pausa. */
export function inscrever(db, { userId, ativo, agora, checkpoint = CHECKPOINT_25_1 }) {
  exigirStake(db, checkpoint);
  if (ativo) {
    const p = podeAgir(db, { userId, acao: 'stake_liga', agora });
    if (!p.ok) throw falha(ERRO_PROTECAO.PAUSADO, 'a conta está em pausa — o stake volta quando a pausa acabar');
  }
  db.prepare(`INSERT INTO liga_stake_inscricoes (user_id, ativo, atualizado_em) VALUES (?, ?, ?)
              ON CONFLICT (user_id) DO UPDATE SET ativo = excluded.ativo, atualizado_em = excluded.atualizado_em`).run(userId, ativo ? 1 : 0, agora);
  return { inscrito: !!ativo };
}

/* O QUE A TELA MOSTRA ANTES DE CONFIRMAR (a 11.11 pinta): o stake do meu tier,
   o pot, o rake e o que o vencedor recebe — os números da regra, e não uma
   cópia. */
export function stakeDaConta(db, { userId, agora, checkpoint = CHECKPOINT_25_1 }) {
  const ligado = stakeLigado(db, checkpoint);
  const { tier } = tierDaConta(db, userId);
  const stake = stakeDaPartida(tier, tier);
  const s = saldos(db, userId);
  return { ligado, inscrito: inscrito(db, userId), tier, stake, ...potDe(stake), elegivel: (s.bonus || 0) + (s.competitivo || 0),
           pausa: !podeAgir(db, { userId, acao: 'stake_liga', agora }).ok };
}

/* ANTES da transação: todos os portões, para os DOIS lados. Devolve o plano
   (o valor e de que baldes sai cada um), que a transação executa. */
export function prepararStake(db, { userA, userB, agora, checkpoint = CHECKPOINT_25_1 }) {
  exigirStake(db, checkpoint);
  if (!inscrito(db, userA) || !inscrito(db, userB)) throw falha(ERRO_STAKE.NAO_INSCRITO, 'os dois precisam estar inscritos na fila com stake');
  for (const u of [userB, userA]) {
    const p = podeAgir(db, { userId: u, acao: 'stake_liga', agora });
    if (!p.ok) throw falha(ERRO_PROTECAO.PAUSADO, u === userB ? 'a sua conta está em pausa' : 'o adversário não pode jogar com stake agora');
  }
  const stake = stakeDaPartida(tierDaConta(db, userA).tier, tierDaConta(db, userB).tier);
  if (!stake) throw falha(ERRO_STAKE.TIER, 'o tier não tem stake');
  const planos = {};
  for (const [lado, u] of [['B', userB], ['A', userA]]) {
    const v = avaliarAposta(db, { userId: u, valor: stake, agora });
    if (!v.ok) throw falha(ERRO_STAKE.LIMITE, lado === 'B' ? `um limite seu não deixa (${v.limite}) — ${v.comoLiberar}` : 'um limite do adversário não deixa');
    const plano = planoDoStake(saldos(db, u), stake);
    if (!plano.ok) throw falha(ERRO_STAKE.SALDO, lado === 'B' ? `faltam ${plano.falta} de bônus ou competitivo` : 'o adversário não tem saldo para o stake');
    planos[lado] = plano.composicao;
  }
  return { stake, planos };
}

/* DENTRO da transação da partida, antes de gravá-la: os dois stakes saem. */
export function reservarStakes(db, { id, userA, userB, prep, agora }) {
  for (const [lado, u] of [['A', userA], ['B', userB]]) {
    const deltas = Object.fromEntries(Object.entries(prep.planos[lado]).map(([b, n]) => [b, -n]));
    const r = gastar(db, { userId: u, tipo: 'LEAGUE_STAKE', deltas, ref: id, refTipo: 'league_match', idem: `stake:${id}:${u}`, agora });
    if (!r.ok) throw falha(ERRO_STAKE.SALDO, 'o saldo mudou — nada foi cobrado');
  }
}

/* DENTRO da mesma transação, depois do resultado: devolve, paga e registra. */
export function liquidarStake(db, { id, userA, userB, prep, vencedor, contado, agora }) {
  const l = liquidacaoDoStake({ vencedor, stake: prep.stake, contado });
  for (const [lado, u] of [['A', userA], ['B', userB]]) {
    if (l[lado].devolve) for (const [bucket, n] of Object.entries(prep.planos[lado]))
      creditar(db, { userId: u, tipo: 'LEAGUE_STAKE_RETURN', bucket, valor: n, ref: id, refTipo: 'league_match', idem: `stake-volta:${id}:${u}:${bucket}`, agora });
    if (l[lado].ganho > 0)
      creditar(db, { userId: u, tipo: 'LEAGUE_PAYOUT_BONUS', bucket: 'bonus', valor: l[lado].ganho, ref: id, refTipo: 'league_match', idem: `stake-ganho:${id}:${u}`, agora });
    /* A PERDA LÍQUIDA entra na mesma janela dos limites da Arena (§28.3). */
    const liquido = prep.stake - ((l[lado].devolve ? prep.stake : 0) + l[lado].ganho);
    if (liquido !== 0) registrarPerda(db, { userId: u, valor: liquido, agora });
  }
  const { pot } = potDe(prep.stake);
  db.prepare(`INSERT INTO liga_stakes (partida_id, user_a, user_b, stake, pot, rake, estado, composicao_a, composicao_b, criado_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, userA, userB, prep.stake, pot, l.rake, l.estado, JSON.stringify(prep.planos.A), JSON.stringify(prep.planos.B), agora);
  return l;
}

/* O stake de uma partida, para quem a revê: o valor, o pot, o rake e o que aconteceu. */
export function stakeGravado(db, partidaId) {
  const r = db.prepare(`SELECT stake, pot, rake, estado FROM liga_stakes WHERE partida_id = ?`).get(partidaId);
  return r ? { valor: r.stake, pot: r.pot, rake: r.rake, estado: r.estado } : null;
}

export function rotasDoStake(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/equipe/stake': ({ db, userId, agora }) => ({ corpo: stakeDaConta(db, { userId, agora }) }),
    'POST /api/equipe/stake/inscricao': ({ db, corpo, userId, agora }) => {
      if (typeof corpo?.ativo !== 'boolean') return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'ativo precisa ser verdadeiro ou falso' } };
      return tentar(() => inscrever(db, { userId, ativo: corpo.ativo, agora }));
    },
  };
}
