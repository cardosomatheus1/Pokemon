/* Q1/Q2 · O SHINY NA ARENA SÓ APARECE PARA QUEM O POSSUI (R24)
 *
 * ── O QUE ESTAVA ERRADO ────────────────────────────────────────────────────
 *
 * `rodada.mjs` decidia assim:
 *
 *     e.folha = sheetURL(e.f.dex, key, skinShinyAtiva(S.profile, e.f.dex));
 *
 * Isso aplica o MEU shiny a QUALQUER lutador cujo dex eu possua — tenha eu
 * apostado nele ou não. Se eu tenho a skin de Charizard e outro jogador escolhe
 * Charizard, o Charizard dele aparece shiny na minha tela. E ele não tem a skin.
 *
 * ── POR QUE ISSO IMPORTA MAIS DO QUE PARECE ────────────────────────────────
 *
 * O guarda-roupa shiny (R8) vende cosmético por conquista: vagas por nível,
 * desbloqueio por jogar. Um cosmético que aparece em bicho que não é seu — e
 * pior, em bicho de outra pessoa — deixa de ser cosmético. Ele vira uma
 * decoração ambiental, e quem se esforçou para desbloquear não ganhou nada
 * distinguível.
 *
 * A regra que o dono pediu, na letra: **shiny só quando quem SELECIONOU o
 * lutador possui a skin.**
 *
 * ── A FORMA DA FUNÇÃO PREPARA O MULTIJOGADOR ───────────────────────────────
 *
 * Hoje o cliente só conhece o próprio perfil, então "quem selecionou" é sempre
 * "eu ou ninguém". A função recebe isso como ENTRADA em vez de consultar
 * `S.myBet` por dentro — e é de propósito: quando a rodada do servidor passar a
 * dizer quem apostou em quem e com qual skin, o que muda é o argumento, não a
 * regra.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { shinyNaArena, skinShinyAtiva } from '../app/modules/shiny-dados.mjs';

/* Um perfil com a skin de Charizard (dex 6) desbloqueada e equipada. */
const COM_SKIN = { shiny: { skins: [6], onSkin: {}, gifs: [], onGif: {} } };
const SEM_SKIN = { shiny: { skins: [], onSkin: {}, gifs: [], onGif: {} } };
const CHARIZARD = 6, BLASTOISE = 9;

