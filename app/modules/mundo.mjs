/* O MUNDO DESENHADO — o chão do idle (bloco 1.3a, camada 0, §0.3).
 *
 * Fronteira: entra um pack e um id de bioma, sai a PLANTA da cena — qual tile e
 * qual cor em cada posição. Não conhece expedição, criatura, aposta nem estado.
 *
 * ── A DIVISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A decisão é pura; o traço é fino.**
 *
 *     plantaDo()   diz o que vai em cada posição. Roda em Node, sem canvas.
 *     pintar()     percorre a planta e chama `fillRect`. Nada decide.
 *
 * Um pintor de cenário parece coisa que só se testa com navegador, e não é —
 * desde que as duas metades estejam separadas. Tudo que pode estar errado de
 * verdade (bioma sem paleta, água no lugar do caminho, cenário que muda
 * sozinho entre duas aberturas) está na planta, e a planta é testável em
 * milissegundos. O que sobra para o Chromium é se `fillRect` desenha.
 *
 * ── A PALETA VEM DO PACK, E ISSO NÃO É DETALHE ───────────────────────────
 *
 * Cor de bioma é TEMA, e tema mora em `content/` (§0.3) — do mesmo jeito que as
 * cores de tipo já moravam. Se a paleta vivesse aqui, o pack original — que tem
 * outros seis biomas — renderizaria com cor emprestada do outro, e o §0.3.1
 * deixaria de ser cumprível por um caminho que ninguém olharia.
 *
 * ── O CENÁRIO NÃO PODE MUDAR ENTRE DUAS ABERTURAS ────────────────────────
 *
 * A semente sai do PRÓPRIO ID do bioma. Não do relógio, não de `Math.random`.
 * Um lugar que se redesenha a cada visita não é um lugar — e "lugar" é o que
 * faz escolher a rota ser uma escolha em vez de trocar a cor do fundo.
 *
 * ── A CÂMERA É A DO CARTUCHO ─────────────────────────────────────────────
 *
 * 15×10 tiles. Já foi 20×12, e o dono do projeto viu o efeito: "o pixel do
 * boneco fica MUITO pequeno". O problema não era o boneco — era a câmera.
 * Afastar encolhe tudo por igual, e o que se perde primeiro é o detalhe.
 */

import { acidentes, ambienteDe, temParede } from './relevo.mjs';
import { pintarRelevo, elipse } from './relevo-pincel.mjs';
import { trilhaDe, naTrilha, regioes, pesoEm, mediaDoPeso, quantosCandidatos, aceita, mistura, alturaSuave, esfarelaEm }
  from './composicao.mjs';

export const T = 16;                       // o tile do cartucho
/* ── O MUNDO CRESCEU (1.5c) ────────────────────────────────────────────────
 *
 * Era 15×10 — a viewport exata do cartucho, 240×160. Fazia sentido enquanto a
 * cena era um boneco andando de um lado para o outro: mais espaço só teria
 * deixado o corredor mais comprido.
 *
 * Deixou de fazer no dia em que o dono pediu mundo vivo. Palavra dele:
 *
 *   "como mundo será mais vivo, a distância será muito maior do overworld, a
 *    tela da rota precisa ser maior pra melhor visualização e apreciação dos
 *    detalhes do cenário [...] o boneco e seu Pokémon podem se movimentar de
 *    maneira aleatória, não precisa necessariamente ficar indo pra frente e pra
 *    trás andando em corredor"
 *
 * Vaguear precisa de lugar para vaguear. Com 10 fileiras, duas das quais são
 * água e uma é a trilha, sobram sete — e um boneco de 52 px de altura ocupa
 * três delas. Não há para onde ir, e qualquer caminhada aleatória vira tremor.
 *
 * 44×28 dá 704×448 de mundo — MAIOR QUE A TELA de propósito. É o que faz o
 * zoom afastado mostrar MAIS MUNDO em vez do mesmo mundo menor, e é o que dá
 * lugar para o treinador e o Pokémon explorarem em vez de patrulharem. A tela
 * passa a ser uma CÂMERA sobre o mapa, e não o mapa inteiro. */
export const COLS_PADRAO = 44, ROWS_PADRAO = 28;

/* As superfícies que uma cena tem. Cada chave é um lugar onde a cor aparece;
   faltando uma, aquela superfície some ou cai na reserva — e o teste do pack
   existe para que isso nunca chegue à tela. */
