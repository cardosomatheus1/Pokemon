/* Coreografia — para onde cada lutador anda e como se posiciona.
 *
 * Fronteira: puramente cosmética. A posição no mapa NÃO alimenta o cálculo de
 * dano; o alvo é sorteado uniformemente no motor. É o que garante que as odds
 * batam com a batalha exibida. */

import { $, log } from './dom.mjs';
import { CX, CY, GRASS_RX, GRASS_RY, H, W, isleNorm, puffs } from './render.mjs';
import { S } from './estado.mjs';
import { dirOf } from './sprites.mjs';
import { drawFrame, floatText, koToast, selRing, setAnim, updatePlate } from './rodada.mjs';
import { marcarAbate } from './killfeed.mjs';
import { refreshOddsTable } from './odds.mjs';
import { sfx } from './audio.mjs';

/* =====================================================================
   COREOGRAFIA
   ---------------------------------------------------------------------
   A batalha inteira já está calculada antes de começar. Isso deixa fazer
   uma coisa que normalmente não dá: cada lutador CONSULTA O PRÓPRIO
   FUTURO e se prepara.

   Se daqui a 1,8 s o Charizard vai acertar um Flamethrower no Venusaur, o
   Charizard começa a se deslocar para cima do Venusaur AGORA. Quando o
   evento chega, ele já está lá — e a pancada acontece onde faz sentido,
   em vez de sair um raio do outro lado do mapa.

   Nada disso muda o resultado: o vencedor já estava definido pela seed. É
   só encenação em cima de um roteiro pronto — e é justamente por isso que
   continua idêntico na tela de todo mundo.
   ===================================================================== */
const BEHAV = {
  // com quanta antecedência começa a se posicionar. Quem vai no soco
  // precisa de mais tempo para atravessar a ilha; quem atira quase não
  // precisa sair do lugar — e é justamente por isso que o valor do
  // atirador tem que ser baixo, senão os 12 convergem e viram um bolo.
  LEAD_MELEE: 2.6,
  LEAD_RANGED: 1.0,
  MELEE_GAP: 24,    // distância que o brigador quer do alvo
  RANGED_GAP: 78,   // distância que o atirador quer manter
  CHARGE: 2.6,      // multiplicador de velocidade indo pro ataque
  FLEE: 1.7,        // multiplicador de velocidade fugindo
  RETREAT_T: 1.5,   // tempo recuando depois de bater
  LOW_HP: 0.28,     // abaixo disso, entra em modo fuga
  DASH_D: 46,       // acima dessa distância, o corpo a corpo dá uma investida
};

