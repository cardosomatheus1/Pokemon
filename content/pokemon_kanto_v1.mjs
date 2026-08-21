/* ContentPack — pokemon_kanto_v1
 *
 * TODO dado de tema mora aqui: espécies, tipos, tabela de efetividade, golpes,
 * clima, nomes, moeda e resolução de sprite. O motor não conhece nada disto —
 * ele recebe este objeto e trabalha com o que estiver dentro.
 *
 * A regra que isso serve está na Spec §0.3: `Engine != Pokémon`. Enquanto o
 * pack for o único lugar com identificador da franquia, trocar de tema é
 * trabalho de arte e dados, não de engenharia.
 *
 * Um pack precisa satisfazer `validarPack()` em engine/pack.mjs. Pack inválido
 * é recusado no carregamento, nunca no meio de uma batalha.
 */

/* ------------------------------ TIPOS ------------------------------ */
const CHART = {
  normal:{rock:.5,ghost:0,steel:.5},
  fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
  water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5},
  electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
  grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
  ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
  fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2,fairy:.5},
  poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0,fairy:2},
  ground:{fire:2,electric:2,grass:.5,poison:2,flying:0,bug:.5,rock:2,steel:2},
  flying:{electric:.5,grass:2,fighting:2,bug:2,rock:.5,steel:.5},
  psychic:{fighting:2,poison:2,psychic:.5,dark:0,steel:.5},
  bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5,fairy:.5},
  rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
  ghost:{normal:0,psychic:2,ghost:2,dark:.5},
  dragon:{dragon:2,steel:.5,fairy:0},
  dark:{fighting:.5,psychic:2,ghost:2,dark:.5,fairy:.5},
  steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5,fairy:2},
  fairy:{fire:.5,fighting:2,poison:.5,dragon:2,dark:2,steel:.5},
};

const TCOLOR = {
  normal:'#a8a878',fire:'#f0802f',water:'#5090f0',electric:'#f8d030',grass:'#68c060',
  ice:'#88d8f8',fighting:'#c03028',poison:'#a040a0',ground:'#e0c068',flying:'#a890f0',
  psychic:'#f858a8',bug:'#a8b820',rock:'#b8a038',ghost:'#7058a8',dragon:'#7038f8',
  dark:'#705848',steel:'#b8b8d0',fairy:'#ee99ac',
};

const TIPO_PT = {
  normal:'Normal',fire:'Fogo',water:'Água',electric:'Elétrico',grass:'Planta',
  ice:'Gelo',fighting:'Lutador',poison:'Venenoso',ground:'Terrestre',flying:'Voador',
  psychic:'Psíquico',bug:'Inseto',rock:'Pedra',ghost:'Fantasma',dragon:'Dragão',
  dark:'Sombrio',steel:'Aço',fairy:'Fada',
};

