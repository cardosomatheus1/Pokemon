# RETOMAR — o ponto exato de onde continuar

**Este arquivo existe para uma coisa só:** o dono abre uma aba nova do Claude
Code, manda **uma frase**, e o trabalho continua sem perder nada.

> **O comando é:**
>
> ```
> leia docs/RETOMAR.md e continue de onde paramos
> ```
>
> Mais nada. Este arquivo aponta para todo o resto.

**Por que isto funciona:** nada importante deste projeto mora na conversa. Mora
no repositório — na Spec, no ROADMAP, nas LACUNAS, nos DEFEITOS e nas mensagens
de commit, que são longas de propósito. Uma aba nova não perde memória: ela
relê.

**E quem mantém este arquivo sou eu.** Ao fechar qualquer bloco, ele é
atualizado junto — do mesmo jeito que o link local. Se ele estiver velho, é
defeito meu.

---

## 0. ONDE PARAMOS — 25/09/2026, noite

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   T14 FECHADO · os testes em minutos
           npm test   6 min 10 s -> 1 min 45 s   (2218/2218, repetir 2/2)
           npm run rapido  3 min 10 s -> 38,6 s
           Q2 DO BLOCO VERDE 39/39 em 13 min 17 s · 351 reaproveitados ·
           648 ADIADOS (a dívida do Q2 do 1.33, interrompido em 300/1032)
o PRÓXIMO  ver o topo desta seção: ST-1.1 fechada; a fila segue no ROADMAP
```

### ST-3.3 FECHADA — o mapa de emissão, e ele achou a L-185

`test/emissao-idle.mjs` mede, pelo motor, o que três perfis tiram por dia em
sete dias (fixture determinística: mudou a economia, fica vermelho). O achado:
**o maratona tira ~200 de Essência por dia, 8,7× os 23 que calibraram a curva do
Estilhaço**, e ~4.900 de moeda. O teto de encontros segura espécie, não
recurso — o REV-14 com número. Registrado na L-185; a escolha é a **DEC-14**
(recomendação: rendimento decrescente por run no mesmo dia). Com isso o
**INT-01 fechou**.

### ST-3.4 e ST-3.5 FECHADAS — as DEC-08 e DEC-09 aplicadas como padrão

As duas recomendações eram o que o código já faz, e por isso entraram como
padrão (regra do `CLAUDE.md`: recomendação escrita segue sem esperar, e o dono
avisa se não quiser). **DEC-08:** a captura entrega a espécie mostrada — um
teste trava isso, inclusive para o chefe evoluído. **DEC-09:** o custo é por
wave alcançada; sob o botão Avançar a tela passa a dizer, antes de entrar,
"tentar de novo é outra run, com o mesmo custo".

### ST-3.2 FECHADA — duas abas não colhem a mesma coisa duas vezes

O save do idle ganhou revisão: quem carregou uma revisão velha não grava por
cima de uma nova — o disco vence, a tela avisa e recarrega. E a tela ouve o
evento `storage`, que é o que faz a recusa quase nunca acontecer. O limite,
dito: é o máximo honesto enquanto o idle morar no navegador; a garantia de
verdade é o idle no servidor (E8).

**E o T14c:** o Q2 do 1.32b ia avaliar 130 mutantes de navegador (~2,7 h)
porque 30 linhas do `index.html` mudaram. "Tocado" passou a ser o TRECHO (a até
25 linhas do diff), não o arquivo.

### ST-3.1 FECHADA — o baú do Avanço cai em Estilhaço até o estágio 3 (L-159 e L-160)

A recomendação da L-159, construída: o item montável do baú vira partes — 1, 2
e 3 por unidade conforme o estágio — e vem inteiro do 4 em diante. A sondagem
pegou, antes da tela, a primeira versão transformando Essência e PokéCoin em
"estilhaço" (têm porta de drop e nenhum bioma); estilhaçável passou a ser o que
a loja do Estilhaço vende. E a parte ganhou nome ("Estilhaço de Pedra das
Folhas") e o ícone do item — a L-160, que só não aparecia porque nada punha
`est:` num saque. **A calibragem 1·2·3 é minha recomendação, reversível**.

### ST-2.3 FECHADA — o veterano vê a noite (L-183)

Fada entrou na noite do pack (Clefairy é o Pokémon da lua): as rotas que mudam
à noite passaram de 6·7·3·2 para **7·8·3·3** nos estágios 1..4. Três é o teto do
conteúdo no estágio 4 — medido com cada tipo e com combinações —, porque a troca
não pode mudar a raridade do slot (invariante do cartão 1.33). Mais que isso
pede espécies noturnas raras, que Kanto não tem.

### 1.32b (ST-2.1 e ST-2.2) FECHADO — os climas à vista, e a L-177 caiu

A sala de rotas ganhou a legenda dos climas, fechada por padrão. Cada clima diz
o bônus e **em quantas rotas do SEU estágio ele troca um rosto** — o motor é
perguntado rota por rota, e o Sol diz "não muda quem aparece" porque não muda
em estágio nenhum (medido). A legenda não recebe nada da run: o clima sorteado
continua oculto. Quando a run começa, o log diz **"🌼 Pólen trouxe Paras no
lugar de Metapod"**. Olhado nas quatro larguras (`tools/previas/_climas/`).
A sabotagem achou um teste que faltava (S1063: ninguém conferia que o começo da
run GRAVA a linha) — escrito. Sobra do 1.32b a ST-2.3 (L-183), que é conteúdo.

**E o T14b:** o Q2 de bloco de produto estava levando ~1 h porque a onda 1
subia Chromium para todo defeito novo de `app/`. Consertado: o Q2 da ST-1.1
caiu para 2 min 22 s.

### ST-1.2 e ST-1.3 FECHADAS — o Sair desloga; a boutique não vende sem cobrar

**D-109 corrigido:** a decisão saiu do `onclick` para `app/modules/sair.mjs`
(camada 0) — esquece o token e o PIN; com conta real a página recomeça, porque
carteira e perfil do servidor estavam em memória. **D-108 mitigado:** com conta
online, `podeComprar` recusa com o motivo, e o botão fica com o preço,
desligado. O conserto de verdade (posse no servidor) é o E4. Quem comprou com
conta antes disso ficou com a peça sem pagar — registrado, sem recuperação.

### ST-1.1 FECHADA — o teto sente a run colhida (D-107)

`encontrosHoje` passa a somar as runs colhidas das últimas 24 h, que o
`carregar` agora guarda e valida. **E a segunda metade do furo, achada no
conserto:** a reserva de 6 sumia no FIM da run, e não na colheita — no
intervalo, as expedições usavam os mesmos encontros que a colheita depois
entregava. O teste antigo `recuar … para de reservar quando colhida` afirmava
exatamente essa brecha (cobrava 0 antes da colheita); a asserção passou a
concordar com o título. Suíte 2223/2223 em 1 min 40 s; S1044–S1049 pegos; S879
realvado.

### Pedido do dono, 25/09: "cruze os documentos com o código, revise o planejamento, e os testes que levam horas precisam virar minutos"

**Os testes.** Três causas medidas, três consertos, nenhum teste removido:

```text
servidor     14 servidores precificavam 154 k que nenhum teste lia  92 s -> 2 s
paralelo     3 trabalhadores para as suítes de CPU; 2 filas de Chromium
Q2 do bloco  avalia o que o bloco TOCOU; adia, contando, o que só mudou de fecho
             no 1.33: 147 mutantes em vez de 589
