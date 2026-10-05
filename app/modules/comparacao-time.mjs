/* AT6-05 · camada 0. Compara snapshots; nunca altera a defesa ou joga uma luta.
   A ficha só é reconstruída quando ambos usam as regras e o conteúdo atuais. */
import {montarLutador,VERSAO_TBE} from '../../engine/treino-batalha.mjs';
import {especieDe} from '../../engine/especie.mjs';
import {conteudoDaLuta} from './snapshot-dados.mjs';

const ATRIBUTOS={HP:'maxHp',Ataque:'atk',Defesa:'def','At. especial':'spa','Def. especial':'spd',Velocidade:'spe'};
const diferente=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
const textoGolpes=gs=>gs.map(g=>`${g.nome}: ${g.tipo}, ${g.categoria}, poder ${g.poder}, precisão ${+(g.precisao*100).toFixed(2)}%`).join('; ');
function ficha(pack,c){
  const f=montarLutador(pack,c,'A',0),e=especieDe(pack,c.dex);
  return {nome:e.n,dex:c.dex,nivel:c.nivel,iv:c.iv?.slice()??[],natureza:c.natureza??'neutra',
    tipos:f.types.map(t=>pack.tipos.nomes?.[t]??t),shiny:c.shiny===true,
    stats:Object.fromEntries(Object.entries(ATRIBUTOS).map(([nome,k])=>[nome,f[k]])),
    golpes:f.golpes.map(g=>({nome:g.n,tipo:pack.tipos.nomes?.[g.t]??g.t,
      categoria:g.cat==='fis'?'físico':'especial',poder:g.p,precisao:g.acc}))};
}
const incomparavel=aviso=>({compativel:false,mudou:true,aviso,membros:[],mudancas:[]});
export function compararTimePublicado({pack,publicado,atual}){
  if(!publicado||!atual?.ok)return null;
  const versao=conteudoDaLuta(pack);
  if([publicado,atual].some(s=>s.versaoMotor!==VERSAO_TBE||s.versaoConteudo!==versao))
    return incomparavel('As regras mudaram. Publique de novo; a ficha antiga não foi recalculada.');
  const mudancas=[],membros=[];
  if(publicado.preset!==atual.preset)mudancas.push({campo:'Preset',antes:publicado.preset,depois:atual.preset});
  const idsAntes=publicado.time.map(c=>c.id),idsDepois=atual.time.map(c=>c.id);
  if(diferente(idsAntes,idsDepois))mudancas.push({campo:'Ordem',antes:idsAntes.join(', '),depois:idsDepois.join(', ')});
  try{
    for(const id of new Set([...idsAntes,...idsDepois])){
      const a=publicado.time.find(c=>c.id===id),b=atual.time.find(c=>c.id===id);
      const antes=a?ficha(pack,a):null,depois=b?ficha(pack,b):null,campos=[];
      const posicaoAntes=idsAntes.indexOf(id)+1,posicaoDepois=idsDepois.indexOf(id)+1;
      if(!a||!b)campos.push({campo:'Membro',antes:antes?.nome??'fora do time',depois:depois?.nome??'fora do time'});
      else{
        const add=(campo,x,y)=>{if(diferente(x,y))campos.push({campo,antes:String(x),depois:String(y)});};
        add('Posição',posicaoAntes,posicaoDepois);
        add('Espécie',`${antes.nome} (#${antes.dex})`,`${depois.nome} (#${depois.dex})`);
        add('Nível',antes.nivel,depois.nivel);
        add('IVs',antes.iv.join('/'),depois.iv.join('/'));
        add('Natureza',antes.natureza,depois.natureza);
        add('Tipos',antes.tipos.join('/'),depois.tipos.join('/'));
        add('Golpes',textoGolpes(antes.golpes),textoGolpes(depois.golpes));
        add('Aparência',antes.shiny?'shiny':'comum',depois.shiny?'shiny':'comum');
        for(const nome of Object.keys(ATRIBUTOS))add(nome,antes.stats[nome],depois.stats[nome]);
      }
      if(campos.length)membros.push({id,posicaoAntes,posicaoDepois,antes,depois,mudancas:campos});
    }
  }catch{
    return incomparavel('O time publicado tem dados incompletos. Publique de novo para atualizar a ficha.');
  }
  return {compativel:true,mudou:!!(mudancas.length||membros.length),membros,mudancas,
    aviso:'A arena usa o publicado até publicar de novo. Atributos maiores não garantem vitória; tipos, golpes, precisão e ordem também influenciam.'};
}
