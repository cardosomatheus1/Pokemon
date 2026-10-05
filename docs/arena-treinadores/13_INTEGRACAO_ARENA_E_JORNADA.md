# Integração da Arena e da jornada — 05/10/2026

Bloco AT6-15-integracao-final. Integra as entregas anteriores AT6-base,
AT6-13/14, XP-OFF-2, GQ-01-rotas e AT6-05-leitura com as superfícies que
faltavam. A versão inicial continua automática e com moeda simulada.
O estado e a fila permanecem exclusivamente em RETOMAR/ROADMAP.

## O que o jogador encontra

| Parte | Comportamento aplicado | Código principal |
|---|---|---|
| Caminho até o endgame | Próxima ação para escolher inicial, avançar na Jornada, completar seis espécies ou abrir Arena 6×6 | preparacao-dados/tela, jornada-tela |
| Arena 6×6 | Após a Liga completa; seis espécies; snapshot publicado; amistoso grátis; fila ranqueada e ranking | liga-equipe, partida, stake-liga |
| Defesa | Consentimento para até três partidas, orçamento e prazo de 24 h; republicação não renova consentimento | stake-liga |
| Batalha | Nível real pelo XP, seis IVs, natureza, golpes legais, tipo/categoria/poder/precisão, STAB, imunidades e críticos | engine/treino-batalha, treino-rival, avanco-combate |
| Preparação | Publicado × Atual, ficha real e fatos do replay; é necessário republicar o time melhorado | comparacao-time, resumo-batalha |
| Mercado | Tipo, níveis mínimo/máximo, atributo e IV mínimo 0–31; IVs individuais na ficha congelada do anúncio | busca-mercado, mercado-jogadores-busca/tela |
| Evolução | Antes/Depois reais, alternativas e consumo; prévia não gasta nem evolui; preserva identidade e IVs | preparacao-dados/tela, evolucao-idle |
| Captura | Chance antes da tentativa e resultado factual; chance alta não é evidência de que faltou pouco | captura-tela |
| Retorno | Explorar, receber XP do banco e vencer um duelo completam objetivos pelos fatos do servidor | missoes-treinador, progressao, customizacao |
| Cosméticos | Prévia do treinador/cenário, preço e entrega vinculada; compra e equipagem existentes | cosmetico-previa, loja-cash, server/cosmeticos |
| Administração | Funil, fila vazia, melhoria, exposição por espécie/tier/preset, D1/D7 e economia por origem | arena-metricas, admin |

## Combate e vantagem de preparação

A TBE permanece `tbe-4`: níveis reais; IVs com contribuição limitada aos
atributos; natureza; ataques físicos/especiais; STAB 1,5; efetividade
0/0,25/0,5/1/2/4; precisão do catálogo; crítico de 1/16 com multiplicador 1,5;
variação de dano 0,85–1 e iniciativa 0,9–1,1. Não surgem efeitos secundários
por interpretar o nome de um golpe. Clima da arena comum não é importado
silenciosamente para a TBE. EVs, habilidades completas e efeitos secundários
exigem contrato próprio; L-AT6-06 registra a diversidade ainda não suportada.

Na arena comum, os participantes sorteados usam nível 50 e atributos
comprimidos em direção à média do elenco. IVs da coleção não entram nesse
sorteio. Os estudos anteriores medem a vantagem das espécies mais fortes.
Na Jornada/ginásios e nas novas runs do Avanço, indivíduos usam a TBE real.
No Avanço, HP, sobreviventes, cura e recuo são persistidos; runs antigas
conservam o contrato em que nasceram.

O ranqueado limita tier, diferença de rating, power, nível médio e distribuição
dos níveis, e usa 128 pares de simulações para recusar vantagem estimada extrema.
Isso restringe o confronto; não equaliza IVs nem garante vitória. A vantagem
individual permanece no dano/vida/velocidade, e composição/preset podem
superar uma diferença de força. Os estudos de combate versionados anteriores
continuam a referência; este bloco não recalibra dano ou regrava suas amostras.

## XP ativo e offline

As fases mantêm 150/225/300/450 XP por hora no banco, até 12 h por retorno.
O estágio anterior remunera o intervalo encerrado; uma promoção só muda os
intervalos futuros. Não há pagamento duplo enquanto o Pokémon está em
aventura, nem reembolso de XP por repetir a chamada. Frações são preservadas.
O navegador verificou 8 h na fase 4 = 3.600 XP por Pokémon e repetição = zero.
Expedições/idle mantêm XP progressivo por estágio. Runs legítimas não recebem
o teto diário da repetição de Jornada, que continua específico ao seu modo.

## Orçamento das campanhas

Sem campanha registrada, permanecem as rotinas existentes de até 80 PC-B
por semana e o Kit do Campeão de 300 PC-B, concedido uma vez. Treinadores
recebem três desafios úteis por dia no mesmo calendário; doze objetivos
podem pagar até 30 PC-B dentro da rotina. Não precisam apostar para fazê-los.

A nova campanha é semanal UTC, com público fechado e imutável. Um operador
com papel `dono`, sessão administrativa, motivo e confirmação pode registrá-la
por `POST /api/admin/arena-campanha`. A casa precisa garantir a verba de TODAS
as vagas antes de disponibilizar o resgate. Sem saldo, a criação é recusada.

