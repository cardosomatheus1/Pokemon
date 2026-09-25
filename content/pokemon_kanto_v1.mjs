import { TODOS as CATALOGO_ITENS } from './itens_v1.mjs';
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

/* ─────────────────────── O CLIMA DO AVANÇO (1.32) ───────────────────────
 *
 * OUTRA LISTA, e de propósito. O `CLIMA` acima é o da ARENA: ele muda DANO, e
 * as odds do §4.4 foram medidas sobre os pesos dele. Acrescentar entradas ali
 * mexeria na precificação de um modo que não pediu nada.
 *
 * Aqui o eixo é o FARM, e a regra do dono é a que manda:
 *
 *   > "o clima sol forte no iddle pode aumentar em 2.5% de xp a mais no farm da
 *   >  rota isso usando um Pokémon de fogo obvio"
 *
 * O QUANTO não está escrito aqui, e isso é o desenho: o motor calcula o passo
 * a partir de quão RARO o tipo é no elenco (`engine/clima-idle.mjs`). Um clima
 * fácil de satisfazer paga pouco; um que quase ninguém aproveita paga muito. O
 * dono levantou o Gelo, que tem quatro espécies de 146 — e ele passa a pagar o
 * maior bônus da tabela sem que ninguém escreva um número especial para ele.
 *
 * ── A COBERTURA, MEDIDA ANTES DE ESCOLHER OS CLIMAS ──────────────────────
 *
 *     poison 33 · water 32 · normal 22 · flying 16 · grass 14 · ground 14
 *     bug 12 · psychic 12 · fire 11 · rock 11 · electric 8 · fighting 8
 *     fairy 5 · ice 4 · ghost 3 · dragon 3 · steel 2
 *
 * O achado que mudou a lista: **Veneno é o MAIOR tipo do elenco e não tinha
 * clima nenhum.** Ele ganha a Névoa — e o prêmio dela é item raro, que é o que
 * o jogador mais quer, para compensar o passo baixo de um tipo comum.
 *
 * Terra e pedra entram JUNTOS na Tempestade porque separados dariam dois climas
 * quase idênticos; juntos cobrem 25 espécies e viram um só, com peso próprio.
 *
 * ── OS PESOS ─────────────────────────────────────────────────────────────
 *
 * Neutro leva 40%, e é a maior fatia. O dono escreveu que *"o clima da run é
 * RNG, e não acontece sempre"* — um bônus que cai toda run deixa de ser
 * acontecimento e vira a linha de base.
 *
 * A Nevasca leva 2%. Ela é o clima de sorte grande: raro de sair, e enorme
 * quando sai com um time de Gelo. Sair uma Nevasca vale história. */
const CLIMA_IDLE = [
  { key:'neutro', w:40, emoji:'⛅', name:'Tempo Firme', tipos:[], rende:null,
    desc:'Sem bônus de clima nesta run.' },
  { key:'sol', fx:'sol', w:10, emoji:'☀️', name:'Sol Forte', tipos:['fire'], rende:'xp',
    desc:'Quem é de Fogo rende mais XP nesta run.' },
  { key:'chuva', fx:'chuva', w:10, emoji:'🌧️', name:'Chuva', tipos:['water'], rende:'ritmo',
    desc:'Quem é de Água acelera as waves desta run.' },
  { key:'vendaval', fx:'vento', w:10, emoji:'🌬️', name:'Vendaval', tipos:['flying'], rende:'moeda',
    desc:'Quem é Voador traz mais moeda desta run.' },
  { key:'tempestade', fx:'chuva', w:10, emoji:'⛈️', name:'Tempestade', tipos:['ground','rock'], rende:'material',
    desc:'Quem é de Terra ou Pedra traz mais material.' },
  { key:'nevoa', fx:'nevoa', w:10, emoji:'🟣', name:'Névoa Tóxica', tipos:['poison'], rende:'itemRaro',
    desc:'Quem é de Veneno melhora o item raro do baú.' },
  { key:'polen', fx:'polen', w:8, emoji:'🌼', name:'Pólen', tipos:['grass'], rende:'material',
    desc:'Quem é de Planta traz mais material.' },
  { key:'nevasca', fx:'neve', w:2, emoji:'❄️', name:'Nevasca', tipos:['ice'], rende:'itemRaro',
    desc:'Raríssima. Quem é de Gelo melhora MUITO o item raro do baú.' },
];

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

/* ══ A FAUNA DE CENÁRIO ════════════════════════════════════════════════════
 *
 * Quem HABITA cada bioma, sem interação: não se captura, não se luta, não dá XP
 * e não entra no Pokédex. Existe para o lugar ter moradores — e para o jogador
 * reconhecer o bioma antes de ler o nome dele. Um Psyduck na areia diz "praia"
 * mais rápido do que a palavra praia.
 *
 * ── POR QUE ISTO MORA NO PACK, E NÃO NO APP ──────────────────────────────
 *
 * Porque é TEMA. O portão `conteudo` reprovou a primeira versão, que morava em
 * `app/modules/fauna-dados.mjs`, e reprovou com razão: `ow_pikachu` é
 * identificador de franquia, e o §0.3 diz que ele não existe fora daqui.
 *
 * A fronteira que ficou: o PACK diz QUEM decora e ONDE; o app sabe COMO
 * desenhar uma tira de quadros. O pack original traz a fauna dele, e a mesma
 * tela serve os dois sem uma linha de diferença.
 *
 * ── AS DUAS REGRAS DA LISTA ──────────────────────────────────────────────
 *
 * 1. COERÊNCIA. Decisão do dono: nada de Charizard na caverna de gelo, nada de
 *    Staryu no meio da floresta. Cada entrada responde "por que ESTE aqui".
 *
 * 2. POUCOS. Três a cinco por bioma. Cenário cheio de criatura não parece vivo,
 *    parece zoológico — e some com o traje, que é o que o jogador escolheu.
 *
 * `onde` diz em que faixa a criatura aparece: `grama`, `trilha`, `margem` ou
 * `agua`. Sem isso um Lapras aparece na grama e um Machop boiando.
 *
 * `lago` e o quinto, e e diferente dos outros quatro: nao e uma linha do mapa,
 * e o acidente de relevo que pode ou nao existir naquele bioma. Quem e de lago
 * num bioma sem lago NAO APARECE — ver o modulo, bloco QUEM MORA DENTRO DO
 * LAGO. So os quatro biomas com agua no meio tem um: floresta, campo, oasis e
 * estufa, e cada um deles tem exatamente UM.
 *
 * `quadro` é o tamanho de UM quadro da tira. O número de quadros sai da largura
 * do arquivo dividida por ele — arte regravada com mais quadros anima melhor
 * sem tocar nesta tabela. */
