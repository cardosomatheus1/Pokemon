# Economia do jogo e viabilidade do negócio

**Revisão 2.0.** A economia ativa permanece simulada até verificação do código e das decisões comerciais. Números novos abaixo são cálculos ou hipóteses explicitamente indicadas; não são previsão de receita.

## 1. Vocabulário consolidado

| Nome apresentado | Papel | Origem-alvo | Uso-alvo |
|---|---|---|---|
| PokéCash | Moeda da Arena/boutique | Grants simulados, ganhos e, futuramente, compra autorizada | Usos determinados por proveniência e política |
| PokéCoin | Moeda PvE | Avanço, OFF e atividades do mundo | Loja PvE e serviços definidos no catálogo |
| Estilhaço | Material | Farm e recompensas versionadas | Montagem/troca de itens ou cosméticos conforme receita |
| Doce de espécie | Material específico | Recompensas elegíveis e conversões voluntárias | Progressão da espécie |
| Fragmento de dossiê | Progresso de conhecimento | Encontro/captura e fontes declaradas | Desbloquear análises, sem revenda |
| League Points | Recurso futuro de temporada | Liga, quando construída | Catálogo próprio, sem conversão implícita |

“Trainer Coins” passa a ser referência histórica ao papel de PokéCoin; **não significa que ids de banco possam ser renomeados sem migração**. Orbe não entra como nova moeda nesta revisão. Essência é nome legado: é preciso verificar a migração efetiva para Estilhaço e suas quantidades antes de consolidar saves.

## 2. Três eixos que não podem virar um único booleano

Os modelos antigos misturam origem, disponibilidade e permissão. O alvo separa:

1. **Proveniência:** gratuito/promocional, comprado, ganho de origem gratuita, ganho de origem paga, elegível competitivo ou ajuste administrativo identificado.
2. **Disponibilidade:** disponível, reservado, pendente de liberação, sob análise/restrição, consumido.
3. **Permissão de uso:** Arena, boutique, laboratório, mercado interno, transferência, repasse externo.

Uma unidade liberada pelo provedor não ganha, por isso, permissão de boost ou repasse. `pending` descreve disponibilidade; `comprado` descreve origem. PC-T, PC-B e PC-C são categorias do desenho antigo que precisam de mapeamento explícito, não sinônimos automáticos de livre/comprado.

### Matriz recomendada para o próximo piloto simulado

| Origem | Arena simulada | Boutique simulada | Laboratório simulado | Transferência/repasse real |
|---|---|---|---|---|
| Grant gratuito | Sim, respeitando limites | Sim, se o catálogo permitir | Apenas receita explicitamente autorizada | Não |
| Compra simulada restrita | Sim | Sim | Não | Não |
| Retorno de stake restrito | Herda restrição | Herda restrição | Não | Não |
| Ganho de stake restrito | Herda linhagem paga simulada | Sim | Não por padrão recomendado | Não |
| Recompensa PvE | Conforme desenho da moeda | Conforme catálogo | Sim, se receita/limites permitirem | Não |
| Saldo sob pendência | Não por padrão recomendado | Não por padrão recomendado | Não | Não |

Essa matriz é **proposta para resolver DEC-03**. Não descreve uma migração já aplicada. Se o dono optar por liberar lucro de stake comprado para poder, documentar que há aceleração paga indireta e rever P5, rankings e RMT. Não usar o cadeado como prova de ausência dessa influência.

### Exemplo de liquidação

Stake 100, odd 2, payout bruto 200 e lucro 100. Na política recomendada, uma stake de origem comprada gera retorno com a mesma linhagem; não transforma o lucro em recurso “puro de gameplay”. Em stake mista, repartir payout e eventual arredondamento de modo determinístico e rastreável. A soma das parcelas deve ser exatamente o payout confirmado.

Materiais que exigem farm individual precisam ser vinculados à conta ou ter linhagem/limite compatível. Se forem compráveis de outro jogador com PokéCash comprável, a barreira de participação pode ser contornada. Slots, poções, boosts de XP e informação antecipada também entram na avaliação de vantagem; não basta manter a criatura da Arena normalizada.

## 3. Migração econômica sem perda de histórico

