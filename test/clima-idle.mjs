/* Q1/Q2/Q3 · O CLIMA DO AVANÇO — a L-119, bloco 1.32.
 *
 * O que o dono pediu, e a frase inteira importa:
 *
 *   > "o clima sol forte no iddle pode aumentar em 2.5% de xp a mais no farm da
 *   >  rota isso usando um Pokémon de fogo obvio [...] o player precisa sentir
 *   >  a 'melhoria' do buff na prática"
 *
 * Duas exigências no mesmo pedido, e elas puxam para lados opostos: o bônus tem
 * de ser SENTIDO e não pode quebrar a economia. É por isso que este arquivo
 * mede a curva inteira, e não um número.
 *
 * ── A REGRA QUE ELE NOMEOU ───────────────────────────────────────────────
 *
 *   > **O que importa é o Pokémon ENVIADO, não o que aparece na cena.**
 *
 * É a primeira asserção daqui, e a mais importante: sem ela o bônus vira
 * sorteio sobre sorteio e não há decisão nenhuma para o jogador tomar.
 */
import { criarSuite, ok, igual, dentro } from './harness.mjs';
import { CANAIS, PASSO_MIN, PASSO_MAX, FRACAO_REF, PASSO_BASE,
         coberturaDo, passoDoClima, sortearClimaIdle, climaPorChave,
         quemAproveita, bonusDoClima, aplicarClima } from '../engine/clima-idle.mjs';
import { PESO_DA_VAGA } from '../engine/wave.mjs';
import { rngTeste } from './harness.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { TIPOS, ehTipo, quantasDe, particulasDe, veuDe, MAX_POR_TIPO }
  from '../app/modules/clima-particulas.mjs';
import { falaDoClima, linhaDoLogDoClima, porCento, ROTULO_DO_CANAL,
         climaDaRun, RAMO } from '../app/modules/avanco-clima.mjs';

/* Um elenco de mentira, com raridades escolhidas: 10 comuns de `folha`, 2 de
   `gelo`. É o contraste do pedido do dono — o tipo que todo mundo tem contra o
   que quase ninguém tem. */
const ELENCO = [
  ...Array.from({ length: 10 }, (_, i) => ({ dex: i + 1, t: ['folha'] })),
  { dex: 11, t: ['gelo'] }, { dex: 12, t: ['gelo', 'folha'] },
];
const DO_FOLHA = { key: 'seco',  w: 10, name: 'Seco',  tipos: ['folha'], rende: 'xp',    desc: '.' };
const DO_GELO  = { key: 'neve',  w: 1,  name: 'Neve',  tipos: ['gelo'],  rende: 'moeda',
                   desc: 'Quem é de Gelo traz mais moeda desta run.' };
const NEUTRO   = { key: 'nada',  w: 40, name: 'Nada',  tipos: [],        rende: null,    desc: '.' };

