# PokéArena — revisão e plano de execução

**Revisão 2.0 · 24/09/2026 (America/Bahia)**

Este documento reúne o parecer, a fila de execução, as decisões pendentes e as contas conferidas. O pacote `pokearena-plano.zip` contém a especificação completa revisada, arquitetura, cartão 1.33, plano de validação, scripts reproduzíveis e os 27 documentos originais preservados. Comece por `COMECE_AQUI.md` dentro do pacote.

**Limite de evidência:** revisão documental; o ZIP recebido não continha o código executável do jogo. Estados de implementação precisam ser confirmados no repositório.

---

## Relatório crítico

**24/09/2026 · Revisão 2.0 · Escopo: os 27 documentos do ZIP recebido.**

### Parecer

O projeto tem especificação detalhada e boas decisões de base: Arena normalizada, motor determinístico, separação de conteúdo, ledger, jogo assistido com progresso persistente e cuidado visual. O problema principal é que o planejamento acumulou decisões incompatíveis e não atualizou os textos que deveriam governá-las. Isso induz retrabalho, fecha etapas sem evidência suficiente e apresenta hipóteses econômicas como conclusões.

A melhoria necessária é tornar o conjunto **executável e verificável**: uma fila, um estado de retomada, regras de economia sem ambiguidade, contratos de comportamento completos e critérios de saída com evidência. A revisão entrega esses documentos prontos, além do histórico preservado e do mapa de substituição arquivo a arquivo.

Não atribuí uma nota geral: sem código e sem observar jogadores, uma nota misturaria qualidade documental com qualidade do jogo. Também não reutilizei contagens históricas de testes como evidência de funcionamento atual.

### Achados prioritários e correções