const FAUNA = {
  floresta: [
    { arq:'ow_pidgey',    quadro:[16,16], onde:'grama',  nota:'o pássaro comum de rota' },
    { arq:'ow_nidoran_m', quadro:[16,16], onde:'grama',  nota:'mato alto é a casa dele' },
    { arq:'ow_nidoran_f', quadro:[16,16], onde:'grama',  nota:'o par, do outro lado da trilha' },
    { arq:'ow_meowth',    quadro:[16,16], onde:'trilha', nota:'gato anda no caminho aberto' },
    { arq:'ow_slowpoke',  quadro:[16,16], onde:'lago',   nota:'dentro do laguinho, cauda na agua — o pedido literal do dono' },
  ],
  praia: [
    { arq:'ow_wingull',  quadro:[16,16], onde:'margem', nota:'gaivota; o único que voa' },
    { arq:'ow_psyduck',  quadro:[16,16], onde:'margem', nota:'o pedido literal do dono' },
    { arq:'ow_slowpoke', quadro:[16,16], onde:'margem', nota:'sentado, cauda na água' },
    { arq:'ow_seel',     quadro:[16,16], onde:'agua',   nota:'dentro da água, não na areia' },
  ],
  campo: [
    { arq:'ow_doduo',      quadro:[16,16], onde:'grama',  nota:'corredor de campo aberto' },
    { arq:'ow_pidgey',     quadro:[16,16], onde:'grama',  nota:'' },
    { arq:'ow_chansey',    quadro:[16,16], onde:'grama',  nota:'raro de ver, e é esse o ponto' },
    { arq:'ow_jigglypuff', quadro:[16,16], onde:'trilha', nota:'' },
    { arq:'ow_psyduck',    quadro:[16,16], onde:'lago',   nota:'se refrescando no laguinho do campo' },
  ],
  montanha: [
    { arq:'ow_machop',  quadro:[16,16], onde:'grama', nota:'treina onde tem pedra' },
    { arq:'ow_cubone',  quadro:[16,16], onde:'grama', nota:'' },
    { arq:'ow_spearow', quadro:[16,16], onde:'grama', nota:'agressivo, de altitude' },
    { arq:'ow_fearow',  quadro:[16,16], onde:'grama', nota:'a evolução, mais ao fundo' },
  ],
  gelo: [
    { arq:'ow_seel',   quadro:[16,16], onde:'agua',  nota:'foca de caverna gelada' },
    { arq:'ow_lapras', quadro:[16,16], onde:'agua',  nota:'grande, e fica na água' },
    { arq:'ow_cubone', quadro:[16,16], onde:'grama', nota:'sozinho na neve, e é a ideia' },
  ],
  vulcao: [
    { arq:'ow_machoke', quadro:[16,16], onde:'grama', nota:'calor não o incomoda' },
    { arq:'ow_cubone',  quadro:[16,16], onde:'grama', nota:'' },
    { arq:'ow_voltorb', quadro:[16,16], onde:'grama', nota:'parado parece pedra — é o susto' },
  ],
  deserto: [
    { arq:'ow_cubone',     quadro:[16,16], onde:'grama', nota:'osso e areia' },
    { arq:'ow_doduo',      quadro:[16,16], onde:'grama', nota:'corre bem em terreno aberto' },
    { arq:'ow_kangaskhan', quadro:[16,16], onde:'grama', nota:'grande; dá escala ao vazio' },
  ],
  oasis: [
    { arq:'ow_psyduck',  quadro:[16,16], onde:'lago',   nota:'no oasis a agua do meio E o bioma; e la que ele fica' },
    { arq:'ow_wingull',  quadro:[16,16], onde:'margem', nota:'' },
    { arq:'ow_clefairy', quadro:[16,16], onde:'grama',  nota:'oásis é lugar de coisa rara' },
    { arq:'ow_slowpoke', quadro:[16,16], onde:'margem', nota:'' },
  ],
  ruina: [
    { arq:'ow_omanyte', quadro:[16,16], onde:'agua',   nota:'fóssil; ruína afogada é a casa' },
    { arq:'ow_kabuto',  quadro:[16,16], onde:'margem', nota:'o outro fóssil, na pedra molhada' },
    { arq:'ow_slowbro', quadro:[16,16], onde:'margem', nota:'' },
  ],
  estufa: [
    { arq:'ow_nidoran_f',  quadro:[16,16], onde:'grama',  nota:'veneno entre as plantas' },
    { arq:'ow_nidoran_m',  quadro:[16,16], onde:'grama',  nota:'' },
    { arq:'ow_clefairy',   quadro:[16,16], onde:'grama',  nota:'' },
    { arq:'ow_wigglytuff', quadro:[16,16], onde:'trilha', nota:'' },
    { arq:'ow_slowpoke',   quadro:[16,16], onde:'lago',   nota:'o tanque da estufa; o segundo e ultimo do acervo' },
  ],
  ferrovelho: [
    { arq:'ow_voltorb', quadro:[16,16], onde:'grama',  nota:'literalmente sucata elétrica' },
    { arq:'ow_pikachu', quadro:[16,16], onde:'grama',  nota:'elétrico atrás de energia' },
    { arq:'ow_meowth',  quadro:[16,16], onde:'trilha', nota:'catador de moeda em ferro-velho' },
  ],
};

