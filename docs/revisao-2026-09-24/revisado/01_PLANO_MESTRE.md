# Plano mestre — produto e execução

**Revisão 2.0 · comportamento-alvo e hipóteses de planejamento, não estado do código.**

## 1. Produto em uma frase

Um jogo de treinador com coleção e progressão em um mundo vivo, acompanhado de uma Arena automática compartilhada, com probabilidades e resultados auditáveis. O mundo usa linguagem visual GBA; a interface usa neon/cyberpunk. A fantasia de criar, escolher e evoluir uma equipe tem valor próprio e deve funcionar sem exigir apostas.

**Visão de longo prazo preservada:** coleção negociável, laboratório, Torre, Liga e mercado com RMT. Cada expansão precisa provar utilidade e cumprir suas dependências; a visão não exige construir todos os modos antes de testar o núcleo.

## 2. Público e hipóteses

Não há pesquisa de público ou dados de coorte no pacote. Estes são segmentos propostos para validação, e não um ICP já comprovado:

| Perfil | Motivo para entrar | Motivo para voltar | Pergunta de validação |
|---|---|---|---|
| Colecionador casual | Criaturas, evolução e identidade | Completar uma linha e receber a Rota OFF | Consegue progredir sem Arena? |
| Jogador de idle assistido | Mundo vivo e combate legível | Melhorar equipe e acessar outro estágio | Vale manter a tela aberta sem obrigação de interagir? |
| Analista de batalhas | Entender odds e desfechos | Aperfeiçoar previsões e comparar resultados | Há aprendizado mensurável e diversão sem promessa de lucro? |
| Comerciante futuro | Encontrar e produzir ativos desejados | Mercado com demanda e liquidação confiável | Existe demanda genuína, além da expectativa de revenda? |

O quarto perfil não deve comandar o primeiro teste de retenção: rendimento financeiro pode mascarar falta de diversão e não é evidência de valor do jogo isoladamente.

## 3. Os loops e suas fronteiras

| Loop | Entrada | Decisão | Retorno | Fronteira |
|---|---|---|---|---|
| Arena | Rodada pública, saldo simulado disponível | Seleção e valor dentro dos limites | Resultado líquido e replay | Nenhuma criatura possuída altera a rodada |
| Avanço | Criatura disponível, bioma e estágio | Equipe, alvo de farm, poção e recuo | XP, moeda, itens e encontros elegíveis | Relógio e recompensas no servidor |
| Rota OFF | Reserva e criaturas disponíveis | Rota, duração e finalidade | Relatório limitado ao período contratado | Não depende de manter aba aberta |
| Coleção | Encontro, bola e espaço | Quem capturar, guardar ou evoluir | Instância, progresso e dossiê | Sem exigir aposta para acesso básico |
| Identidade | Cosméticos possuídos | Equipar aparência | Expressão e reconhecimento | Sem mudança de poder ou probabilidade |
| Previsão | Evento sem stake | Distribuição de probabilidades | Pontuação explicável | Ranking independente de gasto |

Não forçar todas as sessões a atravessar todos os loops. O objetivo é uma conexão útil, não uma obrigação circular. A coleta OFF deve levar naturalmente à equipe; uma nova evolução deve tornar o próximo estágio compreensível; a Arena pode oferecer espetáculo e estudo sem ser pedágio da coleção.

## 4. Recorte da próxima versão de teste

**Entregar:** a jornada cadastro → inicial → primeira rota → resultado → captura/evolução → segunda sessão, com Arena simulada, boutique simulada e condições de período/clima visíveis e coerentes. Preservar os modos já relatados como implementados e corrigir ligações ausentes quando comprovadas.

**Não incluir nesta fatia:** pagamentos reais, liberação de RMT, mercado mútuo com valor externo, raids cooperativas completas, novas gerações, app nativo, nova engine 6x6 e infraestrutura distribuída. Esses itens permanecem no roadmap com gatilhos de entrada.

Uma versão de teste pode encerrar com limitações conhecidas, desde que elas não corrompam saldo, progresso ou entendimento da jornada. Uma tag privada de desenvolvimento não equivale a lançamento comercial; direitos sobre os materiais continuam sendo uma questão separada.

## 5. Marcos verificáveis

| Marco | Resultado | Evidência de saída | Decisão habilitada |
|---|---|---|---|
| M0 — base conhecida | Estado real reconciliado | Commit, comandos, jornadas verificadas e problemas reproduzíveis | Escolher o próximo bloco sem retrabalho |
| M1 — mundo coerente | 1.33 + 1.34/1.32b | Mesma run após refresh; prévia honesta; efeito legível | Concluir a trilha de condições |
| M2 — jornada íntegra | Coleção, loja, recursos e OFF persistem | Fluxos com reconexão, duas abas e falha de processo | Iniciar teste de uso fechado |
| M3 — loop validado | Pessoas entendem e retornam | Dados de ativação, D1/D7 e entrevistas | Priorizar laboratório, Torre ou previsão |
| M4 — profundidade validada | Uma expansão melhora o loop | Comparação de progressão/retorno sem piora dos limites | Ampliar conteúdo e população |
| M5 — prontidão comercial | Direitos, modelo econômico, operação e pagamentos definidos | Decisões e evidências da trilha comercial | Piloto comercial autorizado no escopo aprovado |

