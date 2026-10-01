# PokéArena — SPEC E14: Shiny, Trading & Player Market

**Documento:** SPEC-E14-001 · revisão 3.0 · 28/09/2026  
**Status:** revisado para implementação; esta revisão não implementou funcionalidades no jogo.  
**Base técnica correta:** [cardosomatheus1/Pokemon — branch de trabalho](https://github.com/cardosomatheus1/Pokemon/tree/claude/docs-planning-tests-6hjthq), commit auditado `01071f45755078085062ca4a6dc6160f7b77fb23` (28/09/2026).  
**Execução:** `E14_IMPLEMENTATION_STORIES.md`, revisão 3.0.  
**Convenção:** “atual” descreve o commit inspecionado; “deve” define o comportamento a construir. Baselines são propostas para piloto, não números já validados.

## 1. Errata da auditoria e cruzamento com a branch correta

**As revisões 2.0/2.1 usaram a branch errada para avaliar o desenvolvimento atual.** Seus achados técnicos e caminhos de implementação ficam substituídos pelo cruzamento abaixo. Não basta trocar o SHA do cabeçalho: backend de coleção, captura, composição da carteira, Liga e flags já evoluíram.

A comparação oficial do GitHub entre `534ee7716defb57121455df7fbed5a78a59d2e04` e `01071f45755078085062ca4a6dc6160f7b77fb23` retornou **130 commits à frente, 1 atrás, status `diverged`**, com merge-base `0b8e0c3f7b1440271565b373c8d1d516f99e071b`. Portanto, a base anterior não deve ser tratada como ancestral linear completo. Esta revisão fixa o segundo SHA; mudanças posteriores exigem novo diff.

### 1.1 Achados anteriores reclassificados

| Achado anterior | Situação na branch auditada | Evidência atual e consequência |
|---|---|---|
| Não há rotas HTTP da coleção/idle | **Retirado** | `server/colecao-rotas.mjs:OPERACOES_DO_IDLE`, `colecaoDe`, `rotasDaColecao`; `GET /api/idle`, captura, caixa, foco, golpes, evolução, doce, run e jornada já têm rotas |
| Captura exposta aceita dex/raridade sem encontro | **Retirado para o caminho HTTP atual** | `POST /api/idle/lancar` chama `server/idle.mjs:lancarPendente`; exige chave + usuário, resolve uma vez e debita/cria na mesma transação. O helper antigo `lancar` continua interno; não é a rota pública |
| É necessário criar encontros persistidos do zero | **Retirado** | `encontros_pendentes` já guarda expedição/Avanço, chave e resolução. Estender essa tabela para shiny, origem detalhada e recibo recuperável |
| A carteira não suporta transação externa | **Retirado** | `server/carteira.mjs:emTransacao` e `abrirTx` usam marcador + SAVEPOINT; `server/mercado.mjs` já liquida múltiplos participantes atomicamente. Reutilizar a API correta, não abrir BEGIN manual e concluir que falta suporte |
| Não há flags | **Retirado** | `engine/feature-flags.mjs` + `server/feature-flags.mjs`: catálogo, checkpoint, persistência, admin e auditoria já implementados em ST-11.9 |
| Liga é somente de previsão | **Retirado** | `server/equipe.mjs`, `partida.mjs`, `liga-mmr.mjs`, `temporada.mjs` implementam snapshots, combate assíncrono, MMR, matchmaking e temporadas. Telas ST-11.6/11.7 continuam pendentes no RETOMAR |
| Não há antifraude de captura/anti-win-trading | **Retirado** | `server/antifraude.mjs` + `engine/antifraude.mjs` e `engine/integridade-liga.mjs`/`server/partida.mjs`; ST-13.6 e ST-11.8 já existem. Acrescentar risco de comércio, sem refazer tudo |
| É preciso criar `server/mercado.mjs` | **Retirado: colisão de domínio** | Arquivo existente é o bolo mútuo da Arena, com `abates`, `podio`, `duracao`, rotas `/api/mercado` e ledger `MARKET_*`. Não é o Market de ativos. Criar `server/mercado-jogadores.mjs` com namespace próprio |
| Toda a experiência da conta já abandonou save local | **Ainda não** | ST-13.1–13.3 e ST-13.7 estão construídas; ST-13.4 (migração) e ST-13.5 (cliente conectado) seguem pendentes em `docs/PLANO_DE_IMPLEMENTACAO.md`/`RETOMAR.md`. Reutilizar E13 e concluir a ponte |
| `comprado` ausente no schema é um P0 sem contexto | **Reclassificado** | Diferença existe, mas ST-4.5 foi explicitamente adiada porque não há fonte server-side de compra. E14 recusa `comprado`; não precisa antecipar migração de pagamento real |
| Bônus inicial entra no saldo transferível | **Confirmado** | `server/rotas.mjs`, cadastro, ainda credita `WELCOME_GRANT` em `transferivel`. Corrigir conforme DEC-E14-001, regra do usuário já estabelecida |
| Shiny verdadeiro, Master Ball e comércio de ativos já estariam prontos | **Não identificados no código inspecionado** | Não há atributo shiny na instância/encontro nem capacidade Master Ball nos caminhos de captura examinados; não foram encontrados listings/escrow P2P de ativos. Continuam incrementos E14 |
| Ledger/painel já distinguem transferências futuras de emissão | **Adaptação necessária** | `server/admin.mjs:painelEconomico` soma entradas/saídas por sinal; `reconciliarNoBanco` conhece perdas/reservas de aposta e bolo. Estender sem alterar semântica histórica |
| Testes ainda dependem do mesmo gate antigo | **Retirado** | T14 já introduziu executor paralelo e `sabotagem:bloco`; `portoes` usa Q2 do bloco e `portoes:tag` usa completo. Não reintroduzir custo do fluxo antigo |

### 1.2 Lacunas incrementais relevantes para a E14

- Captura já impede repetição de efeito, mas `lancarPendente` não guarda o recibo completo para devolver o mesmo resultado após timeout: a repetição é recusada. Melhorar recuperação, sem chamar o mecanismo atual de captura ilimitada.
- `bolsa` e `species_candy` têm saldos agregados; `candy_ledger` já existe. Acrescentar proveniência dos insumos e sua relação com apostas/recompensas, sem duplicar os livros existentes.
- `team_snapshots` são imutáveis; criação valida posse. Antes de novas partidas, a futura transferência exige validar que os IDs do snapshot ainda pertencem ao jogador. Replay de partida já criada permanece histórico.
- `server/antifraude.mjs:varrerSuspeitas` conta capturas pelo `criaturas.user_id` atual. Com comércio, isso atribuiria captura ao comprador e retiraria do vendedor. Contar emissão pelo capturador original/evento imutável, incluindo criatura depois solta.
- `server/colecao.mjs:soltarNaConta` apaga a criatura e credita doce. Com ownership history, criar política de baixa/tombstone e linhagem do doce para preservar auditoria; não permitir que soltar lave origem.
- Flags E14 devem compor `p2p_transfer_enabled` e o checkpoint existente. Não criar flag nova capaz de contorná-los, inclusive em permuta sem PC-T.

### 1.3 Verificação desta revisão

Executadas **16 suítes existentes, 122/122 testes aprovados**, no SHA correto: carteira-servidor, captura, colecao-servidor, colecao-ops, colheita-rotas, run-servidor, run-rotas, jornada-servidor, equipe-snapshot, liga-partida, liga-mmr, liga-integridade, feature-flags, mercado-servidor, mercado-liquidacao e antifraude.

Sondas adicionais em SQLite em memória confirmaram: encontro inexistente retorna `IDLE_SEM_ENCONTRO`; rotas de leitura/captura registradas; crédito dentro de `emTransacao` é revertido junto com falha da operação externa. Conferidos também buckets e catálogo de flags. Não foi executada suíte completa, Q2 nem benchmark do Market futuro. Os 70 testes da revisão anterior não servem como evidência da branch atual.

## 2. Objetivo e entregas

Loop: jogar → encontrar → escolher Ball → capturar uma instância → usar/evoluir → trocar/anunciar → reinvestir PC-T em ativos de outros jogadores.

| Etapa | Entrega jogável | Gate |
|---|---|---|
| A | Coleção conectada, encontros persistidos, shiny verdadeiro e Master Ball | Autoridade, proveniência, captura e migração verificadas |
| B | Troca direta de criaturas, itens e PC-T | Reservas, revisão de oferta, ledger, taxas e recuperação prontos |
| C | Market a preço fixo: uma criatura ou lote fechado de itens | Concorrência, busca, expiração e UX verificadas |
| D | Buy orders de itens e fills parciais; depois buy orders de Pokémon | Etapa C estável e necessidade demonstrada por dados |

A–C não dependem de Exchange, novos modos de Liga ou cash-out. Sem fonte aprovada de PC-T elegível, entregar a coleção e manter comércio monetário desabilitado. Permutas também dependem de `p2p_transfer_enabled` e do checkpoint vigente: ausência de moeda não autoriza contornar o gate. Validar serviços em testes isolados, sem alterar `CHECKPOINT_25_1` ou promover saldos de teste a produção.

Fora: saque, moeda fiduciária, NFT/blockchain, breeding, aluguel, empréstimos, venda de conta, leilão, preço oficial de criatura, bônus pago de shiny e implementação de Balls situacionais. Capacidades futuras podem ser suportadas pelo catálogo sem entrar no escopo agora.

## 3. Princípios inegociáveis

1. `is_shiny` pertence à instância, nasce de encontro elegível gerado pelo servidor e persiste com evolução e proprietário. Não aumenta stats, IV, potencial, XP ou chance de captura.
2. Normal e shiny equivalentes têm a mesma chance de captura. Refresh/reconexão não rerrolam encontro, atributos ou resultado latente da captura.
3. Um encontro permite **uma tentativa válida**. Falha consome Ball e encerra encontro. Erro de validação não consome nada; erro técnico aborta a transação; timeout exige recuperar a mesma operação.
4. Todo ativo transferível tem origem verificável. Revenda, evolução, crafting e captura não removem restrições de proveniência.
5. Somente PC-T elegível no bucket `transferivel` liquida P2P. O nome do bucket sozinho não prova origem. `bonus`, `competitivo`, `pendente`, `comprado` e moedas PvE são recusados, inclusive para taxas.
6. Cosmético de progressão vira aura/moldura/efeito de prestígio; não aplica sprite, paleta ou selo de shiny verdadeiro a criatura normal.
7. Nenhuma flag E14 habilita pagamento real, saque ou conversão implícita. Checkpoints já existentes no projeto continuam valendo.
8. Posse de shiny não altera odds, força ou sorteio da Arena de apostas. Arena normalizada e combate de instância pessoal são contextos distintos.

## 4. Autoridade, migração e conversão indireta

### 4.1 Coleção

**Reutilização obrigatória:** `server/colecao-rotas.mjs`, `server/colecao.mjs`, `server/idle.mjs`, `server/run.mjs`, `server/jornada.mjs` e os contratos E13 existentes. ST-14.0D complementa ST-13.4/13.5; não é uma nova implementação paralela dessas stories. A decisão de importação do acervo local segue pendente no planejamento atual; este documento define elegibilidade econômica e não executa ou aprova uma migração destrutiva.

Estender `criaturas` e integrar `bolsa`; `pokemon_instance_id` da proposta é o atual `criaturas.id`. A API pode usar `instance_id` com mapeamento explícito. Identificação de espécie/item inclui `pack_id`; `dex` sozinho não identifica espécie entre packs.

Modo conectado lê estado econômico do servidor. Sem rede, mostra cache desatualizado, mas não captura, evolui, transfere ou credita progresso negociável localmente. Modo local permanece sandbox separado, sem sincronização automática de patrimônio.

Importação de legado é opt-in, idempotente por conta + origem do save + identificador local, com backup e relatório. Hash do arquivo inteiro não basta: pequenas edições não podem autorizar múltiplas importações. Sem prova de emissão, coleção permanece local ou, após política explícita, entra como `legacy_unverified`, bound e incapaz de gerar recompensas transferíveis. Não criar endpoint que aceite livremente inventário/IV/shiny do cliente.

Criaturas antigas do servidor recebem `is_shiny=false`; sem sorteio retroativo. OT só recebe dados verificáveis: proprietário atual pode ser primeiro proprietário conhecido, sem inventar captura histórica. Histórico de backfill usa `migration`, não `capture`. Preservar IDs, atributos, evolução, vínculo, foco, stamina e datas.

### 4.2 Dinheiro

**DEC-E14-001 — Regra já definida pelo proprietário do produto, reafirmada em 28/09/2026:** o bônus de entrada é PC-B, não transferível, desde sua concessão. Isso não é proposta nova, baseline de piloto ou decisão em aberto. O `WELCOME_GRANT` em `transferivel` identificado no código é um defeito de implementação em relação à regra original. Esta revisão corrige os documentos e exige a correção do código; não declara que o código já foi corrigido.

Requisitos obrigatórios da correção:

1. Cadastro concede `WELCOME_GRANT` exclusivamente em `bonus` (PC-B), com zero PC-T decorrente desse evento. Nome do lançamento não substitui a classificação do saldo.
2. Reservar, liberar, cancelar, liquidar ou repetir uma aposta não transforma a parcela originada em PC-B em PC-T. Retorno e ganhos dessa parcela preservam a restrição; apostas com fontes mistas mantêm a composição e atribuem cada parcela ao bucket correto. Nenhuma conversão automática em saldo transferível.
3. Bônus não financia pagamento, reserva ou taxa de trade/Market. Insumos adquiridos com origem promocional não permitem convertê-lo indiretamente em itens ou Pokémon negociáveis, conforme §4.3.
4. Saldos antigos concedidos no bucket errado devem ser identificados e tratados antes de habilitar P2P. Preservar valor/progresso legítimo, registrar reclassificações compensatórias e manter a parcela sem proveniência resolvida inelegível para transferência.
5. A correção só é concluída com regressão cobrindo cadastro, aposta, retorno, cancelamento, tentativa P2P e derivados. Até lá, o defeito permanece aberto, independentemente de a documentação estar corrigida.

Uma eventual Exchange formal continua sujeita ao seu contrato e gate próprios e não pode converter o bônus de entrada em valor transferível. Esta correção não cria nem autoriza uma rota alternativa de conversão do bônus.

- Novos `WELCOME_GRANT` e concessões promocionais nascem em `bonus`.
- Inventariar fontes do ledger. Reclassificação histórica usa lançamentos compensatórios append-only; nunca editar histórico.
- Reexecutar linhagem de concessões/apostas quando houver evidência suficiente. Se não for possível separar saldo contaminado, torná-lo inelegível para P2P até reconciliação; não apagar saldo nem declarar todo `transferivel` como limpo.
- Fonte futura de PC-T precisa de orçamento, versão e evento único. Exchange é responsabilidade do bloco próprio e não se presume implementada.
- `comprado` permanece recusado pelo P2P. ST-4.5/COM-01 conserva a responsabilidade de migrar schema e fontes quando esse bucket for habilitado no servidor. Não reconstruir o ledger só para criar um bucket sem fonte; acrescentar agora testes de rejeição e preservar DEC-03. Não habilitar compra real.

### 4.3 Itens e derivados

`bolsa` agrega quantidades sem origem; `species_candy`/`candy_ledger` já registram doces. Estender ambos os fluxos, mantendo seus livros e vinculando os eventos existentes a lotes/proveniência. Introduzir lotes: `lot_id`, owner, `pack_id`, `item_id`, disponível/reservado, evento de emissão, classe de origem e vínculo. `bolsa` permanece projeção compatível, atualizada na mesma transação. Captura, loja, crafting, evolução, recompensa, trade e Market usam o mesmo serviço de inventário.

Classes mínimas: `verified_earned`, `p2p_verified`, `promotional_bound`, `legacy_unverified`, `test_only`, `admin_review`. Transferência referencia a cadeia anterior e não apaga restrições.

Farm legítimo verificado pode gerar ativos negociáveis: esse é o objetivo do produto. Compra com moeda PvE exige fonte PvE validada no servidor e política de emissão aprovada; não é proibida por definição. A moeda PvE em si continua intransferível.

Separar **restrição de transferência do próprio ativo** de **origem financeira restrita que se propaga**. Pokémon inicial bound por regra de produto não torna todo farm legítimo posterior inegociável. Já Ball/pedra/doce/boost financiado por bônus ou origem não verificada mantém a restrição no derivado: Ball → captura; pedra/doce → evolução/progresso; ingredientes → crafting; soltar → doce. Cada receita/fonte declara a propagação. Recompensa de jogo verificada pode ser elegível quando a política aprovada assim determinar, sem tratar o simples uso do inicial como lavagem. Registrar dependências e avisar antes de aplicar insumo que vincule a criatura. A separação evita que a regra genérica da versão anterior torne toda a economia nascida do inicial permanentemente bound.

Jogador escolhe a classe de origem da Ball/insumo quando houver lotes equivalentes; servidor escolhe o lote mais antigo dessa classe. Mostrar antes a consequência para negociabilidade. Não consumir silenciosamente insumo bound e desvalorizar um shiny. Novas fontes só entram no P2P após provar essas regras ponta a ponta.

## 5. Encontros, shiny e captura

### 5.1 Estender a persistência atual

**Não criar `encounters` em paralelo.** Evoluir `encontros_pendentes`, preservando `chave` como identidade canônica e mantendo as referências `expedicao_id`, `run_id`, `origem` e `resolvido_em`. Na linguagem de produto, `encounter_id` corresponde à `chave` já usada em `/api/idle/lancar`.

Adicionar pack/versão, índice único dentro da fonte quando necessário, nível/snapshot dos atributos, `is_shiny`, classe de proveniência, versão/taxa shiny, expiração se aplicável e resultado completo da captura. A resolução deve distinguir captura, falha, descarte e expiração sem apagar o histórico anterior. Uma fonte não pode emitir a mesma recompensa duas vezes.

`server/idle.mjs:colher` e `server/run.mjs:colherRun` já gravam pendentes e resultados de colheita atomicamente; estender os dois. `engine/colheita.mjs` e a conta de Avanço já compartilhada sustentam paridade. Não criar sorteio alternativo que desalinhe servidor e camada local. Missões ou outras fontes ainda locais só ganham transferibilidade após origem server-side verificável.

`lancarPendente` já valida owner e marca resolução com guarda SQL, debita Ball e cria criatura na transação. A E14 acrescenta atributos imutáveis, proveniência e **retorno do recibo persistido no retry**, mantendo a impossibilidade atual de segunda tentativa. A política de novo Avanço atualmente encerra seus pendentes anteriores; explicitar esse descarte na UI e no estado terminal, sem apagá-lo ao adicionar shiny.

### 5.2 RNG

`lancarPendente` já usa raiz nova do servidor, independente da raiz de colheita publicada. Preservar essa proteção; a auditoria anterior não deveria exigir sua reconstrução como se não existisse. A E14 deve persistir shiny/atributos no encontro e o resultado/versão da tentativa para recuperação auditável.

Separar ramos para adicionar shiny sem deslocar sorteios legados. Usar funções compartilhadas e versão do motor/pack/config. Se for adotado sorteio latente antes da escolha da Ball, mantê-lo secreto e único por encontro, não por chave de request. Nenhuma raiz divulgada pode antecipar resultados abertos. Prova pública de compromisso é extensão futura explicitamente versionada, não pré-requisito inventado para refazer o RNG atual.

D-129 já está registrado no projeto: o lance local converte seed hexadecimal em Number; pertence à ST-13.5. Integrar a correção ao dono existente e impedir que esse caminho local decida patrimônio negociável.

### 5.3 Captura atômica

Preservar `POST /api/idle/lancar` com `chave` e `bola`; acrescentar classe/lote, versão e chave idempotente compatíveis com o contrato. Usuário vem da sessão. Servidor já decide espécie/raridade e resultado; E14 acrescenta shiny/proveniência/recibo. Não criar `/api/encounters/capture` concorrente.

Na mesma transação: validar conta/encontro/prazo → verificar capacidade → selecionar/debitar Ball disponível → resolver resultado persistido → criar criatura e histórico somente no sucesso → encerrar encontro → gravar resposta idempotente e telemetria transacional → commit. Outbox externa só se houver consumidor que a exija. `criaturas.source_encounter_id` é UNIQUE quando preenchido.

Equipe cheia envia à caixa, como hoje no modo local. Se houver limite total, verificá-lo antes do débito: `CAPACITY_EXCEEDED` não perde encontro nem Ball. Fragmento de Pokédex permanece na colheita/encontro; captura, compra e revenda não o duplicam.

### 5.4 Balls e Master Ball

Poké/Great/Ultra preservam multiplicadores e teto atual. Nova capacidade de catálogo `guaranteed_capture=true`, sem nome de franquia hard-coded no motor, retorna chance 1 para encontro capturável válido antes do teto comum. Encontro inexistente, expirado, não capturável ou de outro usuário continua recusado.

Master Ball consome uma unidade por sucesso; retry devolve a mesma captura. Não altera espécie, shiny ou atributos. É negociável por PC-T no Market e em trade quando seu lote é elegível. Não há estoque ilimitado vendido pelo sistema nesta E14.

Fontes candidatas: endgame, temporada/evento ou drop raro. Cada fonte exige orçamento global/por conta, versão e evento único. Não retirar itens já emitidos ao atingir orçamento; recusar novos claims. Emissão promocional ou de teste permanece bound.

## 6. Instância, cosméticos e integração visual

Acrescentar a `criaturas`: `is_shiny`, `source_encounter_id`, espécie/pack de origem, OT verificável e nome público quando conhecido, proveniência, `bound_reason`, locks temporais e versão do registro. Potencial continua derivado dos seis IVs; não criar um segundo valor independente.

Histórico append-only: instância, de/para, tipo `capture|trade|market|migration|admin|release`, operação e data. Owner e histórico mudam na mesma transação. Soltura passa a baixa lógica/tombstone compatível com as leituras da coleção; não apagar prova de emissão/posse. O doce produzido preserva a linhagem relevante. Dados públicos não expõem e-mail, IP, seed ativa ou grafo completo de contas.

Renderização separa catálogo, cosmético e instância. Coleção/PvE/perfil usam `is_shiny` da instância. Arena de apostas só mostra shiny verdadeiro quando há seleção validada de instância própria da mesma espécie; aparência vai para snapshot da rodada. Sem vínculo de instância, sprite normal com eventual aura de prestígio. Resultado/replay usam snapshot, não dono atual após venda; odds/stats não mudam.

A Liga de Previsão continua em `server/liga.mjs`, e a Liga de equipes já existe em `server/equipe.mjs`/`server/partida.mjs`, com MMR e temporada próprios. Estender `app/modules/snapshot-dados.mjs` para registrar aparência shiny sem alterar stats. Transferência não edita snapshot antigo: uma partida já criada continua reproduzível, mas o snapshot deixa de ser elegível para novas partidas se algum ID não pertence mais ao dono ou está em escrow. Revalidar também em `ultimosSnapshots`, desafio direto e matchmaking. Snapshot histórico não mantém um bloqueio eterno sobre o ativo.

Migrar uma vez entitlements e vagas de cosméticos antigos para prestígio por espécie. Remover aplicação de paleta/sprite shiny baseada no perfil. Manter fallback de arte do mesmo pack e selo textual acessível se faltar sprite. Nunca copiar o campo cosmético para `is_shiny`.

## 7. Negociabilidade e reservas

| Ativo | Regra |
|---|---|
| Captura comum/shiny verificada | Negociável se encontro, Ball e demais insumos forem elegíveis |
| Evoluído/recebido | Preserva histórico; aplica cooldown e restrições de novos insumos |
| Inicial, missão, lendário montado | Bound por padrão |
| Essências, materiais, Balls, Master Ball | Por lote e catálogo, somente fontes aprovadas |
| Cosmético de progressão/legado | Não negociável |
| PC-T elegível | Única moeda P2P |
| PC-B, PC-C, Pending, comprado, moeda PvE | Nunca aceitos diretamente |

`asset_holds` é reserva econômica canônica de criaturas, com índice único parcial por instância ativa. Itens podem ter várias reservas de quantidades diferentes; a soma não pode exceder disponível. Não aplicar “um hold por item_id” a fungíveis. PC-T reservado tem operação e origem elegível.

Criatura em expedição/run/equipe competitiva bloqueada não pode entrar no escrow. Depois do hold, recusar evolução, treino que altere ativo, soltura, crafting, envio a expedição, nova listagem e trade. Uso visual de snapshot antigo é permitido. Revalidar owner/versão na liquidação; botão desabilitado não é proteção.

Baseline de teste: captura verificada sem cooldown extra; recebimento P2P com 10 min; uma troca bloqueada por conta; dez anúncios ativos; vinte slots de ativos por lado. Cooldown limita circulação, não valida origem. Maturidade da conta deve usar atividade verificada, não apenas tempo desde cadastro.

## 8. Atomicidade, ledger e idempotência

### 8.1 Reutilizar a transação única existente

Usar `server/carteira.mjs:emTransacao(db, fn)`, que já coordena transação externa e SAVEPOINT das operações da carteira. Não adicionar `server/transacao.mjs` redundante nem validar suporte aninhado abrindo BEGIN manual por fora do contrato.

O novo settlement engloba os dois usuários, reservas, itens, criaturas, taxas, histórico, resposta e eventos. Tratar retorno `{ok:false}` da carteira como falha da operação composta: SAVEPOINT pode reverter só um movimento e devolver recusa sem lançar. O coordenador P2P precisa abortar o conjunto nesse caso. Helpers de coleção/run que abrem BEGIN próprio não devem ser chamados dentro dessa transação sem adaptação controlada.

Continuar com SQLite, FK/CHECK/UNIQUE, versão otimista e transações curtas. Não presumir SELECT FOR UPDATE, realizar rede dentro do commit ou substituir a infraestrutura por sistema distribuído sem medição. Concorrência e rollback do bolo mútuo devem continuar passando.

### 8.2 Ledger

Manter `wallet_ledger` append-only. Adicionar delta explícito de disponível para novos lançamentos e reutilizar `reserva_delta`. Normalizar leitura histórica da convenção de `amount`, inclusive `BET_LOSS`, `MARKET_LOSS`, `BET_RESERVE` e `MARKET_ENTRY_RESERVE`; conferir reconciliação antes/depois. Se ambos os deltas forem zero, omitir lançamento, respeitando `amount<>0` existente.

Tipos novos: `P2P_RESERVE`, `P2P_RELEASE`, `P2P_TRANSFER_OUT`, `P2P_TRANSFER_IN`, `PLAYER_MARKET_LISTING_FEE`, `PLAYER_MARKET_SALE_FEE`, `DIRECT_TRADE_FEE`, `MIGRATION_RECLASSIFY`. Reservar `MARKET_ENTRY_*`, `MARKET_PAYOUT_*` e `MARKET_LOSS` existentes ao bolo mútuo; não reciclar esses tipos para ativos. Todos referenciam operação. Reserva/liberação/transferência não são emissão/queima. Correção administrativa é compensação auditada, não edição de histórico.

```text
Disponível >= 0; reservado >= 0
Soma(disponível + reservado) depois = antes - taxas
Reserva: disponível -H; reservado +H
Cancelamento: disponível +H; reservado -H
Compra sem hold prévio: comprador -P; vendedor +(P-F); burn = F
```

Conciliar ledger com carteira, holds com reservado, lotes com bolsa e histórico com owner. Circulação inclui reservado. Emissão e burn usam classificação semântica, não sinais dos lançamentos.

### 8.3 Operações

`economic_operations`: ID, usuário, tipo, chave, hash canônico do payload, status e resposta HTTP persistida. `UNIQUE(user_id, operation_type, idempotency_key)`. Mesma chave/payload retorna resultado anterior; payload diferente retorna `IDEMPOTENCY_CONFLICT`.

Cliente mantém chave até resultado terminal, inclusive após timeout, e consulta operação. Chaves diferentes também não duplicam: encontro terminal, anúncio vendido e trade liquidado têm constraints/guardas de negócio.

Erros: `INSUFFICIENT_FUNDS`, `INSUFFICIENT_ITEMS`, `ASSET_BOUND`, `ASSET_BUSY`, `NOT_OWNER`, `STALE_REVISION`, `ALREADY_RESOLVED`, `EXPIRED`, `FEATURE_DISABLED`, `ACCOUNT_RESTRICTED`, `CAPACITY_EXCEEDED`, `IDEMPOTENCY_CONFLICT`, `ASSET_COOLDOWN` (com `available_at`) e `ASSET_UNKNOWN` (item que o pack não declara) — os dois últimos acrescentados na ST-14.5, que responde por eles. Recurso privado inacessível pode retornar 404 para evitar enumeração; a política devolve `NOT_OWNER` igual para o inexistente e o de outro.

## 9. Trade direto

Estados: `DRAFT → OFFERED → LOCKED → SETTLED`; terminais alternativos `CANCELLED`, `EXPIRED`, `BLOCKED`. Contraproposta é nova revisão; confirmações A/B são registros separados, não estados mutuamente exclusivos.

1. Criador escolhe contraparte; self-trade recusado. Cada lado altera apenas sua oferta.
2. Toda alteração incrementa `revision` e invalida readiness e confirmações dos dois.
3. Ambos sinalizam prontos para a mesma revisão. Só então reservar atomicamente ativos, PC-T e taxas; entrar em `LOCKED`. Ninguém bloqueia patrimônio de terceiro unilateralmente.
4. Cada participante confirma revisão/hash, prazo e taxas exatas. Confirmação antiga não vale.
5. Segunda confirmação revalida tudo e liquida na mesma transação.
6. Editar após lock libera reservas, volta a `OFFERED`, incrementa revisão e limpa confirmações. Cancelamento/expiração disputam atomicamente com settlement.

Cada lado pode oferecer Pokémon, itens e PC-T. Pelo menos um ativo muda de dono. Doação unilateral é permitida com aceite do destinatário e os mesmos limites/auditoria; duas ofertas vazias são recusadas. Baseline: convite 24 h, lock 5 min, sem extensão indefinida por heartbeat. Falha ao reservar não deixa reserva parcial.

## 10. Market

### 10.1 Etapa C: anúncio de preço fixo

Um anúncio contém uma instância ou lote fechado de um item. Quantidade e preço total imutáveis; editar exige cancelar e anunciar de novo, com taxa explícita. Duração inicial 24 h, sem renovação automática. Estados: `ACTIVE → SOLD|CANCELLED|EXPIRED|BLOCKED`.

Criação reserva ativo e queima taxa atomicamente. Sem saldo para taxa, nada fica reservado. Compra recusa self-buy e valida versão/preço, owner, conta, capacidade e disponibilidade dentro da transação. Dois compradores: um settlement, outro conflito, nunca dois débitos.

Cancelar/expirar libera ativo; taxa de anúncio não retorna. Erro imputável ao sistema pode gerar compensação auditada. Bloqueio por fraude não dá estorno automático nem libera ativo congelado.

### 10.2 Busca e UI

Categorias: Pokémon, Itens, Balls, Materiais, Essências, Minhas ofertas, Minhas compras e Histórico. Busca pelo catálogo, filtros AND, cursor estável e desempate por ID.

Filtros mínimos C: pack/espécie/item, shiny, nível, natureza, potencial derivado e preço; ordenar por preço/data. O DTO atual já expõe golpes/exclusivos: reutilizar esses dados no detalhe. Filtros por golpes exigem projeção/índice e contrato verificável; OT, número de donos e origem usam os incrementos de histórico, sem inventar dados de legado. `exemplar` é atributo separado de shiny.

Card/detalhe: sprite, nome, shiny, nível, natureza, potencial, origem/restrições, quantidade e preço total/unitário. Golpes provenientes do DTO autoritativo e snapshot do anúncio. Vendedor vê taxas e líquido exatos; comprador vê total e saldo elegível. Baseline sem taxa adicional ao comprador.

Estados: sem sessão, carregando, vazio, erro, indisponível, saldo insuficiente, já vendido, desatualizado, cooldown e confirmação pendente. Sem sucesso antes do commit. Informar compra integral de lote fechado.

### 10.3 Etapa D: buy orders e fills

Primeiro itens fungíveis de classe elegível. Quantidade e preço unitário inteiros. Reservar quantidade × limite; taxa de criação 0,5% cobrada separadamente, não reembolsável ao cancelar. Vendedor paga 2% ao executar.

Matching: melhor preço → sequência de criação → ID. Executar ao preço da ordem que já estava no livro, somente com preços cruzados e respeitando limite comprador. Pular self-match deterministicamente, sem consumo. Melhoria de preço libera diferença do hold no mesmo commit. `original = filled + remaining`; cancelar libera só remanescente.

Mínimo de fill proposto: 50 PC de bruto. Não produzir resto inferior a esse mínimo; preencher restante integral quando possível ou não executar. Nunca quantidade fracionária. Taxa acumulada conforme seção 11.

Buy orders de Pokémon entram depois: uma instância por ordem, filtros objetivos, hash de critérios e versão de catálogo. Comprador aceita antecipadamente **qualquer** instância que cumpra todos os critérios. A UI precisa explicar; não exigir aceite adicional depois do settlement. Comprar anúncio segue sendo escolha de instância específica.

## 11. Taxas

PC inteiro, como hoje. Sem introduzir centavos implicitamente. Validar inteiros seguros e limites de produto quantidade × preço; cálculo em basis points com aritmética inteira/BigInt e conversão controlada.

| Parâmetro proposto para piloto | Valor |
|---|---:|
| Taxa anúncio / criação buy order | 50 bps = 0,5% |
| Taxa venda do vendedor | 200 bps = 2% |
| Taxa trade por remetente de PC-T | 100 bps = 1% |
| Mínimo de taxa com base positiva | 1 PC |
| Bruto mínimo anúncio/buy order | 100 PC |
| Quantia mínima por lado monetário no trade | 100 PC |

`fee(gross,bps)=max(1,ceil(gross*bps/10000))` para bruto positivo; `fee(0)=0`. Snapshot de taxas/política por ordem/revisão. Mudança de config não modifica oferta aceita.

| Exemplo | Resultado |
|---|---|
| Anúncio de 1.000 PC | 5 PC para criar; 20 PC ao vender; recebe 980 PC; líquido após anúncio 975 PC |
| Anúncio de 100 PC | 1 + 2 PC de taxas; efetiva total 3%, não 2,5% |
| A envia 1.000 PC em trade | A paga 1.010; B recebe 1.000; burn 10 |
| A envia 1.000 e B envia 400 PC | Taxas 10 e 4; não compensar bases para reduzir taxa |
| Pokémon ↔ Pokémon | Sem taxa monetária ou valuation inventado |

Parcial D: taxa incremental de venda = `fee(bruto_acumulado_depois)-fee(bruto_acumulado_antes)`, por ordem vendedora/política. Não aplicar mínimo novamente em cada fill; delta zero não grava linha monetária. Recibo mostra arredondamento.

100% das taxas queimadas. Menor taxa de trade incentiva sair do Market: escolha consciente, a medir por liquidez/spam/volume. Não criar taxa fictícia de permuta para impedir toda evasão possível.

## 12. Calibração e histórico

```text
Shinies/1.000 jogadores-dia = 1.000 * encontros/dia * taxa_shiny * captura_média
Espécie shiny/jogador-dia = encontros/dia * P(espécie) * taxa_shiny * P(captura|espécie)
P(≥1 shiny capturado em d dias) = 1-(1-taxa_shiny*captura_média)^(encontros/dia*d)
```

Aproximações para encontros independentes/taxas estáveis. Simulador incorpora perfis, escolha de Ball e abandono. Exemplo ilustrativo, **não taxa aprovada**: 30 encontros/dia, shiny 1/2.000 e captura média 40% → 6 shinies/1.000 jogadores-dia; espera média individual ≈167 dias. Média não é garantia/pity; espécie desejada é ainda mais rara.

Sem bônus pago ou ajuste oculto por jogador. Configuração tem versão e vigência futura; encontro preserva taxa original. Produção exige taxa aprovada; staging pode aumentar taxa com ativos `test_only`. Master Ball eleva emissão capturada sem elevar taxa de encontro shiny: calibrar ambas juntas.

Histórico público usa apenas settlements válidos do Market, separados por pack, espécie/item, shiny e faixas de potencial. Normal/shiny nunca se misturam por falta de amostra. Não inferir preço de permuta ou combo.

Mostrar última venda, menor anúncio, mediana 7d, volume 24h/7d e N. Média e maior buy order quando disponíveis. Baseline: agregados exigem ≥10 vendas e ≥5 compradores e ≥5 vendedores distintos; senão “amostra insuficiente”. Excluir teste, admin, anuladas e suspeitas das referências; preservar dados brutos auditáveis. Janela/método explícitos, sem “valor justo”. Quantidade e valor negociado são métricas distintas.

## 13. Antifraude e operação

Antes de B: sessão, autorização, conta/pausa aplicável, rate limit, limites de emissão, proibição self-trade/self-buy, origem, locks, inteiros positivos, suspensão e auditoria. IP compartilhado ou preço fora da mediana não basta para banimento.

Reutilizar `server/antifraude.mjs`, `suspeitas_antifraude`, `contasLigadas` e os sinais existentes da Liga. Alterar a contagem de captura para capturador original/evento imutável: `criaturas.user_id` é posse atual e não prova quem capturou depois de uma venda. Sinais adicionais: pares de comércio repetidos, circularidade, conta nova recebendo patrimônio, flip, concentração, outlier com amostra válida, origem/ledger/lotes inconsistentes. Ações graduais: flag, limite, bloqueio de settlement, congelamento e revisão. Duplicação/owner inválido são violações determinísticas; preço raro é sinal probabilístico.

Congelar impede liquidação e mutações novas. Cancelamento seguro e recuperação continuam, mas ativo suspeito volta congelado. Nunca apagar patrimônio silenciosamente. Ação admin exige papel, motivo, antes/depois e referência; correções econômicas e resultado administrativo têm auditoria consistente.

Reutilizar `server/telemetria.mjs:emitir/anotar` e a chave única já existente para fatos gravados no SQLite na mesma transação. Auditoria econômica não é amostrada. Só acrescentar outbox para entrega assíncrona externa quando necessária, com pelo menos uma entrega e deduplicação por event_id; não tratar telemetria transacional já persistida como inexistente. Eventos: encontro/shiny, tentativa/captura/falha, revisão/lock/conclusão/cancelamento/bloqueio de trade, anúncio/venda/expiração, buy order/fill, emissão/uso/troca de Master Ball e reconciliação.

KPIs: emissão shiny por fonte/versão, captura, estoque Master Ball, emissão/queima líquida, disponível/reservado, volume válido, contas distintas, concentração, tempo até venda, cancelamento, holds vencidos, atraso outbox e latência/conflitos. Usar dados reconciliados.

Worker idempotente expira entidades e libera reservas, reprocessa outbox externa após restart, quando houver esse consumidor. Requisição também confere prazo. Não expirar hold isolado sem transicionar trade/order.

**Flags: estender o catálogo atual, sem sistema paralelo.** `capture_enabled`, `idle_enabled`, `league_enabled`, `p2p_transfer_enabled`, `league_stake_enabled`, `competitive_exchange_enabled`, `real_value_currency_enabled` e `cashout_enabled` já são nomes existentes. Preservar nome e semântica; `withdrawal_enabled` não é o nome atual.

Adicionar flags de produto `true_shiny_enabled`, `direct_trade_enabled`, `player_market_enabled`, `player_market_buy_orders_enabled`, `master_ball_trade_enabled` e `player_market_price_history_enabled` ao mesmo catálogo, inicialmente desligadas; preservar o estado e a semântica das flags existentes. Para negociar ativos, exigir a flag específica **e** `p2p_transfer_enabled`; permuta também transfere valor e segue o mesmo gate. `CHECKPOINT_25_1=null` hoje impede habilitar P2P. Não preencher esse marcador como parte desta revisão ou para fazer demo passar. Testes isolados podem injetar fixtures pela arquitetura existente, sem alterar configuração de produção.

Kill switch recusa novas criações e settlements, mas preserva leitura, consulta de operação, cancelamento seguro, expiração e conciliação. Desligar shiny não apaga atributos existentes. As rotas novas devem chamar `exigirBandeira`; existência de uma flag no catálogo não prova que todo endpoint já a respeita.

## 14. API e dados: preservar E13 e separar o Market de ativos

### 14.1 Endpoints

`/api/idle` e suas operações são existentes, não propostas novas. Manter `OPERACOES_DO_IDLE` como allowlist. Corpo atual da captura: `chave`, `bola`; evolução: `id`, `alvo`; doce/jornada já usam `chaveIdem`. Estender/adaptar esses contratos com versionamento; não instalar uma segunda API `/api/collection` ou `/api/encounters` para o mesmo estado.

| Situação | Rotas / ação E14 |
|---|---|
| Existente, estender | `GET /api/idle`; `POST /api/idle/colher`, `/api/idle/lancar`, `/api/idle/evoluir`, `/api/idle/doce`, `/api/idle/soltar`; leitura inclui shiny/locks/origem e recibos |
| Existente, estender | `/api/idle/run*`, `/api/idle/jornada/lutar`, `/api/equipe/snapshot`, endpoints de partida/pareamento; respeitar posse/locks novos |
| Existente, preservar | `/api/mercado*`: bolo mútuo da Arena. Não usar para anúncios de Pokémon/itens |
| Novo, histórico | `GET /api/idle/historico?id=…`; novo descarte explícito somente se necessário, registrado na allowlist |
| Novo, recuperação | `GET /api/economy/operation?id=…`, restrito ao ator |
| Novo, trade P2P | `POST /api/trades/create`, `/api/trades/offer`, `/api/trades/ready`, `/api/trades/confirm`, `/api/trades/cancel`; `GET /api/trades/detail?id=…`, `/api/trades/me` |
| Novo, Market de ativos | `GET /api/player-market/search`, `/api/player-market/detail?id=…`, `/api/player-market/history`, `/api/player-market/me`; `POST /api/player-market/create`, `/api/player-market/buy`, `/api/player-market/cancel` |
| Novo, buy orders D | `GET /api/player-market/buy-orders`; `POST /api/player-market/buy-orders/create`, `/api/player-market/buy-orders/fill`, `/api/player-market/buy-orders/cancel` |

Operações P2P têm chave idempotente e versão/hash do payload. Reutilizar transporte/auth de `app/modules/api.mjs`, sem impor renomeação global de `chaveIdem`. Se novo header `Idempotency-Key` for adotado, criar adaptação explícita e testes de compatibilidade; nunca aceitar duas chaves divergentes no mesmo pedido.

### 14.2 Entidades

| Entidade | Reutilização / incremento |
|---|---|
| `criaturas` | Estender UUID/owner existentes: shiny, OT, fonte, origem, locks, versão e baixa lógica |
| `encontros_pendentes` | Estender chave/resolução/fontes já persistidas; shiny, versão e recibo de captura |
| `wallet_ledger` / `carteiras` | Preservar contrato e transação existentes; novos tipos/deltas e conciliação P2P |
| `bolsa`, `species_candy`, `candy_ledger` | Manter projeções/livro; acrescentar lotes/proveniência e referência ao fato de origem |
| `team_snapshots`, `league_matches` | Preservar imutabilidade/replay; revalidar posse para novo uso; snapshot carrega shiny |
| `feature_flags`, `admin_auditoria` | Ampliar catálogo e usar auditoria/permissões existentes |
| `telemetry_events`, `suspeitas_antifraude` | Reutilizar eventos deduplicados e revisão de sinais; acrescentar domínio P2P |
| `creature_ownership_history`, `economic_operations` novos | Histórico append-only, hash/payload/resposta de operação |
| `asset_holds`, lotes/reservas novos | Escrow vinculado à entidade; exclusividade de instância e quantidades fungíveis |
| `trades`, `trade_assets`, `trade_confirmations` novos | Revisão/hash e confirmação bilateral |
| `player_market_listings`, `player_market_fills` novos | Não confundir com tabelas do bolo mútuo |
| `player_market_buy_orders` novo | Etapa D: reserva e remanescente |
| Política/fee records P2P novos | Configuração versionada e taxa única por operação/papel; outbox só se houver consumidor externo |

`server/mercado-jogadores.mjs` e `server/mercado-jogadores-rotas.mjs` serão módulos novos; `server/mercado.mjs`/`mercado-rotas.mjs` permanecem do E12. Busca/histórico podem usar módulos `mercado-jogadores-*` sem colisão.

Índices: owner/status/expiry, catálogo+shiny+estado+preço+ID, lotes owner/item/origem, histórico instância/data, idem único e holds ativos únicos. Projeções são reconstruíveis. Respeitar dependências de banco e leituras do E13/Liga ao acrescentar histórico e tombstone.

## 15. Liberação e recuperação

Migrações entram ao final de `MIGRACOES`, nunca modificando a inicial. Reutilizar `server/copia.mjs` (cópia consistente, conferência e restauração) e `test/copia-banco.mjs`; estender a conferência às novas invariantes. Ensaiar em cópia do banco atual, comparando IDs/totais. Migração retomável com relatório. Após comércio, rollback operacional é desligar flags e corrigir progressivamente; não restaurar backup antigo sobre vendas concluídas nem derrubar tabelas de patrimônio.

Gates B/C: origem saneada; zero duplicação; zero saldo/quantidade negativa; reconciliação integral; sem holds órfãos; retry após timeout/restart; captura sem encontro recusada; locks em todos os caminhos; taxas e consequência de insumos bound visíveis. Divergência econômica não explicada impede P2P.

Concorrência deve usar conexões/processos distintos em SQLite em disco: compra×compra, compra×cancelamento, fill×expiração, evolução×listagem, gasto×reserva, confirmação×edição e crash antes/depois de commit. `Promise.all` de funções síncronas na mesma conexão não prova corridas.

Metas propostas para piloto, a medir em hardware declarado: busca p95 ≤300 ms com 10 mil anúncios; settlement p95 ≤500 ms sob dez clientes concorrentes; nenhuma violação de invariantes. Medir contenção SQLite antes de propor infraestrutura distribuída.

Testes determinísticos por mudança; integração curta por story; `npm run sabotagem:bloco` no fechamento, reportando adiados; Q2 completo com cache periodicamente e `npm run portoes:tag` antes de tag, conforme T14/CLAUDE atuais. Milhão de sorteios e simulação econômica ficam em rotina estatística dedicada, sem virar requisito de cada ciclo de edição. Orçamento no documento de stories.

## 16. Decisões antes de produção

| Decisão | Critério |
|---|---|
| Taxa shiny | Encontros/captura reais por perfil; emissão e distribuição de espera |
| PC-T elegível inicial | Definir fonte finita/auditada. A exclusão do bônus de cadastro já está decidida em DEC-E14-001 |
| Legado local/monetário | Reconciliação e política comunicada, sem conversão automática |
| Master Ball | Orçamento por fonte/conta/período e impacto conjunto em shiny |
| Limites, maturidade, cooldown e taxas | Baselines testados com dados de abuso/liquidez |
| Cosmético substituto | Aura/moldura/efeito preservando entitlement sem shiny falso |
| Buy orders de Pokémon | Critérios objetivos, UX e liquidez suficientes |

Ao incorporar ao repositório, reconciliar a spec mestre e **`docs/PLANO_DE_IMPLEMENTACAO.md`**, que contém as stories atuais, além de BUILD_BLOCKS/índice quando necessário. `docs/ROADMAP.md` continua a fila única; `docs/RETOMAR.md`, o estado único. Estes arquivos não declaram stories concluídas. ST-13.4/13.5 são dependências reais pendentes; ST-11.8/11.9 já estão construídas e devem ser reutilizadas. A E14 não reabre épicos concluídos nem muda a fila sem registrar o encaixe no plano canônico.
