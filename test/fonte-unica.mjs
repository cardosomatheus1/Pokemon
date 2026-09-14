/* Q1/Q3 · FONTE ÚNICA — o motor existe em um lugar só.
 *
 * O bloco F0.2 troca "o protótipo contém o motor" por "o app importa o motor".
 * Uma cópia divergente esquecida no HTML é o modo de falha clássico dessa
 * troca: tudo funciona, e as duas cópias divergem no primeiro ajuste.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const APP = new URL('../app/index.html', import.meta.url);
const MOTOR = new URL('../engine/engine.mjs', import.meta.url);
const LIGACAO = new URL('../app/modules/motor.mjs', import.meta.url);
const MODULOS = new URL('../app/modules/', import.meta.url);

/* Declarações que pertencem ao motor e NÃO podem reaparecer no app. */
const DO_MOTOR = [
  /* nomes de hoje */
  'CONF', 'rng', 'statAt', 'stormRate', 'criarMotor', 'efetividade', 'especies',
  'elenco', 'montarElenco', 'atribuirGolpes', 'efeito', 'dano', 'simular',
  'sortearPool', 'sortearClima', 'aplicarClima', 'nomeExibido', 'slugExterno',
  'tipoNomes', 'tipoCores', 'MOEDA', 'CUR', 'novaRaiz', 'derivar', 'sementes',
  /* e os apelidos que o F0.5 removeu: reaparecer aqui é regressão da L-020,
     não conveniência */
  'CHART', 'KANTO_DEX_FULL', 'ARENA_DEX', 'KANTO_DEX', 'MASTER_MOVES',
  'assignMoves', 'buildRoster', 'effect', 'damageOf', 'simulate',
  'WEATHER_TABLE', 'rollWeather', 'applyWeather', 'pickLineup', 'displayName',
  'showdownSlug', 'TIPO_PT', 'TCOLOR', 'NAME_FIX', 'newSeed', 'spriteURL',
];

