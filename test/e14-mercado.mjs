/* Q1/Q3/Q6/Q8/Q9 · E14 · O MARKET DE PREÇO FIXO (ST-14.9 · spec E14 §10.1)
 *
 * O aceite da ficha, frase a frase:
 *
 *   o comprador paga o preço anunciado; o vendedor recebe o líquido; as
 *   duas taxas queimam
 *   anúncio alterado ou esgotado recusa; comprar o próprio, também
 *   cancelar não devolve a taxa; erro na criação não cobra taxa
 *   a disponibilidade não depende do varredor
 *   o comprador sem PC-T é recusado antes de qualquer cobrança
 *   dois compradores: uma venda, nunca dois débitos; e o crash não deixa
 *   nada pela metade
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { creditarBolsa, quantosNaBolsa } from '../server/idle.mjs';
import { lotesDe } from '../server/inventario.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { criarOperador } from '../server/admin.mjs';
import { congelar } from '../server/risco-mercado-jogadores.mjs';
import { holdsAtivos } from '../server/reservas.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { divergenciasDaEconomia } from '../server/conciliacao-economia.mjs';
import { passoEconomia } from '../server/economia-worker.mjs';
import { anunciar, comprar, cancelarAnuncio, detalheDoAnuncio, vitrine, meusAnuncios, minhasCompras, expirarAnuncioDaOferta,
         ERRO_MERCADO_P2P, DURACAO_ANUNCIO_MS } from '../server/mercado-jogadores.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const CHECKPOINT = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const ligar = (db, valor = 1) => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, ?, ?, 'teste')
                ON CONFLICT (nome) DO UPDATE SET ligada = excluded.ligada`).run(n, valor, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
};
function cena(arquivo = ':memory:') {
  const db = abrirBanco(arquivo); migrar(db); ligar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const [V, C, D] = ['Vendedora', 'Compradora', 'Outra'].map(conta);
  const k = { db, V, C, D, conta, cr: Array.from({ length: 12 }, () => gerar(db, { userId: V, pack: PACK, dex: 25 }).id) };
  creditarBolsa(db, V, 'poke', 5, { fonte: 'colheita:x', agora: AGORA });
  creditar(db, { userId: V, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 100, idem: 'pc-v', agora: AGORA });
  for (const [u, v] of [[C, 2000], [D, 2000]]) creditar(db, { userId: u, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: v, idem: `pc-${u}`, agora: AGORA });
  return k;
}
const pt = (db, u) => saldos(db, u).transferivel;
const anuncia = (k, ativo, preco, extra = {}) => anunciar(k.db, { userId: k.V, pack: PACK, ativo, preco, agora: AGORA, checkpoint: CHECKPOINT, ...extra });
const compra = (k, a, extra = {}) => comprar(k.db, { userId: k.C, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-0001', agora: AGORA + 1000, checkpoint: CHECKPOINT, ...extra });
const donoDe = (db, id) => db.prepare(`SELECT user_id FROM criaturas WHERE id = ?`).get(id)?.user_id;

export async function suite() {
  const s = criarSuite('e14-mercado');

  s.teste('a criatura: anunciar queima 5, vender cobra 20, quem compra paga 1.000 e recebe a instância', () => {
    const k = cena();
    const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
    igual(`${a.taxaAnuncio}|${a.taxaVenda}|${a.liquido}|${a.estado}`, '5|20|980|ACTIVE', 'as taxas do anúncio');
    igual(`${pt(k.db, k.V)}|${holdsAtivos(k.db, { tipo: 'market', id: a.id }).length}`, '95|1', 'a taxa de anúncio e a reserva');
    igual(a.retrato.dex, 25, 'o retrato do anúncio');
    const r = compra(k, a);
    igual(`${r.preco}|${r.taxaVenda}|${r.liquido}`, '1000|20|980', 'o recibo');
    igual(`${pt(k.db, k.C)}|${pt(k.db, k.V)}|${saldos(k.db, k.C).reservado_transferivel}`, '1000|1075|0', 'o comprador pagou o preço e o vendedor recebeu o líquido');
    const inst = k.db.prepare(`SELECT user_id, proveniencia FROM criaturas WHERE id = ?`).get(k.cr[0]);
    igual(`${inst.user_id === k.C}|${inst.proveniencia}`, 'true|p2p_verified', 'a instância não mudou de dono, ou finge ter sido capturada');
    igual(k.db.prepare(`SELECT ref_tipo FROM criaturas_transferencias WHERE criatura_id = ?`).get(k.cr[0])?.ref_tipo, 'mercado', 'o histórico de dono');
    const f = k.db.prepare(`SELECT * FROM player_market_fills`).all();
    igual(`${f.length}|${f[0].preco}|${f[0].liquido}|${f[0].dex}`, '1|1000|980|25', 'a venda no histórico');
    const taxas = k.db.prepare(`SELECT type, SUM(reserva_delta) r, SUM(amount) a FROM wallet_ledger WHERE type LIKE 'PLAYER_MARKET_%' GROUP BY type ORDER BY type`).all();
    igual(taxas.map(t => t.type).join(), 'PLAYER_MARKET_LISTING_FEE,PLAYER_MARKET_SALE_FEE', 'as duas taxas no ledger');
    igual(divergenciasDaEconomia(k.db).length, 0, `o Market deixou o escrow sem fechar: ${JSON.stringify(divergenciasDaEconomia(k.db))}`);
    igual(k.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome IN ('market_listed', 'market_sold')`).get().n, 2, 'a telemetria');
    igual(minhasCompras(k.db, { userId: k.C })[0].recibo.liquido, 980, 'minhas compras');
    ok(/append-only/.test(recusa(() => k.db.prepare(`DELETE FROM player_market_fills`).run())?.message ?? ''), 'a venda aceitou apagar');
  });

  s.teste('o lote fechado de um item: a quantidade inteira, e o lote chega marcado', () => {
    const k = cena();
    const a = anuncia(k, { itemId: 'poke', quantidade: 3 }, 300);
    compra(k, a);
    igual(`${quantosNaBolsa(k.db, k.V, 'poke')}|${quantosNaBolsa(k.db, k.C, 'poke')}`, '2|3', 'o lote não passou inteiro');
    const lote = lotesDe(k.db, k.C, 'poke')[0];
    igual(`${lote.classe}|${lote.fonte}`, `p2p_verified|mercado:${a.id}`, 'o lote comprado não diz de onde veio');
  });

  s.teste('sem saldo para a taxa, nada fica preso; erro na criação não cobra', () => {
    const k = cena();
    /* quem anuncia com 4 de PC-T: a taxa de 1.000 é 5 */
    const pobre = k.conta('SemTaxa');
    const cr = gerar(k.db, { userId: pobre, pack: PACK, dex: 25 }).id;
    creditar(k.db, { userId: pobre, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 4, idem: 'pc-pobre', agora: AGORA });
    const e = recusa(() => anunciar(k.db, { userId: pobre, pack: PACK, ativo: { criaturaId: cr }, preco: 1000, agora: AGORA, checkpoint: CHECKPOINT }));
    igual(e?.reason_code, 'INSUFFICIENT_FUNDS', 'anunciou sem a taxa');
    igual(`${k.db.prepare(`SELECT COUNT(*) n FROM asset_holds`).get().n}|${k.db.prepare(`SELECT COUNT(*) n FROM player_market_listings`).get().n}|${pt(k.db, pobre)}`, '0|0|4', 'a criação recusada deixou reserva, anúncio ou cobrança');
    ok(elegibilidadeDaCriatura(k.db, { userId: pobre, pack: PACK, id: cr, acao: 'market', agora: AGORA, checkpoint: CHECKPOINT }).allowed, 'a criatura ficou presa');
    igual(recusa(() => anuncia(k, { criaturaId: k.cr[0] }, 99))?.codigo, ERRO_MERCADO_P2P.ENTRADA, 'o anúncio abaixo do mínimo');
    igual(recusa(() => anuncia(k, {}, 500))?.codigo, ERRO_MERCADO_P2P.ENTRADA, 'o anúncio sem ativo');
  });

  s.teste('a guarda da compra: o próprio, a conta ligada, a versão, o preço, o PC-T', () => {
    const k = cena();
    const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
    igual(recusa(() => comprar(k.db, { userId: k.V, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-0002', agora: AGORA, checkpoint: CHECKPOINT }))?.reason_code, 'ACCOUNT_RESTRICTED', 'comprou o próprio anúncio');
    igual(recusa(() => compra(k, a, { preco: 900 }))?.codigo, ERRO_MERCADO_P2P.DESATUALIZADO, 'comprou por um preço que não é o do anúncio');
    igual(recusa(() => compra(k, a, { versao: 7 }))?.codigo, ERRO_MERCADO_P2P.DESATUALIZADO, 'comprou uma versão que não existe');
    ligarContas(k.db, { userId: k.V, outroId: k.D, sinal: 'dispositivo', agora: AGORA });
    igual(recusa(() => comprar(k.db, { userId: k.D, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-0003', agora: AGORA, checkpoint: CHECKPOINT }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a conta ligada comprou');
    /* a conta em revisão não compra — nem de quem está livre */
    const op = criarOperador(k.db, { email: 'eco@x.test', papel: 'economia', agora: AGORA }).id;
    const presa = k.conta('Presa');
    creditar(k.db, { userId: presa, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 2000, idem: 'pc-presa', agora: AGORA });
    congelar(k.db, { operadorId: op, userId: presa, motivo: 'revisão', confirmado: true, agora: AGORA });
    igual(recusa(() => compra(k, a, { userId: presa }))?.reason_code, 'ACCOUNT_RESTRICTED', 'a conta congelada comprou');
    const curta = k.conta('Curta');
    creditar(k.db, { userId: curta, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 999, idem: 'pc-curta', agora: AGORA });
    const pobre = recusa(() => compra(k, a, { userId: curta }));
    igual(pobre?.reason_code, 'INSUFFICIENT_FUNDS', 'comprou sem PC-T');
    igual(`${donoDe(k.db, k.cr[0]) === k.V}|${detalheDoAnuncio(k.db, { anuncioId: a.id, userId: k.C, agora: AGORA }).estado}|${pt(k.db, curta)}`, 'true|ACTIVE|999', 'a compra recusada mexeu em algo');
  });

  s.teste('cancelar devolve o ativo e NÃO a taxa; o terceiro não cancela; o cancelado não se compra', () => {
    const k = cena();
    const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
    igual(recusa(() => cancelarAnuncio(k.db, { userId: k.C, anuncioId: a.id, agora: AGORA }))?.codigo, ERRO_MERCADO_P2P.NAO, 'outra conta cancelou');
    cancelarAnuncio(k.db, { userId: k.V, anuncioId: a.id, agora: AGORA });
    igual(`${pt(k.db, k.V)}|${holdsAtivos(k.db, { tipo: 'market', id: a.id }).length}`, '95|0', 'a taxa voltou, ou o ativo ficou preso');
    igual(recusa(() => compra(k, a))?.codigo, ERRO_MERCADO_P2P.ESTADO, 'comprou o cancelado');
    igual(recusa(() => detalheDoAnuncio(k.db, { anuncioId: a.id, userId: k.C, agora: AGORA }))?.codigo, ERRO_MERCADO_P2P.NAO, 'o cancelado aparece para o público');
    igual(detalheDoAnuncio(k.db, { anuncioId: a.id, userId: k.V, agora: AGORA }).estado, 'CANCELLED', 'quem anunciou não vê o próprio cancelado');
  });

  s.teste('o prazo: a vitrine e a compra respeitam sem o varredor; o varredor devolve', () => {
    const k = cena();
    const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
    const fim = AGORA + DURACAO_ANUNCIO_MS;
    igual(vitrine(k.db, { pack: PACK, agora: fim - 1 }).length, 1, 'a vitrine perdeu o anúncio no prazo');
    igual(vitrine(k.db, { pack: PACK, agora: fim }).length, 0, 'a vitrine mostra o vencido');
    igual(recusa(() => compra(k, a, { agora: fim }))?.reason_code, 'OFFER_EXPIRED', 'comprou o vencido sem o varredor');
    passoEconomia(k.db, { agora: fim, entidades: { market: expirarAnuncioDaOferta } });
    igual(`${meusAnuncios(k.db, { userId: k.V })[0].estado}|${holdsAtivos(k.db, { tipo: 'market', id: a.id }).length}|${pt(k.db, k.V)}`, 'EXPIRED|0|95', 'o vencido não voltou, ou a taxa voltou');
  });

  s.teste('o retry devolve o recibo; outra chave ouve "já vendido"; dez anúncios e não onze', () => {
    const k = cena();
    const a = anuncia(k, { criaturaId: k.cr[0] }, 500);
    const r = compra(k, a);
    const de_novo = compra(k, a, { agora: AGORA + 5000 });
    igual(`${de_novo.repetido}|${de_novo.compradoEm}`, `true|${r.compradoEm}`, 'o retry não devolveu o recibo');
    igual(pt(k.db, k.C), 1500, 'o retry cobrou de novo');
    igual(recusa(() => compra(k, a, { chaveIdem: 'compra-9999' }))?.codigo, ERRO_MERCADO_P2P.ESTADO, 'a outra chave comprou o vendido');
    creditar(k.db, { userId: k.V, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 500, idem: 'pc-v3', agora: AGORA });
    for (let i = 1; i <= 10; i++) anuncia(k, { criaturaId: k.cr[i] }, 200);
    igual(recusa(() => anuncia(k, { criaturaId: k.cr[11] }, 200))?.reason_code, 'CAPACITY_EXCEEDED', 'o décimo primeiro anúncio');
  });

  s.teste('dois compradores e compra × cancelamento, em duas conexões: um resultado, nunca dois débitos (Q8)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mercado-'));
    try {
      const k = cena(join(dir, 'm.db'));
      const B = abrirBanco(join(dir, 'm.db')); B.exec('PRAGMA busy_timeout = 2000');
      const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
      const r1 = recusa(() => compra(k, a));
      const r2 = recusa(() => comprar(B, { userId: k.D, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: 'compra-d001', agora: AGORA + 1000, checkpoint: CHECKPOINT }));
      igual(`${r1}|${r2?.codigo}`, `null|${ERRO_MERCADO_P2P.ESTADO}`, 'os dois compraram, ou nenhum');
      igual(`${pt(B, k.C)}|${pt(B, k.D)}|${B.prepare(`SELECT COUNT(*) n FROM player_market_fills`).get().n}`, '1000|2000|1', 'dois débitos, ou duas vendas');
      const b = anuncia(k, { criaturaId: k.cr[1] }, 400);
      cancelarAnuncio(k.db, { userId: k.V, anuncioId: b.id, agora: AGORA });
      igual(recusa(() => comprar(B, { userId: k.D, anuncioId: b.id, versao: b.versao, preco: b.preco, chaveIdem: 'compra-d002', agora: AGORA, checkpoint: CHECKPOINT }))?.codigo, ERRO_MERCADO_P2P.ESTADO, 'comprou o que outra conexão cancelou');
      igual(`${donoDe(B, k.cr[1]) === k.V}|${pt(B, k.D)}`, 'true|2000', 'o cancelado mudou de dono ou cobrou');
      igual(divergenciasDaEconomia(B).length, 0, 'o escrow não fecha');
      k.db.close(); B.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('o crash no meio da compra não deixa nada pela metade', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mercado-'));
    try {
      const arq = join(dir, 'm.db');
      const k = cena(arq);
      const a = anuncia(k, { criaturaId: k.cr[0] }, 1000);
      k.db.close();
      const RAIZ = new URL('..', import.meta.url).href;
      const r = spawnSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', `
        import { abrirBanco } from '${RAIZ}server/banco.mjs';
        import { emTransacao } from '${RAIZ}server/carteira.mjs';
        import { comprar } from '${RAIZ}server/mercado-jogadores.mjs';
        const db = abrirBanco(${JSON.stringify(arq)});
        emTransacao(db, () => { comprar(db, { userId: ${JSON.stringify(k.C)}, anuncioId: ${JSON.stringify(a.id)}, versao: ${a.versao}, preco: ${a.preco},
          chaveIdem: 'compra-crash', agora: ${AGORA + 1000}, checkpoint: '${CHECKPOINT}' }); process.exit(9); });`], { encoding: 'utf8' });
      igual(r.status, 9, `o filho não morreu dentro da compra: ${r.stderr}`);
      const db = abrirBanco(arq);
      igual(`${donoDe(db, k.cr[0]) === k.V}|${pt(db, k.C)}|${db.prepare(`SELECT estado FROM player_market_listings`).get().estado}`, 'true|2000|ACTIVE', 'o crash deixou a compra pela metade');
      igual(divergenciasDaEconomia(db).length, 0, 'o crash deixou o escrow sem fechar');
      db.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('pela porta: a vitrine, a compra, e sem o §25.1 o Market não abre', async () => {
    for (const [ambiente, checkpointTeste] of [['teste', null], ['desenvolvimento', CHECKPOINT], ['teste', CHECKPOINT]]) {
      let relogio = AGORA;
      const srv = criarServidor({ config: { ambiente, silencioso: true, checkpointTeste }, banco: ':memory:', sims: 40, laco: false, relogio: () => relogio });
      const porta = await srv.ouvir(0);
      const url = r => `http://127.0.0.1:${porta}${r}`;
      const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
      try {
        ligar(srv.db);
        const sessao = async n => {
          const r = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(), body: JSON.stringify({ username: n, email: `${n.toLowerCase()}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
          return { authorization: `Bearer ${r.sessao}`, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(n).id };
        };
        const [v, c] = [await sessao('MercV'), await sessao('MercC')];
        const cr = gerar(srv.db, { userId: v.id, pack: PACK, dex: 25 }).id;
        creditar(srv.db, { userId: v.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 50, idem: 'h-v', agora: AGORA });
        creditar(srv.db, { userId: c.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 500, idem: 'h-c', agora: AGORA });
        const post = (s, rota, corpo) => fetch(url(rota), { method: 'POST', headers: Hd({ authorization: s.authorization }), body: JSON.stringify(corpo) });
        const criado = await post(v, '/api/player-market/anunciar', { ativo: { criaturaId: cr }, preco: 300 });
        if (!checkpointTeste || ambiente !== 'teste') {
          const corpo = await criado.json();
          igual(`${criado.status}|${corpo.reason_code}`, '409|FEATURE_DISABLED', `sem o §25.1 o Market anunciou (${ambiente})`);
          continue;
        }
        const a = await criado.json();
        igual(`${criado.status}|${a.liquido}`, '200|294', 'o anúncio pela porta');
        const vit = await (await fetch(url('/api/player-market/anuncios'), { headers: Hd({ authorization: c.authorization }) })).json();
        igual(`${vit.anuncios.length}|${vit.anuncios[0].vendedor}|${'taxaVenda' in vit.anuncios[0]}`, '1|MercV|false', 'a vitrine mostra taxas ou o id de quem vende');
        ok(!JSON.stringify(vit).includes(v.id), 'a vitrine vazou o id de quem vende');
        igual((await post(c, '/api/player-market/comprar', { id: a.id, versao: a.versao, preco: 999, chave: 'http-0001' })).status, 409, 'o preço errado pela porta');
        const ok1 = await (await post(c, '/api/player-market/comprar', { id: a.id, versao: a.versao, preco: a.preco, chave: 'http-0002' })).json();
        igual(`${ok1.liquido}|${donoDe(srv.db, cr) === c.id}`, '294|true', 'a compra pela porta');
        const meus = await (await fetch(url('/api/player-market/meus'), { headers: Hd({ authorization: c.authorization }) })).json();
        igual(meus.compras.length, 1, 'minhas compras pela porta');
        /* o varredor do SERVIDOR vence o anúncio junto com a reserva */
        const cr2 = gerar(srv.db, { userId: v.id, pack: PACK, dex: 25 }).id;
        const b = await (await post(v, '/api/player-market/anunciar', { ativo: { criaturaId: cr2 }, preco: 200 })).json();
        relogio = AGORA + DURACAO_ANUNCIO_MS;
        srv.economia.passo();
        igual(`${srv.db.prepare(`SELECT estado FROM player_market_listings WHERE id = ?`).get(b.id).estado}|${holdsAtivos(srv.db, { tipo: 'market', id: b.id }).length}`, 'EXPIRED|0', 'o varredor do servidor não venceu o anúncio');
      } finally { await srv.fechar(); }
    }
  });

  s.teste('a migração sobe e desce limpa', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'mercado-jogadores-st14.9');
    ok(MIGRACOES.indexOf(m) > MIGRACOES.findIndex(x => x.nome === 'trocas-st14.7'), 'a migração não entrou depois da anterior');
    const tem = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('player_market_listings', 'player_market_fills')`).get().n;
    m.desce(db); igual(tem(), 0, 'a descida deixou restos');
    m.sobe(db); igual(tem(), 2, 'a subida não refez');
  });

  return s;
}
