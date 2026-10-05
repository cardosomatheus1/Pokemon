/* Holdout da orientação: a sugestão vem só dos duelos públicos; a run usa
   sementes independentes. Registra desempenho, sem publicar probabilidades. */
import {writeFileSync} from 'node:fs';
import PACK from '../content/pokemon_kanto_v1.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {orientacaoAvanco,VERSAO_ORIENTACAO} from '../app/modules/orientacao-avanco.mjs';
import {runComecada,runNoInstante,paraOMotor} from '../app/modules/avanco-conta.mjs';
const n=Number(process.argv.find(x=>x.startsWith('--n='))?.slice(4)??100);
const cenarios=[];
for(const dex of[1,4,7])for(const nivel of[5,10])cenarios.push({dex:[dex],nivel,estagio:1});
for(const [estagio,niveis,dex]of[[2,[12,14],[2,5,8]],[3,[19,24],[3,6,9]],[4,[31,36],[3,6,9]]])
  for(const nivel of niveis)cenarios.push({dex,nivel,estagio});
const resultados=[],custos=[];
for(const c of cenarios){
  const criaturas=c.dex.map((dex,i)=>({id:String(i),dex,nivel:c.nivel,xp:xpParaNivel(c.nivel),iv:Array(6).fill(15),stamina:100}));
  const equipe=criaturas.map(x=>x.id),motor=criaturas.map(x=>paraOMotor(PACK,x));
  const rotas=new Map();
  let escolhidoDia=null,escolhidoNoite=null;
  for(let i=0;i<n;i++){
    const agora=Date.UTC(2026,9,5,i%2?23:12),inicio=performance.now();
    const r=orientacaoAvanco(PACK,{criaturas},{equipe,estagio:c.estagio,bioma:'floresta',agora});
    custos.push(performance.now()-inicio);
    if(i%2)escolhidoNoite=r.sugestao.bioma;else escolhidoDia=r.sugestao.bioma;
    for(const [modo,bioma]of[['sugerida',r.sugestao.bioma],['floresta','floresta']]){
      const run=runComecada(PACK,{bioma,estagio:c.estagio,equipe,motor,raiz:`orientacao-holdout-20261005-${i}`,agora});
      const fim=runNoInstante(PACK,run,motor,agora+86400000).run;
      const x=rotas.get(modo)??{vitorias:0,abates:0,n:0};
      x.vitorias+=Number(fim.fim.completou);x.abates+=fim.abates.reduce((a,x)=>a+x.quantos,0);x.n++;rotas.set(modo,x);
    }
  }
  resultados.push({...c,escolhidoDia,escolhidoNoite,medidas:Object.fromEntries([...rotas].map(([k,x])=>[k,{...x,taxa:x.vitorias/x.n,abatesMedios:x.abates/x.n}]))});
}
custos.sort((a,b)=>a-b);
const r={politica:VERSAO_ORIENTACAO,runs:cenarios.length*n*2,n,
  sementes:'orientacao-holdout-20261005-i',horarios:'12h/23h UTC alternados',
  condicoes:'sem poções; IV 15; sugestão não acessa clima/seed; confronto recomendado versus Floresta, não versus melhor rota possível',
  custoOrientacaoMs:{mediana:custos[Math.floor(custos.length*.5)],p95:custos[Math.floor(custos.length*.95)],maximo:custos.at(-1)},resultados};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);
if(saida)writeFileSync(saida,JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify(r));
