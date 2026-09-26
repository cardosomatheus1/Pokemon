/* O GATE DA V2 NO SERVIDOR — junta o que o banco sabe e pergunta ao motor
 * (ST-12.10 · F2.8 · Spec §6.14, §6.15).
 *
 * A conta e as metas são de `engine/gate-v2.mjs`; aqui só se lê. O mesmo
 * resultado vai para o painel de política (o operador) e para o relatório do
 * piloto (o dono, no terminal) — um número, dois lugares, nenhuma segunda
 * conta.
 */
import { indicadoresDoBolo, calibracaoPorSemana, gateDaV2 } from '../engine/gate-v2.mjs';

const DIA = 86_400_000;

export function gateDaV2Servidor(db, { agora = Date.now(), dias = 14 } = {}) {
  const mercados = db.prepare(`SELECT id, round_id FROM markets WHERE status = 'liquidado'`).all();
  const entradas = db.prepare(`SELECT user_id, selection, amount FROM market_entries
                                WHERE market_id = ? AND status <> 'cancelada'`);
  const tamanho = db.prepare(`SELECT COUNT(*) AS n FROM round_fighters WHERE round_id = ?`);
  const pago = db.prepare(`SELECT COALESCE(SUM(l.amount), 0) AS s FROM wallet_ledger l
                             JOIN market_entries e ON e.id = l.reference_id
                            WHERE e.market_id = ? AND l.type LIKE 'MARKET_PAYOUT%'`);
  const casa = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS s FROM treasury_ledger WHERE reference_id = ?`);
  const bolos = mercados.map(m => {
    const es = entradas.all(m.id);
    const totais = new Array(tamanho.get(m.round_id).n).fill(0);
    for (const e of es) totais[e.selection] += e.amount;
    return { entradas: es.map(e => ({ user: e.user_id, selecao: e.selection, valor: e.amount })), totais,
             entrou: es.reduce((a, e) => a + e.amount, 0), saiu: pago.get(m.id).s + casa.get(m.id).s };
  });
  const indicadores = indicadoresDoBolo(bolos);

  const previsoes = db.prepare(`SELECT p.score, p.created_at AS criadoEm, u.created_at AS contaCriadaEm
                                  FROM predictions p JOIN users u ON u.id = p.user_id
                                 WHERE p.score IS NOT NULL`).all();
  const desde = agora - dias * DIA;
  const ligaJogadores = db.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM predictions WHERE created_at >= ?`)
    .get(desde).n;
  const ativos = db.prepare(`SELECT COUNT(DISTINCT user_id) AS n FROM (
                               SELECT user_id FROM player_activity WHERE criado_em >= ?
                               UNION SELECT user_id FROM predictions WHERE created_at >= ?)`).get(desde, desde).n;
  const calibracao = calibracaoPorSemana(previsoes);
  return { indicadores, calibracao, gate: gateDaV2({ indicadores, calibracao, ligaJogadores, ativos }) };
}
