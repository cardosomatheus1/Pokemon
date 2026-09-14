/* Q1/Q2 · A ORDEM EM QUE AS POKÉBOLAS ABREM (R23)
 *
 * ── O QUE ESTAVA ERRADO ────────────────────────────────────────────────────
 *
 * As bolas já abriam UMA A UMA — o `ENTRY.STAGGER` sempre existiu. O que não
 * existia era ordem: `releaseAll` embaralhava as entidades com Fisher-Yates
 * antes de enfileirar, então a abertura pulava de um canto ao outro da arena.
 *
 * O olho não consegue acompanhar doze aberturas em ordem aleatória. Ele
 * acompanha uma volta.
 *
 * ── POR QUE ISTO É UM MÓDULO PURO ──────────────────────────────────────────
 *
 * Porque "a ordem está certa?" é uma pergunta sobre ÂNGULO, e ângulo se mede.
 * Dentro do `releaseAll` ela só poderia ser respondida olhando a tela e
 * confiando na memória de quem olhou — que é exatamente como a ordem se perdeu
 * na migração sem ninguém notar.
 *
 * ── A CONVENÇÃO DE ÂNGULO, E ELA PRECISA SER DITA ──────────────────────────
 *
 * No canvas o Y CRESCE PARA BAIXO. Então `atan2(dy, dx)` crescente, que na
 * matemática de papel é anti-horário, na tela é HORÁRIO. É a mesma conta com
 * sinal invertido pelo eixo, e é o tipo de coisa que se acerta por acidente e
 * se quebra na primeira refatoração — por isso está testada por posição
 * cardinal, e não por número.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { ordemHoraria } from '../app/modules/bolas-dados.mjs';

/* Uma entidade só precisa de x, y e um nome para o teste conseguir segui-la. */
const em = (nome, x, y) => ({ nome, x, y });
const nomes = lista => lista.map(e => e.nome).join(' ');

