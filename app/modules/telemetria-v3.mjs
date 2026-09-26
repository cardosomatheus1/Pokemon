/* OS EVENTOS DA V3, MONTADOS — camada 0 (ST-9.18 · F3.13 · §7.20).
 *
 * Cada evento sai com a CHAVE do próprio fato, e é ela que faz o reenvio não
 * duplicar (o servidor ignora a chave repetida, ST-7.1a). A chave é derivada
 * do que aconteceu, e nunca de um contador ou do relógio sozinho: duas abas
 * relatando a mesma evolução mandam a mesma chave.
 *
 * ── O GESTO SE LÊ PELO SAVE, E NÃO PELO CLIQUE ────────────────────────────
 *
 * Evoluir, dar doce e soltar não deixam rastro no save — a criatura só troca
 * de forma, de nível, ou some. `eventosDoGesto` compara o save ANTES e DEPOIS
 * do clique e relata só o que de fato mudou: um clique recusado (sem doce,
 * sem requisito, soltar ainda armado) não vira evento.
 *
 * Dossiê e comparador são VISTAS, e não mudam estado nenhum: a chave amarra a
 * vista à rodada (ou ao dia) e à espécie — abrir a mesma ficha dez vezes na
 * mesma rodada é uma consulta.
 */
import { baseDe } from '../../engine/evolucao.mjs';

const dia = agora => Math.floor((agora - 3 * 3600e3) / 86400e3);

export const eventoDoDossie = ({ dex, rodada = null, antesDeApostar, agora }) => ({
  nome: 'dossie_consultado', chave: `dossie:${rodada ?? `d${dia(agora)}`}:${Number(dex)}`,
  campos: { em: agora, dex: Number(dex), antesDeApostar: antesDeApostar === true },
});

export const eventoDoComparador = ({ id, dex, agora }) => ({
  nome: 'moveset_comparado', chave: `cmp:${id}:${dia(agora)}`, campos: { em: agora, dex: Number(dex) },
});

export function eventosDoGesto(pack, antes, depois, { id, agora }) {
  const a = antes?.criaturas?.find(c => c.id === id);
  if (!a) return [];
  const d = depois?.criaturas?.find(c => c.id === id);
  if (!d) return [{ nome: 'criatura_solta', chave: `solta:${id}`, campos: { em: agora, dex: a.dex } }];
  const out = [];
  if (d.dex !== a.dex)
    out.push({ nome: 'evolucao_feita', chave: `evo:${id}:${a.dex}:${d.dex}`, campos: { em: agora, de: a.dex, para: d.dex } });
  const linha = baseDe(pack, a.dex);
  const gasto = (antes.doces?.[linha] ?? 0) - (depois.doces?.[linha] ?? 0);
  if (gasto > 0 && (d.xp !== a.xp || d.nivel !== a.nivel))
    out.push({ nome: 'doce_gasto', chave: `doce:${id}:${a.nivel}:${a.xp}`, campos: { em: agora, dex: a.dex, quantidade: gasto } });
  return out;
}
