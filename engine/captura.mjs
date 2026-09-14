/* O ENCONTRO VIRA CAPTURA (bloco 1.2b, §7.5, §7.6, §28, §0.3).
 *
 * Fronteira: entra um pack, uma raridade e uma bola; sai a chance e o resultado
 * do lance. Puro, sem DOM, sem estado e sem tema.
 *
 * ── POR QUE O PACK ENTRA AQUI ────────────────────────────────────────────
 *
 * A primeira versão tinha a tabela de bolas escrita no motor, com os nomes do
 * material de origem. O portão `conteudo` reprovou, e pela terceira vez neste
 * projeto ele estava certo: nome de bola é NOMENCLATURA DE TEMA, e tema vive em
 * `content/` (§0.3). Foi o mesmo que aconteceu com as naturezas no bloco 1.1.
 *
 * E a correção melhorou a arquitetura, como da outra vez. Agora **tudo sobre
 * uma faixa de raridade mora numa linha só do pack**:
 *
 *     ['raro', 490, 0.14, 20]
 *       nome   teto  chance  fragmentos do registro
 *
 * Um teto de força, uma chance de captura e um alvo de registro que nunca podem
 * discordar entre si, porque são a mesma linha. Antes eram três tabelas em dois
 * arquivos, casadas por convenção — e convenção é o que se quebra em silêncio.
 *
 * ── A DECISÃO QUE GOVERNA ESTE ARQUIVO ────────────────────────────────────
 *
 * **A chance é função da RARIDADE e da BOLA, e de mais nada.**
 *
 * Não do saldo, não do valor apostado, não de o jogador ter apostado. É o §7.5
 * escrito como assinatura: o segundo argumento tem dois campos e não tem por
 * onde receber um terceiro.
 *
 * O motivo não é purismo. Num jogo de apostas, ligar progressão de coleção a
 * volume apostado cria pressão para apostar por um motivo que não é apostar — e
 * é isso que uma política de proteção ao jogador (§28) proíbe, e o que o
 * checkpoint do §25.1 vai olhar primeiro.
 *
 * O teste não enumera nomes de campo proibidos. Ele ESPIA, com um `Proxy`, tudo
 * que esta função lê, e reprova qualquer leitura fora de `raridade` e `bola`.
 * É a lição que a sabotagem do 1.2a ensinou: enumerar veneno é adivinhação, e
 * quem escrever o defeito amanhã escolhe um nome de fora da lista.
 *
 * ── ENCONTRAR NÃO É CAPTURAR, E FALHAR NÃO PODE DAR NADA ──────────────────
 *
 * São duas peneiras. A expedição devolve QUEM APARECEU; o lance decide quem
 * fica. Com o teto em 85%, uma captura que falha e não dá absolutamente nada
 * transforma o farm em frustração — e frustração é o que faz fechar a aba.
 *
 * Por isso **o fragmento de registro cai no ENCONTRO**. Você não levou a criatura,
 * mas levou a ficha dela — que é o que melhora a sua leitura na Arena, e é a
 * ponte entre os dois modos.
 *
 * ── A BOLA É CONSUMIDA MESMO QUANDO FALHA ────────────────────────────────
 *
 * É o único custo do lance, e sem ele a escolha não é escolha: usa-se a melhor
 * sempre. Consumindo, guardar a boa para o raro passa a ser decisão de verdade.
 *
 * ── A ARENA É MODIFICADOR, NUNCA FONTE ───────────────────────────────────
 *
 * A primeira proposta fazia o encontro NASCER da rodada apostada. Estava errado
 * por dois motivos, e o dono do projeto viu: um idle que só roda quando você
 * aposta não é um idle, e amarrar conteúdo a volume apostado não passa no §25.1.
 *
 * O que sobrou é honesto: a espécie apostada fica MAIS COMUM por algumas horas.
 * Mexe em QUEM APARECE, e em nada mais.
 */

/* O TETO, e é o número mais importante daqui. Captura garantida vira tarefa;
   captura em 85% ainda dói quando falha. A sorte precisa continuar na conta,
   senão o farm vira planilha.
   Ele fica no MOTOR e não no pack: é regra de jogo, não de tema. */
export const TETO_CAPTURA = 0.85;

export const FRAGMENTOS_POR_ENCONTRO = 1;

