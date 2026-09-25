# Cartão 1.33 — elenco por período e clima

Estado: planejado; implementação não comprovada no pacote. Executar após BASE-01. Porte inicial M (2–4 dias), reestimado quando o código estiver disponível. Relaciona L-178 e prepara 1.34/1.32b. A proposta detalhada abaixo substitui a instrução curta histórica e explicita escolhas ainda não aprovadas.

## Resultado para o jogador

Uma run pode apresentar espécies diferentes quando o período ou o clima favorece outros tipos, preservando a identidade do bioma e a raridade. Depois de iniciada, a run mantém seu elenco mesmo que o relógio real avance, o jogador recarregue a tela ou o conteúdo seja atualizado. A iluminação visual pode acompanhar a hora atual sem mudar os inimigos da run existente.

## Invariantes obrigatórios

1. O resultado é função de entradas autoritativas e versionadas, nunca do relógio ou RNG do navegador.
2. Sem condição ativa, o elenco é **exatamente o resultado anterior**, incluindo ordem e desempates. Preservar esse caminho explicitamente.
3. Uma troca não sai do bioma nem muda a raridade do slot; respeita as regras vigentes de duplicação/evolução.
4. Quando há candidato favorecido elegível distinto, ao menos um slot comum muda. Caso contrário, manter o resultado anterior e fornecer motivo interno observável, sem inventar uma espécie.
5. Chefes continuam respeitando o estágio evolutivo predominante exigido no estágio. Definir em M0 como a implementação atual determina essa predominância e seu desempate.
6. A seleção e os desempates permanecem idênticos para a mesma run e versões.
7. Derivar usando o instante inicial (`run.iniciadaEm`, nome reportado no histórico); o avanço do dia não rerrola a run.
8. O resultado final não expõe clima secreto antes da criação.

## Entradas e contrato propostos

O resolver recebe elenco-base, pools elegíveis do estágio, seed/contexto derivado, instante inicial e versões de conteúdo/regra. Período e clima vêm do estado de servidor associado à run. Não aceitar esses valores enviados livremente pelo cliente. Não gerar clima novo ao consultar um preview.

Retorno lógico: elenco efetivo + explicação das alterações + versão da regra. A explicação pode conter tipo favorecido e motivo de fallback; a exposição pública respeita a fase da run. Os nomes exatos dos campos serão conciliados com o código em BASE-01.

| Condição | Preferências presentes no histórico | Tratamento nesta proposta |
|---|---|---|
| Noite | Favorecer Fantasma, Veneno e Psíquico; reduzir Inseto, Planta e Normal | Usar como regra inicial de conteúdo, com contrapesos definidos |
| Chuva | Favorecer Água e Elétrico | Aplicar apenas a espécies elegíveis do estágio |
| Outros climas/períodos | Não há tabela completa confirmada no ZIP | Inventariar o pack real e completar a tabela; não inventar sete regras a partir de nomes presumidos |

Pesos iniciais sugeridos para experimento: 1,25 por favorecimento, 0,80 por desfavorecimento, 1 neutro. Para espécie com dois tipos, aplicar no máximo uma vez cada categoria; combinação de ambos resulta em 1,00. Multiplicar as contribuições de período e clima e limitar o resultado final a [0,64; 1,5625]. Esses valores são uma **proposta de balanceamento**, não números existentes ou validados. Se o resolver atual usa prioridade determinística sem pesos, conservar o algoritmo e aplicar preferências equivalentes; não trocar de método sem demonstrar necessidade.

## Algoritmo de referência

1. Obter o elenco-base pelo caminho existente.
2. Se não há condição ativa reconhecida, devolver o elenco-base intacto.
3. Construir pools por slot com filtros de bioma, raridade, evolução e regras de repetição. Ordenar candidatos por ID estável antes de desempatar.
4. Selecionar comuns de modo determinístico, com preferências e ramo de seed exclusivo por finalidade/slot. Não consumir aleatoriedade do combate ou dos drops.
5. Se nenhum comum mudou e há substituição elegível favorecida, escolher uma substituição determinística que conserve todos os invariantes. Registrar que a garantia de mudança foi aplicada.
6. Selecionar candidatos a chefe considerando o conjunto final de comuns e a regra evolutiva vigente. Validar conjuntamente; não “consertar” um chefe com espécie fora do pool.
7. Validar o conjunto. Se as restrições forem incompatíveis, tentar alternativa em ordem determinística limitada; se não houver solução, preservar o elenco-base e sinalizar motivo. Nunca entrar em busca ilimitada nem publicar elenco inválido.
8. Retornar a projeção da run e explicação compatível com sua visibilidade.

