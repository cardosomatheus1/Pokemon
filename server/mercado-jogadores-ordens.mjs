/* AS ORDENS DE COMPRA DO MARKET (ST-14.11A · E14 · spec E14 §§10.3, 11).
 *
 *   ACTIVE ──fills──▶ FILLED        e CANCELLED · EXPIRED · BLOCKED
 *
 * Uma ordem é "N deste item, até P cada". Ao nascer ela PRENDE N × P de
 * PC-T (uma reserva de moeda, dono `market:<id>` — a mesma das ofertas da
 * ST-14.6) e QUEIMA a taxa de criação (0,5%, a de anunciar), que não volta.
 * Quem decide com quem ela casa, quanto e a que preço é a camada 0
 * (`engine/matching-mercado-jogadores.mjs`); aqui mora o que mexe no banco.
 *
 * DOIS LADOS DO CASAMENTO, e o preço é sempre o de quem JÁ ESTAVA lá:
 *
 *   a ordem nova    casa na hora com os lotes ANUNCIADOS (etapa C) mais
 *                   baratos que o limite dela — o lote inteiro, ao preço do
 *                   lote; a diferença do que ela prendeu volta no mesmo
 *                   commit (a MELHORA DE PREÇO)
 *   quem vende      aceita as ordens do livro com o item da bolsa, num pedido
 *                   só (`venderParaOrdens`): melhor preço → mais antiga → id,
 *                   ao preço de cada ordem; a própria e a de conta ligada
 *                   ficam de fora sem consumir nada
 *
 * O ESCROW CONTA A MESMA HISTÓRIA do resto (a conciliação da ST-14.16 o
 * mede): a reserva da ordem tem sempre `quantidade = restante × P`, e cada
 * lançamento do ledger que a toca leva o id dela como referência — o
 * pagamento do fill, a taxa de venda que queima, a melhora devolvida.
 *
 * Tudo numa transação: o fill que falha no meio não deixa item movido sem
 * PC-T, nem PC-T sem item. Duas vendas para a mesma ordem: a segunda vê o
 * que sobrou (a versão e o `restante >= ?` da escrita), e a ordem nunca
 * enche além do que pediu — o CHECK `quantidade = executado + restante`
 * segura até a corrida que o código não previu.
 */
import { randomUUID } from 'node:crypto';
import { previewOrdem, casarVenda, casarCompra, taxasDosFills, DURACAO_ORDEM_MS, MINIMO_FILL } from '../engine/matching-mercado-jogadores.mjs';
import { POLITICA_PILOTO, hashDaPolitica } from '../engine/taxas-mercado.mjs';
import { avaliarContraparte } from '../engine/risco-mercado.mjs';
import { tipoDoItem } from '../engine/negociabilidade.mjs';
import { categoriaDoItem } from '../engine/busca-mercado.mjs';
import { emTransacao, liquidarP2PNoBanco, liberarP2PNoBanco } from './carteira.mjs';
import { elegibilidadeDaConta } from './elegibilidade.mjs';
import { contasLigadas } from './protecao.mjs';
import { reservarOferta, liberarOferta, consumirOferta, holdsAtivos } from './reservas.mjs';
import { cobrarTaxaDeAnuncio } from './taxas-mercado.mjs';
import { moverReservados } from './posse-p2p.mjs';
import { emitir } from './telemetria.mjs';
import { ERRO_MERCADO_P2P, retrato } from './mercado-jogadores.mjs';
import { normalizarCriterios, hashDosCriterios, atendeCriterios, versaoDoCatalogo } from '../engine/criterios-mercado.mjs';
import { taxa } from '../engine/taxas-mercado.mjs';

