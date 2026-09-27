/* A BATALHA PvE NA TELA — a linha do tempo (ST-10.9 · Spec §8.9, §12 telas 23–24).
 *
 * Camada 0. Tudo o que a tela encena sai DAQUI, e daqui só sai o que os
 * eventos da Trainer Battle Engine dizem: a vida de cada um é a vida cheia
 * menos o dano dos eventos, na ordem deles; quem cai é quem o evento derruba.
 * Um caminho só — a tela não conta dano, não decide quem venceu, não sabe
 * que existe um motor.
 *
 * ── O RESULTADO É UM FATO MEDIDO (§28.7) ──────────────────────────────────
 *
 * "A chance era 23% — e você venceu." O número de antes e o que aconteceu,
 * lado a lado, sem festa nem consolo: é a lição da fase inteira (§8.1) — uma
 * chance de 23% vence uma em cada quatro vezes, e perder com 77% acontece.
 */
import { especieDe } from '../../engine/especie.mjs';
import { montarLutador } from '../../engine/treino-batalha.mjs';
import { margemDaChance, porcentagemExibida, pontosExibidos } from '../../engine/treino-preco.mjs';

export const PASSO_MS = 900;

const especie = (pack, dex) => especieDe(pack, dex);

export function fraseDoEvento(e, nome) {
  const quem = nome(e.de), alvo = nome(e.para);
  if (e.errou) return `${quem} usou ${e.golpe} — errou`;
  if (e.eff === 0) return `${quem} usou ${e.golpe} — não afeta ${alvo}`;
  const nota = [e.crit ? 'crítico' : '', e.eff > 1 ? 'super-efetivo' : e.eff < 1 ? 'pouco efetivo' : ''].filter(Boolean);
  return `${quem} usou ${e.golpe}${nota.length ? ` — ${nota.join(', ')}!` : ''} (−${e.dano})${e.caiu ? ` · ${alvo} caiu` : ''}`;
}

export function linhaDoTempo(pack, timeA, timeB, resultado, nomeDe = n => n) {
  const lados = { A: [], B: [] };
  const hp = {}, maxHp = {};
  for (const [lado, time] of [['A', timeA], ['B', timeB]]) time.forEach((c, i) => {
    const f = montarLutador(pack, c, lado, i), slot = `${lado}${i}`;
    hp[slot] = maxHp[slot] = f.maxHp;
    lados[lado].push({ slot, dex: f.dex, nivel: f.nivel, maxHp: f.maxHp, nome: nomeDe(especie(pack, f.dex)?.n ?? '?') });
  });
  const nome = slot => lados[slot[0]].find(x => x.slot === slot)?.nome ?? slot;
  const passos = (resultado.eventos ?? []).map((e, n) => {
    hp[e.para] = Math.max(0, hp[e.para] - e.dano);
    return { n, t: n * PASSO_MS, turno: e.turno, de: e.de, para: e.para, golpe: e.golpe, dano: e.dano, eff: e.eff,
             crit: e.crit, errou: e.errou, caiu: e.caiu, vidaDoAlvo: hp[e.para], fracaoDoAlvo: hp[e.para] / maxHp[e.para],
             texto: fraseDoEvento(e, nome) };
  });
  return { lados, passos, vencedor: resultado.vencedor, duracaoMs: passos.length * PASSO_MS,
           vidaFinal: { ...hp } };
}

/* O resultado, com a chance de ANTES da luta. */
export function fraseDoResultado({ vencedor, turnos }, antes) {
  const pct = pontosExibidos(antes.p), m = margemDaChance(antes);
  /* Lote unânime não tem "±1" (o mesmo Q7 da ST-10.7): diz o que foi. */
  const lutas = Number(antes.sims || 0).toLocaleString('pt-BR');
  const chance = antes.p === 1 ? `o seu time tinha vencido todas as ${lutas} lutas simuladas`
    : antes.p === 0 ? `o seu time tinha perdido todas as ${lutas} lutas simuladas`
    : `a chance antes da luta era ${porcentagemExibida(antes.p)} (±${m})`;
  if (vencedor === 'A') return { titulo: 'Você venceu', texto: `${chance[0].toUpperCase()}${chance.slice(1)}.` };
  if (vencedor === 'B') return { titulo: 'Você perdeu', texto: `${chance[0].toUpperCase()}${chance.slice(1)}: em ${100 - pct} de cada 100 lutas assim, o rival vence.` };
  return { titulo: 'Empate', texto: `Ninguém caiu em ${turnos} turnos. ${chance[0].toUpperCase()}${chance.slice(1)}.` };
}
