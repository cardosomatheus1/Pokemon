/* Estimativa ANTES da partida; nunca lê a raiz privada que dará o resultado.
 * Seeds de calibração derivadas das entradas canônicas, independentes do
 * pedido/ids. Trocar a ordem dos lados complementa p, sem escolher outra amostra. */
import { simular } from '../../engine/treino-batalha.mjs';
import { derivarIndice } from '../../engine/seed.mjs';
import { POLITICA_ARENA as P } from '../../engine/arena-treinadores.mjs';
import { timeDoSnapshot } from './snapshot-dados.mjs';

export function avaliarPareamento(pack,a,b) {
  const entrada=s=>({time:timeDoSnapshot(s),preset:s.preset});
  const A=entrada(a),B=entrada(b),invertido=JSON.stringify(A)>JSON.stringify(B);
  const [x,y]=invertido?[B,A]:[A,B];
  const raiz=derivarIndice(JSON.stringify([x,y]),`${P.versao}:estimacao`,0);
  const amostras=[];
  const ponto=(r,lado)=>r.vencedor===lado?1:r.vencedor===null?.5:0;
  for(let i=0;i<P.paresEstimacao;i++){
    const opts={registrar:false,preset:x.preset,presetRival:y.preset};
    const r=simular(pack,x.time,y.time,raiz+i,opts);
    const v=simular(pack,y.time,x.time,raiz+i,{...opts,preset:y.preset,presetRival:x.preset});
    amostras.push((ponto(r,'A')+ponto(v,'B'))/2);
  }
  const media=amostras.reduce((s,n)=>s+n,0)/amostras.length,p=invertido?1-media:media;
  const erro=Math.sqrt(amostras.reduce((s,n)=>s+(n-media)**2,0)/(amostras.length-1)/amostras.length);
  const ic95=[Math.max(0,p-1.96*erro),Math.min(1,p+1.96*erro)];
  return {ok:p>=P.chanceMin&&p<=P.chanceMax&&ic95[0]>=P.limiteIcMin&&ic95[1]<=P.limiteIcMax,
    p,ic95,lutas:2*P.paresEstimacao};
}