export function suite() {
  const s = criarSuite('ordem-bolas');

  /* ── A VOLTA ───────────────────────────────────────────────────────────*/

  /* Quatro pontos cardeais, embaralhados na entrada. Começando às 12 h e indo
     no sentido do relógio: topo → direita → base → esquerda. */
  s.teste('a ordem começa no topo e segue o sentido do relógio', () => {
    const fora = ordemHoraria([
      em('esquerda', -10, 0), em('base', 0, 10),
      em('topo', 0, -10), em('direita', 10, 0),
    ], 0, 0);
    igual(nomes(fora), 'topo direita base esquerda',
      'a volta não é horária começando às 12 h. No canvas o Y cresce para ' +
      'BAIXO, então `base` é y positivo e vem DEPOIS de `direita`.');
  });

  /* Oito posições, que é o teste que pega meia-volta invertida — com quatro
     pontos, horário e anti-horário coincidem em dois deles. */
  s.teste('as oito posições da rosa dos ventos saem em ordem', () => {
    const p = [
      em('N', 0, -10), em('NE', 7, -7), em('L', 10, 0), em('SE', 7, 7),
      em('S', 0, 10), em('SO', -7, 7), em('O', -10, 0), em('NO', -7, -7),
    ];
    /* embaralha de forma determinística antes de ordenar */
    const bagunca = [p[3], p[6], p[0], p[5], p[1], p[7], p[2], p[4]];
    igual(nomes(ordemHoraria(bagunca, 0, 0)), 'N NE L SE S SO O NO',
      'a rosa dos ventos não saiu em sentido horário');
  });

  /* O CENTRO NÃO É A ORIGEM na arena de verdade: é `(W/2, H/2)`. Se a conta
     ignorar o centro recebido, a ordem vira lixo assim que a arena não estiver
     centrada em zero — que é sempre. */
  s.teste('a volta é em torno do centro que recebe, e não da origem', () => {
    const centro = [200, 120];
    const fora = ordemHoraria([
      em('esquerda', 190, 120), em('base', 200, 130),
      em('topo', 200, 110), em('direita', 210, 120),
    ], ...centro);
    igual(nomes(fora), 'topo direita base esquerda',
      'a ordem ignorou o centro recebido e mediu a partir da origem');
  });

  /* ── NADA SE PERDE, NADA SE DUPLICA ───────────────────────────────────*/

  /* A propriedade que importa mais que a ordem: são DOZE lutadores, e os doze
     têm que abrir. Uma ordenação que perdesse um deixaria um lutador dentro da
     bola para sempre — e ele seguiria lutando, invisível. */
  s.teste('a ordem é uma permutação: ninguém some, ninguém abre duas vezes', () => {
    const doze = Array.from({ length: 12 }, (_, i) =>
      em(`f${i}`, Math.cos(i) * 40, Math.sin(i * 1.7) * 30));
    const fora = ordemHoraria(doze, 0, 0);
    igual(fora.length, 12, 'a ordem mudou de tamanho');
    igual([...new Set(fora)].length, 12, 'alguém aparece duas vezes na ordem');
    for (const e of doze)
      ok(fora.includes(e), `\`${e.nome}\` sumiu da ordem — ficaria preso na bola`);
  });

  s.teste('a lista de entrada não é modificada', () => {
    const original = [em('a', 0, 10), em('b', 0, -10)];
    const copia = [...original];
    ordemHoraria(original, 0, 0);
    igual(nomes(original), nomes(copia),
      'a função embaralhou a lista de quem a chamou — `S.ents` é a lista viva ' +
      'da arena, e reordená-la mudaria o índice de cada lutador');
  });

  /* ── OS CASOS QUE A ARENA PRODUZ ──────────────────────────────────────*/

  /* Dois lutadores no MESMO ângulo é normal: a dispersão os coloca em raios
     diferentes na mesma direção. A ordem entre eles não importa, mas os dois
     têm que sair — e não pode quebrar. */
  s.teste('empate de ângulo não perde ninguém', () => {
    const fora = ordemHoraria([em('perto', 0, -5), em('longe', 0, -50)], 0, 0);
    igual(fora.length, 2, 'o empate de ângulo comeu um lutador');
  });

  /* Alguém exatamente no centro não tem ângulo — `atan2(0,0)` é 0. Não pode
     virar `NaN` nem sumir. */
  s.teste('quem está no centro exato não quebra a ordem', () => {
    const fora = ordemHoraria([em('centro', 0, 0), em('topo', 0, -10)], 0, 0);
    igual(fora.length, 2, 'o lutador no centro sumiu');
  });

  s.teste('lista vazia devolve lista vazia', () => {
    igual(ordemHoraria([], 0, 0).length, 0, 'lista vazia virou outra coisa');
  });

  /* ── E ALGUÉM PRECISA USÁ-LA ───────────────────────────────────────────
   *
   * A conta acima pode estar perfeita e a arena continuar abrindo em ordem
   * aleatória — basta ninguém chamá-la. É a família do `D-028`, e neste
   * projeto ela já apareceu sete vezes.
   *
   * O que se cobra: `releaseAll` usa `ordemHoraria`, e o embaralhamento que
   * estava ali NÃO voltou. As duas coisas, porque acrescentar a chamada sem
   * remover o sorteio deixaria o sorteio decidir. */
  s.teste('a entrada da arena usa a volta, e não sorteia mais a ordem', () => {
    const fonte = readFileSync(
      new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    const bloco = fonte.slice(fonte.indexOf('function releaseAll'),
                              fonte.indexOf('function passoEntrada'));
    ok(bloco.length > 40, 'não achei o `releaseAll` para conferir');
    ok(/ordemHoraria\s*\(/.test(bloco),
      'o `releaseAll` não chama `ordemHoraria`. A conta pode estar certa e a ' +
      'arena continuar abrindo em ordem aleatória — ninguém sente falta de uma ' +
      'função que não é chamada.');
    /* A PROIBIÇÃO VALE NA LINHA DA ORDEM, e não no bloco inteiro — e a
       primeira versão deste teste errou nisso. `enfeite()` é usado ali ao lado,
       legitimamente, para a semente do clarão de entrada; bani-lo no bloco todo
       reprovava o código certo.
       O que não pode ter sorteio é a decisão de QUEM ABRE PRIMEIRO. */
    const linhaOrdem = (bloco.match(/^.*\bconst order\b.*$/m) || [''])[0];
    ok(linhaOrdem.includes('ordemHoraria'),
      `a ordem é decidida por: "${linhaOrdem.trim()}"`);
    for (const sorteio of ['coreo(', 'enfeite(', 'Math.random(', '.sort('])
      ok(!linhaOrdem.includes(sorteio),
        `\`${sorteio}\` decide a ordem de abertura. Ela é GEOMÉTRICA: sai da ` +
        `posição, que já veio da raiz da rodada, e não gasta sorteio nenhum.`);
  });

  /* ═══ R33 · O OLHO PRECISA VER O CÍRCULO ANTES DA VOLTA COMEÇAR ═════════
   *
   * A abertura em volta existe para ser ACOMPANHADA. Ela só cumpre isso se o
   * jogador souber onde as doze bolas estão antes de a primeira abrir — sem
   * esse instante de leitura, a volta vira um piscar de doze pontos.
   *
   * O que havia era o véu do `BATTLE!!` sumindo com `display:none` — no quadro,
   * sem transição — e logo em seguida o `RING_LEAD` de 0,35 s, durante o qual o
   * anel da primeira bola JÁ ESTÁ DESENHANDO. Na prática, zero.
   *
   * O deslocamento tem de entrar nas DUAS contas: quando a entrada começa e
   * quando a fase termina. Somar só num lado cortaria a última bola — o
   * jogador veria onze abrirem e a décima segunda aparecer já aberta. */
  s.teste('as pokébolas ficam visíveis antes de a primeira abrir', () => {
    const fases = readFileSync(new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    const decl = fases.match(/const PAUSA_BOLAS = ([\d.]+);/);
    ok(decl, 'a `PAUSA_BOLAS` sumiu do fases.mjs');
    ok(+decl[1] >= 0.3,
      `a pausa é de ${decl[1]}s. Abaixo de ~0,3s ela não chega a ser um instante ` +
      `de leitura — e o anel da primeira bola já começa a desenhar nela.`);
    ok(fases.includes('  PAUSA_BOLAS,'),
      'a `PAUSA_BOLAS` não é exportada; o laço não tem como respeitá-la');
  });

  s.teste('a pausa entra nas duas contas do laço, e não em uma', () => {
    const laco = readFileSync(new URL('../app/modules/loop.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    const inicio = laco.match(/passoEntrada\(([^)]*)\)/);
    ok(inicio, 'o `passoEntrada` sumiu do laço');
    ok(/PAUSA_BOLAS/.test(inicio[1]),
      `a entrada começa em \`${inicio[1]}\`, sem a pausa — o véu sai e a bola ` +
      `abre no mesmo instante`);
    const fim = laco.match(/S\.clock >= ([^)]*entryTotalTime[^)]*\))/);
    ok(fim, 'a condição de fim da contagem sumiu do laço');
    ok(/PAUSA_BOLAS/.test(fim[1]),
      `a fase termina em \`${fim[1]}\`, sem a pausa. Somar o deslocamento só no ` +
      `começo faz a fase virar antes de a última bola abrir: o jogador vê onze ` +
      `abrirem e a décima segunda aparecer já aberta.`);
  });

  /* ═══ R37a · A BOLA SAI DO CHÃO QUANDO ELA ABRE, E NÃO ANTES ═══════════
   *
   * O R33 pôs uma pausa para as pokébolas ficarem visíveis antes de abrirem, e
   * o dono do projeto respondeu que não sentiu diferença nenhuma. Ele estava
   * certo, e a razão é que o R33 ajustou o TEMPO de uma coisa que não estava na
   * tela.
   *
   * `render.mjs` decidia desenhar a bola por `!S.released` — uma bandeira ÚNICA
   * para as doze. E `releaseAll()` a liga no instante em que monta a FILA de
   * entrada, que é quando o `BATTLE!!` aparece, com o véu ainda cobrindo tudo.
   * Naquele quadro as doze bolas paravam de ser desenhadas DE UMA VEZ.
   *
   * O que o jogador via: o véu sair, a arena VAZIA, e só depois os clarões
   * começarem a estourar. O oposto exato do que a abertura em volta (R23)
   * existe para dar.
   *
   * Medido depois da correção, com a arena fotografada quadro a quadro:
   *
   *     véu sai em      3,92 s   com 0 de 12 abertas
   *     primeira abre   4,85 s
   *
   * ou seja, quase um segundo com as doze pokébolas no chão — que é onde o
   * catálogo de 24 modelos do V1.15 finalmente aparece. Ele existia desde
   * então e era apagado no mesmo instante em que era desenhado. */
  s.teste('o desenho da pokébola é por lutador, e não uma bandeira para os doze', () => {
    const render = readFileSync(new URL('../app/modules/render.mjs', import.meta.url), 'utf8');
    const bloco = render.match(/for \(const e of S\.ents\)\{[\s\S]{0,400}?drawBall\([^\n]*\n/);
    ok(bloco, 'o laço que desenha as pokébolas sumiu do render.mjs');
    ok(/!e\.aberta/.test(bloco[0]),
      `a bola é desenhada por: ${bloco[0].split('\n').find(l => l.includes('drawBall'))?.trim()}\n` +
      `      A condição precisa ser POR ENTIDADE. Com uma bandeira global, as doze ` +
      `somem no quadro em que a fila de entrada é montada — antes de o véu sair — ` +
      `e a arena aparece vazia.`);
    ok(!/const closed = !S\.released/.test(render),
      'voltou a bandeira global `!S.released` para decidir o desenho das doze bolas');
  });

  s.teste('a entidade nasce com a bola fechada, e a fila é quem a abre', () => {
    const rodada = readFileSync(new URL('../app/modules/rodada.mjs', import.meta.url), 'utf8');
    ok(/aberta:\s*false/.test(rodada),
      '`buildEntities` não marca a bola como fechada — sem o campo, `!e.aberta` é ' +
      'sempre verdadeiro e a bola nunca sai do chão');

    const fases = readFileSync(new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    /* No MESMO passo da fila que tira a classe `ball` e põe `opening`. Se a
       marcação ficasse noutro passo, o desenho e a animação discordariam por
       uma fração de segundo — e é justamente nessa fração que o olho está. */
    const passo = fases.match(/filaEntrada\.push\(\{ t: delayRing \+ ENTRY\.RING_LEAD,[\s\S]*?\}\}\);/);
    ok(passo, 'o passo de abertura sumiu da fila de entrada');
    ok(/e\.aberta = true/.test(passo[0]),
      'a fila não marca `e.aberta` no passo em que a bola abre — o desenho da ' +
      'bola e o estouro dela deixam de acontecer no mesmo instante');
  });

  return s;
}
