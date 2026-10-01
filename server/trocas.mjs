/* A TROCA DIRETA ENTRE JOGADORES (ST-14.7 · E14 · spec E14 §9).
 *
 *   OFFERED ──pronto + pronto──▶ LOCKED ──confirma + confirma──▶ SETTLED
 *      ▲                            │
 *      └────── editar (libera) ─────┘        e CANCELLED · EXPIRED · BLOCKED
 *
 * O rascunho (o DRAFT da spec) mora no aparelho: a troca nasce no servidor
 * já OFERECIDA, com a contraparte fixa e o lado de quem criou.
 *
 * AS QUATRO REGRAS QUE SEGURAM A TROCA, e cada uma tem teste e sabotagem:
 *
 *   revisão      toda mudança de qualquer lado sobe a revisão, e a prontidão e
 *                a confirmação são DA REVISÃO — mudar invalida as dos dois
 *   prontidão    ninguém prende o patrimônio do outro: as reservas só nascem
 *                quando OS DOIS disseram "pronto" para a mesma revisão, e
 *                nascem juntas (tudo ou nada) — LOCKED por 5 minutos
 *   confirmação  é da revisão E da impressão digital do que a tela mostrou
 *                (espécie, nível, natureza, shiny, versão da instância,
 *                itens, PC-T e as taxas); a velha não vale
 *   liquidação   a segunda confirmação move os DOIS lados na mesma transação
 *                — criatura, lote (com a origem dele) e PC-T com a taxa que
 *                a troca gravou quando nasceu — e consome as reservas
 *
 * Quem não é parte da troca não a vê: a resposta é "não existe", e não
 * "não é sua" — dizer que existe já é vazar quem troca com quem.
 */
import { randomUUID } from 'node:crypto';
import { sha256Hex } from '../engine/hash.mjs';
import { previewTrade, POLITICA_PILOTO, hashDaPolitica } from '../engine/taxas-mercado.mjs';
import { LIMITES_P2P } from '../engine/risco-mercado.mjs';
import { nivelDe } from '../engine/nivel-criatura.mjs';
import { emTransacao } from './carteira.mjs';
import { moverReservados, ERRO_POSSE } from './posse-p2p.mjs';
import { elegibilidadeDaCriatura, elegibilidadeDoItem, elegibilidadeDaMoeda, elegibilidadeDaConta } from './elegibilidade.mjs';
import { exigirPodeOfertar, comSinalDeLigada } from './risco-mercado-jogadores.mjs';
import { reservarOferta, liberarOferta, consumirOferta, holdsAtivos, exigirVigente } from './reservas.mjs';
import { liquidarPontaDaTroca } from './taxas-mercado.mjs';
import { emitir } from './telemetria.mjs';

