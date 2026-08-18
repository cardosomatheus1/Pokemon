/* Laço principal — um requestAnimationFrame que avança a fase corrente.
 *
 * Fronteira: não sabe regra nenhuma; pergunta a fase e delega. */

import { $ } from './dom.mjs';
import { CONF } from './motor.mjs';
import { S } from './estado.mjs';
import { applyEvent } from './eventos.mjs';
import { drawFx, sched } from './efeitos.mjs';
import { drawMap } from './render.mjs';
import { entryTotalTime, finish, newRound, passoEntrada, releaseAll, setPhase, startFight } from './fases.mjs';
import { overlay } from './rodada.mjs';
import { sfx } from './audio.mjs';
import { stepMovement } from './coreografia.mjs';

/* ------------------------- LOOP PRINCIPAL ------------------------- */
let last = performance.now();
function frame(now){
  const raw = Math.min(0.05, (now - last)/1000); last = now;
  const dt = raw * (S.state === 'fighting' ? S.speed : 1);
  S.clock += raw;

  if (S.state === 'betting'){
    const left = Math.max(0, CONF.BET_WINDOW - S.clock);
    const t = $('#pickTtl'); if (t) t.textContent = `QUEM VENCE? — ${left.toFixed(0)}s`;
    if (left <= 0) startFight();
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
    if (S.released) passoEntrada(3.9);
    if (S.clock < 3 && Math.floor(S.clock) !== window.__lastBeep){ window.__lastBeep = Math.floor(S.clock); sfx('beep'); }
    if (S.clock >= 3.9 + entryTotalTime(S.ents.length)){ setPhase('fighting'); S.battleT = 0; }
  }
  else if (S.state === 'fighting'){
    S.battleT += dt;
    $('#clock').textContent = S.battleT.toFixed(1) + 's';
    while (S.evPtr < S.battle.events.length && S.battle.events[S.evPtr].t <= S.battleT){
      applyEvent(S.battle.events[S.evPtr++]);
    }
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
      `translate(${((Math.random()*2-1)*a).toFixed(1)}px, ${((Math.random()*2-1)*a).toFixed(1)}px)`;
    S.shake *= Math.pow(0.02, raw);      // decai ~98% por segundo
  } else if (S.shake !== 0){
    S.shake = 0; $('#arena').style.transform = '';
  }

  requestAnimationFrame(frame);
}

export {
  frame,
};
