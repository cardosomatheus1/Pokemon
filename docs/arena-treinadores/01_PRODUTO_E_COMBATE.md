# Produto e combate — a Jornada desemboca no PvP

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

## 1. A promessa do jogo

“Vença a Liga, monte seu time e dispute a Arena de Treinadores.” A primeira vitória contra o Campeão fecha a campanha de formação e abre a competição contínua. A coleção deixa de ser apenas completismo: espécies, IVs, níveis e golpes passam a ter utilidade competitiva.

O jogo já ensina tipos, composição e presets na Jornada. O endgame deve cobrar essas decisões e mostrar por que uma mudança ajudou. A derrota precisa produzir uma hipótese testável, como “três membros do meu time são fracos a Gelo”, e uma ação concreta: capturar, trocar um golpe, treinar ou negociar um substituto.

A campanha e a coleção precisam oferecer progresso por si mesmas. As melhorias gerais, inclusive para quem não disputa PvP, estão em `06_QUALIDADE_DO_JOGO_E_JORNADA.md`.

## 2. Desbloqueio

O servidor considera a Liga concluída quando o progresso persistido contém os nós da Liga previstos pelo pack, incluindo seu final. No pack atual são `lorelei`, `bruno`, `agatha`, `lance` e `campeao`. A vitória é registrada pelo motor e pelo servidor; nenhum campo enviado pelo cliente libera o acesso.

| Estado | Experiência |
|---|---|
| Antes da Liga concluída | Arena visível como objetivo; mostra a próxima etapa da Jornada. Treino continua disponível. |
| Liga concluída, menos de seis no time | Acesso desbloqueado; chamada “Complete seu time: faltam N Pokémon”. |
| Seis membros, publicação ausente ou inválida | “Publicar meu time”; indica golpes, preset e versão. |
| Time válido e saldo insuficiente | Mostra valor que falta e ações de preparação/treino; não força uma compra. |
| Time e saldo válidos | “Disputar Bronze — 50 PokéCash”, ou o rank e valor correspondentes. |
| Sem adversário elegível | Busca termina sem cobrança; oferece treino identificado e nova tentativa. |

A elegibilidade é permanente depois da conquista legítima. Vender um Pokémon pode invalidar o time, mas não retira o título da conta. Contas antigas com progresso válido recebem o desbloqueio na leitura, sem precisar vencer novamente.

Na primeira conquista, uma tela curta apresenta: título obtido, Arena liberada, time atual, entrada Bronze e a diferença entre saldo de competição e saldo para negociação. O kit inicial proposto consta no documento econômico.

## 3. Três modalidades claras

| Modalidade | Requisito | Rank | Stake |
|---|---|---|---|
| Treino | Regras atuais de treino; pode ensinar antes do final da Jornada | Não altera | Zero |
| Desafio amistoso | Times e posse válidos; identifica jogador ou bot | Não altera | Zero |
| Arena ranqueada | Ambos concluíram a Liga; ambos têm seis membros válidos; pareamento do servidor | Altera se a partida for elegível | Obrigatório, definido pelos tiers |

Essa distinção é uma **mudança proposta**: atualmente a Liga pode conceder MMR sem stake. Na nova direção, o botão principal representa a disputa com entrada. Um desafio escolhido pelo cliente não vira um atalho para selecionar adversários fracos e ganhar rank ou moedas.

## 4. Forma de PvP na primeira versão

Reaproveitar o **PvP assíncrono** atual: um jogador enfrenta o time publicado por outro jogador real, que pode estar offline. O servidor simula os dois times e grava o resultado. O rival é o time de uma conta real, com decisões e criaturas dessa conta.

A interface deve escrever “Defesa publicada de @jogador”, sem sugerir que o outro está assistindo ao vivo. Uma futura fila entre dois jogadores presentes pode usar a mesma resolução, mas exige lobby, confirmação bilateral e tratamento de desconexão próprios.

