/* A VIDA NO MUNDO DO IDLE — quem anda, para onde, e o que a câmera mostra.
 *
 * Camada 0: aritmética pura sobre coordenadas. Não conhece canvas, não conhece
 * DOM, não conhece o pack. Recebe os limites do mundo e devolve posições.
 *
 * ── POR QUE VAGAR, E NÃO IR E VOLTAR ──────────────────────────────────────
 *
 * A primeira versão levava o boneco de uma ponta à outra da trilha, em linha
 * reta, para sempre. O dono viu o que aquilo era:
 *
 *   "o boneco e seu Pokémon podem se movimentar de maneira aleatória, não
 *    precisa necessariamente ficar indo pra frente e pra trás andando em
 *    corredor [...] precisa passar a sensação que mesmo em idle, o outfit e
 *    Pokémon estão explorando ao máximo o cenário daquele bioma"
 *
 * Um corredor não é exploração: é um relógio. Depois de dez segundos o jogador
 * já sabe onde o boneco vai estar daqui a dez, e a cena para de ser um lugar.
 *
 * ── ALEATÓRIO, MAS NÃO SORTEADO ───────────────────────────────────────────
 *
 * Nada aqui chama `Math.random`. Cada destino sai de uma função-mistura sobre
 * (semente, número do trecho): o caminho é sempre o mesmo para a mesma semente,
 * e mesmo assim não tem padrão visível.
 *
 * Isso não é preciosismo. A aba do idle tem teste que proíbe `Math.random` —
 * sorteio na tela é sorteio que o servidor não reproduz, e a auditoria do §25.2
 * morre aí. Um passeio reproduzível também se TESTA: dá para afirmar que o
 * boneco nunca entra na água sem rodar o passeio dez mil vezes e torcer.
 *
 * ── O VÍNCULO DO PASSO COM A DISTÂNCIA ────────────────────────────────────
 *
 * A fase do passo sai da distância percorrida, nunca do relógio. Com a fase no
 * relógio, a perna e o chão andam em ritmos independentes e o boneco desliza —
 * é o defeito dos "pulinhos" que o dono viu na bancada, e ele volta sozinho se
 * alguém trocar `distancia` por `t` aqui.
 */

/* ── A MISTURA ─────────────────────────────────────────────────────────────
   Um inteiro entra, um número em [0,1) sai, sem estado nenhum. Sem estado é o
   que permite perguntar "qual era o destino do trecho 400?" sem ter percorrido
   os 399 anteriores — e é assim que o teste checa mil trechos de uma vez. */
export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ── ONDE SE PODE PISAR ────────────────────────────────────────────────────
 *
 * A água e a última fileira de grama estão fora, e a margem também: um boneco
 * com o pé na espuma parece afundando. `margem` é a fileira de areia; tudo dali
 * para baixo é água. */
export function areaAndavel(planta, { qw = 24, qh = 52, T = 16 } = {}) {
  const margem = planta.margem ?? (planta.rows - 2);
  return {
    x0: Math.round(qw * 0.5),
    x1: Math.round(planta.cols * T - qw * 1.5),
    /* o TOPO da cabeça não pode sair pela borda de cima */
    y0: Math.round(qh * 0.6),
    /* os PÉS param uma fileira antes da areia */
    y1: Math.round(margem * T - 2),
  };
}

/* ── UM DESTINO ────────────────────────────────────────────────────────────
 *
 * `semPerfil` é a promessa que eu fiz ao dono sobre os trajes que só têm a
 * vista de frente. Sem desenho de perfil, andar na horizontal mostra o boneco
 * de frente deslizando de lado — ele chamou de "andando de lado igual
 * caranguejo", e estava certo.
 *
 * Não dá para inventar um perfil a partir de uma frente: braços, mochila, cana
 * e cabelo mudam de posição, e o `CLAUDE.md` proíbe substituir arte que falta
 * por arte inventada. O que dá é NÃO PEDIR aquele movimento: o destino nasce
 * com a componente vertical dominante, e o traje anda subindo e descendo até o
 * dono gerar as vistas que faltam. */
