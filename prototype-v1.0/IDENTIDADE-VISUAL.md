# PokéArena — Identidade visual Neon/Cyberpunk

Documento de referência da pele do site: o que foi decidido, por que, onde
mexer e o que ficou guardado para as próximas rodadas.

Vale para a `v0.9.3` em diante.

---

## A decisão

A temática do projeto é **Neon/Cyberpunk**. Ela veio da conversa de
identidade visual com o Gemini (conceito 2, refinado nas variações 2.1 a
2.4) e das pranchas do ChatGPT, e substitui o esquema dourado/azul-escuro
que vinha desde a v0.8.

Dois acabamentos convivem, escolhidos pelo treinador em **Perfil →
Customizar → Tema visual do site**:

| Tema | Origem | Acento 1 | Acento 2 | Fundo |
|---|---|---|---|---|
| **Hyper Core** (padrão) | prancha 02 do ChatGPT | `#00e5ff` ciano | `#a06bff` violeta | `#070a12` |
| **Shadow Arena** | prancha 04 do ChatGPT | `#b57bff` violeta | `#ff3ea5` magenta | `#08060f` |

As pranchas 01 (Neon Circuit), 03 (Glitch Strike) e 05 (Pixel Neon) não
viraram tema por enquanto — estão no backlog no fim deste documento.

---

## Como o tema funciona por dentro

### Tudo sai de tokens CSS

O bloco `:root` no topo do `<style>` define a paleta inteira. Os nomes
antigos foram **mantidos de propósito**:

```css
--gold:     #00e5ff;   /* hoje: "cor de acento do tema", não amarelo */
--goldRGB:  0,229,255; /* o mesmo em cru, para rgba() com opacidade */
--onAccent: #04151c;   /* texto que vai POR CIMA do acento */
```

`--gold` aparece em quase setenta lugares — arena, HUD, killfeed,
carteira, medalhas. Trocar o **valor** em vez do **nome** converteu o site
inteiro sem encostar em uma linha de lógica de jogo. É o motivo de o
token continuar se chamando `--gold` mesmo sendo ciano.

`--goldRGB` existe porque uns vinte lugares usam `rgba()` com a cor de
acento em opacidade variável, e não dá para interpolar um hex ali dentro.

### A variante é um atributo no `<html>`

```html
<html lang="pt-BR" data-tema="hyper">
```

`html[data-tema="shadow"]` redefine só os tokens. Nenhuma tela precisa ser
redesenhada em JS quando o tema muda — por isso a troca é instantânea.

### A pele vem depois, num bloco só

Todo o visual novo está num bloco único no fim do `<style>`, marcado
`PELE NEON / CYBERPUNK`. Ele **só sobrescreve aparência** (cor, borda,
brilho, fundo) e não toca em nenhuma regra de posicionamento da arena, do
HUD ou do killfeed. **Apagar esse bloco devolve o visual antigo sem
quebrar nada** — foi escrito assim para a troca ser reversível.

### Onde o tema é guardado, e por quê

Em dois lugares, e a ordem importa:

1. `profile.tema` — é uma preferência do treinador como qualquer outra.
2. `localStorage.ar_tema` — lido por um script no `<head>`, **antes da
   primeira pintura**. Sem ele a página piscaria no tema padrão por um
   quadro antes de trocar.

A precedência é: escolha explícita do perfil → `ar_tema` → padrão. Um
perfil recém-criado nasce com `tema: null` (nunca escolheu), justamente
para não sobrescrever um `ar_tema` válido.

---

## As artes

Três arquivos em `assets/`, gerados na conversa de identidade visual e
agora versionados no repositório:

| Arquivo | Onde aparece |
|---|---|
| `cidade-neon.jpg` | fundo do hero da tela Início; cenário "Cidade Neon" |
| `portal-arena.jpg` | fundo da tela de acesso; cenário "Portal da Arena" |
| `nucleo-orbe.jpg` | cenário "Núcleo" dos banners |

São **locais**. Até a v0.9.2 o projeto evitava imagens novas porque já
dependia de dois CDNs externos de sprite; essas três não somam nenhuma
dependência de terceiro. O `serve.js` ganhou os MIME de `.jpg`, `.jpeg`,
`.webp`, `.svg`, `.ico` e fontes, que faltavam.

