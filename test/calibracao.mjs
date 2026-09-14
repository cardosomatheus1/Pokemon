/* Q1/Q3 · LIGA DE PREVISÃO — a aritmética da calibração (R31)
 *
 * ── O QUE ESTE MOTOR É, E O QUE ELE NÃO É ─────────────────────────────────
 *
 * A Liga de Previsão (Spec §6.8) ranqueia por CALIBRAÇÃO, sem stake e sem risco
 * econômico. Por não movimentar valor, ela é a única via competitiva que não
 * depende do checkpoint do §25.1 — foi por isso que a Spec a antecipou da Fase 5
 * para a V2.
 *
 * Este arquivo cobre só a CONTA: entra uma distribuição e um desfecho, sai um
 * número. Nada de banco, nada de tela, nada de sessão. As três regras do §6.8
 * que dependem de estado — contas ligadas, previsão liquidada que não reabre —
 * são do R32, e o motor só oferece o que elas precisam.
 *
 * ── POR QUE BRIER, E NÃO "ACERTOU/ERROU" ──────────────────────────────────
 *
 * Contar acertos premia quem sempre aposta no favorito: numa arena de doze, o
 * favorito ganha com frequência, e quem escrever "100% no favorito" todo dia
 * termina com boa taxa de acerto e nenhuma informação. Pior: quem arrisca uma
 * leitura e acerta um azarão fica ATRÁS.
 *
 * Brier é uma REGRA DE PONTUAÇÃO PRÓPRIA — o valor esperado é ótimo exatamente
 * quando você declara a probabilidade em que acredita. Dizer 90% quando você
 * pensa 60% piora sua nota esperada. É a única família de regras que não premia
 * blefe, e é por isso que ela está aqui em vez de "quantas você acertou".
 *
 * ── AS DUAS ARMADILHAS OPOSTAS DO "VOLUME NÃO SUBSTITUI QUALIDADE" ────────
 *
 * A regra do §6.8 é curta e esconde duas falhas simétricas:
 *
 *   somar as notas premia quem só joga mais. Resolvido pela MÉDIA.
 *
 *   a média crua premia quem jogou POUCO e teve sorte. Vinte previsões
 *   afortunadas batem quinhentas boas, e o topo do ranking vira uma lista de
 *   amostras pequenas. Resolvido pelo ENCOLHIMENTO: com amostra pequena a nota
 *   volta para a média da população, e volume passa a comprar CONFIANÇA em vez
 *   de posição.
 *
 * As duas juntas são o que faz a regra valer. Uma sozinha inverte o problema.
 */
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import {
  AMOSTRA_MINIMA, PESO_ENCOLHIMENTO, VERSAO_PONTUACAO, BRIER_MAX,
  brier, brierUniforme, erros, habilidade, mediaEncolhida, ranquear,
} from '../engine/calibracao.mjs';

/* Um desfecho de doze, que é o tamanho da arena. */
const N = 12;
const uniforme = n => Array.from({ length: n }, () => 1 / n);
const certeza = (n, i) => Array.from({ length: n }, (_, k) => (k === i ? 1 : 0));

