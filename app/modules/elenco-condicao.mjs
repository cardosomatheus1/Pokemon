/* QUAL CONDIÇÃO VALE PARA O ELENCO (1.33, L-178) — camada 0.
 *
 * O motor (`engine/elenco-estagio.mjs`) recebe PREFERÊNCIAS por tipo e não sabe
 * o que é noite nem chuva — é o que o mantém agnóstico ao tema (§0.3). Este
 * arquivo é a tradução: a hora e o clima da run viram listas de tipos, lidas do
 * pack.
 *
 * ── UMA TABELA SÓ PARA AS DUAS PERGUNTAS ─────────────────────────────────
 *
 * A L-178 pedia isto com todas as letras: *"dia e noite pedem exatamente a mesma
 * peça — construir duas vezes o mesmo mecanismo seria duas tabelas para uma
 * pergunta. Elas nascem juntas, ou nascem divergentes."*
 *
 * E a tabela do clima já existia: `pack.climaIdle[].tipos` é quem decide quem
 * RENDE mais no clima. Agora ela decide também quem APARECE mais. A chuva que
 * paga o Água é a mesma que traz o Água — não há como uma divergir da outra.
 *
 * ── A HORA É A DO INÍCIO, NO RELÓGIO DO MUNDO ────────────────────────────
 *
 * `run.iniciadaEm`, e nunca "agora": o relógio andando não rerrola ninguém, e a
 * aba reaberta oito horas depois responde o mesmo elenco (§P3). E o relógio é o
 * de Brasília, para todos — DEC-10, decidida pelo dono. A cena escurece no mesmo
 * relógio em que o elenco vira noturno; os dois não podem discordar.
 *
 * ── A RUN ANTIGA NÃO MUDA ────────────────────────────────────────────────
 *
 * Sem `regraElenco`, a run nasceu antes do 1.33, e fica no elenco-base até
 * acabar. Reprocessá-la trocaria os mobs no meio da wave.
 *
 * ── A PRÉVIA SÓ CONHECE O PERÍODO ────────────────────────────────────────
 *
 * O clima é revelado depois que a run começa (L-177, e a decisão de `clima.mjs`
 * na Arena: *chove no dia do jogo*). A hora não é segredo — é o relógio. Então a
 * prévia mostra a noite, e cala sobre o clima: uma prévia que mudasse com ele
 * seria o clima vazando pelo elenco. */
import { periodoEm, relogioDoMundo } from './hora-do-dia.mjs';
import { climaDaRun } from './avanco-clima.mjs';
import { REGRA_DO_ELENCO } from '../../engine/elenco-estagio.mjs';

function daNoite(pack, instante) {
  const noite = pack?.preferenciasDaNoite;
  if (!noite || !Number.isFinite(Number(instante))) return null;
  return periodoEm(relogioDoMundo(Number(instante))) === 'noite'
    ? { fonte: 'noite', favorece: [...(noite.favorece ?? [])], desfavorece: [...(noite.desfavorece ?? [])] }
    : null;
}

/* As preferências de UMA RUN: a noite (se ela começou de noite) e o clima dela.
   A ordem é a da aplicação no motor — período primeiro, clima depois —, e ela
   importa: cada uma faz no máximo uma troca, e a segunda vê o elenco da
   primeira. */
export function preferenciasDaRun(pack, run) {
  if (!run || !(Number(run.regraElenco) >= REGRA_DO_ELENCO)) return [];
  const fora = [];
  const n = daNoite(pack, run.iniciadaEm);
  if (n) fora.push(n);
  const c = climaDaRun(pack, run);
  if (c?.tipos?.length)
    fora.push({ fonte: c.key, favorece: [...c.tipos], desfavorece: [] });
  return fora;
}

/* As preferências da PRÉVIA da rota: só o período, no instante da consulta. */
export function preferenciasDaPrevia(pack, agora) {
  const n = daNoite(pack, agora);
  return n ? [n] : [];
}
