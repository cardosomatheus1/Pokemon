/* Q1/Q3/Q6 · A COLEÇÃO NO SERVIDOR (ST-13.1 · E13 · Spec §7.14, §P2)
 *
 * A primeira rota do idle com conta. Quatro afirmações, e as quatro são o
 * aceite da ficha:
 *
 *   1. só com sessão, e só o de quem pediu — o de outro é invisível, mesmo
 *      pedido pelo nome na query
 *   2. o cliente não escreve criatura, item nem fragmento direto: sob
 *      `/api/idle` só existe a leitura e as operações NOMEADAS da lista
 *   3. a leitura não devolve a semente (a chave da auditoria) nem o dono, e
 *      só a coleção do pack que o produto carrega
 *   4. o relógio é o do servidor: a stamina, a expedição pronta e o estágio
 *      saem das mesmas funções do motor, no `agora` dele
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import original from '../content/original_v1.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, creditarBolsa, creditarRegistro } from '../server/idle.mjs';
import { STAMINA_MAX, PERFIS, staminaAgora } from '../engine/expedicao.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 27, 12);
const H = 3600_000;

async function montar() {
  let t = T0;
  const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
  const porta = await srv.ouvir(0);
  const pedir = (caminho, { metodo = 'GET', corpo, sessao } = {}) =>
    fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
      [CABECALHO_VERSAO]: API_VERSAO, ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
      ...(corpo ? { 'content-type': 'application/json' } : {}) }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
      .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
  let n = 0;
  const conta = async () => {
    const nome = `Colec${n++}`;
    const cad = await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: { username: nome, email: `${nome}@x.test`,
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' } });
    return { sessao: cad.corpo.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id };
  };
  return { srv, pedir, conta, agora: () => t, avancar: ms => { t += ms; } };
}

/* O jogador A com três criaturas, uma expedição em campo, bolsa e registro;
   o B com uma criatura, uma bola e um fragmento. */
function povoar(c, a, b) {
  const db = c.srv.db;
  const ca = [1, 4, 7].map(dex => gerar(db, { userId: a.id, pack: PACK, dex, origem: 'inicial' }));
  const cb = gerar(db, { userId: b.id, pack: PACK, dex: 25 });
  creditarBolsa(db, a.id, 'bola', 5); creditarBolsa(db, a.id, 'bola_boa', 2);
  creditarBolsa(db, b.id, 'bola', 1);
  creditarRegistro(db, a.id, PACK.id, 16, 3, c.agora());
  creditarRegistro(db, b.id, PACK.id, 19, 1, c.agora());
  const exp = iniciar(db, { userId: a.id, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [ca[0].id], agora: c.agora() });
  return { ca, cb, exp };
}

