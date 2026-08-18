# PokéArena — Blocos de Construção v1.2

**Documento:** BUILD-BLOCKS-001 · Revisão 1.2 (mercados mútuos, criação e jornada)
**Base:** Master Spec v1.5 · Design Depth v1.1 · Economy Study v1.2 · Unit Economics v1.2
**Escopo:** decomposição de v0.9 → V5 em **61 blocos** cíclicos executáveis
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
| **0** | v0.9 Foundation | 10 | INV | motor confiável, modular, testável, pronto para servidor |
| **1** | V1 Arena Online | 12 | GL+INV | produto multiplayer, carteira, proteção, telemetria |
| **2** | V2 Mercados Mútuos e Previsão | 8 | INV | **teto de habilidade**: preço formado por jogadores e maestria mensurável |
| **3** | V3 Coleção, Criação e Informação | 13 | INV | criar, evoluir, escolher golpes, e o dossiê que paga na aposta |
| **4** | V4 Time e Jornada | 9 | INV | ginásios com probabilidade exibida — onde se aprende a ler o motor |
| **5** | V5 Liga | 9 | INV | competição assíncrona, temporadas, economia competitiva |
| | | **61** | | |

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

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q4 Q5 · **Depende de** F0.2

**Escopo:** quebrar o restante em módulos com fronteira explícita — render/animação, carteira e economia, perfil e progressão, killfeed, áudio. Sem servidor, sem mudança de comportamento.

**Sabotagem:** quebrar um import; inverter a direção de uma dependência (engine importando ui); remover um módulo do grafo e ver se o smoke test cai.

**Q5:** primeira linha de base visual — capturas da arena, resultado, carteira e perfil, nos dois temas, em três larguras. É a referência que todos os blocos seguintes comparam.

**Q6:** sem superfície nova.

**Saída:** nenhum módulo acima de ~600 linhas; dependências numa direção só.

> Maior bloco da fase e único candidato natural a divisão. Se dividir, dividir por módulo, nunca por camada horizontal.

---

### F0.4 — Content Layer

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 · **Depende de** F0.3

**Escopo:** todo dado de Pokémon — dex, nomes, tipos, stats, golpes, sprites, trilha — sai do código e vira `ContentPack`. O motor recebe o pack como parâmetro.

**Sabotagem:** remover um tipo de uma espécie; entregar espécie com moveset vazio (precisa falhar alto, não gerar lutador mudo); deixar um identificador da franquia hard-coded fora do pack (o teste de vazamento precisa pegar).

**Q3:** todo pack válido gera rodada válida; todo pack inválido é rejeitado no carregamento, nunca no meio da batalha.

**Q6:** validação de pack é superfície — pack malformado não pode causar execução arbitrária nem travar o servidor futuro. Testar pack com campos extras, tipos errados e valores fora de faixa.

**Saída:** o motor roda contra pack sintético de 12 criaturas inventadas; goldens do pack Kanto inalterados.

---

### F0.5 — Seed raiz e derivações

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 · **Depende de** F0.4

**Escopo:** a árvore do §P3 — `roundSeed` derivando `lineupSeed`, `environmentSeed`, `battleSeed`, `visualSeed`, `rewardSeed`. Eliminar todo `Math.random()` do caminho da rodada, incluindo o embaralhamento de `pickLineup` e as seeds do Monte Carlo.

**Sabotagem:** reintroduzir um único `Math.random()` no caminho da rodada — o teste de determinismo precisa pegar; usar a mesma sub-seed para duas derivações; derivar `battleSeed` antes de `lineupSeed`.

**Q3:** mesma `roundSeed` reproduz elenco, clima, layout, batalha e ordem de entrada, byte a byte, em dois ambientes JS distintos.

**Q6:** seed previsível é superfície. Testar que `roundSeed` não é derivável de tempo, de contador nem de rodada anterior.

**Saída:** uma rodada inteira reconstituível a partir de um único número.

---

### F0.6 — Clima dentro do modelo probabilístico

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 · **Depende de** F0.5

**Escopo:** §4.3 da Spec — cada simulação do Monte Carlo deriva o próprio `environmentSeed` e sorteia clima com a mesma distribuição da luta real.

**Sabotagem:** voltar a calcular odds sobre stats crus — o teste de margem por grupo de tipo precisa ficar vermelho; usar distribuição de clima diferente entre simulação e batalha; revelar o clima antes do fechamento das apostas.

