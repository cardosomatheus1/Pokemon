# PokéArena — Blocos de Construção v1.1

**Documento:** BUILD-BLOCKS-001 · Revisão 1.1 (portões de qualidade e metodologia por bloco)
**Base:** Master Spec v1.4 · Economy Study v1.2 · Unit Economics v1.2
**Escopo:** decomposição de v0.9 → V5 em 50 blocos cíclicos executáveis
**Status:** plano de execução. A Spec continua sendo a fonte de verdade sobre *o quê*; este documento trata de *em que ordem*, *em que pedaços* e *com que prova de qualidade*.
**Alterações da v1.1:** seções 3, 4 e 6 são novas; todo bloco passa a declarar metodologia e portões. Ver seção 15.

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
| INV | 26 | motor, seed, precificação, ledger, settlement, antifraude, economia competitiva |
| GL+INV | 15 | telas com regra econômica atrás — carteira, aposta, resultado, coleção, liga |
| GL | 9 | espetáculo, identidade visual, conteúdo, texto |

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
| **2** | V2 Collection | 6 | GL+INV | captura, Pokédex, motivo para perseguir espécies |
| **3** | V3 Trainer Idle | 6 | INV | progressão passiva e retorno diário |
| **4** | V4 Team & Journey | 7 | INV | Pokémon próprios, estratégia, PvE |
| **5** | V5 League | 9 | INV | competição assíncrona, temporadas, economia competitiva |
| | | **50** | | |

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

# FASE 2 — V2 Collection

**Gate de entrada:** seção 12.

| Bloco | Escopo | Tam. | Método | Portões | Sabotagem central |
|---|---|---|---|---|---|
| **F2.1** | Modelo de espécies, `user_species`, cinco estados da Pokédex (§6.3) | M | INV | Q1 Q2 Q3 Q6 | pular um estado da máquina (UNKNOWN → CAPTURED direto) |
| **F2.2** | Encontro a partir da rodada e fluxo de captura (§6.4, §6.5) | M | INV | Q1 Q2 Q3 Q6 | usar o RNG de batalha para captura — precisa ser separado (§22) |
| **F2.3** | Poké Balls, raridade e duplicatas (§6.6 a §6.8) | M | INV | Q1 Q2 Q3 Q6 | taxa de captura influenciada por saldo ou por compra |
| **F2.4** | Trainer Coins e Species Candy como recursos separados (§6.9) | P | INV | Q1 Q2 Q3 | permitir troca direta entre recurso secundário e PokéCash |
| **F2.5** | Tela "Minha Coleção", missões e badges (§6.11 a §6.13) | G | GL+INV | Q1 Q2 Q5 Q7 | contagem de coleção divergindo do banco |
| **F2.6** | Antifraude de captura, KPIs e gate (§6.15 a §6.17) | M | INV | Q1 Q2 Q6 Q9 | forjar captura pelo cliente |

**Invariante da fase:** captura usa RNG próprio, separado do de batalha. Nada do que o jogador possui toca a Arena.
**Barra de F2.5:** tela de coleção de um jogo de colecionáveis nomeado.

---

# FASE 3 — V3 Trainer Idle

| Bloco | Escopo | Tam. | Método | Portões | Sabotagem central |
|---|---|---|---|---|---|
| **F3.1** | `pokemon_instances`, níveis e experiência (§7.3, §7.4) | M | INV | Q1 Q2 Q3 | XP aceito do cliente |
| **F3.2** | Training Center e facilities (§7.5) | M | INV | Q1 Q2 Q3 Q6 | upgrade sem debitar recurso |
| **F3.3** | Expedition Board e cálculo de expedição (§7.6, §7.7) | G | INV | Q1 Q2 Q3 Q6 | recompensa calculada no cliente |
| **F3.4** | Progresso offline e energia (§7.8, §7.12) | M | INV | Q1 Q2 Q3 Q6 | aceitar carimbo de tempo do cliente; adiantar relógio do aparelho |
| **F3.5** | Research Lab, evolução controlada, eggs (§7.9 a §7.11) | M | INV | Q1 Q2 Q3 | evolução sem consumir requisito |
| **F3.6** | Retorno diário, quests e economia da fase (§7.14 a §7.16) | M | INV | Q1 Q2 Q3 Q9 | quest reivindicável duas vezes |

**Invariante da fase:** progresso offline é calculado no servidor a partir de carimbo próprio, nunca aceito do cliente. É a superfície mais explorada de todo jogo idle.

---

# FASE 4 — V4 Team & Journey

