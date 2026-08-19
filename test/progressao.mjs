/* Q1/Q3 · PROGRESSÃO DE NÍVEL — o D-006.
 *
 * O defeito foi encontrado pelo trabalho paralelo da v1.0 (ver
 * docs/PORTE_v1.0.md) e existia dos dois lados: `xpParaNivel(1)` devolvia o
 * custo da fórmula em vez de zero, então todo treinador novo — que tem `xp: 0`
 * — via a barra de progresso NEGATIVA, em −54,9 %.
 *
 * Passou despercebido em toda a Fase 0 porque a suíte nunca olhou para o
 * perfil: o que se testou até aqui foi motor, preço, carteira e exposição. Um
 * defeito de tela precisa de teste de tela, e este arquivo é a resposta.
 */
import { criarSuite, ok, igual } from './harness.mjs';

import { nivelDe, progressoNivel, xpParaNivel } from '../app/modules/progressao.mjs';

export function suite() {
  const s = criarSuite('progressao');

  s.teste('D-006 · o treinador novo começa em 0 %, não em número negativo', () => {
    const p = progressoNivel(0);
    igual(p.nivel, 1, 'treinador novo não está no nível 1');
    igual(p.atual, 0, `treinador novo tem ${p.atual} XP no nível — negativo é o D-006`);
    ok(p.pct >= 0, `a barra do treinador novo está em ${p.pct.toFixed(1)}%`);
    ok(p.falta > 0, 'não falta XP nenhum para o nível 2');
  });

  s.teste('a barra nunca é negativa nem passa de 100 %', () => {
    for (let xp = 0; xp <= 200000; xp += 7) {
      const p = progressoNivel(xp);
      ok(p.pct >= 0 && p.pct <= 100,
        `xp ${xp}: barra em ${p.pct.toFixed(1)}% (nível ${p.nivel})`);
      ok(p.atual >= 0, `xp ${xp}: progresso ${p.atual} dentro do nível é negativo`);
    }
  });

  /* A correção não pode mover ninguém de nível — quem estava no 7 continua no 7.
     É o que separa "consertar a barra" de "reescrever a progressão". */
  s.teste('a correção não muda o nível de ninguém', () => {
    const antigo = n => Math.floor(100 * Math.pow(n, 1.5));
    const nivelAntigo = xp => { let n = 1; while (n < 200 && xp >= antigo(n + 1)) n++; return n; };
    let divergencias = 0;
    for (let xp = 0; xp <= 300000; xp++) if (nivelDe(xp) !== nivelAntigo(xp)) divergencias++;
    igual(divergencias, 0,
      `${divergencias} XP mudariam de nível com a correção. O piso do nível 1 é a ` +
      `única coisa que podia mudar: o outro uso de xpParaNivel chama sempre com n+1.`);
  });

  s.teste('o nível cresce com o XP e nunca anda para trás', () => {
    let ultimo = 1;
    for (let xp = 0; xp <= 500000; xp += 13) {
      const n = nivelDe(xp);
      ok(n >= ultimo, `xp ${xp}: nível caiu de ${ultimo} para ${n}`);
      ultimo = n;
    }
  });

  s.teste('o limiar do nível 1 é zero, e o do 2 em diante segue a curva', () => {
    igual(xpParaNivel(1), 0, 'o nível 1 não começa em zero');
    for (let n = 2; n <= 50; n++)
      igual(xpParaNivel(n), Math.floor(100 * Math.pow(n, 1.5)),
        `o limiar do nível ${n} saiu da curva`);
  });

  return s;
}
