/* Q1/Q3/Q6 · A LOJA DO IDLE PELA CONTA (ST-13.9a · D-136)
 *
 * Com conta, o save do aparelho é CACHE: a loja escrevia só nele, e a leitura
 * seguinte da conta trazia a bolsa do servidor — a compra, a parte sorteada e
 * o item montado sumiam. Agora comprar, vender, estilhaçar e montar passam por
 * `POST /api/idle/loja`, com a conta do motor refeita no servidor, e a compra
 * SOBREVIVE à releitura. Sem conta, o aparelho de sempre.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from '../server/servidor.mjs';
import { creditarBolsa, quantosNaBolsa } from '../server/idle.mjs';
import { criarApi } from '../app/modules/api.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { lojaNa } from '../app/modules/idle-acoes.mjs';
import { sincronizarIdleDaConta } from '../app/modules/idle-servidor.mjs';
import { aVenda, precoDeCompra, precoDeVenda } from '../engine/loja.mjs';
import { PARTES, bolsoDoBioma, custoDoEstilhaco, estilhacarNaBolsa, montarNaBolsa } from '../engine/estilhaco.mjs';
import { idDoMaterial } from '../engine/economia-idle.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const armazemFalso = () => {
  const dados = new Map();
  return { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), clear: () => dados.clear() };
};
const MOEDA = PACK.moedaPve?.id ?? 'pokecoin';
const MAT = idDoMaterial(PACK);
const CAT = PACK.catalogo ?? [];
/* Uma rota que estilhaça, e um item do bolso dela (a faixa dá o custo). */
const BIOMA = (PACK.biomas ?? []).map(b => b.id).find(b => bolsoDoBioma(CAT, b).length > 0);
const DO_BOLSO = bolsoDoBioma(CAT, BIOMA)[0];
const A_VENDA = aVenda(PACK)[0]?.id;