export function suite() {
  const s = criarSuite('fonte-unica');
  const app = readFileSync(APP, 'utf8');
  const motor = readFileSync(MOTOR, 'utf8');

  s.teste('o app não redeclara nada do motor', () => {
    const achados = [];
    for (const nome of DO_MOTOR) {
      const re = new RegExp(`^\\s*(?:const|let|var|function)\\s+${nome}\\b`, 'm');
      if (re.test(app)) achados.push(nome);
    }
    ok(achados.length === 0,
      `o app redeclara ${achados.length} símbolo(s) do motor: ${achados.join(', ')}. ` +
      `Cópia divergente é o modo de falha desta troca.`);
  });

  s.teste('o app chega ao motor por uma ligação só', () => {
    ok(/<script[^>]*type=["']module["']/.test(app), 'o script do app não é módulo');
    /* Desde o F0.4 o motor recebe um ContentPack, e a ligação acontece em
       app/modules/motor.mjs. O app e os módulos falam com a ligação; só ela
       fala com o motor. Duas ligações seriam dois packs em jogo. */
    const ligacao = readFileSync(LIGACAO, 'utf8');
    ok(/from\s*['"][^'"]*engine\/engine\.mjs['"]/.test(ligacao),
      'app/modules/motor.mjs não importa o motor');
    ok(/criarMotor\s*\(/.test(ligacao), 'a ligação não chama criarMotor');
    const diretos = [...app.matchAll(/from\s*['"]([^'"]*engine\/engine\.mjs)['"]/g)];
    ok(diretos.length === 0,
      'o app importa o motor direto, contornando a ligação — isso permite dois packs simultâneos');
  });

  s.teste('o motor não conhece o DOM', () => {
    for (const proibido of ['document.', 'window.', 'localStorage', 'requestAnimationFrame']) {
      ok(!motor.includes(proibido), `o motor referencia ${proibido} — deixou de ser puro`);
    }
  });

  /* A cadeia tem dois elos desde o F0.4: ligação → motor, e app → ligação.
     Um símbolo que some de qualquer um dos dois só aparece quando o navegador
     carrega. Este teste fecha os dois elos de graça. */
  s.teste('a cadeia de importação não tem elo quebrado', () => {
    const ligacao = readFileSync(LIGACAO, 'utf8');
    const exportados = txt => {
      const nomes = new Set();
      for (const m of txt.matchAll(/^export\s+(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) nomes.add(m[1]);
      /* `export const { a, b } = M;` — desestruturação exportada. */
      for (const m of txt.matchAll(/^export\s+const\s*\{([^}]*)\}\s*=/gm))
        for (const n of m[1].split(',')) { const t = n.trim().split(/\s*:\s*/).pop(); if (t) nomes.add(t); }
      for (const m of txt.matchAll(/^export\s*\{([^}]*)\}/gm))
        for (const n of m[1].split(',')) { const t = n.trim().split(/\s+as\s+/).pop(); if (t) nomes.add(t); }
      return nomes;
    };
    const importadosDe = (txt, alvo) =>
      /* `[^}]*` e não `[\s\S]*?`: com o preguiçoso, um `import { $ } from './dom.mjs'`
         logo acima é engolido até fechar no import certo, e o nome importado
         sai com o arquivo errado colado dentro. */
      [...txt.matchAll(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]([^'"]*${alvo})['"]`, 'g'))]
        .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean));

    const doMotor = exportados(motor);
    const pedidosAoMotor = importadosDe(ligacao, 'engine/engine\\.mjs');
    ok(pedidosAoMotor.length > 0, 'a ligação não importa nada do motor');
    for (const nome of pedidosAoMotor)
      ok(doMotor.has(nome), `a ligação importa ${nome}, que o motor não exporta`);

    const daLigacao = exportados(ligacao);
    const consumidores = [['app/index.html', app],
      ...readdirSync(MODULOS).filter(f => f.endsWith('.mjs') && f !== 'motor.mjs')
        .map(f => [f, readFileSync(new URL(f, MODULOS), 'utf8')])];
    let algumImportou = false;
    for (const [quem, txt] of consumidores) {
      const pedidos = importadosDe(txt, 'motor\\.mjs');
      if (pedidos.length) algumImportou = true;
      for (const nome of pedidos)
        ok(daLigacao.has(nome), `${quem} importa ${nome} da ligação, que não o exporta`);
    }
    ok(algumImportou, 'ninguém importa da ligação — o motor ficou desconectado do app');
  });


  /* ── AS TABELAS DE REGRA MORAM NO MOTOR, E EM LUGAR NENHUM MAIS ─────────
   *
   * O teste acima varre `app/index.html`. Quando o app virou vinte e tantos
   * módulos, a varredura ficou olhando para a porta enquanto a casa crescia
   * pelos fundos: o defeito plantado `S591` põe uma tabela de perfis dentro de
   * `app/modules/idle-mundo.mjs` e a suíte inteira continua verde.
   *
   * Por que uma tabela duplicada é pior que uma função duplicada: ela não
   * quebra. Os dois lados funcionam, e divergem no primeiro ajuste — o custo de
   * uma expedição muda no motor, a aba continua cobrando o antigo, e o número
   * na tela deixa de ser o número que o jogo usa. É a L-020 chegando por outra
   * porta, e é a razão do §25.2.
   *
   * A lista é CURTA de propósito. Varrer todo símbolo do motor contra todo
   * módulo devolveria ruído — `T`, `PACK` e afins são locais legítimos em vários
   * lugares. O que entra aqui é tabela de REGRA: quanto custa, quanto rende,
   * quantas vezes por dia. Essas o jogador sente quando divergem. */
  const REGRAS_DO_MOTOR = ['PERFIS', 'TETO_DIARIO', 'TETO_ENCONTROS',
                           'TETO_CAPTURA', 'TETO_SALDO_PC_B'];

  s.teste('nenhum módulo do app redeclara uma tabela de regra do motor', () => {
    const achados = [];
    for (const f of readdirSync(MODULOS).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, MODULOS), 'utf8');
      for (const nome of REGRAS_DO_MOTOR) {
        const re = new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var|function)\\s+${nome}\\b`, 'm');
        if (re.test(txt)) achados.push(`${f} → ${nome}`);
      }
    }
    ok(achados.length === 0,
      `${achados.length} tabela(s) de regra redeclarada(s) no app: ${achados.join(', ')}. ` +
      'Uma tabela de regra em dois lugares não quebra nada hoje — os dois lados ' +
      'funcionam. Ela diverge no primeiro ajuste, e a partir daí o número que a ' +
      'tela mostra deixa de ser o número que o jogo cobra. Importe do motor.');
  });

  s.teste('as tabelas de regra existem mesmo, e no motor', () => {
    /* Sem isto, renomear uma tabela no motor esvazia o teste acima em silêncio:
       ele passaria a procurar por um nome que não existe mais em lugar nenhum,
       e ficaria verde para sempre sobre uma varredura vazia. É o mesmo cuidado
       do S109 — execução vazia com a palavra VERDE. */
    const daEngine = readdirSync(new URL('../engine/', import.meta.url))
      .filter(f => f.endsWith('.mjs'))
      .map(f => readFileSync(new URL('../engine/' + f, import.meta.url), 'utf8'))
      .join('\n');
    for (const nome of REGRAS_DO_MOTOR)
      ok(new RegExp(`^export const ${nome}\\b`, 'm').test(daEngine),
        `"${nome}" está na lista de tabelas de regra e o motor não a exporta. ` +
        'Ou ela foi renomeada e a lista ficou para trás, ou ela saiu do motor. ' +
        'Nos dois casos a varredura acima virou letra morta.');
  });
  /* ── SELETOR SOLTO EM OUVINTE DE DOCUMENTO É CONTRATO INVISÍVEL (D-065) ──
   *
   * O cartão da criatura ganhou `data-dex` para uma sonda de teste, e o
   * seletor do INICIAL — `ev.target.closest('[data-dex]')` num ouvinte de
   * `document` — passou a casar com ele primeiro. Clicar numa criatura
   * chamava `escolherInicial`, que lança, e o `return` matava o clique. O
   * jogador só conseguia selecionar o inicial, que já vem selecionado.
   *
   * A CAUSA NÃO É O ATRIBUTO, é o seletor sem escopo: ele é um contrato
   * invisível com a página inteira, e quem acrescenta o atributo noutro lugar
   * não tem como saber que existia um dono.
   *
   * Isto se afirma na FONTE e não no navegador, e de propósito: a caixa do
   * portão abre com uma criatura só, e com um cartão na tela o defeito não
   * pode aparecer. Foi a sétima vez neste projeto que medi onde o defeito não
   * cabe — a saída nunca é uma sonda mais esperta. */
  s.teste('nenhum ouvinte delegado usa seletor de atributo sem escopo', () => {
    const SOLTOS = ['data-dex', 'data-cria', 'data-bioma', 'data-perfil',
                    'data-mover', 'data-lance', 'data-zoom', 'data-colher'];
    const achados = [];
    for (const f of readdirSync(MODULOS).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, MODULOS), 'utf8');
      for (const attr of SOLTOS) {
        const re = new RegExp(`closest\\(\\s*['"]\\[${attr}\\]['"]\\s*\\)`, 'g');
        if (re.test(txt)) achados.push(`${f} → [${attr}]`);
      }
    }
    ok(achados.length === 0,
      `${achados.length} seletor(es) de atributo sem escopo: ${achados.join(', ')}. ` +
      'Num ouvinte de documento inteiro, isso reivindica o atributo na página ' +
      'toda — e o próximo elemento que o ganhar perde o próprio clique, em ' +
      'silêncio. Prefixe com o contêiner: .');
  });

  return s;
}
