/* Q2 · SABOTAGEM — o portão que faz os outros valerem.
 *
 * Uma suíte que nunca ficou vermelha não prova nada. Aqui plantamos defeitos
 * de propósito e exigimos que a suíte fique vermelha para cada um. Defeito
 * que passa = teste decorativo = bloco não fecha.
 *
 * Regras (BUILD_BLOCKS §4):
 *   1. o defeito precisa ser plausível — trocar um sinal, inverter uma
 *      comparação, remover uma checagem. Apagar função inteira não prova nada.
 *   2. precisa falhar no teste CERTO — registramos qual pegou qual.
 *
 * Refinamento do F0.2 (lacuna L-007): cada defeito roda DUAS vezes, com e sem
 * os golden tests. Golden byte-exato pega qualquer mudança de comportamento,
 * então ele sozinho não prova cobertura. O que interessa é a coluna "sem
 * golden": defeito que só o golden pega revela área com propriedade fraca.
 *
 * A execução acontece numa CÓPIA do repositório, fora da árvore de trabalho.
 * As duas primeiras versões plantavam o defeito no lugar e restauravam depois,
 * e isso deu errado duas vezes no F0.3d: um timeout matou o processo no meio e
 * deixou defeito plantado, e o gancho de commit pediu para commitar enquanto a
 * execução estava no meio — o que teria gravado o defeito no repositório.
 *
 * O handler de restauração que eu havia escrito não resolve, e vale registrar
 * por quê: enquanto a execução está parada dentro do `execFileSync` que roda a
 * suíte, o laço de eventos do Node não gira e o handler não dispara.
 *
 * Copiar é a resposta certa. A árvore de trabalho fica intocada do começo ao
 * fim, e matar este processo a qualquer momento não deixa rastro.
 *
 * Uso: node test/sabotagem.mjs
 */
import { existsSync, readFileSync, renameSync, symlinkSync, writeFileSync, cpSync, rmSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fechoDeCaptor, digitalDoFecho, TUDO, CAPTOR_NAO_CARREGA } from './fecho.mjs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFEITOS } from './defeitos-plantados.mjs';

/* Ver a explicação longa no `execFile` abaixo. */
import { conferirAncoras, filtrarTocados } from './ancoras.mjs';
import { limparCaixas, limparOrfas } from './caixas.mjs';

/* --- COMO A SABOTAGEM RODA, E POR QUE ASSIM -----------------------------
 *
 * Ela roda sem o portão de navegador: ele custa ~40 s por execução e são duas
 * execuções por defeito. Defeito que escapa das duas é reexecutado COM o
 * navegador, porque aí a pergunta muda — não é mais "a suíte pega?", é "alguém
 * pega?".
 *
 * TRÊS COISAS QUE TIRARAM ESTE PORTÃO DE ~95 min:
 *
 * 1. PARADA ANTECIPADA (`PARAR_CEDO=1`). Aqui a pergunta é binária: a suíte
 *    fica vermelha ou não. Rodar as dez suítes seguintes depois da primeira
 *    falha é trabalho jogado fora, 56 vezes. As suítes também passaram a rodar
 *    em ordem de CUSTO, da mais barata para a mais cara — um defeito que a
 *    carteira pega custa 0,3 s em vez de 40 s.
 *
 * 2. SEGUNDA EXECUÇÃO POR DEDUÇÃO. A coluna "sem golden" existe para revelar
 *    defeito que só o golden byte-exato pega. Mas se a suíte ficou vermelha por
 *    uma suíte QUE NÃO É o golden, então rodar de novo sem o golden dá vermelho
 *    de novo — é dedução, não estimativa. A segunda execução só acontece quando
 *    quem pegou foi o golden.
 *
 * 3. EM PARALELO, uma caixa de areia por trabalhador. Nada disso enfraquece o
 *    portão: as mesmas suítes rodam, com os mesmos dados, na mesma máquina.
 */
/* Como um mutante é medido mora em `execucao.mjs` (D-101): é o que PODE mudar
   um veredito, e é o único pedaço do portão que fica no ARNES. O resto deste
   arquivo — caixas, paralelismo, cache, relatório — não muda veredito, e mexer
   nele deixou de custar 991 reavaliações. */
import { rodar, SUITES_NAVEGADOR, TETO_MUTANTE_MS } from './execucao.mjs';

