# Validação, métricas e liberação

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

## 1. O que foi verificado nesta entrega

Base: commit `f6fe58ffb739ebb42d584f0d827e8d1984b14738`, Node v24.19.0. Foram executadas diretamente as suítes abaixo, por seus exports `suite()` e `rodar()`, sem navegador:

`treino-batalha`, `equipe-snapshot`, `liga-partida`, `liga-pareamento`, `liga-mmr`, `liga-temporada`, `liga-integridade`, `liga-home`, `liga-replay`, `liga-palco`, `liga-ranking`, `liga-stake`, `jornada-servidor`.

**Resultado: 13 suítes, 96 testes, zero falhas.** O recorte valida estruturas existentes e seus contratos atuais. Ele não valida a elegibilidade pós-Liga, orçamento de defesa, novas modalidades, emissão proposta ou interface nova, pois este pacote é documental.

Não foi feita uma sessão de jogo na interface ao vivo. A apresentação foi analisada pelo código, pelos dados puros do palco e por seus testes. Inspeção visual de implementação continua necessária.

## 2. Matriz mínima de aceite funcional

| Caso | Resultado esperado da política nova |
|---|---|
| Cliente informa `ligaConcluida: true` sem progresso | Não libera ranked. |
| Atacante concluiu, defensor não | Nenhuma nova partida ranqueada ou cobrança. |
| Time com 5 criaturas próprias | Treino válido; ranked bloqueado com motivo. |
| Time com 6 IDs e espécie repetida | Bloqueia ranked pela cláusula proposta. |
| Corpo tenta enviar nível/IV/vencedor | Servidor resolve seus dados e resultado; não aceita autoridade do corpo. |
| Cliente desafia diretamente uma conta fraca | Amistoso sem MMR/LP competitivo/stake; não contorna busca. |
| Candidato ficou sem saldo após a seleção | Não há débito parcial; tentativa interna limitada ou busca vazia. |
| Defesa expirou ou mudou o snapshot | Não disputa até nova autorização válida. |
| Orçamento restante 50, dois desafios concorrentes | No máximo uma defesa de 50. |
| Bronze vs Prata | Entrada 50 por lado, pote 100, taxa 10, retorno 90. |
| Empate válido | Entradas devolvidas, sem taxa; defesa realizada conta no orçamento bruto. |
| Partida inelegível por integridade | Entradas devolvidas, sem MMR/LP; consumo definitivo de defesa revertido. |
| Reenvio com a mesma chave após promoção | Mesma partida e mesma liquidação. |
| Pokémon vendido depois de publicado | Novas partidas recusam posse inválida; replay antigo permanece. |
| Nível subiu mantendo IDs | Mostra publicação desatualizada; upgrade só luta após republicar. |
| Virada de temporada sem nova partida | Contagem sazonal zero; histórico acumulado preservado. |
| Rajada de repetições PvE | XP respeita intervalo e orçamento do servidor. |
| Conta resgata kit por duas rotas | Um crédito de kit no ledger. |
| Campanha com uma concessão restante e dois resgates | Apenas um crédito dentro do teto; o outro recebe esgotamento. |
| Ganho de stake em bônus | Não se torna saldo elegível de mercado por engano. |
| Bronze com vencedor | Retorno 90, casa recebe 10, soma 100; não contabilizar a taxa como queima também. |
| Falha ao creditar a tesouraria | Rollback da liquidação nova, incluindo jogadores, MMR e LP. |
| Mesma partida reprocessada | Um crédito de taxa para a casa, sem duplicidade. |
| Promoção financiada pela casa | Débito da casa e crédito PC-B do jogador são atômicos e conservam o total. |
| Tesouraria/campanha sem verba suficiente | Nenhuma concessão sem orçamento ou dotação explícita. |

## 3. Protocolo de balanceamento do combate

O estudo 08 inclui ferramenta externa executada: `estudo/estudo-combate.mjs` e `estudo/resultados-combate.json`. Importa os motores reais, registra pack/commit/versão/fixtures/seed/preset e compara duas cópias experimentais de iniciativa. Foram 932.000 combates, 40.000 runs fixas de Avanço e 800.000 tentativas de golpe. Não altera runtime nem snapshots persistidos. Integrar ao fluxo de engenharia apenas quando as fichas forem executadas.

### Amostras

1. Seis contra seis espelhados, mesma espécie/nível/IV/moveset, trocar lados e repetir as mesmas seeds.
2. Mesma formação com diferença de nível: 0, 1, 2, 5, 10 e 20. Os pequenos degraus são essenciais: +1 nível já deu 90,9% no espelho atual.
3. IV 15/16/20/25/31 e extremos 0/31; isolar cada um dos seis atributos. Repetir com naturezas neutras/favoráveis/desfavoráveis, especialmente velocidade. Power igual não dispensa o ensaio.
4. Monotipos contra counters e formações de cobertura.
5. Composição ofensiva, defensiva e mista nos quatro presets.
6. Repetir com times legais próximos ao power-limite, não só times fortes escolhidos manualmente.

