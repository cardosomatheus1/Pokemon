/* AT6-08/09. Pilotos internos, com coorte imutável e verba de todas as vagas.
   Não existe campanha implícita nem aporte financeiro real neste módulo. */
import {agir} from './admin.mjs';
import {emTransacao,creditar} from './carteira.mjs';
import {saldoCasaArena,pagarCampanhaArena} from './tesouraria-arena.mjs';
import {gastoCampanha,verbaReservada} from './arena-orcamento.mjs';
import {contasLigadas,pausaAtiva} from './protecao.mjs';
import {anotarArena} from './arena-metricas.mjs';
import PACK from '../content/escolhido.mjs';
import {ORCAMENTO_ARENA_PREPARACAO,ORCAMENTO_ARENA_COMPETITIVO} from '../engine/emissao.mjs';
const D=86400000;
const erro=msg=>Object.assign(new Error(msg),{codigo:'ARENA_RECOMPENSA_NEGADA'});
const ler=(db,id)=>{const r=db.prepare('SELECT config_json FROM arena_campanhas WHERE id=?').get(id);return r?JSON.parse(r.config_json):null;};
const campeao=(db,userId)=>{const r=db.prepare('SELECT progresso_json FROM jornadas WHERE user_id=?').get(userId);const v=r?JSON.parse(r.progresso_json).vencidos??[]:[];return PACK.jornada.length>0&&PACK.jornada.every(n=>v.includes(n.id));};
const apta=(db,userId,agora)=>campeao(db,userId)&&!contasLigadas(db,userId).length&&!pausaAtiva(db,userId,agora);
export function criarCampanhaArena(db,{operadorId,config,motivo,confirmado,agora}){
  return agir(db,{operadorId,acao:'arena.campanha.criar',alvo:config?.id,motivo,confirmado,agora,para:JSON.stringify(config)},()=>emTransacao(db,()=>{
    const {id,tipo,inicio,dotacao,dotacaoRef}=config??{},coorte=[...new Set(config?.coorte??[])].sort();
    if(!/^[A-Za-z0-9]{8,24}$/.test(id)||!['bonus','earned'].includes(tipo)||!Number.isSafeInteger(inicio)||inicio<0||new Date(inicio).getUTCDay()!==1||inicio%D!==0||agora>=inicio+7*D||!coorte.length||coorte.length>1000||coorte.length!==config.coorte.length)throw erro('Configuração ou janela inválida. Use uma semana UTC e público fechado.');
    if(!coorte.every(u=>typeof u==='string'&&db.prepare('SELECT 1 FROM users WHERE id=?').get(u)&&apta(db,u,agora)))throw erro('Público inelegível.');
    const porConta=tipo==='bonus'?ORCAMENTO_ARENA_PREPARACAO+ORCAMENTO_ARENA_COMPETITIVO:50;
    const c={id,tipo,inicio,fim:inicio+7*D,coorte,porConta,orcamento:coorte.length*porConta,
      fonte:tipo==='bonus'?'taxa_casa':'dotacao_externa',...(tipo==='earned'?{dotacao,dotacaoRef}:{})};
    const anterior=ler(db,id);
    if(anterior){if(JSON.stringify(anterior)!==JSON.stringify(c))throw erro('Campanha imutável: crie outra identificação.');return anterior;}
    const sobrepostas=db.prepare('SELECT config_json FROM arena_campanhas WHERE fim>?').all(inicio).map(r=>JSON.parse(r.config_json));
    if(sobrepostas.some(x=>x.tipo===tipo&&x.inicio<c.fim&&x.coorte.some(u=>coorte.includes(u))))throw erro('Uma conta só participa de uma campanha deste tipo por janela.');
    if(tipo==='bonus'){
      const s=saldoCasaArena(db);
      if(s.bonus+s.competitivo-verbaReservada(db,{agora})<c.orcamento)throw erro('A casa não tem verba livre para garantir todas as vagas.');
    }else if(!Number.isSafeInteger(dotacao)||dotacao!==c.orcamento||!/^[\w-]{8,80}$/.test(dotacaoRef??'')||db.prepare('SELECT 1 FROM arena_dotacoes WHERE referencia=?').get(dotacaoRef))throw erro('PC-T exige dotação exclusiva registrada para toda a coorte.');
    db.prepare('INSERT INTO arena_campanhas(id,config_json,fim,criada_em) VALUES(?,?,?,?)').run(id,JSON.stringify(c),c.fim,agora);
    if(tipo==='earned')db.prepare('INSERT INTO arena_dotacoes(referencia,campanha,valor,criado_em) VALUES(?,?,?,?)').run(dotacaoRef,id,dotacao,agora);
    return c;
  }));
}
function marcoCompetitivo(db,c,userId,agora){
  const rows=db.prepare(`SELECT m.user_a,m.user_b,m.criada_em FROM league_matches m
    JOIN arena_partidas a ON a.partida_id=m.id JOIN liga_sinais s ON s.partida_id=m.id
    JOIN liga_stakes k ON k.partida_id=m.id
    WHERE a.modo='ranqueada' AND s.elegivel=1 AND k.estado IN ('liquidada','empate')
      AND (m.user_a=? OR m.user_b=?) AND m.criada_em>=? AND m.criada_em<? AND m.criada_em<=?`).all(userId,userId,c.inicio,c.fim,agora);
  const rivais=new Set(rows.map(r=>r.user_a===userId?r.user_b:r.user_a)),dias=new Set(rows.map(r=>Math.floor(r.criada_em/D)));
  return {partidas:rows.length,rivais:rivais.size,dias:dias.size,feito:rows.length>=3&&rivais.size>=3&&dias.size>=2};
}
function estado(db,c,userId,agora){
  const dia=new Date(agora).toISOString().slice(0,10),refDia=`${c.id}-d${dia}`,refSemana=`${c.id}-semanal`;
  const pago=ref=>db.prepare('SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE user_id=? AND reference_type=\'arena_campanha\' AND reference_id=?').get(userId,ref).n;
  const premioSemanal=pago(refSemana),gasto=gastoCampanha(db,c.id,userId),gastoDia=pago(refDia);
  const restantes=Math.max(0,ORCAMENTO_ARENA_PREPARACAO-(gasto-premioSemanal));
  const de=Math.floor(agora/D)*D;
  const preparou=!!db.prepare('SELECT 1 FROM treinador_fatos WHERE user_id=? AND criado_em>=? AND criado_em<? LIMIT 1').get(userId,de,de+D);
  const rotina=db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE user_id=? AND type IN ('LOGIN_STREAK_REWARD','CHALLENGE_REWARD','RESCUE_GRANT') AND created_at>=? AND created_at<?`).get(userId,de,de+D).n;
  const ativa=agora>=c.inicio&&agora<c.fim&&apta(db,userId,agora);
  const conta=db.prepare('SELECT created_at FROM users WHERE id=?').get(userId),madura=conta&&agora-conta.created_at>=7*D;
  const marco=marcoCompetitivo(db,c,userId,agora);
  const diario=c.tipo==='bonus'?Math.min(50,Math.max(0,50-rotina),restantes):0;
  return {id:c.id,tipo:c.tipo,fonte:c.fonte,fim:c.fim,limite:c.porConta,gasto,
    diario:{valor:diario,disponivel:ativa&&preparou&&!gastoDia&&diario>0,recebido:gastoDia>0,ref:refDia},
    semanal:{valor:c.tipo==='bonus'?ORCAMENTO_ARENA_COMPETITIVO:50,disponivel:ativa&&marco.feito&&!premioSemanal&&(c.tipo!=='earned'||madura),recebido:premioSemanal>0,ref:refSemana,marco},
    nota:c.tipo==='bonus'?'Preparação: até 50 PC-B/dia, teto 270 nesta semana. Marco competitivo: 100 PC-B. Rotinas de login/desafios/resgate têm até 80 PC-B separados: total até 450.':'50 PC-T por marco competitivo. Conta com pelo menos 7 dias; dotação separada do bônus.'};
}
export function recompensasArena(db,{userId,agora}){
  return db.prepare('SELECT config_json FROM arena_campanhas WHERE fim>?').all(agora).map(r=>JSON.parse(r.config_json)).filter(c=>c.coorte.includes(userId)).map(c=>estado(db,c,userId,agora));
}
export function resgatarArena(db,{userId,campanha,tipo,agora}){
  return emTransacao(db,()=>{
    const c=ler(db,campanha);
    if(!c||!c.coorte.includes(userId)||!['preparacao','competitivo'].includes(tipo)||agora<c.inicio||agora>=c.fim||!apta(db,userId,agora))throw erro('Campanha encerrada ou resgate inelegível.');
    const e=estado(db,c,userId,agora),p=tipo==='preparacao'?e.diario:e.semanal;
    if(p.recebido)return {repetida:true,pago:0};
    if(!p.disponivel)throw erro('Cumpra o objetivo registrado para resgatar.');
    if(e.gasto+p.valor>c.porConta||gastoCampanha(db,c.id)+p.valor>c.orcamento)throw erro('Orçamento esgotado.');
    const r=c.tipo==='bonus'?pagarCampanhaArena(db,{campanha:p.ref,userId,valor:p.valor,teto:c.orcamento,agora})
      :creditar(db,{userId,tipo:'ARENA_EARNED_REWARD',bucket:'transferivel',valor:p.valor,idem:`earned:${c.id}:${userId}`,ref:p.ref,refTipo:'arena_campanha',memo:JSON.stringify({dotacao:c.dotacaoRef,janela:[c.inicio,c.fim]}),agora});
    if(r.ok===false)throw erro('Crédito não concedido.');
    anotarArena(db,{nome:'arena_recompensa_concedida',userId,chave:`campanha:${p.ref}`,campos:{campanha:c.id,fonte:c.fonte,valor:p.valor,bucket:c.tipo==='bonus'?'bonus':'transferivel',janela:[c.inicio,c.fim]},agora});
    return {pago:p.valor,repetida:false};
  });
}
