/* APOSTA, LOCK E SETTLEMENT (F1.7).
 *
 * Fronteira: recebe a intenção do jogador, confere contra a rodada e a carteira,
 * e grava o ticket. Não simula, não precifica, não serve HTTP.
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA TORNAR IMPOSSÍVEL ───────────────────────
 *
 * Cada regra abaixo é do §5.6, e cada uma tem um custo concreto se cair:
 *
 *   A ODD NUNCA VEM DO CLIENTE      ela sai de `round_fighters`, que o servidor
 *                                   gravou na abertura. Se viesse do pedido, o
 *                                   cliente mandaria 999 em toda aposta.
 *   UMA POSIÇÃO POR USUÁRIO         com duas, o jogador cobre os doze lutadores
 *                                   e sai sempre no lucro. Trocar é UPDATE.
 *   NADA APÓS O LOCK                um milissegundo depois do fechamento a
 *                                   semente já foi revelada: apostar ali é
 *                                   apostar no passado.
 *   SETTLEMENT IDEMPOTENTE          "reprocessar a rodada" não pode pagar de
 *                                   novo. É a invariante do §4.6.
 *
 * ── A FASE É LIDA DO SCHEDULER, NUNCA DO RELÓGIO ───────────────────────────
 *
 * `sched.rodadaAtual().status`, e não "agora < travaEm". Comparar relógios
 * abriria a janela para um cliente com o relógio adiantado, e — pior — deixaria
 * a decisão depender de qual das duas fontes está certa. O scheduler é dono do
 * ciclo; aqui só se pergunta a ele.
 */
import { randomUUID } from 'node:crypto';
import { CONF } from '../engine/engine.mjs';
import { ESTADOS } from './scheduler.mjs';
import { reservarNoBanco, liberarNoBanco, liquidarNoBanco } from './carteira.mjs';

export const ERRO_APOSTA = {
  JANELA_FECHADA:  'janela_fechada',
  SLOT:            'slot_invalido',
  VALOR:           'valor_invalido',
  SALDO:           'saldo_insuficiente',
  TETO:            'teto_de_payout',
  CONTA:           'conta_nao_ativa',
  SEM_APOSTA:      'sem_aposta',
  RODADA:          'rodada_invalida',
};

const erro = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });
const inteiroPositivo = v => typeof v === 'number' && Number.isInteger(v) && v > 0;

/* ── APOSTAR (e trocar, que é a mesma coisa) ───────────────────────────────*/

export function apostar(db, { sched, userId, slot, valor, agora = Date.now() }) {
  /* O PARÂMETRO `odd` NÃO EXISTE NESTA ASSINATURA, e a ausência é a defesa.
     Aceitá-lo "e ignorá-lo" funcionaria hoje e seria usado amanhã por alguém
     que o visse na lista e presumisse que serve para alguma coisa. */
  const rodada = sched.rodadaAtual();
  if (!rodada) throw erro(ERRO_APOSTA.RODADA, 'não há rodada');

  /* A FASE VEM DO SCHEDULER. Ver a nota do cabeçalho: comparar relógios deixaria
     a decisão depender de qual fonte está certa. */
  if (rodada.status !== ESTADOS.ABERTA)
    throw erro(ERRO_APOSTA.JANELA_FECHADA, 'a janela de apostas está fechada');

  const conta = db.prepare(`SELECT status FROM users WHERE id = ?`).get(userId);
  if (!conta || conta.status !== 'ativo')
    throw erro(ERRO_APOSTA.CONTA, 'esta conta não pode apostar');

  if (!Number.isInteger(slot) || slot < 0 || slot > 11)
    throw erro(ERRO_APOSTA.SLOT, 'lutador inválido');
  if (!inteiroPositivo(valor)) throw erro(ERRO_APOSTA.VALOR, 'valor inválido');

  /* A ODD SAI DA TABELA, e é a que o servidor gravou na abertura da rodada.
     É isto que "odd auditável" significa na prática: o ticket carrega o preço
     publicado, não um preço recalculado nem um preço enviado. */
  const oferta = db.prepare(
    `SELECT species_id, offered_odd FROM round_fighters WHERE round_id = ? AND slot = ?`)
    .get(rodada.id, slot);
  if (!oferta) throw erro(ERRO_APOSTA.SLOT, 'lutador inválido');

  /* O TETO DE PAYOUT DO §4.4.6, APLICADO NO SERVIDOR.
     Ele existia desde o F0.8 — no cliente. E o cliente é do jogador. */
  if (Math.floor(valor * oferta.offered_odd) > CONF.MAX_PAYOUT_POR_TICKET)
    throw erro(ERRO_APOSTA.TETO,
      `o retorno passaria do teto por bilhete (${CONF.MAX_PAYOUT_POR_TICKET})`);

  const jaTem = db.prepare(
    `SELECT * FROM bets WHERE user_id = ? AND round_id = ? AND status = 'aberta'`)
    .get(userId, rodada.id);

  /* TROCAR É DESFAZER E REFAZER, e nesta ordem.
     Reservar antes de liberar cobraria as duas ao mesmo tempo, e quem apostou
     "Tudo" veria "saldo insuficiente" ao trocar de lutador — que é o defeito
     que a v1.0 do porte teve com o botão de cancelar. */
  /* SEM CHAVE DE IDEMPOTÊNCIA NESTA LIBERAÇÃO, e a ausência é a correção de um
     defeito que o teste pegou. A primeira versão usava `lib-<id>`: na SEGUNDA
     troca do mesmo ticket a chave se repetia, a carteira tratava como operação
     já aplicada, e o dinheiro da reserva anterior simplesmente não voltava.
     Trocar de 300 para 50 deixava o jogador com 650 em vez de 950.

     Idempotência serve a operações que o CLIENTE pode reenviar — cancelar,
     liquidar. Trocar de aposta é uma sequência interna de desfazer-e-refazer, e
     ali repetir é justamente o que precisa acontecer. */
  if (jaTem) liberarNoBanco(db, { userId, composicao: JSON.parse(jaTem.stake_breakdown),
                                  ref: jaTem.id, agora });

  const reserva = reservarNoBanco(db, { userId, valor, ref: jaTem?.id ?? 'nova', agora });
  if (!reserva.ok) {
    /* A DEVOLUÇÃO TEM QUE SER DESFEITA se a nova reserva não coube — senão
       trocar para um valor alto demais deixa o jogador SEM aposta e COM o
       dinheiro solto, que não é o que ele pediu. */
    if (jaTem) reservarNoBanco(db, { userId, valor: jaTem.stake, ref: jaTem.id, agora });
    throw erro(reserva.motivo === 'saldo_insuficiente' ? ERRO_APOSTA.SALDO : ERRO_APOSTA.VALOR,
      'saldo insuficiente');
  }

  const id = jaTem?.id ?? randomUUID();
  if (jaTem) {
    db.prepare(
      `UPDATE bets SET slot_apostado = ?, species_id = ?, stake = ?, odd = ?,
                       stake_breakdown = ? WHERE id = ?`)
      .run(slot, oferta.species_id, valor, oferta.offered_odd,
           JSON.stringify(reserva.composicao), id);
  } else {
    db.prepare(
      `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd,
                         status, stake_breakdown, created_at)
       VALUES (?,?,?,?,?,?,?,'aberta',?,?)`)
      .run(id, userId, rodada.id, slot, oferta.species_id, valor, oferta.offered_odd,
           JSON.stringify(reserva.composicao), agora);
  }
  return { id, slot, odd: oferta.offered_odd, valor, composicao: reserva.composicao };
}