No estudo inicial: 2.000 raízes e troca de lados nos confrontos fixos; 120 pares de formações na diversidade, com 100 raízes por direção e melhora dos dois lados separadamente. Apresentar win rate/pontuação, empate e intervalo agrupado por raiz/par, sem tratar partidas trocadas como independentes. Para a validação de liberação, ampliar a pelo menos 2.000 raízes nos cenários críticos e usar formações/seeds novas. Não converter um resultado em “balanceado” sem olhar a composição. O espelho 50% da pontuação pareada é imposto pela simetria do cálculo: verificar também o win rate bruto do lado A, não usar esse 50% como prova de ausência de viés.

### Perguntas de decisão

- Espelhados apresentam vantagem persistente de lado, slot ou preset?
- Dentro da faixa aceita, um counter consegue compensar uma pequena diferença de nível?
- IVs aumentam valor de captura/negociação sem fazer “31 em tudo” o único time viável?
- A mesma espécie domina composições variadas por força base, moveset ou falha de IA?
- Algum preset sempre vence os demais ou escolhe golpes claramente inúteis?
- A maioria dos confrontos termina com duração legível no palco? Existe cenário que vai ao teto de 100 turnos com frequência?

Testar “nível influencia” não significa exigir que o nível maior vença sempre. Tipos, golpes e decisão de alvo precisam continuar relevantes. Não igualar todos os níveis para resolver um problema de pareamento que pode ser corrigido na seleção.

### Condições adicionais para liberar a política nova

- Candidata de iniciativa ±10% deve passar em um conjunto reservado que não participou da seleção. Referência: +1 nível, 55–65% em vários espelhos; pequena melhora de IV, vantagem menor e crescente no agregado. Estes intervalos orientam diagnóstico; counters não precisam obedecer a eles.
- Comparar todos os presets relevantes, formas finais/base plausíveis, níveis heterogêneos, cada lado/slot, IV/natureza extremos e golpes exclusivos. O estudo inicial não esgota esses casos.
- Auditar dano esperado e chance de KO antes/depois de AT6-14; a candidata de IA não foi simulada neste pacote.
- Conferir taxa de erro, crítico condicional aos acertos não imunes, STAB, resistência dupla e imunidade; a UI/replay devem reproduzir eventos reais.
- Refazer curvas da Jornada com iniciativa nova. O controle de Avanço usa equipe/XP fixos; AT6-13 exige também runs contínuas, XP dinâmico, cura, captura e recuperação de processo.
- Avaliar extremos que passam nos filtros propostos. Sem candidato elegível, nenhum stake nem MMR. Odds de treino não podem substituir validação da posse/versão/elegibilidade.
- Executar novamente os testes do projeto e os portões por bloco; o recorte deste estudo foi 5 suítes/51 testes, zero falhas, além do baseline anterior de 13 suítes/96 testes.

## 4. Eventos propostos

Fatos de disputa, desbloqueio e emissão nascem no servidor. Eventos de visualização podem vir da UI, mas não substituem os fatos. Acrescentar campos ao catálogo existente de forma explícita.

| Evento proposto | Quando | Campos essenciais |
|---|---|---|
| `arena_elegibilidade_obtida` | Primeira confirmação válida da Liga concluída | Conta, instante, final do pack, versão da política. |
| `arena_time_publicado` | Snapshot gravado | Snapshot, tamanho, power, nível médio, preset, versão. |
| `arena_busca_concluida` | Busca gera disputa ou termina vazia | Chave, tier, modo, candidato/sem-candidato, motivos agregados. |
| `arena_defesa_autorizada` | Autorização ativa | ID, snapshot, teto, orçamento, máximo de partidas, expiração. |
| `arena_partida_liquidada` | Commit financeiro e competitivo | Partida, lados, tiers, stake, taxa, referência de crédito à casa, resultado, elegibilidade, política, temporada. |
| `arena_recompensa_concedida` | Crédito de kit/missão/campanha | Origem, janela, bucket, valor, referência de ledger. |
| `arena_time_melhorado` | Nova publicação modifica dados de combate | Snapshot anterior/novo, categorias de mudança, power/nível antes e depois. |

Usar IDs internos para agregação e restringir a exposição pública. Partida liquidada inclui a diferença de power/nível e um resumo dos times ou referências suficientes para derivá-los. Captura, evolução e mercado já têm fatos próprios; cruzá-los com publicação é melhor que recontar a operação no cliente.

Evento de resultado deve ser entregue de forma recuperável: gravá-lo na transação quando suportado, ou usar outbox/evento derivado idempotente. Perder a resposta HTTP não pode apagar a evidência de uma liquidação.

## 5. Painel mínimo

