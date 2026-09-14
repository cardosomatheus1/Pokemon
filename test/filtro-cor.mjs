/* Q1/Q2 · O PORTÃO DE CONTRASTE ENXERGA `filter` (R19 — fecha a L-045)
 *
 * ── O QUE A LACUNA REGISTRAVA ──────────────────────────────────────────────
 *
 * O portão de contraste lê a cor DECLARADA e soma os fundos dos ancestrais.
 * Exato para tudo que ele media, e cego para `filter`.
 *
 * `.plate.dead{filter:grayscale(1) brightness(.62)}` escurece a barra inteira,
 * texto incluído. Por isso o R6 não acrescentou a barra de vida aos alvos: um
 * alvo que devolve o número errado é pior que um alvo ausente.
 *
 * ── POR QUE ESTE ARQUIVO É DE ARITMÉTICA, E NÃO DE NAVEGADOR ──────────────
 *
 * Ler o pixel exigiria decodificar PNG, e o projeto não tem dependência. Mas há
 * razão melhor: um pixel é uma AMOSTRA, e texto é antialiasado — a borda de uma
 * letra devolve mistura. A conta devolve a cor do texto, que é o que a razão de
 * contraste pergunta.
 *
 * As fórmulas são as da especificação de Filter Effects. Testá-las é testar se
 * eu as transcrevi certo, e é por isso que os casos abaixo são de valor
 * CONHECIDO — não de "o que a função devolve hoje".
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { aplicarFiltro, filtroAcumulado } from '../app/modules/filtro-cor.mjs';

const BRANCO = [255, 255, 255], PRETO = [0, 0, 0], VERM = [255, 0, 0];
const perto = (a, b, tol = 1) => Math.abs(a - b) <= tol;

export function suite() {
  const s = criarSuite('filtro-cor');

  s.teste('sem filtro a cor não muda', () => {
    for (const c of ['', 'none', null, undefined])
      igual(aplicarFiltro(VERM, c).join(','), VERM.join(','), `\`${c}\` mexeu na cor`);
  });

  /* `brightness` é multiplicação pura, e é a metade da cadeia que a barra de
     vida usa. Valor conhecido: metade de branco é cinza-médio. */
  s.teste('brightness multiplica cada canal', () => {
    igual(aplicarFiltro(BRANCO, 'brightness(.5)').join(','), '128,128,128',
      'brightness(.5) não deu o cinza médio');
    igual(aplicarFiltro(BRANCO, 'brightness(0)').join(','), '0,0,0', 'brightness(0) não zerou');
    /* Porcentagem e fator são a MESMA coisa, e o valor computado do navegador
       usa ora um ora outro. */
    igual(aplicarFiltro(BRANCO, 'brightness(50%)').join(','),
          aplicarFiltro(BRANCO, 'brightness(.5)').join(','),
      'porcentagem e fator deram resultados diferentes');
  });

  /* `grayscale(1)` tem valor conhecido pela luminância da especificação:
     vermelho puro vira 0,2126 × 255 ≈ 54. */
  s.teste('grayscale(1) usa a luminância da especificação', () => {
    const [r, g, b] = aplicarFiltro(VERM, 'grayscale(1)');
    ok(perto(r, 54) && r === g && g === b,
      `vermelho em cinza deu [${r},${g},${b}] — esperado ~54 nos três canais`);
  });

  s.teste('grayscale(0) e saturate(1) são identidade', () => {
    for (const f of ['grayscale(0)', 'saturate(1)'])
      ok(aplicarFiltro(VERM, f).every((c, i) => perto(c, VERM[i])),
        `${f} mexeu numa cor que não devia mexer`);
  });

  /* A CADEIA É APLICADA EM ORDEM, e a ordem muda o resultado. Este é o caso
     real da barra de vida do derrotado. */
  s.teste('a cadeia é aplicada na ordem escrita', () => {
    const cadeia = 'grayscale(1) brightness(.62)';
    const [r, g, b] = aplicarFiltro([230, 234, 242], cadeia);
    ok(r === g && g === b, `o cinza não ficou neutro: [${r},${g},${b}]`);
    ok(perto(r, Math.round(233 * 0.62), 3),
      `[${r},${g},${b}] não bate com a luminância escurecida a 62%`);
  });

  /* A ORDEM PRECISA IMPORTAR DE VERDADE, e provar isso exige um par que NÃO
     comuta. `grayscale` e `brightness` comutam — os dois são lineares —, e um
     teste com eles passaria mesmo numa implementação que aplicasse a cadeia ao
     contrário. `invert` e `brightness` não comutam:
         invert → brightness :  255 → 0   → 0
         brightness → invert :  255 → 128 → 127 */
  s.teste('trocar a ordem da cadeia muda o resultado', () => {
    const a = aplicarFiltro(BRANCO, 'invert(1) brightness(.5)');
    const b = aplicarFiltro(BRANCO, 'brightness(.5) invert(1)');
    ok(a.join(',') !== b.join(','),
      `a cadeia deu o mesmo nos dois sentidos ([${a}] e [${b}]) — a ordem não está sendo respeitada`);
    igual(a.join(','), '0,0,0', 'invert antes de brightness não zerou');
    ok(perto(b[0], 127), `brightness antes de invert deu ${b[0]}, esperado ~127`);
  });

  s.teste('invert(1) espelha cada canal', () => {
    igual(aplicarFiltro(PRETO, 'invert(1)').join(','), '255,255,255', 'invert(1) do preto');
    igual(aplicarFiltro(BRANCO, 'invert(1)').join(','), '0,0,0', 'invert(1) do branco');
  });

  s.teste('contrast(0) leva tudo ao cinza médio', () => {
    for (const c of [BRANCO, PRETO, VERM])
      ok(aplicarFiltro(c, 'contrast(0)').every(v => perto(v, 128)),
        `contrast(0) de [${c}] não foi ao cinza médio`);
  });

  /* NENHUM CANAL SAI DA FAIXA. Sem travar, `brightness(3)` devolveria 765 e a
     razão de contraste sairia de um número que não existe em tela nenhuma. */
  s.teste('nenhum canal escapa de 0..255', () => {
    for (const f of ['brightness(3)', 'contrast(9)', 'invert(1) brightness(4)'])
      ok(aplicarFiltro([200, 40, 90], f).every(v => v >= 0 && v <= 255),
        `${f} devolveu canal fora da faixa`);
  });

  /* AS TRÊS QUE SÃO IDENTIDADE DE PROPÓSITO, e a razão está no cabeçalho do
     módulo: `blur` e `drop-shadow` misturam vizinhos, que uma cor sozinha não
     tem; `opacity` é composição contra o fundo, e o portão já a faz. Aplicá-la
     aqui a aplicaria duas vezes. */
  s.teste('blur, drop-shadow e opacity não mexem numa cor sozinha', () => {
    for (const f of ['blur(4px)', 'drop-shadow(0 0 4px #000)', 'opacity(.5)'])
      igual(aplicarFiltro(VERM, f).join(','), VERM.join(','), `${f} mexeu na cor`);
  });

  /* Filtro desconhecido é IGNORADO, e não é erro: a cadeia pode ganhar função
     nova num Chromium novo, e reprovar o portão por isso seria reprovar o
     projeto por causa de uma atualização do navegador. */
  s.teste('função desconhecida é ignorada, e não quebra', () => {
    igual(aplicarFiltro(VERM, 'hue-rotate(90deg) brightness(.5)').join(','), '128,0,0',
      'a função desconhecida atrapalhou a que veio depois');
  });

  /* `filter` não herda, mas COMPÕE: um filtro no ancestral vale para o que está
     dentro. A ordem é do mais distante para o mais próximo, que é a ordem em
     que o navegador pinta. */
  s.teste('as cadeias dos ancestrais se somam, e as vazias somem', () => {
    igual(filtroAcumulado(['grayscale(1)', 'none', '', 'brightness(.5)']),
          'grayscale(1) brightness(.5)', 'a cadeia acumulada saiu errada');
    igual(filtroAcumulado([]), '', 'lista vazia não deu cadeia vazia');
    igual(filtroAcumulado(['none', 'none']), '', 'só `none` devia dar cadeia vazia');
  });

  return s;
}
