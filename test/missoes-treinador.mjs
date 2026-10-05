import {criarSuite,ok,igual} from './harness.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {registrarMissao} from '../server/missoes-treinador.mjs';
import {desafiosDe,registrarFeito} from '../server/progressao.mjs';
import {treinarOffline} from '../server/treino-offline.mjs';
export function suite(){const s=criarSuite('missoes-treinador');
  s.teste('treinador recebe três objetivos sem aposta; fatos reais e repetição pagam só um marco semanal',()=>{
    const {db,a,agora}=cenaArena();
    igual(desafiosDe(db,{userId:a.id,agora}).map(x=>x.tipo).sort().join(','),'explorar,jornada,treinar');
    igual(registrarFeito(db,{userId:a.id,tipo:'explorar',agora}).find(x=>x.tipo==='explorar').progresso,0);
    for(let d=0;d<4;d++){
      const t=agora+d*86400000;
      for(const tipo of ['explorar','treinar','jornada'])registrarMissao(db,{userId:a.id,tipo,chave:`${tipo}:${d}`,agora:t});
      const r=desafiosDe(db,{userId:a.id,agora:t});ok(r.every(x=>x.concluido_em!=null));
      desafiosDe(db,{userId:a.id,agora:t});
    }
    igual(db.prepare("SELECT SUM(amount) AS n FROM wallet_ledger WHERE user_id=? AND type='CHALLENGE_REWARD'").get(a.id).n,30);
    registrarMissao(db,{userId:a.id,tipo:'explorar',chave:'explorar:0',agora:agora+4*86400000});
    igual(desafiosDe(db,{userId:a.id,agora:agora+4*86400000}).find(x=>x.tipo==='explorar').progresso,0);
    db.close();
  });
  s.teste('offline só conclui missão quando houve crédito positivo, e primeiro acesso/reenvio não fabricam XP',()=>{
    const {db,a,pack,agora}=cenaArena();
    treinarOffline(db,{userId:a.id,pack,agora});
    igual(desafiosDe(db,{userId:a.id,agora}).find(x=>x.tipo==='treinar').progresso,0);
    const depois=agora+3600000;
    ok(treinarOffline(db,{userId:a.id,pack,agora:depois}).ganhos.some(x=>x.xp>0));
    treinarOffline(db,{userId:a.id,pack,agora:depois});
    igual(desafiosDe(db,{userId:a.id,agora:depois}).find(x=>x.tipo==='treinar').progresso,1);
    igual(db.prepare("SELECT COUNT(*) n FROM treinador_fatos WHERE user_id=? AND tipo='treinar'").get(a.id).n,1);db.close();
  });return s;
}
