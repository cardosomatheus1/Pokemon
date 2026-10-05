# Arquitetura e contratos — implementação sobre a Liga existente

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

## 1. Inventário verificado

Todos os caminhos desta tabela existem no commit de referência.

| Responsabilidade | Arquivos e pontos de extensão |
|---|---|
| Combate do treinador | `engine/treino-batalha.mjs`: `simular`, `montarLutador`, `REGRAS`, `VERSAO_TBE`; `engine/primitivas.mjs`: stats, tipos e dano. |
| Time e régua de força | `engine/time.mjs`: `validarTime`, `paraTreino`, `powerDe`, `fraquezasDoTime`. |
| Construção de snapshot | `app/modules/snapshot-dados.mjs`: `snapshotDoTime`, `timeDoSnapshot`, `snapshotPodeLutar`, `conteudoDaLuta`; `server/equipe.mjs`: `criarSnapshot`, `snapshotDe`. |
| Jornada persistida | `server/jornada.mjs`: `jornadaDaConta`, `lutarNaConta`, `criaturasParaLuta`; `engine/jornada.mjs`: progresso e ordem dos nós. |
| Confronto e replay puro | `app/modules/partida-dados.mjs`: `confrontoDaLiga`, `replayDoLog`, `linhaDoLog`, `provaDaPartida`. |
| Pareamento puro | `app/modules/pareamento-dados.mjs`: `escolherAdversario`, `PAREAMENTO`, `botPara`. |
| Autoridade da partida | `server/partida.mjs`: `criarPartida`, `buscarPartida`, `partidaDe`, rotas; `engine/integridade-liga.mjs`: sinais e cooldown. |
| MMR | `engine/liga-mmr.mjs` e `server/liga-mmr.mjs`: Elo, tiers e aplicação transacional. |
| Ranking e temporadas | `server/liga-equipe.mjs`: home, publicação e ranking; `engine/temporada.mjs` e `server/temporada.mjs`: janela, fechamento e reset. |
| Stake | `engine/stake-liga.mjs`: tabela e liquidação; `server/stake-liga.mjs`: inscrição, reserva, prêmio e limites. |
| Carteira | `engine/carteira.mjs`: tipos permitidos; `server/carteira.mjs`: saldos, ledger, gasto, crédito e elegibilidade PC-T. |
| Tesouraria existente | `treasury_ledger` em `server/banco.mjs`, utilizado em `server/mercado.mjs`; ainda sem crédito de rake da Liga. Catálogo atual aceita apenas tipos dos mercados de previsão. |
| LP e recompensas | `engine/pontos-liga.mjs`, `server/pontos-liga.mjs`, `server/loja-liga.mjs`. |
| Apresentação | `app/modules/liga-equipe-dados.mjs`, `liga-equipe-tela.mjs`, `liga-palco-dados.mjs`, `liga-palco.mjs`, `liga-stake-dados.mjs`. |
| Mercado e trocas | `server/mercado-jogadores.mjs`, `mercado-jogadores-busca.mjs`, `mercado-jogadores-rotas.mjs`, `server/trocas.mjs`; telas correspondentes em `app/modules/`. |
| Banco e operação | `server/banco.mjs`: `MIGRACOES`; `engine/feature-flags.mjs`, `server/feature-flags.mjs`; `server/telemetria.mjs`. |
| XP de PvE | `engine/recompensa-pve.mjs`: `xpDaLuta`; `app/modules/jornada-conta.mjs`: crédito puro; gravação em `server/jornada.mjs`. |

`server/liga.mjs` é a Liga de previsões. Não confundir esse módulo com a Liga de times ao mudar acesso, rank ou combate.

## 2. Mudanças propostas, sem motor duplicado

Adicionar somente módulos pequenos onde não existe uma responsabilidade equivalente:

