/* Q1/Q3/Q6/Q8 · AS ROTAS DA RUN (ST-13.2c2 · E13 · Spec §7.22, §P2)
 *
 * A run do Avanço pela porta HTTP, no relógio do servidor:
 *
 *   começar, ler (a run avança na leitura), poção, recuar e colher
 *   a colheita é IDEMPOTENTE pela run: a segunda devolve a resposta gravada
 *   o corpo traz a intenção; raiz, instante e contrato do teto são do servidor
 *   as recusas viram status: ocupada e fora de ordem são 409, pedido torto 400
 *   a run de outro jogador não existe
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { creditarBolsa, iniciar } from '../server/idle.mjs';
import { gerar } from '../server/criaturas.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { waveAtual } from '../engine/run-avanco.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 14);
const MIN = 60_000;

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
    const nome = `Runner${n++}`;
    const cad = await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: { username: nome, email: `${nome}@x.test`,
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' } });
    const id = srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id;
    const post = (caminho, corpo = {}) => pedir(caminho, { metodo: 'POST', corpo, sessao: cad.corpo.sessao });
    const ini = (await post('/api/idle/inicial', { dex: PACK.iniciais[1] })).corpo.criatura;
    /* nível 20: a run anda algumas waves antes de cair */
    srv.db.prepare(`UPDATE criaturas SET xp = ?, nivel = 20 WHERE id = ?`).run(xpParaNivel(20), ini.id);
    return { id, ini, post, ler: async () => (await pedir('/api/idle', { sessao: cad.corpo.sessao })).corpo };
  };
  return { srv, conta, agora: () => t, avancar: ms => { t += ms; } };
}

