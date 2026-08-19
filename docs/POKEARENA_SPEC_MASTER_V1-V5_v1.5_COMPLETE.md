# PokéArena — Master Product & Technical Specification

**Documento:** SPEC-MASTER-001 · Revisão 1.5 (profundidade, maestria e mundo do treinador)  
**Base analisada:** v0.8  
**Escopo desta especificação:** Fundação v0.9 + Produto V1 a V5  
**Tema assumido nesta fase:** Pokémon / Kanto  
**Status:** especificação integrada de produto, tecnologia, economia virtual, proteção do jogador e viabilidade empresarial  
**Alterações da v1.5:** ver seção 30. A v1.4 continua descrita na seção 29.  

---

## 0. Decisão de produto

O PokéArena deixa de ser tratado apenas como um simulador de apostas e passa a ser concebido como um **jogo de treinador com dois loops complementares**:

1. **Arena Loop — segundos/minutos:** observar uma pool de Pokémon, analisar probabilidades, apostar PokéCash, assistir a uma batalha curta e receber o resultado.
2. **Trainer Loop — horas/dias/semanas:** capturar Pokémon, completar coleção, treinar, executar atividades idle, montar equipes, vencer conteúdo PvE e competir em ligas.

A Arena é o motor de espetáculo e aquisição de atenção. O metagame de treinador é o motor de retenção.

### 0.1 Hipótese central

O produto será considerado validado quando jogadores entrarem no PokéArena não apenas para apostar, mas também por razões como:

- procurar um Pokémon específico;
- completar uma coleção;
- conseguir recursos para evoluir sua equipe;
- retornar de uma expedição idle;
- preparar um time para uma Liga;
- cumprir uma missão ou objetivo de temporada;
- acompanhar progressão e ranking.

### 0.2 Regra estrutural mais importante

**Arena e Trainer World compartilham conteúdo, mas não compartilham balanceamento.**

Na Arena, cada espécie possui atributos padronizados e iguais para todos. Um Charizard de uma determinada versão do motor é o mesmo Charizard para todos os usuários daquela rodada.

No Trainer World, o Pokémon possuído pelo jogador pode ter nível, progressão, build, equipe e recursos próprios.

Consequência: pagar, treinar ou possuir um Pokémon forte **nunca aumenta a chance daquele Pokémon vencer na Arena de apostas**.

### 0.3 Decisão sobre Pokémon

Nesta fase, Pokémon permanece como tema principal do protótipo. Porém, nomes, sprites, golpes, áudio, espécies, tipos e assets devem ficar isolados em uma **Content Layer**, para que o motor não dependa diretamente desses assets.

Regra de arquitetura:

```text
Engine != Pokémon
Engine recebe ContentPack
ContentPack atual = pokemon_kanto_v1
```

Não desenvolver feature nova que exija hard-code de `Charizard`, `Pikachu`, etc. no motor.

### 0.3.1 Prazo de existência do ContentPack original

A Content Layer resolve o risco **técnico** de depender de Pokémon. Ela não resolve o risco **comercial**: assets, nomes e trilha da franquia pertencem à Nintendo / The Pokémon Company, e um produto com aquisição paga, monetização e stake econômico não pode ser publicado sobre eles.

Até a v1.3 este documento tratava a troca de tema como pendência sem prazo. A v1.4 fixa o prazo:

```text
contentpack_original_v1  DEVE existir e ser jogável ANTES do encerramento da V1
pokemon_kanto_v1         permanece como pack de desenvolvimento interno
```

**Motivo, e é de produto, não jurídico:** a V1 é a primeira versão que gera telemetria real de retenção, D1/D7/D30, conversão e LTV. Se essa telemetria for medida sobre o pack Pokémon, ela mede o apelo da nostalgia — número que não sobrevive à troca de tema e que serviria de base para decisões de contratação e de CAC. Calibrar o modelo de negócio sobre um produto que não será lançado é pior do que não calibrar.

Consequência prática: as duas primeiras coortes de retenção devem ser comparadas entre packs. Se a retenção do pack original for materialmente inferior, isso é informação de produto — não motivo para adiar a troca.

### 0.4 Regra econômica — três proveniências de PokéCash + estado Pending

PokéCash continua sendo **uma única moeda na experiência do jogador**, porém o backend deve controlar a origem de cada unidade. Não usar um único campo de saldo sem proveniência.

#### PC-T — PokéCash Transferível

Origem possível:

- compra oficial, quando monetização estiver habilitada;
- transferência recebida de outro jogador;
- parcela transferível recebida em uma batalha competitiva;
- conversão controlada de ganho competitivo elegível.

Pode:

- ser usado na Arena;
- ser usado como stake na Liga 6x6;
- ser transferido para outro jogador, quando P2P estiver habilitado.

Não existe saque oficial na especificação base. Qualquer cash-out, intermediação de RMT ou conversão direta para moeda fiduciária exige projeto e checkpoint jurídico próprios.

#### PC-T Pending — estado de liquidação/risco, não nova moeda

Compras de PC-T provenientes de meios reversíveis ou sujeitos a contestação podem entrar temporariamente como `PC-T Pending`. Esse estado preserva a mesma origem econômica de PC-T, porém impede circulação de valor antes do clearance de risco.

Enquanto `pending`:

- pode ser exibido separadamente como “saldo em processamento”;
- não pode ser transferido por P2P;
- não pode entrar na `Transferable Queue`;
- não pode ser usado para financiar outra conta;
- pode, opcionalmente, ser usado apenas em sinks internos não transferíveis se a política de risco permitir;
- passa para PC-T disponível somente após regra de clearance do provedor/risk engine;
- chargeback, estorno ou fraude pode reverter o saldo ainda não liquidado sem contaminar PC-T já liberado.

Regra: `PC-T Pending` é **status operacional de PC-T**, não quarta proveniência monetária.

#### PC-B — PokéCash Bônus / intransferível

Origem:

- welcome grant;
- login streak;
- desafios;
- missões;
- rescue grant;
- promoções e recompensas sistêmicas.

Pode:

- ser usado nas apostas da Arena;
- ser usado como stake na Liga 6x6;
- participar de eventos elegíveis.

Não pode:

- ser transferido diretamente;
- ser vendido;
- ser enviado para outra conta;
- virar PC-T apenas por circular por uma aposta comum.

#### PC-C — PokéCash Competitivo

É uma **proveniência de lucro competitivo elegível**, não uma quarta moeda visual e **não nasce a cada vitória**.

Regra absoluta:

```text
vitória unitária != emissão de PC-C
```

O servidor mantém uma `Competitive Profit Account` para resultados obtidos em confrontos elegíveis usando PC-B/PC-C. O direito de reclassificação somente aparece sobre **lucro competitivo líquido acumulado**, acima de hurdle e de um high-water mark.

Campos mínimos:

```text
eligible_stake_volume
cumulative_net_pnl
cumulative_hurdle
loss_carryforward
competitive_high_water_mark
eligible_profit_unclassified
```

Baseline quantitativa:

```text
hurdle_rate = 2,5% do eligible_stake_volume
minimum_tier = Gold
minimum_eligible_matches = 40 por período econômico
exchange_ratio = 5 PC-C : 1 PC-T
high_water_mark = persistente entre temporadas
```

Fórmula conceitual:

```text
hurdle = hurdle_rate × eligible_stake_volume
excess = cumulative_net_pnl - cumulative_hurdle
new_eligible_profit = max(0, excess - previous_high_water_mark)
```

Quando existe `new_eligible_profit`, o sistema **reclassifica saldo existente** de PC-B para PC-C. Não cria saldo adicional.

- PC-C continua não transferível diretamente;
- pode ser usado para jogar na fila econômica não transferível;
- pode ser convertido parcialmente em PC-T pela `Competitive Exchange`;
- a Exchange nunca cria PC-T sob demanda: paga apenas a partir de `Exchange Reserve` previamente financiada por sinks de PC-T;
- mudança para 4:1 ou 3:1 depende de cobertura da tesouraria e dados de supply, não apenas de percepção de recompensa.

Essa arquitetura recompensa skill persistente sem transformar sorte de curto prazo, volume farming ou PC-B promocional em uma máquina de emissão de PC-T.

### 0.5 Gate regulatório obrigatório

Se PC-T puder ser comprado, transferido entre jogadores ou adquirir valor econômico externo, e principalmente se jogadores colocarem PC-T em risco em confrontos cujo vencedor recebe o pot menos taxa da plataforma, a feature deixa de ser tratada internamente como simples economia virtual.

Portanto:

- `p2p_transfer_enabled`;
- `league_stake_enabled`;
- `competitive_exchange_enabled`;
- `cashout_enabled`;
- qualquer marketplace/RMT oficial

devem existir atrás de feature flags independentes e **não podem ir a produção com dinheiro real sem revisão jurídica/regulatória, KYC/idade, AML, antifraude e desenho tributário/pagamentos apropriado**.

Durante o protótipo com Pokémon, toda essa economia pode ser simulada sem valor monetário real.

### 0.5.1 O que o gate regulatório NÃO cobre

O §0.5 trata o enquadramento como um portão à frente do produto. Isso é correto para a decisão de lançar, e insuficiente para a decisão de arquitetar, por dois motivos.

**Primeiro: três features mudam o enquadramento isoladamente, não em conjunto.**

```text
Arena com PC-T comprável   -> aposta em resultado com odd definida e margem da casa
Transferable Queue         -> confronto entre usuários com pot e rake
P2P de PC-T                -> mercado secundário informal, mesmo sem cash-out oficial
```

A pergunta a levar à revisão jurídica não é "podemos lançar?". É **"qual destas três, sozinha, muda a natureza da atividade?"**. Se a resposta for "qualquer uma", a ordem do roadmap econômico muda, e é mais barato descobrir isso antes de implementar ledger de proveniência para as três.

**Segundo: ausência de cash-out oficial não é o mesmo que ausência de valor.** O §10.3 registra corretamente que a plataforma não deve prometer preço, liquidez ou conversão. Mas PC-T comprável **e** transferível cria mercado secundário no primeiro dia, e quem precifica é o mercado, não a plataforma. O critério que costuma importar é se o prêmio tem valor econômico obtenível pelo jogador, não se a empresa intermedeia a obtenção.

Regra desta revisão: a consulta de enquadramento é **entrada de arquitetura da v0.9**, não item de checklist da §25.1.

### 0.6 Gate de proteção do jogador

Esta seção não existia até a v1.3. A omissão era relevante: as revisões anteriores especificavam em detalhe como proteger a **empresa** do jogador — antifraude, chargeback, win-trading, emissão descontrolada — e não especificavam como proteger o **jogador** do produto, nem a empresa da consequência disso.

**Regra estrutural:** proteção do jogador é requisito da V1, não da versão em que houver dinheiro real.

O motivo é de engenharia, não de virtude. Limites, autoexclusão e verificação de idade dependem de: identidade estável, ledger com proveniência, bloqueio de features por conta, e histórico agregado por janela temporal. Todos esses componentes nascem na V1. Adicioná-los depois significa reescrever o caminho de aposta, o matchmaking, a Exchange e o P2P — em produção, com saldo real de usuários.

```text
player_protection_enabled = true          # a partir da V1, sem flag de desligar
age_verification_gate                     # idade do JOGADOR
account_maturity_gate                     # tempo de vida da CONTA (não confundir)
```

> **Nota de nomenclatura:** até a v1.3 o parâmetro `account_age_gate` (§9.9) era lido como verificação de idade. Ele nunca foi isso: é maturidade de conta. A v1.4 renomeia para `account_maturity_gate` e cria `age_verification_gate` como parâmetro separado.

O desenho completo está no capítulo 28. Os pontos que condicionam decisões de outras seções:

1. **O produto tem perfil de risco alto por construção.** Ciclo de aposta de ~1 minuto, resultado imediato, aposta mínima acessível, saldo reponível por faucet diário e replay que dramatiza o resultado. Não é acusação ao desenho — é a descrição do que o §8.3 do mapa mental chama de "espetáculo curto". A mesma característica que gera retenção gera risco.
2. **A medição de ruína já existe e é dura.** O §5 do Estudo Econômico mostra 56,6% de probabilidade de ruína com 4 stakes de bankroll em 20 partidas a 50% de win rate. Na Arena da base v0.8, com aposta mínima de 50 PC sobre saldo inicial de 1.000 PC, a ruína é praticamente certa em algumas horas de jogo. Isso é consequência matemática de margem positiva e não é um defeito a corrigir — mas é a razão pela qual limites e ferramentas precisam existir antes de o saldo ter valor.
3. **Custa dinheiro e o custo não estava no P&L.** O Estudo de Unit Economics v1.1 orçava 1,5% para fraude/refund e R$ 0,30/MAU de infraestrutura e suporte. Não orçava ferramenta de autoexclusão, verificação de idade, monitoramento de padrão de risco, atendimento treinado nem relatórios. A v1.2 daquele estudo passa a orçar.

---

# 1. Estado inicial — v0.8

A base atual já contém:

- battle royale automático com 12 lutadores;
- roster de 76 Pokémon de Kanto elegíveis para Arena;
- 66 golpes;
- fórmula de dano inspirada nos jogos;
- tipagem de 18 tipos;
- Monte Carlo com 20.000 simulações;
- margem configurada de 8%;
- clima;
- tempestade de encerramento;
- killstreak;
- KillFeed;
- replay visual;
- carteira local de PokéCash;
- XP de treinador;
- níveis;
- desafios diários;
- perfil;
- telas de vitória/derrota;
- armazenamento em `localStorage`;
- protótipo em um único `index.html`.

## 1.1 Problemas estruturais a resolver antes da expansão

1. O clima que altera a batalha real não está incorporado corretamente no modelo de precificação das odds.
2. A seed atual não representa de forma suficiente toda a rodada como um único objeto auditável.
3. O estado crítico vive no navegador.
4. Não existe servidor autoritativo.
5. Não existe relógio compartilhado.
6. Não existe autenticação real.
7. Um arquivo único dificulta testes, colaboração e evolução.
8. Faltam telemetria de produto e testes estatísticos automáticos.
9. O conteúdo Pokémon está misturado ao motor em pontos que deverão ser desacoplados.

Esses itens são tratados na Fundação v0.9.

---

# 2. Princípios permanentes

## P1 — Fairness antes de espetáculo

A batalha exibida deve ser compatível com a distribuição probabilística utilizada para formar as odds.

## P2 — Server authoritative

Quando houver backend, nenhum cliente poderá definir:

- saldo;
- seed;
- vencedor;
- pagamento;
- captura;
- drop;
- XP;
- resultado de Liga.

O cliente apenas envia intenções e reproduz estados assinados/confirmados pelo servidor.

## P3 — Uma seed raiz por rodada

Toda rodada deve nascer de `roundSeed`.

Derivações sugeridas:

```text
roundSeed
 ├─ lineupSeed
 ├─ environmentSeed
 ├─ battleSeed
 ├─ visualSeed
 └─ rewardSeed
```

## P4 — Arena normalizada

Nenhum atributo do Pokémon de coleção altera a Arena.

## P5 — Progressão sem pay-to-win competitivo

Monetização não deve comprar MMR, resultado de Liga ou chance matemática na Arena.

## P6 — Conteúdo expandível

Pokémon, golpes, espécies e arenas devem ser dados, não lógica.

## P7 — Releases fechadas

Uma versão só é considerada entregue quando:

- funcionalidade existe;
- telemetria existe;
- critérios de aceitação passam;
- regressão principal passa;
- economia foi simulada;
- versão anterior continua jogável.

## P8 — Proteção do jogador

Nenhuma versão pode oferecer aposta sem oferecer, na mesma versão, limite configurável pelo jogador, pausa, autoexclusão e visibilidade honesta do próprio histórico econômico. Proteção não é feature de compliance a ser adicionada quando houver dinheiro real; é parte da definição de "aposta jogável".

---

# 3. Mapa de versões

| Fase | Nome | Capítulo | Objetivo principal |
|---|---|---|---|
| v0.9 | Foundation | §4 | Tornar o protótipo confiável, modular, testável e server-ready |
| V1 | Arena Online | §5 | Transformar a Arena atual em produto multiplayer sincronizado |
| **V2** | **Mercados Mútuos e Previsão** | §6 | **Criar teto de habilidade** — preço formado por jogadores e maestria mensurável |
| **V3** | **Coleção, Criação e Informação** | §7 | Criar, evoluir, escolher golpes, e o dossiê que faz a coleção pagar na aposta |
| **V4** | **Time e Jornada** | §8 | Onde se aprende a ler o motor: ginásios com probabilidade exibida |
| V5 | Liga | §9 | Competição assíncrona, temporadas e endgame |

### O que mudou na v1.5, e por quê

