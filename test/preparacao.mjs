import {criarSuite,ok,igual} from './harness.mjs';
import PACK from '../content/pokemon_kanto_v1.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {objetivoArena,previsoesEvolucao} from '../app/modules/preparacao-dados.mjs';
import {htmlObjetivoArena,htmlPrevisoesEvolucao} from '../app/modules/preparacao-tela.mjs';
const c=(id='c',dex=1,nivel=16)=>({id,dex,nivel,xp:xpParaNivel(nivel),iv:Array(6).fill(15),natureza:null,naCaixa:false});
export function suite(){const s=criarSuite('preparacao');
  s.teste('próxima ação existe antes e depois da Liga, sem prometer acesso com time incompleto',()=>{
    igual(objetivoArena(PACK,{criaturas:[]}).acao.view,'viewIdle');
    igual(objetivoArena(PACK,{criaturas:[c()]}).estado,'jornada');
    const jornada={vencidos:PACK.jornada.map(n=>n.id)};
    igual(objetivoArena(PACK,{jornada,criaturas:[c()]}).estado,'equipe');
    const time=[1,4,7,25,16,19].map((dex,i)=>c(`c${i}`,dex));
    igual(objetivoArena(PACK,{jornada,criaturas:time}).estado,'arena');
    igual(objetivoArena(PACK,{jornada,criaturas:time.map(x=>({...x,dex:1}))}).estado,'equipe');
    ok(htmlObjetivoArena(objetivoArena(PACK,{jornada,criaturas:time})).includes('data-guia-aba="treino:liga"'));
  });
  s.teste('evolução compara atributos reais, tipos e golpes sem consumir ou mudar IV/identidade',()=>{
    const atual=c(),antes=JSON.stringify(atual),p=previsoesEvolucao(PACK,atual,{});
    igual(p.length,1);igual(p[0].para,2);ok(p[0].comparacao.membros[0].mudancas.some(x=>x.campo==='HP'));
    igual(JSON.stringify(p[0].comparacao.membros[0].antes.iv),JSON.stringify(p[0].comparacao.membros[0].depois.iv));
    igual(JSON.stringify(atual),antes);ok(htmlPrevisoesEvolucao(p).includes('Antes'));ok(htmlPrevisoesEvolucao(p).includes('Depois'));
    igual(previsoesEvolucao(PACK,c('baixo',1,5),{}).length,0);
  });
  s.teste('evolução ramificada mostra alternativas e item, sem escolher ou gastar automaticamente',()=>{
    const p=previsoesEvolucao(PACK,c('eevee',133,40),{trovao:1,agua:1,fogo:1});
    ok(p.length>1);ok(p.every(x=>x.consome));ok(!htmlPrevisoesEvolucao(p).includes('onclick'));
  });
  return s;
}