1. Inventariar campos e movimentos reais no cliente e no servidor, inclusive caches locais e compras simuladas.
2. Mapear cada id legado para **origem + disponibilidade + permissões**, com casos desconhecidos separados.
3. Rodar migração em cópia: preservar soma por unidade monetária, reservas e vínculo com operações de origem.
4. Comparar antes/depois por conta, moeda e origem. Total agregado igual não basta: uma conta não pode ganhar o que outra perdeu.
5. Não converter origem desconhecida em transferível, ganho elegível ou ativo apto a repasse.
6. Manter ledger antigo imutável; ajustes são novos movimentos com razão, versão e referência à migração.
7. Testar retomada no meio, reexecução, rollback operacional e resgate de backup antes de aplicar a dados reais.

Não mapear automaticamente `bonus → livre` e `transferivel → comprado`: ambos perdem informação do modelo anterior. A estratégia escolhida precisa ser aprovada antes da primeira migração de formato com acervo.

## 4. Correção da precificação e da interpretação estatística

### 4.1 Grandezas distintas

Para uma seleção com probabilidade verdadeira `p`, odd decimal bruta `o` e uma unidade de stake:

- retorno bruto esperado: `p × o`;
- lucro esperado: `p × o − 1`;
- margem esperada naquela seleção: `1 − p × o`;
- com `o=(1−m)/p`, lucro esperado: `−m`.

Isso pressupõe probabilidade correta para a informação disponível, sem truncamento/clamp/arredondamento relevante. No sistema real `p` é estimado; a margem realizada varia com seleção, distribuição de stakes, erro do modelo e dependência das apostas na mesma rodada.

**Overround não é a margem de retorno.** Se todas as odds são `(1−m)/p_i`, então `sum(1/o_i)−1 = m/(1−m)`. Com margem de 8%, o overround é aproximadamente **8,6957%**. Mostrar um como se fosse o outro gera divergência mesmo sem bug.

### 4.2 O erro de 19,22%

Para a aproximação de segunda ordem do inverso de uma proporção amostral simples, longe de zero:

`viés absoluto da odd ≈ (1−p)/(n·p²)`

`viés relativo da odd ≈ (1−p)/(n·p)`

Com `p=0,016`, `n=20.000`: odd justa 62,5; viés absoluto aproximado **0,1921875**; relativo **0,3075%**. A Spec e o estudo confundiam pontos de odd com percentual. L-023 reconheceu a unidade errada, mas a correção não chegou às fontes principais.

Ressalva: a expressão é aproximação; o estimador puro `n/X` nem sequer é definido quando `X=0`. Não utilizar Jensen como justificativa para uma correção exata de um estimador com suavização diferente.

### 4.3 Referência exata para Laplace

Se `X ~ Binomial(n,p)` e existem `K` seleções, `p_hat=(X+1)/(n+K)`. Então:

`E[1/p_hat] = (n+K) × [1−(1−p)^(n+1)] / [(n+1)·p]`

Derivação: usar `1/(x+1)=integral_0^1 t^x dt` na esperança binomial; integrar `(1−p+p·t)^n` e multiplicar por `n+K`.

Para `K=12`, com a cauda exponencial desprezível, o viés relativo é aproximadamente `11/(n+1)`: **+0,0550% em 20 mil** e **+0,00714% em 154 mil**. A tabela negativa da L-023 não é reproduzida por esse modelo binomial independente. Pode refletir outras condições ou erro de medição; sem script/dados originais, permanece uma divergência a investigar, não base para alterar odds.

Não aplique “correção do viés” no motor por este documento. Primeiro reproduza a medida com seeds independentes, estimador efetivo e versões fixas. O script fornecido verifica a álgebra e somas binomiais pequenas, **não o RNG do jogo**.

### 4.4 O que 154 mil simulações garantem

Erro-padrão relativo aproximado: `sqrt((1−p)/(n·p))`. Para `p=0,016` e `n=154.000`, dá aproximadamente **1,9984%**. É um erro-padrão, não precisão absoluta garantida.

Para um intervalo marginal normal de aproximadamente 95% com meia largura relativa de 2%: `n ≈ 1,96² × (1−p)/(p×0,02²) = 590.646`. Exigir simultaneidade sobre todas as seleções demanda outro critério; não multiplicar slogans por 12 sem definir a cobertura.