Nenhum texto de marca depende de imagem: o **letrado é CSS puro**
(`.letrado`), então escala sozinho, troca de cor com o tema e continua
legível se a arte não carregar.

---

## Tipografia

Duas famílias, com uma divisão deliberada:

- **Orbitron** (`--dsp`) — chrome da plataforma: letrado, topbar, títulos
  do Início/Como funciona/Regras, títulos de cartão, botões de chamada.
- **Press Start 2P** (`--px`) — o jogo: HUD de vida, odds, contagem
  regressiva, killfeed, log.

A pixelada continua sendo a alma da arena; o Orbitron veste a plataforma
em volta dela. Ambas têm fallback declarado (`system-ui`, `Courier New`).

---

## O que mudou em cada tela

**Início** — hero com a cidade neon ao fundo, véu escuro por cima (o texto
nunca cai sobre pixel claro), letrado grande, botão vazado neon com brilho
de varredura, faixa de ticker na base. Cartões de recurso com filete
ciano→violeta no topo e elevação no hover.

**Acesso (login)** — é o **mesmo modal de sempre**: `authName`, `authPin`,
`authAge`, `btnAuthGo` e `btnAuthSwap` continuam idênticos, e o JS de
sessão não foi tocado. O que mudou é que o fundo virou a arte do portal em
tela cheia, com respiração lenta e varredura. A arte mora em
pseudo-elementos do backdrop — pendurar um filho novo no
`.modal-backdrop` o transformaria em item do flex e desalinharia o cartão.

**Como funciona / Regras** — títulos em Orbitron com filete neon, passos e
regras em vidro, aviso 18+ em rosa neon.

**Arena** — o layout de seis colunas foi preservado inteiro. Ganhou
moldura de HUD com cantoneiras, painéis de vidro, e uma grade holográfica
por cima do canvas (`#arena::after`, `pointer-events:none`, z-index 3 —
acima dos sprites, abaixo dos avisos de killstreak e clima). A grade está
a 5% de opacidade de propósito: dá a leitura de "arena projetada" sem
competir com os lutadores. Barras de vida em verde-menta neon.

**Perfil** — seletor de tema com prévia lado a lado. Cada cartão de prévia
se desenha com as cores **do tema que representa**, não com as do tema
ativo, então dá para comparar os dois sem aplicar.

---

## Cosméticos novos

Entraram como opções **novas**, na frente da lista. Nenhuma classe antiga
foi renomeada — quem já tinha `campo` e `chama` salvos abre a página com
exatamente o mesmo banner de ontem.

**Cenários de banner** (batalha e perfil): Cidade Neon, Portal da Arena,
Núcleo, Grade Synth (essa 100% procedural — horizonte synthwave em
gradiente).

**Efeitos de nome**: Neon (pulso ciano/violeta), Glitch (deslocamento
cromático em passos secos), Holograma (varredura subindo por dentro do
rótulo).

---

## O que NÃO foi feito, e por quê

**Nenhuma arena nova entrou no sorteio.** Os cenários da arena têm peso
(`peso:20`) e saem de semente. Acrescentar uma "Arena Neon" mudaria o que
cada semente produz, e o determinismo é o que torna a rodada auditável —
é a promessa que está escrita na tela de Regras. Uma arena cyberpunk é
perfeitamente possível, mas é decisão de produto, não de tema visual.

**O canvas da batalha não foi repintado.** A paleta de cada arena é
desenhada em JS (`drawMap`, `fundo`, `estatico`, `brilho`). Mexer ali é
risco de quebrar a leitura da luta sem ganho proporcional — a moldura
neon, a grade e a vinheta já integram o canvas ao tema.

**Botões não viraram maiúsculas em massa.** O guia pedia
`text-transform:uppercase` + `letter-spacing:2px` em todo botão de ação.
Rótulos longos da carteira e da arena ("Cancelar aposta e ficar de fora")
não cabem assim nas colunas estreitas. O tratamento completo ficou no
`.btn.cta`, usado só nas chamadas grandes do portal, onde há espaço.

