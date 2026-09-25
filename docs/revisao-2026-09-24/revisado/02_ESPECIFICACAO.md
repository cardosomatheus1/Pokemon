# Especificação consolidada do produto

**Alvo da revisão 2.0.** Regras herdadas e propostas estão diferenciadas. Implementação precisa ser conferida no M0. Onde houver dependência de decisão econômica, vale o comportamento simulado e a restrição mais específica, sem converter o save automaticamente.

## 1. Invariantes de produto

| ID | Regra | Evidência esperada |
|---|---|---|
| INV-01 | A Arena não usa atributos de instâncias do jogador | Alterar coleção/equipamento não altera elenco, odds nem resultado da mesma rodada |
| INV-02 | Servidor decide saldo, captura, XP, consumo, calendário e resultado | Cliente envia intenção; adulterar estado local não concede recursos |
| INV-03 | Resultado é determinístico dadas as entradas versionadas | Mesmo snapshot e eventos produzem mesmo resultado |
| INV-04 | Um comando econômico tem um efeito lógico | Repetição, timeout e duas abas não duplicam consumo ou recompensa |
| INV-05 | Toda variação econômica é rastreável | Saldo e inventário reconciliáveis com movimentos |
| INV-06 | Aparência não modifica regras de combate | Troca de cosmético preserva entradas econômicas e estatísticas |
| INV-07 | A criatura tem uma única ocupação incompatível por vez | Avanço, OFF, treino e venda não reservam a mesma instância simultaneamente |
| INV-08 | Uma run iniciada não troca suas regras por atualização de clima/conteúdo | Snapshot e política de migração explícitos |
| INV-09 | Restrições econômicas não desaparecem por prêmio ou transformação | Linhagem da origem acompanha resultado; permissões são explícitas |
| INV-10 | UI explica uma recusa sem mascarar a causa | Código de recusa, motivo e condição de liberação consistentes |

## 2. Arena

### 2.1 Fluxo

O servidor prepara o elenco normalizado e as odds; publica a rodada com compromisso criptográfico; abre a janela de aposta; fecha; revela o necessário à auditoria; resolve e transmite o replay; liquida; encerra.

**Janela documental vigente: 40 segundos**, conforme Spec §5.6 e registro do 1.27. Os 30 segundos do onboarding e da API antiga são históricos. Duração da luta e intervalo de resultado devem ser lidos da configuração/versão e não reproduzidos como constantes de marketing.

Uma posição ativa por usuário e rodada, alterável somente antes do lock. Na confirmação, mostrar seleção, stake, odd aceita, retorno bruto potencial, lucro líquido potencial e saldo que será reservado. Confirmar uma edição substitui a reserva de forma atômica, preservando a aposta anterior se a nova for recusada.

### 2.2 Lock e liquidação

Elegibilidade exige `fase == aberta` **e** `agoraServidor < fechaEm`. Um scheduler atrasado não pode prolongar a aposta. O instante e a reserva pertencem à mesma decisão transacional. No limite exato `agoraServidor == fechaEm`, recusar. Não aceitar timestamp do cliente como exceção.

Odds ficam congeladas ao abrir. A odd do ticket é a que liquida, inclusive se LiveOps mudar a próxima rodada. Não cortar retorno de ticket aceito; limitar stake/exposição antes da confirmação.

Payout bruto inclui principal quando aplicável; lucro líquido é payout menos stake. Mostrar ambos com os nomes corretos. Não celebrar retorno igual ou inferior ao stake. Falha técnica com anulação devolve a composição original da reserva; não apaga o ticket.

### 2.3 Transparência

Replay deve identificar rodada, versões do motor/conteúdo/precificação, entradas públicas, odd do ticket e desfecho. Compromisso prova que o resultado comprometido não foi trocado após a publicação; **não prova sozinho ausência de seleção prévia de sementes, censura de rodadas ou correção das odds**. A política de geração e de anulação também precisa ser auditável.

Não prometer que ler a Arena fixa produz lucro esperado positivo. A fórmula ideal com mesma informação e probabilidade exata produz EV líquido de `−margem`; isso não é prova de que o espetáculo ou a previsão não possam ser divertidos.

## 3. Coleção e equipe

### 3.1 Conteúdo e instâncias

