/* Holdout reproduzível: sementes não usadas na escolha da iniciativa.
 * Os dois lados usam a mesma seed; IC calculado por PAR, não por luta. */
import { writeFileSync } from 'node:fs';
import pack from '../content/escolhido.mjs';
import { simular, VERSAO_TBE } from '../engine/treino-batalha.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
const raiz=0x37D00000,pares=1000;
const entrada=(dex,nivel=60)=>({dex,nivel,iv:Array(6).fill(15),natureza:'Hardy',golpes:padraoDoMoveset(pack,dex,nivel)});
const ponto=(r,lado)=>r.vencedor===lado?1:r.vencedor===null?.5:0;
function medir(a,b,seed) {
  const amostras=[];let vitorias=0,derrotas=0,empates=0;
  for(let i=0;i<pares;i++){
    const x=simular(pack,a,b,seed+i,{registrar:false}),y=simular(pack,b,a,seed+i,{registrar:false});
    amostras.push((ponto(x,'A')+ponto(y,'B'))/2);
    for(const [r,lado]of[[x,'A'],[y,'B']]){if(r.vencedor===null)empates++;else if(r.vencedor===lado)vitorias++;else derrotas++;}
  }
  const p=amostras.reduce((a,b)=>a+b,0)/pares;
  const erro=Math.sqrt(amostras.reduce((s,x)=>s+(x-p)**2,0)/(pares-1)/pares);
  return {pares,lutas:pares*2,vitorias,derrotas,empates,pontos:p,ic95:[Math.max(0,p-1.96*erro),Math.min(1,p+1.96*erro)]};
}
const times=[[6,9,3,149,143,65],[68,76,80,94,131,135],[18,26,34,59,103,134],[38,47,62,82,91,112]];
const resultados=[];
for(const [i,dexes]of times.entries()){
  const base=dexes.map(d=>entrada(d));
  for(const [j,delta]of[0,1,2,5].entries())
    resultados.push({cenario:`formacao-${i+1}`,dexes,efeito:`nivel+${delta}`,
      ...medir(base.map(c=>({...c,nivel:c.nivel+delta})),base,raiz+i*100000+j*5000)});
  resultados.push({cenario:`formacao-${i+1}`,dexes,efeito:'IV31-versus15',
    ...medir(base.map(c=>({...c,iv:Array(6).fill(31)})),base,raiz+i*100000+25000)});
}
const r={versaoMotor:VERSAO_TBE,data:'2026-10-04',raiz,paresPorCenario:pares,
  metodo:'espelhos controlados com troca de lado; IC normal por par; movesets fixos de nível 60; sem certificação global de matchmaking',
  totalLutas:resultados.reduce((n,r)=>n+r.lutas,0),resultados};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8)??'docs/arena-treinadores/BALANCEAMENTO_TBE4.json';
writeFileSync(saida,JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify(r));
