/* A ESCADA DA POKÉDEX E AS MISSÕES DA SEMANA NA CONTA (ST-13.9b · D-136).
 *
 * Com conta, o que a escada mede e o que a missão paga moravam no aparelho:
 * as marcas da Arena em `ar_escada_arena`, o "já possuiu" e a missão da
 * semana no save. O prêmio da missão resgatada sumia na leitura seguinte da
 * conta (a bolsa é do servidor), e a missão ficava marcada como resgatada.
 *
 * A regra é a do aparelho, do mesmo arquivo (`colecao-dados.mjs`: as três
 * missões, a base da semana, o prêmio). Aqui mora o que precisa de banco:
 *   - as MARCAS — "encontrada" e "vista" entram por gatilho a cada aposta, e
 *     "vista" também pela rodada que o jogador assistiu (a rota manda a
 *     RODADA, e o servidor marca os lutadores dela — nunca uma lista de
 *     espécies vinda do navegador);
 *   - o JÁ POSSUIU — por gatilho a cada criatura que nasce ou evolui;
 *   - a SEMANA — a base, aberta na primeira leitura dela, e as resgatadas.
 */
import { missoesDaSemana, resgatarMissao } from '../app/modules/colecao-dados.mjs';
import { criaturasDaConta, registroDe, creditarBolsa } from './idle.mjs';
import { emTransacao } from './carteira.mjs';
import { registrarFeito } from './progressao.mjs';

/* A rodada assistida marca só enquanto é recente: um id velho guardado não
   vira "vi hoje" uma semana depois — é o que a missão "veja 20" mede. */
export const VISTA_VALE_MS = 6 * 3600_000;

export function marcasDe(db, userId) {
  const m = { vistas: [], encontradas: [] };
  for (const l of db.prepare(`SELECT dex, tipo FROM escada_marcas WHERE user_id = ? ORDER BY dex`).all(userId))
    (l.tipo === 'vista' ? m.vistas : m.encontradas).push(l.dex);
  return m;
}

export const jaPossuiuDe = (db, userId, packId) =>
  db.prepare(`SELECT dex FROM ja_possuiu WHERE user_id = ? AND pack_id = ? ORDER BY dex`).all(userId, packId).map(l => l.dex);

export function marcarVistasDaRodada(db, { userId, rodada, agora }) {
  const r = db.prepare(`SELECT betting_opens_at AS abre FROM rounds WHERE id = ?`).get(rodada);
  if (!r) throw new Error('esta rodada não existe');
  if (agora - r.abre > VISTA_VALE_MS) throw new Error('esta rodada já passou');
  const n = db.prepare(`INSERT OR IGNORE INTO escada_marcas SELECT ?, species_id, 'vista'
                          FROM round_fighters WHERE round_id = ?`).run(userId, rodada).changes;
  /* O DESAFIO "ASSISTIR" (ST-13.9c · L-054) anda uma vez por RODADA: o mesmo
     id mandado de novo não conta de novo. */
  const primeira = db.prepare(`INSERT OR IGNORE INTO rodadas_assistidas (user_id, round_id, em) VALUES (?, ?, ?)`)
    .run(userId, rodada, agora).changes > 0;
  if (primeira) registrarFeito(db, { userId, tipo: 'assistir', agora });
  return { rodada, novas: n };
}

/* O estado que as missões medem, no formato do aparelho: as criaturas (dex),
   o "já possuiu", o registro `{ dex: fragmentos }` e a semana gravada. */
function estadoDaConta(db, userId, pack) {
  const row = db.prepare(`SELECT semana, base_json, resgatadas_json FROM missoes_semana WHERE user_id = ?`).get(userId);
  return {
    criaturas: criaturasDaConta(db, userId).map(c => ({ dex: c.dex })),
    jaPossuiu: jaPossuiuDe(db, userId, pack.id),
    registro: Object.fromEntries(registroDe(db, userId, pack.id).map(r => [r.dex, r.fragmentos])),
    missoes: row ? { semana: row.semana, base: JSON.parse(row.base_json), resgatadas: JSON.parse(row.resgatadas_json) } : null,
    bolsa: {},
  };
}

const gravarSemana = (db, userId, m) =>
  db.prepare(`INSERT INTO missoes_semana (user_id, semana, base_json, resgatadas_json) VALUES (?, ?, ?, ?)
              ON CONFLICT (user_id) DO UPDATE SET semana = excluded.semana, base_json = excluded.base_json,
                                                  resgatadas_json = excluded.resgatadas_json`)
    .run(userId, m.semana, JSON.stringify(m.base), JSON.stringify(m.resgatadas));

/* A semana, aberta na primeira leitura dela — como no aparelho ("abrir a
   semana também grava": a base precisa existir antes do progresso). */
export function missoesDaConta(db, { userId, pack, agora }) {
  const e = estadoDaConta(db, userId, pack), antes = e.missoes?.semana;
  const quadro = missoesDaSemana(e, { marcas: marcasDe(db, userId), agora });
  if (antes !== e.missoes.semana) gravarSemana(db, userId, e.missoes);
  return { missoes: e.missoes, quadro };
}

/* O RESGATE: a regra do aparelho decide (pronta, não resgatada) e o prêmio
   vai para a bolsa da conta — na mesma transação que marca a resgatada. */
export function resgatarMissaoNaConta(db, { userId, pack, id, agora }) {
  return emTransacao(db, () => {
    const e = estadoDaConta(db, userId, pack), marcas = marcasDe(db, userId);
    const r = resgatarMissao(pack, e, { id, marcas, agora });
    if (!r.ok) throw new Error(r.motivo);
    for (const [chave, n] of Object.entries(e.bolsa)) if (n > 0) creditarBolsa(db, userId, chave, n);
    gravarSemana(db, userId, e.missoes);
    return { id, premio: r.premio };
  });
}
