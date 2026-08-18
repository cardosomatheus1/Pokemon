# PokéArena — Blocos de Construção v1.0

**Documento:** BUILD-BLOCKS-001 · Revisão 1.0
**Base:** Master Spec v1.4 · Economy Study v1.2 · Unit Economics v1.2
**Escopo:** decomposição de v0.9 → V5 em blocos cíclicos executáveis
**Status:** plano de execução; não substitui a Spec, que continua sendo a fonte de verdade sobre *o quê*. Este documento trata de *em que ordem* e *em que pedaços*.

---

## 1. Para que serve este documento

A Master Spec descreve seis versões de produto. Ela não diz como transformar isso em trabalho executável sem que alguém precise segurar o projeto inteiro na cabeça a cada sessão.

Este documento quebra o percurso em **blocos cíclicos**. Cada bloco é uma ordem de serviço autocontida, dimensionada para ser executada do começo ao fim numa única sessão de trabalho — por uma pessoa ou por um agente — sem depender de contexto que não esteja escrito nele.

A propriedade que define um bloco:

> **Ao fechar qualquer bloco, o jogo continua jogável e a suíte de regressão continua verde.**

Não existe bloco que deixe o projeto pela metade. Se um bloco não puder ser fechado sem quebrar o anterior, ele está mal cortado e precisa ser dividido.

---

## 2. A forma do ciclo

Todo bloco tem a mesma estrutura. Quem executa não precisa ler mais nada além do bloco e dos artefatos que ele cita.

```text
BLOCO Fx.y — nome
├─ TAMANHO      P (uma sessão curta) · M (uma sessão) · G (sessão longa, considerar dividir)
├─ DEPENDE DE   blocos que precisam estar fechados
├─ ENTRADA      o que precisa estar verde antes de começar
├─ ESCOPO       o que este bloco constrói, em arquivos e comportamento
├─ TESTES       o que prova que funciona — escrito antes do código
├─ SAÍDA        critério objetivo e verificável de fechamento
└─ ROLLBACK     como desfazer sem quebrar o bloco anterior
```

### O ciclo em si

```text
      ┌──────────────────────────────────────────────┐
      │                                              │
      ▼                                              │
  1. LER          bloco + estado atual do repositório │
      │                                              │
      ▼                                              │
  2. ESCREVER     os testes do bloco, antes do código │
      │           (devem falhar por motivo certo)     │
      ▼                                              │
  3. CONSTRUIR    o escopo, e nada além dele          │
      │                                              │
      ▼                                              │
  4. VERIFICAR    testes do bloco + regressão inteira │
      │                                              │
      ▼                                              │
  5. FECHAR       commit único, critério de saída     │
      │           marcado, telemetria ligada          │
      ▼                                              │
  6. RELATAR      o que mudou, o que ficou aberto ────┘
```

**A etapa 2 não é opcional e é a que faz o ciclo funcionar.** Sem teste escrito antes, o critério de saída vira opinião, e blocos executados em sessões diferentes começam a divergir.

### Regra de escopo

Um bloco constrói **só o que está no escopo dele**. Melhoria oportunista encontrada durante a execução vira anotação para um bloco futuro, não código neste. Essa é a regra que impede o efeito bola de neve que já custou três versões ao projeto (v0.6.1 → v0.6.3).

---

## 3. O trilho de segurança

O bloco **F0.1 é pré-requisito de todos os outros** e existe por um motivo específico: o projeto hoje é um arquivo de 5.227 linhas cujo comportamento correto não está capturado em lugar nenhum. Modularizar sem rede é como a v0.6.1 — a mudança parece funcionar e o jogo sai errado.

O trilho tem três camadas, todas construídas em F0.1:

| Camada | O que prova | Como quebra |
|---|---|---|
| **Golden tests** | `simulate(fighters, seed)` produz exatamente os mesmos eventos | qualquer mudança acidental no motor |
| **Regressão estatística** | 10.000 rodadas mantêm distribuição de vitórias, duração e margem dentro de tolerância | mudanças que não alteram um caso mas deslocam o agregado |
| **Invariantes** | as 11 invariantes do §4.6 da Spec valem em toda rodada gerada | estados impossíveis que testes de caso não pegam |

