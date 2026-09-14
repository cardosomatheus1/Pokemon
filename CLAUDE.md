# PokéArena — instruções do projeto

Leia isto antes de tocar em qualquer coisa. Ele governa **como** se trabalha aqui;
o que construir está nos documentos de `docs/`.

## O que é

Battle royale automático de apostas com moeda simulada. 12 lutadores sorteados de
um elenco, odds por Monte Carlo, 30 s de aposta, batalha determinística que o
jogador assiste. Em torno disso, um metagame de treinador em construção.

Estado: protótipo v0.8 congelado em `prototype/`, sendo reconstruído em blocos.

## Hierarquia dos documentos

```
docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md   o QUÊ — fonte de verdade
docs/POKEARENA_BUILD_BLOCKS_v1.2.md                 o COMO e em que ordem
docs/POKEARENA_DESIGN_DEPTH_v1.1.md                 por que o metagame é assim
docs/POKEARENA_ECONOMY_STUDY_v1.2.md                economia do jogo
docs/POKEARENA_UNIT_ECONOMICS_STUDY_v1.2.md         economia da empresa
docs/RETOMAR.md                                     ONDE PARAMOS — leia numa aba nova
docs/ROADMAP.md                                     o mapa: feito, pendente, prioridade
docs/POKEARENA_DOCUMENT_INDEX_v1.4.md               índice; começa por ele
docs/DEFEITOS.md                                    defeitos achados, não corrigidos
docs/LACUNAS.md                                     trabalho identificado, adiado
```

Conflito entre documentos: a Spec vence. Se a Spec estiver errada, corrija a Spec
no mesmo commit — não contorne no código.

---

## A regra central

> **Um bloco constrói só o que está no escopo dele.**
> Ao fechar qualquer bloco, o jogo continua jogável e a suíte continua verde.

Foi a ausência dessa regra que custou três versões ao projeto (v0.6.1 → v0.6.3):
uma correção de sprites virou troca de fonte de arte e o jogo inteiro saiu errado.

### Quando você encontrar algo fora do escopo

Nunca conserte em silêncio, e nunca ignore. **Registre e aponte o bloco dono.**

| Achou | Vai para | Precisa conter |
|---|---|---|
| Algo **quebrado** hoje | `docs/DEFEITOS.md` | causa, medição, bloco dono, teste que trava |
| Algo **faltando** ou adiado | `docs/LACUNAS.md` | por que não cabe agora, bloco dono, o que a destrava |

Ambos exigem **bloco dono nomeado**. "Depois" não é bloco. Se nenhum bloco
existente serve, proponha um novo em `BUILD_BLOCKS` no mesmo commit — com id,
método, portões e sabotagem, como os outros.

Defeito registrado ganha teste que **afirma o defeito de propósito**, para ficar
vermelho quando alguém corrigir. Ver `D-001` em `test/invariantes.mjs`.

---

## O ciclo de um bloco

```
1. LER        o bloco + o estado do repositório
2. ESCREVER   os testes, antes do código
3. SABOTAR    quebrar de propósito; se a suíte não fica vermelha, o teste é
              decorativo — volte para o passo 2
4. CONSTRUIR  o escopo, e nada além
5. VERIFICAR  portões do bloco + suíte inteira
6. OLHAR      se o bloco mexeu em tela: capture e LEIA as telas afetadas.
              Verde não é legível — ver Q5, as duas metades.
7. FECHAR     um commit, critério de saída marcado
8. RELATAR    o que mudou, o que foi para DEFEITOS/LACUNAS, com as capturas
```

### Os nove portões

`Q1` comportamento · `Q2` sabotagem · `Q3` invariantes · `Q4` regressão
estatística · `Q5` visual · `Q6` segurança · `Q7` crítico cego · `Q8` carga e
concorrência · `Q9` telemetria.

**Q5 é o que pega erro de ligação.** Teste estático não vê símbolo não importado
nem atribuição a binding importado — os dois derrubam o app em execução e
passaram verdes pela suíte inteira mais de uma vez. O portão abre o jogo num
navegador de verdade e reprova em qualquer `pageerror`.

**Q5 tem DUAS metades, e a segunda é olhar.** O portão automatizado prova que a
página *funciona*; ele não prova que ela está *legível*. São perguntas
diferentes, e a segunda não tem como ser respondida por número.

