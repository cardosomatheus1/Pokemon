/* Q1/Q2/Q5 · O PAINEL DA RODADA (R4) — colocação, abates, e o que sai da tela.
 *
 * ── O QUE O DONO DO PROJETO PEDIU, E O QUE ESTAVA LÁ ───────────────────────
 *
 * O modelo antigo (`prototype-v1.0/index.html`) marcava três coisas que se
 * perderam no porte para as listas unificadas:
 *
 *     .pdrow.p1{background:linear-gradient(...);border-color:var(--gold)}
 *     .pdrow.caiu .nm{text-decoration:line-through;color:var(--dim)}
 *     .pdrow.caiu .st{color:var(--red)}
 *     .kfrow .ko{font-family:var(--px);color:var(--gold)}
 *
 * pódio destacado, derrotado riscado, K.O. em vermelho, abates em neon. Hoje
 * as doze linhas são iguais durante a luta e as medalhas só aparecem no FIM —
 * e "quem está ganhando?" é uma pergunta VIVA, que no fim já foi respondida
 * pelo resultado no centro da tela.
 *
 * **A unificação FICA.** O dono aprovou colocação, odds e abates no mesmo
 * painel; o que se recupera é a LEITURA do antigo, não o arranjo dele.
 *
 * ── POR QUE TANTA ASSERÇÃO SOBRE CSS ──────────────────────────────────────
 *
 * Porque é onde este bloco pode falhar em silêncio. Classe emitida pelo
 * JavaScript sem regra correspondente não quebra nada — ela só não aparece, e
 * a suíte segue verde. Foi exatamente assim que o `D-028` viveu: seis classes
 * escritas por um módulo, nenhuma na folha de estilo, e uma barra de vida de
 * altura zero na tela do jogador que apostou.
 *
 * O `test/banner.mjs` já fazia essa pergunta para os cosméticos, nos dois
 * sentidos. Aqui ela é feita para o painel.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { realceDoPodio } from '../app/modules/colocacao.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');
const ODDS = ler('../app/modules/odds.mjs');

/* Uma regra do CSS do app, pelo seletor exato. `[{,]` no fim para `.pick.pod1`
   não casar com `.pick.pod10` se um dia existir. */