O M5 não é conclusão automática de M4. A decisão comercial pode acontecer em paralelo ao desenvolvimento; implementação financeira espera suas definições.

## 6. Estimativa e capacidade

Os antigos “menos de uma hora” ignoram testes, revisão e integração. O novo roadmap usa **faixas de esforço de desenvolvimento efetivo**, que precisam ser recalibradas depois dos três primeiros blocos. Não são prazo prometido nem medição do código ausente.

| Faixa | Referência inicial | Uso |
|---|---|---|
| P | 0,5–1,5 dia efetivo | Correção/localização de regra com integração pequena |
| M | 2–4 dias efetivos | Regra + persistência/API + tela ou integração |
| G | 5–10 dias efetivos | Vários fluxos, migração ou comportamento concorrente; decompor antes de executar |

Para **uma pessoa técnica**, M0–M2 têm envelope inicial de **4–7 semanas**, dependendo de quanto já estiver realmente integrado. M3 exige pelo menos uma janela de sete dias de observação; D30 só existe após 30 dias de oportunidade de retorno. O pacote não sustenta uma data de lançamento comercial.

Fórmula de calendário: `dias de trabalho restantes / disponibilidade efetiva + esperas externas + janela de observação`. Não contar uma mesma pessoa como capacidade integral em produto, arte e operação ao mesmo tempo.

WIP: um bloco de produto em implementação por responsável. Pesquisas comerciais independentes podem ocorrer em paralelo, sem alterar arquivos e requisitos do bloco aberto a cada nova ideia.

## 7. Métrica principal

**Jogadores semanais que completam um ciclo de progressão e retornam em outro dia.**

Ciclo de progressão: iniciar atividade → receber resultado válido → tomar uma decisão de equipe, coleção ou evolução. Não contar aba aberta, renderização, aposta repetida ou mero login como valor entregue. A métrica principal não deve recompensar aumento de volume apostado ou tempo passivo de tela.

Métricas auxiliares: ativação, sucesso de retomada, avanço de coleção por hora de jogo, sucesso da primeira captura/evolução, uso de dossiê, taxa de sessões sem erro crítico e percepção de clareza. Para monetização futura: contribuição líquida, retenção de pagantes, devoluções, concentração de receita e reclamações.

## 8. Critérios de gestão

- Separar **fato medido**, **relato histórico**, **inferência** e **proposta** em cada entrega.
- Priorizar primeiro integridade e jornada quebrada, depois conclusão do bloco de produto e, por fim, expansão.
- Defeito visual que torna a ação principal ilegível é bloqueio de produto, não polimento opcional.
- Não declarar correlação como causalidade: quem evolui mais também pode ser quem já permaneceria mais tempo.
- Não inflar “progresso do projeto” por número de commits ou de testes. Publicar percentual apenas de um marco com denominador e itens definidos.
- Cada expansão entra com hipótese, custo, teste e condição de parar. Falta de adesão leva a simplificar ou reordenar, não a acrescentar outro modo automaticamente.

## 9. Riscos com responsável e ação

| Risco | Responsável por papel | Ação antes de avançar |
|---|---|---|
| Estado documental não refletir o código | Desenvolvimento | M0; verificação por jornada e commit |
| Perda/duplicação de saldo ou item | Desenvolvimento | Transações e idempotência do M2 |
| Jogo complexo demais no início | Produto/UX | Teste de primeira sessão com observação |
| Economia depender de emissão/farm excessivo | Economia/produto | Simular perfis e ganhos por recurso |
| Pagamento gerar vantagem indireta | Produto/dono | DEC-03 e teste de linhagem econômica |
| Tema sem direitos de exploração demonstrados | Dono + assessoria especializada | DEC-01; inventário de direitos antes da publicação comercial |
| Modelo de RMT incompatível com operação pretendida | Dono + jurídico + pagamentos | DEC-02; resposta por fluxo, não por nome do produto |
| Processo técnico absorver o calendário | Responsável técnico | Orçamento por bloqueio e relatório de tempo |
| Mercado sem liquidez | Produto/economia | Piloto simulado com um mercado e medição de concentração |

Papéis são responsabilidades propostas. A pessoa que os assume deve ser registrada quando o projeto sair da revisão documental; esta entrega não inventa nomes de equipe.
