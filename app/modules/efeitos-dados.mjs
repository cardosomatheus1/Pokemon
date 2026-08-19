/* Dados de efeito — puros, sem DOM.
 *
 * Separados de `efeitos.mjs` no F0.12 pelo mesmo motivo de `sprites-dados.mjs`:
 * `tools/baixar-assets.mjs` precisa saber QUAIS folhas o jogo pede sem carregar
 * meia interface junto.
 *
 * ORIGEM = PMDCollab/RawAsset, arte de terceiros, não versionada.
 * ESPELHO = jsDelivr servindo o MESMO repositório.
 */
const FX_BASE    = 'https://raw.githubusercontent.com/PMDCollab/RawAsset/master/';
const FX_ESPELHO = 'https://cdn.jsdelivr.net/gh/PMDCollab/RawAsset@master/';

/* Atalho: os arquivos de partícula vivem todos em Particle/. */
const P = f => 'Particle/' + f + '.png';

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

export { MOVE_FX, FX_BASE, FX_ESPELHO };