Para defesa com stake, o jogador inscreve um time, um orçamento, um máximo de partidas e um prazo. A simples publicação do time não autoriza gastar seu saldo. O detalhamento financeiro está em `02_ECONOMIA_MARKETING_E_MONETIZACAO.md`.

## 5. O combate desejado

**Dois times de seis, com os doze Pokémon presentes no palco.** Cada sobrevivente age na ordem determinada por sua velocidade; escolhe golpe e alvo conforme o preset publicado. Todos os membros podem atacar a cada turno. Não há seis duelos separados nem um único Pokémon ativo por treinador.

A batalha é automática. A habilidade do jogador está na preparação: formação, espécie, nível, IVs, natureza, quatro golpes e preset. O palco mostra movimentação, projéteis, dano, barras de vida e eliminações, enquanto o servidor é a autoridade do resultado.

| Elemento | Regra inicial e base atual |
|---|---|
| Tamanho | Ranked exige exatamente 6 por lado; o motor genérico mantém suporte de 1 a 6 para PvE/treino. |
| Posse | Cada criatura pertence à conta no momento da nova partida. Snapshot de criatura vendida não participa. |
| Espécies | Proposta de ranked: uma ocorrência de cada `dex` por time; dois indivíduos da mesma espécie não entram juntos. Formas com dex diferente continuam distintas. |
| Nível | Nível real entre 1 e 100; influencia stats e dano. Não normalizar para nível 50. |
| IV | Seis valores de 0 a 31; fórmula atual limita o efeito de cada IV a aproximadamente −5%/+5% sobre seu stat. |
| Natureza | Modificadores atuais de até ±5% nos stats correspondentes. |
| Golpes | Entre 1 e 4 por criatura, resolvidos pelo moveset válido no servidor. Distinguir físico e especial. |
| Tipos | STAB de 1,5 e efetividade multiplicada pelos tipos do defensor, incluindo imunidade. |
| Velocidade | Hoje define a ordem estrita. Candidata de piloto: iniciativa por turno com variação de ±10%, conservando vantagem crescente de velocidade. Ver estudo 08 e AT6-12. |
| Sorte | Precisão, crítico de 1/16 com multiplicador 1,5 e variação de dano já existentes. Não usar sorte para corrigir um resultado comercial. |
| Imunidades completas | Preservar último recurso atual, sem tipo e poder 10, quando nenhum golpe atinge nenhum inimigo vivo. |
| Final | Time com sobreviventes contra zero rivais vence. No limite atual de 100 turnos com os dois lados vivos: empate e devolução do stake. |
| Shiny | Aparência e prestígio; não aumenta força. |
| Power | Serve ao pareamento e à explicação; não decide quem vence. |

O número “poder 50” em um comentário antigo do último recurso diverge da constante executada: a base atual usa **10**. A implementação deve seguir o código e atualizar esse comentário quando tocar o arquivo.

O estudo [08_ESTUDO_DO_MOTOR_E_BALANCEAMENTO.md](08_ESTUDO_DO_MOTOR_E_BALANCEAMENTO.md) mostrou que limitar IV a ±5% nos stats não limita seu efeito na vitória: +1 em todos os IVs deu cerca de 90% no espelho, com power igual. Para a iniciativa candidata ±10%, esse caso caiu para cerca de 54%; +1 nível, para 58%. São resultados de pesquisa, não regra implantada. Níveis/IVs melhores continuam úteis e tipos/cobertura permanecem decisivos. A arena comum usa espécies sorteadas com nível 50 e compressão de stats; essas regras não são copiadas para o PvP da coleção.

Não anunciar habilidades, EVs, itens equipados ou todos os efeitos de status como implementados. O combate atual não oferece um sistema completo dessas mecânicas. Uma expansão com queimadura, paralisia, buffs e cura precisa de regras, versão e testes próprios; fica depois de medir o metagame inicial.

## 6. Presets e expressão estratégica

