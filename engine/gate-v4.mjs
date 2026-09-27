/* OS INDICADORES DA V4 E O GATE 4→5 (ST-10.20 · F4.9 · Spec §8.15, §8.16).
 *
 * Puro: entram lutas da jornada, previsões pontuadas e a última atividade de
 * cada jogador; saem os KPIs do §8.15 e o veredito de cada critério do §8.16 —
 * com o n, ou "amostra insuficiente". Mesma regra dos gates da V2 e da V3: ele
 * MEDE e não tranca (decisão do dono, 26/09).
 *
 * ── A PERGUNTA DO ÉPICO: A JORNADA ENSINA A APOSTAR? ───────────────────────
 *
 * Os ginásios existem para ensinar a LER o motor (§8.1.2). Se ensinam, quem
 * venceu o primeiro ginásio prevê melhor na Liga de Previsão depois do que
 * antes. Duas armadilhas, e as duas são desenho, e não detalhe:
 *
 *   A JANELA    as K últimas previsões antes contra as K primeiras depois, o
 *               mesmo K dos dois lados (entre `janelaMin` e `janelaMax`)
 *   A PRÁTICA   quem prevê mais prevê melhor com o tempo, tenha vencido o
 *               Brock ou não. O CONTROLE é quem nunca venceu, partido ao meio
 *               da própria história com a mesma janela; o efeito é a melhora
 *               de quem venceu MENOS a do controle. Sem controle, o efeito é
 *               `null` — e a melhora crua fica ao lado, para quem quiser ver
 *               o quanto dela era só prática.
 *
 * Brier: MENOR é melhor (`engine/calibracao.mjs`), e por isso a melhora é
 * `antes − depois`, positiva quando o jogador melhorou.
 *
 * ── "NUNCA MEDE SÓ QUEM TERMINOU" ─────────────────────────────────────────
 *
 * A conclusão de cada ginásio divide por quem TENTOU; o abandono conta quem
 * teve a última luta perdida e sumiu há sete dias; o time refeito é DERIVADO
 * da sequência de lutas (depois de uma derrota num nó, a próxima luta ali com
 * outras espécies) — o cliente não o declara, e não tem como inventá-lo.
 */

export const META_V4 = Object.freeze({
  janelaMin: 5, janelaMax: 10,
  tratadosAprendizado: 20,        // quem venceu o 1º ginásio, com janela dos dois lados
  lutasBalanceamento: 200,        // lutas para julgar a concentração do meta
  concentracaoMax: 0.25,          // nenhuma espécie em mais de 1/4 das vagas de time
  base: 30,                       // jogadores com time completo ativos em 7 dias
});
const INSUF = 'amostra insuficiente';
const media = v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const DIA = 86400e3;

/* ── O APRENDIZADO ─────────────────────────────────────────────────────────
   `usuarios`: [{ previsoes: [{ em, brier }], brock: ms | null }] */
function janela(ordem, corte) {
  const antes = ordem.slice(0, corte), depois = ordem.slice(corte);
  const k = Math.min(antes.length, depois.length, META_V4.janelaMax);
  if (k < META_V4.janelaMin) return null;
  return { antes: media(antes.slice(-k).map(p => p.brier)), depois: media(depois.slice(0, k).map(p => p.brier)) };
}
function grupo(pares) {
  if (!pares.length) return { n: 0, antes: null, depois: null, melhora: null };
  const antes = media(pares.map(p => p.antes)), depois = media(pares.map(p => p.depois));
  return { n: pares.length, antes, depois, melhora: antes - depois };
}
export function aprendizadoDaJornada(usuarios) {
  const tratados = [], controle = [];
  for (const u of usuarios ?? []) {
    const ordem = [...(u.previsoes ?? [])].filter(p => Number.isFinite(p.brier)).sort((a, b) => a.em - b.em);
    if (Number.isFinite(u.brock)) {
      const j = janela(ordem, ordem.filter(p => p.em < u.brock).length);
      if (j) tratados.push(j);
    } else {
      const j = janela(ordem, Math.floor(ordem.length / 2));
      if (j) controle.push(j);
    }
  }
  const t = grupo(tratados), c = grupo(controle);
  return { tratados: t, controle: c, efeito: t.n && c.n ? t.melhora - c.melhora : null };
}

/* ── O TIME REFEITO, derivado ──────────────────────────────────────────────
   Uma derrota conta quando o MESMO jogador lutou de novo no MESMO nó; ela foi
   "refeita" se as espécies da luta seguinte ali são outras. */
const assinatura = l => [...(l.especies ?? [])].sort((a, b) => a - b).join(',');
export function rebuilds(lutas) {
  const porUsuario = new Map();
  for (const l of lutas ?? []) {
    if (!porUsuario.has(l.user)) porUsuario.set(l.user, []);
    porUsuario.get(l.user).push(l);
  }
  let derrotas = 0, refeitos = 0;
  for (const lista of porUsuario.values()) {
    const ordem = lista.sort((a, b) => a.em - b.em);
    ordem.forEach((l, i) => {
      if (l.venceu) return;
      const prox = ordem.slice(i + 1).find(x => x.no === l.no);
      if (!prox) return;
      derrotas++;
      if (assinatura(prox) !== assinatura(l)) refeitos++;
    });
  }
  return { derrotas, refeitos, valor: derrotas ? refeitos / derrotas : null };
}

