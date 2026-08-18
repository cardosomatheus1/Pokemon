# PokéArena — Estudo Econômico Quantitativo v1.2

**Base:** Master Spec v1.5  
**Objetivo:** testar estabilidade monetária, inflação, sinks/faucets, risco de quebra, conversão PC-C → PC-T, rake, transferência P2P, **precisão da margem da Arena**, **exposição por rodada** e sustentabilidade do loop competitivo.  
**Status:** estudo de design e simulação atualizado; não é previsão de comportamento real, contabilidade oficial nem parecer jurídico.  
**Alterações da v1.2:** seções 4.1, 5.1 e 15.1 são novas; §20 ganha ressalvas de modelo; ver changelog na seção 24.

> **Procedência dos números desta revisão.** As simulações herdadas da v1.1 — rake, ruína de bankroll, oferta PC-B, conversão competitiva — foram **reproduzidas de forma independente** e conferem: a ruína de 4 stakes deu 56,47% contra os 56,6% publicados, 6 stakes 32,86% contra 32,9%, 8 stakes 16,11% contra 16,2%, 10 stakes 6,34% contra 6,35% e 12 stakes 1,18% contra 1,18%. As fórmulas de break-even de rake, meia-vida da moeda, hurdle e cobertura da Exchange também conferem. As seções novas usam medições feitas diretamente sobre o motor da base v0.8.

---

## 1. Resumo executivo

O desenho econômico v1.1 tem uma boa fundação ao separar PC-T, PC-B e PC-C, mas a simulação encontrou um risco crítico: **a regra que gera PC-C a cada vitória pode neutralizar quase todo o sink do rake**.

Em uma partida Bronze PC-B vs PC-B:

- stake total = 100 PC;
- rake de 10% = 10 PC removidos;
- vencedor recebe 90 PC;
- pela lógica v1.1, aproximadamente 45 PC podem adquirir proveniência competitiva;
- em 5:1, 45 PC-C podem gerar 9 PC-T.

Logo, **9 PC-T de conversão potencial surgem para cada 10 PC queimados**. Se a Exchange mintar PC-T sem limite de tesouraria, 90% do sink pode ser reintroduzido como a forma mais valiosa da moeda. Em 3:1, seriam 15 PC-T potenciais para 10 PC de rake — 150% do sink.

A recomendação central deste estudo é mudar o mecanismo: **PC-C não nasce por vitória. PC-C nasce apenas pela reclassificação de lucro competitivo líquido, acima de um hurdle e de um high-water mark.** A Exchange, por sua vez, não deve mintar PC-T: deve pagar apenas com PC-T existente em uma tesouraria formada por sinks de PC-T.

A segunda conclusão é que **um orçamento rotineiro agregado de até 80 PC-B por semana pode ser mantido se houver teto de emissão por carteira**. Em uma simulação de 10 mil agentes por 52 semanas, emissão irrestrita levou a oferta PC-B de 2,0 milhões para 26,4 milhões. Com teto de reposição de 500 PC-B por conta, a oferta terminou em ~5,35 milhões e praticamente estabilizou, enquanto apenas 46,5% da recompensa nominal precisou efetivamente ser emitida.

A terceira conclusão é sobre o rake. Com rake de 10% do pot, o break-even individual exige **55,56% de win rate**. Isso é agressivo para uma Liga com matchmaking por habilidade: um sistema que aproxima adversários tende a empurrar win rates para 50%. Portanto, jogadores fortes não devem depender apenas do EV do pot para “ganhar dinheiro”; precisam existir **recompensas competitivas financiadas pelo rake e pelo ranking**, com orçamento fechado.

---

## 2. O que significa inflação no PokéArena

Antes de existir mercado aberto de Pokémon/itens com preços livres, o principal problema não é uma inflação clássica de preços. Os preços do jogo são controlados pelo desenvolvedor.

O risco inicial é **monetary overhang**:

- saldo mediano sobe continuamente;
- stakes ficam pequenos em relação à riqueza acumulada;
- recompensas deixam de ser relevantes;
- o jogador precisa comprar menos PC-T;
- bônus gratuitos tornam-se um estoque permanente;
- conversões e RMT ganham pressão crescente.

Quando existir mercado de itens negociáveis, deve ser adicionado um índice de preços. Antes disso, saúde econômica deve ser acompanhada por oferta monetária por jogador, velocidade, concentração de riqueza, faucets/sinks e acessibilidade dos stakes.

---

## 3. Identidade monetária

Definir:

```text
M_T = PC-T em mãos de jogadores
M_B = PC-B em mãos de jogadores
M_C = PC-C em mãos de jogadores
R_T = PC-T na tesouraria fora de circulação
```

### PC-T

```text
ΔM_T = compras oficiais
      + pagamentos da Exchange vindos de R_T
      - margem da Arena sobre PC-T
      - rake da Liga sobre PC-T
      - taxa P2P
      - sinks de luxo/cosméticos
```

Transferência P2P entre jogadores não altera M_T; apenas redistribui riqueza. A taxa P2P altera.

### PC-B

```text
ΔM_B = grants promocionais efetivamente emitidos
      - margem da Arena sobre PC-B
      - rake da Liga sobre PC-B
      - gastos/sinks PC-B
      - reclassificação B → C
```

### PC-C

