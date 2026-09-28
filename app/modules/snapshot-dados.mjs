/* O SNAPSHOT DE DEFESA — o time da Liga, congelado (ST-11.1 · F5.1 · Spec §9.4) — camada 0.
 *
 * Puro: entram as criaturas da conta (como LUTAM: com o IV e a natureza), os
 * ids escolhidos e o preset; sai o time pronto para o motor, com o power e as
 * duas versões — ou o motivo da recusa. O servidor grava o que sai daqui numa
 * tabela que não aceita UPDATE nem DELETE: evoluir, dar doce ou trocar golpe
 * depois não mexe numa luta já criada (§9.4).
 *
 * O time sai pela MESMA montagem da luta da jornada (`paraTreino` com
 * `golpesDaCriatura`, sobre a criatura hidratada): o que o snapshot guarda é
 * o que o motor luta — a identidade é cobrada em `test/equipe-snapshot.mjs`.
 *
 *   versaoMotor     `VERSAO_TBE`: as regras do dia em que o time foi congelado
 *   versaoConteudo  a impressão digital do que a luta LÊ do pack — tipos,
 *                   espécies e golpes. Mudar a força de um golpe muda a
 *                   impressão, e a partida velha sabe que não é mais a mesma
 */
import { hidratar } from './idle-dados.mjs';
import { golpesDaCriatura } from './moveset-dados.mjs';
import { paraTreino, powerDe, TIME_MAX } from '../../engine/time.mjs';
import { PRESETS, VERSAO_TBE } from '../../engine/treino-batalha.mjs';

/* FNV-1a de 32 bits sobre o JSON do que a luta lê: sem dependência, e a mesma
   entrada dá a mesma impressão em qualquer máquina. */
function fnv(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const conteudoDaLuta = pack => fnv(JSON.stringify({
  tipos: pack?.tipos?.efetividade ?? {},
  especies: [...(pack?.especies ?? []), ...(pack?.lendarios ?? [])].map(e => [e.dex, e.t, e.s]),
  golpes: pack?.golpes ?? {},
}));

export function snapshotDoTime({ pack, criaturas, ids, preset = 'balanced' }) {
  if (!Array.isArray(ids) || !ids.length || ids.length > TIME_MAX) return { ok: false, motivo: `o time tem de 1 a ${TIME_MAX} criaturas` };
  if (new Set(ids).size !== ids.length) return { ok: false, motivo: 'a mesma criatura duas vezes no time' };
  if (!PRESETS.includes(preset)) return { ok: false, motivo: `preset desconhecido: ${preset}` };
  const minhas = new Map((criaturas ?? []).map(c => [c.id, c]));
  const fora = ids.find(id => !minhas.has(id));
  if (fora !== undefined) return { ok: false, motivo: 'essa criatura não é sua' };
  const time = ids.map(id => {
    const c = hidratar(minhas.get(id)), golpes = golpesDaCriatura(pack, c);
    return { id, ...paraTreino(c, golpes), power: powerDe(pack, c, golpes).total };
  });
  return { ok: true, time, preset, power: time.reduce((a, x) => a + x.power, 0),
           versaoMotor: VERSAO_TBE, versaoConteudo: conteudoDaLuta(pack) };
}

/* O que o motor luta, a partir do snapshot gravado: sem o id e sem o power. */
export const timeDoSnapshot = snap => (snap?.time ?? []).map(({ id, power, ...entrada }) => entrada);
