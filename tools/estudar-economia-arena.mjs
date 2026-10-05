/* Modelo fechado da moeda simulada. Mede conservação/custos, não retenção
   observada nem capacidade real de monetizar. Parâmetros declarados no JSON. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {STAKE_DO_TIER,liquidacaoDoStake,recebido} from '../engine/stake-liga.mjs';
import {ORCAMENTO_ARENA_PREPARACAO,ORCAMENTO_ARENA_COMPETITIVO,ORCAMENTO_AGREGADO_SEMANAL} from '../engine/emissao.mjs';
const porConta=ORCAMENTO_ARENA_PREPARACAO+ORCAMENTO_ARENA_COMPETITIVO;
const tiers=Object.entries(STAKE_DO_TIER).map(([tier,stake])=>{
  const l=liquidacaoDoStake({vencedor:'A',stake,contado:true}),a=recebido(l,'A',stake),b=recebido(l,'B',stake);
  assert.equal(a+b+l.rake,2*stake);return {tier,entrada:stake,retornoVencedor:a,lucro:a-stake,perda:stake,taxaCasa:l.rake};
});
const n=100,semanas=12,partidasPorConta=8,coortePorSemana=10;
let jogadores=n*300,casa=0,cosmeticos=0,emitido=n*300,promos=0;
const serie=[];
for(let s=0;s<semanas;s++){
  const rotina=n*ORCAMENTO_AGREGADO_SEMANAL;emitido+=rotina;jogadores+=rotina;
  const jogos=n*partidasPorConta/2,taxas=jogos*tiers[0].taxaCasa;jogadores-=taxas;casa+=taxas;
  const financiamento=coortePorSemana*porConta;assert(casa>=financiamento);casa-=financiamento;jogadores+=financiamento;promos+=financiamento;
  const compras=2000;assert(jogadores>=compras);jogadores-=compras;cosmeticos+=compras;
  assert.equal(jogadores+casa+cosmeticos,emitido);
  serie.push({semana:s+1,partidas:jogos,rotinaEmitida:rotina,taxaCasa:taxas,campanhaFinanciada:financiamento,coorte:coortePorSemana,saldoJogadores:jogadores,saldoCasa:casa,cosmeticos:compras});
}
const kit=300,derrotas=Array.from({length:6},(_,i)=>({derrotas:i+1,saldo:kit-(i+1)*STAKE_DO_TIER.Bronze}));assert.equal(derrotas.at(-1).saldo,0);
const r={modelo:'arena-economia-coorte-1',hipoteses:{contas:n,semanas,partidasPorConta,coortePorSemana,
  rotinaPorConta:ORCAMENTO_AGREGADO_SEMANAL,kitPorConta:kit,gastoCosmeticoTotalPorSemana:2000,
  aviso:'Todos obtêm o máximo rotineiro e compram cosméticos conforme hipótese; partidas são elegíveis e sem empates. Frequência, vitórias e compras não são métricas observadas.'},
  tiers,seisDerrotas:derrotas,recuperacaoSemAposta:{rotinaPorSemana:ORCAMENTO_AGREGADO_SEMANAL,entradasBronze:Math.floor(ORCAMENTO_AGREGADO_SEMANAL/STAKE_DO_TIER.Bronze),preparacaoFinanciadaMax:ORCAMENTO_ARENA_PREPARACAO},
  sustentabilidade:{verbaUniversalSemanal:n*porConta,receitaCasaSemanal:n*partidasPorConta/2*tiers[0].taxaCasa,
    campanhaUniversalFinanciavel:false,coorteFinanciavelPorSemana:Math.floor((n*partidasPorConta/2*tiers[0].taxaCasa)/porConta),
    aviso:'450 PC-B por semana não é promessa universal. Sem verba a campanha não nasce. Coorte definida antes dos resgates, com rotação anunciada; sem prioridade de clique.'},
  earned:{valorPorConta:50,coorte:coortePorSemana,dotacaoPorSemana:coortePorSemana*50,maximo12Semanas:coortePorSemana*50*semanas,origem:'dotação separada; sem converter bônus ou taxa em PC-T'},
  totais:{jogadores,casa,cosmeticos,emitido,promos},serie};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);if(saida)writeFileSync(saida,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({sustentabilidade:r.sustentabilidade,totais:r.totais}));