export const ESTADO_ORDEM = Object.freeze({ ACTIVE: 'ACTIVE', FILLED: 'FILLED', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', BLOCKED: 'BLOCKED' });
const falha = (codigo, msg, extra = {}) => Object.assign(new Error(msg), { codigo, ...extra });
const donoDa = id => ({ tipo: 'market', id });
const CHAVE_OK = c => typeof c === 'string' && c.length >= 8 && c.length <= 80;
const MEMO = `${POLITICA_PILOTO.versao}:${hashDaPolitica(POLITICA_PILOTO)}`;

const podeNegociar = (db, userId, agora, checkpoint) => elegibilidadeDaConta(db, { userId, acao: 'market', agora, checkpoint });
function exigirConta(db, userId, quem, agora, checkpoint) {
  const c = podeNegociar(db, userId, agora, checkpoint);
  if (!c.allowed) throw falha(ERRO_MERCADO_P2P.RECUSADA, `${quem} não pode negociar: ${c.reason_code}${c.detalhe ? ` (${c.detalhe})` : ''}`, { reason_code: c.reason_code });
}
/* A contraparte que o SISTEMA escolheu e não pode casar: pulada, sem
   consumir e sem castigo — quem pediu não escolheu com quem. */
const naoCasa = (db, userId, outroId, agora, checkpoint) =>
  !avaliarContraparte({ userId, outroId, ligadas: contasLigadas(db, userId) }).allowed || !podeNegociar(db, outroId, agora, checkpoint).allowed;

const lerOrdem = (db, id) => (typeof id === 'string' ? db.prepare(`SELECT * FROM player_market_buy_orders WHERE id = ?`).get(id) : null);

/* ── O ESCROW DA ORDEM ────────────────────────────────────────────────────
 * O pedaço `valor` da reserva sai: se é tudo, a reserva vira consumida. */
function gastarDaReserva(db, holdId, valor, agora) {
  const h = db.prepare(`SELECT * FROM asset_holds WHERE id = ? AND estado = 'ativa'`).get(holdId);
  if (!h || h.quantidade < valor) throw falha(ERRO_MERCADO_P2P.ESTADO, 'a reserva da ordem não cobre este pedaço');
  if (h.quantidade === valor) {
    db.prepare(`UPDATE asset_holds SET estado = 'consumida', versao = versao + 1, resolvido_em = ? WHERE id = ? AND estado = 'ativa'`).run(agora, holdId);
    db.prepare(`INSERT INTO asset_holds_eventos (hold_id, evento, em) VALUES (?, 'consumida', ?)`).run(holdId, agora);
  } else db.prepare(`UPDATE asset_holds SET quantidade = quantidade - ?, versao = versao + 1 WHERE id = ? AND estado = 'ativa'`).run(valor, holdId);
}

/* O PAGAMENTO de um fill, todo pela reserva da ordem: o líquido vai para
   quem vende, a taxa de venda queima, e a melhora volta para quem comprou. */
function pagarFill(db, { o, vendedorId, bruto, reservado, taxaVenda, n, agora, memo = MEMO }) {
  const pago = liquidarP2PNoBanco(db, { de: o.comprador_id, para: vendedorId, valor: bruto - taxaVenda, taxa: taxaVenda, ref: o.hold_id, agora,
                                        tipoTaxa: 'PLAYER_MARKET_SALE_FEE', memo });
  if (!pago.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `o PC-T da ordem não passou: ${pago.motivo}`, { reason_code: 'INSUFFICIENT_FUNDS' });
  const melhora = reservado - bruto;
  if (melhora < 0) throw falha(ERRO_MERCADO_P2P.ESTADO, 'o fill custaria mais do que a ordem prendeu');
  if (melhora > 0) {
    const l = liberarP2PNoBanco(db, { userId: o.comprador_id, valor: melhora, ref: o.hold_id, idem: `ordem:${o.id}:melhora:${n}`, agora });
    if (!l.ok) throw falha(ERRO_MERCADO_P2P.ESTADO, `a melhora de preço não voltou: ${l.motivo}`);
  }
  gastarDaReserva(db, o.hold_id, reservado, agora);
}

/* A ordem depois do fill: a escrita confere o que leu (versão e restante).
   Exportada para o teste da leitura velha — a corrida que um processo só não
   consegue encenar. */
export function avancarOrdem(db, o, { quantidade, bruto, melhora, agora }) {
  const fecha = o.restante - quantidade === 0;
  const r = db.prepare(`UPDATE player_market_buy_orders SET restante = restante - ?, executado = executado + ?, pago = pago + ?, liberado = liberado + ?,
                          estado = ?, encerrado_em = ?, versao = versao + 1
                        WHERE id = ? AND estado = 'ACTIVE' AND restante >= ? AND versao = ?`)
    .run(quantidade, quantidade, bruto, melhora, fecha ? 'FILLED' : 'ACTIVE', fecha ? agora : null, o.id, quantidade, o.versao);
  if (r.changes !== 1) throw falha(ERRO_MERCADO_P2P.ESTADO, 'a ordem mudou no meio do fill');
  Object.assign(o, { restante: o.restante - quantidade, executado: o.executado + quantidade, pago: o.pago + bruto, liberado: o.liberado + melhora,
                     estado: fecha ? 'FILLED' : 'ACTIVE', versao: o.versao + 1 });
}

const contarFills = (db, ordemId) => db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills WHERE ordem_id = ?`).get(ordemId).n;
function registrarFill(db, { o, vendaRef, vendedorId, quantidade, bruto, reservado, taxaVenda, agora, criatura = null }) {
  db.prepare(`INSERT INTO player_market_order_fills (ordem_id, venda_ref, pack_id, tipo, item_id, dex, shiny, quantidade, bruto, reservado, melhora,
                taxa_venda, liquido, vendedor_id, comprador_id, em, criatura_id, retrato_json, potencial, criterios_hash)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(o.id, vendaRef, o.pack_id, o.tipo, o.item_id, criatura?.retrato.dex ?? null, criatura?.retrato.shiny ? 1 : 0, quantidade, bruto, reservado, reservado - bruto,
         taxaVenda, bruto - taxaVenda, vendedorId, o.comprador_id, agora, criatura?.id ?? null, criatura ? JSON.stringify(criatura.retrato) : null,
         criatura?.retrato.potencial ?? null, o.criterios_hash ?? null);
}

/* ── A ORDEM NOVA CONTRA OS LOTES ANUNCIADOS ────────────────────────────── */
function lotesAnunciados(db, { o, agora, checkpoint }) {
  return db.prepare(`SELECT * FROM player_market_listings WHERE estado = 'ACTIVE' AND pack_id = ? AND tipo = 'item' AND item_id = ? AND expira_em > ?`)
    .all(o.pack_id, o.item_id, agora)
    .map(a => ({ id: a.id, vendedorId: a.vendedor_id, quantidade: a.quantidade, preco: a.preco, criadoEm: a.criado_em, linha: a,
                 pular: a.politica_hash !== hashDaPolitica(POLITICA_PILOTO) || (a.vendedor_id !== o.comprador_id && naoCasa(db, o.comprador_id, a.vendedor_id, agora, checkpoint)) }));
}

function comprarLotePelaOrdem(db, { o, a, f, agora }) {
  const dono = donoDa(a.id);
  pagarFill(db, { o, vendedorId: a.vendedor_id, bruto: a.preco, reservado: f.reservado, taxaVenda: a.taxa_venda, n: contarFills(db, o.id), agora,
                  memo: `${a.politica_versao}:${a.politica_hash}` });
  moverReservados(db, { holds: holdsAtivos(db, dono), de: a.vendedor_id, para: o.comprador_id, refTipo: 'mercado', refId: a.id, criaturas: [], agora });
  consumirOferta(db, { dono, agora });
  const recibo = { id: a.id, tipo: a.tipo, quantidade: a.quantidade, preco: a.preco, taxaVenda: a.taxa_venda, liquido: a.preco - a.taxa_venda,
                   politica: a.politica_versao, compradoEm: agora, retrato: JSON.parse(a.snapshot_json), ordem: o.id };
  const ok = db.prepare(`UPDATE player_market_listings SET estado = 'SOLD', versao = versao + 1, comprador_id = ?, compra_chave = ?, encerrado_em = ?, recibo_json = ?
                         WHERE id = ? AND estado = 'ACTIVE' AND versao = ?`)
    .run(o.comprador_id, `ordem:${o.id}`, agora, JSON.stringify(recibo), a.id, a.versao);
  if (ok.changes !== 1) throw falha(ERRO_MERCADO_P2P.ESTADO, 'o anúncio mudou no meio do casamento');
  /* A venda do anúncio continua sendo venda do anúncio: a série de preços dele a conta (ST-14.12). */
  db.prepare(`INSERT INTO player_market_fills (listing_id, pack_id, tipo, dex, item_id, shiny, quantidade, preco, taxa_venda, liquido, vendedor_id, comprador_id, em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(a.id, a.pack_id, a.tipo, a.dex, a.item_id, a.shiny, a.quantidade, a.preco, a.taxa_venda, a.preco - a.taxa_venda, a.vendedor_id, o.comprador_id, agora);
  registrarFill(db, { o, vendaRef: `anuncio:${a.id}`, vendedorId: a.vendedor_id, quantidade: a.quantidade, bruto: a.preco, reservado: f.reservado, taxaVenda: a.taxa_venda, agora });
  avancarOrdem(db, o, { quantidade: a.quantidade, bruto: a.preco, melhora: f.reservado - a.preco, agora });
  emitir(db, { nome: 'market_order_fill', userId: o.comprador_id, campos: { lado: 'compra', quantidade: a.quantidade, bruto: a.preco, melhora: f.reservado - a.preco },
               chave: `ordem-fill:${o.id}:${a.id}`, agora });
}

/* ── CRIAR ────────────────────────────────────────────────────────────── */
export function criarOrdem(db, { userId, pack, itemId, quantidade, precoUnit, chaveIdem, agora, checkpoint }) {
  if (!CHAVE_OK(chaveIdem)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'chave da ordem inválida');
  const ja = db.prepare(`SELECT id FROM player_market_buy_orders WHERE comprador_id = ? AND chave = ?`).get(userId, chaveIdem);
  if (ja) return { ...paraComprador(db, lerOrdem(db, ja.id)), repetido: true };
  if (typeof itemId !== 'string' || !itemId) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'item inválido');
  const tipo = tipoDoItem(pack, itemId);
  if (!tipo) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'este item não existe');
  if (!tipo.negociavel) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'este item não é negociável', { reason_code: 'ASSET_BOUND' });
  const p = previewOrdem({ quantidade, precoUnit });
  if (!p.ok) throw falha(ERRO_MERCADO_P2P.ENTRADA, p.motivo);
  return emTransacao(db, () => {
    exigirConta(db, userId, 'esta conta', agora, checkpoint);
    const id = randomUUID(), expiraEm = agora + DURACAO_ORDEM_MS;
    const seq = db.prepare(`SELECT COALESCE(MAX(seq), 0) + 1 AS s FROM player_market_buy_orders`).get().s;
    const { ids } = reservarOferta(db, { userId, pack, dono: donoDa(id), ativos: { moeda: p.reserva }, expiraEm, agora, checkpoint });
    const taxa = cobrarTaxaDeAnuncio(db, { userId, preco: p.reserva, ref: id, idem: `ordem:${id}`, agora });
    if (!taxa.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `a taxa da ordem não passou: ${taxa.motivo}`, { reason_code: 'INSUFFICIENT_FUNDS' });
    db.prepare(`INSERT INTO player_market_buy_orders (id, seq, comprador_id, pack_id, tipo, item_id, categoria, quantidade, restante, preco_unit, estado,
                  taxa_criacao, politica_versao, politica_hash, hold_id, chave, criado_em, expira_em)
                VALUES (?, ?, ?, ?, 'item', ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, seq, userId, pack.id, itemId, categoriaDoItem(pack, itemId), quantidade, quantidade, precoUnit, p.taxaCriacao, p.versao, p.hash, ids[0], chaveIdem, agora, expiraEm);
    emitir(db, { nome: 'market_order_created', userId, campos: { quantidade, precoUnit, taxa: p.taxaCriacao }, chave: `ordem:${id}`, agora });
    /* O CASAMENTO NA CHEGADA: os lotes anunciados que cabem no limite. */
    const o = lerOrdem(db, id);
    const lotes = lotesAnunciados(db, { o, agora, checkpoint });
    for (const f of casarCompra({ anuncios: lotes, compradorId: userId, restante: o.restante, precoUnit, minimo: MINIMO_FILL }))
      comprarLotePelaOrdem(db, { o, a: lotes.find(x => x.id === f.anuncioId).linha, f, agora });
    return paraComprador(db, lerOrdem(db, id));
  });
}

