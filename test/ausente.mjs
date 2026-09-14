/* O MODO AUSENTE E A BOLA DO AVANÇO — blocos A7 e A6.
 *
 * As duas afirmações que sustentam o arquivo:
 *
 *   A RESERVA se GANHA jogando, e é o que impede o modo ausente de ser um farm
 *             paralelo. Ela limita o TEMPO fora; o teto do §7.13 limita o
 *             RENDIMENTO. Nenhum teto novo.
 *   A BOLA    é UMA por espécie, por run — e sem isso uma run de 58 mobs seria
 *             58 tentativas de captura, e o teto do §P5 não significaria nada.
 */
import { criarSuite, ok, igual, dentro, rngTeste } from './harness.mjs';
import {
  RESERVA_MAX_H, reservaAgora, cabeAusente, gastarReserva, RENDE, rendeNo,
  FATOR_AUSENTE, rendimentoAusente,
  podeTreinar, treinoDe, treinoDaJanela,
  XP_POR_HORA_TREINO, VINCULO_POR_HORA_TREINO,
} from '../engine/ausente.mjs';
import {
  alvosDaBola, podeJogar, jogarBola, lancesQueRestam, previaDoLance,
} from '../engine/avanco-bola.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { ENCONTROS_POR_AVANCO } from '../engine/avanco.mjs';
import { PERFIS } from '../engine/expedicao.mjs';
import { XP_POR_ENCONTRO } from '../engine/nivel-criatura.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

const H = 3_600_000;
const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const DEX = ELENCO.comuns.map(x => x.dex);

