# PokéArena — Estudo de Unit Economics e Viabilidade Empresarial v1.2

**Base econômica:** Master Spec v1.4 + Estudo Econômico Quantitativo v1.2  
**Data de revisão:** 18/08/2026  
**Alterações da v1.2:** seções 6.1 e 11.1 são novas; §17 e §20 revisados; changelog na seção 23.  
**Objetivo:** responder se o PokéArena pode sustentar uma empresa, quantos jogadores/volume são necessários, quais receitas realmente viram caixa e quais parâmetros econômicos mais alteram a viabilidade.

> Este estudo separa rigorosamente **economia do jogo** de **economia da empresa**. Rake, edge e fees em PokéCash são sinks monetários; sem cash-out oficial, eles não devem ser somados como receita em reais no instante da partida. O caixa surge principalmente quando o usuário compra PC-T, Season Pass ou conteúdo premium.

## 1. Descoberta central — não contar o rake duas vezes

Se um jogador compra 500 PC-T por R$ 50, a empresa recebeu R$ 50 na compra.  
Se depois 50 PC-T são queimados em rake/edge, a empresa **não recebeu outros R$ 5 naquele instante**.

O valor econômico do sink é indireto:

1. reduz o saldo circulante;
2. preserva escassez;
3. aumenta a probabilidade de recompra;
4. permite vender PC-T novamente sem acumular supply infinito.

Por isso o modelo usa **replenishment rate**: fração da moeda destruída que jogadores repõem com novas compras.

## 2. Baseline de referência para simulação

- preço implícito apenas para modelagem: **10 PC ≈ R$ 1**;
- Bronze 50 PC → valor econômico de referência ≈ **R$ 5 por jogador**;
- Arena edge: 8%;
- League gross rake: 10%;
- PC-B semanal: máximo agregado 80, com ceiling 500;
- Exchange: 5 PC-C → 1 PC-T, financiada por reserve;
- Season Pass: R$ 29,90;
- pagamentos web: mix simulado 60% Pix / 40% cartão;
- reserva para refund/fraude: 1,5% da receita (hipótese de planejamento);
- tributos: 8% da receita (placeholder de planejamento, não enquadramento fiscal);
- custo variável infra/suporte/antifraude: R$ 0,30/MAU (hipótese).

## 3. Cenários de monetização por MAU

| Cenario     |   PC-T_ARPMAU_R$ |   Pass_ARPMAU_R$ |   Cosmeticos_ARPMAU_R$ |   ARPMAU_bruto_R$ |   ARPMAU_apos_pagto_refund_tax_R$ |   Contribuicao_por_MAU_R$ |
|:------------|-----------------:|-----------------:|-----------------------:|------------------:|----------------------------------:|--------------------------:|
| Conservador |            0.572 |            0.448 |                  0.16  |             1.18  |                             1.036 |                     0.736 |
| Base        |            2.202 |            1.196 |                  0.498 |             3.896 |                             3.42  |                     3.12  |
| Forte       |            6.75  |            2.392 |                  1.196 |            10.338 |                             9.077 |                     8.777 |

### Leitura

**Conservador:** o jogo tem retenção/monetização insuficiente; sobreviver com aquisição paga é difícil.  
**Base:** o produto começa a parecer um negócio viável, mas ainda depende de 20–30 mil MAU para sustentar uma equipe pequena.  
**Forte:** metagame, League e monetização convertem bem; o negócio passa a funcionar com uma base relativamente pequena.

## 4. Break-even de usuários

|   Custo_fixo_mensal_R$ |   Base |   Conservador |   Forte |
|-----------------------:|-------:|--------------:|--------:|
|                  30000 |   9615 |         40735 |    3419 |
|                  75000 |  24037 |        101838 |    8546 |
|                 110000 |  35254 |        149362 |   12534 |
|                 150000 |  48073 |        203675 |   17091 |

Com custo fixo de **R$ 75 mil/mês**, o cenário Base exige aproximadamente **24,037 MAU**.

Nesse ponto o modelo estima aproximadamente:

