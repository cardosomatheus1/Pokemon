/* O MUNDO VIVO DO IDLE — a câmera, o zoom, e quem anda dentro dele.
 *
 * Camada 4. Separado do idle-tela.mjs no 1.5c, e não por tamanho: são duas
 * responsabilidades diferentes que só por acaso moravam no mesmo arquivo.
 *
 *     idle-tela.mjs   os PAINÉIS — bioma, perfil, equipe, campo, bolsa. Tudo
 *                     que é HTML, formulário e decisão do jogador.
 *     idle-mundo.mjs  a CENA — o chão pintado, a câmera, o zoom, o treinador e
 *                     o Pokémon andando. Tudo que é canvas e quadro por segundo.
 *
 * A prova de que a divisão é por responsabilidade e não por linha: este arquivo
 * roda um requestAnimationFrame perpétuo e o outro não roda nenhum; este
 * conhece pixel e o outro conhece markup. Juntá-los de volta significaria um
 * arquivo que repinta a 60 Hz E monta formulário, e foi assim que ele passou
 * de 600 linhas sem ninguém decidir isso.
 *
 * A DECISÃO DO PASSEIO NÃO MORA AQUI. Ela mora em vida.mjs, que é camada 0 e
 * roda em Node — é o que permite afirmar que o boneco nunca entra na água sem
 * abrir navegador. Aqui só se desenha o que aquele módulo respondeu.
 */
import { $ } from './dom.mjs';
import { plantaDo, pintar, T } from './mundo.mjs';
import { bloqueios as bloqueiosDo, veiaEm } from './relevo.mjs';
import { bloqueiosDecor } from './decoracao.mjs';
import { PACK, nomeExibido } from './motor.mjs';

import { folhaVestida, porId, carregar as carregarGuardaRoupa } from './outfit-acervo.mjs';
import { areaAndavel, areaDaLuta, passeio, companheiro, quadroDe, camera } from './vida.mjs';
/* O TRECHO DA WAVE (L-164): a jornada progressiva. Ver o cabeçalho de lá. */
import { trechoDaWave, focoDaCamera, aproximarFoco } from './avanco-geometria.mjs';
import { WAVES } from '../../engine/wave.mjs';
/* OS MOBS DA WAVE (A4b). Entram no MESMO laço, e não num próprio: dois laços
   desenhando no mesmo canvas seriam duas mãos no mesmo papel — a ordem entre
   eles mudaria a cada quadro, e neste mundo a ordem É a profundidade. */
import { desenharMobs, cenaDaVez, posicaoDoMeu } from './avanco-cena.mjs';
import { relogioDoPasseio } from './avanco-geometria.mjs';
/* Quem é o bicho e qual foi o golpe é TEMA, e por isso mora fora da cena e
   fora do motor — ver o cabeçalho do `avanco-tema.mjs`. */
import { nomeDoDex, golpeDoDex } from './avanco-tema.mjs';
import { vidaDe, semear, mover, opacidade, mistura } from './particulas.mjs';
import { vivos } from './vivos.mjs';
import { desenharCompanheiro, acompanhar as acompanharBicho,
         quemAcompanha } from './idle-companheiro.mjs';
import { prepararHabitantes, desenharHabitantes, desenharSono } from './idle-habitantes.mjs';
import { janela, niveis, nivelMaisProximo, rotuloZoom, zoomDaRun } from './viewport.mjs';
import { prepararNpcs, desenharNpcs } from './idle-npc.mjs';

/* Quem é o bioma e quem é o companheiro vem de FORA: este módulo desenha, não
   escolhe. O idle-tela.mjs avisa quando o jogador muda um dos dois. */
let biomaEscolhido = null;

export function mostrarBioma(id) { biomaEscolhido = id; ligarZoom(); desenharMundo(); }
export const acompanhar = acompanharBicho;

