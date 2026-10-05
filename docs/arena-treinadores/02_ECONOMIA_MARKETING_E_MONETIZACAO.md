# Economia, marketing e monetização da Arena de Treinadores

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

## 1. O modelo de entrada

Cada participante põe o stake da partida. O pote é a soma dos dois stakes. **10% do pote vai para a casa**, como arrecadação em sua tesouraria, e o vencedor recebe os 90% restantes. O cálculo percentual já existe; o crédito PvP à tesouraria precisa ser implementado. Empate e cancelamento técnico devolvem integralmente as entradas, sem crédito de taxa à casa.

Os valores abaixo **já existem** em `engine/stake-liga.mjs`; não são uma nova tabela inventada para o documento. A interface pode traduzir os nomes, preservando as chaves internas.

| Rank | Chave interna | Entrada de cada um | Pote | Casa: 10% | Retorno ao vencedor | Ganho líquido do vencedor |
|---|---|---:|---:|---:|---:|---:|
| Bronze | `Bronze` | 50 | 100 | 10 | 90 | +40 |
| Prata | `Silver` | 100 | 200 | 20 | 180 | +80 |
| Ouro | `Gold` | 250 | 500 | 50 | 450 | +200 |
| Platina | `Platinum` | 500 | 1.000 | 100 | 900 | +400 |
| Diamante | `Diamond` | 1.000 | 2.000 | 200 | 1.800 | +800 |
| Mestre | `Master` | 2.500 | 5.000 | 500 | 4.500 | +2.000 |
| Campeão | `Champion` | 5.000 | 10.000 | 1.000 | 9.000 | +4.000 |

O perdedor perde uma entrada. “Recebe 90” e “ganha 40” no Bronze são números diferentes e ambos devem aparecer. A taxa não é mais uma cobrança por fora.

No código atual, o rake fica registrado em `liga_stakes`, sem lançamento de crédito para a casa. O contrato completo para integrar a tesouraria existente, permitir uso promocional e preservar origens está em `07_TAXA_DA_CASA_E_TESOURARIA.md`.

Se os tiers forem diferentes, manter a regra atual: **stake do tier mais baixo dos dois**. O servidor calcula o valor efetivo; a interface exibe o valor da própria faixa como teto antes de buscar. Não elevar a aposta porque o rival está em um rank maior.

## 2. A crítica econômica mais relevante

Com essa taxa, duas pessoas de habilidade igual perdem saldo, em média, mesmo alternando vitórias. Para stake `s` e probabilidade de vitória `p`, desconsiderando empates:

`resultado líquido esperado = p × 0,8s − (1 − p) × s = s × (1,8p − 1)`

O equilíbrio ocorre em **55,56% de vitórias**. Com 50%, a perda média é 10% do stake por participação: 5 no Bronze, 25 no Ouro e 500 no Campeão.

Isso transfere PokéCash dos jogadores para a casa; não é uma fonte ilimitada de ganho dos jogadores. Sem reposição controlada ou outras utilidades, muitos ficam sem saldo e abandonam. Subir o stake de 50 para 5.000 multiplica o risco por **100**; o ritmo de obtenção de saldo precisa ser coerente com isso.

Recomendação: preservar a tabela na implementação inicial, medir Bronze/Prata primeiro e abrir exposição nos tiers altos gradualmente. O rank pode evoluir no teste, mas o piloto não deve oferecer aposta alta sem participantes, saldo e reposição suficientes. Os limiares de abertura são operacionais e aparecem no documento de validação.

## 3. Um nome público, origens diferentes

O jogo já separa PokéCash em buckets. Usar isso, com rótulos compreensíveis ao jogador:

| Origem | Bucket atual | Uso neste desenho |
|---|---|---|
| Promoções e recompensas de acesso | `bonus` / PC-B | Entrar na Arena; recompensas de marketing permanecem identificadas. |
| Saldo competitivo existente | `competitivo` / PC-C | Complementar entrada quando o bônus não basta. |
| Saldo elegível para negociar | `transferivel` / PC-T | Troca e mercado entre jogadores, conforme as regras existentes. |
| Saldo comprado | `comprado` | Não integra o stake da fila atual. |
| League Points | Livro de LP, fora da carteira | Loja da Liga e prestígio; não são PokéCash. |

`planoDoStake` gasta bônus primeiro e competitivo depois. O stake próprio do vencedor retorna aos buckets de onde saiu; o ganho sobre o adversário entra em **bônus**. PC-T e comprado não cobrem a entrada atual.

Exemplo: A entra com 30 bônus +20 competitivo e vence no Bronze. Recebe de volta esses 30+20, mais 40 bônus. A soma recebida é 90; não há conversão dos 40 de prêmio para PC-T.

