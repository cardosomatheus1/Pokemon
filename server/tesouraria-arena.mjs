import { emTransacao, creditar } from './carteira.mjs';
import {verbaReservada,campanhaDoResgate} from './arena-orcamento.mjs';

export const saldoCasaArena = db => Object.fromEntries(['bonus', 'competitivo'].map(b => [b,
  db.prepare('SELECT COALESCE(SUM(delta), 0) AS saldo FROM arena_tesouraria WHERE bucket = ?').get(b).saldo]));

/* A taxa sai da contribuição do perdedor: o stake próprio do vencedor volta
   com a proveniência original. Não inventa receita retroativa. */
export function creditarTaxaCasa(db, { id, rake, composicao, agora }) {
  let restante = rake;
  for (const bucket of ['bonus', 'competitivo']) {
    const n = Math.min(restante, composicao[bucket] ?? 0);
    if (n > 0) db.prepare(`INSERT INTO arena_tesouraria (referencia, tipo, bucket, delta, criado_em)
      VALUES (?, 'LEAGUE_RAKE', ?, ?, ?)`).run(id, bucket, n, agora);
    restante -= n;
  }
  if (restante !== 0) throw new Error('taxa sem contribuição correspondente');
}

/* Campanha interna: a mesma transação debita a casa e paga PC-B. A aplicação
   não expõe uma rota pública de emissão. O orçamento é finito e da casa. */
export function pagarCampanhaArena(db, { campanha, userId, valor, teto, agora }) {
  if (!/^[\w-]{8,64}$/.test(campanha) || !Number.isSafeInteger(valor) || valor <= 0
    || !Number.isSafeInteger(teto) || teto < valor) throw new Error('campanha inválida');
  return emTransacao(db, () => {
    const idem = `arena-promo:${campanha}:${userId}`;
    if (db.prepare('SELECT 1 FROM wallet_ledger WHERE idem_key = ?').get(idem)) return { repetida: true };
    const usado = -db.prepare(`SELECT COALESCE(SUM(delta), 0) AS n FROM arena_tesouraria
      WHERE substr(referencia, 1, ?) = ? AND tipo = 'PROMO_DEBIT'`).get(campanha.length + 1, `${campanha}:`).n;
    if (usado + valor > teto) throw new Error('orçamento da campanha esgotado');
    const saldo = saldoCasaArena(db);
    const livre=saldo.bonus+saldo.competitivo-verbaReservada(db,{agora,exceto:campanhaDoResgate(db,campanha)});
    if (livre < valor) throw new Error('saldo da casa insuficiente');
    let restante = valor;
    for (const bucket of ['bonus', 'competitivo']) {
      const n = Math.min(restante, saldo[bucket]);
      if (n > 0) db.prepare(`INSERT INTO arena_tesouraria (referencia, tipo, bucket, delta, criado_em)
        VALUES (?, 'PROMO_DEBIT', ?, ?, ?)`).run(`${campanha}:${userId}`, bucket, -n, agora);
      restante -= n;
    }
    creditar(db, { userId, tipo: 'DAILY_REWARD', bucket: 'bonus', valor, idem, ref: campanha, refTipo: 'arena_campanha', agora });
    return { pago: valor };
  });
}
