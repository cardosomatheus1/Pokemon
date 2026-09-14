/* O RELEVO DE CADA BIOMA — os acidentes do terreno (camada 0).
 *
 * ── O PEDIDO ──────────────────────────────────────────────────────────────
 *
 *   "atualmente todos cenários são basicamente iguais, da pra se fazer uma
 *    diferença visual neles [...] uma cachoeira em um bioma que caiba, um
 *    laguinho no meio com um pokémon de água se refrescando, na caverna de gelo
 *    os flocos de gelo caindo, e um pedaço de gelo rachado no chão, no vulcão
 *    as brasas voando e a lava rachada em alguns locais do chão"
 *
 * Ele está certo sobre o diagnóstico. Até aqui os onze biomas tinham a MESMA
 * planta — grama, trilha, margem, água — e mudavam só de cor e de partícula.
 * Cor e partícula distinguem o AR do lugar; o CHÃO continuava idêntico.
 *
 * ── A DIFERENÇA ENTRE PARTÍCULA E RELEVO ─────────────────────────────────
 *
 *     partícula   está no ar, se move, não ocupa lugar
 *     relevo      está no chão, fica parado, e OCUPA LUGAR
 *
 * A segunda metade é o que torna isto mais do que enfeite: um lago no meio do
 * mapa muda por onde o treinador anda. Um cenário em que a decoração não
 * interfere em nada é papel de parede caro.
 *
 * ── AS SEIS FORMAS, E POR QUE SÓ SEIS ────────────────────────────────────
 *
 *   lago       água parada no meio do mapa, com margem própria. Quem anda
 *              desvia; quem nada, fica dentro.
 *   fenda      trinca no chão com luz por baixo. É a lava do vulcão e o gelo
 *              rachado da caverna — a MESMA forma, com paleta diferente, e
 *              foi o dono quem pediu as duas no mesmo fôlego.
 *   cachoeira  um veio de água descendo de um desnível até a massa de baixo.
 *   duna       ondas de areia rasteiras, que dão relevo sem obstruir.
 *   moita      tufo alto e escuro; a única forma que o personagem pode pisar.
 *   sucata     placas retas e enferrujadas — a única forma RETA da lista, e é
 *              de propósito: o ferro-velho é o único lugar feito por gente.
 *
 * Seis porque cada uma tem de responder "que lugar isto descreve que os outros
 * não descrevem". Uma sétima que não responda vira ruído — é o mesmo critério
 * que aceitou as nove vidas em `particulas.mjs`.
 *
 * ── ONDE ELE MORA ────────────────────────────────────────────────────────
 *
 * Aqui, e não no ContentPack: "lago" e "fenda" são formas de terreno, não
 * identificadores de franquia — do mesmo jeito que "brasa" e "vagalume". O pack
 * dá a COR; este arquivo dá a FORMA. O pack original terá vulcão também.
 */

import { naTrilha } from './composicao.mjs';

export const FORMAS = ['lago', 'fenda', 'cachoeira', 'duna', 'moita', 'sucata'];

/* Que relevo cada bioma tem, e quanto. Poucos por lugar: o critério do dono
   para a fauna vale igual aqui — cheio demais não parece vivo, parece maquete.
   `n` é o número de acidentes; `luz` liga o brilho por baixo da fenda. */
