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
