/* Efeitos de golpe — projéteis, feixes, impactos e o agendador de efeitos.
 *
 * Fronteira: recebe "aconteceu tal golpe de A em B" e encena. Não lê a linha do
 * tempo da batalha nem decide dano — isso é do módulo de eventos.
 */

import { S } from './estado.mjs';
import { candidatos } from './assets.mjs';
import { H, W, drawEntryRings, fx } from './render.mjs';
import { drawWeatherFx } from './clima.mjs';

/* =====================================================================
   EFEITOS DE GOLPE
   ---------------------------------------------------------------------
   Mesma ideia dos sprites de personagem: em vez de inventar uma bolinha
   colorida por tipo, usamos as folhas de efeito originais do Pokémon
   Mystery Dungeon (PMDCollab/RawAsset). São 667 arquivos nomeados por
   golpe — Shadow_Ball, Crunch, Earthquake, Discharge, Close_Combat...

   O corte da folha sai do próprio nome do arquivo, sem metadado:
     - quadros são QUADRADOS
     - "Nome.Dir8.png" -> 8 linhas (uma por direção)
     - "Nome.None.png" -> 1 linha
     - lado do quadro = altura / número de linhas
     - número de quadros = largura / lado

   Cada golpe é montado em até 3 tempos: carga no atacante, viagem até o
   alvo, e impacto. Quando não existe folha boa para alguma parte, cai no
   efeito procedural antigo, colorido pelo tipo — melhor um brilho
   genérico do que um sprite que não tem nada a ver.
   ===================================================================== */
/* Mesma regra das folhas de personagem: base no raw (o endereço que
   sempre rodou), espelho só como resgate do MESMO arquivo. Foi trocar
   isto pela CDN, na v0.6.1, que apagou as animações de golpe — saía o
   balão com o nome e nenhum efeito. */
/* Os dados puros de efeito saíram para `efeitos-dados.mjs` no F0.12 — ver a
   nota lá. */
import { MOVE_FX, FX_BASE, FX_ESPELHO } from './efeitos-dados.mjs';
const fxCache = {};

function fxSheet(path){
  if (fxCache[path]) return fxCache[path];
  const m = /\.Dir(\d)\./.exec(path);
  const rec = { ok:false, rows: m ? +m[1] : 1, side:0, n:1, img:new Image() };
  rec.img.onload = () => {
    rec.side = rec.img.naturalHeight / rec.rows;
    rec.n = Math.max(1, Math.round(rec.img.naturalWidth / rec.side));
    rec.ok = rec.side > 0;
  };
  // com CORS o canvas não fica "contaminado" e continua exportável;
  // se por algum motivo falhar, recarrega sem CORS — o jogo em si não
  // precisa exportar nada, então é só perder essa capacidade.
  // E, se nem assim vier, tenta o MESMO arquivo no espelho (nunca outro
  // efeito): sem isso o golpe sai só com o balão e nenhuma animação.
  /* Cascata `local → origem → espelho` (F0.12). Cada candidato é O MESMO
     arquivo em outro endereço — nunca outro efeito: sem a folha certa o golpe
     sai só com o balão, e trocar por outra animação seria mentir sobre o que
     aconteceu.

     O `crossOrigin` só existe para o canvas não ficar contaminado; a cópia
     local é mesma origem, então nem precisa dele — e se atrapalhar, a própria
     cascata recarrega sem. */
  const lista = candidatos(FX_BASE + path, FX_ESPELHO + path);
  let i = 0;
  const proximo = () => {
    if (i >= lista.length) { rec.img.onerror = null; return; }
    if (i === 0) rec.img.removeAttribute('crossorigin');
    else rec.img.crossOrigin = 'anonymous';
    rec.img.src = lista[i++];
  };
  rec.img.onerror = proximo;
  proximo();
  return fxCache[path] = rec;
}


/* Mapa golpe -> encenação.
     cast  : folha tocada no atacante antes de sair o golpe
     proj  : folha que VIAJA do atacante até o alvo
     beam  : folha repetida ao longo da linha (jato contínuo)
     hit   : folha do impacto, no alvo
     sc    : escala do sprite (1 = tamanho original)
     shake : tremor de tela, 0 a 1
   Faltando 'hit', usa o estouro procedural na cor do tipo.            */


const shots = [];   // projéteis/raios em voo (procedural, usado como reserva)
const bursts = [];  // impactos procedurais
const fxs   = [];   // efeitos com sprite
const sched = [];   // coisas marcadas para acontecer daqui a N segundos

// agenda no relógio da BATALHA (não em setTimeout), para respeitar
// pausa, velocidade de replay e a sincronia entre jogadores
function later(dt, fn){ sched.push({ t: S.battleT + dt, fn }); }

function pushFx(o){
  o.sheetRec = fxSheet(o.sheet);
  o.age = 0;
  fxs.push(o);
  return o;
}

