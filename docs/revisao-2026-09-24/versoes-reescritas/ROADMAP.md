# Roadmap único — revisão 24/09/2026

Esta é a fila normativa do planejamento revisado. O ZIP contém documentos; todos os estados de código abaixo são **reportados pelo histórico**, até confirmação em M0. Uma tarefa só é concluída com comportamento demonstrado na versão identificada.

## Estado de partida

- 1.27f/T9/T10/T13/T11a aparecem como encerrados em `RETOMAR.md` de 16/09. Não reiniciar o cartão 1.27f por causa de um cabeçalho antigo.
- O arquivo mais recente de próximo bloco aponta 1.33: influência de período/clima sobre elenco. Não há evidência de implementação desse bloco no pacote.
- Ferramentas ficam congeladas, salvo impedimento concreto a uma entrega do produto. Números de Q1/Q2 e duração de suítes são registros históricos, não validação desta revisão.
- RMT continua na visão de produto, sujeito a decisões e gates; não foi descartado nem autorizado para lançamento por esta revisão.

## Fila e marcos

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

## BASE-01: confirmar antes de ampliar

Entregar `ESTADO_CONFIRMADO.md` no repositório real com commit e data. Abrir aplicação por um caminho de usuário, iniciar uma run, observar uma recompensa e retomar após refresh. Verificar 40 s, seed opaca, limites 30/36/50, ondas, stamina, formas capturadas e estado de 1.27f. Extrair contratos reais e identificar divergências com este plano. Confirmar se as rotas/campos propostos já existem.

Executar somente verificações pertinentes à baseline. Se o harness não consegue abrir a run (L-174), corrigir esse impedimento para observar o produto; não transformar BASE-01 em reconstrução completa do harness. A ausência de código no ZIP é um requisito de entrada para execução, não um defeito do jogo.

Se BASE-01 reproduzir perda/duplicação de saldo, quebra de posse ou impossibilidade de completar a jornada, antecipar a correção correspondente de INT-01/INT-02/UX-01 antes de PROD-133. Registrar a mudança e sua evidência na fila; não avançar uma funcionalidade cosmética sobre uma base inutilizável.

## PROD-133 e PROD-134

Usar [PROXIMO_BLOCO_1.33.md](PROXIMO_BLOCO_1.33.md). Separar a resolução pura do elenco e sua explicação visual, mas não declarar a funcionalidade entregue antes da integração. O antigo desejo de “preview sempre exato” conflita com clima oculto: a proposta é mostrar possibilidades antes da criação e elenco efetivo depois. Se o dono preferir revelar o clima antes, registrar DEC-10 e alterar as duas regras juntas.

## INT-01: economia que não duplica

Confirmar L-159 (Estilhaço no baú), reservas compartilhadas Avanço/OFF, liberações em falha/cancelamento e faucets após o limite de capturas. Construir mapa real de XP, moedas, fragmentos e itens por hora/conta. Testar dois resgates simultâneos e retry após commit sem resposta. Evidência exigida: um único crédito e saldo reconciliado. Não adicionar um faucet apenas porque existe um botão ou nome no documento antigo.

DEC-08/09 precisam de decisão de produto se o código contrariar o texto mais recente; registrar opção e impacto, não mudar a regra silenciosamente. Corrigir o risco econômico antes de calibrar a quantidade ideal de recompensas.

## INT-02: uma posse confiável

Verificar a situação de `pa.cosmeticos.v1` e `pa.outfit.v1` e da persistência no servidor. Local storage pode guardar preferência de exibição, não ser autoridade para um item adquirido. Uma compra é atômica com a posse; tentativa repetida não cobra de novo. Equipar exige posse. Testar outra sessão/dispositivo e reconexão. As nove outfits sem oferta (L-158) continuam pausadas até a decisão correspondente; não transformar inventário de arte em obrigação de vender tudo.

## UX-01: correções orientadas ao jogador

Triagem inicial, sujeita a reprodução: L-171 (cast/projétil), L-172 (sobreposição de dano), L-175 e D-082 (câmera/banner), L-176 (áudio/vídeo ausentes), L-160 (IDs crus). Priorizar o que impede entender uma ação, ler um resultado ou completar a jornada. Fotos/snapshots de componentes isolados não substituem a run real.

Não reabrir automaticamente os diffs de arena abandonados em D-099/D-104. Usar asserções e revisão visual adequadas ao comportamento dinâmico. Baseline visual ausente precisa falhar de forma explicada ou marcar a comparação como não executada; não aprovar um clone limpo sem comparação por acidente (D-093).

## Backlog condicionado, sem perda da visão

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

## Política de mudanças e encerramento

Um item ativo contém objetivo, dependências, fora de escopo, critérios de aceite e evidência. “Passou no teste” não basta se o teste nunca atravessou o comportamento. “Pareceu funcionar” não basta para saldo, seed ou concorrência. Dois ciclos de infraestrutura sem avanço exigem reduzir o problema e registrar impedimento, não abrir outra trilha automaticamente.

No fechamento, atualizar somente o estado corrente, o ticket e as decisões afetadas. O histórico fica intacto. Nunca manter uma segunda lista de “próximo passo” em um documento concorrente.
