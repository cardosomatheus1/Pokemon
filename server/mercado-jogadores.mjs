/* O MARKET DE PREÇO FIXO ENTRE JOGADORES (ST-14.9 · E14 · spec E14 §10.1).
 *
 *   ACTIVE ──comprar──▶ SOLD          e CANCELLED · EXPIRED · BLOCKED
 *
 * Um anúncio é UMA criatura ou UM lote fechado de um item, com preço TOTAL
 * e quantidade que não mudam — mudar é cancelar e anunciar de novo, pagando
 * a taxa de novo. Nada aqui toca `server/mercado.mjs`, que é o bolo mútuo do
 * E12: namespace `player_market_*` e `/api/player-market/*`.
 *
 * AS GARANTIAS, cada uma com teste e sabotagem:
 *
 *   anunciar   prende o ativo e QUEIMA a taxa de anúncio na mesma transação;
 *              sem saldo para a taxa, nada fica preso
 *   comprar    dentro da transação: o anúncio ainda ativo e no prazo, a
 *              VERSÃO e o PREÇO que o comprador viu, nunca o próprio
 *              anúncio, as duas contas podendo negociar, e o PC-T elegível
 *              do comprador. Dois compradores: um liquida, o outro ouve
 *              "já foi vendido" — nunca dois débitos
 *   liquidar   o comprador paga o preço; o vendedor recebe o líquido; a taxa
 *              de venda queima (a da política que o anúncio gravou); a posse
 *              muda pelo mesmo caminho da troca (`posse-p2p.mjs`); a venda
 *              vira uma linha em `player_market_fills`, com recibo
 *   cancelar   e vencer devolvem o ativo; a taxa de anúncio NÃO volta
 *
 * O retry de uma compra com a mesma chave devolve o recibo — é a resposta
 * que o comprador perdeu num timeout, e não uma segunda compra.
 */
import { randomUUID } from 'node:crypto';
import { previewAnuncio, POLITICA_PILOTO, hashDaPolitica } from '../engine/taxas-mercado.mjs';
import { avaliarContraparte } from '../engine/risco-mercado.mjs';
import { nivelDe } from '../engine/nivel-criatura.mjs';
import { categoriaDoItem } from '../engine/busca-mercado.mjs';
import { emTransacao, reservarP2PNoBanco, liquidarP2PNoBanco } from './carteira.mjs';
import { elegibilidadeDaConta } from './elegibilidade.mjs';
import { contasLigadas } from './protecao.mjs';
import { comSinalDeLigada, recusaDaLigada } from './risco-mercado-jogadores.mjs';
import { reservarOferta, liberarOferta, consumirOferta, holdsAtivos, exigirVigente } from './reservas.mjs';
import { cobrarTaxaDeAnuncio } from './taxas-mercado.mjs';
import { moverReservados, ERRO_POSSE } from './posse-p2p.mjs';
import { ler } from './criaturas.mjs';
import { emitir } from './telemetria.mjs';
import { nomeExibivel } from '../engine/nome-treinador.mjs';

