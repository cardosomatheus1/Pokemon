/* Q1/Q3/Q4/Q9 · E14 · O GATE D: AS ORDENS DE COMPRA RECONCILIADAS (ST-14.15 D · spec E14 §§10.3, 12–15)
 *
 * O mesmo método do gate C: várias contas usam as ordens de verdade — de
 * item e de criatura, enchendo aos poucos, casando com lote anunciado,
 * cancelando depois de um parcial, vencendo pelo varredor — e depois cada
 * PC-T e cada unidade se explicam. A evidência que a ficha pede:
 *
 *   matching     a prioridade e o preço foram os do livro
 *   parcial      original = executado + restante; a soma dos fills é o executado
 *   melhora      o que voltou é a soma das melhoras, e não sobrou reserva
 *   cancelamento só o restante voltou; a taxa de criação queimou
 *   estatística  a liquidez e a série de preço contam cada venda UMA vez
 *
 * E por cima, o que o gate C já exigia: sem mint P2P, sem furo, taxas
 * mostradas = liquidadas, conciliação limpa, nada preso no fim.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { creditarBolsa } from '../server/idle.mjs';
import { painelEconomico } from '../server/admin.mjs';
import { divergenciasDaEconomia } from '../server/conciliacao-economia.mjs';
import { passoEconomia } from '../server/economia-worker.mjs';
import { anunciar, expirarAnuncioDaOferta } from '../server/mercado-jogadores.mjs';
import { criarOrdem, venderParaOrdens, cancelarOrdem, expirarOrdemDaOferta, criarOrdemDeCriatura, venderCriaturaParaOrdem } from '../server/mercado-jogadores-ordens.mjs';
import { historicoDaSerie } from '../server/mercado-jogadores-historico.mjs';
import { painelE14 } from '../server/economia-e14.mjs';
import { DURACAO_ORDEM_MS } from '../engine/matching-mercado-jogadores.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const somaPokes = db => db.prepare(`SELECT COALESCE(SUM(quantidade), 0) n FROM bolsa WHERE item_id = 'poke'`).get().n;

function piloto() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const [A, B, C, D, E, F] = ['GateA', 'GateB', 'GateC', 'GateD', 'GateE', 'GateF'].map(conta);
  for (const u of [A, B, C, D, E, F]) creditar(db, { userId: u, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 6000, idem: `pc-${u}`, agora: AGORA });
  for (const u of [D, E, F]) creditarBolsa(db, u, 'poke', 12, { fonte: 'colheita:x', agora: AGORA });
  return { db, A, B, C, D, E, F, mostradas: { criacao: 0, anuncio: 0, venda: 0 } };
}

function rodarPiloto(k) {
  const t = AGORA;
  /* Um lote anunciado mais barato que o limite: a ordem do A casa com ele na chegada. */
  const lote = anunciar(k.db, { userId: k.F, pack: PACK, ativo: { itemId: 'poke', quantidade: 3 }, preco: 240, agora: t });
  k.mostradas.anuncio += lote.taxaAnuncio;
  const oA = criarOrdem(k.db, { userId: k.A, pack: PACK, itemId: 'poke', quantidade: 10, precoUnit: 100, chaveIdem: 'gate-ordem-A', agora: t + 10 });
  k.mostradas.criacao += oA.taxaCriacao; k.mostradas.venda += lote.taxaVenda;
  /* Duas ordens no mesmo preço (a do B é mais antiga) e uma mais barata. */
  const oB = criarOrdem(k.db, { userId: k.B, pack: PACK, itemId: 'poke', quantidade: 6, precoUnit: 90, chaveIdem: 'gate-ordem-B', agora: t + 20 });
  const oC = criarOrdem(k.db, { userId: k.C, pack: PACK, itemId: 'poke', quantidade: 6, precoUnit: 90, chaveIdem: 'gate-ordem-C', agora: t + 30 });
  k.mostradas.criacao += oB.taxaCriacao + oC.taxaCriacao;
  /* Vendedores enchem aos poucos. */
  for (const [u, q, min, ch] of [[k.D, 5, 80, 'gate-venda-1'], [k.E, 6, 85, 'gate-venda-2'], [k.D, 4, 85, 'gate-venda-3']]) {
    const r = venderParaOrdens(k.db, { userId: u, pack: PACK, itemId: 'poke', quantidade: q, precoMinimo: min, chaveIdem: ch, agora: t + 100 });
    k.mostradas.venda += r.taxaVenda;
  }
  /* O C cancela depois do parcial; a do B vence pelo varredor. */
  cancelarOrdem(k.db, { userId: k.C, ordemId: oC.id, agora: t + 200 });
  /* A ordem de criatura: atendida por uma instância que cumpre tudo. */
  const oc = criarOrdemDeCriatura(k.db, { userId: k.B, pack: PACK, criterios: { dex: 25, nivelMin: 10 }, preco: 800, chaveIdem: 'gate-ocria', agora: t + 300 });
  k.mostradas.criacao += oc.taxaCriacao;
  const cr = gerar(k.db, { userId: k.E, pack: PACK, dex: 25, origem: 'captura' }).id;
  k.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(15), cr);
  const rc = venderCriaturaParaOrdem(k.db, { userId: k.E, pack: PACK, ordemId: oc.id, criaturaId: cr, chaveIdem: 'gate-vcria', agora: t + 400 });
  k.mostradas.venda += rc.taxaVenda;
  passoEconomia(k.db, { agora: t + DURACAO_ORDEM_MS + 1, entidades: { market: (db, a) => { expirarAnuncioDaOferta(db, a); expirarOrdemDaOferta(db, a); } } });
  return { oA, oB, oC, oc, cr, lote };
}
const ordens = db => db.prepare(`SELECT * FROM player_market_buy_orders ORDER BY seq`).all();

