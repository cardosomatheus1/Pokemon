# Cálculos conferidos — revisão 2.0

Gerado por `verificar_calculos.py`, sem dependências externas. Não executa o motor do jogo. Reexecutar após alterar `premissas.json`.

## Matemática e capacidade

| Grandeza | Resultado | Hipótese/limite |
|---|---:|---|
| Viés absoluto aproximado da odd | 0.1921875 | p=0,016; n=20.000; método delta |
| Viés relativo aproximado | 0.3075% | Estimador puro, aproximação longe de zero |
| Viés relativo Laplace, n=20.000 | 0.05500% | Binomial IID; K=12 |
| Viés relativo Laplace, n=154.000 | 0.00714% | Binomial IID; K=12 |
| Erro-padrão relativo, n=154.000 | 1.9984% | Não é cobertura de 95% |
| n para meia-largura relativa de 2%, normal 95% | 590646 | Marginal; não cobre simultaneamente todas as seleções |
| Overround com margem 8% | 8.6957% | Sem piso/arredondamento; probabilidades somam 1 |
| CPU por rodada / mês | 3,542 s / 42,504 h | Extrapolação histórica; 43.200 rodadas; não benchmark novo |
| Mob / stamina-base | 37 / 23 | Run sem derrota; conferir implementação |

A identidade exata de Laplace foi comparada com soma binomial direta em 32 casos pequenos. Isso verifica a derivação, não o RNG nem a amostragem real do jogo.

## Modelo de conteúdo: hipóteses, não previsão

Sem venda de moeda apostável e sem receita de RMT. Custos hipotéticos: pagamento 3% + R$ 0,40/pedido; tributos 8% da receita bruta; devoluções 2%; perdas adicionais 0,5%; variável R$ 0,30/MAU. Taxas e tributos não são recalculados sobre devoluções nesta simplificação. Custo fixo principal R$ 15.000/mês. Passe R$ 29,90. CAC e investimento inicial não incluídos.

| Cenário | Conversão cosmético | Pedidos/comprador | Ticket | Adesão passe |
|---|---:|---:|---:|---:|
| Baixa adesão | 1.00% | 1 | R$ 10 | 1.00% |
| Adesão intermediária | 3.00% | 1.2 | R$ 15 | 3.00% |
| Alta adesão | 6.00% | 1.5 | R$ 20 | 6.00% |

| Cenário | Receita/MAU | Contribuição/MAU | Resultado com 5.000 MAU | MAU de equilíbrio (fixo R$ 15 mil) |
|---|---:|---:|---:|---:|
| Baixa adesão | R$ 0.399 | R$ 0.03714 | R$ -14814.32 | 403932 |
| Adesão intermediária | R$ 1.437 | R$ 0.91660 | R$ -10416.98 | 16365 |
| Alta adesão | R$ 3.594 | R$ 2.74881 | R$ -1255.95 | 5457 |

Contribuição pequena torna o equilíbrio extremamente sensível. Não inferir que uma comunidade atingirá esses tamanhos ou conversões. Usuários que compram ambos os produtos não são dois pagantes únicos.

| Cenário | Fixo R$ 5 mil | Fixo R$ 15 mil | Fixo R$ 30 mil |
|---|---:|---:|---:|
| Baixa adesão | 134644 | 403932 | 807864 |
| Adesão intermediária | 5455 | 16365 | 32730 |
| Alta adesão | 1819 | 5457 | 10914 |

Valores de equilíbrio arredondados para cima. Se a contribuição ficar não positiva, o JSON retorna `null`: aumentar MAU não resolve aquele modelo. Custos variáveis podem deixar de ser lineares ao escalar; recalcular por faixa.

## Estudos anteriores

Com entradas publicadas arredondadas: 75.000 / 3,12 = 24038.46153846153846153846154 e 87.000 / 2,908 = 29917.46905089408528198074278. Diferenças pequenas dos resultados antigos podem vir de arredondamento; sem os scripts originais, não há reprodução exata.

Exemplo de taxas: 3% + R$ 0,40 representa 11% de ticket R$ 5 e 5% de ticket R$ 20. Isso compara custo por pedido, não conversão ou contribuição por visitante.

## O que ainda precisa ser medido

Simulação do motor, fontes/sinks por perfil, progressão 7/30/90/180 dias, benchmark atual, retenção, preços, conversão, suporte e contratos de taxas reais. O modelo fornecido torna as hipóteses editáveis; não preenche essas lacunas com evidência inventada.
