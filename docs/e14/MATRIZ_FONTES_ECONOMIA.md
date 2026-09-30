# Matriz de fontes da economia — ST-14.0A (30/09/2026)

> **O que é:** o item 2 da ST-14.0A (`E14_IMPLEMENTATION_STORIES.md`, §3):
> todo lugar do código que CRIA, MOVE ou DESTRÓI dinheiro, item, doce ou
> criatura, com a autoridade, o evento que o torna único, o bolso e quem é o
> dono de cada pendência. Levantado por busca nos pontos de escrita
> (`creditar`, `gastar`, `reservar*`, `liquidar*`, `creditarBolsa`,
> `debitarBolsa`, `species_candy`, `INSERT/DELETE/UPDATE criaturas`) no commit
> de 30/09. **Fotografia datada** — não guarda andamento (GOV-01); o que
> falta está no ROADMAP.
>
> **O que ela achou na primeira passada:** o **D-137** — com conta, a trilha
> de login e os desafios NÃO pagam o PC-B (o servidor registra e diz
> `creditou: 7`, a carteira fica em 0; medido). Dono: ST-13.9c.

## 1. Dinheiro (PokéCash — `wallet_ledger`, `engine/carteira.mjs`)

| fonte / sumidouro | autoridade (arquivo) | evento único | bolso | orçamento | vai ao P2P? | pendência · dono |
|---|---|---|---|---|---|---|
| bônus de cadastro `WELCOME_GRANT` | servidor `rotas.mjs:249` | `welcome-<conta>` | **`transferivel`** | `SALDO_INICIAL` 1.000 | **não deveria** | **D-135** · ST-14.0B (vai a `bonus`) |
| trilha de login | servidor `progressao.mjs:registrarLogin` | linha `(conta, dia)` em `login_streak` | deveria `bonus` | `ORCAMENTO_LOGIN_SEMANAL` | não | **D-137** · ST-13.9c (grava, não credita) |
| desafios — marco semanal | aparelho `desafios.mjs:pagarMarcoSemanal`; servidor só conta `challenges` | nenhum no servidor | `bonus` (no aparelho) | `ORCAMENTO_DESAFIOS_SEMANAL` + teto de saldo (`engine/emissao.mjs`) | não | **D-137** · ST-13.9c (com conta, o crédito local é apagado pela projeção) |
| resgate §28.8 `RESCUE_GRANT` | servidor `rotas.mjs:393` | `rescue-<conta>-<dia>` | `bonus` | `rescue_grants` por semana | não | — |
| aposta: reserva, liberação, liquidação | servidor `aposta.mjs` → `carteira.mjs` | o bilhete | a composição da stake; o payout herda o bolso (§5.5) | teto por bilhete §4.4.6 | só a parcela PC-T elegível (ST-14.0B) | ST-14.0B: provar que PC-B não vira PC-T em toda liquidação |
| bolo mútuo `MARKET_*` | servidor `mercado.mjs` | a entrada | idem aposta | — | idem | — |
| stake da Liga `LEAGUE_*` | servidor `stake-liga.mjs` | `stake:<partida>`, `stake-volta:…` | stake pela composição; **payout em `bonus`** | — | não | — |
| cosmético `COSMETIC_PURCHASE` (sumidouro) | servidor `cosmeticos.mjs` (`gastar`) | a compra | débito por composição | — | — | — |
| compra com dinheiro real `PC_T_PURCHASE_*` | **só no aparelho** (`banco.mjs:creditarCompra`, bolso `comprado`) | — | `comprado` | — | **nunca** (DEC-03) | ST-4.5 / DEC-02 · atrás do `CHECKPOINT_25_1` |
| carteira do aparelho (sem conta) | `app/modules/banco.mjs` | — | todos | — | não | sandbox: com conta, a projeção do servidor sobrescreve |

## 2. Itens da bolsa (`bolsa`, sem proveniência hoje)

| entrada / saída | autoridade | evento único | pendência · dono |
|---|---|---|---|
| colheita da expedição (itens, moeda PvE, material) | `idle.mjs:colher` | `colhida_em IS NULL` na expedição | proveniência por lote · ST-14.0C |
| colheita da run | `run.mjs:colherRun` | `colhida_em IS NULL` na run | idem |
| lance: consome a bola | `idle.mjs:lancarPendente` | a chave do encontro | a bola bound → captura bound · ST-14.0C/5 |
| recompensa da jornada | `jornada.mjs:91` | `chaveIdem` da luta | ST-14.0C |
| loja da Liga (bolas, por LP) | `loja-liga.mjs:92` | a compra idempotente | origem `liga` · ST-14.0C |
| loja do idle (compra/venda por moeda PvE), estilhaço, montagem | `loja-idle.mjs` (ST-13.9a) | **nenhum** (POST não idempotente) | chave de pedido · ST-14.0C |
| evolução: consome a pedra | `colecao.mjs:97` | a transação da evolução | pedra bound → forma bound · ST-14.0C/5 |
| prêmio da missão da semana | `escada.mjs` (ST-13.9b) | a missão na `missoes_semana` | ST-14.0C |
| bolsa do aparelho (sem conta) | `idle-dados.mjs`, `idle-bolsa.mjs` | — | sandbox |

**Moeda PvE** (PokéCoin): mora na bolsa, é intransferível por definição
(spec E14 §4.3) — nunca entra no P2P como moeda.

## 3. Doces (`species_candy` + `candy_ledger`)

| entrada / saída | autoridade | evento único | pendência · dono |
|---|---|---|---|
| doce da aposta | `doce.mjs:creditarDoceDaAposta` | o bilhete | ligar ao bolso da stake (PC-B → doce bound) · ST-14.0C |
| doce de soltar | `colecao.mjs:soltarNaConta` | `soltar:<id>` | soltar não lava origem · ST-14.2 |
| doce da jornada | `jornada.mjs:95` | a luta | ST-14.0C |
| doce da loja da Liga | `loja-liga.mjs:100` | a compra | ST-14.0C |
| dar doce (consome) | `doce.mjs:65` | `chaveIdem` | — |

## 4. Criaturas (`criaturas`)

| entrada / saída | autoridade | evento único | pendência · dono |
|---|---|---|---|
| inicial | `idle.mjs:escolherInicial` → `criaturas.mjs:gerar` | uma por conta | inicial bound · ST-14.5 |
| captura | `idle.mjs:lancarPendente` → `gerar` | a chave do encontro (uma tentativa) | shiny e recibo · ST-14.1 |
| evolução | `colecao.mjs:98`, `criaturas.mjs:139/151` (`UPDATE dex`) | a transação | mesmo UUID, shiny não rerrola · ST-14.2 |
| soltar | `colecao.mjs:soltarNaConta` (**DELETE**) | `soltar:<id>` | baixa lógica, histórico · ST-14.2 |
| "já possuiu" (derivado) | gatilho `ja_possuiu_*` (ST-13.9b) | `(conta, pack, dex)` | — |

## 5. League Points

`pontos-liga.mjs` — ledger próprio, sazonal, **intransferível**; gasto só na
loja da Liga. Fora do P2P por definição.

## 6. Fontes desconhecidas habilitadas

**Nenhuma** depois da ST-13.9 e da 13.9c: toda escrita de valor de jogo com
conta passa por uma rota nomeada do servidor. As duas pendências de
classificação que bloqueiam o P2P são o **D-135** (bolso do cadastro) e a
proveniência de itens e doces (**ST-14.0C**).
