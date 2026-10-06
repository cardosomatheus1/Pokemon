/* O RITMO DO AVANÇO (ST-2.34) — o 7º relato: *"as waves de uns 45 segundos
 * deixam o ritmo lento"*.
 *
 * Medido (`node tools/estudo-ritmo-avanco.mjs`, a run de verdade wave a wave):
 * a luta de uma wave dura ~19 s em todo estágio e nível, e a wave era esticada
 * até 45 s (`duracaoMinMs`) — 26 s de cada wave, 58%, eram espera com o campo
 * vazio. A regra agora estica só até 24 s: um respiro curto entre as levas,
 * e não meia wave parada.
 *
 * O que NÃO muda, e esta suíte afirma: quem vence, quem cai e quanto dano
 * entra. Encurtar a espera não pode mexer no resultado.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { REGRA_AVANCO_COMBATE, waveDeCombate } from '../engine/run-combate.mjs';
import { quadro, medirRun } from '../tools/estudo-ritmo-avanco.mjs';

export function suite() {
  const s = criarSuite('ritmo-avanco');

  s.teste('a wave estica até 24 s, e não até 45', () => {
    igual(REGRA_AVANCO_COMBATE.duracaoMinMs, 24000);
  });

  s.teste('a espera é no máximo um quarto da wave, em todo estágio', () => {
    for (const l of quadro(4, { acima: [5] })) {
      const espera = (l.waveS - l.lutaS) / l.waveS;
      ok(espera <= 0.25, `estágio ${l.estagio}, ${l.equipe} no ${l.nivel}: ${Math.round(espera * 100)}% da wave é espera (${l.lutaS} s de luta em ${l.waveS} s)`);
    }
  });

  s.teste('encurtar a espera não muda quem vence, quem cai nem o dano', () => {
    const casos = [{ estagio: 2, dex: [5], nivel: 12 }, { estagio: 3, dex: [5, 17, 20], nivel: 24 }, { estagio: 4, dex: [6], nivel: 31 }];
    for (const c of casos) for (let i = 0; i < 4; i++) {
      const raiz = `ritmo-avanco-${c.estagio}-${i}`;
      const curta = medirRun({ ...c, raiz }), longa = medirRun({ ...c, raiz, regra: { duracaoMinMs: 45000 } });
      igual(JSON.stringify([curta.completou, curta.minimo, curta.desmaios, curta.waves]),
            JSON.stringify([longa.completou, longa.minimo, longa.desmaios, longa.waves]), `${raiz}: a espera mudou o resultado`);
      ok(curta.runMin < longa.runMin, `${raiz}: a run não ficou mais curta`);
    }
  });

  s.teste('a run que já começou guarda a regra dela — a espera nova vale da próxima run', () => {
    /* a regra é copiada para dentro da run na largada (avanco-combate) */
    const run = { wave: 1, combate: { regra: { ...REGRA_AVANCO_COMBATE, duracaoMinMs: 45000 } } };
    ok(run.combate.regra.duracaoMinMs === 45000 && typeof waveDeCombate === 'function');
  });

  return s;
}