export const ESTADO_ANUNCIO = Object.freeze({ ACTIVE: 'ACTIVE', SOLD: 'SOLD', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED', BLOCKED: 'BLOCKED' });
export const DURACAO_ANUNCIO_MS = 24 * 3_600_000;
export const ERRO_MERCADO_P2P = Object.freeze({
  NAO: 'ANUNCIO_NAO_ENCONTRADO', ESTADO: 'ANUNCIO_ESTADO', DESATUALIZADO: 'ANUNCIO_DESATUALIZADO',
  ENTRADA: 'ANUNCIO_ENTRADA', RECUSADA: 'ANUNCIO_RECUSADO',
});
const falha = (codigo, msg, extra = {}) => Object.assign(new Error(msg), { codigo, ...extra });
const dono = id => ({ tipo: 'market', id });
const contaPode = (db, userId, quem, agora, checkpoint) => {
  const c = elegibilidadeDaConta(db, { userId, acao: 'market', agora, checkpoint });
  if (!c.allowed) throw falha(ERRO_MERCADO_P2P.RECUSADA, `${quem} não pode negociar: ${c.reason_code}${c.detalhe ? ` (${c.detalhe})` : ''}`, { reason_code: c.reason_code });
};

/* O que o comprador vê da criatura — e é isto que o anúncio GUARDA (e o fill
   da ordem de criatura, ST-14.11B, que confere os critérios nele). O nível
   é o do XP, como em todo o jogo; o potencial sai da mesma função dos IVs
   (`hidratar`), e os seis IVs crus acompanham a ficha anunciada. */
export function retrato(db, pack, id) {
  const c = ler(db, id, pack);
  return { dex: c.especie, nivel: Math.max(c.nivel ?? 1, nivelDe(c.xp ?? 0)), natureza: c.natureza?.nome ?? null,
           shiny: !!c.shiny, potencial: c.potencial, exemplar: !!c.exemplar, origem: c.origem,iv:c.iv.slice(),
           ...(c.golpes ? { golpes: c.golpes } : {}) };
}

/* ── ANUNCIAR ─────────────────────────────────────────────────────────── */
export function anunciar(db, { userId, pack, ativo = {}, preco, agora, checkpoint }) {
  const criatura = typeof ativo.criaturaId === 'string' && ativo.criaturaId ? ativo.criaturaId : null;
  const item = !criatura && typeof ativo.itemId === 'string' && ativo.itemId ? ativo.itemId : null;
  const quantidade = criatura ? 1 : ativo.quantidade;
  if (!criatura && !(item && Number.isSafeInteger(quantidade) && quantidade > 0)) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'um anúncio é uma criatura ou um lote de um item');
  if (!Number.isSafeInteger(preco) || preco <= 0) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'preço inválido');
  const p = previewAnuncio({ preco });
  if (!p.ok) throw falha(ERRO_MERCADO_P2P.ENTRADA, p.motivo);
  return emTransacao(db, () => {
    contaPode(db, userId, 'esta conta', agora, checkpoint);
    const id = randomUUID(), expiraEm = agora + DURACAO_ANUNCIO_MS;
    reservarOferta(db, { userId, pack, dono: dono(id), ativos: criatura ? { criaturas: [criatura] } : { itens: [{ itemId: item, quantidade }] }, expiraEm, agora, checkpoint });
    const taxa = cobrarTaxaDeAnuncio(db, { userId, preco, ref: id, idem: `anuncio:${id}`, agora });
    if (!taxa.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `a taxa de anúncio não passou: ${taxa.motivo}`, { reason_code: 'INSUFFICIENT_FUNDS' });
    const snap = criatura ? retrato(db, pack, criatura) : { itemId: item };
    /* ST-14.10: o que a busca filtra vai em coluna, para o índice. */
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, item_id, quantidade, preco, estado, shiny,
                  snapshot_json, politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em, nivel, natureza, potencial, categoria)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, userId, pack.id, criatura ? 'criatura' : 'item', criatura, criatura ? snap.dex : null, item, quantidade, preco,
           snap.shiny ? 1 : 0, JSON.stringify(snap), p.versao, p.hash, p.taxaAnuncio, p.taxaVenda, agora, expiraEm,
           snap.nivel ?? null, snap.natureza ?? null, snap.potencial ?? null, criatura ? 'criaturas' : categoriaDoItem(pack, item));
    emitir(db, { nome: 'market_listed', userId, campos: { tipo: criatura ? 'criatura' : 'item', preco, taxa: p.taxaAnuncio }, chave: `anuncio:${id}`, agora });
    return paraVendedor(db, lerAnuncio(db, id));
  });
}

