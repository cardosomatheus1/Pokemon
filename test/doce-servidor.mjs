/* Q1/Q3/Q6/Q8/Q9 · O DOCE DA CONTA REAL (ST-9.9 · F3.8 · Spec §7.8, §P2, §16.2)
 *
 * O doce nasce DENTRO da transação da liquidação (uma falha depois do crédito
 * desfaz aposta e doce juntos), é igual para 50 e 5.000, não nasce em pausa
 * nem em aposta cancelada, e desce ao aparelho por um resgate idempotente que
 * só a sessão do dono faz — e cuja quantidade nunca vem do pedido.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { apostar, cancelar, liquidarRodada } from '../server/aposta.mjs';
import { pausar } from '../server/protecao.mjs';
import { docesDe, resgatarDoces } from '../server/doce.mjs';
import { eventosDe } from '../server/telemetria.mjs';
import { baseDe } from '../engine/evolucao.mjs';
import { DOCE_VITORIA, DOCE_DERROTA } from '../engine/doce.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);

function montar() {
  let t = T0;
  const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => t });
  let n = 0;
  const conta = () => {
    const id = cadastrar(srv.db, { username: `d${n}`, email: `d${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: t }).id;
    creditar(srv.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 20000, idem: `w${n++}`, agora: t });
    return id;
  };
  /* O favorito (odd mais baixa): 5.000 nele cabe no teto por bilhete. */
  const favorito = rid => srv.db.prepare(`SELECT slot, species_id FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(rid);
  const encerrar = () => {
    for (let i = 0; i < 300 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
  };
  const ledgerBate = () => {
    const livro = srv.db.prepare(`SELECT user_id, species_id, SUM(delta) AS s FROM candy_ledger GROUP BY user_id, species_id`).all();
    return livro.every(l => (srv.db.prepare(`SELECT quantidade FROM species_candy WHERE user_id = ? AND species_id = ?`)
      .get(l.user_id, l.species_id)?.quantidade ?? 0) === l.s);
  };
  return { srv, conta, favorito, encerrar, ledgerBate, agora: () => t, avancar: ms => { t += ms; } };
}

export async function suite() {
  const s = criarSuite('doce-servidor');

  s.teste('a liquidação credita a LINHA: vitória e derrota, 50 e 5.000 iguais; o livro bate com o saldo', async () => {
    const c = montar();
    try {
      const r = c.srv.sched.abrirRodada();
      const fav = c.favorito(r.id);
      const outro = c.srv.db.prepare(`SELECT slot, species_id FROM round_fighters WHERE round_id = ? AND slot != ? LIMIT 1`).get(r.id, fav.slot);
      const [a, b, x] = [c.conta(), c.conta(), c.conta()];
      apostar(c.srv.db, { sched: c.srv.sched, userId: a, slot: fav.slot, valor: 50, agora: c.agora() });
      apostar(c.srv.db, { sched: c.srv.sched, userId: b, slot: fav.slot, valor: 5000, agora: c.agora() });
      apostar(c.srv.db, { sched: c.srv.sched, userId: x, slot: outro.slot, valor: 50, agora: c.agora() });
      c.encerrar(); c.srv.laco.passo();
      const campeao = c.srv.db.prepare(`SELECT champion_species_id AS k FROM rounds WHERE id = ?`).get(r.id).k;
      const docesDoFav = fav.species_id === campeao ? DOCE_VITORIA : DOCE_DERROTA;
      igual(JSON.stringify(docesDe(c.srv.db, a)), JSON.stringify({ [baseDe(pack, fav.species_id)]: docesDoFav }), '50 no favorito');
      igual(JSON.stringify(docesDe(c.srv.db, b)), JSON.stringify(docesDe(c.srv.db, a)), '50 e 5.000 deram doces diferentes');
      const docesDoOutro = outro.species_id === campeao ? DOCE_VITORIA : DOCE_DERROTA;
      igual(docesDe(c.srv.db, x)[baseDe(pack, outro.species_id)], docesDoOutro, 'o outro lutador');
      ok(c.ledgerBate(), 'a soma do candy_ledger não bate com o species_candy');
      igual(eventosDe(c.srv.db, { nome: 'candy_credited' }).length, 3, 'o evento candy_credited não saiu uma vez por bilhete');
      /* Liquidar de novo não credita de novo. */
      liquidarRodada(c.srv.db, { sched: c.srv.sched, roundId: r.id, agora: c.agora() });
      igual(docesDe(c.srv.db, a)[baseDe(pack, fav.species_id)], docesDoFav, 'reliquidar creditou de novo');
    } finally { await c.srv.fechar(); }
  });

  s.teste('uma falha DEPOIS do crédito desfaz a aposta e o doce juntos', async () => {
    const c = montar();
    try {
      const r = c.srv.sched.abrirRodada();
      const u = c.conta();
      apostar(c.srv.db, { sched: c.srv.sched, userId: u, slot: c.favorito(r.id).slot, valor: 100, agora: c.agora() });
      c.encerrar();
      /* A falha forçada: o fecho do bilhete (UPDATE bets) vem DEPOIS do doce. */
      c.srv.db.exec(`CREATE TRIGGER falha_forcada BEFORE UPDATE ON bets BEGIN SELECT RAISE(ABORT, 'falha forçada'); END`);
      let caiu = false;
      try { liquidarRodada(c.srv.db, { sched: c.srv.sched, roundId: r.id, agora: c.agora() }); } catch { caiu = true; }
      ok(caiu, 'a falha forçada não chegou');
      igual(c.srv.db.prepare(`SELECT COUNT(*) AS k FROM candy_ledger`).get().k, 0, 'o doce ficou sem a aposta');
      igual(c.srv.db.prepare(`SELECT status FROM bets`).get().status, 'travada', 'o bilhete não voltou');
      igual(c.srv.db.prepare(`SELECT COUNT(*) AS k FROM wallet_ledger WHERE idem_key LIKE 'settle-%'`).get().k, 0,
        'o pagamento ficou sem o bilhete');
      c.srv.db.exec(`DROP TRIGGER falha_forcada`);
      liquidarRodada(c.srv.db, { sched: c.srv.sched, roundId: r.id, agora: c.agora() });
      igual(c.srv.db.prepare(`SELECT COUNT(*) AS k FROM candy_ledger`).get().k, 1, 'depois da falha, não creditou uma vez');
    } finally { await c.srv.fechar(); }
  });

  s.teste('aposta cancelada e conta em pausa rendem 0', async () => {
    const c = montar();
    try {
      const r = c.srv.sched.abrirRodada();
      const [cancela, pausa] = [c.conta(), c.conta()];
      const slot = c.favorito(r.id).slot;
      apostar(c.srv.db, { sched: c.srv.sched, userId: cancela, slot, valor: 100, agora: c.agora() });
      cancelar(c.srv.db, { sched: c.srv.sched, userId: cancela, agora: c.agora() });
      apostar(c.srv.db, { sched: c.srv.sched, userId: pausa, slot, valor: 100, agora: c.agora() });
      pausar(c.srv.db, { userId: pausa, tipo: 'cooloff', duracao: '24h', agora: c.agora() });
      c.encerrar(); c.srv.laco.passo();
      igual(JSON.stringify(docesDe(c.srv.db, cancela)), '{}', 'aposta cancelada rendeu doce');
      igual(JSON.stringify(docesDe(c.srv.db, pausa)), '{}', 'conta em pausa rendeu doce (§28.4)');
      igual(c.srv.db.prepare(`SELECT status FROM bets WHERE user_id = ?`).get(pausa).status !== 'travada', true, 'a aposta em pausa nem liquidou');
    } finally { await c.srv.fechar(); }
  });

  s.teste('o resgate: só o dono, a quantidade nunca vem do pedido, a mesma chave dá a mesma resposta, e dois resgates entregam uma vez', async () => {
    const c = montar();
    const porta = await c.srv.ouvir(0);
    const pedir = (caminho, { metodo = 'GET', corpo, sessao } = {}) =>
      fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
        [CABECALHO_VERSAO]: API_VERSAO, ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
        ...(corpo ? { 'content-type': 'application/json' } : {}) }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
        .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      const cad = await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: { username: 'Doceiro', email: 'doce@x.test',
        senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' } });
      const { sessao } = cad.corpo; const uid = cad.corpo.usuario?.id ?? cad.corpo.id;
      const dono = c.srv.db.prepare(`SELECT id FROM users WHERE username = 'Doceiro'`).get().id;
      creditar(c.srv.db, { userId: dono, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 5000, idem: 'wd', agora: c.agora() });
      const r = c.srv.sched.abrirRodada();
      apostar(c.srv.db, { sched: c.srv.sched, userId: dono, slot: c.favorito(r.id).slot, valor: 100, agora: c.agora() });
      c.encerrar(); c.srv.laco.passo();
      const saldo = docesDe(c.srv.db, dono);
      ok(Object.keys(saldo).length === 1, `o dono não tem doce para resgatar: ${JSON.stringify(saldo)}`);
      igual((await pedir('/api/doces')).status, 401, 'o saldo de doce sem sessão');
      igual((await pedir('/api/doces/resgatar', { metodo: 'POST', corpo: { chaveIdem: 'chave-longa-1' } })).status, 401, 'resgatou sem sessão');
      igual((await pedir('/api/doces/resgatar', { metodo: 'POST', sessao, corpo: { chaveIdem: 'x' } })).status, 400, 'chave curta aceita');
      /* Dois resgates CONCORRENTES, chaves diferentes: entrega uma vez. Um
         deles ainda tenta forjar quantidade e dono pelo corpo. */
      const [a, b] = await Promise.all([
        pedir('/api/doces/resgatar', { metodo: 'POST', sessao, corpo: { chaveIdem: 'chave-longa-a', doces: { 4: 999 }, userId: 'outro' } }),
        pedir('/api/doces/resgatar', { metodo: 'POST', sessao, corpo: { chaveIdem: 'chave-longa-b' } })]);
      const entregue = [a, b].flatMap(x => Object.values(x.corpo.doces)).reduce((p, q) => p + q, 0);
      igual(entregue, Object.values(saldo)[0], `os dois resgates entregaram ${entregue}, havia ${Object.values(saldo)[0]}`);
      ok(!JSON.stringify(a.corpo).includes('999'), 'a quantidade forjada no pedido foi aceita');
      /* A mesma chave, a mesma resposta — e nada a mais sai. */
      const cheio = a.corpo.doces && Object.keys(a.corpo.doces).length ? 'chave-longa-a' : 'chave-longa-b';
      const antes = [a, b].find(x => Object.keys(x.corpo.doces).length).corpo.doces;
      const de_novo = await pedir('/api/doces/resgatar', { metodo: 'POST', sessao, corpo: { chaveIdem: cheio } });
      igual(JSON.stringify(de_novo.corpo.doces), JSON.stringify(antes), 'a mesma chave deu outra resposta');
      ok(de_novo.corpo.repetido, 'a repetição não se declara');
      igual(JSON.stringify(docesDe(c.srv.db, dono)), '{}', 'sobrou doce depois do resgate');
      ok(c.ledgerBate(), 'o livro não bate depois do resgate');
      /* Resgatar direto com o id de OUTRO usuário não existe como caminho: a
         função pede userId, e a rota o tira da sessão. */
      igual(JSON.stringify(resgatarDoces(c.srv.db, { userId: 'ninguem', chaveIdem: 'chave-longa-z' }).doces), '{}', 'o resgate de outro devolveu doce');
      void uid;
    } finally { await c.srv.fechar(); }
  });

  s.teste('no aparelho: o resgate credita uma vez por chave, e a chave é guardada ANTES do pedido', async () => {
    const { aplicarResgate } = await import('../app/modules/doce-dados.mjs');
    const { VAZIO } = await import('../app/modules/idle-dados.mjs');
    const e = VAZIO();
    igual(aplicarResgate(e, { chave: 'k1', doces: { 4: 3, 1: 1 } }).quantidade, 4, 'o resgate não creditou');
    ok(aplicarResgate(e, { chave: 'k1', doces: { 4: 3, 1: 1 } }).repetida, 'a mesma resposta creditou de novo');
    igual(JSON.stringify(e.doces), '{"1":1,"4":3}', 'o pote depois do resgate');
    const { readFileSync } = await import('node:fs');
    const conta = readFileSync(new URL('../app/modules/doce-conta.mjs', import.meta.url), 'utf8');
    ok(/const chave = ler\(\) \?\? novaChave\(\);\s*gravar\(chave\);\s*emVoo = api\.post\('\/api\/doces\/resgatar', \{ chaveIdem: chave \}\)/.test(conta),
      'a chave do resgate não é guardada antes do pedido — uma resposta perdida perderia o doce');
  });

  return s;
}
