/* O AVANÇO: O QUE ELE CUSTA E O QUE ELE RENDE (blocos A5 e A3, camada 0).
 *
 * Fronteira: entra o resultado de uma run e o estado do dia; sai o que muda no
 * teto, na stamina e na bolsa. Puro, sem DOM, sem estado guardado e sem tema.
 *
 * Os dois blocos moram aqui porque respondem à MESMA pergunta em duas metades,
 * e separá-los criaria dois módulos tendo de concordar sobre a forma do estado
 * — que é a primeira parada do caminho para duas verdades.
 *
 *     A5 (§7.22.2)  as TRÊS UNIDADES: abate, encontro, avanço
 *     A3 (§7.22.7)  o que a run COBRA: stamina, HP, poção, e o baú
 */

import { COMUNS_POR_ESTAGIO, CHEFES_POR_ESTAGIO } from './elenco-estagio.mjs';
import { WAVES, HP_MAX } from './wave.mjs';
import { comprometido, tetoDeEncontros, STAMINA_MAX, staminaAgora } from './expedicao.mjs';
import { xpDaExpedicao } from './nivel-criatura.mjs';

/* ═══════════════════════════════════════════════════════════════════════════
   A5 — AS TRÊS UNIDADES, E POR QUE ELAS NÃO PODEM SER A MESMA
   ═══════════════════════════════════════════════════════════════════════════

   Esta é a peça que salva o teto do §P5, e sem ela o desenho inteiro estoura:

       ABATE      um mob derrubado.  ~58 por avanço.  NÃO consome teto.
       ENCONTRO   uma ESPÉCIE que apareceu e pode receber bola.  no máximo 6.
       AVANÇO     o estágio limpo.  paga o baú.

   Cinquenta e oito mobs numa run contra um teto diário de trinta encontros
   seria quase o DOBRO do dia inteiro numa única ida — o dono viu isso sozinho
   ao descrever a mecânica, antes de qualquer conta.

     > Um mob é espetáculo. Uma espécie é economia. E as duas frases descrevem
     > a mesma tela.

   O painel "quem apareceu" já lista ESPÉCIES, e não indivíduos. Ele não muda
   de forma; muda o que o alimenta. */

/* O elenco do estágio tem 4 + 2, e é ele o teto de encontros de uma run. Sai
   do A1 por importação, e não por um número escrito de novo aqui: dois lugares
   dizendo "seis" divergem no dia em que um deles virar sete. */
export const ENCONTROS_POR_AVANCO = COMUNS_POR_ESTAGIO + CHEFES_POR_ESTAGIO;

const lista = r => (Array.isArray(r?.abates) ? r.abates : []);

/* Quantos MOBS caíram. É o número do espetáculo — o que o log conta e o que a
   tela mostra —, e ele não toca o teto. */
export const abatesDe = r => lista(r).reduce((a, x) => a + (Number(x?.quantos) || 0), 0);

/* Quantas ESPÉCIES apareceram. É o número da economia, e é este que o teto
   conta. Distintas de propósito: três da mesma espécie são um encontro, senão
   o teto sumiria em duas waves. */
export const encontrosDe = r => [...new Set(lista(r).map(x => x?.dex).filter(d => d != null))];

/* ── A RESERVA, E ELA TEM A MESMA FORMA DA EXPEDIÇÃO ─────────────────────
 *
 * O número de encontros só existe no FIM da run: quantas espécies apareceram
 * depende do sorteio de cada wave. Então reserva-se o máximo ao sair e devolve-
 * se a sobra ao colher, exatamente como o §7.13 já faz — e pelo mesmo motivo:
 * assim o teto nunca é ultrapassado, e a recusa acontece no CLIQUE, onde o
 * jogador consegue entender.
 *
 * `estado.reservas` é uma lista de números, e não de perfis, porque quem
 * reserva não precisa ser expedição. O teto é de ENCONTROS. */
