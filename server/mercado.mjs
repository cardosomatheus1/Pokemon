/* O BOLO MÚTUO NO SERVIDOR — abrir, entrar, sair, travar (ST-12.3 · F2.1a).
 *
 * Fronteira: recebe a intenção do jogador, confere contra a rodada, a
 * carteira, a pausa e os limites, e grava a entrada. Não apura (isso é
 * `engine/mutuo.mjs`, chamado pela liquidação da ST-12.4), não precifica
 * (ST-12.5), não serve HTTP (`mercado-rotas.mjs`).
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA TORNAR IMPOSSÍVEL ───────────────────────
 *
 *   ENTRAR DEPOIS DO LOCK      a fase é lida do scheduler, como na aposta. O
 *                              bolo trava no MESMO passo que as apostas
 *                              (`travarMercados` é chamado ao lado de
 *                              `travarApostas`): a semente é revelada ali.
 *   ESCOLHER O MERCADO         o jogador não manda id de mercado nem de rodada:
 *                              é sempre o bolo da rodada aberta. Aceitar o id
 *                              abriria "entrar no bolo de outra rodada".
 *   LIMITE POR MERCADO         o §6.13 manda somar TODOS os mercados. A
 *                              exposição da rodada é aposta + bolo, e é ela
 *                              que o `avaliarAposta` recebe — nos dois
 *                              caminhos (`aposta.mjs` pergunta aqui).
 *   PREÇO NA JANELA            `mercadoParaCliente` é lista branca. As colunas
 *                              `model_*` nunca são lidas por ela.
 */
import { randomUUID } from 'node:crypto';
import { ESTADOS } from './scheduler.mjs';
import { reservarNoBanco, liberarNoBanco, liquidarEntradaNoBanco, emTransacao } from './carteira.mjs';
import { avaliarAposta, avaliarRodada, registrarRodada, registrarBloqueio, registrarPerda,
         ERRO_LIMITE } from './limites.mjs';
import { podeAgir, ERRO_PROTECAO } from './protecao.mjs';
import { ERRO_APOSTA } from './aposta.mjs';
import { TAXA_PADRAO, SEM_ACERTO, apurar } from '../engine/mutuo.mjs';
import { lerRaiz } from '../engine/seed.mjs';
import { selecoesDeAbates, vencedorasPorAbates, REGRA_ABATES } from '../engine/mercado-abates.mjs';

export const ERRO_MERCADO = {
  SEM_MERCADO: 'sem_mercado',
  SELECAO:     'selecao_invalida',
  SEM_ENTRADA: 'sem_entrada',
  DIVERGENCIA: 'rodada_divergente',
};

/* UM MERCADO POR VEZ (§6.5): um bolo sem liquidez não forma preço, e vários
   rasos são piores que um líquido. Pódio e duração entram quando a leitura de
   liquidez (ST-12.10) disser que o de abates tem gente. */
export const MERCADOS_ABERTOS = ['abates'];
/* A recomendação R15 do PLANO: "ninguém acertou" devolve. É o destino que não
   transforma o azar de todos em receita da casa. */
export const SEM_ACERTO_PADRAO = SEM_ACERTO.DEVOLVER;

const REGRAS = { abates: REGRA_ABATES };

const erro = (codigo, mensagem, extra) => Object.assign(new Error(mensagem), { codigo, ...extra });
const inteiroPositivo = v => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;

/* ── A VIDA DO BOLO, NO RITMO DA RODADA ────────────────────────────────────
 *
 * Chamado DENTRO da transação que cria a rodada: rodada sem bolo, ou bolo sem
 * rodada, é um estado que ninguém deveria conseguir observar. */
export function abrirMercados(db, { roundId, abreEm, travaEm }) {
  const ins = db.prepare(
    `INSERT INTO markets (id, round_id, kind, status, opens_at, locks_at, fee_rate, no_winner_destination)
     VALUES (?,?,?,?,?,?,?,?)`);
  for (const kind of MERCADOS_ABERTOS)
    ins.run(randomUUID(), roundId, kind, 'aberto', abreEm, travaEm, TAXA_PADRAO, SEM_ACERTO_PADRAO);
}

export function travarMercados(db, { roundId, agora = Date.now() }) {
  db.prepare(`UPDATE market_entries SET status = 'travada', locked_at = ?
               WHERE status = 'aberta' AND market_id IN (SELECT id FROM markets WHERE round_id = ?)`)
    .run(agora, roundId);
  return db.prepare(`UPDATE markets SET status = 'travado' WHERE round_id = ? AND status = 'aberto'`)
    .run(roundId).changes;
}

/* ── A EXPOSIÇÃO DA RODADA, QUE OS DOIS CAMINHOS SOMAM ────────────────────
 *
 * `excetoAposta` / `excetoMercado` tiram da conta a posição que está sendo
 * TROCADA: quem troca 50 por 20 não pode ser cobrado pelos 50 antigos. */
