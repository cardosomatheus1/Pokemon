/* Q1/Q3/Q4/Q9 · E14 · O GATE C: O PILOTO RECONCILIADO (ST-14.15 · spec E14 §§12–15)
 *
 * Várias contas trocam e compram de verdade, com as bandeiras como a DEC-21
 * as deixa (sem linha de operador, sem checkpoint de dinheiro real), e
 * depois cada PC-T se explica. O aceite da ficha, frase a frase:
 *
 *   taxas mostradas = taxas liquidadas
 *   ausência de mint P2P
 *   reservado reconcilia
 *   estoque sai da emissão menos consumo, sem duplicação
 *   operação com crash tem resultado único
 *   operação nova não é faucet
 *
 * E as sabotagens da ficha, cada uma com o teste que a pega: evento
 * duplicado contaminar KPI; estatística misturar shiny/normal; transferência
 * contabilizada como emissão; desligamento de flag impedir liberar escrow.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos, SO_RESERVA as SO_RESERVA_SRV, RESERVAS as RESERVAS_SRV } from '../server/carteira.mjs';
import { creditarBolsa, quantosNaBolsa } from '../server/idle.mjs';
import { emitirControlado } from '../server/emissao-controlada.mjs';
import { painelEconomico } from '../server/admin.mjs';
import { criarOperador } from '../server/admin.mjs';
import { emitir } from '../server/telemetria.mjs';
import { holdsAtivos } from '../server/reservas.mjs';
import { divergenciasDaEconomia, conciliarEconomia } from '../server/conciliacao-economia.mjs';
import { passoEconomia } from '../server/economia-worker.mjs';
import { criarTroca, ofertar, pronto, confirmar, detalheDaTroca } from '../server/trocas.mjs';
import { anunciar, comprar, cancelarAnuncio, DURACAO_ANUNCIO_MS } from '../server/mercado-jogadores.mjs';
import { painelE14, fatosDaEconomiaE14 } from '../server/economia-e14.mjs';
import { classificarLedger, efeitoDaLinha, resumoE14, SO_RESERVA, RESERVAS, problemasDoGateC, estoqueControlado } from '../engine/kpis-e14.mjs';
import { simularE14, CENARIOS } from '../engine/simulador-e14.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const GARANTIDA = PACK.catalogo.find(i => i.guaranteed_capture === true)?.id;
const FONTE = Object.keys(PACK.catalogo.find(i => i.id === GARANTIDA)?.emissao?.fontes ?? {})[0];

/* O PILOTO: seis contas, PC-T de fonte aprovada, criaturas (duas shiny), a
   bola garantida pela porta única — e então trocas e compras, como jogadores. */
