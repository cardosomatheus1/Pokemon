// Estudo externo: importa o jogo sem alterar seu código ou dados persistidos.
// node estudo-combate.mjs --repo=/caminho/Pokemon --out=/caminho/resultados.json
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
if(!args.repo) throw new Error('Informe --repo=/caminho/do/repositorio');
const repo=path.resolve(args.repo);
const mod=async p=>import(pathToFileURL(path.join(repo,p)));
const {default:pack}=await mod('content/escolhido.mjs');
const {simular,montarLutador,REGRAS,VERSAO_TBE}=await mod('engine/treino-batalha.mjs');
const {rng,dano,efeito}=await mod('engine/primitivas.mjs');
const {padraoDoMoveset,liberados,movesetValido}=await mod('app/modules/moveset-dados.mjs');
const {powerDe}=await mod('engine/time.mjs');
const {rivalDe}=await mod('app/modules/treino-dados.mjs');
const {lutadoresDoNo}=await mod('app/modules/jornada-conta.mjs');
const {paraOMotor}=await mod('app/modules/avanco-conta.mjs');
const {elencoDoEstagio}=await mod('engine/elenco-estagio.mjs');
const {poderDaEquipe,ameacaDa,chanceDe,simularAvanco}=await mod('engine/wave.mjs');
const {criarMotor}=await mod('engine/engine.mjs');
const {simularLote}=await mod('engine/preco.mjs');
const chart=pack.tipos.efetividade, allMoves=Object.values(pack.golpes).flat();
const byName=n=>allMoves.find(g=>g.n===n);
const species=dex=>pack.especies.find(e=>e.dex===dex);
const make=(dex,nivel=60,iv=15)=>({dex,nivel,iv:Array(6).fill(iv),natureza:'Hardy',golpes:padraoDoMoveset(pack,dex,nivel)});
const base=[6,9,3,149,143,65].map(d=>make(d));
const clone=x=>structuredClone(x);
const fixtures=[]; let combats=0;
function check(t){for(const c of t) assert(movesetValido(pack,c.dex,c.nivel,c.golpes).ok);}
function stats(values){const n=values.length,mean=values.reduce((a,b)=>a+b,0)/n;
 const variance=n>1?values.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):0;
 const half=1.96*Math.sqrt(variance/n);
 return {n,mean,ci95:[Math.max(0,mean-half),Math.min(1,mean+half)]};}
function power(t){return t.reduce((s,c)=>s+powerDe(pack,c,c.golpes).total,0);}
function paired(A,B,n=2000,sim=simular){check(A);check(B);
 const xs=[];let draws=0,turns=0,directA=0,swappedA=0;
 for(let i=0;i<n;i++){
  const seed=(0xC0410000+i)>>>0;
  const x=sim(pack,A,B,seed,{registrar:false});
  const y=sim(pack,B,A,seed,{registrar:false});
  directA+=x.vencedor==='A'?1:x.vencedor===null?.5:0;swappedA+=y.vencedor==='A'?1:y.vencedor===null?.5:0;
  combats+=2; draws+=(x.vencedor===null)+(y.vencedor===null);turns+=x.turnos+y.turnos;
  xs.push(((x.vencedor==='A'?1:x.vencedor===null?.5:0)+(y.vencedor==='B'?1:y.vencedor===null?.5:0))/2);
 }
 return {...stats(xs),battles:n*2,draws,directAWinRate:directA/n,swappedAWinRate:swappedA/n,meanTurns:turns/(n*2),powerA:power(A),powerB:power(B)};
}
function row(id,A,B,n=2000){fixtures.push({id,A:clone(A),B:clone(B),roots:n});return {id,...paired(A,B,n)};}
const result={meta:{commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
 branch:execFileSync('git',['branch','--show-current'],{cwd:repo,encoding:'utf8'}).trim(),pack:pack.id,tbe:VERSAO_TBE,
 protocol:'study-v1; seed roots 0xC0410000+i; swap A/B; mean score, draw=0.5; 95% interval clusters by root; not independent-binomial CI',
 warning:'Synthetic controlled fixtures, no player-population estimate. No persistent game writes.'},
 catalog:{moves:allMoves.length,accuracy:allMoves.reduce((a,g)=>(a[g.acc??'default92']=(a[g.acc??'default92']??0)+1,a),{}),species:pack.especies.length,arenaSpecies:pack.elenco.length},mirrors:[]};