/* ── VENDER PARA AS ORDENS ────────────────────────────────────────────────
 * Quem tem o item aceita o livro: até `quantidade`, a no mínimo `precoMinimo`
 * cada. O recibo diz cada pedaço; a taxa de venda é do acumulado DESTE
 * pedido, e a soma é a taxa do total — fills não multiplicam o mínimo. */
export function venderParaOrdens(db, { userId, pack, itemId, quantidade, precoMinimo, chaveIdem, agora, checkpoint }) {
  if (!CHAVE_OK(chaveIdem)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'chave da venda inválida');
  const ja = db.prepare(`SELECT recibo_json FROM player_market_vendas_ordem WHERE vendedor_id = ? AND chave = ?`).get(userId, chaveIdem);
  if (ja) return { ...JSON.parse(ja.recibo_json), repetido: true };
  if (typeof itemId !== 'string' || !tipoDoItem(pack, itemId)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'item inválido');
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'quantidade inválida');
  if (!Number.isSafeInteger(precoMinimo) || precoMinimo <= 0) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'preço mínimo inválido');
  return emTransacao(db, () => {
    exigirConta(db, userId, 'esta conta', agora, checkpoint);
    const ordens = db.prepare(`SELECT * FROM player_market_buy_orders WHERE estado = 'ACTIVE' AND pack_id = ? AND tipo = 'item' AND item_id = ?
                                AND expira_em > ? AND preco_unit >= ?`).all(pack.id, itemId, agora, precoMinimo);
    const livro = ordens.map(o => ({ id: o.id, seq: o.seq, precoUnit: o.preco_unit, restante: o.restante, compradorId: o.comprador_id,
                                     pular: o.politica_hash !== hashDaPolitica(POLITICA_PILOTO) || (o.comprador_id !== userId && naoCasa(db, userId, o.comprador_id, agora, checkpoint)) }));
    const fills = taxasDosFills(casarVenda({ livro, vendedorId: userId, oferta: quantidade, precoMinimo, minimo: MINIMO_FILL }));
    if (!fills.length) throw falha(ERRO_MERCADO_P2P.ESTADO, 'nenhuma ordem paga isso agora', { reason_code: 'NO_MATCH' });
    const vendaId = randomUUID();
    fills.forEach((f, k) => {
      const o = ordens.find(x => x.id === f.ordemId);
      /* O item sai pela MESMA porta da troca e do anúncio: preso (a política
         única decide se pode), movido, consumido — tudo ou nada. */
      const dono = donoDa(`${vendaId}:${k}`);
      reservarOferta(db, { userId, pack, dono, ativos: { itens: [{ itemId, quantidade: f.quantidade }] }, expiraEm: agora + 60_000, agora, checkpoint });
      moverReservados(db, { holds: holdsAtivos(db, dono), de: userId, para: o.comprador_id, refTipo: 'mercado', refId: o.id, criaturas: [], agora });
      consumirOferta(db, { dono, agora });
      pagarFill(db, { o, vendedorId: userId, bruto: f.bruto, reservado: f.reservado, taxaVenda: f.taxaVenda, n: contarFills(db, o.id), agora });
      registrarFill(db, { o, vendaRef: `venda:${vendaId}`, vendedorId: userId, quantidade: f.quantidade, bruto: f.bruto, reservado: f.reservado, taxaVenda: f.taxaVenda, agora });
      avancarOrdem(db, o, { quantidade: f.quantidade, bruto: f.bruto, melhora: 0, agora });
    });
    const soma = k => fills.reduce((s, f) => s + f[k], 0);
    const recibo = { id: vendaId, itemId, vendido: soma('quantidade'), pedido: quantidade, bruto: soma('bruto'), taxaVenda: soma('taxaVenda'), liquido: soma('liquido'),
                     politica: POLITICA_PILOTO.versao, em: agora, fills: fills.map(f => ({ quantidade: f.quantidade, precoUnit: f.precoUnit, bruto: f.bruto, taxaVenda: f.taxaVenda })) };
    db.prepare(`INSERT INTO player_market_vendas_ordem (id, vendedor_id, chave, recibo_json, em) VALUES (?, ?, ?, ?, ?)`).run(vendaId, userId, chaveIdem, JSON.stringify(recibo), agora);
    emitir(db, { nome: 'market_order_fill', userId, campos: { lado: 'venda', quantidade: recibo.vendido, bruto: recibo.bruto, queima: recibo.taxaVenda }, chave: `venda-ordem:${vendaId}`, agora });
    return recibo;
  });
}