/* ── OS KPIs DO §8.15 ──────────────────────────────────────────────────────
   `lutas`: [{ user, em, no, venceu, p, especies: [dex], tamanho }]
   `atividade`: { user: último instante de QUALQUER atividade } */
export const FAIXAS_P = Object.freeze([[0, 0.3], [0.3, 0.7], [0.7, 1.0001]]);
export function kpisDaV4({ lutas = [], atividade = {}, agora = Date.now() }) {
  const usuarios = [...new Set(lutas.map(l => l.user))];
  const doUsuario = u => lutas.filter(l => l.user === u).sort((a, b) => a.em - b.em);

  const completo = usuarios.filter(u => Math.max(...doUsuario(u).map(l => l.tamanho ?? 0)) >= 6).length;
  const conclusao = {};
  for (const no of new Set(lutas.map(l => l.no))) {
    const tentaram = new Set(lutas.filter(l => l.no === no).map(l => l.user));
    const venceram = new Set(lutas.filter(l => l.no === no && l.venceu).map(l => l.user));
    conclusao[no] = { tentaram: tentaram.size, venceram: venceram.size, valor: venceram.size / tentaram.size };
  }
  const pararam = usuarios.filter(u => {
    const ultima = doUsuario(u).at(-1);
    return ultima && !ultima.venceu && (atividade[u] ?? ultima.em) < agora - 7 * DIA;
  }).length;
  const vagas = new Map();
  let aparicoes = 0;
  for (const l of lutas) for (const d of l.especies ?? []) { vagas.set(d, (vagas.get(d) ?? 0) + 1); aparicoes++; }
  const topo = [...vagas.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const jogadorDias = new Set(lutas.map(l => `${l.user}|${Math.floor(l.em / DIA)}`)).size;
  /* A chance EXIBIDA é calibrada? Por faixa: quantas lutas, quantas vencidas. */
  const calibracao = FAIXAS_P.map(([de, ate]) => {
    const dentro = lutas.filter(l => Number.isFinite(l.p) && l.p >= de && l.p < ate);
    return { de, ate: Math.min(1, ate), n: dentro.length, venceu: dentro.filter(l => l.venceu).length,
             media: media(dentro.map(l => l.p)) };
  });
  return {
    jogadores: usuarios.length, lutas: lutas.length,
    timeCompleto: { n: usuarios.length, valor: usuarios.length ? completo / usuarios.length : null },
    lutasPorJogadorDia: jogadorDias ? lutas.length / jogadorDias : null,
    conclusao,
    variedade: vagas.size,
    concentracao: { dex: topo?.[0] ?? null, n: aparicoes, lutas: lutas.length, valor: aparicoes ? topo[1] / aparicoes : null },
    abandono: { n: usuarios.length, pararam, valor: usuarios.length ? pararam / usuarios.length : null },
    rebuilds: rebuilds(lutas),
    calibracao,
    /* A base do §8.16: time completo e atividade nos últimos sete dias. */
    baseAtiva: usuarios.filter(u => Math.max(...doUsuario(u).map(l => l.tamanho ?? 0)) >= 6
      && (atividade[u] ?? doUsuario(u).at(-1).em) >= agora - 7 * DIA).length,
  };
}

/* ── O GATE 4→5 (§8.16) ────────────────────────────────────────────────────
   "Só lançar competição quando o Trainer Battle Engine estiver suficientemente
   balanceado e houver base ativa para produzir adversários variados."

     balanceamento   a espécie mais usada em ≤ 1/4 das vagas, com lutas o bastante
     base            jogadores com time completo, ativos em 7 dias — é CONTAGEM:
                     sem ninguém, a base não existe ("não passou", e não "amostra")
     aprendizado     o efeito da jornada na previsão — MEDIDO, e não aprovado: a
                     Spec não declara quanto de efeito basta (fica com o dono) */
export function gateDaV4({ kpis, aprendizado }) {
  const c = kpis.concentracao;
  const balanceamento = c.lutas < META_V4.lutasBalanceamento
    ? { veredito: INSUF, n: c.lutas, precisa: META_V4.lutasBalanceamento }
    : { veredito: c.valor <= META_V4.concentracaoMax ? 'passou' : 'não passou', n: c.lutas, valor: c.valor, dex: c.dex, teto: META_V4.concentracaoMax };
  const base = { veredito: kpis.baseAtiva >= META_V4.base ? 'passou' : 'não passou', n: kpis.baseAtiva, precisa: META_V4.base };
  const a = aprendizado;
  const aprend = a.tratados.n < META_V4.tratadosAprendizado
    ? { veredito: INSUF, n: a.tratados.n, precisa: META_V4.tratadosAprendizado }
    : { veredito: 'medido', n: a.tratados.n, controle: a.controle.n, efeito: a.efeito, melhoraCrua: a.tratados.melhora };
  const criterios = { balanceamento, base, aprendizado: aprend };
  const vs = [balanceamento.veredito, base.veredito];
  const veredito = vs.includes('não passou') ? 'não passou' : vs.includes(INSUF) ? INSUF : 'passou';
  return { veredito, criterios };
}
