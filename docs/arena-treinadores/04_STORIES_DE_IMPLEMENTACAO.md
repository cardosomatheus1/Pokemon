# Stories de aplicação — proposta AT6

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

Este documento contém fichas para incorporar ao plano canônico. A fila viva permanece em `docs/ROADMAP.md` e o estado em `docs/RETOMAR.md`. As fichas descrevem o desenho original; a entrega efetiva é delimitada pelo contrato 09, não pela presença de uma ficha. Ler `CLAUDE.md` antes de iniciar um bloco e aplicar os portões exigidos pelo repositório.

## Sequência sugerida

`AT6-12 → AT6-14 → AT6-13 → AT6-01 → AT6-02 → AT6-03 → AT6-11 → AT6-04 → AT6-05 → AT6-06 → AT6-07 → AT6-08 → AT6-09 → AT6-10`

Revisão de 03/10: o estudo de combate acrescenta 12–14 para fechar motor, catálogo/IA e coerência da campanha antes de ativar a nova política de stake. São fichas propostas; a ordem executável pertence ao roadmap canônico. AT6-01 pode ser desenvolvida em bloco independente, mas a liberação competitiva depende da validação de 12/14 e dos filtros de 02.

Os blocos 01–04 e 11 fecham invariantes de acesso, competição, saldo, tesouraria e evolução. 05–07 tornam o produto utilizável e mensurável. 08–10 acrescentam reposição, liquidez e monetização. Não abrir campanha de aquisição antes de instrumentar o funil e comprovar a conservação dos livros de jogadores e casa.

As seis fichas de melhorias gerais `GQ-01` a `GQ-06` estão em `06_QUALIDADE_DO_JOGO_E_JORNADA.md` e entram no mesmo roadmap. Elas podem melhorar entrada, captura e campanha antes de o conjunto AT6 estar pronto. Stories compartilhadas não são implementadas duas vezes.

## AT6-12 — vantagem gradual e versão de combate compartilhada

**Prioridade:** P0 para a nova Arena. **Dependência:** contrato de combate incorporado à Spec; estudo 08 como baseline, sem declarar a candidata validada em produção.

**Problema medido:** no espelho estudado, nível 61 contra 60 vence 90,9%; IV 16 contra 15 vence 90,4%, apesar de power igual. Velocidade e KO antes da resposta amplificam pequenas diferenças. Reduzir peso dos IVs ou apertar só power não resolve esse degrau.

**Mudança proposta:** testar/introduzir a candidata `iniciativa = velocidade × (1 + 0,10 × (2u − 1))`, com `u` semeado por sobrevivente/turno e reaproveitamento da chamada atual de desempate. Manter nível real, pesos atuais de IV/natureza, precisão por golpe, STAB/efetividade, crítico fixo 1/16×1,5 e variação de dano. Não aplicar a iniciativa à arena comum. Registrar iniciativa, velocidade e ordem no replay.

**Arquivos atuais:** `engine/treino-batalha.mjs`, `engine/primitivas.mjs`, `engine/time.mjs`, `app/modules/snapshot-dados.mjs`, `app/modules/partida-dados.mjs`, `app/modules/jornada-conta.mjs`, `server/equipe.mjs`, `server/partida.mjs`. **Novo proposto:** helper puro de iniciativa, se a extração facilitar a reutilização pelo Avanço. Não criar nova fórmula de dano em paralelo.

**Aceite:**

- Mesma versão, entradas e seed geram eventos idênticos no cliente/servidor; contador de RNG documentado.
- Espelhos de vários arquétipos medem +1 nível e mudanças pequenas de IV; analisar ganho por stat, sem exigir monotonicidade de cada seed.
- Validar a candidata em seeds/formações fora do conjunto que a selecionou, extremos de natureza, presets, sides/slots e níveis heterogêneos.
- Counter pode compensar vantagem moderada; tipo duplo e imunidade continuam corretos; crítico não rompe imunidade.
- Nível/IV maior melhoram atributos relevantes e resultado agregado; não há handicap por saldo, compra, MMR ou histórico.
- Stats, nível real e power explicados separadamente; power não é anunciado como odds.
- Nova `VERSAO_TBE`, republicação dos snapshots afetados, replay antigo preservado pelo log e rejeição explícita de versão incompatível na criação de partida.
- Refazer as chances por nó da Jornada antes de adotar a regra ali; nenhum ginásio exige IV perfeito.

