/* O número de simulações, escrito num lugar só (D-011).
 *
 * Fronteira: lê `CONF.SIMS` do motor e preenche os marcadores da página.
 * Não sabe apostar, não sabe fase, não desenha nada além de texto.
 *
 * POR QUE EXISTE UM MÓDULO PARA ISTO. O F0.7 subiu `CONF.SIMS` de 20.000 para
 * 154.000 e quatro textos da interface ficaram onde estavam: o boot, a home, o
 * "como funciona" e as Regras. Enquanto isso o painel da rodada mostrava
 * "154K SIMS" e o registro do §4.4.5 publicava 154.000 — a mesma sessão
 * afirmando dois números, num produto cuja promessa escrita é odd auditável.
 *
 * Trocar os quatro textos teria sido trabalho de minutos e teria durado até a
 * próxima vez que a constante mudasse. O que não dura é o número copiado; o que
 * dura é a página não ter o número.
 *
 * O marcador é `<b class="sims"></b>`, e um `data-sims="k"` pede a forma curta
 * ("154K") usada onde o espaço é apertado. */

import { CONF } from './motor.mjs';

/* As duas formas, exportadas porque o painel de odds e o de ADM já mostram o
   número e devem mostrar a MESMA coisa. */
export const simsLongo = () => CONF.SIMS.toLocaleString('pt-BR');
export const simsCurto = () => `${Math.round(CONF.SIMS / 1000)}K`;

/* Preenche todo marcador presente. Idempotente de propósito: o boot chama uma
   vez, e qualquer tela montada depois pode chamar de novo sem duplicar nada. */
export function preencherSims(raiz = document){
  const alvos = raiz.querySelectorAll('.sims');
  for (const el of alvos)
    el.textContent = el.dataset.sims === 'k' ? simsCurto() : simsLongo();
  return alvos.length;
}
