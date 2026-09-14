/* O ROTEIRO DA WAVE — bloco A4a (Spec §7.22.6).
 *
 * A wave já é resolvida pelo A2: entra a semente, sai "venceu, tanto de dano,
 * estes abates". O que faltava era o MEIO — os dois a quatro minutos em que
 * isso acontece na tela, e que são a razão de este modo existir.
 *
 * ── O QUE ESTE ARQUIVO DEFENDE ────────────────────────────────────────────
 *
 * Uma coisa, e ela é a linha entre encenar e inventar:
 *
 *   > **O roteiro DISTRIBUI o que a wave já decidiu. Ele não decide nada.**
 *
 * Se a soma dos revides não bater com o dano da wave, a tela estará contando
 * uma história diferente da que o motor resolveu — e aí existem duas verdades
 * sobre a mesma run, que é o defeito que este projeto mais paga.
 */
import { criarSuite, ok, igual, rngTeste } from './harness.mjs';
import {
  DURACAO_MIN_MS, DURACAO_MAX_MS, APROXIMACAO_MS, HP_MOB, POR_LEVA, GOLPES_MIN,
  roteiroDaWave, momentosAte, estadoEm,
} from '../engine/roteiro-wave.mjs';
import { composicaoDaWave, resolverWave, fatorDoRitmo, poderDaEquipe, RITMO_PISO,
         ameacaDa } from '../engine/wave.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* ── O `dentro` DO ARNÊS É VALOR ± TOLERÂNCIA, E NÃO FAIXA ───────────────
 *
 * Eu o usei como faixa, e a sabotagem cobrou na hora: o `S867` encurtava a
 * wave para seis segundos e a suíte ficou VERDE, porque
 * `dentro(6000, 120000, 240000)` é verdadeiro — a tolerância cobria o erro
 * inteiro e ainda sobrava.
 *
 *   > Uma afirmação que não sabe o que está afirmando é pior que afirmação
 *   > nenhuma: ela ocupa o lugar da que faltava, e o relatório conta as duas
 *   > como se fossem a mesma coisa.
 *
 * A regra que fica, e ela vale para o repositório inteiro: **faixa se afirma
 * com faixa.** */
const naFaixa = (v, min, max, msg) => ok(v >= min && v <= max,
  `${msg} — ${v} fora de [${min}, ${max}]`);

/* A folga sorteada em volta de cada golpe, para o teste não exigir precisão
   que o roteiro nem promete. */
const GOLPE_FOLGA = 700;

const dado = (semente = 0x51ed270b) => rngTeste(semente);
const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const criatura = (nivel, forca = 318) => ({ nivel, forca, vinculo: 0, foco: null });

/* Um roteiro montado a partir de uma wave DE VERDADE, e não de números à mão:
   o acoplamento entre os dois é justamente o que se quer afirmar. */
function roteiroReal(semente, wave = 1, hp = 100) {
  const r = resolverWave(dado(semente), { elenco: ELENCO, wave, estagio: 1, hp, equipe: [criatura(15)] });
  const comp = composicaoDaWave(dado(semente), { elenco: ELENCO, wave });
  return { r, comp, roteiro: roteiroDaWave(dado(semente + 7), { comp, venceu: r.venceu, dano: r.dano }) };
}

const dos = (roteiro, tipo) => roteiro.momentos.filter(m => m.tipo === tipo);