export function cancelar(db, { sched, userId, agora = Date.now() }) {
  const rodada = sched.rodadaAtual();
  if (!rodada) throw erro(ERRO_APOSTA.RODADA, 'não há rodada');
  if (rodada.status !== ESTADOS.ABERTA)
    throw erro(ERRO_APOSTA.JANELA_FECHADA, 'a janela de apostas está fechada');

  const t = db.prepare(
    `SELECT * FROM bets WHERE user_id = ? AND round_id = ? AND status = 'aberta'`)
    .get(userId, rodada.id);
  if (!t) throw erro(ERRO_APOSTA.SEM_APOSTA, 'não há aposta para cancelar');

  liberarNoBanco(db, { userId, composicao: JSON.parse(t.stake_breakdown),
                       ref: t.id, idem: `cancel-${t.id}`, agora });
  db.prepare(`UPDATE bets SET status='cancelada' WHERE id=?`).run(t.id);
  return { id: t.id };
}

/* ── O LOCK ────────────────────────────────────────────────────────────────
 *
 * Chamado pelo scheduler quando a janela fecha. Ele não muda odd nem valor: só
 * marca. A odd JÁ está congelada desde o instante da aposta — congelar no lock
 * significaria que ela podia mudar até lá, e o §5.6 diz o contrário. */
export function travarApostas(db, { roundId, agora = Date.now() }) {
  const r = db.prepare(
    `UPDATE bets SET status='travada', locked_at=? WHERE round_id=? AND status='aberta'`)
    .run(agora, roundId);
  return r.changes;
}

/* ── SETTLEMENT ───────────────────────────────────────────────────────────
 *
 * IDEMPOTENTE POR CONSTRUÇÃO, em dois níveis:
 *
 *   1. só processa tickets em `travada` — o primeiro settlement os move para
 *      `ganha`/`perdida`, e o segundo não acha nada;
 *   2. a chave de idempotência da carteira é derivada do TICKET, então mesmo
 *      que o status fosse revertido por engano, o lançamento não se repetiria.
 *
 * Dois níveis porque o primeiro sozinho depende de o status estar certo, e o
 * status é dado — a chave é regra. É a invariante "payout ocorre uma única vez"
 * do §4.6, e ela é cara demais para depender de uma coluna. */
export function liquidarRodada(db, { sched, roundId, agora = Date.now() }) {
  const rodada = db.prepare(`SELECT status, champion_species_id FROM rounds WHERE id=?`).get(roundId);
  if (!rodada) throw erro(ERRO_APOSTA.RODADA, 'rodada desconhecida');
  if (rodada.status !== ESTADOS.ENCERRADA)
    throw erro(ERRO_APOSTA.RODADA, 'a rodada ainda não terminou');
  if (rodada.champion_species_id === null)
    throw erro(ERRO_APOSTA.RODADA, 'a rodada terminou sem campeão');

  const tickets = db.prepare(
    `SELECT * FROM bets WHERE round_id = ? AND status = 'travada'`).all(roundId);

  let pagos = 0, perdidos = 0;
  for (const t of tickets) {
    const ganhou = t.species_id === rodada.champion_species_id;
    const composicao = JSON.parse(t.stake_breakdown);
    liquidarNoBanco(db, { userId: t.user_id, composicao, ganhou, odd: t.odd,
                          ref: t.id, idem: `settle-${t.id}`, agora });
    db.prepare(`UPDATE bets SET status=?, payout=?, settled_at=? WHERE id=?`)
      .run(ganhou ? 'ganha' : 'perdida',
           ganhou ? Math.floor(t.stake * t.odd) : 0, agora, t.id);
    ganhou ? pagos++ : perdidos++;
  }
  return { pagos, perdidos, total: tickets.length };
}