**Validação:** baseline externo `estudo/estudo-combate.mjs`; testes de `primitivas`, `treino-batalha`, `equipe-snapshot`, `liga-partida`, `liga-replay`, `jornada-equilibrio` e portões exigidos. Acrescentar testes de contrato/invariantes e pontos de ruptura, não testes que apenas repitam a expressão da iniciativa. Nenhuma regra está implementada por esta ficha.

## AT6-13 — o Avanço usa atributos e golpes reais

**Prioridade:** P0 para a coerência de campanha solicitada. **Dependências:** AT6-12/14 e contrato de saúde/captura atualizado na Spec. Separar em sub-blocos pequenos no plano canônico.

**Problema atual:** `paraOMotor` elimina IV/natureza/moveset; `resolverWave` sorteia o resultado por força agregada. Os balões de golpes não provam combate real. Tipos influenciam bioma/clima, mas não a troca de dano da wave.

**Mudança proposta:** adaptador de wave para os mesmos stats, tipos, categorias, precisão, crítico e dano do motor da coleção. Inimigos recebem níveis/movesets definidos no pack. Gerar o roteiro a partir de eventos de combate. Persistir HP por indivíduo e estado por wave; a barra agregada deriva desses HP.

**Arquivos atuais:** `engine/wave.mjs`, `engine/run-avanco.mjs`, `engine/roteiro-wave.mjs`, `engine/elenco-estagio.mjs`, `app/modules/avanco-conta.mjs`, `app/modules/moveset-dados.mjs`, `server/run.mjs`; definição de inimigos no ContentPack. **Proposto:** adaptador puro versionado de combate da wave, sem segunda tabela de efetividade ou conta de IV.

**Aceite:**

- Alterar golpe, IV relevante, categoria ou matchup de tipos pode alterar dano/resultado na versão nova; controles isolam efeitos mantendo demais fatores.
- Miss/crit/superefetivo exibidos vêm dos eventos que decidiram a luta; não são FX inventados depois de um vencedor agregado.
- HP/KO/poção são idempotentes; capturas continuam ligadas a encontros válidos, sem repetir por consulta/replay.
- Entrada da wave é fixada ao iniciar; XP/níveis ganhos entram na próxima wave, com ganho legítimo preservado durante a run. Não acrescentar cap diário de XP ao Avanço.
- Stamina, teto de encontros, foco, clima, captura e origem das recompensas preservam seus contratos ou recebem mudança explícita aprovada na Spec; sem buff comercial secreto.
- Runs antigas continuam na regra anterior até acabar; nova versão não muda retroativamente resultado/saúde/consumo.
- Calibrar sucesso, tentativas, duração, emissão e recuperação por estágio/bioma; comparar iniciante, time evoluído, counter e composição ruim. Os 40 mil runs do estudo são baseline de sucesso, não meta de duração.

**Validação:** ampliar suites de `wave`, `avanco`, `avanco-forca`, `avanco-estado`, `avanco-paga`, captura e rotas de run; testes reais de crédito/consumo e recuperação. Medir cenários com XP dinâmico durante a run, ausente do experimento inicial. Fazer rollout separado do PvP.

## AT6-14 — precisão explícita, catálogo e IA consistentes

**Prioridade:** P0 para informar o combate corretamente; efeitos complexos de status/PP ficam em fases posteriores. **Dependência:** AT6-12 define o contrato candidato; recalibrar novamente se catálogo/IA alterar seu comportamento.

