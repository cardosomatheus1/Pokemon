/* A DECORAÇÃO DOS BIOMAS — o que enfeita cada lugar (camada 0).
 *
 * ── DE ONDE VEIO ─────────────────────────────────────────────────────────
 *
 * O dono recortou e mandou, com destino nomeado para metade delas:
 *
 *   > "As conchas da primeira imagem você pode ver de aplicar na praia, as
 *   >  pedras vermelha e símbolo de fogo junto a fogueira podem ficar no
 *   >  vulcão, os pisos de neve e boneco de neve na caverna gelada, o cacto e
 *   >  buracos no chão no oásis e deserto, os cogumelos azul e rosa com as gosma
 *   >  e fumaça rosa podem ficar na estufa rachada, os pregos e piso de metal no
 *   >  ferro velho, as duas boias também podem ser na praia"
 *
 * E o resto por conta própria: *"tem diversas outras imagens e preciso da sua
 * criatividade [...] aplique essas decorações em seus biomas corretos de forma
 * mais natural e harmônica possível"*.
 *
 * ── A TENSÃO QUE ISTO CRIA, E COMO ELA FOI RESOLVIDA ─────────────────────
 *
 * A folha é arte de 3DS: 64 px, alta resolução, sombreado suave. O cenário é
 * GBA: 16 px, pixel duro. A regra do projeto é explícita — *"onde o neon encosta
 * no mundo, o mundo perde a era"* — e arte pré-renderizada crua no meio do pixel
 * art tem exatamente esse risco.
 *
 * A saída não é recusar (o dono escolheu estas peças) nem aplicar cru. É a
 * ESCALA: reduzidas a ~20 px, com redução suave e sombra própria, elas leem como
 * PROP PRÉ-RENDERIZADO — que é uma coisa que os jogos da era GBA de fato
 * usavam. O que denuncia arte de outra era não é ela ser suave: é ela ser
 * GRANDE o bastante para a suavidade aparecer.
 *
 * `image-rendering` fica em `auto` para estas, e só para estas: `pixelated`
 * numa redução de 64 para 20 px joga fora dois terços das linhas e devolve
 * serrilhado sujo. O chão continua duro; o prop reduzido, não.
 *
 * ── A GRADE ──────────────────────────────────────────────────────────────
 *
 * Células de 64×64, passo 66, borda de 2 px — medido nos pixels da folha, não
 * suposto. `[linha, coluna]` endereça uma célula, e é assim que a tabela abaixo
 * fala: escolher pelo número deixa conferível o que foi aplicado.
 */

export const LADO = 64;
export const PASSO = 66;
export const BORDA = 2;
export const COLUNAS_FOLHA = 5;

/* AS MEDIDAS REAIS DA FOLHA, e nao `COLUNAS * PASSO`.

   A folha tem 396 px de largura — SEIS passos de 66, e nao cinco: a ultima
   coluna e sobra vazia. Escalar por `5 * 66 = 330` faz cada recorte sair
   deslocado, e o desvio cresce com a coluna: a primeira quase acerta e a
   ultima mostra o vizinho. Foi o que apareceu na primeira aplicacao.

   Medido nos bytes do PNG, e o teste confere contra o arquivo — folha trocada
   por uma de outro tamanho move todas as pecas de uma vez. */
export const LARGURA_FOLHA = 396;
export const ALTURA_FOLHA = 2702;

/* ── O QUE VAI ONDE ────────────────────────────────────────────────────────
 *
 * `cel` é `[linha, coluna]` na folha. `n` é quantas espalhar. `onde` diz em que
 * faixa ela pode cair, e usa as mesmas quatro de `fauna.mjs` — mais `frente`,
 * que é a única coisa nova aqui: peça que passa NA FRENTE dos pés do
 * personagem, e que é o que faz ele estar dentro da cena em vez de sobre ela.
 *
 * `tam` é o lado final em px de mundo. O padrão é 20; peças que são MARCO do
 * lugar (a fogueira, o boneco de neve, o castelo) ganham mais, e peças de chão
 * (as poças, os pisos) ganham menos e vão para trás de todo mundo.
 *
 * ── AS ESCOLHAS QUE FORAM MINHAS, E O CRITÉRIO ───────────────────────────
 *
 * O critério é um só, e é o que o dono já tinha dado para a fauna: *"nada de
 * Charizard na caverna de gelo"*. Cada peça responde "por que ESTE lugar".
 *
 *   folhas e tocos       floresta: é o que sobra de uma árvore que caiu
 *   flores amarelas      campo: campo aberto é onde flor se vê de longe
 *   águas-vivas          praia, na água — elas não vivem em terra
 *   pedras cinza         montanha: a rocha do lugar, solta
 *   cristais             ruína e gelo: o que cresce onde ninguém varre
 *   castelo              ruína. É literalmente uma ruína, e é o único marco
 *                        construído da folha inteira
 *   blocos de âmbar      deserto: resina fossilizada é coisa de lugar seco
 *   flores brancas       estufa: o que uma estufa cultiva
 */
