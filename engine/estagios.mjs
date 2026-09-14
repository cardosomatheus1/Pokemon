/* OS ESTÁGIOS DE UM BIOMA (bloco 1.10, camada 0).
 *
 * Fronteira: entra um bioma e um estágio; sai o que muda no sorteio. Puro, sem
 * DOM, sem estado e sem tema.
 *
 * ── O PEDIDO, E A PARTE QUE O DONO DELEGOU ───────────────────────────────
 *
 * Ele fixou o desenho (L-084): clicar no bioma abre a lista de estágios,
 * clicar no estágio mostra o que se ganha ANTES de gastar as horas, e o
 * desbloqueio é por NÍVEL da criatura. E delegou o resto:
 *
 *   > "precisamos estudar como será esse desbloqueio [...] veja melhor maneira
 *   >  de aplicação dentro da nossa metodologia e siga"
 *
 * ── O MODO DE FALHA CONHECIDO, E A REGRA QUE O CONTÉM ────────────────────
 *
 * Desbloqueio por nível vira PAREDE. O jogador com nível 12 diante de um
 * estágio que pede 15 não tem o que fazer hoje, e "volte amanhã" é a pior
 * resposta que um idle pode dar — ele já é feito de esperar; a espera não pode
 * ser também a resposta à pergunta "o que faço agora?".
 *
 * A contenção é aritmética, e por isso tem teste. A primeira versão da regra
 * era "a porta seguinte a menos de um dia de farm da anterior", e ela REPROVOU
 * o meu próprio desenho — corretamente, e por estar mal formulada: um dia fixo
 * abriria os quatro estágios em três dias, e quatro portas que se abrem numa
 * semana não são progressão, são um tutorial longo.
 *
 * O que contém a parede não é um teto absoluto. É a PROPORÇÃO:
 *
 *   > **Nenhuma porta custa mais que o dobro de tudo que veio antes dela.**
 *
 * Assim a espera cresce, mas nunca dá um salto que faça o jogador sentir que
 * parou. Quem abriu o estágio 3 depois de ~4 dias sabe, pela experiência que já
 * teve, que o 4 está a algumas sessões — e não a um mês indefinido.
 *
 * Medido com a curva do 1.14 e o teto diário de verdade:
 *
 *     estágio 2   nível 12    1,6 dia
 *     estágio 3   nível 19    2,8 dias   (dobro do acumulado: 3,2 — cabe)
 *     estágio 4   nível 31    8,4 dias   (dobro do acumulado: 8,8 — cabe)
 *     tudo aberto             12,7 dias
 *
 * A `test/estagios` afirma isso porta a porta, e reprova se alguém mexer nos
 * níveis sem refazer a conta.
 *
 * ── O QUE O ESTÁGIO MUDA, E O QUE ELE NÃO MUDA ───────────────────────────
 *
 *     MUDA    o viés de raridade — mais fundo, mais raro aparece
 *     MUDA    a chance de item bom no saque
 *     NÃO MUDA  o dinheiro por encontro, e isso é decisão
 *
 * O dinheiro fica igual porque o teto diário conta ENCONTROS: pagar mais por
 * encontro no fundo levantaria o teto de renda sem levantar o de encontros, e o
 * §P5 existe justamente para o tempo não virar dinheiro sem limite.
 *
 * O que o fundo paga é a moeda de desejo do idle, que nunca foi o dinheiro:
 * **a criatura rara.** Um jogador vai ao estágio 4 para ver o que só aparece
 * lá, e não para ganhar 12% a mais.
 *
 * ── E A CHANCE DE NPC NÃO ESTÁ AQUI ──────────────────────────────────────
 *
 * A L-084 pede que o estágio mostre a % de batalha contra treinador. Ela não
 * entra neste bloco porque a batalha de NPC é o 1.7b e ainda não existe —
 * mostrar a porcentagem de uma coisa que não acontece é a moldura vazia que a
 * L-099 já custou caro:
 *
 *   > Um número que nunca anda ensina o jogador que o número é falso.
 *
 * Entra no 1.7b, junto do que a faz acontecer.
 */

export const ESTAGIOS_POR_BIOMA = 4;

/* O nível de criatura que abre cada porta. O primeiro é 1: **todo bioma abre
   com o estágio 1 desde o começo**, senão haveria bioma inacessível na tela
   inicial, e um mapa com portas que nunca se abriram é um mapa que mente. */
export const NIVEL_DO_ESTAGIO = [1, 12, 19, 31];

