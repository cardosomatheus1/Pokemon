/* A PARTIDA DA LIGA NO SERVIDOR (ST-11.2 · F5.1, F5.9 · Spec §9.2, §9.13).
 *
 * A conta é a da camada 0 (`confrontoDaLiga`); aqui mora o que precisa de
 * banco e de segredo:
 *
 *   A RAIZ       é do servidor, com COMMIT antes da luta (o mesmo esquema da
 *                Arena, `mensagemCommit`): a partida grava o compromisso, a
 *                raiz e o sal, e qualquer um confere que a semente estava
 *                decidida antes do resultado (§4.5)
 *   O VENCEDOR   sai da luta, e nunca do corpo — um `vencedor` no pedido é
 *                ignorado
 *   A CHAVE      do pedido é única: o reenvio devolve a partida gravada, e
 *                gravar duas vezes grava uma
 *   IMUTÁVEL     `league_matches` tem os gatilhos do livro: a partida jogada
 *                não se reescreve
 *
 * Quem desafia é B; o time publicado que ele enfrenta é A. Não se desafia o
 * próprio time. O pareamento (quem enfrenta quem, contas ligadas, bots) é da
 * ST-11.3 — aqui a partida é entre dois snapshots que existem.
 */
import { randomUUID, createHash } from 'node:crypto';
import { novaRaiz } from '../engine/seed.mjs';
import { novoSal, mensagemCommit } from '../engine/commit.mjs';
import { confrontoDaLiga, aparenciaDosTimes } from '../app/modules/partida-dados.mjs';
import { snapshotPodeLutar } from '../app/modules/snapshot-dados.mjs';
import { criaturaReservada } from './elegibilidade.mjs';
import { escolherAdversario, botPara, PAREAMENTO } from '../app/modules/pareamento-dados.mjs';
import { contasLigadas } from './protecao.mjs';
import { sincronizarTemporada } from './temporada.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { INTEGRIDADE, emCooldown, sinaisDaPartida, elegivel } from '../engine/integridade-liga.mjs';
import { emitir } from './telemetria.mjs';
import {anotarArena,exposicaoArena} from './arena-metricas.mjs';
import { exigirBandeira } from './feature-flags.mjs';
import { snapshotDe, snapshotPorId, ERRO_EQUIPE } from './equipe.mjs';
import { aplicarPartida, tierDaConta, ratingDe } from './liga-mmr.mjs';
import { creditarPartida } from './pontos-liga.mjs';
import { emTransacao } from './carteira.mjs';
import { prepararStake, reservarStakes, liquidarStake, stakeGravado, inscrito, exigirStakeLigado, ERRO_STAKE } from './stake-liga.mjs';
import PACK from '../content/escolhido.mjs';
import { POLITICA_ARENA, parCompativel } from '../engine/arena-treinadores.mjs';
import { exigirAcessoArena, acessoDaArena } from './arena-acesso.mjs';
import { avaliarPareamento } from '../app/modules/pareamento-competitivo.mjs';

const AUTORIZACAO_FILA = Symbol('pareamento do servidor');

