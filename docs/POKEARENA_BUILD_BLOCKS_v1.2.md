# PokéArena — Blocos de Construção v1.2

**Documento:** BUILD-BLOCKS-001 · Revisão 1.2 (mercados mútuos, criação e jornada)
**Base:** Master Spec v1.5 · Design Depth v1.1 · Economy Study v1.2 · Unit Economics v1.2
**Escopo:** decomposição de v0.9 → V5 em **64 blocos** cíclicos executáveis
**Status:** plano de execução. Trata de *em que ordem*, *em que pedaços* e *com que prova de qualidade*.
**Alterações da v1.2:** Fases 2 a 5 reestruturadas pelas decisões aceitas do Design Depth §8 e pelo capítulo 11. Ver seção 15.

> **Precedência.** A Master Spec v1.5 é a fonte de verdade sobre *o quê*, em todas as fases — a lacuna L-013, que tirava V2 a V5 dessa regra, foi fechada. Este documento trata de execução; o `POKEARENA_DESIGN_DEPTH_v1.1.md` explica por que o metagame é assim.

---

## 1. Para que serve este documento

A Master Spec descreve seis versões de produto. Ela não diz como transformar isso em trabalho executável sem que alguém precise segurar o projeto inteiro na cabeça a cada sessão.

Este documento quebra o percurso em **blocos cíclicos**. Cada bloco é uma ordem de serviço autocontida, dimensionada para ser executada do começo ao fim numa única sessão de trabalho — por uma pessoa ou por um agente — sem depender de contexto que não esteja escrito nele.

A propriedade que define um bloco:

> **Ao fechar qualquer bloco, o jogo continua jogável e a suíte de regressão continua verde.**

Não existe bloco que deixe o projeto pela metade. Se um bloco não puder ser fechado sem quebrar o anterior, ele está mal cortado e precisa ser dividido.

---

## 2. A forma do ciclo

```text
BLOCO Fx.y — nome
├─ TAMANHO      P · M · G
├─ MÉTODO       GL (Gauntlet Loop) · INV (dirigido por invariante) · GL+INV
├─ PORTÕES      quais dos nove portões da seção 3 se aplicam
├─ DEPENDE DE   blocos que precisam estar fechados
├─ ENTRADA      o que precisa estar verde antes de começar
├─ ESCOPO       o que este bloco constrói
├─ SABOTAGEM    os erros que precisam fazer a suíte falhar
├─ SAÍDA        critério objetivo e verificável de fechamento
└─ ROLLBACK     como desfazer sem quebrar o bloco anterior
```

### O ciclo

```text
      ┌─────────────────────────────────────────────────────┐
      ▼                                                     │
  1. LER          bloco + estado do repositório             │
  2. ESCREVER     os testes, antes do código                │
  3. SABOTAR      quebrar de propósito e confirmar que      │
                  a suíte fica vermelha  ◄── se não ficar,  │
                  o teste é decorativo, volta pro 2         │
  4. CONSTRUIR    o escopo, e nada além dele                │
  5. VERIFICAR    portões do bloco + regressão inteira      │
  6. FECHAR       commit único, critério marcado            │
  7. RELATAR      o que mudou, o que ficou aberto ──────────┘
```

A etapa 3 é a que separa este ciclo de um checklist. Detalhada na seção 4.

### Regra de escopo

Um bloco constrói **só o que está no escopo dele**. Melhoria oportunista vira anotação para bloco futuro, não código neste. É a regra que impede o efeito bola de neve que já custou três versões ao projeto (v0.6.1 → v0.6.3).

---

## 3. Os nove portões de qualidade

Todo bloco declara quais portões se aplicam. **Q1 e Q2 são obrigatórios em todos os 50 blocos, sem exceção.** Os demais entram conforme a natureza do bloco.

| # | Portão | O que prova | Fecha quando |
|---|---|---|---|
| **Q1** | **Comportamento** | o escopo do bloco faz o que diz | todos os casos passam |
| **Q2** | **Sabotagem** | os testes de Q1 não são decorativos | todo defeito plantado deixa a suíte vermelha |
| **Q3** | **Invariantes** | propriedades que valem em toda execução, não só nos casos escritos | nenhuma violação em execução aleatorizada |
| **Q4** | **Regressão estatística** | o agregado não deslocou | distribuições dentro da tolerância declarada |
| **Q5** | **Visual** | a tela está certa nos dois temas e nos breakpoints | nenhuma diferença de captura não justificada |
| **Q6** | **Segurança** | a superfície de ataque do bloco foi modelada e testada | os ataques listados falham |
| **Q7** | **Crítico cego** | a qualidade venceu uma barra real | o crítico escolhe o nosso às cegas |
| **Q8** | **Carga e concorrência** | não quebra sob paralelismo | nenhuma corrida, nenhuma duplicata |
| **Q9** | **Telemetria** | o que deveria ser medido está sendo | todo evento emitido com campos obrigatórios |

### Notas de execução

**Q5 · Visual.** Captura por tela, comparação contra referência versionada, nos dois temas e em pelo menos três larguras. Animação testada por quadro-chave, não por "parece bom". Mudança de captura só entra no commit com a diferença explicada.

**Q6 · Segurança.** Cada bloco com superfície declara seu próprio modelo de ameaça. Um bloco sem superfície nova declara `Q6: sem superfície nova` — explicitamente, para que a ausência seja decisão e não esquecimento.

**Q7 · Crítico cego.** Só onde existe barra nomeada, buscável e comparável. Ver seção 6.

**Q9 · Telemetria.** Os eventos de proteção do jogador (Spec §17) não podem ser amostrados — são registro de conformidade. Q9 falha se algum deles estiver sob amostragem.

---

## 4. Sabotagem — o portão que faz os outros valerem

Uma suíte de testes que nunca ficou vermelha não prova nada. Ela pode estar testando o próprio dublê, afirmando o que já é verdade por construção, ou simplesmente nunca chegando na linha que importa.

**Q2 inverte o ônus da prova:** para cada bloco, uma lista de defeitos plantados de propósito. Cada um precisa deixar a suíte vermelha. Se um defeito passa, o teste correspondente é decorativo e o bloco não fecha.

```text
para cada defeito da lista de SABOTAGEM do bloco:
    aplicar o defeito
    rodar a suíte
    ESPERADO: vermelha, e no teste certo
    se verde  -> o teste não existe ou não cobre; escrever antes de seguir
    reverter o defeito
```

Duas regras que evitam que isso vire teatro:

1. **A sabotagem precisa ser plausível.** Trocar um sinal, inverter uma comparação, remover uma checagem de limite, devolver o valor bruto no lugar do líquido. Apagar uma função inteira não prova nada — qualquer teste pega isso.
2. **Precisa falhar no teste certo.** Uma sabotagem no cálculo de dano que derruba um teste de carregamento de sprite indica acoplamento indevido, não cobertura. O relatório do bloco registra qual teste pegou qual defeito.

Onde houver ferramenta de mutação disponível para a linguagem, usá-la para ampliar a lista. A lista escrita à mão é o piso, não o teto — ela existe porque cobre os defeitos que a ferramenta não sabe inventar, como "o payout usa o bucket errado de proveniência".

---

## 5. O trilho de segurança

O bloco **F0.1 é pré-requisito de todos os outros**. O projeto hoje é um arquivo de 5.227 linhas cujo comportamento correto não está capturado em lugar nenhum. Modularizar sem rede é repetir a v0.6.1 — a mudança parece funcionar e o jogo sai errado.

| Camada | O que prova | O que pega |
|---|---|---|
| **Golden tests** | `simulate(fighters, seed)` produz exatamente os mesmos eventos | qualquer mudança acidental no motor |
| **Regressão estatística** | 10.000 rodadas mantêm distribuição, duração e margem | mudanças que não alteram um caso mas deslocam o agregado |
| **Invariantes** | as 11 invariantes do §4.6 da Spec valem em toda rodada | estados impossíveis que testes de caso não pegam |

A partir de F0.1, **nenhum bloco fecha com o trilho vermelho**. Blocos que mudam comportamento de propósito (F0.6, F0.7, F0.8) atualizam os goldens **no mesmo commit**, com a diferença explicada na mensagem.

---

## 6. As duas metodologias

Nem todo bloco se prova do mesmo jeito, e forçar um método único degrada os dois.

### GL — Gauntlet Loop

Instalada em `.claude/skills/gauntlet-loop`. Técnica de Matt Shumer, empacotada por RoboNuggets, CC BY 4.0 — ver `ATTRIBUTION.md`.

Mecânica: um builder produz, um **crítico separado, de contexto novo**, compara às cegas contra uma **barra nomeada** e aponta a maior lacuna. Repete até o crítico escolher o nosso.

Serve quando existe artefato comparável lado a lado. A barra precisa ser **nomeada** (não uma categoria), **buscável** e **comparável**. Barra vaga é o modo de falha mais comum: o crítico inventa a comparação e aprova tudo.

### INV — dirigido por invariante

Serve quando a correção é binária e definida por propriedade, não por gosto. Não existe "comparar o ledger com a Stripe lado a lado" — existe "a soma do ledger é igual ao saldo, sempre".

Mecânica: as invariantes viram testes de propriedade sobre entrada aleatorizada; a sabotagem prova que os testes pegam; o crítico cego continua existindo, mas revisando **contra a especificação**, não contra um artefato.

### GL+INV

A maioria dos blocos de interface com regra econômica atrás. A correção se prova por invariante; a qualidade do que o jogador vê se prova por gauntlet. Os dois portões precisam fechar.

### Distribuição

| Método | Blocos | Onde |
|---|---:|---|
| INV | 44 | motor, seed, precificação, ledger, settlement, apuração mútua, evolução, PvE, economia competitiva |
| GL+INV | 16 | telas com regra atrás — carteira, aposta, resultado, coleção, ginásios, liga |
| GL | 1 | identidade do ContentPack original |

> A v1.1 projetava 9 blocos puramente GL. A v1.2 reduz para 1, e a razão é boa: quase toda tela deste produto tem regra econômica ou probabilística atrás dela, e provar essa regra é trabalho de invariante. O gauntlet entra **por cima** da correção, no portão Q7, e não no lugar dela. Só a identidade visual do elenco original é qualidade pura sem regra a provar.

---

## 7. Uma ressalva que o próprio projeto impõe

O §27 da Master Spec diz para não construir tudo de uma vez. Este documento mapeia o percurso inteiro, mas **o mapa não é autorização de execução contínua**.

```text
dentro da fase   -> encadeamento livre, limitado só por dependência técnica
entre fases      -> gate com dados de produção (seção 12)
```

---

## 8. Mapa geral

| Fase | Versão | Blocos | Método dominante | O que passa a existir |
|---|---|---:|---|---|
| **0** | v0.9 Foundation | 13 | INV | motor confiável, modular, testável, pronto para servidor |
| **1** | V1 Arena Online | 12 | GL+INV | produto multiplayer, carteira, proteção, telemetria |
| **2** | V2 Mercados Mútuos e Previsão | 8 | INV | **teto de habilidade**: preço formado por jogadores e maestria mensurável |
| **3** | V3 Coleção, Criação e Informação | 13 | INV | criar, evoluir, escolher golpes, e o dossiê que paga na aposta |
| **4** | V4 Time e Jornada | 9 | INV | ginásios com probabilidade exibida — onde se aprende a ler o motor |
| **5** | V5 Liga | 9 | INV | competição assíncrona, temporadas, economia competitiva |
| | | **64** | | |

### O que mudou em relação à v1.1

| Antes | Agora | Por quê |
|---|---|---|
| V2 Collection, 6 blocos | **Fase 2** vira Mercados Mútuos e Previsão, 8 blocos | a Arena não tem teto de habilidade; mercado de preço formado por jogadores é o que cria perícia (Design Depth §2 e §4.1) |
| V3 Trainer Idle, 6 blocos | **absorvido na Fase 3** | modo mais fraco e mais caro; expedições viram fonte de encontro, doce e relatório dentro da Coleção |
| Collection = capturar | **Fase 3** = criar, evoluir, escolher golpes, e dossiê, 13 blocos | captura rende **forma base**; sem cadeia de evolução não há RPG para jogar (Design Depth §11.4) |
| V4 = segundo jogo de batalha | **Fase 4** = onde se aprende a ler o motor, 9 blocos | ginásio exibe a probabilidade do seu time e o efeito de cada troca (§11.8) |
| Liga de Previsão na V5 | **antecipada para a Fase 2** | barata, sem risco regulatório, ataca retenção cedo |

Saldo: cortar o idle economizou 6 blocos; mercados mútuos, criação e ginásios com probabilidade custaram 17. O roadmap **cresce** de 50 para 61, e é honesto dizer isso em vez de esconder na contagem.

---

# FASE 0 — v0.9 Foundation

Objetivo: tornar o protótipo confiável sem mudar o que o jogador vê, exceto onde a Spec exige que mude. Fase serial: cada bloco depende do anterior.

### F0.1 — Arnês de regressão e captura do comportamento atual

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 · **Depende de** —

**Entrada:** o `index.html` da base v0.8, funcionando.

**Escopo:** extrair o motor (`rng`, `statAt`, `buildRoster`, `effect`, `damageOf`, `simulate`, `assignMoves`, tabela de tipos, elenco) para módulo importável sem DOM; golden tests com 20 seeds fixas serializadas; regressão estatística de 10.000 rodadas com faixas de tolerância; verificador das 11 invariantes do §4.6.

**Sabotagem** — cada uma precisa deixar a suíte vermelha:
- inverter uma entrada da tabela de tipos (`fire` vs `water` de 0,5 para 2);
- trocar `CRIT` de 0,0625 para 0,5;
- fazer `simulate` ignorar o último lutador da pool;
- devolver dano fixo em vez de calculado.

**Q6:** sem superfície nova — nada é exposto.

**Saída:** suíte verde contra o motor atual **sem nenhuma correção**. Este bloco fotografa, não conserta. Relatório de baseline commitado.

**Rollback:** trivial, nada de produção foi tocado.

> Registrar no baseline, sem corrigir: Gengar vence 33,96% (4,08× a média), Ditto 1,61%, amplitude de 21×, 14 dos 66 golpes nunca atribuídos, 35,2% dos golpes do elenco são Normais. São insumos de F0.4 e de balanceamento futuro.

---

### F0.2 — Motor como módulo

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 · **Depende de** F0.1

**Escopo:** o motor extraído passa a ser a única implementação. O `index.html` importa em vez de conter. Zero mudança de comportamento.

**Sabotagem:** trocar um operador em `damageOf`; inverter a ordem do sorteio de alvo; deixar o `index.html` com uma cópia divergente do motor (o teste de fonte única precisa pegar).

**Q6:** sem superfície nova.

**Saída:** goldens byte a byte idênticos. Um único evento diferente reprova.

---

### F0.3 — Separação de interface, economia e perfil

**Dividido em quatro.** O bloco previa 3.462 linhas de script num único ciclo e já se declarava "único candidato natural a divisão". Ao medir, apareceu o motivo concreto: **19 variáveis mutáveis são escritas de mais de uma parte do script**, e em módulos ES não se atribui a um binding importado. Nenhuma separação funciona antes de resolver isso.

A divisão é por módulo, como o próprio bloco mandava — nunca por camada horizontal.

---

### F0.3a — Estado compartilhado explícito ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 · **Depende de** F0.2

**Escopo:** `app/modules/estado.mjs` reúne num objeto `S` as 19 mutáveis que cruzam fronteira. Todas as referências passam a `S.<campo>`. O app continua num arquivo só; muda a fronteira, não o formato.

**Sabotagem:** campo volta a ser variável de topo; `estado.mjs` deixa de ser inerte; campo some da superfície; superfície cresce sem justificativa.

**Q6:** sem superfície nova.

**Saída:** suíte verde, app roda, e a lista de estado compartilhado cabe numa tela. **A lista é o entregável** — se crescer sem justificativa, a fronteira está no lugar errado.

> A transformação foi feita com parser com escopo, não com regex: `computeOdds(fighters, …)` tem parâmetro com o mesmo nome de uma global, e regex renomearia o parâmetro junto. 333 referências reescritas.

---

### F0.3b — Módulos de apresentação ✅

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q4 Q5 · **Depende de** F0.3a

**Escopo:** `sprites`, `render`, `efeitos-golpe`, `clima-visual`. É a fatia mais isolável: quase não escreve estado, só lê e desenha.

**Sabotagem:** quebrar um import; inverter direção de dependência (motor importando apresentação); remover um módulo do grafo.

**Saída:** nenhum módulo acima de ~600 linhas; o app roda.

> **Lição registrada.** A extração produziu três erros de import em sequência — `rng`, `spriteURL` e o par `$`/`log` — e nenhum foi pego pela suíte: todos só apareceram ao carregar a página. O bloco fechou com um teste que varre **símbolos conhecidos** (o que algum módulo exporta) usados sem import. Ele não é verificador de escopo completo, e não precisa ser: é exatamente a classe de erro que separar módulos produz.

---

### F0.3c — Serviços de base e módulos de rodada ✅

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q4 Q5 · **Depende de** F0.3b

**Escopo executado:** `audio`, `killfeed`, `odds`, `rodada`, `coreografia`, `eventos`.

> **O escopo mudou durante o bloco, e o motivo é a direção da dependência.** O plano original começava por `fases` e `loop`. A extração provou que `fases` chama perfil, carteira, killfeed e áudio — que só sairiam em F0.3d. Extrair de cima para baixo não fecha; as folhas vêm primeiro. `fases` e `loop` passaram para o F0.3d, junto com quem eles chamam.

**Também resolveu:** L-005. A causa registrada estava incompleta — não é o controle de velocidade, é a **fonte de tempo**: a entrada usava `setTimeout` (tempo de parede) enquanto a fase avança por `S.clock`, que soma delta de `requestAnimationFrame` limitado a 0,05 s por quadro. As duas andam juntas a 60 fps e separam quando o navegador estrangula a aba. Agora a entrada é uma fila consumida pelo mesmo relógio da fase.

**Saída:** o grafo de dependências aponta numa direção só, com camadas declaradas e testadas.

> **Três defeitos da mesma família apareceram aqui:** módulos atribuindo a símbolos importados (`moveAcc`, `soundEnabled`, `fadeTimer`). Em módulo ES isso é `TypeError` em execução e nenhum teste estático anterior via. A correção não foi inchar o `S` — foi dar API ao dono: `reiniciarMovimento()`, `alternarSom()`, `aplicarVolume()`. Virou teste permanente.

---

### F0.3d — Treinador, economia e linha de base visual ✅

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 · **Depende de** F0.3c

**Escopo:** `perfil`, `desafios`, `medalhas`, `customizacao`, `carteira`, `navegacao`, `controles`, **`fases`**, **`loop`**, `boot`. Fecha a separação.

> `fases` e `loop` vieram do F0.3c porque dependem de perfil, carteira e desafios — a direção da dependência mandou extraí-los junto com quem eles chamam, não antes.

**Também resolve:** L-015 (trocar os quatro `onclick` embutidos por `addEventListener` e remover `window.closeModal`), L-016 (teste com pool sintética de tipos mutuamente imunes, que force a batalha a alcançar `MAX_TIME`), L-019 (fechada por redundância assim que o portão Q5 subiu no F0.3c) e o defeito **D-002**.

**Q5 entregue, com uma correção de escopo:** o bloco pedia capturas "nos dois temas". **O app tem um tema só**, por desenho — não há `prefers-color-scheme` nem alternador. Fingir dois temas seria teatro; a linha de base cobre **4 telas × 3 larguras**, que são os três pontos de quebra reais do CSS.

A linha de base não guarda PNG. Guarda **impressão digital**: a captura volta para dentro da página, vira 32×32 em tons de cinza e é comparada numericamente, com tolerância de média e de pico. Dois motivos — a captura conteria sprites de terceiros, que este repositório não versiona, e comparar PNG exigiria uma dependência de decodificação. Durante a captura os sprites são bloqueados, então a linha de base mede a **nossa** interface e não oscila com a rede.

**Q7 (GL):** barra a definir para a tela de resultado.

**Saída:** nenhum módulo acima de ~600 linhas; dependências numa direção só; linha de base visual versionada.

> **A regra de camadas ganhou uma exceção declarada.** Os módulos de aplicação — `fases`, `carteira`, `navegacao`, `controles`, `customizacao`, `desafios`, `perfil` — importam-se entre si de propósito: fases chama carteira, carteira abre modal de navegação, navegação lê perfil. Isso é acoplamento real do produto. O que o teste proíbe é **infraestrutura depender de aplicação**, que é a inversão que importa.

---

### F0.4 — Content Layer ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F0.3

**Escopo:** todo dado de Pokémon — dex, nomes, tipos, stats, golpes, sprites, trilha — sai do código e vira `ContentPack`. O motor recebe o pack como parâmetro.

**Sabotagem:** remover um tipo de uma espécie; entregar espécie com moveset vazio (precisa falhar alto, não gerar lutador mudo); deixar um identificador da franquia hard-coded fora do pack (o teste de vazamento precisa pegar).

**Q3:** todo pack válido gera rodada válida; todo pack inválido é rejeitado no carregamento, nunca no meio da batalha.

**Q6:** validação de pack é superfície — pack malformado não pode causar execução arbitrária nem travar o servidor futuro. Testar pack com campos extras, tipos errados e valores fora de faixa.

**Também resolve:** L-014 (`spriteURL` sai do motor e vira função do pack).

**Saída:** o motor roda contra pack sintético de 12 criaturas inventadas; goldens do pack Kanto inalterados.

**Entregue.** `engine/engine.mjs` virou a fábrica `criarMotor(pack)`; `engine/pack.mjs` valida; `content/pokemon_kanto_v1.mjs` guarda os 146 registros, os 66 golpes, a tabela de tipos, os 5 climas, a moeda e as três funções de nome e arte. A ligação com o app acontece uma vez, em `app/modules/motor.mjs` — o teste de fonte única passou a exigir que seja **uma só**, porque duas ligações seriam dois packs vivos no mesmo processo.

**Goldens byte a byte inalterados: 20/20.** A suíte foi de 62 para 75 testes (83 com o portão de navegador).

> **O gerador do instantâneo saiu de `engine/` para `tools/`.** O teste de vazamento varre `engine/` inteiro, e um script que lista `KANTO_DEX` por nome não é motor, é ferramenta. Sem essa mudança o teste precisaria de uma exceção, e exceção em teste de vazamento é o começo do vazamento.

> **A sabotagem achou um buraco na primeira rodada, e é o buraco que o próprio bloco previu.** S22 remove do validador a checagem "toda espécie alcança um pool do próprio tipo" e **passou despercebido**: os dois packs em uso têm pool para todo mundo, então a checagem removida não mudava nada. Medido com a checagem fora: a espécie de tipo puro sem pool sai com quatro golpes Normais — **o lutador mudo**, exatamente o que o bloco mandava fazer falhar alto. O que faltava não era a checagem, era um pack de teste nessa forma. Com o estrago novo em `test/conteudo.mjs`, S22 fica vermelho.