No V1.15 três defeitos passaram por **299 testes verdes**: um rótulo de texto
transbordando o cartão e cobrindo a arte, uma coluna inteira empurrada para fora
da dobra por um `max-width` que ficou para trás, e um campo de formulário
estreito demais para o próprio placeholder. Nenhum deles é erro de execução;
todos são erros de leitura.

Por isso **todo bloco que mexe em tela fecha com inspeção visual**:

```
1. capture as telas afetadas em PNG, nas larguras que o layout muda de forma
   (hoje: 1920, 1440, 1100, 420 — inclua uma acima do `max-width` do `.app`)
2. OLHE cada uma. Não é conferir que abriu: é ler o que está escrito.
3. anexe as capturas ao relatório do bloco
```

**Quando a tela mudar de arranjo, e não só de conteúdo, use um crítico cego** —
é o portão Q7, e ele existe para isto. O crítico recebe as imagens e uma barra
**nomeada**; não recebe o que foi construído, nem o que se espera ouvir. Barra
vaga é o modo de falha nº 1 da metodologia GL: o crítico inventa a comparação e
aprova tudo.

A barra que está em uso, e que se pode reusar: **TESTE DOS 3 SEGUNDOS** — um
apostador que nunca viu o produto responde, sem instrução e sem rolar, quanto
tempo falta, em quem apostar e qual o retorno, quanto tem e quanto vai apostar,
e o que está acontecendo agora. Nota por pergunta e por largura, com o lugar
exato da tela onde o olho responde. *Nota sem localização não vale.*

**Q1 e Q2 são obrigatórios em todos os blocos.** Os demais conforme o bloco
declara. Um bloco sem superfície nova escreve `Q6: sem superfície nova` —
explicitamente, para que a ausência seja decisão e não esquecimento.

### As duas metodologias

- **GL — Gauntlet Loop** (`.claude/skills/gauntlet-loop`, CC BY 4.0, ver
  `ATTRIBUTION.md`): onde existe barra **nomeada, buscável e comparável**.
  Espetáculo, identidade visual, texto, telas. Barra vaga é o modo de falha nº 1:
  o crítico inventa a comparação e aprova tudo.
- **INV — dirigido por invariante**: onde a correção é binária. Motor, seed,
  precificação, ledger, settlement, economia competitiva. Não force gauntlet
  aqui; a barra seria uma especificação e o loop degenera em concordância.

---

## Comandos

```bash
npm run portoes            # suíte DUAS vezes com navegador + sabotagem
npm run repetir            # só a repetição — instável reprova como vermelho
npm run assets             # baixa a arte para assets/, fora do versionamento
npm test                   # suíte (pula Q5 se não houver navegador)
npm run sabotagem          # Q2 completo — obrigatório para fechar bloco
npm run sabotagem:tocados  # Q2 parcial, DURANTE a construção (ver abaixo)
npm run test:gerar         # regrava fixtures E linha de base visual (~5 min)
npm run gerar:visual       # SÓ a linha de base visual — 49 s (T3)
npm run rapido             # as 96 suítes sem navegador — 1 min 25 s (T6)
npm run snapshot           # regera o instantâneo do protótipo (paridade)
```

### Um número documentado envelhece, e envelhecer é mentir

O `rapido` esteve **quatro blocos** subindo cinco Chromium e descartando o que
eles mediam: 3 min 30 s onde esta linha prometia 7 s. Ninguém notou porque o
defeito não tinha sintoma — suíte verde, contagem certa, só o relógio sabia. É o
**D-059**, e as duas metades dele valem como regra:

```text
o 7 s     era verdade com 21 suítes; hoje são 96, e uma delas (servidor) custa
          39 s sozinha. Número em documento não se atualiza sozinho.
o 21      virou 96 quando o D-017 derivou a lista, e a linha não foi reescrita
```

**Número que aparece no `CLAUDE.md` é medição, e medição tem data.** Quem o
citar num bloco novo mede de novo antes; quem o achar errado corrige na hora, no
commit do próprio bloco, com o número velho ao lado do novo.

### O recorte `--so` acelera a construção, e não fecha bloco nenhum

`node test/run.mjs --so=contraste,visual` roda só as suítes nomeadas; a mesma
bandeira no `--gerar` regrava só as fixtures nomeadas. Medido no T3: o laço de
construção caiu de **2,5 min para 0,8 s**, e a regravação da linha de base de
**5 min para 49 s** — porque o Chromium não sobe quando o recorte não pede suíte
que precise dele.