/* ── CANCELAR E VENCER ────────────────────────────────────────────────────
 * Volta SÓ o que a ordem ainda prende (o restante × P); o que já foi pago
 * ficou pago, e a taxa de criação não volta. */
export function cancelarOrdem(db, { userId, ordemId, agora }) {
  return emTransacao(db, () => {
    const o = lerOrdem(db, ordemId);
    if (!o || o.comprador_id !== userId) throw falha(ERRO_MERCADO_P2P.NAO, 'ordem não encontrada');
    if (o.estado !== ESTADO_ORDEM.ACTIVE) throw falha(ERRO_MERCADO_P2P.ESTADO, `a ordem está ${o.estado}`);
    liberarOferta(db, { dono: donoDa(o.id), agora });
    db.prepare(`UPDATE player_market_buy_orders SET estado = 'CANCELLED', versao = versao + 1, encerrado_em = ? WHERE id = ? AND estado = 'ACTIVE'`).run(agora, o.id);
    return paraComprador(db, lerOrdem(db, o.id));
  });
}

/* O gancho do varredor (ST-14.16): a reserva venceu, a ordem vence junto. */
export function expirarOrdemDaOferta(db, { dono: d, agora }) {
  db.prepare(`UPDATE player_market_buy_orders SET estado = 'EXPIRED', versao = versao + 1, encerrado_em = ? WHERE id = ? AND estado = 'ACTIVE'`).run(agora, d.id);
}