```text
ΔM_C = reclassificação de lucro elegível B → C
      + recompensa competitiva fechada
      - gastos PC-C
      - débito da Competitive Exchange
```

**Conversão 5 PC-C → 1 PC-T deve destruir os 5 PC-C e transferir 1 PC-T da tesouraria para o jogador. Não criar PC-T do nada.**

### 3.1 PC-T Pending e risco de pagamento

`PC-T Pending` é um estado temporário de PC-T comprado, usado quando o meio de pagamento ainda apresenta risco de reversão/contestação. Não aumenta a quantidade de moedas econômicas; apenas separa saldo liquidado de saldo ainda não liberado para circulação.

Invariantes:

```text
Pending_T não entra em P2P
Pending_T não entra na Transferable Queue
Pending_T -> T somente após clearance
chargeback/reversal referencia o pagamento de origem
```

A motivação é econômica: com PC-T transferível, fraude de pagamento pode retirar caixa da empresa depois que o valor já foi deslocado para outra conta. Proveniência de pagamento + hold reduz esse risco de contágio.

---

## 4. Estudo do rake

Para dois jogadores com stake `S` e rake `r` sobre o pot bruto:

```text
pot = 2S
payout_vencedor = 2S(1-r)
lucro_vencedor = S(1-2r)
perda_perdedor = -S
EV/S = 2(1-r)p - 1
```

O break-even é:

```text
p_break_even = 1 / [2(1-r)]
```

| Rake | Win rate de break-even | Meia-vida aproximada da moeda em ciclos de stake* |
|---:|---:|---:|
| 4% | 52,08% | 16,98 |
| 5% | 52,63% | 13,51 |
| 7,5% | 54,05% | 8,89 |
| 8% | 54,35% | 8,31 |
| **10%** | **55,56%** | **6,58** |
| 12,5% | 57,14% | 5,19 |
| 15% | 58,82% | 4,27 |

\*A “meia-vida” é a quantidade de ciclos de uso necessária para que, em expectativa agregada, metade de uma massa monetária submetida repetidamente ao mesmo sink permaneça em circulação, sem novos faucets.

### Implicação

10% funciona muito bem como sink, mas é pesado. Um jogador com 50% de win rate perde em média 10% do próprio stake por partida. Um jogador precisa sustentar >55,56% para lucrar diretamente com os pots.

**Recomendação:** manter 10% como rake bruto de teste, mas não tratar os 10% como burn permanente. Usar uma política de tesouraria:

```text
70% do rake → permanent sink
20% do rake → Stability / Exchange Reserve
10% do rake → Competitive Season Pool
```

Se todo reserve for posteriormente usado, o sink estrutural efetivo cai para 7% do pot; se não for necessário, permanece mais próximo dos 10%.

Os percentuais são parâmetros de teste, não promessa final.

---

## 4.1 Margem da Arena — vazamento por erro de estimador

A v1.1 estudou o rake da Liga em profundidade e tratou a margem de 8% da Arena como um dado. Ela não é: é uma margem **estimada por amostragem**, e o erro dessa estimativa vaza valor de forma sistemática.

### O mecanismo

As odds saem de `p̂ = wins / sims` e a odd ofertada é `(1/p̂) × (1 - margem)`. Como `1/p` é convexa, `E[1/p̂] > 1/p`: em média, a casa **sobrepaga**. O termo de segunda ordem é `(1-p)/(n·p²)`, expresso como fração da odd justa.

Com os 20.000 sims que a base v0.8 e a Spec v1.3 usavam, e os `p` medidos no motor:

| Perfil do lutador | p medido | Odd justa | Sobrepagamento da odd | Comparação com a margem de 8% |
|---|---:|---:|---:|---|
| Favorito estrutural (Gengar) | 0,340 | x2,94 | +0,03% | irrelevante |
| Favorito típico | 0,150 | x6,67 | +0,19% | irrelevante |
| Mediana do elenco | 0,083 | x12,05 | +0,67% | 8% da margem |
| Azarão comum | 0,037 | x27,03 | +3,52% | 44% da margem |
| Pior do elenco (Ditto) | 0,016 | x62,50 | **+19,22%** | **2,4× a margem inteira** |

Na cauda, o erro de estimador entrega ao apostador mais que o dobro da margem configurada. E como o viés tem sinal fixo, ele **não se compensa entre rodadas**: é um vazamento estrutural, não variância.

### Confirmação empírica

Oito cálculos independentes de odds sobre a **mesma pool**, 20.000 sims cada, no motor da base v0.8:

| Lutador | Odd mínima | Odd máxima | Dispersão |
|---|---:|---:|---:|
| Farfetch'd | x54,15 | x65,99 | 21,9% |
| Hitmonlee | x36,75 | x42,32 | 15,2% |
| Chansey | x21,51 | x24,52 | 14,0% |
| Gengar | x1,96 | x2,01 | 2,6% |

O favorito está bem precificado. O azarão oscila 20% — e é no azarão que está o passivo.

### Dimensionamento correto

Para erro relativo `ε`, `n = (1-p)/(p·ε²)`. A cauda dita a amostra:

| Perfil | p | Sims para ε = 2% |
|---|---:|---:|
| Favorito estrutural | 0,340 | 4.853 |
| Mediana do elenco | 0,083 | 27.621 |
| Pior do elenco | 0,016 | **153.750** |