**Ele não fecha bloco.** `npm run portoes` recusa a bandeira, o recorte grita que
foi parcial nas duas pontas, e nome que não casa com suíte nenhuma **reprova** em
vez de rodar vazio. Execução vazia com a palavra VERDE é a falha mais silenciosa
que este arnês pode ter, e é o defeito `S109`.

### O Q2 reavalia o que pôde mudar, e reaproveita o resto

O portão reavaliava os 208 defeitos a cada bloco: **~100 min medidos**, crescendo
em dois eixos ao mesmo tempo — bloco novo traz defeitos novos *e* engrossa a
suíte que cada defeito roda. Acelerar a execução mudaria a constante e deixaria
a curva de pé; em três blocos voltaria a doer.

```
Q2 do zero, sem cache         68 min      (283 defeitos, era ~100 com 208)
Q2 depois de mexer em UM arquivo   3 min 40 s
reaproveitados               246 de 283
```

Medido no fecho da Fase 1, e é o número que importa: **o portão cresceu de 208
para 283 defeitos e a execução quente ENCOLHEU.** O custo é proporcional ao
tamanho da mudança, não ao do projeto — que era exatamente a promessa.

Os 14 reavaliados com o repositório intocado são exatamente os 14 de fecho
universal — ver **L-035** e o bloco **T4**, que existe para derrubá-los.

O que derruba a curva é a observação de que **o veredito de um defeito é função
de três coisas e de mais nada**:

```
a definição do defeito   (arquivo, de, para)
o conteúdo do arquivo onde ele é plantado
o fecho da suíte que o pegou   (tudo que ela lê e executa)
```

Iguais byte a byte aos da última avaliação, reavaliar devolve a mesma resposta.
`test/fixtures/q2-veredito.json` guarda a chave que amarra as três, e
`test/fecho.mjs` calcula o fecho.

**Isto não é amostragem, e a diferença é o que faz este modo fechar bloco.** O
`--tocados` PULA defeitos: responde sobre uma fatia e cala sobre o resto. Aqui os
208 seguem respondidos — cada um foi reavaliado agora, ou nada de que ele depende
mudou. O relatório diz quantos de cada, e a frase é verificável linha a linha.

O custo passa a ser proporcional ao **tamanho da mudança**, e não ao tamanho do
projeto.

Duas regras que sustentam isso, e as duas têm teste no `portao.mjs`:

- **só se guarda `PEGOU`.** Reaproveitar um `PASSOU` seria o portão herdando a
  própria falha: o defeito escaparia hoje porque escapou ontem;
- **dúvida no fecho resolve para `TUDO`.** Suíte que dispara processo filho tem
  fecho universal — errar para mais custa uma reavaliação, errar para menos faz
  o portão mentir.

`npm run sabotagem:completo` ignora o cache. É o que roda antes de uma tag.

### Toda espera de portão tem prazo

O portão visual ficou **mais de 300 segundos sem terminar e sem imprimir uma
linha**, e a suíte inteira parou com ele. A causa foi um `await` que não termina:

```js
await pg.evaluate(() => Promise.all(
  imagensPendentes.map(i => i.decode().catch(() => {}))));
```

`decode()` de uma imagem PENDENTE não resolve nem rejeita — ela só fica. O
`catch` cobre rejeição, e rejeição é exatamente o caso que não acontece.

```text
o gatilho    loading="lazy" numa vista escondida: a imagem nunca entra na fila
o sintoma    log vazio, Chromium vivo e ocioso, zero CPU
o que achou  uma sonda escrevendo com appendFileSync, que não bufferiza
```

**Log vazio não é "travou antes de imprimir": é "não terminou, então não
descarregou".** Duas execuções foram descartadas como travadas sem terem sido, e
uma terceira foi tomada por vermelha quando estava só parada — foi assim que o
Q2 abortou dizendo que a configuração com navegador estava quebrada.

A regra que fica, e ela vale para qualquer espera nova:

> **Portão que não termina não julga nada** — e por isso nenhuma espera dele
> pode ser ilimitada. Perder uma espera custa um vermelho com endereço; travar
> custa a execução inteira e não deixa por onde começar.

`waitForFunction` já tinha prazo. `evaluate` não tinha, porque ninguém tinha
imaginado um `await` que não termina dentro dele. É o **D-069**.