export function suite() {
  const s = criarSuite('clima-idle');

  /* ══ A REGRA DO DONO ═══════════════════════════════════════════════════ */
  s.teste('só paga a criatura ENVIADA, e não a que aparece na cena', () => {
    const equipe = [{ t: ['gelo'] }];
    const b = bonusDoClima(DO_GELO, { equipe, especies: ELENCO });
    ok(b.fator > 1, 'quem foi à run é do tipo do clima e não recebeu nada');
    igual(b.quantos, 1, 'contou errado quem aproveita');

    /* A cena está cheia de `gelo` — e ela não paga um centavo. */
    const semNinguem = bonusDoClima(DO_GELO, { equipe: [{ t: ['folha'] }], especies: ELENCO });
    igual(semNinguem.fator, 1,
      'a equipe não tem ninguém do tipo e o clima pagou assim mesmo. O dono foi ' +
      'literal: "o que importa é o Pokémon ENVIADO, não o que aparece na cena" — ' +
      'senão o bônus é sorteio sobre sorteio, e não há decisão para tomar');
  });

  /* ══ O QUANTO SAI DA RARIDADE, E NÃO DE UMA TABELA ═════════════════════ */
  s.teste('tipo raro paga MAIS que tipo comum, sem exceção escrita', () => {
    const comum = passoDoClima(coberturaDo(ELENCO, ['folha']), ELENCO.length);
    const raro  = passoDoClima(coberturaDo(ELENCO, ['gelo']),  ELENCO.length);
    ok(raro > comum,
      `o tipo raro (${raro.toFixed(3)}) não paga mais que o comum (${comum.toFixed(3)}). ` +
      `O dono levantou o Gelo, que tem 4 espécies de 146 — e a resposta não é ` +
      `escrever um número maior na linha dele: é o número SAIR da raridade, ` +
      `para que ninguém precise reescrever a tabela quando o elenco mudar`);
  });

  s.teste('o passo tem piso e teto, e os dois têm razão de existir', () => {
    /* Um tipo que TODO MUNDO tem ainda paga alguma coisa: bônus que zera é
       linha morta no cartão, e o jogador aprende a não ler a linha. */
    igual(passoDoClima(1000, 1000), PASSO_MIN, 'o tipo universal não caiu no piso');
    /* E um tipo de uma espécie só não paga uma run inteira. */
    igual(passoDoClima(1, 100000), PASSO_MAX, 'o tipo quase inexistente estourou o teto');
    ok(PASSO_MIN < PASSO_MAX, 'o piso não é menor que o teto');
  });

  s.teste('a referência é o tipo que cobre um décimo do elenco', () => {
    /* Sem esta âncora, mexer no PASSO_BASE moveria a curva inteira sem que
       ninguém soubesse em relação a quê. */
    dentro(passoDoClima(10, 100), PASSO_BASE, 1e-9,
      `um tipo com ${FRACAO_REF * 100}% do elenco tem de pagar exatamente o ` +
      `PASSO_BASE — é a âncora da curva`);
  });

  /* ══ A VAGA EXTRA RENDE MENOS, PELA MESMA RÉGUA DO COMBATE ═════════════ */
  s.teste('levar quatro do tipo não paga quatro vezes', () => {
    const quatro = [{ t: ['gelo'] }, { t: ['gelo'] }, { t: ['gelo'] }, { t: ['gelo'] }];
    const um = bonusDoClima(DO_GELO, { equipe: [quatro[0]], especies: ELENCO });
    const b = bonusDoClima(DO_GELO, { equipe: quatro, especies: ELENCO });
    const soma = PESO_DA_VAGA.reduce((a, x) => a + x, 0);
    dentro(b.peso, soma, 1e-9,
      `o peso de quatro do tipo é ${b.peso}, e o PESO_DA_VAGA soma ${soma}. ` +
      `O bônus usa a MESMA régua que o poder da equipe — duas réguas para ` +
      `"levar mais do mesmo" seriam duas coisas para o jogador aprender`);
    ok(b.fator < 1 + (um.fator - 1) * 4,
      'quatro do tipo pagaram quatro vezes um. É o "surreal e quebrado" que o ' +
      'dono cortou quando o poder da equipe foi calibrado');
  });

  s.teste('a ORDEM da equipe decide o peso, porque a vaga decide', () => {
    const naFrente = bonusDoClima(DO_GELO,
      { equipe: [{ t: ['gelo'] }, { t: ['folha'] }], especies: ELENCO });
    const atras = bonusDoClima(DO_GELO,
      { equipe: [{ t: ['folha'] }, { t: ['gelo'] }], especies: ELENCO });
    ok(naFrente.fator > atras.fator,
      'a criatura do tipo na 1ª vaga rendeu igual à mesma na 2ª — o peso da ' +
      'vaga deixou de valer, e com ele a decisão de QUEM vai na frente');
  });

  /* ══ O NEUTRO, E A FORMA ÚNICA ═════════════════════════════════════════ */
  s.teste('o neutro devolve a MESMA forma, e não um buraco', () => {
    const b = bonusDoClima(NEUTRO, { equipe: [{ t: ['gelo'] }], especies: ELENCO });
    igual(b.fator, 1, 'o neutro pagou alguma coisa');
    igual(b.canal, null, 'o neutro tem canal');
    igual(b.quantos, 0, 'o neutro contou alguém');
    /* Quem lê não precisa de um `if` para saber se há bônus: o cartão do aviso
       diz "nada aqui" com os mesmos campos com que diria "+18% de XP". */
    for (const k of ['canal', 'fator', 'passo', 'quantos', 'peso'])
      ok(k in b, `o neutro não traz o campo \`${k}\` — quem desenha o aviso ` +
        `passaria a precisar de dois caminhos para a mesma linha`);
  });

  s.teste('clima com canal desconhecido não paga nada', () => {
    const torto = { key: 'x', w: 1, name: 'X', tipos: ['gelo'], rende: 'sorte', desc: '.' };
    igual(bonusDoClima(torto, { equipe: [{ t: ['gelo'] }], especies: ELENCO }).fator, 1,
      'um canal que o motor não conhece pagou assim mesmo — um save adulterado ' +
      'ou um pack de terceiro viraria multiplicador livre');
  });

  /* ══ O RITMO DIVIDE, E ISSO É O CONTRÁRIO DOS OUTROS QUATRO ════════════ */
  s.teste('o ritmo DIVIDE: render mais é durar menos', () => {
    const b = { canal: 'ritmo', fator: 1.2, passo: 0, quantos: 1, peso: 1 };
    ok(aplicarClima(100, b, 'ritmo') < 100,
      'o bônus de ritmo deixou a wave mais LONGA. `ritmo` é a duração, então ' +
      '"render mais" ali quer dizer "durar menos" — multiplicar faria a Chuva ' +
      'deixar o farm mais lento, exatamente o contrário do pedido');
    dentro(aplicarClima(120, b, 'ritmo'), 100, 1e-9, 'a divisão não bate');
  });

  s.teste('os outros quatro MULTIPLICAM', () => {
    for (const canal of CANAIS.filter(c => c !== 'ritmo')) {
      const b = { canal, fator: 1.5, passo: 0, quantos: 1, peso: 1 };
      igual(aplicarClima(100, b, canal), 150, `o canal ${canal} não multiplicou`);
    }
  });

  s.teste('o canal errado não encosta no número', () => {
    const b = { canal: 'xp', fator: 2, passo: 0, quantos: 1, peso: 1 };
    igual(aplicarClima(100, b, 'moeda'), 100,
      'um bônus de XP mexeu na moeda — um clima pagaria em todos os canais de ' +
      'uma vez, e a escolha entre climas deixaria de existir');
  });

  /* ══ O SORTEIO ═════════════════════════════════════════════════════════ */
  s.teste('o sorteio respeita o peso, e o neutro é o mais provável', () => {
    const lista = [NEUTRO, DO_FOLHA, DO_GELO];
    const r = rngTeste(7);
    const conta = {};
    for (let i = 0; i < 4000; i++) {
      const c = sortearClimaIdle(r, lista);
      conta[c.key] = (conta[c.key] ?? 0) + 1;
    }
    const total = 4000, soma = 51;
    dentro(conta.nada / total, 40 / soma, 0.03, 'o neutro não saiu no peso dele');
    dentro(conta.neve / total, 1 / soma, 0.02, 'o clima raro não saiu no peso dele');
    ok(conta.nada > conta.seco && conta.seco > conta.neve,
      'a ordem de frequência não segue a dos pesos');
    /* "o clima da run é RNG, e não acontece sempre" — o neutro é a maior fatia
       de propósito: um bônus que cai toda run vira a linha de base, e aí não
       há melhoria nenhuma para sentir. */
    ok(conta.nada / total > 0.5,
      'o neutro saiu em menos da metade das runs; o bônus virou o normal');
  });

  s.teste('lista vazia ou sem peso devolve null, e não estoura', () => {
    igual(sortearClimaIdle(() => 0.5, []), null, 'lista vazia não devolveu null');
    igual(sortearClimaIdle(() => 0.5, [{ key: 'a', w: 0 }]), null, 'peso zero entrou no sorteio');
    igual(climaPorChave([], 'x'), null, 'busca em lista vazia não devolveu null');
  });

  /* ══ E O PACK DE VERDADE ═══════════════════════════════════════════════ */
  s.teste('todo clima do pack favorece um tipo que EXISTE no elenco', () => {
    for (const c of kanto.climaIdle ?? []) {
      if (!c.rende) continue;
      const cob = coberturaDo(kanto.especies, c.tipos);
      ok(cob > 0,
        `o clima "${c.key}" favorece ${c.tipos.join('/')} e nenhuma espécie do ` +
        `elenco tem esse tipo. Um bônus impossível de conquistar ensina o ` +
        `jogador a ignorar a linha do clima inteira`);
    }
  });

  s.teste('a curva do pack é SENTIDA e não quebra a economia', () => {
    /* O dono propôs 2,5%. Dois e meio por cento não se sente — ele mesmo pediu
       que se sentisse, e as duas metades do pedido puxam para lados opostos.
       A faixa abaixo é a resposta: de 2 a 6 vezes o número dele com equipe
       cheia, e nunca perto de dobrar a run. */
    const cheia = c => {
      const passo = passoDoClima(coberturaDo(kanto.especies, c.tipos), kanto.especies.length);
      return passo * PESO_DA_VAGA.reduce((a, x) => a + x, 0);
    };
    const comBonus = (kanto.climaIdle ?? []).filter(c => c.rende);
    ok(comBonus.length >= 5, 'o pack tem menos de cinco climas que rendem');
    for (const c of comBonus) {
      const g = cheia(c);
      ok(g >= 0.08, `o clima "${c.key}" paga só ${(g * 100).toFixed(1)}% com equipe ` +
        `cheia — abaixo de 8% o jogador não sente, e o pedido era justamente sentir`);
      ok(g <= 0.40, `o clima "${c.key}" paga ${(g * 100).toFixed(1)}% com equipe cheia. ` +
        `Acima de 40% a run com clima vale mais que duas sem, e o clima deixa de ` +
        `ser tempero para virar o eixo do farm`);
    }
    /* E o mais raro tem de pagar visivelmente mais que o mais comum, senão a
       raridade não está fazendo trabalho nenhum. */
    const ganhos = comBonus.map(cheia).sort((a, b) => a - b);
    ok(ganhos[ganhos.length - 1] > ganhos[0] * 1.5,
      `o melhor clima paga ${(ganhos[ganhos.length - 1] * 100).toFixed(0)}% e o pior ` +
      `${(ganhos[0] * 100).toFixed(0)}% — sem uma diferença real, sair Nevasca ` +
      `não é acontecimento nenhum`);
  });

  s.teste('tipo duplo conta UMA vez na cobertura', () => {
    /* A Tempestade cobre terra E pedra, e há espécies que são as duas. Contar
       duas vezes inflaria a cobertura e derrubaria o passo — o clima pagaria
       menos do que devia por uma soma errada. */
    const dobrado = coberturaDo(ELENCO, ['gelo', 'folha']);
    ok(dobrado <= ELENCO.length,
      `a cobertura deu ${dobrado} num elenco de ${ELENCO.length} — alguém foi ` +
      `contado duas vezes`);
    igual(dobrado, 12, 'a união dos dois tipos não bate');
  });

  /* ══ AS PARTÍCULAS — a metade que o dono chamou de regra ══════════════
   *
   *   > "a chuva na tela é a mesma chuva que mexe no farm"
   *
   * Uma chuva que altera um número invisível é exatamente a crítica que
   * originou o §7.22 — *"você literalmente não vê NADA acontecendo"*. Estas
   * asserções existem porque a posição de uma partícula é o tipo de conta que
   * normalmente só o olho confere, e o que só o olho confere acaba conferido
   * por ninguém. */
  s.teste('toda partícula nasce DENTRO da janela', () => {
    for (const tipo of TIPOS) {
      for (const [W, H] of [[403, 207], [130, 207], [900, 520]]) {
        for (const t of [0, 137, 4321, 60_000, 3_600_000]) {
          for (const p of particulasDe(tipo, t, W, H)) {
            ok(Number.isFinite(p.x) && Number.isFinite(p.y),
              `${tipo} devolveu NaN em t=${t} — e \`drawImage\`/\`arc\` com NaN não ` +
              `desenha e não avisa, que é a falha mais silenciosa que existe`);
            /* Uma folga de uma partícula inteira: ela ENTRA e SAI pela borda,
               e cortar isso faria a chuva nascer no meio do ar. */
            const folga = Math.max(4, p.r * 2 + 2);
            ok(p.x >= -folga && p.x <= W + folga,
              `${tipo} em t=${t}: x=${p.x.toFixed(1)} fora de [0,${W}] com folga ${folga.toFixed(1)}`);
            ok(p.y >= -folga && p.y <= H + folga,
              `${tipo} em t=${t}: y=${p.y.toFixed(1)} fora de [0,${H}] com folga ${folga.toFixed(1)}`);
          }
        }
      }
    }
  });

  s.teste('a chuva ANDA, e volta ao topo em vez de sumir', () => {
    const um = particulasDe('chuva', 0, 400, 200);
    const dois = particulasDe('chuva', 120, 400, 200);
    ok(um.length > 0, 'não nasceu chuva nenhuma');
    ok(um.some((p, i) => Math.abs(p.y - dois[i].y) > 0.5),
      'nenhuma gota mudou de lugar em 120 ms — a chuva está congelada, e cena ' +
      'parada lê como imagem de fundo, não como clima');
    /* E depois de uma hora ela continua caindo, e não empilhada no rodapé. */
    const tarde = particulasDe('chuva', 3_600_000, 400, 200);
    ok(tarde.some(p => p.y < 60),
      'uma hora depois não há gota na metade de cima — o laço não está ' +
      'recomeçando, e a tela esvazia sozinha numa aba que fica aberta por horas');
  });

  s.teste('a densidade acompanha o tamanho da janela', () => {
    /* A L-175 mediu: 403x207 no panorâmico e 130x207 no estreito. Com número
       absoluto, a mesma chuva vira garoa num e temporal no outro. */
    const largo = quantasDe('chuva', 403, 207);
    const estreito = quantasDe('chuva', 130, 207);
    ok(largo > estreito,
      `a janela larga tem ${largo} gotas e a estreita ${estreito} — com número ` +
      `absoluto a mesma chuva vira temporal na tela pequena`);
    ok(quantasDe('chuva', 4000, 2000) <= MAX_POR_TIPO,
      'uma janela enorme estourou o teto de partículas — a cena vira sopa e o ' +
      'jogador perde de vista o que veio ver');
    igual(quantasDe('nada', 400, 200), 0, 'um tipo desconhecido gerou partícula');
  });

  s.teste('a mesma janela no mesmo instante dá a MESMA cena', () => {
    /* Sem isto o portão visual reprovaria a si mesmo a cada execução. É a
       lição que já está escrita no `test/visual.mjs`: linha de base que
       depende do relógio não é linha de base, é sorte. */
    const a = particulasDe('neve', 5000, 400, 200);
    const b = particulasDe('neve', 5000, 400, 200);
    igual(JSON.stringify(a), JSON.stringify(b),
      'duas chamadas no mesmo instante deram cenas diferentes — há sorteio ' +
      'aleatório aqui, e o portão visual passa a reprovar sozinho');
  });

  s.teste('o sol não cai, e o vento atravessa', () => {
    const sol = particulasDe('sol', 0, 400, 200);
    const solDepois = particulasDe('sol', 2000, 400, 200);
    ok(sol.every((p, i) => p.y === solDepois[i].y),
      'o sol desceu. Ele é luz, não corpo — sol chovendo é o tipo de coisa que ' +
      'ninguém revisa e todo mundo vê');
    const v1 = particulasDe('vento', 0, 400, 200);
    const v2 = particulasDe('vento', 400, 400, 200);
    ok(v1.some((p, i) => Math.abs(p.x - v2[i].x) > 1),
      'a rajada de vento não andou na horizontal');
  });

  s.teste('todo clima que rende tem véu e tipo de desenho', () => {
    for (const c of kanto.climaIdle ?? []) {
      if (!c.rende) continue;
      ok(ehTipo(c.fx),
        `o clima "${c.key}" rende ${c.rende} e o \`fx\` dele ("${c.fx}") não é um ` +
        `tipo de desenho. O pack escolhe do vocabulário do app; sem isso o ` +
        `bônus acontece e a tela não muda — que é a crítica que originou o §7.22`);
      ok(veuDe(c.fx), `o tipo "${c.fx}" não tem véu de cor. As partículas sozinhas ` +
        `são fáceis de não notar; o véu é o que faz o clima ser sabido de relance`);
    }
  });

  /* ══ A FALA — três estados, e o do meio é o que ensina ═════════════════ */
  s.teste('a fala do clima cobre os três estados', () => {
    const especies = ELENCO;
    const nada = falaDoClima({ clima: NEUTRO, bonus: bonusDoClima(NEUTRO, { equipe: [], especies }), gracas: [] });
    igual(nada.estado, 'nenhum', 'o neutro não caiu no estado "nenhum"');
    igual(nada.pct, 0, 'o neutro anunciou porcentagem');

    /* O ESTADO OCIOSO é o mais valioso dos três: caiu um clima que paga, e
       ninguém da equipe é do tipo. Ele ensina a próxima escolha de equipe —
       e por isso a frase tem de dizer PARA QUEM o bônus seria. */
    const equipeErrada = [{ t: ['folha'] }];
    const b1 = bonusDoClima(DO_GELO, { equipe: equipeErrada, especies });
    const ocioso = falaDoClima({ clima: DO_GELO, bonus: b1, gracas: [] });
    igual(ocioso.estado, 'ocioso', 'ninguém aproveita e o estado não é "ocioso"');
    ok(/Gelo/.test(ocioso.frase),
      `a frase do clima ocioso é "${ocioso.frase}" e não diz PARA QUEM o bônus ` +
      `seria. "Ninguém aproveita" sozinho não ensina nada — e o texto tem de ` +
      `vir do \`desc\` do PACK, porque nome de tipo é tema: montá-lo aqui com ` +
      `as chaves internas produziu "para quem é water", e só a foto contou`);

    const equipeCerta = [{ t: ['gelo'], nome: 'Lapras' }];
    const b2 = bonusDoClima(DO_GELO, { equipe: equipeCerta, especies });
    const ativo = falaDoClima({ clima: DO_GELO, bonus: b2, gracas: equipeCerta });
    igual(ativo.estado, 'ativo', 'a equipe aproveita e o estado não é "ativo"');
    ok(ativo.pct > 0, 'o clima ativo anunciou 0%');
    ok(/Lapras/.test(ativo.frase),
      `a frase "${ativo.frase}" não diz GRAÇAS A QUEM. Um "+18%" sem dono não ` +
      `ensina nada sobre a próxima escolha de equipe`);
    ok(new RegExp(ROTULO_DO_CANAL[b2.canal]).test(ativo.frase),
      `a frase não diz em que canal o bônus paga`);
  });

  s.teste('a linha do log diz o ABSOLUTO quando existe um', () => {
    /* O pedido do dono, na forma dele: "+52 por buff de clima: Vendaval".
       Bônus que não aparece não é bônus — é ruído no gerador de números. */
    const linha = linhaDoLogDoClima({
      clima: { nome: 'Vendaval', canal: 'moeda', fator: 1.15, quantos: 2,
               ganhou: { xp: 0, moedas: 52 } },
    }, { moeda: 'moeda' });
    ok(/\+52 moeda/.test(linha), `a linha saiu "${linha}" e não traz o "+52"`);
    ok(/Vendaval/.test(linha), 'a linha não nomeia o clima');

    /* E quando o canal não tem absoluto — material, item raro, ritmo — ele diz
       a PORCENTAGEM. Inventar um "+52" ali seria número bonito e falso, que é
       exatamente o D-087. */
    const pct = linhaDoLogDoClima({
      clima: { nome: 'Nevasca', canal: 'itemRaro', fator: 1.3, quantos: 4, ganhou: {} },
    });
    ok(/\+30%/.test(pct), `a linha de canal sem absoluto saiu "${pct}"`);
    ok(/item raro/.test(pct), 'a linha não diz em que o bônus caiu');

    igual(linhaDoLogDoClima({ clima: null }), null, 'sem clima a linha não é null');
    igual(linhaDoLogDoClima({ clima: { nome: 'X', canal: 'xp', quantos: 0 } }), null,
      'um clima que ninguém aproveitou gerou linha de log — o jogador leria ' +
      'que ganhou algo que não ganhou');
  });

  s.teste('o porcento é o que a tela mostra, arredondado', () => {
    igual(porCento({ fator: 1.181 }), 18, 'o arredondamento não bate com a tela');
    igual(porCento({ fator: 1 }), 0, 'o neutro não deu zero');
    igual(porCento(null), 0, 'sem bônus não deu zero');
  });

  /* ══ O CLIMA É DERIVADO DA RAIZ — e o Q2 mostrou que ninguém dizia isso ══
   *
   * O defeito plantado S988 troca `semente(derivar(run.raiz, RAMO))` por
   * `Math.random` e ESCAPOU do portão inteiro. Nenhuma das dezoito asserções
   * deste arquivo olhava para de onde o sorteio vem — todas mediam o que ele
   * paga DEPOIS de escolhido.
   *
   *   > Eu tinha testado a aritmética do bônus com cuidado e deixado a
   *   > PROCEDÊNCIA dele sem uma linha. O §P3 é a regra mais antiga do motor,
   *   > e foi a que ficou sem guarda.
   *
   * O que o furo custaria: o clima trocaria a cada repintura — sessenta tempos
   * por segundo na mesma run —, e o cartão, o log e a colheita discordariam
   * entre si sobre o que aconteceu. */
  s.teste('o clima sai da RAIZ da run, e não do relógio', () => {
    const run = { raiz: 'uma-raiz-qualquer' };
    const um = climaDaRun(kanto, run);
    ok(um, 'a run com raiz não recebeu clima nenhum');
    /* Vinte leituras seguidas. Com `Math.random` no lugar da semente, a chance
       de as vinte coincidirem é (1/8)^19 — e o neutro, que é a mais provável,
       tem 40%: 0,4^19 é um em 26 milhões. */
    for (let i = 0; i < 20; i++)
      igual(climaDaRun(kanto, run).key, um.key,
        'duas leituras da MESMA run deram climas diferentes. O clima é ' +
        'DERIVADO da raiz (§P3) e não é guardado no save — se ele for ' +
        'sorteado de novo a cada chamada, a tela troca de tempo sessenta ' +
        'vezes por segundo, e o cartão, o log e a colheita passam a discordar ' +
        'sobre o que aconteceu na mesma run');

    /* E raízes diferentes dão climas diferentes — senão a "derivação" seria
       uma constante disfarçada, que passaria no teste acima sem sorteio nenhum. */
    const chaves = new Set();
    for (let i = 0; i < 200; i++) chaves.add(climaDaRun(kanto, { raiz: 'r' + i }).key);
    ok(chaves.size >= 4,
      `200 raízes diferentes deram só ${chaves.size} clima(s). O sorteio virou ` +
      `constante — e uma constante passa no teste de determinismo sem sortear nada`);
  });

  s.teste('sem raiz ou sem lista, não há clima — e não há exceção', () => {
    igual(climaDaRun(kanto, null), null, 'run inexistente devolveu clima');
    igual(climaDaRun(kanto, {}), null, 'run sem raiz devolveu clima');
    igual(climaDaRun({ especies: [] }, { raiz: 'x' }), null,
      'um pack SEM climaIdle devolveu clima — packs antigos continuam válidos, ' +
      'e o modo simplesmente não sorteia');
    ok(RAMO.length > 0, 'o ramo da semente está vazio');
  });

  return s;
}
