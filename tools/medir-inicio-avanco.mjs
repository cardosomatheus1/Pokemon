/* Compara rotas para um inicial sozinho. Não confunde run sem itens com
   primeiro combate da Jornada nem com probabilidade da arena comum. */
import {writeFileSync} from 'node:fs';
import PACK from '../content/escolhido.mjs';
import {runComecada,runNoInstante,paraOMotor} from '../app/modules/avanco-conta.mjs';
import {VERSAO_MOVESET_RIVAL} from '../app/modules/moveset-dados.mjs';
const n=Number(process.argv.find(x=>x.startsWith('--n='))?.slice(4)??100),resultados=[];
for(const bioma of PACK.biomas)for(const dex of[1,4,7]){
  let vitorias=0,abates=0;
  for(let i=0;i<n;i++){
    const agora=Date.UTC(2026,9,4,i%2?23:12),motor=[paraOMotor(PACK,{id:'inicial',dex,nivel:5,iv:Array(6).fill(15)})];
    const run=runComecada(PACK,{bioma:bioma.id,estagio:1,equipe:['inicial'],motor,raiz:`avanco-inicio-holdout-20261004-${i}`,agora});
    const fim=runNoInstante(PACK,run,motor,agora+86400000).run;
    vitorias+=Number(fim.fim.completou);abates+=fim.abates.reduce((a,x)=>a+x.quantos,0);
  }
  resultados.push({bioma:bioma.id,dex,nivel:5,n,vitorias,taxa:vitorias/n,abatesMedios:abates/n});
}
const r={politica:VERSAO_MOVESET_RIVAL,tbe:'tbe-4',runs:n*resultados.length,
  sementes:'avanco-inicio-holdout-20261004-i',horarios:'12h/23h UTC alternados',
  condicoes:'estágio 1, inicial sozinho, IV 15, moveset padrão, sem poções; simulação não verifica desbloqueio de bioma na conta',resultados};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);
if(saida)writeFileSync(saida,JSON.stringify(r,null,2)+'\n');
for(const dex of[1,4,7])console.log(JSON.stringify({dex,rotas:resultados.filter(x=>x.dex===dex).sort((a,b)=>b.taxa-a.taxa)}));
