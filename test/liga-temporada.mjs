/* Q1/Q3/Q8 · A TEMPORADA DA LIGA (ST-11.5 · F5.2 · Spec §9.8)
 *
 * O ACEITE da ficha: A VIRADA É IDEMPOTENTE — chamar duas vezes, ou com o
 * valor lido velho (o outro pedido virou antes), fecha uma vez.
 *
 * E o resto do §9.8: 28 dias em três fases, a temporada do relógio (e não de
 * um botão), o ranking final gravado com tier e posição — nunca o número —, o
 * soft reset que só toca o Liga MMR, e o rating de hoje como a soma dos dois
 * livros (as partidas e os resets).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida } from '../server/partida.mjs';
import { ratingDe } from '../server/liga-mmr.mjs';
import { sincronizarTemporada, rankingDaTemporada, temporadaGravada } from '../server/temporada.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { temporadaDe, softReset, TEMPORADA } from '../engine/temporada.mjs';
import { MMR } from '../engine/liga-mmr.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const DIA = 86_400_000;
const T1 = Date.UTC(2026, 8, 28, 12);                 // temporada 1, dia 1
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T1 }).id;
  const [u, v] = [conta('tmp0'), conta('tmp1')];
  const snap = (dono, lista) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T1, ids: lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  }) });
  return { db, u, v, forte: snap(u, [[6, 60], [9, 60], [3, 60]]), fraco: snap(v, [[10, 5]]) };
}

export async function suite() {
  const s = criarSuite('liga-temporada');

  s.teste('a temporada é do relógio: 28 dias, três fases, e a virada no dia do mundo', () => {
    const t = temporadaDe(T1);
    igual(`${t.numero}|${t.dia}|${t.fase}`, '1|1|colocacao', 'o começo da temporada 1');
    igual(t.fim - t.inicio, TEMPORADA.dias * DIA, 'a temporada não tem 28 dias');
    igual(new Date(t.inicio).toISOString(), '2026-09-28T03:00:00.000Z', 'a temporada não vira no dia do mundo (3 h)');
    igual([7, 8, 21, 22, 28].map(d => temporadaDe(t.inicio + (d - 1) * DIA + 1).fase).join(), 'colocacao,competicao,competicao,fechamento,fechamento', 'as fases');
    igual(`${temporadaDe(t.fim).numero}|${temporadaDe(t.fim).dia}`, '2|1', 'o fim de uma é o começo da outra');
    igual(temporadaDe(t.fim - 1).numero, 1, 'o último milissegundo já é da outra');
    igual([1400, 600, 1000, 1850].map(softReset).join(), '1200,800,1000,1425', 'o soft reset não é metade da distância');
  });

  s.teste('a virada fecha uma vez: o ranking final, o reset de cada conta, e o livro soma', () => {
    const c = cena();
    sincronizarTemporada(c.db, { agora: T1 });
    igual(temporadaGravada(c.db), 1, 'a primeira leitura não gravou a temporada de agora');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM liga_temporadas`).get().n, 0, 'a primeira leitura fechou uma temporada que não existiu');
    criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'tmp-000001', agora: T1 + DIA });
    const [ra, rb] = [ratingDe(c.db, c.u).rating, ratingDe(c.db, c.v).rating];
    igual(`${ra}|${rb}`, `${MMR.inicial + 16}|${MMR.inicial - 16}`, 'a partida da temporada 1');
    /* O relógio pula para a temporada 3: fecha a 1 e a 2, nessa ordem. */
    const t3 = temporadaDe(T1).inicio + 2 * TEMPORADA.dias * DIA + 5;
    igual(JSON.stringify(sincronizarTemporada(c.db, { agora: t3 }).fechadas), '[1,2]', 'não fechou as duas, em ordem');
    igual(`${ratingDe(c.db, c.u).rating}|${ratingDe(c.db, c.v).rating}`, `${softReset(softReset(ra))}|${softReset(softReset(rb))}`, 'o reset não foi aplicado uma vez por temporada');
    const r1 = rankingDaTemporada(c.db, 1);
    igual(r1.map(x => `${x.posicao}:${x.user === c.u ? 'u' : 'v'}:${x.tier}`).join(), '1:u:Bronze,2:v:Bronze', 'o ranking final da temporada 1');
    ok(r1.every(x => Object.keys(x).sort().join() === 'partidas,posicao,tier,user'), `o número vazou no ranking: ${JSON.stringify(r1[0])}`);
    /* De novo: nada. */
    igual(sincronizarTemporada(c.db, { agora: t3 + 10 }).fechadas.length, 0, 'fechou de novo');
    /* O outro pedido virou antes: o valor lido é o velho, e a gravação não acha. */
    const velho = new Proxy(c.db, { get(t, k) {
      if (k === 'prepare') return sql => (/SELECT temporada FROM liga_estado/.test(sql) ? { get: () => ({ temporada: 1 }) } : t.prepare(sql));
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
    } });
    igual(sincronizarTemporada(velho, { agora: t3 + 20 }).fechadas.length, 0, 'o valor velho fechou a temporada de novo');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM liga_mmr_resets`).get().n, 4, 'o reset contou duas vezes');
    /* O rating de hoje = o inicial + os deltas das partidas + os ajustes dos resets. */
    for (const quem of [c.u, c.v]) {
      const partidas = c.db.prepare(`SELECT SUM(CASE WHEN user_a = ? THEN delta ELSE -delta END) AS s FROM liga_mmr_eventos WHERE user_a = ? OR user_b = ?`).get(quem, quem, quem).s;
      const resets = c.db.prepare(`SELECT SUM(depois - antes) AS s FROM liga_mmr_resets WHERE user_id = ?`).get(quem).s;
      igual(ratingDe(c.db, quem).rating, MMR.inicial + partidas + resets, 'o rating não é a soma dos dois livros');
    }
    for (const [sql, o] of [[`UPDATE liga_temporadas SET ranking_json = '[]'`, 'o ranking aceitou UPDATE'], [`DELETE FROM liga_mmr_resets`, 'o livro do reset aceitou DELETE']])
      ok(/append-only/.test((() => { try { c.db.prepare(sql).run(); return ''; } catch (e) { return e.message; } })()), o);
  });

  s.teste('a partida depois da virada parte do rating resetado', () => {
    const c = cena();
    sincronizarTemporada(c.db, { agora: T1 });
    criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'tmp-000002', agora: T1 + DIA });
    const t2 = temporadaDe(T1).fim + 5;
    criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'tmp-000003', agora: t2 });
    const ev = c.db.prepare(`SELECT antes_a FROM liga_mmr_eventos ORDER BY criado_em DESC LIMIT 1`).get();
    igual(ev.antes_a, softReset(MMR.inicial + 16), 'a partida da temporada 2 partiu do rating de antes do reset');
  });

  s.teste('o reset só toca o Liga MMR: o módulo e quem vira não leem a calibração', () => {
    for (const f of ['../engine/temporada.mjs', '../server/temporada.mjs'])
      ok(!/calibra|predictions|brier|arena_mmr/i.test(semComentario(fonte(f))), `${f} toca a calibração`);
    const m = MIGRACOES.find(x => x.nome === 'temporada-st11.5');
    ok(!/predic|calibra|brier/i.test(semComentario(m.sobe.toString())), 'a tabela da temporada fala de previsão');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'temporada-st11.5');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'liga_estado' OR name LIKE 'liga_temporadas%' OR name LIKE 'liga_mmr_resets%'`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 7, 'a subida não refez tudo');
  });

  s.teste('pela porta: a temporada de agora e o meu tier, sem o número', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T1 + 10 * DIA });
    const porta = await srv.ouvir(0);
    try {
      const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Temp0', email: 'temp0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const r = await fetch(`http://127.0.0.1:${porta}/api/equipe/temporada`, { headers: { [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${cad.sessao}` } });
      const corpo = await r.json();
      igual(`${r.status}|${corpo.numero}|${corpo.fase}|${corpo.dia}|${corpo.tier}`, '200|1|competicao|11|Bronze', 'a temporada pela porta');
      ok(!('rating' in corpo), 'o número vazou');
      igual(temporadaGravada(srv.db), 1, 'ler a temporada não sincronizou');
    } finally { await srv.fechar(); }
  });

  return s;
}