/* ══ A CÂMERA ══════════════════════════════════════════════════════════════
 *
 * O mundo tem 704×448 e a tela mostra um pedaço. Foi a mudança que o dono
 * pediu — "a tela da rota precisa ser maior pra melhor visualização", "quero a
 * câmera mais afastada de cima, overworld estilo GBA mesmo, porém não precisa
 * ser tão pequeno" — e a única forma de atender às duas metades ao mesmo tempo.
 *
 * Com o mundo inteiro na tela, afastar a câmera encolhe o boneco: era o que
 * fazia o "pixel do boneco ficar MUITO pequeno" que ele reprovou antes. Com o
 * mundo MAIOR que a tela, afastar mostra mais mundo e o boneco continua do
 * mesmo tamanho de pixel. É a diferença entre reduzir a imagem e recuar a
 * câmera, e só a segunda é o que ele descreveu.
 *
 * O ZOOM É DO JOGADOR, e não meu. Ele levantou a possibilidade e ela é boa:
 * cada um lê a cena numa distância. Roda do mouse aproxima e afasta; os botões
 * fazem o mesmo para quem está no toque. */
/* 1x entra a pedido do dono: no 2x ele ainda achava a camera perto demais.
   Em 1x o mundo inteiro de 704x448 cabe numa coluna larga, e o boneco fica do
   tamanho de um sprite de cartucho — que e exatamente o overworld que ele
   descreveu. */
/* A LISTA NAO E MAIS FIXA — ela sai do piso, em `viewport.mjs`. Fixa, ela
   oferecia niveis que o piso engolia em silencio: o dono viu "o zoom do 1x e
   2x nao mudam", e ele estava certo. Ver `niveis()`. */
let niveisAtuais = [1, 2, 3, 4, 5];
/* O zoom que a tela USA agora — o escolhido, ou o da run estreita (DEC-15). */
let zoomEfetivo = 1;
/* O foco da câmera, suavizado entre quadros (L-187). */
let focoCam = null, tFoco = null;
const CHAVE_ZOOM = 'pa.idle.zoom';
let zoom = 3;
try {
  const z = Number(localStorage.getItem(CHAVE_ZOOM));
  if (z > 0 && Number.isFinite(z)) zoom = z;
} catch { /* modo privado: fica no padrão */ }

/* O MUNDO INTEIRO, pintado UMA VEZ por bioma, fora da tela. Repintá-lo a cada
   quadro custaria 1.232 tiles por quadro para desenhar uma janela de 300 —
   e o chão não muda. */
let mundoCheio = null;
let bloqueiosAtuais = [];

function desenharMundo() {
  const cv = $('#idleMundo');
  if (!cv || !biomaEscolhido) return;
  const planta = plantaDo(PACK, biomaEscolhido, {});
  mundoCheio = document.createElement('canvas');
  mundoCheio.width = planta.cols * T;
  mundoCheio.height = planta.rows * T;
  pintar(mundoCheio.getContext('2d'), planta);
  const rot = $('#idleBiomaNome');
  if (rot) rot.textContent = planta.rotulo;
  plantaAtual = planta;
  prepararVida(planta);
  prepararHabitantes(planta);
  prepararNpcs(planta);
  /* O LAGO E AS PECAS GRANDES. O dono viu o personagem atravessando a
     decoracao: *"passam pelo meio das coisas, como se fossem fantasmas"*. Peca
     que se atravessa deixa de ser objeto e vira textura pintada — a mesma
     leitura que o lago tinha antes de bloquear. As pequenas seguem livres:
     desviar de uma folha e mais feio que atravessa-la. */
  bloqueiosAtuais = [...bloqueiosDo(planta, T), ...bloqueiosDecor(planta, T)];
  ajustarViewport();
  if (!quadroAtor) quadroAtor = requestAnimationFrame(laçoDoAtor);
  return planta;
}

/* ── QUANTOS PIXELS DE MUNDO CABEM NA TELA ────────────────────────────────
 *
 * As duas medidas saem da CAIXA REAL do palco, e não de uma proporção inventada.
 *
 * A versão anterior calculava a altura como `largura × 0,58`. O número não vinha
 * de lugar nenhum: o mundo é 704×448, proporção 1,57, e 0,58 dá 1,72 — uma
 * janela mais larga e mais baixa do que o lugar que ela mostra. O pixel
 * continuava quadrado, e mesmo assim o olho lia como esticado, porque o que
 * estica não é o pixel: é a FATIA de mundo que sobra na tela.
 *
 *   "essa pégada mesmo de agora ficou muito esticadona"  — o dono
 *
 * Lendo a altura da caixa, a proporção passa a ser a que está na tela — a
 * padrão vem do CSS (a do mundo) e a escolhida vem da alça que o jogador
 * arrasta. Nos dois casos ninguém precisa adivinhar nada. */
