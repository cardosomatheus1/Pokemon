/* O CLIMA DO AVANÇO — bloco 1.32, a L-119.
 *
 * Fronteira: entra o clima sorteado e quem foi à run; sai quanto ela rende a
 * mais, e em qual canal. Puro, sem DOM, sem relógio e sem tema — os nomes, os
 * emojis e os tipos moram no ContentPack, como manda o §0.3.
 *
 * ── O EIXO DO IDLE NÃO É O DA ARENA, E ISSO É O BLOCO INTEIRO ────────────
 *
 * A Arena já tem clima, e lá ele muda DANO: Sol dobra o ataque de quem é de
 * fogo. No Avanço o dono pediu outra coisa, e foi específico:
 *
 *   O pedido dele, parafraseado — a citação literal cita a franquia, e o §0.3
 *   não a deixa entrar no motor: um clima de sol deveria dar cerca de 2,5% de XP
 *   a mais no farm da rota para quem levasse uma criatura de fogo, e o jogador
 *   precisava SENTIR a melhoria na prática.
 *
 * E a regra que ele nomeou, que é a que este arquivo protege:
 *
 *   > **O que importa é a criatura ENVIADA, não a que aparece na cena.**
 *
 *   (Palavras dele, com o substantivo trocado pelo genérico — a original cita a
 *   franquia, e §0.3 mantém o motor cego a tema, comentário incluído.)
 *
 * A sprite é encenação. Quem paga é quem o jogador escolheu levar — senão o
 * bônus vira sorteio sobre sorteio, e não há decisão nenhuma para tomar.
 *
 * ── QUANTO ELE PAGA, E POR QUE ISSO NÃO É UMA TABELA ─────────────────────
 *
 * O dono levantou o Gelo, que tem QUATRO espécies num elenco de 146, e estava
 * certo em levantar. A resposta fácil seria escrever um número maior na linha
 * do Gelo. A resposta que não envelhece é fazer o número SAIR da raridade:
 *
 *   > Um clima fácil de satisfazer paga pouco; um clima que quase ninguém
 *   > consegue aproveitar paga muito. E ninguém precisa reescrever a tabela
 *   > quando o elenco mudar.
 *
 * Medido no pack de referência do projeto (146 espécies), com o passo por criatura:
 *
 *     poison   33 (22,6%)   5,0%      <- o MAIOR tipo do elenco, e era órfão
 *     water    32 (21,9%)   5,1%
 *     ground+
 *     rock     25 (17,1%)   5,7%
 *     flying   16 (11,0%)   7,1%
 *     grass    14 ( 9,6%)   7,7%
 *     fire     11 ( 7,5%)   8,7%
 *     ice       4 ( 2,7%)  14,3%      <- o clima de sorte grande
 *
 * ── E A VAGA EXTRA RENDE MENOS, PELA MESMA RÉGUA DO COMBATE ──────────────
 *
 * O bônus não é `passo × quantos`. Ele usa o MESMO `PESO_DA_VAGA` que o poder
 * da equipe usa — 100%, 55%, 35%, 20% —, e o motivo é o mesmo que o dono deu
 * quando aquilo foi decidido: *"o jogador precisa sentir a recompensa, mas não
 * pode ser nada surreal e quebrado"*.
 *
 * Com quatro do tipo, o multiplicador soma 2,1 e não 4:
 *
 *     fogo, equipe cheia    8,7% x 2,1  =  +18%
 *     gelo, equipe cheia   14,3% x 2,1  =  +30%
 *     veneno, equipe cheia  5,0% x 2,1  =  +11%
 *
 * Duas réguas para "levar mais do mesmo" seriam duas coisas para o jogador
 * aprender, e ele já aprendeu esta.
 */
import { PESO_DA_VAGA } from './wave.mjs';

/* ── OS CANAIS ────────────────────────────────────────────────────────────
 *
 * Cinco, e o motor só conhece estes nomes — qual clima paga em qual é decisão
 * do pack, que é onde o tema mora.
 *
 *     xp         o que a run credita nas criaturas
 *     moeda      o que ela credita na bolsa
 *     material   o viés de material no baú
 *     itemRaro   o viés de raridade no baú
 *     ritmo      a VELOCIDADE da wave — o único que o jogador vê acontecer
 *                sem ler número nenhum, e é por isso que ele existe
 */
export const CANAIS = ['xp', 'moeda', 'material', 'itemRaro', 'ritmo'];
export const ehCanal = c => CANAIS.includes(c);

/* ── O PASSO, E DE ONDE SAEM OS QUATRO NÚMEROS ────────────────────────────
 *
 * `FRACAO_REF` é o tipo de referência: um que cobre um DÉCIMO do elenco paga o
 * `PASSO_BASE`. Daí para baixo o passo sobe pela raiz da razão — raiz, e não a
 * razão crua, porque crua o Gelo pagaria 8x o Veneno e a run viraria loteria
 * de clima em vez de decisão de equipe.
 *
 * O piso e o teto existem para que nem o tipo mais comum pague zero, nem o mais
 * raro pague o dobro de uma run inteira. */
export const PASSO_BASE = 0.075;
export const FRACAO_REF = 0.10;
export const PASSO_MIN = 0.04;
export const PASSO_MAX = 0.18;

const numero = (v, padrao = 0) => (Number.isFinite(Number(v)) ? Number(v) : padrao);

/* Quantas espécies do elenco têm ALGUM dos tipos do clima. Um clima pode
   favorecer mais de um tipo (a Tempestade cobre terra e pedra), e quem tem os
   dois conta UMA vez — senão a cobertura mentiria para cima e o passo cairia. */
