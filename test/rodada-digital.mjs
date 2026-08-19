/* Reconstrução de uma rodada a partir da raiz, e a impressão digital dela.
 *
 * Mora num arquivo próprio porque roda nos DOIS ambientes: no Node, importado
 * pela suíte; no Chromium, importado pela página do portão Q5. É a mesma fonte
 * dos dois lados — se fosse código duplicado, o teste de determinismo entre
 * ambientes estaria comparando duas coisas escritas separadamente, e provaria
 * bem menos do que parece.
 */
import { criarMotor, tiposDaPool } from '../engine/engine.mjs';
import { sementes } from '../engine/seed.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';

const E = criarMotor(pack);

export function rodada(raiz) {
  const s = sementes(raiz);
  /* Pool primeiro, clima depois (F0.11): a pool não conhece o clima, então não
     carrega informação sobre ele. */
  const elenco = E.sortearPool(s.elenco);
  const clima  = E.sortearClima(s.ambiente, tiposDaPool(elenco));
  const batalha = E.simular(E.aplicarClima(elenco, clima), s.batalha, true);
  return { sementes: s, clima, elenco, batalha };
}

/* Texto, e não objeto: comparar campo a campo esconde o campo que ninguém
   lembrou de comparar. */
export function digital(raiz) {
  const r = rodada(raiz);
  return JSON.stringify({
    sementes: r.sementes,
    clima: r.clima.key,
    elenco: r.elenco.map(f => [f.dex, f.n, f.maxHp, f.atk, f.def, f.spa, f.spd, f.spe,
                               f.moves.map(m => m.n)]),
    vencedor: r.batalha.winner,
    duracao: r.batalha.duration,
    eventos: r.batalha.events,
  });
}