/* ── OS PROPS ──────────────────────────────────────────────────────────────
 *
 * Árvore de Cut e rocha de Smash. Elas fazem um trabalho que criatura nenhuma
 * faz: ficam NA FRENTE dos pés. Em overworld de verdade alguma coisa sempre
 * passa na frente do personagem, e é isso que faz ele estar DENTRO da cena. */
const PROPS = {
  floresta:[{arq:'cuttable_tree',n:5}],  campo:[{arq:'cuttable_tree',n:2}],
  montanha:[{arq:'breakable_rock',n:5}], vulcao:[{arq:'breakable_rock',n:4}],
  gelo:[{arq:'breakable_rock',n:3}],     deserto:[{arq:'breakable_rock',n:2}],
  oasis:[{arq:'cuttable_tree',n:3}],     estufa:[{arq:'cuttable_tree',n:6}],
  ruina:[{arq:'breakable_rock',n:4}],    ferrovelho:[{arq:'breakable_rock',n:3}],
  praia:[{arq:'breakable_rock',n:1}],
};

/* FORA DESTE PACK, mas em disco: cinco sprites de Hoenn e um de Johto. Num pack
   de Kanto eles denunciam. Ficam listados para o dono decidir — o `sudowoodo` em
   especial é tentador, porque é uma árvore que se mexe. */
const FAUNA_FORA = ['ow_azumarill','ow_kecleon','ow_skitty','ow_poochyena',
                    'ow_zigzagoon','ow_sudowoodo'];

/* ------------------------------ ARTE ------------------------------ */
/* Resolução de endereço de sprite. É do pack porque o endereço depende da
   fonte da arte, e a arte é o tema. Ver lacuna L-017: a ordem
   `local -> origem -> espelho` entra aqui quando o download local existir. */
function sprite(especie){
  return `https://play.pokemonshowdown.com/sprites/gen5ani/${slugExterno(especie.n)}.gif`;
}

/* O MESMO DESENHO, RECOLORIDO, NUMA PASTA IRMÃ.
 *
 * `gen5ani-shiny` é a variante shiny da MESMA família de arte — não é outra
 * fonte, outro estilo nem outro repositório. É a mesma regra que já vale para
 * a folha da arena (`0000/0001/`) e para o retrato do dex (`shiny/`), e é a
 * regra que custou uma versão ao projeto quando foi quebrada: **o resgate
 * busca a mesma coisa em outro endereço, nunca outra coisa.**
 *
 * Mora no pack, e não em quem desenha, porque endereço de arte é tema. O
 * `original_v1` pinta com arte nossa, local, e ali um `-shiny` apontaria para
 * um arquivo que não existe. */
function spriteShiny(especie){
  return `https://play.pokemonshowdown.com/sprites/gen5ani-shiny/${slugExterno(especie.n)}.gif`;
}

/* ----------------------------- MOEDA ----------------------------- */
/* ── AS CÉDULAS (R28) ──────────────────────────────────────────────────────
 *
 * Quais criaturas aparecem em cada nota é decisão de TEMA, e por isso mora
 * aqui. Escolhê-las no `cedula.mjs` seria escrever identificador da franquia
 * dentro do app — o que o `test/conteudo.mjs` existe para impedir.
 *
 * Os valores são os mesmos das fichas de aposta (`CHIP_VALUES`), de propósito:
 * a nota que o jogador vê na carteira é a nota que ele aposta. Denominação que
 * não corresponde a nenhuma aposta seria dinheiro que não se gasta.
 *
 * A escolha das espécies segue a ordem que as artes de referência do dono já
 * usavam — a linha inicial de Kanto subindo com o valor, e o de mil reservado
 * a um lutador de peso. */
const NOTAS = [
  { valor:   50, dex:   1 },
  { valor:  100, dex:   4 },
  { valor:  300, dex:   7 },
  { valor:  500, dex:   6 },
  { valor: 1000, dex:   9 },
];

const MOEDA = { nome: 'PokéCash', simbolo: '💵', notas: NOTAS };

/* ── A MOEDA DO PvE E O MATERIAL (L-095) ──────────────────────────────────
 *
 * São TRÊS coisas com papéis diferentes, e o dono nomeou as três:
 *
 *     PokéCash   a APOSTA — moeda da arena, simulada
 *     PokéCoin   o DINHEIRO do PvE — o idle e a Torre pagam nele
 *     Essência   o MATERIAL — farma-se, e troca-se por item de poder
 *
 * A distinção não é decorativa: **dinheiro compra o que já tem preço; material
 * compra o que não devia ter preço.** Um item de poder comprável por dinheiro é
 * a loja vendendo poder; o mesmo item saindo de uma troca por material farmado
 * é recompensa de persistência.
 *
 * Moram aqui, e não no motor, porque nome de moeda é NOMENCLATURA DE TEMA — o
 * portão `conteudo` reprovou a primeira versão por isto, pela quarta vez neste
 * projeto.
 *
 * A `Essência` mantém o id que sempre teve: ela mudou de PAPEL, não de nome, e
 * por isso nenhum saldo salvo precisa ser convertido. */
const MOEDA_PVE = { id: "pokecoin", nome: 'PokéCoin', simbolo: "🪙" };
const MATERIAL  = { id: "essencia", nome: "Essência" };

/* Como a interface chama as coisas neste tema (F1.12). Antes estes nomes
   estavam escritos dentro do cliente, que é onde eles não podem estar. */

