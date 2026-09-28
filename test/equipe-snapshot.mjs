/* Q1/Q3/Q6 · O SNAPSHOT DE DEFESA DA LIGA (ST-11.1 · F5.1 · Spec §9.4)
 *
 * A AFIRMAÇÃO CENTRAL é dupla:
 *
 *   IDENTIDADE   o time congelado é o que o motor luta — as mesmas entradas
 *                que a luta da jornada monta para as mesmas criaturas
 *   IMUTÁVEL     evoluir, dar doce ou trocar golpe DEPOIS não muda o que foi
 *                congelado; e o banco recusa UPDATE e DELETE na tabela
 *
 * Em volta: a posse (o id de outro jogador é "não é sua"), as versões (a das
 * regras e a impressão do conteúdo, que muda quando um golpe muda), a
 * migração que sobe e desce, e a porta.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { trocarGolpeNaConta, moverNaConta } from '../server/colecao.mjs';
import { criarSnapshot, snapshotDe, snapshotsDe, ERRO_EQUIPE } from '../server/equipe.mjs';
import { criaturasParaLuta } from '../server/jornada.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { snapshotDoTime, timeDoSnapshot, conteudoDaLuta } from '../app/modules/snapshot-dados.mjs';
import { contaDaLuta } from '../app/modules/jornada-conta.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { simular, VERSAO_TBE } from '../engine/treino-batalha.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('liga0'), conta('liga1')];
  const ids = [[4, 18], [7, 17], [1, 16], [25, 15], [16, 14], [19, 13], [133, 20]].map(([dex, nivel], i) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = ?, criada_em = ? WHERE id = ?`).run(xpParaNivel(nivel), i === 6 ? 1 : 0, T0 + i, c.id);
    return c.id;
  });
  const dele = gerar(db, { userId: v, pack: PACK, dex: 143, origem: 'captura' }).id;
  return { db, u, v, ids, dele };
}

export function suite() {
  const s = criarSuite('equipe-snapshot');

  s.teste('a identidade: o time congelado é o que a luta monta, e luta igual', () => {
    const c = cena();
    const equipe = c.ids.slice(0, 6);
    const snap = criarSnapshot(c.db, { userId: c.u, pack: PACK, ids: equipe, preset: 'aggressive', agora: T0 });
    /* A luta da jornada monta o time pela equipe (quem não está na caixa): as mesmas seis. */
    const luta = contaDaLuta({ pack: PACK, criaturas: criaturasParaLuta(c.db, c.u, PACK), jornada: null, id: 'rota1', semente: 5, dia: 1 });
    igual(JSON.stringify(timeDoSnapshot(snap)), JSON.stringify(luta.timeA), 'o snapshot não é o time que a luta monta');
    ok(timeDoSnapshot(snap).every(x => Array.isArray(x.iv) && x.iv.length === 6 && typeof x.natureza === 'string'), 'o snapshot sem o IV ou a natureza — lutaria outra luta');
    /* E luta igual: a mesma semente, o mesmo resultado, pelo gravado. */
    const gravado = snapshotDe(c.db, { userId: c.u, id: snap.id });
    igual(JSON.stringify(simular(PACK, timeDoSnapshot(gravado), luta.timeB, 9, { preset: gravado.preset })),
          JSON.stringify(simular(PACK, luta.timeA, luta.timeB, 9, { preset: 'aggressive' })), 'o snapshot gravado luta outra luta');
    igual(`${gravado.preset}|${gravado.versaoMotor}|${gravado.versaoConteudo}`, `aggressive|${VERSAO_TBE}|${conteudoDaLuta(PACK)}`, 'as versões e o preset');
    igual(gravado.power, gravado.time.reduce((a, x) => a + x.power, 0), 'o power do time não é a soma');
    ok(gravado.power > 0, 'o power zerado');
    /* A caixa pode entrar: o time da Liga é escolhido, não é a equipe do idle. */
    ok(criarSnapshot(c.db, { userId: c.u, pack: PACK, ids: [c.ids[6], c.ids[0]], agora: T0 + 1 }).time.length === 2, 'a criatura da caixa recusada');
  });

  s.teste('imutável: mudar a criatura depois não muda o congelado, e o banco recusa UPDATE e DELETE', () => {
    const c = cena();
    const snap = criarSnapshot(c.db, { userId: c.u, pack: PACK, ids: c.ids.slice(0, 3), agora: T0 });
    const antes = JSON.stringify(snapshotDe(c.db, { userId: c.u, id: snap.id }));
    /* Depois: sobe de nível, troca golpe, vai para a caixa. */
    c.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(40), c.ids[0]);
    const tirar = padraoDoMoveset(PACK, 7, 17)[0];
    trocarGolpeNaConta(c.db, { userId: c.u, pack: PACK, id: c.ids[1], nome: tirar });
    moverNaConta(c.db, { userId: c.u, id: c.ids[2], paraCaixa: true });
    igual(JSON.stringify(snapshotDe(c.db, { userId: c.u, id: snap.id })), antes, 'o snapshot mudou com a criatura');
    /* E o novo congela o novo. */
    const novo = criarSnapshot(c.db, { userId: c.u, pack: PACK, ids: c.ids.slice(0, 3), agora: T0 + 1 });
    ok(novo.time[0].nivel > snap.time[0].nivel, 'o snapshot novo não viu o nível novo');
    for (const [sql, o] of [[`UPDATE team_snapshots SET power = 0 WHERE id = ?`, 'UPDATE'], [`DELETE FROM team_snapshots WHERE id = ?`, 'DELETE']])
      ok(/imutável/.test(recusa(() => c.db.prepare(sql).run(snap.id))?.message ?? ''), `o banco aceitou ${o}`);
    igual(JSON.stringify(snapshotDe(c.db, { userId: c.u, id: snap.id })), antes, 'o UPDATE recusado mudou alguma coisa');
  });

  s.teste('a posse e o pedido: cada recusa com a sua frase', () => {
    const c = cena();
    const motivo = (ids, preset) => recusa(() => criarSnapshot(c.db, { userId: c.u, pack: PACK, ids, preset, agora: T0 }));
    igual(motivo([c.ids[0], c.dele])?.message, 'essa criatura não é sua', 'o id de outro jogador');
    igual(motivo([c.ids[0], 'nao-existe'])?.message, 'essa criatura não é sua', 'o id que não existe');
    igual(motivo([])?.message, 'o time tem de 1 a 6 criaturas', 'o time vazio');
    igual(motivo([...c.ids.slice(0, 6), c.ids[6]])?.message, 'o time tem de 1 a 6 criaturas', 'sete');
    igual(motivo([c.ids[0], c.ids[0]])?.message, 'a mesma criatura duas vezes no time', 'a repetida');
    igual(motivo([c.ids[0]], 'turbo')?.message, 'preset desconhecido: turbo', 'o preset');
    igual(motivo([c.ids[0], c.dele])?.codigo, ERRO_EQUIPE.TIME, 'o código da recusa');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM team_snapshots`).get().n, 0, 'uma recusa gravou');
    /* O de outro jogador não existe para quem pede. */
    const meu = criarSnapshot(c.db, { userId: c.u, pack: PACK, ids: [c.ids[0]], agora: T0 });
    igual(recusa(() => snapshotDe(c.db, { userId: c.v, id: meu.id }))?.codigo, ERRO_EQUIPE.SEM_SNAPSHOT, 'B leu o time de A');
    igual(snapshotsDe(c.db, c.v).length, 0, 'a lista de B traz o time de A');
  });

  s.teste('as versões: a impressão do conteúdo muda quando o que a luta lê muda, e só então', () => {
    const base = conteudoDaLuta(PACK);
    igual(conteudoDaLuta(PACK), base, 'a impressão não é determinística');
    igual(conteudoDaLuta({ ...PACK, jornada: [], marca: 'outra' }), base, 'o que a luta não lê mudou a impressão');
    const golpes = structuredClone(PACK.golpes), [tipo] = Object.keys(golpes);
    golpes[tipo][0] = { ...golpes[tipo][0], p: golpes[tipo][0].p + 5 };
    ok(conteudoDaLuta({ ...PACK, golpes }) !== base, 'a força de um golpe mudou e a impressão não');
    const especies = PACK.especies.map((e, i) => (i ? e : { ...e, s: e.s.map(x => x + 1) }));
    ok(conteudoDaLuta({ ...PACK, especies }) !== base, 'o stat de uma espécie mudou e a impressão não');
    ok(conteudoDaLuta({ ...PACK, lendarios: [] }) !== base, 'o lendário ficou fora da impressão');
    ok(/^[0-9a-f]{8}$/.test(base), 'a impressão fora do formato');
    /* A conta pura recusa sem banco, e não muda a entrada. */
    const crs = [{ id: 'a', dex: 4, xp: xpParaNivel(10), iv: [15, 15, 15, 15, 15, 15], natureza: 'Hardy' }];
    const foto = JSON.stringify(crs);
    ok(snapshotDoTime({ pack: PACK, criaturas: crs, ids: ['a'] }).ok, 'a conta pura recusou um time válido');
    igual(JSON.stringify(crs), foto, 'a conta mexeu nas criaturas');
  });

  s.teste('a migração sobe e desce, e os gatilhos saem com ela', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'equipe-st11.1');
    ok(m, 'a migração não existe');
    m.desce(db);
    igual(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('team_snapshots', 'snapshot_sem_update', 'snapshot_sem_delete')`).get().n, 0, 'a descida deixou restos');
    m.sobe(db);
    igual(db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('team_snapshots', 'snapshot_sem_update', 'snapshot_sem_delete')`).get().n, 3, 'a subida não refez tudo');
  });

  s.teste('pela porta: congelar, listar, e o time de outro jogador recusado', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const pedir = (metodo, caminho, corpo, sessao) => fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
      [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${sessao}`, 'content-type': 'application/json' }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
      .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      const contas = [];
      for (const nome of ['Liga0', 'Liga1']) {
        const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
          body: JSON.stringify({ username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
        contas.push({ sessao: cad.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id });
      }
      const [a, b] = contas;
      const ids = [4, 7].map(dex => gerar(srv.db, { userId: a.id, pack: PACK, dex }).id);
      const r = await pedir('POST', '/api/equipe/snapshot', { ids, preset: 'defensive', nivel: 99 }, a.sessao);
      igual(r.status, 200, `congelar: ${JSON.stringify(r.corpo)?.slice(0, 160)}`);
      ok(r.corpo.snapshot.time.every(x => x.nivel < 99), 'o nível do corpo foi usado');
      igual((await pedir('POST', '/api/equipe/snapshot', { ids }, b.sessao)).status, 400, 'B congelou o time de A');
      igual((await pedir('POST', '/api/equipe/snapshot', { ids: 'x' }, a.sessao)).status, 400, 'ids em texto');
      igual((await pedir('POST', '/api/equipe/snapshot', { ids: [7] }, a.sessao)).status, 400, 'id em número');
      igual((await pedir('GET', '/api/equipe/snapshots', null, a.sessao)).corpo.snapshots.length, 1, 'a lista de A');
      igual((await pedir('GET', '/api/equipe/snapshots', null, b.sessao)).corpo.snapshots.length, 0, 'B vê o time de A');
      igual((await pedir('GET', '/api/equipe/snapshots', null, 'sessao-falsa')).status, 401, 'sem sessão');
    } finally { await srv.fechar(); }
  });

  return s;
}