**Implicação para a visão do dono:** vencer a Arena pode financiar mais Arena e recompensas internas, mas atualmente não paga diretamente um Pokémon no mercado. O ciclo competitivo cria demanda por bons Pokémon; a liquidez de negociação exige sua própria fonte. Misturar os buckets sem redesenhar as regras de origem, vínculo e fraude produziria um comportamento diferente do sistema atual.

## 4. Reposição inicial — parâmetros propostos

Os valores desta seção são hipóteses de piloto. Exigem implementação e medição, não estão disponíveis hoje.

O código já concede 1.000 PC-B no cadastro e mantém teto rotineiro agregado de 80 PC-B/semana para login/desafios. Os valores abaixo de 50/dia e 100/semana representam um experimento de redesenho para até 450/semana, **incluindo** as rotinas existentes dentro do novo total. Não somar mais 80 por fora. Até executar e validar essa mudança conjunta no estudo econômico e em `engine/emissao.mjs`, permanece a política atual. Kit e campanhas têm orçamento próprio identificado.

| Fonte | Quantidade proposta | Regra de concessão |
|---|---:|---|
| Kit do Campeão | 300 PC-B | Uma vez por conta, ao confirmar a Liga concluída. Até seis derrotas Bronze consecutivas, sem outras entradas. |
| Preparação diária | Até 50 PC-B/dia | Uma missão comprovada de treino e gestão do time; pode ser feita sem stake. Uma concessão por dia do mundo. |
| Marco semanal de competição | Até 100 PC-B/semana | Três partidas elegíveis contra três contas não ligadas, distribuídas por pelo menos dois dias; vencer não é requisito. |
| Campanha promocional | Valor definido por campanha | Orçamento global, público elegível, período, uma concessão por conta e trilha no ledger. |

Não conceder moeda pelo simples clique “buscar”. Busca vazia, refresh, replay e reenvio não pagam. Uma missão de preparação deve ter lista explícita de ações válidas e evidência persistida; trocar o mesmo golpe e desfazer em loop não conta. Preferir objetivos como concluir um treino e revisar uma fraqueza do time uma vez no dia, sem vender uma vantagem obrigatória.

Essa reposição mantém uma forma de recuperação por atividade. Ela não garante que o jogador ficará solvente em todo rank, nem promete lucro. Um jogador sem saldo conserva treino, coleção, negociação e amistosos.

### Conferência de emissão

Com `N` contas ativas, seis participações por pessoa por dia e todas no Bronze:

- Partidas semanais: `N × 6 × 7 ÷ 2 = 21N`.
- Arrecadação da casa: `21N × 10 = 210N` PC/semana.
- Reposição máxima proposta: `(7 × 50 + 100)N = 450N` PC-B/semana, com rotinas existentes incluídas no redesenho.
- Necessidade adicional de financiamento: **240N** antes de kits e outros gastos, a partir de dotação prévia ou emissão explícita. O kit inicial exige `300` de verba por nova conta elegível.

Logo, a taxa da casa não financia sozinha todos esses tetos. O piloto precisa de orçamento semanal explícito e medir concessões realmente resgatadas, stakes, arrecadação, saldo da casa, saldo dos jogadores e recuperação após perdas. Cosméticos internos pagos com PC-B podem ser um consumidor adicional, com destino registrado e sem permitir revenda transferível dos itens.

Use a conservação do sistema: `saldo final de jogadores + casa = saldo inicial de jogadores + casa + emissão externa − queimas explícitas`. Payout, taxa para a casa e promoção paga pela casa são transferências internas. A arrecadação em PokéCash simulado não equivale automaticamente a faturamento em reais.

## 5. Liquidez para capturar e negociar

A fonte atual de PC-T da Jornada é finita: oito insígnias de 50, quatro selos de 75 e final de 150, total **850 por conta**, com a maturidade atual de sete dias. Repetir o Campeão não renova essa fonte. Quando a campanha termina, o endgame pode aumentar a demanda enquanto as taxas do mercado reduzem a liquidez restante.

Preservar troca criatura por criatura como caminho sem necessidade de comprar saldo. Para prolongar o mercado, propor uma fonte pequena de PC-T earned de pós-Liga, separada de bônus promocional e do resultado de apostas:

- Até **50 PC-T por conta por semana**, por missão de progressão pós-Liga validada no servidor.
- Prova sugerida: atividade em dois dias e um marco real de captura/evolução; não exigir compra nem vitória apostada.
- Conta já madura pelas regras atuais, elegibilidade e bloqueios de risco existentes.
- Uma chave por conta/semana; não há recompensa por repetir arbitrariamente a mesma ação.
- Piloto fechado com até 100 contas elegíveis: orçamento máximo de **5.000 PC-T/semana**, reservado para esse grupo. Expansão exige recalcular o teto global; não servir “quem clicar primeiro” sem critério anunciado.
- Registrar novo tipo de emissão no ledger, painel de orçamento e testes de conservação. Esse earned deve participar da avaliação de elegibilidade da carteira; não herdar sem análise o tratamento de `WELCOME_GRANT` legado.