**Q4:** margem realizada por grupo de tipo converge para a configurada. Baseline do defeito corrigido: hoje 15,79% para tipos não-buffáveis e −2,90% para buffáveis, contra 8% declarados.

**Q6:** sem superfície nova.

**Saída:** diferença entre grupos dentro do ruído, medida em 300 rodadas × 8.000 simulações. **Muda comportamento de propósito — atualizar goldens no mesmo commit.**

---

### F0.7 — Estimador de odds

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q4 · **Depende de** F0.6

**Escopo:** §4.4 — restaurar suavização de Laplace, elevar `SIMS_MIN` para 150.000, calcular e registrar erro relativo por lutador, gravar o registro de precificação completo.

**Sabotagem:** remover Laplace (o teste de probabilidade-zero precisa pegar antes de virar odd infinita); baixar `SIMS` para 20.000 (o teste de erro na cauda precisa ficar vermelho); arredondar a odd para cima em vez de aplicar a margem.

**Q4:** oito cálculos independentes sobre a mesma pool ficam dentro da tolerância. Baseline do defeito: dispersão atual de ~22% no azarão.

**Q6:** sem superfície nova.

**Saída:** erro relativo do pior lutador abaixo de 2%; dispersão abaixo de 3%. Medir o tempo por rodada — se passar de 8 s, paralelizar antes de fechar, porque a janela é de 30 s.

---

### F0.8 — Tetos de exposição

**Tam.** P · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 · **Depende de** F0.7

**Escopo:** §4.4.6 — `MAX_PAYOUT_POR_TICKET`, `MAX_LIABILITY_POR_RODADA`, stake máximo derivado por lutador, corte antes da confirmação, fechamento de mercado ao saturar, exibição de tudo na interface.

**Sabotagem:** aceitar ticket 1 PC acima do teto; aplicar corte a ticket já confirmado; permitir que a soma de tickets ultrapasse o passivo máximo por corrida entre duas confirmações.

**Q5:** a mensagem de corte precisa dizer qual limite, quanto cabe e por quê — capturada e comparada. Rejeição silenciosa reprova o bloco.

**Q6:** manipular o stake no cliente; burlar o teto dividindo em vários tickets; corrida entre duas apostas no mesmo lutador no último instante.

**Q7 (GL):** barra = painel de odds ao vivo de uma casa de apostas nomeada, na parte de comunicar limite e retorno. Só a comunicação; a regra é INV.

**Saída:** as duas invariantes de exposição do §4.6 verdes.

---

### F0.9 — Carteira com API e proveniência

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q8 · **Depende de** F0.8

**Escopo:** a carteira ganha API própria e ledger append-only local, com os buckets do §5.5 e `stake_breakdown` no ticket. Ainda local, ainda sem servidor.

**Sabotagem:** escrever saldo direto, sem passar pelo ledger (a reconciliação precisa pegar); fazer payout de aposta em PC-B cair no bucket PC-T; permitir saldo negativo; apagar uma entrada do ledger.

**Q8:** duas apostas simultâneas no mesmo saldo não podem gastar o mesmo PC duas vezes.

**Q6:** adulterar o `localStorage` para inflar saldo — precisa ser detectado pela reconciliação, não silenciosamente aceito. Documentar que a defesa real só chega em F1.4.

**Saída:** nenhum ponto do código escreve saldo sem passar pela API; recalcular pelo ledger dá o mesmo número.

> Fazer local agora é o que torna F1.4 uma troca de implementação em vez de uma reescrita.

---

### F0.10 — Commit-reveal, telemetria e fechamento da v0.9

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 Q9 · **Depende de** F0.9

**Escopo:** interfaces de commit-reveal do §4.5 (o protocolo, não a criptografia definitiva); os 14 eventos do §4.7; verificação do §4.8 item a item.

**Sabotagem:** publicar um `commit` que não confere com a `roundSeed` revelada; revelar a seed antes do fechamento; omitir um campo obrigatório de um evento.

**Q6:** o `commit` não pode vazar a seed; a seed de uma rodada não pode permitir prever a próxima. Registrar explicitamente que o esquema definitivo exige revisão criptográfica — a v0.9 entrega interface, não segurança caseira.

**Q9:** todo evento com campos obrigatórios, verificado por teste.

**Saída:** os seis critérios do §4.8 marcados com evidência. **Fim da Fase 0.**

---

# FASE 1 — V1 Arena Online

