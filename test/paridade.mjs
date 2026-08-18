/* Q4 · PARIDADE COM O PROTÓTIPO — o motor vivo só diverge onde declaramos.
 *
 * Extrai o motor do protótipo congelado e compara, rodada a rodada, com o
 * motor vivo. Toda divergência precisa estar na lista DIVERGENCIAS, com o
 * defeito que a justifica. Divergência não declarada reprova o bloco.
 */
import { execFileSync } from 'node:child_process';
import { criarSuite, ok, elencoDeterministico, rngTeste } from './harness.mjs';
import * as VIVO from './motor.mjs';

/* Divergências intencionais em relação ao protótipo v0.8. */
export const DIVERGENCIAS = [
  { id: 'D-001', o_que: 'o caminho rápido devolvia -1 em varredura por tempestade' },
];

const RODADAS = 3000;

export async function suite() {
  const s = criarSuite('paridade');
  execFileSync('node', ['tools/snapshot-prototipo.mjs'], { stdio: 'pipe' });
  const PROTO = await import('../tools/.snapshot-prototipo.mjs');

  s.teste('mesmo elenco a partir dos mesmos dados', () => {
    ok(PROTO.KANTO_DEX.length === VIVO.elenco.length, 'tamanho do elenco divergiu');
    for (let i = 0; i < VIVO.elenco.length; i++)
      ok(PROTO.KANTO_DEX[i].dex === VIVO.elenco[i].dex, `dex divergiu na posição ${i}`);
  });

  s.teste('mesmos golpes atribuídos a cada espécie', () => {
    for (const p of VIVO.elenco) {
      const a = VIVO.atribuirGolpes(p).map(m => m.n).join('|');
      const b = PROTO.assignMoves(p).map(m => m.n).join('|');
      ok(a === b, `moveset de ${p.n} divergiu`);
    }
  });

  s.teste(`modo gravação idêntico em ${RODADAS} rodadas`, () => {
    for (let i = 0; i < RODADAS; i++) {
      const fv = elencoDeterministico(VIVO.elenco, VIVO.montarElenco, 40000 + i);
      const fp = elencoDeterministico(PROTO.KANTO_DEX, PROTO.buildRoster, 40000 + i);
      const seed = 500000 + i;
      const a = VIVO.simular(fv, seed, true), b = PROTO.simulate(fp, seed, true);
      ok(a.winner === b.winner && a.events.length === b.events.length
         && Math.abs(a.duration - b.duration) < 1e-12,
        `rodada ${i}: modo gravação divergiu — nenhuma divergência foi declarada para ele`);
    }
  });

  s.teste(`caminho rápido diverge SOMENTE onde D-001 previa`, () => {
    let divergiu = 0, corrigido = 0;
    const R = rngTeste(4242);
    const f = VIVO.montarElenco(VIVO.elenco.slice(0, 12));
    const fp = PROTO.buildRoster(PROTO.KANTO_DEX.slice(0, 12));
    for (let i = 0; i < 200000; i++) {
      const seed = (R() * 4294967296) >>> 0;
      const a = VIVO.simular(f, seed, false), b = PROTO.simulate(fp, seed, false);
      if (a === b) continue;
      divergiu++;
      /* a única divergência aceita: o protótipo perdia o vencedor, o vivo acha */
      ok(b === -1 && a >= 0,
        `divergência fora do previsto na seed ${seed}: vivo=${a} protótipo=${b}`);
      /* e o vencedor achado tem que ser o mesmo do modo gravação */
      ok(VIVO.simular(f, seed, true).winner === a,
        `seed ${seed}: caminho rápido e modo gravação discordam entre si`);
      corrigido++;
    }
    ok(divergiu > 0, 'nenhuma divergência encontrada — D-001 não foi corrigido?');
    ok(divergiu === corrigido, 'houve divergência não explicada por D-001');
  });

  return s;
}