result.mirrors.push(row('baseline_identical',base,base));
for(const level of [61,62,65,70]){
 const t=clone(base).map(c=>({...c,nivel:level}));result.mirrors.push(row(`level_${level}_vs_60_fixed_moves`,t,base));
}
for(const iv of [16,20,25,31]){const t=clone(base).map(c=>({...c,iv:Array(6).fill(iv)}));result.mirrors.push(row(`all_iv_${iv}_vs_15`,t,base));}
for(const k of [0,1,2,3,4,5]){const t=clone(base);t.forEach(c=>c.iv[k]=31);result.mirrors.push(row(`only_iv_index_${k}_31_vs_15`,t,base));}
const nature=clone(base);nature.forEach(c=>c.natureza=[3,6,9,65].includes(c.dex)?'Modest':'Adamant');
result.mirrors.push(row('offensive_nature_vs_hardy',nature,base));
const fast=clone(base);fast.forEach(c=>c.natureza=[3,6,9,65].includes(c.dex)?'Timid':'Jolly');
result.mirrors.push(row('speed_nature_vs_hardy',fast,base));
const weak=clone(base).map(c=>({...c,golpes:['Quick Attack']}));
result.mirrors.push(row('default_moves_vs_quick_attack_only',base,weak));
result.fighterStats={iv15:base.map(c=>montarLutador(pack,c,'A',0)),iv31:base.map(c=>montarLutador(pack,{...c,iv:Array(6).fill(31)},'A',0))};
console.log('Mirrors complete');
// Diversidade: formas finais da pool real; sorteio sem repetição por time.
const random=rng(0xAA551234), pool=pack.elenco;
const randomTeam=()=>{const ds=[...pool];for(let i=ds.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ds[i],ds[j]]=[ds[j],ds[i]];}return ds.slice(0,6).map(d=>make(d));};
const pairs=Array.from({length:120},()=>({A:randomTeam(),B:randomTeam()}));
result.diverse=[];
for(const [id,transform] of [
 ['baseline',x=>x],['level61',x=>x.map(c=>({...c,nivel:61}))],['level62',x=>x.map(c=>({...c,nivel:62}))],
 ['level65',x=>x.map(c=>({...c,nivel:65}))],['level70',x=>x.map(c=>({...c,nivel:70}))],
 ['iv20',x=>x.map(c=>({...c,iv:Array(6).fill(20)}))],['iv31',x=>x.map(c=>({...c,iv:Array(6).fill(31)}))],
 ['speedIv31',x=>x.map(c=>({...c,iv:c.iv.map((v,k)=>k===5?31:v)}))]]){
 const details=pairs.map((p,i)=>{const a=paired(transform(clone(p.A)),p.B,100);const b=paired(transform(clone(p.B)),p.A,100);return {pair:i,mean:(a.mean+b.mean)/2,directional:[a,b]};});
 const mean=stats(details.map(d=>d.mean));
 result.diverse.push({id,...mean,details});
}
result.diverseFixtures=pairs;
console.log('Diverse teams complete');

