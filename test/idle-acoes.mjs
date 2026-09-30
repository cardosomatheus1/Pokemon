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
import { moverNaTela, evoluirNa, focoNa } from '../app/modules/idle-acoes.mjs';
import { moverNa, trocarNa, soltarNa, darDoceNa, naContaOu, chaveDoPedido } from '../app/modules/colecao-acoes.mjs';
import { gerar } from '../server/criaturas.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const T0 = Date.UTC(2026, 9, 1, 12), H = 3600e3;
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const armazemFalso = () => {
  const dados = new Map();
  return { getItem: k => (dados.has(k) ? dados.get(k) : null), setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), clear: () => dados.clear() };
};

const sincronizar = (api, deposito) => import('../app/modules/idle-servidor.mjs').then(m => m.sincronizarIdleDaConta({ api, deposito }));

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

  s.teste('a coleção: as telas chamam as ações, e a chave do doce é aceita pelo servidor', () => {
    const chamadas = {
      'app/modules/treino-tela.mjs': ['depois(await moverNa({ id: tirar', 'depois(await moverNa({ id: por', 'await trocarNa({ sai:'],
      'app/modules/doce-tela.mjs': ['await darDoceNa({ pack: PACK', 'await soltarNa({ pack: PACK'],
      'app/modules/moveset-tela.mjs': ["await naContaOu('/api/idle/golpe', { id: b.dataset.cria, nome: b.dataset.golpe }"],
      'app/modules/jornada-tela.mjs': ['trocar: t => trocarNa(t)', '.then(renderJornada)'],
      'app/modules/idle-tela.mjs': ['await moverNaTela(E, mv.dataset.mover', '= await evoluirNa(E, PACK, i)', '}, () => E);'],
      'app/modules/idle-foco.mjs': ['novo = await focoNa(estadoDaAba?.() ?? { criaturas: [] }, c, id, Date.now())'],
    };
    for (const [f, lista] of Object.entries(chamadas)) for (const c of lista) ok(fonte(f).includes(c), `${f} não chama ${c}`);
    const a = chaveDoPedido('u-1', 1e12, 0.5), b = chaveDoPedido('u-1', 1e12, 0.51);
    ok(/^[\w-]{8,64}$/.test(a) && a !== b, `a chave do doce não passa no servidor, ou se repete: ${a} ${b}`);
    ok(/^[\w-]{8,64}$/.test(chaveDoPedido('!@#' + 'x'.repeat(80))), 'um id comprido ou estranho faz a chave ser recusada');
  });

  s.teste('contra o servidor de verdade: caixa, troca, soltar, doce, golpe, evolução e foco pela conta', async () => {
    let t = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    const porta = await srv.ouvir(0);
    try {
      const deposito = armazemFalso(), api = criarApi({ base: `http://127.0.0.1:${porta}`, armazem: deposito });
      const o = { api, deposito, conta: true };
      await api.post('/api/auth/cadastrar', { username: 'Iac3', email: 'iac3@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' });
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'Iac3'`).get().id;
      const E = D.carregar(deposito);
      const ini = await inicialNa(E, PACK, 4, t, o);                       // o Charmander: evolui no 16
      const [b1, b2, b3] = [16, 16, 19].map(dex => gerar(srv.db, { userId: uid, pack: PACK, dex }));
      const disco = () => D.carregar(deposito), achar = id => disco().criaturas.find(c => c.id === id);
      await sincronizar(api, deposito);

      /* O time: tirar, pôr, trocar — e a recusa do servidor na forma de sempre. */
      igual((await moverNa({ id: b1.id, paraCaixa: true }, o)).ok, true, 'tirar do time pela conta');
      igual(`${achar(b1.id).naCaixa}|${srv.db.prepare(`SELECT na_caixa n FROM criaturas WHERE id = ?`).get(b1.id).n}`, 'true|1', 'a caixa da conta não chegou ao disco');
      igual((await trocarNa({ sai: b2.id, entra: b1.id }, o)).ok, true, 'a troca pela conta');
      igual(`${achar(b1.id).naCaixa}|${achar(b2.id).naCaixa}`, 'false|true', 'a troca da conta não chegou ao disco');
      const r0 = await moverNa({ id: 'nao-existe', paraCaixa: true }, o);
      ok(r0.ok === false && r0.motivo && !/não respondeu/.test(r0.motivo), `a recusa do servidor não veio com a frase dele: ${JSON.stringify(r0)}`);

      /* Soltar o 16 da caixa dá o doce da linha; o doce vai para o outro 16. */
      const sol = await soltarNa({ pack: PACK, id: b2.id }, o);
      ok(sol.ok && sol.doce > 0 && !achar(b2.id), `soltar pela conta: ${JSON.stringify(sol)}`);
      const xpAntes = achar(b1.id).xp ?? 0;
      const doce = await darDoceNa({ pack: PACK, id: b1.id }, o);
      ok(doce.ok && (achar(b1.id).xp ?? 0) > xpAntes, `o doce da conta não virou XP no disco: ${JSON.stringify(doce)}`);

      /* O golpe: a recusa do servidor chega; sem conta, a função da tela roda. */
      const g = await naContaOu('/api/idle/golpe', { id: b3.id, nome: 'Golpe Inventado' }, () => ({ ok: true, local: true }), o);
      ok(g.ok === false && !g.local, 'o golpe com conta rodou a função do aparelho');
      const gl = await naContaOu('/api/idle/golpe', {}, () => ({ ok: true, local: true }), { ...o, conta: false });
      ok(gl.local, 'sem conta, o golpe não rodou a função do aparelho');

      /* Na aba: a caixa pelo cartão, a evolução (de e para) e o foco. */
      Object.assign(E, disco());
      await moverNaTela(E, b3.id, true, o);
      ok(E.criaturas.find(c => c.id === b3.id).naCaixa && D.salvar(E, deposito), 'a caixa pelo cartão não relê a conta no estado da aba (ou o save seguinte conflita)');
      srv.db.prepare(`UPDATE criaturas SET nivel = 16, xp = ? WHERE id = ?`).run(xpParaNivel(16), ini.id);
      await sincronizar(api, deposito); Object.assign(E, disco());
      const i = E.criaturas.findIndex(c => c.id === ini.id);
      const ev = await evoluirNa(E, PACK, i, o);
      igual(`${ev.de}|${ev.para}|${E.criaturas.find(c => c.id === ini.id).dex}`, '4|5|5', 'a evolução da conta sem o antes e o depois, ou sem chegar à aba');
      const nova = await focoNa(E, E.criaturas.find(c => c.id === ini.id), 'vigia', t, o);
      igual(`${nova?.foco}|${E.criaturas.find(c => c.id === ini.id).foco}`, 'vigia|vigia', 'o foco da conta não voltou, ou não chegou à aba');
      ok(D.salvar(E, deposito), 'o save da aba depois do foco da conta conflita');
    } finally { await srv.fechar(); }
  });

  s.teste('sem conta, a ação é a do aparelho, e o servidor nem é chamado', async () => {
    const pedidos = [];
    const api = { temSessao: () => false, post: async r => { pedidos.push(r); return { ok: false }; }, get: async r => { pedidos.push(r); return { ok: false }; } };
    const deposito = armazemFalso(), E = D.carregar(deposito);
    await inicialNa(E, PACK, PACK.iniciais[0], T0, { api, deposito });
    igual(`${E.criaturas.length}|${pedidos.length}`, '1|0', 'sem conta, a inicial foi ao servidor');
    /* A coleção também: sem conta, a gravação do aparelho (a recusa dele, com a frase dele). */
    D.salvar(E, deposito);   // como a tela faz depois da inicial
    const r = await moverNa({ id: E.criaturas[0].id, paraCaixa: true }, { api, deposito });
    ok(r.ok === false && /time|vazi|equipe/i.test(r.motivo ?? '') && pedidos.length === 0, `sem conta, a caixa foi ao servidor: ${JSON.stringify(r)}`);
  });

  return s;
}
