/* Avanço com duelos reais. Cada golpe sai da TBE; o roteiro só põe horários.
   A equipe e os rivais são snapshots da entrada, nunca atributos do DOM.
   Curas entram no cursor de combate, preservando a iniciativa e o passado. */
import { iniciarCombate, passoCombate, montarLutador, VERSAO_TBE } from './treino-batalha.mjs';
import { derivar } from './seed.mjs';
import { WAVES } from './wave.mjs';
import { BONUS_DO_GUIA } from './foco.mjs';
export const VERSAO_AVANCO_COMBATE='avanco-tbe-1';
export const REGRA_AVANCO_COMBATE=Object.freeze({
  /* ST-2.35 (o 8º relato: "o chefe do estágio 2 virou um paredão"): o chefe
     dos estágios 2 a 4 desce 2 a 3 níveis — ele é a forma evoluída, e no
     nível da porta +3 já ganhava de um time inteiro de não evoluídos.
     A CURA POR ABATE É 25% (ST-2.40, o 9º relato). A ST-2.35 a tinha baixado
     para 10% junto com o alvo espalhado, e as duas juntas dobraram o
     desgaste: os 10% foram pensados para quando só o da frente apanhava. O
     time do relato (Beedrill 13 + Bellsprout 13) chegava ao chefe com alguém
     caído em 78% das runs e completava 37%; com 25%, 66%. Contra o chefe com
     a vida cheia ele já vencia 26 de 31 — o paredão era o caminho até ele. */
  niveisComuns:[1,8,14,24],niveisChefes:[5,13,21,33],recuperacao:.25,
  /* QUEM APANHA: o selvagem escolhe o alvo entre os vivos, e o time apanha
     junto — com 'primeiro', só o da frente lutava e os outros passavam a run
     intactos. Run gravada sem esta chave segue a regra dela ('primeiro'). */
  alvo:'espalhado',
  /* ST-2.34: a wave estica até 24 s, e não até 45. A luta dura ~19 s em todo
     estágio e nível (tools/estudo-ritmo-avanco.mjs); os 26 s que sobravam
     eram campo vazio — o 7º relato: "waves de 45 s deixam o ritmo lento". */
  aproximacaoMs:3500,golpeMs:1400,duracaoMinMs:24000,
});
const copiar=x=>JSON.parse(JSON.stringify(x));
const soma=xs=>xs.reduce((n,x)=>n+x,0);
const indiceVivo=vidas=>vidas.findIndex(hp=>hp>0);
const barra=(vidas,maximos)=>soma(vidas)===0?0:soma(vidas)===soma(maximos)?100:Math.max(1,Math.min(99,Math.round(100*soma(vidas)/soma(maximos))));
function validar(run){
  if(run.combate?.versao!==VERSAO_AVANCO_COMBATE||run.combate.tbe!==VERSAO_TBE)
    throw new Error('versão de Avanço incompatível');
}