/* ── AS FALAS DA VENDEDORA (1.25) ─────────────────────────────────────────
 *
 * Uma é sorteada quando a loja abre. Elas moram no PACK e não na tela pelo
 * mesmo motivo que os rótulos: **texto é tema**, e o §0.3 não deixa nome de
 * franquia entrar em `engine/` — mas também não faz sentido a tela do app
 * carregar a personalidade de uma personagem que muda com o pack.
 *
 * ── E ELAS NÃO SÃO ENFEITE ──────────────────────────────────────────────
 *
 * A crítica que chegou de fora foi *"muito linear, site de velho"*. Uma loja
 * que abre com uma tabela de preços é um formulário; uma que abre com alguém
 * falando é um lugar. **A vendedora custa dez frases e muda a natureza da
 * tela.**
 *
 * Escritas na voz que a arte dela já tem — banca de rua, neon, jaqueta de
 * remendos, o cartaz "GAME COINS! RARE! HUSTLE!". Uma vendedora de loja de
 * departamento aqui seria a arte dizendo uma coisa e o texto dizendo outra.
 *
 * Três delas falam de VENDER, e isso é de propósito: a metade de venda da loja
 * é a que o jogador esquece que existe. */
const FALAS_DA_LOJA = [
  'Chegou! Olha, hoje tá tudo em conta — quase.',
  'Bola boa é bola que você tem na hora certa. Pensa nisso.',
  'Se tá pesando na mochila, eu compro. Sério, qualquer coisa.',
  'Ó, eu pago bem em pedra. Se achar uma, traz.',
  'Tem gente que junta trinta bola e nunca usa. Não seja essa gente.',
  'Compra na baixa, captura na alta. É assim que funciona.',
  'A Ultra é cara, mas você não quer perder um raro por causa de duzentos.',
  'Nada aqui é de graça, mas nada aqui é golpe. Combinado?',
  'Se voltar de mãos vazias, eu compro o que sobrou da viagem.',
  'Roda a mochila aí, vai que tem coisa boa que você nem viu.',
];

const ROTULOS = {
  /* O NOME DO REGISTRO DE ESPECIES vem do PACK (1.19).
     O motor nao pode dizer o nome da franquia — e identificador de tema, e o
     portao §0.3 reprova qualquer um dentro de `engine/`. Entao o motor fala
     `registro`, neutro, e o TEMA diz como ele se chama para quem joga.

     E a mesma porta da moeda e do material, e e ela que mantem a engenharia
     trocavel de tema — que e decisao registrada do dono. */
  registro:  'Pokédex',
  criatura:  'Pokémon',
  criaturas: 'Pokémon',
  elenco:    'Kanto',
  arena:     'PokéArena',
};

/* ── A ARTE DA MARCA (R26) ─────────────────────────────────────────────────
 *
 * Desenhada pelo dono do projeto. Sai do PACK, e não de um caminho fixo no
 * HTML, pela mesma razão que o NOME sai daqui: a marca é o identificador de
 * tema mais visível que existe, e a camada de conteúdo promete que trocar de
 * pack troca o tema INTEIRO. Caminho escrito no `index.html` deixaria a marca
 * antiga na tela do tema novo.
 *
 * As três peças, e cada uma tem um lugar:
 *   logo          o símbolo sozinho — cabe onde não há largura para o nome
 *   letrado       o nome desenhado — a barra do topo, onde o símbolo já está
 *   logoLetrado   as duas juntas — o herói, onde há espaço para a marca inteira
 *
 * PNG com canal alfa, e isso é requisito, não detalhe: a marca vai sobre a
 * barra escura e sobre o herói. Um retângulo de fundo atrás dela anularia as
 * duas — `test/marca-arte.mjs` cobra o alfa por isso. */
const MARCA = {
  logo:        'arte/marca/logo.png',
  letrado:     'arte/marca/letrado.png',
  logoLetrado: 'arte/marca/logo-letrado.png',
};

/* ── AS NATUREZAS ──────────────────────────────────────────────────────────
 *
 * Elas vivem AQUI, e não no motor, porque são nomenclatura da FRANQUIA — o
 * portão `conteudo` pegou isso na primeira execução do bloco 1.1, e estava
 * certo. O §0.3 é explícito: nome, tipo e golpe ficam isolados na Content
 * Layer, e o motor tem de rodar contra qualquer pack.
 *
 * Serve também ao critério da Gen 2: um pack diferente traz as naturezas dele,
 * e o motor não muda uma linha.
 *
 * FORMA: [nome, eixo que sobe, eixo que desce]. `null` nos dois é neutra.
 *
 * AS CINCO NEUTRAS EXISTEM DE PROPÓSITO. Elas valem menos no mercado, e são a
 * primeira coisa que dá preço diferente a dois Pokémon de mesmo Potencial. */
const NATUREZAS = [
  ['Hardy', null, null], ['Docile', null, null], ['Serious', null, null],
  ['Bashful', null, null], ['Quirky', null, null],
  ['Lonely', 'atq', 'def'], ['Brave', 'atq', 'vel'], ['Adamant', 'atq', 'spa'], ['Naughty', 'atq', 'spd'],
  ['Bold', 'def', 'atq'], ['Relaxed', 'def', 'vel'], ['Impish', 'def', 'spa'], ['Lax', 'def', 'spd'],
  ['Timid', 'vel', 'atq'], ['Hasty', 'vel', 'def'], ['Jolly', 'vel', 'spa'], ['Naive', 'vel', 'spd'],
  ['Modest', 'spa', 'atq'], ['Mild', 'spa', 'def'], ['Quiet', 'spa', 'vel'], ['Rash', 'spa', 'spd'],
  ['Calm', 'spd', 'atq'], ['Gentle', 'spd', 'def'], ['Sassy', 'spd', 'vel'], ['Careful', 'spd', 'spa'],
];

