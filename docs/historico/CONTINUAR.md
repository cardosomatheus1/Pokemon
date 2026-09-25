> **📦 ARQUIVO MORTO — movido para `docs/historico/` em 25/09/2026 (ST-6.1).**
> Este documento mantinha uma fila ou um estado próprio, contra a GOV-01. Ele é
> registro do que foi, e não dá ordem nenhuma. **O estado é `docs/RETOMAR.md`;
> a fila, `docs/ROADMAP.md`; as fichas, `docs/PLANO_DE_IMPLEMENTACAO.md`.**

> **HISTÓRICO — não é fila nem estado** (GOV-01, 25/09/2026). Este arquivo
> mandava reconstruir o 1.27f, que foi entregue em 16/09. A fila está no
> `ROADMAP.md` e o estado no `RETOMAR.md`.

# CONTINUAR — a passagem de bastão

**Para quem é:** para mim numa aba nova ou em outra máquina, e para outra pessoa
que vá pôr a mão no projeto. Os dois precisam das mesmas coisas, e este arquivo
é o único que precisa ser lido inteiro antes de tocar em qualquer coisa.

**Escrito em:** 13/09/2026.
**O comando que reabre o trabalho:** `leia docs/CONTINUAR.md e siga daqui`.

---

## 0. Em trinta segundos

```text
o PRODUTO    PokéArena — battle royale automático de apostas com moeda
             SIMULADA, mais um metagame de treinador (o "idle")
o ESTADO     jogável de ponta a ponta. Arena + Avanço + Rota OFF + lojas
o MÉTODO     um bloco = um commit. Testes ANTES do código. Nove portões.
             Está tudo em `CLAUDE.md`, e ele vence este arquivo em conflito
a MÁQUINA    C:\Users\gdult\pa4
o LINK       http://localhost:8099/app/index.html
             sobe com: node tools/servir.mjs --porta 8099
```

**Leia nesta ordem:** este arquivo → `CLAUDE.md` → `docs/ROADMAP.md`. Se for a
primeira vez no projeto, comece por `docs/COMECE_AQUI.md`, que é mais longo e
explica o produto antes do método.

---

## 1. O estado EXATO, em 13/09/2026

### O que está commitado

```text
6514917   1.32 — o CLIMA do Avanço          <- o último, 13/09
b0fe29f   1.27e — a sprite que sumia no golpe, e o efeito fora da tela
cf1f9ea   docs — o 1.27 fechado
e6f4247   1.27d — o AVANÇO PROGRESSIVO
```

### A árvore está LIMPA

```text
Q1   VERDE 2137/2137
Q2   VERDE 987/987   (99 reavaliados agora, 888 reaproveitados)
Q5   as duas metades — as capturas foram lidas
```

Não há trabalho pendurado. O próximo bloco começa do zero, e ele é o da seção 3.

### O que se PERDEU, e precisa ser refeito

**O bloco do cartão da equipe (1.27f).** Ele estava construído e verde, e eu o
desfiz com as próprias mãos para separar dois blocos em dois commits — guardei o
backup em `/tmp`, a sessão foi interrompida, e três dias depois o `/tmp` tinha
sido limpo.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** O
> lugar de guardar trabalho neste projeto é um commit, mesmo que seja um commit
> de rascunho que depois se reescreve.

O que ele era está na seção 3, item 1, com detalhe suficiente para refazer em
menos de uma hora. As capturas de antes e depois sobreviveram, em
`tools/previas/_cartao/`.

---

## 2. Como conferir que está tudo de pé

```bash
npm run rapido              # 96 suítes sem navegador — 1 min 25 s
npm test                    # a suíte inteira, com Chromium
npm run sabotagem           # Q2: planta 987 defeitos e confere que a suíte pega
npm run portoes             # suíte DUAS vezes + sabotagem. É o que fecha bloco
node tools/olhar-idle.mjs   # fotografa a aba ROTAS e a tela da RUN
node tools/olhar-telas.mjs  # fotografa a Arena
```