---

## Bug do XP corrigido (era pré-existente)

`xpParaNivel = n => Math.floor(1750 * Math.pow(n, 1.5))` fazia o nível 1
começar em 1750 XP em vez de 0. Como todo treinador novo tem `xp: 0`, o
perfil mostrava **"−1750 / 3199 XP"** com a barra negativa. Estava assim
desde antes da v0.9.2.

A correção foi trocar o piso do primeiro nível:

```js
const xpParaNivel = n => n <= 1 ? 0 : Math.floor(1750 * Math.pow(n, 1.5));
```

**Ninguém mudou de nível com isso, e dá para provar.** O único outro uso
de `xpParaNivel` é dentro de `nivelDe`, que sempre chama com `n + 1` — o
laço começa em `n = 1`, então a função nunca recebe 1 ali. Todos os
limiares do nível 2 em diante ficaram intactos; só o piso do nível 1
mudou, e mudou para o valor certo. Conferido varrendo de 0 a 3.000.000 de
XP: zero divergências de nível entre a curva antiga e a nova.

O que a tela mostra agora:

| XP | Antes | Agora |
|---|---|---|
| 0 | NV1 −1750/3199 (−54,7%) | NV1 0/4949 (0%) |
| 3.000 | NV1 1250/3199 (39,1%) | NV1 3000/4949 (60,6%) |
| 4.949 | NV2 0/4144 (0%) | NV2 0/4144 (0%) |

O denominador subiu de 3199 para 4949 porque esse é o tamanho real do
nível 1 — a barra passou a ser honesta sobre quanto falta.

## Backlog de personalização

Ideias levantadas e ainda não implementadas, em ordem de custo.

### Barato — só CSS, mesma estrutura de cosmético
- **Chama que acende e apaga** no nome: variação do `ef-chama` com
  `steps()` irregular, para o fogo piscar em vez de pulsar liso.
- **Camada de gelo derretendo**: `ef-gelo` com uma máscara que desce e
  gotas em `::after`, revelando o nome por baixo.
- Efeitos por tipo do Pokémon escolhido (elétrico, fantasma, dragão).
- Molduras de banner (cantoneiras, circuito, fita de dados).
- Cenário que segue o clima sorteado na rodada.

### Médio — precisa de estado ou de arte
- **Banner animado de verdade**: parallax de duas ou três camadas da
  cidade, com o Pokémon flutuando na frente.
- Letrado com variantes desbloqueáveis (Neon Circuit, Glitch Strike,
  Pixel Neon como *skins* do wordmark, aproveitando as pranchas 01/03/05).
- Cor de acento personalizada pelo treinador, dentro de uma faixa que
  garanta contraste.
- Cosméticos como recompensa: medalha de ouro libera efeito de nome
  dourado, dez vitórias liberam a moldura de campeão.

### Caro — mexe em sistema
- Arena Neon no sorteio (ver "O que NÃO foi feito").
- Vitrine pública de perfil, com o banner como cartão compartilhável.
- Editor de banner com posicionamento livre do Pokémon e do treinador.

---

## Onde mexer

| O quê | Onde |
|---|---|
| Paleta e variantes | bloco `:root` / `html[data-tema=…]`, topo do `<style>` |
| Visual de qualquer tela | bloco `PELE NEON / CYBERPUNK`, fim do `<style>` |
| Cosméticos de banner | `BN_CENAS`, `BN_EFEITOS`, `BANNER_SCENES` + classes `.cn-*`, `.ef-*`, `.sc-*` |
| Lista de temas | `TEMAS` e `aplicarTema()` |
| Artes | `assets/` |

Regra de ouro para a próxima rodada: **cor nova entra como token**, nunca
como hex solto no meio de uma regra. Foi o que permitiu virar o site
inteiro de uma vez desta vez.

---

# v1.0 — Shinys, baús e painel de ADM

## Medidas exatas das sprites

Para você criar arte cosmética no encaixe certo. Todas com
`image-rendering: pixelated`, então o pixel da arte é o pixel da tela —
enviar em 2× e deixar o navegador reduzir borra o resultado.