export const RELEVO_POR_BIOMA = {
  floresta:   [{ forma: 'moita', n: 14 }, { forma: 'lago', n: 1 }],
  praia:      [{ forma: 'duna', n: 10 }],
  campo:      [{ forma: 'moita', n: 10 }, { forma: 'lago', n: 1 }],
  montanha:   [{ forma: 'cachoeira', n: 1 }, { forma: 'fenda', n: 4 }],
  /* O GELO RACHA, MAS NAO BRILHA. `luz` e o clarao de dentro da fenda, e ele
     e verdade no vulcao (a lava ilumina) e mentira no gelo — olhado na previa,
     o gelo com luz saiu como verme luminoso, mais magico que rachado. Trinca
     de gelo e mais ESCURA que a superficie, com a quina clara da geada em
     cima; e exatamente o que o pincel desenha quando `luz` e falso. */
  gelo:       [{ forma: 'fenda', n: 7 }],
  vulcao:     [{ forma: 'fenda', n: 8, luz: true }],
  deserto:    [{ forma: 'duna', n: 14 }, { forma: 'fenda', n: 3 }],
  oasis:      [{ forma: 'lago', n: 2 }, { forma: 'moita', n: 8 }],
  ruina:      [{ forma: 'cachoeira', n: 1 }, { forma: 'sucata', n: 5 }],
  estufa:     [{ forma: 'moita', n: 22 }, { forma: 'lago', n: 1 }],
  ferrovelho: [{ forma: 'sucata', n: 12 }, { forma: 'fenda', n: 3, luz: true }],
};

export const relevoDe = biomaId => RELEVO_POR_BIOMA[biomaId] ?? [];

/* A mesma mistura sem estado do resto da cena: um lugar que se redesenha a cada
   visita não é um lugar, e é o mesmo argumento que já governa o chão. */
export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 197, 13) >>> 0;

/* ── ONDE CADA ACIDENTE CAI ────────────────────────────────────────────────
 *
 * Em pixels de mundo, já resolvido. As regras de colocação são poucas e todas
 * têm motivo:
 *
 *   nada na TRILHA        chão pisado é chão limpo, e é por onde se anda
 *   nada na ÁGUA          exceto a cachoeira, que nasce nela de propósito
 *   o LAGO longe da borda ele precisa de margem própria dos dois lados, senão
 *                         vira uma mancha cortada
 *   a CACHOEIRA na beira  ela desce até a massa de água; no meio do mapa seria
 *                         uma coluna azul sem explicação
 */
