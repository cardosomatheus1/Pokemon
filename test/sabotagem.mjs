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
import { existsSync, readFileSync, symlinkSync, writeFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fechoDaSuite, digitalDoFecho, TUDO } from './fecho.mjs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFEITOS } from './defeitos-plantados.mjs';
import { conferirAncoras, filtrarTocados } from './ancoras.mjs';

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
/* AS SUÍTES QUE PRECISAM DE NAVEGADOR (T3).
 *
 * A segunda passada — a que responde "só o navegador pega?" — rodava a suíte
 * INTEIRA de novo, com Chromium. As 21 suítes baratas já tinham saído verdes na
 * primeira passada, e rodá-las outra vez não podia mudar a resposta: elas não
 * enxergam o navegador. Agora ela roda só as seis que enxergam.
 *
 * A lista é a mesma do `run.mjs`, e as duas TÊM que fechar. Escrevi este
 * comentário dizendo que uma divergência deixaria "a coluna pego por pobre, não
 * errada", e estava errado: o Q2 completo mostrou o `S59` — o vazamento de rede
 * — voltando como PASSOU, porque eu tinha deixado o `sem-rede` de fora. É o
 * portão que pegou o vazamento de avatar do V1.15. Suíte que não roda não é
 * cobertura fraca: é ausência de cobertura com relatório verde. */
const SUITES_NAVEGADOR = 'visual,visual-base,ambientes,rodada-viva,tema-cedo,sem-rede,contraste';

function rodar(caixa, semGolden, comVisual, recorte = null, estreita = false) {
  const env = { ...process.env,
    ...(estreita ? { SABOTAGEM_ESTREITA: '1' } : {}),
    /* Marca a caixa de areia. Um teste que confira as âncoras da lista real
       ficaria vermelho para TODOS os defeitos aqui dentro — o `de` do defeito
       plantado deixou de existir por construção —, e a coluna "pego por"
       perderia o sentido. Ver a explicação longa em test/portao.mjs. */
    EM_SANDBOX: '1',
    PARAR_CEDO: comVisual ? '' : '1',
    ...(semGolden ? { SEM_GOLDEN: '1' } : {}),
    ...(comVisual ? {} : { SEM_VISUAL: '1' }) };
  return new Promise(res => {
    const args = recorte ? ['test/run.mjs', `--so=${recorte}`]
              : comVisual ? ['test/run.mjs', `--so=${SUITES_NAVEGADOR}`]
              : ['test/run.mjs'];
    execFile('node', args, { encoding:'utf8', env, cwd:caixa, maxBuffer: 32*1024*1024 },
      (err, stdout, stderr) => res({ vermelha: !!err, saida: (stdout||'') + (stderr||'') }));
  });
}

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
    .map(l => l.split('/')[0]))].filter(d => existsSync(d));

const N_TRAB = Math.max(1, Math.min(cpus().length, 4));
const CAIXAS = [];
for (let i = 0; i < N_TRAB; i++) {
  const c = mkdtempSync(join(tmpdir(), 'pokearena-sabotagem-'));
  for (const dir of DIRS_VERSIONADOS)
    cpSync(dir, join(c, dir), { recursive: true });
  cpSync('package.json', join(c, 'package.json'));
  /* `.gitignore` entra porque test/assets.mjs afirma que a arte não é
     versionada, e essa afirmação se lê nele. `assets/` entra por link
     simbólico: são ~10 MB e copiá-los quatro vezes por execução é desperdício
     puro — nenhum defeito plantado mexe em arte. */
  cpSync('.gitignore', join(c, '.gitignore'));
  if (existsSync('assets')) symlinkSync(join(process.cwd(), 'assets'), join(c, 'assets'), 'dir');
  CAIXAS.push(c);
}
console.log(`${N_TRAB} caixa(s) de areia em ${tmpdir()}\n`);

/* Os nomes de suíte saem da PRÓPRIA linha de base, e não de um regex sobre os
   imports do `run.mjs`. Nome de suíte não é nome de arquivo: `visual-base`,
   `tema-cedo` e `ambientes` nascem dentro de outros módulos, e derivá-los do
   nome do arquivo perderia justamente as caras. Derivar não pode
   dessincronizar — é a mesma regra do ARQUIVOS e do DIRS_VERSIONADOS. */
const SUITES_REAIS = new Set();

