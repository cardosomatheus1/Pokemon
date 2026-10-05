import { contaTreinoOffline, JANELA_TREINO_MS } from '../../engine/treino-offline.mjs';
export const camposTreinoOffline = cru => ({treinoOffline:Number.isSafeInteger(cru?.treinoOffline?.em)?cru.treinoOffline:null});
/* A ação guarda as janelas das runs antes de descartar a run colhida. */
export function treinarNoAparelho(e,agora){
  const historico=(Array.isArray(e.treinoOffline?.ocupacoes)?e.treinoOffline.ocupacoes:[]).filter(x=>x.ate>agora-JANELA_TREINO_MS);
  if(e.run){
    const k=`${e.run.iniciadaEm}:${e.run.equipe.join(',')}`;
    const nova={k,equipe:[...e.run.equipe],de:e.run.iniciadaEm,ate:agora};
    const anterior=historico.find(x=>x.k===k);
    if(anterior)anterior.ate=agora;else historico.push(nova);
  }
  const janelas=[...historico,...(e.expedicoes??[]).map(x=>({equipe:x.equipe,de:x.iniciadaEm,ate:x.colhidaEm??agora}))];
  const r=contaTreinoOffline({estado:e.treinoOffline,criaturas:e.criaturas,janelas,agora});
  for(const novo of r.credito){const c=e.criaturas.find(x=>x.id===novo.id);Object.assign(c,{xp:novo.xp,nivel:novo.nivel,vinculo:novo.vinculo,treinadoAte:novo.treinadoAte});}
  e.treinoOffline={...r.estado,ocupacoes:historico};
  return r;
}
