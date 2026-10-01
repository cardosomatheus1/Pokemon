/* Q1/Q3/Q9 · E14 · O HISTÓRICO DE PREÇOS SEM FABRICAR REFERÊNCIA (ST-14.12 · spec E14 §12)
 *
 *   agregado só com ≥ 10 vendas e ≥ 5 compradores e vendedores distintos
 *   normal e shiny nunca se juntam; faixas de potencial separadas
 *   a permuta não inventa preço; a venda cancelada não existe
 *   a suspeita e a ligação descoberta tiram a venda da referência — e a
 *   revisão a devolve; o bruto não muda
 *   volume em PC-T e em unidades são números diferentes; a janela é UTC
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { criarOperador, ERRO_ADMIN } from '../server/admin.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { resumoDaSerie, mediana, faixaDoPotencial, amostraSuficiente, DIA_MS } from '../engine/historico-precos.mjs';
import { historicoDaSerie, serieDoPedido, excluirVendaDaReferencia, ERRO_HISTORICO } from '../server/mercado-jogadores-historico.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const vend = Array.from({ length: 6 }, (_, i) => conta(`Vend${i}`)), comp = Array.from({ length: 6 }, (_, i) => conta(`Comp${i}`));
  let seq = 0;
  const vende = ({ dex = 25, item = null, shiny = false, potencial = 50, preco, qtd = 1, v = vend[0], c = comp[0], em = AGORA - 3600_000, estado = 'SOLD' }) => {
    const id = `l-${++seq}`;
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, item_id, quantidade, preco, estado, shiny, snapshot_json,
                  politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em, potencial, categoria, comprador_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 'v', 'h', 1, 1, ?, ?, ?, ?, ?)`)
      .run(id, v, PACK.id, item ? 'item' : 'criatura', item ? null : `c-${id}`, item ? null : dex, item, qtd, preco, estado, shiny ? 1 : 0,
           em - 1000, em + DIA_MS, item ? null : potencial, item ? 'bolas' : 'criaturas', estado === 'SOLD' ? c : null);
    if (estado !== 'SOLD') return id;
    db.prepare(`INSERT INTO player_market_fills (listing_id, pack_id, tipo, dex, item_id, shiny, quantidade, preco, taxa_venda, liquido, vendedor_id, comprador_id, em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?)`).run(id, PACK.id, item ? 'item' : 'criatura', item ? null : dex, item, shiny ? 1 : 0, qtd, preco, preco - 2, v, c, em);
    return db.prepare(`SELECT id FROM player_market_fills WHERE listing_id = ?`).get(id).id;
  };
  /* dez vendas de Pikachu normal, potencial 50, entre 5 compradores e 5 vendedores */
  const fills = Array.from({ length: 10 }, (_, i) => vende({ preco: 100 + i * 10, v: vend[i % 5], c: comp[i % 5], em: AGORA - (i + 1) * 3600_000 }));
  return { db, vend, comp, vende, fills, conta };
}
const serie = o => serieDoPedido(new URLSearchParams(o));
const hist = (k, o, agora = AGORA) => historicoDaSerie(k.db, { pack: PACK, serie: serie(o), agora });

