/* Q1/Q3 · TODO SÍMBOLO CHAMADO TEM ONDE NASCER (bloco 1.22, camada 0).
 *
 * ── POR QUE ESTA SUÍTE EXISTE (D-074) ────────────────────────────────────
 *
 * O bloco 1.21 escreveu, em `idle-tela.mjs`:
 *
 *     ${seloDaEvolucao(c, E.bolsa, idItem => nomeDoItemPack(idItem))}
 *
 * `nomeDoItemPack` **não existe em lugar nenhum do repositório.** Eu inventei o
 * nome enquanto escrevia a linha e nunca o escrevi de verdade.
 *
 * A suíte inteira ficou VERDE — 1724 testes —, o Q2 pegou os 748 defeitos, e o
 * jogo do dono **parou de desenhar a aba de Rotas**: três painéis em branco, o
 * banner ainda contando, e **nenhum erro no console** para quem não abrisse o
 * inspetor. O relato dele foi *"o meu pokémon bugou, estava pra coletar
 * recompensa, atualizei e ficou assim"*.
 *
 * ── O QUE FALHOU NÃO FOI A FALTA DE PORTÃO. FOI UM PORTÃO QUE MENTIA ─────
 *
 * `test/ligacao.mjs` existe exatamente para esta classe de erro, e o cabeçalho
 * dele promete, com estas palavras:
 *
 *     PEGA        nome importado que o arquivo de origem não exporta
 *     PEGA        símbolo usado como função e que não tem origem no arquivo
 *
 * **A segunda linha nunca foi construída.** O corpo da suíte confere `import`
 * contra `export` e mais nada. E este defeito não tinha import nenhum para
 * conferir — foi por baixo da única metade que existia.
 *
 *   > **Cabeçalho não é portão.** Eu li a promessa, acreditei nela, e deixei de
 *   > escrever o teste que o bloco pedia porque "já estava coberto".
 *
 * O Q5 abre o jogo num navegador de verdade e reprova em `pageerror` — e ele
 * também passou, porque o caminho só é percorrido quando o jogador tem uma
 * criatura cuja evolução mais perto exige um ITEM. O save de teste tinha um
 * inicial de nível 7, que espera NÍVEL. A lição que fica ao lado da primeira:
 *
 *   > **Um caminho que o dado de teste nunca toma é um caminho que o portão
 *   > não abriu.**
 *
 * ── O QUE ELA PEGA, E O PREÇO QUE ELA SE RECUSA A PAGAR ──────────────────
 *
 * Ela lê texto e não executa nada, como a `ligacao`. Para cada `NOME(` procura
 * uma ORIGEM no mesmo arquivo: import, declaração, parâmetro, método de objeto,
 * global conhecido. Sem origem, é chamada para o vazio.
 *
 *     PEGA        `nomeDoItemPack(id)` sem import e sem declaração
 *     NÃO PEGA    símbolo montado em tempo de execução, `globalThis[nome]`
 *     NÃO PEGA    símbolo só REFERENCIADO e nunca chamado — `f(x, orfao)`
 *
 * **O terceiro item é medido, e não suposto.** Estender a peneira de CHAMADA
 * para REFERÊNCIA foi tentado e descartado com número na mão:
 *
 *     alarmes ao cobrir toda referência    302
 *     quantos eram defeito                 0
 *
 * O ruído vem de coisas que o texto não distingue de referência: o `from` de um
 * `import`, o alvo de uma desestruturação, a variável de um `for`. Trezentos
 * alarmes falsos não deixam ninguém achar o verdadeiro, e a peneira seria
 * desligada no bloco seguinte.
 *
 * Este parágrafo existe porque **foi um cabeçalho mentiroso que deixou o D-074
 * passar**: `ligacao.mjs` prometia esta suíte inteira numa linha que ninguém
 * tinha construído. O que esta peneira não faz fica escrito com a medição do
 * lado, para o próximo bloco não confiar numa promessa vazia de novo.
 *
 * **Alarme falso aqui é pior que buraco.** *Peneira que dá alarme falso é
 * peneira que alguém desliga* — e desligada ela não pega mais nada, inclusive o
 * que ela existia para pegar. Por isso a lista de origens é GENEROSA de
 * propósito: na dúvida, ela se cala. Uma peneira grossa que roda em
 * milissegundos e nunca mente vale mais que uma fina que o próximo bloco
 * silencia.
 */
