import { creditar,emTransacao } from './carteira.mjs';
import { emitir } from './telemetria.mjs';
import {anotarArena} from './arena-metricas.mjs';

export const KIT_ARENA = 300;
/* Emissão inicial única da campanha: PC-B, sem conversão para PC-T e sem
   contar como receita da casa. A chave permanece válida entre temporadas. */
export function concederKitArena(db, {userId,agora}) {
  return emTransacao(db,()=>{
  const r=creditar(db,{userId,tipo:'ARENA_CHAMPION_KIT',bucket:'bonus',valor:KIT_ARENA,
    idem:`arena-kit:${userId}`,ref:userId,refTipo:'arena_acesso',agora});
  const pago=r.ok && !r.repetida ? KIT_ARENA : 0;
  if(pago)emitir(db,{nome:'arena_kit_concedido',userId,chave:`arena-kit:${userId}`,agora,campos:{origem:'servidor',valor:pago}});
  if(pago)anotarArena(db,{nome:'arena_recompensa_concedida',userId,chave:`kit:${userId}`,agora,campos:{fonte:'kit_campeao',bucket:'bonus',valor:pago,ledger:`arena-kit:${userId}`}});
  return pago;
  });
}
