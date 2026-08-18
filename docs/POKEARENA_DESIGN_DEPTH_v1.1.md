# PokéArena — Profundidade, Maestria e Retenção v1.1

**Documento:** DESIGN-DEPTH-001 · Revisão 1.1 (mundo do treinador)
**Base:** Master Spec v1.4 · medições feitas sobre o motor da base v0.8
**Pergunta que motivou:** os modos de jogo além da Arena são simples demais para prender o jogador?
**Status:** análise de design com proposta. Altera escopo de V2 a V5.
**Decisões aceitas (§8):** mercados de apuração mútua **sim**; V3 Idle **absorvido em V2**; Liga de Previsão **antecipada para a V2**.
**Alterações da v1.1:** capítulo 11 é novo — evolução, treino, escolha de golpes e ginásios. Ele corrige um desequilíbrio da v1.0.

---

## 1. A preocupação, e por que ela estava certa pelo motivo errado

A preocupação levantada foi: *Collection, Idle, Team e League parecem rasos, e talvez não segurem o jogador.*

Isso procede. Como estão especificados, os quatro são modos genéricos de jogo mobile: coleção é gacha, idle é temporizador, time é autobattler, liga é PvP assíncrono. O PokéArena não tem vantagem competitiva em nenhum deles, e cada um disputa atenção com jogos que fazem só aquilo e fazem melhor.

Mas ao investigar, encontrei um problema **abaixo** desse, no modo principal. E ele muda a pergunta.

---

## 2. O achado: a Arena não tem teto de habilidade

As odds saem de `1/p × (1 - margem)`, onde `p` vem de simulações do mesmo motor que roda a luta. Isso significa que o valor esperado de qualquer aposta é:

```text
EV = p × odd = p × (1/p) × (1 - margem) = 1 - margem
```

O `p` cancela. **Toda aposta tem exatamente o mesmo valor esperado**, para sempre, independentemente de quem aposta, quanto sabe ou em quem aposta.

Medi para confirmar, numa pool fixa, com odds tiradas de 150.000 simulações e o EV medido numa amostra independente de outras 150.000:

| Lutador | Odd | EV | Lutador | Odd | EV |
|---|---:|---:|---|---:|---:|
| Magneton | x3,56 | 0,928 | Charizard | x13,00 | 0,920 |
| Dragonite | x4,40 | 0,919 | Golduck | x14,21 | 0,934 |
| Starmie | x9,78 | 0,914 | Alakazam | x17,11 | 0,914 |
| Tentacruel | x13,46 | 0,911 | Hitmonchan | x52,62 | 0,933 |

Amplitude total: 4,6%, e isso é ruído de amostragem, não sinal — com 150.000 simulações o erro relativo esperado num azarão de p≈0,02 é 1,8%, o que explica a dispersão inteira.

**A melhor aposta possível rende 93%. A pior rende 89%. Na prática são a mesma aposta.**

### O corolário desconfortável

Os dois defeitos de fairness que identifiquei e que a Spec v1.4 manda corrigir eram, por acidente, as duas únicas formas de um jogador ter vantagem:

| Defeito | Vantagem que dava | Bloco que remove |
|---|---|---|
| Clima fora da precificação | +2,90% apostando em Fogo/Água/Voador/Gelo | F0.6 |
| Monte Carlo subdimensionado | até +19% na odd do azarão, por viés de convexidade | F0.7 |

Ou seja: **quanto mais correto o jogo fica, menos habilidade ele tem.** Ao fechar F0.6 e F0.7 — que são correções necessárias e que eu continuo recomendando — a Arena vira uma máquina de −8% perfeitamente justa e perfeitamente inescapável.

### Por que isso importa mais que a profundidade dos outros modos