export const CHAVES_PALETA = [
  'base', 'baseEsc', 'claro', 'acento',
  'trilha', 'trilhaEsc', 'areia',
  'massa', 'massaEsc', 'massaClaro', 'espuma',
  'luz', 'luzNucleo',
];

/* A RESERVA existe para o id errado não derrubar a aba.
 *
 * Lançar aqui seria trocar um cenário feio por uma tela branca, e id de bioma
 * errado é a coisa mais fácil de acontecer no dia em que o pack trocar. Cinza
 * de propósito: tem de ser óbvio que é reserva, e não uma escolha de arte. */
export const PALETA_RESERVA = {
  base: '#5a5a5a', baseEsc: '#464646', claro: '#787878', acento: '#9a9a9a',
  trilha: '#6b6459', trilhaEsc: '#544e46', areia: '#6e6b68',
  massa: '#3a4750', massaEsc: '#28323a', massaClaro: '#5f7684', espuma: '#9fb0bb',
  luz: 'rgba(200,200,200,.10)', luzNucleo: '#d8d8d8',
};

export const biomaDe = (pack, id) => (pack?.biomas ?? []).find(b => b.id === id) ?? null;
export const paletaDe = (pack, id) => biomaDe(pack, id)?.paleta ?? PALETA_RESERVA;

/* Quanto detalhe cada bioma espalha pelo chão. Sai da paleta porque é
   característica do lugar — um deserto liso e uma estufa tomada não podem ter a
   mesma densidade —, e cai num padrão quando o pack não diz. */
const densidadeDe = bioma => bioma?.detalhe ?? 90;

/* O gerador. Semeado pelo ID, e é o que faz o lugar ser sempre o mesmo lugar. */
function geradorDe(id) {
  let sd = [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 31, 11) >>> 0;
  return () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff)) / 0x7fffffff;
}

/* ── A PLANTA ──────────────────────────────────────────────────────────────
 *
 * Devolve as linhas de tiles e os detalhes soltos, já decididos.
 *
 * A ÁGUA OCUPA DUAS LINHAS DE DEZ. Já foram três, e na câmera do cartucho isso
 * comia quase um terço da cena — o terreno que importa é aquele em que o
 * personagem anda. */
