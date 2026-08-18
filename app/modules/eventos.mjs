/* Eventos — consome a linha do tempo da batalha e encena cada acontecimento.
 *
 * Fronteira: lê o que o motor já decidiu. Não decide nada. */

import { $, log } from './dom.mjs';
import { BEHAV, applyStorm } from './coreografia.mjs';
import { H, W } from './render.mjs';
import { MOVE_FX, bursts, later, pushFx } from './efeitos.mjs';
import { S } from './estado.mjs';
import { TCOLOR } from './motor.mjs';
import { dirOf } from './sprites.mjs';
import { drawFrame, floatText, koToast, selRing, setAnim, uiLayer, updatePlate } from './rodada.mjs';
import { marcarAbate } from './killfeed.mjs';
import { refreshOddsTable } from './odds.mjs';
import { sfx } from './audio.mjs';

/* ------------------------- APLICAR UM EVENTO ------------------------- */
function applyEvent(ev){
  if (ev.storm){ applyStorm(ev); return; }
  if (ev.streak){ applyStreak(ev); return; }
  const A = S.ents[ev.a], D = S.ents[ev.d];
  if (!A || !D) return;
  const mv = A.f.moves[ev.m];
  const col = TCOLOR[mv.t] || '#fff';

  // balão de ataque
  A.bub.textContent = mv.n;
  A.bub.style.borderColor = col;
  A.bub.classList.add('on');
  A.bubbleUntil = S.battleT + 1.9;

  // encara o alvo e toca a animação de ataque
  const ang = Math.atan2(D.y - A.y, D.x - A.x);
  const melee = mv.fx === 'melee';
  A.dir = dirOf(D.x - A.x, D.y - A.y);
  A.faceLock = 0.7;
  setAnim(A, 'a', true);
  A.lastFoe = D;
  A.retreat = BEHAV.RETREAT_T;

  // se o golpe é corpo a corpo e ele ainda está longe, dá a investida
  if (melee){
    const dist = Math.hypot(D.x - A.x, D.y - A.y);
    if (dist > BEHAV.DASH_D){
      A.dashX = D.x - Math.cos(ang) * BEHAV.MELEE_GAP;
      A.dashY = D.y - Math.sin(ang) * BEHAV.MELEE_GAP;
      A.dash  = 0.18;
    }
  }

  /* ---------------- encenação do golpe, em três tempos ---------------- */
  const F = MOVE_FX[mv.n] || {};
  const ax = A.x, ay = A.y - A.meta.w[1] * A.scale * 0.42;   // altura do peito
  const dx = D.x, dy = D.y - D.meta.w[1] * D.scale * 0.42;
  const dist = Math.hypot(dx-ax, dy-ay);
  const dirFx = dirOf(dx-ax, dy-ay);

  // 1) carga no atacante
  let tCast = 0;
  if (F.cast){
    tCast = 0.38;
    pushFx({kind:'anim', sheet:F.cast, x:ax, y:ay, dir:dirFx,
            sc:F.csc || 1, dur:tCast});
  }

  // 2) viagem
  let tTravel = 0.06;
  if (F.proj){
    tTravel = Math.max(0.16, Math.min(0.5, dist/420));
    later(tCast, () => pushFx({kind:'proj', sheet:F.proj, dir:dirFx,
      x0:ax, y0:ay, x1:dx, y1:dy, arc: mv.fx==='beam' ? 4 : 16,
      sc:F.sc || 1, spin:F.spin, dur:tTravel}));
  } else if (F.beam){
    tTravel = 0.30;
    later(tCast, () => pushFx({kind:'beam', sheet:F.beam, dir:dirFx,
      x0:ax, y0:ay, x1:dx, y1:dy, len:dist, sc:F.sc || 1, dur:0.55}));
  }

  const tHit = tCast + tTravel;

  // 3) impacto
  later(tHit, () => {
    if (F.hit){
      pushFx({kind:'anim', sheet:F.hit, dir:dirFx, sc:F.hsc || 1,
              x: dx, y: F.ground ? D.y : dy, dur:0.5});
    } else {
      // sem folha boa para este golpe: estouro procedural na cor do tipo
      bursts.push({x:dx, y:dy, col, r:16, life:.45, age:0, seed:Math.random()*6});
    }
    if (F.shake) S.shake = Math.max(S.shake, F.shake * (ev.crit ? 1.5 : 1));
    if (!ev.miss) aplicarDano(ev, A, D, ang);
    else { floatText(D, 'ERROU', 'miss'); sfx('miss'); }
  });

  // o log é uma esteira de texto: entra na hora, sem esperar a animação
  if (ev.miss){
    log(`<span class="l-miss">${A.f.n} usou ${mv.n}… mas errou!</span>`);
    return;
  }
  let tagLog = '';
  if (ev.eff === 0) tagLog = ' — não afeta';
  else if (ev.crit) tagLog = ' 💥 CRÍTICO';
  else if (ev.eff > 1) tagLog = ' ⚡ super efetivo';
  else if (ev.eff < 1) tagLog = ' 🛡 pouco efetivo';
  const logCls = ev.crit ? 'l-crit' : ev.eff > 1 ? 'l-sup' : ev.eff < 1 ? 'l-weak' : '';
  log(`<span class="${logCls}">${A.f.n} usou <b>${mv.n}</b> em ${D.f.n} — ${ev.dmg} de dano${tagLog}</span>`);
  if (ev.ko) log(`<span class="l-ko">💀 ${D.f.n} foi nocauteado!</span>`);
}

