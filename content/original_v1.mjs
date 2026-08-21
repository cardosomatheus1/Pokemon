/* ContentPack — original_v1 (F1.12)
 *
 * O pack que a V1 lança. O `pokemon_kanto_v1` continua existindo como pack de
 * DESENVOLVIMENTO INTERNO — é o §0.3.1, e o motivo é de produto, não jurídico:
 * a V1 é a primeira versão que gera telemetria real de retenção e LTV, e medir
 * isso sobre o pack Pokémon mede o apelo da nostalgia. Número que não sobrevive
 * à troca de tema e que serviria de base para decisões de contratação e CAC.
 *
 * ── O QUE É ORIGINAL AQUI, E O QUE FOI DELIBERADAMENTE HERDADO ─────────────
 *
 * ORIGINAL: os oito tipos e a roda de efetividade entre eles, os nomes das 76
 * criaturas, os golpes, os climas, o nome da moeda. Nada disto veio de lugar
 * nenhum — inclusive a roda, que tem OITO tipos e não dezoito, porque copiar a
 * tabela de dezoito seria copiar o desenho de jogo da franquia mesmo trocando
 * os nomes.
 *
 * HERDADA: a DISTRIBUIÇÃO de força do elenco. Os totais de base stats são os
 * mesmos percentis do elenco Kanto — 288 no mais fraco, 490 na mediana, 600 no
 * mais forte. É decisão, e a razão é medição: margem, ruína, precisão de odd e
 * o estudo de economia inteiro foram medidos sobre aquela distribuição. Trocar
 * de tema não pode trocar o jogo, senão todas aquelas medidas viram lixo no dia
 * do lançamento.
 *
 * O RECORTE entre os seis stats é sorteado, e não copiado: mesma força total,
 * distribuição interna diferente. Copiar o recorte também seria copiar o
 * balanceamento, e aí este pack seria uma renomeação com passos a mais.
 *
 * ── A ARTE NÃO ESTÁ AQUI, E ISSO É A LACUNA L-042 ─────────────────────────
 *
 * `sprite()` aponta para `arte/original/`, que é NOSSA pasta versionada — a
 * regra do projeto é o contrário da dos assets de terceiros. Enquanto os
 * desenhos não existirem, ele devolve a silhueta procedural de
 * `silhuetaDe()`: forma derivada do próprio dex, determinística, e
 * declaradamente provisória.
 *
 * O que ela NÃO faz é cair para o sprite do outro pack. "O resgate busca a
 * mesma coisa em outro endereço, nunca outra coisa" — é a lição da v0.6.1, e
 * aqui ela é também a sabotagem declarada do bloco.
 */

/* ── OS OITO TIPOS ─────────────────────────────────────────────────────────
 *
 * Uma roda de oito: cada tipo é forte contra os DOIS seguintes e fraco contra
 * os DOIS anteriores. Fecha em ciclo, então nenhum tipo é dominante e nenhum é
 * lixo — a propriedade que a tabela de dezoito só alcança por ajuste manual,
 * aqui sai da forma.
 *
 * A ordem da roda é o que define tudo:
 *
 *     brasa → seiva → sopro → carga → liga → pedra → mare → veu → (brasa)
 *
 * E ela foi escolhida para que cada relação tenha uma leitura óbvia: brasa
 * queima seiva, seiva se espalha no sopro, sopro dispersa carga, carga funde
 * liga, liga lasca pedra, pedra afunda no mare, mare apaga o veu, veu abafa
 * brasa. Quem olha a tabela entende sem decorar.
 */
export const RODA = ['brasa', 'seiva', 'sopro', 'carga', 'liga', 'pedra', 'mare', 'veu'];

const CHART = {};
for (let i = 0; i < RODA.length; i++) {
  const linha = {};
  /* forte contra os dois seguintes */
  linha[RODA[(i + 1) % 8]] = 2;
  linha[RODA[(i + 2) % 8]] = 1.5;
  /* fraco contra os dois anteriores */
  linha[RODA[(i + 7) % 8]] = 0.5;
  linha[RODA[(i + 6) % 8]] = 0.75;
  CHART[RODA[i]] = linha;
}

const TCOLOR = {
  brasa: '#e2582f', seiva: '#4faa54', sopro: '#8fbcd4', carga: '#e3c136',
  liga:  '#8f9aa8', pedra: '#a9855c', mare:  '#3f79c8', veu:   '#7a6ba8',
};

