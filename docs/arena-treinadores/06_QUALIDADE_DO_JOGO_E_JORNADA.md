# Melhorias gerais — antes, durante e depois da Jornada

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

**Escopo:** preservar as recomendações de qualidade, progressão, economia e retenção que continuam úteis mesmo para quem ainda não concluiu a Liga ou não pretende apostar no PvP. Este documento complementa o endgame; o acesso à Arena ranqueada continua depois da Liga.

**Base técnica:** mesma branch e commit registrados em `00_LEIA_PRIMEIRO.md`. Números de produto propostos são hipóteses de experimento; valores descritos como atuais foram conferidos no código.

## 1. A campanha precisa ser boa por si só

Se o começo é confuso ou frustrante, o jogador não chega ao endgame. A promessa da Arena ajuda a dar direção, mas a sessão inicial deve entregar escolhas, aprendizado e progresso próprios.

Priorizar quatro perguntas claras: **qual é meu próximo objetivo, o que preciso melhorar, como faço isso e o que ganhei?** A interface deve apresentar uma ação principal por estado, com acesso fácil a coleção, treino e mapa. Evitar que o iniciante precise compreender todas as moedas, temporadas, presets e mercados para escolher seu inicial e começar.

Critério de produto proposto para a primeira sessão: o jogador escolhe o inicial, conclui uma ação de exploração, entende o resultado e vê a próxima etapa. Medir o tempo e os abandonos reais antes de fixar um limite universal de minutos.

### GQ-01 — próxima ação e primeira sessão

**Base:** `app/modules/guia-dados.mjs`, `guia-tela.mjs`, `volta-dados.mjs`, `retorno-dados.mjs`, `retorno-tela.mjs`; testes `test/comeco-treinador.mjs`, `test/guia.mjs`, `test/ritmo-entrada.mjs`, `test/curva-comeco.mjs`.

**Aplicação:** revisar os estados de sem-inicial, primeira exploração, primeira colheita, primeira captura, equipe ampliada e primeiro ginásio. Reaproveitar o guia e os estados atuais. Ao voltar, resumir o que ocorreu e oferecer uma próxima ação concreta.

**Aceite:** cada estado tem uma ação válida; rede indisponível não parece derrota; retomar não duplica uma colheita; a Arena aparece como objetivo futuro sem bloquear a diversão anterior. Validar o fluxo no celular e acompanhar abandono entre etapas.

## 2. Captura: duas probabilidades, uma experiência

O valor percebido de uma espécie depende da chance de encontrá-la **e** da chance de capturá-la. Aumentar encontros enquanto reduz captura pode manter o total capturado, mas aumenta cliques, gasto de bolas e sensação de perda. Por isso medir apenas “capturas por dia” é insuficiente.

A DEC-32 já aumentou o teto base para 45 encontros e aplicou fator 0,8 à captura. A chance atual usa raridade, multiplicador da bola e teto de 85%, com exceção de captura garantida. Há um lance por encontro. Não propor outro aumento indiscriminado de chances sem medir essa alteração recente.

Para uma espécie com probabilidade de encontro `p` e captura `q`, a aproximação é `E × p × q` capturas em `E` encontros. A probabilidade de ao menos uma captura em tentativas independentes é `1 − (1 − p × q)^E`. Isso é um modelo de referência; distribuição do bioma, limites e escolha de bola precisam entrar na simulação real.

No caso shiny, a regra padrão atual sorteia 1/2.000 por encontro; a criatura precisa ser capturada depois. Se a captura fosse 36%, a chance conjunta aproximada seria 1/5.556 por encontro elegível, não 1/2.000 de shiny capturado. Não usar essa aproximação como promessa para todas as espécies.

### GQ-02 — tornar captura e raridade compreensíveis

**Base:** `engine/captura.mjs`, `engine/shiny.mjs`, `engine/expedicao.mjs`, `app/modules/captura-tela.mjs`, `captura-cena.mjs`, `server/inventario.mjs`, `server/loja-idle.mjs`; testes `test/captura.mjs`, `test/captura-tela.mjs`, `test/e14-garantida.mjs`, `test/e14-inventario.mjs`.

