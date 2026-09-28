/* A LUTA DA JORNADA NO SERVIDOR (ST-13.7 · E13 · L-208).
 *
 * A conta é a do aparelho, do mesmo arquivo (`contaDaLuta`, camada 0). Aqui
 * mora o que precisa de banco:
 *
 *   A SEMENTE   é do servidor, sorteada a cada luta. O corpo traz a intenção
 *               (o nó, o preset, a chave do pedido); uma semente no corpo é
 *               ignorada — escolher a semente é escolher o resultado
 *   O TIME      é o que o servidor conhece: a equipe da conta, com os golpes
 *               guardados (ST-13.3b)
 *   A CHANCE    que a tela mostrou é refeita aqui (`chanceDaLuta`, a mesma
 *               raiz) — o evento leva a chance sem que o cliente a declare
 *   O PROGRESSO e a recompensa gravam na MESMA transação da luta (ST-10.17:
 *               a vitória e o pagamento não se separam)
 *   OS FATOS    `pve_iniciado` e `ginasio_vencido` nascem AQUI, com
 *               `origem: 'servidor'` — quem decide a luta os anota (L-208)
 *
 * Duas guardas, cada uma no seu lugar (a lição do S564):
 *
 *   a chave do pedido é a CHAVE PRIMÁRIA da luta: o reenvio devolve a luta
 *   gravada (`repetido: true`), e dois pedidos com a mesma chave não lutam
 *   duas vezes
 *   o progresso só grava sobre a revisão que foi lida (a cláusula `revisao =
 *   ?`): duas lutas simultâneas não pagam a "primeira vez" duas vezes
 */
import { randomInt } from 'node:crypto';
import { contaDaLuta, chanceDaLuta } from '../app/modules/jornada-conta.mjs';
import { eventoDaLuta, eventoDoGinasio } from '../app/modules/telemetria-v4.mjs';
import { PRESETS } from '../engine/treino-batalha.mjs';
import { diaDoMundo } from '../engine/avanco.mjs';
import { criaturasDaConta, creditarBolsa } from './idle.mjs';
import { doJogador } from './criaturas.mjs';
import { emitir } from './telemetria.mjs';

export const ERRO_JORNADA = Object.freeze({
  CHAVE: 'JORNADA_CHAVE_INVALIDA', PRESET: 'JORNADA_PRESET_INVALIDO', CONFLITO: 'JORNADA_CONFLITO' });
const falha = (codigo, msg) => Object.assign(new Error(msg), { codigo });
const CHAVE_OK = /^[\w-]{8,64}$/;

function emTransacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { try { db.exec('ROLLBACK'); } catch {} throw e; }
}

/* O progresso da conta, e a revisão sobre a qual a próxima luta grava. Sem
   linha, revisão −1: a primeira luta cria. */
export function jornadaDaConta(db, userId) {
  const l = db.prepare(`SELECT progresso_json, revisao FROM jornadas WHERE user_id = ?`).get(userId);
  return l ? { jornada: JSON.parse(l.progresso_json), revisao: l.revisao } : { jornada: null, revisao: -1 };
}

export function lutarNaConta(db, { userId, pack, id, preset = 'balanced', chaveIdem, agora, semente = randomInt(0, 2 ** 32) }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem)) throw falha(ERRO_JORNADA.CHAVE, 'chave do pedido inválida');
  if (!PRESETS.includes(preset)) throw falha(ERRO_JORNADA.PRESET, `preset desconhecido: ${preset}`);
  const idem = `pve:${userId}:${chaveIdem}`;
  const ja = db.prepare(`SELECT resposta_json FROM lutas_jornada WHERE idem_key = ?`).get(idem);
  if (ja) return { ...JSON.parse(ja.resposta_json), repetido: true };

  /* O IV e a natureza lutam (`paraTreino`): a conta os lê como o save os
     guarda — o IV em lista e a natureza pelo nome. */
  const ocultos = new Map(doJogador(db, userId, pack).map(c => [c.id, { iv: c.iv, natureza: c.natureza?.nome }]));
  const criaturas = criaturasDaConta(db, userId).map(c => ({ ...c, ...ocultos.get(c.id) }));
  const { jornada, revisao } = jornadaDaConta(db, userId);
  const c = contaDaLuta({ pack, criaturas, jornada, id, preset, semente, dia: diaDoMundo(agora) });
  if (!c.ok) throw new Error(c.motivo);
  const p = chanceDaLuta({ pack, criaturas, id, preset })?.p ?? null;
  const venceu = c.resultado.vencedor === 'A';
  const resposta = {
    ok: true, no: id, preset, semente, venceu, vencedor: c.resultado.vencedor, primeiraVez: c.primeiraVez,
    ganhouInsignia: c.ganhouInsignia, p, timeA: c.timeA, timeB: c.timeB,
    progresso: { vencidos: c.jornada.vencidos, insignias: c.jornada.insignias },
    recompensa: { motivo: c.recompensa.motivo, ...c.credito },
  };

  return emTransacao(db, () => {
    const gravar = revisao < 0
      ? db.prepare(`INSERT INTO jornadas (user_id, progresso_json, revisao, atualizada_em) VALUES (?, ?, 0, ?)
                    ON CONFLICT (user_id) DO NOTHING`).run(userId, JSON.stringify(c.jornada), agora)
      : db.prepare(`UPDATE jornadas SET progresso_json = ?, revisao = revisao + 1, atualizada_em = ?
                    WHERE user_id = ? AND revisao = ?`).run(JSON.stringify(c.jornada), agora, userId, revisao);
    if (!gravar.changes) throw falha(ERRO_JORNADA.CONFLITO, 'a jornada mudou durante a luta — tente de novo');
    db.prepare(`INSERT INTO lutas_jornada (idem_key, user_id, no, preset, semente, venceu, p, resposta_json, criada_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(idem, userId, id, preset, semente, venceu ? 1 : 0, p, JSON.stringify(resposta), agora);
    for (const [k, n] of Object.entries(c.credito.bolsa)) creditarBolsa(db, userId, k, n);
    for (const [linha, n] of Object.entries(c.credito.doces)) {
      db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at) VALUES (?, ?, ?, 'pve', ?, ?)`)
        .run(userId, Number(linha), n, `${idem}:${linha}`, agora);
      db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade) VALUES (?, ?, ?)
                  ON CONFLICT (user_id, species_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade`)
        .run(userId, Number(linha), n);
    }
    /* Os fatos da V4, com a chave do servidor (`srv:`): a do cliente é outra,
       e um relato do aparelho não pode ocupar a vaga do fato. */
    const doServidor = e => emitir(db, { nome: e.nome, userId, chave: `srv:${e.chave}`, campos: { ...e.campos, origem: 'servidor' }, agora });
    doServidor(eventoDaLuta({ no: id, semente, p, preset, timeA: c.timeA, venceu, agora }));
    if (c.ganhouInsignia) doServidor(eventoDoGinasio({ no: id, insignia: c.ganhouInsignia, agora }));
    return resposta;
  });
}
