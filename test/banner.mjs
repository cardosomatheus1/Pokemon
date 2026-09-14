/* Q1 · BANNER DE BATALHA — catálogo de cosméticos, e o que a tela diz.
 *
 * O banner é vitrine, não regra: nada aqui muda preço, batalha ou saldo. O que
 * PODE estar errado, e errado em silêncio, é a ligação entre o que o jogador
 * escolheu e o que o CSS sabe desenhar.
 *
 * Cosmético escolhido sem classe correspondente não quebra o app — ele só não
 * aparece. O jogador salva "Chama", volta amanhã, e o nome dele está sem
 * efeito nenhum. É o modo de falha que nenhum teste de comportamento pega e
 * que o portão visual dilui, porque a diferença é um brilho num canto.
 */
import { existsSync, readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { BN_CENAS, BN_EFEITOS, BN_MOLDURAS, cosmeticoValido, vitrineDe } from '../app/modules/banner-dados.mjs';
import { rodapeIdle, duracaoCurta } from '../app/modules/banner-texto.mjs';
import { rodapeAposta } from '../app/modules/banner-texto.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const APP = ler('../app/index.html');

export function suite() {
  const s = criarSuite('banner');

  s.teste('todo cenário do catálogo tem classe .cn- no CSS', () => {
    const semCSS = BN_CENAS.filter(c => !new RegExp(`^\\.cn-${c.id}[{:]`, 'm').test(APP));
    ok(semCSS.length === 0,
      `${semCSS.length} cenário(s) escolhíveis e sem desenho: ${semCSS.map(c => c.id).join(', ')}. ` +
      `O jogador salva e o banner fica sem cenário.`);
  });

  s.teste('todo efeito de nome do catálogo tem classe .ef- no CSS', () => {
    const semCSS = BN_EFEITOS.filter(e => !new RegExp(`^\\.ef-${e.id}[{:]`, 'm').test(APP));
    ok(semCSS.length === 0,
      `${semCSS.length} efeito(s) escolhíveis e sem desenho: ${semCSS.map(e => e.id).join(', ')}`);
  });

  /* O outro sentido: classe sem entrada no catálogo é CSS que ninguém alcança.
     Não quebra nada, e é exatamente por isso que fica lá para sempre. */
  s.teste('nenhuma classe .cn-/.ef- sobra sem entrada no catálogo', () => {
    const noCSS = new Set([...APP.matchAll(/^\.(cn|ef)-([a-z]+)[{:]/gm)].map(m => m[1] + ':' + m[2]));
    const noCat = new Set([...BN_CENAS.map(c => 'cn:' + c.id), ...BN_EFEITOS.map(e => 'ef:' + e.id)]);
    const orfas = [...noCSS].filter(k => !noCat.has(k));
    ok(orfas.length === 0, `CSS sem entrada no catálogo: ${orfas.join(', ')}`);
  });

  s.teste('os ids são únicos e todo cosmético tem nome', () => {
    igual(new Set(BN_CENAS.map(c => c.id)).size, BN_CENAS.length, 'cenário com id repetido');
    igual(new Set(BN_EFEITOS.map(e => e.id)).size, BN_EFEITOS.length, 'efeito com id repetido');
    for (const c of [...BN_CENAS, ...BN_EFEITOS]) ok(c.nm && c.nm.length, `cosmético ${c.id} sem nome`);
  });

  /* Mesma lição do tema (S70): valor guardado que não existe mais não pode
     deixar a tela sem pele. Perfil de uma versão antiga, `localStorage`
     adulterado ou cosmético retirado da lista caem todos aqui. */
  s.teste('cosmético desconhecido cai no padrão, não no vazio', () => {
    igual(cosmeticoValido('cena', 'nao-existe'), BN_CENAS[0].id, 'cenário inválido não caiu no padrão');
    igual(cosmeticoValido('efeito', ''), BN_EFEITOS[0].id, 'efeito vazio não caiu no padrão');
    igual(cosmeticoValido('cena', 'poente'), 'poente', 'cenário válido foi trocado');
    igual(cosmeticoValido('efeito', 'trovao'), 'trovao', 'efeito válido foi trocado');
  });

  s.teste('os quatro cenários neon do V1.13 continuam no catálogo', () => {
    /* Eles chegaram com a identidade visual; sumir daqui seria perder arte
       nossa que já está no repositório. */
    for (const id of ['cidade', 'portal', 'nucleo', 'grade'])
      ok(BN_CENAS.some(c => c.id === id), `o cenário neon ${id} sumiu do catálogo`);
  });

  /* ═══ R10 · UMA ARTE, TRÊS ENQUADRAMENTOS ══════════════════════════════
   *
   * Havia DOIS catálogos de cenário para a mesma ideia:
   *
   *     .cn-*   dez cenas, escolhidas em "Banner de batalha — cenário".
   *             Vestem o banner da rodada E a faixa do topo, onde mora a
   *             carteira.
   *     .sc-*   oito gradientes, escolhidos em "Cenário do banner do perfil",
   *             e usados só ali.
   *
   * Duas escolhas para a mesma pergunta — "com que cara eu apareço?" — e o
   * jogador tinha de fazê-la duas vezes, com listas diferentes, para acabar
   * com dois visuais que nunca combinam. O `.sc-*` sai, e o perfil passa a
   * vestir a MESMA cena que o resto.
   *
   * O teste é nos dois sentidos, como o dos cosméticos acima: nenhuma classe
   * `.sc-` pode sobrar no CSS, e nenhum lugar pode continuar pedindo uma.
   */

  s.teste('o cenário do banner do perfil deixou de existir', () => {
    ok(!/id="pickScene"/.test(APP),
      'a grade de cenário do perfil continua na tela — são duas escolhas para a mesma pergunta');
    const orfas = [...APP.matchAll(/^\.sc-([a-z]+)[{:]/gm)].map(m => m[1]);
    ok(orfas.length === 0,
      `sobraram ${orfas.length} classe(s) .sc- no CSS que ninguém alcança: ${orfas.join(', ')}`);
  });

  /* A asserção é sobre a CONSTRUÇÃO, e não sobre a palavra. O comentário que
     explica por que o catálogo saiu precisa poder citá-lo pelo nome — proibir o
     nome proibiria a explicação, e código sem a explicação da remoção é como a
     remoção volta atrás. */
  s.teste('nenhum módulo ainda monta cenário de perfil por conta própria', () => {
    const custom = ler('../app/modules/customizacao.mjs');
    ok(!/sc-\$\{/.test(custom), 'ainda existe uma cena `.sc-` sendo montada');
    ok(!/const BANNER_SCENES|BANNER_SCENES\.map/.test(custom),
      'o segundo catálogo de cenário voltou ao `customizacao.mjs`');
    ok(!/dataset\.scene/.test(custom),
      'ainda existe um caminho de escolha de cenário do perfil');
  });

  /* A prova de que é UMA fonte: os três lugares que vestem cena pedem a mesma
     validação, do mesmo catálogo. Um deles com catálogo próprio seria o
     desenho antigo voltando com outro nome. */
  s.teste('os três enquadramentos vestem a mesma cena', () => {
    const alvos = [
      ['../app/modules/banner.mjs',       'o banner da rodada'],
      ['../app/modules/faixa.mjs',        'a faixa do topo, onde mora a carteira'],
      ['../app/modules/customizacao.mjs', 'o banner do perfil'],
    ];
    for (const [arq, oque] of alvos) {
      const src = ler(arq);
      ok(/cosmeticoValido\('cena'/.test(src),
        `${oque} não valida a cena pelo catálogo único`);
      ok(/cn-/.test(src), `${oque} não veste uma cena \`.cn-\``);
    }
  });

  /* ═══ R3 · O BANNER SAI DO PERFIL E VAI PARA A RODADA ═══════════════════
   *
   * O banner é do jogador NA RODADA, e só aparecia ao abrir o perfil e entrar
   * na aba de customização — onde ninguém está enquanto a luta acontece. No
   * lugar dele, na zona de ação, havia o cartão `SEU LUTADOR`, que mostrava as
   * mesmas informações num formato pior E SEM CSS NENHUM: as seis classes que
   * ele usava (`ml-topo`, `ml-hp`, `ml-id`, `ml-linha`, `ml-est`, `ml-mon`)
   * não existiam na folha de estilo. A barra de vida dele era uma `<div>` com
   * largura, sem altura e sem cor — ou seja, invisível. Ver `D-028`.
   *
   * Os dois trocam de lugar. E "trocar de lugar" tem de significar que NADA se
   * perde: o cartão dizia valor apostado, retorno possível, odd, vida e
   * colocação, e o rodapé do banner só dizia valor e odd.
   */

  /* O rodapé é a única parte do banner que AFIRMA algo verificável — o resto é
     cosmético. Por isso ele virou função pura, fora do módulo que toca DOM: dá
     para perguntar "o retorno mostrado é o retorno certo?" sem navegador. */
  s.teste('o rodapé do banner mostra valor apostado, retorno possível e odd', () => {
    const r = rodapeAposta({ nome: 'Blastoise', valor: 250, odd: 5.25, pos: 3, total: 12, hp: 42, vivo: true });
    ok(/250/.test(r), `o valor apostado não aparece: ${r}`);
    ok(/1\.312|1312/.test(r), `o retorno possível não aparece: ${r}`);
    ok(/x5\.25/.test(r), `a odd não aparece: ${r}`);
  });

  s.teste('o retorno do rodapé é o piso de valor × odd', () => {
    /* 250 × 5,25 = 1312,5. Arredondar para cima mostraria um retorno que o
       jogador não recebe — o pagamento usa piso. */
    const r = rodapeAposta({ nome: 'X', valor: 250, odd: 5.25, pos: 1, total: 12, hp: 100, vivo: true });
    ok(/1\.312/.test(r) && !/1\.313/.test(r), `o retorno não é o piso: ${r}`);
  });

  s.teste('o rodapé carrega a vida e a colocação que o cartão antigo mostrava', () => {
    const vivo = rodapeAposta({ nome: 'Golem', valor: 100, odd: 2, pos: 3, total: 12, hp: 84, vivo: true });
    ok(/3º de 12/.test(vivo), `a colocação sumiu: ${vivo}`);
    ok(/84% de vida/.test(vivo), `a vida sumiu: ${vivo}`);
    const morto = rodapeAposta({ nome: 'Golem', valor: 100, odd: 2, pos: 9, total: 12, hp: 0, vivo: false });
    ok(/K\.O\./.test(morto), `o K.O. sumiu: ${morto}`);
  });

  /* Na aposta a luta ainda não começou: não há colocação nem vida, e inventar
     "1º de 12" ali seria informação falsa na tela. */
  s.teste('antes da luta o rodapé não inventa colocação nem vida', () => {
    const r = rodapeAposta({ nome: 'Jynx', valor: 50, odd: 15.5 });
    ok(!/º de/.test(r) && !/% de vida/.test(r), `o rodapé inventou estado de luta: ${r}`);
    ok(/50/.test(r) && /x15\.50/.test(r), `a aposta sumiu na fase de aposta: ${r}`);
  });

  s.teste('vitória e derrota continuam com a linha delas', () => {
    const v = rodapeAposta({ nome: 'Mew', valor: 200, odd: 3, desfecho: 'venceu' });
    ok(/venceu/.test(v) && /600/.test(v), `a linha de vitória mudou: ${v}`);
    const p = rodapeAposta({ nome: 'Mew', valor: 200, odd: 3, pos: 7, total: 12, desfecho: 'perdeu' });
    ok(/7º/.test(p) && /200/.test(p), `a linha de derrota mudou: ${p}`);
  });

  /* A ARMADILHA DESTE BLOCO, e ela é de spoiler, não de layout.
   *
   * `S.battle.events` é a batalha JÁ RESOLVIDA em memória — o replay só a
   * revela aos poucos. A `minhaPosBanner`, que existia antes, percorre a lista
   * inteira, e está certa no lugar dela: o fim da rodada, onde tudo já foi
   * jogado. Reusá-la para a colocação AO VIVO mostraria no rodapé a posição
   * FINAL do lutador enquanto a luta ainda corre — o banner entregaria o
   * resultado que o jogador está assistindo para descobrir.
   *
   * A asserção é ESTREITA de propósito: ela cobra a fatia por `S.evPtr` no
   * texto da função. Não há como perguntar isto por comportamento sem montar
   * uma batalha inteira, e um teste estreito e honesto vale mais que um largo
   * que erra — mesma lição do teste do botão de proteção, no R1. */
  s.teste('a colocação ao vivo não lê eventos que o jogador ainda não viu', () => {
    const src = readFileSync(new URL('../app/modules/banner.mjs', import.meta.url), 'utf8');
    const fn = src.match(/function minhaPosAgora\(\)\s*\{[\s\S]*?\n\}/);
    ok(fn, 'a `minhaPosAgora` sumiu do banner.mjs');
    ok(/events\.slice\(0,\s*S\.evPtr\)/.test(fn[0]),
      'a colocação ao vivo passou a ler a batalha inteira: o banner entrega o final');
  });

  /* A OUTRA METADE, e esta o passo de olhar pegou depois de a suíte ficar verde.
   *
   * O cartão `SEU LUTADOR` contava sozinho: para quem ainda estava de pé ele
   * caía em "quantos continuam vivos" e escrevia `10º de 12` — enquanto o painel
   * de COLOCAÇÃO, a dois centímetros dali, dizia `6º` para o mesmo lutador. Dois
   * números com o mesmo rótulo, discordando na mesma tela.
   *
   * É a divergência que o `colocacao.mjs` foi escrito para impedir; o cabeçalho
   * dele diz "UMA FONTE DE VERDADE, e é a razão de este arquivo existir". */
  s.teste('a colocação do banner sai do mesmo quadro que o painel desenha', () => {
    const src = readFileSync(new URL('../app/modules/banner.mjs', import.meta.url), 'utf8');
    const fn = src.match(/function minhaPosAgora\(\)\s*\{[\s\S]*?\n\}/);
    ok(fn && /rankingColocacao\(/.test(fn[0]),
      'o banner voltou a contar a colocação sozinho: dois números discordando na mesma tela');
  });

  /* --- e a aba antiga deixa de existir ---------------------------------- */

  s.teste('o banner de batalha mora na zona de ação, e não dentro do perfil', () => {
    const i = APP.indexOf('id="battleBanner"');
    ok(i > 0, 'o `#battleBanner` sumiu do index.html');
    const zona = APP.indexOf('<div class="zona acao"');
    const arena = APP.indexOf('<div class="zona arena"');
    ok(zona > 0 && arena > zona, 'as zonas de ação e arena mudaram de forma — refaça este teste');
    ok(i > zona && i < arena,
      'o `#battleBanner` não está na zona de ação: ele é do jogador NA RODADA');
  });

  s.teste('a aba SEU LUTADOR deixou de existir', () => {
    ok(!/id="cardMeu"/.test(APP), 'o `#cardMeu` continua no index.html');
    ok(!/id="meuLutador"/.test(APP), 'o `#meuLutador` continua no index.html');
    ok(!existsSync(new URL('../app/modules/meu-lutador.mjs', import.meta.url)),
      'o `meu-lutador.mjs` continua no disco — módulo órfão é código que ninguém mantém');
  });

  /* O cartão sumiu, mas a linha que ele carregava não podia sumir junto: as
     fichas de aposta, o campo de valor e o botão de apostar são controles
     MORTOS durante a luta, e controle morto ocupando a coluna nobre foi o
     motivo original de o cartão `SEU LUTADOR` ter nascido.
     ESTE TESTE NASCEU DE UM ESCAPE: o defeito `S312` planta exatamente isso e o
     Q2 o devolveu `[PASSOU]`. A linha de base visual não captura a tela EM
     LUTA — ela fotografa a fase de aposta —, então não havia quem visse fichas
     sobrando durante a batalha. */
  s.teste('as fichas de aposta somem durante a luta', () => {
    const src = readFileSync(new URL('../app/modules/zona-acao.mjs', import.meta.url), 'utf8');
    const linha = src.match(/aposta\.hidden\s*=\s*[^;]+;/);
    ok(linha, 'a zona de ação deixou de esconder o cartão de aposta');
    ok(/'fighting'/.test(linha[0]) && /'result'/.test(linha[0]),
      `as fichas ficam na tela durante a luta: ${linha[0]}`);
  });

  /* O banner passou a existir DUAS vezes: o vivo, na rodada, e a prévia na aba
     de customização — sem ela o jogador escolheria cena e efeito às cegas.
     Regra de `id` não alcança os dois, então o desenho é por CLASSE. */
  s.teste('o desenho do banner é por classe, para alcançar a prévia também', () => {
    const previa = /id="battleBannerPrevia"/.test(APP);
    ok(previa, 'a prévia do banner sumiu da aba de customização');
    const porId = [...APP.matchAll(/^#battleBanner[.{ ]/gm)];
    ok(porId.length === 0,
      `${porId.length} regra(s) de CSS ainda presas ao id — a prévia fica sem desenho`);
    ok(/^\.battle-banner\{/m.test(APP), 'não existe regra `.battle-banner` no CSS');
  });

  /* ═══ R37b · O RETRATO NÃO PODE SER ESTICADO ATÉ PREENCHER A CAIXA ══════
   *
   * Relato do dono do projeto, em duas partes: "alguns Pokémon estão com os
   * GIFs maiores que os outros" e, depois, "não fique com tamanho tão grande,
   * esteticamente não ficou legal".
   *
   * A causa é uma linha de CSS. `.bnMon` tinha `width`/`height` fixos mais
   * `object-fit:contain`, e `contain` faz TODA imagem preencher a caixa. Como
   * os GIFs do pack vão de 31 px a 117 px de altura, a AMPLIAÇÃO é que variava:
   *
   *     Nidoran♀   35x34    esticado 3,37x
   *     Pidgeotto  82x117   esticado 1,01x
   *
   * O sprite pequeno virava o maior da tela, e em pixel grosso — ampliar 3,4x
   * um desenho de 35 px mostra o pixel.
   *
   * O teste é sobre a CONSTRUÇÃO porque o sintoma não cabe em asserção de
   * comportamento: a tela abre, o retrato aparece, e o que está errado é o
   * tamanho dele em relação aos outros. */
  s.teste('o retrato do banner tem teto, e não tamanho fixo', () => {
    const r = (APP.match(/^\.bnMon\{[^}]*\}/m) || [''])[0];
    ok(r, 'a regra `.bnMon` sumiu do index.html');
    ok(/max-width:\s*\d+px/.test(r) && /max-height:\s*\d+px/.test(r),
      `\`.bnMon\` não declara teto: ${r.replace(/\s+/g, ' ')}`);
    ok(!/(^|;)\s*width:\s*\d+px/.test(r) && !/(^|;)\s*height:\s*\d+px/.test(r),
      'o retrato voltou a ter tamanho FIXO. Com `object-fit:contain`, tamanho ' +
      'fixo faz toda imagem preencher a caixa — e a ampliação passa a variar de ' +
      '1x a 3,4x conforme o sprite, que foi a queixa.');
  });

  s.teste('a medição do retrato limita a ampliação e o teto', () => {
    const src = ler('../app/modules/banner.mjs');
    const fator = src.match(/const RETRATO_FATOR = ([\d.]+);/);
    const caixa = src.match(/const RETRATO_CAIXA = (\d+);/);
    ok(fator && caixa, 'as constantes do tamanho do retrato sumiram do banner.mjs');
    ok(+fator[1] > 1 && +fator[1] <= 2,
      `a ampliação máxima é ${fator[1]}x. Acima de 2x o pixel do sprite pequeno ` +
      `aparece; igual ou abaixo de 1x o retrato some na caixa.`);
    ok(+caixa[1] <= 110,
      `o teto do retrato é ${caixa[1]}px. O pedido foi "não fique com tamanho tão ` +
      `grande" — acima disso ele volta a disputar a caixa com o rodapé.`);
    /* O FATOR É O MENOR DOS DOIS, sempre. Usar só o fator deixaria o Pidgeotto
       de 117 px estourar o banner; usar só o teto seria o `contain` de novo. */
    ok(/Math\.min\(RETRATO_FATOR,\s*RETRATO_CAIXA \/ Math\.max\(/.test(src),
      'a medição não combina o fator com o teto — um sozinho reintroduz o defeito');
  });

  /* A imagem que veio do CACHE já disparou o `load` antes de o ouvinte existir.
     Sem o ramo do `complete`, o retrato ficaria no tamanho da folha para sempre
     — e o defeito voltaria só para quem já tinha o GIF em disco, que é
     exatamente quem joga há mais tempo. */
  s.teste('a medição alcança a imagem que já estava em cache', () => {
    const src = ler('../app/modules/banner.mjs');
    ok(/if \(img\.complete\) medir\(\)/.test(src),
      'a medição só escuta `load`. Imagem em cache não dispara `load` depois do ' +
      'ouvinte, e o retrato fica sem medição — o defeito volta só para quem já ' +
      'tem o arquivo em disco.');
  });

  /* ═══ R38 · O COSMÉTICO ESCOLHIDO CONTINUA ANIMANDO ════════════════════
   *
   * O R29 pôs `[class*="ef-"]{animation:none}` sob movimento reduzido e
   * congelou os doze efeitos de nome. O dono do projeto relatou: "os efeitos de
   * Glitch, Holograma e Chama sumiram, as cores estão estáticas".
   *
   * Foi o SEGUNDO sintoma dele que só existe com a preferência ligada, depois
   * dos avisos do D-042 — e é o que confirmou que a preferência está ativa na
   * máquina dele.
   *
   * A REGRA É A MESMA QUE O PROJETO JÁ APLICA À COR desses efeitos. O
   * `test/tema.mjs` abre exceção para `.cn-*` e `.ef-*` na varredura de cor
   * solta, com esta justificativa escrita: "um efeito Neon que muda de cor com
   * o tema deixa de ser o efeito que a pessoa escolheu". Movimento é a outra
   * metade da identidade — um Glitch que não falha não é um Glitch.
   *
   * Decisão do dono do projeto, perguntada e respondida. A preferência continua
   * governando movimento AMBIENTE; o que ela deixa de apagar é a única coisa da
   * tela que o jogador escolheu de propósito. */
  /* SEM COMENTÁRIO, e a primeira versão deste teste caiu nisso: a explicação
     acima cita `[class*="ef-"]{animation:none}` pelo nome, para dizer o que foi
     removido — e o teste casou com a própria explicação. Proibir o nome
     proibiria a explicação, e é a quarta vez que este projeto encontra a mesma
     armadilha (`test/banner.mjs` no R10, `test/shiny-arena.mjs` no R34,
     `test/tema.mjs` no R35). */
  const semComentario = APP.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const guardasDoMovimento = () =>
    [...semComentario.matchAll(/@media \(prefers-reduced-motion[^)]*\)\{([\s\S]*?)\n\}/g)]
      .map(m => m[1]).join('\n');

  s.teste('os efeitos de nome não são congelados por movimento reduzido', () => {
    const guardas = guardasDoMovimento();
    ok(!/\[class\*="ef-"\][^{]*\{[^}]*animation:\s*none/.test(guardas),
      'os efeitos de nome voltaram a ser congelados por `animation:none` sob ' +
      'movimento reduzido. Eles são o cosmético que o jogador ESCOLHEU — ' +
      'apagá-los é apagar a escolha dele, não movimento ambiente.');
    ok(/\[class\*="ef-"\][\s\S]{0,120}animation-iteration-count:\s*infinite\s*!important/.test(guardas),
      'os efeitos de nome não estão isentos do teto de repetição. O reset ' +
      'universal limita tudo a uma volta, e sem a isenção eles dão uma volta e param.');
  });

  /* O `holo` anima num `::after` — a varredura que atravessa o nome. O reset
     universal alcança pseudo-elemento e a isenção do ELEMENTO não, então sem
     esta linha ele era o único dos doze que continuava parado. Medido: onze
     animando, um não. */
  s.teste('a isenção alcança os pseudo-elementos dos efeitos', () => {
    /* Também sem comentário, e aqui o motivo é mais sutil que no teste acima:
       a explicação MENCIONA `::after` ao contar por que o Holograma ficava
       parado. Lendo o arquivo com comentários, este teste passaria com a regra
       apagada — bastava a frase existir. */
    const guardas = guardasDoMovimento();
    for (const pseudo of ['::before', '::after'])
      ok(new RegExp(`\\[class\\*="ef-"\\]${pseudo}`).test(guardas),
        `a isenção não cobre \`[class*="ef-"]${pseudo}\`. O efeito Holograma anima ` +
        `no \`::after\`, e o reset universal o alcança mesmo com o elemento isento.`);
  });

  /* Os quatro do R38 animam propriedades DIFERENTES das dos oito antigos — se
     todos animassem o mesmo halo pulsante, "estilo novo" seria "outra cor do
     mesmo efeito", que é o oposto do pedido. */
  s.teste('os efeitos novos animam propriedades diferentes entre si', () => {
    const alvo = {
      aurora: /background-position/,   // o gradiente desliza
      pulso:  /transform:\s*scale/,    // a caixa respira
      ouro:   /background-position/,   // o brilho varre dentro do glifo
      abismo: /inset .*rgba\(0,0,0/,   // a sombra afunda
    };
    for (const [id, re] of Object.entries(alvo)) {
      const nome = 'ef' + id[0].toUpperCase() + id.slice(1);
      const kf = APP.match(new RegExp(`@keyframes ${nome}\\{[^}]*\\}[^}]*\\}?`, 'm'));
      ok(kf, `os quadros de \`${nome}\` sumiram do CSS`);
      ok(re.test(kf[0]),
        `\`${nome}\` não anima o que o catálogo promete: ${kf[0].replace(/\s+/g, ' ').slice(0, 90)}`);
    }
    /* O Ouro recorta o brilho no próprio glifo — é o que o faz parecer metal em
       vez de caixa iluminada, e é a única forma de ele não ser "mais um halo". */
    ok(/\.ef-ouro[^{]*\{[^}]*background-clip:\s*text/.test(APP),
      'o efeito Ouro perdeu o recorte no texto e virou mais uma caixa acesa');
  });


  /* ═══ R40 · AS MOLDURAS DE AVATAR ═══════════════════════════════════════
   *
   * O retrato do banner era a única foto sem moldura do produto. O que estes
   * testes protegem não é a beleza do aro — é a LIGAÇÃO entre o que o jogador
   * escolheu e o que o CSS sabe desenhar, e a fronteira entre o aro e o
   * enquadramento da foto, que tem dono diferente desde o R37b. */

  s.teste('toda moldura do catálogo tem classe .md- no CSS', () => {
    const semCSS = BN_MOLDURAS.filter(m => !new RegExp(`^\\.md-${m.id}[{:>]`, 'm').test(APP));
    ok(semCSS.length === 0,
      `${semCSS.length} moldura(s) escolhíveis e sem desenho: ${semCSS.map(m => m.id).join(', ')}. ` +
      `O jogador salva e o avatar volta a ser o quadrado sem borda.`);
  });

  s.teste('toda classe .md- do CSS está no catálogo', () => {
    /* A DIREÇÃO CONTRÁRIA IMPORTA TANTO QUANTO: classe desenhada e fora do
       catálogo é trabalho que ninguém consegue equipar, e é a pista falsa que
       faz o próximo bloco achar que a moldura já existe. */
    const noCSS = [...new Set([...semComentario.matchAll(/^\.md-([a-z]+)[{:>]/gm)].map(m => m[1]))];
    const orfas = noCSS.filter(id => !BN_MOLDURAS.some(m => m.id === id));
    ok(orfas.length === 0,
      `${orfas.length} classe(s) desenhadas e não escolhíveis: ${orfas.join(', ')}.`);
  });

  s.teste('a moldura guarda contra id que não existe mais', () => {
    /* Mesma guarda do tema (S70). `undefined` entra aqui de verdade: todo
       perfil salvo antes do R40 chega sem `moldura`, e é esta linha que evita
       uma migração de dados só para isso. */
    igual(cosmeticoValido('moldura', 'nao-existe'), BN_MOLDURAS[0].id,
      'id desconhecido tinha de cair no padrão');
    igual(cosmeticoValido('moldura', undefined), BN_MOLDURAS[0].id,
      'perfil anterior ao R40 chega sem moldura e não pode ficar sem pele');

    /* ── O ID PRECISA SER EXCLUSIVO DA LISTA DE MOLDURAS ──────────────────
     *
     * A primeira versão deste teste usava `'ouro'`, e o defeito S490 passou
     * por cima dele sem acordar ninguém: doze dos dezoito ids de moldura são
     * os MESMOS dos efeitos de nome, e `BN_MOLDURAS[0]` e `BN_EFEITOS[0]` são
     * ambos `neon`. Com a ramificação da moldura removida, a função caía em
     * `BN_EFEITOS` e devolvia exatamente as mesmas respostas — três asserções
     * verdes sobre uma guarda que não existia mais.
     *
     * Um id que só existe nas molduras é o que separa as duas listas. */
    const soDaMoldura = BN_MOLDURAS.find(m => !BN_EFEITOS.some(e => e.id === m.id));
    ok(soDaMoldura, 'o catálogo de molduras precisa ter ao menos um id próprio, ' +
      'senão nenhum teste consegue distinguir as duas listas');
    igual(cosmeticoValido('moldura', soDaMoldura.id), soDaMoldura.id,
      `"${soDaMoldura.id}" só existe nas molduras: se a função devolver outra coisa, ` +
      'ela está consultando o catálogo errado');
  });

  s.teste('nenhuma moldura mexe no tamanho ou no recorte do retrato', () => {
    /* A REGRESSÃO CARA, e a razão de o R40 separar aro de enquadramento. O
       R37b calculou o tamanho do retrato medindo a dimensão natural do GIF;
       uma moldura que declare `width`, `height` ou `object-fit` desfaz aquele
       cálculo EM SILÊNCIO — a foto continua aparecendo, só que errada.
       `border-radius` é permitido: é o aro, não o enquadramento. */
    const proibido = /(^|;)\s*(width|height|object-fit|object-position)\s*:/;
    const ofensoras = [];
    for (const m of BN_MOLDURAS) {
      const achou = semComentario.match(
        new RegExp(`^\\.md-${m.id}\\s*>\\s*\\.bnTreinador\\{([^}]*)\\}`, 'm'));
      if (achou && proibido.test(achou[1])) ofensoras.push(m.id);
    }
    ok(ofensoras.length === 0,
      `${ofensoras.length} moldura(s) mexendo no retrato: ${ofensoras.join(', ')}. ` +
      `O aro é da moldura; o enquadramento é do .bnTreinador (R37b).`);
  });

  s.teste('a âncora do retrato mora na moldura, e só nela', () => {
    /* Antes do R40 o `.bnTreinador` carregava `position:absolute;left;bottom`.
       Agora quem carrega é o `.bnMold`, e o retrato preenche o pai. Com os
       dois carregando, o retrato sai do lugar DENTRO da moldura — e nenhum
       teste de comportamento vê isso. */
    const mold = semComentario.match(/\.bnMold\{([^}]*)\}/);
    ok(mold && /position:absolute/.test(mold[1]),
      '.bnMold precisa ser quem ancora o retrato no canto do banner');
    const retrato = semComentario.match(/\.bnMold>\.bnTreinador\{([^}]*)\}/);
    ok(retrato && /position:static/.test(retrato[1]),
      '.bnTreinador dentro da moldura precisa voltar a ser estático');
    const solto = semComentario.match(/\n\.bnTreinador\{([^}]*)\}/);
    ok(solto && !/position:absolute/.test(solto[1]),
      'o .bnTreinador solto não pode voltar a se ancorar sozinho');
  });

  s.teste('a moldura escolhida continua animando com movimento reduzido', () => {
    /* MESMA DECISÃO DO R38, E PELO MESMO ARGUMENTO ESCRITO: cosmético
       ESCOLHIDO anima sempre. Um Circuito Vivo que não pulsa é o Circuito, que
       já existe ao lado dele no catálogo como opção separada — e é por isso
       que o catálogo tem pares: quem não quer movimento equipa uma das seis
       estáticas, em vez de receber a animada mutilada. */
    const guardas = guardasDoMovimento();

    /* ── CADA SELETOR, UM POR UM ─────────────────────────────────────────
     *
     * A primeira versão perguntava se `.bnMold` aparecia em ALGUM lugar da
     * isenção, e o defeito S485 passou: ele renomeava dois dos quatro
     * seletores, os outros dois continuavam lá, e a asserção seguia verde
     * enquanto metade da moldura congelava. É o mesmo buraco que o S479
     * abriu nos efeitos de nome — reset universal alcança pseudo-elemento e
     * filho, e a isenção precisa alcançar todos eles também. */
    for (const alvo of ['.bnMold', '.bnMold::before', '.bnMold::after',
                        '.bnMold>.mdFio', '.bnMold>.mdFio::after'])
      ok(guardas.includes(alvo + ',') || guardas.includes(alvo + '{'),
        `"${alvo}" ficou de fora da isenção: essa parte da moldura vai congelar ` +
        `enquanto o resto continua animando`);
    ok(/animation-iteration-count:\s*infinite/.test(guardas),
      'a isenção existe mas não declara repetição infinita');
    ok(!/\.bnMold[^{]*\{[^}]*animation:\s*none/.test(guardas),
      'movimento reduzido não pode ZERAR a animação da moldura (D-042): um quadro ' +
      '`forwards` congelado no último passo apaga a moldura em vez de parar');
  });

  s.teste('os ângulos das molduras que giram são declarados', () => {
    /* Sem `@property` o navegador trata a variável como TEXTO: ela salta de
       0deg para 360deg num passo só, e Holograma, Trovão, Marquise e Circuito
       Vivo ficam parados — parados e VERDES em qualquer teste estático. */
    for (const v of ['--mdAng', '--mdAng2', '--mdAng3'])
      ok(new RegExp(`@property\\s+${v}\\s*\\{[^}]*<angle>`).test(semComentario),
        `${v} anima ângulo e não foi declarada: a moldura que a usa não gira`);
  });

  s.teste('o banner envolve o retrato na moldura, e não o põe ao lado', () => {
    const BANNER = ler('../app/modules/banner.mjs').replace(/\/\*[\s\S]*?\*\//g, ' ');
    ok(/class="bnMold md-\$\{moldura\}"/.test(BANNER),
      'o banner precisa envolver o retrato numa caixa com a classe da moldura');

    /* ── DENTRO, E NÃO APENAS DEPOIS ─────────────────────────────────────
     *
     * A primeira versão comparava só as posições de abertura e do retrato, e
     * o defeito S487 passou por cima: `<span …></span>${retratoTreinador}`
     * também tem a moldura ANTES do retrato, e desenha o aro vazio ao lado da
     * foto. "Depois de abrir" não é "dentro"; o que prova o envolvimento é o
     * FECHAMENTO vir depois do retrato. */
    const abre  = BANNER.indexOf('bnMold md-');
    const foto  = BANNER.indexOf('${retratoTreinador}');
    const fecha = BANNER.indexOf('</span>', abre);
    ok(abre >= 0 && foto > abre && fecha > foto,
      'a moldura precisa ENVOLVER o retrato: o `</span>` tem de vir depois da ' +
      'foto, senão o aro é desenhado vazio ao lado dela');
  });

  s.teste('o guarda-roupa deixa escolher a moldura', () => {
    /* Cosmético sem onde equipar é cosmético que não existe. O R40 nasce com
       tudo liberado porque o projeto está em desenvolvimento, mas o CAMINHO da
       posse já precisa existir: ligar a trava depois é uma linha, inventar a
       posse depois é um bloco. */
    const CUST = ler('../app/modules/customizacao.mjs');
    ok(/#pickMoldura/.test(CUST), 'a customização não monta a grade de molduras');
    ok(/data-bmoldura/.test(CUST), 'a grade não marca qual moldura foi clicada');
    ok(/moldura:\s*opt\.dataset\.bmoldura/.test(CUST),
      'clicar na moldura não salva a escolha no perfil');
    ok(/id="pickMoldura"/.test(APP), 'o HTML não tem onde a grade de molduras mora');
  });

  s.teste('a amostra do guarda-roupa mostra a moldura com retrato dentro', () => {
    /* MESMO DEFEITO QUE O R34 CORRIGIU no lutador do banner: lá a grade
       mostrava PNG estático e o banner desenhava GIF, então o jogador escolhia
       olhando uma coisa e recebia outra. Moldura vazia tem o mesmo problema —
       o que se julga numa moldura é como ela emoldura ALGO, e a Pokébola corta
       as orelhas de quem estiver dentro. */
    const CUST = ler('../app/modules/customizacao.mjs').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const grade = CUST.slice(CUST.indexOf("$('#pickMoldura')"),
                             CUST.indexOf("$('#pickMoldura')") + 900);
    ok(/bnTreinador/.test(grade),
      'a amostra da moldura precisa ter um retrato dentro, não a moldura vazia');
    ok(/avatarURL\(\)/.test(grade),
      'a amostra precisa usar o avatar DE VERDADE do jogador: é o rosto dele que ' +
      'a Pokébola vai cortar, e isso precisa aparecer antes de equipar');
  });


  /* ── O RODAPÉ DO BANNER NO IDLE (1.6c) ──────────────────────────────────
   *
   * O dono deu o formato literal: *"Floresta de Viridian - Stage2 - 02:45min
   * restantes"*. E disse o que NÃO entra: *"no banner não vai conter as
   * informações do Pokémon da arena, ODD, colocação etc."*.
   */

  s.teste('o rodapé do idle diz lugar e tempo, no formato do dono', () => {
    const r = rodapeIdle({ bioma: 'Floresta de Viridian', stage: 2, restanteMs: 165000 });
    ok(/Floresta de Viridian/.test(r), `o lugar sumiu do rodapé: ${r}`);
    ok(/Stage 2/.test(r), `o stage sumiu do rodapé: ${r}`);
    ok(/02:45/.test(r),
      `esperava 02:45 para 165 s e veio: ${r}. O exemplo do dono é literal, e ` +
      'o tempo restante é a única coisa nesse banner que muda sozinha — ela ' +
      'errada é o jogador voltando cedo demais ou tarde demais.');
  });

  s.teste('sem stage, a frase não inventa um', () => {
    const r = rodapeIdle({ bioma: 'Montanha', restanteMs: 60000 });
    ok(!/Stage/.test(r),
      `a frase escreveu stage sem haver stage: ${r}. Stages são o bloco 1.10; ` +
      'escrever "Stage 1" para uma coisa que o jogo não tem é frase que inventa ' +
      'informação, e isso é pior que frase curta.');
    ok(/Montanha/.test(r) && /01:00/.test(r), `o resto da frase se perdeu: ${r}`);
  });

  s.teste('sem ninguém em campo, o rodapé diz isso em vez de mentir', () => {
    for (const caso of [{}, { restanteMs: 500 }, { stage: 3 }]) {
      const r = rodapeIdle(caso);
      ok(/Nenhuma expedição/.test(r),
        `sem bioma, o rodapé devolveu "${r}". Um banner que mostra lugar e tempo ` +
        'quando ninguém está em campo é informação falsa numa tela que existe ' +
        'para dizer onde as coisas estão.');
    }
  });

  s.teste('o rodapé do idle NÃO carrega odd nem colocação', () => {
    const r = rodapeIdle({ bioma: 'Vulcão', stage: 4, restanteMs: 900000 });
    for (const proibido of ['odd', 'Odd', 'º de', 'apostou', 'vida', 'K.O.'])
      ok(!r.includes(proibido),
        `"${proibido}" apareceu no rodapé do idle: ${r}. Odd e colocação são ` +
        'resposta a uma decisão que o jogador tomou NA ARENA; no idle ele ' +
        'escolheu o lugar e foi dormir.');
  });

  s.teste('a unidade do tempo acompanha a ordem de grandeza', () => {
    igual(duracaoCurta(0), '00:00');
    igual(duracaoCurta(45000), '00:45', 'quarenta e cinco segundos');
    igual(duracaoCurta(165000), '02:45', 'o exemplo do dono');
    igual(duracaoCurta(59 * 60000 + 59000), '59:59', 'a última leitura antes da hora');
    igual(duracaoCurta(3 * 3600e3), '3h', 'hora redonda não mostra minuto zero');
    ok(/^8h 30min$/.test(duracaoCurta(8.5 * 3600e3)),
      `oito horas e meia saiu como ${duracaoCurta(8.5 * 3600e3)}. Segundos numa ` +
      'espera de oito horas são ruído; minutos numa de dois minutos são ' +
      'grosseiros demais para decidir se vale esperar.');
  });

  s.teste('tempo negativo não vira contagem para trás', () => {
    igual(duracaoCurta(-5000), '00:00',
      'a expedição que passou do prazo mostrou tempo negativo. O relógio da ' +
      'página e o do estado não são o mesmo, e a diferença aparece exatamente ' +
      'no instante em que a expedição termina.');
  });

  /* ── A OPÇÃO NENHUM (1.6c) ──────────────────────────────────────────────
   *
   * *"adicione opção de NENHUM se caso a pessoa queira escolher um Pokémon no
   * banner, mas depois queira tirar"*. Até aqui a grade era uma porta que só
   * abria num sentido, e escolha sem volta é uma armadilha pequena — das que
   * ninguém registra, porque o jogador só descobre que se arrependeu depois de
   * não poder voltar atrás.
   *
   * A linha certa e a errada são quase idênticas, e é por isso que isto virou
   * função com teste em vez de um `??` no meio de 120 linhas de banner.
   */
  const PADRAO = 25;

  s.teste('NENHUM é uma escolha, e não a ausência de escolha', () => {
    igual(vitrineDe({ banner: { dex: 0 } }, PADRAO), 0,
      'quem escolheu "nenhum" recebeu o padrão de volta. O zero é falsy, então ' +
      'um `||` no lugar do `??` faz a opção existir na grade e não ter efeito ' +
      'nenhum — o Pokémon volta sozinho e o jogador não entende por quê.');
  });

  s.teste('quem escolheu alguém continua com quem escolheu', () => {
    igual(vitrineDe({ banner: { dex: 149 } }, PADRAO), 149);
  });

  s.teste('perfil sem escolha nenhuma cai no padrão', () => {
    for (const p of [null, undefined, {}, { banner: null }, { banner: {} }])
      igual(vitrineDe(p, PADRAO), PADRAO,
        `${JSON.stringify(p)} devia cair no padrão. Perfil de versão antiga chega ` +
        'sem o campo, e um banner vazio na primeira abertura é pior que um padrão.');
  });

  s.teste('valor corrompido cai no padrão, e não na tela', () => {
    for (const d of [-3, NaN, Infinity, 'abc', {}, []])
      igual(vitrineDe({ banner: { dex: d } }, PADRAO), PADRAO,
        `dex ${JSON.stringify(d)} passou. O localStorage está a um F12 de ` +
        'distância, e valor adulterado tem de cair no padrão como qualquer ' +
        'cosmético inválido — mesma guarda do tema (S70).');
  });
  return s;
}
