# Validação de produto, matemática e implementação

O plano revisado define evidências futuras. As únicas verificações executáveis incluídas neste pacote são de cálculos, integridade dos documentos e preservação dos originais. Não são testes do jogo.

## 1. Perguntas e decisões

| Pergunta | Como observar | Decisão que a evidência informa |
|---|---|---|
| A pessoa entende o próximo passo e sua recompensa? | Teste de tarefa sem instrução do moderador | Corrigir fluxo/copy antes de ampliar conteúdo |
| Há retorno por interesse no loop? | Coortes de ativação e retorno significativo + entrevista | Qual expansão priorizar |
| O progresso continua sem aposta? | Jornada de conta nova só pelo mundo/coleção | Se Arena permanece opcional de fato |
| O limite controla todos os recursos? | Ledger/faucets por hora e por jogador | Ajustar fontes e sinks, não só captura |
| Condições mudam o mundo de modo compreensível? | Comparar expectativa antes e resultado após run | Ajustar preview/explicação, depois balancear |
| Dinheiro cria poder indiretamente? | Percorrer grafo de conversões e linhagem dos recursos | Resolver DEC-03 e permissões |
| A expansão melhora algo? | Hipótese definida antes, métricas e relatos após uso | Expandir, ajustar ou encerrar o experimento |

## 2. Telemetria mínima

Eventos de negócio devem sair do servidor quando representam fatos econômicos. Eventos de interface descrevem visualização/interação, não comprovam crédito. Campos mínimos: `eventId`, versão do schema, instante UTC, identificador pseudônimo da conta/coorte, sessão, versão do app/conteúdo e identificadores de run/rodada/comando quando aplicáveis. Não coletar segredo de seed, credencial ou texto pessoal desnecessário.

| Evento lógico sugerido | Momento e propriedades |
|---|---|
| `onboarding_completed` | Primeira jornada compreendida; registrar versão do fluxo |
| `run_started` | Criação durável: modalidade, estágio, versões e reserva |
| `run_completed` | Resultado consolidado: duração, tentativas, condição revelável |
| `reward_claimed` | Crédito durável: causa e quantidades por recurso, origem econômica |
| `collection_changed` | Nova espécie/instância, evolução ou conversão; causa vinculada |
| `store_purchase_committed` | Compra atômica com moeda/origem e item; não clique no botão |
| `arena_entry_accepted` | Entrada aceita dentro do prazo, modo e unidade; separar valores fictícios |
| `command_failed` | Código, etapa e possibilidade de retry, sem payload sensível |
| `meaningful_return` | Derivado de fatos de produto em outro dia, não emitido por heartbeat |

Nomes são propostas; integrar ao esquema existente sem duplicar eventos equivalentes. Deduplicar por `eventId` antes de calcular métricas. Definir retenção, acesso e exclusão de dados conforme contexto real de uso e requisitos aplicáveis.

## 3. Métricas com denominador

- **Ativação:** contas novas que completam primeira run, recebem recompensa e fazem uma escolha de progressão / contas novas elegíveis que iniciaram onboarding. Definir janela, por exemplo 24 h, antes da coleta.
- **Retorno significativo D1/D7/D30:** contas ativadas que realizam ação de produto no dia correspondente / contas ativadas da coorte com toda a janela já observável. Fixar fuso da análise e diferença de dia-calendário versus janela de horas; não misturar as duas definições.
- **Conclusão da run:** runs concluídas / runs iniciadas com tempo suficiente para concluir. Canceladas, interrompidas e ainda ativas aparecem separadamente.
- **Integridade:** lançamentos duplicados e divergências de saldo por eventos econômicos processados; alvo zero. Não diluir um incidente grave numa média favorável.
- **Economia:** fontes e sinks por recurso/conta/dia, mediana e percentis de saldo, tempo até marcos, reservas presas, concentração e volume negociado quando existir.
- **Loja:** compras confirmadas / contas expostas a uma oferta elegível; contribuição líquida por exposto e recorrência, não só taxa de clique.

Contar heartbeat, tela aberta ou login automático como retorno falseia a retenção. Coortes ainda imaturas não entram no denominador de D7/D30. Mudanças simultâneas de público, conteúdo e preço impedem atribuir causalidade à funcionalidade isolada.

## 4. Piloto em duas etapas

**Usabilidade:** 5–8 participantes do público pretendido, como amostra qualitativa inicial. Tarefas: começar, escolher estágio, entender condição, concluir/retomar, localizar recompensa e fazer progressão. Registrar ajuda necessária, falhas, compreensão e confiança. Meta inicial proposta: pelo menos 80% concluem o fluxo essencial sem intervenção; com amostra pequena, isso é critério prático de iteração, não estimativa precisa da população.