1. **Não há o que dominar.** Um jogador de xadrez melhora. Um jogador da Arena não pode melhorar, nem em princípio. Não existe curva de maestria, então não existe o motivo de retorno mais forte que jogos têm.
2. **Contradiz o próprio posicionamento.** O §8.3 do mapa mental lista "transparência — odds auditáveis" como diferencial nº 3 e diz que o histórico do lutador "é o que transforma aposta em leitura". Não transforma: com odds perfeitas, não existe leitura possível.
3. **Piora o enquadramento, não melhora.** Ausência total de elemento de habilidade aproxima o produto de jogo de azar puro, que é a categoria mais regulada. Um produto com componente de perícia mensurável tem conversa diferente — ver §9.
4. **É a causa raiz da preocupação original.** O metagame parece raso em parte porque não tem onde se conectar. O núcleo não tem profundidade para alimentar.

---

## 3. Por que o metagame não resolve isso hoje

O princípio **P4 — Arena normalizada** diz que nada do que o jogador possui altera a Arena. Está certo: é o que impede pay-to-win e o que mantém as odds honestas. Não proponho mexer nele.

Mas P4 tem uma consequência que a Spec não enfrenta: se nada do metagame toca a Arena, então **são dois jogos dentro do mesmo aplicativo**, competindo pela mesma sessão. Capturar um Pokémon não melhora nada na Arena. Treinar não melhora. Vencer um ginásio não melhora.

O jogador que veio pela Arena não tem motivo para entrar na coleção. O jogador que veio pela coleção não tem motivo para apostar.

**O problema não é que os modos são rasos. É que são desconectados.**

---

## 4. A saída: conectar por informação e por preço, nunca por poder

Três movimentos. Os três preservam P4 integralmente — nenhum altera a probabilidade de nada.

### 4.1 Um mercado onde o preço vem dos jogadores

Hoje existe um mercado só: quem vence, com odd fixa que a casa calcula. É onde não há habilidade possível, e deve continuar existindo — é a porta de entrada, é transparente, e é o que a casa sabe precificar com honestidade.

A proposta é acrescentar **mercados secundários com apuração mútua** (*pari-mutuel*): os jogadores apostam num bolo, o bolo é dividido entre os acertadores em proporção ao valor apostado, e a casa retira uma taxa fixa e **não toma posição**.

```text
Mercado principal   quem vence          odd fixa, preço da casa, margem 8%
Mercados mútuos     abates, pódio,      preço formado pelos apostadores
                    duração, tempestade  casa só retira taxa
```

Três coisas mudam de uma vez:

**Passa a existir habilidade.** No mútuo, a vantagem vem de precificar melhor que os outros apostadores, não de vencer a casa. Quem entende que um lutador com odd alta costuma fazer muitos abates antes de cair encontra preço bom quando o bolo está mal distribuído. Isso é perícia real, treinável, com teto alto.

**O passivo da casa vai a zero naquele mercado.** O problema de exposição do §4.4.6 — passivo de 287.500 PC num único bilhete — simplesmente não existe em apuração mútua. A casa nunca paga do próprio bolso.

**A transparência aumenta em vez de diminuir.** A casa **pode** precificar esses mercados com o mesmo Monte Carlo, e a proposta é que **publique o preço do modelo depois da liquidação**, não antes. O jogador vê onde acertou e onde errou contra o modelo. Isso é uma ferramenta de aprendizado, e é honesto: a casa não esconde um preço que usa, ela escolhe não tomar posição e mostra a conta depois.

> **Cuidado de desenho, e é o principal:** se a casa publicar a probabilidade exata **antes**, o bolo converge para ela e a habilidade desaparece de novo. O que se publica antes é a distribuição do mercado — quanto está apostado em cada opção. O modelo sai depois.

### 4.2 Informação como moeda do metagame

Com mercados mútuos existindo, informação passa a valer dinheiro — e o metagame ganha uma razão de existir que não viola P4.

O servidor já roda 150.000 simulações por rodada. Ele sabe muito mais do que mostra:

```text
o que a Arena publica hoje     a odd de vitória
o que ela já calculou e cala   taxa de vitória histórica por espécie
                               média de abates e variância
                               colocação típica
                               desempenho por clima
                               perfil de risco: morre cedo x sobrevive muito
                               desempenho contra composições de tipo
```

