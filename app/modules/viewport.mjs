/* A JANELA DE MUNDO, COMO CONTA PURA (camada 0).
 *
 * Extraída de `idle-mundo.mjs` porque a conta é a regra e o resto é DOM. A
 * versão anterior vivia dentro de `ajustarViewport`, cercada de
 * `getBoundingClientRect` e de `canvas.width` — e o efeito disso foi que o
 * defeito plantado `S616`, que apaga o piso do zoom, **passou pela suíte
 * inteira**. Ninguém conseguia afirmar sobre a conta sem subir um navegador.
 *
 * ── O QUE ESTA CONTA IMPEDE ──────────────────────────────────────────────
 *
 * O canvas é esticado pelo CSS até preencher a caixa. Enquanto a janela de
 * mundo couber dentro do mundo, a proporção dos dois é a mesma e o pixel sai
 * quadrado. Se o zoom pedir MAIS mundo do que existe, a janela é limitada ao
 * mapa — e aí caixa e canvas passam a ter proporções diferentes. O CSS estica
 * para cobrir a diferença, e é exatamente isso que o dono viu:
 *
 *     caixa 1534×792 (1,94)   canvas 704×448 (1,57)   → imagem esticada
 *
 * Na palavra dele: *"essa pégada mesmo de agora ficou muito esticadona"*.
 *
 * Limitar o canvas não resolve; move o problema para o CSS. O que resolve é o
 * zoom não poder ficar ABAIXO do que faz o mundo cobrir a caixa: aí a janela
 * nunca precisa ser maior que o mapa, e as duas proporções batem sempre.
 *
 * ── O PISO NÃO TIRA NADA DO JOGADOR ──────────────────────────────────────
 *
 * Vale escrever, porque parece que tira. O zoom continua sendo escolha dele
 * para cima; o piso só recusa o zoom que mostraria mais mundo do que o mundo
 * tem. Não existe imagem melhor abaixo do piso — existe a mesma imagem
 * esticada. A escolha que ele perde é a de ver a cena deformada.
 */

/* Mínimos absolutos da janela. Abaixo disto a cena deixa de caber um
   personagem inteiro com o chão embaixo dele, e o zoom vira lupa. */
export const W_MIN = 80, H_MIN = 60;

export function janela({ cx, cy, mundoW, mundoH, zoom }) {
  /* `larg`/`alt` e nao `CX`/`CY`: maiuscula curta neste projeto e nome de
     modulo, e o portao de camadas leu o `CY` local como o `CY` do render. */
  const larg = Math.max(1, cx || 900), alt = Math.max(1, cy || 520);
  const MW = Math.max(1, mundoW), MH = Math.max(1, mundoH);

  const piso = Math.max(larg / MW, alt / MH);
  const usar = Math.max(zoom || 1, piso);

  return {
    piso,
    usar,
    w: Math.max(W_MIN, Math.round(larg / usar)),
    h: Math.max(H_MIN, Math.round(alt / usar)),
  };
}

/* ── OS NÍVEIS DE ZOOM SAEM DO PISO, E NÃO DE UMA LISTA FIXA ───────────────
 *
 * A lista era `[1, 2, 3, 4, 5]` e o piso engolia os de baixo em silêncio.
 * Medido na queixa do dono, janela de 1194×1022:
 *
 *     palco 1145×897  ->  piso 2,00  ->  zoom 1 e zoom 2 renderizam IGUAL,
 *                                        e o rótulo continua dizendo "1×"
 *
 * Palavra dele: *"Percebi que o zoom do 1x e 2x não mudam"*. Ele está certo, e
 * a causa fui eu: o piso anti-esticado do 1.5i comeu os dois níveis de baixo.
 *
 * ── POR QUE DERIVAR, E NÃO SÓ ESCONDER OS INALCANÇÁVEIS ──────────────────
 *
 * Esconder faria o botão sumir e reaparecer conforme o jogador arrasta a alça,
 * e controle que muda de tamanho sozinho é pior que controle com opção a menos.
 *
 * O PISO VIRA O PRIMEIRO NÍVEL. Ele é uma posição legítima — é exatamente
 * "o mapa inteiro cabendo na tela", que é o mais longe que faz sentido existir.
 * Abaixo dele não há imagem melhor; há a mesma imagem esticada. Então a lista
 * é: o piso, mais os níveis inteiros acima dele.
 *
 * E o rótulo passa a mostrar o número EFETIVO. Um "1×" que renderiza 2,00× é
 * uma mentira pequena, e mentira pequena em controle é a que mais irrita: o
 * jogador clica, nada muda, e ele conclui que o jogo está quebrado. */
export const ZOOMS_INTEIROS = [1, 2, 3, 4, 5];

export function niveis(piso) {
  const p = Math.max(0.1, piso || 1);
  const acima = ZOOMS_INTEIROS.filter(z => z > p + 0.02);
  /* arredonda o piso para cima em 0,05 para o primeiro clique já sair dele
     sem cair de volta por erro de ponto flutuante */
  return [Math.ceil(p * 20) / 20, ...acima];
}

/* O nível mais próximo do pedido que a lista tem. Serve para o zoom guardado
   no `localStorage` sobreviver a uma janela de outro tamanho: 3× guardado numa
   janela onde o piso virou 3,4 volta como 3,4 e não como "some do controle". */
export function nivelMaisProximo(lista, alvo) {
  if (!lista?.length) return 1;
  return lista.reduce((a, b) => Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a);
}

export const rotuloZoom = z => (Number.isInteger(z) ? String(z) : z.toFixed(2).replace(/0$/, '')) + '\u00d7';

/* ── NA RUN, A LUTA CABE (DEC-15, ST-5.6, L-175) ──────────────────────────
 *
 * Em 420 px o palco tem 390 de largura, e o zoom de 3× — o padrão, aprovado
 * pelo dono — mostrava 130 px de mundo. Uma criatura tem 32 a 40: cabiam três,
 * e a luta tem o bando, o companheiro e o treinador. O que saía da janela não
 * era o efeito; era a luta.
 *
 * A DEC-15 decidiu: NA RUN, o zoom efetivo é o menor entre o escolhido e o que
 * mostra `MUNDO_DA_LUTA` px de mundo. No largo a conta devolve o escolhido
 * (em 1209 px, 3× já mostra 403); fora da run ela nem é chamada. A escolha do
 * jogador fica guardada e volta quando a run acaba.
 *
 * O piso anti-esticado continua valendo POR CIMA: esta função pede um zoom, e
 * `janela` recusa o que ficaria abaixo do piso (S616). */
export const MUNDO_DA_LUTA = 260;

/* L-188: A MESMA REGRA NO OUTRO EIXO. A conta acima garante a LARGURA da
 * luta; a altura ficava por conta do zoom escolhido. No panorâmico, 3× mostra
 * 207 px de mundo na vertical, e o trio — a cabeça do treinador (52), o posto
 * do companheiro (34) e o campo com as placas (96) — ocupa 182: centrado ou
 * não, o bando morava a 88% da janela. 284 px deixa o trio em 64% da altura,
 * com ~18% de folga em cima e embaixo. `test/viewport.mjs` amarra o número às
 * constantes da geometria: mexer numa sem a outra reprova. */
export const ALTURA_DA_LUTA = 284;
export const zoomDaRun = (escolhido, largura, altura) =>
  Math.min(escolhido || 1, Math.max(1, Number(largura) || 1) / MUNDO_DA_LUTA,
           Number(altura) > 0 ? Number(altura) / ALTURA_DA_LUTA : Infinity);

