/* A ESTRADA NO CHÃO DO MAPA (ST-10.24 · L-218) — camada 0, sem DOM.
 *
 * Três rodadas do Q7 da ST-10.23 disseram a mesma coisa: com o chão
 * desenhado, a estrada era um TRAÇO por cima dele — uma linha SVG reta sobre
 * a mata e o planalto —, e o futuro, contas brancas mais vivas que a estrada
 * feita. No mapa do SMW a estrada é CHÃO: terra batida com a borda escura, a
 * ponte e a escada fazem parte dela, e o trecho que ainda não se abriu mal
 * aparece.
 *
 * Aqui mora o que a tela decide sobre ela, e a tela só pinta:
 *   - os dois trechos (o andado até o nó atual, o futuro dali em diante);
 *   - a largura da terra e a altura do penhasco, pela escala da caixa — o
 *     penhasco de 9 px não se lia como altura em 1440 e 1920.
 *
 * O RÓTULO CONTINUA EMBAIXO do nó: pô-lo em cima quando a estrada desce (a
 * primeira tentativa) o jogava sobre o treinador que fica de pé em cima de
 * cada nó — a sonda do Q5 acusou dois rótulos cobertos em 1100. Com a estrada
 * virando chão, a etiqueta escura sobre ela é a do mapa do SMW.
 */

/* A escala: a caixa do mapa deitado vai de ~400 px (celular, em pé) a
   ~1860 px (1920). A terra e o penhasco crescem com ela em degraus, e não
   contínuos — pixel art em tamanho quebrado borra. A 2ª rodada do Q7 ainda
   leu o penhasco de 15 px em 1920 como "degrau de um tile": ele sobe a 22. */
export const larguraDaEstrada = largura => (largura >= 1700 ? 14 : largura >= 1300 ? 12 : largura >= 900 ? 10 : 8);
export const faceDoPenhasco = largura => (largura >= 1700 ? 22 : largura >= 1300 ? 18 : largura >= 900 ? 14 : 10);

/* As cores: a terra do caminho do SMW, a borda escura que a recorta do chão,
   e o gasto claro do meio (onde se pisa). O trecho seguinte é a MESMA
   estrada, apagada — um caminho que existe e ainda não foi aberto. */
export const CORES_DA_ESTRADA = Object.freeze({ borda: '#5e3f1f', terra: '#d2ae6e', gasto: '#e8d09c', alfaDoProximo: 0.55 });

/* Os trechos pelos pontos (em px) dos nós, na ordem do caminho: o ANDADO até
   o nó atual, e o PRÓXIMO — só o trecho do atual ao nó seguinte. O resto do
   futuro NÃO é desenhado: no SMW o caminho fechado não existe até abrir, e
   com ele inteiro à vista "abrir o caminho" perdia a graça (Q7 da 10.24).
   Sem atual (tudo vencido), tudo é andado. */
export function trechosDaEstrada(pontos, iAtual) {
  const n = pontos?.length ?? 0;
  if (n < 2) return { andado: [], proximo: [] };
  const i = iAtual == null || iAtual < 0 ? n - 1 : Math.min(iAtual, n - 1);
  const andado = pontos.slice(0, i + 1), proximo = pontos.slice(i, i + 2);
  return { andado: andado.length > 1 ? andado : [], proximo: proximo.length > 1 ? proximo : [] };
}

/* A seta que fica: só a do trecho PRÓXIMO. A direção da estrada feita a
   própria estrada diz, e o resto do futuro não tem estrada para apontar. */
export const setasNaEstrada = (setas, iAtual) => (iAtual == null || iAtual < 0 ? [] : (setas ?? []).filter((_, k) => k === iAtual));

/* A CURVA: a estrada passa por todo nó, mas entre dois ela ondula — um
   segmento reto de largura constante lia como "gráfico de linha" (Q7). A
   onda some nas pontas (sen de π·t) e tem uma harmônica menor, para não ser
   um arco perfeito; o lado sai de um hash do trecho, e não alternado, para
   não virar ziguezague. Amostrada a cada `passo` px. */