const TIPO_PT = {
  brasa: 'Brasa', seiva: 'Seiva', sopro: 'Sopro', carga: 'Carga',
  liga:  'Liga',  pedra: 'Pedra', mare:  'Maré',  veu:   'Véu',
};

/* ── O ELENCO ──────────────────────────────────────────────────────────────
 * Gerado uma vez por `tools/gerar-pack-original.mjs` e versionado. Regerar é
 * mudar o jogo: os nomes aparecem em captura de tela, em telemetria e na
 * memória de quem jogou. */
const DEX = [
  {dex:1,n:'lufaito',t:['seiva'],s:[40,23,56,59,50,60]},
  {dex:2,n:'lâminonte',t:['liga'],s:[70,51,68,52,84,52]},
  {dex:3,n:'dunaago',t:['carga','sopro'],s:[40,72,47,80,81,65]},
  {dex:4,n:'estátago',t:['liga','brasa'],s:[61,86,78,47,66,47]},
  {dex:5,n:'lúmenago',t:['liga'],s:[68,90,77,61,43,56]},
  {dex:6,n:'dunaux',t:['carga','sopro'],s:[59,70,67,76,47,76]},
  {dex:7,n:'cirronte',t:['sopro'],s:[84,61,55,84,42,69]},
  {dex:8,n:'lasconte',t:['pedra','carga'],s:[61,82,98,53,60,51]},
  {dex:9,n:'sylvonte',t:['mare','pedra'],s:[47,46,106,90,73,51]},
  {dex:10,n:'fulgonte',t:['mare'],s:[42,93,80,64,82,64]},
  {dex:11,n:'rajadito',t:['seiva'],s:[44,97,77,76,42,89]},
  {dex:12,n:'sylvara',t:['veu'],s:[51,79,95,67,66,77]},
  {dex:13,n:'brasaora',t:['seiva'],s:[44,102,77,56,82,74]},
  {dex:14,n:'cirrim',t:['sopro'],s:[89,52,58,76,72,93]},
  {dex:15,n:'dunaera',t:['pedra','brasa'],s:[47,80,49,90,77,97]},
  {dex:16,n:'basaltora',t:['mare'],s:[49,89,60,50,102,92]},
  {dex:17,n:'espumago',t:['brasa'],s:[67,76,70,80,95,60]},
  {dex:18,n:'ventora',t:['carga','pedra'],s:[65,92,65,55,65,108]},
  {dex:19,n:'noctago',t:['sopro'],s:[49,104,63,86,53,95]},
  {dex:20,n:'ondera',t:['seiva'],s:[67,50,64,92,89,88]},
  {dex:21,n:'raioera',t:['mare'],s:[108,97,63,76,58,48]},
  {dex:22,n:'verdonte',t:['seiva'],s:[59,105,65,103,73,50]},
  {dex:23,n:'ígneora',t:['brasa'],s:[93,84,75,45,109,49]},
  {dex:24,n:'estátim',t:['mare','liga'],s:[90,55,89,87,60,74]},
  {dex:25,n:'fulgera',t:['mare'],s:[43,95,85,92,93,47]},
  {dex:26,n:'raizito',t:['seiva','liga'],s:[90,110,52,89,58,56]},
  {dex:27,n:'rajadora',t:['seiva'],s:[89,91,55,74,70,81]},
  {dex:28,n:'cinzera',t:['brasa','carga'],s:[119,69,70,56,52,99]},
  {dex:29,n:'verdim',t:['pedra','seiva'],s:[73,99,71,87,72,68]},
  {dex:30,n:'ardora',t:['mare'],s:[68,58,100,62,94,93]},
  {dex:31,n:'mussara',t:['sopro','seiva'],s:[76,94,92,97,51,65]},
  {dex:32,n:'sombrito',t:['pedra'],s:[47,82,101,53,90,106]},
  {dex:33,n:'ionnora',t:['brasa'],s:[94,47,59,98,87,98]},
  {dex:34,n:'lúmenux',t:['brasa'],s:[98,78,104,48,80,75]},
  {dex:35,n:'lascux',t:['sopro'],s:[53,68,104,103,103,54]},
  {dex:36,n:'ígneim',t:['pedra'],s:[117,55,82,58,60,113]},
  {dex:37,n:'rebitera',t:['pedra'],s:[52,85,85,97,74,97]},
  {dex:38,n:'rebitonte',t:['brasa'],s:[94,97,74,90,49,86]},
  {dex:39,n:'seixara',t:['pedra'],s:[108,57,56,77,122,70]},
  {dex:40,n:'ardito',t:['brasa','veu'],s:[86,72,95,98,75,64]},
  {dex:41,n:'ocasim',t:['sopro','brasa'],s:[111,74,70,72,65,98]},
  {dex:42,n:'seivera',t:['sopro'],s:[74,102,84,93,76,61]},
  {dex:43,n:'seivara',t:['veu'],s:[106,75,58,119,66,66]},
  {dex:44,n:'seixito',t:['liga'],s:[66,70,61,122,120,51]},
  {dex:45,n:'noctim',t:['liga'],s:[91,88,68,100,61,87]},
  {dex:46,n:'fulgara',t:['liga'],s:[101,90,59,117,78,50]},
  {dex:47,n:'brotux',t:['carga'],s:[75,96,76,78,68,102]},
  {dex:48,n:'álisonte',t:['carga'],s:[78,74,52,80,89,122]},
  {dex:49,n:'espumera',t:['seiva'],s:[75,87,70,79,104,85]},
  {dex:50,n:'ondim',t:['liga','mare'],s:[112,74,45,111,92,66]},
  {dex:51,n:'brasaago',t:['carga','veu'],s:[96,87,85,86,77,69]},
  {dex:52,n:'torrito',t:['brasa','veu'],s:[87,81,64,106,62,100]},
  {dex:53,n:'voltito',t:['pedra'],s:[89,89,67,118,85,52]},
  {dex:54,n:'vazora',t:['liga','seiva'],s:[109,61,76,77,88,89]},
  {dex:55,n:'raioora',t:['seiva','liga'],s:[104,49,118,97,49,83]},
  {dex:56,n:'sombrux',t:['carga'],s:[98,53,106,93,79,76]},
  {dex:57,n:'escamora',t:['sopro','pedra'],s:[96,57,88,114,98,52]},
  {dex:58,n:'estátora',t:['sopro','seiva'],s:[55,74,108,107,104,57]},
  {dex:59,n:'fornora',t:['seiva'],s:[97,107,84,86,73,58]},
  {dex:60,n:'torrora',t:['mare'],s:[80,84,106,111,59,70]},
  {dex:61,n:'ventim',t:['liga','sopro'],s:[111,119,50,97,88,50]},
  {dex:62,n:'álisito',t:['veu'],s:[100,67,60,92,106,90]},
  {dex:63,n:'lúmenara',t:['sopro','veu'],s:[91,84,129,81,55,80]},
  {dex:64,n:'ocasago',t:['carga','sopro'],s:[97,95,71,90,88,84]},
  {dex:65,n:'ramonte',t:['seiva'],s:[79,106,93,61,119,67]},
  {dex:66,n:'espumito',t:['pedra'],s:[86,107,71,64,96,101]},
  {dex:67,n:'fornux',t:['carga'],s:[104,103,61,96,88,73]},
  {dex:68,n:'lascora',t:['mare','liga'],s:[110,84,47,124,49,111]},
  {dex:69,n:'voltera',t:['sopro'],s:[78,93,96,59,131,73]},
  {dex:70,n:'ramim',t:['seiva'],s:[86,80,80,95,90,99]},
  {dex:71,n:'lúmenonte',t:['pedra'],s:[77,70,128,98,95,66]},
  {dex:72,n:'álisago',t:['veu'],s:[100,77,100,79,111,68]},
  {dex:73,n:'basaltonte',t:['brasa','seiva'],s:[103,104,82,56,65,130]},
  {dex:74,n:'seixora',t:['carga'],s:[84,61,124,82,74,115]},
  {dex:75,n:'raizonte',t:['pedra'],s:[67,68,105,122,102,91]},
  {dex:76,n:'noctito',t:['mare'],s:[97,107,82,90,109,115]},
];