export function suite() {
  const s = criarSuite('shiny-arena');

  /* ── A REGRA, NOS QUATRO CASOS QUE EXISTEM ─────────────────────────────*/

  s.teste('tenho a skin E escolhi: aparece shiny', () => {
    ok(shinyNaArena(COM_SKIN, CHARIZARD, true),
      'quem tem a skin e escolheu o lutador não viu o shiny — o cosmético não aparece para o dono');
  });

  /* O CASO QUE O DONO DESCREVEU, na letra: tenho Shiny Charizard, NÃO escolhi
     ele, outro jogador escolheu e não tem a skin. Ele não pode aparecer shiny. */
  s.teste('tenho a skin e NÃO escolhi: não aparece shiny', () => {
    ok(!shinyNaArena(COM_SKIN, CHARIZARD, false),
      'o shiny apareceu num lutador que eu não escolhi. A skin é de quem a ' +
      'desbloqueou E a colocou em campo — não é decoração da arena.');
  });

  s.teste('não tenho a skin e escolhi: não aparece shiny', () => {
    ok(!shinyNaArena(SEM_SKIN, CHARIZARD, true),
      'escolher o lutador passou a dar a skin de graça');
  });

  s.teste('não tenho a skin e não escolhi: não aparece shiny', () => {
    ok(!shinyNaArena(SEM_SKIN, CHARIZARD, false), 'shiny apareceu do nada');
  });

  /* A POSSE É POR ESPÉCIE. Ter a skin de Charizard não pinta o Blastoise. */
  s.teste('a posse vale para a espécie que ela é, e não para todas', () => {
    ok(!shinyNaArena(COM_SKIN, BLASTOISE, true),
      'a skin de uma espécie vazou para outra');
  });

  /* ── O QUE NÃO PODE QUEBRAR ────────────────────────────────────────────*/

  /* Perfil ausente é o estado do boot, antes de o jogador existir. O caminho
     normal é o certo, e não uma exceção no meio do desenho da arena. */
  s.teste('sem perfil, o caminho é o normal, e não um erro', () => {
    for (const p of [null, undefined, {}, { shiny: null }])
      igual(shinyNaArena(p, CHARIZARD, true), false,
        `perfil \`${JSON.stringify(p)}\` não devolveu o caminho normal`);
  });

  /* A skin DESEQUIPADA não aparece, mesmo desbloqueada — é o que o
     `skinShinyAtiva` já resolvia, e a regra nova não pode ter perdido isso. */
  s.teste('skin desbloqueada mas desligada continua não aparecendo', () => {
    const desligada = { shiny: { skins: [6], onSkin: { 6: false }, gifs: [], onGif: {} } };
    ok(!skinShinyAtiva(desligada, CHARIZARD), 'o `skinShinyAtiva` mudou de comportamento');
    ok(!shinyNaArena(desligada, CHARIZARD, true),
      'a skin desligada no guarda-roupa voltou a aparecer na arena');
  });

  /* ── E A ARENA PRECISA USAR A REGRA ────────────────────────────────────*/

  /* A regra pode estar perfeita e a arena continuar pintando todo mundo —
     basta ninguém chamá-la. É a família do `D-028`, e neste projeto ela já
     apareceu sete vezes. */
  s.teste('a arena decide a folha pela regra, e não pela posse solta', () => {
    const fonte = readFileSync(
      new URL('../app/modules/rodada.mjs', import.meta.url), 'utf8');
    /* A ASSERÇÃO É SOBRE A CONSTRUÇÃO, E NÃO SOBRE A LINHA — e a primeira
       versão errava nisso. Ela exigia `shinyNaArena` DENTRO da linha do
       `e.folha`, e reprovou o R34, que extraiu a decisão para uma variável
       justamente para que a marca visual e a folha usassem a MESMA resposta.
       O que importa é: dentro do `setAnim`, a folha nasce de `shinyNaArena` e
       nunca de `skinShinyAtiva` solto. */
    const corpo = fonte.slice(fonte.indexOf('function setAnim'),
                              fonte.indexOf('function drawFrame'));
    const linha = (fonte.match(/^.*\be\.folha\s*=.*$/m) || [''])[0];
    ok(/shinyNaArena\(/.test(corpo),
      `a folha da arena é decidida por: "${linha.trim()}"\n` +
      `Ela precisa passar por \`shinyNaArena\`, que exige TER a skin E ter ` +
      `escolhido o lutador. \`skinShinyAtiva\` sozinho só pergunta a posse, e ` +
      `pinta bicho de outra pessoa.`);
    /* SEM COMENTÁRIO. O bloco explica, pelo nome, o defeito que ele corrigiu —
       e proibir o nome proibiria a explicação, que é como a correção volta
       atrás. Mesma decisão do `test/banner.mjs` sobre o catálogo `.sc-*`. */
    const codigo = corpo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    ok(!/skinShinyAtiva\s*\(\s*S\.profile/.test(codigo),
      'o `setAnim` voltou a perguntar a POSSE solta — eu tenho a skin de um ' +
      'lutador, OUTRO jogador o escolhe, e o dele aparece shiny na minha tela');
    /* A APOSTA É CONSULTADA NO BLOCO, e não obrigatoriamente na mesma linha —
       a primeira versão deste teste exigia as duas coisas na linha do
       `e.folha`, e reprovava o código certo por causa de uma quebra de linha.
       O que importa é que `setAnim` saiba se ESTE lutador é o meu. */
    const setAnim = fonte.slice(fonte.indexOf('function setAnim'),
                                fonte.indexOf('function drawFrame'));
    ok(setAnim.length > 40, 'não achei o `setAnim` para conferir');
    ok(/S\.myBet/.test(setAnim),
      'a decisão da folha não consulta a aposta em lugar nenhum — sem ela, ' +
      '"escolhi este lutador?" não tem resposta e a regra vira só a posse de novo');
    ok(/S\.ents\[S\.myBet\.idx\]\s*===\s*e/.test(setAnim),
      'a comparação não identifica ESTA entidade como a apostada. Comparar o ' +
      'dex em vez da entidade voltaria a pintar todo Charizard da arena quando ' +
      'eu apostei em um deles.');
  });

  /* ── E O PRELOAD PRECISA ACOMPANHAR A REGRA ────────────────────────────
   *
   * Consequência da mudança, e ela escapou na primeira passada do Q2 (S407).
   *
   * Antes, a arena SEMPRE pintava de shiny os dex que o jogador possuía, então
   * pré-carregar só a folha shiny bastava. Agora ela só pinta se ele ESCOLHER —
   * e o mesmo Charizard pode aparecer normal, na mão de outro jogador, na mesma
   * rodada. A folha normal virou possível para uma espécie que antes nunca
   * precisava dela.
   *
   * Sem as duas, a arena pisca o quadro vazio justamente na espécie que o
   * jogador colecionou — o oposto do que colecionar deveria dar. */
  s.teste('o preload pede as duas folhas da espécie que o jogador possui', () => {
    const fonte = readFileSync(
      new URL('../app/modules/rodada.mjs', import.meta.url), 'utf8');
    const bloco = fonte.slice(fonte.indexOf('function preloadSheets'),
                              fonte.indexOf('function diagnosticoFolhas'));
    ok(bloco.length > 40, 'não achei o `preloadSheets` para conferir');

    const pedidos = bloco.match(/conferirFolha\(sheetURL\([^)]*\)\)/g) || [];
    ok(pedidos.length >= 2,
      `o preload faz ${pedidos.length} pedido(s) de folha de lutador. Precisa de ` +
      `dois: a normal SEMPRE, e a shiny quando a skin é do jogador.`);
    ok(pedidos.some(p => /,\s*false\)/.test(p)),
      'nenhum pedido é incondicionalmente da folha NORMAL — a espécie possuída ' +
      'na mão de outro jogador chegaria sem folha');
    ok(/skinShinyAtiva\([^)]*\)\)\s*conferirFolha/.test(bloco.replace(/\s+/g, ' ')) ||
       /if\s*\(skinShinyAtiva/.test(bloco),
      'a folha shiny não é pedida sob condição de posse — ou ela some, ou o ' +
      'preload volta a baixar shiny de espécie que não é do jogador');
  });

  /* ═══ R34 · O SHINY PRECISA SE ANUNCIAR ════════════════════════════════
   *
   * Até aqui o shiny existia e não APARECIA: o jogador desbloqueava a skin,
   * equipava, e o que mudava era a paleta de um sprite de 22 px no meio de
   * doze. Ninguém nota. Um cosmético que ninguém nota não é recompensa.
   *
   * Pedido do dono do projeto — "o brilhinho clássico que todo shiny tem", e o
   * símbolo ao lado — com uma condição que vale mais que o pedido: "nada brega
   * nem feio".
   *
   * ── A DECISÃO QUE ESTES TESTES GUARDAM ────────────────────────────────
   *
   * NADA É PINTADO POR CIMA DO SPRITE. A folha shiny é arte de terceiro, o
   * recolor é deles, e repintar sprite alheio é a mesma classe de erro que
   * trocar a fonte da arte (v0.6.1). O brilho é `drop-shadow`, que acompanha a
   * silhueta seja ela qual for — mesma decisão que o `--contorno` já tinha
   * tomado, e pelo mesmo motivo: a queixa original do crítico cego era
   * EXATAMENTE sobre paletas shiny com pouco contraste, e a resposta foi
   * separar, não repintar. */
  const APP = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
  const regra = sel => (APP.match(
    new RegExp(`^${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]*\\}`, 'm')) || [''])[0];

  s.teste('o brilho do shiny é sombra de silhueta, e não tinta sobre a arte', () => {
    const r = regra('.mon.shiny .body');
    ok(r, 'a regra `.mon.shiny .body` sumiu — o shiny voltou a ser só outra paleta');
    ok(/drop-shadow/.test(r), `o brilho não é \`drop-shadow\`: ${r}`);
    /* Os que REPINTAM. `hue-rotate` num sprite shiny troca a paleta que o autor
       da arte escolheu; `sepia`/`saturate`/`invert` idem. */
    for (const proibido of ['hue-rotate', 'sepia(', 'invert(', 'saturate('])
      ok(!r.includes(proibido),
        `\`${proibido}\` repinta o sprite. A folha shiny é arte de terceiro — o ` +
        `recolor é deles, e o que é nosso é a separação, nunca a paleta.`);
  });

  s.teste('a arena marca quem está shiny, pela mesma regra que escolhe a folha', () => {
    const src = ler('../app/modules/rodada.mjs');
    ok(/classList\.toggle\('shiny'/.test(src),
      'a arena não marca a entidade como shiny — o CSS `.mon.shiny` fica inalcançável');
    /* A MESMA decisão para as duas coisas. Se a classe e a folha vierem de
       chamadas separadas, elas podem discordar: brilho sem paleta, ou paleta
       sem brilho. */
    /* UMA RESPOSTA PARA AS DUAS COISAS. Se a classe e a folha vierem de
       chamadas separadas a `shinyNaArena`, elas podem discordar no dia em que
       alguém mudar uma e esquecer a outra: brilho sem paleta, ou paleta sem
       brilho. O teste cobra a variável compartilhada, não o texto da linha. */
    const nome = (src.match(/const (\w+) = shinyNaArena\(/) || [])[1];
    ok(nome, 'a decisão do shiny na arena deixou de ser uma variável nomeada');
    ok(new RegExp(`classList\\.toggle\\('shiny',\\s*${nome}\\)`).test(src),
      `a marca visual não usa \`${nome}\`, que é a resposta de \`shinyNaArena\``);
    ok(new RegExp(`e\\.folha = [^\\n]*\\b${nome}\\b`).test(src),
      `a folha não usa \`${nome}\`: brilho e paleta saem de decisões separadas ` +
      `e podem discordar`);
  });

  s.teste('o retrato shiny se anuncia, e o normal não', () => {
    const src = ler('../app/modules/sprites.mjs');
    const quantos = (src.match(/data-shiny="1"/g) || []).length;
    ok(quantos >= 2,
      `só ${quantos} dos dois montadores de retrato marcam shiny — ` +
      `\`retratoAnimado\` e \`dexImg\` precisam dos dois`);
    /* A marca é CONDICIONAL. Marcar sempre daria brilho a todo retrato, e o
       cosmético que aparece sozinho deixa de ser cosmético. */
    for (const m of src.match(/shiny \? ' data-shiny="1"' : ''/g) || [])
      ok(m, '');
    ok((src.match(/shiny \? ' data-shiny="1"' : ''/g) || []).length >= 2,
      'a marca `data-shiny` não é condicional ao shiny em ambos os montadores');
    ok(/img\[data-shiny="1"\]/.test(APP),
      'ninguém desenha `img[data-shiny="1"]` no CSS — a marca não chega à tela');
  });

  /* O SÍMBOLO DO BANNER É UM ELEMENTO, E PRECISA CONTINUAR SENDO.
     `.battle-banner::after` já é a marca de K.O.; disputar aquele
     pseudo-elemento apagaria os dois — e some justamente na rodada em que o
     lutador caiu, que é quando o jogador está olhando. */
  s.teste('o símbolo do banner não disputa o pseudo-elemento do K.O.', () => {
    const src = ler('../app/modules/banner.mjs');
    ok(/class="bnShiny"/.test(src), 'o banner não emite o símbolo shiny');
    ok(/gifShinyAtivo\(perfil, dexNoBanner\)/.test(src),
      'o símbolo do banner não pergunta a mesma fonte que escolhe o retrato');
    ok(regra('.bnShiny'), 'a regra `.bnShiny` sumiu do CSS — o símbolo fica invisível');
    ok(!/^\.battle-banner\.shiny::after/m.test(APP),
      'o símbolo shiny voltou para o `::after` do banner, que é a marca de K.O.');
  });

  /* ═══ R34 · O LUTADOR DO BANNER É GIF ══════════════════════════════════
   *
   * Esta grade escolhe QUEM aparece no banner, e o banner desenha o escolhido
   * com `retratoAnimado` — o GIF do pack. A grade mostrava `dexImg`, que é PNG
   * parado: o jogador escolhia olhando uma coisa e recebia outra.
   *
   * É o mesmo defeito que o R13 corrigiu no fim de rodada, onde o campeão
   * comemorava imóvel. Não faltava arte: faltava apontar para a que já está em
   * disco. */
  s.teste('a grade do lutador do banner mostra o mesmo GIF que o banner desenha', () => {
    const src = ler('../app/modules/customizacao.mjs');
    const bloco = src.match(/\$\('#pickBannerMon'\)\.innerHTML[\s\S]{0,700}?join\(''\);/);
    ok(bloco, 'a grade `#pickBannerMon` sumiu da customização');
    ok(/retratoAnimado\(/.test(bloco[0]),
      'a grade do lutador do banner voltou ao retrato PARADO: o jogador escolhe ' +
      'vendo um PNG e recebe um GIF no banner');
    ok(/gifShinyAtivo\(/.test(bloco[0]),
      'a grade não mostra a skin shiny equipada — quem desbloqueou escolhe às cegas');
  });


  /* ═══ R42 · OS DOIS ÚLTIMOS LUGARES QUE PERGUNTAVAM A COISA ERRADA ═══════
   *
   * A regra do shiny tem DUAS metades, e o produto tinha lugares usando cada
   * uma delas sozinha. Os dois defeitos relatados pelo dono do projeto são as
   * duas caras do mesmo erro:
   *
   *   tela de VENCEDOR   perguntava só a POSSE  → pintava o campeão de outra
   *                                               pessoa com a skin do jogador
   *   banner do PERFIL   não perguntava NADA    → o jogador que desbloqueou,
   *                                               equipou e escolheu o bicho
   *                                               via o Pokémon comum
   *
   * E a diferença entre eles não é descuido: é DONO. Na arena e na tela de
   * vencedor o lutador pode ser de qualquer um, então a pergunta precisa das
   * duas metades. No banner do perfil o bicho já é o que ESTE jogador escolheu
   * para representá-lo — ele é dele por definição, e a posse basta. */

  s.teste('a tela de vencedor exige a escolha, e não só a posse', () => {
    /* O DEFEITO RELATADO: um shiny que o jogador possui venceu uma rodada em
       que ele NÃO apostou, e o campeão apareceu vestindo a skin dele. A tela
       mais vista da rodada dizia "seu bicho ganhou" com nada dele em jogo. */
    const fonte = readFileSync(
      new URL('../app/modules/resultado-tela.mjs', import.meta.url), 'utf8');
    const corpo = fonte.slice(fonte.indexOf('function vencedorImg'),
                              fonte.indexOf('function blocoXP'));
    ok(/shinyNaArena\(/.test(corpo),
      'o retrato do vencedor é decidido pela posse solta. Ele precisa passar ' +
      'por `shinyNaArena`, que exige TER a skin E o lutador ser o escolhido — ' +
      'senão o campeão de outra pessoa aparece vestindo a skin de quem olha.');
    /* Sem comentário: o bloco EXPLICA o defeito citando o nome da função
       errada, e proibir o nome proibiria a explicação. Sexta vez que este
       projeto encontra a mesma armadilha. */
    const codigo = corpo.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    ok(!/gifShinyAtivo\s*\(\s*S\.profile/.test(codigo),
      'o `vencedorImg` voltou a perguntar só a posse');
  });

  s.teste('a escolha, na tela de vencedor, é ter apostado no campeão', () => {
    /* "Escolhido" muda de significado por tela, e aqui só existe uma forma de
       um lutador ser SEU: você apostou nele. Sem esta amarra, `shinyNaArena`
       receberia `true` sempre e a correção acima seria decorativa. */
    const fonte = readFileSync(
      new URL('../app/modules/resultado-tela.mjs', import.meta.url), 'utf8');
    const corpo = fonte.slice(fonte.indexOf('function vencedorImg'),
                              fonte.indexOf('function blocoXP'));
    const codigo = corpo.replace(/\/\*[\s\S]*?\*\//g, ' ');
    ok(/S\.myBet/.test(codigo),
      'a tela de vencedor decide o shiny sem consultar a aposta: ela não tem ' +
      'como saber se o campeão era o lutador do jogador');
    ok(!/shinyNaArena\([^)]*,\s*true\s*\)/.test(codigo),
      'o terceiro argumento virou `true` fixo — a guarda existe e não guarda nada');
  });

  s.teste('o banner do perfil mostra a skin que o jogador equipou', () => {
    /* O banner de BATALHA passa o shiny desde o R34; o do PERFIL nunca passou.
       `dexImg` aceita o quarto argumento desde sempre — ele só nunca era dado,
       e por isso a chamada pedia a folha normal em silêncio. */
    const fonte = readFileSync(
      new URL('../app/modules/customizacao.mjs', import.meta.url), 'utf8');
    const corpo = fonte.slice(fonte.indexOf('function renderBanner'),
                              fonte.indexOf('function renderCustom'));
    const codigo = corpo.replace(/\/\*[\s\S]*?\*\//g, ' ');
    /* ATÉ O FIM DA LINHA, e não até o primeiro `)`. A primeira versão usava
       `dexImg\([^;]*?\)` e parava no parêntese do `slugDoDex` aninhado — lia a
       chamada pela metade e reprovava o código correto. Casar parênteses com
       expressão regular não dá; a linha inteira dá, e a chamada cabe numa. */
    const chamada = (codigo.match(/dexImg\(.*$/m) || [''])[0];
    ok(/gifShinyAtivo/.test(chamada),
      `o banner do perfil desenha com: "${chamada.trim().slice(0, 80)}"\n` +
      `Sem o quarto argumento, \`dexImg\` sempre pede a folha normal — e quem ` +
      `desbloqueou a skin vê o Pokémon comum ao lado do guarda-roupa que acabou ` +
      `de dizer que ela está ativa.`);
  });

  return s;
}