// Candidatos de pesquisa: altera só a ordenação em uma cópia em memória.
// Não é regra aprovada nem versão implantada. RNG mantém a contagem original.
let source=fs.readFileSync(path.join(repo,'engine/treino-batalha.mjs'),'utf8');
for(const name of ['especie','primitivas']) source=source.replace(`'./${name}.mjs'`,JSON.stringify(pathToFileURL(path.join(repo,`engine/${name}.mjs`)).href));
const order='.sort((x, y) => y.f.spe - x.f.spe || x.k - y.k)';
assert(source.includes(order));
const importSource=async s=>(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).simular;
const exactCopy=await importSource(source);
for(let i=0;i<100;i++)assert.deepEqual(exactCopy(pack,pairs[i].A,pairs[i].B,i,{registrar:true}),simular(pack,pairs[i].A,pairs[i].B,i,{registrar:true}));
result.candidates=[];
for(const jitter of [.05,.10]){
 const candidate=await importSource(source.replace(order,`.sort((x,y)=>y.f.spe*(1+${jitter}*(2*y.k-1))-x.f.spe*(1+${jitter}*(2*x.k-1)) || x.k-y.k)`));
 const rows=[];
 for(const [id,change] of [['equal',x=>x],['level61',x=>x.map(c=>({...c,nivel:61}))],['level65',x=>x.map(c=>({...c,nivel:65}))],['iv16',x=>x.map(c=>({...c,iv:Array(6).fill(16)}))],['iv31',x=>x.map(c=>({...c,iv:Array(6).fill(31)}))]]) rows.push({id,...paired(change(clone(base)),base,2000,candidate)});
 const diverse=[];
 for(const [id,change] of [['level61',x=>x.map(c=>({...c,nivel:61}))],['level65',x=>x.map(c=>({...c,nivel:65}))],['iv31',x=>x.map(c=>({...c,iv:Array(6).fill(31)}))]]){
  const values=pairs.map(p=>(paired(change(clone(p.A)),p.B,100,candidate).mean+paired(change(clone(p.B)),p.A,100,candidate).mean)/2);
  diverse.push({id,...stats(values)});
 }
 result.candidates.push({jitter,parityFixtures:100,mirrors:rows,diverse});
}
console.log('Research candidates complete');

