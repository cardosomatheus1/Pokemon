import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, desmigrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { buscarPartida, criarPartida, partidaDe } from '../server/partida.mjs';
import { inscrever, defesaDaConta } from '../server/stake-liga.mjs';
import { saldos, creditar, gastar } from '../server/carteira.mjs';
import { saldoCasaArena, pagarCampanhaArena } from '../server/tesouraria-arena.mjs';
import { rankingDaLiga, publicarTime } from '../server/liga-equipe.mjs';
import { acessoArena, parCompativel } from '../engine/arena-treinadores.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { conteudoDaLuta } from '../app/modules/snapshot-dados.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';
import { lutarNaConta, jornadaDaConta } from '../server/jornada.mjs';
import { avaliarPareamento } from '../app/modules/pareamento-competitivo.mjs';

const T = Date.UTC(2026, 9, 4, 9), raiz = '1234567890abcdef1234567890abcdef';
const erro = fn => { try { fn(); return null; } catch (e) { return e; } };
const completo = { vencidos: PACK.jornada.map(n => n.id), insignias: [] };
function cena(banco=null,dexes=[6,9,3,149,143,65]) {
  const db = banco ?? abrirBanco(':memory:'); migrar(db);
  const usuario = n => cadastrar(db, { username: n, email: `${n}@arena.test`, senha: 'uma-senha-muito-longa', nascimento: '1990-01-01', agora: T }).id;
  const [a, b] = ['arenat0', 'arenat1'].map(usuario);
  const time = dono => {
    db.prepare('INSERT INTO jornadas (user_id, progresso_json, revisao, atualizada_em) VALUES (?, ?, 0, ?)').run(dono, JSON.stringify(completo), T);
    creditar(db, { userId: dono, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 500, idem: `teste-${dono}`, agora: T });
    const ids = dexes.map(dex => {
      const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
      db.prepare(`UPDATE criaturas SET xp=?, nivel=60, natureza='Hardy', o_hp=15, o_atq=15, o_def=15, o_spa=15, o_spd=15, o_vel=15 WHERE id=?`).run(xpParaNivel(60), c.id);
      return c.id;
    });
    return criarSnapshot(db, { userId: dono, pack: PACK, ids, agora: T });
  };
  return { db, a, b, sa: time(a), sb: time(b), adicionar:n=>{const user=usuario(n);return {user,snapshot:time(user)};} };
}
const jogar = (c, chave='arena-teste-0001', agora=T) => buscarPartida(c.db, { userId: c.b, meu: c.sb.id, chaveIdem: chave, stake: true, agora, raiz });