A separação histórica é mantida: Arena com subconjunto normalizado, coleção com catálogo maior e lendários em trilha própria. Os números 76/146/151 descrevem o pack histórico; não viram limites do motor. Regras de elegibilidade, bioma, tipos, evolução e golpes pertencem ao ContentPack versionado.

Instância mínima: id, dono, espécie, versão do conteúdo de origem, nível/XP, potencial/atributos ocultos, natureza, foco, vínculo, stamina, equipamento, ocupação, proveniência e versão de persistência. Potencial e natureza são propriedades geradas; não devem ser recalculados por atualização de catálogo. As três barras visuais explicam a distribuição, evitando um único escore enganoso.

As 25 naturezas e seis atributos ocultos são decisões do desenho posterior ao §7.9 antigo. A interface continua simples, mas a especificação não pode continuar dizendo que esses campos não existem.

### 3.2 Duplicatas e evolução

**Duplicata é uma instância, não conversão automática obrigatória.** O jogador pode guardá-la, usá-la em outra equipe ou convertê-la voluntariamente segundo receita explícita. Isso preserva a premissa posterior de coleção/mercado, contradita pelo §7.6 original.

Evolução é comandada pelo jogador, com requisito legível, consumo atômico e prévia do efeito. Não consumir pedra se nível, posse, espaço ou ocupação impedirem a mudança. Ao repetir a requisição, devolver a mesma evolução, sem consumir novamente.

Golpes usados no mundo do treinador respeitam espécie, nível e desbloqueio. O comparador com a Arena deve usar a função compartilhada apropriada, deixando claro que a Arena normaliza atributos e não usa o moveset pessoal.

### 3.3 Captura e dossiê

O fluxo vigente do Avanço coloca a captura **no resultado “Quem apareceu”**, não no meio da wave. Até uma tentativa por espécie elegível por run é a regra documentada a preservar, a confirmar no código. Cada encontro tem id próprio, prazo/política explícitos e controle de claim. A bola é consumida junto com a resolução; refresh não ressorteia.

Não manter a antiga regra “todo encontro nasce de uma aposta”. O mundo do treinador oferece encontros sem Arena. A forma capturada — espécie encontrada ou base da linha — é conflito que precisa de conferência do comportamento do 1.2 e decisão DEC-08 antes de alterar saves. Padrão recomendado para o Avanço: mostrar e capturar a mesma espécie elegível; não anunciar uma forma e entregar outra sem aviso.

O dossiê segue a decisão posterior: cinco análises por espécie, desbloqueadas sem repetição e persistentes por conta. Tipos de análise podem incluir moveset, stats, comportamento, histórico e matchups. Dados históricos carregam amostra, período, versão e modo de obtenção. Simulações não são contadas como partidas reais; farm não cria observações reais de uma batalha que não ocorreu.

Parâmetros históricos a reconciliar com o catálogo: avistar concede +1 fragmento, capturar concede +4 adicionais; cada análise custa 4/6/10/15/25 fragmentos para comum/incomum/raro/muito raro/lendário. A próxima análise é sorteada entre as ainda não obtidas. O total de 6.050 fragmentos e os prazos em meses reportados dependem do pack e da estratégia de farm simulada; sem o script original não são promessa de tempo de conclusão. Informação relevante à competição entra na avaliação de vantagem paga de DEC-03.

## 4. Avanço

### 4.1 Estrutura vigente consolidada

| Elemento | Regra-alvo |
|---|---|
| Run | Dez waves de progresso |
| Waves 1–9 | Quatro mobs por tentativa de wave, conforme L-169/1.27c |
| Wave 10 | Um chefe, confronto 1x1 com anúncio, conforme L-170/1.27c |
| Pool de estágio | Até quatro candidatos comuns e até dois candidatos a chefe, conforme conteúdo disponível |
| Abate | Evento de combate; não equivale a encontro capturável |
| Encontro | Espécie efetivamente apresentada e elegível para captura; contado uma vez por run |
| Repetição | Derrota repete wave enquanto as condições permitirem, com tentativa na semente |
| Stamina | Custo-base documentado de 2 por wave normal e 5 no chefe: 23 numa limpeza sem repetição |
| Fim por derrota/recuo | Preserva o farm conquistado; não concede baú final/desbloqueio de limpeza |

