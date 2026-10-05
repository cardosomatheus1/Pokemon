/* Histórico mínimo de atividade para testes da consulta de ranking. Os
   ratings importados são definidos pela cena; não simula o pareamento atual. */
import PACK from '../../content/escolhido.mjs';
import { gerar } from '../../server/criaturas.mjs';
import { criarSnapshot } from '../../server/equipe.mjs';
export function registrarAtividade(db, user, outro, quantas, agora) {
  const snap = dono => criarSnapshot(db,{userId:dono,pack:PACK,agora,ids:[gerar(db,{userId:dono,pack:PACK,dex:1,origem:'captura'}).id]});
  const a=snap(user),b=snap(outro);
  for(let k=0;k<quantas;k++) {
    const id=`ranking-fixture-${user}-${k}`;
    db.prepare(`INSERT INTO league_matches (id,idem_key,snap_a,snap_b,user_a,user_b,raiz,sal,commit_hash,semente,
      versao_motor,versao_conteudo,vencedor,turnos,log_json,criada_em) VALUES (?,?,?,?,?,?,'r','s','c',1,?,?,'empate',1,'[]',?)`)
      .run(id,id,a.id,b.id,user,outro,a.versaoMotor,a.versaoConteudo,agora);
    db.prepare('INSERT INTO liga_mmr_eventos (partida_id,user_a,user_b,antes_a,antes_b,delta,criado_em) VALUES (?,?,?,1000,1000,0,?)').run(id,user,outro,agora);
  }
}
