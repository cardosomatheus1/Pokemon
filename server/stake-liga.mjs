/* O STAKE DA LIGA NO SERVIDOR (ST-11.10 · Spec §9.6, §9.9, §28.3, §28.4).
 *
 * A conta é a de `engine/stake-liga.mjs`; aqui mora o dinheiro. Tudo atrás da
 * bandeira `league_stake_enabled` (ST-11.9), autorizada para PC-B/PC-C pela
 * DEC-16; dinheiro real permanece sujeito ao §25.1. O `checkpoint` entra
 * por parâmetro para o teste poder exercitar o caminho ligado sem mudar o
 * marcador do repositório.
 *
 * ── A PARTIDA É ASSÍNCRONA, E O STAKE TAMBÉM ────────────────────────────
 *
 * Quem defende não está lá quando o desafio chega. Por isso o consentimento
 * dele é uma autorização do snapshot atual (`arena_defesas`), com prazo,
 * contagem e orçamento. O desafiante confirma sua própria aposta por busca. A luta se resolve na hora, e
 * por isso a reserva e a liquidação cabem na MESMA transação da partida: os
 * dois stakes saem antes de a partida ser gravada, e voltam (ou não) antes de
 * ela fechar. Falhou no meio, nada aconteceu — nem a partida.
 *
 * ── OS PORTÕES, NESTA ORDEM ─────────────────────────────────────────────
 *
 *   a bandeira         desligada, nada — nem a inscrição
 *   a autorização      defesa vigente; desafiante confirma a busca
 *   a pausa (§28.4)    `stake_liga` é ação bloqueada; qualquer um dos dois
 *                      em pausa, e a partida com stake não sai
 *   os limites (§28.3) o mesmo `avaliarAposta` da Arena e do bolo: a perda
 *                      da Liga entra na mesma janela, e os limites SOMAM
 *   o saldo            só bônus e competitivo, dos dois
 */
import { stakeDaPartida, potDe, planoDoStake, liquidacaoDoStake } from '../engine/stake-liga.mjs';
import { CHECKPOINT_25_1 } from '../engine/feature-flags.mjs';
import { bandeiraLigada, ERRO_BANDEIRA } from './feature-flags.mjs';
import { saldos, gastar, creditar, emTransacao } from './carteira.mjs';
import { tierDaConta } from './liga-mmr.mjs';
import { podeAgir, ERRO_PROTECAO } from './protecao.mjs';
import { avaliarAposta, registrarPerda } from './limites.mjs';
import { POLITICA_ARENA } from '../engine/arena-treinadores.mjs';
import { snapshotsDe } from './equipe.mjs';
import { exigirAcessoArena } from './arena-acesso.mjs';
import { creditarTaxaCasa } from './tesouraria-arena.mjs';
import PACK from '../content/escolhido.mjs';
import { emitir } from './telemetria.mjs';
import {anotarArena} from './arena-metricas.mjs';

export const ERRO_STAKE = Object.freeze({
  NAO_INSCRITO: 'STAKE_NAO_INSCRITO',
  LIMITE: 'STAKE_LIMITE',
  SALDO: 'STAKE_SALDO',
  TIER: 'STAKE_TIER',
  SEM_ADVERSARIO: 'STAKE_SEM_ADVERSARIO',
});
const falha = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });

export const stakeLigado = (db, checkpoint = CHECKPOINT_25_1) => bandeiraLigada(db, 'league_stake_enabled', checkpoint);
export const exigirStakeLigado = (db, checkpoint = CHECKPOINT_25_1) => exigirStake(db, checkpoint);
function exigirStake(db, checkpoint) {
  if (!stakeLigado(db, checkpoint)) throw falha(ERRO_BANDEIRA.DESLIGADA, 'o stake da Liga está desligado');
}

export function defesaDaConta(db, userId, agora) {
  const d = db.prepare('SELECT * FROM arena_defesas WHERE user_id = ?').get(userId);
  const atual = snapshotsDe(db, userId)[0];
  const ativo = !!d && d.expira_em > agora && d.restantes > 0 && d.orcamento >= d.stake_max && d.snapshot_id === atual?.id;
  return d ? { ativo, snapshot: d.snapshot_id, stakeMax: d.stake_max, orcamento: d.orcamento,
    restantes: d.restantes, expiraEm: d.expira_em } : { ativo: false, restantes: 0, orcamento: 0 };
}
export const inscrito = (db, userId, agora = Date.now()) => defesaDaConta(db, userId, agora).ativo;

/* A INSCRIÇÃO: aceitar defender com stake. Sair nunca exige nada além da
   bandeira; entrar exige não estar em pausa. */
