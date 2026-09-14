# Parecer — o sistema de moedas, o ticket e o mercado

**Pedido em:** 02/09/2026, pelo dono, com o desenho completo dele.
**O que este documento é:** a assimilação da proposta dele, o que ela resolve, os
furos que eu encontrei, e as opções — inclusive as que assumem risco, que ele
pediu explicitamente.

> "analise essas ideias de implementação minuciosamente [...] me trazer se condiz
>  o que estou pensando está correto, vai ser a sacada perfeita? Tem furos, então
>  você precisa moldar e aperfeiçoar"

---

## 1. O que existe HOJE, medido

Antes de opinar sobre o que muda, o retrato do que está construído:

```text
PokéCoin    moeda de PvE. Paga POR ENCONTRO na expedição, e é o que compra bola
            na loja. 1.500–2.760 por dia no teto; a Poké Ball custa 200.
Essência    material de farm. Troca por held item a preço fixo (60 a 180).
Fragmento   cai no ENCONTRO, e não na captura. Alimenta o dossiê.
PokéCash    NÃO EXISTE em lugar nenhum do código.
Ticket      não existe.
Laboratório não existe. Boost não existe.
Mercado     não existe, nem em moeda de jogo nem em dinheiro.
```

**A memória do dono está correta:** o desenho original da Spec tinha `PC-T
comprável`, `stake 6x6`, `pot entre usuários` e `rake da plataforma` — está
listado no próprio §25.1. O que ele descreve agora é uma mudança real de rumo, e
uma mudança para melhor.

---

## 2. A proposta dele, reescrita em uma linha cada

```text
1. dinheiro real  ->  compra TICKET (acesso à arena)
2. ticket         ->  joga a arena; SE GANHAR, recebe PokéCash
3. PokéCash       ->  no LABORATÓRIO, vira boost B1..B7 (+ pedras)
4. Pokémon boostado -> farma melhor no idle/torre E vale mais no mercado
5. o ticket também cai de graça: bônus diário, missões, baú, idle
```

E a tese dele, textual:

> "o cara comprar com dinheiro real um item pra USAR NO JOGO, não é aposta real,
>  pois ele vai ter a chance de ganhar um DINHEIRO QUE SE USA NO JOGO"

---

## 3. O que a proposta ACERTA, e não é pouco

**Separar o que se compra do que se ganha.** Vender ACESSO em vez de MOEDA é
uma diferença real de desenho, não maquiagem. Quem compra não recebe poder;
recebe uma oportunidade. É a mesma família de "entrada de torneio", e é
defensável.

**O boost dá ao mercado o produto que faltava.** A L-102 já tinha mostrado que
sem o foco não existe razão para uma criatura duplicada existir. O boost vai
além: cria uma escada de valor contínua, e um Pokémon B5 é objetivamente um
produto diferente de um B1. Sem isso, um mercado de Pokémon tem preço único e
morre em uma semana.

**Exigir PEDRA junto com PokéCash é a melhor ideia da mensagem.** É o que impede
o dinheiro de pular o jogo: por mais PokéCash que alguém tenha, o B3 só sai com
20 Pedras do Fogo, e Pedra do Fogo só cai no estágio 4 do Vulcão. **O dinheiro
compra velocidade; a pedra cobra presença.** Isso amarra a monetização ao farm
em vez de contorná-lo, e resolve sozinho metade do risco de pay-to-win.

**As três a cinco portas de ticket grátis por dia.** Sem elas o produto tem
paywall; com elas, o pagante compra ritmo e não acesso.

**A leitura sobre o mercado dele está certa.** *"Você não tem necessidade de 2
bulbasaur batedor a menos que queira vender"* — é exatamente o que faz um item
ter preço: ser inútil para quem já tem e valioso para quem não tem.

---

## 4. Os furos

### FURO 1 — não está definido COM O QUE se aposta, e isso muda tudo

A arena é uma casa de aposta: o jogador aposta uma quantia e ganha ou perde.
No desenho dele, o PokéCash **só existe depois de ganhar**. Então, na primeira
vez, não há o que apostar.

Só há três saídas, e elas são produtos diferentes:

