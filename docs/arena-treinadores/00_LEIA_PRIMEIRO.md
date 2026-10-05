# PokéArena — qualidade do jogo e Arena de Treinadores

Pacote complementar incorporado ao repositório em 04/10/2026. O contrato
aplicado está em [09_CONTRATO_DA_IMPLEMENTACAO.md](09_CONTRATO_DA_IMPLEMENTACAO.md).
A Spec Master §§8.17/9.17 é normativa. O estado vivo permanece em
`docs/RETOMAR.md`; a única fila é `docs/ROADMAP.md`.

A Jornada prepara o jogador para competir com seis Pokémon próprios após
vencer a Liga e o Campeão. O ranked começa em Bronze, com 50 PokéCash por
jogador, e a casa recebe 10% do pote. Captura, treino, evolução e negociação
melhoram o time que participa do combate. A Arena comum mantém seu motor.

| Documento | Uso |
|---|---|
| [01_PRODUTO_E_COMBATE.md](01_PRODUTO_E_COMBATE.md) | Desenho do endgame, ranks e ciclo de progressão. |
| [02_ECONOMIA_MARKETING_E_MONETIZACAO.md](02_ECONOMIA_MARKETING_E_MONETIZACAO.md) | Propostas econômicas e de aquisição. |
| [03_ARQUITETURA_E_CONTRATOS.md](03_ARQUITETURA_E_CONTRATOS.md) | Mapeamento da base e contratos propostos. |
| [04_STORIES_DE_IMPLEMENTACAO.md](04_STORIES_DE_IMPLEMENTACAO.md) | Fichas AT6 incorporadas ao plano canônico. |
| [05_VALIDACAO_E_METRICAS.md](05_VALIDACAO_E_METRICAS.md) | Protocolo de experimentos e liberação gradual. |
| [06_QUALIDADE_DO_JOGO_E_JORNADA.md](06_QUALIDADE_DO_JOGO_E_JORNADA.md) | Fichas GQ de entrada, captura, evolução e retorno. |
| [07_TAXA_DA_CASA_E_TESOURARIA.md](07_TAXA_DA_CASA_E_TESOURARIA.md) | Desenho financeiro dos 10% e uso promocional. |
| [08_ESTUDO_DO_MOTOR_E_BALANCEAMENTO.md](08_ESTUDO_DO_MOTOR_E_BALANCEAMENTO.md) | Auditoria histórica dos motores e estudo de 932 mil combates. |
| [09_CONTRATO_DA_IMPLEMENTACAO.md](09_CONTRATO_DA_IMPLEMENTACAO.md) | Regras efetivamente aplicadas, limites e reprodução. |

## Evidência e versões

Os documentos 01–08 registram propostas e análises de 03/10/2026 na base
`f6fe58ffb739ebb42d584f0d827e8d1984b14738`. São contexto histórico, não uma
lista de funcionalidades entregues. Em caso de divergência, prevalecem a
Spec atual e o contrato 09. As fichas GQ e as melhorias de interface/mercado
não são automaticamente concluídas pelo bloco principal.

A implementação AT6-base parte de
`82e47f8e4f96eb0372cd9d54de52062705ffc92a`, na branch
`codex/arena-completa-20261004`. Seus relatórios são:

- `VALIDACAO_FOCADA.json`: recorte de testes das superfícies alteradas;
- `SABOTAGEM_FOCADA.json`: falhas plantadas e capturadas em cópias isoladas;
- `BALANCEAMENTO_TBE4.json`: 40 mil combates novos em quatro formações;
- `estudo/`: script, resultados e verificação do baseline histórico.

A iniciativa variável reduz alguns degraus, mas IVs e composição ainda podem
produzir diferenças grandes. Por isso o ranked estima cada par com o motor
real antes de aceitar a aposta. Isso é um filtro de piloto, não certificação
de todo o metagame. Sem adversário elegível, não há cobrança.

Não tratar os relatórios focados como suíte integral, inspeção visual ou
validação de produção. O Avanço ainda precisa da adaptação AT6-13 para HP e
golpes reais; suas regras de emissão existentes foram preservadas.