- **Proposto:** `engine/arena-elegibilidade.mjs`: recebe pack, progresso e time; devolve motivos de bloqueio do ranked. Não lê banco.
- **Proposto:** `server/arena-elegibilidade.mjs`: monta esses dados a partir do servidor e chama a regra pura.
- **Proposto:** `engine/arena-politica.mjs`: versão da política de competição, modos, tamanho, cláusula de espécie e limites iniciais de pareamento/defesa. Não duplicar tabela de stake ou tiers.
- **Proposto:** `server/arena-recompensas.mjs`: concessões de kit/missões, depois que as regras econômicas forem implementadas.
- **Proposto:** `server/tesouraria.mjs`: serviço comum para a tesouraria existente e sua extensão de movimentos PvP/promocionais, definida em `07_TAXA_DA_CASA_E_TESOURARIA.md`.

O palco continua em `liga-palco*.mjs` e o resultado continua em `treino-batalha.mjs`. Renomear o produto na UI não obriga renomear todas as tabelas ou rotas atuais.

## 3. Uma regra de elegibilidade compartilhada

Assinatura pura proposta:

```js
elegibilidadeArena({ pack, jornada, time, modo })
// { ok, ligaConcluida, motivos: [{ codigo, ...dados }] }
```

Para ranked:

1. O pack deve definir um final de Liga; ausência é erro de configuração, não conclusão por lista vazia.
2. Todos os nós obrigatórios da Liga, incluindo o final, constam em `jornada.vencidos` persistido.
3. Exatamente seis IDs diferentes; seis dex distintos pela cláusula proposta.
4. Posse, golpes, níveis, preset e versões válidos pelas funções existentes.
5. Nenhum multiplicador de HP de raid como `vidaX` pode entrar pelo cliente no ranked.

A validação dos dois participantes ocorre em busca, no início da execução e antes de reservar. O frontend pode antecipar os motivos, mas não autoriza uma partida. A rotina de snapshot genérica pode continuar aceitando 1–6 para treino; **snapshot válido não significa snapshot elegível ao ranked**.

Um histórico em `jornadas` basta para determinar o desbloqueio. Se houver uma tabela de conquista para otimizar consultas, ela é derivada, auditável e não substitui a prova da Jornada.

## 4. Evitar os dois caminhos de rank

Hoje `buscarPartida` filtra MMR/power, mas `criarPartida` recebe um adversário direto e valida posse, ligação e cooldown sem reproduzir toda a faixa da busca. A política proposta precisa impedir que essa rota seja usada para escolher uma vítima fora de faixa.

- `POST /api/equipe/buscar`: caminho de disputa ranqueada, adversário escolhido no servidor, stake obrigatório na nova política.
- `POST /api/equipe/partida`: desafio amistoso; sem MMR, LP competitivo ou stake. Pedido tentando `modo: ranked` é recusado.
- Uma chamada interna de `criarPartida` para ranked exige contexto de pareamento validado; não basta o frontend ter chamado a busca.
- As regras finais de faixa, elegibilidade e defesa são aplicadas também dentro da execução, mesmo se o candidato mudou depois da seleção.
- Os dois lados usam a publicação ativa, a mais recente da conta. Uma autorização ligada a uma publicação anterior deixa de aceitar novas defesas; republicar não transfere automaticamente o orçamento aceito para o novo time.

Partidas antigas mantêm seus efeitos e sua política histórica. A mudança não reclassifica nem estorna partidas já encerradas.

## 5. APIs existentes e evolução proposta

Todas as rotas da coluna esquerda já existem. Os campos novos abaixo são **contratos propostos**.

| Rota | Evolução |
|---|---|
| `GET /api/equipe/liga` | Acrescentar elegibilidade, motivos, modo disponível, stake do tier e resumo da defesa; manter os campos antigos durante transição. |
| `POST /api/equipe/publicar` | Continuar publicando o time atual. Para preparação ranked, exigir seis e cláusula de espécie, com erro específico. |
| `POST /api/equipe/snapshot` | Snapshot genérico; validar de novo o modo competitivo na entrada da partida. Não confiar em stats enviados. |
| `GET /api/equipe/stake` | Retornar teto autorizado, orçamento e partidas restantes, expiração e estimativa de entrada. |
| `POST /api/equipe/stake/inscricao` | Exigir limites e snapshot para ativar a defesa nova; desativação permanece simples. |
| `POST /api/equipe/buscar` | Acrescentar `modo`; servidor decide stake, rival, resultado e política. |
| `POST /api/equipe/partida` | Amistoso escolhido; nenhuma contabilização competitiva nova. |
| `GET /api/equipe/partida?id=...` | Manter replay do log; acrescentar modo e versão da política quando presentes. |
| `GET /api/equipe/ranking` | Contagem de partidas da temporada corrente e minha posição; fechadas mantêm snapshot histórico. |