import { criarSuite, ok } from './harness.mjs';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PASTAS = ['app/modules', 'engine', 'server'];

export function fontes() {
  const out = [];
  for (const p of PASTAS) {
    const dir = join(RAIZ, p);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(x => x.endsWith('.mjs')))
      out.push({ rel: `${p}/${f}`, abs: join(dir, f) });
  }
  return out;
}

/* ── O QUE NÃO É CHAMADA DE FUNÇÃO NOSSA ──────────────────────────────────
 *
 * Palavras da linguagem que aparecem coladas num parêntese. `if (`, `for (`,
 * `catch (` — todas casam com o padrão de chamada e nenhuma é chamada. */
const PALAVRAS = new Set(`if for while switch catch return typeof instanceof new
  delete void do else try finally throw yield await async function class extends
  super this import export default case in of let const var`.split(/\s+/));

/* Os globais que este projeto usa de fato. Lista escrita à mão, e não derivada:
   derivar de `globalThis` do Node deixaria de fora tudo que só existe no
   navegador — que é metade do app — e a suíte passaria a acusar `document`. */
const GLOBAIS = new Set(`
  Object Array Number String Boolean Symbol BigInt Math JSON Date RegExp Error
  TypeError RangeError SyntaxError Map Set WeakMap WeakSet Promise Proxy Reflect
  Function Intl ArrayBuffer DataView Uint8Array Uint8ClampedArray Int8Array
  Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array
  parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent
  encodeURI decodeURI eval structuredClone queueMicrotask
  setTimeout clearTimeout setInterval clearInterval
  requestAnimationFrame cancelAnimationFrame requestIdleCallback
  fetch alert confirm prompt atob btoa scrollTo scrollBy open close print
  addEventListener removeEventListener dispatchEvent getComputedStyle matchMedia
  console document window globalThis navigator location history performance
  localStorage sessionStorage indexedDB crypto caches
  ResizeObserver IntersectionObserver MutationObserver PerformanceObserver
  Image Audio Video Option Worker SharedWorker MessageChannel BroadcastChannel
  Event CustomEvent ErrorEvent MessageEvent AbortController AbortSignal
  URL URLSearchParams TextEncoder TextDecoder Blob File FileReader FormData
  Headers Request Response WebSocket XMLHttpRequest EventSource
  Path2D ImageData OffscreenCanvas DOMMatrix DOMParser XPathEvaluator
  ImageDecoder ImageBitmap createImageBitmap
  HTMLElement HTMLCanvasElement HTMLImageElement Node NodeFilter Element
  CSS CSSStyleSheet AudioContext OscillatorNode GainNode
  process Buffer require module exports __dirname __filename
  setImmediate clearImmediate TextDecoderStream ReadableStream WritableStream
  URLPattern reportError
`.trim().split(/\s+/));

/* ── AS ORIGENS DE UM NOME, DENTRO DO PRÓPRIO ARQUIVO ─────────────────────
 *
 * Generosa de propósito, e cada família aqui existe porque a ausência dela
 * produziria alarme falso — que é o único modo de falha que mata uma peneira.
 */
