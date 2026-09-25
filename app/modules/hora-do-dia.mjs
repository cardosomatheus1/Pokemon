/* A HORA DO DIA — o que a luz faz com a cena (camada 0).
 *
 * Puro: sem DOM, sem canvas, sem relógio próprio. Ele decide O QUE se vê; a
 * cena decide como pintar. É a mesma linha do `avanco-clima.mjs` e do
 * `idle-escolha.mjs`, e pelo mesmo motivo — a regra de CUSTO do `CLAUDE.md`:
 *
 *   > Cada pedaço de lógica que sai do DOM converte um mutante de 30 s num de
 *   > 0,1 s.
 *
 * ── O PEDIDO, E ELE É DO DONO (L-124, 02/09/2026) ────────────────────────
 *
 *     DIA      sol num canto, tela mais clara
 *     TARDE    alaranjado, sol se pondo
 *     NOITE    estrelas, lua NO LADO OPOSTO de onde o sol nasceu
 *
 *   > "se atente a esse pequeno detalhe. Onde sol nasce e se põe e o mesmo
 *   >  para lua"
 *
 * E a metade que ele destacou, que é a que a regra do *"cenário do idle nunca
 * está pronto"* cobra em dobro: **à noite os efeitos do cenário ficam mais
 * fortes** — a brasa do vulcão acesa, o floco brilhando ao entardecer.
 *
 * ── A HORA É DO RELÓGIO REAL, E NÃO DA SEMENTE ───────────────────────────
 *
 * E esta é a decisão de desenho do bloco, escrita antes de construir.
 *
 * O CLIMA é derivado da raiz da run (§P3, ver `avanco-clima.mjs`): ele pertence
 * à RUN, e uma run reaberta oito horas depois tem de responder a mesma coisa.
 *
 * A HORA pertence ao MUNDO, e a diferença importa:
 *
 *   > **Esta é a única tela do produto que fica aberta por horas sem
 *   > interação.** Ela fica ao lado de um filme. Se a hora viesse da semente, a
 *   > cena ficaria parada nas três horas em que a pessoa está olhando — e o
 *   > ciclo inteiro deixaria de existir justamente para quem mais o veria.
 *
 * O instante entra por ARGUMENTO, sempre. Ninguém aqui chama `Date.now()`: se
 * chamasse, a linha de base visual mudaria de resultado conforme a hora em que
 * a suíte roda, e o portão viraria sorte.
 *
 * ── E A AMBIGUIDADE DO PEDIDO, RESOLVIDA E DECLARADA ─────────────────────
 *
 * As duas frases do dono podem ser lidas de dois jeitos:
 *
 *     "lua no lado OPOSTO de onde o sol nasceu"
 *     "onde sol nasce e se põe e o MESMO para lua"
 *
 * A leitura que este arquivo implementa é a do céu de verdade: **os dois
 * percorrem o MESMO arco** — nascem do mesmo lado, se põem do mesmo lado — e
 * nunca estão no céu juntos. O "lado oposto" é o ponto oposto do CICLO: quando
 * o sol se põe de um lado, a lua nasce do outro, que é o lado de onde o sol
 * tinha nascido.
 *
 * É a leitura que satisfaz a segunda frase ao pé da letra, e a primeira no
 * instante em que ele a descreveu — a lua subindo, logo depois do pôr do sol.
 * Está escrito aqui porque é uma escolha, e não um fato: uma palavra do dono
 * inverte a linha `ARCO_INVERTE_PARA_LUA` e nada mais muda.
 */

/* Os TRÊS que ele nomeou, e não quatro. Um período a mais seria uma tela que
   ele não pediu e não reconhece — e o teste cobra a lista inteira. */
export const PERIODOS = ['dia', 'tarde', 'noite'];

/* As bordas em horas decimais. Elas são o esqueleto; quem dá o acabamento é a
   interpolação abaixo, para a luz não dar degrau na virada. */
export const AURORA   = 5.5;    // o céu começa a clarear
export const MANHA    = 7.5;    // dia cheio
export const DOURADA  = 16.5;   // começa a alaranjar — a TARDE
export const OCASO    = 19.0;   // o sol termina de se pôr
export const CERRADO  = 20.5;   // noite cheia

const HORAS = 24;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
/* Interpolação com as pontas suavizadas. Rampa reta também não daria degrau no
   VALOR, mas dá na DERIVADA — e o olho pega a quina numa tela que fica aberta
   por horas, que é exatamente o público desta cena. */
