# Dez por cento do pote para a casa

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

**Decisão do dono:** em uma disputa ranqueada entre jogadores, **10% do pote vai para a casa e 90% retorna ao vencedor**. Não cobrar uma taxa adicional por fora. Empate e cancelamento técnico continuam sem taxa.

## 1. Exemplo Bronze

| Movimento | PokéCash |
|---|---:|
| Entrada de A | 50 |
| Entrada de B | 50 |
| Pote | 100 |
| Crédito para a casa | 10 |
| Retorno total do vencedor | 90 |
| Ganho líquido do vencedor | +40 |
| Resultado líquido do perdedor | −50 |

Invariante: **retorno ao vencedor + crédito da casa = pote**. Em empate: **devolução de A + devolução de B = pote**, com crédito zero para a casa.

A fórmula já executada de stake e payout está correta para os números pedidos. A mudança necessária é registrar o destino da taxa e sua utilização de forma consistente.

## 2. O que existe no código

- `engine/stake-liga.mjs` já usa `RAKE = 0.10` e calcula payout de 90% do pote.
- `server/stake-liga.mjs` grava o rake em `liga_stakes`; não credita a tesouraria nessa liquidação.
- `engine/carteira.mjs` comenta explicitamente que essa parte do stake do perdedor não volta a ninguém.
- O repositório **já tem `treasury_ledger`**, criado em `server/banco.mjs` e utilizado por `server/mercado.mjs` para taxas, resíduos e valores de mercados de previsão. A casa não é uma conta em `users`.
- Essa tabela tem catálogo fechado de tipos `MARKET_FEE`, `MARKET_RESIDUE` e `MARKET_UNCLAIMED`, além de aceitar apenas valores positivos. Não inserir nela um tipo novo sem adaptar o contrato.

Portanto, a taxa PvP atual se comporta como retirada da circulação dos jogadores. A nova regra é uma **transferência à casa**, com saldo e destinação auditáveis. Não criar usuário fictício de casa nem outra carteira de jogador para isso.

## 3. Extensão aditiva recomendada

Criar um módulo **proposto** `server/tesouraria.mjs` como serviço comum de consulta e lançamentos da casa. Reusar o livro existente de mercados de previsão e acrescentar uma extensão de movimentos de PvP, em vez de reconstruir a tabela histórica para relaxar seus CHECKs.

Estruturas novas propostas:

| Estrutura | Responsabilidade |
|---|---|
| `treasury_pvp_ledger` | Livro append-only de taxa PvP, dotação promocional explícita, pagamento de promoção e compensações. |
| `treasury_pvp_origins` | Composição por origem PC-B/PC-C dos movimentos; associação ao lançamento. |
| `treasury_movements` | View normalizada de leitura sobre o livro existente e a extensão, sem duplicar registros. |

No livro novo, `amount` é inteiro assinado e diferente de zero. Entrada da casa é positiva; gasto promocional é negativo. Tipos de movimento iniciais propostos: `LEAGUE_RAKE`, `PROMO_FUNDING`, `PROMO_PAYOUT` e `RAKE_REVERSAL`. Cada lançamento leva ID, chave idempotente, tipo, referência, data do servidor e origem.

Saldo é derivado dos livros, e saldo disponível desconta orçamentos promocionais já reservados. Consulta de PvP separa sua origem; o histórico dos outros mercados não vira automaticamente verba promocional, principalmente quando sua proveniência não foi armazenada.

Essa extensão é uma estrutura subordinada à mesma tesouraria, não uma moeda nova. O serviço e o painel devem reunir os movimentos relevantes e evitar duas contagens da mesma taxa.

## 4. Crédito dentro da transação da partida

Na mesma transação que grava a disputa e liquida as entradas:

1. Debitar os stakes pelos buckets permitidos atuais.
2. Calcular o resultado e aplicar as regras de integridade.
3. Devolver stake próprio e pagar ganho do vencedor conforme a política atual.
4. Se a partida estiver efetivamente liquidada com vencedor, lançar `LEAGUE_RAKE` de `rake` na tesouraria, com chave `league-rake:<partida>`.
5. Gravar a composição de origem da taxa, a autorização de defesa, MMR, LP e demais efeitos.
6. Confirmar tudo junto. Falhar o crédito da casa também desfaz a liquidação nova.

Empate, partida inelegível, busca sem adversário, bot e amistoso não geram crédito de rake. Reenviar a mesma chave não gera uma segunda entrada na tesouraria.

Preservar a regra atual de retorno do vencedor. A taxa provém da parcela do stake do perdedor não repassada ao vencedor. Se o perdedor entrou com 30 PC-B e 20 PC-C e a taxa é 10, a proveniência proporcional da casa é **6 PC-B e 4 PC-C**. Implementar arredondamento determinístico quando a divisão não for inteira e exigir que as parcelas somem exatamente a taxa.

