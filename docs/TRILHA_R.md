# Trilha R — a tela que o jogador usa

## ESTADO — leia isto primeiro ao retomar

```
feito       R0 a R12                              TODOS  ·  100%
próximo     — nada em aberto na trilha R
restam      nada. O que sobra está em LACUNAS, com dono
```

**O repositório é `C:\Users\gdult\pa4` e tem git.** `git log --oneline` é o
índice do que fechou; cada mensagem de commit carrega o raciocínio inteiro.
`bc9d5bd` é a `PokeArena (4).zip` como recebida — o ponto zero para comparar.

**Para rodar a suíte com navegador nesta máquina**, o `playwright` está fora do
repositório e precisa ser apontado:

```
PW_MODULO = C:\Users\gdult\pw\node_modules\playwright-core\index.mjs
PW_CHROME = C:\Users\gdult\pw-browsers\chromium-1234\chrome-win64\chrome.exe
```

Sem eles o Q5 é pulado com aviso e o portão Q2 aborta — por desenho, não por
defeito.

**Para jogar:** `npm run jogar` → <http://localhost:8792/app/index.html>

**O portão de olhar precisa das mesmas variáveis:**

```
PW_MODULO=... PW_CHROME=... node tools/olhar-telas.mjs --saida <pasta>
```

E ele é onde os problemas aparecem. Nos blocos R2 e R3, a suíte ficou verde
**antes** de o passo 6 achar: o `max-height` congelado (falso defeito), o
`D-028` (cartão sem CSS nenhum) e a colocação discordando de si mesma na mesma
tela. Nenhum dos três é erro de execução. **Conte com cada bloco de tela
gastando mais tempo de inspeção que de código.**

**A LIÇÃO DO Q2 ATÉ AQUI, e ela vale para todos os blocos seguintes:**
três defeitos escaparam — `S89`, `S312` e `S320` — e os dois primeiros pelo
mesmo motivo: o único captor deles era a linha de base visual, que fotografa a
**fase de aposta**. Nada que só apareça **durante a luta ou no resultado** tem
captor visual. Defeito novo que viva nessas fases precisa de teste próprio, e
não adianta esperar do Q5.

### A armadilha que mais se repetiu: **cobrar a PALAVRA em vez da CONSTRUÇÃO**

Três vezes, e a terceira foi a mais cara porque eram os dois testes de
segurança do R9:

| defeito | o teste cobrava | por que passou |
|---|---|---|
| `S320` | a **ausência** de `gold` na regra | o defeito tirava a declaração de cor, e sem declaração a regra **herda** o dourado — sem a palavra aparecer |
| — | a ausência de `BANNER_SCENES` no arquivo | o **comentário** que explica a remoção cita o nome, e reprovou a própria explicação |
| `S341` `S342` | `armazem: null` e `codigo` no arquivo | o defeito tirava do **código**, e a palavra continuava no **comentário** logo acima e numa variável local |

**A regra que sai disso, e vale para todo teste de texto deste projeto:**

- **ausência de um valor não é presença de outro** — cobre a presença do certo;
- **cobre a chamada, não o identificador**: `criarApi\(\{ armazem: null \}\)`, e
  não `armazem: null`; o corpo do `post`, e não a palavra `codigo` solta;
- **um comentário precisa poder citar o que foi removido.** Proibir o nome
  proibiria a explicação, e código sem a explicação da remoção é como a remoção
  volta atrás.

**Telas que a captura ganhou porque um defeito se escondeu nelas:**
`luta-apostado` (R3, o `D-028`) e `contagem-apostado` (R5, o resultado no
canto). As duas existem porque o roteiro antigo assistia à rodada **de fora**, e
o caminho de quem apostou nunca era fotografado.

**NÃO RODE A SUÍTE ENQUANTO O Q2 ESTIVER RODANDO.** Medido: a suíte `rotas`
voltou `fetch failed` em 3 testes durante um `npm run sabotagem`, e 27/27 verde
sozinha um minuto depois. O portão sobe vários trabalhadores, cada um com
servidor em porta efêmera, e a disputa produz vermelho que não é defeito. Pior
que o incômodo: vermelho falso numa caixa de sabotagem vira `PEGOU` falso, que
o `CLAUDE.md` classifica como pior que `PASSOU` falso.

