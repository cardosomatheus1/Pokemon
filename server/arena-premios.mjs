import { creditar } from './carteira.mjs';
import { emitir } from './telemetria.mjs';

export const KIT_ARENA = 300;
/* Emissão inicial única da campanha: PC-B, sem conversão para PC-T e sem
   contar como receita da casa. A chave permanece válida entre temporadas. */
export function concederKitArena(db, {userId,agora}) {
  const r=creditar(db,{userId,tipo:'ARENA_CHAMPION_KIT',bucket:'bonus',valor:KIT_ARENA,
    idem:`arena-kit:${userId}`,ref:userId,refTipo:'arena_acesso',agora});
  const pago=r.ok && !r.repetida ? KIT_ARENA : 0;
  if(pago)emitir(db,{nome:'arena_kit_concedido',userId,chave:`arena-kit:${userId}`,agora,campos:{origem:'servidor',valor:pago}});
  return pago;
}
