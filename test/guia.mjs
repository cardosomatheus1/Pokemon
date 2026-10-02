/* Q1/Q3 · O GUIA: O QUE CADA COISA FAZ (ST-2.24)
 *
 * O dono, jogando como quem chega: "os nomes [das moedas] foi decisão nossa,
 * talvez só tenha que ficar mais claro o que cada uma faz; não vi direito a
 * parte dos [bichos], IVs etc., o mercado entre jogadores etc."
 *
 * Olhado antes (Q5): a página "Como funciona" explicava UMA coisa — a aposta
 * da Arena — e nada das Rotas, das moedas, da criatura, da Jornada, das Trocas
 * nem do Mercado; o Mercado abria num formulário de busca sem uma frase sobre
 * o que ele é; e "potencial" queria dizer duas coisas (68 de 100 nas Rotas, 6
 * de 10 no poder do Time).
 *
 * O conteúdo do guia mora em `guia-dados.mjs` (camada 0) e sai do pack: os
 * nomes das moedas e dos itens nunca são escritos à mão no módulo.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import { guiaDoJogo, SECOES, papelDaMoeda } from '../app/modules/guia-dados.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const VISTAS = ['viewArena', 'viewLiga', 'viewIdle', 'viewTreino', 'viewHome', 'viewRotaOff', 'viewPokedex', 'viewWiki', 'viewHow', 'viewRules'];

export function suite() {
  const s = criarSuite('guia');

  s.teste('o guia cobre o jogo inteiro, e não só a Arena', () => {
    const g = guiaDoJogo(PACK);
    igual(g.map(x => x.id).join(','), SECOES.join(','), 'as seções do guia');
    for (const id of ['moedas', 'rotas', 'criatura', 'jornada', 'trocas', 'mercado', 'arena'])
      ok(SECOES.includes(id), `o guia não tem a seção ${id}`);
    for (const x of g) {
      ok(x.titulo && x.resumo, `${x.id}: sem título ou resumo`);
      ok(x.itens.length >= 2, `${x.id}: menos de dois itens`);
      ok(x.ir.length >= 1 && x.ir.every(i => VISTAS.includes(i.view)), `${x.id}: "ir para" sem destino válido`);
    }
  });

  s.teste('as moedas: cada uma diz o que faz, pelo nome do pack', () => {
    const m = guiaDoJogo(PACK).find(x => x.id === 'moedas');
    const texto = JSON.stringify(m);
    ok(texto.includes(PACK.moeda.nome) && texto.includes(PACK.moedaPve.nome), 'o guia não nomeia as duas moedas do pack');
    /* com outro pack, outros nomes — nada escrito à mão */
    const o = JSON.stringify(guiaDoJogo(ORIGINAL).find(x => x.id === 'moedas'));
    ok(o.includes(ORIGINAL.moeda.nome) && o.includes(ORIGINAL.moedaPve.nome) && !o.includes(PACK.moeda.nome), 'o guia escreve o nome da moeda à mão');
    ok(/aposta/i.test(papelDaMoeda(PACK, 'arena')) && /Rotas|Loja|Jornada/.test(papelDaMoeda(PACK, 'pve')), 'o papel curto das moedas');
  });

  s.teste('a criatura: o potencial é explicado, e o potencial do poder também', () => {
    const c = JSON.stringify(guiaDoJogo(PACK).find(x => x.id === 'criatura'));
    ok(/0 a 100/.test(c) && /seis/.test(c), 'o potencial sem a escala ou sem os seis valores');
    ok(/natureza/i.test(c) && /forma/i.test(c) && /✦/.test(c), 'natureza, forma ou exemplar fora do guia');
    ok(/poder/i.test(c) && /0 a 10/.test(c), 'a parte do potencial no poder (0 a 10) não é explicada');
  });

  s.teste('a tela: o guia é pintado do módulo, e as telas apontam para ele', () => {
    const html = fonte('app/index.html');
    ok(/id="guiaCorpo"/.test(html), 'a página não tem onde pintar o guia');
    ok(/data-guia-secao="mercado"/.test(fonte('app/modules/mercado-jogadores-tela.mjs')), 'o Mercado não aponta para o guia');
    ok(/data-guia-secao="criatura"/.test(fonte('app/modules/idle-paineis.mjs')), 'o potencial do Centro não aponta para o guia');
    ok(/\(\$\{m\.potencial\}\/100\)/.test(fonte('app/modules/treino-tela.mjs')), 'o Time não mostra o potencial da criatura ao lado da parte do poder');
  });

  return s;
}