A garantia de pelo menos uma mudança introduz seleção condicionada. Portanto, os pesos acima **não são probabilidades marginais publicáveis**. Qualquer porcentagem mostrada ao jogador deve vir da distribuição final do algoritmo, incluindo fallback e restrições. Se isso for caro, comunicar “favorece” sem uma porcentagem inventada.

## Tempo e compatibilidade

DEC-10 deve fixar `timezoneDoMundo`, limites de dia/noite e precedência de condições. Padrão técnico proposto para o protótipo: UTC, dia 06:00–17:59:59 e noite 18:00–05:59:59, mostrado claramente na interface. Isso não é preferência atribuída ao usuário nem regra aprovada. Tornar configurável no conteúdo e confirmar em M0 se já há uma regra vigente, que tem precedência até decisão explícita.

Persistir a versão do resolver/conteúdo necessária para reproduzir a run, sem exigir gravação do elenco inteiro. Runs antigas sem metadado permanecem no resolver legado até terminar; não reprocessá-las silenciosamente pela regra nova. Se a arquitetura não suporta duas versões, planejar implantação após esvaziar runs antigas ou uma migração que preserve seu resultado. Não interromper runs sem política definida.

## Prévia sem informação contraditória

Antes da criação: mostrar elenco-base/possibilidades por período e explicar que condições da run podem alterar os encontros. Não chamar isso de “elenco garantido”. Após criação: mostrar o elenco efetivo e as condições já reveladas. Para a virada de período, enviar a versão/contexto público da prévia como precondição: se ficou desatualizada, o servidor devolve o contexto novo sem criar run, consumir stamina ou reservar encontros, e a tela pede nova confirmação. O contexto oculto de clima continua fora dessa prévia. Nomes de campos/códigos precisam ser conciliados com a API real.

Se o projeto optar por preview exato, deverá revelar previamente todas as condições relevantes ou fixá-las em uma pré-reserva válida até prazo explícito. Isso muda a regra de segredo de L-177 e exige DEC-10; não pode acontecer como efeito colateral de uma melhoria de interface.

## Plano de implementação

Localizar os módulos mencionados no histórico (`engine/elenco-estagio.mjs`, `run-avanco.mjs`, `avanco-clima.mjs`) e seus chamadores reais. Conferir os nomes/caminhos; o ZIP não contém esses arquivos. Manter preferências no content pack e resolução no engine. Integrar a criação/consulta de run no servidor. Integrar a projeção e a explicação no fluxo real de seleção/início; não apenas em uma fixture de componente.

Fora do escopo: novo bioma, espécies/arte novas, buffs de dano, reformulação de stamina, mudança de odds, preço de loja, sistema novo de clima e reescrita do harness. Corrigir somente impedimento direto que inviabilize verificar a entrega.

## Critérios de aceite e evidências

| Caso | Evidência exigida |
|---|---|
| Condições ausentes | Fixtures legadas dão o mesmo elenco e ordem; teste compara resultado esperado anterior |
| Noite/chuva com candidatos | Ao menos um comum muda; todos os slots mantêm bioma/raridade e chefes válidos |
| Pool impossível | Fallback determinístico, válido, com motivo; sem loop ou exceção não tratada |
| Mesma run consultada novamente | Mesmo resultado após refresh, avanço de horas e reconexão |
| Mudança de conteúdo | Run antiga preservada; nova usa versão nova |
| Fronteira de período | Prévia pública vencida exige nova confirmação antes de qualquer custo; o servidor decide o período |
| Sigilo | Resposta pré-início e seus metadados não revelam clima oculto |
| Duas abas/início repetido | Não criar gasto, reserva ou run duplicados por retry |
| Fluxo de usuário | Abrir jogo → escolher estágio → iniciar → ver elenco → recarregar → continuar; capturar evidência da versão testada |
| Regressão econômica | Quantidade de ondas, custos e recompensas preservada; nenhuma mudança fora de escopo |

Usar testes de invariantes e fixtures selecionadas, sem congelar um novo conjunto gigantesco de pixels. Uma amostra de seeds não prova o espaço inteiro: os filtros e a validação do resultado garantem as restrições estruturais; amostras servem para encontrar distribuições ruins e regressões.

Concluir com diff revisado, commit, comandos pertinentes, resultados e evidência da jornada. Atualizar RETOMAR/ROADMAP uma vez. Critérios ainda não demonstrados permanecem pendentes, mesmo que o código compile.
