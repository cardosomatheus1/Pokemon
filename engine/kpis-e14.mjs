/* OS NÚMEROS DA ECONOMIA ENTRE JOGADORES (ST-14.15 · E14 · spec E14 §§12–15) — camada 0.
 *
 * Contas puras sobre FATOS que o servidor já leu do ledger e das tabelas —
 * nunca da telemetria. Um evento repetido na telemetria não muda número
 * nenhum daqui, porque daqui a telemetria não é lida.
 *
 *   concentração   quanto do PC-T está com os 10% mais ricos, e o HHI
 *   mint P2P       o que entrou por transferência menos o que saiu — tem
 *                  de ser ZERO: troca e venda passam moeda, não criam
 *   conservação    emitido + mint − queimado − outros sinks = circulando;
 *                  o furo é a diferença, e zero é o único número bom
 *   estoque        shiny e emissão controlada: o que existe, o que saiu, e o
 *                  que existe A MAIS do que foi emitido (duplicação)
 */

/* O QUE UMA LINHA DO LEDGER FAZ AO TOTAL (disponível + reservado) DA CONTA.
 * `amount` carrega o delta do disponível — salvo nas linhas que só mexem no
 * reservado (a perda, a saída P2P, as taxas que saem da reserva), onde ele
 * ESPELHA o `reserva_delta` porque o esquema recusa amount zero. É a mesma
 * leitura do `reconciliarNoBanco`, e somar `amount` sempre contaria a taxa da
 * venda duas vezes. */
export const SO_RESERVA = Object.freeze(['BET_LOSS', 'MARKET_LOSS', 'P2P_TRANSFER_OUT', 'P2P_TRANSFER_FEE', 'DIRECT_TRADE_FEE', 'PLAYER_MARKET_SALE_FEE']);
export const RESERVAS = Object.freeze(['BET_RESERVE', 'MARKET_ENTRY_RESERVE', 'P2P_RESERVE']);
export function efeitoDaLinha({ tipo, amount, reservaDelta = 0, absAmount = Math.abs(amount) }) {
  if (SO_RESERVA.includes(tipo)) return reservaDelta;
  if (RESERVAS.includes(tipo)) return reservaDelta - absAmount;
  return amount + reservaDelta;
}

/* As taxas da E14 são QUEIMA; a passagem P2P não é nem emissão nem queima. */
export const TAXAS_E14 = Object.freeze(['PLAYER_MARKET_LISTING_FEE', 'PLAYER_MARKET_SALE_FEE', 'DIRECT_TRADE_FEE', 'P2P_TRANSFER_FEE']);
export const PASSAGEM_P2P = Object.freeze(['P2P_TRANSFER_IN', 'P2P_TRANSFER_OUT', 'P2P_RESERVE', 'P2P_RELEASE']);

/* `porTipo`: [{ tipo, efeito }] — o efeito SOMADO de cada tipo no bucket do
   PC-T. Tipo de efeito positivo é fonte; negativo, sink. Um tipo que entra e
   sai (um ajuste) aparece pelo líquido: a conservação continua exata. */
export function classificarLedger(porTipo) {
  const f = { emitido: 0, outrosSinks: 0, queimadoE14: {}, p2pEntrou: 0, p2pSaiu: 0, fontes: {}, sinks: {} };
  for (const { tipo, efeito } of porTipo) {
    if (!efeito) continue;
    if (TAXAS_E14.includes(tipo)) f.queimadoE14[tipo] = (f.queimadoE14[tipo] ?? 0) - efeito;
    else if (tipo === 'P2P_TRANSFER_IN') f.p2pEntrou += efeito;
    else if (tipo === 'P2P_TRANSFER_OUT') f.p2pSaiu -= efeito;
    else if (PASSAGEM_P2P.includes(tipo)) f.p2pEntrou += efeito;      // reserva e liberação: zero por linha
    else if (efeito > 0) { f.emitido += efeito; f.fontes[tipo] = efeito; }
    else { f.outrosSinks -= efeito; f.sinks[tipo] = -efeito; }
  }
  return f;
}

export function concentracao(saldos) {
  const xs = saldos.filter(s => Number.isFinite(s) && s > 0).sort((a, b) => b - a);
  const total = xs.reduce((a, s) => a + s, 0);
  if (!total) return { contas: xs.length, top10: 0, hhi: 0 };
  const k = Math.max(1, Math.ceil(xs.length * 0.1));
  const top10 = xs.slice(0, k).reduce((a, s) => a + s, 0) / total;
  const hhi = xs.reduce((a, s) => a + (s / total) ** 2, 0);
  return { contas: xs.length, top10, hhi };
}

/* O estoque de cada item de emissão controlada: emitido pela porta única,
   existente nos lotes, consumido (a diferença) e DUPLICADO (o que existe
   além do que saiu — uma troca que copiou em vez de mover). */
export function estoqueControlado(emitidas, existentes) {
  const out = {};
  for (const id of new Set([...Object.keys(emitidas), ...Object.keys(existentes)])) {
    const e = emitidas[id] ?? 0, x = existentes[id] ?? 0;
    out[id] = { emitidas: e, estoque: x, consumidas: Math.max(0, e - x), duplicadas: Math.max(0, x - e) };
  }
  return out;
}

/* `f`: { emitido, queimadoE14: {tipo: n}, outrosSinks, circulante, p2pEntrou,
   p2pSaiu, saldosTransferiveis: [n], shiny: {estoque, soltos, porEspecie},
   controlada: {item: {emitidas, estoque}}, mercado: {...}, trocas7d, orfas } */
export function resumoE14(f) {
  const queima = Object.values(f.queimadoE14 ?? {}).reduce((a, v) => a + v, 0);
  const mintP2P = (f.p2pEntrou ?? 0) - (f.p2pSaiu ?? 0);
  return {
    emissao: f.emitido,
    fontes: f.fontes ?? {}, sinks: f.sinks ?? {},
    queima: { total: queima, porTipo: f.queimadoE14 ?? {} },
    circulante: f.circulante,
    mintP2P,
    /* zero quando o ledger e a carteira contam a mesma história; qualquer
       outro número é a primeira pergunta do painel */
    furoDeConservacao: f.emitido + mintP2P - queima - (f.outrosSinks ?? 0) - f.circulante,
    concentracao: concentracao(f.saldosTransferiveis ?? []),
    shiny: f.shiny,
    controlada: f.controlada ?? {},
    liquidez: { ...f.mercado, trocas7d: f.trocas7d },
    orfas: f.orfas,
  };
}

/* O VEREDITO DO GATE C: o que tem de ser zero, e é. Lista vazia = passou. */
export function problemasDoGateC(r) {
  const p = [];
  if (r.mintP2P !== 0) p.push(`mint P2P ${r.mintP2P}`);
  if (r.furoDeConservacao !== 0) p.push(`furo de conservação ${r.furoDeConservacao}`);
  for (const [id, e] of Object.entries(r.controlada ?? {})) if (e.duplicadas > 0) p.push(`${id} duplicado ${e.duplicadas}`);
  const orfas = Object.values(r.orfas ?? {}).reduce((a, n) => a + n, 0);
  if (orfas > 0) p.push(`${orfas} divergência(s) aberta(s)`);
  return p;
}