export const FAIXA_SEM_PERFIL = 0.14;   // largura útil, em fração do mundo

/* ── O QUE O PASSEIO DESVIA ────────────────────────────────────────────────
 *
 * `bloqueios` chega de fora — do `relevo.mjs` — como uma lista de elipses. O
 * destino é sorteado e, se cair dentro de uma, é EMPURRADO para fora pela borda
 * mais próxima, em vez de sorteado de novo.
 *
 * Empurrar e não resortear é decisão: resortear num mapa com muita água pode
 * tentar dezenas de vezes e, no limite, nunca achar lugar. Empurrar sempre
 * termina, sempre dá um ponto válido, e mantém o destino perto de onde o acaso
 * queria — o passeio continua parecendo escolha, e não fuga. */
function empurrarPraFora(x, y, bloqueios) {
  for (const b of bloqueios ?? []) {
    const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
    const d = Math.hypot(dx, dy);
    if (d > 1 || d === 0) continue;
    /* UM POUCO ALEM DA BORDA, e nao na borda. Empurrar exatamente para cima da
       linha deixa o ponto tecnicamente dentro (a conta da elipse usa <=), e
       visualmente com o pe na agua. */
    x = b.x + (dx / d) * b.rx * 1.04;
    y = b.y + (dy / d) * b.ry * 1.04;
  }
  return { x, y };
}

export function destino(semente, trecho, area, { semPerfil = false, bloqueios = null } = {}) {
  const rx = mistura(semente, trecho * 2 + 1);
  const ry = mistura(semente ^ 0x9e3779b9, trecho * 2 + 7);
  const larg = area.x1 - area.x0;
  /* Sem perfil, os destinos ficam numa FAIXA ESTREITA no centro. Não é a
     direção que muda — é o trajeto: com pouca largura disponível, o `dy` domina
     o `dx` em quase todo trecho, e o boneco sobe e desce em vez de deslizar de
     lado. Trancar só a direção deixaria o caranguejo: ele andaria na horizontal
     mostrando a frente, que é exatamente o que o dono viu. */
  const x = semPerfil
    ? area.x0 + larg * ((1 - FAIXA_SEM_PERFIL) / 2 + rx * FAIXA_SEM_PERFIL)
    : area.x0 + rx * larg;
  const y = area.y0 + ry * (area.y1 - area.y0);
  const fora = empurrarPraFora(x, y, bloqueios);
  /* preso a area andavel de novo: empurrar para fora de um lago colado na
     margem podia jogar o destino para dentro da agua de baixo */
  return {
    x: Math.round(Math.min(area.x1, Math.max(area.x0, fora.x))),
    y: Math.round(Math.min(area.y1, Math.max(area.y0, fora.y))),
  };
}

/* ── O PASSEIO ─────────────────────────────────────────────────────────────
 *
 * Uma sequência de trechos. Cada trecho leva do destino anterior ao próximo, em
 * velocidade constante, e termina com uma PAUSA — porque quem explora para para
 * olhar, e movimento sem pausa lê como patrulha.
 *
 * Devolve posição, direção e distância acumulada. A distância é o que alimenta
 * a fase do passo, e é por isso que ela sai daqui e não do chamador. */
/* 18 px/s era meio passo por segundo num boneco de 52 px de altura: o dono viu
   "os movimentos estao travados". No cartucho um personagem cobre dois tiles por
   segundo — 32 px/s — e e essa a cadencia que o olho reconhece como andar.
   26 ainda ficou em camera lenta na tela do dono. 40 e um pouco acima dos dois
   tiles por segundo do cartucho, e e onde ele parou de parecer arrastado — um
   personagem de 52 px pede passada maior que um de 32. */
export const VELOCIDADE = 40;      // pixels de mundo por segundo

