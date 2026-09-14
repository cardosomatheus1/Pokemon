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
  { key:'estio', w:15, emoji:'🔥', name:'Estio',
    type:'brasa', stat:'offense', mult:2,   desc:'Criaturas de Brasa com ATK/SpA em dobro!' },
  { key:'dilúvio', w:15, emoji:'🌊', name:'Dilúvio',
    type:'mare',  stat:'spe',     mult:2,   desc:'Criaturas de Maré com Velocidade em dobro!' },
  { key:'vendo', w:15, emoji:'🌬️', name:'Vendaval',
    type:'sopro', stat:'spe',     mult:1.5, desc:'Criaturas de Sopro com Velocidade x1,5!' },
  { key:'tempest', w:15, emoji:'⚡', name:'Tempestade',
    type:'carga', stat:'offense', mult:1.5, desc:'Criaturas de Carga com ATK/SpA x1,5!' },
];

/* ── O CLIMA DO AVANÇO (1.32) ──────────────────────────────────────────────
 *
 * Outra lista que a de cima, pelo mesmo motivo do pack de Kanto: aquela muda
 * DANO na Arena e as odds foram medidas sobre os pesos dela; esta muda o FARM.
 *
 * A cobertura deste elenco é bem mais plana — 76 espécies em oito tipos:
 *
 *     seiva 17 · sopro 15 · pedra 14 · liga 13 · carga 12 · brasa 12
 *     mare 11 · veu 8
 *
 * Nenhum tipo é raro como o Gelo do outro pack, e isso é uma propriedade do
 * elenco, não um defeito da lista. O passo sai da raridade medida, então aqui
 * ele nasce parelho sozinho e o VÉU — o menor, com oito — é o que paga mais.
 * A mesma regra, sem uma linha de exceção. */
const CLIMA_IDLE = [
  { key:'neutro', w:40, emoji:'⛅', name:'Tempo Firme', tipos:[], rende:null,
    desc:'Sem bônus de clima nesta run.' },
  { key:'estio', fx:'sol', w:13, emoji:'🔥', name:'Estio', tipos:['brasa'], rende:'xp',
    desc:'Quem é de Brasa rende mais XP nesta run.' },
  { key:'diluvio', fx:'chuva', w:13, emoji:'🌊', name:'Dilúvio', tipos:['mare'], rende:'ritmo',
    desc:'Quem é de Maré acelera as waves desta run.' },
  { key:'vendo', fx:'vento', w:13, emoji:'🌬️', name:'Vendaval', tipos:['sopro'], rende:'moeda',
    desc:'Quem é de Sopro traz mais moeda desta run.' },
  { key:'erosao', fx:'vento', w:13, emoji:'⛈️', name:'Erosão', tipos:['pedra','liga'], rende:'material',
    desc:'Quem é de Pedra ou Liga traz mais material.' },
  { key:'veu', fx:'nevoa', w:8, emoji:'🌫️', name:'Véu Baixo', tipos:['veu'], rende:'itemRaro',
    desc:'Raro. Quem é de Véu melhora MUITO o item raro do baú.' },
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

/* ESTE PACK NÃO TEM ARTE SHINY, E DIZ ISSO DEVOLVENDO A NORMAL.
 *
 * A alternativa seria devolver `arte/original/<slug>-shiny.png` — um endereço
 * que não existe. E um endereço que não existe é PIOR que a arte normal: o
 * primeiro some da tela, o segundo só não é shiny. É a mesma lógica do
 * `silhuetaDe` logo acima, e a mesma razão pela qual esta função não cai para
 * o sprite do outro pack: o resgate busca a mesma coisa noutro endereço, e
 * "a mesma coisa" aqui é a arte DESTE tema. */
function spriteShiny(especie) { return sprite(especie); }

const MOEDA = { nome: 'Arena Cash', simbolo: '💠' };

/* ── A MOEDA DO PvE E O MATERIAL (L-095) ──────────────────────────────────
 *
 * São TRÊS coisas com papéis diferentes, e o dono nomeou as três:
 *
 *     Arena Cash   a APOSTA — moeda da arena, simulada
 *     Créditos     o DINHEIRO do PvE — o idle e a Torre pagam nele
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
const MOEDA_PVE = { id: "pokecoin", nome: 'Créditos', simbolo: "🪙" };
const MATERIAL  = { id: "essencia", nome: "Essência" };

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
  /* O NOME DO REGISTRO DE ESPECIES vem do PACK (1.19).
     O motor nao pode dizer o nome da franquia — e identificador de tema, e o
     portao §0.3 reprova qualquer um dentro de `engine/`. Entao o motor fala
     `registro`, neutro, e o TEMA diz como ele se chama para quem joga.

     E a mesma porta da moeda e do material, e e ela que mantem a engenharia
     trocavel de tema — que e decisao registrada do dono. */
  registro:  'Registro',
  criatura:  'criatura',
  criaturas: 'criaturas',
  elenco:    'Roda de Oito',
  arena:     'PokéArena',
};