export function exposicaoNaRodada(db, { userId, roundId, excetoAposta = false, excetoMercado = null }) {
  const aposta = excetoAposta ? 0 : db.prepare(
    `SELECT COALESCE(SUM(stake), 0) AS s FROM bets WHERE user_id = ? AND round_id = ? AND status = 'aberta'`)
    .get(userId, roundId).s;
  const bolo = db.prepare(
    `SELECT COALESCE(SUM(e.amount), 0) AS s FROM market_entries e JOIN markets m ON m.id = e.market_id
      WHERE e.user_id = ? AND m.round_id = ? AND e.status = 'aberta' AND m.id IS NOT ?`)
    .get(userId, roundId, excetoMercado).s;
  return aposta + bolo;
}

/* Já joga nesta rodada, por qualquer mercado? "Rodada nova conta como rodada"
   (§28.3): aposta e bolo na mesma rodada são UMA rodada de exposição. */
export function jogaNaRodada(db, { userId, roundId }) {
  const b = db.prepare(`SELECT 1 FROM bets WHERE user_id = ? AND round_id = ? AND status = 'aberta'`)
    .get(userId, roundId);
  if (b) return true;
  return !!db.prepare(
    `SELECT 1 FROM market_entries e JOIN markets m ON m.id = e.market_id
      WHERE e.user_id = ? AND m.round_id = ? AND e.status = 'aberta'`).get(userId, roundId);
}

function mercadoAberto(db, sched, kind) {
  const rodada = sched.rodadaAtual();
  if (!rodada) throw erro(ERRO_APOSTA.RODADA, 'não há rodada');
  if (rodada.status !== ESTADOS.ABERTA)
    throw erro(ERRO_APOSTA.JANELA_FECHADA, 'a janela do bolo está fechada');
  const m = db.prepare(`SELECT * FROM markets WHERE round_id = ? AND kind = ?`).get(rodada.id, kind);
  if (!m || m.status !== 'aberto') throw erro(ERRO_MERCADO.SEM_MERCADO, 'não há bolo aberto nesta rodada');
  return { rodada, m };
}

/* ── ENTRAR (e trocar, que é a mesma coisa) ──────────────────────────────── */

export function entrarNoMercado(db, { sched, userId, kind = 'abates', selecao, valor, agora = Date.now() }) {
  const { rodada, m } = mercadoAberto(db, sched, kind);

  const conta = db.prepare(`SELECT status FROM users WHERE id = ?`).get(userId);
  if (!conta || conta.status !== 'ativo') throw erro(ERRO_APOSTA.CONTA, 'esta conta não pode apostar');

  /* A PAUSA ANTES DO LIMITE, pela mesma razão da aposta: durante um cool-off
     nenhuma entrada cabe, e o limite é a resposta errada à pergunta certa. */
  const pausa = podeAgir(db, { userId, acao: 'apostar', agora });
  if (!pausa.ok)
    throw erro(ERRO_PROTECAO.PAUSADO, 'conta em pausa', { pausa: pausa.pausa });

  const n = db.prepare(`SELECT COUNT(*) AS n FROM round_fighters WHERE round_id = ?`).get(rodada.id).n;
  if (!Number.isInteger(selecao) || !selecoesDeAbates(n).includes(selecao))
    throw erro(ERRO_MERCADO.SELECAO, 'seleção inválida');
  if (!inteiroPositivo(valor)) throw erro(ERRO_APOSTA.VALOR, 'valor inválido');

  const ja = db.prepare(`SELECT * FROM market_entries WHERE market_id = ? AND user_id = ?`).get(m.id, userId);
  const viva = ja?.status === 'aberta' ? ja : null;

  const exposicao = valor + exposicaoNaRodada(db, { userId, roundId: rodada.id, excetoMercado: m.id });
  const nova = !jogaNaRodada(db, { userId, roundId: rodada.id });
  const veredito = nova
    ? (r => r.ok ? avaliarAposta(db, { userId, valor: exposicao, agora }) : r)(avaliarRodada(db, { userId, agora }))
    : avaliarAposta(db, { userId, valor: exposicao, agora });
  if (!veredito.ok) {
    registrarBloqueio(db, { userId, veredito, contexto: 'bolo', agora });
    throw erro(ERRO_LIMITE.BLOQUEADO, `limite ${veredito.limite}: ${veredito.usado} de ${veredito.teto}`,
               { limite: veredito });
  }

  /* TROCAR É DESFAZER E REFAZER, nesta ordem — e sem chave de idempotência na
     liberação, pelo defeito que a aposta já teve (ver `apostar`). */
  const refId = ja?.id ?? randomUUID();
  const tipos = { refTipo: 'market_entry' };
  if (viva) liberarNoBanco(db, { userId, composicao: JSON.parse(viva.stake_breakdown), ref: refId, agora,
                                 tipo: 'MARKET_ENTRY_RELEASE', ...tipos });
  const reserva = reservarNoBanco(db, { userId, valor, ref: refId, agora, tipo: 'MARKET_ENTRY_RESERVE', ...tipos });
  if (!reserva.ok) {
    if (viva) reservarNoBanco(db, { userId, valor: viva.amount, ref: refId, agora,
                                    tipo: 'MARKET_ENTRY_RESERVE', ...tipos });
    throw erro(reserva.motivo === 'saldo_insuficiente' ? ERRO_APOSTA.SALDO : ERRO_APOSTA.VALOR, 'saldo insuficiente');
  }

  if (ja) db.prepare(`UPDATE market_entries SET selection = ?, amount = ?, stake_breakdown = ?, status = 'aberta'
                      WHERE id = ?`).run(selecao, valor, JSON.stringify(reserva.composicao), refId);
  else db.prepare(`INSERT INTO market_entries (id, market_id, user_id, selection, amount, stake_breakdown,
                                               status, created_at)
                   VALUES (?,?,?,?,?,?,'aberta',?)`)
    .run(refId, m.id, userId, selecao, valor, JSON.stringify(reserva.composicao), agora);
  if (nova) registrarRodada(db, { userId, agora });
  return { id: refId, kind, selecao, valor, composicao: reserva.composicao };
}

