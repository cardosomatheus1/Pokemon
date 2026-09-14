# Desenho da Fase 1 — o sub-jogo

> **O que este documento é.** Um refinamento do **§7** da Spec, com as decisões
> tomadas pelo dono do projeto em 29 e 30/08/2026. Ele **não substitui** a Spec:
> onde os dois falarem da mesma coisa, a Spec vence, e o que aqui a contradiz
> precisa virar correção dela no mesmo commit — regra do `CLAUDE.md`.
>
> **O que ele NÃO é.** Escopo aprovado para construir. Só o bloco **1.1** está
> aprovado. O resto está aqui para o 1.1 nascer sabendo para onde a coisa vai, e
> para nenhuma decisão se perder no meio de uma conversa.

---

## 1. A regra que decide tudo

**O Pokémon que você captura NUNCA entra na Arena.** É o princípio **P4**, e o
§22 repete como regra absoluta: *Arena Strength ≠ Owned Pokémon Strength*.

```text
ARENA              normalizada · 12 sorteados do elenco · você APOSTA
IDLE · TORRE       RPG completo · o que você possui é tudo · você JOGA
```

A ponte entre os dois é **informação**, não força: evoluir o seu Charmander
destrava o **dossiê do Charizard** na Arena (§7.10). Seu Charizard não luta —
ele te ensina a ler o Charizard que luta.

**Por que isso não é capricho.** Se o seu Pokémon lutasse, a odd passaria a
depender do que você possui, e o commit-reveal do §4.5 deixaria de provar que a
rodada é igual para todos. O P5 cairia junto.

---

## 2. O elenco de cada modo

Decisão do dono, 30/08:

```text
ARENA            só evoluções finais e bases sem evolução   (76, como hoje)
IDLE + TORRE     as 151 de Kanto, COM os intermediários
FORA DOS DOIS    Mew, Mewtwo, Articuno, Zapdos, Moltres     (ver §6 abaixo)

**Reforçado em 30/08, porque eu tinha lido errado:** a regra dos 76 vale **só
para a Arena**. O `species` do 1.1 NÃO pode derivar do elenco dela — são duas
listas com propósitos diferentes, e tratá-las como uma só é o erro que faz o
intermediário sumir da coleção.

E isso tem consequência de asset: as folhas de overworld que temos cobrem
exatamente as 76 da Arena. Faltam ~75 espécies, e o baixador já sabe buscá-las.
Ver `L-060`.
```

Consequência para o **1.1**: o `species` da coleção é MAIOR que o elenco da
Arena. Charmeleon, Kadabra e Graveler existem no seu time e nunca aparecem numa
rodada. Não muda o desenho; muda o tamanho da conta de arte do `P1.3`.

---

## 3. A instância — o que o jogador vê

Aprovado em 30/08, com os números medidos na prévia
(`tools/previas/captura.html`).

```text
Potencial 0–100    soma de SEIS valores ocultos (0–31), em escala única
Natureza           uma das 25 canônicas, FIXA na geração
Forma              três barras: ofensiva · defesa · velocidade
Foco               escolhido DEPOIS, no Training Center
```

**Um número e não seis, mais três barras.** O mercado precisa de algo
comparável — ninguém compara seis números, todo mundo compara `87 · Adamant`.
Mas o Potencial sozinho mente: um 87 com os pontos no lugar errado vale menos
que um 78 no lugar certo. As barras dão o significado sem virar planilha, e
passam no critério do §7.9.

### O encontro exemplar — e a medição que o obrigou a existir

O desenho original (seis uniformes) foi **reprovado pela prévia antes de virar
código**:

```text
Potencial ≥ 90     0,01%     um em dez mil
30 dias jogando    melhor = 81, nenhum acima de 90
```

Sineta estreita demais: o topo do mercado nunca ganharia estoque e a faixa
"excepcional" seria rótulo decorativo.

**Aprovado:** `exemplar 4% · piso 20`. Uma fração dos encontros nasce com piso
garantido em cada valor oculto — a mesma mecânica que o jogo original usa nas
raids. A curva ganha duas bocas.

```text
com exemplar 4% / piso 20
p99                85     (era 78)
90+ sai 1 em      690     (era 1 em 10.000)
```

O piso é **por valor oculto**, e não no Potencial final: assim dois exemplares
não são iguais, e o mercado não passa a ter um item só.

### Naturezas

