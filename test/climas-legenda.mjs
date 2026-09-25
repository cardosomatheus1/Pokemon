/* Q1 · A LEGENDA DOS CLIMAS (1.32b / ST-2.1, fecha a L-177).
 *
 * O que ela promete, e cada teste abaixo é uma das promessas:
 *   · todo clima do PACK aparece — clima novo entra sem tocar na tela;
 *   · a frase do elenco é a do MOTOR: clima que não troca rosto não diz que troca;
 *   · a frequência é faixa, e a Nevasca é a rara;
 *   · o sigilo: a legenda não recebe nada da run, então não tem como vazar o
 *     clima sorteado. */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { legendaDosClimas, fraseDoElenco, frequencia } from '../app/modules/climas-legenda.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

export function suite() {
  const s = criarSuite('climas-legenda');

  s.teste('todos os climas do pack aparecem, na ordem do pack', () => {
    const l = legendaDosClimas(kanto, { estagio: 1 });
    igual(l.map(x => x.key).join(), kanto.climaIdle.map(c => c.key).join(),
      'a legenda não é a tabela do pack: o jogador leria climas que não existem, ou não ' +
      'leria um que existe');
  });

  s.teste('clima novo no pack entra na legenda sem tocar em nada', () => {
    const pack = { ...kanto, climaIdle: [...kanto.climaIdle,
      { key: 'eclipse', w: 1, emoji: '🌑', name: 'Eclipse', tipos: ['dark'], rende: 'xp', desc: 'x' }] };
    ok(legendaDosClimas(pack).some(x => x.key === 'eclipse'),
      'a legenda tem lista própria — o dia em que o pack ganhar um clima, a tela mente');
  });

  s.teste('o Sol não promete mudar quem aparece — em nenhum estágio', () => {
    for (const estagio of [1, 2, 3, 4]) {
      const sol = legendaDosClimas(kanto, { estagio }).find(x => x.key === 'sol');
      igual(sol.rotasQueMudam, 0, `no estágio ${estagio} o Sol passou a trocar rosto — reveja a frase`);
      ok(/não muda/.test(fraseDoElenco(sol)),
        `a frase do Sol no estágio ${estagio} promete o que o motor não faz: "${fraseDoElenco(sol)}"`);
    }
  });

  s.teste('clima que troca rosto diz em quantas rotas, e o número é o do motor', () => {
    const l = legendaDosClimas(kanto, { estagio: 1 });
    const nevoa = l.find(x => x.key === 'nevoa');
    ok(nevoa.rotasQueMudam > 0, 'a Névoa não troca nada no estágio 1 — medido eram 6 de 11');
    igual(nevoa.rotas, kanto.biomas.length, 'o total de rotas não é o do pack');
    ok(fraseDoElenco(nevoa).includes(`${nevoa.rotasQueMudam} de ${nevoa.rotas}`),
      `a frase não traz o número: "${fraseDoElenco(nevoa)}"`);
  });

  s.teste('o estágio muda a resposta — a Nevasca só troca no estágio 3', () => {
    const em = e => legendaDosClimas(kanto, { estagio: e }).find(x => x.key === 'nevasca').rotasQueMudam;
    igual(em(1), 0, 'a Nevasca passou a trocar no estágio 1');
    ok(em(3) > 0, 'a Nevasca deixou de trocar no estágio 3 — a legenda deixou de ler o estágio?');
  });

  s.teste('o tempo firme não tem frase de elenco', () => {
    const neutro = legendaDosClimas(kanto).find(x => x.key === 'neutro');
    igual(fraseDoElenco(neutro), '', 'o clima sem tipo nenhum ganhou frase de elenco');
  });

  s.teste('frequência em faixa: a Nevasca é raríssima, o tempo firme o mais comum', () => {
    const l = legendaDosClimas(kanto);
    igual(l.find(x => x.key === 'nevasca').frequencia, 'raríssimo');
    igual(l.find(x => x.key === 'neutro').frequencia, 'o mais comum');
    igual(l.find(x => x.key === 'chuva').frequencia, 'comum');
    igual(frequencia(5, 100), 'raro', 'a faixa do meio sumiu');
  });

  s.teste('SIGILO: a legenda não conhece a run, então não vaza o clima sorteado', () => {
    const src = readFileSync(new URL('../app/modules/climas-legenda.mjs', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    ok(!/climaDaRun|avanco-clima|\.raiz\b|\brun\b/.test(src),
      'o módulo da legenda passou a ler a run — é o caminho por onde o clima oculto vaza (L-177)');
    ok(!/Math\.random|Date\.now/.test(src), 'a legenda passou a depender de sorteio ou relógio');
  });

  return s;
}