export const ESTADO = Object.freeze({ OFFERED: 'OFFERED', LOCKED: 'LOCKED', SETTLED: 'SETTLED', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', BLOCKED: 'BLOCKED' });
export const PRAZOS_TROCA = Object.freeze({ conviteMs: 24 * 3_600_000, lockMs: 5 * 60_000 });
export const ERRO_TROCA = Object.freeze({
  NAO: 'TROCA_NAO_ENCONTRADA', ESTADO: 'TROCA_ESTADO', REVISAO: 'TROCA_REVISAO_VELHA', HASH: 'TROCA_HASH',
  VAZIA: 'TROCA_VAZIA', OFERTA: 'TROCA_OFERTA_INVALIDA', CONTRAPARTE: 'TROCA_CONTRAPARTE', RECUSADA: 'TROCA_RECUSADA',
});
const falha = (codigo, msg, extra = {}) => Object.assign(new Error(msg), { codigo, ...extra });
const ABERTOS = [ESTADO.OFFERED, ESTADO.LOCKED];
const dono = id => ({ tipo: 'trade', id });

/* ── A OFERTA DE UM LADO ──────────────────────────────────────────────────
 * Normalizada no servidor: criatura sem repetição, item somado por id, tudo
 * inteiro e positivo. O que vier fora disso é recusado, e não "consertado". */
export function normalizarAtivos(ativos = {}) {
  const criaturas = ativos.criaturas ?? [], itens = ativos.itens ?? [], moeda = ativos.moeda ?? 0;
  if (!Array.isArray(criaturas) || !criaturas.every(x => typeof x === 'string' && x)) throw falha(ERRO_TROCA.OFERTA, 'criaturas inválidas');
  if (!Array.isArray(itens) || !itens.every(i => typeof i?.itemId === 'string' && i.itemId && Number.isSafeInteger(i.quantidade) && i.quantidade > 0))
    throw falha(ERRO_TROCA.OFERTA, 'itens inválidos');
  if (!Number.isSafeInteger(moeda) || moeda < 0) throw falha(ERRO_TROCA.OFERTA, 'PC-T inválido');
  const porItem = new Map();
  for (const i of itens) porItem.set(i.itemId, (porItem.get(i.itemId) ?? 0) + i.quantidade);
  const n = { criaturas: [...new Set(criaturas)].sort(), itens: [...porItem].sort().map(([itemId, quantidade]) => ({ itemId, quantidade })), moeda };
  if (contar(n) > LIMITES_P2P.ativosPorLado) throw falha(ERRO_TROCA.OFERTA, `no máximo ${LIMITES_P2P.ativosPorLado} ativos por lado`, { reason_code: 'CAPACITY_EXCEEDED' });
  return n;
}
const contar = a => a.criaturas.length + a.itens.length + (a.moeda ? 1 : 0);

/* A política única pergunta ativo por ativo — a mesma resposta que a reserva
   vai dar, só que ANTES, para a tela mostrar o motivo na hora de montar. */
function conferirLado(db, { userId, pack, ativos, agora, checkpoint }) {
  const conta = elegibilidadeDaConta(db, { userId, acao: 'trade', agora, checkpoint });
  if (!conta.allowed) throw falha(ERRO_TROCA.RECUSADA, `a conta não pode negociar: ${conta.reason_code}`, { reason_code: conta.reason_code });
  for (const id of ativos.criaturas) {
    const r = elegibilidadeDaCriatura(db, { userId, pack, id, acao: 'trade', agora, checkpoint });
    if (!r.allowed) throw falha(ERRO_TROCA.RECUSADA, `a criatura ${id}: ${r.reason_code}${r.detalhe ? ` (${r.detalhe})` : ''}`, { reason_code: r.reason_code, available_at: r.available_at });
  }
  for (const { itemId, quantidade } of ativos.itens) {
    const r = elegibilidadeDoItem(db, { userId, pack, itemId, quantidade, acao: 'trade', agora, checkpoint });
    if (!r.allowed) throw falha(ERRO_TROCA.RECUSADA, `o item ${itemId}: ${r.reason_code}`, { reason_code: r.reason_code });
  }
  if (ativos.moeda) {
    const p = previewTrade({ valorA: ativos.moeda });
    if (!p.ok) throw falha(ERRO_TROCA.OFERTA, p.motivo);
    const r = elegibilidadeDaMoeda(db, { userId, bucket: 'transferivel', valor: p.a.reservar, acao: 'trade', agora, checkpoint });
    if (!r.allowed) throw falha(ERRO_TROCA.RECUSADA, `o PC-T: ${r.reason_code}`, { reason_code: r.reason_code });
  }
}

/* ── LER ──────────────────────────────────────────────────────────────── */
const lerTroca = (db, id) => db.prepare(`SELECT * FROM trocas WHERE id = ?`).get(id);
const lerLados = (db, id) => db.prepare(`SELECT * FROM trocas_lados WHERE troca_id = ?`).all(id)
  .map(l => ({ ...l, ativos: { criaturas: JSON.parse(l.criaturas_json), itens: JSON.parse(l.itens_json), moeda: l.moeda } }));

function daParte(db, { trocaId, userId }) {
  const t = typeof trocaId === 'string' ? lerTroca(db, trocaId) : null;
  if (!t || (t.criador_id !== userId && t.contraparte_id !== userId)) throw falha(ERRO_TROCA.NAO, 'troca não encontrada');
  return t;
}
const evento = (db, t, userId, ev, agora) =>
  db.prepare(`INSERT INTO trocas_eventos (troca_id, user_id, evento, revisao, em) VALUES (?, ?, ?, ?, ?)`).run(t.id, userId, ev, t.revisao, agora);

/* O que a tela mostra de cada criatura — e é isto que a impressão digital
   amarra: se mudar depois de o outro olhar, a confirmação dele não vale. */
/* O NÍVEL é o do XP (`nivelDe`), como em todo o jogo — a coluna `nivel` é a
   de nascimento e ficaria em 1 para sempre (achado no Q5 da ST-14.7b: a
   mesa dizia "nv 1" para um Pikachu de nível 18). */
const VISTA = `SELECT id, dex, nivel, xp, natureza, is_shiny AS shiny, versao FROM criaturas WHERE id = ?`;
const vistaDe = (db, ids) => ids.map(id => {
  const c = db.prepare(VISTA).get(id);
  if (!c) return { id, sumiu: true };
  const { xp, ...resto } = c;
  return { ...resto, nivel: Math.max(c.nivel, nivelDe(xp ?? 0)) };
});

function ladosEmOrdem(db, t) {
  const lados = lerLados(db, t.id);
  const a = lados.find(l => l.user_id === t.criador_id), b = lados.find(l => l.user_id === t.contraparte_id);
  const p = previewTrade({ valorA: a.ativos.moeda, valorB: b.ativos.moeda });
  return { a, b, taxaA: p.ok ? p.a.taxa : null, taxaB: p.ok ? p.b.taxa : null };
}

export function hashDaTroca(db, t) {
  const { a, b, taxaA, taxaB } = ladosEmOrdem(db, t);
  const lado = (l, taxa) => [l.user_id, vistaDe(db, l.ativos.criaturas), l.ativos.itens, l.ativos.moeda, taxa];
  return sha256Hex(JSON.stringify([t.id, t.revisao, t.politica_versao, t.politica_hash, t.lock_expira_em, lado(a, taxaA), lado(b, taxaB)])).slice(0, 32);
}

/* ── CRIAR ────────────────────────────────────────────────────────────────
 * Uma troca ABERTA por conta, dos dois lados (spec §7): quem já tem uma
 * oferecida ou travada não abre outra, e não recebe outra. */
const ABERTAS_DE = `SELECT COUNT(*) n FROM trocas WHERE (criador_id = ? OR contraparte_id = ?) AND estado IN ('OFFERED', 'LOCKED')`;

/* As três portas que podem achar a conta ligada do outro lado: a recusa
   congela quem tentou (ST-14.14b), fora da transação que ela desfez. */
export const criarTroca = (db, a) => comSinalDeLigada(db, a.agora, () => criarTrocaTx(db, a));
export const ofertar = (db, a) => comSinalDeLigada(db, a.agora, () => ofertarTx(db, a));
export const pronto = (db, a) => comSinalDeLigada(db, a.agora, () => prontoTx(db, a));

function criarTrocaTx(db, { userId, contraparteId, pack, ativos, agora, checkpoint }) {
  const meu = normalizarAtivos(ativos);
  if (!db.prepare(`SELECT 1 FROM users WHERE id = ?`).get(contraparteId)) throw falha(ERRO_TROCA.CONTRAPARTE, 'a outra conta não existe');
  return emTransacao(db, () => {
    exigirPodeOfertar(db, { userId, tipo: 'trade', ativosNaOferta: contar(meu), outroId: contraparteId });
    for (const u of [userId, contraparteId]) {
      const c = elegibilidadeDaConta(db, { userId: u, acao: 'trade', agora, checkpoint });
      if (!c.allowed) throw falha(ERRO_TROCA.RECUSADA, `${u === userId ? 'esta' : 'a outra'} conta não pode negociar: ${c.reason_code}${c.detalhe ? ` (${c.detalhe})` : ''}`, { reason_code: c.reason_code });
      if (db.prepare(ABERTAS_DE).get(u, u).n >= LIMITES_P2P.trade)
        throw falha(ERRO_TROCA.RECUSADA, `${u === userId ? 'esta' : 'a outra'} conta já tem uma troca aberta`, { reason_code: 'CAPACITY_EXCEEDED' });
    }
    conferirLado(db, { userId, pack, ativos: meu, agora, checkpoint });
    const t = { id: randomUUID(), revisao: 1 };
    db.prepare(`INSERT INTO trocas (id, criador_id, contraparte_id, estado, revisao, politica_versao, politica_hash, convite_expira_em, criada_em, atualizada_em)
                VALUES (?, ?, ?, 'OFFERED', 1, ?, ?, ?, ?, ?)`)
      .run(t.id, userId, contraparteId, POLITICA_PILOTO.versao, hashDaPolitica(POLITICA_PILOTO), agora + PRAZOS_TROCA.conviteMs, agora, agora);
    const lado = db.prepare(`INSERT INTO trocas_lados (troca_id, user_id, criaturas_json, itens_json, moeda) VALUES (?, ?, ?, ?, ?)`);
    lado.run(t.id, userId, JSON.stringify(meu.criaturas), JSON.stringify(meu.itens), meu.moeda);
    lado.run(t.id, contraparteId, '[]', '[]', 0);
    evento(db, t, userId, 'criada', agora);
    return { id: t.id, revisao: 1 };
  });
}

/* O convite que venceu não aceita mais nada — o varredor encerra depois, e
   ninguém precisa esperar por ele para ouvir "venceu". */
function exigirAberta(t, agora, estados = ABERTOS) {
  if (!estados.includes(t.estado)) throw falha(ERRO_TROCA.ESTADO, `a troca está ${t.estado}`);
  if (t.estado === ESTADO.OFFERED && t.convite_expira_em <= agora) throw falha(ERRO_TROCA.ESTADO, 'o convite venceu', { reason_code: 'OFFER_EXPIRED' });
}

/* ── EDITAR O PRÓPRIO LADO ────────────────────────────────────────────────
 * Sobe a revisão (as prontidões e confirmações de antes param de valer) e,
 * se estava travada, solta tudo e volta a OFFERED — editar não pode deixar o
 * patrimônio de ninguém preso a uma oferta que já não é a mesma. */
function ofertarTx(db, { trocaId, userId, pack, ativos, agora, checkpoint }) {
  const meu = normalizarAtivos(ativos);
  return emTransacao(db, () => {
    const t = daParte(db, { trocaId, userId });
    exigirAberta(t, agora);
    conferirLado(db, { userId, pack, ativos: meu, agora, checkpoint });
    if (t.estado === ESTADO.LOCKED) liberarOferta(db, { dono: dono(t.id), agora });
    db.prepare(`UPDATE trocas_lados SET criaturas_json = ?, itens_json = ?, moeda = ? WHERE troca_id = ? AND user_id = ?`)
      .run(JSON.stringify(meu.criaturas), JSON.stringify(meu.itens), meu.moeda, t.id, userId);
    db.prepare(`UPDATE trocas SET revisao = revisao + 1, estado = 'OFFERED', lock_expira_em = NULL, atualizada_em = ? WHERE id = ?`).run(agora, t.id);
    const nova = lerTroca(db, t.id);
    evento(db, nova, userId, 'oferta', agora);
    return { id: t.id, revisao: nova.revisao };
  });
}

/* ── PRONTO ───────────────────────────────────────────────────────────────
 * Da REVISÃO que a pessoa viu. O segundo "pronto" da mesma revisão trava:
 * as reservas dos dois lados nascem juntas, ou nenhuma nasce. */
function prontoTx(db, { trocaId, userId, revisao, pack, agora, checkpoint }) {
  return emTransacao(db, () => {
    const t = daParte(db, { trocaId, userId });
    exigirAberta(t, agora, [ESTADO.OFFERED]);
    if (revisao !== t.revisao) throw falha(ERRO_TROCA.REVISAO, `a troca está na revisão ${t.revisao}`, { revisao: t.revisao });
    const { a, b } = ladosEmOrdem(db, t);
    if (!contar(a.ativos) && !contar(b.ativos)) throw falha(ERRO_TROCA.VAZIA, 'nada muda de dono numa troca vazia');
    db.prepare(`UPDATE trocas_lados SET pronto_revisao = ? WHERE troca_id = ? AND user_id = ?`).run(revisao, t.id, userId);
    evento(db, t, userId, 'pronto', agora);
    const outro = (userId === a.user_id ? b : a);
    if (outro.pronto_revisao !== t.revisao) return { id: t.id, revisao: t.revisao, estado: ESTADO.OFFERED };
    return travar(db, { t, a, b, pack, agora, checkpoint });
  });
}

function travar(db, { t, a, b, pack, agora, checkpoint }) {
  const lockAte = agora + PRAZOS_TROCA.lockMs;
  for (const [l, o] of [[a, b], [b, a]]) {
    /* Quem só recebe também precisa poder negociar (a doação). */
    const c = elegibilidadeDaConta(db, { userId: l.user_id, acao: 'trade', agora, checkpoint });
    if (!c.allowed) throw falha(ERRO_TROCA.RECUSADA, `uma conta não pode negociar: ${c.reason_code}${c.detalhe ? ` (${c.detalhe})` : ''}`, { reason_code: c.reason_code });
    if (!contar(l.ativos)) continue;
    const p = previewTrade({ valorA: l.ativos.moeda });
    if (!p.ok) throw falha(ERRO_TROCA.OFERTA, p.motivo);
    reservarOferta(db, { userId: l.user_id, pack, dono: { ...dono(t.id), contraparte: o.user_id },
                         ativos: { criaturas: l.ativos.criaturas, itens: l.ativos.itens, moeda: l.ativos.moeda ? p.a.reservar : 0 },
                         expiraEm: lockAte, agora, checkpoint });
  }
  db.prepare(`UPDATE trocas SET estado = 'LOCKED', lock_expira_em = ?, atualizada_em = ? WHERE id = ?`).run(lockAte, agora, t.id);
  const nova = lerTroca(db, t.id);
  evento(db, nova, null, 'travada', agora);
  return { id: t.id, revisao: t.revisao, estado: ESTADO.LOCKED, lockExpiraEm: lockAte, hash: hashDaTroca(db, nova) };
}

/* ── CONFIRMAR ────────────────────────────────────────────────────────────
 * Da revisão E da impressão digital. A segunda confirmação liquida, na mesma
 * transação. A confirmação repetida depois de liquidada devolve o RECIBO —
 * é a resposta que a pessoa perdeu num timeout, e não uma segunda troca. */
export function confirmar(db, { trocaId, userId, revisao, hash, agora, checkpoint }) {
  return emTransacao(db, () => {
    const t = daParte(db, { trocaId, userId });
    if (t.estado === ESTADO.SETTLED) {
      const meu = db.prepare(`SELECT confirmado_revisao r, confirmado_hash h FROM trocas_lados WHERE troca_id = ? AND user_id = ?`).get(t.id, userId);
      if (meu.r === revisao && meu.h === hash) return { ...JSON.parse(t.recibo_json), repetido: true };
    }
    exigirAberta(t, agora, [ESTADO.LOCKED]);
    if (revisao !== t.revisao) throw falha(ERRO_TROCA.REVISAO, `a troca está na revisão ${t.revisao}`, { revisao: t.revisao });
    exigirVigente(db, { dono: dono(t.id), agora });
    if (hash !== hashDaTroca(db, t)) throw falha(ERRO_TROCA.HASH, 'o que está na troca não é o que você viu — revise de novo');
    for (const u of [t.criador_id, t.contraparte_id]) {
      const c = elegibilidadeDaConta(db, { userId: u, acao: 'trade', agora, checkpoint });
      if (!c.allowed) throw falha(ERRO_TROCA.RECUSADA, `uma conta não pode negociar: ${c.reason_code}${c.detalhe ? ` (${c.detalhe})` : ''}`, { reason_code: c.reason_code });
    }
    db.prepare(`UPDATE trocas_lados SET confirmado_revisao = ?, confirmado_hash = ? WHERE troca_id = ? AND user_id = ?`).run(revisao, hash, t.id, userId);
    evento(db, t, userId, 'confirmada', agora);
    const { a, b } = ladosEmOrdem(db, t);
    const outro = userId === a.user_id ? b : a;
    if (outro.confirmado_revisao !== t.revisao || outro.confirmado_hash !== hash) return { id: t.id, revisao: t.revisao, estado: ESTADO.LOCKED };
    return liquidar(db, { t, a, b, hash, agora });
  });
}

/* ── LIQUIDAR ─────────────────────────────────────────────────────────────
 * Os dois lados, ou nenhum. Cada criatura muda de dono com uma linha no
 * histórico de transferências; cada lote sai do reservado de quem manda e
 * nasce na conta de quem recebe; o PC-T passa com a taxa da política que a
 * troca gravou ao nascer, e a taxa queima.
 *
 * O QUE CHEGA NUMA TROCA É `p2p_verified` (engine/proveniencia.mjs): a
 * criatura e o lote recebidos dizem que vieram de outro jogador, e a cadeia
 * fica no histórico (`criaturas_transferencias`, a fonte `troca:<id>`). Só
 * classe que negocia chega a ser oferecida, então nenhuma restrição se apaga
 * aqui — o que a troca não pode é fingir que quem recebeu capturou. */
function moverLado(db, { t, de, para, ativos, agora }) {
  try { moverReservados(db, { holds: holdsAtivos(db, dono(t.id)), de, para, refTipo: 'troca', refId: t.id, criaturas: ativos.criaturas, agora }); }
  catch (e) { throw e.codigo === ERRO_POSSE.FORA ? falha(ERRO_TROCA.ESTADO, e.message) : e; }
  if (ativos.moeda) {
    const r = liquidarPontaDaTroca(db, { de, para, valor: ativos.moeda, ref: t.id, agora, politica: POLITICA_PILOTO });
    if (!r?.ok) throw falha(ERRO_TROCA.ESTADO, `o PC-T não passou: ${r?.motivo ?? '?'}`);
  }
}

function liquidar(db, { t, a, b, hash, agora }) {
  /* A política que a troca gravou é a que cobra — e se ela não é mais a que
     este código conhece, a troca não liquida com uma taxa inventada. */
  if (t.politica_hash !== hashDaPolitica(POLITICA_PILOTO)) throw falha(ERRO_TROCA.ESTADO, 'a política de taxas desta troca não é mais a vigente');
  const { taxaA, taxaB } = ladosEmOrdem(db, t);
  moverLado(db, { t, de: a.user_id, para: b.user_id, ativos: a.ativos, agora });
  moverLado(db, { t, de: b.user_id, para: a.user_id, ativos: b.ativos, agora });
  consumirOferta(db, { dono: dono(t.id), agora });
  if (holdsAtivos(db, dono(t.id)).length) throw falha(ERRO_TROCA.ESTADO, 'sobrou reserva presa depois de liquidar');
  const recibo = { id: t.id, revisao: t.revisao, hash, estado: ESTADO.SETTLED, liquidadaEm: agora, politica: t.politica_versao,
                   lados: [[a, taxaA], [b, taxaB]].map(([l, taxa]) => ({ userId: l.user_id, enviou: l.ativos, taxa })) };
  db.prepare(`UPDATE trocas SET estado = 'SETTLED', lock_expira_em = NULL, encerrada_em = ?, atualizada_em = ?, recibo_json = ? WHERE id = ? AND estado = 'LOCKED'`)
    .run(agora, agora, JSON.stringify(recibo), t.id);
  evento(db, t, null, 'liquidada', agora);
  emitir(db, { nome: 'trade_settled', campos: { revisao: t.revisao, criaturas: a.ativos.criaturas.length + b.ativos.criaturas.length,
               itens: a.ativos.itens.length + b.ativos.itens.length, pct: a.ativos.moeda + b.ativos.moeda, queima: (taxaA ?? 0) + (taxaB ?? 0) },
               chave: `troca:${t.id}`, agora });
  return recibo;
}

/* ── CANCELAR ─────────────────────────────────────────────────────────────
 * Qualquer parte, enquanto aberta. Disputa com a liquidação pela transação:
 * a que chegar depois encontra o estado mudado e não faz nada pela metade. */
export function cancelar(db, { trocaId, userId, agora }) {
  return emTransacao(db, () => {
    const t = daParte(db, { trocaId, userId });
    if (!ABERTOS.includes(t.estado)) throw falha(ERRO_TROCA.ESTADO, `a troca está ${t.estado}`);
    liberarOferta(db, { dono: dono(t.id), agora });
    db.prepare(`UPDATE trocas SET estado = 'CANCELLED', lock_expira_em = NULL, encerrada_em = ?, atualizada_em = ? WHERE id = ?`).run(agora, agora, t.id);
    evento(db, t, userId, 'cancelada', agora);
    return { id: t.id, estado: ESTADO.CANCELLED };
  });
}

/* ── VENCER ───────────────────────────────────────────────────────────────
 * O lock vence pela oferta (o varredor da ST-14.16 chama `entidade` dentro
 * da mesma transação que vence as reservas); o convite sem reserva vence
 * aqui, em lote. */
export function expirarTrocaDaOferta(db, { dono: d, agora }) {
  const t = lerTroca(db, d.id);
  if (t?.estado !== ESTADO.LOCKED) return;
  db.prepare(`UPDATE trocas SET estado = 'EXPIRED', lock_expira_em = NULL, encerrada_em = ?, atualizada_em = ? WHERE id = ?`).run(agora, agora, t.id);
  evento(db, t, null, 'vencida', agora);
}

export function expirarConvites(db, { agora, limite = 200 }) {
  return emTransacao(db, () => {
    const ids = db.prepare(`SELECT id FROM trocas WHERE estado = 'OFFERED' AND convite_expira_em <= ? ORDER BY convite_expira_em, id LIMIT ?`).all(agora, limite);
    for (const { id } of ids) {
      db.prepare(`UPDATE trocas SET estado = 'EXPIRED', encerrada_em = ?, atualizada_em = ? WHERE id = ? AND estado = 'OFFERED'`).run(agora, agora, id);
      evento(db, lerTroca(db, id), null, 'vencida', agora);
    }
    return { convites: ids.length };
  });
}

/* ── O QUE A TELA LÊ ──────────────────────────────────────────────────────
 * Do ponto de vista de quem pede: `meu` e `outro`, o nome do outro (nunca o
 * id), o hash que a confirmação vai exigir, e o recibo quando liquidada. */
const nomeDe = (db, id) => db.prepare(`SELECT username FROM users WHERE id = ?`).get(id)?.username ?? '?';

export function detalheDaTroca(db, { trocaId, userId }) {
  const t = daParte(db, { trocaId, userId });
  const { a, b, taxaA, taxaB } = ladosEmOrdem(db, t);
  const [meu, outro, minhaTaxa, taxaOutro] = userId === a.user_id ? [a, b, taxaA, taxaB] : [b, a, taxaB, taxaA];
  const lado = (l, taxa) => ({ criaturas: vistaDe(db, l.ativos.criaturas).map(c => ({ ...c, shiny: !!c.shiny })), itens: l.ativos.itens,
                               moeda: l.ativos.moeda, taxa, pronto: l.pronto_revisao === t.revisao,
                               confirmado: l.confirmado_revisao === t.revisao });
  return {
    id: t.id, estado: t.estado, revisao: t.revisao, papel: userId === t.criador_id ? 'criador' : 'contraparte',
    outro: nomeDe(db, outro.user_id), conviteExpiraEm: t.convite_expira_em, lockExpiraEm: t.lock_expira_em,
    politica: { versao: t.politica_versao, hash: t.politica_hash },
    meu: lado(meu, minhaTaxa), dele: lado(outro, taxaOutro),
    hash: t.estado === ESTADO.LOCKED ? hashDaTroca(db, t) : null,
    recibo: t.recibo_json ? JSON.parse(t.recibo_json) : null,
  };
}

export function minhasTrocas(db, { userId, limite = 30 }) {
  return db.prepare(`SELECT id, criador_id, contraparte_id, estado, revisao, atualizada_em FROM trocas
                      WHERE criador_id = ? OR contraparte_id = ? ORDER BY atualizada_em DESC, id LIMIT ?`).all(userId, userId, limite)
    .map(t => ({ id: t.id, estado: t.estado, revisao: t.revisao, atualizadaEm: t.atualizada_em,
                 papel: t.criador_id === userId ? 'criador' : 'contraparte',
                 outro: nomeDe(db, t.criador_id === userId ? t.contraparte_id : t.criador_id) }));
}