export function waveDeCombate(run,pack){
  validar(run);
  const c=run.combate,equipe=c.equipe,w=c.waves[run.wave-1];
  const maximos=equipe.map((x,i)=>montarLutador(pack,x,'A',i).maxHp);
  const vidas=[...c.hpInicial],curas=[...(run.curas??[])].sort((a,b)=>a.t-b.t);
  const momentos=[],duelos=[],regra=c.regra;
  const ritmo=Math.max(.01,c.ritmo),entradaMs=Math.round(regra.aproximacaoMs/ritmo),passoMs=Math.round(regra.golpeMs/ritmo);
  let t=0,ci=0,empate=false;
  const marcar=(tipo,extra={})=>momentos.push({tipo,t,...extra,vidas:[...vidas]});
  // Só criaturas ainda conscientes recuperam vida. Nenhum revive implícito.
  const curar=pct=>{let total=0;
    for(let a=0;a<vidas.length;a++)if(vidas[a]>0){
      const quanto=Math.min(maximos[a]-vidas[a],Math.floor(maximos[a]*pct/100));
      vidas[a]+=quanto;total+=quanto;
    }return total;
  };
  const aplicarCuras=(ate,incluirLimite=false)=>{
    while(ci<curas.length&&(curas[ci].t<ate||(incluirLimite&&curas[ci].t===ate))){
      const cura=curas[ci++],anterior=t;t=cura.t;
      const quanto=curar(cura.quanto);marcar('cura',{quanto});t=anterior;
    }
  };
  const adversarios=w.adversarios;
  const vivos=()=>vidas.map((hp,a)=>hp>0?a:-1).filter(a=>a>=0);
  const alvoDo=(i,k)=>{const v=vivos();if(!v.length)return -1;
    return regra.alvo==='espalhado'?v[derivar(run.raiz,`avanco:${run.wave}:${i}:alvo:${k}`)%v.length]:v[0];};
  for(let i=0;i<adversarios.length&&indiceVivo(vidas)>=0;i++){
    const rival=adversarios[i],maxHp=montarLutador(pack,rival,'B',0).maxHp;
    let atual=alvoDo(i,0),troca=0;
    const de=t;marcar('entra',{i,dex:rival.dex,hpMax:maxHp,nivel:rival.nivel,heroi:atual});
    t+=entradaMs;let hpRival=maxHp;
    while(hpRival>0&&indiceVivo(vidas)>=0&&!empate){
      if(!(vidas[atual]>0))atual=alvoDo(i,++troca);
      const heroi=atual;
      let duelo=iniciarCombate(pack,[equipe[heroi]],[rival],derivar(run.raiz,`avanco:${run.wave}:${i}:${heroi}:combate`),
        {hpA:[vidas[heroi]],hpB:[hpRival]});
      // Guia ajuda os outros, uma vez. No duelo o poder é ataque físico/especial.
      const bonus=1+(equipe.some((c,a)=>a!==heroi&&c.foco==='guia'&&vidas[a]>0)?BONUS_DO_GUIA:0);
      duelo.lados.A[0].atk*=bonus;duelo.lados.A[0].spa*=bonus;
      for(let n=0;n<201;n++){
        aplicarCuras(t+passoMs);duelo.lados.A[0].hp=vidas[heroi];
        const passo=passoCombate(pack,duelo);duelo=passo.estado;
        const e=passo.evento;
        if(e){
          t+=passoMs;vidas[heroi]=duelo.lados.A[0].hp;hpRival=duelo.lados.B[0].hp;
          const meu=e.de==='A0',fonte=meu?equipe[heroi]:rival;
          marcar('golpe',{i,dex:rival.dex,heroi,de:meu?'meu':'dele',nome:e.golpe,
            golpe:Math.max(0,fonte.golpes.indexOf(e.golpe)),nivel:fonte.nivel,
            dano:e.dano,eff:e.eff,crit:e.crit,errou:e.errou,caiu:e.caiu,
            iniciativa:e.iniciativa,velocidade:e.velocidade,
            hpAlvo:meu?hpRival:vidas[heroi],hpRival});
          if(e.caiu&&meu)marcar('abate',{i,dex:rival.dex});
          if(e.caiu&&!meu){atual=alvoDo(i,++troca);marcar('troca',{heroi:atual});}
        }
        if(passo.fim){if(passo.vencedor===null)empate=true;break;}
      }
    }
    duelos.push({i,dex:rival.dex,de,ate:hpRival<=0?t:null});
    if(hpRival<=0){curar(regra.recuperacao*100);marcar('recupera');}
    if(empate)break;
  }
  const venceu=!empate&&indiceVivo(vidas)>=0;
  const duracao=venceu?Math.max(Math.round(regra.duracaoMinMs/ritmo),t):t;
  aplicarCuras(duracao,true);
  momentos.sort((a,b)=>a.t-b.t);
  return {venceu,empate,p:null,comp:w.comp,dano:100-barra(vidas,maximos),
    vidas:[...vidas],maximos,roteiro:{duracao,momentos,duelos}};
}

function estadoNoInstante(run,w,t){
  let vidas=[...run.combate.hpInicial];
  for(const m of w.roteiro.momentos){if(m.t>t)break;vidas=m.vidas;}
  return {vidas:[...vidas],hp:soma(vidas),percentual:barra(vidas,w.maximos)};
}
const somar=(lista,dex)=>{const a=lista.find(x=>x.dex===dex);if(a)a.quantos++;else lista.push({dex,quantos:1});};