export function coberturaDo(especies, tipos) {
  const alvo = new Set((Array.isArray(tipos) ? tipos : [tipos]).filter(Boolean));
  if (!alvo.size) return 0;
  let n = 0;
  for (const e of especies ?? []) {
    const meus = e?.t ?? e?.tipos ?? e?.types ?? [];
    if (meus.some(t => alvo.has(t))) n++;
  }
  return n;
}

export function passoDoClima(cobertura, total) {
  const c = Math.max(0, numero(cobertura));
  const n = Math.max(1, numero(total, 1));
  if (c <= 0) return PASSO_MAX;      /* tipo que não existe no elenco: nunca paga,
                                        mas o número não pode ser NaN nem zero */
  const fracao = c / n;
  const passo = PASSO_BASE * Math.sqrt(FRACAO_REF / fracao);
  return Math.min(PASSO_MAX, Math.max(PASSO_MIN, passo));
}

/* ── O SORTEIO ────────────────────────────────────────────────────────────
 *
 * Por peso, como o da Arena. `neutro` tem o maior peso de todos e isso é
 * desenho, não sobra:
 *
 *   > "o clima da run é RNG, e não acontece sempre."
 *
 * Um bônus que cai toda run deixa de ser acontecimento e vira a linha de base —
 * e aí o jogador não sente melhoria nenhuma, sente o normal. */
export function sortearClimaIdle(sorte, lista) {
  const climas = (Array.isArray(lista) ? lista : []).filter(c => c && numero(c.w) > 0);
  if (!climas.length) return null;
  const total = climas.reduce((a, c) => a + numero(c.w), 0);
  const r = (typeof sorte === 'function' ? sorte() : 0) * total;
  let acc = 0;
  for (const c of climas) {
    acc += numero(c.w);
    if (r < acc) return c;
  }
  return climas[climas.length - 1];
}

export const climaPorChave = (lista, chave) =>
  (Array.isArray(lista) ? lista : []).find(c => c?.key === chave) ?? null;

/* ── QUEM DA EQUIPE APROVEITA ─────────────────────────────────────────────
 *
 * Recebe a equipe JÁ RESOLVIDA em espécies — este arquivo não sabe achar
 * criatura em estado de jogo, e não deve. Devolve os índices que casam, na
 * ordem em que foram enviados, porque a ORDEM decide o peso da vaga. */
export function quemAproveita(equipe, tipos) {
  const alvo = new Set((Array.isArray(tipos) ? tipos : [tipos]).filter(Boolean));
  if (!alvo.size) return [];
  const fora = [];
  (equipe ?? []).forEach((c, i) => {
    const meus = c?.t ?? c?.tipos ?? c?.types ?? [];
    if (meus.some(t => alvo.has(t))) fora.push(i);
  });
  return fora;
}

/* ── O BÔNUS ──────────────────────────────────────────────────────────────
 *
 * Devolve SEMPRE a mesma forma, inclusive no neutro — quem lê não precisa de
 * um `if` para saber se há bônus, e a tela do aviso pode dizer "nada aqui" com
 * os mesmos campos com que diria "+18% de XP".
 *
 *     canal      em que moeda ele paga, ou `null`
 *     fator      1 quando não paga nada; 1,18 num +18%
 *     passo      quanto vale UMA criatura do tipo
 *     quantos    quantas da equipe casam
 *     peso       a soma dos pesos de vaga delas — é o que multiplica o passo
 */
export function bonusDoClima(clima, { equipe = [], especies = [] } = {}) {
  const vazio = { canal: null, fator: 1, passo: 0, quantos: 0, peso: 0, tipos: [] };
  const tipos = (Array.isArray(clima?.tipos) ? clima.tipos
               : clima?.tipo ? [clima.tipo] : []).filter(Boolean);
  if (!clima || !tipos.length || !ehCanal(clima.rende)) return vazio;

  const passo = passoDoClima(coberturaDo(especies, tipos), (especies ?? []).length);
  const quais = quemAproveita(equipe, tipos);
  /* O PESO É O DA VAGA EM QUE ELA FOI ENVIADA. Fora da tabela — uma quinta
     vaga que ainda não existe — vale o último peso, e não zero: o teto da
     tabela é uma decisão de calibração, não uma proibição. */
  const peso = quais.reduce(
    (a, i) => a + (PESO_DA_VAGA[i] ?? PESO_DA_VAGA[PESO_DA_VAGA.length - 1]), 0);

  return { canal: clima.rende, fator: 1 + passo * peso, passo,
           quantos: quais.length, peso, tipos };
}

/* ── E COMO CADA CANAL APLICA ─────────────────────────────────────────────
 *
 * Quatro canais MULTIPLICAM o que a run rende. O `ritmo` DIVIDE, e a diferença
 * não é capricho: `ritmo` é a duração da wave, então "render mais" ali quer
 * dizer "durar menos". Multiplicar faria a Chuva deixar o farm mais LENTO —
 * exatamente o contrário do que o pedido diz.
 *
 * É o tipo de inversão que passa despercebida numa revisão e aparece como
 * "está estranho" três blocos depois. */
export function aplicarClima(valor, bonus, canal) {
  const v = numero(valor, 0);
  if (!bonus || bonus.canal !== canal || bonus.fator === 1) return v;
  return canal === 'ritmo' ? v / bonus.fator : v * bonus.fator;
}
