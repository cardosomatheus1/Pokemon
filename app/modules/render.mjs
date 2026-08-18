/* Render da ilha — canvas 2D, pixel art procedural, câmera e desenho do mapa.
 *
 * Fronteira: desenha o que existe. Não decide nada da rodada, não toca em
 * economia, não sabe o que é uma aposta.
 *
 * Executa no carregamento: obtém os dois contextos de canvas e pré-desenha a
 * camada estática da ilha. Isso exige que o DOM já exista — garantido porque o
 * módulo é importado por um script no fim do <body>.
 */

import { rng } from './motor.mjs';
import { S } from './estado.mjs';
import { drawWeatherGround } from './clima.mjs';

/* =====================================================================
   RENDER — ilha 2D top-down desenhada em canvas (pixel art procedural)
   ===================================================================== */
const W = 300, H = 400;
const map = document.getElementById('mapCanvas').getContext('2d');
const fx  = document.getElementById('fxCanvas').getContext('2d');
map.imageSmoothingEnabled = false; fx.imageSmoothingEnabled = false;

const CX = W/2, CY = H/2;
// a ilha encosta nas laterais, igual ao vídeo de referência — só sobra
// água nos cantos e nas pontas de cima/baixo
const SAND_RX = 154, SAND_RY = 196;   // praia
const GRASS_RX = 134, GRASS_RY = 176; // grama
// expoente da superelipse: 2 = elipse, 4 = quase retângulo.
// 2.8 dá o formato de "retângulo arredondado" da referência.
const NSHAPE = 2.8;

// camada estática (praia + grama + detalhes + pokébolas do cenário)
const island = document.createElement('canvas');
island.width = W; island.height = H;
buildIsland(island.getContext('2d'));

// Math.max(0,...) é só um cinto de segurança: sob configurações MUITO
// fora do padrão de produção (velocidades/temporizadores artificiais de
// teste, bem além do que a UI permite ajustar) um raio podia chegar
// aqui negativo por um instante e o canvas lança IndexSizeError nesse
// caso. Não custa nada travar em 0 em vez de deixar o loop quebrar.
function ell(c,x,y,rx,ry){ c.beginPath(); c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2); }

// superelipse: |x/rx|^n + |y/ry|^n = 1 — o contorno da ilha
function isle(c,x,y,rx,ry,n=NSHAPE){
  const e = 2/n;
  c.beginPath();
  for (let i=0;i<=160;i++){
    const t = i/160 * Math.PI*2;
    const ct = Math.cos(t), st = Math.sin(t);
    c[i ? 'lineTo' : 'moveTo'](
      x + rx * Math.sign(ct) * Math.pow(Math.abs(ct), e),
      y + ry * Math.sign(st) * Math.pow(Math.abs(st), e));
  }
  c.closePath();
}
// distância normalizada no mesmo espaço: <=1 está dentro
function isleNorm(x,y,rx,ry,n=NSHAPE){
  return Math.pow(Math.pow(Math.abs((x-CX)/rx), n) + Math.pow(Math.abs((y-CY)/ry), n), 1/n);
}

