/* Relógio do banco, sem dependência de uma expedição. Crédito e cursor são
   inseparáveis para quem persiste. Frações sobrevivem a retornos curtos. */
import { creditar, nivelDe, fatorXpDoEstagio, xpParaNivel } from './nivel-criatura.mjs';
import { estagioMaximo } from './estagios.mjs';
import { VINCULO_POR_HORA_TREINO } from './ausente.mjs';
export const XP_BASE_TREINO_OFFLINE=150;
export const xpPorHoraTreino = estagio => XP_BASE_TREINO_OFFLINE*fatorXpDoEstagio(estagio);
/* ── O BANCO ALCANÇA, NÃO ULTRAPASSA (ST-2.31, L-251) ──────────────────────
 *
 * Sem teto, o banco levava a caixa INTEIRA ao nível 60 em 4 dias e ao 100 em
 * 10, sem jogar — e jogando sem ele o nível 60 leva 34 dias no casual, 22 no
 * diário e 7 no maratona (`tools/estudo-ritmo-xp.mjs`). O XP de quem joga já
 * estava no ritmo; o banco passava por cima.
 *
 * Então o banco serve à coleção, que é para o que ele nasceu (ausente.mjs):
 * traz a reserva até perto do time, e para. A mais forte nunca sobe pelo banco
 * — o teto dela é ela mesma menos a folga —, e por isso o estágio do treino,
 * que sai do nível da coleção, também só sobe jogando. A taxa fica: com o teto,
 * ela decide só a VELOCIDADE com que a reserva alcança, não até onde vai. */
export const FOLGA_DO_BANCO = 3;
export const nivelTetoDoBanco = (criaturas = []) =>
  Math.max(1, Math.max(1, ...criaturas.map(c => nivelDe(c?.xp))) - FOLGA_DO_BANCO);
export const xpTetoDoBanco = criaturas => xpParaNivel(nivelTetoDoBanco(criaturas));
const etapa = n => Math.min(4,Math.max(1,Math.floor(Number(n)||1)));
const etapaDaColecao = criaturas => estagioMaximo(criaturas.map(c=>({nivel:nivelDe(c.xp)})));
/* O estágio fica congelado para o intervalo seguinte: subir ao retornar não
   multiplica retroativamente as horas que passaram. */
export const ritmoTreinoOffline = (estado,criaturas=[]) => ({
  estagio:etapa(estado?.estagio??etapaDaColecao(criaturas)),
  xpPorHora:xpPorHoraTreino(estado?.estagio??etapaDaColecao(criaturas)),
  nivelTeto:nivelTetoDoBanco(criaturas),
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
  const taxa=xpPorHoraTreino(estado.estagio??1),teto=xpTetoDoBanco(criaturas);
  for(const c of criaturas){
    if(!c?.id)continue;
    const inicio=Math.max(de,Number(c.criadaEm)||de,Number(c.treinadoAte)||de);
    const ms=tempoLivre(inicio,agora,janelas,c.id),anterior=estado.restos?.[c.id]??{};
    const x=ms*taxa+resto(anterior.xp),v=ms*VINCULO_POR_HORA_TREINO+resto(anterior.vinculo);
    /* O que o teto corta não vira sobra: guardada, ela pagaria de uma vez no
       dia em que a mais forte subisse, e o banco ultrapassaria pela porta dos
       fundos. */
    const cheio=Math.floor(x/H),xp=Math.min(cheio,Math.max(0,teto-(Math.floor(Number(c.xp))||0))),vinculo=Math.floor(v/H);
    restos[c.id]={xp:xp<cheio?0:x%H,vinculo:v%H};
    const novo=creditar(c,{xp,vinculo});
    credito.push({id:c.id,...novo,treinadoAte:agora});
    if(xp||vinculo)ganhos.push({id:c.id,xp,vinculo});
  }
  const estagio=Math.max(etapa(estado.estagio),etapaDaColecao(criaturas),etapaDaColecao(credito));
  return {estado:{em:agora,restos,estagio,ultimo:ganhos.length?{em:agora,ganhos}:estado.ultimo??null},credito,ganhos};
}