`SIMS_MIN = 150.000` passa a ser baseline (Spec §4.4.4). O custo não é obstáculo: a 23 µs/batalha e uma Arena por minuto, são ~41 CPU-h/mês, contra ~5,5 CPU-h/mês com 20.000. A conclusão do §12 do Estudo de Unit Economics — o Monte Carlo não domina o P&L — sobrevive ao aumento de 7,5×.

### Implicação econômica

O modelo monetário trata a margem da Arena como sink de 8% sobre o volume apostado (§3, `ΔM_T`). Enquanto o estimador estiver subdimensionado, o sink real é menor que o declarado, e a diferença é maior justamente entre os jogadores que apostam em azarão. Isso distorce:

- a projeção de sink da Arena no balanço de faucets/sinks;
- o `replenishment rate` do Estudo de Unit Economics, que assume desgaste de 8%;
- a percepção de justiça, que é o diferencial declarado do produto.

**Recomendação:** medir a margem realizada por faixa de odd, não apenas agregada. Uma margem agregada saudável pode esconder vazamento concentrado na cauda.

---

## 5. Risco de quebra do bankroll

Monte Carlo: 300 mil trajetórias por cenário, Bronze 50 PC, rake 10%, 20 partidas, jogador com 50% de win rate e sem faucets no intervalo.

| Bankroll inicial | PC inicial | Prob. de terminar sem 1 stake Bronze |
|---:|---:|---:|
| 4 stakes | 200 | **56,6%** |
| 6 stakes | 300 | **32,9%** |
| 8 stakes | 400 | **16,2%** |
| 10 stakes | 500 | **6,35%** |
| 12 stakes | 600 | **1,18%** |

### Decisão de design

O jogo não deve pressupor que “ter 50 PC” significa possuir bankroll saudável para jogar Bronze repetidamente.

Baseline recomendado:

```text
Bronze stake = 50
PC-B soft issuance ceiling = 500
healthy_bankroll = 10 × stake do tier
```

Não é necessário impedir o usuário de jogar abaixo disso, mas a UI deve oferecer prática/lower-risk mode e não estimular all-in.

Para stakes maiores, a mesma lógica escala em múltiplos do stake.

---

## 5.1 Exposição e passivo por rodada

Simétrico ao risco de quebra do jogador, existe o risco de quebra **da casa**, e até a v1.1 nenhum documento do conjunto o tratava: os termos teto de odd, cap de payout, passivo e exposição não apareciam em lugar nenhum.

### A magnitude

O elenco da Arena tem amplitude medida de 21× entre o melhor e o pior lutador: Gengar vence 33,96% das rodadas e Ditto 1,61%. A odd justa do pior é x62. Sem teto, um único ticket de 5.000 PC cria passivo de 287.500 PC — 57 vezes o pot bruto de uma partida Champion da Liga.

Num jogo de moeda simulada isso é uma linha no balanço monetário. Com PC-T comprável, é caixa.

### Teto de odd é o instrumento errado

Cortar a odd protege o passivo transferindo o custo ao apostador, e o custo é grande:

| Teto de odd | Odd ofertada ao pior lutador | Margem efetiva **naquele lutador** |
|---|---:|---:|
| x20 | x20,00 | 68,0% |
| x30 | x30,00 | 52,0% |
| x50 | x50,00 | 20,0% |
| sem teto | x57,50 | 8,0% |

Um teto de x20 transforma 8% de margem declarada em 68% de margem real no azarão. Isso é incompatível com o discurso de transparência que o produto usa como diferencial — e com o P1 da Spec.

### Teto de payout preserva a margem

Limitar o payout mantém a odd justa e restringe apenas o tamanho da aposta: `stake_max = payout_max / odd`. Com `payout_max = 50.000 PC`, a margem permanece 8% para todos, e o passivo fica limitado sem mentir sobre o preço.

| Perfil | Odd ofertada | Stake máximo implícito |
|---|---:|---:|
| Favorito estrutural | x2,71 | 18.478 PC |
| Mediana do elenco | x11,08 | 4.511 PC |
| Pior do elenco | x57,50 | 870 PC |

### Efeito no balanço monetário

O passivo por rodada precisa entrar no painel de política monetária (§13) como série própria:

```text
liability_max_rodada          passivo do pior caso na rodada
liability_realizado           quanto de fato foi pago
margem_realizada_por_faixa    margem efetiva por faixa de odd
tickets_cortados_por_teto     quantos e de que perfil
```

Sem essas séries, um pico de pagamento na cauda aparece no relatório como "mês ruim" em vez de aparecer como o que é: exposição não limitada.

Parâmetros na Spec §4.4.6.

---

## 6. Simulação de inflação PC-B

### Modelo

10.000 agentes durante 52 semanas:

```text
55% casual
- 8 apostas Arena/semana, stake 10
- 2 Liga/semana, stake 50

35% core
- 20 apostas Arena/semana, stake 15
- 6 Liga/semana, stake 50

10% hardcore
- 30 apostas Arena/semana, stake 20
- 10 Liga/semana, stake 50
```

Arena aproximada com 8% de edge; Liga 50/50 com rake de 10%. Saldo inicial de 200 PC-B. Grant nominal: 80 PC-B/semana.

O teto testado é **teto de emissão**, não confisco: se o jogador ganhou e está acima do teto, mantém o saldo; apenas não recebe PC-B gratuito adicional até voltar à banda.

