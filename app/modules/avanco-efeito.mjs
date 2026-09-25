/* O EFEITO DO GOLPE, DESENHADO SOBRE O ALVO (camada 4) — a L-171.
 *
 * ── O QUE O DONO VIU, E ELE MANDOU TRÊS CAPTURAS ─────────────────────────
 *
 *   > "olha a diferença das sprites de ataque da arena. Eu quero que seja assim"
 *
 * Nas capturas da Arena o golpe tem DUAS metades, e o Avanço só tinha uma:
 *
 *     o QUE BATE     a folha de ataque do atacante      — o A4g trouxe
 *     o QUE ACERTA   o EFEITO desenhado SOBRE o alvo    — nunca existiu aqui
 *                    os anéis do Surf, o estouro de fogo, a estrela do impacto
 *
 * Sem a segunda, o golpe acontece e nada toca o alvo: o balão diz o nome, o
 * número sobe, e a distância entre os dois sprites fica vazia. É por isso que o
 * combate "não se vê" com tudo funcionando — a mesma classe do D-083, onde o
 * número existia e não chegava aos olhos.
 *
 * ── A REGRA DE CÓPIA SE APLICA AO CONTRÁRIO ──────────────────────────────
 *
 * A Arena é NOSSA. Trazer dela não é copiar de fora: é parar de manter duas
 * linguagens visuais para a mesma coisa. E o que se traz é a TÉCNICA, e não as
 * constantes — foi assim que o sprite do mob se consertou no bloco passado, e
 * é a lição que o dono escreveu em letras maiúsculas:
 *
 *   > "na arena SAEM TODOS OS SPRITES, É SÓ VOCÊ COPIAR E TRAZER PRA CÁ"
 *
 * O `fxSheet` e o `MOVE_FX` já eram exportados pelo `efeitos.mjs`. Eles nunca
 * tinham sido chamados daqui — o trabalho era ligar, e não construir.
 *
 * ── E ELE DESENHA NO CANVAS DO MUNDO, E NÃO NO DA ARENA ─────────────────
 *
 * A Arena tem uma camada `fx` própria, em coordenadas de palco. Aqui o alvo é
 * o MESMO canvas em que o cenário do bioma é pintado, em coordenadas de tela já
 * convertidas. A técnica é a mesma `drawImage` recortando a folha; o que muda é
 * onde ela cai.
 *
 * ── O QUE ESTE ARQUIVO NÃO FAZ ──────────────────────────────────────────
 *
 * Ele não decide que houve golpe, nem quanto doeu, nem quem caiu. Recebe "um
 * golpe chamado X acertou este ponto, neste instante" e encena. É a mesma linha
 * que o resto da cena respeita desde o A4b.
 */
/* ── DUAS IMPORTAÇÕES, E A DIVISÃO ENTRE ELAS É O TESTE ──────────────────
 *
 * `MOVE_FX` mora no `efeitos-dados.mjs`, que é DADO e não toca o DOM.
 * `fxSheet` mora no `efeitos.mjs`, que carrega imagem e precisa de navegador.
 *
 * A primeira versão pegava as duas do `efeitos.mjs`, e o teste morreu com
 * "document is not defined" — sexta vez neste bloco que a mesma lição aparece:
 * conta que só roda com navegador é conta que ninguém verifica.
 *
 * Separadas, a ESCOLHA da folha é afirmável sem navegador, e o CARREGAMENTO
 * dela — que é o pedaço que de fato precisa de um — fica isolado atrás de uma
 * função só. */
import { MOVE_FX } from './efeitos-dados.mjs';

/* Quanto dura o estouro no alvo. Meio segundo: o bastante para o olho pegar, e
   pouco o bastante para dois golpes seguidos não virarem um borrão só — que é
   a queixa que o dono já fez sobre os balões ("olha que poluição visual"). */
export const DURACAO_MS = 500;

/* Quantos quadros por segundo a folha corre. Dezoito é o número da Arena, e ele
   vem de lá inteiro: o mesmo estouro tem de ter o mesmo ritmo nos dois lugares,
   senão o jogador aprende dois gestos para a mesma coisa. */
const QUADROS_POR_S = 18;

/* ── QUAL FOLHA AQUELE GOLPE USA ──────────────────────────────────────────
 *
 * `null` quando o golpe não tem efeito declarado — e a ausência é comum, não é
 * erro: o `MOVE_FX` cobre os golpes que valem a pena encenar, e o resto sai só
 * com o balão. Inventar um estouro genérico seria pior: o jogador aprenderia
 * que aquele brilho não quer dizer nada. */
