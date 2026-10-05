import { contaTreinoOffline } from '../engine/treino-offline.mjs';
import { treinarNoAparelho } from '../app/modules/treino-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import { ganhoDaRun } from '../engine/avanco.mjs';
import { xpDaExpedicao } from '../engine/nivel-criatura.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, colher } from '../server/idle.mjs';
import PACK from '../content/escolhido.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
const H=3600000,T=Date.UTC(2026,9,4,10);
async function cena(fn) {
  let agora=T;
  const srv=criarServidor({config:{ambiente:'teste',silencioso:true},banco:':memory:',sims:10,laco:false,relogio:()=>agora});
  const user=cadastrar(srv.db,{username:'trainoff',email:'off@test.example',senha:'uma-senha-bastante-longa',nascimento:'1990-01-01',agora:T}).id;
  const cs=[1,4].map(dex=>gerar(srv.db,{userId:user,pack:PACK,dex,origem:'captura'}));
  srv.db.prepare('UPDATE criaturas SET criada_em=? WHERE user_id=?').run(T,user);
  const porta=await srv.ouvir(0),url=r=>`http://127.0.0.1:${porta}${r}`;
  const headers={[CABECALHO_VERSAO]:API_VERSAO,'content-type':'application/json'};
  const login=await fetch(url('/api/auth/entrar'),{method:'POST',headers,body:JSON.stringify({email:'off@test.example',senha:'uma-senha-bastante-longa'})}).then(r=>r.json());
  headers.authorization=`Bearer ${login.sessao}`;
  const post=async(body={})=>{const r=await fetch(url('/api/idle/treino'),{method:'POST',headers,body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const xp=()=>srv.db.prepare('SELECT xp FROM criaturas WHERE user_id=? ORDER BY dex').all(user).map(x=>x.xp);
  try{await fn({srv,user,cs,post,xp,tempo:t=>{agora=t;},get:()=>fetch(url('/api/idle'),{headers})});}finally{await srv.fechar();}
}
export function suite(){const s=criarSuite('progressao-offline');
  s.teste('mesmos abates e encontros pagam XP crescente por estágio, preservando o primeiro',()=>{
    const base=ganhoDaRun({abates:37,encontros:6,estagio:1}).xp;
    const etapas=[1,2,3,4].map(estagio=>ganhoDaRun({abates:37,encontros:6,estagio}).xp);
    igual(etapas[0],ganhoDaRun({abates:37,encontros:6}).xp);
    ok(etapas.every((v,i)=>!i||v>etapas[i-1]));igual(etapas[3],3*base);
    igual(ganhoDaRun({abates:37,encontros:6,estagio:999}).xp,etapas[3]);
  });
  s.teste('expedição também paga pela dificuldade; estágio inválido não aumenta XP',()=>{
    const ganhos=[1,2,3,4].map(estagio=>xpDaExpedicao({perfil:'trilha',encontros:6,estagio}));
    igual(ganhos[0],84);ok(ganhos.every((x,i)=>!i||x>ganhos[i-1]));igual(ganhos[3],252);
    igual(xpDaExpedicao({perfil:'trilha',encontros:6,estagio:NaN}),84);
  });
  s.teste('retorno credita treino sem expedição no relógio do servidor; GET e retry não duplicam',async()=>cena(async c=>{
    igual((await c.post()).status,200);c.tempo(T+8*H);
    igual((await c.get()).status,200);igual(JSON.stringify(c.xp()),'[0,0]');
    igual((await c.post({agora:T+999*H,xp:999999})).status,200);
    igual(JSON.stringify(c.xp()),'[24,24]');await c.post();igual(JSON.stringify(c.xp()),'[24,24]');
  }));
  s.teste('treino guarda frações entre retornos e limita ausência a doze horas',async()=>cena(async c=>{
    igual((await c.post()).status,200);
    for(let i=1;i<=12;i++){c.tempo(T+i*5*60000);await c.post();}
    igual(JSON.stringify(c.xp()),'[3,3]');c.tempo(T+100*H);await c.post();igual(JSON.stringify(c.xp()),'[39,39]');
  }));
  s.teste('quem está em expedição não recebe treino em paralelo; colheita não repaga o banco',async()=>cena(async c=>{
    igual((await c.post()).status,200);
    const exp=iniciar(c.srv.db,{userId:c.user,pack:PACK,bioma:'floresta',perfil:'batida',equipe:[c.cs[0].id],agora:T});
    c.tempo(T+8*H);await c.post();igual(JSON.stringify(c.xp()),'[0,24]');
    colher(c.srv.db,{id:exp.id,pack:PACK,agora:T+8*H,raiz:'offline-colheita'});
    ok(c.xp()[0]>0);igual(c.xp()[1],24);
  }));
  s.teste('intervalos sobrepostos são excluídos uma vez e criaturas novas não ganham tempo anterior',()=>{
    const r=contaTreinoOffline({estado:{em:T,restos:{}},criaturas:[{id:'a',xp:0,criadaEm:T},{id:'b',xp:0,criadaEm:T+3*H}],
      janelas:[{equipe:['a'],de:T,ate:T+4*H},{equipe:['a'],de:T+2*H,ate:T+6*H}],agora:T+8*H});
    igual(r.ganhos.find(x=>x.id==='a').xp,6);igual(r.ganhos.find(x=>x.id==='b').xp,15);
    const anterior=JSON.stringify(r.estado),volta=contaTreinoOffline({estado:r.estado,criaturas:[],agora:T+H});
    igual(JSON.stringify(volta.estado),anterior);igual(volta.credito.length,0);
  });
  s.teste('save local mantém frações no disco e paga ao retornar sem expedição',()=>{
    const valores=new Map(),deposito={getItem:k=>valores.get(k)??null,setItem:(k,v)=>valores.set(k,v)};
    let e=VAZIO();e.criaturas=[{id:'a',dex:1,xp:0,vinculo:0,criadaEm:T}];
    treinarNoAparelho(e,T);ok(salvar(e,deposito));e=carregar(deposito);
    treinarNoAparelho(e,T+H/2);igual(e.criaturas[0].xp,1);ok(salvar(e,deposito));e=carregar(deposito);
    treinarNoAparelho(e,T+H);igual(e.criaturas[0].xp,3);igual(e.criaturas[0].vinculo,1);
  });
  s.teste('falha no crédito desfaz também o cursor; retry continua pagando uma única vez',async()=>cena(async c=>{
    await c.post();c.tempo(T+8*H);
    const antes=c.srv.db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(c.user).estado_json;
    c.srv.db.exec("CREATE TRIGGER treino_falha BEFORE UPDATE ON criaturas BEGIN SELECT RAISE(ABORT,'falha planejada'); END");
    ok((await c.post()).status>=400);igual(JSON.stringify(c.xp()),'[0,0]');
    igual(c.srv.db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(c.user).estado_json,antes);
    c.srv.db.exec('DROP TRIGGER treino_falha');igual((await c.post()).status,200);igual(JSON.stringify(c.xp()),'[24,24]');
  }));
  return s;}
