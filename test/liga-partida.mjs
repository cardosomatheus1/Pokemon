/* Q1/Q3/Q6/Q8 · A PARTIDA DA LIGA E O REPLAY (ST-11.2 · F5.1, F5.9 · Spec §9.2, §9.13)
 *
 * O ACEITE da ficha, dito como teste:
 *
 *   reproduzir pela semente dá o mesmo log   a raiz gravada refaz a luta byte
 *                                            a byte, e o commit gravado confere
 *   gravar duas vezes grava uma              a chave do pedido é única
 *
 * E as duas sabotagens que a ficha nomeia: o vencedor informado pelo cliente
 * (a rota o ignora) e o replay divergente da partida (o replay sai só do log,
 * e chega ao mesmo vencedor e às mesmas quedas).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot, ERRO_EQUIPE } from '../server/equipe.mjs';
import { criarPartida, partidaDe, ERRO_PARTIDA } from '../server/partida.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { confrontoDaLiga, replayDoLog, sementeDaPartida, motivoDaVersao } from '../app/modules/partida-dados.mjs';
import { timeDoSnapshot } from '../app/modules/snapshot-dados.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { conferir } from '../engine/commit.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 14);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const RAIZ = '0123456789abcdef0123456789abcdef', SAL = 'ab'.repeat(16);

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('liga0'), conta('liga1')];
  const time = (dono, lista) => lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  });
  const sa = criarSnapshot(db, { userId: u, pack: PACK, ids: time(u, [[6, 36], [9, 36], [3, 36]]), preset: 'defensive', agora: T0 });
  const sb = criarSnapshot(db, { userId: v, pack: PACK, ids: time(v, [[65, 36], [68, 36], [76, 36]]), preset: 'aggressive', agora: T0 });
  return { db, u, v, sa, sb };
}

export async function suite() {
  const s = criarSuite('liga-partida');

  s.teste('a luta é a do motor, com o preset de cada lado, e a raiz a refaz byte a byte', () => {
    const c = cena();
    const r = confrontoDaLiga({ pack: PACK, a: c.sa, b: c.sb, raiz: RAIZ });
    ok(r.ok, `a luta recusou: ${r.motivo}`);
    igual(r.semente, sementeDaPartida(RAIZ), 'a semente não é a do ramo da liga');
    const direto = simular(PACK, timeDoSnapshot(c.sa), timeDoSnapshot(c.sb), r.semente, { preset: 'defensive', presetRival: 'aggressive' });
    igual(JSON.stringify(r.log.eventos), JSON.stringify(direto.eventos), 'o log não é a luta do motor com os presets dos dois');
    igual(r.vencedor, direto.vencedor ?? 'empate', 'o vencedor não é o do motor');
    igual(JSON.stringify(confrontoDaLiga({ pack: PACK, a: c.sa, b: c.sb, raiz: RAIZ })), JSON.stringify(r), 'a mesma raiz deu outra partida');
    ok(sementeDaPartida('fedcba9876543210fedcba9876543210') !== r.semente, 'outra raiz, a mesma semente');
    igual(r.log.lados.A.length, 3, 'o log sem o começo dos lutadores');
    ok(r.log.lados.A.every(x => x.hp > 0 && x.dex && x.nivel === 36), 'o começo do lutador incompleto');
  });

  s.teste('o replay sai SÓ do log e chega ao mesmo fim da partida', () => {
    const c = cena();
    for (const raiz of [RAIZ, '11111111111111111111111111111111', '22222222222222222222222222222222']) {
      const r = confrontoDaLiga({ pack: PACK, a: c.sa, b: c.sb, raiz });
      const rp = replayDoLog(JSON.parse(JSON.stringify(r.log)));
      igual(rp.vencedor, r.vencedor, `o replay diverge da partida (raiz ${raiz.slice(0, 4)})`);
      igual(rp.quadros.length, r.log.eventos.length, 'o replay perdeu golpes');
      ok(rp.quadros.every(q => (q.hpDepois === 0) === q.caiu), 'o replay derruba quem o log não derrubou');
      const direto = simular(PACK, timeDoSnapshot(c.sa), timeDoSnapshot(c.sb), r.semente, { preset: 'defensive', presetRival: 'aggressive' });
      igual(`${rp.final.A.filter(h => h > 0).length}|${rp.final.B.filter(h => h > 0).length}`, `${direto.restantes.A}|${direto.restantes.B}`, 'o replay termina com outros de pé');
    }
    /* Sem motor e sem pack: um log escrito à mão. */
    const rp = replayDoLog({ lados: { A: [{ dex: 1, nivel: 5, hp: 10 }], B: [{ dex: 4, nivel: 5, hp: 8 }] },
      eventos: [{ turno: 1, de: 'A0', para: 'B0', dano: 5, caiu: false }, { turno: 1, de: 'B0', para: 'A0', dano: 3, caiu: false }, { turno: 2, de: 'A0', para: 'B0', dano: 5, caiu: true }] });
    igual(JSON.stringify([rp.vencedor, rp.final]), '["A",{"A":[7],"B":[0]}]', 'o replay de um log à mão');
  });

  s.teste('o time congelado com outras regras ou outro conteúdo não luta', () => {
    const c = cena();
    igual(motivoDaVersao(PACK, c.sa), null, 'o time de hoje recusado');
    const velho = { ...c.sa, versaoMotor: 'tbe-0' }, outro = { ...c.sb, versaoConteudo: '00000000' };
    igual(confrontoDaLiga({ pack: PACK, a: velho, b: c.sb, raiz: RAIZ }).motivo, 'o time foi congelado com outras regras — congele de novo', 'as regras velhas lutaram');
    igual(confrontoDaLiga({ pack: PACK, a: c.sa, b: outro, raiz: RAIZ }).motivo, 'o time foi congelado com outro conteúdo — congele de novo', 'o conteúdo velho lutou');
  });

  s.teste('no servidor: o commit confere, gravar duas vezes grava uma, e a partida é imutável', async () => {
    const c = cena();
    const p = criarPartida(c.db, { userId: c.v, meu: c.sb.id, adversario: c.sa.id, chaveIdem: 'desafio-0001', agora: T0, raiz: RAIZ, sal: SAL });
    ok(await conferir(p.commit, p.raiz, p.sal), 'o commit gravado não confere com a raiz revelada');
    igual(JSON.stringify(p.log), JSON.stringify(confrontoDaLiga({ pack: PACK, a: c.sa, b: c.sb, raiz: p.raiz }).log), 'a partida gravada não se refaz pela raiz');
    igual(`${p.defensor}|${p.desafiante}`, `${c.sa.id}|${c.sb.id}`, 'os lados trocados');
    const de_novo = criarPartida(c.db, { userId: c.v, meu: c.sb.id, adversario: c.sa.id, chaveIdem: 'desafio-0001', agora: T0 + 5, raiz: '33333333333333333333333333333333', sal: SAL });
    igual(`${de_novo.repetido}|${de_novo.id}|${de_novo.raiz}`, `true|${p.id}|${RAIZ}`, 'o reenvio lutou de novo');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n, 1, 'gravou duas vezes');
    for (const [sql, o] of [[`UPDATE league_matches SET vencedor = 'B' WHERE id = ?`, 'UPDATE'], [`DELETE FROM league_matches WHERE id = ?`, 'DELETE']])
      ok(/imutável/.test(recusa(() => c.db.prepare(sql).run(p.id))?.message ?? ''), `o banco aceitou ${o}`);
    igual(partidaDe(c.db, p.id).vencedor, p.vencedor, 'a partida mudou');
    igual(replayDoLog(partidaDe(c.db, p.id).log).vencedor, p.vencedor, 'o replay da partida gravada diverge');
  });

  s.teste('as recusas: o próprio time, o time dos outros como meu, o que não existe, a chave', () => {
    const c = cena();
    const r = (o) => recusa(() => criarPartida(c.db, { userId: c.v, meu: c.sb.id, adversario: c.sa.id, chaveIdem: 'desafio-0002', agora: T0, ...o }));
    igual(r({ adversario: c.sb.id })?.codigo, ERRO_PARTIDA.CONTRA_SI, 'desafiou o próprio time');
    igual(r({ meu: c.sa.id })?.codigo, ERRO_EQUIPE.SEM_SNAPSHOT, 'lutou com o time de outro');
    igual(r({ adversario: 'nao-existe' })?.codigo, ERRO_EQUIPE.SEM_SNAPSHOT, 'lutou contra o que não existe');
    for (const chave of [undefined, 'curta', 'com espaço aqui'])
      igual(r({ chaveIdem: chave })?.codigo, ERRO_PARTIDA.CHAVE, `a chave ${chave}`);
    igual(recusa(() => partidaDe(c.db, 'nao-existe'))?.codigo, ERRO_PARTIDA.SEM_PARTIDA, 'a partida que não existe');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n, 0, 'uma recusa gravou');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'liga-st11.2');
    ok(m, 'a migração não existe');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('league_matches', 'partida_sem_update', 'partida_sem_delete')`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 3, 'a subida não refez tudo');
  });

  s.teste('pela porta: o vencedor do corpo é ignorado, e a partida tem link próprio', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const pedir = (metodo, caminho, corpo, sessao) => fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
      [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${sessao}`, 'content-type': 'application/json' }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
      .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      const contas = [];
      for (const nome of ['Duelo0', 'Duelo1']) {
        const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
          body: JSON.stringify({ username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
        contas.push({ sessao: cad.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id });
      }
      const [a, b] = contas;
      /* A bem mais forte que B: o vencedor de verdade é A. */
      const forte = [6, 9, 3].map(dex => { const c = gerar(srv.db, { userId: a.id, pack: PACK, dex }); srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(60), c.id); return c.id; });
      const fraco = [gerar(srv.db, { userId: b.id, pack: PACK, dex: 10 }).id];
      const sa = (await pedir('POST', '/api/equipe/snapshot', { ids: forte }, a.sessao)).corpo.snapshot;
      const sb = (await pedir('POST', '/api/equipe/snapshot', { ids: fraco }, b.sessao)).corpo.snapshot;
      const r = await pedir('POST', '/api/equipe/partida', { meu: sb.id, adversario: sa.id, chaveIdem: 'porta-00001', vencedor: 'B', raiz: RAIZ }, b.sessao);
      igual(r.status, 200, `a partida: ${JSON.stringify(r.corpo)?.slice(0, 160)}`);
      igual(r.corpo.partida.vencedor, 'A', 'o vencedor do corpo foi usado');
      ok(r.corpo.partida.raiz !== RAIZ, 'a raiz do corpo foi usada');
      const lida = await pedir('GET', `/api/equipe/partida?id=${r.corpo.partida.id}`, null, a.sessao);
      igual(`${lida.status}|${lida.corpo.partida.id}`, `200|${r.corpo.partida.id}`, 'o link da partida');
      igual((await pedir('GET', '/api/equipe/partida?id=nao-existe', null, a.sessao)).status, 404, 'a partida que não existe');
      igual((await pedir('POST', '/api/equipe/partida', { meu: sb.id, adversario: sb.id, chaveIdem: 'porta-00002' }, b.sessao)).status, 409, 'contra si');
      igual((await pedir('POST', '/api/equipe/partida', { meu: 3, adversario: sa.id, chaveIdem: 'porta-00003' }, b.sessao)).status, 400, 'id em número');
    } finally { await srv.fechar(); }
  });

  return s;
}