function decideTarget(e, STEP){
  e.speedMul = 1;

  // --- o próximo golpe DELE na linha do tempo ---
  while (e.atkPtr < e.atkQueue.length && e.atkQueue[e.atkPtr].t < S.battleT - 0.1) e.atkPtr++;
  const nx = e.atkQueue[e.atkPtr];
  const alvo = nx ? S.ents[nx.d] : null;
  const lead = nx ? nx.t - S.battleT : Infinity;

  if (e.retreat > 0) e.retreat -= STEP;

  // --- indo bater em alguém ---
  // (vem ANTES do recuo: se o próximo golpe já está chegando, largar o
  //  recuo e ir para cima vale mais do que terminar de dar ré)
  if (alvo && alvo.alive && lead < (nx.melee ? BEHAV.LEAD_MELEE : BEHAV.LEAD_RANGED)){
    const dist = Math.hypot(alvo.x - e.x, alvo.y - e.y);
    const gap  = nx.melee ? BEHAV.MELEE_GAP : BEHAV.RANGED_GAP;

    // encara o alvo de qualquer jeito
    e.dir = dirOf(alvo.x - e.x, alvo.y - e.y);
    e.faceLock = 0.25;

    // Atirador já numa distância boa não precisa sair do lugar — ele
    // atira de onde está. Sem essa checagem os 12 convergem para o mesmo
    // ponto e a batalha vira um bolo num canto só da ilha.
    const bomTiro = !nx.melee && dist > gap * 0.55 && dist < gap * 2.3;

    if (!bomTiro){
      const a = Math.atan2(e.y - alvo.y, e.x - alvo.x);
      e.tx = alvo.x + Math.cos(a) * gap;
      e.ty = alvo.y + Math.sin(a) * gap;
      const falta = Math.hypot(e.tx - e.x, e.ty - e.y);
      e.speedMul = falta > MOVE.WALK * Math.max(0.2, lead) ? BEHAV.CHARGE : 1.1;
      clampTarget(e);
      return;
    }
    // se está bem posicionado, cai no passeio normal lá embaixo
  }

  // --- recuando depois de ter batido ---
  if (e.retreat > 0){
    const o = e.lastFoe;
    if (o && o.alive){
      const a = Math.atan2(e.y - o.y, e.x - o.x);
      e.tx = e.x + Math.cos(a) * 60;
      e.ty = e.y + Math.sin(a) * 60;
      e.speedMul = 1.3;
      clampTarget(e);
      return;
    }
  }

  // --- machucado: sai de perto do inimigo mais próximo ---
  if (e.hp / e.f.maxHp < BEHAV.LOW_HP){
    let near = null, nd = 1e9;
    for (const o of S.ents){
      if (o === e || !o.alive) continue;
      const d = Math.hypot(o.x-e.x, o.y-e.y);
      if (d < nd){ nd = d; near = o; }
    }
    if (near && nd < 120){
      const a = Math.atan2(e.y - near.y, e.x - near.x);
      e.tx = e.x + Math.cos(a) * 90;
      e.ty = e.y + Math.sin(a) * 90;
      e.speedMul = BEHAV.FLEE;
      clampTarget(e);
      return;
    }
  }

  // --- nada acontecendo: perambula na zona dele ---
  // cada um tem uma zona própria que orbita devagar. Sorteio uniforme no
  // mapa inteiro não funciona: como passariam o tempo todo em trânsito
  // entre dois pontos aleatórios, a média puxa pro centro e eles acabam
  // empilhados no meio da ilha.
  e.homeAng += MOVE.ORBIT * STEP;
  e.wander -= STEP;
  if (e.wander <= 0 || Math.hypot(e.tx - e.x, e.ty - e.y) < 9){
    e.wander = 1.6 + S.moveRng()*2.4;
    const hx = CX + Math.cos(e.homeAng) * (GRASS_RX-30) * e.homeR;
    const hy = CY + Math.sin(e.homeAng) * (GRASS_RY-34) * e.homeR;
    const a = S.moveRng()*Math.PI*2, r = MOVE.ROAM * Math.sqrt(S.moveRng());
    e.tx = hx + Math.cos(a)*r;
    e.ty = hy + Math.sin(a)*r;
    clampTarget(e);
  }
}

function clampTarget(e){
  const m = isleNorm(e.tx, e.ty, GRASS_RX-24, GRASS_RY-28);
  if (m > 1){ e.tx = CX + (e.tx-CX)/m; e.ty = CY + (e.ty-CY)/m; }
}