A v1.4 e anteriores organizavam o metagame como quatro modos genéricos — coleção, idle, autobattler, PvP assíncrono. A revisão encontrou dois problemas encadeados:

1. **A Arena não tem teto de habilidade** (§6.2). Com odd derivada de `1/p`, o valor esperado é idêntico para toda aposta. Não há o que dominar.
2. **O metagame estava desconectado.** O P4 impede que o Pokémon possuído altere a Arena — corretamente — mas nada preenchia o vazio, então eram dois jogos no mesmo aplicativo.

As mudanças de estrutura:

| Antes | Agora | Razão |
|---|---|---|
| V2 Collection | **V2 Mercados Mútuos e Previsão** | sem teto de habilidade, nada do resto se sustenta |
| V3 Trainer Idle | **dissolvido** dentro do §7 | modo mais fraco e mais caro; expedições viram fonte de encontro, doce e pesquisa |
| V2 Collection → | **V3 Coleção, Criação e Informação** | ganha evolução, moveset escolhido e dossiê |
| V4 segundo jogo de batalha | **V4 onde se aprende a ler o motor** | ginásios exibem a probabilidade do time |
| Liga de Previsão na V5 | **antecipada para a V2** | barata, sem risco regulatório, ataca retenção cedo |

O detalhamento da análise está em `POKEARENA_DESIGN_DEPTH_v1.1.md`; a decomposição em blocos executáveis, em `POKEARENA_BUILD_BLOCKS_v1.2.md`.

---

# 4. Fundação v0.9 — Fairness, arquitetura e testes

## 4.1 Objetivo

Não adicionar uma segunda camada grande de gameplay ainda. Preparar o PokéArena para suportar todas as versões seguintes sem carregar problemas da v0.8.

## 4.2 Reestruturação mínima

Estrutura sugerida:

```text
/src
  /engine
    battle-engine.js
    damage.js
    targeting.js
    status.js
    storm.js
    rng.js
  /odds
    monte-carlo.js
    pricing.js
    margin.js
  /round
    round-generator.js
    environment.js
    seed.js
  /content
    /pokemon-kanto
      species.json
      moves.json
      type-chart.json
      sprites.json
      audio.json
  /progression
    xp.js
    daily-challenges.js
  /economy
    wallet.js
    rewards.js
  /ui
    arena-renderer.js
    profile.js
    wallet.js
  /storage
    local-adapter.js
/tests
```

Não é necessário adotar framework nessa fase. O objetivo é separação de responsabilidade, não trocar tecnologia por moda.

## 4.3 Novo modelo climático

O ambiente precisa fazer parte da distribuição simulada.

Fluxo recomendado:

```text
1. gerar roundSeed
2. gerar lineup
3. simular N batalhas
   - cada simulação deriva um environmentSeed
   - sorteia clima com a mesma distribuição da luta real
4. calcular win probabilities
5. aplicar margem
6. abrir aposta
7. fechar aposta
8. revelar environmentSeed/clima da batalha real
9. simular batalha com battleSeed
10. reproduzir
```

Alternativa aceita: sortear o clima real antes da aposta, mantê-lo secreto e calcular as odds condicionadas à distribuição de informação observável. Porém isso exige impedir vazamento de informação pelo lineup e é mais complexo. Para V1, usar a primeira abordagem.

## 4.4 Precificação

### 4.4.1 Estimador

Para cada Pokémon `i`, com `N` competidores na pool:

```text
p_i = (wins_i + 1) / (total_sims + N)      # suavização de Laplace
fairOdd_i = 1 / p_i
offeredOdd_i = max(ODD_MIN, min(ODD_MAX, fairOdd_i × (1 - margem)))
```

A suavização **não é opcional**. A v1.3 especificava `p_i = wins_i / total_sims`, o que produz divisão por zero para qualquer lutador que não vença nenhuma simulação — situação real: na base v0.8 o pior lutador do elenco tem taxa de vitória medida de 1,61%, e uma amostra pequena pode zerá-lo. A base v0.8 já usava Laplace; a v1.3 regrediu nesse ponto e a v1.4 restaura.

Aplicação de margem deve ser explícita e testável. Não usar uma transformação que produza overround diferente do configurado sem exibi-lo.

### 4.4.2 Dimensionamento do Monte Carlo

O erro amostral da odd não é ruído cosmético: ele vaza margem exatamente onde o passivo é maior. Para uma proporção estimada por `n` ensaios independentes, o erro relativo de `p̂` — e, em primeira ordem, o da odd — é `sqrt((1-p)/(n·p))`. Impondo erro relativo alvo `ε`:

```text
n = (1 - p) / (p · ε²)
```

Com os `p` medidos no motor da base v0.8, para erro relativo de 2%:

| Perfil | p medido | Odd justa | Sims para ε = 2% |
|---|---:|---:|---:|
| Favorito estrutural (Gengar) | 0,340 | x2,94 | 4.853 |
| Favorito típico | 0,150 | x6,67 | 14.167 |
| Mediana do elenco | 0,083 | x12,05 | 27.621 |
| Azarão comum | 0,037 | x27,03 | 65.068 |
| Pior do elenco (Ditto) | 0,016 | x62,50 | **153.750** |

O tamanho de amostra é ditado pelo **azarão**, não pelo favorito. Os 20.000 sims herdados da base v0.8 dimensionam corretamente a faixa média do elenco e subdimensionam a cauda em quase 8×.

### 4.4.3 Viés de convexidade — por que isso custa margem

Como `odd = 1/p` é convexa, o erro amostral não se cancela: `E[1/p̂] > 1/p`. O termo de segunda ordem é `(1-p)/(n·p²)`, expresso como fração da odd justa. Com os 20.000 sims atuais:

| Perfil | p | Sobrepagamento esperado da odd |
|---|---:|---:|
| Favorito estrutural | 0,340 | +0,03% |
| Favorito típico | 0,150 | +0,19% |
| Mediana do elenco | 0,083 | +0,67% |
| Azarão comum | 0,037 | +3,52% |
| Pior do elenco | 0,016 | **+19,22%** |

Comparar com a margem configurada de 8%: no azarão extremo, o viés sozinho **entrega ao apostador mais que o dobro da margem da casa**. Não é aleatório e não se compensa entre rodadas — é sistemático e sempre na mesma direção.

O efeito é observável no motor atual. Oito cálculos independentes de odds sobre a **mesma pool**, com 20.000 sims cada:

| Lutador | Odd mínima | Odd máxima | Dispersão |
|---|---:|---:|---:|
| Farfetch'd | x54,15 | x65,99 | 21,9% |
| Hitmonlee | x36,75 | x42,32 | 15,2% |
| Chansey | x21,51 | x24,52 | 14,0% |
| Gengar | x1,96 | x2,01 | 2,6% |

Dois jogadores em clientes diferentes veriam x54 e x66 pelo mesmo lutador, na mesma pool. Com servidor autoritativo isso deixa de ser divergência entre clientes, mas continua sendo erro de precificação.

### 4.4.4 Baseline da v0.9

```text
SIMS_MIN = 154.000                 # dimensionado pela cauda, não pela mediana
LAPLACE  = obrigatório
```

> **Corrigido no F0.7, de 150.000 para 154.000.** A tabela do §4.4.2 deriva
> **153.750** simulações para erro relativo de 2 % no pior lutador do elenco
> (p = 0,016). O baseline anterior arredondava para baixo, e o arredondamento
> custava o alvo: medido, 150.000 entrega **ε = 2,02 %**, e o critério de saída
> da v0.9 pede *abaixo* de 2 %. A diferença de custo entre os dois números é de
> 0,1 s por rodada — não havia troca a fazer, havia só uma conta a respeitar.

**O custo é irrelevante e isso precisa estar escrito**, senão o parâmetro fica em 20.000 por receio de conta de servidor. Ao benchmark do §12 do Estudo de Unit Economics (~23 µs/batalha), com uma Arena global por minuto:

| Sims/rodada | Rodadas/mês | CPU-h/mês a 23 µs | CPU-h/mês a 37 µs |
|---:|---:|---:|---:|
| 20.000 | 43.200 | 5,5 | 8,9 |
| 154.000 | 43.200 | **42,5** | **68,4** |
| 154.000 | 129.600 (3 arenas/min) | 127,5 | 205,1 |

Por rodada, 154.000 sims custam ~3,5 s a 23 µs e ~5,7 s a 37 µs — cabe folgadamente antes de abrir a janela de 30 s, e é paralelizável por lotes independentes. A conclusão do §12 daquele estudo ("o Monte Carlo não será o custo principal do negócio") **sobrevive ao aumento de 7,7×**.

**Medido no F0.7**, no hardware de desenvolvimento: **4,9 s por rodada**, a 32 µs/batalha — dentro da faixa prevista acima e bem abaixo do teto de 8 s que o bloco impôs.

### 4.4.5 Registro obrigatório por rodada

- número de simulações;
- probabilidades brutas;
- odds justas;
- odds ofertadas;
- margem efetiva;
- **erro relativo estimado por lutador**;
- **teto de odd e de payout aplicados, se houver**;
- versão do engine;
- versão do content pack.

O erro estimado passa a ser campo de primeira classe: sem ele não há como auditar se a margem realizada divergiu da configurada por viés de estimador ou por outra causa.

### 4.4.6 Limites de exposição e teto de payout

A v1.3 não define teto de odd, teto de payout, nem limite de passivo por rodada. Os termos `max_odd`, `cap de payout`, `liability` e `exposure` não aparecem em nenhum dos três documentos do conjunto. Numa casa de apostas isso é o primeiro parâmetro definido.

**A magnitude:** o pior lutador do elenco tem odd justa x62. Sem teto, um único ticket de 5.000 PC gera passivo de 287.500 PC numa rodada.

#### Teto de odd degrada a oferta — não usar como instrumento principal

Cortar a odd protege o passivo às custas do apostador, e o custo é grande:

| Teto de odd | Odd ofertada ao pior lutador | Margem efetiva **naquele lutador** |
|---|---:|---:|
| x20 | x20,00 | 68,0% |
| x30 | x30,00 | 52,0% |
| x50 | x50,00 | 20,0% |
| sem teto | x57,50 | 8,0% |

Um teto de x20 transforma a margem declarada de 8% em 68% no azarão. Isso contradiz o P1 e o discurso de transparência que o produto usa como diferencial.

#### Teto de payout preserva a odd — é o instrumento correto

Limitar o **payout** mantém a odd justa e restringe apenas o tamanho da aposta:

```text
stake_max_i = payout_max_por_ticket / offeredOdd_i
```

Com `payout_max_por_ticket = 50.000 PC`, a margem permanece 8% para todos:

| Perfil | Odd ofertada | Stake máximo implícito |
|---|---:|---:|
| Favorito estrutural | x2,71 | 18.478 PC |
| Favorito típico | x6,13 | 8.152 PC |
| Mediana do elenco | x11,08 | 4.511 PC |
| Azarão comum | x24,86 | 2.011 PC |
| Pior do elenco | x57,50 | 870 PC |

#### Baseline de parâmetros

```text
ODD_MIN                     = 1,05
ODD_MAX                     = sem teto por padrão; se usado, exibido na UI
MAX_PAYOUT_POR_TICKET       = 50.000 PC        # parâmetro de balanceamento
MAX_LIABILITY_POR_RODADA    = 10 × MAX_PAYOUT_POR_TICKET
MAX_STAKE_POR_TICKET        = min(limite do jogador, stake_max_i)
```

#### Regras de comportamento

- o corte é aplicado **antes** de confirmar a aposta, nunca no settlement;
- a UI mostra o stake máximo disponível para aquele lutador e o motivo — nunca rejeita silenciosamente;
- ao atingir `MAX_LIABILITY_POR_RODADA`, o mercado daquele lutador fecha para novas apostas e isso é exibido;
- teto de odd, se algum dia usado, é exibido junto da odd e entra no registro da rodada;
- nenhum teto pode ser aplicado retroativamente a ticket já confirmado.

## 4.5 Commit-reveal preparado

Mesmo antes do backend completo, definir o protocolo:

Antes da aposta:

```text
commit = SHA256(roundSeed + serverSecretSalt)
```

Publicar `commit`.

Depois da rodada:

- revelar `roundSeed`;
- revelar dados necessários para verificação;
- manter `serverSecretSalt` conforme desenho criptográfico escolhido ou usar esquema adequado que permita verificação sem comprometer rounds futuros.

Na implementação real, o mecanismo deve ser revisado criptograficamente; o objetivo da v0.9 é criar interfaces, não inventar segurança caseira.

## 4.6 Testes obrigatórios

### Determinismo

Mesma entrada + mesma seed = exatamente:

- mesmo lineup;
- mesmo clima;
- mesmos golpes;
- mesmos alvos;
- mesmos danos;
- mesma ordem de mortes;
- mesmo campeão.

### Reprodutibilidade

Executar em pelo menos dois ambientes JS suportados.

### Odds

Para pools fixas, comparar:

- probabilidade prevista;
- frequência observada em grande lote independente.

Definir tolerância estatística por tamanho de amostra.

### Invariantes

- uma rodada termina com exatamente um campeão;
- saldo nunca fica negativo;
- payout ocorre uma única vez;
- aposta fechada não pode ser alterada;
- nenhuma batalha excede hard cap;
- nenhum evento de KO é duplicado;
- soma de probabilidades é coerente;
- nenhum lutador inexistente entra na pool;
- nenhuma probabilidade estimada é zero (Laplace aplicado);
- nenhum ticket confirmado excede `MAX_PAYOUT_POR_TICKET`;
- nenhuma rodada excede `MAX_LIABILITY_POR_RODADA`;
- nenhum ticket é aceito de conta em autoexclusão ou acima do limite declarado pelo jogador.

## 4.7 Telemetria mínima

Eventos:

```text
session_started
round_viewed
bet_selected
bet_changed
bet_confirmed
bet_cancelled
bet_skipped
battle_started
player_pick_ko
battle_completed
result_viewed
profile_opened
wallet_opened
challenge_completed
session_ended
```

Campos comuns:

- user/session id;
- round id;
- engine version;
- timestamp;
- device class;
- experiment flags.

## 4.8 Critério de saída da v0.9

Somente avançar quando:

- motor estiver modularizado;
- clima fizer parte do modelo probabilístico;
- seed raiz existir;
- testes de determinismo passarem;
- regressão de milhares de rounds não encontrar divergência;
- carteira tiver API própria, mesmo ainda local;
- conteúdo Kanto estiver atrás de Content Layer;
- `SIMS_MIN` estiver dimensionado pela cauda e o erro relativo por lutador estiver registrado na rodada;
- tetos de payout e de passivo por rodada existirem e estiverem cobertos por teste;
- a consulta de enquadramento regulatório da §0.5.1 tiver sido feita e a resposta estiver registrada neste documento.

---

# 5. V1 — Arena Online

## 5.1 Objetivo

Transformar o jogo atual de uma experiência local em uma **Arena compartilhada**, onde todos conectados veem o mesmo round, as mesmas odds, o mesmo relógio e o mesmo resultado.

V1 deve ser jogável sem Collection/Idle/Liga.

## 5.2 Loop principal

```text
Lobby/Arena
  ↓
Pré-round
  ↓
12 Pokémon + odds
  ↓ 30 s
Escolha + aposta PokéCash
  ↓
Apostas fecham
  ↓
Revelação do ambiente
  ↓
Batalha ~20–56 s
  ↓
Resultado
  ↓ 5–10 s
Próximo round
```

## 5.3 Estado do round

```text
SCHEDULED
BETTING_OPEN
BETTING_LOCKED
REVEAL
BATTLE
SETTLEMENT
RESULT
CLOSED
```

Transições são exclusivamente do servidor.

## 5.4 Conta

V1 inclui:

- cadastro;
- login;
- logout;
- recuperação de conta;
- nome público de treinador;
- avatar;
- banner;
- nível de treinador;
- data de criação;
- último acesso.

Não armazenar PIN simples.

## 5.5 Carteira

A UI pode mostrar um **Saldo Total**, mas o backend separa proveniência:

```text
available_transferable   // PC-T liquidado
pending_transferable     // PC-T Pending
available_bonus          // PC-B
available_competitive    // PC-C
reserved_transferable
reserved_pending_transferable // normalmente deve permanecer 0; pending não entra em mercados transferíveis
reserved_bonus
reserved_competitive
lifetime_won
lifetime_lost
lifetime_rewards
lifetime_transferred_in
lifetime_transferred_out
lifetime_rake_paid
```

### Regra de consumo

Toda aposta registra exatamente quanto veio de cada bucket. O ticket nunca grava apenas `stake = 100`; grava também `stake_breakdown`.

Exemplo:

```text
stake_total = 100
transferable = 30
bonus = 70
competitive = 0
```

Ao apostar:

