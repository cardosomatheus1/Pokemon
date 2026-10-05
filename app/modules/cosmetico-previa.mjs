/* Camada 3: prévia só de aparência. Não equipa, não cobra e não altera perfil. */
export function previaCosmetico({catalogo,chave,perfil={},avatar=''}){
  const p=(catalogo??[]).find(p=>`${p.familia}:${p.id}`===chave);if(!p)return null;
  const visual={cena:perfil.battle?.cena??'cidade',efeito:perfil.battle?.efeito??'neon',moldura:perfil.battle?.moldura??'neon',arena:'coliseu',avatar};
  if(p.familia==='arena')visual.arena=p.id;
  if(['cena','efeito','moldura'].includes(p.familia))visual[p.familia]=p.id;
  if(['avatar','outfit'].includes(p.familia)&&p.arte?.tipo==='img')visual.avatar=p.arte.src;
  return {chave,nome:p.nome,preco:p.preco,visual,compravel:p.procedencia==='loja',vinculado:true};
}