/* ── COMPRAR ──────────────────────────────────────────────────────────── */
export const comprar = (db, a) => comSinalDeLigada(db, a.agora, () => comprarTx(db, a));
function comprarTx(db, { userId, anuncioId, versao, preco, chaveIdem, agora, checkpoint }) {
  if (typeof chaveIdem !== 'string' || chaveIdem.length < 8 || chaveIdem.length > 80) throw falha(ERRO_MERCADO_P2P.ENTRADA, 'chave da compra inválida');
  return emTransacao(db, () => {
    const a = lerAnuncio(db, anuncioId);
    if (!a) throw falha(ERRO_MERCADO_P2P.NAO, 'anúncio não encontrado');
    if (a.estado === ESTADO_ANUNCIO.SOLD && a.comprador_id === userId && a.compra_chave === chaveIdem)
      return { ...JSON.parse(a.recibo_json), repetido: true };
    if (a.estado !== ESTADO_ANUNCIO.ACTIVE) throw falha(ERRO_MERCADO_P2P.ESTADO, a.estado === ESTADO_ANUNCIO.SOLD ? 'este anúncio já foi vendido' : `o anúncio está ${a.estado}`);
    exigirVigente(db, { dono: dono(a.id), agora });
    if (versao !== a.versao || preco !== a.preco) throw falha(ERRO_MERCADO_P2P.DESATUALIZADO, 'o anúncio não é mais o que você viu — recarregue');
    const c = avaliarContraparte({ userId, outroId: a.vendedor_id, ligadas: contasLigadas(db, userId) });
    if (!c.allowed) throw falha(ERRO_MERCADO_P2P.RECUSADA, `a compra não pode: ${c.detalhe}`, { reason_code: c.reason_code, ...recusaDaLigada(c, userId, a.vendedor_id) });
    /* a política única já lê a pausa, o congelamento e a divergência das duas */
    contaPode(db, userId, 'esta conta', agora, checkpoint);
    contaPode(db, a.vendedor_id, 'quem anunciou', agora, checkpoint);
    if (a.politica_hash !== hashDaPolitica(POLITICA_PILOTO)) throw falha(ERRO_MERCADO_P2P.ESTADO, 'a política de taxas deste anúncio não é mais a vigente');
    /* O PC-T do comprador: preso e passado na mesma transação. O vendedor
       recebe o líquido; a taxa de venda (a gravada no anúncio) queima. */
    const r = reservarP2PNoBanco(db, { userId, valor: a.preco, ref: `compra:${a.id}`, agora });
    if (!r.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, 'PC-T elegível insuficiente', { reason_code: 'INSUFFICIENT_FUNDS' });
    const pago = liquidarP2PNoBanco(db, { de: userId, para: a.vendedor_id, valor: a.preco - a.taxa_venda, taxa: a.taxa_venda, ref: a.id, agora,
                                          tipoTaxa: 'PLAYER_MARKET_SALE_FEE', memo: `${a.politica_versao}:${a.politica_hash}` });
    if (!pago.ok) throw falha(ERRO_MERCADO_P2P.RECUSADA, `o PC-T não passou: ${pago.motivo}`, { reason_code: 'INSUFFICIENT_FUNDS' });
    try {
      moverReservados(db, { holds: holdsAtivos(db, dono(a.id)), de: a.vendedor_id, para: userId, refTipo: 'mercado', refId: a.id,
                            criaturas: a.criatura_id ? [a.criatura_id] : [], agora });
    } catch (e) { throw e.codigo === ERRO_POSSE.FORA ? falha(ERRO_MERCADO_P2P.ESTADO, e.message) : e; }
    consumirOferta(db, { dono: dono(a.id), agora });
    const recibo = { id: a.id, tipo: a.tipo, quantidade: a.quantidade, preco: a.preco, taxaVenda: a.taxa_venda, liquido: a.preco - a.taxa_venda,
                     politica: a.politica_versao, compradoEm: agora, retrato: JSON.parse(a.snapshot_json) };
    const ok = db.prepare(`UPDATE player_market_listings SET estado = 'SOLD', versao = versao + 1, comprador_id = ?, compra_chave = ?,
                             encerrado_em = ?, recibo_json = ? WHERE id = ? AND estado = 'ACTIVE' AND versao = ?`)
      .run(userId, chaveIdem, agora, JSON.stringify(recibo), a.id, a.versao);
    if (ok.changes !== 1) throw falha(ERRO_MERCADO_P2P.ESTADO, 'o anúncio mudou no meio da compra');
    db.prepare(`INSERT INTO player_market_fills (listing_id, pack_id, tipo, dex, item_id, shiny, quantidade, preco, taxa_venda, liquido, vendedor_id, comprador_id, em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(a.id, a.pack_id, a.tipo, a.dex, a.item_id, a.shiny, a.quantidade, a.preco, a.taxa_venda, a.preco - a.taxa_venda, a.vendedor_id, userId, agora);
    emitir(db, { nome: 'market_sold', userId, campos: { tipo: a.tipo, preco: a.preco, queima: a.taxa_venda }, chave: `venda:${a.id}`, agora });
    return recibo;
  });
}

/* ── CANCELAR E VENCER ────────────────────────────────────────────────────
 * O ativo volta; a taxa de anúncio NÃO — é o custo de ter anunciado. */
export function cancelarAnuncio(db, { userId, anuncioId, agora }) {
  return emTransacao(db, () => {
    const a = lerAnuncio(db, anuncioId);
    if (!a || a.vendedor_id !== userId) throw falha(ERRO_MERCADO_P2P.NAO, 'anúncio não encontrado');
    if (a.estado !== ESTADO_ANUNCIO.ACTIVE) throw falha(ERRO_MERCADO_P2P.ESTADO, `o anúncio está ${a.estado}`);
    liberarOferta(db, { dono: dono(a.id), agora });
    db.prepare(`UPDATE player_market_listings SET estado = 'CANCELLED', versao = versao + 1, encerrado_em = ? WHERE id = ? AND estado = 'ACTIVE'`).run(agora, a.id);
    return { id: a.id, estado: ESTADO_ANUNCIO.CANCELLED };
  });
}

/* O gancho do varredor (ST-14.16): vence na MESMA transação das reservas. */
export function expirarAnuncioDaOferta(db, { dono: d, agora }) {
  db.prepare(`UPDATE player_market_listings SET estado = 'EXPIRED', versao = versao + 1, encerrado_em = ? WHERE id = ? AND estado = 'ACTIVE'`).run(agora, d.id);
}

/* ── LER ──────────────────────────────────────────────────────────────────
 * O público vê o anúncio e o nome de quem vende (nunca o id); o vendedor vê
 * também as taxas e o líquido exatos. A vitrine mostra só o que está ATIVO e
 * no prazo — a disponibilidade não depende de o varredor ter passado. */
const lerAnuncio = (db, id) => (typeof id === 'string' ? db.prepare(`SELECT * FROM player_market_listings WHERE id = ?`).get(id) : null);
const nomeDe = (db, id) => nomeExibivel(db.prepare(`SELECT username FROM users WHERE id = ?`).get(id)?.username, '?');   // D-177

export const publico = (db, a) => ({ id: a.id, tipo: a.tipo, quantidade: a.quantidade, preco: a.preco, versao: a.versao, estado: a.estado,
                              itemId: a.item_id, retrato: JSON.parse(a.snapshot_json), vendedor: nomeDe(db, a.vendedor_id),
                              criadoEm: a.criado_em, expiraEm: a.expira_em });
const paraVendedor = (db, a) => ({ ...publico(db, a), taxaAnuncio: a.taxa_anuncio, taxaVenda: a.taxa_venda, liquido: a.preco - a.taxa_venda });

export function detalheDoAnuncio(db, { anuncioId, userId, agora }) {
  const a = lerAnuncio(db, anuncioId);
  if (!a) throw falha(ERRO_MERCADO_P2P.NAO, 'anúncio não encontrado');
  if (a.vendedor_id === userId) return paraVendedor(db, a);
  if (a.estado !== ESTADO_ANUNCIO.ACTIVE || a.expira_em <= agora) {
    if (a.comprador_id === userId) return { ...publico(db, a), recibo: JSON.parse(a.recibo_json) };
    throw falha(ERRO_MERCADO_P2P.NAO, 'anúncio não encontrado');
  }
  return publico(db, a);
}

export function vitrine(db, { pack, agora, limite = 50 }) {
  return db.prepare(`SELECT * FROM player_market_listings WHERE estado = 'ACTIVE' AND pack_id = ? AND expira_em > ? ORDER BY criado_em DESC, id LIMIT ?`)
    .all(pack.id, agora, Math.min(limite, 100)).map(a => publico(db, a));
}

export const meusAnuncios = (db, { userId, limite = 50 }) =>
  db.prepare(`SELECT * FROM player_market_listings WHERE vendedor_id = ? ORDER BY criado_em DESC, id LIMIT ?`).all(userId, limite).map(a => paraVendedor(db, a));

export const minhasCompras = (db, { userId, limite = 50 }) =>
  db.prepare(`SELECT * FROM player_market_listings WHERE comprador_id = ? ORDER BY encerrado_em DESC, id LIMIT ?`).all(userId, limite)
    .map(a => ({ ...publico(db, a), recibo: JSON.parse(a.recibo_json) }));

/* Para conferir que a conta do anúncio ainda tem o que reservou (a
   conciliação da ST-14.16 já mede o escrow; aqui só o que é do anúncio). */
export const reservasDoAnuncio = (db, id) => holdsAtivos(db, dono(id));