export function avancarCombate(run,{pack,agora}){
  if(!run||run.fim)return {run,aconteceu:[]};
  if(agora<(run.combate.lidoAte??run.iniciadaEm))return {run,aconteceu:[]};
  const r=copiar(run),aconteceu=[];
  for(let volta=0;volta<WAVES;volta++){
    const w=waveDeCombate(r,pack),t=Math.max(0,agora-r.waveComecouEm);
    const creditados=r.combate.creditados??[];
    for(const m of w.roteiro.momentos){
      if(m.t>t)break;
      if(m.tipo==='entra'&&!r.apareceram.includes(m.dex)){
        r.apareceram.push(m.dex);aconteceu.push({tipo:'apareceu',dex:m.dex,wave:r.wave,em:r.waveComecouEm+m.t});
      }
      if(m.tipo==='abate'&&!creditados.includes(m.i)){somar(r.abates,m.dex);creditados.push(m.i);}
    }
    r.combate.creditados=creditados;
    r.hpNaWave=estadoNoInstante(r,w,Math.min(t,w.roteiro.duracao)).percentual;
    if(t<w.roteiro.duracao)break;
    const em=r.waveComecouEm+w.roteiro.duracao;
    aconteceu.push({tipo:'wave',wave:r.wave,venceu:w.venceu,comp:w.comp,em});
    if(!w.venceu||r.wave===WAVES){
      r.fim={em,completou:w.venceu,motivo:w.venceu?'limpou':w.empate?'empate':'hp'};
      aconteceu.push({tipo:w.venceu?'limpou':'caiu',wave:r.wave,em});break;
    }
    r.wave++;r.waveComecouEm=em;r.curas=[];
    r.combate.hpInicial=w.vidas;r.combate.creditados=[];
  }
  r.combate.lidoAte=r.fim?.em??agora;
  r.eventos=[...(r.eventos??[]),...aconteceu];return {run:r,aconteceu};
}

export function cenaDoCombate(run,{pack,agora}){
  const w=waveDeCombate(run,pack),roteiro=w.roteiro;
  const t=Math.max(0,Math.min(roteiro.duracao,(run.fim?Math.min(agora,run.fim.em):agora)-run.waveComecouEm));
  const estado=estadoNoInstante(run,w,t),caidos=new Set(roteiro.momentos.filter(m=>m.tipo==='abate'&&m.t<=t).map(m=>m.i));
  const emCena=roteiro.momentos.filter(m=>m.tipo==='entra'&&m.t<=t&&!caidos.has(m.i)).map(m=>{
    const hits=roteiro.momentos.filter(g=>g.tipo==='golpe'&&g.i===m.i&&g.de==='meu'&&g.t<=t);
    const hp=hits.at(-1)?.hpAlvo??m.hpMax;
    return {...m,desde:m.t,chefe:run.wave===WAVES,chegando:t<m.t+Math.round(run.combate.regra.aproximacaoMs/run.combate.ritmo),hp,vida:hp/m.hpMax};
  });
  /* quem está lutando agora é o último que o roteiro pôs em campo (ST-2.35) */
  const posto=roteiro.momentos.filter(m=>m.t<=t&&Number.isInteger(m.heroi)&&m.heroi>=0).at(-1)?.heroi;
  let heroi=posto!=null&&estado.vidas[posto]>0?posto:indiceVivo(estado.vidas);if(heroi<0)heroi=0;
  const unidade=run.combate.equipe[heroi];
  const proxima=roteiro.momentos.find(m=>m.tipo==='entra'&&m.t>t);
  return {wave:run.wave,tentativa:0,chance:null,venceu:w.venceu,duracao:roteiro.duracao,t,restam:roteiro.duracao-t,
    hp:estado.hp,hpMax:soma(w.maximos),comp:w.comp,emCena,caidos:caidos.size,proximaEntrada:proxima?proxima.t-t:null,
    duelando:emCena.some(m=>!m.chegando),fim:run.fim??null,
    heroi:{...unidade,i:heroi,hp:estado.vidas[heroi],hpMax:w.maximos[heroi]},
    golpes:roteiro.momentos.filter(m=>m.tipo==='golpe'&&m.t<=t&&m.t>t-1900),
    aCaminho:roteiro.momentos.filter(m=>m.tipo==='golpe'&&m.t>t&&m.t<=t+900)};
}

export function curarCombate(run,{pack,cura,agora}){
  if(run.fim)throw new Error('não há run em curso');
  if(agora<(run.combate.lidoAte??run.iniciadaEm))throw new Error('o relógio voltou — consulte a run novamente');
  const w=waveDeCombate(run,pack),t=Math.max(0,Math.min(w.roteiro.duracao,agora-run.waveComecouEm));
  const estado=estadoNoInstante(run,w,t);
  const quanto=estado.vidas.reduce((n,hp,i)=>n+(hp>0?Math.min(w.maximos[i]-hp,Math.floor(w.maximos[i]*cura/100)):0),0);
  if(!quanto)throw new Error('a vida já está cheia — guarde a poção');
  const vidas=estado.vidas.map((hp,i)=>hp>0?Math.min(w.maximos[i],hp+Math.floor(w.maximos[i]*cura/100)):0);
  return {run:{...run,combate:{...run.combate,lidoAte:agora},hpNaWave:barra(vidas,w.maximos),curas:[...(run.curas??[]),{t,quanto:cura}]},curou:quanto};
}
