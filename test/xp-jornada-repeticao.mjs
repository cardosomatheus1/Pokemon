import { criarSuite, ok, igual } from './harness.mjs';
import { limitarXpRepetido } from '../engine/xp-jornada-repeticao.mjs';
export function suite() {
  const s=criarSuite('xp-jornada-repeticao');
  s.teste('teto é da conta, dividido pelo time; primeira vitória não consome teto',()=>{
    const xp={a:100,b:100,c:100};
    const r=limitarXpRepetido({xp,dia:1,agora:100000,estado:{dia:1,pago:5994,ultimo:0}});
    igual(JSON.stringify(r.xp),'{"a":2,"b":2,"c":2}'); igual(r.estado.pago,6000);
    const cheio=limitarXpRepetido({xp,dia:1,agora:100001,estado:r.estado,primeiraVez:true});
    igual(JSON.stringify(cheio.xp),JSON.stringify(xp)); igual(cheio.estado.pago,6000);
  });
  s.teste('trinta segundos são globais; virar o dia libera o orçamento',()=>{
    const xp={a:30,b:30,c:30}; const r=limitarXpRepetido({xp,dia:1,agora:100000});
    igual(Object.values(limitarXpRepetido({xp,dia:1,agora:129999,estado:r.estado}).xp).reduce((a,b)=>a+b,0),0);
    igual(limitarXpRepetido({xp,dia:1,agora:130000,estado:r.estado}).estado.pago,180);
    igual(limitarXpRepetido({xp,dia:2,agora:200000,estado:r.estado}).estado.pago,90);
  });
  s.teste('repetir milhares de vezes nunca multiplica o teto pelo número de criaturas',()=>{
    let estado, total=0;
    for(let i=0;i<1000;i++) {const r=limitarXpRepetido({xp:{a:123,b:123,c:123,d:123,e:123,f:123},dia:1,agora:i*30000,estado});estado=r.estado;total+=Object.values(r.xp).reduce((a,b)=>a+b,0);}
    igual(total,6000); ok(estado.pago<=6000);
  });
  return s;
}