**O que o Q6 cobre:** 12 ataques de pack malformado — stat negativo, `NaN`, `Infinity`, número como string, poder `1e9`, precisão 40, efetividade `1e6` e negativa, multiplicador de clima 500, array onde vai objeto e objeto onde vai array. Mais três casos de forma: campo extra com getter que estoura ao ser lido (não pode derrubar o carregamento), `__proto__` e `constructor.prototype` hostis (não podem poluir `Object.prototype`), e um pack de 5.000 espécies validado em tempo linear — custo quadrático na validação é negação de serviço no servidor da V2.

**Lacunas abertas:** L-020 (a ligação exporta 13 apelidos herdados, incluindo `KANTO_DEX`; dono F0.5) e L-021 (o motor exige um pool chamado `normal`; dono F1.3).

---

### F0.5 — Seed raiz e derivações ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q5 Q6 · **Depende de** F0.4

**Escopo:** a árvore do §P3 — `roundSeed` derivando `lineupSeed`, `environmentSeed`, `battleSeed`, `visualSeed`, `rewardSeed`. Eliminar todo `Math.random()` do caminho da rodada, incluindo o embaralhamento de `pickLineup` e as seeds do Monte Carlo.

**Sabotagem:** reintroduzir um único `Math.random()` no caminho da rodada — o teste de determinismo precisa pegar; usar a mesma sub-seed para duas derivações; derivar `battleSeed` antes de `lineupSeed`.

**Q3:** mesma `roundSeed` reproduz elenco, clima, layout, batalha e ordem de entrada, byte a byte, em dois ambientes JS distintos.

**Q6:** seed previsível é superfície. Testar que `roundSeed` não é derivável de tempo, de contador nem de rodada anterior.

**Também resolve:** L-020 (os treze apelidos herdados da ligação).

**Saída:** uma rodada inteira reconstituível a partir de um único número.

**Entregue.** `engine/seed.mjs` guarda a árvore: `novaRaiz()` tira a raiz do CSPRNG da plataforma, `derivar(raiz, rótulo)` desce até os cinco ramos do §P3 — elenco, ambiente, batalha, visual, recompensa — e `derivarIndice` dá sub-seed às 20.000 simulações do Monte Carlo. `sortearPool` passou a receber a sub-seed de elenco. Zero `Math.random()` no caminho da rodada.

**Suíte: 75 → 106 testes** (100 sem o navegador), verdes. **Goldens 20/20 inalterados** — o F0.5 muda de onde as sementes vêm, não o que o motor faz com elas.

> **A derivação é por RÓTULO, não por posição, e isso é decisão de projeto.** `derivar(raiz, 'batalha')` não muda se um ramo novo entrar na lista; `derivar(raiz, 3)` mudaria. Com derivação posicional, acrescentar `recompensa` antes de `visual` reescreveria todas as rodadas já publicadas e a auditoria do §25.2 deixaria de fechar. Dois testes protegem isso, e o defeito S27 planta exatamente a troca.

> **A sabotagem do bloco pedia "derivar `battleSeed` antes de `lineupSeed`".** Esse defeito **não é plantável nesta arquitetura**, e vale registrar por quê em vez de deixar a ausência passar por esquecimento: ele pressupõe um PRNG sequencial, em que a ordem de consumo decide o valor. Com derivação por rótulo os cinco ramos são independentes e a ordem não existe. O que substitui a sabotagem é o teste "a ordem dos ramos não muda nenhum ramo", mais o S27 — que planta justamente a volta para derivação posicional.

> **O Monte Carlo saiu de `app/modules/odds.mjs` para `engine/preco.mjs`.** A matemática do preço morava num módulo que importa o DOM, então nenhuma suíte conseguia rodá-la, e a sabotagem que troca a sub-seed derivada por sorteio solto passava despercebida. Preço que ninguém consegue testar é preço que ninguém consegue auditar. A fórmula **não mudou** — precisão de odd é F0.7, clima no modelo é F0.6.

> **`S.moveRng` saiu do estado compartilhado e virou `app/modules/sorte.mjs`,** com dois fluxos: `coreo()` para movimento e ordem de entrada, `enfeite()` para partículas, confete, tremor e frases. Separados de propósito — com um fluxo só, acrescentar uma partícula de neve deslocaria todos os sorteios da coreografia. A superfície de `S` **continua com 20 campos**: `seeds` entrou, `moveRng` saiu.

**Q3 entre dois ambientes JS.** O portão de navegador ganhou uma suíte nova: o Chromium importa `test/rodada-digital.mjs` — o **mesmo arquivo** que o Node usa — e as duas impressões digitais precisam bater byte a byte para cinco raízes fixas. Importar a mesma fonte é o que separa "dois ambientes" de "duas implementações parecidas".

> **A sabotagem achou o segundo buraco do bloco, e ele é de LIGAÇÃO, não de matemática.** S30 troca `S.seeds.batalha` por `S.seeds.elenco` numa linha de `fases.mjs` — a batalha passa a rodar com a sub-seed do sorteio. Passou despercebido: `semente.mjs` prova que a árvore é sólida, mas nada provava que **o app está ligado nela**, e o portão de navegador só olhava para erro de página e pixels. A resposta foi a suíte `rodada-viva`: o Chromium entrega o estado real da rodada (`S.seeds`, elenco, clima, vencedor, número de eventos) e o Node recompõe a mesma rodada a partir da raiz. Divergiu, reprova. Com ela, S30 fica vermelho.

**Q6 — semente previsível é superfície.** Seis testes sobre `novaRaiz()`: não é contador (3.000 raízes, diferenças todas distintas, ~50% crescentes), não sai do relógio (raízes tiradas dentro de um mesmo milissegundo, nenhuma repetida, menos de 5% a distância inferior a 2^16), os 32 bits valem 1 em 44–56% dos sorteios, nenhuma repetição em 20.000, e — o que importa para o §25.2 — a raiz seguinte nunca coincide com nenhuma das doze previsões derivadas da rodada anterior, cujas sementes são públicas depois do reveal.

---

### F0.6 — Clima dentro do modelo probabilístico ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 Q5 · **Depende de** F0.5

**Escopo:** §4.3 da Spec — cada simulação do Monte Carlo deriva o próprio `environmentSeed` e sorteia clima com a mesma distribuição da luta real.

**Sabotagem:** voltar a calcular odds sobre stats crus — o teste de margem por grupo de tipo precisa ficar vermelho; usar distribuição de clima diferente entre simulação e batalha; revelar o clima antes do fechamento das apostas.

**Q4:** margem realizada por grupo de tipo converge para a configurada. Baseline do defeito corrigido: hoje 15,79% para tipos não-buffáveis e −2,90% para buffáveis, contra 8% declarados.

**Q6:** sem superfície nova.

**Também corrige:** o defeito **D-003** (o corte duro de tempo é suave).

**Saída:** diferença entre grupos dentro do ruído, medida em 300 rodadas × 8.000 simulações. **Muda comportamento de propósito — atualizar goldens no mesmo commit.**

**Entregue.** Cada simulação do Monte Carlo deriva o próprio `environmentSeed` e sorteia clima com a mesma distribuição da luta real. O clima da batalha continua secreto até as apostas fecharem — o que mudou é que **o preço passa a saber que ele existe**.

**Medido, 300 rodadas × 8.000 simulações:**

| grupo (observável na hora de apostar) | antes | depois |
|---|---|---|
| tipo buffável (Fogo, Água, Voador, Gelo) | −0,61 % | **7,36 % ± 1,55** |
| resto | +14,96 % | **7,80 % ± 0,65** |
| **diferença** | **−15,58 pontos** | **−0,44 pontos** |
| margem geral | 8,22 % | 7,61 % |

> **O clima não era surpresa: era desconto.** Com o preço saindo de stats crus, a casa *pagava* para aceitar aposta em lutador de tipo buffável, e quem soubesse disso apostava só em Fogo, Água, Voador e Gelo. A diferença de 15,58 pontos era a mensalidade dessa estratégia.

> **O agrupamento é pelo OBSERVÁVEL, e essa é a parte que decide o teste.** Agrupar pelo clima que de fato saiu mede uma vantagem que ninguém consegue usar — o clima só é revelado depois do fechamento. Condicionada ao clima realizado, a margem continua em −45 % para quem foi buffado contra +13 % no resto. Isso **não é defeito enquanto o clima for imprevisível**, e a pergunta de se ele é virou a lacuna **L-022** e o bloco **F0.11**, proposto neste commit.

> **A previsão do bloco sobre goldens estava errada, e a medição corrigiu.** O bloco dizia "muda comportamento de propósito — atualizar goldens no mesmo commit". **Nenhum golden mudou.** As fixtures fotografam a BATALHA, e a batalha não mudou: o que mudou foi o PREÇO, que nenhuma fixture cobria. A fixture nova é `test/fixtures/margem.json`, com a medição de 300 × 8.000.

**A margem geral fica em 7,61 %, não 8 %.** É o viés de Jensen sobre o estimador `1/p̂`, que é convexo — medido em +19,22 % no pior lutador com 20.000 simulações, no baseline do F0.1. Corrigi-lo é escopo do **F0.7**, e o teste de margem geral carrega essa folga escrita, com o motivo.

**D-003 fechado, e a Spec venceu.** Das duas saídas registradas — truncar, ou reescrever a invariante para "nenhuma ação NOVA é agendada depois do corte" — vale a primeira: um teto que não segura não é teto. Reescrever a invariante trocaria uma garantia por uma descrição do que o código fazia, e invariante que se adapta ao código não é invariante. O teste que **afirmava o defeito de propósito** ficou vermelho na correção, como fora escrito para fazer.

**Q5 ganhou um teste:** o portão de navegador passou a ler, **ainda na fase de apostas**, se o selo de clima está visível. O clima é sorteado antes da pool, para garantir 1 lutador do tipo favorecido; se vazasse na tela, o §4.3 viraria letra morta. O defeito S35 planta o vazamento.

---

### F0.7 — Estimador de odds ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 Q5 · **Depende de** F0.6

**Escopo:** §4.4 — restaurar suavização de Laplace, elevar `SIMS_MIN` para 150.000, calcular e registrar erro relativo por lutador, gravar o registro de precificação completo.

**Sabotagem:** remover Laplace (o teste de probabilidade-zero precisa pegar antes de virar odd infinita); baixar `SIMS` para 20.000 (o teste de erro na cauda precisa ficar vermelho); arredondar a odd para cima em vez de aplicar a margem.

**Q4:** oito cálculos independentes sobre a mesma pool ficam dentro da tolerância. Baseline do defeito: dispersão atual de ~22% no azarão.

**Q6:** sem superfície nova.

**Saída:** erro relativo do pior lutador abaixo de 2%; ~~dispersão abaixo de 3%~~ **viés de convexidade do pior lutador abaixo de um terço da margem**. Medir o tempo por rodada — se passar de 8 s, paralelizar antes de fechar, porque a janela é de 30 s.

> **O critério de "dispersão abaixo de 3%" foi retirado porque é aritmeticamente incompatível com os outros dois, e a medição é que mostrou isso.** Dispersão de oito cálculos e erro relativo não são a mesma escala: a amplitude de 8 amostras vale ~2,85 σ, e tomar o pior entre 12 lutadores infla mais — medido, a razão dispersão/erro fica estável em **4,2 a 4,8** entre 20.000 e 154.000 sims. Para dispersão de 3% seria preciso ε ≈ 0,7%, ou seja **~1.040.000 simulações e ~31 s por rodada** — acima do teto de 8 s do próprio bloco e da janela de aposta de 30 s. Os três critérios não podiam valer juntos.
>
> Quem venceu foi a Spec, como manda o `CLAUDE.md`: o §4.4.2 **deriva** ε < 2% a partir de `n = (1-p)/(p·ε²)`, e os 3% não têm derivação em documento nenhum. No lugar entra o número que de fato descreve o dano — o **viés de convexidade**, que é o que come margem e não se cancela entre rodadas.
>
> Medido, oito cálculos sobre a mesma pool: **16,22% de dispersão a 20.000 sims, 7,84% a 154.000**. A dispersão continua publicada em `fixtures/precisao.json`; ela deixou de ser portão, não de ser medida.

**Entregue.** `precificar` deixou de devolver uma lista de odds e passou a devolver o **registro de precificação da rodada** (§4.4.5): simulações, probabilidades brutas, odds justas, odds ofertadas, overround, margem configurada **e efetiva**, erro relativo e viés por lutador, tetos aplicados, versão do motor e versão do pack. O rodapé do painel mostra margem efetiva e erro máximo — o §4.4.1 proíbe overround diferente do configurado sem exibi-lo.

| | antes (20.000 sims) | depois (154.000 sims) |
|---|---:|---:|
| erro relativo do pior perfil | 5,54 % | **1,85 %** |
| viés de convexidade do pior perfil | 19,12 % | **2,49 %** |
| dispersão de 8 cálculos | 16,22 % | 7,44 % |
| tempo por rodada | 0,60 s | **4,57 s** |

**A SEGUNDA CONTRADIÇÃO, e a Spec perdeu para ela mesma.** O §4.4.2 deriva **153.750** simulações para ε = 2 %, e o §4.4.4 trazia **150.000** como baseline. Medido: com 150.000 o erro do pior perfil é **2,02 %** — o arredondamento para baixo custava exatamente o alvo, por 0,02 ponto. `SIMS` foi para **154.000** e a **Spec §4.4.4 foi corrigida no mesmo commit**. A diferença de custo é 0,1 s por rodada; não havia troca a fazer, havia uma conta a respeitar.

> **O viés é o número que importa, e ele entrou no registro.** O erro relativo escala com `1/√n`; o viés de convexidade, com `1/(n·p²)`. Na cauda é o segundo que come margem, e ele **não se cancela entre rodadas** — é sempre a favor do apostador. A 20.000 sims valia 19,12 %, contra 8 % de margem configurada: a casa entregava mais que o dobro da própria margem no azarão. Publicá-lo ao lado do erro é o que permite dizer quanto da margem realizada de 7,61 % medida no F0.6 é estimador e quanto é outra coisa.

> **O portão Q5 tinha uma espera fixa de 4 s, e ela quebrou.** Com a rodada custando 5 s, a captura da linha de base passou a cair no meio do "calculando odds…": 6 telas fora numa execução, 9 na seguinte, sem nada ter mudado na interface. Linha de base que depende de quanto a máquina demora não é linha de base. A captura passou a esperar **estado** — fase de apostas aberta com a lista de odds montada —, e a linha de base gravada **não precisou ser regravada**: com a espera certa, ela bate.

**Custo medido: 4,57 s por rodada**, contra o teto de 8 s que o bloco impôs e a janela de aposta de 30 s. Não foi preciso paralelizar.

**Lacuna aberta:** L-023 (corrigir o viés de convexidade em vez de só medi-lo; dono **F1.5**, quando o preço passa a ser calculado pelo servidor). Não abre bloco novo na Fase 0: o §4.4.4 aceita `SIMS_MIN` como a resposta da v0.9, e a correção do estimador é melhoria, não pendência de saída.

---

### F0.8 — Tetos de exposição ✅

**Tam.** P · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 · **Depende de** F0.7

**Escopo:** §4.4.6 — `MAX_PAYOUT_POR_TICKET`, `MAX_LIABILITY_POR_RODADA`, stake máximo derivado por lutador, corte antes da confirmação, fechamento de mercado ao saturar, exibição de tudo na interface.

**Sabotagem:** aceitar ticket 1 PC acima do teto; aplicar corte a ticket já confirmado; permitir que a soma de tickets ultrapasse o passivo máximo por corrida entre duas confirmações.

**Q5:** a mensagem de corte precisa dizer qual limite, quanto cabe e por quê — capturada e comparada. Rejeição silenciosa reprova o bloco.

**Q6:** manipular o stake no cliente; burlar o teto dividindo em vários tickets; corrida entre duas apostas no mesmo lutador no último instante.

**Q7 (GL):** barra = painel de odds ao vivo de uma casa de apostas nomeada, na parte de comunicar limite e retorno. Só a comunicação; a regra é INV.

**Saída:** as duas invariantes de exposição do §4.6 verdes.

**Entregue.** `engine/exposicao.mjs`, puro e sem DOM — em V1 a mesma função roda no servidor. `MAX_PAYOUT_POR_TICKET = 50.000`, `MAX_LIABILITY_POR_RODADA = 500.000` (10×), `stake_max_i = ⌊payout_max / odd_i⌋`. O registro de precificação passou a publicar `stakeMax` por lutador e os dois tetos aplicados, fechando os campos que o F0.7 tinha deixado em `null`.

**As duas invariantes do §4.6 saíram da lista de "não verificáveis":** `nenhum ticket confirmado excede MAX_PAYOUT_POR_TICKET` e `nenhuma rodada excede MAX_LIABILITY_POR_RODADA`, as duas por lote aleatorizado de milhares de tickets. A suíte agora imprime as verificadas ao lado das pendentes — ausência que não é nomeada vira pergunta.

**O passivo da rodada é o PIOR CASO, não a soma.** Só um lutador vence, então a casa nunca paga as duas pontas; somar superestimaria o risco e fecharia mercado sem necessidade. O defeito S46 planta a troca.

> **O teste da corrida derrubou o desenho da API, e essa foi a parte útil do bloco.** A primeira versão recebia `conf` como parâmetro **opcional** de `registrarTicket`. O teste do §4.4.6 — duas confirmações no mesmo lutador, no último instante — estourou o teto em **549.952 contra 500.000**, porque a chamada sem `conf` simplesmente não conferia nada. **Guarda que se pode esquecer não é guarda.** O teto passou a vir carimbado no próprio objeto de passivo, e não há mais como registrar sem saber contra qual teto.

**Q5 — a mensagem, não a regra.** O portão de navegador enche a carteira, escolhe "max", clica no azarão e lê a tela: a aposta precisa ter sido **cortada antes de confirmar**, o aviso precisa dizer **quanto cabe** e **por quê**, e a linha de cada lutador precisa mostrar o stake máximo **antes** da aposta — ou "mercado fechado", quando o passivo satura. Rejeição silenciosa reprova o bloco, e agora há um teste que a reprova de fato (S44, S47).

**Q6 — as três formas de furar o teto**, todas testadas: manipular o stake no cliente (negativo, zero, `NaN`, `Infinity`, string, `null`); dividir em vários tickets (500 tickets no stake máximo continuam dentro do passivo); e a corrida entre duas confirmações.

> **A sabotagem achou o defeito clássico de limite, e a lição é sobre o formato do teste.** S42 afrouxa o teto em **uma unidade** — `valor <= limite` vira `valor <= limite + 1` — e **passou despercebido**. O lote aleatório de 4.000 tickets cobria uma faixa larga de valores e quase nunca caía exatamente em `stakeMax + 1`. **Erro de limite não se pega por amostragem.** Entraram duas sondas de borda, uma por teto: para cada lutador, pedir exatamente o limite (não pode ser cortado) e exatamente um a mais (tem que ser). Com elas, S42 fica vermelho.

---

### F0.9 — Carteira com API e proveniência ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q8 · **Depende de** F0.8

**Escopo:** a carteira ganha API própria e ledger append-only local, com os buckets do §5.5 e `stake_breakdown` no ticket. Ainda local, ainda sem servidor.

**Lacuna aberta:** L-024 (o bucket `pendente` existe e nada o preenche; dono F1.4, quando a compra deixa de ser simulada).

**Sabotagem:** escrever saldo direto, sem passar pelo ledger (a reconciliação precisa pegar); fazer payout de aposta em PC-B cair no bucket PC-T; permitir saldo negativo; apagar uma entrada do ledger.

**Q8:** duas apostas simultâneas no mesmo saldo não podem gastar o mesmo PC duas vezes.

**Q6:** adulterar o `localStorage` para inflar saldo — precisa ser detectado pela reconciliação, não silenciosamente aceito. Documentar que a defesa real só chega em F1.4.

**Saída:** nenhum ponto do código escreve saldo sem passar pela API; recalcular pelo ledger dá o mesmo número.

> Fazer local agora é o que torna F1.4 uma troca de implementação em vez de uma reescrita.

**Entregue.** `engine/carteira.mjs` — puro, sem DOM e sem `localStorage` — com os quatro buckets do §5.5, ledger append-only e `stake_breakdown` na reserva. `app/modules/banco.mjs` é a fachada do app: persiste, reconcilia no boot e traduz "o jogador ganhou" em lançamentos. **`S.bal` deixou de existir.**

**O teste que vale mais que o código.** *"Apostar bônus devolve BÔNUS, nunca transferível"* — é a brecha que o §5.5 fecha em uma frase: sem proveniência, as odds da Arena viram conversor automático de bônus gratuito em saldo sacável, e o orçamento de PC-B do Estudo de Economia vaza inteiro para a ponta que custa dinheiro de verdade. O ledger grava `BET_PAYOUT_BONUS` e `BET_PAYOUT_TRANSFERABLE` **separados**: um registro que diz só "BET_PAYOUT" não prova nada meses depois.

**A ordem de consumo é decisão deste bloco, e o §5.5 não a define.** Escolhida: **bônus → competitivo → transferível**. Sem uma ordem, `stake_breakdown` é indeterminado; com esta, gasta-se primeiro o que o jogador não pôs dinheiro para ter, e o saldo dele próprio dura mais. `pendente` fica fora — PC-T sob hold não entra em mercado transferível (§5.5) — e isso virou a lacuna **L-024**.

**O critério de saída virou teste, não promessa.** *"Nenhum ponto do código escreve saldo sem passar pela API"* é uma afirmação sobre o repositório, então quem a verifica varre o repositório: nenhum módulo além de `banco.mjs` pode escrever em `S.carteira`, citar `S.bal` ou persistir saldo direto. Sem isso, o próximo bloco reintroduz um `S.bal += x` e a suíte continua verde.

**Q6 — adulteração detectada, e o limite dito em voz alta.** Inflar o saldo no `localStorage` é apanhado pela reconciliação do boot, que recalcula tudo pelo ledger e reconstrói. Um atacante local determinado reescreve o ledger junto, e nenhuma reconciliação resolve isso: **a defesa de verdade é o ledger viver no servidor, em F1.4**. O que se entrega aqui é que a adulteração ingênua não passe calada.

**Q8 — concorrência.** Duas reservas de 700 sobre 1.000 de saldo: a segunda é recusada. Mil reservas seguidas, e o total (disponível + reservado) nunca sai de 10.000. A defesa é a reserva ser atômica — decidir e debitar no mesmo lançamento.

> **A sabotagem achou a mesma classe de furo do F0.5, e duas vezes já não é azar.** S53 remove a reconciliação do **boot** e passou por toda a suíte: `reconciliar` continuava correta, e `test/carteira.mjs` continuava provando que ela funciona. **Testar a peça não testa o encaixe** — exatamente o que o S30 mostrou quando a árvore de sementes estava certa e o app não estava ligado nela. Entrou `test/banco.mjs`, que exercita o caminho real com um `localStorage` mínimo: inflar o número guardado e apagar entrada do ledger têm que ser reconstruídos no boot, com diagnóstico.

