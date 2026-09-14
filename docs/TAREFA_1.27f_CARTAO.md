# TAREFA 1.27f — refazer o cartão da equipe

**Estado:** ⏳ **A FAZER — é o próximo bloco da fila.**
**Pedido do dono:** 10/09/2026. **Escrito em:** 13/09/2026.
**Estimativa:** menos de uma hora, com este documento na mão.

---

## Por que esta tarefa existe num arquivo próprio

Porque ela já foi feita, estava verde, e **se perdeu**. Não é trabalho novo: é
trabalho a reconstruir, e reconstruir é barato quando alguém escreveu o que era.

> Eu desfiz o bloco com as próprias mãos para separar dois commits, guardei o
> backup em `/tmp`, a sessão foi interrompida, e três dias depois o `/tmp` tinha
> sido limpo.
>
> **Backup em diretório temporário não é backup: é uma aposta com prazo.** O
> lugar de pôr trabalho de lado neste repositório é um commit de rascunho.

---

## 1. O pedido, e o que ele quer dizer

### As palavras do dono, em 10/09/2026

> "você removeu as informações de stats, lv que evolui etc. Implemente novamente
>  no mesmo estilo do nosso tema cyber que estava"

Ele mandou uma captura junto: o painel **A EQUIPE QUE VAI** com seis cartões
mostrando arte, nome, `NV` e a barra de stamina. Mais nada.

### O contexto, e ele é a parte que não pode ser esquecida

**O dono reprovou este mesmo cartão duas vezes, em sentidos opostos:**

```text
04/09   "uma loucura, bagunça total, muito feio e confuso"
        -> reduzi o cartão de dez informações para três e escondi o resto atrás
           de um botão FICHA. É a L-164, bloco 1.27b

10/09   "você removeu as informações de stats, lv que evolui"
        -> esconder resolveu a bagunça e CRIOU a segunda queixa
```

**As duas queixas são verdadeiras.** A contradição só existe se a resposta for
esconder.

> O problema nunca foi a QUANTIDADE de informação: era a FORMA dela — dez
> rótulos de texto empilhados em 90 px, cada um numa linha própria.
>
> **Esconder não é organizar. Organizar é o que eu não tinha feito.**

A resposta certa é apertar: três barras de 18 px no lugar de três linhas de
texto de 27, e uma ficha de uma linha no lugar de um bloco de três.

---

## 2. O que construir, item a item

Seis mudanças. Cada uma tem o arquivo, o que estava lá, e o porquê.

### 2.1 · O compacto reabsorve `forma` e `evolucao`

**Arquivo:** `app/modules/idle-escolha.mjs`

```js
const CAMPOS = {
  compacto: ['nivel', 'foco', 'forma', 'evolucao'],
  ficha:    ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao'],
};
```

**O que FICA só na ficha, e por quê:** `xp` é progresso dentro do nível, e
`potencial` e `natureza` não mudam entre uma run e a seguinte. Atravessar isso
onze vezes seguidas é custo sem decisão — e foi assim que o cartão chegou a dez
informações.

**O que ENTRA no compacto, e por quê:** a hora de escolher faz quatro perguntas
— quem é, em que nível está, **o que ele soma em combate**, e **quando ele muda
de forma**. As duas últimas são exatamente o que o dono pediu de volta.

### 2.2 · `resumoDaEvolucao` — a ficha curta, em camada 0

**Arquivo:** `app/modules/idle-escolha.mjs`, função nova e exportada.

`oQueFalta()` devolve a frase inteira — `"nível 32"`, `"Pedra do Fogo"`,
`"nível 16 e Pedra da Água"`, `"vínculo 40"`. Ela é a certa para o `title`, e é
longa demais para 104 px: `"evolui com nível 32"` tem 19 caracteres e quebrava
em **três linhas** em Press Start 2P, deixando o selo maior que o retrato.

**O recorte:**

```text
"nível 32"                  ->  "NV 32"
"vínculo 40"                ->  "♥ 40"
"nível 20 e vínculo 30"     ->  "NV 20 ♥ 30"
"nível 16 e Pedra da Água"  ->  "NV 16 ◆"
"Pedra do Fogo"             ->  "Pedra do Fogo"     <- POR EXTENSO
""  ou  null                ->  ""
"algo que o parser não lê"  ->  a frase inteira
```

**A regra do losango, e ela tem teste:** `◆` só substitui o item quando há um
NÚMERO ao lado — ali a manchete é o número, e o símbolo só avisa que falta mais
uma coisa. **Sozinho, o item volta por extenso.**

> A primeira versão devolvia `◆` em todos os casos, e o teste mostrou o custo:
> uma frase que o parser não sabe ler — um requisito que algum bloco futuro
> invente — virava um losango mudo, indistinguível de "falta uma pedra".
>
> **Um símbolo que serve para tudo não diz nada.**