/* ---------------------------- ESPÉCIES ---------------------------- */
const KANTO_DEX_FULL = [
  {dex:1,n:'bulbasaur',t:['grass','poison'],s:[45,49,49,65,65,45]},
  {dex:2,n:'ivysaur',t:['grass','poison'],s:[60,62,63,80,80,60]},
  {dex:3,n:'venusaur',t:['grass','poison'],s:[80,82,83,100,100,80]},
  {dex:4,n:'charmander',t:['fire'],s:[39,52,43,60,50,65]},
  {dex:5,n:'charmeleon',t:['fire'],s:[58,64,58,80,65,80]},
  {dex:6,n:'charizard',t:['fire','flying'],s:[78,84,78,109,85,100]},
  {dex:7,n:'squirtle',t:['water'],s:[44,48,65,50,64,43]},
  {dex:8,n:'wartortle',t:['water'],s:[59,63,80,65,80,58]},
  {dex:9,n:'blastoise',t:['water'],s:[79,83,100,85,105,78]},
  {dex:10,n:'caterpie',t:['bug'],s:[45,30,35,20,20,45]},
  {dex:11,n:'metapod',t:['bug'],s:[50,20,55,25,25,30]},
  {dex:12,n:'butterfree',t:['bug','flying'],s:[60,45,50,90,80,70]},
  {dex:13,n:'weedle',t:['bug','poison'],s:[40,35,30,20,20,50]},
  {dex:14,n:'kakuna',t:['bug','poison'],s:[45,25,50,25,25,35]},
  {dex:15,n:'beedrill',t:['bug','poison'],s:[65,90,40,45,80,75]},
  {dex:16,n:'pidgey',t:['normal','flying'],s:[40,45,40,35,35,56]},
  {dex:17,n:'pidgeotto',t:['normal','flying'],s:[63,60,55,50,50,71]},
  {dex:18,n:'pidgeot',t:['normal','flying'],s:[83,80,75,70,70,101]},
  {dex:19,n:'rattata',t:['normal'],s:[30,56,35,25,35,72]},
  {dex:20,n:'raticate',t:['normal'],s:[55,81,60,50,70,97]},
  {dex:21,n:'spearow',t:['normal','flying'],s:[40,60,30,31,31,70]},
  {dex:22,n:'fearow',t:['normal','flying'],s:[65,90,65,61,61,100]},
  {dex:23,n:'ekans',t:['poison'],s:[35,60,44,40,54,55]},
  {dex:24,n:'arbok',t:['poison'],s:[60,95,69,65,79,80]},
  {dex:25,n:'pikachu',t:['electric'],s:[35,55,40,50,50,90]},
  {dex:26,n:'raichu',t:['electric'],s:[60,90,55,90,80,110]},
  {dex:27,n:'sandshrew',t:['ground'],s:[50,75,85,20,30,40]},
  {dex:28,n:'sandslash',t:['ground'],s:[75,100,110,45,55,65]},
  {dex:29,n:'nidoran-f',t:['poison'],s:[55,47,52,40,40,41]},
  {dex:30,n:'nidorina',t:['poison'],s:[70,62,67,55,55,56]},
  {dex:31,n:'nidoqueen',t:['poison','ground'],s:[90,92,87,75,85,76]},
  {dex:32,n:'nidoran-m',t:['poison'],s:[46,57,40,40,40,50]},
  {dex:33,n:'nidorino',t:['poison'],s:[61,72,57,55,55,65]},
  {dex:34,n:'nidoking',t:['poison','ground'],s:[81,102,77,85,75,85]},
  {dex:35,n:'clefairy',t:['fairy'],s:[70,45,48,60,65,35]},
  {dex:36,n:'clefable',t:['fairy'],s:[95,70,73,95,90,60]},
  {dex:37,n:'vulpix',t:['fire'],s:[38,41,40,50,65,65]},
  {dex:38,n:'ninetales',t:['fire'],s:[73,76,75,81,100,100]},
  {dex:39,n:'jigglypuff',t:['normal','fairy'],s:[115,45,20,45,25,20]},
  {dex:40,n:'wigglytuff',t:['normal','fairy'],s:[140,70,45,85,50,45]},
  {dex:41,n:'zubat',t:['poison','flying'],s:[40,45,35,30,40,55]},
  {dex:42,n:'golbat',t:['poison','flying'],s:[75,80,70,65,75,90]},
  {dex:43,n:'oddish',t:['grass','poison'],s:[45,50,55,75,65,30]},
  {dex:44,n:'gloom',t:['grass','poison'],s:[60,65,70,85,75,40]},
  {dex:45,n:'vileplume',t:['grass','poison'],s:[75,80,85,110,90,50]},
  {dex:46,n:'paras',t:['bug','grass'],s:[35,70,55,45,55,25]},
  {dex:47,n:'parasect',t:['bug','grass'],s:[60,95,80,60,80,30]},
  {dex:48,n:'venonat',t:['bug','poison'],s:[60,55,50,40,55,45]},
  {dex:49,n:'venomoth',t:['bug','poison'],s:[70,65,60,90,75,90]},
  {dex:50,n:'diglett',t:['ground'],s:[10,55,25,35,45,95]},
  {dex:51,n:'dugtrio',t:['ground'],s:[35,100,50,50,70,120]},
  {dex:52,n:'meowth',t:['normal'],s:[40,45,35,40,40,90]},
  {dex:53,n:'persian',t:['normal'],s:[65,70,60,65,65,115]},
  {dex:54,n:'psyduck',t:['water'],s:[50,52,48,65,50,55]},
  {dex:55,n:'golduck',t:['water'],s:[80,82,78,95,80,85]},
  {dex:56,n:'mankey',t:['fighting'],s:[40,80,35,35,45,70]},
  {dex:57,n:'primeape',t:['fighting'],s:[65,105,60,60,70,95]},
  {dex:58,n:'growlithe',t:['fire'],s:[55,70,45,70,50,60]},
  {dex:59,n:'arcanine',t:['fire'],s:[90,110,80,100,80,95]},
  {dex:60,n:'poliwag',t:['water'],s:[40,50,40,40,40,90]},
  {dex:61,n:'poliwhirl',t:['water'],s:[65,65,65,50,50,90]},
  {dex:62,n:'poliwrath',t:['water','fighting'],s:[90,95,95,70,90,70]},
  {dex:63,n:'abra',t:['psychic'],s:[25,20,15,105,55,90]},
  {dex:64,n:'kadabra',t:['psychic'],s:[40,35,30,120,70,105]},
  {dex:65,n:'alakazam',t:['psychic'],s:[55,50,45,135,95,120]},
  {dex:66,n:'machop',t:['fighting'],s:[70,80,50,35,35,35]},
  {dex:67,n:'machoke',t:['fighting'],s:[80,100,70,50,60,45]},
  {dex:68,n:'machamp',t:['fighting'],s:[90,130,80,65,85,55]},
  {dex:69,n:'bellsprout',t:['grass','poison'],s:[50,75,35,70,30,40]},
  {dex:70,n:'weepinbell',t:['grass','poison'],s:[65,90,50,85,45,55]},
  {dex:71,n:'victreebel',t:['grass','poison'],s:[80,105,65,100,70,70]},
  {dex:72,n:'tentacool',t:['water','poison'],s:[40,40,35,50,100,70]},
  {dex:73,n:'tentacruel',t:['water','poison'],s:[80,70,65,80,120,100]},
  {dex:74,n:'geodude',t:['rock','ground'],s:[40,80,100,30,30,20]},
  {dex:75,n:'graveler',t:['rock','ground'],s:[55,95,115,45,45,35]},
  {dex:76,n:'golem',t:['rock','ground'],s:[80,120,130,55,65,45]},
  {dex:77,n:'ponyta',t:['fire'],s:[50,85,55,65,65,90]},
  {dex:78,n:'rapidash',t:['fire'],s:[65,100,70,80,80,105]},
  {dex:79,n:'slowpoke',t:['water','psychic'],s:[90,65,65,40,40,15]},
  {dex:80,n:'slowbro',t:['water','psychic'],s:[95,75,110,100,80,30]},
  {dex:81,n:'magnemite',t:['electric','steel'],s:[25,35,70,95,55,45]},
  {dex:82,n:'magneton',t:['electric','steel'],s:[50,60,95,120,70,70]},
  {dex:83,n:'farfetchd',t:['normal','flying'],s:[52,90,55,58,62,60]},
  {dex:84,n:'doduo',t:['normal','flying'],s:[35,85,45,35,35,75]},
  {dex:85,n:'dodrio',t:['normal','flying'],s:[60,110,70,60,60,110]},
  {dex:86,n:'seel',t:['water'],s:[65,45,55,45,70,45]},
  {dex:87,n:'dewgong',t:['water','ice'],s:[90,70,80,70,95,70]},
  {dex:88,n:'grimer',t:['poison'],s:[80,80,50,40,50,25]},
  {dex:89,n:'muk',t:['poison'],s:[105,105,75,65,100,50]},
  {dex:90,n:'shellder',t:['water'],s:[30,65,100,45,25,40]},
  {dex:91,n:'cloyster',t:['water','ice'],s:[50,95,180,85,45,70]},
  {dex:92,n:'gastly',t:['ghost','poison'],s:[30,35,30,100,35,80]},
  {dex:93,n:'haunter',t:['ghost','poison'],s:[45,50,45,115,55,95]},
  {dex:94,n:'gengar',t:['ghost','poison'],s:[60,65,60,130,75,110]},
  {dex:95,n:'onix',t:['rock','ground'],s:[35,45,160,30,45,70]},
  {dex:96,n:'drowzee',t:['psychic'],s:[60,48,45,43,90,42]},
  {dex:97,n:'hypno',t:['psychic'],s:[85,73,70,73,115,67]},
  {dex:98,n:'krabby',t:['water'],s:[30,105,90,25,25,50]},
  {dex:99,n:'kingler',t:['water'],s:[55,130,115,50,50,75]},
  {dex:100,n:'voltorb',t:['electric'],s:[40,30,50,55,55,100]},
  {dex:101,n:'electrode',t:['electric'],s:[60,50,70,80,80,150]},
  {dex:102,n:'exeggcute',t:['grass','psychic'],s:[60,40,80,60,45,40]},
  {dex:103,n:'exeggutor',t:['grass','psychic'],s:[95,95,85,125,75,55]},
  {dex:104,n:'cubone',t:['ground'],s:[50,50,95,40,50,35]},
  {dex:105,n:'marowak',t:['ground'],s:[60,80,110,50,80,45]},
  {dex:106,n:'hitmonlee',t:['fighting'],s:[50,120,53,35,110,87]},
  {dex:107,n:'hitmonchan',t:['fighting'],s:[50,105,79,35,110,76]},
  {dex:108,n:'lickitung',t:['normal'],s:[90,55,75,60,75,30]},
  {dex:109,n:'koffing',t:['poison'],s:[40,65,95,60,45,35]},
  {dex:110,n:'weezing',t:['poison'],s:[65,90,120,85,70,60]},
  {dex:111,n:'rhyhorn',t:['ground','rock'],s:[80,85,95,30,30,25]},
  {dex:112,n:'rhydon',t:['ground','rock'],s:[105,130,120,45,45,40]},
  {dex:113,n:'chansey',t:['normal'],s:[250,5,5,35,105,50]},
  {dex:114,n:'tangela',t:['grass'],s:[65,55,115,100,40,60]},
  {dex:115,n:'kangaskhan',t:['normal'],s:[105,95,80,40,80,90]},
  {dex:116,n:'horsea',t:['water'],s:[30,40,70,70,25,60]},
  {dex:117,n:'seadra',t:['water'],s:[55,65,95,95,45,85]},
  {dex:118,n:'goldeen',t:['water'],s:[45,67,60,35,50,63]},
  {dex:119,n:'seaking',t:['water'],s:[80,92,65,65,80,68]},
  {dex:120,n:'staryu',t:['water'],s:[30,45,55,70,55,85]},
  {dex:121,n:'starmie',t:['water','psychic'],s:[60,75,85,100,85,115]},
  {dex:122,n:'mr-mime',t:['psychic','fairy'],s:[40,45,65,100,120,90]},
  {dex:123,n:'scyther',t:['bug','flying'],s:[70,110,80,55,80,105]},
  {dex:124,n:'jynx',t:['ice','psychic'],s:[65,50,35,115,95,95]},
  {dex:125,n:'electabuzz',t:['electric'],s:[65,83,57,95,85,105]},
  {dex:126,n:'magmar',t:['fire'],s:[65,95,57,100,85,93]},
  {dex:127,n:'pinsir',t:['bug'],s:[65,125,100,55,70,85]},
  {dex:128,n:'tauros',t:['normal'],s:[75,100,95,40,70,110]},
  {dex:129,n:'magikarp',t:['water'],s:[20,10,55,15,20,80]},
  {dex:130,n:'gyarados',t:['water','flying'],s:[95,125,79,60,100,81]},
  {dex:131,n:'lapras',t:['water','ice'],s:[130,85,80,85,95,60]},
  {dex:132,n:'ditto',t:['normal'],s:[48,48,48,48,48,48]},
  {dex:133,n:'eevee',t:['normal'],s:[55,55,50,45,65,55]},
  {dex:134,n:'vaporeon',t:['water'],s:[130,65,60,110,95,65]},
  {dex:135,n:'jolteon',t:['electric'],s:[65,65,60,110,95,130]},
  {dex:136,n:'flareon',t:['fire'],s:[65,130,60,95,110,65]},
  {dex:137,n:'porygon',t:['normal'],s:[65,60,70,85,75,40]},
  {dex:138,n:'omanyte',t:['rock','water'],s:[35,40,100,90,55,35]},
  {dex:139,n:'omastar',t:['rock','water'],s:[70,60,125,115,70,55]},
  {dex:140,n:'kabuto',t:['rock','water'],s:[30,80,90,55,45,55]},
  {dex:141,n:'kabutops',t:['rock','water'],s:[60,115,105,65,70,80]},
  {dex:142,n:'aerodactyl',t:['rock','flying'],s:[80,105,65,60,75,130]},
  {dex:143,n:'snorlax',t:['normal'],s:[160,110,65,65,110,30]},
  {dex:147,n:'dratini',t:['dragon'],s:[41,64,45,50,50,50]},
  {dex:148,n:'dragonair',t:['dragon'],s:[61,84,65,70,70,70]},
  {dex:149,n:'dragonite',t:['dragon','flying'],s:[91,134,95,100,100,80]},
];

