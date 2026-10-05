/* Catálogo exclusivo do modo treinador: explicita os mesmos valores da TBE.
   As listas de atribuição da arena comum permanecem intactas. */
export const ACERTO_TREINADOR=.92;
export function criarCatalogoTreinador(golpes){
  return Object.fromEntries(Object.values(golpes??{}).flat().map(g=>[
    g.n,{...g,acc:g.acc??ACERTO_TREINADOR,efeitos:[]},
  ]));
}
export function golpeTreinador(pack,nome){
  if(Object.hasOwn(pack?.catalogoTreinador??{},nome))return pack.catalogoTreinador[nome];
  for(const lista of Object.values(pack?.golpes??{}))for(const g of lista)
    if(g.n===nome)return {...g,acc:g.acc??ACERTO_TREINADOR,efeitos:[]};
  return null;
}