function piloto() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const [A, B, C, D, E, F] = ['PilotoA', 'PilotoB', 'PilotoC', 'PilotoD', 'PilotoE', 'PilotoF'].map(conta);
  const k = { db, A, B, C, D, E, F, mostradas: { listing: 0, venda: 0, troca: 0 } };
  for (const u of [A, B, C, D, E, F]) creditar(db, { userId: u, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 5000, idem: `pc-${u}`, agora: AGORA });
  k.cr = u => gerar(db, { userId: u, pack: PACK, dex: 25 }).id;
  k.shiny = gerar(db, { userId: A, pack: PACK, dex: 25, shiny: true }).id;
  k.shiny2 = gerar(db, { userId: D, pack: PACK, dex: 7, shiny: true }).id;
  creditarBolsa(db, C, 'poke', 6, { fonte: 'colheita:x', agora: AGORA });
  for (const [u, ev] of [[E, 'g1'], [D, 'g2']]) emitirControlado(db, { userId: u, pack: PACK, itemId: GARANTIDA, fonte: FONTE, evento: ev, agora: AGORA });
  return k;
}
const ctx = (u, agora = AGORA) => ({ userId: u, pack: PACK, agora });
function trocar(k, de, para, meu, dele, agora = AGORA) {
  const t = criarTroca(k.db, { ...ctx(de, agora), contraparteId: para, ativos: meu });
  ofertar(k.db, { trocaId: t.id, ...ctx(para, agora), ativos: dele });
  pronto(k.db, { trocaId: t.id, ...ctx(de, agora), revisao: 2 }); pronto(k.db, { trocaId: t.id, ...ctx(para, agora), revisao: 2 });
  const d = detalheDaTroca(k.db, { trocaId: t.id, userId: de });
  k.mostradas.troca += d.meu.taxa + d.dele.taxa;
  confirmar(k.db, { trocaId: t.id, userId: de, revisao: d.revisao, hash: d.hash, agora });
  return confirmar(k.db, { trocaId: t.id, userId: para, revisao: d.revisao, hash: d.hash, agora });
}
function vender(k, vendedor, comprador, ativo, preco, chave, agora = AGORA) {
  const a = anunciar(k.db, { userId: vendedor, pack: PACK, ativo, preco, agora });
  k.mostradas.listing += a.taxaAnuncio;
  const r = comprar(k.db, { userId: comprador, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: chave, agora: agora + 1000 });
  k.mostradas.venda += a.taxaVenda;
  return { a, r };
}
function rodarPiloto(k) {
  trocar(k, k.A, k.B, { criaturas: [k.cr(k.A)], moeda: 300 }, { criaturas: [k.cr(k.B)] });
  trocar(k, k.C, k.D, { itens: [{ itemId: 'poke', quantidade: 2 }] }, { moeda: 200 });
  trocar(k, k.E, k.F, { itens: [{ itemId: GARANTIDA, quantidade: 1 }] }, { moeda: 1500 });
  vender(k, k.A, k.C, { criaturaId: k.shiny }, 2500, 'compra-piloto-1');
  vender(k, k.D, k.E, { criaturaId: k.shiny2 }, 1800, 'compra-piloto-2');
  vender(k, k.B, k.F, { criaturaId: k.cr(k.B) }, 400, 'compra-piloto-3');
  vender(k, k.C, k.A, { itemId: 'poke', quantidade: 3 }, 300, 'compra-piloto-4');
  /* um anúncio cancelado: a taxa de anúncio queimou e não volta */
  const x = anunciar(k.db, { userId: k.F, pack: PACK, ativo: { criaturaId: k.cr(k.F) }, preco: 1000, agora: AGORA });
  k.mostradas.listing += x.taxaAnuncio;
  cancelarAnuncio(k.db, { userId: k.F, anuncioId: x.id, agora: AGORA + 2000 });
}
const contaCriaturas = db => db.prepare(`SELECT COUNT(*) n, SUM(is_shiny) s FROM criaturas`).get();

