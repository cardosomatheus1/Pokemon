import { partidaHistorica as criarPartida } from './fixtures/liga-historica.mjs';
/* Q1/Q6/Q9 · O ANTI-WIN-TRADING DA LIGA (ST-11.8 · F5.8 · Spec §9.12)
 *
 * Os três sinais e a ação mais barata, cada um com a sua borda:
 *
 *   REPETIÇÃO     o quinto confronto do par na semana fica fora do ranking
 *   ALTERNÂNCIA   quatro vitórias trocando de lado, uma a uma
 *   CONCENTRAÇÃO  60% das partidas de uma conta contra o mesmo adversário
 *   COOLDOWN      o par não se enfrenta de novo em 6 h — nem direto, nem pela busca
 *
 * A partida com sinal fica GRAVADA (o replay existe), fora do Liga MMR, com o
 * registro só de inserção e o evento inteiro para o operador (Q9: sem
 * amostragem). O jogador vê que ficou fora — e não os números.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { partidaDe, ERRO_PARTIDA } from '../server/partida.mjs';
import { ratingDe } from '../server/liga-mmr.mjs';
import { escolherAdversario } from '../app/modules/pareamento-dados.mjs';
import { conteudoDaLuta } from '../app/modules/snapshot-dados.mjs';
import { INTEGRIDADE, emCooldown, sinaisDoPar, concentracaoDe, sinaisDaPartida, elegivel } from '../engine/integridade-liga.mjs';
import { VERSAO_TBE } from '../engine/treino-batalha.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const H = 3_600_000, T0 = Date.UTC(2026, 9, 1, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const p = (userA, userB, vencedor, criadaEm) => ({ userA, userB, vencedor, criadaEm });

export async function suite() {
  const s = criarSuite('liga-integridade');

  s.teste('a repetição: o quinto do par na janela, e o que saiu da janela não conta', () => {
    const quatro = [1, 2, 3, 4].map(i => p('a', 'b', 'A', T0 + i * 7 * H));
    igual(sinaisDoPar(quatro, 'a', 'b', T0 + 30 * H).filter(x => x.sinal === 'repeticao').length, 0, 'quatro já é repetição');
    const cinco = [...quatro, p('b', 'a', 'B', T0 + 35 * H)];
    igual(JSON.stringify(sinaisDoPar(cinco, 'a', 'b', T0 + 36 * H).find(x => x.sinal === 'repeticao')), '{"sinal":"repeticao","n":5}', 'o quinto não é repetição');
    igual(sinaisDoPar(cinco, 'a', 'b', T0 + 35 * H + INTEGRIDADE.janelaMs - 7 * H).filter(x => x.sinal === 'repeticao').length, 0, 'o que saiu da janela contou');
    igual(sinaisDoPar([...cinco, p('a', 'c', 'A', T0)], 'a', 'c', T0 + 36 * H).length, 0, 'o outro par herdou o sinal');
  });

  s.teste('a alternância: quatro vitórias trocando de lado, e o empate quebra a corrente', () => {
    const alt = ['a', 'b', 'a', 'b'].map((v, i) => p('a', 'b', v === 'a' ? 'A' : 'B', T0 + i * 7 * H));
    igual(JSON.stringify(sinaisDoPar(alt, 'a', 'b', T0 + 30 * H)), '[{"sinal":"alternancia","n":4}]', 'quatro trocando não é alternância');
    igual(sinaisDoPar(alt.slice(1), 'a', 'b', T0 + 30 * H).length, 0, 'três já é alternância');
    const quebrada = [...alt.slice(0, 2), p('a', 'b', 'empate', T0 + 15 * H), ...alt.slice(2).map(x => ({ ...x, criadaEm: x.criadaEm + 7 * H }))];
    igual(sinaisDoPar(quebrada, 'a', 'b', T0 + 40 * H).filter(x => x.sinal === 'alternancia').length, 0, 'o empate não quebrou a corrente');
    /* Os lados trocados na gravação (quem desafia é B) não enganam: o vencedor é a CONTA. */
    const lados = [p('a', 'b', 'A', T0), p('a', 'b', 'B', T0 + 7 * H), p('b', 'a', 'B', T0 + 14 * H), p('b', 'a', 'A', T0 + 21 * H)];
    igual(sinaisDoPar(lados, 'a', 'b', T0 + 30 * H)[0]?.sinal, 'alternancia', 'a troca de lado na gravação escondeu a alternância');
  });

  s.teste('a concentração: 60% contra o mesmo, com oito partidas ou mais', () => {
    const lista = (n, iguais) => Array.from({ length: n }, (_, i) => p('a', i < iguais ? 'b' : `x${i}`, 'A', T0 + i * H));
    igual(concentracaoDe(lista(7, 7), 'a', T0 + 10 * H), null, 'sete partidas já concentram');
    igual(JSON.stringify(concentracaoDe(lista(8, 5), 'a', T0 + 10 * H)), '{"sinal":"concentracao","user":"a","outro":"b","n":5,"total":8,"fracao":0.625}', 'cinco de oito');
    igual(concentracaoDe(lista(8, 4), 'a', T0 + 10 * H), null, 'metade já concentra');
    ok(elegivel([]) && !elegivel([{ sinal: 'x' }]), 'a elegibilidade');
    igual(sinaisDaPartida(lista(8, 5), 'a', 'b', T0 + 10 * H).map(x => x.sinal).join(), 'repeticao,concentracao', 'os sinais da partida não somam os três');
  });

  s.teste('o cooldown: 6 h entre o par, e a busca também o respeita', () => {
    const uma = [p('a', 'b', 'A', T0)];
    ok(emCooldown(uma, 'b', 'a', T0 + 6 * H - 1), 'a revanche antes das 6 h passou');
    ok(!emCooldown(uma, 'a', 'b', T0 + 6 * H), 'as 6 h não liberaram');
    ok(!emCooldown(uma, 'a', 'c', T0 + H), 'o cooldown de um par pegou outro');
    const snap = (id, power) => ({ id, power, preset: 'balanced', time: [], versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(PACK) });
    igual(escolherAdversario({ pack: PACK, eu: { user: 'eu', rating: 1000, power: 300 }, candidatos: [{ user: 'a', rating: 1000, snapshot: snap('s', 300) }], evitar: ['a'] }), null, 'a busca pareou quem está em cooldown');
    ok(/evitar: emEspera/.test(semComentario(fonte('../server/partida.mjs'))), 'a busca não passa o cooldown ao pareamento');
  });

  function cena() {
    const db = abrirBanco(':memory:'); migrar(db);
    const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const [u, v] = [conta('int0'), conta('int1')];
    const snap = (dono, lista) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: lista.map(([dex, nivel]) => {
      const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
      db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
      return c.id;
    }) });
    return { db, u, v, forte: snap(u, [[6, 60], [9, 60], [3, 60]]), fraco: snap(v, [[10, 5]]) };
  }

  s.teste('histórico anterior a AT6: o cooldown recusa a revanche; o quinto confronto fica gravado, fora do ranking e registrado', () => {
    const c = cena();
    const joga = (k, t) => criarPartida(c.db, { userId: c.v, meu: c.fraco.id, adversario: c.forte.id, chaveIdem: `int-${String(k).padStart(6, '0')}`, agora: t });
    joga(1, T0);
    igual(recusa(() => joga(2, T0 + H))?.codigo, ERRO_PARTIDA.COOLDOWN, 'a revanche em 1 h passou');
    for (let k = 2; k <= 4; k++) igual(joga(k, T0 + (k - 1) * 7 * H).rated, true, `a partida ${k} saiu do ranking`);
    const antes = JSON.stringify([ratingDe(c.db, c.u), ratingDe(c.db, c.v)]);
    const quinta = joga(5, T0 + 28 * H);
    igual(`${quinta.rated}|${quinta.integridade}`, 'false|fora do ranking: padrão de partidas entre as mesmas contas', 'o quinto confronto ficou no ranking');
    ok(!/\d/.test(quinta.integridade), 'o número do sinal vazou para o jogador');
    igual(JSON.stringify([ratingDe(c.db, c.u), ratingDe(c.db, c.v)]), antes, 'o quinto confronto mexeu no Liga MMR');
    igual(partidaDe(c.db, quinta.id).rated, false, 'o link da partida não diz que ficou fora');
    const reg = c.db.prepare(`SELECT elegivel, sinais_json FROM liga_sinais WHERE partida_id = ?`).get(quinta.id);
    igual(`${reg.elegivel}|${JSON.parse(reg.sinais_json).map(x => x.sinal).join()}`, '0|repeticao', 'o registro do operador');
    igual(c.db.prepare(`SELECT COUNT(*) AS n FROM liga_sinais WHERE elegivel = 1`).get().n, 4, 'as partidas limpas sem registro');
    const ev = c.db.prepare(`SELECT campos FROM telemetry_events WHERE nome = 'liga_partida_fora_do_ranking'`).all();
    igual(ev.length, 1, 'o evento para o operador');
    ok(JSON.parse(ev[0].campos).sinais === 'repeticao', 'o evento sem o sinal');
    ok(/append-only/.test(recusa(() => c.db.prepare(`UPDATE liga_sinais SET elegivel = 1`).run())?.message ?? ''), 'o registro aceitou UPDATE');
  });

  s.teste('a migração sobe e desce', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'integridade-st11.8');
    const conta = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'liga_sinais%'`).get().n;
    m.desce(db); igual(conta(), 0, 'a descida deixou restos');
    m.sobe(db); igual(conta(), 3, 'a subida não refez tudo');
  });

  return s;
}