**Três armadilhas desta máquina**, as três já custaram uma volta cada (a terceira é a de cima, sobre rodar a suíte durante o Q2):

- a linha de base visual é **local** (`visual-base-local.json`, fora do git). A
  versionada foi gravada noutro ambiente, e digital de pixel não viaja entre
  rasterizadores;
- escrever código por *heredoc* de shell **corrompe `\n` dentro de string** — os
  `\n` viram quebra de linha literal e o módulo deixa de analisar. Use a
  ferramenta de edição direta para qualquer coisa com string escapada.

**O que o mockup do dono mostra** (`Artes gerais/prototipo_new_layout.png`):
caixa vermelha = acrescentar (banner do treinador em cima à esquerda, colocação
em coluna própria à direita); X vermelho = remover (painel DEV de velocidade do
replay, barra de volume, colocação duplicada embaixo).

---


**O que é:** a lista de correções e mudanças de interface pedidas pelo dono do
projeto em 21/08/2026, decomposta em blocos executáveis.

**Como ler:** cada bloco abaixo é uma ordem de serviço fechada — escopo,
sabotagem e critério de saída. Um bloco = um commit. `git log --oneline` dá o
índice do que já foi feito, e `git show <hash>` mostra exatamente o quê.

**Onde está o resto:** os defeitos encontrados no caminho vão para
`docs/DEFEITOS.md`; o que for identificado e adiado vai para `docs/LACUNAS.md`,
sempre com bloco dono. É a regra do `CLAUDE.md` e ela não abre exceção aqui.

---

## Por que esta ordem

Ela não é a ordem em que os pedidos chegaram, e a diferença tem razão:

1. **O que bloqueia vem primeiro.** A suíte está vermelha nesta máquina. Sem ela
   verde, nenhuma mudança abaixo tem como ser provada — e o projeto não fecha
   bloco com a suíte vermelha.
2. **Comportamento antes de aparência.** Um botão que não faz nada é pior que um
   botão feio, e três dos pedidos são disso: o valor da aposta que não atualiza,
   o log que não rola, o perfil espremido.
3. **Estrutura antes de pintura.** Mover o banner de batalha e a colocação muda
   o que está em volta da arena. Pintar antes seria pintar duas vezes.
4. **A arena por último**, e é decisão explícita: ela é o maior elemento da tela,
   e os blocos R3 e R4 mexem em tudo que a rodeia. Ajustar o enquadramento antes
   deles seria ajustá-lo duas vezes.

---

## R0 — a suíte volta a ficar verde nesta máquina

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Depende de** —

**O problema:** 49 dos 666 testes falham com `C:\C:\Users\...`. São 41 usos de
`URL.pathname` como caminho de arquivo — no Windows ele devolve `/C:/Users/...`,
com a barra na frente da letra do drive, e o `fs` resolve isso como relativo.
Mais o `playwright` em dois caminhos POSIX fixos, e um `import()` de caminho
absoluto que o Windows recusa por esquema.

**É a mesma correção que já foi feita na linha anterior do projeto** e não
atravessou para cá. Está registrada lá como `D-019`.

**Escopo:** `fileURLToPath` onde o valor vira string de caminho; passar o objeto
`URL` direto onde ele só é lido; `pathToFileURL` no `import()`; e os caminhos do
navegador configuráveis por variável, preservando o padrão de sempre.

**Sabotagem:** voltar um `.pathname` e exigir vermelho.

**Saída:** `npm test` verde nesta máquina, sem tocar em nada de produto.

---

## R1 — os três botões que não fazem o que dizem

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R0

Três defeitos de comportamento, e os três são invisíveis num teste de tela
porque nada clica.

1. **O perfil espremido.** O botão `Limites e pausa` está FORA do `.modal`,
   solto dentro do `.modal-backdrop`, que é `display:flex`. Ele vira irmão do
   perfil e disputa a largura com ele.
2. **O valor da aposta não atualiza.** Escolhido o lutador, clicar numa ficha de
   valor não muda o retorno mostrado — só volta a atualizar ao reclicar no
   Pokémon.
