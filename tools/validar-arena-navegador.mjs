/* Q5 focado: navegador real, UI e servidor reais. Falha se faltar navegador.
   PW_MODULO/PW_CHROME apontam uma instalação externa, como test/visual.mjs. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {criarServidor} from '../server/servidor.mjs';
import {cenaArena} from '../test/fixtures/arena-atual.mjs';
import {publicarTime} from '../server/liga-equipe.mjs';
import {inscrever} from '../server/stake-liga.mjs';
import {creditarTaxaCasa} from '../server/tesouraria-arena.mjs';
import {criarCampanhaArena} from '../server/arena-recompensas.mjs';
import {criarOperador} from '../server/admin.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {CABECALHO_VERSAO,API_VERSAO} from '../server/contrato.mjs';
const {chromium}=await import(pathToFileURL(process.env.PW_MODULO||'/tmp/pw/node_modules/playwright-core/index.mjs').href);
const navegador=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const saida=process.env.ARENA_Q5_SAIDA||'/tmp/arena-q5-navegador';mkdirSync(saida,{recursive:true});
const resultados=[];
try{
  for(const largura of [390,768,1440]){
    const T=Date.UTC(2026,9,5,12);let agora=T;
    const srv=criarServidor({config:{ambiente:'teste',silencioso:true},sims:64,laco:false,relogio:()=>agora});
    const c=cenaArena({banco:srv.db});const porta=await srv.ouvir(0),base=`http://127.0.0.1:${porta}`;
    const contexto=await navegador.newContext({viewport:{width:largura,height:900},reducedMotion:'reduce'});
    const pg=await contexto.newPage(),erros=[],requisicoes=[];
    pg.on('pageerror',e=>erros.push(e.message));pg.on('request',r=>{if(r.url().includes('/api/player-market/busca?'))requisicoes.push(r.url());});
    try{
      const login=await fetch(`${base}/api/auth/entrar`,{method:'POST',headers:{'content-type':'application/json',[CABECALHO_VERSAO]:API_VERSAO},body:JSON.stringify({email:'atual1@x.test',senha:'senha-bem-longa-123'})}).then(r=>r.json());assert(login.sessao);
      await contexto.addInitScript(token=>{if(!localStorage.getItem('ar_sessao')){localStorage.setItem('ar_sessao',token);localStorage.setItem('ar_session','1');}},login.sessao);
      await pg.goto(`${base}/app/index.html`);
      await pg.locator('.nav[data-view="viewTreino"]').click();await pg.locator('[data-treino-aba="liga"]').click();
      await pg.locator('[data-le-acao="publicar"]').waitFor();await pg.locator('[data-le-acao="publicar"]').click();
      await pg.locator('[data-le-stake-buscar]').waitFor();assert.equal(srv.db.prepare('SELECT COUNT(*) n FROM team_snapshots WHERE user_id=?').get(c.b.id).n,1);
      const saldo=()=>srv.db.prepare('SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE user_id=?').get(c.b.id).n;
      const antes=saldo();await pg.locator('[data-le-stake-buscar]').click();await pg.locator('[data-le-stake-confirmar]').click();
      await pg.locator('.leErro').filter({hasText:'nada foi cobrado'}).waitFor();assert.equal(saldo(),antes);
      publicarTime(srv.db,{userId:c.a.id,pack:c.pack,preset:'balanced',agora:T});inscrever(srv.db,{userId:c.a.id,ativo:true,agora:T});
      await pg.locator('[data-le-stake-buscar]').click();await pg.locator('[data-le-stake-confirmar]').click();
      await pg.locator('#leReplay:not([hidden])').waitFor();assert.equal(srv.db.prepare('SELECT COUNT(*) n FROM league_matches').get().n,1);
      await pg.waitForFunction(()=>document.querySelectorAll('#leReplay .mon').length===12&&!document.querySelector('#leReplay .lpEntra'));
      await pg.screenshot({path:`${saida}/arena-${largura}.png`,fullPage:true});
      await pg.locator('#leReplay').screenshot({path:`${saida}/replay-${largura}.png`});
      const overflow=await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=1,`Arena: overflow ${overflow}px em ${largura}`);
      const antesPrevia=saldo();await pg.locator('#ligaEqCorpo [data-cash-abrir]').click();await pg.locator('[data-cash-aba="moldura"]').click();await pg.locator('.lcPeca:has([data-cash-comprar]) [data-cash-previa]').first().click();assert((await pg.locator('.lcPreviewBox').textContent()).includes('entrega permanente')); assert.equal(saldo(),antesPrevia);
      await pg.locator('[data-cash-palco]').waitFor();await pg.screenshot({path:`${saida}/cosmeticos-${largura}.png`});await pg.locator('[data-cash-fechar]').first().click();
      if(await pg.locator('#navMais').isVisible())await pg.locator('#navMais').click();
      await pg.locator('.nav[data-view="viewPokedex"]').click();await pg.locator('[data-pdx-aba="mercado"]').click();
      const inicial=pg.waitForResponse(r=>r.url().includes('/api/player-market/busca?'));
      await pg.locator('[data-mk-aba="criaturas"]').click();await inicial;
      await pg.locator('[data-mk-f="tipo"]').selectOption('electric');await pg.locator('[data-mk-f="ivStat"]').selectOption('vel');await pg.locator('[data-mk-f="ivMin"]').fill('25');await pg.locator('[data-mk-f="nivelMax"]').fill('80');
      const busca=pg.waitForRequest(r=>r.url().includes('/api/player-market/busca?')&&r.url().includes('ivMin=25'));
      await pg.locator('#mkFiltros button').click();await busca;
      await pg.waitForFunction(()=>document.querySelector('[data-mk-f="ivMin"]')?.value==='25');
      assert(requisicoes.some(u=>u.includes('tipo=electric')&&u.includes('ivStat=vel')&&u.includes('ivMin=25')&&u.includes('nivelMax=80')),`Filtros visíveis não chegaram à requisição: ${JSON.stringify(requisicoes)}`);
      await pg.screenshot({path:`${saida}/mercado-${largura}.png`,fullPage:true});
      assert(await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,`Mercado transborda em ${largura}`);
      const post=async(path,body={})=>pg.evaluate(async({path,body})=>{const {api}=await import('/app/modules/api.mjs');const r=await api.post(path,body);if(!r.ok)throw Error(JSON.stringify(r.corpo));return r.corpo;},{path,body});
      await post('/api/idle/treino');const xpAntes=srv.db.prepare('SELECT xp FROM criaturas WHERE id=?').get(c.b.criaturas[0]).xp;agora+=8*3600000;
      await post('/api/idle/treino');assert.equal(srv.db.prepare('SELECT xp FROM criaturas WHERE id=?').get(c.b.criaturas[0]).xp-xpAntes,3600);
      assert.equal((await post('/api/idle/treino')).ganhos.length,0);
      creditarTaxaCasa(srv.db,{id:'verba-fixture-q5',rake:1000,composicao:{bonus:1000},agora});
      const op=criarOperador(srv.db,{email:'q5@teste.test',papel:'dono',agora});
      criarCampanhaArena(srv.db,{operadorId:op.id,motivo:'fixture Q5 simulado',confirmado:true,agora,config:{id:'navegadorbonus',tipo:'bonus',inicio:T-12*3600000,coorte:[c.b.id]}});
      await pg.locator('.nav[data-view="viewTreino"]').click();await pg.locator('[data-treino-aba="liga"]').click();
      const resgate=pg.locator('[data-arena-resgatar="navegadorbonus"][data-arena-missao="preparacao"]');await resgate.waitFor();
      const esperado=await pg.evaluate(async()=>{const {api}=await import('/app/modules/api.mjs');const r=await api.get('/api/equipe/recompensas');return r.corpo.campanhas[0].diario.valor;});assert(esperado>0&&esperado<=50);
      const pre=saldo();await resgate.click();await pg.waitForFunction(()=>document.querySelector('[data-arena-resgatar="navegadorbonus"][data-arena-missao="preparacao"]')?.textContent==='Recebido');assert.equal(saldo()-pre,esperado);
      await pg.screenshot({path:`${saida}/recompensas-${largura}.png`,fullPage:true});
      srv.db.prepare('UPDATE criaturas SET dex=1,xp=?,nivel=16 WHERE id=?').run(xpParaNivel(16),c.b.criaturas[0]);
      srv.db.prepare('UPDATE jornadas SET progresso_json=? WHERE user_id=?').run(JSON.stringify({vencidos:[],insignias:[]}),c.b.id);
      await pg.reload();await pg.locator('.nav[data-view="viewIdle"]').click();await pg.locator('#idleEvolui details').waitFor();await pg.locator('#idleEvolui summary').click();
      assert((await pg.locator('#idleEvolui').textContent()).includes('Antes'));assert((await pg.locator('#idleEvolui').textContent()).includes('Depois'));
      await pg.screenshot({path:`${saida}/evolucao-${largura}.png`,fullPage:true});
      await pg.locator('.nav[data-view="viewTreino"]').click();await pg.locator('[data-treino-aba="jornada"]').click();await pg.locator('#jnMapaArea > aside [data-guia-aba="treino:jornada"]').waitFor();
      await pg.screenshot({path:`${saida}/jornada-${largura}.png`});
      assert.deepEqual(erros,[]);resultados.push({largura,publicacao:true,filaVaziaSemDebito:true,rankedReal:true,replayReal:true,filtrosEnviados:true,cosmeticosPrevia:true,offlineProgressivoSemDuplicar:true,resgateFinanciadoReal:true,evolucaoPrevia:true,objetivoAntesDaLiga:true,erros});
    }finally{await contexto.close();await srv.fechar();}
  }
}finally{await navegador.close();}
const r={tipo:'Q5 focado com navegador real',resultados,capturas:saida};
writeFileSync(process.env.ARENA_Q5_RELATORIO||`${saida}/relatorio.json`,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