export async function suite() {
  const s = criarSuite('loja-idle');

  s.teste('motor: a troca por estilhaço cobra a faixa e sorteia do bolso da rota; a recusa não mexe em nada', () => {
    const custo = custoDoEstilhaco(DO_BOLSO.faixa);
    const bolsa = { [MAT]: custo + 3 };
    const r = estilhacarNaBolsa(bolsa, { catalogo: CAT, material: MAT, id: DO_BOLSO.id, bioma: BIOMA, sorte: 0 });
    igual(`${r.bolsa[MAT]}|${r.custo}|${bolsoDoBioma(CAT, BIOMA).some(i => i.id === r.sorteado.id)}|${r.bolsa['est:' + r.sorteado.id]}`, `3|${custo}|true|1`, 'a troca cobrou errado ou sorteou fora do bolso');
    igual(bolsa[MAT], custo + 3, 'a troca mexeu na bolsa de quem chamou');
    let msg = '';
    try { estilhacarNaBolsa({ [MAT]: custo - 1 }, { catalogo: CAT, material: MAT, id: DO_BOLSO.id, bioma: BIOMA, sorte: 0 }); } catch (e) { msg = e.message; }
    ok(/faltam 1 /.test(msg), `a recusa não diz quanto falta: ${msg}`);
    msg = '';
    const semBolso = { [MAT]: 999 };
    try { estilhacarNaBolsa(semBolso, { catalogo: CAT, material: MAT, id: DO_BOLSO.id, bioma: 'nenhum', sorte: 0 }); } catch (e) { msg = e.message; }
    ok(/não estilhaça/.test(msg) && semBolso[MAT] === 999, `a rota sem bolso não foi recusada, ou cobrou antes de recusar: ${msg} ${semBolso[MAT]}`);
    const m = montarNaBolsa({ ['est:x']: PARTES + 2, x: 1 }, 'x');
    igual(`${m.bolsa['est:x']}|${m.bolsa.x}`, '2|2', 'a montagem não consumiu exatamente as partes');
    let falta = '';
    try { montarNaBolsa({ ['est:x']: PARTES - 1 }, 'x'); } catch (e) { falta = e.message; }
    ok(/faltam partes/.test(falta), 'montou com partes faltando');
  });

  s.teste('sem conta: comprar e estilhaçar no aparelho, com o contador que não deixa ressortear', async () => {
    const api = { temSessao: () => false };
    const E = D.carregar(armazemFalso());
    E.bolsa = { [MOEDA]: 1000, [MAT]: 500 };
    const r = await lojaNa(E, { pack: PACK, acao: 'comprar', id: A_VENDA, quantos: 2 }, { api });
    igual(`${r.levou}|${E.bolsa[A_VENDA]}|${E.bolsa[MOEDA]}`, `2|2|${1000 - 2 * precoDeCompra(PACK, A_VENDA)}`, 'a compra do aparelho');
    const antes = E.estilhacos ?? 0;
    const e1 = await lojaNa(E, { pack: PACK, acao: 'estilhacar', id: DO_BOLSO.id, bioma: BIOMA }, { api });
    igual(`${E.estilhacos}|${E.bolsa['est:' + e1.sorteado.id]}`, `${antes + 1}|1`, 'o estilhaço do aparelho não andou o contador');
    let msg = '';
    try { await lojaNa(E, { pack: PACK, acao: 'comprar', id: A_VENDA, quantos: 100000 }, { api }); } catch (e) { msg = e.message; }
    ok(/faltam/.test(msg) && E.bolsa[A_VENDA] === 2, `a compra sem saldo passou ou mexeu na bolsa: ${msg}`);
  });

  s.teste('contra o servidor de verdade: com conta, a compra, a venda, o estilhaço e a montagem SOBREVIVEM à releitura (D-136)', async () => {
    let t = Date.UTC(2026, 9, 1, 12);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const deposito = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: deposito });
      const o = { api, deposito, conta: true };
      await api.post('/api/auth/cadastrar', { username: 'Loja1', email: 'loja1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Loja1'`).get().id;
      creditarBolsa(srv.db, uid, MOEDA, 1000);
      creditarBolsa(srv.db, uid, MAT, 500);
      const E = D.carregar(deposito);
      await sincronizarIdleDaConta({ api, deposito }); Object.assign(E, D.carregar(deposito));

      const preco = precoDeCompra(PACK, A_VENDA);
      const r = await lojaNa(E, { pack: PACK, acao: 'comprar', id: A_VENDA, quantos: 2 }, o);
      igual(`${r.levou}|${r.gasto}`, `2|${2 * preco}`, 'a resposta da compra pela conta');
      /* A PROVA DO D-136: a leitura seguinte da conta traz a compra. */
      await sincronizarIdleDaConta({ api, deposito });
      const relido = D.carregar(deposito);
      igual(`${relido.bolsa[A_VENDA]}|${relido.bolsa[MOEDA]}`, `2|${1000 - 2 * preco}`, 'a compra sumiu na releitura da conta');
      igual(`${quantosNaBolsa(srv.db, uid, A_VENDA)}|${E.bolsa[A_VENDA]}`, '2|2', 'a compra não foi para o banco, ou não voltou à tela');

      const v = await lojaNa(E, { pack: PACK, acao: 'vender', id: A_VENDA, quantos: 1 }, o);
      igual(`${v.recebeu}|${quantosNaBolsa(srv.db, uid, A_VENDA)}`, `${precoDeVenda(PACK, A_VENDA)}|1`, 'a venda pela conta');

      const est = await lojaNa(E, { pack: PACK, acao: 'estilhacar', id: DO_BOLSO.id, bioma: BIOMA }, o);
      igual(`${quantosNaBolsa(srv.db, uid, MAT)}|${quantosNaBolsa(srv.db, uid, 'est:' + est.sorteado.id)}`,
        `${500 - custoDoEstilhaco(DO_BOLSO.faixa)}|1`, 'o estilhaço pela conta não cobrou ou não creditou a parte');
      ok(bolsoDoBioma(CAT, BIOMA).some(i => i.id === est.sorteado.id), 'o servidor sorteou fora do bolso da rota');

      creditarBolsa(srv.db, uid, 'est:' + est.sorteado.id, PARTES - 1);
      await lojaNa(E, { pack: PACK, acao: 'montar', id: est.sorteado.id }, o);
      igual(`${quantosNaBolsa(srv.db, uid, 'est:' + est.sorteado.id)}|${quantosNaBolsa(srv.db, uid, est.sorteado.id) >= 1}|${E.bolsa['est:' + est.sorteado.id] ?? 0}`, '0|true|0', 'a montagem pela conta');

      /* A recusa chega com a frase do motor, e nada muda no banco. */
      const moedas = quantosNaBolsa(srv.db, uid, MOEDA);
      let msg = '';
      try { await lojaNa(E, { pack: PACK, acao: 'comprar', id: A_VENDA, quantos: 999 }, o); } catch (e) { msg = e.message; }
      ok(/faltam/.test(msg) && quantosNaBolsa(srv.db, uid, MOEDA) === moedas, `a compra sem saldo passou no servidor, ou mexeu no banco: ${msg}`);
      /* O corpo torto é recusado antes de chegar ao motor. */
      for (const corpo of [{ acao: 'roubar', id: A_VENDA }, { acao: 'comprar', id: A_VENDA, quantos: -5 }, { acao: 'estilhacar', id: DO_BOLSO.id, bioma: 'lugar-nenhum' }]) {
        const x = await api.post('/api/idle/loja', corpo);
        igual(`${x.status}|${x.corpo?.codigo}`, '400|ENTRADA_INVALIDA', `pedido torto aceito: ${JSON.stringify(corpo)}`);
      }
    } finally { await srv.fechar(); }
  });

  s.teste('a troca do servidor é UMA transação: o crédito que falha desfaz o débito', async () => {
    const { lojaDoIdleNaConta } = await import('../server/loja-idle.mjs');
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false });
    try {
      const db = srv.db;
      const { cadastrar } = await import('../server/auth.mjs');
      const uid = cadastrar(db, { username: 'lojatx', email: 'lojatx@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: Date.UTC(2026, 0, 15) }).id;
      creditarBolsa(db, uid, MOEDA, 1000);
      /* O item comprado não pode entrar: o débito da moeda já passou. */
      db.exec(`CREATE TRIGGER falha_item BEFORE INSERT ON bolsa WHEN NEW.item_id = '${A_VENDA}' BEGIN SELECT RAISE(ABORT, 'falha simulada'); END`);
      let msg = '';
      try { lojaDoIdleNaConta(db, { userId: uid, pack: PACK, acao: 'comprar', id: A_VENDA, quantos: 1 }); } catch (e) { msg = e.message; }
      igual(`${/falha simulada/.test(msg)}|${quantosNaBolsa(db, uid, MOEDA)}`, 'true|1000', 'a moeda saiu e o item não entrou: a troca não é uma transação');
    } finally { await srv.fechar(); }
  });

  s.teste('a tela da loja escreve por `lojaNa`, e não mais direto no save', () => {
    const t = fonte('app/modules/loja-tela.mjs');
    ok(/await lojaNa\(E, \{ pack: PACK, \.\.\.pedido \}\);\s*gravar\(E\);/.test(t), 'a loja não chama lojaNa, ou não grava o que voltou (sem conta, a compra sumiria ao recarregar)');
    ok(!/\b(comprar|vender)\(E,|E\.bolsa\[[^\]]+\]\s*=/.test(t), 'a loja ainda escreve na bolsa do save');
  });

  return s;
}