A partir de F0.1, **nenhum bloco fecha com o trilho vermelho**. Se um bloco precisa mudar o comportamento de propósito (F0.6 e F0.7 mudam), ele atualiza os goldens **no mesmo commit**, com a diferença explicada na mensagem.

---

## 4. Uma ressalva que o próprio projeto impõe

O §27 da Master Spec diz, textualmente, para não construir tudo de uma vez:

> "Não iniciar desenvolvimento substancial da próxima camada sem que a anterior tenha: dados reais de uso; bugs críticos resolvidos; economia observável; telemetria; uma hipótese clara que a próxima versão pretende resolver."

Então este documento mapeia o percurso inteiro, mas **o mapa não é uma autorização de execução contínua**. Os blocos dentro de uma fase são encadeáveis livremente. A passagem *entre* fases depende de dados que só existem depois que a fase anterior rodou com gente de verdade.

```text
dentro da fase   -> encadeamento livre, limitado só por dependência técnica
entre fases      -> gate com dados de produção (seção 11)
```

Tratar o gate de fase como formalidade é o modo mais fácil de construir V2–V5 em cima de hipóteses erradas sobre V1.

---

## 5. Mapa geral

| Fase | Versão | Blocos | O que passa a existir |
|---|---|---:|---|
| **0** | v0.9 Foundation | 10 | motor confiável, modular, testável e pronto para servidor |
| **1** | V1 Arena Online | 12 | produto multiplayer real, com carteira, proteção e telemetria |
| **2** | V2 Collection | 6 | captura, Pokédex e motivo para perseguir espécies |
| **3** | V3 Trainer Idle | 6 | progressão passiva e retorno diário |
| **4** | V4 Team & Journey | 7 | Pokémon próprios, estratégia e PvE |
| **5** | V5 League | 9 | competição assíncrona, temporadas e a economia competitiva |
| | | **50** | |

---

# FASE 0 — v0.9 Foundation

Objetivo: tornar o protótipo confiável sem mudar o que o jogador vê, exceto onde a Spec exige que mude.

### F0.1 — Arnês de regressão e captura do comportamento atual

**Tamanho:** M · **Depende de:** —

**Entrada:** o `index.html` da base v0.8, funcionando.

**Escopo:**
- extrair o motor (`rng`, `statAt`, `buildRoster`, `effect`, `damageOf`, `simulate`, `assignMoves`, tabela de tipos, elenco) para um módulo importável sem DOM;
- suíte de golden tests: 20 seeds fixas, evento a evento, serializadas em arquivo;
- regressão estatística: 10.000 rodadas, com faixas de tolerância para taxa de vitória por lutador, duração média e margem realizada;
- verificador das 11 invariantes do §4.6.

**Testes:** a própria suíte é o entregável. Ela precisa passar contra o motor atual, sem nenhuma correção — este bloco **fotografa**, não conserta.

**Saída:** `npm test` verde; goldens versionados; relatório de baseline com as distribuições atuais commitado junto.

**Rollback:** trivial — nada de produção foi tocado.

> Anotar no relatório de baseline, sem corrigir: Gengar vence 33,96% (4,08× a média), Ditto 1,61%, amplitude de 21×, e 14 dos 66 golpes nunca são atribuídos. São insumos de F0.4 e de decisões futuras de balanceamento.

---

### F0.2 — Motor como módulo

**Tamanho:** M · **Depende de:** F0.1

**Entrada:** trilho verde.

**Escopo:** o motor extraído em F0.1 passa a ser a **única** implementação. O `index.html` importa em vez de conter. Zero mudança de comportamento.

**Testes:** goldens idênticos antes e depois. Diferença de um único byte de evento reprova o bloco.

**Saída:** `index.html` sem lógica de combate; jogo roda igual.

**Rollback:** reverter o commit; o motor módulo continua existindo sem uso.

---

### F0.3 — Separação de interface, economia e perfil

**Tamanho:** G · **Depende de:** F0.2

**Entrada:** trilho verde.

