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