**Problema atual:** 40/66 golpes herdam 92% de precisão; nomes conhecidos sugerem efeitos ausentes. A IA usa poder×STAB×tipo×razão×precisão, uma aproximação que ignora o termo aditivo/arredondamento do dano e não calcula probabilidade de KO completa. Golpes mais fortes e imprecisos podem ser inferiores na média, mas melhores para finalizar.

**Mudança proposta:** explicitar `acc` sem modificar inicialmente os valores efetivos; registrar categoria, poder, precisão e efeitos implementados no pack. Auditar golpes dominados. Extrair cálculo puro de dano esperado/probabilidade de KO a partir da regra compartilhada, sem consumir RNG extra na escolha. Comparar a IA atual com a candidata antes de alterar presets. O Agressivo deve poder reconhecer a chance de finalizar; o Equilibrado deve justificar a escolha pelo dano esperado real. Defensivo/Foco mantêm identidades distintas e são ensaiados novamente.

**Arquivos:** ContentPack em `content/`, `engine/pack.mjs` para validação do esquema, `engine/primitivas.mjs`, `engine/treino-batalha.mjs`, `app/modules/comparador-golpes.mjs`, UI de moveset/build e correção da Jornada. Toda regra nova permanece independente do nome da franquia.

**Aceite:**

- Tornar as precisões explícitas preserva os mesmos eventos das regras antigas na migração semântica inicial.
- Surf 100% e Hydro Pump 80% mantêm diferença de risco; golpe Normal pode dar crítico; imunidade recebe zero mesmo em cenário de crítico.
- Testar dano físico/especial, resistências 0,25/0,5, fraquezas 2/4 e acertos 60/70/80/92/100% em fixtures controladas.
- Uma escolha de IA não usa futuro da seed da luta nem sorte extra; chance de KO inclui precisão/crítico/variação/arredondamento, conforme a fórmula vigente.
- UI não promete prioridade, recarga, paralisia ou outro efeito ausente. Se um efeito for implementado, criar metadados/regra/versão e medir sua influência.
- Revisar equilíbrio dos presets, duração, diversidade de golpes e custo de simulação após cada alteração comportamental.
- Alterações do catálogo que afetem a arena comum exigem nova precificação e versão desse motor antes de abrir outra rodada. Não mudar regras durante apostas abertas.

**Validação:** fixtures do estudo 08, pares de golpes com risco/recompensa, testes de catálogo/pack, comparador, presets, replay, Jornada e paridade/margem da arena comum quando afetada. A revisão da IA é proposta; não foi testada como candidata neste estudo.

## AT6-01 — concluir a Liga libera o ranked 6×6

**Prioridade:** P0. **Dependência:** decisão de produto incorporada à Spec Master.

**Problema atual:** snapshots e combate aceitam 1–6 membros; a entrada na Liga de times não depende da conclusão da Jornada.

**Mudança:** regra pura e validação no servidor para ambos os participantes: Liga concluída, seis IDs próprios e distintos, seis dex distintos pela cláusula proposta, golpes e versões válidos. A home informa o motivo de bloqueio; treino permanece acessível.

**Arquivos:** novos `engine/arena-elegibilidade.mjs` e `server/arena-elegibilidade.mjs`; existentes `server/jornada.mjs`, `server/equipe.mjs`, `server/liga-equipe.mjs`, `server/partida.mjs`, `app/modules/snapshot-dados.mjs`.

**Aceite:**

- Cinco nós de Liga do pack atual vencidos, incluindo `campeao`, liberam o acesso; final ausente no pack falha como configuração.
- Conta sem conclusão não entra como atacante nem defensor, ainda que já tenha snapshot.
- Cinco ou sete membros, IDs repetidos, dex repetidos ou criatura alheia são recusados antes de cobrar.
- Contas antigas com progresso legítimo são elegíveis sem nova vitória.
- Snapshot genérico de treino e replay antigo continuam legíveis.
- Não há campo no corpo HTTP capaz de declarar a conclusão ou fabricar stats.

**Testes:** ampliar `test/equipe-snapshot.mjs`, `test/liga-partida.mjs`, `test/liga-home.mjs`; novo teste puro da elegibilidade.