```text
a) o ticket VEM COM uma banca de PokéCash
   -> então comprar ticket É comprar PokéCash, e voltamos ao desenho antigo
      que ele mesmo quis abandonar

b) o ticket é UMA APOSTA JÁ PAGA pela casa: o jogador escolhe em quem, e o
   prêmio vem em PokéCash. A banca é da casa e nunca sai
   -> é o mais limpo, e é o que eu recomendo

c) aposta-se PokéCoin (a moeda de PvE) e ganha-se PokéCash
   -> transforma o farm de idle em combustível de aposta, e liga o §28 a
      uma torneira que hoje não existe
```

**Esta decisão vem antes de qualquer código.** Ela não é um detalhe: ela decide
o que o produto é.

### FURO 2 — o argumento que salva do P2W é o mesmo que cria a outra categoria

O dono escreveu, como defesa:

> "se ele perder ele se fode e gastou a grana dele, pois o ticket te dá acesso à
>  arena e não certeza de lucro, então logo não se torna p2w"

O raciocínio está certo, e é bom. Mas repare no que ele descreve: **paga-se um
valor, o resultado depende do acaso, e há prêmio.** Esses três elementos juntos
são a definição de aposta na maior parte das jurisdições — inclusive na nossa.

Não é uma pegadinha: é que os dois problemas se resolvem por caminhos opostos.
Tirar o acaso resolve a aposta e cria o P2W. Manter o acaso resolve o P2W e
cria a aposta. **O único jeito de sair dos dois é a terceira porta — o prêmio
não poder virar dinheiro de volta.**

### FURO 3 — a arena não tem PERÍCIA, e isso pesa

A nossa arena é **automática**: doze lutadores sorteados, odds por Monte Carlo,
30 s de aposta, e o jogador ASSISTE. Não há nada que ele jogue.

Isso importa porque a defesa mais forte de "não é aposta, é competição" é a
perícia decidir. Aqui a única perícia possível é ler odd melhor que o modelo —
que é exatamente a perícia de quem aposta em futebol, e não a de quem joga.

**Se um dia houver uma etapa em que o jogador DECIDE algo dentro da batalha, a
posição do produto muda de verdade.** Hoje não há.

### FURO 4 — com o mercado de dinheiro real aberto, o ticket não protege nada

Esta é a mais importante, e é onde a "sacada perfeita" tem um furo estrutural.

O dono quer as duas pontas:

> "conseguir futuramente vendê-lo no market/rmt e aí sim, um dia talvez receber
>  o investimento feito de volta, ou até muito mais de lucro"

Escrita como corrente, a proposta fica assim:

```text
dinheiro real -> ticket -> ACASO -> PokéCash -> boost -> Pokémon -> RMT -> dinheiro real
```

A moeda de jogo no meio **não quebra a corrente — só a alonga.** O que define a
categoria de um produto não é quantos passos existem; é se o dinheiro consegue
SAIR. Com a porta de saída aberta, "compra ticket, ganha, saca" é dinheiro real
entrando e dinheiro real saindo, com um sorteio no meio.

**A conclusão é boa, e não é um "não":**

> O ticket é um desenho EXCELENTE — **enquanto a porta de saída estiver
> fechada.** Com ela aberta, ele não ajuda: é a mesma coisa com mais etapas.

As duas peças são ótimas separadas e se anulam juntas.

### FURO 5 — o PokéCash não tem torneira, e o boost não tem ralo

Duas contas que precisam fechar e hoje não fecham:

**A torneira.** Se o PokéCash só vem de GANHAR na arena, e a arena tem margem da
casa (`MARGEM_MAX` existe e é testada), então a arena **destrói** PokéCash no
agregado em vez de criar. O conjunto dos jogadores recebe menos do que apostou.
Sem uma segunda fonte, o estoque de PokéCash da economia tende a zero.

**O ralo.** B1 a B7 é finito. Quando o Pokémon do jogador chega ao B7, o
PokéCash dele não tem mais onde ser gasto — e PokéCash parado vira inflação de
preço no mercado. Uma economia precisa de ralo que não acabe.

### FURO 6 — o boost é PODER, e o §P5 proíbe vender poder

O boost melhora o farm no idle e a batalha na torre. Se o caminho até ele começa
em dinheiro, então dinheiro compra poder — com um sorteio no meio.

**Sorteio não descaracteriza: aleatoriza.** E pay-to-win aleatório é pior de
reter que o direto, porque quem paga e perde se sente roubado duas vezes.