**Escopo:** quebrar o restante do arquivo único em módulos com fronteira explícita — render/animação, carteira e economia, perfil e progressão, killfeed, áudio. Sem servidor, sem mudança de comportamento.

**Testes:** goldens; smoke test de que a página carrega, uma rodada completa roda e o resultado é pago.

**Saída:** nenhum módulo com mais de ~600 linhas; dependências apontando numa direção só (ui → engine, nunca o contrário).

**Rollback:** reverter o commit.

> Este é o maior bloco da fase e o único candidato natural a divisão. Se for dividido, dividir por módulo, nunca por camada horizontal.

---

### F0.4 — Content Layer

**Tamanho:** M · **Depende de:** F0.3

**Entrada:** trilho verde.

**Escopo:** todo dado de Pokémon — dex, nomes, tipos, stats, golpes, sprites, trilha — sai do código e vira `ContentPack`. O motor recebe o pack como parâmetro. Nenhum identificador da franquia hard-coded fora do pack.

**Testes:** o motor roda contra um pack sintético de 12 criaturas inventadas e produz rodada válida; goldens do pack Kanto inalterados.

**Saída:** `pokemon_kanto_v1` é um arquivo de dados; trocar o pack troca o jogo.

**Rollback:** reverter o commit.

> É o bloco que torna a decisão de tema reversível. Depois dele, a troca vira trabalho de arte, não de engenharia.

---

### F0.5 — Seed raiz e derivações

**Tamanho:** M · **Depende de:** F0.4

**Entrada:** trilho verde.

**Escopo:** implementar a árvore do §P3 — `roundSeed` derivando `lineupSeed`, `environmentSeed`, `battleSeed`, `visualSeed`, `rewardSeed`. Eliminar todo uso de `Math.random()` no caminho da rodada, incluindo o embaralhamento de `pickLineup` e as seeds do Monte Carlo.

**Testes:** mesma `roundSeed` reproduz elenco, clima, layout, batalha e ordem de entrada, byte a byte, em dois ambientes JS distintos.

**Saída:** uma rodada inteira é reconstituível a partir de um único número.

**Rollback:** reverter o commit; goldens de F0.1 continuam válidos porque `simulate` não muda.

---

### F0.6 — Clima dentro do modelo probabilístico

**Tamanho:** M · **Depende de:** F0.5

**Entrada:** trilho verde.

**Escopo:** implementar o §4.3 da Spec — cada simulação do Monte Carlo deriva o próprio `environmentSeed` e sorteia clima com a mesma distribuição da luta real. A odd passa a conhecer a distribuição de clima sem revelar o clima da rodada.

**Testes:** a margem realizada por grupo de tipo converge para a margem configurada. Especificamente, a diferença entre tipos buffáveis (Fogo/Água/Voador/Gelo) e os demais precisa cair para dentro do ruído.

**Saída:** margem realizada uniforme entre grupos de tipo, medida em pelo menos 300 rodadas × 8.000 simulações.

**Rollback:** reverter o commit.

> **Este bloco muda comportamento de propósito** — atualizar goldens no mesmo commit. Baseline documentada do defeito que ele corrige: hoje a margem é 15,79% para tipos não-buffáveis e −2,90% para buffáveis, contra 8% declarados. É a maior correção de fairness da fase.

---

### F0.7 — Estimador de odds

**Tamanho:** M · **Depende de:** F0.6

**Entrada:** trilho verde.

**Escopo:** implementar o §4.4 da Spec — restaurar a suavização de Laplace, elevar `SIMS_MIN` para 150.000, calcular e registrar o erro relativo por lutador, e gravar o registro de precificação completo da rodada.

**Testes:** nenhuma probabilidade estimada é zero; o erro relativo do pior lutador fica abaixo de 2%; oito cálculos independentes sobre a mesma pool produzem odds dentro da tolerância.

**Saída:** dispersão de odds do azarão abaixo de 3% entre execuções independentes (hoje é ~22%).

**Rollback:** reverter o commit; `SIMS_MIN` é parâmetro, então a reversão parcial é só trocar o número.

