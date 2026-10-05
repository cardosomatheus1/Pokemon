/* Q8 dirigido: quatro processos disputam o mesmo resgate no SQLite em disco. */
import {criarSuite,igual} from './harness.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {abrirBanco} from '../server/banco.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {criarOperador} from '../server/admin.mjs';
import {criarCampanhaArena} from '../server/arena-recompensas.mjs';
import {creditarTaxaCasa,saldoCasaArena} from '../server/tesouraria-arena.mjs';
import {registrarMissao} from '../server/missoes-treinador.mjs';
export function suite(){const s=criarSuite('arena-concorrencia');
  s.teste('quatro resgates concorrentes geram um crédito e uma retirada da casa',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'premio-arena-')),arquivo=join(dir,'arena.sqlite');
    let db=abrirBanco(arquivo);
    try{
      const c=cenaArena({banco:db}),{agora}=c;
      creditarTaxaCasa(db,{id:'verba-concorrente',rake:740,composicao:{bonus:740},agora});
      const op=criarOperador(db,{email:'q8@teste.test',papel:'dono',agora});
      criarCampanhaArena(db,{operadorId:op.id,motivo:'fixture concorrência',confirmado:true,agora,config:{id:'concorrente',tipo:'bonus',inicio:agora-12*3600000,coorte:[c.a.id,c.b.id]}});
      registrarMissao(db,{userId:c.a.id,tipo:'treinar',chave:'ação-q8',agora});db.close();db=null;
      const banco=new URL('../server/banco.mjs',import.meta.url).href,premios=new URL('../server/arena-recompensas.mjs',import.meta.url).href;
      const pedido={userId:c.a.id,campanha:'concorrente',tipo:'preparacao',agora};
      const codigo=`import {abrirBanco} from ${JSON.stringify(banco)};import {resgatarArena} from ${JSON.stringify(premios)};const db=abrirBanco(${JSON.stringify(arquivo)});db.exec('PRAGMA busy_timeout=5000');console.log(JSON.stringify(resgatarArena(db,${JSON.stringify(pedido)})));db.close();`;
      const resultados=await Promise.all(Array.from({length:4},()=>promisify(execFile)(process.execPath,['--input-type=module','-e',codigo],{timeout:15000})));
      igual(resultados.reduce((n,r)=>n+JSON.parse(r.stdout).pago,0),50);
      db=abrirBanco(arquivo);igual(saldoCasaArena(db).bonus,690);
      igual(db.prepare("SELECT COUNT(*) n FROM wallet_ledger WHERE reference_type='arena_campanha'").get().n,1);
      igual(db.prepare("SELECT COUNT(*) n FROM telemetry_events WHERE nome='arena_recompensa_concedida'").get().n,1);
    }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
  });return s;
}