export function suite() {
  const s = criarSuite('calibracao');

  /* ═══ a conta ════════════════════════════════════════════════════════════ */

  s.teste('acerto perfeito vale zero e erro perfeito vale o máximo', () => {
    igual(brier(certeza(N, 3), 3), 0, 'dizer 100% no vencedor não deu nota zero');
    igual(brier(certeza(N, 3), 7), BRIER_MAX,
      'dizer 100% em quem perdeu não deu a pior nota possível');
  });

  /* O uniforme é a nota de quem não sabe nada, e ela é o RÉGUA do jogo inteiro:
     quem fica acima dela está informando menos que o acaso. */
  s.teste('a distribuição uniforme vale (n-1)/n, seja qual for o vencedor', () => {
    for (const v of [0, 5, 11])
      dentro(brier(uniforme(N), v), (N - 1) / N, 1e-12,
        `o uniforme mudou de nota conforme o vencedor — a conta depende de quem ganhou`);
    dentro(brierUniforme(N), (N - 1) / N, 1e-12, '`brierUniforme` discorda de `brier`');
  });

  /* A PROPRIEDADE QUE JUSTIFICA A ESCOLHA, e ela precisa de teste porque é o
     único motivo de Brier estar aqui em vez de contagem de acertos.

     Se a verdade é `p`, declarar `p` tem valor esperado MENOR (melhor) do que
     declarar qualquer outra coisa. Sem isso, o ranking premiaria blefe. */
  s.teste('declarar a probabilidade em que se acredita é a melhor estratégia', () => {
    const verdade = [0.5, 0.3, 0.2];
    const esperado = decl => verdade.reduce((a, pv, v) => a + pv * brier(decl, v), 0);
    const honesto = esperado(verdade);
    for (const mentira of [
      [0.9, 0.05, 0.05],   // exagera a confiança
      [1, 0, 0],           // finge certeza
      [0.34, 0.33, 0.33],  // finge ignorância
      [0.2, 0.3, 0.5],     // inverte a leitura
    ])
      ok(esperado(mentira) > honesto + 1e-12,
        `declarar ${JSON.stringify(mentira)} rendeu ${esperado(mentira).toFixed(6)}, ` +
        `melhor ou igual aos ${honesto.toFixed(6)} da verdade — a regra deixou de ser própria`);
  });

  s.teste('a nota melhora quanto mais massa vai para o vencedor', () => {
    const vencedor = 0;
    let anterior = Infinity;
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const resto = (1 - p) / (N - 1);
      const d = Array.from({ length: N }, (_, i) => (i === vencedor ? p : resto));
      const nota = brier(d, vencedor);
      ok(nota < anterior, `com ${p} no vencedor a nota (${nota}) não melhorou`);
      anterior = nota;
    }
  });

  /* ═══ o que é recusado, e por que recusar em vez de consertar ════════════ */

  /* NORMALIZAR EM SILÊNCIO É PONTUAR O JOGADOR POR ALGO QUE ELE NÃO DISSE.
     Uma distribuição que soma 1,4 pode ser erro de digitação, cliente antigo ou
     adulteração — e nos três casos "consertar" inventa uma opinião e depois
     cobra por ela. A entrada é recusada, e quem chamou decide o que dizer. */
  s.teste('distribuição que não soma 1 é recusada, e não normalizada', () => {
    for (const d of [[0.5, 0.4], [0.5, 0.6], [0, 0], [1, 1]]) {
      const e = erros(d, d.length);
      ok(e.length, `${JSON.stringify(d)} passou na validação`);
      ok(e.some(x => /soma/i.test(x)), `o erro de ${JSON.stringify(d)} não fala da soma: ${e}`);
    }
    igual(erros([0.5, 0.5], 2).length, 0, 'uma distribuição válida foi recusada');
  });

  s.teste('probabilidade fora de [0,1] é recusada', () => {
    ok(erros([-0.5, 1.5], 2).length, 'probabilidade negativa passou');
    ok(erros([2, -1], 2).length, 'probabilidade acima de 1 passou');
  });

  s.teste('tamanho diferente do desfecho é recusado', () => {
    ok(erros([0.5, 0.5], 12).length, 'distribuição de 2 passou num desfecho de 12');
    ok(erros([], 12).length, 'distribuição vazia passou');
  });

  s.teste('valor que não é número é recusado', () => {
    for (const d of [[0.5, null], [0.5, NaN], [0.5, 'x'], [0.5, Infinity]])
      ok(erros(d, 2).length, `${JSON.stringify(d)} passou na validação`);
  });

  /* A tolerância existe porque ponto flutuante não fecha em 1 exato: três
     terços somam 0,9999999999999998. Recusar isso seria recusar a entrada mais
     honesta que existe. */
  s.teste('a soma aceita o erro do ponto flutuante, e só ele', () => {
    igual(erros([1 / 3, 1 / 3, 1 / 3], 3).length, 0,
      'três terços foram recusados — a tolerância não cobre ponto flutuante');
    ok(erros([0.34, 0.33, 0.34], 3).length,
      'uma soma de 1,01 passou: a tolerância virou permissão');
  });

  /* Pontuar uma distribuição inválida é pior que recusá-la: devolve um número
     que parece nota e entra num ranking. */
  s.teste('pontuar distribuição inválida devolve null, e não um número', () => {
    igual(brier([0.5, 0.4], 0), null, 'uma distribuição que soma 0,9 recebeu nota');
    igual(brier([0.5, 0.5], 9), null, 'um vencedor fora do desfecho recebeu nota');
    igual(brier(null, 0), null, 'uma distribuição ausente recebeu nota');
  });

  /* ═══ habilidade contra o modelo ═════════════════════════════════════════ */

  /* É o número do §6.9 — "onde discordou do modelo e quem estava certo".
     Positivo: o jogador leu melhor que a casa. Zero: empatou. */
  s.teste('a habilidade compara o jogador com o modelo, e não com o acaso', () => {
    igual(habilidade(0.2, 0.4), 0.5, 'metade do erro do modelo não deu 0,5 de habilidade');
    igual(habilidade(0.4, 0.4), 0, 'empatar com o modelo não deu zero');
    igual(habilidade(0.8, 0.4), -1, 'o dobro do erro do modelo não deu -1');
  });

  /* Modelo perfeito é divisão por zero. `null` e não `Infinity`: a resposta
     honesta é "não dá para comparar", e um painel que mostra Infinity falha
     justamente no dia em que alguém foi olhá-lo (mesma lição do R20). */
  s.teste('modelo sem erro não vira Infinity nem NaN', () => {
    igual(habilidade(0, 0), null, 'empate em zero devolveu número');
    igual(habilidade(0.3, 0), null, 'divisão por zero devolveu número');
  });

  /* ═══ volume não substitui qualidade ═════════════════════════════════════ */

  s.teste('a amostra mínima e o peso do encolhimento são declarados', () => {
    ok(Number.isInteger(AMOSTRA_MINIMA) && AMOSTRA_MINIMA > 0,
      'AMOSTRA_MINIMA não é um inteiro positivo declarado');
    ok(Number.isFinite(PESO_ENCOLHIMENTO) && PESO_ENCOLHIMENTO > 0,
      'PESO_ENCOLHIMENTO não é um número positivo declarado');
  });

  /* O encolhimento é o que impede amostra pequena e afortunada de liderar. */
  s.teste('amostra pequena é puxada para a média da população', () => {
    const prior = 0.6;
    const pequena = mediaEncolhida(0.1, 1, prior);
    const grande  = mediaEncolhida(0.1, 10000, prior);
    ok(Math.abs(pequena - prior) < Math.abs(grande - prior),
      `com 1 previsão a nota (${pequena}) não ficou mais perto da população que com 10.000 (${grande})`);
    dentro(grande, 0.1, 0.01, 'com amostra enorme a nota não convergiu para a do jogador');
  });

  s.teste('com a amostra igual ao peso, jogador e população pesam o mesmo', () => {
    dentro(mediaEncolhida(0.2, PESO_ENCOLHIMENTO, 0.6), 0.4, 1e-12,
      'o encolhimento não é a média ponderada declarada');
  });

  s.teste('sem previsão nenhuma a nota é a da população, e não zero', () => {
    igual(mediaEncolhida(0, 0, 0.6), 0.6,
      'quem não previu nada recebeu 0 — que é a NOTA PERFEITA em Brier, ' +
      'e poria o jogador sem amostra no topo do ranking');
  });

  /* ═══ o ranking ══════════════════════════════════════════════════════════ */

  const entradas = [
    { id: 'a', soma: 0.20 * 100, amostra: 100 },  // média 0,20 — o melhor de verdade
    { id: 'b', soma: 0.05 * 3,   amostra: 3   },  // média 0,05 — sorte em 3 rodadas
    { id: 'c', soma: 0.45 * 400, amostra: 400 },
    { id: 'd', soma: 0.30 * 60,  amostra: 60  },
  ];

  s.teste('o ranking é por média encolhida, não por soma nem por média crua', () => {
    const r = ranquear(entradas);
    const pos = id => r.findIndex(x => x.id === id);
    ok(pos('a') < pos('b'),
      'quem teve sorte em 3 previsões ficou à frente de quem foi bom em 100 — ' +
      'é exatamente o que a regra do §6.8 proíbe');
    ok(pos('a') < pos('c'), 'a média crua deixou de mandar entre amostras grandes');
  });

  s.teste('quem não alcança a amostra mínima não é ranqueado, e sabe por quê', () => {
    const r = ranquear(entradas);
    const b = r.find(x => x.id === 'b');
    ok(b, 'quem está abaixo da amostra mínima sumiu da lista em vez de aparecer sem posto');
    igual(b.posto, null, 'quem está abaixo da amostra mínima recebeu posto');
    ok(/amostra/i.test(b.motivo || ''), `o motivo não explica a ausência de posto: ${b.motivo}`);
    for (const x of r.filter(x => x.amostra >= AMOSTRA_MINIMA))
      ok(Number.isInteger(x.posto) && x.posto >= 1, `${x.id} está acima da mínima e sem posto`);
  });

  /* Sumir da lista e ficar sem posto são coisas diferentes: o jogador precisa
     ver a própria linha, com o quanto falta. É a regra de honestidade do §28.5
     aplicada ao ranking — esconder a amostra pequena esconde o motivo. */
  s.teste('o ranking devolve todo mundo, com a amostra visível', () => {
    const r = ranquear(entradas);
    igual(r.length, entradas.length, 'o ranking perdeu ou inventou linhas');
    for (const x of r) ok(Number.isFinite(x.amostra), `${x.id} saiu sem amostra visível`);
  });

  s.teste('o posto é 1, 2, 3 sem buraco, contando só quem se qualificou', () => {
    const postos = ranquear(entradas).filter(x => x.posto).map(x => x.posto).sort((a, b) => a - b);
    igual(postos.join(','), postos.map((_, i) => i + 1).join(','),
      `os postos saíram com buraco ou repetição: ${postos.join(',')}`);
  });

  /* Empate resolvido por sorteio faria o ranking mudar sozinho entre duas
     leituras da mesma temporada. A amostra maior vem primeiro porque é a que
     tem mais evidência atrás; o id desempata o resto, e é estável. */
  s.teste('empate é resolvido por evidência, e nunca por sorteio', () => {
    const iguais = [
      { id: 'z', soma: 0.3 * 50,  amostra: 50 },
      { id: 'y', soma: 0.3 * 200, amostra: 200 },
    ];
    const uma  = ranquear(iguais).map(x => x.id).join(',');
    const duas = ranquear(iguais).map(x => x.id).join(',');
    igual(uma, duas, 'duas leituras do mesmo ranking deram ordens diferentes');
    igual(ranquear(iguais)[0].id, 'y', 'o empate não foi para quem tem mais evidência');
  });

  /* O CENTRO DA POPULAÇÃO É DEFINIDO POR EVIDÊNCIA, E NÃO POR CABEÇA.
   *
   * O encolhimento puxa todo mundo para a média da população, então QUEM
   * define essa média decide a nota de todo mundo. Média das médias dá a um
   * jogador de UMA previsão o mesmo peso que a um de mil — e uma conta nova com
   * uma previsão terrível arrasta o centro inteiro, mudando a nota de quem
   * jogou a temporada toda sem que essa pessoa tenha feito nada.
   *
   * É exatamente o viés que o encolhimento existe para corrigir, reintroduzido
   * pela porta dos fundos. Este teste nasceu de um escape: o `S446` troca a
   * média agrupada pela média das médias e passou pela primeira versão da
   * suíte, porque as asserções de ORDEM continuavam valendo — a ordem muda
   * pouco, e a nota de todo mundo muda muito. */
  s.teste('um recém-chegado não move a nota de quem jogou a temporada toda', () => {
    const veteranos = [
      { id: 'p1', soma: 0.30 * 1000, amostra: 1000 },
      { id: 'p2', soma: 0.30 * 1000, amostra: 1000 },
    ];
    /* Uma previsão, e a pior possível. */
    const comRecemChegado = [...veteranos, { id: 'novo', soma: BRIER_MAX, amostra: 1 }];
    const antes  = ranquear(veteranos).find(x => x.id === 'p1').nota;
    const depois = ranquear(comRecemChegado).find(x => x.id === 'p1').nota;
    ok(Math.abs(depois - antes) < 0.005,
      `a nota de quem tem 1.000 previsões foi de ${antes.toFixed(5)} para ` +
      `${depois.toFixed(5)} porque UMA conta com UMA previsão entrou na temporada. ` +
      `O centro da população está sendo definido por cabeça em vez de por evidência.`);
  });

  s.teste('ranking vazio não estoura', () => {
    igual(ranquear([]).length, 0, 'o ranking vazio inventou linha');
    igual(ranquear(null).length, 0, 'o ranking de `null` estourou ou inventou linha');
  });

  /* ═══ a versão da pontuação ══════════════════════════════════════════════ */

  /* `scoring_version` está no esquema do §6.10 por uma razão: mudar a fórmula
     não pode reescrever a história. Nota antiga foi dada sob uma regra, e o
     jogador jogou sob ela. */
  s.teste('a versão da pontuação é declarada e viaja com a nota', () => {
    ok(VERSAO_PONTUACAO, 'não há versão de pontuação declarada');
    ok(/^\d+$/.test(String(VERSAO_PONTUACAO)),
      `a versão \`${VERSAO_PONTUACAO}\` não é um inteiro — ela precisa ordenar`);
  });

  return s;
}