Uma limpeza sem repetição mostra **37 mobs**, não 58. Com quatro comuns e um chefe efetivamente encontrado, o máximo usual de espécies distintas apresentadas é **cinco**, mesmo que a pool contenha dois chefes possíveis. Não reservar ou consumir seis como verdade universal; calcular do contrato real. Se seis lugares forem reservados conservadoramente, liberar o excedente ao encerrar e explicar a diferença.

**23 de stamina não é teto de uma run com derrotas.** A regra recomendada é cobrar por tentativa iniciada, inclusive repetição, e impedir tentativa sem saldo de stamina. Se o código cobra por wave vencida, preservar a versão antiga e resolver DEC-09 antes de migrar. A UI mostra custo-base e possibilidade de gasto adicional.

### 4.2 Combate e encenação

Resolver a wave antes de encenar, usando snapshot de equipe, conteúdo, condição, índice e tentativa. O roteiro reparte dano e eventos; não altera o resultado econômico. A soma de dano efetivamente apresentado corresponde ao resolvido, após cura registrada e clamps válidos.

Poção aceita pelo servidor tem id, instante, valor efetivo de cura e consumo. Afeta HP e sobrevivência futura; não reescreve o resultado de wave já comprometida. Definir uma ordem total para eventos no mesmo instante: aplicar progressão até o instante do comando, verificar se a criatura continua viva, então validar/cobrar/aplicar cura. Cura após morte é recusada e não é consumida.

Retomar run após ausência deve equivaler ao avanço incremental com os mesmos comandos. Tempo de parede do cliente não dá recompensa. Aumentar força pode reduzir duração dentro de limites publicados, sem reduzir a batalha a um golpe ilegível. Os multiplicadores de ritmo existentes devem ser mantidos em 1.33; qualquer recalibração ganha experimento próprio.

### 4.3 Limite de encontros

Manter teto compartilhado entre Avanço e OFF, calculado no servidor. O histórico cita janela móvel de 24 h e valores 30/36; uma evolução posterior relata escada até 50. **Não escolher um desses números por recência isolada:** M0 registra fórmula real e política; proposta é centralizar a derivação no servidor e publicar total, consumido, reservado, disponível e próxima liberação.

Nova run pode iniciar com limite de encontros esgotado, conforme L-151, mas informa antes da confirmação que não renderá captura elegível. XP, moeda, itens e baú têm seus próprios limites de emissão; ausência de encontros não significa farm sem impacto econômico.

Ao reservar OFF e iniciar Avanço ao mesmo tempo, usar operação atômica. Ao concluir, converter reserva em consumo real e liberar sobra. Cancelamento/expiração não pode deixar reserva fantasma. Não somar tetos por aba, dispositivo, bioma ou modo.

## 5. Rota OFF e treino

Rota OFF e Trainer OFF têm aba própria, conforme L-154. OFF usa reserva própria e duração declarada; Avanço usa stamina. Preservar as durações históricas de 45 min/3 h/8 h até calibração específica. A equivalência de duração não implica a mesma recompensa por hora.

Ao enviar, registrar atividade e ocupação antes de desconectar a experiência de jogo. “Deslogar” precisa de semântica definida: recomendação é encerrar presença/execução ativa e permitir retorno autenticado, não invalidar silenciosamente outras sessões da conta. Revogação de autenticação em todos os dispositivos é decisão separada (DEC-07).

Retorno após uma semana concede apenas o que o contrato da atividade permite. Nunca estender automaticamente uma atividade de oito horas a sete dias. Relatório identifica tempo efetivamente remunerado, recursos e perdas/limites aplicados.

Treino de banco produz XP e vínculo, sem encontro e sem item, como §7.22.14. Criatura em aventura não treina; criatura em treino não é anunciada no mercado. Receitas históricas de XP/h são parâmetros a medir, não garantia de balanceamento.

## 6. Clima, período e preview

Reutilizar a tabela de condições do 1.32 e ampliá-la para seleção de elenco. Nenhuma espécie entra fora do bioma/faixa só porque um tipo é favorecido. A condição afeta a **escolha dentro dos candidatos elegíveis**.

