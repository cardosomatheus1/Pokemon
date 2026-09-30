/* MEDALHAS E MISSÕES DE COLEÇÃO (ST-9.15 · Spec §7.15, §7.6, §7.18, §10.4, §22).
 *
 * Camada 0.
 *
 * ── MEDALHAS: DERIVADAS, NUNCA CONCEDIDAS ─────────────────────────────────
 *
 * O mesmo padrão de `medalhas.mjs`: o degrau sai do estado, e nada é gravado.
 * Recalcular sempre dá o mesmo — não existe medalha para dessincronizar.
 * Três famílias: por tipo capturado, por % da Pokédex, e "viu todos os de um
 * tipo na Arena" (as marcas da escada, ST-9.2).
 *
 * ── MISSÕES: SEMANAIS, E PAGAM SÓ O QUE É DO MUNDO DO TREINADOR ──────────
 *
 * PokéCoin (`pack.moedaPve`, o Trainer Coins do §10.4) e bolas. NUNCA
 * PokéCash: nada aqui importa a carteira da Arena, e há teste de fronteira.
 * O progresso conta a partir da BASE da semana (o que o jogador já tinha na
 * primeira vez que a semana foi vista), e o resgate é idempotente: a missão
 * resgatada fica anotada na semana.
 *
 * ── O ORÇAMENTO, ESCRITO ─────────────────────────────────────────────────
 *
 * A semana inteira de missões paga no máximo `ORCAMENTO_SEMANAL`: 1.200
 * PokéCoin (~12% dos ~10.000 que o perfil casual colhe numa semana, fixture
 * `emissao-idle.json`) e 7 bolas. O teste soma as missões contra ele.
 */
import { capturados } from './pokedex-dados.mjs';
import { diaDoMundo } from '../../engine/avanco.mjs';
import { idDaMoeda } from '../../engine/economia-idle.mjs';

export const ORCAMENTO_SEMANAL = { pokecoin: 1200, bolas: 7 };
const DEGRAUS_TIPO = [1, 3, 6, 10];
const DEGRAUS_PDX = [5, 25, 50, 90];

const possuidas = e => new Set([...(e?.jaPossuiu ?? []).map(Number), ...capturados(e ?? { criaturas: [] })]);

function degrau(val, passos) {
  let tier = 0;
  for (let i = 0; i < passos.length; i++) if (val >= passos[i]) tier = i + 1;
  return { tier, prox: tier < passos.length ? passos[tier] : null };
}

export function medalhasDeColecao(pack, e, { marcas = { vistas: [] }, naArena = [] } = {}) {
  const tem = possuidas(e);
  const out = [];
  const nomes = pack.tipos?.nomes ?? {};
  for (const t of Object.keys(nomes)) {
    const doTipo = pack.especies.filter(x => (x.t ?? []).includes(t));
    if (!doTipo.length) continue;
    const val = doTipo.filter(x => tem.has(x.dex)).length;
    const passos = DEGRAUS_TIPO.filter(p => p <= doTipo.length);
    out.push({ id: `tipo:${t}`, nome: `${nomes[t]} capturados`, val, de: doTipo.length, ...degrau(val, passos), passos: passos.length });
  }
  const pct = Math.floor(100 * tem.size / pack.especies.length);
  out.push({ id: 'pokedex', nome: 'Pokédex completa', val: pct, unidade: '%', de: 100, ...degrau(pct, DEGRAUS_PDX), passos: DEGRAUS_PDX.length });
  const vistas = new Set((marcas?.vistas ?? []).map(Number));
  for (const t of Object.keys(nomes)) {
    const lutam = naArena.filter(x => (x.types ?? x.t ?? []).includes(t));
    if (!lutam.length) continue;
    const val = lutam.filter(x => vistas.has(x.dex)).length;
    out.push({ id: `arena:${t}`, nome: `Viu todos os de ${nomes[t]} na Arena`, val, de: lutam.length,
               tier: val === lutam.length ? 1 : 0, prox: val === lutam.length ? null : lutam.length, passos: 1 });
  }
  return out;
}

