/* Q1/Q4 · AS PRIMITIVAS COMPARTILHADAS (ST-10.1 · F4.1 · Spec §8.2)
 *
 * Efetividade, dano, stat no nível e o gerador moram em `engine/primitivas.mjs`,
 * e a Arena os chama com o que ELA fixa. Os goldens, a margem e a paridade são
 * a prova do byte a byte (suítes próprias); aqui fica a fronteira: as
 * primitivas não importam nada, a Arena não guarda uma segunda cópia, e motor
 * de treino nenhum importa `engine.mjs`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { rng, statNoNivel, efeito, dano } from '../engine/primitivas.mjs';
import * as Motor from '../engine/engine.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/* Importa o motor da Arena? `import ... from './engine.mjs'`, reexport, ou import nu. */
export const importaMotorDaArena = src =>
  /(?:import|export)\s[^'"]*?from\s+['"]\.{1,2}\/(?:engine\/)?engine\.mjs['"]|import\s+['"]\.{1,2}\/(?:engine\/)?engine\.mjs['"]|import\(\s*['"][^'"]*engine\/?engine\.mjs['"]/
    .test(semComentario(src));

export function suite() {
  const s = criarSuite('primitivas');

  s.teste('a fronteira: as primitivas não importam nada, e o treino nunca importa a Arena', () => {
    const prim = semComentario(fonte('../engine/primitivas.mjs'));
    ok(!/\bimport\b/.test(prim), 'as primitivas importam alguma coisa — deixaram de ser folha');
    /* O detector morde: sem isto, "nenhum arquivo de treino" passaria sempre. */
    for (const [src, esperado] of [
      ["import { criarMotor } from './engine.mjs';", true], ["export { CONF } from './engine.mjs';", true],
      ["import './engine.mjs';", true], ["import { x } from '../engine/engine.mjs';", true],
      ["const m = await import('../engine/engine.mjs');", true],
      ["import { dano } from './primitivas.mjs';", false], ["/* não: import './engine.mjs' */", false]])
      igual(importaMotorDaArena(src), esperado, `o detector errou: ${src}`);
    const treino = readdirSync(new URL('../engine/', import.meta.url)).filter(f => /^treino-.*\.mjs$/.test(f));
    for (const f of treino) ok(!importaMotorDaArena(fonte(`../engine/${f}`)), `engine/${f} importa o motor da Arena`);
  });

  s.teste('a Arena usa as primitivas, e não guarda uma segunda cópia', () => {
    const arena = semComentario(fonte('../engine/engine.mjs'));
    ok(/import \{ rng, statNoNivel, efeito, dano as danoPrimitivo \} from '\.\/primitivas\.mjs';/.test(arena), 'a Arena não importa as primitivas');
    ok(!/function (rng|efeito)\s*\(/.test(arena) && !/Math\.floor\(2\*/.test(arena) && !/0x6D2B79F5/.test(arena),
      'a Arena reimplementa uma primitiva — duas fórmulas divergem no primeiro ajuste');
    /* A API de sempre continua saindo do motor. */
    ok(Motor.rng === rng, 'o `rng` exportado pela Arena não é o das primitivas');
    igual(Motor.statAt(100), statNoNivel(100, Motor.CONF.LEVEL), 'statAt');
  });

  s.teste('o nível é parâmetro: maior nível, stat e dano maiores', () => {
    ok(statNoNivel(80, 10) < statNoNivel(80, 50) && statNoNivel(80, 50) < statNoNivel(80, 100), 'o nível não entra no stat');
    igual(statNoNivel(100, 50), 120, 'a fórmula mudou');
    const chart = pack.tipos.efetividade;
    const tipo = Object.keys(chart)[0];
    const A = { atk: 100, spa: 100, types: [tipo] }, D = { def: 100, spd: 100, types: [tipo] };
    const mv = { t: tipo, cat: 'fis', p: 80 };
    const fixo = () => () => 0.5;
    const baixo = dano(chart, A, D, mv, fixo(), 1, 1, 10, 0.0625, 1.5).dmg;
    const alto = dano(chart, A, D, mv, fixo(), 1, 1, 50, 0.0625, 1.5).dmg;
    ok(alto > baixo, `o nível não entra no dano: ${baixo} × ${alto}`);
  });

  s.teste('efetividade zero: dano zero e o gerador intocado; senão, dois sorteios (crítico, depois variação)', () => {
    const chart = { A: { B: 0, C: 2 } };
    let chamadas = 0;
    const R = () => { chamadas++; return 0.9; };
    const A = { atk: 90, spa: 90, types: ['A'] };
    const zero = dano(chart, A, { def: 90, spd: 90, types: ['B'] }, { t: 'A', cat: 'esp', p: 90 }, R, 1, 1, 50, 0.0625, 1.5);
    igual(JSON.stringify(zero), '{"dmg":0,"eff":0,"crit":false}', 'imune levou dano');
    igual(chamadas, 0, 'o golpe em imune consumiu o gerador — a luta inteira muda de ordem');
    const dois = dano(chart, A, { def: 90, spd: 90, types: ['C'] }, { t: 'A', cat: 'esp', p: 90 }, R, 1, 1, 50, 0.0625, 1.5);
    igual(chamadas, 2, 'o golpe comum não consumiu exatamente dois sorteios');
    igual(dois.eff, 2, 'efetividade');
    igual(efeito(chart, 'A', ['C', 'B']), 0, 'tipo duplo multiplica');
    /* O gerador é o mesmo de sempre (a sequência é o que os goldens fotografam). */
    const g = rng(12345);
    igual([g(), g(), g()].map(x => x.toFixed(12)).join(), '0.979728267761,0.306752264500,0.484205421526', 'o gerador mudou');
  });

  return s;
}