export async function suite() {
  const s = criarSuite('e14-historico');

  s.teste('a camada 0: mediana, faixa e amostra', () => {
    igual(`${mediana([5, 1, 3])}|${mediana([4, 1, 3, 2])}|${mediana([])}`, '3|2.5|null', 'a mediana');
    igual(`${faixaDoPotencial(0)}|${faixaDoPotencial(39)}|${faixaDoPotencial(40)}|${faixaDoPotencial(100)}|${faixaDoPotencial(101)}`, '0|0|1|3|null', 'as faixas');
    const v = (c, s) => ({ comprador: c, vendedor: s, preco: 1, quantidade: 1, em: 0 });
    ok(!amostraSuficiente(Array.from({ length: 9 }, (_, i) => v(i, i))), 'nove vendas bastaram');
    ok(!amostraSuficiente(Array.from({ length: 12 }, (_, i) => v(i % 4, i))), 'quatro compradores bastaram');
    ok(!amostraSuficiente(Array.from({ length: 12 }, (_, i) => v(i, i % 4))), 'quatro vendedores bastaram');
    ok(amostraSuficiente(Array.from({ length: 10 }, (_, i) => v(i % 5, i % 5))), 'dez vendas de cinco e cinco não bastaram');
  });

  s.teste('com amostra: mediana, média e volume de 7 dias, e a janela UTC escrita', () => {
    const k = cena();
    const h = hist(k, { dex: '25', shiny: 'nao', faixa: '1' });
    igual(`${h.suficiente}|${h.n7d}|${h.mediana7d}|${h.media7d}`, 'true|10|145|145', 'os agregados');
    igual(`${h.volume7d.pct}|${h.volume7d.unidades}|${h.janela.fuso}`, '1450|10|UTC', 'o volume e a janela');
    igual(h.ultimaVenda.precoUnitario, 100, 'a última venda');
    ok(/vendas liquidadas do Market/.test(h.janela.metodo), 'o método não está escrito');
  });

  s.teste('sem amostra: N e a última venda, e o motivo — nenhum agregado', () => {
    const k = cena();
    /* uma das dez sai da janela de 7 dias: nove */
    const h = hist(k, { dex: '25', shiny: 'nao', faixa: '1' }, AGORA + 7 * DIA_MS - 9.5 * 3600_000);
    igual(`${h.suficiente}|${h.mediana7d}|${h.media7d}|${h.volume7d}|${h.volume24h}`, 'false|null|null|null|null', 'agregado sem amostra');
    ok(/amostra insuficiente: 9 venda/.test(h.motivo), `o motivo: ${h.motivo}`);
    ok(h.ultimaVenda, 'a última venda sumiu sem amostra');
    /* um par só, dez vendas: não é mercado */
    const d = cena();
    for (let i = 0; i < 10; i++) d.vende({ dex: 133, preco: 1000, v: d.vend[5], c: d.comp[5] });
    ok(!hist(d, { dex: '133', shiny: 'nao', faixa: '1' }).suficiente, 'dez vendas de um par só viraram referência');
  });

  s.teste('normal e shiny não se misturam; as faixas de potencial também não', () => {
    const k = cena();
    for (let i = 0; i < 3; i++) k.vende({ shiny: true, preco: 9000, v: k.vend[i], c: k.comp[i] });
    k.vende({ potencial: 95, preco: 5000 });
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).n7d, 10, 'o shiny ou o potencial alto entraram no normal');
    const sh = hist(k, { dex: '25', shiny: 'sim', faixa: '1' });
    igual(`${sh.n7d}|${sh.suficiente}`, '3|false', 'o shiny fechou amostra com os normais');
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '3' }).n7d, 1, 'a faixa alta');
    for (const o of [{ dex: '25', faixa: '1' }, { dex: '25', shiny: 'nao' }, { dex: '25', shiny: 'nao', faixa: '9' }])
      igual(recusa(() => serie(o))?.codigo, ERRO_HISTORICO.SERIE, `a série sem shiny ou faixa: ${JSON.stringify(o)}`);
  });

  s.teste('o lote: preço por unidade; volume em PC-T e em unidades', () => {
    const k = cena();
    for (let i = 0; i < 10; i++) k.vende({ item: 'poke', qtd: 3, preco: 300, v: k.vend[i % 5], c: k.comp[i % 5] });
    const h = hist(k, { item: 'poke' });
    igual(`${h.mediana7d}|${h.volume7d.pct}|${h.volume7d.unidades}`, '100|3000|30', 'o preço por unidade ou o volume');
  });

  s.teste('a venda cancelada não existe; a troca direta não vira preço', () => {
    const k = cena();
    k.vende({ preco: 1, estado: 'CANCELLED' });
    k.db.prepare(`INSERT INTO criaturas_transferencias (criatura_id, de_user, para_user, ref_tipo, ref_id, em) VALUES ('c', ?, ?, 'troca', 't', ?)`).run(k.vend[0], k.comp[0], AGORA - 1000);
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).n7d, 10, 'a cancelada ou a troca entraram');
  });

  s.teste('a suspeita e a ligação tiram a venda da referência; a revisão devolve; o bruto não muda', () => {
    const k = cena();
    k.db.prepare(`INSERT INTO suspeitas_antifraude (conta_a, conta_b, sinal, medida_json, criada_em) VALUES (?, '', 'captura', '{}', ?)`).run(k.vend[0], AGORA);
    const com = hist(k, { dex: '25', shiny: 'nao', faixa: '1' });
    igual(`${com.n7d}|${com.suficiente}`, '8|false', 'as vendas da conta suspeita entraram');
    k.db.prepare(`UPDATE suspeitas_antifraude SET revisada_em = ? WHERE conta_a = ?`).run(AGORA, k.vend[0]);
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).n7d, 10, 'a revisão não devolveu as vendas');
    ligarContas(k.db, { userId: k.vend[1], outroId: k.comp[1], sinal: 'dispositivo', agora: AGORA });
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).n7d, 8, 'a venda entre contas ligadas ficou na referência');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM player_market_fills`).get().n, 10, 'o bruto mudou');
  });

  s.teste('anular uma venda: o papel economia, com motivo — e o bruto fica', () => {
    const k = cena();
    const eco = criarOperador(k.db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
    const sup = criarOperador(k.db, { email: 'sup@x.test', papel: 'suporte', agora: AGORA }).id;
    igual(recusa(() => excluirVendaDaReferencia(k.db, { operadorId: sup, fillId: k.fills[0], motivo: 'x', confirmado: true, agora: AGORA }))?.codigo, ERRO_ADMIN.SEM_PAPEL, 'o suporte anulou');
    excluirVendaDaReferencia(k.db, { operadorId: eco, fillId: k.fills[0], motivo: 'venda de teste', confirmado: true, agora: AGORA });
    igual(recusa(() => excluirVendaDaReferencia(k.db, { operadorId: eco, fillId: k.fills[0], motivo: 'x', confirmado: true, agora: AGORA }))?.codigo, ERRO_HISTORICO.JA, 'anulou duas vezes');
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).n7d, 9, 'a anulada ficou na referência');
    igual(k.db.prepare(`SELECT COUNT(*) n FROM player_market_fills`).get().n, 10, 'anular apagou a venda');
  });

  s.teste('o menor anúncio é o ativo e da série', () => {
    const k = cena();
    k.vende({ preco: 70, estado: 'ACTIVE' }); k.vende({ preco: 50, estado: 'ACTIVE', shiny: true }); k.vende({ preco: 40, estado: 'CANCELLED' });
    igual(hist(k, { dex: '25', shiny: 'nao', faixa: '1' }).menorAnuncio, 70, 'o menor anúncio');
  });

  s.teste('pela porta, e a migração', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => AGORA });
    const porta = await srv.ouvir(0);
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const r = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: Hd(), body: JSON.stringify({ username: 'Hist0', email: 'h0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
      const a = { authorization: `Bearer ${r.sessao}` };
      const h = await (await fetch(`http://127.0.0.1:${porta}/api/player-market/historico?dex=25&shiny=nao&faixa=1`, { headers: Hd(a) })).json();
      igual(`${h.n7d}|${h.suficiente}`, '0|false', 'o histórico vazio pela porta');
      igual((await fetch(`http://127.0.0.1:${porta}/api/player-market/historico?dex=25`, { headers: Hd(a) })).status, 400, 'a série misturada pela porta');
    } finally { await srv.fechar(); }
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'historico-st14.12');
    const tem = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'player_market_fills_exclusoes'`).get().n;
    m.desce(db); igual(tem(), 0, 'a descida deixou restos');
    m.sobe(db); igual(tem(), 1, 'a subida não refez');
  });

  return s;
}