### Resultado em 52 semanas

| Teto de emissão PC-B | Oferta final | PC/jogador | Mediana | % abaixo de 50 PC | % do grant nominal realmente emitido |
|---|---:|---:|---:|---:|---:|
| Sem teto | **26,40 M** | 2.640 | 2.939 | 5,1% | 100% |
| 300 | 3,76 M | 376 | 336 | 18,6% | 40,6% |
| 400 | 4,55 M | 455 | 433 | 15,1% | 43,7% |
| **500** | **5,35 M** | **535** | **532** | **13,3%** | **46,5%** |
| 600 | 6,14 M | 614 | 624 | 11,6% | 49,4% |
| 800 | 7,79 M | 779 | 810 | 8,9% | 54,1% |

### Conclusão

Um orçamento rotineiro de 80 PC-B/semana é perigoso se for sempre emitido. Porém, com `soft_issuance_ceiling = 500`, o próprio uso do jogador passa a determinar a emissão real. Jogador que gasta/queima recebe reposição; jogador que acumula deixa de receber moeda e passa a receber substitutos não monetários.

### Regra recomendada

```text
routine_pc_b_budget = até 80 PC-B/semana por conta
soft_issuance_ceiling = 500 PC-B
```

**Os 80 PC-B são teto agregado de fontes rotineiras**, não “80 do login + desafios + rescue + outras missões”. Na SPEC v1.2, a trilha de login usa até 50 PC-B/semana e deixa até 30 PC-B para desafios/rescue/missões.

Quando o jogador estiver acima da banda de emissão:

```text
recompensa de login/desafio
→ Trainer Coins / Ball / XP / cosmetic progress
```

Nunca mostrar como se o usuário tivesse “perdido” uma recompensa; a substituição deve ser prevista na trilha.

---

## 7. Falha da regra PC-C v1.1

### Regra por vitória

Em uma Bronze PC-B vs PC-B:

```text
50 + 50 = 100
rake = 10
payout = 90
contribuição líquida do oponente = 45 PC
```

Se os 45 virarem PC-C:

```text
5:1 → 9 PC-T potenciais
3:1 → 15 PC-T potenciais
```

Portanto:

```text
5:1 = reintrodução potencial de 90% do rake
3:1 = reintrodução potencial de 150% do rake
```

Isso mostra que **o ratio isoladamente não controla emissão**.

### Simulação populacional

Cenário de stress test:

```text
10.000 jogadores de Liga
80 partidas/jogador/temporada
stake equivalente Bronze = 50
rake = 10%
400.000 partidas totais
rake total = 4.000.000 PC
```

Mix ilustrativo de performance realizada:

```text
70%: 50% WR
15%: 53% WR
10%: 56% WR
4%: 58% WR
1%: 60% WR
```

| Regra de conversão | PC-T potencial / temporada | % do rake reintroduzido |
|---|---:|---:|
| v1.1: PC-C por vitória, 5:1 | **3.705.840** | **92,65%** |
| somente lucro líquido > 0, 5:1 | 136.944 | 3,42% |
| lucro líquido + hurdle 2,5%, 5:1 | **93.646** | **2,34%** |
| lucro líquido + hurdle 5%, 5:1 | 61.938 | 1,55% |

A mudança de regra é muito mais importante que trocar 5:1 por 3:1.

Com hurdle 2,5%:

```text
5:1 → ~93,6 mil PC-T potenciais
4:1 → ~117,1 mil
3:1 → ~156,1 mil
```

Mesmo 3:1 passa a ser matematicamente testável **se** existir orçamento de tesouraria, mas não deve ser baseline.

---

## 8. Nova regra PC-C: Competitive Profit Account

PC-C deixa de nascer em cada vitória.

O servidor mantém um livro de performance competitiva financiada por PC-B/PC-C:

```text
eligible_stake_volume
net_competitive_pnl
loss_carryforward
competitive_high_water_mark
```

A cada janela de liquidação:

```text
hurdle = 2,5% × eligible_stake_volume
excess = cumulative_net_pnl - cumulative_hurdle
new_eligible_profit = max(0, excess - previous_high_water_mark)
```

Somente `new_eligible_profit` pode ser **reclassificado**, sem duplicar saldo:

```text
PC-B → PC-C
```

Não é um prêmio adicional. É mudança de proveniência de parte do saldo que o jogador já ganhou.

### Por que high-water mark

Se o jogador:

```text
período A: +200
período B: -150
período C: +100
```

não deve gerar novo direito de conversão em C enquanto não recuperar o pico anterior. Isso impede ganhar direito econômico repetidamente alternando vitórias e perdas.

### Baseline

```text
hurdle_rate = 2,5%
minimum_tier = Gold
minimum_eligible_matches = 40 por período
minimum_unique_opponents = configurável
high_water_mark = persiste entre temporadas
exchange_ratio = 5:1
```

Com rake 10%, hurdle de 2,5% exige performance de longo prazo aproximadamente acima de **56,94% de win rate em confrontos equivalentes** para produzir crescimento esperado do entitlement. Isso é deliberadamente difícil.

---

## 9. Separar os dois tipos econômicos de Liga

Misturar PC-B grátis diretamente com PC-T transferível no mesmo pot cria a melhor rota de laundering do sistema.

Recomendação:

### Bonus Competitive Queue