3. **Os diálogos nativos.** `confirm`, `prompt` e `alert` não são garantidos: em
   navegador que os suprime, `confirm` devolve `false` na hora e a ação nunca
   acontece. **O botão de sair fica inerte.** São seis ações assim.

**Sabotagem:** devolver o `</div>` para fora; desligar a atualização do retorno;
devolver um `confirm` nativo.

**Saída:** as três ações funcionam, e há teste que fica vermelho se voltarem.

---

## R2 — o log da batalha

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R0

**O problema:** o feed não acompanha a batalha — fica parado no topo e obriga o
jogador a rolar à mão durante os segundos em que assistir é a única coisa a
fazer. E não dá para aumentar a caixa, que o modelo antigo permitia.

**Escopo:** rolagem automática que respeita quem rolou para cima de propósito
(quem foi ler uma linha antiga não pode ser puxado de volta), e alça de
redimensionamento no canto.

**Saída:** o log acompanha, e a caixa cresce.

**FECHADO.** Medido antes de mexer, com a rodada viva:

```
#log      scrollTop 0   scrollHeight 87 === clientHeight 87   não rola
#ticker   scrollTop 0   scrollHeight 95  >   clientHeight 54   rola, e ninguém rolava
```

O `log()` escrevia `scrollTop` no `#log`, que é `overflow:visible` e cresce com
o conteúdo — atribuição silenciosamente nula. Quem rola é o `#ticker`.

Feito: a caixa de rolagem é encontrada por estilo (`overflow` ≠ `visible`), o
acompanhamento desliga quando o jogador sobe para reler e religa quando ele
volta ao fim, e a caixa aberta ganhou `resize:vertical`. O comportamento de
abrir/fechar saiu do `index.html` para `app/modules/ticker.mjs`, porque soltar
a alça é um `click` e o ouvinte cru fechava a caixa recém-aumentada.

Suíte `test/log.mjs`, 8 testes com DOM de mentira — o defeito não é visível em
teste de texto: a linha errada *parece* certa. Defeitos plantados S303 a S306.

---

## R3 — o banner de batalha sai do perfil e vai para a rodada

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q7 · **Depende de** R1

**O problema:** o banner só aparece ao abrir o perfil, o que não faz sentido —
ele é do jogador NA RODADA. E existe uma aba `SEU LUTADOR` que mostra as mesmas
informações num formato pior.

**Escopo:** o banner ocupa o lugar da aba `SEU LUTADOR`, herdando o que ela
mostrava — valor apostado, retorno possível e odd. A aba deixa de existir. O
banner atual é mantido como está: ele é melhor que o antigo, e o pedido é de
posição, não de desenho.

**Saída:** o banner aparece ao escolher o lutador, com as informações da aba
antiga, e a aba some.

**FECHADO.** O banner ocupa o lugar do `SEU LUTADOR` na zona de ação, e o
rodapé dele herdou o que faltava: **retorno possível**, vida e colocação — o
banner só dizia valor e odd. A prévia fica no perfil, com id próprio, porque
sem ela o jogador escolheria cena e efeito de nome às cegas; o desenho passou
de `#id` para `.battle-banner` para alcançar as duas.

O passo de olhar pegou **duas coisas que a suíte verde não pegava**:

- **`D-028`** — o cartão `SEU LUTADOR` não tinha CSS nenhum. As seis classes
  que ele usava não existiam na folha de estilo, e a barra de vida era uma
  `<div>` de altura zero. Escondido porque a captura de telas assistia à luta
  **de fora**, onde o cartão cai no ramo "você ficou de fora". Por isso a
  ferramenta ganhou a tela `luta-apostado`;
- **a colocação discordando de si mesma** — o rodapé dizia `10º de 12` ao lado
  de um painel que dizia `6º` para o mesmo lutador. O cartão contava sozinho
  ("quantos continuam vivos"); agora sai do `rankingColocacao`, o mesmo quadro
  que o painel desenha.

Módulos novos: `banner-texto.mjs` (o rodapé, puro — retorno é número sobre
dinheiro e precisa de teste sem navegador) e `zona-acao.mjs` (substitui o
`meu-lutador.mjs`). O redesenho por evento saiu do `eventos.mjs` para o
`loop.mjs`: o teste de camadas reprovou a inversão, com razão.