export function inscrever(db, { userId, ativo, agora, checkpoint = CHECKPOINT_25_1, pack = PACK }) {
  return emTransacao(db, () => {
  if (ativo) {
    exigirStake(db, checkpoint);
    const p = podeAgir(db, { userId, acao: 'stake_liga', agora });
    if (!p.ok) throw falha(ERRO_PROTECAO.PAUSADO, 'a conta está em pausa — o stake volta quando a pausa acabar');
    const s = snapshotsDe(db, userId)[0];
    exigirAcessoArena(db, userId, pack, s?.time);
    const stake = stakeDaPartida(tierDaConta(db, userId).tier, tierDaConta(db, userId).tier);
    db.prepare(`INSERT INTO arena_defesas (user_id, snapshot_id, stake_max, orcamento, restantes, expira_em)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET snapshot_id=excluded.snapshot_id,
      stake_max=excluded.stake_max, orcamento=excluded.orcamento, restantes=excluded.restantes, expira_em=excluded.expira_em`)
      .run(userId, s.id, stake, stake * POLITICA_ARENA.defesas, POLITICA_ARENA.defesas, agora + POLITICA_ARENA.validadeMs);
  } else {
    db.prepare('DELETE FROM arena_defesas WHERE user_id = ?').run(userId);
  }
  db.prepare(`INSERT INTO liga_stake_inscricoes (user_id, ativo, atualizado_em) VALUES (?, ?, ?)
              ON CONFLICT (user_id) DO UPDATE SET ativo = excluded.ativo, atualizado_em = excluded.atualizado_em`).run(userId, ativo ? 1 : 0, agora);
  emitir(db,{nome:'arena_defesa_autorizacao',userId,chave:`arena-defesa:${userId}:${agora}:${ativo}`,agora,
    campos:{origem:'servidor',ativo:!!ativo,restantes:defesaDaConta(db,userId,agora).restantes}});
  const defesa=defesaDaConta(db,userId,agora);
  if(ativo)anotarArena(db,{nome:'arena_defesa_autorizada',userId,chave:`defesa:${userId}:${agora}`,agora,campos:{...defesa,ativo:true}});
  return { inscrito: !!ativo, defesa: defesaDaConta(db, userId, agora) };
  });
}

/* O QUE A TELA MOSTRA ANTES DE CONFIRMAR (a 11.11 pinta): o stake do meu tier,
   o pot, o rake e o que o vencedor recebe — os números da regra, e não uma
   cópia. */
export function stakeDaConta(db, { userId, agora, checkpoint = CHECKPOINT_25_1 }) {
  const ligado = stakeLigado(db, checkpoint);
  const { tier } = tierDaConta(db, userId);
  const stake = stakeDaPartida(tier, tier);
  const s = saldos(db, userId);
  const snap = snapshotsDe(db, userId)[0];
  let acesso;
  try { exigirAcessoArena(db, userId, PACK, snap?.time); acesso = { ok: true }; } catch (e) { acesso = { ok: false, motivo: e.message }; }
  return { ligado, inscrito: inscrito(db, userId, agora), defesa: defesaDaConta(db, userId, agora), acesso,
           tier, stake, ...potDe(stake), elegivel: (s.bonus || 0) + (s.competitivo || 0),
           bonus: s.bonus || 0, competitivo: s.competitivo || 0,
           pausa: !podeAgir(db, { userId, acao: 'stake_liga', agora }).ok };
}

/* ANTES da transação: todos os portões, para os DOIS lados. Devolve o plano
   (o valor e de que baldes sai cada um), que a transação executa. */
export function prepararStake(db, { userA, userB, agora, checkpoint = CHECKPOINT_25_1 }) {
  exigirStake(db, checkpoint);
  if (tierDaConta(db,userA).tier !== tierDaConta(db,userB).tier)
    throw falha(ERRO_STAKE.TIER,'a arena com aposta exige o mesmo tier dos dois participantes');
  if (!inscrito(db, userA, agora)) throw falha(ERRO_STAKE.NAO_INSCRITO, 'o defensor precisa autorizar as defesas com stake');
  for (const u of [userB, userA]) {
    const p = podeAgir(db, { userId: u, acao: 'stake_liga', agora });
    if (!p.ok) throw Object.assign(falha(ERRO_PROTECAO.PAUSADO, u === userB ? 'a sua conta está em pausa' : 'o adversário não pode jogar com stake agora'),{userId:u});
  }
  const stake = stakeDaPartida(tierDaConta(db, userA).tier, tierDaConta(db, userB).tier);
  if (!stake) throw falha(ERRO_STAKE.TIER, 'o tier não tem stake');
  const defesa = defesaDaConta(db, userA, agora);
  if (stake > defesa.stakeMax || stake > defesa.orcamento) throw falha(ERRO_STAKE.NAO_INSCRITO, 'o stake excede a autorização do defensor');
  const planos = {};
  for (const [lado, u] of [['B', userB], ['A', userA]]) {
    const v = avaliarAposta(db, { userId: u, valor: stake, agora });
    if (!v.ok) throw Object.assign(falha(ERRO_STAKE.LIMITE, lado === 'B' ? `um limite seu não deixa (${v.limite}) — ${v.comoLiberar}` : 'um limite do adversário não deixa'),{userId:u});
    const plano = planoDoStake(saldos(db, u), stake);
    if (!plano.ok) throw Object.assign(falha(ERRO_STAKE.SALDO, lado === 'B' ? `faltam ${plano.falta} de bônus ou competitivo` : 'o adversário não tem saldo para o stake'),{userId:u});
    planos[lado] = plano.composicao;
  }
  return { stake, planos };
}

/* DENTRO da transação da partida, antes de gravá-la: os dois stakes saem. */
export function reservarStakes(db, { id, userA, userB, prep, agora }) {
  const defesa = db.prepare(`UPDATE arena_defesas SET orcamento = orcamento - ?, restantes = restantes - 1
    WHERE user_id = ? AND expira_em > ? AND restantes > 0 AND orcamento >= ? AND stake_max >= ?`)
    .run(prep.stake, userA, agora, prep.stake, prep.stake);
  if (!defesa.changes) throw falha(ERRO_STAKE.NAO_INSCRITO, 'a autorização de defesa acabou');
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
  if (l.rake > 0) creditarTaxaCasa(db, { id, rake: l.rake, composicao: prep.planos[vencedor === 'A' ? 'B' : 'A'], agora });
  if (!contado) db.prepare('UPDATE arena_defesas SET orcamento = orcamento + ?, restantes = restantes + 1 WHERE user_id = ?').run(prep.stake, userA);
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