1. saldo sai dos buckets `available`;
2. entra nos respectivos buckets `reserved`;
3. o ticket registra a composição;
4. settlement preserva a origem conforme a regra do mercado;
5. nenhum payout pode transformar silenciosamente PC-B em PC-T.

Toda alteração precisa de ledger append-only.

### Ledger types

```text
WELCOME_GRANT
LOGIN_STREAK_REWARD
DAILY_REWARD
BET_RESERVE
BET_RELEASE
BET_LOSS
BET_PAYOUT_TRANSFERABLE
BET_PAYOUT_BONUS
LEAGUE_STAKE_RESERVE
LEAGUE_RAKE
LEAGUE_PAYOUT_TRANSFERABLE
LEAGUE_PAYOUT_BONUS
LEAGUE_COMPETITIVE_REWARD
COMPETITIVE_EXCHANGE_DEBIT
COMPETITIVE_EXCHANGE_CREDIT
P2P_TRANSFER_OUT
P2P_TRANSFER_IN
P2P_TRANSFER_FEE
PC_T_PURCHASE_PENDING
PC_T_PURCHASE_CLEARED
PC_T_PURCHASE_REVERSED
CHARGEBACK_DEBIT
TRANSFER_HOLD_APPLIED
TRANSFER_HOLD_RELEASED
CHALLENGE_REWARD
ADMIN_ADJUSTMENT
```

`balance` nunca deve ser editado diretamente sem ledger.

### Settlement da Arena tradicional

Na Arena de 12 competidores, payout herda a origem da stake:

- PC-T liquidado apostado → payout correspondente em PC-T;
- PC-T Pending não pode ser usado em mercado transferível enquanto estiver sob hold;
- PC-B apostado → payout correspondente em PC-B;
- PC-C apostado → payout correspondente em PC-C;
- stake mista → payout proporcional.

Isso impede usar odds da Arena como conversor automático de bônus gratuito em saldo transferível.

## 5.6 Aposta

**A V1 possui somente um mercado.** Os mercados de apuração mútua entram na V2 (§6) e não devem ser antecipados: a V1 precisa provar o ciclo econômico simples antes de acrescentar um segundo tipo de precificação.

**Winner Market — qual Pokémon será o último sobrevivente?**

Regras:

- uma posição ativa por usuário por round;
- pode trocar de Pokémon enquanto betting estiver aberto;
- pode aumentar/reduzir valor enquanto aberto;
- aposta não pode ser alterada após lock;
- nenhuma aposta é aceita com timestamp posterior ao lock do servidor;
- payout usa odd registrada no ticket no momento da confirmação;
- alterações de odd antes do lock exigem regra explícita.

### Política de odds V1

Recomendação: odds são congeladas no início da janela de 30 s.

Motivo: simplifica UX, auditoria e settlement.

## 5.7 Tela da Arena

Desktop:

- header com saldo, nível e perfil;
- área central da batalha;
- painel de 12 competidores/odds;
- valor de aposta;
- CTA apostar/trocar;
- contador;
- KillFeed;
- indicador de clima após reveal;
- status de conexão;
- commit/hash da rodada em área de transparência.

Mobile:

- batalha ocupa área principal;
- cards de odds em carrossel/grade inferior;
- bet slip sticky;
- KillFeed recolhível;
- prioridade absoluta ao Pokémon escolhido.

## 5.8 Sala compartilhada

Todos recebem por WebSocket/SSE:

```text
round.opened
round.locked
environment.revealed
battle.started
battle.event
battle.finished
round.settled
round.closed
```

O cliente não precisa recalcular vencedor para validar pagamento. Pode recalcular apenas como auditoria.

## 5.9 Reconexão

Se cair conexão:

- durante aposta: recuperar round e ticket atual;
- durante batalha: receber snapshot + índice do replay e continuar;
- no resultado: settlement permanece idempotente;
- nunca repetir payout por refresh.

## 5.10 Perfil, desafios e login streak

Manter da v0.8:

- XP;
- níveis;
- medalhas;
- 3 desafios diários;
- histórico pessoal de apostas.

Adicionar:

- streak de dias;
- taxa de acerto;
- maior odd acertada;
- maior payout virtual;
- Pokémon mais apostado;
- rounds assistidos.

### Trilha de login de 7 dias

A recompensa em PokéCash dessa trilha é sempre **PC-B intransferível**. Valores iniciais para simulação:

| Dia | Recompensa sugerida |
|---|---:|
| 1 | 2 PC-B |
| 2 | 3 PC-B |
| 3 | 5 PC-B |
| 4 | 5 PC-B |
| 5 | 10 PC-B |
| 6 | 10 PC-B |
| 7 | 15 PC-B + item/ball opcional |

Total nominal da trilha: **50 PC-B/semana**.

O orçamento rotineiro combinado de PC-B é de até **80 PC-B/semana**: login consome até 50 e deixa até 30 para desafios/rescue/missões. O `Reward Budget Allocator` deve impedir que múltiplas fontes somadas ultrapassem o budget. Acima do `soft_issuance_ceiling` de 500 PC-B, recompensas rotineiras em moeda são substituídas por Trainer Coins/Balls/XP/progresso cosmético.

Objetivo: garantir participação mínima e recuperação de jogador com saldo baixo sem inflacionar PC-T. Valores são configuração de LiveOps, não hard-code.

Regras:

- 1 claim por janela diária do servidor;
- antifraude contra múltiplas contas;
- ausência reinicia ou aplica regra de tolerância definida por LiveOps;
- PC-B pode ser usado normalmente na Arena e na Liga elegível;
- PC-B nunca pode ser enviado diretamente a outro usuário.

## 5.11 Admin mínimo

Painel interno:

- rounds recentes;
- seed/commit;
- pool;
- odds;
- total apostado virtual por seleção;
- payout;
- falhas;
- usuários online;
- suspender round futuro;
- criar manutenção;
- bloquear usuário;
- ajustar carteira via ledger auditado.

## 5.12 Backend sugerido

Não é requisito usar stack específica, mas a arquitetura precisa conter:

```text
API/Auth
Round Scheduler
Round Engine
Odds Worker
Wallet/Ledger
Bet Service
Settlement Service
Realtime Gateway
Persistence
Telemetry
```

Monte Carlo pode ir para worker/thread separado.

## 5.13 Modelo de dados V1

### users

```text
id
username
email
password_hash
status
created_at
last_login_at
```

### trainer_profiles

```text
user_id
display_name
avatar_id
banner_id
level
xp
```

### rounds

```text
id
status
round_seed_commit
round_seed_reveal
engine_version
content_version
betting_opens_at
betting_locks_at
battle_starts_at
closed_at
environment
champion_species_id
```

### round_fighters

```text
round_id
slot
species_id
probability
fair_odd
offered_odd
```

### bets

```text
id
user_id
round_id
species_id
stake
odd
status
payout
created_at
locked_at
settled_at
```

### wallet_ledger

```text
id
user_id
type
amount
reference_type
reference_id
created_at
```

### daily_challenges

```text
id
user_id
date
challenge_type
target
progress
completed_at
claimed_at
```

## 5.14 Critérios de aceitação V1

- 100 usuários podem observar o mesmo round sem divergência funcional em teste inicial.
- todos recebem o mesmo campeão;
- nenhuma aposta entra depois do lock;
- refresh não duplica aposta nem payout;
- uma seed reproduz a rodada;
- carteira reconcilia 100% com ledger;
- odds ficam registradas para auditoria;
- dispositivo mobile completa uma aposta em poucos toques;
- usuário entende claramente que PokéCash não é sacável.

## 5.15 KPIs V1

- % sessões que fazem pelo menos 1 aposta;
- rounds por sessão;
- tempo médio de sessão;
- retorno D1;
- apostas por usuário ativo;
- abandono durante janela de aposta;
- abandono durante batalha;
- % jogadores que abrem perfil/desafios;
- erros de settlement;
- discrepância engine/odds.

### Gate para V2

Não avançar por empolgação. Procurar evidência de que jogadores jogam múltiplos rounds e retornam em outro dia.

---
# 6. Fase 2 — Mercados Mútuos e Previsão

> **Este capítulo substituiu o antigo "V2 — Collection & Capture".** Coleção passou para o capítulo 7. A troca de ordem é deliberada e está justificada em §6.2.

## 6.1 Objetivo

Dar teto de habilidade ao produto. Até aqui, nenhuma quantidade de conhecimento melhora o resultado esperado de um jogador na Arena. Esta fase cria o lugar onde ler melhor paga, e a métrica que torna "ler melhor" observável.

## 6.2 O achado que motiva esta fase

As odds saem de `1/p × (1 - margem)` com `p` vindo do mesmo motor que roda a luta. Logo:

```text
EV = p × odd = p × (1/p) × (1 - margem) = 1 - margem
```

O `p` cancela. **Toda aposta tem o mesmo valor esperado**, independentemente de quem aposta, quanto sabe, ou em quem aposta.

Medido numa pool fixa, com odds de 150.000 simulações e o EV medido em amostra independente de outras 150.000: a melhor aposta rende 93,3% e a pior 89,2%, e essa amplitude de 4,6% é inteiramente explicada por erro amostral — para `p ≈ 0,02` o erro relativo esperado com 150.000 simulações é 1,8%.

Consequência que precisa estar escrita: **os defeitos que a v1.4 mandou corrigir eram as duas únicas fontes acidentais de vantagem.** O clima fora da precificação dava +2,90% a quem apostasse em Fogo, Água, Voador ou Gelo; o Monte Carlo subdimensionado sobrepagava a odd do azarão em até 19,22%. Fechar F0.6 e F0.7 é certo e continua sendo obrigatório — e deixa a Arena uma máquina de −8% perfeitamente justa e sem nada a dominar.

Isso torna esta fase estrutural, não incremental. Sem ela não existe curva de maestria, e sem curva de maestria o metagame dos capítulos 7 a 9 não tem onde se apoiar.

## 6.3 Dois tipos de mercado, com papéis distintos

```text
Mercado principal   quem vence      odd fixa, preço da casa, margem declarada
                                    porta de entrada, transparente, sem perícia
Mercados mútuos     abates, pódio,  preço formado pelos apostadores
                    duração         casa retira taxa e NÃO toma posição
```

O mercado principal permanece exatamente como está. Ele é honesto, é auditável, e é o que um jogador novo entende sem explicação. A perícia mora ao lado dele, não no lugar dele.

## 6.4 Apuração mútua — mecânica

```text
potBruto  = soma das entradas do mercado na rodada
taxa      = potBruto × taxa_mercado
potLiquido = potBruto - taxa
pagamento_i = potLiquido × (entrada_i / soma das entradas acertadoras)
```

Regras obrigatórias:

- a casa nunca paga do próprio caixa — **passivo estrutural igual a zero**;
- nenhuma entrada é aceita após o lock do servidor;
- liquidação atômica e idempotente, mesma disciplina do §5.6;
- o **resíduo de divisão** tem destino declarado e registrado no ledger; nunca desaparece nem é absorvido em silêncio;
- se nenhum apostador acertar, o `potLiquido` tem destino declarado — devolução proporcional ou transferência para tesouraria, escolhido por parâmetro e exibido antes.

## 6.5 Mercados iniciais

| Mercado | Fonte do dado | Observação |
|---|---|---|
| **Mais abates** | KillFeed, existente desde a v0.8 | primeiro a implementar; o dado já existe e já é auditado |
| Pódio (top 3 em ordem) | ordem de eliminação | maior variância, maior retorno; exige regra de empate |
| Faixa de duração | duração da batalha | fácil de entender, baixa variância; bom para liquidez |

Abrir um por vez. Um mercado sem liquidez não forma preço, e vários mercados rasos são piores que um mercado líquido.

## 6.6 O preço do modelo, e quando publicar

O servidor **pode** precificar os mercados mútuos com o mesmo Monte Carlo, e deve calculá-lo — mas publica somente **após a liquidação**, ao lado do preço que o bolo formou.

> **Invariante que sustenta a fase inteira:** publicar a probabilidade do modelo **antes** do fechamento faz o bolo convergir para ela, e a habilidade desaparece. Este é o modo de falha que anula o capítulo.

O que se publica **antes** é a composição do bolo — quanto está apostado em cada opção. Isso é informação de mercado, não de modelo.

O preço do modelo é calculado e gravado **antes de o resultado ser conhecido**, com carimbo de tempo, para que a publicação posterior seja verificável e não uma racionalização.

Isso aumenta a transparência em vez de reduzi-la: o jogador vê onde o mercado errou, e aprende.

## 6.7 Calibração

O jogador registra previsões em probabilidade e recebe pontuação por regra de scoring **própria** — aquela em que declarar a probabilidade que se acredita maximiza a nota esperada.

Requisitos:

- funciona **sem apostar dinheiro**. É o que dá progressão a quem está sob limite ou em cool-off do capítulo 28;
- previsões precisam somar 1 e ser registradas antes do lock;
- amostra mínima declarada antes de o jogador entrar em qualquer ranking;
- mudança de método de pontuação **não** recalcula histórico; cria período novo.

**Invariante testável:** um apostador que declara suas crenças honestamente supera, em 10.000 rodadas simuladas, um apostador que exagera para os extremos. Se não superar, a regra de pontuação não é própria e está errada.

## 6.8 Liga de Previsão

Ranking por calibração, com temporada. **Sem stake, sem risco econômico.**

Por não movimentar valor, ela **não depende do checkpoint do §25.1** — é a via competitiva de menor risco regulatório do projeto inteiro, e por isso foi antecipada da Fase 5 para cá.

- volume de previsões não substitui qualidade no ranking;
- contas ligadas não somam;
- previsão liquidada não reabre.

## 6.9 Perfil de leitura

A tela onde o jogador vê **onde discordou do modelo e quem estava certo**. É o principal gancho de retorno da fase.

Regra de honestidade, herdada do §28.5: acerto e erro aparecem com o mesmo destaque, e o tamanho da amostra fica visível. Mostrar só os acertos transforma a ferramenta de aprendizado em máquina de autoengano.

## 6.10 Modelo de dados

### markets

```text
id · round_id · kind · status · opens_at · locks_at · settled_at
fee_rate · pot_gross · pot_net · residue_destination
model_price_json · model_priced_at · published_at
```

### market_entries

```text
id · market_id · user_id · selection · amount
stake_breakdown · created_at · payout · settled_at
```

### predictions

```text
id · round_id · user_id · market_kind · distribution_json
created_at · score · scored_at · scoring_version
```

### calibration_ratings

```text
user_id · season_id · sample_size · score · rank
updated_at
```

## 6.11 Ledger types acrescentados

```text
MARKET_ENTRY_RESERVE
MARKET_ENTRY_RELEASE
MARKET_LOSS
MARKET_PAYOUT_TRANSFERABLE
MARKET_PAYOUT_BONUS
MARKET_FEE
MARKET_RESIDUE
```

A proveniência é preservada como no §5.5: entrada em PC-B paga em PC-B. Apuração mútua **não** é rota de conversão de bônus em transferível.

## 6.12 Economia da fase

- a taxa de mercado é **sink**, com a mesma regra do rake do §10: não é receita em reais no instante da retirada;
- o passivo por rodada dos mercados mútuos é zero, então o teto do §4.4.6 continua valendo **apenas** para o mercado principal;
- a taxa de mercado alimenta tesouraria pela mesma política do §10.7; se alimentar a Exchange Reserve, a fração precisa ser declarada lá e não aqui.

## 6.13 Proteção do jogador nesta fase

Mercado novo é superfície nova de risco, e o capítulo 28 se aplica integralmente:

- limites do §28.3 valem sobre a soma de todos os mercados, nunca por mercado;
- a coreografia de vitória do §28.5 vale igual: pagamento menor que a entrada nunca comemora;
- a Liga de Previsão sem stake é caminho de progressão para conta sob limite — **precisa** continuar acessível nesse estado;
- o retorno estimado do mercado mútuo é exibido como estimativa que se move, nunca como promessa.

## 6.14 KPIs

```text
participação por mercado
liquidez: entradas por mercado por rodada
concentração do bolo (índice de dispersão das entradas)
calibração média da população, por coorte de tempo de jogo
participação na Liga de Previsão
fração de jogadores que consultam o perfil de leitura
```

## 6.15 Gate para a Fase 3

- mercado mútuo com liquidez suficiente para formar preço, medido e declarado;
- **calibração média da população medida e melhorando** — se não melhora, o produto não está ensinando e a Fase 3 não conserta isso;
- participação na Liga de Previsão conhecida;
- nenhuma divergência de liquidação em 1.000 rodadas.

---

# 7. Fase 3 — Coleção, Criação e Informação

> **Este capítulo substituiu o antigo "V3 — Trainer Idle" e absorveu o antigo capítulo 6.** As expedições sobrevivem como fonte de encontro, doce e pesquisa; o modo idle como fase própria deixou de existir. Justificativa em §7.1.

