/* Q1/Q3 · TODO `import` ACHA O QUE IMPORTA (bloco T8, camada 0).
 *
 * ── POR QUE ESTA SUÍTE EXISTE (L-103) ────────────────────────────────────
 *
 * No bloco 1.10 uma extração de módulo apagou `export function renderIdle` por
 * acidente. O resultado:
 *
 *     node test/run.mjs --so=modulos,idle-tela,estagios    VERDE 48/48
 *     o app no navegador                                    não boota
 *
 * A aba inteira ficou travada atrás do `#boot`, com o erro certo no console, e
 * nenhuma suíte de Node disse nada. No mesmo bloco, uma segunda extração deixou
 * `agora` e `concluidasHoje` sem origem — e os dois também só apareceram na
 * tela.
 *
 * ── O QUE `modulos.mjs` NÃO VÊ, E POR QUÊ ────────────────────────────────
 *
 * Ele confere SINTAXE varrendo os arquivos como texto — foi o que o D-017
 * construiu, e pega arquivo que não analisa. Não pega LIGAÇÃO: `import { X }`
 * de um módulo que não exporta `X` é sintaxe válida nos DOIS lados. Só quebra
 * quando alguém tenta juntar os dois, e quem junta é o navegador.
 *
 * Quem pega isso hoje é o Q5, que precisa de Chromium e leva 200 s.
 *
 *   > **Portão que só existe caro é portão que se roda pouco.**
 *
 * ── O QUE ESTA PENEIRA PEGA, E O QUE ELA NÃO PEGA ────────────────────────
 *
 * Ela lê texto e não executa nada. Custa milissegundos, e por isso roda no laço
 * de construção — que é onde o defeito nasce e onde ele é barato.
 *
 *     PEGA        nome importado que o arquivo de origem não exporta
 *     NÃO PEGA    `export * from`, reexportação em cadeia, nome montado em
 *                 tempo de execução
 *     NÃO PEGA    símbolo usado como função e que não tem origem no arquivo —
 *                 isso é `test/origem.mjs`, e a linha abaixo diz por quê
 *
 * ── UMA LINHA DESTE CABEÇALHO ERA MENTIRA, E ELA CUSTOU A ABA DE ROTAS ───
 *
 * Até o bloco 1.22 a segunda linha da tabela acima dizia **PEGA** para "símbolo
 * usado como função sem origem no arquivo". O corpo desta suíte nunca fez isso:
 * ele confere `import` contra `export`, e só.
 *
 * No 1.21 eu escrevi `nomeDoItemPack(id)` — um nome que inventei enquanto
 * escrevia a linha e nunca declarei em lugar nenhum. Não havia import para
 * conferir, então a única metade que existia passou por cima. A suíte fechou
 * VERDE em 1724 testes, o Q2 pegou os 748 defeitos, e o dono abriu o jogo com
 * três painéis em branco.
 *
 *   > **Cabeçalho não é portão.** Eu li esta promessa, acreditei nela, e deixei
 *   > de escrever o teste que o bloco pedia porque "já estava coberto".
 *
 * A verificação existe agora, em `test/origem.mjs`, e é o D-074.
 *
 * O que ela não pega continua sendo do Q5, e é por isso que ela não o
 * substitui: é uma peneira grossa que devolve a maioria dos casos em
 * milissegundos, e o navegador continua sendo quem julga.
 */
import { criarSuite, ok } from './harness.mjs';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTAS = ['app/modules', 'engine', 'server'];

/* Os arquivos que participam. `app/index.html` entra porque ele é quem importa
   as abas — e foi exatamente ali que o `renderIdle` sumiu sem ninguém ver. */
function fontes() {
  const out = [];
  for (const p of PASTAS) {
    const dir = join(RAIZ, p);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(x => x.endsWith('.mjs')))
      out.push({ rel: `${p}/${f}`, abs: join(dir, f) });
  }
  out.push({ rel: 'app/index.html', abs: join(RAIZ, 'app/index.html'), html: true });
  return out;
}

/* O que um arquivo EXPORTA, por nome.
 *
 * Cobre as formas que este projeto usa: `export const/let/function/class`,
 * `export { a, b as c }`, e `export default`. `export * from` marca o arquivo
 * como OPACO — dali em diante esta peneira se cala sobre ele, porque afirmar
 * sem saber é pior que não afirmar. */
