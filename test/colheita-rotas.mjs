/* Q1/Q3/Q6/Q8 · AS ROTAS DA EXPEDIÇÃO E O LANCE PELO SERVIDOR (ST-13.2b · E13)
 *
 * O aceite da ficha, pela porta HTTP:
 *
 *   o RELÓGIO é o do servidor — um instante no corpo é ignorado, e relógio
 *   adiantado não colhe antes
 *   colher duas vezes colhe UMA, e a segunda devolve a resposta gravada
 *   o LANCE vai pela chave do encontro: o dex e a raridade são do banco, um
 *   encontro aceita um lance, e o de outro jogador não existe
 *   a mesma criatura duas vezes, ou uma que já está em campo, não sai
 *
 * E a emissão: um dia inteiro de expedições, com a mesma sorte, aceita e
 * recusa as MESMAS saídas no servidor e no aparelho, e termina com a mesma
 * bolsa — o teto e a colheita do servidor são os do cliente.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, colher, creditarBolsa, creditarRegistro, bolsaDe, encontrosHoje as encontrosNoServidor, especiesVistas } from '../server/idle.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { PERFIS, STAMINA_MAX, vagasPor } from '../engine/expedicao.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 27, 12);
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
    const nome = `Rota${n++}`;
    const cad = await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: { username: nome, email: `${nome}@x.test`,
      senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' } });
    const id = srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id;
    const post = (caminho, corpo) => pedir(caminho, { metodo: 'POST', corpo, sessao: cad.corpo.sessao });
    return { id, sessao: cad.corpo.sessao, post, ler: () => pedir('/api/idle', { sessao: cad.corpo.sessao }) };
  };
  return { srv, conta, agora: () => t, avancar: ms => { t += ms; } };
}

export async function suite() {
  const s = criarSuite('colheita-rotas');

  s.teste('a inicial: uma vez por conta, só entre as do pack; sem semente na resposta', async () => {
    const c = await montar();
    try {
      const a = await c.conta();
      igual((await a.post('/api/idle/inicial', { dex: 150 })).status, 409, 'uma inicial fora da lista');
      const r = await a.post('/api/idle/inicial', { dex: PACK.iniciais[0] });
      igual(r.status, 200, `a inicial: ${JSON.stringify(r.corpo)}`);
      igual(r.corpo.criatura.dex, PACK.iniciais[0], 'o dex da inicial');
      ok(!('semente' in r.corpo.criatura) && !('dono' in r.corpo.criatura), 'a inicial devolveu semente ou dono');
      igual((await a.post('/api/idle/inicial', { dex: PACK.iniciais[1] })).status, 409, 'a segunda inicial');
      igual((await a.ler()).corpo.criaturas.length, 1, 'a coleção depois das duas tentativas');
      igual((await a.post('/api/idle/inicial', { dex: '1' })).status, 400, 'dex em texto');
    } finally { await c.srv.fechar(); }
  });

  s.teste('o relógio é o do servidor: o instante do corpo é ignorado, e antes da hora não colhe', async () => {
    const c = await montar();
    try {
      const a = await c.conta();
      const ini = (await a.post('/api/idle/inicial', { dex: PACK.iniciais[0] })).corpo.criatura;
      const futuro = T0 + 30 * 24 * 60 * MIN;
      const x = await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [ini.id], agora: futuro, iniciadaEm: futuro });
      igual(x.status, 200, `a expedição: ${JSON.stringify(x.corpo)}`);
      igual(x.corpo.expedicao.iniciadaEm, T0, 'o início veio do corpo');
      igual(x.corpo.expedicao.terminaEm, T0 + PERFIS.batida.minutos * MIN, 'o fim não é o do relógio do servidor');
      const cedo = await a.post('/api/idle/colher', { expedicao: x.corpo.expedicao.id, agora: futuro });
      igual(cedo.status, 409, `colheu antes da hora com o relógio do cliente adiantado: ${JSON.stringify(cedo.corpo)}`);
      c.avancar(PERFIS.batida.minutos * MIN);
      const r1 = await a.post('/api/idle/colher', { expedicao: x.corpo.expedicao.id });
      igual(r1.status, 200, `a colheita na hora: ${JSON.stringify(r1.corpo)}`);
      const bolsa = JSON.stringify((await a.ler()).corpo.bolsa);
      const r2 = await a.post('/api/idle/colher', { expedicao: x.corpo.expedicao.id });
      igual(r2.status, 200, 'a segunda colheita não respondeu');
      ok(r2.corpo.repetido === true, 'a segunda colheita não se declara repetida');
      const { repetido, ...resto } = r2.corpo;
      igual(JSON.stringify(resto), JSON.stringify(r1.corpo), 'a segunda colheita devolveu outra resposta');
      igual(JSON.stringify((await a.ler()).corpo.bolsa), bolsa, 'a segunda colheita creditou');
      const b = await c.conta();
      igual((await b.post('/api/idle/colher', { expedicao: x.corpo.expedicao.id })).status, 404, 'colheu a expedição de outro');
    } finally { await c.srv.fechar(); }
  });

  s.teste('a equipe: a mesma criatura duas vezes, quem já está em campo, o estágio fechado e o tipo errado são recusados', async () => {
    const c = await montar();
    try {
      const a = await c.conta();
      const ini = (await a.post('/api/idle/inicial', { dex: PACK.iniciais[0] })).corpo.criatura;
      const outra = gerar(c.srv.db, { userId: a.id, pack: PACK, dex: 25 });
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [ini.id, ini.id] })).status, 400, 'a mesma criatura duas vezes');
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [ini.id], estagio: 2 })).status, 400, 'o estágio fechado');
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: ini.id })).status, 400, 'equipe em texto');
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [ini.id] })).status, 200, 'a primeira saída');
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [ini.id] })).status, 400, 'a mesma criatura em duas expedições');
      const b = await c.conta();
      igual((await b.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [outra.id] })).status, 400, 'mandou a criatura de outro');
      /* As VAGAS saem do registro do servidor (1.19): com uma, a segunda
         expedição espera; com dez espécies vistas, abre a segunda vaga. */
      igual((await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [outra.id] })).status, 400, 'a segunda expedição com uma vaga');
      for (let d = 10; d < 20; d++) creditarRegistro(c.srv.db, a.id, PACK.id, d, 1, c.agora());
      const v = await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'batida', equipe: [outra.id] });
      igual(v.status, 200, `a segunda vaga não abriu com o registro: ${JSON.stringify(v.corpo)}`);
    } finally { await c.srv.fechar(); }
  });

  s.teste('o lance vai pela CHAVE: o dex é o do encontro, um lance por encontro, e sem bola nada se perde', async () => {
    const c = await montar();
    try {
      const a = await c.conta(), b = await c.conta();
      const ini = (await a.post('/api/idle/inicial', { dex: PACK.iniciais[0] })).corpo.criatura;
      const x = (await a.post('/api/idle/expedicao', { bioma: 'floresta', perfil: 'vigilia', equipe: [ini.id] })).corpo.expedicao;
      c.avancar(PERFIS.vigilia.minutos * MIN);
      const col = (await a.post('/api/idle/colher', { expedicao: x.id })).corpo;
      const pend = (await a.ler()).corpo.encontros;
      igual(JSON.stringify(pend.map(p => p.chave)), JSON.stringify(col.encontros.map(p => p.chave).sort()), 'os pendentes da leitura');
      ok(pend.length >= 2, `a Vigília rendeu ${pend.length} encontros — preciso de dois`);
      const [p1, p2] = pend;
      c.srv.db.prepare(`DELETE FROM bolsa WHERE user_id = ? AND item_id = 'ultra'`).run(a.id);
      const sem = await a.post('/api/idle/lancar', { chave: p2.chave, bola: 'ultra' });
      igual(sem.status, 409, `lançou sem bola: ${JSON.stringify(sem.corpo)}`);
      ok((await a.ler()).corpo.encontros.some(p => p.chave === p2.chave), 'o encontro sumiu num lance sem bola');
      creditarBolsa(c.srv.db, a.id, 'ultra', 3);
      igual((await b.post('/api/idle/lancar', { chave: p1.chave, bola: 'ultra' })).status, 404, 'lançou no encontro de outro');
      const r = await a.post('/api/idle/lancar', { chave: p1.chave, bola: 'ultra', dex: 150, raridade: 'comum' });
      igual(r.status, 200, `o lance: ${JSON.stringify(r.corpo)}`);
      igual(r.corpo.dex, p1.dex, 'o dex do lance veio do pedido');
      if (r.corpo.capturou) igual(r.corpo.criatura.dex, p1.dex, 'a criatura capturada não é a do encontro');
      ok(!r.corpo.criatura || !('semente' in r.corpo.criatura), 'a criatura capturada veio com a semente');
      /* O SEGUNDO PEDIDO É RETRY, não lance (ST-14.1): devolve o MESMO recibo,
         marcado `repetida`, e não sorteia de novo nem gasta outra bola. Antes
         ele dava 404 — e quem perdeu a resposta achava que perdeu a bola. */
      const r2 = await a.post('/api/idle/lancar', { chave: p1.chave, bola: 'ultra' });
      igual(`${r2.status}|${r2.corpo.repetida}|${r2.corpo.capturou === r.corpo.capturou}|${r2.corpo.criatura?.id === r.corpo.criatura?.id}`, '200|true|true|true', 'o mesmo encontro aceitou dois lances');
      igual(bolsaDe(c.srv.db, a.id).find(x => x.item_id === 'ultra').quantidade, 2, 'a bola do lance recusado foi debitada');
    } finally { await c.srv.fechar(); }
  });

  s.teste('um dia inteiro com a mesma sorte: o servidor aceita e recusa as MESMAS saídas que o aparelho, e termina com a mesma bolsa', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const u = cadastrar(db, { username: 'dia', email: 'dia@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const e = D.VAZIO();
    for (const [i, dex] of [1, 4, 7].entries()) {
      const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'inicial' });
      db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ?, criada_em = ? WHERE id = ?`).run(STAMINA_MAX, T0, T0 + i, c.id);
      e.criaturas.push({ id: c.id, dex, iv: c.iv, natureza: c.natureza.nome, exemplar: c.exemplar, xp: 0, nivel: 1, vinculo: 0, foco: null, stamina: STAMINA_MAX, staminaEm: T0, origem: 'inicial', criadaEm: T0 + i });
    }
    const par = new Map();   // id do servidor -> id do aparelho
    const log = { servidor: [], aparelho: [] };
    let k = 0;
    for (let t = T0; t <= T0 + 36 * 60 * MIN; t += 30 * MIN) {
      /* colhe o que está pronto, na ordem do fim, com a MESMA raiz */
      const prontas = db.prepare(`SELECT id FROM expedicoes WHERE user_id = ? AND colhida_em IS NULL AND termina_em <= ? ORDER BY termina_em, id`).all(u, t);
      for (const { id } of prontas) {
        /* Raízes FIXAS: o número de saídas depende da sorte, e um teste cuja
           contagem muda a cada execução é instável — pior que vermelho. */
        const raiz = (0xd1a0000 + ++k).toString(16).padStart(32, '0');
        colher(db, { id, pack: PACK, agora: t, raiz });
        D.colher(e, { pack: PACK, id: par.get(id), agora: t, raiz, bonus: null });
      }
      /* e tenta mandar cada criatura parada, do perfil mais longo ao mais curto */
      for (const c of e.criaturas) for (const perfil of ['vigilia', 'trilha', 'batida']) {
        let sv = null, ap = null;
        try { sv = iniciar(db, { userId: u, pack: PACK, bioma: 'floresta', perfil, equipe: [c.id], agora: t,
                                 limiteSimultaneas: vagasPor(especiesVistas(db, u, PACK.id)) }); } catch {}
        try { ap = D.iniciarExpedicao(e, { pack: PACK, bioma: 'floresta', perfil, equipe: [c.id], agora: t }); } catch {}
        log.servidor.push(sv ? `${t}:${c.id}:${perfil}` : '-'); log.aparelho.push(ap ? `${t}:${c.id}:${perfil}` : '-');
        if (sv && ap) { par.set(sv.id, ap.id); break; }
        if (sv || ap) break;
      }
    }
    const saidas = log.servidor.filter(x => x !== '-').length;
    /* Medido com as raízes fixas: 5 saídas (uma vaga no começo, a segunda
       quando o registro chega a dez) e recusas pelo teto e pela stamina. */
    igual(saidas, 5, `o dia teve ${saidas} saídas`);
    ok(log.aparelho.includes('-'), 'nenhuma recusa no dia — o teto não foi exercitado');
    igual(log.servidor.join('|'), log.aparelho.join('|'), 'o servidor e o aparelho discordaram sobre alguma saída');
    const doServidor = Object.fromEntries(bolsaDe(db, u).map(b => [b.item_id, b.quantidade]).sort());
    const doAparelho = Object.fromEntries(Object.entries(e.bolsa).filter(([, n]) => n > 0).sort());
    igual(JSON.stringify(doServidor), JSON.stringify(doAparelho), 'a bolsa do dia diverge');
    const fim = T0 + 36 * 60 * MIN;
    igual(encontrosNoServidor(db, u, fim), D.encontrosHoje(e, fim), 'os encontros do teto divergem');
  });

  return s;
}
