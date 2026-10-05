/* Camada 0: cria os snapshots da aventura. Motor genérico recebe conteúdo,
   inclusive golpes já liberados, sem conhecer o pack escolhido pelo produto. */
import { REGRA_AVANCO_COMBATE, VERSAO_AVANCO_COMBATE } from '../../engine/run-combate.mjs';
import { montarLutador, VERSAO_TBE } from '../../engine/treino-batalha.mjs';
import { composicaoDaWave, WAVES } from '../../engine/wave.mjs';
import { semente } from '../../engine/instancia.mjs';
import { derivar } from '../../engine/seed.mjs';
import { golpesDaCriatura, movesetDoRival } from './moveset-dados.mjs';

export function armarCombateDaRun(pack,run,motor,elenco,ritmo=1){
  const regra={...REGRA_AVANCO_COMBATE,...pack.avancoCombate};
  const equipe=motor.map(c=>({id:c.id,dex:c.dex,nivel:c.nivel,
    iv:c.iv?[...c.iv]:null,natureza:c.natureza??null,foco:c.foco??null,golpes:golpesDaCriatura(pack,c)}));
  if(!equipe.length)throw new Error('a aventura precisa de uma equipe');
  const estagio=Math.max(0,Math.min(3,run.estagio-1)),waves=[];
  for(let wave=1;wave<=WAVES;wave++){
    const comp=composicaoDaWave(semente(derivar(run.raiz,`avanco:${wave}:0`)),{elenco,wave});
    if(!comp.length)throw new Error('rota sem adversários');
    const nivel=wave===WAVES?regra.niveisChefes[estagio]:regra.niveisComuns[estagio]+Math.floor((wave-1)/3);
    const adversarios=comp.flatMap(x=>Array.from({length:x.quantos},()=>({dex:x.dex,nivel,
      iv:Array(6).fill(15),natureza:null,golpes:movesetDoRival(pack,x.dex,nivel)})));
    waves.push({comp,adversarios});
  }
  return {...run,combate:{versao:VERSAO_AVANCO_COMBATE,tbe:VERSAO_TBE,regra,equipe,waves,
    hpInicial:equipe.map((c,i)=>montarLutador(pack,c,'A',i).maxHp),creditados:[],ritmo}};
}
