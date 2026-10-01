/* A CONCILIAÇÃO DA ECONOMIA ENTRE JOGADORES (ST-14.16 · E14 · spec E14 §15).
 *
 * O escrow é escrito em três lugares que precisam contar a mesma história:
 * a reserva (`asset_holds`), o que ela prende (a criatura, o lote, o PC-T
 * reservado no ledger) e o saldo. Aqui se mede se contam — e a medida é
 * POR RESERVA, com endereço, e não um total que fecha por compensação:
 *
 *   órfã         a reserva ativa cuja criatura sumiu ou mudou de dono, cujo
 *                lote não é mais da conta ou não é daquele item
 *   lote         `reservada` do lote ≠ a soma das reservas ativas dele, ou
 *                fora de [0, quantidade]
 *   moeda        o PC-T reservado no ledger por aquela reserva (a soma de
 *                `reserva_delta` com a referência dela) ≠ o que o estado diz:
 *                a quantidade se ativa, zero se liberada ou vencida
 *   ledger       o saldo da carteira ≠ a soma do ledger (`reconciliarNoBanco`)
 *   inventário   a bolsa ≠ a soma dos lotes (`conferirInventario`)
 *
 * O QUE ACHA, ESCREVE; NÃO CONSERTA. Ajustar saldo para a conta fechar é
 * apagar a evidência do defeito que a abriu. A divergência fica aberta com o
 * número, a conta dona dela deixa de abrir oferta nova (a política única lê
 * `emDivergencia`), e só um operador da economia fecha — e fechar não muda
 * nada além do registro: se a diferença continua, a passada seguinte reabre.
 */
import { agir } from './admin.mjs';
import { reconciliarNoBanco } from './carteira.mjs';
import { conferirInventario } from './inventario.mjs';
import { emitir } from './telemetria.mjs';

export const ERRO_CONCILIACAO = Object.freeze({ NAO: 'DIVERGENCIA_NAO_ABERTA' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

const tem = (db, tabela) => !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(tabela);

/* ── MEDIR (só leitura: a conferência da cópia usa o mesmo) ────────────── */
export function divergenciasDaEconomia(db, { ledger = true } = {}) {
  const out = [];
  const achou = (userId, tipo, chave, detalhe) => out.push({ userId, tipo, chave, detalhe });
  if (tem(db, 'asset_holds')) {
    for (const h of db.prepare(`SELECT h.id, h.user_id, h.criatura_id, c.user_id AS dono FROM asset_holds h
                                  LEFT JOIN criaturas c ON c.id = h.criatura_id
                                 WHERE h.estado = 'ativa' AND h.tipo = 'criatura'`).all())
      if (h.dono !== h.user_id) achou(h.user_id, 'orfa', h.id, h.dono ? `a criatura ${h.criatura_id} é de ${h.dono}` : `a criatura ${h.criatura_id} não existe mais`);
    for (const h of db.prepare(`SELECT h.id, h.user_id, h.item_id, h.lote_id, l.user_id AS dono, l.item_id AS item FROM asset_holds h
                                  LEFT JOIN bolsa_lotes l ON l.id = h.lote_id
                                 WHERE h.estado = 'ativa' AND h.tipo = 'item'`).all())
      if (h.dono !== h.user_id || h.item !== h.item_id) achou(h.user_id, 'orfa', h.id, `o lote ${h.lote_id} não é ${h.item_id} desta conta`);
    for (const l of db.prepare(`SELECT l.id, l.user_id, l.quantidade, l.reservada,
                                       COALESCE((SELECT SUM(h.quantidade) FROM asset_holds h WHERE h.lote_id = l.id AND h.estado = 'ativa'), 0) AS presa
                                  FROM bolsa_lotes l`).all())
      if (l.reservada !== l.presa || l.reservada < 0 || l.reservada > l.quantidade)
        achou(l.user_id, 'lote', String(l.id), `reservada ${l.reservada}, reservas ativas ${l.presa}, quantidade ${l.quantidade}`);
    /* A liquidação (ST-14.7) move o reservado por outra referência — a
       reserva CONSUMIDA é conferida lá, quando ela existir. */
    for (const h of db.prepare(`SELECT h.id, h.user_id, h.quantidade, h.estado,
                                       COALESCE((SELECT SUM(w.reserva_delta) FROM wallet_ledger w
                                                  WHERE w.user_id = h.user_id AND w.reference_type = 'p2p' AND w.reference_id = h.id), 0) AS r
                                  FROM asset_holds h WHERE h.tipo = 'moeda' AND h.estado != 'consumida'`).all()) {
      const deve = h.estado === 'ativa' ? h.quantidade : 0;
      if (h.r !== deve) achou(h.user_id, 'moeda', h.id, `${h.estado}: o ledger reserva ${h.r}, deveria ${deve}`);
    }
  }
  for (const { id } of db.prepare(`SELECT id FROM users`).all()) {
    if (ledger) for (const p of reconciliarNoBanco(db, id)) achou(id, 'ledger', `${id}:${p.split(':')[0]}`, p);
    if (tem(db, 'bolsa_lotes')) for (const p of conferirInventario(db, id)) achou(id, 'inventario', `${id}:${p.split(':')[0]}`, p);
  }
  return out;
}

/* ── REGISTRAR ────────────────────────────────────────────────────────── */
export function conciliarEconomia(db, { agora }) {
  const achadas = divergenciasDaEconomia(db);
  let novas = 0;
  for (const d of achadas) {
    const r = db.prepare(`INSERT INTO economia_divergencias (user_id, tipo, chave, detalhe, detectada_em) VALUES (?, ?, ?, ?, ?)
                          ON CONFLICT (tipo, chave) WHERE resolvida_em IS NULL DO NOTHING`).run(d.userId, d.tipo, d.chave, d.detalhe, agora);
    if (!r.changes) continue;
    novas++;
    /* Uma vez por divergência aberta: a chave dedupe a passada repetida. */
    emitir(db, { nome: 'economy_divergence_detected', userId: d.userId, campos: { tipo: d.tipo, chave: d.chave },
                 chave: `div:${d.tipo}:${d.chave}:${agora}`, agora });
  }
  return { novas, achadas: achadas.length, abertas: divergenciasAbertas(db).length };
}

export const divergenciasAbertas = db =>
  db.prepare(`SELECT * FROM economia_divergencias WHERE resolvida_em IS NULL ORDER BY detectada_em, id`).all();

export const emDivergencia = (db, userId) =>
  tem(db, 'economia_divergencias') && !!db.prepare(`SELECT 1 FROM economia_divergencias WHERE user_id = ? AND resolvida_em IS NULL LIMIT 1`).get(userId);

export function fecharDivergencia(db, { operadorId, id, motivo, confirmado, agora }) {
  const d = db.prepare(`SELECT * FROM economia_divergencias WHERE id = ? AND resolvida_em IS NULL`).get(id);
  return agir(db, { operadorId, acao: 'economia.divergencia.fechar', alvo: d?.user_id ?? String(id), de: 'aberta', para: 'fechada', motivo, confirmado, agora }, op => {
    if (!d) throw falha(ERRO_CONCILIACAO.NAO, 'nenhuma divergência aberta com este id');
    db.prepare(`UPDATE economia_divergencias SET resolvida_em = ?, resolvida_por = ?, motivo = ? WHERE id = ?`).run(agora, op.id, motivo, id);
    return { ok: true };
  });
}
