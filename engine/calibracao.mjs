/* A ARITMÉTICA DA CALIBRAÇÃO — Brier, habilidade e ranking da Liga de Previsão.
 *
 * Entra uma distribuição e um desfecho, sai um número. Nenhum import, nenhum
 * banco, nenhum tema: é conta, e mora aqui pela mesma razão que `distribuicao`
 * e `preco` — é regra do jogo, separada da tela e do servidor.
 *
 * A Liga (Spec §6.8) ranqueia por calibração, **sem stake e sem risco
 * econômico**. Por não movimentar valor, é a única via competitiva que não
 * depende do checkpoint do §25.1, e foi por isso que a Spec a antecipou da
 * Fase 5 para a V2.
 *
 * ── AS CINCO DECISÕES QUE ESTE ARQUIVO TOMA E PRECISA DECLARAR ────────────
 *
 * 1. BRIER, E NÃO CONTAGEM DE ACERTOS.
 *
 *    Contar acertos premia quem sempre escolhe o favorito: numa arena de doze
 *    o favorito ganha com frequência, e "100% no favorito" todo dia rende boa
 *    taxa de acerto e nenhuma informação. Pior: quem lê um azarão e ACERTA
 *    fica atrás de quem nunca arriscou.
 *
 *    Brier é uma regra de pontuação PRÓPRIA: o valor esperado é ótimo
 *    exatamente quando o jogador declara a probabilidade em que acredita.
 *    Dizer 90% pensando 60% piora a nota esperada. É a propriedade que impede
 *    o ranking de premiar blefe, e ela tem teste — sem ela, não haveria motivo
 *    para escolher esta fórmula em vez de qualquer outra.
 *
 * 2. MENOR É MELHOR, E O NOME DIZ ISSO.
 *
 *    A função se chama `brier` e não `nota` de propósito. "Nota" convida a
 *    ordenar decrescente, e um ranking invertido é o tipo de defeito que passa
 *    despercebido por semanas porque a lista continua parecendo uma lista.
 *
 * 3. DISTRIBUIÇÃO INVÁLIDA É RECUSADA, NUNCA NORMALIZADA.
 *
 *    Uma distribuição que soma 1,4 pode ser erro de digitação, cliente antigo
 *    ou adulteração. Nos três casos, "consertar" dividindo pela soma inventa
 *    uma opinião que o jogador não teve e depois o pontua por ela. `erros()`
 *    devolve a lista de problemas e quem chamou decide o que dizer — mesmo
 *    desenho de `validarPack`.
 *
 * 4. VOLUME NÃO SUBSTITUI QUALIDADE — E A REGRA TEM DUAS FALHAS SIMÉTRICAS.
 *
 *    O §6.8 diz "volume de previsões não substitui qualidade no ranking". A
 *    frase é curta e esconde duas maneiras opostas de errar:
 *
 *      somar as notas premia quem só joga mais;
 *      a média CRUA premia quem jogou pouco e teve sorte.
 *
 *    A segunda é a mais fácil de cometer e a mais difícil de ver: vinte
 *    previsões afortunadas batem quinhentas boas, e o topo do ranking vira uma
 *    lista de amostras pequenas. Quem trabalhou uma temporada inteira fica
 *    atrás de quem apareceu ontem.
 *
 *    Por isso a nota do ranking é a média ENCOLHIDA para a média da população:
 *
 *        encolhida = (amostra · media + PESO · populacao) / (amostra + PESO)
 *
 *    Com amostra pequena a nota volta para o meio; com amostra grande ela
 *    converge para a do jogador. Volume passa a comprar CONFIANÇA — o direito
 *    de a sua nota ser realmente sua — e nunca posição.
 *
 * 5. AUSÊNCIA É `null`, NUNCA UM NÚMERO.
 *
 *    Modelo com erro zero não vira `Infinity` na habilidade, e amostra
 *    insuficiente não vira posto. Zero em Brier é a NOTA PERFEITA: devolver
 *    zero para quem não previu nada poria o jogador sem amostra na liderança.
 *    É a lição do R20 outra vez — painel que mostra `NaN` falha justamente no
 *    dia em que alguém foi olhá-lo.
 */

/* Pior nota possível: dizer 100% em quem perdeu. (1-0)² + (0-1)² = 2. */
export const BRIER_MAX = 2;