Fiéis às 25 canônicas e **fixas na geração**. Natureza editável deixa de ser
diferencial de preço em duas semanas, e o mercado colapsa para "só Potencial" —
achado pelo próprio dono do projeto.

Se um dia existir item de natureza, ele **re-sorteia** em vez de deixar
escolher, é raro e é consumido. **Re-sorteio mantém a loteria viva; escolha a
mata.**

---

## 4. A economia — o laço que precisava ser quebrado

O laço perigoso, descrito pelo dono e confirmado como problema real:

```text
arena → PokéCash → boosta o Pokémon → farma melhor → mais recursos → vende → dinheiro
```

Realimentação positiva sem freio. Em três meses meia dúzia de contas é dona da
economia e jogador novo não entra.

**A regra que o quebra: sorte e tempo viajam na venda, gasto não.**

| o que é | vem de | viaja na venda |
|---|---|---|
| Potencial | sorteio na captura | **sim** |
| Natureza | sorteio na captura | **sim** |
| Nível | doce e PvE — tempo jogado | **sim** |
| Foco | treino, Trainer Coins | **não** — zera |
| Vínculo | uso — o apego com você | **não** — zera |

O mercado passa a precificar **sorte e tempo**, nunca dinheiro. Quem tem muito
PokéCash não fabrica um Pokémon melhor: compra de quem teve sorte — que é o que
faz um mercado existir.

**E o PokéCash da arena compra:** energia e stamina da Torre, itens de evolução,
slots de armazenamento, chaves de baú, cosmético. Vira **oportunidade de
farmar**, e não atributo do que se vende.

### Regra de drop que o dono pediu, e ela vale escrever

> Nem sempre o jogador vai dropar o melhor que ele queria, **mas sempre vai
> dropar algo que ajude a progressão de alguma forma.**

Na prática: **não existe farm que devolva nada.** Encontro que não vira captura
devolve doce da espécie; captura repetida vira doce; andar de torre sem prêmio
grande devolve Trainer Coins ou fragmento. É o mesmo princípio do §7.8 — *a
sessão que termina no vermelho deixa de ser estéril* —, aplicado ao farm.

---

## 5. A loja e o mercado — as duas fronteiras

Decisão do dono, 30/08.

```text
LOJA (dinheiro real)     cosmético · itens leves de conveniência
                         TETO DIÁRIO por item (ex.: 3 boosts de stamina/dia)
                         pode ESTOCAR o que comprou, para planejar o farm
                         NADA comprado na loja entra no mercado

MERCADO (entre jogadores)  o que sai do farm: instâncias, doce, itens de
                           evolução, fragmentos
                           CARÊNCIA antes de poder ser anunciado
```

**Por que o teto diário é a peça central e não um detalhe.** Sem ele, quem
compra 50 boosts farma sem parar, e o P5 cai — dinheiro vira progressão
competitiva. Com ele, dinheiro compra **conveniência dentro de um limite**, que
é a categoria que o §11.2 chama de preferível.

**Por que loja não entra no mercado.** Se entrasse, comprar com dinheiro e
vender no mercado seria conversão direta de dinheiro em dinheiro através do
jogo — e a casa viraria intermediária financeira sem ser.

**A carência antes de anunciar** existe contra a conta descartável: farmar em
conta nova, despejar no mercado e sumir. Prazo **a definir** — 24 h e 48 h estão
na mesa; a decisão precisa de um número medido, não de palpite, e o dado só
existe depois da Fase 1 rodando. Ver `L-058`.

---

## 6. Os lendários — dois tipos de fragmento

Refinamento do dono em 30/08, sobre a `L-057`. **A ideia melhorou e o registro
segue ela.**

```text
FRAGMENTO DE ARTE      drop mais generoso · quantidade ALTA para completar
                       destrava COSMÉTICO: banner de batalha, avatar, arte de
                       perfil do lendário — coisas que já existem no acervo
                       GARANTIDO: junta a quantidade, destrava. Sem sorteio.

FRAGMENTO DE CAPTURA   drop bem mais raro
                       ao completar, dá UMA CHANCE de captura por RNG
```

### A decisão que falta, e as duas opções

Sobre o fragmento de captura, o dono levantou as duas formas e as duas são
defensáveis:

**(a) quantidade alta + drop baixo + captura GARANTIDA no fim.**
Previsível. O jogador sabe exatamente quanto falta, e a barra que enche é o
motor. Risco: vira tarefa longa, e quem chegou ao fim não sente sorte nenhuma.

