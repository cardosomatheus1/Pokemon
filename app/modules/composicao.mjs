/* A COMPOSIÇÃO DO BIOMA — onde a paisagem tem LUGARES (bloco 1.15, camada 0).
 *
 * ── O QUE ESTE ARQUIVO EXISTE PARA RESOLVER ───────────────────────────────
 *
 * A L-101 foi aberta olhando a captura de 1920 px que a L-100 destravou, e o
 * diagnóstico dela separava duas coisas que estavam sendo confundidas:
 *
 *     DENSIDADE    quantos vaga-lumes, quantas folhas      — já escala com a área
 *     COMPOSIÇÃO   onde ficam a estrada, a clareira, a mata — não escalava com nada
 *
 * Olhando a foto panorâmica, dois defeitos de LEITURA aparecem, e nenhum dos
 * dois é erro de execução — é a segunda metade do Q5 fazendo o trabalho dela:
 *
 *   1. A TRILHA É UMA RÉGUA. Uma faixa bege perfeitamente reta cruzando 1830 px
 *      de ponta a ponta. Numa cena estreita ela lê como estrada; esticada, lê
 *      como o que ela é — uma linha desenhada com esquadro. Nada na natureza
 *      atravessa 44 tiles sem desviar de nada.
 *
 *   2. O CHÃO É RUÍDO UNIFORME. Os detalhes caem com a mesma probabilidade em
 *      todo tile pisável, então o olho não tem para onde ir: cada pedaço da
 *      tela se parece com todos os outros. O único lugar da foto que prende o
 *      olho é o lago — e ele prende justamente por ser o único LUGAR.
 *
 * ── A DIFERENÇA QUE ESTA VERSÃO TEM (a regra de cópia do CLAUDE.md) ───────
 *
 *     A nossa rota não tem uma estrada: tem uma estrada QUE VAI A ALGUM LUGAR.
 *     Ela curva, e o que fica de um lado da curva não é o que fica do outro.
 *
 * ── POR QUE REGIÕES, E NÃO "MAIS COISAS" ─────────────────────────────────
 *
 * Porque mais coisas já foi tentado e é a resposta errada — a própria L-101
 * antecipa isso: "não é mais coisas — densidade já resolve isso e a resposta
 * seria ruído". Uma região não ACRESCENTA nada. Ela pega a mesma quantidade de
 * detalhe e a distribui de forma desigual, que é o que uma paisagem é.
 *
 *     uma CLAREIRA   é um buraco no ruído — chão aberto, onde o olho descansa
 *     uma MATA       é um nó no ruído     — chão fechado, onde o olho vai
 *
 * Sem os dois, "denso" e "vazio" deixam de existir como palavras: se tudo tem a
 * mesma densidade, a densidade não se vê. É a razão pela qual acrescentar mais
 * folhas nunca resolveu — dobrar um número uniforme devolve outro número
 * uniforme.
 *
 * ── E TUDO AQUI ESCALA COM A LARGURA, NÃO SÓ COM O BIOMA ─────────────────
 *
 * Foi a pergunta que a L-101 deixou em aberto. Um mundo estreito precisa de UMA
 * curva e UMA região; o panorâmico precisa de três de cada, ou o desvio some
 * numa ponta e o resto da tela volta a ser o campo liso de antes.
 *
 * ── ONDE ELE MORA ─────────────────────────────────────────────────────────
 *
 * Camada 0, ao lado do `relevo.mjs`, e pelo mesmo motivo que ele: "clareira" e
 * "mata" são formas de paisagem, não identificadores de franquia. O pack dá a
 * COR e a densidade base; este arquivo dá o RELEVO DA DISTRIBUIÇÃO.
 */

/* A mesma mistura sem estado do resto da cena. Um lugar que se redesenha a cada
   visita não é um lugar — é o argumento que já governa o chão, o relevo e a
   fauna, e ele não muda por a peça ser nova. */
export function mistura(a, b) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 149, 7) >>> 0;

/* ═══ A CURVA DA TRILHA ═══════════════════════════════════════════════════ */

/* Quantos tiles a trilha pode se afastar do eixo dela. Três é medido, não
   escolhido: com dois o desvio some no ruído do chão em zoom 3x, e com quatro
   a trilha encosta na faixa da decoração alta em mundos de 28 linhas. */
export const DESVIO_MAX = 3;