export function plantaDo(pack, biomaId, { cols = COLS_PADRAO, rows = ROWS_PADRAO } = {}) {
  const bioma = biomaDe(pack, biomaId);
  const P = bioma?.paleta ?? PALETA_RESERVA;
  const rnd = geradorDe(biomaId);

  const margem = rows - 2;
  const caminho = Math.max(1, Math.min(margem - 3, Math.round(rows * 0.6) - 1));

  /* A TRILHA CURVA (1.15). `caminho` continua sendo o EIXO — um número só, que
     é o que a decoração, a fauna e o relevo usam para saber onde é "em cima" e
     "embaixo" da estrada. O que é novo é `trilha`, a linha real de cada coluna.

     Guardar as duas não é redundância: o eixo é uma decisão de COMPOSIÇÃO da
     cena (a estrada corta o terço de baixo), e a linha é o DESVIO dela. Quem
     precisa de "de que lado da estrada isto está" quer o eixo; quem precisa de
     "aqui é chão pisado" quer a linha. Trocar um pelo outro foi como a primeira
     tentativa colocou moitas em cima da própria trilha. */
  const trilha = trilhaDe(biomaId, { cols, rows, caminho, margem });
  const pisado = (lx, ly) => naTrilha(trilha, lx, ly, caminho);

  const tiles = [];
  for (let ly = 0; ly < rows; ly++) {
    const linha = [];
    for (let lx = 0; lx < cols; lx++) {
      const v = (lx * 7 + ly * 13) % 11;
      if (ly === margem) linha.push({ tipo: 'margem', fundo: P.areia, risco: P.espuma, v });
      else if (ly > margem) linha.push({
        tipo: 'agua', fundo: ly === margem + 1 ? P.massa : P.massaEsc,
        risco: ly === margem + 1 ? P.massaClaro : null, v });
      else if (pisado(lx, ly)) linha.push({
        tipo: 'caminho', fundo: P.trilha, risco: P.trilhaEsc, segundo: P.areia, v });
      else linha.push({
        tipo: 'grama', fundo: P.base, risco: P.baseEsc, segundo: P.claro, v });
    }
    tiles.push(linha);
  }

  /* OS DETALHES NÃO CAEM NA ÁGUA NEM NO CAMINHO. Na água porque flutuariam; no
     caminho porque é onde o personagem anda, e chão pisado é chão limpo. */
  const detalhes = [];
  /* A DENSIDADE ACOMPANHA A ÁREA. O número do pack foi calibrado na cena de
     15x10; num mundo de 44x28 o mesmo número espalharia oito vezes menos
     detalhe por tile, e todo bioma viraria um campo liso. */
  const quantos = Math.round(densidadeDe(bioma) * (cols * rows) / 150);
  /* AS REGIÕES REDISTRIBUEM O QUE A DENSIDADE JÁ DECIDIU (1.15).
     Sorteia candidatos a mais e recusa por peso local — a clareira fica aberta,
     a mata fica fechada, e o TOTAL não anda. Ver `composicao.mjs`: acrescentar
     detalhe era a resposta errada, e a certa é o mesmo detalhe mal distribuído,
     porque é isso que uma paisagem é. */
  const mapa = regioes(biomaId, { cols, rows, margem });
  const media = mediaDoPeso(mapa, { cols, margem });
  const sementeAceite = [...String(biomaId)].reduce((a, c) => a + c.charCodeAt(0) * 71, 3) >>> 0;
  for (let i = 0; i < quantosCandidatos(quantos, media); i++) {
    const lx = Math.floor(rnd() * cols);
    const ly = Math.floor(rnd() * margem);
    /* ── A RECUSA NAO PODE BEBER DO MESMO LCG ─────────────────────────────
       `rnd` e um congruencial linear, e valores CONSECUTIVOS dele andam numa
       rede: o sorteio da aceitacao sai correlacionado com o sorteio de `ly`
       que veio logo antes — e `ly` e justamente o que decide o peso.

       Medido, com a mesma conta de compensacao nos tres:

           oasis     62% do detalhe pedido
           deserto   85%
           floresta  95%

       Tres respostas para uma formula so, porque o vies depende de onde as
       regioes caem em relacao a rede do gerador. O `mistura` sem estado nao
       tem rede nenhuma, e a mesma peneira que ja semeia relevo e fauna serve
       aqui — a semente leva `i` para dois candidatos no mesmo tile nao
       decidirem juntos. */
    if (!aceita(pesoEm(mapa, lx, ly), mistura(sementeAceite + i * 397, lx * 31 + ly)))
      continue;
    if (pisado(lx, ly)) continue;
    detalhes.push({
      lx, ly,
      dx: Math.floor(rnd() * 10) + 3,
      dy: Math.floor(rnd() * 10) + 3,
      cor: rnd() < 0.5 ? P.acento : P.claro,
      alto: rnd() < 0.35,
    });
  }

  const planta = { bioma: biomaId, rotulo: bioma?.rotulo ?? biomaId, paleta: P,
                   cols, rows, margem, caminho, trilha, regioes: mapa, tiles, detalhes };
  /* O RELEVO entra na planta, e nao no pincel: assim ele e testavel em Node
     junto com o resto da decisao, e a cena so o desenha. */
  planta.relevo = acidentes(planta, T);
  return planta;
}

/* ── O PINCEL ──────────────────────────────────────────────────────────────
 *
 * Percorre a planta e desenha. Não decide NADA — se uma decisão aparecer aqui,
 * ela deixa de ser testável em Node, e é assim que um pintor volta a só poder
 * ser conferido por captura de tela. */
/* ── A ESTRADA, PINTADA COLUNA DE PIXEL A COLUNA DE PIXEL ─────────────────
 *
 * Percorre a largura em pixels, e não em tiles: para cada coluna de 1 px, a
 * curva suave diz onde a faixa começa. Duas linhas de tile de altura, como
 * sempre foi — o que mudou é que a beira deixou de ser a quina do tile.
 *
 * A beira ganha três coisas que ela não tinha, e é o passo 2 da regra de peça
 * visual do CLAUDE.md — o detalhe que não foi pedido e sem o qual o pedido não
 * está cumprido:
 *
 *     ESFARELADA   a terra come a grama de forma irregular, ±2 px
 *     ESCURECIDA   um risco de terra batida na quina, que dá espessura
 *     AREADA       poeira clara puxada para dentro, que dá chão pisado
 */
