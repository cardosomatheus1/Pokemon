/* GRÁFICOS DO PAINEL — SVG escrito à mão, como texto.
 *
 * Entra uma lista de números, sai uma string. Não toca o DOM, não importa nada:
 * por isso o teste consegue MEDIR a geometria em vez de olhar para ela. Uma
 * barra é o dobro da outra porque o atributo `height` diz, e isso é conferível
 * num teste de Node — que é o que se quer de um gráfico de auditoria.
 *
 * ── A DISTINÇÃO QUE ORGANIZA O ARQUIVO INTEIRO ─────────────────────────────
 *
 * `0` e `sem dado` são coisas diferentes, e num painel de auditoria a diferença
 * é tudo:
 *
 *   "o edge realizado é zero"        → a casa não ficou com nada
 *   "não há edge realizado"          → nenhuma rodada liquidou ainda
 *
 * Desenhados iguais, o operador lê o segundo como o primeiro e conclui que a
 * economia quebrou. Por isso `null` NUNCA vira barra de altura zero: vira
 * texto, escrito com todas as letras.
 *
 * ── O RÓTULO VEM DO BANCO ──────────────────────────────────────────────────
 *
 * Os rótulos das barras de faucet e sink são o `type` do `wallet_ledger`. É
 * dado, e dado entra em markup — então passa por `escapar` antes, sempre. O
 * painel de ADM é a superfície de maior valor do sistema (§5.11), e é o último
 * lugar do projeto onde vale a pena economizar quatro substituições.
 */

/* UMA PASSADA SÓ, e não quatro `replace` em cadeia. Em cadeia, a ordem vira
   regra invisível: o `&` tem que vir primeiro, senão ele reescreve as entidades
   que as trocas seguintes acabaram de produzir (`&lt;` viraria `&amp;lt;`).
   Numa passada essa armadilha não existe.

   A expressão é montada com `new RegExp` a partir de uma string, e não escrita
   como literal `/[&<>"]/g`, por uma razão de FERRAMENTA: o `semTexto` do
   `test/modulos.mjs` não entende literal de expressão regular, trata a aspa de
   dentro dele como início de string e perde a sincronia do mascaramento do
   arquivo inteiro a partir dali — ver `D-032`. */
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const ESCAPAVEIS = new RegExp('[&<>"]', 'g');

export function escapar(s) {
  return String(s ?? '').replace(ESCAPAVEIS, c => MAPA[c]);
}

/* Duas casas bastam para geometria, e evitam `0.30000000000000004` no atributo. */
const n2 = v => Math.round(v * 100) / 100;

const SEM_DADO = (l, a) =>
  `<text class="g-vazio" x="${n2(l / 2)}" y="${n2(a / 2)}" text-anchor="middle">sem dado</text>`;

/* ── BARRAS ────────────────────────────────────────────────────────────────
 *
 * `dados` é `[{ rotulo, valor }]`. Valor `null` é ausência e sai da lista: ele
 * não vira barra rasteira, porque barra rasteira lê-se como zero.
 */
export function barras({ dados = [], largura = 320, altura = 132 } = {}) {
  const vivos = (dados || []).filter(d => d && Number.isFinite(d.valor));
  const rodape = 26;                      // faixa dos rótulos, embaixo
  const util = altura - rodape - 6;       // o que sobra para as barras

  if (!vivos.length)
    return `<svg class="g g-barras" viewBox="0 0 ${largura} ${altura}" role="img" ` +
           `preserveAspectRatio="none">${SEM_DADO(largura, altura)}</svg>`;

  /* A ESCALA SAI DO MAIOR VALOR. Com tudo zerado não há escala possível: as
     barras vão a zero em vez de virarem `NaN`, e o quadro continua legível. */
  const maior = Math.max(...vivos.map(d => d.valor), 0);
  const passo = largura / vivos.length;
  const larg = Math.max(2, passo * 0.62);

  const corpo = vivos.map((d, i) => {
    const h = maior > 0 ? (d.valor / maior) * util : 0;
    const x = i * passo + (passo - larg) / 2;
    const y = 6 + (util - h);
    return `<rect class="g-barra" x="${n2(x)}" y="${n2(y)}" width="${n2(larg)}" ` +
           `height="${n2(h)}"><title>${escapar(d.rotulo)}: ${escapar(d.valor)}</title></rect>` +
           `<text class="g-rot" x="${n2(i * passo + passo / 2)}" y="${altura - 9}" ` +
           `text-anchor="middle">${escapar(d.rotulo)}</text>`;
  }).join('');

  return `<svg class="g g-barras" viewBox="0 0 ${largura} ${altura}" role="img" ` +
         `preserveAspectRatio="none">${corpo}</svg>`;
}

/* ── MEDIDOR ───────────────────────────────────────────────────────────────
 *
 * Uma régua de 0 a `max`, com a REFERÊNCIA marcada e o VALOR em cima dela. É o
 * gráfico de favorecimento: edge realizado contra margem configurada.
 *
 * O `viewBox` é de 100 unidades de largura de propósito — a coordenada É a
 * porcentagem da régua, o que torna o travamento nas bordas uma conta só e o
 * teste capaz de conferir que o ponteiro não saiu do quadro.
 */
export function medidor({ valor = null, referencia = null, max = 1, rotulo = '' } = {}) {
  const A = 30, teto = Math.max(max, 1e-9);
  /* UM LUGAR SÓ TRAVA, e ele já desconta a largura do próprio traço.
     A primeira versão travava duas vezes — aqui e de novo num `Math.min(98, …)`
     na hora de posicionar. Duas travas para a mesma coisa é código que nenhum
     teste consegue defender: a sabotagem S380 removeu esta e a outra segurou,
     então o defeito não mudava nada observável e PASSOU.
     O valor negativo não é hipótese: edge realizado negativo é a casa tendo
     pago mais do que arrecadou, e é justamente o caso que o operador precisa
     ver desenhado. */
  const pos = (v, largura = 0) =>
    Math.min(100 - largura, Math.max(0, (v / teto) * 100));

  const temValor = Number.isFinite(valor);
  const temRef = Number.isFinite(referencia);
  /* O DESCOLAMENTO É O SINAL, e vai numa classe do GRUPO — nunca somada à
     classe do ponteiro. Somar ali trocaria `class="g-val"` por
     `class="g-val g-acima"`, e quem procura o ponteiro deixaria de achá-lo
     exatamente no caso em que ele mais importa. */
  const acima = temValor && temRef && valor > referencia;

  const trilho = `<rect class="g-trilho" x="0" y="10" width="100" height="8" rx="4"/>`;
  const ref = temRef
    ? `<rect class="g-ref" x="${n2(pos(referencia, 1))}" y="6" width="1" height="16">` +
      `<title>configurada: ${escapar(referencia)}</title></rect>` : '';
  const val = temValor
    ? `<rect class="g-val" x="${n2(pos(valor, 2))}" y="4" width="2" height="20">` +
      `<title>${escapar(rotulo)}: ${escapar(valor)}</title></rect>` : '';
  const nota = temValor ? '' : SEM_DADO(100, A);

  return `<svg class="g g-medidor${acima ? ' g-acima' : ''}" viewBox="0 0 100 ${A}" role="img" ` +
         `preserveAspectRatio="none">${trilho}${ref}${val}${nota}</svg>`;
}