/* Uma curva a cada ~18 colunas. O mundo padrão tem 44 e recebe duas; o dobro
   de largura recebe quatro. Menos que uma e a "curva" vira uma inclinação; mais
   que uma a cada dez e a estrada vira zigue-zague de labirinto. */
export const COLUNAS_POR_CURVA = 18;
export const curvasDe = cols => Math.max(1, Math.round(Math.max(1, cols) / COLUNAS_POR_CURVA));

/* ── POR QUE DUAS ONDAS E NÃO UMA ──────────────────────────────────────────
 *
 * Uma senóide sozinha é periódica, e periódico se percebe: a trilha repetiria
 * exatamente a mesma barriga a cada volta, e o olho pega isso em segundos numa
 * tela que fica aberta por horas. Duas ondas de períodos que não se dividem
 * (uma e ~1,7 delas) só voltam a coincidir muito depois do fim do mapa.
 *
 * É o mesmo truque que a cachoeira já usa para as veias não pulsarem juntas. */
const SEGUNDA_ONDA = 1.7, PESO_SEGUNDA = 0.42;

/* O desvio CONTÍNUO, antes de virar tile. Separado do arredondado de propósito:
   quem desenha a margem da trilha em subpixel precisa da rampa, e quem escolhe
   o tile precisa do degrau. */
export function desvioCru(biomaId, cols, lx) {
  const s = sementeDe(biomaId);
  const n = curvasDe(cols);
  const fase1 = mistura(s, 1) * Math.PI * 2;
  const fase2 = mistura(s, 2) * Math.PI * 2;
  const u = (Number(lx) || 0) / Math.max(1, cols);
  const a = Math.sin(u * Math.PI * 2 * n + fase1);
  const b = Math.sin(u * Math.PI * 2 * n * SEGUNDA_ONDA + fase2);
  return (a + b * PESO_SEGUNDA) / (1 + PESO_SEGUNDA);
}

/* ── A TRILHA PRECISA CONTINUAR SENDO UMA TRILHA ───────────────────────────
 *
 * A faixa tem DUAS linhas de espessura. Um degrau de uma linha entre colunas
 * vizinhas deixa uma linha de sobreposição, e a estrada segue conectada. Um
 * degrau de duas não deixa nenhuma: a trilha parte em dois pedaços que se
 * tocam pela quina, e o personagem anda por cima da grama entre eles.
 *
 * Isso não é conferido depois — é garantido na construção. A onda é calculada
 * livre e depois PASSEADA da esquerda para a direita, com cada coluna podendo
 * andar no máximo uma linha em relação à anterior. Amplitude alta demais vira
 * uma curva mais suave; nunca vira uma trilha partida.
 *
 *     Guarda que se pode desligar é guarda que alguém desliga. Esta não tem
 *     como ser desligada, porque não existe o estado em que ela seria violada.
 */
export function trilhaDe(biomaId, { cols, rows, caminho, margem }) {
  const c = Math.max(1, Math.floor(cols) || 1);
  /* ── QUANDO OS DOIS LIMITES BRIGAM, A ÁGUA GANHA ────────────────────────
     A linha de baixo da trilha é `linha + 1`, e é ela que não pode encostar na
     margem — então o PISO é `margem - 2`, e é uma restrição dura.

     O teto de 2 é só estético (deixa espaço para a decoração alta acima da
     estrada). Escrito como `max(teto, margem - 2)`, o estético vencia o duro
     numa grade pequena: com 5 linhas a margem fica em 3, o piso daria 1, e o
     teto empurrava a trilha para 2 — a segunda linha caía EM CIMA da água.

     Pego pelo teste que varre alturas de 5 a 14, e ele existe porque o mesmo
     tipo de furo já tinha escapado uma vez aqui (o S577, que passou porque na
     única grade usada os dois lados da conta davam o mesmo número). */
  const piso = Math.max(0, (Math.floor(margem) || 0) - 2);
  const teto = Math.min(2, piso);
  const eixo = Math.min(piso, Math.max(teto, Math.floor(caminho) || 0));

  const fora = [];
  let anterior = eixo;
  for (let lx = 0; lx < c; lx++) {
    const alvo = Math.round(eixo + desvioCru(biomaId, c, lx) * DESVIO_MAX);
    const preso = Math.min(piso, Math.max(teto, alvo));
    const passo = Math.max(-1, Math.min(1, preso - anterior));
    anterior += passo;
    fora.push(anterior);
  }
  return fora;
}

