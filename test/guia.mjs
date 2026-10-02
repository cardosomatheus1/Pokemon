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

  s.teste('ST-2.25 · o "ir para" chega ao destino: a Loja abre, o Centro aparece', () => {
    const g = guiaDoJogo(PACK);
    const ir = g.flatMap(x => x.ir);
    const loja = ir.find(i => /Loja/.test(i.rotulo)), centro = ir.find(i => /Centro/.test(i.rotulo));
    igual(loja?.clica, '[data-loja-abrir]', 'o "ir para a Loja" só abre as Rotas');
    igual(centro?.rola, '#idleCentro', 'o "ir para o Centro" só abre as Rotas');
    const tela = fonte('app/modules/guia-tela.mjs');
    ok(/data-guia-clica/.test(tela) && /data-guia-rola/.test(tela), 'a tela não leva o destino no botão');
    const html = fonte('app/index.html');
    ok(/data-loja-abrir/.test(html) && /id="idleCentro"/.test(html), 'os destinos não existem na página');
  });

  /* DEC-26 (o dono, 02/10): "nomes inglês/português é normal pra jogos, não
     precisa mudar". O guia usa os MESMOS termos da tela — a Arena diz "odds",
     a run diz "wave" — e explica o que eles fazem. */
  s.teste('DEC-26 · o guia fala a língua da tela: odds, run, wave, stamina — explicados', () => {
    const g = guiaDoJogo(PACK), t = JSON.stringify(g);
    ok(/\bodds?\b/.test(t) && !/cotação/.test(t), 'o guia chama de "cotação" o que a Arena chama de odd');
    const rotas = g.find(x => x.id === 'rotas');
    ok(rotas.itens.some(i => i.termo === 'A run' && /dez waves/i.test(i.texto)), 'a run não é explicada');
    ok(rotas.itens.some(i => i.termo === 'A stamina' && /energia/.test(i.texto)), 'a stamina não é explicada');
    ok(!/Lutam três \(ou tantos quantos o treinador trouxer\), os mais fortes/.test(t), 'a frase truncada de quem luta');
  });

  s.teste('ST-2.25 · os textos que se liam colados', () => {
    ok(/m\.tipos\.map\(chip\)\.join\(' '\)/.test(fonte('app/modules/treino-tela.mjs')), 'os tipos do Time se leem "PlantaVenenoso"');
    const html = fonte('app/index.html');
    const titulo = (html.split('<h3>A equipe que vai')[1] ?? '').split('</h3>')[0];
    ok(titulo && !/data-modo-cartao/.test(titulo), 'o botão da ficha ainda mora dentro do título');
    const tituloOff = (html.split('<h3>Equipe <span class="tiny">até três')[1] ?? '').split('</h3>')[0];
    ok(tituloOff && !/data-modo-cartao/.test(tituloOff), 'na Rota OFF, o botão da ficha ainda mora dentro do título');
    ok(/nome, e-mail, senha e data de nascimento/.test(html), 'o Início esquece a data de nascimento');
    ok(/id="depPapel"/.test(html), 'o "Comprar" do topo não diz para que serve a moeda');
  });

  s.teste('D-147 · nenhum botão dentro do cartão da criatura (o navegador partia o cartão em dois)', () => {
    const p = fonte('app/modules/idle-paineis.mjs');
    const cartao = p.slice(p.indexOf('<button class="idleGuardado"'), p.indexOf('</button>`;', p.indexOf('<button class="idleGuardado"')));
    ok(cartao && !/<button/.test(cartao.slice(1)), 'há um botão dentro do cartão-botão');
    ok(/#idleEncontros:empty/.test(fonte('app/index.html')), 'o quadro "quem apareceu" vazio aparece como um cartão vazio');
  });

  return s;
}
