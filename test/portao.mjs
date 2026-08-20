/* Q1 · O PORTÃO CONFERE A SI MESMO.
 *
 * O V1.14 gastou 19 dos 53 minutos de portão numa classe só de erro, e as duas
 * vezes pelo mesmo motivo: a sabotagem só descobre que um defeito está
 * quebrado DEPOIS de montar caixa de areia e rodar a suíte inteira.
 *
 *   · a lista de arquivos não conhecia dois módulos novos  → morreu no defeito
 *     70, sete minutos jogados fora
 *   · o S15 tinha perdido a âncora quando o desenho semeado saiu do render.mjs
 *     → doze minutos para descobrir o que se lê em 0,1 s
 *
 * As duas informações são estáticas. Este arquivo testa as funções que as
 * extraem antes de qualquer sandbox existir.
 *
 * POR QUE ISTO É TESTE E NÃO SÓ CÓDIGO: um pré-voo que deixa passar é PIOR que
 * nenhum, porque dá a impressão de que as âncoras foram conferidas. O defeito
 * S79 planta exatamente isso.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { conferirAncoras, filtrarTocados } from './ancoras.mjs';

/* Leitor injetado: o teste não pode depender do conteúdo real dos módulos,
   senão passa a falhar toda vez que alguém edita uma linha do jogo. */
const leitor = mapa => f => {
  if (!(f in mapa)) throw new Error(`ENOENT ${f}`);
  return mapa[f];
};