export function sairDoMercado(db, { sched, userId, kind = 'abates', agora = Date.now() }) {
  const { m } = mercadoAberto(db, sched, kind);
  const e = db.prepare(`SELECT * FROM market_entries WHERE market_id = ? AND user_id = ? AND status = 'aberta'`)
    .get(m.id, userId);
  if (!e) throw erro(ERRO_MERCADO.SEM_ENTRADA, 'não há entrada neste bolo');
  liberarNoBanco(db, { userId, composicao: JSON.parse(e.stake_breakdown), ref: e.id, agora,
                       tipo: 'MARKET_ENTRY_RELEASE', refTipo: 'market_entry' });
  db.prepare(`UPDATE market_entries SET status = 'cancelada' WHERE id = ?`).run(e.id);
  return { id: e.id };
}

/* ── A LIQUIDAÇÃO (ST-12.4 · F2.1b) ──────────────────────────────────────
 *
 * UMA TRANSAÇÃO POR BOLO: todas as entradas, a tesouraria e o status do bolo,
 * ou nada. Metade do bolo pago é o estado que ninguém consegue explicar depois.
 *
 * IDEMPOTENTE EM DOIS NÍVEIS, como a aposta: o bolo `liquidado` não é
 * reprocessado, e cada lançamento carrega chave derivada da entrada.
 *
 * A RESPOSTA SAI DA RAIZ REVELADA, e não da memória do scheduler: um bolo tem
 * de ser pago mesmo que o servidor tenha caído entre o fim e a liquidação. E a
 * pool recalculada é conferida contra `round_fighters` ANTES de pagar — se o
 * motor de hoje não reproduz a rodada de ontem (versão mudou), o bolo não
 * paga ninguém em silêncio: recusa, e o erro tem endereço. */