/* A PAUSA VARIA, e é ela que separa explorar de patrulhar.
 *
 * Com pausa fixa, cada parada dura o mesmo e o olho acha o compasso em meia
 * dúzia de trechos — volta a ser um relógio, só que com pausas. Variando de
 * meio segundo a três, algumas paradas são um olhar rápido e outras são
 * alguém que ficou ali. Medido: o boneco passa ~13% do tempo parado, contra
 * 4% com pausa fixa de 900 ms. */
export const PAUSA_MIN = 500, PAUSA_MAX = 3100;
export const pausaDo = (semente, trecho) =>
  PAUSA_MIN + mistura(semente ^ 0x5bf03635, trecho * 3 + 2) * (PAUSA_MAX - PAUSA_MIN);

export function passeio(semente, area, t, opcoes = {}) {
  const { velocidade = VELOCIDADE, semPerfil = false, bloqueios = null } = opcoes;

  /* O trecho é encontrado ANDANDO PARA A FRENTE a partir do zero, e não por uma
     fórmula fechada: cada trecho tem duração própria (a distância muda), então
     não há como pular direto para o trecho de `t`. O laço é barato — mil
     trechos custam microssegundos — e é exato, que é o que importa para o
     desenho não tremer quando a aba fica aberta uma hora. */
  let i = 0, tempo = 0, distancia = 0;
  let a = destino(semente, 0, area, { semPerfil, bloqueios });
  const LIMITE = 20000;   // ~11 h de passeio; além disso, o laço reinicia
  while (i < LIMITE) {
    const b = destino(semente, i + 1, area, { semPerfil, bloqueios });
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const dur = (d / velocidade) * 1000;
    const pausa = pausaDo(semente, i);
    if (tempo + dur + pausa > t) {
      const dentro = t - tempo;
      if (dentro >= dur) {
        /* parado no destino: a direção é a da última chegada, para o boneco não
           virar de frente ao parar e parecer que teleportou */
        /* PARADO TAMBEM DESVIA. O destino ja vem empurrado, mas o limite da
           area pode te-lo trazido de volta para dentro; empurrar de novo aqui
           fecha o caso que sobrou. */
        const parado = empurrarPraFora(b.x, b.y, bloqueios);
        return { x: parado.x, y: parado.y, andando: false,
                 dir: direcaoDe(b.x - a.x, b.y - a.y, semPerfil),
                 distancia: distancia + d };
      }
      const k = dur > 0 ? dentro / dur : 1;
      /* O TRAJETO TAMBEM DESVIA, e nao so os destinos.
         Dois pontos fora do lago podem ter uma reta entre eles que atravessa a
         agua — e um boneco cortando o lago em linha reta e a coisa mais visivel
         que esta cena pode fazer de errado. Empurrando a posicao INTERPOLADA, o
         caminho desliza pela borda: o resultado parece contornar o lago, que e
         o que uma pessoa faria. */
      const pos = empurrarPraFora(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, bloqueios);
      return {
        x: pos.x,
        y: pos.y,
        andando: true,
        dir: direcaoDe(b.x - a.x, b.y - a.y, semPerfil),
        distancia: distancia + d * k,
      };
    }
    tempo += dur + pausa;
    distancia += d;
    a = b; i++;
  }
  return { x: a.x, y: a.y, andando: false, dir: 'baixo', distancia };
}

/* ── A DIREÇÃO ─────────────────────────────────────────────────────────────
   Quatro direções, e a horizontal só ganha quando é claramente horizontal: com
   um limiar em 1:1 exato, um trajeto quase diagonal fica trocando de vista a
   cada quadro e o boneco parece tremer. */
export const VIES_HORIZONTAL = 1.25;

export function direcaoDe(dx, dy, semPerfil = false) {
  if (!semPerfil && Math.abs(dx) > Math.abs(dy) * VIES_HORIZONTAL)
    return dx < 0 ? 'esq' : 'dir';
  return dy < 0 ? 'cima' : 'baixo';
}

