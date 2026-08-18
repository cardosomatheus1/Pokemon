/* ContentPack sintético — 12 criaturas inventadas, cinco tipos inventados.
 *
 * Existe por um motivo só: provar que o motor não sabe o que é um Pokémon.
 * Nada aqui vem da franquia. Se o motor precisar de qualquer coisa que este
 * pack não tem, a Content Layer está incompleta e o teste reprova.
 *
 * O tipo `normal` é contrato do motor, não do tema: é o pool de reserva de
 * atribuição de golpes. Todo pack precisa de um, com o nome que quiser desde
 * que `golpes.normal` exista — ver engine/pack.mjs.
 */

const T = ['normal', 'brasa', 'limo', 'vento', 'pedra'];

/* Triângulo simples: brasa > limo > pedra > vento > brasa. Não copia nenhuma
   tabela existente — a intenção é que seja OUTRA, não uma cópia renomeada. */
const CHART = {
  normal: { pedra: 0.5 },
  brasa:  { limo: 2, vento: 0.5, brasa: 0.5, pedra: 0.5 },
  limo:   { pedra: 2, brasa: 0.5, limo: 0.5, vento: 0.5 },
  vento:  { brasa: 2, limo: 0.5, vento: 0.5, pedra: 0 },
  pedra:  { vento: 2, brasa: 2, pedra: 0.5 },
};

const CORES = { normal:'#9aa0a6', brasa:'#e2553d', limo:'#6fbf4a', vento:'#7fc8e8', pedra:'#b08a54' };
const NOMES = { normal:'Comum', brasa:'Brasa', limo:'Limo', vento:'Vento', pedra:'Pedra' };

/* dex, nome, tipos, [hp, atk, def, spa, spd, spe] */
const ESPECIES = [
  { dex: 1,  n: 'fulgor',   t: ['brasa'],            s: [ 78,  84,  78, 109,  85, 100] },
  { dex: 2,  n: 'cinzel',   t: ['brasa', 'pedra'],   s: [ 90,  95, 105,  70,  75,  60] },
  { dex: 3,  n: 'faisca',   t: ['brasa', 'vento'],   s: [ 65,  60,  55,  95,  80, 110] },
  { dex: 4,  n: 'lodo',     t: ['limo'],             s: [105,  75,  80,  65,  90,  45] },
  { dex: 5,  n: 'verdil',   t: ['limo', 'vento'],    s: [ 70,  65,  60,  90,  85,  95] },
  { dex: 6,  n: 'escoria',  t: ['limo', 'pedra'],    s: [ 95,  90,  110, 55,  70,  40] },
  { dex: 7,  n: 'zefiro',   t: ['vento'],            s: [ 60,  70,  50,  85,  60, 120] },
  { dex: 8,  n: 'nimbo',    t: ['vento', 'normal'],  s: [ 80,  75,  70,  80,  80,  85] },
  { dex: 9,  n: 'bruma',    t: ['vento', 'limo'],    s: [ 68,  55,  65,  100, 95,  88] },
  { dex: 10, n: 'basalto',  t: ['pedra'],            s: [110, 100, 120,  50,  65,  35] },
  { dex: 11, n: 'talude',   t: ['pedra', 'normal'],  s: [ 85,  95,  90,  60,  70,  70] },
  { dex: 12, n: 'pedrisco', t: ['pedra', 'brasa'],   s: [ 72,  88,  75,  78,  68,  92] },
];

const GOLPES = {
  normal: [
    { n: 'Empurrão',  t: 'normal', p: 60,  cat: 'fis' },
    { n: 'Investida', t: 'normal', p: 80,  cat: 'fis', acc: 0.9 },
    { n: 'Estampido', t: 'normal', p: 70,  cat: 'esp' },
    { n: 'Pancada',   t: 'normal', p: 100, cat: 'fis', acc: 0.75 },
  ],
  brasa: [
    { n: 'Lampejo',   t: 'brasa', p: 75,  cat: 'esp' },
    { n: 'Cauteriza', t: 'brasa', p: 110, cat: 'esp', acc: 0.85 },
    { n: 'Marreta',   t: 'brasa', p: 90,  cat: 'fis' },
  ],
  limo: [
    { n: 'Borrifo',   t: 'limo', p: 65,  cat: 'esp' },
    { n: 'Atolar',    t: 'limo', p: 95,  cat: 'fis', acc: 0.9 },
    { n: 'Corrosão',  t: 'limo', p: 120, cat: 'esp', acc: 0.7 },
  ],
  vento: [
    { n: 'Rajada',    t: 'vento', p: 70,  cat: 'esp' },
    { n: 'Vendaval',  t: 'vento', p: 105, cat: 'esp', acc: 0.8 },
    { n: 'Corte',     t: 'vento', p: 85,  cat: 'fis' },
  ],
  pedra: [
    { n: 'Seixo',     t: 'pedra', p: 60,  cat: 'fis' },
    { n: 'Desmoronar',t: 'pedra', p: 115, cat: 'fis', acc: 0.75 },
    { n: 'Estilhaço', t: 'pedra', p: 80,  cat: 'esp' },
  ],
};

const CLIMA = [
  { key: 'calmo',    w: 40, type: null,    stat: null,      mult: 1,   nome: 'Calmo' },
  { key: 'fornalha', w: 15, type: 'brasa', stat: 'offense', mult: 1.3, nome: 'Fornalha' },
  { key: 'pantano',  w: 15, type: 'limo',  stat: 'offense', mult: 1.3, nome: 'Pântano' },
  { key: 'ventania', w: 15, type: 'vento', stat: 'spe',     mult: 1.4, nome: 'Ventania' },
  { key: 'erosao',   w: 15, type: 'pedra', stat: 'offense', mult: 1.3, nome: 'Erosão' },
];

const bonito = s => s.charAt(0).toUpperCase() + s.slice(1);

export const packSintetico = {
  id: 'sintetico_v1',
  tipos:    { efetividade: CHART, cores: CORES, nomes: NOMES },
  especies: ESPECIES,
  elenco:   ESPECIES.map(p => p.dex),
  golpes:   GOLPES,
  clima:    CLIMA,
  moeda:    { nome: 'Fichas', simbolo: '◈' },
  nomeExibido: bonito,
  slugExterno: s => s,
  /* Sprite sem rede: o pack decide o endereço, e um pack de teste devolve um
     data URI. Se o motor exigisse HTTP, isto reprovaria — e é justamente o
     ponto. */
  sprite: p => `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>#${p.dex}`,
};

export const TIPOS_SINTETICOS = T;
export default packSintetico;