Stake aceito:

```text
PC-B
PC-C
```

Settlement permanece não transferível. Resultado pode contribuir para o Competitive Profit Account.

### Transferable Queue

Stake aceito:

```text
100% PC-T
```

Payout é PC-T menos rake.

Essa queue só existe quando gates jurídicos, segurança, idade/KYC/AML aplicáveis e antifraude estiverem atendidos.

O MMR/tier pode ser compartilhado; o **pot econômico não**.

Consequência: uma conta criada para coletar PC-B não consegue entrar contra uma conta própria com PC-T e “perder” propositalmente para converter bônus.

---

## 10. Competitive Exchange sem mint

A Exchange não deve executar:

```text
burn 5 PC-C
mint 1 PC-T
```

Deve executar:

```text
burn 5 PC-C do jogador
transfer 1 PC-T de Exchange Reserve → jogador
```

### Como nasce a Exchange Reserve

Somente de PC-T que já saiu de circulação:

```text
20% do rake PC-T da Liga
+ parcela configurável da taxa P2P
+ aporte promocional explicitamente orçado, se a empresa decidir
```

Baseline conservadora:

```text
exchange_reserve_share_of_pc_t_rake = 20%
p2p_fee_to_exchange_reserve = 25%
```

O restante continua sink/treasury.

### Regra de orçamento

```text
exchange_budget_week <= reserve_balance
```

Nunca permitir saldo negativo da tesouraria e nunca criar PC-T para atender fila.

Se demanda > orçamento:

- aplicar cap individual;
- liquidar em janelas semanais;
- usar rateio pró-rata ou fila claramente definida;
- PC-C continua utilizável dentro do jogo.

### Indicador crítico

```text
Exchange Coverage Ratio = Reserve PC-T / PC-T solicitado na janela
```

Bandas sugeridas:

```text
> 2,0x  saudável / pode estudar melhoria de ratio
1,0–2,0x observar
< 1,0x  reduzir caps / não melhorar ratio
```

A mudança 5:1 → 4:1 ou 3:1 somente pode ocorrer com cobertura forte e supply PC-T estável.

---

## 11. Política de sinks implícitos

O usuário não precisa sentir que está pagando dezenas de taxas. O ideal é que a maioria dos sinks esteja embutida em ações que já possuem valor percebido.

### Core sinks

1. **Arena edge:** 8% esperado, explicitamente refletido nas odds.
2. **League rake:** 10% bruto do pot.
3. **P2P fee:** baseline 2%, transparente.
4. **Event entries:** tickets de eventos especiais.
5. **Prestige sinks:** cosméticos e status de alto valor.
6. **Utility sinks não competitivos:** personalização, showcase, naming, temas, efeitos, slots sociais.

### Wealth sinks

Essenciais para retirar moeda dos jogadores ricos sem punir iniciantes:

```text
prestige cosmetics
limited seasonal trophies
arena themes
profile frames
trainer outfits
collection showcase upgrades
high-end cosmetic auctions
```

Criar faixas de preço muito acima do consumo casual. A função é transformar excesso de riqueza em status sem comprar vantagem.

### O que não usar como sink principal

- reduzir stats;
- dano permanente;
- custos obrigatórios de cura;
- energia paga para jogar;
- taxas ocultas;
- mudança dinâmica secreta do rake;
- perda de PC-T por inatividade.

Sinks obrigatórios demais tornam a economia estável às custas do jogo.

---

## 12. Trainer Coins, League Points, Candy e itens

### Trainer Coins

Não transferível e sem conversão para PC-T.

Faucets:

- expedições;
- PvE;
- missões;
- achievements.

Sinks:

- evolução;
- facilities;
- crafting;
- consumíveis;
- progressão da base.

Para late game, custos de facilities devem ser progressivos para evitar estoque infinito.

### League Points

A melhor defesa contra inflação é ser **sazonal**.

Recomendação:

```text
reset forte ao final da season
0–20% de carryover máximo, se necessário
```

Nunca converter League Points em PC-T.

### Species Candy

Faucet por duplicatas e atividades da família; sink por evolução/mastery. Como é específico por espécie, inflação é local e muito mais controlável.

### Poké Balls / itens consumíveis

São item sinks naturais: a captura consome Ball. Se existir trading futuro, monitorar também inflação de itens, não apenas moedas.

---

## 13. Painel de política monetária

O PokéArena deve possuir um **Economy Dashboard** tão importante quanto o painel de erros.

### Todo dia

```text
M_T / DAU e WAU
M_B / DAU e WAU
M_C / DAU e WAU
faucets por proveniência
sinks por proveniência
volume Arena
volume Liga
rake
P2P volume / fee
Exchange requests / paid / denied
```

### Distribuição

```text
p10 / p50 / p90 de saldo
Gini PC-T
share top 1%
share top 10%
% abaixo de 1 stake Bronze
% abaixo de 5 stakes Bronze
```

### Velocidade

```text
Velocity_T = volume PC-T transacionado / PC-T médio em circulação
Velocity_B = volume PC-B usado / PC-B médio
```

### Faucets/Sinks

```text
FSR_B = faucets_B / sinks_B
FSR_T = faucets_T / sinks_T
```

Interpretar junto com crescimento de usuários. Uma economia saudável em expansão pode ter oferta total crescente; o indicador relevante é também **oferta por usuário ativo**.