| ID | Achado sustentado pelo pacote | Consequência | Correção nesta revisão |
|---|---|---|---|
| REV-01 | `CONTINUAR` e a tarefa 1.27f mandam reconstruir; `RETOMAR` de 16/09 registra conclusão | Repetição de trabalho já entregue | 1.27f vira “conclusão relatada”; conferência no repositório antes de qualquer intervenção |
| REV-02 | `CLAUDE` congela aperfeiçoamentos do arnês, mas `RETOMAR` e `ROADMAP` ainda põem T11 na frente | A regra de produto não controla a fila | 1.33 é o próximo bloco de produto; T11 condicionado a impedimento e orçamento |
| REV-03 | Spec §§4.4.3/6.2 e Economy §4.1 mantêm viés de 19,22%; L-023 já identifica erro de escala | Priorização e discurso de fairness baseados em conta errada | Fórmulas corrigidas, derivação e script reproduzível; medições antigas classificadas como não reproduzidas |
| REV-04 | Fonte de verdade diz “sem P2W”; L-126/L-144 tratam lucro de aposta paga como poder sem influência do pagamento | Conversão indireta de dinheiro em progressão continua possível | Matriz de permissões e linhagem econômica; conflito de produto explicitado em DEC-03 |
| REV-05 | PC-T/B/C, comprado/livre, Orbe, Essência e Estilhaço coexistem como modelos | Migração ou loja pode mudar o significado de saldo | Vocabulário consolidado e plano de migração sem converter permissões silenciosamente |
| REV-06 | Spec exige pack original; passagem mais recente registra Pokémon como premissa e recusa criaturas autorais | Prazo de lançamento não tem caminho comercial definido | Manter tema de desenvolvimento; separar decisão de identidade comercial e evidência de direitos |
| REV-07 | Parecer fala em monetizar tickets sem consulta e saque como uma chave | Subestima dependências operacionais, contratuais e de pagamentos | RMT mantido na visão; decomposto em produto próprio com entregas e pré-requisitos |
| REV-08 | API ainda descreve raiz de 32 bits e janela de 30 s, enquanto F1.15 e 1.27 relatam mudanças | Cliente, documentação e auditoria divergem | Contrato-alvo de raiz opaca e janela de 40 s; inventário HTTP obrigatório |
| REV-09 | §7.22 combina seis mobs, dois chefes, stamina 35 e blocos posteriores com quatro mobs, um chefe e stamina 23 | Implementações igualmente “fiéis” dão jogos diferentes | Consolidar quatro mobs nas waves normais e um chefe final; 23 é custo-base sem derrotas |
| REV-10 | Prévia 1.33 pede “quem aparece agora”; L-177 mantém clima oculto até entrar | Prévia pode revelar clima secreto ou prometer elenco incorreto | Separar prévia por período dos elegíveis por clima; elenco exato após início |
| REV-11 | D-093 permite sucesso sem comparação visual; L-174 diz que Q5 não entra na run | Suíte verde pode não observar a jornada principal | Cobertura de fluxo real e relatório explícito de testes executados, pulados e inconclusivos |
| REV-12 | Cache de Q2 tratado como função de três entradas e independente da máquina | Ambiente ou ferramenta pode mudar sem invalidar resultado | Contrato de validade inclui runtime, configuração e fontes reais de influência |
| REV-13 | O processo relata 40 commits de arnês e um de produto em oito dias | Custo do método desloca o objetivo | Orçamento de ferramental, limite de frente em curso e parada definida |
| REV-14 | “Teto de encontros” é apresentado como proteção suficiente da economia; run sem encontros ainda paga itens e moeda | Emissão de outros recursos fica sem limite explicitado | Simular e observar produção por recurso, horas ativas, stamina, reserva e perfis |
| REV-15 | Cosmético permanece animado mesmo com movimento reduzido; GIF obrigatório | Escolha estética substitui controle de acessibilidade | Preservar posse e aparência com redução/pausa local de movimento; proposta marcada |
| REV-16 | R$ 5 é declarado “o preço certo”; estudo empresarial recomenda evitar microcompras | Precificação decidida por narrativa | Testar preço, frequência, margem e taxa fixa conjuntamente |
| REV-17 | “Sem vantagem de EV” é usado como prova de que o produto não retém | Salto de matemática para comportamento sem experimento | Separar retorno esperado, diversão, coleção, previsões e retenção |
| REV-18 | Ocultar probabilidade do mercado mútuo é apresentado como garantia de habilidade | Motor acessível permite cálculo externo; liquidez não é garantida | Tratar como hipótese de UX e testar simulação externa, seleção de mercados e concentração |
| REV-19 | Snapshot assíncrono da Liga e stake de dois usuários sem mandato/reserva definidos | Defesa pode gastar saldo várias vezes ou sofrer débito não consentido | Liga gratuita primeiro; fila econômica futura com consentimento, reserva e expiração |
| REV-20 | Mínimo de 50 e orçamento rotineiro de 80/semana aparecem sem jornada de iniciante integrada | Cadência pode depender de resgate ou compra | Medir duração da banca e participação gratuita; calibrar mínimo/budget em conjunto |
| REV-21 | Muitos blocos “donos” não são responsáveis humanos e algumas fichas têm status contraditório | Pendências parecem atribuídas sem ninguém decidir | Responsável por papel, dependência, gatilho e próxima ação por bloco |
| REV-22 | Modelos e CSVs de reprodução são citados, mas não vieram no ZIP | Números antigos não são auditáveis pelo pacote | Diferenciar verificação aritmética nova de reprodução do estudo original |

### O que mudou de fato na entrega

- Os 27 documentos receberam destino explícito. Textos normativos foram consolidados; passagens antigas viraram referências históricas.
- O próximo bloco 1.33 ganhou regra de seleção, interação com clima secreto, tempo, versionamento, compatibilidade de runs, casos de borda e critérios de saída.
- O roadmap passou a entregar fatias utilizáveis e a verificar integrações relatadas antes de reconstruí-las.
- Economia recebeu uma matriz de usos, simulação mínima exigida, regras de liquidação e cenários de negócio separados.
- Arquitetura recebeu atomicidade, idempotência, SSE, recuperação, observabilidade e contratos de cliente/servidor.
- O método manteve Q1–Q9, mas passou a explicar quando cada evidência é necessária e o que não constitui aprovação.
- As decisões cruciais ficaram separadas de parâmetros reversíveis. Nenhuma autorização de dinheiro real foi inferida do pedido de revisar documentos.