**Proposta:** essa informação vira o objeto do metagame. Não se compra — se conquista.

```text
Coleção      capturar uma espécie libera o dossiê dela
Idle         expedições produzem relatórios e estreitam intervalos
Jornada      vencer um ginásio ensina uma interação e libera a ferramenta
             de comparação daquele tipo
Liga         acesso a dados agregados de temporada
```

Isso resolve as duas pontas de uma vez. O apostador tem motivo para colecionar: ele quer o dossiê do Onix porque aposta nele. O colecionador tem motivo para apostar: é onde o dossiê rende.

E respeita P4 sem asterisco: o dossiê **não muda nenhuma probabilidade**. Muda o que o jogador sabe. Dois jogadores na mesma rodada veem a mesma batalha e as mesmas odds; um sabe ler melhor.

> A ideia não é nova neste projeto — é o "histórico do lutador" do §7 do mapa mental, que já tinha sido identificado como valioso e engavetado por falta de amostra. Com servidor e 150.000 simulações por rodada, o problema de amostra deixa de existir.

**Guarda-corpo obrigatório:** o dossiê nunca pode ser vendido por dinheiro. No momento em que informação com valor de aposta é comprável, o produto vira pay-to-win econômico, o que fere P5 tão gravemente quanto vender probabilidade feriria P4. Dossiê se ganha jogando, ponto.

### 4.3 Maestria visível: calibração como métrica de progressão

Hoje o nível do treinador vem de XP por participação. Isso mede presença, não perícia.

**Proposta:** medir e mostrar **calibração** — o quanto as previsões do jogador batem com o que acontece. É a métrica padrão de mercados de previsão e tem propriedades boas para este produto:

- é uma escada de maestria real, com teto alto e melhora observável;
- **não depende de apostar dinheiro** — dá para pontuar previsão sem aposta, o que cria uma faixa de progressão para quem não quer arriscar, e ajuda no capítulo 28;
- é comparável entre jogadores sem ser zero-soma;
- responde à pergunta "estou melhorando?" com um número honesto.

```text
Ranking de calibração    "você está melhor calibrado que 87% dos treinadores"
Nível por perícia        o título vem da calibração, não do tempo de tela
Histórico de leitura     onde você discordou do modelo, e quem estava certo
```

---

## 5. O que cada modo passa a ser

### V2 — Collection

**Era:** capturar bichos que não servem para nada na Arena.
**Passa a ser:** montar sua base de informação. Cada espécie capturada abre o dossiê dela. A Pokédex vira o painel analítico do apostador.

Os cinco estados da Pokédex ganham significado econômico:

```text
SEEN         apareceu numa rodada sua           só o nome
ENCOUNTERED  você apostou nela                  taxa de vitória bruta
CAPTURED     você a capturou                    dossiê completo
MASTERED     capturou várias / cumpriu missão   desempenho por clima e matchup
```

Isso dá à captura uma progressão que o jogador **sente na rodada seguinte**, que é o que falta hoje.

### V3 — Trainer Idle

**Era:** temporizadores que produzem moeda.
**Passa a ser:** pesquisa. Expedições produzem relatórios: estreitam o intervalo de confiança de uma espécie, revelam desempenho dela sob um clima, ou mapeiam um matchup.

**E aqui vai a pergunta honesta:** o V3 é o modo mais fraco dos quatro e o mais caro de fazer bem. Idle funciona quando o recurso produzido é desejado; se o recurso é informação, boa parte do valor já vem de V2. Vale considerar **cortar o V3 como fase própria** e absorver expedições como uma aba de V2. Isso encurtaria o roadmap em seis blocos e concentraria esforço em V4 e V5, que são mais diferenciados. Fica como decisão em aberto — ver §8.

### V4 — Team & Kanto Journey

