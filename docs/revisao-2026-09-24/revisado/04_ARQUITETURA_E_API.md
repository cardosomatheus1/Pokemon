# Arquitetura, contratos e operação

Revisão documental — 24/09/2026. Este documento define requisitos; não certifica o código existente. Nomes de módulos citados no histórico precisam ser localizados no checkout real em M0.

## 1. Direção técnica

Preservar JavaScript/ESM, Node, HTTP nativo, SQLite e a separação de camadas 0–4 documentada. Não há justificativa demonstrada para trocar de stack, adicionar microserviços ou reescrever o harness. A regra de zero dependências de produção permanece uma restrição do projeto. Se ela impedir um requisito relevante, registrar custo e decisão antes de alterá-la; não construir parsers ou criptografia improvisados para contorná-la.

| Responsabilidade | Regra de fronteira | Evidência de conformidade |
|---|---|---|
| Engine | Funções determinísticas; recebe dados e contexto explícitos; não conhece Pokémon, HTTP, DOM ou SQLite | Fixtures com entrada, versão e resultado reproduzíveis |
| Content pack | Espécies, biomas, tipos, raridades, evoluções, assets e modificadores | Validador de referências, elegibilidade e recursos existentes |
| Aplicação | Orquestra comandos, autenticação, reservas, ledger e idempotência | Testes de transações e concorrência |
| Persistência | Guarda fatos, versões e invariantes duráveis | Constraints, recuperação e migração testadas |
| Interface | Renderiza estado e envia intenção; não decide recompensa nem tempo de servidor | Jornada real, reconexão, abas concorrentes e acessibilidade |

O limite histórico de 600 linhas é um alerta de coesão, não uma razão para fragmentar funções acopladas em arquivos sem responsabilidade. Dependências entre camadas devem ser verificáveis sem um novo analisador lexical artesanal.

Fixar a versão validada do Node e do navegador de automação no repositório. Não adotar automaticamente a versão mais recente da documentação consultada. `DatabaseSync` é síncrono: consultas longas, migrações e Monte Carlo não podem monopolizar o processo que aceita comandos temporizados. Medir o atraso do event loop. Se necessário, usar worker para CPU e acesso ao banco com transações curtas; não introduzir distribuição sem medição.

## 2. Estado autoritativo e relógio

Todos os comandos usam `serverNow`, obtido uma vez por operação. O cliente pode mostrar uma contagem regressiva aproximada, mas não autorizar ações. A aceitação de aposta precisa verificar **fase aberta e `serverNow < closeAt` dentro da transação**. Atraso do agendador não amplia a janela.

Arena: preparar → abrir → bloquear → resolver → liquidar → publicar. Falhas preservam a última transição durável e permitem retomada idempotente. A publicação por SSE pode repetir; a liquidação financeira, não. Se o resultado não puder ser validado, aplicar política explícita de anulação e estorno, sem escolher resultado alternativo depois de conhecer as apostas.

Avanço/OFF: criado → ativo → concluído/cancelado conforme regras → resgatado. Consultar uma run atualiza sua projeção pelo tempo de servidor; abrir a tela não cria uma nova recompensa. O resultado deve ser o mesmo após refresh, desconexão ou reinício. Salvar o identificador de versão da regra que rege aquela run.

## 3. Contrato da API

Não renomear endpoints existentes com base neste documento. M0 deve extrair a API real e comparar com o `API.md` histórico. A tabela abaixo define o contrato desejado; nomes de campos ainda precisam ser conciliados com a implementação.

| Área | Decisão da revisão | Verificação de migração |
|---|---|---|
| Janela da arena | 40 s conforme decisões mais recentes; remover descrição antiga de 30 s | Relógio servido e testes na fronteira; confirmar configuração real |
| Seed raiz | Material opaco com 128 bits conforme correção F1.15 reportada; nunca truncar em `uint32` no contrato | Confirmar serialização real antes de fixar tamanho/formato público; testar round-trip sem perda |
| Ramos aleatórios | Derivação determinística com rótulos e versões separados | Não reutilizar o mesmo ramo para roster, clima, drop e combate |
| Versão | Tornar explícita em requests/respostas e snapshots | Rejeitar versão incompatível com erro útil; documentar janela de compatibilidade |
| Streaming | Se `x-api-versao` for obrigatório, cliente de streaming por `fetch` que possa enviá-lo | `EventSource` nativo não recebe cabeçalhos arbitrários no construtor; não prometer essa combinação |
| Idempotência | Chave por ator + operação, vinculada ao hash canônico do request | Repetição idêntica devolve mesmo resultado; corpo diferente com mesma chave gera conflito |
| Tempo | UTC no transporte; duração e limites decididos pelo servidor | Mudança de relógio/fuso do cliente não altera elegibilidade |
| Erros | Código estável, mensagem compreensível, `requestId` e indicação de possibilidade de repetir | Não expor stack, seed oculta ou dados de outra conta |

Envelope sugerido para erros: `{ code, message, requestId, retryable }`. É proposta de padronização, não declaração de endpoint existente. A chave de idempotência não substitui autenticação nem bloqueio de saldo concorrente. Sua retenção precisa cobrir a janela máxima de repetição de cada operação; eventos econômicos permanecem únicos independentemente de expiração do cache de respostas.

Para SSE: IDs monotônicos no escopo do stream, reconexão com último evento confirmado e fallback para snapshot completo se o histórico tiver expirado. Garantia: entrega pelo menos uma vez + aplicação idempotente. Evitar anunciar “exatamente uma vez” na rede. O cliente com `fetch` precisa implementar reconexão, parsing e cancelamento de forma pequena e testada, ou a equipe deve decidir outro contrato compatível.

## 4. Ledger e inventário