export function acidentes(planta, T = 16) {
  const semente = sementeDe(planta.bioma);
  const out = [];
  let k = 0;

  for (const { forma, n, luz } of relevoDe(planta.bioma)) {
    for (let i = 0; i < n; i++, k++) {
      const r = j => mistura(semente + k * 613, j);

      if (forma === 'cachoeira') {
        /* Nasce acima da margem e desce até dentro da água. A largura é ímpar
           de propósito: um veio de largura par não tem centro, e o brilho do
           meio é o que faz parecer volume em vez de retângulo. */
        const larg = 3 + Math.floor(r(1) * 2) * 2;
        const lx = 2 + Math.floor(r(2) * Math.max(1, planta.cols - larg - 4));
        /* A QUEDA TERMINA NA PROPRIA POCA, e nao no mar la embaixo.

           Descendo ate a agua da borda, ela ocupava 78% da altura do mapa —
           medido na montanha, 352 px de 448. Isso nao e um marco, e uma parede:
           virava o assunto da cena inteira e cortava o caminho ao meio.

           Era geometricamente forcado: a unica agua do mapa fica na ultima
           faixa, entao qualquer queda que a alcance atravessa tudo. A saida e
           nao alcanca-la — a poca de espuma na base JA e o corpo de agua que ela
           alimenta, e uma queda que termina na propria poca le melhor do que uma
           que viaja o mapa inteiro para chegar ao mar.

           A pedra que o pincel poe em cima precisa de 9 px de folga; por isso o
           minimo do topo e 4. */
        const alto = Math.max(4, Math.round(planta.margem * 0.20));
        const queda = Math.max(5, Math.round(planta.margem * 0.34));
        out.push({ forma, x: lx * T, y: alto * T,
                   w: larg * T, h: queda * T });
        continue;
      }

      if (forma === 'lago') {
        /* Longe da trilha e das bordas. O raio sai da altura útil, para o lago
           não engolir o mapa num bioma baixo. */
        /* O raio sai da LARGURA DO MAPA, e nao de um numero fixo. Com raio
           fixo o mesmo lago ocupa 9% de um mapa de 44 colunas e 40% de um de
           30 — e 40% nao e um lago, e um mar com grama em volta. */
        const rx = Math.max(2.2 * T, planta.cols * T * (0.055 + r(3) * 0.035));
        const ry = rx * (0.5 + r(4) * 0.18);
        const faixaAlta = planta.caminho > planta.rows * 0.45;
        const y0 = faixaAlta ? 3 : planta.caminho + 3;
        const y1 = faixaAlta ? planta.caminho - 3 : planta.margem - 3;
        if (y1 <= y0) continue;
        /* O CENTRO FICA LONGE DA BORDA o bastante para o lago inteiro caber.
           Colado na lateral, o empurrao que tira o treinador da agua o joga para
           fora da area andavel — e o limite da area o traz de volta para dentro
           do lago. Uma regra de colocacao resolve o que duas correcoes de
           trajeto nao resolviam. */
        const folga = rx + 2 * T;
        const largura = Math.max(1, planta.cols * T - folga * 2);
        out.push({
          forma,
          x: Math.round(folga + r(5) * largura),
          y: Math.round((y0 + r(6) * (y1 - y0)) * T),
          rx, ry,
        });
        continue;
      }

      /* fenda · duna · moita · sucata caem na terra, fora da trilha */
      const lx = 1 + Math.floor(r(7) * Math.max(1, planta.cols - 2));
      const ly = 1 + Math.floor(r(8) * Math.max(1, planta.margem - 2));
      /* A TRILHA CURVA (1.15): chão pisado é chão limpo NA ALTURA DAQUELA
         COLUNA. Comparar com o eixo deixava moita nascendo em cima da estrada
         onde ela sobe, e um vazio inexplicado onde ela desce. */
      if (naTrilha(planta.trilha, lx, ly, planta.caminho)) continue;
      out.push({
        forma, luz: !!luz,
        x: lx * T + Math.round(r(9) * T),
        y: ly * T + Math.round(r(10) * T),
        w: Math.round((0.7 + r(11) * 1.6) * T),
        h: Math.round((0.35 + r(12) * 0.9) * T),
        giro: (r(13) - 0.5) * 0.9,
      });
    }
  }
  return out;
}

/* ── O QUE BLOQUEIA O PASSO ────────────────────────────────────────────────
 *
 * Só o lago. A fenda é rasa, a duna é uma onda de areia, a moita se atravessa e
 * a sucata é baixa — nenhuma delas justifica desviar um personagem, e desviar
 * de tudo faria o passeio parecer um labirinto.
 *
 * O raio é inflado um pouco: parar exatamente na borda deixa o pé na água, e o
 * olho lê isso como afundando. */
export const FOLGA_LAGO = 6;

export function bloqueios(planta, T = 16) {
  return acidentes(planta, T)
    .filter(a => a.forma === 'lago')
    .map(a => ({ x: a.x, y: a.y, rx: a.rx + FOLGA_LAGO, ry: a.ry + FOLGA_LAGO }));
}

export const dentroDe = (b, x, y) => {
  const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
  return dx * dx + dy * dy <= 1;
};

export const bloqueado = (lista, x, y) => (lista ?? []).some(b => dentroDe(b, x, y));

/* ── A TRINCA, EM PONTOS ───────────────────────────────────────────────────
 *
 * A primeira versão desenhava CINCO retângulos de 2 px separados por 5 a 7 px de
 * nada. No código pareciam uma trinca em degraus; na tela, olhada no tamanho em
 * que o jogador vê, eram pontos costurados — um tracejado, não uma rachadura.
 * Foi a segunda metade do Q5 que pegou, olhando a caverna de gelo e o vulcão
 * lado a lado.
 *
 * O que separa um tracejado de uma rachadura são três coisas, e nenhuma delas
 * é a cor:
 *
 *   CONTINUIDADE   os pontos se ligam. Rachadura é uma linha só, quebrada de
 *                  direção, nunca de matéria — o chão não some no meio dela
 *   ESPESSURA QUE  grossa no meio, fina nas pontas. Espessura constante lê como
 *   VARIA          risco de caneta; a trinca real abre onde a tensão foi maior
 *   NÚCLEO ESCURO  a fenda é um buraco. Sem o escuro por dentro ela é um risco
 *                  claro DESENHADO no chão, e não uma falta de chão
 *
 * Devolve pontos, e não pixels, porque a decisão é geometria e a geometria se
 * testa em Node — o desenho fica no pincel, como todo o resto. */