Defeitos plantados S307 a S313. Linha de base visual regravada — a tela da
arena mudou de propósito.

---

## R4 — colocação, abates e o que sai da tela

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 · **Depende de** R3

**Escopo:**

- destaque do líder e risco nos derrotados, com `K.O.` em vermelho ao lado —
  existia no modelo antigo e se perdeu;
- o número de abates volta ao estilo neon do antigo. **A unificação fica**: o
  dono aprovou colocação, odds e abates no mesmo painel;
- **sai da tela**: o painel `DEV / velocidade do replay` e a barra de volume
  solta. Os dois estão marcados com X no mockup, e o primeiro exibe controle de
  teste para o jogador.

**Saída:** o painel unificado com a leitura do antigo, e a tela sem controle de
desenvolvimento.

**FECHADO.** A referência veio do `prototype-v1.0/index.html`, que ainda tinha
as quatro regras que se perderam no porte:

```
.pdrow.p1{background:linear-gradient(...);border-color:var(--gold)}
.pdrow.caiu .nm{text-decoration:line-through;color:var(--dim)}
.pdrow.caiu .st{color:var(--red)}
.kfrow .ko{font-family:var(--px);color:var(--gold)}
```

O pódio passa a valer **durante** a luta, e não só no fim — as medalhas só
apareciam com a rodada encerrada, então as doze linhas eram iguais justamente
enquanto "quem está ganhando?" era a única pergunta viva. Quem decide o que é
pódio é o `realceDoPodio`, no `colocacao.mjs`: um `pos <= 3` escrito em quem
desenha seria a segunda contagem que aquele arquivo existe para evitar.

**Uma armadilha do painel unificado:** `fechado` tem DOIS significados. Na
aposta é "mercado fechado por passivo" e o vermelho é a informação; na luta é
"este caiu", e a mesma coluna passa a ser o número de ABATES. A regra vermelha
atravessava os dois e pintava de alarme o placar de quem o derrotado derrubou
antes de cair. Recortada com `:not(.viva)`.

**O painel DEV já havia saído** desta linha do projeto no V1.16 — vive no painel
de ADM. O X do mockup foi desenhado contra o modelo antigo. Ficou um teste para
que ele não volte. **A barra de volume saiu**; o botão de mudo fica.

Defeitos plantados S314 a S320. Linha de base visual regravada.

---

## R5 — o resultado volta para o centro

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q7 · **Depende de** R4

**O problema:** com lutador escolhido, a contagem `3, 2, 1` e o `K.O.` aparecem
no canto inferior direito, pequenos demais para ler. Sem lutador escolhido, a
contagem aparece no centro, normal. O momento mais importante da rodada é o que
menos se enxerga.

**Escopo:** contagem, `K.O.`, XP ganho e o Pokémon vencedor no centro, como no
modelo antigo. Confete, saco de dinheiro e troféu na vitória. **O GIF do
vencedor sai shiny quando o jogador TEM a skin** — e só quando tem.

**Saída:** o resultado é legível sem procurar.

**FECHADO, e o bloco era menor do que parecia.** O troféu, o saco de dinheiro e
o confete **já existiam** no `#winBox`, com animação — e o CSS dele é byte a
byte igual ao do `prototype-v1.0`. Não faltava coreografia: ela estava sendo
desenhada a 96 px no canto inferior direito.

A causa era uma classe que vaza de fase:

```css
#overlay.apostado{ align-items:flex-end; justify-content:flex-end }
```

Ela está **certa** onde nasceu — durante a aposta, a dica "X é a sua aposta"
não pode tapar os doze lutadores que o jogador veio olhar. O defeito é que
ninguém a removia: `remove('on')` sem `'apostado'`. E havia uma segunda metade,
que a sabotagem obrigou a encontrar: a remoção **só valeria se alguém a
executasse**, e a `atualizarCTA` era chamada apenas de dentro da fase de aposta.
Quem passou a reavaliá-la é o `setPhase` — o único lugar que conhece todas as
transições, como o comentário dele já dizia.

