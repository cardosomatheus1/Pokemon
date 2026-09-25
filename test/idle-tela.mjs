/* Q1/Q5 · A ABA DO IDLE (bloco 1.3c).
 *
 * ── POR QUE ESTE TESTE LÊ CÓDIGO EM VEZ DE ABRIR NAVEGADOR ────────────────
 *
 * É o mesmo caminho do `protecao-tela.mjs`, e pelo mesmo motivo: o que pode dar
 * errado nesta aba não é "o botão clica" — o Chromium garante isso melhor que
 * eu, e o portão Q5 já abre a página e reprova em qualquer `pageerror`.
 *
 * O que pode dar errado é ESTRUTURAL, e some numa captura de tela:
 *
 *   · a tela passar a saber o que é dinheiro;
 *   · uma regra do motor ser reimplementada aqui e divergir;
 *   · o mundo e o ator deixarem de ter a mesma densidade de pixel;
 *   · a largura voltar a ser cravada em pixel, e a página rolar de lado.
 *
 * Nenhum deles aparece verde ou vermelho numa tela. Todos aparecem no texto.
 *
 * ── AS TRÊS AFIRMAÇÕES ────────────────────────────────────────────────────
 *
 * 1. **ESTA TELA NÃO SABE O QUE É DINHEIRO.** Nem saldo, nem aposta, nem
 *    carteira — do mesmo jeito que a aba da Liga. O idle produz; a Arena
 *    consome. Ligar os dois aqui seria o §28 pela porta dos fundos.
 *
 * 2. **A REGRA NÃO MORA NA TELA.** Teto diário, custo de stamina e raridade vêm
 *    do motor. Se a tela recalcular qualquer um deles, o dia de ligar o
 *    servidor deixa de ser troca de implementação e vira reescrita.
 *
 * 3. **O MUNDO É GBA E A INTERFACE É NEON, com fronteira dura.** As duas telas
 *    — chão e ator — têm o mesmo tamanho em pixel de arte, e nada de neon
 *    encosta no canvas.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { criarSuite, ok, igual } from './harness.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
/* ── A TELA É UMA FAMÍLIA DE ARQUIVOS, E NÃO UM ARQUIVO ───────────────────
 *
 * `idle-tela.mjs` passou de 600 linhas cinco vezes e cedeu um pedaço a cada:
 * os painéis, os estágios, o campo, o HUD, os perfis, os avisos, e no 1.24 o
 * CARTÃO DA CRIATURA. Toda vez que um pedaço saía, as afirmações que falavam
 * dele reprovavam — não porque o comportamento sumiu, mas porque mudou de
 * arquivo.
 *
 *   > Um teste ancorado num NOME DE ARQUIVO reprova quando o código é
 *   > arrumado, e passa quando o comportamento some do arquivo errado. Ele
 *   > mede a organização, e não o produto.
 *
 * A afirmação `os alvos do HTML existem` já lia a família desde o 1.21 pela
 * mesma razão. Agora `tela()` inteira lê — e uma extração futura deixa de
 * custar uma rodada de vermelho falso. */
const FAMILIA = ['idle-tela', 'idle-paineis', 'idle-campo', 'idle-estagios',
                 'idle-perfis', 'idle-avisos', 'idle-equipe', 'idle-foco',
                 'idle-confirma', 'idle-hud'];
const tela = () => FAMILIA
  .map(n => { try { return ler(`../app/modules/${n}.mjs`); } catch { return ''; } })
  .join('\n');
const dados = () => ler('../app/modules/idle-dados.mjs');
const html = () => ler('../app/index.html');

/* O COMENTÁRIO NÃO PODE SER A PROVA DO QUE ELE EXPLICA.
 *
 * Isto não é preciosismo — a sabotagem pegou o `S595` PASSANDO por causa disso.
 * O defeito removia `grid-template-areas:none` do HTML, que é o mesmo erro que
 * fez a página rolar de lado; e o teste continuou verde porque eu havia escrito
 * um comentário LOGO ACIMA explicando por que aquela declaração existe. O
 * comentário citava a declaração, a expressão casou com o comentário, e o teste
 * passou a afirmar que eu tinha escrito SOBRE a regra em vez de que a regra
 * estava lá.
 *
 * Um teste que se satisfaz com a documentação de uma coisa é pior que um teste
 * ausente: ele fica verde exatamente quando a coisa some. */