/* ── OS GOLPES ─────────────────────────────────────────────────────────────
 *
 * Seis por tipo, e a grade é a mesma em todos: um finalizador caro e impreciso,
 * dois de força média, dois baratos e certeiros, um utilitário. Grade igual não
 * é falta de imaginação — é o que faz o Monte Carlo medir o LUTADOR e não o
 * sorteio de qual golpe ele calhou de ter.
 *
 * `cat` é físico ou especial e `fx` é o efeito visual; os dois vêm do motor,
 * que já os conhece. `acc` ausente vale 1. */
const golpe = (n, t, p, cat, fx, acc) => ({ n, t, p, cat, fx, ...(acc === undefined ? {} : { acc }) });

const GRADE = [
  ['Ruína',     150, 'esp', 'beam',  0.75],
  ['Investida', 90,  'fis', 'melee', 1],
  ['Descarga',  85,  'esp', 'orb',   1],
  ['Estilhaço', 130, 'fis', 'melee', 0.8],
  ['Lasca',     40,  'fis', 'melee', 1],
  ['Fenda',     80,  'esp', 'orb',   0.9],
];

/* O nome do golpe carrega o tipo: "Ruína de Brasa" se lê sem legenda, e a tela
   não precisa de um ícone a mais para dizer de que tipo ele é. */