### Toda configuração que julga precisa da própria linha de base

O portão validava UMA configuração como verde — sem navegador, quatro larguras —
e **julgava em quatro**. Nas outras três ele acreditava em qualquer vermelho, e
foi por aí que o **D-015** entrou: a passada estreita deixava a `visual-base`
vermelha para todo mutante, e uma execução inteira voltou `VERDE — 208/208` com
`PEGOU` falso em tudo que chegava ao navegador.

`PEGOU` falso é pior que `PASSOU` falso: o segundo manda investigar, o primeiro
manda seguir em frente **e esconde os defeitos que de fato escapam** — dois
estavam escondidos ali.

`garantirBase` valida cada configuração na primeira vez que ela é usada, numa
caixa que nunca recebe mutante, e aborta nomeando a configuração. Preguiçoso de
propósito: validar as quatro sempre custaria ~3 min, e a execução quente leva 4.

### Duas reduções que só podem CONDENAR

O mesmo raciocínio aparece em mais dois lugares, e a regra é sempre a mesma:

> **vermelho numa configuração reduzida é vermelho na completa; verde não conclui
> nada.**

- a **onda 1** roda só as suítes que podem pegar aquele defeito — o captor da
  execução passada e as de nome derivado do arquivo. Vermelho ali encerra o
  mutante; verde cai no caminho completo;
- `SABOTAGEM_ESTREITA=1` roda a suíte visual em **uma** largura (34 s) em vez de
  quatro (65 s). Verde estreito **sempre** reexecuta com as quatro antes de
  qualquer veredito — um mutante que só quebra o arranjo em 420 px não pode
  voltar como `PASSOU`.

O que nenhuma delas pode fazer é produzir um verde. Quem reprova o portão é
sempre a execução completa.

### `sabotagem:tocados` acelera a construção, e não fecha bloco nenhum

Roda só os defeitos ancorados em arquivo que o `git status` mostra alterado.
Medido no V1.14: **15 de 78 defeitos, 2,3 min em vez de 12**. Serve para saber
se os defeitos NOVOS do bloco funcionam, sem pagar o portão inteiro a cada
tentativa.

**Não substitui o `npm run sabotagem`.** Um bloco que mexe no `render.mjs` pode
quebrar um defeito ancorado na `coreografia.mjs`, e só a execução completa vê
isso — foi exatamente o que aconteceu com o S15 no V1.14. O modo grita isso no
começo e no fim, e o `npm run portoes` continua rodando o portão inteiro.

### O pré-voo

Antes de montar caixa de areia, a sabotagem confere que cada defeito ainda tem
onde ser plantado: âncora presente **exatamente uma vez**, arquivo legível, `de`
diferente de `para`, id único. Aborta em 0,1 s se algo estiver errado.

Existe porque o V1.14 gastou **19 dos seus 53 minutos de portão** com duas
falhas dessa classe. Âncora perdida quase sempre significa que um bloco moveu o
trecho — **realve o defeito para onde o comportamento mora hoje, não apague o
defeito.**

**Zero dependências no repositório.** O portão Q5 precisa de `playwright-core`,
instalado **fora** do projeto — ver `tools/README.md`. `npm test` pula Q5 com
aviso; `npm run portoes` exige, porque portão que pula em silêncio é decorativo.

## Fixtures

`test/fixtures/` é o comportamento fotografado da base v0.8, mais a linha de base
visual. Regravar **só** em bloco que muda comportamento de propósito, **no mesmo
commit**, com a diferença explicada na mensagem. Fixture regravada sem explicação
é a forma mais fácil de esconder uma regressão.

`visual-base.json` guarda impressão digital de 32×32 em RGB, não PNG: a captura
conteria arte de terceiros, e comparar PNG exigiria dependência. Os sprites são
bloqueados durante a captura, então a linha de base mede a **nossa** interface.

`margem.json` (F0.6) não é fotografia: é **medição**, com 300 rodadas × 8.000
simulações. A suíte roda um lote curto a cada execução e confere que continua
compatível com o arquivado. Fixture de medição se regrava quando a medição muda
de propósito — e o número novo vai na mensagem do commit, ao lado do antigo.

## Commits

Um bloco, um commit. A mensagem diz o que mudou, o que foi medido, e o que foi
para DEFEITOS/LACUNAS. Se regravou fixture, explique a diferença.

