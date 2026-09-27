/* Q1/Q3 · A BATALHA PvE NA TELA E O RESULTADO (ST-10.9 · Spec §8.9, §12 telas 23–24, §28.7)
 *
 * Tudo o que a tela encena vem dos eventos da Trainer Engine, por um caminho
 * só: a vida é a cheia menos o dano, na ordem; cai quem o evento derruba; e o
 * vencedor bate com quem ficou de pé. O resultado é o fato medido — a chance
 * de antes e o que aconteceu. A tela não conta dano, e o estouro do golpe é a
 * folha da Arena pelo mesmo `fxSheet`.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { linhaDoTempo, fraseDoEvento, fraseDoResultado, PASSO_MS } from '../app/modules/pve-dados.mjs';
import { rivalDe, treinador } from '../app/modules/treino-dados.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const time = l => l.map(([dex, nivel]) => ({ dex, nivel, golpes: padraoDoMoveset(pack, dex, nivel) }));

export function suite() {
  const s = criarSuite('pve');

  s.teste('a linha do tempo sai dos eventos: vida, quedas e vencedor batem', () => {
    const A = time([[4, 8], [16, 7]]), B = rivalDe(pack, treinador(pack, 'rota1'));
    for (let k = 1; k <= 40; k++) {
      const r = simular(pack, A, B, k);
      const L = linhaDoTempo(pack, A, B, r);
      igual(L.passos.length, r.eventos.length, 'um passo por evento');
      const vida = Object.fromEntries([...L.lados.A, ...L.lados.B].map(f => [f.slot, f.maxHp]));
      for (const p of L.passos) {
        vida[p.para] = Math.max(0, vida[p.para] - p.dano);
        igual(p.vidaDoAlvo, vida[p.para], `semente ${k}: a vida do passo ${p.n}`);
        igual(p.caiu, p.vidaDoAlvo === 0 && !L.passos.slice(0, p.n).some(q => q.para === p.para && q.caiu), `semente ${k}: a queda do passo ${p.n}`);
        igual(p.t, p.n * PASSO_MS, 'o tempo');
      }
      const deBPe = L.lados.B.some(f => L.vidaFinal[f.slot] > 0), deAPe = L.lados.A.some(f => L.vidaFinal[f.slot] > 0);
      igual(r.vencedor, deAPe && !deBPe ? 'A' : deBPe && !deAPe ? 'B' : null, `semente ${k}: o vencedor não bate com quem ficou de pé`);
    }
  });

  s.teste('a frase de cada golpe', () => {
    const nome = x => ({ A0: 'Charmander', B0: 'Rattata' })[x];
    igual(fraseDoEvento({ de: 'A0', para: 'B0', golpe: 'Ember', dano: 12, eff: 2, crit: true, errou: false, caiu: true }, nome),
      'Charmander usou Ember — crítico, super-efetivo! (−12) · Rattata caiu', 'super-efetivo e crítico');
    igual(fraseDoEvento({ de: 'A0', para: 'B0', golpe: 'Ember', dano: 5, eff: 0.5, crit: false, errou: false, caiu: false }, nome),
      'Charmander usou Ember — pouco efetivo! (−5)', 'pouco efetivo');
    igual(fraseDoEvento({ de: 'A0', para: 'B0', golpe: 'Lick', dano: 0, eff: 0, errou: false }, nome), 'Charmander usou Lick — não afeta Rattata', 'imune');
    igual(fraseDoEvento({ de: 'A0', para: 'B0', golpe: 'Ember', dano: 0, eff: 2, errou: true }, nome), 'Charmander usou Ember — errou', 'errou');
  });

  s.teste('o resultado é o fato medido: a chance de antes e o que aconteceu', () => {
    const antes = { p: 0.23, erro: 0.018, sims: 2000 };
    igual(JSON.stringify(fraseDoResultado({ vencedor: 'A', turnos: 5 }, antes)),
      JSON.stringify({ titulo: 'Você venceu', texto: 'A chance antes da luta era 23% (±2).' }), 'venceu');
    igual(fraseDoResultado({ vencedor: 'B', turnos: 5 }, antes).texto,
      'A chance antes da luta era 23% (±2): em 77 de cada 100 lutas assim, o rival vence.', 'perdeu');
    igual(fraseDoResultado({ vencedor: null, turnos: 100 }, antes).titulo, 'Empate', 'empate');
    igual(fraseDoResultado({ vencedor: 'A', turnos: 3 }, { p: 1, erro: 0, sims: 2000 }).texto, 'O seu time tinha vencido todas as 2.000 lutas simuladas.', 'unânime sem ±1');
  });

  s.teste('a tela: só a linha do tempo, o estouro da Arena, semente nova, e a luta só com a chance pronta', () => {
    const tela = semComentario(fonte('../app/modules/pve-tela.mjs'));
    ok(/linhaDoTempo\(PACK, A, B, r, nomeExibido\)/.test(tela), 'a tela não usa a linha do tempo');
    ok(!/\.dano\s*[-+*]|-\s*passo\.dano|maxHp\s*-/.test(tela), 'a tela conta dano por conta própria');
    ok(/import \{ fxSheet \} from '\.\/efeitos\.mjs';/.test(tela) && /folhaDoImpacto\(golpe\)/.test(tela), 'o estouro não é a folha da Arena');
    ok(/crypto\.getRandomValues\(new Uint32Array\(1\)\)\[0\]/.test(tela), 'a luta não tem semente nova');
    ok(/fraseDoResultado\(r, antes\)/.test(tela), 'o resultado não é o da camada 0');
    const tb = fonte('../app/modules/treino-tela.mjs');
    ok(/data-pve-lutar data-adv="\$\{t\.id\}" disabled>/.test(tb) && /lb\.disabled = false/.test(tb), 'a luta acende antes da chance');
    ok(/import '\.\/modules\/pve-tela\.mjs';/.test(fonte('../app/index.html')), 'o módulo não é carregado');
    igual(treinador(pack, null).id, 'rota1', 'o primeiro adversário não é o treinador da Rota 1');
  });

  return s;
}