const semComentario = txt => txt
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const semComentarioHtml = txt => txt
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

export function suite() {
  const s = criarSuite('idle-tela');

  /* --- 1 · A TELA NÃO SABE O QUE É DINHEIRO (§28) ------------------------ */

  s.teste('§28 · a aba não importa nada de carteira, aposta ou saldo', () => {
    const t = semComentario(tela());
    for (const proibido of ['./banco.mjs', './carteira.mjs', './aposta.mjs', './cedula.mjs'])
      ok(!t.includes(proibido),
        `a aba do idle importa "${proibido}". O idle PRODUZ e a Arena CONSOME; ` +
        `ligar os dois aqui amarra progressão de coleção a dinheiro, e num jogo ` +
        `de apostas isso é pressão para apostar por um motivo que não é apostar.`);
    for (const palavra of ['saldo', 'apostar', 'aposta', 'PokéCash', 'depositar'])
      ok(!new RegExp(`\\b${palavra}\\b`, 'i').test(t),
        `a aba do idle cita "${palavra}" no código. Se um dia ela precisar disso, ` +
        `a decisão passa pelo §25.1 — e não por um import.`);
  });

  s.teste('§28 · a camada de dados do idle também não conhece dinheiro', () => {
    const d = semComentario(dados());
    for (const proibido of ['./banco.mjs', 'carteira', 'saldo', 'wallet'])
      ok(!d.includes(proibido),
        `idle-dados.mjs cita "${proibido}". Ela é a camada que o servidor vai ` +
        `substituir; dinheiro aqui vazaria para lá junto.`);
  });

  /* --- 2 · A REGRA VEM DO MOTOR ------------------------------------------ */

  s.teste('a aba não redefine teto, custo, chance nem raridade', () => {
    const t = semComentario(tela());
    /* Números de regra escritos na tela são a forma clássica de a interface e o
       motor divergirem — a tela mostra 4 e o motor recusa na 3. */
    for (const nome of ['TETO_DIARIO', 'EQUIPE_MAX', 'STAMINA_MAX', 'PERFIS'])
      ok(t.includes(nome),
        `a aba não usa ${nome}. Ou ela deixou de mostrar essa regra, ou ` +
        `reescreveu o número — e reescrito, ele passa a poder discordar do motor.`);
    ok(!/TETO_DIARIO\s*=/.test(t) && !/EQUIPE_MAX\s*=/.test(t),
      'a aba ATRIBUI um valor a uma constante de regra. Ela pode ler; escrever é ' +
      'passar a decidir, e a decisão é do motor.');
    ok(!/const\s+PERFIS\s*=/.test(t),
      'a aba tem a própria tabela de perfis. Duas tabelas discordam no dia em que ' +
      'uma delas mudar, e a que o jogador vê é a errada.');
  });

  s.teste('a aba não sorteia nada — quem sorteia é o motor', () => {
    const t = semComentario(tela());
    ok(!/Math\.random\s*\(/.test(t),
      'a aba chama Math.random(). Sorteio na tela é sorteio que o servidor não ' +
      'pode reproduzir, e a auditoria do §25.2 morre aí.');
  });

  /* --- 3 · O MUNDO É GBA, A INTERFACE É NEON ---------------------------- */

  s.teste('o chão e o ator têm o mesmo tamanho de tela', () => {
    const h = semComentarioHtml(html());
    ok(/#idleAtor\{[^}]*position:absolute[^}]*inset:0/.test(h),
      'o canvas do ator não está exatamente por cima do chão. Tamanhos ' +
      'diferentes dariam densidades de pixel diferentes na mesma cena — foi o ' +
      'defeito nº 1 das prévias antigas, e o dono reprovou duas vezes.');
    for (const alvo of ['#idleMundo', '#idleAtor'])
      ok(new RegExp(`${alvo}\\{[^}]*image-rendering:pixelated`).test(h),
        `${alvo} não declara image-rendering:pixelated. Suavização num mundo de ` +
        `16 px transforma pixel art em borrão.`);
  });

  s.teste('a largura do palco NÃO é cravada em pixel pela tela', () => {
    const t = semComentario(tela());
    ok(!/palco\.style\.width\s*=/.test(t),
      'a tela crava a largura do palco em pixel. Foi exatamente isso que pôs a ' +
      'página para rolar de lado na primeira vez que eu olhei: pixel fixo dentro ' +
      'de coluna fluida. A tela diz o TETO; quem manda no tamanho é o CSS.');
    /* REANCORADO no 1.5i. O palco teve TETO, depois PROPORÇÃO publicada pelo JS,
       e agora tem PROPORÇÃO NO CSS mais uma ALTURA que é do jogador. A afirmação
       atravessou as três formas sem mudar: a tela LÊ a caixa, nunca a IMPÕE.
       Impor foi o que pôs a página para rolar de lado da primeira vez, e seria o
       que anularia a alça agora. */
    const cena = ler('../app/modules/idle-mundo.mjs');
    const cx = '#idlePalco\{[^}]*';
    ok(/getBoundingClientRect()/.test(cena),
      'a cena não lê a caixa do palco — ela está adivinhando o tamanho');
    ok(!/palco.style.widths*=/.test(cena),
      'a cena voltou a IMPOR a largura do palco em pixel');
    const h = semComentarioHtml(html());
    /* REANCORADO no 1.17: era `resize:vertical`, e virou `both`. A afirmação
       media o EIXO, que era acidente; o que ela existe para proteger é a ALÇA.
       Queixa do dono: *"ela só fecha espremendo pra cima ou pra baixo, precisa
       ser um formato que se ajuste"*. */
    ok(new RegExp(cx + 'resize:both').test(h),
      'o palco perdeu a alça de ajuste nos DOIS eixos. A tela é regulada ao ' +
      'gosto do jogador, e o arraste diagonal é pedido explícito.');
    ok(new RegExp(cx + 'aspect-ratio:704 / 448').test(h),
      'a proporção padrão do palco deixou de ser a do mundo. Uma janela mais ' +
      'larga e mais baixa que o lugar que ela mostra é o que o dono chamou de ' +
      'esticada.');
    ok(new RegExp(cx + 'min-height').test(h) && new RegExp(cx + 'max-height').test(h),
      'a alça não tem limites. Sem eles o jogador se tranca numa cena de dois ' +
      'pixels ou numa que empurra os controles para fora da dobra — e um recurso ' +
      'que permite se trancar não é um recurso.');
  });

  /* --- a view existe, e é alcançável ------------------------------------- */

  s.teste('a aba tem botão no menu e uma view com o mesmo id', () => {
    const h = semComentarioHtml(html());
    ok(/<button class="nav" data-view="viewIdle">/.test(h),
      'não há botão de menu para a aba — ela existiria sem caminho até ela');
    ok(/<div id="viewIdle" class="view">/.test(h), 'a view não existe');
    ok(h.includes("import { renderIdle } from './modules/idle-tela.mjs';"),
      'o módulo da aba não é importado pelo boot. Ele se liga sozinho ao clique ' +
      'do menu, mas sem o import nunca é CARREGADO — e a aba abre vazia. É o ' +
      'mesmo laço que o S17 guarda para os outros módulos de apresentação.');
  });

  s.teste('a view zera as áreas nomeadas da grade da Arena', () => {
    const h = semComentarioHtml(html());
    const bloco = h.slice(h.indexOf('<div id="viewIdle"'), h.indexOf('<div id="viewRules"'));
    ok(/grid-template-areas:none/.test(bloco),
      'a view não zera `grid-template-areas`. A `.app` é uma grade de TRÊS ' +
      'colunas com áreas nomeadas, desenhada para a Arena — trocar só as colunas ' +
      'deixa as áreas de pé, e os cartões desta aba caem lado a lado ' +
      'transbordando a tela. A aba da Liga nunca expôs isso porque tem um cartão só.');
  });

  s.teste('todo alvo que a tela procura existe no HTML', () => {
    /* ── A TELA MORA EM VÁRIOS ARQUIVOS, E O TESTE LÊ A FAMÍLIA ──────────
       O `idle-tela` foi passando de 600 linhas e cedeu pedaços: os painéis, os
       estágios, o campo, o HUD, os perfis, os avisos. Cada extração levava
       alvos junto, e a contagem mínima daqui — que existe para o teste não
       passar vazio — começou a reprovar por ENCOLHIMENTO em vez de por defeito.

       Ler a família inteira é o certo: o alvo pode estar em qualquer arquivo da
       MESMA tela, e o que importa é que ele exista no HTML. */
    const familia = ['idle-tela', 'idle-paineis', 'idle-campo', 'idle-estagios',
                     'idle-perfis', 'idle-avisos', 'idle-equipe', 'idle-foco']
      .map(n => { try { return ler(`../app/modules/${n}.mjs`); } catch { return ''; } })
      .join('\n');
    const t = familia, h = semComentarioHtml(html());
    const ids = [...t.matchAll(/\$\('#([a-zA-Z]+)'\)/g)].map(m => m[1]);
    ok(ids.length > 6, `só ${ids.length} alvo(s) — o teste não está lendo a tela`);
    for (const id of new Set(ids))
      ok(new RegExp(`id="${id}"`).test(h),
        `a tela procura "#${id}" e o HTML não tem esse id. Alvo ausente não ` +
        `lança: ele simplesmente não desenha, e a seção fica vazia em silêncio.`);
  });

  /* --- o ator ------------------------------------------------------------- */

  /* REANCORADO no 1.5. Este teste afirmava que a constante `FOLHA_ATOR` desta
     tela apontava para um arquivo existente. A constante deixou de existir: a
     folha passou a sair do guarda-roupa, porque o jogador escolhe o traje.
     O comportamento não sumiu — MUDOU DE CASA, e o teste vai atrás dele.
     Que os arquivos existam em disco agora é afirmado sobre o acervo inteiro,
     em `test/outfit.mjs`, que é onde o acervo mora. */
  s.teste('a folha do ator vem do guarda-roupa, e não de um caminho cravado', () => {
    const t = semComentario(ler('../app/modules/idle-mundo.mjs'));
    ok(/folhaVestida\s*\(/.test(t),
      'a tela não pergunta ao guarda-roupa qual traje desenhar. Com o caminho ' +
      'cravado aqui, trocar de outfit na aba de outfits não muda nada no farm — ' +
      'e uma escolha cosmética que não aparece é pior que uma que não existe, ' +
      'porque ela parece ter funcionado.');
    ok(!/FOLHA_ATOR/.test(t),
      'sobrou uma constante de folha na tela. Duas fontes para a mesma resposta ' +
      'é como o farm e a aba de outfits passam a discordar sem ninguém ver.');
  });

  /* D-054 · O DEFEITO MAIS DESTRUTIVO QUE ESTA TELA JÁ TEVE, e ele passou por
     1288 testes verdes. A folha nossa sai da esteira COM alfa; o canto é
     transparente e os canais de cor de um pixel transparente são zero. Chavear
     pela cor do canto virava "apague todo pixel preto" — o contorno inteiro de
     todo outfit, mais botas, cabelo escuro e alças de mochila.

     Não é erro de execução: a página carrega, o boneco anda, o Q5 não dispara.
     Quem viu foi o dono, comparando a bancada com a rota. */
  s.teste('a chave de cor só age em folha de fundo OPACO', () => {
    const t = semComentario(ler('../app/modules/idle-mundo.mjs'));
    ok(/p\[3\]\s*>\s*\d+/.test(t),
      'a tela não confere o ALFA do canto antes de chavear. Com a folha nossa, ' +
      'que já vem com alfa, o canto lê (0,0,0) e a chave apaga todo pixel preto: ' +
      'o contorno de todo outfit. Foi o D-054, e ele saiu verde na suíte inteira.');
  });

  /* REANCORADO no 1.5c: a fase virou `quadroDe` no `vida.mjs`, que roda em Node
     e é afirmado quadro a quadro em test/vida.mjs. O que sobra para a CENA é
     provar que ela DELEGA — uma segunda fórmula de passo é uma segunda verdade. */
  /* REANCORADO no 1.5c. A fase do passo saiu desta tela e virou `quadroDe` no
     `vida.mjs`, que roda em Node — lá ela é afirmada quadro a quadro, com a
     sequência inteira, em `test/vida.mjs`.
     O que sobra para a CENA afirmar é que ela DELEGA em vez de recalcular: uma
     segunda fórmula de passo é uma segunda verdade, e a que o jogador vê seria
     a errada. */
  s.teste('o passo do ator sai da DISTÂNCIA, e não do relógio', () => {
    const t = semComentario(ler('../app/modules/idle-mundo.mjs'));
    ok(/quadroDe\s*\(/.test(t),
      'a cena não usa `quadroDe`. Ou ela parou de animar o passo, ou refez a ' +
      'conta aqui — e refeita, ela pode discordar da que o teste em Node afirma.');
    ok(!/Math\.floor\s*\(\s*t\s*\//.test(t) && !/Date\.now\(\)\s*\/\s*\d+\s*\)\s*%/.test(t),
      'a cena calcula a fase a partir do RELÓGIO. Com a fase no relógio, a perna ' +
      'e o chão andam em ritmos independentes e o boneco desliza — nenhuma ' +
      'velocidade conserta, porque os dois nunca casam. Foi o defeito dos ' +
      '"pulinhos" que o dono viu na bancada.');
  });

  /* O COMPANHEIRO SEGUE A MESMA REGRA DO TREINADOR, e por isso ela é afirmada
     do mesmo jeito. A sabotagem pegava os dois defeitos dele pela porta fraca —
     o veredito dizia "não carrega", ou seja, detectado porque a página quebrava.
     Detecção por acidente conta como detecção e não conta como teste. */
  s.teste('a pata do companheiro também sai da DISTÂNCIA', () => {
    const t = semComentario(ler('../app/modules/idle-companheiro.mjs'));
    ok(/p\.distancia\s*\/\s*PASSO_BICHO/.test(t),
      'o quadro do companheiro não vem da distância percorrida. No relógio, a ' +
      'pata e o chão andam em ritmos independentes e ele patina — é o defeito ' +
      'dos "pulinhos" do treinador, do outro lado da cena.');
    ok(!/Date\.now\(\)\s*\/\s*\d+\s*\)\s*%\s*colunas/.test(t),
      'o quadro do companheiro voltou ao relógio');
  });

  s.teste('o companheiro é alinhado pelos PÉS, e não pelo fundo do quadro', () => {
    const t = semComentario(ler('../app/modules/idle-companheiro.mjs'));
    ok(/pes.base/.test(t),
      'o alinhamento não usa a base medida do desenho. O quadro do PMD tem folga ' +
      'embaixo — a mesma grade serve animações em que a criatura sobe — e alinhar ' +
      'pelo fundo do QUADRO faz o bicho flutuar com a sombra solta lá embaixo. ' +
      'Foi o que o dono viu: "os pokémon tem sobra embaixo".');
  });

  /* ── A BARRA DE NAVEGAÇÃO É O MAPA MENTAL DO JOGO (1.18) ──────────────── */

  s.teste('a Liga fica ao lado da Arena, e os grupos não se misturam', () => {
    /* Pedido do dono, e a razão vale ser guardada: a Liga É arena — é a
       classificação de quem aposta bem. Separada por Rotas e Wiki no meio, ela
       lia como um quarto modo de jogo.

       O teste afirma a VIZINHANÇA, e não a posição: fixar o índice quebraria no
       dia em que uma aba nova entrasse antes, sem que nada tivesse piorado. */
    const h = semComentarioHtml(html());
    const abas = [...h.matchAll(/data-view="(view\w+)"[^>]*>([^<]+)</g)]
      .map(m => ({ id: m[1], rotulo: m[2].trim() }));
    const i = abas.findIndex(a => a.id === 'viewArena');
    ok(i >= 0, 'a aba da Arena sumiu da barra');
    igual(abas[i + 1]?.id, 'viewLiga',
      `depois de Arenas vem "${abas[i + 1]?.rotulo}" e não a Liga. A Liga é a ` +
      'classificação de quem aposta bem — longe da Arena ela lê como um modo à parte.');
  });

  s.teste('a aba de itens se chama WIKI', () => {
    /* Ela já nasceu com quatro colunas — o que é, o que faz, onde se consegue —
       e vai receber mais assuntos. Um rótulo que promete menos do que a tela
       entrega ensina o jogador a não entrar. */
    const h = semComentarioHtml(html());
    const m = h.match(/data-view="viewWiki"[^>]*>([^<]+)</);
    ok(m, 'a aba da wiki sumiu da barra');
    igual(m[1].trim(), 'Wiki',
      `a aba está rotulada "${m[1].trim()}" — o nome voltou a prometer só itens`);
  });

  /* ── A BARRA DE XP DIZ QUANTO, E NÃO SÓ "PERTO" ───────────────────────── */

  /* ── O RELÓGIO REPINTA O BANNER DA EXPEDIÇÃO (L-124, bloco 1.34) ─────
     Palavra do dono, 02/09: *"a contagem que já existe no banner de batalha no
     idle marcando a expedição ele não atualiza de forma contínua e
     simultânea"*. Ele estava certo: o relógio de 1 s repintava o campo, o
     treino e o botão — e não o HUD. O banner só era desenhado na repintura
     COMPLETA, e ficava parado entre uma e outra.

     O projeto já tinha a regra: *um número que nunca anda ensina o jogador que
     o número é falso*. */
  s.teste('o relógio de 1 s repinta o HUD da cena, e não só os painéis', () => {
    const src = semComentario(ler('../app/modules/idle-tela.mjs'));
    const i = src.indexOf('function ligarRelogio');
    ok(i >= 0, 'a função do relógio sumiu de idle-tela.mjs — este teste precisa ' +
      'de ser realvado para onde o relógio mora hoje, e não apagado');
    const corpo = src.slice(i, src.indexOf('\n}', i));
    ok(/setInterval\(/.test(corpo), 'o relógio deixou de ser um intervalo');
    ok(/desenharHud\(/.test(corpo),
      'o relógio de 1 s não repinta o HUD. O banner "EXPEDIÇÃO 1h40" fica parado ' +
      'entre duas repinturas completas — e o dono pegou isso olhando, em 02/09: ' +
      '"não atualiza de forma contínua e simultânea".');
  });

  /* ── A LUZ DA HORA É UMA CAMADA, E ELA MULTIPLICA (1.34) ──────────────
     Esta afirmação guarda uma decisão que custou DUAS reprovações olhando, e
     nenhuma delas apareceria num teste de comportamento:

       1ª  tinta por cima, mistura normal     -> neblina cinza-leitosa
       2ª  multiply no canvas dos atores       -> azul puro cobrindo o chão

     A luz é o elemento `#idleLuz`, com `mix-blend-mode:multiply`, acima da cena
     (z 4) e abaixo da interface (z 5+). O brilho vem em `screen`, por cima. */
  s.teste('a luz da hora multiplica a cena inteira, e o brilho soma por cima', () => {
    const css = semComentario(html());
    const regra = sel => (css.match(new RegExp(sel.replace('#', '#') + '\\{([^}]*)\\}')) ?? [])[1] ?? '';
    const luz = regra('#idleLuz'), brilho = regra('#idleBrilho');
    ok(/mix-blend-mode:\s*multiply/.test(luz),
      'a luz da hora deixou de multiplicar. Em mistura normal ela vira véu ' +
      'cinza-leitoso sobre a grama — a noite lê como neblina (1ª reprovação).');
    ok(/z-index:\s*4\b/.test(luz),
      'a luz saiu do z-index 4. Abaixo disso ela não cobre as criaturas (z 3); ' +
      'acima, escurece o HUD e a janela do céu, que são interface.');
    ok(/mix-blend-mode:\s*screen/.test(brilho),
      'o brilho da noite deixou de somar. Sem `screen` a brasa e o vaga-lume ' +
      'ficam escurecidos junto com a cena — e o dono pediu o contrário.');
    ok(/id="idleLuz"/.test(html()) && /id="idleBrilho"/.test(html()),
      'as camadas de luz e brilho sumiram do palco');
  });

  s.teste('o nível mostra a PORCENTAGEM ao lado da barra', () => {
    /* A barra sozinha diz "perto" ou "longe" e não diz QUANTO. Duas criaturas a
       71% e a 79% desenham o mesmo tracinho, e a decisão de qual mandar depende
       justamente dessa diferença. */
    const t = semComentario(tela());
    ok(/nvPct/.test(t),
      'a barra de XP perdeu o número — ela voltou a dizer só "perto" ou "longe"');
    ok(/Math\.floor\(b\.pct\)/.test(t),
      'a porcentagem não está arredondada para inteiro. 71,4% num tipo de 9 px é ' +
      'ruído, e a casa decimal não muda decisão nenhuma.');
    ok(/b\.maximo \? 'MAX'/.test(t),
      'no nível máximo o número devia virar MAX — 100% ali é verdade e ainda ' +
      'assim engana, porque sugere que falta o próximo');

    const h = semComentarioHtml(html());
    ok(/\.nvPct\{[^}]*tabular-nums/.test(h),
      'o número não usa tabular-nums — dígito de largura variável faz a barra ' +
      'pular de tamanho a cada colheita');
  });

  return s;
}
