/* O COMPARADOR — "seu Charmander × o Charizard da Arena", e por quê (ST-9.13 · F3.7 · §7.11).
 *
 * Camada 0 (lê o motor do app, que é dado). Ao montar os golpes (ST-9.12), o
 * jogador vê o que a ARENA escolheria para a forma que luta, e a razão em uma
 * frase.
 *
 * ── A FUNÇÃO DA ARENA, E NÃO UMA CÓPIA ────────────────────────────────────
 *
 * `funcaoDaArena` É `atribuirGolpesExplicado` do motor — o teste confere a
 * IDENTIDADE da referência. Um comparador que reimplementasse a escolha
 * mostraria outra Arena no primeiro ajuste de balanço, e o jogador montaria o
 * time contra um oponente que não existe.
 */
import { atribuirGolpesExplicado, elenco } from './motor.mjs';
import { linhaDe } from '../../engine/evolucao.mjs';
import { golpesDaCriatura } from './moveset-dados.mjs';

export const funcaoDaArena = atribuirGolpesExplicado;

/* Abaixo disto o viés quase não decide (a Arena sorteia um torneio com essa
   probabilidade): dizer "prioriza" seria prometer uma tendência que não há. */
export const GAP_EQUILIBRADO = 0.1;

/* A forma que LUTA: a própria, se luta; senão, a da linha que está no elenco. */
export function formaDaArena(pack, dex, naArena = elenco) {
  const luta = d => naArena.some(x => x.dex === d);
  if (luta(dex)) return dex;
  return linhaDe(pack, dex).find(luta) ?? null;
}

/* Em palavras, com o número entre parênteses: a primeira versão ("ESP 109 >
   ATQ 84 → prioriza especial") foi lida como jargão pelo crítico cego. */
export function fraseDaRazao(r) {
  if (r.gap < GAP_EQUILIBRADO) return `físico e especial parecidos (ATQ ${r.atk}, ESP ${r.spa}) — a Arena mistura os dois`;
  return r.prefEsp ? `bate mais forte no especial (ESP ${r.spa} contra ATQ ${r.atk}) — a Arena puxa para golpes especiais`
                   : `bate mais forte no físico (ATQ ${r.atk} contra ESP ${r.spa}) — a Arena puxa para golpes físicos`;
}

/* `c`: a criatura do jogador. `null` quando nenhuma forma da linha luta. */
export function compararGolpes(pack, c, { naArena = elenco, nomeDe = n => n } = {}) {
  const forma = formaDaArena(pack, c.dex, naArena);
  if (forma == null) return null;
  const esp = pack.especies.find(e => e.dex === forma);
  const { golpes, razao } = funcaoDaArena(esp);
  const arena = golpes.map(g => g.n);
  const minha = golpesDaCriatura(pack, c);
  return {
    forma,
    /* O salto Charmeleon → Charizard dito com todas as letras (Q7). */
    rotulo: forma === c.dex ? 'Na Arena ela usa' : `A forma que luta, ${nomeDe(esp.n)}, usa na Arena`,
    minha, arena,
    emComum: minha.filter(n => arena.includes(n)),
    razao: fraseDaRazao(razao),
  };
}