/* ── LER ──────────────────────────────────────────────────────────────────
 * O livro público é AGREGADO por preço — quantas unidades a cada preço, e
 * nunca quem pediu. Quem pediu vê as próprias, com o que já pagou e o que
 * voltou de melhora. */
export const paraComprador = (db, o) => ({
  id: o.id, tipo: o.tipo, itemId: o.item_id, ...(o.tipo === 'criatura' ? { criterios: JSON.parse(o.criterios_json), criteriosHash: o.criterios_hash } : {}), quantidade: o.quantidade, restante: o.restante, executado: o.executado, precoUnit: o.preco_unit,
  reservado: o.estado === ESTADO_ORDEM.ACTIVE ? o.restante * o.preco_unit : 0, pago: o.pago, liberado: o.liberado, taxaCriacao: o.taxa_criacao,
  estado: o.estado, versao: o.versao, criadoEm: o.criado_em, expiraEm: o.expira_em,
  fills: db.prepare(`SELECT quantidade, bruto, melhora, em, criatura_id AS criaturaId, retrato_json FROM player_market_order_fills WHERE ordem_id = ? ORDER BY id`).all(o.id)
    .map(({ retrato_json, criaturaId, ...f }) => ({ ...f, ...(criaturaId ? { criaturaId, retrato: JSON.parse(retrato_json) } : {}) })),
});