| Bloco | Escopo | Tam. | Método | Portões | Sabotagem central |
|---|---|---|---|---|---|
| **F4.1** | Separação Arena Engine / Trainer Battle Engine (§8.2) | G | INV | Q1 Q2 Q3 Q4 | mudança na Trainer Engine deslocando os goldens da Arena |
| **F4.2** | Team Builder e movesets (§8.3, §8.6) | M | INV | Q1 Q2 Q3 Q6 | time inválido aceito pelo servidor |
| **F4.3** | Tactical Presets e profundidade (§8.4, §8.5) | M | INV | Q1 Q2 Q3 | preset alterando resultado da Arena |
| **F4.4** | Kanto Journey e ginásios (§8.7, §8.8) | G | GL+INV | Q1 Q2 Q5 Q7 | progresso de jornada reivindicável fora de ordem |
| **F4.5** | Combate PvE, stamina e recompensas (§8.9 a §8.11) | M | INV | Q1 Q2 Q3 Q6 | repetir o mesmo combate para farmar recompensa |
| **F4.6** | Bosses, lendários e power score (§8.12, §8.13) | M | INV | Q1 Q2 Q3 | power score influenciando a Arena |
| **F4.7** | Match simulator, KPIs e gate (§8.14 a §8.16) | M | INV | Q1 Q2 Q4 Q9 | simulador divergindo do combate real |

**Invariante da fase:** duas engines, duas suítes de golden. F4.1 existe para tornar isso estrutural, não disciplinar.

---

# FASE 5 — V5 League

Fase de maior risco econômico e regulatório. Todo bloco de valor econômico nasce atrás de feature flag desligada. Q6 é obrigatório em todos.

| Bloco | Escopo | Tam. | Método | Portões | Sabotagem central |
|---|---|---|---|---|---|
| **F5.1** | Formato assíncrono, defense snapshot, matchmaking (§9.2 a §9.5) | G | INV | Q1 Q2 Q3 Q6 Q8 | snapshot alterado após o confronto ser criado |
| **F5.2** | MMR separado, tiers e temporadas (§9.7, §9.8) | M | INV | Q1 Q2 Q3 | MMR da Arena vazando para o da Liga |
| **F5.3** | Stakes, pot e rake com UI explícita (§9.6) | M | GL+INV | Q1 Q2 Q3 Q5 Q6 | rake diferente do exibido antes de confirmar |
| **F5.4** | **Separação dos pools econômicos** (§9.6) | G | INV | Q1 Q2 Q3 Q6 Q8 | parear PC-B contra PC-T; `economic_pool` ignorado no matchmaking |
| **F5.5** | Competitive Profit Account: hurdle, HWM, carryforward (§9.9) | G | INV | Q1 Q2 Q3 Q6 | HWM zerando entre temporadas; reclassificar acima do saldo PC-B |
| **F5.6** | Competitive Exchange e Reserve, sem mint (§9.9) | G | INV | Q1 Q2 Q3 Q6 Q8 | mintar PC-T quando a Reserve zera; Reserve ficando negativa por corrida |
| **F5.7** | P2P de PC-T com holds e limites (§10.3.1) | G | INV | Q1 Q2 Q3 Q6 Q8 | transferir PC-T Pending; fluxo circular entre contas ligadas |
| **F5.8** | Anti-win-trading e proteção econômica (§9.12) | M | INV | Q1 Q2 Q6 Q9 | partidas combinadas entre contas do mesmo dispositivo passando |
| **F5.9** | Replays, espectador, leaderboards, temporada (§9.10 a §9.15) | M | GL+INV | Q1 Q2 Q5 Q7 | replay divergindo da partida registrada |

**Invariante da fase:** PC-B/PC-C e PC-T nunca compartilham pot. **F5.4 precisa vir antes de F5.5 e F5.6**, porque é a barreira que os dois assumem existir.

**Nota de Q6 para a fase inteira:** esta é a fase em que fraude tem retorno financeiro direto. O modelo de ameaça precisa incluir conluio entre contas, múltiplas contas por pessoa, chargeback após transferência, e exaustão da Reserve por grupo coordenado. Testar com contas ligadas por dispositivo, rede e padrão de horário.

---

## 12. Gates de fase

Cada gate exige dados de produção da fase anterior. Nenhum é dispensável por conveniência de cronograma.

| Gate | Exige |
|---|---|
| **0 → 1** | os seis critérios do §4.8, item a item; trilho verde; Q2 fechado em todos os 10 blocos |
| **1 → 2** | KPIs do §5.15 com dados reais; economia observável no painel; retenção medida no ContentPack original; §28.11 marcado |
| **2 → 3** | KPIs do §6.16; taxa de captura e progressão dentro das bandas projetadas |
| **3 → 4** | KPIs do §7.18; retorno diário e progresso offline validados |
| **4 → 5** | KPIs do §8.15; PvE equilibrado e power score estável |
| **antes de valor econômico real** | checkpoint completo do §25.1, incluindo a resposta da consulta de enquadramento do §0.5.1 |

---

## 13. Paralelismo

A Fase 0 é serial por construção — é a fase que constrói a rede. A partir da Fase 1 há paralelismo real:

```text
F1.1 ─ F1.2 ─ F1.3 ─ F1.4 ─ F1.5 ─ F1.6 ─ F1.7 ─┬─ F1.8 ─ F1.9
                                                 ├─ F1.10
                                                 └─ F1.11 ─ F1.12
```

**Regra de convivência:** dois blocos em paralelo não podem tocar o mesmo módulo. Se tocarem, serializar. É a mesma regra que o LEIA-ME impunha ao arquivo único, agora por módulo em vez de por projeto.

