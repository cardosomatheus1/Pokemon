/* Q1/Q3/Q6/Q8 · O PAREAMENTO DA LIGA (ST-11.3 · F5.1 · Spec §9.5)
 *
 * O ACEITE da ficha:
 *
 *   NUNCA PAREIA CONTAS LIGADAS      nem pela busca, nem pelo desafio direto
 *   O BOT APARECE ROTULADO           no payload: `bot`, o nome do treinador e a
 *                                    frase; a tela é da ST-11.6
 *   100 PEDIDOS CONCORRENTES          com a mesma chave, UMA partida
 *
 * E as regras da camada 0, uma a uma: eu, as ligadas, a versão, a faixa de
 * rating e a de power, a repetição, e a ordem de quem sobra. A partida contra
 * o bot fica à parte e não mexe no Liga MMR.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida, buscarPartida, partidaDe, ERRO_PARTIDA } from '../server/partida.mjs';
import { ratingDe } from '../server/liga-mmr.mjs';
import { ligarContas } from '../server/protecao.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { escolherAdversario, botPara, snapshotDoBot, PAREAMENTO } from '../app/modules/pareamento-dados.mjs';
import { confrontoDaLiga, replayDoLog } from '../app/modules/partida-dados.mjs';
import { conteudoDaLuta } from '../app/modules/snapshot-dados.mjs';
import { VERSAO_TBE } from '../engine/treino-batalha.mjs';
import { MMR } from '../engine/liga-mmr.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 18);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const snap = (id, power, v = {}) => ({ id, power, preset: 'balanced', time: [], versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(PACK), ...v });
const cand = (user, rating, power, v) => ({ user, rating, snapshot: snap(`s-${user}`, power, v) });

export async function suite() {
  const s = criarSuite('liga-pareamento');

  s.teste('as regras cortam na ordem, e o que sobra é o mais perto', () => {
    const eu = { user: 'eu', rating: 1000, power: 300 };
    const todos = [cand('eu', 1000, 300), cand('ligada', 1000, 300), cand('velha', 1000, 300, { versaoMotor: 'tbe-0' }),
      cand('longe', 1301, 300), cand('fraco', 1000, 190), cand('forte', 1000, 410), cand('recente', 1000, 300),
      cand('perto', 1050, 280), cand('perto2', 1050, 300), cand('medio', 1200, 300)];
    const r = escolherAdversario({ pack: PACK, eu, candidatos: todos, recentes: ['recente'], ligadas: ['ligada'] });
    igual(r?.user, 'perto2', 'o escolhido não é o mais perto em rating e depois em power');
    const nomes = xs => escolherAdversario({ pack: PACK, eu, candidatos: xs, recentes: ['recente'], ligadas: ['ligada'] })?.user ?? null;
    for (const quem of ['eu', 'ligada', 'velha', 'longe', 'fraco', 'forte', 'recente'])
      igual(nomes([todos.find(c => c.user === quem)]), null, `${quem} passou pelo pareamento`);
    igual(nomes([cand('borda', 1300, 300)]), 'borda', 'a diferença de 300 cortada');
    igual(nomes([cand('p65', 1000, 195), cand('p135', 1000, 405)].slice(0, 1)), 'p65', 'o power na borda de baixo cortado');
    /* A repetição olha só a janela: o quarto adversário atrás volta. */
    igual(escolherAdversario({ pack: PACK, eu, candidatos: [cand('velho', 1000, 300)], recentes: ['a', 'b', 'c', 'velho'] })?.user, 'velho', 'a janela de repetição passa de 3');
    igual(PAREAMENTO.janelaRepeticao, 3, 'a janela mudou sem o teste saber');
    /* O desempate final é pelo id, e não pela ordem da lista. */
    const a = cand('x', 1000, 300), b = { ...cand('y', 1000, 300), snapshot: snap('s-a', 300) };
    igual(escolherAdversario({ pack: PACK, eu, candidatos: [a, b] })?.user, 'y', 'o desempate depende da ordem da lista');
    igual(escolherAdversario({ pack: PACK, eu, candidatos: [b, a] })?.user, 'y', 'o desempate depende da ordem da lista');
  });

  s.teste('o bot: o treinador de power mais perto, rotulado, sem o chefe lendário, e luta', () => {
    const b = botPara(PACK, { power: 900 });
    ok(b.bot === true && typeof b.nome === 'string' && b.id.startsWith('bot:'), 'o bot sem rótulo');
    const todos = (PACK.treinadores ?? []).filter(t => !(t.time ?? []).some(x => x.vidaX)).map(t => snapshotDoBot(PACK, t));
    ok(todos.every(t => Math.abs(t.power - 900) >= Math.abs(b.power - 900)), 'o bot não é o de power mais perto');
    ok(!(PACK.treinadores ?? []).filter(t => (t.time ?? []).some(x => x.vidaX)).some(t => `bot:${t.id}` === botPara(PACK, { power: snapshotDoBot(PACK, t).power }).id), 'o chefe lendário entrou na fila');
    const eu = snap('meu', 900, { time: [{ dex: 6, nivel: 40, golpes: ['Flamethrower'] }] });
    const c = confrontoDaLiga({ pack: PACK, a: b, b: eu, raiz: '44444444444444444444444444444444' });
    ok(c.ok && replayDoLog(c.log).vencedor === c.vencedor, 'o bot não luta pelo confronto da Liga');
  });

  function cena() {
    const db = abrirBanco(':memory:'); migrar(db);
    const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const time = (dono, n) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: [4, 7, 1].slice(0, n).map(dex => {
      const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
      db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(30), c.id);
      return c.id;
    }) });
    const [a, b, c] = ['par0', 'par1', 'par2'].map(conta);
    return { db, a, b, c, sa: time(a, 3), sb: time(b, 3), sc: time(c, 3) };
  }

  s.teste('no servidor: nunca a ligada, nem no desafio direto; a repetição cai no bot; o bot não mexe no MMR', () => {
    const k = cena();
    ligarContas(k.db, { userId: k.b, outroId: k.c, sinal: 'dispositivo', agora: T0 });
    /* B busca: C é ligada, sobra A. */
    const p1 = buscarPartida(k.db, { userId: k.b, meu: k.sb.id, chaveIdem: 'busca-00001', agora: T0 });
    igual(`${p1.rated}|${p1.defensor}`, `false|${k.sa.id}`, 'treino sem stake não deve dar ranking');
    igual(recusa(() => criarPartida(k.db, { userId: k.b, meu: k.sb.id, adversario: k.sc.id, chaveIdem: 'direto-0001', agora: T0 }))?.codigo,
          ERRO_PARTIDA.LIGADA, 'o desafio direto pareou contas ligadas');
    /* De novo: A é recente e C é ligada — o bot. */
    const antes = JSON.stringify([ratingDe(k.db, k.b), ratingDe(k.db, k.a)]);
    const p2 = buscarPartida(k.db, { userId: k.b, meu: k.sb.id, chaveIdem: 'busca-00002', agora: T0 + 1 });
    igual(p2.rated, false, 'a partida contra o bot conta no MMR');
    ok(p2.bot && p2.bot.id.startsWith('bot:') && /não é um jogador/.test(p2.bot.rotulo) && p2.bot.nome, `o bot sem rótulo no payload: ${JSON.stringify(p2.bot)}`);
    igual(JSON.stringify([ratingDe(k.db, k.b), ratingDe(k.db, k.a)]), antes, 'o bot mexeu no Liga MMR');
    igual(k.db.prepare(`SELECT COUNT(*) AS n FROM league_bot_matches`).get().n, 1, 'a partida do bot não foi para a tabela dela');
    igual(k.db.prepare(`SELECT COUNT(*) AS n FROM league_matches WHERE id = ?`).get(p2.id).n, 0, 'o bot entrou na tabela de gente');
    /* O link do bot e o reenvio. */
    igual(partidaDe(k.db, p2.id).bot.nome, p2.bot.nome, 'o link da partida do bot');
    igual(buscarPartida(k.db, { userId: k.b, meu: k.sb.id, chaveIdem: 'busca-00002', agora: T0 + 2 }).id, p2.id, 'o reenvio da busca do bot lutou de novo');
    igual(replayDoLog(p2.log).vencedor, p2.vencedor, 'o replay do bot diverge');
    ok(/imutável/.test(recusa(() => k.db.prepare(`UPDATE league_bot_matches SET vencedor = 'B'`).run())?.message ?? ''), 'a partida do bot aceitou UPDATE');
    /* A busca: B é recente para A (a partida de agora há pouco), e C não é ligada a A — C. */
    const p3 = buscarPartida(k.db, { userId: k.a, meu: k.sa.id, chaveIdem: 'busca-00003', agora: T0 + 3 });
    igual(`${p3.rated}|${p3.defensor}`, `false|${k.sc.id}`, 'A repetiu B, ou não achou C');
    igual(`${ratingDe(k.db, k.a).partidas}|${ratingDe(k.db, k.b).partidas}|${ratingDe(k.db, k.c).partidas}`, '0|0|0', 'treino sem stake não move MMR');
    igual(MMR.inicial, 1000, 'o inicial mudou sem o teste saber');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'bots-st11.3');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('league_bot_matches', 'bot_sem_update', 'bot_sem_delete')`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 3, 'a subida não refez tudo');
  });

  s.teste('pela porta: cem pedidos concorrentes com a mesma chave são UMA partida', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    try {
      const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Fila0', email: 'fila0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const eu = srv.db.prepare(`SELECT id FROM users WHERE username = 'Fila0'`).get().id;
      const ids = [4, 7].map(dex => gerar(srv.db, { userId: eu, pack: PACK, dex }).id);
      const meu = criarSnapshot(srv.db, { userId: eu, pack: PACK, ids, agora: T0 });
      const pedir = corpo => fetch(`http://127.0.0.1:${porta}/api/equipe/buscar`, { method: 'POST', headers: {
        [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${cad.sessao}`, 'content-type': 'application/json' }, body: JSON.stringify(corpo) })
        .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
      const rs = await Promise.all(Array.from({ length: 100 }, () => pedir({ meu: meu.id, chaveIdem: 'cem-pedidos-1' })));
      igual(rs.filter(r => r.status === 200).length, 100, `pedidos recusados: ${JSON.stringify(rs.find(r => r.status !== 200))}`);
      igual(new Set(rs.map(r => r.corpo.partida.id)).size, 1, 'cem pedidos, mais de uma partida');
      const n = srv.db.prepare(`SELECT (SELECT COUNT(*) FROM league_matches) + (SELECT COUNT(*) FROM league_bot_matches) AS n`).get().n;
      igual(n, 1, 'cem pedidos gravaram mais de uma partida');
      /* Sozinho no servidor: o bot, rotulado no payload. */
      ok(rs[0].corpo.partida.bot?.rotulo && rs[0].corpo.partida.rated === false, 'sem ninguém, a partida não é contra o bot rotulado');
      igual((await pedir({ meu: 3, chaveIdem: 'cem-pedidos-2' })).status, 400, 'id em número');
    } finally { await srv.fechar(); }
  });

  return s;
}
