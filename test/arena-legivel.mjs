/* Q1/Q2/Q5 · O QUE SE LÊ DENTRO DA ARENA (R6)
 *
 * ── O PEDIDO, E O QUE A MEDIÇÃO DISSE SOBRE ELE ───────────────────────────
 *
 * "Os nomes na barra de HP e os balões de ataque dentro da arena estão pequenos
 *  demais para identificar o golpe. O modelo antigo tem tamanho confortável e
 *  serve de base."
 *
 * A segunda frase não se sustenta, e é melhor dizer isso do que fingir que sim.
 * As duas regras são BYTE A BYTE IDÊNTICAS nos dois modelos:
 *
 *     .plate .nm{...font-family:var(--px);font-size:6px;...}     atual e antigo
 *     .bubble  {...font-family:var(--px);font-size:7px;...}      atual e antigo
 *
 * "Voltar ao tamanho do modelo antigo" não mudaria um pixel. O que o dono
 * percebeu é real — o texto é pequeno demais —, mas a referência não é o
 * remédio. O requisito que vale é o da saída do bloco: **legível nas quatro
 * larguras do portão**.
 *
 * ── DE ONDE SAI O PISO ────────────────────────────────────────────────────
 *
 * Não de opinião. `6px` e `7px` são os DOIS MENORES textos voltados ao jogador
 * em todo o `index.html`; o terceiro menor é `.bnNv`, a `.55rem` ≈ 8,8px, e
 * ninguém reclamou dele. O piso é 9px, e ele é o menor tamanho que já existia
 * no produto sem queixa — não um número escolhido agora.
 *
 * O piso vale para texto que o jogador PRECISA identificar durante a luta:
 * o nome na barra de vida e o nome do golpe no balão. Números de dano flutuam
 * e somem; eles dizem magnitude, não identidade, e ficam de fora.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';

const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

/* 8,8px é o `.bnNv`, o menor texto do produto sobre o qual não houve queixa.
   Arredondado para cima: um piso não pode ser um empate. */
const PISO_PX = 9;

/* Todas as declarações de `font-size` dentro da regra de um seletor. Em `px`
   porque estes dois seletores usam `px` — a fonte de pixel é desenhada em
   múltiplos inteiros e `rem` a deixaria em tamanho fracionário. */
/* ── LÊ TAMANHO FIXO E TAMANHO ELÁSTICO (R25) ──────────────────────────────
 *
 * Antes só entendia `font-size:14px`. Quando o aviso de nocaute passou a ser
 * `clamp(14px, 3.2cqw, 22px)`, a busca não casava, `tamanhosDe` devolvia lista
 * vazia, e o teste acusava "a regra sumiu do index.html" — a regra estava lá, e
 * melhor do que antes.
 *
 * O QUE SE MEDE NUM `clamp` É O PISO. Ele é o menor tamanho que a regra pode
 * produzir, na tela mais estreita, e é justamente onde a legibilidade corre
 * risco. Medir o teto seria medir o caso fácil. */