function ajustarViewport() {
  const palco = $('#idlePalco'), mundo = $('#idleMundo'), ator = $('#idleAtor');
  if (!palco || !mundo || !plantaAtual) return;
  const r = palco.getBoundingClientRect();
  const cx = r.width || 900, cy = r.height || 520;
  const mundoW = plantaAtual.cols * T, mundoH = plantaAtual.rows * T;

  /* A CONTA MORA EM `viewport.mjs`, camada 0 — e por que ela saiu daqui esta
     escrito la: cercada de getBoundingClientRect e canvas.width, ela nao tinha
     como ser afirmada sem subir navegador, e o defeito S616 (que apaga o piso
     do zoom) passou pela suite inteira. O piso e o que impede a cena esticada
     que o dono viu. */
  const j = janela({ cx, cy, mundoW, mundoH, zoom });
  /* A LISTA E RECALCULADA A CADA AJUSTE porque o piso muda quando o jogador
     arrasta a alca ou vira o celular. Sem isso, encolher a cena deixaria
     niveis mortos na lista de novo. */
  niveisAtuais = niveis(j.piso);
  const encaixado = nivelMaisProximo(niveisAtuais, zoom);
  if (encaixado !== zoom) { zoom = encaixado; }
  /* DEC-15: com a RUN na tela, a câmera se afasta até a luta caber — o `zoom`
     do jogador não é tocado, e volta sozinho quando a run acaba. */
  const pedido = cenaDaVez() ? zoomDaRun(zoom, cx) : zoom;
  const jj = janela({ cx, cy, mundoW, mundoH, zoom: pedido });
  zoomEfetivo = jj.usar;
  const { w: W, h: H } = jj;
  pintarZoom();
  if (mundo.width !== W || mundo.height !== H) {
    mundo.width = W; mundo.height = H;
    ator.width = W; ator.height = H;
  }
}

/* ── A ALTURA É DO JOGADOR ────────────────────────────────────────────────
 *
 * Pedido dele: *"será regulado e extendido ao gosto do player, na barra do canto
 * inferior [...] similar a barra de arrastar do log de batalha"*.
 *
 * O log usa `resize` do CSS, e este usa o mesmo — de propósito. É um gesto só
 * para o jogador aprender, e o navegador desenha e trata a alça melhor do que
 * qualquer coisa que eu escrevesse com `pointermove`.
 *
 * O QUE PRECISA DE CÓDIGO É SOBREVIVER À RESOLUÇÃO. Uma altura em pixel guardada
 * num monitor de 1440 vira metade da tela num notebook de 768, e o dono pediu
 * "muito bem feito e testado para ir se ajustando a resolução". Então o que se
 * guarda não é a altura: é a FRAÇÃO da janela que ela ocupava. Ao voltar, a
 * fração é remontada na janela de agora. */
const CHAVE_ALTURA = 'pa.idle.altura';

function guardarAltura() {
  const palco = $('#idlePalco');
  if (!palco) return;
  const h = palco.getBoundingClientRect().height;
  if (!h) return;
  try { localStorage.setItem(CHAVE_ALTURA, (h / innerHeight).toFixed(4)); } catch { /* privado */ }
}

function restaurarAltura() {
  const palco = $('#idlePalco');
  if (!palco) return;
  let fr = 0;
  try { fr = Number(localStorage.getItem(CHAVE_ALTURA)) || 0; } catch { /* privado */ }
  /* Fora de [0,25 · 0,92] a cena ou some ou empurra os controles para fora da
     dobra. O limite existe para o jogador não conseguir se trancar numa tela
     inútil — e para uma fração guardada num monitor esquisito não estragar a
     primeira abertura noutro. */
  if (fr < 0.25 || fr > 0.92) return;
  palco.style.height = Math.round(fr * innerHeight) + 'px';
  ajustarViewport();
}

