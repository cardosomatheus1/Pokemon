/* O QUE UMA CRIATURA SABE FAZER, PELO NÍVEL DELA (camada 0, Spec §7.22).
 *
 * ── DE ONDE VEIO — o dono, olhando a tela ────────────────────────────────
 *
 *   > "um charmander lv 1-2 era pra usar fire blast? Flamethrower? Tem que se
 *   >  atentar a isso, os poderes são liberados gradativamente com o nível."
 *
 * Ele está certo, e o furo não era de enfeite. O balão sorteava entre TODOS os
 * golpes da espécie, sem olhar quem batia — então o nível decidia o poder em
 * todo lugar do sistema **menos** no único lugar onde o jogador vê o golpe
 * acontecer.
 *
 *   > Uma criatura de nível 1 anunciando o golpe mais forte da linha não é um
 *   > detalhe visual errado: é a tela contando uma história que o resto do
 *   > jogo desmente. E numa tela que fica aberta por horas, ele tem tempo de
 *   > perceber a contradição.
 *
 * ── O NÍVEL DE CADA GOLPE É DERIVADO, E NÃO ESCRITO ──────────────────────
 *
 * O pack não diz em que nível cada golpe entra, e escrever isso à mão seria
 * uma tabela de centenas de pares — centenas de oportunidades de errar um, e o
 * erro seria invisível. Ele já diz outra coisa que serve, e serve melhor: o
 * PODER.
 *
 *     o mais fraco da lista    abre no nível 1
 *     o mais forte da lista    abre no NIVEL_DO_ULTIMO
 *     o resto                  interpola entre os dois
 *
 * Uma conta ou está certa para todos ou está errada para todos — e o teste
 * distingue as duas coisas em milissegundos. É a mesma escolha que os ícones
 * de cabeça fizeram no 1.19, e pelo mesmo motivo.
 *
 * ── A ESCALA É DA LISTA, E NÃO DO JOGO ───────────────────────────────────
 *
 * O mínimo e o máximo saem da PRÓPRIA lista de golpes daquele tipo. Uma escala
 * global faria o tipo cujos golpes são todos fracos abrir tudo no nível 1, e o
 * tipo pesado não abrir nada até tarde — a criatura ficaria muda metade da
 * vida por ter nascido de um tipo forte.
 *
 * ── E ELE NUNCA DEVOLVE VAZIO ────────────────────────────────────────────
 *
 * Nível 1 abre pelo menos UM: o mais fraco. Repertório vazio seria balão vazio,
 * e balão vazio é pior que golpe simples — o jogador leria "quebrou", e não
 * "ainda não aprendeu".
 *
 * Sem tema: entram objetos com `p`, saem os mesmos objetos. Este arquivo não
 * sabe nome de golpe nem de criatura (§0.3).
 */

/* Onde o golpe mais forte da lista abre. Cinquenta e cinco, e o número tem os
   dois lados: cedo demais e a progressão não se sente; tarde demais e o
   jogador passa a vida com o repertório pela metade — o teto de nível é 100,
   mas quase toda criatura vive abaixo dele. */
export const NIVEL_DO_ULTIMO = 55;

const poder = g => Math.max(0, Number(g?.p) || 0);
const nivelDe = n => Math.max(1, Math.floor(Number(n) || 1));

/* Os limites da lista, calculados uma vez por chamada. Recalcular por golpe
   seria N vezes a mesma varredura numa função chamada a cada balão. */
const limites = lista => {
  const ps = (lista ?? []).map(poder);
  return ps.length ? { min: Math.min(...ps), max: Math.max(...ps) } : { min: 0, max: 0 };
};

/* ── EM QUE NÍVEL AQUELE GOLPE ABRE ───────────────────────────────────────
 *
 * Devolve 1 quando a lista é plana (todos com o mesmo poder, ou sem poder
 * declarado): sem diferença entre eles, não há gradação a fazer, e travar
 * todos até o 55 deixaria a criatura muda sem motivo. */
export function nivelDoGolpe(golpe, lista) {
  const { min, max } = limites(lista);
  if (max <= min) return 1;
  const t = (poder(golpe) - min) / (max - min);
  return Math.max(1, Math.round(t * NIVEL_DO_ULTIMO));
}

/* ── O QUE ELA SABE AGORA ─────────────────────────────────────────────────
 *
 * A lista dos golpes abertos, na ordem em que o pack os declara — a ordem é
 * do tema, e reordenar aqui faria o índice sorteado pelo motor apontar para
 * outro golpe a cada nível que a criatura sobe. */
export function repertorio(nivel, lista) {
  const todos = (lista ?? []).filter(Boolean);
  if (!todos.length) return [];
  const n = nivelDe(nivel);
  const abertos = todos.filter(g => nivelDoGolpe(g, todos) <= n);
  if (abertos.length) return abertos;
  /* ── ESTE SOCORRO É INALCANÇÁVEL POR CONSTRUÇÃO, e fica mesmo assim ────
   *
   * O portão Q2 provou: o defeito plantado que o removia **passou**, porque
   * nenhuma lista chega aqui. A escala sai da PRÓPRIA lista, então o mais
   * fraco dela sempre tem `t = 0` e abre no nível 1 — sempre.
   *
   * Ele fica por uma razão, e não por hábito: a inalcançabilidade depende de
   * uma propriedade da ESCALA, e a escala é o que um bloco de balanço mexe. No
   * dia em que ela deixar de sair da lista, este ramo é a diferença entre uma
   * criatura muda e um balão vazio — e balão vazio é lido como "quebrou".
   *
   * O que NÃO fica é um defeito plantado sobre ele: defeito que não pode ser
   * pego é o que o pré-voo chama de inócuo, e ele ocupa o lugar de um que
   * pegaria. A garantia é afirmada direto no `test/repertorio.mjs`, por
   * varredura de cem listas. */
  let maisFraco = todos[0];
  for (const g of todos) if (poder(g) < poder(maisFraco)) maisFraco = g;
  return [maisFraco];
}

/* Quantos ela sabe. Atalho para quem só precisa do tamanho — o motor sorteia
   um ÍNDICE, e o tamanho é tudo o que ele precisa saber. */
export const quantosSabe = (nivel, lista) => repertorio(nivel, lista).length;

/* ── O PRÓXIMO QUE ELA APRENDE ────────────────────────────────────────────
 *
 * `null` quando não falta nenhum. Serve à tela: "aprende X no nível N" é o que
 * transforma subir de nível em promessa, em vez de um número que muda. */
export function proximoGolpe(nivel, lista) {
  const todos = (lista ?? []).filter(Boolean);
  const n = nivelDe(nivel);
  let melhor = null, melhorNivel = Infinity;
  for (const g of todos) {
    const abre = nivelDoGolpe(g, todos);
    if (abre > n && abre < melhorNivel) { melhor = g; melhorNivel = abre; }
  }
  return melhor ? { golpe: melhor, nivel: melhorNivel } : null;
}
