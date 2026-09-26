/* Q1/Q3 · O TIME DE SEIS E O POWER SCORE (ST-10.4 · F4.2, F4.8 · Spec §8.3, §8.13)
 *
 * O time valida (até 6, possuídas, sem repetir, golpes que existem); o power é
 * a SOMA das partes que a tela mostra — nada oculto; e um espião prova que nem
 * a Trainer Battle Engine nem a Arena leem o power.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { validarTime, paraTreino, powerDe, powerDoTime, fraquezasDoTime, TIME_MAX } from '../engine/time.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { criarMotor } from '../engine/engine.mjs';
import { golpesDaCriatura } from '../app/modules/moveset-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cria = (id, dex, nivel, extra = {}) => ({ id, dex, nivel, xp: 0, vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                                               natureza: 'Bold', origem: 'captura', ...extra });
const golpesDe = c => golpesDaCriatura(pack, c);
const MINHAS = [cria('a', 6, 40), cria('b', 9, 38), cria('c', 3, 36), cria('d', 25, 30), cria('e', 143, 35), cria('f', 94, 41), cria('g', 130, 33)];

export function suite() {
  const s = criarSuite('time');

  s.teste('o time valida: de 1 a 6, só as possuídas, sem repetir, golpes que existem', () => {
    ok(validarTime(pack, { criaturas: MINHAS, ids: ['a', 'b', 'c'], golpesDe }).ok, 'um time bom foi recusado');
    const casos = [
      [[], /de 1 a 6/], [['a', 'b', 'c', 'd', 'e', 'f', 'g'], /de 1 a 6/], [['a', 'a'], /duas vezes/],
      [['a', 'zz'], /não é sua/]];
    for (const [ids, motivo] of casos) {
      const r = validarTime(pack, { criaturas: MINHAS, ids, golpesDe });
      ok(!r.ok && motivo.test(r.motivo), `${JSON.stringify(ids)}: ${JSON.stringify(r)}`);
    }
    ok(/não existe/.test(validarTime(pack, { criaturas: MINHAS, ids: ['a'], golpesDe: () => ['Nada'] }).motivo ?? ''), 'golpe inventado passou');
    ok(/de 1 a 4/.test(validarTime(pack, { criaturas: MINHAS, ids: ['a'], golpesDe: () => [] }).motivo ?? ''), 'time sem golpe passou');
    igual(TIME_MAX, 6, 'o teto');
  });

  s.teste('o power é a soma das partes que a tela mostra — nada oculto', () => {
    for (const c of MINHAS) {
      const p = powerDe(pack, c, golpesDe(c));
      igual(Object.values(p.partes).reduce((a, b) => a + b, 0), p.total, `${c.dex}: a soma das partes não fecha o total`);
      igual(Object.keys(p.partes).join(), 'nivel,especie,golpes,potencial', 'as partes mudaram — a tela precisa mostrar todas');
      ok(Object.values(p.partes).every(v => Number.isInteger(v) && v >= 0), 'parte não inteira ou negativa');
    }
    const t = powerDoTime(pack, validarTime(pack, { criaturas: MINHAS, ids: ['a', 'b'], golpesDe }).time);
    igual(t.total, t.membros.reduce((a, m) => a + m.total, 0), 'o total do time não é a soma');
    /* O eixo que pesa: nível; e o potencial tem teto visível. */
    ok(powerDe(pack, cria('x', 6, 50), ['Flamethrower']).total > powerDe(pack, cria('x', 6, 40), ['Flamethrower']).total, 'o nível não sobe o power');
    igual(powerDe(pack, cria('x', 6, 50, { iv: [31, 31, 31, 31, 31, 31] }), ['Flamethrower']).partes.potencial, 10, 'o teto do potencial');
    ok(powerDe(pack, cria('x', 6, 50), ['Flamethrower']).partes.golpes > powerDe(pack, cria('x', 6, 50), ['Quick Attack']).partes.golpes, 'golpe melhor não conta');
  });

  s.teste('um espião: nem a Trainer Engine nem a Arena leem o power', () => {
    let leituras = 0;
    const espiao = o => new Proxy(o, { get: (alvo, k) => { if (/power|partes/i.test(String(k))) leituras++; return alvo[k]; } });
    const time = validarTime(pack, { criaturas: MINHAS, ids: ['a', 'b', 'c'], golpesDe }).time;
    const comPower = time.map(({ c, golpes }) => espiao({ ...paraTreino(c, golpes), power: powerDe(pack, c, golpes).total, partes: {} }));
    simular(pack, comPower, comPower.slice(0, 2), 11);
    const M = criarMotor(pack);
    M.montarElenco(pack.especies.filter(e => [6, 9, 3].includes(e.dex)).map(e => espiao({ ...e, power: 999 })));
    igual(leituras, 0, 'um motor leu o power');
    /* E pela fonte: nenhum dos dois importa o módulo do time. */
    for (const f of ['../engine/treino-batalha.mjs', '../engine/engine.mjs'])
      ok(!/time\.mjs/.test(semComentario(fonte(f))), `${f} importa o time`);
    /* O que vai ao treino é só o que ele lê. */
    igual(Object.keys(paraTreino(MINHAS[0], ['Flamethrower'])).join(), 'dex,nivel,golpes,iv,natureza', 'o treino recebe campo a mais');
  });

  s.teste('as fraquezas do time: recomendação pela tabela de tipos', () => {
    const fogo = validarTime(pack, { criaturas: [cria('1', 6, 30), cria('2', 136, 30), cria('3', 59, 30)], ids: ['1', '2', '3'], golpesDe }).time;
    const f = fraquezasDoTime(pack, fogo);
    ok(f[0] && ['water', 'rock', 'ground'].includes(f[0].tipo) && f[0].fracos >= 2, `a fraqueza do time de fogo: ${JSON.stringify(f)}`);
    ok(f.every(x => x.fracos * 2 >= 3), 'listou fraqueza de um só membro');
    igual(fraquezasDoTime(pack, []).length, 0, 'time vazio');
  });

  return s;
}