/* Quantas previsões liquidadas antes de aparecer com POSTO no ranking.
 *
 * Não é um número da Spec — ela não fixa nenhum — e por isso o valor está aqui
 * com o raciocínio, e não escondido numa comparação.
 *
 * Vinte é aproximadamente uma semana de jogo diário. Abaixo disso a variância
 * do Brier médio ainda domina o sinal: a diferença entre dois jogadores é
 * menor que o ruído das próprias rodadas, e um ranking assim mede sorte com
 * cara de mérito. */
export const AMOSTRA_MINIMA = 20;

/* Peso da população no encolhimento, em "previsões equivalentes".
 *
 * Igual à amostra mínima de propósito: no exato momento em que o jogador entra
 * no ranking, metade da nota dele ainda é da população. A partir dali cada
 * previsão nova aumenta a parte que é dele. A alternativa — encolhimento fraco
 * — devolveria o problema que ele existe para resolver. */
export const PESO_ENCOLHIMENTO = AMOSTRA_MINIMA;

/* A versão da fórmula, que viaja com cada nota (`scoring_version`, §6.10).
 *
 * MUDAR A FÓRMULA NÃO PODE REESCREVER A HISTÓRIA. Uma nota antiga foi dada sob
 * uma regra e o jogador jogou sob ela; recalcular a temporada passada com a
 * fórmula de hoje muda a classificação de quem já terminou. Quem pontua grava
 * esta versão junto, e quem lê sabe sob qual regra aquela nota nasceu. */
export const VERSAO_PONTUACAO = 1;

/* Ponto flutuante não fecha em 1 exato: três terços somam 0,9999999999999998.
   A tolerância cobre esse erro e nada além dele — 1e-9 é grande o bastante
   para o acúmulo de algumas dezenas de somas e pequeno o bastante para que
   1,01 continue sendo recusado. */
const TOL_SOMA = 1e-9;

/* ─── validação ─────────────────────────────────────────────────────────── */

/* A lista de problemas de uma distribuição, no mesmo desenho de `validarPack`:
   vazia significa válida, e cada item é uma frase que serve de mensagem. */
export function erros(d, n) {
  const fora = [];
  if (!Array.isArray(d)) return ['a distribuição não é uma lista'];
  if (!Number.isInteger(n) || n < 2)
    fora.push(`o desfecho tem ${n} resultado(s); uma previsão precisa de ao menos 2`);
  if (d.length !== n)
    fora.push(`a distribuição tem ${d.length} valor(es) e o desfecho tem ${n}`);
  let soma = 0;
  for (let i = 0; i < d.length; i++) {
    const p = d[i];
    if (!Number.isFinite(p)) { fora.push(`a posição ${i} não é um número finito`); continue; }
    if (p < 0 || p > 1) fora.push(`a posição ${i} vale ${p}, fora de [0,1]`);
    soma += p;
  }
  /* Só cobra a soma se todos os valores são números — senão a mensagem seria
     "a soma deu NaN", que esconde o problema real. */
  if (d.every(Number.isFinite) && Math.abs(soma - 1) > TOL_SOMA)
    fora.push(`a distribuição soma ${soma}, e uma distribuição soma 1`);
  return fora;
}

/* ─── a conta ───────────────────────────────────────────────────────────── */

/* BRIER MULTICLASSE:  BS = Σ (pᵢ − oᵢ)²,  com oᵢ = 1 no vencedor e 0 no resto.
 *
 * Faixa [0, 2], MENOR É MELHOR. A forma somada é a original de Brier; há quem
 * divida por 2 para deixar em [0,1], e não é o que se faz aqui — dividir
 * mudaria a escala sem mudar a ordem, e a escala já está publicada nos testes
 * e no que for gravado. */
export function brier(d, vencedor) {
  if (!Array.isArray(d) || erros(d, d.length).length) return null;
  if (!Number.isInteger(vencedor) || vencedor < 0 || vencedor >= d.length) return null;
  let acc = 0;
  for (let i = 0; i < d.length; i++) {
    const o = i === vencedor ? 1 : 0;
    acc += (d[i] - o) ** 2;
  }
  return acc;
}

/* A nota de quem não sabe nada: (n−1)/n.
 *
 * É a RÉGUA da Liga inteira. Um jogador acima dela está informando menos que o
 * acaso, e a tela do §6.9 precisa poder dizer isso sem inventar um limiar. */