**Aplicação:** mostrar a chance efetiva antes do lance, o item consumido e o progresso de registro obtido mesmo quando a criatura não é capturada. Explicar quando uma bola melhor muda a escolha e quando o item garantido é uma exceção.

**Aceite:** a UI usa a mesma função de chance do servidor; não promete segunda tentativa inexistente; um encontro já resolvido não consome outra bola; registro e captura aparecem como resultados diferentes; shiny visual comprado não se confunde com shiny de instância encontrado.

Medir capturas por raridade, sequências de falha, gasto de bolas, tempo até ampliar a equipe e desistência após falhas. Não vincular chance de captura ao valor apostado, saldo ou compra comercial.

## 3. Evolução deve dar escolha e progresso visível

Upar não pode parecer um contador sem efeito. Mostrar avanço de nível, mudança de stats, requisitos da evolução e consequências para golpes exclusivos. O sistema já possui evolução e decisões de moveset; a melhoria principal é fazê-las aparecer no momento certo.

Uma criatura capturada deve ter utilidade como titular, reserva, alternativa de tipo ou objeto de troca quando sua origem permite. IV ruim não deve torná-la automaticamente inútil para toda a Jornada. Shiny continua uma diferença de aparência e valor de coleção, sem bônus de dano.

### GQ-03 — comparação e planejamento da evolução

**Base:** `engine/evolucao.mjs`, `engine/instancia.mjs`, `engine/nivel-criatura.mjs`, `engine/exclusivos.mjs`, `engine/time.mjs`, `app/modules/evolucao-tela.mjs`, `evolucao-idle.mjs`, `evolucao-cena.mjs`; testes atuais de evolução, nível e exclusivos.

**Aplicação:** comparar antes/depois da evolução, explicar requisito faltante e mostrar os golpes que podem ser preservados. Exibir evolução durante a campanha, sem depender de rank ou aposta.

**Aceite:** evolução mantém identidade e IVs conforme a regra atual; consumo de item e mudança da criatura são atômicos; recurso de origem vinculada não produz criatura negociável por engano; a tela não promete que evolução sempre melhora todas as estratégias.

O defeito de XP repetível da Jornada deve ser tratado em **AT6-04**, sem duplicar story. Essa correção não autoriza reduzir XP de runs legítimas do Avanço por quantidade diária: o repositório registra a decisão de manter o XP da run para quem continua jogando. Medir progressão ativa e abuso de chamadas como problemas distintos.

## 4. Retenção sem depender de perder e recuperar stake

Há motivos para voltar antes da Arena: completar uma área, obter uma espécie, evoluir uma linha, aprender uma vantagem de tipo, vencer um ginásio e montar uma reserva. Depois dela, esses objetivos permanecem.

Missões devem oferecer escolhas compatíveis com o estágio da conta: capturar, explorar, treinar, ajustar o time ou avançar na Jornada. Não exigir aposta para resgatar uma missão genérica de coleção. Evitar tarefas que obrigam a vender um Pokémon importante, gastar um item raro ou comprar algo para manter uma sequência.

### GQ-04 — objetivos de sessão e retorno

**Base:** `server/progressao.mjs`, `server/escada.mjs`, `app/modules/desafios.mjs`, `app/modules/volta-dados.mjs`, `retorno-dados.mjs`, `engine/emissao.mjs`.

**Aplicação:** associar os desafios existentes a progresso útil: “complete a ficha de uma espécie”, “teste uma cobertura de tipo”, “prepare um reserva” e “avance até o próximo ginásio”. Marcar atividade persistida, em vez de confiar em um evento enviado pelo navegador.

**Aceite:** missão oferece recompensa e requisito antes da ação; a mesma ação não paga por refresh; faltar um dia não apaga uma conquista permanente; existe tarefa disponível para conta sem saldo de aposta; nenhum novo calendário de missão duplica a emissão das rotinas existentes.

