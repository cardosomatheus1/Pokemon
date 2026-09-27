/* O SIMULADOR DE CONFRONTOS — a conta (ST-10.10 · Spec §8.14).
 *
 * "Para balancear conteúdo, criar ferramenta offline que rode milhares de
 * confrontos entre builds": detectar espécie dominante, golpe quebrado,
 * avaliar taxas de vitória e balancear rivais. Puro e REPRODUTÍVEL PELA RAIZ:
 * cada confronto (i, j) tem as próprias sementes, derivadas da raiz e do par —
 * recalcular um par sozinho dá o mesmo número que a matriz inteira deu.
 *
 * A ferramenta (`tools/simular-builds.mjs`) monta as builds e grava a fixture
 * de medição; este módulo não sabe de moveset padrão nem de save.
 */
import { simular } from './treino-batalha.mjs';
import { derivarIndice } from './seed.mjs';
import { lote, resumo } from './treino-preco.mjs';

const ramoDoPar = (i, j) => `builds:${i}:${j}`;

/* Um confronto 1×1, `sims` lutas: a taxa de vitória de i contra j, e o dano
   que cada golpe causou (para o "golpe dominante"). */
export function confronto(pack, bi, bj, { raiz, i, j, sims }) {
  let vitorias = 0;
  const dano = {};
  for (let k = 0; k < sims; k++) {
    const r = simular(pack, [bi], [bj], derivarIndice(raiz >>> 0, ramoDoPar(i, j), k));
    if (r.vencedor === 'A') vitorias++;
    for (const e of r.eventos) dano[e.golpe] = (dano[e.golpe] ?? 0) + e.dano;
  }
  return { taxa: vitorias / sims, dano };
}

/* A matriz: `taxa[i][j]` para i < j; o espelho é 1 − taxa (empate conta
   para quem não venceu, o que é conservador para o dominante). */
export function matrizDeBuilds(pack, builds, { raiz, sims }) {
  const n = builds.length;
  const taxa = Array.from({ length: n }, () => new Array(n).fill(null));
  const dano = {};
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const c = confronto(pack, builds[i], builds[j], { raiz, i, j, sims });
    taxa[i][j] = c.taxa;
    const v = confronto(pack, builds[j], builds[i], { raiz, i: j, j: i, sims });
    taxa[j][i] = v.taxa;
    for (const d of [c.dano, v.dano]) for (const [g, x] of Object.entries(d)) dano[g] = (dano[g] ?? 0) + x;
  }
  return { taxa, dano };
}

export function dominantes(builds, { taxa, dano }) {
  const medias = builds.map((b, i) => {
    const linha = taxa[i].filter((x, j) => j !== i && x !== null);
    return { dex: b.dex, media: linha.reduce((a, x) => a + x, 0) / linha.length };
  }).sort((a, b) => b.media - a.media || a.dex - b.dex);
  const total = Object.values(dano).reduce((a, x) => a + x, 0) || 1;
  const golpes = Object.entries(dano).map(([g, x]) => ({ golpe: g, fatia: x / total })).sort((a, b) => b.fatia - a.fatia || a.golpe.localeCompare(b.golpe));
  return { especies: medias, golpes };
}

/* A dificuldade de cada rival por faixa: a chance de um time de referência
   (as `referencia(nivel)` do jogador) vencer, nível a nível. */
export function dificuldadePorFaixa(pack, rivais, referencia, { raiz, sims, niveis }) {
  return rivais.map(t => ({
    id: t.id,
    chances: niveis.map(nivel => ({ nivel, p: resumo(lote(pack, referencia(nivel), t.time, raiz, 0, sims)).p })),
  }));
}
