# PokéArena — Índice Oficial de Documentos v1.4

**Data:** 18/08/2026  
**Status:** conjunto atual de referência do projeto

Este índice existe para evitar conflito entre versões antigas. Para novas decisões, usar somente os documentos listados como **ATUAIS** abaixo.

## 0. O que mudou na v1.4

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

### 1) `POKEARENA_SPEC_MASTER_V1-V5_v1.4_COMPLETE.md` — ATUAL
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

### 4) `POKEARENA_BUILD_BLOCKS_v1.1.md` — ATUAL
Plano de execução. Decompõe v0.9 → V5 em 50 blocos cíclicos, cada um dimensionado para ser executado do começo ao fim numa única sessão de trabalho. Contém:

- a forma do ciclo, com sabotagem entre escrever o teste e construir;
- **os nove portões de qualidade**, sendo comportamento e sabotagem obrigatórios nos 50 blocos;
- **as duas metodologias** — Gauntlet Loop onde existe barra comparável, ciclo dirigido por invariante onde a correção é binária — e a distribuição pelos blocos;
- o trilho de regressão que todo bloco precisa manter verde;
- 10 blocos da Fundação v0.9 e 12 da V1 em detalhe, com lista de sabotagem por bloco;
- Fases 2 a 5 em tabela, com método, portões e sabotagem central de cada bloco;
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
- `POKEARENA_DOCUMENT_INDEX_v1.3.md` → substituído por v1.4;
- `POKEARENA_BUILD_BLOCKS_v1.0.md` → substituído por v1.1.

### Registros vivos (não versionados, sempre atuais)

- `../CLAUDE.md` — instruções de trabalho: disciplina de bloco, os nove portões, e a regra de registrar achado fora de escopo apontando o bloco dono;
- `DEFEITOS.md` — o que está quebrado e ainda não foi corrigido, com bloco dono;
- `LACUNAS.md` — o que foi identificado e adiado, com bloco dono ou trilha nomeada.

Eles podem ser mantidos apenas como histórico de decisão.

## 3. Arquivos reproduzíveis

Inalterados nesta revisão — as simulações da v1.1 foram reproduzidas de forma independente e conferem (ruína de bankroll com desvio máximo de 0,13 ponto percentual; fórmulas de rake, hurdle, cobertura e break-even exatas).

### Economia do jogo

- `pokearena_economy_simulation.py`;
- `pokearena_rake_sensitivity.csv`;
- `pokearena_bankroll_ruin.csv`;
- `pokearena_bonus_supply_summary.csv`;
- séries semanais por ceiling;
- `pokearena_competitive_conversion.csv`;
- gráficos de supply, bankroll e conversion.

### Unit economics

- `unit_economics_scenarios.csv`;
- `break_even_mau.csv`;
- `mau_for_profit_targets.csv`;
- `pc_price_sensitivity.csv`;
- `payment_ticket_sensitivity.csv`;
- `ltv_cac_sensitivity.csv`;
- `exchange_reserve_coverage.csv`;
- `scale_pnl_base.csv`;
- gráficos de break-even, lucro, preço e Exchange Coverage.

> **Pendência de ferramental.** Os cenários novos da v1.4 — regime restrito (§6.1) e custo de conformidade (§11.1) — estão calculados nos documentos mas ainda **não** foram incorporados aos simuladores. Enquanto isso não acontecer, os `.py` e `.csv` refletem o modelo v1.1. Ver §5 abaixo.

## 4. Ordem de leitura recomendada

1. Master Spec v1.4 — começar pelas seções 0.5.1, 0.6 e cap. 28 se o interesse for a mudança desta revisão;
2. Economy Study v1.2;
3. Unit Economics Study v1.2;
4. Design Depth v1.1 — antes de detalhar qualquer bloco de V2 a V5;
5. Build Blocks v1.1 — para executar, não para decidir;
6. CSVs/simuladores apenas quando for alterar parâmetros.

Para quem vai **construir** e não decidir: ler o Build Blocks primeiro e consultar a Spec pelas seções que cada bloco cita.

## 5. Pendências abertas após a v1.4

Em ordem de impacto sobre o roadmap:

1. **Consulta de enquadramento regulatório** (Spec §0.5.1). É a única pendência capaz de reordenar o roadmap econômico inteiro, e é entrada de arquitetura da v0.9 — não item final de checklist.
2. **Incorporar os cenários novos aos simuladores**, para que §6.1 e §11.1 sejam reproduzíveis como o resto do conjunto.
3. **Limiares numéricos de risco** (Spec §28.6). Só calibráveis com coorte real.
4. **Política de publicidade e afiliados.** Não coberta por nenhum documento do conjunto, e necessária antes de qualquer aquisição paga.
5. **Execução da troca de tema.** A Spec §0.3.1 fixa o prazo — antes do fim da V1 — mas a arte do ContentPack original ainda não existe.

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
