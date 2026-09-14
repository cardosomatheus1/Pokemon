# A economia de itens — a análise, e o que ela decide

Escrito em 02/09/2026, no bloco 1.12, a pedido do dono:

> "essa lista abre DIVERSOS LEQUES e oportunidades, então precisa ser MUITO BEM
>  ANALISADO MINUCIOSAMENTE para se ver a melhor maneira de aplicar dentro da
>  nossa metodologia"

E com a exigência de negócio dita em letras maiúsculas, que é o que este
documento existe para resolver:

> "A LOJA MONETIZADA PRECISA VIRAR LUCRO, MESMO QUE BARATO, NEM QUE UM OUTFIT
>  CUSTE APENAS 5 REAIS"

---

## 1. A pergunta que precisa ser respondida antes de todas as outras

Não é "quanto cobrar". É:

> **O que a loja pode vender sem que o jogo pare de valer a pena para quem não
> compra?**

A resposta decide tudo o resto, e ela tem uma forma que dá para aplicar item a
item:

> **A loja de dinheiro real vende o que se VÊ e o que se ESCOLHE. Nunca o que
> DECIDE uma batalha, e nunca o que ANDA MAIS RÁPIDO.**

### Por que essa linha é comercial, e não moral

Numa loja que vende poder:

```text
quem não compra PERDE      →  e quem perde para de jogar
quem para de jogar         →  não compra a próxima skin
quem compra                →  compra por OBRIGAÇÃO, uma vez, e se ressente
o teto de gasto            →  é o poder máximo, e depois dele não há o que vender
```

Numa loja que vende identidade:

```text
ninguém PRECISA comprar    →  então ninguém se ressente de quem comprou
quem compra                →  compra por GOSTO, e por gosto se compra de novo
o teto de gasto            →  não existe: sempre cabe mais um visual
a base fica                →  e base que fica é a única coisa que gera receita
```

**A segunda vende mais, e vende por mais tempo.** É por isso que a regra está
aqui e não num documento de conformidade.

E há um segundo motivo, específico deste produto: o §25.1 e o §0.5.1. Num jogo
em que o que se farma pode ser vendável por dinheiro real (L-094), vender poder
por dinheiro é o padrão exato que reguladores tratam como caixa de recompensa
com saque. A linha acima mantém a porta fechada sem custar receita.

---

## 2. As cinco portas

Todo item entra no jogo por exatamente uma:

| porta | moeda | o que passa por ela | por quê |
|---|---|---|---|
| **drop** | tempo | pedras evolutivas, held items de efeito pequeno | a surpresa do farm |
| **troca** | Essência | rochas de clima, orbes, o que acelera | a escolha de quem sabe o que quer |
| **baú** | Torre | os Choice, os Focus, a Master Ball | o poder que se conquista |
| **loja** | PokéCoin | bolas | consumível de rotina |
| **dinheiro** | R$ | **nenhum item desta lista** | ver a regra acima |

**Uma porta por item, e uma só.** Duas portas é a mais barata vencendo e a outra
virando decoração — e o jogador aprende a ignorar a que perdeu.

### A regra de repartição entre as três primeiras

> **Quanto mais o item muda uma batalha, mais longe da sorte ele fica.**

```text
Leftovers   +1/16 de HP por turno      →  CAI
Flame Orb   uma condição, com custo    →  TROCA por 90 de Essência
Choice Band +50% de Ataque             →  BAÚ, andar 4 da Torre
Focus Sash  sobreviver a um golpe      →  BAÚ, andar 10
```

Se os Choice caíssem no farm, um jogador **azarado ficaria atrás de um sortudo
naquilo que decide o combate**, sem que nenhum dos dois tivesse feito nada
diferente. Isso é o pior tipo de desigualdade num jogo competitivo: a que não se
pode corrigir jogando melhor.

---

## 3. Onde há dinheiro nesta lista, e é mais do que vender o item

O catálogo tem 34 itens e **zero** à venda por dinheiro. Isso não é receita
perdida — é receita movida para onde ela rende mais.

> **Vende-se a SKIN do item, nunca o item.**

Uma Poké Ball com acabamento próprio, que captura exatamente igual, é cosmético
puro. Quem comprou não ganha nada de quem não comprou. E é justamente por isso
que mais gente compra: não é uma taxa de entrada, é um gosto.

### O que a loja monetizada vende, hoje e já

O jogo já tem estas superfícies construídas, e todas são vendáveis sem tocar em
poder:

```text
OUTFIT do treinador        já existe (esteira de outfit, L-070/L-072)
AVATAR                     já existe
BANNER de batalha          já existe, e é o que mais aparece na tela
EFEITO DE NOME             já existe
SKIN de arena              já existe (as artes de arena)
MOLDURA                    já existe
```