/* desenha um quadro de uma folha de efeito, centrado em (x,y) */
function blitFx(rec, frame, dir, x, y, sc, alpha){
  if (!rec.ok) return;
  const s = rec.side, d = s * sc;
  fx.globalAlpha = alpha === undefined ? 1 : alpha;
  fx.drawImage(rec.img, (frame % rec.n) * s, (dir % rec.rows) * s, s, s,
               x - d/2, y - d/2, d, d);
  fx.globalAlpha = 1;
}

function drawSpriteFx(dt){
  for (let i = fxs.length-1; i >= 0; i--){
    const o = fxs[i];
    o.age += dt;
    const k = o.age / o.dur;
    if (k >= 1){ fxs.splice(i,1); continue; }
    const rec = o.sheetRec;
    if (!rec.ok) continue;

    if (o.kind === 'proj'){
      // viaja do atacante ao alvo, com um arco leve
      const x = o.x0 + (o.x1-o.x0)*k;
      const y = o.y0 + (o.y1-o.y0)*k - Math.sin(k*Math.PI) * o.arc;
      // gira ou corre os quadros
      const f = o.spin ? Math.floor(o.age * 24) : Math.floor(o.age * 18);
      blitFx(rec, f, o.dir, x, y, o.sc);
    }
    else if (o.kind === 'beam'){
      // repete o sprite ao longo da linha; a defasagem por segmento faz
      // o jato "correr" do atacante para o alvo
      const seg = Math.max(3, Math.round(o.len / (rec.side * o.sc * 0.55)));
      const fade = k < .18 ? k/.18 : k > .8 ? (1-k)/.2 : 1;
      for (let s = 0; s <= seg; s++){
        const t = s/seg;
        if (t > k * 1.6) break;                 // a ponta avança com o tempo
        const x = o.x0 + (o.x1-o.x0)*t;
        const y = o.y0 + (o.y1-o.y0)*t;
        const f = Math.floor(o.age*20 + s*1.7);
        blitFx(rec, f, o.dir, x, y, o.sc, fade);
      }
    }
    else {  // 'anim' — parado num ponto
      const f = Math.floor(k * rec.n);
      blitFx(rec, f, o.dir, o.x, o.y, o.sc, k > .85 ? (1-k)/.15 : 1);
    }
  }
}

function drawFx(dt, time){
  fx.clearRect(0,0,W,H);
  drawSpriteFx(dt);
  drawEntryRings(dt);

  for (let i=shots.length-1;i>=0;i--){
    const s = shots[i];
    s.age += dt;
    const k = Math.min(1, s.age / s.life);
    if (s.kind === 'beam'){
      const a = k < .5 ? k*2 : (1-k)*2;
      fx.strokeStyle = s.col; fx.globalAlpha = a; fx.lineWidth = 4;
      fx.beginPath(); fx.moveTo(s.x0,s.y0); fx.lineTo(s.x1,s.y1); fx.stroke();
      fx.globalAlpha = a*0.7; fx.lineWidth = 1.5; fx.strokeStyle = '#fff';
      fx.beginPath(); fx.moveTo(s.x0,s.y0); fx.lineTo(s.x1,s.y1); fx.stroke();
      fx.globalAlpha = 1;
    } else {
      const x = s.x0 + (s.x1-s.x0)*k, y = s.y0 + (s.y1-s.y0)*k - Math.sin(k*Math.PI)*14;
      fx.fillStyle = s.col; fx.beginPath(); fx.arc(x,y,4.5,0,Math.PI*2); fx.fill();
      fx.fillStyle = 'rgba(255,255,255,.85)'; fx.beginPath(); fx.arc(x-1,y-1,1.8,0,Math.PI*2); fx.fill();
      fx.globalAlpha = .35; fx.fillStyle = s.col;
      fx.beginPath(); fx.arc(s.x0+(s.x1-s.x0)*Math.max(0,k-.12), s.y0+(s.y1-s.y0)*Math.max(0,k-.12), 3, 0, Math.PI*2);
      fx.fill(); fx.globalAlpha = 1;
    }
    if (k >= 1) shots.splice(i,1);
  }

  for (let i=bursts.length-1;i>=0;i--){
    const b = bursts[i];
    b.age += dt;
    const k = Math.min(1, b.age / b.life);
    fx.globalAlpha = 1-k;
    fx.strokeStyle = b.col; fx.lineWidth = 2.5;
    fx.beginPath(); fx.arc(b.x, b.y, 3 + k*b.r, 0, Math.PI*2); fx.stroke();
    for (let p=0;p<6;p++){
      const ang = b.seed + p*Math.PI/3, d = 3 + k*b.r*0.9;
      fx.fillStyle = b.col;
      fx.fillRect(b.x + Math.cos(ang)*d - 1, b.y + Math.sin(ang)*d - 1, 2.5, 2.5);
    }
    fx.globalAlpha = 1;
    if (k >= 1) bursts.splice(i,1);
  }

  drawWeatherFx(dt, time);
}

export {
  MOVE_FX,
  bursts,
  drawFx,
  fxSheet,
  fxs,
  later,
  pushFx,
  sched,
  shots,
};