/* ── OS BIOMAS DO MODO IDLE ────────────────────────────────────────────────
 *
 * Onde cada criatura aparece. A regra é uma só, e o dono do projeto a definiu:
 *
 *   > Um Pokémon de gelo não aparece dentro de uma caverna de fogo.
 *
 * ISTO NÃO É ENFEITE. É o que dá RAZÃO PARA ESCOLHER onde farmar — sem a
 * fidelidade, o idle vira uma tela só pintada de cores diferentes, e escolher a
 * rota deixa de ser decisão.
 *
 * A LISTA É POR TIPO, E NÃO POR ESPÉCIE, e isso é decisão de manutenção:
 * escrever bioma para 151 criaturas seria dado morto que desatualiza no dia em
 * que alguém corrigir um tipo — e que teria de ser reescrito inteiro quando a
 * Gen 2 chegar. Assim, acrescentar cem espécies é acrescentar cem espécies.
 *
 * Uma criatura mora num bioma se tiver PELO MENOS UM tipo dele. Tipo duplo é a
 * regra e não a exceção; exigir os dois deixaria o Gyarados fora da praia.
 *
 * Os três últimos são de autoria do projeto — não existem no material de
 * origem, e cada um usa a luz do cenário de um jeito que os outros não usam.
 * Ver docs/DESENHO_FASE1.md §7 e a L-057. */
/* A PALETA DE CADA BIOMA MORA AQUI, e não no app.
 *
 * Cor de bioma é TEMA, do mesmo jeito que as cores de tipo — e tema mora em
 * `content/` (§0.3). Se a paleta vivesse no app, o pack original renderizaria
 * com cor emprestada deste, e o §0.3.1 deixaria de ser cumprível por um caminho
 * que ninguém olharia.
 *
 * `detalhe` é quanto o chão tem de coisa espalhada. Um deserto liso e uma
 * estufa tomada não podem ter a mesma densidade — é o que separa um lugar do
 * outro tanto quanto a cor.
 *
 * As três últimas são de autoria do projeto, e nasceram de uma regra: O MUNDO
 * TEM LUZ PRÓPRIA. Cada uma usa `luz` de um jeito que as outras não usam — a
 * Ruína ilumina de baixo, a Estufa tem pólen no ar, o Ferro-Velho estala. Se a
 * luz de uma pudesse ser trocada pela de outra sem perder nada, aquele bioma
 * não teria razão de existir. */
const BIOMAS = [
  { id:'floresta',   rotulo:'Floresta',        tipos:['grass','bug'], assinatura:['bug','grass'],
    detalhe:150, paleta:{ base:'#3c6b3e', baseEsc:'#2f5733', claro:'#6ba55c', acento:'#8fd46a', trilha:'#7a6a48', trilhaEsc:'#655739', areia:'#6d7b46', massa:'#2a6b52', massaEsc:'#1c4c3b', massaClaro:'#49967a', espuma:'#8fe0c0', luz:'rgba(150,255,140,.22)', luzNucleo:'#c8ffb0' } },
  { id:'praia',      rotulo:'Praia',           tipos:['water','flying'], assinatura:['water','flying'],
    detalhe:60, paleta:{ base:'#d8c58c', baseEsc:'#c2ad74', claro:'#efe0ae', acento:'#f5ecc8', trilha:'#c9b077', trilhaEsc:'#b09a64', areia:'#e8d6a4', massa:'#2f7fa8', massaEsc:'#1f5c7d', massaClaro:'#63b6d4', espuma:'#e8fbff', luz:'rgba(120,230,255,.20)', luzNucleo:'#d6f7ff' } },
  { id:'campo',      rotulo:'Campo',           tipos:['normal','electric','fairy'], assinatura:['normal','electric'],
    detalhe:190, paleta:{ base:'#6b9c4a', baseEsc:'#578040', claro:'#93c46b', acento:'#f4e878', trilha:'#a08a5c', trilhaEsc:'#87734b', areia:'#8fa055', massa:'#3f7f96', massaEsc:'#2c5c70', massaClaro:'#6fb2c4', espuma:'#daf6ff', luz:'rgba(255,240,140,.20)', luzNucleo:'#fff6c0' } },
  { id:'montanha',   rotulo:'Montanha',        tipos:['rock','ground','fighting'], assinatura:['rock','fighting'],
    detalhe:80, paleta:{ base:'#7d7263', baseEsc:'#645b4f', claro:'#a1957f', acento:'#c9b08a', trilha:'#8d7f6b', trilhaEsc:'#736757', areia:'#6f6455', massa:'#4a4038', massaEsc:'#332c26', massaClaro:'#6b5d50', espuma:'#9d8f7c', cascata:'#2f6b8c', cascataEsc:'#1d4a63', cascataClaro:'#7bc0da', cascataEspuma:'#d8f2fb', luz:'rgba(255,200,120,.16)', luzNucleo:'#ffd9a0' } },
  { id:'gelo',       rotulo:'Caverna de gelo', tipos:['ice','water'], assinatura:['ice'],
    detalhe:50, paleta:{ base:'#8fb6cc', baseEsc:'#74a0ba', claro:'#c4e3f2', acento:'#eafaff', trilha:'#9dc2d6', trilhaEsc:'#83aac0', areia:'#a8cee0', massa:'#3f7089', massaEsc:'#2c5266', massaClaro:'#6fa4bd', espuma:'#e8fbff', luz:'rgba(140,220,255,.26)', luzNucleo:'#e6fbff' } },
  { id:'vulcao',     rotulo:'Vulcão',          tipos:['fire','dragon'], assinatura:['fire','dragon'],
    detalhe:70, paleta:{ base:'#42302b', baseEsc:'#2e2119', claro:'#6a4c3d', acento:'#ff9a45', trilha:'#584038', trilhaEsc:'#3f2d27', areia:'#6b4632', massa:'#c9421f', massaEsc:'#8f2a12', massaClaro:'#ff8340', espuma:'#ffc27a', luz:'rgba(255,130,40,.28)', luzNucleo:'#ffd08a' } },
  { id:'deserto',    rotulo:'Deserto',         tipos:['ground','rock'], assinatura:['ground'],
    detalhe:40, paleta:{ base:'#d9b878', baseEsc:'#c2a165', claro:'#f0d79c', acento:'#f7e7b8', trilha:'#c4a166', trilhaEsc:'#a98a55', areia:'#e8cf95', massa:'#b8955c', massaEsc:'#9c7c4a', massaClaro:'#e0c184', espuma:'#f7ecc9', luz:'rgba(255,215,130,.16)', luzNucleo:'#ffeec0' } },
  { id:'oasis',      rotulo:'Oásis',           tipos:['water','grass'], assinatura:['grass','water'],
    detalhe:120, paleta:{ base:'#5f8f4e', baseEsc:'#4a7440', claro:'#8cc46d', acento:'#d8ef8a', trilha:'#c4a97a', trilhaEsc:'#a68f63', areia:'#e2cf9a', massa:'#1f8f8a', massaEsc:'#146a68', massaClaro:'#4fc4bd', espuma:'#c8fff6', luz:'rgba(160,255,220,.24)', luzNucleo:'#d0fff2' } },
  /* AUTORIA DO PROJETO — ver a regra de cópia no CLAUDE.md */
  { id:'ruina',      rotulo:'Ruína Afogada',   tipos:['ghost','psychic','water','rock'], assinatura:['ghost','psychic'],
    detalhe:55, paleta:{ base:'#5a6b72', baseEsc:'#46555c', claro:'#7f9299', acento:'#9fd8cf', trilha:'#6d7d80', trilhaEsc:'#56656a', areia:'#7e8d8a', massa:'#1c4d5c', massaEsc:'#123642', massaClaro:'#3f8496', espuma:'#a8ecf0', luz:'rgba(110,240,220,.26)', luzNucleo:'#c4fff4' } },
  { id:'estufa',     rotulo:'Estufa Rachada',  tipos:['grass','bug','poison'], assinatura:['poison','bug'],
    detalhe:200, paleta:{ base:'#4a6b3c', baseEsc:'#3a5530', claro:'#7fae5f', acento:'#c9e86a', trilha:'#8a7f5e', trilhaEsc:'#6f664b', areia:'#6f7d4a', massa:'#2d6b4a', massaEsc:'#1e4a34', massaClaro:'#54a67a', espuma:'#b8f0c8', luz:'rgba(210,255,120,.22)', luzNucleo:'#e8ffb0' } },
  { id:'ferrovelho', rotulo:'Ferro-Velho',     tipos:['steel','electric','poison'], assinatura:['steel','electric'],
    detalhe:90, paleta:{ base:'#5c5a5e', baseEsc:'#46444a', claro:'#82808a', acento:'#c0c4cc', trilha:'#6b6259', trilhaEsc:'#544d46', areia:'#6e6b6a', massa:'#3a4750', massaEsc:'#28323a', massaClaro:'#5f7684', espuma:'#9fd0e8', luz:'rgba(120,220,255,.30)', luzNucleo:'#e0fbff' } },
];

