/* Q1/Q2/Q6/Q8 · E14 · A BUSCA DO MARKET (ST-14.10 · spec E14 §10.2)
 *
 *   filtros E, e cada um com faixa; normal e shiny separados; `exemplar`
 *   não é shiny; o 25 de outro pack não aparece
 *   vendido e vencido nunca aparecem como disponíveis
 *   a ordem é de lista fechada — nada do pedido vira SQL
 *   o cursor não repete nem pula num conjunto estável, e não serve de uma
 *   ordem na outra
 *   a resposta não leva dado privado
 *   10 mil anúncios: a consulta usa o índice
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { normalizarBusca, codificarCursor, categoriaDoItem, ERRO_BUSCA, LIMITE_MAX } from '../engine/busca-mercado.mjs';
import { buscarAnuncios, montarBusca } from '../server/mercado-jogadores-busca.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar } from '../server/carteira.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { anunciar } from '../server/mercado-jogadores.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const q = o => new URLSearchParams(o);

let seq = 0;
function anuncio(db, vendedor, x) {
  const id = x.id ?? `an-${String(++seq).padStart(6, '0')}`;
  const criatura = x.dex != null;
  const snap = criatura ? { dex: x.dex, nivel: x.nivel ?? 5, natureza: x.natureza ?? 'Hardy', shiny: !!x.shiny, potencial: x.potencial ?? 50, exemplar: !!x.exemplar } : { itemId: x.item };
  db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, item_id, quantidade, preco, estado, shiny, snapshot_json,
                politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em, nivel, natureza, potencial, categoria, comprador_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'v', 'h', 1, 1, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, vendedor, x.pack ?? PACK.id, criatura ? 'criatura' : 'item', criatura ? `cr-${id}` : null, x.dex ?? null, criatura ? null : x.item,
         criatura ? 1 : (x.qtd ?? 1), x.preco, x.estado ?? 'ACTIVE', x.shiny ? 1 : 0, JSON.stringify(snap), x.criado ?? AGORA - (++seq) * 1000,
         x.expira ?? AGORA + 3_600_000, criatura ? snap.nivel : null, criatura ? snap.natureza : null, criatura ? snap.potencial : null,
         criatura ? 'criaturas' : categoriaDoItem(PACK, x.item), x.estado === 'SOLD' ? vendedor : null);
  return id;
}
function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const v = cadastrar(db, { username: 'Vitrine', email: 'v@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const ids = {
    pikaShiny: anuncio(db, v, { dex: 25, shiny: true, nivel: 18, natureza: 'Timid', preco: 500 }),
    pikaBarato: anuncio(db, v, { dex: 25, nivel: 10, natureza: 'Timid', preco: 300 }),
    pikaForte: anuncio(db, v, { dex: 25, nivel: 20, natureza: 'Brave', preco: 800, potencial: 90 }),
    pikaExemplar: anuncio(db, v, { dex: 25, nivel: 12, natureza: 'Calm', preco: 650, exemplar: true }),
    eevee: anuncio(db, v, { dex: 133, nivel: 5, preco: 400 }),
    bolas: anuncio(db, v, { item: 'poke', qtd: 3, preco: 150 }),
    essencia: anuncio(db, v, { item: PACK.material.id, qtd: 2, preco: 200 }),
    outroPack: anuncio(db, v, { dex: 25, nivel: 10, preco: 100, pack: 'outro-pack' }),
    vendido: anuncio(db, v, { dex: 25, nivel: 10, preco: 120, estado: 'SOLD' }),
    vencido: anuncio(db, v, { dex: 25, nivel: 10, preco: 130, expira: AGORA }),
    /* três do MESMO preço e do mesmo instante: o desempate pelo id é o que
       impede a virada da página de comer um deles */
    empate1: anuncio(db, v, { dex: 7, preco: 500, criado: AGORA - 5000 }),
    empate2: anuncio(db, v, { dex: 7, preco: 500, criado: AGORA - 5000 }),
    empate3: anuncio(db, v, { dex: 7, preco: 500, criado: AGORA - 5000 }),
  };
  return { db, v, ids };
}
const busca = (k, o) => buscarAnuncios(k.db, { pack: PACK, agora: AGORA, busca: normalizarBusca(q(o)) });
const idsDe = r => r.anuncios.map(a => a.id).sort().join();