/* `exceto`: quem PERGUNTA não vê as próprias no livro — ele não vende para
   si mesmo (o casamento as pula), e a estimativa da tela contaria com elas
   (Q5 da ST-14.11A: "vende 7 × 95" quando o 95 era a ordem dele). */
export function livroDoItem(db, { pack, itemId, agora, limite = 10, exceto = '' }) {
  const niveis = db.prepare(`SELECT preco_unit AS precoUnit, SUM(restante) AS quantidade, COUNT(*) AS ordens FROM player_market_buy_orders
                              WHERE estado = 'ACTIVE' AND pack_id = ? AND tipo = 'item' AND item_id = ? AND expira_em > ? AND comprador_id <> ?
                              GROUP BY preco_unit ORDER BY preco_unit DESC LIMIT ?`).all(pack.id, itemId, agora, exceto ?? '', Math.min(limite, 50));
  return { itemId, niveis, melhor: niveis[0]?.precoUnit ?? null };
}

export const minhasOrdens = (db, { userId, limite = 50 }) =>
  db.prepare(`SELECT * FROM player_market_buy_orders WHERE comprador_id = ? ORDER BY criado_em DESC, seq DESC LIMIT ?`).all(userId, limite).map(o => paraComprador(db, o));

/* ── AS ORDENS DE CRIATURA (ST-14.11B · spec E14 §10.3) ───────────────────
 *
 * UMA criatura por ordem, por critérios objetivos (`engine/criterios-mercado`
 * decide quais existem e se uma instância os cumpre — TODOS, nunca algum).
 * Quem compra aceita ANTES qualquer exemplar que cumpra tudo: a venda não
 * pede aceite depois. Quem vende escolhe a ordem e a instância; o servidor
 * mede a instância de novo (o retrato do servidor, nunca o do pedido) e só
 * então move.
 *
 * Sem casamento com anúncios: comprar um anúncio de criatura continua sendo
 * escolher UMA instância específica (spec §10.3). A ordem de um catálogo
 * velho não casa — o comprador cancela e cria de novo. */
