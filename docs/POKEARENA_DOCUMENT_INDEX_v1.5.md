# PokéArena — Índice Oficial de Documentos v1.5

**Data:** 18/08/2026  
**Status:** conjunto atual de referência do projeto

Este índice existe para evitar conflito entre versões antigas. Para novas decisões, usar somente os documentos listados como **ATUAIS** abaixo.

## 0. O que mudou na v1.5

A v1.5 fecha as duas últimas lacunas documentais do conjunto. **A trilha `documento` está sem pendências.**

| Lacuna | Como fechou |
|---|---|
| **L-013** — capítulos 6 a 9 da Spec desatualizados pelas decisões de profundidade | **Spec v1.5**: §6 e §7 reescritos, §8 reposicionado, §3, §5.6, §9, §10, §22 e §25 ajustados, changelog em §30 |
| **L-009** — cenários novos não reproduzíveis | **modelo v1.2** em `support/unit_economics/`, gerando quatro CSVs. Achou e corrigiu um número publicado: o pior caso combinado é 71.344 MAU, não 71.345 |

A Spec volta a valer integralmente para todas as fases — a exceção de precedência que existia no `CLAUDE.md` foi removida.

Estrutura de fases depois da v1.5:

```text
v0.9  Foundation                        §4    inalterada
V1    Arena Online                      §5    inalterada
V2    Mercados Mútuos e Previsão        §6    nova — cria teto de habilidade
V3    Coleção, Criação e Informação     §7    absorve o antigo Idle
V4    Time e Jornada                    §8    reposicionada: onde se aprende a ler o motor
V5    Liga                              §9    Liga de Previsão saiu daqui para a V2
```

---

## 0.1 O que havia mudado na v1.4

A revisão anterior (v1.3) fechou a arquitetura econômica: proveniência de PokéCash, Competitive Profit Account, Exchange sem mint, PC-T Pending e unit economics. Essa parte não foi revertida — foi verificada e confirmada.

A v1.4 preenche três lacunas que o conjunto até então não cobria:

| Lacuna | Onde foi resolvida |
|---|---|
| **Proteção do jogador não existia no conjunto.** Nenhuma ocorrência de jogo responsável, autoexclusão, limite de depósito ou reality check nos três documentos. | Spec cap. 28 · Economy §15.1 · Unit Economics §11.1 |
| **Exposição da casa não era limitada.** Nenhuma ocorrência de teto de odd, cap de payout, passivo ou exposição. O pior lutador tem odd justa x62. | Spec §4.4.6 · Economy §5.1 |
| **A precificação tinha erro de estimador.** A v1.3 removeu a suavização de Laplace e mantinha 20.000 simulações, o que sobrepaga a odd do azarão em ~19%. | Spec §4.4 · Economy §4.1 |

E acrescenta dois cenários que faltavam ao planejamento:

- **regime regulatório restritivo** — sem PC-T comprável, break-even Base vai de 24.037 para 63.168 MAU (Unit Economics §6.1);
- **custo de conformidade e proteção** — break-even Base vai de 24.037 para 29.922 MAU (Unit Economics §11.1).

Nenhuma conclusão econômica da v1.3 foi revertida.

## 1. Documentos atuais

### 1) `POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md` — ATUAL
Fonte principal de produto e implementação. Contém:

- visão V0.9 → V5;
- Arena, Collection, Idle, Team/Journey e League;
- odds/fairness, **dimensionamento do Monte Carlo e viés de estimador**;
- **tetos de payout e de passivo por rodada**;
- backend, wallet e ledger;
- PC-T / PC-B / PC-C;
- PC-T Pending;
- League stakes e rake;
- Exchange Reserve;
- P2P;
- segurança/antifraude;
- **proteção do jogador e jogo responsável (cap. 28)**;
- economia monetária;
- unit economics e metas de viabilidade;
- **changelog da revisão (cap. 29)**.

### 2) `POKEARENA_ECONOMY_STUDY_v1.2.md` — ATUAL
Estudo quantitativo da economia virtual. Contém:

- inflação/overhang;
- faucets/sinks;
- rake sensitivity;
- bankroll ruin;
- **margem da Arena e vazamento por erro de estimador**;
- **exposição e passivo por rodada**;
- soft issuance ceiling;
- Competitive Profit Account;
- HWM/hurdle;
- Exchange 5:1 / 3:1;
- PC-T Pending como controle de contágio financeiro;
- conexão entre sinks e recompra;
- **proteção do jogador como parâmetro econômico**.

### 3) `POKEARENA_UNIT_ECONOMICS_STUDY_v1.2.md` — ATUAL
Estudo da empresa. Contém:

- ARPMAU;
- payer conversion;
- recompra de PC-T;
- Season Pass/cosméticos;
- break-even por MAU;
- **cenário regulatório restritivo, sem PC-T comprável**;
- **custo de conformidade e proteção do jogador**;
- LTV/CAC;
- sensibilidade do preço do PC;
- custo de pagamentos;
- fraude/chargeback;
- PC-T Pending;
- infraestrutura;
- web/PWA vs app stores;
- metas financeiras para escala.