**Era:** um segundo jogo de batalha dentro do aplicativo.
**Passa a ser:** onde se aprende a ler o motor. Cada ginásio é um quebra-cabeça com solução conhecida que ensina uma interação — tipo, velocidade, físico contra especial, o efeito da tempestade. O jogador sai da jornada sabendo prever melhor.

Reposicionar assim resolve o problema de duas engines competindo por atenção: a Trainer Battle Engine passa a ser **o simulador de treino** da Arena Engine, não um jogo rival.

### V5 — League

**Era:** PvP assíncrono de autobattler, genérico.
**Passa a ser:** a expressão competitiva das duas perícias, em duas ligas separadas:

```text
Liga de Equipe      6x6 assíncrono, como já especificado
Liga de Previsão    ranking por calibração; sem stake, sem risco econômico
```

A Liga de Previsão é barata de construir — a infraestrutura de pontuação já existe se §4.3 for feito — e é a que melhor casa com a identidade do produto. Também é a única modalidade competitiva que **não** depende do checkpoint regulatório do §25.1, porque não movimenta valor.

---

## 6. Por que isto é retenção e não enfeite

O laço que passa a existir:

```text
        aposta  ──────────►  descobre que não sabe ler um lutador
          ▲                              │
          │                              ▼
   dossiê rende                    caça a espécie
          ▲                              │
          │                              ▼
   captura libera dossiê ◄────── entra na coleção
```

Cada volta é um motivo de retorno que não depende de recompensa diária nem de temporizador. O jogador volta porque **quer saber uma coisa específica**.

Compare com o desenho atual, em que o laço é: aposta → ganha ou perde → recebe XP por participar → volta amanhã porque o desafio diário renova. Esse é o laço que o jogador abandona quando o desafio diário deixa de parecer relevante, e é o que a simulação de oferta do Estudo Econômico §6 já mostrou saturar.

---

## 7. O que isso muda na economia

| Item | Efeito |
|---|---|
| Passivo por rodada | vai a zero nos mercados mútuos; o teto do §4.4.6 continua valendo só no mercado principal |
| Receita | taxa de mercado mútuo é sink como o rake, **não** é receita em reais no instante — mesma regra do §1 do Unit Economics |
| `protection_volume_drag` | a Liga de Previsão sem stake dá caminho de progressão a quem está sob limite, o que **reduz** o atrito entre proteção e engajamento |
| Meses ativos | é a variável que mais move o LTV no modelo; o laço de informação ataca exatamente ela |
| Emissão | dossiê é recompensa **não monetária** — exatamente o "substituto não monetário" que o §6 do Estudo Econômico pede para quem bate o teto de emissão |

Esse último ponto é forte: o teto de emissão de PC-B precisa de algo para dar ao jogador que já acumulou moeda. Informação é a recompensa ideal — desejável, sem inflação, e alinhada ao núcleo.

---

## 8. Decisões em aberto

1. **Aceitar mercados de apuração mútua?** É o movimento estrutural. Sem ele, a Arena continua sem teto de habilidade e o resto desta proposta perde metade do valor.
2. **Cortar o V3 como fase própria** e absorver expedições em V2? Economiza seis blocos.
3. **Qual mercado mútuo vem primeiro?** Abates é o candidato natural: o KillFeed já produz o dado, e o §6 do roadmap original já listava "aposta em abates" como item de médio prazo.
4. **A Liga de Previsão entra antes da V5?** Ela é barata, não tem risco regulatório e ataca retenção cedo. Há argumento para trazê-la para a V2.

---

## 9. Consequência regulatória — para levar à consulta do §0.5.1

Não sou advogado e isto não é orientação jurídica. Mas três pontos mudam a conversa e precisam entrar na mesma consulta:

