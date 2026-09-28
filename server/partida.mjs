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
import { confrontoDaLiga } from '../app/modules/partida-dados.mjs';
import { escolherAdversario, botPara, PAREAMENTO } from '../app/modules/pareamento-dados.mjs';
import { contasLigadas } from './protecao.mjs';
import { sincronizarTemporada } from './temporada.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { INTEGRIDADE, emCooldown, sinaisDaPartida, elegivel } from '../engine/integridade-liga.mjs';
import { emitir } from './telemetria.mjs';
import { snapshotDe, snapshotPorId, ERRO_EQUIPE } from './equipe.mjs';
import { aplicarPartida, tierDaConta, ratingDe } from './liga-mmr.mjs';
import PACK from '../content/escolhido.mjs';

export const ERRO_PARTIDA = Object.freeze({
  CHAVE: 'PARTIDA_CHAVE_INVALIDA', SEM_PARTIDA: 'PARTIDA_SEM_PARTIDA', CONTRA_SI: 'PARTIDA_CONTRA_SI', VERSAO: 'PARTIDA_VERSAO',
  LIGADA: 'PARTIDA_CONTA_LIGADA', COOLDOWN: 'PARTIDA_COOLDOWN' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });
const CHAVE_OK = /^[\w-]{8,64}$/;

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

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
  if (ja) return { ...publica(ja, sinalDe(db, ja.id)), repetido: true };
  const jaBot = db.prepare(`SELECT * FROM league_bot_matches WHERE idem_key = ?`).get(idem);
  if (jaBot) return { ...publicaBot(jaBot, nomeDoBot(pack, jaBot.bot_id)), repetido: true };
  return null;
}
/* O compromisso da raiz, no esquema da Arena — um lugar só para as duas partidas. */
const compromisso = (raiz, sal) => createHash('sha256').update(mensagemCommit(raiz, sal), 'utf8').digest('hex');
/* As partidas da janela de integridade que tocam estas contas. */
const partidasDoPar = (db, users, agora) => db.prepare(`SELECT user_a AS userA, user_b AS userB, vencedor, criada_em AS criadaEm FROM league_matches
   WHERE criada_em > ? AND (user_a IN (?, ?) OR user_b IN (?, ?))`).all(agora - INTEGRIDADE.janelaMs, users[0], users[1], users[0], users[1]);