> **E o relatório da sabotagem estava mentindo.** S35 apareceu como "✓ PEGOU / NADA" — capturado apenas pelo golden. Em caixa limpa ele passa nos **dois** modos: a execução vermelha foi transitória, e o relatório atribuiu a falha ao defeito plantado. Contar uma falha instável como captura é pior que reportar um escape, porque esconde o buraco em vez de mostrá-lo. O caso "vermelho com golden, verde sem" agora é **reconfirmado** com uma segunda execução do par; se as duas discordarem, o defeito é marcado `INSTÁVEL` e **não conta como pego** — dúvida sobre cobertura tem que aparecer como dúvida.

---

### F0.10 — Commit-reveal, telemetria e fechamento da v0.9 ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F0.9

**Escopo:** interfaces de commit-reveal do §4.5 (o protocolo, não a criptografia definitiva); os 14 eventos do §4.7; verificação do §4.8 item a item.

**Também resolve:** L-025 (o portão fecha bloco com uma execução só, e o D-004 entrou no repositório por isso).

**Sabotagem:** publicar um `commit` que não confere com a `roundSeed` revelada; revelar a seed antes do fechamento; omitir um campo obrigatório de um evento.

**Q6:** o `commit` não pode vazar a seed; a seed de uma rodada não pode permitir prever a próxima. Registrar explicitamente que o esquema definitivo exige revisão criptográfica — a v0.9 entrega interface, não segurança caseira.

**Q9:** todo evento com campos obrigatórios, verificado por teste.

**Saída:** os dez critérios do §4.8 marcados com evidência, **e o F0.11 e o F0.12 fechados** — a v0.9 não é tagueada com um canal de informação aberto nem dependendo de CDN de terceiros para abrir. **Fim da Fase 0.**

**Entregue.** `engine/commit.mjs` (protocolo do §4.5), `app/modules/telemetria.mjs` (os 14 eventos do §4.7, todos emitidos) e `test/saida-v09.mjs`, que confere o §4.8 **item a item, com evidência apontada** — e imprime o quadro a cada execução da suíte.

> **O SAL NÃO É ENFEITE, e é a coisa mais importante do bloco.** A raiz tem 32 bits: `SHA256(raiz)` sozinho é invertível por força bruta em segundos — 4,3 bilhões de tentativas é trabalho de laptop. Publicar commit sem sal seria **publicar o resultado** antes da aposta. O sal de 128 bits é o que torna a busca impraticável, e o teste faz a busca de verdade num espaço reduzido para provar que a proteção vem dele. O defeito S60 tira o sal e fica vermelho.

**Q9 — os 14 eventos, e o que os faz valer.** A lista é lida da fonte, não redigitada no teste; cada evento declarado precisa ser **emitido** em algum lugar do app; e — a parte que escapou primeiro — **o evento que sai precisa trazer os campos comuns preenchidos**.

> **Terceira vez que o mesmo padrão aparece, e agora está nomeado.** S30 (F0.5): a árvore de sementes estava certa e o app não estava ligado nela. S53 (F0.9): `reconciliar` funcionava e ninguém a chamava no boot. S65 (aqui): a lista de campos estava declarada e `emitir` não a cumpria. **Testar a peça não testa o encaixe — e testar a declaração não testa a peça.**

**L-025 fechada, nas duas metades.** A varredura de dinheiro passou a alcançar `test/`, com o texto mascarado antes (o próprio enunciado dos testes cita `S.bal` para explicar a regra). E `npm run portoes` passou a rodar a suíte **duas vezes**, reprovando se as execuções discordarem: **instável reprova diferente de vermelho** — vermelho constante é defeito com endereço, instável é defeito que escolhe quando aparecer, e foi assim que o D-004 chegou a um commit.

**Fim da Fase 0.** 212 testes verdes em duas execuções seguidas, 66/66 na sabotagem. Nove dos dez critérios do §4.8 cumpridos com evidência.

> **Um dos dez critérios do §4.8 não é código.** O último item é *"a consulta de enquadramento regulatório da §0.5.1 tiver sido feita e a resposta estiver registrada neste documento"* — trilha `jurídico`, lacuna **L-012**, sem dono nomeado até hoje. Nenhum bloco fecha isso escrevendo software, e ele não está em cima de ninguém dentro do time de código. **A v0.9 não pode ser tagueada sem ele**, e é o item de maior prazo de todos os que faltam.

---

### F0.11 — Vazamento de informação pela pool ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q4 Q6 · **Depende de** F0.7

> **Proposto no F0.6**, ao medir a margem por grupo de tipo. Não existia bloco dono: nenhum dos dez anteriores trata de informação observável, e "depois" não é dono.

**O achado que o originou.** Depois do F0.6 a margem por grupo OBSERVÁVEL fecha em 8 %. Mas condicionada ao clima que de fato saiu, ela continua em **−45 % para quem foi buffado** contra **+13 % no resto** — 58 pontos de diferença. Isso é inofensivo enquanto o clima for imprevisível, e o problema é que ele não é totalmente: **a pool garante 1 lutador do tipo favorecido**. Ver um único lutador de Gelo numa pool de 12 é evidência de Nevasca, e evidência é preço.

Medido em 400 rodadas, estratificando a margem pelo número de lutadores daquele tipo na pool: nenhuma célula ficou negativa com confiança — `fire:1` deu −2,02 % ± 6,69, `ice:1` deu +1,23 % ± 4,64. **O canal existe por construção; a exploração não foi demonstrada.** É por isso que isto é lacuna e não defeito.

**Escopo:** medir a exploração de verdade, com um apostador bayesiano que usa só o observável — a contagem de cada tipo buffável na pool — e escolhe a melhor aposta. Se o EV for positivo, fechar o canal. Três saídas possíveis, e a escolha sai da medição: (a) tirar a garantia de tipo da pool, (b) sortear a pool sem conhecer o clima e sortear o clima só entre os que a pool suporta, (c) condicionar o preço à mesma informação que o apostador tem — a alternativa que o §4.3 já prevê.

**Sabotagem:** devolver a garantia de tipo depois de removida; usar distribuição de clima diferente entre o preço e a luta; deixar o apostador bayesiano com informação que ele não teria (o clima real).

**Q4:** o EV do melhor apostador que usa só informação observável fica **negativo**, dentro do intervalo, em 300 rodadas.

**Q6:** informação é superfície. Testar que nenhum campo enviado ao cliente antes do fechamento das apostas permite reconstruir o clima.

**Saída:** o EV do apostador informado medido e negativo, com o número publicado — e, se alguma opção de fechamento for adotada, os goldens regravados no mesmo commit.

**Entregue.** Um apostador bayesiano completo: verossimilhança `P(contagem do tipo T | clima)` amostrada do próprio sorteio de pool, posterior por Bayes, escolha pelo maior valor esperado, e retorno medido contra a probabilidade de vitória sob o clima que **de fato** saiu.

> **A primeira medição respondeu à pergunta errada, e descobrir isso foi metade do bloco.** O apostador informado deu **+21,4 %** de EV — e um apostador **cego**, que aposta no azarão sem olhar para nada, deu **+2,5 %**. Apostador cego não lucra contra uma casa com 8 % de margem: o que ele colhia era o **viés de convexidade do estimador** (L-023), que infla a odd do azarão e cresce com `1/(n·p²)`. Com amostra pequena ele domina tudo e afoga o efeito procurado.
>
> A medida certa é **pareada**: o mesmo apostador, com e sem o canal, sobre a mesma rodada e o mesmo preço. O viés entra igual nos dois lados e some na diferença.

**Medido, 300 rodadas — antes e depois do fechamento:**

| | esquema antigo | esquema novo |
|---|---:|---:|
| vantagem do apostador informado | +1,52 % ± 2,80 | **−0,83 % ± 0,86** |
| rodadas em que ele mudou a aposta | 108 de 300 | **12 de 300** |
| confiança do posterior no clima certo | 29,6 % | 26,5 % (acaso: 25,0 %) |

**A decisão, e ela não foi a que a régua pedia.** Pelo critério do bloco, o esquema antigo já passava: `+1,52 % ± 2,80` cruza o zero, então a exploração não estava demonstrada. Mas intervalo largo não é segurança — é ausência de medida —, e o ponto estimado era positivo em 19 % da margem da casa. Como a v0.9 é uma versão que se tagueia e o F0.10 exige não tagueá-la com canal aberto, **o canal foi fechado**, pela opção (b) do próprio bloco.

**Como fechou: a pool vem primeiro, e o clima depois.** Antes, sorteava-se o clima e a pool era obrigada a conter um lutador do tipo favorecido. Agora, sorteia-se a pool sem conhecer o clima, e o clima sai **entre os que a pool suporta**. A garantia continua valendo — clima sem ninguém para buffar não entra no sorteio.

> **E o canal não foi eliminado: foi invertido, e encolhido.** Antes, ver um Gelo entre 12 era evidência de Nevasca; agora, uma pool **sem** Gelo diz que Nevasca é impossível. Qualquer acoplamento entre pool e clima vaza; o que muda é o tamanho. Zerar exigiria clima independente da pool — e aí Nevasca cairia numa rodada sem nenhum Gelo, com o efeito climático simplesmente não acontecendo. **O que decide não é o sinal, é o que ele faz com a aposta:** o sinal residual mudou a escolha em 12 de 300 rodadas, e nelas a vantagem foi negativa.

> **A sabotagem paralela pagou por si três vezes.** Além de derrubar o portão de ~95 min para menos de 6, ela expôs: (a) um teste do F0.5 que exigia 50 raízes dentro de um milissegundo e ficava vermelho sob carga com o código certo — **D-005**; (b) `S49`, que remove a guarda de saldo negativo e escapava porque o lote aleatório passa pela API alta, que já recusa antes; (c) `S55`, que escapou de **duas** redes antes de cair — a margem estatística absorve a divergência, e conferir `sortearClima` direto testava a função certa pelo caminho errado. O que pegou foi comparar o lote real com uma referência condicionada escrita no teste.

**Fixtures regravadas:** `margem.json` (a distribuição marginal de clima mudou, porque agora ela é condicionada à pool: diferença entre grupos de −0,44 para −0,64 pontos, ambas dentro do ruído) e `precisao.json` (a pool de referência mudou de composição: dispersão de 7,44 % para 6,59 %). **Goldens e baseline estatístico inalterados** — a mudança é de sorteio, não de batalha. A linha de base visual foi **restaurada** em vez de regravada: a interface não mudou, e regravar sem motivo é churn que esconde regressão.

---

### F0.12 — Resolução de asset e cache local ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q5 · **Depende de** F0.4

> **Proposto ao levantar o que falta para fechar a base.** A lacuna **L-017** tinha o F0.4 como dono e ficou órfã: o F0.4 entregou metade dela — a função de sprite virou responsabilidade do ContentPack, fechando a L-014 — e fechou sem dizer que o resto continuava aberto. O resto é trabalho de app e de ferramenta, não de camada de conteúdo.

**O risco que ele fecha.** O app busca ~200 folhas de sprite do `raw.githubusercontent.com` a cada sessão, com espelho no jsDelivr. Isso já custou três versões ao projeto (v0.6.1 a v0.6.3), e a hipótese registrada para os sprites terem sumido "sem nada ter mudado no código" — acúmulo de limite de requisições — continua válida. Também impede o jogo de rodar com egresso restrito: o portão Q5 só funciona porque o arnês intercepta as requisições e as serve pelo Node.

**Escopo:** ordem de resolução `local → origem → espelho`. Um script baixa as folhas para um diretório **fora do versionamento**. O ponto de extensão já existe: quem decide o endereço é `pack.sprite(esp)`.

**Sabotagem:** apagar o diretório local (precisa cair na origem, não quebrar); derrubar origem e espelho com o local presente (o jogo tem que rodar inteiro); trocar uma folha local por outra arte (o resgate busca a MESMA coisa em outro endereço, nunca outra coisa — lição da v0.6.1, e é isto que o teste precisa afirmar).

**Q5:** o portão de navegador roda **sem interceptação de rede**, contra o diretório local. Hoje ele depende do arnês servir os sprites; enquanto depender, ninguém sabe se o jogo abre numa máquina com egresso fechado.

**Q6:** sem superfície nova — não versionamos arte de terceiros e o script não executa nada do que baixa.

**Saída:** o jogo roda com a rede externa desligada. `npm run portoes` deixa de precisar do intermediário.

**Entregue.** `app/modules/assets.mjs` implementa a cascata `local → origem → espelho`, e `tools/baixar-assets.mjs` baixa **666 arquivos** para `assets/`, fora do versionamento. Medido: o jogo abre, sorteia a rodada e desenha os 12 lutadores com **zero requisições externas**.

> **O portão de egresso fechado revelou uma dependência que ninguém tinha contado.** Com todas as 449 folhas de *sprite* em disco, ainda saíam **148 requisições**: 70 para `PMDCollab/RawAsset` (as folhas de **efeito**, outro repositório), 41 para o espelho delas, 12 para retratos do Showdown, e 1 para o **Google Fonts**. A dependência de CDN era maior do que a lacuna L-017 descrevia, e só apareceu porque alguém tentou desligar a rede. Isso é o argumento inteiro do bloco: o arnês interceptava as requisições e as servia pelo Node, o que **escondia** a dependência em vez de testá-la.

**A regra da v0.6.1 virou asserção.** Do `CLAUDE.md`: *"o resgate busca a MESMA coisa em outro endereço, nunca outra coisa"*. O teste percorre os candidatos de cada asset e exige que todos terminem no mesmo arquivo — o defeito **S58** troca o espelho por outra arte e fica vermelho.

**Também saiu daqui:** `sprites-dados.mjs` e `efeitos-dados.mjs`, os dados puros de arte. O baixador precisa saber **quais** arquivos o jogo pede sem carregar meia interface junto; antes, qualquer ferramenta que quisesse essa lista teria que importar um módulo que fala com o `document`.

**A fonte também.** `@import` de CSS não sabe cair para outro endereço, então o `@import` virou um `<link>` com resgate: a cópia local primeiro, o Google Fonts como reserva. Trocar de fonte mudaria a identidade visual em silêncio — a mesma classe de erro da v0.6.1, noutra roupa.

**`npm run portoes` passou a exigir a cópia local** (`EXIGE_LOCAL=1`), pelo mesmo motivo que já exigia o navegador: portão que pula em silêncio é decorativo. `npm test` avisa e segue.

> **Não versionar as folhas.** São arte de terceiros, mesma razão pela qual o `battle-theme.mp3` ficou de fora. O script baixa; o repositório não guarda.

---

---

# PORTE DA v1.0 — trabalho paralelo

Um segundo desenvolvedor construiu a v1.0 **sobre o protótipo v0.8 congelado**,
em arquivo único, enquanto a Fase 0 reconstruía o jogo em blocos. O inventário
completo, medido, está em **`docs/PORTE_v1.0.md`**.

> **O motor não foi tocado.** O extrator de paridade comparou as 26 declarações
> dos dois lados: 32.302 bytes cada, diferença de 6 linhas numa função só
> (`showdownSlug`, endurecida). Nenhum golden muda, nenhuma fixture de batalha
> muda, e nada dos blocos F0.1 a F0.12 entra em conflito com o motor. **Tudo o
> que ele fez está na camada de produto** — e é por isso que o porte cabe em
> blocos em vez de virar merge.

**Já trazido, fora de bloco:** o defeito **D-006** (barra de XP negativa no
treinador novo), que era nosso e ele encontrou.

### V1.13 — Identidade visual Neon/Cyberpunk ✅

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q5 · **Depende de** F0.12

**Escopo:** os tokens (`--goldRGB`, `--onAccent`, `--gold` como acento), as duas variantes (`hyper`, `shadow`) em `html[data-tema]`, o bloco de pele (1.031 linhas), a fonte Orbitron, as três artes de `assets/` e o script anti-FOUC no `<head>`.

**Sabotagem:** cor nova entrando como hex solto em vez de token (o teste precisa pegar); tema guardado sem ser aplicado antes da primeira pintura; variante removida do seletor sem sair da lista.

**Q5:** a linha de base visual das 12 telas **é regravada de propósito**, com a diferença explicada no commit. É a primeira regravação visual desde o F0.3d.

**Saída:** trocar de tema muda o site inteiro sem tocar em uma linha de lógica de jogo — que é a promessa que os tokens fazem.

**Entregue.** Os dois blocos de token (`:root, html[data-tema="hyper"]` e `html[data-tema="shadow"]`), 1.030 linhas de pele, `app/modules/tema.mjs`, o seletor no perfil, o script anti-FOUC no `<head>` e a fonte Orbitron — esta última baixada para a cópia local, senão o portão de egresso fechado do F0.12 reprovaria, como deve.

> **A estratégia dele era a certa, e é o que fez isto caber num bloco: manter os NOMES dos tokens e trocar os VALORES.** `--gold` continua sendo `--gold` em cerca de setenta referências espalhadas por arena, HUD, killfeed e carteira — hoje ele significa "a cor de acento do tema", não amarelo. Trocar o valor converte tudo de uma vez; trocar o nome exigiria caçar setenta lugares.

**A varredura tem UMA exceção, e ela é a parte interessante do teste.** A pele da plataforma sai de token porque ela **é** o tema. Os cosméticos não: "Neon", "Glitch" e "Grade Synth" são efeitos que o jogador escolhe pelo nome, e a cor específica é a identidade deles — um efeito Neon que muda de cor com o tema deixa de ser o efeito que a pessoa escolheu. A exceção é por **seletor** (`.cn-*`, `.ef-*`, `.sc-*`) e não por arquivo, de propósito: cor solta numa regra de plataforma continua reprovando mesmo dentro do bloco de pele.

> **`--line` e `--scan` passaram a DERIVAR do acento** em vez de repetir o valor dele em cru. Escritos com o número solto, mudar o acento deixaria os dois para trás — e ninguém veria, porque eles são o acento em opacidade baixa.

**Q5 · linha de base regravada, 12 telas.** É a primeira regravação visual desde o F0.3d, e é intencional: o site inteiro mudou de cor. Diferença média de 10,2 a 17,7 pontos, pico de 233.

**O portão ganhou dois testes de navegador**, e o segundo nasceu de um escape:

- **trocar o tema muda o site, e a mudança chega à tela** — não basta o token mudar; a cor calculada de um elemento real precisa mudar junto. Token que não chega à tela é token decorativo.
- **o tema vale antes de qualquer módulo rodar** — o defeito **S69** esvaziou o corpo do script inline deixando o texto no lugar, e o teste textual passou por baixo. **Terceira vez que a lição aparece: testar a declaração não testa a peça.** A prova é bloquear *todos* os módulos e carregar mesmo assim: se o tema guardado aparece no `<html>` sem uma linha de módulo ter rodado, o `<head>` fez o trabalho.

**Fixtures:** só `visual-base.json`. Nenhum golden, nenhuma medição — o bloco não toca em lógica, que é exatamente o que ele promete.

### V1.14 — Arenas variadas ✅

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 · **Depende de** V1.13

**Escopo:** os **cinco** biomas sorteados e o selo de arena. O sorteio entra na árvore de sementes (§P3) como ramo do `visual` — arena sorteada fora da raiz quebraria a reprodutibilidade que o F0.5 comprou.

> **Eram cinco, não seis.** O escopo dizia "seis biomas" e o inventário do porte repetia o número; o `ARENAS` da v1.0 tem cinco entradas — Ilha Tropical, Campo Gelado, Coliseu, Praia e Cratera Vulcânica. Contagem minha, errada, corrigida aqui e no `PORTE_v1.0`. Inventar um sexto para fechar o número seria trocar o que ele fez por outra coisa, que é exatamente o que a regra do resgate proíbe.

**Sabotagem:** sortear a arena com `Math.random`; deixar o bioma influenciar a batalha (ele é cosmético e precisa continuar sendo).

**Entregue.** `app/modules/arenas-dados.mjs` (catálogo e sorteio, sem DOM) e `app/modules/arenas.mjs` (as cinco pinturas), o selo `#arenaBadge` no canto oposto ao de clima, e a inversão de dependência no `render.mjs`.

> **A silhueta não muda, e isso é o que faz o bloco caber.** Movimento, zona de cada lutador e limite de deslocamento saem da superelipse do `render.mjs`. Trocar o contorno por arena significaria recalibrar a coreografia cinco vezes — e abriria a porta para lutador andando fora do mapa. O que muda é a **pele**.

**A separação em dois módulos não é arrumação, é o que torna o bloco testável.** A escolha da arena é aritmética e roda no Node (`arenas-dados.mjs`, camada 0, sem uma linha de DOM); a pintura precisa de canvas e só se verifica no navegador (`arenas.mjs`, camada 3). É o mesmo par de `sprites-dados`/`sprites` e `efeitos-dados`/`efeitos`.

**O render deixou de saber o que é uma arena.** Ele guarda a geometria e recebe `{estatico, fundo, poeira}` por injeção — o caminho contrário fecharia um ciclo, porque a pintura precisa da geometria para desenhar. Sem cenário aplicado o `drawMap` não desenha nada, o que é a resposta certa: significa que alguém pintou antes de a rodada escolher a arena.

> **Por que o selo aparece já na aposta, e o de clima não.** O clima dá bônus de stat e por isso fica em segredo até as apostas fecharem (§4.3, e o canal que o F0.11 mediu). A arena não dá nada. Esconder um cenário que não muda preço nenhum só tiraria informação inócua de quem está escolhendo — e o teste lê os dois selos **no mesmo instante**, para que a assimetria seja afirmada e não presumida.

**Q5 · a linha de base ganhou raiz fixa, e é a mudança mais importante do bloco.** Cinco arenas sorteadas por rodada tornariam a captura diferente a cada execução: `npm run repetir` acusaria instabilidade sem defeito nenhum, e instável é pior que vermelho — vermelho constante tem endereço. A resposta não foi tirar a arena da captura (aí ela deixaria de ser medida), e sim tirar o acaso: a captura substitui `crypto.getRandomValues`, a única fonte imprevisível do jogo, por um contador. Tudo depois disso continua sendo código de produção rodando de verdade, só que da **mesma raiz** toda vez. Mesmo princípio de bloquear as folhas de sprite.

**Q3 · a arena é cosmética, e há prova binária.** A batalha sai de `S.seeds.batalha` e a arena de `visual`: raízes que dão arenas diferentes com o mesmo ramo de batalha produzem a mesma batalha. E nenhum arquivo de `engine/` conhece bioma — a varredura procura a chave entre aspas, o campo de objeto e o nome de exibição, não a palavra solta, porque o `engine.mjs` explica killstreak como "bola de neve" e um teste que proíbe metáfora vira obstáculo, não invariante.

**Q2 · seis defeitos novos (S73–S78), e dois deles escapam da suíte de propósito.** S77 (o selo não acende) e S78 (a arena sai de `S.seeds.elenco`) deixam o catálogo perfeito e o desenho correto; o que quebra é o encaixe. **Quarta vez que a lição aparece** — S30, S53, S65, S69 — e a rede continua sendo a mesma: o navegador lê o selo vivo e o Node recalcula a arena a partir da raiz que o app usou.

