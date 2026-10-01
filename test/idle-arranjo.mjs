/* Q1 · A TELA DO IDLE ORGANIZADA (ST-2.6 · pedido do dono: "tá feio, desorganizado").
 *
 * O que travar, cada um com o defeito que ele desfez:
 *
 *   a mochila na ordem do catálogo   pelo id, a "Pedra da Água" caía entre o
 *                                    "Lodo Negro" e o "Elo"
 *   a mochila em grade               fichas da largura do nome, linhas serrilhadas
 *   as colunas sem esticar           ~500 px de cartão vazio embaixo de "Em campo"
 *   o Centro na coluna da equipe     a coluna da equipe sobrava, a da bolsa transbordava
 *   o time em três colunas           cinco criaturas saíam 4 + 1
 *   o saque vazio some               uma faixa de cartão sem nada
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { bolsaEmLista, posicaoNaBolsa } from '../app/modules/idle-bolsa.mjs';

const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const semComentario = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const css = semComentario(html);

export function suite() {
  const s = criarSuite('idle-arranjo');

  s.teste('a mochila na ordem do catálogo: bolas primeiro, o estilhaço atrás do item, o desconhecido no fim', () => {
    const e = { bolsa: { agua: 1, poke: 2, blacksludge: 1, 'est:fogo': 3, fogo: 1, zzz: 1, ultra: 1, great: 0 } };
    igual(bolsaEmLista(e, PACK).map(i => i.id).join(), 'poke,ultra,fogo,est:fogo,agua,blacksludge,zzz', 'a ordem da mochila');
    igual(bolsaEmLista(e).map(i => i.id).join(), 'agua,blacksludge,est:fogo,fogo,poke,ultra,zzz', 'sem o pack, a ordem é o id');
    ok(posicaoNaBolsa(PACK)('poke') < posicaoNaBolsa(PACK)('mestra'), 'a Poké Ball depois da Master — as bolas do pack vêm primeiro');
    /* a tela pede a ordem DO PACK — sem ele a lista volta à ordem do id */
    const paineis = readFileSync(new URL('../app/modules/idle-paineis.mjs', import.meta.url), 'utf8');
    ok(/bolsaEmLista\(E, PACK\)/.test(paineis), 'a mochila na tela não pede a ordem do catálogo');
  });

  s.teste('a mochila é grade, e a ficha estica até a contagem na margem', () => {
    ok(/\.bolsaCoisas\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(190px,1fr\)\)\}/.test(css), 'a mochila voltou a ser fila de fichas da largura do nome');
    ok(/\.bolsaCoisas \.itQtd\{margin-left:auto/.test(css), 'a contagem não vai para a margem direita');
    ok(/#idleBolsa > \.bolsaCoisas,#idleBolsa > \.bolsaGasta\{flex:1 1 100%\}/.test(css), 'a grade da mochila encolhe à largura de uma ficha — o pai é flex');
  });

  s.teste('as colunas não esticam, e o Centro mora na coluna da equipe', () => {
    ok(/\.idleGrade\{display:grid;gap:14px;grid-template-columns:1fr;align-items:start\}/.test(css), 'as colunas voltaram a esticar: o cartão da equipe sobra vazio');
    const a = html.indexOf('class="idleColunaA"'), c = html.indexOf('id="idleCentro"'), b = html.indexOf('class="idleColunaB"');
    ok(a > 0 && a < c && c < b, `o Centro não está na coluna da equipe (A ${a}, Centro ${c}, B ${b})`);
  });

  s.teste('o time da Rota em três colunas; o saque vazio não aparece', () => {
    ok(/#idleEquipe\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/.test(css), 'o time voltou a quebrar 4 + 1');
    ok(/#idleSaque:empty\{display:none\}/.test(css), 'o saque vazio voltou a ser uma faixa de cartão sem nada');
  });

  return s;
}