|   Base_break_even_MAU |   Usuarios_economicos_PC-T |   League_matches_transferiveis_mes |   League_matches_transferiveis_dia |   Arena_bets_PC-T_mes |   Arena_bets_PC-T_dia |   Receita_PC-T_mes_R$ |   Receita_Pass_mes_R$ |   Receita_Cosmeticos_mes_R$ |
|----------------------:|---------------------------:|-----------------------------------:|-----------------------------------:|----------------------:|----------------------:|----------------------:|----------------------:|----------------------------:|
|                 24037 |                       1923 |                            15181.9 |                              506.1 |                124031 |                4134.4 |               52919.9 |               28748.3 |                     11970.4 |

Essa atividade não é absurda tecnicamente: são centenas de partidas transferíveis por dia, não milhões.

## 5. Quanto MAU para lucro mensal relevante? — fixo R$ 75 mil

|   Lucro_operacional_alvo_R$_mes |   Base |   Conservador |   Forte |
|--------------------------------:|-------:|--------------:|--------:|
|                               0 |  24037 |        101838 |    8546 |
|                           50000 |  40061 |        169730 |   14243 |
|                          100000 |  56085 |        237621 |   19940 |
|                          250000 | 104157 |        441296 |   37031 |

No **cenário Base**:

- break-even: ~24 mil MAU;
- +R$ 50 mil/mês: ~40 mil MAU;
- +R$ 100 mil/mês: ~56 mil MAU;
- +R$ 250 mil/mês: ~104 mil MAU.

## 6. Relação entre valor do PC-T e viabilidade

|   PC_por_R$ |   Valor_economico_Bronze_50PC_R$ |   PC-T_ARPMAU_R$ |   ARPMAU_bruto_R$ |   Contribuicao_por_MAU_R$ |   MAU_break_even_fixo_75k |
|------------:|---------------------------------:|-----------------:|------------------:|--------------------------:|--------------------------:|
|           5 |                            10    |             4.4  |              6.1  |                      5.05 |                   14841.8 |
|           8 |                             6.25 |             2.75 |              4.45 |                      3.6  |                   20812.8 |
|          10 |                             5    |             2.2  |              3.9  |                      3.12 |                   24036.2 |
|          12 |                             4.17 |             1.83 |              3.53 |                      2.8  |                   26803.6 |
|          15 |                             3.33 |             1.47 |              3.16 |                      2.48 |                   30291.2 |
|          20 |                             2.5  |             1.1  |              2.79 |                      2.15 |                   34822.1 |

O parâmetro **PC por R$** é um dos maiores drivers do negócio.

Com 10 PC/R$:
- Bronze = R$ 5 de valor econômico por jogador;
- break-even Base ≈ 24 mil MAU.

Com 20 PC/R$:
- Bronze cai para R$ 2,50;
- o mesmo comportamento gera menos recompra em reais;
- break-even sobe para ~35 mil MAU.

Não definir o preço do PC-T somente pela sensação de “dar bastante moeda”. Ele determina diretamente quanto volume econômico é necessário para financiar a operação.

---

## 6.1 Cenário regulatório restritivo — sem PC-T comprável

Os três cenários do §3 variam **quanto** o produto monetiza. Nenhum deles testa a hipótese de o produto **não poder** monetizar pela perna econômica — que é o desfecho possível da consulta de enquadramento da §0.5.1 da Spec.

Este é o cenário que faltava e ele importa por dois motivos: é o único que não depende de negociação com terceiros para acontecer, e é o único cuja probabilidade a empresa não controla.

### Premissa

PC-T deixa de ser comprável com dinheiro. A economia vira integralmente simulada — PC-B e PC-C continuam existindo, Arena e Liga continuam funcionando, mas a receita passa a vir apenas de Season Pass e cosméticos, que são vendas de conteúdo, não de saldo apostável.

```text
Receita mantida:    Season Pass, cosméticos diretos
Receita eliminada:  compra de PC-T (recompra por desgaste)
Mecânicas mantidas: Arena, Liga, Collection, Idle, Team, League
Mecânicas suspensas: Transferable Queue, P2P de PC-T, Competitive Exchange
```

### Resultado

| Cenário | ARPMAU bruto | Contribuição/MAU | Break-even @ R$ 75 mil | Contra o modelo atual |
|---|---:|---:|---:|---:|
| Conservador | R$ 0,609 | R$ 0,234 | **320.162 MAU** | 3,14× |
| Base | R$ 1,694 | R$ 1,187 | **63.168 MAU** | 2,63× |
| Forte | R$ 3,588 | R$ 2,850 | **26.314 MAU** | 3,08× |

