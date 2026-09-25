/* Q1/Q3 · O ÍCONE DE CADA ITEM (camada 0).
 *
 * ── A AFIRMAÇÃO QUE ESTE ARQUIVO GANHOU, E POR QUE ──────────────────────
 *
 * O dono reprovou a qualidade dos ícones duas vezes. Na segunda ele deu a
 * comparação que resolveu:
 *
 *   > "os ícones que foram aplicadas na aba de 'quem apareceu' ficaram ótimos,
 *   >  então você precisa achar essa qualidade"
 *
 * A causa era aritmética, e nada tinha a ver com a arte: a mochila desenhava a
 * **34 px e 30 px** ícones de uma folha nativa de **32**. Nenhum dos dois é
 * múltiplo, então o navegador inventa pixel intermediário — e pixel
 * intermediário em pixel art é exatamente o borrão que ele viu.
 *
 *   > **Arte que nasceu em 32 px só fica nítida em 32 ou 64.**
 *
 * A afirmação 1 é essa, e ela é a razão de esta suíte existir. É a mesma regra
 * que o canvas do bioma já seguia — *"ampliado inteiro, sem suavização"* — que
 * valia para o mundo e não estava valendo para a mochila.
 *
 * ── AS OUTRAS ────────────────────────────────────────────────────────────
 *
 * 2. **TODO ITEM CONFIRMADO DO PACK TEM DESENHO.** Uma linha sem ícone no meio
 *    de linhas com ícone é pior que a mochila inteira sem: a falta vira ruído
 *    em vez de padrão.
 * 3. **A POSIÇÃO ESCALA JUNTO COM A FOLHA.** O erro clássico do recorte por
 *    CSS, e ele já custou uma rodada inteira na folha de decoração.
 * 4. **DUAS CASAS NUNCA APONTAM PARA O MESMO DESENHO.**
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  LADO, COLUNAS, LINHAS, TAMANHOS, tamanhoValido,
  usarCatalogo, temIcone, casaDe, estiloItem,
} from '../app/modules/itens-icone.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const numeros = (est, prop) => {
  const m = new RegExp(`${prop}:([^;]+)`).exec(est ?? '');
  return m ? (m[1].match(/-?[\d.]+/g) ?? []).map(Number) : null;
};

export function suite() {
  const s = criarSuite('itens-icone');

  /* --- 1 · O TAMANHO É INTEIRO ------------------------------------------ */

  s.teste('pedir 34 px devolve 32 — pixel art não aceita tamanho quebrado', () => {
    usarCatalogo(kanto.catalogo);
    for (const [pedido, esperado] of [[34, 32], [30, 32], [32, 32], [48, 32],
                                      [64, 64], [63, 32], [96, 96], [200, 96]])
      igual(tamanhoValido(pedido), esperado,
        `pedir ${pedido} px devolveu ${tamanhoValido(pedido)}. Só ${TAMANHOS.join(', ')} ` +
        'não borram: a folha é nativa de 32, e qualquer valor fora dos múltiplos ' +
        'faz o navegador inventar pixel intermediário. Foi assim que a mochila ' +
        'ficou borrada com a arte certa — o dono viu, eu não.');
  });

  s.teste('o estilo carrega a nitidez junto com o tamanho', () => {
    usarCatalogo(kanto.catalogo);
    const id = (kanto.catalogo ?? []).find(i => i.comoAchei !== 'falta').id;
    const est = estiloItem(id, 34);
    ok(/image-rendering\s*:\s*pixelated/.test(est),
      `o estilo saiu sem \`image-rendering: pixelated\`: ${est}. Tamanho e ` +
      'suavização são a MESMA decisão — separá-los é como um dos dois se perde ' +
      'na próxima refatoração, e aí a arte volta a borrar sem ninguém ter mexido ' +
      'no tamanho.');
    ok(/width:32px/.test(est) && /height:32px/.test(est),
      `pedindo 34 o bloco não saiu com 32px: ${est}`);
  });

  /* --- 2 · TODO ITEM CONFIRMADO TEM DESENHO ----------------------------- */

  s.teste('todo item confirmado do catálogo tem ícone, e os "falta" não têm', () => {
    const n = usarCatalogo(kanto.catalogo);
    const confirmados = (kanto.catalogo ?? []).filter(i => i.comoAchei !== 'falta');
    igual(n, confirmados.length,
      `o catálogo tem ${confirmados.length} itens confirmados e ${n} entraram no mapa`);
    for (const i of confirmados)
      ok(temIcone(i.id),
        `"${i.nome}" está confirmado e não tem ícone. Uma linha sem desenho no ` +
        'meio de linhas com desenho é pior que a mochila inteira sem: a falta ' +
        'vira ruído em vez de padrão, e o jogador volta a ler cada linha.');
    for (const i of (kanto.catalogo ?? []).filter(x => x.comoAchei === 'falta'))
      ok(!temIcone(i.id),
        `"${i.nome}" está marcado como não identificado e mesmo assim tem ícone. ` +
        'Um ícone errado é PIOR que nenhum: ele parece certo, e ninguém confere ' +
        'o que parece certo.');
  });

  s.teste('sem catálogo nenhum, nada quebra — só não há ícone', () => {
    igual(usarCatalogo(null), 0);
    igual(temIcone('fogo'), false);
    igual(estiloItem('fogo'), null,
      'devolveu estilo sem catálogo carregado. Quem chama testa por nulo para ' +
      'cair no texto; um estilo com posição indefinida mostraria a folha inteira.');
    usarCatalogo(kanto.catalogo);
  });

  /* --- 3 · A POSIÇÃO ESCALA JUNTO -------------------------------------- */

  s.teste('dobrar o tamanho dobra a folha E a posição', () => {
    usarCatalogo(kanto.catalogo);
    const alvo = (kanto.catalogo ?? []).find(i => i.comoAchei !== 'falta' && i.icone >= COLUNAS);
    ok(alvo, 'nenhum item confirmado fora da primeira linha — o teste não afirma nada');
    const a = estiloItem(alvo.id, 32), b = estiloItem(alvo.id, 64);
    const fa = numeros(a, 'background-size'), fb = numeros(b, 'background-size');
    const pa = numeros(a, 'background-position'), pb = numeros(b, 'background-position');
    igual(fb[0], fa[0] * 2, 'a folha não dobrou de largura');
    igual(pb[0], pa[0] * 2,
      `a folha dobrou e a posição horizontal ficou em ${pb[0]} em vez de ${pa[0] * 2}. ` +
      'É o erro clássico do recorte por CSS: cada peça sai deslocada um pouco ' +
      'mais que a anterior, então a primeira parece certa e o defeito só aparece ' +
      'no fim da fileira — foi assim na folha de decoração.');
    igual(pb[1], pa[1] * 2, 'a posição vertical não acompanhou a escala');
  });

  s.teste('a casa escolhida é a casa desenhada', () => {
    usarCatalogo(kanto.catalogo);
    for (const i of (kanto.catalogo ?? []).filter(x => x.comoAchei !== 'falta')) {
      const p = numeros(estiloItem(i.id, 32), 'background-position');
      igual(p[0], -(i.icone % COLUNAS) * LADO, `${i.nome}: coluna errada`);
      igual(p[1], -Math.floor(i.icone / COLUNAS) * LADO, `${i.nome}: linha errada`);
      ok(i.icone < COLUNAS * LINHAS, `${i.nome} aponta para fora da folha`);
    }
  });

  /* --- 4 · NENHUMA COLISÃO --------------------------------------------- */

  s.teste('duas casas nunca apontam para o mesmo desenho', () => {
    usarCatalogo(kanto.catalogo);
    const vistos = new Map();
    for (const i of (kanto.catalogo ?? []).filter(x => x.comoAchei !== 'falta')) {
      const c = casaDe(i.id);
      ok(!vistos.has(c),
        `"${i.nome}" e "${vistos.get(c)}" dividem a casa ${c}. Duas coisas ` +
        'diferentes com o mesmo desenho é exatamente o que um ícone existe para ' +
        'impedir.');
      vistos.set(c, i.nome);
    }
  });

  s.teste('L-160: a parte de estilhaço usa o ícone do item de origem', () => {
    usarCatalogo(kanto.catalogo);
    const pedra = (kanto.catalogo ?? []).find(i => i.porta === 'drop' && temIcone(i.id));
    ok(pedra, 'nenhum item de drop com ícone — o teste perdeu o que medir');
    igual(estiloItem('est:' + pedra.id), estiloItem(pedra.id),
      'a parte de estilhaço ficou sem ícone, ou com outro — a mochila mostraria um quadrado vazio');
  });

  return s;
}