function tamanhosDe(sel) {
  const m = APP.match(new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]*\\}`, 'm'));
  if (!m) return null;
  const fixos = [...m[0].matchAll(/font-size:\s*([\d.]+)px/g)].map(x => +x[1]);
  const pisos = [...m[0].matchAll(/font-size:\s*clamp\(\s*([\d.]+)px/g)].map(x => +x[1]);
  return [...fixos, ...pisos];
}

export function suite() {
  const s = criarSuite('arena-legivel');

  s.teste('o nome na barra de vida é legível', () => {
    const t = tamanhosDe('.plate .nm');
    ok(t && t.length, 'a regra de `.plate .nm` sumiu do index.html');
    ok(t[0] >= PISO_PX,
      `o nome na barra de vida está a ${t[0]}px, abaixo do piso de ${PISO_PX}px`);
  });

  s.teste('o nome do golpe no balão é legível', () => {
    const t = tamanhosDe('.bubble');
    ok(t && t.length, 'a regra de `.bubble` sumiu do index.html');
    ok(t[0] >= PISO_PX,
      `o nome do golpe está a ${t[0]}px, abaixo do piso de ${PISO_PX}px`);
  });

  /* A barra tem `overflow:hidden` e o nome tem `white-space:nowrap`: texto
     maior numa caixa da mesma altura é texto cortado ao meio na vertical. A
     altura tem de acompanhar, e o teste cobra a RELAÇÃO, não um número —
     `height` e `font-size` mudam juntos ou não mudam. */
  s.teste('a barra de vida cresce junto com o nome dentro dela', () => {
    const t = tamanhosDe('.plate .nm');
    const p = APP.match(/^\.plate\{[^}]*\}/m);
    ok(p, 'a regra de `.plate` sumiu do index.html');
    const h = +(p[0].match(/height:\s*(\d+)px/) || [])[1];
    ok(h, `a barra de vida perdeu a altura própria: ${p[0]}`);
    ok(h >= t[0] + 8,
      `a barra tem ${h}px para um nome de ${t[0]}px: o texto sai cortado`);
  });

  /* ACHADO AO OLHAR A CAPTURA, depois de a fonte crescer. `color:#000` sobre
     uma barra que o próprio `filter` escurece era preto no quase-preto — e a
     6px ninguém percebia, porque não dava para ler nada mesmo. Com o texto
     maior, o nome dos caídos passou a ser o único ilegível da grade, e "quem já
     caiu?" é uma pergunta que se faz olhando exatamente ali.
     O teste cobra a cor CLARA, e não a ausência do preto: sem declaração de cor
     o nome herdaria a do vivo, escura, e a asserção por ausência passaria —
     é a mesma armadilha que deixou o `S320` escapar no R4. */
  s.teste('o nome de quem caiu continua legível', () => {
    const r = APP.match(/^\.plate\.dead \.nm\{[^}]*\}/m);
    ok(r, 'a regra do nome do derrotado sumiu do index.html');
    const c = (r[0].match(/color:\s*#([0-9a-f]{6})/i) || [])[1];
    ok(c, `o nome do derrotado não declara cor própria: ${r[0]}`);
    /* Média dos canais: claro o bastante para sobreviver ao escurecimento do
       `filter`, que o portão de contraste não enxerga (ver L-038). */
    const media = [0, 2, 4].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0) / 3;
    ok(media > 140,
      `o nome do derrotado está em #${c} sobre uma barra escurecida: ilegível`);
    ok(/line-through/.test(r[0]), 'o risco saiu junto — ele é o que diz "caiu"');
  });

  /* O balão tem `white-space:nowrap` e flutua sobre o Pokémon. Texto maior sem
     respiro encosta na borda desenhada, e a borda é o que o separa do cenário
     atrás — sem ela o nome do golpe se mistura à arena. */
  s.teste('o balão do golpe tem respiro para o texto maior', () => {
    const m = APP.match(/^\.bubble\{[^}]*\}/m);
    ok(m, 'a regra de `.bubble` sumiu do index.html');
    const pad = (m[0].match(/padding:\s*(\d+)px\s+(\d+)px/) || []).slice(1).map(Number);
    ok(pad.length === 2, `o balão perdeu o padding próprio: ${m[0]}`);
    ok(pad[0] >= 5 && pad[1] >= 6,
      `o balão tem padding ${pad.join('/')}px para o texto maior: o nome encosta na borda`);
  });

  /* ═══ R15 · OS DOIS AVISOS QUE A ARENA DÁ EM MOMENTO CRÍTICO ═══════════
   *
   * O piso de 9px nasceu no R6 para o nome na barra de vida e o do golpe. Ele
   * vale para tudo que o jogador PRECISA ler dentro da arena, e havia mais dois
   * textos abaixo dele que o R6 não cobriu:
   *
   *     #koToast       7,5px   "Machamp foi nocauteado!"
   *     #koToast .ret  6,5px   "retornando à pokébola…"
   *
   * O aviso de nocaute é o único momento em que a arena fala DIRETAMENTE com
   * quem apostou — ele só dispara para o SEU lutador (ver `rodada.mjs`). Dizer
   * isso em 7,5px é dizer no tamanho em que não se lê.
   */
  /* O MINI LOG É TEXTO DA ARENA, e o piso vale para ele igual (R27).
     A primeira versão dele saiu em 8,5px — meio pixel abaixo do que o R6 mediu
     como o menor texto que a arena sustenta. Log que não se lê é log que não
     existe, e estaria ocupando espaço da luta para nada. */
  /* O AVISO QUEBRA LINHA EM VEZ DE ESTOURAR (R25).
     O `nowrap` de antes era seguro porque o texto era minúsculo. Com o tamanho
     legível, um nome comprido numa arena de 230px passa da borda — e o que sai
     do quadro não é lido nem quebrado: some. Preso a uma fração da largura da
     arena, ele quebra, e duas linhas legíveis valem mais que uma cortada. */
  s.teste('o aviso de nocaute quebra linha em vez de estourar a arena', () => {
    const r = (APP.match(/^#koToast\{[^}]*\}/m) || [''])[0];
    ok(r, 'a regra de `#koToast` sumiu do index.html');
    ok(!/white-space:\s*nowrap/.test(r),
      'o aviso voltou a `nowrap`. No tamanho legível de hoje, um nome comprido ' +
      'passa da borda da arena estreita — e o que sai do quadro não é lido.');
    ok(/max-width:/.test(r),
      'o aviso não tem largura máxima: sem ela, quebrar linha não impede o ' +
      'texto de ocupar a arena inteira');
  });

  s.teste('o mini log da arena é legível', () => {
    const t = tamanhosDe('#miniLog');
    ok(t && t.length, 'a regra de `#miniLog` sumiu do index.html');
    ok(t[0] >= PISO_PX,
      `o mini log está a ${t[0]}px, abaixo do piso de ${PISO_PX}px. Ele fica ` +
      `sobre a arena e disputa espaço com a luta: ilegível, ele só atrapalha.`);
  });

  s.teste('o aviso de nocaute é legível', () => {
    const t = tamanhosDe('#koToast');
    ok(t && t.length, 'a regra de `#koToast` sumiu do index.html');
    ok(t[0] >= PISO_PX,
      `o aviso de nocaute está a ${t[0]}px, abaixo do piso de ${PISO_PX}px — ` +
      `e ele é o único momento em que a arena fala direto com quem apostou`);
  });

  /* O PISO DE 9px NÃO ALCANÇA ESTE AVISO, e o Q2 provou no R30: o `S355` volta
   * o aviso para `9.5px` fixo e PASSAVA — por meio pixel.
   *
   * O piso de 9 foi calibrado para a FONTE DE PIXEL, que é desenhada em
   * múltiplos inteiros e se lê pequena. O aviso de nocaute saiu dessa fonte no
   * R25, justamente porque o dono do projeto disse que não se lia — e texto de
   * fonte normal a 9,5px não se lê em lugar nenhum.
   *
   * A asserção é sobre a CONSTRUÇÃO e não sobre um número: o aviso é ELÁSTICO,
   * com mínimo de texto de leitura. Tamanho fixo aqui é o defeito, seja ele
   * qual for — foi tamanho fixo que produziu o problema original. */
  s.teste('o aviso de nocaute é elástico, e não volta a tamanho fixo', () => {
    const r = (APP.match(/^#koToast\{[^}]*\}/m) || [''])[0];
    ok(r, 'a regra de `#koToast` sumiu do index.html');
    const cl = r.match(/font-size:\s*clamp\(\s*([\d.]+)px/);
    ok(cl,
      `o aviso de nocaute voltou a ter \`font-size\` fixo: ${
        (r.match(/font-size:[^;}]*/) || ['(nenhum)'])[0]}. ` +
      `Ele fica sobre a arena, que muda de largura — tamanho fixo é grande demais ` +
      `no celular ou pequeno demais no monitor, e foi assim que ele nasceu ilegível.`);
    ok(+cl[1] >= 14,
      `o mínimo do aviso é ${cl[1]}px. Ele não usa mais a fonte de pixel desde o ` +
      `R25, e texto de leitura abaixo de 14px não se lê à distância de uma arena.`);
  });

  /* A linha de apoio pode ser menor que o título — hierarquia é informação —,
     mas não pode cair abaixo do piso: ela é a que explica o que aconteceu. */
  s.teste('a segunda linha do aviso também é legível', () => {
    const t = tamanhosDe('#koToast .ret');
    ok(t && t.length, 'a regra de `#koToast .ret` sumiu do index.html');
    ok(t[0] >= PISO_PX - 1,
      `o "retornando à pokébola" está a ${t[0]}px, e o piso de apoio é ${PISO_PX - 1}px`);
  });

  /* ═══ R32 · MOVIMENTO REDUZIDO NÃO PODE APAGAR O CONTEÚDO ═══════════════
   *
   * Os avisos da arena vivem DENTRO da própria animação:
   *
   *     #koToast.show{animation:koToastIn 2.6s ease-out forwards}
   *     @keyframes koToastIn{ 0%{opacity:0} 10%{opacity:1} … 100%{opacity:0} }
   *
   * O último quadro é o estado escondido — é assim que o aviso some sozinho.
   * Zerar a duração com `forwards` faz a animação terminar no instante em que
   * começa, e o `forwards` segura o quadro 100%: o aviso NUNCA APARECE.
   *
   * Foi o que o R30 fez, ao trazer o reset padrão de acessibilidade para cá.
   * Aquele reset parte de uma premissa que não vale neste arquivo — a de que
   * animação é decoração. Medido, com a arena aberta:
   *
   *     movimento normal     #koToast pico 1,0   #streakToast pico 1,0
   *     movimento reduzido   #koToast pico 0     #streakToast pico 0
   *
   * A asserção é sobre a CONSTRUÇÃO e vale para qualquer aviso futuro: sob
   * movimento reduzido, nenhuma regra LARGA pode mexer na duração das
   * animações. Matar movimento perpétuo é `animation-iteration-count`, que não
   * encosta em animação finita. */
  s.teste('movimento reduzido não zera a duração das animações', () => {
    const blocos = [...APP.matchAll(/@media\s*\(prefers-reduced-motion[^)]*\)\s*\{([\s\S]*?)\n\}/g)]
      .map(m => m[1]);
    ok(blocos.length, 'sumiram os blocos de `prefers-reduced-motion` do index.html');
    for (const b of blocos) {
      /* Só as regras de seletor LARGO — `*`, `*::before`, `*::after`. Uma regra
         de seletor específico pode zerar a própria duração se souber o que está
         fazendo; o que não pode é decidir isso por toda a página. */
      const largas = [...b.matchAll(/(^|\})\s*([^{}]*\*[^{}]*)\{([^}]*)\}/g)];
      for (const [, , seletor, corpo] of largas)
        ok(!/animation-duration/.test(corpo),
          `a regra \`${seletor.trim()}\` zera \`animation-duration\` sob movimento ` +
          `reduzido. Animação aqui não é enfeite: ela é o ciclo de vida dos avisos, ` +
          `e com \`forwards\` a duração zerada os deixa presos no quadro final, ` +
          `que é o estado ESCONDIDO. Use \`animation-iteration-count\`.`);
    }
  });

  /* O outro lado da mesma moeda: a preferência PRECISA ser atendida. Sem esta
     asserção, "corrigir" o teste acima apagando o bloco inteiro passaria. */
  s.teste('movimento reduzido continua matando movimento perpétuo', () => {
    const blocos = [...APP.matchAll(/@media\s*\(prefers-reduced-motion[^)]*\)\s*\{([\s\S]*?)\n\}/g)]
      .map(m => m[1]).join('\n');
    ok(/animation-iteration-count:\s*1/.test(blocos),
      'nenhum bloco de movimento reduzido limita a repetição das animações — ' +
      'este arquivo declara mais de trinta animações `infinite`, e quem marca ' +
      '"reduzir movimento" no sistema está pedindo que elas parem');
  });

  /* ═══ R16 · O LETRADO DA CONTAGEM SEGUE O TEMA ═════════════════════════
   *
   * `3, 2, 1 · BATTLE!!` é o texto MAIOR da tela inteira, e era o único
   * desenhado fora do tema: sombra chapada em `#3b4cca` e `#b3300f` — azul e
   * vermelho de console de 8 bits, que é outra estética.
   *
   * Cor literal ali custa mais que o estilo: são DUAS variantes de tema, e o
   * azul continuaria azul na variante roxa. É o `S68` de novo, no maior texto
   * da tela.
   */
  /* COR E LETRADO SÃO DUAS PERGUNTAS, e o teste abaixo só faz a primeira.
   *
   * O `S410` troca a FONTE da contagem de volta para a de pixel e passava
   * limpo: ele não encosta no `text-shadow`, que é tudo que o teste seguinte
   * olha. O Q2 pegava isso pela linha de base visual — e no R30, quando a
   * captura deixou de fotografar a fase de contagem, o defeito ficou sem
   * captor nenhum.
   *
   * A lição é a de sempre aqui: quando um defeito só é pego por PIXEL, ele é
   * pego por acidente. Trocar a fonte move pixels, e por isso a linha de base
   * reclamava — mas ela nunca soube DIZER o que estava errado. */
  s.teste('a contagem regressiva usa o letrado do tema, e não a fonte de pixel', () => {
    const r = APP.match(/^#count\{[^}]*\}/m);
    ok(r, 'a regra de `#count` sumiu do index.html');
    const ff = (r[0].match(/font-family:\s*([^;}]*)/) || [])[1] || '';
    ok(ff.trim(), '`#count` não declara `font-family` — ele herda o que vier');
    ok(/--dsp/.test(ff),
      `a contagem está com \`font-family: ${ff.trim()}\`. ` +
      `\`3, 2, 1 · BATTLE!!\` é o maior texto da tela e o R16 o trouxe para o ` +
      `letrado do tema; a fonte de pixel é outra estética — retro e cyber não ` +
      `são a mesma coisa.`);
    ok(!/--px\b/.test(ff),
      `a contagem voltou para a fonte de pixel (\`${ff.trim()}\`)`);
  });

  s.teste('a contagem regressiva é desenhada com as cores do tema', () => {
    for (const sel of ['#count', '#count.go']) {
      const esc = sel.replace(/[.#]/g, m => '\\' + m);
      const r = APP.match(new RegExp(`^${esc}\\{[^}]*\\}`, 'm'));
      ok(r, `a regra de \`${sel}\` sumiu do index.html`);
      const sombra = (r[0].match(/text-shadow:([^;}]*)/) || [])[1] || '';
      ok(sombra.trim(), `\`${sel}\` perdeu o brilho`);
      ok(!/#[0-9a-f]{3,8}\b/i.test(sombra),
        `\`${sel}\` tem cor literal no brilho: "${sombra.trim()}" — ela não acompanha o tema`);
      ok(/var\(--/.test(sombra),
        `\`${sel}\` não usa token de tema no brilho: "${sombra.trim()}"`);
    }
  });


  /* ═══ A FICHA DA ARENA É ONDE SE DECIDE — L-110, bloco 1.27 ═════════════
   *
   * Cobrança do dono:
   *
   *   > "aumentar o quadro de colocação DA ARENA com odds, abates e etc.
   *   >  precisa ficar maior a visualização de escolha atualmente está muito
   *   >  reduzido para os padrão de zoom 100%"
   *
   * ── MEDIDO NO NAVEGADOR ANTES DE MEXER, a 1920×1022 ──────────────────────
   *
   *     a ficha       37 px de altura, 383 de largura
   *     a arte        22 px — não dá para reconhecer quem é
   *     o nome        13,1 px
   *     a chance      12,5 px
   *     a ODD         11,0 px    ← o número que DECIDE, e o terceiro menor
   *     o teto        9,6 px     ← o menor de todos
   *     a lista       442 px, com 362 px de espaço VAZIO abaixo dela
   *
   * O último número é o que fecha o caso: **a ficha não é pequena por falta de
   * lugar.** Havia um terço da tela sobrando embaixo dela.
   *
   *   > O que se lê para DECIDIR não pode ser menor que o que se lê de
   *   > passagem. A odd é a informação da qual a aposta inteira depende, e ela
   *   > estava em 11 px — menor que o nome, que só serve para reconhecer.
   *
   * E a L-112 é a mesma queixa pelo outro caminho: trinta segundos para ler
   * doze fichas em tipo miúdo é pedir que o jogador chute.
   */
  const tamanhoEm = (regra, prop = 'font-size') => {
    const escapado = regra.replace(/[.*+?^${}()|[\]\\]/g, m => '\\' + m);
    const m = new RegExp(escapado + '[^}]*?' + prop + ':\\s*([\\d.]+)px').exec(APP);
    return m ? Number(m[1]) : null;
  };

  s.teste('a ficha da arena cabe a decisão: nada do que decide é miúdo', () => {
    /* O PISO É 11 px, e ele não é gosto: é o tamanho abaixo do qual este
       projeto já reprovou texto duas vezes — a placa do mob (D-079) e o rótulo
       transbordando do V1.15. Aqui vale para TUDO que entra na decisão. */
    const alvos = {
      '.pick .p': 'a chance de vencer',
      '.pick .o': 'a ODD — o número de que a aposta inteira depende',
      '.pick .lim': 'o teto de aposta naquele lutador',
    };
    for (const [regra, oque] of Object.entries(alvos)) {
      const px = tamanhoEm(regra);
      ok(px != null, `não achei o tamanho de \`${regra}\` no CSS`);
      ok(px >= 11,
        `${oque} está com ${px}px. Medido no navegador antes do 1.27: a odd ` +
        'saía em 11 e o teto em 9,6, e o dono reprovou a tela inteira por isso');
    }
  });

  s.teste('a ODD não é menor que o NOME — quem decide vem antes de quem identifica', () => {
    /* Estava invertido: o nome em 13,1 e a odd em 11. O nome serve para
       reconhecer; a odd é a decisão. Uma hierarquia invertida ensina o olho a
       parar no lugar errado, e trinta segundos não perdoam isso. */
    const odd = tamanhoEm('.pick .o');
    const nome = tamanhoEm('.pick .n');
    ok(odd != null && nome != null, 'não achei os dois tamanhos no CSS');
    ok(odd >= nome,
      `a odd está com ${odd}px e o nome com ${nome}px: a hierarquia está ` +
      'invertida, e o olho para no que identifica em vez do que decide');
  });

  s.teste('a arte do lutador dá para reconhecer', () => {
    /* 22 px é o tamanho de um ícone de lista. Aqui ele é a CARA de quem se está
       apostando — e o projeto já pagou essa lição no chip de bioma: *"ao invés
       desse gif estático minúsculo [...] coloque em um tamanho legal, que a
       pessoa consiga identificar onde está o seu bicho"*. */
    const w = tamanhoEm('.pick img', 'width');
    ok(w != null, 'não achei a largura da arte da ficha');
    ok(w >= 30,
      `a arte da ficha tem ${w}px — no tamanho de um marcador de lista, e não ` +
      'no de um retrato que se reconhece de relance');
  });


  /* ═══ A APOSTA PASSA POR UMA CONFIRMAÇÃO — L-112, bloco 1.27 ════════════
   *
   * Pedido do dono:
   *
   *   > "adicione um botão de CONFIRMAR (verde) e ao lado um CANCELAR
   *   >  (vermelho) [...] ao selecionar agora é preciso confirmar logo, se você
   *   >  não confirmar outro jogador pode escolher o Pokémon que você estava
   *   >  querendo"
   *
   * ── E ELA É A MESMA LIÇÃO QUE A EXPEDIÇÃO JÁ PAGOU ──────────────────────
   *
   * O envio da expedição ganhou confirmação no 1.24, e pelo mesmo motivo: um
   * clique errado passa a custar caro demais para acontecer sem um segundo
   * gesto. Ali eram três criaturas e oito horas; aqui é o saldo.
   *
   *   > Um passo que funciona igual quando a coisa não existe não afirma que
   *   > ela existe — a lição do S-da-confirmação da expedição, e por isso o
   *   > teste cobra o CAMINHO e não só a presença do botão.
   */
  s.teste('escolher o lutador NÃO aposta: a confirmação está no caminho', () => {
    const js = readFileSync(new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    const clique = js.slice(js.indexOf("$('#pickList').addEventListener"),
                            js.indexOf("$('#pickList').addEventListener") + 400);
    ok(!/placeBet\(/.test(clique),
      'o clique no lutador ainda chama `placeBet` direto — a aposta acontece ' +
      'sem confirmação, e o dono pediu o contrário');
    ok(/selecionar|escolher/i.test(clique),
      'o clique não SELECIONA: sem seleção, não há o que confirmar');
  });

  s.teste('a confirmação tem os dois botões, e as duas cores', () => {
    ok(/id="btnConfirmarAposta"/.test(APP), 'não existe botão de confirmar');
    ok(/id="btnCancelarEscolha"/.test(APP), 'não existe botão de cancelar a escolha');
    /* VERDE e VERMELHO, e o dono foi explícito sobre isso. Duas ações opostas
       com a mesma cor é a forma mais barata de o clique errado acontecer. */
    ok(/\.btnConfirmarAposta\b[^}]*(--ok|--green)/.test(APP),
      'o botão de confirmar não é verde');
    ok(/\.btnCancelarEscolha\b[^}]*(--perigo|--red)/.test(APP),
      'o botão de cancelar não é vermelho');
  });

  s.teste('a janela de aposta é a MESMA no motor e no servidor', () => {
    /* Ela passou de 30 s para 40 s (L-112), e ela mora em DOIS lugares: o
       motor, que o cliente lê, e o scheduler, que manda de verdade. Dois
       números para a mesma janela divergem no dia em que um for mexido — e o
       jogador veria o relógio da tela discordar do momento em que a aposta
       fecha. */
    const eng = readFileSync(new URL('../engine/engine.mjs', import.meta.url), 'utf8');
    const sch = readFileSync(new URL('../server/scheduler.mjs', import.meta.url), 'utf8');
    const s1 = /BET_WINDOW:\s*(\d+)/.exec(eng);
    const s2 = /APOSTA:\s*([\d_]+)/.exec(sch);
    ok(s1 && s2, 'não achei a janela num dos dois lados');
    const seg = Number(s2[1].replace(/_/g, '')) / 1000;
    igual(Number(s1[1]), seg,
      `o motor diz ${s1[1]} s e o servidor diz ${seg} s — o relógio da tela ` +
      'discordaria do momento em que a aposta de verdade fecha');
    igual(Number(s1[1]), 40,
      'a janela deixou de ser 40 s. A H2 da Spec dizia 30, e o dono a reprovou ' +
      'na prática: a ficha era pequena demais para se ler em trinta segundos');
  });

  s.teste('a Spec NÃO ficou dizendo 30 s depois da mudança', () => {
    /* É o D-059: número em documento não se atualiza sozinho, e documento que
       envelhece passa a mentir. A L-112 mexe na Spec, e a Spec muda no MESMO
       commit, com o número velho ao lado do novo. */
    const spec = readFileSync(new URL(
      '../docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md', import.meta.url), 'utf8');
    const restos = spec.split('\n')
      .filter(l => /janela de 30 s|janela de 30 segundos|H2\. 30 segundos/.test(l));
    igual(restos.length, 0,
      `a Spec ainda diz 30 s em ${restos.length} lugar(es): "${restos[0]?.slice(0, 90)}"`);
  });


  /* ═══ `hidden` TEM DE ESCONDER — e ele não estava escondendo ════════════
   *
   * Cobrança do dono, com o vídeo do nosso próprio layout:
   *
   *   > "olha o último vídeo do nosso layout pra pré-selecionar: uma loucura,
   *   >  bagunça total, muito feio e confuso"
   *   > "uma confusão, não dá pra ver nada, tudo bagunçado e confuso"
   *
   * Medido no navegador, e a causa é de uma linha:
   *
   *     #idleRun         hidden=true, display:grid    ← a TELA DA RUN INTEIRA
   *     #confirmaAposta  hidden=true, display:flex
   *
   * `[hidden]{display:none}` e `.avPalco{display:grid}` têm a MESMA
   * especificidade, e quem vem depois na folha vence. A classe vinha depois.
   *
   *   > O atributo `hidden` é a promessa mais básica do HTML, e qualquer
   *   > classe com `display` a quebra sem avisar. Ninguém escreve
   *   > `.card{display:block}` pensando "isto vai revelar um painel escondido
   *   > do outro lado do arquivo" — e é exatamente o que acontece.
   *
   * É a MESMA FAMÍLIA do D-078, pela segunda vez: uma regra que só funciona
   * conforme a ordem em que ela caiu na folha.
   *
   * A correção é global e vale para sempre: `[hidden]` com `!important`. Ela é
   * o comportamento que todo mundo já supõe que existe.
   */
  s.teste('nenhuma classe de layout consegue anular o `hidden`', () => {
    const regra = /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(APP);
    ok(regra,
      'o `[hidden]` do CSS não é `!important`. Sem isso, QUALQUER regra com ' +
      '`display` e a mesma especificidade que venha depois na folha revela um ' +
      'painel escondido — foi assim que a tela da run inteira apareceu embaixo ' +
      'da tela de escolha, e o dono chamou de "bagunça total"');
  });

  /* ── A MOLDURA E A MÁSCARA DA ARENA (D-104) ──────────────────────────────
   *
   * Os defeitos `S492` e `S493` escaparam do Q2 de 15/09. Quem os pegava era a
   * digital de pixel da tela da arena, e ela saiu no D-099 — e saiu com a minha
   * afirmação de que não era "cobertura removida". Era.
   *
   * A lição não é devolver a digital, que abortava o portão. É que ela vinha
   * fazendo o trabalho de asserções que ninguém escreveu: ela pega por
   * ACIDENTE — qualquer pixel diferente reprova — o que deve ser pego de
   * propósito. Estas duas são de propósito, e dizem O QUE quebra.
   */
  s.teste('a arte de fundo é enquadrada pelo VISOR, e não recentrada', () => {
    const regra = APP.match(/#viewArena::before\{[^}]*\}/s);
    ok(regra, 'a regra do `#viewArena::before` sumiu — o teste perdeu a âncora');
    ok(!/background-position-x\s*:/.test(regra[0]),
      'o `#viewArena::before` ganhou um `background-position-x`. O enquadramento ' +
      'da arte vem do atalho `background`, que já põe o VISOR em 50.5% 53% — ' +
      'reposicionar em 50% centra a IMAGEM, e o visor não mora no centro dela. ' +
      'É o defeito S492, e ele escapou quando a digital de pixel saiu (D-099).');
    ok(/50\.5%\s+53%/.test(regra[0]),
      `o visor da arte mudou de lugar: "${regra[0].match(/background:[^;]*/)?.[0]}". ` +
      `Se a mudança é intencional, a máscara do ::after tem de acompanhar — as ` +
      `duas enquadram a MESMA imagem.`);
  });

  s.teste('a máscara do rosto tem RAIO, e não cobre a tela inteira', () => {
    const regra = APP.match(/#rqRosto::before\{[^}]*\}/s);
    ok(regra, 'a regra do `#rqRosto::before` sumiu — o teste perdeu a âncora');
    /* `radial-gradient(ellipse at X Y, ...)` é válido e o padrão é FARTHEST-CORNER:
       sem raio a máscara deixa de recortar o rosto e passa a valer a tela toda,
       e o `mix-blend-mode:screen` com opacidade .55 clareia tudo. */
    for (const prop of ['-webkit-mask-image', 'mask-image']) {
      /* `mask-image` casa DENTRO de `-webkit-mask-image`, e a primeira versão
         deste laço conferia a mesma linha duas vezes — a propriedade sem
         prefixo, que é a que o defeito muta, nunca era olhada. A âncora é o que
         separa as duas. */
      const ancora = prop.startsWith('-') ? prop : '(?<![-\\w])' + prop;
      const m = regra[0].match(new RegExp(ancora + ':radial-gradient\\(ellipse([^,]*),'));
      ok(m, `${prop} sumiu do \`#rqRosto::before\` — o teste perdeu a âncora`);
      /* O RAIO É O QUE VEM ANTES DO `at`, e a primeira versão deste teste errou
         exatamente aqui: ela exigia "algum dígito" na forma, e `ellipse at
         39.5% 21.5%` TEM dígitos — na POSIÇÃO. O defeito S493 passou verde por
         isso, no teste escrito para pegá-lo. Sexta ocorrência do padrão:
         asserção que mede o vizinho do que o nome promete. */
      const raio = m[1].split(/\bat\b/)[0].trim();
      ok(/\d/.test(raio),
        `o ${prop} virou "ellipse${m[1]}" — o raio sumiu e sobrou só a posição. ` +
        `O padrão do radial-gradient é farthest-corner, então a máscara deixa de ` +
        `recortar o rosto e passa a cobrir a tela inteira, com mix-blend-mode ` +
        `screen e opacidade .55 por cima. É o S493.`);
    }
  });

  return s;
}