export async function suite() {
  const s = criarSuite('e14-gate-d');

  s.teste('o piloto das ordens fecha: sem mint P2P, sem furo, nada emitido, nada preso, unidades conservadas', () => {
    const k = piloto();
    const antes = painelE14(k.db, { agora: AGORA }), pokes = somaPokes(k.db);
    rodarPiloto(k);
    const p = painelE14(k.db, { agora: AGORA + DURACAO_ORDEM_MS + 10 });
    igual(p.problemas.join(' · '), '', 'o gate D tem problema');
    igual(`${p.mintP2P}|${p.furoDeConservacao}`, '0|0', 'mint ou furo');
    igual(p.emissao, antes.emissao, 'as ordens emitiram PC-T');
    igual(p.circulante, antes.circulante - p.queima.total, 'o circulante não caiu exatamente a queima');
    igual(somaPokes(k.db), pokes, 'as ordens criaram ou sumiram unidades');
    igual(JSON.stringify(divergenciasDaEconomia(k.db)), '[]', 'a conciliação achou divergência');
    igual(JSON.stringify(painelEconomico(k.db).divergencia), '{}', 'o painel econômico diverge');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE estado = 'ativa'`).get().n, 0, 'sobrou reserva ativa');
    for (const u of [k.A, k.B, k.C, k.D, k.E, k.F]) igual(saldos(k.db, u).reservado_transferivel, 0, `PC-T preso em ${u}`);
  });

  s.teste('as taxas mostradas são as liquidadas: criação, anúncio e venda', () => {
    const k = piloto(); rodarPiloto(k);
    const q = painelE14(k.db, { agora: AGORA + 1000 }).queima.porTipo;
    igual(`${q.PLAYER_MARKET_LISTING_FEE}|${q.PLAYER_MARKET_SALE_FEE}`, `${k.mostradas.criacao + k.mostradas.anuncio}|${k.mostradas.venda}`, 'a taxa cobrada não é a mostrada');
    const dosFills = k.db.prepare(`SELECT COALESCE(SUM(taxa_venda), 0) t FROM player_market_order_fills WHERE venda_ref LIKE 'venda:%'`).get().t
                   + k.db.prepare(`SELECT COALESCE(SUM(taxa_venda), 0) t FROM player_market_fills`).get().t;
    igual(dosFills, k.mostradas.venda, 'os fills gravaram outra taxa');
  });

  s.teste('matching e parcial: a prioridade do livro, original = executado + restante, e cada fill somado', () => {
    const k = piloto(); const { oA, oB, oC } = rodarPiloto(k);
    const os = ordens(k.db), por = id => os.find(o => o.id === id);
    for (const o of os) {
      igual(o.quantidade, o.executado + o.restante, `a ordem ${o.seq} não conserva`);
      const f = k.db.prepare(`SELECT COALESCE(SUM(quantidade), 0) q, COALESCE(SUM(bruto), 0) b, COALESCE(SUM(melhora), 0) m FROM player_market_order_fills WHERE ordem_id = ?`).get(o.id);
      igual(`${f.q}|${f.b}|${f.m}`, `${o.executado}|${o.pago}|${o.liberado}`, `a ordem ${o.seq} não bate com os fills`);
    }
    /* A: 3 do lote na chegada + 7 dos vendedores (o melhor preço do livro enche primeiro). */
    igual(`${por(oA.id).executado}|${por(oA.id).estado}`, '10|FILLED', 'o melhor preço não encheu primeiro');
    /* B e C, mesmo preço: a mais antiga (B) enche antes da mais nova (C). */
    ok(por(oB.id).executado >= por(oC.id).executado, `a mais nova encheu antes: B ${por(oB.id).executado}, C ${por(oC.id).executado}`);
    igual(`${por(oC.id).estado}|${por(oB.id).estado}`, `CANCELLED|${por(oB.id).restante ? 'EXPIRED' : 'FILLED'}`, 'o fim das ordens');
    /* O vendedor nunca recebeu abaixo do mínimo que pediu: todo fill de vendedor saiu ao preço da ordem. */
    const abaixo = k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills f JOIN player_market_buy_orders o ON o.id = f.ordem_id
                                 WHERE f.venda_ref LIKE 'venda:%' AND f.tipo = 'item' AND f.bruto <> f.quantidade * o.preco_unit`).get().n;
    igual(abaixo, 0, 'um fill saiu fora do preço da ordem');
  });

  s.teste('a melhora e o cancelamento: o que voltou é o que não foi gasto, e a taxa de criação ficou', () => {
    const k = piloto(); const { oA, oC } = rodarPiloto(k);
    const a = ordens(k.db).find(o => o.id === oA.id);
    igual(a.liberado, 3 * 100 - 240, 'a melhora do lote não voltou inteira');
    igual(saldos(k.db, k.A).transferivel, 6000 - a.taxa_criacao - a.pago, 'o A pagou mais do que o executado e a taxa');
    const c = ordens(k.db).find(o => o.id === oC.id);
    igual(saldos(k.db, k.C).transferivel, 6000 - c.taxa_criacao - c.pago, 'o cancelamento não devolveu só o restante');
  });

  s.teste('o painel diz o que está preso em ordens abertas — o escrow que o operador precisa ver', () => {
    const k = piloto();
    criarOrdem(k.db, { userId: k.A, pack: PACK, itemId: 'poke', quantidade: 10, precoUnit: 100, chaveIdem: 'gate-aberta-1', agora: AGORA });
    venderParaOrdens(k.db, { userId: k.D, pack: PACK, itemId: 'poke', quantidade: 4, precoMinimo: 100, chaveIdem: 'gate-aberta-v1', agora: AGORA + 10 });
    const l = painelE14(k.db, { agora: AGORA + 20 }).liquidez;
    igual(`${l.ordensAbertas}|${l.presoEmOrdens}`, '1|600', 'o painel não mostra o escrow das ordens');
  });

  s.teste('a estatística conta cada venda uma vez: liquidez, série do item e série da espécie', () => {
    const k = piloto(); rodarPiloto(k);
    const nAnuncio = k.db.prepare(`SELECT COUNT(*) n FROM player_market_fills`).get().n;
    const nVenda = k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills WHERE venda_ref LIKE 'venda:%'`).get().n;
    const nCasamento = k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills WHERE venda_ref LIKE 'anuncio:%'`).get().n;
    igual(`${nAnuncio}|${nCasamento}`, '1|1', 'o casamento com o anúncio não foi gravado dos dois lados');
    const p = painelE14(k.db, { agora: AGORA + 1000 });
    igual(p.liquidez.vendas7d, nAnuncio + nVenda, 'a liquidez dobrou ou perdeu vendas');
    const itens = k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills WHERE venda_ref LIKE 'venda:%' AND tipo = 'item'`).get().n;
    const h = historicoDaSerie(k.db, { pack: PACK, serie: { tipo: 'item', itemId: 'poke' }, agora: AGORA + 1000 });
    igual(h.n7d, itens + nAnuncio, 'a série do item contou o casamento duas vezes');
    igual(`${p.liquidez.ordensAbertas}|${p.liquidez.presoEmOrdens}`, '0|0', 'sobrou ordem aberta no painel depois do varredor');
  });

  return s;
}