const suitesQuePegaram = saida => {
  const nomes = [...new Set(saida.split('\n').filter(l => /^\s{2}\[/.test(l))
    .map(l => l.match(/^\s{2}\[([\w-]+)\]/)?.[1]).filter(Boolean))];
  /* Defeito que impede o módulo de carregar derruba a execução inteira em vez
     de reprovar um teste. Continua sendo vermelho, mas é outra coisa e o
     relatório não deve fingir que foi uma suíte que pegou. */
  return nomes.length ? nomes : ['(não carrega)'];
};

/* --- PRÉ-VOO: o que se lê em 0,1 s não se descobre em 12 min --------------
 *
 * Antes de montar caixa nenhuma, conferir que cada defeito ainda tem onde ser
 * plantado. O V1.14 pagou 19 dos seus 53 minutos de portão por não ter isto:
 * uma execução morreu com TypeError no defeito 70, e outra rodou inteira para
 * revelar que o S15 tinha perdido a âncora.
 *
 * ABORTA, e não avisa e segue. Defeito sem âncora conta como "não pego" no
 * relatório, e um portão que segue com defeito decorativo é um portão que
 * mente sobre a própria cobertura. */
const problemas = conferirAncoras(DEFEITOS, f => readFileSync(f, 'utf8'));
if (problemas.length) {
  console.error(`\nABORTADO no pré-voo: ${problemas.length} defeito(s) plantado(s) sem valor.\n`);
  for (const p of problemas)
    console.error(`  · ${p.id} [${p.tipo}] ${p.arquivo}\n      ${p.detalhe}`);
  console.error('\nCorrija a lista em test/defeitos-plantados.mjs antes de rodar o portão.');
  console.error('Âncora perdida costuma significar que um bloco moveu o trecho — realve o');
  console.error('defeito para onde o comportamento mora hoje, não apague o defeito.\n');
  process.exit(2);
}

/* --- MODO INCREMENTAL: `--tocados` ---------------------------------------
 *
 * Roda só os defeitos ancorados em arquivo que o `git diff` mostra alterado.
 * No V1.14 seriam 15 de 78 — 2,3 min em vez de 12.
 *
 * SERVE À CONSTRUÇÃO, NUNCA AO FECHAMENTO. Um bloco que mexe no `render.mjs`
 * pode quebrar um defeito ancorado na `coreografia.mjs`, e só a execução
 * completa vê isso. Por isso o modo grita no começo e no fim, e por isso o
 * `npm run portoes` não o usa. */
const INCREMENTAL = process.argv.includes('--tocados');
const tocados = INCREMENTAL ? arquivosTocados() : [];
const ALVOS = INCREMENTAL ? filtrarTocados(DEFEITOS, tocados) : DEFEITOS;

function arquivosTocados() {
  try {
    const saida = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    /* `--porcelain` cobre modificado, novo e não rastreado de uma vez; o
       `git diff` sozinho perderia arquivo recém-criado, que é justamente o
       caso mais comum durante a construção de um bloco. */
    return saida.split('\n').map(l => l.slice(3).trim()).filter(Boolean);
  } catch { return []; }
}

if (INCREMENTAL) {
  console.log(`\n⚠  MODO INCREMENTAL — ${ALVOS.length} de ${DEFEITOS.length} defeitos.`);
  console.log('   Isto NÃO é o portão Q2. Rode `npm run sabotagem` inteiro antes de fechar o bloco.');
  console.log(`   ${tocados.length} arquivo(s) alterado(s) segundo o git.\n`);
}

/* Os arquivos a guardar saem da PRÓPRIA lista de defeitos.
   Escrita à mão, esta lista era uma segunda fonte de verdade — e o V1.14
   provou o custo: dois arquivos novos entraram em `DEFEITOS`, ninguém os
   acrescentou aqui, e a execução morreu com um TypeError no defeito 70 depois
   de vinte minutos de trabalho jogados fora. Derivar não pode dessincronizar. */
const ARQUIVOS = [...new Set(ALVOS.map(d => d.arquivo))];
const originais = new Map();
for (const f of ARQUIVOS) originais.set(f, readFileSync(f, 'utf8'));

/* Uma caixa por trabalhador. A árvore de trabalho fica intocada do começo ao
   fim, e matar este processo a qualquer momento não deixa rastro. */
/* AS PASTAS DA CAIXA SAEM DO GIT, e não de uma lista escrita à mão.
 *
 * A lista à mão custou DUAS execuções de portão. No V1.14 foi a lista de
 * ARQUIVOS, que não conhecia dois módulos novos e morreu com um TypeError no
 * defeito 70 — vinte minutos jogados fora. No F1.1 foi esta: `server/` nasceu,
 * ninguém o acrescentou aqui, e o portão abortou com "a suíte já está vermelha"
 * depois de montar as caixas.
 *
 * O git sabe exatamente o que o projeto versiona, que é exatamente o que a suíte
 * precisa. `assets/` fica de fora sozinho, porque não é versionado — e são
 * 18 MB que não têm o que fazer numa caixa de areia.
 *
 * É a mesma correção que o ARQUIVOS recebeu, pelo mesmo motivo, escrito no
 * comentário logo acima: **derivar não pode dessincronizar.** */
/* `--cached --others --exclude-standard` e não `ls-files` puro: o puro só vê o
   que já foi COMMITADO, e a pasta nova de um bloco em construção ainda não foi.
   Foi assim que `server/` ficou de fora na primeira tentativa desta correção —
   uma falha silenciosa exatamente no caso que a correção existia para cobrir.
   `--exclude-standard` respeita o .gitignore, então `assets/` continua fora. */
const DIRS_VERSIONADOS = [...new Set(
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],
    { encoding: 'utf8' })
    .split('\n').filter(l => l.includes('/'))
    .map(l => l.split('/')[0]))]
  .filter(d => existsSync(d))
  /* `assets/` FICA DE FORA DA CÓPIA, mesmo agora que é versionado.
   *
   * Ele passou a entrar no repositório quando o build virou privado, e o `git
   * ls-files` — que é a fonte desta lista, de propósito, para não
   * dessincronizar — passou a devolvê-lo. Duas consequências, e o portão parou
   * de subir por causa da segunda:
   *
   *   1. 18 MB copiados CINCO vezes por execução, puro desperdício;
   *   2. o `symlinkSync` logo abaixo colidia com a pasta já copiada, e o
   *      processo morria com EEXIST antes de plantar o primeiro defeito.
   *
   * A razão do link simbólico não mudou com o versionamento: nenhum defeito
   * plantado mexe em arte, então a caixa pode olhar para a mesma pasta. É o
   * D-024. */
  /*  SAI DA CÓPIA PELO MESMO MOTIVO, e por um terceiro (D-040).
   *
   * Os dois primeiros são os do : nenhum defeito plantado mexe em arte,
   * e copiá-la cinco vezes é desperdício — aqui, 3 MB por caixa.
   *
   * O TERCEIRO foi medido no R27, e é o que motivou a mudança. Com cópias
   * SEPARADAS, as cinco caixas decodificam o Rayquaza de 2816x1105 do zero, ao
   * mesmo tempo, sem cache de página compartilhado — e a  saía
   * fora da linha de base na faixa do fundo. Medido: caixa sozinha VERDE,
   * quatro  em paralelo do MESMO repositório VERDES, e só a
   * combinação caixa+paralelo falhava. Era o custo de descompactar o mesmo PNG
   * grande cinco vezes em paralelo.
   *
   * Com o link simbólico as cinco olham para o mesmo arquivo, o sistema o
   * decodifica uma vez, e a foto para de depender de quem chegou primeiro. */
  .filter(d => d !== 'assets' && d !== 'arte');

