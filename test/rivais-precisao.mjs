import {criarSuite,ok,igual} from './harness.mjs';
import KANTO from '../content/pokemon_kanto_v1.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import {movesetDoRival,padraoDoMoveset,movesetValido} from '../app/modules/moveset-dados.mjs';
import {criarCatalogoTreinador,golpeTreinador} from '../engine/catalogo-golpes.mjs';
import {montarLutador,avaliarGolpe} from '../engine/treino-batalha.mjs';
import {statNoNivel} from '../engine/primitivas.mjs';
import {auditarCatalogo} from '../tools/auditar-rivais.mjs';
import {runComecada,runNoInstante,paraOMotor} from '../app/modules/avanco-conta.mjs';
const sint=(gs,s=[80,80,80,70,80,80])=>{
  const golpes={normal:gs};return {...KANTO,especies:[{dex:1,n:'Teste',t:['normal'],s}],lendarios:[],golpes,catalogoTreinador:criarCatalogoTreinador(golpes)};
};
const g=(n,p,acc,cat='fis')=>({n,p,t:'normal',cat,...(acc===undefined?{}:{acc})});
export function suite(){const s=criarSuite('rivais-precisao');
  s.teste('rival prefere precisão real quando poder bruto indica a escolha oposta',()=>{
    const p=sint([g('Arriscado',90),g('Seguro',85,1),g('Fraco',20,1)]);
    igual(movesetDoRival(p,1,100)[0],'Seguro','92% foi tratado como 100%');
    const q={...p,catalogoTreinador:{...p.catalogoTreinador,Arriscado:{...p.catalogoTreinador.Arriscado,acc:1}}};
    igual(movesetDoRival(q,1,100)[0],'Arriscado','ignorou catálogo explícito');
  });
  s.teste('usa ataque físico e especial reais, sem penalidade arbitrária de metade',()=>{
    const p=sint([g('Fisico',50,1),g('Especial',80,1,'esp')]);
    igual(movesetDoRival(p,1,100)[0],'Especial');
  });
  s.teste('ordenação corresponde ao dano esperado TBE com alvo neutro de base 80',()=>{
    for(const n of[1,5,19,55,100]){
      const p=sint([g('A',90,.8),g('B',85,1),g('C',80,.92),g('D',40,1),g('E',110,.7)]);
      const a=montarLutador(p,{dex:1,nivel:n,golpes:['A']},'B',0),d={types:[],def:statNoNivel(80,n),spd:statNoNivel(80,n),hp:Infinity};
      const nota=nome=>avaliarGolpe(p.tipos.efetividade,a,d,golpeTreinador(p,nome)).dano;
      const esperado=Object.values(p.golpes).flat().filter(x=>movesetValido(p,1,n,[x.n]).ok).map(x=>x.n)
        .sort((x,y)=>nota(y)-nota(x)||x.localeCompare(y)).slice(0,4);
      igual(JSON.stringify(movesetDoRival(p,1,n)),JSON.stringify(esperado));
    }
  });
  s.teste('especialização, liberação e limite continuam válidos nos dois packs',()=>{
    for(const p of[KANTO,ORIGINAL])for(const e of [...p.especies,...(p.lendarios??[])])for(const n of[1,5,19,55,100]){
      const ns=movesetDoRival(p,e.dex,n);ok(movesetValido(p,e.dex,n,ns).ok,`${e.dex}@${n}`);
      const tipo=ns.filter(x=>e.t.includes(golpeTreinador(p,x).t));
      if(tipo.length>=2)igual(tipo.length,ns.length,'rival especialista recebeu reserva');
    }
    ok(movesetDoRival(KANTO,113,50).some(n=>golpeTreinador(KANTO,n).cat==='esp'));
    ok(movesetDoRival(KANTO,68,50).every(n=>golpeTreinador(KANTO,n).cat==='fis'));
  });
  s.teste('não consulta RNG, não altera conteúdo nem troca padrão do jogador',()=>{
    const p=sint([g('Arriscado',90),g('Seguro',85,1),g('Fraco',20,1)]),antes=JSON.stringify(p),padrao=padraoDoMoveset(p,1,100);
    const random=Math.random;Math.random=()=>{throw Error('RNG consultado');};
    try{for(let i=0;i<20;i++)igual(movesetDoRival(p,1,100)[0],'Seguro');}finally{Math.random=random;}
    igual(JSON.stringify(p),antes);igual(JSON.stringify(padraoDoMoveset(p,1,100)),JSON.stringify(padrao));
    igual(padrao[0],'Arriscado');
  });
  s.teste('auditoria distingue dominância, risco e liberação por nível sem remover opções',()=>{
    const antes=JSON.stringify(KANTO),r=auditarCatalogo(KANTO);
    ok(!r.dominancia.some(x=>[x.inferior,x.superior].sort().join()===['Surf','Hydro Pump'].sort().join()),'risco virou dominância');
    const d=r.dominancia.find(x=>x.inferior==='Extreme Speed'&&x.superior==='Body Slam');
    ok(d&&d.inferiorAbre<d.superiorAbre,'golpe anterior perdeu seu uso na progressão');
    ok(r.dominancia.every(x=>x.poder[1]>=x.poder[0]&&x.precisao[1]>=x.precisao[0]));
    igual(JSON.stringify(KANTO),antes);
    const p=sint([g('Fisico',50,1),g('Especial',100,1,'esp')]);igual(auditarCatalogo(p).pares,0,'misturou defesas diferentes');
  });
  s.teste('run nova identifica política; run anterior mantém seus rivais congelados',()=>{
    const agora=Date.UTC(2026,9,4,12),motor=[paraOMotor(KANTO,{id:'inicial',dex:4,nivel:5,iv:Array(6).fill(15)})];
    const r=runComecada(KANTO,{bioma:'floresta',estagio:1,equipe:['inicial'],motor,raiz:'rival-frozen-holdout',agora});
    igual(r.combate.politicaRival,'rival-2');const antigo=JSON.parse(JSON.stringify(r));delete antigo.combate.politicaRival;
    // TBE possui catálogo original. Alterar somente as listas de aprendizado
    // faz novos NPCs perderem opções, mas não deve reconstruir os já gravados.
    const q={...KANTO,golpes:Object.fromEntries(Object.entries(KANTO.golpes).map(([k,l])=>[k,l.slice(0,1)]))};
    const congelados=JSON.stringify(antigo.combate.waves);
    const a=runNoInstante(KANTO,antigo,motor,agora+86400000).run,b=runNoInstante(q,antigo,motor,agora+86400000).run;
    igual(JSON.stringify(b.combate.waves),congelados);igual(JSON.stringify(a.fim),JSON.stringify(b.fim));
    igual(JSON.stringify(a.abates),JSON.stringify(b.abates));
  });
  return s;
}
