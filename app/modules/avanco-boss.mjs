/* O ANÚNCIO DO CHEFE — nome no meio da tela e vida em destaque (camada 0).
 *
 * ── O PEDIDO ─────────────────────────────────────────────────────────────
 *
 *   > "no final podem vir os boss em forma de luta 1x1 (…) ele é mais difícil,
 *   >  aparece com hp em destaque e nome no meio da tela"
 *
 * ── POR QUE UM ANÚNCIO, E NÃO SÓ UMA PLACA MAIOR ────────────────────────
 *
 * As nove primeiras waves são uma FILA: entra, cai, entra o próximo. A décima
 * é a única em que a wave para de ser fila e vira duelo — e uma diferença de
 * estrutura que a tela não marca é uma diferença que o jogador não sente.
 *
 *   > O chefe com placa de 68 px, igual à do Caterpie que ele derrubou na wave
 *   > 3, é o motor dizendo "isto é diferente" e a tela dizendo "não é".
 *
 * ── O ANÚNCIO TEM PRAZO, e o prazo é a razão de ele funcionar ───────────
 *
 * Ele aparece quando o chefe entra e SAI sozinho. Um nome permanente no meio
 * da tela vira moldura — e esta é a tela que fica aberta por horas, onde
 * qualquer coisa parada deixa de ser vista em minutos.
 *
 * A barra de vida, essa, FICA: ela responde "quanto falta" o duelo inteiro, e
 * é a pergunta que decide a poção.
 *
 * ── PURO, E É DE PROPÓSITO ──────────────────────────────────────────────
 *
 * Ele recebe a cena e o instante, e devolve o que se lê. Nada de DOM aqui: as
 * frases do quadro do fim e as leituras do foco moraram dentro de `innerHTML`
 * e o portão Q2 cobrou o preço quatro vezes — defeito plantado que apaga uma
 * frase passa, porque não há como afirmar a resposta sem montar um navegador.
 */

/* Quanto o nome fica no meio da tela. Três segundos e meio: o bastante para
   ler um nome e registrar que a coisa mudou, e pouco o bastante para não
   competir com o primeiro golpe do duelo — que acontece logo depois da
   caminhada de entrada. */
export const ANUNCIO_MS = 3_500;

/* Abaixo disto a barra do chefe acende: é o "ele está quase" que faz o jogador
   parar de olhar o filme e olhar a tela. Um quinto, e não um décimo — a
   décima parte de um duelo curto passa entre dois golpes. */
export const BEIRA_DA_QUEDA = 0.2;

const inteiro = n => Math.max(0, Math.round(Number(n) || 0));

/* ── QUEM É O CHEFE DA CENA ───────────────────────────────────────────────
 *
 * `null` quando não há — e ausência é a resposta normal, porque nove das dez
 * waves não têm chefe nenhum. Quem chama trata `null` como "não desenhe", e
 * não como erro. */
export function chefeEmCena(cena) {
  for (const m of (cena?.emCena ?? []).values?.() ?? cena?.emCena ?? [])
    if (m?.chefe) return m;
  return null;
}

/* ── O QUE A TELA LÊ SOBRE ELE ────────────────────────────────────────────
 *
 * `agora` é o instante DA RUN, e não o do relógio: a run é reconstruída ao
 * reabrir a aba (§7.22.16), e um anúncio ancorado em `Date.now()` apareceria
 * de novo a cada recarregamento — ou nunca. O instante da run é o mesmo nas
 * duas entradas, que é a regra do modo inteiro. */
export function leituraDoChefe(cena, agora) {
  const m = chefeEmCena(cena);
  if (!m) return null;

  const hpMax = inteiro(m.hpMax) || 1;
  const hp = Math.min(hpMax, inteiro(m.hp));
  const vida = Math.max(0, Math.min(1, hpMax ? hp / hpMax : 0));

  /* DESDE QUANDO ele está em cena. Sem isso o anúncio não teria prazo, e sem
     prazo ele vira moldura. */
  const desde = Number(m.desde);
  const idade = Number.isFinite(desde) && Number.isFinite(Number(agora))
    ? Number(agora) - desde : Infinity;

  return {
    dex: m.dex ?? null,
    hp, hpMax, vida,
    /* O ANÚNCIO É EFÊMERO; A BARRA FICA. Duas perguntas em dois tempos: "o que
       é isso?" se responde uma vez, e "quanto falta?" o duelo inteiro. */
    anunciando: idade >= 0 && idade < ANUNCIO_MS,
    /* E ELE ACENDE NA BEIRA. Não é enfeite: é o instante em que a poção deixa
       de valer a pena e vale a pena aguentar. */
    naBeira: vida > 0 && vida <= BEIRA_DA_QUEDA,
    caiu: vida <= 0,
  };
}
