# Arte do projeto

**Esta pasta é NOSSA e entra no versionamento.** É o oposto de `assets/`, e a
distinção não é arrumação — é a regra do `CLAUDE.md` lida direito:

> Nunca versionar material de terceiros.

A regra é sobre **material de terceiros**: as folhas do PMDCollab, os GIFs do
Showdown, o `battle-theme.mp3`. Não sobre arte que o projeto produziu.

| Pasta | O que é | No git? | Quem traz |
|---|---|---|---|
| `arte/` | criada para este projeto | **sim** | está aqui |
| `assets/` | de terceiros, baixada em tempo de instalação | não | `npm run assets` |

Confundir as duas custa dos dois lados: versionar arte de terceiros é problema
de licença, e **deixar a nossa de fora é perder trabalho** — foi o que quase
aconteceu no porte da v1.0, quando as três imagens abaixo saíram do repositório
por engano.

| Arquivo | Onde aparece | Medidas |
|---|---|---|
| `cidade-neon.jpg` | fundo do hero da tela Início; cenário "Cidade Neon" | 1024 × 559 |
| `portal-arena.jpg` | fundo da tela de acesso; cenário "Portal da Arena" | 1024 × 392 |
| `nucleo-orbe.jpg` | cenário "Núcleo" dos banners | 520 × 520 |

Geradas na rodada de identidade visual da v0.9.3 do trabalho paralelo. Nenhum
texto de marca depende delas: **o letrado é CSS puro**, então escala sozinho,
troca de cor com o tema e continua legível se a arte não carregar.

## Insígnias (ST-10.13)

`insignias/<id>.svg` — uma por insígnia do pack, desenhada aqui (SVG à mão,
32 × 32, `crispEdges` para ler como pixel). O estojo do mapa da jornada mostra
a silhueta enquanto ela não é ganha, e a arte inteira depois. A regra de cópia
do `CLAUDE.md`: a referência é o estojo do cartão de treinador da era GBA; a
nossa é pedra LAPIDADA em facetas com o fio neon da interface na borda.

| Arquivo | Insígnia | Ginásio |
|---|---|---|
| `insignias/rocha.svg` | rocha | Ginásio de Pewter (ST-10.13) |
| `insignias/cascata.svg` | cascata | Ginásio de Cerulean (ST-10.14) — gota lapidada, a mesma família da Rocha |
| `insignias/trovao.svg` | trovao | Ginásio de Vermilion (ST-10.15) — raio lapidado em âmbar sobre o octógono escuro |
| `insignias/arcoiris.svg` | arcoiris | Ginásio de Celadon (ST-10.19a) — flor de sete pétalas lapidadas |
| `insignias/alma.svg` | alma | Ginásio de Fuchsia (ST-10.19a) — coração lapidado em magenta |
| `insignias/pantano.svg` | pantano | Ginásio de Saffron (ST-10.16) — dois círculos lapidados (ouro e violeta), as duas defesas da lição |
| `insignias/vulcao.svg` | vulcao | Ginásio de Cinnabar (ST-10.19b) — chama lapidada em três camadas |
| `insignias/terra.svg` | terra | Ginásio de Viridian (ST-10.19b) — dois picos colados, pedra e terra: os dois tipos que contam juntos |

## O mundo do mapa (ST-10.22b)

`mapa/<peça>.svg` — pixel art NOSSA do mapa da jornada, gerada por
`tools/pixel-arte.mjs` a partir de uma grade de caracteres (um por pixel) e
uma paleta. **A fonte é a grade**: edite lá e rode `node tools/pixel-arte.mjs`.
O SVG sai com `crispEdges`, em 2× (16 × 16 → 32 × 32), sem binário no repositório.

A folha de terceiros (`pret`) só trazia a árvore e a rocha; o que faltava para o
mapa ter REGIÕES foi desenhado aqui, na paleta da era (contorno escuro, três
tons por material, luz de cima). A regra de cópia do `CLAUDE.md`: a referência
é o tile de Kanto; a nossa diferença é o que acende no neon da interface — a
janela, o fio da torre, a chama do braseiro, a cúpula da Liga.

| Peça | Onde | Medidas |
|---|---|---|
| `casa_vermelha`, `casa_azul`, `casa_verde`, `casa_roxa` | as cidades dos ginásios — a cor muda de cidade para cidade | 16 × 16 |
| `flores`, `junco` | as rotas; o brejo de Fuchsia | 16 × 16 |
| `arvore`, `pinheiro` | a parede de árvores, misturada à árvore do `pret` | 16 × 16 |
| `torre` | a Usina (o chefe) | 16 × 16 |
| `braseiro` | o planalto da Liga, um por nó (os pilares lisos liam como lápides) | 16 × 16 |
| `pilar` | desenhado e não usado — substituído pelo braseiro na 2ª rodada do Q7 | 16 × 16 |
| `museu`, `farol`, `loja`, `portao_safari`, `torre_silph`, `vulcao`, `palacio` | o MARCO de cada cidade (Pewter, Vermilion, Celadon, Fuchsia, Saffron, Cinnabar, a Liga) | 16–24 de largura |
