/* OS GINÁSIOS COMO AULAS — a medição (ST-10.13 · F4.6 · Spec §8.1.2).
 *
 *   node tools/medir-ginasios.mjs      grava test/fixtures/ginasios.json
 *
 * "Dificuldade de cada ginásio é MEDIDA, não estimada." Para cada ginásio, dois
 * times de referência que diferem em UM membro — o que ignora a lição e o que
 * a aplica —, 2.000 lutas cada pela mesma conta da chance exibida (`lote`,
 * raiz fixa). O aceite (a Spec pede que ignorar a lição perca a maior parte
 * das vezes; o plano recomenda ≥ 70% de derrota e ≥ 60% de vitória) é cobrado
 * pelo `test/ginasios.mjs` contra o NÚMERO GRAVADO, e o teste refaz a conta.
 *
 * E o primeiro nó (D-125): o inicial SOZINHO, no nível 5, contra o primeiro
 * rival do caminho — quem acabou de chegar tem de conseguir dar o primeiro
 * passo.
 *
 * O jogador luta com o padrão do moveset (o que ele tem sem escolher); o
 * rival, com `rivalDe` (o moveset pela força de quem bate). Fixture de
 * MEDIÇÃO: regrava quando a medição muda de propósito, com o número novo ao
 * lado do antigo na mensagem do commit. */
import { writeFileSync } from 'node:fs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { lote, resumo } from '../engine/treino-preco.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';

export const RAIZ = 20260928, SIMS = 2000, INICIAIS = [1, 4, 7], NIVEL_INICIAL = 5;
/* Cada membro: [dex, nível] ou [dex, nível, { iv, natureza }] — o terceiro é o
   que a Misty precisa para variar SÓ a velocidade (o oculto de velocidade). */
export const time = l => l.map(([dex, nivel, extra]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel), ...(extra ?? {}) }));
const IV = vel => [15, 15, 15, 15, 15, vel];

/* Os times de referência de cada ginásio. `ignora` e `aplica` diferem num
   membro só: a diferença de chance É a lição, e nada mais. */
export const REFERENCIAS = {
  pewter: { ignora: [[4, 14], [16, 13], [19, 13]], aplica: [[7, 14], [16, 13], [19, 13]] },
  /* "Mesmo time, só a velocidade invertida" (plano, ST-10.14): o mesmo Raichu
     22, o oculto de velocidade 0 × 31 — 57 contra 63, com o Starmie em 59. */
  cerulean: { varia: 'vel', ignora: [[26, 22, { iv: IV(0) }]], aplica: [[26, 22, { iv: IV(31) }]] },
  /* Imunidade (ST-10.15): o mesmo Raticate 22 ao lado, e o membro que muda é
     um Arcanine 22 (neutro, e MAIS forte no papel) × um Rhyhorn 22 (Terrestre,
     imune a Elétrico). O teste cobra as três coisas: imune de um lado, não do
     outro, e o que ignora não é mais fraco. */
  vermilion: { varia: 'imune', tipo: 'electric', ignora: [[59, 22], [20, 22]], aplica: [[111, 22], [20, 22]] },
  /* Físico × especial (ST-10.16): o MESMO Arcanine 42 (ataque 110, especial
     100 — equilibrado, para a diferença ser o lado fraco de quem apanha, e não
     o atacante), só golpes especiais × só físicos, com um Snorlax 36 ao lado. */
  saffron: { varia: 'categoria', ignora: [[59, 42, { golpes: ['Flamethrower', 'Hyper Voice'] }], [143, 36]],
                                 aplica: [[59, 42, { golpes: ['Fire Punch', 'Body Slam', 'Extreme Speed', 'Quick Attack'] }], [143, 36]] },
};

export const medida = (A, idRival) => resumo(lote(pack, A, rivalDe(pack, treinador(pack, idRival)), RAIZ, 0, SIMS));
export const chance = (A, idRival) => medida(A, idRival).p;

export function medir() {
  const ginasios = (pack.jornada ?? []).filter(n => n.insignia).map(n => {
    const ref = REFERENCIAS[n.id];
    if (!ref) return { id: n.id, rival: n.rival, semReferencia: true };
    const ig = medida(time(ref.ignora), n.rival), ap = medida(time(ref.aplica), n.rival);
    return { id: n.id, rival: n.rival, ensina: n.licao?.ensina ?? null,
             ignora: +ig.p.toFixed(4), aplica: +ap.p.toFixed(4), erro: +Math.max(ig.erro, ap.erro).toFixed(4) };
  });
  const primeiro = (pack.jornada ?? [])[0];
  const inicial = INICIAIS.map(dex => ({ dex, p: +chance(time([[dex, NIVEL_INICIAL]]), primeiro.rival).toFixed(4) }));
  return { medidoEm: '2026-09-27', raiz: RAIZ, sims: SIMS, primeiroNo: { id: primeiro.id, rival: primeiro.rival, inicial }, ginasios };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  const saida = medir();
  writeFileSync(new URL('../test/fixtures/ginasios.json', import.meta.url), JSON.stringify(saida, null, 1) + '\n');
  console.log(`primeiro nó (${saida.primeiroNo.id}):`, saida.primeiroNo.inicial.map(x => `${x.dex}: ${(x.p * 100).toFixed(1)}%`).join(' · '));
  for (const g of saida.ginasios) console.log(g.id.padEnd(8), g.semReferencia ? 'SEM REFERÊNCIA' : `ignora ${(g.ignora * 100).toFixed(1)}% · aplica ${(g.aplica * 100).toFixed(1)}%`);
  console.log(((performance.now() - t0) / 1000).toFixed(1), 's');
}