### Reavaliações que mudam o planejamento

#### A correção estatística não pode ficar só em uma lacuna

Para o estimador amostral simples, a aproximação de segunda ordem do **viés absoluto da odd** é `(1-p)/(n·p²)`. O **viés relativo** é `(1-p)/(n·p)`. Com `p=0,016` e `n=20.000`, são aproximadamente **0,1922 pontos de odd** e **0,3075%**, respectivamente. Não são 19,22%.

O projeto usa Laplace, cujo cálculo precisa ser analisado separadamente. Sob amostras binomiais independentes e 12 competidores, a expectativa exata do inverso de `(X+1)/(n+12)` também não confirma automaticamente a afirmação da L-023 de viés negativo. O valor histórico pode envolver condições, amostragem ou outro cálculo não disponível. A revisão não escolhe a narrativa mais recente: fornece a identidade matemática de referência e exige reprodução do motor.

Também corrigi a interpretação de “2% de erro”: a fórmula adotada controla aproximadamente **um erro-padrão relativo**, não um intervalo de 95%. Um intervalo marginal normal de aproximadamente ±2% exige cerca de **590.646 simulações**, para a mesma probabilidade de 1,6%. Isso não obriga aumentar imediatamente o lote: obriga nomear corretamente o que 154 mil garante e medir o custo antes de mudar.

#### O cadeado não elimina o caminho pago até o poder

Se 100 unidades compradas ganham a odd 2 e 100 de lucro se tornam livres para boost, a compra financiou uma chance de produzir poder. A probabilidade de perder não remove essa influência. Exigir pedra também não resolve sozinho se a pedra for negociável por saldo comprável.

A revisão mantém laboratório e RMT no planejamento, mas elimina a afirmação de compatibilidade automática. A recomendação para testes é impedir que linhagem paga adquira novas permissões ao vencer. A aceitação de aceleração paga precisa ser decisão explícita, com seus efeitos nos rankings e no mercado medidos.

#### Concluir software e estar pronto para lançar são estados diferentes

“V1 concluída” pode significar que os blocos de código foram relatados como fechados. Não demonstra retenção, operação recuperável, direitos de publicação, pagamentos habilitados ou validação da economia. O roadmap passa a distinguir **implementação**, **integração**, **validação com jogadores** e **prontidão de publicação**.

#### O tema e o RMT são premissas, não garantias de viabilidade

A revisão preserva Pokémon como intenção do projeto e RMT como objetivo futuro registrado. Não promete que essa combinação será autorizada, licenciável ou aceita por um prestador de pagamentos. As fontes oficiais consultadas reforçam que isso precisa de avaliação específica. Renomear saque como repasse, ou operar manualmente, não resolve os requisitos de liquidação e responsabilidade.

### Limites da revisão

Não foi possível executar `npm test`, conferir commits, testar a API, observar o jogo, revisar a criptografia implementada ou reproduzir os estudos com seus scripts originais: esses materiais não vieram no pacote. A revisão fez análise documental, rastreamento das decisões, conferências aritméticas independentes e consulta pontual a fontes primárias.

Não há evidência suficiente para declarar quantos defeitos permanecem abertos no código. O inventário conserva todos os registros localizados e sinaliza ambiguidades; não transforma automaticamente uma palavra “fechada” em conclusão técnica.

### Ordem recomendada

1. Conferir o estado real e o fluxo que inicia/retoma uma run.
2. Executar 1.33, se a base não apresentar bloqueio de integridade ou funcionamento.
3. Entregar 1.34/1.32b: relógio, apresentação e explicação das condições.
4. Fechar falhas de integração e persistência da jornada, incluindo Estilhaço e cosméticos.
5. Medir progressão e retorno com um grupo pequeno antes de ampliar laboratório, Torre e mercados.
6. Desenvolver RMT como trilha condicionada própria, sem tratá-lo como configuração final de uma loja.

O detalhe executável está em ROADMAP.md (no pacote). Fontes externas e seu alcance estão em 09_FONTES.md (no pacote).

---

## Plano de execução