/* Tudo que acontece no alvo, disparado no instante do IMPACTO — não
   quando o evento é lido. É o que faz a barra de vida cair junto com a
   explosão, em vez de meio segundo antes dela. */
function aplicarDano(ev, A, D, ang){
  D.hp = ev.hpAfter;
  D.el.classList.remove('hit'); void D.el.offsetWidth;
  D.el.classList.add('hit');
  updatePlate(D);

  if (!ev.ko){
    setAnim(D, 'h', true);
    D.dir = dirOf(A.x - D.x, A.y - D.y);   // olha para o agressor
    D.faceLock = 0.5;
  }
  if (ev.eff > 0){
    const kb = (ev.crit ? 13 : 8) * Math.min(1.4, ev.eff);
    D.kbX = Math.cos(ang) * kb;
    D.kbY = Math.sin(ang) * kb * 0.6;
  }

  const cls = ev.eff === 0 ? 'weak' : ev.crit ? 'crit'
            : ev.eff > 1 ? 'super' : ev.eff < 1 ? 'weak' : '';
  floatText(D, ev.eff === 0 ? 'IMUNE' : '-' + ev.dmg, cls);
  sfx(ev.crit ? 'crit' : ev.eff > 1 ? 'super' : 'hit');

  if (ev.ko){
    // congela na pose de "apanhou" e deixa o CSS tombar o corpo
    setAnim(D, 'h', true);
    D.dir = dirOf(A.x - D.x, A.y - D.y);
    drawFrame(D);
    D.alive = false;
    D.el.classList.add('ko');
    D.bub.classList.remove('on');
    D.plate.classList.add('dead');
    koToast(D);
    marcarAbate(ev.a, ev.d);      // crédito ao atacante deste evento
    sfx('ko');
    refreshOddsTable();
  }
}

/* Aviso rápido de nocaute — só para o SEU lutador. Não dispara para os
   outros 11: se disparasse, seriam 11 avisos por rodada e o que importa
   (o seu) se perderia no meio. Vale para os dois caminhos de KO
   (combate normal e tempestade), por isso é chamado nos dois lugares. */


/* =====================================================================
   KILLSTREAK — o que aparece na tela
   ---------------------------------------------------------------------
   O buff em si já foi decidido lá no simulate() (e portanto já está
   embutido nas odds). Aqui é só a encenação: faixa com o sprite, aura
   de fúria no bicho e linha no log. A aura é removida por relógio da
   BATALHA, não por setTimeout, para acompanhar a velocidade do replay.
   ===================================================================== */
const STREAK_NAMES = {2:'DOUBLE KILL', 3:'TRIPLE KILL', 4:'QUADRA KILL', 5:'RAMPAGE'};
const STREAK_BUFFS = {
  1:{n:'ATAQUE',    ico:'⚔️', cls:'atk'},
  2:{n:'DEFESA',    ico:'🛡️', cls:'def'},
  3:{n:'VELOCIDADE',ico:'💨', cls:'spe'},
};
function applyStreak(ev){
  const A = S.ents[ev.a]; if (!A) return;
  const nome = STREAK_NAMES[Math.min(ev.lvl, 5)] || 'RAMPAGE';
  const buff = STREAK_BUFFS[ev.kind];
  const mult = (ev.mult || 1.5).toFixed(2).replace('.', ',');

  // aura de fúria, com validade marcada no relógio da batalha
  A.el.classList.add('rage');
  A.rageUntil = ev.t + ev.dur;

  const el = $('#streakToast');
  el.innerHTML =
    `<img src="${A.f.sprite}" alt="">
     <div class="txt">
       <b class="lvl">${nome}</b>
       <span><b>${A.f.n}</b> ganhou ${buff.ico} ${buff.n} ×${mult} por ${ev.dur}s</span>
     </div>`;
  el.className = 'show ' + buff.cls;
  void el.offsetWidth;
  el.classList.add('anim');

  log(`<span class="l-streak">🔥 <b>${nome}</b> — ${A.f.n} ganhou ${buff.n} ×${mult} por ${ev.dur}s!</span>`);
  sfx('streak');
}





export {
  applyEvent,
  floatText,
  koToast,
  updatePlate,
};