function buildIsland(c){
  c.imageSmoothingEnabled = false;
  c.clearRect(0,0,W,H);

  // praia
  isle(c,CX,CY,SAND_RX,SAND_RY); c.fillStyle = '#efdda6'; c.fill();
  isle(c,CX,CY,SAND_RX-5,SAND_RY-6); c.fillStyle = '#e3cd92'; c.fill();

  // grama
  isle(c,CX,CY,GRASS_RX,GRASS_RY); c.fillStyle = '#4f9c30'; c.fill();
  isle(c,CX,CY,GRASS_RX-3,GRASS_RY-4); c.fillStyle = '#6fc247'; c.fill();

  const R = rng(20260814); // seed fixa: o cenário é sempre o mesmo
  const inGrass = (x,y,m=6) => isleNorm(x,y,GRASS_RX-m,GRASS_RY-m) <= 1;

  // tufos de capim (o "ruído" que dá cara de tileset de GBA)
  for (let i=0;i<1100;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (!inGrass(x,y)) continue;
    const r = R();
    c.fillStyle = r < .45 ? 'rgba(58,138,42,.75)'
                : r < .80 ? 'rgba(140,212,102,.60)'
                          : 'rgba(84,176,60,.70)';
    const w = 2 + (R()*3|0);
    c.fillRect(x|0, y|0, w, 1);
    if (R() < .45) c.fillRect((x|0)+1, (y|0)-1, 1, 1);
    if (R() < .25) c.fillRect((x|0)-1, (y|0)+1, 1, 1);
  }
  // manchas de grama mais escura, pra quebrar o verde chapado
  for (let i=0;i<34;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (!inGrass(x,y,20)) continue;
    c.fillStyle = 'rgba(70,160,48,.35)';
    ell(c,x,y, 9+R()*14, 6+R()*9); c.fill();
  }
  // florzinhas
  for (let i=0;i<90;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (!inGrass(x,y,14)) continue;
    const col = ['#f4e04d','#f27676','#f2a2d8','#ffffff'][R()*4|0];
    c.fillStyle = '#3f8a2c'; c.fillRect(x|0, (y|0)+2, 1, 2);
    c.fillStyle = col; c.fillRect(x|0, y|0, 2, 2);
  }
  // pedrinhas
  for (let i=0;i<38;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (!inGrass(x,y,10)) continue;
    c.fillStyle = '#8a939a'; c.fillRect(x|0, y|0, 5, 4);
    c.fillStyle = '#b9c1c6'; c.fillRect(x|0, y|0, 5, 2);
    c.fillStyle = '#6d757b'; c.fillRect(x|0, (y|0)+3, 5, 1);
  }
  // arbustos
  for (let i=0;i<20;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (!inGrass(x,y,18)) continue;
    c.fillStyle = 'rgba(0,0,0,.16)'; ell(c,x,y+3,7,3); c.fill();
    c.fillStyle = '#2f7a22'; ell(c,x,y,7,5.5); c.fill();
    c.fillStyle = '#47a233'; ell(c,x,y-1,6,4.5); c.fill();
    c.fillStyle = '#6cc44a'; ell(c,x-1.5,y-2,3,2); c.fill();
  }
  // detalhe na areia
  const e2 = 2/NSHAPE;
  for (let i=0;i<340;i++){
    const t = R()*Math.PI*2, k = 1.01 + R()*0.13;
    const ct = Math.cos(t), st = Math.sin(t);
    const x = CX + GRASS_RX*k * Math.sign(ct)*Math.pow(Math.abs(ct), e2);
    const y = CY + GRASS_RY*k * Math.sign(st)*Math.pow(Math.abs(st), e2);
    c.fillStyle = R() < .5 ? 'rgba(206,182,126,.55)' : 'rgba(250,238,196,.5)';
    c.fillRect(x|0, y|0, 2, 1);
  }

  // (as pokébolas que ficavam espalhadas de enfeite pela grama foram
  // removidas — as únicas pokébolas na arena agora são as 12 de spawn,
  // que marcam onde cada lutador realmente vai aparecer)
}

function drawBall(c,x,y,top){
  const r = 6;
  c.save();
  c.fillStyle = 'rgba(0,0,0,.22)'; ell(c,x,y+r-1,r,r*0.4); c.fill();
  c.beginPath(); c.arc(x,y,r,Math.PI,0); c.closePath(); c.fillStyle = top; c.fill();
  c.beginPath(); c.arc(x,y,r,0,Math.PI); c.closePath(); c.fillStyle = '#f4f4f4'; c.fill();
  c.fillStyle = '#141414'; c.fillRect(x-r, y-1, r*2, 2);
  c.beginPath(); c.arc(x,y,2.4,0,Math.PI*2); c.fillStyle = '#141414'; c.fill();
  c.beginPath(); c.arc(x,y,1.4,0,Math.PI*2); c.fillStyle = '#f4f4f4'; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 1;
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.stroke();
  c.restore();
}

const puffs = [];   // poeirinha levantada a cada pisada

/* Anel + brilho que aparece no chão um instante antes de cada lutador
   materializar — a entrada é UMA DE CADA VEZ (não os 12 juntos), então
   este telegrafo é o que avisa "é aqui que o próximo vai aparecer".    */