```

`npm run portoes` agora fecha bloco com o **Q2 do bloco**; `npm run portoes:tag`
é o nível da tag. `--fatia=k/N` divide o Q2 completo entre máquinas.
**O preço, dito:** um bloco que deixe decorativo um teste DISTANTE (o S15) só
aparece no Q2 completo — o relatório de cada bloco imprime quantos ficaram
adiados. É a DEC-12, adotada pelo pedido.

### O Q2 que fechou o T14 — e a dívida que ele deixou à vista

```text
39 avaliados    21 sem veredito (os 15 do 1.33 que o Q2 interrompido não
                alcançou + os 6 do T14) e os ancorados no que o T14 tocou
                30 pelo atalho do índice, 9 pelo caminho completo · 39/39 PEGOU
351 reaproveitados   chave intacta
648 adiados     quase todos são a mesma dívida: o Q2 do 1.33 parou em 300/1032
                e nunca respondeu por eles. O modo novo não a criou — ele a
                MOSTRA, com número, em vez de exigir 7 h para fechar um bloco
```

**A próxima ação de arnês, e ela não bloqueia produto:** rodar o Q2 completo
UMA vez, em fatias (`node test/sabotagem.mjs --fatia=1/4` … `4/4`, em sessões
paralelas, cada uma commitando o `q2-veredito.json`). Até lá, os blocos fecham
pelo Q2 do bloco e o número de adiados só pode cair.

**O cruzamento.** `docs/CRUZAMENTO_DOCS_CODIGO_2026-09-25.md`. Três defeitos que
nenhum documento conhecia, os três no caminho **com conta real**, os três com
teste que afirma o defeito:

```text
D-107  o teto de encontros volta cheio depois de colher a run   fura o §P5
D-108  com conta real, o cosmético da boutique sai de graça
D-109  o botão ⏻ não desloga a conta real
```

E o idle inteiro (Avanço, OFF, colheita) é autoridade do NAVEGADOR: o
`server/idle.mjs` é transacional e não tem rota. Fica no E8 do plano, com gatilho.

**O plano.** `docs/PLANO_DE_IMPLEMENTACAO.md` — 9 épicos, stories com escopo,
fora, aceite, sabotagem e porte. A ORDEM continua só no ROADMAP: o E1 (os três
defeitos, todos P) passou à frente do 1.32b, pela regra que a própria revisão
escreveu.

**Documentos velhos:** o `RETOMAR.md` da raiz ganhou nota de histórico; o
cabeçalho do ROADMAP e o `CLAUDE.md` foram corrigidos. Arquivar as filas mortas
(CONTINUAR, ORDEM, PAUTA…) é a ST-6.1 — não foi feito de uma vez de propósito,
porque alguns testes leem `docs/`.

### O que espera o dono

DEC-13 (CI no GitHub) · DEC-11 (os 154 k sims — ~~o maior custo que
sobrou nos testes~~: medido, são 30% das sondas; decide-se pela economia) · DEC-07/08/09 com o que o código JÁ faz escrito
ao lado (plano, seção final) · DEC-01..06.

## 0-. ANTES — 25/09/2026, fim do dia

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   1.33 FECHADO · o elenco muda com a noite e com o clima
           (Q2 e suíte: ver a mensagem do commit do 1.33)
o PRÓXIMO  1.32b — mostrar que climas existem (L-177), junto com a L-183
```

### O 1.33 fechou: a noite passou a mudar QUEM aparece

A run que começa de noite (horário de Brasília) troca um mob por um noturno —
fantasma, venenoso ou psíquico — e o chefe é recalculado. O clima faz o mesmo
com a tabela que já decidia o bônus. Sem condição nenhuma, os 44 estágios são
IDÊNTICOS aos de antes (fixture fotografada antes de mexer no motor). A run que
já estava em curso não muda.

**Na tela:** a sala de rotas, de noite, diz *"É noite: quem tem a lua só sai a
esta hora"* e marca esse rosto com anel violeta e lua. O clima continua oculto
na sala — ele só se revela quando a run começa.

**Olhando, três ajustes:** a lua ficava coberta pelo ícone vizinho; sumia sobre
sprite amarelo; e um fecho de comentário sobrando engoliu a regra CSS inteira
sem nenhum erro — virou teste e defeito plantado (`S1037`).

**Registrado:** L-183 (no estágio 4 só 2 das 11 rotas mudam de noite — o
veterano quase não vê) e L-184 (a fauna de enfeite do cenário não sabe que é
noite).

## 0-. ANTES — 25/09/2026, início do dia

```text
o ESTADO   1.34 FECHADO · Q2 VERDE 1017/1017 · suíte VERDE 2184/2184
           a cena do idle tem dia, tarde e noite, no horário de Brasília
```

### O 1.34 fechou, na terceira forma

