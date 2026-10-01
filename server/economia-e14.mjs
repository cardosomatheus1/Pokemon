/* O PAINEL DA ECONOMIA ENTRE JOGADORES (ST-14.15 · E14 · spec E14 §§12–15).
 *
 * Lê os FATOS — o ledger, as carteiras, os lotes, as criaturas, as vendas, as
 * trocas e as divergências — e entrega ao `engine/kpis-e14.mjs`, que faz as
 * contas. A telemetria não é lida aqui, de propósito: ela é o que o cliente
 * diz que aconteceu, e um evento repetido nela não pode mover a emissão, a
 * queima nem a liquidez. O ledger é o que aconteceu.
 *
 * Só leitura. O que não fecha (mint P2P, furo de conservação, item
 * controlado duplicado, divergência aberta) aparece em `problemas` — quem
 * escreve divergência é a conciliação (`conciliacao-economia.mjs`).
 */
import { efeitoDaLinha, classificarLedger, estoqueControlado, resumoE14, problemasDoGateC } from '../engine/kpis-e14.mjs';

const DIA_MS = 86_400_000;

const SQL_LEDGER = [
  'SELECT type AS tipo, SUM(amount) AS a, SUM(reserva_delta) AS r, SUM(ABS(amount)) AS aa',
  "FROM wallet_ledger WHERE bucket = 'transferivel' GROUP BY type",
].join(' ');
const SQL_SALDOS = "SELECT user_id, saldo FROM carteiras WHERE bucket = 'transferivel'";
const SQL_RESERVADO = [
  'SELECT user_id, SUM(reserva_delta) AS r FROM wallet_ledger',
  "WHERE bucket = 'transferivel' GROUP BY user_id",
].join(' ');
const SQL_SHINY = 'SELECT dex, COUNT(*) AS n FROM criaturas WHERE is_shiny = 1 GROUP BY dex';
const SQL_SHINY_SOLTOS = 'SELECT COUNT(*) AS n FROM criaturas_baixadas WHERE is_shiny = 1';
const SQL_EMITIDAS = 'SELECT item_id, SUM(quantidade) AS n FROM emissoes_controladas GROUP BY item_id';
const SQL_EXISTENTES = [
  'SELECT item_id, SUM(quantidade) AS n FROM bolsa_lotes',
  'WHERE item_id IN (SELECT DISTINCT item_id FROM emissoes_controladas) GROUP BY item_id',
].join(' ');
/* A VENDA é a do anúncio E a para uma ordem de compra (ST-14.11A/B, gate D)
   — a do vendedor que aceitou o livro; a ordem que casou com um anúncio já
   está na primeira lista, e contá-la de novo dobraria a liquidez. */
const SQL_VENDAS = [
  'SELECT COUNT(*) AS vendas, COALESCE(SUM(preco), 0) AS volume, COALESCE(SUM(taxa), 0) AS taxas,',
  'COALESCE(SUM(shiny), 0) AS vendasShiny,',
  'COUNT(DISTINCT vendedor) AS vendedores, COUNT(DISTINCT comprador) AS compradores FROM (',
  'SELECT preco, taxa_venda AS taxa, shiny, vendedor_id AS vendedor, comprador_id AS comprador FROM player_market_fills WHERE em >= ?',
  "UNION ALL SELECT bruto, taxa_venda, shiny, vendedor_id, comprador_id FROM player_market_order_fills WHERE em >= ? AND venda_ref LIKE 'venda:%')",
].join(' ');
const SQL_ANUNCIOS = "SELECT COUNT(*) AS n FROM player_market_listings WHERE estado = 'ACTIVE'";
const SQL_ORDENS = "SELECT COUNT(*) AS n, COALESCE(SUM(restante * preco_unit), 0) AS presos FROM player_market_buy_orders WHERE estado = 'ACTIVE'";
const SQL_TROCAS = "SELECT COUNT(*) AS n FROM trocas WHERE estado = 'SETTLED' AND encerrada_em >= ?";
const SQL_ORFAS = 'SELECT tipo, COUNT(*) AS n FROM economia_divergencias WHERE resolvida_em IS NULL GROUP BY tipo';

export function fatosDaEconomiaE14(db, { agora = Date.now() } = {}) {
  const porTipo = db.prepare(SQL_LEDGER).all()
    .map(l => ({ tipo: l.tipo, efeito: efeitoDaLinha({ tipo: l.tipo, amount: l.a, reservaDelta: l.r, absAmount: l.aa }) }));
  const f = classificarLedger(porTipo);

  /* CIRCULANTE: o disponível da carteira (o cache) + o reservado (do ledger).
     O furo de conservação compara isto com a soma do ledger — é a mesma
     pergunta da reconciliação, feita para a economia inteira. */
  const reservado = new Map(db.prepare(SQL_RESERVADO).all().map(r => [r.user_id, r.r || 0]));
  const porConta = new Map();
  for (const s of db.prepare(SQL_SALDOS).all()) porConta.set(s.user_id, s.saldo + (reservado.get(s.user_id) ?? 0));
  for (const [u, r] of reservado) if (!porConta.has(u)) porConta.set(u, r);
  const saldosTransferiveis = [...porConta.values()];
  const circulante = saldosTransferiveis.reduce((a, s) => a + s, 0);

  /* SHINY separado do normal, sempre: o shiny é o raro, e a média dele
     misturada com a do comum some na conta. */
  const porEspecie = {};
  let estoque = 0;
  for (const r of db.prepare(SQL_SHINY).all()) { porEspecie[r.dex] = r.n; estoque += r.n; }
  const soltos = db.prepare(SQL_SHINY_SOLTOS).get().n;

  const emitidas = Object.fromEntries(db.prepare(SQL_EMITIDAS).all().map(r => [r.item_id, r.n]));
  const existentes = Object.fromEntries(db.prepare(SQL_EXISTENTES).all().map(r => [r.item_id, r.n]));

  const v = db.prepare(SQL_VENDAS).get(agora - 7 * DIA_MS, agora - 7 * DIA_MS);
  const ordens = db.prepare(SQL_ORDENS).get();
  const mercado = { vendas7d: v.vendas, vendasShiny7d: v.vendasShiny, volume7d: v.volume, taxasVenda7d: v.taxas,
                    vendedores7d: v.vendedores, compradores7d: v.compradores,
                    anunciosAtivos: db.prepare(SQL_ANUNCIOS).get().n, ordensAbertas: ordens.n, presoEmOrdens: ordens.presos };

  return { ...f, circulante, saldosTransferiveis,
           shiny: { estoque, soltos, porEspecie },
           controlada: estoqueControlado(emitidas, existentes),
           mercado, trocas7d: db.prepare(SQL_TROCAS).get(agora - 7 * DIA_MS).n,
           orfas: Object.fromEntries(db.prepare(SQL_ORFAS).all().map(r => [r.tipo, r.n])) };
}

export function painelE14(db, { agora = Date.now() } = {}) {
  const r = resumoE14(fatosDaEconomiaE14(db, { agora }));
  return { ...r, problemas: problemasDoGateC(r) };
}
