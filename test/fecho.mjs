/* O FECHO DE UMA SUÍTE — de que arquivos o veredito dela depende.
 *
 * ── O PROBLEMA QUE ISTO EXISTE PARA RESOLVER ───────────────────────────────
 *
 * O portão Q2 reavaliava os 208 defeitos a cada bloco: ~100 min, e crescendo em
 * dois eixos ao mesmo tempo (defeito novo e suíte mais gorda). Acelerar a
 * execução muda a constante e não muda a curva — em três blocos volta a doer.
 *
 * O que muda a curva é não reavaliar o que **não pôde mudar de resposta**.
 *
 * ── A REGRA, E ELA É DEMONSTRÁVEL ──────────────────────────────────────────
 *
 * O veredito de um defeito plantado é função de três coisas, e de mais nada:
 *
 *   1. a definição do defeito — `arquivo`, `de`, `para`;
 *   2. o conteúdo do arquivo onde ele é plantado;
 *   3. o comportamento da suíte que o pegou — que por sua vez é função dos
 *      arquivos que ela lê e executa.
 *
 * Se as três estiverem byte a byte iguais às da última avaliação, o resultado
 * de reavaliar é o mesmo resultado, e rodá-lo de novo é gastar minutos para
 * reimprimir uma resposta já conhecida.
 *
 * **Isto não é amostragem.** Amostragem escolhe não perguntar. Aqui todos os
 * 208 continuam respondidos: cada um foi reavaliado agora, ou nada de que ele
 * depende mudou desde a avaliação anterior. É a diferença entre o `--tocados`,
 * que PULA defeitos e por isso não fecha bloco, e este, que não pula nenhum.
 *
 * ── POR QUE O FECHO É POR EXCESSO, DE PROPÓSITO ────────────────────────────
 *
 * Errar para mais custa uma reavaliação desnecessária. Errar para menos
 * reaproveita um veredito velho e o portão passa a mentir. Toda dúvida aqui
 * resolve para `TUDO` — o fecho universal, que invalida com qualquer mudança.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

/* ── TENTATIVA MEDIDA E DESCARTADA: cobertura de execução ───────────────────
 *
 * O caminho óbvio para saber o alcance de uma suíte é medir: `NODE_V8_COVERAGE`
 * (embutido no Node) para o que ela EXECUTA, mais um espião em `fs.readFileSync`
 * para o que ela LÊ. Foi construído e medido, e não funciona aqui.
 *
 * O motivo é o `test/run.mjs`: ele importa as 46 suítes ESTATICAMENTE, no topo.
 * Rodar `run.mjs --so=limites` carrega o grafo de módulos das 46, então a
 * cobertura diz que toda suíte executa tudo. Medido: corte de **15%**, e 170 dos
 * 208 defeitos ficavam com as 46 suítes como candidatas.
 *
 * Fazer a medição funcionar exigiria um executor mínimo que importasse só o
 * módulo da suíte — e as suítes de navegador recebem argumentos montados pelo
 * runner, então nem todas cabem nele.
 *
 * A leitura estática deste arquivo chega ao mesmo lugar sem essa dependência, e
 * a diferença é que ela erra para MAIS: fecho grande demais custa reavaliação,
 * nunca cobertura. Fica registrado porque a próxima pessoa a olhar isto vai ter
 * a mesma ideia — e ela é boa, só não com este `run.mjs`.
 */

/* O fecho universal: a suíte pode ver qualquer coisa, então qualquer mudança
   invalida o veredito. É o que as suítes que varrem diretórios recebem. */
export const TUDO = '*';

/* Arquivos de que TODO veredito depende: mudar o arnês muda COMO a pergunta é
 * feita, e nenhum veredito anterior sobrevive a isso.
 *
 * A LISTA É CURTA DE PROPÓSITO, e a primeira versão dela estava errada de um
 * jeito que teria matado o cache inteiro:
 *
 *   · `defeitos-plantados.mjs` estava aqui, e ele muda TODA VEZ que um bloco
 *     acrescenta um defeito. Com ele na lista, todo bloco invalidaria os 208
 *     vereditos e o cache nunca pagaria nada. E ele não precisa estar: a
 *     definição do defeito — `arquivo`, `de`, `para` — já entra na chave por
 *     conta própria, então mexer NAQUELE defeito invalida NAQUELE defeito, que
 *     é exatamente o alcance certo;
 *   · `run.mjs` estava aqui, e ele muda toda vez que um bloco registra uma
 *     suíte nova. Acrescentar suíte não pode invalidar um `PEGOU`: a suíte que
 *     pegou continua existindo e se comportando igual, e suíte a mais só pode
 *     pegar mais. O caso que importa — a suíte captora ser REMOVIDA do runner —
 *     é conferido direto na sabotagem, contra as suítes que a linha de base
 *     nomeou.
 *
 * Sobra o que de fato muda a pergunta: o `harness`, que define como um teste
 * afirma, e a própria `sabotagem`, que define como o mutante é plantado e
 * medido. Os dois mudam raramente. */