Além disso, 1,6% era referência histórica agregada. Uma composição específica pode ter probabilidade muito menor. Planejar:

- manter 154 mil como baseline inicial do comportamento existente;
- registrar incerteza por seleção e por rodada;
- avaliar caudas com amostra de referência independente;
- se a precisão for insuficiente, publicar indisponibilidade/limite de oferta conforme política prévia ou aumentar lote antes de abrir;
- se houver parada adaptativa, usar critério estatístico adequado ao monitoramento sequencial; não parar repetidamente assim que um intervalo comum ficar conveniente.

### 4.5 Piso de odd

`ODD_MIN=1,05` não preserva uma margem fixa em qualquer `p`: se `p>0,92/1,05≈87,619%`, elevar a odd ao piso reduz a margem de 8%; acima de `p≈95,238%`, passa a criar EV positivo. Medir se esse caso existe e recusar oferta incompatível em vez de fazer clamp silencioso. Odd de exibição e odd de liquidação precisam da mesma regra de arredondamento.

## 5. Exposição e conservação

Para vencedores mutuamente exclusivos na Arena, a exposição bruta por seleção é `P_i = sum(stake_j × odd_j)` dos tickets daquela seleção. O maior payout possível da rodada é `max_i(P_i)`, não a soma dos payouts de todos os possíveis vencedores. A soma pode ser usada como limite conservador, mas precisa ser nomeada como tal.

Definir separadamente limite por ticket, seleção, rodada e disponibilidade de caixa/reserva do regime usado. Eventos correlacionados entre mercados podem produzir pagamentos simultâneos; nesses casos não reutilizar o máximo simples sem modelar os cenários conjuntos.

No mercado mútuo, a conservação de pot elimina exposição de resultado financiada pela casa **naquele mercado**, mas não elimina risco de chargeback, estorno, fraude, indisponibilidade, disputa ou custódia. “Passivo estrutural zero” não significa “negócio sem passivo”.

## 6. Fontes, usos e metas de progressão

Todo recurso tem unidade, emissor, fato gerador, teto, consumo e registro de movimento. A unidade de análise deve ser **por jogador/dia de atividade e por hora remunerada**, com p10/p50/p90, não apenas uma média global.

| Recurso | Fontes a conferir | Usos a conferir | Risco principal |
|---|---|---|---|
| PokéCoin | Encontros, abates, baú, venda NPC | Bolas, poções e serviços | Farm repetido sem encontro continuar emitindo sem ralo |
| PokéCash gratuito | Grants, Arena simulada, recompensas aprovadas | Arena, boutique e receitas autorizadas | Consumir banca antes de o jogador entender o loop |
| Estilhaço | OFF, baú e outras fontes efetivamente ligadas | Receita com catálogo e regra de duplicata | Material existir no saldo e não ter uso na tela |
| Pedras | Bioma/estágio e outras fontes declaradas | Evolução e laboratório | Compra no mercado contornar exigência de participação |
| Instâncias | Captura | Equipe, evolução, conversão e mercado futuro | Oferta crescente sem demanda/sink de duplicatas |
| Poções | Drop/loja | Consumo em run | Ganho de farm exceder custo e tornar compra obrigatória |

**O limite de encontros não controla tudo:** runs sem captura continuam emitindo moeda, XP e itens. Simular alto poder, baixa duração, stamina regenerada, múltiplas criaturas, reserva OFF, poções e slots no mesmo modelo. Se houver excesso, ajustar uma receita/limite específico; não criar uma parede geral de sessão por reflexo.

### Plano de calibração

Perfis: casual (sessões curtas + OFF), regular, intensivo, otimizado e conjunto de contas coordenadas. Horizontes: 7/30/90/180 dias. Executar também adversidades: estoque inicial alto, uso de consumíveis no teto, preços de mercado extremos e mudanças de clima.

Saídas: tempo até primeira captura/evolução/novo estágio; runs completas; espécies novas; estoque por recurso; frequência de falta de bolas/poções; concentração de ativos; saldo inútil; produção negociável por hora; diferença de progressão paga/gratuita.

Bandas iniciais são **hipóteses de UX**, a confirmar com o dono e piloto: primeira recompensa útil na primeira sessão; objetivo seguinte visível ao sair; uma evolução acessível sem pagamento nos primeiros dias; ausência de bloqueio por saldo obscuro. Não fixar seis meses até B7 a partir de uma única taxa de drop.

