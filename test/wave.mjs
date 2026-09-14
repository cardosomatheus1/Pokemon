/* A RESOLUÇÃO DA WAVE — bloco A2 (Spec §7.22.4 e §7.22.6).
 *
 * Este é o arquivo onde a nova mecânica vira número, e por isso as afirmações
 * daqui são de INVARIANTE e de ESTATÍSTICA, não de aparência.
 *
 * As três que sustentam tudo:
 *
 *   ESCALA-LIVRE   dobrar poder E ameaça juntos não muda a chance. Sem isso, o
 *                  equilíbrio teria de ser refeito a cada faixa de nível.
 *   NADA É CERTO   nem 0%, nem 100%. Um idle onde a wave é garantida não pede
 *                  a mão do jogador, e um onde é impossível não pede nada.
 *   NÃO CURA       nenhuma wave devolve HP. A barra só desce, e é ela o relógio
 *                  da run.
 */
import { criarSuite, ok, igual, dentro, rngTeste } from './harness.mjs';
import {
  WAVES, MOBS_POR_WAVE, MOBS_DO_CHEFE, ESPECIES_POR_WAVE, MOBS_TOTAIS,
  ehWaveDeChefe, composicaoDaWave, poderDaEquipe, ameacaDa, chanceDe,
  resolverWave, simularAvanco, PESO_DA_VAGA, HP_MAX,
} from '../engine/wave.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { NIVEL_DO_ESTAGIO } from '../engine/estagios.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

/* O gerador é o DO ARNÊS, e não um meu. Teste estatístico que muda de resposta
   entre duas execuções não é teste — é sorte com relatório —, e ter dois
   geradores no repositório é ter duas definições de "reprodutível". */
const dado = (semente = 0x9e3779b9) => rngTeste(semente);
const ELENCO = elencoDoEstagio(kanto, 'floresta', 1);
const criatura = (nivel, forca = 318) => ({ nivel, forca, vinculo: 0, foco: null });

