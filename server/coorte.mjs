/* A RETENÇÃO D1/D7, POR COORTE DE CADASTRO (ST-7.1a, OBS-01).
 *
 * A pergunta do piloto é uma só: quem entrou volta? A coorte é o DIA do
 * cadastro no relógio do mundo (Brasília, DEC-10), e "voltou no dia N" é ter
 * qualquer rastro de atividade naquele dia — um evento de telemetria (a sessão,
 * a run, a colheita) ou uma atividade de arena (`player_activity`). Dois canais
 * porque o idle e a arena são dois jeitos de jogar, e a retenção de um produto
 * não pode depender de o jogador escolher o modo que a métrica enxerga.
 *
 * D7 de uma coorte que ainda não fez sete dias é `null`, e não zero: zero diria
 * "ninguém voltou", e o fato é que ainda não deu tempo. */
const DIA = 86400e3;
const FUSO_MIN = 180;   // o mesmo relógio do mundo de `hora-do-dia.mjs`
export const diaDe = t => Math.floor((Number(t) - FUSO_MIN * 60000) / DIA);

/* O INSTANTE DO FATO (ST-7.2c): o cliente relata o dia depois — no login, na
   colheita seguinte —, e a run conta no dia em que foi colhida. `campos.em` é
   do cliente e por isso só vale se não for do FUTURO em relação ao relato. */
export function instanteDoFato(linha) {
  let em = null;
  try { em = JSON.parse(linha.campos ?? '{}')?.em ?? null; } catch { em = null; }
  return Number.isFinite(em) && em <= linha.criado_em ? em : linha.criado_em;
}

export function retencao(db, { agora = Date.now(), dias = 30 } = {}) {
  const hoje = diaDe(agora);
  const usuarios = db.prepare(`SELECT id, created_at FROM users`).all()
    .map(u => ({ id: u.id, coorte: diaDe(u.created_at) }))
    .filter(u => u.coorte > hoje - dias);
  const ativo = new Map();
  const marcar = (id, t) => { if (!ativo.has(id)) ativo.set(id, new Set()); ativo.get(id).add(diaDe(t)); };
  for (const r of db.prepare(`SELECT user_id, criado_em, campos FROM telemetry_events WHERE user_id IS NOT NULL`).all())
    marcar(r.user_id, instanteDoFato(r));
  for (const r of db.prepare(`SELECT user_id, criado_em FROM player_activity`).all())
    marcar(r.user_id, r.criado_em);

  const porDia = new Map();
  for (const u of usuarios) {
    if (!porDia.has(u.coorte)) porDia.set(u.coorte, []);
    porDia.get(u.coorte).push(u);
  }
  const voltou = (lista, n) => lista.filter(u => ativo.get(u.id)?.has(u.coorte + n)).length;
  const coortes = [...porDia.entries()].sort(([a], [b]) => a - b).map(([dia, lista]) => ({
    dia, n: lista.length,
    d1: hoje >= dia + 1 ? voltou(lista, 1) : null,
    d7: hoje >= dia + 7 ? voltou(lista, 7) : null,
  }));
  return { coortes };
}