**O Q5 precisa do `playwright-core` instalado FORA do projeto** — o repositório
não tem dependências, e isso é decisão de método. Ver `tools/README.md`. Sem ele,
`npm test` pula o portão visual com aviso; `npm run portoes` recusa.

### Duas armadilhas que já custaram caro

```text
visual-base   a linha de base LOCAL (test/fixtures/visual-base-local.json) está
              no .gitignore. Um clone novo NÃO a tem, e a suíte passa sem
              comparar nada. Verde ali pode querer dizer "não olhei" — é o D-093
assets/       a arte de terceiros ENTRA no repositório (decisão do dono, build
              privado). Se faltar, `npm run assets` baixa. São ~1 645 arquivos
```

---

## 3. O que fazer a seguir, em ordem

### 1º — refazer o cartão da equipe (1.27f)

> ## ⏳ A ORDEM DE SERVIÇO COMPLETA ESTÁ EM `docs/TAREFA_1.27f_CARTAO.md`
>
> Ela tem as seis mudanças arquivo a arquivo, os três testes que mudam junto, os
> quatro defeitos plantados novos, a ferramenta de olhar que se perdeu, e como
> fechar o bloco. **Quem for assumir começa por lá.**
>
> O resumo abaixo existe para você saber se é isto que quer fazer agora. A
> execução está lá.

**Por que é o primeiro:** é um pedido do dono que está em aberto desde 10/09, e
ele já o cobrou uma vez. E é trabalho que já foi feito e provado — refazer é
barato, redescobrir não.

**O pedido dele, literal:**

> "você removeu as informações de stats, lv que evolui etc. Implemente novamente
>  no mesmo estilo do nosso tema cyber que estava"

**O contexto, e ele é o que importa:** o dono reprovou este mesmo cartão DUAS
vezes, em sentidos opostos.

```text
04/09   "uma loucura, bagunça total, muito feio e confuso"
        -> eu reduzi o cartão de dez informações para três e escondi o resto
           atrás de um botão FICHA (L-164, bloco 1.27b)
10/09   "você removeu as informações de stats, lv que evolui"
        -> esconder resolveu a bagunça e criou a segunda queixa
```

> As duas queixas são verdadeiras, e a contradição só existe se a resposta for
> esconder. **O problema nunca foi a QUANTIDADE de informação: era a forma
> dela** — dez rótulos de texto empilhados em 90 px, cada um numa linha própria.
> Esconder não é organizar.

**O que a versão perdida fazia** (e funcionava, medido):

```text
1. CAMPOS.compacto ganhou 'forma' e 'evolucao'
   em app/modules/idle-escolha.mjs. Ficaram na ficha só `xp`, `potencial` e
   `natureza` — o que NÃO muda entre uma run e a seguinte

2. as três barras de stat APERTARAM
   de três linhas de grade (26px de rótulo + barra + 22px de número = 27 px de
   altura) para 18 px: rótulo de 20 px, barra de 9 px, e o NÚMERO DENTRO da
   barra, encostado à direita, com sombra própria para não sumir no dourado

3. a evolução virou ficha de UMA linha
   "evolui com nível 32" tem 19 caracteres e quebrava em três linhas. Uma função
   de camada 0, `resumoDaEvolucao(falta)`, recorta:
       nível 32                  ->  NV 32
       Pedra do Fogo             ->  Pedra do Fogo   (por extenso: sozinho, o
                                     símbolo não diria nada)
       nível 16 e Pedra da Água  ->  NV 16 ◆
       vínculo 40                ->  ♥ 40
   A frase inteira fica no `title`, porque o D-067 pede que a recusa diga O QUE
   consertar

4. o NÍVEL parou de aparecer duas vezes
   a barra de XP já traz "NV 36 · 58%" na frente dela. O `criaNivel` só sai
   quando o modo NÃO mostra `xp`

5. a lista virou GRADE
   `#idleEquipe` era `flex-wrap`, e os cartões tinham larguras iguais e alturas
   independentes — uma fileira com um cartão de 286 px ao lado de um de 190.
   Virou `grid-template-columns:repeat(auto-fill,minmax(118px,1fr))`.
   ATENÇÃO: o rodapé `.idleConcentra` é escrito DENTRO do mesmo `innerHTML`, e
   com grade ele virou uma CÉLULA no meio da lista — precisa de `grid-column:1/-1`

