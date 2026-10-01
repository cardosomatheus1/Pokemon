/* Q1/Q3/Q6/Q8 · E14 · AS ORDENS DE COMPRA DE CRIATURA POR CRITÉRIOS (ST-14.11B · spec E14 §10.3)
 *
 * O aceite da ficha, frase a frase:
 *
 *   nenhum critério ignorado — eles valem JUNTOS (E, nunca OU)
 *   a criatura fora da faixa é recusada, e nada se move
 *   dois vendedores para a mesma ordem: uma liquidação
 *   quem compra recebe a INSTÂNCIA (o id e o retrato de quando foi vendida),
 *   não uma réplica do catálogo
 *   os critérios não mudam com o catálogo: a ordem velha não casa até quem
 *   a criou cancelar e criar de novo
 *   a presa pela origem e a reservada não vão; a da conta ligada também não
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { divergenciasDaEconomia } from '../server/conciliacao-economia.mjs';
import { anunciar } from '../server/mercado-jogadores.mjs';
import { criarOrdemDeCriatura, venderCriaturaParaOrdem, cancelarOrdem, ordensDeCriatura, minhasOrdens } from '../server/mercado-jogadores-ordens.mjs';
import { historicoDaSerie } from '../server/mercado-jogadores-historico.mjs';
import { normalizarCriterios, atendeCriterios, hashDosCriterios, versaoDoCatalogo, textoDosCriterios, CRITERIOS } from '../engine/criterios-mercado.mjs';
import { faixaDoPotencial } from '../engine/historico-precos.mjs';
import { criteriosDoFormulario, previaDaOrdemDeCriatura, queServem, vendaParaOrdemDeCriatura, linhaDaMinhaOrdem } from '../app/modules/mercado-jogadores-dados.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
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
  const conta = (n, pc = 0) => {
    const id = cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    if (pc) creditar(db, { userId: id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: pc, idem: `pc-${n}`, agora: AGORA });
    return id;
  };
  const bicho = (u, dex, nivel, extra = {}) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura', ...extra });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  };
  return { db, conta, bicho };
}
const pt = (db, u) => saldos(db, u).transferivel;
const res = (db, u) => saldos(db, u).reservado_transferivel ?? 0;
const pede = (k, userId, criterios, preco, chave) => criarOrdemDeCriatura(k.db, { userId, pack: PACK, criterios, preco, chaveIdem: chave, agora: AGORA, checkpoint: CHECKPOINT });
const vende = (k, userId, ordemId, criaturaId, chave, extra = {}) => venderCriaturaParaOrdem(k.db, { userId, pack: PACK, ordemId, criaturaId, chaveIdem: chave, agora: AGORA + 1000, checkpoint: CHECKPOINT, ...extra });
const dono = (db, id) => db.prepare(`SELECT user_id, proveniencia FROM criaturas WHERE id = ?`).get(id);
const limpo = db => { const d = divergenciasDaEconomia(db); return d.length ? JSON.stringify(d) : ''; };

export async function suite() {
  const s = criarSuite('e14-buy-creatures');

  /* ── A CAMADA 0 ─────────────────────────────────────────────────────── */
  s.teste('motor: os critérios são de uma lista fechada — o desconhecido é recusa, não silêncio', () => {
    igual(CRITERIOS.join(','), 'dex,shiny,nivelMin,nivelMax,natureza,potencialMin', 'a lista de critérios');
    igual(normalizarCriterios(PACK, { dex: 25, golpe: 'Surf' }).motivo, 'critério desconhecido: golpe', 'o critério que não existe passou');
    igual(normalizarCriterios(PACK, { dex: 25, exemplar: true }).ok, false, 'o exemplar virou critério');
    igual(normalizarCriterios(PACK, { shiny: true }).motivo, 'espécie inválida', 'a ordem sem espécie');
    igual(normalizarCriterios(PACK, { dex: 25, shiny: 'sim' }).ok, false, 'o brilho não-booleano');
    igual(normalizarCriterios(PACK, { dex: 25, nivelMin: 30, nivelMax: 10 }).motivo, 'nível mínimo acima do máximo', 'a faixa invertida');
    igual(normalizarCriterios(PACK, { dex: 25, natureza: 'Inventada' }).ok, false, 'a natureza que não existe');
    const n = normalizarCriterios(PACK, { dex: 25, shiny: false, nivelMin: 10 });
    igual(JSON.stringify(n.criterios), `{"pack":"${PACK.id}","dex":25,"shiny":false,"nivelMin":10}`, 'o pack não foi gravado nos critérios');
    igual(hashDosCriterios({ dex: 25, pack: PACK.id, shiny: false }), hashDosCriterios({ shiny: false, pack: PACK.id, dex: 25 }), 'a impressão digital depende da ordem das chaves');
  });

  s.teste('motor: a instância cumpre TODOS os critérios — cada um, sozinho, recusa', () => {
    const nat = PACK.naturezas[0][0];
    const c = { pack: PACK.id, dex: 25, shiny: true, nivelMin: 10, nivelMax: 30, natureza: nat, potencialMin: 50 };
    const r = { pack: PACK.id, dex: 25, shiny: true, nivel: 20, natureza: nat, potencial: 60, exemplar: false };
    igual(atendeCriterios(c, r).ok, true, 'a que cumpre tudo foi recusada');
    for (const [campo, valor, motivo] of [['pack', 'outro', 'pack'], ['dex', 26, 'espécie'], ['shiny', false, 'brilho'], ['nivel', 9, 'nível'], ['nivel', 31, 'nível'],
                                          ['natureza', PACK.naturezas[1][0], 'natureza'], ['potencial', 49, 'potencial']])
      igual(atendeCriterios(c, { ...r, [campo]: valor }).motivo, motivo, `o critério ${campo} foi ignorado`);
    /* O exemplar não é shiny: um exemplar normal não cumpre "brilhante". */
    igual(atendeCriterios(c, { ...r, shiny: false, exemplar: true }).ok, false, 'o exemplar passou por shiny');
    /* Sem o critério, qualquer valor serve. */
    igual(atendeCriterios({ pack: PACK.id, dex: 25 }, { ...r, shiny: false, nivel: 1, potencial: 0 }).ok, true, 'o critério ausente filtrou');
    igual(textoDosCriterios(c, d => `#${d}`), `✦ #25 · brilhante · nv 10–30 · ${nat} · potencial 50+`, 'os critérios em palavras');
  });

  s.teste('motor: a versão do catálogo muda quando as espécies ou as naturezas mudam', () => {
    const v = versaoDoCatalogo(PACK);
    igual(versaoDoCatalogo({ ...PACK }), v, 'a versão mudou sem o catálogo mudar');
    ok(versaoDoCatalogo({ ...PACK, especies: [...PACK.especies, { dex: 999 }] }) !== v, 'a espécie nova não mudou a versão');
    ok(versaoDoCatalogo({ ...PACK, naturezas: PACK.naturezas.slice(1) }) !== v, 'a natureza a menos não mudou a versão');
  });

  s.teste('a tela: a ficha vira critérios da mesma régua, a prévia diz o aceite antecipado, e só as que servem aparecem', () => {
    const f = criteriosDoFormulario({ especie: 'pikachu', shiny: 'nao', nivelMin: '10', potencialMin: '' }, PACK, n => (n === 'pikachu' ? 25 : null));
    igual(JSON.stringify(f.criterios), `{"pack":"${PACK.id}","dex":25,"shiny":false,"nivelMin":10}`, 'a ficha virou outros critérios');
    igual(criteriosDoFormulario({ especie: 'ninguém' }, PACK, () => null).ok, false, 'a ficha sem espécie passou');
    const p = previaDaOrdemDeCriatura({ criterios: f.criterios, preco: 500, elegivel: 1000, nomeDaEspecie: () => 'Pikachu' });
    igual(p.linhas.map(([k, v]) => `${k}=${v}`).join(' | '), 'Você recebe=uma criatura: Pikachu · normal · nv 10+ | Fica preso até alguém vender=500 PC-T | Taxa para criar (sai agora, não volta)=3 PC-T | Sai do seu PC-T agora=503 PC-T', 'a prévia');
    ok(/qualquer exemplar que cumpra tudo/.test(p.nota) && /sem outra confirmação/.test(p.nota), 'a prévia não diz o aceite antecipado');
    const minhas = [{ id: 'a', dex: 25, nivel: 12, xp: 0, shiny: false, natureza: 'x', potencial: 30 }, { id: 'b', dex: 25, nivel: 8, shiny: false, potencial: 90 },
                    { id: 'c', dex: 25, nivel: 30, shiny: true, potencial: 90 }, { id: 'd', dex: 26, nivel: 30, shiny: false, potencial: 90 }];
    igual(queServem(minhas, f.criterios, PACK).map(c => c.id).join(','), 'a', 'a tela ofereceu a que não serve');
    igual(JSON.stringify(vendaParaOrdemDeCriatura({ preco: 900 })), '{"preco":900,"taxaVenda":18,"liquido":882}', 'quanto quem vende recebe');
    const l = linhaDaMinhaOrdem({ id: 'o', tipo: 'criatura', criterios: f.criterios, precoUnit: 500, estado: 'FILLED', reservado: 0, pago: 500, fills: [{ retrato: { nivel: 14, natureza: 'Firme' } }] }, id => id, () => 'Pikachu');
    igual(`${l.titulo}|${l.estado}|${l.progresso}`, 'Pikachu · normal · nv 10+ · até 500|atendida|chegou: nv 14 · Firme', 'a linha da minha ordem de criatura');
  });

  /* ── O SERVIDOR ─────────────────────────────────────────────────────── */
  s.teste('a venda: a instância muda de dono, o vendedor recebe o líquido, a ordem fecha', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend');
    const o = pede(k, C, { dex: 25, shiny: false, nivelMin: 10 }, 500, 'ocria-0001');
    igual(`${o.tipo}|${o.reservado}|${o.taxaCriacao}|${res(k.db, C)}`, 'criatura|500|3|500', 'a ordem de criatura');
    const cr = k.bicho(V, 25, 15);
    const r = vende(k, V, o.id, cr, 'vcria-0001');
    igual(`${r.bruto}|${r.taxaVenda}|${r.liquido}|${r.criaturaId === cr}|${r.retrato.dex}`, '500|10|490|true|25', 'o recibo da venda');
    const d = dono(k.db, cr);
    igual(`${d.user_id === C}|${d.proveniencia}|${pt(k.db, V)}|${res(k.db, C)}`, 'true|p2p_verified|490|0', 'a instância não chegou, ou o PC-T não passou');
    const m = minhasOrdens(k.db, { userId: C }).find(x => x.id === o.id);
    igual(`${m.estado}|${m.fills[0].criaturaId === cr}|${m.fills[0].retrato.nivel}`, 'FILLED|true|15', 'a ordem não guardou a instância entregue');
    igual(limpo(k.db), '', 'o escrow não reconcilia');
  });

  s.teste('fora da faixa é recusa, e nada se move', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend');
    const o = pede(k, C, { dex: 25, nivelMin: 20 }, 500, 'ocria-0002');
    const baixo = k.bicho(V, 25, 12), outra = k.bicho(V, 26, 30);
    for (const [cr, motivo] of [[baixo, 'nível'], [outra, 'espécie']]) {
      const e = recusa(() => vende(k, V, o.id, cr, `vcria-fora-${motivo}`));
      igual(`${e?.reason_code}|${/\(([^)]+)\)/.exec(e?.message ?? '')?.[1]}`, `CRITERIA_MISMATCH|${motivo}`, `a criatura fora (${motivo}) foi aceita`);
      igual(dono(k.db, cr).user_id, V, 'a recusada se moveu');
    }
    igual(`${pt(k.db, V)}|${res(k.db, C)}`, '0|500', 'a recusa mexeu no PC-T');
  });

  s.teste('dois vendedores para a mesma ordem: uma liquidação', () => {
    const k = cena(), C = k.conta('Comp', 2000), V1 = k.conta('Vend1'), V2 = k.conta('Vend2');
    const o = pede(k, C, { dex: 25 }, 400, 'ocria-0003');
    const a = k.bicho(V1, 25, 10), b = k.bicho(V2, 25, 10);
    vende(k, V1, o.id, a, 'vcria-0003');
    igual(recusa(() => vende(k, V2, o.id, b, 'vcria-0004'))?.message, 'esta ordem já foi atendida', 'a ordem atendida comprou de novo');
    igual(`${dono(k.db, b).user_id === V2}|${pt(k.db, V2)}|${k.db.prepare(`SELECT COUNT(*) n FROM player_market_order_fills`).get().n}`, 'true|0|1', 'duas liquidações');
  });

  s.teste('a presa pela origem, a reservada, a própria e a da conta ligada não vão', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend', 100), L = k.conta('Ligada');
    const o = pede(k, C, { dex: 25 }, 400, 'ocria-0005');
    const presa = k.bicho(V, 25, 10, { proveniencia: 'promotional_bound' });
    ok(recusa(() => vende(k, V, o.id, presa, 'vcria-0005')), 'a presa pela origem foi vendida');
    const anunciada = k.bicho(V, 25, 10);
    anunciar(k.db, { userId: V, pack: PACK, ativo: { criaturaId: anunciada }, preco: 300, agora: AGORA, checkpoint: CHECKPOINT });
    ok(recusa(() => vende(k, V, o.id, anunciada, 'vcria-0006')), 'a reservada num anúncio foi vendida');
    igual(recusa(() => vende(k, C, o.id, k.bicho(C, 25, 10), 'vcria-0007'))?.message, 'esta ordem é sua', 'vendeu para a própria ordem');
    ligarContas(k.db, { userId: C, outroId: L, sinal: 'aparelho', agora: AGORA });
    ok(/conta_ligada/.test(recusa(() => vende(k, L, o.id, k.bicho(L, 25, 10), 'vcria-0008'))?.message ?? ''), 'a conta ligada vendeu');
    igual(`${res(k.db, C)}|${minhasOrdens(k.db, { userId: C })[0].estado}`, '400|ACTIVE', 'uma recusa mexeu na ordem');
  });

  s.teste('o catálogo mudou: a ordem velha não casa, some da lista, e cancelar devolve tudo', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend');
    const o = pede(k, C, { dex: 25 }, 400, 'ocria-0009');
    const novo = { ...PACK, especies: [...PACK.especies, { dex: 999, n: 'nova', t: ['normal'], s: [1, 1, 1, 1, 1, 1] }] };
    igual(ordensDeCriatura(k.db, { pack: novo, agora: AGORA }).length, 0, 'a ordem do catálogo velho aparece');
    igual(ordensDeCriatura(k.db, { pack: PACK, agora: AGORA }).length, 1, 'a ordem do catálogo de hoje sumiu');
    const e = recusa(() => vende(k, V, o.id, k.bicho(V, 25, 10), 'vcria-0010', { pack: novo }));
    ok(/catálogo anterior/.test(e?.message ?? ''), `a ordem velha casou: ${e?.message}`);
    cancelarOrdem(k.db, { userId: C, ordemId: o.id, agora: AGORA + 1 });
    igual(`${res(k.db, C)}|${pt(k.db, C)}`, '0|1998', 'o cancelamento não devolveu o preço (só a taxa de 2 fica)');
  });

  s.teste('a lista pública não diz quem pediu; o retry da venda devolve o recibo; a série da espécie conta a venda', () => {
    const k = cena(), C = k.conta('Comp', 2000), V = k.conta('Vend');
    const o = pede(k, C, { dex: 25, shiny: false }, 400, 'ocria-0011');
    const lista = ordensDeCriatura(k.db, { pack: PACK, agora: AGORA });
    ok(!JSON.stringify(lista).includes(C), 'a lista diz quem pediu');
    igual(ordensDeCriatura(k.db, { pack: PACK, agora: AGORA, exceto: C }).length, 0, 'a lista de quem pergunta inclui as dele');
    const cr = k.bicho(V, 25, 10);
    const r = vende(k, V, o.id, cr, 'vcria-0012'), rr = vende(k, V, o.id, cr, 'vcria-0012');
    igual(`${rr.repetido}|${rr.id === r.id}|${pt(k.db, V)}`, 'true|true|392', 'o retry vendeu de novo');
    const faixa = faixaDoPotencial(r.retrato.potencial);
    const h = historicoDaSerie(k.db, { pack: PACK, serie: { tipo: 'criatura', dex: 25, shiny: false, faixa }, agora: AGORA + 5000 });
    igual(h.n7d, 1, 'a venda para a ordem não entrou na série da espécie');
    const hs = historicoDaSerie(k.db, { pack: PACK, serie: { tipo: 'criatura', dex: 25, shiny: true, faixa }, agora: AGORA + 5000 });
    igual(hs.n7d, 0, 'a venda normal entrou na série brilhante');
  });

  s.teste('pela porta: criar a ordem de criatura, ver a lista, vender — e o critério torto é 400', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    const Hd = extra => ({ [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', ...extra });
    try {
      const sessao = async n => {
        const r = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: Hd(), body: JSON.stringify({ username: n, email: `${n.toLowerCase()}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(x => x.json());
        return { authorization: `Bearer ${r.sessao}`, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(n).id };
      };
      const [c, v] = [await sessao('CriaC'), await sessao('CriaV')];
      creditar(srv.db, { userId: c.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 2000, idem: 'h-cc', agora: Date.now() });
      const cr = gerar(srv.db, { userId: v.id, pack: PACK, dex: 25, origem: 'captura' }).id;
      const post = (x, rota, corpo) => fetch(url(rota), { method: 'POST', headers: Hd({ authorization: x.authorization }), body: JSON.stringify(corpo) });
      const criada = await post(c, '/api/player-market/buy-orders/create-creature', { criterios: { dex: 25 }, preco: 300, chave: 'http-ocria-1' });
      const o = await criada.json();
      igual(`${criada.status}|${o.tipo}|${o.criterios.dex}`, '200|criatura|25', 'a ordem de criatura pela porta');
      const lida = await (await fetch(url('/api/player-market/buy-orders'), { headers: Hd({ authorization: v.authorization }) })).json();
      igual(`${lida.criaturas.length}|${lida.criaturas[0].preco}|${JSON.stringify(lida.criaturas).includes(c.id)}`, '1|300|false', 'a lista pela porta');
      const venda = await (await post(v, '/api/player-market/buy-orders/fill-creature', { id: o.id, criaturaId: cr, chave: 'http-vcria-1' })).json();
      igual(`${venda.liquido}|${venda.criaturaId === cr}`, '294|true', 'a venda pela porta');
      igual((await post(c, '/api/player-market/buy-orders/create-creature', { criterios: { dex: 25, golpe: 'x' }, preco: 300, chave: 'http-ocria-2' })).status, 400, 'o critério desconhecido passou pela porta');
      igual((await post(c, '/api/player-market/buy-orders/create-creature', { criterios: 'dex=25', preco: 300, chave: 'http-ocria-3' })).status, 400, 'o critério em texto passou');
    } finally { await srv.fechar(); }
  });

  return s;
}