**Fixtures:** `visual-base.json`, regravada. Nenhum golden e nenhuma medição mudam — o bloco não toca em lógica, e o teste que prova isso é o de que a batalha não se move junto com a arena.

**Duas coisas quebraram no próprio portão Q2, e as duas eram armadilhas antigas.**

- **O S15 quase virou defeito sem âncora.** Ele plantava "módulo usa símbolo do motor sem importar" removendo o `import { rng }` do `render.mjs` — e o V1.14 tirou de lá o desenho semeado. O defeito continuaria na lista, verde, provando nada. Realvo para `arenas.mjs`, que é quem usa o símbolo hoje.
- **A lista de arquivos da sabotagem era uma segunda fonte de verdade.** Escrita à mão, ela não conhecia os dois módulos novos, e a execução morreu com um `TypeError` no defeito 70 — vinte minutos de trabalho jogados fora. Agora ela **deriva** da própria lista de defeitos, e a dessincronização deixa de ser possível. O relatório também passou a imprimir o status: "ESCAPOU" e "ÂNCORA PERDIDA" são problemas diferentes, e chamar os dois de "passou despercebido" custou um diagnóstico errado.

**Fora do escopo, registrado e não corrigido:** **D-007** (os desafios diários emitem ~525 PC-B/semana contra os 80 agregados do Estudo Econômico, 6,5×), **L-026** (o baú não tem contra o que ser calibrado enquanto o D-007 durar) e **L-027** (o campo `brilho` do catálogo dele, documentado e nunca construído — portamos os quatro campos que existem e não inventamos o quinto).

### T1 — O custo do portão ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Depende de** V1.14

> **Trilha `T` — blocos de ferramenta.** Tocam só `test/` e `tools/`, nunca o
> comportamento do jogo. Existem porque o portão é infraestrutura: quando ele
> fica caro ou mentiroso, todo bloco seguinte paga. Um bloco `T` que altere um
> byte de `app/`, `engine/` ou `content/` está fora do próprio escopo.

**Escopo:** as três mudanças que a medição do V1.14 apontou. **Q6: sem superfície nova** — nada aqui é alcançável por usuário.

**A medição que motivou o bloco.** O portão do V1.14 levou **52m39s** em 8 execuções, e **19 desses minutos — 36% — foram uma classe só de erro**: âncora de sabotagem. Uma execução morreu com `TypeError` no defeito 70 porque a lista de arquivos era escrita à mão e não conhecia dois módulos novos; outra rodou 12 minutos inteiros para revelar que o S15 tinha perdido a âncora. As duas informações se leem estaticamente, em 0,1 s.

**1 · Pré-voo.** `test/ancoras.mjs` confere, antes de montar caixa nenhuma, que cada defeito tem âncora presente **exatamente uma vez**, arquivo legível, `de` diferente de `para` e id único. **Aborta**, não avisa e segue: defeito sem âncora conta como "não pego" no relatório, e portão que segue com defeito decorativo mente sobre a própria cobertura.

> Contar, e não perguntar se existe. Âncora que casa duas vezes planta na primeira — que pode não ser a pretendida —, e aí o defeito passa a testar outra coisa sem ninguém saber.

A lista de defeitos saiu para `test/defeitos-plantados.mjs`, para poder ser **lida sem ser executada**: `sabotagem.mjs` é um script com efeito colateral, e importá-lo de um teste rodaria o portão inteiro.

**2 · `--tocados`.** Roda só os defeitos ancorados em arquivo que o `git status --porcelain` mostra alterado — `--porcelain` e não `git diff`, porque durante a construção o caso comum é arquivo recém-criado. Medido: **15 de 78 no V1.14, 2,3 min em vez de 12**. Sem arquivos tocados, devolve **tudo**: filtro que devolve demais custa tempo, filtro que devolve de menos entrega relatório verde sobre defeito que ninguém plantou. Serve à construção e grita, no começo e no fim, que não fecha o Q2.

**3 · Os cinco navegadores em paralelo.** `visual.rodar()`, `capturarBase()`, `digitaisNoNavegador()`, `rodarTemaSemModulos()` e `rodarSemRede()` são independentes — cada uma sobe o próprio servidor em porta efêmera e o próprio Chromium — e rolavam em fila numa máquina de quatro núcleos. Medido: **122 s → 94 s** (a suíte sem navegador leva 55 s, então os 67 s de navegador viraram 39 s). `Promise.all` e não `allSettled`: falha tem que derrubar a execução, não virar um `null` que a suíte lê como "pulado" — e um guarda explícito reprova se qualquer um dos quatro resultados obrigatórios vier vazio.

**Q2 · quatro defeitos novos (S79–S82), e um deles achou um erro meu no mesmo dia.**

> **A primeira execução veio com os quatro "pegos por `portao`", inclusive o S82, que mexe em `run.mjs` e não tem nada a ver com âncora.** O motivo: eu tinha posto no `test/portao.mjs` uma conferência das âncoras da lista **real**, e dentro da caixa de areia o `de` do defeito plantado deixou de existir *por construção*. Qualquer defeito ficaria vermelho ali. A coluna "pego por" existe justamente para revelar área com cobertura fraca — um teste que pega tudo por tautologia **apaga** essa informação, e teria apagado para os 82.
>
> Corrigido marcando a caixa (`EM_SANDBOX=1`) e não registrando aquele teste ali. **O pulo é decisão, não esquecimento:** dentro da caixa a âncora perturbada é o comportamento esperado, fora dela o teste roda sempre, e a sabotagem ainda faz a mesma conferência no próprio pré-voo. Não há janela sem cobertura. Depois da correção o S82 voltou a aparecer como "só o navegador", que é a verdade.
>
> É o portão fazendo o trabalho dele contra quem o escreveu, e é a razão de Q2 ser obrigatório em todos os blocos.

**Saída:** o portão do próximo bloco custa ~20 min de relógio em vez de ~53, sem uma suíte a menos, um defeito a menos ou uma asserção afrouxada.

---

### V1.15 — Fecho do porte: pós-rodada, cosmético e painel ✅

**Tam.** GG · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 · **Depende de** V1.14

> **Três blocos viraram um, por decisão do dono do projeto.** V1.15 (colocação,
> pódio, banner, cancelar aposta), V1.17 (shinys) e V1.18 (painel de ADM) eram
> todos camada de produto, sem risco de motor — a análise de paridade já provara
> que o motor dele é byte-idêntico ao nosso. A cerimônia por bloco (documento,
> DEFEITOS/LACUNAS, regravar fixture, mensagem de commit) é custo **fixo**, e
> pagá-la três vezes por trabalho da mesma natureza era o que fazia o ciclo
> parecer lento. O escopo continua um: **fechar o porte**. O que não entra
> continua não entrando — baús seguem fora (V1.19).

**Escopo:** tudo o que resta do trabalho dele, exceto baús.

**Três critérios de saída, um por bloco original:**

1. **Pós-rodada** — colocação ao vivo do 1º ao 12º, banner de batalha com
   cosméticos, e **cancelar aposta**.
2. **Cosmético** — shinys (GIF de vitrine e skin de arena), com a fonte do
   desbloqueio **declarada**.
3. **Painel** — `#adm` com conta, margem, registro de preço, laboratório shiny e
   estatísticas. **Sem simulador de baús.**

**Mais um achado do V1.14:** as **24 pokébolas**, doze por rodada sem repetir.
Ficaram de fora do escopo daquele bloco e não tinham dono; entram aqui porque
este bloco é o que fecha o porte, e deixá-las de fora deixaria o porte aberto.

---

#### 1 · Cancelar aposta — a peça perigosa

O F0.8 registra passivo por lutador na confirmação. **Cancelar devolve DUAS
coisas, e as duas são obrigatórias:**

| | sem isso | |
|---|---|---|
| `liberarTicket` | o passivo nunca volta | o mercado daquele lutador fica travado o resto da rodada por causa de uma aposta que não existe mais |
| `devolverAposta(composicao)` | devolve "o valor" | bônus vira transferível a cada cancelamento, e a proveniência do §5.5 deixa de valer |

`engine/exposicao.mjs` ganhou `liberarTicket`, o **inverso exato** de
`registrarTicket`, com trava em zero: passivo negativo é espaço que não existe.
O teste afirma o ida-e-volta em cem valores por lutador, e que o mercado reabre
com **exatamente** o mesmo limite de antes.

> **BOTÃO EXPLÍCITO, e não "clicar de novo no mesmo lutador".** A v1.0 do porte
> fez assim e teve de consertar a ordem das checagens: com a ficha "Tudo" o saldo
> ia a zero e o clique caía no "saldo insuficiente" antes de alcançar o
> cancelamento — o dinheiro parecia ter sumido. A nossa interface de fichas usa o
> clique no mesmo lutador para REAJUSTAR, que é ação normal aqui, e empilhar
> cancelar em cima traria a ambiguidade de volta. A lição dele fica preservada
> por construção: o botão nunca depende de saldo.

`bet_cancelled` entrou no §4.7 da Spec **no mesmo commit** — a lista era de antes
de a ação existir, e cancelamento não é ruído de interface: é a diferença entre
"o jogador desistiu" e "o jogador nunca olhou".

**`fases.mjs` passou de 600 linhas e foi dividido por RESPONSABILIDADE**, não por
tamanho: `aposta.mjs` é o único ponto do app em que dinheiro do jogador encontra
o teto do §4.4.6; as fases são a máquina de estados da rodada.

#### 2 · Colocação — uma fonte de verdade

A ordem de quedas vem do **mesmo gancho** que credita o abate. Dois contadores
paralelos divergem, e a divergência só aparece na tela do jogador. `fases.mjs`
tinha uma segunda travessia dos eventos para a posição final — conferido: não
estava errada, o evento de killstreak do nosso motor não carrega `ko`. O problema
era ser cópia.

#### 3 · Banner de batalha — dez cenários, oito efeitos, zero bytes

Gradiente e `::after`; nenhum asset novo. Quatro cenários e três efeitos vieram
com a identidade do V1.13, os demais entram aqui. O catálogo e o CSS precisam
fechar **nos dois sentidos**: entrada sem classe deixa o jogador escolher um
cenário que não desenha; classe sem entrada é CSS inalcançável.

#### 4 · Shinys — e a fonte, que não vinha pronta

No trabalho dele o shiny saía do baú. Com os baús fora do porte, o cosmético
precisava de outra origem. **Escolhido: nível do treinador, com escolha do
jogador** — uma vaga a cada 5 níveis, o jogador escolhe qual Pokémon a ocupa.

Três razões, e nenhuma é estética:

1. **Não toca a economia.** O D-007 registra que a emissão dos desafios já
   estoura em 6,5× o orçamento do Estudo. Fonte que custasse moeda entraria numa
   conta que hoje não fecha.
2. **Não é caixa.** O §11.3 lista "loot box paga sem transparência" entre os
   pilares a evitar. Aqui não há sorteio: o jogador sabe quando ganha a vaga.
3. **É um gatilho, não um sistema.** Trocar a fonte depois — para o baú, quando
   ele existir pelo nosso desenho — é mudar uma função.

A arte é o **mesmo desenho recolorido** (`0000/0001/` no SpriteCollab), com a
medição do autor da v1.0 registrada: canal alfa idêntico e contagem de pixels por
cor batendo exatamente. Trocar para shiny é trocar o caminho da URL.

#### 5 · Painel de ADM — e o conflito C1, resolvido

**A margem virou parâmetro da rodada**, e não escrita em `CONF`. Constante
congelada mutável em tempo de execução faria a fixture `margem.json` medir uma
coisa e a rodada valer outra, sem nada avisando. Agora quem precifica **declara**
a margem daquela rodada, ela vai gravada no registro do §4.4.5, e o painel mostra
**o mesmo valor** que a tela mostra ao lado das odds: o painel pode mudar o
preço, nunca criar odd secreta.

Vale a partir da **próxima** rodada — mudar o preço de uma rodada com aposta viva
alteraria o retorno de um ticket confirmado, e o §4.4.6 proíbe retroação.

**Q6:** o PIN está no código-fonte e não é controle de acesso. O aviso disso, em
vermelho no topo, **é parte da entrega** — painel que finge ser seguro é pior que
painel aberto: o segundo ninguém confia, o primeiro alguém confia. O teste afirma
que o aviso continua lá, que nada no menu aponta para o painel, e que **nenhum
módulo escreve em `CONF.MARGIN`**.

---

**MEDIDO NO FECHAMENTO**

```
suíte        299/299 verde, com navegador
sabotagem    94 defeitos plantados
linha de base regravada: só a tela `arena` mudou, nas três larguras
             (média 15,6 a 19,9 · pico 206 a 218); as outras nove,
             byte a byte idênticas
```

**Q2 · doze defeitos novos (S83–S94), e DOIS escaparam na primeira execução.**
Os dois eram lacuna real de teste, não falso alarme:

- **S86** (a aposta volta a ser contada no clique) — nada via. Quem conta é o
  fluxo, e só o navegador o percorre. Virou teste Q5: três cliques contam uma
  aposta.
- **S89** (a ordem de quedas deixa de vir do gancho do abate) — a conferência do
  fim da rodada **corrigia tudo**, então o quadro terminava certo depois de
  passar a rodada inteira errado. Virou teste Q5 lido **do meio da luta**.

> **O segundo é o mais instrutivo do bloco.** Uma conferência de fecho boa o
> bastante esconde um defeito de tempo real. Não bastava testar o resultado: era
> preciso testar *quando*.

**Fora do escopo, registrado:** **D-008** e **D-009** (achados e corrigidos aqui,
porque o próprio escopo dependia deles), **D-010** (a linha de base não separava
componente novo de ruído — fechado no **T2**), **L-028**.

### V1.20 — Trilha `R`: o acabamento da tela principal ✅

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q7 · **Depende de** V1.16, T2

**Escopo:** a **L-030** inteira — os dez itens da segunda passada do crítico
cego — mais a **L-027**, o véu de cor por arena, que estava sem bloco desde que
o V1.17 foi absorvido pelo V1.16. As duas fechadas; o detalhe item a item está
em `docs/LACUNAS.md`.

O V1.16 reorganizou o ARRANJO. Este resolveu o que sobra depois que o arranjo
está certo: **o que cada número quer dizer, em que ordem o olho os encontra, e o
que a tela afirma quando o estado muda.** São defeitos de LEITURA, e nenhum era
erro de execução — todos passaram pela suíte inteira verde.

**A decisão do dono:** o `R$` saiu. Ficou só o **preço dos pacotes** da loja
simulada, que é o produto à venda e não a tradução de um saldo.

**O que o olho pegou e o teste não pegaria:**

- **A primeira solução do item 4 estava errada, e a captura provou.** Pôr
  "CHANCE" em cima de cada número resolvia o significado e custava uma linha por
  lutador — o que empurrou a **odd**, o segundo número mais importante da tela,
  para o menor corpo da linha. Virou faixa de coluna: o rótulo aparece uma vez,
  no topo, onde o olho entra.
- **A confirmação da aposta caiu em cima do selo de arena** e saiu cortada no
  meio da palavra. O selo tem z-index maior. Mudou para o único canto livre dos
  três selos.
- **"na lista ao lado"** é verdade em três das quatro larguras e mentira em
  420 px, onde a lista desce. É o mesmo defeito que o V1.16 tirou da seta do
  overlay, voltando pela porta do texto.
- **A cantoneira de BAIXO tinha o mesmo problema da de cima**, e apareceu no
  mesmo olhar.

**O que o crítico cego pegou e nem o olho nem o teste pegaram (Q7, terceira
passada, mesma barra):** em 420 px a lista de odds ficava **fora da dobra**, e
dois textos mandavam o jogador ir até ela — a única ação que o produto pede,
invisível no celular. Corrigido dentro do bloco por ser regressão e não
acabamento: a ordem em coluna única passou a mudar com a fase.

Notas da terceira medição: **1920 → 6,25 · 1440 → 7,00 · 420 → 5,50**. O resto
do que ele achou virou **L-031**, dono **V1.21** — e o item mais duro dele é que
**1920 é a pior das larguras por ser a maior**: o layout estica em vez de
agrupar.

**Duas medições novas viraram ferramenta permanente:**

- `test/contraste.mjs` — piso WCAG AA medido **no pixel**, não no token: a cor
  que o jogador vê é `--panel` com alfa sobre `--bg` com gradiente por cima. O
  rodapé de auditoria marcava **3,55:1** contra o piso de 4,5:1.
- a separação lutador/piso, medida na cratera com a luta correndo, que confirmou
  a queixa sobre o shiny **e a inverteu** (1,26 → 1,99, contra 1,43 → 1,75 na
  variante normal).

**Q6: sem superfície nova.**

**Saída (cumprida):** o crítico cego responde as cinco perguntas em 1920 e em
420 e localiza cada resposta na tela.

---

### T3 — O ciclo que cabe numa sentada ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Trilha `T`** (só `test/` e `tools/`)

**O dono do projeto levantou, com razão, que um bloco leva horas** — e a maior
parte delas é máquina esperando por trabalho que não precisava ser feito. Medido
no V1.20:

| peça | custo | vezes | total |
|---|---|---|---|
| `npm run sabotagem` (108 defeitos) | ~20 min | 3 | **60 min** |
| `npm test` com navegador | ~2,5 min | ~15 | **37 min** |
| `npm run test:gerar` | ~5 min | 4 | **20 min** |
| `npm run olhar` | ~2 min | 5 | 10 min |

**O que foi feito, e o que cada coisa passou a custar:**

**1. `--so=<lista>` no gerador.** `--gerar` regravava TUDO — golden, precisão
(154.000 × 8), informação (300 rodadas), margem (300 × 8.000) e a linha de base
de 10.000 rodadas — quatro minutos de Monte Carlo para reescrever UM arquivo.

```
npm run test:gerar                    ~5 min
npm run gerar:visual                    49 s      <- medido
```

**2. `--so=<lista>` na suíte.** E, com ele, o Chromium não sobe quando o recorte
não pede suíte que precise dele — que é o que faz a diferença ser de duas ordens
de grandeza:

```
npm test              (27 suítes, 5 navegadores)   ~2,5 min
npm run rapido        (21 suítes, sem navegador)     6,9 s   <- medido, 236 testes
node test/run.mjs --so=carteira,exposicao            0,8 s   <- medido
```

**3. Defeito de interface começa pelo navegador.** Dos 12 defeitos novos do
V1.20, **10 só o navegador pega** — e para cada um o portão rodava a suíte
inteira SEM navegador (55 s, tudo verde, zero informação) e só então de novo COM.
Quando o defeito mora em `app/`, a ordem se inverte. A passada sem navegador é
**guardada e não descartada**: se ela também pegar, alimenta o caminho normal em
vez de ser refeita — descartá-la custaria uma terceira execução justamente no
caso em que a aposta errou.

**A metade que importa: o portão de fechamento não encolheu.** `npm run portoes`
continua rodando a suíte inteira, duas vezes, com navegador e sabotagem completa,
e **recusa `--so` explicitamente** (`EXIGE_VISUAL=1` + recorte = saída 2). O modo
parcial acelera a CONSTRUÇÃO; ele não fecha bloco nenhum. É a mesma disciplina do
`sabotagem:tocados`, do T1, e é por isso que aquele não corrompeu o portão.

**O recorte GRITA que foi parcial**, nas duas pontas da execução, e **nome que
não casa com suíte nenhuma REPROVA** em vez de rodar vazio — que é a falha mais
silenciosa que este arnês poderia ter: zero testes e a palavra VERDE.

**Sabotagem:** `S109` (nome inexistente roda vazio), `S110` (o aviso de parcial
some), `S111` (o portão de fechamento aceita o recorte), `S112` (a suíte deixa de
expor o próprio nome), `S113` (o caminho do navegador some com a passada sem
navegador).

**Q5: sem tela nova.** **Q6: sem superfície nova.**

**Saída (cumprida):** o laço de construção caiu de ~2,5 min para **0,8–7 s**, a
regravação da linha de base de ~5 min para **49 s**, e o portão de fechamento
continua exatamente do mesmo tamanho.

---

### V1.21 — Trilha `R`: densidade e estados

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q7 · **Depende de** V1.20

**Escopo:** a **L-031** — os nove itens que a terceira passada do crítico cego
abriu. O eixo é um só, e é o item 2 dela: **em 1920 o layout estica em vez de
agrupar.** Medido pela mesma barra, 1920 tira 6,25 e 1440 tira 7,00 — a maior
largura é a pior, porque nada cresce de corpo e tudo se afasta.

Os outros oito orbitam isso: identidade duplicada ocupando o topo, a coluna
esquerda se rearranjando inteira entre estados, a arena vazia durante a aposta,
a hierarquia de cor invertida nos dois botões de controle.

**Dois itens precisam de MEDIÇÃO antes de virar correção**, e o bloco não pode
inverter a ordem:
- a placa de vida vazia e sem nome durante a luta — pode ser sprite que não
  chegou, pode ser defeito;
- o retorno em dinheiro antes da aposta — mostrar `263` ao lado de `x5,26` em
  doze linhas pode responder a pergunta ou pode virar a terceira coluna de
  números na mesma linha. **Mede-se com o crítico, não se decide na prancheta.**

**Sabotagem:** a ordem em coluna única voltar a ser fixa; o rótulo de direção do
relógio sumir; a identidade duplicada voltar; a cor primária voltar para o botão
secundário.

**Q6: sem superfície nova.**

**Saída:** 1920 deixa de ser a pior largura da barra — nota igual ou acima de
1440, com a localização de cada resposta.

---

### V1.19 — Baús: NÃO ENTRA NO PORTE

**Decisão do dono do projeto.** Os baús ficam no **nosso** roadmap, com o
**nosso** cálculo econômico. A implementação dele não é portada.

O que ele produziu continua valendo como **insumo**, e é insumo bom: 3.000.000
de aberturas com qui-quadrado em cinco sementes independentes, medição de que o
prêmio anterior não influencia o seguinte, autossustento de 4,7 % medido, e o
desenho da garantia (pity) com pior caso em 20.000 jogadores simulados. Está
tudo em `prototype-v1.0/IDENTIDADE-VISUAL.md`.

> **Por que não portar mesmo com os números prontos.** A tabela dele resolve a
> distribuição, e a distribuição é a parte fácil. A parte difícil é a decisão
> que o §5.5 obriga a tomar: PokéCash de baú é PC-T ou PC-B? Em PC-T seria
> dinheiro sacável nascendo de graça, que é exatamente o que a proveniência da
> carteira existe para impedir. E as três moedas novas — fragmento, essência,
> prisma — mudam a superfície econômica inteira.
>
> Herdar a implementação junto com a economia significaria herdar a decisão sem
> tomá-la. Os números ficam; a economia é nossa.

**Consequência para o porte:** os shinys dependiam daqui, porque o baú era a
fonte dos cosméticos. Eles entraram no V1.15, e a fonte virou decisão daquele
bloco: **nível do treinador, com escolha do jogador**. Trocar para o baú, quando
ele existir pelo nosso desenho, é mudar uma função — não o sistema.

