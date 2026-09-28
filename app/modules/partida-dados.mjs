/* O CONFRONTO DA LIGA E O REPLAY (ST-11.2 · F5.1, F5.9 · Spec §9.2, §9.13) — camada 0.
 *
 * Puro: entram os dois snapshots (o DEFENSOR, `a`, que publicou o time, e o
 * DESAFIANTE, `b`, que pediu a partida) e a raiz; sai a luta com o LOG que o
 * replay lê. Quem vence é decidido aqui, no servidor, pela semente dele — o
 * cliente nunca diz quem venceu.
 *
 *   AS VERSÕES   um time congelado com outras regras ou outro conteúdo não
 *                luta: a partida seria outra luta que a que ele escolheu
 *   OS PRESETS   cada lado luta com o preset que congelou
 *   O LOG        leva o COMEÇO de cada lutador (espécie, nível, vida) e os
 *                eventos: o replay sai dele SEM o motor (`replayDoLog`) — a
 *                partida de uma temporada velha se revê depois que as regras
 *                mudarem (§9.13)
 */
import { simular, montarLutador, VERSAO_TBE } from '../../engine/treino-batalha.mjs';
import { derivarIndice } from '../../engine/seed.mjs';
import { conteudoDaLuta, timeDoSnapshot } from './snapshot-dados.mjs';

/* A semente da luta sai do ramo `liga` da raiz — a mesma raiz de outra
   rodada não dá a mesma luta. */
export const sementeDaPartida = raiz => derivarIndice(raiz, 'liga', 0) >>> 0;

export function motivoDaVersao(pack, snap) {
  if (snap?.versaoMotor !== VERSAO_TBE) return 'o time foi congelado com outras regras — congele de novo';
  if (snap?.versaoConteudo !== conteudoDaLuta(pack)) return 'o time foi congelado com outro conteúdo — congele de novo';
  return null;
}

const inicio = f => ({ dex: f.dex, nivel: f.nivel, hp: f.maxHp });

export function confrontoDaLiga({ pack, a, b, raiz }) {
  for (const s of [a, b]) { const m = motivoDaVersao(pack, s); if (m) return { ok: false, motivo: m }; }
  const semente = sementeDaPartida(raiz);
  const A = timeDoSnapshot(a), B = timeDoSnapshot(b);
  const r = simular(pack, A, B, semente, { preset: a.preset, presetRival: b.preset });
  return {
    ok: true, semente, vencedor: r.vencedor ?? 'empate', turnos: r.turnos,
    log: { lados: { A: A.map((c, i) => inicio(montarLutador(pack, c, 'A', i))), B: B.map((c, i) => inicio(montarLutador(pack, c, 'B', i))) },
           eventos: r.eventos },
    versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(pack),
  };
}

/* O REPLAY, só do log: a vida de cada um depois de cada golpe, e quem ficou
   de pé. Sem motor, sem pack — é o que a tela da ST-11.6 encena. */
export function replayDoLog(log) {
  const hp = { A: (log?.lados?.A ?? []).map(x => x.hp), B: (log?.lados?.B ?? []).map(x => x.hp) };
  const quadros = (log?.eventos ?? []).map(e => {
    const lado = e.para[0], i = Number(e.para.slice(1));
    hp[lado][i] = Math.max(0, hp[lado][i] - (e.dano ?? 0));
    return { ...e, hpDepois: hp[lado][i] };
  });
  const vivos = l => hp[l].filter(h => h > 0).length;
  return { quadros, final: { A: [...hp.A], B: [...hp.B] },
           vencedor: vivos('A') && !vivos('B') ? 'A' : vivos('B') && !vivos('A') ? 'B' : 'empate' };
}