Esta é a fila normativa do planejamento revisado. O ZIP contém documentos; todos os estados de código abaixo são **reportados pelo histórico**, até confirmação em M0. Uma tarefa só é concluída com comportamento demonstrado na versão identificada.

### Estado de partida

- 1.27f/T9/T10/T13/T11a aparecem como encerrados em `RETOMAR.md` de 16/09. Não reiniciar o cartão 1.27f por causa de um cabeçalho antigo.
- O arquivo mais recente de próximo bloco aponta 1.33: influência de período/clima sobre elenco. Não há evidência de implementação desse bloco no pacote.
- Ferramentas ficam congeladas, salvo impedimento concreto a uma entrega do produto. Números de Q1/Q2 e duração de suítes são registros históricos, não validação desta revisão.
- RMT continua na visão de produto, sujeito a decisões e gates; não foi descartado nem autorizado para lançamento por esta revisão.

### Fila e marcos

P = até 1,5 dia; M = 2–4 dias; G = 5–10 dias de trabalho focado. São faixas preliminares por pessoa familiarizada com o código; não promessas. Reestimar depois de M0 e incluir espera externa separadamente. WIP máximo: uma entrega de produto e um impedimento técnico indispensável.

| Ordem | ID / marco | Entrega | Depende de | Porte | Saída verificável |
|---|---|---|---|---|---|
| 1 | BASE-01 / M0 | Conciliar checkout, estados e contratos reais | Acesso ao repositório executável | M | Inventário com commit, smoke, números reais e discrepâncias |
| 2 | PROD-133 / M1 | Elenco contextual determinístico | BASE-01; DEC-10 com padrão proposto | M | Critérios do cartão 1.33 atendidos; ausência de condição preservada |
| 3 | PROD-134 / M1 | Prévia honesta e explicação de condições; incorporar 1.32b | PROD-133 | M | Jogador entende possibilidades antes e elenco efetivo depois; sem revelar clima oculto |
| 4 | INT-01 / M2 | Integridade das recompensas, limites e resgates | BASE-01; regras DEC-08/09 reconciliadas | M–G | Fonte de recurso medida; reserva liberada; resgate e gasto concorrentes não duplicam |
| 5 | INT-02 / M2 | Posse e persistência entre mochila, equipamentos e lojas | INT-01; verificar L-157/L-055 | M | Compra/equipar/reconectar/trocar de dispositivo mantêm a mesma posse |
| 6 | UX-01 / M2 | Corrigir impedimentos reproduzidos do fluxo de jogo | BASE-01; fluxo real capturado | M | Camera/legibilidade/efeitos e assets não bloqueiam compreensão |
| 7 | OBS-01 / M2 | Telemetria mínima e restauração | Jornadas M2 estáveis | M | Eventos deduplicados, painel/coortes calculáveis, restauração demonstrada |
| 8 | PILOTO-01 / M3 | Usabilidade e economia sem dinheiro real | M2; gate de IP/distribuição compatível com teste | G + observação | Problemas priorizados por evidência; retenção e saldos medidos |
| 9 | LAB-01 / M4 | Protótipo B1, curva e um sink demonstrado | Piloto; DEC-03/04 | M–G | Curva simulada e teste jogável sem rota indireta de poder pago |
| 10 | EXP-01 / M4 | Escolher uma expansão: Torre, Liga, coleção ou mercado de teste | Piloto aponta necessidade; design da expansão | G por corte | Uma hipótese de retenção testada; sem abrir todos os sistemas juntos |
| 11 | COM-01 / M5 | Oferta comercial definida e operação pronta | DEC-01/02/03; economia/PSP/jurídico/recuperação | Reestimar | Autorização aplicável, termos, conciliação, suporte e métricas comprovados |

M0–M2: reservar aproximadamente 4–7 semanas de uma pessoa técnica como envelope inicial, não soma garantida de tickets. Recalcular com escopo reproduzido em M0. Piloto requer tempo de calendário: D7 só existe após sete dias completos; D30 após trinta. Pesquisa, aprovação externa e arte não devem ser escondidas dentro de “dias de desenvolvimento”.

### BASE-01: confirmar antes de ampliar

