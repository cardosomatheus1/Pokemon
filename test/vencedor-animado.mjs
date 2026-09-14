/* Q1/Q2 · O CAMPEÃO COMEMORA ANIMADO (R13)
 *
 * ── O PEDIDO ───────────────────────────────────────────────────────────────
 *
 * "O Pokémon que aparece central na tela precisa ser um gif animado, de
 *  preferência divergente do do banner. Toda vez que um Pokémon ganhar, a
 *  animação dele em gif central na tela e no banner precisa ser estilo de
 *  Vitória, e não imagem estática."
 *
 * ── O QUE A INVESTIGAÇÃO ACHOU, E MUDA O TAMANHO DO BLOCO ─────────────────
 *
 * O GIF animado JÁ ESTÁ NA CÓPIA LOCAL. A primeira linha do baixador é
 * `lista.push({ url: pack.sprite(esp) })`, e `pack.sprite` devolve o
 * `gen5ani/<slug>.gif` do Showdown — o sprite de batalha ANIMADO, para as 76
 * espécies. Ele é baixado desde sempre e usado nos retratos da lista.
 *
 * O que o fim de rodada desenhava era `dexImg`, cuja cadeia inteira é PNG
 * estático. Não faltava arte: faltava apontar para a que já existe.
 *
 * É a terceira vez que este padrão aparece — `D-028` (classes sem CSS), R7
 * (CSS sem elemento), e agora arte baixada e não usada. Todas passam por suíte
 * verde, porque em nenhuma alguma coisa QUEBRA.
 *
 * ── E O SHINY PRECISOU DE ENDEREÇO NOVO ───────────────────────────────────
 *
 * O `shiny-dados.mjs` chama o cosmético de "o retrato ANIMADO" desde que
 * nasceu, e o que ele entregava era um PNG shiny. Para o banner do dono de
 * skin continuar shiny E passar a ser animado, faltava o `gen5ani-shiny`.
 *
 * O endereço é do PACK, e não deste lado: o `original_v1` desenha com arte
 * local (`arte/original/<slug>.png`), e derivar o shiny por troca de texto
 * produziria um caminho que não existe lá. É a mesma razão pela qual `sprite`
 * já é do pack.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { criarMotor } from '../engine/engine.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';
import { originalV1 } from '../content/original_v1.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const RESULTADO = ler('../app/modules/resultado-tela.mjs');
const BANNER    = ler('../app/modules/banner.mjs');
const SPRITES   = ler('../app/modules/sprites.mjs');
const BAIXADOR  = ler('../tools/baixar-assets.mjs');

export function suite() {
  const s = criarSuite('vencedor-animado');

  /* --- o contrato do pack ------------------------------------------------ */

  /* Os DOIS packs, e é o teste que importa: um contrato que só um cumpre é um
     contrato que quebra no dia em que o outro entrar. */
  s.teste('todo pack sabe dizer o endereço do retrato shiny', () => {
    for (const [nome, p] of [['kanto', kanto], ['original', originalV1]]) {
      ok(typeof p.spriteShiny === 'function',
        `o pack ${nome} não declara \`spriteShiny\` — o endereço da arte é do pack`);
      const esp = p.especies[0];
      const u = p.spriteShiny(esp);
      ok(typeof u === 'string' && u.length > 0,
        `o pack ${nome} devolveu endereço vazio para ${esp.n}`);
    }
  });

  /* O pack sem arte shiny devolve a NORMAL, e não um endereço inventado. Um
     caminho que não existe é pior que a arte normal: o primeiro some da tela,
     o segundo só não é shiny. */
  s.teste('pack sem arte shiny cai na normal, e nunca num caminho inexistente', () => {
    const esp = originalV1.especies[0];
    igual(originalV1.spriteShiny(esp), originalV1.sprite(esp),
      'o pack original inventou um endereço shiny que a arte dele não tem');
  });

  s.teste('o shiny do kanto é o MESMO desenho noutra pasta, não outra arte', () => {
    const esp = kanto.especies[0];
    const normal = kanto.sprite(esp), shiny = kanto.spriteShiny(esp);
    ok(shiny !== normal, 'o shiny do kanto devolveu o endereço normal');
    /* A regra do resgate, no lugar onde ela custou uma versão ao projeto: o
       shiny é a mesma família num subcaminho. Se virar outro repositório ou
       outro estilo, é OUTRA COISA — e outra coisa não é resgate. */
    ok(shiny.replace('-shiny', '') === normal,
      `o shiny saiu de outra fonte de arte:\n  normal ${normal}\n  shiny  ${shiny}`);
  });

  s.teste('a fachada do motor expõe o endereço shiny', () => {
    const M = criarMotor(kanto);
    ok(typeof M.spriteShiny === 'function',
      'o motor não expõe `spriteShiny` — quem desenha não alcança o endereço');
  });

  /* --- e o baixador cobre o que o pack pede ------------------------------ */

  /* A regra do F0.12: o jogo abre com a rede desligada porque tudo o que ele
     pede está na cópia local. Arte nova pedida e não baixada é o jogador
     offline vendo um retângulo vazio — e o dono de skin shiny é justamente
     quem mais olha o próprio retrato. */
  s.teste('o baixador busca o retrato shiny animado', () => {
    ok(/spriteShiny/.test(BAIXADOR),
      'o baixador não conhece o retrato shiny — quem equipar a skin fica sem arte offline');
  });

  /* --- o campeão é desenhado animado ------------------------------------- */

  s.teste('o retrato do campeão não sai mais pela cadeia de PNG estático', () => {
    ok(!/imgTag\(f\)/.test(RESULTADO),
      'um retrato do campeão ainda sai por `imgTag`');
    ok(!/dexImg\(f\.dex/.test(RESULTADO),
      'o campeão voltou para `dexImg`, cuja cadeia inteira é PNG estático');
    ok(/retratoAnimado\(/.test(RESULTADO),
      'a tela de resultado não usa o retrato animado');
  });

  s.teste('o banner do vencedor também é animado', () => {
    ok(/retratoAnimado\(/.test(BANNER),
      'o banner continua desenhando o lutador com retrato estático');
  });

  /* O helper existe e resolve local ANTES de sair para a rede — é a cascata
     que o F0.12 construiu, e passar por fora dela é reabrir o egresso. */
  s.teste('o retrato animado tenta a cópia local primeiro', () => {
    const fn = SPRITES.match(/function retratoAnimado\([\s\S]*?\n\}/);
    ok(fn, 'a `retratoAnimado` não existe no sprites.mjs');
    ok(/candidatos\(/.test(fn[0]),
      'o retrato animado não passa pela cascata local → origem → espelho');
  });

  /* A CASCATA SOZINHA NÃO PROVA NADA, e o portão Q2 mostrou isso: o defeito
     plantado `S349` troca a ORIGEM do endereço por `DEX_MIRRORS` — a cadeia de
     PNG estático — e deixa o `candidatos()` no lugar. A asserção acima passava
     com o campeão de volta à imagem parada.
     O que importa é DE ONDE vem o endereço: do pack, que é quem sabe qual é a
     arte animada deste tema. */
  s.teste('o endereço do retrato animado vem do pack', () => {
    const fn = SPRITES.match(/function retratoAnimado\([\s\S]*?\n\}/);
    ok(/enderecoSprite\(|enderecoShiny\(/.test(fn[0]),
      'o retrato animado deixou de usar o endereço que o pack declara — ' +
      'ele voltou para a cadeia estática do dex');
    ok(!/DEX_MIRRORS\[0\]\(especie\.dex, shiny\);/.test(fn[0]),
      'o endereço principal do retrato animado virou um PNG do dex');
  });

  return s;
}