- Preparação: até 50 PC-B por dia com atividade real; até 270 por semana.
  Créditos rotineiros do próprio dia reduzem o complemento diário.
- Marco competitivo: 100 PC-B; três partidas ranqueadas elegíveis, três rivais
  e dois dias. Não precisa vencer; amistoso não conta.
- Total: os 80 rotineiros + 270 de preparação + 100 de marco = até 450 PC-B
  por semana. Não são 450 adicionados aos 80.
- Earned: campanha separada, até 50 PC-T por conta/semana, com dotação externa
  exclusiva registrada e conta de pelo menos sete dias. Não converte bônus
  ou a tesouraria em transferível. Exige o mesmo marco competitivo.

Campanhas do mesmo tipo não se sobrepõem para a mesma conta. A verba
reservada não pode ser gasta por outra campanha. Crédito, débito da casa e
fato de concessão são atômicos. O cliente envia somente campanha/objetivo:
não escolhe conta, bucket, preço ou valor. Reenvio e quatro processos concorrentes
produzem um único crédito. Configuração/dotação são imutáveis no banco.

O estudo `ESTUDO_ECONOMIA_COORTES.json` usa um modelo incremental pós-Liga:
100 contas, 12 semanas, oito partidas por conta/semana, todos obtendo o máximo
rotineiro e consumindo 2.000 PC-B/semana em cosméticos. Sem empates, Bronze
gera 4.000 PC para a casa por semana. Financiar 370 extras para todas as
100 contas exigiria 37.000. O modelo sustenta dez vagas semanais, cuja verba
é reservada antes dos cliques. A rotação do público é uma decisão anunciada
do operador; não existe inscrição automática nem campanha padrão ativa.
O modelo demonstra conservação do subsistema, seis derrotas/recuperação e
custos dos tiers; não mede retenção, custo real de aquisição, compras reais
ou todas as fontes e taxas do restante da economia.

## Instrumentação e limites de interpretação

Fatos autoritativos cobrem elegibilidade, publicação, melhoria, consentimento,
busca vazia/sucesso, liquidação e recompensa. Têm chaves idempotentes;
o cliente não pode declarar esses eventos. O painel mantém emissão de kit,
devolução de stake, ganhos internos, taxas e promoções em categorias diferentes.

Retenção D1/D7 usa primeira partida ranqueada elegível registrada e dias UTC
exatos, apenas coortes observadas até o fim do D7. A métrica antiga de contas
em mais de um dia permanece `funil.retornos`, distinta de retenção de coorte.
Metagame conta exposição de espécie em equipes e resultado da equipe,
com nível e IV do indivíduo. Não é estimativa causal da força dessa espécie.
Amistosos não alimentam o metagame. A reserva mostra um snapshot no instante
`agora`; os valores históricos de emissão/gasto respeitam a janela solicitada.

## Evidências e reprodução

- `VALIDACAO_INTEGRACAO_FINAL.json`: 69 suítes/628 testes verdes no recorte.
  Com os 16 offline isolados: 644 testes. Q2 dirigido: 40/40 mutantes.
- `VALIDACAO_OFFLINE_FINAL.json`: 16 testes em processo separado; evita o cache
  de UI sem DOM conhecido em D-AT6-05-04, sem mascarar falha de produto.
- `VALIDACAO_CONCORRENCIA_FINAL.json`: quatro processos no mesmo SQLite.
- `SABOTAGEM_INTEGRACAO_FINAL.json`: S90801–21 mais S770/S1881.
- `SABOTAGEM_BASE_FINAL.json`: S90001–17; regras anteriores da arena.
- `ANCORAS_INTEGRACAO_FINAL.json`: conferência de todas as âncoras cadastradas.
- `VALIDACAO_NAVEGADOR_FINAL.json`: Chromium real, 390/768/1440 px, zero pageerrors,
  publicação/fila/replay/mercado/cosméticos/offline/resgate/evolução/Jornada.
- `RED_INTEGRACAO_FINAL.json` e `RED_METAGAME_FINAL.json`: falhas registradas
  antes das correções das rotas e das médias por indivíduo.

```sh
node tools/testar-arena.mjs --finalizacao --saida=/tmp/arena-tests.json
node tools/testar-arena.mjs --so=progressao-offline --saida=/tmp/arena-offline.json
node tools/sabotar-arena.mjs --grupo=finalizacao --saida=/tmp/arena-mutantes.json
node tools/estudar-economia-arena.mjs
PW_MODULO=/caminho/playwright/index.mjs PW_CHROME=/caminho/chromium node tools/validar-arena-navegador.mjs
```

Playwright e Chromium são dependências externas de QA; não foram adicionados
ao produto. O recorte não é a suíte legada integral nem Q2 integral. Não há
Q7 independente, piloto com usuários reais ou certificado de publicação de
release. A inspeção visual verifica as superfícies alteradas: mercado legível,
replay com doze sprites, diferenças da evolução, resgate e preço/prévia.
O vídeo decorativo da NPC não carregou nas capturas desta instalação e não
foi objeto de alteração neste bloco; a lacuna L-AT6-15-MIDIA delimita esse limite.
Campanhas comerciais, passe sazonal sem conteúdo e pagamentos reais não são
ativados por esta entrega. A fila desses requisitos permanece no ROADMAP.