Exemplo de nova leitura da home, apenas campos adicionais:

```json
{
  "arena": {
    "politica": "at6-1",
    "elegibilidade": { "ok": true, "ligaConcluida": true, "motivos": [] },
    "modoPrincipal": "ranked",
    "tier": "Bronze",
    "entradaMaxima": 50,
    "defesa": {
      "ativa": true,
      "snapshot": "id-do-time",
      "orcamentoRestante": 150,
      "partidasRestantes": 3,
      "expiraEm": 1791072000000
    }
  }
}
```

Os valores temporais e IDs dos exemplos são ilustrativos. O servidor fornece o relógio e as regras, e a tela formata os rótulos.

Exemplo de inscrição proposta:

```json
{
  "ativo": true,
  "snapshot": "id-do-time",
  "stakeMaximo": 50,
  "orcamento": 150,
  "maxPartidas": 3,
  "validadeHoras": 24,
  "chaveIdem": "autorizacao-uuid"
}
```

Busca proposta:

```json
{
  "meu": "id-do-time",
  "modo": "ranked",
  "chaveIdem": "busca-uuid"
}
```

Nesse modo, `stake: false` não deve transformar o pedido em ranked gratuito. Stake numérico, MMR, nível, IV, seed e vencedor enviados pelo cliente não são fontes de autoridade.

Se o rival tiver stake inferior, a entrada efetiva pode ser menor que o teto exibido. O usuário autoriza esse teto antes de buscar. Pedido idempotente que já gerou uma partida retorna a mesma partida, inclusive após promoção de tier; não recalcula a entrada.

Atualizar `docs/API.md`, `server/contrato.mjs` e os consumidores quando a semântica mudar. Clientes anteriores não podem continuar abrindo ranked gratuito pela API antiga: devem receber modo indisponível/contrato incompatível ou migrar explicitamente a amistoso, nunca sofrer cobrança inesperada.

### Erros novos propostos

| Código | Significado e resposta da tela |
|---|---|
| `ARENA_LIGA_INCOMPLETA` | Voltar ao próximo nó da Jornada. |
| `ARENA_TIME_INCOMPLETO` | Mostrar quantos membros faltam. |
| `ARENA_ESPECIE_REPETIDA` | Identificar os slots que conflitam. |
| `ARENA_MODO_INVALIDO` | Impedir a rota de contornar o ranked. |
| `ARENA_PAREAMENTO_INVALIDO` | Não criar partida; refazer seleção quando apropriado. |
| `ARENA_DEFESA_INDISPONIVEL` | Autorização expirada/esgotada/incompatível; buscar outro candidato. |

Reutilizar os erros de saldo, versão, posse e cooldown existentes quando descrevem exatamente o problema. Respostas não revelam saldo nem motivos privados do rival.

## 6. Atomicidade de uma disputa

O caminho financeiro existente já engloba partida, stake, LP e MMR na mesma transação. Acrescentar autorização de defesa e crédito dos 10% à casa a essa fronteira.

1. Verificar reenvio pela chave e sincronizar temporada antes da nova disputa.
2. Selecionar candidato real e preparar a simulação a partir dos snapshots.
3. Entrar em transação com exclusão de escritores adequada ao SQLite, revalidar chave, time, autorização, saldo e limites.
4. Reservar entradas dos dois e consumir orçamento/contador da defesa com atualização condicional.
5. Gravar partida, seed, versões, log, modo e referência da autorização.
6. Avaliar integridade; liquidar ou devolver entradas; aplicar MMR e LP somente quando elegível. Se houver vencedor em partida liquidada, creditar o rake à tesouraria exatamente uma vez; empate e cancelamento não creditam taxa.
7. Confirmar tudo junto; erro em qualquer ponto desfaz as novas escritas.

