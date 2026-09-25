# Revisão crítica do planejamento PokéArena

**24/09/2026 · Revisão 2.0 · Escopo: os 27 documentos do ZIP recebido.**

## Parecer

O projeto tem especificação detalhada e boas decisões de base: Arena normalizada, motor determinístico, separação de conteúdo, ledger, jogo assistido com progresso persistente e cuidado visual. O problema principal é que o planejamento acumulou decisões incompatíveis e não atualizou os textos que deveriam governá-las. Isso induz retrabalho, fecha etapas sem evidência suficiente e apresenta hipóteses econômicas como conclusões.

A melhoria necessária é tornar o conjunto **executável e verificável**: uma fila, um estado de retomada, regras de economia sem ambiguidade, contratos de comportamento completos e critérios de saída com evidência. A revisão entrega esses documentos prontos, além do histórico preservado e do mapa de substituição arquivo a arquivo.

Não atribuí uma nota geral: sem código e sem observar jogadores, uma nota misturaria qualidade documental com qualidade do jogo. Também não reutilizei contagens históricas de testes como evidência de funcionamento atual.

## Achados prioritários e correções

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

## O que mudou de fato na entrega

- Os 27 documentos receberam destino explícito. Textos normativos foram consolidados; passagens antigas viraram referências históricas.
- O próximo bloco 1.33 ganhou regra de seleção, interação com clima secreto, tempo, versionamento, compatibilidade de runs, casos de borda e critérios de saída.
- O roadmap passou a entregar fatias utilizáveis e a verificar integrações relatadas antes de reconstruí-las.
- Economia recebeu uma matriz de usos, simulação mínima exigida, regras de liquidação e cenários de negócio separados.
- Arquitetura recebeu atomicidade, idempotência, SSE, recuperação, observabilidade e contratos de cliente/servidor.
- O método manteve Q1–Q9, mas passou a explicar quando cada evidência é necessária e o que não constitui aprovação.
- As decisões cruciais ficaram separadas de parâmetros reversíveis. Nenhuma autorização de dinheiro real foi inferida do pedido de revisar documentos.

## Reavaliações que mudam o planejamento

### A correção estatística não pode ficar só em uma lacuna

Para o estimador amostral simples, a aproximação de segunda ordem do **viés absoluto da odd** é `(1-p)/(n·p²)`. O **viés relativo** é `(1-p)/(n·p)`. Com `p=0,016` e `n=20.000`, são aproximadamente **0,1922 pontos de odd** e **0,3075%**, respectivamente. Não são 19,22%.

O projeto usa Laplace, cujo cálculo precisa ser analisado separadamente. Sob amostras binomiais independentes e 12 competidores, a expectativa exata do inverso de `(X+1)/(n+12)` também não confirma automaticamente a afirmação da L-023 de viés negativo. O valor histórico pode envolver condições, amostragem ou outro cálculo não disponível. A revisão não escolhe a narrativa mais recente: fornece a identidade matemática de referência e exige reprodução do motor.

Também corrigi a interpretação de “2% de erro”: a fórmula adotada controla aproximadamente **um erro-padrão relativo**, não um intervalo de 95%. Um intervalo marginal normal de aproximadamente ±2% exige cerca de **590.646 simulações**, para a mesma probabilidade de 1,6%. Isso não obriga aumentar imediatamente o lote: obriga nomear corretamente o que 154 mil garante e medir o custo antes de mudar.

### O cadeado não elimina o caminho pago até o poder

Se 100 unidades compradas ganham a odd 2 e 100 de lucro se tornam livres para boost, a compra financiou uma chance de produzir poder. A probabilidade de perder não remove essa influência. Exigir pedra também não resolve sozinho se a pedra for negociável por saldo comprável.

A revisão mantém laboratório e RMT no planejamento, mas elimina a afirmação de compatibilidade automática. A recomendação para testes é impedir que linhagem paga adquira novas permissões ao vencer. A aceitação de aceleração paga precisa ser decisão explícita, com seus efeitos nos rankings e no mercado medidos.

### Concluir software e estar pronto para lançar são estados diferentes

“V1 concluída” pode significar que os blocos de código foram relatados como fechados. Não demonstra retenção, operação recuperável, direitos de publicação, pagamentos habilitados ou validação da economia. O roadmap passa a distinguir **implementação**, **integração**, **validação com jogadores** e **prontidão de publicação**.

### O tema e o RMT são premissas, não garantias de viabilidade

A revisão preserva Pokémon como intenção do projeto e RMT como objetivo futuro registrado. Não promete que essa combinação será autorizada, licenciável ou aceita por um prestador de pagamentos. As fontes oficiais consultadas reforçam que isso precisa de avaliação específica. Renomear saque como repasse, ou operar manualmente, não resolve os requisitos de liquidação e responsabilidade.

## Limites da revisão

Não foi possível executar `npm test`, conferir commits, testar a API, observar o jogo, revisar a criptografia implementada ou reproduzir os estudos com seus scripts originais: esses materiais não vieram no pacote. A revisão fez análise documental, rastreamento das decisões, conferências aritméticas independentes e consulta pontual a fontes primárias.

Não há evidência suficiente para declarar quantos defeitos permanecem abertos no código. O inventário conserva todos os registros localizados e sinaliza ambiguidades; não transforma automaticamente uma palavra “fechada” em conclusão técnica.

## Ordem recomendada

1. Conferir o estado real e o fluxo que inicia/retoma uma run.
2. Executar 1.33, se a base não apresentar bloqueio de integridade ou funcionamento.
3. Entregar 1.34/1.32b: relógio, apresentação e explicação das condições.
4. Fechar falhas de integração e persistência da jornada, incluindo Estilhaço e cosméticos.
5. Medir progressão e retorno com um grupo pequeno antes de ampliar laboratório, Torre e mercados.
6. Desenvolver RMT como trilha condicionada própria, sem tratá-lo como configuração final de uma loja.

O detalhe executável está em [ROADMAP.md](../ROADMAP.md). Fontes externas e seu alcance estão em [09_FONTES.md](09_FONTES.md).
