# PokéArena — E14 Implementation Stories

**Épico:** E14 · Shiny, Trading & Player Market · revisão 3.0 · 28/09/2026  
**Contrato normativo:** `SPEC_E14_PLAYER_ECONOMY_MARKET.md`, revisão 3.0.  
**Base inspecionada:** [branch `claude/docs-planning-tests-6hjthq`](https://github.com/cardosomatheus1/Pokemon/tree/claude/docs-planning-tests-6hjthq), commit `01071f45755078085062ca4a6dc6160f7b77fb23`.  
**Status:** planejamento revisado, sem implementação efetuada. IDs ST-14.1–15 preservados para rastreabilidade; ordem e escopo corrigidos. Novos pré-requisitos ST-14.0A–0D e recuperação ST-14.16.

## 1. Correção da auditoria e conclusão

As revisões 2.0/2.1 avaliaram a branch errada. Esta revisão substitui seus achados e instruções técnicas pela leitura da branch de trabalho no SHA acima. A comparação oficial com a antiga base `534ee7716defb57121455df7fbed5a78a59d2e04` indica **130 commits à frente, 1 atrás e divergência**; não é apenas uma troca de cabeçalho.

Já existem backend de coleção, encontros persistidos, captura atômica por chave, transação componível da carteira, snapshots/partidas/MMR da Liga, flags, antifraude e recuperação de banco. Não criar versões paralelas. O `server/mercado.mjs` existente pertence ao bolo mútuo da Arena; o Market de Pokémon/itens terá namespace próprio.

Dependências reais: concluir ST-13.4/13.5 para migração e cliente conectado; corrigir o bônus inicial; acrescentar proveniência de itens/doces, shiny/recibo nos encontros, reservas de ativos e settlement P2P. ST-11.8/11.9 e o backend E13 já construídos devem ser reutilizados. A ausência de `comprado` no schema é uma pendência deliberada da ST-4.5, sem fonte de compra server-side; E14 recusa esse bucket e não antecipa pagamentos reais.

Foram executadas **16 suítes existentes, 122/122 testes aprovados**, além das sondas descritas na spec. Isso valida o recorte da base atual, não aprova o Market futuro nem substitui suíte completa/Q2. O detalhamento reproduzível está na seção 9.

**Regra já decidida — DEC-E14-001:** o bônus de entrada sempre deveria ser PC-B não transferível. O `WELCOME_GRANT` atual em `transferivel` é defeito de implementação, não mudança de direção do produto. A correção obrigatória pertence à ST-14.0B, com proteção de derivados em ST-14.0C/5. Não aguardar nova aprovação para definir essa regra. Estes documentos foram corrigidos; a alteração do código ainda precisa ser implementada e verificada.

## 2. Ordem executável e entregas

| Onda | Stories | Saída |
|---|---|---|
| 0 | 0A → 0B → 0C e 2 → 5 | Política, carteira existente adaptada, proveniência e instância compatíveis |
| A | 1 → 4 → 0D → 3; gate parcial 15 | Coleção conectada, shiny e captura jogáveis |
| B | 6 → 8, 14 e 16 → 7; gate parcial 15 | Troca direta segura e recuperável |
| C | 9 → 10 e 12 → 13; gate 15 | Market de preço fixo com lotes fechados |
| D | 11A → 11B quando justificada; repetir gate 15 | Buy orders, preenchimento parcial e instâncias filtradas |

“E” ou lista na mesma célula indica dependências explicitadas nas stories, não obrigação de trabalhar com agentes paralelos. ST-14.15 é verificação incremental das entregas, não local para empilhar todos os testes no final. ST-14.14/16 entram **antes** da primeira liquidação, corrigindo a ordem original.

ST-13.4/13.5 são dependências externas da entrega A, com decisões e execução nos respectivos blocos; 0D integra os incrementos E14. Sem fonte aprovada de PC-T, comércio monetário permanece fechado. **Permuta também exige `p2p_transfer_enabled` e o checkpoint existente.** Testar serviços com fixtures isoladas não autoriza habilitar produção, preencher `CHECKPOINT_25_1` ou criar flags que contornem esse gate. Não criar Exchange ou cash-out para desbloquear E14.

### Convenções para implementação

- **Alterar** indica arquivo existente no commit analisado. **Criar** indica caminho proposto, a confirmar antes do trabalho.
- Nomes de módulos novos seguem o repositório; tabelas/contratos seguem a spec. Não renomear módulos existentes por estética.
- Migrações append-only ao final de `server/banco.mjs:MIGRACOES`; nada de editar migração inicial.
- Engine puro e agnóstico ao tema; nomes/arte/Balls específicos ficam em `content/`.
- Portões: Q1 comportamento; Q2 sabotagem; Q3 invariantes; Q4 estatística; Q5 visual; Q6 segurança; Q7 crítica visual; Q8 concorrência/carga; Q9 telemetria.
- Complexidade P/M/G é relativa, não promessa de prazo. Uma story G deve ser entregue em commits coerentes sem ativar funcionalidade incompleta.

## 3. Stories de fundação

### ST-14.0A — Contrato econômico, fontes e integração documental

**Objetivo:** converter as divergências identificadas em decisões executáveis. **Dependências:** nenhuma. **Complexidade:** M.

**Alterar na incorporação:** `docs/PLANO_DE_IMPLEMENTACAO.md`, `docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md`, `docs/POKEARENA_BUILD_BLOCKS_v1.2.md`, `docs/POKEARENA_DOCUMENT_INDEX_v1.5.md`, `docs/ROADMAP.md`, `docs/RETOMAR.md`. Achados fora do escopo seguem para `docs/DEFEITOS.md`/`docs/LACUNAS.md` com bloco dono.

**Fazer:**

1. Registrar contrato E14 3.0 e mapear dependências reais: ST-13.4/13.5 pendentes; ST-11.8/11.9 e backend E13 construídos. Relacionar F5.6 Exchange, F5.7 P2P e F5.8 antifraude sem construir versões concorrentes.
2. Inventariar todos os produtores/consumidores de dinheiro, itens e criaturas: cadastro, aposta/bolo mútuo, recompensa, idle, Avanço, jornada, loja, evolução, doce, soltura, crafting e admin; separar caminhos locais dos autoritativos.
3. Definir por fonte: autoridade, evento único, classe de origem, orçamento, saída transferível/bound e propagação para derivados.
4. Registrar plano para saldo legado, save local e prestígio shiny. Distinguir sandbox de produção.
5. Definir fonte de PC-T elegível e emissão Master Ball; fixtures são `test_only`. Qualquer piloto com jogadores depende da política de emissão e do checkpoint P2P vigente.

**Aceite:** matriz sem fonte desconhecida habilitada; cada dependência tem código/bloco dono; uma fila e um estado; novos grants classificados; sem botão de monetização/cash-out habilitado.

**Verificação:** revisão de matriz contra pontos de escrita encontrados por busca. Não adicionar teste de texto que apenas repete a documentação.

### ST-14.0B — Estender a carteira existente para P2P e corrigir o bônus

**Dependências:** 0A. **Complexidade:** G. **Spec:** §§4.2, 8, 14.

**Alterar:** `engine/carteira.mjs`, `server/banco.mjs`, `server/carteira.mjs`, `server/rotas.mjs`, `server/admin.mjs`, `server/politica.mjs`. **Criar:** `server/operacoes-economicas.mjs`. Não criar coordenador `server/transacao.mjs` redundante.

**Fazer:**

1. Reutilizar `emTransacao(db, fn)` e SAVEPOINT da carteira. O coordenador P2P deve abortar o conjunto também quando uma chamada retorna `{ok:false}`; apenas lançar exceções técnicas não cobre toda recusa. Helpers de coleção que abrem BEGIN próprio precisam de adaptação antes de participar dessa composição.
2. Cumprir DEC-E14-001: corrigir `WELCOME_GRANT` novo para `bonus` (PC-B), sem PC-T originado no cadastro. Conferir `server/rotas.mjs` e concessões/migração em `app/modules/banco.mjs`; nenhum caminho local promove bônus a saldo conectado transferível. Preservar origem PC-B nos retornos/ganhos e na reserva/liberação/cancelamento de apostas e bolo mútuo, inclusive composição mista. Implementar saneamento legado por reclassificações auditadas ou inelegibilidade até reconciliação; não editar ledger histórico.
3. Criar reserva P2P apenas de PC-T elegível. `reservarNoBanco` atual usa ordem mista de consumo de apostas e não deve ser chamado como se já aplicasse essa restrição. Recusar `comprado`, `bonus`, `competitivo` e `pendente`. Manter a migração do bucket `comprado` com ST-4.5/COM-01 quando sua fonte for habilitada; preservar DEC-03.
4. Acrescentar deltas/tipos da spec, preservando as convenções históricas de `BET_LOSS`, `MARKET_LOSS`, `BET_RESERVE` e `MARKET_ENTRY_RESERVE`. Usar `PLAYER_MARKET_*` nas taxas de ativos; `MARKET_*` existente continua do bolo mútuo.
5. Criar `economic_operations`, hash canônico, resultado persistido e configuração versionada de taxas. Reutilizar eventos transacionais de `server/telemetria.mjs`; outbox só se surgir consumidor externo assíncrono. Estender o catálogo existente com novas flags E14 inicialmente desligadas, com gates específicos completados em 14; preservar as flags existentes.
6. Adaptar `painelEconomico` e conciliação para emissão, queima e movimentação interna; incluir disponível, reservado e operações abertas.

**Aceite:** débito A + crédito B + burn no mesmo commit; qualquer falha, inclusive `{ok:false}`, desfaz tudo; retry preserva resposta; payload diferente conflita; saldo/reserva não negativos; grants antigos não são liberados pelo nome do bucket. Regressões de apostas e bolo mútuo permanecem corretas.

**Testar:** adicionar `test/e14-carteira.mjs`; ampliar carteira-servidor, banco-servidor, rotas e painel afetado. Cobrir saldo exato, falta só da taxa, zero/negativo/NaN/overflow, mesma chave entre usuários, falha entre lançamentos, recusa silenciosa de movimento e migração de banco antigo. Não refazer testes genéricos de composição já existentes sem um risco P2P novo.

**Regressão obrigatória do bônus de entrada:**

| Caso | Aceite |
|---|---|
| Cadastro novo | `WELCOME_GRANT` em `bonus`; nenhum crédito `transferivel` causado pelo cadastro |
| Repetição da concessão | Um único grant, sem duplicação nem troca de bucket |
| Aposta 100% PC-B: vitória, derrota e cancelamento | Débitos, retorno/ganhos e liberação preservam PC-B; PC-T não aumenta por essa origem |
| Aposta com PC-B + PC-T elegível | Composição preservada; apenas a parcela originada em PC-T segue sua política transferível |
| Trade, Market e respectivas taxas com PC-B | Recusa, sem débito indevido, reserva parcial ou transferência |
| Insumo promocional → captura/evolução/crafting | Origem restrita propagada; saída não habilita conversão indireta em PC-T |
| Saldo antigo com `WELCOME_GRANT` transferível | Reclassificação auditada ou inelegibilidade demonstrada antes de abrir P2P |

Adicionar sabotagens que restaurem `WELCOME_GRANT` em `transferivel` e que liquidem ganho de PC-B em PC-T: ambas devem ser detectadas. A correção documental não encerra esse defeito; o aceite depende da implementação e desses testes.

**Sabotar:** permitir `bonus` no reserve P2P; separar commits; classificar transferência recebida como faucet; ignorar hash. **Portões:** Q1/Q2/Q3/Q6/Q8.

### ST-14.0C — Inventário por lote e proveniência de derivados

**Dependências:** 0A/0B. **Complexidade:** G. **Spec:** §4.3.

**Alterar:** `server/banco.mjs`, `server/idle.mjs`, `server/run.mjs`, `server/colecao.mjs`, `server/doce.mjs`, `server/jornada.mjs` e integrações de escrita em `server/criaturas.mjs`; catálogo `content/itens_v1.mjs` e packs. **Criar:** `server/inventario.mjs`, `engine/proveniencia.mjs`.

**Fazer:** lotes/ledger de itens, IDs de emissão únicos, quantidades disponíveis/reservadas; estender `species_candy`/`candy_ledger` existentes com proveniência, ligando doces de aposta ao evento e à composição da fonte; projeção `bolsa` mantida transacionalmente. Migrar estoque sem prova para bound. Concentrar crédito/débito/reserva/liberação no serviço e validar quantidade inteira positiva, inclusive em chamadas internas. Mapear consumidores de captura/evolução/loja/crafting; consumidores ainda locais ficam impedidos de gerar saída negociável.

Propagar origem financeira restrita de Ball/pedra/doce/boost para captura/evolução/progresso/crafting e de criatura solta para doce. Separar essa linhagem do vínculo de produto: usar um inicial bound não torna todo farm legítimo posterior inegociável. Recompensas verificadas seguem a política da fonte. Escolha explícita da classe da Ball/insumo, consumo FIFO dentro da classe. Item fungível admite vários holds de quantidades; instância não.

**Aceite:** soma lotes = bolsa; nenhum item duplicado por evento repetido; reserva indisponível para uso; item de teste/legado não vende nem produz ativo transferível; evolução com insumo bound exige aviso e vincula saída; farm verificado aprovado continua negociável.

**Testar:** `test/e14-inventario.mjs`, extensão de `test/idle-servidor.mjs`; split/merge preservam origem, corrida uso×reserva, mixed lots, crafting/recompensa e rollback. **Sabotar:** perder bound ao dividir lote; débito aceitar negativo; creditar estoque sem evento. **Portões:** Q1/Q2/Q3/Q6/Q8.

### ST-14.2 — Evoluir a instância já existente

**Dependências:** 0A/0B. **Complexidade:** M. **Spec:** §§4.1, 6.

**Alterar:** `server/banco.mjs`, `server/criaturas.mjs`, `server/colecao.mjs`, `engine/instancia.mjs` somente se necessário ao contrato de hidratação. **Não criar** coleção paralela `pokemon_instances`.

**Fazer:** adicionar shiny, proveniência, OT verificável, espécie original, encounter ID, versão e locks a `criaturas`; manter UUID atual. Referenciar `encontros_pendentes.chave`; criar histórico append-only e baixa lógica. Substituir o DELETE de `soltarNaConta` por política compatível com auditoria, snapshots e crédito de doce, sem permitir reutilizar criatura baixada. Backfill antigo com shiny falso e origem conhecida/indeterminada corretamente descrita. Hidratar atributos novos sem mudar cálculo de potencial. Preservar auditoria por seed/versão de conteúdo, inclusive após evolução.

**Aceite:** soltura mantém evento de captura/histórico e não duplica doce; UUID/IV/natureza/stamina/progresso preservados; evolução muda espécie sem rerrolar shiny; um owner; um encontro não cria duas instâncias; histórico de migração não inventa captura. Histórico público sanitizado.

**Testar:** `test/criaturas-servidor.mjs`, `test/e14-migracao.mjs`; backfill duas vezes, evolução normal/shiny e constraint de encounter. **Sabotar:** gerar UUID na evolução; copiar cosmético do perfil; duplicar encounter ID. **Portões:** Q1/Q2/Q3/Q6.

### ST-14.5 — Política única de negociabilidade e uso

**Dependências:** 0C/2. **Complexidade:** M. **Spec:** §§4, 7.

**Criar:** `engine/negociabilidade.mjs`, `server/elegibilidade.mjs`. **Alterar:** catálogo de itens/packs, `server/criaturas.mjs`, `server/idle.mjs`, `server/colecao.mjs`, `server/run.mjs`, `server/equipe.mjs`, `server/partida.mjs` e consumidores autoritativos identificados em 0A.

**Fazer:** avaliação retorna `allowed`, `reason_code`, `available_at`; combina tipo, origem, vínculo, conta, cooldown, participação em atividade e locks. Política valida tanto reserva quanto settlement; cliente apenas mostra motivo. Configurar comuns/shinies, iniciais, lendário montado, essência, Balls, materiais, cosméticos e todos os buckets.

**Aceite:** restrições consistentes em trade/Market e nos caminhos de uso, com regras específicas de cada ação; mudar owner não lava origem; inicial/lendário bound não passam; farm legítimo aprovado passa. Tempo do servidor decide cooldown.

**Testar:** `test/e14-elegibilidade.mjs`, tabela parametrizada com positivos e negativos, inclusive fronteira temporal. **Sabotar:** aceitar só pelo item_id; esquecer `comprado`; confiar no horário cliente. **Portões:** Q1/Q2/Q3/Q6.

## 4. Entrega A — captura e coleção conectadas

### ST-14.1 — Shiny e recibo recuperável nos encontros existentes

**Dependências:** 0B/0C/2/5. **Complexidade:** G. **Spec:** §5.

**Alterar:** `server/banco.mjs`, `server/idle.mjs`, `server/run.mjs`, `server/colecao-rotas.mjs`, `server/criaturas.mjs`. **Criar:** `engine/shiny.mjs`. Reutilizar `engine/seed.mjs` e `engine/instancia.mjs` sem deslocar sorteios legados.

**Base já pronta:** `encontros_pendentes`, colheita persistida, guarda por chave/usuário, resolução única e débito/criação atômicos em `lancarPendente`. A rota pública já rejeita encontro forjado; o problema incremental é recuperar o mesmo recibo após retry, além dos atributos novos.

**Fazer:**

1. Estender `encontros_pendentes`, mantendo `chave`, `expedicao_id`, `run_id` e origem. Preservar os resultados idempotentes da colheita de expedição e Avanço.
2. Persistir shiny/atributos antes da tentativa, com pack/versão/taxa e proveniência. Registrar resolução por captura, falha, expiração ou descarte. Novo Avanço já encerra pendentes anteriores; explicitar essa consequência antes de abandonar um shiny.
3. Preservar a raiz de captura independente da raiz de colheita publicada. Se resultado latente for antecipado, guardá-lo secreto por encontro. Nunca aceitar seed/shiny/raridade/dex do cliente. D-129 do lance local pertence à ST-13.5; integrá-la, sem duplicar dono do defeito.
4. Estender `POST /api/idle/lancar` com `chave`/`bola` e campos compatíveis de origem/idempotência; não criar API nem tabela de encontros paralela. Compor resolução, débito de lote, criatura, histórico, recibo e telemetria no mesmo commit.
5. Validar conta, dono, prazo, Ball, capacidade e origem; falha legítima consome uma Ball; validação/erro técnico não consomem. Retry autorizado devolve recibo persistido, sem executar nova tentativa.

**Aceite:** normal/shiny com mesma chance; encontro exibido não rerrola; retry de sucesso/falha tem resposta idêntica; chaves concorrentes ou mudança de Ball não permitem segunda tentativa; encontro de outro usuário não vaza resposta; fragmento não duplica.

**Testar:** ampliar `test/colheita-rotas.mjs`, `test/run-servidor.mjs`, `test/run-rotas.mjs`; criar `test/e14-encontros.mjs` para fixtures 0/1/limiar, DTO sem segredo, falha após débito, retry/reinício, coleção cheia, expiração/descarte e encontro de outro usuário. Estatística longa vai para ST-14.15.

**Sabotar:** confiar em dex/shiny recebido; revelar segredo ativo; remover guarda terminal; resolver e debitar em commits diferentes; perder recibo após commit. **Portões:** Q1/Q2/Q3/Q6/Q8/Q9.

### ST-14.4 — Master Ball e emissão controlada

**Dependências:** 0C/1/5. **Complexidade:** M. **Spec:** §5.4.

**Alterar:** `engine/captura.mjs`, `engine/pack.mjs`, `content/pokemon_kanto_v1.mjs`, `content/original_v1.mjs`, `content/itens_v1.mjs`, `server/idle.mjs` e o serviço de inventário proposto em 0C. Nome/arte por pack; regra via capacidade `guaranteed_capture`.

**Fazer:** validar encontro capturável, aplicar chance 1 antes do teto, consumir uma unidade elegível. Evento único de emissão, orçamento por fonte/conta/período e integração a recompensas aprovadas. Sem venda sistêmica ilimitada.

**Aceite:** encontro válido sempre captura; inválido não é legitimado pela Ball; retry não duplica consumo; Ball sem estoque/hold não usa; espécie/atributos/shiny inalterados; budget não pode ser excedido por claims simultâneos.

**Testar:** ampliar `test/captura.mjs`, catálogo e `test/e14-encontros.mjs`; teste determinístico de todas as raridades e limites do RNG, em vez de 10 mil chamadas redundantes por PR. **Sabotar:** aplicar teto após garantia; aceitar encontro inválido; emissão sem orçamento. **Portões:** Q1/Q2/Q3/Q6/Q8.

### ST-14.0D — Integrar E14 ao cliente e à migração de ST-13.4/13.5

**Dependências:** 1/4/5 e conclusão de ST-13.4/13.5 nos seus blocos. **Complexidade:** G, compartilhada com a ponte E13, sem contabilizar duas implementações. **Spec:** §§4.1, 5, 14.

**Alterar:** `server/colecao-rotas.mjs` e seu registro quando necessário; `app/modules/api.mjs`, `colecao-dados.mjs`, `colecao-local.mjs`, `idle-dados.mjs`, `idle-lance.mjs`, `idle-colheita.mjs`, `idle-bolsa.mjs`, `idle-tela.mjs`, `doce-conta.mjs` e adaptadores do fluxo E13. Módulo dedicado de API ou migração só se ainda necessário ao desenho de ST-13.4/13.5.

**Fazer:** reutilizar `GET /api/idle` e a allowlist `OPERACOES_DO_IDLE`: inicial, expedição/colheita/lance, run, caixa/equipe, foco/golpes/evolução/doce e jornada. Não reconstruir esses serviços nem presumir Avanço/jornada ausentes no backend. Acrescentar shiny, origem, locks e recibos. Sessão determina identidade; manter `chaveIdem` existente onde aplicável e adaptar explicitamente eventual header idempotente.

Provider escolhe local ou conectado, sem fallback local de escrita na conta econômica. Comparar o contrato de UI com os serviços já construídos e registrar diferenças restantes. Recarregar ou trocar dispositivo recupera estado e operações do servidor. Correção D-129 acompanha ST-13.5.

A decisão de importação local continua no bloco ST-13.4: a recomendação de importação única e limite plausível não prova proveniência. Se aprovada, será bound/idempotente, com relatório, backup e mapeamento de IDs; um save editado não pode gerar patrimônio negociável ou múltiplas importações. Não transformar esta documentação em aprovação de migração de dados reais.

**Aceite:** editar localStorage não altera conta; timeout recupera mesma operação; desconexão não cria captura local transferível; importação repetida/arquivo modificado não multiplica patrimônio; outro usuário não acessa operação/coleção privada. Rotas E13 mantêm compatibilidade e progressão autoritativa existente.

**Testar:** estender testes HTTP de coleção/colheita/run/jornada; criar `test/e14-http.mjs` e `test/e14-colecao-cliente.mjs` para incrementos E14 e captura/reload/retry. **Sabotar:** fallback econômico local, userId do body como autoridade e importação duplicada. **Portões:** Q1/Q2/Q3/Q5/Q6/Q8.

### ST-14.3 — Prestígio legado e shiny real na experiência inteira

**Dependências:** 2/1/0D. **Complexidade:** M. **Spec:** §6.

**Alterar:** `app/modules/shiny-dados.mjs`, `perfil-dados.mjs`, `customizacao.mjs`, `rodada.mjs`, `resultado-tela.mjs`, `banner.mjs`, `sprites.mjs`, `adm.mjs`, `snapshot-dados.mjs`, `app/index.html`; `server/equipe.mjs` e `server/partida.mjs` para os snapshots da Liga já existentes.

**Fazer:** migrar vagas/desbloqueios para prestígio sem apagar conquista; cosmético não equipa paleta shiny na arena. Coleção e PvE leem instância; arena só usa aparência shiny se seleção de instância própria for validada e vinculada ao snapshot. Se não houver seleção suportada, manter normal + aura, sem inventar posse. Liga já possui seleção validada e `team_snapshots`: acrescentar shiny ao snapshot. Antes de nova partida/pareamento, revalidar posse/locks dos IDs; após transferência o snapshot antigo não autoriza novo uso. Resultado/replay de partida já criada preserva snapshot após trade. Não bloquear eternamente criaturas por snapshots históricos. Admin cosmético não gera shiny negociável.

**Aceite:** conta antiga mantém prestígio; nenhuma criatura normal ganha shiny pelo perfil; dono errado não pinta Pokémon alheio; odds e combate iguais; shiny identificado em encontro/captura/coleção/evolução; missing sprite tem fallback e selo.

**Testar:** atualizar `test/shiny.mjs`, `test/shiny-arena.mjs`, `test/equipe-snapshot.mjs`, `test/liga-partida.mjs` e testes de resultado afetados; venda impede nova partida com snapshot antigo, mas não altera replay já criado. Capturar 1920/1440/1100/420 px e ler imagens. **Sabotar:** usar dex/cosmético como autoridade; ler owner atual em replay. **Portões:** Q1/Q2/Q3/Q5/Q7.

## 5. Entrega B — trade

### ST-14.6 — Reservas e escrow compartilhados

**Dependências:** 0B/0C/0D/5. **Complexidade:** G. **Spec:** §§7–8.

**Criar:** `server/reservas.mjs`. **Alterar:** `server/banco.mjs` para as tabelas novas e todos os caminhos de uso de ativo mapeados em 0A, especialmente coleção, idle/run, doce/evolução, inventário, equipe e partida.

**Fazer:** compor via `emTransacao`, respeitando `{ok:false}`; holds com entidade dona, estado/prazo, versão e ledger; índice único ativo por instância; quantidade por lote e moeda. Reserva de oferta inteira ou nada. Guardas de mutação em evolução, expedição, treino, soltura, consumo e crafting. Expedição/run já ativa impede reserva; snapshots históricos visuais não impedem. Bloquear novo uso competitivo de criatura reservada e revalidar posse após transferência; partida já criada mantém seu snapshot imutável.

**Aceite:** não há dupla reserva/duplo gasto; holds fungíveis podem coexistir se houver quantidade; nenhuma reserva órfã; cancelar/expirar libera uma vez; disponibilidade física e econômica consistente.

**Testar:** `test/e14-reservas.mjs`, corridas reais em arquivo SQLite; rollback no último ativo; saldo só insuficiente por taxa. **Sabotar:** bloquear apenas UI; esquecer evolução; impor exclusividade por item_id. **Portões:** Q1/Q2/Q3/Q6/Q8.

### ST-14.8 — Taxas, burn e recibos

**Dependências:** 0B/6. **Complexidade:** M. **Spec:** §11.

**Criar:** `engine/taxas-mercado.mjs`, `server/taxas-mercado.mjs`; integrar tipos/fee records em carteira e banco. Taxas da spec são configuração versionada; usar tipos `PLAYER_MARKET_LISTING_FEE`, `PLAYER_MARKET_SALE_FEE` e `DIRECT_TRADE_FEE`, distintos do bolo mútuo.

**Fazer:** função pura com bps/ceil, gross zero, mínimos e inteiros seguros. Preview devolve hash/versão e números exatos. Trade cobra por remetente, além do valor oferecido; Market cobra listing antes e venda do vendedor. Reservar taxa junto com principal. Histórico financeiro aponta operação e política.

**Aceite:** exemplos de 100/1.000 PC da spec fecham; troca sem PC-T não paga; duas pontas monetárias são cobradas separadamente; taxa é queima, não crédito ao sistema; versão antiga preservada. Cálculo cumulativo fica pronto para D sem expor parcial na UI.

**Testar:** `test/e14-taxas.mjs`; valores no limiar de arredondamento, max seguro, falta da taxa, cancelamento e soma parcelada igual à taxa acumulada. **Sabotar:** mínimo por fill; arredondar em float; trocar taxa após aceite. **Portões:** Q1/Q2/Q3.

### ST-14.14 — Proteção e antifraude antes de negociar

**Dependências:** 0A/0B/5/6. **Complexidade:** M na base; análise avançada incremental. **Spec:** §13.

**Alterar:** `server/protecao.mjs`, `server/admin.mjs`, `server/admin-auth.mjs`, `server/rotas.mjs`, `server/config.mjs`, `server/antifraude.mjs`, `engine/antifraude.mjs`, `server/feature-flags.mjs`, `engine/feature-flags.mjs`. **Criar:** `server/risco-mercado-jogadores.mjs`.

**Fazer:** limites de requests/ofertas por conta, self-trade/self-buy, conta congelada e pausas aplicáveis, risco do ativo, origem e bloqueio antes do commit. Reutilizar ações `p2p_enviar`/`p2p_receber`, flags/admin/auditoria existentes; novas flags E14 compõem `p2p_transfer_enabled` e o checkpoint vigente, inclusive em permuta. UI escondida não substitui `exigirBandeira` no servidor. Rotas admin com papel/motivo/auditoria. Sinais de par/circularidade/flip/outlier entram como alertas proporcionais; outlier sem amostra não bloqueia automaticamente.

Corrigir `varrerSuspeitas`: contar captura por evento imutável/capturador original, incluindo criaturas depois soltas, em vez de `criaturas.user_id` atual. Compra não é captura; venda não apaga emissão. Reutilizar sinais existentes de contas ligadas/Liga; novas formas de coleta de dados seguem as decisões de privacidade já registradas.

**Aceite:** compra/venda/soltura não distorcem taxa de captura por conta; bypass por HTTP direto ou flag específica sem checkpoint não passa; família em IP compartilhado não é banida só pelo IP; cooldown/flag não remove patrimônio; ativos congelados não voltam disponíveis ao cancelar; kill switch mantém consulta e liberação segura.

**Testar:** `test/e14-risco.mjs`, fixtures positivas/negativas por regra e teste HTTP auth/admin. **Sabotar:** usar sessão de jogador em admin; liberar item congelado; preço extremo virar ban automático. **Portões:** Q1/Q2/Q6/Q9.

### ST-14.16 — Expiração, restart e conciliação

**Dependências:** 0B/0C/6/14. **Complexidade:** M. **Spec:** §§8, 13, 15.

**Criar:** `server/economia-worker.mjs`, `server/conciliacao-economia.mjs`. **Alterar:** integrar ciclo de vida a `server/principal.mjs`/`server/servidor.mjs`, sem acoplar settlement ao tick da batalha. Reutilizar telemetria transacional deduplicada e `server/copia.mjs` para backup/restauração; ampliar as verificações às entidades novas. Outbox somente para consumidor externo assíncrono, persistida no commit de origem.

**Fazer:** expirar entidades e reservas na mesma transação; endpoint confere prazo mesmo com worker atrasado. Se houver outbox externa, reprocessá-la com deduplicação; detectar holds órfãos e comparar saldo/ledger/lotes/owner. Job com batch limitado, retry finito e métricas. Alertar divergência e suspender novas operações afetadas; não autoajustar saldo para esconder diferença.

**Aceite:** restart não perde nem duplica; expiração concorrente com compra/confirm tem um resultado; operação committed antes do crash é recuperável; rollback antes do commit deixa ativo disponível; desligar feature não prende patrimônio.

**Testar:** `test/e14-recuperacao.mjs`, processo filho terminado antes/depois do commit, relógio controlado e worker repetido. **Sabotar:** perder evento econômico persistido ou duplicar entrega externa; expirar apenas hold; repetir liberação. **Portões:** Q1/Q2/Q3/Q8/Q9.

### ST-14.7 — Trade com revisão e confirmação bilateral

**Dependências:** 6/8/14/16. **Complexidade:** G. **Spec:** §9.

**Criar:** `server/trocas.mjs`, `server/trocas-rotas.mjs`, `app/modules/trocas-tela.mjs`. **Alterar:** banco, rotas, API e navegação. UI do trade pertence a esta story, não fica esperando a tela Market. `/api/idle/trocar` existente troca posições da própria equipe: não é trade P2P e não deve mudar de significado.

**Fazer:** create/offer/ready/confirm/cancel/me/detail; contraparte fixa e ofertas por proprietário. Incrementar revisão em qualquer mudança; readiness dos dois antes de reservar; confirmações vinculadas a hash/revisão/fee policy. Segunda confirmação liquida. Editar locked libera tudo e volta a offered. Limites/prazos da spec, doação com aceite e pelo menos um ativo.

**Aceite:** Pokémon↔Pokémon, item↔PC-T e combos funcionam; mudança de preço/ativo/natureza exibida invalida aceite; terceiro não lê/edita; autotrade recusado; ninguém trava item do outro sem readiness; cancel/confirm concorrem sem efeito parcial; timeout retorna recibo anterior.

**Testar:** `test/e14-trocas.mjs`, HTTP e jornada visual A/B. Corrida confirm×edit e dois confirms simultâneos com conexões independentes. **Sabotar:** aceitar revisão antiga; reservar antes de aceite da contraparte; mover só um lado. **Portões:** Q1/Q2/Q3/Q5/Q6/Q7/Q8/Q9.

## 6. Entrega C — Market inicial

### ST-14.9 — Anúncios de venda com lote fechado

**Dependências:** 6/8/14/16/7 validado. **Complexidade:** G. **Spec:** §10.1.

**Criar:** `server/mercado-jogadores.mjs`, `server/mercado-jogadores-rotas.mjs`. **Alterar:** banco para tabelas `player_market_*`/índices em banco, rotas `/api/player-market/*`. Preservar `server/mercado.mjs` e `/api/mercado/*`, que são do bolo mútuo E12. **Fazer:** create/buy/cancel/detail/me; snapshot da instância, preço total, versão, prazo e taxas. Uma criatura ou lote de um item. Sem edição in-place ou parcial. Reservar ativo e cobrar listing fee atomicamente; compra move owner/lotes, crédito líquido, burn, histórico, recibo e telemetria no mesmo commit; outbox apenas quando aplicável.

**Aceite:** comprador paga preço anunciado; vendedor recebe líquido; oferta alterada/esgotada recusa; self-buy recusa; cancelar não devolve taxa; erro da criação não cobra taxa; disponibilidade não depende de worker; capacidade do comprador verificada antes da cobrança.

**Testar:** `test/e14-mercado.mjs`; dois compradores, buy×cancel, buy×expiry, gasto concorrente e crash. **Sabotar:** vender sem guarda de versão/estado; liberar reserva e vender em commits separados; duplicar fee. **Portões:** Q1/Q2/Q3/Q6/Q8/Q9.

### ST-14.10 — Busca útil com dados reais

**Dependências:** 9. **Complexidade:** M. **Spec:** §10.2.

**Criar:** `server/mercado-jogadores-busca.mjs`; índices/projeção no banco; rota search. **Fazer:** catálogo por pack, species/item, shiny, nível, natureza, potencial, preço e ordenação allowlist. Potencial projetado a partir da mesma função dos IVs. Cursor com chave de ordenação + ID, paginação limitada. O DTO atual já tem golpes/exclusivos; reutilizá-los no detalhe e acrescentar filtro apenas com projeção/índice e contrato verificável. OT e histórico de donos dependem de 2. Não inventar dados ausentes no backfill.

**Aceite:** AND correto; normal e shiny separados; `exemplar` não vira shiny; sold/expired não aparecem como disponíveis; consulta não retorna dados privados; cursor não duplica registros em dataset estável. Sob mudanças simultâneas, pode omitir ofertas recém-inseridas antes do cursor; documentar refresh em vez de prometer snapshot sem implementá-lo.

**Testar:** `test/e14-busca.mjs`, filtros combinados, cursores inválidos, pack distinto com mesmo dex e plano de consulta em dataset de 10 mil anúncios. **Sabotar:** remover pack, injetar ordenação livre, calcular potencial diferente. **Portões:** Q1/Q2/Q6/Q8.

### ST-14.12 — Histórico de preços sem fabricar referência

**Dependências:** 9/14/16. **Complexidade:** M. **Spec:** §12.

**Criar:** `server/mercado-jogadores-historico.mjs`; agregação reconstruível de `player_market_fills` e endpoint history; nunca misturar com liquidações de apostas do E12. **Fazer:** última venda, menor anúncio, mediana/volume/N por janela, pack, item/espécie e shiny. Média/maior bid quando houver suporte. Separar moedas/quantidade, excluir teste/admin/anuladas/suspeitas; recalcular quando risco mudar, preservando histórico bruto.

**Aceite:** agregados só com ≥10 vendas e ≥5 compradores e vendedores distintos; sem mistura normal/shiny para alcançar amostra; permuta não inventa preço; volume monetário difere de quantidade; janela UTC explícita e data apresentada localmente.

**Testar:** `test/e14-historico.mjs`, limiar de N, vendas de um par, extremos, reclassificação de suspeita e reconstrução. **Sabotar:** incluir cancelada ou venda administrativa; misturar shiny; contar transferências internas como volume Market. **Portões:** Q1/Q2/Q3/Q9.

### ST-14.13 — Tela Market e jornada completa

**Dependências:** 9/10/12. **Complexidade:** M. **Spec:** §10.2.

**Criar:** `app/modules/mercado-jogadores-tela.mjs`, `app/modules/mercado-jogadores-api.mjs`. **Alterar:** `app/index.html`, módulos de navegação/API/sprites e coleção necessários, sem redesenhar outras telas.

**Fazer:** busca e categorias; card/detalhe; anúncio com taxas/líquido; compra com total; minhas ofertas/compras; histórico com amostra; navegação para trade. Estados de vazio/carregamento/erro/offline/conflito e recuperação por operation ID. Desabilitar duplo clique é UX, não substitui idempotência servidor.

**Aceite visual:** em 3 segundos o usuário acha busca, identifica shiny, entende preço total/lote e ação principal. Antes de confirmar, identifica taxa e líquido. Teclado/foco, contraste, rótulos acessíveis; shininess não depende só de cor. Nenhum preço ou saldo sai de simulação local.

**Testar:** `test/e14-mercado-tela.mjs`, navegador com captura→anúncio→compra→nova posse; sessão de vendedor/comprador isoladas; 1920/1440/1100/420 px e inspeção de imagens. **Sabotar:** mostrar líquido como bruto; comprar antes de confirmação; tratar timeout como falha definitiva e gerar outra chave. **Portões:** Q1/Q2/Q5/Q6/Q7.

## 7. Entrega D — liquidez avançada

### ST-14.11A — Buy orders de itens e fills parciais

**ID original:** ST-14.11, agora dividido. **Dependências:** gate C de 15; 9/10/12/13. **Complexidade:** G. **Spec:** §§10.3, 11.

**Criar:** `server/mercado-jogadores-ordens.mjs`, `engine/matching-mercado-jogadores.mjs`; ampliar mercado-jogadores, reservas, taxas, banco, histórico e tela.

**Fazer:** reservar quantidade×limite, cobrar taxa de criação separada, critérios de item/proveniência, prioridade preço/tempo/ID e preço da ordem já no livro. Self-match pulado. Preencher parcialmente com mínimo de 50 PC sem gerar restante menor; conservar quantidades. Liberar melhora de preço no commit; cancelar libera só restante. Taxa de venda por acumulado da ordem vendedora. Lote fechado da etapa C só ganha parcial mediante opção explícita em anúncio novo, não por alteração retroativa de contrato.

**Aceite:** dinheiro em hold não aposta nem compra outra coisa; ordem concorrente não enche duas vezes; preço respeita ambos os limites; soma fills=executado; diferença devolvida; taxa total independente do número de fills; taxa zero incremental não viola CHECK do ledger; cancela após parcial corretamente.

**Testar:** `test/e14-buy-orders.mjs`, fixture de livro com preço/tempo, múltiplos vendedores, melhoria de preço, self-match, crash e fill×cancel/expiry. **Sabotar:** escolher ordem mais nova; preço do agressor; liberar principal integral após parcial; mínimo por fill. **Portões:** Q1/Q2/Q3/Q5/Q6/Q8/Q9.

### ST-14.11B — Buy orders de Pokémon por critérios objetivos

**Dependências:** 11A; decisão de produto e dados suficientes de liquidez. **Complexidade:** M. Não bloqueia B/C nem buy orders de itens.

**Alterar:** mercado-jogadores-ordens, elegibilidade, busca e UI. **Fazer:** uma instância por ordem; predicados allowlist por pack/espécie/shiny/nível/natureza/potencial e dados realmente disponíveis; hash/versão dos critérios. Preservar snapshot do exemplar entregue. Aceite antecipado de qualquer instância compatível expresso na criação.

**Aceite:** nenhum critério ignorado; Pokémon fora da faixa recusa; dois vendedores para mesma ordem dão um settlement; comprador não recebe réplica de catálogo sem instance ID; critérios não mudam com atualização do catálogo sem política de compatibilidade/cancelamento.

**Testar:** `test/e14-buy-creatures.mjs`, tabela de critérios AND, bound/held, catálogo versionado e corrida. **Sabotar:** tratar filtros como OR; usar `exemplar` no lugar de shiny; esquecer pack. **Portões:** Q1/Q2/Q3/Q5/Q6/Q8.

## 8. ST-14.15 — Telemetria, simulador e gates incrementais

**Dependências:** executada por etapa, conforme tabela abaixo. **Complexidade:** M. **Spec:** §§12–15.

**Alterar:** `server/telemetria.mjs`, `server/admin.mjs`, `server/politica.mjs`. **Criar:** `tools/simular-e14.mjs`, `test/e14-economia.mjs`. Integrar suítes ao `test/run.mjs` e sabotagens ao mecanismo existente sem reconstruir o arnês.

**Fazer:** emissão, queima, líquido circulante, estoque shiny/Master Ball, distribuição por espécie, contas distintas, concentração, liquidez e reserva órfã. Reutilizar `emitir/anotar` e a chave única de `telemetry_events`; eventos econômicos não amostrados, deduplicados pela operação e gravados com o fato econômico. Simulador puro com seeds fixas e cenários separados de relatórios reais.

| Gate | Dependências | Evidência de saída |
|---|---|---|
| A | 0A–0D, 1–5 | Extensões da captura E13, ST-13.4/13.5, shiny/normal, Master Ball e UI; fontes ainda locais isoladas |
| B | A + 6/7/8/14/16 | Troca completa, preservação de origem, conservação, confirmações, recuperação e limites |
| C | B + 9/10/12/13 | Venda completa, concorrência real, taxas, busca, histórico e UX; piloto monetário reconciliado |
| D | C + 11A e, se liberada, 11B | Matching, parcial, melhora de preço, cancelamento restante e estatísticas coerentes |

**Cenários econômicos obrigatórios:** baixa liquidez, equilíbrio, alta concentração/especulação e abuso de contas novas. Variar encontros/dia, captura, taxa shiny, emissão/uso Master Ball, PC-T elegível, quantidade de usuários, taxas e demanda. Separar sensibilidade de previsão. Não declarar preço sustentável porque um simulador produziu preços.

**Aceite:** taxas mostradas=taxas liquidadas; ausência de mint P2P; reservado reconcilia; estoque sai da emissão menos consumo, sem duplicação; operação com crash tem resultado único. Relatório registra parâmetros, seed, hardware, duração e limites. Operação nova não é faucet.

**Sabotar:** evento duplicado contaminar KPI; estatística misturar shiny/normal; transferência contabilizada como emissão; desligamento de flag impedir liberar escrow. **Portões:** Q1/Q2/Q3/Q4/Q8/Q9 e Q5/Q7 onde houver painel.

## 9. Testes rápidos sem enfraquecer invariantes

A versão anterior exigia 1 milhão de sorteios, 10 mil Master Balls e full Q2 para encerrar tudo. Isso mistura prova de regra com medição estatística e pode devolver o custo em horas. O projeto já tem recorte `--so`, Q2 do bloco, cache e execução completa antes de tag; reutilizar.

| Camada | Quando | Conteúdo | Orçamento proposto, ainda a medir |
|---|---|---|---|
| Regras puras | Durante edição | Chance 0/1/limiar, taxas, elegibilidade e conservação | ≤30 s |
| Integração E14 | Durante edição/antes de revisão | SQLite, HTTP, idempotência, migração e corridas essenciais | ≤2 min |
| Fechamento do bloco | Conforme regras do projeto | `npm run portoes` (inclui `sabotagem:bloco`) + UI afetada | Incremento E14 ≤2 min sobre baseline medido |
| Estatística | Mudança de RNG/emissão e execução dedicada | Até 1 milhão de amostras, seeds fixas, tolerância definida previamente | Meta ≤2 min do módulo puro, sem browser/banco por amostra |
| Q2 completo/carga ampliada | Antes de tag ou risco novo concreto | Mutantes completos, stress e recuperação | Medir separado; não repetir por ajuste de texto/UI |

Os tempos são metas para evitar regressão, não medições desta revisão. Não prometer que a suíte inteira cabe em 2 minutos. `CLAUDE.md` registra tempos históricos diferentes; medir no ambiente utilizado e respeitar os gates vigentes. Teste não rodado não pode aparecer verde.

Comando executado nesta revisão na branch `claude/docs-planning-tests-6hjthq`, SHA `01071f45755078085062ca4a6dc6160f7b77fb23`: **16 suítes, 122/122 testes aprovados**.

```bash
node test/run.mjs --so=carteira-servidor,captura,colecao-servidor,colecao-ops,colheita-rotas,run-servidor,run-rotas,jornada-servidor,equipe-snapshot,liga-partida,liga-mmr,liga-integridade,feature-flags,mercado-servidor,mercado-liquidacao,antifraude
```

Esse recorte não executou suíte completa, Q2, UI E14 ou benchmark. Os 70 testes da revisão 2.1 usavam a base errada e não sustentam conclusões sobre esta branch. As sondas adicionais confirmaram rollback de crédito dentro de `emTransacao`, recusa de encontro inexistente e registro das rotas de coleção/captura.

Fluxo vigente T14: `npm run sabotagem:bloco` executa o fecho do bloco e reporta adiados; `npm run portoes` combina repetição com esse fecho. Q2 completo usa o cache/particionamento já existentes e roda periodicamente; `npm run portoes:tag` exige completo antes de tag. Reutilizar runner paralelo e manifestos atuais. Não apresentar esses gates como executados por esta revisão documental.

Depois de registrar as suítes novas, acrescentar um script `test:e14` que selecione seus nomes reais e execute as dependências econômicas afetadas. Não documentar comando como disponível antes de adicioná-lo. Suites novas devem integrar runner, manifestos/fechos de sabotagem e relatório de execução.

Medida estatística: separar teste exato do limiar RNG, replay determinístico e amostragem de distribuição. Predefinir tamanho, seed e intervalo de aceitação binomial adequado à taxa; casos muito raros usam intervalo exato. Não usar tolerância vaga nem seed aleatória que ocasionalmente reprova código correto. Regressão estatística não prova imprevisibilidade: revisar exposição de seeds separadamente.

Concorrência: SQLite em arquivo temporário, conexões/processos distintos e barreira de sincronização. Relógio injetado para expiração, sem sleeps longos. Injetar falha antes/depois dos pontos de escrita; encerramento real de processo em ao menos um teste por família de settlement. Q2 deve capturar defeito econômico nomeado, não só mudança de string.

## 10. Matriz de jornadas e responsáveis

| Jornada/invariante | Story principal | Resultado obrigatório |
|---|---|---|
| Captura sem encontro / replay adulterado | 1 | Preservar recusa existente e acrescentar recibo idempotente |
| Shiny encontra→falha | 1 | Ball consumida, encontro terminal, nenhuma criatura |
| Shiny captura→evolui→trade→venda | 1/2/7/9 | Mesmo ID/shiny, owners A→B→C e histórico íntegro |
| Master Ball válida/sem estoque/expirada | 4 | 100% só para válida; nenhum consumo em recusa |
| Bônus inicial/compra restrita→P2P | 0B/5 | Recusa e saldo reconciliado |
| Ball/pedra/doce com origem restrita→ativo final | 0C/5 | Origem preservada e restrição visível |
| Inicial bound usado em farm verificado | 0C/5 | Não propaga vínculo de produto a toda recompensa legítima |
| Snapshot antigo após venda | 3/5/6 | Recusa nova partida; preserva replay já criado |
| Captura→venda/soltura→antifraude | 2/14 | Contagem permanece com capturador original, sem duplicação |
| Save local editado→coleção conectada | 0D | Não gera patrimônio negociável |
| Captura/evolução/consumo × reserva | 6 | Um resultado consistente; sem dupla utilização |
| Editar após confirmação | 7 | Nova revisão e aceites limpos |
| Dois compradores × mesma listagem | 9 | Uma venda, um owner, um débito |
| Cancelamento × expiração × settlement | 7/9/16 | Um estado terminal e uma liberação/liquidação |
| Timeout após commit | 0B/16 | Mesmo recibo sem repetir efeito |
| Fills parciais e melhora de preço | 11A | Saldo/quantidades e taxas fecham |
| Duas contas vinculadas manipulando preço | 12/14 | Sinal e exclusão da referência conforme política, sem ban cego |
| Flag desligada/restart | 14/16 | Novas ações bloqueadas, recuperação preservada |

## 11. Migração e checklist de release

1. Reutilizar `server/copia.mjs` e ampliar `test/copia-banco.mjs`; fazer backup verificável e ensaio numa cópia do banco anterior; listar schema/versionamento, quantidades, IDs e saldos antes/depois.
2. Aplicar fundação com flags P2P desligadas. Sanear ledger/proveniência e registrar pendências sem apagar dados.
3. Concluir ponte ST-13.4/13.5 e publicar extensões da coleção/captura existente; cliente antigo não pode continuar gravando economia sem versão compatível. Preservar caminho local sandbox.
4. Validar A; B/C em testes isolados. Coorte com jogadores só após checkpoint/flag P2P e decisões de emissão, mesmo sem moeda. Piloto C limita ofertas/volume; flags de dinheiro real continuam desligadas.
5. Medir concorrência/latência: busca p95 ≤300 ms com 10 mil anúncios; settlement p95 ≤500 ms sob dez clientes, em hardware declarado. Se falhar, reportar gargalo; não substituir invariantes por benchmark.
6. Verificar zero divergência de propriedade, carteira, reserva, item e eventos, além de outbox externa se houver. Reportar indisponibilidade e falsos positivos do antifraude.
7. Incidente: interromper novas operações, manter consulta/cancelamento seguro e conciliação; corrigir por nova migração/compensação auditada. Depois de vendas, não executar down destrutivo nem restaurar snapshot antigo por cima de patrimônio novo.
8. Fechar o bloco com evidências exigidas pelo projeto. Incorporar stories em `docs/PLANO_DE_IMPLEMENTACAO.md`; atualizar fila `ROADMAP.md` e estado `RETOMAR.md` canônicos; estes documentos continuam especificação e plano, não um segundo painel de andamento.

## 12. Critério final de pronto

E14 inicial está pronta quando A–C passam seus gates, as decisões de produção relevantes estão registradas e o jogo permite encontrar/capturar shiny real, negociar diretamente, anunciar/pesquisar/comprar com taxas claras e recuperar falhas sem duplicar ou perder patrimônio. Etapa D tem gate próprio e não impede entregar valor inicial.

Não aceitar como pronto: tela ligada a mocks; API que confia no save local; Market com saldo promocional transferível; propriedade sem histórico; reservas que morrem com processo; “atômico” baseado em duas transações; full Q2 citado sem ter rodado; simulação econômica apresentada como resultado de jogadores reais.