Preservar stamina atual de 30/h e os limites já implementados até medir o fluxo inteiro. Maior frequência de retorno não é automaticamente melhor experiência: acompanhar sessão que termina por falta de objetivo, falta de recurso ou tempo de espera.

## 5. Economia compreensível e simulação fiel

Separar na interface moeda do treinador, PokéCash por origem e LP. Na hora de comprar ou negociar, mostrar o saldo realmente elegível, e não apenas um total que pode incluir bônus ou valores ainda em maturação.

O cadastro atual já concede 1.000 PC-B. Login e desafios já têm orçamento rotineiro agregado de 80 PC-B/semana em `engine/emissao.mjs`, com subtetos e teto de saldo. Kit do Campeão e novos incentivos precisam ser classificados e simulados junto dessas fontes. Não empilhar o plano novo em cima dos créditos existentes sem identificar a soma.

### GQ-05 — painel econômico e saldo explicável

**Base:** `engine/carteira.mjs`, `engine/emissao.mjs`, `engine/pct-jornada.mjs`, `server/carteira.mjs`, `server/progressao.mjs`, `server/telemetria.mjs`, `server/loja-idle.mjs`; testes `test/emissao.mjs`, `test/emissao-idle.mjs`, `test/e14-economia.mjs`, `test/e14-pct-jornada.mjs`.

**Aplicação:** explicar cada gasto pelo recurso apropriado e sua origem; atualizar o simulador para usar as mesmas regras do motor de runs, captura e recompensas. Medir dias de progressão, custo de bolas, emissão por origem, taxas, saldo de jogadores e saldo da casa.

**Aceite:** nenhuma simulação trata a recompensa de PC-T da Jornada como uma concessão diária repetível; os 850 atuais por conta são finitos; não há conversão silenciosa de bônus para transferível; percentuais de taxa informam seu destino.

Ponto de consistência da proposta AT6: os valores de 50/dia e 100/semana são um **experimento de redesenho** do orçamento, não um adicional autorizado sobre o teto atual de 80/semana. Para testar o agregado proposto de até 450/semana, atualizar estudo econômico e política de emissão juntos, contando login, desafios e novas missões dentro desse total. Antes desse experimento, vale o teto atual.

## 6. Negociação também tem utilidade antes da Liga

O mercado pode resolver uma falta concreta na coleção antes do endgame, respeitando maturidade, origem e elegibilidade já existentes. A nova arena não deve impor um portão de campeão a todas as trocas que o código hoje permite.

### GQ-06 — coleção, busca e decisão de troca

**Base:** `server/colecao.mjs`, `colecao-rotas.mjs`, `server/mercado-jogadores-busca.mjs`, `server/mercado-jogadores.mjs`, `server/trocas.mjs`, `app/modules/minha-colecao.mjs`, `mercado-jogadores-dados.mjs`, `mercado-jogadores-tela.mjs`.

**Aplicação:** permitir comparação de indivíduos da mesma espécie, nível, IVs, natureza, golpes, origem e negociabilidade. Procurar espécie e atributos úteis sem exigir que o jogador já conheça todos os nomes técnicos.

**Aceite:** item/criatura anunciado corresponde ao que será entregue; posse e disponibilidade são verificadas no fechamento; taxa e saldo elegível aparecem antes da confirmação; criatura vinculada é identificada e a UI não oferece uma venda inválida; troca não reescreve o histórico de batalhas.

As melhorias de busca de AT6-09 podem atender Jornada e Arena. Implementar uma única melhoria compartilhada, não dois mercados.

## 7. Monetização e conteúdo contínuo

Cosméticos, aparências do treinador, vitrine da coleção, comemoração de evolução e cenários têm valor antes do primeiro PvP. Reaproveitar AT6-10 para a oferta cosmética geral; não criar outra loja de moeda apenas para a campanha.