**(b) quantidade menor + drop um pouco melhor + RNG no fim.**
Mantém a virada. Risco: encher a barra e não capturar é a frustração mais
amarga que um jogo pode entregar — o jogador pagou o preço inteiro e saiu sem
nada.

**Recomendação:** **(a) para o primeiro, (b) para os seguintes.**

O primeiro lendário da conta é **garantido** ao completar — ele é o marco, e
marco não pode depender de sorte. Do segundo em diante entra o RNG, porque aí a
loteria já tem contexto e o jogador não está sem nada. É o mesmo raciocínio do
"piso do primeiro nível" no `D-006`: o começo não pode punir.

E o **cosmético é sempre garantido**, dos dois lados. Ele é a rede que faz toda
raid valer alguma coisa — que é a correção original da `L-057`: *drop de 2% faz
98% saírem sentindo que perderam a noite.*

### O que continua valendo da L-057

Instância lendária **presa à conta**; os drops dela circulam, o Pokémon montado
não. Sem isso o lendário vira o item que domina o mercado na primeira semana.

---

## 7. Os biomas — e a regra de fidelidade

Decisão do dono: os mapas de farm são variados, e **a espécie segue o bioma**.

```text
floresta · praia · campo · montanha · caverna de gelo · vulcão
```

> Um Pokémon de gelo não aparece dentro de uma caverna de fogo.

Isso não é enfeite: é o que dá **razão para escolher onde farmar**, e portanto o
que transforma o idle de espera em decisão. E é o que faz uma espécie ser rara
de verdade — rara porque o bioma dela é caro de acessar, não porque um número
disse que sim.

Consequência para o 1.1: `species` precisa de **bioma** e de **raridade por
bioma**, e não de uma raridade global. Está previsto no modelo abaixo.

---

## 8. O visual — perguntas abertas, e o que já está decidido

### A regra visual, e ela resolve a tensão que estava sem nome

O dono mandou uma referência (jogo idle de Pokémon, mundo em vista de cima) e
disse: **o estilo gráfico agrada, o layout não** — interface demais na tela.

A tensão que ninguém tinha nomeado: a referência é **pastel, dia claro, tileset
de 2004**; o nosso tema é **neon/cyberpunk**. Os dois não se juntam por mistura.
Neon-izar o tileset mata a fidelidade GBA que o dono quer; deixar tudo pastel
mata a identidade que a arena construiu.

A saída é separar por CAMADA:

> **O mundo é GBA. A interface é neon.**

O jogador olha um mundo clássico **através do terminal do PokéArena**. Moldura,
HUD, cantos, brilho e tipografia: neon. Grama, água, sprite e treinador: GBA
fiel, sem filtro.

**Isto não é conveniência — é o que a Arena já faz hoje.** Ela põe sprites de
terceiros dentro de uma interface neon, e é isso que a faz parecer nossa. O idle
herda a mesma gramática, e o jogo inteiro passa a ter UMA regra visual.

É também a "diferença que se pode nomear" que o `CLAUDE.md` passou a exigir: a
referência tem mundo bonito e interface genérica de mobile; a nossa versão tem o
mesmo mundo com uma interface que nenhum outro pokeidle tem.

### O que a referência ensina, item a item

**Copiar:** vista de cima; o treinador andando com o Pokémon atrás; outros
jogadores visíveis com nome — presença é o que separa "farm" de "mundo"; o clima
aparecendo NO mundo, que a nossa arena já faz.

**Não copiar:** três moedas no topo; ponto vermelho de notificação em quinze
lugares; botão nas quatro bordas; duas barras de progresso competindo. O mundo é
a parte bonita e fica com metade da tela.

**Aperfeiçoar:** a interface recua para uma borda só, o mundo ocupa o resto, e o
que não é do momento fica a um clique de distância em vez de sempre visível.

**Decidido:** fiel ao **sprite GBA**, com o tema **neon/cyberpunk** que a arena
já usa. As mesmas sprites de Pokémon da arena. Treinador visível, com **outfit
trocável** (fonte de cosmético para a loja).

**Em aberto, e precisa de decisão do dono depois de ver as direções:**

- como se assiste ao farm idle — o treinador anda pelo cenário? Há animação, e
  ela é opcional (dá para sair e ir jogar na arena)?