## 7.1 Objetivo

Duas coisas ao mesmo tempo, e o capítulo só funciona se as duas existirem:

1. **A fantasia de criar.** Capturar, treinar, evoluir, escolher golpes. É o motor de retenção mais testado do gênero, e ele opera por apego — algo que nenhum relatório de desempenho alcança.
2. **A economia de informação.** O dossiê que faz a coleção pagar na aposta.

A v1.4 tratava esses como capítulos separados (V2 Collection e V3 Idle) e nenhum dos dois se conectava ao núcleo. O idle foi dissolvido porque era o modo mais fraco e o mais caro de fazer bem: temporizador só funciona quando o recurso produzido é desejado, e o recurso desejado aqui é informação, que já vem da coleção.

## 7.2 A regra que dá espaço para tudo isto

O P4 restringe **a Arena**. Ele não restringe o resto do jogo.

```text
Arena             normalizada. O que você possui é irrelevante
Mundo do          RPG completo. O que você possui é tudo
treinador
```

A separação nunca foi o problema. O problema era não haver razão para ir de um lado ao outro. Este capítulo constrói as duas pontes.

## 7.3 As duas pontes

```text
mundo → Arena     informação: o dossiê melhora a leitura, nunca a probabilidade
Arena → mundo     doce de espécie: apostar rende matéria-prima para criar
```

## 7.4 A Pokédex, com peso econômico

Os cinco estados deixam de ser troféu e passam a controlar acesso a informação:

| Estado | Como se chega | O que libera |
|---|---|---|
| `UNKNOWN` | — | nada |
| `SEEN` | apareceu numa rodada sua | nome e tipos |
| `ENCOUNTERED` | você apostou nela | taxa de vitória bruta, com tamanho de amostra |
| `CAPTURED` | você capturou | dossiê completo (§7.12) |
| `MASTERED` | requisito de domínio cumprido | desempenho por clima e por composição de tipo |

A tela precisa deixar óbvio **o que falta para o próximo estado**. É o gancho de retorno da fase.

## 7.5 Encontro e captura — você leva a forma base

O elenco da Arena é composto só de evoluções finais e bases sem evolução. Se a captura entregasse o lutador que apareceu, o jogador só teria formas finais e **não haveria evolução para jogar**.

**Regra:** a captura entrega a **forma base** da linha evolutiva.

> Você viu o campeão lutar. O que leva para casa é um ovo.

Espécies sem pré-evolução vêm inteiras e são naturalmente a faixa de entrada, porque não exigem cadeia para serem usáveis.

Requisitos:

- o encontro nasce da rodada, com RNG **próprio**, separado do RNG de batalha (§22);
- a taxa de captura não pode depender de saldo, de valor apostado, nem de compra;
- captura é resolvida no servidor; o cliente nunca informa resultado.

## 7.6 Poké Balls, raridade e duplicatas

Fontes de Balls: desafio diário, level-up, streak, achievement, eventos, recompensa de coleção, e loja interna limitada por Trainer Coins. **Não vender tentativa aleatória por dinheiro real no protótipo.**

- bola melhor altera a **chance de captura**, nunca a espécie sorteada;
- raridade declarada precisa bater com a frequência medida em amostra grande;
- duplicata converte em doce da espécie, respeitando o teto de emissão.

## 7.7 Recursos

```text
PokéCash        moeda principal, regida pelo capítulo 10
Trainer Coins   moeda de PvE e facilidades; nunca conversível em PokéCash
Species Candy   por espécie; progressão do Pokémon possuído
```

Não criar mais moedas sem necessidade.

## 7.8 Doce de espécie ligado à aposta

A ponte Arena → mundo do treinador.

```text
apostou numa espécie e ela venceu   -> doce daquela espécie
apostou e ela perdeu                -> doce reduzido daquela espécie
```

Efeitos pretendidos: as escolhas de aposta moldam o time, a identidade do treinador emerge do comportamento, e **a sessão que termina no vermelho deixa de ser estéril** — que é o ponto mais frágil da retenção num jogo de aposta.

> **Invariante inegociável:** o doce é função de *a espécie venceu* e *houve aposta*, **e de nada mais**. O valor apostado não pode aparecer na fórmula. Escalar com valor transformaria criar Pokémon em motivo para apostar mais alto, que é exatamente o incentivo que o capítulo 28 existe para não criar. Teste obrigatório: variar o stake de mínimo a máximo e exigir o mesmo doce.

Doce não é emitido para conta em cool-off ou autoexclusão (§28.4).

## 7.9 Instâncias do jogador — nível, foco e vínculo

Três eixos, deliberadamente rasos. O §21 já proíbe IV/EV/Natures completos.

```text
Nível     cresce com doce e com PvE
Foco      Training Center concentra crescimento numa frente
          (ofensiva, defensiva, velocidade), com custo para trocar
Vínculo   sobe com uso; bônus pequeno; é onde mora o apego
```

Critério de aceitação de desenho: se o jogador não consegue explicar para um amigo o que o treino fez, o sistema está complexo demais.

## 7.10 Evolução como escolha

Evolução automática por nível é progressão sem decisão. Aqui a decisão tem consequência em dois sistemas:

```text
evoluir agora   stats maiores, acesso ao conteúdo PvE seguinte
                LIBERA O DOSSIÊ DA FORMA FINAL na Arena
esperar         a pré-evolução aprende golpes que a forma final não aprende
                amplitude de moveset para PvE e Liga de Equipe
```

A segunda linha é o que amarra o capítulo: **a Arena só tem formas finais, então evoluir é como se destrava a análise dos lutadores em que se aposta.** Quem quer o dossiê do Charizard precisa evoluir o Charmander dele.

Evolução exige requisito declarado e consumido. Nenhuma evolução altera coisa alguma na Arena.

## 7.11 Moveset escolhido e o comparador

O jogador escolhe os quatro golpes do Pokémon dele, dentro do que espécie e nível permitem. O moveset escolhido **nunca** entra em `assignMoves` nem toca a Arena.

**O comparador** é o item de maior valor pedagógico do capítulo. Ao montar o moveset, o jogador pode ver o que a Arena escolheria para aquela espécie **e por quê**:

```text
seu Charizard         Lança-Chamas · Voar · Terremoto · Garra de Dragão
Charizard da Arena    Lança-Chamas · Rajada de Fogo · Voar · Bicada
                      viés ofensivo: SpA 109 > Atk 84 -> prioriza especial
```

Requisito de implementação: o comparador chama **a mesma função** que a Arena, jamais uma reimplementação. Duas implementações divergem no primeiro ajuste de algoritmo e passam a ensinar coisa errada.

## 7.12 Dossiê

O servidor roda 150.000 simulações por rodada e sabe muito mais do que mostra. O dossiê publica:

```text
taxa de vitória histórica            média e variância de abates
colocação típica                     desempenho por clima
perfil de risco (morre cedo x dura)  desempenho contra composições de tipo
tamanho de amostra de cada número
```

Três regras:

1. **Informação não é probabilidade.** Possuir o dossiê não muda nenhuma odd, nenhum resultado, nenhuma captura. Invariante testável, e ela é a que protege P4.
2. **Nenhum número sem tamanho de amostra.** Um número sozinho convida a conclusão errada.
3. **O dossiê não é vendável por dinheiro.** Informação com valor de aposta sendo comprável é pay-to-win econômico, e fere P5 tão gravemente quanto vender probabilidade feriria P4.

## 7.13 Expedições como pesquisa

O que sobreviveu da V3 Idle. Expedições produzem **encontro, doce e relatório** — estreitam o intervalo de confiança de uma espécie, revelam desempenho sob um clima, mapeiam um confronto de tipos.

Locais mantidos do desenho anterior (Viridian Forest, Power Plant, Seafoam Islands e sucessores) com identidade de tipo, duração e faixa de recompensa próprias.

**Expedição adianta conhecimento, nunca sorte.** Nenhuma expedição pode devolver probabilidade, odd melhor, ou vantagem na Arena.

## 7.14 Progresso offline e energia

Progresso offline é calculado **no servidor**, a partir de carimbo de tempo próprio. Nunca aceitar carimbo do cliente — é a superfície mais explorada de todo jogo idle.

Energia limita ritmo sem bloquear sessão curta. Slots: Training Center 2 base com expansão, Expedition 1 base até 3, Storage amplo o bastante para não virar dor imediata.

## 7.15 Missões, badges e a tela Minha Coleção

Missões de coleção e badges permanentes seguem o desenho anterior — capturar por tipo, completar percentuais da Pokédex, ver todas as espécies de um tipo na Arena.

A tela **Minha Coleção** é onde tudo se encontra: time, Pokédex, dossiês, progresso de expedição. É o álbum do treinador e o painel do apostador na mesma superfície. Critério de aceitação: **dá para decidir em quem apostar sem sair dela.**

## 7.16 Laço de retorno diário

```text
Abrir  ->  coletar expedições  ->  ver quem subiu de nível
       ->  reiniciar atividades  ->  jogar rodadas da Arena
       ->  ganhar doce e encontros  ->  ajustar time e dossiês  ->  sair
```

A diferença em relação ao desenho anterior: o jogador volta porque **quer saber uma coisa específica**, não porque um contador renovou.

## 7.17 Modelo de dados

```text
species              dex · nome · tipos · stats · linha_evolutiva · raridade
evolution_chain      species_id · evolui_para · requisito
user_species         user_id · species_id · estado · visto_em · capturado_em
                     dominio_progresso
pokemon_instances    id · user_id · species_id · nivel · foco · vinculo
                     moveset_json · evoluido_de · criado_em
inventory            user_id · item · quantidade
species_candy        user_id · species_id · quantidade
capture_attempts     id · user_id · round_id · species_id · resultado · rng_seed
expeditions          id · user_id · local · inicio · fim · reivindicado_em
                     recompensa_json
dossiers             species_id · metrica · valor · amostra · atualizado_em
```

## 7.18 Economia da fase

**Faucets:** doce por aposta, doce por duplicata, Trainer Coins por PvE e expedição, Balls por desafio e progressão.

**Sinks:** evolução, foco de treino, expansão de slot, itens consumíveis, cosméticos internos.

**Recompensa não monetária:** o dossiê é exatamente o "substituto não monetário" que o §6 do Estudo Econômico pede para o jogador que bateu o teto de emissão de PC-B. Desejável, sem inflação, e alinhado ao núcleo.

Trainer Coins e Species Candy **nunca** convertem em PokéCash, em nenhum sentido.

## 7.19 Antifraude

- captura forjada pelo cliente;
- farm por contas ligadas por dispositivo, rede ou padrão de horário;
- manipulação de relógio para colher expedição;
- reivindicação repetida da mesma expedição ou missão.

## 7.20 KPIs

```text
taxa de captura e progressão de Pokédex por coorte
fração de jogadores que evoluem ao menos um Pokémon
uso do comparador de moveset
consulta a dossiê antes de apostar
diversidade de espécies apostadas, antes e depois do dossiê
retenção D7 e D30 de quem capturou x quem não capturou
```

## 7.21 Gate para a Fase 4

- taxa de captura e progressão nas bandas projetadas;
- **evidência de que o dossiê muda comportamento de aposta.** Sem isso a tese central do capítulo falhou, e a Fase 4 — que se apoia na mesma tese — precisa ser repensada antes de começar, não depois;
- P4 verificado por teste após todas as features da fase estarem ligadas;
- antifraude de captura com taxa de detecção conhecida.

---

# 8. Fase 4 — Time e Jornada

## 8.1 Objetivo

**Onde se aprende a ler o motor.**

A leitura anterior desta fase — "transformar coleção e idle em estratégia jogável" — criava um segundo jogo de batalha competindo por atenção com a Arena. A v1.5 reposiciona: a Trainer Battle Engine é o **simulador de treino** da Arena Engine, não uma rival.

O mecanismo que faz isso funcionar é o §8.2.1: antes de qualquer combate, o jogo mostra a probabilidade de vitória do time e o efeito de cada troca possível. O jogador **manipula uma probabilidade e vê o número mexer**, que é a única forma de aprender a ler probabilidade. Depois volta para a Arena, onde só pode ler, e lê melhor.

```text
Mundo do treinador   probabilidade que você MANIPULA   -> aprende
Arena                probabilidade que você só LÊ      -> aplica
```

Nenhum outro jogo de criaturas pode fazer isso, porque nenhum outro publica as próprias probabilidades. Aqui o motor já existe e o número já é calculado.

Os Pokémon do usuário lutam em modo próprio, e continuam sem tocar a Arena (P4).

## 8.1.1 Probabilidade exibida — requisito central da fase

Antes de um combate PvE, exibir:

```text
Ginásio de Pedra — Brock
seu time vence 23% das vezes

maior fraqueza: nenhum golpe seu é super-efetivo contra Pedra
se trocar Pidgeotto por Squirtle:  61%
```

**Invariante:** a probabilidade exibida bate com a frequência observada em pelo menos 20.000 combates simulados, por faixa. Se o número mentir, o jogador aprende a coisa errada — e o propósito inteiro da fase se inverte.

O cálculo usa o mesmo motor e os mesmos parâmetros do combate real, nunca uma aproximação separada.

## 8.1.2 Ginásios como aulas

Cada ginásio ensina **uma** interação, e a probabilidade de §8.1.1 é o instrumento:

| Ginásio | Ensina |
|---|---|
| Brock | fraqueza de tipo |
| Misty | velocidade decide trocas apertadas |
| Lt. Surge | imunidade |
| Sabrina | físico contra especial |

**Critério de aceitação:** um time montado ignorando a lição do ginásio precisa perder a maior parte das vezes. Ginásio vencível sem entender a lição não ensina nada.

Dificuldade de cada ginásio é **medida**, não estimada — mesmo método que calibrou killstreak e odds.

## 8.2 Separação de engines

## 8.2 Separação de engines

### Arena Engine

- normalizado;
- battle royale;
- odds;
- alvo aleatório;
- fairness.

### Trainer Battle Engine

- Pokémon do jogador;
- níveis;
- composição de time;
- decisão estratégica;
- PvE/PvP futuro;
- sem apostas na V4.

Partes comuns podem ser compartilhadas:

- type chart;
- move definitions;
- damage primitives;
- RNG;
- replay primitives.

Mas regras não devem ser acopladas.

## 8.3 Team Builder

Equipe principal:

```text
6 Pokémon
```

Tela mostra:

- tipos;
- level;
- power;
- golpes;
- funções;
- sinergias;
- fraquezas do time.

## 8.4 Profundidade estratégica V4

Adicionar somente três eixos inicialmente:

1. **Composição de tipos**
2. **Moveset**
3. **Tactical Preset**

Não adicionar equipamentos complexos ainda.

## 8.5 Tactical Presets

Exemplos:

### Aggressive

Prioriza dano e alvos frágeis.

### Balanced

Comportamento padrão.

### Defensive

Prioriza sobrevivência/ameaças.

### Focus Weakness

Prioriza matchups super efetivos.

Isso permite estratégia antes da luta sem exigir controle em tempo real.

## 8.6 Movesets

Cada instância pode desbloquear opções por level/mastery.

Antes da batalha, jogador escolhe 4 golpes dentre pool permitida.

Regras:

- no máximo 4 ativos;
- nenhuma modificação na Arena;
- server valida moves permitidos.

## 8.7 Kanto Journey

Criar uma campanha PvE inspirada em progressão por ginásios.

Estrutura sugerida:

```text
Route 1
Brock
Route 2
Misty
Route 3
Lt. Surge
Erika
Koga
Sabrina
Blaine
Giovanni
Elite Four
Champion
```

Cada bloco contém nós de combate e desafios de composição.

## 8.8 Gym design

Cada Gym deve ensinar uma camada estratégica.

Exemplo:

### Brock

Introdução a vantagem de tipo.

### Misty

Exige cobertura e resistência.

### Lt. Surge

Ensina counter de velocidade/elétrico.

### Sabrina

Exige composição mais madura.

A campanha serve também como tutorial progressivo.

## 8.9 Combate PvE

Formato recomendado V4:

**3v3 ou 6v6 automático com preparação prévia.**

Evitar transformar o produto em Pokémon Showdown completo.

O diferencial do projeto continua sendo auto-battle + preparação.

## 8.10 Stamina de Pokémon

Não usar lesão longa ou punição pesada.

Se necessário para impedir spam de uma única equipe:

- cooldown leve;
- bônus para diversidade;
- missões com restrição de tipos.

Preferir incentivo positivo a bloqueio.

## 8.11 Rewards PvE

- Trainer Coins;
- Candy;
- Balls;
- cosmetics;
- badges;
- unlock de áreas;
- League qualification.

## 8.12 Bosses e lendários

Lendários não entram como captura comum.

Usar como conteúdo especial:

- raid PvE;
- evento de temporada;
- boss de campanha;
- recompensa cosmética/colecionável controlada.

Isso preserva valor percebido.

## 8.13 Power score

Criar score explicativo, nunca oculto.

Componentes possíveis:

```text
level contribution
species base contribution
move quality
team synergy (apenas UI recommendation)
```

Power score não deve substituir matchups de tipo; um time numericamente mais forte ainda pode perder para counter inteligente.

## 8.14 Match simulator

Para balancear conteúdo, criar ferramenta offline que rode milhares de confrontos entre builds.

Usos:

- detectar espécie dominante;
- detectar golpe quebrado;
- avaliar win rates;
- balancear NPCs;
- preparar V5.

## 8.15 KPIs V4

- % usuários que montam time completo;
- batalhas PvE/dia;
- taxa de conclusão de cada Gym;
- variedade de espécies usadas;
- concentração do meta;
- abandono por dificuldade;
- rebuilds de time após derrota;
- D30.

## 8.16 Gate para V5

Só lançar competição quando o Trainer Battle Engine estiver suficientemente balanceado e houver base ativa para produzir adversários variados.

---

# 9. Fase 5 — Liga

## 9.1 Objetivo

Criar endgame competitivo recorrente.

O jogador passa a ter um motivo de longo prazo para otimizar coleção e time.

> **A Liga de Previsão não está mais aqui.** Ela foi antecipada para a V2 (§6.8), porque não movimenta valor, não depende do checkpoint do §25.1, é barata de construir e ataca retenção muito antes. Este capítulo trata apenas da **Liga de Equipe** e da economia competitiva que a acompanha.

## 9.2 Formato inicial

**PvP assíncrono.**

Não começar com tempo real.

Fluxo:

```text
Jogador A publica Defense Team snapshot
↓
Jogador B recebe adversário
↓
Servidor simula confronto
↓
Replay determinístico
↓
MMR atualizado
```

## 9.3 Por que assíncrono

- menor complexidade;
- não exige ambos online;
- matchmaking mais simples;
- melhor para mobile;
- replay auditável;
- aproveita o motor automático;
- funciona mesmo com população inicial pequena.

## 9.4 Defense snapshot

Ao entrar na Liga:

```text
team_snapshot_id
pokemon versions
levels
moves
preset
engine version
created_at
```

Mudanças posteriores não alteram uma batalha já criada.

## 9.5 Matchmaking

Primeira versão:

- MMR;
- faixa de power;
- proteção contra repetir mesmo adversário excessivamente;
- limite de diferença de rating;
- bots/NPCs identificados podem preencher early population se necessário, sem fingir que são humanos.

## 9.6 Tiers e stakes 6x6

A Liga usa batalhas automáticas **6x6** entre equipes próprias. Cada tier possui um stake padrão em PokéCash.

Valores iniciais para simulação econômica:

| Tier | Stake por jogador | Pot bruto | Rake 10% | Payout ao vencedor | Lucro líquido do vencedor |
|---|---:|---:|---:|---:|---:|
| Bronze | 50 PC | 100 PC | 10 PC | 90 PC | +40 PC |
| Silver | 100 PC | 200 PC | 20 PC | 180 PC | +80 PC |
| Gold | 250 PC | 500 PC | 50 PC | 450 PC | +200 PC |
| Platinum | 500 PC | 1.000 PC | 100 PC | 900 PC | +400 PC |
| Diamond | 1.000 PC | 2.000 PC | 200 PC | 1.800 PC | +800 PC |
| Master | 2.500 PC | 5.000 PC | 500 PC | 4.500 PC | +2.000 PC |
| Champion | 5.000 PC | 10.000 PC | 1.000 PC | 9.000 PC | +4.000 PC |

**Todos os valores são parâmetros de balanceamento.** Antes de existir compra de PC-T, revisar completamente essa tabela e remover qualquer equivalência histórica fixa do protótipo entre PC e reais.

### Regra do pot

```text
potGross = stakeA + stakeB
rake = potGross × 10%
winnerPayout = potGross - rake
```

O rake é explícito na UI antes de confirmar a partida. Não criar taxa escondida.

### Proveniência e separação dos pools econômicos

**Não misturar PC-B/PC-C com PC-T no mesmo pot econômico.** A simulação mostrou que a regra v1.1 de permitir B vs T cria uma rota direta para contas combinadas transformarem bônus promocional em valor transferível.

A Liga possui dois pools econômicos com gameplay/MMR potencialmente compartilhados, mas settlement separado:

#### Bonus Competitive Queue

Aceita stake:

```text
PC-B
PC-C
```

- payout permanece PC-B/PC-C, nunca PC-T;
- vitórias e derrotas alimentam `Competitive Profit Account`;
- somente lucro líquido elegível acima de hurdle/HWM pode ser reclassificado B → C;
- é a fila usada para o caminho free-to-play → desempenho → elegibilidade econômica.

#### Transferable Queue

Aceita stake:

```text
100% PC-T
```

- payout permanece PC-T menos rake;
- não recebe PC-B nem PC-C;
- possui gates de conta/segurança/antifraude próprios;
- permanece desabilitada enquanto os gates jurídicos/regulatórios da seção 0.5 não forem satisfeitos.

#### Exemplos Bronze

**A) Transferable: 50 PC-T vs 50 PC-T**

```text
pot = 100 PC-T
rake = 10 PC-T
payout = 90 PC-T
```

**B) Bonus: 50 PC-B vs 50 PC-B**

```text
pot = 100 não transferível
rake = 10 removidos dos buckets não transferíveis
payout = 90 não transferíveis
```

A vitória isolada não transforma a contribuição líquida do adversário em PC-C. A elegibilidade é apurada pelo P&L acumulado conforme Competitive Profit Account.

**C) PC-B vs PC-T**

Não existe na mesma queue econômica. O matchmaking deve selecionar adversário compatível também pelo `economic_pool`.

Essa separação é uma invariante financeira, não uma preferência de UX.

## 9.7 MMR

Usar sistema simples e testado, como Elo-like ou rating adequado a partidas 1v1.

Separar:

- rating oculto/preciso para matchmaking;
- tier visual para experiência.

### Três ratings, nunca misturados

A partir da v1.5 existem **três** avaliações independentes, medindo perícias diferentes:

```text
Arena MMR         previsão dentro da Arena
Calibração        qualidade das previsões declaradas (§6.7), sem stake
Liga MMR          combate 6x6 com time próprio
```

Nenhum alimenta o outro. Prever bem não faz o time lutar melhor, e vencer na Liga não melhora calibração. Misturá-los destruiria o valor informativo dos três.

Não inventar fórmula excessivamente complexa no início.

O stake é consequência do tier, nunca mecanismo para comprar tier.

## 9.8 Temporadas

Duração recomendada para teste:

```text
28 dias
```

Estrutura:

- Week 1: placement/progressão;
- Week 2–3: competição;
- Week 4: fechamento e evento.

Soft reset no fim.

## 9.9 Entrada, pot, rake e Competitive Exchange

### Entrada

Para iniciar uma partida ranqueada 6x6, os dois jogadores precisam reservar o stake do tier.

- matchmaking não cria a luta até ambos terem saldo;
- stake fica reservado antes de gerar o confronto;
- cancelamento técnico legítimo devolve 100%;
- abandono após lock segue regra de derrota/forfeit;
- settlement é atômico e idempotente.

### Rake

Baseline: **10% do pot bruto**.

Funções do rake:

- sink econômico;
- desacelerar concentração de PokéCash;
- criar monetização sistêmica se a operação um dia for legalmente habilitada;
- dificultar transferências artificiais via partidas combinadas.

### Competitive Profit Account e Exchange

O jogador habilidoso pode transformar **parte de lucro competitivo acumulado e elegível** em PC-T, mas existem duas etapas distintas:

1. `PC-B → PC-C`: reclassificação de saldo existente após hurdle + high-water mark;
2. `PC-C → PC-T`: troca com tesouraria, nunca mint.

Baseline para teste fechado:

```text
hurdle_rate = 2,5%
exchange_ratio = 5 PC-C : 1 PC-T
minimum_tier = Gold
minimum_eligible_matches = 40
minimum_unique_opponents = configurável
account_maturity_gate = obrigatório      # tempo de vida da CONTA
age_verification_gate = obrigatório      # idade do JOGADOR (ver cap. 28)
fraud_score_gate = obrigatório
```

Com rake de 10%, o break-even direto do pot exige aproximadamente 55,56% de vitórias. Com hurdle adicional de 2,5% sobre volume elegível, a performance necessária para crescimento esperado do entitlement fica aproximadamente em 56,94% em confrontos equivalentes. O objetivo é premiar skill persistente, não variância de curto prazo.

#### High-water mark

O usuário precisa recuperar perdas anteriores antes de gerar novo lucro elegível. Exemplo:

```text
período A: +200
período B: -150
período C: +100
```

C não deve gerar novo entitlement completo se o acumulado ainda não ultrapassou o pico econômico anterior.

#### Exchange Reserve

A Exchange executa:

```text
burn 5 PC-C do jogador
transfer 1 PC-T de Exchange Reserve → jogador
```

Nunca:

```text
burn 5 PC-C
mint 1 PC-T
```

Fontes baseline da `Exchange Reserve`:

```text
20% da parcela PC-T do rake de Liga
+ 25% da taxa P2P PC-T
+ aportes promocionais explicitamente orçados, se existirem
```

A tesouraria nunca pode ficar negativa.

Indicador:

```text
Exchange Coverage Ratio = reserve PC-T / PC-T solicitado na janela
```

Guardrails iniciais:

```text
> 2,0x       saudável; pode-se estudar melhorar ratio/cap
1,0–2,0x    observação
< 1,0x      reduzir caps; nunca melhorar ratio
```

Se demanda exceder o orçamento, usar cap, liquidação semanal e regra de rateio/fila declarada. O PC-C continua utilizável dentro do jogo enquanto não convertido.

A conversão 3:1 não é baseline. No stress test desta revisão, com a nova regra de lucro líquido + hurdle 2,5%, 5:1 reintroduziu ~2,34% do rake bruto potencial; 3:1 ~3,90%. Ambos só são aceitáveis se financiados por reserva — o ratio não substitui o orçamento.

### Proteções

- conversão considera apenas PC-C efetivamente liquidado;
- partidas contra mesma conta/dispositivo/rede em padrão suspeito podem ficar inelegíveis;
- ganhos sob investigação ficam congelados para conversão/transferência;
- limites por dia/semana;
- tier mínimo;
- conta com 2FA quando valor econômico estiver habilitado;
- KYC/idade conforme exigência do regime aplicável antes de valor monetário real.

## 9.10 Recompensas de temporada

Prioridade:

- badges;
- frames;
- banners;
- efeitos visuais;
- titles;
- skins;
- League Points;
- itens de progressão limitados.

Quanto mais alta a competição, mais cosmética e prestígio; não multiplicar poder permanentemente e criar snowball.

## 9.11 League Shop

Moeda: `League Points`.

Compra:

- cosmetics;
- Balls;
- Candy limitado;
- profile items;
- season collectibles.

Não permitir compra direta de rating/pontos.

## 9.12 Anti-win-trading e proteção econômica

Com stake, PC-T e possibilidade de conversão competitiva, anti-win-trading vira requisito financeiro, não apenas de ranking.

Detectar:

- repetição anormal entre mesmos usuários;
- forfeits sistemáticos;
- múltiplas contas correlacionadas;
- padrões de IP/device suspeitos;
- criação de contas para consumir PC-B e alimentar uma conta principal;
- alternância artificial de vitórias;
- transferências P2P imediatamente após partidas suspeitas;
- conversões PC-C → PC-T fora do padrão;
- manipulação de snapshot;
- concentração de fluxo entre pequenos grupos.

Ações possíveis:

- impedir rematch econômico imediato;
- cooldown entre adversários;
- tornar partida inelegível para PC-C;
- segurar temporariamente PC-T recém-obtido;
- exigir revisão;
- limitar P2P;
- suspender conta.

Servidor é autoritativo e todo fluxo deve ser reconstruível por ledger.

## 9.13 Replays

Cada partida de Liga gera:

- seed;
- engine version;
- team snapshots;
- event log;
- replay visual.

Jogador pode revisar derrota para aprender.

## 9.14 Spectator mode

V5.1, não V5.0 obrigatória.

Permitir observar partidas de ranking alto.

**Não abrir apostas de espectadores em PvP de usuários nessa primeira fase**, pois cria incentivo de manipulação e conflito de interesse. Se isso for estudado no futuro, deve ser projeto separado com controles próprios.

## 9.15 Leaderboards

- Global;
- Friends futuramente;
- por temporada;
- maior streak;
- coleção;
- Arena prediction skill separado de League MMR.

Não misturar habilidade em apostas com força do time.

## 9.16 KPIs V5

- participação em Liga;
- partidas por participante;
- distribuição de tiers;
- espécies mais usadas;
- win rate por espécie;
- diversidade de times;
- churn após derrota;
- retenção de temporada;
- retorno na temporada seguinte.

---

# 10. Economia global

## 10.1 Três moedas no máximo

### PokéCash

Loop da Arena.

### Trainer Coins

Progressão PvE/idle.

### League Points

Competitivo sazonal.

Species Candy é recurso, não moeda global.

## 10.2 Princípio

Cada moeda deve ter:

- fonte clara;
- gasto claro;
- limite de inflação;
- motivo para existir.

Se duas moedas fazem a mesma coisa, remover uma.

## 10.3 PokéCash

### Proveniências

```text
PC-T = transferível
PC-B = bônus/intransferível
PC-C = competitivo, conversível sob regra
```

A UI pode somar para informar poder de jogo, mas sempre deve permitir ao usuário abrir a composição do saldo.

### Faucets PC-B

Fontes rotineiras:

- welcome balance;
- login streak de 7 dias;
- challenges;
- controlled daily grant;
- rescue grant;
- missões selecionadas.

**Orçamento baseline combinado:**

```text
routine_weekly_pc_b_budget <= 80 PC-B por conta
soft_issuance_ceiling = 500 PC-B
```

Os 80 PC-B representam o **máximo agregado** das fontes rotineiras, não 80 de login somados a outros grants ilimitados.

`soft_issuance_ceiling` é teto de **nova emissão**, nunca confisco: ganhos podem levar o usuário acima de 500, mas a conta acima da banda deixa de receber PC-B rotineiro e recebe recompensa substituta (Trainer Coins, Ball, XP ou progresso cosmético) até voltar à banda.

Stress test de 10.000 agentes/52 semanas da revisão 1.2:

- emissão sem teto: oferta PC-B de 2,0 M → ~26,4 M;
- teto 500: oferta final ~5,35 M e mediana ~532;
- com teto 500, ~46,5% do grant nominal precisou ser efetivamente emitido.

Logo, a trilha de 7 dias pode continuar visualmente significativa sem imprimir saldo indefinidamente.

### Faucets PC-T

- compra oficial, quando habilitada;
- P2P recebido (redistribuição; não altera supply agregado antes da fee);
- winnings dentro da `Transferable Queue` (redistribuição menos rake);
- pagamento da Competitive Exchange **a partir de Exchange Reserve existente**.

Nenhum grant gratuito rotineiro gera PC-T.

### PC-C

- não nasce por vitória unitária;
- nasce por **reclassificação B → C** de lucro competitivo acumulado elegível;
- reclassificação não aumenta o saldo total;
- sofre hurdle + high-water mark + mínimo de partidas/tier + antifraude;
- pode ser gasto na Bonus Competitive Queue;
- pode ser debitado pela Exchange em troca de PC-T financiado por tesouraria.

### Sinks e tesouraria

Core sinks:

- margem esperada da Arena, baseline 8%;
- **taxa de mercado mútuo (§6.4)**, sobre o pot bruto, com passivo zero da casa;
- rake bruto da Liga, baseline 10% do pot;
- taxa P2P opcional, baseline 2%;
- event entries;
- prestige/cosmetic wealth sinks;
- utility sinks que não alteram poder competitivo.

Baseline de alocação interna do rake bruto:

```text
70% → permanent sink
20% → Stability / Exchange Reserve
10% → Competitive Season Pool
```

O usuário continua vendo **rake bruto de 10%**; a alocação acima é política de tesouraria. Valores reservados continuam fora da circulação dos jogadores até eventual uso.

Não usar como sink principal:

- taxa escondida;
- cura obrigatória cara;
- energia paga para continuar jogando;
- confisco por inatividade;
- perda permanente de poder;
- alteração silenciosa de rake no meio da temporada.

A margem da Arena, rake competitivo, P2P, grants e Exchange devem ser simulados conjuntamente.

### Recompensa não monetária — o dossiê