> **O V1.19 está bloqueado pelo D-007**, e não por falta de método. O baú da v1.0
> emite **1,45 PC-B por rodada**: 55 rodadas/semana consomem sozinhas os 80 PC-B
> agregados do Estudo Econômico, e 21 rodadas/semana consomem os 30 que sobram
> para desafios/rescue/missões. Não dá para calibrar o nosso contra um orçamento
> que a nossa própria implementação já estoura em 6,5×. Ver **L-026**.

---

### T5 — O pré-voo responde antes do portão

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Trilha `T`** (só `test/` e `tools/`)
· **Depende de** o pré-voo de âncoras (`test/ancoras.mjs`)

**Por que ele existe.** Hoje o portão só descobre que um defeito NOVO é
decorativo depois de rodar os 239 — 44 min na execução fria. O F1.14 pagou isso
três vezes seguidas, e as três pelo mesmo motivo (**L-038**): mutante
equivalente, guarda redundante sobre guarda que já basta.

O pré-voo de âncoras já provou que a resposta certa é a barata: ele custa 0,1 s
e evitou 19 dos 53 minutos de portão do V1.14. Falta o irmão dele — o defeito
que TEM âncora e mesmo assim não vale nada.

**Escopo:**

1. **Defeito novo roda contra a suíte antes do portão começar.** "Novo" é o que
   não tem veredito no cache — a informação já está no `q2-veredito.json`.
   Verde ali reprova o pré-voo com o nome do defeito, e não conta como cobertura.
2. **A lista do `npm run rapido` para de ser escrita à mão.** Ela nomeia 21
   suítes e o projeto tem 35 sem navegador: as 14 mais novas — todas as do
   servidor, incluindo `laco` e `sala-cliente` — nunca rodam ali. É o defeito
   **D-017**, e ele é da mesma família do `--so`: atalho que mente sobre o que
   cobriu. A correção é derivar (`--sem-navegador`), porque derivar não pode
   dessincronizar.
3. O relatório do Q2 passa a dizer **quantos defeitos são novos** naquela
   execução, ao lado de quantos foram reaproveitados.

**Fora do escopo, e declarado:** detectar mutante equivalente em geral é
indecidível, e nada aqui promete isso. O que o bloco compra é a hora em que a
descoberta acontece — minuto zero em vez de minuto 44.

**Sabotagem:** fazer o pré-voo aceitar um defeito novo que passa; fazer "novo"
significar "sem âncora" em vez de "sem veredito"; deixar o `--sem-navegador`
derivar a lista de um lugar que não é a lista de suítes; fazer o relatório somar
novos e reaproveitados no mesmo número.

**Q6:** sem superfície nova.

**Saída:** um defeito plantado que não é pego por nada reprova em segundos, com
o nome dele, e `npm run rapido` roda toda suíte que não precisa de navegador.

---

### T4 — O fecho alcança o processo filho ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Trilha `T`** (só `test/` e `tools/`)
· **Depende de** o cache de vereditos do Q2 (`test/fecho.mjs`)

**Por que ele existe.** O cache de vereditos derrubou o Q2 de ~100 min para 4 min
quando nada muda, e o custo passou a acompanhar o tamanho da mudança. Mas ele tem
um teto conhecido, e ele está escrito no `fecho.mjs`: **suíte que dispara processo
filho recebe fecho universal.**

```
portao         TUDO      roda `node test/run.mjs` em caixa de areia
concorrencia   TUDO      roda `tools/q8-worker.mjs`, oito processos de verdade
```

**Medido: 14 dos 202 defeitos indexados têm captor de fecho universal** —
`portao` 9, `concorrencia` 1, e quatro que a medição revelou e ninguém tinha
nomeado (abaixo). Fecho universal quer dizer que **qualquer** mudança em
**qualquer** arquivo invalida esses vereditos.

Hoje custa pouco: 189 de 208 continuaram reaproveitados. O problema é a direção
— toda vez que um bloco novo escrever um teste que dispara processo, mais
defeitos caem no balde universal, e o teto desce sozinho.

**O QUARTO CASO, que a medição achou e que não é processo filho.** Quatro
defeitos voltam com captor `(não carrega)`: a mutação quebra o carregamento do
módulo, a execução inteira morre antes de qualquer teste, e nenhuma suíte é
nomeada. Sem nome de captor não há fecho de que depender, então eles pagam o
caminho completo em toda execução, para sempre.

Continua sendo vermelho — o defeito É pego —, mas é outra coisa, e o relatório já
distingue as duas desde o V1.14. O que falta é o cache saber lidar: um defeito
que derruba o carregamento depende do arquivo mutado e de mais nada relevante, e
esse é um fecho pequeno e fácil de defender.

**Escopo:** seguir o filho quando o caminho dele é literal.

```text
execFileSync('git', [...])                 binário externo    → não é dependência
execFile('node', ['tools/q8-worker.mjs'])  script do repo     → soma o fecho DELE
execFile('node', [variavel])               não resolvido      → continua TUDO
```

A diferença entre as três linhas é o bloco inteiro. Disparar `git` não cria
dependência de arquivo nenhum do projeto; disparar um script do repositório cria
a dependência do fecho daquele script; e o que não se resolve continua universal.

**O QUE TORNA ESTE BLOCO PERIGOSO, e precisa estar dito antes de começar:** ele
faz o fecho ENCOLHER, que é a direção errada de errar. O `fecho.mjs` é escrito
com a regra "toda dúvida resolve para `TUDO`" porque errar para mais custa uma
reavaliação e errar para menos faz o portão reaproveitar um veredito que já não
vale. Um bloco que encolhe fechos tem que provar, teste a teste, que só encolheu
onde tinha certeza.

**Sabotagem:**
- fazer o seguidor aceitar caminho vindo de variável como se fosse literal
  (é o caso que **tem** que continuar `TUDO`);
- fazer `execFileSync('git', ...)` — ou qualquer binário externo — encolher o
  fecho para o do arquivo errado;
- perder os imports transitivos do filho: o fecho de `concorrencia` tem que
  conter `server/banco.mjs` e `server/carteira.mjs`, que o `q8-worker` importa,
  e não só o `q8-worker.mjs`;
- fazer o fecho do filho ignorar o `ARNES`;
- trocar a busca do caminho do script por uma que case com o primeiro argumento
  (que é `node`, e não o script);
- dar ao defeito `(não carrega)` um fecho pequeno **sem** garantir que ele
  continue sendo reavaliado quando o arquivo mutado muda.

**Q1:** `fechoDaSuite('concorrencia')` deixa de ser `TUDO` e passa a conter o
fecho do `q8-worker`; `fechoDaSuite('portao')` idem para o `run.mjs`; e uma
suíte de mentira que dispare um caminho não literal continua `TUDO`.

**Q2:** os defeitos plantados acima, e mais um no próprio `fecho.mjs` que faça o
seguidor devolver conjunto vazio em vez de `TUDO` quando não resolve — o modo de
falha mais caro possível, porque ele parece funcionar.

**Q6: sem superfície nova** — a trilha `T` não toca em código de produção.

**A MEDIÇÃO QUE O BLOCO PRECISA APRESENTAR**, e ela é o critério de saída, não
enfeite:

| número | antes (medido) | depois |
|---|---|---|
| defeitos com captor de fecho universal | **14 de 202** | menor |
| dos quais, por processo filho | **10** (`portao` 9, `concorrencia` 1) | 0 |
| dos quais, por `(não carrega)` | **4** | 0 |
| Q2 quente, nada alterado | **4 min 09 s** | < 1 min |
| Q2 quente, alterando só `server/` | a medir | ? |
| Q2 do zero | **31 min** | ~igual (o cache não participa) |

**A medição confirmou o modelo exatamente.** Com o repositório intocado, o Q2
reavaliou **14** defeitos — os mesmos 14 que têm captor de fecho universal, um a
um. Nenhum a mais, nenhum a menos. É o que dá confiança de que o alvo deste
bloco está certo: os 4 min da execução quente são, quase inteiros, esses 14
pagando o caminho completo (`portao` roda a suíte em caixa de areia; os
`(não carrega)` derrubam o carregamento e não nomeiam suíte).

A terceira linha é a que importa de verdade: é ela que descreve o dia a dia de um
bloco. Se ela não melhorar, o bloco não valeu — e o relatório tem que dizer isso
em vez de exibir as outras duas.

**Saída:** a **L-035** fecha, e o teto do cache sobe.

---

> ## T4 — o que ele fez, e o que ele recusou a fazer
>
> **Três disparos, três respostas, e a terceira é o que sustenta as outras:**
>
> ```
> execFile('node', ['tools/q8-worker.mjs', …])   resolvível     → soma o fecho DELE
> execFileSync('git', ['ls-files'])              binário externo → não é dependência
> execFile('node', [variavel])                   irresolvível    → continua TUDO
> ```
>
> O fecho segue o filho **e os imports dele**: `concorrencia` saiu de `TUDO`
> para 9 entradas, e entre elas estão `server/carteira.mjs` e `server/banco.mjs`,
> que o `q8-worker` importa. Somar só o arquivo do script reaproveitaria veredito
> de um filho que mudou por dentro — é o defeito `S224`.
>
> **O quarto caso não era processo filho, e só apareceu ao medir.** Quatro
> defeitos voltavam com captor `(não carrega)`: a mutação impede o módulo de
> carregar, a execução morre antes de qualquer teste, e nenhuma suíte é nomeada.
> Sem nome de captor não havia fecho de que depender. O fecho deles é o **arquivo
> mutado mais o arnês**, e é defensável — as duas únicas coisas que mudam essa
> resposta são o próprio arquivo e o modo como a pergunta é feita.
>
> **O que o bloco recusou a fazer.** Comando que não é `node` nem binário da
> lista continua `TUDO`; caminho vindo de variável continua `TUDO`; disparo que
> o leitor não consegue ler continua `TUDO`. Cinco defeitos plantados guardam
> exatamente essas recusas — porque num bloco que encolhe fecho, o perigo não é
> encolher de menos.

---

### T2 — A linha de base visual mais fina ✅

**Tam.** P · **Método** INV · **Portões** Q1 Q2 · **Depende de** V1.15 ·
**Trilha `T`** (ferramenta: só `test/` e `tools/`)

**Escopo:** o **D-010**. Fechado. O verbete em `docs/DEFEITOS.md` tem a medição
inteira; o resumo:

**A comparação passou a ser por REGIÃO** — a mesma digital de 32×32, comparada em
8×8 regiões de 4×4 px. A grade saiu de medição, não de escolha: duas capturas da
mesma interface dão pior média de região **0,38**, e o componente do V1.15 dá
**7,00** na mesma métrica. Dezoito vezes de separação; o limite de 2 fica no meio,
5× acima do ruído e 3,5× abaixo do sinal. O relatório passa a dizer **qual
região** — diagnóstico, não um número.

**Uma quarta largura**, `panoramico` 1920×1000, acima dos 1560 px em que o `.app`
para de crescer. Doze telas viraram dezesseis. O teste lê o `max-width` do CSS de
verdade, então quem subi-lo amanhã encontra o teste vermelho.

**O limite de pico saiu.** O plano era apertá-lo de 60 para 30; a sabotagem
mostrou que virara botão morto — a média da região trepida antes, e devolver o
pico a 60 não acendeu teste nenhum. O número ficou no relatório, o limite não.

**A sabotagem escreveu um teste.** `GRADE = 1` — a comparação de volta à tela
inteira — deixou o teste do componente do V1.15 vermelho mesmo assim: quem o
pegava era o pico. A grade estava passando sem prova, e ganhou o caso que só ela
pega: um bloco em Δ22, invisível ao portão antigo e média 22 na região.

**Saída (cumprida):** um componente inteiro na coluna lateral reprova a linha de
base — e um em paleta quase idêntica também.

> **O V1.15 deu ao T2 três provas a mais, todas achadas com o olho e nenhuma
> pelos portões:** um rótulo de texto transbordando o cartão (`CONQUISTADO` num
> cartão de 62 px), uma coluna inteira empurrada para fora da dobra por um
> `max-width` que ficou para trás no porte, e um campo de formulário estreito
> demais para o próprio placeholder. As três passaram por 299 testes verdes.
>
> **O portão Q5 prova que a página FUNCIONA; ele não prova que ela está
> LEGÍVEL.** São perguntas diferentes, e o T2 fecha só a primeira metade da
> segunda: ele mede *que* mudou e *onde*, não se ficou bom. Essa continua sendo
> a pergunta do crítico cego (Q7) e do `npm run olhar`.

---

### V1.16 — Trilha `R`: a tela principal reorganizada ✅

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 Q7 · **Depende de** V1.15

> **Os cinco blocos da trilha `R` viraram um.** R1 a R5 mexiam todos no mesmo
> arranjo — separá-los significaria cinco regravações de linha de base, cinco
> portões completos e quatro estados intermediários em que a tela ficaria pior
> que antes. O escopo continua um: **a tela principal é lida em três segundos**.

**A barra:** TESTE DOS 3 SEGUNDOS, medida pelo crítico cego (L-029) antes e
depois. É a mesma barra, aplicada duas vezes — é isso que a torna comparável.

---

#### O diagnóstico: o problema não era falta de espaço

Eram **cinco colunas de largura fixa** — 238 + 270 + 430 + 270 + 232 = 1440, ou
1496 com os vãos — dentro de um container de 1790. Elas quebravam **em cascata**:
abaixo de 1440 a coluna de colocação descia; abaixo de 1100 a **arena inteira**
saía da tela. O layout degradava por **amputação do centro**, e o centro é o
objeto da aposta.

O "espaço vazio" que aparecia não era sobra: era o rastro das colunas que tinham
quebrado para baixo.

#### O arranjo: três zonas que reflowam

```
FAIXA fixa    [avatar]  APOSTAS · 29s ▓▓▓▓░░ · 1.000 PC · R$ 100,00
┌────────────┬──────────────┬─────────────┐
│  AÇÃO 300  │  ARENA 430   │ LUTADORES   │  = 1070 (1098 com os vãos)
│  fichas    │  canvas 3:4  │  340        │
│  controles │  teto 54vh   │  OS DOZE    │
│  ticker    │              │  prob · odd │
│  → na luta │              │  → na luta  │
│  SEU       │              │  vira       │
│  LUTADOR   │              │  COLOCAÇÃO  │
└────────────┴──────────────┴─────────────┘
≤1130: uma coluna — arena, ação, lutadores. A arena ganha teto de altura
       para que o que vem depois comece dentro da tela.
```

**Cabe em 1100**, que era a largura onde o layout antigo perdia a arena.

#### As cinco mudanças, e o que cada uma comprou

**1 · Faixa de estado.** Fase, relógio e saldo, fixos no topo, em toda largura.
O relógio era um sufixo de ~7 px (`QUEM VENCE? — 29s`) **dentro do canvas**, sem
barra e sem rótulo — o menor texto de uma tela com tipografia display sobrando em
cinco lugares. A fase tinha quatro pistas espalhadas e **contraditórias**: o
rótulo `APOSTAS`, a pílula "Escolha seu lutador!", o banner dizendo "ASSISTINDO
ESTA RODADA" (o oposto) e um botão "Iniciar rodada" sugerindo que nada começara.

> **O número grande e a barra não são pressão — são o contrário dela.** Prazo
> previsível reduz ansiedade: quem sabe que tem 23 segundos decide com calma,
> quem não sabe decide com medo ou é surpreendido. O vermelho abaixo de 10 s é o
> aviso que permite **desistir** a tempo, não o que apressa a apostar. Proteção
> do jogador é requisito (cap. 28), e aqui ela se cumpre mostrando mais.

**2 · Uma lista, com os doze, e com a PROBABILIDADE.** Eram **três** listas dos
mesmos doze lutadores: `ODDS AO VIVO` (12 linhas, não clicável), o cartão
`QUEM VENCE?` (clicável, **8 linhas**, sem dizer que faltavam quatro) e `ABATES`.
A mais visível não era a acionável.

> **A mudança que mais importa do bloco:** o `p 5,96 % ± 1,01 %` por lutador —
> que o §4.4.5 já calculava e gravava no registro — só aparecia no **painel de
> ADM**. A tela do cliente mostrava "100 %" em doze linhas, que é vida e não
> chance, e lê como defeito. Vendíamos odd auditável e escondíamos a auditoria
> de quem aposta. Agora a chance e a margem de erro estão na linha de cada
> lutador, ao lado da odd.

**3 · "Seu lutador" durante a luta.** São ~30 s sem nenhuma ação disponível, e a
zona de ação mantinha ali as fichas, o campo de valor e a frase "escolha um
lutador na arena durante a fase de apostas" — controles mortos na coluna nobre.
Agora vira o cartão do seu lutador: retrato, vida, posição em texto e retorno.

**4 · O desenvolvimento saiu da tela do jogador.** `DEV`, o hash do commit, o
aviso do `battle-theme.mp3` e o botão "+1.000 de teste" foram para trás do PIN.
Um botão que cria dinheiro do nada ao lado do saldo é o oposto do que a
proveniência do §5.5 promete, mesmo em moeda simulada.

**5 · Reflow, não amputação.** Abaixo de 1130 as três zonas viram uma coluna na
ordem da decisão — ver a arena, escolher, apostar —, com teto de altura no canvas
para que a lista comece dentro da tela.

#### O equilíbrio de altura, que é de onde vinha o vazio

Depois de juntar as colunas, a do meio ficou com quase o dobro da altura das
outras: canvas 573 px + HUD + ticker + botões. **Duas mudanças fecharam a
diferença** — os controles da rodada foram para a zona de ação (que é o que eles
são) e o ticker do log foi junto; a arena ganhou teto de `min(54vh, 510px)`.

---

#### O vazio, medido — e a segunda passada do crítico

A primeira versão do arranjo ainda reprovava, e o crítico mediu por pixel em vez
de estimar: em 1920, as calhas laterais somavam **800 px (41,7 % da largura)** e
o rodapé outros 220 — **metade do viewport era fundo**. Em 1100 eram **640 px de
1100 (58 %)**, e era esse desperdício que empurrava a lista de odds para fora da
tela: nota **0** em "em quem eu aposto".

A causa era minha: pus três colunas de largura fixa num container de 1120 px, o
que é *um container centrado que ignora a viewport* — não um layout responsivo.

**Três correções, e as três vieram da medição:**

| | antes | depois |
|---|---|---|
| Colunas | `300px 430px 340px` em 1120 | `minmax()` em `fr`, até 1560 |
| Canvas | travado em 427 px, **cortado** na vertical | cresce com a altura, `min(72vh, 760px)` |
| Colapso | 1130 px | 1000 px — em 1100 as três ainda cabem |

**E a tipografia estava invertida.** Medido: saldo 17 px, "QUEM VENCE?" 14,
timer 11, **probabilidade 6, multiplicador 5**. A carteira era renderizada 3,4×
maior que o preço — a interface dizia "o importante é quanto você tem", não "o
importante é o preço". Probabilidade e odd passaram a ser os maiores números da
linha.

**Duas correções de proteção do jogador entraram junto**, e nenhuma é cosmética:
a ficha **"Tudo" é all-in** e tinha o mesmo tamanho, a mesma cor e a mesma borda
que "50", sem confirmação — agora tem as duas coisas; e as duas instruções da
tela se contradiziam ("escolha na arena" × "escolha na lista →", com a seta
apontando para o lado errado em uma coluna).

---

**MEDIDO NO FECHAMENTO**

```
suíte      300/300 com navegador, estável em 2/2 execuções
sabotagem  94/94
telas      quatro larguras, zero rolagem horizontal, zero erro de página
calhas     1920: de 800 px para ~180 · 1100: de 640 px para 0
```

**Q2 · o S89 foi REALVADO, e o motivo é o desenho ter melhorado.** Ele plantava
"a ordem de quedas deixa de vir do gancho do abate", contando com a conferência
do fim para corrigir — mas a lista única passou a derivar a colocação
**diretamente dos eventos**, e o alvo deixou de existir. O risco novo é pior, e é
para ele que o defeito aponta agora: derivar dos eventos **inteiros** em vez de
só os já reproduzidos faz a lista mostrar a colocação final durante a luta. Não é
desalinhamento de tela — é **vazar o vencedor**, no produto cujo §4.5 existe para
provar que o resultado não era conhecido antes.

**Q7 · o crítico cego avaliou duas vezes, com a mesma barra.** É a única forma
de a nota significar alguma coisa: barra que muda entre as medições compara
coisas diferentes.

**Fixtures:** `visual-base.json`, regravada — a tela da arena mudou de arranjo de
propósito, e é a maior mudança visual desde o V1.13.

---

---

# FASE 1 — V1 Arena Online

Objetivo: servidor autoritativo e produto multiplayer. Fase mais longa, e a única em que proteção do jogador é requisito de entrega. É também onde Q6 deixa de ser formalidade: a partir de F1.1 existe superfície exposta.

### F1.1 — Esqueleto do backend e contrato de API ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 · **Depende de** F0.10

**Escopo:** serviço mínimo, contrato de API versionado, health check, configuração por ambiente, e o motor da Fase 0 rodando no servidor com resultado idêntico ao do cliente.

**Sabotagem:** deixar servidor e cliente em versões diferentes do motor (o teste de paridade precisa pegar); aceitar requisição sem versão de API declarada.

**Q6:** cabeçalhos de segurança, CORS restrito, nenhum segredo em variável exposta ao cliente, mensagem de erro sem stack trace. Varredura de dependências no CI.

**Saída:** paridade motor cliente/servidor provada; contrato publicado.

---

### F1.2 — Banco, migrações e modelo V1 ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F1.1

**Escopo:** as sete tabelas do §5.13 mais as três do capítulo 28 (`player_limits`, `self_exclusions`, `responsible_play_events`) e os campos novos em `users` e `bets`. Migrações reversíveis.

**Sabotagem:** remover uma constraint e verificar que o teste de estado impossível cai; migração que não desce limpa; permitir saldo negativo no esquema.

**Q6:** consulta parametrizada em todo caminho; nenhum campo de usuário concatenado em SQL; permissão mínima para a conta de aplicação.

**Saída:** esquema aplicado; seed de desenvolvimento reproduzível.

> Criar as tabelas de proteção agora, mesmo que só sejam usadas em F1.8. Adicionar coluna em tabela com dados de produção é o caro.

---

### F1.3 — Autenticação real ✅

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 · **Depende de** F1.2

**Escopo:** substituir o PIN local. Cadastro, login, sessão, recuperação. Data de nascimento obrigatória e imutável (§28.2), bloqueio abaixo da idade mínima, conta congelada em vez de apagada.

**Sabotagem:** aceitar data de nascimento abaixo da idade mínima; permitir edição da data pelo usuário; contornar o bloqueio recriando cadastro com o mesmo e-mail.

**Q6:** fixação de sessão, enumeração de contas pela mensagem de erro, diferença de tempo entre usuário existente e inexistente, força bruta sem limite, token de recuperação reutilizável ou sem expiração, hash de senha com custo adequado.