- a batalha da Torre é automática, manual, ou o jogador escolhe? A referência
  citada é o formato do Pokerogue, e a regra do `CLAUDE.md` sobre cópia se
  aplica: **a nossa versão precisa de uma diferença que se possa nomear.**
- as sprites do idle e da torre podem divergir das da arena?

**Registrado como `L-059`.** As direções visuais serão apresentadas como
prévias navegáveis, para o dono escolher antes de qualquer arte final.

---

## 9. Gerações futuras — a recomendação que virou requisito do 1.1

Registrado a pedido do dono, 30/08, e é a frase inteira:

> **Não planeje Gen 2 agora, mas construa o 1.1 de um jeito que acrescentá-la
> seja mudar DADO, não mudar CÓDIGO.**

O princípio **P6** já manda isso — *Pokémon, golpes, espécies e arenas devem ser
dados, não lógica*. O que muda aqui é que ele deixa de ser princípio geral e
vira **critério de aceitação do bloco 1.1**.

### Por que não planejar agora

Quantidade de espécie não é alavanca de retenção; é o instinto mais comum de
quem cria jogo e quase sempre erra o alvo. O problema real de retenção deste
produto já está diagnosticado no ROADMAP: *com odd derivada de 1/p o valor
esperado é idêntico para toda aposta — não há o que dominar.* Isso é teto de
habilidade, e cem espécies a mais não conserta.

E há uma distinção que muda a preocupação inteira: **em duas semanas a galera
completa a Pokédex, e não completa a coleção.** Com Potencial e Natureza por
instância, quem tem as 151 continua querendo um Charizard melhor.

### Por que guardar é melhor que lançar

**Não se des-lança conteúdo.** Lançar com 151 e ter a Gen 2 no bolso é
estritamente melhor que lançar com 251: a segunda onda é a reativação mais
barata que existe, e o §15.4 já tem lugar para ela como evento de LiveOps.

Como batida programada para reaquecer o mercado, Gen 2 é ferramenta legítima.
Como conserto de retenção, é tratar sintoma.

### O que isso EXIGE do bloco 1.1, na prática

Nenhuma destas coisas pode virar código:

```text
o número 151            nem como limite, nem como tamanho de array
a lista de espécies     vem do ContentPack, nunca de constante no motor
a lista de biomas       idem — Johto traz biomas que Kanto não tem
a linha evolutiva       dado, inclusive o tipo de requisito
o teto de dex           derivado do pack carregado, e não escrito
```

**O teste que fecha isso** e que o 1.1 precisa ter: carregar um ContentPack com
um número DIFERENTE de espécies e a geração continuar correta, sem nenhuma
alteração em `engine/` nem em `server/`. Se ele passar, acrescentar Gen 2 é uma
tarde de edição de dados. Se não passar, o bloco não fechou.

---

## 10. O que o bloco 1.1 constrói, e só isso

```text
species              dex · nome · tipos · stats · linha · BIOMA · raridade
evolution_chain      de · para · requisito (nível | pedra | elo)
pokemon_instances    dono · espécie · ocultos · potencial · natureza · forma
                     nível · foco · vínculo · exemplar · criado_em
```

Mais a geração no servidor, com RNG próprio separado do de batalha (§22), e a
`engine/instancia.mjs` vinda de `tools/previas/instancia-proposta.mjs`.

**Fora do 1.1:** captura (1.2), dossiê (1.3), doce (1.4), torre (1.5), treino
(1.6), baús (1.7), loja, mercado, raid, biomas na tela.

---

# O SUB-JOGO IDLE — o desenho (30/08/2026)

Decidido com o dono do projeto na sessão de 30/08. O que está aqui é o desenho;
os números são **dado**, e trocá-los é editar um arquivo.

## A intenção, em uma frase

> **O idle é o lado da produção; a Arena é o lado do consumo.**

Sem o idle, a Arena não tem o que vender. Sem a Arena, o idle não tem para que
servir. Não é conteúdo extra — é a outra metade do produto.

```text
IDLE produz      criaturas · níveis · itens · fragmentos de dossiê · Essência
ARENA consome    atenção, e devolve leitura — o dossiê é o que se lê ali
MERCADO liga     o que foi produzido no idle é o que se vende     (§25.1)
```

## A correção que essa conversa trouxe

A primeira proposta fazia o encontro **nascer da rodada apostada**. Está errado,
e o dono viu.

```text
ERRADO   a Arena é a FONTE do encontro       → sem aposta, sem coleção
CERTO    a Arena é um MODIFICADOR temporário → sem aposta, coleção normal
```