Entregar `ESTADO_CONFIRMADO.md` no repositório real com commit e data. Abrir aplicação por um caminho de usuário, iniciar uma run, observar uma recompensa e retomar após refresh. Verificar 40 s, seed opaca, limites 30/36/50, ondas, stamina, formas capturadas e estado de 1.27f. Extrair contratos reais e identificar divergências com este plano. Confirmar se as rotas/campos propostos já existem.

Executar somente verificações pertinentes à baseline. Se o harness não consegue abrir a run (L-174), corrigir esse impedimento para observar o produto; não transformar BASE-01 em reconstrução completa do harness. A ausência de código no ZIP é um requisito de entrada para execução, não um defeito do jogo.

Se BASE-01 reproduzir perda/duplicação de saldo, quebra de posse ou impossibilidade de completar a jornada, antecipar a correção correspondente de INT-01/INT-02/UX-01 antes de PROD-133. Registrar a mudança e sua evidência na fila; não avançar uma funcionalidade cosmética sobre uma base inutilizável.

### PROD-133 e PROD-134

Usar PROXIMO_BLOCO_1.33.md (no pacote). Separar a resolução pura do elenco e sua explicação visual, mas não declarar a funcionalidade entregue antes da integração. O antigo desejo de “preview sempre exato” conflita com clima oculto: a proposta é mostrar possibilidades antes da criação e elenco efetivo depois. Se o dono preferir revelar o clima antes, registrar DEC-10 e alterar as duas regras juntas.

### INT-01: economia que não duplica

Confirmar L-159 (Estilhaço no baú), reservas compartilhadas Avanço/OFF, liberações em falha/cancelamento e faucets após o limite de capturas. Construir mapa real de XP, moedas, fragmentos e itens por hora/conta. Testar dois resgates simultâneos e retry após commit sem resposta. Evidência exigida: um único crédito e saldo reconciliado. Não adicionar um faucet apenas porque existe um botão ou nome no documento antigo.

DEC-08/09 precisam de decisão de produto se o código contrariar o texto mais recente; registrar opção e impacto, não mudar a regra silenciosamente. Corrigir o risco econômico antes de calibrar a quantidade ideal de recompensas.

### INT-02: uma posse confiável

Verificar a situação de `pa.cosmeticos.v1` e `pa.outfit.v1` e da persistência no servidor. Local storage pode guardar preferência de exibição, não ser autoridade para um item adquirido. Uma compra é atômica com a posse; tentativa repetida não cobra de novo. Equipar exige posse. Testar outra sessão/dispositivo e reconexão. As nove outfits sem oferta (L-158) continuam pausadas até a decisão correspondente; não transformar inventário de arte em obrigação de vender tudo.

### UX-01: correções orientadas ao jogador

Triagem inicial, sujeita a reprodução: L-171 (cast/projétil), L-172 (sobreposição de dano), L-175 e D-082 (câmera/banner), L-176 (áudio/vídeo ausentes), L-160 (IDs crus). Priorizar o que impede entender uma ação, ler um resultado ou completar a jornada. Fotos/snapshots de componentes isolados não substituem a run real.

Não reabrir automaticamente os diffs de arena abandonados em D-099/D-104. Usar asserções e revisão visual adequadas ao comportamento dinâmico. Baseline visual ausente precisa falhar de forma explicada ou marcar a comparação como não executada; não aprovar um clone limpo sem comparação por acidente (D-093).

### Backlog condicionado, sem perda da visão

| Tema | Tratamento | Condição para entrar na fila |
|---|---|---|
| B2–B7 do laboratório | Aguardar B1 | Curva e demanda de B1 justificam ampliar |
| Torre | Corte independente, regras de recompensa e dificuldade | Piloto identifica necessidade de desafio/progressão |
| Liga/defesas assíncronas | Protótipo sem exposição financeira | Consentimento e reserva explícitos antes de qualquer aposta automática |
| Mercado/RMT, L-117 | Preservado como decisão estratégica | DEC-01/02/03 e operação completa, incluindo disputas e conciliação |
| Vulcão, L-143 | Validar distribuição antes de criar raros | DEC-05; conteúdo elegível e arte disponível |
| Dossiê | Separar dado simulado de resultado observado | Regras de desbloqueio e privacidade consistentes; sem vantagem paga incompatível |
| Ferramentas T11/trilhas adicionais | Pausadas por padrão | Regressão reproduzida bloqueia ticket ativo; orçamento e saída definidos |
| Órfão `avanco-bola.mjs`, L-167 | Limpeza localizada | Confirmação de ausência de uso; junto de alteração relacionada |
| L-173/renomes/parsers/fetch intermitente | Dívida técnica por causa comprovada | Não agrupar sintomas diferentes numa correção presumida |