| Onde | Tamanho | Observação |
|---|---|---|
| Pokémon do banner de batalha | **118 × 118** | o de vitrine (sem aposta) entra a 104 × 104 |
| Treinador do banner de batalha | **66 × 66** | canto inferior esquerdo |
| Banner de batalha inteiro | **238 × 352** | a coluna tem 238 de largura |
| Pokémon do banner de perfil | **74 × 74** | |
| Banner de perfil inteiro | **largura livre × 112** | ocupa a largura do modal (max. 520) |
| Avatar do perfil | **66 × 66** | |
| Avatar da topbar | **26 × 26** | |
| Miniatura das grades de escolha | **38 × 38** | |
| Retrato do killfeed | **34 × 34** | dentro de moldura de 24 × 24, puxado para cima |
| Sprite da tela de vitória | **96 × 96** | |
| Sprite da lista de apostas | **22 × 22** | |
| Lutador na arena | **altura máx. 76** | `SPRITE_MAX_H`; a largura acompanha a folha |

Folhas da arena (PMD) seguem outra regra: 8 linhas (direções) × N colunas
(quadros), com o tamanho do quadro vindo do `AnimData.xml`. Não invente
medida aqui — o quadro varia por Pokémon (o Pikachu é 32 × 40, o
Gyarados é bem maior).

## Shiny — de onde vem e por que dá para confiar

**Arena (PMDCollab/SpriteCollab):** o shiny mora em
`sprite/{dex}/0000/0001/`. Conferido antes de escrever código: baixando
as duas folhas do Pikachu, o canal alfa é **idêntico** e a contagem de
pixels por cor bate exatamente (3960/3960, 3165/3165, 1503/1503, …). É
recolor da mesma arte — a silhueta, que é o que a coreografia usa, não
se mexe. A paleta desloca de `#FFF700` para `#EFBF37`, que é o amarelo do
shiny canônico.

**Cobertura nos 76 do elenco:** 75 com o conjunto completo
(Walk/Idle/Attack/Hurt); 1 (dex 15) sem só o Idle — e esse já estava em
`IDLE_USES_WALK` desde antes, que manda usar a folha de andar como
parada. Na prática, cobertura total.

**Risco zero na animação:** `AnimData.xml` e as dimensões das folhas
shiny são idênticos aos da normal (conferido em 10 Pokémon, incluindo
Gyarados e Charizard). A tabela `PMD` embutida vale sem uma alteração.

**Banner, perfil e avatar:** `gen5ani-shiny` no Showdown, com queda para
`gen5-shiny` e depois para a pasta `shiny/` da PokeAPI — essa última
conferida nos 76.

Dois cosméticos separados, e a diferença importa: o **GIF** vale no
banner de batalha, no banner do perfil e no avatar; a **SKIN** troca o
sprite dentro da luta e é o prêmio mais raro. Desbloqueado e equipado são
estados distintos, então dá para desligar um shiny sem perder a
conquista.

## Baús — os números, e de onde eles saíram

Calibrado por simulação **antes** de escrever a tela. 3.000.000 de
aberturas com o PRNG do jogo, conferidas em cinco sementes independentes
por qui-quadrado (10 g.l.): X² entre 5,2 e 16,4, todas abaixo do crítico
de 23,21 para p<0,01. Medido também que o prêmio anterior não influencia
o seguinte (P(gif) 1,240% no geral, 1,219% logo após outro gif).

| Prêmio | Chance | Faixa |
|---|---|---|
| Fragmento de chave | 24,2% | 1 |
| PokéCash | 16,5% | 5–15 |
| Vazio (Equipe Rocket) | 17,4% | — |
| Fragmentos de chave | 10,7% | 2 |
| Essência Shiny | 8,7% | 1–4 |
| PokéCash | 7,6% | 20–40 |
| Bônus de XP | 6,3% | 60–150 |
| Fragmentos de chave | 3,7% | 3 |
| Núcleo Prisma | 3,4% | 1–3 |
| **Pokémon Shiny (GIF)** | **1,24%** | sorteado entre os que faltam |
| **Skin Shiny de Arena** | **0,35%** | sorteado entre as que faltam |

