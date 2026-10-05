import { criarSuite, ok, igual } from './harness.mjs';
import { avaliarGolpe, REGRAS } from '../engine/treino-batalha.mjs';
import { dano, rng } from '../engine/primitivas.mjs';

export function suite() {
  const s=criarSuite('batalha-precisao');
  const A={nivel:60,types:['water'],atk:100,spa:100}, D={types:['normal'],def:100,spd:100,hp:70};
  s.teste('estimativa usa a fórmula real, crítico, precisão e arredondamento',()=>{
    for(const g of [{p:90,t:'water',cat:'esp',acc:1},{p:110,t:'water',cat:'esp',acc:.8},{p:40,t:'water',cat:'fis'}]) {
      const R=rng(0xDD21), n=50000; let soma=0, util=0, ko=0;
      for(let i=0;i<n;i++) {
        const d=R()>=(g.acc??REGRAS.ACERTO_PADRAO)?0:dano({},A,D,g,R,1,1,A.nivel,REGRAS.CRITICO,REGRAS.MULT_CRITICO).dmg;
        soma+=d; util+=Math.min(d,D.hp); if(d>=D.hp)ko++;
      }
      const e=avaliarGolpe({},A,D,g);
      ok(Math.abs(e.dano-soma/n)<.6,`dano ${e.dano} vs ${soma/n}`);
      ok(Math.abs(e.util-util/n)<.6,`útil ${e.util} vs ${util/n}`);
      ok(Math.abs(e.nocaute-ko/n)<.015,`KO ${e.nocaute} vs ${ko/n}`);
    }
  });
  s.teste('imunidade zera tudo; categoria escolhe defesa física ou especial',()=>{
    const g={p:90,t:'water',cat:'fis',acc:1};
    igual(JSON.stringify(avaliarGolpe({water:{normal:0}},A,D,g)),JSON.stringify({dano:0,util:0,nocaute:0}));
    const fis=avaliarGolpe({},A,{...D,def:200,spd:50},g);
    const esp=avaliarGolpe({},A,{...D,def:200,spd:50},{...g,cat:'esp'});
    ok(esp.dano>fis.dano*3);
  });
  s.teste('precisão baixa é risco real, inclusive num golpe que garantiria KO se acertasse',()=>{
    const g={p:150,t:'water',cat:'esp',acc:.6};
    const e=avaliarGolpe({},A,{...D,hp:1},g);
    igual(e.nocaute,.6); igual(e.util,.6);
  });
  return s;
}
