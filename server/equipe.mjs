/* O TIME DA LIGA NO SERVIDOR — o snapshot de defesa (ST-11.1 · F5.1 · Spec §9.4).
 *
 * A conta é a da camada 0 (`snapshotDoTime`); aqui mora o que precisa de
 * banco: a POSSE (as criaturas vêm da conta de quem pede, e só dela — um id
 * de outro jogador é "não é sua"), e a gravação numa tabela que os gatilhos
 * não deixam mudar nem apagar. O corpo traz a intenção (quais, e o preset);
 * o nível, os golpes, o IV e a natureza são os que o SERVIDOR conhece.
 */
import { randomUUID } from 'node:crypto';
import { snapshotDoTime } from '../app/modules/snapshot-dados.mjs';
import { criaturasParaLuta } from './jornada.mjs';
import PACK from '../content/escolhido.mjs';

export const ERRO_EQUIPE = Object.freeze({ SEM_SNAPSHOT: 'EQUIPE_SEM_SNAPSHOT', TIME: 'EQUIPE_TIME_INVALIDO' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

const doBanco = l => ({ id: l.id, pack: l.pack_id, versaoMotor: l.versao_motor, versaoConteudo: l.versao_conteudo,
                        preset: l.preset, time: JSON.parse(l.time_json), power: l.power, criadoEm: l.criado_em });

export function criarSnapshot(db, { userId, pack, ids, preset = 'balanced', agora, id = randomUUID() }) {
  const s = snapshotDoTime({ pack, criaturas: criaturasParaLuta(db, userId, pack), ids, preset });
  if (!s.ok) throw falha(ERRO_EQUIPE.TIME, s.motivo);
  db.prepare(`INSERT INTO team_snapshots (id, user_id, pack_id, versao_motor, versao_conteudo, preset, time_json, power, criado_em)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, userId, pack.id, s.versaoMotor, s.versaoConteudo, s.preset, JSON.stringify(s.time), s.power, agora);
  return { id, pack: pack.id, versaoMotor: s.versaoMotor, versaoConteudo: s.versaoConteudo, preset: s.preset, time: s.time, power: s.power, criadoEm: agora };
}

/* O dono NÃO viaja na resposta; o de outro jogador não existe para quem pede. */
export function snapshotDe(db, { userId, id }) {
  const l = db.prepare(`SELECT * FROM team_snapshots WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!l) throw falha(ERRO_EQUIPE.SEM_SNAPSHOT, 'esse time não existe');
  return doBanco(l);
}
/* O time de QUALQUER jogador, com o dono — só para o servidor parear e lutar
   (ST-11.2); nenhuma rota devolve isto como está. */
export function snapshotPorId(db, id) {
  const l = db.prepare(`SELECT * FROM team_snapshots WHERE id = ?`).get(id);
  return l ? { ...doBanco(l), user: l.user_id } : null;
}
export const snapshotsDe = (db, userId) =>
  db.prepare(`SELECT * FROM team_snapshots WHERE user_id = ? ORDER BY criado_em DESC, id`).all(userId).map(doBanco);

const texto = v => (typeof v === 'string' && v.length > 0 && v.length <= 80 ? v : null);
export function rotasDaEquipe(daExcecao) {
  const tentar = fn => { try { return { corpo: fn() }; } catch (e) { return daExcecao(e); } };
  return {
    /* Congelar o time: a intenção é a lista de ids e o preset. */
    'POST /api/equipe/snapshot': ({ db, corpo, userId, agora }) => {
      const ids = corpo?.ids, preset = corpo?.preset ?? 'balanced';
      if (!Array.isArray(ids) || !ids.every(texto) || typeof preset !== 'string')
        return { status: 400, corpo: { codigo: 'ENTRADA_INVALIDA', erro: 'time inválido' } };
      return tentar(() => ({ snapshot: criarSnapshot(db, { userId, pack: PACK, ids, preset, agora }) }));
    },
    'GET /api/equipe/snapshots': ({ db, userId }) => ({ corpo: { snapshots: snapshotsDe(db, userId) } }),
  };
}
