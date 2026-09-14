/* A GEOMETRIA DA CENA DO AVANÇO — bloco A4b (camada 0, sem DOM).
 *
 * Separado do `avanco-cena.mjs` pelo mesmo motivo que o `mini-log.mjs` foi
 * separado do `dom.mjs` e o `sprites-dados.mjs` do `sprites.mjs`:
 *
 *   > Aritmética que só se pode conferir olhando a tela é aritmética que
 *   > ninguém confere.
 *
 * Aqui está tudo que decide ONDE e COM QUAL QUADRO um mob é desenhado. Nada
 * disso toca `document`, e por isso tudo isso tem teste que roda em um décimo
 * de segundo, sem navegador.
 *
 * ── E ISSO NÃO É ARRUMAÇÃO: FOI ONDE O DEFEITO ESTAVA ────────────────────
 *
 * A conta da direção era `atan2(-dx, dy)`, e ela espelhava SEIS das oito —
 * um bicho vindo pela direita era desenhado indo para a esquerda. Duas
 * acertavam por simetria (baixo e cima), que é exatamente o que faz um erro
 * desses sobreviver a um olhar rápido: quem vem de frente está certo, e quem
 * vem pelo lado anda de costas.
 *
 * Enquanto a conta morava no arquivo que fala com o DOM, ela não tinha como
 * ser afirmada sem subir um navegador. Agora tem, e o teste cobre as oito.
 */

/* As oito linhas da folha do PMDCollab, na ordem em que elas estão no arquivo:
   baixo, baixo-dir, dir, cima-dir, cima, cima-esq, esq, baixo-esq. */
export const LINHA_POR_OITAVO = [0, 1, 2, 3, 4, 5, 6, 7];

/* ── O RITMO DA ANIMAÇÃO ─────────────────────────────────────────────────
 *
 * As durações do PMD vêm em ticks. **24 ms por tick** é o que a prévia
 * aprovada usou, e é o ritmo que o dono viu e aprovou — trocar por 1/60 s
 * agora deixaria tudo 44% mais rápido do que a coisa que ele olhou.
 *
 * A diferença para a prévia é que ali o ciclo era dividido por igual entre os
 * quadros (um `steps()` de CSS não sabe fazer outra coisa). Aqui cada quadro
 * dura o que a folha diz: mesma duração total, ritmo interno certo. */
export const MS_POR_TICK = 24;

/* Onde os mobs se postam em volta do treinador, em pixels de mundo. Perto o
   bastante para ler como luta, longe o bastante para os sprites não se
   sobreporem — medido nos maiores quadros do pack (56 px). */
export const RAIO_POSTO = 34;
/* ── DE ONDE ELES ENTRAM, E POR QUE 210 ERA LONGE DEMAIS ────────────────
 *
 * A ideia era boa — o mob VEM de fora em vez de nascer no posto — e o número
 * era de quando a câmera mostrava o mundo inteiro. Com o zoom em 2× a janela
 * tem ~290 px de mundo, e 210 px de raio põe a entrada FORA da vista: o
 * jogador via dois bichos surgindo do nada nos cantos e atravessando a cena
 * inteira em diagonal.
 *
 *   > Entrar de fora só lê como "chegando" se o de fora estiver logo ali. Mais
 *   > longe que a vista, "entrar" e "aparecer" ficam idênticos — e ainda custa
 *   > uma travessia que rouba a leitura da luta.
 *
 * 150 px é o meio-termo MEDIDO, e o número sai de duas contas e não de gosto:
 *
 *     a CAMINHADA   `COMBATE.WALK * 2.2` ≈ 3 px por quadro. O trecho até o
 *                   posto tem de durar mais que um piscar — abaixo de ~45 px
 *                   ele acaba em quinze quadros e ninguém vê ninguém chegar
 *     a VISTA       no zoom padrão a janela mostra ~343 px de mundo, ou ±171
 *                   do treinador. Nascer além disso é nascer fora da tela, e
 *                   aí "entrar" e "aparecer" ficam idênticos
 *
 * Com 150, o caminho até o posto fica em ~75 px — meio segundo de aproximação,
 * dentro do quadro do começo ao fim. */