### Política de mudanças e encerramento

Um item ativo contém objetivo, dependências, fora de escopo, critérios de aceite e evidência. “Passou no teste” não basta se o teste nunca atravessou o comportamento. “Pareceu funcionar” não basta para saldo, seed ou concorrência. Dois ciclos de infraestrutura sem avanço exigem reduzir o problema e registrar impedimento, não abrir outra trilha automaticamente.

No fechamento, atualizar somente o estado corrente, o ticket e as decisões afetadas. O histórico fica intacto. Nunca manter uma segunda lista de “próximo passo” em um documento concorrente.

---

## Decisões pendentes

Revisão de 24/09/2026. Estas são propostas para decisão futura; a produção deste plano não equivale à aprovação de novos preços, regras de save, distribuição pública ou dinheiro real. Responsáveis são papéis a designar, não pessoas presumidas na equipe.

### Decisões que precisam ficar explícitas

| ID | Questão e evidência | Recomendação | Quem decide | O que depende dela / padrão enquanto aberta |
|---|---|---|---|---|
| DEC-01 | Como explorar o tema Pokémon e os assets? Não há licença no pacote; premissa recente preserva a franquia | Inventariar marca, sprites, áudio, vídeo e origem; obter avaliação e direitos necessários para o uso pretendido. Manter a escolha criativa explícita | Dono + assessoria de IP | Distribuição/comercialização. Não presumir que ser gratuito ou privado concede permissão; continuar apenas trabalho compatível com o escopo autorizado |
| DEC-02 | RMT é requisito estratégico, mas formato e enquadramento estão indefinidos | Desenhar fluxos de entrada, aposta, prêmio, revenda, repasse e saque; validar cada um com assessoria e PSP. Definir se há operador, marketplace, comprador/vendedor e responsabilidade de disputa | Dono + jurídico + financeiro/pagamentos | Produção de mercado/repasse real. Enquanto aberto: protótipo isolado com valores fictícios e sem promessa de conversão |
| DEC-03 | O compromisso P5 proíbe influência de pagamento sobre poder? Lucro de stake comprado e materiais negociáveis criam rotas indiretas | Adotar matriz restritiva do documento econômico e rastrear origem. Se preferir permitir aceleração paga, revisar expressamente P5, ranking e comunicação | Dono/produto | Laboratório pago, mercado de materiais e moedas. Não converter nem liberar saldo automaticamente |
| DEC-04 | Qual tempo de progressão e curva de B1–B7? L-144 registra dependência anterior | Prototipar B1 com tempo-alvo medido e custo de recursos concorrentes; ampliar só após observar uso e inflação | Produto + economia | Implementação ampla do laboratório. Não inferir “50% grátis” de material representando 60% do tempo |
| DEC-05 | Vulcão sem raro elegível: lacuna de conteúdo ou escolha? | Auditar o pool de 14 espécies reportado. Preservar identidade de bioma; não adicionar raro apenas para satisfazer quota | Produto + conteúdo/arte | Expansão de conteúdo daquele bioma; não bloqueia resolver genérico com fallback |
| DEC-06 | Outfits/arte pausadas devem ser vendidas agora? L-158 registra nove sem oferta | Manter pausa; vender só com catálogo, posse, assets e proposta de valor completos | Dono/produto + arte | Ampliação da loja; não bloqueia corrigir persistência do que já existe |
| DEC-07 | OFF “desloga” da experiência ou revoga autenticação? | Encerrar presença ativa/ocupação conforme regra e permitir retorno autenticado; não derrubar todos os dispositivos sem intenção explícita | Produto + desenvolvimento | Comportamento de sessão ao enviar OFF. Confirmar implementação antes de mudar |
| DEC-08 | Capturar a espécie encontrada ou sempre a base evolutiva? Textos divergem | No Avanço, entregar a espécie elegível mostrada, com probabilidade/regra explícita; preservar outras modalidades até reconciliar | Produto | Migração de coleção, drops e economia de doces. Nenhuma alteração retroativa de posse |
| DEC-09 | Stamina por tentativa iniciada ou vitória? O total 23 ignora repetição | Cobrar por tentativa iniciada e mostrar custo-base + custo de nova tentativa; se a versão real cobrar diferente, tratar como mudança de balanceamento | Produto + economia | Regra de retries e conteúdo de UI; não recontabilizar gasto passado |
| DEC-10 | Prévia exata é compatível com clima oculto? Qual fuso/período governa o mundo? | Possibilidades antes; elenco efetivo depois. Período congelado no início; fuso explícito. UTC 06h/18h é só padrão de protótipo, subordinado à regra vigente confirmada | Produto + desenvolvimento | 1.33/1.34; pode implementar resolver com contexto injetado antes da escolha de apresentação |

