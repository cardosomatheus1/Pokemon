/* Efeitos de golpe — projéteis, feixes, impactos e o agendador de efeitos.
 *
 * Fronteira: recebe "aconteceu tal golpe de A em B" e encena. Não lê a linha do
 * tempo da batalha nem decide dano — isso é do módulo de eventos.
 */

import { S } from './estado.mjs';
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
const FX_BASE    = 'https://raw.githubusercontent.com/PMDCollab/RawAsset/master/';
const FX_ESPELHO = 'https://cdn.jsdelivr.net/gh/PMDCollab/RawAsset@master/';
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
  rec.img.crossOrigin = 'anonymous';
  rec.img.onerror = () => {
    rec.img.onerror = () => {
      rec.img.onerror = null;
      rec.img.src = FX_ESPELHO + path;
    };
    rec.img.removeAttribute('crossorigin');
    rec.img.src = FX_BASE + path;
  };
  rec.img.src = FX_BASE + path;
  return fxCache[path] = rec;
}

const P = f => 'Particle/' + f + '.png';

/* Mapa golpe -> encenação.
     cast  : folha tocada no atacante antes de sair o golpe
     proj  : folha que VIAJA do atacante até o alvo
     beam  : folha repetida ao longo da linha (jato contínuo)
     hit   : folha do impacto, no alvo
     sc    : escala do sprite (1 = tamanho original)
     shake : tremor de tela, 0 a 1
   Faltando 'hit', usa o estouro procedural na cor do tipo.            */