const regra = sel => {
  const m = APP.match(new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[{,]`, 'm'));
  if (!m) return null;
  const i = APP.indexOf(m[0]);
  return APP.slice(i, APP.indexOf('}', i) + 1);
};

export function suite() {
  const s = criarSuite('painel-rodada');

  /* --- o pódio, e é aritmética, não desenho ------------------------------ */

  s.teste('as três primeiras posições recebem o realce do pódio', () => {
    igual(realceDoPodio(1, true), 'pod1', 'o líder não é marcado');
    igual(realceDoPodio(2, true), 'pod2', 'o segundo não é marcado');
    igual(realceDoPodio(3, true), 'pod3', 'o terceiro não é marcado');
    igual(realceDoPodio(4, true), '', 'o quarto lugar recebeu realce de pódio');
  });

  /* Quem caiu está no fim do quadro, e a posição dele lá é a posição de QUEDA —
     `colocacaoDe` devolve 10, 11, 12 para os últimos a cair, mas devolve 1 para
     o primeiro colocado... e para quem caiu em 1º não existe. O que existe é o
     caso oposto: um caído nunca pode brilhar como líder. */
  s.teste('quem caiu não recebe realce de pódio', () => {
    for (const pos of [1, 2, 3])
      igual(realceDoPodio(pos, false), '',
        `um lutador derrotado em ${pos}º recebeu o brilho do líder`);
  });

  s.teste('a lista da rodada usa o realce, e não um `pos <= 3` próprio', () => {
    ok(/realceDoPodio\(/.test(ODDS),
      'o `odds.mjs` não usa o `realceDoPodio` — o pódio virou uma segunda contagem');
  });

  /* --- e o CSS existe para cada classe emitida --------------------------- */

  s.teste('cada classe de pódio tem regra no CSS', () => {
    for (const c of ['pod1', 'pod2', 'pod3'])
      ok(regra(`.pick.${c}`), `a classe \`${c}\` é emitida e não tem desenho nenhum`);
  });

  s.teste('o líder tem o brilho que atravessa a linha', () => {
    ok(/@keyframes\s+brilhoLider/.test(APP),
      'a animação `brilhoLider` do modelo antigo não foi recuperada');
    ok(/\.pick\.pod1::after\{/.test(APP),
      'o líder não tem a camada de brilho — só a moldura');
  });

  /* --- o derrotado ------------------------------------------------------- */

  /* `.viva.fechado` e não `.fechado`, e a distinção É o teste.
     `fechado` tem DOIS significados nesta lista unificada: na fase de aposta é
     "mercado fechado por passivo" (§4.4.6), e na luta é "este caiu". Riscar o
     nome de um lutador cujo mercado fechou seria dizer que ele morreu antes de
     a luta começar. `.viva` é a classe que marca a lista da LUTA. */
  s.teste('o derrotado fica riscado', () => {
    const r = regra('.pick.viva.fechado .n');
    ok(r && /line-through/.test(r),
      `o nome do derrotado não é riscado: ${r ?? 'sem regra'}`);
  });

  s.teste('o K.O. do derrotado é vermelho', () => {
    const r = regra('.pick.viva.fechado .p');
    ok(r && /var\(--red\)/.test(r),
      `o K.O. não sai em vermelho: ${r ?? 'sem regra'}`);
  });

  /* O `.lim` é a coluna de ABATES na lista da luta, e ela saía em VERMELHO no
     derrotado — a regra vinha da fase de aposta, onde a mesma coluna diz
     "mercado fechado" e o vermelho é a informação. Na luta ele pinta de alarme
     o placar de quem aquele lutador derrubou antes de cair.
     O teste cobra o RECORTE, e não a ausência da regra: sem `:not(.viva)` ela
     voltaria a atravessar os dois significados. */
  s.teste('o vermelho de "mercado fechado" não pinta a coluna de abates', () => {
    ok(!regra('.pick.fechado .lim'),
      'a regra vermelha voltou a valer para os dois significados de `fechado`');
    const r = regra('.pick.fechado:not(.viva) .lim');
    ok(r && /var\(--red\)/.test(r),
      'o "mercado fechado" perdeu o vermelho junto — ali ele é a informação');
  });

  /* --- os abates em neon ------------------------------------------------- */

  s.teste('o número de abates volta ao neon do modelo antigo', () => {
    const r = regra('.pick .lim');
    ok(r, 'a coluna de abates perdeu a regra dela');
    ok(/var\(--px\)/.test(APP.slice(APP.indexOf(r), APP.indexOf(r) + 400)) || /var\(--px\)/.test(r),
      `os abates não usam a fonte de pixel: ${r}`);
  });

  /* O neon só vale se ele DISTINGUIR. O modelo antigo apagava a linha de quem
     ainda não abateu — "para o ranking acender conforme acontece". Sem isso são
     doze zeros dourados brilhando tanto quanto o líder, e a coluna deixa de
     destacar o que aconteceu: o neon vira papel de parede. */
  s.teste('quem ainda não abateu ninguém não acende', () => {
    ok(/lim tiny\$\{[^}]*zero/.test(ODDS) || /'\s*zero'/.test(ODDS),
      'a lista não marca mais a coluna de abates zerada');
    /* A asserção cobra a PRESENÇA da cor apagada, e não a ausência do dourado.
       A primeira versão fazia o contrário, e o defeito plantado `S320` passou
       por ela: tirar `color:var(--dim)` da regra deixa o dourado herdado de
       `.pick.viva .lim` valendo, e a regra continua sem a palavra `gold`
       escrita nela. Ausência de uma cor não é presença de outra — na cascata,
       quem não declara herda. */
    const r = regra('.pick.viva .lim.zero');
    ok(r && /color:\s*var\(--dim\)/.test(r),
      `o zero de abates continua aceso, herdando o dourado: ${r ?? 'sem regra'}`);
  });

  /* --- o que SAI da tela -------------------------------------------------- */

  /* Marcada com X no mockup do dono. Uma barra ciano preenchida ao lado de uma
     caixa de apostas, que o próprio comentário do código admitia ser ambígua —
     o crítico cego não soube dizer se era volume, velocidade ou valor apostado.
     O botão de mudo FICA: ele diz o que faz. */
  s.teste('a barra de volume solta saiu da tela', () => {
    ok(!/id="vol"/.test(APP), 'a barra de volume continua na zona de ação');
    ok(/id="btnSound"/.test(APP), 'o botão de mudo sumiu junto — ele não estava no X');
  });

  /* Remover o elemento e deixar quem o procurava é o defeito clássico da
     remoção: `$('#vol').oninput` lança `TypeError` e derruba o módulo inteiro
     no carregamento — junto com tudo que ele exporta. */
  s.teste('ninguém tenta ligar a barra de volume que não existe mais', () => {
    const src = ler('../app/modules/carteira.mjs');
    ok(!/\$\('#vol'\)\s*\.\s*oninput/.test(src),
      'o `carteira.mjs` ainda liga `#vol` sem guarda: o módulo inteiro cai no boot');
  });

  /* O painel DEV de velocidade do replay TAMBÉM está com X no mockup, e este
     teste existe para que ele não volte. Ele já havia saído da tela do jogador
     nesta linha do projeto (V1.16) e vive no painel de ADM — o X foi desenhado
     contra o modelo antigo, onde ele ainda estava à mostra. */
  s.teste('o controle de velocidade do replay não está na tela do jogador', () => {
    const zona = APP.indexOf('<div class="zona acao"');
    const arena = APP.indexOf('<div class="zona arena"');
    ok(zona > 0 && arena > zona, 'as zonas mudaram de forma — refaça este teste');
    ok(!/id="spd"/.test(APP.slice(zona, arena)),
      'o controle de velocidade do replay voltou para a tela em que se aposta');
  });

  /* ═══ R33 · A COLUNA DE AÇÃO NÃO TEM NADA QUE MUDA DE ALTURA ════════════
   *
   * O cartão de aposta APARECE e SOME com a fase (`zona-acao.mjs` o esconde em
   * 'fighting' e 'result'). No topo da coluna de ação, cada aparição empurrava
   * para baixo tudo que vem depois: controles, log e banner de batalha.
   *
   * Com o log EXPANDIDO — que é como se assiste a uma rodada — o banner era
   * empurrado para fora da dobra justamente no momento em que ele passa a
   * valer. Relatado pelo dono do projeto.
   *
   * A coluna de ação fica com o que não muda de altura durante a rodada. O
   * cartão foi para a coluna da lista, abaixo da colocação, onde já existe um
   * elemento que cresce e encolhe — a própria lista — e onde ele fica ao lado
   * da decisão que acompanha: "em quem?" logo acima, "quanto?" logo abaixo. */
  s.teste('o cartão de aposta mora na coluna da lista, abaixo da colocação', () => {
    const lista = APP.indexOf('<div class="zona lista"');
    const cardLista = APP.indexOf('id="cardLista"');
    const cardAposta = APP.indexOf('id="cardAposta"');
    ok(lista > 0 && cardLista > lista, 'a `.zona lista` mudou de forma — refaça este teste');
    ok(cardAposta > cardLista,
      'o `#cardAposta` não está DEPOIS do `#cardLista`: a pergunta "quanto?" ' +
      'aparece antes de "em quem?"');
    const acao = APP.indexOf('<div class="zona acao"');
    const arena = APP.indexOf('<div class="zona arena"');
    ok(!(cardAposta > acao && cardAposta < arena),
      'o `#cardAposta` voltou para a coluna de ação. Ele some e volta com a ' +
      'fase, e ali cada aparição empurra o log e o banner de batalha para baixo.');
  });

  /* O outro lado: nada MAIS pode entrar naquela coluna com `hidden` dirigido
     por fase, ou o problema volta com outro nome. */
  s.teste('nada na coluna de ação aparece e some com a fase', () => {
    const acao = APP.indexOf('<div class="zona acao"');
    const arena = APP.indexOf('<div class="zona arena"');
    const trecho = APP.slice(acao, arena);
    const ids = [...trecho.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]);
    const zonaAcao = ler('../app/modules/zona-acao.mjs').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const id of ids)
      ok(!new RegExp(`\\$\\('#${id}'\\)[^\\n]*\\.hidden`).test(zonaAcao),
        `\`#${id}\` está na coluna de ação e é escondido por fase. Cada aparição ` +
        `dele desloca o log e o banner — foi por isso que o cartão de aposta saiu.`);
  });

  /* ═══ R35 · AS TRÊS MEDALHAS SÃO TRÊS MATIZES ══════════════════════════
   *
   * O dono do projeto: "o dourado da colocação e o bronze são praticamente
   * iguais, as cores estão sem graça e mortas". Estava certo:
   *
   *     1º  #3a2c05   oliva muito escuro
   *     3º  #33210f   marrom muito escuro
   *     2º  #262b35   cinza-azulado quase neutro
   *
   * Dois escuros dessaturados a poucos graus de matiz um do outro, e um
   * terceiro que era ausência de cor. Num gradiente que desbota para o painel,
   * a diferença entre o primeiro e o terceiro cabia dentro do ruído do JPEG da
   * arena atrás.
   *
   * ── POR QUE O TESTE MEDE, EM VEZ DE AFIRMAR O HEX ─────────────────────
   *
   * Afirmar `#ffd23f` congela a decoração e não guarda nada: qualquer troca de
   * paleta futura reprova sem que nada tenha piorado. O que precisa continuar
   * verdadeiro é a PROPRIEDADE — as três se distinguem — e isso é matiz e
   * croma, que se calculam.
   *
   * Os limiares vêm do problema: 25° de matiz é a distância em que duas cores
   * param de ser "a mesma cor um pouco diferente" para um olhar de meio
   * segundo; 25% de saturação é onde uma cor para de ser um cinza colorido. */
  const hex = h => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  /* Matiz e saturação de HSL, do jeito padrão. Trinta linhas a menos que uma
     dependência, e é conta fechada. */
  const hs = rgb => {
    const [r, g, b] = rgb.map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const l = (mx + mn) / 2;
    if (!d) return { h: null, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
    return { h, s, l };
  };
  const distanciaMatiz = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  /* A cor que IDENTIFICA a medalha é a borda inferior: é ela que o olho usa
     para ordenar a lista, e é a que não desbota no gradiente. */
  const bordaDoPodio = n => {
    const r = (APP.match(new RegExp(`^\\.pick\\.pod${n}\\{[^}]*\\}`, 'm')) || [''])[0];
    return (r.match(/border-bottom-color:\s*(#[0-9a-f]{6})/i) || [])[1];
  };

  s.teste('as três medalhas usam cor própria, e não o acento do tema', () => {
    for (const n of [1, 2, 3]) {
      const r = (APP.match(new RegExp(`^\\.pick\\.pod${n}\\{[^}]*\\}`, 'm')) || [''])[0];
      ok(r, `a regra \`.pick.pod${n}\` sumiu do CSS`);
      ok(!/var\(--gold\)/.test(r),
        `\`.pick.pod${n}\` usa \`var(--gold)\`. Naquele nome mora o ACENTO DO TEMA, ` +
        `que neste tema vale #00e5ff — ciano. O primeiro lugar não ficava dourado ` +
        `apagado: não ficava dourado nenhum. Medalha é cor literal, porque ouro ` +
        `continua ouro quando o tema muda.`);
    }
  });

  s.teste('ouro, prata e bronze são três matizes separados', () => {
    const cores = [1, 2, 3].map(n => {
      const c = bordaDoPodio(n);
      ok(c, `\`.pick.pod${n}\` não declara \`border-bottom-color\` em hex`);
      return { n, c, ...hs(hex(c)) };
    });
    for (const [a, b] of [[0, 1], [1, 2], [0, 2]]) {
      const d = distanciaMatiz(cores[a].h, cores[b].h);
      ok(d >= 25,
        `o ${cores[a].n}º (${cores[a].c}) e o ${cores[b].n}º (${cores[b].c}) estão a ` +
        `${d.toFixed(0)}° de matiz. Abaixo de 25° o olho lê "a mesma cor um pouco ` +
        `diferente" numa lista de doze linhas em movimento — que foi a queixa.`);
    }
  });

  s.teste('nenhuma das três é um cinza colorido', () => {
    for (const n of [1, 2, 3]) {
      const c = bordaDoPodio(n);
      const { s: sat } = hs(hex(c));
      ok(sat >= 0.25,
        `o ${n}º lugar está em ${c}, com ${(sat * 100).toFixed(0)}% de saturação. ` +
        `Abaixo de 25% a cor deixa de identificar a medalha e vira mais um tom ` +
        `de painel — foi assim que a prata ficou "sem graça e morta".`);
    }
  });

  /* O ouro precisa ser AMARELO, e não âmbar-escuro. É o pedido literal do dono
     do projeto — "voltado pro ouro, mais brilhante e amarelado" —, e é a única
     das três em que a direção foi especificada. */
  s.teste('o ouro é amarelo e claro, e não âmbar apagado', () => {
    const c = bordaDoPodio(1);
    const { h, l } = hs(hex(c));
    ok(h >= 38 && h <= 60,
      `o ouro está em ${h.toFixed(0)}° de matiz (${c}). Abaixo de 38° vira laranja ` +
      `e encosta no bronze; acima de 60° vira verde-limão.`);
    ok(l >= 0.5,
      `o ouro está com ${(l * 100).toFixed(0)}% de luminância (${c}), e o pedido ` +
      `foi "mais brilhante"`);
  });

  /* ═══ R39 · A RODADA SE DECIDE NUMA COLUNA SÓ ══════════════════════════
   *
   * Pedido do dono do projeto, com print: o quadro de "Iniciar rodada" riscado
   * na coluna da esquerda e desenhado abaixo de "SUA APOSTA".
   *
   * A razão é de leitura, e completa o que o R33 começou. A rodada se decide em
   * três perguntas — em quem, quanto, e quando começa — e as três estavam em
   * dois lados opostos da tela. Agora descem na ordem em que se responde.
   *
   * O R33 tirou a APOSTA daquela coluna porque ela aparece e some com a fase.
   * Os controles não somem, então não é esse o motivo aqui: é que eles
   * pertencem à mesma decisão que os outros dois. */
  s.teste('a coluna da lista responde quem, quanto e quando, nessa ordem', () => {
    const lista = APP.indexOf('<div class="zona lista"');
    const ordem = ['id="cardLista"', 'id="cardAposta"', 'id="cardControles"']
      .map(m => APP.indexOf(m));
    ok(lista > 0 && ordem.every(i => i > lista),
      'algum dos três cartões saiu da coluna da lista');
    ok(ordem[0] < ordem[1] && ordem[1] < ordem[2],
      'a ordem da coluna da direita não é lista → aposta → controles. O jogador ' +
      'responde "em quem", "quanto" e "quando começa" nessa sequência, e a tela ' +
      'precisa descer na mesma.');
  });

  /* O COMPORTAMENTO QUE O DONO DESCREVEU SAI DA ORDEM DO DOCUMENTO, e não de
     uma regra: o cartão de aposta some durante a luta e os controles sobem
     para debaixo da colocação sozinhos. Este teste guarda a ausência da regra —
     se alguém acrescentar um `style="order:"` ou posicionamento absoluto ali, o
     efeito passa a depender de duas coisas em vez de uma. */
  s.teste('a subida dos controles vem da ordem, e não de posicionamento', () => {
    const lista = APP.indexOf('<div class="zona lista"');
    const fim = APP.indexOf('</div>', APP.indexOf('id="cardControles"'));
    const trecho = APP.slice(lista, fim);
    for (const truque of ['order:', 'position:absolute', 'position:fixed'])
      ok(!trecho.includes(truque),
        `a coluna da lista usa \`${truque}\` para posicionar os cartões. A ordem ` +
        `do documento já faz os controles subirem quando a aposta some; com duas ` +
        `fontes de posição, elas divergem no primeiro layout novo.`);
  });

  return s;
}