/* ── AS NATUREZAS DESTE PACK ───────────────────────────────────────────────
 *
 * Vinte e cinco, com a mesma ARITMÉTICA do outro pack e nomes NOSSOS — cinco
 * neutras, e as vinte restantes subindo um eixo e descendo outro.
 *
 * É o que o §0.3.1 pede: o pack original tem de ser jogável sem uma linha da
 * franquia. Traduzir os nomes de lá seria trazer a franquia por outro caminho. */
const NATUREZAS = [
  ['Plana', null, null], ['Serena', null, null], ['Neutra', null, null],
  ['Estável', null, null], ['Comum', null, null],
  ['Feroz', 'atq', 'def'], ['Pesada', 'atq', 'vel'], ['Bruta', 'atq', 'spa'], ['Crua', 'atq', 'spd'],
  ['Rochosa', 'def', 'atq'], ['Lenta', 'def', 'vel'], ['Dura', 'def', 'spa'], ['Densa', 'def', 'spd'],
  ['Ágil', 'vel', 'atq'], ['Leve', 'vel', 'def'], ['Rápida', 'vel', 'spa'], ['Solta', 'vel', 'spd'],
  ['Arcana', 'spa', 'atq'], ['Etérea', 'spa', 'def'], ['Quieta', 'spa', 'vel'], ['Instável', 'spa', 'spd'],
  ['Calma', 'spd', 'atq'], ['Gentil', 'spd', 'def'], ['Firme', 'spd', 'vel'], ['Zelosa', 'spd', 'spa'],
];

/* ── OS BIOMAS DESTE PACK ──────────────────────────────────────────────────
 *
 * Mesma mecânica do outro pack, nomes e recorte NOSSOS. O §0.3.1 exige que este
 * pack seja jogável sem uma linha da franquia — traduzir os biomas de lá seria
 * trazer a franquia por outro caminho.
 *
 * OS TIPOS SÃO OS QUE ESTE PACK DECLARA, e não os do outro — e eu errei isto
 * na primeira tentativa, copiando 'grass' e 'water' de Kanto para cá. O teste
 * reprovou com "Mata ficou vazio", que é exatamente o sintoma: bioma cujos
 * tipos ninguém tem é rota morta.
 *
 * Os oito tipos deste pack são: seiva, liga, carga, sopro, brasa, pedra, mare
 * e veu. Nenhum deles existe no outro pack, e é assim que o §0.3.1 fica
 * cumprido — o pack original é jogável sem uma linha da franquia. */
/* AS PALETAS DESTE PACK, e nenhuma é a de lá.
 *
 * O §0.3.1 exige que este pack seja jogável sozinho, e cor emprestada é
 * empréstimo. Há teste que compara as duas listas e reprova se uma paleta
 * inteira se repetir — foi o mesmo cuidado que os biomas e as bolas exigiram,
 * e nas duas vezes eu errei antes de acertar. */
