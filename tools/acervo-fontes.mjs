/* DE ONDE CADA PEÇA DO ACERVO VEIO, E COMO ELA FOI RECORTADA.
 *
 * ── POR QUE ISTO NÃO MORA JUNTO DO CATÁLOGO ───────────────────────────────
 *
 * A primeira versão do R30 pôs `fonte`, `recorte`, `tol` e `zoom` dentro de
 * `app/modules/acervo-dados.mjs`, e o portão Q2 reprovou — com razão. Os nomes
 * dos arquivos entregues carregam identificadores da franquia, e o
 * `test/pack-original.mjs` varre `engine/`, `server/`, `app/modules/` e o
 * `index.html` atrás deles. O §0.3 é "Engine != Pokémon": enquanto esses nomes
 * só existirem no pack e nas ferramentas, trocar de tema é trabalho de arte e
 * de dados, nunca de engenharia.
 *
 * Mas a reprovação apontou para algo melhor que um disfarce. O app NÃO PRECISA
 * saber de que arquivo a arte veio nem como ela foi recortada — ele precisa do
 * id, do nome exibível e de onde a imagem se enquadra. A procedência é assunto
 * de quem DERIVA, e quem deriva é a ferramenta. A separação que o portão forçou
 * é a que devia estar lá desde o começo.
 *
 * ── O CAMPO `recorte` ─────────────────────────────────────────────────────
 *
 * Foi MEDIDO por `preparar-acervo.mjs --sondar`, não estimado:
 *
 *   'alfa'   a fonte já vem recortada — tem pixel de fato vazado (alfa ~0).
 *            Acha a caixa do que é opaco e quadra em volta dela.
 *   'fundo'  há fundo alcançável pela borda. Preenchimento a partir das quatro
 *            bordas, com tolerância que acompanha a cor local.
 *   'cena'   não há fundo para remover: a arte É o cenário. Recorta no quadrado
 *            em volta do foco e mantém tudo atrás.
 *
 * A sonda só sugere 'fundo' quando o alcance do preenchimento é alto E o desvio
 * do anel de borda é baixo. Alcance sozinho não prova nada: o preenchimento
 * acompanha degradê de propósito, e numa cena de pôr do sol ele caminha pelo
 * CÉU — que é a arte, não o fundo.
 *
 * `tol` é [vizinho, absoluto]. O padrão [12,60] serve fundo chapado; o teto
 * absoluto atrapalha em degradê e por isso o `mewbebe` usa 255. Foi visto: com
 * teto 90 sobrava um borrão claro atrás do Mew (removia 76,6%); sem teto sai
 * limpo (85,6%) com o personagem e os itens miúdos inteiros.
 *
 * `zoom` fecha o enquadramento das cenas — 1 usa o menor lado inteiro da fonte,
 * 1,5 usa dois terços dele. Arte de corpo inteiro sem zoom vira um personagem
 * de 12 px dentro dos 66 que o perfil mostra.
 */

/* id do catálogo -> arquivo entregue e como derivar dele.
 * Os nomes à direita são os que o dono do projeto usou ao entregar; eles ficam
 * literais de propósito, porque é isso que torna a derivação rastreável. */
export const FONTES_AVATAR = {
  mewbebe:      { fonte:'avatar_babymew.jpg',        foco:[50,50], recorte:'fundo', tol:[16,255] },
  blastoise:    { fonte:'avatar_cyberblastoise.png', foco:[50,50], recorte:'alfa'  },
  gengarninja:  { fonte:'avatar_shadowgengar.jpg',   foco:[50,50], recorte:'fundo' },
  /* NÃO é 'alfa', por mais que seja PNG: não tem um pixel vazado — é
     semitransparente por inteiro (59,8% em alfa ~192, 40,2% em ~224) sobre
     cinza chapado. Tratado como recortado, saiu com uma caixa cinza atrás. */
  gengarsombra: { fonte:'avatar_shadowgengar2.png',  foco:[50,50], recorte:'fundo' },
  /* Daqui para baixo são CENAS: o fundo é a arte. O `foco` é onde está o rosto,
     e o `zoom` é o que impede que ele saia do tamanho de uma unha. */
  snorlaxrei:   { fonte:'avatar_kingsnorlax2.jpg',   foco:[52,42], recorte:'cena' },
  lapras:       { fonte:'avatar_lapraspikatoge.jpg', foco:[47,55], recorte:'cena', zoom:1.35 },
  /* Os dois estão no TERÇO DE BAIXO desta; recorte centrado mostraria água. */
  mewtwolago:   { fonte:'avatar_mewtwoash.jpg',      foco:[50,80], recorte:'cena', zoom:1.3 },
  mewtwoorbe:   { fonte:'avatar_mewtwopokeball.jpg', foco:[50,45], recorte:'cena', zoom:1.2 },
  mewtwocoro:   { fonte:'avatar_mewtwopokemon.jpg',  foco:[50,55], recorte:'cena', zoom:1.5 },
  soneca:       { fonte:'avatar_pokemonsleep.jpg',   foco:[50,52], recorte:'cena', zoom:1.6 },
};

export const FONTES_CENA = {
  coliseu:   { fonte:'banner_arcaninecoliseu.jpg' },
  chamas:    { fonte:'banner_charizardcoliseu.jpg' },
  mansao:    { fonte:'banner_gengarmansion.jpg' },
  cripta:    { fonte:'banner_gengarmansion2.jpg' },
  holograma: { fonte:'banner_mewtwohologram.jpg' },
  estrelas:  { fonte:'banner_pokemonstarsky.jpg' },
  alvorada:  { fonte:'banner_runarcanine.jpg' },
  elementos: { fonte:'banner_triokanto.jpg' },
  vilarejo:  { fonte:'banner_allpokemonpixel.jpg' },
  bosque:    { fonte:'banner_forestpikachu.jpg' },
};
