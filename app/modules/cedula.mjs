/* AS CÉDULAS DE POKÉCASH — desenhadas em SVG, no tema da casa (R28).
 *
 * Entra o valor e a espécie que o ContentPack declara para ele; sai uma string
 * SVG. Não toca o DOM e não importa nada — a nota é conferível num teste de
 * Node, e escala em qualquer tela sem pesar um arquivo.
 *
 * ── POR QUE DESENHADAS, E NÃO AS IMAGENS QUE O DONO MANDOU ─────────────────
 *
 * As artes de referência que ele enviou são ótimas de composição e carregam a
 * marca d'água visível de um artista do DeviantArt. Usá-las poria a assinatura
 * de outra pessoa dentro do produto. Ele escolheu esta alternativa: manter a
 * IDEIA da nota — valor nos quatro cantos, denominação por extenso no topo,
 * criatura emoldurada no centro, série, selo, ornamento de borda — e redesenhar
 * tudo no nosso tema.
 *
 * ── O QUE FAZ UMA NOTA PARECER NOTA ────────────────────────────────────────
 *
 * Não é a moldura: é a GUILHOCHÉ, aquele emaranhado de linhas finas que
 * nenhuma copiadora reproduz direito. Ela é matemática — duas frequências
 * batendo uma contra a outra — e é por isso que cabe em SVG melhor do que em
 * qualquer imagem: nasce de uma fórmula, não de pixels.
 *
 * Aqui ela é gerada por espirógrafo, e o traçado muda com o VALOR: cada
 * denominação tem um padrão próprio, como nas notas de verdade.
 *
 * ── A ESPÉCIE VEM DO PACK ──────────────────────────────────────────────────
 *
 * `dex` chega de fora, sempre. Escolher aqui qual criatura aparece em cada nota
 * seria escrever identificador de franquia dentro do app — o que o
 * `test/conteudo.mjs` existe para impedir. O pack declara; a nota desenha.
 */

/* UMA PASSADA SÓ, e a expressão montada por `new RegExp` em vez de escrita como
   literal. Os dois motivos são os mesmos do `grafico.mjs`:

   1. em cadeia, a ordem vira regra invisível — o `&` tem que vir primeiro,
      senão ele reescreve as entidades que as trocas seguintes acabaram de
      produzir, e `&lt;` vira `&amp;lt;`. Numa passada essa armadilha não existe;
   2. o `semTexto` do `test/modulos.mjs` não entende literal de expressão
      regular: a aspa de dentro de `/"/g` é lida como início de string, e o
      mascaramento do arquivo inteiro perde a sincronia a partir dali. É o
      `D-032`, e ele reprova código correto. */
const MAPA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const ESCAPAVEIS = new RegExp('[&<>"]', 'g');
const esc = s => String(s ?? '').replace(ESCAPAVEIS, c => MAPA[c]);

const n2 = v => Math.round(v * 100) / 100;

/* Proporção de cédula: 2,35:1 é a das notas de real e de dólar. Vinda de fora,
   ela faz o desenho parecer dinheiro antes de qualquer ornamento. */
export const LARGURA = 470;
export const ALTURA = 200;

/* A COR POR DENOMINAÇÃO, e ela não é decoração: em qualquer moeda do mundo o
   valor se reconhece pela cor antes de o olho ler o número. Cinco famílias,
   todas dentro do neon da casa. */
export const CORES = {
  50:   { a: '#2de2c8', b: '#0b6a63', nome: 'CINQUENTA' },
  100:  { a: '#5ab8ff', b: '#123a75', nome: 'CEM' },
  300:  { a: '#b57bff', b: '#3a1f6e', nome: 'TREZENTOS' },
  500:  { a: '#ffb347', b: '#6b3d07', nome: 'QUINHENTOS' },
  1000: { a: '#ff5f8f', b: '#6b0f2e', nome: 'MIL' },
};