O que de fato faltava era o **GIF shiny do vencedor**, e ele tem regra nos dois
sentidos: sai shiny quando o jogador tem a skin, e **não sai** quando não tem —
senão o cosmético que o R8 vende por conquista aparece de graça.

Defeitos plantados S321 a S326. Linha de base visual **não** precisou ser
regravada: ela fotografa a fase de aposta, e a mudança é do resultado.

---

## R6 — HP e balões de ataque legíveis

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R4

Os nomes na barra de HP e os balões de ataque dentro da arena estão pequenos
demais para identificar o golpe. O modelo antigo tem tamanho confortável e serve
de base.

**Saída:** nome e golpe legíveis nas quatro larguras do portão.

**FECHADO, e a referência do pedido não servia.** As duas regras são byte a byte
idênticas nos dois modelos — `.plate .nm` a 6px e `.bubble` a 7px, no atual e no
antigo. "Voltar ao tamanho do modelo antigo" não mudaria um pixel. O que vale é
o requisito da saída.

O piso é **9px**, e ele não é opinião: 6px e 7px eram os dois menores textos
voltados ao jogador em todo o arquivo, e o terceiro menor — `.bnNv`, ≈8,8px —
nunca teve queixa. Nome 6→9px, golpe 7→10px, com a barra crescendo de 16 para
21px porque fonte maior em caixa igual é texto cortado.

**O passo de olhar pegou:** com a fonte legível, o nome dos caídos passou a ser
o único ilegível da grade — `color:#000` sobre uma barra que o próprio `filter`
escurece. Corrigido para texto claro, e o risco fica.

Dois achados foram registrados com dono em vez de corrigidos aqui: **L-044** (o
balão passa por baixo do crachá de clima — a pilha de camadas da arena é do R11)
e **L-045** (o portão de contraste é cego para `filter`).

Defeitos plantados S327 a S330.

---

## R7 — identidade visual

**Tam.** M · **Método** GL · **Portões** Q1 Q2 Q5 Q7 · **Depende de** R5

Logo e letrado novos onde a marca aparece; a arte da tela de entrada; o Rayquaza
ao fundo das arenas; e os detalhes decorativos que existiam e se perderam — a
Pokébola ao lado do nome, entre outros.

**Saída:** a marca aparece igual em todo lugar, e a tela de entrada tem a arte.

**FECHADO EM PARTE, e o achado foi maior que o pedido.** A identidade visual
inteira já estava no CSS e **não alcançava nada**: `.letrado`, `.letrado.vivo`
(o pulso do neon), `.pokemark` (a pokébola cyber em CSS puro), `.hero-art` e
`.hero-mark` — todas completas, todas sem um único elemento no corpo. A topbar
mostrava `⚔️`, um emoji de espadas, e o hero abria sobre fundo liso.

É o `D-028` invertido: lá havia marcação escrevendo classes que o CSS não
conhecia; aqui, CSS que marcação nenhuma alcança. As duas passam por suíte
verde, porque nas duas nada quebra — só não aparece.

As duas peças do nome saem do `ROTULOS.arena` pelo `marca.mjs`, e não estão
escritas no HTML: o identificador da franquia não pode morar fora do pack.

**O portão visual ficou instável e foi consertado no mesmo bloco.** O letrado
pulsa e a arte deriva; duas capturas da mesma página passaram a diferir pelo
instante do obturador. A captura agora usa `reducedMotion:'reduce'` — que o app
já trata — e o portão voltou a ser determinístico, verde duas vezes seguidas.

**O QUE FICOU DE FORA:** o Rayquaza ao fundo das arenas. Registrado em
**L-046** — o único Rayquaza do projeto está embutido num mockup com navegação
falsa legível no pixel. **Depende de o dono separar a arte**, como o
`LOGO-SEPARADO` e o `LETRADO SHADOW-SEPARADO` já foram separados.

Defeitos plantados S331 a S335.

---

## R8 — o guarda-roupa shiny

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R1

A aba de personalização dos cosméticos shiny do modelo antigo — desbloquear,
equipar e desequipar sem perder a conquista.

**Saída:** o jogador liga e desliga cada skin que possui.