### Monetary Overhang Index

Enquanto não houver mercado aberto:

```text
MOI = saldo mediano jogável / stake Bronze
```

Se MOI cresce continuamente, stake/recompensa perde significado mesmo sem “preços subindo”.

---

## 14. Guardrails de LiveOps

Não ajustar a economia diariamente. Usar bandas e mudar parâmetros em season boundaries, de forma transparente.

### PC-B

Baseline:

```text
routine_weekly_budget <= 80
soft_issuance_ceiling = 500
```

Se por 2–4 semanas:

```text
median PC-B >> 500
e FSR_B > 1,10
```

não aumentar rake. Primeiro:

- substituir parte das recompensas PC-B por itens/XP;
- ativar eventos/cosméticos sink;
- reduzir grants futuros de LiveOps.

Se:

```text
p10 < 1 stake Bronze
e churn pós-perda sobe
```

- aumentar rescue dentro do orçamento;
- oferecer practice/free low-stake;
- revisar stake Bronze.

### PC-T

Nunca usar grant gratuito como primeira resposta.

Se oferta PC-T por WAU cresce muito mais rápido que base ativa:

- reduzir orçamento da Exchange;
- reforçar prestige sinks;
- manter mais rake em sink;
- evitar promoções de compra agressivas.

Se PC-T fica escasso demais:

- liberar parte da Stability Reserve;
- aumentar utilidade de PC-B;
- reduzir sinks opcionais;
- revisar rake apenas em virada de temporada.

---

## 15. Antifraude como parte da economia

Com transferência e valor econômico, fraude é uma fonte de inflação.

Monitorar:

- sybil farms de PC-B;
- IP/device graph;
- contas que perdem repetidamente para um beneficiário;
- circular P2P;
- adversários repetidos;
- forfeits seletivos;
- Exchange concentrada em grupos pequenos;
- rápido PC-B → PC-C → PC-T;
- mudanças bruscas de ROI competitivo;
- botting de login streak.

### Invariantes

```text
PC-T nunca nasce sem source permitido
P2P soma zero antes da fee
pot = payout + rake
B → C é reclassificação, não mint
C → T debita Reserve T
reward free nunca gera T diretamente
```

---

## 15.1 Proteção do jogador como parâmetro econômico

A v1.1 modelava antifraude como parte da economia e não modelava proteção do jogador. A Spec v1.4 torna limites, pausa e autoexclusão requisito da V1 (cap. 28), e isso tem três efeitos econômicos que precisam entrar no modelo em vez de aparecer depois como desvio.

### 1. Receita que não se realiza por desenho

Limite de perda, limite de sessão e autoexclusão **reduzem volume apostado de propósito**. Isso não é churn nem falha de produto: é o mecanismo funcionando. O modelo precisa de um parâmetro explícito:

```text
protection_volume_drag = fração do volume apostado que deixa de existir
                         por limite, pausa ou autoexclusão efetivos
```

Tratar isso como surpresa é o erro clássico: a queda aparece no relatório mensal como problema de retenção e alguém propõe afrouxar o limite para "recuperar".

### 2. Menos volume significa menos sink — e menos tesouraria

O acoplamento não é óbvio e importa. A margem da Arena e o rake da Liga são os sinks que sustentam todo o modelo monetário. A Exchange Reserve é financiada por 20% do rake PC-T e 25% da taxa P2P (§10). Logo:

```text
proteção efetiva -> menos volume -> menos sink -> menos Reserve
                                              -> menor Exchange Coverage Ratio
```

O Coverage Ratio de 2× exigido pelo §10 fica mais difícil exatamente quando a proteção funciona bem. Consequência prática: **o orçamento da Exchange precisa ser calculado sobre volume pós-proteção**, não sobre volume bruto projetado. Caso contrário a fila de conversão promete o que a tesouraria não tem, e a saída seria reduzir cap — punindo o jogador competitivo por uma causa que não é dele.

### 3. O `rescue grant` é faucet e mecanismo de risco ao mesmo tempo

O §0.4 da Spec lista `rescue grant` entre os faucets de PC-B. Do ponto de vista monetário é emissão; do ponto de vista de risco é reengajamento após perda. As duas leituras convergem para a mesma regra:

```text
rescue_grant_valor          fixo, nunca proporcional à perda
rescue_grant_max_semana     1
rescue_grant_cooldown       24 h após a ruína
```

Valor fixo protege o jogador e protege a oferta monetária ao mesmo tempo — um grant proporcional à perda seria emissão crescente com a variância, exatamente o que o teto de emissão do §6 existe para evitar.

### Conexão com o bankroll saudável do §5

O `healthy_bankroll = 10 × stake do tier` recomendado no §5 já era, sem ser nomeado, um parâmetro de proteção: é o ponto em que a ruína em 20 partidas cai para 6,35%. A v1.2 o assume como tal e propõe que a UI use esse número para sugerir limite, em vez de deixá-lo apenas como recomendação de design.

### O que medir

```text
protection_volume_drag
stake_medio_pre_limite / pos_limite
taxa de autoexclusão por coorte
reincidência após reentrada
rescue_grant emitidos e bloqueados por política
margem realizada em contas sob limite vs sem limite
```

A última série é a que revela se a proteção está atingindo quem deveria: se contas sob limite tinham margem realizada muito acima da média, o sistema está intervindo tarde.