export function folhaDoImpacto(nome) {
  const fx = MOVE_FX[nome];
  /* O `hit` é a metade que o dono cobrou: o que ACERTA. O `cast` e o `proj`
     são a `encenacao` logo abaixo (ST-5.5). */
  return fx?.hit ? { folha: fx.hit, escala: Number(fx.hsc) || 1 } : null;
}

/* ── A CARGA E O PROJÉTIL (ST-5.5, L-171) ─────────────────────────────────
 *
 * A outra metade do golpe da Arena: `cast` acende no atacante antes de o golpe
 * sair, `proj` VIAJA do atacante até o alvo. Ficaram de fora em 10/09 porque
 * pediam o PAR — de onde sai e onde chega —, e a cena não o publicava. Agora
 * publica.
 *
 * ── E O TEMPO CORRE AO CONTRÁRIO DO DA ARENA ─────────────────────────────
 *
 * Lá o golpe é lançado e o dano cai quando o projétil chega. Aqui o motor já
 * decidiu QUANDO o dano cai — o número sobe naquele instante —, então o
 * projétil tem de sair cedo o bastante para chegar nele. É por isso que o
 * motor publica os golpes `aCaminho`, e que esta conta devolve a ANTECEDÊNCIA.
 *
 * Os números são os da Arena, inteiros, pelo mesmo motivo dos 18 quadros: o
 * mesmo golpe com dois ritmos ensinaria dois gestos para a mesma coisa. */
export const CARGA_MS = 380;
const VIAGEM_MIN_MS = 160, VIAGEM_MAX_MS = 500, PX_POR_S = 420;
/* O ARCO leve da Arena para o que é arremessado. */
const ARCO = 16;

export function encenacao(nome, dist) {
  const fx = MOVE_FX[nome] ?? null;
  if (!fx || (!fx.cast && !fx.proj)) return null;
  const carga = fx.cast ? { folha: fx.cast, escala: Number(fx.csc) || 1 } : null;
  const projetil = fx.proj ? { folha: fx.proj, escala: Number(fx.sc) || 1, giro: !!fx.spin } : null;
  const viagemMs = projetil
    ? Math.round(Math.max(VIAGEM_MIN_MS, Math.min(VIAGEM_MAX_MS, (Number(dist) || 0) / PX_POR_S * 1000)))
    : 0;
  return { carga, projetil, cargaMs: carga ? CARGA_MS : 0, viagemMs };
}

/* Quanto antes do impacto o lançamento começa. */
export const antecedencia = enc => (enc?.cargaMs || 0) + (enc?.viagemMs || 0);

/* ONDE O PROJÉTIL ESTÁ na fração `k` da viagem: reta do atacante ao alvo, com
   o arco da Arena. Grampeado em [0, 1]: nunca atrás de quem lançou, nunca além
   de quem levou. */
export function trajetoria({ x0, y0, x1, y1, arco = 0 }, k) {
  const q = Math.max(0, Math.min(1, Number(k) || 0));
  return { x: x0 + (x1 - x0) * q, y: y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * arco };
}

/* A LINHA DA FOLHA `.Dir8`: a mesma conta do `dirOf` da Arena (0 de frente,
   para baixo, girando baixo → direita → cima → esquerda). Repetida e não
   importada porque o `sprites.mjs` puxa o DOM, e este módulo é afirmado em
   Node — o teste fixa a convenção nos quatro pontos cardeais. */
export function direcao8(dx, dy) {
  const graus = Math.atan2(dy, dx) * 180 / Math.PI;
  return ((Math.round((90 - graus) / 45) % 8) + 8) % 8;
}

/* ── LANÇA: agenda a carga e o projétil para chegarem em `acertaEm` ───────
   `de` e `para` são pontos do MUNDO, e a câmera converte aqui — a lição do
   D-092: o espaço da posição e o do desenho decididos no mesmo arquivo. Um
   golpe sem `cast` nem `proj` devolve null: o impacto continua sendo o
   `estourar`, e ele já acontece no instante do dano. */
export function lancar(nome, de, para, cam, chave, acertaEm) {
  if (jaEstourou.has(chave) || !carregador) return null;
  const a = noCanvas(de?.x, de?.y, cam), b = noCanvas(para?.x, para?.y, cam);
  const enc = encenacao(nome, Math.hypot(b.x - a.x, b.y - a.y));
  if (!enc) return null;
  jaEstourou.add(chave);
  if (jaEstourou.size > 500) jaEstourou.clear();
  const fim = Number(acertaEm) || 0;
  const dir = direcao8(b.x - a.x, b.y - a.y);
  const feito = {};
  if (enc.carga) {
    feito.carga = { tipo: 'carga', rec: carregador(enc.carga.folha), escala: enc.carga.escala,
                    x: a.x, y: a.y, dir, em: fim - antecedencia(enc), dur: enc.cargaMs };
    vivos.push(feito.carga);
    cargas++;
  }
  if (enc.projetil) {
    feito.projetil = { tipo: 'projetil', rec: carregador(enc.projetil.folha),
                       escala: enc.projetil.escala, giro: enc.projetil.giro,
                       x0: a.x, y0: a.y, x1: b.x, y1: b.y, arco: ARCO, dir,
                       em: fim - enc.viagemMs, dur: enc.viagemMs };
    vivos.push(feito.projetil);
    projeteis++;
  }
  return feito;
}

