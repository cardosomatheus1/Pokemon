/* Q1/Q3/Q6/Q8/Q9 · E14 · AS ORDENS DE COMPRA DE ITENS E OS FILLS PARCIAIS (ST-14.11A · spec E14 §§10.3, 11)
 *
 * O aceite da ficha, frase a frase:
 *
 *   o PC-T preso na ordem não aposta nem compra outra coisa
 *   a ordem concorrente não enche duas vezes; a soma dos fills é o executado
 *   o preço respeita os dois limites; a diferença (melhora) volta na hora
 *   a taxa total não depende do número de fills; a parcela zero não grava
 *   linha (o CHECK do ledger não recusa)
 *   cancelar depois de um parcial devolve SÓ o restante
 *   a prioridade é preço → a mais antiga → id; a própria é pulada sem
 *   consumir; o mínimo de 50 PC por fill não deixa resto menor
 *   o crash no meio não deixa nada pela metade, e o retry devolve o recibo
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, pcTElegivel, reconciliarNoBanco } from '../server/carteira.mjs';
import { creditarBolsa, quantosNaBolsa } from '../server/idle.mjs';
import { lotesDe } from '../server/inventario.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { holdsAtivos } from '../server/reservas.mjs';
import { divergenciasDaEconomia } from '../server/conciliacao-economia.mjs';
import { passoEconomia } from '../server/economia-worker.mjs';
import { anunciar, comprar, expirarAnuncioDaOferta } from '../server/mercado-jogadores.mjs';
import { criarOrdem, venderParaOrdens, cancelarOrdem, expirarOrdemDaOferta, livroDoItem, minhasOrdens, avancarOrdem } from '../server/mercado-jogadores-ordens.mjs';
import { previaDaOrdem, previaDaVendaParaOrdens, linhaDaMinhaOrdem, itensDoLivro, abasDoMercado } from '../app/modules/mercado-jogadores-dados.mjs';
import { previewOrdem, quantoPreencher, casarVenda, casarCompra, taxasDosFills, ordemDoLivro, DURACAO_ORDEM_MS } from '../engine/matching-mercado-jogadores.mjs';
import { taxa } from '../engine/taxas-mercado.mjs';
import { historicoDaSerie } from '../server/mercado-jogadores-historico.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const CHECKPOINT = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, 1, ?, 'teste')
                ON CONFLICT (nome) DO UPDATE SET ligada = 1`).run(n, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
  const conta = (n, pc = 0, pokes = 0) => {
    const id = cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    if (pc) creditar(db, { userId: id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: pc, idem: `pc-${n}`, agora: AGORA });
    if (pokes) creditarBolsa(db, id, 'poke', pokes, { fonte: 'colheita:x', agora: AGORA });
    return id;
  };
  return { db, conta };
}
const pt = (db, u) => saldos(db, u).transferivel;
const res = (db, u) => saldos(db, u).reservado_transferivel ?? 0;
const ordem = (k, userId, q, p, chave, extra = {}) => criarOrdem(k.db, { userId, pack: PACK, itemId: 'poke', quantidade: q, precoUnit: p, chaveIdem: chave, agora: AGORA, checkpoint: CHECKPOINT, ...extra });
const vende = (k, userId, q, min, chave, extra = {}) => venderParaOrdens(k.db, { userId, pack: PACK, itemId: 'poke', quantidade: q, precoMinimo: min, chaveIdem: chave, agora: AGORA + 1000, checkpoint: CHECKPOINT, ...extra });
const limpo = db => { const d = divergenciasDaEconomia(db); return d.length ? JSON.stringify(d) : ''; };

export async function suite() {
  const s = criarSuite('e14-buy-orders');

  /* ── A CAMADA 0 ─────────────────────────────────────────────────────── */
  s.teste('motor: a ordem prende N × P e paga 0,5% para nascer; abaixo de 100 no total, não nasce', () => {
    const p = previewOrdem({ quantidade: 10, precoUnit: 100 });
    igual(`${p.reserva}|${p.taxaCriacao}|${p.total}`, '1000|5|1005', 'o que a ordem prende e paga');
    igual(previewOrdem({ quantidade: 3, precoUnit: 30 }).ok, false, 'a ordem de 90 nasceu');
    igual(previewOrdem({ quantidade: 1.5, precoUnit: 100 }).ok, false, 'quantidade fracionária passou');
  });

  s.teste('motor: o livro vai do melhor preço à mais antiga ao id; a própria é pulada sem consumir', () => {
    const livro = [{ id: 'c', seq: 3, precoUnit: 50, restante: 4, compradorId: 'X' }, { id: 'a', seq: 1, precoUnit: 40, restante: 10, compradorId: 'Y' },
                   { id: 'b', seq: 2, precoUnit: 50, restante: 4, compradorId: 'Z' }, { id: 'd', seq: 2, precoUnit: 50, restante: 4, compradorId: 'W' }];
    igual([...livro].sort(ordemDoLivro).map(o => o.id).join(''), 'bdca', 'a prioridade do livro');
    const f = casarVenda({ livro, vendedorId: 'Z', oferta: 6, precoMinimo: 40 });
    /* A ordem de Z (a primeira) é dele mesmo: pulada; d enche 4, c leva 2 — e a b continua com 4. */
    igual(f.map(x => `${x.ordemId}:${x.quantidade}@${x.precoUnit}`).join(' '), 'd:4@50 c:2@50', 'o casamento do vendedor');
    igual(casarVenda({ livro, vendedorId: 'Q', oferta: 30, precoMinimo: 45 }).reduce((s0, x) => s0 + x.quantidade, 0), 12, 'o mínimo do vendedor não cortou o livro');
  });

  s.teste('motor: o fill tem no mínimo 50 de bruto e não deixa resto menor que isso', () => {
    igual(quantoPreencher({ restante: 10, preco: 20, oferta: 3 }), 3, 'o pedaço normal');
    igual(quantoPreencher({ restante: 10, preco: 20, oferta: 2 }), 0, 'o fill de 40 passou');
    /* Sobraria 1 × 20 = 20: o pedaço encolhe para sobrar 3 (60). */
    igual(quantoPreencher({ restante: 10, preco: 20, oferta: 9 }), 7, 'o resto pequeno ficou');
    igual(quantoPreencher({ restante: 4, preco: 20, oferta: 3 }), 0, 'encolher tornaria o fill pequeno e ele passou');
    igual(quantoPreencher({ restante: 10, preco: 20, oferta: 10 }), 10, 'o restante inteiro não enche');
  });

  s.teste('motor: a taxa do acumulado — cinco fills pagam o mesmo que um, e a parcela pode ser zero', () => {
    const um = taxasDosFills([{ bruto: 500 }]), cinco = taxasDosFills(Array.from({ length: 5 }, () => ({ bruto: 100 })));
    igual(`${um[0].taxaVenda}|${cinco.reduce((a, f) => a + f.taxaVenda, 0)}|${taxa(500, 200)}`, '10|10|10', 'a taxa mudou com o número de fills');
    /* 1% de 50 arredonda para 1; o acumulado 100 também dá 2% = 2 — a segunda parcela de 50 paga 1, e com bps baixo, 0. */
    const baixa = taxasDosFills([{ bruto: 50 }, { bruto: 50 }], { bps: 100 });
    igual(baixa.map(f => f.taxaVenda).join(','), '1,0', 'a parcela zero não existe');
  });

  s.teste('motor: a ordem nova casa com o lote anunciado mais barato, inteiro, e a melhora é a diferença', () => {
    const anuncios = [{ id: 'x', vendedorId: 'V', quantidade: 5, preco: 400, criadoEm: 2 }, { id: 'y', vendedorId: 'V', quantidade: 4, preco: 300, criadoEm: 1 },
                      { id: 'z', vendedorId: 'V', quantidade: 2, preco: 300, criadoEm: 0 }];
    const f = casarCompra({ anuncios, compradorId: 'C', restante: 9, precoUnit: 100 });
    igual(f.map(x => `${x.anuncioId}:${x.quantidade}:${x.bruto}:${x.melhora}`).join(' '), 'y:4:300:100 x:5:400:100', 'o casamento da ordem');
    igual(casarCompra({ anuncios, compradorId: 'V', restante: 9, precoUnit: 100 }).length, 0, 'a ordem casou com o próprio anúncio');
    /* O lote acima do limite por unidade não casa — nem o mais barato depois dele na lista. */
    igual(casarCompra({ anuncios: [{ id: 'caro', vendedorId: 'V', quantidade: 2, preco: 250, criadoEm: 0 }], compradorId: 'C', restante: 9, precoUnit: 100 }).length, 0, 'comprou acima do limite');
  });

  /* ── O SERVIDOR ─────────────────────────────────────────────────────── */
  s.teste('o PC-T da ordem fica preso: não compra outra coisa, e a conta reconcilia', () => {
    const k = cena(), C = k.conta('Comp', 1100), V = k.conta('Vend', 100, 10);
    const o = ordem(k, C, 10, 100, 'ordem-0001');
    igual(`${o.reservado}|${o.taxaCriacao}|${res(k.db, C)}|${pcTElegivel(k.db, C, AGORA)}`, '1000|5|1000|95', 'o que a ordem prendeu');
    /* Um anúncio de 200 fica fora do alcance: só 95 estão livres. */
    const outro = k.conta('Outro', 100, 3);
    const a = anunciar(k.db, { userId: outro, pack: PACK, ativo: { itemId: 'poke', quantidade: 1 }, preco: 200, agora: AGORA, checkpoint: CHECKPOINT });
    const e = recusa(() => comprar(k.db, { userId: C, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-x-01', agora: AGORA, checkpoint: CHECKPOINT }));
    ok(e && /insuficiente/.test(e.message), `o PC-T preso pagou outra compra: ${e?.message}`);
    igual(limpo(k.db), '', 'o escrow não reconcilia');
    igual(reconciliarNoBanco(k.db, C).length, 0, 'o ledger não fecha');
    igual(quantosNaBolsa(k.db, V, 'poke'), 10, 'a bolsa de quem nada vendeu mudou');
  });

  s.teste('fills parciais de vários vendedores: a soma é o executado, o restante continua preso, e a taxa é do acumulado', () => {
    const k = cena(), C = k.conta('Comp', 2000), V1 = k.conta('Vend1', 0, 10), V2 = k.conta('Vend2', 0, 10);
    const o = ordem(k, C, 10, 100, 'ordem-0002');
    const r1 = vende(k, V1, 3, 90, 'venda-0001'), r2 = vende(k, V2, 4, 100, 'venda-0002');
    igual(`${r1.vendido}|${r1.bruto}|${r1.taxaVenda}|${r1.liquido}`, '3|300|6|294', 'o recibo da primeira venda');
    igual(`${r2.vendido}|${r2.bruto}|${r2.taxaVenda}`, '4|400|8', 'o recibo da segunda');
    const m = minhasOrdens(k.db, { userId: C }).find(x => x.id === o.id);
    igual(`${m.executado}|${m.restante}|${m.quantidade}|${m.pago}|${m.reservado}|${m.estado}`, '7|3|10|700|300|ACTIVE', 'a ordem depois dos fills');
    igual(`${m.fills.length}|${m.fills.reduce((a, f) => a + f.quantidade, 0)}`, '2|7', 'a soma dos fills');
    igual(`${quantosNaBolsa(k.db, C, 'poke')}|${quantosNaBolsa(k.db, V1, 'poke')}|${quantosNaBolsa(k.db, V2, 'poke')}`, '7|7|6', 'os itens não mudaram de mão');
    igual(`${pt(k.db, V1)}|${pt(k.db, V2)}|${res(k.db, C)}`, '294|392|300', 'o PC-T não foi para quem vendeu, ou o reservado não desceu');
    igual(lotesDe(k.db, C, 'poke').every(l => l.classe === 'p2p_verified'), true, 'o lote recebido não é p2p_verified');
    igual(limpo(k.db), '', 'o escrow não reconcilia depois dos fills');
  });

  s.teste('a melhora de preço: a ordem acha um lote anunciado mais barato e a diferença volta no mesmo commit', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 100, 10);
    const a = anunciar(k.db, { userId: V, pack: PACK, ativo: { itemId: 'poke', quantidade: 4 }, preco: 300, agora: AGORA - 10, checkpoint: CHECKPOINT });
    const o = ordem(k, C, 10, 100, 'ordem-0003');
    igual(`${o.executado}|${o.restante}|${o.pago}|${o.liberado}|${o.reservado}`, '4|6|300|100|600', 'a ordem não casou com o lote, ou não devolveu a diferença');
    igual(`${res(k.db, C)}|${pt(k.db, C)}`, `600|${2000 - 5 - 300 - 600}`, 'o comprador pagou o limite, e não o preço do lote');
    igual(k.db.prepare(`SELECT estado FROM player_market_listings WHERE id = ?`).get(a.id).estado, 'SOLD', 'o anúncio não foi vendido');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM player_market_fills WHERE listing_id = ?`).get(a.id).n, 1, 'a venda do anúncio não foi para o histórico');
    igual(quantosNaBolsa(k.db, C, 'poke'), 4, 'o lote não chegou');
    igual(limpo(k.db), '', 'o escrow não reconcilia depois da melhora');
  });

  s.teste('o lote anunciado acima do limite fica onde está, e a ordem nasce inteira', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 100, 10);
    const a = anunciar(k.db, { userId: V, pack: PACK, ativo: { itemId: 'poke', quantidade: 2 }, preco: 260, agora: AGORA - 10, checkpoint: CHECKPOINT });
    const o = ordem(k, C, 10, 100, 'ordem-caro-1');
    igual(`${o.executado}|${o.restante}|${k.db.prepare(`SELECT estado FROM player_market_listings WHERE id = ?`).get(a.id).estado}`, '0|10|ACTIVE', 'a ordem comprou acima do limite');
  });

  s.teste('a escrita do fill confere o que leu: a ordem lida antes de outra venda não avança', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 0, 10);
    const o = ordem(k, C, 10, 100, 'ordem-velha-1');
    const velha = k.db.prepare(`SELECT * FROM player_market_buy_orders WHERE id = ?`).get(o.id);
    vende(k, V, 8, 100, 'venda-velha-1');
    const e = recusa(() => avancarOrdem(k.db, { ...velha }, { quantidade: 5, bruto: 500, melhora: 0, agora: AGORA }));
    igual(e?.message, 'a ordem mudou no meio do fill', 'a leitura velha avançou a ordem');
    const cancelada = ordem(k, C, 5, 100, 'ordem-velha-2'), lida = k.db.prepare(`SELECT * FROM player_market_buy_orders WHERE id = ?`).get(cancelada.id);
    cancelarOrdem(k.db, { userId: C, ordemId: cancelada.id, agora: AGORA });
    ok(recusa(() => avancarOrdem(k.db, { ...lida }, { quantidade: 1, bruto: 100, melhora: 0, agora: AGORA })), 'a ordem cancelada avançou');
  });

  s.teste('a tela: a prévia diz o que prende e a taxa; a estimativa respeita o mínimo; o que não negocia não aparece', () => {
    const p = previaDaOrdem({ quantidade: 10, precoUnit: 100, elegivel: 2000 });
    igual(p.linhas.map(([k0, v]) => `${k0}=${v}`).join(' | '), 'Fica preso até encher=1000 PC-T (10 × 100) | Taxa para criar (sai agora, não volta)=5 PC-T | Sai do seu PC-T agora=1005 PC-T', 'a prévia da ordem');
    igual(`${previaDaOrdem({ quantidade: 10, precoUnit: 100, elegivel: 900 }).cobre}|${previaDaOrdem({ quantidade: 2, precoUnit: 30, elegivel: 900 }).ok}`, 'false|false', 'a prévia aceitou o que o servidor recusa');
    const niveis = [{ precoUnit: 100, quantidade: 3, ordens: 1 }, { precoUnit: 80, quantidade: 10, ordens: 2 }];
    const v = previaDaVendaParaOrdens({ niveis, quantidade: 6, precoMinimo: 90, tenho: 10 });
    igual(`${v.vende}|${v.linhas[1][1]}`, '3|3 × 100', 'a estimativa vendeu abaixo do mínimo');
    igual(previaDaVendaParaOrdens({ niveis, quantidade: 6, precoMinimo: 90, tenho: 2 }).ok, false, 'a estimativa vendeu o que não tem');
    igual(previaDaVendaParaOrdens({ niveis, quantidade: 6, precoMinimo: 120, tenho: 10 }).ok, false, 'a estimativa achou comprador acima do livro');
    ok(!itensDoLivro(PACK).some(i => i.id === PACK.moedaPve?.id), 'a moeda PvE aparece no livro');
    ok(abasDoMercado().some(([id]) => id === 'ordens'), 'a aba das ordens sumiu');
    const l = linhaDaMinhaOrdem({ id: 'x', itemId: 'poke', quantidade: 10, executado: 3, precoUnit: 95, pago: 285, liberado: 15, reservado: 665, estado: 'ACTIVE' });
    igual(`${l.progresso}|${l.detalhe}|${l.aberta}`, '3 de 10 compradas|pagou 285 PC-T · 15 voltaram (lote mais barato) · 665 PC-T presos|true', 'a linha da minha ordem');
  });

  s.teste('cancelar depois de um parcial devolve só o restante, e a taxa de criação não volta', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 0, 10);
    const o = ordem(k, C, 10, 100, 'ordem-0004');
    vende(k, V, 4, 100, 'venda-0003');
    const c = cancelarOrdem(k.db, { userId: C, ordemId: o.id, agora: AGORA + 2000 });
    igual(`${c.estado}|${c.executado}|${c.restante}|${c.reservado}`, 'CANCELLED|4|6|0', 'a ordem cancelada');
    igual(`${res(k.db, C)}|${pt(k.db, C)}`, `0|${2000 - 5 - 400}`, 'o cancelamento não devolveu só o restante');
    igual(recusa(() => vende(k, V, 2, 100, 'venda-0004'))?.message, 'nenhuma ordem paga isso agora', 'a ordem cancelada ainda casou');
    igual(limpo(k.db), '', 'o escrow não reconcilia depois do cancelamento');
  });

  s.teste('duas vendas disputam o último pedaço: a segunda vê o que sobrou, e a ordem não enche duas vezes', () => {
    const k = cena(), C = k.conta('Comp', 2000), V1 = k.conta('Vend1', 0, 10), V2 = k.conta('Vend2', 0, 10);
    const o = ordem(k, C, 5, 100, 'ordem-0005');
    const r1 = vende(k, V1, 5, 100, 'venda-0005');
    igual(r1.vendido, 5, 'a primeira não levou tudo');
    igual(recusa(() => vende(k, V2, 5, 100, 'venda-0006'))?.message, 'nenhuma ordem paga isso agora', 'a ordem cheia casou de novo');
    const m = minhasOrdens(k.db, { userId: C }).find(x => x.id === o.id);
    igual(`${m.estado}|${m.executado}|${quantosNaBolsa(k.db, V2, 'poke')}`, 'FILLED|5|10', 'a ordem encheu duas vezes');
    /* O CHECK segura até a escrita que o código não previu. */
    ok(recusa(() => k.db.prepare(`UPDATE player_market_buy_orders SET executado = executado + 1 WHERE id = ?`).run(o.id)), 'o banco aceitou executado além da quantidade');
  });

  s.teste('a própria ordem e a de conta ligada ficam de fora sem consumir nada', () => {
    const k = cena(), C = k.conta('Comp', 2000, 10), L = k.conta('Ligada', 2000), V = k.conta('Vend', 2000, 10);
    const minha = ordem(k, C, 5, 120, 'ordem-0006'), dela = ordem(k, L, 5, 110, 'ordem-0007'), outra = ordem(k, V, 5, 100, 'ordem-0008');
    ligarContas(k.db, { userId: C, outroId: L, sinal: 'aparelho', agora: AGORA });
    const r = vende(k, C, 5, 90, 'venda-0007');
    igual(`${r.vendido}|${r.fills.map(f => f.precoUnit).join(',')}`, '5|100', 'casou com a própria ou com a ligada');
    const lida = id => minhasOrdens(k.db, { userId: [C, L, V].find(u => minhasOrdens(k.db, { userId: u }).some(x => x.id === id)) }).find(x => x.id === id);
    igual(`${lida(minha.id).restante}|${lida(dela.id).restante}|${lida(outra.id).restante}`, '5|5|0', 'a pulada foi consumida');
  });

  s.teste('o crash no meio desfaz tudo; o retry devolve o recibo sem vender de novo', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 0, 3);
    ordem(k, C, 10, 100, 'ordem-0009');
    /* Quem quer vender 5 tem 3: o terceiro passo (prender o item) recusa e nada fica pela metade. */
    const antes = JSON.stringify([pt(k.db, C), res(k.db, C), pt(k.db, V), quantosNaBolsa(k.db, V, 'poke')]);
    ok(recusa(() => vende(k, V, 5, 100, 'venda-0008')), 'vendeu o que não tinha');
    igual(JSON.stringify([pt(k.db, C), res(k.db, C), pt(k.db, V), quantosNaBolsa(k.db, V, 'poke')]), antes, 'a venda que falhou deixou rastro');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills`).get().n, 0, 'o fill que falhou ficou gravado');
    const r = vende(k, V, 3, 100, 'venda-0009'), rr = vende(k, V, 3, 100, 'venda-0009');
    igual(`${rr.repetido}|${rr.id === r.id}|${quantosNaBolsa(k.db, V, 'poke')}|${pt(k.db, V)}`, 'true|true|0|294', 'o retry vendeu de novo');
    const o2 = ordem(k, C, 10, 100, 'ordem-0009');
    igual(o2.repetido, true, 'o retry da ordem criou outra');
  });

  s.teste('a ordem vence com o varredor e devolve o restante; o livro público não diz quem pediu', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 0, 10);
    const o = ordem(k, C, 10, 100, 'ordem-0010');
    ordem(k, k.conta('Mais', 2000), 3, 100, 'ordem-0011');
    const livro = livroDoItem(k.db, { pack: PACK, itemId: 'poke', agora: AGORA });
    igual(`${livro.melhor}|${livro.niveis[0].quantidade}|${livro.niveis[0].ordens}`, '100|13|2', 'o livro agregado');
    ok(!JSON.stringify(livro).includes(C), 'o livro diz quem pediu');
    igual(livro.niveis.map(n => Object.keys(n).sort().join(',')).join(' '), 'ordens,precoUnit,quantidade', 'o nível do livro leva mais do que preço e quantidade');
    /* Quem pergunta não vê as próprias: o casamento as pula, e a estimativa da tela contaria com elas. */
    igual(livroDoItem(k.db, { pack: PACK, itemId: 'poke', agora: AGORA, exceto: C }).niveis[0].quantidade, 3, 'o livro de quem pergunta inclui as dele');
    vende(k, V, 2, 100, 'venda-0010');
    passoEconomia(k.db, { agora: AGORA + DURACAO_ORDEM_MS + 1, entidades: { market: (db, a) => { expirarAnuncioDaOferta(db, a); expirarOrdemDaOferta(db, a); } } });
    const m = minhasOrdens(k.db, { userId: C }).find(x => x.id === o.id);
    igual(`${m.estado}|${m.executado}|${res(k.db, C)}`, 'EXPIRED|2|0', 'a ordem não venceu, ou não devolveu');
    igual(limpo(k.db), '', 'o escrow não reconcilia depois de vencer');
    /* E o servidor de verdade liga o gancho: o dono `market` é anúncio OU ordem. */
    const srv = readFileSync(new URL('../server/servidor.mjs', import.meta.url), 'utf8');
    ok(/market: \(db, a\) => \{ expirarAnuncioDaOferta\(db, a\); expirarOrdemDaOferta\(db, a\); \}/.test(srv), 'o varredor do servidor esquece as ordens, ou os anúncios');
  });

  s.teste('o histórico do item conta a venda para a ordem uma vez, e diz a maior ordem aberta', () => {
    const k = cena(), C = k.conta('Comp', 5000), V = k.conta('Vend', 100, 10);
    anunciar(k.db, { userId: V, pack: PACK, ativo: { itemId: 'poke', quantidade: 2 }, preco: 150, agora: AGORA - 10, checkpoint: CHECKPOINT });
    ordem(k, C, 10, 100, 'ordem-hist-1');     // casa com o lote anunciado (venda do anúncio)
    vende(k, V, 3, 100, 'venda-hist-1');      // e a venda para a ordem
    ordem(k, k.conta('Mais', 2000), 2, 130, 'ordem-hist-2');
    const h = historicoDaSerie(k.db, { pack: PACK, serie: { tipo: 'item', itemId: 'poke' }, agora: AGORA + 5000 });
    igual(`${h.n7d}|${h.maiorOrdem}`, "2|130", 'a venda do casamento contou duas vezes, ou a maior ordem sumiu');
  });

  s.teste('a entrada torta é recusada antes de qualquer cobrança', () => {
    const k = cena(), C = k.conta('Comp', 2000);
    for (const [args, msg] of [[{ itemId: 'nada' }, 'este item não existe'], [{ quantidade: 0 }, 'quantidade inválida'], [{ precoUnit: 5, quantidade: 3 }, 'a ordem é de no mínimo 100 no total']]) {
      const e = recusa(() => criarOrdem(k.db, { userId: C, pack: PACK, itemId: 'poke', quantidade: 10, precoUnit: 100, chaveIdem: 'ordem-torta', agora: AGORA, checkpoint: CHECKPOINT, ...args }));
      igual(e?.message, msg, `a entrada ${JSON.stringify(args)}`);
    }
    if (PACK.moedaPve?.id) igual(recusa(() => criarOrdem(k.db, { userId: C, pack: PACK, itemId: PACK.moedaPve.id, quantidade: 10, precoUnit: 100, chaveIdem: 'ordem-pve', agora: AGORA, checkpoint: CHECKPOINT }))?.message,
                                 'este item não é negociável', 'a moeda PvE ganhou ordem');
    igual(`${pt(k.db, C)}|${res(k.db, C)}`, '2000|0', 'a recusa cobrou');
    /* Sem PC-T para prender: nada fica preso, nem a taxa sai. */
    const pobre = k.conta('Pobre', 500);
    ok(recusa(() => ordem(k, pobre, 10, 100, 'ordem-pobre')), 'a ordem sem saldo nasceu');
    igual(`${pt(k.db, pobre)}|${res(k.db, pobre)}`, '500|0', 'a ordem recusada prendeu ou cobrou');
  });

  s.teste('pela porta: criar, ler o livro, vender para a ordem e cancelar — e a entrada torta é 400', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const sessao = async n => {
        const r = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(), body: JSON.stringify({ username: n, email: `${n.toLowerCase()}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
        return { authorization: `Bearer ${r.sessao}`, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(n).id };
      };
      const [c, v] = [await sessao('OrdemC'), await sessao('OrdemV')];
      creditar(srv.db, { userId: c.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 2000, idem: 'h-oc', agora: Date.now() });
      creditarBolsa(srv.db, v.id, 'poke', 5, { fonte: 'colheita:x', agora: Date.now() });
      const post = (x, rota, corpo) => fetch(url(rota), { method: 'POST', headers: Hd({ authorization: x.authorization }), body: JSON.stringify(corpo) });
      const criada = await post(c, '/api/player-market/buy-orders/create', { itemId: 'poke', quantidade: 5, precoUnit: 100, chave: 'http-ordem-1' });
      const o = await criada.json();
      igual(`${criada.status}|${o.restante}|${o.reservado}`, '200|5|500', 'a ordem pela porta');
      const lida = await (await fetch(url('/api/player-market/buy-orders?item=poke'), { headers: Hd({ authorization: v.authorization }) })).json();
      igual(`${lida.livro.melhor}|${lida.livro.niveis[0].quantidade}|${lida.minhas.length}`, '100|5|0', 'o livro pela porta (e as ordens de outro não aparecem como minhas)');
      const venda = await (await post(v, '/api/player-market/buy-orders/fill', { itemId: 'poke', quantidade: 2, precoMinimo: 90, chave: 'http-venda-1' })).json();
      igual(`${venda.vendido}|${venda.liquido}`, '2|196', 'a venda pela porta');
      igual((await post(v, '/api/player-market/buy-orders/cancel', { id: o.id })).status, 404, 'cancelou a ordem de outra conta');
      const cancel = await (await post(c, '/api/player-market/buy-orders/cancel', { id: o.id })).json();
      igual(`${cancel.estado}|${cancel.executado}`, 'CANCELLED|2', 'o cancelamento pela porta');
      igual((await post(c, '/api/player-market/buy-orders/create', { itemId: 'poke', quantidade: '5', precoUnit: 100, chave: 'http-ordem-2' })).status, 400, 'a quantidade em texto passou');
      igual((await post(c, '/api/player-market/buy-orders/fill', { itemId: 'poke', quantidade: 1 })).status, 400, 'a venda sem preço mínimo passou');
      igual((await fetch(url('/api/player-market/buy-orders'), { headers: Hd() })).status, 401, 'o livro sem sessão');
    } finally { await srv.fechar(); }
  });

  return s;
}
