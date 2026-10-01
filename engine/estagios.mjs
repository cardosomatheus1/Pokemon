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
import { entradaDe } from './evolucao.mjs';

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

/* ── A FORMA EVOLUÍDA SÓ SE PEGA NO ESTÁGIO DO NÍVEL DELA (ST-2.13) ───────
 *
 * O dono, olhando o time de um amigo que acabou de começar: formas já
 * evoluídas, com nível baixo, atropelando os treinadores — "acho que não tá
 * tão equilibrado". Medido: em TODA rota os dois chefes do estágio 1 são
 * formas evoluídas — 25 das 66 espécies do estágio 1 —, e o encontro que a
 * vitória deixava era o próprio chefe. Uma segunda forma no nível 1 atropela
 * o começo inteiro; e a expedição do estágio 1 trazia evoluídas em toda rota.
 *
 * A regra é a do gênero: a forma evoluída mora em lugar de nível alto. Cada
 * estágio é uma FAIXA de níveis — da porta dele até a porta do seguinte — e a
 * forma só se PEGA no estágio cuja faixa alcança o nível em que ela evolui.
 * Com as portas em 1/12/19/31: no 1, só as que evoluem até o 12 (as larvas de
 * inseto); no 2, as do meio (16–18); no 3, as tardias e as de pedra (até 31);
 * no 4, que não tem porta acima, todas.
 *
 * MEDIDO ANTES, e foi o que decidiu a faixa: a primeira versão exigia a PORTA
 * do estágio (nível 1 no estágio 1), e esvaziava a expedição — a praia do
 * estágio 3 caía de 16 espécies para 2, o oásis de 24 para 4, porque as raras
 * dos estágios fundos SÃO as formas evoluídas. Pela faixa, a praia do 3 fica
 * com 10, o oásis com 17, e nenhum chefe evoluído do estágio 1 (as segundas
 * formas de nível 16 a 30) se pega nele.
 *
 * O que ela NÃO tira, de propósito: o chefe evoluído continua na LUTA da run
 * (a dificuldade do estágio é dele), e o registro continua vendo quem lutou.
 * Muda o que a vitória deixa: a forma do estágio — a mais evoluída da linha
 * que ainda cabe nele (`formaDoEstagio`). Trocar em vez de tirar mantém a
 * contagem de encontros, que é economia medida (teto, fragmentos, D-107).
 *
 * A evolução que não é por nível (pedra, troca) vale `NIVEL_SEM_NIVEL`. */
export const NIVEL_SEM_NIVEL = 25;
export function nivelParaExistir(pack, dex) {
  let atual = dex, n = 1;
  for (let i = 0; i < 8; i++) {
    const e = entradaDe(pack, atual);
    if (!e) break;
    n = Math.max(n, Number(e.exige?.nivel) || NIVEL_SEM_NIVEL);
    atual = e.de;
  }
  return n;
}
export const tetoDoEstagio = n =>
  dentro(n) >= ESTAGIOS_POR_BIOMA ? Infinity : NIVEL_DO_ESTAGIO[dentro(n)];
export const capturavelNoEstagio = (pack, dex, estagio) =>
  nivelParaExistir(pack, dex) <= tetoDoEstagio(estagio);

/* ── EM QUE NÍVEL A CAPTURA NASCE (ST-2.23 · L-233) ───────────────────────
 * Toda captura nascia no nível 1, qualquer que fosse o estágio — e o dono,
 * jogando como quem chega: "os capturados continuam no nível 1, então eles não
 * acompanham o inicial e o time não fica forte". Medido: o inicial no nível 6
 * com dois do nível 1 vence a Floresta em 0%; com dois do nível 3–4, o
 * degrau passa a existir.
 *
 * Nasce dois níveis acima da porta do estágio onde foi pega (no 1: nível 3;
 * no 2: 14; no 3: 21; no 4: 33) — e nunca abaixo do nível em que a forma
 * passa a existir (o Metapod do estágio 1 nasce no 7). Das duas leituras da
 * L-233, a do meio: nascer na porta seria o nível 1 de novo no estágio 1, e
 * nascer no nível da forma faria a larva nascer no 1. */
export const NASCE_ACIMA_DA_PORTA = 2;
export function nivelDeNascer(pack, dex, estagio) {
  const porta = NIVEL_DO_ESTAGIO[dentro(estagio) - 1] ?? 1;
  return Math.max(nivelParaExistir(pack, dex), porta + NASCE_ACIMA_DA_PORTA);
}

/* A forma que o encontro deixa: desce a linha até caber. A base sempre cabe
   (`nivelParaExistir` dela é 1), então a descida sempre termina. */
export function formaDoEstagio(pack, dex, estagio) {
  let atual = dex;
  for (let i = 0; i < 8 && !capturavelNoEstagio(pack, atual, estagio); i++) {
    const e = entradaDe(pack, atual);
    if (!e) break;
    atual = e.de;
  }
  return atual;
}

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