**O que isso significa jogando:**

- PokéCash médio por baú: **3,91** → ~34 rodadas para juntar os 50 da
  aposta mínima. É bônus de quem joga, nunca atalho.
- Fragmentos por baú: **0,57** → autossustento de **4,7%**. O baú **não
  se paga sozinho**, de propósito: a chave sai de disputar rodada
  (4 fragmentos por rodada, +3 se acertar; 12 fragmentos = 1 chave).
- 1º GIF shiny: mediana de **56 baús** (~147 rodadas).
- 1ª skin de arena: mediana de **196 baús** (~515 rodadas).

**A garantia (pity)** existe porque a cauda do azar é infinita sem ela.
Essência (30) troca por um GIF **escolhido**; Núcleo Prisma (30) troca
por uma skin escolhida. Com o pity, o pior caso em 20.000 jogadores
simulados caiu para **309 baús**.

Shiny repetido nunca sai: o sorteio escolhe só entre os que faltam, e com
a coleção completa converte em garantia. Um prêmio raro e inútil ao mesmo
tempo seria o pior resultado possível.

**O sorteio acontece antes da animação**, igual à batalha: o suspense é
encenação de um resultado que já existe. Se fosse decidido no fim, a
animação poderia influenciar o prêmio.

## Painel de ADM

Abre com `#adm` no endereço, pede um PIN (`7777`), e nada no menu aponta
para ele.

**Isto não é controle de acesso, e o painel diz isso em vermelho no
topo.** O projeto é um arquivo que roda no navegador do visitante, sem
servidor — o PIN está no código-fonte e qualquer pessoa que abra o HTML o
encontra. Ele serve para não abrir sem querer. Quando existir servidor,
precisa virar rota autenticada de verdade.

O que tem:

- **Conta** — conceder PokéCash, chaves, fragmentos, essência, prisma, XP.
- **Laboratório shiny** — qualquer Pokémon lado a lado, normal e shiny,
  com as duas URLs de folha da arena à mostra (dá para conferir o caminho
  sem abrir o inspetor). Conceder/revogar GIF e skin, tudo de uma vez, ou
  limpar a coleção.
- **Baús** — simular 1.000, 100.000 ou 1.000.000 de aberturas com tabela
  de esperado × observado × desvio, e um botão por prêmio para **disparar
  a animação** sem gastar chave. É o jeito de ver a celebração de shiny
  quantas vezes quiser.
- **Odds** — margem da casa de −10% a +25%, com prévia do efeito numa odd
  de exemplo. Margem negativa avisa que a casa passa a perder no longo
  prazo.
- **Estatísticas** — apostas, taxa de acerto, total apostado, saldo da
  casa, RTP observado × teórico e gráfico do saldo acumulado nas últimas
  30 apostas.

**Sobre a margem e a honestidade da tela:** ela mexe em `CONF.MARGIN`,
que é o **mesmo** valor exibido ao lado das odds ("8% casa"). Mexer no
painel não cria odd secreta — a tela continua declarando a margem em uso.
Foi feito assim de propósito: "odd auditável" é a promessa escrita na
página de Regras, e um painel que a quebrasse em silêncio tornaria a
página mentirosa.

## O que ficou de fora

**Bots simulando apostadores.** Foi pedido, e não entrou. Não é
dificuldade técnica: é que "bot apostando" só tem duas versões possíveis.
Ou ele é enfeite (uma lista de nomes falsos com valores falsos), e aí não
serve para testar nada; ou ele mexe no volume apostado de verdade, e aí
deixa de ser ferramenta de ADM e vira mecânica de produto, com efeito em
odds, pagamento e histórico. A segunda precisa ser decidida como
funcionalidade, não improvisada num painel de teste. Vale conversar sobre
o que exatamente você quer que os bots façam.

**Fragmentos de outfit de avatar.** A moeda existe no desenho da
economia, mas não há catálogo de peças para gastar nela — a arte ainda
vai ser criada. Colocar uma barra que enche sem nada do outro lado seria
pior que não ter. Quando as peças existirem, o encaixe é o mesmo da
essência/prisma.