### Leitura

**O negócio continua existindo.** No cenário Base ele precisa de 2,6× mais usuários — 63 mil em vez de 24 mil — mas não deixa de fechar. Isso é uma informação estratégica boa, não ruim: significa que a perna de apostas com valor real é um **acelerador**, não a fundação.

Três consequências práticas:

1. **Season Pass e cosméticos deixam de ser receita complementar e passam a ser o eixo.** No modelo atual eles somam 43% da receita do cenário Base; no restrito, 100%. A tese T3 do §18 — "Season Pass é receita de melhor qualidade" — deixa de ser preferência e vira dependência.
2. **O metagame passa de importante a existencial.** Sem PC-T comprável não há recompra por desgaste; a única alavanca de receita é conteúdo que o jogador queira comprar, e isso exige exatamente Collection, Idle, Team e League.
3. **O cenário Conservador restrito é inviável** — 320 mil MAU com estrutura de R$ 75 mil/mês não é meta, é rejeição da hipótese. Se a retenção for conservadora **e** a perna econômica cair, o modelo não fecha nessa estrutura de custo, e a resposta é reduzir custo fixo, não perseguir MAU.

### Por que este cenário deve ser mantido no modelo permanentemente

Não como pessimismo, mas como teste de dependência: se um roadmap só fecha com a perna de apostas real habilitada, então a decisão de enquadramento deixa de ser um gate e passa a ser risco existencial não precificado. Rodar os dois cenários lado a lado a cada revisão mostra o quanto da viabilidade está apoiado numa autorização que ainda não existe.

## 7. Por que ticket muito baixo é ruim

|   Ticket_R$ |   Taxa_media_R$ |   Taxa_efetiva_pct |
|------------:|----------------:|-------------------:|
|         4.9 |            0.27 |               5.49 |
|         9.9 |            0.38 |               3.89 |
|        19.9 |            0.62 |               3.09 |
|        29.9 |            0.85 |               2.83 |
|        49.9 |            1.31 |               2.62 |
|        99.9 |            2.46 |               2.47 |

Com taxa fixa de cartão, microcompras muito pequenas perdem eficiência.

**Recomendação:** evitar estruturar a economia em compras repetidas de R$ 4,90.  
Tickets de R$ 19,90–49,90 tendem a ter estrutura de processamento mais eficiente e reduzem quantidade de eventos de pagamento/chargeback.

## 8. Reposição de moeda: o verdadeiro papel do rake

Na fila transferível, para stake S e rake r:

```text
PC queimado por partida = 2 × S × r
```

Bronze:
```text
2 × 50 × 10% = 10 PC queimados
```

A 10 PC/R$ e reposição de 80%:
```text
10 PC / 10 × 80% ≈ R$ 0,80 de compra futura sustentada por partida Bronze
```

Exemplos, mesma lógica:
- Silver: ~R$ 1,60/match;
- Gold: ~R$ 4,00/match;
- Platinum: ~R$ 8,00/match;
- Diamond: ~R$ 16,00/match.

Isso **não é receita instantânea do rake**; é capacidade de gerar recompra em regime estável.

## 9. Exchange Reserve — condição de solvência

A simulação econômica anterior encontrou demanda potencial de Exchange equivalente a aproximadamente:
- 2,34% do rake bônus no desenho 5:1;
- 3,90% no desenho 3:1.

Com 20% do rake PC-T alimentando a Exchange Reserve:

|   Rake_T_sobre_Rake_B |   Coverage_5para1 |   Coverage_3para1 |
|----------------------:|------------------:|------------------:|
|                  0.05 |              0.43 |              0.26 |
|                  0.1  |              0.85 |              0.51 |
|                  0.15 |              1.28 |              0.77 |
|                  0.2  |              1.71 |              1.03 |
|                  0.25 |              2.14 |              1.28 |
|                  0.3  |              2.56 |              1.54 |
|                  0.5  |              4.27 |              2.56 |
|                  1    |              8.55 |              5.13 |

Para **Coverage ≥ 2×**:

- 5:1 exige `rake PC-T / rake bônus` ≳ **23,4%**;
- 3:1 exige ≳ **39%**.

