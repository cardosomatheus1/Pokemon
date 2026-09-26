/* O DOSSIÊ DA ARENA — o que cada espécie FAZ na Arena, medido (ST-9.1 · F3.9 · §7.12).
 *
 * "Informação não é probabilidade" (invariante da Fase 3): o dossiê muda o que
 * o jogador SABE, nunca o que acontece. Por isso ele é gerado OFFLINE, sobre
 * lutas simuladas de uma raiz fixa, e nenhum módulo de preço ou de luta o
 * importa (há teste de grafo). Calculado sobre a pool da rodada EM CURSO, ele
 * vazaria o preço do modelo (bandeira C1 do PLANO); daqui, não pode.
 *
 * ── O MESMO CAMINHO DA LUTA PAGA ──────────────────────────────────────────
 *
 * Cada rodada do dossiê sai da árvore de sementes como a rodada real: pool do
 * ramo `elenco`, e a luta por `lutaDaRodada` — o clima condicionado à pool,
 * aplicado antes do combate (D-119). Posição e abates por `colocacao.mjs`, a
 * mesma conta do XP, da tela e do bolo. Um dossiê medido por outro caminho
 * descreveria outra Arena.
 *
 * ── CADA NÚMERO COM O SEU n ───────────────────────────────────────────────
 *
 * Toda taxa sai junto do tamanho da amostra que a produziu. Uma espécie que
 * apareceu 40 vezes e venceu 4 não "vence 10%": vence 4 de 40, e a tela tem de
 * poder dizer isso (§6.9, a mesma regra de honestidade do perfil de leitura).
 */
import { sementes, derivarIndice } from './seed.mjs';
import { lutaDaRodada } from './luta-rodada.mjs';
import { ordemDeQuedas, posicaoFinalDe, abatesNosEventos } from './colocacao.mjs';

/* "Cai cedo": entre os três primeiros a cair numa arena de doze. */
export const CAI_CEDO = 3;

/* Um rival com vantagem de tipo: alguém na pool com um tipo que acerta este
   lutador com efetividade ≥ 2. */
function temRivalComVantagem(M, pool, i) {
  const alvo = pool[i].types;
  return pool.some((f, j) => j !== i && f.types.some(t => M.efeito(t, alvo) >= 2));
}

function novaEspecie() {
  return { n: 0, vitorias: 0, abates: 0, abates2: 0, posicoes: {}, caiCedo: 0,
           clima: {}, rival: { com: { n: 0, vitorias: 0 }, sem: { n: 0, vitorias: 0 } } };
}

/* Soma UMA rodada ao acumulador. `acc[dex]` guarda somas, não médias: somar é
   associativo, e o dossiê pode ser gerado em fatias. */
export function acumularRodada(M, acc, { pool, clima, batalha }) {
  const ordem = ordemDeQuedas(batalha.events);
  const n = pool.length;
  pool.forEach((f, i) => {
    const e = (acc[f.dex] ??= novaEspecie());
    const venceu = batalha.winner === i ? 1 : 0;
    const pos = posicaoFinalDe(i, batalha.winner, ordem, n);
    const ab = abatesNosEventos(i, batalha.events);
    e.n++; e.vitorias += venceu; e.abates += ab; e.abates2 += ab * ab;
    e.posicoes[pos] = (e.posicoes[pos] ?? 0) + 1;
    if (pos > n - CAI_CEDO) e.caiCedo++;
    const c = (e.clima[clima.key] ??= { n: 0, vitorias: 0 });
    c.n++; c.vitorias += venceu;
    const r = e.rival[temRivalComVantagem(M, pool, i) ? 'com' : 'sem'];
    r.n++; r.vitorias += venceu;
  });
  return acc;
}

/* A rodada k do dossiê: raiz derivada por ÍNDICE (e não sorteio solto), para
   que o dossiê inteiro se refaça a partir da raiz. */
export function rodadaDoDossie(M, raiz, k) {
  const t = sementes(derivarIndice(raiz, 'dossie', k));
  const pool = M.sortearPool(t.elenco);
  const { clima, batalha } = lutaDaRodada(M, { pool, ambiente: t.ambiente, batalha: t.batalha });
  return { pool, clima, batalha };
}

export function medirDossie(M, { raiz, rodadas, de = 0 }) {
  const acc = {};
  for (let k = de; k < de + rodadas; k++) acumularRodada(M, acc, rodadaDoDossie(M, raiz, k));
  return acc;
}

const taxa = (v, n) => ({ n, taxa: n ? v / n : null });

/* Das somas para o que a tela lê — sempre com o n. */
export function finalizarDossie(acc) {
  const especies = {};
  for (const [dex, e] of Object.entries(acc)) {
    const media = e.n ? e.abates / e.n : null;
    especies[dex] = {
      n: e.n,
      vitoria: taxa(e.vitorias, e.n),
      abates: { n: e.n, media, variancia: e.n ? e.abates2 / e.n - media * media : null },
      posicoes: { n: e.n, contagem: e.posicoes },
      caiCedo: taxa(e.caiCedo, e.n),
      porClima: Object.fromEntries(Object.entries(e.clima).map(([k, c]) => [k, taxa(c.vitorias, c.n)])),
      rival: { com: taxa(e.rival.com.vitorias, e.rival.com.n), sem: taxa(e.rival.sem.vitorias, e.rival.sem.n) },
    };
  }
  return especies;
}

/* A IMPRESSÃO DO QUE DECIDE UMA LUTA: o elenco (espécie, tipos, stats), a
   tabela de tipos e as constantes de combate. Mudou o balanço, mudou a
   impressão — e o dossiê arquivado deixa de valer. O id do pack sozinho não
   serve: ele não muda quando um número muda. FNV-1a, sem dependência. */
export function impressaoDoElenco(M) {
  const txt = JSON.stringify([M.elenco, M.pack?.tipos?.efetividade ?? null, M.CONF]);
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/* O dossiê arquivado vale para ESTE motor e ESTE elenco? */
export function dossieValido(dossie, M) {
  return !!dossie && dossie.engineVersion === M.versao && dossie.contentVersion === impressaoDoElenco(M);
}
