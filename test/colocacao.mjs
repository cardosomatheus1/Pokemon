/* Q1/Q3 · COLOCAÇÃO — do 1º ao 12º, e sem duas contagens paralelas.
 *
 * O quadro de colocação é atualizado AO VIVO, conforme os lutadores caem, e a
 * tentação óbvia é manter um contador próprio. É assim que se cria uma segunda
 * fonte de verdade: o placar de abates conta um mundo, a colocação conta outro,
 * e a divergência só aparece na tela do jogador.
 *
 * O desenho é o mesmo do KillFeed: a ordem de quedas vem do MESMO gancho que
 * credita o abate, e no fim da rodada `ordemDeQuedas` recalcula tudo dos
 * eventos e compara. Este arquivo testa a parte recalculável, que é a única que
 * pode estar errada de forma silenciosa.
 *
 * O QUE OS TESTES AFIRMAM:
 *   1. a ordem sai dos eventos, e killstreak NÃO é abate
 *   2. ninguém aparece duas vezes
 *   3. as posições formam 1..n, sem buraco e sem repetição
 *   4. o campeão é sempre o 1º, inclusive no empate por tempestade (Regra 8)
 */
import { criarSuite, ok, igual, elencoDeterministico } from './harness.mjs';
import { colocacaoDe, ordemDeQuedas, rankingColocacao } from '../app/modules/colocacao.mjs';
import * as E from './motor.mjs';

const N = 12;
const time = () => elencoDeterministico(E.elenco, E.montarElenco, 31337, N);

export function suite() {
  const s = criarSuite('colocacao');

  s.teste('killstreak não é abate — o evento carrega atacante e não derruba ninguém', () => {
    const ev = [
      { ko: true, d: 3 },
      { streak: true, a: 5, ko: true, d: 7 },   // NÃO conta
      { ko: true, d: 5 },
    ];
    igual(ordemDeQuedas(ev).join(','), '3,5',
      'o evento de killstreak entrou na ordem de quedas');
  });

  s.teste('a tempestade derruba sem autor, e conta', () => {
    const ev = [{ storm: true, hits: [{ i: 2, ko: true }, { i: 4, ko: false }, { i: 9, ko: true }] }];
    igual(ordemDeQuedas(ev).join(','), '2,9', 'a queda por tempestade não entrou, ou entrou demais');
  });

  s.teste('ninguém cai duas vezes, mesmo com evento repetido', () => {
    const ev = [{ ko: true, d: 1 }, { ko: true, d: 1 }, { storm: true, hits: [{ i: 1, ko: true }] }];
    igual(ordemDeQuedas(ev).join(','), '1', 'a mesma vítima entrou mais de uma vez');
  });

  s.teste('o primeiro a cair é o último colocado', () => {
    const ordem = [7, 2, 9];
    igual(colocacaoDe(7, ordem, 12), 12, 'o primeiro a cair não ficou em último');
    igual(colocacaoDe(2, ordem, 12), 11, 'o segundo a cair errou a posição');
    igual(colocacaoDe(9, ordem, 12), 10, 'o terceiro a cair errou a posição');
    igual(colocacaoDe(0, ordem, 12), null, 'quem não caiu recebeu posição fechada');
  });

  /* Enquanto a rodada corre, as vagas de cima são uma PRÉVIA entre os vivos.
     O que não pode, em momento nenhum, é a lista pular ou repetir posição. */
  s.teste('as posições formam 1..n, sem buraco e sem repetição, em qualquer estado', () => {
    for (let caidos = 0; caidos <= N; caidos++) {
      const ordem = Array.from({ length: caidos }, (_, k) => (k * 5 + 3) % N)
        .filter((v, i, a) => a.indexOf(v) === i);
      const vidaDe = i => ((i * 7) % 11) / 10;
      const r = rankingColocacao(N, ordem, vidaDe);
      igual(r.length, N, `ranking com ${r.length} linhas para ${N} lutadores`);
      const pos = r.map(x => x.pos).sort((a, b) => a - b);
      igual(pos.join(','), Array.from({ length: N }, (_, k) => k + 1).join(','),
        `posições fora de 1..${N} com ${ordem.length} caídos`);
      igual(new Set(r.map(x => x.i)).size, N, 'lutador repetido no ranking');
    }
  });

  s.teste('vivo vem antes de caído, e entre vivos a ordem é por vida', () => {
    const ordem = [0, 1];
    const vida = { 2: 0.2, 3: 0.9, 4: 0.5 };
    const r = rankingColocacao(5, ordem, i => vida[i] ?? 0);
    igual(r.filter(x => x.vivo).map(x => x.i).join(','), '3,4,2',
      'os vivos não estão em ordem de vida restante');
    ok(r.findIndex(x => !x.vivo) > r.findLastIndex(x => x.vivo),
      'um caído apareceu antes de um vivo');
  });

  /* --- CONTRA BATALHAS DE VERDADE ---------------------------------------
     Os casos acima são construídos à mão e cobrem a aritmética. Este cobre a
     forma dos eventos que o motor realmente produz — que é onde a suposição
     erra. */
  s.teste('em 200 batalhas reais a colocação cobre todos, e o campeão é o 1º', () => {
    const f = time();
    for (let k = 0; k < 200; k++) {
      const b = E.simular(f, 700000 + k, true);
      const ordem = ordemDeQuedas(b.events);

      igual(new Set(ordem).size, ordem.length, `ordem com repetição na seed ${k}`);
      ok(ordem.every(i => i >= 0 && i < N), `índice fora da pool na seed ${k}`);

      /* REGRA 8, o empate por tempestade: quando ela derruba todos no mesmo
         instante, o campeão também consta entre os caídos — foi declarado
         vencedor pelo desempate por vida. Ele sai da lista e assume o topo,
         senão nenhuma linha ficaria em 1º. */
      const semCampeao = ordem.filter(i => i !== b.winner);
      const r = rankingColocacao(N, semCampeao, () => 1);
      igual(r[0].i, b.winner,
        `o campeão da seed ${k} não ficou em 1º (${r[0].i} ficou)`);
      const pos = r.map(x => x.pos).sort((a, b2) => a - b2);
      igual(pos.join(','), Array.from({ length: N }, (_, i) => i + 1).join(','),
        `posições fora de 1..${N} na seed ${k}`);
    }
  });

  /* UMA IMPLEMENTAÇÃO SÓ. `fases.mjs` calculava a posição final por conta
     própria, percorrendo os eventos de novo. Duas travessias do mesmo dado é
     como as duas contagens divergem — e a que estiver errada será a que ninguém
     olha. O teste afirma que `fases.mjs` usa esta, e não a sua. */
  s.teste('fases.mjs não tem travessia própria de eventos para colocação', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../app/modules/fases.mjs', import.meta.url), 'utf8');
    ok(/from '\.\/colocacao\.mjs'/.test(src),
      'fases.mjs não importa colocacao.mjs — a posição final voltou a ser calculada por lá');
    ok(!/ordem\.push\(/.test(src),
      'fases.mjs voltou a montar a própria ordem de quedas');
  });

  return s;
}