Conclusão: não existe conversão “garantida para todos” sem volume econômico real.  
Se o jogo tiver enorme fila bônus e pouca fila PC-T, o sistema precisa reduzir cap/ratio ou acumular reserve antes de pagar.

## 10. Unit economics de aquisição — LTV/CAC

As curvas abaixo são cenários de retenção modelados, não benchmarks observados do PokéArena.

| Cenario     |   Meses_ativos_equivalentes_12m |   LTV_bruto_12m_R$ |   LTV_contribuicao_12m_R$ |   CAC_max_para_LTV_CAC_3x_R$ |   CAC_max_para_LTV_CAC_2x_R$ |
|:------------|--------------------------------:|-------------------:|--------------------------:|-----------------------------:|-----------------------------:|
| Conservador |                            1.65 |               1.95 |                      1.22 |                         0.41 |                         0.61 |
| Base        |                            2.24 |               8.71 |                      6.98 |                         2.33 |                         3.49 |
| Forte       |                            3.05 |              31.53 |                     26.77 |                         8.92 |                        13.38 |

A conclusão é dura e importante:

### Cenário Base
- LTV de contribuição em 12 meses ≈ **R$ 6.98 por cadastro adquirido**;
- para buscar LTV/CAC de 3×, CAC máximo ≈ **R$ 2.33**.

Ou seja: **antes de retenção forte, tráfego pago pode destruir caixa mesmo que o jogo monetize.**

O metagame Collection → Idle → Team → League não é “feature extra”; é economicamente necessário porque aumenta os meses ativos equivalentes por usuário e, portanto, LTV.

## 11. Estrutura de custo recomendada para planejamento

Não são cotações de mercado; são envelopes de planejamento:

- **R$ 30 mil/mês:** founders/estrutura muito lean;
- **R$ 75 mil/mês:** pequeno estúdio live;
- **R$ 110 mil/mês:** operação com reforço de suporte, fraude, compliance e observabilidade;
- **R$ 150 mil/mês:** estrutura de crescimento.

A sensibilidade de break-even mostra que tentar crescer equipe antes de validar ARPMAU e retenção pode ser mais perigoso que custo de servidor.

---

## 11.1 Custo de conformidade e proteção do jogador

A v1.1 orçava 1,5% de receita para fraude/refund e R$ 0,30/MAU de infraestrutura, suporte e antifraude. Não orçava nada de proteção do jogador — coerente com o fato de que nenhum documento do conjunto até a v1.3 tratava do assunto. Com o capítulo 28 da Spec v1.4, essas linhas passam a existir.

### Parâmetros — hipóteses de planejamento, não cotações

```text
rg_tooling_per_mau        R$ 0,08 / MAU / mês    ferramenta, monitoramento, operação
age_verification_unit     R$ 2,50 por usuário economicamente ativo, uma vez
                          (amortizado em 12 meses)
compliance_fixed_add      R$ 12.000 / mês        compliance parcial, jurídico
                                                 recorrente, auditoria, relatórios
protection_volume_drag    6% da receita de PC-T  receita que não se realiza
                                                 por limite, pausa e autoexclusão
```

O `protection_volume_drag` é a linha que costuma faltar e a mais importante conceitualmente: **é receita que deixa de existir por desenho**. Se não estiver no modelo, ela aparece depois como queda inexplicada e alguém propõe afrouxar o limite para recuperá-la.

### Efeito no break-even

| Cenário | Contribuição/MAU sem conformidade | Com conformidade | BE atual @ R$ 75 mil | BE com conformidade @ R$ 87 mil | Deslocamento |
|---|---:|---:|---:|---:|---:|
| Conservador | R$ 0,736 | R$ 0,618 | 101.838 | **140.777** | +38,2% |
| Base | R$ 3,120 | R$ 2,908 | 24.037 | **29.922** | +24,5% |
| Forte | R$ 8,777 | R$ 8,310 | 8.546 | **10.470** | +22,5% |

No cenário Base, conformidade e proteção movem o break-even de ~24 mil para ~30 mil MAU. É um aumento relevante e perfeitamente absorvível — desde que esteja no plano desde o começo, e não descoberto no mês em que a exigência chegar.

### Sensibilidade — o que domina o custo

Cenário Base, variando o parâmetro mais incerto:

| `protection_volume_drag` | Contribuição/MAU | Break-even @ R$ 87 mil |
|---:|---:|---:|
| 0% | R$ 3,024 | 28.774 |
| 3% | R$ 2,966 | 29.336 |
| 6% | R$ 2,908 | 29.922 |
| 10% | R$ 2,830 | 30.739 |
| 15% | R$ 2,734 | 31.826 |

E variando o custo fixo adicional, com drag em 6%:

| Fixo adicional | Break-even |
|---:|---:|
| R$ 0 | 25.794 |
| R$ 6.000 | 27.858 |
| R$ 12.000 | 29.922 |
| R$ 25.000 | 34.392 |

**Conclusão do exercício:** o custo fixo de conformidade domina; o `drag` de proteção é secundário. Mesmo com 15% do volume de PC-T perdido por limites efetivos, o break-even sobe apenas ~10% em relação a drag zero. Isso desarma o argumento de que proteger o jogador custa caro demais — **o que custa é a estrutura de conformidade, e essa é obrigatória de qualquer forma**.

### O pior caso combinado

Regime restrito (§6.1) **mais** custo de proteção, cenário Base — sem verificação de idade documental, porque sem valor econômico real ela deixa de ser exigível, e com fixo adicional reduzido a R$ 4.000:

```text
contribuição/MAU     R$ 1,107
custo fixo           R$ 79.000
break-even           71.345 MAU
```

Contra os 24.037 do modelo atual. Este é o número a ter em mente ao decidir tamanho de equipe: **o mesmo produto precisa de 3× mais usuários se as duas hipóteses adversas se realizarem juntas**.

## 12. Infraestrutura — resultado do benchmark do motor atual

Benchmark local do motor extraído do protótipo:
- 1.000 sims: ~40,8 ms total;
- 5.000 sims: ~121,5 ms;
- 20.000 sims: ~466,8 ms;
- regime: ~23 µs/batalha no lote grande.

Com **1 Arena global por minuto**:
```text
43.200 rounds/mês × ~467 ms
≈ 20,2 milhões de CPU-ms/mês
≈ 5,6 CPU-h/mês
```

Isso indica que **o Monte Carlo de odds, por si só, provavelmente não será o principal custo do negócio**. Produção real terá overhead diferente, múltiplas arenas, banco, realtime, logs, antifraude e redundância, mas a engine atual é computacionalmente barata o suficiente para não dominar o P&L inicial.

## 13. PC-T Pending — proteção de caixa antes da circulação

Adicionar `PC-T Pending` como estado temporário para compras por meios reversíveis. A função não é aumentar fricção, mas impedir que a empresa libere valor transferível antes de conseguir aplicar controles de risco.

Fluxo recomendado:

```text
pagamento aprovado
→ PC-T Pending
→ risk/clearance window
→ PC-T liquidado
→ P2P / Transferable Queue habilitados
```

Dependendo do risco, PC-T Pending pode ficar restrito a consumo interno não transferível. O tempo de hold não deve ser hard-coded; deve depender de meio de pagamento, maturidade da conta, valor, risk score e histórico.

Métrica obrigatória:

```text
chargeback_loss / gross_PC-T_sales
pending_clearance_time
false_positive_hold_rate
fraud_loss_prevented
```

## 14. Risco que pode destruir o modelo: fraude financeira

Quando PC-T é transferível, chargeback deixa de ser apenas “perdi uma venda”.

Ataque:
1. compra PC-T no cartão;
2. transfere/joga contra cúmplice;
3. valor sai da conta compradora;
4. comprador contesta o cartão;
5. empresa perde caixa, fee e o PC-T já circulou.

Regras econômicas obrigatórias:
- PC-T recém-comprado no cartão pode ter `transfer_hold`;
- Pix deve ser incentivado;
- P2P e Transferable Queue exigem risk score;
- saldo de compra contestada precisa ser rastreável por proveniência;
- limites de transferência devem crescer com maturidade da conta;
- reserve de perdas por fraude precisa entrar no P&L.

## 15. Pix é economicamente estratégico

No modelo de taxas atual usado na simulação, aumentar participação de Pix reduz custo de pagamento e risco de contestação de cartão.

Uma estratégia possível:
- manter mesmo preço;
- oferecer pequeno benefício não inflacionário ou bônus estritamente orçado para Pix;
- nunca conceder bônus transferível sem registrar como emissão oficial comprada/backed.

