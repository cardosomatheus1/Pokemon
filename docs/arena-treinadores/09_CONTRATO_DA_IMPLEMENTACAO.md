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


## Avanço com combate real — AT6-13

Spec §7.22.19 substitui o motor agregado somente nas novas runs. Nível, IV,
natureza, tipos, golpes, precisão e críticos passam a produzir cada impacto
real. HP persiste entre inimigos; guia ajuda outro consciente; recuperação
não revive. Poções e recuo sincronizam a ação antes de aplicar seu efeito;
abates parciais são salvos mesmo sem descoberta nova. A cena usa a espécie,
vida e golpes do aliado ativo. Runs legadas seguem sua regra até colher.

`VALIDACAO_AVANCO.json`: 37 suítes, 470 testes, zero falhas. Inclui combate
contínuo versus rápido, relógio regressivo, cura após impacto, SQL/HTTP,
rollback, colheita/captura e leituras frequentes versus retorno offline.
Após ajustar o rótulo de imunidade, 115 testes das superfícies de cena/moveset/
módulos foram repetidos sem falhas. Servidor estático entregou HTML e os novos
módulos com HTTP 200/MIME correto; isso não equivale a inspeção visual.
`SABOTAGEM_AVANCO.json`: 8/8 defeitos capturados. O teste de gravação parcial
foi refinado para exigir um abate sem outro evento, evitando um falso positivo.

`BALANCEAMENTO_AVANCO.json`: 3.500 runs exploratórias. Mais nível e IV ajudam;
porém, os iniciais nível 5 na Floresta vencem 5/78/4%, na ordem planta/fogo/
água. Essa assimetria fica aberta em L-AT6-04. Não declarar balanceamento
completo, certificação de emissão, Q5 ou plano AT6/GQ inteiro concluídos.

```bash
node tools/testar-arena.mjs --so=avanco-combate,combate-continuo,run-servidor,run-rotas,run-avanco,avanco-estado,avanco-tela,avanco-efeito,avanco-forca,avanco-paga,avanco-boss,avanco,guia,foco,primitivas,treino-batalha,batalha-precisao,arena-treinadores,liga-partida,presets,idle-acoes,idle-conta,idle-servidor,colecao-servidor,colheita,colheita-rotas,expedicao,progressao-offline,curva-comeco,time-aprende,banco-servidor,modulos,conteudo,moveset,run-fim,run-fantasma,captura --saida=docs/arena-treinadores/VALIDACAO_AVANCO.json
node tools/sabotar-arena.mjs --grupo=avanco --saida=docs/arena-treinadores/SABOTAGEM_AVANCO.json
node tools/medir-avanco-combate.mjs --saida=docs/arena-treinadores/BALANCEAMENTO_AVANCO.json
```


## Catálogo e informação dos golpes — AT6-14-info

Spec §8.18: catálogo explícito separado para o treinador, mantendo listas da
Arena comum. Precisões efetivas são as mesmas: 40 ausências viram 92% no
catálogo Kanto; valores individuais existentes permanecem. Efeitos secundários
continuam ausentes e isso é informado. A TBE e a ficha do Centro consomem os
mesmos metadados; o carregamento recusa promessas de efeitos não suportados.

194 testes focados, 4/4 defeitos provocados detectados. 320 confrontos nos
quatro presets preservam eventos; goldens/paridade da Arena comum passam.
HTTP estático entregou HTML e módulos novos com 200/MIME correto, sem
certificar execução ou legibilidade num navegador.
Integração do Centro em DOM sintético verifica texto visível e controles nas
duas abas. Não equivale a Q5. AT6-14 permanece parcial: dominância/seletor de
moveset do rival exigem calibração própria antes de alterar NPCs.

```bash
node tools/testar-arena.mjs --so=catalogo-treinador,conteudo,modulos,treino-batalha,batalha-precisao,combate-continuo,moveset,comparador,exclusivos,arena-treinadores,liga-partida,liga-replay,jornada-equilibrio,presets,equipe-snapshot,avanco-combate,run-servidor,idle-acoes,minha-colecao,golden,paridade,primitivas --saida=docs/arena-treinadores/VALIDACAO_CATALOGO.json
node tools/sabotar-arena.mjs --grupo=catalogo --saida=docs/arena-treinadores/SABOTAGEM_CATALOGO.json
```


## Novo ritmo do banco — XP-OFF-2

Spec §7.22.20 substitui 3 XP/h por 150/225/300/450 conforme a fase desbloqueada.
Em oito horas: 1.200/1.800/2.400/3.600 por criatura, com até doze horas por
retorno, sem itens/encontros. A fase é congelada para o próximo intervalo,
sem promoção retroativa; servidor deriva do XP e ignora taxa enviada no body.
Colheita direta usa a mesma fase do relógio e não repaga horas já creditadas.
A XP das expedições idle continua com fatores 1/1,5/2/3 por estágio.

