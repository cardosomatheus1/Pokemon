import {criarSuite,ok,igual} from './harness.mjs';
import PACK from '../content/pokemon_kanto_v1.mjs';
import {simular,montarLutador} from '../engine/treino-batalha.mjs';
import {movesetDoRival} from '../app/modules/moveset-dados.mjs';
import {linhaDoTempo,fraseDoResultado} from '../app/modules/pve-dados.mjs';
import {linhaDoLog} from '../app/modules/partida-dados.mjs';
import {resumoDaBatalha} from '../app/modules/resumo-batalha.mjs';
import {htmlDoResumo} from '../app/modules/resumo-batalha-tela.mjs';
const log={lados:{A:[{dex:4,nivel:5,hp:20}],B:[{dex:7,nivel:5,hp:30}]},eventos:[
  {de:'A0',para:'B0',golpe:'Ember',dano:0,eff:2,crit:true,errou:true},
  {de:'B0',para:'A0',golpe:'Water Gun',dano:12,eff:2,crit:true},
  {de:'A0',para:'B0',golpe:'Ember',dano:3,eff:.5},
  {de:'A0',para:'B0',golpe:'Ember',dano:0,eff:0},
  {de:'B0',para:'A0',golpe:'Water Gun',dano:80,eff:2,caiu:true}]};
export function suite(){const s=criarSuite('resumo-batalha');
  s.teste('conta log real e limita HP retirado à vida restante, sem dano excedente',()=>{
    const r=resumoDaBatalha(linhaDoLog(log));
    igual(r.A.tentativas,3);igual(r.A.erros,1);igual(r.A.criticos,0);igual(r.A.superEfetivos,0);
    igual(r.A.resistidos,1);igual(r.A.imunidades,1);igual(r.A.hpRetirado,3);
    igual(r.B.hpRetirado,20);igual(r.B.criticos,1);igual(r.B.superEfetivos,2);igual(r.B.nocautes,1);
  });
  s.teste('lado B original que assiste é Seu time; não troca slot com lado da tela',()=>{
    const x=resumoDaBatalha(linhaDoLog(log,undefined,'B'));
    igual(x.A.hpRetirado,20);igual(x.B.hpRetirado,3);igual(x.A.nocautes,1);
  });
  s.teste('replay histórico dispensa pack, RNG, conta atual e não modifica a linha',()=>{
    const L=linhaDoLog(log),antes=JSON.stringify(L),random=Math.random;
    Math.random=()=>{throw Error('RNG consultado');};
    try{igual(JSON.stringify(resumoDaBatalha(L)),JSON.stringify(resumoDaBatalha(L)));}finally{Math.random=random;}
    igual(JSON.stringify(L),antes);
  });
  s.teste('cem lutas PvE reais: dano útil e nocautes correspondem à vida final',()=>{
    const a=[{dex:4,nivel:55,golpes:['Flamethrower']}],b=[{dex:7,nivel:55,golpes:['Surf']}];
    for(let seed=0;seed<100;seed++){
      const luta=simular(PACK,a,b,seed),L=linhaDoTempo(PACK,a,b,luta),r=resumoDaBatalha(L);
      for(const [atacante,alvo] of [['A','B'],['B','A']]){
        const membros=L.lados[alvo];
        igual(r[atacante].hpRetirado,membros.reduce((n,c)=>n+c.maxHp-L.vidaFinal[c.slot],0));
        igual(r[atacante].nocautes,membros.filter(c=>L.vidaFinal[c.slot]===0).length);
        igual(r[atacante].tentativas,L.passos.filter(e=>e.de[0]===atacante).length);
      }
    }
  });
  s.teste('linha vazia tem resumo vazio; zero de dano sem efetividade não inventa imunidade',()=>{
    igual(htmlDoResumo({lados:{A:[],B:[]},passos:[]}), '');
    const L=linhaDoLog({...log,eventos:[{de:'A0',para:'B0',dano:0}]});
    const r=resumoDaBatalha(L);igual(r.A.imunidades,0);igual(r.A.erros,0);
  });
  s.teste('seis versus seis e replays dos dois jogadores mantêm HP e perspectiva',()=>{
    const time=(dexes,nivel)=>dexes.map(dex=>({dex,nivel,golpes:movesetDoRival(PACK,dex,nivel)}));
    const a=time([3,6,9,25,18,20],40),b=time([65,94,68,76,130,149],39);
    const inicio=t=>t.map((c,i)=>({dex:c.dex,nivel:c.nivel,hp:montarLutador(PACK,c,'A',i).maxHp}));
    for(let seed=0;seed<30;seed++){
      const luta=simular(PACK,a,b,seed),log={lados:{A:inicio(a),B:inicio(b)},eventos:luta.eventos};
      const L=linhaDoLog(log),euA=resumoDaBatalha(L),euB=resumoDaBatalha(linhaDoLog(log,undefined,'B'));
      igual(JSON.stringify(euA.A),JSON.stringify(euB.B));igual(JSON.stringify(euA.B),JSON.stringify(euB.A));
      const pv=linhaDoTempo(PACK,a,b,luta);
      igual(JSON.stringify(euA),JSON.stringify(resumoDaBatalha(pv)));
      ok(euA.A.hpRetirado<=log.lados.B.reduce((n,c)=>n+c.hp,0));
      ok(euA.B.hpRetirado<=log.lados.A.reduce((n,c)=>n+c.hp,0));
    }
  });
  s.teste('resumo expõe fatos dos dois lados sem dizer que IV ou azar causou derrota',()=>{
    const html=htmlDoResumo(linhaDoLog(log));
    for(const texto of ['Seu time','Rival','HP retirado','Críticos','Erros','Super efetivos','Resistidos','Imunidades','Nocautes'])ok(html.includes(texto));
    ok(!/title=|onclick|<button/.test(html));ok(/não.*causa/.test(html));
  });
  s.teste('empate após eliminações não afirma que ninguém caiu',()=>{
    const x=fraseDoResultado({vencedor:null,turnos:100},{p:.5,sims:2000,erro:.01});
    ok(!x.texto.includes('Ninguém caiu'));ok(x.texto.includes('100 turnos'));ok(x.texto.includes('sem vencedor'));
  });
  s.teste('chance de perder não inclui empates; zero de vitórias não significa todas derrotas',()=>{
    const x=fraseDoResultado({vencedor:'B',turnos:5},{p:.23,sims:100,empates:12,erro:.01});
    ok(x.texto.includes('12 empates'));ok(!x.texto.includes('77 de cada 100'));
    const y=fraseDoResultado({vencedor:null,turnos:100},{p:0,sims:100,empates:100,erro:0});
    ok(y.texto.includes('100 empates'));ok(!y.texto.includes('perdido todas'));
  });
  return s;
}
