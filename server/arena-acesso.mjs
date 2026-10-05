import { acessoArena } from '../engine/arena-treinadores.mjs';

export function acessoDaArena(db, userId, pack, time) {
  const r = db.prepare('SELECT progresso_json FROM jornadas WHERE user_id = ?').get(userId);
  return acessoArena(pack, r ? JSON.parse(r.progresso_json) : null, time);
}
export function exigirAcessoArena(db, userId, pack, time) {
  const a = acessoDaArena(db, userId, pack, time);
  if (!a.ok) throw Object.assign(new Error(a.motivo), { codigo: 'ARENA_BLOQUEADA' });
}
