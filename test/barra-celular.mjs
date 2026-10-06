/* Q1/Q3 · O JOGO NO CELULAR: A BARRA DE ABAS NO RODAPÉ E A CENA DE LONGE
 *
 * O dono abriu o piloto no telefone e disse "tá feião". Medido em 412 × 915:
 * o menu de dez abas quebrava em três linhas e o topo comia ~200 px de toda
 * aba; a cena das Rotas, em 3×, era um close que cortava a cabeça do treinador
 * ("essa imagem da floresta tá muito perto").
 *
 *   a BARRA    quatro abas que se jogam + "Mais"; a folha guarda as outras seis
 *   o "MAIS"   veste o nome da aba aberta quando ela mora na folha
 *   o LARGO    nada muda: folha `display:contents`, Início de volta à frente
 *   a CENA     no celular, sem escolha guardada, o zoom de partida é 1×
 *   SEM CONTA  o menu é a vitrine; as abas do treinador abrem o cadastro
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { ABAS_DA_BARRA, ABAS_DO_MAIS, ABAS_COM_CONTA, abaLiberada, estadoDoMais, folhaDepois } from '../app/modules/barra-celular.mjs';
import { zoomDePartida, LARGURA_DO_CELULAR } from '../app/modules/viewport.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

export function suite() {
  const s = criarSuite('barra-celular');
  const PAG = fonte('../app/index.html');
  const css = PAG.slice(PAG.indexOf('A BARRA DE ABAS DO CELULAR'), PAG.lastIndexOf('</style>'));
  const celular = css.slice(css.indexOf('@media (max-width:640px)'));

  s.teste('motor: dez abas, cada uma num lugar só — quatro na barra, seis no "Mais"', () => {
    const botoes = [...PAG.matchAll(/<button class="nav[^"]*" data-view="(\w+)"/g)].map(m => m[1]);
    igual(botoes.length, 10, 'o menu não tem as dez abas');
    igual([...ABAS_DA_BARRA, ...ABAS_DO_MAIS].sort().join(), [...botoes].sort().join(), 'barra + folha não são o menu');
    igual(ABAS_DA_BARRA.join(), 'viewArena,viewLiga,viewIdle,viewTreino', 'a barra não é a do que se joga');
  });

  s.teste('motor: o "Mais" veste o nome da aba aberta, e só quando ela mora na folha', () => {
    const nomes = { viewPokedex: 'Pokédex', viewArena: 'Arenas', viewHow: 'Como funciona' };
    igual(JSON.stringify(estadoDoMais('viewPokedex', nomes)), '{"on":true,"rotulo":"Pokédex"}', 'o Mais não acendeu na Pokédex');
    igual(JSON.stringify(estadoDoMais('viewHow', nomes)), '{"on":true,"rotulo":"Como funciona"}', 'o Mais não vestiu o nome');
    igual(JSON.stringify(estadoDoMais('viewArena', nomes)), '{"on":false,"rotulo":"Mais"}', 'o Mais acendeu numa aba da barra');
    igual(estadoDoMais('viewRules').rotulo, 'Mais', 'sem nome, o rótulo sumiu');
    igual(estadoDoMais(undefined).on, false, 'sem vista, acendeu');
  });

  s.teste('motor: a folha só abre no toque do "Mais", e fecha em todo o resto', () => {
    igual(folhaDepois({ aberta: false, evento: 'alternar' }), true, 'o Mais não abriu a folha');
    igual(folhaDepois({ aberta: true, evento: 'alternar' }), false, 'o Mais não fechou a folha');
    igual(folhaDepois({ aberta: true, evento: 'navegou' }), false, 'navegar deixou a folha aberta');
    igual(folhaDepois({ aberta: true, evento: 'fora' }), false, 'tocar fora deixou a folha aberta');
  });

  s.teste('motor: a cena abre em 1× no celular e em 3× no largo', () => {
    igual(zoomDePartida(350), 1, 'o celular abre de perto');
    igual(zoomDePartida(LARGURA_DO_CELULAR - 1), 1, 'a borda do celular abre de perto');
    igual(zoomDePartida(LARGURA_DO_CELULAR), 3, 'o largo perdeu o 3× aprovado');
    igual(zoomDePartida(1209), 3, 'o panorâmico perdeu o 3×');
    igual(zoomDePartida(0), 3, 'palco sem medida virou celular');
    ok(LARGURA_DO_CELULAR < 640, 'a 700 px da linha de base visual a cena mudaria');
  });

  s.teste('a tela: a escolha do jogador vence o padrão, e o padrão sai da largura', () => {
    const m = fonte('../app/modules/idle-mundo.mjs');
    ok(/if \(!zoomEscolhido\) zoom = zoomDePartida\(cx\);/.test(m), 'o palco não usa o zoom de partida');
    ok(/if \(z > 0 && Number\.isFinite\(z\)\) \{ zoom = z; zoomEscolhido = true; \}/.test(m), 'o zoom guardado não conta como escolha');
    ok(/zoom = novo; zoomEscolhido = true;/.test(m), 'clicar no zoom não conta como escolha');
  });

  s.teste('a tela: a marcação — barra, botão "Mais" e a folha com as seis', () => {
    const nav = PAG.slice(PAG.indexOf('<nav class="mainnav" id="mainnav">'), PAG.indexOf('</nav>'));
    const folha = nav.slice(nav.indexOf('<div class="navFolha" id="navFolha">'));
    ok(/<button class="navMais" id="navMais" type="button" aria-expanded="false" aria-controls="navFolha">Mais<\/button>/.test(nav), 'o botão Mais sumiu');
    igual([...folha.matchAll(/data-view="(\w+)"/g)].map(m => m[1]).join(), ABAS_DO_MAIS.join(), 'a folha não tem as seis');
    ok(/<div class="brand" data-goto="viewHome">/.test(PAG), 'a marca não leva ao Início');
    const nv = fonte('../app/modules/navegacao.mjs');
    ok(/pintarMais\(id\);/.test(nv) && /folha\('navegou'\)/.test(nv), 'navegar não repinta o Mais nem fecha a folha');
    ok(/mais\.textContent = e\.rotulo;/.test(nv) && /mais\.classList\.toggle\('on', e\.on\)/.test(nv), 'o Mais não pinta o estado');
  });

  s.teste('a tela: no largo a barra continua a mesma, no celular desce para o rodapé', () => {
    ok(/\.navMais\{display:none\}/.test(css) && /\.navFolha\{display:contents\}/.test(css), 'o largo ganhou o Mais ou perdeu a folha');
    ok(/\.mainnav \.nav\[data-view="viewHome"\]\{order:-1\}/.test(css), 'o Início saiu da frente no largo');
    ok(/\.mainnav\{position:fixed;left:0;right:0;bottom:0;/.test(celular), 'a barra não desceu');
    ok(/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/.test(celular), 'a barra não tem cinco lugares');
    ok(/\.topbar\{[^}]*backdrop-filter:none\}/.test(celular), 'a topbar com filtro prende a barra fixa dentro dela');
    /* D-171 (ST-2.37): a folga só cai no fim da PÁGINA se o body crescer com o conteúdo */
    ok(/body\{padding:10px 10px calc\(84px \+ env\(safe-area-inset-bottom\)\);height:auto;min-height:100%\}/.test(celular), 'o fim da página fica atrás da barra');
    ok(/\.mainnav\.mais \.navFolha\{display:grid/.test(celular), 'a folha não abre');
    ok(/\.conexao-faixa\{bottom:calc\(84px/.test(celular), 'a faixa de conexão fica atrás da barra');
    ok(/#idleBiomas,#offBiomas\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/.test(celular), 'as rotas não enchem a largura');
    /* o bloco tem de vir DEPOIS das regras que ele sobrescreve */
    ok(PAG.indexOf('A BARRA DE ABAS DO CELULAR') > PAG.indexOf('.conexao-faixa{\n  position:fixed'), 'a faixa do celular perde para a do largo');
    ok(PAG.indexOf('A BARRA DE ABAS DO CELULAR') > PAG.indexOf('#idleBiomas,#offBiomas{display:flex'), 'a grade das rotas no celular perde para a do largo');
    ok(PAG.indexOf('A BARRA DE ABAS DO CELULAR') > PAG.indexOf('.idleChip{display:inline-flex'), 'o cartão de rota no celular perde para o do largo');
  });


  s.teste('motor: sem conta, só a vitrine — as abas do treinador pedem cadastro', () => {
    igual([...ABAS_COM_CONTA].sort().join(), 'viewIdle,viewLiga,viewPokedex,viewRotaOff,viewTreino,viewWiki', 'as abas do treinador mudaram');
    for (const v of ['viewHome', 'viewArena', 'viewHow', 'viewRules']) {
      ok(abaLiberada(v, false), `${v} trancada para o visitante`);
    }
    for (const v of ABAS_COM_CONTA) {
      ok(!abaLiberada(v, false), `${v} aberta sem conta`);
      ok(abaLiberada(v, true), `${v} trancada COM conta`);
    }
  });

  s.teste('a tela: a porta trancada abre o cadastro, e o menu do visitante é curto', () => {
    const nv = fonte('../app/modules/navegacao.mjs');
    ok(/if \(!abaLiberada\(id, sessaoAtiva\(\)\)\) \{ folha\('fora'\); abrirAuth\('signup'\); return; \}/.test(nv), 'a aba trancada não abre o cadastro');
    ok(/\$\('#mainnav'\)\?\.classList\.toggle\('visitante', !sessaoAtiva\(\)\);/.test(nv), 'o menu não sabe se há conta');
    const regra = css.match(/((?:\.mainnav\.visitante \.nav\[data-view="\w+"\],?\s*)+)\{display:none\}/);
    ok(regra, 'o menu do visitante não esconde nada');
    igual([...regra[1].matchAll(/data-view="(\w+)"/g)].map(m => m[1]).sort().join(), [...ABAS_COM_CONTA].sort().join(), 'o CSS esconde abas diferentes das do treinador');
    ok(/\.mainnav\.visitante\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/.test(celular), 'a barra do visitante não tem as quatro');
    ok(/\.mainnav\.visitante \.navMais\{display:none\}/.test(celular) && /\.mainnav\.visitante \.navFolha\{display:contents\}/.test(celular), 'no celular o visitante não vê a vitrine na barra');
  });

  return s;
}