6. `.idleCria` tinha `width:104px` FIXO
   sobrevivente do tempo do flex. Numa grade de colunas de 141 px, o cartão
   recusava o espaço que a grade lhe dava, e as barras ficavam curtas demais
   para serem lidas como medida. Virou `width:100%`
```

**Dois testes precisam mudar junto**, e eles reprovam de propósito hoje:

```text
test/idle-escolha.mjs   'o cartão abre COMPACTO...' afirma que `forma` NÃO está
                        no compacto, e `compacto.length <= 3`. A regra que
                        sobrevive às duas queixas é outra: o compacto carrega o
                        que a HORA DE ESCOLHER pergunta
                        e o teste do `mostra` escrevia as respostas à mão —
                        passe-o a afirmar a CONCORDÂNCIA com `camposDoCartao`
test/defeitos-plantados S947 ancora em `compacto: ['nivel', 'foco'],` e vai
                        perder a âncora. REALVE, não apague — a regra do
                        pré-voo do Q2
```

**A ferramenta que eu escrevi para isto se perdeu junto**, e vale refazer:
`tools/olhar-cartao.mjs` fotografa o painel da equipe nos DOIS modos e em duas
larguras, de perto. O `olhar-idle.mjs` fotografa a aba inteira, e nela o cartão
é um pedaço de 90 px numa página de 2 500 — inútil para julgar densidade.

### 2º — *(feito)* o 1.32 está commitado em `6514917`

### 3º — a ordem que estava valendo

Está escrita em `docs/ORDEM_APOS_O_AVANCO.md`, decidida em 08/09 por delegação
do dono. Os quatro primeiros fecharam. O que resta:

```text
5º   1.33 · 1.34   dia e noite, e o "como funciona"
                   A regra do dono governa: efeito VISÍVEL na wave. Na forma
                   antiga, hora do dia mexia no sorteio do encontro — um número
                   que ninguém vê. Agora o cenário muda de luz e o elenco do
                   estágio muda com ele
6º   T8 · T4 · T7  a manutenção do arnês: D-049, D-050, D-053, D-060+D-077
                   (que são o mesmo e devem ser fundidos), e o D-078
```

---

## 4. O que o 1.32 entregou — a mensagem do commit `6514917`

Fechado em 13/09/2026, com Q1 2137/2137 e Q2 987/987. Fica aqui porque a
mensagem de commit é onde este projeto guarda o PORQUÊ de cada decisão, e quem
for mexer no clima precisa dela antes de mexer.

```text
1.32 — o CLIMA do Avanço: buff de FARM, e o quanto sai da RARIDADE do tipo

A L-119, e a regra que o dono fixou para a trilha inteira do clima e do dia:
efeito VISÍVEL na wave, nunca um número que ninguém vê.

O QUE ELE PEDIU, e as duas metades puxam para lados opostos:

  "o clima sol forte no iddle pode aumentar em 2.5% de xp a mais no farm da
   rota isso usando um Pokémon de fogo obvio [...] o player precisa sentir a
   'melhoria' do buff na prática"

2,5% não se sente. Construí com um número maior e a razão está escrita no
engine/clima-idle.mjs.

O QUANTO SAI DA RARIDADE, e não de uma tabela. O dono levantou o Gelo, que tem
quatro espécies em 146. A resposta fácil seria escrever um número maior na
linha dele; a que não envelhece é o número vir da COBERTURA medida:

    CLIMA          TIPO(S)       COBERTURA   EQUIPE CHEIA   CANAL
    Sol Forte      fogo            11 esp       +18%        XP
    Chuva          água            32 esp       +11%        ritmo
    Vendaval       voador          16 esp       +15%        moeda
    Tempestade     terra+pedra     19 esp       +14%        material
    Névoa Tóxica   veneno          33 esp       +10%        item raro
    Pólen          planta          14 esp       +16%        material
    Nevasca        gelo             4 esp       +30%        item raro
    Tempo Firme    —                 —            —         40% do peso