Eventos temporários podem destacar uma área, uma família de espécies ou um objetivo de coleção com duração clara. Seus parâmetros entram no pack/configuração do servidor e na simulação de encontros. A recompensa pode dar prestígio, materiais ou itens vinculados; não precisa emitir mais moeda a cada evento.

Manter objetivos permanentes disponíveis fora do evento. Não remover uma espécie competitivamente necessária para tornar compra ou calendário obrigatório. Priorizar lançamentos que usem sistemas existentes antes de adicionar breeding, guildas, raids novas ou controle manual completo.

## 8. Integração e prioridades

As fichas `GQ-*` entram no plano canônico, sem outra fila de execução:

| Prioridade | Ação | Benefício |
|---|---|---|
| P0 | AT6-04 e consistência de emissão/tesouraria | Evita que a competição nasça sobre progressão e saldo incoerentes. |
| P1 | GQ-01 e GQ-02 | Mais jogadores entendem o começo e continuam após capturas frustradas. |
| P1 | GQ-03 e GQ-05 | Evolução percebida e economia explicável. |
| P1 | GQ-04 | Retorno com objetivos úteis, sem obrigação de apostar. |
| P2 | GQ-06 e AT6-09 compartilhada | Mercado ajuda a coleção inteira e a formação competitiva. |
| P2 | AT6-10 e eventos pequenos | Oferta cosmética e conteúdo após comprovar retenção. |

Medir separadamente quem ainda está na campanha, quem concluiu a Liga e quem efetivamente disputa Arena. Uma melhoria do começo não deve ser julgada só por receita de stake; uma melhoria do PvP não deve esconder abandono antes do primeiro ginásio.


## 7. Coerência do combate desde a primeira sessão — revisão de 03/10

O estudo 08 mostrou uma diferença concreta: a Jornada de ginásios/Liga usa golpes, categorias, precisão, crítico, tipos, nível e IV/natureza; o Avanço dos biomas usa força agregada e golpes visuais. Não ensinar ao jogador que trocar um golpe melhora a wave antes de AT6-13 fazer esse golpe influenciar a resolução real.

AT6-12 revisa a iniciativa da TBE e exige nova calibragem da Jornada. No controle da Rota 1, Bulbasaur nível 4/5 saltou de 4% para 84% contra o Rattata nível 5; no 6×6 espelhado, +1 nível saltou de 50% para 91%. Pequenos degraus podem ser excessivos por ordem/KO e não por falta de números no tutorial. Corrigir o motor antes de acrescentar explicações que prometam progressão gradual.

Para cada nó, conservar a lição e medir time plausível, time que a aplica, time com níveis extras e composição desfavorável. Um counter bem escolhido deve ajudar; IV perfeito não pode ser requisito de campanha. Ensinar precisão por golpe, STAB, físico/especial, fraqueza dupla e imunidade a partir de eventos reais. Mostrar erro, crítico, superefetivo e velocidade/iniciativa no pós-luta, com sugestão específica de reserva/golpe/treino.

GQ-03 e GQ-06 devem comparar os atributos úteis do papel: IV de velocidade não tem o mesmo efeito que IV de HP; o potencial total não é odds. Ao evoluir, explicar mudança de stats/tipos/golpes e repetir a previsão de treino. A arena comum tem nível 50 e espécies sorteadas; a força da coleção não altera suas odds. Na Arena de Treinadores, o time próprio entra com seus atributos reais.

AT6-14 audita nomes e mecânicas do catálogo. Não prometer paralisia de Body Slam, prioridade de Quick Attack ou carga de Solar Beam enquanto o motor só usa seus metadados de dano/precisão. Descrever efeitos implementados de forma clara, sem exigir que o jogador conheça o código.

A integração do Avanço preserva stamina, capturas/encontros, foco/clima, identidade dos indivíduos e ganhos legítimos de XP. Runs anteriores não mudam de regra no meio; HP por indivíduo e entradas por wave precisam de contrato versionado. As métricas GQ de duração/emissão/progresso são repetidas depois da integração, em rollout separado do PvP.