O que salva isso no desenho dele é a **pedra**: o B3 exige 20 Pedras do Fogo, e
elas só vêm de farmar fundo. Enquanto a proporção pedra/PokéCash for alta, o
dinheiro compra ritmo e não resultado. **É a peça que segura o desenho inteiro,
e ela precisa ser tratada como requisito e não como tempero.**

---

## 5. As opções, com o que cada uma custa

O dono pediu as duas: a cautelosa e as que assumem risco.

### A — PORTA FECHADA *(recomendada)*

Tudo o que ele descreveu, **menos o saque**. Ticket vendido, PokéCash ganho na
arena, laboratório, boost B1..B7, mercado entre jogadores **em PokéCash**.

```text
receita     cosméticos + tickets
risco       baixo — nenhum valor sai do jogo
constrói    tudo, hoje, sem esperar consulta nenhuma
o que perde a promessa de "recuperar o investimento em dinheiro"
```

### B — MERCADO ABERTO, TICKET FECHADO

Ticket só de graça. Mercado de Pokémon com dinheiro real entre jogadores, com
taxa da plataforma.

```text
receita     taxa sobre transação — escala com a base, não com o gasto individual
risco       médio — há dinheiro saindo, mas NÃO se compra acaso
precisa     §0.5.1 (enquadramento), regras fiscais, e a questão de PI
```

### C — AS DUAS PORTAS ABERTAS *(a visão completa dele)*

```text
receita     a maior das três
risco       o mais alto que este projeto pode assumir
precisa     §25.1 inteiro + §0.5.1 voltando favorável + verificação de idade +
            KYC/AML + limite por jurisdição
```

Não é uma opção que eu descarte por mim — **é decisão de negócio, e é dele.** O
que eu posso afirmar é que ela não é uma variação das outras duas: é outro
produto, com outro custo fixo de operação.

### D — A QUE MANTÉM A PREMISSA DELE E EU RECOMENDO DE VERDADE

**Construir A agora, com a porta de saída como uma CHAVE e não como uma
reforma.**

```text
o ticket        construído
o laboratório   construído
o boost B1..B7  construído
o mercado       construído, liquidando em PokéCash
o saque         UMA bandeira, desligada, com o §25.1 amarrado nela
```

Nada se perde se a consulta voltar negativa; nada precisa ser reescrito se ela
voltar positiva. O produto monetiza desde o primeiro dia pelas duas portas que
já estão limpas — **cosmético e ticket** —, e a decisão cara fica para quando
houver informação para tomá-la.

É a mesma forma do `ARTE_EMPRESTADA_DE`: uma linha decide o estado, e um teste
recusa a tag enquanto ela estiver do lado errado.

---

## 6. O que eu recomendo mudar na proposta, ponto a ponto

```text
O TICKET        é uma aposta JÁ PAGA pela casa (furo 1, saída b). O jogador
                escolhe em quem; a banca nunca é dele e nunca sai.

A TORNEIRA      o PokéCash não pode vir SÓ da arena, ou o estoque seca (furo 5).
                Segunda fonte: a TORRE. Andar limpo paga PokéCash. Isso dá ao
                PvE um motivo de existir dentro da economia, e o dono já queria
                a torre como PvE.

O RALO          além do B1..B7, o PokéCash paga: reespecializar foco sem esperar
                as 48 h, expandir a caixa, e as skins de item. Ralos que não
                acabam, e nenhum deles é poder.

A PEDRA         proporção alta e CRESCENTE. Sugestão medida contra o farm atual:

                    B1   500 PokéCash +  20 pedras   ~3 dias de Vulcão fundo
                    B2  1200          +  45          ~7 dias
                    B3  2500          +  90          ~2 semanas
                    B4  5000          + 170          ~1 mês
                    B5  9000          + 300          ~2 meses
                    B6 16000          + 520          ~3,5 meses
                    B7 28000          + 900          ~6 meses

                A curva é ~1,8× por degrau, e é o que dá a "sensação de
                progressão a longo prazo" sem virar soulslike: o B1 sai na
                primeira semana, e o B7 é um objetivo de meio ano.

A ESSÊNCIA      as faixas que ele propôs, com a separação de cosmético que ele
                pediu — e uma correção: RNG puro numa faixa alta frustra. Use
                TETO DE AZAR: a cada 10 rodadas sem item novo, a 11ª é garantida.

                    100 ess   held item · skin de banner
                    250 ess   moldura · efeito de nome
                    500 ess   outfit · skin de avatar
                    900 ess   skin de arena

O POKÉCOIN      Poké Ball 200 -> 150. Hoje dá para tentar capturar 25–46% dos
                encontros do dia; com 150 vai a 33–60%, que é a dosagem que ele
                descreveu ("nem toda hora, nem limitar ao extremo").
```

