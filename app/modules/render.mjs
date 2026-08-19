/* Render da ilha — canvas 2D, pixel art procedural, câmera e desenho do mapa.
 *
 * Fronteira: desenha o que existe. Não decide nada da rodada, não toca em
 * economia, não sabe o que é uma aposta.
 *
 * Desde o V1.14 também não sabe QUAL cenário está no ar. Ele guarda a
 * GEOMETRIA — a superelipse da ilha, que a coreografia inteira usa para
 * calcular zona e limite de deslocamento — e recebe a pele de fora, por
 * `aplicarCenario`. É por isso que a arena pode variar sem recalibrar
 * movimento: a silhueta nunca muda, só a pintura.
 *
 * O caminho contrário — render importar o catálogo de arenas — fecharia um
 * ciclo, porque a pintura precisa desta geometria para desenhar.
 *
 * Executa no carregamento: obtém os dois contextos de canvas. A camada
 * estática só nasce quando alguém aplica um cenário. Isso exige que o DOM já
 * exista — garantido porque o módulo é importado por um script no fim do
 * <body>.
 */

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

// camada estática do cenário: redesenhada uma vez por rodada, quando a arena
// muda. Nasce vazia — quem a preenche é `aplicarCenario`.
const island = document.createElement('canvas');
island.width = W; island.height = H;

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

/* --- HELPERS DE PELE, usados pelas arenas -----------------------------
   Vivem aqui e não em `arenas.mjs` porque todos falam a mesma geometria:
   a superelipse da ilha. Duplicá-los do outro lado seria duplicar a chance de
   uma arena desenhar fora do mapa.                                        */

/* Espalha `n` elementos pela grama, descartando o que cai fora. O descarte é
   por dentro do laço de propósito: gerar só pontos válidos exigiria inverter
   a superelipse, e a rejeição custa menos que isso a cada rodada. */
function espalhar(R, n, margem, fn){
  for (let i=0;i<n;i++){
    const x = CX + (R()*2-1)*GRASS_RX, y = CY + (R()*2-1)*GRASS_RY;
    if (isleNorm(x,y,GRASS_RX-margem,GRASS_RY-margem) > 1) continue;
    fn(x, y, R);
  }
}
/* A borda da ilha (praia) em duas cores. */
function piso(c, corA, corB){
  isle(c,CX,CY,SAND_RX,SAND_RY);     c.fillStyle = corA; c.fill();
  isle(c,CX,CY,SAND_RX-5,SAND_RY-6); c.fillStyle = corB; c.fill();
}
/* O miolo jogável, também em duas cores. */
function miolo(c, corA, corB){
  isle(c,CX,CY,GRASS_RX,GRASS_RY);   c.fillStyle = corA; c.fill();
  isle(c,CX,CY,GRASS_RX-3,GRASS_RY-4); c.fillStyle = corB; c.fill();
}
/* Um ponto sobre a superelipse a `k` vezes o raio — serve para pôr coisa
   na margem sem cada arena refazer a trigonometria. */
function naBorda(R, k){
  const t = R()*Math.PI*2, e2 = 2/NSHAPE;
  const ct = Math.cos(t), st = Math.sin(t);
  return {
    x: CX + GRASS_RX*k * Math.sign(ct)*Math.pow(Math.abs(ct), e2),
    y: CY + GRASS_RY*k * Math.sign(st)*Math.pow(Math.abs(st), e2),
  };
}

/* --- O CENÁRIO DA RODADA ----------------------------------------------
   Injeção, não importação: o render recebe `{estatico, fundo, poeira}` de
   quem sabe qual arena saiu. Assim o catálogo pode crescer sem tocar aqui, e
   este arquivo continua sem saber que biomas existem.

   `estatico` roda UMA vez por rodada, para uma camada guardada; `fundo` roda
   a cada quadro, porque o que cerca a ilha é animado (onda, brasa, tocha). */
let cenario = null;

function aplicarCenario(c){
  cenario = c;
  const ctx = island.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,W,H);
  c.estatico(ctx);
}

const cenarioAtual = () => cenario;

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
  /* O que cerca a ilha é do cenário: mar, lago de lava, pedra de arquibancada.
     Sem cenário aplicado não há o que pintar — e é isso mesmo que se quer ver,
     porque significa que alguém desenhou antes de a rodada escolher a arena. */
  if (!cenario) return;
  cenario.fundo(time);

  map.drawImage(island, 0, 0);

  // poeira das pisadas (por baixo dos sprites)
  for (let i=puffs.length-1;i>=0;i--){
    const p = puffs[i];
    p.age += dt;
    const k = p.age / p.life;
    if (k >= 1){ puffs.splice(i,1); continue; }
    map.globalAlpha = (1-k) * 0.45;
    map.fillStyle = cenario.poeira;
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
  NSHAPE,
  SAND_RX,
  SAND_RY,
  W,
  aplicarCenario,
  cenarioAtual,
  drawEntryRings,
  drawMap,
  ell,
  entryRings,
  espalhar,
  fx,
  isle,
  isleNorm,
  map,
  miolo,
  naBorda,
  piso,
  puffs,
};