const MOVE_FX = {
  // ---- fogo ----
  'Flamethrower':  {beam:P('Flamethrower.None'), sc:.55, hit:P('Fire_Fang_Hit.None'), hsc:.5, shake:.2},
  'Fire Blast':    {proj:P('Fire_Blast.None'), sc:.8, hit:P('Blast_Burn.None'), hsc:1.6, shake:.5},
  'Fire Punch':    {hit:P('Fire_Fang_Hit.None'), hsc:.55, shake:.3},
  // ---- água ----
  'Hydro Pump':    {beam:P('Hydro_Pump_RSE.Dir1'), sc:.9, hit:P('Aqua_Tail_Splash.None'), hsc:1.1, shake:.45},
  'Waterfall':     {hit:P('Aqua_Tail_Splash.None'), hsc:1.2, shake:.35},
  'Ice Fang':      {hit:P('Ice_Fang_Hit.None'), hsc:.5},
  // ---- elétrico ----
  'Thunderbolt':   {beam:P('Shock_Wave.None'), sc:.8, hit:P('Discharge.None'), hsc:.45, shake:.35},
  'Volt Tackle':   {cast:P('Spark.None'), csc:.7, hit:P('Discharge_Hit.None'), hsc:.6, shake:.6},
  // ---- planta ----
  'Solar Beam':    {cast:P('Solar_Beam_Charge.None'), csc:1, beam:P('Solar_Beam_Particle.None'),
                    sc:2.2, hit:P('Giga_Impact_Front.None'), hsc:.7, shake:.5},
  'Petal Dance':   {proj:P('Petal_Dance_Flower_Pink.None'), sc:1.3, hit:P('Circle_Pink_Out.None'), hsc:.5},
  'Magical Leaf':  {proj:P('Magical_Leaf.None'), sc:.7},
  // ---- gelo ----
  'Ice Beam':      {beam:P('Ice_Pieces.None'), sc:1.4, hit:P('Avalanche_Hit.None'), hsc:.6, shake:.2},
  'Blizzard':      {beam:P('Hail.None'), sc:1.2, hit:P('Avalanche_Hit.None'), hsc:.85, shake:.4},
  // ---- lutador ----
  'Aura Sphere':   {proj:P('Aura_Sphere.None'), sc:1.1},
  'Focus Blast':   {proj:P('Focus_Blast_Ball.Dir8'), sc:.8, hit:P('Focus_Blast_Hit.None'), hsc:.7, shake:.5},
  'Close Combat':  {hit:P('Close_Combat.None'), hsc:.6, shake:.5},
  'Cross Chop':    {hit:P('Cross_Chop.None'), hsc:.8, shake:.4},
  'Dynamic Punch': {hit:P('Dizzy_Punch_Hit.None'), hsc:.5, shake:.55},
  'Body Press':    {hit:P('Giga_Impact_Front.None'), hsc:.6, shake:.5},
  // ---- veneno ----
  'Sludge Bomb':   {proj:P('Acid_Purple.None'), sc:1.1, hit:P('Cross_Poison.None'), hsc:.7},
  // ---- terra ----
  'Earthquake':    {hit:P('Earthquake_Ranger.None'), hsc:.75, shake:.9, ground:true},
  // ---- voador ----
  'Air Slash':     {proj:P('Air_Slash_Slash.None'), sc:.7},
  'Brave Bird':    {cast:P('Brave_Bird.Dir8'), csc:1, hit:P('Brave_Bird_Hit.None'), hsc:.9, shake:.6},
  'Drill Peck':    {hit:P('Wing_Attack.None'), hsc:.5, shake:.25},
  // ---- psíquico ----
  'Psychic':       {hit:P('Psycho_Boost_Front.None'), hsc:.7, shake:.35},
  'Psyshock':      {proj:P('Psycho_Cut_Cut.None'), sc:1, hit:P('Psycho_Boost_Front.None'), hsc:.55},
  'Zen Headbutt':  {hit:P('Zen_Headbutt.None'), hsc:.7, shake:.35},
  // ---- pedra ----
  'Stone Edge':    {proj:P('Stone_Edge_Rock.None'), sc:2.2, hit:P('Iron_Head.None'), hsc:.5, shake:.5},
  // ---- fantasma ----
  'Shadow Ball':   {proj:P('Shadow_Ball.None'), sc:1.4, spin:true, hit:P('Sucker_Punch_Hit.None'), hsc:.7},
  // ---- dragão ----
  'Dragon Pulse':  {proj:P('Dragon_Pulse_Ball.None'), sc:1.2, shake:.2},
  'Dragon Claw':   {hit:P('Cut_Dark.Dir8'), hsc:.55, shake:.3},
  'Outrage':       {hit:P('Giga_Impact_Back.None'), hsc:.7, shake:.6},
  // ---- sombrio ----
  'Dark Pulse':    {beam:P('Dark_Pulse_Front.None'), sc:.4, hit:P('Sucker_Punch_Hit.None'), hsc:.7},
  'Crunch':        {hit:P('Crunch.Dir8'), hsc:.7, shake:.35},
  'Bite':          {hit:P('Bite.Dir8'), hsc:.6},
  'Knock Off':     {hit:P('Knock_Off.Flip'), hsc:.7, shake:.3},
  'Payback':       {hit:P('Payback.None'), hsc:.7},
  'Foul Play':     {hit:P('Cut_Dark.Dir8'), hsc:.6, shake:.35},
  // ---- aço ----
  'Flash Cannon':  {beam:P('Flash_Cannon.None'), sc:.7, hit:P('Flash_Cannon_Release.None'), hsc:.8, shake:.3},
  'Iron Head':     {hit:P('Iron_Head.None'), hsc:.55, shake:.4},
  'Iron Tail':     {hit:P('Metal_Burst.None'), hsc:.5, shake:.45},
  'Meteor Mash':   {proj:P('Meteor_Mash_Star.Dir8'), sc:1.6, hit:P('Bullet_Punch.None'), hsc:.6, shake:.4},
  'Bullet Punch':  {hit:P('Bullet_Punch.None'), hsc:.5},
  // ---- fada ----
  'Moonblast':     {proj:P('Circle_Small_Pink_Out.None'), sc:.45, hit:P('Circle_Pink_Out.None'), hsc:.8, shake:.4},
  'Dazzling Gleam':{hit:P('Circle_Pink_Out.None'), hsc:.9, shake:.25},
  // ---- normal ----
  'Hyper Beam':    {cast:P('Charge_Up.None'), csc:1, beam:P('Solar_Beam_Particle.None'), sc:2.6,
                    hit:P('Giga_Impact_Front.None'), hsc:1, shake:.9},
  'Hyper Voice':   {hit:P('Circle_Uproar_Yellow_Out.None'), hsc:.8, shake:.3},
  'Body Slam':     {hit:P('Giga_Impact_Front.None'), hsc:.6, shake:.5},
  'Skull Bash':    {hit:P('Giga_Impact_Back.None'), hsc:.7, shake:.7},
  'Quick Attack':  {hit:P('Metal_Burst.None'), hsc:.35},
  'Extreme Speed': {hit:P('Metal_Burst.None'), hsc:.5, shake:.3},
  // ---- inseto ----
  'Bug Bite':      {hit:P('Bug_Bite.None'), hsc:.55},
  'X-Scissor':     {hit:P('X_Scissor.None'), hsc:.6, shake:.3},
  'Megahorn':      {hit:P('Megahorn_Front.None'), hsc:.7, shake:.5},
  'Signal Beam':   {proj:P('Signal_Beam.None'), sc:1.3},
  // ---- terra (extra) ----
  'Dig':           {hit:P('Dig.None'), hsc:.7, shake:.4, ground:true},
  'Mud Shot':      {proj:P('Mud_Shot_Ball.None'), sc:1.2, hit:P('Mud_Bomb_Hit.None'), hsc:.55},
  // ---- pedra (extra) ----
  'Rock Tomb':     {hit:P('Ancient_Power_Front.None'), hsc:.7, shake:.3},
  'Ancient Power': {proj:P('Ancient_Power_Front.None'), sc:1.1, shake:.3},
  // ---- fantasma (extra) ----
  'Shadow Claw':   {hit:P('Shadow_Claw.None'), hsc:.6, shake:.3},
  'Lick':          {hit:P('Lick.None'), hsc:.55},
  // ---- veneno (extra) ----
  'Poison Jab':    {hit:P('Poison_Jab.None'), hsc:.6, shake:.2},
  'Gunk Shot':     {proj:P('Gunk_Shot.Dir8'), sc:1.1, hit:P('Gunk_Shot_Hit.None'), hsc:.65, shake:.4},
  // ---- água (extra) ----
  'Surf':          {beam:P('Aqua_Tail_Wave.None'), sc:1.3, hit:P('Aqua_Tail_Splash.None'), hsc:1.0, shake:.4},
  // ---- elétrico (extra) ----
  'Discharge':     {hit:P('Discharge.None'), hsc:.55, shake:.3},
  'Thunder Fang':  {hit:P('Thunder_Fang_Fang.None'), hsc:.5},
};

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