const suave = t => { const x = clamp(t); return x * x * (3 - 2 * x); };
const entre = (v, a, b) => suave((v - a) / (b - a));
const mistura = (a, b, t) => a + (b - a) * t;

/* ── A VOLTA DO DIA ───────────────────────────────────────────────────────
 *
 * 0 é meia-noite e 1 é a meia-noite seguinte — mas 1 nunca é devolvido, porque
 * ele É o zero. A volta tem de FECHAR: sem isso a cena dá um salto de luz na
 * virada, toda noite, na frente de quem deixou a tela aberta. */
export function horaDecimal(agora) {
  const d = new Date(agora);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
       + d.getUTCMilliseconds() / 3600000;
}
export const fracaoDoDia = agora => (horaDecimal(agora) % HORAS) / HORAS;

export function periodoEm(agora) {
  const h = horaDecimal(agora);
  if (h >= MANHA && h < DOURADA) return 'dia';
  if (h >= DOURADA && h < OCASO) return 'tarde';
  /* A AURORA conta como DIA e não como um quarto período: é o sol nascendo, e
     o dono nomeou três. O que ela muda é a LUZ, que é contínua. */
  if (h >= AURORA && h < MANHA) return 'dia';
  return 'noite';
}

/* ── A TINTA DA LUZ ───────────────────────────────────────────────────────
 *
 * A cena é pintada em tiles e não tem céu. Então a hora chega nela como uma
 * CAMADA por cima: uma cor e um alfa.
 *
 *   alfa 0      meio-dia, a cena como ela foi pintada
 *   alfa alto   o meio da noite
 *
 * As cores vestem o tema — o mundo é GBA, a interface é neon —, e a noite puxa
 * para o azul-arroxeado do neon em vez de para o cinza, que é o que faz a cena
 * escurecida continuar parecendo NOSSA e não apenas apagada. */
const AZUL_NOITE   = [22, 26, 62];
const LARANJA_OCASO = [255, 122, 48];
const OURO_AURORA  = [255, 186, 120];

export function luzEm(agora) {
  const h = horaDecimal(agora);
  let cor, alfa;

  if (h < AURORA) {                                  /* madrugada cerrada */
    cor = AZUL_NOITE; alfa = 0.62;
  } else if (h < MANHA) {                            /* amanhecendo */
    const t = entre(h, AURORA, MANHA);
    cor = AZUL_NOITE.map((c, i) => mistura(c, OURO_AURORA[i], t));
    alfa = mistura(0.62, 0, t);
  } else if (h < DOURADA) {                          /* dia cheio */
    cor = OURO_AURORA; alfa = 0;
  } else if (h < OCASO) {                            /* a TARDE, alaranjada */
    const t = entre(h, DOURADA, OCASO);
    cor = LARANJA_OCASO; alfa = mistura(0, 0.34, t);
  } else if (h < CERRADO) {                          /* o laranja vira noite */
    const t = entre(h, OCASO, CERRADO);
    cor = LARANJA_OCASO.map((c, i) => mistura(c, AZUL_NOITE[i], t));
    alfa = mistura(0.34, 0.62, t);
  } else {
    cor = AZUL_NOITE; alfa = 0.62;
  }
  const [r, g, b] = cor.map(c => Math.round(c));
  return { r, g, b, alfa: Math.round(alfa * 1000) / 1000,
           css: `rgba(${r},${g},${b},${Math.round(alfa * 1000) / 1000})` };
}

/* ── O ASTRO, E O ARCO QUE ELE PERCORRE ───────────────────────────────────
 *
 * `x` e `y` são frações da tela: `x` 0 à esquerda, `y` 0 no topo. O arco é o
 * que impede o astro de virar adesivo deslizando na borda de cima — ele SOBE e
 * DESCE, e no meio da travessia está no ponto mais alto.
 *
 * `ARCO_INVERTE_PARA_LUA` é a linha que o dono inverte se a leitura dele for a
 * outra — ver a nota sobre a ambiguidade no topo deste arquivo. */
export const ARCO_INVERTE_PARA_LUA = false;
const NASCE = 0.08, POE = 0.92;      /* onde o arco encosta na borda */
const TETO  = 0.10, CHAO = 0.74;     /* o mais alto e o mais baixo, em y */