**Por que camada 0 e não dentro da `innerHTML`:** seis defeitos plantados
escaparam do portão Q2 num bloco só, todos por a lógica morar colada ao HTML.
Ver `CLAUDE.md`, e os exemplos em `folha-viva.mjs` e `avanco-clima.mjs`.

### 2.3 · O selo da evolução usa o recorte

**Arquivo:** `app/modules/idle-equipe.mjs`, função `seloDaEvolucao`.

```js
return `<span class="criaEvo esperando" title="para evoluir: ${r.falta}">` +
       `<em>evolui</em>${resumoDaEvolucao(r.falta)}</span>`;
```

O `title` continua com a frase **por extenso** — o **D-067** pede que a recusa
diga O QUE consertar, e ela diz. O que mudou é que ela deixou de gritar.

### 2.4 · O nível para de aparecer duas vezes

**Arquivo:** `app/modules/idle-equipe.mjs`, no corpo do cartão.

```js
${ver('nivel') && !ver('xp') ? `<span class="criaNivel">nv <b>…</b></span>` : ''}
```

A barra de XP já traz `NV 36 · 58%` na frente dela. Com os dois, o número saía
repetido a quatro pixels de si mesmo — e repetição num cartão de 104 px lê como
erro de montagem, não como ênfase. Na ficha manda a barra, que diz mais; no
compacto manda esta linha, que é o que sobra.

### 2.5 · As três barras de stat APERTAM

**Arquivo:** `app/index.html`, o bloco de `.criaForma` / `.fLinha`.

```text
ANTES   grid de 3 colunas: 26px rótulo | barra 6px | 22px número
        três linhas, gap 3px  =  ~27 px de altura, e lê como formulário
DEPOIS  grid de 2 colunas: 20px rótulo | barra 9px
        o NÚMERO vai para DENTRO da barra, encostado à direita
        três linhas, gap 2px  =  ~18 px, e lê como medidor
```

**Quatro detalhes que só a captura mostrou:**

```text
1. `.fLinha` precisa de `position:relative`
   O `<s>` do número é IRMÃO do `<i>` da barra, e não filho. Com o relative no
   `<i>`, ele resolvia contra o cartão inteiro e o "71" saía flutuando no canto
   superior direito, uma linha ACIMA da barra que ele mede

2. a PISTA da barra precisa de contraste
   `rgba(255,255,255,.10)` mais `inset 0 0 0 1px rgba(255,255,255,.06)`. Com
   menos, a barra some e o número passa a dizer "66 de sei lá"

3. o NÚMERO precisa de sombra própria
   `text-shadow:0 1px 2px rgba(0,0,0,.9)`. Sem ela, o branco sobre o
   preenchimento dourado do VEL desaparece

4. o preenchimento leva `color` além de `background`
   `box-shadow:0 0 6px -1px currentColor` é o halo. Cor chapada lê como barra
   de instalador; o halo é o que faz a barra pertencer a ESTA tela
```

### 2.6 · A evolução vira ficha de uma linha, e a lista vira GRADE

**Arquivo:** `app/index.html`.

```text
.criaEvo     de `display:block` com texto centralizado para
             `display:flex; align-items:baseline; justify-content:center; gap:4px`
             `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`
             o `<em>evolui</em>` fica miúdo (.42rem) e o NÚMERO é a manchete (.56rem)

#idleEquipe  de `display:flex; flex-wrap:wrap` para
             `display:grid; grid-template-columns:repeat(auto-fill,minmax(118px,1fr))`
             `align-items:stretch`
             e abaixo de 520 px o minmax cai para 104px

.idleCria    `width:104px` FIXO vira `width:100%`
```

**Duas armadilhas da troca para grade, e as duas apareceram na foto:**

```text
o RODAPÉ     `.idleConcentra` ("Mandar mais de um no MESMO bioma rende mais") é
             escrito DENTRO do mesmo `innerHTML` do painel. Com flex-wrap ele
             quebrava a linha sozinho; com grade ele virou uma CÉLULA, e a foto
             mostrou a frase ocupando o lugar do quinto cartão, no meio da lista
             CONSERTO: `.idleConcentra{grid-column:1/-1; margin:2px 0 0}`

a LARGURA    `.idleCria` tinha `width:104px`, sobrevivente do tempo do flex.
             Numa grade de colunas de 141 px o cartão RECUSAVA o espaço que a
             grade lhe dava, e as barras ficavam curtas demais para serem lidas
             como medida. Um `width` fixo dentro de uma grade é o item recusando
             o espaço da grade
```

**Medido depois:** o cartão foi de `104x144` para `147x199` no largo, e
`125x199` no estreito.

---

## 3. Os testes que precisam mudar JUNTO

Dois deles reprovam de propósito hoje, e reprovar é o certo: eles afirmam a
decisão de 04/09, e a decisão mudou.

### 3.1 · `test/idle-escolha.mjs` — 'o cartão abre COMPACTO…'

A versão atual afirma `compacto.length <= 3` e proíbe `forma` e `evolucao`.