export function criarOrdemDeCriatura(db, { userId, pack, criterios, preco, chaveIdem, agora, checkpoint }) {
  if (!CHAVE_OK(chaveIdem)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'chave da ordem inválida');
  const ja = db.prepare(`SELECT id FROM player_market_buy_orders WHERE comprador_id = ? AND chave = ?`).get(userId, chaveIdem);
  if (ja) return { ...paraComprador(db, lerOrdem(db, ja.id)), repetido: true };
  const n = normalizarCriterios(pack, criterios);
  if (!n.ok) throw falha(ERRO_MERCADO_P2P.ENTRADA, n.motivo);
  const p = previewOrdem({ quantidade: 1, precoUnit: preco });
  if (!p.ok) throw falha(ERRO_MERCADO_P2P.ENTRADA, p.motivo);
  return emTransacao(db, () => {
    exigirConta(db, userId, 'esta conta', agora, checkpoint);
    const id = randomUUID(), expiraEm = agora + DURACAO_ORDEM_MS;
    const seq = db.prepare(`SELECT COALESCE(MAX(seq), 0) + 1 AS s FROM player_market_buy_orders`).get().s;
    const { ids } = reservarOferta(db, { userId, pack, dono: donoDa(id), ativos: { moeda: p.reserva }, expiraEm, agora, checkpoint });
    const t = cobrarTaxaDeAnuncio(db, { userId, preco: p.reserva, ref: id, idem: `ordem:${id}`, agora });
    if (!t.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `a taxa da ordem não passou: ${t.motivo}`, { reason_code: 'INSUFFICIENT_FUNDS' });
    db.prepare(`INSERT INTO player_market_buy_orders (id, seq, comprador_id, pack_id, tipo, categoria, quantidade, restante, preco_unit, estado,
                  taxa_criacao, politica_versao, politica_hash, hold_id, chave, criado_em, expira_em, dex, criterios_json, criterios_hash, catalogo_versao)
                VALUES (?, ?, ?, ?, 'criatura', 'criaturas', 1, 1, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, seq, userId, pack.id, preco, p.taxaCriacao, p.versao, p.hash, ids[0], chaveIdem, agora, expiraEm,
           n.criterios.dex, JSON.stringify(n.criterios), hashDosCriterios(n.criterios), versaoDoCatalogo(pack));
    emitir(db, { nome: 'market_order_created', userId, campos: { quantidade: 1, precoUnit: preco, taxa: p.taxaCriacao }, chave: `ordem:${id}`, agora });
    return paraComprador(db, lerOrdem(db, id));
  });
}

export function venderCriaturaParaOrdem(db, { userId, pack, ordemId, criaturaId, chaveIdem, agora, checkpoint }) {
  if (!CHAVE_OK(chaveIdem)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'chave da venda inválida');
  const ja = db.prepare(`SELECT recibo_json FROM player_market_vendas_ordem WHERE vendedor_id = ? AND chave = ?`).get(userId, chaveIdem);
  if (ja) return { ...JSON.parse(ja.recibo_json), repetido: true };
  if (typeof criaturaId !== 'string' || !criaturaId) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'criatura inválida');
  return emTransacao(db, () => {
    const o = lerOrdem(db, ordemId);
    if (!o || o.tipo !== 'criatura') throw falha(ERRO_MERCADO_P2P.NAO, 'ordem não encontrada');
    if (o.estado !== ESTADO_ORDEM.ACTIVE || o.expira_em <= agora) throw falha(ERRO_MERCADO_P2P.ESTADO, o.estado === 'FILLED' ? 'esta ordem já foi atendida' : `a ordem está ${o.estado === 'ACTIVE' ? 'vencida' : o.estado}`);
    if (o.catalogo_versao !== versaoDoCatalogo(pack)) throw falha(ERRO_MERCADO_P2P.ESTADO, 'a ordem é de um catálogo anterior — quem a criou precisa criar de novo');
    if (o.politica_hash !== hashDaPolitica(POLITICA_PILOTO)) throw falha(ERRO_MERCADO_P2P.ESTADO, 'a política de taxas desta ordem não é mais a vigente');
    if (o.comprador_id === userId) throw falha(ERRO_MERCADO_P2P.RECUSADA, 'esta ordem é sua', { reason_code: 'ACCOUNT_RESTRICTED' });
    const c = avaliarContraparte({ userId, outroId: o.comprador_id, ligadas: contasLigadas(db, userId) });
    if (!c.allowed) throw falha(ERRO_MERCADO_P2P.RECUSADA, `a venda não pode: ${c.detalhe}`, { reason_code: c.reason_code });
    exigirConta(db, userId, 'esta conta', agora, checkpoint);
    exigirConta(db, o.comprador_id, 'quem pediu', agora, checkpoint);
    const linha = db.prepare(`SELECT user_id, pack_id FROM criaturas WHERE id = ?`).get(criaturaId);
    if (!linha || linha.user_id !== userId) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'esta criatura não é sua');
    /* O retrato do SERVIDOR — nunca o que veio no pedido — contra TODOS os critérios. */
    const r = { ...retrato(db, pack, criaturaId), pack: linha.pack_id };
    const crit = JSON.parse(o.criterios_json), a = atendeCriterios(crit, r);
    if (!a.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `esta criatura não cumpre a ordem (${a.motivo})`, { reason_code: 'CRITERIA_MISMATCH' });
    const dono = donoDa(`venda-criatura:${o.id}`);
    reservarOferta(db, { userId, pack, dono, ativos: { criaturas: [criaturaId] }, expiraEm: agora + 60_000, agora, checkpoint });
    moverReservados(db, { holds: holdsAtivos(db, dono), de: userId, para: o.comprador_id, refTipo: 'mercado', refId: o.id, criaturas: [criaturaId], agora });
    consumirOferta(db, { dono, agora });
    const taxaVenda = taxa(o.preco_unit, POLITICA_PILOTO.vendaBps, POLITICA_PILOTO.minimoTaxa);
    pagarFill(db, { o, vendedorId: userId, bruto: o.preco_unit, reservado: o.preco_unit, taxaVenda, n: contarFills(db, o.id), agora });
    const vendaId = randomUUID();
    registrarFill(db, { o, vendaRef: `venda:${vendaId}`, vendedorId: userId, quantidade: 1, bruto: o.preco_unit, reservado: o.preco_unit, taxaVenda, agora,
                        criatura: { id: criaturaId, retrato: r } });
    avancarOrdem(db, o, { quantidade: 1, bruto: o.preco_unit, melhora: 0, agora });
    const recibo = { id: vendaId, ordem: o.id, criaturaId, retrato: r, criteriosHash: o.criterios_hash, vendido: 1, bruto: o.preco_unit, taxaVenda,
                     liquido: o.preco_unit - taxaVenda, politica: POLITICA_PILOTO.versao, em: agora };
    db.prepare(`INSERT INTO player_market_vendas_ordem (id, vendedor_id, chave, recibo_json, em) VALUES (?, ?, ?, ?, ?)`).run(vendaId, userId, chaveIdem, JSON.stringify(recibo), agora);
    emitir(db, { nome: 'market_order_fill', userId, campos: { lado: 'venda', quantidade: 1, bruto: o.preco_unit, queima: taxaVenda }, chave: `venda-ordem:${vendaId}`, agora });
    return recibo;
  });
}

/* As ordens de criatura abertas, para quem quer vender: os critérios e o
   preço — nunca quem pediu, e sem as de quem pergunta. */
export const ordensDeCriatura = (db, { pack, agora, exceto = '', limite = 50 }) =>
  db.prepare(`SELECT id, preco_unit, criterios_json, criterios_hash, expira_em, versao FROM player_market_buy_orders
              WHERE estado = 'ACTIVE' AND pack_id = ? AND tipo = 'criatura' AND expira_em > ? AND comprador_id <> ? AND catalogo_versao = ?
              ORDER BY preco_unit DESC, seq LIMIT ?`)
    .all(pack.id, agora, exceto ?? '', versaoDoCatalogo(pack), Math.min(limite, 100))
    .map(o => ({ id: o.id, preco: o.preco_unit, criterios: JSON.parse(o.criterios_json), criteriosHash: o.criterios_hash, expiraEm: o.expira_em }));
