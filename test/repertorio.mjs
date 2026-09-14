/* Q1/Q3 · O REPERTÓRIO — os golpes liberados pelo nível (L-168).
 *
 * ── A QUEIXA, E ELA É UM DEFEITO E NÃO UM PEDIDO ──────────────────────────
 *
 *   > "um charmander lv 1-2 era pra usar fire blast? Flamethrower? Tem que se
 *   >  atentar a isso, os poderes são liberados gradativamente com o nível."
 *
 * O balão sorteava entre TODOS os golpes da espécie, sem olhar quem batia. O
 * nível decidia o poder em todo lugar do sistema **menos** no único lugar onde
 * o jogador vê o golpe acontecer.
 *
 * ── O QUE ESTE ARQUIVO DEFENDE ────────────────────────────────────────────
 *
 *   A GRADAÇÃO EXISTE    subir de nível abre golpe novo, e nunca fecha
 *   NINGUÉM FICA MUDO    nível 1 sabe pelo menos um
 *   A ESCALA É DA LISTA  o tipo pesado não pune quem nasceu nele
 *   A ORDEM NÃO MUDA     o índice sorteado pelo motor não pode apontar para
 *                        outro golpe a cada nível que a criatura sobe
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  NIVEL_DO_ULTIMO, nivelDoGolpe, repertorio, quantosSabe, proximoGolpe,
} from '../engine/repertorio.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* Uma lista de golpes como o pack a declara: o que importa aqui é o `p`. */
const g = (n, p) => ({ n, p });
const LISTA = [g('fraco', 40), g('medio', 85), g('forte', 120), g('bruto', 150)];

/* Os golpes de fogo do pack, que é o caso do relato. */
const FOGO = (kanto.golpes ?? {}).fire ?? [];