### Decisões de processo propostas nesta revisão

| ID | Regra | Justificativa |
|---|---|---|
| GOV-01 | ROADMAP é a única fila; RETOMAR é o único estado de continuação | Documentos antigos ordenavam reabrir tarefas reportadas como concluídas |
| GOV-02 | Confirmar código em BASE-01 antes de usar estados históricos como atuais | O ZIP contém apenas planejamento |
| GOV-03 | Congelar expansão do harness; permitir correção indispensável com orçamento | Histórico relata concentração excessiva de trabalho em ferramentas |
| GOV-04 | “Implementado”, “validado com usuários” e “pronto para comercializar” são estados distintos | Testes técnicos não demonstram retenção, margem ou autorização |
| GOV-05 | Preservar registros históricos e IDs duplicados com ocorrência própria | Evitar apagar evidência ou fundir causas diferentes |

### Modelo de registro de decisão efetiva

Ao resolver um item, adicionar data, decisor, opção escolhida, alternativas descartadas, evidência, impacto em comportamento/saves/economia, plano de migração e arquivos afetados. Marcar a proposta anterior como substituída sem apagar sua justificativa. Uma decisão só é operacional quando seus critérios estão refletidos no cartão e nos contratos pertinentes.

Exemplo de evidência insuficiente: “foi decidido em conversa” sem a regra concreta. Evidência útil: “preview mostra possibilidades até a run existir; resposta de criação revela o elenco; runs antigas mantêm versão anterior; nenhuma porcentagem será exibida no primeiro corte”.

### Ordem de resolução

Durante M0: confirmar DEC-07/08/09 e a regra vigente de DEC-10. DEC-01/02/03 podem avançar em paralelo, antes de investimento em produção comercial. DEC-04/05/06 entram quando seu bloco estiver próximo; não paralisar a correção de uma jornada por uma decisão distante de conteúdo.

---

## Cálculos e cenários

Gerado por `verificar_calculos.py`, sem dependências externas. Não executa o motor do jogo. Reexecutar após alterar `premissas.json`.

### Matemática e capacidade

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

### Modelo de conteúdo: hipóteses, não previsão

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

### Estudos anteriores

Com entradas publicadas arredondadas: 75.000 / 3,12 = 24038.46153846153846153846154 e 87.000 / 2,908 = 29917.46905089408528198074278. Diferenças pequenas dos resultados antigos podem vir de arredondamento; sem os scripts originais, não há reprodução exata.

Exemplo de taxas: 3% + R$ 0,40 representa 11% de ticket R$ 5 e 5% de ticket R$ 20. Isso compara custo por pedido, não conversão ou contribuição por visitante.

### O que ainda precisa ser medido

Simulação do motor, fontes/sinks por perfil, progressão 7/30/90/180 dias, benchmark atual, retenção, preços, conversão, suporte e contratos de taxas reais. O modelo fornecido torna as hipóteses editáveis; não preenche essas lacunas com evidência inventada.