export const ERRO_PARTIDA = Object.freeze({
  CHAVE: 'PARTIDA_CHAVE_INVALIDA', SEM_PARTIDA: 'PARTIDA_SEM_PARTIDA', CONTRA_SI: 'PARTIDA_CONTRA_SI', VERSAO: 'PARTIDA_VERSAO',
  LIGADA: 'PARTIDA_CONTA_LIGADA', COOLDOWN: 'PARTIDA_COOLDOWN', INELEGIVEL: 'PARTIDA_TIME_INELEGIVEL' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

/* QUEM É DONO DE CADA CRIATURA DO TIME AGORA (ST-14.3a): o snapshot é imutável,
   a posse não. A regra é da camada 0 (`snapshotPodeLutar`); aqui só se lê. */
const DONO = `SELECT user_id FROM criaturas WHERE id = ?`;
/* A criatura RESERVADA conta como fora do time (ST-14.6): ela pode estar
   saindo da conta, e uma partida nova não pode depender dela. */
const donosDe = (db, snap) => new Map((snap?.time ?? []).map(x => [x.id, criaturaReservada(db, x.id) ? null : db.prepare(DONO).get(x.id)?.user_id]));
function exigirQuePossaLutar(db, snap, dono) {
  const r = snapshotPodeLutar(snap, dono, donosDe(db, snap));
  if (!r.ok) throw falha(ERRO_PARTIDA.INELEGIVEL, r.motivo);
}
const CHAVE_OK = /^[\w-]{8,64}$/;

/* A transação é a da CARTEIRA (ST-11.10): o stake move dinheiro dentro da
   transação da partida, e a da carteira sabe aninhar (SAVEPOINT) — um BEGIN
   próprio aqui recusaria o `gastar` lá dentro. */

/* O que a partida mostra: o log, os dois times e o REVEAL — o compromisso, a
   raiz e o sal — para qualquer um conferir. Os donos não viajam. */
/* A partida com sinal de integridade fica FORA DO RANKING (ST-11.8): o jogador
   vê que ficou fora, e não os números que a puseram lá — eles são do operador. */
const FORA_DO_RANKING = 'fora do ranking: padrão de partidas entre as mesmas contas';
const sinalDe = (db, id) => db.prepare(`SELECT elegivel FROM liga_sinais WHERE partida_id = ?`).get(id);
const publica = (l, s = null) => ({
  ...(s && !s.elegivel ? { integridade: FORA_DO_RANKING } : {}),
  id: l.id, rated: !s || !!s.elegivel, bot: null, defensor: l.snap_a, desafiante: l.snap_b, vencedor: l.vencedor, turnos: l.turnos,
  semente: l.semente, versaoMotor: l.versao_motor, versaoConteudo: l.versao_conteudo,
  commit: l.commit_hash, raiz: l.raiz, sal: l.sal, log: JSON.parse(l.log_json), criadaEm: l.criada_em,
});

/* A partida contra o BOT: rotulada no payload, e sem Liga MMR (`rated: false`). */
const ROTULO_DO_BOT = 'bot — treinador da jornada, não é um jogador';
const publicaBot = (l, nome) => ({
  id: l.id, rated: false, bot: { id: l.bot_id, nome, rotulo: ROTULO_DO_BOT }, defensor: l.bot_id, desafiante: l.snap_b,
  vencedor: l.vencedor, turnos: l.turnos, semente: l.semente, versaoMotor: l.versao_motor, versaoConteudo: l.versao_conteudo,
  commit: l.commit_hash, raiz: l.raiz, sal: l.sal, log: JSON.parse(l.log_json), criadaEm: l.criada_em,
});
const nomeDoBot = (pack, botId) => (pack.treinadores ?? []).find(t => `bot:${t.id}` === botId)?.nome ?? botId;

/* A partida já jogada com esta chave — contra gente ou contra o bot. O
   reenvio devolve a gravada; os dois caminhos perguntam AQUI, e em nenhum
   outro lugar. */
function jaJogada(db, idem, pack) {
  const ja = db.prepare(`SELECT * FROM league_matches WHERE idem_key = ?`).get(idem);
  if (ja) return { ...comStake(db, publica(ja, sinalDe(db, ja.id))), repetido: true };
  const jaBot = db.prepare(`SELECT * FROM league_bot_matches WHERE idem_key = ?`).get(idem);
  if (jaBot) return { ...publicaBot(jaBot, nomeDoBot(pack, jaBot.bot_id)), repetido: true };
  return null;
}
/* O compromisso da raiz, no esquema da Arena — um lugar só para as duas partidas. */
const compromisso = (raiz, sal) => createHash('sha256').update(mensagemCommit(raiz, sal), 'utf8').digest('hex');
/* As partidas da janela de integridade que tocam estas contas. */
const partidasDoPar = (db, users, agora) => db.prepare(`SELECT user_a AS userA, user_b AS userB, vencedor, criada_em AS criadaEm FROM league_matches
   WHERE criada_em > ? AND (user_a IN (?, ?) OR user_b IN (?, ?))`).all(agora - INTEGRIDADE.janelaMs, users[0], users[1], users[0], users[1]);

export function criarPartida(db, { userId, pack = PACK, meu, adversario, chaveIdem, agora, raiz = novaRaiz(), sal = novoSal(),
                                   stake = false, checkpoint, autorizacao }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_PARTIDA.CHAVE, 'chave do pedido inválida');
  const idem = `liga:${userId}:${chaveIdem}`;
  const ja = jaJogada(db, idem, pack);
  if (ja) return ja;
  if (stake && autorizacao !== AUTORIZACAO_FILA) throw falha('ARENA_USAR_FILA', 'A partida ranqueada precisa do pareamento do servidor.');
  /* A temporada vira ANTES da partida: a partida de hoje conta no rating de hoje (ST-11.5). */
  sincronizarTemporada(db, { agora });
  const b = snapshotDe(db, { userId, id: meu });
  const a = snapshotPorId(db, adversario);
  if (!a) throw falha(ERRO_EQUIPE.SEM_SNAPSHOT, 'esse time não existe');
  if (a.user === userId) throw falha(ERRO_PARTIDA.CONTRA_SI, 'não se desafia o próprio time');
  /* Os DOIS times, e antes de qualquer escrita: o desafio direto também. */
  exigirQuePossaLutar(db, b, userId);
  exigirQuePossaLutar(db, a, a.user);
  if (stake) {
    exigirAcessoArena(db, userId, pack, b.time);
    exigirAcessoArena(db, a.user, pack, a.time);
    if (!parCompativel(a, b, ratingDe(db, a.user).rating, ratingDe(db, userId).rating))
      throw falha('ARENA_FORA_DA_FAIXA', 'Os times estão fora da faixa de competição.');
  }
  /* O desafio DIRETO também não pareia contas ligadas (§9.12): sem isto, a
     rota direta seria o atalho do win-trading que o pareamento fecha. */
  if (contasLigadas(db, userId).includes(a.user)) throw falha(ERRO_PARTIDA.LIGADA, 'contas ligadas não se enfrentam');
  /* O COOLDOWN entre adversários (ST-11.8, §9.12): a revanche imediata é a
     ferramenta mais barata do win-trading. */
  const recentes = partidasDoPar(db, [userId, a.user], agora);
  if (emCooldown(recentes, userId, a.user, agora)) throw falha(ERRO_PARTIDA.COOLDOWN, 'vocês se enfrentaram há pouco — a revanche abre em até 6 h');
  const c = confrontoDaLiga({ pack, a, b, raiz });
  if (!c.ok) throw falha(ERRO_PARTIDA.VERSAO, c.motivo);
  /* O STAKE (ST-11.10): todos os portões, dos dois lados, ANTES de qualquer escrita. */
  let prep = stake ? prepararStake(db, { userA: a.user, userB: userId, agora, ...(checkpoint !== undefined ? { checkpoint } : {}) }) : null;
  const commit = compromisso(raiz, sal);
  const id = randomUUID();
  /* A partida e o Liga MMR na MESMA transação (ST-11.4): a partida gravada sem
     o rating aplicado — ou o contrário — é rating criado ou sumido. */
  emTransacao(db, () => {
    if (stake) {
      exigirQuePossaLutar(db, b, userId); exigirQuePossaLutar(db, a, a.user);
      for (const [dono, snap] of [[userId, b], [a.user, a]]) {
        const atual = db.prepare('SELECT id FROM team_snapshots WHERE user_id=? ORDER BY criado_em DESC, id DESC LIMIT 1').get(dono);
        if (atual?.id !== snap.id) throw falha('ARENA_REPUBLICAR', 'Use o último time publicado para competir.');
        exigirAcessoArena(db, dono, pack, snap.time);
      }
      if (!parCompativel(a, b, ratingDe(db, a.user).rating, ratingDe(db, userId).rating)) throw falha('ARENA_FORA_DA_FAIXA', 'O pareamento mudou; busque novamente.');
      prep = prepararStake(db, { userA:a.user, userB:userId, agora, ...(checkpoint !== undefined ? {checkpoint} : {}) });
    }
    const tiers={A:tierDaConta(db,a.user).tier,B:tierDaConta(db,userId).tier};
    /* Os dois stakes saem ANTES de a partida existir: sem eles, não há partida. */
    if (prep) reservarStakes(db, { id, userA: a.user, userB: userId, prep, agora });
    db.prepare(`INSERT INTO league_matches (id, idem_key, snap_a, snap_b, user_a, user_b, raiz, sal, commit_hash, semente,
                  versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, idem, a.id, b.id, a.user, userId, raiz, sal, commit, c.semente, c.versaoMotor, c.versaoConteudo, c.vencedor, c.turnos,
           JSON.stringify(c.log), agora);
    db.prepare('INSERT INTO arena_partidas (partida_id, modo, politica) VALUES (?, ?, ?)')
      .run(id, stake ? 'ranqueada' : 'amistoso', POLITICA_ARENA.versao);
    /* OS SINAIS (ST-11.8), com a partida de agora incluída: a elegível move o
       Liga MMR; a outra fica gravada, fora do ranking, e o evento vai inteiro
       (sem amostragem) para o operador. */
    const sinais = sinaisDaPartida([...recentes, { userA: a.user, userB: userId, vencedor: c.vencedor, criadaEm: agora }], a.user, userId, agora);
    db.prepare(`INSERT INTO liga_sinais (partida_id, elegivel, sinais_json, criado_em) VALUES (?, ?, ?, ?)`)
      .run(id, elegivel(sinais) ? 1 : 0, JSON.stringify(sinais), agora);
    /* A partida fora do ranking é o cancelamento técnico do stake: devolve 100%. */
    if (prep) liquidarStake(db, { id, userA: a.user, userB: userId, prep, vencedor: c.vencedor, contado: elegivel(sinais), agora });
    /* A partida CONTADA mexe no Liga MMR e paga os League Points (ST-11.7a),
       na mesma transação; a fora do ranking não faz nenhum dos dois. */
    if (stake && elegivel(sinais)) creditarPartida(db, { id, userA: a.user, userB: userId, vencedor: c.vencedor, agora });
    if (stake && elegivel(sinais)) aplicarPartida(db, { id, userA: a.user, userB: userId, vencedor: c.vencedor, agora });
    else if (stake) emitir(db, { nome: 'liga_partida_fora_do_ranking', userId, chave: `integridade:${id}`, agora,
                      campos: { partida: id, sinais: sinais.map(x => x.sinal).join(',').slice(0, 40) } });
    emitir(db,{nome:'arena_partida_concluida',userId,chave:`arena-resultado:${id}`,agora,
      campos:{origem:'servidor',partida:id,modo:stake?'ranqueada':'amistoso',contou:stake&&elegivel(sinais),stake:prep?.stake??0,vencedor:c.vencedor,turnos:c.turnos}});
    const taxaCasa=db.prepare("SELECT COALESCE(SUM(delta),0) n FROM arena_tesouraria WHERE referencia=? AND tipo='LEAGUE_RAKE'").get(id).n;
    if(autorizacao===AUTORIZACAO_FILA)anotarArena(db,{nome:'arena_busca_concluida',userId,chave:`busca:${idem}:partida`,agora,
      campos:{tier:tiers.B,modo:stake?'ranqueada':'amistoso',encontrou:true,partida:id,motivo:'adversario'}});
    anotarArena(db,{nome:'arena_partida_liquidada',userId,chave:`liquidacao:${id}`,agora,
      campos:{partida:id,lados:[a.user,userId],tiers,exposicao:{A:exposicaoArena(a),B:exposicaoArena(b)},
        modo:stake?'ranqueada':'amistoso',contou:stake&&elegivel(sinais),stake:prep?.stake??0,pot:(prep?.stake??0)*2,
        taxaCasa,referenciaCasa:taxaCasa?id:null,vencedor:c.vencedor,turnos:c.turnos,temporada:temporadaDe(agora).numero}});
  });
  return comStake(db, publica(db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id), sinalDe(db, id)));
}

/* A partida com stake diz o stake (o valor, o pot, o rake e o que aconteceu). */
const comStake = (db, p) => {
  const s = stakeGravado(db, p.id), a = db.prepare('SELECT modo, politica FROM arena_partidas WHERE partida_id = ?').get(p.id);
  return { ...p, ...(s ? { stake: s } : {}), ...(a ? { modo: a.modo, politica: a.politica,
    rated: a.modo === 'ranqueada' && p.rated, ...(a.modo === 'amistoso' ? { integridade: undefined } : {}) } : {}) };
};

/* A partida tem LINK PRÓPRIO (I.1): quem tem o id a revê — o replay é
   público, como o reveal da Arena. A do bot também. */
/* O REPLAY leva a APARÊNCIA (ST-14.3c · L-226): o shiny gravado no snapshot
   de cada lado, para o palco pintar a folha certa. É o que o time PUBLICADO
   já mostrava; o id da criatura e o dono não viajam. */
export function partidaDe(db, id, pack = PACK) {
  const l = db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id);
  if (l) return { ...comStake(db, publica(l, sinalDe(db, l.id))), aparencia: aparenciaDosTimes(snapshotPorId(db, l.snap_a), snapshotPorId(db, l.snap_b)) };
  const b = db.prepare(`SELECT * FROM league_bot_matches WHERE id = ?`).get(id);
  if (!b) throw falha(ERRO_PARTIDA.SEM_PARTIDA, 'essa partida não existe');
  return { ...publicaBot(b, nomeDoBot(pack, b.bot_id)), aparencia: aparenciaDosTimes(null, snapshotPorId(db, b.snap_b)) };
}

/* ── BUSCAR PARTIDA (ST-11.3) ───────────────────────────────────────────
 *
 * O servidor escolhe o adversário pela regra da camada 0 (`escolherAdversario`)
 * entre os times publicados — o ÚLTIMO snapshot de cada conta —, com o rating
 * de cada uma, os meus últimos adversários e as minhas contas ligadas. Sem
 * ninguém na faixa, o BOT da jornada, rotulado e sem Liga MMR. A chave do
 * pedido vale para as duas: cem pedidos com a mesma chave são UMA partida. */
function ultimosSnapshots(db, userId) {
  return db.prepare(`SELECT t.id FROM team_snapshots t
                     WHERE t.user_id != ? AND t.id = (SELECT id FROM team_snapshots u WHERE u.user_id = t.user_id ORDER BY criado_em DESC, id DESC LIMIT 1)`)
    .all(userId).map(l => snapshotPorId(db, l.id))
    /* O último time de quem soltou uma criatura dele não entra na fila: sai
       de pareamento até a conta publicar outro (ST-14.3a). */
    .filter(s => snapshotPodeLutar(s, s.user, donosDe(db, s)).ok);
}
function adversariosRecentes(db, userId) {
  return db.prepare(`SELECT CASE WHEN user_b = ? THEN user_a ELSE user_b END AS outro, criada_em FROM league_matches
                     WHERE user_a = ? OR user_b = ? ORDER BY criada_em DESC, id DESC LIMIT ?`)
    .all(userId, userId, userId, PAREAMENTO.janelaRepeticao).map(l => l.outro);
}

export function buscarPartida(db, { userId, pack = PACK, meu, chaveIdem, agora, raiz = novaRaiz(), sal = novoSal(), stake = false, checkpoint }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_PARTIDA.CHAVE, 'chave do pedido inválida');
  const idem = `liga:${userId}:${chaveIdem}`;
  const ja = jaJogada(db, idem, pack);
  if (ja) return ja;
  sincronizarTemporada(db, { agora });
  const b = snapshotDe(db, { userId, id: meu });
  exigirQuePossaLutar(db, b, userId);   // contra o bot também: o time é o mesmo
  const eu = { user: userId, rating: ratingDe(db, userId).rating, power: b.power };
  /* A BUSCA COM STAKE (ST-11.11): só quem se inscreveu para defender com stake, e NUNCA o bot — o bot não põe dinheiro. */
  if (stake) exigirStakeLigado(db, checkpoint);
  if (stake) exigirAcessoArena(db, userId, pack, b.time);
  emitir(db,{nome:'arena_busca_iniciada',userId,chave:`arena-busca:${idem}`,agora,campos:{origem:'servidor',ranqueada:stake}});
  const candidatos = ultimosSnapshots(db, userId).filter(s => !stake || (inscrito(db, s.user, agora)
    && tierDaConta(db,s.user).tier === tierDaConta(db,userId).tier
    && acessoDaArena(db, s.user, pack, s.time).ok
    && parCompativel(s, b, ratingDe(db, s.user).rating, eu.rating)))
    .filter(s=>{
      if(!stake)return true;
      try { prepararStake(db,{userA:s.user,userB:userId,agora,...(checkpoint!==undefined?{checkpoint}:{})});return true; }
      catch(e){ if(e.userId===s.user)return false;throw e; }
    })
    .map(s => ({ user: s.user, rating: ratingDe(db, s.user).rating, snapshot: s }));
  const emEspera = db.prepare(`SELECT CASE WHEN user_b = ? THEN user_a ELSE user_b END AS outro FROM league_matches
                                WHERE (user_a = ? OR user_b = ?) AND criada_em > ?`).all(userId, userId, userId, agora - INTEGRIDADE.cooldownMs).map(l => l.outro);
  const regras = { pack, eu, recentes: adversariosRecentes(db, userId), ligadas: contasLigadas(db, userId), evitar: emEspera };
  let pool=candidatos,adv=null;
  for(let tentativas=0;tentativas<POLITICA_ARENA.candidatosMax;tentativas++){
    const candidato=escolherAdversario({...regras,candidatos:pool});
    if(!candidato)break;
    if(!stake||avaliarPareamento(pack,candidato.snapshot,b).ok){adv=candidato;break;}
    pool=pool.filter(x=>x.user!==candidato.user);
  }
  if (adv) return criarPartida(db, { userId, pack, meu, adversario: adv.snapshot.id, chaveIdem, agora, raiz, sal, stake, checkpoint, autorizacao: AUTORIZACAO_FILA });
  if (stake) {
    anotarArena(db,{nome:'arena_busca_concluida',userId,chave:`busca:${idem}:vazia`,agora,
      campos:{tier:tierDaConta(db,userId).tier,modo:'ranqueada',encontrou:false,candidatos:candidatos.length,motivo:'fila_vazia'}});
    throw falha(ERRO_STAKE.SEM_ADVERSARIO, 'ninguém da sua faixa na fila com stake agora — nada foi cobrado');
  }
  const bot = botPara(pack, eu);
  const c = confrontoDaLiga({ pack, a: bot, b, raiz });
  if (!c.ok) throw falha(ERRO_PARTIDA.VERSAO, c.motivo);
  const commit = compromisso(raiz, sal);
  const id = randomUUID();
  db.prepare(`INSERT INTO league_bot_matches (id, idem_key, bot_id, snap_b, user_b, raiz, sal, commit_hash, semente,
                versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, idem, bot.id, b.id, userId, raiz, sal, commit, c.semente, c.versaoMotor, c.versaoConteudo, c.vencedor, c.turnos, JSON.stringify(c.log), agora);
  anotarArena(db,{nome:'arena_busca_concluida',userId,chave:`busca:${idem}:bot`,agora,
    campos:{tier:tierDaConta(db,userId).tier,modo:'amistoso',encontrou:false,motivo:'bot_treino'}});
  return publicaBot(db.prepare(`SELECT * FROM league_bot_matches WHERE id = ?`).get(id), bot.nome);
}

const texto = v => (typeof v === 'string' && v.length > 0 && v.length <= 80 ? v : null);
export function rotasDaPartida(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    /* Desafiar: o meu time congelado contra o time publicado de outro. Um
       `vencedor`, `raiz` ou `semente` no corpo é ignorado. */
    'POST /api/equipe/partida': ({ db, corpo, userId, agora }) => {
      const meu = texto(corpo?.meu), adversario = texto(corpo?.adversario);
      if (!meu || !adversario) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'partida inválida' } };
      return tentar(() => { exigirBandeira(db, 'league_enabled'); return { partida: criarPartida(db, { userId, meu, adversario, chaveIdem: corpo?.chaveIdem, agora, stake: corpo?.stake === true }) }; });
    },
    /* Buscar partida: o servidor escolhe o adversário (ST-11.3). */
    'POST /api/equipe/buscar': ({ db, corpo, userId, agora }) => {
      const meu = texto(corpo?.meu);
      if (!meu) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'busca inválida' } };
      return tentar(() => { exigirBandeira(db, 'league_enabled'); return { partida: buscarPartida(db, { userId, meu, chaveIdem: corpo?.chaveIdem, agora, stake: corpo?.stake === true }) }; });
    },
    /* O tier e as partidas de quem pede — o rating exato fica no servidor (§9.7). */
    'GET /api/equipe/tier': ({ db, userId, agora }) => { sincronizarTemporada(db, { agora }); return { corpo: tierDaConta(db, userId) }; },
    /* A temporada de agora (ST-11.5): o número, a fase, o dia e o fim — e o meu tier nela. */
    'GET /api/equipe/temporada': ({ db, userId, agora }) => {
      sincronizarTemporada(db, { agora });
      const t = temporadaDe(agora);
      return { corpo: { numero: t.numero, fase: t.fase, dia: t.dia, fim: t.fim, ...tierDaConta(db, userId) } };
    },
    'GET /api/equipe/partida': ({ db, query }) => {
      const id = texto(query?.get?.('id'));
      if (!id) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'partida inválida' } };
      return tentar(() => ({ partida: partidaDe(db, id) }));
    },
  };
}