---

## 16. Teses a validar em produção

### T1 — 10% de rake pode ser excessivo para MMR estrito

Se win rates convergirem a ~50%, participação pode cair por percepção de erosão inevitável do bankroll. Testar 7,5% vs 10% em ambiente sem valor real antes do lançamento econômico.

### T2 — Teto de emissão é melhor que simplesmente reduzir o daily reward

Permite recompensas visualmente interessantes para jogadores com pouco saldo, enquanto jogadores ricos deixam de receber moeda adicional automaticamente.

### T3 — A habilidade deve ser premiada sobre P&L agregado, não vitória unitária

Isso reduz efeito de sorte, volume farming e lavagem de bônus.

### T4 — 5:1 é apenas camada secundária de segurança

A defesa principal é:

```text
high-water mark
+ hurdle
+ cap
+ tier gate
+ Exchange Reserve
+ antifraude
```

### T5 — Wealth sinks devem ser desejáveis

Retirar dinheiro de jogadores ricos funciona melhor via status/cosmético do que via punição obrigatória.

### T6 — O melhor parâmetro não é “zero inflação”

O alvo é preservar significado econômico, acesso a gameplay e desejo de gastar. Uma economia crescente pode aumentar oferta total se a base ativa também cresce.

---

## 17. Baseline econômico recomendado para a próxima SPEC

```text
ARENA
house_edge = 8%

BONUS PC-B
routine_weekly_pc_b_budget = 80 máximo agregado
soft_issuance_ceiling = 500
welcome_balance = calibrar entre 200–300
no free PC-T

LEAGUE
bronze_stake = 50
base_gross_rake = 10%
healthy_bankroll_reference = 10 × tier stake

RAKE TREASURY
70% permanent sink
20% stability/exchange reserve
10% competitive season pool

PC-C
no PC-C per individual win
hurdle = 2.5% of eligible stake volume
high_water_mark = persistent
minimum_tier = Gold
minimum_matches = 40 / economic period
conversion = 5 PC-C : 1 PC-T

EXCHANGE
PC-T payout comes from Exchange Reserve only
no mint-on-demand
weekly budget <= reserve

P2P
PC-T only
fee baseline = 2%
rate-limited + antifraud

LEAGUE ECONOMIC POOLS
bonus queue = PC-B / PC-C only
transferable queue = PC-T only
```

Esses números devem começar em modo simulado. Após dados reais, ajustar por season, nunca silenciosamente no meio de um ciclo.

---

## 18. Critérios de estabilidade antes de habilitar valor econômico

Não habilitar PC-T com valor externo enquanto pelo menos uma temporada fechada de teste não demonstrar:

1. reconciliação 100% do ledger;
2. nenhum caminho B → T fora da Exchange;
3. Economy Dashboard funcionando;
4. FSR e money supply reproduzíveis pelo simulador;
5. Exchange Reserve nunca negativa;
6. fraude simulada/sybil testada;
7. taxa de jogadores sem stake aceitável;
8. concentração de PC-T monitorada;
9. stress test 10× do volume esperado;
10. política formal de mudanças econômicas por season.

---

## 19. Interface entre economia do jogo e economia da empresa

O estudo de Unit Economics v1.1 adiciona uma distinção que deve permanecer explícita:

### Sink não é receita em reais no momento do burn

Se um usuário compra PC-T por dinheiro real, o caixa entra na compra. `house edge`, `league rake` e `P2P fee` retiram PC-T de circulação e podem induzir recompra futura, mas não devem ser somados novamente como receita em moeda fiduciária no instante do sink.

Definir:

```text
Replenishment Rate = PC-T recomprado / PC-T destruído em janela comparável
```

Essa taxa, junto com payer conversion e preço implícito do PC-T, conecta a política monetária à receita.

### Baseline de viabilidade empresarial usado no estudo complementar

O cenário Base de planejamento utilizou aproximadamente:

```text
8% dos MAU economicamente ativos em PC-T
80% de replenishment do PC-T destruído
4% de attach do Season Pass a R$ 29,90
2% de compradores de cosméticos diretos
10 PC por R$ 1 como unidade de simulação
Gross ARPMAU ≈ R$ 3,90
Contribution / MAU ≈ R$ 3,12
```

Com custo fixo ilustrativo de R$ 75 mil/mês, o cenário Base resultou em break-even próximo de **24 mil MAU**. Esses números não são previsão: precisam ser recalibrados com dados de retenção e compra reais.

### Nova regra de saúde cruzada

A economia virtual só é considerada saudável para monetização quando também consegue sustentar:

- `Exchange Coverage >= 2x`;
- fraude/refunds dentro do orçamento;
- replenishment positivo sem indução agressiva de recompra;
- `LTV/CAC >= 3x` antes de escalar aquisição paga;
- contribuição por MAU suficiente para financiar LiveOps.

---

## 20. Limitações desta simulação

Os resultados são **stress tests de mecanismo**, não previsão de receita ou retenção. Ainda não existem dados reais de:

- DAU/WAU;
- quantidade de bets por sessão;
- stake médio escolhido;
- distribuição real de odds escolhidas;
- compra de PC-T;
- distribuição real de skill;
- churn após perdas;
- propensão a transferir;
- preço/elasticidade de cosméticos.

