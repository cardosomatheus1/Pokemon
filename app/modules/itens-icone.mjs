/* O ÍCONE DE CADA ITEM (camada 0).
 *
 * ── O TAMANHO É MÚLTIPLO INTEIRO DE 32, E ISSO NÃO É DETALHE ─────────────
 *
 * O dono reprovou a qualidade duas vezes, e a segunda com a comparação certa:
 *
 *   > "os ícones que foram aplicadas na aba de 'quem apareceu' ficaram ótimos,
 *   >  então você precisa achar essa qualidade"
 *
 * Os de cabeça ficaram bons porque são desenhados num tamanho que o navegador
 * consegue reduzir limpo. Os de item estavam sendo desenhados a **34 px e 30
 * px** — de uma folha nativa de 32.
 *
 * Trinta e quatro não é múltiplo de trinta e dois. O navegador tem de inventar
 * pixel intermediário, e pixel intermediário em pixel art é exatamente o borrão
 * que ele viu. Trinta também não: reduzir 32 para 30 apaga duas fileiras
 * inteiras e engrossa o resto.
 *
 * > **Arte que nasceu em 32 px só fica nítida em 32 ou 64.** Qualquer valor no
 * > meio é uma reamostragem, e reamostragem de pixel art é sempre visível.
 *
 * É a MESMA regra que o canvas do bioma já segue — *"pixel de 16, ampliado
 * inteiro, sem suavização"*. Ela valia para o mundo e não estava valendo para a
 * mochila; agora vale para os dois.
 *
 * `TAMANHOS` é a lista fechada do que se pode pedir. Pedir 34 devolve 32.
 *
 * ── A CHAVE É O ID, E O ÍNDICE VEM DO PACK ───────────────────────────────
 *
 * A folha tem 368 ícones e nenhum nome. Indexar por "casa 3 da folha de
 * terceiro" faria o significado morar num número que ninguém lê — e trocar a
 * folha moveria os itens todos de uma vez, em silêncio.
 *
 * Então o catálogo do pack (`content/itens_v1.mjs`) diz o índice de cada item,
 * e aqui a chave é o `id`. É a mesma fronteira dos ícones de cabeça: lá a chave
 * é a dex, aqui é o id.
 */
export const FOLHA = '../assets/icones/itens.png';

/* O lado nativo da folha, e a grade dela. Vêm de `normalizar-itens.mjs`, que
   preserva a grade da folha do dono: 23 colunas por 16 linhas. */
export const LADO = 32;
export const COLUNAS = 23;
export const LINHAS = 17;   /* 16 da folha do dono + 1 da nossa arte */

/* Os únicos tamanhos que não borram. Ver a nota longa acima. */
export const TAMANHOS = [32, 64, 96];

export const tamanhoValido = t => {
  const n = Number(t) || LADO;
  /* Arredonda para BAIXO, para o ícone caber onde o desenho reservou espaço —
     um ícone que estoura o quadro é pior que um ícone menor. */
  let escolhido = TAMANHOS[0];
  for (const v of TAMANHOS) if (v <= n) escolhido = v;
  return escolhido;
};

/* O mapa id → índice. Preenchido pelo PACK, e não escrito aqui: nome e posição
   de item são nomenclatura de tema, e o portão `conteudo` já cobrou isso quatro
   vezes neste projeto. */
let CASA = Object.create(null);

export function usarCatalogo(catalogo) {
  CASA = Object.create(null);
  for (const i of catalogo ?? [])
    if (Number.isInteger(i?.icone) && i.comoAchei !== 'falta') CASA[i.id] = i.icone;
  return Object.keys(CASA).length;
}

export const temIcone = id => Object.prototype.hasOwnProperty.call(CASA, id);
export const casaDe = id => (temIcone(id) ? CASA[id] : -1);

/* Recorte por CSS, como os ícones de cabeça, e pela mesma razão: o elemento
   continua sendo um bloco que o resto do CSS entende.
 *
 * `image-rendering: pixelated` vai JUNTO no estilo, e não no CSS da página: o
 * tamanho e a suavização são a MESMA decisão, e separá-los é como um dos dois
 * se perde na próxima refatoração. */
export function estiloItem(id, tam = LADO) {
  if (!temIcone(id)) return null;
  const i = CASA[id];
  const t = tamanhoValido(tam);
  const k = t / LADO;
  return `background-image:url('${FOLHA}');` +
         `background-size:${COLUNAS * LADO * k}px ${LINHAS * LADO * k}px;` +
         `background-position:${-(i % COLUNAS) * LADO * k}px ${-Math.floor(i / COLUNAS) * LADO * k}px;` +
         `width:${t}px;height:${t}px;background-repeat:no-repeat;` +
         `image-rendering:pixelated`;
}