Branch de trabalho: `claude/pok-arena-repo-setup-qgcn76`.

---

## Nunca

- Corrigir fora do escopo do bloco, mesmo que seja "rapidinho".
- Fechar bloco com a suíte vermelha — ou com ela **instável**, que é pior:
  vermelho constante é defeito com endereço, instável escolhe quando aparecer.
- Regravar fixture sem explicar a diferença.
- Pular a sabotagem porque "o teste obviamente funciona".
- Substituir arte, som ou dado por outro de fonte diferente quando o original
  falhar. **O resgate busca a mesma coisa em outro endereço, nunca outra coisa** —
  lição registrada da v0.6.1.
- ~~Versionar material de **terceiros**.~~ **A REGRA MUDOU**, por decisão do dono
  do projeto, quando o build passou a ser privado — jogado por amigos, sem
  aquisição paga e sem monetização. `assets/` agora ENTRA no repositório, para
  que quem clona possa jogar sem rodar um comando a mais.

  O que a regra protegia continua valendo e mudou de lugar: **publicar** um
  produto com stake econômico sobre assets de terceiros é o que o §0.3.1 proíbe,
  e isso não mudou. A distância entre os dois estados é uma linha —
  `ARTE_EMPRESTADA_DE` em `content/escolhido.mjs` — e o `test/saida-v09.mjs`
  recusa a tag enquanto ela estiver preenchida.

  **Arte NOSSA continua entrando em `arte/`.** Aplicar a regra ao contrário
  custou quase três imagens no porte da v1.0; ver `arte/README.md`.
- Ligar qualquer feature de valor econômico real sem o checkpoint do §25.1.

## Ao copiar de outro jogo

**Nunca entregue a cópia.** Referência entra como matéria-prima, e sai como coisa
nossa — com uma diferença que se possa NOMEAR.

Decisão do dono do projeto, 30/08/2026, e vale para tudo: arte, mecânica,
interface, economia.

```text
1. ANALISAR    o que a referência faz BEM, e por quê. Não "como ela é".
2. NOMEAR      a diferença que a nossa versão vai ter, antes de construir.
3. APERFEIÇOAR o ponto fraco dela — toda referência tem um.
4. VESTIR      no nosso tema (neon/cyberpunk sobre sprite GBA), que não é
               enfeite: é o que faz a coisa parecer nossa e não emprestada.
```

Se ao fim não dá para dizer **em uma frase** o que a nossa versão faz melhor ou
diferente, ela não está pronta — está copiada.

O exemplo que originou a regra: o formato de torre do Pokerogue é bom e serve de
base. O que ele NÃO tem é a nossa arena por trás, o dossiê que ele alimenta, e a
identidade visual do tema. A nossa versão só existe quando essas três coisas
estiverem na tela.

## Sempre

- Medir antes de mexer. É o método do projeto e já evitou várias decisões erradas.
- Comentar o **porquê**, não o quê. O protótipo faz isso bem; mantenha.
- Tratar proteção do jogador como requisito, não como conformidade (Spec cap. 28).
- Manter o motor agnóstico ao tema. Nenhum identificador da franquia fora do
  ContentPack.

## Três coisas que travam o projeto e não são código

1. Consulta de enquadramento regulatório (Spec §0.5.1).
2. Arte do ContentPack original (Spec §0.3.1) — prazo: antes do fim da V1.
3. Política de publicidade e afiliados — sem dono em nenhum documento.

## Toda implementação visual merece atenção especial

Decisão do dono do projeto, 30/08/2026. **Banner, cenário, outfit, avatar,
moldura, ícone, tela — tudo que é visual ou estético entra por esta porta**, e
não pela porta do "funciona".

O motivo está registrado em três lugares deste arquivo e vale reunir aqui:

```text
V1.15   três defeitos passaram por 299 testes VERDES — todos de LEITURA
v0.6.1  uma correção de sprites virou troca de fonte de arte e custou 3 versões
prévias o dono reprovou duas rodadas seguidas: "nem cenário nem treinador estão
        legais" e "parecem estar sobre o cenário, não dentro"
```

Nenhum dos três aparece em teste. Todos aparecem para quem olha.

### O que "atenção especial" quer dizer, em passos

