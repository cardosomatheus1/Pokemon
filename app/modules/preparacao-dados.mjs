/* Camada 0. O próximo objetivo e a prévia usam o mesmo conteúdo da luta. */
import {hidratar} from './idle-dados.mjs';
import {prontasPara,aplicar} from './evolucao-idle.mjs';
import {snapshotDoTime} from './snapshot-dados.mjs';
import {compararTimePublicado} from './comparacao-time.mjs';
import {especieDe} from '../../engine/especie.mjs';

export function objetivoArena(pack,estado={}){
  const todas=estado.criaturas??[],time=todas.filter(c=>!c.naCaixa);
  const vencidos=new Set(estado.jornada?.vencidos??[]);
  const campeao=pack.jornada.length>0&&pack.jornada.every(n=>vencidos.has(n.id));
  const acao=(view,rotulo,aba)=>({view,rotulo,...(aba?{aba}:{})});
  if(!todas.length)return {estado:'inicial',titulo:'Comece sua coleção',texto:'Escolha seu inicial, explore e prepare um time para os ginásios.',acao:acao('viewIdle','Escolher inicial')};
  if(!campeao)return {estado:'jornada',titulo:'Seu caminho até a Arena',texto:'Vença os ginásios e complete a Liga. Depois, seis espécies diferentes formam seu time para a Arena 6×6.',acao:acao('viewTreino','Continuar a jornada','treino:jornada')};
  if(time.length!==6||new Set(time.map(c=>Number(c.dex))).size!==6)return {estado:'equipe',titulo:'Campeão: prepare seis espécies',texto:'Capture, treine ou negocie para montar seis membros de espécies diferentes na equipe ativa.',acao:acao('viewIdle','Preparar equipe')};
  return {estado:'arena',titulo:'Seu próximo desafio: Arena 6×6',texto:'Publique seu time. Treine no amistoso ou busque o ranking: Bronze custa 50 PC por jogador, com 10% do pote para a casa. A defesa usa seu time publicado.',acao:acao('viewTreino','Abrir Arena 6×6','treino:liga')};
}

export function previsoesEvolucao(pack,criatura,bolsa={}){
  if(!criatura)return [];
  const c=hidratar(criatura),antes=snapshotDoTime({pack,criaturas:[c],ids:[c.id]});
  return prontasPara(pack,c,bolsa).map(a=>{
    const r=aplicar(pack,c,bolsa,a.para);
    const depois=snapshotDoTime({pack,criaturas:[r.criatura],ids:[c.id]});
    return {para:a.para,nome:especieDe(pack,a.para)?.n??String(a.para),consome:r.consome,
      comparacao:compararTimePublicado({pack,publicado:antes,atual:depois}),preservados:r.criatura.exclusivos??[]};
  });
}
