import {criarSuite,ok,igual} from './harness.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {criarOperador} from '../server/admin.mjs';
import {criarCampanhaArena,resgatarArena,recompensasArena} from '../server/arena-recompensas.mjs';
import {registrarMissao} from '../server/missoes-treinador.mjs';
import {creditarTaxaCasa,pagarCampanhaArena,saldoCasaArena} from '../server/tesouraria-arena.mjs';
import {pcTElegivel} from '../server/carteira.mjs';
import {publicarTime} from '../server/liga-equipe.mjs';
import {buscarPartida} from '../server/partida.mjs';
import {inscrever} from '../server/stake-liga.mjs';
import {ligarContas} from '../server/protecao.mjs';
const D=86400000;
export function suite(){const s=criarSuite('arena-recompensas');
  const cena=()=>{const c=cenaArena();c.op=criarOperador(c.db,{email:'fin@x.test',papel:'dono',agora:c.agora});c.inicio=c.agora-12*3600000;return c;};
  const criar=(c,tipo='bonus',extra={})=>criarCampanhaArena(c.db,{operadorId:c.op.id,motivo:'piloto interno simulado',confirmado:true,agora:c.agora,config:{id:tipo==='bonus'?'pilotobonus':'pilotoearned',tipo,inicio:c.inicio,coorte:[c.a.id,c.b.id],...extra}});
  s.teste('campanha precisa de verba, reserva todas as vagas e não aceita editar a coorte',()=>{
    const c=cena();let e;try{criar(c);}catch(x){e=x;}ok(e);
    creditarTaxaCasa(c.db,{id:'receita-teste',rake:740,composicao:{bonus:740},agora:c.agora});criar(c);
    igual(saldoCasaArena(c.db).bonus,740);
    e=null;try{pagarCampanhaArena(c.db,{campanha:'campanhaextra',userId:c.a.id,valor:1,teto:1,agora:c.agora});}catch(x){e=x;}ok(e,'verba da coorte foi gasta por outra campanha');
    e=null;try{criar(c,'bonus',{coorte:[c.a.id]});}catch(x){e=x;}ok(e);c.db.close();
  });
  s.teste('daily exige preparação persistida, não duplica e debita casa na mesma transação',()=>{
    const c=cena();creditarTaxaCasa(c.db,{id:'receita-teste',rake:740,composicao:{bonus:740},agora:c.agora});criar(c);
    const p={userId:c.a.id,campanha:'pilotobonus',tipo:'preparacao',agora:c.agora};
    let e;try{resgatarArena(c.db,p);}catch(x){e=x;}ok(e);
    registrarMissao(c.db,{userId:c.a.id,tipo:'treinar',chave:'xp-real',agora:c.agora});
    igual(resgatarArena(c.db,p).pago,50);ok(resgatarArena(c.db,p).repetida);
    igual(saldoCasaArena(c.db).bonus,690);igual(recompensasArena(c.db,p)[0].diario.disponivel,false);
    e=null;try{resgatarArena(c.db,{...p,tipo:'competitivo'});}catch(x){e=x;}ok(e);
    e=null;try{resgatarArena(c.db,{...p,agora:c.inicio+7*D});}catch(x){e=x;}ok(e);c.db.close();
  });
  s.teste('falha ao conceder bônus preserva verba e não grava metade do resgate',()=>{
    const c=cena();creditarTaxaCasa(c.db,{id:'receita-teste',rake:740,composicao:{bonus:740},agora:c.agora});criar(c);
    registrarMissao(c.db,{userId:c.a.id,tipo:'treinar',chave:'xp-real',agora:c.agora});
    c.db.exec("CREATE TRIGGER falha_promo BEFORE INSERT ON wallet_ledger WHEN NEW.reference_type='arena_campanha' BEGIN SELECT RAISE(ABORT,'teste de queda'); END");
    let e;try{resgatarArena(c.db,{userId:c.a.id,campanha:'pilotobonus',tipo:'preparacao',agora:c.agora});}catch(x){e=x;}
    ok(e);igual(saldoCasaArena(c.db).bonus,740);c.db.close();
  });
  s.teste('PC-T é dotação earned separada: bônus não financia, conta imatura não resgata, e origem não é saldo elegível automático',()=>{
    const c=cena();let e;try{criar(c,'earned');}catch(x){e=x;}ok(e);
    criar(c,'earned',{dotacaoRef:'piloto-interno-aporte-001',dotacao:100});
    const r=recompensasArena(c.db,{userId:c.a.id,agora:c.agora}).find(x=>x.tipo==='earned');ok(!r.semanal.disponivel);
    igual(pcTElegivel(c.db,c.a.id,c.agora),0);c.db.close();
  });
  s.teste('semana real: três rivais em dois dias liberam earned uma vez; amistoso e conta ligada não contam',()=>{
    const c=cena(),{db,pack,agora}=c;
    db.prepare('UPDATE users SET created_at=? WHERE id=?').run(agora-8*D,c.b.id);
    criar(c,'earned',{dotacaoRef:'piloto-interno-aporte-002',dotacao:100});
    const b=publicarTime(db,{userId:c.b.id,pack,preset:'balanced',agora});
    const rivais=[c.a,c.novaConta('rivalx'),c.novaConta('rivaly')];
    for(let i=0;i<3;i++){
      const t=agora+(i===2?D:0),u=rivais[i];
      publicarTime(db,{userId:u.id,pack,preset:'balanced',agora:t});inscrever(db,{userId:u.id,ativo:true,agora:t});
      buscarPartida(db,{userId:c.b.id,pack,meu:b.id,chaveIdem:`earned-real-${i}`,stake:true,agora:t});
      inscrever(db,{userId:u.id,ativo:false,agora:t});
    }
    const p={userId:c.b.id,campanha:'pilotoearned',tipo:'competitivo',agora:agora+D};
    db.prepare('UPDATE users SET created_at=? WHERE id=?').run(agora,c.b.id);
    let imatura;try{resgatarArena(db,p);}catch(e){imatura=e;}ok(imatura,'PC-T antes dos sete dias');
    db.prepare('UPDATE users SET created_at=? WHERE id=?').run(agora-8*D,c.b.id);
    igual(resgatarArena(db,p).pago,50);ok(resgatarArena(db,p).repetida);igual(pcTElegivel(db,c.b.id,agora+D),50);
    igual(db.prepare("SELECT SUM(amount) n FROM wallet_ledger WHERE type='ARENA_EARNED_REWARD'").get().n,50);
    ligarContas(db,{userId:c.a.id,outroId:c.b.id,sinal:'teste',agora});
    let e;try{resgatarArena(db,p);}catch(x){e=x;}ok(e);db.close();
  });
  s.teste('preparação limita campanha a 270, semanal a 100 e não sobrepõe coortes',()=>{
    const c=cena(),{db,agora}=c;creditarTaxaCasa(db,{id:'receita-teste',rake:1480,composicao:{bonus:1480},agora});criar(c);
    let e;try{criar(c,'bonus',{id:'pilotosegundo'});}catch(x){e=x;}ok(e);
    let total=0;for(let d=0;d<7;d++){const t=agora+d*D;registrarMissao(db,{userId:c.a.id,tipo:'explorar',chave:`exp-real-${d}`,agora:t});
      try{total+=resgatarArena(db,{userId:c.a.id,campanha:'pilotobonus',tipo:'preparacao',agora:t}).pago;}catch{}
    }
    igual(total,270);igual(saldoCasaArena(db).bonus,1210);db.close();
  });
  s.teste('erro no fato da recompensa desfaz crédito e taxa mesmo depois de pagar',()=>{
    const c=cena(),{db,agora}=c;creditarTaxaCasa(db,{id:'verba-rollback-fato',rake:740,composicao:{bonus:740},agora});criar(c);
    registrarMissao(db,{userId:c.a.id,tipo:'treinar',chave:'fato-rollback',agora});
    db.exec("CREATE TRIGGER falha_premio BEFORE INSERT ON telemetry_events WHEN NEW.nome='arena_recompensa_concedida' BEGIN SELECT RAISE(ABORT,'sem fato'); END");
    let e;try{resgatarArena(db,{userId:c.a.id,campanha:'pilotobonus',tipo:'preparacao',agora});}catch(x){e=x;}ok(e);
    igual(saldoCasaArena(db).bonus,740);igual(db.prepare("SELECT COUNT(*) n FROM wallet_ledger WHERE reference_type='arena_campanha'").get().n,0);db.close();
  });return s;
}