### 4) `POKEARENA_BUILD_BLOCKS_v1.2.md` — ATUAL
Plano de execução. Decompõe v0.9 → V5 em **61 blocos** cíclicos, cada um dimensionado para ser executado do começo ao fim numa única sessão de trabalho. Contém:

- a forma do ciclo, com sabotagem entre escrever o teste e construir;
- **os nove portões de qualidade**, sendo comportamento e sabotagem obrigatórios nos 50 blocos;
- **as duas metodologias** — Gauntlet Loop onde existe barra comparável, ciclo dirigido por invariante onde a correção é binária — e a distribuição pelos blocos;
- o trilho de regressão que todo bloco precisa manter verde;
- 52 blocos em detalhe, com lista de sabotagem por bloco, e a Fase 5 em tabela;
- Fases 2 a 4 reestruturadas pelas decisões do Design Depth: mercados mútuos, criação e ginásios com probabilidade exibida;
- gates de fase e o que cada um exige em dados de produção;
- paralelismo permitido e regra de convivência;
- **prompts de gauntlet prontos** para os blocos elegíveis;
- o que trava o percurso e **não** é resolvível com código.

Não substitui a Master Spec: a Spec diz *o quê*, este documento diz *em que ordem e em que pedaços*.

### 5) `POKEARENA_DESIGN_DEPTH_v1.1.md` — ATUAL
Análise de profundidade, maestria e retenção. Nasceu da pergunta "os outros modos não são simples demais?" e encontrou um problema anterior a ela: **a Arena não tem teto de habilidade**. Como as odds saem de `1/p × (1-margem)`, o `p` cancela e toda aposta tem o mesmo valor esperado — medido, 0,89 a 0,93, dentro do ruído de amostragem.

Corolário: os dois defeitos de fairness que a Spec v1.4 manda corrigir eram as duas únicas formas de um jogador ter vantagem. Quanto mais correto o jogo fica, menos habilidade tem.

Propõe três movimentos que preservam P4 integralmente: mercados de apuração mútua, informação como moeda do metagame, e calibração como métrica de maestria. Reposiciona V2 a V5.

A v1.1 acrescenta o capítulo 11 — **mundo do treinador**: evolução, treino, escolha de golpes e ginásios. Ele corrige um desequilíbrio da v1.0, que ao conectar tudo por informação havia deixado de fora a fantasia de criar Pokémon. A ponte que faltava é o doce de espécie: apostar numa espécie rende matéria-prima para criar a sua, e capturar na Arena rende a **forma base**, não o lutador que apareceu — você viu o campeão, leva um ovo.

O item de maior retorno do capítulo: **ginásios exibem a probabilidade de vitória do seu time antes do desafio**. O jogador manipula uma probabilidade e vê o número mexer, que é a única forma de aprender a ler probabilidade. Depois volta para a Arena, onde só pode ler, e lê melhor.

**Decisões do §8 aceitas:** mercados de apuração mútua sim · V3 Idle absorvido em V2 · Liga de Previsão antecipada para a V2.

> Enquanto a lacuna **L-013** estiver aberta, este documento e o Build Blocks v1.2 **prevalecem sobre a Spec** para V2 a V5.

## 2. Documentos substituídos

Não usar como fonte principal:

- `POKEARENA_SPEC_MASTER_V1-V5.md` → substituído por v1.4;
- `POKEARENA_SPEC_MASTER_V1-V5_v1.1.md` → substituído por v1.4;
- `POKEARENA_SPEC_MASTER_V1-V5_v1.2_ECONOMY.md` → substituído por v1.4;
- `POKEARENA_SPEC_MASTER_V1-V5_v1.3_COMPLETE.md` → substituído por v1.4;
- `POKEARENA_ECONOMY_STUDY_v1.0.md` → substituído por v1.2;
- `POKEARENA_ECONOMY_STUDY_v1.1.md` → substituído por v1.2;
- `POKEARENA_UNIT_ECONOMICS_STUDY_v1.0.md` → substituído por v1.2;
- `POKEARENA_UNIT_ECONOMICS_STUDY_v1.1.md` → substituído por v1.2;
- `POKEARENA_SPEC_MASTER_V1-V5_v1.4_COMPLETE.md` → substituído por v1.5;
- `POKEARENA_DOCUMENT_INDEX_v1.3.md` → substituído por v1.5;
- `POKEARENA_DOCUMENT_INDEX_v1.4.md` → substituído por v1.5;
- `pokearena_unit_economics_model_v1.1.py` → substituído por v1.2;
- `POKEARENA_BUILD_BLOCKS_v1.0.md` → substituído por v1.2;
- `POKEARENA_BUILD_BLOCKS_v1.1.md` → substituído por v1.2;
- `POKEARENA_DESIGN_DEPTH_v1.0.md` → substituído por v1.1.

### Registros vivos (não versionados, sempre atuais)