/* Onde a trilha está numa coluna. Fora do mapa devolve o eixo — pedir uma
   coluna que não existe é engano de quem chama, e devolver `undefined` faria a
   comparação `ly === trilha` dar falso em silêncio no lugar de gritar. */
export const trilhaEm = (linhas, lx, eixo) => {
  const v = (linhas ?? [])[lx];
  return Number.isInteger(v) ? v : (Math.floor(eixo) || 0);
};

/* Se um tile é chão pisado. As duas linhas, na altura daquela coluna. */
export const naTrilha = (linhas, lx, ly, eixo) => {
  const t = trilhaEm(linhas, lx, eixo);
  return ly === t || ly === t + 1;
};

/* ── ONDE A PEÇA REALMENTE ASSENTA, DEPOIS QUE A TRILHA PASSOU A CURVAR ────
 *
 * A decoração e a fauna escolhem uma FAIXA de linhas a partir do eixo — a
 * grama para em `caminho - 1`, e por isso o `decoracao.mjs` pôde apagar uma
 * guarda antiga dizendo que ela era inalcançável. **Ela era, e deixou de ser.**
 * Com a trilha subindo até três linhas, a faixa da grama passa a se cruzar com
 * o chão pisado, e a peça cairia em cima da estrada.
 *
 * Duas escolhas eram possíveis aqui, e a rejeição é a pior:
 *
 *     REJEITAR   descarta a peça — some silenciosamente, e a beira da estrada
 *                fica mais VAZIA justo onde a curva devia chamar atenção
 *     ASSENTAR   empurra a peça para a beira de cima — a curva passa a ter
 *                acostamento, que é exatamente o que uma estrada de verdade tem
 *
 * A peça de trilha faz o inverso e SEGUE a curva: uma pedra de beira de estrada
 * que ficasse na antiga linha reta apareceria no meio do mato.
 */
export function assentar(planta, onde, lx, ly) {
  const linhas = planta?.trilha;
  const eixo = Math.floor(planta?.caminho) || 0;
  const t = trilhaEm(linhas, lx, eixo);
  if (onde === 'trilha') return t + (ly - eixo >= 1 ? 1 : 0);
  if (onde !== 'grama') return ly;
  if (!naTrilha(linhas, lx, ly, eixo)) return ly;
  return Math.max(1, t - 1);
}

/* ── A ESTRADA É PINTADA COMO CURVA, E NÃO COMO ESCADA ────────────────────
 *
 * A primeira versão desenhou a trilha preenchendo TILES, e a captura mostrou o
 * resultado na hora: uma escada de degraus de 16 px em ângulo reto. Passava em
 * todos os testes — curva, conectada, fora da água — e não parecia uma estrada.
 *
 *     É o "mínimo que funciona" que o CLAUDE.md proíbe em peça visual: a curva
 *     estava CERTA e estava FEIA, e nenhum número ia dizer isso.
 *
 * O engraçado é que a curva contínua já existia: `desvioCru` devolve o desvio
 * em ponto flutuante, e o tile era o arredondamento dela. O desenho estava
 * usando o arredondamento onde podia usar o original.
 *
 * A interpolação sai da LINHA JÁ PASSEADA, e não da onda crua, e isso importa:
 * a linha passeada é a que foi presa pela água e limitada a um degrau por
 * coluna. Interpolar a onda crua faria o desenho e a lógica discordarem
 * justamente na beira do mapa, que é onde a lógica foi corrigida.
 *
 * `smoothstep` e não reta: uma rampa linear troca um ângulo reto por dois
 * ângulos obtusos, e o olho ainda vê os cantos.
 */
export function alturaSuave(linhas, coluna) {
  const n = (linhas ?? []).length;
  if (!n) return 0;
  /* Amostrado no CENTRO da coluna: o valor do tile vale no meio dele, e não na
     quina esquerda. Ancorar na quina desloca a estrada meio tile para a direita
     em relação ao chão pisado que a lógica declarou. */
  const c = Math.min(n - 1, Math.max(0, (Number(coluna) || 0) - 0.5));
  const i = Math.floor(c), f = c - i;
  const a = linhas[i], b = linhas[Math.min(n - 1, i + 1)];
  return a + (b - a) * (f * f * (3 - 2 * f));
}