**O que ela afirmava não estava errado sobre o que tinha sido decidido. Estava
errado sobre o PORQUÊ:** eu li "reduza a quantidade" onde o dono disse "isto
está confuso".

A regra que sobrevive às duas queixas:

```text
o COMPACTO   carrega o que a HORA DE ESCOLHER pergunta:
             nivel, foco, forma, evolucao
a FICHA      guarda o que só se consulta:
             + xp, potencial, natureza
e a DOBRA    continua existindo: compacto.length < ficha.length
```

### 3.2 · `test/idle-escolha.mjs` — 'um modo inventado cai no padrão'

Ele escrevia as respostas à mão:

```js
ok(!mostra('compacto', 'forma'), '…');
```

Passe-o a afirmar a **CONCORDÂNCIA** entre `mostra` e `camposDoCartao`, que é a
regra — em vez da tabela de hoje, que é uma decisão de produto:

```js
for (const [modo, campo] of [['compacto','nivel'], ['compacto','forma'],
                             ['ficha','forma'],    ['ficha','potencial'],
                             ['compacto','potencial'], ['compacto','xp']])
  igual(mostra(modo, campo), camposDoCartao(modo).includes(campo), …);
```

### 3.3 · `test/defeitos-plantados.mjs` — o S947 perde a âncora

Ele ancora em `compacto: ['nivel', 'foco'],`, que deixa de existir.

**REALVE, não apague** — é a regra do pré-voo do Q2 no `CLAUDE.md`. O defeito é
o mesmo (os dois modos virarem um só, e a dobra deixar de dobrar); muda o
endereço dele:

```js
de:   "  compacto: ['nivel', 'foco', 'forma', 'evolucao'],",
para: "  compacto: ['nivel', 'foco', 'xp', 'forma', 'potencial', 'natureza', 'evolucao'],",
```

### 3.4 · Defeitos plantados NOVOS

Quatro, e cada um protege uma das decisões acima:

```text
o recorte da evolução volta a ser a frase inteira      -> quebra em 3 linhas
o NÍVEL some do resumo                                 -> "o lv que evolui" era o pedido
um requisito desconhecido vira um losango mudo         -> símbolo que serve para tudo
o nível volta a aparecer duas vezes na ficha           -> lê como erro de montagem
```

---

## 4. A ferramenta que se perdeu junto, e vale refazer

`tools/olhar-cartao.mjs` — fotografa o painel da equipe nos **dois modos** e em
**duas larguras**, de perto, com o cabeçalho junto (porque o botão que alterna o
modo mora nele).

**Por que ela é necessária:** o `olhar-idle.mjs` fotografa a aba inteira, e nela
o cartão é um pedaço de 90 px numa página de 2 500. Para decidir o que cabe
DENTRO do cartão isso é inútil — a decisão é sobre densidade, e densidade só se
julga de perto.

**O que ela precisa plantar:** seis criaturas com níveis espalhados (uma acima
do 12, para o foco aparecer), e pedras na bolsa (o selo de evolução muda de
forma quando o item está lá).

**O que ela deve relatar**, além da foto:

```text
cartoes    quantos nasceram
caixa      a largura x altura REAL do primeiro — é o número que diz se a grade
           está dando o espaço, e foi ele que denunciou o `width:104px` fixo
pedacos    quantos <span>/<i>/<u>/<b>/<s>/<em> o cartão carrega. É o número que
           o dono reprovou quando era dez, e o que ele cobrou de volta
texto      o textContent achatado — para ler o que o cartão DIZ sem abrir a foto
```

As capturas da versão perdida estão em `tools/previas/_cartao/` e no pacote de
continuidade, em `capturas/`. Use-as como alvo.

---

## 5. Como fechar o bloco

```bash
npm run rapido        # 96 suítes sem navegador — ~1 min 25 s
node tools/olhar-cartao.mjs    # e OLHE as quatro imagens. É a segunda metade do Q5
npm test              # a suíte inteira, com Chromium
npm run sabotagem     # o Q2 — obrigatório
git add -A && git commit
```

**Portões que este bloco declara:**

```text
Q1  comportamento — a tabela de campos e o recorte da evolução
Q2  sabotagem — os quatro defeitos novos, mais o S947 realvado
Q5  as DUAS metades: o portão abre a página, e alguém OLHA as capturas
Q6  sem superfície nova
```

**A pergunta que fecha a peça** (`CLAUDE.md`, atenção especial ao visual):

> Se um jogador visse isto pela primeira vez, sem explicação, ele acharia que é
> de um jogo publicado — ou que é um protótipo?

E a que este bloco em particular tem de responder:

> O cartão diz **quem é, se pode ir, o que ele soma e quando ele muda de forma**
> — sem que ninguém precise clicar em nada?

---

## 6. Depois deste bloco

A fila está em `docs/ROADMAP.md`, seção **O QUE FALTA**. O próximo é o **1.33 ·
1.34** — dia, tarde e noite, com a mesma regra do dono que governou o clima:
**efeito visível na wave, nunca um número que ninguém vê.**