export function astroEm(agora) {
  const h = horaDecimal(agora);
  const dia = h >= AURORA && h < OCASO;
  /* t é 0 quando nasce e 1 quando se põe, para os dois. */
  const t = dia
    ? clamp((h - AURORA) / (OCASO - AURORA))
    : clamp(((h < AURORA ? h + HORAS : h) - OCASO) / (HORAS - OCASO + AURORA));

  const avanco = ARCO_INVERTE_PARA_LUA && !dia ? 1 - t : t;
  const x = mistura(NASCE, POE, avanco);
  /* Meia elipse: alto no meio, baixo nas pontas. */
  const y = mistura(CHAO, TETO, Math.sin(Math.PI * t));
  /* O brilho acompanha a altura — sol rasante é mais fraco, e é o que faz o
     nascer e o pôr parecerem nascer e pôr em vez de aparecer e sumir. */
  const brilho = Math.round(mistura(0.45, 1, Math.sin(Math.PI * t)) * 1000) / 1000;
  return { qual: dia ? 'sol' : 'lua',
           x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, brilho };
}

/* ── À NOITE O CENÁRIO FICA MAIS FORTE ────────────────────────────────────
 *
 * É a metade do pedido que o dono destacou, e a que separa uma noite VIVA de
 * uma tela escura — que é a versão preguiçosa dela.
 *
 * Devolve um MULTIPLICADOR, e o piso é 1: de dia o cenário continua o que era
 * antes deste bloco. A noite acrescenta; ela não tira nada de ninguém. */
export const FORCA_NOITE = 1.85;

export function forcaDoEfeito(agora) {
  const { alfa } = luzEm(agora);
  /* Amarrado na LUZ e não na hora, de propósito: assim ele é contínuo de graça,
     e um ajuste na curva da luz não deixa os dois discordando sobre quando é
     noite. Duas verdades sobre a mesma coisa é o que este projeto persegue. */
  const t = clamp(alfa / 0.62);
  return Math.round(mistura(1, FORCA_NOITE, t) * 1000) / 1000;
}

/* ── AS ESTRELAS ACENDEM, E NÃO APARECEM ──────────────────────────────────
 *
 * Quantas estrelas a cena deve desenhar. Zero de dia — a tela mais clara com
 * estrela em cima é o tipo de erro que nenhum teste pega e todo jogador vê.
 *
 * Elas ACENDEM conforme escurece, pelo mesmo motivo de tudo aqui ser contínuo:
 * cento e vinte estrelas surgindo de uma vez é um corte de cena, e esta tela
 * não tem cortes — ela é olhada de canto de olho por horas. */
export const ESTRELAS_MAX = 120;

export function estrelasEm(agora) {
  const { alfa } = luzEm(agora);
  /* Só começam depois de a cena já ter escurecido um pouco: estrela sobre céu
     alaranjado não existe, e o entardecer é laranja. */
  const t = suave((alfa - 0.18) / (0.62 - 0.18));
  return Math.round(ESTRELAS_MAX * t);
}

/* ══ A SEGUNDA TENTATIVA ══════════════════════════════════════════════════
 *
 * A primeira noite foi REPROVADA olhando, e por dois erros de desenho — os dois
 * meus, e nenhum pego por teste:
 *
 *   1. ESTRELAS NUM MUNDO TOP-DOWN NÃO EXISTEM. Não há céu onde pô-las, e
 *      espalhadas sobre a grama elas liam como poeira.
 *   2. A TINTA COBRIA A LUZ. Ela escurecia tudo, inclusive os vaga-lumes — a
 *      noite apagava justamente o que devia brilhar.
 *
 * As três funções abaixo são as decisões da versão que substituiu aquela. */

/* ── O BRILHO NOTURNO: a luz do cenário atravessando o escuro ─────────────
 *
 * 0 de dia, 1 no meio da noite. É a intensidade da passada que redesenha os
 * halos das partículas luminosas DEPOIS da tinta — e é essa ordem que faz a
 * brasa e o vaga-lume ficarem acesos numa cena escura, em vez de apagados junto.
 *
 * Amarrado na mesma curva do `forcaDoEfeito`, de propósito: os dois não podem
 * discordar sobre quando é noite. */
export function brilhoNoturno(agora) {
  const f = forcaDoEfeito(agora);
  return Math.round(clamp((f - 1) / (FORCA_NOITE - 1)) * 1000) / 1000;
}

/* ── O CÉU DA JANELA ──────────────────────────────────────────────────────
 *
 * O céu mora numa janela no canto do palco, e esta é a cor dele: um gradiente
 * vertical, `topo` e `base`, em [r,g,b].
 *
 * A BASE é a linha do horizonte, e é ela que carrega o nascer e o pôr: no
 * entardecer ela alaranja antes do topo, como o céu de verdade faz — a luz
 * rasante tinge primeiro a faixa de baixo. É o detalhe que faz a janela ser um
 * CÉU e não um quadrado mudando de cor. */
