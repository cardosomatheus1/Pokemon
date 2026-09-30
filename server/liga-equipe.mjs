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
import { sincronizarTemporada } from './temporada.mjs';
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

export function publicarTime(db, { userId, preset, agora, pack = PACK }) {
  exigirBandeira(db, 'league_enabled');
  const ids = criaturasDaConta(db, userId).filter(c => !c.naCaixa).map(c => c.id);
  return criarSnapshot(db, { userId, pack, ids, preset, agora });
}

export function rotasDaLigaEquipe(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/equipe/liga': ({ db, userId, agora }) => ({ corpo: ligaDaConta(db, { userId, agora }) }),
    'POST /api/equipe/publicar': ({ db, corpo, userId, agora }) => {
      const preset = corpo?.preset ?? 'balanced';
      if (typeof preset !== 'string') return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'preset inválido' } };
      return tentar(() => ({ snapshot: publicarTime(db, { userId, preset, agora }) }));
    },
  };
}