351 testes focados em 25 suítes, quatro mutantes capturados. Estudo mostra
nível 5→14 em oito horas; referências anteriores de espera não certificam
este ritmo. Q5, cenários gerais de progressão e plano AT6/GQ completo pendentes.

```bash
node tools/testar-arena.mjs --so=progressao-offline,modulos,idle-conta,idle-acoes,colheita,colheita-rotas,ausente,time-aprende,stamina-balanco,avanco-paga,comeco-treinador,avanco-tela,expedicao,estagios,banco-servidor,colecao-servidor,avanco-estado,run-servidor,run-avanco,avanco-forca,forma-estagio,curva-comeco,historico,arena-treinadores,run-fantasma --saida=docs/arena-treinadores/VALIDACAO_RITMO_OFFLINE.json
node tools/sabotar-arena.mjs --grupo=ritmo-offline --saida=docs/arena-treinadores/SABOTAGEM_RITMO_OFFLINE.json
```


## Política dos rivais — AT6-14-rivais

Spec §8.19 substitui a pendência do seletor descrita no bloco de catálogo.
NPCs usam precisão e dano esperado TBE na montagem, referência neutra de
base 80 no mesmo nível, sem RNG ou leitura do time do jogador. Especialização,
liberação, movesets dos jogadores e snapshots permanecem preservados.
`rival-2` não altera `tbe-4`; novas runs identificam a política.

Relatório 10/AUDITORIA_RIVAIS.json: 23/16 pares de dominância, 15.100 combinações.
Ginásios e 3.500 runs de holdout pareadas sem alteração de resultados; outro
holdout de 3.300 runs mede orientação por rota. L-AT6-04/06 e Q5 permanecem.

```bash
node tools/auditar-rivais.mjs --saida=docs/arena-treinadores/AUDITORIA_RIVAIS.json
node tools/medir-inicio-avanco.mjs --saida=docs/arena-treinadores/BALANCEAMENTO_INICIO_AVANCO.json
node tools/sabotar-arena.mjs --grupo=rivais --saida=docs/arena-treinadores/SABOTAGEM_RIVAIS.json
```

A comparação histórica em AUDITORIA_RIVAIS usa `--antes` com o mapa de
movesets extraído de `57388f6` antes de alterar a política. Sem esse argumento
o comando publica somente a auditoria atual; não reproduz a comparação.


## Orientação de rota — GQ-01-rotas

Spec §7.22.21, relatório 11 e política `cobertura-duelos-1`. Controle do
Avanço assistido compara golpes da seleção contra elenco/níveis reais da
prévia, com precisão/dano esperado TBE, sem clima ou semente futura.
Botão apenas escolhe outra rota. Guarda da ação limpa conselho executável.
Rota OFF, regras de luta e treino 150/225/300/450 XP/h permanecem iguais.

2.400 runs pareadas com Floresta como referência; não certifica escolha
ótima ou probabilidade mostrada pela UI. Velocidade, ordem/HP acumulado,
poções e guia não são simulados pelo conselho. Q5 e GQ-01 integral pendentes.


## Comparação e leitura da batalha — AT6-05-leitura

Spec §9.18, relatório 12. Liga mostra diferenças entre publicado e atual,
identificadas por ID: nível pelo XP, IV/natureza, evolução/tipos, golpes,
ordem e preset. Atributos são TBE reais; poder/categoria/precisão dos golpes
vêm do catálogo treinador. Nenhuma republicação ou chance automática.

Hash de conteúdo passa a incluir catálogo treinador: times antigos precisam
republicar; replays já gravados permanecem no log. Jornada/replay 6×6 ganham
resumo factual de erros, críticos, efetividade, HP útil e KO dos dois lados.
Não explica causalmente o resultado ou recalcula a luta. Empate com
eliminações e amostra Monte Carlo com empates são narrados corretamente.

256 testes/30 suítes e 14 mutantes dirigidos. Ver relatório de validação para
a falha inicial de ordem do teste offline e sua repetição isolada. Q5,
apresentação integral e instrumentação do funil continuam pendentes.
TBE `tbe-4`, economia e banco 150/225/300/450 XP/h por fase iguais.


## Integração posterior AT6-15 — 05/10/2026

As pendências de implementação de funil, preparação/mercado/retorno e prévia
foram integradas no relatório 13 e Spec §9.19. Campanhas agora têm código
com verba reservada, mas não nascem ativas por padrão. Q5 do recorte foi
executado em três larguras; não é release integral ou medição da população.
O estado e a fila atualizados permanecem em RETOMAR/ROADMAP.