console.log('Q2 · SABOTAGEM\n');
const base = await rodar(CAIXAS[0], false, false);
if (base.vermelha) {
  console.error('ABORTADO: a suíte já está vermelha.'); process.exit(2);
}
for (const m of base.saida.matchAll(/^\s{2}([\w-]+): \d+\/\d+$/gm)) SUITES_REAIS.add(m[1]);
console.log(`linha de base: VERDE (${SUITES_REAIS.size} suítes nomeadas)\n`);

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
   releria os mesmos arquivos 208 vezes. */
const HASHES = new Map();
for (const f of execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],
                             { encoding: 'utf8' }).split('\n').filter(Boolean)) {
  try { HASHES.set(f, createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 12)); }
  catch { /* arquivo listado e ausente: some do mapa, e isso já muda a chave */ }
}

const digitalDeFecho = new Map();
function chaveDe(d, captor) {
  if (!captor) return null;               /* sem captor conhecido não há o que reusar */
  if (!digitalDeFecho.has(captor))
    digitalDeFecho.set(captor, digitalDoFecho(fechoDaSuite(captor), HASHES));
  return createHash('sha1').update([
    d.id, d.arquivo, d.de, d.para,
    HASHES.get(d.arquivo) ?? 'ausente',
    captor,
    digitalDeFecho.get(captor),
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
  return nome;
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
  if (cache && cache.chave && (SUITES_REAIS.has(captorGuardado) || NAVEGADOR.has(captorGuardado))
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
    const onda1 = [...new Set([...(previsto ? [previsto] : []), ...afinidade(d.arquivo)])];
    if (onda1.length) {
      const precisaNav = onda1.some(n => NAVEGADOR.has(n));
      const r = await rodar(caixa, false, precisaNav, onda1.join(','), precisaNav);
      const pegou = r.vermelha ? suitesQuePegaram(r.saida).filter(n => onda1.includes(n)) : [];
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
    let comG = await rodar(caixa, false, false);
    let pegouPor = comG.vermelha ? suitesQuePegaram(comG.saida) : [];

    /* Dedução: vermelho por suíte que não é o golden => vermelho sem o golden
       também. Só quando o golden é o único que pega é preciso confirmar. */
    let semVermelha = comG.vermelha && pegouPor.some(n => n !== 'golden');
    let semPor = pegouPor.filter(n => n !== 'golden');
    let instavel = false;

    if (comG.vermelha && !semVermelha) {
      const semG = await rodar(caixa, true, false);
      semVermelha = semG.vermelha;
      semPor = semG.vermelha ? suitesQuePegaram(semG.saida) : [];
      /* CONFIRMAÇÃO DO CASO SUSPEITO. "Vermelho com golden, verde sem" é o sinal
         que este relatório existe para dar — e é TAMBÉM o que uma falha
         transitória produz. Aconteceu no F0.9 com o S35, que em caixa limpa
         passa nos dois modos. Como o caso é raro, confirmar custa pouco. */
      if (!semG.vermelha) {
        const comG2 = await rodar(caixa, false, false);
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
      let nav = await rodar(caixa, false, true, null, true);
      if (!nav.vermelha) nav = await rodar(caixa, false, true, null, false);
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
const res = [];
let feitos = 0;
await Promise.all(CAIXAS.map(async caixa => {
  for (;;) {
    const d = fila.shift();
    if (!d) return;
    res.push(await avaliar(d, caixa));
    process.stdout.write(`\r  ${++feitos}/${ALVOS.length} avaliados`);
  }
}));
console.log('\n');
/* A fila devolve fora de ordem; o relatório é lido por id. */
const ordem = new Map(ALVOS.map((d, i) => [d.id, i]));
res.sort((a, b) => ordem.get(a.id) - ordem.get(b.id));

for (const c of CAIXAS) rmSync(c, { recursive:true, force:true });

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
   no incremental gravaria a chave de uma fatia e apagaria o resto. */
if (!INCREMENTAL) {
  const guardados = {};
  for (const r of res) {
    if (r.status !== 'PEGOU') continue;      /* só se guarda o que passou */
    const captor = String(r.com).replace(/^navegador: /, '').split(',')[0];
    const chave = chaveDe(r, captor);
    if (chave) guardados[r.id] = { chave, status: r.status, com: r.com, sem: r.sem };
  }
  writeFileSync(CAMINHO_VEREDITOS,
    JSON.stringify(Object.fromEntries(Object.entries(guardados).sort()), null, 0) + '\n');

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