/* A RODA DO MOUSE, ligada uma vez só.
 *
 * `passive: false` porque o gesto precisa de `preventDefault`: sem isso a roda
 * aproxima a câmera E rola a página junto, e o jogador perde a cena que estava
 * tentando ver. É o único lugar da aba que cancela um gesto do navegador, e a
 * troca é justa — a roda sobre o palco só pode significar zoom. */
let zoomLigado = false;
function ligarZoom() {
  if (zoomLigado) return;
  const palco = $('#idlePalco');
  if (!palco) return;
  palco.addEventListener('wheel', ev => {
    ev.preventDefault();
    trocarZoom(ev.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  /* redimensionar a janela muda quantos pixels de mundo cabem, e sem isto o
     canvas fica com a contagem da largura antiga — o mundo sai esticado */
  addEventListener('resize', () => { ajustarViewport(); });
  /* A ALÇA não dispara evento nenhum: `resize` de CSS muda a caixa em silêncio.
     Um ResizeObserver é o único jeito de saber, e é ele que mantém o canvas
     casado com a caixa enquanto o jogador arrasta. */
  new ResizeObserver(() => { ajustarViewport(); guardarAltura(); }).observe(palco);
  restaurarAltura();
  zoomLigado = true;
}

export function trocarZoom(passo) {
  const i = niveisAtuais.indexOf(nivelMaisProximo(niveisAtuais, zoom));
  const novo = niveisAtuais[Math.min(niveisAtuais.length - 1, Math.max(0, i + passo))];
  if (novo === zoom) return zoom;
  zoom = novo;
  try { localStorage.setItem(CHAVE_ZOOM, String(zoom)); } catch { /* privado */ }
  ajustarViewport();
  return zoom;
}

/* O ROTULO MOSTRA O NUMERO EFETIVO, e nao o que foi pedido. Um "1x" que
   renderiza 2,00x e mentira pequena, e mentira pequena em controle e a que
   mais irrita: o jogador clica, nada muda, e o jogo e que parece quebrado. */
function pintarZoom() {
  const rot = $('#idleZoomNivel');
  /* O rótulo diz o número que a tela USA — na run estreita ele é menor que o
     escolhido (DEC-15), e um "3×" desenhando 1,5× é a mentira pequena. */
  if (rot) rot.textContent = rotuloZoom(zoomEfetivo);
  const menos = $('#idleZoom [data-zoom="-1"]'), mais = $('#idleZoom [data-zoom="1"]');
  /* O botao que nao tem para onde ir fica DESLIGADO em vez de nao fazer nada.
     Botao que aceita clique e ignora e a mesma mentira, um nivel abaixo. */
  if (menos) menos.disabled = zoom <= niveisAtuais[0] + 1e-9;
  if (mais) mais.disabled = zoom >= niveisAtuais[niveisAtuais.length - 1] - 1e-9;
}


/* ══ O ATOR ════════════════════════════════════════════════════════════════
 *
 * Um treinador andando pela trilha. Não é enfeite: um mundo vazio é um mapa, e
 * mapa não dá vontade de mandar ninguém para lá.
 *
 * A FOLHA É NOSSA, e A ESCOLHA É DO JOGADOR — as duas coisas mudaram no 1.5.
 *
 * Ela não é mais o sprite do cartucho: o dono manda três vistas geradas por ele,
 * o `tools/outfit-folha.mjs` devolve os nove quadros, e QUAL folha entra aqui
 * sai do guarda-roupa (`outfit-acervo.mjs`). Cravar um caminho neste arquivo
 * faria a aba de outfits trocar de traje sem o farm ficar sabendo — que é a pior
 * forma de uma escolha cosmética falhar, porque ela parece ter funcionado.
 *
 * O FORMATO CONTINUA SENDO O DO CARTUCHO, e essa parte não mudou: nove quadros
 * lado a lado, na ordem 0 frente · 1 costas · 2 perfil · 3-4 passo de frente ·
 * 5-6 de costas · 7-8 de perfil. A DIREITA NÃO EXISTE na folha: é o perfil
 * espelhado, e reproduzir essa economia é o que mantém a fidelidade.
 *
 * A FASE DO PASSO VEM DA DISTÂNCIA, e não do relógio. Com a fase no relógio, a
 * perna e o chão andam em ritmos independentes e o boneco desliza; nenhuma
 * velocidade conserta, porque os dois nunca casam. Foi o defeito que o dono do
 * projeto viu na bancada ("parece que dá pulinhos"), e a correção é a mesma. */

/* O TAMANHO DO QUADRO SAI DA PRÓPRIA FOLHA, e não de uma constante.
 *
 * Cravar 16×32 amarrava a aba ao formato do cartucho — e o primeiro outfit
 * autoral já chegou em 25×52, porque o que precisa bater é a DENSIDADE de
 * pixel, não o tamanho do sprite. Nove quadros lado a lado é a única coisa que
 * a folha promete, e é a única de que este arquivo precisa. */
let QW = 16, QH = 32;
let folhaPronta = null;

/* A CHAVE DE COR SÓ AGE EM FOLHA DE FUNDO OPACO — e conferir isso é a correção
 * do D-054, que foi o defeito mais destrutivo desta tela até hoje.
 *
 * A folha do cartucho vinha com o fundo chapado, e a chave lia a cor do canto.
 * A folha NOSSA já sai da esteira com alfa: o canto é transparente, e os canais
 * de cor de um pixel transparente são zero. A chave então passava a valer
 * "apague todo pixel (0,0,0)" — e (0,0,0) é o CONTORNO PRETO de todo outfit.
 *
 * O resultado é o que o dono viu: na bancada os trajes ficavam perfeitos e na
 * rota apareciam comidos, sem contorno, com buracos no lugar das partes
 * escuras. Duas telas, a mesma folha, resultados diferentes — e nenhum erro de
 * execução, porque apagar pixel é uma operação perfeitamente válida.
 *
 * A guarda é uma linha: se o canto já é transparente, não há fundo para tirar. */
let folhaAtual = null;
function carregarAtor() {
  const src = folhaVestida(carregarGuardaRoupa());
  /* TROCOU DE TRAJE? A promessa antiga é descartada. Sem isto o farm ficaria
     com o traje da primeira abertura da aba até o jogador recarregar a página —
     e trocar de roupa sem efeito visível é pior do que não poder trocar. */
  if (folhaPronta && src === folhaAtual) return folhaPronta;
  folhaAtual = src;
  if (!src) return (folhaPronta = Promise.resolve(null));
  folhaPronta = new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      /* p[3] é o ALFA do canto. Transparente já: nada a chavear — ver D-054. */
      if (p[3] > 8) {
        const [r0, g0, b0] = p;
        for (let i = 0; i < p.length; i += 4)
          if (p[i] === r0 && p[i+1] === g0 && p[i+2] === b0) p[i+3] = 0;
        g.putImageData(d, 0, 0);
      }
      QW = Math.round(c.width / 9); QH = c.height;
      res(c);
    };
    im.onerror = () => res(null);
    im.src = src;
  });
  return folhaPronta;
}