const entryRings = [];
function drawEntryRings(dt){
  for (let i=entryRings.length-1;i>=0;i--){
    const r = entryRings[i];
    r.age += dt;
    const k = r.age / r.life;
    if (k >= 1){ entryRings.splice(i,1); continue; }
    const rad = 3 + k*13;
    const fade = k < 0.5 ? k*2 : (1-k)*2;
    fx.globalAlpha = fade;
    fx.strokeStyle = '#ffffff'; fx.lineWidth = 2;
    fx.beginPath(); fx.arc(r.x, r.y-6, rad, 0, Math.PI*2); fx.stroke();
    fx.strokeStyle = 'rgba(255,220,120,.8)'; fx.lineWidth = 1;
    fx.beginPath(); fx.arc(r.x, r.y-6, rad*0.6, 0, Math.PI*2); fx.stroke();
    // brilho girando junto
    fx.fillStyle = '#ffe066';
    const spin = k * Math.PI * 3.2;
    for (let p=0;p<4;p++){
      const ang = spin + p*Math.PI/2;
      const d = rad*0.9;
      fx.fillRect(r.x+Math.cos(ang)*d-1, r.y-6+Math.sin(ang)*d-1, 2, 2);
    }
    fx.globalAlpha = 1;
  }
}

function drawMap(time, dt = 0){
  // mar
  map.fillStyle = '#2f74d6'; map.fillRect(0,0,W,H);
  map.fillStyle = '#2963bd';
  for (let y=0; y<H; y+=8) map.fillRect(0, y + ((time*6)%8|0), W, 3);

  // ondas concêntricas que "batem" na praia
  const phase = (time * 7) % 13;
  map.lineWidth = 2;
  for (let k=0;k<7;k++){
    const g = 5 + k*13 + phase;
    map.strokeStyle = `rgba(255,255,255,${0.30 - k*0.035})`;
    isle(map, CX, CY, SAND_RX+g, SAND_RY+g); map.stroke();
  }
  map.strokeStyle = 'rgba(255,255,255,.75)'; map.lineWidth = 3;
  isle(map, CX, CY, SAND_RX+2, SAND_RY+2); map.stroke();

  map.drawImage(island, 0, 0);

  // poeira das pisadas (por baixo dos sprites)
  for (let i=puffs.length-1;i>=0;i--){
    const p = puffs[i];
    p.age += dt;
    const k = p.age / p.life;
    if (k >= 1){ puffs.splice(i,1); continue; }
    map.globalAlpha = (1-k) * 0.45;
    map.fillStyle = '#efe2bd';
    ell(map, p.x + p.vx*p.age*18, p.y - k*2.5, 1.5 + k*4.5, 1 + k*2); map.fill();
    map.globalAlpha = 1;
  }

  // antes de abrir: cada lutador é uma pokébola no chão
  const closed = !S.released;
  for (const e of S.ents){
    if (!e.alive) continue;
    if (closed){ drawBall(map, e.x|0, (e.y-7)|0, e.ballCol); continue; }
    // sombra proporcional ao tamanho do bicho (Gyarados faz mais sombra
    // que Pikachu), e um tico maior enquanto ele está atacando
    const r = e.meta.w[0] * e.scale * 0.30;
    map.fillStyle = 'rgba(0,0,0,.28)';
    ell(map, e.x, e.y, r, r*0.42); map.fill();
  }
  // anel do vencedor
  if (S.state === 'result' && S.champ >= 0 && S.ents[S.champ]){
    const e = S.ents[S.champ], p = (Math.sin(time*4)*0.5+0.5);
    map.strokeStyle = `rgba(255,220,80,${0.45+p*0.45})`; map.lineWidth = 2;
    ell(map, e.x, e.y, 18+p*4, 7+p*2); map.stroke();
  }

  drawWeatherGround();
}

export {
  CX,
  CY,
  GRASS_RX,
  GRASS_RY,
  H,
  W,
  drawEntryRings,
  drawMap,
  entryRings,
  fx,
  isleNorm,
  map,
  puffs,
};