export const RAIO_ENTRADA = 150;

/* Quanto do caminho o mob anda por quadro. Exponencial em vez de velocidade
   fixa: ele chega rápido de longe e assenta devagar no posto, que é como um
   bicho se aproxima — velocidade constante lê como peça de tabuleiro. */
export const APROXIMACAO = 0.035;

/* Abaixo disto ele está no posto e para de andar. Sem o piso, o sprite fica
   trocando de pata para sempre a meio pixel do alvo. */
export const PARADO_ABAIXO = 0.6;

/* ── A LINHA DA FOLHA PARA UMA DIREÇÃO ────────────────────────────────────
 *
 * O ângulo é dividido em oito fatias, e a fatia 0 é para baixo NA TELA — que é
 * a linha 0 da folha. Daí o índice cresce passando pela direita.
 *
 * `atan2(dx, dy)` e não `atan2(dy, dx)`: o eixo de referência é o vertical,
 * porque é ele que a folha chama de zero. Trocar a ordem gira tudo em 90°;
 * trocar o sinal de `dx` espelha. As duas coisas já aconteceram aqui. */
export function linhaDe(dx, dy) {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return 0;
  const oitavo = ((Math.round(Math.atan2(dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;
  return LINHA_POR_OITAVO[oitavo];
}

/* O quadro pelo relógio, respeitando a duração de CADA um. */
export function quadroDe(duracoes, t) {
  const lista = Array.isArray(duracoes) ? duracoes : [];
  const total = lista.reduce((a, d) => a + d, 0) * MS_POR_TICK;
  if (!(total > 0)) return 0;
  let resto = ((t % total) + total) % total;
  for (let i = 0; i < lista.length; i++) {
    resto -= lista[i] * MS_POR_TICK;
    if (resto < 0) return i;
  }
  return lista.length - 1;
}

/* ── O POSTO DE CADA MOB ──────────────────────────────────────────────────
 *
 * Um anel em volta do treinador, com o ângulo derivado do ÍNDICE e não
 * sorteado. Derivado é o que faz o mob voltar para o mesmo lugar depois de a
 * aba ser reaberta; sorteado faria o bando se reorganizar a cada repintura, e
 * numa tela que fica aberta por horas isso lê como tremor. */
export function posto(i, total, eu) {
  const ang = (i / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: eu.x + Math.cos(ang) * RAIO_POSTO * 1.6,
    /* Achatado no eixo Y porque a projeção é 3/4: um círculo perfeito em
       coordenadas de mundo lê como elipse esticada na tela. */
    y: eu.y + Math.sin(ang) * RAIO_POSTO,
  };
}

/* ── ONDE O MOB NASCE: À FRENTE, E NÃO EM VOLTA ──────────────────────────
 *
 * O ângulo era o áureo, que espalha as entradas pelos 360° — bom para um
 * cerco, errado para o que a cena virou. Metade dos mobs nascia ATRÁS do
 * treinador e o atravessava para chegar ao campo, o que lê como "ele passou
 * correndo" e não como "ele apareceu".
 *
 * Agora eles nascem no MESMO arco em que vão lutar, só que mais longe: o
 * caminho é uma linha reta de dois segundos até o posto, na direção em que já
 * estão olhando. O áureo continua na conta, mas só para desencontrar os dois —
 * duas entradas exatamente juntas seriam um sprite só. */
export function entrada(i, eu) {
  /* O MESMO passo do `alvoDoCombate`, com a leva de dois: cada um nasce na
     direção do próprio posto, e o resto do caminho é uma linha reta. */
  const passo = (((i % 2) + 0.5) / 2 - 0.5) * ARCO_DA_FRENTE;
  const ang = Math.PI / 2 + passo + ((i * 2.399963) % 1 - 0.5) * 0.3;
  return {
    x: eu.x + Math.cos(ang) * RAIO_ENTRADA,
    /* Achatado no eixo Y, como todo o resto: a projeção é 3/4. */
    y: eu.y + Math.sin(ang) * RAIO_ENTRADA * 0.8,
  };
}

/* ── O RELÓGIO DO PASSEIO, QUE PARA DURANTE O DUELO ──────────────────────
 *
 * Pedido do dono, e é a outra metade de "eles batalham, não acompanham":
 *
 *   > "O treinador e seu pokémon param e se enfrentam (...) conforme for
 *   >  derrotando, ele volta a ficar caminhando na área"
 *
 * O passeio do treinador é uma FUNÇÃO DO TEMPO — ele não tem estado. Então
 * parar o boneco é parar o relógio dele, e não acrescentar um modo de
 * "parado" que teria de ser mantido em dia com o resto.
 *
 * A pausa acumulada é o que impede o TELEPORTE: sem descontá-la, ao fim de
 * cada duelo o passeio saltaria para onde estaria se nunca tivesse parado — e
 * o jogador veria o treinador aparecer do outro lado do mapa toda vez que um
 * bicho caísse. */
let pausadoDesde = 0, pausaAcumulada = 0;

export function relogioDoPasseio(t, duelando) {
  if (duelando) {
    if (!pausadoDesde) pausadoDesde = t;
    return pausadoDesde - pausaAcumulada;
  }
  if (pausadoDesde) { pausaAcumulada += t - pausadoDesde; pausadoDesde = 0; }
  return t - pausaAcumulada;
}

/* Zera a pausa. Chamado quando a run acaba: uma pausa herdada de ontem
   deslocaria o passeio para sempre. */
export function soltarPasseio() { pausadoDesde = 0; pausaAcumulada = 0; }

/* ── O MOVIMENTO DE COMBATE, COPIADO DA ARENA ────────────────────────────
 *
 * Pedido do dono, e ele tem razão duas vezes:
 *
 *   > "esse parado, ele para e simplesmente congela a câmera, está feio (...)
 *   >  só copiar o combate da arena e aplicar aqui"
 *
 * A primeira versão fazia o mob caminhar até um posto e PARAR. Um sprite
 * imóvel no meio de uma luta lê como tela travada — e a arena, que é nossa e
 * está pronta há vinte blocos, já resolveu isso: lá ninguém fica parado. O
 * lutador se aproxima, investe para bater, recua depois do golpe, e volta a
 * rondar.
 *
 * As constantes são as de lá (`coreografia.mjs`, BEHAV), e são as MESMAS de
 * propósito: dois combates do mesmo jogo com ritmos diferentes seriam dois
 * jogos. */
export const COMBATE = {
  GAP: 26,        /* a folga que ele quer do adversário quando está rondando */
  DASH_D: 46,     /* acima disto, bater exige investida */
  CHARGE: 2.6,    /* quanto ele acelera indo para o golpe */
  RECUO: 1.5,     /* segundos afastando-se depois de bater */
  RECUO_GAP: 52,  /* a folga que ele quer enquanto recua */
  WALK: 1.35,     /* pixels de mundo por passo de 1/30 s */
  RONDA: 0.55,    /* o quanto ele oscila em volta do posto, em pixels */
  RONDA_HZ: 0.9,  /* e com que frequência — devagar, para ler como respiração */
};

/* Para onde este mob quer estar AGORA. O ângulo vem do posto dele (derivado do
   índice, e não sorteado), e a distância muda conforme ele esteja indo bater
   ou recuando — é o que faz o vaivém da arena.
 *
 * A oscilação é pequena e lenta: ela não é movimento, é VIDA. Sem ela um mob
 * que chegou ao posto fica imóvel, e imóvel numa luta lê como travado. */
export function alvoDoCombate(i, total, centro, { recuando = false, t = 0 } = {}) {
  /* UM ARCO À FRENTE, E NÃO UM CERCO. A versão anterior espalhava os postos
     pelos 360°, e metade deles caía ATRÁS do companheiro — em cima do
     treinador, que é justamente onde o dono já tinha cortado a poluição uma
     vez. Com dois por leva, o arco põe os dois de frente, lado a lado. */
  const passo = ((i + 0.5) / Math.max(1, total) - 0.5) * ARCO_DA_FRENTE;
  const ang = Math.PI / 2 + passo;
  const gap = (recuando ? COMBATE.RECUO_GAP : COMBATE.GAP) * AFASTAMENTO;
  const respiro = Math.sin(t / 1000 * COMBATE.RONDA_HZ * Math.PI * 2) * COMBATE.RONDA;
  /* A DIAGONAL: o de índice par fica um passo à frente do ímpar. Derivada do
     índice e não do relógio — ela é arranjo, e arranjo não pode tremer. */
  const degrau = (i % 2 ? 1 : -1) * DEGRAU_DE_PROFUNDIDADE;
  return {
    x: centro.x + Math.cos(ang) * (gap + respiro) * 1.6,
    /* Achatado no eixo Y porque a projeção é 3/4: um círculo perfeito em
       coordenadas de mundo lê como elipse esticada na tela. */
    y: centro.y + Math.sin(ang) * (gap + respiro) + degrau,
  };
}

/* ── ONDE A BATALHA ACONTECE: À FRENTE DO TREINADOR, E ANCORADA NELE ─────
 *
 * Duas correções do dono, e a segunda desfez a primeira pela raiz.
 *
 * A primeira foi o aperto:
 *
 *   > "a batalha precisa acontecer fora do pixel do treinador (...) os MOBS
 *   >  que aparecem é pra BATALHAR COM O MEU POKÉMON"
 *
 * Eu respondi com um campo LONGE do treinador, girando por wave. E aí veio a
 * segunda, que é sobre o resultado disso:
 *
 *   > "os pokémon saem correndo pelo cenário e com a tela agora menor muitas
 *   >  vezes nem dá pra ver (...) precisa se posicionar à frente do seu
 *   >  treinador enfrentando os wild, pode movimentar, mas não ficar correndo
 *   >  mapa parecendo pega-pega"
 *
 * ── A CAUSA NÃO ERA VELOCIDADE: ERA UM LAÇO ─────────────────────────────
 *
 * O companheiro mirava o mob mais próximo e se punha a uma folga dele; o mob
 * mirava o companheiro e se punha a uma folga DELE. Dois alvos móveis, cada um
 * perseguindo o outro.
 *
 *   > Um alvo que se move porque o perseguidor se moveu não é um alvo: é uma
 *   > realimentação, e realimentação sem âncora não estabiliza.
 *
 * O par não convergia — ele DERIVAVA, e a deriva atravessava o cenário. Numa
 * tela menor ela saía de vista, que é a metade da queixa que dói mais.
 *
 * ── A ÂNCORA É O TREINADOR, E ELA NÃO SE MEXE ───────────────────────────
 *
 * O companheiro tem um POSTO: à frente do treinador, sempre no mesmo lugar
 * relativo. Ele investe para bater e recua depois — o vaivém da arena continua
 * inteiro —, mas o ponto para onde ele volta não depende de onde o inimigo
 * está. Os selvagens vêm para esse posto. Ninguém persegue ninguém.
 *
 * E NÃO GIRA POR WAVE. A versão anterior girava para dez lutas não caírem no
 * mesmo canto; numa tela menor isso jogava a luta para fora da vista, e "não
 * dá pra ver" é um defeito pior que "sempre no mesmo lugar". */
export const POSTO_DO_MEU = {
  /* À FRENTE quer dizer PARA BAIXO na tela: a projeção é 3/4, o treinador olha
     para o jogador, e o que está à frente dele está entre ele e a câmera.
     34 px é a folga que separa dois quadros de 56 px sem abrir um vão. */
  FRENTE: 34,
  /* Um passo para o lado, pequeno: sem ele o companheiro fica exatamente na
     vertical do treinador e os dois sprites se encobrem quando ele recua. */
  LADO: 8,
};

/* Quanto do círculo os selvagens ocupam à frente do companheiro. Um arco, e
   não um cerco: cercar põe metade deles atrás dele, em cima do treinador. */
export const ARCO_DA_FRENTE = 1.7;

/* ── E O ARCO PRECISA DE RAIO, e o da arena não serve aqui ───────────────
 *
 * `COMBATE.GAP` é 26, e é o número certo LÁ: na arena o palco é a tela inteira
 * e os lutadores são desenhados grandes. Aqui o mundo é GBA a 2×, os quadros do
 * pack têm até 56 px, e 26 px de folga põe dois selvagens EM CIMA do
 * companheiro — foi o que a captura mostrou, com um deles cobrindo o outro.
 *
 *   > Copiar a constante e não a intenção é copiar errado. A intenção é "perto
 *   > o bastante para ler como luta, longe o bastante para os corpos não se
 *   > encostarem", e o número que a cumpre depende do tamanho do corpo.
 *
 * 1,7× põe o arco a ~44 px do companheiro: os dois cabem lado a lado com uma
 * folga de sprite entre eles, e o trio inteiro continua na mesma vista. */
export const AFASTAMENTO = 1.7;

/* Um passo de profundidade entre os dois, para eles não dividirem a mesma
   linha do chão. Não é enfeite: sprites alinhados no mesmo Y se recortam no
   mesmo pixel e leem como uma figura só — a diagonal é o que faz o olho
   contar DOIS. */
export const DEGRAU_DE_PROFUNDIDADE = 7;

/* Quanta folga o campo precisa depois do posto para caber inteiro: o arco dos
   selvagens, o corpo deles, e a placa embaixo. Medido nos maiores quadros do
   pack (56 px) mais os ~18 px da plaquinha. */
const CABE_O_CAMPO = 96;

/* ── E A LUTA NÃO PODE ACONTECER FORA DA VISTA ──────────────────────────
 *
 * Achado OLHANDO, e é a metade da queixa do dono que mais dói:
 *
 *   > "com a tela agora menor muitas vezes nem dá pra ver"
 *
 * O treinador passeia pelo mundo inteiro e PARA onde estiver quando a wave
 * começa — inclusive encostado numa borda. A câmera não rola além do mundo,
 * então o grupo ia para o canto da tela e metade das placas saía do quadro.
 *
 *   > Congelar o boneco onde ele está é certo. Armar a batalha à frente dele
 *   > sem olhar se há mundo à frente não é.
 *
 * Então o campo vira para DENTRO. É uma regra de borda e não de sempre: no
 * meio do mundo — que é onde o treinador passa quase todo o tempo — nada
 * muda, e a leitura continua a mesma de sempre. */
export const postoDoCompanheiro = (eu, mundo = null) => {
  const largura = Number(mundo?.w) || 0;
  const altura = Number(mundo?.h) || 0;
  /* À FRENTE é para baixo; encostado embaixo, "à frente" passa a ser para
     cima — o companheiro fica ENTRE o treinador e o topo, e o arco dos
     selvagens vem junto porque ele é derivado do posto. */
  const cabeAbaixo = !altura || eu.y + POSTO_DO_MEU.FRENTE + CABE_O_CAMPO <= altura;
  const frente = cabeAbaixo ? POSTO_DO_MEU.FRENTE : -POSTO_DO_MEU.FRENTE;
  /* E o passo lateral vira para o lado que tem mundo. */
  const cabeADireita = !largura || eu.x + POSTO_DO_MEU.LADO + CABE_O_CAMPO <= largura;
  const lado = cabeADireita ? POSTO_DO_MEU.LADO : -POSTO_DO_MEU.LADO;
  return { x: eu.x + lado, y: eu.y + frente };
};

/* O NOME ANTIGO CONTINUA VALENDO, e aponta para o novo posto: quem chamava
   `pontoDeBatalha` queria saber onde a luta acontece, e a resposta mudou de
   lugar, não de pergunta. */
export const pontoDeBatalha = (eu, mundo = null) => postoDoCompanheiro(eu, mundo);

/* ── SEPARAR O QUE SE ENCOSTA — a geometria do D-081 ──────────────────────
 *
 * As placas de nome e vida têm largura fixa e se centram no lutador. O desenho
 * do A4g manda o selvagem ATÉ o companheiro para brigar, então dois lutadores
 * encostados são duas placas no mesmo lugar — sempre, e exatamente no instante
 * em que o jogador mais quer ler as duas.
 *
 * ── POR QUE A CONTA MORA AQUI, E NÃO JUNTO DOS ELEMENTOS ────────────────
 *
 * Porque ela é geometria pura, e geometria pura neste projeto tem teste sem
 * navegador. A primeira versão morava no `avanco-hud.mjs`, misturada com
 * `style.transform` — e o portão Q2 provou o custo: o defeito plantado que
 * DESLIGA a aplicação passou, porque nenhum teste conseguia olhar o resultado
 * sem montar um DOM.
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém. Separar a conta do desenho é o que a torna afirmável.
 *
 * ── SEPARAR, E NUNCA ESCONDER ───────────────────────────────────────────
 *
 * Sumir com a de baixo resolveria a sobreposição perdendo informação — e a
 * perdida seria a do bicho que está apanhando. Todo ponto que entra, sai.
 *
 * A ordem é de cima para baixo, e ela importa: resolvida na ordem de chegada,
 * duas placas trocariam de lugar quando um mob nascesse, e a troca é mais
 * difícil de ler que a sobreposição. */
export const VOLTAS_DA_SEPARACAO = 8;

export function separarPontos(pontos, { largura, altura } = {}) {
  const L = Number(largura) || 0;
  const A = Number(altura) || 0;
  const fila = [...(pontos ?? [])]
    .filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.y - b.y);

  const postos = [];
  for (const p of fila) {
    let y = p.y;
    /* O TETO DE VOLTAS existe porque a lista é curta e isto roda por quadro:
       com quatro lutadores nunca chega perto, e num caso patológico é melhor
       uma placa encostada que um quadro travado. */
    for (let volta = 0; volta < VOLTAS_DA_SEPARACAO; volta++) {
      const bateu = postos.find(q => Math.abs(q.x - p.x) < L && Math.abs(q.y - y) < A);
      if (!bateu) break;
      /* PARA BAIXO: a placa já mora abaixo do sprite, e é a única direção que
         não atravessa o bicho que ela descreve. */
      y = bateu.y + A;
    }
    postos.push({ ...p, y });
  }
  return postos;
}

/* ── UM PONTO LIVRE PERTO DO PEDIDO — a geometria do L-172 ────────────────
 *
 * As placas se separam DEPOIS de todas serem pintadas (`separarPontos`), porque
 * elas existem juntas e se pode olhar o conjunto. Os números do dano não: cada
 * um nasce sozinho, num instante, e o conjunto dele são os que ainda estão no
 * ar — os que nasceram nos últimos 1,2 s.
 *
 *   > Duas geometrias porque são dois problemas: um é arrumar o que está na
 *   > tela, o outro é escolher onde pôr o que está chegando.
 *
 * Medido no passo OLHAR, com o observador ligado por 28 s de wave 1:
 *
 *     numeros sobrepostos: 5    numa wave comum, de 25 nascidos
 *     numeros sobrepostos: 0    no duelo do chefe, de 12 — porque é 1x1
 *
 * É a queixa do dono com endereço: *"o hitbox tá meio zoado, os números
 * aparecem de forma confusa"*.
 *
 * ── ELE SOBE, E NUNCA ANDA PARA O LADO ──────────────────────────────────
 *
 * O número já sobe sozinho pela animação, então empurrar para cima é a direção
 * que o olho já espera. Empurrar para o lado o afastaria do lutador que o
 * causou — e a cor diz de quem é o dano, mas a POSIÇÃO diz de quem é o golpe.
 *
 * ── E ELE FICA DENTRO DA JANELA ─────────────────────────────────────────
 *
 * Medido a 420 px: dois dos vinte e cinco nasciam fora, à esquerda do mundo. Um
 * número que existe e não se vê é o D-083 de volta pela porta estreita. */
/* O PASSO É MAIOR QUE A CAIXA, e não menor: com passo de 15 sobre caixa de 16,
   um empurrão não limpava a colisão e o laço gastava duas voltas para fazer o
   trabalho de uma. */
export const PASSO_DO_DANO = 18;

/* ── QUEM AINDA ESTÁ NO AR ───────────────────────────────────────────────
 *
 * O número vive 1,2 s, então o "conjunto" de um que está nascendo são os que
 * couberam nesse instante e meio. Puro, e separado do desenho pelo motivo de
 * sempre: o portão Q2 cobrou quatro vezes o preço de a conta morar em camada 4
 * — o defeito plantado que DESLIGA a limpeza passou por não haver como afirmar
 * a lista sem montar um DOM.
 *
 * E ela não é só arrumação: sem a limpeza, a lista só cresce numa aba aberta
 * por horas, e cada número novo é empurrado mais para cima até bater no teto. */
export const VIDA_DO_DANO = 1200;

export const aindaNoAr = (lista, agora, vida = VIDA_DO_DANO) =>
  (lista ?? []).filter(o => o && Number.isFinite(o.em) &&
                            (Number(agora) || 0) - o.em < vida);
export const VOLTAS_DO_DANO = 6;

export function pontoLivre(x, y, ocupados, { largura, altura, limite = null } = {}) {
  const L = Number(largura) || 0;
  const A = Number(altura) || 0;
  let ponto = { x: Number(x) || 0, y: Number(y) || 0 };

  for (let volta = 0; volta < VOLTAS_DO_DANO; volta++) {
    const bateu = (ocupados ?? []).some(o =>
      Math.abs(o.x - ponto.x) < L && Math.abs(o.y - ponto.y) < A);
    if (!bateu) break;
    /* PARA CIMA: a animação já sobe, então esta é a direção que o olho espera.
       Para o lado afastaria o número do lutador que o causou. */
    ponto = { x: ponto.x, y: ponto.y - PASSO_DO_DANO };
  }

  /* ── E DENTRO DA JANELA ────────────────────────────────────────────────
     `limite` é a caixa da camada. Sem ele, nada é grampeado — quem não sabe o
     tamanho da tela não pode inventar um. */
  if (limite) {
    const meia = L / 2;
    const maxX = Math.max(meia, Number(limite.w) || 0);
    ponto.x = Math.min(Math.max(ponto.x, meia), maxX - meia);
    /* Em cima só: um número empurrado para fora POR BAIXO nunca acontece — ele
       sobe. O teto existe para o empurrão não passar do topo da cena. */
    ponto.y = Math.max(ponto.y, A);
  }
  return ponto;
}

/* ── O AVANÇO PROGRESSIVO — o trecho da wave (L-164, v2) ──────────────────
 *
 * Terceiro vídeo que o dono mandou, e a frase dele:
 *
 *   > "veja como funciona a movimentação, realmente faz sentido: o boneco vai
 *   >  avançando e batalhando de forma progressiva"
 *
 * ── E ISSO CONTRADIZ O QUE O A4g CONSTRUIU, MAS SÓ PELA METADE ──────────
 *
 * O A4g ancorou a batalha no treinador PARADO, e aquela correção estava certa:
 * antes disso o par derivava pelo cenário sem convergir, e o dono cortou —
 * *"não ficar correndo mapa parecendo pega-pega"*. O que ela produziu, porém,
 * foi "duas criaturas brigando num quadro estático", e não "uma jornada".
 *
 *     o que FICA CERTO   ninguém persegue ninguém; o campo tem âncora
 *     o que FALTAVA      a âncora ANDAR entre as waves, em vez de o treinador
 *                        passear no mesmo pedaço a run inteira
 *
 * ── A SOLUÇÃO É ESTREITAR A ÁREA, E NÃO MEXER NO PASSEIO ────────────────
 *
 * O treinador já anda por uma ÁREA e já congela quando há selvagem em cena. O
 * que muda é a área: cada wave tem um TRECHO do mapa, e os trechos avançam.
 * Wave 1 no começo, wave 10 no fim — e a câmera segue o boneco, como sempre.
 *
 *   > Nada do movimento muda. Muda ONDE ele acontece, e é a diferença entre
 *   > passear num pátio e atravessar um mapa.
 *
 * ── OS TRECHOS SE SOBREPÕEM, e isso não é folga ─────────────────────────
 *
 * Sem sobreposição, vencer uma wave TELEPORTA o boneco para o trecho seguinte —
 * e teleporte é exatamente o defeito que o `relogioDoPasseio` existe para
 * evitar. Com um terço de sobreposição, o passeio da wave nova começa onde o da
 * anterior podia estar, e a passagem é uma caminhada.
 *
 * ── E O EIXO É O MAIOR DOS DOIS ─────────────────────────────────────────
 *
 * O mundo do bioma é mais largo que alto, então a jornada é horizontal. Fixar o
 * eixo faria um bioma vertical futuro atravessar em três passos e ficar parado
 * no resto — a conta olha a forma do lugar, e não uma preferência escrita. */
export const SOBREPOSICAO_DO_TRECHO = 0.35;

export function trechoDaWave(area, wave, totalWaves = 10,
                             { sobreposicao = SOBREPOSICAO_DO_TRECHO } = {}) {
  const x0 = Number(area?.x0) || 0, x1 = Number(area?.x1) || 0;
  const y0 = Number(area?.y0) || 0, y1 = Number(area?.y1) || 0;
  const largura = x1 - x0, altura = y1 - y0;
  const n = Math.max(1, Math.floor(Number(totalWaves) || 1));
  /* A wave é apertada para dentro: uma run que continue além da décima (ou um
     save adulterado) não pode pedir um trecho que não existe. */
  const w = Math.min(n, Math.max(1, Math.floor(Number(wave) || 1)));

  /* Área degenerada — mundo minúsculo ou planta a meio carregar — devolve ela
     mesma. Um trecho de largura negativa poria o boneco fora do mapa. */
  if (largura <= 0 || altura <= 0 || n === 1) return { x0, x1, y0, y1 };

  const horizontal = largura >= altura;
  const total = horizontal ? largura : altura;
  const inicio = horizontal ? x0 : y0;

  /* O passo é o que sobra depois da sobreposição: n trechos de tamanho `t` com
     sobreposição `s` cobrem `inicio + (n-1)·t·(1-s) + t` = total. */
  const sob = Math.min(0.9, Math.max(0, Number(sobreposicao) || 0));
  const tamanho = total / (1 + (n - 1) * (1 - sob));
  const passo = tamanho * (1 - sob);

  const a = inicio + passo * (w - 1);
  const b = Math.min(inicio + total, a + tamanho);

  return horizontal
    ? { x0: Math.round(a), x1: Math.round(b), y0, y1 }
    : { x0, x1, y0: Math.round(a), y1: Math.round(b) };
}