## AT6-02 — ranked só pela busca e dentro de faixa válida

**Prioridade:** P0. **Dependências:** AT6-01, AT6-12 e AT6-14 validadas antes de liberar stake.

**Problema atual:** a busca usa MMR/power, mas o desafio direto não replica todos esses filtros. Partidas sem stake também podem mexer no MMR.

**Mudança:** formalizar `ranked`, `amistoso` e `treino`. Ranked requer busca do servidor e stake; desafio direto é amistoso sem MMR, LP competitivo ou stake. Validar a mesma faixa na seleção e antes da execução.

**Parâmetros de piloto revisados:** diferença MMR até 150; razão simétrica de power até 1,05; diferença média de nível até 1; comparar os seis níveis ordenados, com diferença máxima de 2 por posição. Preservar exclusão de contas ligadas, três recentes e cooldown de seis horas. Estes filtros são auxiliares e provisórios: não certificam chance equilibrada. A antiga proposta de power até 1,20/nível médio até 10 aceitaria um espelho com aproximadamente 99,8% de vitória. A proposta atual depende de validar a iniciativa candidata de AT6-12 e a IA/catálogo de AT6-14; não aplicá-la ao motor antigo como se resolvesse o caso de IVs com power igual. Evidências e protocolo em `08_ESTUDO_DO_MOTOR_E_BALANCEAMENTO.md`.

**Arquivos:** `app/modules/pareamento-dados.mjs`, `server/partida.mjs`, `app/modules/partida-dados.mjs`, `server/contrato.mjs`, `docs/API.md`; novo `engine/arena-politica.mjs` e sidecar de política em `server/banco.mjs`.

**Aceite:**

- Adversário de ranked é escolhido no servidor e revalidado.
- Pedido direto com `modo: ranked`, com stake ou tentando declarar vencedor é recusado/ignorado conforme contrato, sem movimentos competitivos.
- `stake: false` não produz ranked gratuito pela versão nova.
- Mesma chave retorna a mesma partida e o mesmo valor, inclusive depois de tier mudar.
- Sem humano elegível: nada cobrado; treino oferecido explicitamente, sem bot apostando ou ganhando MMR.
- Clientes anteriores recebem transição explícita; não há cobrança nova silenciosa.
- Snapshot usado é a publicação ativa da conta, não um histórico arbitrário selecionado pelo cliente.

**Testes:** `test/liga-pareamento.mjs`, `test/liga-partida.mjs`, `test/liga-servidor.mjs`, `test/liga-stake.mjs` e casos de contrato antigo.

## AT6-03 — defesa com consentimento, orçamento e prazo

**Prioridade:** P0. **Dependência:** AT6-02.

**Problema atual:** inscrição booleana não expressa a perda máxima autorizada enquanto o dono está offline.

**Mudança:** autorização vinculada a snapshot, teto de stake, orçamento bruto, máximo de partidas e expiração. Padrão sugerido: até três defesas e 24 horas; renovação explícita. Inscrições antigas não ganham orçamento automaticamente.

**Arquivos:** `server/stake-liga.mjs`, `server/partida.mjs`, `server/banco.mjs`, `app/modules/liga-stake-dados.mjs`, `app/modules/liga-equipe-tela.mjs`.

**Aceite:**

- Bronze autorizado para 150/3 nunca perde mais de 150 em suas defesas, e não realiza quarta defesa.
- Ganhos não recarregam o orçamento bruto nem estendem a autorização.
- Promoção não eleva o teto aceito; entrada maior exige nova autorização.
- Nova publicação não transfere consentimento para outro snapshot automaticamente.
- Expiração, pausa, saída, posse inválida, saldo ou limite insuficientes impedem cobrança.
- Duas solicitações concorrentes não consomem o mesmo orçamento restante.
- Falha transacional ou cancelamento por integridade devolve stake e consumo definitivo; empate devolve stake, mas conta a defesa realizada.
- Replays e extratos mostram a entrada efetiva, inclusive em tiers diferentes.

