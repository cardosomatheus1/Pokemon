/* OS ÍCONES DE CABEÇA — uma folha, N recortes (camada 0).
 *
 * ── DE ONDE VEIO O PEDIDO ────────────────────────────────────────────────
 *
 *   > "No campo de 'quem apareceu' substitua o gif estático por esses ícones
 *   >  que estou te enviando, se atente a colocar cada ícone no pokémon correto
 *   >  a imagem segue a ordem da pokedex certinha."
 *
 * O painel de encontros mostrava o retrato grande, e ali ele não serve: aquela
 * tela é uma LISTA DE DECISÕES — quatro, cinco criaturas esperando uma bola
 * cada. Retrato grande em lista rouba o espaço da escolha, que é onde a atenção
 * tem de estar. Ícone de cabeça é a forma que aquela tela pede.
 *
 * ── A GRADE É UMA CONTA, E NÃO UMA TABELA ────────────────────────────────
 *
 * A folha tem colunas de lado fixo, em ordem de dex. Isso torna o recorte duas
 * linhas de aritmética:
 *
 *     linha  = (dex - 1) / colunas
 *     coluna = (dex - 1) % colunas
 *
 * Uma tabela de 151 pares seria 151 oportunidades de errar um, e o erro seria
 * exatamente o que o dono pediu para eu evitar. Uma conta ou está certa para
 * todos ou está errada para todos — e o teste distingue as duas coisas em
 * milissegundos.
 *
 * ── A FOLHA VEM DO PACK ──────────────────────────────────────────────────
 *
 * O nome do arquivo carrega a região, e o portão do §0.3 reprovou a primeira
 * versão por isso: identificador da franquia não existe fora do pack.
 *
 * A fronteira que ficou é a mesma de `fauna.mjs` — o pack diz QUAL folha e até
 * onde ela vai; este arquivo sabe recortar uma folha de N colunas e não sabe o
 * nome de ninguém. O pack original terá a dele, com outra contagem, e nada aqui
 * muda.
 *
 * ── O QUE ACONTECE FORA DA FOLHA ─────────────────────────────────────────
 *
 * `temIcone` diz não, e quem chama volta ao retrato. Devolver um recorte fora
 * da folha desenharia um quadrado transparente — um buraco silencioso na lista,
 * que é pior que a arte antiga.
 */

/* A RESERVA existe para pack sem `icones` não derrubar a tela: `quantos: 0` faz
   `temIcone` recusar todo mundo, e a chamada cai no retrato. */
const RESERVA = { arq: null, lado: 128, colunas: 12, quantos: 0 };

export const folhaDe = pack => pack?.icones ?? RESERVA;

export function temIcone(pack, dex) {
  const f = folhaDe(pack);
  return !!f.arq && Number.isInteger(dex) && dex >= 1 && dex <= f.quantos;
}

/* A posição do recorte, em px da folha. */
export function recorte(pack, dex) {
  if (!temIcone(pack, dex)) return null;
  const f = folhaDe(pack), i = dex - 1;
  return { x: (i % f.colunas) * f.lado, y: Math.floor(i / f.colunas) * f.lado, lado: f.lado };
}

/* ── O RECORTE POR CSS, E NÃO POR CANVAS ──────────────────────────────────
 *
 * `background-position` com `background-size` proporcional: o navegador faz a
 * redução com a qualidade dele, e o elemento continua sendo um bloco que o
 * resto do CSS entende — cursor, foco, transição, tudo de graça.
 *
 * Recortar em canvas custaria um `drawImage` por ícone a cada redesenho da
 * lista, e devolveria uma imagem que o CSS não sabe estilizar.
 *
 * `tam` é o lado final na tela. A folha inteira é escalada na mesma proporção,
 * e por isso a POSIÇÃO também — daí `-x * k`, e não `-x`. Escalar a folha e
 * esquecer a posição é o erro clássico deste recorte: os ícones aparecem, e
 * cada um mostra o vizinho errado conforme se afasta da primeira casa.
 */
export function estiloIcone(pack, dex, tam = 48) {
  const r = recorte(pack, dex);
  if (!r) return null;
  const f = folhaDe(pack), k = tam / f.lado;
  const linhas = Math.ceil(f.quantos / f.colunas);
  return `background-image:url('${f.arq}');` +
         `background-size:${f.colunas * f.lado * k}px ${linhas * f.lado * k}px;` +
         `background-position:${-r.x * k}px ${-r.y * k}px;` +
         `width:${tam}px;height:${tam}px;background-repeat:no-repeat`;
}