/* ── O QUADRO DA FOLHA ─────────────────────────────────────────────────────
 *
 * A folha tem nove: 0 frente · 1 costas · 2 perfil · 3-4 passo de frente ·
 * 5-6 de costas · 7-8 de perfil. A DIREITA NÃO EXISTE — é o perfil espelhado, e
 * `espelhar` diz a quem desenha que precisa virar.
 *
 * A fase vem da DISTÂNCIA. Trocar por tempo aqui traz os pulinhos de volta. */
/* A PERNA ALTERNA A CADA 6 px PERCORRIDOS. Com 9, a 26 px/s, cada fase durava
   um terco de segundo e a caminhada lia como marcha lenta. Seis da ~4 trocas por
   segundo. Com a velocidade em 40, oito da cinco trocas por segundo — que e o
   ritmo em que a perna acompanha o chao em vez de patinar nele. */
export const PASSO_PX = 8;

export function quadroDe(dir, distancia, andando) {
  const base = dir === 'cima' ? 1 : (dir === 'esq' || dir === 'dir') ? 2 : 0;
  const espelhar = dir === 'dir';
  if (!andando) return { quadro: base, espelhar };
  /* quatro fases: parado · passo A · parado · passo B. A volta ao quadro parado
     entre os dois passos é o que o cartucho faz, e é o que impede a caminhada
     de parecer corrida. */
  const fase = Math.floor(distancia / PASSO_PX) % 4;
  const passoA = base === 0 ? 3 : base === 1 ? 5 : 7;
  const passoB = passoA + 1;
  return { quadro: fase === 1 ? passoA : fase === 3 ? passoB : base, espelhar };
}

/* ── O COMPANHEIRO ─────────────────────────────────────────────────────────
 *
 * O Pokémon anda AO LADO do treinador, e o lugar dele sai do rumo dos dois.
 *
 * ── POR QUE O ATRASO NÃO BASTOU ──────────────────────────────────────────
 *
 * A primeira versão punha o companheiro no caminho do treinador, atrasado. É a
 * solução do cartucho e é elegante — mas ela CONVERGE: quando o treinador para,
 * o atrasado alcança a mesma posição e os dois viram um borrão de duas cabeças.
 * O dono viu isso e não teve meio-termo: *"parece que o treinador cagou o
 * bulbassauro, ou então que ta preso na bota dele"*.
 *
 * Aumentar o atraso não resolve, adia: qualquer pausa maior que o atraso junta
 * os dois de novo, e as pausas variam de 0,5 s a 3,1 s de propósito.
 *
 * A posição passa a sair do TREINADOR mais um desvio LATERAL. Separação
 * garantida em todo quadro, inclusive parado — que é justamente quando o
 * jogador olha a cena com calma. */
/* 26 px separava os pontos, mas nao as FIGURAS: um Bulbasaur ocupa ~50 px de
   largura, e a folha dele encostava no traje. 34 e o menor valor em que os dois
   se leem como duas coisas — e o traje e o que a loja vai vender, entao ele nao
   pode ficar coberto. */
export const AO_LADO_PX = 34;

/* Onde ele anda, por rumo do treinador. Andando na vertical fica ao lado;
   andando na horizontal fica atrás e um pouco abaixo, que é onde ele não cobre
   o traje — e o traje é o que a loja vai vender. */
export function ladoDe(dir) {
  if (dir === 'cima')  return { dx:  AO_LADO_PX, dy:  3 };
  if (dir === 'esq')   return { dx:  Math.round(AO_LADO_PX * 0.7), dy: 13 };
  if (dir === 'dir')   return { dx: -Math.round(AO_LADO_PX * 0.7), dy: 13 };
  return { dx: -AO_LADO_PX, dy: -3 };   // baixo
}