export async function suite() {
  const s = criarSuite('e14-economia');

  s.teste('o piloto fecha: sem mint P2P, sem furo, nada duplicado, nada aberto — com as bandeiras da DEC-21', () => {
    const k = piloto();
    const antes = painelE14(k.db, { agora: AGORA });
    const criaturasAntes = contaCriaturas(k.db).n + 4;       // as quatro que o piloto ainda gera
    rodarPiloto(k);
    const p = painelE14(k.db, { agora: AGORA + 5000 });
    igual(p.problemas.join(' · '), '', 'o gate C tem problema');
    igual(`${p.mintP2P}|${p.furoDeConservacao}`, '0|0', 'mint ou furo');
    /* OPERAÇÃO NOVA NÃO É FAUCET: troca e venda não emitiram um PC-T */
    igual(p.emissao, antes.emissao, `a economia entre jogadores emitiu: ${JSON.stringify(p.fontes)}`);
    igual(p.circulante, antes.circulante - p.queima.total, 'o circulante não caiu exatamente a queima');
    igual(contaCriaturas(k.db).n, criaturasAntes, 'a troca criou ou apagou criatura');
    ok(p.liquidez.vendas7d === 4 && p.liquidez.trocas7d === 3 && p.liquidez.compradores7d === 4, `a liquidez: ${JSON.stringify(p.liquidez)}`);
  });

  s.teste('as taxas mostradas são as liquidadas, tipo a tipo', () => {
    const k = piloto(); rodarPiloto(k);
    const q = painelE14(k.db, { agora: AGORA + 5000 }).queima.porTipo;
    igual(`${q.PLAYER_MARKET_LISTING_FEE}|${q.PLAYER_MARKET_SALE_FEE}|${q.DIRECT_TRADE_FEE}`,
          `${k.mostradas.listing}|${k.mostradas.venda}|${k.mostradas.troca}`, 'a taxa cobrada não é a mostrada');
    const doLedger = k.db.prepare(`SELECT COALESCE(-SUM(reserva_delta), 0) r FROM wallet_ledger WHERE type IN ('PLAYER_MARKET_SALE_FEE', 'DIRECT_TRADE_FEE')`).get().r;
    igual(doLedger, k.mostradas.venda + k.mostradas.troca, 'o ledger não tem as taxas da reserva');
  });

  s.teste('o reservado reconcilia: conciliação limpa, painel do E11 sem divergência, nenhuma reserva presa', () => {
    const k = piloto(); rodarPiloto(k);
    igual(JSON.stringify(divergenciasDaEconomia(k.db)), '[]', 'a conciliação achou divergência');
    igual(JSON.stringify(painelEconomico(k.db).divergencia), '{}', 'o painel econômico diverge');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE estado = 'ativa'`).get().n, 0, 'sobrou reserva ativa');
    for (const u of [k.A, k.B, k.C, k.D, k.E, k.F]) igual(saldos(k.db, u).reservado_transferivel, 0, `PC-T preso em ${u}`);
    /* o saldo escrito por fora do ledger: o furo aparece com o número, e o gate reprova */
    k.db.prepare(`UPDATE carteiras SET saldo = saldo + 10 WHERE user_id = ? AND bucket = 'transferivel'`).run(k.A);
    const p = painelE14(k.db, { agora: AGORA });
    ok(p.furoDeConservacao === -10 && p.problemas.some(x => /furo/.test(x)), `o saldo inventado passou: ${p.furoDeConservacao}`);
  });

  s.teste('o estoque: a bola garantida muda de dono sem duplicar; consumir sai do estoque', () => {
    const k = piloto(); rodarPiloto(k);
    const g = painelE14(k.db, { agora: AGORA }).controlada[GARANTIDA];
    igual(`${g.emitidas}|${g.estoque}|${g.consumidas}|${g.duplicadas}`, '2|2|0|0', 'o estoque da garantida');
    igual(`${quantosNaBolsa(k.db, k.D, GARANTIDA)}|${quantosNaBolsa(k.db, k.E, GARANTIDA)}|${quantosNaBolsa(k.db, k.F, GARANTIDA)}`, '1|0|1', 'a garantida não mudou de dono');
    /* a cópia que uma troca errada faria: aparece como DUPLICADA, e o gate reprova */
    creditarBolsa(k.db, k.F, GARANTIDA, 1, { fonte: 'troca:copiada', agora: AGORA });
    const p = painelE14(k.db, { agora: AGORA });
    igual(p.controlada[GARANTIDA].duplicadas, 1, 'a cópia não apareceu');
    ok(p.problemas.some(x => /duplicad/.test(x)), 'o gate passou com item controlado duplicado');
    igual(JSON.stringify(estoqueControlado({ m: 5 }, { m: 3 }).m), '{"emitidas":5,"estoque":3,"consumidas":2,"duplicadas":0}', 'o consumo');
  });

  s.teste('o shiny conta à parte do normal, por espécie, e a troca não o cria nem o some', () => {
    const k = piloto();
    const s0 = painelE14(k.db, { agora: AGORA }).shiny;
    igual(`${s0.estoque}|${s0.porEspecie[25]}|${s0.porEspecie[7]}`, '2|1|1', 'o estoque shiny');
    for (let i = 0; i < 5; i++) k.cr(k.A);                     // normais da mesma espécie
    rodarPiloto(k);
    const s1 = painelE14(k.db, { agora: AGORA + 5000 });
    igual(`${s1.shiny.estoque}|${s1.shiny.porEspecie[25]}|${s1.shiny.soltos}`, '2|1|0', 'o normal entrou na conta do shiny');
    igual(s1.liquidez.vendasShiny7d, 2, 'as vendas shiny');
  });

  s.teste('evento duplicado na telemetria não move KPI nenhum', () => {
    const k = piloto(); rodarPiloto(k);
    const antes = JSON.stringify(painelE14(k.db, { agora: AGORA + 5000 }));
    for (let i = 0; i < 3; i++) emitir(k.db, { nome: 'market_sold', userId: k.A, campos: { tipo: 'criatura', preco: 99999, queima: 999 }, chave: `venda:repetida-${i % 2}`, agora: AGORA });
    emitir(k.db, { nome: 'trade_settled', campos: { pct: 50000, queima: 500 }, chave: 'troca:fantasma', agora: AGORA });
    igual(JSON.stringify(painelE14(k.db, { agora: AGORA + 5000 })), antes, 'a telemetria mexeu no painel');
  });

  s.teste('a passagem P2P não é emissão; a taxa é queima; reserva e liberação são zero', () => {
    const f = classificarLedger([{ tipo: 'P2P_TRANSFER_IN', efeito: 980 }, { tipo: 'P2P_TRANSFER_OUT', efeito: -980 }, { tipo: 'PLAYER_MARKET_SALE_FEE', efeito: -20 },
                                 { tipo: 'ADMIN_ADJUSTMENT', efeito: 5000 }, { tipo: 'P2P_RESERVE', efeito: 0 }, { tipo: 'SHOP_PURCHASE', efeito: -100 }]);
    igual(`${f.emitido}|${f.p2pEntrou}|${f.p2pSaiu}|${f.queimadoE14.PLAYER_MARKET_SALE_FEE}|${f.outrosSinks}`, '5000|980|980|20|100', 'a classificação');
    igual(efeitoDaLinha({ tipo: 'PLAYER_MARKET_SALE_FEE', amount: -20, reservaDelta: -20 }), -20, 'a taxa da reserva contou duas vezes');
    igual(efeitoDaLinha({ tipo: 'P2P_RESERVE', amount: -500, reservaDelta: 500 }), 0, 'a reserva mudou o total');
    const r = resumoE14({ ...f, circulante: 4880, saldosTransferiveis: [4880] });
    igual(`${r.mintP2P}|${r.furoDeConservacao}`, '0|0', 'o resumo');
    igual(resumoE14({ ...f, p2pEntrou: 990, circulante: 4890 }).mintP2P, 10, 'o mint de 10 PC-T sumiu da conta');
    ok(problemasDoGateC({ ...r, orfas: { orfa: 1 } }).some(x => /divergência/.test(x)), 'o gate passou com divergência aberta');
    ok(problemasDoGateC({ ...r, mintP2P: 7 }).some(x => /mint/.test(x)), 'o gate passou com mint');
    /* a regra da camada 0 é a mesma da reconciliação do servidor — cópia que diverge é o furo que ninguém vê */
    igual(`${[...SO_RESERVA].sort()}|${[...RESERVAS].sort()}`, `${[...SO_RESERVA_SRV].sort()}|${[...RESERVAS_SRV].sort()}`, 'as listas de reserva divergem');
  });

  s.teste('a bandeira desligada não prende o escrow: cancelar e vencer devolvem', () => {
    const k = piloto();
    const a = anunciar(k.db, { userId: k.A, pack: PACK, ativo: { criaturaId: k.cr(k.A) }, preco: 1000, agora: AGORA });
    const b = anunciar(k.db, { userId: k.B, pack: PACK, ativo: { criaturaId: k.cr(k.B) }, preco: 1000, agora: AGORA });
    const c0 = painelE14(k.db, { agora: AGORA }).circulante;
    /* a troca TRAVADA prende o PC-T (as duas pontas prontas): o total não muda */
    const t = criarTroca(k.db, { ...ctx(k.C), contraparteId: k.D, ativos: { moeda: 500 } });
    ofertar(k.db, { trocaId: t.id, ...ctx(k.D), ativos: { criaturas: [k.cr(k.D)] } });
    pronto(k.db, { trocaId: t.id, ...ctx(k.C), revisao: 2 }); pronto(k.db, { trocaId: t.id, ...ctx(k.D), revisao: 2 });
    igual(saldos(k.db, k.C).reservado_transferivel, 505, 'a troca travada não prendeu o PC-T');
    const c1 = painelE14(k.db, { agora: AGORA });
    ok(c1.circulante === c0 && c1.problemas.length === 0, `o PC-T reservado sumiu do circulante: ${c0} → ${c1.circulante}`);
    k.db.exec('PRAGMA foreign_keys = OFF');
    k.db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES ('player_market_enabled', 0, ?, 'teste')`).run(AGORA);
    k.db.exec('PRAGMA foreign_keys = ON');
    ok(!!(() => { try { anunciar(k.db, { userId: k.C, pack: PACK, ativo: { criaturaId: k.cr(k.C) }, preco: 1000, agora: AGORA }); } catch (e) { return e; } })(), 'a bandeira desligada deixou anunciar');
    cancelarAnuncio(k.db, { userId: k.A, anuncioId: a.id, agora: AGORA + 1 });
    passoEconomia(k.db, { agora: AGORA + DURACAO_ANUNCIO_MS + 1 });
    igual(`${holdsAtivos(k.db, { tipo: 'market', id: a.id }).length}|${holdsAtivos(k.db, { tipo: 'market', id: b.id }).length}`, '0|0', 'a reserva ficou presa com a bandeira desligada');
    igual(painelE14(k.db, { agora: AGORA }).problemas.join(), '', 'o desligamento deixou a economia aberta');
  });

  s.teste('o crash não duplica: repetir a compra devolve o recibo e não cobra de novo', () => {
    const k = piloto(); rodarPiloto(k);
    const antes = JSON.stringify(painelE14(k.db, { agora: AGORA + 5000 }));
    const a = anunciar(k.db, { userId: k.D, pack: PACK, ativo: { criaturaId: k.cr(k.D) }, preco: 700, agora: AGORA });
    const args = { userId: k.E, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-crash-01', agora: AGORA + 1000 };
    const r1 = comprar(k.db, args), r2 = comprar(k.db, args);
    igual(JSON.stringify({ ...r2, repetido: undefined }), JSON.stringify(r1), 'o retry devolveu outro recibo');
    ok(r2.repetido === true, 'o retry não disse que era o mesmo');
    const p = painelE14(k.db, { agora: AGORA + 5000 });
    igual(`${p.queima.total - JSON.parse(antes).queima.total}|${p.mintP2P}|${p.problemas.length}`, `${a.taxaAnuncio + a.taxaVenda}|0|0`, 'o retry cobrou ou criou');
    conciliarEconomia(k.db, { agora: AGORA + 6000 });
    igual(Object.keys(painelE14(k.db, { agora: AGORA }).orfas).length, 0, 'a conciliação abriu divergência');
  });

  s.teste('o simulador: mesma semente, mesmo relatório; os quatro cenários conservam', () => {
    for (const c of Object.keys(CENARIOS)) {
      const r = simularE14(c, { semente: 7 });
      igual(JSON.stringify(simularE14(c, { semente: 7 })), JSON.stringify(r), `${c} não é determinístico`);
      igual(`${r.furoDeConservacao}|${r.mintP2P}`, '0|0', `${c} furou`);
      igual(r.shiny.estoque, r.shiny.nascidos, `${c}: shiny sumiu ou nasceu do nada`);
      igual(r.mestra.emitidas - r.mestra.usadas, r.mestra.estoque, `${c}: a bola garantida não fecha`);
      ok(r.queima === r.taxas.anuncio + r.taxas.venda && (r.mercado.vendas === 0 || r.taxas.venda > 0), `${c}: a taxa cobrada não queimou: ${JSON.stringify(r.taxas)} ≠ ${r.queima}`);
    }
    ok(JSON.stringify(simularE14('equilibrio', { semente: 8 })) !== JSON.stringify(simularE14('equilibrio', { semente: 7 })), 'a semente não muda nada');
    const sem = simularE14('abuso_contas_novas', { semente: 7 }), cong = simularE14('abuso_contas_novas', { semente: 7, congelaAoDetectar: true });
    ok(cong.funil.volume < sem.funil.volume / 2, `congelar não derrubou o funil: ${sem.funil.volume} → ${cong.funil.volume}`);
    ok(simularE14('alta_concentracao', { semente: 7 }).concentracao.top10 > simularE14('equilibrio', { semente: 7 }).concentracao.top10, 'o especulador não concentrou');
  });

  s.teste('pela porta: só o operador lê a economia E14, e ela vem do ledger', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => AGORA });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, ...extra });
    try {
      const { definirCredencial, entrarOperador, segredoTotp, codigoTotp } = await import('../server/admin-auth.mjs');
      const op = criarOperador(srv.db, { email: 'leitura@x.test', papel: 'leitura', agora: AGORA });
      const seg = segredoTotp(), senha = 'senha-de-operador-bem-longa-1';
      definirCredencial(srv.db, { operadorId: op.id, senha, segredoTotp: seg, agora: AGORA });
      const token = entrarOperador(srv.db, { email: op.email, senha, codigo: codigoTotp(seg, AGORA), agora: AGORA }).token;
      igual((await fetch(url('/api/admin/economia-e14'), { headers: Hd() })).status, 401, 'sem operador leu');
      const r = await fetch(url('/api/admin/economia-e14'), { headers: Hd({ authorization: `Bearer ${token}` }) });
      igual(r.status, 200, 'o operador de leitura não leu');
      const c = await r.json();
      ok(c.mintP2P === 0 && c.furoDeConservacao === 0 && Array.isArray(c.problemas), `o corpo: ${JSON.stringify(c).slice(0, 200)}`);
      igual(JSON.stringify(c.queima), JSON.stringify(painelE14(srv.db, { agora: AGORA }).queima), 'a porta não devolve o painel');
    } finally { await srv.fechar(); }
  });

  return s;
}