Dois motivos, e o segundo é o grave:

1. **de produto** — um idle que só roda quando você aposta não é um idle, é uma
   recompensa de aposta, e o sub-jogo perde a razão de existir;
2. **de proteção ao jogador (§28)** — amarrar progressão de conteúdo ao volume
   apostado cria pressão para apostar por um motivo que não é apostar. Isso não
   passa no checkpoint do §25.1.

A ponte continua existindo e muda de direção: a espécie apostada fica **mais
comum nas expedições pelas próximas horas**. Bônus que some se não for usado,
nunca porta.

## O elenco: 146, e não 76

**A regra dos 76 é da Arena e só dela** (decisão do dono, reafirmada em 30/08).
O idle e a Torre jogam com as 146 — os 151 menos os cinco lendários, que são
bosses de raid (L-057).

```text
pack.especies   146   idle e Torre
pack.elenco      76   Arena
só no idle       70   caterpie, weedle, paras, bellsprout, metapod, kakuna...
```

O `test/expedicao.mjs` tem um teste (`§idle`) que existe só para isto: trocar
`especies` por `elenco` num sorteio apagaria setenta espécies do jogo sem erro
nenhum aparecer.

## Os três perfis de expedição

**A duração muda O QUE se recebe, e não só o quanto.** Se mais tempo fosse
estritamente melhor, a escolha não seria escolha.

| | duração | custo | encontros | **por hora** | raro+ | capturas¹ | raros¹ |
|---|---|---|---|---|---|---|---|
| **Batida** | 45 min | 20 | 4,0 | **5,35** | 1,2% | 3,3 | 0,01 |
| **Trilha** | 3 h | 45 | 7,0 | 2,34 | 4,6% | 5,5 | 0,10 |
| **Vigília** | 8 h | 90 | 12,0 | 1,50 | **16,2%** | 8,3 | 0,60 |

*(5.000 expedições na Floresta por perfil; ¹ esperado com bola ultra)*

**O eixo da troca é ritmo contra sessão**, e não quantidade contra raridade:

```text
jogo ATIVO  rende mais POR HORA
jogo IDLE   rende mais POR SESSÃO
```

Com três horas na frente do computador, quatro Batidas rendem mais que uma
Trilha. Dormindo, a Vigília é a única que existe.

### ENCONTRO NÃO É CAPTURA

São duas peneiras, e a distinção é o que quase fez o desenho dar errado:

```text
ENCONTRO   a expedição volta com uma LISTA de quem apareceu
CAPTURA    você decide em quem gastar qual bola — e pode falhar
```

A primeira versão destes números fazia a Vigília devolver **1,5 encontros**. Com
a peneira da captura em cima, dava **menos de meia criatura por noite de oito
horas**. O dono do projeto perguntou se não estava "muito tryhard" — estava, e a
conta acima é a correção. Existe um teste (`§Q4 · acorda com criatura na mão`)
cuja única função é impedir que isso volte.

## A stamina é da CRIATURA

Barra de energia do jogador diz "você não pode jogar agora". Stamina na criatura
diz "esta equipe está cansada, mande outra".

```text
100 por criatura · regenera 8/h (cheia em ~12 h) · SATURA no teto
custo por CRIATURA enviada · equipe de até 3
simultâneas: 1, sobe até 3 jogando (§P5 — não se compra)
```

A consequência é o ponto: **o teto do farm passa a ser o tamanho da coleção**,
que é justamente o que o jogo quer que cresça. A coleção deixa de ser enfeite e
vira ferramenta.

## O teto diário, e por que ele não tem parâmetro

`TETO_DIARIO = 4`. É o dia cheio desenhado: Vigília dormindo + Trilha à noite +
duas Batidas entre rodadas — **12 encontros por dia**.

O `iniciar()` não aceita nada que o levante, e isso é o §P5 escrito como
ausência de porta. Ver a **L-066**: a loja vai vender boost de stamina por
dinheiro real, e boost que levantasse o teto seria dinheiro comprando dinheiro.

| coleção | expedições/dia sem comprar | o que o boost adicionaria |
|---|---|---|
| 3 criaturas | ~2 | leva a 4 |
| 8 criaturas | 4 | **nada** |

