/* RECOMPENSAS PvE SEM TORNEIRA (ST-10.17 · F4.7 · Spec §8.10, §8.11, §10.4).
 *
 * Puro. Decide o que UMA luta de jornada paga, dado o nó, o resultado e o que
 * o dia já pagou. Não grava nada: quem grava é a camada 1, na MESMA gravação
 * da luta (`jornada-local.mjs`).
 *
 * ── A REGRA (R13 do plano: "PvE sem stamina nova") ─────────────────────────
 *
 *   primeira vitória    cheio: moeda do treinador, bolas, um doce por linha
 *                       usada (até três). A insígnia e a área que abre já são
 *                       do motor da jornada — aqui não se paga duas vezes.
 *   repetição           10% da primeira, com BÔNUS DE DIVERSIDADE (+25% por nó
 *                       distinto repetido no dia, até 1,5×) e TETO DIÁRIO
 *   derrota             nada, e nada sai — a Spec §8.10 manda incentivo
 *                       positivo, e não punição
 *
 * O §8.10 pede, contra o spam de uma equipe só: "cooldown leve; bônus para
 * diversidade; preferir incentivo positivo a bloqueio". Aqui não há bloqueio:
 * depois do teto a luta continua valendo como treino (a chance, a lição), só
 * não paga.
 *
 * ── OS NÚMEROS, E DE ONDE VÊM ──────────────────────────────────────────────
 *
 * O casual colhe ~1.440 da moeda por dia no idle (`emissao-idle.json`). O teto
 * diário do PvE repetido é 200 (~14% disso): repetir nó ajuda, e não vira a
 * fonte principal — a primeira vitória de cada nó é o que paga, e ela é uma só.
 * A jornada inteira de hoje (8 nós, 4 ginásios) paga 2.800 de uma vez só na
 * vida do save: ~2 dias de idle do casual.
 *
 * Nomes de moeda não entram aqui: a moeda é "a do treinador" (`pokecoin` é a
 * chave genérica que a camada de cima traduz por `idDaMoeda`), e bolas são as
 * chaves do pack. Nunca a moeda da Arena — há teste de fronteira.
 */

export const PVE = Object.freeze({
  PRIMEIRA: Object.freeze({ rota: 200, ginasio: 500 }),
  BOLAS: Object.freeze({ rota: Object.freeze({ poke: 2 }), ginasio: Object.freeze({ great: 3 }) }),
  DOCES_POR_LINHA: 1,
  LINHAS_MAX: 3,
  FRACAO_REPETICAO: 0.1,
  DIVERSIDADE: 0.25,
  DIVERSIDADE_MAX: 1.5,
  TETO_DIARIO: 200,
});

/* O dia do PvE no save: `{ dia, pago, nos }` — o dia do mundo, quanto a
   repetição já pagou nele, e os nós repetidos (para a diversidade). */
export const diaVazio = dia => ({ dia, pago: 0, nos: [] });

export function recompensaPve({ no, venceu, primeiraVez, dia, hoje, linhas = [] }) {
  const tipo = no?.ginasio ? 'ginasio' : 'rota';
  /* Outro dia: o teto recomeça. */
  const h = hoje && hoje.dia === dia ? { dia, pago: hoje.pago ?? 0, nos: [...(hoje.nos ?? [])] } : diaVazio(dia);
  const nada = { pokecoin: 0, bolas: {}, doces: {} };
  if (!venceu) return { motivo: 'derrota', ...nada, hoje: hoje ?? h, teto: PVE.TETO_DIARIO };

  if (primeiraVez) {
    const doces = {};
    for (const l of linhas) {
      if (Object.keys(doces).length >= PVE.LINHAS_MAX) break;
      doces[String(l)] = PVE.DOCES_POR_LINHA;
    }
    return { motivo: 'primeira', pokecoin: PVE.PRIMEIRA[tipo], bolas: { ...PVE.BOLAS[tipo] }, doces, hoje: h, teto: PVE.TETO_DIARIO };
  }

  /* REPETIÇÃO. A diversidade conta os nós DISTINTOS repetidos hoje, este
     incluído; repetir o mesmo não sobe o bônus. */
  const nos = h.nos.includes(no.id) ? h.nos : [...h.nos, no.id];
  const bonus = Math.min(PVE.DIVERSIDADE_MAX, 1 + PVE.DIVERSIDADE * (nos.length - 1));
  const cheio = Math.round(PVE.PRIMEIRA[tipo] * PVE.FRACAO_REPETICAO * bonus);
  const cabe = Math.max(0, PVE.TETO_DIARIO - h.pago);
  const pokecoin = Math.min(cheio, cabe);
  return { motivo: pokecoin > 0 ? 'repeticao' : 'teto', pokecoin, bolas: {}, doces: {},
           hoje: { dia, pago: h.pago + pokecoin, nos }, teto: PVE.TETO_DIARIO };
}