```text
1. NUNCA ENTREGAR O MÍNIMO QUE FUNCIONA
   Um sprite que aparece na tela não é a entrega. A entrega é o sprite que
   parece pertencer àquele lugar.

2. ACRESCENTAR UM DETALHE QUE NÃO FOI PEDIDO, e que a cena precisa
   sombra, oclusão, partícula, luz, profundidade, um prop na frente dos pés.
   Foi assim que o cenário deixou de parecer colagem: nada disso estava no
   pedido, e sem nada disso o pedido não estava cumprido.

3. OLHAR NA PROPORÇÃO REAL, e não no código
   É a segunda metade do Q5. Capturar, abrir e LER — nas larguras em que o
   arranjo muda, e no tamanho em que o jogador vai ver.

4. VESTIR NO TEMA
   O mundo é GBA, a interface é neon. Toda peça nova escolhe um dos dois de
   propósito, e nunca fica no meio por descuido.

5. NOMEAR A DIFERENÇA
   Vale a regra de cópia acima: se ao fim não dá para dizer em uma frase o que
   a nossa versão faz melhor ou diferente, ela não está pronta.
```

### A pergunta que fecha qualquer peça visual

> Se um jogador visse isto pela primeira vez, sem explicação, ele acharia que é
> de um jogo publicado — ou que é um protótipo?

Enquanto a resposta for "protótipo", a peça não fechou.

## O cenário do idle nunca está pronto

Decisão do dono do projeto, 01/09/2026, e ela é **regra permanente** — não uma
tarefa de um bloco.

> "a intenção sempre o cenário de bioma iddle se parecer o mais vivo possível,
>  pense que muitas pessoas vão largar por horas nessa tela, e vão está vendo
>  outra tela um filme ou serie sei lá só exemplo, se for algo feio e mal
>  visualizado, você acha que essa pessoa vai querer ficar vendo?"

O argumento é o que a torna regra, e não preferência. **Esta tela é a única do
produto que é olhada por horas sem interação.** Todas as outras são atravessadas:
o jogador aposta e sai, escolhe a rota e sai. Esta fica aberta ao lado de um
filme. Um defeito de leitura numa tela atravessada custa um segundo de confusão;
na tela de fundo, custa a sessão inteira — a pessoa simplesmente fecha.

### O que isso obriga, na prática

```text
TODO BLOCO que passe perto do cenário procura uma melhoria, mesmo que o
           escopo dele seja outro — e a registra, mesmo que não a construa
NENHUMA    entrega de cenário é "suficiente". A pergunta do §atenção especial
           vale em dobro aqui: parece de um jogo publicado, ou parece protótipo?
O DONO     não precisa pedir. Ele já pediu, uma vez, para sempre.
```

E o inverso também: **isto não vira desculpa para desviar de bloco.** Vale a
mesma regra da divisão de trabalho — a melhoria que aparece no meio de outra
coisa é REGISTRADA e encaixada, não construída na hora. O que muda é que ela
nunca é descartada por "não foi pedido".

### Por que ela precisou ser escrita

Porque eu já entreguei o mínimo três vezes nesta tela, e as três o dono pegou
olhando: as partículas diluídas num mundo oito vezes maior, a cachoeira parada,
a fenda em tracejado. Nenhuma estava quebrada. Todas estavam *prontas* pelo
critério de funcionar, e nenhuma estava pronta pelo critério dele.

---

## A divisão de trabalho

Decisão do dono do projeto, 31/08/2026, e ela é metodologia — não preferência.

```text
ELE   lança ideia solta, a qualquer momento, fora de ordem, no meio de outra coisa
EU    destrincho, formulo, organizo, e decido SE aplica e QUANDO aplica
ELE   dá veredito — mas só no que for crucial
```

Na palavra dele: *"Faço sempre lançamento de ideias, pa pa pa pa ideia pra crlh,
você destrincha, formula, organiza, e decide como aplicar ou não aplicar e dou
veredito, isso quando for coisas cruciais."*

**A ordem e a forma de aplicar são minhas.** Perguntar "faço agora ou depois?" é
devolver exatamente a decisão que ele delegou.

### O risco que essa divisão cria, e a regra que o contém

> **Ideia solta não vira desvio de rota.**

Ele avisou junto: *"não se perca nos processos"*. O modo de falha é eu abandonar
o bloco aberto a cada ideia nova e terminar com seis frentes pela metade — que é
a mesma doença que a regra central deste arquivo já trata, chegando por outra
porta.

