/* Q1/Q3 · O TEAM BUILDER E O POKÉMON BUILD (ST-10.7 · F4.2 · Spec §8.3, §12 telas 20–21)
 *
 * O painel é a EQUIPE do idle (um time só); o power de cada membro é o da
 * ST-10.4 e a ficha é a da Trainer Engine; o rival luta com o padrão do
 * moveset; tirar, pôr e trocar respeitam o teto de seis e a equipe nunca
 * vazia, numa gravação só; e trocar um membro MOVE o número.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { painelDoTime, rivalDe, treinador, treinadoresDo, entradasDoTime, candidatosDaCaixa } from '../app/modules/treino-dados.mjs';
import { moverLocal, trocarLocal } from '../app/modules/time-local.mjs';
import { VAZIO, salvar, carregar } from '../app/modules/idle-dados.mjs';
import { padraoDoMoveset } from '../app/modules/moveset-dados.mjs';
import { powerDe } from '../engine/time.mjs';
import { chanceDeVencer } from '../engine/treino-preco.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const T = Date.UTC(2026, 8, 1, 15);
const cria = (id, dex, nivel, naCaixa = false) => ({ id, dex, nivel, xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 0, foco: null, iv: [20, 20, 20, 20, 20, 20],
                                                     natureza: 'Bold', origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa });
const deposito = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const estadoCom = criaturas => { const e = VAZIO(); e.criaturas = criaturas; return e; };

export function suite() {
  const s = criarSuite('treino-tela');

  s.teste('o painel: a equipe do idle, com power e ficha; a caixa ordenada por power', () => {
    igual(painelDoTime({ pack, estado: VAZIO() }).vazio, true, 'o jogador sem criatura não é "vazio"');
    const e = estadoCom([cria('a', 6, 30), cria('b', 25, 20), cria('c', 1, 10, true), cria('d', 9, 36, true)]);
    const p = painelDoTime({ pack, estado: e });
    igual(p.membros.map(m => m.id).join(), 'a,b', 'o time não é a equipe');
    igual(p.caixa.map(m => m.id).join(), 'd,c', 'a caixa não está por power');
    igual(p.vagas, 4, 'vagas');
    igual(p.membros[0].power.total, powerDe(pack, e.criaturas[0], padraoDoMoveset(pack, 6, 30)).total, 'outro power');
    igual(p.total, p.membros.reduce((a, m) => a + m.power.total, 0), 'o total');
    ok(p.membros[0].ficha.vel > 0 && p.membros[0].golpes.length > 0 && p.membros[0].tipos[0].nome === 'Fogo', `o cartão: ${JSON.stringify(p.membros[0])}`);
  });

  s.teste('o rival: os treinadores do pack, com o padrão do moveset no nível dele', () => {
    ok(treinadoresDo(pack).length >= 3, 'poucos rivais');
    igual(treinador(pack, 'nao-existe')?.id, treinadoresDo(pack)[0].id, 'um id perdido deixou a tela sem rival');
    const r = rivalDe(pack, treinador(pack, 'rota1'));
    igual(JSON.stringify(r[0].golpes), JSON.stringify(padraoDoMoveset(pack, r[0].dex, r[0].nivel)), 'o rival tem golpe que o jogador não teria');
  });

  s.teste('tirar, pôr e trocar: teto de seis, nunca vazio, numa gravação só', () => {
    const d = deposito();
    salvar(estadoCom([cria('a', 6, 30), cria('c', 1, 10, true)]), d);
    igual(moverLocal({ id: 'a', paraCaixa: true }, d).ok, false, 'esvaziou o time');
    ok(trocarLocal({ sai: 'a', entra: 'c' }, d).ok, 'a troca num time de um não passou');
    igual(carregar(d).criaturas.filter(c => !c.naCaixa).map(c => c.id).join(), 'c', 'a troca não trocou');
    const cheio = deposito();
    salvar(estadoCom([...[1, 4, 7, 25, 133, 143].map((dx, i) => cria(`m${i}`, dx, 20)), cria('x', 6, 40, true)]), cheio);
    igual(moverLocal({ id: 'x', paraCaixa: false }, cheio).ok, false, 'o sétimo entrou');
    ok(trocarLocal({ sai: 'm0', entra: 'x' }, cheio).ok, 'a troca com o time cheio não passou');
    const depois = carregar(cheio).criaturas.filter(c => !c.naCaixa).map(c => c.id);
    ok(depois.length === 6 && depois.includes('x') && !depois.includes('m0'), `a troca: ${depois}`);
    /* Uma troca inválida não grava nada pela metade. */
    const antes = JSON.stringify(carregar(cheio).criaturas);
    igual(trocarLocal({ sai: 'm1', entra: 'nao-existe' }, cheio).ok, false, 'trocou por quem não existe');
    igual(JSON.stringify(carregar(cheio).criaturas), antes, 'a troca inválida gravou metade');
  });

  s.teste('trocar um membro move o número', () => {
    const e = estadoCom([cria('a', 16, 12), cria('b', 10, 12), cria('c', 6, 30, true)]);
    const rival = rivalDe(pack, treinador(pack, 'pedra'));
    const antes = chanceDeVencer(pack, entradasDoTime(pack, e), rival, { raiz: 1, sims: 400 }).p;
    e.criaturas[0].naCaixa = true; e.criaturas[2].naCaixa = false;
    const depois = chanceDeVencer(pack, entradasDoTime(pack, e), rival, { raiz: 1, sims: 400 }).p;
    ok(depois !== antes, `o número não mexeu: ${antes} → ${depois}`);
    igual(candidatosDaCaixa(pack, estadoCom([cria('a', 6, 30), cria('c', 1, 10, true)])).map(c => c.id).join(), 'c', 'candidatos');
  });

  s.teste('a tela: fatiada, cancelável, com a raiz fixa, e carregada', () => {
    const tela = semComentario(fonte('../app/modules/treino-tela.mjs'));
    ok(/const g = \+\+geracao;/.test(tela) && (tela.match(/if \(g !== geracao\) return;/g) ?? []).length === 2,
      'o cálculo de uma geração velha pinta na tela');
    ok(/lote\(PACK, A, rival, RAIZ, acum\.sims,/.test(tela) && /lotePareado\(PACK, vars, rival, RAIZ, feitos,/.test(tela),
      'a chance e as trocas não saem das mesmas lutas');
    ok(/setTimeout\(passo, 0\)/.test(tela), 'o cálculo não é fatiado');
    ok(/textoDaMargem\(r\)/.test(tela) && /textoDaTrocaFeita\(escolhida, nomeNaTela\)/.test(tela) && !/\.replace\(\//.test(tela), 'a tela remenda o texto da chance');
    ok(!/toFixed|Math\.round/.test(tela), 'a tela arredonda por conta própria');
    const html = fonte('../app/index.html');
    ok(/<button class="nav" data-view="viewTreino">Time(?: \/ Arena)?<\/button>/.test(html) && /<div id="viewTreino" class="view">/.test(html)
       && /import '\.\/modules\/treino-tela\.mjs';/.test(html), 'a vista não existe ou não é carregada');
  });

  return s;
}
