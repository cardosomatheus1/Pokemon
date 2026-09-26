/* AS PRIMITIVAS DE COMBATE — o que a Arena e o motor de treino dividem
 * (ST-10.1 · F4.1 · Spec §8.2).
 *
 * Efetividade, fórmula de dano, stat no nível e o gerador. NADA daqui conhece
 * a Arena: não há killstreak, tempestade, BALANCE, nível fixo nem CONF. O que
 * a Arena fixa (o nível 50, o crítico de 1/16) chega por PARÂMETRO — e é por
 * isso que um segundo motor pode usar a mesma fórmula com o nível da criatura.
 *
 * ── A FRONTEIRA ────────────────────────────────────────────────────────────
 *
 *   engine/engine.mjs      importa daqui (a Arena)
 *   engine/treino-*.mjs    importa daqui e do pack, e NUNCA de engine.mjs
 *
 * O motor de treino que importasse `engine.mjs` herdaria o estado da Arena
 * pela porta dos fundos, e o P4 ("nenhum atributo de coleção altera a Arena")
 * passaria a depender de disciplina. `test/primitivas.mjs` cobra o grafo.
 *
 * ── BYTE A BYTE ───────────────────────────────────────────────────────────
 *
 * O corpo é o que estava em `engine.mjs`, na mesma ordem de consumo do
 * gerador (o crítico sorteia antes da variação). Goldens, margem e paridade
 * são a prova. Os parâmetros são posicionais porque `dano` roda no laço
 * quente do Monte Carlo: um objeto de opções por golpe é lixo por golpe.
 */

export function rng(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* O stat no nível, com IV fixo 31 e sem esforço — a fórmula da Arena, agora
   com o nível como argumento. */
export function statNoNivel(base, nivel){ return Math.floor((2*base + 31) * nivel / 100) + 5; }

export function efeito(chart, moveType, defTypes){
  const row = chart[moveType] || {};
  let e = 1;
  for (const t of defTypes) if (row[t] !== undefined) e *= row[t];
  return e;
}

/* `aMul`/`dMul` ausentes ou zero valem 1 — o `||` é o do código original, e
   trocá-lo por `??` mudaria a luta de quem passa 0. */
export function dano(chart, A, D, mv, R, aMul, dMul, nivel, chanceCrit, multCrit){
  const atk = (mv.cat === 'fis' ? A.atk : A.spa) * (aMul || 1);
  const dfs = (mv.cat === 'fis' ? D.def : D.spd) * (dMul || 1);
  const eff = efeito(chart, mv.t, D.types);
  if (eff === 0) return {dmg:0, eff:0, crit:false};
  const crit = R() < chanceCrit;
  const stab = A.types.includes(mv.t) ? 1.5 : 1;
  const base = Math.floor(Math.floor(Math.floor(2*nivel/5 + 2) * mv.p * atk / dfs) / 50) + 2;
  const dmg = base * stab * eff * (crit ? multCrit : 1) * (0.85 + R()*0.15);
  return {dmg: Math.max(1, Math.round(dmg)), eff, crit};
}