1. **Apuração mútua é categoria distinta de quota fixa** em vários regimes, justamente porque a casa não toma posição. Perguntar explicitamente se muda o enquadramento.
2. **Elemento de perícia mensurável.** Um produto onde o resultado do jogador depende comprovadamente de habilidade tem tratamento diferente de um onde não depende. Hoje o PokéArena está no segundo grupo, e isso é demonstrável — a medição do §2 é a prova.
3. **A Liga de Previsão sem stake** provavelmente não é atividade regulada em regime nenhum. Se for esse o caso, ela é a via de crescimento com menor risco do projeto inteiro, e isso reordena prioridades.

---

## 10. Como validar antes de construir

Nada aqui deveria ser construído inteiro com base neste documento. O caminho barato:

| Hipótese | Teste barato |
|---|---|
| Existe apetite por mercado de abates | abrir o mercado com moeda simulada e sem dossiê; medir participação |
| Informação muda comportamento de aposta | liberar dossiê para metade dos jogadores; comparar diversidade de aposta e sessões |
| Calibração é motivo de retorno | publicar o ranking de calibração antes de qualquer recompensa atrelada |
| Coleção puxa aposta | medir se quem captura passa a apostar mais na espécie capturada |

As quatro cabem dentro da V1 mais um bloco cada, e as quatro respondem antes de comprometer V2 a V5.

---

# 11. O mundo do treinador — evolução, treino, golpes e ginásios

## 11.1 O que a v1.1 corrige

A revisão v1.0 resolveu um problema real — os modos estavam desconectados do núcleo — e criou outro no caminho: ao conectar tudo por **informação**, ela transformou o metagame em analytics e deixou de fora a fantasia que é o coração do gênero. Criar, treinar, evoluir, escolher golpes, vencer o ginásio.

Isso não é enfeite nostálgico. É o motor de retenção mais testado que existe nesse tipo de jogo, e ele opera por um mecanismo que o dossiê não alcança: **apego**. Um relatório de desempenho do Onix é útil. *O meu* Onix, que eu criei desde o começo e que passou do ginásio de Pedra no limite, é outra coisa.

As duas precisam coexistir. Este capítulo mostra como, sem tocar em P4.

## 11.2 A regra que dá espaço para tudo

O P4 diz que nada que o jogador possui altera **a Arena**. Ele **não** diz nada sobre o resto do jogo.

```text
Arena          normalizada, odds honestas, o que você possui é irrelevante
Mundo do       RPG completo — nível, evolução, golpes escolhidos, time,
treinador      ginásios. O que você possui é tudo
```

A separação não é limitação, é o desenho. O problema nunca foi que o Pokémon possuído não entra na Arena — foi que **não havia razão para ir de um lado ao outro**. A v1.0 construiu uma ponte (informação, do mundo do treinador para a Arena). Faltava a ponte de volta.

## 11.3 A ponte que faltava: a Arena alimenta o time

**Proposta:** apostar passa a render matéria-prima para criar.

```text
aposto no Onix  ──►  Onix vence  ──►  PokéCash  +  Doce de Onix
                                                        │
                                                        ▼
                                          o MEU Onix sobe de nível
```

O doce de espécie já existe na Spec (§6.9, `Species Candy`), hoje sem propósito claro. Ligá-lo ao resultado da aposta faz três coisas de uma vez:

1. **Suas escolhas de aposta moldam seu time.** Quem aposta muito em Pedra cria um time de Pedra. A identidade do treinador emerge do comportamento, não de um seletor de classe.
2. **Perder deixa de ser estéril.** Aposta perdida ainda rende doce reduzido da espécie — você não levou o dinheiro, mas avançou o bicho. Isso ataca diretamente o ponto mais frágil da retenção num jogo de aposta: a sessão que termina no vermelho.
3. **Não fere P4 nem P5.** O doce não compra probabilidade, não entra na Arena, não é transferível. É recurso de PvE.

> **Guarda-corpo:** o doce precisa vir do **fato de a espécie ter vencido**, não do valor apostado. Escalar com o valor transformaria criar Pokémon em motivo para apostar mais alto, que é exatamente o incentivo que o capítulo 28 existe para não criar.

