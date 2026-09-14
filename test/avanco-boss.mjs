/* Q1/Q5 · O ANÚNCIO DO CHEFE (L-170).
 *
 *   > "no final podem vir os boss em forma de luta 1x1 (…) ele é mais difícil,
 *   >  aparece com hp em destaque e nome no meio da tela"
 *
 * ── O QUE ESTE ARQUIVO DEFENDE ────────────────────────────────────────────
 *
 *   A DIFERENÇA SE VÊ   nove waves são fila; a décima é duelo. Diferença de
 *                       estrutura que a tela não marca é diferença que o
 *                       jogador não sente
 *   O ANÚNCIO TEM PRAZO nome permanente no meio da tela vira moldura, e esta é
 *                       a tela que fica aberta por horas
 *   A BARRA FICA        "quanto falta" é a pergunta que decide a poção, e ela
 *                       vale o duelo inteiro
 *   O INSTANTE É DA RUN e não do relógio: reabrir a aba tem de cair no mesmo
 *                       caminho de quem nunca fechou (§7.22.16)
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  ANUNCIO_MS, BEIRA_DA_QUEDA, chefeEmCena, leituraDoChefe,
} from '../app/modules/avanco-boss.mjs';

/* Uma cena como o motor a entrega: `emCena` é um Map de índice -> mob. */
const cena = (...mobs) => ({ emCena: new Map(mobs.map((m, i) => [i, m])) });
const mob = (extra = {}) => ({ i: 0, dex: 10, hp: 100, hpMax: 100, desde: 0, ...extra });

export function suite() {
  const s = criarSuite('avanco-boss');

  s.teste('sem chefe em cena, não há o que anunciar', () => {
    igual(leituraDoChefe(cena(mob(), mob({ dex: 13 })), 1000), null,
      'uma wave comum produziu anúncio de chefe — o nome no meio da tela ' +
      'apareceria em nove das dez waves, e deixaria de significar qualquer coisa');
    igual(leituraDoChefe(null, 0), null, 'cena ausente derrubou a leitura');
    igual(leituraDoChefe({ emCena: new Map() }, 0), null, 'cena vazia inventou um chefe');
    igual(chefeEmCena(cena(mob())), null, 'um comum foi lido como chefe');
  });

  s.teste('o chefe é achado, e a vida dele é a fração que a barra desenha', () => {
    const l = leituraDoChefe(cena(mob({ chefe: true, hp: 60, hpMax: 240 })), 0);
    ok(l, 'o chefe em cena não foi encontrado');
    igual(l.hp, 60); igual(l.hpMax, 240);
    igual(l.vida, 0.25, 'a fração da barra saiu errada');

    /* NÚMERO ESQUISITO NÃO DERRUBA A BARRA: estado a meio carregar e save
       adulterado chegam aqui, e uma barra com largura NaN some da tela sem
       dizer nada. */
    for (const ruim of [{ hp: -5 }, { hp: 999 }, { hpMax: 0 }, { hp: null }, { hpMax: null }]) {
      const x = leituraDoChefe(cena(mob({ chefe: true, ...ruim })), 0);
      ok(x.vida >= 0 && x.vida <= 1,
        `a vida saiu ${x.vida} com ${JSON.stringify(ruim)} — a barra ficaria fora da caixa`);
    }
  });

  /* ── O ANÚNCIO TEM PRAZO ─────────────────────────────────────────────
     Um nome permanente no meio da tela vira moldura, e numa tela aberta por
     horas qualquer coisa parada deixa de ser vista em minutos. */
  s.teste('o nome aparece na entrada e SAI sozinho; a barra fica', () => {
    const c = cena(mob({ chefe: true, desde: 10_000 }));

    ok(leituraDoChefe(c, 10_000).anunciando, 'o anúncio não apareceu na entrada');
    ok(leituraDoChefe(c, 10_000 + ANUNCIO_MS - 1).anunciando,
      'o anúncio saiu antes do prazo — não daria tempo de ler o nome');
    ok(!leituraDoChefe(c, 10_000 + ANUNCIO_MS).anunciando,
      `o anúncio passou de ${ANUNCIO_MS} ms. Nome parado no meio da tela vira ` +
      'moldura, e a tela fica aberta por horas');
    ok(!leituraDoChefe(c, 10_000 + 60_000).anunciando,
      'o anúncio continua no ar um minuto depois');

    /* E A BARRA NÃO TEM PRAZO: ela responde "quanto falta" o duelo inteiro. */
    for (const t of [10_000, 10_000 + ANUNCIO_MS, 10_000 + 60_000])
      ok(leituraDoChefe(c, t) !== null && Number.isFinite(leituraDoChefe(c, t).vida),
        `a barra do chefe sumiu no instante ${t} — ela decide a poção`);
  });

  s.teste('antes de ele entrar, o anúncio não se antecipa', () => {
    const c = cena(mob({ chefe: true, desde: 10_000 }));
    ok(!leituraDoChefe(c, 5_000).anunciando,
      'o nome apareceu antes de o chefe entrar em cena — a tela anunciaria ' +
      'quem ainda está vindo pela borda');
  });

  /* ── A BEIRA DA QUEDA ────────────────────────────────────────────────
     Não é enfeite: é o instante em que a poção deixa de valer a pena e vale a
     pena aguentar, e é a última decisão que o duelo pede. */
  s.teste('a barra acende na beira, e cala quando ele cai', () => {
    const naBeira = v => leituraDoChefe(
      cena(mob({ chefe: true, hp: Math.round(v * 200), hpMax: 200 })), 0).naBeira;

    ok(naBeira(BEIRA_DA_QUEDA), 'a beira não acende no próprio limiar');
    ok(naBeira(BEIRA_DA_QUEDA / 2), 'a beira não acende abaixo do limiar');
    ok(!naBeira(BEIRA_DA_QUEDA + 0.1), 'a beira acendeu com vida de sobra — ' +
      'um alarme que toca sempre não é alarme');
    ok(!naBeira(0), 'a beira acendeu com o chefe já caído');

    const caido = leituraDoChefe(cena(mob({ chefe: true, hp: 0, hpMax: 200 })), 0);
    ok(caido.caiu, 'o chefe em zero não foi lido como caído');
    ok(!caido.naBeira, 'quem caiu ainda está "na beira" — o alarme sobreviveria ao duelo');
  });

  /* Ele é lido mesmo acompanhado — a wave é 1x1, mas um save antigo pode ter
     uma décima com companhia, e a tela não pode ficar sem o anúncio por isso. */
  s.teste('o chefe é achado mesmo se houver mais alguém em cena', () => {
    const l = leituraDoChefe(cena(mob(), mob({ dex: 12, chefe: true, hp: 50, hpMax: 100 })), 0);
    ok(l, 'o chefe não foi achado porque não era o primeiro da cena');
    igual(l.dex, 12, 'foi lido o mob errado como chefe');
    igual(l.vida, 0.5, 'a vida lida é a do mob errado');
  });

  return s;
}
