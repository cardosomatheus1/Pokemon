> **Congelado como REFERÊNCIA do porte.** Esta é a v1.0 do trabalho paralelo,
> construída sobre o protótipo v0.8. Ela não roda a partir daqui — a arte de
> terceiros (`assets/`, `battle-theme.mp3`) foi removida, pelo mesmo motivo de
> sempre: material de terceiros não entra no repositório. O inventário do que
> ela tem, e o plano de trazer tudo, estão em `docs/PORTE_v1.0.md`.

# PokéArena — base v0.8

> **v1.0 — shinys, baús e painel de ADM.** O sistema de cosméticos shiny
> (GIF de banner/avatar e skin de arena em Mystery Dungeon), os baús com
> economia calibrada por simulação, e o painel de ADM em `#adm` estão
> documentados em [IDENTIDADE-VISUAL.md](IDENTIDADE-VISUAL.md), junto das
> medidas exatas de todas as sprites.
>
> **v0.9.3 — identidade visual Neon/Cyberpunk.** A pele do site, os dois temas
> (Hyper Core e Shadow Arena), a tela de acesso, as artes em `assets/` e o
> backlog de personalização estão documentados em
> [IDENTIDADE-VISUAL.md](IDENTIDADE-VISUAL.md).

Battle royale automático de 12 lutadores — sorteados a cada rodada dentre os
**76 de Kanto** (só evoluções finais e Pokémon-base, sem pré-evoluções nem
lendários) — numa ilha 2D vista de cima, com odds, apostas, clima, killstreaks,
progressão de treinador e desafios diários.

**Versionamento:** cada entrega é uma base numerada (`v0.4`, `v0.5`, `v0.6`…).
A versão corrente aparece no `<title>` e no cabeçalho da página, para dar
para identificar o arquivo sem abrir o código.

Arquivo único: **`index.html`**. Dá duplo clique e abre. Funciona em PC e celular.

Se preferir rodar como site de verdade:

```bash
node serve.js
```

e abra `http://localhost:8792`.

---

## O que estava diferente do vídeo (e foi corrigido)

Comparando frame a frame o vídeo com a última versão que o Gemini entregou:

| No vídeo | Versão anterior | Agora |
|---|---|---|
| Ilha 2D em formato de retângulo arredondado, encostando nas laterais | Elipse pequena feita com `border-radius: 50%` | Superelipse desenhada em canvas, encosta nas bordas |
| Grama com textura, flores, pedras, arbustos | Verde chapado | ~1500 elementos de textura gerados por seed fixa |
| Água com ondas concêntricas batendo na praia | Gradiente estático | Anéis animados seguindo o contorno da ilha |
| Pokébolas de vários tipos espalhadas pelo chão | Uma pokébola PNG por lutador | 14 no cenário + 12 de spawn, desenhadas em canvas |
| 3 a 6 ataques ao mesmo tempo | 1 ataque a cada 1,2 s | Cada lutador tem seu próprio relógio; vários agem juntos |
| Lutadores espalhados pela ilha inteira | Círculo fixo + tremidinha de ±5% | Coreografia: andam até quem vão atacar, recuam depois, fogem machucados |
| Bicho virado para onde anda, perna mexendo | Sprite de batalha parado, deslizando | Sprites de overworld com 8 direções e ciclo de passo |
| Cada golpe com efeito próprio | Bolinha ou risco na cor do tipo | 56 folhas de efeito originais, uma encenação por golpe ([GOLPES.md](GOLPES.md)) |
| Barras de HP no topo, 3 colunas | Sem HUD de vida | 12 placas com barra que esvazia e vira vermelho |
| Balão de ataque com cor do tipo | Balão branco | Borda colorida pelos 18 tipos |

E o mais importante, que não dá para ver no vídeo:

| | Versão anterior | Agora |
|---|---|---|
| Dano | `Math.random()*25 + 20` — sem tipo, sem stat, sem crítico | Fórmula dos jogos: nível 50, tabela dos 18 tipos, STAB, crítico, precisão, físico/especial |
| Odds | `Math.random()*3 + 2`, depois "flutuando" a esmo | 20.000 simulações de Monte Carlo, margem da casa de 8% |
| Sincronia | Cada navegador sorteava a própria batalha | Batalha inteira derivada de uma seed, replay determinístico |

---

## A rodada de aprimoramento a partir da conversa com o Gemini

Você pediu para eu ler de novo, do zero, a conversa que teve com o Gemini
compartilhada por link, extrair tudo que foi *positivado* ali (as ideias que
você validou, não as que foram descartadas) e aplicar isso junto com os
ajustes já feitos aqui nesta conversa. Foi isso que entrou nesta leva:

**Extraído da conversa com o Gemini e mantido/reforçado:**
- Formato battle royale automático com odds e apostas (já era a base).
- Tipagem valendo de verdade, com vantagem/desvantagem — mas sem travar a
  luta (você pediu explicitamente para não repetir o problema de
  "stall battle"/recuperação infinita). Ver [mecânica de tempestade](#duração-máxima-e-a-garantia-de-que-a-luta-não-trava) abaixo.
- Moeda virtual em pacotes com bônus crescente ("PokéCash", não "fichas
  1:1") comprados por um fluxo parecido com Pix/Mercado Pago — Gemini
  sugeriu a régua de preços, aqui ela virou a [aba de Depósito](#depósito-de-PokéCash-simulado), simulada.
- Sistema de usuário/carteira — virou o [painel de Perfil](#perfil-do-jogador).
- Você explicitamente disse, na parte de aprimoramento das mensagens de
  batalha, que **não** queria mais o histórico de vitórias por Pokémon
  ("não interessa quem ganhou tantas vezes, é um sistema de aposta, cada
  aposta é uma aposta") — por isso esse histórico continua fora, e o que
  existe em vez disso é o **seu** histórico de apostas, no perfil.

**Novo nesta leva, a partir do seu pedido mais recente:**
- Foco nos 151 de Kanto, tirando os lendários (146 lutadores).
- Clima da arena, revelado só quando a luta começa.
- Duração máxima de ~1 minuto, garantida mesmo sob imunidade de tipo.

---

## Os 76 de Kanto

Antes eram 18 lutadores escolhidos à mão (mistos de gerações diferentes,
para ficar bonito no protótipo inicial). Depois virou o Kanto inteiro — os
151 originais menos os 5 lendários/míticos (Articuno, Zapdos, Moltres,
Mewtwo, Mew), 146 no total. Agora o elenco que **entra em jogo** é ainda
mais enxuto: só **evoluções finais e Pokémon-base sem evolução nenhuma**
(Tauros, Pinsir, Lapras, Ditto, Snorlax, Chansey, Tangela, Kangaskhan,
Mr. Mime, Scyther, Jynx, Electabuzz, Magmar, Aerodactyl, Porygon...) —
sem pré-evoluções (nada de Charmander, Charmeleon, Squirtle, Pikachu,
Eevee cru etc.), pra ninguém ver um bicho de primeiro estágio brigando de
igual pra igual com o resto do time. Cada rodada sorteia 12 novos dentre
esses 76.

No código isso é `KANTO_DEX_FULL` (os 146 brutos, com todos os dados) e
`KANTO_DEX` (o filtro de 76 que realmente entra na arena, via `ARENA_DEX`
— a lista de números de Pokédex mantidos). Trocar quem participa é só
editar essa lista.

**De onde vêm os dados:** tipo e status base (HP/Atk/Def/SpA/SpD/Spe) saem
da [PokeAPI](https://pokeapi.co), que é dado aberto — os mesmos números dos
jogos. Os tipos já estão na tipagem **moderna** (pós geração 6): Clefairy,
Jigglypuff e Mr. Mime aparecem como Fada, porque foi esse o retcon oficial
da franquia, e nossa tabela de tipos (`CHART`) já foi escrita nesse padrão
desde o início — nenhum ajuste extra precisou ser feito para isso funcionar
certo com os 72.

Sprite de arena: continua vindo do PMDCollab, e como as folhas são
indexadas por **número da Pokédex** (não por nome), a tabela `PMD` guarda
as medidas dos 146 originais — os 76 ativos são só um subconjunto disso,
então nada precisou mudar no motor de animação.

### Como cada um recebeu 4 golpes sem escrever 304 linhas à mão

Escrever manualmente 4 golpes com efeito visual para 76 lutadores não é
prático nem sustentável. Em vez disso: uma tabela mestra `MASTER_MOVES`
com um punhado de golpes por tipo (reaproveitando os efeitos visuais já
mapeados), e uma função `assignMoves(pokemon)` que sorteia os 4 dele numa
seed derivada do **próprio número da Pokédex**.

"Sorteia" aqui é determinístico, não aleatório de verdade: dex 6
(Charizard) sempre sai com o mesmo kit, toda vez que a página carrega. Mas
dex 6 e dex 59 (Arcanine — outro Fogo) não saem com o kit idêntico, porque
a seed muda com a dex. A regra: pelo menos 1 golpe de cada tipo que o
lutador tem (um dual-type sempre tem os dois STAB representados), e o
resto preenchido priorizando mais STAB, com uma chance de golpe de
cobertura genérico.

Essa tabela por tipo — e a encenação visual de cada golpe — está detalhada
em [GOLPES.md](GOLPES.md), que também foi reescrito para esse novo formato.

---

## Duração máxima e a garantia de que a luta não trava

Você pediu: tipagem valendo de verdade, **sem** repetir o problema clássico
de simulação automática travar por conta de imunidade de tipo ou
recuperação de vida — e com no máximo ~1 minuto de duração.

Duas decisões resolvem isso, uma cada:

**Não existe golpe de cura.** Ninguém neste jogo recupera HP. Isso sozinho
já elimina a categoria de travamento mais comum em simuladores automáticos
(dois lados trocando dano e cura infinitamente). Foi uma escolha
deliberada, não uma omissão.

**A arena entra em colapso a partir de ~32 segundos.** Mesmo sem cura, dá
para imaginar um caso raro de travamento: os dois últimos sobreviventes
serem mutuamente imunes um ao outro (ex.: um só tem golpes Normais restando,
o outro é Fantasma puro — Normal não afeta Fantasma, e vice-versa). Para
fechar esse buraco de vez, a partir de `CONF.STORM_FROM` (32s) a arena passa
a causar dano por segundo em **todo mundo**, crescendo em rampa — e esse
dano **não passa pela tabela de tipos**, então nenhuma imunidade segura
ninguém. `CONF.MAX_TIME` (56s) é o corte duro final.

Testei o pior caso possível — dois lutadores fabricados com imunidade
mútua total, incapazes de tirar sequer 1 ponto de vida um do outro via
combate normal — e a tempestade sozinha resolveu a luta em 51 segundos,
bem dentro do limite. Isso não é uma esperança estatística, é uma garantia
matemática: não existe combinação de tipos que trave a arena.

Na tela isso aparece como o aviso "🌪️ A arena entra em colapso" no log e um
selo vermelho no canto — visual e mecanicamente, é uma "zona" tipo battle
royale (PUBG, Fortnite), só que sem a metáfora de zona encolhendo no mapa.

---

## Clima da arena

Sorteável entre 5 estados — Neutro (40% de chance), Sol (☀️, dobra ATK/SpA
de tipo Fogo), Chuva (🌧️, dobra Velocidade de tipo Água), Vendaval (🌬️,
×1,5 Velocidade de tipo Voador) e Nevasca (❄️, ×1,5 ATK/SpA de tipo Gelo) —
cada um com 15% de chance.

**O detalhe importante:** o clima é sorteado **já no início da rodada**,
antes até de a pool de 12 lutadores ser montada — mas fica em segredo, sem
nenhum selo, efeito visual ou bônus de stat, até as apostas fecharem.
Ele serve, nesse meio-tempo, só para uma coisa: garantir que a pool
sorteada tenha **pelo menos 1 lutador do tipo favorecido pelo clima**. Se
caiu Sol Forte, por exemplo, a pool sempre vai ter no mínimo 1 Pokémon de
Fogo — sem isso, seria possível o clima cair e não sobrar ninguém pra se
beneficiar dele. Isso significa que:

1. As odds calculadas pelo Monte Carlo (20 mil simulações) **não conhecem
   o clima**. Elas são cegas a ele de propósito — a garantia de tipo na
   pool não entra na conta das odds, só na escolha de quem aparece.
2. A batalha de verdade só é simulada **depois** que as apostas fecham, já
   com os stats ajustados pelo clima — então o resultado real pode
   divergir um pouco da distribuição que gerou as odds. Isso é
   intencional, não um bug: é a mesma dinâmica de uma aposta esportiva ao
   ar livre, onde ninguém sabe se vai chover no dia do jogo na hora de
   fechar a aposta.
3. O clima aparece revelado num selo no canto da arena assim que a
   contagem "3, 2, 1" começa, e fica visível a rodada inteira.

Testei a matemática isoladamente: sob Sol, o ATK e o SpA de um Charizard
dobram (100→200, 120→240) e a Velocidade não muda; um Blastoise no mesmo
grupo fica intocado. Sob Chuva, é o oposto — só a Velocidade do Blastoise
dobra, o Charizard nem percebe.

---

## Feedback visual da sua aposta

Três camadas que existem para responder, o tempo todo, à pergunta "e o
**meu** lutador, como está?". Antes disso a rodada tratava os 12 igual, e
o seu se perdia no meio.

### 1. A sua placa de HP fica marcada

No HUD de 12 barras, a do lutador em que você apostou ganha **contorno
dourado e uma pokébola** à esquerda do nome (`.plate.mine`). É discreto —
não muda o tamanho nem a cor da barra de vida —, mas é o suficiente para
achar a sua no meio das outras onze de relance. Trocar de aposta durante
a fase de apostas move a marcação junto (`markMyPlate()`), e quando esse
lutador é nocauteado o realce dourado sai de cena para o estado
"nocauteado" cinza não ficar competindo com ele.

### 2. Aviso rápido quando o seu é nocauteado

Quando o **seu** lutador cai, aparece um aviso no rodapé da arena:
"*Fulano foi nocauteado! — retornando à pokébola…*", que sobe e some em
2,6 segundos (`koToast()`). Só dispara para o seu: se disparasse para
todos, seriam onze avisos por rodada e o único que importa se perderia no
meio. Vale para as duas formas de morrer — combate normal e tempestade.

### 3. Vitória e derrota com cara própria

Antes, ganhar e perder mostravam quase a mesma tela. Agora são três:

- **Vitória** — confete caindo (10 tiras geradas em JS, com cor, posição
  e atraso aleatórios, para não caírem todas iguais), troféu de um lado,
  saco de PokéCash caindo do outro, sprite do campeão saltando e o valor
  ganho aparecendo grande com o multiplicador e o lucro líquido embaixo.
- **Derrota** — mostra o **seu** Pokémon, não o vencedor: caído, em tons
  de cinza, com selo **K.O.** carimbado por cima. Abaixo, quanto você
  perdeu e qual era o seu ("−100 💎 · você tinha Vileplume"), e uma linha
  de incentivo sorteada entre cinco ("Boa sorte na próxima, treinador!").
  O jingle de vitória também não toca aqui — sai o som de nocaute.
- **Sem aposta** — se você só assistiu, vê o campeão com troféu e confete
  e uma linha discreta avisando que não havia aposta sua na rodada.

Tudo isso é CSS e JS locais: nenhuma imagem nova é baixada, os ícones são
emoji e o confete são `<div>`s coloridos que se removem sozinhos.

---

## Killstreak — abates encadeados

Quem abate dois adversários dentro de **3 segundos** dispara uma
sequência: *double kill* (2), *triple kill* (3), *quadra kill* (4) e
*rampage* (5+). A partir do segundo abate vem um buff temporário, com
uma das três frentes sorteada — ofensiva (Atk+SpA), defensiva
(Def+SpD) ou velocidade — e tanto a força quanto a duração sobem com o
nível:

| Nível | Multiplicador | Duração |
|---|---:|---:|
| double kill | ×1,5 | 5s |
| triple kill | ×1,75 | 8s |
| quadra kill | ×2,0 | 10s |
| rampage (5+) | ×2,0 | 12s |

Na tela: faixa no topo com o sprite do Pokémon e o buff que ele ganhou,
aura vermelha pulsante no bicho enquanto o efeito dura, som próprio e
linha no log. A aura expira pelo relógio da **batalha**, não por
`setTimeout` — então acompanha o replay acelerado.

### Como isso foi calibrado (e por que não quebra as odds)

Buff por abate é um mecanismo de bola de neve: quem mata fica mais
forte e mata mais. Feito sem cuidado, a rodada colapsa no primeiro que
abre vantagem e a aposta perde a graça. Então os valores não foram
escolhidos no olho — saíram de medição, comparando o motor com e sem o
sistema (10 elencos × 4.000 simulações para as odds + 1.000 batalhas
gravadas por cenário):

| Métrica | Sem killstreak | Com killstreak |
|---|---:|---:|
| Concentração (maior chance de vitória da rodada) | 22,1% | **22,0%** |
| Spread favorito/zebra | 11× | **11×** |
| Duração média da rodada | 31,0s | **30,8s** |
| Killstreaks por rodada | — | **1,19** |
| Triple kills por rodada | — | **0,18** |
| Quadra+ por rodada | — | **0,035** |
| Quem fez o 1º multikill venceu | 37,4% | **42,1%** |

Duas leituras importantes:

1. **A distribuição das odds não se move.** Concentração e spread ficam
   idênticos, e a duração também. Ou seja: o sistema adiciona drama sem
   transformar a rodada num resultado cantado.
2. **Os 37,4% da coluna "sem killstreak" não são efeito nenhum** — são
   viés de seleção. Quem consegue um multikill normalmente já estava
   ganhando. O buff acrescenta 4,7 pontos percentuais em cima disso: dá
   pra sentir, mas em quase 6 de cada 10 vezes quem fez o multikill
   **ainda perde**.

A janela de 3 segundos foi escolhida pelo mesmo caminho. Com 8s
saíam 3,5 killstreaks por rodada em 100% das rodadas — o evento virava
rotina e a tela virava um festival de avisos. Com 3s, sai ~1 por
rodada, triple kill é raro e quadra+ é quase um acontecimento.

E como as odds vêm de Monte Carlo rodando **este mesmo** `simulate()`,
os killstreaks já estão embutidos nos números mostrados na hora de
apostar — não existe efeito escondido do apostador.

Mexer nisso: `CONF.STREAK_WINDOW`, `CONF.STREAK_MULT` e
`CONF.STREAK_DUR`.

---

## v0.6 — o que entrou

### Áreas do site (portal)

O projeto deixou de ser só a arena. Agora há **Início**, **Arenas**,
**Como funciona** e **Regras**, com cadastro e login de treinador.

As "páginas" são views trocadas por classe, sem recarregar nada — segue
tudo em arquivo único. Foi uma escolha deliberada: quando existir
servidor, cada view vira uma rota de verdade sem reescrever o conteúdo,
e enquanto isso o protótipo continua abrindo com duplo clique.

- **Início** — landing com proposta, seis destaques do produto e números
  ao vivo (se você já tem sessão, mostra seu nível, rodadas, vitórias e
  saldo em vez dos números genéricos).
- **Como funciona** — os cinco passos da rodada, e a explicação de por que
  a posição no mapa não afeta o resultado.
- **Regras** — dez cláusulas: natureza simulada dos PokéCash, idade
  mínima, como a odd é formada, janela de apostas, determinismo e
  auditoria, clima, killstreaks, empates, desafios e tratamento de dados.
- **Cadastro/login** — nome + PIN opcional de 4 dígitos, com declaração de
  18+ obrigatória no cadastro. O PIN **não é segurança de verdade** e a
  própria tela diz isso: existe para o fluxo estar montado e poder ser
  trocado por autenticação real quando houver backend.

### Nível do treinador

O XP vem de **participar**, com bônus por desempenho:

| Origem | XP |
|---|---:|
| Rodada disputada (piso, sempre entra) | 10 |
| Vitória | +25 |
| Desempenho (quanto foi longe na arena) | +0 a 15 |
| Azarão (odd ≥ 4) que passou da metade | +5 |

Na prática: 10 XP caindo em 12º, 18 XP caindo no meio, 24 XP caindo em 2º,
50 XP vencendo, 55 XP vencendo como azarão.

**O XP não cresce com o valor apostado.** Isso é a decisão central do
sistema: atrelar progresso ao tamanho da aposta transforma o nível num
incentivo a apostar alto, que é exatamente o que não se quer. Quem aposta
10 sobe igual a quem aposta 10.000. E como o piso é por participação, a
barra se move **mesmo perdendo** — o jogador em maré ruim vê progresso em
vez de ver a barra parada justo quando mais precisaria de um motivo para
continuar.

Curva quadrática suave (nível N exige 100·N^1,5 de XP acumulado), medida a
28 XP/rodada de média: nível 2 em 11 rodadas, nível 5 em 40, nível 10 em
113, nível 20 em 320. Rápido no começo, desacelera sem virar parede.

Cada faixa dá um **título** — Novato, Aprendiz, Treinador, Veterano, Ás da
Arena, Elite, Campeão, Lenda — que aparece no perfil e no chip da topbar.
É recompensa simbólica, que não custa economia nenhuma.

No fim de cada rodada aparece a barra de XP com o detalhamento de onde veio
cada ponto, animada, e o aviso de nível novo quando sobe.

### Desafios diários

Três por dia, sorteados de forma **determinística pela data**: todo mundo
pega os mesmos três no mesmo dia, e recarregar a página não permite
"rerolar" até vir um fácil. Vira a meia-noite, entram três novos e o
progresso zera. Cada um tem barra de progresso e vira card verde ao
concluir; a recompensa cai no instante da conclusão e nunca é paga duas
vezes (testado avançando além da meta).

Pool de oito tipos: participar de N rodadas, vencer N, apostar N vezes num
tipo, derrotar N Pokémon de um tipo, apostar em azarão, terminar no top 3,
apostar em N Pokémon diferentes, disputar rodadas com clima ativo.

**Sobre a recompensa** — você deixou em aberto, então proponho: **XP + um
bônus modesto de PokéCash**. Calibrei medindo 60 dias de sorteio: quem
completa os três ganha em média **400 💎/dia** (teto de 480), contra banca
inicial de 1.000 e aposta típica de 100 — ou seja, cerca de **4 apostas
típicas por dia**. É um empurrão para voltar no dia seguinte, não uma
fonte de renda que dispense apostar. Se achar pouco ou demais, o número
está em `DESAFIO_POOL` (campo `dia`) e dá para mexer sem tocar em mais nada.

### Balanceamento: ataques à distância

Você levantou a suspeita de que golpes à distância teriam vantagem por
"fugir enquanto atacam". Medi antes de mexer em qualquer coisa, e a
resposta é **não existe vantagem**:

| Correlação com a taxa de vitória (72 lutadores, 12.000 rodadas) | |
|---|---:|
| Total de stats (BST) — referência | **0,534** |
| % de golpes à distância | **−0,004** |
| % de golpes especiais | −0,118 |

O motivo está no motor: o alvo de cada golpe é **sorteado uniformemente
entre os vivos** e o dano não consulta posição nenhuma. A movimentação é
encenação, deliberadamente — é o que garante que as odds do Monte Carlo
batam exatamente com a batalha exibida. A intuição é muito razoável
olhando a tela; o que ela não mostra é que nada daquilo alimenta o cálculo.

**Mas a investigação achou um problema de verdade ao lado.** O sorteio de
golpes ignorava se o lutador bate melhor no braço ou no feixe: um Tauros
(Atk 100, SpA 40) saía com metade do kit em golpes especiais, desperdiçando
o próprio ponto forte, e um Magneton (SpA 120) saía com zero especiais.

A correção: a escolha passou a ser por **torneio** — sorteia dois
candidatos e fica com o que usa o lado mais forte, mas só com
probabilidade igual ao tamanho do desequilíbrio. Quem é equilibrado
(Blastoise, 83/85) segue sorteando quase à toa; quem é extremo (Gengar
65/130, Golem 120/55) quase sempre puxa para o seu lado. Continua
determinístico e sem repetir golpe.

Efeito medido, confirmado em 3 seeds independentes:

| Seed | Desvio da taxa de vitória | Maior taxa de vitória |
|---|---|---|
| 987654 | 5,18 → **5,10 pp** | 33,7% → **29,7%** |
| 135791 | 5,26 → **5,01 pp** | 34,1% → **28,6%** |
| 246813 | 5,30 → **5,08 pp** | 34,8% → **29,9%** |

O topo comprime uns 5 pontos percentuais — menos favorito quase certo, que
é justamente o que se quer numa casa de apostas.

### Correção do bug de customização

Os enfeites dos cenários (sol da Praia/Céu, brilho do Vulcão) são `::after`
com `position:absolute`, mas a amostra na grade de seleção não era
`position:relative`. Sem âncora, eles subiam até o modal inteiro: o sol
virava uma esfera amarela gigante flutuando por cima da janela e o brilho
do vulcão cobria a faixa de baixo — bloqueando o scroll da grade e o botão
Salvar. Corrigido com `position:relative;overflow:hidden` na amostra,
`pointer-events:none` nos enfeites e uma versão reduzida deles dentro do
quadrinho de 38px.

---

## v0.8 — KillFeed

Quadro novo ao lado do log da batalha, com o ranking de abates da rodada.
Zera a cada nova pool e vai acendendo conforme os abates acontecem: cada
linha traz posição, retrato do Pokémon, nome e total de abates, com
🥇🥈🥉 nas três primeiras. Quem ainda não abateu fica apagado; quem caiu
fica riscado; a linha do lutador em que você apostou ganha um traço
dourado à esquerda. Ao fim da rodada entra o **pódio dos três que mais
abateram, com a odd que cada um tinha** quando as apostas fecharam.

### Como a precisão é garantida

Você pediu excelência na contagem, então o desenho foi feito em torno
disso — e não com um contador solto que "vai somando".

1. **Uma única origem de verdade.** O placar sai da lista de eventos que
   o `simulate()` produziu, evento por evento, conforme o replay chega
   em cada um. Não existe contagem paralela.
2. **Só conta o que é abate.** A regra é
   `!ev.storm && !ev.streak && ev.ko`. Isso importa: os eventos de
   killstreak carregam o índice do atacante, mas não são abates —
   contá-los dobraria o placar justamente de quem mais mata, que é quem
   gera killstreak.
3. **Morte por tempestade não tem autor.** Ninguém a executou, então ela
   vai para um contador separado ("arena") e nunca para o crédito de um
   lutador. O rodapé do quadro informa quantas foram.
4. **Cada evento é aplicado uma vez.** O ponteiro do replay nunca anda
   para trás.
5. **Conferência no fim.** `conferirAbates()` recalcula o placar do zero
   a partir dos eventos e compara com o acumulado ao vivo. Divergindo,
   corrige pelo registro da simulação e avisa no log. Contador
   incremental sem essa conferência é dessincronia esperando acontecer.

### O que os testes mediram

Rodei **6.000 rodadas reais** do motor, comparando dois cálculos
independentes e checando invariantes:

| Verificação | Resultado |
|---|---:|
| Divergência entre os dois cálculos | **0** |
| abates + quedas da arena ≠ mortos | **0** |
| Alguém morreu duas vezes | **0** |
| Auto-abate (atacou a si mesmo) | **0** |
| Evento de killstreak contado como abate | **0** |

Números da rodada típica: **10,96 abates creditados** dos 11 mortos, com
0,04 queda por tempestade (3,6% das rodadas têm alguma). O recorde
observado foi de **8 abates** por um único lutador.

O empate é resolvido por **quem chegou primeiro ao placar** e, só depois,
pela posição na pool. Testei que a ordem não "dança" entre renders — sem
isso, dois empatados ficariam trocando de lugar a cada atualização.

### Um achado dos testes (não é do KillFeed)

Em 5 das 6.000 rodadas (0,08%) os **doze** morreram e ainda assim houve
campeão. Não é bug do KillFeed nem novo: é o desempate já previsto na
Regra 8 — quando a tempestade elimina todos no mesmo instante, vence
quem tinha mais vida um instante antes. O KillFeed trata o caso
corretamente (as quedas vão para "arena", ninguém é creditado
indevidamente), e o invariante continua fechando. Fica registrado porque
nessas rodadas o campeão aparece riscado no ranking — o que é honesto,
mas pode surpreender.

---

## v0.7.1 — telas de resultado e histórico de derrotas

### Um bug só, com três sintomas

Os três problemas relatados — tela de campeão não aparecia, tela de K.O.
não aparecia e derrota não entrava no histórico — vinham da **mesma
linha**.

Ao gravar o histórico na v0.7, o registro da derrota passou a usar a
colocação do lutador (`pos`). Só que `pos` estava declarado com `const`
**dentro do bloco** que apura XP:

```js
if (myBet){
  const pos = posicaoFinal(myBet.idx);   // vive só dentro destas chaves
  ...
}
...
} else if (myBet){          // outro bloco: pos não existe mais aqui
  registrarAposta({ ..., pos: pos });    // ReferenceError
}
```

`const` e `let` têm escopo de bloco, então `pos` já não existia no ramo
de derrota. O erro estourava no meio de `finish()`, **depois** de trocar
a fase, escrever no log e tocar o som, e **antes** de montar o overlay —
por isso a rodada parecia terminar normalmente, mas nenhuma tela de
resultado aparecia e a aposta nunca chegava a ser gravada.

A correção declara a colocação no escopo da função (`minhaPos`), visível
nos dois ramos.

### E uma proteção para não se repetir

XP e desafios são o **extra** da rodada; a tela de resultado e o registro
no histórico são o **essencial**. Na v0.7, um erro no extra derrubava o
essencial junto. Agora a apuração de XP e desafios roda dentro de um
`try`: se algo falhar ali, o jogador continua vendo quem venceu e quanto
ganhou ou perdeu, e o erro vai para o console em vez de sumir em
silêncio.

Testado executando o `finish()` real com um DOM simulado, nos quatro
casos:

| Cenário | Tela | Troféu | Confete | Carimbo K.O. | Histórico |
|---|---|---|---|---|---|
| Venceu | Vitória | sim | sim | — | +1 |
| Perdeu no meio | Derrota | — | — | sim | +1 |
| Perdeu por último | Derrota | — | — | sim | +1 |
| Sem aposta | Vitória | sim | sim | — | 0 |

E os valores gravados conferem: prêmio de 1.077 para aposta de 300 a
x3,59, colocações corretas (1º, 10º e 2º).

### Carimbo de K.O. reposicionado

O carimbo estava em `top:30%` da caixa de resultado. Funcionava quando a
caixa era curta — mas desde que o bloco de XP entrou, a caixa ficou bem
mais alta e 30% dela passou a cair bem abaixo do Pokémon. Agora ele é
ancorado em **pixels no centro do sprite** (`top:48px`, metade dos 96px
da imagem), o que independe da altura da caixa: se amanhã entrar mais
conteúdo embaixo, o carimbo continua onde deve. O sprite segue em cinza,
caído.

---

## v0.7 — PokéCash, carteira e histórico

### A moeda

Os Diamantes viraram **PokéCash**, com câmbio direto e linear:
**10 PokéCash = R$ 1,00**. O ícone passou de 💎 para 💵, já pensando na
arte de cédula que vai substituí-lo.

| Pacote | Preço | PokéCash por real |
|---|---|---:|
| 💵 50 | R$ 5,00 | 10 |
| 💵 100 | R$ 10,00 | 10 |
| 💵 300 | R$ 30,00 | 10 |
| 💵 500 | R$ 50,00 | 10 |
| 💵 1.000 | R$ 100,00 | 10 |

Sem bônus por volume, como pedido: o pacote maior não rende mais por
real do que o menor, então a escolha é de conveniência, não de vantagem.
Quando a promoção entrar, ela nasce em `DEPOSIT_PACKAGES`.

O nome e o símbolo ficam em duas constantes (`MOEDA` e `CUR`) e a taxa em
`PC_POR_REAL` — trocar ali troca em toda a interface, sem caçar valor
solto por vinte lugares. **É esse ponto que passa a apontar para as
imagens das cédulas** quando você mandar os arquivos.

### Valores de aposta

As fichas passaram a usar a mesma escada dos pacotes — 50, 100, 300, 500,
1.000 e "Tudo" — cada uma mostrando o valor em PokéCash e o equivalente
em reais embaixo. Abaixo delas há um **campo livre**: o apostador digita
o valor que quiser, com mínimo de 50 (o menor pacote).

Duas decisões de interface que valem registro:

- Ficha maior que o saldo aparece **desabilitada**, não some. Sumir faz a
  grade mudar de forma e a pessoa não entende por quê; desabilitada, ela
  mostra que existe e que falta saldo.
- Uma linha abaixo diz sempre quanto será apostado, em PokéCash e em
  reais, para não haver dúvida sobre o que está em jogo.

### Carteira e histórico

Novo modal de **Carteira**, aberto pelo link no card de saldo. Traz o
saldo (nas duas moedas), quatro cartões de resumo — Ganhos, Perdas,
Resultado e Depositado — e três abas de histórico:

- **Ganhos** — só as rodadas vencidas, com lucro líquido de cada uma
  (prêmio menos aposta), Pokémon, data, hora e multiplicador.
- **Perdas** — só as derrotas, com o valor perdido e em que lugar seu
  lutador terminou.
- **Depósitos** — cada compra simulada, com valor em reais, PokéCash
  creditado e data/hora. O mesmo histórico continua aparecendo na tela
  de compra, resumido nas últimas quatro entradas.

Cada aba abre com um totalizador no topo. O histórico é guardado no
perfil com teto de **120 entradas** por tipo: localStorage é pequeno, e
histórico infinito estouraria a cota justamente de quem mais joga.

### Recompensa dos desafios, recalibrada

Você apontou certo: com o câmbio existindo, os valores antigos ficaram
altos demais. Os três desafios somavam ~400 por dia — na moeda nova, **R$
40 diários de graça**, mais do que qualquer pacote pequeno, o que
tornaria o depósito irrelevante.

Agora cada desafio paga de 20 a 30 PokéCash (média 25), somando **~75 por
dia — R$ 7,50**, ou 1,5 aposta mínima. Continua sendo motivo para voltar
no dia seguinte sem ser fonte de renda.

### Varredura da economia

Passei em tudo que tocava a moeda antiga: saldo, fichas, texto de aposta,
telas de vitória e derrota, log da partida, medalha de maior prêmio,
estatísticas do perfil, botão de recarga de teste, cartões da home, aviso
de saldo insuficiente e os textos institucionais (regras, cadastro,
landing). Não sobrou nenhuma ocorrência de 💎 nem de "Diamantes" —
verificado por varredura. A aposta mínima subiu de 10 para 50 e o aviso
de saldo insuficiente agora aponta o caminho certo (desafio diário ou
compra).

Uma observação sobre a exibição em reais nas fichas de aposta: o que está
em jogo é PokéCash, moeda simulada. Mostrei o valor em reais como
subtítulo, sempre em segundo plano em relação ao valor em PokéCash, para
dar referência sem sugerir que se está apostando dinheiro real. Se
preferir sem isso nas fichas (mantendo só na tela de compra), é uma linha
para remover.

---

## v0.6.3 — auditoria do elenco e +4 Pokémon-base

### A conferência que você pediu

Antes de adicionar qualquer coisa, verifiquei se os 72 realmente chegavam
ao sorteio. Rodei 40.000 rodadas contando cada aparição:

- **nenhum lutador ficava de fora** — os 72 entravam;
- cada um aparecia ~6.667 vezes, com o esperado sendo 6.667;
- o maior desvio foi de 7,6%, e ele tem explicação: em 1 de cada 5
  rodadas o clima garante um lutador do tipo favorecido na pool, o que
  dá uma leve vantagem de frequência aos tipos de clima (Fogo, Água,
  Voador, Gelo). É o comportamento desejado, não um viés acidental.

Também confirmei que os 72 tinham entrada de sprite e dados de Pokédex,
sem duplicatas.

### Os 4 que faltavam

Você identificou corretamente: **Onix (#095), Hitmonlee (#106),
Hitmonchan (#107) e Lickitung (#108)** são Pokémon-base sem evolução em
Kanto e tinham ficado de fora. Entraram, e o elenco passou de 72 para
**76**.

Os quatro já tinham dados e folhas de animação prontos no projeto (as
quatro animações — andar, parado, atacar, apanhar — existem para todos),
então entram com a mesma arte e a mesma movimentação do resto, sem
tratamento especial.

Golpes atribuídos pelo sorteio determinístico, com o viés ofensivo da
v0.6:

| Lutador | Tipos | Kit sorteado |
|---|---|---|
| Onix | Pedra/Terrestre | Rock Tomb, Earthquake, Stone Edge, Quick Attack |
| Hitmonlee | Lutador | Dynamic Punch, Cross Chop, Close Combat, Body Slam |
| Hitmonchan | Lutador | Dynamic Punch, Hyper Voice, Body Slam, Body Press |
| Lickitung | Normal | Extreme Speed, Body Slam, Hyper Beam, Hyper Voice |

Onix e Hitmonlee saíram com kit 100% físico — correto, já que ambos têm
Ataque bem acima do Ataque Especial. O viés está fazendo o trabalho dele.

### Impacto no equilíbrio (12.000 rodadas)

| Lutador | Taxa de vitória | Posição |
|---|---:|---:|
| Onix | 8,99% | 26º de 76 |
| Lickitung | 4,33% | 61º |
| Hitmonlee | 3,94% | 68º |
| Hitmonchan | 2,59% | 74º |

A média por lutador é 8,33% (12 por rodada). Onix cai no meio da tabela;
os outros três entram como azarões, coerente com os stats que têm — e o
sistema de odds já os precifica assim, que é justamente a graça de ter
azarão numa casa de apostas. Nada quebrado, nada dominante.

E, com 76 no elenco, a conferência de cobertura foi refeita: todos os 76
aparecem no sorteio, com frequência dentro do esperado.

---

## v0.6.2 — as sprites voltaram a ser as certas

### O erro que eu cometi na v0.6.1

Na v0.6 os lutadores ficaram invisíveis. Na tentativa de corrigir, eu
coloquei duas coisas que **descaracterizaram o jogo**:

1. Troquei a fonte primária das folhas de animação por uma CDN
   (jsDelivr). Isso apagou as animações de golpe — saía o balão com o
   nome do golpe e nenhum efeito na tela.
2. Criei um "modo de emergência" que, quando as folhas não vinham,
   trocava o corpo do lutador pelo retrato de batalha do Showdown —
   sprites grandes, de perfil, no lugar das sprites de cima do Pokémon
   Mystery Dungeon.

O item 2 foi o erro mais grave, e não foi um bug: foi uma decisão de
design ruim. Um plano B que troca a identidade visual do produto não é
plano B. "Invisível" é um problema; "o jogo inteiro com a arte errada" é
um problema maior, porque parece funcionar.

### O que a v0.6.2 faz

Voltou tudo ao pipeline que rodava bem:

| | v0.6.1 (errado) | v0.6.2 |
|---|---|---|
| Folhas de personagem | CDN primeiro | **raw do GitHub** (o de sempre) |
| Folhas de efeito | CDN primeiro | **raw do GitHub** (o de sempre) |
| Retratos da Pokédex | CDN primeiro | **raw do GitHub** (o de sempre) |
| Se uma folha falhar | trocava a arte do jogo inteiro | busca **o mesmo arquivo** no espelho |
| Se o espelho falhar | sprites de batalha do Showdown | nada muda — e o log explica |

As URLs geradas foram conferidas uma a uma e são **idênticas** às das
versões que rodaram bem, incluindo os casos especiais (dex 15 e 148, que
usam a folha de Walk como Idle).

O princípio que ficou: **o resgate busca a mesma arte em outro endereço,
nunca outra arte**. O retrato do Showdown voltou a ser usado só onde
sempre foi — na lista de apostas e na tela de vitória.

### Diagnóstico no lugar de adivinhação

O motivo de tudo isso ter virado uma sequência de tentativas é que o
corpo do lutador é um `background-image`, e background **não dispara
`onerror`**: quando a folha não vinha, ninguém era avisado. A arena
seguia rodando — balões, dano, anel de seleção — só sem os bichos.

Agora, se alguma folha não vier nem do endereço original nem do espelho,
o log da partida diz isso uma vez, com os números ("X folhas carregadas,
Y sem resposta"). Isso não corrige nada e não muda nada na tela — serve
para sabermos, da próxima vez, se o problema é de rede/bloqueio de
domínio ou do jogo, em vez de trocar peça no escuro.

---

## Perfil, customização e medalhas

O perfil deixou de ser uma lista de números e virou uma página de
verdade: banner, avatar, abas e medalhas.

**Nenhum asset novo é baixado.** Os cenários do banner são gradiente
CSS puro (praia, floresta, oceano, vulcão, céu, caverna, noite,
campeão), o "personagem" em cima deles é um sprite que o jogo já usa, e
os ícones das medalhas são emoji. Foi uma decisão de propósito: dá
customização visual de verdade sem pendurar mais nenhuma arte de
terceiro num projeto que já precisa trocar os sprites antes de ir ao ar.

- **Avatar** — 16 treinadores clássicos + qualquer um dos 72 Pokémon do
  elenco. Se um sprite de treinador não existir na fonte, a opção some
  sozinha em vez de aparecer quebrada.
- **Banner** — cenário + Pokémon em destaque, escolhidos separadamente.
- **Estatísticas** — saldo, rodadas disputadas, vitórias, taxa de
  acerto, maior prêmio, total apostado e saldo líquido, mais dois
  destaques no topo: **Pokémon parceiro** (o mais apostado) e **tipo
  favorito**.

### Medalhas

Cada medalha é uma métrica com quatro degraus — **bronze → prata → ouro
→ diamante** — e o degrau muda cor, contorno, brilho e animação (a de
diamante ganha até um brilho que atravessa o card). Há uma barrinha de
progresso mostrando o quanto falta para o próximo nível.

Fixas: Vitórias, Rodadas, Total apostado, Maior prêmio, Saldo positivo
e "Parceiro" (o seu Pokémon mais usado, com o nome dele na medalha).
Além dessas, cada tipo tem a sua — Chama, Cascata, Folha, Trovão,
Mente, Punho, Rocha, Alma, Gelo, Dragão — que **só aparece depois da
primeira aposta naquele tipo**, então a coleção cresce junto com o seu
histórico em vez de nascer com um monte de cinza.

Detalhe de implementação que evita uma classe inteira de bug: o nível
não é "concedido" e guardado em lugar nenhum — ele é **recalculado a
partir das estatísticas** toda vez que o perfil abre. Não existe estado
paralelo para dessincronizar.

**Migração:** o schema do perfil cresceu (contagem por Pokémon, por
tipo, avatar, banner). `loadProfile()` completa campo a campo o que
falta, então quem já vinha jogando **não perde o histórico** quando
atualiza — testado carregando um perfil no formato antigo e conferindo
que nome, rodadas e maior prêmio sobrevivem.

---

Sem servidor, "perfil" aqui é o que dá para fazer 100% no navegador: tudo
guardado no `localStorage`. Não é autenticação de verdade, é o suficiente
para prototipar a sensação de "sua conta" antes de existir backend. Botão
de reset zera tudo (perfil e saldo) para poder testar do zero. O conteúdo
das abas está descrito em [Perfil, customização e medalhas](#perfil-customização-e-medalhas).

Abre pelo botão **👤 Perfil** no topo da página.

---

## Depósito de PokéCash (simulado)

Da conversa com o Gemini: em vez de R$1 = 1 ficha (proporção que ele
apontou como psicologicamente fraca), pacotes com sensação de volume e
bônus crescente — R$10 → 1.000 💎, R$25 → 2.750 💎 (+10%), R$50 → 6.000 💎
(+20%), R$100 → 13.000 💎 (+30%).

Aqui é **100% simulado**: clicar num pacote credita na hora, sem cobrança
nenhuma — tem um aviso amarelo bem visível dizendo isso. Serve para testar
se a régua de preços faz sentido antes de plugar um gateway de pagamento
de verdade. Fica registrado um histórico local dos "depósitos" simulados.

Abre pelo botão **💎 Depósito** no topo da página.

---

## Como as odds funcionam (a sua pergunta do Dragonite x5.21)

Você perguntou em que as odds se baseavam, porque o Dragonite ganhou com odd
baixa e o Charizard perdeu com odd 19. Na versão anterior a resposta honesta
era: **em nada**. As odds eram `Math.random()*3+2` e depois recebiam um
empurrãozinho aleatório a cada turno. Não tinham relação nenhuma com quem
tinha chance de ganhar.

Aqui é assim:

1. Antes de abrir as apostas, o mesmo motor de combate roda a batalha
   **20.000 vezes** em memória, cada uma com uma seed diferente.
2. Conta quantas vezes cada um venceu. Se o Corviknight venceu 4.960 de 20.000,
   a probabilidade dele é 24,8%.
3. Odd justa = `1 / 0,248` = **4,03**.
4. Odd oferecida = `4,03 × (1 − 0,08)` = **3,71**. Os 8% são o seu lucro.

Dá para conferir a matemática: a soma de `1/odd` de todos os 12 tem que dar
`1 / (1 − 0,08)` = **1,087**. Se der 1,087, o livro está fechado certo e a
casa tem 8% de vantagem no longo prazo, independente de quem ganhar. Está
dando exatamente isso.

> Detalhe: as odds do vídeo (x1,2 até x4,9) **não fecham** — a soma de `1/odd`
> lá dá 4,68, ou seja, 468% de margem. É decoração de Reels, não um livro de
> apostas real. Não copie aqueles números.

### Por que o leque de odds é grande

Com os stats crus dos jogos, o Pikachu (total 320) contra o Tyranitar (total 600)
dá odd x600. Isso não é bug, é o gap real. Quem controla isso é a constante
`BALANCE` lá no topo do `CONF`:

- `0` → stats crus. Pikachu x600.
- `0.5` → **o valor atual**. Favorito ~x3,7, zebra ~x66.
- `1` → todo mundo idêntico, todas as odds ~x11. Vira cara ou coroa.

Mexa nela até achar o leque que você quer. A regra é pública e igual para
todos, e o Monte Carlo mede o resultado dela — nada é falsificado.

---

## Determinismo: por que isso importa para apostas online

Você levantou a questão certa: o Pedro não pode ver o resultado antes do João,
então não pode existir botão de pausa por usuário.

A solução está na arquitetura. A batalha inteira é calculada **antes** de
aparecer na tela, a partir de um número (a seed), e vira uma lista de eventos
com carimbo de tempo:

```
{ t: 12.4s, atacante: 3, alvo: 7, golpe: 1, dano: 84, critico: false, ko: false }
```

A tela só reproduz essa lista. Mesma seed = batalha idêntica, no seu PC e no
celular do outro. Testado: rodar `simulate(fighters, 123456789, true)` duas
vezes dá exatamente os mesmos 84 eventos.

Quando virar site de verdade:

1. O servidor sorteia a seed e simula a batalha.
2. Manda a seed (ou a lista de eventos) junto com um horário de início.
3. Todos os navegadores reproduzem a partir do mesmo instante. Quem chegar
   atrasado pula para o momento atual.
4. O servidor guarda a seed. Se um jogador reclamar, você mostra a seed e ele
   reproduz a batalha e confere que o resultado é aquele mesmo. É a base de um
   sistema *provably fair*.

O controle de velocidade no painel "Dev" é só para você estudar as animações —
em produção ele não existe, o relógio é do servidor.

---

> **Mapa completo dos 51 golpes** — tipo, poder, classe, precisão e a
> encenação visual de cada um: [GOLPES.md](GOLPES.md)

## Os sprites e a movimentação

### Por que trocamos de pacote de sprites

Os GIFs do Pokémon Showdown são sprites de **batalha**: o bicho fica parado de
perfil mexendo braço, asa e rabo. Não existe ciclo de passo neles, e existe uma
pose só. Por isso ele deslizava no gelo atravessando a ilha, e nada que se
fizesse por cima ia resolver de verdade — dá para fingir o peso do andar, mas
não dá para inventar perna que não está desenhada.

Agora usamos as folhas do [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab),
que são os sprites de **Pokémon Mystery Dungeon** — um jogo top-down, igual à
nossa arena. Cada folha tem:

- **8 linhas = 8 direções.** Linha 0 de frente, 2 de perfil para a direita,
  4 de costas, 6 de perfil para a esquerda. O bicho vira para onde está indo.
- **N colunas = os quadros da animação.**

E existe uma folha por ação: **Andar, Parado, Atacar e Apanhar**. Ou seja:
perna mexendo de verdade, pose de golpe de verdade, e cara de quem levou
pancada de verdade.

Bônus: essas folhas já vêm com os tamanhos relativos corretos. O Gyarados tem
quadro de 88×128 e o Pikachu de 32×40, então o Gyarados aparece como um
bichão e o Pikachu como um bichinho, sem ninguém ajustar nada na mão.

### O pé não patina

O defeito clássico de ciclo de passo é o personagem andar com a perna em
velocidade fixa enquanto desliza pelo chão. Aqui a animação de andar **não
avança com o tempo, avança com a distância percorrida**:

```
quadro = floor( (distância_percorrida / STRIDE) % 1 * número_de_quadros )
```

Andou rápido, pisou rápido. Parou, parou de pisar. É `MOVE.STRIDE` que
calibra isso: se o pé patinar, esse é o número para mexer.

### A coreografia: cada lutador consulta o próprio futuro

Essa é a parte que faz a batalha parecer uma batalha, e ela só é possível por
causa da arquitetura: **a partida inteira já está calculada antes de aparecer
na tela**.

Então cada lutador sabe, com antecedência, que golpe vai dar, em quem e em que
segundo. E se prepara:

- **Quem vai no soco anda até o alvo.** Se daqui a 2,6 s o Lucario vai acertar
  um Close Combat no Tyranitar, o Lucario começa a atravessar a ilha agora, e
  correndo (2,6× a velocidade normal). Chega antes da hora do golpe.
- **Quem atira mantém distância.** O atirador quer ficar a ~78px do alvo. Se já
  está numa distância boa, ele **não sai do lugar** — só vira de frente e
  dispara. Isso é essencial: sem essa regra, os 12 convergem para o mesmo ponto
  e a batalha vira um bolo num canto da ilha.
- **Depois de bater, recua.** Dá uns passos para trás — a não ser que o próximo
  golpe dele já esteja chegando, e aí ir para cima vale mais.
- **Machucado, foge.** Abaixo de 28% de vida, se afasta do inimigo mais próximo.
- **Encara quem interessa.** Vira para o alvo ao atacar, e para o agressor ao
  apanhar.
- **Investida.** Se o golpe é corpo a corpo e mesmo assim ele ficou longe,
  dá um avanço rápido em cima do alvo em vez de socar o ar.

Dá para medir a diferença. Distância entre atacante e alvo no instante do golpe:

| | sem coreografia | com coreografia |
|---|---|---|
| corpo a corpo, distância média | 145px | **36px** |
| corpo a corpo dado de perto (<45px) | 10% | **~90%** |
| à distância, distância média | 150px | **131px** |
| dispersão pela ilha | — | **70** (não vira bolo) |

Antes, 90% dos socos eram desferidos do outro lado do mapa.

**Nada disso muda o resultado.** O vencedor já estava definido pela seed antes
de a primeira pokébola abrir. É encenação em cima de um roteiro pronto — e é
exatamente por isso que continua idêntica na tela de todo mundo.

### Calibragem

| Constante | O que faz |
|---|---|
| `MOVE.STRIDE` | distância de um ciclo de passo. Se o pé patinar, é aqui |
| `MOVE.WALK` | velocidade base de caminhada |
| `MOVE.SEP` | espaço pessoal — o quanto empurram uns aos outros |
| `MOVE.ORBIT` / `ROAM` | o passeio de quem não está fazendo nada |
| `BEHAV.LEAD_MELEE` | antecedência com que o brigador sai para cima do alvo |
| `BEHAV.LEAD_RANGED` | idem para o atirador. **Manter baixo**, senão todos se juntam |
| `BEHAV.MELEE_GAP` / `RANGED_GAP` | distância que cada um quer do alvo |
| `BEHAV.CHARGE` / `FLEE` | multiplicador de velocidade correndo e fugindo |
| `BEHAV.LOW_HP` | vida abaixo da qual entra em modo fuga |
| `SPRITE_MAX_H` | teto de tamanho na tela (segura o Gyarados) |

### Adicionar um Pokémon de fora de Kanto

Os metadados dos quadros ficam na tabela `PMD` (largura, altura e duração de
cada quadro, direto do `AnimData.xml` de cada Pokémon). Estão embutidos no
arquivo de propósito, para o `index.html` continuar funcionando com duplo
clique, sem depender de requisição nenhuma além das imagens.

Para adicionar um Pokémon de outra região: pegue tipo e stats na PokeAPI
(`https://pokeapi.co/api/v2/pokemon/<nome-ou-dex>`) e os quadros em:

```
https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/0025/AnimData.xml
```

(troque `0025` pelo número da Pokédex com 4 dígitos) e acrescente uma linha
em `KANTO_DEX` e outra em `PMD`. Os golpes ele ganha sozinho, via
`assignMoves()` — não precisa escrever moveset à mão.

---

## Onde mexer

Tudo em `index.html`, tudo comentado em português.

| O quê | Onde |
|---|---|
| Duração da rodada, crítico, margem da casa, nº de simulações, balanceamento | `CONF`, logo no começo do `<script>` |
| Duração máxima e a mecânica de tempestade | `CONF.STORM_*` / `CONF.MAX_TIME` e `stormRate()` |
| Elenco ativo: os 76 que entram em jogo | `KANTO_DEX` (filtro de `ARENA_DEX` sobre `KANTO_DEX_FULL`, que tem os 146 brutos) |
| Golpes por tipo e como cada um sorteia os seus | `MASTER_MOVES` e `assignMoves()` — ver [GOLPES.md](GOLPES.md) |
| Tabela de vantagens | `CHART` (18 tipos, regra da geração 6+) |
| Cores de cada tipo | `TCOLOR` |
| Clima: estados, pesos, bônus | `WEATHER_TABLE`, `rollWeather()`, `applyWeather()` |
| Cenário: tamanho da ilha, textura, pokébolas | `buildIsland()` e as constantes `SAND_RX`, `GRASS_RX`, `NSHAPE` |
| Quadros dos sprites (largura/altura/duração) | tabela `PMD` |
| Efeito visual de cada golpe | tabela `MOVE_FX` — ver [GOLPES.md](GOLPES.md) |
| Desenho dos efeitos (projétil, jato, impacto) | `drawSpriteFx()` e `blitFx()` |
| Para onde cada um vai e por quê | `BEHAV` e `decideTarget()` |
| Deslocamento e espaço pessoal | `MOVE` e `stepMovement()` |
| Troca de animação e avanço de quadro | `setAnim()` e `tickAnim()` |
| Ritmo dos ataques | `CONF.BASE_CD` e `CONF.HASTE*` |
| Estatísticas do jogador | `profile` / `loadProfile()` / `recordBetPlaced()` / `recordBetResult()` |
| Telas de vitória/derrota, confete e frases de incentivo | `finish()`, `dropConfetti()`, `CHEER_LINES` e o CSS de `#winBox` |
| Marcação da sua placa de HP | `markMyPlate()` e o CSS de `.plate.mine` |
| Aviso de nocaute do seu lutador | `koToast()` e o CSS de `#koToast` |
| Marcação do seu lutador na arena | `markMyPlate()` / `posSelRing()` e o CSS de `#selRing` e `.mon.mine` |
| Killstreak: janela, força e duração | `CONF.STREAK_WINDOW`, `CONF.STREAK_MULT`, `CONF.STREAK_DUR` |
| Killstreak: aviso, aura e nomes | `applyStreak()`, `STREAK_NAMES`, `STREAK_BUFFS`, CSS de `#streakToast` e `.mon.rage` |
| Medalhas: métricas e degraus | `badgeList()` e o CSS de `.badge.t1`–`.t4` |
| Avatares, cenários de banner | `TRAINER_AVATARS`, `BANNER_SCENES` e as classes `.sc-*` |
| Páginas do site e navegação | as `.view` no HTML e `goView()` |
| Cadastro, login e sessão | `abrirAuth()`, `renderSession()`, `sessaoAtiva()` |
| XP: quanto vale cada coisa | o bloco de `partes` dentro de `finish()` |
| XP: curva de níveis e títulos | `xpParaNivel()`, `nivelDe()`, `TITULOS` |
| Desafios: lista, metas e recompensas | `DESAFIO_POOL` (campo `dia` = 💎, `xp` = XP) |
| Desafios: sorteio do dia e progresso | `rollDaily()`, `ensureDaily()`, `progDesafio()` |
| Viés ofensivo do moveset | `assignMoves()` (o bloco do torneio) |
| Pacotes de PokéCash | `DEPOSIT_PACKAGES` |

Botões da tela:

- **👤 Perfil** — nome e estatísticas de apostas.
- **💎 Depósito** — loja simulada de PokéCash.
- **Auto** — encadeia as rodadas sozinho (apostas → 3,2,1 → batalha → resultado).
- **🔇/🔊** — trilha e efeitos gerados por WebAudio.

### Sobre a música

A trilha fica em `battle-theme.mp3` (raiz do projeto, junto do
`index.html`) e entra **junto com a contagem regressiva**, em fade de meio
segundo. Ela toca em loop durante a batalha e sai em fade quando o
vencedor é definido. Volume no controle deslizante, abaixo dos botões.

O `<iframe>` do YouTube da versão original nunca ia funcionar: navegador
nenhum deixa áudio começar sozinho antes de o usuário encostar na página.
Aqui isso é resolvido de vez, e não só contornado: o `<audio>` só recebe
um `play()` de verdade **uma única vez**, dentro do primeiríssimo
clique/toque/tecla que o usuário der na página (`unlockBgm()`). A partir
daí a faixa nunca mais é pausada — ela fica em loop o tempo inteiro, e o
jogo só mexe em `volume` (0 quando não deve tocar, o valor do controle
quando deve) e em `currentTime` (reinicia do zero a cada rodada). Como
nem volume nem currentTime pedem permissão de gesto — só um `play()`
depois de um `pause()` pediria —, isso funciona mesmo quando a luta começa
sozinha pelo cronômetro (modo Auto), sem nenhum clique no instante exato.
Se por algum motivo `battle-theme.mp3` não for encontrado na pasta, o jogo
tenta automaticamente `audio/battle-theme.mp3` como segunda opção e, se
também falhar, avisa no log da partida — sem travar nada, os efeitos de
combate continuam funcionando normalmente.

Os efeitos de acerto, crítico, nocaute e vitória continuam sintetizados no
WebAudio, sem arquivo — por isso nunca dependeram desse desbloqueio.

**Detalhe do servidor:** áudio precisa de suporte a *Range* no HTTP. Sem
isso o navegador não descobre o tamanho total, o `duration` do `<audio>` vira
`Infinity` e o loop e o reinício a cada rodada quebram. O `serve.js` já
responde `206` corretamente. Abrindo com duplo clique não tem esse problema,
porque o navegador lê o arquivo direto do disco.

**Trocar a trilha:** substitua `battle-theme.mp3` por outro arquivo com
o mesmo nome, ou mude o `src` do `<audio id="bgm">` no `index.html`.

---

## Antes de colocar no ar

Os sprites da arena vêm do PMDCollab e os retratos do Pokémon Showdown, todos
por link direto. Serve para prototipar na sua máquina, mas não serve para
produção: você está usando banda de terceiros e arte que não é sua.

Para qualquer coisa pública os desenhos precisam ser seus. A engine não muda:
ela só precisa de folhas no mesmo formato (8 linhas de direção, N colunas de
quadro) e das medidas na tabela `PMD`. Troca o `PMD_BASE` para a sua pasta e
o resto continua funcionando igual.

Vale o mesmo para a trilha: `battle-theme.mp3` é uma faixa dos jogos, o
que serve para testar aqui na sua máquina, mas numa plataforma no ar seria
mais uma marca de terceiro em cima de um sistema de apostas. Trocar é só
substituir o arquivo.

**Perfil e Depósito são só protótipo de interface.** Tudo fica no
`localStorage` do seu navegador: não existe conta de verdade, não existe
gateway de pagamento, ninguém além de você vê esses dados, e trocar de
navegador ou limpar o cache apaga tudo. Servem para testar se a experiência
faz sentido antes de existir backend/pagamento de verdade — nada disso é
autenticação nem cobrança real, mesmo que a interface pareça pronta.
