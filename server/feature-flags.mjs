/* AS BANDEIRAS NO SERVIDOR (ST-11.9 · Spec §15.3, §25.1).
 *
 * O estado mora em `feature_flags`; a regra de poder, em
 * `engine/feature-flags.mjs`. Mudar passa pelo `agir` do admin — papel
 * `dono`, motivo escrito, confirmação explícita, e o registro gravado ANTES de
 * executar: a tentativa de ligar o dinheiro sem o checkpoint fica na
 * auditoria mesmo recusada, que é exatamente a que se quer ver depois.
 */
import { BANDEIRAS, CHECKPOINT_25_1, recusaDaMudanca, estadoDa } from '../engine/feature-flags.mjs';
import { agir, ERRO_ADMIN } from './admin.mjs';

export const ERRO_BANDEIRA = { RECUSADA: 'bandeira_recusada', DESLIGADA: 'feature_desligada' };
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });

const gravada = (db, nome) => db.prepare(`SELECT ligada FROM feature_flags WHERE nome = ?`).get(nome)?.ligada;

export const bandeiraLigada = (db, nome, checkpoint = CHECKPOINT_25_1) => estadoDa(nome, gravada(db, nome), checkpoint);

export const bandeiras = (db, checkpoint = CHECKPOINT_25_1) =>
  Object.keys(BANDEIRAS).map(nome => ({ nome, ligada: bandeiraLigada(db, nome, checkpoint), valor: BANDEIRAS[nome].valor }));

export function mudarBandeira(db, { operadorId, nome, ligada, motivo, confirmado = false, agora, checkpoint = CHECKPOINT_25_1 }) {
  if (!BANDEIRAS[nome]) throw falha(ERRO_ADMIN.ACAO, `bandeira desconhecida: ${nome}`);
  const de = bandeiraLigada(db, nome, checkpoint);
  return agir(db, { operadorId, acao: 'bandeira.definir', alvo: nome, de: String(de), para: String(ligada), motivo, confirmado, agora }, op => {
    const recusa = recusaDaMudanca(nome, ligada, checkpoint);
    if (recusa) throw falha(ERRO_BANDEIRA.RECUSADA, recusa);
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, ?, ?, ?)
                ON CONFLICT(nome) DO UPDATE SET ligada = excluded.ligada, atualizada_em = excluded.atualizada_em, atualizada_por = excluded.atualizada_por`)
      .run(nome, ligada ? 1 : 0, agora, op.id);
    return { nome, ligada: bandeiraLigada(db, nome, checkpoint) };
  });
}

/* A porta da feature: a rota pergunta aqui antes de agir. */
export function exigirBandeira(db, nome) {
  if (!bandeiraLigada(db, nome)) throw falha(ERRO_BANDEIRA.DESLIGADA, `esta parte do jogo está desligada agora (${nome})`);
}