export const brierUniforme = n =>
  (Number.isInteger(n) && n >= 2) ? (n - 1) / n : null;

/* HABILIDADE CONTRA O MODELO — o número do §6.9, "onde discordou do modelo e
 * quem estava certo".
 *
 *     1 − brierJogador / brierModelo
 *
 * Positivo: o jogador leu melhor que a casa. Zero: empatou. Negativo: leu pior.
 * Comparar com o MODELO e não com o uniforme é o que torna o número
 * interessante — bater o acaso é fácil, bater a precificação não é. */
export function habilidade(brierJogador, brierModelo) {
  if (!Number.isFinite(brierJogador) || !Number.isFinite(brierModelo)) return null;
  /* Modelo sem erro é divisão por zero, e a resposta honesta é "não dá para
     comparar" — não `Infinity`, não `NaN`, e muito menos zero. */
  if (brierModelo <= 0) return null;
  return 1 - brierJogador / brierModelo;
}

/* ─── o ranking ─────────────────────────────────────────────────────────── */

/* A média do jogador puxada para a da população, na proporção da amostra.
   Ver a decisão 4 do cabeçalho. */
export function mediaEncolhida(media, amostra, populacao) {
  const n = Number.isFinite(amostra) && amostra > 0 ? amostra : 0;
  if (!Number.isFinite(populacao)) return null;
  if (!n) return populacao;
  if (!Number.isFinite(media)) return populacao;
  return (n * media + PESO_ENCOLHIMENTO * populacao) / (n + PESO_ENCOLHIMENTO);
}

/* A média da população é AGRUPADA (soma de tudo / amostra de tudo), e não a
   média das médias. A média das médias daria a um jogador de três previsões o
   mesmo peso que a um de quinhentas na hora de definir o centro para o qual
   todo mundo é puxado — o que é exatamente o viés que o encolhimento existe
   para corrigir. */
function populacaoDe(lista) {
  let soma = 0, amostra = 0;
  for (const e of lista) {
    if (Number.isFinite(e.soma)) soma += e.soma;
    if (Number.isFinite(e.amostra) && e.amostra > 0) amostra += e.amostra;
  }
  return amostra > 0 ? soma / amostra : null;
}

/* Ordena por nota encolhida, atribui posto a quem alcançou a amostra mínima e
 * DEVOLVE TODO MUNDO.
 *
 * Quem está abaixo da mínima aparece com `posto: null` e um `motivo` — sumir da
 * lista esconderia justamente a informação de que falta amostra, e o jogador
 * ficaria procurando a própria linha sem saber por que ela não está lá. É a
 * regra de honestidade do §28.5 aplicada ao ranking: o tamanho da amostra fica
 * visível, e a ausência de posto é explicada em vez de simulada. */
export function ranquear(lista) {
  const entradas = Array.isArray(lista) ? lista : [];
  if (!entradas.length) return [];

  const populacao = populacaoDe(entradas);

  const linhas = entradas.map(e => {
    const amostra = Number.isFinite(e.amostra) && e.amostra > 0 ? e.amostra : 0;
    const media = amostra ? e.soma / amostra : null;
    return {
      ...e,
      amostra,
      media,
      nota: populacao === null ? null : mediaEncolhida(media, amostra, populacao),
      posto: null,
      motivo: null,
    };
  });

  /* MENOR É MELHOR, então a ordem é crescente.
     O desempate é por EVIDÊNCIA — amostra maior primeiro —, e o id fecha o
     resto. Sorteio aqui faria a mesma temporada sair em ordens diferentes entre
     duas leituras, e um ranking que muda sozinho não é ranking. */
  linhas.sort((a, b) =>
    (a.nota ?? Infinity) - (b.nota ?? Infinity) ||
    b.amostra - a.amostra ||
    String(a.id).localeCompare(String(b.id)));

  let posto = 0;
  for (const l of linhas) {
    if (l.amostra >= AMOSTRA_MINIMA && l.nota !== null) { l.posto = ++posto; continue; }
    l.motivo = l.nota === null
      ? 'ainda não há previsões liquidadas na temporada'
      : `amostra de ${l.amostra} de ${AMOSTRA_MINIMA} previsões liquidadas`;
  }
  return linhas;
}