**FECHADO — E JÁ ESTAVA PRONTO.** A aba existe inteira nesta linha do projeto, e
o `test/shiny.mjs` já cobria as dez garantias, incluindo a que dá nome ao
pedido: *desequipar mantém o desbloqueio*. Seguindo a instrução do dono
("filtre o que já foi feito"), o bloco não reconstruiu nada.

**O que faltava era alguém ter OLHADO a aba.** Nenhuma das dez asserções
perguntava se aquilo chega à tela — e é o modo de falha que este trecho do
trabalho já encontrou duas vezes (`D-028` e a identidade visual do R7). Uma aba
que nunca foi fotografada é candidata natural à terceira.

Fotografada (`guarda-roupa.png`): está certa. `9 de 10 vagas livres`, o
desbloqueado com `✓ SEU` e os botões `GIF` / `Arena` separados, e a nota
prometendo que desequipar é seguro.

Acrescentados: a captura, dois testes de alcance, e um teste sobre o TEXTO da
promessa — a garantia existe no código, mas é a frase que faz alguém se arriscar
a usá-la. Defeitos plantados S336 a S338.

---

## R9 — um caminho só para o painel de ADM

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 · **Depende de** R0

**O problema:** hoje há DOIS caminhos. O antigo, por `#adm` no endereço com um
PIN que o próprio código diz não proteger nada, e o novo, no servidor, com dois
fatores. Dois caminhos para a mesma porta é o desenho em que o mais fraco decide.

**Escopo:** o caminho do servidor passa a ser o único, e o `#adm` com PIN sai.
O que o painel precisa mostrar continua sendo o que já foi acordado.

**Q6:** é a superfície de maior valor do sistema. Nenhuma rota administrativa
alcançável sem papel, e nenhuma ação sem registro de operador.

**Saída:** existe um caminho, ele é o do servidor, e está documentado.

**FECHADO.** O PIN saiu do código inteiro. O `#adm` no endereço FICA — endereço
nunca protegeu nada, e não era ele o problema; o problema era o painel com
capacidade real atrás dele. Agora atrás dele há o login de operador.

### COMO ABRIR O PAINEL, hoje

1. **suba o servidor:** `npm run servidor` (o `npm run jogar` serve arquivos e
   não tem backend — com ele o painel recusa, de propósito);
2. abra o jogo e acrescente **`#adm`** ao endereço;
3. informe **e-mail do operador**, **senha** e o **código do segundo fator**.

Sem servidor no ar, nada abre — e a tela diz isso em vez de abrir vazia. A
sessão vive só na memória da aba: **fechar a aba é sair.** Não há PIN, não há
caminho local, e não há painel sem papel.

**A margem local foi embora, e é perda de capacidade declarada.** O campo
gravava em `localStorage`: preço sem papel, sem confirmação e sem registro. O
servidor já declara `margem.definir` como ação destrutiva com papel e auditoria
— e **não tem rota** (**L-047**). Até ela existir, toda rodada usa a margem do
motor, que é a única auditável, e o painel mostra qual é.

Defeitos plantados S339 a S342. Telas novas: `adm-recusa` e `adm`.

---

## R10 — o banner é um só, em três formatos

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R3

Hoje há três artes diferentes para banner. Passam a ser **a mesma arte**, em três
enquadramentos: o do perfil, o da carteira e o da rodada. O cenário de banner do
perfil sai.

**Saída:** uma fonte de arte, três formatos, nenhuma escolha duplicada.

**FECHADO.** Eram dois catálogos para a mesma pergunta: `.cn-*` (dez cenas, que
vestem o banner da rodada e a faixa do topo, onde mora a carteira) e `.sc-*`
(oito gradientes, só do perfil). O jogador escolhia duas vezes, em listas
diferentes, e saía com dois visuais que nunca combinam.

O próprio CSS explicava a duplicação — *"mesmas artes dos `.cn-*` … o `.sc-`
existe separado porque o banner de perfil tem altura e enquadramento
próprios"*. É o pedido lido ao contrário: **enquadramento não é arte.** Altura
própria se resolve com uma regra de altura, não com um catálogo paralelo para
manter em sincronia para sempre.

