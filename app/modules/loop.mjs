/* Laço principal — um requestAnimationFrame que avança a fase corrente.
 *
 * Fronteira: não sabe regra nenhuma; pergunta a fase e delega. */

import { $ } from './dom.mjs';
import { CONF } from './motor.mjs';
import { S } from './estado.mjs';
import { modoServidor } from './banco.mjs';
import { relogio } from './faixa.mjs';
import { enfeite } from './sorte.mjs';
import { applyEvent } from './eventos.mjs';
import { renderZonaAcao } from './zona-acao.mjs';
import { drawFx, sched } from './efeitos.mjs';
import { drawMap } from './render.mjs';
import { PAUSA_BOLAS, entryTotalTime, newRound, passoEntrada, releaseAll, setPhase, startFight } from './fases.mjs';
import { finish } from './resultado-tela.mjs';
import { overlay } from './rodada.mjs';
import { sfx } from './audio.mjs';
import { stepMovement } from './coreografia.mjs';

/* ------------------------- LOOP PRINCIPAL ------------------------- */
let last = performance.now();
function frame(now){
  const raw = Math.min(0.05, (now - last)/1000); last = now;
  const dt = raw * (S.state === 'fighting' ? S.speed : 1);
  S.clock += raw;

  /* O relógio vive na faixa fixa desde o V1.16, e é atualizado a cada quadro
     nas fases em que ele significa alguma coisa. Antes era um sufixo de 7px
     dentro de um cabeçalho, dentro do canvas — ver L-029. */
  if (S.state === 'betting' || S.state === 'fighting') relogio();

  if (S.state === 'betting'){
    /* QUEM FECHA A JANELA É O SERVIDOR, quando há servidor (F1.14).
     *
     * O relógio local continua desenhando a contagem — é ele que dá o
     * segundo a segundo na tela —, mas a TRANSIÇÃO é do evento `travada`.
     * Deixar o cliente decidir criaria a pior das divergências possíveis:
     * a aposta ainda aberta aqui e já fechada lá, ou o contrário. Uma
     * dessas duas é dinheiro. */
    if (!modoServidor() && CONF.BET_WINDOW - S.clock <= 0) startFight();
  }
  else if (S.state === 'countdown'){
    const c = $('#count');
    if (c){
      if (S.clock < 1){ c.textContent = '3'; c.className = ''; }
      else if (S.clock < 2){ c.textContent = '2'; }
      else if (S.clock < 3){ c.textContent = '1'; }
      else if (S.clock < 3.9){
        if (!c.classList.contains('go')){ c.textContent='BATTLE!!'; c.className='go'; releaseAll(); }
      }
      else if (!overlay.classList.contains('hide')){
        // esconde o texto "BATTLE!!" mas SEM virar 'fighting' ainda —
        // é o que deixa dá pra assistir a entrada de cada um acontecendo
        overlay.classList.add('hide');
      }
    }
    /* ── R33 · O VÉU SAI, AS BOLAS FICAM, DEPOIS ELAS ABREM ──────────────
     *
     * A entrada começa `PAUSA_BOLAS` DEPOIS de o véu do `BATTLE!!` sumir, e não
     * junto com ele. O véu some com `display:none`, sem transição — no quadro —
     * e o que havia depois era só o `RING_LEAD` de 0,35 s, durante o qual o anel
     * da primeira bola já está desenhando.
     *
     * O jogador nunca via as doze pokébolas paradas no círculo. E a abertura em
     * volta (R23) foi construída para o olho ACOMPANHAR: sem saber onde as
     * bolas estão antes de a primeira abrir, a volta vira um piscar de doze
     * pontos espalhados.
     *
     * O mesmo deslocamento entra nas DUAS contas — quando a entrada começa e
     * quando a fase termina. Somar só num lado cortaria a última bola. */
    if (S.released) passoEntrada(3.9 + PAUSA_BOLAS);
    if (S.clock < 3 && Math.floor(S.clock) !== window.__lastBeep){ window.__lastBeep = Math.floor(S.clock); sfx('beep'); }
    if (S.clock >= 3.9 + PAUSA_BOLAS + entryTotalTime(S.ents.length)){ setPhase('fighting'); S.battleT = 0; }
  }
  else if (S.state === 'fighting'){
    S.battleT += dt;
    /* o relógio da batalha vive na faixa desde o V1.16 */
    const c = $('#clock'); if (c) c.textContent = S.battleT.toFixed(1) + 's';
    let aplicou = false;
    while (S.evPtr < S.battle.events.length && S.battle.events[S.evPtr].t <= S.battleT){
      applyEvent(S.battle.events[S.evPtr++]);
      aplicou = true;
    }
    /* O banner do jogador acompanha o replay: vida e colocação mudam a cada
       evento aplicado. O redesenho mora AQUI e não no `eventos.mjs` porque o
       banner é camada 4 e os eventos são camada 3 — chamar de lá seria a
       inversão que o teste de camadas reprova.
       E é `aplicou` e não todo quadro: o `innerHTML` inteiro sessenta vezes por
       segundo custaria caro para redesenhar o que não mudou. */
    if (aplicou) renderZonaAcao();
    // dispara o que estava marcado (cargas, viagens e impactos)
    for (let i = sched.length-1; i >= 0; i--)
      if (sched[i].t <= S.battleT){ const f = sched[i].fn; sched.splice(i,1); f(); }
    for (const e of S.ents) if (e.bubbleUntil > 0 && S.battleT > e.bubbleUntil){ e.bub.classList.remove('on'); e.bubbleUntil = -1; }
    // aura de killstreak expira no relógio da BATALHA (acompanha o replay
    // acelerado, ao contrário de um setTimeout)
    for (const e of S.ents) if (e.rageUntil > 0 && S.battleT > e.rageUntil){ e.el.classList.remove('rage'); e.rageUntil = -1; }
    if (S.evPtr >= S.battle.events.length && S.battleT > S.battle.duration + 0.9) finish();
    stepMovement(dt);
  }
  else if (S.state === 'result'){
    stepMovement(dt);   // o campeão continua andando pela ilha
    if (S.auto && S.clock > CONF.RESULT_HOLD) newRound();
  }

  drawMap(now/1000, dt);
  drawFx(dt, now/1000);

  // tremor de tela dos golpes pesados
  if (S.shake > 0.004){
    const a = S.shake * 7;
    $('#arena').style.transform =
      `translate(${((enfeite()*2-1)*a).toFixed(1)}px, ${((enfeite()*2-1)*a).toFixed(1)}px)`;
    S.shake *= Math.pow(0.02, raw);      // decai ~98% por segundo
  } else if (S.shake !== 0){
    S.shake = 0; $('#arena').style.transform = '';
  }

  requestAnimationFrame(frame);
}

export {
  frame,
};