/* Os arquivos versionados que moram na RAIZ — as linhas do `git` sem barra. */
const ARQUIVOS_RAIZ = execFileSync('git',
  ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(l => l && !l.includes('/') && existsSync(l));

/* ── QUANTAS CAIXAS EM PARALELO (D-100) ────────────────────────────────────
 *
 * Era `min(cpus, 4)` — uma caixa por núcleo. A conta parece certa e não é: cada
 * caixa sobe um NAVEGADOR, e um navegador são ~10 processos. Não é uma por
 * núcleo; são dez por núcleo.
 *
 * MEDIDO em 14/09, mesma carga (`--so=visual`), máquina de 4 núcleos:
 *
 *     concorrência 1     55 s    1/1 verdes    vazão 1,09/min
 *     concorrência 2     76 s    2/2 verdes    vazão 1,57/min
 *     concorrência 4    147 s    0/4 verdes    vazão 1,63/min
 *
 * De 2 para 4 a vazão sobe QUATRO POR CENTO e a corretude vai a ZERO.
 *
 * E O PREJUÍZO NÃO É LENTIDÃO, É MENTIRA. No portão, mutante cuja suíte reprova
 * conta como PEGOU. Suíte que reprova por falta de CPU vira captura que não
 * aconteceu — `PEGOU` FALSO, que o CLAUDE.md classifica como pior que `PASSOU`
 * falso: "manda seguir em frente E esconde os defeitos que de fato escapam".
 *
 * É o D-015 por outra porta. Lá a configuração de julgamento estava quebrada;
 * aqui ela está sã e a MÁQUINA é que não dá conta — e o `garantirBase` não pega,
 * porque ele valida SOZINHO, antes dos mutantes, quando ainda há CPU sobrando.
 *
 * Meio núcleo por caixa é o que a medição sustenta, e o teto de 4 fica: acima
 * disso a memória volta a ser o limite (D-023). `Q2_TRAB` permite medir de novo
 * noutra máquina sem editar o arquivo — o número acima tem data, e número
 * documentado envelhece (D-059). */
const N_TRAB = Math.max(1, Math.min(
  Number(process.env.Q2_TRAB) || Math.floor(cpus().length / 2), 4));
const CAIXAS = [];

/* ── AS CAIXAS SOMEM MESMO QUANDO O PORTÃO ABORTA (D-036) ──────────────────
 *
 * A remoção vivia numa linha no fim do caminho feliz. Quando o portão aborta —
 * e ele aborta — a execução saía antes, e as caixas ficavam. Pior: `CAIXA_BASE`
 * sai de `CAIXAS` por um `pop()`, então ela nunca era removida NEM no caminho
 * feliz. Toda execução vazava pelo menos uma.
 *
 * Medido em 29/08, antes desta correção: **120 caixas órfãs, 3,25 GB**. A ficha
 * do D-036 tinha registrado 75 e 4,9 GB em 24/08.
 *
 * O custo não é o disco. O portão que está rodando disputa I/O com os restos
 * dos que não terminaram: a execução do R23 levou 31 min contra os 10 a 15
 * normais, com 75 cópias do repositório no mesmo diretório. E aí os defeitos se
 * alimentam — mais lento dá mais janela para a instabilidade que fez abortar.
 *
 * ── POR QUE NÃO É "LIMPAR TUDO SEMPRE" ────────────────────────────────────
 *
 * O caminho de aborto PRESERVA a caixa de propósito: ele imprime
 * `reproduza com: cd <caixa> && …`, e essa linha é o diagnóstico inteiro. Uma
 * limpeza cega jogaria fora exatamente o que se quer olhar quando deu errado.
 *
 * Então: `preservar()` marca a caixa que o aborto quer manter, e o resto vai
 * embora — inclusive quando alguém interrompe com ctrl+c. */
const PRESERVADAS = new Set();
const preservar = c => PRESERVADAS.add(c);

/* `CAIXA_BASE` é `const` e nasce depois deste ponto; a referência indireta
   existe para o limpador poder alcançá-la sem mover a declaração dela — e ela
   é justamente a que vazava no caminho feliz, por sair de `CAIXAS` num `pop()`. */
const CAIXA_BASE_REF = { atual: null };
const limpar = () => limparCaixas([...CAIXAS, CAIXA_BASE_REF.atual], PRESERVADAS);

process.on('exit', limpar);
for (const sinal of ['SIGINT', 'SIGTERM'])
  process.on(sinal, () => { limpar(); process.exit(130); });

/* ── AS ÓRFÃS DAS EXECUÇÕES ANTERIORES ─────────────────────────────────────
 *
 * Consertar o vazamento não recupera as que já existem, e são elas que estão
 * ocupando o disco hoje. Mas apagar TODAS na entrada tem um custo: a última
 * caixa preservada por um aborto pode ser justamente a que alguém está
 * investigando agora.
 *
 * SEIS HORAS é o corte. Longo o bastante para uma investigação caber, curto o
 * bastante para o disco não acumular semanas. Quem quiser guardar por mais
 * tempo copia a caixa para fora do temporário — que é o que se faz com
 * qualquer coisa que se queira guardar num diretório chamado `Temp`. */
const ORFAS = limparOrfas(tmpdir());
if (ORFAS.length)
  console.log(`${ORFAS.length} caixa(s) órfã(s) de execuções anteriores removida(s).`);
/* UMA CAIXA A MAIS, E ELA NUNCA RECEBE MUTANTE. É onde as linhas de base por
   configuração rodam — ver `garantirBase`. Validar numa caixa com defeito
   plantado mediria o defeito, não a configuração. */
for (let i = 0; i < N_TRAB + 1; i++) {
  const c = mkdtempSync(join(tmpdir(), 'pokearena-sabotagem-'));
  for (const dir of DIRS_VERSIONADOS)
    cpSync(dir, join(c, dir), { recursive: true });
  /* OS ARQUIVOS DE RAIZ VÊM DO GIT, e não de uma lista à mão.
   *
   * Eram dois, escolhidos a dedo: `package.json` e `.gitignore`. O terceiro que
   * um teste precisasse ler derrubaria o portão — e derrubou: o teste que cobra
   * que o `CLAUDE.md` não contradiga a árvore morreu com ENOENT dentro da
   * caixa, porque o `CLAUDE.md` mora na raiz e a raiz não era copiada.
   *
   * É a mesma correção que a lista de PASTAS já tinha recebido, pelo mesmo
   * motivo, e agora pelo mesmo caminho: o `git` sabe o que o projeto versiona.
   * Derivar não pode dessincronizar. */
  for (const arq of ARQUIVOS_RAIZ) cpSync(arq, join(c, arq));
  for (const compartilhada of ['assets', 'arte'])
    if (existsSync(compartilhada))
      symlinkSync(join(process.cwd(), compartilhada), join(c, compartilhada), 'dir');

  /* A LINHA DE BASE VISUAL DESTA MÁQUINA, e ela NÃO é versionada — de propósito:
     a impressão digital depende da versão do Chromium, então cada máquina grava
     a sua e a REFERÊNCIA compartilhada fica para comparação entre máquinas.
     Só que a caixa de areia copia apenas o que o `git` versiona. Sem esta
     linha ela caía na referência, gravada noutro dia e noutra build — e o
     portão Q2 abortava na pré-checagem acusando "a configuração está quebrada"
     quando o que estava velho era a foto de comparação.
     A caixa roda NESTA máquina, então a linha de base desta máquina é a
     verdade dela. Ver `D-039`. */
  const baseLocal = join('test', 'fixtures', 'visual-base-local.json');
  if (existsSync(baseLocal)) cpSync(baseLocal, join(c, baseLocal));
  CAIXAS.push(c);
}
const CAIXA_BASE = CAIXAS.pop();
CAIXA_BASE_REF.atual = CAIXA_BASE;
console.log(`${N_TRAB} caixa(s) de areia em ${tmpdir()}\n`);

/* Os nomes de suíte saem da PRÓPRIA linha de base, e não de um regex sobre os
   imports do `run.mjs`. Nome de suíte não é nome de arquivo: `visual-base`,
   `tema-cedo` e `ambientes` nascem dentro de outros módulos, e derivá-los do
   nome do arquivo perderia justamente as caras. Derivar não pode
   dessincronizar — é a mesma regra do ARQUIVOS e do DIRS_VERSIONADOS. */
const SUITES_REAIS = new Set();

/* Preenchido logo abaixo com a configuração da linha de base inicial; ver
   `garantirBase`. */
const basesValidadas = new Map();

console.log('Q2 · SABOTAGEM\n');
const base = await rodar(CAIXAS[0], false, false);
if (base.vermelha) {
  /* O ABORT PRECISA DIZER O QUE QUEBROU.
   *
   * Ele dizia só "a suíte já está vermelha", e quem lesse isso tinha que
   * reproduzir a caixa de areia à mão para descobrir o resto — foi o que
   * aconteceu logo depois do F1.14, e é a mesma lacuna que custou três
   * tentativas no D-016: o portão sabia a mensagem e não a imprimia.
   *
   * `PARAR_CEDO` está ligado nesta passada, então a saída termina exatamente
   * na primeira falha. O rabo dela é o diagnóstico inteiro. */
  console.error('\nABORTADO: a suíte já está vermelha DENTRO DA CAIXA DE AREIA.');
  console.error('A árvore de trabalho pode estar verde e esta não — a caixa só');
  console.error('recebe o que o `git ls-files` lista. Falhas:\n');
  const linhas = base.saida.split('\n');
  const falhas = linhas.filter(l => /^\s{2}\[[\w-]+\]|^VERMELHO|^\s{6}\S/.test(l));
  console.error((falhas.length ? falhas : linhas.slice(-25)).join('\n'));
  /* ESTA CAIXA FICA, E É A ÚNICA QUE FICA (D-036). A linha abaixo diz "cd
     <caixa>", e sem ela o diagnóstico seria uma instrução para um diretório que
     o limpador acabou de apagar. As outras somem no `exit`. */
  preservar(CAIXAS[0]);
  console.error(`\ncaixa: ${CAIXAS[0]}`);
  console.error('reproduza com: cd <caixa> && EM_SANDBOX=1 PARAR_CEDO=1 SEM_VISUAL=1 node test/run.mjs\n');
  console.error('as outras caixas desta execução foram removidas; esta fica para você olhar.\n');
  process.exit(2);
}
for (const m of base.saida.matchAll(/^\s{2}([\w-]+): \d+\/\d+$/gm)) SUITES_REAIS.add(m[1]);
console.log(`linha de base: VERDE (${SUITES_REAIS.size} suítes nomeadas)\n`);
/* Esta é a configuração `com-golden/sem-navegador`, e ela acabou de ser
   validada — entra no mapa para não rodar duas vezes. */
basesValidadas.set('com-golden/sem-navegador', Promise.resolve(true));

/* ── O ÍNDICE DE CAPTURA — o que torna este portão viável em escala ─────────
 *
 * O PROBLEMA MEDIDO. Cada defeito rodava a suíte INTEIRA até alguma coisa ficar
 * vermelha, e depois, se nada ficasse, subia o Chromium. Com 208 defeitos e 37
 * suítes isso deu **~70 min**. E cresce em DOIS eixos ao mesmo tempo: bloco novo
 * traz defeitos novos E engrossa a suíte que cada defeito roda. É quadrático, e
 * em mais três blocos passa de duas horas.
 *
 * O QUE SE JOGAVA FORA. O relatório sempre disse qual suíte pegou cada defeito
 * — a coluna "pego por" — e o processo terminava sem guardar isso. Na execução
 * seguinte o portão redescobria, defeito por defeito, o que já sabia.
 *
 * A DEDUÇÃO, E ELA É EXATA:
 *
 *     uma suíte vermelha ⟹ `npm test` vermelho
 *
 * Não é aproximação nem amostragem. Se a suíte que pegou o defeito da última vez
 * pega de novo, o veredito "PEGOU" é o MESMO veredito que a execução inteira
 * daria — obtido em ~0,5 s em vez de 55 s. É por isso que este atalho não
 * enfraquece o portão, enquanto o `--so` na mão enfraquecia: aquele PULAVA
 * defeitos; este roda todos.
 *
 * A DIREÇÃO CONTRÁRIA NÃO VALE, e o código trata isso como lei: suíte recortada
 * VERDE não prova nada. Nesse caso o defeito cai no caminho completo de sempre.
 * Ou seja:
 *
 *     **o índice só pode acelerar; ele não tem como deixar o portão mais
 *     permissivo.** O caminho rápido só sabe dizer PEGOU. Quem diz PASSOU —
 *     e portanto quem reprova o portão — é sempre a execução completa.
 *
 * É a lição do S109 aplicada de propósito: execução vazia com a palavra VERDE é
 * a falha mais silenciosa que este arnês pode ter, então o atalho não tem como
 * produzir um verde.
 *
 * TRÊS GUARDAS, e cada uma existe por um modo de falha concreto:
 *   · nome de suíte que não existe mais no índice → entrada ignorada, caminho
 *     completo. Índice velho custa tempo, nunca cobertura;
 *   · entrada `golden` → sempre caminho completo, porque a coluna "sem golden"
 *     é uma pergunta sobre qualidade de teste e o atalho não a responderia;
 *   · o relatório DIZ quantos vieram do índice e quais mudaram de captor.
 *     Captor que muda é sinal de que a cobertura se moveu, e isso merece ser
 *     visto em vez de silenciosamente reaproveitado.
 */
const CAMINHO_INDICE = 'test/fixtures/captura.json';

/* ── O CACHE DE VEREDITOS — o que tira a curva do portão ────────────────────
 *
 * Reavaliar 208 defeitos custava ~100 min, e o número cresce com o projeto em
 * dois eixos: bloco novo traz defeitos novos E engrossa a suíte que cada um
 * roda. Acelerar a execução muda a constante e deixa a curva de pé.
 *
 * O que derruba a curva é a observação de que **o veredito de um defeito é
 * função de três coisas e de mais nada**: a definição do defeito, o conteúdo do
 * arquivo onde ele é plantado, e o comportamento da suíte que o pegou. Se as
 * três estão byte a byte iguais às da última avaliação, reavaliar devolve a
 * mesma resposta — gastando minutos para reimprimi-la.
 *
 * **ISTO NÃO É AMOSTRAGEM, e a diferença é o que faz este modo fechar bloco.**
 * O `--tocados` PULA defeitos: ele responde sobre uma fatia e cala sobre o
 * resto, e por isso grita que não é o portão. Aqui os 208 continuam
 * respondidos: cada um foi reavaliado agora, ou nada de que ele depende mudou
 * desde a avaliação anterior. A frase que o relatório precisa poder dizer é
 * essa, e ela é verificável linha a linha.
 *
 * O custo passa a ser proporcional ao TAMANHO DA MUDANÇA, e não ao tamanho do
 * projeto — que é a única forma de isto continuar viável em cinquenta blocos.
 *
 * `--completo` ignora o cache. É o que roda antes de uma tag, e é o que
 * reconstrói a confiança na cadeia inteira de tempos em tempos. */
const CAMINHO_VEREDITOS = 'test/fixtures/q2-veredito.json';
const IGNORAR_CACHE = process.argv.includes('--completo');

const VEREDITOS = (() => {
  if (IGNORAR_CACHE || !existsSync(CAMINHO_VEREDITOS)) return {};
  try { return JSON.parse(readFileSync(CAMINHO_VEREDITOS, 'utf8')); } catch { return {}; }
})();

/* A digital de cada arquivo versionado, numa passada só. Calcular por defeito
   releria os mesmos arquivos 208 vezes.

   O MAPA É COMPLETO, e quem exclui é o `digitalDoFecho` (T13). Antes a exclusão
   era feita AQUI, tirando do mapa as duas saídas do portão — e o mapa serve a
   DOIS leitores com necessidades diferentes:

     digitalDoFecho(...)      pergunta "o que o fecho desta suíte contém?" e
                              precisa da exclusão
     HASHES.get(d.arquivo)    pergunta "qual o conteúdo do arquivo MUTADO?" e
                              precisa do arquivo, seja ele qual for

   Excluir no mapa atendia o primeiro e sabotava o segundo em silêncio: um
   defeito plantado num arquivo excluído perderia o componente "conteúdo do
   arquivo mutado" da chave. Hoje não há nenhum, e a premissa tem teste no
   `portao.mjs` — mas depender de uma premissa quando dá para não depender é
   escolher o lado errado de graça.

   A lista e o porquê de cada entrada moram em `FORA_DA_DIGITAL`, no fecho.mjs. */
const HASHES = new Map();
for (const f of execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],
                             { encoding: 'utf8' }).split('\n').filter(Boolean)) {
  try { HASHES.set(f, createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 12)); }
  catch { /* arquivo listado e ausente: some do mapa, e isso já muda a chave */ }
}