/* Os estouros vivos. Lista curta por construção — cada um vive meio segundo, e
   um duelo tem alguns golpes por segundo no pior caso. */
const vivos = [];

/* ── AGENDA UM ESTOURO NO ALVO ────────────────────────────────────────────
 *
 * `chave` é o mesmo par (wave, golpe, instante) que o número do dano usa, e
 * pelo mesmo motivo: repintar o quadro sessenta vezes por segundo não pode
 * criar sessenta estouros. */
const jaEstourou = new Set();

/* ── QUEM CARREGA A FOLHA ENTRA POR FORA ─────────────────────────────────
 *
 * O padrão é o `fxSheet` da Arena — a MESMA função, e não uma cópia: duas
 * maneiras de recortar a mesma folha divergem no dia em que alguém arrumar uma.
 *
 * Ele é injetado porque carregar imagem precisa de navegador, e a ESCOLHA da
 * folha não. Sem a costura, o módulo inteiro só poderia ser afirmado com
 * Chromium — e o portão Q2 já cobrou o preço disso cinco vezes neste bloco. */
let carregador = null;
export function usarCarregador(f) { carregador = f; }

/* ── AS DUAS COORDENADAS, E POR QUE ELAS TÊM DE MORAR NO MESMO LUGAR ─────
 *
 * A cena do idle desenha em DOIS espaços ao mesmo tempo, e eles não são o
 * mesmo número:
 *
 *     o CANVAS   `W x H` pixels de mundo, esticados pelo CSS. Quem desenha
 *                nele escreve `x - cam.x`, sem escala nenhuma
 *     o HTML     as molduras vivas são elementos de verdade, em pixels de
 *                TELA — e lá o mesmo ponto é `(x - cam.x) * escala`
 *
 * O estouro nascia com a conta do HTML e era pintado no CANVAS. Com o zoom em
 * 2x — que é o das capturas do dono — cada estouro caía ao DOBRO da distância
 * da borda da câmera: longe do alvo quando ainda cabia na tela, e fora dela na
 * maior parte das vezes.
 *
 *   > E os contadores diziam 413 desenhados. Eles estavam certos: a função
 *   > rodou 413 vezes. Contador conta chamada; ele não olha para a tela.
 *
 * A correção não é multiplicar aqui: é este módulo passar a RECEBER o ponto do
 * MUNDO e a câmera, e fazer a conversão sozinho. Assim o espaço da posição e o
 * espaço do desenho são decididos no mesmo arquivo, e não têm como discordar —
 * que era a única forma de o defeito existir.
 */
export const noCanvas = (x, y, cam) => ({
  x: (Number(x) || 0) - (Number(cam?.x) || 0),
  y: (Number(y) || 0) - (Number(cam?.y) || 0),
});

export function estourar(nome, mundoX, mundoY, cam, chave, agora) {
  if (jaEstourou.has(chave)) return null;
  const alvo = folhaDoImpacto(nome);
  if (!alvo || !carregador) return null;
  jaEstourou.add(chave);
  /* O conjunto não cresce para sempre numa aba aberta por horas — mesmo teto e
     mesmo motivo do `jaFlutuou`. */
  if (jaEstourou.size > 500) jaEstourou.clear();

  const ponto = noCanvas(mundoX, mundoY, cam);
  const o = { rec: carregador(alvo.folha), escala: alvo.escala,
              x: ponto.x, y: ponto.y, em: Number(agora) || 0 };
  vivos.push(o);
  agendados++;
  return o;
}

/* ── DESENHA OS QUE ESTÃO NO AR ───────────────────────────────────────────
 *
 * `g` é o contexto do canvas do MUNDO, e as coordenadas já vêm em tela. A folha
 * é recortada como na Arena: quadros quadrados, lado = altura / linhas.
 *
 * Uma folha que ainda não carregou é PULADA, e não esperada: esperar foi o
 * defeito que fez o mob sumir no meio do golpe (o `<img>` remedido do A4g). */
