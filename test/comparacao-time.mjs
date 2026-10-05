import {criarSuite,ok,igual} from './harness.mjs';
import PACK from '../content/pokemon_kanto_v1.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {montarLutador} from '../engine/treino-batalha.mjs';
import {temporadaDe} from '../engine/temporada.mjs';
import {snapshotDoTime} from '../app/modules/snapshot-dados.mjs';
import {compararTimePublicado} from '../app/modules/comparacao-time.mjs';
import {htmlDaComparacao} from '../app/modules/comparacao-time-tela.mjs';
import {homeDaLiga} from '../app/modules/liga-equipe-dados.mjs';
import {confrontoDaLiga} from '../app/modules/partida-dados.mjs';
const criatura=(id='c1',dex=7,nivel=55)=>({id,dex,xp:xpParaNivel(nivel),nivel,iv:Array(6).fill(15),natureza:null,naCaixa:false});
const snap=(cs=[criatura()],preset='balanced',pack=PACK)=>snapshotDoTime({pack,criaturas:cs,ids:cs.map(c=>c.id),preset});
const comparar=(a,b,pack=PACK)=>compararTimePublicado({pack,publicado:a,atual:b});
const campo=(r,n)=>r.membros[0].mudancas.find(x=>x.campo===n);
const dados=(equipe,meuTime)=>({ligada:true,tier:'Bronze',equipe,meuTime,recentes:[],partidas:0,temporada:temporadaDe(Date.UTC(2026,9,5))});
export function suite(){const s=criarSuite('comparacao-time');
  s.teste('time idêntico e XP sem subir nível não inventam melhoria',()=>{
    const c=criatura(),a=snap([c]),r=comparar(a,snap([{...c,xp:c.xp+1}]));
    igual(r.mudou,false);igual(htmlDaComparacao(r),'');igual(r.membros.length,0);
  });
  s.teste('XP deriva o nível atual mesmo com o campo nível antigo; stats são os da TBE',()=>{
    const c=criatura(),a=snap([c]),b=snap([{...c,xp:xpParaNivel(56)}]),r=comparar(a,b);
    igual(campo(r,'Nível').antes,'55');igual(campo(r,'Nível').depois,'56');
    for(const [nome,k] of [['HP','maxHp'],['Ataque','atk'],['Defesa','def'],['At. especial','spa'],['Def. especial','spd'],['Velocidade','spe']]){
      const x=montarLutador(PACK,a.time[0],'A',0),y=montarLutador(PACK,b.time[0],'A',0);
      igual(r.membros[0].antes.stats[nome],x[k]);igual(r.membros[0].depois.stats[nome],y[k]);
    }
    ok(r.mudou);ok(campo(r,'HP'));
  });
  s.teste('IVs e natureza reais mostram ganhos e perdas por stat',()=>{
    const c=criatura(),a=snap([c]),b=snap([{...c,iv:Array(6).fill(31),natureza:PACK.naturezas.find(n=>n[1]!==n[2])[0]}]),r=comparar(a,b);
    ok(campo(r,'IVs'));ok(campo(r,'Natureza'));
    igual(r.membros[0].depois.stats.HP,montarLutador(PACK,b.time[0],'A',0).maxHp);
    const nat=PACK.naturezas.find(n=>n[1]!==n[2])[0];
    const z=comparar(snap([{...c,natureza:null}]),snap([{...c,natureza:nat}]));
    ok(z.membros[0].mudancas.some(x=>Number(x.depois)<Number(x.antes)),'natureza ocultou perda de stat');
  });
  s.teste('golpes mostram poder, categoria, tipo e precisão do catálogo treinador',()=>{
    const c=criatura(),a=snap([{...c,golpes:['Surf']}]),b=snap([{...c,golpes:['Hydro Pump']}]),r=comparar(a,b);
    const g=campo(r,'Golpes');ok(g.antes.includes('Surf'));ok(g.antes.includes('100%'));ok(g.depois.includes('80%'));
    ok(g.depois.includes('110'));ok(g.depois.includes('especial'));ok(g.depois.includes(PACK.tipos.nomes.water));
    const catalogo={...PACK.catalogoTreinador,'Hydro Pump':{...PACK.catalogoTreinador['Hydro Pump'],acc:.71}};
    const p={...PACK,catalogoTreinador:catalogo},x=comparar(snap([{...c,golpes:['Surf']}],'balanced',p),snap([{...c,golpes:['Hydro Pump']}],'balanced',p),p);
    ok(campo(x,'Golpes').depois.includes('71%'),'leu precisão da arena comum');
  });
  s.teste('evolução do mesmo ID detecta espécie, tipos e stats',()=>{
    const a=snap([criatura('c1',4,36)]),b=snap([criatura('c1',6,36)]),r=comparar(a,b);
    ok(campo(r,'Espécie'));ok(campo(r,'Tipos'));ok(campo(r,'HP'));igual(r.membros[0].id,'c1');
  });
  s.teste('seis membros, ordem, entradas e saídas são identificados pelo ID',()=>{
    const cs=[1,4,7,25,16,19].map((d,i)=>criatura(`c${i}`,d,40)),a=snap(cs);
    const ordem=comparar(a,snap([...cs].reverse()));ok(ordem.mudancas.some(x=>x.campo==='Ordem'));
    igual(ordem.membros.length,6);ok(ordem.membros.every(x=>x.mudancas.some(m=>m.campo==='Posição')));
    const b=snap([...cs.slice(1),criatura('novo',52,40)]),r=comparar(a,b);
    igual(r.membros.find(x=>x.id==='c0').depois,null);igual(r.membros.find(x=>x.id==='novo').antes,null);
  });
  s.teste('preset escolhido ainda não publicado aparece na home, inclusive sem mudar criaturas',()=>{
    const cs=[criatura()],a=snap(cs),h=homeDaLiga({conta:true,pack:PACK,agora:0,dados:dados(cs,a),preset:'aggressive'});
    ok(h.comparacao?.mudou);igual(h.comparacao.mudancas.find(x=>x.campo==='Preset').depois,'aggressive');
    ok(h.aviso);igual(a.preset,'balanced');
  });
  s.teste('regras incompatíveis não recalculam ficha histórica com conteúdo novo',()=>{
    const a=snap(),r=comparar({...a,versaoConteudo:'antigo'},a);
    igual(r.compativel,false);igual(r.membros.length,0);ok(/regras/.test(r.aviso));
    igual(comparar(a,{ok:false}),null);igual(comparar(null,a),null);
  });
  s.teste('precisão explícita alterada torna o publicado incompatível antes de comparar',()=>{
    const c={...criatura(),golpes:['Surf']},a=snap([c]);
    const p={...PACK,catalogoTreinador:{...PACK.catalogoTreinador,Surf:{...PACK.catalogoTreinador.Surf,acc:.75}}};
    const b=snap([c],'balanced',p);ok(a.versaoConteudo!==b.versaoConteudo,'hash ignorou catálogo treinador');
    const r=comparar(a,b,p);igual(r.compativel,false);igual(r.membros.length,0);
    igual(confrontoDaLiga({pack:p,a,b,raiz:'catalogo-alterado'}).ok,false,'servidor aceitou publicado antigo');
  });
  s.teste('shiny é aparência, sem falsa vantagem em atributos ou dano',()=>{
    const c=criatura(),r=comparar(snap([c]),snap([{...c,shiny:true}]));
    igual(r.membros[0].mudancas.map(x=>x.campo).join(),'Aparência');
    igual(JSON.stringify(r.membros[0].antes.stats),JSON.stringify(r.membros[0].depois.stats));
  });
  s.teste('comparação não altera snapshots, não sorteia e aceita outro pack',()=>{
    const a=snap(),b=snap([{...criatura(),iv:Array(6).fill(31)}]),antes=JSON.stringify([a,b]),random=Math.random;
    Math.random=()=>{throw Error('RNG consultado');};
    try{igual(JSON.stringify(comparar(a,b)),JSON.stringify(comparar(a,b)));}finally{Math.random=random;}
    igual(JSON.stringify([a,b]),antes);
    const c=criatura('o',ORIGINAL.especies[0].dex,30),x=snap([c],'balanced',ORIGINAL),y=snap([{...c,xp:xpParaNivel(31)}],'balanced',ORIGINAL);
    ok(comparar(x,y,ORIGINAL).mudou);
  });
  s.teste('pintura mostra antes/depois sem hover, escapa nomes e não publica automaticamente',()=>{
    const r=comparar(snap(),snap([{...criatura(),xp:xpParaNivel(56)}]));
    r.membros[0].depois.nome='<img src=x onerror=alert(1)>';
    const html=htmlDaComparacao(r);ok(html.includes('Publicado'));ok(html.includes('Atual'));
    ok(html.includes('55'));ok(html.includes('56'));ok(html.includes('&lt;img'));ok(!html.includes('<img'));
    ok(/até publicar de novo/.test(html));ok(!/data-le-acao|onclick|<button|title=/.test(html));
    ok(/não.*chance|não.*garant/.test(html));
  });
  return s;
}