A janela do céu no canto do palco — o sol e a lua no mesmo arco, a lua mordida,
estrelas acendendo, um horizonte de morros. A luz da hora como camada com
`multiply` sobre a cena inteira. E à noite o cenário fica MAIS FORTE: brasa,
vaga-lume e neve somados ao escuro, que era a metade que o dono destacou. O
banner da expedição passou a andar a cada segundo.

**Duas tentativas foram reprovadas OLHANDO**, e nenhuma por teste: estrelas
espalhadas na grama com a noite virando neblina; depois `multiply` no canvas
errado, pintando o chão de azul puro. Ficaram no histórico.

### Chegou uma revisão externa do plano, e ela foi CONFERIDA, não só lida

`docs/revisao-2026-09-24/` — 22 achados, feitos só com os documentos. A
conferência contra o código está em `CONFERENCIA.md` nessa pasta. O essencial:

```text
REV-03  o "viés de +19,22%" que justificava 154.000 sims era conta errada:
        é 0,31%. Eu tinha repetido o número errado ao dono. Corrigido na Spec,
        no estudo de economia e no motor. Virou a DEC-11 (L-182): manter os sims?
REV-08  a API dizia janela de 30 s; o código usa 40 s. Corrigido
REV-09  o §7.22 dizia 6 mobs e 2 chefes; o código faz 4 e 1. Spec corrigida
REV-01  a TAREFA_1.27f dizia "a fazer" depois de feita. Corrigido
REV-02  o T11 aparecia na frente com o arnês congelado. Corrigido
DEC-10  o fuso: a cena lia o UTC cru, três horas adiantada no Brasil.
        DECIDIDA pelo dono — BRASÍLIA PARA TODOS
```

**Adotado:** as correções conferidas, a governança (o ROADMAP é a fila única, o
RETOMAR é o estado único) e o cartão 1.33 revisado. **Não adotado:** trocar os 27
documentos pelos reescritos — o revisor os escreveu sem o código, e ficam na
pasta como referência.

### O que espera o dono

**DEC-11** (os 154.000 sims) e as decisões DEC-01 a DEC-09 da revisão — a lista
está no `ROADMAP.md`, seção *Esperando decisão do dono*.

---

## 0a. ONDE PARAMOS — 16/09/2026

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   1.27f · T9 · T10 · T13 · T11a FECHADOS
           Q1 VERDE 2162/2162 com navegador · Q2 VERDE 1005/1005
           o portão fecha em 3 MINUTOS quando o bloco não toca em app/ nem no
           arnês, e o `npm test` caiu de 7m44 para 5m44
```

### O T11a, que nasceu de uma pergunta do dono

> *"e dá pra diminuir esse relógio nos testes?"*

Dá, e medindo apareceu um defeito que passou blocos escondido atrás de uma linha
de base VERDE: a `capturarBase` chamava `__passoQuadros(2)` **de dentro** do
predicado do `waitForFunction`, e o agendador do Playwright depende do
`requestAnimationFrame` que o `RELOGIO_QUADROS` substituiu.

```text
[perfil] sondas=1  quadro=2        em 30 s de espera
```

A sondagem ficava presa na fila que ela mesma deveria drenar.

> Os 30 s nunca foram o app avançando. Eram o app chegando na fase de apostas
> por **relógio de parede** — o oposto do que o D-099 comprou.

```text
capturarBase, 4 larguras   177 s  ->  61 s     2,9x
npm test inteiro          7m44s  -> 5m44s     -2 min em TODA execução
```

E as quatro larguras passaram a chegar no MESMO quadro 448 — o ganho de
determinismo é maior que o de tempo.

### O NÚMERO QUE MUDA A ROTINA DO PROJETO

```text
Q2 com a árvore INTOCADA      3 min 02 s     0 reavaliados de 1002
antes do T13                  ~4 min         14 reavaliados
Q2 depois de mexer em test/   124 min        148 reavaliados
Q2 do zero, sem cache         453 min
```

**O requisito de 30 min do dono está cumprido para o bloco que não mexe na
tela**, e continua devido para o que mexe — esse é o **T11**. A diferença entre
os dois casos é o boot do Chromium por mutante, e nenhuma poda o move.

### O 1.27f saiu, e ele é produto — o primeiro em seis dias

O cartão da equipe estava parado desde 10/09 com a ordem de serviço pronta em
`docs/TAREFA_1.27f_CARTAO.md`. Saiu inteiro, e o que ele resolve é uma
contradição que era minha e não do dono:

```text
04/09   "uma loucura, bagunça total, muito feio e confuso"
10/09   "você removeu as informações de stats, lv que evolui etc."
```

**As duas queixas são verdadeiras.** A contradição só existe se a resposta for
esconder — e foi essa a resposta errada que eu dei em 04/09. O problema nunca
foi a QUANTIDADE de informação: era a FORMA dela.

```text
compacto    reabsorve `forma` e `evolucao`; xp/potencial/natureza ficam na ficha
stats       3 linhas de texto de 27 px viram 3 barras de 18 px, número DENTRO
evolução    ficha de uma linha: `evolui` miúdo, o requisito é a manchete
nível       aparece UMA vez (com a barra de XP junto ele saía repetido)
lista       flex-wrap vira GRADE; o cartão aceita a largura que a grade dá
cartão      104x144  ->  147x198 no largo, 125x198 no estreito
```

### TRÊS DEFEITOS DE LEITURA que a suíte não pega, e a captura pegou

Nenhum é erro de execução. Os três aparecem para quem olha, e é exatamente a
classe dos três do V1.15 que passaram por 299 testes verdes.

```text
1  "ATQ" em 8 px mede ~25 px e transbordava a coluna de 20 — o preenchimento
   da barra cobria o Q
2  `.f-ve b` usava var(--gold), que é o ACENTO do tema e vale #00e5ff no
   padrão: VEL saía CIANO do lado de DEF, que também é ciano
3  o rodapé da concentração virou CÉLULA da grade e ocupou o lugar do quinto
   cartão