---

## 14. O que não é bloco

Três coisas travam o percurso e **não** são resolvíveis escrevendo código:

1. **A consulta de enquadramento regulatório** (§0.5.1). Entrada de arquitetura da Fase 0; pode reordenar a Fase 5 inteira.
2. **A arte do ContentPack original.** F1.12 constrói a integração; a arte é trabalho de fora do repositório e precisa começar muito antes do bloco.
3. **A política de publicidade e afiliados.** Não coberta por nenhum documento do conjunto, e necessária antes de qualquer aquisição paga.

Colocá-las numa lista de blocos daria a impressão falsa de que estão sob controle da execução.

---

## 15. Changelog v1.1

| Seção | Mudança |
|---|---|
| 2 | O ciclo ganha a etapa 3, sabotagem, entre escrever o teste e construir. |
| 3 | **Nova.** Os nove portões de qualidade. Q1 e Q2 obrigatórios nos 50 blocos. |
| 4 | **Nova.** Sabotagem — como e por que quebrar de propósito, e as duas regras que impedem que vire teatro. |
| 6 | **Nova.** As duas metodologias, quando usar cada uma, e a distribuição pelos 50 blocos. |
| Fases 0–5 | Todo bloco passa a declarar método, portões e lista de sabotagem. |
| 16 | **Nova.** Prompts de gauntlet prontos para os blocos GL. |

---

## 16. Prompts de gauntlet prontos

Gerados pela skill instalada em `.claude/skills/gauntlet-loop` (técnica de Matt Shumer, empacotamento de RoboNuggets, CC BY 4.0 — ver `ATTRIBUTION.md`).

**Antes de rodar qualquer um destes, escolher a barra.** Os prompts abaixo deixam a barra entre colchetes de propósito: uma barra genérica é o modo de falha mais comum do método — o crítico inventa a comparação e aprova tudo na primeira rodada. A única barra que o projeto já tem nomeada é o Reels do `pokebet.arena`, que é a referência de origem.

### F1.7 — ciclo apostar → assistir → resultado

```
Build the bet-watch-result loop of an automatic battle-royale betting arena: a 30-second betting window over 12 fighters with live odds, a battle the player watches without input, and a result screen.

The bar is the pokebet.arena Reels footage that this project was modelled on. Get the real footage first and compare against it directly, not against a description of it.

Break this into the smallest pieces that can be improved and judged on their own - the odds panel, the bet confirmation, the countdown, the battle pacing, the killfeed, the result reveal. For each piece, fan out a builder and a separate critic with fresh context. The critic captures our screen, puts it next to the footage blind with the labels stripped, says which one holds attention longer, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### F1.9 — tela de resultado honesta

```
Build the result screen for a betting game so that it is honest: the net figure is the headline, a return smaller than the stake never triggers the victory choreography, and the 7 and 30 day net position is one glance away.

The bar is [NAMED LICENSED OPERATOR]'s responsible gaming and account history pages. Open the real pages and compare against them directly, not against a description of them.

Break this into the smallest pieces that can be judged on their own - the win state, the loss state, the return-below-stake state, the net position panel, the wording. For each piece, fan out a builder and a separate critic with fresh context. The critic reads ours and theirs blind with the branding stripped, says which one a tired player at 2am would read correctly faster, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. Any dark pattern is an automatic loss. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### F1.12 — identidade do ContentPack original

```
Build the roster presentation and visual identity for an original creature cast of 76, replacing a placeholder set, for an automatic battle arena.

The bar is [NAMED SHIPPED CREATURE GAME]'s roster and creature identity. Pull the real screenshots and compare against them directly, not against a description of them.

Break this into the smallest pieces that can be judged on their own - silhouette readability at arena scale, type legibility, the roster grid, the individual creature card, the naming, the motion. For each piece, fan out a builder and a separate critic with fresh context. The critic puts ours next to theirs blind with the labels stripped, says which cast a player would want to collect, and names the single biggest remaining gap. Then it goes back to the builder.

The critic should be a harsh critic. Praise is not useful. If ours does not win, it keeps going.

/loop on each piece until the critic picks ours blind. Do not stop before that.

Keep a live progress page updating as the work evolves so I can watch it.

Fan out subagents and ultracode.
```

### Os demais blocos GL

`F0.8` (comunicação de limite), `F1.3` (fluxo de cadastro com idade), `F1.8` (tela de limites), `F2.5` (coleção), `F4.4` (jornada) e `F5.9` (replays e leaderboards) seguem o mesmo molde. Gerar com `/gauntlet-loop <objetivo do bloco>` e escolher a barra antes de rodar.

### O que não recebe prompt de gauntlet

Os 26 blocos INV. Para eles a barra seria uma especificação, não um artefato comparável, e o loop degeneraria em concordância. Esses fecham por Q1 a Q4, Q6, Q8 e Q9 — com o crítico cego atuando como revisor adversarial contra a Spec, não como juiz de A/B.