export function suite() {
  const s = criarSuite('arena-treinadores');
  s.teste('acesso exige jornada inteira, seis indivíduos e espécies distintas', () => {
    const t = [1,2,3,4,5,6].map(dex => ({ id: `c${dex}`, dex }));
    ok(acessoArena(PACK, completo, t).ok);
    ok(!acessoArena(PACK, { vencidos: [PACK.jornada.at(-1).id] }, t).ok);
    ok(!acessoArena(PACK, completo, t.slice(0,5)).ok);
    ok(!acessoArena(PACK, completo, [...t.slice(0,5), {...t[5], dex:1}]).ok);
  });
  s.teste('pareamento é simétrico e corta rating, power e níveis concentrados', () => {
    const a = { power:1000, time:Array.from({length:6},()=>({nivel:60})) };
    const b = { power:1050, time:Array.from({length:6},()=>({nivel:61})) };
    ok(parCompativel(a,b,1000,1150) && parCompativel(b,a,1150,1000));
    ok(!parCompativel(a,{...b,power:1051},1000,1000));
    ok(!parCompativel(a,b,1000,1151));
    ok(!parCompativel(a,{...b,time:[55,61,61,61,61,61].map(nivel=>({nivel}))},1000,1000));
    ok(!parCompativel(a,b,NaN,1000));
  });
  s.teste('Bronze 50 por lado, casa 10 e vencedor 90; reenvio não repaga', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    const antes=saldos(c.db,c.a).bonus+saldos(c.db,c.b).bonus;
    const p=jogar(c); ok(p.rated && p.modo==='ranqueada'); igual(p.stake.valor,50); igual(p.stake.rake,10);
    igual(saldos(c.db,c.a).bonus+saldos(c.db,c.b).bonus+saldoCasaArena(c.db).bonus,antes);
    igual(saldoCasaArena(c.db).bonus,10); igual(defesaDaConta(c.db,c.a,T).orcamento,100);
    igual(jogar(c).id,p.id); igual(saldoCasaArena(c.db).bonus,10);
    igual(partidaDe(c.db,p.id).modo,'ranqueada'); c.db.close();
  });
  s.teste('fila com aposta usa o tier confirmado e pula defensor sem saldo',()=>{
    const c=cena();inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    gastar(c.db,{userId:c.a,tipo:'COSMETIC_PURCHASE',deltas:{bonus:-saldos(c.db,c.a).bonus},idem:'teste-sem-saldo',agora:T});
    const outro=c.adicionar('arenab3');inscrever(c.db,{userId:outro.user,ativo:true,agora:T});
    c.db.prepare('INSERT INTO liga_mmr(user_id,rating,partidas,atualizado_em) VALUES(?,1020,0,?)').run(outro.user,T);
    const p=jogar(c);igual(p.stake.valor,50);igual(p.defensor,outro.snapshot.id);c.db.close();
  });
  s.teste('tiers diferentes não cobram o valor divergente do consentimento',()=>{
    const c=cena();
    c.db.prepare('INSERT INTO liga_mmr(user_id,rating,partidas,atualizado_em) VALUES(?,1100,0,?)').run(c.a,T);
    inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    igual(erro(()=>jogar(c)).codigo,'STAKE_SEM_ADVERSARIO');igual(saldoCasaArena(c.db).bonus,0);c.db.close();
  });
  s.teste('power igual não deixa passar confronto com vantagem extrema de IV',()=>{
    const c=cena(null,[18,26,34,59,103,134]);
    c.db.prepare('UPDATE criaturas SET o_hp=31,o_atq=31,o_def=31,o_spa=31,o_spd=31,o_vel=31 WHERE user_id=?').run(c.a);
    const a=criarSnapshot(c.db,{userId:c.a,pack:PACK,ids:c.sa.time.map(x=>x.id),agora:T+1});
    ok(parCompativel(a,c.sb,1000,1000));inscrever(c.db,{userId:c.a,ativo:true,agora:T+2});
    igual(erro(()=>jogar(c,'iv-forte-0001',T+3)).codigo,'STAKE_SEM_ADVERSARIO');
    igual(saldoCasaArena(c.db).bonus,0);c.db.close();
  });
  s.teste('estimativa é simétrica e republicar os mesmos atributos não troca a amostra',()=>{
    const c=cena(),a=avaliarPareamento(PACK,c.sa,c.sb),b=avaliarPareamento(PACK,c.sb,c.sa);
    ok(a.ok&&b.ok);ok(Math.abs(a.p+b.p-1)<1e-12);igual(a.lutas,256);
    const republicado={...c.sa,id:'outra-publicacao',time:c.sa.time.map((x,i)=>({...x,id:`novo-id-${i}`}))};
    igual(JSON.stringify(avaliarPareamento(PACK,republicado,c.sb)),JSON.stringify(a));c.db.close();
  });
  s.teste('amistoso não cobra, não dá MMR nem LP; cliente não escolhe ranqueada', () => {
    const c=cena(); const p=criarPartida(c.db,{userId:c.b,meu:c.sb.id,adversario:c.sa.id,chaveIdem:'amistoso-0001',agora:T,raiz});
    ok(!p.rated && p.modo==='amistoso'); igual(c.db.prepare('SELECT COUNT(*) AS n FROM liga_mmr_eventos').get().n,0);
    igual(c.db.prepare('SELECT COUNT(*) AS n FROM liga_stakes').get().n,0);
    ok(erro(()=>c.db.prepare("UPDATE arena_partidas SET modo='ranqueada'").run()));
    igual(erro(()=>criarPartida(c.db,{userId:c.b,meu:c.sb.id,adversario:c.sa.id,chaveIdem:'forjado-0001',stake:true,agora:T})).codigo,'ARENA_USAR_FILA'); c.db.close();
  });
  s.teste('sem campeão e sem consentimento ninguém perde saldo', () => {
    const c=cena(); const antes=JSON.stringify(saldos(c.db,c.b));
    igual(erro(()=>jogar(c)).codigo,'STAKE_SEM_ADVERSARIO');
    c.db.prepare('UPDATE jornadas SET progresso_json=? WHERE user_id=?').run('{}',c.a);
    igual(erro(()=>inscrever(c.db,{userId:c.a,ativo:true,agora:T})).codigo,'ARENA_BLOQUEADA');
    igual(JSON.stringify(saldos(c.db,c.b)),antes); c.db.close();
  });
  s.teste('consentimento expira, acaba por número/orçamento e não se renova com publicação', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    ok(defesaDaConta(c.db,c.a,T).ativo); ok(!defesaDaConta(c.db,c.a,T+86400000).ativo);
    c.db.prepare('UPDATE arena_defesas SET restantes=0 WHERE user_id=?').run(c.a);
    igual(erro(()=>jogar(c)).codigo,'STAKE_SEM_ADVERSARIO');
    inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    criarSnapshot(c.db,{userId:c.a,pack:PACK,ids:c.sa.time.map(x=>x.id),agora:T+1});
    ok(!defesaDaConta(c.db,c.a,T+2).ativo); c.db.close();
  });
  s.teste('falha na tesouraria desfaz saldo, partida, ranking e consumo da defesa', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    const antes=JSON.stringify([saldos(c.db,c.a),saldos(c.db,c.b),defesaDaConta(c.db,c.a,T)]);
    c.db.exec("CREATE TRIGGER teste_falha BEFORE INSERT ON arena_tesouraria BEGIN SELECT RAISE(ABORT, 'falha planejada'); END");
    ok(erro(()=>jogar(c))); igual(c.db.prepare('SELECT COUNT(*) AS n FROM league_matches').get().n,0);
    igual(JSON.stringify([saldos(c.db,c.a),saldos(c.db,c.b),defesaDaConta(c.db,c.a,T)]),antes); c.db.close();
  });
  s.teste('campanha usa saldo real da casa e orçamento; resgate repetido é idempotente', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T}); jogar(c);
    const args={campanha:'marketing-0001',userId:c.b,valor:3,teto:3,agora:T};
    igual(pagarCampanhaArena(c.db,args).pago,3); igual(saldoCasaArena(c.db).bonus,7);
    ok(pagarCampanhaArena(c.db,args).repetida);
    ok(/orçamento/.test(erro(()=>pagarCampanhaArena(c.db,{...args,userId:c.a}))?.message??'')); igual(saldoCasaArena(c.db).bonus,7); c.db.close();
  });
  s.teste('orçamentos de campanhas com underscore não se confundem', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T}); jogar(c);
    igual(pagarCampanhaArena(c.db,{campanha:'marketing-0001',userId:c.a,valor:3,teto:3,agora:T}).pago,3);
    const args={campanha:'marketing_0001',userId:c.b,valor:3,teto:3,agora:T};
    igual(pagarCampanhaArena(c.db,args).pago,3);
    ok(/orçamento/.test(erro(()=>pagarCampanhaArena(c.db,{...args,userId:c.a}))?.message??''));
    igual(saldoCasaArena(c.db).bonus,4);c.db.close();
  });
  s.teste('migração é aditiva e reversível preservando a carteira', () => {
    const c=cena(), antes=JSON.stringify(saldos(c.db,c.a));
    desmigrar(c.db,MIGRACOES.length-1); migrar(c.db); igual(JSON.stringify(saldos(c.db,c.a)),antes); c.db.close();
  });
  s.teste('ranking atual não reaproveita atividade de temporada anterior', () => {
    const c=cena(); inscrever(c.db,{userId:c.a,ativo:true,agora:T}); jogar(c);
    igual(rankingDaLiga(c.db,{userId:c.b,agora:T}).total,2);
    igual(rankingDaLiga(c.db,{userId:c.b,agora:T+28*86400000}).total,0); c.db.close();
  });
  s.teste('kit de 300 PC-B é único mesmo republicando; não vira taxa ou PC-T',()=>{
    const c=cena(), antes=saldos(c.db,c.a);
    publicarTime(c.db,{userId:c.a,agora:T+1,preset:'balanced'});
    igual(saldos(c.db,c.a).bonus,antes.bonus+300);
    publicarTime(c.db,{userId:c.a,agora:T+2,preset:'balanced'});
    igual(saldos(c.db,c.a).bonus,antes.bonus+300); igual(saldos(c.db,c.a).transferivel,antes.transferivel);
    igual(saldoCasaArena(c.db).bonus,0); c.db.close();
  });
  s.teste('vitória real no campeão credita kit junto da Jornada; reenvio e repetição não repagam',()=>{
    const c=cena(),ultimo=PACK.jornada.at(-1).id;
    c.db.prepare('UPDATE jornadas SET progresso_json=? WHERE user_id=?').run(JSON.stringify({...completo,vencidos:completo.vencidos.filter(id=>id!==ultimo)}),c.b);
    c.db.prepare('UPDATE criaturas SET xp=? WHERE user_id=?').run(xpParaNivel(100),c.b);
    const antes=saldos(c.db,c.b).bonus;
    const args={userId:c.b,pack:PACK,id:ultimo,chaveIdem:'campeao-real-0001',agora:T,semente:231};
    const r=lutarNaConta(c.db,args);ok(r.venceu&&r.primeiraVez);igual(saldos(c.db,c.b).bonus,antes+300);
    ok(jornadaDaConta(c.db,c.b).jornada.vencidos.includes(ultimo));
    ok(lutarNaConta(c.db,{...args,agora:T+1}).repetido);
    lutarNaConta(c.db,{...args,chaveIdem:'campeao-real-0002',agora:T+30000});
    igual(saldos(c.db,c.b).bonus,antes+300);c.db.close();
  });
  s.teste('limite de XP repetível chega à criatura e persiste no banco sem repagar retry',()=>{
    const c=cena();
    const agora=T+1000,args={userId:c.b,pack:PACK,id:PACK.jornada[0].id,agora,semente:34};
    const xp=()=>c.db.prepare('SELECT SUM(xp) AS n FROM criaturas WHERE user_id=?').get(c.b).n;
    const antes=xp();
    const a=lutarNaConta(c.db,{...args,chaveIdem:'xp-real-0001'});ok(a.venceu);ok(xp()>antes);const pago=xp();
    const b=lutarNaConta(c.db,{...args,chaveIdem:'xp-real-0002',agora:agora+1});igual(xp(),pago);
    igual(Object.values(b.recompensa.xp).reduce((n,x)=>n+x,0),0);
    const j=jornadaDaConta(c.db,c.b).jornada;j.xpRepeticao.pago=5999;
    c.db.prepare('UPDATE jornadas SET progresso_json=? WHERE user_id=?').run(JSON.stringify(j),c.b);
    const r=lutarNaConta(c.db,{...args,chaveIdem:'xp-real-0003',agora:agora+30000});
    ok(xp()-pago<=1);ok(jornadaDaConta(c.db,c.b).jornada.xpRepeticao.pago<=6000);
    ok(lutarNaConta(c.db,{...args,chaveIdem:'xp-real-0003',agora:agora+60000}).repetido);igual(xp(),pago);
    c.db.close();
  });
  s.teste('naturezas também fazem parte da versão do conteúdo do combate',()=>{
    const alterado={...PACK,naturezas:PACK.naturezas.map((n,i)=>i===0?[n[0],'atq','vel']:n)};
    ok(conteudoDaLuta(PACK)!==conteudoDaLuta(alterado));
  });
  s.teste('três defesas reais consomem autorização bruta; ganhar não libera uma quarta',()=>{
    const c=cena();inscrever(c.db,{userId:c.a,ativo:true,agora:T});
    for(let k=0;k<4;k++){
      const user=cadastrar(c.db,{username:`defr${k}`,email:`defr${k}@arena.test`,senha:'uma-senha-muito-longa',nascimento:'1990-01-01',agora:T}).id;
      c.db.prepare('INSERT INTO jornadas(user_id,progresso_json,revisao,atualizada_em) VALUES(?,?,0,?)').run(user,JSON.stringify(completo),T);
      creditar(c.db,{userId:user,tipo:'DAILY_REWARD',bucket:'bonus',valor:500,idem:`defr:${user}`,agora:T});
      const ids=[6,9,3,149,143,65].map(dex=>{const m=gerar(c.db,{userId:user,pack:PACK,dex,origem:'captura'});
        c.db.prepare("UPDATE criaturas SET xp=?,natureza='Hardy',o_hp=15,o_atq=15,o_def=15,o_spa=15,o_spd=15,o_vel=15 WHERE id=?").run(xpParaNivel(60),m.id);return m.id;});
      const snap=criarSnapshot(c.db,{userId:user,pack:PACK,ids,agora:T});
      const lutar=()=>buscarPartida(c.db,{userId:user,meu:snap.id,chaveIdem:`defesa-real-${k}`,stake:true,agora:T,raiz});
      if(k<3)ok(lutar().rated);else igual(erro(lutar).codigo,'STAKE_SEM_ADVERSARIO');
    }
    igual(defesaDaConta(c.db,c.a,T).orcamento,0);igual(defesaDaConta(c.db,c.a,T).restantes,0);c.db.close();
  });
  s.teste('publicação invalida consentimento e os eventos de resultado não duplicam no reenvio',()=>{
    const c=cena();inscrever(c.db,{userId:c.a,ativo:true,agora:T});const p=jogar(c);jogar(c);
    igual(c.db.prepare("SELECT COUNT(*) AS n FROM telemetry_events WHERE nome='arena_partida_concluida'").get().n,1);
    igual(c.db.prepare("SELECT COUNT(*) AS n FROM telemetry_events WHERE nome='arena_busca_iniciada'").get().n,1);
    ok(p.rated);c.db.close();
  });
  s.teste('HTTP ignora vencedor e raiz do cliente; só a fila cobra e ranqueia',async()=>{
    const srv=criarServidor({config:{ambiente:'teste',silencioso:true},banco:':memory:',sims:20,laco:false,relogio:()=>T});
    const c=cena(srv.db),porta=await srv.ouvir(0),url=r=>`http://127.0.0.1:${porta}${r}`;
    try{
      inscrever(c.db,{userId:c.a,ativo:true,agora:T});
      const login=await fetch(url('/api/auth/entrar'),{method:'POST',headers:{[CABECALHO_VERSAO]:API_VERSAO,'content-type':'application/json'},body:JSON.stringify({email:'arenat1@arena.test',senha:'uma-senha-muito-longa'})}).then(r=>r.json());
      const headers={[CABECALHO_VERSAO]:API_VERSAO,'content-type':'application/json',authorization:`Bearer ${login.sessao}`};
      const post=(r,body)=>fetch(url(r),{method:'POST',headers,body:JSON.stringify(body)});
      const forjado=await post('/api/equipe/partida',{meu:c.sb.id,adversario:c.sa.id,stake:true,chaveIdem:'http-forja-0001'});
      igual(forjado.status,400);igual(c.db.prepare('SELECT COUNT(*) AS n FROM liga_stakes').get().n,0);
      const corpo={meu:c.sb.id,stake:true,chaveIdem:'http-arena-0001',vencedor:'inventado',raiz:'00000000000000000000000000000000'};
      const p=(await(await post('/api/equipe/buscar',corpo)).json()).partida;
      ok(p.rated && p.stake.valor===50 && ['A','B','empate'].includes(p.vencedor));ok(p.raiz!==corpo.raiz);
      igual((await(await post('/api/equipe/buscar',corpo)).json()).partida.id,p.id);
      igual(saldoCasaArena(c.db).bonus,10);
    }finally{await srv.fechar();}
  });
  return s;
}