function pintarTrilha(ctx, planta) {
  const { cols, trilha, bioma, paleta: P } = planta;
  const larg = cols * T, alt = 2 * T;

  for (let x = 0; x < larg; x++) {
    const base = alturaSuave(trilha, x / T) * T;
    const cima = Math.round(base) + esfarelaEm(bioma, x, 0);
    const baixo = Math.round(base + alt) + esfarelaEm(bioma, x, 1);

    ctx.fillStyle = P.trilha;
    ctx.fillRect(x, cima, 1, Math.max(1, baixo - cima));

    /* A quina de terra batida. Sem ela a estrada é uma mancha chapada, e chapado
       é o que faz o chão parecer papel de parede em vez de superfície. */
    ctx.fillStyle = P.trilhaEsc;
    ctx.fillRect(x, cima, 1, 1);
    ctx.fillRect(x, baixo - 1, 1, 1);

    /* Poeira: clara perto das bordas, onde o pé passa e levanta. Semeada, então
       o mesmo lugar tem sempre a mesma poeira. */
    const r = mistura(x * 131, 5);
    if (r < 0.18) {
      ctx.fillStyle = P.areia;
      const dentro = 2 + Math.floor(mistura(x * 131, 9) * 5);
      ctx.fillRect(x, (r < 0.09 ? cima + dentro : baixo - 1 - dentro), 1, 1);
    }
  }
}

export function pintar(ctx, planta) {
  const { cols, rows, tiles, detalhes, paleta: P } = planta;
  ctx.imageSmoothingEnabled = false;

  for (let ly = 0; ly < rows; ly++) for (let lx = 0; lx < cols; lx++) {
    const t = tiles[ly][lx], x = lx * T, y = ly * T;
    /* O TILE DE TRILHA É PINTADO COMO GRAMA (1.15), e a estrada vem depois,
       como curva. O tile continua sendo `caminho` para quem PENSA — a caminhada
       do treinador, os bloqueios, "chão pisado é chão limpo". O que mudou é só
       quem DESENHA. Ver `alturaSuave` em composicao.mjs: pintar a estrada por
       tile devolvia uma escada de degraus de 16 px em ângulo reto. */
    const grama = t.tipo === 'caminho';
    ctx.fillStyle = grama ? P.base : t.fundo; ctx.fillRect(x, y, T, T);
    if (t.tipo === 'margem') { ctx.fillStyle = t.risco; ctx.fillRect(x, y + T - 3, T, 1); }
    else if (t.tipo === 'agua') {
      if (t.risco) { ctx.fillStyle = t.risco; ctx.fillRect(x + ((t.v * 4) % T), y + 3, 3, 1); }
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? (grama ? P.claro : t.segundo) : (grama ? P.baseEsc : t.risco);
        ctx.fillRect(x + ((t.v * 3 + i * 5) % T), y + ((t.v * 7 + i * 3) % T), 1, 1);
      }
    }
  }

  pintarTrilha(ctx, planta);

  /* O RELEVO ENTRA AQUI: depois do chao, antes dos detalhes soltos.
     Depois do chao porque ele e chao — um lago desenhado antes seria coberto.
     Antes dos detalhes porque a poeira e o mato pequeno caem POR CIMA do
     acidente, e nao debaixo dele: quem passou por ali deixou marca no que ja
     estava. */
  pintarRelevo(ctx, planta, planta.relevo ?? []);

  for (const d of detalhes) {
    ctx.fillStyle = d.cor;
    const x = d.lx * T + d.dx, y = d.ly * T + d.dy;
    if (d.alto) { ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 1, y + 1, 1, 1); }
    else ctx.fillRect(x, y, 2, 1);
  }

  /* A VINHETA DE LUZ, por cima de tudo.
   *
   * Não estava em pedido nenhum, e é o que tira a cara de "grade de tiles" e dá
   * atmosfera. É a regra do CLAUDE.md sobre peça visual nunca entregar o mínimo
   * que funciona — e é também o que faz cada bioma ter uma LUZ, que foi o
   * critério para os três de autoria própria existirem. */
  const g = ctx.createRadialGradient(
    cols * T / 2, planta.margem * T * 0.45, 10,
    cols * T / 2, planta.margem * T * 0.45, cols * T * 0.62);
  g.addColorStop(0, P.luz);
  g.addColorStop(1, 'rgba(0,0,0,.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cols * T, rows * T);
}

/* Desenha um bioma num canvas, do zero. É o que a aba chama. */
export function pintarBioma(canvas, pack, biomaId, grade) {
  const planta = plantaDo(pack, biomaId, grade);
  canvas.width = planta.cols * T;
  canvas.height = planta.rows * T;
  pintar(canvas.getContext('2d'), planta);
  return planta;
}
