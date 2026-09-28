/* O GATE DA V3 NO SERVIDOR — junta o que o banco sabe e pergunta ao motor
 * (ST-9.18 · F3.13 · Spec §7.20, §7.21).
 *
 * A conta e as metas são de `engine/gate-v3.mjs`; aqui só se lê. As apostas
 * vêm de `bets` (o servidor as anotou — o cliente nunca diz em quem apostou);
 * o dossiê, a captura, o doce, a evolução e a soltura vêm da telemetria do
 * cliente, cada evento no instante do FATO (`instanteDoFato`).
 */
import { DETECCAO_MEDIDA } from '../engine/antifraude.mjs';
import { diversidadeAntesDepois, d7PorCaptura, gateDaV3 } from '../engine/gate-v3.mjs';
import { diaDe, instanteDoFato } from './coorte.mjs';

const campos = l => { try { return JSON.parse(l.campos ?? '{}') ?? {}; } catch { return {}; } };

export function gateDaV3Servidor(db, { agora = Date.now() } = {}) {
  const hoje = diaDe(agora);
  const eventos = db.prepare(`SELECT nome, user_id, criado_em, campos FROM telemetry_events WHERE user_id IS NOT NULL`).all()
    .map(l => ({ nome: l.nome, user: l.user_id, em: instanteDoFato(l), c: campos(l) }));
  const de = nome => eventos.filter(e => e.nome === nome);

  /* ── DIVERSIDADE, antes e depois da PRIMEIRA consulta ── */
  const primeira = new Map();
  for (const e of de('dossie_consultado'))
    if (!primeira.has(e.user) || e.em < primeira.get(e.user)) primeira.set(e.user, e.em);
  const apostas = new Map();
  for (const b of db.prepare(`SELECT user_id, species_id, created_at FROM bets WHERE status <> 'cancelada'`).all()) {
    if (!apostas.has(b.user_id)) apostas.set(b.user_id, []);
    apostas.get(b.user_id).push({ em: b.created_at, especie: b.species_id });
  }
  const diversidade = diversidadeAntesDepois([...apostas.entries()]
    .map(([user, lista]) => ({ apostas: lista, primeiraConsulta: primeira.get(user) ?? null })));

  /* ── D7 de quem capturou, por faixa de atividade no dia do cadastro ── */
  const atividade = new Map();   // user -> Map(dia -> quantos)
  const marcar = (u, t) => {
    if (!atividade.has(u)) atividade.set(u, new Map());
    const m = atividade.get(u), d = diaDe(t);
    m.set(d, (m.get(d) ?? 0) + 1);
  };
  for (const e of eventos) marcar(e.user, e.em);
  for (const a of db.prepare(`SELECT user_id, criado_em FROM player_activity`).all()) marcar(a.user_id, a.criado_em);
  const capturou = new Set(de('creature_captured').map(e => e.user));
  const usuarios = db.prepare(`SELECT id, created_at FROM users`).all().map(u => {
    const d0 = diaDe(u.created_at), m = atividade.get(u.id);
    return { capturou: capturou.has(u.id), atividadeDia0: m?.get(d0) ?? 0,
             voltouD7: hoje >= d0 + 7 ? (m?.get(d0 + 7) ?? 0) > 0 : null };
  });
  const d7 = d7PorCaptura(usuarios);

  /* ── Os KPIs do §7.20 que são contagem simples ── */
  const ativos = new Set(eventos.map(e => e.user));
  const quem = nome => new Set(de(nome).map(e => e.user)).size;
  const consultas = de('dossie_consultado');
  const jogadorDias = new Set(eventos.map(e => `${e.user}|${diaDe(e.em)}`)).size;
  const kpis = {
    ativos: ativos.size,
    evoluiu: ativos.size ? quem('evolucao_feita') / ativos.size : null,
    comparou: ativos.size ? quem('moveset_comparado') / ativos.size : null,
    consultasAntesDeApostar: consultas.length ? consultas.filter(e => e.c.antesDeApostar === true).length / consultas.length : null,
    consultas: consultas.length,
    capturas: de('creature_captured').length, jogadorDias,
    docesGastos: de('doce_gasto').reduce((a, e) => a + (Number(e.c.quantidade) || 0), 0),
    soltas: de('criatura_solta').length,
  };
  return { kpis, diversidade, d7,
           gate: gateDaV3({ diversidade, capturas: { total: kpis.capturas, jogadorDias }, antifraude: DETECCAO_MEDIDA }) };
}