export function suite() {
  const s = criarSuite('portao');

  s.teste('âncora presente uma vez: nenhum problema', () => {
    const probs = conferirAncoras(
      [{ id:'X1', arquivo:'a.mjs', de:'const teto = 50;', para:'const teto = 51;' }],
      leitor({ 'a.mjs': 'linha\nconst teto = 50;\noutra\n' }));
    igual(probs.length, 0, `problemas inesperados: ${JSON.stringify(probs)}`);
  });

  /* O caso do S15: o trecho onde o defeito morava deixou de existir. O defeito
     continua na lista, verde, provando nada. */
  s.teste('âncora ausente é apontada, com o id', () => {
    const probs = conferirAncoras(
      [{ id:'X2', arquivo:'a.mjs', de:"import { rng } from './motor.mjs';\n", para:'' }],
      leitor({ 'a.mjs': 'nada aqui\n' }));
    igual(probs.length, 1, 'âncora ausente passou');
    igual(probs[0].id, 'X2', 'problema sem id');
    ok(/AUSENTE/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  /* Âncora que casa em dois lugares planta o defeito no PRIMEIRO, que pode não
     ser o pretendido — e aí o defeito testa outra coisa sem ninguém saber. */
  s.teste('âncora ambígua é apontada, com a contagem', () => {
    const probs = conferirAncoras(
      [{ id:'X3', arquivo:'a.mjs', de:'peso:20', para:'peso:0' }],
      leitor({ 'a.mjs': 'peso:20 e peso:20 de novo' }));
    igual(probs.length, 1, 'âncora ambígua passou');
    ok(/AMBÍGUA/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
    ok(/2/.test(probs[0].detalhe), `detalhe sem a contagem: "${probs[0].detalhe}"`);
  });

  /* O caso que matou a execução #1: arquivo que a lista de defeitos nomeia e
     ninguém consegue ler. Antes isso era um TypeError no defeito 70. */
  s.teste('arquivo ilegível é apontado, e não derruba a conferência', () => {
    const probs = conferirAncoras(
      [{ id:'X4', arquivo:'sumiu.mjs', de:'x', para:'y' },
       { id:'X5', arquivo:'a.mjs',     de:'x', para:'y' }],
      leitor({ 'a.mjs': 'x' }));
    igual(probs.length, 1, `esperado só o ilegível, veio ${JSON.stringify(probs)}`);
    ok(/ILEGÍVEL/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  /* Defeito que não muda nada roda a suíte inteira para provar zero. */
  s.teste('defeito que não altera nada é apontado', () => {
    const probs = conferirAncoras(
      [{ id:'X6', arquivo:'a.mjs', de:'igual', para:'igual' }],
      leitor({ 'a.mjs': 'igual' }));
    igual(probs.length, 1, 'defeito inócuo passou');
    ok(/INÓCUO/.test(probs[0].tipo), `tipo veio "${probs[0].tipo}"`);
  });

  s.teste('id repetido é apontado — dois defeitos com o mesmo nome no relatório', () => {
    const probs = conferirAncoras(
      [{ id:'X7', arquivo:'a.mjs', de:'a', para:'b' },
       { id:'X7', arquivo:'a.mjs', de:'b', para:'c' }],
      leitor({ 'a.mjs': 'a b' }));
    ok(probs.some(p => /REPETIDO/.test(p.tipo)), `nenhum id repetido apontado: ${JSON.stringify(probs)}`);
  });

  /* --- o filtro do modo incremental ------------------------------------- */

  s.teste('o filtro devolve só os defeitos dos arquivos tocados', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }, { id:'B', arquivo:'y.mjs' }, { id:'C', arquivo:'x.mjs' }];
    igual(filtrarTocados(D, ['x.mjs']).map(d => d.id).join(''), 'AC', 'filtro errado');
  });

  /* A DIREÇÃO PERIGOSA É ESVAZIAR, não alargar.
     Filtro que devolve demais custa tempo; filtro que devolve de menos entrega
     um relatório verde sobre defeito que ninguém plantou. */
  s.teste('arquivo tocado sem defeito nenhum devolve lista vazia, e isso é visível', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }];
    igual(filtrarTocados(D, ['docs/LEIAME.md']).length, 0, 'filtro casou o que não devia');
  });

  s.teste('sem arquivos tocados o filtro devolve tudo — nunca um silêncio verde', () => {
    const D = [{ id:'A', arquivo:'x.mjs' }, { id:'B', arquivo:'y.mjs' }];
    igual(filtrarTocados(D, []).length, 2, 'lista vazia de arquivos esvaziou os defeitos');
  });

  /* --- o recorte da suíte (T3) ------------------------------------------
   *
   * O recorte é a peça mais perigosa do arnês, porque a falha dele é SILENCIOSA
   * e VERDE: `--so=cartira` com um erro de digitação rodaria zero testes e
   * imprimiria sucesso. Um portão que não roda nada e diz que passou é pior que
   * nenhum portão — alguém confia nele.
   *
   * Os testes gastam um processo cada, e é o preço certo: eles guardam a peça
   * que decide o que TODAS as outras rodam. Com `--so=carteira` o filho custa
   * 0,8 s e não sobe navegador nenhum. */
  const rodarFilho = async args => {
    const { execFile } = await import('node:child_process');
    const raiz = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
    return new Promise(res => {
      execFile('node', ['test/run.mjs', ...args],
        { cwd: raiz, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
          env: { ...process.env, SEM_VISUAL: '1' } },
        (err, out, errOut) => res({ code: err ? (err.code ?? 1) : 0, saida: out + errOut }));
    });
  };

  s.teste('o recorte com nome inexistente REPROVA, em vez de rodar vazio', async () => {
    const r = await rodarFilho(['--so=cartira']);
    ok(r.code !== 0,
      `--so com nome errado saiu com código ${r.code}. Execução vazia e verde é a ` +
      `falha mais silenciosa que este arnês pode ter.`);
    ok(/não conhece a suíte/.test(r.saida),
      `saiu com erro, mas sem dizer qual nome não existe:\n${r.saida.slice(-300)}`);
  });

  s.teste('o recorte se anuncia como parcial', async () => {
    const r = await rodarFilho(['--so=carteira']);
    ok(r.code === 0, `--so=carteira devia passar, saiu ${r.code}`);
    ok(/PARCIAL/.test(r.saida),
      `execução parcial não se anunciou. Portão que parece inteiro sem ser é ` +
      `pior que portão ausente — mesma lição do sabotagem:tocados.`);
  });

  s.teste('o portão de fechamento RECUSA o recorte', async () => {
    const { execFile } = await import('node:child_process');
    const raiz = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
    const r = await new Promise(res => {
      execFile('node', ['test/run.mjs', '--so=carteira'],
        { cwd: raiz, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
          env: { ...process.env, EXIGE_VISUAL: '1' } },
        (err, out, errOut) => res({ code: err ? (err.code ?? 1) : 0, saida: out + errOut }));
    });
    ok(r.code !== 0,
      `com EXIGE_VISUAL=1 o recorte foi aceito (código ${r.code}) — o bloco poderia ` +
      `fechar com um sexto da suíte`);
  });

  s.teste('toda suíte expõe o próprio nome', async () => {
    const { criarSuite } = await import('./harness.mjs');
    const x = criarSuite('exemplo');
    igual(x.nome, 'exemplo',
      'criarSuite não expõe `nome` — sem ele o recorte casa com nada e roda vazio');
  });

  /* AS PASTAS DA CAIXA DE AREIA SAEM DO GIT, E ISTO É TESTE ESTÁTICO.
   *
   * A lista escrita à mão custou DUAS execuções de portão: no V1.14 a lista de
   * ARQUIVOS não conhecia dois módulos novos e morreu no defeito 70; no F1.1 a
   * de PASTAS não conhecia `server/` e o portão abortou com "a suíte já está
   * vermelha" depois de montar as caixas.
   *
   * ELE É ESTÁTICO PORQUE O DEFEITO É INSABOTÁVEL, e vale explicar: a caixa de
   * areia é montada ANTES de qualquer defeito ser plantado. Sabotar a derivação
   * dentro da caixa não muda a caixa que já existe — a sabotagem não alcança o
   * próprio bootstrap. O `S125` passou no Q2 exatamente por isso, e foi assim
   * que este teste nasceu.
   *
   * O que ele prova: que a lista é DERIVADA. O que ele não prova: que a
   * derivação está certa. Essa segunda parte tem prova empírica e cara — é o
   * portão inteiro abortando —, e é a que já aconteceu duas vezes. */
  s.teste('a caixa de areia deriva as pastas do git, e não de uma lista à mão', async () => {
    const { readFileSync } = await import('node:fs');
    /* OS COMENTÁRIOS SAEM ANTES DA VARREDURA, e a lição custou uma execução de
       portão. A primeira versão lia o arquivo inteiro — e o comentário logo
       acima da linha EXPLICA a regra citando `--others` e `--exclude-standard`.
       Com a bandeira sabotada no código, o teste continuava achando as duas
       palavras no texto que as explicava, e passava. O S125 escapou por isso.
       Teste que lê o comentário testa a intenção, não a peça. */
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    ok(/execFileSync\('git', \['ls-files'/.test(txt),
      'a lista de pastas da caixa de areia não vem do git');
    ok(/--others/.test(txt) && /--exclude-standard/.test(txt),
      '`git ls-files` sem `--others --exclude-standard`: ele só enxerga o que já ' +
      'foi COMMITADO, e a pasta nova de um bloco em construção ainda não foi. ' +
      'Foi assim que `server/` ficou de fora — falha silenciosa exatamente no ' +
      'caso que a derivação existe para cobrir.');
    ok(!/for \(const dir of \[['"]/.test(txt),
      'voltou a existir uma lista de pastas escrita à mão em sabotagem.mjs');
  });

  /* ── O ÍNDICE DE CAPTURA SÓ PODE ACELERAR ────────────────────────────────
   *
   * O atalho que faz o Q2 sair de ~90 min para minutos apoia-se numa dedução
   * exata — *uma suíte vermelha implica `npm test` vermelho* — e numa regra de
   * direção única: **o caminho rápido só sabe dizer PEGOU.** Verde no recorte
   * não conclui nada e cai no caminho completo.
   *
   * Se essa direção se inverter um dia, o portão passa a poder declarar VERDE
   * sem ter perguntado — que é o S109 com outra roupa, e é a falha mais cara
   * que este arnês tem. Por isso a regra é testada como texto: ela não é uma
   * convenção, é uma propriedade do código. */
  s.teste('o atalho do índice não tem como produzir PASSOU nem VERDE', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    const bloco = txt.match(/for \(const grupo of \[candidatas[\s\S]*?\n    \}/);
    ok(bloco, 'a onda 1 sumiu do sabotagem.mjs — âncora perdida');
    const corpo = bloco[0];

    const status = [...corpo.matchAll(/status:\s*'([^']+)'/g)].map(m => m[1]);
    ok(status.length > 0, 'o atalho não declara status nenhum');
    igual(status.filter(x => x !== 'PEGOU').length, 0,
      `o atalho do índice declara ${status.join(', ')}. Ele só pode dizer PEGOU: ` +
      `quem reprova o portão tem que ser sempre a execução completa, senão o ` +
      `índice vira um jeito de o Q2 ficar verde sem ter perguntado.`);

    ok(/r\.vermelha \?/.test(corpo) || /if \(r\.vermelha/.test(corpo),
      'a onda 1 devolve resultado sem exigir que o recorte tenha ficado VERMELHO');
    ok(/filter\(n => grupo\.includes\(n\)\)/.test(corpo),
      'a onda 1 aceita qualquer vermelho do recorte. Precisa ser uma das suítes ' +
      'do próprio grupo que ficou vermelha — um recorte que morre por nome ' +
      'inexistente também é "vermelho", e contaria como captura sem ter ' +
      'capturado nada.');
    /* AS BARATAS ANTES DAS DE NAVEGADOR, e o teste cobra a ordem: junta-las faz
       o Chromium subir para todo arquivo de `app/`, e faz o índice gravar a
       suíte cara como captor — fixando o custo. */
    ok(/candidatas\.filter\(n => !NAVEGADOR\.has\(n\)\),[\s\S]{0,80}candidatas\.filter\(n => NAVEGADOR\.has\(n\)\)/.test(corpo),
      'a onda 1 voltou a misturar suítes baratas e de navegador no mesmo recorte');
    ok(/if \(pegou\.length\)/.test(corpo),
      'a onda 1 conclui sem conferir que alguma suíte da onda foi a que reprovou');
  });

  s.teste('entrada de índice inválida cai no caminho completo, e nunca some', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const fn = txt.match(/function entradaUsavel\(id\) \{[\s\S]*?\n\}/);
    ok(fn, 'a guarda `entradaUsavel` sumiu — âncora perdida');
    ok(/=== 'golden'/.test(fn[0]),
      'a guarda deixou de recusar `golden`. A coluna "sem golden" é uma pergunta ' +
      'sobre qualidade de teste, e o atalho não a responde — defeito indexado no ' +
      'golden precisa do caminho completo.');
    ok(/SUITES_REAIS\.has\(nome\)/.test(fn[0]),
      'a guarda deixou de conferir que a suíte existe. Índice velho tem que ' +
      'custar tempo, nunca cobertura.');
    ok(/return null/.test(fn[0]),
      'a guarda não devolve `null` — sem isso não há caminho completo para cair');
  });

  /* A PASSADA ESTREITA SÓ PODE CONDENAR, nunca absolver.
   *
   * `SABOTAGEM_ESTREITA=1` faz a suíte visual rodar UMA largura em vez de
   * quatro: 34 s em vez de 65 s por mutante. Vale porque vermelho numa
   * configuração reduzida é vermelho na completa.
   *
   * O contrário não vale, e é aqui que o portão se perderia: verde em uma
   * largura NÃO é verde nas quatro. Um mutante que só quebra o arranjo em
   * 420 px voltaria como PASSOU — o portão diria "ninguém pega isto" quando a
   * verdade é "ninguém olhou naquela largura". */
  s.teste('a passada estreita do navegador nunca decide sozinha um PASSOU', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const bloco = txt.match(/if \(!comG\.vermelha\) \{[\s\S]*?\n    \}/);
    ok(bloco, 'a passada do navegador sumiu — âncora perdida');
    ok(/if \(!nav\.vermelha\) nav = await julgar\([^)]*false\)/.test(bloco[0]),
      'a passada estreita saiu verde e o código NÃO reexecuta com as quatro ' +
      'larguras. Verde estreito não é verde: um mutante que só quebra o arranjo ' +
      'em 420 px voltaria como PASSOU, e o portão diria "ninguém pega isto" ' +
      'quando a verdade é "ninguém olhou naquela largura".');
  });

  /* D-015: A PASSADA ESTREITA FICAVA VERMELHA PARA QUALQUER MUTANTE.
   *
   * `SABOTAGEM_ESTREITA=1` captura uma largura; a linha de base gravada tem
   * quatro. Dois testes da `visual-base` cobravam a base contra o número de
   * larguras DESTA execução, e ficavam vermelhos sempre — o que dava PEGOU
   * falso a todo defeito que chegasse ao navegador, e inflou um Q2 inteiro.
   *
   * Um portão que diz PEGOU sem ter pego é pior que um que diz PASSOU: o
   * segundo manda investigar, o primeiro manda seguir em frente — e esconde os
   * defeitos que de fato escapam.
   *
   * A CONFERÊNCIA É ESTÁTICA, e a primeira versão dela não era: ela subia um
   * processo filho com a suíte visual. Duas coisas quebraram. No sandbox o
   * filho herda `SEM_VISUAL=1`, a suíte não existe, e o `--so` aborta — a
   * linha de base do portão inteiro ficou vermelha. E, se funcionasse, cobraria
   * 35 s de navegador em toda execução barata, desfazendo exatamente o que a
   * mudança de estratégia do Q2 comprou.
   *
   * A distinção que o teste crava: quem julga a BASE GRAVADA conta contra
   * `LARGURAS_TODAS`; quem julga a CAPTURA DESTA EXECUÇÃO conta contra
   * `LARGURAS`. Confundir as duas é o defeito. */
  /* TODA CONFIGURAÇÃO QUE JULGA PRECISA DA PRÓPRIA BASE VERDE.
   *
   * É o D-015 generalizado, e a fresta por onde ele entrou: o portão validava
   * UMA configuração e julgava em quatro. Nas três não validadas, qualquer
   * vermelho passava por captura — e um mutante inerte voltou como PEGOU.
   *
   * A regra vale para toda redução futura, e é por isso que o teste cobra a
   * FORMA e não os casos: nenhuma execução que decide veredito pode chamar
   * `rodar` direto, sem passar pela validação. */
  s.teste('nenhum julgamento roda numa configuração sem base validada', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    const fn = txt.match(/async function julgar\([\s\S]*?\n\}/);
    ok(fn, 'a função `julgar` sumiu — âncora perdida');
    ok(/await garantirBase\(/.test(fn[0]),
      '`julgar` deixou de validar a configuração antes de usá-la');

    const g = txt.match(/function garantirBase\([\s\S]*?\n\}\n/);
    ok(g, 'a função `garantirBase` sumiu — âncora perdida');
    ok(/CAIXA_BASE/.test(g[0]),
      'a base é medida numa caixa com mutante plantado — isso mede o defeito, ' +
      'não a configuração');
    ok(/process\.exit\(2\)/.test(g[0]),
      'configuração quebrada não aborta. Seguir com ela é dar PEGOU a todo ' +
      'defeito avaliado nela, que é exatamente o D-015.');

    /* E o corpo do `avaliar` não pode chamar `rodar` pelas costas. */
    const av = txt.match(/async function avaliar\(d, caixa\)[\s\S]*?\n\}\n/);
    ok(av, 'a função `avaliar` sumiu — âncora perdida');
    const diretos = [...av[0].matchAll(/await rodar\(/g)].length;
    igual(diretos, 0,
      `${diretos} chamada(s) a \`rodar\` direto dentro de \`avaliar\`. Todo ` +
      `julgamento passa por \`julgar\`, senão a configuração nova nasce sem base ` +
      `validada — e o portão volta a acreditar em vermelho que não é captura.`);
  });

  s.teste('quem julga a linha de base gravada conta as quatro larguras', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./visual.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    const bloco = txt.match(/a linha de base cobre as telas e larguras declaradas[\s\S]*?\n  \}\);/);
    ok(bloco, 'o teste de cobertura da linha de base sumiu — âncora perdida');
    ok(/LARGURAS_TODAS\.length/.test(bloco[0]) && !/[^_]LARGURAS\.length/.test(bloco[0]),
      'o teste que julga a BASE GRAVADA conta contra `LARGURAS`, que vale 1 na ' +
      'passada estreita. A base tem 16 entradas e o esperado vira 4: a suíte ' +
      'fica vermelha para QUALQUER mutante, e o portão passa a dar PEGOU falso ' +
      'a todo defeito que chega ao navegador (D-015).');

    ok(/if \(!a && ESTREITA && !larguras\.has\(/.test(txt),
      '`compararBase` voltou a cobrar captura de largura que a passada estreita ' +
      'não produziu — mesmo defeito pela outra ponta.');
    ok(/if \(!a\) \{ falhas\.push/.test(txt),
      'a captura ausente deixou de ser falha FORA do modo estreito. Ali ela ' +
      'precisa continuar sendo: tela que não foi capturada é tela que ninguém olhou.');
  });

  s.teste('a largura estreita não vaza para fora da sabotagem', async () => {
    const { readFileSync } = await import('node:fs');
    /* `npm test` e `npm run portoes` não podem definir a variável: o portão de
       fechamento tem que olhar as quatro larguras sempre. */
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url).pathname, 'utf8'));
    for (const [nome, cmd] of Object.entries(pkg.scripts || {}))
      ok(!/SABOTAGEM_ESTREITA/.test(cmd),
        `o script \`${nome}\` define SABOTAGEM_ESTREITA. Ela é da sabotagem e de ` +
        `mais ninguém — fora dali, uma largura no lugar de quatro é cobertura ` +
        `visual silenciosamente reduzida.`);
    igual(process.env.SABOTAGEM_ESTREITA ?? '', '',
      'a suíte está rodando com SABOTAGEM_ESTREITA ligada — a linha de base ' +
      'visual estaria medindo uma largura de quatro');
  });

  /* ── O CACHE DE VEREDITOS ────────────────────────────────────────────────
   *
   * É o que tira a curva do portão: em vez de reavaliar 208 defeitos a cada
   * bloco, reavalia os que PODEM ter mudado de resposta. A regra é que o
   * veredito é função de três coisas — definição do defeito, conteúdo do
   * arquivo mutado, e fecho da suíte que o pegou — e a chave amarra as três.
   *
   * Três formas de isso virar mentira, e um teste para cada:
   *   · guardar um PASSOU (o portão passaria a herdar a própria falha);
   *   · a chave deixar de incluir o fecho (mudança na suíte não invalidaria);
   *   · o arnês mudar sem invalidar nada. */
  s.teste('o cache guarda apenas defeitos PEGOS', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const bloco = txt.match(/for \(const r of res\) \{[\s\S]*?guardados\[r\.id\][^\n]*\n/);
    ok(bloco, 'a gravação de vereditos sumiu — âncora perdida');
    ok(/r\.status !== 'PEGOU'\) continue/.test(bloco[0]),
      'o cache passou a guardar defeito não PEGO. Um PASSOU reaproveitado é o ' +
      'portão herdando a própria falha: o defeito escaparia hoje porque escapou ' +
      'ontem, e ninguém reavaliaria.');
  });

  s.teste('a chave do cache amarra o fecho da suíte que pegou', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const fn = txt.match(/function chaveDe\(d, captor\) \{[\s\S]*?\n\}/);
    ok(fn, 'a função `chaveDe` sumiu — âncora perdida');
    for (const [trecho, porque] of [
      ['d.arquivo', 'sem o caminho do arquivo, dois defeitos em arquivos diferentes colidem'],
      ['d.de', 'sem o trecho original, mudar o defeito não invalidaria o veredito'],
      ['d.para', 'sem a mutação, trocar o que o defeito faz não invalidaria'],
      ['HASHES.get(d.arquivo)', 'sem o conteúdo do arquivo mutado, editar o código não invalidaria'],
      ['digitalDeFecho.get(captor)', 'sem o fecho da suíte, mudar o TESTE não invalidaria — e o ' +
        'portão reaproveitaria um veredito de uma suíte que não existe mais assim'],
      ['process.version', 'sem a versão do Node, trocar de runtime herdaria vereditos'],
    ]) ok(fn[0].includes(trecho), `a chave do cache não inclui \`${trecho}\`: ${porque}`);
    ok(/if \(!captor\) return null/.test(fn[0]),
      'sem captor conhecido a chave precisa ser nula — não há fecho de que depender, ' +
      'e reaproveitar seria reaproveitar às cegas');
  });

  s.teste('mudar o arnês invalida todo veredito guardado', async () => {
    const { ARNES, fechoDaSuite, TUDO } = await import('./fecho.mjs');
    for (const a of ['test/harness.mjs', 'test/sabotagem.mjs'])
      ok(ARNES.includes(a),
        `${a} não está no fecho comum. Mudar o arnês muda COMO a pergunta é ` +
        `feita, e nenhum veredito anterior sobrevive a isso.`);
    /* E O QUE NÃO PODE ESTAR, que é o erro que quase matou o cache: os dois
       arquivos que TODO bloco mexe. Com eles no fecho comum, todo bloco
       invalidaria os 208 vereditos e o cache nunca pagaria nada. */
    for (const [a, porque] of [
      ['test/defeitos-plantados.mjs', 'ele muda toda vez que um bloco acrescenta ' +
        'um defeito, e a definição do defeito já entra na chave por conta própria'],
      ['test/run.mjs', 'ele muda toda vez que um bloco registra uma suíte nova, e ' +
        'suíte a mais não pode invalidar um PEGOU — só pode pegar mais'],
    ]) ok(!ARNES.includes(a), `${a} está no fecho comum: ${porque}`);
    /* E o fecho de uma suíte qualquer tem que carregar o arnês junto. */
    const f = fechoDaSuite('limites');
    ok(f === TUDO || ARNES.every(a => f.has(a)),
      'o fecho de uma suíte não inclui o arnês');
  });

  s.teste('as saídas do portão não entram no que ele mede', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    ok(/SAIDAS_DO_PORTAO\.has\(f\)\) continue/.test(txt),
      'o mapa de digitais voltou a incluir as saídas do próprio portão. ' +
      '`q2-veredito.json` e `captura.json` moram em `test/`, que é prefixo do ' +
      'fecho de várias suítes: gravá-los ao fim de uma execução invalida ' +
      'defeitos na execução seguinte sem nada ter mudado. Medido: 19 ' +
      'reavaliações fantasma, e o número cresce a cada bloco.');
    ok(!/SAIDAS_DO_PORTAO = new Set\(\[[^\]]*visual-base/.test(txt),
      '`visual-base.json` saiu do mapa. Aquele é ENTRADA de verdade — é a linha ' +
      'de base contra a qual a suíte visual julga —, e tirá-lo faria o portão ' +
      'reaproveitar vereditos de uma linha de base que mudou.');
  });

  s.teste('suíte que dispara processo tem fecho universal', async () => {
    const { fechoDaSuite, TUDO } = await import('./fecho.mjs');
    /* `concorrencia` roda `tools/q8-worker.mjs` como processo de verdade: o que
       o filho toca não se lê estaticamente. Dúvida resolve para TUDO — errar
       para mais custa uma reavaliação; errar para menos faz o portão mentir. */
    igual(fechoDaSuite('concorrencia'), TUDO,
      'uma suíte que dispara processo ganhou fecho restrito. O filho pode tocar ' +
      'em qualquer arquivo, e nada estático revela o quê.');
  });

  s.teste('só a execução COMPLETA regrava o índice', async () => {
    const { readFileSync } = await import('node:fs');
    const txt = readFileSync(new URL('./sabotagem.mjs', import.meta.url).pathname, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const grava = txt.indexOf('writeFileSync(CAMINHO_INDICE');
    ok(grava > 0, 'o índice deixou de ser gravado — âncora perdida');
    const antes = txt.slice(0, grava);
    const guarda = antes.lastIndexOf('if (!INCREMENTAL)');
    ok(guarda > 0 && guarda > antes.lastIndexOf('\n}\n'),
      'a gravação do índice não está sob `if (!INCREMENTAL)`. O modo incremental ' +
      'vê uma fatia dos defeitos: deixá-lo escrever apagaria o captor de todos os ' +
      'outros, e o índice viraria o retrato do último bloco.');
  });

  /* AS DUAS LISTAS DE SUÍTES DE NAVEGADOR TÊM QUE FECHAR (T3).
   *
   * `run.mjs` tem `COM_NAVEGADOR` — quem, se pedido, obriga o Chromium a subir.
   * `sabotagem.mjs` tem `SUITES_NAVEGADOR` — o que a segunda passada roda quando
   * a primeira saiu verde.
   *
   * Elas precisam concordar, e a divergência é SILENCIOSA nos dois sentidos:
   * suíte de navegador nova que não entre na lista da sabotagem deixa de rodar
   * naquela passada, e um defeito que só ela pega volta como PASSOU — o portão
   * diria "ninguém pega isto" quando a verdade é "ninguém perguntou".
   *
   * Duas listas em arquivos diferentes que precisam ser iguais é dívida; o teste
   * é o juro. Uni-las exigiria a sabotagem importar do runner, e ela roda o
   * runner como processo filho de propósito. */
  s.teste('as duas listas de suítes de navegador fecham', async () => {
    const { readFileSync } = await import('node:fs');
    const ler = f => readFileSync(new URL(f, import.meta.url).pathname, 'utf8');
    const doRunner = ler('./run.mjs').match(/const COM_NAVEGADOR = \[([^\]]+)\]/);
    const daSabotagem = ler('./sabotagem.mjs').match(/const SUITES_NAVEGADOR = '([^']+)'/);
    ok(doRunner, 'run.mjs sem a lista COM_NAVEGADOR — o teste perdeu a âncora');
    ok(daSabotagem, 'sabotagem.mjs sem a lista SUITES_NAVEGADOR — o teste perdeu a âncora');
    const A = doRunner[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    const B = daSabotagem[1].split(',').map(x => x.trim()).filter(Boolean);
    /* SEM EXCEÇÃO. A primeira versão deste teste dispensava o `sem-rede` "porque
       ela só existe quando há assets locais" — e foi exatamente por essa fresta
       que o S59, o vazamento de rede, voltou como PASSOU no Q2 completo. Se a
       suíte não estiver disponível ela simplesmente não roda; pedi-la a mais não
       custa nada, e deixá-la de fora custou um portão. */
    const faltando = A.filter(n => !B.includes(n));
    ok(faltando.length === 0,
      `a sabotagem não roda ${faltando.join(', ')} na passada com navegador. ` +
      `Um defeito que só essa suíte pega voltaria como PASSOU — o portão diria ` +
      `"ninguém pega" quando a verdade é "ninguém perguntou".`);
    const sobrando = B.filter(n => !A.includes(n));
    ok(sobrando.length === 0,
      `a sabotagem pede ${sobrando.join(', ')}, que o runner não conhece como ` +
      `suíte de navegador — o recorte reprovaria com "não conhece a suíte"`);
  });

  /* D-010 · CORRIGIDO NO T2 — os dois lados da mesma barra.
   *
   * O teste que existia aqui afirmava o defeito: reconstruía a magnitude medida
   * do card do V1.15 (média global 0,85 · pico 56) e exigia que `compararBase`
   * NÃO reclamasse. Ele ficava vermelho no dia em que o portão ficasse mais
   * fino. Ficou, e a afirmação virou o contrário.
   *
   * Os dois testes andam JUNTOS de propósito. Afinar um portão é fácil de
   * fingir: baixar o limite até tudo reprovar passa o primeiro teste sozinho e
   * é exatamente a sabotagem que o T2 declarou ("afrouxar o limite em vez de
   * afinar a resolução" tem gêmeo). O segundo teste é o preço: o ruído de
   * renderização medido tem que continuar passando.
   *
   * Puros: perturbam um vetor em memória, sem navegador. */
  const digitalDaBase = async () => {
    const { readFileSync } = await import('node:fs');
    return JSON.parse(readFileSync(
      new URL('./fixtures/visual-base.json', import.meta.url), 'utf8'));
  };
  /* A magnitude MEDIDA no V1.15: um punhado de pixels na coluna da direita
     mexendo até 56 pontos, o resto intocado. Dá média global ~0,85 — que é o que
     um card novo em paleta parecida produz. */
  const comComponente = (base, alvo) => {
    const v = base[alvo].slice();
    let mexidos = 0;
    for (let y = 0; y < 32 && mexidos < 15; y += 2){
      const i = (y * 32 + 29) * 3;
      for (let c = 0; c < 3; c++) v[i + c] = Math.min(255, v[i + c] + 56);
      mexidos++;
    }
    return v;
  };

  s.teste('um componente inteiro na coluna lateral reprova a linha de base', async () => {
    const { compararBase } = await import('./visual.mjs');
    const base = await digitalDaBase();
    const alvo = 'arena@largo';
    const v = comComponente(base, alvo);

    /* Confere ANTES que a perturbação ainda é a do V1.15. Sem isto o teste pode
       passar por ter virado outra coisa — uma mudança grosseira reprova em
       qualquer portão e não prova nada sobre este. */
    let som = 0, pico = 0;
    for (let i = 0; i < v.length; i++){
      const d = Math.abs(v[i] - base[alvo][i]); som += d; if (d > pico) pico = d;
    }
    const media = som / v.length;
    ok(pico >= 50 && pico <= 60 && media < 3,
      `a perturbação sintética (média ${media.toFixed(2)}, pico ${pico}) não reproduz mais a ` +
      `magnitude medida no V1.15 (média 0,85, pico 56) — reescreva o teste antes de confiar nele`);

    const falhas = compararBase({ ...base, [alvo]: v }, base);
    ok(falhas.length > 0,
      `a linha de base deixou passar um componente inteiro (média global ${media.toFixed(2)}, ` +
      `pico ${pico}) — é o D-010 de volta`);
    ok(falhas[0].includes(alvo) && /região/.test(falhas[0]),
      `reprovou, mas sem dizer onde: "${falhas[0]}"`);
  });

  /* O QUE A GRADE PEGA E O NÚMERO ÚNICO NÃO PEGARIA.
   *
   * Escrito DEPOIS da sabotagem, que é onde ele nasceu: pôr `GRADE = 1` — a
   * comparação de volta à tela inteira — e o teste do componente do V1.15
   * continuou vermelho. O que o pega é o pico, que o T2 apertou de 60 para 30
   * pela mesma medição. A grade estava passando sem prova.
   *
   * Este é o caso que só ela pega: um componente que respeita a paleta a ponto
   * de nenhum pixel mexer 30 pontos, mas que mexe uma REGIÃO inteira. Pela tela
   * toda dá média 0,7 — sob qualquer limite razoável. Pela região dá 22.
   *
   * É o D-010 no seu formato mais puro, e é por isso que a grade existe. */
  s.teste('um componente em paleta quase idêntica reprova a linha de base', async () => {
    const { compararBase } = await import('./visual.mjs');
    const PICO_ANTIGO = 60;                 // o limite que o D-010 tinha
    const base = await digitalDaBase();
    const alvo = 'arena@largo';
    const DELTA = 22;                       // abaixo do limite de pico, de propósito
    const v = base[alvo].slice();
    /* um bloco de 8x4 px na coluna da direita: dois quadrados da grade */
    for (let y = 8; y < 12; y++) for (let x = 24; x < 32; x++) {
      const i = (y * 32 + x) * 3;
      for (let c = 0; c < 3; c++) v[i + c] = Math.min(255, v[i + c] + DELTA);
    }
    let som = 0, pico = 0;
    for (let i = 0; i < v.length; i++){
      const d = Math.abs(v[i] - base[alvo][i]); som += d; if (d > pico) pico = d;
    }
    const media = som / v.length;
    ok(pico <= PICO_ANTIGO && media < 3,
      `a perturbação (média ${media.toFixed(2)}, pico ${pico}) não é mais invisível ao portão ` +
      `antigo (média > 3 ou pico > ${PICO_ANTIGO}) — o teste deixaria de provar a grade`);

    const falhas = compararBase({ ...base, [alvo]: v }, base);
    ok(falhas.length > 0,
      `a linha de base deixou passar um componente que mexe uma região inteira ` +
      `sem estourar o pico (média global ${media.toFixed(2)}, pico ${pico}) — ` +
      `é a comparação voltando a ser da tela inteira`);
  });

  s.teste('ruído de renderização não reprova a linha de base', async () => {
    const { compararBase } = await import('./visual.mjs');
    const base = await digitalDaBase();
    /* O piso MEDIDO no T2: duas capturas da mesma interface, quatro larguras,
       quatro telas — pior pico observado **3**, pior média de região **0,38**.
       Ruído real é assim: quase todo pixel mexe um tico, uns poucos mexem o
       pico. O que vai aqui é esse formato com folga de 2,6x na média — todo
       pixel em ±1 (média de região 1,0) e um a cada 16 no pico medido.
       Escrever "todo pixel no pico" seria 8x o piso e testaria outra coisa. */
    const barulhenta = {};
    for (const k of Object.keys(base)) barulhenta[k] = base[k].map((x, i) => {
      const d = (i % 16 === 0 ? 3 : 1) * (i % 2 ? 1 : -1);
      return Math.max(0, Math.min(255, x + d));
    });
    const falhas = compararBase(barulhenta, base);
    ok(falhas.length === 0,
      `o portão ficou apertado demais: ruído no formato medido reprovou ` +
      `${falhas.length} tela(s) — ${falhas[0]}.\n` +
      `      Portão que reprova ruído é regravado até calar, e aí não é portão.`);
  });

  /* --- o pré-voo contra a lista DE VERDADE -------------------------------
   *
   * Os testes acima usam dados sintéticos, porque testar contra o arquivo real
   * falharia a cada edição do jogo. Este é o oposto: roda o pré-voo sobre a
   * lista viva, e é ele que teria pego o S15 no V1.14.
   *
   * NÃO RODA DENTRO DA CAIXA DE AREIA DA SABOTAGEM, e a razão é séria.
   *
   * A sabotagem planta um defeito trocando `de` por `para` no arquivo. Dentro
   * da caixa, portanto, o `de` daquele defeito DEIXOU de existir — e este
   * teste o acusaria como âncora ausente. Ou seja: qualquer defeito plantado
   * ficaria vermelho aqui, por construção, e o relatório do Q2 passaria a
   * dizer "pego por portao" para os 82. A coluna "pego por" existe justamente
   * para revelar área com cobertura fraca; um teste que pega tudo por
   * tautologia apaga essa informação.
   *
   * Descoberto pela própria sabotagem, na primeira execução depois de escrever
   * este arquivo: S79, S80, S81 e S82 vieram todos com "pego por portao",
   * inclusive o S82, que mexe em `run.mjs` e não tem nada a ver com âncora.
   *
   * O pulo é DECISÃO, não esquecimento: dentro da caixa a âncora perturbada é
   * o comportamento esperado. Fora dela o teste roda sempre, e a sabotagem
   * ainda faz a mesma conferência no seu próprio pré-voo, antes de montar
   * caixa nenhuma. Não há janela sem cobertura.
   *
   * O `return` PRECISA ficar depois dos testes puros acima, e isso não é
   * arrumação: quando ele estava no topo da suíte, os três testes do D-010
   * nunca rodavam dentro da caixa — e o S95 e o S96, que sabotam exatamente
   * eles, passaram batido no primeiro Q2 completo do T2. Um teste que só roda
   * fora da caixa não é pego pela sabotagem, e sabotagem que não pega é o
   * mesmo que teste que não existe. */
  if (process.env.EM_SANDBOX === '1') {
    console.log('  · portao: conferência da lista real pulada (caixa de areia da sabotagem)');
    return s;
  }
  s.teste('a lista real de defeitos não tem âncora perdida, ambígua ou inócua', async () => {
    const { DEFEITOS } = await import('./defeitos-plantados.mjs');
    const { readFileSync } = await import('node:fs');
    const raiz = new URL('../', import.meta.url).pathname;
    const probs = conferirAncoras(DEFEITOS, f => readFileSync(raiz + f, 'utf8'));
    ok(probs.length === 0,
      `${probs.length} defeito(s) plantado(s) sem valor:\n      ` +
      probs.map(p => `${p.id} [${p.tipo}] ${p.arquivo} — ${p.detalhe}`).join('\n      '));
  });

  return s;
}