## 7. Laboratório B1–B7

Preservar o objetivo: aumento perceptível dos atributos da criatura, custando PokéCash elegível e materiais, sem alterar Arena. A curva completa não está aprovada. Primeira entrega é um ensaio B1 e uma planilha lógica de progressão, não sete níveis liberados.

Definir por degrau: custo incremental, custo acumulado, espécies elegíveis, ganho por atributo, relação aditiva/multiplicativa, regras em evolução/venda, teto, possível reversão e mudança de duração/sucesso de run.

Se moeda e materiais são farmados simultaneamente, o tempo é aproximadamente `max(tempo_moeda, tempo_material)`, e não sua soma. Se a moeda pode ser obtida pagando, o menor tempo passa a ser o tempo do material; a redução relativa é `1−tempo_material/tempo_sem_compra`. Exigir que material corresponda a 60% do tempo-base limita a redução a 40% **nessa simplificação**, não garante metade nem ausência de P2W.

O ganho de força e a redução de duração multiplicam a produção. Medir ambos: +10% de força não implica +10% de rendimento. Não preencher a curva B1–B7 apenas multiplicando custos por 1,8.

## 8. Estilhaço e itens aleatórios

Receita declara custo, pool elegível, pesos, garantia, tratamento de repetidos e destino do excedente. Exibir chance por resultado relevante e definir se a garantia é por conta, categoria ou receita.

A antiga regra “11ª troca garante item novo” falha quando a coleção já está completa. Definir nesse caso escolha entre itens elegíveis, compensação previamente informada ou receita desativada com motivo; não loop infinito. Alterar catálogo exige regra de migração da garantia.

Um item útil sempre pode ser entregue sem garantir uma captura ou devolução integral do custo. Separar recompensa mínima de expectativa de lucro. A eventual negociabilidade do resultado entra no mesmo modelo de linhagem e no projeto de RMT.

## 9. Negócio: três cenários distintos

| Cenário | Receita modelada | O que precisa ser provado |
|---|---|---|
| A — conteúdo | Cosméticos e passe com recompensas conhecidas | Retenção, conversão, custos, direitos e aceitação dos pagamentos |
| B — economia fechada paga | Conteúdo + moeda/ticket com permissões específicas | Tudo de A + avaliação de cada fluxo pago/aleatório e proteção |
| C — mercado/RMT | Conteúdo + comissão efetiva de transação | Tudo aplicável + demanda, escrow, disputas, repasses e aceitação explícita do modelo |

A é cenário de planejamento menos dependente de mercado financeiro entre jogadores, **não uma declaração de autorização automática**. B e C não são somados indiscriminadamente; a compatibilidade do produto combinado precisa ser estabelecida.

### Fórmulas de gestão

`receita_conteudo = MAU × conversao_cosmetico × pedidos_por_comprador × ticket_cosmetico + MAU × adesao_passe × preco_passe`

`receita_comissao = GMV_liquidado × taxa_da_plataforma`

`contribuicao = receita_da_plataforma − taxas_pagamento − tributos_modelados − devolucoes − perdas_fraude − custo_variavel`

`MAU_equilibrio = custo_fixo / contribuicao_por_MAU`, somente se contribuição por MAU for positiva.

GMV não é receita da plataforma. Valor destinado ao vendedor não é margem. Rake/burn de moeda já vendida não cria um segundo recebimento de reais. Entrada de caixa, saldo de usuário e reconhecimento contábil de receita são conceitos diferentes; política contábil/fiscal precisa ser validada para o modelo escolhido.

`LTV_contribuicao = soma_t(probabilidade_de_atividade_t × contribuicao_condicional_t)` com coorte/denominador coerentes. CAC por cadastro não pode ser comparado com LTV por pagante sem conversão entre os denominadores. Custos de aquisição recorrentes para repor churn entram no caixa, mesmo no ponto de equilíbrio operacional.

### Verificação possível dos números antigos

Usando somente a contribuição arredondada publicada de R$ 3,12, `75.000/3,12≈24.039 MAU`. O estudo registra 24.037, compatível com entradas não arredondadas; não é prova de erro. Com R$ 2,908 e fixo de R$ 87 mil, o cálculo aproximado é 29.918, perto dos 29.922 publicados. Sem o script original, não afirmar reprodução exata.