const digitalDeFecho = new Map();
function chaveDe(d, captor) {
  if (!captor) return null;               /* sem captor conhecido não há o que reusar */
  /* A chave do fecho inclui o ARQUIVO quando o captor é `(não carrega)`: aquele
     fecho é derivado do arquivo mutado, então dois defeitos em arquivos
     diferentes não podem compartilhar a digital. */
  const chaveFecho = captor === CAPTOR_NAO_CARREGA ? `${captor}|${d.arquivo}` : captor;
  if (!digitalDeFecho.has(chaveFecho))
    digitalDeFecho.set(chaveFecho, digitalDoFecho(fechoDeCaptor(captor, d.arquivo), HASHES));
  return createHash('sha1').update([
    d.id, d.arquivo, d.de, d.para,
    HASHES.get(d.arquivo) ?? 'ausente',
    captor,
    digitalDeFecho.get(chaveFecho),
    process.version,
  ].join('\u0000')).digest('hex');
}


const INDICE = (() => {
  if (!existsSync(CAMINHO_INDICE)) return {};
  try { return JSON.parse(readFileSync(CAMINHO_INDICE, 'utf8')); }
  catch { return {}; }   /* índice ilegível é índice ausente, nunca um erro fatal */
})();

const NAVEGADOR = new Set(SUITES_NAVEGADOR.split(','));