/* ── O ESTÁGIO MUDA QUAIS FAIXAS APARECEM, e não só os pesos delas ─────────
 *
 * A primeira versão só somava viés, e eu medi antes de seguir: com viés acima de
 * ~1,4 a ordem das faixas INVERTE — no estágio 4 de uma Vigília, "muito raro"
 * saía a 9,7% e "comum" a 1,45%.
 *
 * Isso não é um número mal calibrado, é um erro de significado: **quando o raro
 * fica mais provável que o comum, as duas palavras deixam de querer dizer o que
 * dizem**, e a prévia que a tela mostra passa a mentir com números corretos.
 *
 * O desenho certo e o que o dono descreveu na L-084 — quais CRIATURAS aparecem
 * (a frase dele nomeia a franquia, e o motor nao pode cita-la nem em
 * comentario; ela esta inteira na L-084). O estágio troca a LISTA, e o fundo derruba os comuns:
 *
 *     1   comum · incomum                  a rota de todo dia
 *     2   comum · incomum · raro           o raro passa a existir
 *     3   incomum · raro · muitoRaro       o comum sai de cena
 *     4   raro · muitoRaro                 só o que vale a viagem
 *
 * O muitoRaro fica provável no fundo porque **não há mais comum diluindo** — e
 * não porque alguém inverteu a tabela. A diferença é toda: no primeiro caso o
 * jogador entende "aqui só mora bicho raro"; no segundo ele leria "raro é
 * comum", que é uma frase sem sentido.
 *
 * As faixas vêm por NOME e a tela lê a ordem do pack: um pack com outras faixas
 * declara as dele, e este arquivo continua valendo. */
export const FAIXAS_DO_ESTAGIO = [
  ['comum', 'incomum'],
  ['comum', 'incomum', 'raro'],
  ['incomum', 'raro', 'muitoRaro'],
  ['raro', 'muitoRaro'],
];

/* E um viés pequeno por cima, para o fundo de cada faixa também pesar. O teto
   de 0,3 não é gosto: medido, a ordem das faixas inverte acima de ~1,4, e a
   Vigília já traz +1 sozinha. Somados, 1,3 — o limite exato antes de o raro
   passar o comum. */
export const VIES_DO_ESTAGIO = [0, 0.1, 0.2, 0.3];
export const VIES_TETO = 1.3;

/* Quanto o estágio multiplica o peso das classes BOAS da tabela de saque. Não
   muda quantos itens caem — muda QUAIS. */
export const SAQUE_DO_ESTAGIO = [1, 1.35, 1.8, 2.4];

const dentro = n => Math.min(ESTAGIOS_POR_BIOMA, Math.max(1, Math.floor(Number(n) || 1)));

export const nivelDoEstagio = n => NIVEL_DO_ESTAGIO[dentro(n) - 1];
export const viesDoEstagio  = n => VIES_DO_ESTAGIO[dentro(n) - 1];
export const saqueDoEstagio = n => SAQUE_DO_ESTAGIO[dentro(n) - 1];

/* ── QUEM ABRE A PORTA É A MELHOR CRIATURA, E NÃO A EQUIPE ────────────────
 *
 * Uma criatura no nível exigido basta. Exigir que as três estejam no nível
 * transformaria o estágio num pedágio de coleção: o jogador que criou um
 * campeão continuaria trancado por causa dos dois que ele acabou de pegar — e
 * pegar criatura nova passaria a ATRASAR o progresso.
 *
 * Um sistema que pune a atividade que ele quer incentivar está errado, e não
 * importa quão elegante seja a regra. */
/* O NIVEL DA MELHOR CRIATURA, num lugar so. Estava escrito duas vezes — aqui e
   em `proximoEstagio` — e o portao apontou: ancora ambigua no defeito plantado.
   Duas copias da mesma decisao sao o comeco de duas decisoes diferentes, e aqui
   a divergencia seria cruel: a porta abriria por uma regra e a tela anunciaria
   por outra. */
export const nivelDoTopo = criaturas => (criaturas ?? []).reduce(
  (m, c) => Math.max(m, Math.floor(Number(c?.nivel) || 1)), 1);

export function estagioMaximo(criaturas) {
  const topo = nivelDoTopo(criaturas);
  let n = 1;
  for (let i = 0; i < NIVEL_DO_ESTAGIO.length; i++)
    if (topo >= NIVEL_DO_ESTAGIO[i]) n = i + 1;
  return n;
}

export const estagioAberto = (criaturas, n) => dentro(n) <= estagioMaximo(criaturas);

/* Quanto falta para a próxima porta. `null` quando não há próxima — "faltam 0"
   e "não há mais" são frases diferentes, e a tela precisa das duas (é a mesma
   distinção da `proximaVaga`, no bloco 1.9). */
export function proximoEstagio(criaturas) {
  const atual = estagioMaximo(criaturas);
  if (atual >= ESTAGIOS_POR_BIOMA) return null;
  const topo = nivelDoTopo(criaturas);
  const alvo = NIVEL_DO_ESTAGIO[atual];
  return { estagio: atual + 1, nivel: alvo, faltam: Math.max(0, alvo - topo) };
}

/* O viés final que o sorteio usa: o do perfil mais o do estágio. Uma soma, e
   não um máximo — é o que faz "Vigília no estágio 4" ser o lugar mais raro do
   jogo, e faz sentido que seja. */
export const viesFinal = (viesDoPerfil, estagio) =>
  Math.min(VIES_TETO, (Number(viesDoPerfil) || 0) + viesDoEstagio(estagio));

/* As faixas que este estágio deixa aparecer. Fora da faixa, a espécie
   simplesmente não está lá — e é isso que faz a prévia de dois estágios ser
   duas listas diferentes, e não a mesma lista com outros números. */
export const faixasDoEstagio = n => FAIXAS_DO_ESTAGIO[dentro(n) - 1];

export const cabeNoEstagio = (raridade, n) => faixasDoEstagio(n).includes(raridade);