export async function suite() {
  const s = criarSuite('run-rotas');

  s.teste('o caminho inteiro: começar, ler avançando, poção, recuar e colher — e a colheita repetida devolve a mesma resposta', async () => {
    const c = await montar();
    try {
      const a = await c.conta();
      c.srv.db.prepare('UPDATE criaturas SET dex=1,xp=0,o_hp=31,o_atq=31,o_def=31,o_spa=31,o_spd=31,o_vel=31,natureza=? WHERE id=?').run('Hardy',a.ini.id);
      const r = await a.post('/api/idle/run', { bioma: 'floresta', equipe: [a.ini.id], raiz: 'forjada', semEncontros: false, wave: 10, agora: T0 + 99 * MIN });
      igual(r.status, 200, `começar: ${JSON.stringify(r.corpo)}`);
      igual(r.corpo.run.iniciadaEm, T0, 'o instante veio do corpo');
      ok(r.corpo.run.raiz !== 'forjada', 'a raiz veio do corpo');
      igual(r.corpo.run.wave, 1, 'a wave veio do corpo');
      const hit=waveAtual(r.corpo.run,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.dano>0&&!m.caiu);
      ok(hit,'a fixture não oferece ferimento para testar cura');c.avancar(hit.t+1);
      const l = await a.ler();
      igual(l.run.id, r.corpo.run.id, 'a leitura não trouxe a run aberta');
      ok(l.run.eventos.length > r.corpo.run.eventos.length, 'a run não avançou na leitura');
      /* a poção: sem o item, 400; com ele e a barra já batida, cura e sai da bolsa.
         A SUPER, e não a comum: desde a ST-2.12 toda conta começa com 3 poções
         comuns (o kit), e "sem ter o item" precisa de um item que o kit não dá. */
      igual((await a.post('/api/idle/run/pocao', { item: 'superpocao' })).status, 400, 'poção sem ter o item');
      creditarBolsa(c.srv.db, a.id, 'superpocao', 2);
      ok(l.run.hpNaWave < 100, 'a barra ainda cheia no impacto — a cura não será exercitada');
      const p = await a.post('/api/idle/run/pocao', { item: 'superpocao' });
      igual(p.status, 200, `a poção: ${JSON.stringify(p.corpo)}`);
      ok(p.corpo.curou > 0, 'a poção não curou');
      igual((await a.ler()).bolsa.superpocao, 1, 'a poção não saiu da bolsa');
      const rec = await a.post('/api/idle/run/recuar');
      igual(rec.status, 200, `recuar: ${JSON.stringify(rec.corpo)}`);
      igual(rec.corpo.run.fim?.motivo, 'recuou', 'o recuo não terminou a run');
      igual((await a.post('/api/idle/run/recuar')).status, 409, 'recuou duas vezes');
      const col = await a.post('/api/idle/run/colher', { run: r.corpo.run.id });
      igual(col.status, 200, `colher: ${JSON.stringify(col.corpo)}`);
      ok(col.corpo.run.rendeu && col.corpo.run.colhidaEm === c.agora(), 'a colheita não pagou, ou no relógio do cliente');
      const bolsa = JSON.stringify((await a.ler()).bolsa);
      const de_novo = await a.post('/api/idle/run/colher', { run: r.corpo.run.id });
      igual(de_novo.status, 200, 'a segunda colheita');
      ok(de_novo.corpo.repetido === true, 'a segunda colheita não se declara repetida');
      igual(JSON.stringify(de_novo.corpo.run), JSON.stringify(col.corpo.run), 'a segunda colheita devolveu outra resposta');
      igual(JSON.stringify((await a.ler()).bolsa), bolsa, 'a segunda colheita creditou');
      igual((await a.ler()).run, null, 'a run colhida continua aberta');
    } finally { await c.srv.fechar(); }
  });

  s.teste('as recusas pela porta: ocupada, duas abertas, colher antes, a run de outro, e o pedido torto', async () => {
    const c = await montar();
    try {
      const a = await c.conta(), b = await c.conta();
      const outra = gerar(c.srv.db, { userId: a.id, pack: PACK, dex: 25 });
      iniciar(c.srv.db, { userId: a.id, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [outra.id], agora: T0 });
      igual((await a.post('/api/idle/run', { bioma: 'floresta', equipe: [outra.id] })).status, 400, 'a criatura da expedição entrou na run');
      igual((await a.post('/api/idle/run', { bioma: 'floresta', equipe: a.ini.id })).status, 400, 'equipe em texto');
      igual((await a.post('/api/idle/run', { bioma: 'floresta', equipe: [a.ini.id], estagio: '2' })).status, 400, 'estágio em texto');
      igual((await a.post('/api/idle/run/pocao', { item: 'pocao' })).status, 409, 'poção sem run');
      const r = (await a.post('/api/idle/run', { bioma: 'floresta', equipe: [a.ini.id] })).corpo.run;
      igual((await a.post('/api/idle/run', { bioma: 'floresta', equipe: [a.ini.id] })).status, 409, 'duas runs abertas');
      igual((await a.post('/api/idle/run/colher', { run: r.id })).status, 409, 'colheu a run em curso');
      igual((await b.post('/api/idle/run/colher', { run: r.id })).status, 404, 'colheu a run de outro');
      igual((await b.post('/api/idle/run/recuar')).status, 409, 'recuou a run de outro');
      ok((await a.ler()).run?.fim == null, 'a run de A foi mexida pelos pedidos de B');
      igual((await b.ler()).run, null, 'B vê a run de A');
    } finally { await c.srv.fechar(); }
  });

  s.teste('os encontros da run esperam bola pela mesma porta do lance', async () => {
    const c = await montar();
    try {
      const a = await c.conta();
      const r = (await a.post('/api/idle/run', { bioma: 'floresta', equipe: [a.ini.id] })).corpo.run;
      c.avancar(120 * MIN);
      const col = (await a.post('/api/idle/run/colher', { run: r.id })).corpo.run;
      const pend = (await a.ler()).encontros;
      igual(pend.length, col.encontros, 'os pendentes da run na leitura');
      ok(pend.length > 0, 'a run não rendeu encontro — o lance não foi exercitado');
      creditarBolsa(c.srv.db, a.id, 'ultra', 1);
      const l = await a.post('/api/idle/lancar', { chave: pend[0].chave, bola: 'ultra' });
      igual(l.status, 200, `o lance no encontro da run: ${JSON.stringify(l.corpo)}`);
      igual(l.corpo.dex, pend[0].dex, 'o dex do lance');
    } finally { await c.srv.fechar(); }
  });

  return s;
}