O §6 do Estudo Econômico mostra que o teto de emissão de PC-B só funciona se houver algo para dar ao jogador que já acumulou moeda e deixou de receber reposição. A v1.5 nomeia esse algo: **informação**.

O dossiê (§7.12) é a recompensa ideal para essa faixa — desejável, sem inflação, e alinhada ao núcleo do produto. Ele não entra em `ΔM_B` nem em `ΔM_T`, porque não é moeda.

Regra que acompanha: **dossiê não é vendável por dinheiro**. Informação com valor de aposta sendo comprável é pay-to-win econômico.

### Proteção de falência

Jogador zerado não pode ser expulso do produto.

Possíveis mecanismos:

- daily rescue em PC-B;
- streak em PC-B;
- free low-stake rounds;
- missões que geram pequeno PC-B;
- modo espectador que recupera grant por atividade.

Nenhum mecanismo de proteção gera PC-T diretamente.

## 10.3.1 Transferência P2P de PokéCash

Transferência direta usa **somente PC-T liquidado e liberado para transferência**. `PC-T Pending` nunca é elegível para P2P.

Fluxo:

```text
Sender escolhe recipient
→ informa valor
→ sistema mostra valor + eventual fee
→ autenticação reforçada
→ ledger debita sender
→ ledger credita recipient
→ comprovante imutável
```

Regras recomendadas:

- nunca permitir envio de PC-B ou PC-C;
- nunca permitir envio de PC-T Pending;
- compras por meio reversível podem receber `transfer_hold` adicional mesmo após saldo aparecer na conta;
- username/id resolvido no servidor;
- confirmação forte para valor relevante;
- 2FA quando a feature tiver valor econômico;
- limite diário/semanal por conta e maturidade;
- cooldown para conta recém-criada;
- transferências irreversíveis após liquidação, salvo procedimento administrativo excepcional;
- memo opcional sem chat livre;
- rate limit;
- antifraude e detecção de fluxo circular;
- bloqueio de transferência de saldo sob investigação.

### Taxa de transferência

Parâmetro opcional:

```text
p2p_fee_rate = 0% a 5%
```

Baseline de teste sugerida: **2% queimado**, ajustável. Não somar taxas sem medir fricção; a Liga já possui rake de 10%.

### RMT

A existência de PC-T transferível cria tecnicamente a possibilidade de negociação entre jogadores. A plataforma **não deve prometer preço, liquidez ou conversão para reais** no protótipo.

Se no futuro o produto quiser intermediar venda, escrow, marketplace, cash-out ou precificar oficialmente PC-T em moeda fiduciária, isso passa a ser um módulo financeiro/regulatório separado, e não uma simples feature social.

## 10.4 Trainer Coins

Faucets:

- expeditions;
- PvE;
- missions;
- achievements.

Sinks:

- evolução;
- facility upgrades;
- crafting;
- consumíveis;
- cosmetics internos.

## 10.5 Simulador econômico

Antes de cada release com economia:

Simular perfis:

- casual;
- mediano;
- hardcore;
- azarado;
- muito eficiente.

Horizontes:

```text
7 dias
30 dias
90 dias
180 dias
```

Métricas:

- saldo médio;
- p10/p50/p90;
- tempo até zerar;
- recursos acumulados;
- tempo até evolução;
- velocidade de coleção;
- concentração de riqueza.

## 10.6 Constituição monetária — invariantes

Estas regras existem para impedir que um erro de LiveOps transforme recompensa em inflação sistêmica:

```text
1. PC-T nunca nasce sem source permitido.
2. Transferência P2P é soma zero antes da fee.
3. pot = payout + rake.
4. B → C é reclassificação, não mint.
5. C → T debita Exchange Reserve T.
6. reward gratuito nunca gera T diretamente.
7. PC-B/PC-C e PC-T não compartilham pot econômico.
8. nenhum reserve pode ficar negativo.
9. alteração de parâmetros econômicos é versionada.
10. reconciliação do ledger precisa reproduzir 100% do supply.
```

## 10.7 Rake — resultado quantitativo

Para stake simétrico `S`, rake `r` e probabilidade de vitória `p`:

```text
EV/S = 2(1-r)p - 1
p_break_even = 1 / [2(1-r)]
```

Sensibilidade:

| Rake | Win rate de break-even |
|---:|---:|
| 5% | 52,63% |
| 7,5% | 54,05% |
| 8% | 54,35% |
| **10%** | **55,56%** |
| 12,5% | 57,14% |
| 15% | 58,82% |

**Hipótese de produto a testar:** matchmaking por skill tende a aproximar o jogador de 50% de win rate; portanto 10% pode gerar erosão perceptível do bankroll. Fazer A/B econômico simulado 7,5% vs 10% antes de habilitar valor real.

## 10.8 Bankroll e risco de quebra

Monte Carlo da revisão 1.2: 300.000 trajetórias por cenário, Bronze 50, rake 10%, 20 partidas, WR 50%, sem faucets durante a janela.

| Bankroll inicial | Probabilidade de terminar sem 1 stake Bronze |
|---:|---:|
| 200 (4 stakes) | 56,6% |
| 300 (6) | 32,9% |
| 400 (8) | 16,2% |
| **500 (10)** | **6,35%** |
| 600 (12) | 1,18% |

Referência UX/econômica:

```text
healthy_bankroll_reference = 10 × tier stake
```

Não precisa ser bloqueio duro. Abaixo da referência, priorizar informação de risco, practice/free modes e rescue controlado, sem induzir recompras impulsivas.

## 10.9 Dashboard de política monetária

Monitorar diariamente/semanalmente:

```text
M_T / DAU e WAU
M_B / DAU e WAU
M_C / DAU e WAU
faucets e sinks por proveniência
Arena volume / edge realizado
League volume / rake
P2P volume / fee
Exchange requested / paid / pending
p10 / p50 / p90 de saldo
Gini PC-T
share top 1% / top 10%
% abaixo de 1 e 5 stakes Bronze
```

Velocidade:

```text
Velocity_T = volume PC-T / PC-T médio em circulação
Velocity_B = volume PC-B usado / PC-B médio
```

Razão faucet/sink:

```text
FSR_B = faucets_B / sinks_B
FSR_T = faucets_T / sinks_T
```

Enquanto não houver mercado aberto, usar também:

```text
Monetary Overhang Index = saldo mediano jogável / stake Bronze
```

Oferta total pode crescer com aquisição de usuários; o sinal de alerta é crescimento persistente **por usuário ativo**, aumento de overhang e perda de significado de stakes/recompensas.

## 10.10 Guardrails de LiveOps

Não microgerenciar a economia diariamente. Trabalhar por bandas e revisar em fechamento de temporada.

Se PC-B acumular:

1. substituir parte de grants por itens/XP/Trainer Coins;
2. ativar sinks de prestígio;
3. reduzir emissão futura;
4. não aumentar rake como primeira resposta.

Se jogadores quebrarem cedo:

1. rescue dentro do orçamento semanal;
2. practice/free low-stake;
3. revisar Bronze stake;
4. somente depois revisar rake.

Se PC-T crescer rápido demais por WAU:

1. reduzir budget/caps da Exchange;
2. reforçar prestige sinks;
3. manter maior parcela do rake em sink;
4. evitar grants de PC-T.

Se PC-T ficar excessivamente escasso:

1. liberar Stability Reserve de forma orçada;
2. reduzir sinks opcionais;
3. revisar rake apenas em virada de temporada.

## 10.11 Sinks de riqueza

Jogadores ricos precisam de destinos voluntários de alto ticket:

- arena themes;
- profile frames;
- trainer outfits;
- KO/entrance effects;
- seasonal trophies;
- collection showcase upgrades;
- cosmetic auctions/event bids;
- naming/status/prestige features sem vantagem competitiva.

O objetivo é remover excesso de riqueza por **desejo de status**, não por punição.

## 10.12 Recursos secundários

- `Trainer Coins`: não transferíveis; sinks progressivos em evolução, facilities, crafting e consumíveis.
- `League Points`: recurso sazonal com reset forte; carryover máximo sugerido 0–20%; nunca converte em PC-T.
- `Species Candy`: inflação localizada por espécie; sink em evolução/mastery.
- Poké Balls e consumíveis: item sinks naturais.

## 10.13 Critérios de estabilidade antes de valor econômico externo

Exigir ao menos uma temporada fechada de teste demonstrando:

1. ledger reconciliado 100%;
2. nenhum caminho B → T fora da Exchange;
3. Economy Dashboard em produção;
4. supply e FSR reproduzíveis pelo simulador;
5. Exchange Reserve nunca negativa;
6. testes de sybil/win-trading/botting;
7. taxa de jogadores sem stake dentro da banda definida;
8. concentração PC-T monitorada;
9. stress test de pelo menos 10× volume previsto;
10. política formal de alteração econômica por temporada.

---

# 11. Monetização futura — arquitetura, não lançamento

## 11.1 Regra atual

Nenhuma monetização real é requisito de V1–V5 para validar gameplay.

Se for adicionada enquanto Pokémon permanecer tema, fazer checkpoint específico antes de publicação comercial.

## 11.2 Categorias preferíveis

Quando permitido:

- skins;
- arena themes;
- trainer outfits;
- profile banners;
- KO effects;
- entrance effects;
- emotes;
- battle pass;
- convenience cuidadosamente limitada.

## 11.3 Limites de monetização

Evitar como pilar:

- comprar chance maior de vencer Arena;
- comprar MMR;
- comprar vitória;
- loot box paga sem transparência;
- recompra impulsiva de saldo para recuperar perdas como loop central.

Features de alto risco que existem na visão, mas ficam atrás de gate próprio:

- compra de PC-T;
- transferência P2P de PC-T;
- Competitive Exchange PC-C → PC-T;
- marketplace/RMT intermediado;
- cash-out oficial.

Essas features não devem ser confundidas com monetização cosmética comum.

## 11.4 Season Pass conceitual

Trilha Free + Premium.

Progresso vem de todas as áreas:

- Arena;
- capture;
- idle;
- PvE;
- League.

Premium deve entregar principalmente cosméticos/colecionáveis.

## 11.5 Unit economics — regra de caixa e metas de viabilidade

A economia da empresa deve ser separada da economia monetária do jogo.

### Regra contábil de produto

`rake`, `house edge` e `P2P fee` em PokéCash são **sinks de moeda**, não nova receita em reais no momento em que ocorrem. Se um jogador compra PC-T e posteriormente parte desse saldo é queimado, o caixa já entrou na compra original. O valor do sink é preservar escassez e criar necessidade de recompra futura.

Consequência: não somar simultaneamente “venda de PC-T” e “rake equivalente em reais” como receitas independentes.

### Baseline de simulação empresarial v1.3

Parâmetros de planejamento, não metas garantidas:

```text
reference_price = 10 PC por R$ 1 (somente modelagem)
PC-T economic active rate = 8% dos MAU
replenishment_rate = 80% do PC-T destruído
Season Pass attach = 4%
Season Pass price = R$ 29,90
direct cosmetics attach = 2%
base gross ARPMAU ≈ R$ 3,90
base contribution / MAU ≈ R$ 3,12
```

Com estrutura fixa ilustrativa de R$ 75 mil/mês, o cenário Base exigiu aproximadamente **24 mil MAU** para break-even. Esse resultado é altamente sensível a retenção, preço implícito do PC-T, payer conversion, fraude, tributos e reposição de saldo.

### Metas de validação antes de escalar aquisição

```text
Gross ARPMAU >= R$ 3,50–4,00
Contribution / MAU >= R$ 2,80–3,20
PC-T economic active >= 7–8% MAU
Season Pass attach >= 3–4%
Exchange Coverage >= 2x
LTV/CAC >= 3x antes de escalar paid acquisition
```

### Regra de aquisição

Não definir CAC máximo com benchmark externo antes de existir coorte real. Calcular `LTV30`, `LTV90`, `LTV180` e `LTV12m` por coorte e só escalar mídia quando a margem de contribuição justificar o CAC. O metagame Collection → Idle → Team → League é parte do modelo financeiro porque aumenta vida útil e LTV, não apenas profundidade de gameplay.

### Estrutura de receitas preferida

1. compra de PC-T, quando juridicamente habilitada;
2. Season Pass;
3. cosméticos/conteúdo de status;
4. conveniência limitada que não compra vantagem competitiva.

A empresa não deve depender exclusivamente de aumentar rake ou erosão de bankroll para crescer receita.

### Pagamentos e risco

- incentivar meios com menor custo/menor reversibilidade quando permitido;
- controlar ticket mínimo para evitar custo fixo de processamento desproporcional;
- manter `PC-T Pending`/transfer hold para compras sujeitas a chargeback;
- contabilizar fraude, refunds, suporte e ferramentas de risco como custo variável da economia transferível.

---

# 12. UX — mapa completo de telas

## Core

1. Landing/Login
2. Home/Lobby
3. Arena
4. Result
5. Profile
6. Wallet/History
7. Challenges
8. Fairness/Verify Round

## V2

9. Pokédex
10. My Collection
11. Pokémon Detail
12. Capture
13. Inventory

## V3

14. Trainer Base
15. Training Center
16. Expedition Board
17. Expedition Detail
18. Research/Evolution
19. Activity Claim

## V4

20. Team Builder
21. Pokémon Build
22. Kanto Map
23. PvE Battle
24. Gym Result

## V5

25. League Home
26. Matchmaking
27. League Battle Replay
28. Leaderboard
29. Season Rewards
30. League Shop

## Admin

31. Operations Dashboard
32. Rounds
33. Users
34. Wallet Audit
35. Economy Metrics
36. Content Config
37. Feature Flags
38. Engine Versioning

---

# 13. Notificações

In-app primeiro.

Possíveis gatilhos:

- expedition finished;
- training finished;
- daily reset;
- new season;
- League reward available;
- rare event active.

Push notification somente com opt-in.

Não notificar a cada round.

---

# 14. Social

Arquitetura deve permitir:

- friends;
- profile visit;
- clubs/guilds;
- private rooms;
- shareable replays;
- collection showcase;
- challenge a friend.

### P2P econômico

Transferência de PC-T deixa de ser apenas backlog social e passa a integrar a arquitetura econômica, embora permaneça feature-flagged até os gates correspondentes.

A tela de perfil pode ter “Enviar PokéCash” somente quando:

- destinatário for válido;
- feature estiver habilitada para ambos;
- conta cumprir requisitos de segurança;
- saldo for PC-T;
- limites e antifraude aprovarem.

Evitar chat aberto cedo por custo de moderação.

---

# 15. Conteúdo e LiveOps

## 15.1 Content Pack

Cada release do conteúdo possui versão:

```text
pokemon_kanto_1.0.0
```

Contém:

- species;
- types;
- moves;
- animations;
- encounter tables;
- capture rates;
- PvE configs.

## 15.2 Engine version

Separada do conteúdo:

```text
arena_engine_1.2.3
trainer_engine_0.4.0
```

Uma rodada registra ambas.

## 15.3 Feature flags

Exemplos:

```text
capture_enabled
idle_enabled
league_enabled
weather_enabled
season_pass_enabled
p2p_transfer_enabled
league_stake_enabled
competitive_exchange_enabled
real_value_pokecash_enabled
cashout_enabled
```

## 15.4 Eventos

Após base estável:

- Fire Week;
- Water Festival;
- Safari Event;
- Gym Challenge;
- Double Trainer XP;
- rare encounter weekends.

Eventos nunca podem alterar odds secretamente. Qualquer mudança de Arena deve entrar no modelo probabilístico e ser versionada.

---

# 16. Segurança e integridade

> Este capítulo trata de proteger o sistema e a empresa. A proteção do **jogador** — idade, limites, autoexclusão, detecção de padrão de risco — está no capítulo 28 e é requisito da V1.

## 16.1 Nunca confiar no cliente

Cliente não determina saldo ou resultado.

## 16.2 Idempotência

Obrigatória em:

- bet placement;
- settlement;
- capture;
- claim;
- evolution;
- League match result.

## 16.3 Rate limits

Aplicar a:

- login;
- aposta;
- capture;
- claim;
- matchmaking;
- sensitive admin.

## 16.4 Auditoria

Registrar:

- wallet changes por proveniência;
- origem de cada stake;
- rake;
- PC-C gerado;
- conversões PC-C → PC-T;
- transferências P2P;
- taxas P2P;
- admin adjustments;
- engine versions;
- content changes;
- League outcomes;
- suspicious actions;
- origem do pagamento que criou PC-T;
- transições PC-T Pending → PC-T;
- chargebacks/estornos e saldo afetado;
- transfer holds e liberações.

## 16.4.1 Integridade financeira do ledger

Invariantes adicionais:

- PC-B nunca aparece como P2P_TRANSFER_OUT;
- PC-C nunca aparece como P2P_TRANSFER_OUT antes de conversão;
- toda criação de PC-T possui origem permitida;
- PC-T Pending nunca aparece em P2P_TRANSFER_OUT ou stake da Transferable Queue;
- clearance de PC-T Pending é rastreável ao pagamento de origem;
- chargeback não pode criar saldo negativo silencioso nem apagar proveniência histórica;
- soma do pot = payout + rake em cada luta;
- rake nunca é negativo;
- conversão respeita ratio e cap vigentes no instante da operação;
- transferência não pode gerar saldo;
- operação repetida com mesma idempotency key não duplica efeito.

## 16.5 Saves

Nunca depender apenas de `localStorage` após V1.

Local storage pode conter:

- preferências visuais;
- cache;
- áudio;
- onboarding status não crítico.

---

# 17. Telemetria completa

## Aquisição

```text
signup_started
signup_completed
first_round_viewed
first_bet
purchase_started
purchase_completed
purchase_failed
pc_t_pending_created
pc_t_cleared
chargeback_received
```

## Arena

```text
round_viewed
fighter_detail_opened
bet_confirmed
bet_changed
battle_watched_25
battle_watched_50
battle_watched_100
result_viewed
```

## Collection

```text
species_seen
capture_opportunity
capture_attempt
capture_success
collection_opened
species_favorited
```

## Idle

```text
training_started
training_claimed
expedition_started
expedition_claimed
evolution_completed
```

## PvE

```text
team_saved
pve_started
pve_won
pve_lost
gym_completed
```

## League

```text
league_entered
league_match_started
league_match_finished
league_stake_reserved
league_rake_charged
league_competitive_reward
competitive_exchange_completed
p2p_transfer_sent
p2p_transfer_received
tier_changed
season_reward_claimed
```

## Business / Monetization

```text
gross_cash_revenue
net_revenue
arp_mau
arp_dau
payer_conversion
arppu
pc_t_purchase_revenue
season_pass_revenue
cosmetic_revenue
replenishment_rate
fraud_loss_rate
refund_rate
processor_cost_rate
support_cost_per_mau
contribution_margin
```

## Proteção do jogador

```text
age_declaration_submitted
age_verification_passed
age_verification_failed
limit_set
limit_increase_requested
limit_increase_applied
limit_decrease_applied
limit_blocked_action
reality_check_shown
reality_check_acknowledged
session_limit_reached
cooloff_started
self_exclusion_started
self_exclusion_expired
self_exclusion_reentry_blocked
risk_signal_raised
risk_intervention_shown
net_position_viewed
rescue_grant_issued
rescue_grant_blocked_by_policy
```

Campos obrigatórios nestes eventos: `user_id`, `signal_type`, `window`, `limit_type`, `limit_value`, `action_blocked`, `intervention_id`. Nenhum destes eventos pode ser amostrado — são registro de conformidade, não métrica de produto.

## Retention

Coortes:

- D1;
- D3;
- D7;
- D14;
- D30.

Segmentar por primeira feature usada.

---

# 18. Métrica Norte

Não usar somente quantidade apostada.

Sugestão:

**Meaningful Active Trainers / week**

Treinador significativo = usuário que em uma semana realiza pelo menos duas categorias de atividade, por exemplo:

- Arena + Collection;
- Arena + Idle;
- Collection + PvE;
- PvE + League.

O objetivo é provar que existe ecossistema, não apenas clique em aposta.

---

# 19. Critérios de qualidade por release

Cada release precisa de:

## Functional

Todos acceptance tests.

## Statistical

Resultados coerentes com probabilidades.

## Economy

Simulação de inflação/sinks.

## Performance

Mobile e desktop aceitáveis.

## Recovery

Refresh/reconnect seguro.

## Observability

Logs + métricas.

## Regression

Arena anterior intacta.

---

# 20. Ordem prática de desenvolvimento

## Etapa A — agora

1. Corrigir odds/clima.
2. Criar round seed raiz.
3. Modularizar.
4. Criar testes.
5. Extrair Kanto para Content Layer.
6. Dimensionar o Monte Carlo pela cauda e restaurar a suavização de Laplace (§4.4).
7. Implementar tetos de payout e de passivo por rodada (§4.4.6).
8. Enviar a consulta de enquadramento da §0.5.1 — é entrada de arquitetura, não item final.

> Os itens 6 a 8 são novos na v1.4. Os três são baratos agora e caros depois: 6 e 7 mexem no caminho de precificação e de confirmação de aposta, e 8 pode reordenar toda a Etapa B.

## Etapa B — V1

6. Backend.
7. Auth.
8. DB.
9. Wallet ledger.
10. Round scheduler.
11. WebSocket.
12. Settlement.
13. Multiplayer sync.
14. Admin mínimo.
15. Telemetria.

## Etapa C — V2

16. Species persistence.
17. Pokédex.
18. Capture opportunities.
19. Inventory/Balls.
20. Collection UI.
21. Mastery.

## Etapa D — V3

22. Pokémon instances.
23. Training.
24. Expeditions.
25. Trainer Coins.
26. Evolution/families.
27. Economy simulator.

## Etapa E — V4

28. Trainer Battle Engine.
29. Team Builder.
30. Tactical presets.
31. PvE journey.
32. Gyms.
33. Elite Four.

## Etapa F — V5

34. Team snapshots.
35. Async matchmaking.
36. MMR.
37. Seasons.
38. Leaderboards.
39. Competitive rewards.
40. Tier stakes + 10% rake.
41. Provenance-aware League settlement.
42. PC-C Competitive Exchange.
43. P2P PC-T transfer service.
44. Anti-win-trading financeiro.
45. Regulatory/security feature gates.
46. Competitive Profit Account + HWM/hurdle.
47. Exchange Reserve e treasury accounting.
48. Economy Dashboard + monetary guardrails.
49. Bonus/Transferable economic queue separation.
50. Automated economic stress-test CI.

---

# 21. O que explicitamente NÃO fazer agora

Para controlar escopo:

- multiplayer PvP real-time;
- trading de Pokémon;
- marketplace/RMT oficial antes de gate jurídico;
- breeding complexo;
- IV/EV/Natures completos;
- centenas de equipamentos;
- guild wars;
- open world;
- chat público;
- aposta de espectadores em PvP de usuários;
- cash-out real;
- saque/cash-out oficial antes de gate jurídico;
- dezenas de mercados de aposta;
- mobile app nativo antes de validar web/PWA;
- expansão para várias gerações antes de Kanto funcionar.

---

# 22. Decisões de design que devem permanecer separadas

## Arena Strength != Owned Pokémon Strength

Regra absoluta.

## Arena MMR != Calibração != League MMR

Três perícias distintas, três avaliações que nunca se alimentam (§9.7). Previsão dentro da Arena, qualidade de previsão declarada, e combate com time próprio.

## Informação != Probabilidade

O dossiê muda o que o jogador **sabe**, nunca o que **acontece**. É esta separação que permite o metagame inteiro existir sem ferir P4, e ela precisa ter teste dedicado, não apenas intenção.

## Preço do modelo != Preço do mercado

Nos mercados mútuos, o preço que o bolo forma e o preço que o modelo calcula são coisas diferentes, e o segundo só é publicado depois da liquidação (§6.6). Publicar antes faz o mercado convergir para ele e destrói a perícia que o mercado existe para criar.

## Doce de espécie != Valor apostado

O doce é função de a espécie ter vencido e de ter havido aposta. O valor apostado não entra na fórmula (§7.8). Escalar com valor transformaria criar Pokémon em motivo para apostar mais alto.

## PokéCash != Trainer Coins

Evita que perder apostas destrua progressão do treinador.

## PC-T != PC-B != PC-C

São proveniências distintas da mesma moeda visual. Nenhuma operação pode apagar essa origem.

## Free Reward != Transferable Value

Login, desafios e rescue grants geram PC-B. O caminho até PC-T exige valor já transferível vindo de outro participante ou Competitive Exchange controlada.

## Capture RNG != Battle RNG

Seeds e audit trails distintos.

## Content version != Engine version

Permite balancear sem apagar histórico.

---

# 23. Hipóteses que precisam ser testadas

H1. A batalha automática é divertida de assistir repetidamente.

H2. 30 segundos é uma janela adequada para decidir a aposta.

H3. Odds e informação de espécies fazem o usuário sentir que existe decisão.

H4. Collection aumenta retorno.

H5. Captura ligada à Arena aumenta número de rounds por sessão.

H6. Idle aumenta D7 sem virar obrigação.

H7. Usuários se importam em montar time.

H8. PvE ensina estratégia suficiente para gerar interesse em League.

H9. League aumenta D30.

H10. O produto continua interessante quando o usuário não está focado apenas na aposta.

H11. Stake por tier aumenta significado competitivo sem causar churn excessivo.

H12. Rake bruto de 10% é sustentável para participação/MMR ou 7,5% produz melhor retenção sem perder controle monetário.

H13. Orçamento rotineiro agregado de até 80 PC-B/semana + soft issuance ceiling de 500 sustenta casual sem criar overhang persistente.

H14. Competitive Profit Account (hurdle 2,5% + HWM) + Exchange Reserve tornam 5:1 sustentável sem mint de PC-T.

H15. P2P de PC-T aumenta valor social sem tornar fraude/win-trading dominante.

H16. Separar Bonus Competitive Queue e Transferable Queue bloqueia a principal rota de laundering entre bônus e valor transferível.

H17. Wealth sinks voluntários removem excesso de saldo de jogadores ricos com menos dano à retenção que sinks punitivos.

H18. PC-T Pending + transfer hold reduz perda por chargeback sem prejudicar excessivamente conversão e ativação.

H19. Season Pass e cosméticos conseguem elevar ARPMAU sem exigir aumento de rake.

H20. O cenário de negócio somente sustenta aquisição paga quando retenção gera LTV/CAC >= 3x; monetização inicial sem retenção não basta.

---

# 24. Teste decisivo do produto

O teste mais importante não é faturamento inicial.

É observar a evolução do motivo de entrada:

### Estado 1

> “Entrei para apostar.”

### Estado 2

> “Entrei porque quero capturar Gengar.”

### Estado 3

> “Entrei para coletar minha expedição e melhorar meu time.”

### Estado 4

> “Entrei porque quero subir para Diamond antes da temporada acabar.”

Quando jogadores chegam ao Estado 4, PokéArena deixou de ser somente um simulador de apostas e virou um jogo persistente.

---

# 25. Definição resumida de cada release

## v0.9 — Foundation

> “Consigo confiar no motor?”

Saída: engine reproduzível, odds coerentes, código modular e testável.

## V1 — Arena Online

> “Consigo jogar a mesma Arena com outras pessoas?”

Saída: backend, round global, wallet, auth, sync e settlement.

## V2 — Mercados Mútuos e Previsão

> “Consigo ficar melhor nisso?”

Saída: motor de apuração mútua, mercado de abates, preço do modelo publicado após a liquidação, pontuação de calibração e Liga de Previsão.

## V3 — Coleção, Criação e Informação

> “Tenho motivo para querer espécies específicas, e o que eu crio importa?”

Saída: Pokédex com peso econômico, captura da forma base, evolução como escolha, moveset escolhido com comparador, dossiê, e expedições como pesquisa.

## V4 — Time e Jornada

> “Estou aprendendo a ler o jogo?”

Saída: Trainer Battle Engine, team builder, probabilidade exibida antes do combate, e ginásios que ensinam uma interação cada.

## V5 — Liga

> “Tenho motivo para continuar jogando por meses?”

Saída: Liga de Equipe, seasons, ranking, e a economia competitiva com seus gates.

---

# 25.1 Checkpoint econômico/regulatório antes de valor real

A arquitetura acima pode ser desenvolvida e testada integralmente com moeda simulada. Porém, antes de habilitar dinheiro real ou valor econômico resgatável/negociável, realizar revisão específica do modelo completo — não apenas da tela de pagamento.

O review precisa considerar em conjunto:

- PC-T comprável;
- stake 6x6;
- pot entre usuários;
- rake da plataforma;
- transferência P2P;
- Competitive Exchange + Exchange Reserve;
- separação Bonus/Transferable queues;
- possibilidade de RMT;
- eventual cash-out;
- KYC e idade;
- AML/monitoramento transacional;
- fraude e múltiplas contas;
- tributação;
- propriedade intelectual Pokémon;
- unit economics, CAC/LTV e custo de fraude/chargeback;
- política de PC-T Pending/transfer hold por meio de pagamento;
- verificação de idade e barreira efetiva a menores;
- limites, pausa e autoexclusão em produção e auditáveis (cap. 28);
- registro de intervenções de risco e capacidade de comprovar que existiram;
- custo recorrente de conformidade refletido no P&L.

**Regra de release:** nenhuma dessas features com valor monetário real pode ser liberada apenas porque funciona tecnicamente.

---

# 26. Visão final do produto

```text
                         ┌─────────────────┐
                         │     SEASONS     │
                         │ League / Rank   │
                         └────────┬────────┘
                                  │
                       ┌──────────▼──────────┐
                       │   TRAINER BATTLES   │
                       │ Team / Gyms / PvE  │
                       └──────────┬──────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │       TRAINER IDLE        │
                    │ Training / Expeditions   │
                    └─────────────┬─────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │    COLLECTION     │
                        │ Capture / Pokédex │
                        └─────────┬─────────┘
                                  │
                         ┌────────▼────────┐
                         │      ARENA      │
                         │ Bet / Watch /   │
                         │ Result / Repeat │
                         └─────────────────┘
```

A Arena continua sendo a porta de entrada. As demais camadas existem para transformar atenção de curto prazo em progressão, estratégia, identidade e competição de longo prazo.

---

# 26.1 Premissas externas verificadas para planejamento (18/08/2026)

Estas referências **não são requisitos de arquitetura** e devem ser revalidadas antes de lançamento/comercialização:

- Stripe Brasil: cartões nacionais 3,99% + R$ 0,39; Pix 1,19% (sujeito à disponibilidade/eligibilidade indicada pela Stripe); tarifa de contestação recebida R$ 55, conforme página pública de preços consultada em 18/08/2026.
- Apple App Store Small Business Program: comissão reduzida de 15% para participantes elegíveis.
- Google Play: o tier de serviço de 15% para o primeiro US$ 1 milhão ainda aparece na documentação atual; o Google também anunciou mudanças/programas com vigência a partir de 30/09/2026, portanto qualquer lançamento nativo posterior precisa revalidar o fee aplicável.
- Cloudflare Workers Standard: mínimo de US$ 5/mês, 10 milhões de requests e 30 milhões de CPU-ms incluídos, conforme documentação de julho/2026.

Esses números servem apenas para sensibilidades de custo. O projeto não deve ficar acoplado a um fornecedor ou fee específico.

---

# 27. Regra final de escopo

A equipe pode desenhar V1–V5 por completo desde já, mas deve **implementar verticalmente**.

Não iniciar desenvolvimento substancial da próxima camada sem que a anterior tenha:

1. dados reais de uso;
2. bugs críticos resolvidos;
3. economia observável;
4. telemetria;
5. uma hipótese clara que a próxima versão pretende resolver.

Ter a visão completa agora é uma vantagem. Tentar construir tudo agora seria um risco.


---

# 28. Proteção do jogador e jogo responsável

Capítulo novo na v1.4. Até a v1.3, o conjunto de documentos não continha uma única ocorrência de "jogo responsável", "autoexclusão", "limite de depósito" ou "reality check", e mencionava idade/KYC sete vezes somadas — sempre como gate adiado, nunca como desenho.

## 28.1 Princípio e escopo

```text
Proteção do jogador é requisito da V1.
Não é requisito da versão que tiver dinheiro real.
```

A regra vale mesmo enquanto a moeda for simulada, por três razões:

1. **Dependência técnica.** Limites e autoexclusão exigem identidade estável, ledger com proveniência, bloqueio de feature por conta e agregação por janela temporal. Tudo isso nasce na V1. Retrofitar depois significa reescrever caminho de aposta, matchmaking, Exchange e P2P em produção, com saldo real.
2. **Calibração.** As janelas, os limiares e os sinais de risco só ficam úteis depois de meses de dados. Começar a coletar na V1 é o que permite que o sistema esteja calibrado quando o valor econômico for habilitado.
3. **Hábito do produto.** Um jogo que ensina o jogador a apostar sem limites durante a fase simulada não consegue introduzir limites depois sem que pareçam punição.

Fora do escopo deste capítulo: enquadramento regulatório (§0.5 e §0.5.1) e desenho de KYC/AML financeiro (§25.1). Este capítulo trata do que o produto faz, não do que a lei exige — as duas coisas devem convergir, mas a primeira não deve esperar pela segunda.

## 28.2 Verificação de idade

```text
age_declaration_gate      = V1   (declaração + data de nascimento, sem verificação)
age_verification_gate     = obrigatório antes de qualquer valor econômico real
minimum_age               = parâmetro por jurisdição
```

