/* ESTUDO DO RITMO DO AVANÇO (ST-2.34) — o 7º relato: *"o time quase não leva
 * dano e as waves de uns 45 segundos deixam o ritmo lento; por isso a Poção e
 * o desmaio nunca chegaram a importar"*.
 *
 * Roda a run de verdade (o motor do Avanço, wave a wave, a mesma
 * `waveDeCombate` que a tela e o servidor usam) num quadro de cenários — o
 * estágio, a equipe no nível da porta e acima dela — e mede o que o jogador
 * sente: quanto a vida do time desce, quantos desmaiam, quanto dura a wave e
 * quanto dela é luta de verdade.
 *
 *   node tools/estudo-ritmo-avanco.mjs [n=60]
 */
import PACK from '../content/escolhido.mjs';
import { runComecada, paraOMotor } from '../app/modules/avanco-conta.mjs';
import { waveDeCombate } from '../engine/run-combate.mjs';
import { WAVES } from '../engine/wave.mjs';

const PORTA = [5, 12, 19, 31];
const TIMES = { 1: [[4]], 2: [[5], [5, 17, 20]], 3: [[5], [5, 17, 20]], 4: [[6], [6, 18, 20]] };
const pct = (v, m) => Math.round(100 * v.reduce((a, x) => a + x, 0) / m.reduce((a, x) => a + x, 0));

export function medirRun({ estagio, dex, nivel, raiz, regra = null }) {
  const motor = dex.map((d, k) => paraOMotor(PACK, { id: String(k), dex: d, nivel, iv: Array(6).fill(15) }));
  const r = runComecada(PACK, { bioma: 'floresta', estagio, equipe: motor.map(c => c.id), motor, raiz, agora: Date.UTC(2026, 9, 4, 12) });
  if (regra) r.combate.regra = { ...r.combate.regra, ...regra };
  /* `subir`: quantos níveis a mais os comuns (e o chefe) teriam — os níveis
     são gravados na run quando ela começa, e é ali que se ensaia */
  if (regra?.subir) for (const w of r.combate.waves) for (const a of w.adversarios) a.nivel += w === r.combate.waves.at(-1) ? (regra.subirChefe ?? 0) : regra.subir;
  let minimo = 100, desmaios = 0, luta = 0, total = 0, waves = 0, completou = false;
  for (let w = 1; w <= WAVES; w++) {
    r.wave = w;
    const x = waveDeCombate(r, PACK);
    for (const m of x.roteiro.momentos) minimo = Math.min(minimo, pct(m.vidas, x.maximos));
    const ultimo = x.roteiro.momentos.at(-1)?.t ?? 0;
    luta += ultimo; total += x.roteiro.duracao; waves++;
    if (!x.venceu) break;
    if (w === WAVES) completou = true;
    r.combate.hpInicial = x.vidas;
    desmaios = x.vidas.filter(v => v <= 0).length;
  }
  return { completou, minimo, desmaios, waves, lutaS: luta / waves / 1000, waveS: total / waves / 1000, runMin: total / 60000 };
}

export function quadro(n = 60, { acima = [0, 5, 10], regra = null } = {}) {
  const linhas = [];
  for (const estagio of [1, 2, 3, 4]) for (const dex of TIMES[estagio]) for (const d of acima) {
    const rs = Array.from({ length: n }, (_, i) => medirRun({ estagio, dex, nivel: PORTA[estagio - 1] + d, raiz: `ritmo-${estagio}-${dex.join('.')}-${d}-${i}`, regra }));
    const media = k => rs.reduce((a, x) => a + x[k], 0) / n;
    linhas.push({ estagio, equipe: dex.length, nivel: PORTA[estagio - 1] + d,
      completa: Math.round(100 * rs.filter(x => x.completou).length / n),
      vidaMinima: Math.round(media('minimo')), abaixoDe30: Math.round(100 * rs.filter(x => x.minimo < 30).length / n),
      comDesmaio: Math.round(100 * rs.filter(x => x.desmaios > 0).length / n),
      lutaS: +media('lutaS').toFixed(1), waveS: +media('waveS').toFixed(1), runMin: +media('runMin').toFixed(1) });
  }
  return linhas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2]) || 60;
  const regra = process.argv[3] ? JSON.parse(process.argv[3]) : null;
  if (regra) console.log('regra:', JSON.stringify(regra));
  console.log('est equipe nível | completa% vidaMín% <30%vida% desmaio% | luta/wave s  wave s  run min');
  for (const l of quadro(n, { regra })) console.log(`${l.estagio}   ${l.equipe}      ${String(l.nivel).padStart(2)}   | ${String(l.completa).padStart(5)}  ${String(l.vidaMinima).padStart(6)}  ${String(l.abaixoDe30).padStart(6)}  ${String(l.comDesmaio).padStart(6)}   | ${String(l.lutaS).padStart(6)}  ${String(l.waveS).padStart(6)}  ${String(l.runMin).padStart(5)}`);
}
