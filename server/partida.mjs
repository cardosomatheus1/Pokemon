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
import { snapshotDe, snapshotPorId, ERRO_EQUIPE } from './equipe.mjs';
import { aplicarPartida, tierDaConta } from './liga-mmr.mjs';
import PACK from '../content/escolhido.mjs';

export const ERRO_PARTIDA = Object.freeze({
  CHAVE: 'PARTIDA_CHAVE_INVALIDA', SEM_PARTIDA: 'PARTIDA_SEM_PARTIDA', CONTRA_SI: 'PARTIDA_CONTRA_SI', VERSAO: 'PARTIDA_VERSAO' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });
const CHAVE_OK = /^[\w-]{8,64}$/;

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

/* O que a partida mostra: o log, os dois times e o REVEAL — o compromisso, a
   raiz e o sal — para qualquer um conferir. Os donos não viajam. */
const publica = l => ({
  id: l.id, defensor: l.snap_a, desafiante: l.snap_b, vencedor: l.vencedor, turnos: l.turnos,
  semente: l.semente, versaoMotor: l.versao_motor, versaoConteudo: l.versao_conteudo,
  commit: l.commit_hash, raiz: l.raiz, sal: l.sal, log: JSON.parse(l.log_json), criadaEm: l.criada_em,
});

export function criarPartida(db, { userId, pack = PACK, meu, adversario, chaveIdem, agora, raiz = novaRaiz(), sal = novoSal() }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_PARTIDA.CHAVE, 'chave do pedido inválida');
  const idem = `liga:${userId}:${chaveIdem}`;
  const ja = db.prepare(`SELECT * FROM league_matches WHERE idem_key = ?`).get(idem);
  if (ja) return { ...publica(ja), repetido: true };
  const b = snapshotDe(db, { userId, id: meu });
  const a = snapshotPorId(db, adversario);
  if (!a) throw falha(ERRO_EQUIPE.SEM_SNAPSHOT, 'esse time não existe');
  if (a.user === userId) throw falha(ERRO_PARTIDA.CONTRA_SI, 'não se desafia o próprio time');
  const c = confrontoDaLiga({ pack, a, b, raiz });
  if (!c.ok) throw falha(ERRO_PARTIDA.VERSAO, c.motivo);
  const commit = createHash('sha256').update(mensagemCommit(raiz, sal), 'utf8').digest('hex');
  const id = randomUUID();
  /* A partida e o Liga MMR na MESMA transação (ST-11.4): a partida gravada sem
     o rating aplicado — ou o contrário — é rating criado ou sumido. */
  emTransacao(db, () => {
    db.prepare(`INSERT INTO league_matches (id, idem_key, snap_a, snap_b, user_a, user_b, raiz, sal, commit_hash, semente,
                  versao_motor, versao_conteudo, vencedor, turnos, log_json, criada_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, idem, a.id, b.id, a.user, userId, raiz, sal, commit, c.semente, c.versaoMotor, c.versaoConteudo, c.vencedor, c.turnos,
           JSON.stringify(c.log), agora);
    aplicarPartida(db, { id, userA: a.user, userB: userId, vencedor: c.vencedor, agora });
  });
  return publica(db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id));
}

/* A partida tem LINK PRÓPRIO (I.1): quem tem o id a revê — o replay é
   público, como o reveal da Arena. */
export function partidaDe(db, id) {
  const l = db.prepare(`SELECT * FROM league_matches WHERE id = ?`).get(id);
  if (!l) throw falha(ERRO_PARTIDA.SEM_PARTIDA, 'essa partida não existe');
  return publica(l);
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
    /* O tier e as partidas de quem pede — o rating exato fica no servidor (§9.7). */
    'GET /api/equipe/tier': ({ db, userId }) => ({ corpo: tierDaConta(db, userId) }),
    'GET /api/equipe/partida': ({ db, query }) => {
      const id = texto(query?.get?.('id'));
      if (!id) return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'partida inválida' } };
      return tentar(() => ({ partida: partidaDe(db, id) }));
    },
  };
}