Na V1, com moeda simulada, a barreira é declaratória: data de nascimento no cadastro, armazenada, e bloqueio de conta abaixo da idade mínima. Um checkbox de "declaro ser maior" **não** atende — precisa ser data, para que a conta possa ser reavaliada quando a política mudar.

Regras:

- data de nascimento é imutável pelo usuário após o cadastro; alteração só por procedimento administrativo registrado;
- conta bloqueada por idade não é apagada — é congelada, para que a barreira não seja contornada recriando cadastro;
- antes de habilitar compra de PC-T, stake transferível ou P2P, a declaração precisa ser substituída por verificação documental;
- nenhuma feature econômica pode ficar acessível a conta com idade não verificada quando `age_verification_gate` estiver ativo.

## 28.3 Limites definidos pelo jogador

Todos disponíveis desde a V1, todos opcionais para o jogador e todos obrigatórios para o produto oferecer:

| Limite | Janela | Observação |
|---|---|---|
| `max_stake_per_round` | por rodada | interage com o teto de payout do §4.4.6 |
| `max_loss` | dia / semana / mês | perda **líquida**, não volume apostado |
| `max_rounds` | dia | controla exposição por frequência, não por valor |
| `max_session_time` | sessão | dispara encerramento, não apenas aviso |
| `max_deposit` | dia / semana / mês | só existe quando houver compra de PC-T |

**A assimetria é a parte que importa:**

```text
reduzir limite  -> efeito imediato
aumentar limite -> pedido registrado + cooldown de 24 h + confirmação ativa
remover limite  -> tratado como aumento
```

Sem essa assimetria o limite não protege ninguém: o jogador em perseguição de perda simplesmente o eleva no momento em que ele deveria segurar. O cooldown existe para separar a decisão do impulso, e por isso não pode ser encurtado por suporte, promoção ou evento.

Quando um limite bloqueia uma ação, a UI diz **qual** limite, **quanto** falta e **quando** volta. Nunca falha em silêncio e nunca oferece um caminho alternativo de gasto na mesma tela.

## 28.4 Pausa e autoexclusão

```text
cooloff      = 24 h | 72 h | 7 d          reversível apenas pelo decurso do prazo
self_exclusion = 30 d | 90 d | 180 d | permanente
```

Durante o período, ficam bloqueados:

- apostar na Arena;
- stake de Liga em qualquer fila;
- compra de PC-T;
- P2P — enviar **e receber**;
- Competitive Exchange;
- recebimento de faucets econômicos (login streak, desafios, rescue grant).

Continuam acessíveis, em leitura: coleção, Pokédex, perfil, histórico e carteira. O objetivo é interromper o loop econômico sem apagar o vínculo com o jogo — apagar a coleção transformaria a autoexclusão em punição e reduziria a adesão.

Regras não negociáveis:

- **irreversível durante o período.** Nenhum canal — suporte, admin, promoção — encurta autoexclusão;
- vale por **pessoa**, não por conta: o bloqueio propaga para contas ligadas por sinal de identidade;
- ao expirar, a reentrada é ativa (o jogador precisa pedir), nunca automática;
- nenhuma comunicação de marketing durante o período, em nenhum canal;
- pedido de autoexclusão nunca pode disparar oferta de retenção. Isso precisa estar escrito porque é exatamente o que um funil de retenção otimizado faria sozinho.

## 28.5 Reality check e honestidade do resultado

```text
reality_check_interval = 30 min de sessão ativa   # parâmetro
```

O aviso mostra tempo de sessão e **resultado líquido da sessão**, e exige confirmação para continuar.

Esta seção tem uma exigência específica deste produto:

> **Vitória exibida precisa ser vitória econômica.**

O PokéArena tem tela de campeão, confete, troféu, KillFeed e pódio. É espetáculo bem construído — e é exatamente o mecanismo que, em jogos de aposta, produz *perda disfarçada de ganho*: o jogador recebe 60 PC de retorno numa aposta de 100 e a tela comemora.

Regras:

- retorno menor que o valor apostado **nunca** aciona a coreografia de vitória;
- o valor exibido na tela de resultado é o **líquido** (`retorno - aposta`), com o bruto em segundo plano;
- carteira e perfil mostram posição líquida em 7 e 30 dias, com o mesmo destaque dado a ganhos;
- nenhum contador de "sequência de vitórias" pode ignorar o saldo líquido do período.

## 28.6 Detecção de padrão de risco

Sinais mínimos, avaliados por janela e por conta:

```text
chasing            aumento de stake após perda, em sequência
velocity           rodadas por hora acima da banda usual da própria conta
session_length     sessões longas sem interrupção
depth              stake como fração do saldo disponível
recovery_deposit   compra de PC-T logo após perda relevante
odd_hour           deslocamento sistemático do horário de jogo
limit_pressure     pedidos repetidos de aumento de limite
```

A base é o comportamento **da própria conta ao longo do tempo**, não uma média populacional — o objetivo é detectar mudança, não classificar perfil.

Escala de intervenção, sempre nesta ordem:

1. informação passiva (posição líquida em destaque);
2. reality check antecipado;
3. sugestão de limite, pré-preenchida com valor coerente com o histórico;
4. cool-off oferecido;
5. restrição temporária aplicada pelo sistema, com registro e revisão humana.

Toda intervenção é registrada com `intervention_id`, sinal que a disparou e desfecho. Sem esse registro não há como demonstrar depois que o sistema agiu — e é o registro, não a intenção, que vale numa revisão.

## 28.7 Regras de comunicação e de UI

O que o produto **não** pode fazer:

- notificação push, e-mail ou aviso in-game que incentive nova aposta após perda;
- oferta de bônus, pacote ou desconto disparada por perda, por saldo baixo ou por ruína;
- linguagem que sugira que o resultado é influenciável pelo jogador ("você estava perto", "quase lá", "sua vez de virar");
- exibir odd sem exibir, no mesmo lugar, o valor de retorno líquido;
- apresentar PC-B promocional como se fosse saldo comprado;
- esconder limites, autoexclusão ou histórico líquido atrás de mais de dois níveis de menu.

O que o produto **deve** fazer:

- limites e autoexclusão acessíveis a partir da carteira e do perfil;
- posição líquida do período visível sem clique adicional na carteira;
- margem da casa e número de simulações exibidos na tela de odds — isso já existe na base v0.8 e deve permanecer;
- mensagem de saldo insuficiente que não empurre para compra como primeira opção.

## 28.8 Interação com a economia — o `rescue grant`

O §0.4 lista `rescue grant` entre os faucets de PC-B. Um grant disparado por o jogador ter zerado o saldo é, em desenho de risco, um mecanismo de reengajamento após perda. Ele pode continuar existindo — é o que impede o jogador casual de ser expulso do jogo por variância — mas precisa de contorno:

```text
rescue_grant_max_por_semana   = 1
rescue_grant_valor            = fixo, nunca proporcional à perda
rescue_grant_cooldown         = 24 h após a ruína, não imediato
rescue_grant_bloqueado_se     = cooloff | self_exclusion | sinal de risco ativo
```

A regra do valor fixo é a que importa: um grant que escala com o quanto o jogador perdeu ensina exatamente o comportamento errado.

Vale registrar aqui o dado que motiva a seção: na base v0.8, com saldo inicial de 1.000 PC e aposta mínima de 50 PC sempre no favorito, a ruína ocorre em **100% das simulações**, com mediana de 128 rodadas — cerca de duas horas de jogo. Depois disso, a torneira é o desafio diário, ~75 PC/dia, equivalente a 1,5 aposta. Esse é o ponto do funil em que a pressão por compra é máxima e onde a proteção precisa estar mais firme.

## 28.9 Modelo de dados

### player_limits

```text
user_id
limit_type          max_stake_per_round | max_loss | max_rounds | max_session_time | max_deposit
window              round | session | day | week | month
value
effective_from
requested_value     preenchido enquanto um aumento está em cooldown
requested_at
status              active | pending_increase
```

### self_exclusions

```text
id
user_id
kind                cooloff | self_exclusion
duration
started_at
ends_at             null quando permanente
source              player | system | admin
reentry_requested_at
reentry_granted_at
```

### responsible_play_events

```text
id
user_id
event_type
signal_type
window
payload
intervention_id
created_at
```

Append-only, mesma disciplina do `wallet_ledger`. Retenção mínima definida por política e nunca inferior ao prazo de contestação aplicável.

### Campos adicionais

```text
users.birth_date
users.age_verification_status     none | declared | verified | failed
users.protection_status           normal | limited | cooloff | excluded
bets.blocked_by_limit             quando a aposta foi recusada por limite
```

## 28.10 Admin e operação

- painel com contas em cool-off, autoexclusão e sob intervenção;
- admin **pode** aplicar restrição; **não pode** remover autoexclusão nem encurtar cooldown de aumento de limite;
- toda ação administrativa sobre proteção é registrada com operador e justificativa;
- alerta operacional quando a taxa de intervenções muda de patamar — mudança súbita costuma indicar alteração de produto, não de população.

## 28.11 Critérios de aceitação

- todo limite bloqueia de fato a ação correspondente, testado por caso;
- redução de limite é imediata; aumento respeita cooldown mesmo com reinício de sessão, troca de dispositivo ou reinstalação;
- autoexclusão bloqueia aposta, stake, compra, P2P nos dois sentidos, Exchange e faucets econômicos;
- autoexclusão sobrevive a logout, novo login e tentativa de criar conta com sinais ligados;
- nenhuma comunicação de marketing é emitida para conta em autoexclusão — verificado por teste no serviço de notificação, não por convenção;
- reality check aparece no intervalo configurado e registra a confirmação;
- tela de resultado nunca comemora retorno inferior ao valor apostado;
- todos os eventos do capítulo 17 são emitidos sem amostragem.

## 28.12 Custo — o que precisa entrar no P&L

O Estudo de Unit Economics v1.1 orçava 1,5% de receita para fraude/refund e R$ 0,30/MAU de infraestrutura, suporte e antifraude. Não orçava nada deste capítulo. As linhas que passam a existir:

- desenvolvimento e manutenção das ferramentas (custo de projeto, não recorrente);
- verificação de idade/documento por usuário econômico ativo, quando exigida;
- monitoramento de risco: processamento, revisão humana e alçada;
- atendimento treinado para autoexclusão e contestação;
- relatórios e retenção de registro;
- perda de receita esperada por limites e exclusões efetivos — **é receita que não se realiza por desenho, e precisa aparecer no modelo, não ser tratada como surpresa**.

O Estudo de Unit Economics v1.2 incorpora essas linhas e mede o deslocamento do break-even.

## 28.13 O que este capítulo não resolve

- não substitui parecer jurídico nem define enquadramento;
- não define política de KYC/AML financeiro, que é do §25.1;
- não estabelece limiares numéricos definitivos: todos os parâmetros são baseline de teste e devem ser calibrados com dados reais de coorte;
- não cobre publicidade e afiliados, que precisam de política própria antes de qualquer aquisição paga.

---

# 29. Changelog v1.4

Alterações em relação à Spec v1.3. Nenhuma decisão econômica da v1.3 foi revertida.

| Seção | Mudança |
|---|---|
| 0.3.1 | **Nova.** ContentPack original passa a ter prazo: precisa existir antes do fim da V1, para que a telemetria de retenção meça o produto que será lançado. |
| 0.5.1 | **Nova.** Distingue as três features que mudam o enquadramento isoladamente e move a consulta jurídica para entrada de arquitetura da v0.9. |
| 0.6 | **Nova.** Gate de proteção do jogador; renomeia `account_age_gate` para `account_maturity_gate` e cria `age_verification_gate`. |
| P8 | **Novo princípio permanente.** Não existe aposta jogável sem limite, pausa, autoexclusão e histórico líquido visível. |
| 4.4 | **Reescrita.** Restaura a suavização de Laplace, que a v1.3 havia removido; dimensiona o Monte Carlo pela cauda (150.000 sims); quantifica o viés de convexidade; registra erro estimado por lutador. |
| 4.4.6 | **Nova.** Tetos de payout e de passivo por rodada. Teto de odd desaconselhado como instrumento principal por degradar a margem efetiva no azarão. |
| 4.6 | Novas invariantes: probabilidade nunca zero, tetos respeitados, aposta recusada sob limite ou autoexclusão. |
| 4.8 | Novos critérios de saída da v0.9: dimensionamento do Monte Carlo, tetos de exposição e consulta de enquadramento respondida. |
| 9.9 | `account_age_gate` renomeado; `age_verification_gate` adicionado. |
| 16 | Ponteiro para o capítulo 28. |
| 17 | Novo bloco de telemetria de proteção do jogador, sem amostragem. |
| 20 | Etapa A ganha os itens 6, 7 e 8. |
| 25.1 | Checkpoint passa a incluir idade, limites, autoexclusão, registro de intervenções e custo de conformidade. |
| 28 | **Novo capítulo.** Proteção do jogador e jogo responsável. |
| 29 | **Novo.** Este changelog. |

## O que continua em aberto após a v1.4

1. **Resposta da consulta de enquadramento** (§0.5.1) — é a única pendência capaz de reordenar o roadmap econômico inteiro.
2. **Limiares numéricos de risco** (§28.6) — só calibráveis com coorte real.
3. **Política de publicidade e afiliados** — não coberta por nenhum documento do conjunto.
4. **Decisão de tema** — a Content Layer resolve o "como"; falta o "quando" ser executado, e a v1.4 apenas fixa o prazo, não a arte.

---

# 30. Changelog v1.5

Fecha a lacuna L-013. Alinha a Spec às decisões de profundidade aceitas e ao capítulo 11 do `POKEARENA_DESIGN_DEPTH_v1.1.md`.

**Nenhuma decisão econômica, de fairness ou de proteção do jogador da v1.4 foi revertida.** As Fases v0.9 e V1 (§4 e §5) seguem intactas — a discussão inteira de metagame não tocou o núcleo, o que é por si uma validação do desenho.

| Seção | Mudança |
|---|---|
| Cabeçalho | Revisão 1.5. |
| §3 | Mapa de versões refeito, com capítulo de cada fase e a tabela do que mudou e por quê. |
| §5.6 | Explicita que a V1 tem um mercado só, e que os mercados mútuos não devem ser antecipados. |
| **§6** | **Reescrito.** Era "V2 — Collection & Capture"; vira "Fase 2 — Mercados Mútuos e Previsão". Contém o achado do EV constante, a mecânica de apuração mútua com passivo zero, a invariante do preço do modelo, calibração e Liga de Previsão. |
| **§7** | **Reescrito.** Era "V3 — Trainer Idle"; vira "Fase 3 — Coleção, Criação e Informação". Absorve o antigo §6 e as expedições do antigo §7. Captura entrega a forma base, evolução é escolha, moveset é do jogador com comparador, e o dossiê passa a existir. |
| **§8** | Reposicionado: de segundo jogo de batalha para onde se aprende a ler o motor. Novos §8.1.1 (probabilidade exibida, com invariante de 20.000 combates) e §8.1.2 (ginásios como aulas, com critério de aceitação). |
| §9 | Liga de Previsão sai daqui e vai para §6.8. §9.7 passa a definir três ratings independentes. |
| §10 | Taxa de mercado mútuo entra como core sink. Nova subseção sobre o dossiê como recompensa não monetária, que é o que o teto de emissão de PC-B precisava. |
| §22 | Quatro separações novas: os três ratings, `Informação != Probabilidade`, `Preço do modelo != Preço do mercado`, `Doce != Valor apostado`. |
| §25 | Definição resumida de cada release refeita para as fases novas. |
| §30 | Este changelog. |

## Capítulos que não mudaram e por quê

`§4` Fundação e `§5` V1 não têm uma linha alterada. `§11` a `§21`, `§23`, `§24`, `§26`, `§27` e `§28` permanecem válidos como estão: tratam de monetização, UX, segurança, telemetria, qualidade, escopo e proteção do jogador, e nenhuma decisão de profundidade os contradiz.

`§12` (mapa de telas) e `§17` (telemetria) **ganham itens** com as fases novas, mas a estrutura permanece; o detalhamento por bloco está no `BUILD_BLOCKS v1.2`, que é onde a execução vive.

## O que continua em aberto após a v1.5

1. **Resposta da consulta de enquadramento** (§0.5.1, lacuna L-012). Continua sendo a única pendência capaz de reordenar o roadmap econômico inteiro — e agora ganha três perguntas novas, sobre apuração mútua, elemento de perícia mensurável, e Liga de Previsão sem stake.
2. **Limiares numéricos de risco** (§28.6, lacuna L-011).
3. **Política de publicidade e afiliados** (lacuna L-010).
4. **Execução da troca de tema** (§0.3.1, lacuna L-008).