let quadroAtor = null, plantaAtual = null;

/* A SOMBRA É ELÍPTICA E DURA, colada nos pés. Borrada, vira mancha e o
   personagem volta a flutuar — foi o defeito nº 4 das prévias antigas, e o dono
   descreveu como "parecem estar sobre o cenário, não dentro". */
function sombra(g, cx, base, raio) {
  g.fillStyle = 'rgba(0,0,0,.40)';
  g.beginPath();
  g.ellipse(cx, base - 1.5, raio, raio * 0.38, 0, 0, Math.PI * 2);
  g.fill();
}

/* A semente do passeio sai do BIOMA, e não do relógio: cada lugar tem a própria
   coreografia e a repete. Dois biomas com o mesmo caminho seriam papel de
   parede, e o mesmo bioma com caminho diferente a cada abertura deixaria de ser
   um lugar — é o mesmo argumento que já governa o desenho do chão. */
/* O NOME DA ESPÉCIE VEM DAQUI, e não de dentro da cena: aquele arquivo
   desenha criaturas, e QUEM elas são é tema (§0.3). Passar a função é o que
   permite a cena não conhecer o pack. */
const sementeDe = id => [...String(id)].reduce((a, c) => a + c.charCodeAt(0) * 131, 7) >>> 0;

async function laçoDoAtor(t) {
  const cv = $('#idleAtor');
  const folha = await carregarAtor();
  if (cv && folha && plantaAtual && mundoCheio) {
    ajustarViewport();
    const W = cv.width, H = cv.height;
    const mundoW = plantaAtual.cols * T, mundoH = plantaAtual.rows * T;

    const semente = sementeDe(biomaEscolhido);
    /* A CENA VEM ANTES DA ÁREA desde o L-164: é ela que diz em que wave a
       run está, e a wave decide o TRECHO do mapa por onde ele anda. */
    const cenaAgora = cenaDaVez();
    /* ── QUAL CLIMA ESTÁ CAINDO (1.32) ──────────────────────────────
       Vem no retrato da cena, pelo mesmo setter que tudo aqui usa. O mundo
       não pergunta à tela: se perguntasse, o par viraria ciclo de importação,
       e ciclo já derrubou a aba inteira uma vez (D-074).

       FORA da run não há clima: a aba de escolha é o tempo firme por
       definição, e pôr chuva ali seria prometer um bônus que não existe. */
    const fxDoClima = cenaAgora?.climaFx ?? null;
    const areaCheia = areaAndavel(plantaAtual, { qw: QW, qh: QH, T });
    /* ── NA RUN ELE ATRAVESSA O MAPA (L-164, v2) ──────────────────────
       Nada do movimento muda: muda a ÁREA, e ela avança com a wave. O porquê
       inteiro — e por que isto não desfaz o A4g — está no `trechoDaWave`.

       FORA DA RUN é o mapa todo, e essa metade é decisão DESTE arquivo: o
       passeio da aba de escolha é o que o jogador vê a maior parte do tempo,
       e ele não tem wave nenhuma para seguir. */
    const area = cenaAgora
      ? areaDaLuta(trechoDaWave(areaCheia, cenaAgora.wave, WAVES), { mundoH, viewH: H })
      : areaCheia;
    /* `vistas: 1` é o traje que só tem a frente. Ver `vida.mjs` e L-074: sem
       desenho de perfil, o passeio passa a ser vertical em vez de o boneco
       deslizar de lado mostrando a cara — o "caranguejo" que o dono viu. */
    const traje = porId(carregarGuardaRoupa().vestido);
    /* O LAGO BLOQUEIA. Sem isto o treinador atravessa a agua parada como se
       fosse grama, e o lago deixa de ser relevo para virar textura. */
    const opcoes = { semPerfil: (traje?.vistas ?? 3) < 3, bloqueios: bloqueiosAtuais };

    /* O TREINADOR PARA PARA ASSISTIR À LUTA. `passeio` é função do tempo, sem
       estado, então parar o boneco é parar o relógio dele — a razão inteira e
       a armadilha do teleporte estão no `relogioDoPasseio`. */
    /* ── ELE PARA ENQUANTO HOUVER SELVAGEM EM CENA, e não só no golpe ──
       `duelando` só é verdade nos instantes de troca de golpes; entre um e
       outro o treinador voltava a andar, e a âncora da batalha ia junto. Com
       selvagem em cena ele fica; sem nenhum, volta a caminhar na área. */
    const emLuta = !!(cenaAgora?.duelando || cenaAgora?.emCena?.length);
    const tPasseio = relogioDoPasseio(t, emLuta);
    const eu = passeio(semente, area, tPasseio, opcoes);
    /* L-187: na luta a câmera mira o meio do trio, e chega lá sem pular. */
    focoCam = aproximarFoco(focoCam, focoDaCamera(eu, emLuta, { w: mundoW, h: mundoH }), t - (tFoco ?? t));
    tFoco = t;
    const alvo = camera(focoCam, W, H, mundoW, mundoH);

    /* O chão: uma janela do mundo já pintado, MAIS a vida do bioma por cima.
       O chão não muda e por isso vive num canvas guardado; a vida muda a cada
       quadro e por isso é redesenhada aqui. */
    const gm = $('#idleMundo').getContext('2d');
    gm.imageSmoothingEnabled = false;
    gm.clearRect(0, 0, W, H);
    gm.drawImage(mundoCheio, alvo.x, alvo.y, W, H, 0, 0, W, H);
    desenharVida(gm, alvo, W, H, t, plantaAtual);
    cachoeirasVivas(gm, alvo, t, plantaAtual);
    /* ── O VÉU DO CLIMA, POR BAIXO DE QUEM SE MEXE (1.32) ────────────
       No canvas do MUNDO e depois da vida do bioma: a cor passa sob os
       lutadores, e eles continuam legíveis. Um véu por cima escureceria o
       próprio bicho, e o jogador perde o que veio ver. */
    veuDoClima(gm, fxDoClima, W, H);

    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);

    /* QUANTOS PIXELS DE TELA VALE UM PIXEL DE MUNDO. A camada viva é HTML e
       precisa disso; o canvas não, porque o CSS o estica por igual. */
    const escala = ($('#idlePalco')?.getBoundingClientRect().width || W) / W;

    /* QUEM ESTÁ MAIS AO FUNDO SE DESENHA PRIMEIRO. É profundidade, não acaso:
       com ordem fixa, o companheiro some atrás do treinador metade do tempo e
       flutua na frente dele na outra metade. */
    /* NO DUELO QUEM MANDA NO COMPANHEIRO É A BATALHA — ele vai ao campo e
       luta; fora dela, passeia como sempre. Ver `posicaoDoMeu`. */
    const bicho = posicaoDoMeu(eu, cenaAgora, t, quemAcompanha())
      ?? companheiro(semente, area, tPasseio, opcoes);
    const desenharTreinador = () => {
      const { quadro, espelhar } = quadroDe(eu.dir, eu.distancia, eu.andando);
      const px = Math.round(eu.x - alvo.x - QW / 2);
      const py = Math.round(eu.y - alvo.y - QH);
      sombra(g, px + QW / 2, py + QH, QW * 0.36);
      g.save();
      if (espelhar) { g.translate(px * 2 + QW, 0); g.scale(-1, 1); }
      g.drawImage(folha, quadro * QW, 0, QW, QH, px, py, QW, QH);
      g.restore();
    };
    desenharTreinador();
    /* A criatura é um elemento HTML e não um desenho: a ordem dela contra o
       treinador é `z-index`, e não a ordem das chamadas. */
    desenharCompanheiro(g, bicho, alvo, eu.dir, escala, sombra);
    /* Depois do companheiro e antes dos habitantes: o bando que veio lutar
       está mais perto do jogador que a fauna de fundo. */
    desenharMobs(g, alvo, escala, t, eu, cenaAgora, sombra, nomeDoDex, golpeDoDex,
                 { w: mundoW, h: mundoH });
    /* O RELÓGIO DO MUNDO — Brasília para todos, decisão do dono (DEC-10). Não o
       UTC cru (três horas adiantado no Brasil) e não o fuso do aparelho (que
       viraria alavanca para forçar a noite). Ver `relogioDoMundo`.
       UM por quadro, lido ANTES da fauna: a fauna que dorme (ST-2.4) e a luz
       que escurece têm de ler a MESMA hora. Duas leituras eram também duas
       âncoras, e o S1021 passou a escapar pela segunda. */
    const agoraDoMundo = relogioDoMundo(Date.now());
    desenharHabitantes(g, alvo, escala, t, eu.y, periodoEm(agoraDoMundo) === 'noite');
    desenharNpcs(g, plantaAtual, alvo, escala, t, sombra, eu.y);
    /* ── E AS PARTÍCULAS NA FRENTE DE TUDO (1.32) ───────────────────
       A chuva cai entre o jogador e a cena, como na Arena e como na vida.
       Em coordenada de CANVAS: a partícula nasce em 0..W, 0..H, que é o
       espaço deste contexto. Nenhuma conversão a errar — foi o D-092, de
       ontem, que fez essa frase valer a pena escrever. */
    desenharClima(g, fxDoClima, W, H, t);

    /* ── E A LUZ DA HORA SOBRE TUDO (1.34) ──────────────────────────
       Depois do treinador, do companheiro, dos selvagens e da chuva. Se ela
       caísse só no chão, os bonecos ficariam acesos numa cena escura — e é
       assim que o jogador descobre que a noite é um filtro e não uma hora.

       `Date.now()` e não `t`: `t` é o relógio da ANIMAÇÃO, que começa em
       zero quando a aba abre. A hora é do MUNDO — o `agoraDoMundo` lido acima,
       antes da fauna. */
    /* A LUZ É UMA CAMADA DO PALCO, com `multiply` — ver o CSS de `#idleLuz`
       e as duas tentativas reprovadas que ele conta. Só escreve o estilo quando
       ele muda: a string é a mesma por minutos, e tocar o estilo a 60 Hz
       forçaria o navegador a recompor a camada à toa. */
    const luzEl = $('#idleLuz');
    if (luzEl) {
      const fundo = estiloDaLuz(agoraDoMundo);
      if (luzEl.dataset.fundo !== fundo) { luzEl.style.background = fundo; luzEl.dataset.fundo = fundo; }
    }
    /* ── E A LUZ DO LUGAR ATRAVESSA O ESCURO ─────────────────────────
       Num canvas próprio, POR CIMA da luz e em `screen`: a brasa e o vaga-lume
       somados ao escuro, nunca escurecidos por ele. Na primeira tentativa a
       noite apagava justamente o que o dono pediu que ficasse mais forte. */
    const brilhoCv = $('#idleBrilho');
    if (brilhoCv) {
      if (brilhoCv.width !== W) brilhoCv.width = W;
      if (brilhoCv.height !== H) brilhoCv.height = H;
      const gb = brilhoCv.getContext('2d');
      gb.clearRect(0, 0, W, H);
      brilhoDaVida(gb, alvo, W, H, t, brilhoNoturno(agoraDoMundo));
      /* E QUEM DORME, POR CIMA DO ESCURO (ST-2.4) — ver `desenharSono`. */
      if (periodoEm(agoraDoMundo) === 'noite') desenharSono(gb, alvo, t);
    }
    /* A JANELA DO CÉU, no canto. Um mundo top-down não tem céu, então o céu
       ganhou um lugar — ver o cabeçalho do `idle-ceu.mjs`. */
    const ceuCv = $('#idleCeu');
    if (ceuCv) {
      pintarJanelaDoCeu(ceuCv, agoraDoMundo, plantaAtual.paleta?.baseEsc ?? '#0d1a14');
      const fala = falaDaHora(agoraDoMundo);
      if (ceuCv.title !== fala) ceuCv.title = fala;
    }

    const v = vivos.get('comp');
    if (v) v.moldura.style.zIndex = bicho.y <= eu.y ? 1 : 3;
  }
  quadroAtor = requestAnimationFrame(laçoDoAtor);
}