const BIOMAS = [
  { id:'mata',     rotulo:'Mata',      tipos:['seiva'], assinatura:['seiva'],
    detalhe:170, paleta:{ base:'#2f5d4a', baseEsc:'#24483a', claro:'#4f8f6d', acento:'#7fd6a0', trilha:'#6b5f4a', trilhaEsc:'#544b3b', areia:'#5e6a4e', massa:'#1c5a55', massaEsc:'#123f3c', massaClaro:'#3d8f88', espuma:'#a0efe0', luz:'rgba(120,240,190,.22)', luzNucleo:'#b8ffe0' } },
  { id:'costa',    rotulo:'Costa',     tipos:['mare','sopro'], assinatura:['mare'],
    detalhe:70, paleta:{ base:'#c9c2a2', baseEsc:'#aca690', claro:'#e4dfc0', acento:'#fff4d0', trilha:'#b5ab8a', trilhaEsc:'#9a9174', areia:'#dcd4b0', massa:'#3a6f9c', massaEsc:'#274f73', massaClaro:'#6ba6cc', espuma:'#dff4ff', luz:'rgba(150,210,255,.22)', luzNucleo:'#dcf0ff' } },
  { id:'planicie', rotulo:'Planície',  tipos:['carga','veu'], assinatura:['carga'],
    detalhe:200, paleta:{ base:'#8a9c58', baseEsc:'#6f7f47', claro:'#b4c47a', acento:'#ffe98c', trilha:'#9a8a60', trilhaEsc:'#7d7050', areia:'#a4ac6c', massa:'#4a7a86', massaEsc:'#345862', massaClaro:'#78aab4', espuma:'#e0f6fa', luz:'rgba(255,232,150,.22)', luzNucleo:'#fff2b4' } },
  { id:'penhasco', rotulo:'Penhasco',  tipos:['pedra','liga'], assinatura:['pedra'],
    detalhe:60, paleta:{ base:'#6e6470', baseEsc:'#57505c', claro:'#948b98', acento:'#c2b4cc', trilha:'#7d7280', trilhaEsc:'#635a68', areia:'#665e6a', massa:'#3c3448', massaEsc:'#2a2434', massaClaro:'#5e5470', espuma:'#a294b4', luz:'rgba(190,150,255,.20)', luzNucleo:'#e0ccff' } },
  { id:'cratera',  rotulo:'Cratera',   tipos:['brasa','pedra'], assinatura:['brasa'],
    detalhe:80, paleta:{ base:'#4a2f34', baseEsc:'#341f24', claro:'#74484c', acento:'#ff7a5c', trilha:'#5e3c3a', trilhaEsc:'#432a29', areia:'#6e4238', massa:'#b8341c', massaEsc:'#801f0f', massaClaro:'#ff6a3a', espuma:'#ffb08a', luz:'rgba(255,110,60,.28)', luzNucleo:'#ffc09a' } },
  { id:'sucata',   rotulo:'Sucata',    tipos:['liga','carga'], assinatura:['liga'],
    detalhe:110, paleta:{ base:'#54585c', baseEsc:'#3f4246', claro:'#787e84', acento:'#d4b06a', trilha:'#5f584c', trilhaEsc:'#48433a', areia:'#63656a', massa:'#3a4238', massaEsc:'#282e26', massaClaro:'#5e6a58', espuma:'#c8d4a0', luz:'rgba(230,190,110,.26)', luzNucleo:'#ffe8b0' } },
];

/* [ nome, teto de força, chance de captura, fragmentos do registro ]
 *
 * OS TETOS SÃO DESTE PACK, e não os do outro — é o D-051.
 *
 * A primeira versão copiou os tetos de Kanto, e a medição mostrou o estrago:
 * este elenco tem a força concentrada muito mais alto (mediana 490 contra 405),
 * então os mesmos números produziam **UMA espécie comum em 76**. Oitenta e oito
 * por cento dos encontros cairiam em "raro" ou pior, com captura de 14%, 6% e
 * 1,5% — o farm aqui seria injogável, e nenhum teste reprovava, porque todos
 * perguntavam se a raridade era coerente e nenhum perguntava se ela era JOGÁVEL.
 *
 * Os tetos abaixo saem dos quantis DESTE elenco, mirando a mesma forma que
 * Kanto produz:
 *
 *     kanto     comum 35,6%  incomum 18,5%  raro 24,0%  muitoRaro 21,2%
 *     original  comum 35,5%  incomum 22,4%  raro 19,7%  muitoRaro 21,1%
 *
 * A chance de captura e o alvo de registro continuam iguais aos do outro pack de
 * propósito: eles são a DIFICULDADE da faixa, e ela não muda de tema. O que
 * muda é onde cada faixa começa. */
const RARIDADE_FAIXAS = [
  ['comum',      460, 0.450,  8],
  ['incomum',    490, 0.280, 12],
  ['raro',       505, 0.140, 20],
  ['muitoRaro',  555, 0.060, 30],
  ['lendario', 99999, 0.015, 50],
];

/* AS BOLAS DESTE PACK, com nomes NOSSOS.
 *
 * O §0.3.1 exige que este pack seja jogável sem uma linha da franquia. Traduzir
 * os nomes de lá seria trazer a franquia por outro caminho — foi o mesmo erro
 * que eu cometi com os biomas deste pack, e que o teste pegou. */
const BOLAS = [
  { id: 'simples',  rotulo: 'Cápsula Simples',  mult: 1.0 },
  { id: 'reforcada',rotulo: 'Cápsula Reforçada',mult: 1.5 },
  { id: 'selada',   rotulo: 'Cápsula Selada',   mult: 2.2 },
];