Representar unidades monetárias em inteiros na menor unidade definida; proibir floats como saldo contábil. Manter lançamentos append-only, com `eventId`, causa, origem, conta, quantidade, versão e correlação. Correções usam lançamentos compensatórios, nunca edição retroativa silenciosa. Uma transferência deve conservar a soma entre contas apropriadas; faucets e sinks usam contrapartidas identificáveis.

Sequência atômica de um comando econômico:

1. Autenticar e autorizar o ator; validar versão, payload e chave.
2. Abrir transação e procurar resultado idempotente anterior.
3. Validar prazo, estado, saldo disponível, reservas e permissões de uso.
4. Aplicar débitos, créditos e alteração de inventário na mesma transação.
5. Registrar resultado e evento de saída durável; confirmar a transação.
6. Publicar evento; falha de publicação será repetida sem recriar os lançamentos.

Constraints: evento econômico único; item possuído por uma conta por vez; item em escrow não equipável, vendável ou consumível por outra operação; saldo disponível não negativo; recompensa de run única. SQLite serializa escritores, mas isso não dispensa constraints nem tratamento de `busy` e falhas de processo. Repetir transação inteira com limite quando seguro, não apenas uma instrução intermediária.

Separar três dimensões: origem do recurso, disponibilidade e usos permitidos. “Ganho” não prova que o recurso é gratuito se foi produzido por entrada comprada. Não fazer migração que converta automaticamente saldo pago em saldo apto a comprar poder. A matriz proposta está em [economia](03_ECONOMIA_E_NEGOCIO.md).

## 5. Snapshots e aleatoriedade

Registrar por partida/run, conforme necessidade: `engineVersion`, `contentVersion`, `resolverVersion`, instante inicial, parâmetros, compromissos e resultados. Campos são requisitos lógicos; M0 verificará nomes e o formato existente. Derivar o roster sem gravá-lo integralmente, como prevê 1.33, só funciona se versões antigas continuarem reproduzíveis. Não editar o content pack de uma run em andamento sem uma política de compatibilidade.

Commit–reveal comprova que um valor revelado corresponde ao compromisso publicado. Isoladamente, não prova ausência de seleção antecipada de seeds pelo operador. Definir separadamente a ameaça, a entropia, a publicação antes do fechamento, a possibilidade de omissão e a verificação pelo cliente. A correção de seed de 32 para 128 bits é reportada como concluída; sua confirmação deve ser feita em M0, sem tratá-la automaticamente como defeito ainda aberto.

Dados secretos não podem aparecer em preview, logs públicos, erros, cache público ou telemetria do cliente. Replays públicos devem revelar somente o que a política da rodada permite naquele momento.

## 6. Segurança e abuso proporcionais ao produto

Sessões e autorização são do servidor. Se usar cookies, definir flags adequadas ao ambiente e proteção CSRF para comandos; se usar tokens, definir armazenamento, expiração e rotação. Não escolher dois modelos simultaneamente por inércia. Validar origem/CORS explicitamente. Rate limits por conta e operação complementam limites por IP; NAT não equivale a fraude.

Prioridades: impedir resgate duplo, duplicação de item, gasto concorrente, previsão indevida de resultado, repetição de comando antigo e acesso entre contas. Para mercado futuro, acrescentar escrow, wash trading, conta comprometida, reversões e origem de fundos. RMT só entra em produção após DEC-01/02/03 e os gates econômicos, operacionais e jurídicos; um feature flag não resolve esses requisitos.

## 7. Assets e interface

Usar o asset decidido pelo projeto. Referência quebrada requer localizar a origem, corrigir o caminho ou registrar impedimento. Não substituir silenciosamente espécie, áudio ou estética. A validação de conteúdo deve detectar recursos ausentes antes do build; pedidos reais no navegador confirmam que os caminhos funcionam no deploy.

O histórico cita `battle-theme.mp3` e `lojas.mp4` ausentes. Verificar primeiro se L-176 ainda reproduz. Preservar disposição para toque, foco visível, informação além de cor, mute e preferências de movimento. Implementação de controles de pausa deve respeitar a função da animação e os critérios aplicáveis, sem declarar toda animação irregular.

## 8. Operação, release e recuperação

| Momento | Evidência mínima |
|---|---|
| Antes de publicar | Migração aplicada numa cópia representativa; integridade do ledger/inventário; assets resolvidos; jornada crítica; procedimento de rollback |
| Durante | Erros por comando, latência p50/p95/p99, atraso de event loop, filas de liquidação, divergências de ledger e disponibilidade |
| Após | Smoke de conta nova e existente, retomada de run e reconexão; monitorar regressões por versão |
| Recuperação | Restaurar backup em ambiente isolado e reconciliar eventos; comprovar que reprocessamento não duplica crédito |

Meta operacional inicial proposta para piloto: nenhum lançamento duplicado e nenhuma divergência contábil; alertar toda falha de liquidação que ultrapasse duas janelas normais do sistema. Latência aceitável precisa ser definida depois do benchmark em M0 e em função do prazo de aposta. Não transformar números históricos de notebook em SLA de produção.

Backup sem restauração testada não é evidência de recuperabilidade. Definir RPO/RTO antes de beta com economia persistente, considerando o tamanho real do banco e as janelas de indisponibilidade aceitáveis. Rollback de aplicação não deve apagar lançamentos já confirmados; migrações destrutivas exigem plano específico.

## 9. Entrega de M0

Produzir um inventário curto: commit, runtime, banco/schema, contratos reais, versão do motor/conteúdo, flags, jornada funcional, defeitos reproduzidos e tempos medidos. Cada divergência documental recebe decisão ou tarefa. Este inventário substitui inferências baseadas em contagens antigas de testes.