- `../CLAUDE.md` — instruções de trabalho: disciplina de bloco, os nove portões, e a regra de registrar achado fora de escopo apontando o bloco dono;
- `DEFEITOS.md` — o que está quebrado e ainda não foi corrigido, com bloco dono;
- `LACUNAS.md` — o que foi identificado e adiado, com bloco dono ou trilha nomeada.

Eles podem ser mantidos apenas como histórico de decisão.

## 3. Arquivos reproduzíveis

As simulações de economia do jogo seguem as da v1.1, reproduzidas de forma independente e conferindo (ruína de bankroll com desvio máximo de 0,13 ponto percentual; fórmulas de rake, hurdle, cobertura e break-even exatas).

O modelo de unit economics foi **atualizado para a v1.2** e agora cobre os cenários que faltavam.

### Economia do jogo

- `pokearena_economy_simulation.py`;
- `pokearena_rake_sensitivity.csv`;
- `pokearena_bankroll_ruin.csv`;
- `pokearena_bonus_supply_summary.csv`;
- séries semanais por ceiling;
- `pokearena_competitive_conversion.csv`;
- gráficos de supply, bankroll e conversion.

### Unit economics

- `pokearena_unit_economics_model_v1.2.py`;
- `unit_economics_scenarios_v1_2.csv`;
- `restricted_regime_break_even.csv`;
- `compliance_cost_sensitivity.csv`;
- `combined_worst_case.csv`;
- `unit_economics_scenarios.csv` (v1.1, histórico);
- `break_even_mau.csv`;
- `mau_for_profit_targets.csv`;
- `pc_price_sensitivity.csv`;
- `payment_ticket_sensitivity.csv`;
- `ltv_cac_sensitivity.csv`;
- `exchange_reserve_coverage.csv`;
- `scale_pnl_base.csv`;
- gráficos de break-even, lucro, preço e Exchange Coverage.

> **Pendência fechada.** Os cenários de regime restrito (§6.1) e custo de conformidade (§11.1) passaram a ser reproduzíveis pelo modelo v1.2.

## 4. Ordem de leitura recomendada

1. Master Spec v1.5 — começar por §3 se o interesse for a estrutura de fases, ou por §6 e §7 se for o metagame;
2. Economy Study v1.2;
3. Unit Economics Study v1.2;
4. Design Depth v1.1 — antes de detalhar qualquer bloco de V2 a V5;
5. Build Blocks v1.2 — para executar, não para decidir;
6. CSVs/simuladores apenas quando for alterar parâmetros.

Para quem vai **construir** e não decidir: ler o Build Blocks primeiro e consultar a Spec pelas seções que cada bloco cita.

## 5. Pendências abertas após a v1.4

Em ordem de impacto sobre o roadmap:

Nenhuma delas é trabalho de escrita. **A trilha `documento` está limpa**; o que resta depende de terceiros.

1. **Consulta de enquadramento regulatório** (Spec §0.5.1, lacuna L-012). Única pendência capaz de reordenar o roadmap econômico inteiro, e entrada de arquitetura da v0.9. Ganhou três perguntas novas na v1.5: apuração mútua muda o enquadramento? Elemento de perícia mensurável muda? Liga de Previsão sem stake é atividade regulada?
2. **Execução da troca de tema** (Spec §0.3.1, lacuna L-008). Prazo fixado — antes do fim da V1 — e a arte é produção externa que precisa começar muito antes.
3. **Política de publicidade e afiliados** (lacuna L-010). Sem dono em nenhum documento.
4. **Limiares numéricos de risco** (Spec §28.6, lacuna L-011). Só calibráveis com coorte real.
5. **Balanceamento do elenco** (lacunas L-001 a L-004). Roteadas para F1.12, porque o elenco Kanto sai de cena e rebalancear elenco que será substituído é descartável.

## 6. Princípios que não podem divergir entre documentos

```text
Arena normalizada != Pokémon do jogador
PC-B/PC-C não compartilham pot com PC-T
B -> C = reclassificação, nunca mint
C -> T = transferência de Reserve, nunca mint
PC-T Pending não circula
Rake/edge = sink; não contar duas vezes como receita em reais
Economia virtual saudável != empresa lucrativa
Paid acquisition só escala com LTV/CAC validado
Proteção do jogador é requisito da V1, não da versão com dinheiro real
Teto de payout preserva a margem; teto de odd a destrói
Vitória exibida != vitória econômica só é aceitável se o líquido estiver visível
Idade do jogador != maturidade da conta
Bloco fechado != jogo quebrado — o trilho de regressão fica verde sempre
Mapa completo != autorização de execução contínua (Spec §27)
Teste que nunca ficou vermelho não prova nada — sabotar é obrigatório
Barra vaga != barra; o crítico inventa a comparação e aprova tudo
Correção binária != gosto; não forçar Gauntlet onde a prova é invariante
```

## 7. Ferramental instalado

- `.claude/skills/gauntlet-loop` — técnica de Matt Shumer, empacotamento de RoboNuggets, CC BY 4.0. Ver `ATTRIBUTION.md`. Escolhida entre cinco implementações públicas por adoção (417 ★). Invocação: `/gauntlet-loop <objetivo>`.
