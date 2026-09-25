/* O NOME DE CADA ITEM — bloco 1.22.
 *
 * Esta suíte existe porque a resolução do nome passou três blocos SEM UMA, e o
 * preço apareceu duas vezes na mesma semana:
 *
 *     Pokédex     a seta de evolução escrevia `firestone`
 *     idle-tela   chamou `nomeDoItemPack(id)`, um nome inventado, e derrubou a
 *                 aba de Rotas inteira do dono — o D-074
 *
 * Enquanto a função morava dentro de `pintarBolsa` (camada 4, cercada de DOM),
 * nenhum teste de Node conseguia falar sobre ela. Os dois defeitos são o mesmo
 * fato chegando por portas diferentes:
 *
 *   > **Quando a função certa não tem endereço público, o segundo chamador
 *   > inventa um.** Um inventou o silêncio; o outro inventou o nome.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { nomeDoItem, nomesDe } from '../app/modules/itens-nome.mjs';
import kanto from '../content/pokemon_kanto_v1.mjs';

export function suite() {
  const s = criarSuite('itens-nome');

  s.teste('o nome sai do catálogo, e não o id', () => {
    /* Uma aresta de evolução por ITEM, tirada do próprio pack — e não um id
       escrito à mão aqui. Comparar um resultado com a constante que o produziu
       não prova nada, e um id fixo no teste envelheceria com o pack. */
    const porItem = (kanto.evolucoes ?? []).find(a => a.exige?.item);
    ok(porItem, 'o pack não tem nenhuma evolução por item — o teste perdeu o assunto');
    const id = porItem.exige.item;
    const nome = nomeDoItem(kanto, id);
    ok(nome && nome !== id,
      `o item "${id}" saiu como o próprio id. Id na tela não é um nome ` +
      'faltando: é um nome ERRADO, porque quem lê acha que aquilo é o nome.');
  });

  s.teste('a moeda e o material têm nome, e não caem no id', () => {
    for (const [oQue, id] of [['moeda', kanto.moedaPve?.id], ['material', kanto.material?.id]]) {
      if (!id) continue;
      const n = nomeDoItem(kanto, id);
      ok(n && n !== id, `o ${oQue} ("${id}") saiu como id cru`);
    }
  });

  s.teste('id desconhecido volta como ele mesmo, e não como vazio', () => {
    /* O ÚLTIMO RECURSO É O ID, e não o silêncio. Item novo sem cadastro tem de
       aparecer com alguma coisa: uma linha em branco na mochila é pior que um
       id feio — ela some, e o jogador não sabe que tem alguma coisa ali. */
    igual(nomeDoItem(kanto, 'item_que_nao_existe_123'), 'item_que_nao_existe_123');
    igual(nomeDoItem(kanto, null), '', 'id ausente devia dar texto vazio');
    igual(nomeDoItem(null, 'poke'), 'poke', 'sem pack, o id é a única resposta honesta');
  });

  s.teste('a forma curried é a mesma função', () => {
    /* `nomesDe` existe para os chamadores de camada 0 (`oQueFalta`,
       `falaDaExigencia`) que recebem um resolvedor de UM argumento e não
       conhecem o pack. Se as duas divergissem, o selo do cartão e a mochila
       mostrariam nomes diferentes para o mesmo item. */
    const f = nomesDe(kanto);
    for (const id of ['poke', kanto.moedaPve?.id, 'nada'].filter(Boolean))
      igual(f(id), nomeDoItem(kanto, id), `curried divergiu em "${id}"`);
  });

  s.teste('os três chamadores usam ESTA função, e não uma cópia', () => {
    /* A duplicação é o defeito, e não o sintoma. Enquanto cada tela resolvia o
       nome por conta própria, era questão de tempo até uma delas divergir — e
       foi o que aconteceu nas duas que não tinham como chamar esta. */
    const ler = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
    for (const p of ['app/modules/idle-paineis.mjs', 'app/modules/idle-tela.mjs',
                     'app/modules/pokedex.mjs']) {
      const txt = ler(p);
      ok(/from '\.\/itens-nome\.mjs'/.test(txt),
        `${p} não importa \`itens-nome.mjs\` — se ele resolve nome de item por ` +
        'conta própria, a divergência volta');
    }
  });

  /* ST-3.1 · L-160 — a parte de estilhaço tem nome. Desde a ST-3.1 o baú do
     Avanço entrega `est:<id>`, e o quadro da run lista o que entrou: sem isto
     o jogador leria "est:fogo", que é o defeito que o 1.12 corrigiu. */
  s.teste('L-160: a parte de estilhaço se chama pelo item de origem, nunca pelo id cru', () => {
    const pedra = (kanto.catalogo ?? []).find(i => i.porta === 'drop');
    const nome = nomeDoItem(kanto, 'est:' + pedra.id);
    igual(nome, `Estilhaço de ${pedra.nome}`, 'a parte de estilhaço saiu com outro nome');
    ok(!nome.includes('est:'), `o id cru apareceu: "${nome}"`);
  });

  return s;
}