**Q5:** telas de cadastro e login nos dois temas; a mensagem de bloqueio por idade precisa ser clara e não sugerir contorno.

**Q7 (GL):** barra = fluxo de cadastro de um produto nomeado com verificação de idade. Só o fluxo e a clareza; a regra é INV.

**Saída:** nenhum caminho de aposta acessível sem sessão válida e idade declarada.

---

### F1.4 — Wallet ledger no servidor ✅

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q8 · **Depende de** F1.3

**Escopo:** a API de F0.9 passa a falar com o servidor. Ledger append-only com os 24 tipos do §5.5, buckets de proveniência, reserva e liberação, idempotência por chave.

**Sabotagem:** repetir a mesma chave de idempotência e verificar que não duplica; fazer payout converter PC-B em PC-T; aceitar valor negativo; permitir que a soma do ledger divirja do saldo; remover o `stake_breakdown` do ticket.

**Q8:** cem reservas concorrentes sobre o mesmo saldo; settlement paralelo do mesmo ticket; nenhuma duplicata, nenhum saldo negativo.

**Q6:** IDOR — ler ou movimentar a carteira de outro usuário; estouro de inteiro no valor; arredondamento que cria valor; injeção no campo de memo.

**Saída:** invariantes financeiras do §16.4.1 verdes sob carga concorrente.

---

### F1.5 — Round scheduler autoritativo ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F1.4

**Escopo:** o servidor passa a ser dono do relógio e do ciclo — gera `roundSeed`, calcula odds, publica `commit`, abre e fecha a janela, simula, distribui. O cliente perde o direito de iniciar rodada.

**Também resolve:** L-023 (corrigir o viés de convexidade do estimador, hoje medido em 2,49 % no pior perfil e publicado no registro, mas não corrigido).

**Sabotagem:** deixar o cliente enviar `roundSeed` e o servidor aceitar; permitir que o cliente peça a próxima rodada; expor o resultado antes do fechamento em qualquer resposta da API.

**Q6:** nenhum campo de resposta durante a janela de aposta pode conter informação derivada do resultado — testar o payload inteiro, não só os campos documentados.

**Saída:** a rodada existe e conclui sem nenhum cliente conectado.

---

### F1.6 — Transporte realtime, sala e reconexão ✅

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q6 Q8 · **Depende de** F1.5

**Escopo:** §5.8 e §5.9 — todos veem a mesma rodada no mesmo instante; quem chega atrasado pula para o momento atual; queda e volta recuperam o estado.

**Sabotagem:** dessincronizar relógios em 5 s e verificar a convergência; forjar mensagem de outro usuário; reconectar no meio da batalha e receber estado de rodada errada.

**Q8:** o número alvo de conexões simultâneas; queda em massa e reconexão em rajada.

**Q6:** assinar canal de outro usuário; inundar o socket sem limite; mensagem malformada derrubando o processo; ausência de autenticação no handshake.

**Saída:** rodada compartilhada estável na carga alvo.

---

### F1.7 — Aposta, lock e settlement ✅

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q8 Q9 · **Depende de** F1.6

**Escopo:** §5.6 — uma posição por usuário, troca livre antes do lock, odd congelada no ticket, nada aceito após o lock do servidor, settlement atômico e idempotente. Tetos de F0.8 aplicados no servidor.

**Sabotagem:** aceitar aposta 100 ms após o lock; pagar usando odd diferente da registrada no ticket; pagar duas vezes; aceitar odd enviada pelo cliente.

**Q8:** settlement concorrente da mesma rodada por dois processos.

**Q6:** replay do pedido de aposta; TOCTOU entre validação de saldo e reserva; adulteração de odd e de valor no cliente; apostar em nome de outro usuário.

**Q5:** tela de aposta e de resultado nos dois temas, incluindo o estado de mercado fechado por passivo.

**Q7 (GL):** barra = o Reels original do `pokebet.arena`, que é a referência que deu origem ao projeto. Comparação de ritmo e legibilidade do ciclo apostar → assistir → resultado.

**Saída:** ciclo econômico completo ponta a ponta no servidor.

---

> ## F1.1 a F1.7 — o ciclo econômico fechou no servidor
>
> **Sete blocos, uma sessão.** O que mudou de fato: até aqui o cliente iniciava a
> rodada, sorteava a semente, calculava o preço e guardava a carteira. Agora o
> servidor faz as quatro coisas, e o cliente perdeu o direito de pedir a próxima
> rodada.
>
> **Zero dependências continua valendo no backend.** `node:http` para o serviço,
> **`node:sqlite`** para o banco (embutido desde o Node 22.5), `node:crypto` para
> senha, token e commit. Nenhum `node_modules`.
>
> **SSE e não WebSocket**, e a escolha está declarada em `server/transporte.mjs`:
> o Node não traz servidor WebSocket, o tráfego aqui é de uma via, e SSE traz de
> graça a reconexão automática e o `Last-Event-ID` que o §5.9 pede.
>
> **As duas invariantes do §4.6 que a suíte listava como "ainda não
> verificáveis" saíram da lista** — *payout ocorre uma única vez* e *aposta
> fechada não pode ser alterada*. A lista ficou vazia, e ela continua no código
> vazia de propósito: apagá-la esconderia que já teve conteúdo.
>
> **O F1.5 fechou a L-023 e derrubou a premissa dela.** A lacuna dizia que o
> viés de convexidade valia 2,49 % da odd e era sempre a favor do apostador. A
> medição contra simulação de referência achou duas coisas erradas: a fórmula
> publicada estava com a escala errada por um fator de ~60 na cauda, e o viés
> observado é **negativo** — a suavização de Laplace já o absorve. **A correção
> analítica NÃO foi aplicada**, porque empurraria a odd na direção errada.
>
> **O que os testes acharam, e o código não teria achado sozinho:**
> prazos de fase que se deslocavam quando um tick atrasava; uma chave de
> idempotência que impedia a segunda troca de aposta de devolver o dinheiro; o
> sinal do reservado invertido no `SUM` do ledger; e três testes meus frouxos
> demais, que a sabotagem reprovou antes de eu acreditar neles.
>
> **Aberto:** **L-032** — a idempotência tem duas redes e a suíte só alcança uma,
> porque `node:sqlite` é síncrono. Dono **F1.6**, e precisa de um arnês de Q8 com
> dois processos de verdade.

---

### F1.8 — Proteção do jogador: limites ✅

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q9 · **Depende de** F1.7

**Escopo:** §28.3 — os cinco limites, a assimetria (redução imediata, aumento com cooldown de 24 h e confirmação ativa), bloqueio efetivo no caminho de aposta, mensagem dizendo qual limite, quanto falta e quando volta.

**Sabotagem:** aplicar aumento de limite sem cumprir o cooldown; zerar limites no logout; deixar o limite valer só na interface e não no servidor; contar perda bruta em vez de líquida.

**Q6:** burlar o limite chamando a API direto; burlar trocando de dispositivo; burlar reinstalando; burlar criando conta nova (aqui só se detecta, a propagação é F1.9).

**Q5:** a tela de limites precisa ser alcançável em no máximo dois níveis a partir da carteira; a mensagem de bloqueio não pode oferecer caminho alternativo de gasto.

**Q7 (GL):** barra = a página de limites de um operador licenciado nomeado. Clareza e ausência de padrão escuro.

**Saída:** limites em produção, com evento de telemetria por bloqueio.

---

### F1.9 — Proteção do jogador: pausa, autoexclusão e risco ✅

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q9 · **Depende de** F1.8

**Escopo:** §28.4 a §28.7 — cool-off e autoexclusão irreversíveis, propagação por sinais de identidade, bloqueio de marketing, reality check, os sete sinais de risco com escala de intervenção, e a regra de honestidade do resultado.

**Sabotagem** — a lista mais importante da fase:
- fazer a tela de resultado comemorar retorno menor que a aposta;
- exibir o valor bruto no lugar do líquido;
- deixar uma notificação de marketing chegar a conta em autoexclusão;
- permitir que suporte encurte uma autoexclusão;
- deixar a autoexclusão cair no logout;
- disparar oferta de retenção no pedido de autoexclusão.

**Q6:** contornar a autoexclusão por conta nova, por API direta, por outro dispositivo; ler eventos de risco de outro usuário; adulterar o próprio `fraud_score`.

**Q5:** a tela de resultado é o coração do espetáculo do produto — capturar vitória, derrota e **retorno positivo menor que a aposta**, que é o caso que hoje não existe e é o que o bloco precisa acertar.

**Q9:** todos os eventos de proteção emitidos **sem amostragem**. Q9 falha se algum estiver amostrado.

**Q7 (GL):** barra = a seção de jogo responsável de um operador licenciado nomeado, comparando honestidade da comunicação, não estética.

**Saída:** os oito critérios de aceitação do §28.11 marcados.

---

> ## F1.8 e F1.9 — a proteção do jogador saiu do papel
>
> **O capítulo 28 tinha três tabelas vazias e nenhuma regra.** Agora tem
> `server/limites.mjs` (§28.3), `server/protecao.mjs` (§28.4 a §28.7) e
> `engine/resultado.mjs` (§28.5), com 55 testes e 27 defeitos plantados.
>
> **As duas garantias centrais são a MESMA garantia, e ela é uma ausência.** O
> cooldown de 24 h para aumentar limite e a irreversibilidade da autoexclusão
> não são conferências que recusam: são caminhos que não existem.
> `definirLimite` não tem por onde receber um prazo, e `protecao.mjs` não
> exporta nada que encerre uma pausa. O teste do F1.9 cobra a AUSÊNCIA da função
> — porque o F1.11 traz painel administrativo, e função exportada é convite.
>
> **A tela de resultado passou a perguntar outra coisa.** Era
> `S.myBet.idx === S.champ` — "acertei o campeão?". Virou `res.comemora` — "eu
> ganhei dinheiro?". São perguntas diferentes, e é a diferença entre elas que o
> §28.5 existe para nomear. **O caso que o BUILD_BLOCKS dizia "hoje não existe"
> existe:** `floor(30 × 1,03)` devolve exatamente 30, e a tela soltava confete.
> Uma terceira tela nasceu para ele — acertou e não ganhou —, sem festa e com o
> líquido em destaque.
>
> **A Spec foi corrigida no mesmo commit.** O §28.5 dizia "retorno menor que o
> valor apostado"; passou a dizer "menor **ou igual**". Confete em dinheiro de
> volta é a mesma perda disfarçada de ganho em dose menor.
>
> **O Q2 pegou dois testes meus que eram decorativos**, e os dois são a mesma
> classe de erro:
> - o teste do cooldown comparava `efetivoEm` com `agora + COOLDOWN_MS` — a
>   MESMA constante que a sabotagem encolhia. Vinte testes verdes e o cooldown
>   de 24 minutos passando. Agora a constante é comparada com o texto do §28.3,
>   como o `emissao.mjs` faz com o Estudo Econômico;
> - nada exercitava o caminho settlement → limite de perda. Testar
>   `registrarPerda` sozinho não prova que alguém a chama com o número certo, e
>   o defeito "lança o stake em vez do líquido" passou por dezenove testes.
>   **Testar a peça não testa o encaixe** — é a terceira vez que esta frase
>   aparece nestes documentos.
>
> **O teste de camadas pegou uma dependência invertida antes do navegador.** O
> §28.7 pede o retorno líquido ao lado da odd, e `odds.mjs` (camada 2) passou a
> precisar do valor da aposta, que morava em `carteira.mjs` (camada 4).
> `valorAposta` e `APOSTA_MIN` desceram para `banco.mjs` (camada 0) — a
> alternativa era recalcular a regra em dois lugares, e aí a lista prometeria um
> retorno que a caixa de aposta não confirma.
>
> **A varredura de SQL do F1.2 pegou o módulo novo.** `protecao.mjs` montava um
> `IN (?,?,?)` por interpolação para consultar o grupo de contas de uma pessoa.
> Trocado por uma consulta por conta — o grupo tem o tamanho de uma pessoa — em
> vez de afrouxar o padrão que reprovava.
>
> **Aberto, com dono:**
> - **L-033** — o backend inteiro existe e nada dele é alcançável por HTTP. O
>   `servidor.mjs` continua com as três rotas do F1.1. **Bloco novo F1.13**,
>   proposto neste commit: é por isso que o Q6 "burlar o limite pela API" e a
>   tela de limites do §28.7 não puderam sair aqui.
> - **L-034** — `recovery_deposit` e `odd_hour` estão na lista dos sete sinais e
>   não têm de onde medir. Um espera a compra de PC-T, o outro espera semanas de
>   histórico.

---

### F1.14 — O laço de jogo contra o servidor ✅

**Tam.** G · **Método** INV+GL · **Portões** Q1 Q2 Q3 Q5 Q6 Q8 Q9 · **Depende de** F1.13

**Por que ele existe:** o F1.13 foi escrito como um bloco só e não é. As rotas
são adição pura — nada do que existia mudou de comportamento, e a suíte passou
de 546 para 559 sem uma regressão. Trocar o laço de jogo é o oposto: `S.carteira`
sai de `localStorage` e passa a vir do servidor, a rodada deixa de ser sorteada
no cliente, e cada tela que mostra saldo passa a ter três estados onde hoje tem
um — carregando, carregado e sem rede.

**Escopo:** `app/modules/banco.mjs` passa a falar com `/api/carteira`; a rodada
vem do scheduler pela sala SSE do F1.6 em vez de `newRound()` local; aposta e
cancelamento vão por `/api/aposta`; e o app ganha o estado de reconexão que o
§5.9 descreve.

**O QUE TORNA ESTE BLOCO CARO, e precisa estar dito antes de começar:** a linha
de base visual inteira se refaz. Hoje ela fotografa um app que desenha saldo no
primeiro quadro; depois dele, o primeiro quadro não tem saldo nenhum. Não é
regressão — é a tela mudando de natureza —, e a regravação precisa vir com a
explicação no commit, como manda o `CLAUDE.md`.

**Sabotagem:** deixar o cliente sortear a própria rodada quando a rede cair;
aceitar saldo vindo do `localStorage` quando o servidor não responde; fazer a
reconexão perder aposta em andamento; deixar a tela mostrar saldo velho como se
fosse atual.

**Q6:** o cliente deixa de ser fonte de qualquer verdade econômica. Nenhuma
aposta, nenhum saldo e nenhuma odd pode sobreviver a `localStorage.clear()`.

**Q5:** as três telas novas que hoje não existem — carregando, sem rede, e
reconectando. O §5.9 pede que a reconexão não perca o que estava acontecendo.

**Q8:** duas abas do mesmo jogador contra o mesmo servidor. É a versão de
navegador do arnês de dois processos que a L-032 construiu.

**Saída:** `localStorage.clear()` não muda nada do que o jogador tem, e a
**L-036** fecha.

---

**FECHADO.** Critério de saída cumprido: `localStorage.clear()` não muda nada do
que o jogador tem. Suíte 644 VERDE com navegador.

**O que fechou o bloco não foi o código — foi um teste que não existia.** Os
cinco defeitos plantados do laço passaram por toda a suíte na primeira
sabotagem, porque moram dentro de `newRound`, `placeBet` e `finish`: funções que
só rodam com DOM. A suíte tinha 629 testes verdes e nenhum deles jogava.

A suíte `rodada-completa` joga: servidor de verdade com relógio controlado,
navegador de verdade com sessão de verdade, e o servidor de arquivos
encaminhando `/api/` para ter mesma origem — como em produção, onde o cliente é
servido pelo mesmo domínio. Ela achou **seis defeitos** que ninguém via:

| achado | por que escapou |
|---|---|
| a sala conectava sem sessão | `sala.mjs` não passa pela `api`, e o boot mandava `token: () => null` |
| quem entra com conta real caía na HOME | `sessaoAtiva()` só conhecia o PIN local do protótipo |
| a telemetria derrubava a página no 1º evento | `S.seeds.raiz` não existe durante a janela — é o §4.5 |
| o cliente lia `stake`, a rota devolve `valor` | contrato divergente entre duas peças corretas |
| **o cliente liquidava o que o servidor já liquidara** | os dois números coincidiam quase sempre |
| o próprio teste lia `dataset.fase`, que não existe | aprovava sem medir nada |

O quinto é o mais grave e o mais instrutivo. Duplo lançamento para a mesma
aposta, invisível porque as contas batiam — apareceria só no dia em que
divergissem, com o jogador vendo um saldo que não é o dele. Ele se revelou
porque o defeito plantado S259 **passava numa execução e era pego na seguinte**:
a instabilidade era o duplo lançamento acertando por acaso.

O sexto é o pior de todos como método: um portão que aprova por engano é pior
que portão nenhum, porque no ausente ninguém confia.

**Duas correções de método vieram junto.** O teste apostava num lutador
qualquer, e aposta perdedora torna o defeito invisível — o saldo pós-settlement
é igual ao pós-aposta. Ele passa a apostar no campeão, e o settlement sempre
credita. É o **D-021** noutra roupa: teste cujo poder depende do sorteio é teste
instável. E o `portao` cobrou que a passada com navegador da sabotagem incluísse
as suítes novas, senão defeito que só elas pegam volta `PASSOU` — o portão
dizendo "ninguém pega" quando a verdade é "ninguém perguntou".

**Deixou aberto:** a **L-039**, que o **F1.16** fecha.


### F1.17 — O operador do painel prova quem é ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 · **Depende de** F1.11
· **BLOQUEIA a exposição do painel em rede aberta**

**Por que ele existe:** proposto no F1.11, ao fechar a **L-041**. Aquele bloco
construiu autorização, auditoria e confirmação; o operador ainda chega num
cabeçalho `x-operador` com o próprio id, e o servidor confia.

Construir meia autenticação junto teria sido pior que nenhuma — ela pareceria
proteção. Autenticação de operador precisa de credencial separada da do jogador,
segundo fator e rotação, e cada uma é decisão de produto.

**Escopo:** credencial própria por operador, segundo fator, expiração e rotação
de sessão administrativa, e registro de login de operador na mesma auditoria que
já existe.

**Critério de saída:** um id de operador vazado não abre nada.

**Sabotagem declarada:**
- aceitar a sessão do JOGADOR como credencial de operador
- sessão administrativa sem expiração
- login de operador fora da auditoria — quem entrou é a primeira pergunta
- distinguir "senha errada" de "operador não existe", que é o enumerador do §5.11

**FECHADO.** Critério de saída cumprido: o teste manda o id do operador como
token — e ele aparece em toda linha de auditoria — e cobra que não abra nada.
Suíte 719 VERDE com navegador; oito defeitos plantados, os oito vermelhos.

**As três defesas, e o que cada uma custa ao atacante:**

| | |
|---|---|
| senha | scrypt, os mesmos parâmetros do jogador |
| TOTP | um código de 30 s que não viaja pela rede do produto |
| expiração | 8 h de vida, rotação a cada 30 min |

Nenhuma resolve sozinha: senha vaza em lista, TOTP sozinho é um número de seis
dígitos, sessão eterna transforma terminal esquecido em acesso permanente. As
três juntas exigem senha, aparelho **e** janela de tempo.

**Duas decisões que o bloco tomou e vale registrar.** A tabela de sessão é
SEPARADA da do jogador — se fosse a mesma, um vazamento de sessão de jogador
viraria acesso administrativo, e o raio do incidente passaria de uma conta para
todas. E o código do segundo fator fica guardado na sessão que ele abriu, para
não abrir uma segunda dentro da mesma janela: quem vê o número por cima do
ombro o reusaria.

O HMAC-SHA-256 é construído sobre o `engine/hash.mjs` do F1.15 — o SHA-256 que
já existia por outra razão pagou o segundo fator de graça.

---

## FASE 1 — o que ela fechou

**Portão Q2: VERDE, 283/283 detectados.** Suíte: 705 testes, verde com
navegador. Todos os blocos de F1.1 a F1.15 construídos; o **F1.12** é o único
parcial, e a parte que falta não é software.

**Os números do portão, medidos no fecho:**

```
Q2 do zero                          68 min   (283 defeitos)
Q2 depois de mexer em UM arquivo     3 min 40 s
reaproveitados                     246 de 283
```

O portão cresceu de 208 para 283 defeitos e a execução quente **encolheu**. É a
tese do cache de veredito: custo proporcional ao tamanho da mudança, não ao do
projeto.

**O que a Fase 1 aprendeu, e não estava no roteiro:**

| lição | onde ela apareceu |
|---|---|
| `PEGOU` falso esconde o que de fato escapa | D-015, e de novo no D-023 — três defeitos de proteção estavam verdes por acidente |
| testar a peça não testa o encaixe | sete vezes; a sétima foi `RESCUE_GRANT` fora da lista do ledger |
| teste cujo poder depende do sorteio é teste que às vezes não testa | D-021, e mais duas reincidências |
| diagnóstico bom sobrevive a correção errada | o teto do D-022 estava errado; o número que ele mandou imprimir achou o D-023 |
| mutante equivalente é ruído que faz o portão mentir | L-038, cinco ocorrências |

**O que fica aberto, e nenhuma das três é código:**

- **L-042** — 76 desenhos. Bloqueia a troca de `ID_ESCOLHIDO`, que é o critério
  de saída do F1.12 e o fim formal da Fase 1.
- **L-012** — consulta de enquadramento regulatório (§0.5.1). Bloqueia a tag.
- **L-010** — política de publicidade e afiliados. Sem dono.

**Propostos durante a fase e ainda não construídos:** F1.16 (o cliente não é
fonte de dinheiro nem por um instante) e F1.17 (o operador do painel prova quem
é — enquanto não existir, o painel só pode ser exposto em rede fechada).

---

### F1.16 — O cliente não é fonte de dinheiro nem por um instante

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q6 · **Depende de** F1.14

**Por que ele existe:** proposto no F1.14, ao fechar a **L-039**. O boot chama
`atualizarSaldo()` antes de `ligarModoServidor()`, e `atualizarSaldo` chama
`carregar()` — que cria a carteira local com o crédito de boas-vindas. A
projeção do servidor sobrescreve tudo logo em seguida, então **não custa
dinheiro hoje**; o que custa é uma exceção no teste.

O teste `em modo servidor o cliente NÃO escreve dinheiro no armazenamento`
precisou excluir o `WELCOME_GRANT` para poder afirmar o resto, e toda exclusão
dessas é uma janela: o próximo lançamento de boot passa por ela sem ninguém
notar.

**Escopo:** a fachada `banco.mjs` passa a saber que, em modo servidor, ela não é
fonte — em vez de cada chamador de `carregar()` lembrar de perguntar. É a mesma
forma do `modoServidor()` no `aposta.mjs`: a bifurcação mora num lugar só.

**Critério de saída:** o teste da rodada completa afirma o ledger local VAZIO,
sem exceção nenhuma na lista.

**Sabotagem declarada:**
- o boot voltar a criar carteira local com sessão ativa
- `carregar()` passar a ser fonte quando o `hidratar()` falha — silêncio não é
  permissão para inventar saldo, é a mesma regra da rodada
