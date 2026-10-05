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
import { sincronizarTemporada, rankingDaTemporada, participantesDaTemporada } from './temporada.mjs';
import { saldoDePontos, extratoDePontos, insigniasDe, pontosDaPartida } from './pontos-liga.mjs';
import { PONTOS, PREMIO_DO_TIER } from '../engine/pontos-liga.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { tierDe } from '../engine/liga-mmr.mjs';
import { exigirBandeira, bandeiraLigada } from './feature-flags.mjs';
import PACK from '../content/escolhido.mjs';
import { acessoDaArena, exigirAcessoArena } from './arena-acesso.mjs';
import { criaturasParaLuta } from './jornada.mjs';
import { concederKitArena } from './arena-premios.mjs';
import { emTransacao } from './carteira.mjs';
import { emitir } from './telemetria.mjs';
import {anotarArena,anotarElegibilidadeArena,exposicaoArena} from './arena-metricas.mjs';
import {compararTimePublicado} from '../app/modules/comparacao-time.mjs';
import {recompensasArena,resgatarArena} from './arena-recompensas.mjs';

const RECENTES = 5;
const nomeDe = (db, id) => db.prepare(`SELECT username FROM users WHERE id = ?`).get(id)?.username ?? 'jogador';
const lado = (vencedor, eu) => (vencedor === 'empate' ? 'empate' : vencedor === eu ? 'venceu' : 'perdeu');

/* As minhas partidas, de gente e de bot, do MEU lado e da mais nova para a mais velha. */
export function minhasPartidas(db, userId, limite = RECENTES, pack = PACK) {
  const gente = db.prepare(`SELECT m.id, m.user_a, m.user_b, m.vencedor, m.turnos, m.criada_em, s.elegivel, e.antes_a, e.antes_b, e.delta,
                                    k.stake AS st_valor, k.rake AS st_rake, k.estado AS st_estado, a.modo
                             FROM league_matches m LEFT JOIN liga_sinais s ON s.partida_id = m.id
                             LEFT JOIN liga_mmr_eventos e ON e.partida_id = m.id
                             LEFT JOIN liga_stakes k ON k.partida_id = m.id
                             LEFT JOIN arena_partidas a ON a.partida_id = m.id
                             WHERE m.user_a = ? OR m.user_b = ? ORDER BY m.criada_em DESC, m.id LIMIT ?`).all(userId, userId, limite)
    .map(l => {
      const eu = l.user_b === userId ? 'B' : 'A';
      /* O EFEITO no tier, pelos NOMES: o antes e o depois do livro viram
         tier aqui dentro, e o número não sai do servidor (§9.7). */
      const antes = eu === 'A' ? l.antes_a : l.antes_b, depois = antes + (eu === 'A' ? l.delta : -l.delta);
      return { id: l.id, modo: l.modo ?? 'legado', lado: eu, quando: l.criada_em, turnos: l.turnos, resultado: lado(l.vencedor, eu), rated: l.modo !== 'amistoso' && l.elegivel !== 0,
               pontos: pontosDaPartida(db, l.id, userId),
               ...(l.st_estado ? { stake: { valor: l.st_valor, rake: l.st_rake, estado: l.st_estado } } : {}),
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
  const equipe = criaturasParaLuta(db, userId, pack).filter(c => !c.naCaixa);
  anotarElegibilidadeArena(db,{userId,pack,agora});
  return {
    ligada: bandeiraLigada(db, 'league_enabled'),
    temporada: { numero: t.numero, fase: t.fase, dia: t.dia, fim: t.fim },
    ...tierDaConta(db, userId),
    meuTime: snapshotsDe(db, userId)[0] ?? null,
    equipe,
    acesso: acessoDaArena(db, userId, pack, equipe),
    recentes: minhasPartidas(db, userId, RECENTES, pack),
    pontos: saldoDePontos(db, userId),
  };
}

/* OS LEAGUE POINTS DA CONTA (ST-11.7a): o saldo, o extrato e as regras de
   ganho — a tela explica de onde vem cada ponto com os números do motor, e
   não com uma cópia deles. Sincroniza antes: a virada pode ter mexido. */
export function pontosDaConta(db, { userId, agora }) {
  sincronizarTemporada(db, { agora });
  return { saldo: saldoDePontos(db, userId), extrato: extratoDePontos(db, userId), regras: PONTOS, premios: PREMIO_DO_TIER,
           insignias: insigniasDe(db, userId) };
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
    todas = participantesDaTemporada(db, atual)
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
  exigirAcessoArena(db, userId, pack, criaturasParaLuta(db, userId, pack).filter(c => !c.naCaixa));
  return emTransacao(db,()=>{
    const anterior=snapshotsDe(db,userId)[0]??null;
    const snapshot=criarSnapshot(db, { userId, pack, ids, preset, agora });
    concederKitArena(db,{userId,agora});
    anotarElegibilidadeArena(db,{userId,pack,agora});
    anotarArena(db,{nome:'arena_time_publicado',userId,chave:`publicar:${snapshot.id}`,agora,campos:exposicaoArena(snapshot)});
    const diff=anterior?compararTimePublicado({pack,publicado:anterior,atual:{...snapshot,ok:true}}):null;
    if(diff?.compativel&&diff.mudou)anotarArena(db,{nome:'arena_time_melhorado',userId,chave:`melhoria:${snapshot.id}`,agora,
      campos:{anterior:anterior.id,atual:snapshot.id,mudancas:[...new Set([...diff.mudancas,...diff.membros.flatMap(m=>m.mudancas)].map(m=>m.campo))],antes:exposicaoArena(anterior),depois:exposicaoArena(snapshot)}});
    return snapshot;
  });
}

export function rotasDaLigaEquipe(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    'GET /api/equipe/recompensas':({db,userId,agora})=>({corpo:{campanhas:recompensasArena(db,{userId,agora})}}),
    'POST /api/equipe/recompensas/resgatar':({db,userId,corpo,agora})=>tentar(()=>resgatarArena(db,{userId,campanha:corpo?.campanha,tipo:corpo?.tipo,agora})),
    'GET /api/equipe/liga': ({ db, userId, agora }) => ({ corpo: ligaDaConta(db, { userId, agora }) }),
    'GET /api/equipe/pontos': ({ db, userId, agora }) => ({ corpo: pontosDaConta(db, { userId, agora }) }),
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