> Medir o tempo de cálculo por rodada e registrar. Se passar de 8 s, paralelizar em lotes antes de fechar — a janela de aposta é de 30 s.

---

### F0.8 — Tetos de exposição

**Tamanho:** P · **Depende de:** F0.7

**Entrada:** trilho verde.

**Escopo:** implementar o §4.4.6 — `MAX_PAYOUT_POR_TICKET`, `MAX_LIABILITY_POR_RODADA`, stake máximo derivado por lutador, corte aplicado antes da confirmação, mercado fechando ao atingir o passivo máximo, e a exibição de tudo isso na interface.

**Testes:** nenhum ticket confirmado excede o teto; ao saturar o passivo, o lutador fecha e a UI diz por quê; nenhum corte é aplicado a ticket já confirmado.

**Saída:** as duas invariantes de exposição do §4.6 verdes.

**Rollback:** reverter o commit.

---

### F0.9 — Carteira com API e proveniência

**Tamanho:** M · **Depende de:** F0.8

**Entrada:** trilho verde.

**Escopo:** a carteira deixa de ser um número em `localStorage` e passa a ter API própria e ledger append-only local, já com os buckets do §5.5 — PC-T, PC-B, PC-C, reservado — e `stake_breakdown` no ticket. Ainda local, ainda sem servidor.

**Testes:** saldo nunca negativo; payout preserva proveniência; toda alteração tem entrada de ledger; recalcular o saldo a partir do ledger dá o mesmo número.

**Saída:** nenhum ponto do código escreve saldo sem passar pela API.

**Rollback:** reverter o commit; migração de `localStorage` precisa ser idempotente nas duas direções.

> Fazer isso agora, local, é o que permite que F1.4 seja uma troca de implementação e não uma reescrita do jogo.

---

### F0.10 — Commit-reveal, telemetria e fechamento da v0.9

**Tamanho:** M · **Depende de:** F0.9

**Entrada:** trilho verde.

**Escopo:** interfaces de commit-reveal do §4.5 (o protocolo, não a criptografia definitiva); os 14 eventos de telemetria do §4.7; e a verificação do critério de saída do §4.8 item a item.

**Testes:** todo evento é emitido com os campos obrigatórios; o `commit` publicado antes da rodada confere com o `roundSeed` revelado depois.

**Saída:** os seis critérios do §4.8 marcados, com evidência. **Fim da Fase 0.**

**Rollback:** n/a — bloco de verificação.

---

# FASE 1 — V1 Arena Online

Objetivo: transformar a Arena num produto multiplayer com servidor autoritativo. É a fase mais longa e a única em que proteção do jogador é requisito de entrega.

### F1.1 — Esqueleto do backend e contrato de API

**Tamanho:** M · **Depende de:** F0.10

**Escopo:** serviço mínimo, contrato de API versionado, health check, configuração por ambiente, e o motor da Fase 0 rodando **no servidor** com o mesmo resultado do cliente.

**Testes:** a mesma `roundSeed` produz resultado idêntico no servidor e no cliente.

**Saída:** contrato publicado; paridade motor cliente/servidor provada.

---

### F1.2 — Banco, migrações e modelo V1

**Tamanho:** M · **Depende de:** F1.1

**Escopo:** as sete tabelas do §5.13 mais as três do capítulo 28 (`player_limits`, `self_exclusions`, `responsible_play_events`) e os campos novos em `users` e `bets`. Migrações reversíveis.

**Testes:** migração sobe e desce limpa; constraints rejeitam estado impossível.

**Saída:** esquema aplicado; seed de desenvolvimento reproduzível.

> Criar as tabelas de proteção **agora**, mesmo que só sejam usadas em F1.8. Adicionar coluna em tabela com dados de produção é o caro.

---

### F1.3 — Autenticação real

**Tamanho:** M · **Depende de:** F1.2

**Escopo:** substituir o PIN local. Cadastro, login, sessão, recuperação. **Data de nascimento obrigatória e imutável** (§28.2), com bloqueio abaixo da idade mínima e conta congelada em vez de apagada.

**Testes:** conta abaixo da idade mínima não acessa nenhuma feature econômica; recriar cadastro não contorna o bloqueio.