// Nós reais: mesmos rivais e seleção de titulares utilizada pela Jornada.
result.journey=[];
for(const [id,ds,levels] of [['rota1',[1],[4,5,6,8]],['pewter',[1,7],[10,12,14]],['pewter',[4,16],[10,12,14]],
 ['cerulean',[2,25],[18,21,24]],['campeao',[6,9,3,149,143,65],[55,60,65]]]){
 const node=pack.jornada.find(n=>n.id===id), trainer=pack.treinadores.find(t=>t.id===node.rival), B=rivalDe(pack,trainer);
 for(const L of levels){const A=lutadoresDoNo(pack,ds.map(d=>make(d,L)),node,B);
  result.journey.push(row(`${id}_team_${ds.join('-')}_level${L}`,A,B,2000));}
}
// Avanço: resolução de dez waves; sem poção, clima neutro e equipe fixa.
result.advance=[];
const elenco=elencoDoEstagio(pack,'floresta',1);
for(const [id,ds,L,iv] of [['starter_level1',[1],1,15],['starter_level12',[1],12,15],['starter_level30',[1],30,15],
 ['starter_level40',[1],40,15],['evolved_level40',[3],40,15],['trio_level12',[1,4,7],12,15],['starter_iv0',[1],12,0],['starter_iv31',[1],12,31]]){
 const cs=ds.map(d=>make(d,L,iv)), equipe=cs.map(c=>paraOMotor(pack,c));const outcomes=[];
 let hp=0,tries=0;for(let i=0;i<5000;i++){const x=simularAvanco(rng(0xC0410000+i),{elenco,estagio:1,equipe});outcomes.push(x.completou?1:0);hp+=x.hp;tries+=x.tentativas;}
 const p=poderDaEquipe(equipe),a=ameacaDa({elenco,wave:1,estagio:1});
 result.advance.push({id,equipe,...stats(outcomes),power:p,threat:a,firstWaveChance:chanceDe(p,a),meanHp:hp/5000,meanAttempts:tries/5000});
}
assert.deepEqual(result.advance.find(x=>x.id==='starter_iv0').equipe,result.advance.find(x=>x.id==='starter_iv31').equipe);
// Tipos podem alterar elegibilidade/clima. Este controle isola somente a resolução da wave.
const advanced=paraOMotor(pack,make(1,12));
const altered={...advanced,tipos:['fire'],iv:Array(6).fill(31),natureza:'Modest',golpes:['Fire Blast']};
for(let i=0;i<1000;i++)assert.deepEqual(simularAvanco(rng(i),{elenco,estagio:1,equipe:[advanced]}),simularAvanco(rng(i),{elenco,estagio:1,equipe:[altered]}));
result.advanceControls={unchangedByIVNatureMovesAndOffensiveTypes:1000,scope:'same fixed enemy pool, same summed base stats, neutral climate; not biome/climate eligibility'};
console.log('Journey and advance complete');
// Primitiva real: isola tipo e precisão dos outros atributos, não estima chance de time.
result.hits=[];
const A={types:['water'],atk:100,spa:100},neutral={types:['normal'],def:100,spd:100};
for(const [name,dt] of [['Surf',['normal']],['Hydro Pump',['normal']],['Surf',['fire']],['Surf',['rock','ground']],['Surf',['water']],['Surf',['water','dragon']],['Thunderbolt',['ground']],['Body Slam',['normal']]]){
 const g=byName(name),D={...neutral,types:dt};let misses=0,hits=0,crits=0,total=0,min=Infinity,max=0;
 const R=rng(12345);for(let i=0;i<100000;i++){
  if(R()>=(g.acc??REGRAS.ACERTO_PADRAO)){misses++;continue;}
  const d=dano(chart,A,D,g,R,1,1,60,REGRAS.CRITICO,REGRAS.MULT_CRITICO);hits++;crits+=d.crit;total+=d.dmg;min=Math.min(min,d.dmg);max=Math.max(max,d.dmg);
 }
 result.hits.push({move:name,defTypes:dt,power:g.p,accuracy:g.acc??REGRAS.ACERTO_PADRAO,stab:A.types.includes(g.t)?1.5:1,effectiveness:efeito(chart,g.t,dt),attempts:100000,missRate:misses/100000,critRateOnLanded:crits/hits,meanDamagePerAttempt:total/100000,minLanded:min,maxLanded:max});
}
// Arena comum: mesma integração de clima/seed utilizada na precificação atual.
const M=criarMotor(pack), speciesRows=new Map(pool.map(d=>[d,{dex:d,name:species(d).n,bst:species(d).s.reduce((a,b)=>a+b,0),appearances:0,wins:0}]));
result.commonArena={poolCount:64,battlesPerPool:1000,pools:[]};
for(let i=0;i<64;i++){
 const fighters=M.sortearPool(0x71000000+i),wins=Array(12).fill(0);
 simularLote(M,fighters,0x72000000+i,0,1000,wins);combats+=1000;
 result.commonArena.pools.push({seed:0x71000000+i,rows:fighters.map((f,k)=>({dex:f.dex,wins:wins[k]}))});
 fighters.forEach((f,k)=>{const row=speciesRows.get(f.dex);row.appearances+=1000;row.wins+=wins[k];});
}
result.commonArena.species=[...speciesRows.values()].map(x=>({...x,conditionalWinRate:x.wins/x.appearances}));
const sorted=[...result.commonArena.species].sort((a,b)=>a.bst-b.bst);
result.commonArena.quartiles=Array.from({length:4},(_,q)=>{const rows=sorted.slice(Math.floor(q*sorted.length/4),Math.floor((q+1)*sorted.length/4));const wins=rows.reduce((s,x)=>s+x.wins,0),appearances=rows.reduce((s,x)=>s+x.appearances,0);return {q:q+1,bstMin:rows[0].bst,bstMax:rows.at(-1).bst,species:rows.length,wins,appearances,conditionalWinRate:wins/appearances};});
const fixed=M.sortearPool(0x71000000),wins=Array(12).fill(0);simularLote(M,fixed,0x74000000,0,20000,wins);combats+=20000;
result.commonArena.fixedPool=fixed.map((f,i)=>({dex:f.dex,name:species(f.dex).n,bst:species(f.dex).s.reduce((s,x)=>s+x,0),wins:wins[i],rate:wins[i]/20000}));
result.fixtures=fixtures;result.meta.totalCombatSimulations=combats;result.meta.advanceRuns=40000;result.meta.hitAttempts=800000;result.meta.advanceControlComparisons=1000;
const out=args.out?path.resolve(args.out):path.join(process.cwd(),'resultados-combate.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,meta:result.meta,mirrors:result.mirrors.map(x=>({id:x.id,rate:x.mean})),diverse:result.diverse.map(x=>({id:x.id,rate:x.mean})),arenaQuartiles:result.commonArena.quartiles},null,2));