export const TRINCA_PASSOS = 9;

export function trinca(a) {
  const pts = [];
  const n = TRINCA_PASSOS;
  /* O eixo da trinca é a diagonal do acidente, já girada pelo `giro`. */
  const ang = Math.atan2(a.h, a.w) + (a.giro ?? 0);
  const comp = Math.hypot(a.w, a.h);
  const cos = Math.cos(ang), sin = Math.sin(ang);

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    /* O DESVIO É PERPENDICULAR AO EIXO, e some nas pontas: uma trinca que
       serpenteia igual do começo ao fim vira onda, e onda não racha nada. */
    const env = Math.sin(t * Math.PI);
    const desvio = Math.sin(t * 7.3 + (a.giro ?? 0) * 9) * comp * 0.11 * env;
    const d = t * comp;
    pts.push({
      x: a.x + cos * d - sin * desvio,
      y: a.y + sin * d + cos * desvio,
      /* grossa no meio, fina nas pontas — 1 px nas bordas, até ~3 no centro */
      w: 1 + env * 2,
    });
  }
  return pts;
}

/* ── O VEIO DA CACHOEIRA ───────────────────────────────────────────────────
 *
 * A primeira versão era um `fillRect` de largura constante, parado no meio da
 * cena. Na prévia da ruína ele saiu como uma COLUNA TEAL de canto vivo, sem
 * vir de lugar nenhum e sem cair em lugar nenhum — o item mais "protótipo" do
 * acervo inteiro.
 *
 * Três correções, e as três são sobre de onde a água vem e para onde ela vai:
 *
 *   VEM DE CIMA    começa na borda de cima da cena, e não no ar. Água que
 *                  nasce no meio da tela não é cachoeira, é um retângulo azul
 *   ABRE AO CAIR   ~35% mais larga embaixo. Coluna de largura fixa é cano
 *   BATE EM ALGO   a espuma da base é uma poça, e ela é o que prova que a água
 *                  chegou ao chão em vez de terminar
 */
export const VEIO_ABERTURA = 0.35;

export function veio(a, faixas = 6) {
  const out = [];
  for (let i = 0; i < faixas; i++) {
    const t = i / faixas, t2 = (i + 1) / faixas;
    const larg = k => a.w * (1 + VEIO_ABERTURA * k);
    out.push({
      y: a.y + a.h * t,
      alt: Math.max(1, a.h * (t2 - t)),
      x: a.x - (larg(t) - a.w) / 2,
      w: larg(t),
    });
  }
  return out;
}

/* ── O AMBIENTE DE CADA BIOMA ──────────────────────────────────────────────
 *
 * O que ainda faz os onze cenários parecerem um só, depois do relevo e da
 * fauna, é que todos são um CAMPO PLANO ILUMINADO POR IGUAL. Um lugar não se
 * distingue por ter outros enfeites: distingue-se pela luz.
 *
 *   uma caverna tem TETO       escuro em cima, escuro nas laterais
 *   um vulcão é iluminado      o clarão vem de baixo, da lava, e não do céu
 *   DE BAIXO
 *   uma ruína afogada tem      quanto mais fundo, mais azul e mais escuro
 *   COLUNA D'ÁGUA em cima
 *   um deserto tem AR QUENTE   a faixa de calor perto do horizonte
 *
 * `de` e `para` são as bordas onde a sombra começa e onde ela satura, em
 * fração da altura da cena. `cor` sai da paleta do pack — o pack dá a cor, este
 * arquivo dá a FORMA, que é a mesma fronteira do resto do módulo.
 *
 * Bioma fora da tabela não recebe nada, e isso é decisão e não esquecimento:
 * campo aberto, praia e floresta são lugares de céu aberto, e escurecê-los para
 * "ficarem diferentes" seria enfeite pelo enfeite. */
