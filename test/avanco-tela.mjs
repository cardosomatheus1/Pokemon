/* Q1/Q5 · A TELA DO AVANÇO (bloco A4b, Spec §7.22).
 *
 * ── POR QUE ESTE TESTE LÊ CÓDIGO EM VEZ DE ABRIR NAVEGADOR ────────────────
 *
 * Mesma razão do `idle-tela.mjs`: o portão Q5 já abre a página e reprova em
 * qualquer `pageerror`, e uma captura de tela não vê nenhuma das quatro coisas
 * que podem dar errado aqui.
 *
 *   · a tela reimplementar uma regra do motor e divergir dele;
 *   · o cenário virar um SEGUNDO palco, com dois canvas do mesmo mundo;
 *   · o banner ou o vínculo sumirem do arranjo aprovado;
 *   · a cena passar a decidir alguma coisa.
 *
 * As três primeiras são o que o dono cobrou por escrito (L-147, L-145; a caixa
 * da L-149 entra no A4d, e ganha afirmação junto);
 * a última é a linha que o §7.22.16 traça.
 */
import { readFileSync, existsSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const HTML = ler('../app/index.html');

/* A tela é uma FAMÍLIA de arquivos, e não um arquivo — mesma lição do
   `idle-tela.mjs`: teste ancorado em nome de arquivo mede a organização, e
   não o produto. */
const FAMILIA = ['avanco-tela.mjs', 'avanco-painel.mjs', 'avanco-cena.mjs',
                 'avanco-estado.mjs', 'avanco-geometria.mjs',
                 /* A LEITURA DO FOCO saiu do painel para camada 0 no item 1 da
                    ordem do dono — ver o cabeçalho do `avanco-foco.mjs`. A
                    FAMÍLIA existe exatamente para isto: teste ancorado em nome
                    de arquivo mede a organização, e não o produto. */
                 'avanco-foco.mjs',
                 /* A COLUNA DA DIREITA saiu do  quando ele
                    passou de 600 linhas pela segunda vez — a mesma divisão
                    que a esquerda fez no A4g. */
                 'avanco-direita.mjs'];
/* A COLUNA DA ESQUERDA saiu do `avanco-tela.mjs` no A4g, quando ele passou de
   600 linhas. Os testes que falam de LEITURA — stamina, vínculo, log, análise
   — passam a ler dali, e é exatamente por isso que a FAMÍLIA existe: teste
   ancorado em nome de arquivo mede a organização, e não o produto. */
const painel = () => ler('../app/modules/avanco-painel.mjs');
const tela = () => FAMILIA.map(f => ler('../app/modules/' + f)).join('\n');

export function suite() {
  const s = criarSuite('avanco-tela');

  s.teste('os alvos do HTML existem, e o painel da run nasce escondido', () => {
    for (const id of ['idleRun', 'avTira', 'avRelogio', 'avOnde', 'avHp', 'avStamina',
                      'avBuffs', 'avLog', 'avResumo', 'avAcoes', 'avPalcoCena',
                      'avEquipe', 'avBolsa', 'battleBannerRun'])
      ok(HTML.includes(`id="${id}"`), `o HTML não tem #${id}, e a tela pinta nele`);
    ok(/id="idleRun"[^>]*hidden/.test(HTML),
      'o painel da run não nasce escondido — ele apareceria antes de existir run');
  });

  /* ── O BANNER É A IDENTIDADE DO JOGADOR — L-147 ────────────────────────
     Regra do dono, e ela vale para toda tela daqui em diante:

       > "o banner é a identidade do jogador, registre e armazene isso pra não
       >  esquecer mais"

     O teste existe porque o histórico dele é de SUMIR: construído duas vezes
     na trilha R, e eu desenhei a prévia do Avanço inteira sem ele. */
  s.teste('o banner do jogador está na tela da run, e é o MESMO da Arena', () => {
    ok(/id="battleBannerRun"[^>]*class="battle-banner"/.test(HTML),
      'o banner da run não usa a classe `battle-banner` — seria um segundo banner');
    ok(/id="battleBannerRun"[^>]*data-modo="idle"/.test(HTML),
      'o banner da run não declara o modo, e o desenhador não saberia o que pôr nele');
  });

  /* ══ A COLUNA MOSTRA O FOCO, E NÃO MAIS O VÍNCULO (item 1 da ordem) ════
   *
   * A L-145 construiu esta coluna para o VÍNCULO, e a razão era boa: ele
   * decidia combate desde o A2 — até +25% de poder — e não aparecia em lugar
   * nenhum da interface. Um número que muda a luta e que ninguém pode olhar é
   * a moldura vazia da L-099 pelo avesso.
   *
   * ── E AÍ O DONO TIROU O VÍNCULO DO COMBATE ──────────────────────────
   *
   *   > "O vínculo não ia ficar pra GEN 2? Porque ele aparece, tem muita coisa
   *   >  confusa, papo reto."
   *
   * `POR_VINCULO` foi a zero, e a coluna passou a mostrar uma barra que soma
   * **+0% de poder** — pior que não mostrar nada: ela ocupa a atenção de quem
   * assiste por horas para dizer que não faz diferença.
   *
   * ── O QUE ELE PEDIU NO LUGAR, e é o mesmo pedido ────────────────────
   *
   *   > "mas é necessário alguma outra forma de se visualizar o futuro foco do
   *   >  pokémon que é escolhido no lv 12"
   *
   * O foco é a única coisa da criatura que sai do JOGADOR — sorte, tempo e
   * escolha, e ele é a escolha. Ele decide o baú da run (trilheiro, sortudo) e
   * o poder (guia). É exatamente o que a coluna existe para dizer.
   *
   * ── E O "FUTURO" É A METADE QUE IMPORTA ─────────────────────────────
   *
   * Quem ainda não chegou ao nível 12 não tem foco, e a coluna precisa dizer
   * QUANDO ele chega — senão o jogador de nível 7 lê uma linha vazia e conclui
   * que aquilo não é para ele. */
  s.teste('a coluna da run mostra o FOCO, e o vínculo saiu do combate', () => {
    const t = painel();
    /* ── O IMPORT, E NÃO A PALAVRA ───────────────────────────────────────
       O comentário que explica a REMOÇÃO cita `POR_VINCULO` de propósito, e
       um teste que proíbe o nome proíbe explicar. É a mesma lição que o S929
       cobrou: a afirmação é sobre o que o autor ESCREVE como código. */
    ok(!/import[^;]*POR_VINCULO[^;]*;/.test(t),
      'a coluna ainda importa o POR_VINCULO. Ele foi para a Gen 2 junto com a ' +
      'evolução — e desde que ele é zero, a barra só dizia +0% de poder');
    ok(!/VINCULO_MAX/.test(t),
      'a barra de vínculo continua desenhada na coluna da run');
    ok(!/Foco e vínculo/i.test(HTML),
      'o título do painel ainda promete o vínculo — o rótulo é a primeira ' +
      'coisa que o olho lê, e ele estaria prometendo o que não está lá');

    /* E o FOCO entrou. Pela tabela do motor, e não por uma cópia: o nome e a
       cor de cada foco já existem em UM lugar, e um segundo os faria divergir
       na primeira vez que alguém renomeasse um. */
    const fam = tela();
    ok(/FALA/.test(fam),
      'a coluna não usa a tabela de fala do foco — ela teria nomes e cores ' +
      'próprios, e eles divergiriam dos do cartão da equipe');
    ok(/NIVEL_PARA_ESCOLHER|NIVEL_DO_FOCO/.test(fam),
      'a coluna não sabe em que nível o foco é escolhido, então não tem como ' +
      'dizer QUANDO ele chega — e era esse o pedido do dono');
  });

  /* O que a coluna DIZ é o que o foco vale AQUI. Dos cinco, dois são neutros
     no Avanço — o elenco do estágio é fixo em seis, então não há o que "achar
     mais". Uma coluna que promete o que não acontece é pior que uma vazia.

     A CONTA é afirmada no `test/foco.mjs`, sobre a função pura do motor; aqui
     se afirma que a coluna a USA em vez de ter a própria. É a mesma divisão
     que o S934 cobrou: conta que só existe dentro de camada 4 é conta que
     ninguém consegue verificar sem montar um DOM. */
  s.teste('o foco é explicado pelo que ele vale NA RUN, e pela conta do motor', () => {
    const t = tela();
    ok(/efeitoVivo\s*\(/.test(t),
      'a coluna não pergunta ao motor o que aquele foco faz aqui — ela ' +
      'anunciaria o efeito da EXPEDIÇÃO num lugar onde ele não acontece');
    ok(/PERFIL_DO_AVANCO/.test(t),
      'a coluna pergunta o efeito sem dizer em QUE perfil — e é o perfil que ' +
      'torna o Batedor e o Vigia neutros aqui');

    /* E ela declara o que está INERTE no Avanço. Sem isso, o custo de
       encontros do Trilheiro seria anunciado num modo em que o elenco é fixo
       em seis: um preço que a tela cobra e o motor não. */
    ok(/inertes\s*:/.test(t),
      'a coluna não declara o que está inerte no Avanço — ela cobraria do ' +
      'jogador um custo de encontros que o elenco fixo do estágio não cobra');
    ok(/'encontros'/.test(t),
      'os encontros não estão na lista de inertes, e o elenco do estágio é fixo');
  });

  /* ── O CENÁRIO É UM SÓ ─────────────────────────────────────────────────
     Dois canvas do mesmo mundo é a forma mais barata de eles mostrarem
     lugares diferentes. */
  s.teste('o palco do mundo é MOVIDO, e nunca duplicado', () => {
    igual((HTML.match(/id="idlePalco"/g) ?? []).length, 1,
      'existe mais de um #idlePalco no HTML');
    igual((HTML.match(/id="idleMundo"/g) ?? []).length, 1,
      'existe mais de um canvas de mundo');
    ok(/appendChild\(palco\)|destino\.appendChild/.test(tela()),
      'a tela não move o palco: ela desenharia a run sem cenário');
  });

  /* ── QUEM DESENHA NÃO DECIDE ───────────────────────────────────────────
     A linha do §7.22.16. Se a tela resolvesse a wave, existiriam duas runs. */
  s.teste('a tela não resolve wave nenhuma', () => {
    /* ── QUEM DESENHA E QUEM COLA SÃO DIFERENTES ─────────────────────────
       A primeira versão desta afirmação varria a FAMÍLIA inteira, e ela
       reprovou no A4c por um motivo justo: a colheita precisa derivar a
       semente do saque, como a colheita da expedição faz há dez blocos.

       A regra nunca foi "ninguém aqui toca em semente" — é "quem DESENHA não
       decide". O `avanco-estado.mjs` é camada 3, a cola: ele é exatamente o
       lugar de chamar o motor. As camadas 4 é que não podem.

         > Uma afirmação larga demais reprova o inocente, e o conserto é
         > apertá-la até o tamanho da regra — nunca afrouxá-la até sumir. */
    const desenham = ['avanco-tela.mjs', 'avanco-cena.mjs', 'avanco-geometria.mjs']
      .map(f => ler('../app/modules/' + f)).join('\n');
    for (const proibido of ['resolverWave', 'roteiroDaWave', 'composicaoDaWave', 'derivar('])
      ok(!desenham.includes(proibido),
        `quem DESENHA chama \`${proibido}\` — ela passaria a ter a própria versão da run`);

    /* E a cola não pode desenhar, que é a mesma linha vista do outro lado. */
    const cola = ler('../app/modules/avanco-estado.mjs');
    for (const proibido of ['document.', 'innerHTML', 'querySelector'])
      ok(!cola.includes(proibido),
        `a cola toca \`${proibido}\` — ela é camada 3 e não pode conhecer DOM`);
  });

  /* Mesma regra da aba do idle desde o 1.3c: o idle produz, a Arena consome. */
  s.teste('esta tela não sabe o que é dinheiro', () => {
    const t = tela();
    for (const proibido of ['carteira', 'apostar', 'saldo'])
      ok(!t.includes(proibido), `a tela do avanço fala de \`${proibido}\``);
  });

  /* ── AS OITO DIREÇÕES, UMA A UMA ───────────────────────────────────────
     Este teste nasceu de um defeito de verdade, achado ao reler o arquivo: a
     conta era `atan2(-dx, dy)`, e ela espelhava SEIS das oito. Duas acertavam
     por simetria — baixo e cima —, e é isso que faz o erro sobreviver a um
     olhar rápido: o bicho vindo de frente está certo, e o que vem pelo lado
     anda de costas.

     O projeto já pagou essa lição na Arena, e ela está escrita no
     `idle-companheiro.mjs`: espelhar um sprite põe a chama do rabo no lado
     errado. A folha do PMD TEM as oito, e usá-las trocadas é pior que não
     usá-las. */
  s.teste('a direção do sprite bate com o lado de onde o mob vem', async () => {
    const { linhaDe } = await import('../app/modules/avanco-geometria.mjs');
    const casos = [
      ['baixo', 0, 1, 0], ['baixo-dir', 1, 1, 1], ['direita', 1, 0, 2],
      ['cima-dir', 1, -1, 3], ['cima', 0, -1, 4], ['cima-esq', -1, -1, 5],
      ['esquerda', -1, 0, 6], ['baixo-esq', -1, 1, 7],
    ];
    for (const [nome, dx, dy, esperado] of casos)
      igual(linhaDe(dx, dy), esperado,
        `andando para ${nome} o sprite usa a linha errada da folha`);
    igual(linhaDe(0, 0), 0, 'parado, o mob tem de olhar para a frente');
  });

  /* ═══ A BATALHA QUE SE LÊ — bloco A4g ═══════════════════════════════════
   *
   * Terceira volta do dono na mesma tela, e ela vale a pena transcrever
   * inteira porque cada frase é um defeito com endereço:
   *
   *   > "as sprites de ataque não consigo ver ainda, eles se movimentam e
   *   >  aparece os balões porém não vejo a sprite de ataque"
   *   > "não consigo visualizar os ataques do meu pokémon"
   *   > "marcar o pokémon sendo usado com um ícone pequeno no balão dele"
   *   > "é necessário adicionar os hit box de dano '-13' '-35'"
   *
   * ── E EU MEDI ANTES DE MEXER, que é o método daqui ────────────────────
   *
   * As três primeiras coisas ESTAVAM no código e nenhuma chegava aos olhos:
   *
   *     a folha de ataque    carregava (896 px de largura, `complete=true`) e
   *                          era pintada POR CIMA da de caminhada — o bicho
   *                          aparecia DUAS vezes sobreposto, e o que se lia
   *                          era um borrão, não um golpe
   *     os números de dano   existiam, com 9 px e brancos, por cima de um
   *                          cenário de pixel art claro. Invisíveis.
   *     o companheiro        nunca teve placa, balão nem folha de ataque —
   *                          ele era o único lutador mudo da tela
   *
   *   > Código que roda não é funcionalidade entregue. A entrega é o que
   *   > chega aos olhos, e só o passo OLHAR responde por isso. */
  s.teste('a folha de ataque SUBSTITUI a de caminhada, e não se soma a ela', () => {
    const js = ler('../app/modules/avanco-cena.mjs');
    ok(!/function pintarEfeito/.test(js),
      'a camada de efeito continua existindo — ela desenhava o bicho por cima ' +
      'dele mesmo, e dois sprites sobrepostos leem como borrão, não como golpe');
    ok(js.includes('folhaDe(m.dex, anim)') || js.includes('folhaDe(dex, anim)'),
      'a moldura do mob não escolhe a folha pela animação do momento');
  });

  s.teste('o companheiro luta com placa, balão e folha de ataque', () => {
    const js = ler('../app/modules/avanco-cena.mjs');
    ok(js.includes("pintarPlaca('meu'"),
      'o companheiro não tem placa — ele é o único lutador da tela sem nome e sem HP');
    ok(js.includes("balao('meu'"),
      'o companheiro não tem balão: o jogador não vê os golpes do PRÓPRIO bicho');
    const comp = ler('../app/modules/idle-companheiro.mjs');
    ok(comp.includes('ANIM_DO_COMBATE') || comp.includes("p.anim"),
      'o companheiro nunca troca de folha — ele apanha e bate com a de caminhada');
  });

  s.teste('o balão diz DE QUEM ele é, com o ícone da criatura', () => {
    /* O BALÃO saiu para  no 1.27, quando a cena passou de 600
       linhas. A divisão é por responsabilidade: a cena diz ONDE cada um está;
       o hud diz O QUE SE LÊ sobre ele. */
    const js = ler('../app/modules/avanco-hud.mjs');
    const b = js.slice(js.indexOf('function balao'), js.indexOf('function flutuar'));
    ok(b.includes('dexImg') || b.includes('avBalaoQuem'),
      'o balão sai só com o nome do golpe — com quatro lutadores em cena o ' +
      'jogador não sabe qual deles falou');
  });

  s.teste('o número do dano é legível: grande, com contorno, e colorido', () => {
    const css = ler('../app/index.html');
    const m = /#idleVivos \.avDmg\{[^}]*font-size:([\d.]+)px/.exec(css);
    ok(m, 'a regra do número de dano não declara tamanho próprio — ele herda os ' +
      '9 px da arena, que ali funcionam sobre fundo escuro e aqui somem');
    ok(Number(m[1]) >= 13,
      `o número está com ${m[1]}px sobre pixel art clara — o dono pediu para ver ` +
      'o "-13", e 9 px brancos não se veem num deserto');
    ok(css.includes('.avDmg.meu') || css.includes('.avDmg.dele'),
      'o dano que EU levo e o que EU dou saem da mesma cor — são as duas ' +
      'informações opostas da luta, e a cor é a única que se lê de relance');
  });

  /* ═══ A LEITURA DA RUN — bloco A4f ══════════════════════════════════════
   *
   * Lista do dono, com a tela na mão, e ela é toda sobre LER:
   *
   *   > "adiciona um gif animado do pokémon selecionado (…) no foco e vínculo
   *   >  adiciona o ícone padrão (…) no log da run mesma coisa (…) wave
   *   >  vencida fica marcado em verde, perdida em vermelho (…) estou sentindo
   *   >  falta da box do Hunt Analyzer que tinha na prévia, com tempo da run,
   *   >  xp etc. (…) diminuir um pouco o nome do pokémon e aumentar a barra de
   *   >  HP (…) a barra toda preta e os números tudo branco pequeno complica"
   *
   * Nenhum destes é erro de execução. Todos são erros de leitura — a família
   * que passou por 299 testes verdes no V1.15, e a razão de o passo OLHAR
   * existir. O que dá para afirmar em teste é a LIGAÇÃO: que a peça foi
   * chamada, que a cor sai do resultado, que o número existe. */
  s.teste('a coluna da run mostra a CARA da criatura, e não só o nome', () => {
    const js = painel();
    ok(/retratoAnimado/.test(js),
      'a stamina e o foco continuam só com nome — o dono pediu o gif animado ' +
      'do escolhido, e um nome não diz quem está lutando');
    /* Nos DOIS painéis, e não em um: ele nomeou os dois. */
    const stam = js.slice(js.indexOf('function pintarStamina'), js.indexOf('function pintarBuffs'));
    const foco = js.slice(js.indexOf('function pintarBuffs'), js.indexOf('function pintarLog'));
    ok(/retratoAnimado|dexImg/.test(stam), 'a stamina da equipe ficou sem retrato');
    ok(/retratoAnimado|dexImg/.test(foco), 'o foco e vínculo ficou sem ícone');
  });

  s.teste('o log pinta a wave vencida de verde e a perdida de vermelho', () => {
    const js = painel();
    const log = js.slice(js.indexOf('function pintarLog'), js.indexOf('const linha ='));
    ok(/venceus*?/.test(log), 'o log não distingue a wave vencida da perdida');
    ok(/'venceu'|"venceu"|avVenceu/.test(log) && /'perdeu'|"perdeu"|avPerdeu/.test(log),
      'as duas waves saem com a mesma classe — o dono pediu verde e vermelho, ' +
      'e cor que não muda não é cor, é enfeite');
    const css = ler('../app/index.html');
    ok(/.avEvt.venceu/.test(css) && /.avEvt.perdeu/.test(css),
      'as classes da wave não têm regra de cor no CSS');
  });

  s.teste('quem aparece no log aparece com ícone', () => {
    const js = painel();
    const log = js.slice(js.indexOf('const carinha'), js.indexOf('function pintarResumo'));
    ok(/dexImg|retratoAnimado/.test(log),
      'o log lista "Caterpie apareceu" sem a cara do Caterpie — e o jogador ' +
      'não está esperando um nome, está esperando o casulo que falta na linha dele');
  });

  /* ── O HUNT ANALYZER ──────────────────────────────────────────────────
     Ele estava na prévia que o dono aprovou (`app/previa-avanco.html`), e
     sumiu no caminho. A cobrança é dele, e é a terceira vez que a L-141 volta. */
  s.teste('o resumo da run é o Hunt Analyzer: tempo, XP, abates, espécies', () => {
    const js = painel();
    const res = js.slice(js.indexOf('function pintarResumo'));
    const fim = res.indexOf('\n}\n');
    const corpo = fim > 0 ? res.slice(0, fim) : res;
    for (const linha of ['tempo da run', 'XP', 'abates', 'espécies vistas'])
      ok(corpo.includes(linha),
        `o Hunt Analyzer não mostra "${linha}" — e foi exatamente essa caixa ` +
        'que o dono disse estar sentindo falta');
  });

  s.teste('o XP do painel sai da MESMA função que paga a run', () => {
    /* Uma conta parecida escrita na tela divergiria da que paga no dia em que
       uma das duas fosse calibrada — e o jogador veria um número na tela e
       outro no bolso. */
    const js = painel();
    ok(/ganhoDaRun/.test(js),
      'o XP do painel é calculado à parte de ganhoDaRun() — duas fórmulas ' +
      'para o mesmo número divergem, e a que mente é sempre a da tela');
  });

  s.teste('a placa do mob: nome menor que a barra, e a barra maior', () => {
    const css = ler('../app/index.html');
    const nome = /\.avPlacaMob b\{font-size:([\d.]+)px/.exec(css);
    const barra = /\.avPlacaMob i\{display:block; width:(\d+)px; height:(\d+)px/.exec(css);
    ok(nome && barra, 'as regras da placa mudaram de forma — o teste não as achou');
    ok(Number(nome[1]) <= 8.5,
      `o nome está com ${nome[1]}px; o dono pediu para diminuir`);
    ok(Number(barra[2]) >= 6,
      `a barra de HP tem ${barra[2]}px de altura — com 4 px o trilho escuro ` +
      'domina e o que se lê é o vazio, que é a queixa dele');
    ok(Number(barra[1]) >= 50,
      `a barra tem ${barra[1]}px de largura — estreita demais para a cor ` +
      'informar de relance');
  });

  /* ═══ O PEGA-PEGA, E POR QUE ELE ACONTECIA ══════════════════════════════
   *
   * Correção do dono, com a tela na mão:
   *
   *   > "os pokémon saem correndo pelo cenário e com a tela agora menor muitas
   *   >  vezes nem dá pra ver (...) precisa se posicionar à frente do seu
   *   >  treinador enfrentando os wild, pode movimentar, mas não ficar
   *   >  correndo mapa parecendo pega-pega"
   *
   * A causa não era velocidade: era um LAÇO. O companheiro mirava o mob mais
   * próximo e se punha a uma folga dele; o mob mirava o companheiro e se punha
   * a uma folga DELE. Dois alvos móveis, cada um perseguindo o outro — e o par
   * inteiro passeava pelo mapa sem nunca convergir.
   *
   *   > Um alvo que se move porque o perseguidor se moveu não é um alvo: é uma
   *   > realimentação, e realimentação sem âncora não estabiliza.
   *
   * A âncora é o TREINADOR: o companheiro se posta à frente dele, e é para
   * esse ponto que os selvagens vêm. Ninguém mais persegue ninguém. */
  s.teste('o campo de batalha é ancorado NO TREINADOR, e à frente dele', async () => {
    const g = await import('../app/modules/avanco-geometria.mjs');
    const eu = { x: 300, y: 200 };
    const p1 = g.postoDoCompanheiro(eu);
    ok(p1.y > eu.y, 'o companheiro não está À FRENTE do treinador — à frente, ' +
      'na projeção 3/4, é para BAIXO na tela, que é onde o jogador olha');
    ok(Math.abs(p1.x - eu.x) < 20,
      'o companheiro saiu para o lado em vez de ficar à frente');
    const d = Math.hypot(p1.x - eu.x, p1.y - eu.y);
    ok(d > 16 && d < 60,
      `o posto ficou a ${d.toFixed(0)} px do treinador — perto demais empilha os ` +
      'sprites, longe demais tira a luta da vista numa tela pequena');
  });

  /* ── E A LUTA NÃO PODE ACONTECER FORA DA VISTA ─────────────────────
     Achado OLHANDO, e é a metade da queixa do dono que mais dói:

       > "com a tela agora menor muitas vezes nem dá pra ver"

     O treinador passeia pelo mundo inteiro e PARA onde estiver quando a wave
     começa — inclusive encostado numa borda. A câmera não consegue rolar além
     do mundo, então o grupo inteiro ia para o canto da tela e metade das
     placas e balões saía do quadro.

       > Congelar o boneco onde ele está é certo; armar a batalha à frente
       > dele sem olhar se há mundo à frente não é. */
  s.teste('encostado na borda, o campo se arma para DENTRO do mundo', async () => {
    const g = await import('../app/modules/avanco-geometria.mjs');
    const mundo = { w: 704, h: 448 };
    /* colado na borda de baixo: à frente seria FORA */
    const baixo = g.postoDoCompanheiro({ x: 350, y: 442 }, mundo);
    ok(baixo.y < 442, 'o posto ficou ainda mais para baixo, fora do mundo');
    ok(baixo.y > 0 && baixo.y < mundo.h, 'o posto saiu do mundo');
    /* colado na direita: o passo lateral tem de virar para a esquerda */
    const dir = g.postoDoCompanheiro({ x: 700, y: 200 }, mundo);
    ok(dir.x < 700, 'o posto empurrou a batalha para fora pela direita');
    /* e no meio do mundo nada muda — a regra só age na borda */
    const meio = g.postoDoCompanheiro({ x: 350, y: 200 }, mundo);
    igual(meio.y, 200 + g.POSTO_DO_MEU.FRENTE, 'a regra da borda mexeu no meio do mundo');
  });

  s.teste('o posto NÃO depende da wave — nada faz o campo mudar de lugar', async () => {
    /* A versão anterior girava o campo por wave para dez lutas não caírem no
       mesmo canto. Numa tela menor isso jogava a luta para fora da vista — e
       "não dá pra ver" é pior que "sempre no mesmo lugar". */
    const g = await import('../app/modules/avanco-geometria.mjs');
    const eu = { x: 100, y: 100 };
    ok(g.postoDoCompanheiro(eu, 1).y === g.postoDoCompanheiro(eu, 9).y &&
       g.postoDoCompanheiro(eu, 1).x === g.postoDoCompanheiro(eu, 9).x,
      'o posto mudou com a wave — a luta muda de lugar sozinha');
  });

  s.teste('os selvagens se postam À FRENTE do companheiro, e não em volta', async () => {
    const g = await import('../app/modules/avanco-geometria.mjs');
    const centro = { x: 0, y: 0 };
    /* Um arco à frente, e não um cerco: cercar põe metade dos mobs ATRÁS do
       companheiro, onde eles cobrem o treinador e somem sob os sprites. */
    for (let i = 0; i < 2; i++) {
      const a = g.alvoDoCombate(i, 2, centro, { t: 0 });
      ok(a.y > 0, `o mob ${i} se postou ATRÁS do companheiro (y=${a.y.toFixed(1)})`);
    }
    const a0 = g.alvoDoCombate(0, 2, centro, { t: 0 });
    const a1 = g.alvoDoCombate(1, 2, centro, { t: 0 });
    ok(Math.abs(a0.x - a1.x) > 10,
      'os dois selvagens se postaram no mesmo lugar — eles se sobrepõem');
  });

  s.teste('o quadro da animação respeita a duração de CADA um', async () => {
    const { quadroDe } = await import('../app/modules/avanco-geometria.mjs');
    /* Um quadro longo e dois curtos: o primeiro tem de ocupar metade do ciclo.
       Dividir por igual — que é o que um `steps()` de CSS faz — daria um terço
       a cada um, e o bicho perderia o ritmo próprio que a folha declara. */
    const d = [10, 5, 5];              // 20 ticks × 24 ms = 480 ms de ciclo
    igual(quadroDe(d, 0), 0);
    igual(quadroDe(d, 239), 0, 'o quadro longo terminou cedo demais');
    igual(quadroDe(d, 241), 1);
    igual(quadroDe(d, 361), 2);
    igual(quadroDe(d, 480), 0, 'o ciclo não voltou ao começo');
    igual(quadroDe(d, -1), 2, 'tempo negativo não deu a volta');
    igual(quadroDe([], 100), 0, 'folha sem duração derrubou a conta');
  });

  /* ── A FOLHA QUE A CENA PEDE TEM DE EXISTIR PARA TODO MUNDO ────────────
     Este teste nasceu de um defeito que só apareceu na tela, e que o dono
     pegou antes de mim: a cena pedia a folha de PARADO, e ela existe para 75
     das 146 espécies. Para as outras 71 o 404 fazia a folha nunca carregar, e
     o `continue` engolia o mob INTEIRO — corpo, placa, balão e dano.

       > Um recurso que falta em metade dos casos não é uma exceção a tratar:
       > é a fonte errada.

     A sabotagem `S896` devolve o defeito, e nenhuma afirmação o pegava:
     todas rodavam sem navegador, e sem navegador uma folha ausente não custa
     nada. Esta pergunta é sobre o DISCO, e disco se lê em Node. */
  s.teste('a folha que a cena pede existe para TODAS as espécies do pack', async () => {
    const { PMD } = await import('../app/modules/sprites-dados.mjs');
    const cena = ler('../app/modules/avanco-cena.mjs');
    /* ── QUAL FOLHA A CENA PEDE QUANDO NÃO TEM OUTRA ────────────────────
       Mudou de forma no A4g, e a afirmação mudou junto sem afrouxar. Antes a
       cena pedia SEMPRE a de caminhada e sobrepunha a de golpe por cima;
       agora ela ESCOLHE a do momento e cai na de caminhada quando a do
       momento não existe em disco.

       O que continua tendo de valer é a mesma coisa, e é a razão deste teste:
       **a folha de RESERVA precisa existir para todas as espécies**, porque é
       ela que impede um mob de sumir da cena. Folha de golpe pode faltar — só
       82 das 146 a têm, e quem não a tem perde o floreio, não o corpo. */
    /* ── E A RESERVA MUDOU DE ENDEREÇO NO D-091 ──────────────────────
       A escolha saiu da cena e virou `folha-viva.mjs`, camada 0, porque colada
       ao `style.backgroundImage` ela não podia ser afirmada sem navegador — e
       foi por ali que setenta espécies passaram a sumir no golpe.

       O que este teste afirma continua sendo o mesmo, e é o que importa: a
       folha de RESERVA existe para TODAS as espécies. Ela só passou a ser
       perguntada a quem decide. */
    const pedida = (await import('../app/modules/folha-viva.mjs')).FOLHA_BASE;
    ok(pedida, 'não achei qual folha a cena usa como reserva do mob');
    ok(cena.includes('grade[anim] ?? grade.w'),
      'a cena não tem reserva quando a folha do momento falta — um mob sem ' +
      'folha de ataque sumiria no instante em que golpeasse');

    const { ANIM_FILE } = await import('../app/modules/sprites-dados.mjs');
    const raiz = new URL('../assets/raw_githubusercontent_com/PMDCollab/' +
                         'SpriteCollab/master/sprite/', import.meta.url);
    const faltando = [];
    for (const dex of Object.keys(PMD)) {
      const d = String(dex).padStart(4, '0');
      const arq = ANIM_FILE[pedida] + '-Anim.png';
      if (!existsSync(new URL(d + '/' + arq, raiz)) &&
          !existsSync(new URL(d + '/0000/0001/' + arq, raiz))) faltando.push(dex);
    }
    /* A base tem de existir para TODAS. Folha de efeito pode faltar — ela
       entra por cima, e quem não a tem só perde o floreio. */
    igual(faltando.length, 0,
      `a cena pede a folha "${ANIM_FILE[pedida]}" e ela falta para ` +
      `${faltando.length} espécies (${faltando.slice(0, 5).join(', ')}…) — ` +
      'para cada uma delas o mob some INTEIRO da tela');
  });

  /* ── O S889: A ALTURA DA OUTRA TELA NÃO VEM JUNTO ──────────────────────
     Medido a 1920: o palco vinha com 899 px de altura para uma coluna de 546,
     num mundo que é 704×448 — e a barra de ação ia parar em 1067 numa dobra de
     1080. Um controle abaixo da dobra é um controle que não existe. */
  s.teste('o palco larga a altura da outra tela ao entrar na run', () => {
    /* Este continua no `avanco-tela.mjs`: mover o palco é AÇÃO, e a divisão
       do A4g pôs a ação de um lado e a leitura do outro. */
    const t = ler('../app/modules/avanco-tela.mjs');
    ok(/alturaDaCasa = palco.style.height/.test(t),
      'a altura da tela de escolha não é guardada — voltar dela perderia a ' +
      'preferência que o jogador arrastou');
    ok(/palco.style.height = ''/.test(t),
      'a altura inline não é limpa ao entrar na run: o palco herda a altura ' +
      'de uma tela três vezes mais larga');
  });

  /* ═══ OS QUATRO DA CENA QUE O Q2 MOSTROU ESCAPANDO ══════════════════════
   *
   * `S886`, `S887`, `S897` e `S898` voltaram `PASSOU` no portão completo. Os
   * quatro são de CENA — camada 4, cheia de DOM — e por isso são afirmados na
   * FONTE, como o resto deste arquivo e pela mesma razão escrita no cabeçalho:
   * uma captura de tela não vê nenhum deles, e subir navegador para cada um
   * custaria minutos por afirmação.
   *
   * O que se afirma é a LINHA em que o comportamento mora, com o número
   * literal que a sabotagem troca. É a mesma forma que pegou o `S890`.
   */
  s.teste('a chave do mob carrega a WAVE, e não só o índice', () => {
    /* S886. `'mob' + m.i` faz o mob 0 da wave 5 herdar a posição do mob 0 da
       wave 4: o bando novo nasce já postado, e a aproximação — que é o que dá
       vida aos primeiros segundos — simplesmente não acontece. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    const linha = cena.split('\n').find(l => l.includes("const chave = 'mob'"));
    ok(linha, 'não achei onde a chave do mob é montada');
    ok(linha.includes('cena.wave'),
      'a chave do mob não tem a wave: o bando da wave seguinte nasce ' +
      'herdando a posição dos mortos da anterior');
  });

  s.teste('quem o motor abateu SAI da cena', () => {
    /* S887. A varredura de limpeza precisa das DUAS condições: é mob, e não
       foi visto neste quadro. Sem a segunda, nada nunca é removido — a tela
       passa a mostrar bichos que o motor já abateu, e o log discorda do que
       se vê.

         > Uma tela que discorda do log ensina o jogador a não confiar em
         > nenhum dos dois. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    /* A BUSCA É NA VARREDURA CERTA, e isso custou um falso vermelho: existem
       DUAS linhas com `k.startsWith('mob')`. A do `limparCena` remove TODOS de
       propósito — é o fim da run — e ela é a PRIMEIRA do arquivo.

         > Procurar pela primeira ocorrência de um trecho que existe duas vezes
         > é medir a errada em silêncio. É o mesmo erro que a âncora ambígua
         > comete no pré-voo, e a saída é a mesma: recortar antes de procurar. */
    const sweep = cena.slice(cena.indexOf('QUEM CAIU SAI DA CENA'));
    const linha = sweep.split('\n').find(l => l.includes("k.startsWith('mob')"));
    ok(linha, 'não achei a varredura que tira da cena quem caiu');
    ok(linha.includes('vistos.has(k)'),
      'a varredura não compara com quem foi VISTO neste quadro: ela nunca ' +
      'remove nada, e o mob abatido fica na tela para sempre');
    /* E o conjunto tem de ser preenchido, senão a condição acima é vazia. */
    ok(cena.includes('vistos.add(chave)'),
      'ninguém marca o mob como visto — a limpeza apagaria a cena inteira');
  });

  s.teste('o mob RECUA depois de bater, e não gruda no adversário', () => {
    /* S897. Sem `s.recuo = COMBATE.RECUO` no golpe, ele investe e fica colado:
       o vaivém da arena some e a luta vira o que o dono já cortou uma vez —
       *"os pokémon selvagem são pra BATALHAR e não acompanhar"*. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    const linha = cena.split('\n').find(l => l.includes('if (batendo) { s.recuo'));
    ok(linha, 'o mob não marca recuo ao bater — sem vaivém, a luta vira uma ' +
      'comitiva colada no companheiro');
    ok(linha.includes('COMBATE.RECUO'),
      'o recuo do mob usa um número próprio em vez da constante da arena — ' +
      'dois combates do mesmo jogo com ritmos diferentes seriam dois jogos');
  });

  s.teste('a chave do número de dano carrega a WAVE', () => {
    /* S898. `golpe.t` é o instante DENTRO da wave e recomeça do zero na
       seguinte. Sem a wave na chave, o registro de "este número já subiu"
       barra TODOS os danos a partir da segunda wave — e o dono passa nove
       waves sem ver um número.

       Foi assim que ele aconteceu da primeira vez, e é por isso que este
       teste existe em vez de uma nota no comentário. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    const linha = cena.split('\n').find(l => l.includes("'-' + golpe.dano"));
    ok(linha, 'não achei onde o número do dano é emitido');
    ok(linha.includes('cena.wave'),
      'a chave do número de dano não tem a wave: os danos somem a partir da ' +
      'segunda, porque o instante do golpe recomeça do zero');
    ok(/'meu'|"meu"/.test(linha),
      'o número não declara o LADO — sem ele cai na regra do "ERROU": 11 px, ' +
      'branco, e invisível sobre pixel art clara. Foi o D-079 pela outra ponta');
  });

  s.teste('o mob VEM ANDANDO: a entrada é longe o bastante do posto', async () => {
    /* S883. `RAIO_ENTRADA` colapsado para perto do posto apaga a aproximação
       inteira: o mob nasce onde vai lutar, os primeiros segundos da wave ficam
       vazios, e as oito direções da folha viram uma só — porque ele nunca
       precisa virar para chegar.

       A afirmação é sobre a DISTÂNCIA que ele tem de percorrer, e não sobre o
       número: é o caminho que produz a caminhada. */
    const g = await import('../app/modules/avanco-geometria.mjs');
    const centro = { x: 0, y: 0 };
    for (let i = 0; i < 4; i++) {
      const e = g.entrada(i, centro);
      const posto = g.alvoDoCombate(i, 2, centro, { t: 0 });
      const d = Math.hypot(e.x - posto.x, e.y - posto.y);
      /* 45 px é ~15 quadros a `COMBATE.WALK * 2.2`: abaixo disso a chegada
         acaba antes de o olho registrar que alguém chegou. */
      ok(d > 45,
        `o mob ${i} nasce a ${d.toFixed(0)} px do posto — perto demais para ` +
        'haver caminhada, e sem caminhada as oito direções da folha viram uma só');
      /* E não pode ser tão longe que ele entre de fora da vista: a janela do
         zoom padrão mostra ~290 px de mundo. "Entrar" e "aparecer" ficam
         idênticos quando o de fora está mais longe que a vista. */
      ok(d < 200,
        `o mob ${i} nasce a ${d.toFixed(0)} px do posto — mais longe que a ` +
        'vista, e aí ele não ENTRA: ele aparece do nada e atravessa a cena');
    }
  });

  s.teste('o passeio não TELEPORTA quando o duelo acaba', async () => {
    /* S899. O passeio é função do tempo, sem estado: parar o boneco é parar o
       relógio dele. Sem DESCONTAR a pausa ao soltar, o relógio salta para onde
       estaria se nunca tivesse parado — e o jogador vê o treinador aparecer do
       outro lado do mapa toda vez que um bicho cai.

       O que se afirma é a continuidade: o instante devolvido logo depois de
       soltar tem de ser o mesmo que estava congelado. */
    const g = await import('../app/modules/avanco-geometria.mjs');
    /* ── O QUE SE AFIRMA É CONTINUIDADE, e não um instante que eu escolhi ──
       A primeira versão deste teste exigia que o relógio congelasse em 1000, e
       ele congela no instante em que o DUELO COMEÇA — 3000. O código estava
       certo e a expectativa era minha.

         > Um teste que afirma o número que eu imaginei em vez da regra que o
         > produz mede a minha suposição, e não o produto.

       A regra é uma só, e é ela que impede o teleporte: **o passeio nunca
       salta**. Congela onde estava, e ao soltar continua de onde parou. */
    g.soltarPasseio();
    igual(g.relogioDoPasseio(1000, false), 1000, 'o relógio nasceu deslocado');

    const congelou = g.relogioDoPasseio(3000, true);
    igual(g.relogioDoPasseio(11000, true), congelou,
      'o passeio andou durante o duelo — o treinador não parou para assistir');

    /* AO SOLTAR: continua de onde estava. Sem descontar a pausa, ele saltaria
       os oito segundos de duelo de uma vez, e o boneco reapareceria do outro
       lado do mapa. */
    const soltou = g.relogioDoPasseio(11000, false);
    igual(soltou, congelou,
      `ao soltar, o passeio pulou de ${congelou} para ${soltou} — é o ` +
      'teleporte: o boneco reaparece do outro lado do mapa a cada duelo');

    /* e volta a andar no ritmo do relógio, sem herdar a pausa */
    igual(g.relogioDoPasseio(12000, false), congelou + 1000,
      'depois de solto o passeio não voltou a andar um segundo por segundo');
    g.soltarPasseio();
  });

  s.teste('a aba do farm NÃO herda as áreas nomeadas da Arena', () => {
    /* S595. A `.app` é uma grade de TRÊS colunas com áreas nomeadas, desenhada
       para a Arena. Trocar só as colunas deixa as áreas de pé, e os cartões
       das abas de farm caem em "acao", "arena" e "lista" — lado a lado,
       transbordando a tela.

       As DUAS abas, e não só a primeira: elas nasceram da mesma grade, e
       afirmar sobre uma delas deixa a outra livre para regredir sozinha. */
    for (const vista of ['viewIdle', 'viewRotaOff']) {
      const de = HTML.indexOf(`id="${vista}"`);
      ok(de > 0, `não achei a vista #${vista}`);
      const app = HTML.indexOf('<div class="app"', de);
      const fim = HTML.indexOf('>', app);
      const abertura = HTML.slice(app, fim);
      ok(abertura.includes('grid-template-areas:none'),
        `a grade de #${vista} não apaga as áreas nomeadas da Arena — os ` +
        'cartões caem nas áreas dela e transbordam a tela');
    }
  });

  s.teste('a cena usa a MESMA arte da Arena, e não uma fonte própria', () => {
    const cena = ler('../app/modules/avanco-cena.mjs');
    ok(cena.includes('PMDCollab/SpriteCollab'),
      'a cena não usa as folhas do PMD — seria outra arte para o mesmo bicho');
    ok(!/gen5ani|\.gif/.test(cena),
      'a cena voltou a usar GIF, que é de perfil e não cabe numa vista de cima');
  });


  /* ═══ O MOB É DESENHADO COMO NA ARENA — e a diferença era a raiz ════════
   *
   * Cobrança do dono, três vezes, e na terceira com a palavra certa:
   *
   *   > "as sprites do pokémon estão ficando quebradas [...] CONTINUA SEM SAIR
   *   >  O SPRITE DO PODER, na arena SAEM TODOS OS SPRITES, É SÓ VOCÊ COPIAR E
   *   >  TRAZER PRA CÁ, NÃO EXISTE dificuldade"
   *
   * Ele estava certo, e o que faltava copiar não eram as constantes: era a
   * TÉCNICA DE DESENHO.
   *
   *     ARENA   `background-image` num elemento, com `background-size` e
   *             `background-position` em %. Trocar de folha é trocar uma
   *             string — instantâneo. O nº de quadros vem da TABELA do PMD.
   *
   *     CENA    `<img>` dentro de `<span>`, medindo `naturalWidth` no
   *             `onload`. Trocar de folha zerava a medida e esperava o
   *             carregamento — e o mob SUMIA ou saía CORTADO a cada golpe.
   *
   * A troca de folha do A4g foi o que expôs isso: antes a folha nunca mudava,
   * e o defeito não tinha como aparecer.
   *
   *   > Uma técnica que só funciona enquanto nada muda não é uma técnica: é
   *   > uma coincidência que ainda não foi cobrada.
   */
  s.teste('a cena desenha o mob como a arena: fundo, e não <img> remedido', () => {
    /* A TÉCNICA mora em `vivos.mjs` — é dela que a arena também é feita — e a
       cena a USA. Afirmar nos dois é o que impede uma metade de regredir
       sozinha: a cena voltando ao `<img>`, ou o `vivos` perdendo o fundo. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    const vivos = ler('../app/modules/vivos.mjs');
    ok(/backgroundImage/.test(vivos),
      '`vivos.mjs` não desenha por `background-image` — sem isso a troca de ' +
      'folha volta a exigir carregamento, e o sprite sai cortado no golpe');
    ok(/fundoDe\(chave\)/.test(cena) && /usarFolha\(/.test(cena),
      'a cena não usa o desenho por fundo: ela continua com o <img> remedido');
    ok(!/molduraDe\(chave, folhaDe/.test(cena),
      'a cena ainda pede uma moldura nova a cada troca de folha: o elemento ' +
      'zera a medida e espera o carregamento, e o mob some no meio do golpe');
  });

  s.teste('o nº de quadros vem da TABELA, e não da largura da folha', () => {
    /* É a outra metade da mesma técnica. Dividir a largura da folha exige ter
       a folha medida; a tabela do PMD já diz quantos quadros a animação tem, e
       ela está em memória desde o boot. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    ok(!/v\.folha\.w \/ fw/.test(cena),
      'as colunas ainda saem de `folha.w / fw` — isso exige a folha carregada, ' +
      'e é a dependência que faz o sprite sair cortado');
    ok(/duracoes\.length|dur\.length/.test(cena),
      'o número de quadros não vem da duração declarada na tabela do PMD');
  });

  /* ══ A BOLA SAI DA RUN, E O "QUEM APARECEU" É O MOMENTO (L-166) ═══════
   *
   * Decisão do dono, e ela corrige uma coisa que estava OPACA:
   *
   *   > "a poção pode e deve ser usada durante as waves, porém as bolas, não.
   *   >  Quando você clica em bola simplesmente não avisa nada no log — se
   *   >  capturou, se fugiu, você não sabe o que aconteceu com suas bolas."
   *
   * O padrão que fica é o que JÁ EXISTE: o quadro "quem apareceu" no fim da
   * run, com a chance por bola escrita em cada botão. E ele aparece **mesmo
   * se o jogador falhou** — cair na wave 6 não apaga quem já tinha aparecido.
   *
   * ── POR QUE ISSO É MELHOR, E NÃO SÓ DIFERENTE ────────────────────────
   *
   * Durante a wave o jogador não tem como comparar: a tela está andando, o
   * botão joga a primeira bola da bolsa no primeiro alvo da lista, e o
   * resultado passa. No quadro ele vê TODAS as espécies e TODAS as bolas com
   * a chance de cada uma — a decisão que o §7.22.12 chama de central passa a
   * ser tomada olhando, e não no reflexo. */
  s.teste('a bola NÃO é oferecida durante a run — só a poção e o recuar', () => {
    const t = tela();
    /* ── PELA CHAMADA, E NÃO PELO ATRIBUTO — o S929 escapou por isso ─────
       A primeira versão procurava a string `data-av="bola"`, e ela NÃO
       aparece no código: o atributo é montado dentro da `botao()`, como
       `data-av="${chave}"`. A sabotagem devolveu o botão trocando a chamada
       da poção pela da bola, e a suíte continuou verde — o teste procurava
       uma string que a versão sabotada também não tinha.

         > Um teste que procura o RESULTADO de uma montagem no CÓDIGO-FONTE
         > afirma sobre um texto que nunca existiu. Ele não é frouxo: ele é
         > sobre outra coisa.

       Agora a afirmação é sobre a CHAMADA, que é o que o autor escreve. */
    ok(!/botao\(\s*'bola'/.test(t),
      'a barra da run ainda monta o botão de bola. A decisão do dono é que a ' +
      'captura acontece no quadro do fim, onde dá para comparar as chances');
    ok(!/data-av="bola"/.test(t),
      'existe um ouvinte de `data-av="bola"` na tela da run');
    ok(/botao\(\s*'pocao'/.test(t),
      'a poção sumiu junto — e ela PODE e DEVE ser usada durante as waves');
    ok(/data-av="pocao"/.test(t),
      'ninguém escuta o clique da poção — o botão existiria e não faria nada');
    ok(/data-av="recuar"/.test(t), 'o recuar sumiu da barra da run');
    /* A CHAMADA, e nao a palavra: o comentario que explica a remocao cita o
       nome de proposito, e um teste que proibe o NOME proibe explicar. */
    ok(!t.includes('alvosDaBolaNa('),
      'a tela ainda pergunta em quem jogar durante a run');
    ok(!t.includes('jogarBolaNaRun('),
      'a tela ainda chama `jogarBolaNaRun` — a porta continua aberta por código');
  });

  /* O quadro é o MESMO da Rota OFF, e isso é o ponto: o jogador aprende uma
     tela e a usa nos dois modos. Um segundo quadro só para o Avanço seria
     duas telas para a mesma decisão — e elas divergiriam na primeira mudança. */
  s.teste('o quadro do fim é o MESMO "quem apareceu" que a Rota OFF já usa', () => {
    ok(HTML.includes('id="idleEncontros"'),
      'o quadro "quem apareceu" não está no HTML');
    const paineis = ler('../app/modules/idle-paineis.mjs');
    ok(/Quem apareceu/.test(paineis), 'o quadro perdeu o título que o dono nomeia');
    ok(/data-lance=/.test(paineis),
      'o quadro não oferece o lance — ele viraria um informativo');
    /* E ele tem de dar acesso à LOJA ali mesmo: *"ele pode acessar a loja e
       comprar ball também pra capturar caso esteja sem"*. Mandar o jogador
       procurar a loja noutro canto é perder o momento que o quadro cria. */
    ok(/data-loja-abrir/.test(paineis),
      'o quadro não leva à loja — quem ficou sem bola perde a captura por ' +
      'não achar onde comprar, e o dono pediu exatamente o contrário');
  });

  /* ══ O NÚMERO DO DANO NASCE SOBRE O LUTADOR (D-083) ═══════════════════
   *
   * Quarta volta do dono na mesma coisa:
   *
   *   > "você continuou sem adicionar os hitbox de '-31'"
   *
   * E as três vezes anteriores eu respondi que o código estava lá. Estava —
   * e medido pelo passo OLHAR, em 28 s de wave 1, nasceram DEZ números, todos
   * dentro da janela, 17 px, peso 800. Ele não estava errado: eles não
   * chegavam aos olhos dele.
   *
   * ── A CAUSA, e ela é uma regra do navegador ─────────────────────────
   *
   * `.dmg` traz `animation: floatUp`, e TODO quadro-chave do `floatUp` define
   * `transform`. Propriedade animada VENCE o `style` inline — então o
   * `transform: translate(x, y)` que põe o número sobre o lutador era
   * descartado, e os dez nasciam no mesmo ponto: o canto da camada.
   *
   *     medido em 1920   todo "-1" em x = -19, todo "-100" em x = -32
   *     medido em 420    os DEZ fora da janela, à esquerda do mundo
   *
   * ── A CORREÇÃO SEPARA POSIÇÃO DE MOVIMENTO ──────────────────────────
   *
   * Um elemento leva a POSIÇÃO e não anima; o filho leva o MOVIMENTO e não
   * posiciona. Duas propriedades `transform` em dois elementos não competem —
   * elas se compõem, que é o que se queria desde o começo. */
  s.teste('o número do dano é posicionado por um elemento que NÃO anima', () => {
    const hud = ler('../app/modules/avanco-hud.mjs');
    /* O trecho da `flutuar`, e não o arquivo inteiro: `pintarPlaca` também
       escreve um transform inline, e ela pode fazê-lo — nada anima a placa. */
    const i = hud.indexOf('export function flutuar');
    ok(i > 0, 'a `flutuar` sumiu — quem desenha o número do dano?');
    const fl = hud.slice(i, hud.indexOf('export ', i + 10));

    const posiciona = fl.match(/(\w+)\.style\.transform\s*=/);
    ok(posiciona, 'a `flutuar` não posiciona nada — o número nasce no canto');
    const alvoDoTransform = posiciona[1];
    const classeDoAlvo = fl.match(new RegExp(alvoDoTransform + '\\.className\\s*=\\s*([^;]+);'));
    ok(classeDoAlvo, 'o elemento posicionado não declara classe — não dá para saber o que o anima');
    ok(!/\bdmg\b/.test(classeDoAlvo[1]),
      'o elemento que leva o `transform` inline é o MESMO que tem a classe `dmg`. ' +
      'O `floatUp` define transform em todo quadro-chave, e propriedade animada ' +
      'vence style inline: a posição é descartada e os números empilham no canto');
    ok(/appendChild/.test(fl) && (fl.match(/appendChild/g) ?? []).length >= 2,
      'não há um filho separado carregando a animação — posição e movimento ' +
      'continuam no mesmo elemento, e um dos dois vai perder');
  });

  s.teste('a camada do dano tem regra própria, e ela ancora no ponto', () => {
    ok(/#idleVivos \.avDmgPonto\{/.test(HTML),
      'não existe CSS para o elemento que ancora o número no lutador');
    /* ÂNCORA DE TAMANHO ZERO: o ponto é uma coordenada, não uma caixa. Com
       largura, ele empurraria o próprio número para o lado — e o erro seria
       pequeno, constante, e quase impossível de ver numa foto. */
    const regra = HTML.slice(HTML.indexOf('#idleVivos .avDmgPonto{'));
    const corpo = regra.slice(0, regra.indexOf('}'));
    ok(/width\s*:\s*0/.test(corpo) && /height\s*:\s*0/.test(corpo),
      'a âncora do número tem tamanho — ela desloca o que deveria só localizar');
    ok(!/animation/.test(corpo),
      'a âncora anima: ela voltaria a competir com o `floatUp` do filho');
  });

  /* ══ O ÍCONE DO LOG É O DO "QUEM APARECEU" (item 4 da ordem do dono) ═══
   *
   *   > "no log da run os pokémon eu quero aquele ícone que usamos no
   *   >  'QUEM APARECEU' e não o que você colocou"
   *
   * Ele está certo, e o motivo é o mesmo que fez o ícone existir. O quadro de
   * encontros trocou o retrato grande pelo recorte de cabeça porque aquela
   * tela é uma LISTA — e o log da run é a mesma coisa, uma linha por evento,
   * dezoito px de altura. Retrato inteiro dentro de dezoito px vira mancha:
   * o bicho não se reconhece, e a coluna existe para reconhecer o bicho.
   *
   * A FONTE tem de ser a MESMA função. Duas maneiras de desenhar a mesma
   * cabeça acabam com uma folha nova em um lugar e a antiga no outro, e o
   * jogador aprende que os dois ícones são coisas diferentes. */
  s.teste('a criatura no log da run usa o ícone de cabeça, e não o retrato', () => {
    const t = painel();
    ok(/estiloIcone/.test(t),
      'o log da run não usa `estiloIcone` — ele continua com o retrato grande, ' +
      'e o dono pediu o ícone do "quem apareceu" por escrito');
    /* O RECUO PARA O RETRATO CONTINUA: `temIcone` responde não para o que
       está fora da folha, e um recorte fora dela desenharia um quadrado
       transparente. Buraco silencioso na lista é pior que um retrato feio. */
    ok(/dexImg/.test(t),
      'o recuo para o retrato sumiu — espécie fora da folha viraria um buraco');
  });

  /* ══ A EQUIPE DA RUN ANIMA, COMO A DA STAMINA ══════════════════════════
   *
   *   > "na aba equipe está uma imagem estática, quero gif animado igual ao
   *   >  da stamina da equipe"
   *
   * Duas colunas da MESMA tela mostrando a MESMA criatura, uma parada e a
   * outra andando. Não é inconsistência de gosto: é o jogador perguntando o
   * que a diferença SIGNIFICA, e ela não significa nada. */
  s.teste('a equipe da run mostra o retrato animado, e não a arte parada', () => {
    const t = tela();
    const i = t.indexOf('function pintarEquipe');
    ok(i > 0, 'a `pintarEquipe` sumiu');
    const fn = t.slice(i, i + 1400);
    ok(/retratoAnimado/.test(fn),
      'a coluna da equipe da run desenha arte parada; a da stamina, ao lado, ' +
      'anima a mesma criatura — duas leituras para a mesma coisa na mesma tela');
  });

  /* ══ AS PLACAS NÃO SE EMPILHAM — D-081 ═════════════════════════════════
   *
   * Medido no passo OLHAR, em 28 s de wave 1: **um par de placas sobrepostas**,
   * "Charmander 97/100" desenhada por cima de "Metapod 0/100". O nome de uma
   * cobre o número da outra e nenhuma das duas se lê.
   *
   * A causa é geométrica e não tinha como não acontecer: a placa tem 68 px e
   * se centra no lutador, e o desenho do A4g manda o selvagem ATÉ o
   * companheiro. Dois lutadores encostados são duas placas no mesmo lugar —
   * sempre, e exatamente no instante em que o jogador mais quer ler os dois.
   *
   * ── POR QUE SEPARAR, E NÃO ESCONDER ─────────────────────────────────
   *
   * Esconder a de baixo resolveria a sobreposição perdendo a informação, e a
   * informação perdida seria justamente a do bicho que está apanhando. A placa
   * já mora ABAIXO do sprite; empurrar para baixo é a direção que não
   * atravessa nada.
   *
   * O passo acontece DEPOIS de todas serem pintadas, e não durante: durante,
   * cada placa só conhece a si mesma, e a colisão é uma relação entre duas. */
  s.teste('as placas que se encostam são separadas, e nenhuma some', () => {
    const hud = ler('../app/modules/avanco-hud.mjs');
    ok(/export function separarPlacas/.test(hud),
      'não existe passo de separação: duas placas encostadas continuam ' +
      'desenhadas uma sobre a outra, e é o D-081');

    const i = hud.indexOf('export function separarPlacas');
    const fn = hud.slice(i, hud.indexOf('\nexport ', i + 10) + 1 || undefined);
    ok(!/\.remove\(\)|display\s*=\s*.none|hidden\s*=\s*true/.test(fn),
      'a separação ESCONDE alguma placa. Some justamente a do bicho que está ' +
      'apanhando, que é a que o jogador quer ler');

    /* E ela precisa ser CHAMADA. Um passo escrito e não chamado é a mesma
       tela de antes com um comentário a mais — e passou por esta suíte. */
    const cena = ler('../app/modules/avanco-cena.mjs');
    ok(/separarPlacas\s*\(/.test(cena),
      'a cena não chama a separação — o passo existe e não roda');
    /* E a CONTA tem de estar na geometria, e não aqui. Ver o teste abaixo:
       enquanto ela morava junto do `style.transform`, o defeito plantado que
       desligava a aplicação PASSOU — não havia como afirmar o resultado sem
       montar um DOM. */
    /* ── A ALTURA É MEDIDA (S935) ──────────────────────────────────────
       A primeira versão escreveu 28 px "somando o CSS de cabeça". Errado por
       cinco — a placa mede 33 —, e o efeito foi o pior possível: a separação
       RODAVA, empurrava, e as duas continuavam encostadas. Portão verde,
       conserto aplicado, defeito de pé.

         > Número de layout escrito à mão envelhece na primeira vez que
         > alguém mexe numa fonte, e ninguém fica sabendo.

       Esta afirmação é sobre o CÓDIGO porque a medida é do navegador: não há
       como ler `offsetHeight` sem um. O que dá para exigir é que ele seja
       PERGUNTADO. */
    ok(/offsetHeight/.test(hud),
      'a altura da placa é um número escrito à mão. Errar por cinco pixels faz ' +
      'a separação rodar sem separar nada — e o portão fica verde');
    /* O ZERO INICIAL não conta: ele é "ainda não medi". O que não pode existir
       é uma atribuição de número REAL, que é o que a sabotagem planta. */
    ok(!/alturaDaPlaca\s*=\s*[1-9]\d*\s*;/.test(hud),
      'a altura da placa foi fixada num literal — ela deixa de acompanhar o CSS');
    ok(/separarPontos/.test(hud),
      'a conta da separação voltou para dentro do desenho — ela deixa de ser ' +
      'afirmável sem navegador, e foi assim que o S934 escapou');
  });

  /* ── E A CONTA, AFIRMADA DE VERDADE (S934) ────────────────────────────
   *
   * O teste acima diz que o passo EXISTE e é CHAMADO. Nenhuma das duas coisas
   * diz que ele MOVE alguma coisa — e o defeito plantado que troca a aplicação
   * por `if (false)` passou por elas as duas.
   *
   *   > Afirmar que uma função é chamada não afirma que ela faz algo. São
   *   > duas coisas, e o defeito mora exatamente entre elas.
   *
   * Agora a conta é pura e a afirmação é sobre o RESULTADO. */
  s.teste('a separação move de verdade, e não perde ninguém', async () => {
    const { separarPontos } = await import('../app/modules/avanco-geometria.mjs');
    const caixa = { largura: 68, altura: 35 };

    /* DOIS ENCOSTADOS: é o caso medido na tela — o selvagem vem até o
       companheiro, e as duas placas caem no mesmo lugar. */
    const dois = separarPontos([{ id: 'a', x: 100, y: 200 },
                                { id: 'b', x: 110, y: 205 }], caixa);
    igual(dois.length, 2, 'a separação perdeu um ponto — ela ESCONDE em vez de separar');
    const [pa, pb] = ['a', 'b'].map(id => dois.find(q => q.id === id));
    ok(Math.abs(pa.y - pb.y) >= caixa.altura,
      `os dois continuam a ${Math.abs(pa.y - pb.y)} px um do outro, e a placa ` +
      `mede ${caixa.altura}: elas seguem sobrepostas`);
    /* PARA BAIXO, e nunca para cima: a placa mora abaixo do sprite, e subir a
       faria atravessar o bicho que ela descreve. */
    ok(pb.y > pa.y, 'a de baixo subiu por cima do sprite em vez de descer');

    /* LONGE UM DO OUTRO NÃO SE MEXE. Uma separação que empurra quem não
       colidiu faria as placas dançarem a cada mob que nasce. */
    const longe = separarPontos([{ id: 'a', x: 100, y: 200 },
                                 { id: 'b', x: 400, y: 205 }], caixa);
    igual(longe.find(q => q.id === 'b').y, 205,
      'a separação mexeu em quem não estava encostado');

    /* E A ORDEM É ESTÁVEL: quem está mais alto fica mais alto, venha na ordem
       que vier. Sem isso, duas placas trocariam de lugar quando um mob nasce. */
    const ordem = separarPontos([{ id: 'baixo', x: 100, y: 210 },
                                 { id: 'alto', x: 100, y: 200 }], caixa);
    ok(ordem.find(q => q.id === 'alto').y < ordem.find(q => q.id === 'baixo').y,
      'a ordem depende de quem chegou primeiro — as placas trocariam de lugar');
  });

  /* ══ OS NÚMEROS DO DANO NÃO SE ATROPELAM — L-172 ══════════════════════
   *
   *   > "o hitbox também tá meio zoado, os números aparecem de forma confusa"
   *
   * MEDIDO ANTES DE MEXER, com o observador ligado por 28 s de wave 1:
   *
   *     numeros sobrepostos: 5    numa wave comum, de 25 nascidos
   *     numeros sobrepostos: 0    no duelo do chefe, de 12 — porque é 1x1
   *     fora da janela:      2    a 420 px, à esquerda do mundo
   *
   * "Meio zoado" sem número é onde eu errei três rodadas seguidas. Com número,
   * o defeito tem endereço: são dois selvagens e o companheiro trocando golpes
   * no mesmo canto, e cada número nasce sem saber dos outros.
   *
   * ── E É OUTRA GEOMETRIA, E NÃO A DAS PLACAS ─────────────────────────
   *
   * As placas se arrumam DEPOIS de todas serem pintadas: elas existem juntas, e
   * dá para olhar o conjunto. O número nasce sozinho, num instante — o conjunto
   * dele são os que ainda estão no ar. Um é arrumar o que está na tela; o outro
   * é escolher onde pôr o que está chegando. */
  s.teste('o número que chega desvia dos que ainda estão no ar', async () => {
    const { pontoLivre, PASSO_DO_DANO } = await import('../app/modules/avanco-geometria.mjs');
    const caixa = { largura: 40, altura: 20 };

    /* NO MESMO PONTO: é o caso medido — dois golpes no mesmo canto. */
    const desviou = pontoLivre(100, 200, [{ x: 100, y: 200 }], caixa);
    ok(Math.abs(desviou.y - 200) >= caixa.altura,
      `o número novo nasceu a ${Math.abs(desviou.y - 200)} px do que já estava, ` +
      `e ele mede ${caixa.altura} — os dois se atropelam, que é a queixa`);
    ok(desviou.y < 200,
      'o número foi empurrado para BAIXO. Ele já sobe pela animação: para cima ' +
      'é a direção que o olho espera, e para o lado o afastaria do lutador que ' +
      'causou o dano — a cor diz de quem é, mas a POSIÇÃO diz de qual golpe');
    igual(desviou.x, 100, 'o número andou para o lado, e saiu de cima do lutador');

    /* LONGE NÃO SE MEXE: empurrar quem não colidiu faria os números dançarem. */
    igual(pontoLivre(300, 200, [{ x: 100, y: 200 }], caixa).y, 200,
      'a conta mexeu num número que não estava encostado em ninguém');

    /* E VÁRIOS EMPILHADOS viram uma COLUNA legível, e não um borrão. */
    const ocupados = [];
    for (let i = 0; i < 4; i++) {
      const p = pontoLivre(100, 200, ocupados, caixa);
      for (const o of ocupados)
        ok(Math.abs(o.y - p.y) >= caixa.altura || Math.abs(o.x - p.x) >= caixa.largura,
          `o ${i + 1}º número caiu em cima de um anterior`);
      ocupados.push(p);
    }
    igual(new Set(ocupados.map(o => o.y)).size, 4,
      'quatro números seguidos no mesmo ponto não viraram quatro alturas');
    ok(PASSO_DO_DANO > 0, 'o passo do desvio é zero — nada se separa');
  });

  /* ── E ELE FICA DENTRO DA JANELA ─────────────────────────────────────
     Medido a 420 px: dois dos vinte e cinco nasciam FORA, à esquerda do mundo.
     Um número que existe e não se vê é o D-083 de volta pela porta estreita. */
  s.teste('o número não nasce fora da janela', async () => {
    const { pontoLivre } = await import('../app/modules/avanco-geometria.mjs');
    const caixa = { largura: 40, altura: 20, limite: { w: 420 } };

    for (const x of [-80, -30, 0, 410, 900]) {
      const p = pontoLivre(x, 100, [], caixa);
      ok(p.x - caixa.largura / 2 >= 0,
        `o número nasceu em x=${p.x} com largura ${caixa.largura} — parte dele ` +
        'fica à esquerda da janela, e o jogador não o vê');
      ok(p.x + caixa.largura / 2 <= 420,
        `o número nasceu em x=${p.x} — parte dele passa da direita da janela`);
    }
    /* E o desvio para cima também é grampeado, senão ele sai pelo topo. */
    ok(pontoLivre(200, 5, [{ x: 200, y: 5 }], caixa).y >= caixa.altura,
      'o desvio empurrou o número para fora do topo da cena');

    /* SEM LIMITE, nada é grampeado: quem não sabe o tamanho da tela não pode
       inventar um. */
    igual(pontoLivre(-80, 100, [], { largura: 40, altura: 20 }).x, -80,
      'a conta grampeou sem saber o tamanho da janela');
  });

  /* ── ST-5.4 · L-172 — AS DUAS PORTAS DA SOBREPOSIÇÃO QUE SOBRAVA ─────────
     O desvio para cima resolveu de 5 pares para 1 a 3. O que sobrava tinha dois
     endereços, e os dois estão na própria conta: (1) depois de VOLTAS_DO_DANO
     subidas ocupadas, o número era aceito em cima de outro; (2) o grampo do
     TOPO da cena o empurrava de volta para baixo, em cima de quem ele tinha
     desviado. Quando a coluna acaba, o número vai para o LADO — perto, e só
     então. */
  s.teste('L-172: coluna cheia até o teto — o número vai para o lado, e não em cima de outro', async () => {
    const { pontoLivre, PASSO_DO_DANO, VOLTAS_DO_DANO } = await import('../app/modules/avanco-geometria.mjs');
    const caixa = { largura: 40, altura: 20, limite: { w: 420 } };
    const ocupados = [];
    for (let i = 0; i <= VOLTAS_DO_DANO; i++) ocupados.push({ x: 200, y: 200 - i * PASSO_DO_DANO });
    const p = pontoLivre(200, 200, ocupados, caixa);
    for (const o of ocupados)
      ok(Math.abs(o.x - p.x) >= caixa.largura || Math.abs(o.y - p.y) >= caixa.altura,
        `a coluna estava cheia e o número caiu em cima de um (${o.x},${o.y}) — era a primeira porta do L-172`);
    ok(Math.abs(p.x - 200) <= 2 * caixa.largura, `o número foi parar longe demais do lutador: x=${p.x}`);
  });

  s.teste('L-172: o grampo do topo não devolve o número para cima de quem ele desviou', async () => {
    const { pontoLivre } = await import('../app/modules/avanco-geometria.mjs');
    const caixa = { largura: 40, altura: 20, limite: { w: 420 } };
    const ocupados = [{ x: 200, y: 22 }];
    const p = pontoLivre(200, 22, ocupados, caixa);
    ok(p.y >= caixa.altura, 'o número saiu pelo topo');
    ok(Math.abs(ocupados[0].x - p.x) >= caixa.largura || Math.abs(ocupados[0].y - p.y) >= caixa.altura,
      `o grampo do topo pôs o número em (${p.x},${p.y}), em cima do que já estava — a segunda porta`);
  });

  /* ── E A LISTA DOS QUE ESTÃO NO AR SE LIMPA (S963) ────────────────────
   *
   * O defeito plantado que DESLIGA a limpeza passou enquanto ela morava dentro
   * da `flutuar`, em camada 4 — quinta vez neste bloco que a mesma lição
   * aparece, e a cura é sempre a mesma.
   *
   * E ela não é arrumação: sem a limpeza, a lista só cresce numa aba aberta por
   * horas, e cada número novo é empurrado mais para cima até bater no teto da
   * cena. O defeito não seria "vaza memória" — seria "os números foram embora
   * para o topo depois de vinte minutos", que ninguém liga à causa. */
  s.teste('a lista dos números no ar se limpa, e é ela que impede a subida', async () => {
    const { aindaNoAr, VIDA_DO_DANO } = await import('../app/modules/avanco-geometria.mjs');
    const agora = 100_000;
    const lista = [
      { x: 0, y: 0, em: agora },                     /* acabou de nascer */
      { x: 0, y: 0, em: agora - VIDA_DO_DANO + 1 },  /* quase indo */
      { x: 0, y: 0, em: agora - VIDA_DO_DANO },      /* foi */
      { x: 0, y: 0, em: agora - 60_000 },            /* de um minuto atrás */
    ];
    igual(aindaNoAr(lista, agora).length, 2,
      'a lista dos vivos trouxe quem já sumiu da tela — cada número novo seria ' +
      'empurrado para cima por fantasmas, até bater no teto da cena');

    /* E ela não estoura com lixo: estado a meio carregar chega assim. */
    igual(aindaNoAr(null, agora).length, 0, 'lista ausente derrubou a conta');
    igual(aindaNoAr([null, undefined, {}, { em: 'ontem' }], agora).length, 0,
      'entrada sem instante passou por viva — ela ficaria na lista para sempre');

    /* O TEMPO ANDA SÓ PARA A FRENTE aqui: um instante no futuro é save
       adulterado ou relógio trocado, e ele não pode prender a lista. */
    ok(aindaNoAr([{ x: 0, y: 0, em: agora + 999_999 }], agora).length <= 1,
      'um instante no futuro multiplicou entradas');
  });

  /* ══ O AVANÇO PROGRESSIVO — o trecho da wave (L-164, v2) ══════════════
   *
   *   > "veja como funciona a movimentação, realmente faz sentido: o boneco
   *   >  vai avançando e batalhando de forma progressiva"
   *
   * ── E ISSO CONTRADIZ O A4g, MAS SÓ PELA METADE ──────────────────────
   *
   * O A4g ancorou a batalha no treinador PARADO, e estava certo: antes disso
   * o par derivava pelo cenário sem convergir, e o dono cortou — "não ficar
   * correndo mapa parecendo pega-pega". O que aquilo produziu foi "duas
   * criaturas brigando num quadro estático", e não "uma jornada".
   *
   *     o que FICA CERTO   ninguém persegue ninguém; o campo tem âncora
   *     o que FALTAVA      a ÂNCORA andar entre as waves
   *
   * A solução não mexe no passeio: mexe na ÁREA dele. */
  s.teste('o trecho AVANÇA com a wave, e cobre o mapa de ponta a ponta', async () => {
    const { trechoDaWave } = await import('../app/modules/avanco-geometria.mjs');
    const area = { x0: 0, x1: 704, y0: 0, y1: 448 };

    igual(trechoDaWave(area, 1, 10).x0, area.x0,
      'a primeira wave não começa no começo do mapa — o jogador entraria já no ' +
      'meio da jornada, e a travessia perderia o ponto de partida');
    igual(trechoDaWave(area, 10, 10).x1, area.x1,
      'a última wave não chega ao fim do mapa. A jornada tem de ATRAVESSAR: ' +
      'parar antes deixa um pedaço do lugar que o jogador nunca vê');

    /* E ele ANDA SEMPRE PARA A FRENTE. Uma wave vencida que recuasse leria
       como perder terreno, e o motor não tira terreno de ninguém. */
    let antes = -Infinity;
    for (let w = 1; w <= 10; w++) {
      const t = trechoDaWave(area, w, 10);
      ok(t.x0 > antes, 'o trecho da wave ' + w + ' começa em ' + t.x0 +
        ' e o da anterior em ' + antes + ' — a jornada andou para trás, e ' +
        'isso lê como perder terreno');
      antes = t.x0;
      ok(t.x1 > t.x0, 'o trecho da wave ' + w + ' tem largura zero ou negativa');
      ok(t.x0 >= area.x0 && t.x1 <= area.x1,
        'o trecho da wave ' + w + ' saiu do mapa: [' + t.x0 + ', ' + t.x1 + ']');
    }
  });

  /* ── OS TRECHOS SE SOBREPÕEM, e isso não é folga ─────────────────────
     Sem sobreposição, vencer uma wave TELEPORTA o boneco para o trecho
     seguinte — e teleporte é o defeito que o relógio do passeio existe para
     evitar. Com sobreposição, a passagem é uma caminhada. */
  s.teste('trechos vizinhos se sobrepõem — a passagem é caminhada, não salto', async () => {
    const { trechoDaWave, SOBREPOSICAO_DO_TRECHO } =
      await import('../app/modules/avanco-geometria.mjs');
    const area = { x0: 0, x1: 704, y0: 0, y1: 448 };
    ok(SOBREPOSICAO_DO_TRECHO > 0,
      'a sobreposição é zero: vencer uma wave TELEPORTA o boneco, que é o ' +
      'defeito que o relógio do passeio existe para evitar');

    for (let w = 1; w < 10; w++) {
      const a = trechoDaWave(area, w, 10), b = trechoDaWave(area, w + 1, 10);
      ok(b.x0 < a.x1, 'o trecho da wave ' + (w + 1) + ' começa em ' + b.x0 +
        ' e o da ' + w + ' acaba em ' + a.x1 + ' — há um buraco entre os dois, ' +
        'e o boneco salta por cima dele');
    }
  });

  /* ── O EIXO É O MAIOR DOS DOIS ───────────────────────────────────────
     Fixar o horizontal faria um bioma vertical futuro atravessar em três
     passos e ficar parado no resto. A conta olha a forma do LUGAR. */
  s.teste('a jornada segue o eixo maior do mundo', async () => {
    const { trechoDaWave } = await import('../app/modules/avanco-geometria.mjs');

    const deitado = trechoDaWave({ x0: 0, x1: 900, y0: 0, y1: 200 }, 1, 10);
    igual(deitado.y0, 0); igual(deitado.y1, 200);
    ok(deitado.x1 < 900, 'num mundo mais largo que alto a jornada não foi horizontal');

    const empe = trechoDaWave({ x0: 0, x1: 200, y0: 0, y1: 900 }, 1, 10);
    igual(empe.x0, 0); igual(empe.x1, 200);
    ok(empe.y1 < 900, 'num mundo mais alto que largo a jornada não foi vertical — ' +
      'ele atravessaria em três passos e ficaria parado no resto');
  });

  /* Estado a meio carregar e save adulterado chegam aqui, e um trecho fora do
     mapa põe o boneco onde não há chão. */
  s.teste('área degenerada e wave inventada não põem o boneco fora do mapa', async () => {
    const { trechoDaWave } = await import('../app/modules/avanco-geometria.mjs');
    const area = { x0: 10, x1: 710, y0: 5, y1: 455 };

    for (const w of [0, -3, 99, null, undefined, NaN, 1.7]) {
      const t = trechoDaWave(area, w, 10);
      ok(t.x0 >= area.x0 && t.x1 <= area.x1 && t.x1 > t.x0,
        'a wave ' + w + ' devolveu o trecho [' + t.x0 + ', ' + t.x1 + '], fora ' +
        'de [' + area.x0 + ', ' + area.x1 + ']');
    }

    /* Mundo sem área: devolve o que recebeu, e não um retângulo inventado. */
    for (const ruim of [{ x0: 0, x1: 0, y0: 0, y1: 0 }, {}, null]) {
      const t = trechoDaWave(ruim, 5, 10);
      ok(Number.isFinite(t.x0) && Number.isFinite(t.x1),
        'a área ' + JSON.stringify(ruim) + ' devolveu coordenada inválida');
    }

    /* UMA wave só: a jornada é o mapa inteiro, e não um décimo dele. */
    const inteiro = trechoDaWave(area, 1, 1);
    igual(inteiro.x0, area.x0); igual(inteiro.x1, area.x1);
  });

  /* ══ L-187 · NA LUTA, A CÂMERA CENTRA NO TRIO ═════════════════════════
   * Com a DEC-15 a luta cabe em 420 px, mas a câmera seguia o TREINADOR e o
   * bando ficava no último terço, com a placa encostando na borda. Na luta o
   * foco vira o posto do companheiro — o meio entre o treinador (em cima) e o
   * bando (embaixo) —, e a câmera CHEGA lá em vez de pular. */
  s.teste('L-187: fora da luta a câmera segue o treinador; na luta, o posto do companheiro', async () => {
    const G = await import('../app/modules/avanco-geometria.mjs');
    const eu = { x: 200, y: 100 }, mundo = { w: 2000, h: 2000 };
    const fora = G.focoDaCamera(eu, false, mundo);
    igual(fora.x, 200, 'fora da luta a câmera saiu do treinador'); igual(fora.y, 100, 'idem no Y');
    const dentro = G.focoDaCamera(eu, true, mundo), posto = G.postoDoCompanheiro(eu, mundo);
    igual(dentro.x, posto.x, 'na luta o foco não é o posto do companheiro'); igual(dentro.y, posto.y, 'idem no Y');
  });

  s.teste('L-187: a câmera CHEGA ao foco novo, e não pula', async () => {
    const { aproximarFoco } = await import('../app/modules/avanco-geometria.mjs');
    const a = { x: 0, y: 0 }, b = { x: 100, y: 40 };
    const p1 = aproximarFoco(null, b, 16);
    igual(p1.x, 100, 'no primeiro quadro não há de onde vir — a câmera deve nascer no foco');
    const p = aproximarFoco(a, b, 16);
    ok(p.x > 0 && p.x < 20, `num quadro de 16 ms a câmera andou ${p.x} de 100 — pulou ou travou`);
    const longe = aproximarFoco(a, b, 5000);
    ok(Math.abs(longe.x - 100) < 0.5 && Math.abs(longe.y - 40) < 0.5, 'depois de 5 s a câmera ainda não chegou');
    igual(aproximarFoco(a, b, 0).x, 0, 'sem tempo passado a câmera andou');
    igual(aproximarFoco(a, b, -50).x, 0, 'relógio voltando empurrou a câmera');
  });

  s.teste('L-187: o mundo mira a câmera pelo foco suavizado', () => {
    const t = readFileSync(new URL('../app/modules/idle-mundo.mjs', import.meta.url), 'utf8');
    ok(/aproximarFoco\(focoCam, focoDaCamera\(eu, emLuta/.test(t),
      'o idle-mundo não mira pelo foco suavizado da luta — a câmera segue o treinador');
    ok(/camera\(focoCam, W, H, mundoW, mundoH\)/.test(t), 'a câmera não usa o foco calculado');
  });

  /* ══ L-187 · A BORDA DO MUNDO SEGURAVA A CÂMERA ═══════════════════════
   * Medido com a sonda a 420 px: mundo de 448 de altura, janela de 413 — a
   * câmera tem 35 px de folga vertical, queria estar em y=142 e ficava presa
   * em 35. A luta acontecia no último quarto do MAPA, e nenhuma câmera centra
   * o que está na borda. Na run, o treinador não desce abaixo da linha que a
   * câmera presa no fundo ainda mostra em TETO_DA_LUTA da janela. */
  s.teste('L-187: na run o treinador não desce abaixo do que a câmera presa ainda mostra alto', async () => {
    const { areaDaLuta, camera, TETO_DA_LUTA } = await import('../app/modules/vida.mjs');
    const area = { x0: 12, x1: 680, y0: 19, y1: 414 };
    for (const viewH of [413, 221, 207]) {
      const a = areaDaLuta(area, { mundoH: 448, viewH });
      const cam = camera({ x: 0, y: a.y1 }, 260, viewH, 704, 448);
      const naJanela = (a.y1 - cam.y) / viewH;
      ok(naJanela <= TETO_DA_LUTA + 0.01,
        `janela de ${viewH}: o treinador no fundo da área fica a ${Math.round(naJanela * 100)}% da altura — ` +
        'o bando, que luta abaixo dele, encosta na borda (L-187)');
      igual(a.x0, area.x0); igual(a.x1, area.x1, 'a área da luta mexeu na jornada horizontal');
      igual(a.y0, area.y0, 'a área da luta mexeu no topo');
    }
    ok(TETO_DA_LUTA > 0.4 && TETO_DA_LUTA < 0.8, `TETO_DA_LUTA = ${TETO_DA_LUTA} não é um teto`);
  });

  s.teste('L-187: a área da luta nunca some, e entrada ruim não a estraga', async () => {
    const { areaDaLuta } = await import('../app/modules/vida.mjs');
    const area = { x0: 12, x1: 680, y0: 19, y1: 414 };
    /* O piso só morde quando o topo da área já é baixo: é aí que o corte
       deixaria o passeio numa faixa fina rente ao próprio topo. */
    for (const a of [area, { x0: 12, x1: 680, y0: 200, y1: 414 }]) {
      const vista = areaDaLuta(a, { mundoH: 448, viewH: 2000 });
      ok(vista.y1 - vista.y0 >= (a.y1 - a.y0) / 2,
        `área ${a.y0}–${a.y1}: com a janela maior que o mundo ela encolheu para ${vista.y1 - vista.y0} px — o passeio vira uma linha`);
    }
    for (const ruim of [{}, { mundoH: 448 }, { mundoH: NaN, viewH: 413 }, { mundoH: 448, viewH: 0 }])
      igual(JSON.stringify(areaDaLuta(area, ruim)), JSON.stringify(area), `entrada ${JSON.stringify(ruim)} mexeu na área`);
    const t = readFileSync(new URL('../app/modules/idle-mundo.mjs', import.meta.url), 'utf8');
    ok(/areaDaLuta\(trechoDaWave\(/.test(t), 'o idle-mundo não aplica a área da luta ao trecho da wave');
  });
  return s;
}
