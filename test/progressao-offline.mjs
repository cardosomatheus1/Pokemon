import { contaTreinoOffline, ritmoTreinoOffline } from '../engine/treino-offline.mjs';
import { readFileSync } from 'node:fs';
import { treinarNoAparelho } from '../app/modules/treino-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { criarSuite, ok, igual } from './harness.mjs';
import { ganhoDaRun } from '../engine/avanco.mjs';
import { xpDaExpedicao, xpParaNivel } from '../engine/nivel-criatura.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, colher } from '../server/idle.mjs';
import PACK from '../content/escolhido.mjs';
import { contaDaColheita } from '../engine/colheita.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { sincronizarIdleDaConta } from '../app/modules/idle-servidor.mjs';
const H=3600000,T=Date.UTC(2026,9,4,10);
async function cena(fn) {
  let agora=T;
  const srv=criarServidor({config:{ambiente:'teste',silencioso:true},banco:':memory:',sims:10,laco:false,relogio:()=>agora});
  const user=cadastrar(srv.db,{username:'trainoff',email:'off@test.example',senha:'uma-senha-bastante-longa',nascimento:'1990-01-01',agora:T}).id;
  const cs=[1,4].map(dex=>gerar(srv.db,{userId:user,pack:PACK,dex,origem:'captura'}));
  /* A ÂNCORA (ST-2.31): o banco só leva até três níveis abaixo da mais forte.
     Nível 11 mantém a coleção no estágio 1 (150 XP/h) e põe o teto no 8, com
     388 XP de folga — os intervalos destes testes cabem embaixo dele. */
  const ancora=gerar(srv.db,{userId:user,pack:PACK,dex:7,origem:'captura'});
  srv.db.prepare('UPDATE criaturas SET xp=? WHERE id=?').run(xpParaNivel(11),ancora.id);
  srv.db.prepare('UPDATE criaturas SET criada_em=? WHERE user_id=?').run(T,user);
  const porta=await srv.ouvir(0),url=r=>`http://127.0.0.1:${porta}${r}`;
  const headers={[CABECALHO_VERSAO]:API_VERSAO,'content-type':'application/json'};
  const login=await fetch(url('/api/auth/entrar'),{method:'POST',headers,body:JSON.stringify({email:'off@test.example',senha:'uma-senha-bastante-longa'})}).then(r=>r.json());
  headers.authorization=`Bearer ${login.sessao}`;
  const post=async(body={})=>{const r=await fetch(url('/api/idle/treino'),{method:'POST',headers,body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const xp=()=>srv.db.prepare('SELECT xp FROM criaturas WHERE user_id=? AND id IN (?,?) ORDER BY dex').all(user,cs[0].id,cs[1].id).map(x=>x.xp);
  try{await fn({srv,user,cs,post,xp,tempo:t=>{agora=t;},get:()=>fetch(url('/api/idle'),{headers})});}finally{await srv.fechar();}
}
export function suite(){const s=criarSuite('progressao-offline');
  s.teste('falha no treino não impede atualizar a run pela leitura válida do servidor',async()=>{
    const dados=new Map(),deposito={getItem:k=>dados.get(k)??null,setItem:(k,v)=>dados.set(k,String(v))};
    const fim={em:T,completou:false,motivo:'hp'},api={post:async()=>({ok:false,status:503}),
      get:async rota=>({ok:true,corpo:rota==='/api/doces'?{}:{agora:T,criaturas:[],bolsa:{},expedicoes:[],run:{bioma:'campo',fim}}})};
    const r=await sincronizarIdleDaConta({api,deposito});ok(!r.ok);igual(r.status,503);
    const e=carregar(deposito);igual(JSON.stringify(e.run.fim),JSON.stringify(fim));ok(e.conta.desatualizado);
  });
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
    igual((await c.post()).status,200);c.tempo(T+2*H);
    igual((await c.get()).status,200);igual(JSON.stringify(c.xp()),'[0,0]');
    igual((await c.post({agora:T+999*H,xp:999999})).status,200);
    igual(JSON.stringify(c.xp()),'[300,300]');await c.post();igual(JSON.stringify(c.xp()),'[300,300]');
  }));
  s.teste('treino guarda frações entre retornos e limita ausência a doze horas',async()=>cena(async c=>{
    igual((await c.post()).status,200);
    for(let i=1;i<=12;i++){c.tempo(T+i*5*60000);await c.post();}
    igual(JSON.stringify(c.xp()),'[150,150]');c.tempo(T+100*H);await c.post();
    /* Na conta, o teto (nível 8 = 388) chega antes das doze horas; o limite
       das doze horas se prova longe do teto, com a âncora no 60. */
    igual(JSON.stringify(c.xp()),`[${xpParaNivel(8)},${xpParaNivel(8)}]`);
    const longe=contaTreinoOffline({estado:{em:T,restos:{},estagio:1},criaturas:[{id:'z',xp:xpParaNivel(60)},{id:'a',xp:0}],agora:T+100*H});
    igual(longe.ganhos.find(g=>g.id==='a').xp,12*150,'a ausência passou de doze horas');
  }));
  s.teste('quem está em expedição não recebe treino em paralelo; colheita não repaga o banco',async()=>cena(async c=>{
    igual((await c.post()).status,200);
    const exp=iniciar(c.srv.db,{userId:c.user,pack:PACK,bioma:'floresta',perfil:'batida',equipe:[c.cs[0].id],agora:T});
    c.tempo(T+2*H);await c.post();igual(JSON.stringify(c.xp()),'[0,300]');
    colher(c.srv.db,{id:exp.id,pack:PACK,agora:T+2*H,raiz:'offline-colheita'});
    ok(c.xp()[0]>0);igual(c.xp()[1],300);
  }));
  s.teste('intervalos sobrepostos são excluídos uma vez e criaturas novas não ganham tempo anterior',()=>{
    const r=contaTreinoOffline({estado:{em:T,restos:{}},criaturas:[{id:'z',xp:xpParaNivel(60),criadaEm:T},{id:'a',xp:0,criadaEm:T},{id:'b',xp:0,criadaEm:T+3*H}],
      janelas:[{equipe:['a'],de:T,ate:T+4*H},{equipe:['a'],de:T+2*H,ate:T+6*H}],agora:T+8*H});
    igual(r.ganhos.find(x=>x.id==='a').xp,300);igual(r.ganhos.find(x=>x.id==='b').xp,750);
    const anterior=JSON.stringify(r.estado),volta=contaTreinoOffline({estado:r.estado,criaturas:[],agora:T+H});
    igual(JSON.stringify(volta.estado),anterior);igual(volta.credito.length,0);
  });
  s.teste('save local mantém frações no disco e paga ao retornar sem expedição',()=>{
    const valores=new Map(),deposito={getItem:k=>valores.get(k)??null,setItem:(k,v)=>valores.set(k,v)};
    let e=VAZIO();e.criaturas=[{id:'a',dex:1,xp:0,vinculo:0,criadaEm:T},{id:'z',dex:7,xp:xpParaNivel(11),vinculo:0,criadaEm:T}];
    treinarNoAparelho(e,T);ok(salvar(e,deposito));e=carregar(deposito);
    treinarNoAparelho(e,T+H/2);igual(e.criaturas[0].xp,75);ok(salvar(e,deposito));e=carregar(deposito);
    treinarNoAparelho(e,T+H);igual(e.criaturas[0].xp,150);igual(e.criaturas[0].vinculo,1);
  });
  s.teste('falha no crédito desfaz também o cursor; retry continua pagando uma única vez',async()=>cena(async c=>{
    await c.post();c.tempo(T+2*H);
    const antes=c.srv.db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(c.user).estado_json;
    c.srv.db.exec("CREATE TRIGGER treino_falha BEFORE UPDATE ON criaturas BEGIN SELECT RAISE(ABORT,'falha planejada'); END");
    ok((await c.post()).status>=400);igual(JSON.stringify(c.xp()),'[0,0]');
    igual(c.srv.db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(c.user).estado_json,antes);
    c.srv.db.exec('DROP TRIGGER treino_falha');igual((await c.post()).status,200);igual(JSON.stringify(c.xp()),'[300,300]');
  }));
  s.teste('treino passivo acompanha estágios e paga 150/225/300/450 por hora por criatura',()=>{
    for(const [i,nivel] of[11,12,19,31].entries()){
      const criaturas=[{id:'lider',xp:xpParaNivel(nivel)},{id:'banco',xp:0}];
      const inicial=contaTreinoOffline({criaturas,agora:T});
      const r=contaTreinoOffline({estado:inicial.estado,criaturas,agora:T+H});
      igual(r.ganhos.find(x=>x.id==='banco').xp,[150,225,300,450][i]);
      igual(r.ganhos.find(x=>x.id==='banco').vinculo,1);
    }
  });
  s.teste('desbloqueio aumenta só o intervalo seguinte; nível falso e body não aumentam a taxa',()=>{
    const inicial=contaTreinoOffline({criaturas:[{id:'a',xp:0,nivel:100}],agora:T});
    const r=contaTreinoOffline({estado:inicial.estado,criaturas:[{id:'a',xp:xpParaNivel(31)},{id:'z',xp:xpParaNivel(60)}],agora:T+H});
    igual(r.ganhos.find(g=>g.id==='a').xp,150);igual(r.estado.estagio,4);
    const depois=contaTreinoOffline({estado:r.estado,criaturas:r.credito,agora:T+2*H});igual(depois.ganhos.find(g=>g.id==='a').xp,450);
  });
  s.teste('save antigo não recebe multiplicador avançado retroativo e guarda frações de XP',()=>{
    const r=contaTreinoOffline({estado:{em:T,restos:{a:{xp:H/2,vinculo:0}}},criaturas:[{id:'a',xp:xpParaNivel(31)},{id:'z',xp:xpParaNivel(60)}],agora:T+H/300});
    igual(r.ganhos.length,1);igual(r.ganhos[0].xp,1);igual(r.estado.estagio,4);igual(r.estado.restos.a.xp,0);
  });
  s.teste('server define estágio a partir do XP e salva a taxa para o próximo retorno',async()=>cena(async c=>{
    c.srv.db.prepare('UPDATE criaturas SET xp=? WHERE id=?').run(xpParaNivel(31),c.cs[0].id);
    await c.post({estagio:999,xpPorHora:999999});c.tempo(T+H);
    const r=await c.post({estagio:999,xpPorHora:999999});igual(r.status,200);
    igual(r.body.ganhos.find(g=>g.id===c.cs[1].id).xp,450);igual(c.xp()[1],450);
  }));
  s.teste('colheita sem sincronização anterior usa a taxa progressiva e mantém local/servidor no mesmo cálculo',()=>{
    const criaturas=[{id:'a',dex:6,nivel:31,xp:xpParaNivel(31),iv:Array(6).fill(15)},{id:'b',dex:1,xp:0,iv:Array(6).fill(15)}];
    for(const estagio of[1,2,3,4]){
      const r=contaDaColheita({pack:PACK,criaturas,raiz:'taxa-offline-colheita',agora:T+H,
        expedicao:{id:'exp',bioma:'floresta',perfil:'batida',equipe:['a'],estagio,iniciadaEm:T,terminaEm:T+H}});
      igual(r.treino.find(c=>c.id==='b').xp,[150,225,300,450][estagio-1]);
    }
  });
  /* Sem DOM falso: importar o painel puxa o `dom.mjs`, que lê `document` no
     carregamento, e um carregamento que falhou fica em cache no processo —
     com as suítes em paralelo (T14) isso decidia a vez de quem falhava. O
     número vem do motor; o painel só o pinta, e é isso que se confere. */
  s.teste('painel mostra a taxa do intervalo e seu estágio, em vez da constante antiga de 3 XP/h',()=>{
    const r=ritmoTreinoOffline({em:T,estagio:3},[{id:'a',dex:1,xp:0,iv:Array(6).fill(15)}]);
    igual(r.xpPorHora,300,'o motor não dá 300 XP/h no estágio 3');igual(r.estagio,3);
    const tela=readFileSync(new URL('../app/modules/idle-treino.mjs',import.meta.url),'utf8');
    ok(/ritmoTreinoOffline\(E\.treinoOffline, E\.criaturas\)/.test(tela),'o painel não lê o ritmo do motor');
    ok(/\$\{ritmo\.xpPorHora\} XP\/h<\/b> \(estágio \$\{ritmo\.estagio\}\)/.test(tela),'painel não mostra o ritmo pago');
    ok(!/[^0-9]3 XP\/h/.test(tela),'taxa legada continua exposta');
  });
  s.teste('colheita lê a fase congelada do treino mesmo numa rota menor; retorno completa só o restante',async()=>cena(async c=>{
    c.srv.db.prepare('UPDATE criaturas SET xp=? WHERE id=?').run(xpParaNivel(19),c.cs[0].id);
    await c.post();
    const exp=iniciar(c.srv.db,{userId:c.user,pack:PACK,bioma:'floresta',perfil:'batida',equipe:[c.cs[0].id],agora:T,estagio:1});
    c.tempo(T+H);colher(c.srv.db,{id:exp.id,pack:PACK,agora:T+H,raiz:'taxa-cache-colheita'});
    igual(c.xp()[1],225,'colheita de 45 min não usou os 300 XP/h da fase 3');
    await c.post();igual(c.xp()[1],300,'retorno não completou só os quinze minutos restantes');
  }));
  return s;}