/* A BEIRA DA ESTRADA NÃO É UMA LINHA — É UMA BEIRA.
 *
 * Uma curva matemática limpa num pixel art de 16 px lê como vetor, e o mundo
 * aqui é GBA. Terra de verdade come a grama de forma irregular, e é o mesmo
 * argumento que já governa a espuma da margem: o traço perfeito é o que denuncia
 * que ninguém desenhou aquilo. Determinístico, semeado pelo bioma. */
export const ESFARELA = 2;
export const esfarelaEm = (biomaId, x, lado) =>
  Math.round((mistura(sementeDe(biomaId) + lado * 7717, x) - 0.5) * 2 * ESFARELA);

/* ═══ AS REGIÕES ══════════════════════════════════════════════════════════ */

/* O peso multiplica a densidade LOCAL de detalhe.
 *
 * A clareira não é 0: chão inteiramente limpo lê como buraco no mapa, e não
 * como clareira. 0,18 deixa uma pontinha de mato, que é o que diz "aqui é
 * aberto" em vez de "aqui falta textura". */
export const PESO_CLAREIRA = 0.18;
export const PESO_MATA = 2.4;
export const PESO_BASE = 1;

/* Uma região a cada ~380 tiles. O mundo padrão (44x28 = 1232) recebe três; um
   panorâmico recebe mais, que é o ponto inteiro desta lacuna. */
export const TILES_POR_REGIAO = 380;
export const REGIOES_MAX = 9;

export function quantasRegioes(cols, rows) {
  const area = Math.max(0, Math.floor(cols) || 0) * Math.max(0, Math.floor(rows) || 0);
  return Math.min(REGIOES_MAX, Math.max(1, Math.round(area / TILES_POR_REGIAO)));
}

/* ── AS REGIÕES SE ALTERNAM, E ISSO É DE PROPÓSITO ─────────────────────────
 *
 * Sorteadas de forma independente, uma semente azarada devolveria três matas e
 * nenhuma clareira — e aí não há contraste, só um mapa mais cheio. Alternar
 * garante que os dois extremos existam sempre que houver mais de uma região.
 *
 * A primeira é sempre CLAREIRA porque é a que mais muda a leitura: um respiro
 * num campo uniforme se nota; mais um nó de mato, não. */
export function regioes(biomaId, { cols, rows, margem }) {
  const s = sementeDe(biomaId) ^ 0x9e37;
  const c = Math.max(1, Math.floor(cols) || 1);
  const teto = Math.max(1, Math.floor(margem) || 1);
  const n = quantasRegioes(c, rows);
  const fora = [];
  for (let i = 0; i < n; i++) {
    const r = j => mistura(s + i * 811, j);
    /* Espalhadas por FAIXAS da largura, e não sorteadas soltas: solto, duas
       delas se sobrepõem e a terceira ponta do mapa fica sem nenhuma. */
    const faixa = c / n;
    fora.push({
      tipo: i % 2 === 0 ? 'clareira' : 'mata',
      cx: (i + 0.15 + r(1) * 0.7) * faixa,
      cy: 1 + r(2) * Math.max(1, teto - 2),
      /* ── O RAIO É MEDIDO, E O NÚMERO TEM DUAS PONTAS ────────────────────
         O raio acompanha a faixa: num mundo largo as regiões são maiores, e não
         apenas mais numerosas — três manchinhas do mesmo tamanho num panorâmico
         seriam três manchinhas num campo liso.

         A primeira tentativa usou `0,30..0,52 x faixa`. Cobria 12% do chão, e o
         teste da desigualdade reprovou com razão 1,13 — praticamente uniforme.
         Medido em cinco pontos, com a razão entre a oitava mais cheia e a mais
         vazia da largura, e a cobertura do mapa:

             0,30..0,52 · 0,62    razão 1,13    cobertura 12%
             0,42..0,68 · 0,80    razão 1,29    cobertura 27%
             0,52..0,82 · 0,95    razão 1,51    cobertura 43%
           > 0,62..0,96 · 1,05    razão 1,80    cobertura 59%   <
             0,75..1,10 · 1,15    razão 2,16    cobertura 74%

         O teto importa tanto quanto o piso, e por um motivo que não é óbvio:
         cobrindo 74% do chão, quase todo tile está dentro de ALGUMA região, e
         a paisagem volta a ser uniforme — por cima, e não por baixo. O ponto
         escolhido deixa 41% de chão comum, que é o que dá às regiões uma borda
         contra a qual se ler. */
      raio: faixa * (0.62 + r(3) * 0.34),
    });
  }
  return fora;
}

