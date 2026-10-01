/* Q1/Q3 · O FIM DA RUN DIZ O QUE FICOU (ST-2.22c, D-146)
 *
 * O relato do dono: "a run falhou e perdi tudo: XP, capturas e histórico" — e
 * "o saldo ficou 550 moedas maior do que deveria depois da falha".
 *
 * Medido: o servidor guardava TUDO (XP, moeda, encontros, a linha do
 * histórico "caiu na wave 8"). O que falhava era a tela: com o relógio do
 * aparelho um fio à frente, ela via a queda antes do servidor, pedia a
 * colheita, ouvia "a run ainda está acontecendo", engolia o erro e parava o
 * laço — a tela de escolha voltava como estava ANTES da run (XP 0, nenhum
 * encontro), e nada pedia de novo. Quando outra coisa repintava, o saque
 * entrava calado: XP e moeda pulavam sem explicação.
 *
 *   a colheita recusada tenta de novo, com espera crescente
 *   o fim da run diz o que ficou e o que se perdeu
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { esperaDaColheita, ESPERA_DA_COLHEITA_MS, ESPERA_MAX_MS, fraseDoFim } from '../app/modules/run-fim.mjs';

const run = (motivo, extra = {}) => ({ wave: 8, fim: { motivo }, encontros: 4,
  rendeu: { xp: 67, moedas: 355, bau: motivo === 'limpou', subiram: [] }, ...extra });

export function suite() {
  const s = criarSuite('run-fim');

  s.teste('a colheita recusada tenta de novo, com espera crescente e teto', () => {
    igual(esperaDaColheita(0), ESPERA_DA_COLHEITA_MS, 'a primeira espera');
    igual(esperaDaColheita(1), ESPERA_DA_COLHEITA_MS * 2, 'a espera não cresce');
    igual(esperaDaColheita(30), ESPERA_MAX_MS, 'a espera não tem teto');
    ok(ESPERA_MAX_MS <= 30_000, 'o teto deixa a tela parada por mais de 30 s');
    const tela = readFileSync(new URL('../app/modules/avanco-tela.mjs', import.meta.url), 'utf8');
    ok(/\.catch\(\(\) => \{[^}]*setTimeout\(\(\) => recarregarAba\?\.\(\), esperaDaColheita\(tentativas\+\+\)\)/.test(tela),
      'a colheita recusada não tenta de novo — a tela fica com o retrato de antes da run');
  });

  s.teste('a queda diz que ficou com o farm, e que só o baú se perdeu', () => {
    const f = fraseDoFim(run('hp'), { moeda: 'Créditos' });
    ok(/caiu na wave 8 de 10/.test(f), `a frase não diz onde caiu: ${f}`);
    ok(/\+67 XP/.test(f) && /\+355 Créditos/.test(f) && /4 encontros/.test(f), `a frase não diz o que ficou: ${f}`);
    ok(/baú/.test(f) && /ficou para trás/.test(f), `a frase não diz o que se perdeu: ${f}`);
  });

  s.teste('o recuo e a limpeza têm frase própria; zero não vira "+0"', () => {
    ok(/recuou na wave 8/.test(fraseDoFim(run('recuou'), { moeda: 'Créditos' })), 'o recuo');
    const l = fraseDoFim(run('limpou', { wave: 10 }), { moeda: 'Créditos' });
    ok(/limpo/i.test(l) && /baú/.test(l) && !/ficou para trás/.test(l), `a limpeza: ${l}`);
    const vazio = fraseDoFim({ wave: 1, fim: { motivo: 'hp' }, encontros: 0, rendeu: { xp: 0, moedas: 0 } }, { moeda: 'Créditos' });
    ok(!/\+0/.test(vazio) && /nada/.test(vazio), `a run sem ganho: ${vazio}`);
    igual(fraseDoFim(null), null, 'sem run, sem frase');
    igual(fraseDoFim({ wave: 3, fim: null }), null, 'run em curso não tem fim');
  });

  s.teste('quem subiu de nível aparece', () => {
    const f = fraseDoFim(run('hp', { rendeu: { xp: 67, moedas: 355, subiram: [{ id: 'a', para: 5 }] } }), { moeda: 'Créditos', nomeDe: () => 'Bulba' });
    ok(/Bulba subiu para o nível 5/.test(f), `a subida não aparece: ${f}`);
  });

  s.teste('a tela pinta a frase do fim acima do quadro "quem apareceu"', () => {
    const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
    ok(/id="idleFimRun"/.test(html), 'não há lugar para a frase do fim');
    const t = readFileSync(new URL('../app/modules/idle-tela.mjs', import.meta.url), 'utf8');
    ok(/pintarFimDaRun\(E, saqueDaUltimaRun\(\)\)/.test(t), 'a aba não pinta a frase do fim');
    const p = readFileSync(new URL('../app/modules/idle-paineis.mjs', import.meta.url), 'utf8');
    ok(/fraseDoFim\(run, \{/.test(p), 'o painel não usa a frase do fim');
  });

  return s;
}
