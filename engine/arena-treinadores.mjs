/* Política versionada da competição. O motor de combate não importa isto. */
export const POLITICA_ARENA = Object.freeze({ versao: 'at6-1', tamanho: 6, difRating: 150,
  razaoPower: 1.05, difNivelMedio: 1, difNivelPosicao: 2, defesas: 3, validadeMs: 86_400_000,
  paresEstimacao:128, chanceMin:.35, chanceMax:.65, limiteIcMin:.30, limiteIcMax:.70, candidatosMax:12 });

export function acessoArena(pack, progresso, time) {
  const nos = pack?.jornada ?? [];
  if (!nos.length || !nos.every(n => progresso?.vencidos?.includes(n.id)))
    return { ok: false, motivo: 'Complete a jornada e vença o campeão para liberar a Arena de Treinadores.' };
  if (!Array.isArray(time) || time.length !== POLITICA_ARENA.tamanho)
    return { ok: false, motivo: 'A arena exige um time completo de seis criaturas.' };
  if (new Set(time.map(c => c.id)).size !== 6 || new Set(time.map(c => c.dex)).size !== 6)
    return { ok: false, motivo: 'Use seis criaturas de espécies diferentes.' };
  return { ok: true };
}

export function parCompativel(a, b, ratingA, ratingB) {
  if (![ratingA,ratingB].every(Number.isFinite)) return false;
  if (![a, b].every(s => s?.time?.length === 6 && Number.isFinite(s.power) && s.power > 0)) return false;
  if (Math.abs(ratingA - ratingB) > POLITICA_ARENA.difRating) return false;
  if (Math.max(a.power, b.power) / Math.min(a.power, b.power) > POLITICA_ARENA.razaoPower) return false;
  const niveis = s => s.time.map(c => c.nivel).sort((x, y) => x - y);
  const A = niveis(a), B = niveis(b);
  if (![...A, ...B].every(n => Number.isInteger(n) && n >= 1 && n <= 100)) return false;
  if (Math.abs(A.reduce((x, n) => x + n, 0) - B.reduce((x, n) => x + n, 0)) > 6 * POLITICA_ARENA.difNivelMedio) return false;
  return A.every((n, i) => Math.abs(n - B[i]) <= POLITICA_ARENA.difNivelPosicao);
}