export const DECOR_POR_BIOMA = {
  praia: [
    { cel: [6, 0], n: 3, onde: 'margem', tam: 18 },   // concha creme
    { cel: [6, 1], n: 3, onde: 'margem', tam: 18 },   // concha rosa
    { cel: [6, 4], n: 1, onde: 'margem', tam: 24 },   // a concha grande, com pérola
    { cel: [10, 0], n: 1, onde: 'grama', tam: 26 },   // boia azul
    { cel: [10, 1], n: 1, onde: 'grama', tam: 26 },   // boia vermelha
    { cel: [7, 1], n: 2, onde: 'agua', tam: 20 },     // água-viva azul
  ],
  vulcao: [
    { cel: [5, 2], n: 5, onde: 'grama', tam: 20 },    // pedra vermelha
    { cel: [5, 3], n: 4, onde: 'grama', tam: 22 },    // pedra vermelha escura
    { cel: [5, 4], n: 1, onde: 'grama', tam: 30, frente: true },   // a fogueira
    { cel: [5, 1], n: 2, onde: 'grama', tam: 18 },    // a chama solta
  ],
  gelo: [
    { cel: [9, 0], n: 4, onde: 'grama', tam: 22, chao: true },   // piso de gelo
    { cel: [9, 1], n: 3, onde: 'grama', tam: 22, chao: true },   // piso de gelo azul
    { cel: [9, 2], n: 4, onde: 'grama', tam: 18 },    // monte de neve
    { cel: [9, 3], n: 3, onde: 'grama', tam: 18 },    // monte de neve azul
    { cel: [9, 4], n: 1, onde: 'grama', tam: 30, frente: true },  // o boneco de neve
    { cel: [17, 4], n: 2, onde: 'grama', tam: 22 },   // cristal
  ],
  deserto: [
    { cel: [12, 4], n: 2, onde: 'grama', tam: 28 },   // o cacto
    { cel: [12, 1], n: 5, onde: 'grama', tam: 20, chao: true },   // buraco na areia
    { cel: [12, 2], n: 2, onde: 'grama', tam: 20 },   // bloco de âmbar
    { cel: [12, 3], n: 2, onde: 'grama', tam: 20 },   // bloco de âmbar escuro
  ],
  oasis: [
    { cel: [12, 4], n: 2, onde: 'grama', tam: 28 },   // o cacto
    { cel: [12, 0], n: 3, onde: 'grama', tam: 20, chao: true },   // buraco rosado
    { cel: [7, 2], n: 3, onde: 'grama', tam: 18 },    // flor amarela
  ],
  estufa: [
    { cel: [11, 0], n: 3, onde: 'grama', tam: 20 },   // gosma verde
    { cel: [11, 1], n: 2, onde: 'grama', tam: 20 },   // gosma azul
    { cel: [11, 3], n: 3, onde: 'grama', tam: 20 },   // gosma rosa
    { cel: [11, 4], n: 1, onde: 'grama', tam: 28, frente: true }, // a fumaça roxa
    { cel: [18, 2], n: 2, onde: 'grama', tam: 20 },   // flor branca
    { cel: [18, 3], n: 2, onde: 'grama', tam: 20 },   // flor rosa
  ],
  ferrovelho: [
    { cel: [22, 2], n: 4, onde: 'grama', tam: 24, chao: true },   // placa de metal
    { cel: [22, 3], n: 3, onde: 'grama', tam: 24, chao: true },   // placa clara
    { cel: [22, 0], n: 4, onde: 'grama', tam: 14 },   // prego
    { cel: [22, 1], n: 4, onde: 'grama', tam: 14 },   // prego escuro
  ],
  floresta: [
    { cel: [8, 0], n: 5, onde: 'grama', tam: 16 },    // folha verde
    { cel: [8, 1], n: 4, onde: 'grama', tam: 16 },    // folha clara
    { cel: [8, 2], n: 2, onde: 'grama', tam: 26, frente: true },  // toco
    { cel: [8, 4], n: 3, onde: 'grama', tam: 20 },    // flor branca do mato
  ],
  campo: [
    { cel: [7, 2], n: 5, onde: 'grama', tam: 18 },    // flor amarela
    { cel: [7, 3], n: 4, onde: 'grama', tam: 18 },    // flor teal
    { cel: [8, 3], n: 2, onde: 'grama', tam: 24 },    // toco cinza
  ],
  montanha: [
    { cel: [17, 0], n: 4, onde: 'grama', tam: 22 },   // pedra cinza
    { cel: [17, 1], n: 3, onde: 'grama', tam: 22 },   // pedra cinza escura
    { cel: [17, 2], n: 3, onde: 'grama', tam: 20 },   // pedra azulada
    { cel: [17, 3], n: 1, onde: 'grama', tam: 20 },   // a pedra dourada, rara
  ],
  ruina: [
    { cel: [19, 4], n: 1, onde: 'grama', tam: 40 },   // o castelo — o marco do lugar
    { cel: [13, 4], n: 3, onde: 'grama', tam: 22 },   // cristais
    { cel: [17, 0], n: 3, onde: 'grama', tam: 20 },   // pedra solta
  ],
};