**Saída:** nenhum caminho de aposta acessível sem sessão válida e idade declarada.

---

### F1.4 — Wallet ledger no servidor

**Tamanho:** G · **Depende de:** F1.3

**Escopo:** a API de F0.9 passa a falar com o servidor. Ledger append-only com os 24 tipos do §5.5, buckets de proveniência, reserva e liberação, idempotência por chave.

**Testes:** requisição repetida não duplica lançamento; soma do ledger igual ao saldo, sempre; nenhum payout converte PC-B em PC-T.

**Saída:** invariantes financeiras do §16.4.1 verdes sob carga concorrente.

---

### F1.5 — Round scheduler autoritativo

**Tamanho:** M · **Depende de:** F1.4

**Escopo:** o servidor passa a ser dono do relógio e do ciclo — gera `roundSeed`, calcula odds, publica `commit`, abre e fecha a janela, simula, distribui. O cliente perde o direito de iniciar rodada.

**Testes:** nenhum cliente consegue antecipar resultado; lock de aposta é do servidor; rodada continua se todos os clientes caírem.

**Saída:** rodada existe sem ninguém assistindo.

---

### F1.6 — Transporte realtime, sala e reconexão

**Tamanho:** G · **Depende de:** F1.5

**Escopo:** §5.8 e §5.9 — todos veem a mesma rodada no mesmo instante; quem chega atrasado pula para o momento atual; queda e volta recuperam o estado.

**Testes:** dois clientes em relógios dessincronizados convergem; reconexão no meio da batalha reposiciona corretamente; aba oculta não trava a rodada.

**Saída:** rodada compartilhada estável com o número de conexões simultâneas alvo.

---

### F1.7 — Aposta, lock e settlement

**Tamanho:** M · **Depende de:** F1.6

**Escopo:** §5.6 — uma posição por usuário, troca livre antes do lock, odd congelada no ticket, nenhuma aposta aceita após o lock do servidor, settlement atômico e idempotente. Tetos de F0.8 aplicados no servidor.

**Testes:** aposta com timestamp posterior ao lock é recusada; payout ocorre exatamente uma vez; settlement concorrente não duplica.

**Saída:** ciclo econômico completo, ponta a ponta, no servidor.

---

### F1.8 — Proteção do jogador: limites

**Tamanho:** M · **Depende de:** F1.7

**Escopo:** §28.3 — os cinco limites, a assimetria (redução imediata, aumento com cooldown de 24 h e confirmação ativa), o bloqueio efetivo no caminho de aposta e a mensagem que diz qual limite, quanto falta e quando volta.

**Testes:** cada limite bloqueia de fato; o cooldown de aumento sobrevive a logout, troca de dispositivo e reinstalação; nenhuma tela oferece caminho alternativo de gasto no momento do bloqueio.

**Saída:** limites em produção, com evento de telemetria por bloqueio.

---

### F1.9 — Proteção do jogador: pausa, autoexclusão e risco

**Tamanho:** G · **Depende de:** F1.8

**Escopo:** §28.4 a §28.7 — cool-off e autoexclusão irreversíveis, propagação por sinais de identidade, bloqueio de marketing, reality check, os sete sinais de risco com escala de intervenção, e a regra de honestidade do resultado (vitória exibida precisa ser vitória econômica).

**Testes:** autoexclusão bloqueia aposta, stake, compra, P2P nos dois sentidos, Exchange e faucets; nenhuma notificação sai para conta excluída, verificado no serviço de notificação e não por convenção; retorno menor que a aposta nunca dispara a coreografia de vitória.

**Saída:** os oito critérios de aceitação do §28.11 marcados.

> Este bloco mexe na tela de resultado, que é o coração do espetáculo do produto. Tratar o valor líquido como o número principal e o bruto como secundário — não é ajuste cosmético, é o requisito.

---

### F1.10 — Perfil, desafios e login streak

**Tamanho:** M · **Depende de:** F1.9

**Escopo:** §5.10 — migrar perfil, XP, medalhas e desafios do `localStorage` para o servidor. Trilha de login de 7 dias com o teto de emissão de PC-B. `rescue grant` com a regra de valor fixo do §28.8.

