/* Q1/Q2 · A ARITMÉTICA DA DISTRIBUIÇÃO (R20 — parte da P1.1)
 *
 * ── POR QUE ESTE ARQUIVO É DE VALOR CONHECIDO ──────────────────────────────
 *
 * O §10.9 pede Gini, percentis e share do topo. São contas com definição
 * publicada, e testá-las contra "o que a função devolve hoje" não testa nada:
 * congelaria o meu erro de transcrição junto com o acerto.
 *
 * Então cada caso abaixo tem valor CALCULÁVEL À MÃO, e o comentário mostra a
 * conta. É o mesmo desenho do `filtro-cor.mjs` (R19), pela mesma razão.
 *
 * ── A ESCOLHA DE MÉTODO, E ELA PRECISA SER DITA ────────────────────────────
 *
 * Percentil tem mais de uma definição legítima. Aqui é **posto mais próximo**
 * (nearest-rank), e não interpolação linear, porque o número responde a uma
 * pergunta sobre DINHEIRO DE GENTE: "qual o saldo do jogador na mediana". O
 * posto devolve um saldo que alguém realmente tem. A interpolação devolveria
 * uma média entre dois jogadores — um valor que ninguém tem, apresentado ao
 * operador como se fosse a carteira de alguém.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { percentil, gini, shareDoTopo, razao } from '../engine/distribuicao.mjs';

const perto = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

export function suite() {
  const s = criarSuite('distribuicao');

  /* ── PERCENTIL ─────────────────────────────────────────────────────────*/

  /* Cinco valores: o posto de p é `ceil(p × n)`, limitado a [1, n].
     p10 → ceil(0,5) = 1 → 10 · p50 → ceil(2,5) = 3 → 30 · p90 → ceil(4,5) = 5 */
  s.teste('percentil usa posto mais próximo, e devolve valor que existe', () => {
    const v = [30, 10, 50, 20, 40];   // desordenado de propósito
    igual(percentil(v, 0.10), 10, 'p10 errado');
    igual(percentil(v, 0.50), 30, 'p50 errado');
    igual(percentil(v, 0.90), 50, 'p90 errado');
    /* O TESTE QUE DISTINGUE OS DOIS MÉTODOS. Com quatro valores, a mediana por
       interpolação seria 2,5 — que não está na lista. Por posto é 2. Se este
       teste passar a devolver 2,5, o método mudou sem ninguém declarar. */
    igual(percentil([1, 2, 3, 4], 0.5), 2,
      'a mediana interpolou: devolveu um valor que nenhum jogador tem');
  });

  s.teste('percentil não sai da lista nos extremos', () => {
    const v = [5, 15, 25];
    igual(percentil(v, 0), 5, 'p0 devia ser o menor');
    igual(percentil(v, 1), 25, 'p100 devia ser o maior');
  });

  s.teste('lista vazia não inventa percentil', () => {
    igual(percentil([], 0.5), null, 'percentil de lista vazia devia ser null');
    /* `0` seria pior que `null`: o painel desenharia "mediana: 0 PokéCash" e o
       operador leria isso como economia quebrada, quando o fato é que não há
       jogador nenhum. */
  });

  /* ── GINI ──────────────────────────────────────────────────────────────*/

  /* A fórmula do §10.9 é a de média das diferenças absolutas, na forma
     ordenada:  G = 2·Σ(i·xᵢ)/(n·Σx) − (n+1)/n,  com i começando em 1.

     Para [1,2,3,4,5]:  Σ(i·xᵢ) = 1+4+9+16+25 = 55 · Σx = 15 · n = 5
     G = 2·55/(5·15) − 6/5 = 110/75 − 1,2 = 4/15 ≈ 0,266666… */
  s.teste('Gini bate com a conta feita à mão', () => {
    ok(perto(gini([1, 2, 3, 4, 5]), 4 / 15, 1e-12),
      `Gini de [1,2,3,4,5] deu ${gini([1, 2, 3, 4, 5])}, esperado 4/15`);
  });

  s.teste('Gini de igualdade perfeita é zero', () => {
    for (const v of [[7, 7, 7, 7], [1], [500, 500]])
      ok(perto(gini(v), 0), `Gini de [${v}] devia ser 0, deu ${gini(v)}`);
  });

  /* CONCENTRAÇÃO MÁXIMA: um tem tudo, o resto tem zero. O máximo de Gini numa
     população finita não é 1 — é (n−1)/n. Um teste que exigisse 1 estaria
     exigindo o impossível, e o código passaria a errar para agradá-lo. */
  s.teste('Gini de concentração máxima é (n-1)/n, e não 1', () => {
    igual(gini([0, 0, 0, 0, 10]), 0.8, 'com 5 carteiras o máximo é 4/5');
    igual(gini([0, 100]), 0.5, 'com 2 carteiras o máximo é 1/2');
  });

  s.teste('Gini de população sem dinheiro é zero, e não NaN', () => {
    /* Divisão por Σx = 0. Sem guarda, o painel mostraria "NaN" no dia em que a
       economia estivesse literalmente zerada — que é justamente o dia em que
       alguém está olhando o painel. */
    const g = gini([0, 0, 0]);
    ok(Number.isFinite(g) && g === 0, `Gini de tudo zero deu ${g}`);
    ok(Number.isFinite(gini([])), 'Gini de lista vazia não é finito');
  });

  /* ── SHARE DO TOPO ─────────────────────────────────────────────────────*/

  /* Cinco carteiras, topo de 20% = 1 carteira. A maior é 96, total 100. */
  s.teste('share do topo soma as maiores, não as primeiras', () => {
    const v = [1, 96, 1, 1, 1];   // a maior NÃO está na frente
    ok(perto(shareDoTopo(v, 0.20), 0.96),
      `top 20% deu ${shareDoTopo(v, 0.20)}, esperado 0,96`);
  });

  /* ARREDONDAMENTO PARA CIMA, e é decisão: com 5 carteiras, "top 1%" é 0,05
     carteira. Zero carteiras devolveria 0 e diria "o topo não tem nada", que é
     falso. Uma carteira é a menor amostra honesta do topo. */
  s.teste('o topo nunca é vazio quando há gente', () => {
    const v = [10, 20, 70];
    ok(shareDoTopo(v, 0.01) > 0,
      'top 1% de 3 carteiras deu zero — arredondou o topo para fora');
    ok(perto(shareDoTopo(v, 0.01), 0.7), 'top 1% devia ser a maior carteira');
  });

  s.teste('share do topo com todo mundo é 1', () => {
    ok(perto(shareDoTopo([3, 1, 2], 1), 1), 'o share de 100% devia ser 1');
  });

  s.teste('share sem dinheiro é zero, e não NaN', () => {
    ok(shareDoTopo([0, 0], 0.5) === 0, 'share de tudo zero devia ser 0');
    ok(shareDoTopo([], 0.5) === 0, 'share de lista vazia devia ser 0');
  });

  /* ── RAZÃO (FSR e velocity saem daqui) ─────────────────────────────────*/

  s.teste('razão devolve null quando o denominador é zero', () => {
    igual(razao(100, 0), null,
      'razão com denominador zero devia ser null, e não Infinity — o painel ' +
      'desenharia uma barra infinita para "ainda não houve sink nenhum"');
    igual(razao(0, 0), null, 'zero sobre zero devia ser null');
    ok(perto(razao(300, 150), 2), 'razão simples errada');
  });

  /* A ORDEM DOS ARGUMENTOS IMPORTA, e o FSR invertido é uma das sabotagens
     plantadas: `sinks/faucets` continua plausível e diz o CONTRÁRIO. */
  s.teste('razão não é simétrica', () => {
    ok(razao(300, 150) !== razao(150, 300),
      'razão(a,b) e razão(b,a) deram o mesmo — a ordem não está sendo respeitada');
  });

  return s;
}