## 11.4 De onde vem o Pokémon que você cria

Aqui há um problema que precisa ser resolvido antes de tudo: **o elenco da Arena é só evolução final** (76 lutadores, por decisão da v0.3). Se a captura viesse do que aparece na Arena, o jogador só capturaria formas finais — e não haveria evolução nenhuma para jogar.

**Proposta:** a captura na Arena rende a **forma base** da espécie, não o lutador que apareceu.

Isso é mecanicamente necessário e tematicamente melhor do que a alternativa:

> Você viu o campeão lutar. O que você leva para casa é um ovo.

O jogador assiste ao Charizard dominar a arena e sai com um Charmander. A distância entre os dois **é o jogo**. Nada explica melhor por que vale a pena criar.

Espécies sem pré-evolução (Tauros, Ditto, Snorlax, Lapras e as outras 15 do elenco) vêm na própria forma — e viram naturalmente a faixa de entrada, porque não exigem cadeia de evolução para serem usáveis.

## 11.5 Evolução: uma escolha com consequência em dois sistemas

Evolução automática por nível é progressão sem decisão. A proposta é dar peso à decisão, com um trade-off que existe nos jogos originais e que aqui ganha uma segunda camada:

```text
evoluir agora    ── stats maiores, acesso ao ginásio seguinte
                 ── libera o DOSSIÊ da forma final na Arena

esperar          ── a pré-evolução aprende golpes que a forma final não aprende
                 ── amplitude de moveset para PvE e Liga de Equipe
```

A segunda linha é a que amarra os dois documentos: **a Arena só tem formas finais, então evoluir é como se destrava a análise dos lutadores em que você realmente aposta.** O jogador que quer o dossiê do Charizard precisa evoluir o Charmander dele. A fantasia de RPG e a economia de informação passam a puxar na mesma direção em vez de competir.

E o custo de esperar é real: quem segura a evolução por causa de um golpe tem PvE mais difícil e demora mais a destravar a análise.

## 11.6 Golpes: a mecânica de RPG que é o tutorial do jogo de aposta

Na Arena, os quatro golpes de cada lutador saem de `assignMoves` — determinístico por espécie, com viés ofensivo que privilegia o lado mais forte do bicho. O jogador não escolhe e nem vê o porquê.

No mundo do treinador, **o jogador escolhe**. E é aí que está a oportunidade que nenhum outro jogo desse tipo tem:

> Ao montar o moveset do seu Pokémon, um botão mostra **o que a Arena escolheria para aquela espécie, e por quê** — e deixa comparar.

```text
seu Charizard         Lança-Chamas · Voar · Terremoto · Garra de Dragão
Charizard da Arena    Lança-Chamas · Rajada de Fogo · Voar · Bicada
                      (viés ofensivo: SpA 109 > Atk 84 → prioriza especial)
```

O jogador que faz isso vinte vezes aprende, sem aula nenhuma, como os lutadores da Arena são construídos — e passa a olhar uma pool de 12 e enxergar quais estão bem montados. É perícia de aposta adquirida por meio de uma mecânica de RPG.

Esse é o tipo de conexão que a v1.0 procurava e não achou: a mecânica não é uma ponte *para* o núcleo, ela **é** treinamento do núcleo.

## 11.7 Treino: legível, não profundo

O §21 da Spec já proíbe IV/EV/Natures completos, e está certo — é complexidade que afasta sem criar decisão interessante para este público.

```text
Nível              cresce com doce e com PvE
Foco de treino     Training Center concentra crescimento em uma frente
                   (ofensiva, defensiva, velocidade), com custo de trocar
Vínculo            sobe com uso; dá bônus pequeno e é onde mora o apego
```

Três eixos, cada um com efeito visível numa tela. Se o jogador não consegue explicar para um amigo o que o treino fez, o sistema está complexo demais.

## 11.8 Ginásios: onde o Monte Carlo vira treinador

Este é o item com maior retorno de todo o capítulo, e ele só é possível **porque este jogo tem um motor de simulação**.

