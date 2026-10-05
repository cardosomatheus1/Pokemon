/* Holdout reproduzível de progressão; não impõe vitória artificial à aventura. */
import {writeFileSync} from 'node:fs';
import PACK from '../content/escolhido.mjs';
import {runComecada,runNoInstante,paraOMotor} from '../app/modules/avanco-conta.mjs';
import {VERSAO_MOVESET_RIVAL} from '../app/modules/moveset-dados.mjs';
const n=Number(process.argv.find(x=>x.startsWith('--n='))?.slice(4)??100);
const resultados=[];
function medir({bioma,estagio,dex,nivel,delta=0,iv=15,nome}){
  let vitorias=0,abates=0,tempo=0;
  for(let i=0;i<n;i++){
    const agora=Date.UTC(2026,9,4,i%2?23:12);
    const motor=dex.map((d,k)=>paraOMotor(PACK,{id:String(k),dex:d,nivel:nivel+delta,iv:Array(6).fill(iv)}));
    const r=runComecada(PACK,{bioma,estagio,equipe:motor.map(c=>c.id),motor,raiz:`avanco-holdout-20261004-${i}`,agora});
    const fim=runNoInstante(PACK,r,motor,agora+86400000).run;
    vitorias+=Number(fim.fim.completou);abates+=fim.abates.reduce((a,x)=>a+x.quantos,0);tempo+=fim.fim.em-agora;
  }
  const r={nome,bioma,estagio,dex,nivel:nivel+delta,iv,n,vitorias,taxa:vitorias/n,abatesMedios:abates/n,minutosMedios:tempo/n/60000};
  resultados.push(r);console.log(JSON.stringify(r));
}
for(const dex of[1,4,7])for(const delta of[0,1,2,5])medir({nome:'iniciais',bioma:'floresta',estagio:1,dex:[dex],nivel:5,delta});
for(const estagio of[2,3,4])for(const delta of[0,1,2,5]){
  const dex=estagio===2?[2,5,8]:[3,6,9];
  medir({nome:'evoluídos',bioma:'floresta',estagio,dex,nivel:[0,12,19,31][estagio-1],delta});
}
for(const bioma of['praia','campo','montanha','vulcao'])for(const delta of[0,5])medir({nome:'rotas',bioma,estagio:2,dex:[2,5,8],nivel:12,delta});
for(const iv of[0,15,31])medir({nome:'IVs',bioma:'floresta',estagio:3,dex:[3,6,9],nivel:19,iv});
const relatorio={versao:'avanco-tbe-1',tbe:'tbe-4',politicaRival:VERSAO_MOVESET_RIVAL,sementes:'avanco-holdout-20261004-i',horarios:'04/10/2026, 12h e 23h UTC alternados',runs:resultados.length*n,resultados};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);
if(saida)writeFileSync(saida,JSON.stringify(relatorio,null,2)+'\n');
