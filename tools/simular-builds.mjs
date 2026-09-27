/* O SIMULADOR DE CONFRONTOS — grava a fixture de medição (ST-10.10 · §8.14).
 *
 *   node tools/simular-builds.mjs          todo o elenco, nível 50, 200 lutas por par
 *
 * A matriz de vitória 1×1 entre as espécies do elenco (moveset padrão no nível
 * 50), a espécie e o golpe dominantes, e a dificuldade de cada rival de treino
 * por faixa de nível do time de referência (os três iniciais). Reprodutível
 * pela raiz: `test/treino-builds.mjs` refaz pares sorteados e confere byte a byte.
 * Fixture de MEDIÇÃO: regrava quando a medição muda de propósito, com o número
 * novo ao lado do antigo na mensagem do commit. */
import { writeFileSync } from 'node:fs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { matrizDeBuilds, dominantes, dificuldadePorFaixa } from '../engine/treino-builds.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

export const RAIZ = 20260927, NIVEL = 50, SIMS = 200, SIMS_RIVAL = 400;
export const buildsDoElenco = () => pack.elenco.map(dex => ({ dex, nivel: NIVEL, golpes: padraoDoMoveset(pack, dex, NIVEL) }));
export const referencia = nivel => [1, 4, 7].map(dex => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) }));
export const NIVEIS = [5, 8, 12, 16, 20];

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  const builds = buildsDoElenco();
  const m = matrizDeBuilds(pack, builds, { raiz: RAIZ, sims: SIMS });
  const dom = dominantes(builds, m);
  const rivais = (pack.treinadores ?? []).map(t => ({ id: t.id, time: t.time.map(x => ({ dex: x.dex, nivel: x.nivel, golpes: padraoDoMoveset(pack, x.dex, x.nivel) })) }));
  const dif = dificuldadePorFaixa(pack, rivais, referencia, { raiz: RAIZ, sims: SIMS_RIVAL, niveis: NIVEIS });
  const saida = {
    medidoEm: '2026-09-27', raiz: RAIZ, nivel: NIVEL, simsPorPar: SIMS, elenco: builds.map(b => b.dex),
    taxa: m.taxa.map(l => l.map(x => (x === null ? null : Math.round(x * 1000) / 1000))),
    dominantes: { especies: dom.especies.slice(0, 10).map(x => ({ dex: x.dex, media: +x.media.toFixed(3) })),
                  ultimas: dom.especies.slice(-5).map(x => ({ dex: x.dex, media: +x.media.toFixed(3) })),
                  golpes: dom.golpes.slice(0, 10).map(x => ({ golpe: x.golpe, fatia: +x.fatia.toFixed(4) })) },
    dificuldade: dif.map(d => ({ id: d.id, chances: d.chances.map(c => ({ nivel: c.nivel, p: +c.p.toFixed(3) })) })),
  };
  writeFileSync(new URL('../test/fixtures/treino-builds.json', import.meta.url), JSON.stringify(saida) + '\n');
  console.log('espécies dominantes:', saida.dominantes.especies.slice(0, 5).map(x => `${pack.especies.find(e => e.dex === x.dex).n} ${x.media}`).join(' · '));
  console.log('as mais fracas:', saida.dominantes.ultimas.map(x => `${pack.especies.find(e => e.dex === x.dex).n} ${x.media}`).join(' · '));
  console.log('golpes dominantes:', saida.dominantes.golpes.slice(0, 5).map(x => `${x.golpe} ${(x.fatia * 100).toFixed(1)}%`).join(' · '));
  for (const d of saida.dificuldade) console.log(d.id.padEnd(8), d.chances.map(c => `nv${c.nivel} ${(c.p * 100).toFixed(0)}%`).join('  '));
  console.log(((performance.now() - t0) / 1000).toFixed(0), 's');
}