- a exceção do `WELCOME_GRANT` voltar para o teste

---

### F1.15 — A raiz da rodada sai de 32 bits ✅

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 Q6 · **Depende de** nada
· **BLOQUEIA A TAG DA v0.9** · **VEM ANTES da segunda metade do F1.14**

**A ordem é decisão, e o motivo é concreto.** A metade que falta do F1.14 é o
cliente lendo `revelado.raiz` e reconstruindo a rodada a partir dela. Construir
isso em cima de uma raiz de 32 bits que este bloco vai trocar por 128 é
retrabalho garantido: muda o tipo, muda a serialização, muda toda fixture que o
cliente compara. O F1.14 fica na primeira metade — que é inerte e está verde —
até este fechar.

**Por que ele existe:** o **D-018**. Com a janela de aposta aberta dá para saber
o campeão, usando só o que a rota pública devolve. A raiz tem 32 bits, a pool
publicada de doze lutadores entre 76 carrega ~74 bits de informação sobre ela, e
a busca é embaraçosamente paralela — 59 min num núcleo de JS, medido, e de UMA
vez, porque o mapa não depende da rodada.

O commit-reveal está implementado certo e é decorativo: ele prova que a casa não
trocou o resultado depois, e a ameaça é o apostador saber antes.

**Escopo:** a raiz passa a ter 128 bits. Os cinco ramos do §P3 continuam de 32 —
o que quebra hoje não é a largura do ramo, é os cinco descerem de um segredo
varrível. `derivar()` passa a ser um hash de verdade, **síncrono e sem
dependência** (o `comprometer()` já usa SHA-256, mas é assíncrono; aqui não pode
ser, porque `derivar` roda dentro do laço de quadro).

**Alcance medido, e ele é menor do que parece.** Levantado lendo o repositório
antes de escrever qualquer linha:

```
engine/seed.mjs          novaRaiz, derivar, derivarIndice, sementes
server/scheduler.mjs     `randomInt(0, 0xFFFFFFFF)` — a raiz do servidor
app/modules/fases.mjs    `sementes(novaRaiz())` — a raiz do cliente
server/rotas.mjs         `?raiz=` da rota de preço, hoje `inteiro()`
banco                    `round_seed_reveal` já é TEXT — não muda
test/semente.mjs         avalanche, unicidade, 20.000 raízes distintas
test/commit.mjs          `abrirRodada(novaRaiz())`
test/rodada-digital.mjs  `digital(raiz)`, a paridade do F1.1
```

**O que NÃO é alcançado, e isto é o que derruba o bloco de G para M:**

- **`test/fixtures/golden.json` não tem raiz nenhuma.** Ele fixa SEMENTES DE
  BATALHA, que continuam de 32 bits — `simular(f, seed)` não muda. Os 20 goldens
  byte a byte seguem valendo sem regravação.
- **`margem.json`, `precisao.json`, `informacao.json`, `baseline.json` são
  agregados**, não raízes fixadas. Os ramos continuam uniformes em 32 bits, então
  a distribuição não se move. Se um deles mudar, é sinal de que o `derivar` novo
  tem viés — e aí o número novo vai na mensagem do commit, ao lado do antigo,
  como manda o `CLAUDE.md`.

**O caminho quente exige cuidado, e ele tem número.** `derivarIndice(raiz,
'simulacao', i)` é chamado **154.000 vezes por rodada** dentro do
`engine/preco.mjs`. Trocar isso por 154.000 SHA-256 seria trocar milissegundos
por segundos no cálculo de odd. A saída é que o hash caro roda **uma vez por
ramo** — `derivar(raiz, rotulo)` memoizado — e a expansão por índice continua
sendo a mistura barata de hoje. Seguro: os 154.000 não são segredo, eles só
precisam ser bem espalhados, e o que precisa ser imprevisível é a raiz.

**O que NÃO está no escopo:** trocar o gerador da batalha. O `rng` de 32 bits
dentro da simulação continua — ele não é segredo, ele é reprodutibilidade.

**Sabotagem:** deixar a raiz nova caber em 32 bits em algum caminho (a coluna, o
JSON, o `>>> 0` esquecido num lugar); fazer dois ramos coincidirem para raízes
diferentes; fazer o `derivar` novo perder a avalanche; deixar a rodada publicada
antiga deixar de ser recalculável — a auditoria do §25.2 não pode quebrar
retroativamente.

**Q4:** a regressão estatística inteira roda de novo. Raiz nova é distribuição
nova, e "parece igual" não é medida.

**Q6:** o teste que fecha o bloco é o ataque do D-018, escrito como teste e
esperando FALHAR: dada a pool publicada, não existe busca que devolva a raiz.

**Saída:** o D-018 fecha, e o item entra na lista de saída da v0.9 ao lado do
L-012.

---

### F1.10 — Perfil, desafios e login streak

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q9 · **Depende de** F1.9

**Escopo:** §5.10 — migrar perfil, XP, medalhas e desafios para o servidor. Trilha de login de 7 dias com teto de emissão de PC-B. `rescue grant` com a regra de valor fixo do §28.8.

**Sabotagem:** fazer o `rescue grant` escalar com a perda; emitir acima do teto; conceder o grant a conta em cool-off; permitir reivindicar o mesmo desafio duas vezes.

**Q6:** reivindicar recompensa de outro usuário; forjar progresso de desafio pelo cliente; farmar login streak manipulando fuso horário.

**Saída:** progressão sobrevive a limpar o navegador; teto de emissão respeitado.

---

### F1.11 — Admin, telemetria e painel econômico

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F1.10

**Escopo:** §5.11 e capítulo 17 completo, incluindo o bloco de proteção sem amostragem. Painel de política monetária do §10.9 com as séries de exposição do §5.1 do Estudo Econômico.

**Sabotagem:** amostrar um evento de proteção; deixar o painel calcular saldo fora do ledger; permitir ação administrativa sem registro de operador.

**Q6:** o painel admin é a superfície de maior valor do sistema — autenticação separada, autorização por papel, nenhuma ação destrutiva sem confirmação e registro, nenhuma rota admin alcançável sem papel.

**Q9:** todo evento com campos obrigatórios; o painel reconstrói faucets, sinks e passivo a partir do ledger.

**Saída:** dá para responder "a economia está saudável?" olhando uma tela.

---

### F1.12 — ContentPack original ⚠️ SOFTWARE FECHADO · ARTE ABERTA

**Tam.** G · **Método** GL · **Portões** Q1 Q2 Q5 Q7 · **Depende de** F1.11

**Escopo:** o pack de criaturas originais do §0.3.1 passa a existir e ser jogável. O pack Kanto vira ferramenta interna.

**Sabotagem:** deixar um identificador da franquia hard-coded fora do pack; fazer o jogo cair para o pack Kanto em caso de falha de carregamento (o resgate busca o mesmo pack em outro endereço, nunca outro pack — é a lição registrada na v0.6.1).

**Q5:** o jogo inteiro capturado nos dois packs, mesmas telas, mesmos temas.

**Q7 (GL):** barra = a apresentação de elenco e identidade visual de um jogo de criaturas nomeado e lançado. É o bloco mais puramente GL do projeto: a correção é trivial, a qualidade é tudo.

**Saída:** as duas primeiras coortes de retenção medidas no pack que será lançado. **Fim da Fase 1.**

---

**SOFTWARE FECHADO. ARTE ABERTA — e a divisão é literal.**

O pack `original_v1` existe, é válido e joga: 76 criaturas com nomes autorais,
oito tipos numa roda fechada, golpes, climas, moeda e rótulos. Medido: 300
rodadas, zero sem vencedor, 73 vencedores distintos.

**A roda tem OITO tipos, e não dezoito.** Copiar a tabela de dezoito seria
copiar o desenho de jogo da franquia mesmo trocando os nomes. A roda dá por
FORMA a propriedade que a tabela grande só alcança por ajuste manual: cada tipo
é forte contra dois e fraco contra dois, então nenhum é dominante e nenhum é
lixo. E cada relação tem leitura óbvia — brasa queima seiva, seiva se espalha no
sopro, sopro dispersa carga, carga funde liga, liga lasca pedra, pedra afunda no
mare, mare apaga o véu, véu abafa brasa.

**A distribuição de força é herdada de propósito.** Os totais de base stats são
os mesmos percentis do elenco medido — 288 / 490 / 600. Margem, ruína e precisão
de odd foram medidas sobre aquela distribuição, e trocar de tema não pode trocar
o jogo. O RECORTE entre os seis stats é sorteado: copiar o recorte também seria
copiar o balanceamento, e aí o pack seria uma renomeação com passos a mais.

**A varredura achou nove vazamentos, e é a razão do item nº 1 de sabotagem:**

| onde | o que era |
|---|---|
| `app/index.html` | a marca, o texto do "como funciona", dois títulos de seção |
| `app/modules/desafios.mjs` | as frases dos desafios diários |
| `app/modules/customizacao.mjs` | o avatar padrão, que só existe num pack |
| `server/rodada.mjs`, `app/modules/motor.mjs` | o import do pack, nomeado |
| `server/scheduler.mjs` | a versão gravada na rodada |

Todos fechados. O pack passa a DIZER como as coisas se chamam (`rotulos`, agora
exigido pelo contrato), e `content/escolhido.mjs` é o único arquivo fora de
`content/` que pode nomear um pack.

**A L-021 fechou no caminho.** O motor exigia um pool de golpes chamado
literalmente `normal` — tema vazando para o motor, e o pack original não tem
tipo genérico. O pack declara qual dos seus pools é o de reserva.

**Sem fallback, e com teste de comportamento.** `resolver(id)` é função e não
constante justamente para dar para perguntar "e se não existir?" sem quebrar o
processo — teste que lê fonte não prova comportamento. Sem arte, a criatura
mostra silhueta procedural nossa; nunca um endereço externo.

**O que fica aberto:** a **L-042**. Faltam 76 desenhos, e por isso `ID_ESCOLHIDO`
continua no pack de desenvolvimento — lançar com 76 silhuetas trocaria um risco
comercial por um problema de produto. **A troca é UMA LINHA**, e essa era a
promessa da Content Layer.

Os portões **Q5 e Q7 deste bloco ficam abertos com ela**: os dois precisam de
tela com arte para julgar. Q1, Q2 e o contrato estão fechados.


### F1.13 — A montagem do serviço: as rotas e o cliente ligado ✅

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q8 Q9 · **Depende de** F1.9

**Por que ele existe:** proposto no F1.8, ao fechar a **L-033**. Do F1.3 ao F1.9
foram construídos autenticação, carteira, scheduler, transporte, aposta, limites
e proteção — e o `servidor.mjs` continua com as três rotas do F1.1. Cada bloco
fez a sua peça e nenhum tinha a montagem no escopo; o roteiro ia do transporte
direto ao perfil. É a lacuna mais cara da fase justamente por não ser de
ninguém.

**Escopo:** as rotas de `/api/auth`, `/api/carteira`, `/api/rodada`,
`/api/aposta`, `/api/limites` e `/api/protecao` sobre os módulos que já existem;
a sala SSE do F1.6 pendurada no servidor; sessão por cabeçalho em todas elas; e
o cliente falando com o servidor no lugar de `app/modules/banco.mjs`. As telas
de limites e de autoexclusão do §28.7 saem aqui — "acessíveis a partir da
carteira e do perfil", em no máximo dois níveis.

**Sabotagem:** aceitar rota sem sessão; aceitar a odd vinda do corpo do pedido;
deixar uma rota nova nascer sem a conferência de versão do contrato; deixar o
limite ou a pausa valerem só na tela e não na rota; devolver `stack trace` numa
resposta de erro.

**Q6:** é o bloco que abre a superfície inteira. Burlar o limite chamando a rota
direto; contornar a autoexclusão por API; ler carteira, aposta ou eventos de
proteção de outro usuário; enumerar conta pela diferença de resposta do login.
São os Q6 que o F1.8 e o F1.9 não puderam exercer por não haver rota — e cada
garantia precisa do teste na ROTA, porque rota nova é caminho novo.

**Q5:** o jogo inteiro passa a depender da rede. Capturar o app com o servidor
no ar, com ele fora do ar, e durante uma reconexão.

**Q9:** os eventos que hoje nascem no cliente passam a ter destino; nenhum
evento de proteção pode ser amostrado no caminho.

**Saída:** as rotas existem, as telas de proteção do §28.7 existem, e a
**L-033** fecha na parte que era dela: o backend deixou de ser inalcançável.

**O bloco foi PARTIDO EM DOIS durante a execução, e a divisão está registrada
na L-036.** Ele foi escrito como um bloco só — rotas mais cliente — e as duas
metades têm risco diferente demais para caberem juntas: as rotas são adição
pura (nada do que existia mudou de comportamento), e trocar o laço de jogo do
armazenamento local pelo servidor muda TODA tela que mostra saldo, refaz a
linha de base visual inteira e cria os estados de rede que o app nunca teve. A
segunda metade é o **F1.14**.

---

# FASE 2 — V2 Mercados Mútuos e Previsão

**Gate de entrada:** seção 12.

Objetivo: dar teto de habilidade ao produto. Hoje `EV = p × (1/p) × (1-margem)` — o `p` cancela e toda aposta rende o mesmo, medido em 0,89 a 0,93 com a amplitude inteiramente explicada por ruído. Esta fase cria o lugar onde ler melhor paga.

**Invariante da fase:** o preço do modelo para mercado mútuo só é publicado **depois** da liquidação. Publicar antes faz o bolo convergir para ele e a habilidade desaparece — é o modo de falha que mata a fase inteira.

### F2.1 — Motor de apuração mútua

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q8 · **Depende de** F1.12

**Escopo:** bolo por mercado e por rodada, taxa da casa retirada do bruto, rateio proporcional entre acertadores, liquidação atômica e idempotente. Reaproveita o ledger de F1.4 com tipos novos. Casa não toma posição em nenhum momento.

**Sabotagem:** pagar mais que o bolo; retirar a taxa duas vezes; deixar o rateio somar diferente do bolo líquido; aceitar entrada após o fechamento; liquidar duas vezes o mesmo bolo.

**Q3:** `soma dos pagamentos + taxa == bolo bruto`, sempre, sem exceção de arredondamento — o resíduo de divisão vai para um destino declarado, nunca some.
**Q8:** cem entradas concorrentes no mesmo bolo; liquidação paralela.
**Q6:** entrar em bolo de outra rodada; forjar valor de entrada; ler a composição do bolo de um mercado ainda fechado.

**Saída:** passivo da casa igual a zero no mercado mútuo, provado por invariante e não por convenção.

---

### F2.2 — Mercado de abates

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F2.1

**Escopo:** primeiro mercado mútuo — quem faz mais abates. O KillFeed já produz o dado desde a v0.8. Regras de empate declaradas antes, não improvisadas na liquidação.

**Sabotagem:** contar abate por tempestade como abate de lutador; contar KO duplicado; resolver empate de forma diferente da declarada; usar a contagem exibida em vez da do motor.

**Q3:** a contagem de abates do mercado bate exatamente com os eventos da batalha, em toda rodada.

**Saída:** mercado de abates liquidando sobre 1.000 rodadas sem divergência.

---

### F2.3 — Interface do mercado mútuo

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 · **Depende de** F2.2

**Escopo:** distribuição do bolo ao vivo, retorno estimado que se move conforme os outros apostam, e o aviso claro de que o retorno **não** é garantido até o fechamento — diferença central para o mercado de odd fixa.

**Sabotagem:** exibir retorno como se fosse fixo; congelar a distribuição e não atualizar; mostrar retorno estimado maior que o matematicamente possível.

**Q5:** os dois mercados lado a lado, nos dois temas; o estado de bolo vazio; o estado de bolo concentrado numa opção só.
**Q7 (GL):** barra = a tela de um mercado de previsão nomeado. Comparar clareza sobre como o preço se forma.

**Saída:** um jogador que nunca viu apuração mútua entende, sem ajuda, por que o retorno muda.

---

### F2.4 — Preço do modelo publicado após a liquidação

**Tam.** P · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F2.3

**Escopo:** o servidor calcula o preço do modelo para o mercado mútuo com o mesmo Monte Carlo e o publica **na liquidação**, junto do preço que o bolo formou. O jogador vê onde o mercado errou.

**Sabotagem:** publicar o preço do modelo antes do fechamento — é o defeito que anula a fase, e precisa ter teste dedicado; vazar o preço em qualquer campo de resposta durante a janela; calcular o preço depois do resultado conhecido em vez de antes.

**Q6:** varrer o payload inteiro da janela de aposta, não só os campos documentados, atrás de qualquer coisa derivada do preço do modelo.

**Saída:** o preço existe, é gravado antes do resultado e só aparece depois. Transparência sem destruir a habilidade.

---

### F2.5 — Pontuação de calibração

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q9 · **Depende de** F2.4

**Escopo:** o jogador registra previsões em probabilidade e recebe pontuação própria de regra de scoring, com histórico. Funciona **sem apostar dinheiro** — é o que dá progressão a quem está sob limite de proteção.

**Sabotagem:** aceitar previsão após o fechamento; permitir previsão que soma diferente de 1; premiar previsão extrema em vez de calibrada; recalcular pontuação passada quando o método mudar.

**Q3:** a pontuação é própria — dizer a probabilidade que você acredita maximiza sua nota esperada. É invariante testável por simulação de apostador honesto contra apostador exagerado.

**Saída:** a nota do apostador honesto vence a do exagerado em 10.000 rodadas simuladas.

---

### F2.6 — Liga de Previsão

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 Q9 · **Depende de** F2.5

**Escopo:** ranking por calibração, temporada, sem stake e sem risco econômico. Não movimenta valor, então não depende do checkpoint do §25.1.

**Sabotagem:** deixar volume de previsões substituir qualidade no ranking; permitir múltiplas contas somarem; reabrir previsão liquidada.

**Q5:** o ranking e o perfil nos dois temas; o estado de quem tem poucas previsões, que não pode aparecer no topo por sorte.
**Q7 (GL):** barra = o placar de uma plataforma de previsão nomeada.

**Saída:** ranking estável, com amostra mínima declarada antes de entrar.

---

### F2.7 — Perfil de leitura e histórico de discordância

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q9 · **Depende de** F2.6

**Escopo:** onde o jogador discordou do modelo e quem estava certo. É a tela que transforma resultado em aprendizado, e é o gancho principal de retorno desta fase.

**Sabotagem:** mostrar só os acertos; comparar contra o modelo recalculado depois do resultado; esconder o tamanho da amostra.

**Q5:** o perfil precisa mostrar acerto e erro com o mesmo destaque — é a mesma regra de honestidade da tela de resultado do F1.9.

**Saída:** o jogador consegue apontar uma coisa concreta que aprendeu na semana.

---

### F2.8 — Telemetria de mercado, KPIs e gate

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F2.7

**Escopo:** eventos de mercado mútuo e de previsão; painel com participação, concentração do bolo, e a série que interessa — **a calibração média da população está melhorando?**

**Sabotagem:** amostrar evento de liquidação; calcular concentração sobre bolo bruto em vez de líquido.

**Saída:** dá para responder se o mercado tem liquidez suficiente para haver preço. **Fim da Fase 2.**

---

# FASE 3 — V3 Coleção, Criação e Informação

**Gate de entrada:** seção 12.

Objetivo: a fantasia de criar Pokémon, ligada nos dois sentidos ao núcleo. Absorve as expedições que eram a V3 Idle.

**Invariantes da fase:**
- captura usa RNG próprio, separado do de batalha;
- **nada do que o jogador possui altera a Arena** (P4), e existe teste que prova;
- **informação não é probabilidade**: o dossiê muda o que o jogador sabe, nunca o que acontece;
- dossiê **não é vendável por dinheiro** — informação com valor de aposta sendo comprável é pay-to-win econômico.

### F3.1 — Espécies e cadeia de evolução

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F2.8

**Escopo:** modelo de espécies com cadeia de evolução completa — inclusive as pré-evoluções, que **não** estão no elenco da Arena. Requisitos de evolução como dado, não como código.

**Sabotagem:** deixar uma pré-evolução entrar no sorteio da Arena; criar ciclo na cadeia de evolução; evolução sem requisito declarado.

**Q3:** o elenco da Arena continua sendo exatamente as 76 formas finais e bases sem evolução, provado por teste, mesmo com a cadeia inteira carregada.

**Saída:** cadeia completa carregada sem que a Arena mude uma vírgula.

---

### F3.2 — Encontro e captura: você leva a forma base

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.1

**Escopo:** o encontro nasce da rodada e rende a **forma base** da espécie, não o lutador que apareceu. Você viu o campeão; leva um ovo. Espécies sem pré-evolução vêm inteiras e são a faixa de entrada.

**Sabotagem:** entregar a forma final; usar o RNG de batalha para a captura; taxa de captura variando com saldo, com valor apostado ou com compra.

**Q3:** RNG de captura e RNG de batalha são independentes — provado por correlação medida, não por inspeção de código.
**Q6:** forjar captura pelo cliente; repetir o pedido de captura para multiplicar.

**Saída:** capturar um Charizard na Arena entrega um Charmander, e a taxa não depende de nada econômico.

---

### F3.3 — Poké Balls, raridade e duplicatas

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.2

**Escopo:** itens de captura, faixas de raridade e o destino das duplicatas.

**Sabotagem:** bola melhor alterando a espécie sorteada em vez da chance de captura; duplicata gerando recurso acima do teto de emissão.

**Saída:** raridade declarada bate com a frequência medida em 100.000 encontros.

---

### F3.4 — Instâncias do jogador: nível, foco e vínculo

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.3

**Escopo:** os três eixos do §11.7 — nível, foco de treino com custo de troca, e vínculo que sobe com uso. Nada de IV/EV/Natures, por decisão da Spec §21.

**Sabotagem:** aceitar nível ou XP vindo do cliente; trocar foco sem pagar o custo; vínculo subindo sem uso.

**Saída:** um jogador consegue explicar para outro o que o treino fez. Se não consegue, o sistema está complexo demais e o bloco não fecha.

---

### F3.5 — Evolução como escolha

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.4

**Escopo:** o trade-off do §11.5 — evoluir dá stats e **libera o dossiê da forma final**; esperar dá golpes que a forma final não aprende. A decisão é do jogador e é reversível só pelo caminho longo.

**Sabotagem:** evoluir sem consumir requisito; evolução automática por nível, que é progressão sem decisão; liberar o dossiê sem evoluir.

**Q3:** evolução não altera nada na Arena — mesmo teste de P4 do F3.1, rodado de novo depois de evoluir.

**Saída:** evoluir muda o que o jogador pode fazer em PvE **e** o que ele passa a saber na Arena.

---

### F3.6 — Moveset escolhido pelo jogador

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.5

**Escopo:** o jogador escolhe os quatro golpes do Pokémon dele, dentro do que a espécie e o nível permitem.

**Sabotagem:** aceitar golpe fora da lista da espécie; aceitar mais de quatro; deixar o moveset escolhido vazar para a Arena.