/* ── AS FAIXAS DE RARIDADE ─────────────────────────────────────────────────
 *
 * DERIVADAS DA FORÇA, e não escritas espécie a espécie, pelo mesmo motivo dos
 * biomas — e por um segundo, que é de coerência: no material de origem a
 * criatura mais forte É a mais rara. Derivar mantém as duas coisas casadas para
 * sempre, inclusive quando alguém rebalancear um stat.
 *
 * As faixas moram no PACK e não no motor porque escala de força é característica
 * do TEMA: um pack de criaturas mais fracas teria as mesmas cinco raridades em
 * números completamente diferentes.
 *
 * Forma: [id, teto de soma dos stats base]. A primeira faixa que couber vence. */
/* TUDO SOBRE UMA FAIXA MORA NUMA LINHA SÓ:
 *
 *     [ nome, teto de força, chance de captura, fragmentos do Pokédex ]
 *
 * Antes eram três tabelas em dois arquivos, casadas por convenção — e convenção
 * é o que se quebra em silêncio. Aqui as três não podem discordar, porque são a
 * mesma linha.
 *
 * A CHANCE é a base, antes da bola. O teto de 85% é do motor, não daqui: ele é
 * regra de jogo e não de tema.
 *
 * A POKÉDEX cresce mais rápido que a chance cai, de propósito: o raro aparece
 * menos E precisa de mais fichas, então a ficha completa de um raro é troféu. */
const RARIDADE_FAIXAS = [
  ['comum',      340, 0.450,  8],
  ['incomum',    420, 0.280, 12],
  ['raro',       490, 0.140, 20],
  ['muitoRaro',  580, 0.060, 30],
  ['lendario', 99999, 0.015, 50],
];

/* ── AS BOLAS ──────────────────────────────────────────────────────────────
 *
 * Moram aqui, e não no motor, porque nome de bola é NOMENCLATURA DE TEMA — o
 * portão `conteudo` reprovou a primeira versão por isto, e estava certo pela
 * terceira vez neste projeto.
 *
 * A bola MULTIPLICA a chance e nunca toca na espécie sorteada (§7.6). Ela é
 * consumível: é o que faz a escolha custar, e o que transforma "qual bola uso"
 * numa decisão em vez de num reflexo. */
const BOLAS = [
  { id: 'poke',  rotulo: 'Poké Ball',  mult: 1.0 },
  { id: 'great', rotulo: 'Great Ball', mult: 1.5 },
  { id: 'ultra', rotulo: 'Ultra Ball', mult: 2.2 },
];

/* ── OS ITENS DE EVOLUÇÃO ──────────────────────────────────────────────────
 *
 * Quatro pedras do material de origem, mais o **Elo de Ligação**, que é NOSSO.
 *
 * No original, quatro linhas de Kanto evoluem por troca entre jogadores. Aqui
 * não há troca, e não vai haver: dois jogadores combinando fora do jogo furam
 * qualquer regra de preço do §25. A raridade que a troca dava vira raridade de
 * item — que o jogo controla, e que o mercado pode precificar honestamente.
 *
 * `fonte` é onde o item cai, e é o que o bloco 1.2 vai consumir. */