**Testes:** ampliar `test/liga-stake.mjs` e adicionar concorrência de autorização, rollback e migração legada. Confirmar reconciliação da carteira.

## AT6-04 — limitar XP repetível antes de competir por nível

**Prioridade:** P0. **Dependência:** pode ser executada sobre a base atual; obrigatória antes de liberar a política AT6 ao público.

**Problema verificado:** `xpDaLuta` concede 10% da primeira vitória nas repetições, mas a rota pode receber várias chaves novas em sequência sem custo de stamina ou orçamento específico de XP repetido. O teto de moeda de repetição não resolve o XP.

**Reprodução local de referência:** seis criaturas de nível 70, Jornada desbloqueada, cinco vitórias repetidas no Campeão na mesma marca de tempo do servidor; ganho total de 6.450 XP somado no time, sem gasto de stamina. Foi uma simulação em banco em memória, não uma operação contra contas reais.

**Mudança proposta:** manter primeira vitória com recompensa plena; acrescentar orçamento de **XP de repetição agregado por conta/dia** e intervalo mínimo de concessão. Parâmetros iniciais de ensaio: 6.000 XP agregados/dia e 30 segundos entre concessões repetidas. Recalibrar pela curva de níveis; esses números não foram validados como ritmo final.

O combate de treino pode continuar acontecendo quando o intervalo ou teto de XP terminou. Sua resposta informa “treino realizado, XP de repetição disponível em X”, em vez de fingir que pagou. Distribuir o orçamento restante proporcionalmente aos participantes, com resto determinístico por ordem de slot; não favorecer um ID aleatório.

**Arquivos:** `engine/recompensa-pve.mjs`, `app/modules/jornada-conta.mjs`, `server/jornada.mjs`; estado diário de PvE persistido em `jornadas`, com migração aditiva quando necessária.

**Aceite:**

- Chaves diferentes não passam do orçamento agregado nem do intervalo de concessão do servidor.
- Primeira vitória legítima e idempotência atual são preservadas.
- Duas lutas simultâneas não pagam o mesmo saldo do orçamento diário.
- A virada usa o dia do mundo já existente; mudar relógio do navegador não reabre XP.
- Teto de moeda, XP repetido e PC-T de primeira vitória continuam contadores distintos.
- Não é criado um custo de PokéCash obrigatório para treinar.

**Testes:** `test/jornada-servidor.mjs`, `test/recompensa-pve.mjs` e uma reprodução de rajada com orçamento/intervalo controlados. Registrar medição de tempo para subir um reserva do nível de captura ao nível competitivo.

**Fronteira de escopo:** esse ensaio trata a repetição PvE por requisições na Jornada. Não acrescentar teto diário de XP às runs legítimas do Avanço; preservar a decisão registrada e os testes de `test/stamina-balanco.mjs`.

## AT6-05 — Arena central e melhora de time visível

**Prioridade:** P1. **Dependências:** AT6-01–04.

**Mudança:** promover Arena de Treinadores na navegação, tela de vitória final com acesso, card dos seis membros e entrada, inscrição de defesa compreensível, palco atual e resultado com líquido. Detectar atualização de nível/espécie/golpes/IV/natureza/preset, além dos IDs.

**Arquivos:** `app/modules/liga-equipe-dados.mjs`, `liga-equipe-tela.mjs`, `liga-stake-dados.mjs`, `liga-palco-dados.mjs`, `liga-palco.mjs`; localizar o controlador real de navegação e a tela de resultado da Jornada antes de editar, sem inventar outro roteador.

**Aceite:**

- Usuário encontra o objetivo antes da Liga e acessa a arena depois do Campeão.
- Nível elevado com os mesmos IDs pede republicação; UI não sugere upgrade aplicado ao snapshot antigo.
- Antes de buscar, vê entrada, pote, taxa, retorno e perda máxima.
- Defender offline exige ação explícita e mostra orçamento/prazo.
- Doze slots no palco, HP, golpe, efetividade, crítico e eliminações correspondem ao log.
- Resultado Bronze mostra retorno 90 e líquido +40, ou líquido −50; empate líquido zero.
- Fila vazia, manutenção, falta de saldo, time incompleto e rede têm ação de saída.
- No celular, confirmar aposta e controlar o replay não dependem de hover.