| Indicador | Definição | O que revela |
|---|---|---|
| Conversão ao endgame | Primeira disputa em até 7 dias / contas que concluíram a Liga na coorte | Se o desbloqueio leva à ação. |
| Tempo até primeira disputa | Mediana e percentis desde a conclusão | Fricção de time, publicação, saldo ou fila. |
| Fila vazia | Buscas elegíveis sem rival / buscas elegíveis | Falta de população ou filtros inviáveis. |
| Retorno em 7 dias | Coorte que volta a disputar em outro dia dentro de 7 dias | Retenção do endgame. |
| Recuperação após perda | Contas que voltam a uma disputa depois de saldo insuficiente / contas bloqueadas por saldo | Se o caminho gratuito funciona. |
| Melhoria de time | Publicações com mudança de atributos/espécie/golpes após uma derrota | Se a arena alimenta preparação. |
| Captura e negociação úteis | Captura/compra/troca que aparece em uma publicação posterior | Demanda concreta da competição. |
| Saúde do stake | Saldo, entradas, perdas, retornos e taxa por tier e coorte | Solvência e exposição. |
| Emissão líquida | Emissão externa por origem menos queimas explícitas; transferências internas separadas | Inflação ou escassez de cada bucket. |
| Tesouraria | Arrecadação PvP, verba reservada, promoções pagas e saldo disponível | Se os 10% chegam à casa e quanto pode financiar campanhas. |
| Metagame | Uso e desempenho por espécie/preset/composição, controlando faixa de nível e MMR | Concentração e vantagens persistentes. |
| Integridade | Partidas inelegíveis, pares repetidos e contas ligadas | Manipulação e falsos bloqueios. |

Não comparar compradores e não compradores como se fossem grupos aleatórios: quem compra pode já jogar mais. Para demonstrar neutralidade de cosméticos, usar igualdade determinística do combate com mesma seed/time, além da observação de coortes.

## 6. Liberação gradual

### Etapa A — invariantes fechados

AT6-12/14 validadas fora da amostra inicial, curvas da Jornada revistas e filtros de AT6-02 testados. AT6-13 tem rollout próprio de runs. Portões do repositório exigidos para cada bloco, teste de rajada de XP e migrações reversíveis. Carteira reconciliada, sem saldo negativo e sem dupla liquidação. Defesas antigas exigem nova autorização. Treino e histórico funcionam com a política desativada.

Incluir os aceites da AT6-11: a tesouraria recebe exatamente a taxa liquidada, falha faz rollback, e uma campanha não gasta mais que sua verba. Revalidar mercados de previsão que já usam `treasury_ledger`.

### Etapa B — piloto da arena

Começar com exposição Bronze/Prata e um grupo conhecido de contas que realmente concluíram a Liga. Tiers altos continuam testáveis em simulação, enquanto se verifica a reposição e a disponibilidade de adversários.

Limiares iniciais **propostos**, para revisar após observar a população:

- Zero discrepância de carteira, dupla cobrança ou defesa acima do orçamento.
- Pelo menos 100 partidas reais elegíveis antes de concluir que a experiência básica funciona; amostra não basta para certificar todo o metagame.
- Menos de 20% das buscas elegíveis vazias na janela ativa do grupo. Se pior, diagnosticar população/faixas sem relaxar silenciosamente a proteção.
- Maioria das contas que ficou sem saldo consegue recuperar uma entrada Bronze por atividade em até um dia do mundo; medir o caminho efetivo, não só a recompensa configurada.
- Pelo menos metade das contas que terminou a Liga realiza a primeira disputa em sete dias, como hipótese de produto.

Esses números não são fatos atuais nem metas garantidas. Servem para decisões explícitas de piloto, com denominador e período publicados.

### Etapa C — mais tiers e aquisição

Liberar valores maiores quando existirem rivais disponíveis na faixa, saldo que suporte sequência de perdas e orçamento econômico registrado. Não confundir promoção de rank com consentimento para uma perda maior em defesa offline.

Ativar campanha promocional depois de medir o custo em PC-B por conta que chega à primeira disputa e retorna. Receita comercial de cosmético vem depois de retenção e entrega verificadas.

## 7. Critérios de interrupção

Uma violação financeira, MMR aplicado em amistoso/bot ou defesa além do teto encerra novas disputas ranqueadas afetadas enquanto se corrige. Preservar leitura de histórico, extrato e treino. Registrar partidas atingidas e corrigir por lançamentos auditáveis; não apagar o livro para fazer o saldo aparentar normalidade.

Para problema de balanceamento, primeiro identificar a versão, espécie, faixa e mecanismo. Alteração que muda combate entra com versão TBE nova e republicação; ajuste de pareamento entra como política nova. Não reprocessar resultados históricos porque uma configuração mudou.

## 8. Métricas das melhorias gerais

Separar coortes antes da Liga, Liga concluída sem PvP e Arena ativa. Medir primeira ação, primeira exploração, primeira captura, primeira evolução, primeiro ginásio, retorno após falha de captura e uso real do mercado para completar a coleção. As stories GQ do documento 06 não são avaliadas exclusivamente por volume de apostas.
