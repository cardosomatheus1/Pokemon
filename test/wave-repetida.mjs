/* Q1/Q3 · A WAVE REPETIDA NÃO CANSA (ST-2.27b · L-242)
 *
 * O 5º relato do dono: "waves de 30 a 60 segundos com o mesmo chefe se
 * repetindo cansam". Medido antes de mexer: cada tentativa JÁ tem semente
 * própria, e o chefe já é sorteado de novo — mas a Floresta tem dois, então
 * ele repete em metade das tentativas. E a duração da wave não decide nada:
 * ela só dá o ritmo da encenação, de uma semente irmã.
 *
 * Então: (1) a tentativa repetida é mais curta — o jogador já viu a luta;
 * (2) no chefe, a tentativa seguinte traz o OUTRO, quando o estágio tem mais
 * de um; (3) a tela diz "tentativa N". Nada disso mexe na chance nem no
 * resultado: a mesma quantidade de sorteios, na mesma ordem.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { composicaoDaWave, resolverWave, WAVES, RITMO_DA_REPETIDA } from '../engine/wave.mjs';
import { novaRun, waveAtual } from '../engine/run-avanco.mjs';
import { elencoDoEstagio } from '../engine/elenco-estagio.mjs';
import { paraOMotor } from '../app/modules/avanco-conta.mjs';

const T0 = Date.UTC(2026, 9, 5, 15);
const ELENCO = elencoDoEstagio(PACK, 'floresta', 1);
const EQ = [paraOMotor(PACK, { id: 'a', dex: 1, nivel: 9 })];
const runNa = (raiz, wave, tentativa) => ({ ...novaRun({ bioma: 'floresta', estagio: 1, equipe: ['a'], raiz, agora: T0 }), wave, tentativa });
const rng = x => () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };

export function suite() {
  const s = criarSuite('wave-repetida');

  s.teste('no chefe, a tentativa seguinte traz o OUTRO chefe (a Floresta tem dois)', () => {
    ok((ELENCO.chefes ?? []).length >= 2, 'a Floresta deixou de ter dois chefes — o teste perdeu o que medir');
    for (let i = 0; i < 60; i++) {
      const chefes = [0, 1, 2, 3].map(t => waveAtual(runNa(`chefe-${i}`, WAVES, t), { elenco: ELENCO, equipe: EQ }).comp[0].dex);
      for (let t = 1; t < chefes.length; t++)
        ok(chefes[t] !== chefes[t - 1], `raiz ${i}: o mesmo chefe nas tentativas ${t} e ${t + 1} (${chefes.join(',')})`);
    }
  });

  s.teste('trocar o chefe não mexe na sorte: a mesma chance e o mesmo resultado, sorteio por sorteio', () => {
    for (let i = 1; i <= 200; i++) {
      const base = resolverWave(rng(i), { elenco: ELENCO, wave: WAVES, estagio: 1, hp: 100, equipe: EQ });
      const outro = resolverWave(rng(i), { elenco: ELENCO, wave: WAVES, estagio: 1, hp: 100, equipe: EQ, evitar: base.comp[0].dex });
      igual(`${outro.p}|${outro.venceu}|${outro.dano}`, `${base.p}|${base.venceu}|${base.dano}`, `semente ${i}: evitar o chefe mudou a luta`);
      ok(outro.comp[0].dex !== base.comp[0].dex, `semente ${i}: o "evitar" não evitou`);
    }
    /* sem chefe para trocar (um só), nada muda */
    const um = { ...ELENCO, chefes: ELENCO.chefes.slice(0, 1) };
    igual(composicaoDaWave(rng(7), { elenco: um, wave: WAVES, evitar: um.chefes[0].dex })[0].dex, um.chefes[0].dex, 'com um chefe só, o "evitar" inventou outro');
  });

  s.teste('a tentativa repetida é mais curta — o jogador já viu a luta', () => {
    ok(RITMO_DA_REPETIDA > 0.4 && RITMO_DA_REPETIDA <= 0.75, `o ritmo da repetida fora da faixa (${RITMO_DA_REPETIDA})`);
    let primeira = 0, repetida = 0;
    for (let i = 0; i < 40; i++) {
      primeira += waveAtual(runNa(`dur-${i}`, 3, 0), { elenco: ELENCO, equipe: EQ }).roteiro.duracao;
      repetida += waveAtual(runNa(`dur-${i}`, 3, 1), { elenco: ELENCO, equipe: EQ }).roteiro.duracao;
    }
    ok(repetida <= primeira * 0.8, `a repetida durou ${(repetida / primeira * 100).toFixed(0)}% da primeira`);
  });

  s.teste('a tela diz "tentativa N" quando a wave se repete', () => {
    const t = readFileSync(new URL('../app/modules/avanco-tela.mjs', import.meta.url), 'utf8');
    ok(/tentativa \$\{run\.tentativa \+ 1\}/.test(t), 'o título da wave não diz a tentativa');
  });

  return s;
}