/* As três leituras do pack. Índice 2 é a chance base; índice 3, o alvo do
   registro. Um pack que não os declare devolve zero — e zero é impossibilidade,
   nunca um valor de reserva: chance por acidente é criatura de graça, e
   criatura de graça é preço de mercado errado. */
const faixa = (pack, id) => (pack?.raridade ?? []).find(f => f[0] === id) ?? null;
export const baseDaRaridade = (pack, id) => faixa(pack, id)?.[2] ?? 0;
export const alvoRegistro     = (pack, id) => faixa(pack, id)?.[3] ?? 0;
export const bolaDe = (pack, id) => (pack?.bolas ?? []).find(b => b.id === id) ?? null;

/* ── A CHANCE ──────────────────────────────────────────────────────────────
 *
 * DESESTRUTURA SÓ O QUE PODE LER. Escrito assim, um campo de economia que
 * chegue no objeto não é ignorado por disciplina — ele é invisível, porque a
 * função nunca o toca. É a mesma ideia do teto sem parâmetro do 1.2a: ausência
 * de porta vale mais que promessa de não abrir. */
export function chanceDe(pack, { raridade, bola }) {
  const base = baseDaRaridade(pack, raridade);
  const b = bolaDe(pack, bola);
  if (!base || !b) return 0;
  return Math.min(TETO_CAPTURA, base * b.mult);
}

/* ── O REGISTRO ──────────────────────────────────────────────────────────────
 *
 * O alvo cresce com a raridade porque completar a ficha de um raro tem de valer
 * mais que a de um comum — e porque o raro aparece menos, o custo real cresce
 * duas vezes. É de propósito: a ficha completa de um raro é troféu.
 *
 * SATURA em 1 — barra que passa de cheia é número que a tela não sabe desenhar,
 * e é o tipo de coisa que só aparece meses depois, no jogador que farmou demais. */
export function fragmentosDe(pack, raridade, quantos) {
  const alvo = alvoRegistro(pack, raridade);
  if (!alvo) return 0;
  return Math.min(1, Math.max(0, quantos) / alvo);
}

/* ── O LANCE ───────────────────────────────────────────────────────────────
 *
 * Um lance por encontro, e a escolha da bola é A decisão.
 *
 * É a nossa diferença nomeada frente ao material de origem: lá se joga bola até
 * pegar ou fugir; aqui você tem um tiro, e decide onde gastar a boa. Num idle
 * que devolve vinte e sete encontros por dia, a alternativa seria uma sequência
 * de cliques sem decisão — e a decisão é o que faz valer olhar. */
export function tentar(rnd, pack, { raridade, bola }) {
  const chance = chanceDe(pack, { raridade, bola });
  const sorteio = rnd();
  return {
    capturou: sorteio < chance,
    chance,
    /* CONSUMIDA SEMPRE. Ver o comentário de cabeça: é o único custo do lance. */
    consumiu: true,
    bola,
    fragmentos: FRAGMENTOS_POR_ENCONTRO,
  };
}

/* ── O BÔNUS DA ARENA ──────────────────────────────────────────────────────
 *
 * Seis horas: dura o bastante para caber uma Vigília, e pouco o bastante para
 * não virar estado permanente. Quem apostou hoje colhe hoje.
 *
 * O peso multiplica em quatro. Forte o suficiente para a escolha de aposta ser
 * sentida na coleção, e fraco o suficiente para não apagar o resto do bioma — a
 * espécie apostada fica comum, e não fica única. */
export const DURACAO_BONUS_MS = 6 * 3600_000;
export const PESO_APOSTADA = 4;

export const bonusVivo = (bonus, agora) =>
  !!bonus && agora < (bonus.ate ?? 0);

/* O peso de UMA espécie no sorteio de encontro, com o bônus aplicado.
 *
 * Repare no que NÃO está aqui: valor apostado. Apostar 50 ou 5.000 dá exatamente
 * o mesmo bônus, e isso é decisão — o bônus recompensa a ESCOLHA de em quem
 * apostar, jamais o tamanho da aposta. Recompensar o tamanho seria transformar
 * o idle num motivo para apostar mais, que é o §28 de novo. */
export function pesoComBonus(peso, dex, bonus, agora) {
  if (!bonusVivo(bonus, agora)) return peso;
  return bonus.dex === dex ? peso * PESO_APOSTADA : peso;
}