E as que este bloco abre:

```text
SKIN DE BOLA               a mesma bola, outro acabamento
SKIN DE ITEM SEGURADO      o Leftovers aparece no banner? então tem skin
CORES DE MOCHILA           a vitrine que o jogador olha todo dia
```

### O preço, e por que R$ 5 é o número certo

O dono já disse o número, e ele está certo pelo motivo comercial:

```text
um outfit por R$ 5     →  compra por impulso, sem decisão
um outfit por R$ 40    →  compra com decisão, e a maioria decide não
```

O que gera receita num jogo assim não é o ticket alto: é a **frequência**. Cinco
reais é o preço em que a compra não precisa ser justificada, e o jogador que
comprou uma vez compra doze vezes por ano sem nunca sentir que gastou.

> A conta que importa não é `preço × compradores`. É
> `preço × compradores × VEZES` — e só a terceira parcela cresce sem limite.

---

## 4. A distribuição por raridade, e por que ela usa a escala das criaturas

O item usa a **MESMA** raridade do elenco: `comum`, `incomum`, `raro`,
`muitoRaro`. Não há tabela nova.

Com isso, três coisas caem no lugar sem código novo:

```text
o ESTÁGIO filtra item pelo mesmo critério que filtra criatura
o PERFIL enviesa o saque como já enviesa o encontro
a TELA mostra a chance do item pela mesma função que mostra a da criatura
```

Duas escalas seriam duas tabelas para manter, duas telas para explicar, e a
palavra "raro" querendo dizer coisas diferentes em lugares diferentes.

### A consequência medida: a pedra exige profundidade

Todas as pedras evolutivas são `raro` ou `muitoRaro`, e o estágio 1 só tem
`comum` e `incomum`. Logo:

```text
Vulcão, estágio 1   →  nenhuma pedra cai
Vulcão, estágio 4   →  Pedra do Fogo, 100% do pool de itens
Praia, estágio 3    →  Sino-Concha 77% · Pedra da Água 23%
```

**A evolução passou a ter endereço no mapa E profundidade.** Antes bastava
escolher o bioma; agora é preciso ter uma criatura de nível 19 para chegar onde
a pedra mora. Isso liga três blocos que estavam soltos — o nível (1.14), o
estágio (1.10) e o item — num laço só.

Medido: 60 Vigílias no estágio 4 do Vulcão renderam **72 Pedras do Fogo**.

---

## 5. As pedras se espalham, e isso é o que faz o mapa existir

```text
vulcao    Pedra do Fogo          praia     Pedra da Água
campo     Pedra do Trovão        floresta  Pedra das Folhas
montanha  Pedra da Lua           deserto   Pedra do Sol
oasis     Pedra Brilhante        ruina     Pedra do Crepúsculo
gelo      Pedra da Aurora        estufa    Pedra Oval
```

Dez pedras, dez biomas, uma cada. Nenhum bioma fica sem razão para ser
escolhido, e nenhum concentra duas — há teste que reprova se isso mudar.

---

## 6. O teto de uso, e por que só dois itens têm

Pedido do dono, textual:

> "o exp share só pode ser usado em 1 run, seja de 45min, 3hrs ou 8hrs"

`Exp. Share` e `Ovo da Sorte` são os **únicos** itens que aceleram progressão.
Sem teto, eles deixam de ser uma escolha e viram obrigação — e quem não os tem
joga um jogo mais lento por não ter tido sorte.

E o teto **não se espalha**: item que não acelera não pode ter teto, senão ele
vira um imposto genérico e para de significar alguma coisa. Há teste que exige
que a lista de itens com teto seja exatamente esses dois.

---

## 7. O que ainda não está resolvido, e está marcado

**Sete ícones sem confirmação.** O catálogo declara `comoAchei` em cada item:

```text
medido   o casador de imagem casou com margem folgada, e eu confirmei olhando
olhado   identifiquei na folha ampliada, por forma inconfundível
ordem    deduzido da ordem canônica, ancorado em vizinhos medidos
falta    ainda não identificado — 7 itens
```

Isso está no código de propósito. Eu já errei duas vezes identificando por
posição, e numa delas declarei a Poké Ball errada porque o render dela sai
alaranjado.

> **Identificação por posição é um palpite com aparência de método.**

Os sete aparecem na tela de conferência, e o número está no relatório do bloco —
para que "faltam sete" nunca vire "está pronto".

**A wiki** (L-093) é o próximo bloco: este catálogo é o que ela vai listar.

**A loja** precisa do §25.1 antes de existir, e o `dinheiro` é a porta que o
checkpoint governa. O desenho acima foi feito para que o checkpoint seja uma
formalidade — não há item de poder à venda para ele barrar.