**Testes:** teto de emissão respeitado; `rescue grant` não escala com a perda e respeita cooldown e bloqueio por sinal de risco.

**Saída:** progressão sobrevive a limpar o navegador.

---

### F1.11 — Admin, telemetria e painel econômico

**Tamanho:** M · **Depende de:** F1.10

**Escopo:** §5.11 e capítulo 17 completo, incluindo o bloco de proteção do jogador sem amostragem. Painel de política monetária do §10.9 com as séries novas de exposição do §5.1 do Estudo Econômico.

**Testes:** todo evento emitido com campos obrigatórios; painel reconstrói faucets, sinks e passivo a partir do ledger.

**Saída:** dá para responder "a economia está saudável?" olhando uma tela.

---

### F1.12 — ContentPack original

**Tamanho:** G · **Depende de:** F1.11

**Escopo:** o pack de criaturas originais previsto no §0.3.1 passa a existir e a ser jogável. O pack Kanto vira ferramenta interna.

**Testes:** o jogo roda inteiro no pack original; goldens do motor inalterados, porque o motor não muda; comparação de retenção entre packs instrumentada.

**Saída:** **as duas primeiras coortes de retenção são medidas no pack que será lançado.** Fim da Fase 1.

> Ordem deliberada: por último dentro da fase, mas ainda dentro dela. Antes disso não há telemetria para comparar; depois disso, a telemetria já teria sido calibrada no produto errado.

---

# FASE 2 — V2 Collection

**Gate de entrada:** ver seção 11.

| Bloco | Escopo | Tam. |
|---|---|---|
| **F2.1** | Modelo de espécies, `user_species` e os cinco estados da Pokédex (§6.3) | M |
| **F2.2** | Geração de encontro a partir da rodada e fluxo de captura (§6.4, §6.5) | M |
| **F2.3** | Poké Balls, raridade e duplicatas (§6.6 a §6.8) | M |
| **F2.4** | Trainer Coins e Species Candy como recursos separados (§6.9) | P |
| **F2.5** | Tela "Minha Coleção", missões e badges (§6.11 a §6.13) | G |
| **F2.6** | Antifraude de captura, KPIs e verificação do gate (§6.15 a §6.17) | M |

**Invariante da fase:** captura usa RNG próprio, separado do RNG de batalha (§22). Nada do que o jogador possui pode tocar a Arena.

---

# FASE 3 — V3 Trainer Idle

| Bloco | Escopo | Tam. |
|---|---|---|
| **F3.1** | `pokemon_instances`, níveis e experiência do Pokémon possuído (§7.3, §7.4) | M |
| **F3.2** | Training Center e facilities (§7.5) | M |
| **F3.3** | Expedition Board e cálculo de expedição (§7.6, §7.7) | G |
| **F3.4** | Progresso offline e energia (§7.8, §7.12) | M |
| **F3.5** | Research Lab, evolução controlada e eggs opcionais (§7.9 a §7.11) | M |
| **F3.6** | Loop de retorno diário, quests e economia da fase (§7.14 a §7.16) | M |

**Invariante da fase:** progresso offline é calculado no servidor a partir de carimbo de tempo, nunca aceito do cliente.

---

# FASE 4 — V4 Team & Journey

| Bloco | Escopo | Tam. |
|---|---|---|
| **F4.1** | Separação das engines: Arena Engine e Trainer Battle Engine (§8.2) | G |
| **F4.2** | Team Builder e movesets (§8.3, §8.6) | M |
| **F4.3** | Tactical Presets e profundidade estratégica (§8.4, §8.5) | M |
| **F4.4** | Kanto Journey e design de ginásios (§8.7, §8.8) | G |
| **F4.5** | Combate PvE, stamina e recompensas (§8.9 a §8.11) | M |
| **F4.6** | Bosses, lendários e power score (§8.12, §8.13) | M |
| **F4.7** | Match simulator, KPIs e gate (§8.14 a §8.16) | M |