**Q3:** o moveset do jogador **nunca** entra em `assignMoves`. Teste dedicado: montar um moveset absurdo e provar que a mesma espécie na Arena continua idêntica.

**Saída:** escolha real, com limite real, sem tocar na Arena.

---

### F3.7 — Comparador com a Arena

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 · **Depende de** F3.6

**Escopo:** o botão do §11.6 — mostra o moveset que `assignMoves` escolheria para aquela espécie **e a razão**, incluindo o viés ofensivo e o desequilíbrio Atk/SpA que o produziu.

**Sabotagem:** mostrar a razão errada; recalcular com viés diferente do que a Arena usa de fato; deixar os dois divergirem quando o algoritmo mudar.

**Q3:** o comparador chama a **mesma função** que a Arena, nunca uma reimplementação. Teste que prova que são a mesma origem.
**Q5:** a explicação precisa caber em uma tela e ser entendida sem glossário.
**Q7 (GL):** barra = uma ferramenta de montagem de time nomeada, na parte de explicar *por quê*.

**Saída:** um jogador que usou o comparador vinte vezes prevê melhor. Medível — e é o que F4.9 vai medir.

---

### F3.8 — Doce de espécie ligado à aposta

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q9 · **Depende de** F3.7

**Escopo:** a ponte do §11.3. Apostar numa espécie que vence rende doce dela; aposta perdida rende doce reduzido. É o que impede a sessão no vermelho de ser estéril.

**Sabotagem** — a mais importante da fase:
- fazer o doce **escalar com o valor apostado** (transformaria criar Pokémon em motivo para apostar mais alto, exatamente o incentivo que o capítulo 28 existe para não criar);
- emitir doce para conta em cool-off ou autoexclusão;
- emitir doce acima do teto por janela.

**Q3:** `doce == f(espécie venceu, aposta existiu)` e nada mais. O valor apostado não pode aparecer na fórmula, provado por teste que varia o stake e exige o mesmo resultado.

**Saída:** apostar 50 e apostar 5.000 na mesma espécie rendem exatamente o mesmo doce.

---

### F3.9 — Dossiê

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q9 · **Depende de** F3.8

**Escopo:** o servidor já roda 150.000 simulações por rodada e sabe muito mais do que mostra. Passa a mostrar: taxa de vitória histórica, média e variância de abates, colocação típica, desempenho por clima, perfil de risco, desempenho contra composições de tipo.

**Sabotagem:** derivar o dossiê de amostra diferente da que precificou; mostrar número sem tamanho de amostra; permitir compra do dossiê com dinheiro.

**Q3:** **informação não é probabilidade** — teste que prova que possuir ou não o dossiê não muda uma única odd, um único resultado, uma única captura.
**Q6:** ler o dossiê de espécie não liberada; extrair por API o que a interface não mostra.

**Saída:** o dossiê existe, é honesto sobre incerteza, e é comprovadamente inerte sobre o jogo.

---

### F3.10 — Progressão do dossiê pelos estados da Pokédex

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 · **Depende de** F3.9

**Escopo:** os cinco estados ganham peso econômico — `SEEN` só o nome, `ENCOUNTERED` taxa bruta, `CAPTURED` dossiê completo, `MASTERED` desempenho por clima e matchup.

**Sabotagem:** pular estado; conceder dado de estado superior; regredir estado ao soltar duplicata.

**Q5:** a Pokédex precisa deixar óbvio o que falta para o próximo estado — é o gancho de retorno da fase.

**Saída:** a progressão é sentida na rodada seguinte, que é o que falta no desenho atual.

---

### F3.11 — Expedições como pesquisa e fonte de encontro

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F3.10

**Escopo:** o que restou da V3 Idle, absorvido. Expedições produzem encontro, doce e relatório — estreitam intervalo de confiança de uma espécie, revelam desempenho sob um clima, mapeiam um matchup.

**Sabotagem:** aceitar carimbo de tempo do cliente; adiantar o relógio do aparelho e colher; reivindicar a mesma expedição duas vezes; expedição rendendo probabilidade em vez de informação.

**Q6:** progresso offline é a superfície mais explorada de todo jogo idle — calcular sempre no servidor, a partir de carimbo próprio.

**Saída:** expedição adianta o conhecimento, nunca a sorte.

---

### F3.12 — Minha Coleção e painel analítico

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 · **Depende de** F3.11

**Escopo:** a tela onde tudo se encontra — time, Pokédex, dossiês, progresso de expedição. É o painel do apostador e o álbum do treinador na mesma superfície.

**Sabotagem:** contagem de coleção divergindo do banco; dossiê aparecendo para espécie não liberada; a tela recalculando estatística por conta própria em vez de ler do servidor.

**Q5:** a tela mais densa do produto. Capturar com coleção vazia, parcial e completa, nos dois temas e em três larguras.
**Q7 (GL):** barra = a tela de coleção de um jogo de colecionáveis nomeado.

**Saída:** dá para decidir em quem apostar sem sair dela.

---

### F3.13 — Antifraude de captura, KPIs e gate

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F3.12

**Escopo:** detecção de captura forjada, farm por múltiplas contas, e abuso de expedição. KPIs da fase e verificação do gate.

**Sabotagem:** forjar captura pelo cliente; farmar com contas ligadas por dispositivo.

**Saída:** KPIs medidos. **Fim da Fase 3.**

---

# FASE 4 — V4 Time e Jornada

**Gate de entrada:** seção 12.

Objetivo: **onde se aprende a ler o motor.** A Trainer Battle Engine deixa de ser um segundo jogo competindo por atenção e vira o simulador de treino da Arena.

**Invariante da fase:** duas engines, duas suítes de golden. Mudança na Trainer Engine não pode deslocar nada da Arena — F4.1 torna isso estrutural, não disciplinar.

### F4.1 — Separação das engines

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q4 Q6 · **Depende de** F3.13

**Escopo:** Arena Engine e Trainer Battle Engine separadas, com fronteira explícita e suítes independentes. Compartilham tabela de tipos e fórmula de dano; divergem em tudo que envolve o Pokémon possuído.

**Sabotagem:** mudar a Trainer Engine e ver se os goldens da Arena caem — **precisam não cair**; deixar a Trainer Engine importar estado da Arena.

**Q4:** os goldens da Arena permanecem byte a byte idênticos com a Trainer Engine inteira carregada.

**Saída:** duas engines, dois trilhos, zero acoplamento.

---

### F4.2 — Team Builder

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F4.1

**Escopo:** montar time de até seis, com os Pokémon do jogador, movesets de F3.6 e regras de composição.

**Sabotagem:** aceitar time inválido no servidor; usar Pokémon não possuído; time influenciando a Arena.

**Saída:** time montado, validado no servidor, inerte sobre a Arena.

---

### F4.3 — Simulador de time: a probabilidade exibida

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q4 Q6 · **Depende de** F4.2

**Escopo:** **o bloco de maior retorno da fase.** Antes de qualquer combate PvE, o jogo mostra a probabilidade de vitória do time e o efeito de cada troca possível — o mesmo Monte Carlo que precifica a Arena, apontado para o time do jogador.

```
Ginásio de Pedra — Brock
seu time vence 23% das vezes
maior fraqueza: nenhum golpe seu é super-efetivo contra Pedra
se trocar Pidgeotto por Squirtle:  61%
```

**Sabotagem:** exibir probabilidade diferente da que o combate realiza; recalcular com parâmetros diferentes dos do combate; arredondar a favor do jogador.

**Q4:** a probabilidade exibida bate com a frequência observada em 20.000 combates simulados, por faixa. É a invariante que sustenta a fase inteira: se o número mente, o jogador aprende a coisa errada.

**Saída:** o jogador manipula uma probabilidade e vê o número mexer, e o número é verdade.

---

### F4.4 — Tactical Presets

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 · **Depende de** F4.3

**Escopo:** as quatro posturas da Spec §8.5, com efeito visível na probabilidade exibida por F4.3.

**Sabotagem:** preset sem efeito mensurável; preset alterando resultado da Arena.

**Saída:** trocar de postura move o número, e o jogador entende por quê.

---

### F4.5 — Jornada de Kanto

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 · **Depende de** F4.4

**Escopo:** estrutura de progressão, ordem clássica, desbloqueio por insígnia, mapa.

**Sabotagem:** reivindicar insígnia fora de ordem; repetir ginásio para farmar; progresso vindo do cliente.

**Q5:** o mapa e a tela de ginásio nos dois temas.
**Q7 (GL):** barra = a apresentação de progressão de um RPG de criaturas nomeado.

**Saída:** progressão com paredão real, mas legível.

---

### F4.6 — Os ginásios como aulas

**Tam.** G · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q4 Q5 · **Depende de** F4.5

**Escopo:** cada ginásio ensina **uma** interação, e a probabilidade de F4.3 é o instrumento — Brock ensina fraqueza de tipo, Misty ensina que velocidade decide trocas apertadas, Lt. Surge ensina imunidade, Sabrina ensina físico contra especial.

**Sabotagem:** ginásio vencível sem entender a interação que ele ensina (teste: um time montado ignorando a lição deve perder a maior parte das vezes); dificuldade estimada em vez de medida.

**Q4:** cada ginásio tem faixa de dificuldade **medida**, não estimada — mesmo método que calibrou killstreak e odds.

**Saída:** um jogador que passou por Brock sabe explicar o que fraqueza de tipo faz.

---

### F4.7 — Combate PvE, stamina e recompensas

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F4.6

**Escopo:** loop de combate, stamina e recompensas de PvE, com sink que não infle a economia.

**Sabotagem:** repetir o mesmo combate para farmar; stamina regenerando pelo relógio do cliente; recompensa de PvE virando PC-T.

**Saída:** PvE dá progressão sem virar torneira de moeda.

---

### F4.8 — Bosses, lendários e power score

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 · **Depende de** F4.7

**Escopo:** conteúdo de fim de jornada e a métrica de força do time.

**Sabotagem:** power score influenciando a Arena; lendário entrando no elenco da Arena.

**Saída:** conteúdo de topo existe, e continua inerte sobre a Arena.

---

### F4.9 — A ponte jornada → leitura

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q9 · **Depende de** F4.8

**Escopo:** medir se a tese da fase é verdadeira. Quem passou pelos ginásios prevê melhor? Quem usou o comparador de F3.7 tem calibração melhor? Instrumentação, coorte e leitura.

**Sabotagem:** comparar coortes sem controlar tempo de jogo; medir só quem terminou a jornada, que é sobrevivência amostral.

**Saída:** resposta com número para "a jornada ensina a apostar melhor?". Se a resposta for não, isso é informação valiosa e reorienta V5. **Fim da Fase 4.**

---

# FASE 5 — V5 Liga

Fase de maior risco econômico e regulatório. Todo bloco de valor econômico nasce atrás de feature flag desligada. **Q6 obrigatório em todos.**

**Invariante da fase:** PC-B/PC-C e PC-T nunca compartilham pot. **F5.4 precisa vir antes de F5.5 e F5.6**, porque é a barreira que os dois assumem existir.

| Bloco | Escopo | Tam. | Método | Portões | Sabotagem central |
|---|---|---|---|---|---|
| **F5.1** | Formato assíncrono, defense snapshot, matchmaking (§9.2 a §9.5) | G | INV | Q1 Q2 Q3 Q6 Q8 | snapshot alterado depois de o confronto ser criado |
| **F5.2** | Três ratings separados — Arena, Equipe e Calibração — tiers e temporadas (§9.7, §9.8) | M | INV | Q1 Q2 Q3 | rating de um vazando para outro |
| **F5.3** | Stakes, pot e rake com UI explícita (§9.6) | M | GL+INV | Q1 Q2 Q3 Q5 Q6 | rake diferente do exibido antes de confirmar |
| **F5.4** | **Separação dos pools econômicos** (§9.6) | G | INV | Q1 Q2 Q3 Q6 Q8 | parear PC-B contra PC-T; `economic_pool` ignorado no matchmaking |
| **F5.5** | Competitive Profit Account: hurdle, HWM, carryforward (§9.9) | G | INV | Q1 Q2 Q3 Q6 | HWM zerando entre temporadas; reclassificar acima do saldo PC-B |
| **F5.6** | Competitive Exchange e Reserve, sem mint (§9.9) | G | INV | Q1 Q2 Q3 Q6 Q8 | mintar PC-T quando a Reserve zera; Reserve negativa por corrida |
| **F5.7** | P2P de PC-T com holds e limites (§10.3.1) | G | INV | Q1 Q2 Q3 Q6 Q8 | transferir PC-T Pending; fluxo circular entre contas ligadas |
| **F5.8** | Anti-win-trading e proteção econômica (§9.12) | M | INV | Q1 Q2 Q6 Q9 | partidas combinadas entre contas do mesmo dispositivo passando |
| **F5.9** | Replays, espectador, leaderboards, temporada (§9.10 a §9.15) | M | GL+INV | Q1 Q2 Q5 Q7 | replay divergindo da partida registrada |

**Nota de Q6 para a fase inteira:** é a fase em que fraude tem retorno financeiro direto. O modelo de ameaça precisa incluir conluio entre contas, múltiplas contas por pessoa, chargeback após transferência, e exaustão da Reserve por grupo coordenado. Testar com contas ligadas por dispositivo, rede e padrão de horário.

## 12. Gates de fase

Cada gate exige dados de produção da fase anterior. Nenhum é dispensável por conveniência de cronograma.

| Gate | Exige |
|---|---|
| **0 → 1** | os seis critérios do §4.8, item a item; trilho verde; Q2 fechado em todos os 10 blocos |
| **1 → 2** | KPIs do §5.15 com dados reais; economia observável no painel; retenção medida no ContentPack original; §28.11 marcado |
| **2 → 3** | mercado mútuo com liquidez suficiente para formar preço; calibração média da população medida e **melhorando**; participação na Liga de Previsão conhecida |
| **3 → 4** | taxa de captura e progressão de Pokédex nas bandas projetadas; **evidência de que o dossiê muda comportamento de aposta** — sem isso a tese da fase falhou e a Fase 4 precisa ser repensada |
| **4 → 5** | resposta de F4.9: quem passou pelos ginásios prevê melhor? PvE com dificuldade medida, não estimada; power score estável |
| **antes de valor econômico real** | checkpoint completo do §25.1, incluindo a resposta da consulta de enquadramento do §0.5.1 |

---

## 13. Paralelismo

A Fase 0 é serial por construção — é a fase que constrói a rede. A partir da Fase 1 há paralelismo real:

```text
Fase 1   F1.1 ─ F1.2 ─ F1.3 ─ F1.4 ─ F1.5 ─ F1.6 ─ F1.7 ─┬─ F1.8 ─ F1.9 ─ F1.13
                                                          ├─ F1.10
                                                          └─ F1.11 ─ F1.12

Fase 2   F2.1 ─ F2.2 ─ F2.3 ─ F2.4 ─ F2.8
              └──────────────► F2.5 ─ F2.6 ─ F2.7 ─┘

Fase 3   F3.1 ─ F3.2 ─ F3.3 ─┬─ F3.4 ─ F3.5 ─ F3.6 ─ F3.7 ─┐
                             ├─ F3.8                        ├─ F3.12 ─ F3.13
                             └─ F3.9 ─ F3.10 ─ F3.11 ───────┘

Fase 4   F4.1 ─ F4.2 ─ F4.3 ─┬─ F4.4
                             └─ F4.5 ─ F4.6 ─ F4.7 ─ F4.8 ─ F4.9
```

Duas trilhas independentes valem destacar. Na Fase 2, **calibração e previsão** (F2.5 a F2.7) não dependem do motor de apuração mútua — podem começar assim que F2.1 estabelecer o vocabulário de mercado, e são a parte mais barata e de menor risco regulatório da fase inteira. Na Fase 3, a trilha de **criação** (F3.4 a F3.7) e a de **informação** (F3.9 a F3.11) só se encontram na tela de F3.12.

**Regra de convivência:** dois blocos em paralelo não podem tocar o mesmo módulo. Se tocarem, serializar. É a mesma regra que o LEIA-ME impunha ao arquivo único, agora por módulo em vez de por projeto.

---

## 14. O que não é bloco

Três coisas travam o percurso e **não** são resolvíveis escrevendo código:

1. **A consulta de enquadramento regulatório** (§0.5.1). Entrada de arquitetura da Fase 0; pode reordenar a Fase 5 inteira.
2. **A arte do ContentPack original.** F1.12 constrói a integração; a arte é trabalho de fora do repositório e precisa começar muito antes do bloco.
3. **A política de publicidade e afiliados.** Não coberta por nenhum documento do conjunto, e necessária antes de qualquer aquisição paga.

Colocá-las numa lista de blocos daria a impressão falsa de que estão sob controle da execução.

---

## 15. Changelog v1.2

| Seção | Mudança |
|---|---|
| Cabeçalho | Cita o Design Depth v1.1 como base e registra a precedência temporária sobre a Spec enquanto a lacuna L-013 estiver aberta. |
| 6 | Distribuição refeita: 44 INV, 16 GL+INV, 1 GL. A queda de blocos puramente GL é explicada, não escondida. |
| 8 | Mapa refeito para 61 blocos, com o que mudou em relação à v1.1 e o saldo honesto: −6 do idle, +17 de mercados, criação e ginásios. |
| **Fase 2** | **Reescrita.** Era Collection com 6 blocos; vira Mercados Mútuos e Previsão com 8. Existe porque a Arena não tem teto de habilidade. |
| **Fase 3** | **Reescrita.** Era Trainer Idle; vira Coleção, Criação e Informação com 13 blocos, absorvendo as expedições. Captura rende forma base, evolução é escolha, moveset é do jogador. |
| **Fase 4** | **Reescrita.** Era Team & Journey genérico; vira o lugar onde se aprende a ler o motor, com 9 blocos. F4.3 exibe a probabilidade do time, F4.6 faz de cada ginásio uma aula, F4.9 mede se a tese é verdadeira. |
| Fase 5 | Mantida em 9 blocos. F5.2 passa a separar três ratings em vez de dois. |
| 12 | Gates 2→3, 3→4 e 4→5 reescritos para exigir evidência das teses novas, não KPIs de capítulos que deixaram de existir. |
| 13 | Paralelismo mapeado para as Fases 2, 3 e 4, com as duas trilhas independentes destacadas. |
| 16 | Prompts de gauntlet atualizados; tabela de barra sugerida por bloco com portão Q7. |

### Blocos herdados sem alteração

Fases 0 e 1, 22 blocos, seguem idênticos à v1.1. Nada nas decisões de profundidade tocou a fundação nem a Arena online — o que é, por si, uma validação do desenho: a discussão inteira de metagame não mexeu uma linha no núcleo.

---

## 16. Prompts de gauntlet prontos

Gerados pela skill instalada em `.claude/skills/gauntlet-loop` (técnica de Matt Shumer, empacotamento de RoboNuggets, CC BY 4.0 — ver `ATTRIBUTION.md`).

**Antes de rodar qualquer um destes, escolher a barra.** Os prompts abaixo deixam a barra entre colchetes de propósito: uma barra genérica é o modo de falha mais comum do método — o crítico inventa a comparação e aprova tudo na primeira rodada. A única barra que o projeto já tem nomeada é o Reels do `pokebet.arena`, que é a referência de origem.

### Prompt para F1.7 — ciclo apostar → assistir → resultado

```
Build the bet-watch-result loop of an automatic battle-royale betting arena: a 30-second betting window over 12 fighters with live odds, a battle the player watches without input, and a result screen.

The bar is the pokebet.arena Reels footage that this project was modelled on. Get the real footage first and compare against it directly, not against a description of it.

Break this into the smallest pieces that can be improved and judged on their own - the odds panel, the bet confirmation, the countdown, the battle pacing, the killfeed, the result reveal. For each piece, fan out a builder and a separate critic with fresh context. The critic captures our screen, puts it next to the footage blind with the labels stripped, says which one holds attention longer, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### Prompt para F1.9 — tela de resultado honesta

```
Build the result screen for a betting game so that it is honest: the net figure is the headline, a return smaller than the stake never triggers the victory choreography, and the 7 and 30 day net position is one glance away.

The bar is [NAMED LICENSED OPERATOR]'s responsible gaming and account history pages. Open the real pages and compare against them directly, not against a description of them.

Break this into the smallest pieces that can be judged on their own - the win state, the loss state, the return-below-stake state, the net position panel, the wording. For each piece, fan out a builder and a separate critic with fresh context. The critic reads ours and theirs blind with the branding stripped, says which one a tired player at 2am would read correctly faster, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. Any dark pattern is an automatic loss. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### Prompt para F1.12 — identidade do ContentPack original

```
Build the roster presentation and visual identity for an original creature cast of 76, replacing a placeholder set, for an automatic battle arena.

The bar is [NAMED SHIPPED CREATURE GAME]'s roster and creature identity. Pull the real screenshots and compare against them directly, not against a description of them.

Break this into the smallest pieces that can be judged on their own - silhouette readability at arena scale, type legibility, the roster grid, the individual creature card, the naming, the motion. For each piece, fan out a builder and a separate critic with fresh context. The critic puts ours next to theirs blind with the labels stripped, says which cast a player would want to collect, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### Os demais blocos com portão Q7

Mesmo molde; gerar com `/gauntlet-loop <objetivo do bloco>` e **escolher a barra antes de rodar**.

| Bloco | Barra sugerida |
|---|---|
| F0.8 | painel de odds de uma casa nomeada — só a comunicação de limite |
| F1.3 | fluxo de cadastro com verificação de idade de um produto nomeado |
| F1.8 | página de limites de um operador licenciado nomeado |
| **F2.3** | tela de um mercado de previsão nomeado — como o preço se forma |
| **F2.6** | placar de uma plataforma de previsão nomeada |
| **F3.7** | ferramenta de montagem de time nomeada — na parte de explicar *por quê* |
| **F3.10** | uma Pokédex ou álbum de coleção nomeado — o que falta para o próximo estado |
| **F3.12** | tela de coleção de um jogo de colecionáveis nomeado |
| **F4.5** | apresentação de progressão de um RPG de criaturas nomeado |
| **F4.6** | um tutorial de jogo nomeado que ensina sem texto explicativo |
| F5.3 | confirmação de aposta de uma casa nomeada — clareza sobre a taxa |
| F5.9 | replays e leaderboards de um jogo competitivo nomeado |

### O que não recebe prompt de gauntlet

Os 44 blocos INV. Para eles a barra seria uma especificação, não um artefato comparável, e o loop degeneraria em concordância — o modo de falha nº 1 que a própria skill documenta. Fecham por Q1 a Q4, Q6, Q8 e Q9, com o crítico cego atuando como revisor adversarial contra a especificação, não como juiz de A/B.

O bloco **F4.3** merece nota: é o de maior retorno da Fase 4 e é INV puro. A tentação de tratá-lo como problema de interface é forte, porque o entregável é um número numa tela. Mas o que importa é o número ser **verdade** — a probabilidade exibida tem que bater com a frequência observada em 20.000 combates. Se ela mentir, o jogador aprende a coisa errada, e nenhuma qualidade visual conserta isso.
