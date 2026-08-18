/* Montagem da rodada — sorteio do elenco, entidades em cena, ciclo de vida.
 *
 * Fronteira: decide O QUE existe na rodada. Não desenha e não avança relógio. */

import { $, log } from './dom.mjs';
import { CX, CY, GRASS_RX, GRASS_RY, H, W } from './render.mjs';
import { MOVE_FX, fxSheet } from './efeitos.mjs';
import { PMD, SPRITE_MAX_H, conferirFolha, folhasFalhas, folhasOk, sheetURL, urlFolha } from './sprites.mjs';
import { S } from './estado.mjs';
import { place } from './coreografia.mjs';
import { rng } from '../../engine/engine.mjs';

/* =====================================================================
   ESTADO DA RODADA
   ===================================================================== */
let selRing = null;     // anel dourado sob o lutador em que você apostou



const monLayer = $('#monLayer'), uiLayer = $('#uiLayer'), hud = $('#hud');
const overlay = $('#overlay');

/* ------------------------- MONTAGEM DA RODADA ------------------------- */
/* Baixa as 4 folhas de cada lutador durante a fase de apostas, para
   nenhuma animação piscar na primeira vez que for usada. */
/* Cada rodada pediria de novo as mesmas ~48 folhas; `folhaVista`, lá em
   conferirFolha, garante um pedido por arquivo por sessão. */

function preloadSheets(){
  for (const f of S.fighters){
    for (const k of ['w','i','a','h']){
      if (!(PMD[f.dex] && PMD[f.dex][k])) continue;
      // conferirFolha já faz o pedido (e o resgate no espelho, se precisar);
      // o Set interno evita repetir o mesmo arquivo a cada rodada
      conferirFolha(sheetURL(f.dex, k));
    }
    // e as folhas de efeito dos golpes que este lutador tem
    for (const mv of f.moves){
      const F = MOVE_FX[mv.n];
      if (!F) continue;
      for (const key of ['cast','proj','beam','hit']) if (F[key]) fxSheet(F[key]);
    }
  }
  diagnosticoFolhas();
}

/* Diagnóstico, não correção: se alguma folha não vier nem do endereço
   original nem do espelho, isso é dito UMA vez no log, com os números.
   É o que faltava nas versões anteriores — o carregamento falhava em
   silêncio (background-image não dispara erro visível) e sobrava
   adivinhação sobre a causa. Nada aqui muda o que aparece na tela. */
let avisouFalha = false;
function diagnosticoFolhas(){
  setTimeout(() => {
    if (avisouFalha || folhasFalhas === 0) return;
    avisouFalha = true;
    log(`<span class="l-sys">diagnóstico de sprites: ${folhasOk} folha(s) carregada(s), `
      + `${folhasFalhas} sem resposta das duas fontes. Se os lutadores estiverem `
      + `invisíveis, o problema é de rede/bloqueio do domínio, não do jogo.</span>`);
  }, 8000);
}

// cores das pokébolas de spawn (poké, great, ultra, master, premier…)
const SPAWN_BALLS = ['#e5443b','#3f6fd8','#f0c419','#7b3fa0','#f5f5f5','#2f8f6b',
                     '#ef94b8','#4fb3d9','#1a1a1a','#e08030','#a8d05a','#8b5cf6'];

/* weatherType: tipo que precisa aparecer garantido na pool (ex.: 'fire'
   se o clima sorteado em segredo foi Sol Forte). Passar null/undefined
   sorteia normal, sem garantia nenhuma. */

function buildEntities(layoutSeed){
  monLayer.innerHTML = ''; uiLayer.innerHTML = ''; hud.innerHTML = '';
  S.ents = [];
  // anel de seleção: primeiro filho, então fica atrás de todos os bichos
  selRing = document.createElement('div');
  selRing.id = 'selRing';
  selRing.innerHTML = '<i></i>';
  monLayer.appendChild(selRing);
  const R = rng(layoutSeed || 1);

  S.fighters.forEach((f,i) => {
    // posição inicial: círculo dentro da grama (como as pokébolas do vídeo)
    const ang = (i / S.fighters.length) * Math.PI*2 - Math.PI/2;
    const x = CX + Math.cos(ang) * GRASS_RX * 0.62;
    const y = CY + Math.sin(ang) * GRASS_RY * 0.62;

    const meta = PMD[f.dex];
    const walkFH = meta.w[1];
    const scale = Math.min(1, SPRITE_MAX_H / walkFH);   // unidades do mapa por pixel do sprite

    const el = document.createElement('div');
    el.className = 'mon ball';
    const body = document.createElement('div');
    body.className = 'body';
    el.appendChild(body);
    monLayer.appendChild(el);

    const bub = document.createElement('div');
    bub.className = 'bubble';
    uiLayer.appendChild(bub);

    const plate = document.createElement('div');
    plate.className = 'plate';
    plate.innerHTML = `<div class="fill"></div><div class="ball-mark"></div><div class="nm">${f.n}</div>`;
    hud.appendChild(plate);

    const e = {
      f, el, body, bub, plate, fill: plate.querySelector('.fill'), meta, scale,
      x, y, tx:x, ty:y, alive:true, hp:f.maxHp,
      wander: 0.5 + R()*2, bubbleUntil:-1, rageUntil:-1,
      ballCol: SPAWN_BALLS[i % SPAWN_BALLS.length],
      homeAng: ang,                       // centro da zona deste lutador
      homeR: 0.52 + (i % 3) * 0.16,       // 3 anéis, pra não ficarem todos na borda

      // --- animação ---
      anim:null, frame:0, animT:0, animOnce:false, dir:0, faceLock:0,
      px:x, py:y, dist: R()*20, lastFrame:-1,

      // --- comportamento ---
      atkQueue:[], atkPtr:0,   // próximos ataques dele, vindos da linha do tempo
      retreat:0,               // segundos ainda recuando depois de bater
      speedMul:1, dash:0, dashX:0, dashY:0,
      kbX:0, kbY:0,            // empurrão ao levar dano (em unidades do mapa)
    };
    S.ents.push(e);
    setAnim(e, 'i');
    place(e);
  });
}