export const cabeAvanco = estado =>
  comprometido(estado ?? {}) + ENCONTROS_POR_AVANCO
    <= tetoDeEncontros(estado?.vistas, estado?.total);

export function reservarAvanco(estado) {
  const e = estado ?? {};
  if (!cabeAvanco(e))
    throw new Error(
      `o teto diário de ${tetoDeEncontros(e.vistas, e.total)} encontros não ` +
      `comporta mais um avanço: ${comprometido(e)} já comprometidos, e ele ` +
      `reserva ${ENCONTROS_POR_AVANCO}`);
  /* Não muta: devolve estado novo, como o `creditar` e a loja. É o que impede
     meia-reserva gravada se algo falhar no meio. */
  return { ...e, reservas: [...(e.reservas ?? []), ENCONTROS_POR_AVANCO] };
}

export function colherAvanco(estado, resultado) {
  const e = estado ?? {};
  const reservas = [...(e.reservas ?? [])];
  const i = reservas.indexOf(ENCONTROS_POR_AVANCO);
  if (i >= 0) reservas.splice(i, 1);
  return {
    ...e, reservas,
    encontrosHoje: (e.encontrosHoje ?? 0) + encontrosDe(resultado).length,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   A3 — O QUE A RUN COBRA
   ═══════════════════════════════════════════════════════════════════════════

   Ver o bloco abaixo. */

/* ── A STAMINA É POR WAVE, E ELA PACEIA O NOVATO ─────────────────────────
 *
 * O HP é o relógio DENTRO da run; a stamina é o relógio ENTRE elas. Duas
 * barras para dois horizontes, e é o que faz a decisão existir nos dois:
 * gastar a poção agora, ou guardar a criatura para o próximo avanço.
 *
 *     2 por wave · 5 na do chefe  =  23 pelo estágio inteiro
 *
 * ── O NÚMERO MUDOU POR CORREÇÃO DO DONO, E ELE ESTAVA CERTO ────────────
 *
 * A primeira versão cobrava 3 e 8, somando 35. Ele viu o problema antes de
 * qualquer medição:
 *
 *   > "o cara novato que chega jogar primeira vez só iria conseguir fazer
 *   >  2 run, isso é um pouco broxante"
 *
 * Medido, e ele tem razão — com uma criatura só, que é o que um novato tem:
 *
 *     3/8 = 35    2 runs por criatura · 4,4 h para repor uma
 *     2/5 = 23    4 runs por criatura · 2,9 h para repor uma
 *
 * A stamina estava mordendo justamente quem menos podia contornar. Quem tem
 * quatro criaturas não sentia nada; quem tem uma parava depois de oitenta
 * minutos.
 *
 *   > Um limite que aperta o novato e afrouxa no veterano está no eixo errado.
 *
 * ── E A REGRA DA COLEÇÃO SOBREVIVE, QUE É O QUE IMPORTAVA ──────────────
 *
 * O teto diário são CINCO avanços. Com 23, uma criatura faz QUATRO — então
 * ainda falta uma, e a segunda criatura continua sendo necessária para o dia
 * cheio. A regra do §7.13 fica de pé:
 *
 *     o teto do farm é o tamanho da coleção
 *
 * O que mudou foi de onde ela morde: antes o novato precisava de três
 * criaturas para jogar o dia; agora precisa de duas para FECHAR o dia, e de
 * uma só para jogar bastante. As duas coisas cabem, e o teste afirma as duas.
 *
 * (A conta do dono somava 25 com 2 e 5; 9 × 2 + 5 dá 23. As duas dão as mesmas
 *  quatro runs, e ficaram os números literais dele.) */
export const STAMINA_POR_WAVE = 2;
export const STAMINA_DO_CHEFE = 5;

export const STAMINA_DO_AVANCO = (WAVES - 1) * STAMINA_POR_WAVE + STAMINA_DO_CHEFE;

/* Quanto custa parar na wave N. Cobra pelas waves ALCANÇADAS, e não pelo
   estágio: quem caiu na sexta já perdeu o baú, e cobrar dez seria punir duas
   vezes a mesma derrota. */
export function staminaAteWave(n) {
  const w = Math.min(WAVES, Math.max(0, Math.floor(Number(n) || 0)));
  if (w <= 0) return 0;
  return w >= WAVES
    ? STAMINA_DO_AVANCO
    : w * STAMINA_POR_WAVE;
}

/* UMA CRIATURA SEM STAMINA REPROVA A EQUIPE INTEIRA — e a recusa diz quem.
   Mesma forma do `podeEnviar` do §7.13, e de propósito: duas regras diferentes
   para "esta equipe pode sair?" seriam duas telas discordando. */
export function podeAvancar(equipe, agora) {
  const semStamina = (Array.isArray(equipe) ? equipe : [])
    .filter(c => staminaAgora(c, agora) < STAMINA_DO_AVANCO)
    .map(c => c?.id);
  return { pode: semStamina.length === 0, semStamina, custo: STAMINA_DO_AVANCO };
}

/* ── A POÇÃO ──────────────────────────────────────────────────────────────
 *
 * O motor sabe que existe item que RESTAURA; quais itens fazem isso é decisão
 * do tema (§0.3). Um pack sem poção nenhuma continua jogável — o avanço só fica
 * mais duro, que é uma consequência de conteúdo e não um erro de motor.
 *
 * E os números do pack são proporcionais ao DANO MEDIDO, e não à tabela do
 * material de origem: lá a barra tem centenas de pontos, aqui ela tem cem.
 * Pedido literal do dono: *"os danos de combate precisam ser coniventes com a
 * cura, pra não acabar ficando desproporcional"*. A `test/avanco` afirma a
 * RELAÇÃO entre as duas coisas, e não os números — se alguém mexer no dano, o
 * teste recalcula e reclama. */
export function curaDe(pack, id) {
  const item = (pack?.catalogo ?? []).find(i => i.id === id);
  const v = Number(item?.cura);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function usarCura({ pack, item, hp, bolsa }) {
  const cura = curaDe(pack, item);
  if (!cura) throw new Error(`"${item}" não restaura vida`);
  const tem = Number(bolsa?.[item]) || 0;
  if (tem < 1) throw new Error(`você não tem ${item}`);
  const atual = Math.max(0, Math.min(HP_MAX, Number(hp) || 0));
  return {
    /* NUNCA passa do cheio. Sobra de cura é HP inventado, e HP inventado é a
       run inteira ficando de graça para quem carregar poção demais. */
    hp: Math.min(HP_MAX, atual + cura),
    bolsa: { ...bolsa, [item]: tem - 1 },
  };
}

/* ── O QUE A RUN PAGA ─────────────────────────────────────────────────────
 *
 * §7.22.8, e é regra herdada do bloco 1.7b — ela não se negocia:
 *
 *   > Um idle que castiga o jogador por estar ausente está castigando o
 *   > jogador por usar o produto como ele foi feito.
 *
 *     FALHOU   fica TUDO que as waves renderam — abates, encontros, o farm
 *              PERDE o baú do estágio e o desbloqueio do seguinte
 *     LIMPOU   tudo aquilo MAIS o baú, e a porta seguinte abre
 *
 * É a tensão que o dono pediu — *"sentir a dificuldade"* — sem a punição que
 * mataria o modo ausente do lado. */
export function premioDo(resultado, { encontrosValem = true } = {}) {
  const r = resultado ?? {};
  const limpou = r.completou === true;
  return {
    abates: abatesDe(r),
    /* ── O TETO LIMITA O RENDIMENTO, E NÃO O DIREITO DE JOGAR (L-151) ────
     *
     * Decisão do dono, 08/09/2026, e ela nasceu de uma pergunta dele:
     *
     *   > "e como vai ficar questão do teto no novo iddle? Isso não vai
     *   >  acabar limitando muito?"
     *
     * A desconfiança dele apontava um furo real. O teto foi calibrado para a
     * EXPEDIÇÃO, onde cinco envios são o dia inteiro porque cada um custa
     * horas de relógio. No Avanço, cinco runs cabem numa tarde — e a tela
     * feita para ficar aberta por horas travava em três.
     *
     *   > Um limite calibrado no ritmo de um modo não fica errado quando
     *   > outro chega: ele fica NO LUGAR ERRADO.
     *
     * Esgotado o teto, a run acontece igual — abates, XP, moeda, drops, baú
     * e desbloqueio — e o que para é o ENCONTRO. E as três coisas que isso
     * compra valem ser ditas:
     *
     *     o §P5 FICA INTEIRO   o que ele protege é a economia de espécies,
     *                          que vão para a Arena e viram dinheiro. Isso
     *                          segue limitado, exatamente como antes
     *     a PAREDE MORRE       a tela de horas passa a suportar horas
     *     NASCE UMA DECISÃO    "vale gastar stamina numa run sem encontros?"
     *                          Vale por XP e drops; não vale por coleção
     *
     * Aumentar o teto faria o oposto das três. */
    encontros: encontrosValem ? encontrosDe(r) : [],
    /* O baú e o desbloqueio são a MESMA condição, e por isso saem da mesma
       linha: um estágio que abre o seguinte sem pagar o baú faria o clímax
       valer menos que a porta. */
    bau: limpou,
    desbloqueia: limpou,
    stamina: staminaAteWave(r.waves ?? 0),
    hp: Math.max(0, Math.min(HP_MAX, Number(r.hp) || 0)),
  };
}

/* ── O QUE A RUN PAGA ─────────────────────────────────────────────────────
 *
 * O ENCONTRO paga pela MESMA função da expedição, e não por uma tabela nova:
 * o avanço já rende 9 encontros por hora contra 5,3 da Batida, então ele
 * compra TEMPO, e não teto. Pagar mais por encontro além disso somaria as
 * duas vantagens, e o modo ausente viraria decoração.
 *
 * ── O ABATE É O ÚNICO NÚMERO NOVO, E ELE É PEQUENO DE PROPÓSITO ──────────
 *
 * O §7.22.2 diz que o abate é ESPETÁCULO. Espetáculo que rende zero ensina o
 * jogador a não olhar — a coluna do saque precisa se mexer durante a wave,
 * que é a peça de retenção da referência e vale copiar.
 *
 * A primeira proposta foi 1/10, e ela se contradizia no mesmo fôlego:
 *
 *     1/10   58 × 0,1 = 5,8 contra 6 dos encontros  ->  DOBRA a run, e o
 *            avanço passaria a pagar 2× por encontro do que a expedição —
 *            exatamente a paridade que o parágrafo acima defende
 *     1/30   58 ÷ 30  = 1,9 contra 6               ->  +32%
 *
 * Fica 1/30. Quem assiste ganha cerca de um terço a mais por run, além de
 * ganhar tempo — e isso é o prêmio por estar presente, não um segundo
 * salário. */
export const POR_ABATE = 1 / 30;

export function ganhoDaRun({ abates = 0, encontros = 0, perfil = 'trilha' } = {}) {
  const n = Math.max(0, Math.floor(Number(encontros) || 0));
  const k = Math.max(0, Math.floor(Number(abates) || 0));
  /* O abate vale uma fração do ENCONTRO, e por isso passa pela mesma função:
     no dia em que o XP por encontro for recalibrado, o abate acompanha
     sozinho. Uma constante própria aqui envelheceria em silêncio. */
  const porEncontro = xpDaExpedicao({ perfil, encontros: 1 });
  return {
    xp: Math.round(xpDaExpedicao({ perfil, encontros: n }) + k * POR_ABATE * porEncontro),
    /* Quantos "encontros de valor" os abates somam. É o número que a tela
       mostra e o que a medição do bloco afirma. */
    encontrosEquivalentes: k * POR_ABATE,
  };
}

export { HP_MAX, STAMINA_MAX };