/* O peso num ponto. Queda suave até a borda — uma região de borda dura desenha
   um círculo visível no chão, e círculo no chão não é paisagem, é bug. */
export function pesoEm(lista, lx, ly) {
  let peso = PESO_BASE;
  for (const g of lista ?? []) {
    const dx = (lx - g.cx) / Math.max(0.001, g.raio);
    /* 1,05 e nao 0,62: a elipse achatada da primeira tentativa desenhava
       faixas horizontais, e faixa horizontal ja e o que a agua e a trilha sao.
       Uma regiao precisa parecer um LUGAR, e lugar tem as duas dimensoes. */
    const dy = (ly - g.cy) / Math.max(0.001, g.raio * 1.05);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d >= 1) continue;
    /* `1 - d*d` ao quadrado: chega na borda com inclinação zero, então não há
       linha onde o gradiente muda de repente. */
    const f = (1 - d * d) * (1 - d * d);
    const alvo = g.tipo === 'clareira' ? PESO_CLAREIRA : PESO_MATA;
    peso += (alvo - PESO_BASE) * f;
  }
  return Math.max(0, peso);
}

/* ── QUANTOS CANDIDATOS SORTEAR ────────────────────────────────────────────
 *
 * A região REDISTRIBUI o detalhe; ela não o cria nem o destrói. Para isso o
 * sorteio gera candidatos a mais e aceita cada um com probabilidade
 * `peso / PESO_MATA` — assim a mata fica cheia e a clareira vazia sem que o
 * total ande.
 *
 * ── E O FATOR É MEDIDO, PORQUE SUPOR ELE JÁ DEU ERRADO UMA VEZ ────────────
 *
 * A primeira versão usava a constante `SOBRA = PESO_MATA`, com o raciocínio de
 * que "as regiões se alternam, uma puxa para baixo o quanto a outra puxa para
 * cima". O raciocínio está errado, e o teste do total o pegou: com 3 regiões
 * alternando A PARTIR DA CLAREIRA saem DUAS clareiras para UMA mata, e a
 * clareira ainda por cima puxa mais forte (−0,82 contra +1,40 da mata, mas duas
 * vezes). O oásis perdeu 43% do detalhe do chão — e teria perdido em silêncio,
 * porque um bioma menos denso não parece quebrado, só parece pobre.
 *
 *     Constante escolhida por raciocínio é uma medição que ninguém fez.
 *
 * Então mede-se. A média do peso sobre a grade pisável é o número exato que
 * devolve o total ao lugar, e ela continua valendo se alguém mexer no número de
 * regiões, na alternância ou no raio — que é a parte que a constante não fazia.
 *
 * O passo de 2 é amostragem, e é seguro aqui: as regiões são elipses de raio
 * maior que 4 tiles, então nenhuma cabe entre duas amostras. */
export const PASSO_AMOSTRA = 2;

export function mediaDoPeso(lista, { cols, margem }) {
  const c = Math.max(1, Math.floor(cols) || 1);
  const m = Math.max(1, Math.floor(margem) || 1);
  if (!(lista ?? []).length) return PESO_BASE;
  let soma = 0, n = 0;
  for (let lx = 0; lx < c; lx += PASSO_AMOSTRA)
    for (let ly = 0; ly < m; ly += PASSO_AMOSTRA) {
      /* APARADO, e não cru. `aceita` satura em 1 — duas matas sobrepostas dão
         peso 3,8 e continuam aceitando 100%, não 158%. Medir o peso cru inflava
         a média, o fator encolhia, e o chão saía mais pobre do que o pedido: era
         a segunda vez neste mesmo bloco que a conta media uma coisa e o sorteio
         usava outra.

             Medir o que não é usado é não medir. */
      soma += Math.min(PESO_MATA, pesoEm(lista, lx, ly));
      n++;
    }
  return n ? soma / n : PESO_BASE;
}

/* `media = 1` reduz ao fator antigo, que é o caso em que ele estava certo. */
export const SOBRA = PESO_MATA;
export const quantosCandidatos = (quantos, media = PESO_BASE) =>
  Math.round(Math.max(0, quantos) * SOBRA / Math.max(0.05, media));
export const aceita = (peso, sorteio) => sorteio < Math.min(1, peso / PESO_MATA);
