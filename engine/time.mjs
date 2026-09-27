/* O TIME DE SEIS E O POWER SCORE (ST-10.4 · F4.2, F4.8 · Spec §8.3, §8.13).
 *
 * `validarTime` confere o time antes de qualquer combate: de 1 a 6, só
 * criaturas que o jogador POSSUI, sem repetir, e cada uma com 1 a 4 golpes que
 * existem no pack. `paraTreino` entrega à Trainer Battle Engine exatamente o
 * que ela lê — espécie, nível, golpes, ocultos, natureza — e nada mais.
 *
 * ── O POWER É EXPLICATIVO, NUNCA OCULTO (§8.13) ───────────────────────────
 *
 * O total é a SOMA de partes que a tela mostra, uma a uma, e o teste cobra
 * que a soma feche: nenhum componente entra no número sem aparecer ao lado.
 * E o power só EXPLICA — nenhum motor o lê. Quem decide a luta é a luta; o
 * power é a régua que o jogador usa para comparar antes, e "um time
 * numericamente mais forte ainda pode perder para counter inteligente".
 *
 *   nível      10 por nível                        o eixo que mais pesa
 *   espécie    soma dos stats base ÷ 6              o teto da forma
 *   golpes     média de poder × mesmo-tipo ÷ 2      o que ela leva para a luta
 *   potencial  os ocultos, de 0 a 10               peso limitado e visível (R12)
 *
 * A sinergia é RECOMENDAÇÃO (§8.13: "apenas UI recommendation"): as fraquezas
 * do time saem da tabela de tipos e não mexem no número.
 */
import { especieDe } from './especie.mjs';
import { efeito } from './primitivas.mjs';
import { potencialDe } from './instancia.mjs';

export const TIME_MAX = 6;
export const GOLPES_MAX = 4;
export const PESOS = Object.freeze({ porNivel: 10, especieDivisor: 6, golpesDivisor: 2, potencialMax: 10 });

const golpePorNome = (pack, n) => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n) ?? null;

/* `criaturas`: as do jogador; `ids`: o time; `golpesDe(c)`: o moveset em vigor. */
export function validarTime(pack, { criaturas, ids, golpesDe }) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > TIME_MAX) return { ok: false, motivo: `o time tem de 1 a ${TIME_MAX}` };
  if (new Set(ids).size !== ids.length) return { ok: false, motivo: 'a mesma criatura duas vezes' };
  const time = [];
  for (const id of ids) {
    const c = (criaturas ?? []).find(x => x.id === id);
    if (!c) return { ok: false, motivo: `a criatura ${id} não é sua` };
    const golpes = golpesDe(c) ?? [];
    if (!golpes.length || golpes.length > GOLPES_MAX) return { ok: false, motivo: `de 1 a ${GOLPES_MAX} golpes` };
    const fora = golpes.find(n => !golpePorNome(pack, n));
    if (fora) return { ok: false, motivo: `o golpe ${fora} não existe` };
    time.push({ c, golpes });
  }
  return { ok: true, time };
}

/* O que a Trainer Battle Engine recebe — e só isso. */
export const paraTreino = (c, golpes) =>
  ({ dex: c.dex, nivel: c.nivel, golpes: [...golpes], ...(c.iv ? { iv: [...c.iv] } : {}), ...(c.natureza ? { natureza: c.natureza } : {}) });

export function powerDe(pack, c, golpes) {
  const esp = especieDe(pack, c.dex);
  const gs = golpes.map(n => golpePorNome(pack, n)).filter(Boolean);
  const mediaGolpes = gs.length ? gs.reduce((a, g) => a + g.p * (esp?.t.includes(g.t) ? 1.5 : 1), 0) / gs.length : 0;
  const partes = {
    nivel: Math.round((Number(c.nivel) || 0) * PESOS.porNivel),
    especie: Math.round((esp?.s ?? []).reduce((a, b) => a + b, 0) / PESOS.especieDivisor),
    golpes: Math.round(mediaGolpes / PESOS.golpesDivisor),
    potencial: Array.isArray(c.iv) ? Math.round(potencialDe(c.iv) * PESOS.potencialMax / 100) : 0,
  };
  return { partes, total: Object.values(partes).reduce((a, b) => a + b, 0) };
}

export function powerDoTime(pack, time) {
  const membros = time.map(({ c, golpes }) => ({ id: c.id, ...powerDe(pack, c, golpes) }));
  return { membros, total: membros.reduce((a, m) => a + m.total, 0) };
}

/* As fraquezas do TIME: tipos de ataque que acertam super-efetivo metade ou
   mais dos membros. Recomendação, e só. */
export function fraquezasDoTime(pack, time) {
  const chart = pack.tipos.efetividade;
  const tipos = (time ?? []).map(({ c }) => especieDe(pack, c.dex)?.t ?? []);
  if (!tipos.length) return [];
  return Object.keys(chart)
    .map(t => ({ tipo: t, fracos: tipos.filter(ts => efeito(chart, t, ts) > 1).length }))
    .filter(x => x.fracos * 2 >= tipos.length && x.fracos > 0)
    .sort((a, b) => b.fracos - a.fracos || a.tipo.localeCompare(b.tipo));
}
