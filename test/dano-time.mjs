/* O DANO CHEGA AO TIME INTEIRO (ST-2.35, L-255) e o chefe deixa de ser
 * paredão (o 8º relato: "o chefe do estágio 2 da Floresta virou um paredão —
 * perdi as 3 runs na wave 10, o HP caiu de 42 direto pra 0").
 *
 * Medido antes: só o primeiro vivo lutava (os outros dois passavam a run
 * intactos), cada abate curava 25%, e o chefe da Floresta 2 era um Venomoth
 * nível 15 com Sludge Bomb — um time Bulbasaur 16 + Kakuna 15 + Pidgey 14
 * vencia 50% das runs, com golpes de 81% da vida do Kakuna.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { runComecada, paraOMotor } from '../app/modules/avanco-conta.mjs';
import { waveDeCombate, REGRA_AVANCO_COMBATE } from '../engine/run-combate.mjs';
import { medirRun } from '../tools/estudo-ritmo-avanco.mjs';

const T = Date.UTC(2026, 9, 6, 15);
const run = (time, raiz, estagio = 2) => {
  const motor = time.map(([d, nv], k) => paraOMotor(PACK, { id: String(k), dex: d, nivel: nv, iv: Array(6).fill(15) }));
  return runComecada(PACK, { bioma: 'floresta', estagio, equipe: motor.map(c => c.id), motor, raiz, agora: T });
};
/* quem ENFRENTA cada selvagem (o alvo dele). Apanhar depende da velocidade —
   o Pidgey rápido derruba antes de levar o golpe, e isso é justo. */
const enfrentou = r => { const c = []; for (let w = 1; w <= 10; w++) { r.wave = w; const x = waveDeCombate(r, PACK);
  for (const m of x.roteiro.momentos) if (m.tipo === 'entra') c[m.heroi] = (c[m.heroi] ?? 0) + 1;
  if (!x.venceu) break; r.combate.hpInicial = x.vidas; } return c; };
const quemApanha = r => { const s = new Set(); for (let w = 1; w <= 10; w++) { r.wave = w; const x = waveDeCombate(r, PACK);
  for (const m of x.roteiro.momentos) if (m.tipo === 'golpe' && m.de === 'dele') s.add(m.heroi);
  if (!x.venceu) break; r.combate.hpInicial = x.vidas; } return s; };

export function suite() {
  const s = criarSuite('dano-time');

  s.teste('a regra nova: o alvo se espalha, a cura por abate é 25%, o chefe desce', () => {
    igual(REGRA_AVANCO_COMBATE.alvo, 'espalhado');
    igual(REGRA_AVANCO_COMBATE.recuperacao, 0.25);   // ST-2.40: 10% dobrava o desgaste com o alvo espalhado
    igual(JSON.stringify(REGRA_AVANCO_COMBATE.niveisChefes), JSON.stringify([5, 13, 21, 33]));
  });

  s.teste('com três, os selvagens se dividem entre os três — e não vão todos no da frente', () => {
    const total = [0, 0, 0];
    for (let i = 0; i < 10; i++) enfrentou(run([[1, 16], [14, 15], [16, 14]], `dano-time-${i}`)).forEach((n, k) => { total[k] += n ?? 0; });
    const soma = total.reduce((a, x) => a + x, 0);
    for (const [k, n] of total.entries()) ok(n / soma >= 0.2, `o membro ${k} enfrentou só ${n} de ${soma} selvagens`);
  });

  s.teste('run gravada sem a chave do alvo segue a regra dela: só o primeiro apanha', () => {
    for (let i = 0; i < 5; i++) {
      const r = run([[1, 30], [14, 30], [16, 30]], `dano-time-velha-${i}`);
      const { alvo, ...velha } = r.combate.regra; r.combate.regra = velha;
      igual([...quemApanha(r)].join(','), '0', 'a run antiga mudou de regra no meio do caminho');
    }
  });

  s.teste('o chefe da Floresta 2 não é paredão para um time como o do relato', () => {
    let v = 0;
    for (let i = 0; i < 30; i++) v += medirRun({ estagio: 2, dex: [1, 14, 16], nivel: 15, raiz: `paredao-${i}` }).completou ? 1 : 0;
    ok(v >= 24, `o time Bulbasaur/Kakuna/Pidgey no 15 venceu ${v} de 30`);
  });

  /* O 9º relato (ST-2.40): Beedrill 13 na frente + Bellsprout 13, sem terceiro
     — 0 de 3 na wave 10. Com a cura por abate em 10% o time chegava ao chefe
     com alguém caído em 78% das runs e completava 37%; com 25%, 66%. */
  s.teste('o time de dois do 9º relato completa a maioria das runs no estágio 2', () => {
    let v = 0;
    for (let i = 0; i < 60; i++) {
      const motor = [[15, 13], [69, 13]].map(([d, nv], k) => paraOMotor(PACK, { id: String(k), dex: d, nivel: nv, iv: Array(6).fill(8) }));
      const r = runComecada(PACK, { bioma: 'floresta', estagio: 2, equipe: motor.map(c => c.id), motor, raiz: `relato9-${i}`, agora: T });
      for (let w = 1; w <= 10; w++) { r.wave = w; const x = waveDeCombate(r, PACK); if (!x.venceu) break; if (w === 10) v++; r.combate.hpInicial = x.vidas; }
    }
    ok(v >= 33, `Beedrill 13 + Bellsprout 13 completou ${v} de 60 — o caminho até o chefe voltou a ser paredão`);
  });

  s.teste('e o dano importa: no nível da porta, a vida desce e alguém desmaia', () => {
    let desmaio = 0, baixa = 0;
    for (let i = 0; i < 20; i++) { const m = medirRun({ estagio: 2, dex: [5, 17, 20], nivel: 12, raiz: `porta-${i}` }); desmaio += m.desmaios > 0; baixa += m.minimo < 50; }
    ok(desmaio >= 10, `só ${desmaio} de 20 runs no nível da porta tiveram desmaio`);
    ok(baixa >= 10, `só ${baixa} de 20 runs desceram de 50% de vida`);
  });

  return s;
}
