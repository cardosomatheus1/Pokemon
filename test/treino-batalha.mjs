/* Q1/Q3/Q4 · A TRAINER BATTLE ENGINE (ST-10.2 · F4.1 · Spec §8.2, §8.4, §8.9)
 *
 * Mesma semente, mesmos eventos; os goldens da Arena intocados com o motor de
 * treino carregado no mesmo processo; nível maior vence mais em 10.000
 * combates; efetividade 0 causa 0 de dano; quem é mais rápido age antes; o
 * golpe que luta é o que o jogador escolheu; e os ocultos e a natureza mexem
 * no máximo o teto declarado.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual, elencoDeterministico } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import * as E from './motor.mjs';
import { simular, montarLutador, REGRAS } from '../engine/treino-batalha.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cria = (dex, nivel, extra = {}) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel), ...extra });

export function suite() {
  const s = criarSuite('treino-batalha');

  s.teste('mesma semente, mesmos eventos — e a semente importa', () => {
    const A = [cria(6, 30), cria(9, 28)], B = [cria(3, 30), cria(25, 31)];
    const r1 = simular(pack, A, B, 777), r2 = simular(pack, A, B, 777);
    igual(JSON.stringify(r1), JSON.stringify(r2), 'a mesma semente deu outra luta');
    ok(r1.eventos.length > 0 && r1.vencedor, 'a luta não aconteceu');
    const diferentes = new Set(Array.from({ length: 20 }, (_, k) => JSON.stringify(simular(pack, A, B, k + 1).eventos))).size;
    ok(diferentes > 10, `a semente não muda a luta: ${diferentes} de 20 distintas`);
  });

  s.teste('os goldens da Arena intocados com o motor de treino carregado', () => {
    for (let k = 0; k < 200; k++) simular(pack, [cria(6, 40)], [cria(9, 40)], k, { registrar: false });
    const esperado = JSON.parse(fonte('./fixtures/golden.json'));
    for (const [i, exp] of esperado.slice(0, 4).entries()) {
      const f = elencoDeterministico(E.elenco, E.montarElenco, exp.seed + i);
      const r = E.simular(f, exp.seed, true);
      igual(`${r.winner}:${r.events.length}`, `${exp.campeao}:${exp.nEventos}`, `seed ${exp.seed}: a Arena mudou com o treino carregado`);
    }
  });

  s.teste('nível maior vence mais — em 10.000 combates', () => {
    let a = 0, b = 0;
    for (let k = 1; k <= 10000; k++) {
      const v = simular(pack, [cria(6, 30)], [cria(6, 25)], k, { registrar: false }).vencedor;
      if (v === 'A') a++; else if (v === 'B') b++;
    }
    ok(a > 7000, `nível 30 venceu o 25 só ${a} de 10.000 (perdeu ${b})`);
    /* E o espelho fica perto de meio a meio: nenhum lado leva vantagem de graça. */
    let espelho = 0;
    for (let k = 1; k <= 4000; k++) if (simular(pack, [cria(6, 30)], [cria(6, 30)], k, { registrar: false }).vencedor === 'A') espelho++;
    ok(Math.abs(espelho / 4000 - 0.5) < 0.05, `o espelho não é meio a meio: ${espelho} de 4.000`);
  });

  s.teste('efetividade 0 causa 0 de dano — e ninguém escolhe golpe inútil havendo outro', () => {
    /* Um lutador só com golpe normal contra um fantasma: imune dos dois lados. */
    const imune = simular(pack, [cria(143, 40, { golpes: ['Body Slam', 'Hyper Voice'] })], [cria(92, 40, { golpes: ['Lick'] })], 5);
    ok(imune.eventos.length > 0, 'não houve evento');
    ok(imune.eventos.every(e => e.dano === 0 && e.eff === 0), `imune levou dano: ${JSON.stringify(imune.eventos.find(e => e.dano))}`);
    igual(imune.vencedor, null, 'alguém venceu sem causar dano');
    igual(imune.turnos, REGRAS.TURNOS_MAX, 'a luta sem dano não parou no teto de turnos');
    /* Com um golpe que funciona, é ele que sai. */
    const escolhe = simular(pack, [cria(92, 40, { golpes: ['Lick', 'Sludge Bomb'] })], [cria(143, 40)], 5);
    ok(escolhe.eventos.filter(e => e.de === 'A0').every(e => e.golpe === 'Sludge Bomb'), 'o fantasma usou o golpe que não afeta o normal');
  });

  s.teste('velocidade decide a ordem: o mais rápido age primeiro em todo turno', () => {
    const rapido = montarLutador(pack, cria(101, 35), 'A', 0), lento = montarLutador(pack, cria(143, 35), 'B', 0);
    ok(rapido.spe > lento.spe, 'o par do teste não tem velocidades diferentes');
    for (let k = 1; k <= 30; k++) {
      const r = simular(pack, [cria(143, 35)], [cria(101, 35)], k);
      for (let t = 1; t <= r.turnos; t++) {
        const primeiro = r.eventos.find(e => e.turno === t);
        if (primeiro) igual(primeiro.de, 'B0', `semente ${k}, turno ${t}: o lento agiu antes`);
      }
    }
  });

  s.teste('o golpe que luta é o escolhido — nome desconhecido é erro, não fallback', () => {
    const r = simular(pack, [cria(6, 40, { golpes: ['Air Slash'] })], [cria(9, 40)], 3);
    ok(r.eventos.filter(e => e.de === 'A0').every(e => e.golpe === 'Air Slash'), 'lutou com golpe que não estava no moveset');
    let msg = '';
    try { simular(pack, [cria(6, 40, { golpes: ['Nada Disso'] })], [cria(9, 40)], 3); } catch (e) { msg = e.message; }
    ok(/golpe desconhecido/.test(msg), 'golpe desconhecido virou outro');
    msg = '';
    try { simular(pack, [cria(6, 40, { golpes: ['Air Slash', 'Ember', 'Flamethrower', 'Fire Punch', 'Drill Peck'] })], [cria(9, 40)], 3); } catch (e) { msg = e.message; }
    ok(/de 1 a 4 golpes/.test(msg), 'cinco golpes passaram');
    const src = semComentario(fonte('../engine/treino-batalha.mjs'));
    ok(!/atribuirGolpes/.test(src), 'o treino usa a escolha de golpes da Arena');
  });

  s.teste('times de 1 a 6; 0 ou 7 é erro', () => {
    const seis = [1, 4, 7, 25, 133, 143].map(d => cria(d, 30));
    ok(simular(pack, seis, seis.slice(0, 3), 9).vencedor, 'o 6 contra 3 não terminou');
    for (const errado of [[], [...seis, cria(6, 30)]]) {
      let msg = '';
      try { simular(pack, errado, seis, 1); } catch (e) { msg = e.message; }
      ok(/de 1 a 6/.test(msg), `um time de ${errado.length} passou`);
    }
  });

  s.teste('os ocultos e a natureza: peso limitado e declarado (±5% cada)', () => {
    const base = montarLutador(pack, cria(6, 50), 'A', 0);
    const alto = montarLutador(pack, cria(6, 50, { iv: [31, 31, 31, 31, 31, 31] }), 'A', 0);
    const baixo = montarLutador(pack, cria(6, 50, { iv: [0, 0, 0, 0, 0, 0] }), 'A', 0);
    for (const k of ['atk', 'def', 'spa', 'spd', 'spe', 'maxHp']) {
      ok(alto[k] > baixo[k], `${k}: os ocultos não mexem`);
      /* O stat é inteiro (piso): o teto é ±5% do stat SEM oculto, arredondado para fora. */
      ok(alto[k] <= Math.ceil(base[k] * 1.05) && baixo[k] >= Math.floor(base[k] * 0.95), `${k}: o oculto passou do teto (${baixo[k]}, ${base[k]}, ${alto[k]})`);
    }
    const adamant = montarLutador(pack, cria(6, 50, { natureza: 'Adamant' }), 'A', 0);
    ok(adamant.atk > base.atk && adamant.atk <= Math.ceil(base.atk * 1.05), `a natureza no ataque: ${adamant.atk} × ${base.atk}`);
    ok(adamant.spa < base.spa && adamant.spa >= Math.floor(base.spa * 0.95), `a natureza no especial: ${adamant.spa} × ${base.spa}`);
    igual(adamant.def, base.def, 'a natureza mexeu no que ela não cita');
  });

  return s;
}