Um teste com `Proxy` anota **toda chave que `iniciar()` lê do estado** e reprova
qualquer uma fora de `concluidasHoje`, `simultaneas` e `limiteSimultaneas`. É a
diferença entre "não achei jeito de burlar" e "não há jeito".

## O que o farm produz

```text
expedição → XP → nível → EVOLUÇÃO → a criatura vale mais
         ↘ encontro → captura → coleção
         ↘ itens → pedras → EVOLUÇÃO (a outra metade dela)
         ↘ fragmentos de dossiê → leitura melhor na Arena
```

A evolução precisa de **nível** (XP) **e** de **pedra** (drop), e é por isso que
as duas saem do mesmo lugar. Um Charmander de potencial 90 não vale muito; um
**Charizard** de potencial 90 vale. O trabalho do idle é essa transformação.

### Os drops (bloco 1.2c)

| drop | de onde | frequência | serve para |
|---|---|---|---|
| **Bolas** | qualquer bioma | constante | tentar a captura |
| **Pedras** | só do bioma dono (`fonte`, já no pack) | incomum | evoluir |
| **Elo de Ligação** | só da Ruína Afogada | raro | as quatro linhas que eram troca |
| **Fragmentos de dossiê** | por espécie **encontrada** | constante | completar a ficha |
| **Essência** | qualquer bioma | constante, pouca | a moeda do idle |
| **Fragmentos de lendário** | biomas específicos | muito raro | acesso à raid (L-057) |

**O fragmento de dossiê cai no ENCONTRO, não na captura.** De propósito: uma
captura que falha ainda deu alguma coisa. Sem isso, um teto de 85% vira 15% de
frustração pura — e frustração é o que faz fechar a aba.

**A Essência só se ganha jogando** (§P5). Ela paga bolas, vagas de expedição e
desbloqueio de bioma. Se ela vira a moeda do mercado é decisão do §25.1.

## O que a raridade derivada produziu sozinha

A faixa mais alta de Kanto tem **uma** espécie: Dragonite (força 600). Mas a
linha dele começa em Dratini, que é **comum**, e mora no Vulcão.

```text
147 dratini    300  comum      vulcão
148 dragonair  420  incomum    vulcão
149 dragonite  600  lendário   praia, vulcão
```

Ou seja: **a criatura mais rara do jogo é alcançável por trabalho**, e não só
por sorte — capturar um Dratini comum e levá-lo ao nível 55. Ninguém desenhou
isso; saiu de derivar a raridade da força em vez de escrevê-la à mão. É o tipo
de coisa que uma tabela escrita à mão não produziria.

## O saque, e a descoberta que deu sentido ao bloco 1.2c

Medindo antes de escrever, apareceu o número que muda o desenho inteiro:

```text
27 encontros por dia   ·   ~14 bolas por dia   ·   cobre 53%
```

**A bola não cobre os encontros, e isso é a mecânica.** Você vê vinte e sete
criaturas e tem tiro para catorze. Qual delas merece a bola boa vira A decisão
do idle — e o fragmento de dossiê, que cai no encontro, é o consolo de quem
ficou para trás.

Fosse um para um, a captura viraria uma fila de cliques sem escolha. É o mesmo
princípio da duração da expedição: o que faz um idle valer a atenção não é a
quantidade, é a decisão.

### O que cai, por dia, na Floresta

| item | por dia |
|---|---|
| Essência | 17,25 |
| Poké Ball | 9,83 |
| Great Ball | 3,49 |
| Pedra das Folhas | 2,62 |
| **Ultra Ball** | **0,88** |

Uma Ultra Ball a cada 1,1 dia. É ela que se guarda para o raro — e guardar só é
decisão quando falta.

### A pedra é do bioma, e isso é a razão de escolher a rota

| bioma | item exclusivo |
|---|---|
| Floresta | Pedra das Folhas |
| Praia | Pedra da Água |
| Campo | Pedra do Trovão |
| Montanha | Pedra da Lua |
| Vulcão | Pedra do Fogo |
| Ruína Afogada | **Elo de Ligação** |
| Gelo · Deserto · Oásis · Estufa · Ferro-Velho | — (ver L-068) |

É o que dá **endereço no mapa** à linha evolutiva do 1.1: a Pedra do Fogo é o
Vulcão, o Elo é a Ruína. Sem isso, todo bioma daria tudo e escolher a rota seria
escolher a cor do fundo.