**Validação:** dados puros nos testes existentes; inspeção visual nas larguras exigidas pelo repositório e crítica de UI conforme os portões aplicáveis. Não adicionar testes que só comparem HTML com a própria implementação.

## AT6-06 — ranking da temporada, sem atividade herdada

**Prioridade:** P1. **Dependência:** AT6-02.

**Problema atual:** contagem acumulada de `liga_mmr.partidas` participa da seleção do ranking corrente; uma conta que só jogou na temporada anterior pode continuar aparecendo como ativa.

**Mudança:** contagem atual e classificação pública derivadas das partidas elegíveis na janela da temporada. Preservar Elo, reset, livro e histórico. Publicar posição da conta mesmo fora do top 20.

**Arquivos:** `server/liga-equipe.mjs`, `server/temporada.mjs`, `server/pontos-liga.mjs`, `app/modules/liga-equipe-dados.mjs`.

**Aceite:**

- Conta sem partida elegível na temporada atual não aparece como participante ativo.
- Ranking ao vivo e fechamento usam a mesma janela e desempate.
- Bot, amistoso e partida inelegível não contam para participação ou prêmio competitivo.
- Fechamento repetido não repete reset nem prêmio.
- Contador histórico não é zerado por acidente.
- Replays e temporadas anteriores mantêm a leitura original.

**Testes:** `test/liga-ranking.mjs`, `test/liga-temporada.mjs`, `test/liga-pontos.mjs`.

## AT6-07 — medir competição e funil

**Prioridade:** P1. **Dependências:** AT6-02–06, antes de aquisição.

**Mudança:** emitir os eventos e campos definidos em `05_VALIDACAO_E_METRICAS.md` no servidor, com chave idempotente para os fatos de partida e emissão. Derivar liquidação do ledger, não de cliques.

**Arquivos:** `server/telemetria.mjs`, `server/partida.mjs`, `server/liga-equipe.mjs`, `server/stake-liga.mjs`, `server/jornada.mjs`; usar o catálogo de eventos existente na versão atual de implementação.

**Aceite:**

- Funil distingue campeão, time pronto, busca vazia, partida, retorno e melhoria do time.
- Métricas de saldo não contam retorno do stake como nova emissão.
- Vitória por tier/nível/IV/preset/espécie pode ser analisada com exposição registrada.
- Fatos financeiros e falhas relevantes não são perdidos por refresh ou rede.
- Dados públicos do rival não expõem saldo, risco privado ou associação de contas.

**Testes:** validar evento por fato persistido, chave e campos obrigatórios; confrontar agregação de partida com ledger e sinais.

## AT6-08 — kit, reposição de bônus e campanha com teto

**Prioridade:** P1. **Dependências:** AT6-07 e AT6-11.

**Mudança:** kit 300 PC-B uma vez; experimento de até 50/dia de preparação e 100/semana de marco competitivo, sob orçamento global explícito e financiamento da casa/dotação registrada. As rotinas atuais de login/desafios entram no mesmo total proposto de até 450/semana; não empilhar esse modelo sobre os 80/semana atuais. Até modificar estudo e `engine/emissao.mjs` juntos, manter o teto atual. Resgates promocionais autenticados, com teto por campanha, sem conversão para PC-T.

**Arquivos:** novo `server/arena-recompensas.mjs`; `engine/carteira.mjs`, `server/carteira.mjs`, `server/banco.mjs`, `server/jornada.mjs`; dados e UI de resgate conforme o fluxo existente.

**Aceite:**

