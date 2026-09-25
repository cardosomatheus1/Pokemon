# PokéArena — planejamento revisado

**Revisão documental 2.0 · 24/09/2026 (America/Bahia)**

O próximo trabalho de produto é **1.33 — elenco por período e clima**, precedido por uma conferência curta do repositório. O cartão 1.27f está **relatado como concluído em 16/09**; não deve ser reconstruído com base na passagem de 13/09. T11 e os demais aperfeiçoamentos do ferramental não voltam à frente da fila sem bloqueio demonstrado.

Esta entrega revisa o planejamento. O ZIP recebido contém 27 documentos, mas não contém código, banco, imagens do produto, logs de execução nem os simuladores citados. Por isso, “relatado como concluído” não significa “validado nesta revisão”. As novas propostas estão identificadas; nenhuma delas foi aplicada ao jogo, publicada ou monetizada.

## Leitura recomendada

| Necessidade | Documento |
|---|---|
| Entender o parecer e as mudanças principais | [Relatório da revisão](revisado/00_RELATORIO_DA_REVISAO.md) |
| Entender produto, escopo e marcos | [Plano mestre](revisado/01_PLANO_MESTRE.md) |
| Saber as regras de jogo consolidadas | [Especificação](revisado/02_ESPECIFICACAO.md) |
| Conferir moedas, odds, receitas e RMT | [Economia e negócio](revisado/03_ECONOMIA_E_NEGOCIO.md) |
| Implementar com contratos e recuperação | [Arquitetura e API](revisado/04_ARQUITETURA_E_API.md) |
| Saber o que fazer e em que ordem | [Roadmap e blocos](ROADMAP.md) |
| Começar a próxima entrega | [Bloco 1.33](PROXIMO_BLOCO_1.33.md) |
| Ver decisões que ainda não estão fechadas | [Registro de decisões](revisado/05_DECISOES.md) |
| Validar a qualidade e o produto | [Plano de validação](revisado/06_VALIDACAO.md) |
| Trabalhar sem perder contexto | [Instruções do projeto](CLAUDE.md) |
| Conferir o destino dos 27 arquivos | [Reconciliação documental](revisado/07_RECONCILIACAO.md) |
| Consultar todas as fichas antigas | [Inventário de registros](revisado/08_REGISTROS_LEGADOS.md) |
| Auditar contas e editar cenários hipotéticos | [Cálculos e modelo](support/revisao/CALCULOS_CONFERIDOS.md) |
| Conferir fontes externas e seus limites | [Fontes](revisado/09_FONTES.md) |

## Qual documento decide o quê

1. A instrução atual do dono prevalece sobre decisões históricas.
2. A especificação revisada define o comportamento-alvo, com exceções explicitamente vinculadas a decisões pendentes.
3. Economia e arquitetura detalham os contratos do seu domínio.
4. `ROADMAP.md` é a única fila de execução; `RETOMAR.md` é o único estado operacional de retomada.
5. `CLAUDE.md` define o método, sem redefinir economia ou produto.
6. `historico/original_recebido/` preserva os 27 arquivos originais, byte a byte, para rastreabilidade. Seu conteúdo não constitui uma segunda fila vigente.

Os nomes antigos permanecem como atalhos para a documentação consolidada. Os rótulos V1/V2/V3 e 1.xx são referências históricas, não prova de que uma etapa de validação foi cumprida.

## Como levar esta revisão ao repositório

Criar uma branch documental, copiar o pacote para uma pasta de revisão e ler os documentos acima. Em seguida, aplicar a consolidação em `docs/`, ajustando caminhos relativos e preservando o histórico. Conferir o estado real antes de substituir o `CLAUDE.md` ativo do repositório. Não copiar a pasta inteira por cima de código ou assets, nem converter os novos desenhos econômicos em migrações automáticas.

Comando de retomada sugerido: **“Leia COMECE_AQUI.md, RETOMAR.md, ROADMAP.md e PROXIMO_BLOCO_1.33.md; confira o repositório e execute somente o primeiro bloco pronto.”**