export function origens(txt) {
  const n = new Set();
  const add = s => { for (const x of String(s).match(/[\p{L}_$][\p{L}\p{N}_$]*/gu) ?? []) n.add(x); };

  /* import — nomeado, default e namespace */
  for (const m of txt.matchAll(/import\s+([^;'"]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const c = m[1];
    const ch = /\{([^}]*)\}/.exec(c);
    if (ch) for (const p of ch[1].split(','))
      n.add(p.trim().split(/\s+as\s+/).pop().trim());
    const fora = c.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+/, '');
    add(fora);
  }
  /* declarações, incluindo desestruturação: `const { a, b } = x` */
  for (const m of txt.matchAll(/\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[\p{L}_$][\p{L}\p{N}_$]*)/gu))
    add(m[1]);   /* `{ a: b }` entra com os dois lados — generosa de propósito */
  for (const m of txt.matchAll(/\b(?:function|class)\s*\*?\s*([\p{L}_$][\p{L}\p{N}_$]*)/gu)) n.add(m[1]);

  /* PARÂMETROS. Sem eles a peneira acusaria todo callback recebido por
     argumento — que é o padrão deste projeto inteiro (`nomeDoItem`, `agora`,
     `lerEstado`). Quatro formas, e as quatro aparecem no repositório.

     O `(?:[^()]|\([^()]*\))*` aceita UM nível de parêntese aninhado, e ele não
     é luxo: `(sete = () => 2) => …` é um parâmetro com valor padrão, e um
     padrão em forma de função tem parêntese dentro. Sem o aninhamento a lista
     inteira era descartada e o parâmetro virava órfão. */
  const LISTA = '(?:[^()]|\\([^()]*\\))*';
  const ID = '[\\p{L}_$][\\p{L}\\p{N}_$]*';
  for (const m of txt.matchAll(new RegExp(`\\bfunction\\s*\\*?\\s*${ID}?\\s*\\((${LISTA})\\)`, 'gu'))) add(m[1]);
  for (const m of txt.matchAll(new RegExp(`\\((${LISTA})\\)\\s*=>`, 'gu'))) add(m[1]);
  for (const m of txt.matchAll(/(?:^|[^.\p{L}\p{N}_$])([\p{L}_$][\p{L}\p{N}_$]*)\s*=>/gmu)) n.add(m[1]);
  for (const m of txt.matchAll(/\bcatch\s*\(([^)]*)\)/g)) add(m[1]);

  /* MÉTODOS DE OBJETO LITERAL: `{ foo() {} }`. Sem isto a definição seria lida
     como chamada — o nome aparece colado num parêntese nos dois casos. Aceita
     início de linha, `{` ou `,` antes: um objeto de uma linha só põe o método
     no meio da linha, e exigir a coluna zero deixava esse caso de fora. */
  for (const m of txt.matchAll(/(?:^|[{,])\s*(?:async\s+)?([\p{L}_$][\p{L}\p{N}_$]*)\s*\([^()]*\)\s*\{/gmu))
    n.add(m[1]);

  /* NOMES DE PROPRIEDADE: `{ nome: fn }` e `obj.nome(...)`. O acesso já é
     excluído no padrão de chamada, mas a chave de objeto com o mesmo nome de
     uma função chamada logo abaixo é comum e inofensiva. */
  for (const m of txt.matchAll(/([\p{L}_$][\p{L}\p{N}_$]*)\s*:/gu)) n.add(m[1]);
  return n;
}

/* ── SÓ O CÓDIGO, NUM PASSO SÓ ────────────────────────────────────────────
 *
 * Apaga comentário e texto de literal, e devolve o resto na MESMA posição —
 * cada caractere retirado vira espaço, e a quebra de linha se mantém, para o
 * número de linha do alarme continuar sendo o do arquivo.
 *
 * ── POR QUE UM VARREDOR, E NÃO TRÊS `replace` EM FILA ────────────────────
 *
 * A primeira versão fazia em três passadas: template, depois comentário,
 * depois aspas. Ela acusou `server/protecao.mjs` de chamar `BY(...)` — o
 * `ORDER BY (ate IS NULL)` de um SQL escrito em template.
 *
 * A causa não estava no SQL. **Este projeto escreve `assim` nos comentários**,
 * com crase, e a passada de template não sabe o que é comentário: a primeira
 * crase de uma nota flipava o varredor para dentro de um template que nunca
 * existiu, e dali em diante o arquivo inteiro estava fora de fase — código
 * lido como texto e texto lido como código.
 *
 *   > **Peneira que corre em passadas independentes lê o arquivo com três
 *   > gramáticas diferentes, e a segunda não sabe o que a primeira comeu.**
 *
 * O template é metade texto e metade código, e as duas metades importam:
 * `${seloDoFoco(c, t)}` é chamada de verdade, e `aposta(s)` é português. Então
 * o texto some e a SUBSTITUIÇÃO fica — inclusive quando ela tem template
 * dentro, que este projeto também faz.
 *
 * A barra é o caso ambíguo da linguagem: `/` divide ou abre expressão regular,
 * e só o que veio antes decide. A regra usada é a de sempre — depois de
 * operador ou abre-parêntese é expressão regular; depois de valor é divisão. */
export function soCodigo(txt) {
  /* PRÉ-PREENCHIDO, e não um array com buracos. `new Array(n)` sem preencher
     deixa vazios, e `join('')` renderiza vazio como NADA — a saída encolhe e
     todo número de linha depois do primeiro buraco sai errado. Um alarme com
     linha errada custa mais tempo que alarme nenhum. */
  const out = [...txt].map(c => (c === '\n' ? '\n' : ' '));
  const branco = c => (c === '\n' ? '\n' : ' ');
  /* Pilha de templates: `-1` = estamos no TEXTO; `>= 0` = dentro de `${…}`, e
     o número é a profundidade de chaves, para `${ {a:1} }` não fechar cedo. */
  const pilha = [];
  const noTexto = () => pilha.length && pilha[pilha.length - 1] === -1;
  let i = 0, anterior = '';
  const ANTES_DE_REGEX = new Set('([{=,:;!&|?+-*%~^<>'.split(''));

  while (i < txt.length) {
    const c = txt[i], d = txt[i + 1];

    /* O TEXTO DO TEMPLATE VEM PRIMEIRO, e a ordem é o defeito que esta versão
       corrige: com a aspa testada antes, um apóstrofo dentro do texto (`d'água`,
       `não há`) abria uma string fantasma que engolia o código até a próxima
       aspa — e vinte e nove funções declaradas viraram "órfãs". Dentro do texto
       de um template só existem três coisas: a crase que fecha, a barra
       invertida que escapa, e o `${` que devolve a palavra ao código. */
    if (noTexto()) {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; pilha.pop(); anterior = 'x'; continue; }
      if (c === '$' && d === '{') { i += 2; pilha[pilha.length - 1] = 0; continue; }
      i++;
      continue;
    }

    if (c === '/' && d === '/') {                       /* comentário de linha */
      while (i < txt.length && txt[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {                       /* comentário de bloco */
      i += 2;
      while (i < txt.length && !(txt[i] === '*' && txt[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {                       /* texto entre aspas */
      out[i] = c; i++;
      while (i < txt.length && txt[i] !== c && txt[i] !== '\n') {
        if (txt[i] === '\\') { i += 2; continue; }
        i++;
      }
      if (i < txt.length && txt[i] === c) out[i] = txt[i], i++;
      anterior = 'x';
      continue;
    }
    if (c === '/' && (anterior === '' || ANTES_DE_REGEX.has(anterior))) {
      i++;                                              /* expressão regular */
      let classe = false;
      while (i < txt.length && txt[i] !== '\n') {
        if (txt[i] === '\\') { i += 2; continue; }
        if (txt[i] === '[') classe = true;
        else if (txt[i] === ']') classe = false;
        else if (txt[i] === '/' && !classe) { i++; break; }
        i++;
      }
      while (i < txt.length && /[a-z]/.test(txt[i])) i++;
      anterior = 'x';
      continue;
    }
    if (c === '`') { i++; pilha.push(-1); continue; }   /* template abre */

    if (pilha.length && c === '{') pilha[pilha.length - 1]++;
    if (pilha.length && c === '}') {
      if (pilha[pilha.length - 1] === 0) {              /* fecha a substituição */
        i++; pilha[pilha.length - 1] = -1; continue;
      }
      pilha[pilha.length - 1]--;
    }
    out[i] = c;
    if (!/\s/.test(c)) anterior = c;
    i++;
  }
  return out.join('');
}

/* Os nomes CHAMADOS: `nome(` que não venha depois de um ponto (`a.b()` é do
   objeto, não deste arquivo) nem de `?.`. */
export function chamados(txt) {
  const limpo = soCodigo(txt);
  const out = new Map();
  /* LOOKBEHIND, e não um grupo que CONSOME o caractere anterior. Com o grupo,
     `a(inventado(1))` só devolvia `a`: o `(` de `a(` era comido pela primeira
     casada e a segunda ficava sem o caractere que ela precisava olhar. Uma
     chamada aninhada é o lugar mais comum de um símbolo órfão — era o buraco
     no meio da peneira, e ele apareceu no próprio caso montado. */
  /* E o identificador é UNICODE, e não `[A-Za-z]`. `laçoDoAtor` existe neste
     repositório: com o padrão ASCII a peneira lia `oDoAtor` — o pedaço DEPOIS
     da cedilha — e acusava de órfão uma função declarada três linhas acima.
     Nome acentuado é legal em JS, e este projeto escreve em português. */
  for (const m of limpo.matchAll(/(?<![.\p{L}\p{N}_$?])([\p{L}_$][\p{L}\p{N}_$]*)\s*\(/gu)) {
    if (PALAVRAS.has(m[1])) continue;
    if (!out.has(m[1])) out.set(m[1], limpo.slice(0, m.index).split('\n').length);
  }
  return out;
}

/* ── A VARREDURA DE UM TEXTO, E O CAMINHO É UM SÓ ─────────────────────────
 *
 * O repositório e o caso montado passam POR AQUI, e essa é a única razão de
 * esta função existir como função.
 *
 * A primeira versão tinha o laço escrito dentro do teste e o caso montado
 * chamando `chamados`/`origens` por baixo. Três sabotagens da própria peneira
 * passaram: desligar o `if` que compara com as origens deixava o laço do
 * repositório mudo, e o caso montado continuava verde porque nunca tinha
 * passado por aquele `if`.
 *
 *   > **Auto-verificação que não percorre o mesmo caminho da afirmação não
 *   > verifica a afirmação: verifica outra coisa parecida.**
 *
 * É a mesma família do `|| conta(semFoco) === 0` que eu escrevi no 1.18 — a
 * régua com folga posta por quem escreve o teste. */
export function orfaosDe(rel, txt) {
  const achados = [];
  /* As origens saem do CÓDIGO, e não do arquivo cru: um nome citado só em
     comentário não é uma declaração, e aceitá-lo como origem deixaria a NOTA
     sobre o defeito servir de esconderijo para o defeito. */
  const tem = origens(soCodigo(txt));
  let chamadas = 0;
  for (const [nome, linha] of chamados(txt)) {
    chamadas++;
    if (GLOBAIS.has(nome) || tem.has(nome)) continue;
    achados.push(`${rel}:${linha} chama \`${nome}(...)\``);
  }
  return { achados, chamadas };
}

export function suite() {
  const s = criarSuite('origem');

  s.teste('todo símbolo chamado tem onde nascer', () => {
    /* JUNTA TUDO ANTES DE FALAR. Reprovar no primeiro achado esconderia os
       outros, e uma peneira que revela um órfão por execução obriga a rodar a
       suíte tantas vezes quantos forem os defeitos — foi assim que os três
       alarmes falsos desta própria peneira apareceram um a um. */
    const orfaos = [];
    let arquivos = 0, chamadas = 0;
    for (const f of fontes()) {
      const r = orfaosDe(f.rel, readFileSync(f.abs, 'utf8'));
      orfaos.push(...r.achados);
      chamadas += r.chamadas;
      arquivos++;
    }
    ok(orfaos.length === 0,
      `${orfaos.length} símbolo(s) chamado(s) sem origem:\n      ` +
      orfaos.join('\n      ') +
      '\n      Nenhum é importado, declarado, parâmetro ou global conhecido. ' +
      'É sintaxe válida: só quebra quando a linha executa. Foi assim que ' +
      '`nomeDoItemPack` derrubou a aba de Rotas inteira com a suíte VERDE e o ' +
      'console limpo (D-074).');
    ok(chamadas > 2000,
      `só ${chamadas} chamadas varridas — a peneira parou de casar com o ` +
      'código, e peneira que não pega nada passa verde sobre qualquer coisa');
  });

  s.teste('a peneira varre o repositório INTEIRO, e não uma pasta', () => {
    /* `fontes()` é o alcance da peneira, e reduzi-lo é o jeito mais silencioso
       de desligá-la: a suíte continua verde, só que sobre menos código. As três
       pastas são nomeadas uma a uma de propósito — perder o `server/` ou o
       `engine/` não pode ser um efeito colateral que ninguém vê. */
    const rels = fontes().map(f => f.rel);
    ok(rels.length > 100, `só ${rels.length} arquivos no alcance da peneira`);
    /* LITERAIS, E NÃO `PASTAS` (D-111): iterar a própria constante tornava o
       teste cego ao corte dela — a lista encolhia junto com o que ela afirma.
       O `> 100` segurava sozinho enquanto `app/modules` tinha menos de 100
       arquivos; em 25/09 tinha 144, e o Q2 completo viu o S765 passar. */
    for (const p of ['app/modules', 'engine', 'server'])
      ok(rels.some(r => r.startsWith(p + '/')),
        `nenhum arquivo de "${p}" entrou na varredura`);
  });

  s.teste('a peneira PEGA um símbolo órfão — pelo MESMO caminho do repositório', () => {
    /* Sem isto a afirmação de cima é indistinguível de uma que não faz nada, e
       foi EXATAMENTE assim que a `ligacao` prometeu esta verificação no
       cabeçalho durante três blocos sem a ter no corpo. */
    const orfao = "import { a } from './x.mjs';\nexport const f = () => a(inventado(1));";
    const achou = orfaosDe('montado.mjs', orfao).achados;
    ok(achou.length === 1 && achou[0].includes('inventado'),
      `a peneira devia acusar só "inventado" e acusou: ${achou.join(' | ') || '(nada)'}`);

    /* DENTRO DE UM TEMPLATE, que é onde o D-074 morava de verdade. Este projeto
       escreve a tela inteira em template, e uma peneira cega ali é cega no
       lugar exato onde a interface nasce. */
    const naTela = 'export const t = c => `<b>${enfeitar(c)}</b>`;';
    const naTelaAchou = orfaosDe('montado.mjs', naTela).achados;
    ok(naTelaAchou.length === 1 && naTelaAchou[0].includes('enfeitar'),
      'a peneira não enxerga chamada dentro de `${…}` — que é onde o D-074 ' +
      `estava. Acusou: ${naTelaAchou.join(' | ') || '(nada)'}`);

    /* E ela se CALA sobre o que tem origem — as famílias, uma a uma. */
    const bom = `import { um } from './x.mjs';
      const dois = () => 1;
      function tres(quatro) { return quatro(um(), dois()); }
      const alvo = { cinco() { return 1; } };
      const laçoDoAtor = () => 1;
      export const seis = (sete = () => 2) =>
        sete(tres(x => x), alvo.cinco(), laçoDoAtor(), \`\${dois()} aposta(s)\`);`;
    const mudos = orfaosDe('montado.mjs', bom).achados;
    ok(mudos.length === 0,
      `alarme falso em ${mudos.join(', ')} — e peneira que dá alarme falso é ` +
      'peneira que alguém desliga');
  });

  return s;
}