const ARENA_DEX = [
  3,6,9,12,15,18,20,22,24,26,28,31,34,36,38,40,42,45,47,49,
  51,53,55,57,59,62,65,68,71,73,76,78,80,82,83,85,87,89,91,94,
  95,97,99,101,103,105,106,107,108,110,112,113,114,115,117,119,121,122,123,124,
  125,126,127,128,130,131,132,134,135,136,137,139,141,142,143,149,
];

/* ------------------------------ NOMES ------------------------------ */
const NAME_FIX = {
  'nidoran-f': 'Nidoran♀', 'nidoran-m': 'Nidoran♂',
  'mr-mime': 'Mr. Mime', 'farfetchd': "Farfetch'd",
};

function nomeExibido(slug){
  if (NAME_FIX[slug]) return NAME_FIX[slug];
  return slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/* Slug para fontes que indexam por nome. Descarta tudo que não seja [a-z0-9]:
   nome exibido tem apóstrofo, acento e espaço, e um apóstrofo escapando daqui
   fecha a string JS de um `onerror` embutido — foi o defeito D-002. */
function slugExterno(slug){ return String(slug).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* --------------------------- GOLPES --------------------------- */
const MASTER_MOVES = {
  normal: [
    {n:'Hyper Beam',    t:'normal', p:150, cat:'esp', fx:'beam',  acc:.75},
    {n:'Hyper Voice',   t:'normal', p:90,  cat:'esp', fx:'orb',   acc:1},
    {n:'Body Slam',     t:'normal', p:85,  cat:'fis', fx:'melee'},
    {n:'Skull Bash',    t:'normal', p:130, cat:'fis', fx:'melee'},
    {n:'Quick Attack',  t:'normal', p:40,  cat:'fis', fx:'melee', acc:1},
    {n:'Extreme Speed', t:'normal', p:80,  cat:'fis', fx:'melee'},
  ],
  fire: [
    {n:'Flamethrower', t:'fire', p:90,  cat:'esp', fx:'beam'},
    {n:'Fire Blast',   t:'fire', p:110, cat:'esp', fx:'orb', acc:.85},
    {n:'Fire Punch',   t:'fire', p:75,  cat:'fis', fx:'melee'},
  ],
  water: [
    {n:'Hydro Pump', t:'water', p:110, cat:'esp', fx:'beam', acc:.80},
    {n:'Surf',       t:'water', p:90,  cat:'esp', fx:'beam', acc:1},
    {n:'Waterfall',  t:'water', p:80,  cat:'fis', fx:'melee'},
  ],
  electric: [
    {n:'Thunderbolt', t:'electric', p:90,  cat:'esp', fx:'beam'},
    {n:'Discharge',   t:'electric', p:80,  cat:'esp', fx:'orb', acc:1},
    {n:'Volt Tackle', t:'electric', p:120, cat:'fis', fx:'melee'},
    {n:'Thunder Fang',t:'electric', p:65,  cat:'fis', fx:'melee', acc:.95},
  ],
  grass: [
    {n:'Solar Beam',   t:'grass', p:120, cat:'esp', fx:'beam'},
    {n:'Petal Dance',  t:'grass', p:120, cat:'esp', fx:'orb'},
    {n:'Magical Leaf', t:'grass', p:60,  cat:'esp', fx:'orb', acc:1},
  ],
  ice: [
    {n:'Ice Beam', t:'ice', p:90,  cat:'esp', fx:'beam'},
    {n:'Blizzard', t:'ice', p:110, cat:'esp', fx:'beam', acc:.70},
    {n:'Ice Fang', t:'ice', p:65,  cat:'fis', fx:'melee'},
  ],
  fighting: [
    {n:'Aura Sphere',   t:'fighting', p:80,  cat:'esp', fx:'orb', acc:1},
    {n:'Focus Blast',   t:'fighting', p:120, cat:'esp', fx:'orb', acc:.70},
    {n:'Close Combat',  t:'fighting', p:120, cat:'fis', fx:'melee'},
    {n:'Cross Chop',    t:'fighting', p:100, cat:'fis', fx:'melee', acc:.80},
    {n:'Dynamic Punch', t:'fighting', p:100, cat:'fis', fx:'melee', acc:.60},
    {n:'Body Press',    t:'fighting', p:80,  cat:'fis', fx:'melee'},
  ],
  poison: [
    {n:'Sludge Bomb', t:'poison', p:90,  cat:'esp', fx:'orb'},
    {n:'Poison Jab',  t:'poison', p:80,  cat:'fis', fx:'melee'},
    {n:'Gunk Shot',   t:'poison', p:120, cat:'fis', fx:'orb', acc:.70},
  ],
  ground: [
    {n:'Earthquake', t:'ground', p:100, cat:'fis', fx:'melee'},
    {n:'Dig',        t:'ground', p:80,  cat:'fis', fx:'melee'},
    {n:'Mud Shot',   t:'ground', p:55,  cat:'esp', fx:'orb', acc:.95},
  ],
  flying: [
    {n:'Air Slash',  t:'flying', p:75,  cat:'esp', fx:'orb'},
    {n:'Brave Bird', t:'flying', p:120, cat:'fis', fx:'melee'},
    {n:'Drill Peck', t:'flying', p:80,  cat:'fis', fx:'melee', acc:1},
  ],
  psychic: [
    {n:'Psychic',      t:'psychic', p:90, cat:'esp', fx:'orb'},
    {n:'Psyshock',     t:'psychic', p:80, cat:'esp', fx:'orb'},
    {n:'Zen Headbutt', t:'psychic', p:80, cat:'fis', fx:'melee'},
  ],
  bug: [
    {n:'Bug Bite',    t:'bug', p:60,  cat:'fis', fx:'melee', acc:1},
    {n:'X-Scissor',   t:'bug', p:80,  cat:'fis', fx:'melee'},
    {n:'Megahorn',    t:'bug', p:120, cat:'fis', fx:'melee', acc:.85},
    {n:'Signal Beam', t:'bug', p:75,  cat:'esp', fx:'orb'},
  ],
  rock: [
    {n:'Stone Edge',    t:'rock', p:100, cat:'fis', fx:'orb', acc:.80},
    {n:'Rock Tomb',     t:'rock', p:60,  cat:'fis', fx:'melee', acc:.95},
    {n:'Ancient Power', t:'rock', p:60,  cat:'esp', fx:'orb', acc:1},
  ],
  ghost: [
    {n:'Shadow Ball', t:'ghost', p:80, cat:'esp', fx:'orb'},
    {n:'Shadow Claw', t:'ghost', p:70, cat:'fis', fx:'melee', acc:1},
    {n:'Lick',        t:'ghost', p:30, cat:'fis', fx:'melee', acc:.96},
  ],
  dragon: [
    {n:'Dragon Pulse', t:'dragon', p:85,  cat:'esp', fx:'beam'},
    {n:'Dragon Claw',  t:'dragon', p:80,  cat:'fis', fx:'melee'},
    {n:'Outrage',      t:'dragon', p:120, cat:'fis', fx:'melee'},
  ],
  dark: [
    // nenhum Kanto é do tipo Sombrio, mas ficam disponíveis como
    // cobertura genérica (mordidas/golpes sujos combinam com quase todos)
    {n:'Crunch',    t:'dark', p:80, cat:'fis', fx:'melee'},
    {n:'Bite',      t:'dark', p:60, cat:'fis', fx:'melee'},
    {n:'Knock Off', t:'dark', p:65, cat:'fis', fx:'melee'},
    {n:'Payback',   t:'dark', p:50, cat:'fis', fx:'melee'},
    {n:'Foul Play', t:'dark', p:95, cat:'fis', fx:'melee'},
    {n:'Dark Pulse',t:'dark', p:80, cat:'esp', fx:'beam'},
  ],
  steel: [
    {n:'Flash Cannon', t:'steel', p:80,  cat:'esp', fx:'beam'},
    {n:'Iron Head',    t:'steel', p:80,  cat:'fis', fx:'melee'},
    {n:'Iron Tail',    t:'steel', p:100, cat:'fis', fx:'melee', acc:.75},
    {n:'Meteor Mash',  t:'steel', p:90,  cat:'fis', fx:'melee'},
    {n:'Bullet Punch', t:'steel', p:40,  cat:'fis', fx:'melee', acc:1},
  ],
  fairy: [
    {n:'Moonblast',     t:'fairy', p:95, cat:'esp', fx:'orb'},
    {n:'Dazzling Gleam',t:'fairy', p:80, cat:'esp', fx:'beam'},
  ],
};

/* ------------------------------ CLIMA ------------------------------ */
const CLIMA = [
  { key:'neutro', w:40, emoji:'⛅', name:'Neutro',
    type:null, stat:null, mult:1, desc:'Sem bônus climático nesta rodada.' },
  { key:'sol', w:15, emoji:'☀️', name:'Sol Forte',
    type:'fire', stat:'offense', mult:2, desc:'Pokémon de Fogo com ATK/SpA em dobro!' },
  { key:'chuva', w:15, emoji:'🌧️', name:'Chuva',
    type:'water', stat:'spe', mult:2, desc:'Pokémon de Água com Velocidade em dobro!' },
  { key:'vento', w:15, emoji:'🌬️', name:'Vendaval',
    type:'flying', stat:'spe', mult:1.5, desc:'Pokémon Voadores com Velocidade x1,5!' },
  { key:'neve', w:15, emoji:'❄️', name:'Nevasca',
    type:'ice', stat:'offense', mult:1.5, desc:'Pokémon de Gelo com ATK/SpA x1,5!' },
];

/* ------------------------------ ARTE ------------------------------ */
/* Resolução de endereço de sprite. É do pack porque o endereço depende da
   fonte da arte, e a arte é o tema. Ver lacuna L-017: a ordem
   `local -> origem -> espelho` entra aqui quando o download local existir. */
function sprite(especie){
  return `https://play.pokemonshowdown.com/sprites/gen5ani/${slugExterno(especie.n)}.gif`;
}

/* ----------------------------- MOEDA ----------------------------- */
const MOEDA = { nome: 'PokéCash', simbolo: '💵' };

/* Como a interface chama as coisas neste tema (F1.12). Antes estes nomes
   estavam escritos dentro do cliente, que é onde eles não podem estar. */
const ROTULOS = {
  criatura:  'Pokémon',
  criaturas: 'Pokémon',
  elenco:    'Kanto',
  arena:     'PokéArena',
};

export const pokemonKantoV1 = {
  id: 'pokemon_kanto_v1',
  tipos:    { efetividade: CHART, cores: TCOLOR, nomes: TIPO_PT },
  especies: KANTO_DEX_FULL,
  elenco:   ARENA_DEX,
  golpes:   MASTER_MOVES,
  clima:    CLIMA,
  moeda:    MOEDA,
  rotulos: ROTULOS,
  nomeExibido, slugExterno, sprite,
};

export default pokemonKantoV1;