**Uso longitudinal:** 30–50 participantes, quando operacionalmente possível, acompanhados por pelo menos sete dias completos. Essa amostra orienta produto e revela problemas; não comprova pequenas melhorias percentuais. Estabelecer baseline de retenção, progressão e falhas antes de prometer metas de aquisição. Se houver D30, aguardar a janela real. Não inserir dinheiro real apenas para tornar o piloto “realista”. O modo de disponibilização precisa respeitar os direitos e autorizações do escopo.

Entrevistar quem retorna e quem abandona. Perguntar o que tentou fazer, o que esperava receber e por que voltou; evitar perguntas que convidam a elogiar. Registrar uma decisão por hipótese: manter, mudar, testar de novo ou parar.

## 5. Testes críticos de implementação

| Risco | Caso mínimo relevante | Resultado esperado |
|---|---|---|
| Aposta fora do prazo | Scheduler atrasado, fase ainda aberta e relógio já no limite | Servidor rejeita sem débito |
| Duplo gasto | Dois comandos simultâneos usam o mesmo saldo/item | Só o conjunto financeiramente válido confirma |
| Resgate duplicado | Retry após commit cuja resposta se perdeu | Mesmo resultado; um crédito |
| Reserva presa | Falha entre criação, consumo e liberação | Reconciliação determinística sem inventar saldo |
| Atualização de run | Refresh, reconexão e mudança de versão | Resultado de versão preservado |
| SSE duplicado | Repetir evento e perder conexão | UI converge sem repetir recompensa |
| Posse local | Limpar local storage/abrir outra sessão | Posse autoritativa preservada |
| Potions e morte | Eventos no mesmo instante/fronteira de deadline | Ordem documentada; cura efetiva aplicada uma vez |
| Assets | Build e requests reais em deploy equivalente | Nenhum recurso exigido ausente |
| Recuperação | Restaurar backup e repetir eventos pendentes | Ledger/inventário reconciliados |

Asserções devem testar o comportamento, não copiar a fórmula do código. Para funções puras, usar exemplos construídos independentemente. Para o fluxo, atravessar navegação e ação de usuário; um teste que nunca abre a run não valida a run. Testes de documentação não justificam afirmar que o servidor foi exercitado.

## 6. Validação estatística

Separar viés do estimador, variância da amostra, erro do modelo, correlação e versão do motor. A expressão exata incluída no documento econômico assume observações Bernoulli IID. Se as simulações usam seeds correlacionadas, amostragem estratificada ou filtros de vitória, as hipóteses mudam e precisam aparecer no estudo.

154 mil simulações para p = 0,016 dão aproximadamente 2% de erro relativo **de um desvio padrão** pelo método delta. Uma faixa normal de 95% com meia-largura relativa de 2% exige aproximadamente 590.646 amostras sob essas hipóteses. Isso não garante a mesma precisão para probabilidades menores nem para todos os participantes simultaneamente. Para estimativas pequenas, usar intervalos adequados e não confiar só em aproximação normal.

Se o cálculo parar assim que atingir precisão, usar método que trate a regra de parada ou executar tamanho fixo planejado; intervalos ingênuos recalculados repetidamente não mantêm automaticamente a cobertura prometida. Registrar seed, versão, tamanho, estimador, incerteza e duração. Os scripts originais ausentes precisam ser recuperados para confirmar os resultados empíricos reportados.

### Se previsão/skill for um pilar

Medir previsões probabilísticas antes do resultado, usando a mesma informação pública e regras de elegibilidade. Para categorias exclusivas, o Brier multiclasses é `sum((q_i - y_i)^2)`; menor é melhor. Seu valor esperado é minimizado em `q = p`; o excesso esperado em relação ao ótimo é `sum((q_i-p_i)^2)`. Isso incentiva previsão honesta sob essas condições, mas não prova retenção nem distingue habilidade de copiar a probabilidade pública.

Comparar com baseline público do modelo, prever o mesmo conjunto de eventos e definir cobertura mínima antes da temporada. Uma sugestão de 30 eventos é apenas começo operacional; não garante potência estatística. Permitir selecionar só previsões fáceis distorce ranking. Avaliar calibração e qualidade conjuntamente; calibração isolada pode ser boa num previsor pouco informativo. Simulador público permite uso de computação externa, mesmo que o app esconda parte das odds.

Não prometer que a melhor pessoa vencerá uma temporada finita, nem usar rentabilidade isolada como prova de habilidade. Mudança de motor inicia versão/coorte comparável; não recalcular o passado para melhorar a narrativa.

## 7. Evidência e critérios de saída

Cada marco termina com artefatos mínimos: versão/commit, roteiro executado, resultado, amostra/ambiente, problemas remanescentes e decisão. Falha de infraestrutura é falha de obtenção de evidência, não sucesso do produto.

M1: invariantes e jornada 1.33/1.34. M2: persistência, integridade, assets e recuperação. M3: comportamento observado e priorização documentada. M4: uma hipótese de profundidade avaliada. M5: evidências comerciais, jurídicas, operacionais e financeiras compatíveis com o escopo. Nenhum marco herda automaticamente a conclusão do seguinte.
