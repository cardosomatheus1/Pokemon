/* A verba anunciada a uma coorte fica reservada até a campanha terminar.
   A reserva é lógica; os lançamentos de gasto acontecem só no resgate. */
export function gastoCampanha(db,id,userId=null){
  const where=userId?' AND user_id=?':'';
  return db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE amount>0 AND reference_type='arena_campanha' AND substr(reference_id,1,?)=?${where}`).get(id.length+1,`${id}-`,...(userId?[userId]:[])).n;
}
export function verbaReservada(db,{agora,exceto=null}){
  return db.prepare('SELECT id,config_json FROM arena_campanhas WHERE fim>?').all(agora).reduce((total,row)=>{
    const c=JSON.parse(row.config_json);
    return total+(c.tipo==='bonus'&&row.id!==exceto?Math.max(0,c.orcamento-gastoCampanha(db,c.id)):0);
  },0);
}
export function campanhaDoResgate(db,nome){
  return db.prepare('SELECT id FROM arena_campanhas').all().find(c=>nome.startsWith(`${c.id}-`))?.id??null;
}
