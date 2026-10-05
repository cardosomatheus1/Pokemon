import PACK from '../../content/escolhido.mjs';
import {abrirBanco,migrar} from '../../server/banco.mjs';
import {cadastrar} from '../../server/auth.mjs';
import {gerar} from '../../server/criaturas.mjs';
import {xpParaNivel} from '../../engine/nivel-criatura.mjs';
export function cenaArena({banco=null}={}){
  const db=banco??abrirBanco(':memory:');migrar(db);const agora=Date.UTC(2026,9,5,12);
  const conta=n=>{
    const id=cadastrar(db,{username:n,email:`${n}@x.test`,senha:'senha-bem-longa-123',nascimento:'1990-01-01',agora}).id;
    db.prepare('INSERT INTO jornadas VALUES (?,?,0,?)').run(id,JSON.stringify({vencidos:PACK.jornada.map(n=>n.id),insignias:[]}),agora);
    const criaturas=[6,9,3,149,143,65].map(dex=>{
      const c=gerar(db,{userId:id,pack:PACK,dex,origem:'captura'});
      db.prepare("UPDATE criaturas SET xp=?,criada_em=?,nivel=60,natureza='Hardy',o_hp=15,o_atq=15,o_def=15,o_spa=15,o_spd=15,o_vel=15 WHERE id=?").run(xpParaNivel(60),agora,c.id);return c.id;
    });return {id,criaturas};
  };
  return {db,agora,pack:PACK,a:conta('atual0'),b:conta('atual1'),novaConta:conta};
}