/* A VIDA DO BIOMA — cachoeira, luz e detalhe — mora em `idle-bioma-vivo.mjs`
   desde que este arquivo passou de 600 linhas pela quarta vez. A divisão é
   por responsabilidade: aqui é a JANELA e os ATORES; lá é o LUGAR, e o que
   ele faz sozinho. Ver o cabeçalho de lá — é o arquivo que a regra permanente
   do `CLAUDE.md` sobre o cenário protege. */
import { prepararVida, cachoeirasVivas, desenharVida, brilhoDaVida, ESPUMA_MS } from './idle-bioma-vivo.mjs';
/* O CLIMA (1.32). A conta mora em `clima-particulas.mjs`, camada 0; aqui só
   entra o desenho — ver o cabeçalho do `idle-clima.mjs`. */
import { veuDoClima, desenharClima } from './idle-clima.mjs';
/* O CÉU (1.34): a janela no canto, a luz da hora sobre a cena, e o brilho
   da vida atravessando a noite.
   Quem DECIDE é o `hora-do-dia.mjs`, em camada 0; estes dois só pintam. */
import { estiloDaLuz, pintarJanelaDoCeu, falaDaHora } from './idle-ceu.mjs';
import { brilhoNoturno, relogioDoMundo, periodoEm } from './hora-do-dia.mjs';
export { ESPUMA_MS } from './idle-bioma-vivo.mjs';

function esconder(chave) {
  const v = vivos.get(chave);
  if (v) v.moldura.style.display = 'none';
}
