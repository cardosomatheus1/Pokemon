/* Q1/Q3 · FONTE ÚNICA — o motor existe em um lugar só.
 *
 * O bloco F0.2 troca "o protótipo contém o motor" por "o app importa o motor".
 * Uma cópia divergente esquecida no HTML é o modo de falha clássico dessa
 * troca: tudo funciona, e as duas cópias divergem no primeiro ajuste.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok } from './harness.mjs';

const APP = new URL('../app/index.html', import.meta.url);
const MOTOR = new URL('../engine/engine.mjs', import.meta.url);

/* Declarações que pertencem ao motor e NÃO podem reaparecer no app. */
const DO_MOTOR = [
  'CONF', 'CHART', 'KANTO_DEX_FULL', 'ARENA_DEX', 'KANTO_DEX', 'MASTER_MOVES',
  'assignMoves', 'rng', 'statAt', 'buildRoster', 'effect', 'damageOf',
  'simulate', 'stormRate', 'WEATHER_TABLE', 'rollWeather', 'applyWeather',
  'pickLineup', 'displayName', 'showdownSlug', 'TIPO_PT', 'TCOLOR', 'NAME_FIX',
  'MOEDA', 'CUR', 'newSeed',
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

  s.teste('o app importa do módulo do motor', () => {
    ok(/<script[^>]*type=["']module["']/.test(app), 'o script do app não é módulo');
    ok(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*engine\/engine\.mjs['"]/.test(app),
      'o app não importa de engine/engine.mjs');
  });

  s.teste('o motor não conhece o DOM', () => {
    for (const proibido of ['document.', 'window.', 'localStorage', 'requestAnimationFrame']) {
      ok(!motor.includes(proibido), `o motor referencia ${proibido} — deixou de ser puro`);
    }
  });

  s.teste('o motor exporta o que o app precisa', () => {
    const usados = [...app.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]*engine\/engine\.mjs['"]/g)]
      .flatMap(m => m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean));
    ok(usados.length > 0, 'o app não importa nenhum símbolo');
    for (const nome of usados) {
      const re = new RegExp(`^export\\s+(?:const|let|function)\\s+${nome}\\b|\\b${nome}\\b\\s*(?:,|\\n|\\})`, 'm');
      ok(re.test(motor.split('export {')[1] || motor) || re.test(motor),
        `o app importa ${nome}, que o motor não exporta`);
    }
  });

  return s;
}
