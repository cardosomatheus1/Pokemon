/* AT6-07: fatos persistidos, idempotentes; painel interno derivado dos ledgers. */
import {emitir} from './telemetria.mjs';
import {POLITICA_ARENA} from '../engine/arena-treinadores.mjs';
import {verbaReservada} from './arena-orcamento.mjs';
export function exposicaoArena(s){
  const time=s?.time??[],ivs=time.flatMap(c=>c.iv??[]);
  return {snapshot:s?.id??null,tamanho:time.length,power:s?.power??0,preset:s?.preset??null,
    nivelMedio:time.length?time.reduce((n,c)=>n+c.nivel,0)/time.length:0,
    ivMedio:ivs.length?ivs.reduce((n,x)=>n+x,0)/ivs.length:null,
    niveis:time.map(c=>c.nivel),ivs:time.map(c=>c.iv??[]),especies:time.map(c=>c.dex),
    versaoMotor:s?.versaoMotor??null,versaoConteudo:s?.versaoConteudo??null};
}
export const anotarArena=(db,{nome,userId=null,chave,campos={},agora})=>{
  if(!chave)throw Error('fato de arena exige chave');
  return emitir(db,{nome,userId,chave:`srv-arena:${chave}`,agora,
    campos:{...campos,origem:'servidor',politica:POLITICA_ARENA.versao}});
};
export function anotarElegibilidadeArena(db,{userId,pack,agora}){
  const row=db.prepare('SELECT progresso_json FROM jornadas WHERE user_id=?').get(userId);
  const vencidos=row?JSON.parse(row.progresso_json).vencidos??[]:[];
  if(pack.jornada?.length&&pack.jornada.every(n=>vencidos.includes(n.id)))
    anotarArena(db,{nome:'arena_elegibilidade_obtida',userId,chave:`campeao:${pack.id}`,agora,campos:{final:pack.jornada.at(-1).id,pack:pack.id}});
}
export function painelArena(db,{desde=0,ate=Number.MAX_SAFE_INTEGER,agora=Date.now()}={}){
  if(![desde,ate].every(Number.isSafeInteger)||desde<0||ate<desde)throw Error('janela inválida');
  const eventos=db.prepare("SELECT nome,user_id,campos FROM telemetry_events WHERE criado_em>=? AND criado_em<? AND nome LIKE 'arena_%'").all(desde,ate);
  const ev=nome=>eventos.filter(e=>e.nome===nome);
  const contas=nome=>new Set(ev(nome).map(e=>e.user_id).filter(Boolean)).size;
  const soma=tipo=>db.prepare('SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE type=? AND created_at>=? AND created_at<?').get(tipo,desde,ate).n;
  const casa=tipo=>db.prepare('SELECT COALESCE(SUM(delta),0) n FROM arena_tesouraria WHERE tipo=? AND criado_em>=? AND criado_em<?').get(tipo,desde,ate).n;
  const resultados=ev('arena_partida_liquidada').map(e=>JSON.parse(e.campos));
  const diasPorConta=new Map();
  const historico=db.prepare("SELECT criado_em,campos FROM telemetry_events WHERE nome='arena_partida_liquidada' AND criado_em<?").all(ate);
  for(const e of historico){const p=JSON.parse(e.campos);if(p.modo!=='ranqueada'||!p.contou)continue;for(const u of p.lados??[]){const dias=diasPorConta.get(u)??new Set();dias.add(Math.floor(e.criado_em/86400000));diasPorConta.set(u,dias);}}
  const diaLimite=Math.floor(ate/86400000),desdeDia=Math.floor(desde/86400000);
  const coorte=[...diasPorConta.values()].map(d=>({primeiro:Math.min(...d),dias:d})).filter(d=>d.primeiro>=desdeDia&&d.primeiro+8<=diaLimite);
  const metagame=new Map();
  for(const p of resultados.filter(p=>p.modo==='ranqueada'&&p.contou))for(const lado of ['A','B']){
    const x=p.exposicao?.[lado];if(!x)continue;
    for(const [i,dex] of x.especies.entries()){const k=`${p.tiers?.[lado]??'?'}:${x.preset}:${dex}`,v=metagame.get(k)??{tier:p.tiers?.[lado],preset:x.preset,dex,exposicoes:0,vitorias:0,empates:0,nivelTotal:0,ivTotal:0};
      v.exposicoes++;v.vitorias+=p.vencedor===lado?1:0;v.empates+=p.vencedor==='empate'?1:0;v.nivelTotal+=x.niveis?.[i]??x.nivelMedio;const iv=x.ivs?.[i];v.ivTotal+=iv?.length?iv.reduce((n,v)=>n+v,0)/iv.length:x.ivMedio??0;metagame.set(k,v);}
  }
  return {desde,ate,politica:POLITICA_ARENA.versao,
    funil:{campeoes:contas('arena_elegibilidade_obtida'),timesProntos:contas('arena_time_publicado'),publicacoes:ev('arena_time_publicado').length,
      melhorias:ev('arena_time_melhorado').length,buscas:ev('arena_busca_concluida').length,buscasVazias:ev('arena_busca_concluida').filter(e=>!JSON.parse(e.campos).encontrou).length,
      partidas:resultados.length,participantes:new Set(resultados.flatMap(p=>p.lados??[])).size,
      retornos:db.prepare(`SELECT COUNT(*) n FROM (SELECT u FROM (SELECT user_a u,criada_em t FROM league_matches UNION ALL SELECT user_b,criada_em FROM league_matches) WHERE t>=? AND t<? GROUP BY u HAVING COUNT(DISTINCT CAST(t/86400000 AS INTEGER))>1)`).get(desde,ate).n},
    economia:{kitEmitido:soma('ARENA_CHAMPION_KIT'),devolucoes:soma('LEAGUE_STAKE_RETURN'),ganhosInternos:soma('LEAGUE_PAYOUT_BONUS'),taxaCasa:casa('LEAGUE_RAKE'),promocoesFinanciadas:-casa('PROMO_DEBIT')},
    retencao:{coorteCompleta7dias:coorte.length,retornoDia1:coorte.filter(d=>d.dias.has(d.primeiro+1)).length,retornoDia7:coorte.filter(d=>d.dias.has(d.primeiro+7)).length},
    campanhas:{earnedEmitido:soma('ARENA_EARNED_REWARD'),snapshotEm:agora,verbaCasaReservada:verbaReservada(db,{agora:Math.min(agora,ate)}),dotacaoRegistrada:db.prepare('SELECT COALESCE(SUM(valor),0) n FROM arena_dotacoes WHERE criado_em>=? AND criado_em<?').get(desde,ate).n},
    metagame:[...metagame.values()].map(v=>({...v,nivelMedio:v.nivelTotal/v.exposicoes,ivMedio:v.ivTotal/v.exposicoes}))};
}