const MOVES = {};
for (const t of RODA)
  MOVES[t] = GRADE.map(([base, p, cat, fx, acc]) =>
    golpe(`${base} de ${TIPO_PT[t]}`, t, p, cat, fx, acc));

/* ── O CLIMA ───────────────────────────────────────────────────────────────
 *
 * Quatro climas com bônus e um neutro, e os pesos são os mesmos do outro pack:
 * 40% neutro, 15% cada. Os pesos são de ECONOMIA — eles entram na variância da
 * odd — e o §4.4 mediu a precisão sobre eles.
 *
 * Cada clima favorece UM tipo. A garantia do §4.5 é que a pool sempre contém
 * alguém do tipo favorecido, e ela é do motor: o clima é sorteado entre os que
 * a pool suporta. */
const CLIMA = [
  { key:'neutro',  w:40, emoji:'⛅',  name:'Calmaria',
    type:null,    stat:null,      mult:1,   desc:'Sem bônus climático nesta rodada.' },
  { key:'estio',   w:15, emoji:'🔥', name:'Estio',
    type:'brasa', stat:'offense', mult:2,   desc:'Criaturas de Brasa com ATK/SpA em dobro!' },
  { key:'dilúvio', w:15, emoji:'🌊', name:'Dilúvio',
    type:'mare',  stat:'spe',     mult:2,   desc:'Criaturas de Maré com Velocidade em dobro!' },
  { key:'vendo',   w:15, emoji:'🌬️', name:'Vendaval',
    type:'sopro', stat:'spe',     mult:1.5, desc:'Criaturas de Sopro com Velocidade x1,5!' },
  { key:'tempest', w:15, emoji:'⚡', name:'Tempestade',
    type:'carga', stat:'offense', mult:1.5, desc:'Criaturas de Carga com ATK/SpA x1,5!' },
];

/* ── NOMES E ARTE ──────────────────────────────────────────────────────────*/

/* Primeira letra maiúscula, e nada mais: os nomes já nascem escritos como se
   quer ler. O pack Kanto precisa de uma tabela de exceções porque os nomes dele
   vieram de fora. */
/* Recebe o SLUG, como o contrato do motor manda — `pack.nomeExibido(p.n)`. A
   primeira versão desta linha recebia a espécie inteira e derrubava o boot no
   primeiro sortearPool: os nomes deste pack já nascem escritos como se quer
   ler, então não há tabela de exceções, mas o formato do argumento é do motor
   e não meu. */
const nomeExibido = slug => String(slug).charAt(0).toUpperCase() + String(slug).slice(1);
const slugExterno = n => String(n).toLowerCase();

/* A SILHUETA PROVISÓRIA, e ela é NOSSA.
 *
 * Enquanto os desenhos de `arte/original/` não existirem (L-042), cada criatura
 * recebe uma forma derivada do próprio dex: determinística, distinta entre
 * espécies, e obviamente provisória para quem olha.
 *
 * ELA NÃO CAI PARA O OUTRO PACK. Um `catch` que devolvesse o sprite do Kanto
 * faria o jogo "original" mostrar arte da franquia no primeiro erro de rede —
 * exatamente o que o §0.3.1 existe para impedir, e exatamente a lição da
 * v0.6.1: o resgate busca a mesma coisa em outro endereço, nunca outra coisa. */