function tickAnim(e, STEP){
  const vx = (e.x - e.px) / STEP, vy = (e.y - e.py) / STEP;
  e.px = e.x; e.py = e.y;
  const spd = Math.hypot(vx, vy);
  e.dist += spd * STEP;

  // para onde ele olha: o alvo trava a direção por um instante,
  // fora isso é a direção do movimento
  e.faceLock = Math.max(0, e.faceLock - STEP);
  if (!e.faceLock && spd > 2) e.dir = dirOf(vx, vy);

  const busy = (e.anim === 'a' || e.anim === 'h');

  if (busy){
    // animação de uma vez só: roda até o fim e volta pro estado normal
    e.animT += STEP * 60;                       // em ticks de 1/60s
    let acc = 0, f = 0;
    for (; f < e.cols; f++){ acc += e.dur[f]; if (e.animT < acc) break; }
    if (f >= e.cols){ setAnim(e, spd > 4 ? 'w' : 'i'); }
    else e.frame = f;
  } else if (spd > 4){
    setAnim(e, 'w');
    // um ciclo completo de passo a cada MOVE.STRIDE unidades percorridas
    const cyc = (e.dist / MOVE.STRIDE) % 1;
    const f = Math.min(e.cols - 1, Math.floor(cyc * e.cols));
    if (f !== e.frame){
      // poeira nos quadros em que o pé encosta
      if (f % 2 === 1) puffs.push({x: e.x + (Math.random()-.5)*5, y: e.y,
                                   vx: -vx*0.05, age:0, life:.42});
      e.frame = f;
    }
  } else {
    setAnim(e, 'i');
    e.animT += STEP * 60;
    const t = e.animT % e.ticks;
    let acc = 0, f = 0;
    for (; f < e.cols; f++){ acc += e.dur[f]; if (t < acc) break; }
    e.frame = Math.min(f, e.cols - 1);
  }

  // empurrão de dano decaindo (deslocamento real, não truque de CSS)
  e.kbX *= 0.80; e.kbY *= 0.80;
  if (Math.abs(e.kbX) < 0.04) e.kbX = 0;
  if (Math.abs(e.kbY) < 0.04) e.kbY = 0;

  drawFrame(e);
}

function place(e){
  // âncora = centro do quadro. Sobe um pouco para o pé cair em cima da sombra.
  const ax = e.x + e.kbX;
  const ay = e.y + e.kbY - (e.fh || 40) * e.scale * 0.28;
  e.el.style.left = (ax / W * 100) + '%';
  e.el.style.top  = (ay / H * 100) + '%';
  e.bub.style.left = (e.x / W * 100) + '%';
  e.bub.style.top  = ((e.y - (e.meta.w[1] * e.scale) - 6) / H * 100) + '%';
  if (S.myBet && S.ents[S.myBet.idx] === e) posSelRing();
}

/* ------------------------- MOVIMENTO (cosmético) -------------------------
   Passo fixo de 1/30s alimentado pelo relógio da batalha e por uma seed
   derivada da seed da partida -> todo cliente desenha o mesmo passeio.
------------------------------------------------------------------------- */
let moveAcc = 0;

/* O acumulador do passo é interno daqui. Quem monta a rodada precisa zerá-lo,
   e chamar uma função é a única forma de fazer isso de outro módulo — binding
   importado não aceita atribuição. */
function reiniciarMovimento(){ moveAcc = 0; }
// MOVE: velocidade de caminhada, distância e força de repulsão.
// Se a repulsão ficar forte demais eles "cristalizam" num bloco no meio
// do mapa; se ficar fraca demais, viram um monte de sprites sobrepostos.
const MOVE = { WALK: 32, SEP: 52, SEP_K: 0.12, SEP_MAX: 1.5, YSQUASH: 1.5,
               ORBIT: 0.09,   // rad/s que a zona de cada um gira
               ROAM: 46,      // raio de perambulação dentro da própria zona

  /* Distância percorrida por um ciclo completo de passo do sprite.
     Menor = passinho miúdo e apressado, maior = passada longa.
     É esse número que sincroniza a perna com o chão: se ficar errado,
     o pé "patina" enquanto o bicho anda.                              */
               STRIDE: 26 };