Objetivo: servidor autoritativo e produto multiplayer. Fase mais longa, e a única em que proteção do jogador é requisito de entrega. É também onde Q6 deixa de ser formalidade: a partir de F1.1 existe superfície exposta.

### F1.1 — Esqueleto do backend e contrato de API

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q6 · **Depende de** F0.10

**Escopo:** serviço mínimo, contrato de API versionado, health check, configuração por ambiente, e o motor da Fase 0 rodando no servidor com resultado idêntico ao do cliente.

**Sabotagem:** deixar servidor e cliente em versões diferentes do motor (o teste de paridade precisa pegar); aceitar requisição sem versão de API declarada.

**Q6:** cabeçalhos de segurança, CORS restrito, nenhum segredo em variável exposta ao cliente, mensagem de erro sem stack trace. Varredura de dependências no CI.

**Saída:** paridade motor cliente/servidor provada; contrato publicado.

---

### F1.2 — Banco, migrações e modelo V1

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F1.1

**Escopo:** as sete tabelas do §5.13 mais as três do capítulo 28 (`player_limits`, `self_exclusions`, `responsible_play_events`) e os campos novos em `users` e `bets`. Migrações reversíveis.

**Sabotagem:** remover uma constraint e verificar que o teste de estado impossível cai; migração que não desce limpa; permitir saldo negativo no esquema.

**Q6:** consulta parametrizada em todo caminho; nenhum campo de usuário concatenado em SQL; permissão mínima para a conta de aplicação.

**Saída:** esquema aplicado; seed de desenvolvimento reproduzível.

> Criar as tabelas de proteção agora, mesmo que só sejam usadas em F1.8. Adicionar coluna em tabela com dados de produção é o caro.

---

### F1.3 — Autenticação real

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q5 Q6 · **Depende de** F1.2

**Escopo:** substituir o PIN local. Cadastro, login, sessão, recuperação. Data de nascimento obrigatória e imutável (§28.2), bloqueio abaixo da idade mínima, conta congelada em vez de apagada.

**Sabotagem:** aceitar data de nascimento abaixo da idade mínima; permitir edição da data pelo usuário; contornar o bloqueio recriando cadastro com o mesmo e-mail.

**Q6:** fixação de sessão, enumeração de contas pela mensagem de erro, diferença de tempo entre usuário existente e inexistente, força bruta sem limite, token de recuperação reutilizável ou sem expiração, hash de senha com custo adequado.

**Q5:** telas de cadastro e login nos dois temas; a mensagem de bloqueio por idade precisa ser clara e não sugerir contorno.

**Q7 (GL):** barra = fluxo de cadastro de um produto nomeado com verificação de idade. Só o fluxo e a clareza; a regra é INV.

**Saída:** nenhum caminho de aposta acessível sem sessão válida e idade declarada.

---

### F1.4 — Wallet ledger no servidor

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q3 Q6 Q8 · **Depende de** F1.3

**Escopo:** a API de F0.9 passa a falar com o servidor. Ledger append-only com os 24 tipos do §5.5, buckets de proveniência, reserva e liberação, idempotência por chave.

**Sabotagem:** repetir a mesma chave de idempotência e verificar que não duplica; fazer payout converter PC-B em PC-T; aceitar valor negativo; permitir que a soma do ledger divirja do saldo; remover o `stake_breakdown` do ticket.

**Q8:** cem reservas concorrentes sobre o mesmo saldo; settlement paralelo do mesmo ticket; nenhuma duplicata, nenhum saldo negativo.

**Q6:** IDOR — ler ou movimentar a carteira de outro usuário; estouro de inteiro no valor; arredondamento que cria valor; injeção no campo de memo.

**Saída:** invariantes financeiras do §16.4.1 verdes sob carga concorrente.

---

### F1.5 — Round scheduler autoritativo

**Tam.** M · **Método** INV · **Portões** Q1 Q2 Q3 Q6 · **Depende de** F1.4

**Escopo:** o servidor passa a ser dono do relógio e do ciclo — gera `roundSeed`, calcula odds, publica `commit`, abre e fecha a janela, simula, distribui. O cliente perde o direito de iniciar rodada.

**Sabotagem:** deixar o cliente enviar `roundSeed` e o servidor aceitar; permitir que o cliente peça a próxima rodada; expor o resultado antes do fechamento em qualquer resposta da API.

**Q6:** nenhum campo de resposta durante a janela de aposta pode conter informação derivada do resultado — testar o payload inteiro, não só os campos documentados.

