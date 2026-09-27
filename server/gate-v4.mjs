/* O GATE DA V4 NO SERVIDOR — junta o que o banco sabe e pergunta ao motor
 * (ST-10.20 · F4.9 · Spec §8.15, §8.16).
 *
 * A conta e as metas são de `engine/gate-v4.mjs`; aqui só se lê. As lutas e o
 * ginásio vencido vêm da telemetria do cliente (a jornada ainda mora no save
 * local — a coleção no servidor é o E13), cada evento no instante do FATO; as
 * PREVISÕES vêm de `predictions`, pontuadas pelo servidor — o cliente nunca
 * diz o quanto previu bem.
 */
import { aprendizadoDaJornada, kpisDaV4, gateDaV4 } from '../engine/gate-v4.mjs';
import { diaDe, instanteDoFato } from './coorte.mjs';
import { VERSAO_PONTUACAO } from '../engine/calibracao.mjs';

const campos = l => { try { return JSON.parse(l.campos ?? '{}') ?? {}; } catch { return {}; } };

export function gateDaV4Servidor(db, { agora = Date.now(), primeiroGinasio = 'pewter' } = {}) {
  const eventos = db.prepare(`SELECT nome, user_id, criado_em, campos FROM telemetry_events WHERE user_id IS NOT NULL`).all()
    .map(l => ({ nome: l.nome, user: l.user_id, em: instanteDoFato(l), c: campos(l) }));

  const lutas = eventos.filter(e => e.nome === 'pve_iniciado').map(e => ({
    user: e.user, em: e.em, no: String(e.c.no ?? ''), venceu: e.c.venceu === true, p: Number(e.c.p),
    especies: String(e.c.especies ?? '').split(',').map(Number).filter(Number.isFinite).filter(Boolean),
    tamanho: Number(e.c.tamanho) || 0 }));

  /* A última atividade de cada um: qualquer evento, ou atividade de arena. */
  const atividade = {};
  const marcar = (u, t) => { if (!(atividade[u] >= t)) atividade[u] = t; };
  for (const e of eventos) marcar(e.user, e.em);
  for (const a of db.prepare(`SELECT user_id, criado_em FROM player_activity`).all()) marcar(a.user_id, a.criado_em);

  /* O APRENDIZADO: as previsões pontuadas, e o instante do primeiro ginásio. */
  const brock = new Map();
  for (const e of eventos.filter(x => x.nome === 'ginasio_vencido' && x.c.no === primeiroGinasio))
    if (!brock.has(e.user) || e.em < brock.get(e.user)) brock.set(e.user, e.em);
  const previsoes = new Map();
  for (const p of db.prepare(`SELECT user_id, created_at, score FROM predictions WHERE score IS NOT NULL AND scoring_version = ?`).all(VERSAO_PONTUACAO)) {
    if (!previsoes.has(p.user_id)) previsoes.set(p.user_id, []);
    previsoes.get(p.user_id).push({ em: p.created_at, brier: p.score });
  }
  const aprendizado = aprendizadoDaJornada([...previsoes.entries()].map(([u, lista]) => ({ previsoes: lista, brock: brock.get(u) ?? null })));

  const kpis = kpisDaV4({ lutas, atividade, agora });
  /* D30 por coorte de cadastro: quem tem 30 dias e voltou no dia 30. */
  const hoje = diaDe(agora), ativoNoDia = new Set(eventos.map(e => `${e.user}|${diaDe(e.em)}`));
  for (const a of db.prepare(`SELECT user_id, criado_em FROM player_activity`).all()) ativoNoDia.add(`${a.user_id}|${diaDe(a.criado_em)}`);
  const elegiveis = db.prepare(`SELECT id, created_at FROM users`).all().filter(u => hoje >= diaDe(u.created_at) + 30);
  kpis.d30 = { n: elegiveis.length, valor: elegiveis.length ? elegiveis.filter(u => ativoNoDia.has(`${u.id}|${diaDe(u.created_at) + 30}`)).length / elegiveis.length : null };
  kpis.chancesVistas = eventos.filter(e => e.nome === 'p_exibida').length;

  return { kpis, aprendizado, gate: gateDaV4({ kpis, aprendizado }) };
}