Antes de desafiar um ginásio, o jogo mostra:

```text
        Ginásio de Pedra — Brock
        seu time vence 23% das vezes

        maior fraqueza: nenhum golpe seu é super-efetivo contra Pedra
        se trocar Pidgeotto por Squirtle:  61%
```

O jogador **manipula uma probabilidade e vê o número se mexer**. Ele monta time, troca golpe, evolui, e observa o efeito. Isso é exatamente a habilidade que a Arena cobra — ler probabilidade a partir de composição de tipos e stats — praticada num ambiente onde ele tem controle, que é a única forma de aprender.

Depois ele volta para a Arena, onde só pode ler, e lê melhor.

```text
Mundo do treinador   probabilidade que você MANIPULA   → aprende
Arena                probabilidade que você só LÊ      → aplica
```

Nenhum outro jogo de criaturas pode fazer isso, porque nenhum outro publica as próprias probabilidades. Aqui o motor já existe e o número já é calculado — falta só mostrá-lo.

Os ginásios ficam com identidade de tipo e ordem clássica, e cada um ensina uma interação específica: Brock ensina fraqueza de tipo, Misty ensina que velocidade decide trocas apertadas, Lt. Surge ensina imunidade, Sabrina ensina físico contra especial.

## 11.9 O laço completo

```text
      aposto numa espécie
              │
              ├──► ganho PokéCash               (economia)
              └──► ganho doce daquela espécie
                          │
                          ▼
              crio, treino e evoluo o meu
                          │
                          ├──► libero o dossiê da forma final  ──┐
                          │                                      │
                          ▼                                      │
              escolho golpes e comparo com os da Arena           │
                          │                                      │
                          ▼                                      │
              passo do ginásio, vendo minha % subir              │
                          │                                      │
                          ▼                                      │
              aprendo a ler composição de tipo e stat            │
                          │                                      │
                          ▼                                      │
              leio melhor a pool ◄─────────────────────────────--┘
                          │
                          ▼
              aposto melhor nos mercados mútuos
```

Três motivos de retorno diferentes, para três perfis diferentes de jogador, no mesmo laço: quem volta pelo dinheiro, quem volta pelo bicho, e quem volta para ficar melhor. Nenhum deles depende de recompensa diária ou temporizador.

## 11.10 O que isso muda no roadmap

| Decisão anterior | Ajuste |
|---|---|
| V3 absorvido em V2 | mantido, mas o que é absorvido muda: expedições viram fonte de **encontro e doce**, não só de relatório |
| Collection = dossiê | passa a ser Collection = **criar** + dossiê. Captura rende forma base |
| V4 = ensinar a ler o motor | confirmado e reforçado: ginásios com probabilidade exibida são o mecanismo |
| Doce de espécie | sai de recurso sem propósito e vira a ponte Arena → mundo do treinador |

Isso acrescenta blocos à fase de Collection: cadeia de evolução, moveset escolhido pelo jogador, comparador com a Arena, e o cálculo de probabilidade de ginásio.

## 11.11 Riscos que este capítulo cria

1. **Duas curvas de progressão competindo pela sessão.** Calibração e nível do time medem coisas diferentes e podem puxar o jogador para lados opostos. Mitigação: manter uma tela inicial só, que mostre as duas e o próximo passo de cada.
2. **O doce pode virar motivo para apostar mais.** Por isso a regra de não escalar com valor apostado. Precisa de teste explícito no bloco.
3. **PvE mal calibrado vira paredão ou passeio.** A probabilidade exibida ajuda o jogador, mas exige que o balanceamento dos ginásios seja medido, não estimado — mesmo método do killstreak e das odds.
4. **Escopo.** Evolução, moveset e ginásios com probabilidade são bem mais trabalho que a Collection original. Se for preciso cortar, cortar **treino** (§11.7) antes de cortar evolução ou escolha de golpes: treino é o eixo com menos decisão por unidade de esforço.