```

O `tools/olhar-cartao.mjs` foi refeito (ele tinha se perdido num `/tmp` limpo) e
agora **reprova sozinho** no caso 1. Ele fotografa o painel nos dois modos em
duas larguras, **e o primeiro cartão sozinho a 3×** — porque densidade não se
julga numa página de 2 500 px, e as duas queixas do dono eram sobre densidade.

### O que o portão custou, e o que isso diz sobre os 30 min

```text
execução 1   143 min   275 reavaliados · 723 reaproveitados · VERMELHO 1/998
execução 2   129 min   145 reavaliados · 853 reaproveitados · VERDE 998/998
```

O único escapado foi um defeito **meu**, do próprio 1.27f, e o motivo é uma
armadilha que vale registrar:

> **O S1002 era um mutante EQUIVALENTE.** Ele mudava uma linha que um `return`
> anterior já tornava inalcançável. Nenhum teste podia pegá-lo, porque não havia
> o que pegar — o comportamento era idêntico.
>
> Mutante equivalente não é teste fraco: é defeito mal plantado. Replantado para
> tirar a guarda `temItem`, ele passou a morder na hora.

### E a execução 2 revelou o que faltava para entender os 30 min

**145 reavaliações por UMA linha de definição de defeito mudada.** Fui medir, e
são dois eixos independentes — que é a razão de o T9 ter fechado sem os 30 min:

```text
D-106 / T13   QUANTIDADE   114 dos 145 não foram causados pelo bloco. O
              (bloco P)    `portao.mjs` já cobra que `defeitos-plantados.mjs`
                           não invalide tudo, mas cobra no ARNES — e ARNES é o
                           que se SOMA a um fecho RESOLVIDO. Para as 22 suítes
                           de fecho TUDO a guarda não vale nada
T11           CUSTO        ~31 s de parede por reavaliação. O piso é o boot do
              (bloco M)    Chromium por mutante, e nenhuma poda o move
```

**O T13 vem primeiro: é P, e hoje TODO bloco paga 114 reavaliações caras só por
acrescentar um defeito plantado** — coisa que todo bloco faz.

### O que entrou para a fila neste bloco

```text
D-105  `semTexto` não entende literal de expressão regular, e o `$` de uma
       âncora volta como "usa sem importar: $"          bloco dono T12 (novo)
T12    proposto em BUILD_BLOCKS, com escopo, sabotagem e saída
```

O D-105 tem **teste que afirma o defeito de propósito** em
`test/invariantes.mjs` — ele fica vermelho no dia em que o T12 consertar, e é
assim que se sabe que a entrada em `DEFEITOS.md` virou mentira.

### O T13, que nasceu no meio disto e fechou junto

Ele não estava na fila: apareceu porque a execução avisou **145 reavaliações por
UMA linha de definição de defeito mudada**. A causa é uma guarda que existia,
tinha teste, passava verde e não fazia o trabalho dela:

> O `portao.mjs` cobrava que `test/defeitos-plantados.mjs` ficasse fora do
> **`ARNES`**. Mas `ARNES` é o que se SOMA a um fecho **RESOLVIDO** — para as 22
> suítes de fecho `TUDO` a exclusão não valia nada.

É o **D-106**, e é a terceira vez que a mesma forma aparece (D-103, D-105). A
classe já tem nome: **guarda escrita a partir de um exemplo protege aquele
exemplo.**

O conserto: a exclusão saiu do `ARNES` e virou `FORA_DA_DIGITAL` em `fecho.mjs`
— o funil por onde TODA digital passa. E o teste deixou de procurar uma linha no
TEXTO do `sabotagem.mjs` e passou a CHAMAR a função, que é o que o teste antigo
não fazia e por isso o defeito escapou.

### A DECISÃO QUE FECHA O DIA, e ela é do dono

Pergunta dele, 16/09: *"o que estamos fazendo é desenvolvimento ou estamos
corrigindo erros?"*. O `git log` respondeu:

```text
últimos 8 dias        49 commits
  de PRODUTO           1     o 1.27f
  de arnês/portão     40
```

**O arnês está CONGELADO.** A regra nova está no `CLAUDE.md`, seção *"O arnês
serve o produto, e não o contrário"*:

> Bloco de arnês só é construído quando ele IMPEDE trabalho de produto, e com
> orçamento nomeado ANTES de começar. *"O portão não termina"* impede; *"o
> portão está lento"* não.

Achado novo de arnês vai para `DEFEITOS`/`LACUNAS` com bloco dono e espera. Os
números que fecham a conta: portão de 7 h para 3 min 02 s, suíte de 9 min para
5 min 44 s.

### O PRÓXIMO *(de 16/09 — HISTÓRICO; a fila viva é só a do ROADMAP)*

`docs/ROADMAP.md`, seção **O QUE FALTA**.

```text
T11            o outro eixo dos 30 min: um navegador vivo por trabalhador.
               O T13 derrubou a QUANTIDADE de mutantes; o T11 ataca o CUSTO
               de cada um (~30 s de boot de Chromium)
1.33 · 1.34    PRODUTO — dia, tarde e noite, com a regra do dono que governou
               o clima: efeito VISÍVEL na wave, nunca um número que ninguém vê.
               A L-178 nasce junto: hoje o clima muda o que a wave RENDE, e
               não QUEM aparece nela
T8 · T4 · T7   manutenção do arnês
1.30           os 34 ícones de item — ⏸️ espera o dono mandar a arte
```

E três que não são código, todos com dono e todos parados: **L-042** (arte do
ContentPack original, prazo: antes do fim da V1), **L-012** (consulta de
enquadramento regulatório, BLOQUEIA A TAG), **L-010** (política de publicidade e
afiliados, sem dono em nenhum documento).

---

## 0b. ONDE PARAMOS — 15/09/2026, madrugada

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   Q1 VERDE 2145/2145 com navegador · árvore limpa · tudo empurrado
           T9 e T10 CONSTRUÍDOS e MEDIDOS, esperando só o Q2 completo
```

### O dia inteiro foi ARNÊS, e o 1.27f não foi tocado

Isso precisa ser a primeira frase porque é a mais importante para quem retomar:
**nenhuma linha de produto mudou em 14/09.** O cartão da equipe continua onde
estava, com a ordem de serviço pronta em `docs/TAREFA_1.27f_CARTAO.md`.

O que aconteceu foi que o repositório saiu do `pa4` pela primeira vez, e o arnês
inteiro quebrou — sete defeitos, todos da mesma família:

```text
D-095  sete tools/ calculavam a raiz com idioma de Windows       CORRIGIDO
D-096  a passada estreita ESCREVIA a linha de base visual        CORRIGIDO
D-097  prazo de PAREDE contra relógio de ANIMAÇÃO                CORRIGIDO
D-098  booleano onde precisava ser conjunto (7 sondas para ler 1) CORRIGIDO
D-099  a tela da arena não reproduz                              RESOLVIDO*
D-100  o portão afogava a máquina e lia afogamento como captura  CORRIGIDO
D-101  o portão era dependência de si mesmo                      CORRIGIDO
L-179  o cache do Q2 estava no .gitignore                        VERSIONADO
```

\* O D-099 é uma **desistência medida**: a arena saiu da digital de pixel depois
de cinco tentativas. Está escrito o que se perde e o que cobre no lugar.

### O QUE O PORTÃO CUSTA, medido a cada etapa

```text
sonda visual (4 larguras, 7 sondas)     226 s
depois do D-098 (corte de sondas)        82 s
depois do T10 (a luta em sonda própria)  30 s      7,5x no total
```

### E A LIÇÃO QUE CUSTOU O DIA

> **Cada melhoria do portão invalidava o que tornava o portão rápido.** O T9
> matou o cache de vereditos; o T10 matou o índice de captura. Medi ganho real
> em cada peça e nunca colhi o ganho agregado, porque a próxima correção sempre
> reiniciava a contagem.

Os dois lados estão consertados — D-101 (o cache) e a tabela `IRMAS` em
`sabotagem.mjs` (o índice). **A partir daqui, mexer no arnês é barato.**

### O QUE FALTA, e é uma coisa só

`npm run sabotagem` verde. Na máquina de medição (4 núcleos, container) ele
projeta ~9 h e o container cai antes. **Na máquina do dono ele deve ser bem mais
rápido**, e é a primeira execução que colhe todas as correções juntas.

```bash
npm run sabotagem      # é isto que fecha o T9 e o T10
```

Se vier verde: marcar T9 e T10 como fechados no `BUILD_BLOCKS` e seguir para o
**1.27f**, que é produto e é o que o dono pediu.

### Uma dívida registrada, e ela é séria

O `Q2 VERDE 987/987` de 14/09 pela manhã — que fechou o D-095 e o D-096 — está
marcado como **NÃO CONFIÁVEL** no D-100: rodou com 4 caixas afogando 4 núcleos,
e nessa condição suíte que reprova por falta de CPU conta como `PEGOU`. Não está
provado falso; está provado não confiável. A execução que vier o substitui.

---

## 0c. ONDE PARAMOS — 14/09/2026, noite

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
           (até hoje este comando só funcionava no Windows — D-095)
a PASTA    C:\Users\gdult\pa4
o ESTADO   T9 fechado · Q1 VERDE 2144 · o portão saiu de 7 h para ~90 min
```

### O dia inteiro foi uma coisa só: o repositório saiu do `pa4` pela primeira vez

E quebrou em quatro lugares, todos da mesma família — **o que faz o projeto
rodar e o portão ser rápido morava fora do repositório**:

```text
D-095  sete tools/ calculam a raiz com idioma de Windows        CORRIGIDO
D-096  a passada estreita ESCREVIA a linha de base visual       CORRIGIDO
D-097  o portão reprova a si mesmo: 4 navegadores, 4 núcleos    CORRIGIDO
D-098  o booleano do navegador subia 7 sondas para ler 1        CORRIGIDO
L-179  o cache do Q2 estava no .gitignore                       VERSIONADO
```

### O requisito que o dono fixou no meio disso

> **O portão completo em no máximo 30 minutos.** Ele disse que não aceita nada
> diferente, e que desistiria de esperar 7 h de novo.

O cache de vereditos e o índice de captura **entraram no git** (`.gitattributes`
os marca `-diff`, então o diff de bloco continua legível). Clone novo não paga
mais a execução fria.

### T9 — feito, e o que ele mediu

```text
--so=visual   226 s -> 82 s      mesmos 49 testes
portão        7 h -> ~90 min aqui · ~53 min na máquina do dono
```

O corte foi transformar um **booleano** em **conjunto**: `--so=visual` subia
sete Chromiums e lia um. Nasceu `SONDA_DA_SUITE` em `bandeiras.mjs`, com duas
guardas para que nenhuma suíte suma calada (S109) — e a segunda foi sabotada
antes de merecer confiança.

### T10 — o próximo, e ele é menor do que parecia

O cronômetro por fase (`Q2_TEMPOS=1`, novo) mostrou que **metade dos 64 s que
sobraram é a partida sendo jogada em tempo real**. A leitura trouxe a boa
notícia: a luta já está isolada no fim da sonda, e só **4 dos 49 testes**
dependem dela — 27,5 s dos 64.

Partir a luta em sonda própria é o T10, e a ordem de serviço está no
`BUILD_BLOCKS`. Ele também manda **medir o paralelismo**: 4 trabalhadores dão
2,3x em 4 núcleos, e 2 ou 3 podem render mais.

### E o 1.27f continua esperando

Nada disto mexeu na fila de produto. A ordem de serviço do cartão da equipe
está em `docs/TAREFA_1.27f_CARTAO.md`, escrita para quem não acompanhou nada.

---

## 0d. ONDE PARAMOS — 14/09/2026, manhã

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
           ATENÇÃO: até hoje este comando SÓ funcionava no Windows. Ver D-095.
a PASTA    C:\Users\gdult\pa4
o ESTADO   Q1 VERDE 2044/2044 (sem navegador) · Q2 VERDE 987/987 · árvore limpa
```

### O que aconteceu em 14/09: o repositório foi aberto fora do `pa4`

E foi a primeira vez. Três coisas quebraram na hora, e as três são a MESMA
coisa dita de três jeitos: **o que faz este projeto rodar e o portão ser rápido
mora fora do repositório, e só existe na máquina do dono.**