function exportados(txt) {
  const nomes = new Set();
  let opaco = false;
  if (/^\s*export\s+\*\s+from/m.test(txt)) opaco = true;
  for (const m of txt.matchAll(/^\s*export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm))
    nomes.add(m[1]);
  /* DESESTRUTURAÇÃO: `export const { a, b } = X`. O `motor.mjs` reexporta o
     motor inteiro assim, e a primeira versão desta peneira acusou dezoito
     imports válidos como quebrados.

     Peneira que dá alarme falso é peneira que alguém desliga — e desligada ela
     não pega mais nada, inclusive o que ela existia para pegar. */
  for (const m of txt.matchAll(/^\s*export\s+(?:const|let|var)\s*[{[]([\s\S]*?)[}\]]\s*=/gm))
    for (const parte of m[1].split(',')) {
      const bruto = parte.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!bruto || bruto.startsWith('...')) continue;
      /* `{ a: b }` renomeia — quem sai é `b`; `{ a = 1 }` traz padrão. */
      const nome = bruto.includes(':') ? bruto.split(':')[1] : bruto.split('=')[0];
      const limpo = nome.trim().replace(/[^A-Za-z0-9_$]/g, '');
      if (limpo) nomes.add(limpo);
    }
  for (const m of txt.matchAll(/^\s*export\s*\{([^}]*)\}/gm))
    for (const parte of m[1].split(',')) {
      const t = parte.trim();
      if (!t) continue;
      nomes.add(t.includes(' as ') ? t.split(/\s+as\s+/)[1].trim() : t);
    }
  if (/^\s*export\s+default/m.test(txt)) nomes.add('default');
  return { nomes, opaco };
}

/* Os imports RELATIVOS de um arquivo. Pacote externo não existe aqui (o projeto
   tem zero dependências), e `node:` é do runtime. */
function importados(txt) {
  const out = [];
  for (const m of txt.matchAll(/import\s+([^;'"]*?)\s+from\s+['"](\.[^'"]+)['"]/g)) {
    const [, clausula, caminho] = m;
    const chaves = /\{([^}]*)\}/.exec(clausula);
    const nomes = chaves
      ? chaves[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
      : [];
    const temDefault = /^\s*[A-Za-z_$][\w$]*\s*(?:,|$)/.test(clausula.replace(/\{[^}]*\}/, ''));
    out.push({ caminho, nomes, temDefault });
  }
  return out;
}

export function suite() {
  const s = criarSuite('ligacao');

  s.teste('todo import nomeado acha o que importa', () => {
    const arqs = fontes();
    const cache = new Map();
    const ler = abs => {
      if (!cache.has(abs)) cache.set(abs, exportados(readFileSync(abs, 'utf8')));
      return cache.get(abs);
    };
    let conferidos = 0;

    for (const f of arqs) {
      const txt = readFileSync(f.abs, 'utf8');
      const base = dirname(f.abs);
      for (const imp of importados(txt)) {
        const alvo = resolve(base, imp.caminho);
        if (!existsSync(alvo)) {
          ok(false, `${f.rel} importa "${imp.caminho}", que não existe no disco`);
          continue;
        }
        const { nomes, opaco } = ler(alvo);
        if (opaco) continue;
        for (const n of imp.nomes) {
          conferidos++;
          ok(nomes.has(n),
            `${f.rel} importa { ${n} } de "${imp.caminho}", e esse arquivo não o ` +
            'exporta.\n      É sintaxe válida nos dois lados: só quebra quando ' +
            'alguém junta os dois, e quem junta é o navegador. Foi assim que uma ' +
            'extração apagou `renderIdle` no 1.10 e a suíte ficou VERDE com o app ' +
            'sem bootar.');
        }
        if (imp.temDefault) {
          conferidos++;
          ok(nomes.has('default'),
            `${f.rel} importa o default de "${imp.caminho}", que não tem default`);
        }
      }
    }

    ok(conferidos > 200,
      `só ${conferidos} ligações conferidas. O projeto tem centenas — um número ` +
      'baixo significa que a extração de imports parou de casar com o código, e ' +
      'uma peneira que não pega nada passa verde sobre qualquer coisa.');
  });

  s.teste('a peneira PEGA um import quebrado — conferido em cima de um caso montado', () => {
    /* Sem isto, a afirmação de cima é indistinguível de uma que não faz nada.
       É a mesma razão de o Q2 existir, aplicada dentro de uma suíte só. */
    const origem = 'export const a = 1;\nexport function b(){}\nexport default 3;';
    const { nomes, opaco } = exportados(origem);
    ok(!opaco && nomes.has('a') && nomes.has('b') && nomes.has('default'),
      `a leitura de exports errou num caso trivial: ${[...nomes].join(', ')}`);
    ok(!nomes.has('c'), 'a leitura inventou um export que não existe');

    const imp = importados("import { a, b as z } from './x.mjs';\nimport d, { e } from './y.mjs';");
    ok(imp.length === 2, `a leitura de imports achou ${imp.length} em vez de 2`);
    ok(imp[0].nomes.join(',') === 'a,b',
      `os nomes importados saíram "${imp[0].nomes.join(',')}" — o "as" tem de ser ` +
      'lido pelo nome de ORIGEM, que é o que o outro arquivo precisa exportar');
    ok(imp[1].temDefault, 'o import default não foi reconhecido');
  });

  s.teste('nenhum arquivo importa de um caminho que não existe', () => {
    for (const f of fontes()) {
      const txt = readFileSync(f.abs, 'utf8');
      for (const imp of importados(txt))
        ok(existsSync(resolve(dirname(f.abs), imp.caminho)),
          `${f.rel} → "${imp.caminho}" não existe. Caminho quebrado derruba a ` +
          'aba inteira, e no navegador ele aparece como um 404 no console que ' +
          'ninguém lê.');
    }
  });

  return s;
}