/* A denominação por extenso, com reserva para valor fora da tabela: uma nota
   sem nome continua sendo uma nota, e é melhor que uma que não desenha. */
export const porExtenso = valor => CORES[valor]?.nome ?? String(valor);

/* ── A GUILHOCHÉ ───────────────────────────────────────────────────────────
 *
 * Espirógrafo: um círculo rolando dentro de outro, com a caneta a uma distância
 * fixa do centro. Duas razões inteiras diferentes dão desenhos diferentes, e é
 * daí que sai o padrão próprio de cada denominação.
 *
 * `passo` controla quantos pontos o traço tem. Poucos demais e vira polígono;
 * muitos demais e o SVG engorda sem o olho ganhar nada — 420 é onde a curva
 * fecha lisa nesta escala. */
function guilhoche(cx, cy, R, r, d, voltas = 1, passo = 420) {
  const pts = [];
  const total = Math.PI * 2 * voltas * (r / gcd(R, r) || 1);
  for (let i = 0; i <= passo; i++) {
    const t = (i / passo) * total;
    const k = (R - r) / r;
    pts.push(`${n2(cx + (R - r) * Math.cos(t) + d * Math.cos(k * t))},${
                 n2(cy + (R - r) * Math.sin(t) - d * Math.sin(k * t))}`);
  }
  return pts.join(' ');
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/* ── A SÉRIE ───────────────────────────────────────────────────────────────
 *
 * Número de série DETERMINÍSTICO, derivado do valor e da espécie. Duas notas do
 * mesmo valor têm a mesma série, e isso é de propósito: elas são a mesma nota,
 * não exemplares distintos. Sortear aqui faria a carteira mostrar séries novas a
 * cada abertura, e número que muda sozinho é número em que ninguém confia. */
export function serieDe(valor, dex) {
  let h = 2166136261;
  for (const c of `${valor}|${dex}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const n = (h >>> 0).toString().padStart(10, '0').slice(0, 10);
  return `PA ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/* ── A NOTA ────────────────────────────────────────────────────────────────
 *
 * `retrato` é o endereço da imagem da criatura, resolvido por quem chama — o
 * módulo puro não sabe de cascata de assets nem de shiny. Sem ele a moldura
 * fica vazia, e a nota continua desenhando: cédula sem retrato é cédula
 * incompleta, não erro.
 */
export function desenharCedula({ valor, dex, retrato = '', moeda = '', serie = null } = {}) {
  const c = CORES[valor] ?? CORES[100];
  const id = `c${valor}`;                       // sufixo dos ids, para várias notas na mesma página
  const s = serie ?? serieDe(valor, dex);
  const larg = LARGURA, alt = ALTURA;

  /* Duas guilhochés sobrepostas com razões diferentes — é a sobreposição que
     cria o moiré que o olho lê como "impresso", e não "desenhado". */
  const g1 = guilhoche(larg * 0.5, alt * 0.5, 96, 24 + (valor % 7), 44);
  const g2 = guilhoche(larg * 0.5, alt * 0.5, 82, 13 + (valor % 5), 58);

  /* OS QUATRO CANTOS, e os de baixo MENORES — como em nota de verdade. Os de
     cima são para reconhecer a nota no maço; os de baixo, para conferir depois
     de já saber qual é. Iguais nos quatro, eles competem entre si e o olho não
     sabe onde pousar. */
  const canto = (x, y, cls) =>
    `<text x="${x}" y="${y}" class="${cls}" text-anchor="middle">${valor}</text>`;

  return `<svg class="cedula cd-${valor}" viewBox="0 0 ${larg} ${alt}" role="img"
     aria-label="${esc(porExtenso(valor))} ${esc(moeda)}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0e18"/><stop offset=".55" stop-color="${c.b}"/>
      <stop offset="1" stop-color="#0a0e18"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.a}"/><stop offset=".5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="${c.a}"/>
    </linearGradient>
    <clipPath id="${id}m"><circle cx="${larg * 0.5}" cy="${alt * 0.46}" r="52"/></clipPath>
    <filter id="${id}g"><feGaussianBlur stdDeviation="2.2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect x="1" y="1" width="${larg - 2}" height="${alt - 2}" rx="12" fill="url(#${id}f)"/>

  <g class="cdGui" stroke="${c.a}" fill="none">
    <polyline points="${g1}"/><polyline points="${g2}"/>
  </g>

  <rect x="7" y="7" width="${larg - 14}" height="${alt - 14}" rx="9"
        fill="none" stroke="url(#${id}b)" stroke-width="1.6" opacity=".85"/>
  <rect x="13" y="13" width="${larg - 26}" height="${alt - 26}" rx="6"
        fill="none" stroke="${c.a}" stroke-width=".6" opacity=".45"/>

  <text x="${larg * 0.5}" y="34" class="cdExt" text-anchor="middle">${esc(porExtenso(valor))}</text>
  <text x="${larg * 0.5}" y="${alt - 20}" class="cdMoeda" text-anchor="middle">${esc(moeda)}</text>

  ${canto(46, 66, 'cdVal')}${canto(larg - 46, 66, 'cdVal')}
  ${canto(64, alt - 26, 'cdValMin')}${canto(larg - 64, alt - 26, 'cdValMin')}

  <circle cx="${larg * 0.5}" cy="${alt * 0.46}" r="52" fill="#05080f" opacity=".55"/>
  ${retrato ? `<image href="${esc(retrato)}" x="${larg * 0.5 - 52}" y="${alt * 0.46 - 54}"
     width="104" height="104" clip-path="url(#${id}m)" class="cdMon"
     preserveAspectRatio="xMidYMid meet"/>` : ''}
  <circle cx="${larg * 0.5}" cy="${alt * 0.46}" r="52" fill="none"
          stroke="${c.a}" stroke-width="1.6" filter="url(#${id}g)"/>

  <!-- A SÉRIE NA VERTICAL, na margem esquerda. Deitada no rodapé ela colidia
       com o valor do canto inferior — e é motivo de nota de verdade: a série
       vertical é o que sobra de espaço depois que os quatro cantos e a
       denominação já tomaram o seu. -->
  <text transform="translate(22 ${alt - 30}) rotate(-90)" class="cdSerie">${esc(s)}</text>
  <g class="cdSelo" transform="translate(${larg - 62} ${alt - 62})">
    <circle r="21" fill="none" stroke="${c.a}" stroke-width="1" opacity=".7"/>
    <circle r="15" fill="none" stroke="${c.a}" stroke-width=".5" opacity=".5"/>
    <text y="4" text-anchor="middle" class="cdSeloTxt">PA</text>
  </g>
</svg>`;
}

/* ── O SALDO COMO NOTAS ────────────────────────────────────────────────────
 *
 * A carteira mostra quantas notas de cada valor o jogador tem, que é o que uma
 * carteira de verdade mostra. Dá peso ao saldo sem mudar regra nenhuma — e
 * encaixa com o §5.5, que já separa o dinheiro em baldes por proveniência.
 *
 * GULOSO, DA MAIOR PARA A MENOR: 1000 é uma nota de mil, e não dez de cem. Uma
 * carteira que mostra dez notas onde cabe uma está mostrando o troco.
 *
 * O RESTO É DECLARADO, e não engolido. Saldo de 37 não fecha em nota nenhuma, e
 * a tela precisa poder dizer isso em vez de fingir zero — some 37 do que o
 * jogador vê e a soma para de bater com o saldo, que é o tipo de erro que passa
 * despercebido porque cada nota, sozinha, parece certa.
 */
export function decompor(saldo, valores) {
  const notas = {};
  let resto = Math.max(0, Math.floor(saldo || 0));
  for (const v of [...(valores || [])].sort((a, b) => b - a)) {
    const n = Math.floor(resto / v);
    if (n > 0) { notas[v] = n; resto -= n * v; }
  }
  return { notas, resto };
}