Saíram `BANNER_SCENES`, a grade `#pickScene`, o campo `scene` do perfil e as
nove regras `.sc-*`. Os três enquadramentos ficam: 112 px no perfil, faixa fina
no topo, banner inteiro na rodada. Defeitos plantados S343 e S344.

---

## R11 — o dimensionamento da arena

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** R4 R6

**Medido, e são dois defeitos sobrepostos:**

```
#arena{ width:100%; aspect-ratio:3/4 }          declara 3:4
#arena{ max-height:min(72vh,760px) }            e o teto vence

com    max-height   373,1 × 369,8    razão 1,009
sem    max-height   373,1 × 497,4    razão 0,750  ← a declarada
```

O canvas é `width:100%;height:100%`, então preenche a caixa deformada e estica
**+34% na horizontal**. Círculo vira elipse — é por isso que as pokébolas antes
da luta estão ovais.

O segundo: o buffer é fixo em `300×400` e aparece a ~466 pixels de dispositivo.
Ampliação de 1,55×, e **não inteira** — com `image-rendering:pixelated` isso
produz colunas de pixel de larguras diferentes, que é o serrilhado irregular.

**Por último de propósito:** R3 a R6 mudam tudo que rodeia a arena, e o
enquadramento depende do espaço que sobra.

**Saída:** círculo é círculo nas quatro larguras, e a ampliação é inteira.

**FECHADO — e eram TRÊS declarações brigando, não duas.** O diagnóstico achou o
par óbvio; a terceira só apareceu quando o teste **mediu as quatro larguras**:
um `max-height:42vh` numa media query de coluna única.

```
1920 (antes)   590,9 × 720,0   razão 0,821    9,4% fora
 700 (antes)   430,0 × 378,0   razão 1,138   51,7% fora
```

Se o teste medisse só a largura do relato, o bloco teria fechado com a metade
PIOR do defeito de pé.

A correção é **não dar duas ordens**: só a largura é declarada, já limitada a
`teto × 3/4`, e a altura sai do `aspect-ratio`. As três media queries trocam só
o teto — a construção é uma só.

O serrilhado era buffer `300×400` numa caixa de 589 px: ampliação de 1,96×, não
inteira. O buffer passou a ter o dobro da resolução lógica com o contexto já
escalado, então a conta virou **redução**. O espaço lógico não mudou — os seis
módulos que desenham por ele não mudaram uma linha.

Defeitos plantados S345 a S347.

---

## R12 — o portão de fechamento volta a poder ficar verde

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Depende de** —

**FECHADO.** Nasceu do `D-029`, achado ao rodar `npm run repetir` antes de fechar
o R9/R10/R11. Não é da trilha original: é defeito da base, e está em `bc9d5bd`.

**O problema:** `npm run portoes` e `npm run repetir` rodam com
`EXIGE_VISUAL=1`, e o `run.mjs` recusa `--so` sob essa variável — com razão,
porque recorte parcial não fecha bloco (é o `S109`). Só que a suíte `portao`
TESTA esse recorte disparando processos-filho com `{ ...process.env }`, e o
filho herda a marca. Ele é recusado antes de rodar, e dois testes falham.

```
node test/run.mjs --so=portao          38/38 VERDE
dentro do repetir (EXIGE_VISUAL=1)      2 VERMELHOS
```

Determinístico, não instável. **O portão que o `CLAUDE.md` manda usar para
fechar bloco não fica verde hoje** — e portão que nunca fica verde deixa de ser
consultado.

**Escopo:** o filho deixa de herdar a marca de fechamento; ele existe justamente
para exercitar o que ela proíbe. Uma linha.

**Sabotagem:** devolver a herança e exigir vermelho — e é o defeito que hoje
está de pé.

**Saída:** `npm run repetir` verde duas execuções seguidas, e um teste que fica
vermelho se a herança voltar.

**Por que não foi feito junto:** não é do R11, e o `CLAUDE.md` põe "corrigir fora
do escopo, mesmo que seja rapidinho" na lista do NUNCA. Ele precisa do ciclo
dele — teste antes, sabotagem, e o defeito plantado no arquivo certo.