/* A VITRINE DE MEDALHAS (ST-5.13 · L-196): as ganhas e as três mais perto
   de sair — mas com TETO. Sem ele, o veterano de 33 medalhas tinha ~2.000 px
   de cartão a 420 e a aba se diluía. As de degrau mais alto primeiro (é o
   que vale mostrar); "ver todas" abre o resto. */
export const TETO_DE_MEDALHAS = 8;
export function vitrineDeMedalhas(medalhas, { todas = false, teto = TETO_DE_MEDALHAS } = {}) {
  const ganhas = medalhas.filter(m => m.tier > 0).sort((a, b) => b.tier - a.tier);
  const perto = medalhas.filter(m => m.tier === 0 && m.prox).sort((a, b) => b.val / b.prox - a.val / a.prox).slice(0, 3);
  const vistas = todas ? ganhas : ganhas.slice(0, teto);
  return { mostradas: [...vistas, ...perto], escondidas: ganhas.length - vistas.length, ganhas: ganhas.length };
}

/* ── AS MISSÕES DA SEMANA ─────────────────────────────────────────────── */
/* O campo do save, aditivo; lixo vira "semana ainda não vista". */
/* ST-10.11: o campo da jornada chega ao carregador do save por aqui, junto do
   da coleção — o `idle-dados` está no teto de 600 linhas, e uma importação a
   mais o passaria. A regra do campo é do motor (`engine/jornada.mjs`). */
export { camposDaJornada } from '../../engine/jornada.mjs';

export function camposDaColecao(cru) {
  const m = cru?.missoes;
  const ok = m && Number.isFinite(m.semana) && m.base && typeof m.base === 'object' && Array.isArray(m.resgatadas);
  return { missoes: ok ? { semana: m.semana, base: { ...m.base }, resgatadas: m.resgatadas.map(String) } : null };
}

export const semanaDe = agora => Math.floor(diaDoMundo(agora) / 7);
const fichas = e => Object.values(e?.registro ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const MISSOES = Object.freeze([
  { id: 'capturar', meta: 3, texto: 'Capture 3 espécies que você ainda não tinha', medida: (e) => possuidas(e).size,
    premio: { pokecoin: 400, poke: 3 } },
  { id: 'ver', meta: 20, texto: 'Veja 20 espécies diferentes na Arena', medida: (e, m) => (m?.vistas ?? []).length,
    premio: { pokecoin: 300, poke: 2 } },
  { id: 'fichas', meta: 30, texto: 'Junte 30 fichas de Pokédex nas rotas', medida: e => fichas(e),
    premio: { pokecoin: 500, great: 2 } },
]);

/* Garante a semana em `e.missoes` (mutando — quem chama grava) e devolve o
   quadro: progresso a partir da base, pronta, resgatada. */
export function missoesDaSemana(e, { marcas, agora }) {
  const semana = semanaDe(agora);
  if (e.missoes?.semana !== semana)
    e.missoes = { semana, base: Object.fromEntries(MISSOES.map(x => [x.id, x.medida(e, marcas)])), resgatadas: [] };
  return MISSOES.map(x => {
    const feito = Math.max(0, Math.min(x.meta, x.medida(e, marcas) - (e.missoes.base[x.id] ?? 0)));
    return { id: x.id, texto: x.texto, meta: x.meta, feito, pronta: feito >= x.meta,
             resgatada: e.missoes.resgatadas.includes(x.id), premio: x.premio };
  });
}

export function resgatarMissao(pack, e, { id, marcas, agora }) {
  const m = missoesDaSemana(e, { marcas, agora }).find(x => x.id === id);
  if (!m) return { ok: false, motivo: 'missão desconhecida' };
  if (m.resgatada) return { ok: false, repetida: true, motivo: 'já resgatada nesta semana' };
  if (!m.pronta) return { ok: false, motivo: `faltam ${m.meta - m.feito}` };
  for (const [k, v] of Object.entries(m.premio)) {
    const chave = k === 'pokecoin' ? idDaMoeda(pack) : k;
    e.bolsa[chave] = (e.bolsa[chave] ?? 0) + v;
  }
  e.missoes.resgatadas = [...e.missoes.resgatadas, id];
  return { ok: true, premio: m.premio };
}
