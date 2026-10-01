/* Q1/Q3/Q4 · A PROBABILIDADE EXIBIDA (ST-10.5 · F4.3 · Spec §8.1.1)
 *
 * "seu time vence 23% (±2)": calibrada por faixa contra a frequência observada
 * (fixture de 20.000 confrontos, e um lote curto a cada execução); o mesmo
 * motor e os mesmos parâmetros do combate; o lote declarado é o rodado; o
 * fatiado dá o mesmo que o inteiro; e o arredondamento é neutro.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { lote, resumo, chanceDeVencer, arredondarNeutro, textoDaChance, textoDaMargem, maiorFraqueza, SIMS_TREINO } from '../engine/treino-preco.mjs';
import { medirCalibracao, foraDaTolerancia } from '../engine/treino-calibracao.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { derivarIndice } from '../engine/seed.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const cria = (dex, nivel, golpes = padraoDoMoveset(pack, dex, nivel)) => ({ dex, nivel, golpes });
const A = [cria(6, 32), cria(25, 30), cria(18, 31)], B = [cria(9, 32), cria(3, 30), cria(65, 31)];

export function suite() {
  const s = criarSuite('treino-preco');

  s.teste('calibrada por faixa: a fixture de 20.000 confrontos', () => {
    const fx = JSON.parse(fonte('./fixtures/treino-calibracao.json'));
    igual(fx.faixas.reduce((a, f) => a + f.n, 0), 20000, 'a fixture não tem 20.000 confrontos');
    igual(fx.faixas.length, 10, 'faixas');
    igual(JSON.stringify(foraDaTolerancia(fx.faixas)), '[]', 'uma faixa arquivada não bate com a observada');
  });

  s.teste('calibrada AGORA: um lote curto do código de hoje', () => {
    const faixas = medirCalibracao(pack, { semente: 777, n: 1200, sims: 100, golpesDe: (d, n) => padraoDoMoveset(pack, d, n) });
    const fora = foraDaTolerancia(faixas);
    igual(JSON.stringify(fora), '[]', 'a chance exibida deixou de bater com a luta');
  });

  s.teste('os mesmos parâmetros do combate: contar à mão dá o mesmo', () => {
    let v = 0;
    for (let i = 0; i < 300; i++) if (simular(pack, A, B, derivarIndice(9, 'treino', i), { registrar: false }).vencedor === 'A') v++;
    igual(lote(pack, A, B, 9, 0, 300).vitorias, v, 'o lote não é o combate');
    const src = semComentario(fonte('../engine/treino-preco.mjs'));
    ok(/import \{ simular \} from '\.\/treino-batalha\.mjs';/.test(src) && !/\bdano\(/.test(src), 'a chance tem um combate próprio');
  });

  s.teste('o lote declarado é o rodado, e o fatiado é igual ao inteiro', () => {
    const r = chanceDeVencer(pack, A, B, { raiz: 3 });
    igual(r.sims, SIMS_TREINO, 'rodou outro número de simulações');
    const inteiro = lote(pack, A, B, 3, 0, 2000);
    const fatiado = { vitorias: 0, empates: 0, sims: 0 };
    for (let k = 0; k < 4; k++) lote(pack, A, B, 3, k * 500, 500, fatiado);
    igual(JSON.stringify(fatiado), JSON.stringify(inteiro), 'o fatiado deu outra chance');
    igual(r.p, inteiro.vitorias / 2000, 'a chance');
    /* O erro é o das simulações rodadas. */
    const meio = resumo({ vitorias: 250, empates: 0, sims: 500 });
    ok(Math.abs(meio.erro - 1.96 * Math.sqrt(0.25 / 500)) < 1e-12, `o erro: ${meio.erro}`);
    /* Empate não é vitória — nem no resumo, nem no lote. Imunes dos dois lados
       empatavam sempre; desde a ST-2.16 eles apelam para o último recurso, e
       o empate do teste é o do TETO DE TURNOS: dois iguais, com vida de chefe
       (`vidaX`), que só se arranham com ele. */
    igual(resumo({ vitorias: 1, empates: 3, sims: 4 }).p, 0.25, 'empate contou como vitória');
    const tanque = () => ({ ...cria(143, 40, ['Lick']), vidaX: 10 });
    const empata = lote(pack, [tanque()], [tanque()], 1, 0, 20);
    igual(`${empata.vitorias}/${empata.empates}`, '0/20', 'o lote contou empate como vitória');
  });

  s.teste('o arredondamento é neutro: meio ponto vai para o par', () => {
    igual([23.5, 22.5, 22.4, 22.6, 0.5, 99.5].map(arredondarNeutro).join(), '24,22,22,23,0,100', 'arredondou a favor de alguém');
    igual(textoDaChance({ p: 0.225, erro: 0.021 }), 'seu time vence 22% (±2)', 'a frase');
    igual(textoDaChance({ p: 0.235, erro: 0.004 }), 'seu time vence 24% (±1)', 'o erro nunca some da frase');
    /* Sob o número (Q7 da 10.7): lote unânime não tem "±1", e ponto no singular. */
    igual(textoDaMargem({ p: 1, erro: 0, sims: 2000 }), 'venceu todas as 2.000 lutas simuladas', 'unânime');
    igual(textoDaMargem({ p: 0, erro: 0, sims: 2000 }), 'perdeu todas as 2.000 lutas simuladas', 'unânime ao contrário');
    igual(textoDaMargem({ p: 0.5, erro: 0.0219, sims: 2000 }), 'de 2.000 lutas simuladas · margem de ±2 pontos', 'plural');
    igual(textoDaMargem({ p: 0.99, erro: 0.004, sims: 2000 }), 'de 2.000 lutas simuladas · margem de ±1 ponto', 'singular');
  });

  s.teste('a maior fraqueza, pela tabela de tipos', () => {
    const soNormal = [cria(143, 30, ['Body Slam']), cria(20, 30, ['Quick Attack'])];
    const pedra = [cria(76, 30), cria(139, 30), cria(141, 30)].filter(c => pack.especies.some(e => e.dex === c.dex));
    ok(pedra.length, 'o teste precisa de criaturas de pedra no pack');
    igual(maiorFraqueza(pack, soNormal, pedra)?.texto, 'nenhum golpe seu é super-efetivo contra Pedra', 'a fraqueza de golpe');
    const fogo = [cria(6, 30, ['Flamethrower', 'Thunder Fang']), cria(59, 30), cria(136, 30)], agua = [cria(9, 30, ['Surf'])];
    ok(/3 de 3 dos seus levam dano dobrado de Água/.test(maiorFraqueza(pack, fogo, agua)?.texto ?? ''), `a fraqueza de time: ${JSON.stringify(maiorFraqueza(pack, fogo, agua))}`);
  });

  return s;
}