export function criarPartida(db, { userId, pack = PACK, meu, adversario, chaveIdem, agora, raiz = novaRaiz(), sal = novoSal() }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_PARTIDA.CHAVE, 'chave do pedido inválida');
  const idem = `liga:${userId}:${chaveIdem}`;
  const ja = jaJogada(db, idem, pack);
  if (ja) return ja;
  /* A temporada vira ANTES da partida: a partida de hoje conta no rating de hoje (ST-11.5). */
  sincronizarTemporada(db, { agora });
  const b = snapshotDe(db, { userId, id: meu });
  const a = snapshotPorId(db, adversario);
  if (!a) throw falha(ERRO_EQUIPE.SEM_SNAPSHOT, 'esse time não existe');
  if (a.user === userId) throw falha(ERRO_PARTIDA.CONTRA_SI, 'não se desafia o próprio time');
  /* O desafio DIRETO também não pareia contas ligadas (§9.12): sem isto, a
     rota direta seria o atalho do win-trading que o pareamento fecha. */
  if (contasLigadas(db, userId).includes(a.user)) throw falha(ERRO_PARTIDA.LIGADA, 'contas ligadas não se enfrentam');
  /* O COOLDOWN entre adversários (ST-11.8, §9.12): a revanche imediata é a
     ferramenta mais barata do win-trading. */
  const recentes = partidasDoPar(db, [userId, a.user], agora);
  if (emCooldown(recentes, userId, a.user, agora)) throw falha(ERRO_PARTIDA.COOLDOWN, 'vocês se enfrentaram há pouco — a revanche abre em até 6 h');
  const c = confrontoDaLiga({ pack, a, b, raiz });
  if (!c.ok) throw falha(ERRO_PARTIDA.VERSAO, c.motivo);
  const commit = compromisso(raiz, sal);
  const id = randomUUID();
  /* A partida e o Liga MMR na MESMA transação (ST-11.4): a partida gravada sem
     o rating aplicado — ou o contrário — é rating criado ou sumido. */
  emTransacao(db, () => {
    db.prepare(`INSERT INTO league_matches (id, idem_key, snap_a, snap_b, user_a, user_b, raiz, sal, commit_hash, semente,
                  versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, idem, a.id, b.id, a.user, userId, raiz, sal, commit, c.semente, c.versaoMotor, c.versaoConteudo, c.vencedor, c.turnos,
           JSON.stringify(c.log), agora);
    /* OS SINAIS (ST-11.8), com a partida de agora incluída: a elegível move o
       Liga MMR; a outra fica gravada, fora do ranking, e o evento vai inteiro
       (sem amostragem) para o operador. */
    const sinais = sinaisDaPartida([...recentes, { userA: a.user, userB: userId, vencedor: c.vencedor, criadaEm: agora }], a.user, userId, agora);
    db.prepare(`INSERT INTO liga_sinais (partida_id, elegivel, sinais_json, criado_em) VALUES (?, ?, ?, ?)`)
      .run(id, elegivel(sinais) ? 1 : 0, JSON.stringify(sinais), agora);
    if (elegivel(sinais)) aplicarPartida(db, { id, userA: a.user, userB: userId, vencedor: c.vencedor, agora });
    else emitir(db, { nome: 'liga_partida_fora_do_ranking', userId, chave: `integridade:${id}`, agora,
                      campos: { partida: id, sinais: sinais.map(x => x.sinal).join(',').slice(0, 40) } });
  });
  return publica(db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id), sinalDe(db, id));
}

/* A partida tem LINK PRÓPRIO (I.1): quem tem o id a revê — o replay é
   público, como o reveal da Arena. A do bot também. */
export function partidaDe(db, id, pack = PACK) {
  const l = db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id);
  if (l) return publica(l, sinalDe(db, l.id));
  const b = db.prepare(`SELECT * FROM league_bot_matches WHERE id = ?`).get(id);
  if (!b) throw falha(ERRO_PARTIDA.SEM_PARTIDA, 'essa partida não existe');
  return publicaBot(b, nomeDoBot(pack, b.bot_id));
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
    .all(userId).map(l => snapshotPorId(db, l.id));
}
function adversariosRecentes(db, userId) {
  return db.prepare(`SELECT CASE WHEN user_b = ? THEN user_a ELSE user_b END AS outro, criada_em FROM league_matches
                     WHERE user_a = ? OR user_b = ? ORDER BY criada_em DESC, id DESC LIMIT ?`)
    .all(userId, userId, userId, PAREAMENTO.janelaRepeticao).map(l => l.outro);
}

export function buscarPartida(db, { userId, pack = PACK, meu, chaveIdem, agora, raiz = novaRaiz(), sal = novoSal() }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_PARTIDA.CHAVE, 'chave do pedido inválida');
  const idem = `liga:${userId}:${chaveIdem}`;
  const ja = jaJogada(db, idem, pack);
  if (ja) return ja;
  sincronizarTemporada(db, { agora });
  const b = snapshotDe(db, { userId, id: meu });
  const eu = { user: userId, rating: ratingDe(db, userId).rating, power: b.power };
  const candidatos = ultimosSnapshots(db, userId).map(s => ({ user: s.user, rating: ratingDe(db, s.user).rating, snapshot: s }));
  const emEspera = db.prepare(`SELECT CASE WHEN user_b = ? THEN user_a ELSE user_b END AS outro FROM league_matches
                                WHERE (user_a = ? OR user_b = ?) AND criada_em > ?`).all(userId, userId, userId, agora - INTEGRIDADE.cooldownMs).map(l => l.outro);
  const adv = escolherAdversario({ pack, eu, candidatos, recentes: adversariosRecentes(db, userId), ligadas: contasLigadas(db, userId), evitar: emEspera });
  if (adv) return criarPartida(db, { userId, pack, meu, adversario: adv.snapshot.id, chaveIdem, agora, raiz, sal });
  const bot = botPara(pack, eu);
  const c = confrontoDaLiga({ pack, a: bot, b, raiz });
  if (!c.ok) throw falha(ERRO_PARTIDA.VERSAO, c.motivo);
  const commit = compromisso(raiz, sal);
  const id = randomUUID();
  db.prepare(`INSERT INTO league_bot_matches (id, idem_key, bot_id, snap_b, user_b, raiz, sal, commit_hash, semente,
                versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, idem, bot.id, b.id, userId, raiz, sal, commit, c.semente, c.versaoMotor, c.versaoConteudo, c.vencedor, c.turnos, JSON.stringify(c.log), agora);
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
      return tentar(() => ({ partida: criarPartida(db, { userId, meu, adversario, chaveIdem: corpo?.chaveIdem, agora }) }));
    },
    /* Buscar partida: o servidor escolhe o adversário (ST-11.3). */
    'POST /api/equipe/buscar': ({ db, corpo, userId, agora }) => {
      const meu = texto(corpo?.meu);
      if (!meu) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'busca inválida' } };
      return tentar(() => ({ partida: buscarPartida(db, { userId, meu, chaveIdem: corpo?.chaveIdem, agora }) }));
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
