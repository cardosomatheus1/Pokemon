import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { runComecada, runNoInstante, paraOMotor, runCurada } from '../app/modules/avanco-conta.mjs';
import { cenaDaRun, waveAtual, novaRun, resultadoDa, recuarRun } from '../engine/run-avanco.mjs';
import { montarLutador } from '../engine/treino-batalha.mjs';
import { textoDoDano } from '../app/modules/combate-feedback.mjs';
import { abrirBanco,migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { comecarRun,sincronizarRun,runAberta,pocaoNaRun } from '../server/run.mjs';
import { creditarBolsa,quantosNaBolsa } from '../server/idle.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
const T=Date.UTC(2026,9,4,12);
const motor=(nivel=30,dex=6)=>[paraOMotor(PACK,{id:'a',dex,nivel,iv:Array(6).fill(31),natureza:'Adamant'})];
const iniciar=(m=motor(),raiz='real-test',estagio=1)=>runComecada(PACK,{bioma:'floresta',estagio,equipe:m.map(c=>c.id),motor:m,raiz,agora:T,semEncontros:false});
export function suite(){const s=criarSuite('avanco-combate');
  s.teste('feedback distingue erro, imunidade, crítico, resistência e super efetivo',()=>{
    igual(textoDoDano({dano:0,errou:true,eff:2}),'ERROU');
    igual(textoDoDano({dano:0,errou:false,eff:0}),'IMUNE');
    igual(textoDoDano({dano:12,errou:false,eff:2,crit:true}),'-12 · crítico · super efetivo');
    igual(textoDoDano({dano:3,eff:.25}),'-3 · pouco efetivo');
    igual(textoDoDano({dano:12}),'-12');
    igual(textoDoDano({dano:0}),'ERROU'); // roteiro legado não possui eff/errou
  });
  s.teste('novas runs congelam atributos e moveset; run antiga continua no motor agregado',()=>{
    const m=motor(),r=iniciar(m);
    igual(r.combate?.versao,'avanco-tbe-1');igual(r.combate.equipe[0].iv[0],31);
    igual(r.combate.equipe[0].natureza,'Adamant');ok(r.combate.equipe[0].golpes.length);
    const antes=waveAtual(r,{pack:PACK});m[0].nivel=100;m[0].iv[0]=0;
    igual(JSON.stringify(waveAtual(r,{pack:PACK})),JSON.stringify(antes),'stats alteraram passado');
    const velha=novaRun({bioma:'floresta',estagio:1,equipe:['a'],raiz:'antiga',agora:T});
    const elenco={comuns:[{dex:1,forca:200},{dex:4,forca:200}],chefes:[{dex:3,forca:400}]};
    ok(Number.isFinite(waveAtual(velha,{elenco,equipe:m}).p));
  });
  s.teste('HP e golpes do retrato são os eventos reais; barra não interpola dano fictício',()=>{
    const r=iniciar(),w=waveAtual(r,{pack:PACK});
    const entrada=w.roteiro.momentos.find(m=>m.tipo==='entra'),hit=w.roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='meu'&&m.dano>0);
    ok(hit,'sem ataque');
    const antes=cenaDaRun(r,{pack:PACK,agora:T+entrada.t+1});
    igual(antes.emCena[0].hp,antes.emCena[0].hpMax);ok(antes.emCena[0].hpMax!==100);
    const c=cenaDaRun(r,{pack:PACK,agora:T+hit.t});
    if(!hit.caiu){igual(c.emCena[0].hp,hit.hpAlvo);igual(c.emCena[0].vida,hit.hpAlvo/c.emCena[0].hpMax);}
    ok(hit.nome);ok(typeof hit.crit==='boolean');ok(typeof hit.errou==='boolean');ok(Number.isFinite(hit.eff));
    const f=montarLutador(PACK,r.combate.equipe[0],'A',0);igual(c.heroi.hpMax,f.maxHp);
  });
  s.teste('consulta frequente, retorno offline e JSON produzem exatamente o mesmo saque e log',()=>{
    const r=iniciar(),fim=T+86400000;
    const direto=runNoInstante(PACK,r,motor(),fim).run;
    let parcelado=JSON.parse(JSON.stringify(r));
    for(let agora=T+1000;agora<fim&&!parcelado.fim;agora+=3000)parcelado=runNoInstante(PACK,parcelado,motor(),agora).run;
    igual(JSON.stringify(parcelado),JSON.stringify(direto));ok(direto.fim.completou);
    igual(resultadoDa(direto).abates.reduce((n,a)=>n+a.quantos,0),37);
  });
  s.teste('poção cura HP individual, preserva passado e não ressuscita; recuar guarda abates parciais',()=>{
    const r=iniciar(motor(2,1),'pocao-real');
    const w=waveAtual(r,{pack:PACK}),hit=w.roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.dano>0&&!m.caiu);
    ok(hit,'sem dano antes de cair');const agora=T+hit.t+1;
    const sincronizado=runNoInstante(PACK,r,motor(2,1),agora).run;
    const curado=runCurada(PACK,sincronizado,motor(2,1),{cura:60,agora});ok(curado.curou>0);
    const novo=waveAtual(curado.run,{pack:PACK});
    const passado=p=>p.roteiro.momentos.filter(m=>m.t<=hit.t);
    igual(JSON.stringify(passado(novo)),JSON.stringify(passado(w)));
    ok(cenaDaRun(curado.run,{pack:PACK,agora}).heroi.hp>cenaDaRun(r,{pack:PACK,agora}).heroi.hp);
    let comAbate=waveAtual(iniciar(),{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='abate');
    const parcial=runNoInstante(PACK,iniciar(),motor(),T+comAbate.t+1).run;
    igual(parcial.abates.reduce((n,a)=>n+a.quantos,0),1,'abate parcial perdido');
    igual(runNoInstante(PACK,parcial,motor(),T+comAbate.t+1).run.abates[0].quantos,1,'retry duplicou');
  });
  s.teste('treino melhora a chance gradualmente em holdout; IV melhor também ajuda na aventura',()=>{
    const taxa=(nivel,iv=15)=>{let ganhou=0;
      for(let seed=0;seed<80;seed++){
        const m=[2,5,8].map((dex,i)=>paraOMotor(PACK,{id:String(i),dex,nivel,iv:Array(6).fill(iv)}));
        const r=iniciar(m,`avanco-teste-gradiente-${seed}`,2);
        ganhou+=Number(runNoInstante(PACK,r,m,T+86400000).run.fim.completou);
      }return ganhou/80;
    };
    const taxas=[12,13,17].map(n=>taxa(n));
    ok(taxas[1]>taxas[0]+.05&&taxas[2]>taxas[1]+.10,`nível sem progressão: ${taxas}`);
    const baixo=taxa(12,0),alto=taxa(12,31);ok(alto>baixo+.025,`IV sem vantagem: ${baixo}/${alto}`);
  });
  s.teste('mesmo nível: golpe escolhido e tipo alteram dano de verdade, não só o balão',()=>{
    const a=motor(30,6);a[0].golpes=['Fire Punch'];const forte=iniciar(a,'moveset-real');
    const b=motor(30,6);b[0].golpes=['Quick Attack'];const neutro=iniciar(b,'moveset-real');
    const primeiro=r=>waveAtual(r,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='meu');
    const f=primeiro(forte),n=primeiro(neutro);
    igual(f.nome,'Fire Punch');igual(n.nome,'Quick Attack');ok(f.eff>n.eff);ok(f.dano>n.dano);
  });
  s.teste('guia ajuda o ataque do aliado consciente, sem ajudar a si nem acumular',()=>{
    const equipe=[...motor(30,6),...motor(30,9),...motor(30,3)].map((c,i)=>({...c,id:String(i)}));
    const dano=r=>waveAtual(r,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='meu').dano;
    const base=dano(iniciar(equipe,'guia-real'));equipe[0].foco='guia';
    igual(dano(iniciar(equipe,'guia-real')),base,'guia ajudou a si');
    equipe[1].foco='guia';const ajudou=dano(iniciar(equipe,'guia-real'));ok(ajudou>base);
    equipe[2].foco='guia';igual(dano(iniciar(equipe,'guia-real')),ajudou,'guias empilharam');
    const mortos=iniciar(equipe,'guia-real');mortos.combate.hpInicial[1]=0;mortos.combate.hpInicial[2]=0;
    igual(dano(mortos),base,'guia caído ajudou');
  });
  s.teste('cura no instante de um golpe preserva o impacto já mostrado e não revive reserva caída',()=>{
    const r=iniciar(motor(2,1),'pocao-real'),w=waveAtual(r,{pack:PACK});
    const hit=w.roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.dano>0&&!m.caiu);
    const agora=T+hit.t,curado=runCurada(PACK,r,motor(2,1),{cura:50,agora}).run;
    const passou=p=>waveAtual(p,{pack:PACK}).roteiro.momentos.filter(m=>m.tipo==='golpe'&&m.t<=hit.t);
    igual(JSON.stringify(passou(curado)),JSON.stringify(passou(r)));
    const trio=[...motor(2,1),...motor(2,4)].map((c,i)=>({...c,id:String(i)}));
    const caiu=iniciar(trio,'caida');caiu.combate.hpInicial[1]=0;
    const wc=waveAtual(caiu,{pack:PACK}),hc=wc.roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.dano>0&&!m.caiu);
    ok(hc);const cura=runCurada(PACK,caiu,trio,{cura:999,agora:T+hc.t+1}).run;
    igual(cenaDaRun(cura,{pack:PACK,agora:T+hc.t+1}).hp,cenaDaRun(cura,{pack:PACK,agora:T+hc.t+1}).heroi.hp,'reviveu reserva');
  });
  s.teste('abate parcial é persistido mesmo sem espécie nova; rollback de poção desfaz item e HP',()=>{
    const db=abrirBanco(':memory:');migrar(db);
    try{
      const userId=cadastrar(db,{username:'avreal',email:'avreal@test.example',senha:'uma-senha-muito-longa',nascimento:'1990-01-01',agora:T}).id;
      const c=gerar(db,{userId,pack:PACK,dex:1,nivel:2,raiz:'av-real-owned'});
      const reserva=gerar(db,{userId,pack:PACK,dex:6,nivel:30,raiz:'av-real-reserva'});
      db.prepare('UPDATE criaturas SET xp=?,o_hp=31,o_atq=31,o_def=31,o_spa=31,o_spd=31,o_vel=31,natureza=? WHERE id=?').run(xpParaNivel(2),'Adamant',c.id);
      creditarBolsa(db,userId,'pocao',2);
      const {run}=comecarRun(db,{userId,pack:PACK,bioma:'floresta',estagio:1,equipe:[c.id,reserva.id],raiz:'pocao-real',agora:T});
      sincronizarRun(db,{userId,pack:PACK,agora:T});
      const w=waveAtual(run,{pack:PACK}),hit=w.roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.dano>0&&!m.caiu);
      ok(hit);const agora=T+hit.t+1;sincronizarRun(db,{userId,pack:PACK,agora});
      const antes=JSON.stringify(runAberta(db,userId).run);
      db.exec("CREATE TRIGGER quebrar_cura BEFORE UPDATE ON runs BEGIN SELECT RAISE(ABORT,'falha plantada'); END");
      let falhou=false;try{pocaoNaRun(db,{userId,pack:PACK,item:'pocao',agora});}catch(e){falhou=/falha plantada/.test(e.message);}
      ok(falhou);igual(quantosNaBolsa(db,userId,'pocao'),2);igual(JSON.stringify(runAberta(db,userId).run),antes);
      db.exec('DROP TRIGGER quebrar_cura');pocaoNaRun(db,{userId,pack:PACK,item:'pocao',agora});igual(quantosNaBolsa(db,userId,'pocao'),1);
      const depois=runAberta(db,userId).run;
      const abate=waveAtual(depois,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='abate'&&m.i===2&&m.t>agora-depois.waveComecouEm);ok(abate,'sem novo abate após cura');
      const antesDoAbate=sincronizarRun(db,{userId,pack:PACK,agora:T+abate.t-1}).run;
      const leitura=sincronizarRun(db,{userId,pack:PACK,agora:T+abate.t+1});igual(leitura.aconteceu.length,0,'a consulta incluiu outro evento');
      const parcial=leitura.run;
      igual(JSON.stringify(runAberta(db,userId).run.abates),JSON.stringify(parcial.abates));ok(parcial.abates.length);
      ok(parcial.abates.reduce((n,a)=>n+a.quantos,0)>antesDoAbate.abates.reduce((n,a)=>n+a.quantos,0),'nenhum abate novo foi medido');
    }finally{db.close();}
  });
  s.teste('quando titular cai, o retrato mostra HP, espécie e golpes do próximo aliado',()=>{
    const m=[...motor(1,1),...motor(30,6)].map((c,i)=>({...c,id:String(i)})),r=iniciar(m,'troca-real');
    r.combate.hpInicial[0]=1;
    const caiu=waveAtual(r,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='golpe'&&m.de==='dele'&&m.caiu);
    ok(caiu);const c=cenaDaRun(r,{pack:PACK,agora:T+caiu.t});
    igual(c.heroi.i,1);igual(c.heroi.dex,6);igual(JSON.stringify(c.heroi.golpes),JSON.stringify(r.combate.equipe[1].golpes));
    igual(c.hp,c.heroi.hp);ok(c.hp<c.hpMax);
  });
  s.teste('relógio anterior não regride HP, abates e cursor, nem permite poção no passado',()=>{
    const r=iniciar(),atual=runNoInstante(PACK,r,motor(),T+12000).run;
    igual(JSON.stringify(runNoInstante(PACK,atual,motor(),T+1000).run),JSON.stringify(atual));
    let recusou=false;try{runCurada(PACK,atual,motor(),{cura:50,agora:T+1000});}catch{recusou=true;}ok(recusou);
  });
  s.teste('recuar sem consulta anterior credita o abate que já ocorreu',()=>{
    const r=iniciar(),abate=waveAtual(r,{pack:PACK}).roteiro.momentos.find(m=>m.tipo==='abate');
    ok(abate);const saiu=recuarRun(r,T+abate.t+1,{pack:PACK});
    igual(saiu.abates.reduce((n,a)=>n+a.quantos,0),1);igual(saiu.fim.motivo,'recuou');
  });
  return s;
}