export const ARNES = ['test/harness.mjs', 'test/sabotagem.mjs', 'test/fecho.mjs'];

/* Suítes que nascem dentro de outro módulo: `visual-base` não tem arquivo
   próprio. O mapa é explícito porque adivinhar por nome erraria. */
const MODULO_DA_SUITE = {
  'visual-base': 'test/visual.mjs', 'ambientes': 'test/visual.mjs',
  'rodada-viva': 'test/visual.mjs', 'tema-cedo': 'test/visual.mjs',
  'sem-rede': 'test/visual.mjs',
};

/* Suítes de navegador servem o app inteiro a um Chromium: elas veem `app/` e
   `arte/` sem importar nada de lá, e por isso o grafo de imports não basta. */
const NAVEGADORAS = new Set(['visual', 'visual-base', 'ambientes', 'rodada-viva',
                             'tema-cedo', 'sem-rede', 'contraste']);

const RAIZ = process.cwd();
const pastaRel = abs => {
  const r = relative(RAIZ, abs);
  return r && !r.startsWith('..') ? (r.endsWith('/') ? r : r + '/') : '';
};
const cacheImports = new Map();

/* Imports ESTÁTICOS e dinâmicos com caminho literal. O que não for literal cai
   em `TUDO` pela varredura de opacidade abaixo. */