Se a partida for anulada por integridade, devolver entradas sem taxa e não consumir orçamento definitivo da defesa. Preservar um evento auditável de tentativa/cancelamento. Em empate, entradas voltam, mas a defesa realizada conta no limite de partidas e no orçamento bruto autorizado: houve uma disputa válida.

Em concorrência, orçamento 50 nunca permite duas defesas de 50. Escolher uma autorização elegível sem consumi-la ainda não garante disponibilidade. Se o rival ficou indisponível, buscar outro com número limitado de tentativas internas e sem cobrar o desafiante.

O compromisso atual é persistido antes da liquidação na execução do servidor e pode ser conferido no replay. Não afirmar que ele prova uma publicação pública anterior da seed se o cliente só recebe a resposta ao final. Manter a prova existente e registrar o alcance real dessa garantia.

## 7. Migrações aditivas propostas

Usar `MIGRACOES` em `server/banco.mjs`; não editar registros imutáveis de partidas ou snapshots antigos.

| Estrutura proposta | Dados e invariantes |
|---|---|
| `liga_defesa_autorizacoes` | ID, conta, snapshot, teto de stake, orçamento total/usado, limite/quantidade, criação, expiração e estado. Valores inteiros não negativos; orçamento usado nunca supera o total. |
| `liga_defesa_eventos` | Livro de criação, consumo, cancelamento e desativação; referência da partida e idempotência. Uma defesa tem um consumo efetivo. |
| `liga_partida_politicas` | Sidecar por partida: `modo`, `versao_politica`, autorização usada e temporada. FK única para partida existente. |
| `arena_recompensas` | Conta, missão/campanha, janela, valor, bucket, chave e referência do ledger; concessão uma vez por janela. |
| `arena_campanhas` | Parâmetros e orçamento reservado/consumido; teste contra estouro concorrente. |
| `treasury_pvp_ledger`, `treasury_pvp_origins` e view `treasury_movements` | Extensão aditiva da tesouraria, com taxa por partida, proveniência e gastos promocionais; contrato detalhado no documento 07. |

Separar configuração de campanha da carteira. Tipos novos de ledger, quando necessários, entram no catálogo de `engine/carteira.mjs`; não registrar missão como aposta ganha ou compra cosmética como aposta perdida.

Tipos da tesouraria usam o catálogo de seu livro próprio. Não colocar a casa em `users` ou lançar seu crédito no `wallet_ledger` de um jogador. Pagamento promocional debita a verba da casa e credita PC-B ao usuário na mesma transação. Recalcular campanhas junto do teto atual de login/desafios; não criar um caminho de crédito que ignora `engine/emissao.mjs`.

Não migrar a inscrição booleana antiga para um orçamento automático: ela não contém snapshot, prazo nem teto aceitos. Contas antigas revisam a autorização antes de defender pela nova política. Histórico continua legível e o saldo não muda nessa migração.

Persistir `temporada` no sidecar facilita métricas, mas não é necessário reescrever todas as partidas antigas. Para janelas legadas, usar data da partida e a função atual de temporada.

## 8. Temporada e contagens

Hoje o ranking corrente seleciona `liga_mmr.partidas > 0`, e essa contagem não é reiniciada na virada. Ela representa participação acumulada; não deve virar comprovação de atividade na temporada nova.

Proposta: manter esse contador histórico e derivar `partidasNaTemporada` das partidas elegíveis dentro da janela corrente. O ranking ao vivo contém contas com pelo menos uma partida elegível nessa temporada; a contagem de fechamento usa a mesma janela. Prêmio sazonal adicional pode exigir cinco partidas e três rivais distintos, como parâmetro proposto de atividade, sem mexer retrospectivamente nos prêmios antigos.

O soft reset continua em 28 dias e puxa o MMR pela regra atual. Não resetar criaturas, IVs, títulos da Jornada ou carteira porque a temporada virou.

## 9. Snapshots, evolução e negociação

Uma partida passada sempre usa seu log e snapshots históricos. Uma partida nova exige posse atual, mesmo que o Pokémon tenha sido vendido depois da publicação. Evoluir ou treinar não reescreve o snapshot publicado: o jogador publica a versão melhorada.

