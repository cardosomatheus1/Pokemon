/* A recompensa precisa estar na rota autenticada, além de funcionar no domínio. */
import {criarSuite,igual,ok} from './harness.mjs';
import {criarServidor} from '../server/servidor.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {API_VERSAO,CABECALHO_VERSAO} from '../server/contrato.mjs';
import {definirCredencial,entrarOperador,segredoTotp,codigoTotp} from '../server/admin-auth.mjs';
import {criarOperador} from '../server/admin.mjs';
import {criarCampanhaArena} from '../server/arena-recompensas.mjs';
import {creditarTaxaCasa} from '../server/tesouraria-arena.mjs';
import {registrarMissao} from '../server/missoes-treinador.mjs';
export function suite(){const s=criarSuite('arena-rotas');
  s.teste('HTTP exige sessão, ignora valor e conta forjados e não duplica o pagamento',async()=>{
    const agora=Date.UTC(2026,9,5,12),srv=criarServidor({config:{ambiente:'teste',silencioso:true},sims:64,laco:false,relogio:()=>agora});
    const c=cenaArena({banco:srv.db}),base=`http://127.0.0.1:${await srv.ouvir(0)}`;
    const pedir=async(path,body,token)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',[CABECALHO_VERSAO]:API_VERSAO,...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,corpo:await r.json()};};
    try{
      igual((await pedir('/api/equipe/recompensas')).status,401);
      igual((await pedir('/api/equipe/recompensas/resgatar',{campanha:'rotasbonus',tipo:'preparacao'})).status,401);
      const token=(await pedir('/api/auth/entrar',{email:'atual1@x.test',senha:'senha-bem-longa-123'})).corpo.sessao;ok(token);
      igual((await pedir('/api/equipe/recompensas',null,token)).status,200);
      creditarTaxaCasa(srv.db,{id:'rotas-verba',rake:1000,composicao:{bonus:1000},agora});
      const op=criarOperador(srv.db,{email:'rotas@teste.test',papel:'dono',agora});
      criarCampanhaArena(srv.db,{operadorId:op.id,motivo:'fixture HTTP',confirmado:true,agora,config:{id:'rotasbonus',tipo:'bonus',inicio:agora-12*3600000,coorte:[c.b.id]}});
      registrarMissao(srv.db,{userId:c.b.id,tipo:'treinar',chave:'rota-fato',agora});
      igual((await pedir('/api/equipe/recompensas',null,token)).corpo.campanhas.length,1);
      const body={campanha:'rotasbonus',tipo:'preparacao',userId:c.a.id,valor:99999,bucket:'transferivel'};
      const pago=await pedir('/api/equipe/recompensas/resgatar',body,token);igual(pago.status,200);igual(pago.corpo.pago,50);
      igual((await pedir('/api/equipe/recompensas/resgatar',body,token)).corpo.pago,0);
      igual(srv.db.prepare("SELECT COUNT(*) n FROM wallet_ledger WHERE reference_type='arena_campanha' AND user_id=?").get(c.a.id).n,0);
      igual(srv.db.prepare("SELECT SUM(amount) n FROM wallet_ledger WHERE reference_type='arena_campanha' AND user_id=?").get(c.b.id).n,50);
    }finally{await srv.fechar();}
  });
  s.teste('campanha HTTP só aceita sessão de dono com confirmação, motivo e verba',async()=>{
    const agora=Date.UTC(2026,9,5,12),srv=criarServidor({config:{ambiente:'teste',silencioso:true},sims:64,laco:false,relogio:()=>agora});
    const c=cenaArena({banco:srv.db}),base=`http://127.0.0.1:${await srv.ouvir(0)}`;
    const pedir=async(body,token)=>{const r=await fetch(base+'/api/admin/arena-campanha',{method:'POST',headers:{'content-type':'application/json',[CABECALHO_VERSAO]:API_VERSAO,...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});return {status:r.status,corpo:await r.json()};};
    const sessao=papel=>{const email=`${papel}@admin.test`,op=criarOperador(srv.db,{email,papel,agora}),seg=segredoTotp(),senha='senha-operador-bem-longa-123';definirCredencial(srv.db,{operadorId:op.id,senha,segredoTotp:seg,agora});return entrarOperador(srv.db,{email,senha,codigo:codigoTotp(seg,agora),agora}).token;};
    try{
      const body={config:{id:'adminbonus',tipo:'bonus',inicio:agora-12*3600000,coorte:[c.b.id]},motivo:'fixture HTTP admin',confirmado:true};
      igual((await pedir(body)).status,401);igual((await pedir(body,sessao('economia'))).status,403);
      const dono=sessao('dono');igual((await pedir({...body,confirmado:false},dono)).status,400);
      igual((await pedir({...body,motivo:''},dono)).status,400);igual((await pedir(body,dono)).status,400);
      creditarTaxaCasa(srv.db,{id:'verba-admin-http',rake:370,composicao:{bonus:370},agora});
      igual((await pedir(body,dono)).status,200);igual((await pedir(body,dono)).status,200);
      igual(srv.db.prepare('SELECT COUNT(*) n FROM arena_campanhas').get().n,1);
    }finally{await srv.fechar();}
  });return s;
}
