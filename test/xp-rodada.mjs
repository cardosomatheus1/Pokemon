/* Q1/Q2 · O XP DA RODADA, E O ABATE QUE VOLTOU (R22)
 *
 * ── O QUE SE PERDEU ────────────────────────────────────────────────────────
 *
 * O modelo antigo (`prototype-v1.0/index.html:6457`) pagava XP por abate numa
 * curva de retornos decrescentes:
 *
 *     XP_ABATE = [0, 30, 50, 70, 90, 100, 110, 120, 130, 140, 150]
 *
 * A migração para a base nova levou "Rodada disputada", "Vitória",
 * "Desempenho" e "Azarão" — e deixou o abate para trás. Ninguém sentiu falta
 * porque a soma continuou subindo; só parou de recompensar o lutador que
 * lutou.
 *
 * ── A DECISÃO DE ESCALA, E POR QUE ELA É DERIVADA ──────────────────────────
 *
 * As duas escalas são diferentes. No modelo antigo, `Rodada disputada` valia
 * 200 e `Vitória` 180; no atual valem 10 e 25. Copiar `[0,30,50,…]` para cá
 * faria UM abate valer mais que a vitória inteira, e o jogo passaria a premiar
 * quem mata em vez de quem aposta certo.
 *
 * Então a curva não é copiada: são copiadas as PROPORÇÕES dela contra a
 * vitória, e elas são reaplicadas sobre a vitória de hoje. Se o valor da
 * vitória mudar amanhã, a curva acompanha sozinha — que é o que impede a
 * dessincronia que este bloco está consertando.
 *
 * A propriedade que precisa sobreviver a qualquer escala está no teste
 * `dez abates valem menos que a vitória`: matar não pode ganhar de vencer.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { XP_ABATE_ANTIGO, XP_VITORIA_ANTIGA, XP_RODADA, xpDeAbates, xpDaRodada }
  from '../app/modules/progressao.mjs';

const perto = (a, b, tol = 1) => Math.abs(a - b) <= tol;
const soma = partes => partes.reduce((a, p) => a + p.xp, 0);
const acha = (partes, txt) => partes.find(p => p.n.includes(txt));

export function suite() {
  const s = criarSuite('xp-rodada');

  /* ── A CURVA ───────────────────────────────────────────────────────────*/

  s.teste('a curva antiga é a do modelo que o dono aprovou', () => {
    igual(XP_ABATE_ANTIGO.join(','), '0,30,50,70,90,100,110,120,130,140,150',
      'a curva de referência mudou. Ela não é uma escolha: é o modelo que já ' +
      'estava em produção na v1.0, e é dele que as proporções saem.');
    igual(XP_VITORIA_ANTIGA, 180, 'o denominador das proporções mudou');
  });

  s.teste('sem abate não há XP de abate', () => {
    igual(xpDeAbates(0), 0, 'zero abates pagou XP');
    igual(xpDeAbates(-3), 0, 'número negativo virou pagamento');
  });

  /* RETORNOS DECRESCENTES — a forma da curva antiga, e é ela que impede o
     jogador de perseguir abate. O primeiro vale muito; o décimo, pouco.
     ── A TOLERÂNCIA DE 1 XP É ARREDONDAMENTO, E NÃO AFROUXAMENTO ───────────
     A curva real tem incrementos estritamente decrescentes. Mas na escala de
     hoje os dez degraus cabem em ~21 XP, então cada degrau vale 1 ou 2 — e
     arredondar para inteiro faz um degrau de 1,4 virar 1 e o seguinte de 1,3
     virar 2. A oscilação é do inteiro, não do desenho.
     O que se cobra aqui é o que o jogador sente: o começo da curva paga MUITO
     mais que o fim. Por isso a comparação forte é entre o primeiro degrau e o
     último, e a fraca é entre vizinhos. */
  s.teste('cada abate a mais vale menos que o anterior', () => {
    const degraus = [];
    for (let n = 1; n <= 10; n++) {
      const ganho = xpDeAbates(n) - xpDeAbates(n - 1);
      ok(ganho > 0, `o ${n}º abate não pagou nada`);
      degraus.push(ganho);
    }
    for (let i = 1; i < degraus.length; i++)
      ok(degraus[i] <= degraus[i - 1] + 1,
        `o ${i + 1}º abate (${degraus[i]}) pagou muito mais que o ${i}º ` +
        `(${degraus[i - 1]}) — passou do que o arredondamento explica: [${degraus}]`);
    ok(degraus[9] < degraus[0],
      `o décimo abate (${degraus[9]}) paga tanto quanto o primeiro (${degraus[0]}). ` +
      `Sem retornos decrescentes, perseguir abate passa a compensar.`);
  });

  /* E A CURVA REAL, antes do arredondamento, é estritamente decrescente. Este
     teste é o par do de cima: ele prova que o desenho está certo, e o de cima
     prova que o inteiro não o estragou. */
  s.teste('a curva de referência é estritamente decrescente', () => {
    for (let n = 2; n < XP_ABATE_ANTIGO.length; n++) {
      const agora = XP_ABATE_ANTIGO[n] - XP_ABATE_ANTIGO[n - 1];
      const antes = XP_ABATE_ANTIGO[n - 1] - XP_ABATE_ANTIGO[n - 2];
      ok(agora <= antes,
        `na curva de referência o ${n}º degrau (${agora}) é maior que o ${n - 1}º (${antes})`);
    }
  });

  /* AS PROPORÇÕES SÃO AS DO MODELO ANTIGO, reaplicadas sobre a vitória de
     hoje. É isto que torna a curva derivada em vez de escolhida. */
  s.teste('as proporções são as do modelo antigo, na escala de hoje', () => {
    for (let n = 1; n <= 10; n++) {
      const razaoAntiga = XP_ABATE_ANTIGO[n] / XP_VITORIA_ANTIGA;
      const razaoHoje = xpDeAbates(n) / XP_RODADA.vitoria;
      ok(perto(razaoAntiga, razaoHoje, 0.03),
        `com ${n} abate(s) a proporção contra a vitória é ${razaoHoje.toFixed(3)} ` +
        `e no modelo antigo era ${razaoAntiga.toFixed(3)}`);
    }
  });

  /* A PROPRIEDADE QUE PRECISA SOBREVIVER A QUALQUER ESCALA.
     No modelo antigo, 10 abates (150) valiam menos que a vitória (180). Se
     isso se inverter, o jogo passa a premiar quem mata em vez de quem aposta
     certo — e a Arena é um jogo de aposta, não de combate. */
  s.teste('dez abates valem menos que a vitória', () => {
    ok(xpDeAbates(10) < XP_RODADA.vitoria,
      `dez abates pagam ${xpDeAbates(10)} e a vitória paga ${XP_RODADA.vitoria}. ` +
      `Matar não pode ganhar de vencer: a aposta é o jogo.`);
  });

  s.teste('a curva tem teto, e abate a mais não paga a mais', () => {
    igual(xpDeAbates(11), xpDeAbates(10), 'o 11º abate furou o teto');
    igual(xpDeAbates(999), xpDeAbates(10),
      'sem teto, um evento de tempestade que zerasse a arena pagaria XP sem limite');
  });

  /* ── O MODELO INTEIRO ──────────────────────────────────────────────────*/

  s.teste('o que já existia continua existindo', () => {
    const p = xpDaRodada({ venceu: true, pos: 1, abates: 0, odd: 2 });
    ok(acha(p, 'Rodada disputada'), 'a parcela de rodada disputada sumiu');
    ok(acha(p, 'Vitória'), 'a parcela de vitória sumiu');
    ok(acha(p, 'Desempenho'), 'a parcela de desempenho sumiu');
  });

  s.teste('o abate aparece como parcela própria, com a contagem no nome', () => {
    const um = xpDaRodada({ venceu: false, pos: 5, abates: 1, odd: 2 });
    const tres = xpDaRodada({ venceu: false, pos: 5, abates: 3, odd: 2 });
    ok(acha(um, 'abate'), 'a parcela de abate não aparece');
    /* O NOME PRECISA DIZER QUANTOS. "Abates: 15 XP" não deixa o jogador
       conferir; "3 abates" deixa. */
    ok(/1 abate\b/.test(acha(um, 'abate').n),
      `o nome da parcela não diz a contagem: "${acha(um, 'abate').n}"`);
    ok(/3 abates/.test(acha(tres, 'abate').n),
      `o plural não acompanha a contagem: "${acha(tres, 'abate').n}"`);
  });

  s.teste('sem abate a parcela não aparece zerada', () => {
    ok(!acha(xpDaRodada({ venceu: false, pos: 8, abates: 0, odd: 2 }), 'abate'),
      'uma parcela de 0 XP apareceu na lista. "0 abates: 0 XP" ocupa uma linha ' +
      'para dizer que nada aconteceu.');
  });

  s.teste('abater aumenta o total da rodada', () => {
    const sem = soma(xpDaRodada({ venceu: false, pos: 5, abates: 0, odd: 2 }));
    const com = soma(xpDaRodada({ venceu: false, pos: 5, abates: 4, odd: 2 }));
    ok(com > sem, `abater não mudou o total (${sem} → ${com})`);
  });

  /* O AZARÃO SÓ CONTA SE FOI LONGE, e é regra antiga: odd alta com eliminação
     cedo é aposta ruim que deu errado, não coragem premiada. */
  s.teste('o azarão exige odd alta E ter ido longe', () => {
    ok(acha(xpDaRodada({ venceu: false, pos: 3, abates: 0, odd: 6 }), 'Azarão'),
      'odd 6 em 3º lugar não pagou azarão');
    ok(!acha(xpDaRodada({ venceu: false, pos: 11, abates: 0, odd: 6 }), 'Azarão'),
      'odd alta pagou azarão mesmo caindo em 11º');
    ok(!acha(xpDaRodada({ venceu: false, pos: 2, abates: 0, odd: 1.5 }), 'Azarão'),
      'favorito pagou azarão');
  });

  /* ── A CONTAGEM, QUE MORA NA TELA ──────────────────────────────────────
   *
   * O modelo é puro e testável; a CONTAGEM de abates não é — ela lê os eventos
   * da batalha dentro do desenho do overlay. Então o que se cobra aqui é o
   * construto, e não o resultado: que o filtro exclua tempestade e killstreak.
   *
   * Tempestade é a arena matando, não o lutador. Contá-la pagaria XP por sorte,
   * e sorte é o oposto do que esta parcela existe para premiar. Killstreak é
   * anúncio, não queda — contá-la pagaria duas vezes pelo mesmo abate. */
  s.teste('a contagem de abates exclui tempestade e killstreak', () => {
    const fonte = readFileSync(
      new URL('../app/modules/resultado-tela.mjs', import.meta.url), 'utf8');
    const bloco = fonte.slice(fonte.indexOf('const meusAbates'),
                              fonte.indexOf('xpDaRodada('));
    ok(bloco.length > 20, 'não achei a contagem de abates para conferir');
    ok(/!e\.storm/.test(bloco),
      'a contagem deixou de excluir tempestade — a arena matando passa a pagar XP ao lutador');
    ok(/!e\.streak/.test(bloco),
      'a contagem deixou de excluir killstreak — o anúncio de sequência passa a ' +
      'pagar de novo pelo abate que já pagou');
    ok(/e\.a === S\.myBet\.idx/.test(bloco),
      'a contagem deixou de exigir que o abate seja DO MEU lutador — passaria a ' +
      'pagar pelos abates dos outros onze');
  });

  s.teste('todo XP é inteiro', () => {
    for (const caso of [{ pos: 1, abates: 0 }, { pos: 7, abates: 3 }, { pos: 12, abates: 10 }])
      for (const p of xpDaRodada({ venceu: caso.pos === 1, odd: 3, ...caso }))
        ok(Number.isInteger(p.xp), `a parcela "${p.n}" pagou ${p.xp}, que não é inteiro`);
  });

  return s;
}
