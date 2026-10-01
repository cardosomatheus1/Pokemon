# Simulação da economia entre jogadores (ST-14.15 · gate C)

> **Sensibilidade, não previsão.** Os números abaixo são consequência das hipóteses de cada cenário.
> Nenhum jogador real passou por eles, e nenhum preço daqui é "o preço sustentável" — a spec E14 proíbe
> declarar isso a partir de um simulador. Gerado por `node tools/simular-e14.mjs 42`.

## Execução

- semente: `42` (a mesma semente devolve o mesmo relatório, byte a byte, fora esta seção)
- máquina: Intel(R) Xeon(R) Processor @ 2.10GHz · 4 núcleos · linux · Node v22.22.2
- duração: 267 ms para 12 execuções
- política de taxas: `taxas-v1-piloto` (a mesma função que o servidor cobra)

## Os quatro cenários

| cenário | usuários | emissão | queima | circulante | top 10% | HHI | anúncios | vendas | venda/anúncio | mediana | shiny | furo | mint P2P |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| baixa_liquidez | 60 | 180.000 | 225 | 125.775 | 13.7% | 0.0179 | 12 | 3 | 25.0% | 1.627 | 11 | 0 | 0 |
| equilibrio | 300 | 900.000 | 1.392 | 628.608 | 13.9% | 0.0036 | 52 | 23 | 44.2% | 1.820 | 56 | 0 | 0 |
| alta_concentracao | 300 | 952.000 | 1.654 | 680.346 | 18.8% | 0.0038 | 57 | 28 | 49.1% | 1.777 | 62 | 0 | 0 |
| abuso_contas_novas | 380 | 1.140.000 | 5.771 | 792.229 | 31.9% | 0.0393 | 38 | 19 | 50.0% | 1.717 | 50 | 0 | 0 |

`furo` e `mint P2P` têm de ser **zero** em todo cenário: o primeiro é emissão − queima − gasto − circulante;
o segundo, o que entrou por passagem entre jogadores menos o que saiu. Qualquer outro número é o simulador errado.

## Sensibilidade · abuso de contas novas × detecção de conta ligada

| detecção | ao detectar | tentativas | passaram | bloqueadas | volume do funil | fatia da principal | top 10% |
|---|---|---|---|---|---|---|---|
| 0.0% | recusa a tentativa | 800 | 800 | 0 | 167.760 | 20.6% | 32.5% |
| 50.0% | recusa a tentativa | 1127 | 582 | 545 | 156.813 | 19.3% | 31.9% |
| 90.0% | recusa a tentativa | 1840 | 211 | 1629 | 120.478 | 14.0% | 25.7% |
| 50.0% | congela a conta | 197 | 117 | 80 | 24.411 | 3.1% | 14.6% |
| 90.0% | congela a conta | 91 | 11 | 80 | 2.283 | 0.2% | 12.6% |

Leitura, nas hipóteses deste cenário: a taxa de venda (2%) queima pouco do que o funil passa — **a taxa não
é a defesa contra contas novas.** E recusar só a TENTATIVA quase não muda o volume: a conta nova junta mais um
dia de PC-T e tenta de novo, com um valor maior. O que derruba o funil é a detecção que **congela a conta**
(o congelamento da ST-14.14), porque aí o PC-T que ela juntou para de procurar caminho. O funil é PC-T de fonte
aprovada que cada conta ganhou jogando: ele não cria moeda, concentra a que existe.

## Sensibilidade · equilíbrio × taxa shiny

| taxa shiny | shiny nascidos | anúncios | vendas | mediana |
|---|---|---|---|---|
| 1/4000 | 30 | 27 | 10 | 1.730 |
| 1/2000 | 56 | 52 | 23 | 1.820 |
| 1/500 | 218 | 173 | 65 | 1.670 |

## Parâmetros por cenário

- **baixa_liquidez**: dias=30, usuarios=60, especies=150, encontrosDia=30, captura=0.4, shiny=0.0005, mestraDia=0.02, mestraUso=0.5, pctDia=100, gastoDia=0.3, precoRef=2000, listar=0.6, demanda=0.04, prazoDias=7, especuladores=0, capitalEspeculador=20, sybils=0, deteccaoLigadas=0, congelaAoDetectar=false
- **equilibrio**: dias=30, usuarios=300, especies=150, encontrosDia=30, captura=0.4, shiny=0.0005, mestraDia=0.02, mestraUso=0.5, pctDia=100, gastoDia=0.3, precoRef=2000, listar=0.5, demanda=0.2, prazoDias=7, especuladores=0, capitalEspeculador=20, sybils=0, deteccaoLigadas=0, congelaAoDetectar=false
- **alta_concentracao**: dias=30, usuarios=300, especies=150, encontrosDia=30, captura=0.4, shiny=0.0005, mestraDia=0.02, mestraUso=0.5, pctDia=100, gastoDia=0.3, precoRef=2000, listar=0.5, demanda=0.3, prazoDias=7, especuladores=0.05, capitalEspeculador=40, sybils=0, deteccaoLigadas=0, congelaAoDetectar=false
- **abuso_contas_novas**: dias=30, usuarios=300, especies=150, encontrosDia=30, captura=0.4, shiny=0.0005, mestraDia=0.02, mestraUso=0.5, pctDia=100, gastoDia=0.3, precoRef=2000, listar=0.5, demanda=0.2, prazoDias=7, especuladores=0, capitalEspeculador=20, sybils=80, deteccaoLigadas=0.5, congelaAoDetectar=false

## Limites do modelo

- Encontros independentes e taxas fixas; sem sazonalidade, sem abandono, sem curva de aprendizado.
- O comprador olha só o anúncio mais barato; o vendedor não reprecifica (só o especulador revende, a +30%).
- Uma espécie shiny vale o mesmo que outra: `precoRef` não varia por espécie nem por potencial.
- O PC-T por dia é uma constante por conta; o gasto em sinks do jogo é uma fração fixa dele.
- Não há troca direta (só Market): a troca não emite nem queima além da própria taxa, e o gate C a cobre no
  teste ponta a ponta (`test/e14-economia.mjs`), não aqui.
- A bola de captura garantida entra por uma chance diária, não pelas fontes reais do pack.