export function suite() {
  const s = criarSuite('wave');

  /* ── A ESTRUTURA MUDOU, E O DONO A MUDOU DUAS VEZES ───────────────────
   *
   * Em 07/09 ele desenhou: *"nessas 10 wave ele vai enfrentar 58 mobs, 3-3:6
   * por wave e 2-2:4 no boss"*. Em 09/09, vendo a run rodando, ele revisou as
   * duas metades:
   *
   *   > "6 Pokémon por wave está muito, vamos reduzir para 4 por wave"
   *   > "no final podem vir os boss em forma de luta 1x1 (…) como um boss só"
   *
   * O 58 sai daqui com ele. **A afirmação não some: ela passa a defender a
   * CONTA**, e não o número — que o total seja coerente com as partes é o que
   * impede a tela e o motor de discordarem sobre quantos vêm.
   *
   * O número velho fica escrito ao lado do novo, que é a regra deste projeto
   * para toda medição que muda. */
  s.teste('a estrutura bate com as partes — 9×4 + 1 = 37', () => {
    igual(WAVES, 10);
    igual(MOBS_POR_WAVE, 4, 'a wave comum deixou de trazer quatro');
    igual(MOBS_DO_CHEFE, 1, 'a wave do chefe deixou de ser 1x1');
    igual(ESPECIES_POR_WAVE, 2, 'a wave comum deixou de trazer duas espécies');
    igual(MOBS_TOTAIS, (WAVES - 1) * MOBS_POR_WAVE + MOBS_DO_CHEFE,
      'o total não é a soma das partes — a tela mostraria um número e o motor ' +
      'resolveria outro');
    igual(MOBS_TOTAIS, 37,
      `o avanço soma ${MOBS_TOTAIS} mobs. Era 58 no desenho de 07/09 (6 por ` +
      'wave, 4 no chefe); o dono revisou para 4 e 1 em 09/09');
  });

  s.teste('só a décima é do chefe', () => {
    for (let w = 1; w <= WAVES; w++)
      igual(ehWaveDeChefe(w), w === WAVES, `a wave ${w} classificou errado`);
  });

  s.teste('a wave comum traz 3+3 de DUAS espécies comuns', () => {
    const r = dado();
    for (let w = 1; w < WAVES; w++) {
      const c = composicaoDaWave(r, { elenco: ELENCO, wave: w });
      igual(c.length, ESPECIES_POR_WAVE, `a wave ${w} trouxe ${c.length} espécie(s)`);
      igual(c.reduce((a, x) => a + x.quantos, 0), MOBS_POR_WAVE,
        `a wave ${w} não somou ${MOBS_POR_WAVE} mobs`);
      const comuns = new Set(ELENCO.comuns.map(x => x.dex));
      for (const x of c) {
        ok(comuns.has(x.dex), `um chefe apareceu na wave ${w}, que é de mob`);
        igual(x.quantos, MOBS_POR_WAVE / ESPECIES_POR_WAVE, 'a divisão 3+3 quebrou');
      }
      igual(new Set(c.map(x => x.dex)).size, c.length,
        `a wave ${w} repetiu a MESMA espécie nas duas metades — o 3+3 virou 6 iguais`);
    }
  });

  /* ── A DÉCIMA VIROU DUELO, E A DECISÃO ANTERIOR ESTÁ AQUI ─────────────
   *
   * Em 07/09 o dono pediu os DOIS chefes fixos na wave 10 — *"fixo na wave 10,
   * com o PAR sorteado quando houver mais de dois"* —, e a razão era boa: o
   * jogador sabe para o que está guardando a poção.
   *
   * Em 09/09 ele reviu: *"como um boss só (…) essa questão de aparecer um ou
   * outro vai ocorrer de forma RNG"*.
   *
   * **O que se perde é a preparação exata; o que se ganha é a razão de
   * repetir.** Com os dois fixos, a décima wave é idêntica em toda run daquele
   * estágio. Com um sorteado, duas runs do mesmo lugar têm finais diferentes —
   * e num modo que se joga por horas a segunda vale mais que a primeira. */
  s.teste('a décima traz UM chefe, sorteado entre os do estágio', () => {
    const c = composicaoDaWave(dado(), { elenco: ELENCO, wave: WAVES });
    igual(c.length, 1, 'a wave do chefe trouxe mais de uma espécie — não é 1x1');
    igual(c.reduce((a, x) => a + x.quantos, 0), MOBS_DO_CHEFE,
      'a wave do chefe não soma o total declarado');
    const chefes = new Set(ELENCO.chefes.map(x => x.dex));
    ok(chefes.has(c[0].dex), 'a wave do chefe trouxe quem não é chefe');
    igual(c[0].quantos, 1, '1x1 quer dizer UM');
  });

  s.teste('a mesma semente devolve a mesma wave', () => {
    /* §P3. A run tem de poder ser reproduzida — é o que permite avançar rápido
       ao reconectar e auditar o saque depois. */
    for (let w = 1; w <= WAVES; w++)
      igual(JSON.stringify(composicaoDaWave(dado(7), { elenco: ELENCO, wave: w })),
            JSON.stringify(composicaoDaWave(dado(7), { elenco: ELENCO, wave: w })),
            `a wave ${w} saiu diferente com a mesma semente`);
  });

  s.teste('A CHANCE É ESCALA-LIVRE — dobrar os dois lados não muda nada', () => {
    /* A invariante mais importante do arquivo. Sem ela, o equilíbrio da faixa
       de nível 10 não diria nada sobre a de nível 40, e cada estágio novo
       precisaria de calibração própria. */
    for (const [p, a] of [[100, 100], [180, 120], [90, 240], [1000, 700]])
      dentro(chanceDe(p, a), chanceDe(p * 3.7, a * 3.7), 1e-9,
        `poder ${p} × ameaça ${a} mudou de chance ao multiplicar os dois por 3,7`);
  });

  s.teste('a chance sobe com o poder e desce com a ameaça', () => {
    let anterior = 0;
    for (const p of [40, 80, 120, 200, 400]) {
      const c = chanceDe(p, 150);
      ok(c > anterior, `poder ${p} não deu chance maior que o poder anterior`);
      anterior = c;
    }
    anterior = 1;
    for (const a of [40, 80, 120, 200, 400]) {
      const c = chanceDe(150, a);
      ok(c < anterior, `ameaça ${a} não deu chance menor que a ameaça anterior`);
      anterior = c;
    }
    dentro(chanceDe(150, 150), 0.5, 0.001, 'em pé de igualdade a chance não é 50%');
  });

  s.teste('nada é certo, nos dois sentidos', () => {
    /* Um idle onde a wave é garantida não pede a mão do jogador; um onde é
       impossível não pede nada. E o teto vale para números absurdos também —
       um save adulterado com poder 10^9 não pode comprar certeza. */
    for (const [p, a] of [[1e9, 1], [1, 1e9], [0, 100], [100, 0], [NaN, 100], [100, NaN]]) {
      const c = chanceDe(p, a);
      ok(Number.isFinite(c), `chanceDe(${p}, ${a}) devolveu ${c}`);
      ok(c > 0 && c < 1, `chanceDe(${p}, ${a}) = ${c} — certeza não pode existir`);
    }
  });

  s.teste('a segunda criatura ajuda MENOS que a primeira', () => {
    /* Pedido literal do dono sobre mandar mais de uma: *"o jogador precisa
       sentir a recompensa, mas não pode ser nada surreal e quebrado"*.

       Linear seria surreal: quatro criaturas dariam quatro vezes o poder, e o
       teto do farm passaria a ser quantas vagas se tem, e não o quão boa é a
       equipe. Decrescente dá sensação sem quebrar. */
    const uma = poderDaEquipe([criatura(20)]);
    const duas = poderDaEquipe([criatura(20), criatura(20)]);
    const tres = poderDaEquipe([criatura(20), criatura(20), criatura(20)]);
    ok(duas > uma, 'a segunda criatura não somou nada');
    ok(duas < uma * 2, `duas criaturas deram ${duas} e uma dá ${uma} — é LINEAR, ` +
      'e linear faz o farm depender de vagas em vez de força');
    ok(tres - duas < duas - uma,
      'o ganho da terceira não foi menor que o da segunda — a curva não decresce');
    for (let i = 1; i < PESO_DA_VAGA.length; i++)
      ok(PESO_DA_VAGA[i] < PESO_DA_VAGA[i - 1], 'os pesos das vagas não decrescem');
  });

  s.teste('o NÍVEL pesa, e a equipe vazia vale zero', () => {
    /* ── O VÍNCULO SAIU DAQUI EM 09/09/2026 ─────────────────────────────
       Este teste cobrava que ele pesasse. Ele foi INTEIRO para a Gen 2 por
       decisão do dono, junto com a evolução por afinidade — e o teste que
       cobra o contrário está logo abaixo, com o porquê.

         > Um teste que continua cobrando a regra revogada não é rigor: é o
         > produto obedecendo a uma decisão que ninguém mais tomou. */
    ok(poderDaEquipe([criatura(30)]) > poderDaEquipe([criatura(10)]),
      'o nível não mudou o poder');
    igual(poderDaEquipe([]), 0, 'equipe vazia devolveu poder');
    igual(poderDaEquipe(null), 0, 'equipe ausente derrubou a conta');
  });

  s.teste('a décima wave é mais dura em TODO bioma e TODO estágio', () => {
    /* ── E ESTE TESTE MEDIA UM LUGAR SÓ ────────────────────────────────
       A primeira versão comparava as duas ameaças na mata, estágio 1 — e ali
       o chefe é forte o bastante para o defeito não aparecer. A sabotagem que
       apagava o passo do chefe passou VERDE.

       Medido depois: **19 dos 44 estágios** tinham a décima wave MAIS FÁCIL
       que a rotina, porque vêm QUATRO chefes contra SEIS mobs, e quatro vezes
       uma força grande nem sempre passa seis vezes uma força média.

         > A afirmação passava por um caminho que o defeito não toca. É a
         > quarta vez neste projeto, e a forma é sempre a mesma: eu medi um
         > lugar e falei do conjunto.

       Agora varre os 44. */
    let piorFolga = Infinity, ondePior = null;
    for (const b of (kanto.biomas ?? []).map(x => x.id))
      for (let n = 1; n <= 4; n++) {
        const elenco = elencoDoEstagio(kanto, b, n);
        const rotina = ameacaDa({ elenco, wave: 1, estagio: n });
        const chefe = ameacaDa({ elenco, wave: WAVES, estagio: n });
        ok(chefe > rotina,
          `em ${b}/${n} o chefe ameaça ${chefe.toFixed(0)} e a rotina ` +
          `${rotina.toFixed(0)} — a décima wave seria mais fácil que a nona, ` +
          'e o clímax viraria alívio');
        const folga = chefe / rotina;
        if (folga < piorFolga) { piorFolga = folga; ondePior = `${b}/${n}`; }
      }
    /* E o passo tem de ser SENTIDO, e não um empate técnico: um chefe 2% mais
       duro que a rotina passa a afirmação acima e não é clímax nenhum. */
    ok(piorFolga >= 1.2,
      `a menor folga do chefe é ${piorFolga.toFixed(2)}× em ${ondePior} — ` +
      'abaixo de 1,2 a décima wave deixa de ser sentida como diferente');
  });

  s.teste('PERDER a wave dói mais que vencer', () => {
    const base = { elenco: ELENCO, wave: 3, estagio: 1, hp: HP_MAX };
    const equipe = [criatura(14)];
    let danoVit = null, danoDer = null;
    /* Varre sementes até ver os dois desfechos: afirmar sobre um só seria falar
       de metade da mecânica. */
    for (let i = 0; i < 400 && (danoVit === null || danoDer === null); i++) {
      const r = resolverWave(dado(i * 2654435761), { ...base, equipe });
      if (r.venceu && danoVit === null) danoVit = r.dano;
      if (!r.venceu && danoDer === null) danoDer = r.dano;
    }
    ok(danoVit !== null && danoDer !== null,
      `em 400 sementes não apareceram os dois desfechos (vitória=${danoVit}, derrota=${danoDer})`);
    ok(danoDer > danoVit,
      `perder custou ${danoDer} e vencer custou ${danoVit} — sem diferença, ` +
      'a derrota deixa de ser um acontecimento');
  });

  s.teste('nenhuma wave devolve HP, nunca', () => {
    /* A barra é o relógio da run. Uma wave que cura seria um relógio que anda
       para trás — e a poção do A3 deixaria de ser uma decisão. */
    const equipe = [criatura(14)];
    for (let i = 0; i < 300; i++) {
      const hp = 20 + (i % 80);
      const r = resolverWave(dado(i * 22695477), {
        elenco: ELENCO, wave: 1 + (i % WAVES), estagio: 1, hp, equipe });
      ok(r.dano >= 0, `a wave devolveu dano ${r.dano}`);
      ok(r.hpFinal <= hp, `o HP subiu de ${hp} para ${r.hpFinal}`);
      ok(r.hpFinal >= 0, `o HP ficou negativo: ${r.hpFinal}`);
    }
  });

  s.teste('o que caiu foi o que estava na wave', () => {
    /* Os abates alimentam o log e o painel "quem apareceu". Um abate de espécie
       que não estava na wave é o painel mentindo sobre a run. */
    const equipe = [criatura(30)];
    for (let w = 1; w <= WAVES; w++) {
      const r = dado(w * 40503);
      const comp = composicaoDaWave(r, { elenco: ELENCO, wave: w });
      const res = resolverWave(dado(w * 40503), {
        elenco: ELENCO, wave: w, estagio: 1, hp: HP_MAX, equipe });
      const naWave = new Set(comp.map(x => x.dex));
      for (const a of res.abates) {
        ok(naWave.has(a.dex), `a wave ${w} abateu quem não estava nela`);
        ok(a.quantos > 0, 'um abate veio com quantidade zero');
      }
      if (res.venceu)
        igual(res.abates.reduce((a, x) => a + x.quantos, 0),
              comp.reduce((a, x) => a + x.quantos, 0),
              `a wave ${w} foi vencida e não abateu todo mundo`);
    }
  });

  s.teste('§Q4 — no nível da porta, o avanço é DURO e possível', () => {
    /* A medição que dá o equilíbrio do bloco. O dono foi explícito: *"não pode
       ser nada surreal e quebrado"* e *"o jogador realmente precisa ganhar o
       combate"*.

       No nível que ABRE o estágio, com UMA criatura e sem poção, limpar as dez
       waves tem de ser possível e improvável — é o que faz repetir o estágio
       ser a resposta, e não um muro. */
    let limpou = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const r = simularAvanco(dado(i * 2246822519), {
        elenco: ELENCO, estagio: 1, equipe: [criatura(1, 318)] });
      if (r.completou) limpou++;
    }
    const taxa = limpou / N;
    ok(taxa > 0.005, `com uma criatura no nível da porta, o avanço foi limpo ` +
      `${(taxa * 100).toFixed(1)}% das vezes — é um MURO, e "volte amanhã" é a ` +
      'pior resposta que um idle pode dar');
    ok(taxa < 0.55, `com uma criatura no nível da porta, o avanço foi limpo ` +
      `${(taxa * 100).toFixed(1)}% das vezes — se o primeiro estágio já se limpa ` +
      'na metade das tentativas, subir de nível deixa de ter motivo');
  });

  s.teste('§Q4 — A PORTA DE CADA ESTÁGIO É JOGÁVEL, e é a promessa da escada', () => {
    /* ── A AFIRMAÇÃO QUE FALTAVA, E O Q2 APONTOU ────────────────────────
       A sabotagem que devolve a inclinação do nível para /60 passou VERDE, e
       ela é a que mais dói: com ela, o estágio 2 no nível que o ABRE tem taxa
       de limpeza ZERO.

       Nenhum teste pegava porque todos mediam o ESTÁGIO 1, onde os mobs são
       fracos e a inclinação do nível quase não importa. O defeito mora no
       fundo da escada, onde a força do bioma cresce e a do jogador tem de
       acompanhar.

         > Medir o degrau mais fácil e falar da escada inteira é a mesma falha
         > de sempre, e esta é a quinta vez que ela aparece neste projeto.

       O que a escada PROMETE é isto, e é o que se afirma aqui: **abrir um
       estágio quer dizer poder jogá-lo.** Não vencer sempre — poder jogar.
       Um nível que abre a porta e não atravessa a sala é a parede que o
       `estagios.mjs` já se compromete a não construir. */
    const PORTAS = NIVEL_DO_ESTAGIO;      /* [1, 12, 19, 31] — a escada de verdade */
    for (let est = 1; est <= PORTAS.length; est++) {
      const elenco = elencoDoEstagio(kanto, 'floresta', est);
      let limpou = 0;
      const N = 300;
      for (let i = 0; i < N; i++)
        if (simularAvanco(dado(i * 2246822519), {
          elenco, estagio: est, equipe: [criatura(PORTAS[est - 1])] }).completou) limpou++;
      const taxa = limpou / N;
      ok(taxa >= 0.05,
        `o estágio ${est} abre no nível ${PORTAS[est - 1]}, e nesse nível ele é ` +
        `limpo ${(taxa * 100).toFixed(1)}% das vezes. Abaixo de 5% a porta abre ` +
        'para uma parede, e "volte amanhã" é a pior resposta que um idle pode dar.');
      ok(taxa <= 0.85,
        `o estágio ${est} é limpo ${(taxa * 100).toFixed(1)}% das vezes já no ` +
        'nível que o abre — acima de 85% o estágio novo não pede nada de quem ' +
        'chegou nele, e a escada deixa de ser escada.');
    }
  });

  s.teste('§Q4 — subir de nível PAGA, e a equipe cheia paga mais', () => {
    const taxa = (equipe, N = 400) => {
      let n = 0;
      for (let i = 0; i < N; i++)
        if (simularAvanco(dado(i * 3266489917), { elenco: ELENCO, estagio: 1, equipe }).completou) n++;
      return n / N;
    };
    const fraca = taxa([criatura(1)]);
    const media = taxa([criatura(12)]);
    const forte = taxa([criatura(25)]);
    ok(media > fraca, `nível 12 (${media}) não superou nível 1 (${fraca}) — subir não paga`);
    ok(forte >= media, `nível 25 (${forte}) ficou abaixo do nível 12 (${media})`);
    ok(taxa([criatura(12), criatura(12), criatura(12)]) >= media,
      'três criaturas renderam MENOS que uma — a vaga não paga');
    /* ── E O TETO NÃO VALE PARA A RUN, E SIM PARA A WAVE ──────────────────
       A primeira versão deste teste exigia que nem o nível 25 limpasse sempre.
       Está errado, e a medição mostrou: no estágio 1 ele limpa 100%.

       O que não pode ser certo é a WAVE — e essa afirmação já está no teste
       "nada é certo", onde ela mora. Uma RUN de dez waves com repetição e HP
       de sobra é justamente o que um jogador muito acima do estágio deve
       conseguir; o que limita o farm dele não é a dificuldade, é o teto de
       encontros do §7.13.

         > Afirmar "nunca 100%" sobre a run era pedir que o jogo punisse quem
         > se preparou. O teto de incerteza tem lugar, e o lugar é a wave. */
    ok(chanceDe(1e6, 1) <= 0.95,
      'a chance de UMA wave passou de 95% — é ali que a incerteza mora');
  });

  s.teste('a run que morre PARA na wave alcançada, e guarda o que farmou', () => {
    /* §7.22.8, e é regra herdada do 1.7b: um idle que castiga o jogador por
       estar ausente está castigando o jogador por usar o produto como ele foi
       feito. Falhar custa o BAÚ, nunca o farm.

       ── E ESTE TESTE OLHAVA UMA RUN SÓ, O QUE NÃO BASTA ────────────────
       A primeira versão pegava a PRIMEIRA run que falhasse depois da wave 1 e
       afirmava sobre ela. O Q2 mostrou o furo: a sabotagem que apaga o saque a
       cada derrota passou VERDE, porque a run sorteada terminou numa VITÓRIA
       — o HP acaba tanto ganhando quanto perdendo — e ali o saque sobrevivia.

         > Uma amostra de um não fala sobre a regra; fala sobre a amostra. E
         > quando o caminho do defeito depende de como a run TERMINA, um
         > exemplo escolhido pela ordem é escolhido pelo acaso.

       Agora afirma sobre TODAS as runs que avançaram e caíram. */
    const elenco4 = elencoDoEstagio(kanto, 'floresta', 4);
    const caidas = [];
    for (let i = 0; i < 400; i++) {
      const r = simularAvanco(dado(i * 1103515245), {
        elenco: elenco4, estagio: 4, equipe: [criatura(1, 195)] });
      if (!r.completou && r.waves > 1) caidas.push(r);
    }
    ok(caidas.length >= 5,
      `em 400 tentativas só ${caidas.length} run(s) avançaram e depois caíram`);
    for (const r of caidas) {
      ok(r.waves >= 2 && r.waves < WAVES,
        `a run caiu na wave ${r.waves}, e ela tem de parar ENTRE 2 e ${WAVES - 1}`);
      igual(r.hp, 0, 'a run falhou com HP acima de zero — parou por quê?');
      ok(r.abates.length > 0,
        `uma run que passou da wave ${r.waves - 1} e caiu não guardou abate ` +
        'nenhum — falhar custa o baú, nunca o farm');
    }
  });

  s.teste('a mesma semente devolve o mesmo avanço inteiro', () => {
    const a = simularAvanco(dado(99), { elenco: ELENCO, estagio: 1, equipe: [criatura(15)] });
    const b = simularAvanco(dado(99), { elenco: ELENCO, estagio: 1, equipe: [criatura(15)] });
    igual(JSON.stringify(a), JSON.stringify(b), 'duas runs com a mesma semente diferiram');
  });

  s.teste('elenco vazio ou entrada torta não derruba o motor', () => {
    /* Um save antigo pode citar um bioma que saiu do pack, e o A1 devolve elenco
       vazio para ele. Explodir aqui seria o jogo fechando na cara de quem
       voltou depois de uma semana. */
    const vazio = { comuns: [], chefes: [] };
    const c = composicaoDaWave(dado(), { elenco: vazio, wave: 1 });
    ok(Array.isArray(c), 'a composição de um elenco vazio não devolveu lista');
    const r = resolverWave(dado(), { elenco: vazio, wave: 1, estagio: 1, hp: 50, equipe: [] });
    ok(Number.isFinite(r.dano) && Number.isFinite(r.hpFinal),
      'a wave de um elenco vazio devolveu número inválido');
    ok(Number.isFinite(simularAvanco(dado(), { elenco: vazio, estagio: 1, equipe: [] }).waves),
      'o avanço de um elenco vazio não terminou com número');
  });


  /* ═══ O VÍNCULO SAIU DO COMBATE — decisão do dono, 09/09/2026 ═══════════
   *
   *   > "tiro os +25% e o painel, e ele vai INTEIRO para a Gen 2 junto com a
   *   >  evolução?"  — "mas é necessário alguma outra forma de se visualizar o
   *   >  futuro foco do pokémon que é escolhido no lv 12"
   *
   * ── POR QUE ELE ESTAVA ERRADO ONDE ESTAVA ───────────────────────────────
   *
   * Eu liguei o vínculo ao poder no A2 e só notei no A4 que ele é INVISÍVEL: o
   * jogador entrava na wave com até 25% a mais de força e não tinha como saber
   * por quê. A correção que eu fiz foi mostrá-lo — e isso pôs mais um painel
   * numa tela que ele já tinha achado confusa.
   *
   *   > A decisão dele desfaz o nó em vez de decorá-lo: o vínculo é a chave da
   *   > evolução por afinidade, e Kanto não tem nenhuma. Ele vai inteiro para
   *   > a Gen 2 — a evolução E o combate —, e a tela ganha uma coluna a menos.
   *
   * O que FICA é o FOCO, que é escolhido no nível 12 e que o jogador precisa
   * poder ver antes de escolher.
   */
  s.teste('o vínculo NÃO entra mais no poder de combate', () => {
    const base = { forca: 100, nivel: 10, vinculo: 0 };
    const cheio = { forca: 100, nivel: 10, vinculo: 255 };
    igual(poderDaEquipe([base]), poderDaEquipe([cheio]),
      'o vínculo ainda muda o poder. Ele foi INTEIRO para a Gen 2 por decisão ' +
      'do dono em 09/09 — a evolução por afinidade e o efeito de combate juntos');
  });

  s.teste('e o FOCO continua valendo, porque ele é o que fica', () => {
    /* O `guia` sempre foi o único foco de combate — a tabela dele diz
       `aliados: 0.25`. Tirar o vínculo não pode levá-lo junto. */
    const so = [{ forca: 100, nivel: 10 }, { forca: 100, nivel: 10 }];
    const comGuia = [{ forca: 100, nivel: 10, foco: 'guia' }, { forca: 100, nivel: 10 }];
    ok(poderDaEquipe(comGuia) > poderDaEquipe(so),
      'o guia deixou de valer junto com o vínculo — ele é o único foco de ' +
      'combate, e é o que o jogador escolhe no nível 12');
  });

  /* ══ QUATRO POR WAVE, E O CHEFE É UM SÓ (L-169 e L-170) ═══════════════
   *
   * Duas decisões do dono, na mesma mensagem, e elas mudam a mesma função:
   *
   *   > "To achando também que 6 Pokémon por wave está muito, vamos reduzir
   *   >  para 4 por wave."
   *   > "no final podem vir os boss em forma de luta 1x1, porém coloca exemplo
   *   >  primeiro mapa beedrill e butterfree, como um boss só, ele é mais
   *   >  difícil (…) Essa questão de aparecer um ou outro vai ocorrer de forma
   *   >  RNG."
   *
   * ── POR QUE ELAS SÃO A MESMA DECISÃO ────────────────────────────────
   *
   * A wave encurtou para 45–90 s no item 5, e passou a espremer seis duelos
   * nesse tempo — foi isso que produziu o D-084, o soco único de -100. Quatro
   * é o outro lado daquela correção, e não uma troca dela.
   *
   * E o chefe deixando de ser uma leva de quatro é o que dá ao FIM do estágio
   * uma forma diferente do meio: nove waves de fila, e uma de duelo. */
  s.teste('a wave comum traz QUATRO, e em duas espécies', () => {
    igual(MOBS_POR_WAVE, 4,
      `a wave traz ${MOBS_POR_WAVE} selvagens. O dono pediu quatro: com a wave ` +
      'em 45–90 s, seis duelos viram socos únicos — foi o D-084');

    const comp = composicaoDaWave(rngTeste(3), { elenco: ELENCO, wave: 1, estagio: 1 });
    igual(comp.reduce((a, x) => a + x.quantos, 0), MOBS_POR_WAVE,
      'a composição não soma o total declarado — a tela mostraria um número e ' +
      'o motor resolveria outro');
    igual(comp.length, 2,
      'a wave comum deixou de trazer duas espécies. Uma só é monótona numa ' +
      'tela que fica aberta por horas, e reconhecer o bicho é o ponto');
  });

  /* ── O CHEFE É UM, E É SORTEADO ──────────────────────────────────────
     "Essa questão de aparecer um ou outro vai ocorrer de forma RNG" — e é o
     RNG que faz duas runs do mesmo lugar terem finais diferentes. */
  s.teste('a wave do chefe é 1x1, e QUAL chefe é sorteado', () => {
    igual(MOBS_DO_CHEFE, 1,
      `a wave do chefe traz ${MOBS_DO_CHEFE}. O dono pediu 1x1: é o único ` +
      'momento em que a wave para de ser fila e vira duelo');

    const vistos = new Set();
    for (let semente = 1; semente <= 60; semente++) {
      const comp = composicaoDaWave(rngTeste(semente),
        { elenco: ELENCO, wave: WAVES, estagio: 1 });
      igual(comp.length, 1,
        `a wave do chefe trouxe ${comp.length} espécies — ela não é 1x1`);
      igual(comp[0].quantos, 1,
        `o chefe veio em ${comp[0].quantos} cópias — 1x1 quer dizer UM`);
      ok((ELENCO.chefes ?? []).some(x => x.dex === comp[0].dex),
        `o chefe sorteado (dex ${comp[0].dex}) não é um dos chefes do estágio`);
      vistos.add(comp[0].dex);
    }
    ok(vistos.size > 1,
      `em 60 sementes saiu sempre o mesmo chefe (dex ${[...vistos][0]}). O RNG ` +
      'é o que faz duas runs do mesmo lugar terem finais diferentes — sem ele ' +
      'o "um ou outro" que o dono pediu não existe');
  });

  /* ── E ELE É MAIS DIFÍCIL, PELO MOTOR ────────────────────────────────
     Chefe com a mesma ameaça de um comum, anunciado com nome no meio da tela,
     é a tela prometendo o que o motor não entrega. Um sozinho tem de pesar
     mais que os quatro da rotina, senão o fim do estágio é o momento MAIS
     fácil dele. */
  s.teste('o chefe sozinho pesa MAIS que a wave de quatro', () => {
    const rotina = ameacaDa({ elenco: ELENCO, wave: 1, estagio: 1 });
    const chefe = ameacaDa({ elenco: ELENCO, wave: WAVES, estagio: 1 });
    ok(chefe > rotina,
      `o chefe pesa ${chefe.toFixed(1)} e a rotina ${rotina.toFixed(1)}. Um ` +
      'chefe mais fácil que a wave comum faz o fim do estágio ser o momento ' +
      'mais tranquilo dele — e o anúncio no meio da tela viraria piada');
    ok(chefe >= rotina * 1.25,
      `o chefe pesa só ${(chefe / rotina).toFixed(2)}× a rotina. "Mais difícil" ` +
      'que ninguém sente não é mais difícil');
  });

  return s;
}
