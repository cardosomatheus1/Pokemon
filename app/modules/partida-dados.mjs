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
import { fraseDoEvento, PASSO_MS } from './pve-dados.mjs';
import { conferir } from '../../engine/commit.mjs';

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

/* A LINHA DO TEMPO DO REPLAY (ST-11.6b · tela 27), no formato que a
   encenação da jornada já pinta (`linhaDoTempo`) — mas SÓ do log: a vida
   depois de cada golpe é a do `replayDoLog`, e o nome vem de quem chama
   (`nomeDoDex`), sem pack. `eu` diz de que lado o jogador estava: o lado dele
   vai para a esquerda (A na tela), e os slots continuam os da partida. */
export function linhaDoLog(log, nomeDoDex = d => `#${d}`, eu = 'A', aparencia = null) {
  const r = replayDoLog(log), outro = eu === 'A' ? 'B' : 'A';
  /* O shiny entra pela POSIÇÃO no lado (ST-14.3c): o log sai do motor, que
     não recebe aparência, e o snapshot guarda a lista na mesma ordem. */
  const lado = l => (log?.lados?.[l] ?? []).map((f, i) => ({ slot: `${l}${i}`, dex: f.dex, nivel: f.nivel, maxHp: f.hp, nome: nomeDoDex(f.dex),
    shiny: aparencia?.[l]?.[i] === true }));
  const lados = { A: lado(eu), B: lado(outro) };
  /* No espelho (Snorlax contra Snorlax) o nome não diz de quem é: a frase diz
     "seu" e "rival", e a placa continua só com o nome. */
  const todos = [...lados.A, ...lados.B];
  const nome = slot => { const n = todos.find(x => x.slot === slot)?.nome ?? slot; return slot[0] === eu ? `seu ${n}` : `${n} rival`; };
  const max = slot => todos.find(x => x.slot === slot)?.maxHp || 1;
  const passos = r.quadros.map((e, n) => ({ n, t: n * PASSO_MS, turno: e.turno, de: e.de, para: e.para, golpe: e.golpe, dano: e.dano ?? 0,
    eff: e.eff, crit: e.crit, errou: e.errou, caiu: e.caiu, vidaDoAlvo: e.hpDepois, fracaoDoAlvo: e.hpDepois / max(e.para), texto: fraseDoEvento(e, nome) }));
  /* O vencedor do REPLAY, do ponto de vista de quem assiste: 'A' é ele. */
  const vencedor = r.vencedor === 'empate' ? 'empate' : r.vencedor === eu ? 'A' : 'B';
  return { lados, passos, vencedor, duracaoMs: passos.length * PASSO_MS };
}

/* A APARÊNCIA DOS DOIS TIMES (ST-14.3c · L-226): o shiny de cada criatura,
   na ordem em que o snapshot a gravou — a mesma ordem em que o motor monta o
   lado do log (`timeDoSnapshot` só tira campos). O lado A é o defensor; o
   bot não tem snapshot e luta normal. O snapshot de antes da ST-14.3a não tem
   o campo, e fica normal: o que não foi gravado não se inventa. */
export const aparenciaDosTimes = (a, b) => {
  const lado = s => (s?.time ?? []).map(x => x?.shiny === true);
  return { A: lado(a), B: lado(b) };
};

/* A PROVA do replay: o compromisso gravado confere com a raiz revelada, e a
   semente da luta é a que essa raiz dá. As duas juntas dizem que o resultado
   não foi escolhido depois (§9.13). */
export async function provaDaPartida(p) {
  const commit = await conferir(p?.commit, p?.raiz, p?.sal);
  const semente = commit && sementeDaPartida(p.raiz) === p.semente;
  return { ok: !!(commit && semente), commit, semente: !!semente };
}
