/* O QUE UM `filter` DE CSS FAZ COM UMA COR (R19 — fecha a L-045).
 *
 * Puro: entra uma cor e uma cadeia de filtros, sai a cor resultante. Sem DOM,
 * sem navegador, sem estado.
 *
 * ── POR QUE ISTO EXISTE ────────────────────────────────────────────────────
 *
 * O portão de contraste lê `getComputedStyle().color` e soma os fundos dos
 * ancestrais. Isso é exato para tudo que ele media — e é CEGO para `filter`.
 *
 * `.plate.dead{filter:grayscale(1) brightness(.62)}` escurece a barra INTEIRA,
 * texto incluído. Medir aquele elemento pela cor declarada devolve um número
 * que não é o que está na tela. Foi por isso que o R6 NÃO acrescentou a barra
 * de vida aos alvos do portão: um alvo que devolve o número errado é pior que
 * um alvo ausente — o primeiro afirma, o segundo cala.
 *
 * ── POR QUE CONTA, E NÃO LÊ O PIXEL ───────────────────────────────────────
 *
 * Ler o pixel da captura exigiria decodificar PNG, e o projeto não tem
 * dependência — nem vai ter. Mas há uma razão melhor que essa: **um pixel é uma
 * amostra**. Texto é antialiasado, e o valor lido depende de qual pixel se
 * acerta; a borda de uma letra devolve uma mistura que não é nem a cor do texto
 * nem a do fundo. A conta devolve a cor do TEXTO, que é o que a razão de
 * contraste pergunta.
 *
 * As fórmulas são as da especificação de Filter Effects, e são as mesmas que o
 * navegador aplica. Trabalham em 0–255 porque é o que o resto do portão usa.
 *
 * ── O QUE ELE NÃO FAZ, E ESTÁ DECLARADO ───────────────────────────────────
 *
 * `blur` e `drop-shadow` são ignorados: os dois misturam pixels VIZINHOS, e uma
 * cor sozinha não tem vizinho. Numa região chapada — que é o caso de fundo de
 * texto — o `blur` é identidade, então ignorá-lo não introduz erro ali. Onde
 * introduziria é sobre gradiente, e nenhum alvo do portão está sobre um.
 *
 * `opacity` também fica de fora, e por outro motivo: ela é composição contra o
 * que está ATRÁS, e o portão já faz essa conta em `sobre()`. Fazê-la duas vezes
 * aplicaria a transparência duas vezes.
 */

/* Coeficientes de luminância da especificação (os mesmos do `luminance-to-alpha`
   e da matriz de saturação). Não são os do WCAG, que usa outros para o cálculo
   de contraste — e misturar os dois é um erro fácil de cometer e difícil de ver. */
const LR = 0.2126, LG = 0.7152, LB = 0.0722;

const trava = v => Math.max(0, Math.min(255, v));
const aplicarMatriz = ([r, g, b], m) => [
  trava(m[0] * r + m[1] * g + m[2] * b),
  trava(m[3] * r + m[4] * g + m[5] * b),
  trava(m[6] * r + m[7] * g + m[8] * b),
];

/* `saturate(a)` da especificação. `grayscale(a)` é `saturate(1-a)` — a
   especificação as define com a MESMA matriz, e escrever as duas separadamente
   seria manter duas cópias de uma fórmula só. */
const matrizSaturacao = a => [
  0.213 + 0.787 * a, 0.715 - 0.715 * a, 0.072 - 0.072 * a,
  0.213 - 0.213 * a, 0.715 + 0.285 * a, 0.072 - 0.072 * a,
  0.213 - 0.213 * a, 0.715 - 0.715 * a, 0.072 + 0.928 * a,
];

const matrizSepia = a => [
  0.393 + 0.607 * (1 - a), 0.769 - 0.769 * (1 - a), 0.189 - 0.189 * (1 - a),
  0.349 - 0.349 * (1 - a), 0.686 + 0.314 * (1 - a), 0.168 - 0.168 * (1 - a),
  0.272 - 0.272 * (1 - a), 0.534 - 0.534 * (1 - a), 0.131 + 0.869 * (1 - a),
];

const FUNCOES = {
  brightness: (cor, a) => cor.map(c => trava(c * a)),
  contrast:   (cor, a) => cor.map(c => trava((c - 127.5) * a + 127.5)),
  saturate:   (cor, a) => aplicarMatriz(cor, matrizSaturacao(a)),
  grayscale:  (cor, a) => aplicarMatriz(cor, matrizSaturacao(1 - a)),
  sepia:      (cor, a) => aplicarMatriz(cor, matrizSepia(a)),
  invert:     (cor, a) => cor.map(c => trava(c * (1 - a) + (255 - c) * a)),
  /* Vizinhança, não cor: ver a nota do cabeçalho. */
  blur:        cor => cor,
  'drop-shadow': cor => cor,
  /* Composição contra o fundo, que o portão já faz: ver a nota do cabeçalho. */
  opacity:     cor => cor,
};

/* O ARGUMENTO PODE VIR EM PORCENTAGEM OU EM NÚMERO — `brightness(62%)` e
   `brightness(.62)` são a mesma coisa, e o valor computado do navegador usa
   ora um ora outro. Ausente é 1 para todas as que aceitam fator. */
function fator(bruto) {
  const t = String(bruto ?? '').trim();
  if (!t) return 1;
  if (t.endsWith('%')) return parseFloat(t) / 100;
  return parseFloat(t);
}

/* Aplica uma cadeia como `grayscale(1) brightness(.62)` a uma cor `[r,g,b]`.
   Filtro desconhecido é IGNORADO, e não é erro: a cadeia pode ganhar função
   nova num navegador novo, e reprovar o portão por isso seria reprovar o
   projeto por causa de uma atualização de Chromium. */
export function aplicarFiltro(cor, cadeia) {
  const texto = String(cadeia ?? '').trim();
  if (!texto || texto === 'none') return cor.slice();
  let saida = cor.slice();
  for (const m of texto.matchAll(/([a-z-]+)\(([^()]*)\)/gi)) {
    const fn = FUNCOES[m[1].toLowerCase()];
    if (fn) saida = fn(saida, fator(m[2]));
  }
  return saida.map(Math.round);
}

/* A cadeia ACUMULADA de um elemento até a raiz.
 *
 * `filter` não herda, mas COMPÕE: um filtro num ancestral vale para tudo que
 * está dentro dele, e dois filtros aninhados se aplicam em sequência. A ordem
 * importa — do ancestral mais distante para o mais próximo é a ordem em que o
 * navegador pinta.
 *
 * Recebe a lista já colhida pelo chamador, porque este módulo não toca DOM. */
export function filtroAcumulado(cadeias) {
  return (cadeias || []).filter(c => c && c !== 'none').join(' ');
}
