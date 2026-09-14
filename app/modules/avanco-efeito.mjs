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
     ficam para depois — eles pedem a posição do atacante e a linha entre os
     dois, e a cena do Avanço ainda não a publica. Ver a L-171. */
  return fx?.hit ? { folha: fx.hit, escala: Number(fx.hsc) || 1 } : null;
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
    if (idade >= DURACAO_MS || idade < 0) { vivos.splice(i, 1); continue; }
    const rec = o.rec;
    if (!rec?.ok) continue;

    const lado = rec.side;
    const quadro = Math.floor((idade / 1000) * QUADROS_POR_S) % Math.max(1, rec.n);
    const d = lado * o.escala;
    /* O ESTOURO SOME NO FIM em vez de piscar: cortar no último quadro deixa um
       buraco de um quadro que o olho registra como falha. */
    const k = idade / DURACAO_MS;
    g.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
    const dx = Math.round(o.x - d / 2), dy = Math.round(o.y - d / 2);
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
    g.drawImage(rec.img, quadro * lado, 0, lado, lado, dx, dy, d, d);
    g.globalAlpha = 1;
    vistos++; desenhados++;
  }
  return vistos;
}

/* Some com tudo. Chamado quando a run acaba — um estouro sobrevivendo ao fim da
   wave apareceria sobre a tela de escolha. */
export function limparEstouros() { vivos.length = 0; }

/* Só para o teste e para a esteira: quantos estão no ar agora. */
export const quantosNoAr = () => vivos.length;

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
let agendados = 0, desenhados = 0, fora = 0;
export const contagem = () => ({ agendados, desenhados, fora });
export function zerarContagem() { agendados = 0; desenhados = 0; fora = 0; }