Veneno é o MAIOR tipo do elenco e não tinha clima nenhum — ganhou a Névoa.

A REGRA QUE ELE NOMEOU, e ela tem teste: paga quem foi ENVIADO, não quem
aparece na cena. E levar quatro do tipo não paga quatro vezes — usa o MESMO
PESO_DA_VAGA do combate (100/55/35/20), que é o "nada surreal e quebrado" que
ele fixou quando o poder da equipe foi calibrado.

O QUE O JOGADOR VÊ, medido em pixel e não em contador:

    o VÉU          cor sobre o chão, por baixo dos lutadores
    as PARTÍCULAS  46 gotas no panorâmico, 15 no estreito — por DEZ MIL PIXELS
                   de janela. 846 px opacos, 1,01% da tela
    o CARTÃO       nome, o que rende, quanto, e GRAÇAS A QUEM
    o LOG          no PRIMEIRO segundo da run, e não no extrato do fim

TRÊS ERROS MEUS QUE SÓ A FOTO PEGOU:

    a DENSIDADE  escrevi 46 num campo que é "por dez mil pixels" — daria 384
                 gotas, e o teto de 90 escondia o erro atrás de uma parede
                 d'água. Quem pegou foi a asserção de que a janela larga tem
                 MAIS gotas que a estreita: as duas estavam grampeadas em 90
    a FRASE      "para quem é water" — chave interna em vez do nome do tipo, e
                 o pack já escrevia certo no `desc`
    o ESPAÇO     "CHUVAninguém": dois spans com margin-top, e margem vertical
                 não vale em elemento inline. O estilo não falhou — foi ignorado

ABERTO, com dono:
    L-177  o jogador não sabe QUE CLIMAS EXISTEM antes de montar a equipe
    L-178  o clima não muda o ELENCO da wave, só o que ela rende — nasce junto
           com dia e noite (1.33/1.34), porque é o mesmo mecanismo

Q1 VERDE 2137/2137 · Q2 VERDE 987/987 · Q5 as duas metades, capturas lidas
Q6 sem superfície nova

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

---

## 5. As regras do projeto que mais me pegaram

`CLAUDE.md` tem todas. Estas são as que eu quebrei, e o custo de cada uma.

### Conta que só o navegador verifica acaba verificada por ninguém

Seis defeitos plantados escaparam do portão Q2 num bloco só, todos pela mesma
causa: a lógica morava dentro de uma `innerHTML` ou colada num `style.transform`.

**A forma certa:** a decisão vai para um módulo de camada 0, puro, e a tela só
pinta o que ele devolveu. `folha-viva.mjs`, `avanco-clima.mjs`,
`clima-particulas.mjs` e `idle-escolha.mjs` são os exemplos de como fica.

### Contador conta CHAMADA — ele não olha para a tela

O bloco 1.27c fechou dizendo **"14 estouros agendados, 413 desenhos"** e a tela
não tinha efeito nenhum. Os dois números estavam certos: a função rodou 413
vezes, e todas as 413 caíam fora da janela.

Isso custou **três dias** de o dono cobrar a mesma tela. Hoje o
`avanco-efeito.mjs` conta também quantos caíram FORA DO CANVAS, e a esteira
espera o instante do golpe para FOTOGRAFAR.

> Se a prova de que algo apareceu é um número que o próprio código incrementou,
> não é prova. É a mesma função afirmando sobre si mesma.

### Campo derivado se pergunta à função que o deriva

A ferramenta de OLHAR escrevia `raridade: esp.raridade ?? 'comum'` num campo que
é DERIVADO da força. O dono pegou olhando uma captura que eu tinha anexado como
prova: *"um charizard desde quando é 'comum'?"*. O jogo estava certo o tempo
todo; a foto é que mentia. É o **D-087**.

### A segunda metade do Q5 é OLHAR

Nenhum dos três erros do 1.32 é erro de lógica, e nenhum teste verde os teria
dito. Os três apareceram na captura.