const ITENS = [
  { id:'fogo',   rotulo:'Pedra do Fogo',    fonte:'vulcao' },
  { id:'agua',   rotulo:'Pedra da Água',    fonte:'praia' },
  { id:'trovao', rotulo:'Pedra do Trovão',  fonte:'campo' },
  { id:'folha',  rotulo:'Pedra das Folhas', fonte:'floresta' },
  { id:'lua',    rotulo:'Pedra da Lua',     fonte:'montanha' },
  { id:'elo',    rotulo:'Elo de Ligação',   fonte:'ruina', nosso: true },
];

/* ── AS LINHAS EVOLUTIVAS ──────────────────────────────────────────────────
 *
 * Fiéis ao material de origem, como o dono do projeto pediu: os mesmos níveis,
 * as mesmas pedras. A ÚNICA divergência é a troca virando Elo de Ligação, e ela
 * está explicada acima.
 *
 * A forma é `exige`, um objeto de condições que TODAS têm de valer — ver o
 * comentário de cabeça do engine/evolucao.mjs. Escrito assim, a Gen 2 entra sem
 * o motor mudar: evolução por afinidade já é `{ vinculo: 220 }`.
 *
 * Os cinco lendários não aparecem aqui porque não aparecem no elenco: são bosses
 * de raid (L-057). */
const EVOLUCOES = [
  { de:  1, para:  2, exige:{ nivel: 16 } },
  { de:  2, para:  3, exige:{ nivel: 32 } },
  { de:  4, para:  5, exige:{ nivel: 16 } },
  { de:  5, para:  6, exige:{ nivel: 36 } },
  { de:  7, para:  8, exige:{ nivel: 16 } },
  { de:  8, para:  9, exige:{ nivel: 36 } },
  { de: 10, para: 11, exige:{ nivel: 7 } },
  { de: 11, para: 12, exige:{ nivel: 10 } },
  { de: 13, para: 14, exige:{ nivel: 7 } },
  { de: 14, para: 15, exige:{ nivel: 10 } },
  { de: 16, para: 17, exige:{ nivel: 18 } },
  { de: 17, para: 18, exige:{ nivel: 36 } },
  { de: 19, para: 20, exige:{ nivel: 20 } },
  { de: 21, para: 22, exige:{ nivel: 20 } },
  { de: 23, para: 24, exige:{ nivel: 22 } },
  { de: 27, para: 28, exige:{ nivel: 26 } },
  { de: 29, para: 30, exige:{ nivel: 16 } },
  { de: 32, para: 33, exige:{ nivel: 16 } },
  { de: 41, para: 42, exige:{ nivel: 22 } },
  { de: 43, para: 44, exige:{ nivel: 21 } },
  { de: 46, para: 47, exige:{ nivel: 24 } },
  { de: 48, para: 49, exige:{ nivel: 31 } },
  { de: 50, para: 51, exige:{ nivel: 26 } },
  { de: 52, para: 53, exige:{ nivel: 28 } },
  { de: 54, para: 55, exige:{ nivel: 33 } },
  { de: 56, para: 57, exige:{ nivel: 28 } },
  { de: 60, para: 61, exige:{ nivel: 25 } },
  { de: 63, para: 64, exige:{ nivel: 16 } },
  { de: 66, para: 67, exige:{ nivel: 28 } },
  { de: 69, para: 70, exige:{ nivel: 21 } },
  { de: 72, para: 73, exige:{ nivel: 30 } },
  { de: 74, para: 75, exige:{ nivel: 25 } },
  { de: 77, para: 78, exige:{ nivel: 40 } },
  { de: 79, para: 80, exige:{ nivel: 37 } },
  { de: 81, para: 82, exige:{ nivel: 30 } },
  { de: 84, para: 85, exige:{ nivel: 31 } },
  { de: 86, para: 87, exige:{ nivel: 34 } },
  { de: 88, para: 89, exige:{ nivel: 38 } },
  { de: 92, para: 93, exige:{ nivel: 25 } },
  { de: 96, para: 97, exige:{ nivel: 26 } },
  { de: 98, para: 99, exige:{ nivel: 28 } },
  { de:100, para:101, exige:{ nivel: 30 } },
  { de:104, para:105, exige:{ nivel: 28 } },
  { de:109, para:110, exige:{ nivel: 35 } },
  { de:111, para:112, exige:{ nivel: 42 } },
  { de:116, para:117, exige:{ nivel: 32 } },
  { de:118, para:119, exige:{ nivel: 33 } },
  { de:129, para:130, exige:{ nivel: 20 } },
  { de:138, para:139, exige:{ nivel: 40 } },
  { de:140, para:141, exige:{ nivel: 40 } },
  { de:147, para:148, exige:{ nivel: 30 } },
  { de:148, para:149, exige:{ nivel: 55 } },
  { de: 25, para: 26, exige:{ item: 'trovao' } },
  { de: 30, para: 31, exige:{ item: 'lua' } },
  { de: 33, para: 34, exige:{ item: 'lua' } },
  { de: 35, para: 36, exige:{ item: 'lua' } },
  { de: 37, para: 38, exige:{ item: 'fogo' } },
  { de: 39, para: 40, exige:{ item: 'lua' } },
  { de: 44, para: 45, exige:{ item: 'folha' } },
  { de: 58, para: 59, exige:{ item: 'fogo' } },
  { de: 61, para: 62, exige:{ item: 'agua' } },
  { de: 70, para: 71, exige:{ item: 'folha' } },
  { de: 90, para: 91, exige:{ item: 'agua' } },
  { de:102, para:103, exige:{ item: 'folha' } },
  { de:120, para:121, exige:{ item: 'agua' } },
  { de:133, para:134, exige:{ item: 'agua' } },
  { de:133, para:135, exige:{ item: 'trovao' } },
  { de:133, para:136, exige:{ item: 'fogo' } },
  { de: 64, para: 65, exige:{ item: 'elo' } },
  { de: 67, para: 68, exige:{ item: 'elo' } },
  { de: 75, para: 76, exige:{ item: 'elo' } },
  { de: 93, para: 94, exige:{ item: 'elo' } },
];