function importsDe(arq) {
  if (cacheImports.has(arq)) return cacheImports.get(arq);
  if (!existsSync(arq)) return [];
  const txt = readFileSync(arq, 'utf8');
  const out = [];
  for (const m of txt.matchAll(
    /(?:^|\n)\s*(?:import[\s\S]{0,400}?from|import|export[\s\S]{0,400}?from)\s*['"](\.[^'"]+)['"]/g))
    out.push(resolve(dirname(arq), m[1]));
  for (const m of txt.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g))
    out.push(resolve(dirname(arq), m[1]));
  /* Leitura de arquivo por caminho LITERAL conta como dependência: é assim que
     `emissao` depende do Estudo Econômico e `resultado` depende do `fases.mjs`
     que ela varre como texto. */
  for (const m of txt.matchAll(/new URL\(\s*['"](\.[^'"]+)['"]/g))
    out.push(resolve(dirname(arq), m[1]));
  for (const m of txt.matchAll(/readFileSync\(\s*['"]([^'"]+)['"]/g))
    out.push(resolve(RAIZ, m[1]));
  cacheImports.set(arq, out);
  return out;
}

/* OPACA DE VERDADE: dispara processo. O filho pode tocar em qualquer coisa, e
   nada estático revela o quê.

   `readdirSync` e `import(variável)` NÃO caem aqui: os dois são resolvíveis, e
   resolvê-los é o que separa "o defeito de `app/` reavalia a cada bloco de
   backend" de "ele só reavalia quando `app/` muda". Tratá-los como opacos
   custava exatamente os minutos que este arquivo existe para economizar. */
const OPACA = /execFileSync|execFile\(|spawn\(/;

/* `readdirSync(new URL('../app/modules/', ...))` vira o PREFIXO `app/modules/`.
   Prefixo e não lista: módulo novo na pasta invalida sem ninguém lembrar de
   acrescentá-lo — derivar não pode dessincronizar. */
function prefixosVarridos(arq, txt) {
  const fora = [];
  for (const m of txt.matchAll(/readdirSync\(\s*(?:new URL\(\s*)?['"]?([^'"),]*)['"]?/g)) {
    const bruto = m[1].trim();
    if (!bruto) continue;
    if (bruto.startsWith('.')) {
      const abs = resolve(dirname(arq), bruto);
      const rel = relative(RAIZ, abs);
      if (rel && !rel.startsWith('..')) fora.push(rel.endsWith('/') ? rel : rel + '/');
    } else {
      /* Nome de variável: procura a constante literal no mesmo arquivo. */
      const decl = txt.match(new RegExp(`const ${bruto}\\s*=\\s*new URL\\(\\s*['"]([^'"]+)['"]`));
      if (!decl) return null;                 /* não resolvi: quem chama decide TUDO */
      const abs = resolve(dirname(arq), decl[1]);
      const rel = relative(RAIZ, abs);
      if (rel && !rel.startsWith('..')) fora.push(rel.endsWith('/') ? rel : rel + '/');
      else if (decl[1] === './') fora.push(relative(RAIZ, dirname(arq)) + '/');
    }
  }
  return fora;
}

/* `import(VAR)` onde VAR é uma constante literal do próprio arquivo. É o caso
   do `visual.mjs`, cujo `PW` aponta para fora do repositório — e portanto não
   acrescenta dependência nenhuma. */
function importsPorVariavel(arq, txt) {
  const fora = [];
  for (const m of txt.matchAll(/import\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
    const decl = txt.match(new RegExp(`const ${m[1]}\\s*=\\s*['"]([^'"]+)['"]`));
    if (!decl) return null;                   /* variável que não resolvi: TUDO */
    if (decl[1].startsWith('.')) fora.push(resolve(dirname(arq), decl[1]));
    else if (decl[1].startsWith('/') && existsSync(RAIZ + decl[1]))
      fora.push(resolve(RAIZ, '.' + decl[1]));
    /* caminho absoluto fora do repositório: não é dependência deste projeto */
  }
  return fora;
}

export function fechoDaSuite(nome) {
  const entrada = MODULO_DA_SUITE[nome] || `test/${nome}.mjs`;
  if (!existsSync(entrada)) return TUDO;      /* suíte que não sei localizar */

  const vistos = new Set(), fila = [resolve(entrada)];
  const prefixos = new Set();
  while (fila.length) {
    const a = fila.pop();
    if (vistos.has(a)) continue;
    vistos.add(a);
    /* `new URL('../app/modules/')` entra na fila como diretório: vira prefixo e
       não arquivo, e ler um diretório estoura. */
    if (!existsSync(a) || statSync(a).isDirectory()) { prefixos.add(pastaRel(a)); continue; }
    const txt = readFileSync(a, 'utf8');
    if (OPACA.test(txt)) return TUDO;
    const pref = prefixosVarridos(a, txt);
    if (pref === null) return TUDO;
    for (const p of pref) prefixos.add(p);
    const din = importsPorVariavel(a, txt);
    if (din === null) return TUDO;
    for (const d of [...importsDe(a), ...din]) if (!vistos.has(d)) fila.push(d);
  }

  const fora = new Set([...ARNES, ...[...prefixos].filter(Boolean)]);
  for (const a of vistos) {
    const rel = relative(RAIZ, a);
    if (rel && !rel.startsWith('..')) fora.add(rel);
  }
  /* O navegador enxerga o app inteiro. Prefixos, e não arquivos: um módulo novo
     em `app/modules/` precisa invalidar sem ninguém lembrar de listá-lo. */
  if (NAVEGADORAS.has(nome)) { fora.add('app/'); fora.add('arte/'); }
  return fora;
}

/* ── A DIGITAL DE UM FECHO ──────────────────────────────────────────────────
 *
 * Resume em uma linha o conteúdo de tudo de que a suíte depende. Duas execuções
 * com a mesma digital rodariam exatamente o mesmo código sobre exatamente os
 * mesmos dados — e por isso dariam o mesmo veredito.
 *
 * `TUDO` resume o repositório inteiro: qualquer mudança em qualquer arquivo
 * muda a digital, e o defeito é reavaliado. É o lado seguro de errar. */
export function digitalDoFecho(fecho, hashes) {
  const casa = caminho => fecho === TUDO || fecho.has(caminho)
    || [...fecho].some(e => e.endsWith('/') && caminho.startsWith(e));
  const partes = [];
  for (const caminho of [...hashes.keys()].sort())
    if (casa(caminho)) partes.push(`${caminho}:${hashes.get(caminho)}`);
  return partes.join('\n');
}