const CEU = {
  noite:  { topo: [8, 10, 34],    base: [26, 30, 72] },
  aurora: { topo: [58, 78, 150],  base: [255, 170, 120] },
  dia:    { topo: [72, 150, 232], base: [170, 220, 255] },
  ocaso:  { topo: [70, 60, 140],  base: [255, 120, 56] },
};
const mistC = (a, b, t) => a.map((c, i) => Math.round(mistura(c, b[i], t)));
const mistCeu = (a, b, t) => ({ topo: mistC(a.topo, b.topo, t), base: mistC(a.base, b.base, t) });

export function ceuEm(agora) {
  const h = horaDecimal(agora);
  if (h < AURORA) return mistCeu(CEU.noite, CEU.noite, 0);
  if (h < MANHA) {
    /* Duas metades: noite -> aurora -> dia. Uma rampa só atravessaria o céu
       direto do azul-escuro ao azul-claro, e o laranja do nascer nunca
       apareceria. */
    const t = (h - AURORA) / (MANHA - AURORA);
    return t < 0.5 ? mistCeu(CEU.noite, CEU.aurora, suave(t * 2))
                   : mistCeu(CEU.aurora, CEU.dia, suave(t * 2 - 1));
  }
  if (h < DOURADA) return mistCeu(CEU.dia, CEU.dia, 0);
  if (h < OCASO)   return mistCeu(CEU.dia, CEU.ocaso, entre(h, DOURADA, OCASO));
  if (h < CERRADO) return mistCeu(CEU.ocaso, CEU.noite, entre(h, OCASO, CERRADO));
  return mistCeu(CEU.noite, CEU.noite, 0);
}

/* ── AS ESTRELAS DA JANELA ────────────────────────────────────────────────
 *
 * A janela é pequena, e cento e vinte estrelas nela seriam uma textura, não
 * um céu. Catorze, acendendo na mesma curva das `estrelasEm`. */
export const ESTRELAS_NA_JANELA = 14;
export const estrelasNaJanela = agora =>
  Math.round(ESTRELAS_NA_JANELA * estrelasEm(agora) / ESTRELAS_MAX);

/* ── A LUZ QUE RESTA — a cena é MULTIPLICADA por ela ──────────────────────
 *
 * Segunda reprovação olhando, e esta não era de desenho: era de COMPOSIÇÃO.
 * A tinta do `luzEm` era pintada por cima em mistura normal, e uma cor escura
 * misturada sobre grama verde vira véu cinza-leitoso. A noite lia como
 * neblina; o ocaso, como barro verde-oliva.
 *
 *   > Luz de verdade não pinta por cima. Ela TIRA do que já existe.
 *
 * Então a cena passa a ser multiplicada pela luz que RESTA: branco é a cena
 * intacta, azul-escuro é o luar, laranja é o sol rasante. Multiplicar mantém o
 * contraste — o caminho continua mais claro que a grama à noite, só que em
 * outra luz — e é essa a diferença entre uma noite e uma tela apagada.
 *
 * `luzEm` continua existindo: ele mede QUANTO escureceu, e é o que o
 * `forcaDoEfeito` e as estrelas leem. Este diz de QUE COR é a luz. */
const LUZ = {
  noite:  [58, 80, 170],     // luar: pouco, e azul
  aurora: [255, 198, 168],
  dia:    [255, 255, 255],   // a cena como foi pintada
  ocaso:  [255, 162, 98],    // o sol rasante da TARDE
};

export function luzRestanteEm(agora) {
  const h = horaDecimal(agora);
  if (h < AURORA) return [...LUZ.noite];
  if (h < MANHA) {
    const t = (h - AURORA) / (MANHA - AURORA);
    return t < 0.5 ? mistC(LUZ.noite, LUZ.aurora, suave(t * 2))
                   : mistC(LUZ.aurora, LUZ.dia, suave(t * 2 - 1));
  }
  if (h < DOURADA) return [...LUZ.dia];
  if (h < OCASO)   return mistC(LUZ.dia, LUZ.ocaso, entre(h, DOURADA, OCASO));
  if (h < CERRADO) return mistC(LUZ.ocaso, LUZ.noite, entre(h, OCASO, CERRADO));
  return [...LUZ.noite];
}