### Editar arquivo grande por recorte de string é operação sem rede

Foi assim que o `app/index.html` ganhou **3 725 linhas duplicadas** em 10/09 — de
7 861 para 11 586, com zero remoções. Ele abre, roda, e tem metade do conteúdo
duas vezes. Quem pegou foi o pré-voo do Q2, com trinta âncoras ambíguas.

O conserto está em `tools/conserta-index.mjs`, e a lição é o método dele:
**reconstruir a partir de uma base que o git garante e reaplicar as inserções
pequenas, conferindo o tamanho no fim.**

### `git checkout <commit> -- <arquivos>` sobrescreve o ÍNDICE junto

Usei isso para fazer um experimento e levei quatro arquivos do bloco em curso. Se
precisar pôr trabalho de lado, **faça um commit de rascunho** — nunca uma cópia
em `/tmp`, e nunca `git checkout` de um commit antigo sobre a árvore suja.

---

## 6. O mapa dos arquivos que importam

```text
CLAUDE.md                     COMO se trabalha. Vence este arquivo em conflito
docs/COMECE_AQUI.md           o produto e o método, para quem nunca viu
docs/CONTINUAR.md             este arquivo — o ponto exato de onde seguir
docs/ROADMAP.md               o mapa: feito, pendente, prioridade
docs/RETOMAR.md               o histórico curto dos últimos blocos
docs/LACUNAS.md               179 lacunas — trabalho identificado e adiado,
                              cada uma com BLOCO DONO nomeado
docs/DEFEITOS.md              93 defeitos — achados, com causa e medição
docs/ORDEM_APOS_O_AVANCO.md   a fila decidida em 08/09
docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md    o QUÊ. Fonte de verdade
docs/POKEARENA_BUILD_BLOCKS_v1.2.md                  o COMO, e em que ordem
```

```text
engine/       o motor. NÃO conhece o tema (§0.3) — nem em comentário
content/      os ContentPacks. É onde nome, tipo e arte moram
app/modules/  a interface. Camadas 0 a 4, declaradas em test/modulos.mjs
test/         96 suítes + 987 defeitos plantados
tools/        as esteiras de OLHAR, o baixador de arte, o servidor
```

### As três regras de arquitetura que o `test/modulos.mjs` cobra

```text
1. todo módulo tem CAMADA declarada. Módulo novo exige decidir onde ele entra
2. as dependências apontam numa direção só. Camada 0 não importa camada 3
3. o teto é 600 linhas, e a divisão é por RESPONSABILIDADE, não por tamanho
```

---

## 7. O que o dono decidiu, e não se renegocia

Está tudo em `CLAUDE.md` com o contexto. O resumo:

```text
a PREMISSA        o tema é Pokémon. Não haverá criatura autoral — o autoral são
                  os cosméticos, e é onde a loja vende
o RMT             é indispensável. Não propor tirá-lo: propor como operá-lo,
                  com os furos e as mitigações lado a lado
a MONETIZAÇÃO     ele DEPENDE de lucro. Propor porta de receita justa é
                  obrigação, não sugestão
os COSMÉTICOS     tudo será desbloqueado por missão, loja ou baú. Hoje está
                  liberado só para teste
o BANNER          toda tela que o jogador habita mostra o banner dele
o VISUAL          nada visual entrega o mínimo que funciona. Sempre acrescentar
                  um detalhe que não foi pedido e que a cena precisa
o CENÁRIO DO IDLE nunca está pronto. É a única tela do produto olhada por horas
a DIVISÃO         ele lança ideias soltas; EU destrincho, organizo e decido se e
                  quando aplica. Perguntar "faço agora ou depois?" devolve a
                  decisão que ele delegou
o RITMO           2–3 meses de folga. Construir com calma
```

E duas de forma, que ele cobrou por escrito:

```text
A CADA ENTREGA   "Progresso: NN%" e um mini resumo do que mudou
O LOCAL NO AR    conferido com uma requisição de verdade, e o link apresentado.
                 "Estava rodando antes" não conta
```