export function suite() {
  const s = criarSuite('ausente');

  /* ═══ A7 — A RESERVA ══════════════════════════════════════════════════ */

  s.teste('A RESERVA ENCHE JOGANDO, e é gasta estando fora', () => {
    igual(reservaAgora({ msJogados: 0, msGastos: 0 }), 0,
      'quem nunca jogou começou com reserva — então ela não é ganha, é dada');
    igual(reservaAgora({ msJogados: 3 * H, msGastos: 0 }), 3,
      'três horas de tela não viraram três de reserva');
    igual(reservaAgora({ msJogados: 5 * H, msGastos: 2 * H }), 3,
      'o gasto não saiu da reserva');
  });

  s.teste('ela tem TETO, e nunca fica negativa', () => {
    /* O teto é o que impede a reserva de virar poupança infinita: quem jogou
       um fim de semana não pode ficar um mês fora colhendo. */
    igual(reservaAgora({ msJogados: 400 * H }), RESERVA_MAX_H,
      `a reserva passou de ${RESERVA_MAX_H} h — vira poupança, e a ideia era ` +
      'ser uma recompensa por jogar, não um estoque');
    igual(reservaAgora({ msJogados: 1 * H, msGastos: 90 * H }), 0,
      'a reserva ficou negativa, e negativo não é um estado que a tela saiba desenhar');
    igual(reservaAgora({}), 0, 'um estado vazio devolveu reserva');
    igual(reservaAgora(), 0, 'sem estado nenhum devolveu reserva');
  });

  s.teste('a recusa DIZ QUANTO FALTA, e não só que não cabe', () => {
    /* É a lição do D-067 aplicada aqui: uma recusa sem número manda o jogador
       adivinhar quanto tempo de tela ele deve. */
    const pouco = { msJogados: 1 * H, msGastos: 0 };
    const r = cabeAusente(pouco, PERFIS.vigilia.minutos);
    igual(r.cabe, false, 'uma hora de reserva comportou uma Vigília de oito');
    dentro(r.faltam, 7, 0.01, `a recusa disse que faltam ${r.faltam} h`);
    let erro = null;
    try { gastarReserva(pouco, PERFIS.vigilia.minutos); } catch (e) { erro = e.message; }
    ok(erro && /faltam/.test(erro) && /enche jogando/.test(erro),
      `a recusa respondeu: ${erro}. Ela precisa dizer quanto falta E como se enche.`);
  });

  s.teste('gastar não muta, e o gasto se acumula', () => {
    const base = { msJogados: 10 * H, msGastos: 0 };
    const depois = gastarReserva(base, PERFIS.trilha.minutos);
    igual(base.msGastos, 0, 'gastar MUTOU o estado que recebeu');
    dentro(reservaAgora(depois), 7, 0.01, 'a Trilha de 3 h não tirou 3 h da reserva');
    dentro(reservaAgora(gastarReserva(depois, PERFIS.trilha.minutos)), 4, 0.01,
      'o segundo gasto não se somou ao primeiro');
  });

  s.teste('UMA HORA DE TELA PAGA UMA HORA FORA — e é o que fecha o laço', () => {
    /* A invariante que faz o modo ausente ser recompensa em vez de farm
       paralelo. Se a taxa fosse maior que 1, jogar dez minutos pagaria a noite
       inteira e o laço abriria. */
    const umaHora = reservaAgora({ msJogados: 1 * H });
    ok(umaHora <= 1.0001,
      `uma hora de tela rendeu ${umaHora} h de reserva — acima de 1 o modo ` +
      'ausente deixa de ser recompensa por jogar e vira farm paralelo');
    ok(umaHora >= 0.9999,
      `uma hora de tela rendeu ${umaHora} h — abaixo de 1 o jogador nunca ` +
      'acumula, e o modo ausente vira inalcançável');
  });

  s.teste('O QUE SÓ O ONLINE TEM É O QUE EXIGE A MÃO DO JOGADOR', () => {
    /* A diferença entre os modos é de NATUREZA, e não de multiplicador. Um
       corte de números diria "o ausente é o mesmo jogo, pior". */
    for (const k of ['bola', 'pocao', 'chefe', 'bau']) {
      igual(RENDE.avanco[k], true, `o avanço perdeu "${k}"`);
      igual(RENDE.ausente[k], false,
        `o modo ausente ganhou "${k}", e não há ninguém lá para decidir`);
    }
    /* E o que ele TEM continua igual: nerf de número em cima disso puniria
       duas vezes a mesma escolha. */
    for (const k of ['encontros', 'item', 'xp', 'vinculo'])
      igual(RENDE.ausente[k], RENDE.avanco[k],
        `"${k}" foi cortado do ausente — mas o online já rende 4 a 6 vezes mais ` +
        'por hora, e essa diferença já vem de ele custar ATENÇÃO');
    igual(rendeNo('inventado').bau, false, 'um modo desconhecido ganhou o baú');
  });

  s.teste('a redução do ausente é LEVE, e não pode virar nerf sem decisão', () => {
    /* Pedido do dono, 08/09/2026: *"leve redução, quase imperceptível"*. A faixa
       é o que impede o número de escorregar — abaixo de 0,85 deixa de ser leve
       e vira punição por escolher o modo de quem não pode ficar; acima de 0,95
       some no arredondamento e não faz nada. */
    ok(FATOR_AUSENTE >= 0.85,
      `o fator é ${FATOR_AUSENTE} — abaixo de 0,85 deixa de ser "quase ` +
      'imperceptível" e vira punição por não poder ficar na tela');
    ok(FATOR_AUSENTE <= 0.95,
      `o fator é ${FATOR_AUSENTE} — acima de 0,95 ele some no arredondamento, ` +
      'e uma redução que não se mede não é uma redução');
    igual(rendimentoAusente(100), Math.round(100 * FATOR_AUSENTE));
    igual(rendimentoAusente(0), 0, 'zero rendeu alguma coisa');
    igual(rendimentoAusente(null), 0, 'entrada torta virou rendimento');
    ok(rendimentoAusente(1) >= 0, 'um valor pequeno virou negativo');
  });

  s.teste('a redução NÃO toca os encontros, e o motivo é aritmético', () => {
    /* ── E O MEU PRIMEIRO ARGUMENTO ESTAVA ERRADO ──────────────────────
       Eu tinha escrito que cortar os encontros daria ou 0% ou 25%. O teste
       reprovou na hora: a Trilha dá 12,5%. O argumento certo é outro, e é
       melhor — medido nos três perfis, com o mesmo fator de 0,9:

           Batida    5 -> 5    corte de  0,0%
           Trilha    8 -> 7    corte de 12,5%
           Vigília  14 -> 13   corte de  7,1%

       **O mesmo "10%" vira três coisas diferentes**, porque o encontro é
       inteiro e o arredondamento decide. O jogador que trocasse a Trilha pela
       Batida seria premiado por uma regra que ninguém escreveu.

         > Um número que muda de significado conforme onde é aplicado não é um
         > ajuste: é três ajustes que ninguém decidiu.

       E há o motivo forte: o encontro é a unidade que o teto do §P5 vigia.
       Mexer nele muda a economia inteira para resolver uma questão de
       percepção — que é usar o martelo errado. */
    const cortes = Object.values(PERFIS).map(p => {
      const max = p.encontros[1];
      return (max - Math.round(max * FATOR_AUSENTE)) / max;
    });
    const espalhamento = Math.max(...cortes) - Math.min(...cortes);
    ok(espalhamento > 0.05,
      `os cortes por perfil ficaram todos em ${cortes.map(c => (c * 100).toFixed(1))}% ` +
      '— se fossem iguais, aplicar o fator nos encontros seria defensável. Eles ' +
      'não são: o arredondamento faz o mesmo fator valer coisas diferentes.');
    /* E o que o `RENDE` promete continua inteiro: o ausente ENTREGA encontro,
       item, XP e vínculo. A redução é de QUANTO, e não de QUÊ. */
    igual(RENDE.ausente.encontros, true,
      'a redução virou remoção — o ausente deixou de dar encontro');
  });

  /* ═══ A7 — O TREINO AUSENTE ═══════════════════════════════════════════ */

  s.teste('o TREINO não produz encontro nem item — e é o que salva o teto', () => {
    /* Se treinar rendesse encontro, ele comeria o teto do §P5 e viraria um
       terceiro farm. O zero é explícito no objeto de propósito: ausência se lê
       como esquecimento; zero se lê como decisão. */
    const t = treinoDe({ minutos: 480 });
    igual(t.encontros, 0, 'o treino ausente produziu encontro, e come o teto');
    igual(t.itens, 0, 'o treino ausente produziu item');
    ok(t.xp > 0 && t.vinculo > 0, 'o treino ausente não rendeu nada');
  });

  s.teste('treinar é MAIS LENTO que aventurar, e tem de ser', () => {
    /* Se fosse igual, ninguém aventuraria com a segunda criatura — e o modo que
       existe para viabilizar a coleção passaria a substituí-la. */
    const horasBatida = PERFIS.batida.minutos / 60;
    const xpBatidaPorHora = (XP_POR_ENCONTRO.batida * 4) / horasBatida;
    /* ── E O LIMIAR ERA FROUXO, E O Q2 MOSTROU ────────────────────────
       "menor que a Batida" deixava passar 30 XP/h contra 42,7 — a sabotagem
       S862 fazia exatamente isso e passava VERDE. Treinar a 70% de aventurar
       não é "mais lento": é a alternativa confortável, e ninguém aventuraria
       com a segunda criatura.

         > Um limiar que só proíbe o absurdo permite todo o resto. */
    ok(XP_POR_HORA_TREINO <= xpBatidaPorHora / 2,
      `o treino rende ${XP_POR_HORA_TREINO} XP/h e a Batida rende ` +
      `${xpBatidaPorHora.toFixed(1)} — acima de metade, treinar vira a opção ` +
      'confortável e o modo que existe para viabilizar a coleção passa a ' +
      'substituí-la');
    ok(XP_POR_HORA_TREINO >= xpBatidaPorHora / 20,
      `o treino rende ${XP_POR_HORA_TREINO} XP/h contra ${xpBatidaPorHora.toFixed(1)} ` +
      'da Batida — abaixo de um vigésimo ele existe só no papel');
    ok(XP_POR_HORA_TREINO > 0,
      'o treino não rende XP nenhum, e aí ele não existe');
  });

  s.teste('quem está em aventura NÃO pode estar em treino', () => {
    /* Sem esta recusa a mesma criatura renderia nos dois lugares ao mesmo
       tempo, e o dia dobraria por uma porta que ninguém abriu de propósito. */
    const c = { id: 'x' };
    igual(podeTreinar(c, []).pode, true, 'uma criatura livre foi recusada no treino');
    const r = podeTreinar(c, [{ id: 'x' }]);
    igual(r.pode, false, 'a criatura em aventura entrou no treino também');
    ok(/aventura/.test(r.motivo ?? ''), `a recusa disse: ${r.motivo}`);
    igual(podeTreinar({}, []).pode, false, 'uma criatura sem id passou');
  });

  /* ── A JANELA DO TREINO, e por que ela é a da EXPEDIÇÃO ──────────
     O TRAINER OFF é o gêmeo da ROTA OFF: o jogador manda a expedição e FECHA
     o jogo. A janela em que o banco treina é exatamente essa — e não "desde
     sempre", que pagaria XP infinito a quem nunca abre o jogo.

     A alternativa seria um saldo de tempo próprio, e ela custa um segundo
     relógio para dizer a mesma coisa que o primeiro já diz. */
  s.teste('o treino paga a JANELA da expedição, e só a quem ficou', () => {
    const criaturas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const de = 1_000_000, ate = de + 4 * 3_600_000;   // quatro horas
    const r = treinoDaJanela({ criaturas, equipe: ['a'], de, ate });
    igual(r.length, 2, 'quem foi a campo também treinou — o dia dobrou');
    ok(r.every(x => x.id !== 'a'), 'a criatura da expedição entrou no treino');
    igual(r[0].xp, 4 * XP_POR_HORA_TREINO, 'o XP das quatro horas não bateu');
    igual(r[0].vinculo, 4 * VINCULO_POR_HORA_TREINO, 'o vínculo não bateu');
    igual(r[0].ate, ate, 'a marca de até onde já se pagou não veio');
  });

  s.teste('duas expedições sobrepostas NÃO pagam a mesma hora duas vezes', () => {
    /* Com duas vagas em campo, as janelas se cruzam. Sem a marca por criatura,
       a hora coberta pelas duas seria paga DUAS vezes — e o teto de XP do dia
       viraria o número de vagas, que é exatamente o vazamento que o §P5 fecha
       do lado dos encontros. */
    const criaturas = [{ id: 'b' }];
    const um = treinoDaJanela({ criaturas, equipe: [], de: 0, ate: 4 * 3_600_000 });
    criaturas[0].treinadoAte = um[0].ate;
    /* a segunda expedição começou duas horas depois da primeira */
    const dois = treinoDaJanela({ criaturas, equipe: [],
      de: 2 * 3_600_000, ate: 6 * 3_600_000 });
    igual(dois[0].xp, 2 * XP_POR_HORA_TREINO,
      'as duas horas já pagas pela primeira expedição foram pagas de novo');
  });

  s.teste('janela vazia não paga, e não quebra', () => {
    /* Colher uma expedição duas vezes, ou colher uma que durou zero, não pode
       creditar nada — nem um NaN, que é pior que um zero porque contamina o
       nível da criatura em silêncio. */
    const criaturas = [{ id: 'b', treinadoAte: 9_999 }];
    igual(treinoDaJanela({ criaturas, equipe: [], de: 0, ate: 9_999 }).length, 0,
      'uma janela já paga pagou de novo');
    igual(treinoDaJanela({ criaturas, equipe: [], de: 500, ate: 100 }).length, 0,
      'uma janela invertida creditou alguma coisa');
    igual(treinoDaJanela({}).length, 0, 'sem argumento nenhum ele não devolveu lista');
  });

  /* ═══ A6 — A BOLA DURANTE O AVANÇO ════════════════════════════════════ */

  s.teste('a bola só alcança quem JÁ APARECEU', () => {
    /* Sem a regra escrita, a tela poderia listar o elenco inteiro — que ela
       conhece desde o cartão de escolha — e deixar capturar o chefe na wave 1. */
    igual(alvosDaBola({ apareceram: [], tentadas: [] }).length, 0,
      'no começo da run havia alvo, e ninguém apareceu ainda');
    igual(alvosDaBola({ apareceram: DEX.slice(0, 2), tentadas: [] }).length, 2);
    igual(podeJogar(ELENCO.chefes[0].dex, { apareceram: DEX, tentadas: [] }), false,
      'o chefe pôde receber bola antes da décima wave');
    let erro = null;
    try {
      jogarBola(rngTeste(1), kanto, { dex: 9999, raridade: 'comum', bola: 'poke',
        bolsa: { poke: 5 }, apareceram: DEX, tentadas: [] });
    } catch (e) { erro = e.message; }
    ok(erro && /ainda não apareceu/.test(erro), `a recusa respondeu: ${erro}`);
  });

  s.teste('UMA BOLA POR ESPÉCIE, POR RUN — e é o que salva o teto', () => {
    /* Sem isto, 58 mobs seriam 58 tentativas, e o teto de encontros do §P5 não
       significaria mais nada. Com isto, o máximo é o elenco: seis. */
    const ctx = { apareceram: DEX, tentadas: [] };
    const r = jogarBola(rngTeste(7), kanto, {
      dex: DEX[0], raridade: 'comum', bola: 'poke', bolsa: { poke: 3 }, ...ctx });
    ok(r.tentadas.includes(DEX[0]), 'a espécie não entrou em "já tentadas"');
    let erro = null;
    try {
      jogarBola(rngTeste(8), kanto, { dex: DEX[0], raridade: 'comum', bola: 'poke',
        bolsa: r.bolsa, apareceram: DEX, tentadas: r.tentadas });
    } catch (e) { erro = e.message; }
    ok(erro && /já jogou/.test(erro),
      `a segunda bola na mesma espécie respondeu: ${erro}`);
    igual(lancesQueRestam({ elenco: ELENCO, tentadas: [] }), ENCONTROS_POR_AVANCO,
      'a run comportou mais lances que o tamanho do elenco');
  });

  s.teste('os lances que restam DESCEM a cada espécie queimada', () => {
    /* ── E A MINHA AFIRMAÇÃO MEDIA COM A LISTA VAZIA ────────────────────
       Eu conferia `lancesQueRestam({ elenco, tentadas: [] })` — e com a lista
       vazia a subtração não tem o que subtrair. A sabotagem S855, que apaga
       exatamente essa subtração, passava VERDE.

         > Medi o caso em que o defeito não cabe. Sexta vez neste projeto, e a
         > forma é sempre a mesma.

       O contador existe para a tela poder dizer, ANTES da compra, que levar
       vinte bolas para um estágio de seis espécies não compra nada. Um contador
       que nunca desce diz o contrário. */
    const todas = [...ELENCO.comuns, ...ELENCO.chefes].map(x => x.dex);
    let anterior = lancesQueRestam({ elenco: ELENCO, tentadas: [] });
    igual(anterior, ENCONTROS_POR_AVANCO, 'a run começa com lances a menos que o elenco');
    for (let i = 0; i < todas.length; i++) {
      const agora = lancesQueRestam({ elenco: ELENCO, tentadas: todas.slice(0, i + 1) });
      igual(agora, anterior - 1,
        `queimando a ${i + 1}ª espécie, restavam ${anterior} e passaram a ${agora}. ` +
        'O contador tem de descer UM por espécie — se ele não desce, a tela ' +
        'promete lances que não existem, e a bolsa passa a parecer o limite.');
      anterior = agora;
    }
    igual(anterior, 0, 'com o elenco inteiro queimado ainda sobrou lance');
    /* E queimar quem não é do estágio não muda nada: o teto é o ELENCO. */
    igual(lancesQueRestam({ elenco: ELENCO, tentadas: [9999] }), ENCONTROS_POR_AVANCO,
      'uma espécie de fora do estágio consumiu um lance');
  });

  s.teste('a espécie fica QUEIMADA mesmo quando a captura falha', () => {
    /* É o que torna o lance uma decisão: errar custa a chance daquela espécie
       nesta run, e não só a bola. */
    let falhou = null;
    for (let i = 0; i < 200 && !falhou; i++) {
      const r = jogarBola(rngTeste(i * 7919), kanto, {
        dex: DEX[0], raridade: 'muitoRaro', bola: 'poke',
        bolsa: { poke: 9 }, apareceram: DEX, tentadas: [] });
      if (!r.capturou) falhou = r;
    }
    ok(falhou, 'em 200 sementes nenhuma captura de "muito raro" falhou com a bola comum');
    ok(falhou.tentadas.includes(DEX[0]),
      'a captura falhou e a espécie NÃO ficou queimada — o jogador pode ' +
      'insistir até acertar, e a bola deixa de ser uma decisão');
  });

  s.teste('a bola sai da bolsa, e sem bola não há lance', () => {
    const r = jogarBola(rngTeste(3), kanto, {
      dex: DEX[0], raridade: 'comum', bola: 'poke',
      bolsa: { poke: 2 }, apareceram: DEX, tentadas: [] });
    igual(r.bolsa.poke, 1, 'a bola não saiu da bolsa');
    let erro = null;
    try {
      jogarBola(rngTeste(4), kanto, { dex: DEX[1], raridade: 'comum', bola: 'poke',
        bolsa: {}, apareceram: DEX, tentadas: [] });
    } catch (e) { erro = e.message; }
    ok(erro && /não tem/.test(erro), `sem bola na bolsa: ${erro}`);
  });

  s.teste('a RECUSA fala do problema certo, e a ordem importa', () => {
    /* Quem tenta capturar quem já tentou precisa ouvir isso, e não "sem bola":
       uma recusa que fala do problema errado manda o jogador consertar o que
       não está quebrado. É o D-067 na porta da captura. */
    let erro = null;
    try {
      jogarBola(rngTeste(5), kanto, { dex: DEX[0], raridade: 'comum', bola: 'poke',
        bolsa: {}, apareceram: DEX, tentadas: [DEX[0]] });
    } catch (e) { erro = e.message; }
    ok(erro && /já jogou/.test(erro) && !/não tem/.test(erro),
      `com a espécie queimada E a bolsa vazia, a recusa falou de: ${erro}`);
  });

  s.teste('UMA RECUSA NÃO CONSOME A SEMENTE', () => {
    /* ── ACHADO PELO Q2, E ELE É MELHOR QUE A MINHA AFIRMAÇÃO ────────────
       A sabotagem S854 movia o `tentar()` para ANTES da conferência da bolsa.
       Eu tinha escrito que isso trocava a ORDEM DAS MENSAGENS — não troca: o
       "já jogou" continua vindo primeiro. O que ela quebra é outra coisa, e
       maior:

         > Um lance recusado passava a CONSUMIR o sorteio.

       Duas runs com a mesma semente divergiriam por causa de um clique que o
       jogo recusou. É o §P3 caindo pela porta dos fundos — e nenhuma das
       minhas afirmações olhava para lá.

       O teste é direto: gasta um sorteio numa recusa e confere que o próximo
       lance legítimo devolve o mesmo resultado de quem nunca tentou. */
    const semente = 4242;
    const limpo = jogarBola(rngTeste(semente), kanto, {
      dex: DEX[0], raridade: 'comum', bola: 'poke',
      bolsa: { poke: 2 }, apareceram: DEX, tentadas: [] });

    const r = rngTeste(semente);
    for (const torto of [
      { dex: 9999, raridade: 'comum', bola: 'poke', bolsa: { poke: 2 } },
      { dex: DEX[1], raridade: 'comum', bola: 'poke', bolsa: {} },
      { dex: DEX[2], raridade: 'comum', bola: 'inexistente', bolsa: { poke: 2 } },
    ]) {
      try {
        jogarBola(r, kanto, { ...torto, apareceram: DEX, tentadas: [DEX[2]] });
        ok(false, `o lance torto ${JSON.stringify(torto.dex)} NÃO foi recusado`);
      } catch { /* recusar é o esperado */ }
    }
    const depois = jogarBola(r, kanto, {
      dex: DEX[0], raridade: 'comum', bola: 'poke',
      bolsa: { poke: 2 }, apareceram: DEX, tentadas: [] });
    igual(depois.capturou, limpo.capturou,
      'três recusas mudaram o resultado do lance seguinte — a semente foi ' +
      'consumida por cliques que o jogo NEGOU, e duas runs com a mesma ' +
      'semente deixam de ser a mesma run (§P3)');
    igual(depois.chance, limpo.chance, 'a chance mudou depois de recusas');
  });

  s.teste('a prévia do lance sobe com a bola melhor', () => {
    /* §8.1: o jogador tem de MANIPULAR uma probabilidade e ver o número mexer.
       Sem prévia, escolher entre a comum e a Ultra é adivinhação. */
    const comum = previaDoLance(kanto, { raridade: 'raro', bola: 'poke' });
    const ultra = previaDoLance(kanto, { raridade: 'raro', bola: 'ultra' });
    ok(ultra > comum,
      `a Ultra (${ultra}) não rende mais que a comum (${comum}) contra "raro"`);
    ok(comum > 0 && ultra < 1, 'a prévia devolveu certeza');
  });

  return s;
}