/* ── AFINIDADE: por onde COMEÇAR quando não há índice ──────────────────────
 *
 * O índice só existe depois da primeira execução completa, e é justamente ela
 * que precisava custar 100 min. A afinidade resolve o arranque: a maioria das
 * suítes deste projeto tem o nome do módulo que testa — `limites.mjs` é pega
 * por `limites`, `server/auth.mjs` por `auth`, `engine/preco.mjs` por `preco`.
 *
 * ISTO É UM PALPITE, E PODE ESTAR ERRADO SEM CUSTO NENHUM. Ele muda só a ORDEM
 * em que as suítes são tentadas; quem decide o veredito continua sendo a
 * execução completa quando nada da primeira onda fica vermelho. Palpite errado
 * custa 0,5 s; palpite certo economiza 96 s. */
function afinidade(arquivo) {
  const base = arquivo.split('/').pop().replace(/\.mjs$/, '');
  const nomes = [base, `${base}-servidor`, base.replace(/-dados$/, '')];
  /* Arquivo do app não é importado por suíte nenhuma: ele é servido a um
     navegador. Quem pode vê-lo são as suítes de navegador — e as que leem
     código-fonte como texto, que a onda 2 cobre. */
  if (/^(app|arte)\//.test(arquivo) || arquivo.endsWith('.html'))
    nomes.push(...SUITES_NAVEGADOR.split(','));
  return [...new Set(nomes)].filter(n => SUITES_REAIS.has(n) || NAVEGADOR.has(n));
}

/* A entrada só é usável se nomear UMA suíte que existe e não for o golden. */
function entradaUsavel(id) {
  const nome = INDICE[id];
  if (typeof nome !== 'string' || nome === 'golden') return null;
  if (!SUITES_REAIS.has(nome) && !NAVEGADOR.has(nome)) return null;
  return comIrmas(nome);
}

/* ── SUÍTE QUE SE PARTIU EM DUAS, E O ÍNDICE AINDA NÃO SABE (T10) ──────────
 *
 * Quando um bloco parte uma suíte, o índice guardado continua nomeando a
 * antiga. O atalho roda a antiga, ela volta VERDE — o teste que pegava aquele
 * mutante mudou de casa —, e o defeito cai no CAMINHO COMPLETO, que é o caro.
 * O índice só reaprende quando o caminho completo termina, e é ele que estava
 * sendo evitado.
 *
 * MEDIDO em 14/09, logo depois do corte do T10: o portão passou de ~30 s para
 * ~100 s por mutante, e a projeção saltou para 24 h. O índice tinha 981
 * entradas e ZERO delas conhecia a `visual-luta`.
 *
 * A correção é declarar o parentesco: uma entrada que nomeia a mãe passa a
 * pedir as duas. É seguro pela mesma dedução que rege o atalho inteiro —
 * **rodar suíte A MAIS só pode condenar**, nunca absolver, e quem diz PASSOU
 * continua sendo a execução completa. O custo é uma suíte extra nos mutantes
 * afetados; o benefício é não pagar a execução completa por todos eles.
 *
 * A tabela some quando o índice reaprender. Ela fica porque a próxima partição
 * vai acontecer, e sem isto ela custa outra execução de 24 h. */
const IRMAS = { 'visual': 'visual,visual-luta' };
const comIrmas = nome => nome.split(',').flatMap(n => (IRMAS[n] ?? n).split(','))
  .filter((v, i, a) => a.indexOf(v) === i).join(',');

/* ── LINHA DE BASE POR CONFIGURAÇÃO ────────────────────────────────────────
 *
 * O portão validava UMA configuração como verde — sem navegador, quatro
 * larguras — e JULGAVA em quatro: sem navegador, sem golden, navegador
 * estreito, navegador completo. Nas três não validadas ele acreditava em
 * qualquer vermelho.
 *
 * Foi por essa fresta que o **D-015** entrou: a passada estreita deixava a
 * `visual-base` vermelha para todo mutante — a base gravada tem quatro larguras
 * e a captura estreita tem uma —, e o portão leu isso como captura. Uma
 * execução inteira voltou `VERDE — 208/208` com PEGOU falso em todo defeito que
 * chegava ao navegador.
 *
 * A regra que fecha a fresta, e ela vale para qualquer redução futura:
 *
 *     **toda configuração usada para julgar precisa da própria base verde.**
 *
 * Com ela, o D-015 teria abortado em 15 s dizendo qual configuração estava
 * quebrada, em vez de inflar o relatório.
 *
 * É PREGUIÇOSO DE PROPÓSITO. Validar as quatro sempre custaria ~3 min por
 * execução, e a execução quente inteira leva 4 — o cache deixaria de pagar.
 * Cada configuração é validada na primeira vez que for USADA, e uma execução
 * que não chega ao navegador não paga navegador nenhum. */

function garantirBase(semGolden, comVisual, estreita) {
  const chave = `${semGolden ? 'sem-golden' : 'com-golden'}/${
    comVisual ? (estreita ? 'navegador-estreito' : 'navegador-completo') : 'sem-navegador'}`;
  if (!basesValidadas.has(chave)) {
    basesValidadas.set(chave, rodar(CAIXA_BASE, semGolden, comVisual, null, estreita)
      .then(r => {
        if (r.vermelha) {
          console.error(`\nABORTADO: a suíte já está vermelha na configuração ` +
                        `**${chave}**, SEM nenhum defeito plantado.\n`);
          console.error('  O portão usa esta configuração para julgar. Vermelho aqui não é');
          console.error('  captura: é a configuração quebrada, e todo defeito avaliado nela');
          console.error('  voltaria como PEGOU sem ter sido pego. É o D-015.\n');
          /* A MENSAGEM VAI JUNTO DO TÍTULO. A primeira versão filtrava só as
             linhas com `[suite]`, e o relatório do runner põe o PORQUÊ na linha
             seguinte, indentada. Abortar dizendo "tal teste falhou" sem dizer o
             que ele viu obriga quem lê a reproduzir uma condição de carga que
             só o portão cria — foi o que custou duas tentativas aqui. */
          for (const l of r.saida.split('\n').filter(x => /VERMELHO|^\s{2}\[|^\s{6}\S/.test(x)).slice(0, 12))
            console.error(`  ${l.replace(/\s+$/, '')}`);
          process.exit(2);
        }
        return true;
      }));
  }
  return basesValidadas.get(chave);
}

/* NUMA EXECUÇÃO GRANDE, AS CONFIGURAÇÕES SÃO VALIDADAS ANTES DE COMEÇAR.
 *
 * A validação é preguiçosa por economia: numa execução quente, com quase tudo
 * reaproveitado, não faz sentido pagar 65 s de navegador para validar uma
 * configuração que ninguém vai usar.
 *
 * Só que numa execução COMPLETA a configuração de navegador vai ser usada com
 * certeza — e descobrir que ela está quebrada só quando o primeiro mutante
 * chega lá custou **28 minutos** de portão no D-016. Quando o trabalho é
 * grande, validar tudo na frente custa ~100 s e devolve o erro em 100 s.
 *
 * O limiar não precisa ser fino: é a diferença entre "algumas reavaliações" e
 * "o portão inteiro". */
const VALIDAR_TUDO_ACIMA_DE = 50;

/* ── EM SEQUÊNCIA, E NÃO EM PARALELO (D-040) ───────────────────────────────
 *
 * Eram três `garantirBase` dentro de um `Promise.all`, e duas delas dirigem
 * Chromium — NA MESMA CAIXA, ao mesmo tempo.
 *
 * Isso invertia a lógica do `D-015`. A validação existe para dizer "a
 * configuração de julgamento está sã"; medi-la sob uma carga que o julgamento
 * NÃO tem faz a referência ser medida em condições piores que a coisa medida.
 * Cada mutante roda sozinho na caixa dele; a base rodava disputando CPU e disco
 * consigo mesma.
 *
 * O sintoma foi o `arena@largo` região 1,5 fora da linha de base — sempre a
 * mesma tela, sempre a mesma região, valores pequenos (média 2,5 a 3,8). Ele
 * sobreviveu à correção do GIF animado (D-033), à da linha de base velha na
 * caixa (D-039), à espera pela decodificação da arte e ao compartilhamento da
 * pasta `arte/`. Medido, uma a uma:
 *
 *   caixa sozinha, config completa       VERDE, duas vezes seguidas
 *   4x `visual-base` em paralelo         VERDES
 *   local, config idêntica à do portão   VERDE, 62/62
 *   dentro do portão                     VERMELHO, reprodutível
 *
 * O que só o portão tinha era ESTA linha: duas suítes de navegador na mesma
 * caixa, simultâneas.
 *
 * O custo de serializar é ~40 s por execução. É o preço de um juiz confiável, e
 * ele é baixo perto de uma execução inteira perdida num aborto — que foi o que
 * este defeito vinha cobrando. */
async function validarConfiguracoesUsadas() {
  await garantirBase(false, false, false);
  await garantirBase(false, true, true);
  await garantirBase(false, true, false);
  console.log('configurações de julgamento: todas VERDES\n');
}

/* Julga: valida a configuração antes de usá-la, e só então roda com o mutante. */
async function julgar(caixa, semGolden, comVisual, recorte = null, estreita = false) {
  await garantirBase(semGolden, comVisual, estreita);
  return rodar(caixa, semGolden, comVisual, recorte, estreita);
}

async function avaliar(d, caixa) {
  const src = originais.get(d.arquivo);
  if (src === undefined) return { ...d, status:'ARQUIVO AUSENTE', com:'-', sem:'-' };
  if (!src.includes(d.de)) return { ...d, status:'ÂNCORA PERDIDA', com:'-', sem:'-' };
  /* REAPROVEITAMENTO. A chave amarra a definição do defeito, o conteúdo do
     arquivo mutado e a digital do fecho da suíte que o pegou. Iguais às da
     última avaliação ⟹ mesmo código, mesmos dados, mesmo veredito. */
  const cache = VEREDITOS[d.id];
  const captorGuardado = String(cache?.com ?? '').replace(/^navegador: /, '').split(',')[0];
  /* O CAPTOR PRECISA CONTINUAR EXISTINDO. É o que substitui `run.mjs` no fecho
     comum: acrescentar suíte não pode invalidar nada, mas REMOVER a suíte que
     pegou o defeito invalida — o veredito guardado se apoiava nela. */
  if (cache && cache.chave
      && (SUITES_REAIS.has(captorGuardado) || NAVEGADOR.has(captorGuardado)
          || captorGuardado === CAPTOR_NAO_CARREGA)
      && cache.chave === chaveDe(d, captorGuardado))
    return { ...d, ...cache, reusado: true, instavel: false };

  const alvo = join(caixa, d.arquivo);
  writeFileSync(alvo, src.replace(d.de, d.para));
  try {
    /* ── ONDA 1: as suítes que PODEM pegar, e só elas ─────────────────────
     *
     * O que fazia o portão custar 100 min não era a suíte ser lenta: era varrer
     * as 46 na ORDEM FIXA até alguma ficar vermelha. Medido: um mutante pego
     * pela `carteira` custava 0,5 s; um pego pela `margem`, 96 s; a média por
     * mutante deu 115 s.
     *
     * A onda 1 roda só as candidatas — o captor da execução passada, se houver,
     * e as suítes cujo nome deriva do arquivo mutado. Vermelho aqui encerra o
     * mutante, e o veredito é EXATAMENTE o mesmo que a execução inteira daria:
     * uma suíte vermelha implica `npm test` vermelho.
     *
     * Verde aqui não conclui nada e cai na onda 2. É a regra de direção única
     * de todo este arquivo: **o atalho só sabe dizer PEGOU.** */
    const previsto = entradaUsavel(d.id);
    const candidatas = [...new Set([...(previsto ? [previsto] : []), ...afinidade(d.arquivo)])];

    /* AS BARATAS PRIMEIRO, E SOZINHAS. A primeira versão rodava as candidatas
       todas juntas — e para qualquer arquivo de `app/` a afinidade inclui as
       suítes de navegador, então o Chromium subia (34 s) mesmo quando uma suíte
       de 0,5 s pegava o mutante. Pior que o tempo: a coluna "pego por" saía
       nomeando a suíte de navegador, e o índice gravava ELA como captor —
       fixando o custo caro para sempre.

       Foi assim que os defeitos da tela de proteção voltaram atribuídos a
       `visual` quando a `protecao-tela` os pegava em meio segundo. */
    for (const grupo of [candidatas.filter(n => !NAVEGADOR.has(n)),
                         candidatas.filter(n => NAVEGADOR.has(n))]) {
      if (!grupo.length) continue;
      const nav = NAVEGADOR.has(grupo[0]);
      const r = await julgar(caixa, false, nav, grupo.join(','), nav);
      const pegou = r.vermelha ? suitesQuePegaram(r.saida).filter(n => grupo.includes(n)) : [];
      if (pegou.length)
        return { ...d, instavel: false, status: 'PEGOU', viaIndice: true,
                 com: pegou.join(','), sem: pegou.join(',') };
    }

    /* TENTATIVA MEDIDA E DESCARTADA: começar pelo navegador quando o defeito
     * mora em `app/`.
     *
     * A ideia era boa e a conta estava errada. Dos 12 defeitos novos do V1.20,
     * 10 só o navegador pega — e para cada um o portão roda a suíte inteira SEM
     * navegador (55 s, tudo verde, zero informação) antes de rodar COM. Inverter
     * a ordem pareceu economizar esses 55 s.
     *
     * Só que a MAIORIA dos defeitos de `app/` não é dessa classe: eles são
     * pegos por suíte barata, e com `PARAR_CEDO` isso custa segundos. Inverter a
     * ordem fazia todos eles pagarem a partida do Chromium ANTES da suíte que já
     * os pegava. Medido: 49 de 113 em 640 s, projetando ~24 min contra os ~20
     * do caminho normal. **Piorou**, e a medição é que disse.
     *
     * Fica registrado porque a próxima pessoa a olhar este gargalo vai ter a
     * mesma ideia. O que sobrou dela e funciona está na segunda passada abaixo:
     * quando a suíte sai verde sem navegador, a passada COM navegador roda só as
     * suítes que precisam dele, em vez da suíte inteira outra vez. */
    let comG = await julgar(caixa, false, false);
    let pegouPor = comG.vermelha ? suitesQuePegaram(comG.saida) : [];

    /* Dedução: vermelho por suíte que não é o golden => vermelho sem o golden
       também. Só quando o golden é o único que pega é preciso confirmar. */
    let semVermelha = comG.vermelha && pegouPor.some(n => n !== 'golden');
    let semPor = pegouPor.filter(n => n !== 'golden');
    let instavel = false;

    if (comG.vermelha && !semVermelha) {
      const semG = await julgar(caixa, true, false);
      semVermelha = semG.vermelha;
      semPor = semG.vermelha ? suitesQuePegaram(semG.saida) : [];
      /* CONFIRMAÇÃO DO CASO SUSPEITO. "Vermelho com golden, verde sem" é o sinal
         que este relatório existe para dar — e é TAMBÉM o que uma falha
         transitória produz. Aconteceu no F0.9 com o S35, que em caixa limpa
         passa nos dois modos. Como o caso é raro, confirmar custa pouco. */
      if (!semG.vermelha) {
        const comG2 = await julgar(caixa, false, false);
        if (!comG2.vermelha) { instavel = true; comG = comG2; pegouPor = []; }
      }
    }

    /* A PASSADA DO NAVEGADOR GUARDA QUAL SUÍTE PEGOU, e não só que alguma pegou.
       O relatório dizia 'só o navegador' e perdia o nome — e são justamente
       estes os defeitos mais caros do portão, os únicos que pagam a partida do
       Chromium. Sem o nome, eles nunca entram no índice de captura e continuam
       pagando o preço cheio para sempre. */
    /* ── A PASSADA DO NAVEGADOR, ESTREITA PRIMEIRO ────────────────────────
     *
     * A suíte visual carrega a página em quatro larguras, e cada carga espera
     * ~5 s de Monte Carlo: 65 s por mutante. Medido, uma largura custa 34 s.
     *
     * Roda a estreita primeiro pela MESMA dedução que rege o arquivo inteiro:
     * vermelho numa configuração reduzida é vermelho na completa. Verde nela
     * não conclui nada — e por isso, quando ela sai verde, a completa roda
     * antes de qualquer veredito. **Nenhum PASSOU sai daqui sem as quatro
     * larguras terem sido olhadas.** */
    let navegador = '', navPor = [];
    if (!comG.vermelha) {
      let nav = await julgar(caixa, false, true, null, true);
      if (!nav.vermelha) nav = await julgar(caixa, false, true, null, false);
      if (nav.vermelha) {
        navPor = suitesQuePegaram(nav.saida);
        navegador = navPor.length ? `navegador: ${navPor.join(',')}` : 'só o navegador';
      }
    }
    return { ...d, instavel, viaIndice: false,
      status: instavel ? 'INSTÁVEL' : (comG.vermelha || navegador ? 'PEGOU' : 'PASSOU'),
      com: comG.vermelha ? pegouPor.join(',') : navegador,
      sem: comG.vermelha ? (semVermelha ? semPor.join(',') : 'NADA') : navegador };
  } finally {
    writeFileSync(alvo, src);   // desfaz dentro da caixa
  }
}

/* Fila simples: cada caixa puxa o próximo defeito quando termina o seu. */
const fila = ALVOS.slice();
/* Só depois de saber quantos serão de fato avaliados: uma execução quente com
   três reavaliações não paga o navegador. */
const aReavaliar = ALVOS.filter(d => {
  const c = VEREDITOS[d.id];
  const cap = String(c?.com ?? '').replace(/^navegador: /, '').split(',')[0];
  return !(c?.chave && cap && c.chave === chaveDe(d, cap));
}).length;
if (aReavaliar > VALIDAR_TUDO_ACIMA_DE) {
  console.log(`${aReavaliar} defeitos a reavaliar — validando as configurações antes de começar.`);
  await validarConfiguracoesUsadas();
}

const gravarVereditos = (parciais) => {
  /* MESCLA, e a ordem importa: o disco primeiro, esta execução por cima. Um
     veredito recém-medido vence o guardado; um guardado que esta execução não
     tocou sobrevive. */
  const anterior = (() => {
    try { return JSON.parse(readFileSync(CAMINHO_VEREDITOS, 'utf8')); }
    catch { return {}; }
  })();
  const guardados = { ...anterior };
  for (const r of parciais) {
    if (r.status !== 'PEGOU') continue;      /* só se guarda o que passou */
    const captor = String(r.com).replace(/^navegador: /, '').split(',')[0];
    const chave = chaveDe(r, captor);
    if (chave) guardados[r.id] = { chave, status: r.status, com: r.com, sem: r.sem };
  }
  /* ESCRITA ATÔMICA. Gravar aos poucos multiplica as chances de o processo
     morrer NO MEIO da escrita, e um JSON truncado é pior que cache nenhum:
     ele é lido como ilegível e some inteiro. `rename` é atômico no mesmo
     sistema de arquivos. */
  const tmp = CAMINHO_VEREDITOS + '.parcial';
  writeFileSync(tmp,
    JSON.stringify(Object.fromEntries(Object.entries(guardados).sort()), null, 0) + '\n');
  renameSync(tmp, CAMINHO_VEREDITOS);
};

const res = [];
let feitos = 0;
/* ── O PROGRESSO VAI PARA O DISCO DURANTE, E NÃO SÓ NO FIM (D-102) ─────────
 *
 * A cada `SALVAR_A_CADA` vereditos, o que já foi medido é mesclado no cache.
 * Sem isto, uma execução interrompida perde TUDO — e numa máquina cujo
 * container vive ~2-4 h, uma execução fria de 9 h nunca chega ao fim. Medido:
 * cinco execuções, ~20 h somadas, zero persistido.
 *
 * O número é um meio-termo medido a olho: baixo demais e a escrita compete com
 * a medição; alto demais e a janela de perda volta a doer. Vinte e cinco é
 * ~1 min de trabalho nesta máquina.
 *
 * A gravação é MESCLA e é ATÔMICA — ver `gravarVereditos`. As duas coisas
 * juntas são o que torna gravar no meio seguro; sozinhas, nenhuma serve. */
const SALVAR_A_CADA = 25;
await Promise.all(CAIXAS.map(async caixa => {
  for (;;) {
    const d = fila.shift();
    if (!d) return;
    res.push(await avaliar(d, caixa));
    process.stdout.write(`\r  ${++feitos}/${ALVOS.length} avaliados`);
    if (!INCREMENTAL && feitos % SALVAR_A_CADA === 0) gravarVereditos(res);
  }
}));
console.log('\n');
/* A fila devolve fora de ordem; o relatório é lido por id. */
const ordem = new Map(ALVOS.map((d, i) => [d.id, i]));
res.sort((a, b) => ordem.get(a.id) - ordem.get(b.id));

/* A REMOÇÃO SAIU DAQUI (D-036), e o motivo é que esta linha só era alcançada
   quando o portão TERMINAVA. Agora ela mora no `process.on('exit')`, no topo do
   arquivo, e cobre também os abortos, o ctrl+c e a `CAIXA_BASE` — que saía de
   `CAIXAS` por um `pop()` e por isso vazava até no caminho feliz.
   Chamada aqui de propósito mesmo assim: no caminho feliz o disco é liberado
   antes de imprimir o relatório, que é longo.

   `limpar()` e NÃO `limparCaixas()`: o segundo é a função do módulo e exige a
   lista; o primeiro é o invólucro sem argumentos que já sabe quais caixas são
   as desta execução. Escrevi `limparCaixas()` aqui ao extrair o módulo, e o
   primeiro Q2 de verdade devolveu `TypeError: caixas is not iterable` — depois
   de remover 117 órfãs e montar as quatro caixas. Suíte verde não pega isto:
   este arquivo é o portão, e não roda dentro da caixa. */
limpar();

console.log('id   defeito                                 status    sem golden, pego por');
console.log('─'.repeat(96));
for (const r of res)
  console.log(`${r.id.padEnd(4)} ${r.nome.padEnd(39)} ${(r.status==='PEGOU'?'✓':'✗')} ${r.status.padEnd(8)} ${r.sem}`);

/* ── REGRAVAR O ÍNDICE ─────────────────────────────────────────────────────
 *
 * Só a execução COMPLETA regrava. O modo incremental vê uma fatia dos defeitos,
 * e deixá-lo escrever apagaria o captor de todos os outros — o índice viraria
 * um retrato do último bloco em vez do portão inteiro.
 *
 * Guardado em `test/fixtures/` porque é exatamente isso: comportamento medido e
 * arquivado. Diferente das outras fixtures num ponto que importa — ele não
 * pode esconder regressão nenhuma, porque nada é julgado por ele. Se estiver
 * errado, o portão só fica mais lento. */
/* Os vereditos vão para o disco em toda execução que não seja parcial. Guardar
   no incremental gravaria a chave de uma fatia e apagaria o resto.

   ── E POR ISSO ELES PASSARAM A SER GRAVADOS AOS POUCOS (D-102) ─────────────

   A frase acima diagnosticou certo e resolveu errado. O problema nunca foi
   gravar cedo: foi gravar SUBSTITUINDO. Gravar só no fim tem um custo que só
   aparece quando a execução não chega ao fim —

     MEDIDO em 14-15/09: cinco execuções do portão, ~20 h de máquina somadas,
     nenhuma terminou (container reiniciado duas vezes, projeção de 9 h), e o
     cache no disco continuou sendo o da primeira. VINTE HORAS, ZERO PROGRESSO
     PERSISTIDO.

   O conserto é MESCLAR em vez de substituir. Com mescla, gravar no meio deixa
   de apagar o resto — e a execução vira RETOMÁVEL: a que morre na hora 3 deixa
   três horas de veredito no disco, e a seguinte começa de onde parou.

   É a mesma lição dos commits de rascunho que salvaram este dia duas vezes:
   trabalho que só existe na memória de um processo é trabalho apostado. */

if (!INCREMENTAL) {
  gravarVereditos(res);

  const reusados = res.filter(r => r.reusado).length;
  console.log(`\nvereditos: ${res.length - reusados} reavaliados agora, ${reusados} reaproveitados.`);
  if (reusados)
    console.log('  Reaproveitado NÃO é pulado: para cada um deles, a definição do ' +
                'defeito,\n  o arquivo mutado e todo o fecho da suíte que o pegou estão ' +
                'byte a byte\n  iguais aos da avaliação anterior. Os 208 seguem respondidos.');
  if (IGNORAR_CACHE) console.log('  (--completo: o cache foi ignorado nesta execução)');
}

if (!INCREMENTAL) {
  const antes = { ...INDICE };
  const novo = {};
  for (const r of res) {
    if (r.status !== 'PEGOU') continue;
    /* A PRIMEIRA suíte da lista, e nunca o golden: o golden é fixture, e um
       defeito que só ele pega já aparece no aviso de cobertura fraca. */
    const captor = r.viaIndice ? r.com
      : String(r.com).replace(/^navegador: /, '').split(',')
          .find(n => n && n !== 'golden' && n !== 'só o navegador') || '';
    if (captor) novo[r.id] = captor;
  }
  const mudaram = Object.keys(novo).filter(id => antes[id] && antes[id] !== novo[id]);
  const perderam = Object.keys(antes).filter(id => !novo[id]);
  writeFileSync(CAMINHO_INDICE,
    JSON.stringify(Object.fromEntries(Object.entries(novo).sort()), null, 0) + '\n');

  const doIndice = res.filter(r => r.viaIndice).length;
  console.log(`\níndice de captura: ${doIndice}/${res.length} resolvidos pelo atalho, ` +
              `${res.length - doIndice} pelo caminho completo.`);
  if (mudaram.length) {
    /* CAPTOR QUE MUDA É INFORMAÇÃO, e não ruído: quer dizer que a suíte que
       cobria aquele comportamento deixou de cobrir e outra assumiu. Vale
       aparecer, porque às vezes a segunda cobre por acidente. */
    console.log(`⚠ ${mudaram.length} defeito(s) mudaram de captor:`);
    for (const id of mudaram) console.log(`  · ${id}: ${antes[id]} → ${novo[id]}`);
  }
  if (perderam.length)
    console.log(`⚠ ${perderam.length} defeito(s) saíram do índice (não pegos ou removidos).`);
}

const escaparam = res.filter(r => r.status !== 'PEGOU');
const instaveis = res.filter(r => r.instavel);
const soGolden  = res.filter(r => r.status === 'PEGOU' && r.sem === 'NADA');

console.log('');
if (escaparam.length) {
  console.log(`Q2 VERMELHO — ${escaparam.length}/${ALVOS.length} não foram pegos:`);
  /* O STATUS ENTRA NA LINHA, e não é detalhe. "ESCAPOU" e "ÂNCORA PERDIDA" são
     problemas diferentes: no primeiro o defeito foi plantado e a suíte não
     viu; no segundo ele nem chegou a ser plantado, porque o trecho onde ele
     morava deixou de existir. Chamar os dois de "passou despercebido" custou
     um diagnóstico errado no V1.14. */
  for (const r of escaparam)
    console.log(`  · ${r.id} [${r.status}] ${r.nome} — ${r.real}`);
}
if (soGolden.length) {
  console.log(`\n⚠ ${soGolden.length} defeito(s) só o golden pega — cobertura de propriedade fraca:`);
  for (const r of soGolden) console.log(`  · ${r.id} ${r.nome}`);
}
if (instaveis.length) {
  console.log(`\n⚠ ${instaveis.length} defeito(s) com resultado INSTÁVEL entre execuções.`);
  console.log('  Não contam como pegos: dúvida sobre cobertura tem que aparecer como dúvida.');
  for (const r of instaveis) console.log(`  · ${r.id} ${r.nome}`);
}
if (escaparam.length) process.exit(1);
/* O VERDE DO MODO INCREMENTAL NÃO É O VERDE DO PORTÃO, e a linha tem que dizer
   isso — verde parcial lido como verde de portão é exatamente o jeito de um
   bloco fechar com cobertura que ninguém verificou. */
if (INCREMENTAL) {
  console.log(`parcial VERDE — ${ALVOS.length}/${ALVOS.length} dos defeitos tocados detectados.`);
  console.log(`⚠  ${DEFEITOS.length - ALVOS.length} defeito(s) NÃO foram avaliados. Isto não fecha o Q2.`);
  console.log('   Rode `npm run sabotagem` inteiro antes do commit.');
} else {
  console.log(`Q2 VERDE — ${DEFEITOS.length}/${DEFEITOS.length} detectados` +
              (soGolden.length ? `, mas ${soGolden.length} dependem do golden.` : ', nenhum dependente só do golden.'));
}
console.log(`caixas de areia removidas; a árvore de trabalho não foi tocada.`);