Esses cenários dependem fortemente de PC-T comprado e de um desenho anterior de Liga/Exchange. Não reutilizar “24 mil MAU viabilizam o projeto” para a boutique e o RMT posteriores. A revisão fornece um **modelo ilustrativo de conteúdo sem receita de PC-T**, parametrizado e reproduzível em `support/revisao/`, sem pretensão de substituir dados observados.

### Preço de R$ 5

É hipótese de preço, não conclusão. A margem por pedido precisa incluir taxa fixa, suporte, refund e arte. Exemplo puramente ilustrativo: com taxa de 3% + R$ 0,40, uma compra de R$ 5 paga R$ 0,55 (11%); uma de R$ 20 paga R$ 1,00 (5%). Isso não prova que R$ 20 converte melhor. Comparar contribuição por visitante e retenção, preservando transparência de preço.

### Infraestrutura

Recalcular custo de simulação por rodadas compartilhadas, não por jogador. A 154 mil simulações e 23 µs por batalha, são **3,542 s de CPU por rodada** e **42,504 CPU-h/mês** a uma rodada/minuto. É extrapolação do benchmark histórico, não benchmark novo nem custo de hospedagem. Cadência real, arenas paralelas, API, banco, SSE, logs, backups e prevenção de fraude precisam entrar no envelope.

## 10. RMT: desenho completo preservando a intenção

RMT continua no produto futuro. A primeira entrega é um documento de fluxo e um protótipo simulado de uma única classe de ativo. “Repasse” é rótulo de UX; não substitui definição de quem cobra, detém valores, entrega ativo, responde a disputa e paga vendedor.

| Estado | Operação e proteção |
|---|---|
| Anunciado | Ativo elegível e não ocupado; preço/taxa/versionamento visíveis |
| Reservado | Item entra em escrow; comprador não recebe nem pode revendê-lo ainda |
| Pagamento pendente | Pedido com validade; notificação do provedor verificada |
| Pagamento confirmado | Status do provedor é conciliado, sem duplicar por webhook |
| Entregue | Posse muda atomicamente com recebível do vendedor |
| Em retenção/análise | Não há repasse ainda; prazo e motivo são conhecidos |
| Repasse solicitado | Chave/idempotência por recebível; saldo não é pago duas vezes |
| Repassado | Comprovante e reconciliação do provedor |
| Disputa/estorno | Tratamento definido para item entregue, revendido ou consumido |

Não depender de confirmação voluntária do comprador sem prazo: isso permite travar vendedor indefinidamente. Não prometer que retirar um PokéCash “bloqueado” resolve a obrigação de pagar; usar recebível financeiro próprio, separado da moeda jogável.

Definir antes do piloto pago: responsabilidade por chargeback, quem arca com taxas não devolvidas, janela de contestação, reserva de perdas, recursos indisponíveis, documentos exigidos, critérios de suspensão, proteção de dados e suporte. Um PSP com split é componente; é necessário que aceite contratualmente o modelo concreto. Não presumir aceite por ter integração técnica.

## 11. Decisões preservadas como futuras

PC-C, hurdle de 2,5%, HWM persistente, Exchange 5:1, rake 10% e divisão 70/20/10 ficam como **desenho histórico de uma economia competitiva específica**. Não são parâmetros automaticamente aprovados para o novo mercado de criaturas. Se retomados, simular saldo disponível, perdas acumuladas, reservas, coortes e estratégia adversarial conjuntamente.

Testar saldo e entitlement separados: gerar elegibilidade não cria moeda; insuficiência de PC-B exige política de acumular ou extinguir direito. Reserva de PC-T virtual não equivale a caixa disponível para repasse em reais.

## 12. Critério de passagem

Economia pronta para piloto simulado: catálogo sem recursos órfãos, movimentos reconciliados, nenhuma emissão/consumo duplicada e progressão compreensível. Economia pronta para dinheiro real: além disso, DEC-01/02/03 resolvidas para o escopo, operação com recuperação/disputa, contratação de pagamentos e validações pertinentes. Esse segundo estado não foi demonstrado pelo ZIP.