export function silhuetaDe(especie) {
  const cor = TCOLOR[especie.t[0]] || '#888';
  const cor2 = TCOLOR[especie.t[1]] || cor;
  /* Três números do dex viram três parâmetros da forma. Sem aleatoriedade: a
     mesma criatura tem a mesma silhueta em toda máquina, que é a mesma
     exigência de determinismo do resto do jogo. */
  const a = 18 + (especie.dex * 7) % 22;
  const b = 30 + (especie.dex * 13) % 30;
  const c = 8 + (especie.dex * 5) % 14;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${cor}"/><stop offset="1" stop-color="${cor2}"/>` +
    `</linearGradient></defs>` +
    `<ellipse cx="48" cy="${52 + c / 3}" rx="${a + 10}" ry="${b / 2 + 8}" fill="url(#g)"/>` +
    `<circle cx="48" cy="${34 - c / 4}" r="${a}" fill="url(#g)"/>` +
    `<circle cx="${40 - c / 6}" cy="${32 - c / 4}" r="3" fill="#12151c"/>` +
    `<circle cx="${56 + c / 6}" cy="${32 - c / 4}" r="3" fill="#12151c"/>` +
    `</svg>`);
}

/* O ENDEREÇO DA ARTE NOSSA. `arte/` é versionado — a regra é o contrário da dos
   assets de terceiros, e aplicá-la ao contrário custou quase três imagens no
   porte da v1.0 (ver `arte/README.md`). */
/* ── QUAIS CRIATURAS JÁ TÊM DESENHO ────────────────────────────────────────
 *
 * A lista é o LIVRO-RAZÃO da arte: cada desenho que chega entra aqui, e
 * `sprite()` passa a devolver o arquivo em vez da silhueta. Enquanto ela estiver
 * vazia, o pack inteiro é silhueta — e a tela diz a verdade sobre o estado do
 * projeto em vez de mostrar 76 imagens quebradas.
 *
 * POR QUE UMA LISTA E NÃO UM `onerror` NO `<img>`: um `onerror` transforma
 * "ainda não desenhamos" em "falhou o carregamento", e as duas coisas pedem
 * respostas opostas. Além disso, `onerror` no navegador só descobre depois de
 * pedir — 76 requisições que sabemos que vão falhar.
 *
 * É a mesma lista que responde "quanto falta?" sem ninguém contar arquivo. */
export const COM_ARTE = new Set([
  /* vazia: ver L-042. Cada desenho entregue acrescenta um slug aqui, no mesmo
     commit em que o PNG entra em `arte/original/`. */
]);

/* O ENDEREÇO DA ARTE NOSSA quando ela existe; a silhueta quando não.
 *
 * NUNCA o sprite do outro pack. Um `catch` que caísse para o Kanto faria o jogo
 * "original" mostrar arte da franquia no primeiro erro — exatamente o que o
 * §0.3.1 existe para impedir, e exatamente a lição da v0.6.1: o resgate busca a
 * mesma coisa em outro endereço, nunca outra coisa. */
function sprite(especie) {
  const slug = slugExterno(especie.n);
  return COM_ARTE.has(slug) ? `arte/original/${slug}.png` : silhuetaDe(especie);
}

const MOEDA = { nome: 'Arena Cash', simbolo: '💠' };

/* ── COMO A INTERFACE CHAMA AS COISAS ──────────────────────────────────────
 *
 * A tela precisava escrever "Pokémon de Fogo" em algum lugar, e escrevia
 * literalmente. Isso é identificador da franquia em código de produção — o
 * item nº 1 da sabotagem deste bloco, e a varredura o encontrou em nove
 * lugares.
 *
 * O pack passa a dizer como as coisas se chamam. Não é tradução: é o TEMA
 * nomeando a si mesmo, que é o que a Content Layer existe para permitir. */
const ROTULOS = {
  criatura:  'criatura',
  criaturas: 'criaturas',
  elenco:    'Roda de Oito',
  arena:     'PokéArena',
};

export const originalV1 = {
  id: 'original_v1',
  /* QUAL POOL É O DE RESERVA (L-021, fechada no F1.12). O motor precisa de um
     pool genérico para quando a espécie tem tipo sem golpes próprios; antes ele
     exigia que se chamasse `normal`, que é um tipo da franquia. Aqui a roda tem
     oito tipos e nenhum genérico, então o de reserva é declarado — e `pedra` é
     a escolha: golpe de pedra não é fraco contra nada da roda por acidente, ele
     é o meio dela. */
  poolReserva: 'pedra',
  tipos:    { efetividade: CHART, cores: TCOLOR, nomes: TIPO_PT },
  especies: DEX,
  elenco:   DEX.map(e => e.dex),
  golpes:   MOVES,
  clima:    CLIMA,
  moeda:    MOEDA,
  rotulos: ROTULOS,
  nomeExibido, slugExterno, sprite, silhuetaDe,
};

export default originalV1;
