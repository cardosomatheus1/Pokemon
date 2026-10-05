/* Só o XP de RECOMPENSA REPETIDA da jornada. O Avanço não usa este módulo. */
export const XP_REPETIDO = Object.freeze({ teto:6000, intervaloMs:30000 });
export function estadoXpRepetido(estado, dia) {
  return { dia, pago:estado?.dia===dia && Number.isSafeInteger(estado.pago) ? Math.max(0,estado.pago) : 0,
    ultimo:estado?.dia===dia && Number.isSafeInteger(estado.ultimo) ? estado.ultimo : null };
}
export function limitarXpRepetido({xp={},estado,dia,agora,primeiraVez=false}) {
  const atual=estadoXpRepetido(estado,dia), entradas=Object.entries(xp);
  if(primeiraVez)return {xp:{...xp},estado:atual,motivo:null};
  const intervalo=Number.isSafeInteger(agora) && (atual.ultimo===null || agora-atual.ultimo>=XP_REPETIDO.intervaloMs);
  const porCriatura=intervalo && entradas.length ? Math.floor(Math.max(0,XP_REPETIDO.teto-atual.pago)/entradas.length) : 0;
  const credito=Object.fromEntries(entradas.map(([id,n])=>[id,Math.min(Math.max(0,Math.floor(n)),porCriatura)]));
  const pago=Object.values(credito).reduce((a,n)=>a+n,0);
  return {xp:credito,estado:{...atual,pago:atual.pago+pago,ultimo:pago>0?agora:atual.ultimo},
    motivo:!entradas.length?null:!intervalo?'intervalo':pago===0?'teto':null};
}
