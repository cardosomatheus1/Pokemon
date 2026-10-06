/* AT6-05 · camada 0. Somente fatos da linha encenada, inclusive replays antigos.
   Slots mantêm o lado original da partida; A/B de lados são a perspectiva da UI. */
const vazio=()=>({tentativas:0,erros:0,criticos:0,superEfetivos:0,resistidos:0,imunidades:0,hpRetirado:0,nocautes:0});
export function resumoDaBatalha(linha){
  const r={A:vazio(),B:vazio()},lado=new Map(),hp=new Map();
  for(const l of ['A','B'])for(const c of linha?.lados?.[l]??[]){lado.set(c.slot,l);hp.set(c.slot,c.maxHp);}
  for(const e of linha?.passos??[]){
    const l=lado.get(e.de);if(!l||!hp.has(e.para))continue;
    const x=r[l];x.tentativas++;
    if(e.errou){x.erros++;continue;}
    if(e.crit)x.criticos++;
    if(e.eff===0)x.imunidades++;
    else if(e.eff>1)x.superEfetivos++;
    else if(e.eff>0&&e.eff<1)x.resistidos++;
    const antes=hp.get(e.para),retirado=Math.min(antes,Math.max(0,e.dano??0));
    const depois=antes-retirado;hp.set(e.para,depois);x.hpRetirado+=retirado;
    if(antes>0&&depois===0)x.nocautes++;
  }
  return r;
}

/* AS LINHAS DO RESUMO (ST-2.33): cada fato com o lado que se saiu melhor nele.
   Erros, resistidos e imunidades contam ao contrário — menos é melhor para
   quem atacou. "Golpes registrados" não é mérito de ninguém, e empate não
   escolhe lado. */
export const CAMPOS_DO_RESUMO=[['tentativas','Golpes registrados',0],['hpRetirado','HP retirado',1],['nocautes','Nocautes',1],
  ['superEfetivos','Super efetivos',1],['criticos','Críticos',1],['erros','Erros',-1],['resistidos','Resistidos',-1],['imunidades','Imunidades',-1]];
export function linhasDoResumo(r){
  return CAMPOS_DO_RESUMO.map(([chave,rotulo,sinal])=>{
    const a=r?.A?.[chave]??0,b=r?.B?.[chave]??0,dif=(a-b)*sinal;
    return {chave,rotulo,a,b,melhor:!sinal||!dif?null:dif>0?'A':'B'};
  });
}