A home hoje detecta alteração do time principalmente por IDs. Acrescentar comparação dos dados de combate e preset: nível, espécie, golpes, IVs, natureza e ordem. Assim, subir nível sem mudar os IDs produz “Seu time evoluiu; publique de novo”, em vez de sugerir que o upgrade já está defendendo.

Não recalcular o resultado do replay com a criatura atual. Aparência shiny continua ligada à instância congelada, com fallback para históricos sem esse campo.

## 10. Versões e bandeiras

- Se mudar dano, alvo, status ou consumo do RNG: alterar `VERSAO_TBE`, testar o novo motor e exigir republicação dos times afetados.
- Se mudar apenas portão de entrada, modalidade ou autorização: versionar **política da Arena**, sem inflar a versão do combate.
- Replays antigos continuam pelo log; mudanças no renderizador não mudam vencedor.
- `league_enabled` e `league_stake_enabled` já são os interruptores relevantes. O stake simulado tem padrão ligado pela DEC-16, apesar de comentários antigos dizerem que nasce desligado.
- Não alterar `CHECKPOINT_25_1` para executar este pacote. Não acrescentar dependências ou migrar a stack para viabilizar o PvP existente.

Uma implementação nova pode usar bandeira de produto para rollout da política, se necessária. Desligar a política nova não deve restaurar por acidente uma rota pública que conceda MMR sem os portões novos; manter treino e leitura de histórico como fallback.


## 11. Contrato do motor e integração das waves — revisão de 03/10

O estudo 08 separa arena comum (`engine/engine.mjs`), Avanço (`wave.mjs`/`run-avanco.mjs`) e Jornada/PvP (`treino-batalha.mjs`). O último já compartilha `primitivas.mjs` com a arena comum. Reaproveitar as primitivas e a montagem de lutadores; não substituir a arena comum pelo motor dos times próprios nem aplicar seus stats comprimidos aos indivíduos da coleção.

**AT6-12:** helper puro de iniciativa, se necessário, recebe velocidade e uniforme semeado. A candidata altera ordenação e exige nova versão TBE, republicação e logs compatíveis. Gravar em cada turno velocidade calculada, iniciativa e ordem; críticos/erros/efetividade continuam vindos da resolução real. Registrar pack, versão do catálogo, versão do motor, presets, snapshot e seed. Alterações de catálogos que mudem batalha invalidam a identidade das regras mesmo sem mudança na fórmula.

**AT6-14:** metadados explícitos de poder/categoria/precisão/efeitos implementados no pack. A escolha de golpe não lê a seed futura nem consome RNG. Uma função pura de expectativa/KO deve seguir a regra de dano e arredondamento vigente; mudar o seletor pede ablação e versão. A extração não altera as primitivas da arena comum acidentalmente. Preservar suas odds e rodadas em andamento quando houver mudanças de catálogo.

**AT6-13:** adaptador novo proposto para wave, com entradas de Pokémon completos e inimigos do pack. `paraOMotor` passa a fornecer IV/natureza/moveset/nível à versão nova, com estado de saúde por indivíduo. Definir estado por wave com versão, entradas congeladas da wave, HP, origem da seed, eventos, captura e consumos. A run antiga permanece no resolvedor anterior até terminar. XP/nível continuam evoluindo durante a run, entrando na wave seguinte; mudanças e curas devem ser idempotentes no `server/run.mjs`. Não aplicar cap global novo de XP.

O HP agregado atual não corresponde a HP individual; a migração não deve inventar retroativamente a distribuição de dano dos históricos. A barra nova deriva dos HP reais e o roteiro deriva dos eventos. Manter os contratos de stamina, encontro, foco, clima e pagamento, ou registrar ajustes explícitos na Spec e no plano canônico. Validar com `server/run.mjs`, dados do Avanço e suites de run/captura, além do motor puro.

As regras de elegibilidade, pareamento e finanças continuam nos serviços existentes. Iniciativa não usa MMR, tier, saldo ou stake. O servidor confirma o mesmo snapshot/versão antes de reservar dinheiro e simula exatamente a versão aceita. Replay por log não é reexecutado contra o estado atual da criatura. Preservar auditabilidade histórica por versão; nunca rotular uma simulação nova como reprodução de `tbe-2`.
