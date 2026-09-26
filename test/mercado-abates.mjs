/* Q1/Q3 · O MERCADO DE ABATES: QUEM VENCEU (ST-12.2 · F2.2 · Spec §6.5)
 *
 * O mercado paga dinheiro pela resposta a "quem fez mais abates". A resposta
 * sai dos eventos do motor, pela contagem que o XP e o placar já usam, e o
 * empate é regra escrita antes — não decisão da liquidação.
 *
 * O teste de verdade é o das 1.000 rodadas: a pool, o clima e a batalha saem
 * da árvore de sementes, como no servidor, e a soma dos abates tem de bater
 * com as QUEDAS que não foram de tempestade. É outra travessia dos eventos, de
 * propósito: se as duas contam mundos diferentes, uma está errada.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';
import { sementes } from '../engine/seed.mjs';
import { ordemDeQuedas } from '../engine/colocacao.mjs';
import { apurar, SEM_ACERTO, TAXA_PADRAO } from '../engine/mutuo.mjs';
import { vencedorasDeAbates, abatesPorSlot, selecoesDeAbates, REGRA_ABATES } from '../engine/mercado-abates.mjs';

/* Eventos na forma do motor: golpe com `a` (atacante), `d` (alvo) e `ko`;
   tempestade com `storm` e `hits`; killstreak com `streak`. */
const ko = (a, d) => ({ a, d, ko: true });
const tempestade = (...is) => ({ storm: true, hits: is.map(i => ({ i, ko: true })) });
const sequencia = (a) => ({ a, streak: 2, ko: true });

export function suite() {
  const s = criarSuite('mercado-abates');

  s.teste('o líder de abates vence; tempestade e killstreak não contam', () => {
    const ev = [ko(3, 0), ko(3, 1), sequencia(3), tempestade(2, 4), ko(5, 6)];
    igual(JSON.stringify(abatesPorSlot(ev, 8)), JSON.stringify([0, 0, 0, 2, 0, 1, 0, 0]),
      'a contagem por slot não é a do motor');
    igual(JSON.stringify(vencedorasDeAbates(ev, 8)), '[3]', 'o líder não venceu');
  });

  s.teste('empate no topo: todos os empatados vencem, sem desempate inventado', () => {
    const ev = [ko(7, 0), ko(2, 1), ko(7, 3), ko(2, 4), ko(9, 5)];
    igual(JSON.stringify(vencedorasDeAbates(ev, 12)), '[2,7]', 'o empate não declarou os dois');
  });

  s.teste('rodada sem abate: ninguém vence, e o bolo segue o destino "sem acerto"', () => {
    const ev = [tempestade(0, 1, 2), tempestade(3)];
    igual(JSON.stringify(vencedorasDeAbates(ev, 4)), '[]', 'zero abate virou vitória');
    const r = apurar({ entradas: [{ id: 'a', selecao: 0, valor: 100 }, { id: 'b', selecao: 3, valor: 100 }],
                       vencedoras: vencedorasDeAbates(ev, 4), taxa: TAXA_PADRAO, semAcerto: SEM_ACERTO.DEVOLVER });
    igual(r.destino, 'devolucao', 'sem abate, o bolo não foi devolvido');
  });

  s.teste('a regra é escrita e exibível antes de o mercado abrir', () => {
    for (const k of ['pergunta', 'empate', 'zero', 'tempestade'])
      ok(typeof REGRA_ABATES[k] === 'string' && REGRA_ABATES[k].length > 10, `a regra "${k}" não está escrita`);
    igual(selecoesDeAbates(12).length, 12, 'as seleções não são os doze slots');
  });

  s.teste('em 1.000 rodadas da árvore de sementes a contagem bate com as quedas, sem divergência', () => {
    let empates = 0, semAbate = 0, unicos = 0;
    for (let k = 0; k < 1000; k++) {
      const t = sementes(`mercado-abates-${k}`);
      const pool = E.sortearPool(t.elenco);
      const b = E.simular(pool, t.batalha, true);
      const n = pool.length;
      const abates = abatesPorSlot(b.events, n);
      const porTempestade = new Set(b.events.filter(e => e.storm).flatMap(e => e.hits.filter(h => h.ko).map(h => h.i)));
      const quedasPorGolpe = ordemDeQuedas(b.events).filter(i => !porTempestade.has(i)).length;
      igual(abates.reduce((a, x) => a + x, 0), quedasPorGolpe,
        `rodada ${k}: abates somados ≠ quedas por golpe — alguém foi contado duas vezes, ou a tempestade virou abate`);
      const v = vencedorasDeAbates(b.events, n);
      const topo = Math.max(...abates);
      ok(v.every(i => abates[i] === topo), `rodada ${k}: venceu quem não estava no topo`);
      igual(v.length, topo === 0 ? 0 : abates.filter(x => x === topo).length, `rodada ${k}: faltou empatado`);
      if (v.length > 1) empates++; else if (!v.length) semAbate++; else unicos++;
    }
    ok(empates > 20 && unicos > 20, `a amostra não exercitou os dois casos: ${unicos} únicos, ${empates} empates, ${semAbate} sem abate`);
  });

  s.teste('uma contagem só: o mercado pergunta ao colocacao.mjs, sem travessia própria', () => {
    const f = readFileSync(new URL('../engine/mercado-abates.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    ok(/from '\.\/colocacao\.mjs'/.test(f), 'o mercado não usa a contagem do motor');
    ok(!/\.ko\b|storm|streak/.test(f), 'o mercado lê os eventos por conta própria — é a terceira contagem de abates');
  });

  return s;
}
