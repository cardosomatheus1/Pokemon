/* A LIGA DE TIMES NA TELA — o que a League Home lê (ST-11.6a · Spec §12 telas 25–26).
 *
 * Uma leitura só para a tela inteira: a temporada de agora, o meu tier (nunca
 * o número — §9.7), o meu time publicado, o time que eu publicaria agora (o da
 * conta, fora da caixa) e as minhas últimas partidas do MEU lado — contra quem
 * (um jogador, pelo nome; ou o bot, pelo rótulo), o resultado e se contou.
 *
 * E publicar: congela o time ATUAL da conta. O corpo traz só o preset; quais
 * criaturas é o servidor quem sabe (as que estão no time, e não na caixa).
 */
import { criaturasDaConta } from './idle.mjs';
import { criarSnapshot, snapshotsDe } from './equipe.mjs';
import { tierDaConta } from './liga-mmr.mjs';
import { sincronizarTemporada, rankingDaTemporada } from './temporada.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { tierDe } from '../engine/liga-mmr.mjs';
import { exigirBandeira, bandeiraLigada } from './feature-flags.mjs';
import PACK from '../content/escolhido.mjs';

const RECENTES = 5;
const nomeDe = (db, id) => db.prepare(`SELECT username FROM users WHERE id = ?`).get(id)?.username ?? 'jogador';
const lado = (vencedor, eu) => (vencedor === 'empate' ? 'empate' : vencedor === eu ? 'venceu' : 'perdeu');

/* As minhas partidas, de gente e de bot, do MEU lado e da mais nova para a mais velha. */
export function minhasPartidas(db, userId, limite = RECENTES, pack = PACK) {
  const gente = db.prepare(`SELECT m.id, m.user_a, m.user_b, m.vencedor, m.turnos, m.criada_em, s.elegivel, e.antes_a, e.antes_b, e.delta
                             FROM league_matches m LEFT JOIN liga_sinais s ON s.partida_id = m.id
                             LEFT JOIN liga_mmr_eventos e ON e.partida_id = m.id
                             WHERE m.user_a = ? OR m.user_b = ? ORDER BY m.criada_em DESC, m.id LIMIT ?`).all(userId, userId, limite)
    .map(l => {
      const eu = l.user_b === userId ? 'B' : 'A';
      /* O EFEITO no tier, pelos NOMES: o antes e o depois do livro viram
         tier aqui dentro, e o número não sai do servidor (§9.7). */
      const antes = eu === 'A' ? l.antes_a : l.antes_b, depois = antes + (eu === 'A' ? l.delta : -l.delta);
      return { id: l.id, lado: eu, quando: l.criada_em, turnos: l.turnos, resultado: lado(l.vencedor, eu), rated: l.elegivel !== 0,
               ...(l.delta != null ? { tier: { antes: tierDe(antes), depois: tierDe(depois) } } : {}),
               contra: { tipo: 'jogador', nome: nomeDe(db, eu === 'B' ? l.user_a : l.user_b) } };
    });
  const bots = db.prepare(`SELECT id, bot_id, vencedor, turnos, criada_em FROM league_bot_matches WHERE user_b = ?
                           ORDER BY criada_em DESC, id LIMIT ?`).all(userId, limite)
    .map(l => ({ id: l.id, lado: 'B', quando: l.criada_em, turnos: l.turnos, resultado: lado(l.vencedor, 'B'), rated: false,
                 contra: { tipo: 'bot', nome: (pack.treinadores ?? []).find(t => `bot:${t.id}` === l.bot_id)?.nome ?? l.bot_id } }));
  return [...gente, ...bots].sort((a, b) => b.quando - a.quando || (a.id < b.id ? -1 : 1)).slice(0, limite);
}

export function ligaDaConta(db, { userId, agora, pack = PACK }) {
  sincronizarTemporada(db, { agora });
  const t = temporadaDe(agora);
  const equipe = criaturasDaConta(db, userId).filter(c => !c.naCaixa).map(c => ({ id: c.id, dex: c.dex, nivel: c.nivel }));
  return {
    ligada: bandeiraLigada(db, 'league_enabled'),
    temporada: { numero: t.numero, fase: t.fase, dia: t.dia, fim: t.fim },
    ...tierDaConta(db, userId),
    meuTime: snapshotsDe(db, userId)[0] ?? null,
    equipe,
    recentes: minhasPartidas(db, userId, RECENTES, pack),
  };
}

/* O RANKING DA LIGA (ST-11.6c · tela 28, §9.15). A temporada de agora é VIVA:
   a mesma ordem que a virada grava (rating, depois a conta), só com quem já
   jogou. A temporada fechada é a gravada na virada. Nos dois casos sai a
   posição, o nome, o tier e as partidas — o número fica no servidor (§9.7).
   É uma tabela SÓ da Liga de times: a Liga de previsão tem a dela (§9.15). */
export const RANKING_TOPO = 20;
export function rankingDaLiga(db, { userId, agora, temporada = null, limite = RANKING_TOPO }) {
  sincronizarTemporada(db, { agora });
  const atual = temporadaDe(agora).numero;
  const n = temporada == null ? atual : temporada;
  const fechadas = db.prepare(`SELECT numero FROM liga_temporadas ORDER BY numero DESC`).all().map(l => l.numero);
  let todas;
  if (n === atual) {
    todas = db.prepare(`SELECT user_id, rating, partidas FROM liga_mmr WHERE partidas > 0 ORDER BY rating DESC, user_id`).all()
      .map((c, i) => ({ posicao: i + 1, user: c.user_id, tier: tierDe(c.rating), partidas: c.partidas }));
  } else {
    todas = rankingDaTemporada(db, n);
    if (!todas) return null;
  }
  const linha = r => ({ posicao: r.posicao, nome: nomeDe(db, r.user), tier: r.tier, partidas: r.partidas, eu: r.user === userId });
  const minha = todas.find(r => r.user === userId);
  return { temporada: n, atual: n === atual, fechadas, total: todas.length,
           linhas: todas.slice(0, limite).map(linha), eu: minha ? linha(minha) : null };
}

export function publicarTime(db, { userId, preset, agora, pack = PACK }) {
  exigirBandeira(db, 'league_enabled');
  const ids = criaturasDaConta(db, userId).filter(c => !c.naCaixa).map(c => c.id);
  return criarSnapshot(db, { userId, pack, ids, preset, agora });
}

export function rotasDaLigaEquipe(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/equipe/liga': ({ db, userId, agora }) => ({ corpo: ligaDaConta(db, { userId, agora }) }),
    'GET /api/equipe/ranking': ({ db, userId, agora, query }) => {
      const cru = query?.get?.('temporada');
      const temporada = cru == null || cru === '' ? null : Number(cru);
      if (temporada !== null && (!Number.isInteger(temporada) || temporada < 1)) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'temporada inválida' } };
      const r = rankingDaLiga(db, { userId, agora, temporada });
      return r ? { corpo: r } : { status: 404, corpo: { codigo: 'LIGA_SEM_TEMPORADA', erro: 'essa temporada não existe' } };
    },
    'POST /api/equipe/publicar': ({ db, corpo, userId, agora }) => {
      const preset = corpo?.preset ?? 'balanced';
      if (typeof preset !== 'string') return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'preset inválido' } };
      return tentar(() => ({ snapshot: publicarTime(db, { userId, preset, agora }) }));
    },
  };
}
