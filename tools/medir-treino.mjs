/* MEDE A CALIBRAÇÃO DA PROBABILIDADE EXIBIDA e grava a fixture (ST-10.5).
 *
 *   node tools/medir-treino.mjs          20.000 confrontos × 200 simulações
 *
 * Fixture de MEDIÇÃO, como a `margem.json`: regrava quando a medição muda de
 * propósito, e o número novo vai na mensagem do commit ao lado do antigo. */
import { writeFileSync } from 'node:fs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { medirCalibracao, foraDaTolerancia } from '../engine/treino-calibracao.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const t0 = performance.now();
const faixas = medirCalibracao(pack, { semente: 20260926, n: 20000, sims: 200, golpesDe: (d, n) => padraoDoMoveset(pack, d, n) });
const saida = { medidoEm: '2026-09-26', confrontos: 20000, simsPorChance: 200, formato: '3v3, níveis 20–50, elenco', faixas };
writeFileSync(new URL('../test/fixtures/treino-calibracao.json', import.meta.url), JSON.stringify(saida, null, 1) + '\n');
console.table(faixas);
console.log('fora da tolerância:', foraDaTolerancia(faixas).length, '·', ((performance.now() - t0) / 1000).toFixed(0), 's');
