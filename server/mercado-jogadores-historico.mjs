/* O HISTÓRICO DE PREÇOS DO MARKET (ST-14.12 · E14 · spec E14 §12).
 *
 * A conta é da camada 0 (`engine/historico-precos.mjs`); aqui mora QUAIS
 * vendas entram nela. Só a venda liquidada do Market (`player_market_fills`,
 * append-only — o bruto nunca muda), da MESMA série: pack, espécie, shiny e
 * faixa de potencial, ou o item. Normal e shiny nunca se juntam para fechar
 * amostra; a troca direta e a transferência não são venda e não entram.
 *
 * E a referência EXCLUI, sem apagar nada do bruto:
 *
 *   a venda anulada por um operador — `player_market_fills_exclusoes`
 *   a venda em que uma das contas tem SUSPEITA aberta, ou está congelada
 *   a venda entre contas que se descobriram ligadas depois
 *
 * Por isso a série é RECALCULADA a cada pedido: a suspeita revisada devolve
 * a venda à referência, a nova a tira — e o histórico bruto fica como estava.
 */
import { resumoDaSerie, FAIXAS_POTENCIAL } from '../engine/historico-precos.mjs';
import { contasLigadas } from './protecao.mjs';
import { agir } from './admin.mjs';

export const ERRO_HISTORICO = Object.freeze({ NAO: 'VENDA_NAO_ENCONTRADA', JA: 'VENDA_JA_EXCLUIDA', SERIE: 'SERIE_INVALIDA' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

/* Quem está sob suspeita aberta ou congelado AGORA. A consulta é uma LISTA
   de pedaços fixos (como a da busca): nada do pedido entra no texto. */
const SOB_SUSPEITA = [
  'SELECT conta_a FROM suspeitas_antifraude WHERE revisada_em IS NULL',
  "UNION SELECT conta_b FROM suspeitas_antifraude WHERE revisada_em IS NULL AND conta_b <> ''",
  'UNION SELECT user_id FROM p2p_congelamentos WHERE levantado_em IS NULL',
].join(' ');

const VENDAS = [
  'SELECT f.id, f.preco, f.quantidade, f.vendedor_id AS vendedor, f.comprador_id AS comprador, f.em',
  'FROM player_market_fills f JOIN player_market_listings l ON l.id = f.listing_id',
  'WHERE f.pack_id = ? AND f.tipo = ?',
  'AND f.id NOT IN (SELECT fill_id FROM player_market_fills_exclusoes)',
  'AND f.vendedor_id NOT IN (', SOB_SUSPEITA, ') AND f.comprador_id NOT IN (', SOB_SUSPEITA, ')',
];
const DA_CRIATURA = 'AND f.dex = ? AND f.shiny = ? AND l.potencial BETWEEN ? AND ?';
const DO_ITEM = 'AND f.item_id = ?';
const MENOR = "SELECT MIN(preco * 1.0 / quantidade) AS m FROM player_market_listings WHERE estado = 'ACTIVE' AND pack_id = ? AND expira_em > ? AND tipo = ?";
const MENOR_DA_CRIATURA = 'AND dex = ? AND shiny = ? AND potencial BETWEEN ? AND ?';
const MENOR_DO_ITEM = 'AND item_id = ?';

/* A série pedida, validada: a criatura exige shiny E faixa — não existe
   "Pikachu, qualquer um", porque misturar é exatamente o que a spec proíbe. */
export function serieDoPedido(q) {
  const get = k => (typeof q?.get === 'function' ? q.get(k) : q?.[k]);
  const item = get('item');
  if (item) {
    if (typeof item !== 'string' || item.length > 40 || !/^[\w:\-.]+$/u.test(item)) throw falha(ERRO_HISTORICO.SERIE, 'item inválido');
    return { tipo: 'item', itemId: item };
  }
  /* a faixa AUSENTE não vira a faixa 0 — `Number(null)` é zero */
  const bruta = get('faixa');
  const dex = Number(get('dex')), shiny = get('shiny'), faixa = bruta == null || bruta === '' ? NaN : Number(bruta);
  if (!Number.isSafeInteger(dex) || dex < 1) throw falha(ERRO_HISTORICO.SERIE, 'espécie inválida');
  if (shiny !== 'sim' && shiny !== 'nao') throw falha(ERRO_HISTORICO.SERIE, 'shiny é "sim" ou "nao" — normal e brilhante não se misturam');
  if (!Number.isInteger(faixa) || !FAIXAS_POTENCIAL[faixa]) throw falha(ERRO_HISTORICO.SERIE, 'faixa de potencial inválida');
  return { tipo: 'criatura', dex, shiny: shiny === 'sim', faixa };
}

export function historicoDaSerie(db, { pack, serie, agora }) {
  const sql = [...VENDAS], args = [pack.id, serie.tipo], menor = [MENOR], argsMenor = [pack.id, agora, serie.tipo];
  if (serie.tipo === 'criatura') {
    const [a, b] = FAIXAS_POTENCIAL[serie.faixa];
    sql.push(DA_CRIATURA); args.push(serie.dex, serie.shiny ? 1 : 0, a, b);
    menor.push(MENOR_DA_CRIATURA); argsMenor.push(serie.dex, serie.shiny ? 1 : 0, a, b);
  } else {
    sql.push(DO_ITEM); args.push(serie.itemId);
    menor.push(MENOR_DO_ITEM); argsMenor.push(serie.itemId);
  }
  /* A ligação descoberta DEPOIS da venda também tira a venda da referência. */
  const vendas = db.prepare(sql.join(' ')).all(...args).filter(v => !contasLigadas(db, v.vendedor).includes(v.comprador));
  const m = db.prepare(menor.join(' ')).get(...argsMenor)?.m;
  return { serie, ...resumoDaSerie({ vendas, menorAnuncio: m == null ? null : m, agora }) };
}

/* ── ANULAR UMA VENDA NA REFERÊNCIA ───────────────────────────────────────
 * Do papel economia, com motivo e confirmação. Não apaga nem muda a venda:
 * grava a exclusão, e a série passa a não contá-la. */
export function excluirVendaDaReferencia(db, { operadorId, fillId, motivo, confirmado, agora }) {
  return agir(db, { operadorId, acao: 'mercado.venda.excluir', alvo: String(fillId), de: 'conta', para: 'excluida', motivo, confirmado, agora }, op => {
    if (!db.prepare(`SELECT 1 FROM player_market_fills WHERE id = ?`).get(fillId)) throw falha(ERRO_HISTORICO.NAO, 'venda não encontrada');
    if (db.prepare(`SELECT 1 FROM player_market_fills_exclusoes WHERE fill_id = ?`).get(fillId)) throw falha(ERRO_HISTORICO.JA, 'a venda já está fora da referência');
    db.prepare(`INSERT INTO player_market_fills_exclusoes (fill_id, motivo, por, em) VALUES (?, ?, ?, ?)`).run(fillId, motivo, op.id, agora);
    return { ok: true };
  });
}