Período e clima mecânicos são congelados no início, junto com versão do pack e do algoritmo. A iluminação pode acompanhar o relógio do mundo em tempo real, mas a tela informa “condição da run: noite/chuvoso” quando diferir do ambiente visual atual.

Antes do início, a prévia mostra período vigente e espécies possíveis por condição; não publica elenco exato influenciado por clima ainda secreto. Depois da criação, mostra elenco e condição efetivos. Alteração de período entre prévia e início exige nova confirmação com informação atualizada, não uma entrada silenciosa em outra pool.

O contrato detalhado está em [PROXIMO_BLOCO_1.33.md](../PROXIMO_BLOCO_1.33.md). A definição de conteúdo para todos os climas é um entregável desse bloco, não uma lista de tipos inventada em documentação de API.

## 7. Loja, itens e identidade

Loja PvE vende consumíveis em PokéCoin; boutique usa PokéCash conforme permissões. Estilhaço é material de obtenção/receita, não nova moeda de compra real. Cada item possui origem, receitas, preço, uso, limite, negociabilidade, ícone e versão. “Uma única porta por item” deixa de ser dogma: múltiplas fontes podem coexistir se tiverem custo, finalidade e emissão explicitados.

Posse e equipado são estados diferentes, persistidos no servidor em modo online. Comprar duas vezes o mesmo desbloqueio permanente deve ser impossível ou ter compensação declarada antes da compra. Catálogo de desenvolvimento com tudo liberado não pode contaminar saldo ou posse de produção.

Estilhaço, mochila, wiki e log leem o mesmo catálogo. Não imprimir ids crus como `est:folha`; quando arte estiver pendente, usar representação textual ou placeholder declarado que não finja ser arte final.

Banner acompanha as telas habitadas, mas não encobre ações, HP, contador ou relatório. Música começa conforme consentimento/configuração, tem mute persistente e cessa quando o contexto muda. Falha de áudio/vídeo não bloqueia resultado nem fica escondida dos diagnósticos.

## 8. UX, visual e acessibilidade

Prioridade por tela: estado atual → decisão possível → consequência → detalhe. Cartão compacto de equipe preserva nível, foco, três stats e requisito de evolução; XP detalhado, potencial e natureza podem ficar na ficha. Não confundir redução de informação com organização.

Inspecionar 420, 1100, 1440 e 1920 px nos fluxos atuais; incluir 360 e 2560 px quando o bloco afetar extremos relevantes. Isso não exige redesign mobile completo para fechar todo bloco, mas exige verificar o alcance declarado da alteração.

**Proposta que substitui a política de movimento forçado:** respeitar movimento reduzido e oferecer pausa dos elementos decorativos contínuos, mantendo espécie, cores, pose e identidade do cosmético. A preferência não pode apagar captura, aviso ou resultado. Controles de movimento afetam apresentação local; a simulação e o relógio autoritativo continuam corretos. Conferir flashes, navegação por teclado, foco, nomes acessíveis e contraste. Referência externa: W3C em [09_FONTES.md](09_FONTES.md).

## 9. Expansões preservadas

| Expansão | Primeira fatia | Dependência real |
|---|---|---|
| Laboratório B1–B7 | Uma receita B1 simulada + efeito legível | DEC-03/04, curva e recursos reconciliados |
| Torre | Um conjunto curto de andares com HP/cura/recuo | Jornada íntegra e prova de decisão estratégica |
| Liga de Previsão | Palpite sem stake e avaliação explicada | Dataset de eventos e scoring, sem depender de mercado mútuo |
| Mercado de itens simulado | Uma classe, escrow, compra e cancelamento | Posse autoritativa e linhagem |
| Mercado mútuo simulado | Um mercado com regra de empate/nenhum vencedor | Ledger e população que permita testar liquidez |
| Liga 6x6 | Confronto assíncrono sem stake | Snapshot, engine separada, antirrepetição e balanceamento |
| RMT | Fluxo completo com provedor em teste | Direitos, enquadramento, contratos, pagamento, disputas e reserva |
| Lendários/raid | Fragmento cosmético garantido e protótipo de encontro | Não depender de promessa de ativo revendável |

Não prometer primeiro lendário, conversão de saldo, preço ou liquidez de mercado sem decisão específica. Preservar as ideias no backlog é diferente de publicar uma oferta.
