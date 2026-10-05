/* Relógio do banco, sem dependência de uma expedição. Crédito e cursor são
   inseparáveis para quem persiste. Frações sobrevivem a retornos curtos. */
import { creditar, nivelDe, fatorXpDoEstagio } from './nivel-criatura.mjs';
import { estagioMaximo } from './estagios.mjs';
import { VINCULO_POR_HORA_TREINO } from './ausente.mjs';
export const XP_BASE_TREINO_OFFLINE=150;
export const xpPorHoraTreino = estagio => XP_BASE_TREINO_OFFLINE*fatorXpDoEstagio(estagio);
const etapa = n => Math.min(4,Math.max(1,Math.floor(Number(n)||1)));
const etapaDaColecao = criaturas => estagioMaximo(criaturas.map(c=>({nivel:nivelDe(c.xp)})));
/* O estágio fica congelado para o intervalo seguinte: subir ao retornar não
   multiplica retroativamente as horas que passaram. */
export const ritmoTreinoOffline = (estado,criaturas=[]) => ({
  estagio:etapa(estado?.estagio??etapaDaColecao(criaturas)),
  xpPorHora:xpPorHoraTreino(estado?.estagio??etapaDaColecao(criaturas)),
});
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
  if(!Number.isSafeInteger(estado?.em))return {estado:{em:agora,restos:{},estagio:etapaDaColecao(criaturas)},credito:[],ganhos:[]};
  if(agora<=estado.em)return {estado,credito:[],ganhos:[]};
  const de=Math.max(estado.em,agora-JANELA_TREINO_MS),restos={},credito=[],ganhos=[];
  const taxa=xpPorHoraTreino(estado.estagio??1);
  for(const c of criaturas){
    if(!c?.id)continue;
    const inicio=Math.max(de,Number(c.criadaEm)||de,Number(c.treinadoAte)||de);
    const ms=tempoLivre(inicio,agora,janelas,c.id),anterior=estado.restos?.[c.id]??{};
    const x=ms*taxa+resto(anterior.xp),v=ms*VINCULO_POR_HORA_TREINO+resto(anterior.vinculo);
    const xp=Math.floor(x/H),vinculo=Math.floor(v/H);
    restos[c.id]={xp:x%H,vinculo:v%H};
    const novo=creditar(c,{xp,vinculo});
    credito.push({id:c.id,...novo,treinadoAte:agora});
    if(xp||vinculo)ganhos.push({id:c.id,xp,vinculo});
  }
  const estagio=Math.max(etapa(estado.estagio),etapaDaColecao(criaturas),etapaDaColecao(credito));
  return {estado:{em:agora,restos,estagio,ultimo:ganhos.length?{em:agora,ganhos}:estado.ultimo??null},credito,ganhos};
}