export function suite() {
  const s = criarSuite('repertorio');

  s.teste('o nível 1 sabe UM, e nunca fica mudo', () => {
    const r = repertorio(1, LISTA);
    igual(r.length, 1,
      `o nível 1 abriu ${r.length} golpes. O mais fraco abre no 1 e o resto ` +
      'espera — é a gradação inteira num caso só');
    igual(r[0].n, 'fraco', 'o nível 1 não abriu o mais fraco da lista');

    /* E NUNCA VAZIO, venha o que vier do pack: balão vazio é lido como
       "quebrou", e não como "ainda não aprendeu". */
    /* ── A GARANTIA VALE PARA QUALQUER LISTA (S955) ────────────────────
       A primeira versão testava três listas escolhidas a dedo, e o defeito
       plantado que remove o socorro **passou**: com a escala saindo da PRÓPRIA
       lista, o mais fraco dela sempre abre no 1, e nenhum exemplo meu chegava
       perto do caso.

         > Exemplo não é garantia. Três listas que passam não dizem nada sobre
         > a quarta, e o socorro existe justamente para a quarta.

       Agora a varredura é ampla: poderes iguais, negativos, ausentes, enormes,
       misturados — e a afirmação é que NENHUMA delas deixa o nível 1 mudo. */
    const poderes = [undefined, null, 0, -5, 1, 40, 150, 9999, NaN, '80'];
    for (const a of poderes) for (const b of poderes) {
      const lista = [g('a', a), g('b', b)];
      ok(repertorio(1, lista).length >= 1,
        `a lista [${a}, ${b}] deixou o nível 1 sem golpe nenhum — balão vazio é ` +
        'lido como "quebrou", e não como "ainda não aprendeu"');
      /* E o que sai é um golpe DE VERDADE, e não um buraco. */
      ok(repertorio(1, lista).every(Boolean),
        `a lista [${a}, ${b}] devolveu um golpe vazio`);
    }
    for (const um of poderes)
      ok(repertorio(1, [g('so', um)]).length === 1,
        `a lista de um golpe com poder ${um} não devolveu exatamente ele`);
    igual(repertorio(1, []).length, 0, 'uma lista vazia inventou um golpe');
    igual(repertorio(1, null).length, 0, 'uma lista ausente derrubou a conta');
  });

  s.teste('subir de nível ABRE golpe, e nunca fecha', () => {
    let antes = 0;
    for (let n = 1; n <= NIVEL_DO_ULTIMO + 10; n++) {
      const quantos = quantosSabe(n, LISTA);
      ok(quantos >= antes,
        `no nível ${n} ela sabe ${quantos} golpes e no ${n - 1} sabia ${antes}. ` +
        'Subir de nível TIROU um golpe — a progressão andaria para trás, e o ' +
        'jogador veria o próprio bicho desaprender');
      antes = quantos;
    }
    igual(antes, LISTA.length,
      `no teto ela ainda não sabe todos (${antes} de ${LISTA.length}) — o ` +
      'último golpe seria inalcançável, e um golpe que ninguém vê não existe');
  });

  s.teste('o mais forte abre no NIVEL_DO_ULTIMO, e o mais fraco no 1', () => {
    igual(nivelDoGolpe(LISTA[0], LISTA), 1, 'o mais fraco não abre no nível 1');
    igual(nivelDoGolpe(LISTA[LISTA.length - 1], LISTA), NIVEL_DO_ULTIMO,
      'o mais forte não abre no nível declarado — a escala não usa a lista toda');
    /* E o do meio fica no meio: sem isso, a "gradação" seria um degrau só. */
    const meio = nivelDoGolpe(LISTA[1], LISTA);
    ok(meio > 1 && meio < NIVEL_DO_ULTIMO,
      `o golpe do meio abre no nível ${meio}, que é uma das pontas — a curva ` +
      'virou um degrau, e não há gradação nenhuma para o jogador sentir');
  });

  /* ── A ESCALA É DA LISTA ─────────────────────────────────────────────
     Uma escala global faria o tipo cujos golpes são todos fracos abrir tudo no
     nível 1, e o tipo pesado não abrir nada até tarde — a criatura ficaria
     muda metade da vida por ter nascido de um tipo forte. */
  s.teste('a escala é da LISTA, e não do jogo', () => {
    const fracos = [g('a', 10), g('b', 20), g('c', 30)];
    const pesados = [g('x', 300), g('y', 400), g('z', 500)];
    for (const lista of [fracos, pesados]) {
      igual(nivelDoGolpe(lista[0], lista), 1,
        'o mais fraco DAQUELA lista não abre no nível 1 — o tipo pesado ' +
        'deixaria a criatura muda por ter nascido nele');
      igual(nivelDoGolpe(lista[2], lista), NIVEL_DO_ULTIMO,
        'o mais forte DAQUELA lista não abre no teto');
    }

    /* LISTA PLANA: sem diferença entre eles, não há gradação a fazer, e travar
       todos até o teto deixaria a criatura muda sem motivo. */
    const plana = [g('a', 50), g('b', 50), g('c', 50)];
    igual(repertorio(1, plana).length, 3,
      'uma lista sem diferença de poder travou golpes — não há o que graduar');
  });

  s.teste('a ORDEM do pack é preservada — o índice não muda de dono', () => {
    /* O motor sorteia um ÍNDICE. Se o repertório reordenasse, o índice 0
       apontaria para outro golpe a cada nível que a criatura sobe, e o mesmo
       ataque mudaria de nome no meio da run. */
    const alto = repertorio(NIVEL_DO_ULTIMO, LISTA);
    igual(alto.map(x => x.n).join(','), LISTA.map(x => x.n).join(','),
      'o repertório reordenou a lista do pack');
    /* E o subconjunto de um nível baixo é um PREFIXO da ordem, não um sorteio. */
    const baixo = repertorio(20, LISTA).map(x => x.n);
    igual(baixo.join(','), LISTA.filter(x => baixo.includes(x.n)).map(x => x.n).join(','),
      'a lista de um nível baixo saiu fora da ordem do pack');
  });

  /* ── O PRÓXIMO É PROMESSA, e promessa se mostra ──────────────────────
     "Aprende X no nível N" transforma subir de nível em algo que se espera,
     em vez de um número que muda sozinho. */
  s.teste('o próximo golpe é dito, e some quando não falta nenhum', () => {
    const p = proximoGolpe(1, LISTA);
    ok(p, 'no nível 1 não há próximo golpe a prometer, e faltam três');
    ok(p.nivel > 1, 'o próximo golpe abre no nível em que ela já está');
    igual(p.golpe.n, 'medio', 'o próximo não é o mais próximo — ele pulou um');

    igual(proximoGolpe(NIVEL_DO_ULTIMO, LISTA), null,
      'no teto ainda sobra golpe a prometer — a tela diria "aprende X" para ' +
      'sempre, e a promessa nunca se cumpriria');
  });

  /* ── E O CASO DO RELATO, com o pack de verdade ───────────────────────
     O dono viu um nível 1–2 anunciando o golpe mais forte da linha de fogo. */
  s.teste('o caso do relato: um nível baixo NÃO conhece o golpe mais forte', () => {
    ok(FOGO.length > 1, 'o pack não tem golpes de fogo suficientes para medir');
    const forte = FOGO.reduce((a, b) => (Number(b.p) || 0) > (Number(a.p) || 0) ? b : a);

    for (const nivel of [1, 2, 5]) {
      const sabe = repertorio(nivel, FOGO).map(x => x.n);
      ok(!sabe.includes(forte.n),
        `no nível ${nivel} a criatura ainda conhece "${forte.n}" (poder ` +
        `${forte.p}) — é exatamente o que o dono viu na tela`);
      ok(sabe.length >= 1, `no nível ${nivel} ela ficou sem golpe nenhum`);
      ok(sabe.length < FOGO.length,
        `no nível ${nivel} ela já sabe os ${FOGO.length} golpes de fogo`);
    }

    /* E no teto ela conhece, senão o golpe mais forte nunca apareceria. */
    ok(repertorio(NIVEL_DO_ULTIMO, FOGO).map(x => x.n).includes(forte.n),
      `nem no nível ${NIVEL_DO_ULTIMO} ela aprende "${forte.n}"`);
  });

  /* Todo tipo do pack responde. Um tipo mudo seria uma linha inteira de
     criaturas sem balão, e ninguém procuraria o defeito ali. */
  s.teste('todos os tipos do pack abrem pelo menos um golpe no nível 1', () => {
    for (const [tipo, lista] of Object.entries(kanto.golpes ?? {})) {
      if (!lista?.length) continue;
      ok(repertorio(1, lista).length >= 1,
        `o tipo "${tipo}" deixa a criatura de nível 1 sem golpe nenhum`);
      igual(repertorio(NIVEL_DO_ULTIMO, lista).length, lista.length,
        `o tipo "${tipo}" não abre a lista inteira nem no nível do teto`);
    }
  });

  return s;
}