## 16. Web/PWA primeiro faz sentido também financeiramente

O baseline usa processamento web. Uma loja de aplicativos com comissão de 15% reduziria a contribuição do cenário Base e aumentaria o break-even de ~24 mil MAU para aproximadamente **28,4 mil MAU** sob as demais hipóteses. A 30%, iria para ~36,5 mil MAU.

Isso reforça a estratégia original de validar web/PWA antes do app nativo.

**Atualização de 18/08/2026:** a Apple mantém 15% no Small Business Program para participantes elegíveis. O Google Play ainda documenta o tier de 15% para o primeiro US$ 1 milhão, mas publicou novos programas/fees com vigência prevista a partir de 30/09/2026. Portanto, os cenários de 15%/30% desta seção são **sensibilidades**, não previsão de comissão futura; revalidar antes de qualquer app nativo.

## 17. O que realmente precisa ser verdadeiro para a empresa funcionar

O modelo não precisa de milhões de jogadores.

No cenário Base, com estrutura de R$ 75 mil/mês:

```text
~24 mil MAU → break-even
~40 mil MAU → ~R$ 50 mil/mês operacional
~56 mil MAU → ~R$ 100 mil/mês operacional
~104 mil MAU → ~R$ 250 mil/mês operacional
```

Mas isso depende simultaneamente de:

1. ARPMAU bruto perto de R$ 3,90;
2. ~8% dos MAU participarem da economia PC-T;
3. ~80% do desgaste de PC-T ser reposto;
4. ~4% comprarem Season Pass;
5. ~2% comprarem cosméticos diretos;
6. retenção suficiente para LTV justificar aquisição;
7. fraude/chargeback controlados;
8. nenhuma emissão PC-T fora da constituição monetária;
9. custo de conformidade e proteção do jogador dentro do orçado (§11.1);
10. a perna de PC-T comprável autorizada — sem ela vale o §6.1, com break-even 2,6× maior.

O item 10 é o único da lista que **não depende da empresa**. Por isso o §6.1 deve ser rodado em paralelo ao cenário principal em toda revisão, e não tratado como anexo.

## 18. Teses de negócio a validar antes de escala

### T1 — Retenção vale mais que subir o rake
Subir rake aumenta sink no curto prazo, mas pode reduzir partidas, retenção e recompra. LTV pode cair mesmo com maior taxa.

### T2 — O metagame é parte do modelo financeiro
Collection/Idle/League aumentam vida útil do usuário. Sem eles, CAC sustentável fica muito baixo.

### T3 — Season Pass é receita de melhor qualidade
É previsível e não precisa aumentar risco econômico do PC-T. Deve ser uma das principais fontes de monetização.

### T4 — Cosméticos são wealth sink e receita
Cosmético vendido por cash gera receita direta; vendido por PC-T ajuda a retirar supply. Não contar os dois ao mesmo tempo.

### T5 — Transferable Queue deve ser pequena no começo
A fila real-value aumenta antifraude, suporte e risco regulatório. Abrir gradualmente protege margem.

### T6 — Exchange precisa de orçamento, não promessa
Skill pode gerar valor, mas a quantidade paga depende de Reserve e Coverage Ratio.

### T7 — Não pagar para adquirir usuário antes de medir coorte
Primeiro medir D1/D7/D30, payer conversion, ARPMAU e 90-day LTV. Só então definir CAC máximo.

## 19. Métricas executivas de empresa

Além do Economy Dashboard do jogo, acompanhar:

```text
Gross Cash Revenue
Net Revenue after processor/refund/tax
ARPMAU
ARPDAU
Payer Conversion
ARPPU
PC-T purchase revenue
Season Pass revenue
Direct cosmetics revenue
Net PC-T sink
Replenishment rate
CAC
LTV30 / LTV90 / LTV180
LTV/CAC
CAC payback
Gross margin
Contribution margin
Fraud loss %
Chargeback rate
Support cost / MAU
Operating result / MAU
```

## 20. Decisão recomendada

**Meta econômica para validar antes de escalar equipe:**