/* ── POR QUE NÃO EXISTE UM MOVIMENTO GENÉRICO AQUI ─────────────────────────
 *
 * Houve um `puloDe` neste arquivo por algumas horas. Ele fazia o companheiro
 * subir e descer alguns pixels enquanto andava, para dar vida a um sprite de um
 * quadro só. O dono cortou na hora:
 *
 *   "Não quero o pokémon pulando, todo pokémon é um sapo? ou um canguru??"
 *
 * O erro não foi o pulo em si: foi impor UM movimento a criaturas que têm
 * movimentos próprios. Um Bulbasaur não salta, um Onix não salta, um Gastly nem
 * perna tem. Qualquer animação genérica acerta em três espécies e erra em 143.
 *
 * A animação de cada uma já existe, desenhada por quem conhece a criatura: são
 * os GIFs que a Arena usa, e a cena do idle passou a desenhar quadro a quadro
 * direto deles. Este módulo decide ONDE cada um está; COMO cada um se mexe é
 * decisão da arte, e não minha.
 */

export function companheiro(semente, area, t, opcoes = {}) {
  const eu = passeio(semente, area, t, opcoes);
  const l = ladoDe(eu.dir);
  return {
    ...eu,
    /* preso à área andável: sem isto, o desvio empurra o bicho para a água
       exatamente quando o treinador anda rente à margem */
    x: Math.min(area.x1, Math.max(area.x0, eu.x + l.dx)),
    y: Math.min(area.y1, Math.max(area.y0, eu.y + l.dy)),
  };
}

/* ── A CÂMERA ──────────────────────────────────────────────────────────────
 *
 * O mundo é maior que a tela — é isso que faz zoom out mostrar MAIS MUNDO em
 * vez do mesmo mundo menor. A câmera segue o treinador e para nas bordas: ver
 * o vazio fora do mapa quebra a ilusão mais do que a câmera não centralizar. */
export function camera(alvo, viewW, viewH, mundoW, mundoH) {
  const x = Math.round(Math.min(Math.max(alvo.x - viewW / 2, 0), Math.max(0, mundoW - viewW)));
  const y = Math.round(Math.min(Math.max(alvo.y - viewH / 2, 0), Math.max(0, mundoH - viewH)));
  return { x, y };
}

/* ── NA RUN, A LUTA NÃO DESCE PARA ONDE A CÂMERA NÃO ALCANÇA (L-187) ───────
 *
 * A câmera para nas bordas, e isso é certo (ver acima). O custo aparece quando
 * a janela é quase do tamanho do mundo: medido a 420 px, 413 de janela num
 * mundo de 448 deixam 35 px de folga vertical — a câmera queria y=142 para
 * centrar a luta, e ficava presa em 35. A luta acontecia no último quarto do
 * MAPA, e o bando, que luta ABAIXO do treinador, encostava na borda da janela.
 *
 * Mirar melhor não resolvia: nenhuma câmera centra o que está na borda do
 * mundo. O que resolve é a luta não acontecer lá. Na run, o fundo da área
 * andável sobe até a linha que a câmera presa no fundo ainda mostra a
 * `TETO_DA_LUTA` da altura da janela — e sobra embaixo o espaço do bando.
 *
 * Em tela larga a folga da câmera é grande e o corte é pequeno; a regra é a
 * mesma nas duas, porque ela fala da JANELA, e não de uma largura escolhida.
 * Nunca corta mais que metade da área: com a janela maior que o mundo, o
 * passeio continuaria sendo passeio, e não uma linha. */
export const TETO_DA_LUTA = 0.62;

export function areaDaLuta(area, { mundoH, viewH } = {}) {
  if (!(Number(mundoH) > 0) || !(Number(viewH) > 0)) return area;
  const limite = Math.round(mundoH - Math.min(viewH, mundoH) * (1 - TETO_DA_LUTA));
  const piso = area.y0 + (area.y1 - area.y0) / 2;
  return { ...area, y1: Math.round(Math.max(piso, Math.min(area.y1, limite))) };
}