export const AMBIENTE_POR_BIOMA = {
  gelo:       { onde: 'teto',   de: 0.00, para: 0.34, forca: 0.46, tom: 'escuro' },
  vulcao:     { onde: 'chao',   de: 1.00, para: 0.52, forca: 0.40, tom: 'acento' },
  ruina:      { onde: 'teto',   de: 0.00, para: 0.62, forca: 0.34, tom: 'escuro' },
  ferrovelho: { onde: 'teto',   de: 0.00, para: 0.26, forca: 0.28, tom: 'escuro' },
  deserto:    { onde: 'chao',   de: 0.72, para: 0.44, forca: 0.20, tom: 'claro' },
  estufa:     { onde: 'teto',   de: 0.00, para: 0.22, forca: 0.22, tom: 'escuro' },
};

export const ambienteDe = biomaId => AMBIENTE_POR_BIOMA[biomaId] ?? null;

/* A VINHETA LATERAL anda junto do teto: caverna sem parede dos lados é um
   campo escuro em cima, e não uma caverna. Só quem tem teto ganha parede. */
export const temParede = biomaId => (ambienteDe(biomaId)?.onde === 'teto');

/* ── A VEIA QUE DESLIZA ────────────────────────────────────────────────────
 *
 * *"criar vida e movimento para as cachoeiras, uma cachoeira estática não é uma
 * cachoeira"* — e o dono tem razão por um motivo mais forte que estética: água é
 * a única coisa numa cena que o olho SABE que se move. Parada, ela não lê como
 * água mal desenhada; lê como pedra azul.
 *
 * ── POR QUE ISTO MORA AQUI, E NÃO NO PINCEL ──────────────────────────────
 *
 * Mesma razão que tirou o piso do zoom de dentro de `ajustarViewport`: cercada
 * de `fillRect` e `cam`, a conta não tinha como ser afirmada sem subir
 * navegador, e defeito plantado nela passaria pela suíte inteira. Aqui ela é
 * geometria pura e a suíte fala sobre ela em microssegundos.
 *
 * ── O MOVIMENTO É DESLIZAMENTO, E NÃO GOTA ───────────────────────────────
 *
 * Gota que cai é o caminho óbvio e o errado num pixel art de 16 px: em escala
 * de cartucho a gota some. O que lê como água correndo é a VEIA CLARA
 * deslizando para baixo e reentrando por cima — o mesmo truque das cachoeiras
 * do GBA, e o mesmo que faz uma esteira parecer esteira.
 *
 * E AS FASES SÃO SEPARADAS. Juntas, as três viram uma barra única descendo — um
 * elevador, e não uma queda. É a mesma família do anel do lago em fase com a
 * boia, e o teste afirma a separação de propósito.
 */
export const VEIA_MS = 900;
export const VEIA_COMPR = 0.34;      // fração da altura da queda
export const VEIA_DESLOC = 0.37;     // quanto uma veia sai da fase da anterior

export const faseVeia = (k, t) => (((t / VEIA_MS) + k * VEIA_DESLOC) % 1 + 1) % 1;

export function veiaEm(a, k, t) {
  const f = faseVeia(k, t);
  const compr = a.h * VEIA_COMPR;
  const topo = -compr + f * (a.h + compr);
  const yA = Math.max(0, topo), yB = Math.min(a.h, topo + compr);
  return { yA, yB, visivel: yB > yA, fase: f };
}