function stepMovement(dt){
  moveAcc += dt;
  const STEP = 1/30;
  while (moveAcc >= STEP){
    moveAcc -= STEP;
    // 1) decide para onde cada um vai, e anda
    for (const e of S.ents){
      if (!e.alive) continue;
      decideTarget(e, STEP);

      // corrida curta do golpe corpo a corpo (o "avanço")
      if (e.dash > 0){
        e.dash = Math.max(0, e.dash - STEP);
        const k = STEP / Math.max(STEP, e.dash + STEP);
        e.x += (e.dashX - e.x) * k;
        e.y += (e.dashY - e.y) * k;
        continue;
      }

      const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx,dy);
      if (d > 1.2){
        const v = MOVE.WALK * e.speedMul * STEP;
        e.x += dx/d * Math.min(v, d);
        e.y += dy/d * Math.min(v, d);
      }
    }

    // 2) separação: ninguém fica em cima do outro (senão os balões
    //    de ataque viram um bolo ilegível no meio do mapa)
    const {SEP, SEP_K, SEP_MAX, YSQUASH} = MOVE;
    for (let i=0;i<S.ents.length;i++){
      const a = S.ents[i]; if (!a.alive) continue;
      for (let j=i+1;j<S.ents.length;j++){
        const b = S.ents[j]; if (!b.alive) continue;
        let dx = b.x - a.x, dy = (b.y - a.y) * YSQUASH;
        let d = Math.hypot(dx, dy);
        if (d < 0.01){ dx = (S.moveRng()-.5); dy = (S.moveRng()-.5); d = Math.hypot(dx,dy) || 1; }
        if (d < SEP){
          // empurrão limitado: precisa ser da mesma ordem da caminhada,
          // senão a repulsão domina e todo mundo vira um bloco rígido
          const push = Math.min(SEP_MAX, (SEP - d) * SEP_K) / d;
          a.x -= dx*push; a.y -= dy*push/YSQUASH;
          b.x += dx*push; b.y += dy*push/YSQUASH;
        }
      }
    }

    // 3) trava dentro da grama + anima o corpo
    for (const e of S.ents){
      if (!e.alive) continue;
      const m = isleNorm(e.x, e.y, GRASS_RX-20, GRASS_RY-24);
      if (m > 1){ e.x = CX + (e.x-CX)/m; e.y = CY + (e.y-CY)/m; }
      tickAnim(e, STEP);
      place(e);
    }
  }
}

/* Dano da tempestade: não passa pelo atacante/defensor normal, atinge
   todo mundo de uma vez, sem checar tipo. É a garantia de que a luta
   termina em ≤56s mesmo no caso raro de imunidades mútuas. */
function applyStorm(ev){
  for (const h of ev.hits){
    const D = S.ents[h.i]; if (!D) continue;
    D.hp = h.hpAfter;
    updatePlate(D);
    floatText(D, '-'+h.dmg, 'weak');
    if (h.ko){
      setAnim(D, 'h', true); drawFrame(D);
      D.alive = false;
      D.el.classList.add('ko');
      D.bub.classList.remove('on');
      D.plate.classList.add('dead');
      koToast(D);
      marcarAbate(null, h.i);     // tempestade não tem autor
    }
  }
  S.shake = Math.max(S.shake, 0.3);
  if (!S.battle.stormWarned){
    S.battle.stormWarned = true;
    $('#stormBadge').classList.add('show');
    log('<span class="l-crit">🌪️ A arena entra em colapso — dano contínuo até sobrar um só!</span>');
    sfx('crit');
  }
  if (ev.hits.some(h=>h.ko)) refreshOddsTable();
}

/* Veio do corpo do app no F0.3c: quem posiciona coisa na arena é a
   coreografia, não a máquina de fases. */
function posSelRing(){
  if (!selRing || !S.myBet) return;
  const e = S.ents[S.myBet.idx];
  if (!e || !e.alive){ selRing.classList.remove('on'); return; }
  selRing.style.left = (e.x / W * 100) + '%';
  selRing.style.top  = ((e.y + 3) / H * 100) + '%';
}

export {
  BEHAV,
  applyStorm,
  place,
  posSelRing,
  reiniciarMovimento,
  stepMovement,
};
