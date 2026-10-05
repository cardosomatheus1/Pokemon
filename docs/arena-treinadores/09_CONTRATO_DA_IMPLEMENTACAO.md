# Contrato da implementação AT6

Este é o desenho aplicado ao código em 04/10/2026. O estado da entrega mora
em `../RETOMAR.md` e a fila em `../ROADMAP.md`. O estudo 08 descreve o baseline
anterior; não certifica as regras atuais.

## Combate e equilíbrio

A TBE `tbe-4` preserva nível real, IV ±5% por stat, natureza ±5%, físico versus
especial, tipos, STAB 1,5, precisão por golpe, crítico 1/16×1,5 e variação de
dano 0,85–1. A iniciativa é velocidade×uniforme(0,90;1,10), um sorteio por
lutador vivo/turno, registrado no replay. A Arena comum preserva seu motor.

Equilibrado usa o dano esperado real; Agressivo prioriza chance de KO. A
estimativa integra precisão, crítico, arredondamento e variação sem consumir
RNG. Nomes de golpes não acrescentam PP, status, prioridade ou carga.

A medição independente de 40 mil lutas, em quatro formações espelhadas de
nível 60, mostrou +1 nível com 57,5%–70,7% de vitória e +5 com 82,7%–99,7%.
IV31 em todos os stats contra IV15 atingiu 70,4%–97,7%. São espelhos específicos;
não são odds para qualquer time. O treino ajuda, mas power sozinho não basta
para equilibrar a fila. Os dados e intervalos por par estão em
`BALANCEAMENTO_TBE4.json`.

## Arena e dinheiro

A competição exige Jornada inteira concluída e seis indivíduos de espécies
diferentes. Apenas a fila do servidor cria partida ranqueada com aposta.
Amistosos não dão MMR/LP; bots identificados servem ao treino sem aposta.

O tier deve coincidir. Os filtros aceitam até 150 MMR de diferença, razão
simétrica de power 1,05, nível médio até 1 e nível ordenado por posição até 2.
Contas ligadas, os três adversários recentes e o cooldown continuam excluídos.
A fila estima cada confronto com 128 pares, alternando lados. Exige estimativa
de 35%–65% e IC95 dentro de 30%–70%; examina até doze candidatos por busca.
São parâmetros de piloto. A estimativa não usa a raiz privada da luta nem
modifica os atributos. Sem par elegível, não cobra e não inventa um bot pago.

Stakes por jogador: Bronze 50, Silver 100, Gold 250, Platinum 500, Diamond 1000,
Master 2500 e Champion 5000. A casa recebe 10% do pote. Em Bronze, os jogadores
põem 100 juntos; o vencedor recebe 90 e a casa 10. Carteiras, partida,
tesouraria, defesa e ranking gravam na mesma transação. Retry não repaga;
empate e cancelamento técnico devolvem integralmente, com taxa zero.

A defesa é autorizada para o snapshot atual, por 24 horas, até três partidas
e orçamento bruto de três stakes. Ganhar não renova orçamento. Nova publicação
invalida a autorização. O desafiante confirma cada aposta manualmente.
Defensor sem saldo ou em pausa sai da busca.

A tesouraria da Arena usa ledger imutável PC-B/PC-C; a tesouraria anterior dos
mercados permanece separada. Campanhas internas só redistribuem saldo existente,
com teto e idempotência. Não existe endpoint público de emissão nem conversão
promocional para PC-T. Compras/saques reais continuam sujeitos ao §25.1.

## Progressão e temporada

Vencer o Campeão concede uma única vez 300 PC-B. Campeões anteriores recebem
na primeira publicação válida. O kit não é receita da casa. A emissão semanal
de 450 PC proposta no estudo econômico não foi ativada.

XP de repetição da Jornada tem intervalo global de trinta segundos e teto de
6000 por conta/dia, somado entre participantes. Primeiras vitórias não consomem
o teto. Isso não modifica XP do Avanço nem DEC-29/31. O ranking usa atividade
ranqueada da temporada atual. Eventos novos são fatos idempotentes do servidor.

As referências dos ginásios foram recalculadas na TBE atual. Cada ginásio tem
vitória abaixo de 50% ao ignorar a lição; aplicá-la melhora pelo menos vinte
pontos percentuais. Na Liga mede-se também o ganho relativo. As metas antigas
70% de derrota/60% de vitória não são apresentadas como preservadas.

## Reproduzir

```bash
node tools/testar-arena.mjs --saida=docs/arena-treinadores/VALIDACAO_FOCADA.json
node tools/sabotar-arena.mjs --saida=docs/arena-treinadores/SABOTAGEM_FOCADA.json
node tools/medir-arena-treinadores.mjs
```

Por instrução do dono, o recorte é focado nas alterações. Não equivale à suíte
integral, ao Q2 legado inteiro ou à inspeção visual. Fixtures históricas de Liga
testam leitura/fechamento de dados legados; a suíte AT6 testa as rotas atuais.


## Ajuste posterior de progressão — XP-OFF

A Spec §7.22.18 detalha a correção solicitada em 04/10: XP de Avanço e
expedição cresce por estágio com fatores 1/1,5/2/3, preservando estágio 1 e
moeda. A barra aplica os mesmos 88% e clima da liquidação. Jornada e seu teto
repetível não mudaram. Treino do banco passa a acumular independentemente de
expedição: 3 XP/h, 1 vínculo/h, até 12 horas/ausência, frações preservadas,
primeira ativação sem retroatividade e aventura excluída. Créditos atômicos
no relógio do servidor, ou mesma conta no save local. Relatórios reproduzíveis:

```bash
node tools/testar-arena.mjs --so=progressao-offline,modulos,idle-conta,idle-acoes,colheita,colheita-rotas,ausente,time-aprende,stamina-balanco,avanco-paga,comeco-treinador,avanco-tela,expedicao,estagios,banco-servidor,colecao-servidor,avanco-estado,run-servidor,run-avanco,avanco-forca,forma-estagio,curva-comeco,historico,arena-treinadores --saida=docs/arena-treinadores/VALIDACAO_XP_OFFLINE.json
node tools/sabotar-arena.mjs --grupo=progressao --saida=docs/arena-treinadores/SABOTAGEM_XP_OFFLINE.json
```