/* Troca a animação. Cada folha tem tamanho de quadro próprio, então
   width/height e background-size mudam junto. */
function setAnim(e, key, once){
  if (e.anim === key) return;
  const m = e.meta[key];
  if (!m) return;
  const [fw, fh, dur] = m;
  const cols = dur.length;

  e.anim = key; e.frame = 0; e.animT = 0; e.animOnce = !!once; e.lastFrame = -1;
  e.fw = fw; e.fh = fh; e.cols = cols; e.dur = dur;
  e.ticks = dur.reduce((a,b)=>a+b, 0);

  // tamanho do elemento em % da largura da arena (a altura vem do aspect-ratio,
  // senão a arena 3:4 achataria o sprite)
  e.el.style.width = (fw * e.scale / W * 100) + '%';
  e.el.style.aspectRatio = fw + ' / ' + fh;
  e.el.style.height = 'auto';

  e.body.style.backgroundImage = `url(${urlFolha(sheetURL(e.f.dex, key))})`;
  e.body.style.backgroundSize = (cols * 100) + '% ' + (8 * 100) + '%';
  drawFrame(e);
}

function drawFrame(e){
  if (e.frame === e.lastFrame && e.dir === e.lastDir) return;
  e.lastFrame = e.frame; e.lastDir = e.dir;
  e.body.style.backgroundPosition =
    (e.cols > 1 ? (e.frame / (e.cols - 1)) * 100 : 0) + '% ' +
    (e.dir / 7) * 100 + '%';
}

/* Avança os quadros da animação.

   O detalhe que faz a diferença: a animação de ANDAR não avança com o
   tempo, avança com a DISTÂNCIA percorrida. Assim a perna acompanha o
   chão — andou mais rápido, pisou mais rápido; parou, parou de pisar.
   É o que elimina o "pé deslizando", que é o defeito clássico quando se
   toca um ciclo de passo em velocidade fixa.

   As outras animações (parado, atacar, apanhar) avançam no tempo, com as
   durações originais do jogo (em 1/60 de segundo).                      */

/* Feedback visual sobre uma entidade: número de dano subindo, aviso de nocaute
   e a placa de HP. Vieram de eventos.mjs no F0.3c porque coreografia e eventos
   precisavam dos três, e isso fechava um ciclo entre os dois. Quem é dono das
   entidades é este módulo, então é aqui que eles ficam. */
function koToast(e){
  e.el.classList.remove('rage');                  // aura de killstreak morre junto
  if (!S.myBet || S.ents[S.myBet.idx] !== e) return;
  if (selRing) selRing.classList.remove('on');    // some o anel do seu lutador
  const el = $('#koToast');
  el.innerHTML = `<b>${e.f.n}</b> foi nocauteado!<span class="ret">retornando à pokébola…</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

function floatText(e, txt, cls){
  const d = document.createElement('div');
  d.className = 'dmg ' + cls;
  d.textContent = txt;
  d.style.left = (e.x / W * 100) + '%';
  d.style.top  = ((e.y - 26) / H * 100) + '%';
  uiLayer.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}

function updatePlate(e){
  const pct = Math.max(0, e.hp / e.f.maxHp) * 100;
  e.fill.style.width = pct + '%';
  e.fill.style.background = pct > 50 ? '#7bd85a' : pct > 22 ? '#f2c13c' : '#e5484d';
  e.plate.classList.remove('hurt'); void e.plate.offsetWidth; e.plate.classList.add('hurt');
}

export {
  buildEntities,
  drawFrame,
  floatText,
  koToast,
  overlay,
  preloadSheets,
  selRing,
  setAnim,
  uiLayer,
  updatePlate,
};