É uma extensão econômica proposta. Não transformar PC-B ganho na Arena em PC-T, não tornar resgate de cupom um caminho automático para moedas transferíveis e não contabilizar valores de missão como stake de prêmio.

Missões podem pagar itens vinculados de treinamento e captura no lugar de moeda quando a liquidez do mercado já estiver suficiente. A escolha deve respeitar a regra de origem: recompensa vinculada não pode ser revendida indiretamente como criatura transferível sem o sistema aplicar sua política de vínculo.

## 6. Defesa offline precisa de exposição limitada

A inscrição atual é um booleano. Para a nova arena central, acrescentar uma autorização de defesa que o usuário revisa antes de ativar:

| Campo | Padrão proposto |
|---|---|
| Time autorizado | Snapshot escolhido e válido |
| Stake máximo aceito | Stake do tier no momento da autorização |
| Número máximo de defesas | 3 por autorização |
| Orçamento de entradas | No máximo 3 × stake aceito, configurável para menos |
| Validade | 24 horas no relógio do servidor |
| Renovação | Ação explícita; não renovar automaticamente durante ausência |

O orçamento é consumido pelo **stake bruto de cada defesa**, mesmo quando o jogador ganha. Assim, não há uma autorização que se perpetua porque ganhou uma partida. Bronze com orçamento 150 e limite 3 permite três defesas de 50; a perda máxima autorizada é 150, sujeita ao saldo e aos limites já existentes.

Promoção a um tier maior não eleva o teto autorizado. O pareamento pode usar uma entrada menor que o teto se o outro estiver em tier inferior; não pode superar o teto. Expiração, saída da fila, mudança de posse, limite ou falta de saldo impedem nova reserva.

A autorização não congela automaticamente os 150 na carteira: o saldo é conferido e o stake de cada partida é debitado na mesma transação da partida. Se a reserva falha, não há consumo de orçamento, MMR ou resultado pago. Se o produto futuramente quiser saldo reservado para toda a inscrição, isso será outro contrato de escrow.

## 7. Marketing com PokéCash

Campanha sugerida: **“Vença a Liga e receba até seis entradas Bronze”**, referindo-se ao kit de 300, sem afirmar seis vitórias. Antes de terminar a Jornada, mostrar progresso até o acesso. No pós-Liga, o criativo pode destacar seu time, seu tier e a Arena animada.

Desenho técnico mínimo de campanha, financiada por orçamento reservado da casa ou dotação explicitamente registrada:

1. Identificador de campanha, período, valor por conta e orçamento máximo.
2. Resgate idempotente autenticado e critério de elegibilidade no servidor.
3. Crédito sempre em PC-B; origem preservada no ledger.
4. Conta ligada, duplicidade e orçamento esgotado tratados sem crédito parcial inesperado.
5. Métricas do resgate até a primeira disputa, retorno em sete dias e mudanças no time.

Creditar jogador e debitar o orçamento da casa são uma transação. A campanha nunca trata PC-B recebido como taxa da casa como se fosse PC-T livre. Caixa promocional insuficiente exige reduzir a oferta ou registrar uma dotação nova; não conceder saldo sem identificar sua origem.

Para convite, pagar recompensa depois de uma conquista verificada do convidado, e não depois de criar conta. Contas ligadas ou ciclos de convite não devem gerar moedas. A divulgação externa e o envio de convites não fazem parte deste pacote.

## 8. Monetização coerente com a competição

Começar por cosméticos que tornam rank e coleção visíveis: moldura do treinador, entrada no palco, efeitos de vitória, skins de cenário, emotes e uma vitrine de temporadas. Oferecer prévia e preço fixo, sem modificar precisão, IVs, dano ou matchmaking.

Passe de temporada pode conter cosméticos e objetivos de participação. Não colocar uma espécie competitivamente obrigatória, IV superior ou recuperação ilimitada de stake atrás do passe. O código possui `season_pass_enabled`, atualmente com padrão desligado; a existência da bandeira não significa que uma oferta comercial esteja pronta.

Não tratar a taxa sobre moeda simulada como receita em dinheiro. Receita real exigiria produto comercial, pagamentos e contabilização próprios. Este pacote mantém o stake no modelo de PokéCash simulado existente; saque, conversibilidade e compra de stake seriam outro desenho.

O critério para monetizar é o jogador pagar para exibir seu progresso e se expressar. Se pagar se tornar a forma normal de voltar a disputar depois de perdas, a Arena terá dificuldade para construir uma população competitiva duradoura.
