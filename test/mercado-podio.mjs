/* Q1/Q3 · O MERCADO DE PÓDIO: QUEM VENCEU (ST-12.7 · F2.2 · Spec §6.5)
 *
 * A trinca ordenada (1º, 2º, 3º) sai da posição final do motor, e o empate é
 * a regra escrita: quem empata numa posição ocupa todas as casas que ela
 * cobre. Nenhum desempate por slot, por vida ou por quem caiu primeiro.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import { sementes } from '../engine/seed.mjs';
import { codificar, decodificar, selecoesDoPodio, trincaValida, vencedorasPorPosicoes,
         posicoesDaLuta, precoDoModeloPodio, REGRA_PODIO } from '../engine/mercado-podio.mjs';

export function suite() {
  const s = criarSuite('mercado-podio');

  s.teste('a trinca vira um inteiro e volta; 1.320 trincas de lutadores distintos', () => {
    igual(JSON.stringify(decodificar(codificar([7, 0, 11]))), '[7,0,11]', 'ida e volta');
    const todas = selecoesDoPodio(12);
    igual(todas.length, 1320, '12 × 11 × 10');
    igual(new Set(todas).size, 1320, 'código repetido');
    ok(todas.every(x => trincaValida(x)), 'trinca da lista recusada');
    ok(!trincaValida(codificar([3, 3, 1])), 'lutador repetido aceito');
    ok(!trincaValida(codificar([0, 1, 11]), 10), 'slot fora de uma pool de 10 aceito');
    ok(!trincaValida(-1) && !trincaValida(1728) && !trincaValida(2.5), 'código fora do intervalo aceito');
  });

  s.teste('posições distintas: uma trinca; empate em 2º: todas as ordens do empate', () => {
    const pos = [3, 1, 12, 2, 4, 5, 6, 7, 8, 9, 10, 11];
    igual(JSON.stringify(vencedorasPorPosicoes(pos).map(decodificar)), '[[1,3,0]]', 'pódio simples');
    /* Campeão (slot 5) e três sobreviventes empatados em 2º (0, 2, 9). */
    const empate = [2, 12, 2, 11, 10, 1, 9, 8, 7, 2, 6, 5];
    const v = vencedorasPorPosicoes(empate).map(decodificar);
    igual(v.length, 6, 'três empatados em 2º dão 6 trincas');
    ok(v.every(([a, b, c]) => a === 5 && [0, 2, 9].includes(b) && [0, 2, 9].includes(c)), JSON.stringify(v));
    /* Campeão e UM sobrevivente: a 3ª casa é o último a cair. */
    const um = [2, 12, 3, 11, 10, 1, 9, 8, 7, 4, 6, 5];
    igual(JSON.stringify(vencedorasPorPosicoes(um).map(decodificar)), '[[5,0,2]]', 'campeão + um sobrevivente');
  });

  s.teste('a regra é escrita antes', () => {
    for (const k of ['pergunta', 'empate', 'zero', 'tempestade'])
      ok(typeof REGRA_PODIO[k] === 'string' && REGRA_PODIO[k].length > 10, `regra "${k}"`);
  });

  s.teste('em 1.000 rodadas da árvore de sementes: o campeão é sempre o 1º, e as casas respeitam a posição', () => {
    for (let k = 0; k < 1000; k++) {
      const t = sementes(`podio-${k}`);
      const pool = E.sortearPool(t.elenco);
      const b = E.simular(pool, t.batalha, true);
      const pos = posicoesDaLuta(b.events, b.winner, pool.length);
      const v = vencedorasPorPosicoes(pos);
      ok(v.length >= 1, `rodada ${k}: pódio sem vencedora`);
      for (const x of v) {
        const [a, bb, c] = decodificar(x);
        igual(a, b.winner, `rodada ${k}: o 1º não é o campeão do motor`);
        ok(pos[a] <= pos[bb] && pos[bb] <= pos[c], `rodada ${k}: casas fora de ordem ${pos[a]},${pos[bb]},${pos[c]}`);
        ok(pos[c] <= 3 || pos[bb] === pos[c], `rodada ${k}: a 3ª casa foi para quem estava abaixo do 3º`);
      }
    }
  });

  /* O EMPATE NO PÓDIO NÃO APARECE NAS LUTAS DE HOJE: medido em 26/09, 0 em
     50.000 rodadas (a luta termina com um só de pé). Os três "empates" que a
     primeira medição achou eram o D-118 — o campeão contado entre os caídos.
     A regra continua escrita e testada no caso construído acima, porque o
     motor PODE encerrar por tempo. A rodada emp-754 fica como regressão. */
  s.teste('D-118 visto pelo pódio: a rodada emp-754 tem UMA trinca, com o campeão em 1º', () => {
    const t0 = sementes('emp-754');
    const pool = E.sortearPool(t0.elenco);
    const b = E.simular(pool, t0.batalha, true);
    const v = vencedorasPorPosicoes(posicoesDaLuta(b.events, b.winner, pool.length)).map(decodificar);
    igual(v.length, 1, `o pódio da emp-754 pagaria ${v.length} trincas: ${JSON.stringify(v)}`);
    igual(v[0][0], b.winner, 'o 1º não é o campeão');
  });

  return s;
}
