/* O DOCE NO SAVE — o que a aposta e a duplicata deixam (ST-9.8 · F3.8 · Spec §7.8, §7.6, §28.5).
 *
 * Camada 0: aplica a regra do `engine/doce.mjs` ao estado do idle. Quem grava
 * é quem chama (`doce-local.mjs`), com a gravação otimista da ST-3.2.
 *
 * ── DUAS ABAS, UM CRÉDITO ─────────────────────────────────────────────────
 *
 * A rodada que já rendeu doce fica anotada (`docesRodadas`, as últimas 60).
 * A segunda aba carrega o save do DISCO antes de creditar; se a primeira já
 * gravou, a rodada está lá e o crédito não acontece. Se as duas carregaram
 * antes de qualquer gravação, a segunda esbarra na revisão (ST-3.2), recarrega
 * e encontra a rodada.
 *
 * ── SOLTAR ────────────────────────────────────────────────────────────────
 *
 * Só da caixa, nunca em aventura (expedição ou Avanço), e soltar não desce a
 * escada (`jaPossuiu`, ST-9.2). A duplicata vira doce da LINHA pela raridade.
 */
import { doceDaAposta, doceDaDuplicata, chaveDoDoce, apostasComDoceNoDia, XP_POR_DOCE } from '../../engine/doce.mjs';
import { creditar, nivelDe, NIVEL_MAX } from '../../engine/nivel-criatura.mjs';
import { raridadeDe } from '../../engine/bioma.mjs';

const MEMORIA_RODADAS = 60;
const DIA_MS = 24 * 3600_000;

/* Os campos novos do save, aditivos: um save antigo nasce com o pote vazio. */
export function camposDoDoce(cru) {
  const doces = {};
  for (const [k, v] of Object.entries(cru?.doces ?? {})) if (Number.isFinite(v) && v > 0) doces[k] = Math.floor(v);
  return { doces, docesRodadas: Array.isArray(cru?.docesRodadas) ? cru.docesRodadas.map(String).slice(-MEMORIA_RODADAS) : [],
           docesEm: Array.isArray(cru?.docesEm) ? cru.docesEm.filter(Number.isFinite) : [] };
}

const somar = (e, linha, n) => { e.doces ??= {}; e.doces[linha] = (e.doces[linha] ?? 0) + n; };

/* `chave`: o que identifica a rodada (o id do servidor, ou o commit local). */
export function aplicarDoceDaAposta(e, { pack, chave, dex, venceu, agora, protecaoAtiva = false }) {
  const rodada = String(chave);
  if ((e.docesRodadas ?? []).includes(rodada)) return { quantidade: 0, repetida: true };
  const linha = chaveDoDoce(pack, dex);
  const quantidade = doceDaAposta({ venceu: !!venceu, houveAposta: true, protecaoAtiva,
                                    comDoceHoje: apostasComDoceNoDia(e.docesEm, agora) });
  e.docesRodadas = [...(e.docesRodadas ?? []), rodada].slice(-MEMORIA_RODADAS);
  if (quantidade > 0) {
    somar(e, linha, quantidade);
    /* Só as de hoje e ontem importam para o teto: a lista não cresce sem fim. */
    e.docesEm = [...(e.docesEm ?? []).filter(t => t > agora - 2 * DIA_MS), agora];
  }
  return { quantidade, linha };
}

/* O RESGATE DA CONTA (ST-9.9): o doce que nasceu no servidor desce ao save.
   A chave do resgate fica anotada como uma rodada — a mesma resposta pedida
   de novo (o aparelho caiu no meio) não credita duas vezes. */
export function aplicarResgate(e, { chave, doces }) {
  const marca = `resgate:${chave}`;
  if ((e.docesRodadas ?? []).includes(marca)) return { quantidade: 0, repetida: true };
  let quantidade = 0;
  for (const [linha, n] of Object.entries(doces ?? {})) {
    const q = Math.floor(Number(n));
    if (Number.isFinite(q) && q > 0) { somar(e, Number(linha), q); quantidade += q; }
  }
  e.docesRodadas = [...(e.docesRodadas ?? []), marca].slice(-MEMORIA_RODADAS);
  return { quantidade };
}

/* Quanto a criatura vira ao ser solta — a tela diz ANTES de confirmar. */
export function doceAoSoltar(pack, dex) {
  const especie = (pack.especies ?? []).find(x => x.dex === dex);
  return especie ? doceDaDuplicata(pack, raridadeDe(pack, especie)) : 0;
}

export function soltarCriatura(e, { pack, id, ondeAventura }) {
  const c = (e.criaturas ?? []).find(x => x.id === id);
  if (!c) return { ok: false, motivo: 'esta criatura não existe' };
  if (!c.naCaixa) return { ok: false, motivo: 'só dá para soltar quem está na caixa' };
  if (ondeAventura?.(e, id)) return { ok: false, motivo: 'ela está em aventura — recolha-a antes' };
  const doce = doceAoSoltar(pack, c.dex);
  const linha = chaveDoDoce(pack, c.dex);
  e.criaturas = e.criaturas.filter(x => x.id !== id);
  if (doce > 0) somar(e, linha, doce);
  return { ok: true, doce, linha, dex: c.dex };
}

/* ── DAR DOCE (ST-9.10 · §7.9) ─────────────────────────────────────────────
 *
 * O doce da LINHA da criatura, e só ele: não há parâmetro de linha, então
 * doce de outra linha não tem por onde entrar. No nível máximo recusa — gastar
 * doce que não vira nada seria a tela aceitando um erro do jogador em
 * silêncio. Doce não é requisito de evolução (R7). */
export function darDoce(e, { pack, id, quantos = 1 }) {
  const c = (e.criaturas ?? []).find(x => x.id === id);
  if (!c) return { ok: false, motivo: 'esta criatura não existe' };
  const linha = chaveDoDoce(pack, c.dex);
  const tem = e.doces?.[linha] ?? 0;
  const n = Math.min(Math.max(1, Math.floor(Number(quantos) || 1)), tem);
  if (n <= 0) return { ok: false, motivo: 'sem doce da linha dela' };
  if (nivelDe(c.xp) >= NIVEL_MAX) return { ok: false, motivo: 'já está no nível máximo' };
  const novo = creditar(c, { xp: n * XP_POR_DOCE });
  c.xp = novo.xp; c.nivel = novo.nivel;
  e.doces[linha] = tem - n;
  if (!e.doces[linha]) delete e.doces[linha];
  return { ok: true, gastos: n, xp: n * XP_POR_DOCE, subiu: novo.subiu, nivel: novo.nivel, linha };
}

/* A frase do resultado — neutra: o doce não é festa (§28.5). Numa derrota
   ele é a "sessão que não termina estéril" (§7.8), e não um prêmio. */
export function textoDoDoce(r, nomeDaLinha) {
  if (!r || r.repetida) return null;
  if (!r.quantidade) return `Sem doce desta vez — o teto é de 10 apostas com doce por dia.`;
  return `+${r.quantidade} ${r.quantidade === 1 ? 'doce' : 'doces'} da linha do ${nomeDaLinha}`;
}