/* AS TRÊS INICIAIS.
 *
 * SEM ELAS A ABA DO IDLE NÃO ABRE, e isso não é figura de linguagem: a stamina
 * é da criatura (bloco 1.2a), então quem não tem nenhuma não pode mandar
 * expedição — e sem expedição não há encontro, não há captura, não há primeira
 * criatura. O laço fecha em si mesmo.
 *
 * SÃO TRÊS, e a escolha é do jogador. Dar uma sorteada seria mais simples e
 * perderia a única coisa que a primeira tela tem para oferecer: uma decisão que
 * é dele antes de o jogo cobrar qualquer coisa.
 *
 * AS TRÊS TÊM DE SER PARELHAS. Uma nitidamente mais forte transforma a escolha
 * em resposta certa, e aí ela não é escolha. */
/* força 318 · 309 · 314 — dispersão 9 */
const INICIAIS = [1, 4, 7];

/* ── AS FAIXAS DE NÍVEL DAS ROTAS ──────────────────────────────────────────
 *
 * O jogador escolhe o BIOMA e a FAIXA. Rota alta traz as formas evoluídas e
 * drops melhores; rota baixa traz os filhotes.
 *
 * QUEM APARECE EM CADA UMA É DERIVADO, e não escrito aqui — sai da linha
 * evolutiva do próprio pack (ver engine/rotas.mjs). O que mora nesta tabela é
 * só o RECORTE: onde uma faixa começa, onde termina, e que força cabe nela.
 *
 * A JANELA DE FORÇA é a parte que parece arbitrária e é a mais necessária. Sem
 * teto, um Lapras de 535 aparecia em rota de nível 2 — ele não evolui de
 * ninguém, então as outras duas perguntas o deixam passar. Sem piso, um Rattata
 * continuava aparecendo na rota de 50.
 *
 * Os números saem dos quantis do elenco, do mesmo jeito que as faixas de
 * raridade — e por isso um pack com outra distribuição precisa dos seus (é o
 * D-051, e ele custou uma tarde). */
const FAIXAS = [
  { id: 'f1', rotulo: 'Rota rasa',   nivel: [ 2,  8], piso:   0, teto:  350 },
  { id: 'f2', rotulo: 'Rota média',  nivel: [ 9, 20], piso: 260, teto:  470 },
  { id: 'f3', rotulo: 'Rota funda',  nivel: [21, 34], piso: 330, teto:  545 },
  { id: 'f4', rotulo: 'Rota do fim', nivel: [35, 60], piso: 400, teto: 9999 },
];

export const pokemonKantoV1 = {
  id: 'pokemon_kanto_v1',
  tipos:    { efetividade: CHART, cores: TCOLOR, nomes: TIPO_PT },
  especies: KANTO_DEX_FULL,
  naturezas: NATUREZAS,
  biomas:    BIOMAS,
  /* A FOLHA DE ICONES DE CABECA — 12 colunas de 128 px, em ordem de dex.

     Mora aqui porque o ARQUIVO e tema: o nome dele carrega a regiao, e o §0.3
     diz que identificador da franquia nao existe fora do pack. O app sabe
     RECORTAR uma folha de N colunas; so o pack sabe QUAL folha e ate onde ela
     vai. O pack original tera a dele, com outra contagem, e nada no app muda.

     Pedido do dono: substituir o retrato estatico no painel de encontros —
     "se atente a colocar cada icone no pokemon correto, a imagem segue a
     ordem da pokedex certinha". */
  icones:    { arq: '../assets/icones/trozei-kanto.png', lado: 128, colunas: 12, quantos: 151 },

  /* quem decora cada bioma e o que passa na frente dos pés — ver A FAUNA DE
     CENÁRIO acima. O app sabe desenhar; o pack sabe quem mora onde. */
  fauna:     FAUNA,
  props:     PROPS,
  faunaFora: FAUNA_FORA,
  faixas:    FAIXAS,
  raridade:  RARIDADE_FAIXAS,
  evolucoes: EVOLUCOES,
  bolas:     BOLAS,
  itens:     ITENS,
  iniciais: INICIAIS,
  elenco:   ARENA_DEX,
  golpes:   MASTER_MOVES,
  clima:    CLIMA,
  climaIdle: CLIMA_IDLE,
  /* QUEM É DA NOITE (1.33, L-178). O motor só conhece "preferências por tipo";
     quais tipos são noturnos é CONTEÚDO, e por isso mora aqui (§0.3).

     Um tipo favorecido BASTA — ver o `lado` do `engine/elenco-estagio.mjs`: a
     regra de anular tipo duplo neutralizava todo Veneno da Floresta, e o bioma
     que abre por padrão nunca mudava à noite. Com esta tabela, a noite traz
     Oddish, Zubat, Koffing e Hypno, e leva Metapod, Paras e Voltorb. */
  preferenciasDaNoite: { favorece: ['ghost', 'poison', 'psychic'],
                         desfavorece: ['bug', 'grass', 'normal'] },
  moeda:    MOEDA,
  /* O CATALOGO COMPLETO (1.12): nome, funcao, faixa, e por qual PORTA o item
     entra no jogo. Mora no pack porque nome de item e nomenclatura de tema. */
  catalogo: CATALOGO_ITENS,
  moedaPve: MOEDA_PVE,
  material: MATERIAL,
  rotulos: ROTULOS,
  /* As falas da vendedora: TEXTO e tema, e tema mora no pack. */
  falasDaLoja: FALAS_DA_LOJA,
  marca:   MARCA,
  nomeExibido, slugExterno, sprite, spriteShiny,
};

export default pokemonKantoV1;
