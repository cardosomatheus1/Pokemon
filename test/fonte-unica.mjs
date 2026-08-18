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

  return s;
}