- **Equilibrado:** maior dano esperado entre pares golpe/alvo.
- **Agressivo:** prioriza a chance de finalizar um alvo ferido.
- **Defensivo:** prioriza a maior ameaça ao próprio time.
- **Foco:** prioriza efetividade de tipo, depois dano esperado.

A ordem dos slots é congelada e resolve alguns empates de seleção. Explicar essa influência; não prometer bônus de “linha da frente” ou distância que o motor não calcula. Inicialmente, deslocamento no palco é encenação do log, sem colisão que altere dano.

## 7. Ranking e força são eixos diferentes

Rank mede desempenho contra rivais elegíveis; nível e composição medem recursos do time. Manter Elo inicial 1.000, K 32 e os limiares atuais. Mostrar tier, posição e progresso até o próximo tier; o valor numérico exato do MMR permanece interno na primeira versão.

Usar pareamento por MMR e força para evitar que um veterano de nível 100 recém-chegado ao Bronze enfrente automaticamente um recém-campeão de nível 60. A melhora de nível continua valendo **dentro da faixa competitiva**. O adversário também pode ter evoluído; upar não garante uma sequência de vitórias.

Parâmetros provisórios revisados para o piloto: MMR com diferença até 150; razão simétrica de power até 1,05; diferença média de nível até 1; diferença até 2 em cada posição dos seis níveis ordenados. Validar na busca e na execução. Esses filtros dependem de AT6-12/14 e não substituem balanceamento: power igual pode esconder vantagem de velocidade. A proposta anterior de power 1,20/nível médio 10 permitiria 99,8% de vitória no espelho medido e foi retirada como regra de piloto. Não ampliar silenciosamente a faixa porque a fila está pequena; calibrar disponibilidade e segurança com dados reais.

Preservar a exclusão de contas ligadas, os últimos três adversários e cooldown de seis horas por par. Medir fila vazia antes de revisar esses limites. Amistoso com amigos fornece atividade sem criar rank artificial.

## 8. Progressão que faz voltar

| Horizonte | Objetivo | Ação que alimenta o jogo |
|---|---|---|
| Próxima partida | Corrigir uma fraqueza do time | Selecionar reserva, trocar golpe ou preset. |
| Próximos dias | Melhorar um papel específico | Capturar uma espécie, comparar IVs, evoluir e treinar. |
| Próximo rank | Obter uma formação consistente e bankroll suficiente | Diversificar o time, avaliar resultados, negociar com outros jogadores. |
| Temporada de 28 dias | Melhor posição e troféu visual | Competir contra rivais variados, perseguir marco de tier. |
| Longo prazo | Coleção de alternativas e prestígio | Construir reservas, shinies, títulos, histórico de temporadas. |

Reserva interessa tanto quanto os seis titulares. O mercado deve permitir procurar “resistente a Gelo”, “atacante especial” ou espécie desejada, além de IV total e nível. Isso é evolução da busca existente, não um novo mercado.

Evitar que a solução dominante seja repetir um único campeão PvE indefinidamente. A análise encontrou XP de repetição sem limite de frequência efetivo na rota da Jornada. Com nível relevante no PvP, esse comportamento passa a comprometer a competição; a correção tem prioridade antes do lançamento do endgame.

## 9. Apresentação

Promover “Arena de Treinadores” a destino reconhecível na navegação; diferenciar a “Arena de Previsões”. Hoje a Liga de times está dentro de Time, e já usa palco animado de seis contra seis.

Antes da busca, mostrar: seis membros, níveis, preset, stake, **taxa de 10% do pote destinada à casa**, retorno total do vencedor e perda máxima. Depois, abrir o palco já existente e exibir time 6→0, golpes, efetividade, crítico e resultado. No Bronze: entrada 50 por lado, casa 10 e vencedor 90.

No resultado, apresentar separadamente: retorno recebido, variação líquida de PokéCash, mudança de tier/progresso, LP e uma observação comprovável pelo log. Exemplo: “Seu Lapras acertou 3 golpes superefetivos”. Uma recomendação de troca exige dados suficientes; não inventar uma causalidade a partir de uma única derrota.
