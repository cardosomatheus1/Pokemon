import {criarSuite,ok,igual} from './harness.mjs';
import {abrirBanco,migrar} from '../server/banco.mjs';
import {cadastrar} from '../server/auth.mjs';
import {emitir,receberDoCliente} from '../server/telemetria.mjs';
import {creditar} from '../server/carteira.mjs';
import {exposicaoArena,anotarArena,painelArena} from '../server/arena-metricas.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {publicarTime,ligaDaConta} from '../server/liga-equipe.mjs';
import {buscarPartida} from '../server/partida.mjs';
import {inscrever} from '../server/stake-liga.mjs';
const T=Date.UTC(2026,9,5),D=86400000;
export function suite(){const s=criarSuite('arena-metricas');
  s.teste('exposição usa seis IVs, espécies, níveis e preset sem saldo ou risco privado',()=>{
    const r=exposicaoArena({id:'s',preset:'balanced',power:100,time:[{dex:4,nivel:10,iv:[0,1,2,3,4,31]}]});
    igual(r.nivelMedio,10);igual(r.ivMedio,41/6);igual(r.especies.join(), '4');
    ok(!/saldo|rating|risco|ligad/.test(JSON.stringify(r)));
  });
  s.teste('fatos têm chave idempotente e cliente não pode declarar publicação ou crédito',()=>{
    const db=abrirBanco(':memory:');migrar(db);
    const u=cadastrar(db,{username:'metricas',email:'met@x.test',senha:'senha-bem-longa-123',nascimento:'1990-01-01',agora:T}).id;
    const a=anotarArena(db,{nome:'arena_time_publicado',userId:u,chave:'snapshot:s',campos:{snapshot:'s'},agora:T});
    igual(anotarArena(db,{nome:'arena_time_publicado',userId:u,chave:'snapshot:s',campos:{snapshot:'s'},agora:T}),a);
    igual(db.prepare("SELECT COUNT(*) n FROM telemetry_events WHERE nome='arena_time_publicado'").get().n,1);
    igual(receberDoCliente(db,{userId:u,eventos:[{nome:'arena_time_publicado',chave:'fake',campos:{}}],agora:T}).aceitos,0);
    db.close();
  });
  s.teste('painel separa stake, devolução e ganho internos da emissão; soma casa pelo ledger',()=>{
    const db=abrirBanco(':memory:');migrar(db);
    const u=cadastrar(db,{username:'financas',email:'fin@x.test',senha:'senha-bem-longa-123',nascimento:'1990-01-01',agora:T}).id;
    for(const [tipo,valor] of [['ARENA_CHAMPION_KIT',300],['LEAGUE_STAKE_RETURN',50],['LEAGUE_PAYOUT_BONUS',40]])
      creditar(db,{userId:u,tipo,bucket:'bonus',valor,idem:tipo,agora:T});
    db.prepare("INSERT INTO arena_tesouraria VALUES ('m','LEAGUE_RAKE','bonus',10,?)").run(T);
    const r=painelArena(db,{desde:T,ate:T+D});igual(r.economia.kitEmitido,300);igual(r.economia.devolucoes,50);
    igual(r.economia.ganhosInternos,40);igual(r.economia.taxaCasa,10);
    igual(painelArena(db,{desde:T+D,ate:T+2*D}).economia.kitEmitido,0);
    db.close();
  });
  s.teste('funil conta contas distintas e janela, sem esconder fila vazia',()=>{
    const db=abrirBanco(':memory:');migrar(db);
    for(const [nome,chave] of [['arena_elegibilidade_obtida','e'],['arena_time_publicado','s1'],['arena_time_publicado','s2'],['arena_busca_concluida','v']])
      emitir(db,{nome,chave,campos:{encontrou:false},agora:T});
    const r=painelArena(db,{desde:T,ate:T+D});igual(r.funil.publicacoes,2);igual(r.funil.buscasVazias,1);
    ok(!/user_id|senha/.test(JSON.stringify(r)));db.close();
  });
  s.teste('publicação, melhoria, fila vazia e liquidação nascem dos fatos reais uma vez',()=>{
    const c=cenaArena(),{db,agora,pack}=c,publica=u=>publicarTime(db,{userId:u.id,pack,preset:'balanced',agora});
    const a=publica(c.a),b=publica(c.b);ligaDaConta(db,{userId:c.a.id,pack,agora});ligaDaConta(db,{userId:c.a.id,pack,agora});
    try{buscarPartida(db,{userId:c.b.id,pack,meu:b.id,chaveIdem:'fila-vazia-001',stake:true,agora});}catch{}
    igual(db.prepare("SELECT COUNT(*) n FROM telemetry_events WHERE nome='arena_busca_concluida'").get().n,1);
    inscrever(db,{userId:c.a.id,ativo:true,agora});
    const pedido={userId:c.b.id,pack,meu:b.id,chaveIdem:'met-partida-001',stake:true,agora};
    buscarPartida(db,pedido);buscarPartida(db,pedido);
    const fatos=db.prepare("SELECT campos FROM telemetry_events WHERE nome='arena_partida_liquidada'").all();igual(fatos.length,1);
    const f=JSON.parse(fatos[0].campos);igual(f.exposicao.A.tamanho,6);ok(f.tiers.A);igual(f.pot,100);
    igual(f.taxaCasa,painelArena(db).economia.taxaCasa);
    db.prepare('UPDATE criaturas SET o_hp=31 WHERE id=?').run(c.a.criaturas[0]);publica(c.a);
    igual(db.prepare("SELECT COUNT(*) n FROM telemetry_events WHERE nome='arena_time_melhorado'").get().n,1);
    igual(db.prepare("SELECT COUNT(*) n FROM telemetry_events WHERE nome='arena_elegibilidade_obtida' AND user_id=?").get(c.a.id).n,1);
    db.close();
  });
  s.teste('falha no fato financeiro desfaz stakes, resultado e taxa juntos',()=>{
    const c=cenaArena(),{db,agora,pack}=c;
    publicarTime(db,{userId:c.a.id,pack,preset:'balanced',agora});
    const b=publicarTime(db,{userId:c.b.id,pack,preset:'balanced',agora});inscrever(db,{userId:c.a.id,ativo:true,agora});
    const antes=db.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n;
    db.exec("CREATE TRIGGER falha_fato BEFORE INSERT ON telemetry_events WHEN NEW.nome='arena_partida_liquidada' BEGIN SELECT RAISE(ABORT,'fato indisponível'); END");
    let erro;try{buscarPartida(db,{userId:c.b.id,pack,meu:b.id,chaveIdem:'met-rollback-01',stake:true,agora});}catch(e){erro=e;}
    ok(erro);igual(db.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,antes);
    igual(db.prepare('SELECT COUNT(*) n FROM league_matches').get().n,0);igual(painelArena(db).economia.taxaCasa,0);db.close();
  });
  s.teste('retenção observa D1/D7 completos; metagame exclui amistosos e usa indivíduo',()=>{
    const {db,a,b,agora}=cenaArena(),D=86400000;
    const x={preset:'balanced',especies:[1,4],nivelMedio:30,ivMedio:15,niveis:[20,40],ivs:[Array(6).fill(0),Array(6).fill(30)]};
    for(const [d,modo,contou] of [[0,'ranqueada',true],[1,'ranqueada',true],[7,'ranqueada',true],[8,'amistoso',false]])
      anotarArena(db,{nome:'arena_partida_liquidada',userId:a.id,chave:`retencao:${d}`,campos:{lados:[a.id,b.id],modo,contou,vencedor:'A',tiers:{A:'Bronze',B:'Bronze'},exposicao:{A:x,B:x}},agora:agora+d*D});
    const r=painelArena(db,{desde:agora-12*3600000,ate:agora+9*D});igual(r.retencao.coorteCompleta7dias,2);igual(r.retencao.retornoDia1,2);igual(r.retencao.retornoDia7,2);
    igual(r.metagame[0].exposicoes,6);igual(r.metagame[0].nivelMedio,20);igual(r.metagame[0].ivMedio,0);igual(r.metagame[1].nivelMedio,40);igual(r.metagame[1].ivMedio,30);
    igual(painelArena(db,{ate:agora+6*D}).retencao.coorteCompleta7dias,0);db.close();
  });
  return s;
}
