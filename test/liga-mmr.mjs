/* Q1/Q3 · O LIGA MMR (ST-11.4 · F5.2 · Spec §9.7)
 *
 * O ACEITE da ficha:
 *
 *   ELO DE SOMA ZERO   o que um ganha o outro perde, exatamente, em qualquer
 *                      par de ratings e qualquer resultado
 *   O GRAFO            o Liga MMR e a calibração não se leem — nem o módulo,
 *                      nem quem grava, nem as tabelas
 *
 * E no servidor: o rating muda na mesma transação da partida, uma vez por
 * partida (o reenvio não aplica de novo), o livro de eventos só aceita
 * inserção, e a tela recebe o TIER — nunca o número.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida } from '../server/partida.mjs';
import { ratingDe, aplicarPartida } from '../server/liga-mmr.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { MMR, TIERS, tierDe, esperado, eloDaPartida } from '../engine/liga-mmr.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 28, 16);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('mmr0'), conta('mmr1')];
  const snap = (dono, lista) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  }) });
  return { db, u, v, forte: snap(u, [[6, 60], [9, 60], [3, 60]]), fraco: snap(v, [[10, 5]]) };
}

export async function suite() {
  const s = criarSuite('liga-mmr');

  s.teste('o Elo é de soma zero, e favorece quem vence contra a expectativa', () => {
    let x = 12345;
    const prox = () => (x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32;
    for (let k = 0; k < 2000; k++) {
      const ra = Math.round(600 + prox() * 1600), rb = Math.round(600 + prox() * 1600), v = ['A', 'B', 'empate'][k % 3];
      const r = eloDaPartida(ra, rb, v);
      igual(r.a + r.b, ra + rb, `soma não é zero em ${ra}×${rb} (${v})`);
      igual(r.a - ra, r.delta, 'o delta não é o que A ganhou');
    }
    igual(eloDaPartida(1000, 1000, 'empate').delta, 0, 'o empate entre iguais mexeu');
    igual(eloDaPartida(1000, 1000, 'A').delta, MMR.K / 2, 'a vitória entre iguais não vale meio K');
    ok(eloDaPartida(1000, 1400, 'A').delta > eloDaPartida(1400, 1000, 'A').delta, 'a zebra ganha menos que o favorito');
    ok(eloDaPartida(1400, 1000, 'B').delta < 0, 'a derrota do favorito não tira dele');
    igual(Math.round(esperado(1200, 1200) * 100), 50, 'iguais não são 50%');
    ok(esperado(1600, 1200) > 0.9, 'quatrocentos pontos não são ~91%');
  });

  s.teste('o tier: as faixas do §9.6, em ordem, e o inicial em Bronze', () => {
    igual(TIERS.map(t => t.nome).join(), 'Bronze,Silver,Gold,Platinum,Diamond,Master,Champion', 'os tiers do §9.6');
    igual([MMR.inicial, 1099, 1100, 1249, 1250, 1400, 1550, 1700, 1849, 1850, 3000].map(tierDe).join(),
      'Bronze,Bronze,Silver,Silver,Gold,Platinum,Diamond,Master,Master,Champion,Champion', 'as bordas');
    ok(TIERS.every((t, i) => !i || t.min > TIERS[i - 1].min), 'faixas fora de ordem');
  });

  s.teste('o grafo: o Liga MMR e a calibração não se leem', () => {
    const ligam = ['../engine/liga-mmr.mjs', '../server/liga-mmr.mjs'].map(f => semComentario(fonte(f)));
    for (const t of ligam) ok(!/calibra|predictions|brier|previs/i.test(t), 'o Liga MMR lê a calibração');
    /* E o outro lado: nenhum arquivo que fala de calibração ou previsões toca o Liga MMR. */
    for (const pasta of ['../engine/', '../server/', '../app/modules/']) {
      for (const f of readdirSync(new URL(pasta, import.meta.url)).filter(n => n.endsWith('.mjs'))) {
        const t = semComentario(fonte(`${pasta}${f}`));
        if (/calibracao|predictions|brier/i.test(t) && f !== 'banco.mjs')
          ok(!/liga_mmr|liga-mmr|eloDaPartida|ratingDe/.test(t), `${pasta}${f} mistura calibração e Liga MMR`);
      }
    }
    /* E as tabelas: nenhuma coluna do Liga MMR fala de previsão. */
    const m = MIGRACOES.find(x => x.nome === 'liga-mmr-st11.4');
    ok(!/predic|calibra|brier/i.test(semComentario(m.sobe.toString())), 'a tabela do Liga MMR fala de previsão');
  });

  s.teste('no servidor: a partida move o rating uma vez, na mesma transação, e o livro não se reescreve', () => {
    const c = cena();
    igual(ratingDe(c.db, c.u).rating, MMR.inicial, 'quem nunca jogou não está no inicial');
    const p = criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'mmr-00001', agora: T0 });
    igual(p.vencedor, 'A', 'a cena não exerce a vitória do defensor');
    const [ra, rb] = [ratingDe(c.db, c.u), ratingDe(c.db, c.v)];
    igual(`${ra.rating}|${rb.rating}|${ra.partidas}|${rb.partidas}`, `${MMR.inicial + 16}|${MMR.inicial - 16}|1|1`, 'o rating depois da partida');
    /* O reenvio não aplica de novo. */
    criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'mmr-00001', agora: T0 + 1 });
    igual(ratingDe(c.db, c.u).partidas, 1, 'o reenvio aplicou o rating de novo');
    /* E a mesma partida aplicada direto de novo: o evento é da partida. */
    igual(aplicarPartida(c.db, { id: p.id, userA: c.u, userB: c.v, vencedor: 'A', agora: T0 + 1 }), null, 'a mesma partida aplicou de novo');
    igual(ratingDe(c.db, c.u).rating, MMR.inicial + 16, 'a mesma partida mexeu no rating de novo');
    /* A segunda partida parte do rating novo: o livro guarda o antes. */
    criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'mmr-00002', agora: T0 + 2 });
    const ev = c.db.prepare(`SELECT antes_a, antes_b, delta FROM liga_mmr_eventos ORDER BY criado_em`).all();
    igual(ev.length, 2, 'um evento por partida');
    igual(`${ev[1].antes_a}|${ev[1].antes_b}`, `${MMR.inicial + 16}|${MMR.inicial - 16}`, 'a segunda partida não partiu do rating novo');
    /* O rating de hoje se refaz somando o livro. */
    igual(ratingDe(c.db, c.u).rating, MMR.inicial + ev.reduce((a, e) => a + e.delta, 0), 'o rating não é a soma do livro');
    for (const [sql, o] of [[`UPDATE liga_mmr_eventos SET delta = 99`, 'UPDATE'], [`DELETE FROM liga_mmr_eventos`, 'DELETE']])
      ok(/append-only/.test(recusa(() => c.db.prepare(sql).run())?.message ?? ''), `o livro aceitou ${o}`);
    /* A partida que falha no meio não move o rating. */
    const antes = JSON.stringify([ratingDe(c.db, c.u), ratingDe(c.db, c.v)]);
    c.db.exec(`CREATE TRIGGER quebra BEFORE INSERT ON liga_mmr_eventos BEGIN SELECT RAISE(ABORT, 'falha no meio'); END`);
    ok(/falha no meio/.test(recusa(() => criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: 'mmr-00003', agora: T0 + 3 }))?.message ?? ''), 'a falha não subiu');
    igual(JSON.stringify([ratingDe(c.db, c.u), ratingDe(c.db, c.v)]), antes, 'a partida que falhou mexeu no rating');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM league_matches`).get().n, 2, 'a partida que falhou no rating ficou gravada');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'liga-mmr-st11.4');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('liga_mmr', 'liga_mmr_eventos', 'mmr_eventos_sem_update', 'mmr_eventos_sem_delete')`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 4, 'a subida não refez tudo');
  });

  s.teste('pela porta: o tier à vista, o número nunca', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    try {
      const cad = await fetch(`http://127.0.0.1:${porta}/api/auth/cadastrar`, { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'Tier0', email: 'tier0@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const r = await fetch(`http://127.0.0.1:${porta}/api/equipe/tier`, { headers: { [CABECALHO_VERSAO]: API_VERSAO, authorization: `Bearer ${cad.sessao}` } });
      const corpo = await r.json();
      igual(`${r.status}|${corpo.tier}|${corpo.partidas}`, '200|Bronze|0', 'o tier de quem nunca jogou');
      ok(!('rating' in corpo) && !/\d{3,}/.test(JSON.stringify(corpo)), `o número vazou: ${JSON.stringify(corpo)}`);
    } finally { await srv.fechar(); }
  });

  return s;
}