**Saída:** a rodada existe e conclui sem nenhum cliente conectado.

---

### F1.6 — Transporte realtime, sala e reconexão

**Tam.** G · **Método** INV · **Portões** Q1 Q2 Q6 Q8 · **Depende de** F1.5

**Escopo:** §5.8 e §5.9 — todos veem a mesma rodada no mesmo instante; quem chega atrasado pula para o momento atual; queda e volta recuperam o estado.

**Sabotagem:** dessincronizar relógios em 5 s e verificar a convergência; forjar mensagem de outro usuário; reconectar no meio da batalha e receber estado de rodada errada.

**Q8:** o número alvo de conexões simultâneas; queda em massa e reconexão em rajada.

**Q6:** assinar canal de outro usuário; inundar o socket sem limite; mensagem malformada derrubando o processo; ausência de autenticação no handshake.

**Saída:** rodada compartilhada estável na carga alvo.

---

### F1.7 — Aposta, lock e settlement

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q8 Q9 · **Depende de** F1.6

**Escopo:** §5.6 — uma posição por usuário, troca livre antes do lock, odd congelada no ticket, nada aceito após o lock do servidor, settlement atômico e idempotente. Tetos de F0.8 aplicados no servidor.

**Sabotagem:** aceitar aposta 100 ms após o lock; pagar usando odd diferente da registrada no ticket; pagar duas vezes; aceitar odd enviada pelo cliente.

**Q8:** settlement concorrente da mesma rodada por dois processos.

**Q6:** replay do pedido de aposta; TOCTOU entre validação de saldo e reserva; adulteração de odd e de valor no cliente; apostar em nome de outro usuário.

**Q5:** tela de aposta e de resultado nos dois temas, incluindo o estado de mercado fechado por passivo.

**Q7 (GL):** barra = o Reels original do `pokebet.arena`, que é a referência que deu origem ao projeto. Comparação de ritmo e legibilidade do ciclo apostar → assistir → resultado.

**Saída:** ciclo econômico completo ponta a ponta no servidor.

---

### F1.8 — Proteção do jogador: limites

**Tam.** M · **Método** GL+INV · **Portões** Q1 Q2 Q3 Q5 Q6 Q9 · **Depende de** F1.7

**Escopo:** §28.3 — os cinco limites, a assimetria (redução imediata, aumento com cooldown de 24 h e confirmação ativa), bloqueio efetivo no caminho de aposta, mensagem dizendo qual limite, quanto falta e quando volta.

**Sabotagem:** aplicar aumento de limite sem cumprir o cooldown; zerar limites no logout; deixar o limite valer só na interface e não no servidor; contar perda bruta em vez de líquida.

**Q6:** burlar o limite chamando a API direto; burlar trocando de dispositivo; burlar reinstalando; burlar criando conta nova (aqui só se detecta, a propagação é F1.9).

**Q5:** a tela de limites precisa ser alcançável em no máximo dois níveis a partir da carteira; a mensagem de bloqueio não pode oferecer caminho alternativo de gasto.

**Q7 (GL):** barra = a página de limites de um operador licenciado nomeado. Clareza e ausência de padrão escuro.

**Saída:** limites em produção, com evento de telemetria por bloqueio.

---

### F1.9 — Proteção do jogador: pausa, autoexclusão e risco

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

### F1.12 — ContentPack original

**Tam.** G · **Método** GL · **Portões** Q1 Q2 Q5 Q7 · **Depende de** F1.11

**Escopo:** o pack de criaturas originais do §0.3.1 passa a existir e ser jogável. O pack Kanto vira ferramenta interna.

**Sabotagem:** deixar um identificador da franquia hard-coded fora do pack; fazer o jogo cair para o pack Kanto em caso de falha de carregamento (o resgate busca o mesmo pack em outro endereço, nunca outro pack — é a lição registrada na v0.6.1).

**Q5:** o jogo inteiro capturado nos dois packs, mesmas telas, mesmos temas.

**Q7 (GL):** barra = a apresentação de elenco e identidade visual de um jogo de criaturas nomeado e lançado. É o bloco mais puramente GL do projeto: a correção é trivial, a qualidade é tudo.

**Saída:** as duas primeiras coortes de retenção medidas no pack que será lançado. **Fim da Fase 1.**

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
Fase 1   F1.1 ─ F1.2 ─ F1.3 ─ F1.4 ─ F1.5 ─ F1.6 ─ F1.7 ─┬─ F1.8 ─ F1.9
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
