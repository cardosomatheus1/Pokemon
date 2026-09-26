/* Q1/Q3 · O COMPARADOR (ST-9.13 · F3.7 · Spec §7.11)
 *
 * "Seu Charmander × o Charizard da Arena", e a razão em uma frase. O teste de
 * identidade prova que o comparador USA a função da Arena, e não uma cópia.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import * as motor from '../app/modules/motor.mjs';
import { funcaoDaArena, formaDaArena, fraseDaRazao, compararGolpes, GAP_EQUILIBRADO } from '../app/modules/comparador-golpes.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const pack = motor.PACK;
const CHARMANDER = 4, CHARIZARD = 6;

export function suite() {
  const s = criarSuite('comparador');

  s.teste('identidade: o comparador usa a função da Arena, e não uma cópia', () => {
    ok(funcaoDaArena === motor.atribuirGolpesExplicado && funcaoDaArena === motor.M.atribuirGolpesExplicado,
      'o comparador tem a própria função de escolha');
    const src = semComentario(fonte('../app/modules/comparador-golpes.mjs'));
    ok(!/\brng\(|Math\.abs\(|\.s\[1\]|\.s\[3\]/.test(src), 'o comparador recalcula a escolha ou a razão por conta própria');
  });

  s.teste('a forma que luta: a própria, ou a da linha que está no elenco — rotulada', () => {
    ok(motor.elenco.some(x => x.dex === CHARIZARD), 'o Charizard saiu do elenco — o teste precisa de outra linha');
    igual(formaDaArena(pack, CHARMANDER), CHARIZARD, 'o Charmander não aponta para o Charizard');
    igual(formaDaArena(pack, CHARIZARD), CHARIZARD, 'o Charizard não é ele mesmo');
    const c = compararGolpes(pack, { dex: CHARMANDER, nivel: 20 }, { nomeDe: motor.nomeExibido });
    ok(/A forma que luta, Charizard, usa na Arena/.test(c.rotulo), `rótulo: ${c.rotulo}`);
    const esp = pack.especies.find(e => e.dex === CHARIZARD);
    igual(c.arena.join(), motor.atribuirGolpes(esp).map(g => g.n).join(), 'os golpes da Arena não são os que ela usa');
    igual(c.emComum.join(), c.minha.filter(n => c.arena.includes(n)).join(), 'em comum');
    igual(compararGolpes(pack, { dex: CHARIZARD, nivel: 50 }).rotulo, 'Na Arena ela usa', 'a própria forma');
    const fora = pack.especies.find(e => formaDaArena(pack, e.dex) == null);
    if (fora) igual(compararGolpes(pack, { dex: fora.dex, nivel: 5 }), null, 'quem não tem forma na Arena ganhou comparação');
  });

  s.teste('a razão em uma frase, e a do código', () => {
    let esp = 0, fis = 0, mis = 0;
    for (const e of pack.especies.filter(x => motor.elenco.some(y => y.dex === x.dex))) {
      const { razao } = funcaoDaArena(e);
      const f = fraseDaRazao(razao);
      if (razao.gap < GAP_EQUILIBRADO) { mis++; ok(/mistura os dois/.test(f), `${e.dex}: ${f}`); }
      else if (razao.prefEsp) { esp++; ok(new RegExp(`especial \\(ESP ${razao.spa} contra ATQ ${razao.atk}\\) — a Arena puxa para golpes especiais`).test(f), `${e.dex}: ${f}`); }
      else { fis++; ok(new RegExp(`físico \\(ATQ ${razao.atk} contra ESP ${razao.spa}\\) — a Arena puxa para golpes físicos`).test(f), `${e.dex}: ${f}`); }
    }
    ok(esp > 3 && fis > 3 && mis > 3, `as três frases não aparecem no elenco (esp ${esp}, fís ${fis}, mistura ${mis})`);
  });

  s.teste('a tela: o comparador vive no painel dos golpes', () => {
    ok(/compararGolpes\(PACK, c, \{ nomeDe: nomeExibido \}\)/.test(fonte('../app/modules/idle-paineis.mjs')), 'o painel não chama o comparador');
  });

  return s;
}