export async function suite() {
  const s = criarSuite('e14-busca');

  s.teste('a camada 0: o pedido vira busca, e o que não é da lista é recusado', () => {
    const b = normalizarBusca(q({}));
    igual(`${b.ordem}|${b.limite}|${b.shiny}|${b.cursor}`, 'recente|20|null|null', 'os padrões');
    for (const [o, msg] of [[{ ordem: 'preco; DROP TABLE users' }, 'a ordem livre'], [{ ordem: 'id' }, 'a ordem por coluna arbitrária'],
                            [{ categoria: 'tudo' }, 'a categoria inventada'], [{ shiny: 'talvez' }, 'o shiny ambíguo'], [{ dex: '25 OR 1=1' }, 'a espécie com SQL'],
                            [{ limite: String(LIMITE_MAX + 1) }, 'o limite acima do máximo'], [{ natureza: "Timid' --" }, 'a natureza com aspas'],
                            [{ cursor: 'lixo' }, 'o cursor inválido'], [{ ordem: 'recente', cursor: codificarCursor('preco', 100, 'x') }, 'o cursor de outra ordem']])
      igual(recusa(() => normalizarBusca(q(o)))?.codigo, ERRO_BUSCA, `${msg} passou`);
    igual(`${categoriaDoItem(PACK, 'poke')}|${categoriaDoItem(PACK, PACK.material.id)}|${categoriaDoItem(PACK, 'est:fogo')}|${categoriaDoItem(PACK, 'fogo')}`,
          'bolas|essencias|materiais|itens', 'as categorias do pack');
    /* o pedido nunca entra no texto do SQL — só em `?` */
    const m = montarBusca({ pack: PACK, agora: AGORA, busca: normalizarBusca(q({ natureza: 'Timid', dex: '25', ordem: 'preco' })) });
    ok(!/Timid|25/.test(m.sql) && m.args.includes('Timid') && m.args.includes(25), `o valor entrou no SQL: ${m.sql}`);
  });

  s.teste('os filtros são E; o pack, o vendido e o vencido ficam de fora', () => {
    const k = cena();
    igual(idsDe(busca(k, { dex: '25' })), [k.ids.pikaShiny, k.ids.pikaBarato, k.ids.pikaForte, k.ids.pikaExemplar].sort().join(), 'a espécie (com outro pack, vendido e vencido de fora)');
    igual(idsDe(busca(k, { dex: '25', nivelMin: '15' })), [k.ids.pikaShiny, k.ids.pikaForte].sort().join(), 'espécie E nível');
    igual(idsDe(busca(k, { natureza: 'Timid', precoMax: '400' })), k.ids.pikaBarato, 'natureza E preço');
    igual(idsDe(busca(k, { dex: '25', potencialMin: '80' })), k.ids.pikaForte, 'o potencial mínimo');
    igual(idsDe(busca(k, { categoria: 'bolas' })), k.ids.bolas, 'a categoria das bolas');
    igual(idsDe(busca(k, { categoria: 'essencias' })), k.ids.essencia, 'a categoria das essências');
    igual(idsDe(busca(k, { item: 'poke' })), k.ids.bolas, 'o item');
  });

  s.teste('normal e shiny separados — e o exemplar não é shiny', () => {
    const k = cena();
    igual(idsDe(busca(k, { dex: '25', shiny: 'sim' })), k.ids.pikaShiny, 'o shiny');
    const normais = busca(k, { dex: '25', shiny: 'nao' });
    ok(normais.anuncios.some(a => a.id === k.ids.pikaExemplar) && !normais.anuncios.some(a => a.id === k.ids.pikaShiny), 'o exemplar virou shiny, ou o shiny ficou entre os normais');
  });

  s.teste('o cursor: as páginas cobrem tudo, uma vez, na ordem — nas três ordens', () => {
    const k = cena();
    for (const ordem of ['preco', 'preco_desc', 'recente']) {
      const vistos = []; let cursor = null, paginas = 0;
      do {
        const r = busca(k, { ordem, limite: '2', ...(cursor ? { cursor } : {}) });
        vistos.push(...r.anuncios); cursor = r.proximo; paginas++;
      } while (cursor && paginas < 20);
      const todos = busca(k, { ordem, limite: '50' }).anuncios;
      igual(vistos.map(a => a.id).join(), todos.map(a => a.id).join(), `${ordem}: a paginação não é a lista inteira na ordem`);
      igual(new Set(vistos.map(a => a.id)).size, vistos.length, `${ordem}: a paginação repetiu`);
      igual(busca(k, { ordem, limite: '50' }).proximo, null, `${ordem}: a lista inteira promete outra página`);
      for (const limite of ['1', '3']) {
        const ids = []; let c = null, n = 0;
        do { const r = busca(k, { ordem, limite, ...(c ? { cursor: c } : {}) }); ids.push(...r.anuncios.map(a => a.id)); c = r.proximo; n++; } while (c && n < 40);
        igual(ids.join(), todos.map(a => a.id).join(), `${ordem}: páginas de ${limite} perderam um empate`);
      }
      const chave = ordem === 'recente' ? 'criadoEm' : 'preco';
      ok(vistos.every((a, i) => i === 0 || (ordem === 'preco' ? vistos[i - 1][chave] <= a[chave] : vistos[i - 1][chave] >= a[chave])), `${ordem}: fora de ordem`);
    }
  });

  s.teste('a resposta não leva dado privado', () => {
    const k = cena();
    const texto = JSON.stringify(busca(k, { limite: '50' }));
    ok(!texto.includes(k.v) && !/vendedor_id|criatura_id|comprador_id|compra_chave|taxa_venda|taxaVenda/.test(texto), 'a busca vazou dado privado');
    ok(/"vendedor":"Vitrine"/.test(texto), 'a busca sem o nome de quem vende');
  });

  s.teste('10 mil anúncios: a busca usa o índice, nas duas ordens', () => {
    const k = cena();
    k.db.exec('BEGIN');
    for (let i = 0; i < 10_000; i++) anuncio(k.db, k.v, { dex: 1 + (i % 150), shiny: i % 97 === 0, nivel: 1 + (i % 60), preco: 100 + (i * 37) % 9000 });
    k.db.exec('COMMIT');
    const plano = o => {
      const m = montarBusca({ pack: PACK, agora: AGORA, busca: normalizarBusca(q(o)) });
      return k.db.prepare(`EXPLAIN QUERY PLAN ${m.sql}`).all(...m.args).map(l => l.detail).join(' | ');
    };
    ok(/player_market_busca/.test(plano({ categoria: 'criaturas', dex: '25', shiny: 'nao', ordem: 'preco' })), `a busca por espécie não usa o índice: ${plano({ categoria: 'criaturas', dex: '25', shiny: 'nao', ordem: 'preco' })}`);
    ok(/player_market_recentes|player_market_busca|player_market_ativos/.test(plano({ ordem: 'recente' })), `a vitrine recente varre a tabela: ${plano({ ordem: 'recente' })}`);
    const t0 = performance.now();
    const r = busca(k, { categoria: 'criaturas', dex: '25', shiny: 'nao', ordem: 'preco', limite: '50' });
    const ms = performance.now() - t0;
    ok(r.anuncios.length === 50 && r.proximo, 'a busca grande sem página seguinte');
    ok(ms < 500, `a busca em 10 mil levou ${ms.toFixed(0)} ms`);
  });

  s.teste('o anúncio de verdade entra na busca: categoria, nível, natureza e potencial', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    db.exec('PRAGMA foreign_keys = OFF');
    for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
      db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, 1, ?, 'teste')`).run(n, AGORA);
    db.exec('PRAGMA foreign_keys = ON');
    const v = cadastrar(db, { username: 'Real', email: 'r@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    creditar(db, { userId: v, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 100, idem: 'pc-r', agora: AGORA });
    creditarBolsa(db, v, PACK.material.id, 4, { fonte: 'x', agora: AGORA });
    const cr = gerar(db, { userId: v, pack: PACK, dex: 25 });
    const a = anunciar(db, { userId: v, pack: PACK, ativo: { criaturaId: cr.id }, preco: 300, agora: AGORA, checkpoint: 'DEC-99' });
    const e = anunciar(db, { userId: v, pack: PACK, ativo: { itemId: PACK.material.id, quantidade: 2 }, preco: 200, agora: AGORA, checkpoint: 'DEC-99' });
    const k = { db };
    igual(idsDe(busca(k, { categoria: 'criaturas', natureza: a.retrato.natureza, nivelMin: '1', potencialMin: String(a.retrato.potencial) })), a.id, 'a criatura anunciada não é achada pelo que o retrato diz');
    igual(idsDe(busca(k, { categoria: 'essencias' })), e.id, 'a essência anunciada não está na categoria');
  });

  s.teste('a migração preenche do retrato e não inventa', () => {
    const db = abrirBanco(':memory:');
    const i = MIGRACOES.findIndex(m => m.nome === 'busca-st14.10');
    migrar(db, i);
    const v = cadastrar(db, { username: 'Antiga', email: 'a@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, quantidade, preco, estado, snapshot_json, politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em)
                VALUES ('velho-c', ?, ?, 'criatura', 'c', 25, 1, 500, 'ACTIVE', ?, 'v', 'h', 1, 1, 1, 2)`).run(v, PACK.id, JSON.stringify({ dex: 25, nivel: 14, natureza: 'Bold', potencial: 61 }));
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, criatura_id, dex, quantidade, preco, estado, snapshot_json, politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em)
                VALUES ('velho-sem', ?, ?, 'criatura', 'c2', 25, 1, 500, 'ACTIVE', ?, 'v', 'h', 1, 1, 1, 2)`).run(v, PACK.id, JSON.stringify({ dex: 25 }));
    db.prepare(`INSERT INTO player_market_listings (id, vendedor_id, pack_id, tipo, item_id, quantidade, preco, estado, snapshot_json, politica_versao, politica_hash, taxa_anuncio, taxa_venda, criado_em, expira_em)
                VALUES ('velho-i', ?, ?, 'item', 'poke', 2, 500, 'ACTIVE', '{}', 'v', 'h', 1, 1, 1, 2)`).run(v, PACK.id);
    migrar(db);
    const l = id => db.prepare(`SELECT nivel, natureza, potencial, categoria FROM player_market_listings WHERE id = ?`).get(id);
    igual(JSON.stringify(l('velho-c')), JSON.stringify({ nivel: 14, natureza: 'Bold', potencial: 61, categoria: 'criaturas' }), 'o retrato não preencheu a busca');
    igual(JSON.stringify(l('velho-sem')), JSON.stringify({ nivel: null, natureza: null, potencial: null, categoria: 'criaturas' }), 'a migração inventou o que o retrato não tinha');
    igual(l('velho-i').categoria, null, 'a migração inventou a categoria do item');
    MIGRACOES[i].desce(db);
    ok(!db.prepare(`SELECT 1 FROM pragma_table_info('player_market_listings') WHERE name = 'categoria'`).get(), 'a descida deixou a coluna');
  });

  s.teste('pela porta: a busca responde, e o pedido torto é 400', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => AGORA });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const r = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(), body: JSON.stringify({ username: 'Busca0', email: 'b0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
      const v = srv.db.prepare(`SELECT id FROM users WHERE username = 'Busca0'`).get().id;
      anuncio(srv.db, v, { dex: 25, preco: 300 }); anuncio(srv.db, v, { dex: 133, preco: 200 });
      const a = { authorization: `Bearer ${r.sessao}` };
      const ok1 = await (await fetch(url('/api/player-market/busca?dex=25&ordem=preco'), { headers: Hd(a) })).json();
      igual(ok1.anuncios.length, 1, 'a busca pela porta');
      igual((await fetch(url('/api/player-market/busca?ordem=preco%3B%20DROP'), { headers: Hd(a) })).status, 400, 'a ordem torta pela porta');
      igual((await fetch(url('/api/player-market/busca?cursor=xx'), { headers: Hd(a) })).status, 400, 'o cursor torto pela porta');
    } finally { await srv.fechar(); }
  });

  s.teste('busca competitiva filtra tipo e IV de atributo, sem confundir potencial total',()=>{
    const c=cena();
    c.db.prepare("UPDATE player_market_listings SET snapshot_json=json_set(snapshot_json,'$.iv',json(?)) WHERE id=?").run(JSON.stringify([31,0,0,0,0,0]),c.ids.pikaBarato);
    c.db.prepare("UPDATE player_market_listings SET snapshot_json=json_set(snapshot_json,'$.iv',json(?)) WHERE id=?").run(JSON.stringify([0,0,0,0,0,31]),c.ids.pikaForte);
    igual(idsDe(busca(c,{tipo:'electric',ivStat:'vel',ivMin:25})),c.ids.pikaForte);
    igual(idsDe(busca(c,{tipo:'electric',ivStat:'hp',ivMin:25})),c.ids.pikaBarato);
    igual(idsDe(busca(c,{tipo:'water',ivStat:'vel',ivMin:25})), '');c.db.close();
  });
  s.teste('IV tem faixa zero a 31 e atributo fechado; filtros continuam parâmetros SQL',()=>{
    for(const q of [{ivMin:32,ivStat:'hp'},{ivMin:5,ivStat:'injetado'},{ivMin:5},{ivStat:'hp',ivMin:-1}])ok(recusa(()=>normalizarBusca(q)), 'IV inválido passou');
    const c=cena();const r=montarBusca({pack:PACK,agora:AGORA,busca:normalizarBusca({tipo:'electric',ivStat:'vel',ivMin:20})});
    ok(r.sql.includes('json_extract'));ok(r.args.includes(20));c.db.close();
  });
  return s;
}