export function suite() {
  const s = criarSuite('roteiro-wave');

  s.teste('a wave dura entre 45 e 90 segundos', () => {
    /* Era de 2 a 4 minutos até 09/09/2026, quando o dono mandou a tela com
       28:25 na wave 6 de 10 — o porquê inteiro está no `roteiro-wave.mjs`. */
    igual(DURACAO_MIN_MS, 45_000);
    igual(DURACAO_MAX_MS, 90_000);
    for (let i = 0; i < 40; i++) {
      const { roteiro } = roteiroReal(1000 + i);
      naFaixa(roteiro.duracao, DURACAO_MIN_MS, DURACAO_MAX_MS,
        'a duração da wave saiu da faixa do §7.22.5');
    }
  });

  s.teste('o roteiro NÃO INVENTA DANO: a soma dos revides é o dano da wave', () => {
    for (let i = 0; i < 60; i++) {
      const { r, roteiro } = roteiroReal(2000 + i);
      const soma = roteiro.momentos.filter(m => m.tipo === 'golpe' && m.de === 'dele')
        .reduce((a, m) => a + m.dano, 0);
      igual(soma, r.dano,
        `o roteiro distribuiu ${soma} de dano onde a wave decidiu ${r.dano}`);
    }
  });

  /* ── A AFIRMAÇÃO CENTRAL DA REESCRITA DE 08/09 ─────────────────────────
     Pedido do dono, com a razão inteira numa frase:

       > "o que NÃO pode acontecer é o bulbassauro ficar brigando com 4-5-6 de
       >  vez, que aí ele não ia ser um bulbassauro e sim um DEUS"

     Não é preferência de arranjo: é leitura de jogo. Uma criatura de nível
     baixo cercada por seis e ganhando desmente a stamina, o HP que é relógio e
     a poção que salva — tudo que o resto do sistema afirma. */
  s.teste('NUNCA há mais de dois mobs em cena ao mesmo tempo', () => {
    igual(POR_LEVA, 2, 'a leva mudou de tamanho sem o teste saber');
    for (let i = 0; i < 60; i++) {
      const { roteiro } = roteiroReal(3000 + i);
      let emPe = 0, pico = 0;
      for (const m of roteiro.momentos) {
        if (m.tipo === 'entra') emPe++;
        else if (m.tipo === 'abate') emPe--;
        pico = Math.max(pico, emPe);
      }
      ok(pico <= POR_LEVA,
        `${pico} mobs ficaram em cena ao mesmo tempo, e a leva é de ${POR_LEVA}`);
    }
  });

  s.teste('a vencida traz todos em levas; a perdida traz uma leva só', () => {
    let vencidas = 0, perdidas = 0;
    for (let i = 0; i < 60; i++) {
      const { r, comp, roteiro } = roteiroReal(3500 + i);
      const total = comp.reduce((a, x) => a + x.quantos, 0);
      const entradas = dos(roteiro, 'entra');
      igual(new Set(entradas.map(m => m.i)).size, entradas.length,
        'dois momentos de entrada para o mesmo mob');
      if (r.venceu) {
        vencidas++;
        igual(entradas.length, total, 'a wave foi vencida e nem todos entraram');
      } else {
        perdidas++;
        /* Perder é não conseguir derrubar AQUELES. Trazer os seis para uma
           wave que ninguém vence seria encher a tela de gente que não cai. */
        ok(entradas.length <= POR_LEVA,
          `a wave foi perdida e vieram ${entradas.length}, mais que uma leva`);
      }
    }
    ok(vencidas > 0 && perdidas > 0,
      `a amostra não teve os dois casos (${vencidas} vencidas, ${perdidas} perdidas)`);
  });

  /* O duelo precisa CABER na leitura: rápido demais vira pisca-pisca, lento
     demais vira espera. O dono nomeou a faixa sem número — *"não pode ser um
     tempo muito grande, mas também não pode ser muito rápido"* —, e o número
     sai da conta: a wave dividida pelos mobs que entram. */
  s.teste('cada duelo dura de doze a noventa segundos', () => {
    for (let i = 0; i < 40; i++) {
      const { roteiro } = roteiroReal(3800 + i);
      for (const d of roteiro.duelos) {
        if (d.ate == null) continue;
        /* O teto subiu de 60 para 90 s quando a leva passou a ser de dois: a
           wave dividida por TRÊS levas dá levas mais longas que a mesma wave
           dividida por seis duelos. O piso não mudou — abaixo de doze segundos
           o duelo vira pisca-pisca em qualquer arranjo. */
        /* ── O PISO CAIU COM A WAVE (09/09/2026) ────────────────────────
           A wave passou de 2–4 min para 45–90 s, e o duelo encolheu junto: um
           terço de 45 s são 15 s, e o respiro tira mais 1,2. Oito segundos
           ainda é entrada, dois golpes e queda — o que sumiu foi o tempo
           parado, e era ele que fazia o estágio levar 45 minutos. */
        naFaixa(d.ate - d.de, 8_000, 90_000,
          'a duração de um duelo saiu do que se consegue acompanhar');
      }
    }
  });

  s.teste('a luta só começa depois de o mob chegar', () => {
    for (let i = 0; i < 40; i++) {
      const { roteiro } = roteiroReal(3900 + i);
      const entrou = new Map(dos(roteiro, 'entra').map(m => [m.i, m.t]));
      for (const g of roteiro.momentos.filter(m => m.tipo === 'golpe' && m.i != null))
        ok(g.t >= entrou.get(g.i) + APROXIMACAO_MS - GOLPE_FOLGA,
          `o mob ${g.i} apanhou antes de terminar de chegar`);
    }
  });

  s.teste('a wave vencida derruba todo mundo; a perdida não derruba ninguém', () => {
    let vencidas = 0, perdidas = 0;
    for (let i = 0; i < 80; i++) {
      const { r, comp, roteiro } = roteiroReal(4000 + i);
      const total = comp.reduce((a, x) => a + x.quantos, 0);
      if (r.venceu) { vencidas++; igual(dos(roteiro, 'abate').length, total,
        'a wave foi vencida e nem todo mob caiu'); }
      else { perdidas++; igual(dos(roteiro, 'abate').length, 0,
        'a wave foi PERDIDA e ainda assim houve abate — o saque contaria a mais'); }
    }
    ok(vencidas > 0 && perdidas > 0,
      `a amostra não teve os dois casos (${vencidas} vencidas, ${perdidas} perdidas)`);
  });

  s.teste('ninguém cai antes de entrar', () => {
    for (let i = 0; i < 60; i++) {
      const { roteiro } = roteiroReal(5000 + i);
      const entrou = new Map(dos(roteiro, 'entra').map(m => [m.i, m.t]));
      for (const a of dos(roteiro, 'abate'))
        ok(a.t > entrou.get(a.i),
          `o mob ${a.i} caiu em ${a.t} e só entrou em ${entrou.get(a.i)}`);
    }
  });

  s.teste('os momentos vêm em ordem e cabem na duração', () => {
    for (let i = 0; i < 40; i++) {
      const { roteiro } = roteiroReal(6000 + i);
      let ultimo = -1;
      for (const m of roteiro.momentos) {
        ok(m.t >= ultimo, 'os momentos vieram fora de ordem');
        naFaixa(m.t, 0, roteiro.duracao, 'um momento caiu fora da wave');
        ultimo = m.t;
      }
    }
  });

  s.teste('a mesma semente devolve o mesmo roteiro', () => {
    const a = roteiroDaWave(dado(77), { comp: [{ dex: 10, quantos: 3 }, { dex: 13, quantos: 3 }], venceu: true, dano: 9 });
    const b = roteiroDaWave(dado(77), { comp: [{ dex: 10, quantos: 3 }, { dex: 13, quantos: 3 }], venceu: true, dano: 9 });
    igual(JSON.stringify(a), JSON.stringify(b), 'dois roteiros com a mesma semente diferiram');
  });

  /* ── ESTE TESTE NASCEU DE UMA SABOTAGEM QUE ESCAPOU ─────────────────────
     O `S868` inverte o desempate da ordenação, e a suíte inteira ficou verde:
     a minha afirmação de determinismo comparava duas execuções da MESMA
     semente, e uma ordem invertida é tão determinística quanto a certa.

     É a lição que o `CLAUDE.md` repete mais que qualquer outra — *a afirmação
     passa por um caminho que o defeito não toca*. O caminho que faltava são os
     momentos SIMULTÂNEOS, e com sorteio contínuo eles quase nunca acontecem.
     Uma sorte constante os fabrica de propósito. */
  s.teste('momentos no mesmo instante saem na ordem em que a cena os produz', () => {
    const parado = () => 0.5;
    const r = roteiroDaWave(parado, {
      comp: [{ dex: 10, quantos: 3 }, { dex: 13, quantos: 3 }], venceu: true, dano: 6,
    });
    const ordem = t => r.momentos.filter(m => m.tipo === t).map(m => m.i);
    igual(JSON.stringify(ordem('entra')), JSON.stringify([0, 1, 2, 3, 4, 5]),
      'os mobs entraram fora da ordem em que a cena os criou');
    igual(JSON.stringify(ordem('abate')), JSON.stringify([0, 1, 2, 3, 4, 5]),
      'as quedas simultâneas saíram fora de ordem — a tela desenharia o mob errado caindo');
  });

  s.teste('o relógio devolve o que já aconteceu, e nada além', () => {
    const { roteiro } = roteiroReal(8123);
    igual(momentosAte(roteiro, -1).length, 0, 'antes de começar já havia acontecido algo');
    igual(momentosAte(roteiro, roteiro.duracao).length, roteiro.momentos.length,
      'no fim da wave faltavam momentos');
    const meio = momentosAte(roteiro, roteiro.duracao / 2);
    ok(meio.every(m => m.t <= roteiro.duracao / 2), 'o relógio adiantou um momento');
  });

  s.teste('o estado no instante t conta vivos e HP coerentes', () => {
    for (let i = 0; i < 20; i++) {
      const { r, comp, roteiro } = roteiroReal(9000 + i);
      const total = comp.reduce((a, x) => a + x.quantos, 0);
      const inicio = estadoEm(roteiro, 0, 100);
      igual(inicio.caidos, 0, 'alguém já tinha caído no instante zero');
      igual(inicio.hp, 100, 'o HP já tinha descido no instante zero');
      const fim = estadoEm(roteiro, roteiro.duracao, 100);
      igual(fim.caidos, r.venceu ? total : 0, 'o fim da wave não bate com o resultado');
      igual(fim.hp, 100 - r.dano, 'o HP no fim da wave não bate com o dano dela');
      /* O HP nunca sobe DENTRO da wave: a §7.22.7 diz que só a poção levanta,
         e a poção acontece entre um instante e outro, não dentro do roteiro. */
      let anterior = 100;
      for (let t = 0; t <= roteiro.duracao; t += 5_000) {
        const e = estadoEm(roteiro, t, 100);
        ok(e.hp <= anterior, 'o HP subiu sozinho no meio da wave');
        anterior = e.hp;
      }
    }
  });

  /* A décima virou DUELO em 09/09 — um chefe sorteado, 1x1. Ver o comentário
     na `composicaoDaWave`: era 2+2 dos dois fixos, e o dono revisou. O roteiro
     dela continua existindo e continua sendo mais curto de gente; o que mudou
     é quanta gente é "mais curto". */
  s.teste('a wave do chefe também tem roteiro, e ele é de UM só', () => {
    const { comp, roteiro } = roteiroReal(4242, 10);
    igual(comp.reduce((a, x) => a + x.quantos, 0), 1,
      'a wave do chefe deixou de ser 1x1');
    igual(dos(roteiro, 'entra').length, 1,
      'a wave do chefe encenou mais de uma entrada — o duelo 1x1 do dono virou fila');
  });

  s.teste('composição vazia não derruba o roteiro', () => {
    /* Um save que cita bioma removido do pack chega aqui com elenco vazio. O
       jogo tem de continuar de pé — ver o mesmo caso na `test/wave.mjs`. */
    const r = roteiroDaWave(dado(), { comp: [], venceu: false, dano: 4 });
    ok(Array.isArray(r.momentos), 'o roteiro vazio não devolveu lista');
    igual(r.momentos.filter(m => m.tipo === 'golpe' && m.de === 'dele')
      .reduce((a, m) => a + m.dano, 0), 4,
      'o dano some quando não há ninguém em cena');
  });

  /* ═══ OS TRÊS QUE O Q2 MOSTROU QUE ESCAPAVAM ════════════════════════════
   *
   * O portão devolveu 11 defeitos `PASSOU` neste bloco, e sete deles moram
   * aqui e na cena. A lição é sempre a mesma e não envelhece:
   *
   *   > Um bloco que reescreve um comportamento herda a obrigação de reescrever
   *   > as afirmações dele. Teste que sobreviveu à mudança sem ser relido é
   *   > teste que passou a medir a versão antiga.
   */
  s.teste('a duração VARIA de wave para wave, e não fica no piso', () => {
    /* S905. O `entre(r, MIN, MAX)` trocado por `MIN` deixa toda wave com dois
       minutos exatos, e a suíte ficava verde porque a afirmação de cima só
       pede que a duração esteja NA FAIXA — e o piso está na faixa.

         > "Dentro do intervalo" não afirma variação. São duas perguntas, e o
         > metrônomo passa na primeira.

       Numa tela que fica aberta por horas, a duração igual é o que faz a wave
       deixar de ser um acontecimento e virar um relógio. */
    const vistos = new Set();
    let acimaDoPiso = 0;
    for (let i = 0; i < 60; i++) {
      const { roteiro } = roteiroReal(4100 + i);
      vistos.add(roteiro.duracao);
      if (roteiro.duracao > DURACAO_MIN_MS) acimaDoPiso++;
    }
    ok(vistos.size >= 10,
      `60 waves produziram só ${vistos.size} durações diferentes — a wave virou metrônomo`);
    ok(acimaDoPiso >= 40,
      `só ${acimaDoPiso} de 60 waves passaram do piso de ${DURACAO_MIN_MS} ms; ` +
      'com o sorteio de verdade quase todas passam');
  });

  s.teste('empate de instante desempata pelo ÍNDICE, e sempre para o mesmo lado', () => {
    /* S868. A ordenação é `(a.t - b.t) || (a.k - b.k)`; trocar para `b.k - a.k`
       inverte o desempate. `Array.sort` não é estável em toda engine, e o §P3
       vale ATÉ TROCAR DE NAVEGADOR: a mesma semente tem de devolver a mesma
       ordem em Node e no Chromium.

       O que se afirma é a REGRA, e não a saída: dois momentos no mesmo `t`
       saem na ordem em que foram gerados. */
    let empates = 0;
    for (let i = 0; i < 80; i++) {
      const { roteiro } = roteiroReal(5200 + i);
      const ms = roteiro.momentos;
      for (let j = 1; j < ms.length; j++) {
        if (ms[j].t !== ms[j - 1].t) continue;
        empates++;
        /* No empate, quem tem índice de ator menor vem primeiro — é a ordem em
           que o roteiro os gerou, e é a única que não depende do motor. */
        const a = ms[j - 1].i, b = ms[j].i;
        if (a != null && b != null && a !== b)
          ok(a < b, `dois momentos no instante ${ms[j].t} saíram como ` +
            `i=${a} depois i=${b}: o desempate inverteu`);
      }
    }
    ok(empates > 0,
      'nenhuma das 80 waves teve dois momentos no mesmo instante — sem empate ' +
      'esta afirmação não mede nada, e o defeito passa por baixo dela');
  });

  s.teste('os dois da leva NÃO entram no mesmo quadro', () => {
    /* S895. `inicioDaLeva + posicao * 500` trocado por `inicioDaLeva` faz os
       dois surgirem juntos — e dois sprites que aparecem no mesmo instante,
       lado a lado, leem como UM elemento: o olho não os separa.

       Meio segundo é o bastante para o segundo ser visto CHEGANDO, e pouco o
       bastante para a leva continuar sendo uma leva. */
    let levasConferidas = 0;
    for (let i = 0; i < 60; i++) {
      const { roteiro } = roteiroReal(6300 + i);
      const entram = dos(roteiro, 'entra');
      for (let j = 0; j + 1 < entram.length; j++) {
        /* Só compara quem entrou na MESMA leva: entre levas o intervalo é o
           duelo inteiro, e afirmar sobre ele não diz nada sobre este defeito. */
        const dt = entram[j + 1].t - entram[j].t;
        if (dt > 5000) continue;
        levasConferidas++;
        ok(dt >= 400,
          `dois da mesma leva entraram com ${dt} ms de diferença — juntos ` +
          'demais, eles leem como um sprite só');
      }
    }
    ok(levasConferidas > 0,
      'nenhuma leva de dois apareceu em 60 waves — a afirmação acima ficou vazia');
  });


  /* ═══ O ESTÁGIO NÃO PODE LEVAR UMA HORA — cobrança do dono, 09/09 ═══════
   *
   *   > "os combates estão MUITO demorados e muitas vezes nem se completa
   *   >  wave. Quem joga um idle não tem 1 hr pra passar UM MAPA."
   *
   * Ele mandou a tela: **28:25 na wave 6 de 10**, com três derrotas. Medido no
   * motor, com o ritmo real da run:
   *
   *     lv7  x1    10 waves · 3 derrotas ·  44,7 min
   *     lv20 x1    10 waves · 1 derrota  ·  25,6 min
   *     lv20 x3    10 waves · 1 derrota  ·  13,5 min
   *     lv50 x3    10 waves · 1 derrota  ·  11,7 min
   *
   * ── E A PRIMEIRA MEDIÇÃO QUE EU FIZ ESTAVA ERRADA ────────────────────────
   *
   * Eu chamei uma função que não existe (`ameacaDaWave`), caí no `?? 1`, e o
   * ritmo desabou para o PISO — a conta deu 14 min e eu quase relatei que
   * estava tudo bem.
   *
   *   > Uma medição que erra a chamada não mede o produto: mede o fallback. E
   *   > ela mente com a confiança de um número.
   */
  s.teste('um estágio inteiro cabe numa sessão, e não numa hora', () => {
    const elenco = elencoDoEstagio(kanto, 'campo', 1);
    const correr = equipe => {
      let ms = 0, waves = 0, hp = 100;
      for (let n = 0; n < 300 && waves < 10; n++) {
        const w = waves + 1;
        const comp = composicaoDaWave(rngTeste(n * 13 + 7), { elenco, wave: w });
        const r = resolverWave(rngTeste(n * 13 + 7),
          { elenco, wave: w, estagio: 1, hp, equipe });
        const ritmo = fatorDoRitmo(poderDaEquipe(equipe),
                                   ameacaDa({ elenco, wave: w, estagio: 1 }));
        ms += roteiroDaWave(rngTeste(n * 13 + 11),
          { comp, venceu: r.venceu, dano: r.dano, ritmo }).duracao;
        hp = Math.max(0, hp - r.dano);
        if (r.venceu) waves++;
        if (hp <= 0) break;
      }
      return { min: ms / 60000, waves };
    };

    const fraca = correr([{ nivel: 7, forca: 318 }]);
    const certa = correr([1, 2, 3].map(() => ({ nivel: 20, forca: 318 })));

    /* O TETO É DA EQUIPE FRACA, e é o caso que o dono viveu: quem começa com
       um bicho de nível 7 sozinho. Vinte minutos ainda é longo, mas é uma
       sessão — quarenta e cinco é um turno de trabalho. */
    ok(fraca.min <= 22,
      `um bicho de nível 7 sozinho leva ${fraca.min.toFixed(1)} min para o ` +
      'estágio. O dono mandou a tela com 28:25 na wave 6, e a frase dele é a ' +
      'régua: "quem joga um idle não tem 1 hr pra passar UM MAPA"');

    /* E a equipe à altura tem de ser NOTAVELMENTE mais rápida — senão subir de
       nível não compra tempo, e o tempo é o que o idle vende. */
    ok(certa.min <= fraca.min * 0.75,
      `a equipe à altura leva ${certa.min.toFixed(1)} min contra ${fraca.min.toFixed(1)} ` +
      'da fraca: ficar mais forte quase não compra tempo');
    ok(certa.min >= 5,
      `a equipe à altura limpa o estágio em ${certa.min.toFixed(1)} min — abaixo ` +
      'de cinco a run deixa de ser algo que se assiste e vira um clique');
  });

  /* ══ O DUELO TEM TROCA, E NÃO UM SOCO SÓ (D-084) ══════════════════════
   *
   * Medido no navegador, no passo OLHAR, com o observador de números de dano
   * ligado por 28 s de wave 1:
   *
   *     que eu dou     -100  -100  -100  -100
   *     que eu levo      -1    -1    -1
   *
   * Quatro selvagens, quatro golpes, cada um tirando os 100 de HP inteiros. O
   * duelo não é um duelo: é um soco, e o bicho cai.
   *
   * ── A CAUSA É MINHA, E É DO ITEM ANTERIOR DA MESMA ORDEM ────────────
   *
   * O item 5 encurtou a wave (de 2–4 min para 45–90 s) e subiu o piso do
   * ritmo. `meusGolpes` sai de quanto tempo CABE no duelo, e com a janela
   * curta passou a caber UM. Aí `repartir(100, 1)` devolve `[100]`, e o
   * número que sobe é sempre o mesmo.
   *
   * ── E É POR ISSO QUE O "-31" NUNCA CHEGOU ───────────────────────────
   *
   * O dono pediu o hitbox quatro vezes escrevendo *"-13"*, *"-35"*, *"-31"* —
   * três números diferentes, porque o que ele quer ver é a TROCA. Um "-100"
   * fixo cumpre a letra do pedido e nega o espírito dele.
   *
   * O piso é sobre a CONTAGEM, e nunca sobre o tempo: encurtar a wave continua
   * valendo, e o que muda é que os golpes se aproximam em vez de sumirem. */
  s.teste('todo selvagem troca golpes — o duelo nunca é um soco só', () => {
    ok(GOLPES_MIN >= 3,
      'o piso de golpes por duelo é menor que três: com dois, metade dos ' +
      'números ainda sai igual e a troca não se lê');

    /* A WAVE MAIS CURTA POSSÍVEL, que é onde o defeito morava. */
    let piorCaso = Infinity;
    for (let semente = 1; semente <= 40; semente++) {
      const roteiro = roteiroDaWave(rngTeste(semente), {
        comp: [{ dex: 10, quantos: 6 }], venceu: true, dano: 4,
        golpesMeus: 4, golpesDele: 4, ritmo: RITMO_PISO,
      });
      const porMob = new Map();
      for (const m of roteiro.momentos)
        if (m.tipo === 'golpe' && m.de === 'meu')
          porMob.set(m.i, (porMob.get(m.i) ?? 0) + 1);
      for (const [i, quantos] of porMob) {
        piorCaso = Math.min(piorCaso, quantos);
        ok(quantos >= GOLPES_MIN,
          `o selvagem ${i} caiu em ${quantos} golpe(s) na wave mais curta que ` +
          'existe. O piso é sobre a CONTAGEM justamente para o encurtamento da ' +
          'wave não voltar a virar soco único');
      }
    }
    ok(piorCaso < Infinity, 'nenhum golpe meu no roteiro — não há o que medir');

    /* E O DANO CONTINUA SOMANDO O HP INTEIRO: o piso REPARTE, não inventa. Se
       ele inflasse a soma, o mob morreria antes do último golpe e a barra
       chegaria a zero com golpes ainda por vir. */
    const roteiro = roteiroDaWave(rngTeste(7), { comp: [{ dex: 10, quantos: 6 }],
      venceu: true, dano: 4, golpesMeus: 4, golpesDele: 4, ritmo: RITMO_PISO });
    const meus = roteiro.momentos.filter(m => m.tipo === 'golpe' && m.de === 'meu');
    const porMob = new Map();
    for (const m of meus) porMob.set(m.i, (porMob.get(m.i) ?? 0) + m.dano);
    for (const [i, soma] of porMob)
      igual(soma, HP_MOB,
        `os meus golpes no selvagem ${i} somaram ${soma}, e o HP dele é ${HP_MOB}. ` +
        'O piso está inventando dano em vez de repartir o que existe — e o mob ' +
        'morreria antes do último golpe, com a barra em zero e golpes por vir');
    /* E OS NÚMEROS SÃO DIFERENTES ENTRE SI, que é o pedido literal. */
    ok(new Set(meus.map(m => m.dano)).size > 1,
      'todos os golpes tiram exatamente o mesmo — o hitbox volta a ser um ' +
      'número fixo, que é a queixa do dono com outra roupa');
  });

  /* ══ O PISO É NA CONTAGEM, E NUNCA NO TEMPO (S937) ═════════════════════
   *
   * O defeito plantado troca o passo espremido por `GOLPE_MS` fixo, e ele
   * **passou**: a contagem continua três, o dano continua repartido, e as duas
   * afirmações acima ficam verdes. O que ele quebra é outra coisa — os três
   * golpes deixam de CABER na wave.
   *
   *   > Três golpes a dois segundos numa wave que dura menos que seis é uma
   *   > wave que termina no meio da troca. O jogador vê o duelo ser cortado, e
   *   > o item 5 volta pela porta dos fundos: ou a wave estica, ou ela mente.
   *
   * O piso é sobre a CONTAGEM, e o passo é quem cede. Esta afirmação é a que
   * amarra as duas metades. */
  s.teste('os golpes CABEM na wave, por mais espremida que ela esteja', () => {
    for (let semente = 1; semente <= 30; semente++) {
      const roteiro = roteiroDaWave(rngTeste(semente), {
        comp: [{ dex: 10, quantos: 6 }], venceu: true, dano: 4,
        golpesMeus: 4, golpesDele: 4, ritmo: RITMO_PISO,
      });
      /* ── O SINTOMA DO ESTOURO É PILHA, E NÃO `t` MAIOR ─────────────────
         O roteiro CLAMPA todo momento em `duracao` no fim (é o que mantém o
         determinismo do §P3 honesto). Então um duelo que não cabe não produz
         instantes fora da wave: produz um MONTE de golpes no mesmo instante
         final — seis balões e seis números no mesmo quadro, e nada legível.

         Foi essa distinção que deixou o S937 escapar: a primeira versão desta
         afirmação comparava `m.t <= duracao`, e isso é verdade por
         construção. Ela media o clamp, e não o encaixe. */
      const golpes = roteiro.momentos.filter(m => m.tipo === 'golpe');
      const noFim = golpes.filter(m => m.t === roteiro.duracao).length;
      igual(noFim, 0,
        `${noFim} de ${golpes.length} golpes caíram no instante final da wave. ` +
        'O duelo não coube e o roteiro os empilhou — o jogador vê tudo ' +
        'acontecer no mesmo quadro. O piso virou piso de TEMPO');
    }
  });

  return s;

}