export const decorDe = biomaId => DECOR_POR_BIOMA[biomaId] ?? [];

/* A mesma mistura sem estado do resto da cena. */
export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 271, 29) >>> 0;

/* O recorte de uma célula, em px da folha. */
export const recorteCel = ([lin, col]) => ({
  x: col * PASSO + BORDA, y: lin * PASSO + BORDA, lado: LADO,
});

/* ── ONDE CADA PEÇA CAI ────────────────────────────────────────────────────
 *
 * As mesmas faixas da fauna, e pela mesma razão: a trilha é chão pisado e chão
 * pisado é chão limpo. Uma peça no caminho lê como obstáculo, não como enfeite —
 * e o personagem passa por dentro dela.
 */
import { assentar } from './composicao.mjs';

export const FAIXAS = {
  /* A GRAMA PARA ANTES DA TRILHA, e e ISTO que mantem o chao pisado limpo.
     Havia uma segunda guarda dentro de `decorar` descartando o que caisse na
     trilha; ela era inalcancavel (esta faixa nunca chega la) e era PERIGOSA —
     apagaria em silencio uma peca que alguem pusesse na trilha de proposito.
     Codigo morto que so acorda para fazer a coisa errada e pior que nenhum. */
  grama:  pl => [Math.round(pl.rows * 0.14), Math.max(2, pl.caminho - 1)],
  trilha: pl => [pl.caminho, pl.caminho + 1],
  margem: pl => [pl.margem, pl.margem],
  agua:   pl => [pl.margem + 1, pl.rows - 1],
};

export function decorar(planta, T = 16) {
  const semente = sementeDe(planta.bioma);
  const out = [];
  let k = 0;
  for (const d of decorDe(planta.bioma)) {
    const faixa = FAIXAS[d.onde] ?? FAIXAS.grama;
    const [y0, y1] = faixa(planta);
    for (let i = 0; i < d.n; i++, k++) {
      const r = j => mistura(semente + k * 811, j);
      const lx = 1 + Math.floor(r(1) * Math.max(1, planta.cols - 2));
      const cru = Math.round(y0 + r(2) * Math.max(0, y1 - y0));
      /* A TRILHA CURVA (1.15). A guarda que este arquivo apagou por
         inalcançável VOLTOU A SER ALCANÇÁVEL — a faixa da grama para no EIXO, e
         a estrada agora sobe até três linhas acima dele. `assentar` não
         descarta a peça: empurra para a beira de cima, e a curva ganha
         acostamento em vez de um buraco. */
      const ly = assentar(planta, d.onde, lx, cru);
      out.push({
        cel: d.cel, tam: d.tam ?? 20,
        frente: !!d.frente, chao: !!d.chao,
        x: lx * T + Math.round(r(3) * T),
        y: (ly + 1) * T + Math.round(r(4) * 6),
      });
    }
  }
  return out;
}

/* ── O QUE BARRA O PASSO ───────────────────────────────────────────────────
 *
 * Queixa do dono: *"o boneco e o pokémon passam pelo meio das coisas, como se
 * fossem fantasmas [...] não tem como regular isso para não ficar tão feio?"*.
 *
 * Ele está certo, e o custo de não ter isso é maior do que parece: uma peça que
 * o personagem atravessa deixa de ser um objeto e vira uma textura pintada. É a
 * mesma leitura que o lago tinha antes de bloquear — *"relevo que não bloqueia
 * vira textura"*.
 *
 * ── MAS NEM TUDO BARRA, E ISSO É A METADE QUE IMPORTA ────────────────────
 *
 * Desviar de uma folha caída é mais feio que atravessá-la: o boneco faria uma
 * curva grande em volta de nada, e a cena passaria a parecer um labirinto de
 * miudezas. É o mesmo critério que fez só o lago bloquear no relevo — *"desviar
 * de tudo faria o passeio parecer um labirinto"*.
 *
 * A linha é o TAMANHO, porque é ele que decide se o olho espera resistência:
 * um toco de 26 px pede desvio; um prego de 14 não. E quem `frente` marca é
 * marco do lugar (a fogueira, o boneco de neve) — esses barram sempre.
 */
export const BARRA_A_PARTIR_DE = 22;

/* `!!` de proposito: sem ele, uma peca pequena sem `frente` devolve `undefined`
   em vez de `false` — e `undefined` passa por qualquer `if` como falso, mas
   reprova qualquer comparacao estrita. Predicado que devolve tres valores e
   um predicado que ainda nao foi lido com atencao. */
export const barra = d => !d.chao && !!((d.tam ?? 20) >= BARRA_A_PARTIR_DE || d.frente);

/* A PEGADA é a base da peça, e não o desenho todo: o topo de um cacto não
   estorva quem passa atrás dele. Elipse baixa, como a sombra — e um pouco mais
   estreita que a arte, para o desvio não parecer exagerado. */
export function bloqueiosDecor(planta, T = 16) {
  return decorar(planta, T)
    .filter(barra)
    .map(d => ({ x: d.x, y: d.y - d.tam * 0.16, rx: d.tam * 0.34, ry: d.tam * 0.20 }));
}