**Bioma sem pedra não rende menos.** O peso da classe impossível é
redistribuído, e há teste que mede — render menos por um motivo que nenhuma tela
explica é a pior forma de desequilíbrio, porque o jogador aprende a evitar o
lugar sem nunca saber por quê.

### O motor não sabe o nome de nenhuma bola

A tabela sorteia **classes** — bola barata, média, boa — e o pack resolve,
ordenando as dele por multiplicador. Um pack com cinco bolas continua
funcionando sem tocar no motor, e há teste que prova exatamente isso.

Foi o portão `conteudo` do 1.2b que obrigou a fazer assim, e de novo ficou
melhor do que estava.

---

# O DOSSIÊ, E A LOJA (decidido em 31/08/2026)

## O dossiê: cinco análises por espécie, e a ordem é sorteada

Cada espécie tem um **card** com **cinco análises**. Você as desbloqueia
juntando fragmentos daquela espécie — e o fragmento cai no **encontro**, não na
captura.

```text
1  MOVESET        quais golpes ela usa de verdade
2  STATS BASE     os números reais, e não a estimativa
3  COMPORTAMENTO  como ela joga: quem ela mira, quando recua
4  HISTÓRICO      colocação média dela nas rodadas passadas da Arena
5  MATCHUPS       contra que tipos ela vai bem e mal
```

**Qual delas cai é sorteado, e nunca repete.** A primeira análise pode revelar o
moveset; a segunda tem de ser uma das quatro restantes. O card mostra o selo da
etapa — *1ª análise*, *2ª análise* — e a barra reinicia para a próxima.

**Por que sorteado:** liberar tudo de uma vez faz o card ser um interruptor, e
interruptor não tem progressão. Sorteado, cada etapa é uma surpresa útil, e dois
jogadores com o mesmo tempo de jogo sabem coisas diferentes sobre a mesma
espécie — o que dá conversa e dá valor à informação.

**O progresso é da CONTA e nunca reseta.** É o A+ do perfil.

## A calibração, e ela foi medida

```text
fragmentos por análise    comum 4 · incomum 6 · raro 10 · muitoRaro 15 · lendário 25
avistar                   +1 fragmento
CAPTURAR                  +4 fragmentos   (pegar ensina mais que ver)
total para as 146         6.050 fragmentos
```

Simulado com o jogador que **farma com alvo** — escolhe todo dia a rota que mais
avança as fichas incompletas dele, que é o que quem quer completar faz:

```text
perfil            25%    50%    75%    90%   100%   (meses)
casual  12/dia     3,9    8,9   12,4   14,7   28,0
médio   20/dia     2,4    5,4    7,5    8,7   17,0
hard    30/dia     1,4    3,7    5,1    6,1   11,4
```

Um jogador dedicado fecha as 146 em **pouco menos de um ano**. Um casual chega à
metade em nove meses e provavelmente nunca fecha — e tudo bem: o A+ tem de
significar alguma coisa.

## A loja, e o item que resolve o problema dela

A loja é a **monetização do projeto**, e vende cosmético e conveniência. O
problema que ela tinha: o teto diário é por CONTA, então boost de stamina não
aumenta produção — e um jogador hard não teria o que comprar.

**A resposta é vender velocidade no eixo que NÃO É NEGOCIÁVEL entre jogadores.**

```text
o que se VENDE entre jogadores    criatura, item — o mercado
o que NÃO se vende                a sua informação, o seu dossiê
```

O **Boost de Análise** (+50% de fragmento por um período) acelera exatamente o
que ninguém pode comprar de outro jogador. Medido:

```text
                 sem boost   +50%
hard, 100%          11,4      6,8  meses
médio, 90%           8,7      5,3
```

É vantagem real, o jogador sente, e **não coloca uma criatura a mais no
mercado** — então não inflaciona o ativo que a própria loja depende de valorizar.

A mesma lógica vale para o **boost de XP**: nível é tempo, e tempo já viajava na
venda; ele acelera sem criar oferta nova.

## As três moedas

```text
PokéCash    a aposta na Arena              simulada, já existe
Essência    o farm do idle                 só se GANHA jogando (§P5)
Orbe        a loja                         comprada com dinheiro real
```

**Essência** paga bolas, vagas de expedição, desbloqueio de bioma e o Mestre de
Golpes. **Orbe** paga cosmético e boost. As duas nunca se convertem uma na
outra — conversão faria o dinheiro real virar Essência, e Essência vira bola,
e bola vira criatura vendável. É o único cuidado que o desenho precisa.
