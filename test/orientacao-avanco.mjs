import {criarSuite,ok,igual} from './harness.mjs';
import PACK from '../content/pokemon_kanto_v1.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {orientacaoAvanco} from '../app/modules/orientacao-avanco.mjs';
import {pintarOrientacaoAvanco} from '../app/modules/orientacao-avanco-tela.mjs';
const agora=Date.UTC(2026,9,5,12);
const criatura=(dex=4,nivel=5)=>({id:'c1',dex,nivel,xp:xpParaNivel(nivel),iv:Array(6).fill(15),stamina:100,staminaEm:agora,naCaixa:false});
const estado=c=>({criaturas:[c],expedicoes:[],runs:[]});
const escolha={bioma:'floresta',estagio:1,equipe:['c1'],agora};
export function suite(){const s=criarSuite('orientacao-avanco');
  s.teste('recomenda com a equipe real sem anunciar probabilidade de concluir a run',()=>{
    for(const dex of[1,4,7]){
      const r=orientacaoAvanco(PACK,estado(criatura(dex)),escolha);
      ok(r.sugestao&&r.rotas.length===PACK.biomas.length);igual(r.estagio,1);
      ok(r.sugestao.exemplo.golpe&&r.sugestao.exemplo.rival&&r.sugestao.exemplo.dano>0);
      ok(r.aviso.includes('não é chance de vitória'));ok(!Object.hasOwn(r.sugestao,'chance'));
      if(dex===4)igual(r.sugestao.bioma,'floresta','fogo não recebe rota coerente com os confrontos iniciais');
      if(dex===7)igual(r.sugestao.bioma,'deserto','água não recebe rota coerente com os confrontos iniciais');
    }
  });
  s.teste('sem equipe ou com escolha indisponível não oferece iniciar outra rota',()=>{
    const e=estado(criatura());
    for(const cfg of[{...escolha,equipe:[]},{...escolha,equipe:['ausente']},{...escolha,equipe:['c1','c1']},{...escolha,estagio:4},{...escolha,agora:NaN}]){
      const r=orientacaoAvanco(PACK,e,cfg);ok(r.bloqueio);igual(r.sugestao,null);
    }
    for(const extra of[{naCaixa:true},{stamina:0}]){
      const r=orientacaoAvanco(PACK,estado({...criatura(),...extra}),escolha);ok(r.bloqueio);igual(r.sugestao,null);
    }
    const r=orientacaoAvanco(PACK,e,{...escolha,bloqueio:'Criatura reservada no mercado'});ok(r.bloqueio);igual(r.sugestao,null);
  });
  s.teste('não confunde estágio mais alto da coleção com estágio selecionado',()=>{
    const e=estado(criatura());e.criaturas.push({...criatura(9,35),id:'c2',naCaixa:true});
    const r=orientacaoAvanco(PACK,e,escolha);igual(r.estagio,1);
    ok(r.rotas.every(x=>x.chefe.nivel===5));
  });
  s.teste('nível, IV e golpes escolhidos mudam os duelos; criaturas fora da seleção não ajudam',()=>{
    const a=orientacaoAvanco(PACK,estado(criatura(7)),escolha),b=orientacaoAvanco(PACK,estado(criatura(7,10)),escolha);
    const rota=(r,id)=>r.rotas.find(x=>x.bioma===id);
    ok(rota(b,'floresta').indice>rota(a,'floresta').indice,'nível não melhora confrontos');
    const ruim=orientacaoAvanco(PACK,estado({...criatura(7),iv:Array(6).fill(0)}),escolha);
    const bom=orientacaoAvanco(PACK,estado({...criatura(7),iv:Array(6).fill(31)}),escolha);
    ok(rota(bom,'floresta').indice>rota(ruim,'floresta').indice,'IV ignorado');
    const e=estado(criatura(7));e.criaturas.push({...criatura(6,50),id:'c2'});
    igual(JSON.stringify(orientacaoAvanco(PACK,e,escolha)),JSON.stringify(a));
    const x=orientacaoAvanco(PACK,estado({...criatura(7,55),golpes:['Surf']}),escolha);
    const y=orientacaoAvanco(PACK,estado({...criatura(7,55),golpes:['Hydro Pump']}),escolha);
    ok(rota(x,'deserto').exemplo.golpe!==rota(y,'deserto').exemplo.golpe,'moveset ignorado');
  });
  s.teste('determinístico, sem RNG, sem clima futuro e sem mutação da conta',()=>{
    const e=estado(criatura()),antes=JSON.stringify(e),r=orientacaoAvanco(PACK,e,escolha),random=Math.random;
    Math.random=()=>{throw Error('RNG consultado');};
    try{igual(JSON.stringify(orientacaoAvanco(PACK,e,{...escolha,clima:'rain',raiz:'outra'})),JSON.stringify(r));}finally{Math.random=random;}
    igual(JSON.stringify(e),antes);
  });
  s.teste('usa último recurso ao avaliar imunidades e não considera rota sem elenco',()=>{
    const p={...PACK,biomas:[...PACK.biomas,{id:'vazia',rotulo:'Vazia',tipos:['desconhecido']}]};
    const r=orientacaoAvanco(p,estado(criatura()),escolha);ok(!r.rotas.some(x=>x.bioma==='vazia'));
    ok(r.rotas.every(x=>Number.isFinite(x.indice)),'imunidade gerou infinito');
    const imune={...PACK,ultimoRecurso:{n:'Recurso do pack'}};
    const elet=orientacaoAvanco(imune,estado({...criatura(25),golpes:['Thunder Fang']}),escolha);
    const deserto=elet.rotas.find(x=>x.bioma==='deserto');
    igual(deserto.exemplo.golpe,'Recurso do pack');ok(Number.isFinite(deserto.indice));
  });
  s.teste('pintura oferece comparar sem iniciar, gastar ou substituir a seleção',()=>{
    const alvo={hidden:true,innerHTML:''},e=estado(criatura(7)),antes=JSON.stringify(e),sel={...escolha};
    pintarOrientacaoAvanco(PACK,e,sel,alvo);igual(alvo.hidden,false);
    ok(alvo.innerHTML.includes('data-bioma="deserto"')&&alvo.innerHTML.includes('Comparar Deserto'));
    ok(alvo.innerHTML.includes('Waterfall')&&alvo.innerHTML.includes('super efetivo'));
    ok(alvo.innerHTML.includes('não é chance de vitória')&&!alvo.innerHTML.includes('data-av='));
    igual(sel.bioma,'floresta');igual(JSON.stringify(e),antes);
    pintarOrientacaoAvanco(PACK,e,{...sel,bioma:'deserto'},alvo);
    ok(!alvo.innerHTML.includes('data-orientacao-rota'),'ofereceu trocar para a rota já selecionada');
    pintarOrientacaoAvanco(PACK,e,{...sel,bloqueio:'Sem conexão <script>alert(1)</script>'},alvo);
    ok(!alvo.innerHTML.includes('<script>')&&alvo.innerHTML.includes('&lt;script&gt;'));
    ok(!alvo.innerHTML.includes('data-bioma='),'recusa manteve ação anterior');
  });
  s.teste('aceita outro tema e mudanças de regras do pack; não fixa nomes ou níveis',()=>{
    const c=criatura(ORIGINAL.especies[0].dex),e=estado(c),r=orientacaoAvanco(ORIGINAL,e,{...escolha,bioma:ORIGINAL.biomas[0].id});
    ok(r.sugestao&&r.sugestao.exemplo.dano>0);
    const p={...PACK,avancoCombate:{niveisChefes:[7,17,27,37],niveisComuns:[2,9,15,25]}};
    const q=orientacaoAvanco(p,estado(criatura()),escolha);ok(q.rotas.every(x=>x.chefe.nivel===7));
  });
  return s;
}
