/* Relógio do banco, sem dependência de uma expedição. Crédito e cursor são
   inseparáveis para quem persiste. Frações sobrevivem a retornos curtos. */
import { creditar } from './nivel-criatura.mjs';
import { XP_POR_HORA_TREINO, VINCULO_POR_HORA_TREINO } from './ausente.mjs';
export const JANELA_TREINO_MS = 12 * 3600000;
const H=3600000;
const resto=n=>Number.isSafeInteger(n)&&n>=0&&n<H?n:0;
function tempoLivre(de,ate,janelas,id){
  let cursor=de,ms=0;
  const intervalos=janelas.filter(j=>j.equipe?.includes(id))
    .map(j=>[Math.max(de,j.de),Math.min(ate,j.ate??ate)])
    .filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  for(const [a,b] of intervalos){if(a>cursor)ms+=a-cursor;cursor=Math.max(cursor,b);}
  return ms+Math.max(0,ate-cursor);
}
export function contaTreinoOffline({estado=null,criaturas=[],janelas=[],agora}){
  if(!Number.isSafeInteger(agora)||agora<0)throw new Error('relógio de treino inválido');
  if(!Number.isSafeInteger(estado?.em))return {estado:{em:agora,restos:{}},credito:[],ganhos:[]};
  if(agora<=estado.em)return {estado,credito:[],ganhos:[]};
  const de=Math.max(estado.em,agora-JANELA_TREINO_MS),restos={},credito=[],ganhos=[];
  for(const c of criaturas){
    if(!c?.id)continue;
    const inicio=Math.max(de,Number(c.criadaEm)||de,Number(c.treinadoAte)||de);
    const ms=tempoLivre(inicio,agora,janelas,c.id),anterior=estado.restos?.[c.id]??{};
    const x=ms*XP_POR_HORA_TREINO+resto(anterior.xp),v=ms*VINCULO_POR_HORA_TREINO+resto(anterior.vinculo);
    const xp=Math.floor(x/H),vinculo=Math.floor(v/H);
    restos[c.id]={xp:x%H,vinculo:v%H};
    const novo=creditar(c,{xp,vinculo});
    credito.push({id:c.id,...novo,treinadoAte:agora});
    if(xp||vinculo)ganhos.push({id:c.id,xp,vinculo});
  }
  return {estado:{em:agora,restos,ultimo:ganhos.length?{em:agora,ganhos}:estado.ultimo??null},credito,ganhos};
}