Por isso, o simulador foi usado para identificar falhas estruturais e bandas seguras. Quando o protótipo online gerar dados, os mesmos modelos devem ser recalibrados com coortes reais.

### Ressalvas de modelo acrescentadas na v1.2

Duas simplificações do simulador de conversão competitiva foram identificadas na revisão. **As duas erram para o lado seguro** — superestimam a demanda de conversão — mas o número resultante deve ser lido como teto, não como estimativa:

1. **A conversão não é limitada pelo saldo do jogador.** A Spec determina que PC-C é reclassificação de PC-B existente, nunca mint. O simulador converte `max(0, pnl - hurdle)` sem checar se o jogador possui esse saldo em PC-B. Na prática o teto real é menor.
2. **O cálculo é de período único.** Com high-water mark e loss carryforward realmente persistentes, o entitlement acumulado ao longo de N temporadas é o **máximo acumulado**, não a soma dos excessos de cada temporada. Somar temporadas independentes superestima quem teve uma temporada de sorte.

Portanto, os ~93,6 mil PC-T potenciais do §7 são **limite superior de demanda**, adequado para dimensionar tesouraria e inadequado para projetar quanto de fato será convertido.

Uma terceira limitação, esta sem direção definida: a simulação populacional usa um mix discreto de win rates (70% em exatamente 50%, 15% em 53%, etc.). A distribuição real de habilidade é contínua e o matchmaking a comprime em torno de 50% de forma dinâmica. O mix discreto captura variância binomial, mas não captura a realimentação entre resultado e adversário futuro.

Também não modelado nesta revisão: o efeito de limites, pausas e autoexclusões sobre volume, sink e tesouraria — ver §15.1. É a lacuna mais relevante do simulador atual.

---

## 21. Referências de desenho e pesquisa utilizadas

- PokéArena Master Spec v1.1 — base funcional e econômica do estudo.
- Jagex / Old School RuneScape — documentação oficial sobre inflação, transaction tax, item sinks e luxury/gold sinks.
- Hogan-Hennessy, Xenopoulos & Silva — *Market Interventions in a Large-Scale Virtual Economy*; estudo causal sobre transaction tax e item sink em Old School RuneScape.
- Scholten et al. — *Unconventional Exchange: Methods for Statistical Analysis of Virtual Goods*; monitoramento de inflação/volatilidade em economia virtual.
- EVE Online Economic Council — Monthly Economic Reports; uso recorrente de money supply, sinks/faucets, price indexes e atividade econômica como telemetria de economia persistente.
- Asadi & Hemadi — *Understanding Currencies in Video Games: A Review*.

---

## 22. Arquivos reproduzíveis

O estudo acompanha:

- `pokearena_economy_simulation.py`
- `pokearena_rake_sensitivity.csv`
- `pokearena_bankroll_ruin.csv`
- `pokearena_bonus_supply_summary.csv`
- `pokearena_competitive_conversion.csv`
- `pokearena_competitive_conversion_population.csv`
- séries semanais de oferta PC-B por teto testado;
- gráficos de supply, ruin e conversão.


---

## 23. Referências operacionais verificadas em 18/08/2026

- Stripe Brasil — preços públicos: cartões nacionais 3,99% + R$ 0,39; Pix 1,19% (sujeito à disponibilidade indicada pela Stripe); disputa recebida R$ 55.
- Apple Developer — App Store Small Business Program: 15% para participantes elegíveis.
- Google Play Console Help — fee tier atual de 15% para o primeiro US$ 1 milhão; documentação de 2026 anuncia mudanças/programas adicionais a partir de 30/09/2026.
- Cloudflare Workers — preços Standard em julho/2026: US$ 5/mês, 10 milhões de requests e 30 milhões de CPU-ms incluídos.

Esses valores não foram usados para definir a política monetária; servem para a interface com custos/receita e devem ser revalidados no lançamento.


---

## 24. Changelog v1.2

| Seção | Mudança |
|---|---|
| Cabeçalho | Base passa a ser a Master Spec v1.4. Acrescenta nota de reprodução independente dos números da v1.1. |
| 4.1 | **Nova.** Margem da Arena e vazamento por erro de estimador: viés de convexidade de até +19,22% na odd do azarão com 20.000 sims, dispersão empírica medida, dimensionamento para 150.000 sims. |
| 5.1 | **Nova.** Exposição e passivo por rodada. Teto de payout em vez de teto de odd; novas séries para o painel monetário. |
| 15.1 | **Nova.** Proteção do jogador como parâmetro econômico: `protection_volume_drag`, acoplamento entre proteção, sink e Exchange Reserve, e regra do `rescue grant` de valor fixo. |
| 20 | Ressalvas de modelo: conversão não limitada por saldo, cálculo de período único, mix discreto de win rate, ausência de proteção no simulador. |
| 24 | **Novo.** Este changelog. |

Nenhuma conclusão econômica da v1.1 foi revertida. As três seções novas tratam de mecanismos que a v1.1 não modelava.

### O que a v1.2 recomenda medir antes da v1.3 deste estudo

1. Margem realizada **por faixa de odd**, não agregada — é o que revela vazamento na cauda.
2. `protection_volume_drag` real, para recalcular a projeção de sink e o orçamento da Exchange.
3. Passivo máximo e realizado por rodada, como série contínua.
4. Distribuição real de win rate sob matchmaking, para substituir o mix discreto do simulador.
