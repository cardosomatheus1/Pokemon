import {criarSuite,ok,igual} from './harness.mjs';
import {previaCosmetico} from '../app/modules/cosmetico-previa.mjs';
import {catalogo} from '../app/modules/cosmeticos.mjs';
import {cenaArena} from './fixtures/arena-atual.mjs';
import {publicarTime} from '../server/liga-equipe.mjs';
import {creditar} from '../server/carteira.mjs';
import {comprar,equipar} from '../server/cosmeticos.mjs';
import {simular} from '../engine/treino-batalha.mjs';
export function suite(){const s=criarSuite('arena-cosmeticos');
  s.teste('prévia mostra peça e preço do catálogo, sem equipar ou alterar o perfil',()=>{
    const p={name:'j',battle:{cena:'cidade',efeito:'neon',moldura:'neon'}},antes=JSON.stringify(p),cat=catalogo(),peca=cat.find(x=>x.familia==='moldura'&&x.procedencia==='loja');
    const r=previaCosmetico({catalogo:cat,chave:`${peca.familia}:${peca.id}`,perfil:p,avatar:'meu-avatar.png'});
    const arena=cat.find(p=>p.familia==='arena');igual(previaCosmetico({catalogo:cat,chave:`arena:${arena.id}`,perfil:p}).visual.arena,arena.id);
    igual(r.preco,peca.preco);igual(r.visual.moldura,peca.id);igual(JSON.stringify(p),antes);ok(r.vinculado);igual(previaCosmetico({catalogo:cat,chave:'forjada:poder'}),null);
  });
  s.teste('comprar/equipar com bônus preserva power e 30 batalhas byte a byte, sem criar PC-T',()=>{
    const c=cenaArena(),{db,pack,agora}=c;
    const a=publicarTime(db,{userId:c.a.id,pack,preset:'balanced',agora}),b=publicarTime(db,{userId:c.b.id,pack,preset:'balanced',agora});
    const p=catalogo().filter(x=>x.familia==='moldura'&&x.procedencia==='loja').sort((a,b)=>a.preco-b.preco)[0];
    creditar(db,{userId:c.a.id,tipo:'DAILY_REWARD',bucket:'bonus',valor:p.preco,idem:'fixture-cosmetico',agora});
    ok(comprar(db,{userId:c.a.id,familia:p.familia,id:p.id,chaveIdem:'visual-real-001',agora}).ok);ok(equipar(db,{userId:c.a.id,familia:p.familia,id:p.id,agora}).ok);
    const novo=publicarTime(db,{userId:c.a.id,pack,preset:'balanced',agora});igual(a.power,novo.power);
    for(let seed=1;seed<=30;seed++)igual(JSON.stringify(simular(pack,a.time,b.time,seed)),JSON.stringify(simular(pack,novo.time,b.time,seed)));
    igual(db.prepare("SELECT COALESCE(SUM(amount),0) n FROM wallet_ledger WHERE user_id=? AND bucket='transferivel'").get(c.a.id).n,0);db.close();
  });return s;
}
