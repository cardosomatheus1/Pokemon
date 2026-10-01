/* Q1/Q3 · A PRIMEIRA TELA DE QUEM ACABOU DE CHEGAR (ST-2.19b)
 *
 * Um jogador, no primeiro teste: "a primeira tela pós-cadastro confunde — caí
 * na Arena, com uma rodada em andamento e um painel de aposta, antes de ter
 * qualquer Pokémon. Faria mais sentido ir direto pra escolha do inicial e pra
 * primeira rota."
 *
 * A regra mora em `conta-real.mjs` (camada 0, `abaDeAbertura`): com sessão e
 * sem criatura — ou logo depois do cadastro —, o jogo abre nas Rotas, onde a
 * escolha do inicial é a primeira coisa da tela. O resto não muda.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abaDeAbertura, MARCA_DO_CADASTRO } from '../app/modules/conta-real.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('primeira-aba');

  s.teste('quem acabou de chegar abre nas Rotas, na escolha do inicial', () => {
    igual(abaDeAbertura({ sessao: true, recemCriado: true, temCriatura: false }), 'viewIdle', 'o recém-cadastrado');
    igual(abaDeAbertura({ sessao: true, recemCriado: false, temCriatura: false }), 'viewIdle', 'a sessão sem criatura');
    igual(abaDeAbertura({ sessao: true, recemCriado: true, temCriatura: true }), 'viewIdle', 'o cadastro abre nas Rotas mesmo com coleção local');
  });

  s.teste('o resto continua: o visitante na Início, o veterano na Arena ou no retorno', () => {
    igual(abaDeAbertura({ sessao: false, temCriatura: false }), 'viewHome', 'o visitante');
    igual(abaDeAbertura({ sessao: true, temCriatura: true, retorno: false }), 'viewArena', 'o veterano');
    igual(abaDeAbertura({ sessao: true, temCriatura: true, retorno: true }), 'viewHome', 'o veterano com novidade');
  });

  s.teste('o boot e o cadastro usam a regra, e a marca do cadastro vale uma vez', () => {
    const html = fonte('../app/index.html');
    ok(/goView\(abaDeAbertura\(\{/.test(html), 'o boot não usa abaDeAbertura');
    ok(new RegExp(`removeItem\\(MARCA_DO_CADASTRO\\)`).test(html), 'a marca do cadastro não é apagada depois de usada');
    const nav = fonte('../app/modules/navegacao.mjs');
    ok(/if \(authMode === 'signup'\) try \{ localStorage\.setItem\(MARCA_DO_CADASTRO, '1'\)[^\n]*\n\s*location\.reload\(\)/.test(nav),
      'o cadastro com conta não deixa a marca antes de recarregar');
    ok(!/renderSession\(\);\s*goView\('viewArena'\);/.test(nav), 'o cadastro sem servidor ainda abre na Arena');
    igual(MARCA_DO_CADASTRO, 'ar_recemCriado', 'a chave da marca');
  });

  return s;
}