---

## 7. Sobre o PSTORY

O dono pediu que eu verificasse. **Não verifiquei aquele servidor específico** —
digo isso porque a diferença entre "conheço o padrão" e "conferi a fonte" é
exatamente o tipo de coisa que este projeto não deixa passar.

O padrão que ele descreve é conhecido em servidores privados de Pokétibia:
tiers de melhoria por item que ultrapassam o teto natural de status, com custo
crescente em quantidade de pedra. A leitura dele sobre por que funciona está
certa — **o teto natural mata a progressão, e o boost devolve uma escada depois
dele.** É o mesmo problema que a L-105 mediu aqui: 155 dias sem porta nova.

---

## 8. Ordem de aplicação

```text
1.16  o foco                        EM CURSO
1.17  a evolução                    L-106 — destrava tudo que vem depois
1.18  estágios 5–8 + encher biomas  L-105 e L-107
1.19  tipagem e VEL no farm         L-108
2.0   A TORRE                       vira pré-requisito da economia: é a segunda
                                    torneira de PokéCash (furo 5)
2.1   o laboratório e o boost       precisa da torre e das pedras
2.2   o ticket e o PokéCash         precisa do laboratório
2.3   o mercado em PokéCash         precisa do boost, senão não há produto
 ⛔   o saque em dinheiro real      §25.1 + §0.5.1 — a chave, desligada
```

A torre subiu de posição, e o motivo é econômico e não de gosto: **sem ela o
PokéCash não tem de onde nascer.**

---

## 9. O que continua sendo decisão do dono

```text
o FURO 1     com o que se aposta — a, b ou c do capítulo 4
a OPÇÃO      A, B, C ou D do capítulo 5
o §0.5.1     a consulta de enquadramento, aberta desde a v0.9
```

Eu recomendo **b** e **D**, e sigo por elas se ele não disser o contrário — é o
combinado. Mas as três linhas acima mudam o produto, e nenhuma delas é uma
decisão que caiba a mim tomar em silêncio.

---

# 10. REQUISITO — o dinheiro compra velocidade, a pedra cobra presença

**Elevado a requisito pelo dono em 02/09/2026**, a pedido dele: *"se torna
requisito, pode registrar"*.

```text
Nenhum degrau de boost pode ser alcançado apenas com o que se compra.
Todo degrau exige MATERIAL QUE SÓ O FARM ENTREGA.
```

## Por que ele é requisito e não preferência

É a peça que segura o desenho inteiro contra o pay-to-win. Sem ela, dinheiro vira
poder direto e o §P5 cai. Com ela, dinheiro vira RITMO: quem paga chega antes,
não chega mais longe.

## A condição que o faz funcionar de verdade, e ela não é óbvia

> **As duas restrições precisam ser CO-LIMITANTES.**

Se o boost exige PokéCash e pedra, e a pedra é sempre a restrição que aperta,
então comprar PokéCash não muda nada — o requisito estaria "cumprido" e a compra
seria inútil, o que mata a receita. Se o PokéCash é sempre o que aperta, a pedra
é decoração e o requisito não protege nada.

O ponto útil é o meio: **as duas apertando ao mesmo tempo.** Aí comprar PokéCash
corta o tempo pela metade — que é exatamente "velocidade" — e nunca mais que
isso, porque a outra metade não está à venda.

Isso obriga a calibrar as duas curvas juntas, e a recalibrar sempre que uma das
duas mudar. É trabalho recorrente, e é o preço de a regra ser real.

## Como ele se verifica

Todo degrau de boost tem um teste que afirma:

```text
1. existe custo em PokéCash        > 0
2. existe custo em material        > 0
3. o tempo de farm do material     >= 60% do tempo total do degrau
```

A terceira é a que impede o requisito de virar letra morta: um degrau com
"1 pedra" cumpriria as duas primeiras e não protegeria nada.
