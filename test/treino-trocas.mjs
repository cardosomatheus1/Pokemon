/* Q1/Q3/Q4 · O EFEITO DE CADA TROCA (ST-10.6 · F4.3 · Spec §8.1.1)
 *
 * Números aleatórios comuns: o time atual e cada troca enfrentam as mesmas
 * sementes, e o time atual dá EXATAMENTE a chance exibida (ST-10.5). Só
 * aparece a troca cujo ganho passa o erro pareado, e as três melhores. E o
 * aceite da ficha: em combates independentes (outras sementes), a melhor
 * troca exibida é de fato melhor em pelo menos 95% dos cenários.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { variantes, lotePareado, trocasDoAcumulado, melhoresTrocas, textoDaTroca, K_CANDIDATOS } from '../engine/treino-trocas.mjs';
import { lote } from '../engine/treino-preco.mjs';
import { rng } from '../engine/primitivas.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const ent = (dex, nivel) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) });
const m = (id, dex, nivel, power = nivel * 10) => ({ id, power, entrada: ent(dex, nivel) });
const TIME = [m('a', 6, 30), m('b', 17, 28), m('c', 25, 30)];
const CAIXA = [m('d', 9, 30), m('e', 3, 31), m('f', 143, 30), m('g', 19, 10)];
const RIVAL = [ent(65, 30), ent(94, 30), ent(68, 29)];

export function suite() {
  const s = criarSuite('treino-trocas');

  s.teste('as variantes: o time atual e cada vaga × os K de maior power, sem quem já está no time', () => {
    const v = variantes(TIME, [...CAIXA, TIME[0]]);
    igual(v.length, 1 + TIME.length * K_CANDIDATOS, 'variantes');
    ok(v[0].vaga === null && v.slice(1).every(x => x.entra !== 'g'), 'o candidato de menor power entrou, ou o atual não é o primeiro');
    ok(v.slice(1).every(x => x.entra !== 'a'), 'quem já está no time entrou como candidato');
    igual(v.filter(x => x.vaga === 1).map(x => x.entra).join(), 'e,d,f', 'os K pela ordem de power');
  });

  s.teste('números comuns: o time atual dá a MESMA chance exibida, e o fatiado é igual ao inteiro', () => {
    const vars = variantes(TIME, CAIXA);
    const a = lotePareado(pack, vars, RIVAL, 8, 0, 400);
    igual(a.vitorias[0], lote(pack, vars[0].time, RIVAL, 8, 0, 400).vitorias, 'o time atual não enfrenta as sementes da chance exibida');
    const f = lotePareado(pack, vars, RIVAL, 8, 0, 200);
    lotePareado(pack, vars, RIVAL, 8, 200, 200, f);
    igual(JSON.stringify(f), JSON.stringify(a), 'o fatiado deu outro número');
    /* A prova do pareamento: trocar por um GÊMEO dá diferença zero em TODA luta. */
    const gemeo = variantes([TIME[0]], [{ id: 'gemeo', power: 999, entrada: TIME[0].entrada }]);
    /* Contra o espelho, a sorte decide (meio a meio) — é aí que semente diferente apareceria. */
    const g = lotePareado(pack, gemeo, [TIME[0].entrada], 8, 0, 300);
    ok(g.vitorias[0] > 60 && g.vitorias[0] < 240, `o espelho não é decidido pela sorte: ${g.vitorias[0]} de 300`);
    ok(g.somaD2[1] === 0 && g.vitorias[1] === g.vitorias[0], `o gêmeo não enfrentou a mesma sorte: ${g.somaD2[1]}`);
  });

  s.teste('só aparece o que supera o erro, e no máximo três', () => {
    const vars = [{}, { vaga: 0, sai: 'a', entra: 'x' }, { vaga: 1, sai: 'b', entra: 'y' }, { vaga: 2, sai: 'c', entra: 'z' },
                  { vaga: 0, sai: 'a', entra: 'w' }, { vaga: 1, sai: 'b', entra: 'v' }, { vaga: 2, sai: 'c', entra: 'u' }];
    /* 100 lutas pareadas. x: +10 (sempre as mesmas); y: +1 −1 (ruído); z: −10;
       v: +6; w: +5; u: +4 — os quatro últimos acima do erro, e só três cabem. */
    const acum = { sims: 100, vitorias: [50, 60, 50, 40, 55, 56, 54], somaD: [0, 10, 0, -10, 5, 6, 4], somaD2: [0, 10, 2, 10, 5, 6, 4] };
    const t = trocasDoAcumulado(vars, acum);
    igual(t.map(x => x.entra).join(), 'x,v,w', 'a ordem, o filtro ou o teto de três');
    ok(t.every(x => x.delta > x.erro), 'mostrou troca dentro do erro');
    igual(trocasDoAcumulado(vars, { ...acum, somaD: [0, 0, 1, -1, 0, 0, 3], somaD2: [0, 40, 1, 1, 0, 0, 3] }).length, 0, 'mostrou ruído');
  });

  s.teste('a melhor troca exibida é melhor em combates independentes — em ≥ 95% dos cenários', () => {
    const R = rng(4242);
    const um = id => m(id, pack.elenco[Math.floor(R() * pack.elenco.length)], 20 + Math.floor(R() * 21));
    let mostradas = 0, acertos = 0, combates = 0;
    for (let k = 0; k < 40; k++) {
      const time = [um('a'), um('b'), um('c')], caixa = [um('d'), um('e'), um('f'), um('g')];
      const rival = [um('r1'), um('r2'), um('r3')].map(x => x.entrada);
      const [melhor] = melhoresTrocas(pack, time, caixa, rival, { raiz: 100 + k, sims: 400 });
      if (!melhor) continue;
      mostradas++;
      /* Independente: outra raiz, outras sementes — só o time atual contra o trocado. */
      const vars = variantes(time, caixa).filter(v => v.vaga === null || (v.vaga === melhor.vaga && v.entra === melhor.entra));
      const a = lotePareado(pack, vars, rival, 900000 + k, 0, 500);
      combates += 2 * a.sims;
      if (a.vitorias[1] > a.vitorias[0]) acertos++;
    }
    ok(mostradas >= 20, `poucos cenários com troca exibida: ${mostradas} de 40`);
    ok(acertos / mostradas >= 0.95, `a melhor troca exibida acertou ${acertos} de ${mostradas}`);
    ok(combates >= 20000, `combates independentes: ${combates}`);
  });

  s.teste('a frase', () => {
    igual(textoDaTroca({ sai: 'a', entra: 'e', p: 0.615, antes: 0.225 }, id => ({ a: 'Pidgeotto', e: 'Squirtle' })[id]),
      'se trocar Pidgeotto por Squirtle: 62% (era 22%)', 'a frase');
  });

  return s;
}