export async function suite() {
  const s = criarSuite('colecao-servidor');

  s.teste('sem sessão, 401; com sessão, a coleção de QUEM PEDIU — o de outro é invisível, mesmo pedido na query', async () => {
    const c = await montar();
    try {
      const [a, b] = [await c.conta(), await c.conta()];
      const { ca, cb } = povoar(c, a, b);
      igual((await c.pedir('/api/idle')).status, 401, 'a coleção sem sessão');
      const r = await c.pedir(`/api/idle?userId=${b.id}&user=${b.id}`, { sessao: a.sessao });
      igual(r.status, 200, `a coleção com sessão: ${JSON.stringify(r.corpo)}`);
      igual(r.corpo.criaturas.map(x => x.id).sort().join(), ca.map(x => x.id).sort().join(), 'as criaturas de A');
      /* + o kit de quem começa (ST-2.12): A tem criatura, então a leitura o garante */
      igual(JSON.stringify(r.corpo.bolsa), JSON.stringify({ bola: 5, bola_boa: 2, pocao: PACK.kitInicial.pocao, poke: PACK.kitInicial.poke }), 'a bolsa de A');
      igual(JSON.stringify(r.corpo.registro.map(x => [x.dex, x.fragmentos])), '[[16,3]]', 'o registro de A');
      const texto = JSON.stringify(r.corpo);
      ok(!texto.includes(cb.id) && !texto.includes(b.id), 'algo de B vazou na coleção de A');
      const rb = await c.pedir('/api/idle', { sessao: b.sessao });
      igual(rb.corpo.criaturas.map(x => x.dex).join(), '25', 'as criaturas de B');
      igual(rb.corpo.expedicoes.length, 0, 'a expedição de A apareceu para B');
      igual(rb.corpo.registro.map(x => x.dex).join(), '19', 'o registro de B');
    } finally { await c.srv.fechar(); }
  });

  s.teste('o cliente não escreve a coleção: sob /api/idle só a leitura e as operações NOMEADAS', async () => {
    const { ROTAS } = await import('../server/rotas.mjs');
    const { OPERACOES_DO_IDLE } = await import('../server/colecao-rotas.mjs');
    const doIdle = Object.keys(ROTAS).filter(k => / \/api\/idle(\/|$)/.test(k)).sort();
    igual(doIdle.join(' | '), ['GET /api/idle', ...OPERACOES_DO_IDLE].sort().join(' | '),
      'uma rota sob /api/idle fora da lista de operações nomeadas');
    ok(OPERACOES_DO_IDLE.every(k => k.startsWith('POST /api/idle/')), 'operação que não é POST nomeado');
    ok(!Object.keys(ROTAS).some(k => /^(PUT|PATCH|DELETE) /.test(k)), 'existe rota que regrava um recurso inteiro');
    const c = await montar();
    try {
      const [a, b] = [await c.conta(), await c.conta()];
      povoar(c, a, b);
      const antes = JSON.stringify((await c.pedir('/api/idle', { sessao: a.sessao })).corpo);
      const forjado = { criaturas: [{ id: 'x', dex: 150, nivel: 100 }], bolsa: { bola_mestra: 99 }, registro: [{ dex: 151, fragmentos: 999 }] };
      for (const [metodo, caminho] of [['PUT', '/api/idle'], ['POST', '/api/idle'], ['PATCH', '/api/idle'],
                                       ['POST', '/api/idle/criaturas'], ['POST', '/api/idle/bolsa'], ['POST', '/api/idle/registro']])
        igual((await c.pedir(caminho, { metodo, sessao: a.sessao, corpo: forjado })).status, 404, `${metodo} ${caminho} existe`);
      igual(JSON.stringify((await c.pedir('/api/idle', { sessao: a.sessao })).corpo), antes, 'a coleção mudou depois das escritas recusadas');
    } finally { await c.srv.fechar(); }
  });

  s.teste('a leitura não devolve a semente nem o dono; só o pack que o produto carrega', async () => {
    const c = await montar();
    try {
      const [a, b] = [await c.conta(), await c.conta()];
      const { ca } = povoar(c, a, b);
      gerar(c.srv.db, { userId: a.id, pack: original, dex: 1 });
      const r = (await c.pedir('/api/idle', { sessao: a.sessao })).corpo;
      igual(r.pack, PACK.id, 'o pack da coleção');
      igual(r.criaturas.length, ca.length, 'a criatura do outro pack entrou');
      const sementes = c.srv.db.prepare(`SELECT semente FROM criaturas WHERE user_id = ?`).all(a.id).map(l => l.semente);
      const texto = JSON.stringify(r);
      ok(sementes.every(sm => !texto.includes(sm)), 'a semente dos ocultos vazou na leitura');
      ok(r.criaturas.every(x => !('dono' in x) && !('semente' in x) && !('pack' in x)), 'campo a mais na criatura');
      const c0 = r.criaturas.find(x => x.id === ca[0].id);
      igual(JSON.stringify(c0.iv), JSON.stringify(ca[0].iv), 'os ocultos da criatura');
      igual(c0.dex, 1, 'o dex'); igual(c0.natureza, ca[0].natureza.nome, 'a natureza pelo nome');
    } finally { await c.srv.fechar(); }
  });

  s.teste('o relógio é o do servidor: stamina, expedição pronta e estágio saem do motor no agora dele', async () => {
    const c = await montar();
    try {
      const [a, b] = [await c.conta(), await c.conta()];
      const { ca, exp } = povoar(c, a, b);
      let r = (await c.pedir('/api/idle', { sessao: a.sessao })).corpo;
      igual(r.agora, c.agora(), 'o agora da resposta');
      const enviada = r.criaturas.find(x => x.id === ca[0].id);
      igual(enviada.stamina, STAMINA_MAX - PERFIS.batida.custo, 'a stamina logo depois de enviar');
      igual(r.criaturas.find(x => x.id === ca[1].id).stamina, STAMINA_MAX, 'a stamina de quem ficou');
      igual(r.expedicoes.length, 1, 'a expedição em campo');
      igual(r.expedicoes[0].pronta, false, 'a expedição pronta antes da hora');
      igual(JSON.stringify(r.expedicoes[0].equipe), JSON.stringify([ca[0].id]), 'a equipe');
      ok(!('semente' in r.expedicoes[0]), 'a expedição carrega semente');
      igual(r.estagio.aberto, 1, 'o estágio com todos no nível 1');
      igual(r.estagio.proximo?.nivel, 12, 'a próxima porta');
      c.avancar(PERFIS.batida.minutos * 60_000 + H);
      c.srv.db.prepare(`UPDATE criaturas SET nivel = 12 WHERE id = ?`).run(ca[2].id);
      r = (await c.pedir('/api/idle', { sessao: a.sessao })).corpo;
      igual(r.expedicoes[0].pronta, true, 'a expedição não ficou pronta no relógio do servidor');
      const linha = c.srv.db.prepare(`SELECT stamina, stamina_em FROM criaturas WHERE id = ?`).get(ca[0].id);
      igual(r.criaturas.find(x => x.id === ca[0].id).stamina,
        Math.round(staminaAgora({ stamina: linha.stamina, staminaEm: linha.stamina_em }, c.agora())), 'a stamina recuperada');
      ok(r.criaturas.find(x => x.id === ca[0].id).stamina > enviada.stamina, 'a stamina não recuperou com o tempo');
      igual(r.estagio.aberto, 2, 'o estágio não abriu com a criatura no nível 12');
      ok(Number.isFinite(r.teto.restam), 'o teto sem número');
    } finally { await c.srv.fechar(); }
  });

  return s;
}