const lado = (a, b) => ((Math.imul(Math.round(a.x) + 7, 73856093) ^ Math.imul(Math.round(b.y) + 3, 19349663)) >>> 0) % 2 ? 1 : -1;
export function curvaDaEstrada(pontos, { passo = 4 } = {}) {
  const saida = [];
  for (let k = 0; k < (pontos?.length ?? 0) - 1; k++) {
    const a = pontos[k], b = pontos[k + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (!len) continue;
    const nx = -dy / len, ny = dx / len, A = Math.min(len * 0.07, 12) * lado(a, b), n = Math.max(2, Math.ceil(len / passo));
    for (let i = saida.length ? 1 : 0; i <= n; i++) {
      const t = i / n, off = A * Math.sin(Math.PI * t) + A * 0.35 * Math.sin(2 * Math.PI * t);
      saida.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
    }
  }
  return saida;
}

/* AS OBRAS SAEM DA ESTRADA: a ponte onde ela está sobre a água, a escada
   onde ela troca de altura — perguntado ao chão pela própria curva, e não a
   casas fixas do desenho (com a estrada ondulando, a ponte fixa ficaria ao
   lado dela). `matEm`/`altEm` respondem pelo chão num ponto em px. */
export function obrasNaEstrada(amostras, { matEm, altEm }) {
  const obras = [];
  for (let k = 0; k < (amostras?.length ?? 0); k++) {
    const p = amostras[k], q = amostras[k + 1] ?? amostras[k - 1] ?? p;
    const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
    /* O SENTIDO da estrada no ponto (`dx`, `dy`, unitário) — a ponte põe as
       tábuas atravessadas nele. */
    const dir = k + 1 < amostras.length ? { dx: dx / len, dy: dy / len } : { dx: -dx / len, dy: -dy / len };
    if (matEm(p) === 'agua') obras.push({ tipo: 'ponte', x: p.x, y: p.y, ...dir });
    const ant = amostras[k - 1];
    /* Uma escada por troca de altura: a amostra suave faz a borda tremer, e
       duas trocas a menos de 12 px são a mesma subida. A regra antiga ("a
       obra anterior não é escada") engolia a SEGUNDA subida de verdade quando
       não havia ponte entre as duas — a cratera → floresta ficou sem degrau
       (Q7 da 10.24, 2ª rodada). */
    const ultima = obras.findLast(o => o.tipo === 'escada');
    if (ant && altEm(ant) !== altEm(p) && !(ultima && Math.hypot(ultima.x - p.x, ultima.y - Math.min(ant.y, p.y)) < 12)) obras.push({ tipo: 'escada', x: p.x, y: Math.min(ant.y, p.y), ...dir });
  }
  return obras;
}

/* A ESTRADA NA GRADE (3ª rodada do Q7: "fita vetorial de largura fixa e
   curvas lisas que ignoram a grade"). As casas de `celula` px cujo centro
   fica a até `raio` px da curva viram estrada, e a tela a pinta com o MESMO
   autotile do chão — a borda arredondada em degraus de peça, o contorno da
   máscara. Marcado a partir das amostras (cada uma marca o seu entorno), e
   não casa a casa contra a curva inteira. Devolve um Set de "linha,coluna". */
export function casasDaEstrada(amostras, { celula, raio, col, lin }) {
  const casas = new Set(), r2 = raio * raio, alcance = Math.ceil(raio / celula) + 1;
  for (const p of amostras ?? []) {
    const c0 = Math.floor(p.x / celula), l0 = Math.floor(p.y / celula);
    for (let l = Math.max(0, l0 - alcance); l <= Math.min(lin - 1, l0 + alcance); l++) {
      for (let c = Math.max(0, c0 - alcance); c <= Math.min(col - 1, c0 + alcance); c++) {
        const dx = (c + 0.5) * celula - p.x, dy = (l + 0.5) * celula - p.y;
        if (dx * dx + dy * dy <= r2) casas.add(`${l},${c}`);
      }
    }
  }
  return casas;
}
