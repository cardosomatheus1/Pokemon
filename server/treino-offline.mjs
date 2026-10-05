import { contaTreinoOffline, JANELA_TREINO_MS } from '../engine/treino-offline.mjs';
import { emTransacao } from './carteira.mjs';
import { sincronizarRun } from './run.mjs';

export const estadoTreinoOffline = (db,userId) => {
  const r=db.prepare('SELECT estado_json FROM treinos_offline WHERE user_id=?').get(userId);
  return r?JSON.parse(r.estado_json):null;
};
export function treinarOffline(db,{userId,pack,agora}){
  /* Waves passadas devem resolver com os atributos anteriores ao crédito. */
  sincronizarRun(db,{userId,pack,agora});
  return emTransacao(db,()=>{
    const estado=estadoTreinoOffline(db,userId),de=agora-JANELA_TREINO_MS;
    const criaturas=db.prepare(`SELECT id,xp,vinculo,criada_em AS criadaEm,treinado_ate AS treinadoAte
      FROM criaturas WHERE user_id=?`).all(userId);
    const expedicoes=db.prepare(`SELECT equipe_json,iniciada_em,colhida_em FROM expedicoes
      WHERE user_id=? AND (colhida_em IS NULL OR colhida_em>?)`).all(userId,de);
    const runs=db.prepare(`SELECT estado_json,iniciada_em,colhida_em FROM runs
      WHERE user_id=? AND (colhida_em IS NULL OR colhida_em>?)`).all(userId,de);
    const janelas=[...expedicoes.map(x=>({equipe:JSON.parse(x.equipe_json),de:x.iniciada_em,ate:x.colhida_em??agora})),
      ...runs.map(x=>({equipe:JSON.parse(x.estado_json).equipe,de:x.iniciada_em,ate:x.colhida_em??agora}))];
    const r=contaTreinoOffline({estado,criaturas,janelas,agora});
    const gravar=db.prepare('UPDATE criaturas SET xp=?,nivel=?,vinculo=?,treinado_ate=? WHERE user_id=? AND id=?');
    for(const c of r.credito)gravar.run(c.xp,c.nivel,c.vinculo,c.treinadoAte,userId,c.id);
    db.prepare(`INSERT INTO treinos_offline(user_id,estado_json) VALUES(?,?)
      ON CONFLICT(user_id) DO UPDATE SET estado_json=excluded.estado_json`).run(userId,JSON.stringify(r.estado));
    return {ganhos:r.ganhos,em:r.estado.em,janelaMaxMs:JANELA_TREINO_MS};
  });
}
