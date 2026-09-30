/* Q1/Q3 · COM CONTA, AS ESCRITAS DO IDLE PASSAM PELO SERVIDOR (ST-13.5b · E13)
 *
 * A inicial, a expedição, a colheita e o lance: com conta, a rota nomeada do
 * servidor decide e a conta é relida para dentro do objeto que a tela segura;
 * sem conta, a função de sempre, no aparelho. O teto do dia, com conta, soma
 * o que o servidor já colheu — as expedições colhidas não descem.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from '../server/servidor.mjs';
import { creditarBolsa, estadoDoTeto } from '../server/idle.mjs';
import { criarApi } from '../app/modules/api.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { lanceDaConta, camposDaConta } from '../app/modules/idle-conta.mjs';
import { inicialNa, expedicaoNa, colherNa, lancarNa, comecarNa, recuarNa, pocaoNa, colherRunNa } from '../app/modules/idle-acoes.mjs';
import { curaDe, runsNoDia } from '../engine/avanco.mjs';

const T0 = Date.UTC(2026, 9, 1, 12), H = 3600e3;
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const armazemFalso = () => {
  const dados = new Map();
  return { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), clear: () => dados.clear() };
};

export async function suite() {
  const s = criarSuite('idle-acoes');

  s.teste('camada 0: o lance da conta diz se foi para a caixa, e o teto do disco é número', () => {
    igual(`${lanceDaConta({ capturou: true, criatura: { naCaixa: true } }).foiParaCaixa}|${lanceDaConta({ capturou: false, criatura: null }).foiParaCaixa}`, 'true|false', 'o lance da conta sem a caixa');
    igual(JSON.stringify(camposDaConta({ conta: { teto: { restam: 5, hoje: -40 } } }).conta.teto), JSON.stringify({ restam: 5, hoje: 0 }), 'um `hoje` negativo escrito à mão entra no teto');
    /* O teto do aparelho soma o dia colhido do servidor. */
    const e = { ...D.carregar(armazemFalso()), conta: { teto: { restam: 3, hoje: 27 } } };
    igual(D.encontrosHoje(e, T0), 27, 'com conta, o teto do aparelho esquece o que o servidor já colheu');
  });

  s.teste('a tela chama as ações, e não as funções do aparelho', () => {
    const t = fonte('app/modules/idle-tela.mjs');
    for (const chamada of ['await inicialNa(E, PACK,', 'await lancarNa(E, {', 'ultimaColheita = await colherNa(E, {', 'await expedicaoNa(E, {'])
      ok(t.includes(chamada), `a tela não chama ${chamada}`);
    ok(!/\b(escolherInicial|iniciarExpedicao|lancarBola)\(E\b|= colher\(E/.test(t), 'a tela ainda escreve direto no aparelho');
  });

  s.teste('contra o servidor de verdade: inicial, expedição, colheita e lance pela conta', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const deposito = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: deposito });
      const o = { api, deposito, conta: true };
      await api.post('/api/auth/cadastrar', { username: 'Iac1', email: 'iac1@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Iac1'`).get().id;
      const E = D.carregar(deposito);

      const ini = await inicialNa(E, PACK, PACK.iniciais[0], t, o);
      igual(`${E.criaturas.length}|${E.criaturas[0]?.id}|${ini.id}`, `1|${ini.id}|${ini.id}`, 'a inicial não voltou da conta para o objeto da tela');
      igual(srv.db.prepare(`SELECT COUNT(*) n FROM criaturas WHERE user_id = ?`).get(uid).n, 1, 'a inicial não foi para o banco');
      ok(D.salvar(E, deposito), 'o save da tela depois da ação da conta foi recusado como conflito');

      /* A recusa do servidor chega como Error com a frase dele, e nada muda. */
      let recusa = null;
      try { await inicialNa(E, PACK, PACK.iniciais[0], t, o); } catch (e) { recusa = e.message; }
      ok(/uma vez/.test(recusa ?? ''), `a recusa da segunda inicial não chegou: ${recusa}`);

      const x = await expedicaoNa(E, { pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [ini.id], agora: t }, o);
      igual(`${E.expedicoes.length}|${E.expedicoes[0]?.id}`, `1|${x.id}`, 'a expedição da conta não voltou à tela');

      t += 24 * H;
      const col = await colherNa(E, { pack: PACK, id: x.id, agora: t }, o);
      ok(Array.isArray(col.encontros) && Array.isArray(col.itens) && col.expedicao === x.id, 'a colheita da conta não tem o formato do saque');
      igual(E.expedicoes.length, 0, 'a expedição colhida ficou no aparelho');
      igual(E.encontros.length, col.encontros.length, 'os encontros da colheita não chegaram à tela');
      /* O teto: o aparelho conta o mesmo dia que o servidor. */
      const hoje = estadoDoTeto(srv.db, uid, t, PACK).encontrosHoje;
      ok(hoje > 0, 'a colheita não rendeu encontro — o teto compararia zero com zero');
      igual(D.encontrosHoje(E, t), hoje, 'o teto do aparelho diverge do da conta');

      /* O lance: um encontro comum da própria expedição, e bolas na bolsa. */
      creditarBolsa(srv.db, uid, 'poke', 3);
      srv.db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, expedicao_id, dex, raridade, bioma, em) VALUES ('lz:0', ?, 'expedicao', ?, 16, 'comum', 'floresta', ?)`).run(uid, x.id, t);
      await colherNa(E, { pack: PACK, id: x.id, agora: t }, o);   // idempotente: só relê a conta
      const bolas = E.bolsa.poke;
      const r = await lancarNa(E, { pack: PACK, chave: 'lz:0', bola: 'poke', agora: t }, o);
      igual(`${typeof r.capturou}|${typeof r.foiParaCaixa}|${r.dex}`, 'boolean|boolean|16', 'o lance da conta sem o formato da cena');
      igual(`${E.bolsa.poke ?? 0}|${E.encontros.some(k => k.chave === 'lz:0')}`, `${bolas - 1}|false`, 'o lance não gastou a bola ou não levou o encontro');
      igual(E.criaturas.length, r.capturou ? 2 : 1, 'a captura da conta não chegou à tela');
    } finally { await srv.fechar(); }
  });

  s.teste('a tela da run chama as ações, e a colheita com conta tem trava', () => {
    const t = fonte('app/modules/avanco-tela.mjs');
    for (const chamada of ['await comecarNa(estado(), {', 'await recuarNa(estado(), agora())', 'await pocaoNa(E, {', 'const r = colherRunNa(E, {'])
      ok(t.includes(chamada), `a tela da run não chama ${chamada}`);
    ok(/!parada\.colhidaEm && !colhendo\)/.test(t) && /colhendo = true;/.test(t) && /\.finally\(\(\) => \{ colhendo = false; \}\)/.test(t), 'a colheita com conta sem a trava: a mesma run seria pedida a cada quadro');
    ok(/r\.then\(colhida => \{ depoisDaColheita\(E, colhida, agora\); recarregarAba\?\.\(\); \}\)/.test(t), 'com conta, o quadro "quem apareceu" não repinta depois da colheita');
    ok(/recarregarAba = recarregar;/.test(t), 'a tela da run não guarda o redesenho da aba');
  });

  s.teste('contra o servidor de verdade: a run começa, recua e é colhida pela conta', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const deposito = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: deposito });
      const o = { api, deposito, conta: true };
      await api.post('/api/auth/cadastrar', { username: 'Iac2', email: 'iac2@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Iac2'`).get().id;
      const E = D.carregar(deposito);
      const ini = await inicialNa(E, PACK, PACK.iniciais[0], t, o);

      const run = await comecarNa(E, { pack: PACK, bioma: 'floresta', estagio: 1, equipe: [ini.id], agora: t }, o);
      ok(run && E.run?.id === run.id && E.run.raiz != null, 'a run da conta não chegou à tela com o id e a raiz do servidor');

      /* A poção com a vida cheia é recusada pelo servidor — e a recusa chega. */
      const pocao = (PACK.catalogo ?? []).find(i => curaDe(PACK, i.id) > 0)?.id;
      creditarBolsa(srv.db, uid, pocao, 1);
      let recusa = null;
      try { await pocaoNa(E, { pack: PACK, item: pocao, agora: t }, o); } catch (e) { recusa = e.message; }
      ok(/cheia/.test(recusa ?? ''), `a poção com a vida cheia não foi recusada pelo servidor: ${recusa}`);
      /* Um minuto de luta tira vida em qualquer semente (medido: 18 de 18). */
      t += 60e3;
      const cura = await pocaoNa(E, { pack: PACK, item: pocao, agora: t }, o);
      igual(`${cura.curou > 0}|${cura.item}|${E.bolsa[pocao] ?? 0}`, `true|${pocao}|0`, 'a poção da conta não curou ou não saiu da bolsa da tela');

      /* Recua aos cinco minutos: dali em diante toda semente já rendeu encontro
         (medido: de 3 min em diante, 2 a 4), e o teto abaixo não compara zero
         com zero. */
      t += 4 * 60e3;
      await recuarNa(E, t, o);
      ok(E.run?.fim, 'o recuo da conta não chegou à tela');

      t += 1000;
      const p = colherRunNa(E, { pack: PACK, agora: t }, o);
      ok(typeof p?.then === 'function', 'com conta, a colheita da run não é uma promessa');
      const colhida = await p;
      ok(colhida.encontros > 0 && colhida.rendeu, `a run colhida da conta sem encontros ou sem o que rendeu: ${colhida.encontros}`);
      igual(`${E.run}|${E.avancos.length}|${runsNoDia(E.avancos, t)}`, 'null|1|1', 'a run colhida não virou lançamento do dia no aparelho');
      /* O teto: a run desce em `avancos`, e o `hoje` da conta não a conta de novo. */
      igual(D.encontrosHoje(E, t), estadoDoTeto(srv.db, uid, t, PACK).encontrosHoje, 'a run colhida conta duas vezes (ou nenhuma) no teto do aparelho');
      const pendentes = srv.db.prepare(`SELECT COUNT(*) n FROM encontros_pendentes WHERE user_id = ? AND origem = 'avanco' AND resolvido_em IS NULL`).get(uid).n;
      igual(E.encontros.filter(k => k.origem === 'avanco').length, pendentes, 'os encontros da run não chegaram ao quadro');
    } finally { await srv.fechar(); }
  });

  s.teste('sem conta, a colheita da run continua síncrona', async () => {
    const api = { temSessao: () => false };
    const deposito = armazemFalso(), E = D.carregar(deposito);
    const ini = await inicialNa(E, PACK, PACK.iniciais[0], T0, { api, deposito });
    await comecarNa(E, { pack: PACK, bioma: 'floresta', estagio: 1, equipe: [ini.id], agora: T0 }, { api, deposito });
    await recuarNa(E, T0 + 60e3, { api, deposito });
    const r = colherRunNa(E, { pack: PACK, agora: T0 + 61e3 }, { api, deposito });
    ok(typeof r?.then !== 'function' && r?.colhidaEm === T0 + 61e3 && E.run === null, 'sem conta, a colheita da run virou promessa — o saque sairia um quadro depois');
  });

  s.teste('sem conta, a ação é a do aparelho, e o servidor nem é chamado', async () => {
    const pedidos = [];
    const api = { temSessao: () => false, post: async r => { pedidos.push(r); return { ok: false }; }, get: async r => { pedidos.push(r); return { ok: false }; } };
    const deposito = armazemFalso(), E = D.carregar(deposito);
    await inicialNa(E, PACK, PACK.iniciais[0], T0, { api, deposito });
    igual(`${E.criaturas.length}|${pedidos.length}`, '1|0', 'sem conta, a inicial foi ao servidor');
  });

  return s;
}
