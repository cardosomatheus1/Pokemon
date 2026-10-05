/* Camada 0: rótulos dos fatos da batalha, sem inferir acerto a partir do dano. */
export function textoDoDano(golpe){
  if(golpe.errou || (golpe.errou == null && golpe.eff == null && !golpe.dano))return 'ERROU';
  if(golpe.eff===0)return 'IMUNE';
  const tags=[];
  if(golpe.crit)tags.push('crítico');
  if(golpe.eff>1)tags.push('super efetivo');
  else if(golpe.eff>0&&golpe.eff<1)tags.push('pouco efetivo');
  return '-'+golpe.dano+(tags.length?' · '+tags.join(' · '):'');
}