export function desenharEstouros(g, agora) {
  if (!g) return 0;
  let vistos = 0;
  for (let i = vivos.length - 1; i >= 0; i--) {
    const o = vivos[i];
    const idade = (Number(agora) || 0) - o.em;
    const dur = o.dur ?? DURACAO_MS;
    if (idade >= dur) { vivos.splice(i, 1); continue; }
    /* AINDA NÃO SAIU (ST-5.5): a carga e o projétil são agendados para o
       futuro, e esperar é o caso normal. Descartar aqui apagaria todo
       lançamento antes do primeiro quadro. O teto de 2 s é para um relógio que
       voltou, e não para a espera. */
    if (idade < 0) { if (idade < -2000) vivos.splice(i, 1); continue; }
    const rec = o.rec;
    if (!rec?.ok) continue;

    const lado = rec.side;
    const k = idade / dur;
    /* O PROJÉTIL corre os quadros (ou gira, como na Arena) e anda pela
       trajetória; a carga e o estouro ficam parados no ponto deles. */
    const quadro = Math.floor((idade / 1000) * (o.giro ? 24 : QUADROS_POR_S)) % Math.max(1, rec.n);
    const linha = (o.dir || 0) % Math.max(1, rec.rows || 1);
    const d = lado * o.escala;
    const onde = o.tipo === 'projetil' ? trajetoria(o, k) : o;
    /* O ESTOURO SOME NO FIM em vez de piscar: cortar no último quadro deixa um
       buraco de um quadro que o olho registra como falha. O projétil não
       some — ele CHEGA, e quem some é o estouro que nasce no lugar dele. */
    g.globalAlpha = o.tipo !== 'projetil' && k > 0.75 ? (1 - k) * 4 : 1;
    const dx = Math.round(onde.x - d / 2), dy = Math.round(onde.y - d / 2);
    /* ── E ELE CAIU DENTRO DA TELA? (D-092) ────────────────────────────
     *
     * Esta é a pergunta que faltava, e a falta dela custou três dias. O bloco
     * anterior fechou dizendo "14 agendados, 413 desenhos" e a tela continuava
     * sem efeito nenhum: os dois números estavam certos, e nenhum dos dois
     * olhava para onde o desenho caiu.
     *
     *   > Contador conta CHAMADA. Um estouro pintado a mil pixels da borda foi
     *   > desenhado — e não foi visto.
     *
     * O canvas sabe o próprio tamanho; a conta é uma interseção de retângulos.
     * Agora "desenhados" e "fora" saem lado a lado, e a diferença entre eles é
     * a única forma de o efeito existir e não chegar aos olhos. */
    const cw = g.canvas?.width ?? 0, ch = g.canvas?.height ?? 0;
    if (cw && ch && (dx + d <= 0 || dy + d <= 0 || dx >= cw || dy >= ch)) fora++;
    g.drawImage(rec.img, quadro * lado, linha * lado, lado, lado, dx, dy, d, d);
    g.globalAlpha = 1;
    vistos++; desenhados++;
  }
  return vistos;
}

/* Some com tudo. Chamado quando a run acaba — um estouro sobrevivendo ao fim da
   wave apareceria sobre a tela de escolha. */
export function limparEstouros() { vivos.length = 0; }

/* Só para o teste e para a esteira: quantos estão no ar agora — incluindo a
   carga e o projétil AGENDADOS, que ainda não saíram. */
export const quantosNoAr = () => vivos.length;

/* E quantos estão SENDO DESENHADOS neste instante, por tipo (ST-5.5). É a
   pergunta da foto: um projétil agendado para daqui a meio segundo está "no
   ar" para a lista e ainda não está na tela. */
export function noInstante(agora) {
  const n = { estouro: 0, carga: 0, projetil: 0 };
  for (const o of vivos) {
    const idade = (Number(agora) || 0) - o.em;
    if (idade >= 0 && idade < (o.dur ?? DURACAO_MS)) n[o.tipo ?? 'estouro']++;
  }
  return n;
}

/* ── E QUANTOS JÁ NASCERAM E JÁ FORAM DESENHADOS ─────────────────────────
 *
 * O estouro vive meio segundo, então perguntar "quantos estão no ar" num
 * instante qualquer responde ZERO quase sempre — e zero parece ausência.
 *
 *   > É a mesma armadilha do número do dano: a sonda perguntou no instante
 *   > errado e reportou que nada existia, sobre uma tela cheia.
 *
 * Estes dois contadores são a resposta certa: quantos foram AGENDADOS e
 * quantos chegaram a ser DESENHADOS. A diferença entre eles é folha que não
 * carregou — que é o único jeito de o efeito existir e não chegar aos olhos. */
let agendados = 0, desenhados = 0, fora = 0, cargas = 0, projeteis = 0;
export const contagem = () => ({ agendados, desenhados, fora, cargas, projeteis });
export function zerarContagem() { agendados = 0; desenhados = 0; fora = 0; cargas = 0; projeteis = 0; }
