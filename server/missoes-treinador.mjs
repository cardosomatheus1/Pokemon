/* Fatos gravados junto da ação real. Consultar o perfil pode recuperar uma
   recompensa após queda; o navegador não tem rota para escrever estes fatos. */
export const MISSOES_TREINADOR=[{tipo:'explorar',alvo:1},{tipo:'treinar',alvo:1},{tipo:'jornada',alvo:1}];
export function registrarMissao(db,{userId,tipo,chave,agora}){
  if(!MISSOES_TREINADOR.some(m=>m.tipo===tipo)||!chave||!Number.isSafeInteger(agora))throw new Error('fato de missão inválido');
  db.prepare(`INSERT OR IGNORE INTO treinador_fatos (user_id,chave,tipo,criado_em) VALUES(?,?,?,?)`).run(userId,chave,tipo,agora);
}
export function fatosDasMissoes(db,userId,dia){
  const de=Date.parse(`${dia}T00:00:00Z`);
  return db.prepare(`SELECT tipo,COUNT(*) AS n FROM treinador_fatos WHERE user_id=? AND criado_em>=? AND criado_em<? GROUP BY tipo`).all(userId,de,de+86400000);
}
