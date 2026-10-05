import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import * as TBE from '../engine/treino-batalha.mjs';
import { movesetDoRival } from '../app/modules/moveset-dados.mjs';
const c = (dex,nivel=30) => ({dex,nivel,golpes:movesetDoRival(PACK,dex,nivel)});
export function suite(){const s=criarSuite('combate-continuo');
  s.teste('combate pode ser interrompido, serializado e retomado com eventos idênticos à arena',()=>{
    for(let seed=0;seed<60;seed++){
      const a=[c(6),c(9),c(3)],b=[c(65),c(143),c(149)];
      const referencia=TBE.simular(PACK,a,b,seed);
      let estado=TBE.iniciarCombate(PACK,a,b,seed),eventos=[];
      for(let n=0;n<1200;n++){
        const passo=TBE.passoCombate(PACK,JSON.parse(JSON.stringify(estado)));estado=passo.estado;
        if(passo.evento)eventos.push(passo.evento);
        if(passo.fim){igual(JSON.stringify(eventos),JSON.stringify(referencia.eventos));
          igual(passo.vencedor,referencia.vencedor);igual(estado.turno,referencia.turnos);break;}
        ok(n<1199,'combate sem término');
      }
    }
  });
  s.teste('HP inicial é individual; cura durante o turno não ressorteia ataques passados',()=>{
    const a=[c(6,60)],b=[c(143,60)];
    let estado=TBE.iniciarCombate(PACK,a,b,81,{hpA:[1]});
    igual(estado.lados.A[0].hp,1);
    const copia=JSON.stringify(estado);
    const passo=TBE.passoCombate(PACK,estado);igual(JSON.stringify(estado),copia,'entrada mutada');
    ok(passo.evento,'sem golpe');
    const curado=JSON.parse(JSON.stringify(passo.estado));
    if(curado.lados.A[0].hp>0)curado.lados.A[0].hp=curado.lados.A[0].maxHp;
    igual(curado.rng,passo.estado.rng);igual(JSON.stringify(curado.ordem),JSON.stringify(passo.estado.ordem));
    const mortos=TBE.iniciarCombate(PACK,a,b,81,{hpA:[0]});
    const fim=TBE.passoCombate(PACK,mortos);ok(fim.fim);igual(fim.evento,null);igual(fim.vencedor,'B');
    for(const hp of [-1,NaN,999999]){
      let rejeitou=false;try{TBE.iniciarCombate(PACK,a,b,81,{hpA:[hp]});}catch{rejeitou=true;}
      ok(rejeitou,'HP inválido aceito');
    }
  });
  s.teste('presets, precisão, crítico e último recurso permanecem os da TBE',()=>{
    for(const preset of TBE.PRESETS){
      const a=[c(25,60)],b=[c(50,10)];
      a[0].golpes=['Thunderbolt'];
      let estado=TBE.iniciarCombate(PACK,a,b,523,{preset}),eventos=[];
      for(let n=0;n<500;n++){const r=TBE.passoCombate(PACK,estado);estado=r.estado;if(r.evento)eventos.push(r.evento);if(r.fim)break;}
      igual(JSON.stringify(eventos),JSON.stringify(TBE.simular(PACK,a,b,523,{preset}).eventos));
      ok(eventos.some(e=>e.golpe===PACK.ultimoRecurso?.n||e.golpe==='último recurso'));
    }
  });
  return s;
}
