/* O NÍVEL E O VÍNCULO DE UMA CRIATURA (bloco 1.14, camada 0).
 *
 * Fronteira: entram um perfil e quantos encontros saíram; sai quanto a criatura
 * ganhou. Puro, sem DOM, sem estado e sem tema.
 *
 * ── POR QUE ISTO PRECISOU EXISTIR (L-099) ────────────────────────────────
 *
 * `criar()` gravava `nivel: 1, vinculo: 0, foco: null` desde o bloco 1.1, e
 * **nenhum caminho do jogo escrevia nesses três depois.** Três números que
 * existiam e não andavam.
 *
 * O custo não era estético. Era estrutural, e em dois lugares:
 *
 *     A EVOLUÇÃO   `engine/evolucao.mjs` compara `exige: { nivel: 16 }`. Com o
 *                  nível parado em 1, nenhuma linha evolutiva do pack podia
 *                  acontecer — o motor estava pronto e sem entrada.
 *     OS STAGES    a L-084 desbloqueia stage por NÍVEL da criatura. O bloco
 *                  1.10 não podia começar sem este.
 *
 * E o custo para quem joga estava escrito na própria L-099:
 *
 *   > Um número que nunca anda ensina o jogador que o número é falso.
 *
 * ── POR QUE UMA CURVA NOVA, E NÃO A DO TREINADOR ─────────────────────────
 *
 * `engine/progressao.mjs` já tem `100·n^1,5` — e ela é do TREINADOR, que sobe
 * ganhando rodadas de Arena. São escalas diferentes: o treinador ganha em
 * minutos, a criatura ganha em horas de expedição. Reaproveitar a curva faria
 * uma das duas parecer quebrada, e provavelmente as duas.
 *
 * O que NÃO se duplica é a forma de perguntar: as duas expõem `nivelDe` e um
 * `progresso` com os mesmos campos, para a tela não precisar saber qual está
 * desenhando.
 *
 * ── A CALIBRAGEM, E OS NÚMEROS QUE ELA PRODUZ ────────────────────────────
 *
 * O alvo: a PRIMEIRA evolução (nível 16 nas linhas do pack) tem de caber em
 * poucos dias, e a segunda (32 a 36) em algumas semanas. Um idle que leva um
 * mês para o primeiro marco perde o jogador antes de mostrar o que ele é.
 *
 *     nível 16     ~1.740 XP     ~3 dias de teto cheio
 *     nível 32     ~8.000 XP     ~13 dias
 *     nível 36    ~10.300 XP     ~17 dias
 *     nível 50    ~20.400 XP     ~34 dias
 *
 * ── E O XP TAMBÉM DESCE POR HORA, como o dinheiro ────────────────────────
 *
 * Mesma forma da `economia-idle.mjs`, e pela mesma razão: por ENCONTRO o valor
 * sobe com a duração, por HORA ele desce. É o que impede um perfil de dominar
 * os outros — e o que faz a Batida continuar valendo para quem está acordado.
 *
 *     perfil     por encontro   por hora
 *     Batida          8            43
 *     Trilha         14            33
 *     Vigília        20            30
 */

/* A curva. `4·n^2,2` — expoente entre a linear (fácil demais no fim) e a
   cúbica clássica (que colocaria o nível 50 a meio milhão de XP e um ano de
   distância). O nível 1 começa em ZERO: é o defeito D-006, que o `progressao`
   do treinador pagou com uma barra negativa na tela desde sempre. */
export const xpParaNivel = n => (n <= 1 ? 0 : Math.round(4 * Math.pow(n, 2.2)));

export const NIVEL_MAX = 100;

export function nivelDe(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  let n = 1;
  while (n < NIVEL_MAX && x >= xpParaNivel(n + 1)) n++;
  return n;
}

/* Os MESMOS campos do `progressoNivel` do treinador, de propósito: a barra da
   tela não precisa saber qual das duas curvas está desenhando. */
export function progresso(xp) {
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  const n = nivelDe(x);
  const ini = xpParaNivel(n);
  const fim = n >= NIVEL_MAX ? ini : xpParaNivel(n + 1);
  const largura = Math.max(1, fim - ini);
  return {
    nivel: n, ini, fim, atual: x - ini,
    falta: n >= NIVEL_MAX ? 0 : fim - x,
    pct: n >= NIVEL_MAX ? 100 : ((x - ini) / largura) * 100,
    maximo: n >= NIVEL_MAX,
  };
}

/* Quanto cada encontro vale, por perfil. Ver a calibragem no cabeçalho. */
export const XP_POR_ENCONTRO = { batida: 8, trilha: 14, vigilia: 20 };
export const XP_PADRAO = 8;

export const xpPorEncontroDe = perfil => XP_POR_ENCONTRO[perfil] ?? XP_PADRAO;

/* O XP de uma expedição inteira. Determinístico e sem sorteio: **experiência
   não é loteria.** O saque varia porque a graça dele é abrir e ver; o XP não
   varia porque o jogador precisa poder planejar "mais duas Vigílias e ele
   evolui". É a mesma distinção que separou o dinheiro do saque no 1.11. */
export function xpDaExpedicao({ perfil, encontros }) {
  const n = Math.max(0, Math.floor(Number(encontros) || 0));
  return n * xpPorEncontroDe(perfil);
}

/* ── O VÍNCULO ────────────────────────────────────────────────────────────
 *
 * Cresce com TEMPO JUNTOS, e não com resultado. Uma Vigília de oito horas ao
 * lado do treinador constrói mais laço que uma Batida de quarenta e cinco
 * minutos, e é só isso que a fórmula diz.
 *
 * Não conta encontros de propósito: se contasse, vínculo viraria um segundo XP,
 * e duas barras que sobem juntas são uma barra com duas cores. O que ele mede é
 * outra coisa — e no dia em que a Gen 2 entrar, `exige: { vinculo: 220 }` já
 * tem por onde acontecer.
 *
 * O teto de 255 é herança de como esse número sempre foi contado no gênero, e
 * ele importa: sem teto, o vínculo viraria um contador de tempo de jogo. */
export const VINCULO_MAX = 255;
export const MINUTOS_POR_PONTO = 120;

export function vinculoDaExpedicao({ minutos }) {
  const m = Math.max(0, Math.floor(Number(minutos) || 0));
  return 1 + Math.floor(m / MINUTOS_POR_PONTO);
}

/* O ganho aplicado a uma criatura. Devolve os campos NOVOS, e não muta:
   quem guarda é o dono do estado, e este arquivo não é. */
export function creditar(criatura, { xp = 0, vinculo = 0 } = {}) {
  const xpAntes = Math.max(0, Math.floor(Number(criatura?.xp) || 0));
  const xpDepois = xpAntes + Math.max(0, Math.floor(Number(xp) || 0));
  const vAntes = Math.max(0, Math.floor(Number(criatura?.vinculo) || 0));
  return {
    xp: xpDepois,
    nivel: nivelDe(xpDepois),
    vinculo: Math.min(VINCULO_MAX, vAntes + Math.max(0, Math.floor(Number(vinculo) || 0))),
    subiu: nivelDe(xpDepois) - nivelDe(xpAntes),
  };
}