export function liquidarMercado(db, { sched, marketId, agora = Date.now() }) {
  const m = db.prepare(`SELECT * FROM markets WHERE id = ?`).get(marketId);
  if (!m) throw erro(ERRO_MERCADO.SEM_MERCADO, 'bolo desconhecido');
  if (m.status === 'liquidado') return { repetida: true };
  const r = db.prepare(`SELECT status, round_seed_reveal FROM rounds WHERE id = ?`).get(m.round_id);
  if (r?.status !== ESTADOS.ENCERRADA || m.status !== 'travado')
    throw erro(ERRO_APOSTA.RODADA, 'a rodada do bolo ainda não terminou');

  const resultado = sched.resultadoDaRaiz(lerRaiz(r.round_seed_reveal));
  const pool = db.prepare(`SELECT species_id FROM round_fighters WHERE round_id = ? ORDER BY slot`).all(m.round_id);
  if (resultado.length !== pool.length || resultado.some((x, i) => x.dex !== pool[i].species_id))
    throw erro(ERRO_MERCADO.DIVERGENCIA, `a rodada ${m.round_id} recalculada não bate com a publicada`);
  const vencedoras = vencedorasPorAbates(resultado.map(x => x.abates));

  const entradas = db.prepare(`SELECT * FROM market_entries WHERE market_id = ? AND status = 'travada'`).all(m.id);
  const ap = apurar({ entradas: entradas.map(e => ({ id: e.id, selecao: e.selection, valor: e.amount })),
                      vencedoras, taxa: m.fee_rate, semAcerto: m.no_winner_destination });

  emTransacao(db, () => {
    const marcar = db.prepare(`UPDATE market_entries SET status = ?, payout = ?, settled_at = ? WHERE id = ?`);
    for (const e of entradas) {
      const pag = ap.pagamentos[e.id];
      const res = liquidarEntradaNoBanco(db, { userId: e.user_id, composicao: JSON.parse(e.stake_breakdown),
                                              pagamento: pag, ref: e.id, idem: `msettle-${e.id}`, agora });
      if (!res.ok) throw new Error(`a entrada ${e.id} não liquidou: ${res.motivo}`);
      marcar.run(ap.destino === 'devolucao' ? 'devolvida' : pag > 0 ? 'ganha' : 'perdida', pag, agora, e.id);
      /* A perda LÍQUIDA entra no mesmo limite da aposta (§6.13): um limite só. */
      registrarPerda(db, { userId: e.user_id, valor: e.amount - pag, agora });
    }
    const casa = db.prepare(`INSERT INTO treasury_ledger (id, type, amount, reference_type, reference_id,
                                                          idem_key, created_at) VALUES (?,?,?,?,?,?,?)`);
    for (const [tipo, v] of [['MARKET_FEE', ap.taxa], ['MARKET_RESIDUE', ap.residuo], ['MARKET_UNCLAIMED', ap.tesouraria]])
      if (v > 0) casa.run(randomUUID(), tipo, v, 'market', m.id, `${tipo}-${m.id}`, agora);
    db.prepare(`UPDATE markets SET status = 'liquidado', settled_at = ?, pot_gross = ?, pot_net = ?,
                       fee_amount = ?, residue_amount = ?, treasury_amount = ? WHERE id = ?`)
      .run(agora, ap.bruto, ap.liquido, ap.taxa, ap.residuo, ap.tesouraria, m.id);
  });
  return { entradas: entradas.length, vencedoras, destino: ap.destino, bruto: ap.bruto };
}

/* Todo bolo travado de rodada encerrada — o que o laço chama a cada fim de
   rodada e o servidor chama ao ligar, ao lado do `liquidarPendentes`. Um bolo
   que falha não segura os outros: o erro sobe no fim, com todos tentados. */
export function liquidarMercadosPendentes(db, { sched, agora = Date.now() }) {
  const ids = db.prepare(`SELECT m.id FROM markets m JOIN rounds r ON r.id = m.round_id
                           WHERE m.status = 'travado' AND r.status = ?`).all(ESTADOS.ENCERRADA).map(x => x.id);
  const erros = [];
  for (const marketId of ids) {
    try { liquidarMercado(db, { sched, marketId, agora }); } catch (e) { erros.push(e); }
  }
  if (erros.length) throw erros[0];
  return ids.length;
}

/* ── O QUE O CLIENTE VÊ ──────────────────────────────────────────────────
 *
 * LISTA BRANCA, como `paraCliente` do scheduler. A composição do bolo é
 * pública (§6.6 só proíbe o preço do MODELO) — é ela que forma o preço que o
 * jogador lê. Quem entrou não aparece: o bolo mostra dinheiro, não pessoas. */
export function mercadoParaCliente(db, { sched, userId, kind = 'abates' }) {
  const rodada = sched.rodadaAtual();
  if (!rodada) return null;
  const m = db.prepare(`SELECT id, kind, status, fee_rate, no_winner_destination, locks_at
                          FROM markets WHERE round_id = ? AND kind = ?`).get(rodada.id, kind);
  if (!m) return null;
  const n = db.prepare(`SELECT COUNT(*) AS n FROM round_fighters WHERE round_id = ?`).get(rodada.id).n;
  const por = new Map(db.prepare(
    `SELECT selection, SUM(amount) AS total, COUNT(*) AS entradas FROM market_entries
      WHERE market_id = ? AND status IN ('aberta','travada') GROUP BY selection`).all(m.id).map(r => [r.selection, r]));
  const selecoes = selecoesDeAbates(n).map(i => ({ selecao: i, total: por.get(i)?.total ?? 0,
                                                    entradas: por.get(i)?.entradas ?? 0 }));
  const minha = userId ? db.prepare(
    `SELECT selection, amount FROM market_entries
      WHERE market_id = ? AND user_id = ? AND status IN ('aberta','travada')`)
    .get(m.id, userId) : null;
  return {
    id: m.id, kind: m.kind, fase: m.status, taxa: m.fee_rate, semAcerto: m.no_winner_destination,
    travaEm: m.locks_at, regra: REGRAS[m.kind],
    bruto: selecoes.reduce((a, x) => a + x.total, 0), selecoes,
    minha: minha ? { selecao: minha.selection, valor: minha.amount } : null,
  };
}
