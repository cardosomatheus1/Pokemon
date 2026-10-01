/* OS CRITÉRIOS DE UMA ORDEM DE COMPRA DE CRIATURA (ST-14.11B · E14 · spec E14 §10.3) — camada 0.
 *
 * Uma ordem de criatura diz "quero UMA que cumpra TUDO isto": a espécie, o
 * brilho, a faixa de nível, a natureza, o potencial mínimo. Quem compra aceita
 * ANTES qualquer exemplar que cumpra todos — não há aceite depois da venda.
 * Por isso cada critério é OBJETIVO e de uma lista fechada (allowlist): o que
 * o servidor sabe medir em toda instância, e nada mais.
 *
 *   E, NUNCA OU    um critério vale junto com todos os outros
 *   O PACK         a ordem é de um pack, e a criatura de outro não cumpre
 *   O BRILHO       `shiny` é o da instância; `exemplar` é outra coisa e não
 *                  entra aqui (a spec: "exemplar é atributo separado de shiny")
 *   O CATÁLOGO     a ordem grava a versão do catálogo (espécies e naturezas);
 *                  se o pack mudar, a ordem antiga não casa — o comprador
 *                  cancela e cria de novo, em vez de comprar sob regra que ele
 *                  não leu
 *
 * Os critérios normalizados têm impressão digital (`hashDosCriterios`): a
 * ordem a grava, e o recibo do fill a repete.
 */
import { sha256Hex } from './hash.mjs';

export const CRITERIOS = Object.freeze(['dex', 'shiny', 'nivelMin', 'nivelMax', 'natureza', 'potencialMin']);
const NIVEL_MAX = 100;

export const versaoDoCatalogo = pack => sha256Hex(JSON.stringify({
  pack: pack?.id ?? null,
  especies: (pack?.especies ?? []).map(e => e.dex),
  naturezas: (pack?.naturezas ?? []).map(n => n[0]),
})).slice(0, 16);

const inteiroEntre = (v, a, b) => Number.isSafeInteger(v) && v >= a && v <= b;

/* A entrada do pedido vira os critérios, ou a recusa com o motivo. Chave
   fora da lista é recusa — ignorar em silêncio faria o comprador achar que
   filtrou o que não filtrou. */
export function normalizarCriterios(pack, cru) {
  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) return { ok: false, motivo: 'critérios ausentes' };
  const fora = Object.keys(cru).filter(k => !CRITERIOS.includes(k));
  if (fora.length) return { ok: false, motivo: `critério desconhecido: ${fora.join(', ')}` };
  const dex = cru.dex;
  if (!(pack?.especies ?? []).some(e => e.dex === dex)) return { ok: false, motivo: 'espécie inválida' };
  const c = { pack: pack.id, dex };
  if (cru.shiny != null) { if (typeof cru.shiny !== 'boolean') return { ok: false, motivo: 'brilho é sim ou não' }; c.shiny = cru.shiny; }
  for (const k of ['nivelMin', 'nivelMax']) if (cru[k] != null) {
    if (!inteiroEntre(cru[k], 1, NIVEL_MAX)) return { ok: false, motivo: `${k} inválido` };
    c[k] = cru[k];
  }
  if (c.nivelMin != null && c.nivelMax != null && c.nivelMin > c.nivelMax) return { ok: false, motivo: 'nível mínimo acima do máximo' };
  if (cru.natureza != null) {
    if (!(pack?.naturezas ?? []).some(n => n[0] === cru.natureza)) return { ok: false, motivo: 'natureza inválida' };
    c.natureza = cru.natureza;
  }
  if (cru.potencialMin != null) { if (!inteiroEntre(cru.potencialMin, 0, 100)) return { ok: false, motivo: 'potencial mínimo inválido' }; c.potencialMin = cru.potencialMin; }
  return { ok: true, criterios: c };
}

/* A impressão digital: os critérios em ordem fixa de chaves. */
export const hashDosCriterios = c => sha256Hex(JSON.stringify(Object.keys(c).sort().map(k => [k, c[k]]))).slice(0, 16);

/* A criatura (o retrato que o servidor mede) cumpre TODOS? Devolve também o
   primeiro que falhou — a tela diz por que aquela não serve. */
export function atendeCriterios(c, r) {
  const falha = motivo => ({ ok: false, motivo });
  if (!c || !r) return falha('sem critérios');
  if (r.pack !== c.pack) return falha('pack');
  if (r.dex !== c.dex) return falha('espécie');
  if (c.shiny != null && !!r.shiny !== c.shiny) return falha('brilho');
  if (c.nivelMin != null && !(r.nivel >= c.nivelMin)) return falha('nível');
  if (c.nivelMax != null && !(r.nivel <= c.nivelMax)) return falha('nível');
  if (c.natureza != null && r.natureza !== c.natureza) return falha('natureza');
  if (c.potencialMin != null && !(r.potencial >= c.potencialMin)) return falha('potencial');
  return { ok: true, motivo: null };
}

/* Os critérios em palavras, na ordem em que se lê um cartão. */
export function textoDosCriterios(c, nomeDaEspecie = d => `#${d}`) {
  const nivel = c.nivelMin != null && c.nivelMax != null ? `nv ${c.nivelMin}–${c.nivelMax}`
    : c.nivelMin != null ? `nv ${c.nivelMin}+` : c.nivelMax != null ? `até nv ${c.nivelMax}` : null;
  return [`${c.shiny === true ? '✦ ' : ''}${nomeDaEspecie(c.dex)}`, c.shiny === true ? 'brilhante' : c.shiny === false ? 'normal' : 'brilhante ou não',
          nivel, c.natureza, c.potencialMin != null ? `potencial ${c.potencialMin}+` : null].filter(Boolean).join(' · ');
}
