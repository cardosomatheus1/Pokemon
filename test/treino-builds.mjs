/* Q1/Q4 · O SIMULADOR DE CONFRONTOS (ST-10.10 · Spec §8.14)
 *
 * A matriz de vitória entre builds, a espécie e o golpe dominantes, e a
 * dificuldade de cada rival por faixa — gravadas como fixture de medição e
 * REPRODUTÍVEIS PELA RAIZ: refazer pares sorteados dá o número gravado.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { confronto, dominantes, dificuldadePorFaixa } from '../engine/treino-builds.mjs';
import { RAIZ, NIVEL, SIMS, SIMS_RIVAL, NIVEIS, buildsDoElenco, referencia } from '../tools/simular-builds.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { rng } from '../engine/primitivas.mjs';
import { rivalDe } from '../app/modules/treino-dados.mjs';
import { VERSAO_TBE } from '../engine/treino-batalha.mjs';

const fx = JSON.parse(readFileSync(new URL('./fixtures/treino-builds.json', import.meta.url), 'utf8'));

export function suite() {
  const s = criarSuite('treino-builds');

  s.teste('a fixture: o elenco inteiro, a raiz e os parâmetros da ferramenta', () => {
    igual(fx.versaoMotor, VERSAO_TBE, 'a medição precisa corresponder ao motor atual');
    igual(JSON.stringify(fx.elenco), JSON.stringify(pack.elenco), 'o elenco mudou — regrave a medição');
    igual(`${fx.raiz}/${fx.nivel}/${fx.simsPorPar}`, `${RAIZ}/${NIVEL}/${SIMS}`, 'a fixture não é da ferramenta de hoje');
    const n = fx.elenco.length;
    ok(fx.taxa.length === n && fx.taxa.every((l, i) => l.length === n && l[i] === null), 'a matriz não é n×n com a diagonal vazia');
  });

  s.teste('reprodutível pela raiz: pares sorteados refeitos dão o número gravado', () => {
    const builds = buildsDoElenco(), R = rng(31);
    for (let k = 0; k < 12; k++) {
      const i = Math.floor(R() * builds.length);
      let j = Math.floor(R() * builds.length);
      if (j === i) j = (j + 1) % builds.length;
      const c = confronto(pack, builds[i], builds[j], { raiz: RAIZ, i, j, sims: SIMS });
      igual(Math.round(c.taxa * 1000) / 1000, fx.taxa[i][j], `o par ${fx.elenco[i]}×${fx.elenco[j]} não se refaz pela raiz`);
    }
  });

  s.teste('a dominante e as mais fracas saem da matriz gravada', () => {
    const d = dominantes(fx.elenco.map(dex => ({ dex })), { taxa: fx.taxa, dano: {} });
    igual(d.especies[0].dex, fx.dominantes.especies[0].dex, 'a espécie dominante não é a da matriz');
    igual(d.especies.at(-1).dex, fx.dominantes.ultimas.at(-1).dex, 'a mais fraca não é a da matriz');
    ok(fx.dominantes.golpes.length === 10 && fx.dominantes.golpes.every(g => g.fatia > 0 && g.fatia < 1), 'os golpes dominantes');
  });

  s.teste('a dificuldade por faixa: cada rival, cada nível, e o primeiro é vencível no começo', () => {
    igual(fx.dificuldade.map(d => d.id).join(), (pack.treinadores ?? []).map(t => t.id).join(), 'um rival sem medição');
    for (const d of fx.dificuldade) igual(d.chances.map(c => c.nivel).join(), NIVEIS.join(), `${d.id}: faixas`);
    ok(fx.dificuldade[0].chances[0].p >= 0.9, 'o treinador da Rota 1 não é vencível com o inicial no nível 5');
    /* E a dificuldade sai da mesma conta da chance exibida: refazer um ponto dá o gravado. */
    const t = pack.treinadores[2];
    const rival = { id: t.id, time: rivalDe(pack, t) };
    const p = dificuldadePorFaixa(pack, [rival], referencia, { raiz: RAIZ, sims: SIMS_RIVAL, niveis: [8] })[0].chances[0].p;
    igual(+p.toFixed(3), fx.dificuldade[2].chances[1].p, 'a dificuldade não se refaz pela raiz');
  });

  return s;
}
