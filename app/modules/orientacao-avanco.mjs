/* Camada 0. Cobertura de duelos, não previsão de completar 37 encontros.
   A guarda da ação pode fornecer bloqueio; nenhuma orientação inicia uma run.
   Usa período público da prévia. Não conhece clima, semente ou recompensa. */
import {elencoDoEstagio} from '../../engine/elenco-estagio.mjs';
import {estagioAberto} from '../../engine/estagios.mjs';
import {EQUIPE_MAX} from '../../engine/expedicao.mjs';
import {podeAvancar} from '../../engine/avanco.mjs';
import {REGRA_AVANCO_COMBATE} from '../../engine/run-combate.mjs';
import {WAVES} from '../../engine/wave.mjs';
import {montarLutador,avaliarGolpe,ULTIMO_RECURSO} from '../../engine/treino-batalha.mjs';
import {efeito} from '../../engine/primitivas.mjs';
import {especieDe} from '../../engine/especie.mjs';
import {movesetDoRival} from './moveset-dados.mjs';
import {paraOMotor} from './avanco-conta.mjs';
import {preferenciasDaPrevia} from './elenco-condicao.mjs';
export const VERSAO_ORIENTACAO='cobertura-duelos-1';

const melhor=(pack,a,d)=>{
  const chart=pack.tipos.efetividade;
  const pares=a.golpes.map(g=>({g,dano:avaliarGolpe(chart,a,d,g).dano}));
  const r=pares.reduce((m,x)=>x.dano>m.dano?x:m,pares[0]);
  const recurso={...ULTIMO_RECURSO,n:pack.ultimoRecurso?.n??ULTIMO_RECURSO.n};
  return r.dano>0?r:{g:recurso,dano:avaliarGolpe(chart,a,d,recurso).dano};
};
function duelo(pack,a,d){
  const chart=pack.tipos.efetividade,ataque=melhor(pack,a,d),resposta=melhor(pack,d,a);
  const indice=Math.log(Math.max(.01,(ataque.dano/d.maxHp)/(resposta.dano/a.maxHp)));
  return {indice,golpe:ataque.g.n,efetividade:efeito(chart,ataque.g.t,d.types),dano:ataque.dano,
    rival:d.dex,nivel:d.nivel,criatura:a.dex,id:a.id,recebeTipo:resposta.g.t,recebeEfetividade:efeito(chart,resposta.g.t,a.types)};
}

export function orientacaoAvanco(pack,estado,{equipe=[],estagio=1,bioma,agora,bloqueio=null}={}){
  const aviso='Comparação de golpes, não é chance de vitória da run. Velocidade, sequência, curas e clima também influenciam.';
  const nao=motivo=>({estagio,bloqueio:motivo,sugestao:null,atual:null,rotas:[],aviso});
  if(bloqueio)return nao(bloqueio);
  if(!Number.isFinite(agora))return nao('Atualize a leitura da equipe antes de comparar as rotas.');
  if(!equipe.length)return nao('Escolha ao menos uma criatura para comparar as rotas.');
  if(equipe.length>EQUIPE_MAX||new Set(equipe).size!==equipe.length)return nao('Escolha até três criaturas distintas.');
  const membros=equipe.map(id=>(estado.criaturas??[]).find(c=>c.id===id));
  if(membros.some(c=>!c))return nao('Revise as criaturas selecionadas.');
  if(membros.some(c=>c.naCaixa))return nao('Tire da caixa as criaturas selecionadas.');
  if(!Number.isInteger(estagio)||estagio<1||estagio>4||!estagioAberto(estado.criaturas??[],estagio))return nao('Escolha um estágio já aberto.');
  if(!podeAvancar(membros,agora).pode)return nao('A equipe precisa descansar antes do Avanço.');
  const atacantes=membros.map((c,i)=>({...montarLutador(pack,paraOMotor(pack,c),'A',i),id:c.id}));
  const regra={...REGRA_AVANCO_COMBATE,...pack.avancoCombate},ix=estagio-1;
  const nivelComum=regra.niveisComuns[ix]+Math.floor((WAVES-2)/3),nivelChefe=regra.niveisChefes[ix];
  const preferencias=preferenciasDaPrevia(pack,agora),rotas=[];
  for(const b of pack.biomas??[]){
    const elenco=elencoDoEstagio(pack,b.id,estagio,preferencias);
    if(!elenco?.comuns?.length||!elenco?.chefes?.length)continue;
    const avaliar=(lista,nivel)=>lista.map(c=>{
      const d=montarLutador(pack,{dex:c.dex,nivel,iv:Array(6).fill(15),golpes:movesetDoRival(pack,c.dex,nivel)},'B',0);
      return atacantes.map(a=>duelo(pack,a,d)).reduce((m,x)=>x.indice>m.indice?x:m);
    });
    const comuns=avaliar(elenco.comuns,nivelComum),chefes=avaliar(elenco.chefes,nivelChefe);
    const media=xs=>xs.reduce((n,x)=>n+x.indice,0)/xs.length;
    const chefe=chefes.reduce((m,x)=>x.indice<m.indice?x:m);
    const exemplo=chefes.reduce((m,x)=>x.efetividade>m.efetividade?x:m);
    rotas.push({bioma:b.id,rotulo:b.rotulo??b.id,indice:(media(comuns)+media(chefes))/2,chefe,exemplo,
      rivais:[...comuns,...chefes].map(x=>({dex:x.rival,nivel:x.nivel})),
      alerta:chefe.indice<0?'O chefe pode exigir mais nível ou outra criatura na equipe.':'Há cobertura favorável para os duelos com os chefes.'});
  }
  // Empate mantém a ordem do mapa do pack, sem priorizar uma espécie inicial.
  rotas.sort((a,b)=>b.indice-a.indice);
  const sugestao=rotas[0]??null;
  if(!sugestao)return nao('Nenhuma rota tem adversários disponíveis neste estágio.');
  return {estagio,bloqueio:null,sugestao,atual:rotas.find(x=>x.bioma===bioma)??null,rotas,aviso};
}

export function textoDaOrientacao(pack,r){
  if(r.bloqueio)return r.bloqueio;
  const x=r.sugestao.exemplo;
  const nome=d=>{const e=especieDe(pack,d);return (pack.nomeExibido??(s=>s))(e?.n??String(d));};
  const afinidade=x.efetividade>1?`super efetivo (${x.efetividade}×)`:x.efetividade<1?`resistido (${x.efetividade}×)`:'dano neutro';
  return `Para a equipe selecionada, compare ${r.sugestao.rotulo}, estágio ${r.estagio}. `+
    `${x.golpe} de ${nome(x.criatura)} causa ${afinidade} contra ${nome(x.rival)} (nível ${x.nivel}). `+
    `${r.atual?`Na rota selecionada (${r.atual.rotulo}): ${r.atual.alerta}`:r.sugestao.alerta} ${r.aviso}`;
}