**Invariante da fase:** duas engines, duas suítes de golden tests. A Arena Engine não pode regredir por causa de mudança na Trainer Battle Engine — F4.1 existe para tornar isso estrutural, não disciplinar.

---

# FASE 5 — V5 League

A fase de maior risco econômico e regulatório. Todo bloco de valor econômico nasce atrás de feature flag desligada.

| Bloco | Escopo | Tam. |
|---|---|---|
| **F5.1** | Formato assíncrono, defense snapshot e matchmaking (§9.2 a §9.5) | G |
| **F5.2** | MMR separado de Arena MMR, tiers e temporadas (§9.7, §9.8) | M |
| **F5.3** | Stakes, pot e rake com UI explícita (§9.6) | M |
| **F5.4** | **Separação dos pools econômicos** — Bonus Queue e Transferable Queue, com `economic_pool` no matchmaking (§9.6) | G |
| **F5.5** | Competitive Profit Account: hurdle, high-water mark e carryforward (§9.9) | G |
| **F5.6** | Competitive Exchange e Exchange Reserve, sem mint, com Coverage Ratio (§9.9) | G |
| **F5.7** | P2P de PC-T com holds, limites e detecção de fluxo circular (§10.3.1) | G |
| **F5.8** | Anti-win-trading e proteção econômica (§9.12) | M |
| **F5.9** | Replays, espectador, leaderboards, recompensas de temporada (§9.10 a §9.15) | M |

**Invariante da fase:** `PC-B/PC-C` e `PC-T` nunca compartilham pot. F5.4 é o bloco que torna isso estrutural — e precisa vir **antes** de F5.5 e F5.6, porque é a barreira que os outros dois assumem existir.

---

## 11. Gates de fase

Cada gate exige dados de produção da fase anterior. Nenhum é dispensável por conveniência de cronograma.

| Gate | Exige |
|---|---|
| **0 → 1** | os seis critérios do §4.8, verificados item a item |
| **1 → 2** | KPIs do §5.15 com dados reais; economia observável no painel; retenção medida no ContentPack original |
| **2 → 3** | KPIs do §6.16; taxa de captura e progressão de Pokédex dentro das bandas projetadas |
| **3 → 4** | KPIs do §7.18; retorno diário e progresso offline validados |
| **4 → 5** | KPIs do §8.15; PvE equilibrado e power score estável |
| **antes de qualquer valor econômico real** | o checkpoint completo do §25.1, incluindo a resposta da consulta de enquadramento do §0.5.1 |

---

## 12. Ordem de ataque e paralelismo

A Fase 0 é essencialmente serial: cada bloco depende do anterior. Isso é intencional — é a fase que constrói a rede.

A partir da Fase 1 há paralelismo real:

```text
F1.1 ─ F1.2 ─ F1.3 ─ F1.4 ─ F1.5 ─ F1.6 ─ F1.7 ─┬─ F1.8 ─ F1.9
                                                 ├─ F1.10
                                                 └─ F1.11
                                                        └─ F1.12
```

F1.8 a F1.11 podem correr em paralelo depois que o ciclo econômico de F1.7 fechar, desde que cada um mantenha o trilho verde. F1.12 depende de F1.11 só porque precisa da telemetria para a comparação de coortes.

**Regra de convivência:** enquanto dois blocos correrem em paralelo, eles não podem tocar o mesmo módulo. Se tocarem, serializar. É a mesma regra que o LEIA-ME já impunha ao arquivo único, agora aplicável por módulo em vez de ao projeto inteiro.

---

## 13. O que não é bloco

Três coisas travam o percurso e **não** são resolvíveis escrevendo código:

1. **A consulta de enquadramento regulatório** (§0.5.1). É entrada de arquitetura da Fase 0 e pode reordenar a Fase 5 inteira. Nenhum bloco a substitui.
2. **A arte do ContentPack original.** F1.12 constrói a integração; a arte é trabalho de fora do repositório e precisa começar muito antes do bloco.
3. **A política de publicidade e afiliados.** Não coberta por nenhum documento do conjunto e necessária antes de qualquer aquisição paga.

Colocar essas três numa lista de blocos daria a impressão falsa de que estão sob controle da execução. Não estão.
