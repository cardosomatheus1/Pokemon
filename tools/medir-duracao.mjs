/* MEDIR A DURAÇÃO DAS LUTAS — regrava test/fixtures/duracao.json (ST-12.8).
 *
 *   node tools/medir-duracao.mjs [rodadas=10000]
 *
 * Regrave SÓ quando o ritmo das lutas mudar de propósito, e ponha o número
 * novo ao lado do antigo na mensagem do commit (regra das fixtures de medição
 * do CLAUDE.md). */
import { writeFileSync } from 'node:fs';
import { criarMotor } from '../engine/engine.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { sementes } from '../engine/seed.mjs';
import { lutaDaRodada } from '../engine/luta-rodada.mjs';
import { LIMITES_DURACAO, faixaDaDuracao } from '../engine/mercado-duracao.mjs';

const M = criarMotor(pack);
export function medir(rodadas, prefixo = 'dur') {
  const faixas = LIMITES_DURACAO.map(() => 0).concat(0);
  const d = [];
  for (let k = 0; k < rodadas; k++) {
    const t = sementes(`${prefixo}-${k}`);
    const pool = M.sortearPool(t.elenco);
    const { batalha } = lutaDaRodada(M, { pool, ambiente: t.ambiente, batalha: t.batalha });
    d.push(batalha.duration); faixas[faixaDaDuracao(batalha.duration)]++;
  }
  d.sort((a, b) => a - b);
  const q = p => Math.round(d[Math.floor(p * (d.length - 1))] * 100) / 100;
  return { limites: [...LIMITES_DURACAO], rodadas, parcelas: faixas.map(c => Math.round(c / rodadas * 10000) / 10000),
           quartis: [q(0.25), q(0.5), q(0.75)], minimo: q(0), maximo: q(1) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const r = medir(Number(process.argv[2]) || 10000);
  writeFileSync(new URL('../test/fixtures/duracao.json', import.meta.url), JSON.stringify(r, null, 2) + '\n');
  console.log(JSON.stringify(r));
}