/* ── OS ITENS E AS LINHAS EVOLUTIVAS DESTE PACK ────────────────────────────
 *
 * Mesma mecânica do outro pack, conteúdo NOSSO. O §0.3.1 exige que este pack
 * seja jogável sem uma linha da franquia — copiar as pedras de lá seria trazer a
 * franquia por outro caminho, e traduzir os nomes seria pior ainda.
 *
 * AS LINHAS SÃO DERIVADAS, e não escritas à mão, pelo mesmo motivo que o elenco
 * é gerado: escrever setenta arestas de dado inventado seria setenta chances de
 * errar em silêncio. Derivando de força crescente dentro do tipo, duas coisas
 * saem de graça e para sempre:
 *
 *   · evoluir NUNCA enfraquece — a força é o critério da ordenação;
 *   · não há ciclo — a aresta só aponta do mais fraco para o mais forte.
 *
 * As duas são invariantes que o teste do outro pack tem de conferir à mão. */
const ITENS = [
  { id:'nucleo',  rotulo:'Núcleo Vivo',   fonte:'mata' },
  { id:'selo',    rotulo:'Selo de Maré',  fonte:'costa' },
  { id:'brasao',  rotulo:'Brasão Fundido',fonte:'cratera' },
];

const EVOLUCOES = (() => {
  const forca = e => e.s.reduce((a, b) => a + b, 0);
  const arestas = [];
  const tipos = [...new Set(DEX.map(e => e.t[0]))];
  tipos.forEach((tipo, iTipo) => {
    /* EMPATE DE FORÇA NÃO VIRA ARESTA. O elenco é gerado, e nele duas criaturas
       podem ter o mesmo total; ligá-las daria uma evolução que não é ganho. Foi
       o teste "evoluir nunca enfraquece" que pegou isto. Quem empata fica sem
       linha, e isso também é conteúdo: nem tudo evolui. */
    const vistos = new Set();
    const fila = DEX.filter(e => e.t[0] === tipo)
      .sort((a, b) => forca(a) - forca(b))
      .filter(e => !vistos.has(forca(e)) && vistos.add(forca(e)));
    /* trincas; sobra de uma vira criatura sem linha, que também tem de existir */
    for (let i = 0; i + 1 < fila.length; i += 3) {
      const [a, b, c] = fila.slice(i, i + 3);
      arestas.push({ de: a.dex, para: b.dex, exige: { nivel: 16 } });
      if (!c) continue;
      const porItem = (iTipo + i) % 2 === 1;
      arestas.push(porItem
        ? { de: b.dex, para: c.dex, exige: { item: ITENS[(iTipo + i) % ITENS.length].id } }
        : { de: b.dex, para: c.dex, exige: { nivel: 36 } });
    }
  });
  return arestas;
})();

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
/* lúmenago (liga), dunaux (carga), cirronte (sopro) — as três com
   força 395, dispersão ZERO. Mais parelhas que as do outro pack. */
const INICIAIS = [5, 6, 7];

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
/* AS JANELAS SÃO DESTE PACK, e é o D-051 pela terceira vez.
 *
 * Copiar as do outro deixava CINCO das seis rotas rasas VAZIAS — a força deste
 * elenco começa em 288 e tem mediana 490, contra 195 e 405 do outro. Rota vazia
 * é rota morta: o jogador escolhe e não acontece nada.
 *
 * A lição já apareceu nas faixas de raridade e agora aqui, então ela generaliza:
 * QUALQUER LIMIAR TIRADO DA FORÇA É POR PACK. Os níveis podem ser os mesmos —
 * eles saem da linha evolutiva, que é estrutura. A força, não.
 *
 * Estes saem dos quantis deste elenco: p70/p85/p95 nos tetos, p10/p30/p55 nos
 * pisos. Nenhuma rota fica vazia e o menor elenco é de quatro. */
const FAIXAS = [
  { id: 'f1', rotulo: 'Rota rasa',   nivel: [ 2,  8], piso:   0, teto:  500 },
  { id: 'f2', rotulo: 'Rota média',  nivel: [ 9, 20], piso: 405, teto:  525 },
  { id: 'f3', rotulo: 'Rota funda',  nivel: [21, 34], piso: 455, teto:  540 },
  { id: 'f4', rotulo: 'Rota do fim', nivel: [35, 60], piso: 490, teto: 9999 },
];

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
  naturezas: NATUREZAS,
  biomas:    BIOMAS,
  faixas:    FAIXAS,
  raridade:  RARIDADE_FAIXAS,
  evolucoes: EVOLUCOES,
  bolas:     BOLAS,
  itens:     ITENS,
  iniciais: INICIAIS,
  elenco:   DEX.map(e => e.dex),
  golpes:   MOVES,
  clima:    CLIMA,
  climaIdle: CLIMA_IDLE,
  moeda:    MOEDA,
  moedaPve: MOEDA_PVE,
  material: MATERIAL,
  rotulos: ROTULOS,
  nomeExibido, slugExterno, sprite, spriteShiny, silhuetaDe,
};

export default originalV1;
