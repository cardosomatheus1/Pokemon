/* Fixtures de partidas ANTERIORES à política AT6. Elas continuam legíveis e
   participam do fechamento da sua temporada. Nenhuma rota usa este arquivo.
   A entrada atual ranqueada é testada em arena-treinadores e liga-stake. */
import { randomUUID, createHash } from 'node:crypto';
import PACK from '../../content/escolhido.mjs';
import { snapshotDe, snapshotPorId, criarSnapshot } from '../../server/equipe.mjs';
import { criaturasDaConta } from '../../server/idle.mjs';
import { confrontoDaLiga } from '../../app/modules/partida-dados.mjs';
import { sincronizarTemporada } from '../../server/temporada.mjs';
import { emTransacao } from '../../server/carteira.mjs';
import { aplicarPartida } from '../../server/liga-mmr.mjs';
import { creditarPartida } from '../../server/pontos-liga.mjs';
import { sinaisDaPartida, elegivel, INTEGRIDADE, emCooldown } from '../../engine/integridade-liga.mjs';
import { mensagemCommit } from '../../engine/commit.mjs';
import { partidaDe } from '../../server/partida.mjs';
import { emitir } from '../../server/telemetria.mjs';
import { exigirBandeira } from '../../server/feature-flags.mjs';

export function publicarTimeHistorico(db, {userId,pack=PACK,preset='balanced',agora}) {
  exigirBandeira(db, 'league_enabled');
  return criarSnapshot(db,{userId,pack,preset,agora,ids:criaturasDaConta(db,userId).filter(c=>!c.naCaixa).map(c=>c.id)});
}
export function partidaHistorica(db, {userId,pack=PACK,meu,adversario,chaveIdem,agora,
  raiz='1234567890abcdef1234567890abcdef',sal='historico'}) {
  const idem=`liga:${userId}:${chaveIdem}`, ja=db.prepare('SELECT id FROM league_matches WHERE idem_key=?').get(idem);
  if(ja)return {...partidaDe(db,ja.id,pack),repetido:true};
  sincronizarTemporada(db,{agora});
  const a=snapshotPorId(db,adversario), b=snapshotDe(db,{userId,id:meu});
  const recentes=db.prepare(`SELECT user_a AS userA,user_b AS userB,vencedor,criada_em AS criadaEm FROM league_matches
    WHERE criada_em>? AND (user_a IN (?,?) OR user_b IN (?,?))`).all(agora-INTEGRIDADE.janelaMs,a.user,userId,a.user,userId);
  if(emCooldown(recentes,userId,a.user,agora))throw Object.assign(new Error('cooldown histórico'),{codigo:'PARTIDA_COOLDOWN'});
  const c=confrontoDaLiga({pack,a,b,raiz}); if(!c.ok)throw new Error(c.motivo);
  const id=randomUUID();
  emTransacao(db,()=>{
    db.prepare(`INSERT INTO league_matches (id,idem_key,snap_a,snap_b,user_a,user_b,raiz,sal,commit_hash,semente,
      versao_motor,versao_conteudo,vencedor,turnos,log_json,criada_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,idem,a.id,b.id,a.user,userId,raiz,sal,createHash('sha256').update(mensagemCommit(raiz,sal)).digest('hex'),
        c.semente,c.versaoMotor,c.versaoConteudo,c.vencedor,c.turnos,JSON.stringify(c.log),agora);
    const sinais=sinaisDaPartida([...recentes,{userA:a.user,userB:userId,vencedor:c.vencedor,criadaEm:agora}],a.user,userId,agora);
    db.prepare('INSERT INTO liga_sinais (partida_id,elegivel,sinais_json,criado_em) VALUES (?,?,?,?)').run(id,elegivel(sinais)?1:0,JSON.stringify(sinais),agora);
    if(elegivel(sinais)){creditarPartida(db,{id,userA:a.user,userB:userId,vencedor:c.vencedor,agora});aplicarPartida(db,{id,userA:a.user,userB:userId,vencedor:c.vencedor,agora});}
    else emitir(db,{nome:'liga_partida_fora_do_ranking',userId,chave:`integridade:${id}`,agora,campos:{partida:id,sinais:sinais.map(x=>x.sinal).join(',').slice(0,40)}});
  });
  return partidaDe(db,id,pack);
}
