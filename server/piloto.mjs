/* O RELATÓRIO DO PILOTO (ST-7.2c, PILOTO-01).
 *
 * O aceite do piloto é "problemas priorizados por evidência; saldos e emissão
 * medidos contra a ST-3.3". Este arquivo transforma o banco do piloto nessa
 * evidência — uma função pura sobre o banco, e a ferramenta
 * `tools/relatorio-piloto.mjs` só a imprime.
 *
 * ── A EMISSÃO É COMPARADA POR JOGADOR-DIA, E NÃO POR JOGADOR ────────────
 *
 * A ST-3.3 mediu três perfis por DIA: casual (2 runs), diário (8) e maratona
 * (48). Um amigo não é um perfil — ele é casual na terça e maratona no sábado.
 * Então cada jogador-dia é posto ao lado do perfil de que mais se aproxima em
 * runs (distância em escala log: 4 runs estão tão longe de 2 quanto de 8), e
 * as moedas e encontros medidos daquele grupo são divididos pela referência.
 * Razão perto de 1 é a calibração valendo; longe de 1 é o achado.
 *
 * A referência é passada por parâmetro (a ferramenta lê a fixture da ST-3.3):
 * o servidor não lê arquivo de teste. */
import { gateDaV2Servidor } from './gate-v2.mjs';
import { diaDe, retencao, instanteDoFato } from './coorte.mjs';

const DIA = 86400e3;
const FUSO = 3 * 3600e3;
const dataDoDia = d => new Date(d * DIA + FUSO).toISOString().slice(0, 10);
const campos = l => { try { return JSON.parse(l.campos ?? '{}') ?? {}; } catch { return {}; } };

function quantis(valores) {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return { contas: 0, mediana: 0, p90: 0, maximo: 0, total: 0 };
  const q = p => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const meio = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { contas: v.length, mediana: meio, p90: q(0.9), maximo: v[v.length - 1], total: v.reduce((a, b) => a + b, 0) };
}
const mediana = v => quantis(v).mediana;

export const PERFIS_DA_ST33 = { casual: 2, diario: 8, maratona: 48 };
export function perfilMaisProximo(runs) {
  let melhor = null, dist = Infinity;
  for (const [nome, alvo] of Object.entries(PERFIS_DA_ST33)) {
    const d = Math.abs(Math.log(Math.max(runs, 0.5)) - Math.log(alvo));
    if (d < dist - 1e-12) { dist = d; melhor = nome; }
  }
  return melhor;
}

export function relatorioDoPiloto(db, { agora = Date.now(), dias = 14, referencia = null } = {}) {
  const hoje = diaDe(agora), primeiro = hoje - dias + 1;
  const noPeriodo = d => d >= primeiro && d <= hoje;

  const usuarios = db.prepare('SELECT id, status, created_at FROM users').all();
  const contas = {
    total: usuarios.length,
    ativas: usuarios.filter(u => u.status === 'ativo').length,
    congeladas: usuarios.filter(u => u.status === 'congelado').length,
    novasNoPeriodo: usuarios.filter(u => noPeriodo(diaDe(u.created_at))).length,
  };

  /* Todos os eventos, cada um no dia do FATO. */
  const linhas = db.prepare('SELECT nome, user_id, criado_em, campos FROM telemetry_events WHERE user_id IS NOT NULL').all()
    .map(l => ({ ...l, dia: diaDe(instanteDoFato(l)), c: campos(l) }))
    .filter(l => noPeriodo(l.dia));
  const atividade = db.prepare('SELECT user_id, criado_em FROM player_activity').all()
    .map(a => ({ user_id: a.user_id, dia: diaDe(a.criado_em) })).filter(a => noPeriodo(a.dia));

  const porDia = new Map();
  for (const x of [...linhas, ...atividade]) {
    if (!porDia.has(x.dia)) porDia.set(x.dia, new Set());
    porDia.get(x.dia).add(x.user_id);
  }
  const ativosPorDia = [];
  for (let d = primeiro; d <= hoje; d++) ativosPorDia.push({ data: dataDoDia(d), jogadores: porDia.get(d)?.size ?? 0 });

  const eventos = {};
  for (const l of linhas) eventos[l.nome] = (eventos[l.nome] ?? 0) + 1;

  /* ── O IDLE, POR JOGADOR-DIA ── */
  const jd = new Map();
  for (const l of linhas.filter(l => l.nome === 'run_harvested')) {
    const k = `${l.user_id}|${l.dia}`;
    const a = jd.get(k) ?? { runs: 0, moedas: 0, encontros: 0 };
    a.runs++; a.moedas += Number(l.c.moedas) || 0; a.encontros += Number(l.c.encontros) || 0;
    jd.set(k, a);
  }
  const grupos = { casual: [], diario: [], maratona: [] };
  for (const a of jd.values()) grupos[perfilMaisProximo(a.runs)].push(a);
  const contraReferencia = {};
  for (const [perfil, lista] of Object.entries(grupos)) {
    if (!lista.length) continue;
    const medido = { runsPorDia: mediana(lista.map(a => a.runs)), moedasPorDia: mediana(lista.map(a => a.moedas)),
                     encontrosPorDia: mediana(lista.map(a => a.encontros)) };
    const ref = referencia?.perfis?.[perfil]?.estagio1;
    const r = ref ? { runsPorDia: ref.runsPorDia, moedasPorDia: ref.porDia?.pokecoin ?? null,
                      encontrosPorDia: ref.porDia?.encontros ?? null } : null;
    contraReferencia[perfil] = {
      jogadorDias: lista.length, medido, referencia: r,
      razao: r ? { moedas: r.moedasPorDia ? medido.moedasPorDia / r.moedasPorDia : null,
                   encontros: r.encontrosPorDia ? medido.encontrosPorDia / r.encontrosPorDia : null } : null,
    };
  }
  const idle = {
    jogadorDias: jd.size,
    perfis: Object.fromEntries(Object.entries(grupos).map(([k, v]) => [k, v.length])),
    expedicoes: eventos.expedition_harvested ?? 0,
    contraReferencia,
  };

  /* ── SALDOS: o que está na mão agora, por balde ── */
  const baldes = {};
  for (const r of db.prepare('SELECT bucket, saldo FROM carteiras').all())
    (baldes[r.bucket] ??= []).push(r.saldo);
  const saldos = Object.fromEntries(Object.entries(baldes).map(([b, v]) => [b, quantis(v)]));

  /* ── A ARENA E A BOUTIQUE, pelo que o SERVIDOR anotou ── */
  const apostas = linhas.filter(l => l.nome === 'bet_placed');
  const compras = linhas.filter(l => l.nome === 'cosmetic_purchased');
  const arena = {
    apostas: apostas.length, apostado: apostas.reduce((s, l) => s + (Number(l.c.valor) || 0), 0),
    apostadores: new Set(apostas.map(l => l.user_id)).size,
    compras: compras.length, gasto: compras.reduce((s, l) => s + (Number(l.c.preco) || 0), 0),
  };

  return {
    periodo: { de: dataDoDia(primeiro), ate: dataDoDia(hoje), dias },
    contas, retencao: retencao(db, { agora, dias: Math.max(dias, 30) }).coortes.map(c => ({ ...c, data: dataDoDia(c.dia) })),
    ativosPorDia, eventos, idle, saldos, arena,
    /* ST-12.10: o bolo e o gate da V2, pela mesma conta do painel. */
    bolo: gateDaV2Servidor(db, { agora, dias }),
  };
}