Ideia que chega no meio de um bloco:

```text
1. REGISTRA   docs/LACUNAS.md, docs/DEFEITOS.md, ou o mapa de decisões (DEC-###)
2. ENCAIXA    na ordem, com bloco dono nomeado
3. FECHA      o bloco que já estava aberto
4. RELATA     o que entrou, onde foi parar, e em que posição da fila
```

A exceção é a ideia que **muda o bloco em curso** — aí ela entra agora, porque
terminar o bloco na forma antiga seria construir algo que já se sabe errado.

### Recomendação minha é o padrão

Quando eu apresentar uma recomendação de desenho, **sigo com ela sem esperar
aprovação**; ele avisa quando não quiser. A recomendação tem de estar **escrita
e visível** antes de eu construir em cima dela — no commit, em `LACUNAS`, ou no
relatório do bloco.

Parar e perguntar continua sendo o certo em três casos, e só neles:

```text
caro de desfazer      migração de dado, formato de arquivo que já tem acervo
valor econômico real  §25.1 — loja, mercado, qualquer coisa com dinheiro
ambíguo de verdade    duas leituras levam a trabalhos materialmente diferentes
```

### E eu cobro o que ele esqueceu

Pedido dele, 30/08/2026. Decisão pendente do dono é registrada com dono e fica
na lista do relatório até ele decidir. "Ele não respondeu" não arquiva nada.

## O dono nunca fica sem o jogo na mão

Decisão do dono do projeto, 03/09/2026, e ela é **regra de metodologia**:

> "toda vez que você ver que o token não será suficiente pra finalizar você
>  deixa um navegador local aberto disponível com local e um diretório de onde
>  está a pasta atual do projeto em meu pc. Isso se torna regra, e ao finalizar
>  os blocos também é necessário essa atualização"

O motivo é o mesmo da regra central deste arquivo, chegando pela ponta dele: **o
jogo tem de estar jogável quando eu paro**, e "jogável" para o dono quer dizer
*aberto num endereço que ele consegue clicar*, não "verde na minha suíte".

### Quando

```text
AO FECHAR   todo bloco, sem exceção
ANTES DE    acabar o orçamento de contexto — e isso se ANTECIPA, não se descobre
            depois. Parar sem deixar o endereço é parar mal.
```

### E o `docs/RETOMAR.md` é atualizado junto

Decisão do dono, 08/09/2026: ele separa as abas de trabalho por data, e quer
abrir uma nova sem perder o ponto.

> **O comando dele é um só:** `leia docs/RETOMAR.md e continue de onde paramos`

Isso só funciona se o arquivo estiver vivo. **Ele é atualizado no fecho de todo
bloco, junto com o link local** — nada importante deste projeto pode morar só na
conversa, e este arquivo é a prova disso ou a mentira sobre isso.

### E ELE COBROU AS DUAS COISAS DE NOVO EM 08/09/2026

> "você está esquecendo algumas coisas, duas por exemplo: a cada atualização
>  importante é necessário informativo % + mini resumo, além de sempre estar
>  abrindo o local para testar aqui em nosso navegador"

As duas já estavam escritas — e eu as deixei cair mesmo assim, o que diz que
escrever não bastou. Ficam com forma explícita:

```text
A CADA ENTREGA    "Progresso: NN%" e um mini resumo do que mudou. Não é no
                  fim do bloco: é a cada coisa que ele precisaria saber para
                  decidir alguma coisa
O LOCAL NO AR     conferido com uma requisição de verdade, e o link
                  apresentado. "Estava rodando antes" não conta — o processo
                  cai, a aba fecha, e quem descobre é ele
```

O motivo de a segunda ser tão insistente está na própria regra: **anunciar um
link morto é pior que não anunciar**, porque manda o dono procurar defeito
onde não há. O inverso também vale — não anunciar nada o deixa sem saber se
existe o que olhar.

### O que a atualização contém, sempre as três linhas

```text
o LINK       http://localhost:8099/app/index.html  (servidor de pé, conferido)
a PASTA      C:\Users\gdult\pa4
o ESTADO     o que está no ar agora: último bloco, suíte, o que mudou de visível
```

O servidor é `node tools/servir.mjs --porta 8099`. **Conferir que ele responde
antes de dizer que está no ar** — anunciar um link morto é pior que não anunciar:
ele manda o dono procurar defeito onde não há.