```text
ARPMAU bruto >= R$ 3,50–4,00
Contribution/MAU >= R$ 2,80–3,20
D30/retention suficiente para LTV12 contribution >= R$ 7
LTV/CAC >= 3× antes de escalar paid UA
PC-T economic active >= 7–8% MAU
Season Pass attach >= 3–4%
Exchange Coverage >= 2×
fraud + refunds dentro do budget
custo de conformidade + proteção <= R$ 0,20/MAU + fixo orçado
protection_volume_drag medido, não estimado
break-even do cenário restrito (§6.1) conhecido e aceito pela sociedade
```

Se o PokéArena atingir essa banda, ele deixa de ser apenas uma economia “que não explode” e começa a ser **um negócio que consegue pagar aquisição, equipe e LiveOps**.

## 21. Limitações

- Não há dados reais de coorte do PokéArena.
- Conversão, retenção, ARPPU e replenishment são hipóteses.
- Tributos são placeholder e dependem do enquadramento real.
- Compliance/KYC/AML pode alterar fortemente o custo do modelo com valor econômico.
- Direitos de propriedade intelectual e enquadramento regulatório são gates anteriores à monetização comercial.
- PC/R$ é apenas unidade de simulação; a versão comercial não deve herdar automaticamente a relação histórica do protótipo.



---

## 22. Fontes operacionais verificadas em 18/08/2026

1. **Stripe Brasil — Preços e tarifas**: cartões nacionais 3,99% + R$ 0,39; Pix 1,19% (a página principal da Stripe indica disponibilidade por convite); tarifa por contestação recebida R$ 55. Fonte oficial: https://stripe.com/br/pricing
2. **Apple App Store Small Business Program**: comissão reduzida de 15% para participantes elegíveis. Fonte oficial: https://developer.apple.com/app-store/small-business-program/
3. **Google Play service fees**: tier de 15% para o primeiro US$ 1 milhão ainda documentado em 18/08/2026; documentação de 2026 também anuncia novos programas/fees com vigência a partir de 30/09/2026. Fontes oficiais: https://support.google.com/googleplay/android-developer/answer/112622 e documentação de 2026 do Play Console.
4. **Cloudflare Workers pricing**: plano Standard com mínimo de US$ 5/mês, 10 milhões de requests e 30 milhões de CPU-ms incluídos na documentação consultada (jul/2026). Fonte oficial: https://developers.cloudflare.com/workers/platform/pricing/

Custos fiscais, jurídicos, KYC/AML, licenciamento de pagamentos e propriedade intelectual não foram precificados como fatos; permanecem gates de validação.


---

## 23. Changelog v1.2

| Seção | Mudança |
|---|---|
| Cabeçalho | Base passa a Master Spec v1.4 + Estudo Econômico v1.2. |
| 6.1 | **Nova.** Cenário regulatório restritivo, sem PC-T comprável: break-even Base vai de 24.037 para 63.168 MAU. Passa a ser cenário permanente do modelo. |
| 11.1 | **Nova.** Custo de conformidade e proteção do jogador, com sensibilidade. Break-even Base vai de 24.037 para 29.922 MAU. Pior caso combinado: 71.345 MAU. |
| 17 | Dois novos requisitos, incluindo o único que não depende da empresa. |
| 20 | Metas de validação incluem custo de conformidade, `protection_volume_drag` medido e aceitação explícita do cenário restrito. |
| 23 | **Novo.** Este changelog. |

### Verificação independente dos números da v1.1

Os cálculos da v1.1 foram reproduzidos e conferem: ARPMAU e contribuição por cenário, break-even por custo fixo, cobertura da Exchange (2× exige `rake_T/rake_B` ≳ 23,4% em 5:1) e sensibilidade de preço do PC. Nenhuma correção foi necessária.

### Ressalva sobre o rótulo dos cenários

Mantido da v1.1, mas vale explicitar: o cenário **Base** exige simultaneamente ~8% dos MAU economicamente ativos em PC-T, 4% de Season Pass e 2% de cosméticos — algo próximo de 10% de pagantes, contra 2–5% típicos de F2P. Desdobrando o próprio break-even do §4: R$ 52.920 de receita de PC-T divididos por 1.923 usuários econômicos dão **R$ 27,52 de ARPPU mensal só em PC-T**, o que está no topo da banda brasileira.

Isso não invalida o cenário — invalida o nome. Para decisão de contratação, tratar **Conservador como caso base** e Base como caso bom é a leitura prudente. O §21 já classificava tudo como hipótese; a v1.2 apenas torna a implicação explícita.
