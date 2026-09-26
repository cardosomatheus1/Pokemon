/* Q1/Q3/Q4 · A ARENA EXPLICA A PRÓPRIA ESCOLHA DE GOLPES (ST-9.11 · F3.7 · Spec §7.11)
 *
 * A razão sai da MESMA execução que escolhe: nas espécies do elenco, os golpes
 * da versão explicada são os de sempre, e o gerador é consumido igual (os
 * goldens e a margem, em outras suítes, travam o byte a byte).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as E from './motor.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('golpes-explicados');

  s.teste('em todo o elenco, os golpes explicados são os de sempre', () => {
    const elenco = E.pack.especies.filter(e => E.M.elenco.some(x => x.dex === e.dex));
    ok(elenco.length >= 70, `elenco curto: ${elenco.length}`);
    for (const esp of elenco) {
      const antes = E.M.atribuirGolpes(esp).map(m => m.n).join();
      const expl = E.M.atribuirGolpesExplicado(esp);
      igual(expl.golpes.map(m => m.n).join(), antes, `${esp.dex}: a explicação escolheu outros golpes`);
      igual(expl.razao.torneios.map(t => t.escolhido).join(), antes, `${esp.dex}: os torneios não são os golpes`);
    }
  });

  s.teste('a razão é a do código: ATQ contra ESP, a preferência, o gap e quem o viés decidiu', () => {
    let peloVies = 0;
    for (const esp of E.pack.especies) {
      const { razao } = E.M.atribuirGolpesExplicado(esp);
      igual(razao.atk, esp.s[1], `${esp.dex}: atk`); igual(razao.spa, esp.s[3], `${esp.dex}: spa`);
      igual(razao.prefEsp, esp.s[3] > esp.s[1], `${esp.dex}: preferência invertida`);
      igual(razao.gap, Math.abs(esp.s[3] - esp.s[1]) / Math.max(esp.s[3], esp.s[1], 1), `${esp.dex}: gap`);
      for (const t of razao.torneios) {
        if (t.peloVies) { peloVies++; ok(t.escolhido === t.b && t.a !== t.b, `${esp.dex}: o viés "decidiu" sem trocar`); }
        else igual(t.escolhido, t.a, `${esp.dex}: sem viés, o escolhido não é o primeiro sorteado`);
      }
    }
    ok(peloVies > 20, `o viés quase nunca decide (${peloVies}) — a razão não distinguiria um viés quebrado`);
  });

  s.teste('uma função só: a escolha de sempre É a explicada sem a razão', () => {
    const motor = fonte('../engine/engine.mjs');
    ok(/function atribuirGolpes\(golpes, entry, nomeReserva = 'normal'\)\{\s*return atribuirGolpesExplicado\(golpes, entry, nomeReserva\)\.golpes;/.test(motor),
      'a Arena escolhe por um caminho e explica por outro');
    igual((motor.match(/rng\(entry\.dex \* 7919 \+ 104729\)/g) ?? []).length, 1, 'duas sementes de golpe — duas escolhas');
  });

  return s;
}