```text
D-095  sete tools/ calculam a raiz com `.slice(1)` no pathname — idioma de
       Windows. No POSIX a raiz sai DOBRADA e o servir.mjs responde 404 no
       jogo. Só um dos sete tinha teste.        CORRIGIDO (fileURLToPath)

D-096  a passada ESTREITA do Q2 criava a linha de base visual com 4 entradas
       onde a cobertura cobra 16, e o portão abortava para sempre culpando a
       configuração.                            CORRIGIDO (recusa + remédio)

L-179  o cache de vereditos está no .gitignore. Clone novo paga o Q2 A FRIO,
       sempre. Medido aqui: 6 h 58 min, 987 reavaliados, 0 reaproveitados.
```

### E o dono fixou um requisito no meio disso

> **O portão completo em no máximo 30 minutos.** Ele disse que não aceita nada
> diferente disso.

Não é conforto. A conta mostra que o caso QUENTE dele já está em ~24 min (99
reavaliados × 14,4 s), e que o `CLAUDE.md` anuncia 68 min para um portão que
hoje custa ~4 h a frio — o número foi medido com 283 defeitos e são 987.

**O bloco é o `T9 — O portão em 30 minutos`**, proposto no `BUILD_BLOCKS` com a
lacuna `L-179`. O item 1 dele é MEDIR, e a medição é entregável: decompor os
25 s por mutante antes de consertar qualquer coisa.

### O próximo bloco continua sendo o 1.27f

Nada do que aconteceu em 14/09 mexeu na fila de produto. A ordem de serviço
está em `docs/TAREFA_1.27f_CARTAO.md`, escrita para quem não acompanhou nada.

---

## 0e. ONDE PARAMOS — 13/09/2026

```text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\Users\gdult\pa4
o ESTADO   6514917 · Q1 VERDE 2137/2137 · Q2 VERDE 987/987 · árvore limpa
```

### Duas coisas que você precisa saber antes de qualquer outra

**1. O bloco 1.32 FECHOU** — commit `6514917`, em 13/09. Clima do Avanço: sete
climas, o bônus saindo da raridade do tipo, cinco canais, véu e partículas na
cena, cartão e linha no log. Q1 2137/2137, Q2 987/987.

O Q2 achou um buraco que eu tinha deixado: o **S988** troca a semente derivada
da raiz por `Math.random` e ESCAPOU da primeira execução. Dezoito asserções
mediam o que o clima PAGA, e nenhuma olhava de onde ele VEM.

> O §P3 é a regra mais antiga do motor, e foi a que ficou sem guarda. Eu testei
> a aritmética com cuidado e deixei a PROCEDÊNCIA dela sem uma linha.

**2. O bloco do cartão da equipe (1.27f) se PERDEU e precisa ser refeito.** Ele
estava construído e verde. Eu o desfiz com as próprias mãos para separar dois
blocos em dois commits, guardei o backup em `/tmp`, a sessão foi interrompida, e
três dias depois o `/tmp` tinha sido limpo.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** O
> lugar de pôr trabalho de lado neste projeto é um commit de rascunho.

**A ordem de serviço para refazer está em `docs/TAREFA_1.27f_CARTAO.md`** —
escrita para ser executada por quem não acompanhou a conversa: as seis mudanças
arquivo a arquivo, os três testes que mudam junto, os quatro defeitos plantados
novos, e a ferramenta de olhar que se perdeu com ele.

As capturas de antes e depois estão em `tools/previas/_cartao/` e servem de
alvo.

### E um estrago que o mesmo episódio causou, já consertado

O script de reversão cortou o `app/index.html` por índice de string e duplicou
**3 725 linhas** — de 7 861 para 11 586, com zero remoções. O arquivo abria,
rodava, e tinha metade do conteúdo duas vezes.

Quem pegou foi o pré-voo do Q2, com trinta defeitos plantados de âncora
ambígua — porque o trecho que cada um procura passou a existir duas vezes.

```text
o conserto   tools/conserta-index.mjs — reconstrói de HEAD e reaplica as duas
             inserções do 1.32, CONFERINDO o tamanho final e cada marcador
o resultado  7 861 -> 7 906 linhas (base + 45 do clima)
```

> Editar um arquivo de 8 000 linhas por recorte de string é operação sem rede.
> Ela não falha com erro: falha com um arquivo que abre e roda.

---

## 1. O que ler primeiro, nesta ordem

```text
CLAUDE.md                        COMO se trabalha aqui. Vem antes de tudo.
docs/RETOMAR.md                  este arquivo — onde paramos
docs/PAUTA_2026-09-08.md         tudo que está pausado, lacuna a lacuna
docs/ROADMAP.md                  a fila: feito, pausado, prioridade
docs/POKEARENA_SPEC_MASTER...md  §7.22 — o Avanço, que é o trabalho de agora
git log --oneline -12            o que foi construído, e por quê
```

---

## 2. ONDE PARAMOS — 08/09/2026, noite

### A trilha A — o AVANÇO (Spec §7.22)

O idle deixou de ser um contador: dez waves por estágio, chefe na décima, e a
batalha acontece DENTRO do cenário do bioma.

```text
A1  ✅ o elenco do estágio sai do pack        engine/elenco-estagio.mjs
A2  ✅ a resolução da wave                    engine/wave.mjs
A3  ✅ HP, stamina, as quatro poções, o baú   engine/avanco.mjs
A5  ✅ abate ≠ encontro ≠ avanço              engine/avanco.mjs
A6  ✅ a bola durante o avanço                engine/avanco-bola.mjs
A7  ✅ a reserva, o que rende, o treino       engine/ausente.mjs
A4a ✅ a run acontece NO RELÓGIO              engine/roteiro-wave.mjs
                                              engine/run-avanco.mjs
A4b ✅ A BATALHA NA TELA                      app/modules/avanco-*.mjs
A4c ✅ a mão do jogador, o que a run PAGA, e o teto que avisa (L-151)
A4d ✅ a duração pela FORÇA e o foco no Avanço (L-152, L-153)
A4e ✅ ROTA OFF / TRAINER OFF vira aba própria (L-154)
A4f ✅ a leitura da run — Hunt Analyzer, ícones e cores no log
A4g ✅ a batalha que se LÊ — e o D-079, que estava por baixo de tudo
```

**A Prioridade 0 fechou**, e depois dela três blocos da ordem:

```text
1.31 ✅ a BOUTIQUE de PokéCash      101 peças, 33 à venda, 19.750 a coleção
1.29 ✅ a Essência vira ESTILHAÇO   52,85% do que caía não tinha porta
1.27 ⏳ EM CURSO — a ordem do dono FECHOU inteira; falta o L-164
```

---

## 2a-bis. O 1.32 — O CLIMA DO AVANÇO, fechado em 10/09/2026

A L-119, e a regra que governa a trilha inteira do clima e do dia:

> "os blocos anteriores serão aplicados já dentro da nova metodologia" — e, para
> o clima: **efeito VISÍVEL na wave**, nunca um número que ninguém vê.

```text
CLIMA          TIPO(S)        COBERTURA   EQUIPE CHEIA   CANAL
Sol Forte      fogo             11 esp        +18%       XP
Chuva          água             32 esp        +11%       ritmo
Vendaval       voador           16 esp        +15%       moeda
Tempestade     terra+pedra      19 esp        +14%       material
Névoa Tóxica   veneno           33 esp        +10%       item raro
Pólen          planta           14 esp        +16%       material
Nevasca        gelo              4 esp        +30%       item raro
Tempo Firme    —                  —             —        40% do peso
```

### As três decisões que valem reler

```text
o QUANTO sai da RARIDADE   e não de uma tabela. O dono levantou o Gelo (4 de
                           146); a resposta não foi escrever um número maior na
                           linha dele — foi o número vir da cobertura, para que
                           ninguém reescreva nada quando o elenco mudar
paga quem foi ENVIADO      regra literal dele. A sprite é encenação; quem paga
                           é quem o jogador escolheu levar — senão o bônus é
                           sorteio sobre sorteio, sem decisão nenhuma
revelado ao ENTRAR         a mesma decisão da Arena. Sabido antes, a escolha de
                           equipe vira conta ("deu Nevasca, levo os quatro de
                           gelo") e o resto do time deixa de existir
```

### E o que o jogador VÊ, que é a metade que o §7.22 existe para proteger

```text
o VÉU          cor sobre o chão, por baixo dos lutadores
as PARTÍCULAS  46 gotas no panorâmico, 15 no estreito — por DEZ MIL PIXELS de
               janela, medido em 846 px opacos (1,01% da tela)
o CARTÃO       nome, o que rende, quanto, e GRAÇAS A QUEM
o LOG          no primeiro segundo da run, e não no extrato do fim
```

### Dois erros meus que só a FOTO pegou

```text
a DENSIDADE    escrevi 46 num campo que é "por dez mil pixels". Em 403x207 dava
               384 gotas, e o teto de 90 escondia o erro atrás de uma parede
               d'água. Quem pegou foi a asserção de que a janela larga tem MAIS
               gotas que a estreita: as duas estavam grampeadas em 90
a FRASE        "para quem é water" — chave interna em vez do nome do tipo. Eu
               remontei um texto que o pack já escrevia certo no `desc`
```

> Nenhum dos dois é erro de lógica, e nenhum teste verde os teria dito. Os dois
> são a segunda metade do Q5 fazendo o trabalho dela.

E um terceiro, do mesmo tipo, achado ao LER a captura: `.avClimaNome` e
`.avClimaFrase` eram dois `<span>` com `margin-top` — e margem vertical não vale
em elemento inline. A tela mostrou **"CHUVAninguém da equipe"**. O estilo não
falhou: ele foi ignorado, que é diferente e mais silencioso.

---

## 2b. O 1.27 — FECHADO INTEIRO, e o 1.27e é o que ele ensinou caro

```text
7a85cac  1.27   a ordem aprovada — os cinco itens
652cfe5  1.27b  a SALA de rotas e o cartão dobrado
f2b6008  1.27c  os números do dano
03751e4  1.27c  o EFEITO do golpe sobre o alvo
1fc9665  1.27d  a Rota OFF, e um erro que esperava um dado
e6f4247  1.27d  o AVANÇO PROGRESSIVO
cf1f9ea  docs   a progressão, o que o bloco ensinou, o que ficou aberto
   ↓
1.27e  O SUMIÇO DA SPRITE — e o bloco anterior fechou dizendo que estava pronto
```

### O que o dono cobrou, e ele estava certo pela terceira vez

> "as sprites continuam bugadas sem sair os efeitos de ataque, e os pokémon
>  selvagem ficam sumindo as sprite, precisamos resolver isso logo, **3 dias
>  praticamente na mesma coisa**"

Duas causas, e nenhuma delas era o que eu tinha consertado:

```text
D-090   o baixador pedia as folhas de combate só para o elenco da ARENA —
        76 de 146. O Avanço põe na tela o elenco do ESTÁGIO, que sai dos
        BIOMAS. 70 espécies sem Attack nem Hurt em disco
D-091   a escolha da folha perguntava à TABELA (que tem as 146), e não ao
        disco (que tinha 76). Trocar para uma folha que não existe deixa o fundo
        VAZIO — o bicho some no instante do golpe, e a
        placa de nome fica no ar. É exatamente o que as capturas mostram
D-092   o estouro do efeito nascia em coordenada de TELA e era pintado num
        canvas de MUNDO. A escala da run é 3×: cada estouro caía ao triplo
        da distância da câmera, fora da janela
```

### E as folhas SEMPRE existiram na origem

Eu tinha escrito, num comentário do bloco anterior, que *"só 82 das 146
espécies têm essas folhas em disco"* — e construí a queda para trás em cima
dessa frase. Medido em 10/09/2026: **HTTP 200 em todas as que testei.**

> Aceitei um download pela metade como se fosse a fronteira do material, e
> passei um bloco inteiro desenhando em volta dela.

```text
                       ANTES        DEPOIS
Attack-Anim.png em disco    76          146
Hurt-Anim.png em disco      76          146
estouros FORA DA TELA  (ninguém contava)  0
foto COM estouro no ar (nunca existiu)  tirada
```

## 2c. O QUE ESTE BLOCO ENSINOU, e é o que vale reler

**Seis vezes** o portão Q2 reprovou um defeito plantado meu pela MESMA causa —
arquitetura, e não redação:

```text
S934  a separação das placas    a conta morava junto do `style.transform`
S938  a marca do quadro         o filtro morava dentro de uma `innerHTML`
S943  o aviso do foco futuro    a frase morava dentro de uma `innerHTML`
S944  a frase do foco neutro    idem
S963  a limpeza dos números     em camada 4
      o efeito do golpe         a tabela e o carregador vinham do mesmo lugar
```

> **Conta que só pode ser verificada com navegador acaba verificada por
> ninguém.** Afirmar que uma função EXISTE e é CHAMADA não afirma que ela FAZ
> algo — e o defeito mora exatamente entre as duas coisas.

### E QUATRO vezes uma sonda mediu a coisa errada

```text
o número do dano    reportou ZERO logo depois de eu consertar o D-083 — ela
                    olhava o nó adicionado, e ele passara a nascer DENTRO dele
a raridade          escrevia 'comum' num campo DERIVADO, e o dono pegou olhando
                    uma captura que EU anexei: "um charizard desde quando é comum?"
a passada do chefe  voltou idêntica à wave 1, e só não passou porque o relatório
                    passou a dizer EM QUE WAVE a foto foi tirada
o estouro           "quantos estão no ar AGORA" responde zero quase sempre —
                    ele vive meio segundo
```

> Sonda que mede o instante errado dá um número, e número parece medição.

### E a QUINTA sonda errada foi a mais cara de todas

O 1.27c fechou dizendo **"14 estouros agendados, 413 desenhos"**. Os dois
números estavam certos: a função rodou 413 vezes. E a tela não tinha efeito
nenhum, porque todos os 413 caíam fora da janela.

> **Contador conta CHAMADA.** Ele não olha para a tela, e por isso não sabe se
> o que foi desenhado caiu no lugar — ou se caiu fora dela.

O que a esteira aprendeu a fazer, e que é o conserto de método:

```text
CONTAR os que caem fora do canvas    o número que estava faltando
ESPERAR o estouro estar no ar        e só então fotografar — ele vive meio
                                     segundo, e toda foto anterior o perdia
DIZER os 404 pelo NOME               ela os FILTRAVA por serem comuns, e era
                                     essa a classe de erro que custou 3 dias
PERGUNTAR a pergunta seguinte        "está fora o estouro, ou o mob?" — foi
                                     ela que separou o D-092 da L-175
```

### E a esteira salvou o que a suíte não pegou

O D-089 matou a cena inteira — zero placas, zero números, zero efeitos — com a
suíte VERDE. Quem pegou foi a contagem da esteira: **três zeros juntos não são
coincidência**. O buraco do portão está na L-174.

---
## 3. O QUE ESPERA O DONO — a lista que não arquiva sozinha

```text
⏸️ L-158  quais dos 9 TRAJES vão à vitrine   STAND BY por decisão dele em
                                             09/09 — volta quando os
                                             cosméticos entrarem em pauta
✅ os VÍDEOS do Baiak                        LIDOS em 09/09 — a seleção de
                                             hunt e a movimentação. Ver L-164
✅ L-161  as decisões de 09/09               DECIDIDAS, e registradas
✅ L-142  o veredito sobre a prévia          APROVADO em 08/09
🔴 L-137  os ícones — ele manda um a um      1.30 está SEGURADO a pedido dele
🔴 L-117  o repasse do RMT                   segurado por ele, duas vezes
🔴 L-144  o laboratório B1..B7               falta a curva: custo e ganho
🔴 L-143  o Vulcão não sustenta 4 estágios   recomendação escrita
🔴 L-135  os preços da loja                  nunca passaram pelo estudo
```

---

## 4. A ORDEM DEPOIS DO AVANÇO *(de 08/09 — HISTÓRICO; a fila viva é só a do ROADMAP)*

```text
1º  A4    o Avanço inteiro                ✅ FECHADO em 08/09
1º  1.31  a BOUTIQUE de PokéCash          ✅ FECHADO em 09/09
1º  1.29  a Essência vira ESTILHAÇO       ✅ FECHADO em 09/09
2º  1.27  Arena e farm multi-bioma        É O PRÓXIMO — a L-140 mudou de
                                          forma com o Avanço: mandar dois no
                                          mesmo bioma virou DUAS FRENTES DE
                                          WAVE, e a ficha deixou de ser um
                                          ajuste de número para virar desenho
3º  1.29  a essência vira Estilhaço       o maior buraco de economia aberto,
                                          e o desenho está PRONTO na L-138
4º  1.27  Arena + multi-bioma
5º  1.32–34  clima · dia/noite · como funciona
    1.30  os ícones                       ENTRA QUANDO A ARTE CHEGAR
    1.28  o quadro de log                 ABSORVIDO pelo A4
```

---

## 5. Como rodar

```bash
npm run rapido        # a suíte sem navegador — ~1 min
npm run sabotagem     # o portão Q2 — obrigatório para fechar bloco
npm run portoes       # tudo, com navegador
node tools/servir.mjs --porta 8099
```

```text
o JOGO     http://localhost:8099/app/index.html
a PRÉVIA   http://localhost:8099/app/previa-avanco.html
a PASTA    C:\Users\gdult\pa4
```

**Variáveis já no shell:** `PW_MODULO` e `PW_CHROME` — o portão visual precisa
das duas.

---

## 6. As regras que mais pegam, e que estão no CLAUDE.md

Vale reler as cinco, porque são as que mais custaram neste projeto:

```text
§0.3     nenhum identificador da franquia em engine/ — COMENTÁRIO CONTA.
         Já me pegou SETE vezes.
Q5       tem duas metades, e a segunda é OLHAR. Verde não é legível.
Q2       fechar bloco com o portão vermelho não acontece. Nem "é só teste".
ÂNCORA   defeito plantado com âncora perdida se REALVA, nunca se apaga.
O DONO   nunca fica sem o jogo na mão: ao fechar bloco, o link local vai no
         relatório, conferido.
```

E a lição que este projeto repete mais que qualquer outra:

> **A afirmação passa por um caminho que o defeito não toca.** SEIS vezes: eu
> medi um lugar e falei do conjunto. Quando um teste passar e a sabotagem
> escapar, a resposta quase sempre é essa.