Origem dos fundos não deve ser perdida: taxa captada de bônus promocional não se transforma automaticamente em saldo transferível nem em receita monetária realizável.

## 5. Marketing financiado pela casa

A arrecadação pode financiar kit de acesso, campanhas, recuperação limitada e incentivos de participação. Reservar verba da casa para uma campanha antes de prometer os resgates. No crédito ao jogador:

- Debitar a tesouraria e creditar PC-B ao jogador na mesma transação.
- Registrar campanha, elegibilidade, limite individual e chave de concessão.
- Preservar origem e destino; reciclar PC-C para bônus promocional é uma política explícita, sem conversão para PC-T.
- Não conceder duas vezes nem gastar mais que o saldo e orçamento disponíveis.
- Dotação externa de PokéCash simulado, quando usada para lançar uma campanha, é registrada como **nova emissão**, e não como taxa já arrecadada.

Transferir 50 da casa para jogadores não cria 50 novos no sistema. Emitir uma dotação nova de 50 cria. O painel precisa separar esses movimentos.

O fato de a casa receber 10% não torna qualquer orçamento sustentável. No exemplo de seis participações Bronze por jogador/dia, a arrecadação semanal é `210N` para `N` jogadores. Um experimento de reposição de `450N` por semana exige pelo menos mais `240N` de saldo previamente destinado ou emissão explícita, antes de kits e outras campanhas.

Também considerar a reposição existente: hoje a rotina de login/desafios já possui teto agregado de 80 PC-B/semana. Qualquer redesenho desse teto precisa modificar estudo e código juntos; marketing não pode contornar a política só mudando o nome do crédito.

## 6. Circulação e queima são fenômenos diferentes

Usar estas equações no painel e no simulador:

`saldo dos jogadores após disputa = saldo anterior − taxa`

`saldo da casa após disputa = saldo anterior + taxa`

`saldo total do sistema = saldo dos jogadores + saldo da casa`

Na disputa, o total não muda. Se a casa reaplica a taxa em promoções, o saldo volta a circular. Se efetuar uma queima explícita, o total diminui. Se receber uma dotação externa de moeda simulada, o total aumenta. Não contabilizar a mesma taxa como crédito da casa e queima ao mesmo tempo.

As taxas atuais de negociação entre jogadores possuem sua própria regra de queima. A decisão aqui refere-se à aposta PvP; não mudar silenciosamente o destino das taxas de troca e do mercado de criaturas.

Como o stake continua em PC-B/PC-C do modelo simulado, o painel distingue arrecadação em PokéCash de receita em dinheiro. Cotação nominal de PokéCash, por si só, não torna todo bônus recebido pela casa um recebimento em reais.

## 7. Migração e histórico

Aplicar a nova destinação a partidas criadas sob a política nova. Replays, payouts e saldos de jogadores de partidas antigas não mudam.

Não creditar automaticamente à casa o rake de toda a história como saldo novo disponível: a regra anterior tratava a parcela como retirada. Se for necessária uma abertura contábil retroativa, ela exige uma regra explícita de saldo inicial e reconciliação, sem contar a mesma unidade duas vezes.

Compensações após uma liquidação ficam em novos lançamentos com referência ao original. Não apagar taxa ou editar o log da partida. Devolução posterior a um prêmio já gasto exige uma regra específica de compensação e saldo; não tentar desfazê-la com um UPDATE no histórico.

## 8. Story AT6-11 — taxa PvP para a casa

**Prioridade:** P0, antes de campanhas e da liberação da nova arena. **Dependência:** contrato de modalidade AT6-02 e fronteira transacional AT6-03.

**Arquivos:** `server/stake-liga.mjs`, `server/partida.mjs`, `server/banco.mjs`, `engine/stake-liga.mjs` para comentários/contrato, novo `server/tesouraria.mjs`; atualização dos estudos e painel.

**Aceite:**

- Bronze debita 50 de cada lado, retorna 90 ao vencedor e credita 10 à casa.
- Todos os tiers respeitam `payout + taxa = pote`.
- Empate/cancelamento creditam zero à casa e devolvem as entradas.
- Mesma partida gera exatamente um `LEAGUE_RAKE`.
- Falha na tesouraria faz rollback dos movimentos novos de jogadores, MMR e LP.
- Composição PC-B/PC-C da casa soma a taxa, inclusive com arredondamento.
- Uma campanha paga pelo saldo da casa reduz esse saldo e credita PC-B na mesma transação.
- Gastos simultâneos não estouram o orçamento da casa/campanha.
- Histórico de mercados de previsão e seus testes seguem válidos.
- O painel apresenta arrecadação, gastos, saldo disponível, emissão externa e queima separadamente.

**Testes:** ampliar `test/liga-stake.mjs`; teste novo proposto `test/tesouraria-liga.mjs`; rodar `test/mercado-liquidacao.mjs` e `test/mercado-podio-servidor.mjs` para comprovar a integração com a estrutura existente.