- Repetir o Campeão ou a requisição não repaga o kit.
- Conta antiga elegível recebe exatamente um kit quando a política passa a valer.
- Daily tem critérios comprovados, inclusive caminho sem stake; desfazer/repetir a mesma edição não acumula recompensa.
- Marco semanal exige rivais distintos, dias e partidas elegíveis; não exige vencer.
- Orçamento global e limite por conta não estouram em concorrência.
- Cupom não aceita bucket indicado pelo cliente, conta ligada ou campanha encerrada.
- Concessões registram tipo correto, janela, campanha e referência no ledger.
- Promoção financiada pela casa debita sua verba e credita jogador na mesma transação; casa/campanha sem saldo não concede crédito sem dotação registrada.

**Teste econômico obrigatório:** simular aquisição, seis derrotas seguidas, recuperação, promoção e circulação semanal. Ajustar tetos pelo saldo e emissão medidos; não liberar campanha sem o painel correspondente.

## AT6-09 — mercado como ferramenta de montagem de time

**Prioridade:** P2. **Dependências:** AT6-07–08 e regras atuais de mercado/vínculo.

**Mudança:** filtros úteis a composição competitiva; missão earned pós-Liga proposta de até 50 PC-T/semana, com público e orçamento fechados do piloto. Preservar maturidade e elegibilidade da carteira. Troca de criaturas continua caminho acessível.

**Arquivos:** `server/mercado-jogadores-busca.mjs`, `app/modules/mercado-jogadores-dados.mjs`, `mercado-jogadores-tela.mjs`, `server/arena-recompensas.mjs` proposto, `server/carteira.mjs`, `server/elegibilidade.mjs`, `engine/carteira.mjs`, `server/banco.mjs`.

**Aceite:**

- Procura por nível, IVs e utilidade de tipos usa atributos reais da instância.
- Comprar/vender/trocar invalida publicação que perdeu posse, preservando replay passado.
- PC-B de stake não se transforma em PC-T por resgate, item intermediário ou origem vinculada ignorada.
- Missão earned usa marco persistido, conta madura e chave semanal; conta ligada não duplica orçamento.
- Saldo elegível PC-T reconhece a origem nova explicitamente e nunca passa do disponível.
- Teto global anunciado funciona sem privilégio oculto de ordem de clique.

**Testes:** suites existentes de busca, carteira, mercado, vínculo, elegibilidade e snapshot. Simulação de emissão/retirada PC-T para o público de piloto.

## AT6-10 — vender expressão e prestígio

**Prioridade:** P2. **Dependência:** loop de retenção demonstrado e oferta comercial definida.

**Mudança:** catálogo pequeno de cosméticos com prévia para treinador e palco; passe cosmético apenas se houver conteúdo e operação para a temporada. Reusar compra cosmética onde for compatível; não fabricar um sistema de pagamentos dentro do combate.

**Aceite:**

- Equipar cosmético não altera resultado com mesma seed/time, power, MMR ou pareamento.
- Preço e entrega são explícitos; compra idempotente não duplica cobrança.
- Se usar PC-B como consumidor interno, item permanece vinculado e não cria conversão para moeda de negociação.
- O produto separa essa loja interna de eventual cobrança comercial em dinheiro.
- A Arena continua recuperável por atividade; preço de retorno à competição não depende de pagar.

**Fora da primeira versão:** controle manual em tempo real, battle physics que altere dano, EVs completos, habilidades completas, apostas de terceiros nas partidas privadas, empréstimo de Pokémon, saque e exchange. Cada um exige um desenho específico antes de virar story.

## AT6-11 — creditar os 10% à casa

**Prioridade:** P0. **Dependências:** AT6-02 e AT6-03. Executar antes de AT6-08 e do lançamento da política nova.

A ficha completa está em `07_TAXA_DA_CASA_E_TESOURARIA.md`, seção 8. Reaproveitar `treasury_ledger` e sua extensão aditiva, sem criar conta fictícia de usuário. Critério central: Bronze põe 100 no pote, retorna 90 ao vencedor e credita 10 à casa, de forma idempotente na mesma transação. Empate/cancelamento têm taxa zero.
