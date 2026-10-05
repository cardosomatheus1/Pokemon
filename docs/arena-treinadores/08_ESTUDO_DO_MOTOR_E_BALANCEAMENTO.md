# Estudo do motor de batalha e plano de balanceamento

> Referência histórica de 03/10/2026. Para o código aplicado em 04/10, consulte
> `09_CONTRATO_DA_IMPLEMENTACAO.md` e a Spec §§8.17/9.17. Estado e fila ficam
> exclusivamente em `docs/RETOMAR.md` e `docs/ROADMAP.md`.

**03/10/2026 • proposta AT6/GQ v1.2 • medições do código atual e experimentos externos.**

Base: branch `claude/docs-planning-tests-6hjthq`, commit [`f6fe58ffb739ebb42d584f0d827e8d1984b14738`](https://github.com/cardosomatheus1/Pokemon/tree/f6fe58ffb739ebb42d584f0d827e8d1984b14738), pack `pokemon_kanto_v1`, regras `tbe-2`. O remoto foi conferido em 03/10. As propostas abaixo foram incorporadas aos documentos; **o motor do jogo não foi alterado**.

## 1. Diagnóstico e decisão recomendada

A arena comum já favorece espécies mais fortes em média, preservando zebras. A Jornada de ginásios/Liga já calcula atributos, tipos e golpes reais. O Avanço dos biomas ainda resolve a vitória pela força agregada e encena os golpes depois. No PvP 6×6, IVs têm um limite pequeno nos atributos, mas esse limite **não garante uma vantagem pequena na vitória**: velocidade, concentração de ataques e eliminações precoces amplificam diferenças.

Recomendo conservar o núcleo de dano atual, compartilhar suas regras entre os combates da coleção e testar uma iniciativa mais gradual no motor de treinadores. A progressão deve melhorar o time de verdade; o pareamento deve impedir que ele explore adversários muito abaixo. Tipos e preparação continuam capazes de vencer diferenças moderadas. Não ajustar resultados por saldo, gasto, sequência de perdas ou necessidade de receita.

O piloto recomendado usa iniciativa com variação de ±10%, IVs/naturezas com os pesos atuais e pareamento mais estreito. **É uma candidata medida, ainda sem validação do metagame de jogadores.** Não há motivo para substituir a arena comum pelo PvP nem transferir para os times próprios sua compressão de atributos.

## 2. Os modos existentes e o que cada um lê

| Regra | Arena comum de apostas | Avanço dos biomas | Jornada: ginásios/Liga | PvP de times atual/final |
|---|---|---|---|---|
| Participantes | 12 espécies sorteadas de um elenco de 76 | Equipe enviada contra waves | Titulares selecionados contra treinador | Times próprios congelados em snapshots |
| Nível | Fixo em 50 | Real, no poder agregado | Real nos atributos e dano | Real nos atributos e dano |
| Base da espécie | Stats comprimidos 50% em direção à média dos 12 | Soma dos seis stats | Cada stat separadamente | Cada stat separadamente |
| IV/natureza do indivíduo | Não usa coleção | Não entram no resolvedor | Entram, com peso limitado | Entram, com peso limitado |
| Golpes | Atribuídos pelo motor | Nome/efeito visual; não decide a wave | Moveset válido do jogador | Moveset válido do snapshot |
| Tipo, STAB, resistência e imunidade | Sim | Não no dano; tipos afetam bioma/clima | Sim | Sim |
| Precisão e crítico | Sim | Não decidem golpes reais | Sim | Sim |
| Velocidade | Intervalo entre ações | Não lê stat de velocidade individual | Ordem dos sobreviventes por turno | Ordem dos sobreviventes por turno |
| Regras particulares | Clima, killstreak, tempestade | HP agregado, ameaça e ritmo | Seleção de titulares; HP extra em raid | Presets e regras competitivas |

Fontes do projeto: `engine/engine.mjs` (`criarMotor`, `montarElenco`, `simular`); `engine/preco.mjs` (`simularLote`); `engine/primitivas.mjs`; `engine/treino-batalha.mjs`; `engine/wave.mjs`; `app/modules/avanco-conta.mjs` (`paraOMotor`); `app/modules/moveset-dados.mjs`; `app/modules/jornada-conta.mjs`; `app/modules/partida-dados.mjs` (`confrontoDaLiga`).

### A arena comum não é um sorteio uniforme de vencedor

O sorteio determina quais espécies entram. Depois, ataques, atributos, alvos, clima e eventos determinam a luta. Todos estão no nível 50, mas os stats continuam diferentes. `BALANCE = 0.5` aproxima cada stat da média daquela rodada; não torna os participantes iguais. IVs da coleção não podem comprar vantagem nesse modo.

### O Avanço precisa de uma integração de combate, se deve ensinar os mesmos fundamentos

`paraOMotor` transmite espécie, nível, vínculo, foco, força base somada e tipos. Não transmite IVs, natureza ou moveset. `poderDaEquipe` aplica crescimento por nível e pesos por posição de força. A chance da wave é:

\[
p=\operatorname{clamp}_{0{,}05}^{0{,}95}\left(\frac{(P/A)^{2{,}2}}{1+(P/A)^{2{,}2}}\right)
\]

`P` é poder da equipe; `A`, ameaça do elenco do estágio. A ameaça usa médias do pool, não o confronto de cada atacante com cada defensor sorteado. O roteiro distribui os golpes depois do resultado. Trocar um golpe não muda essa vitória. É um modelo de progressão agregada, com papéis próprios de foco/clima, mas insuficiente para ensinar o sistema de dano desejado.

**Não confundir isso com os ginásios.** A Jornada já usa `treino-batalha.mjs`. A correção do Avanço é proposta em AT6-13; a revisão dos ginásios é calibragem desse motor compartilhado, não migração do resolvedor de waves para a Jornada.

## 3. Fórmula efetivamente executada na Jornada e no PvP

Para um atributo diferente de HP:

\[
S=\left\lfloor \left(\left\lfloor\frac{(2B+31)L}{100}\right\rfloor+5\right)I N\right\rfloor,
\quad I=1+0{,}10\frac{IV-15{,}5}{31}
\]

`B` é o stat base, `L` o nível real. IV de 0 a 31 produz multiplicador de 0,95 a 1,05; natureza favorável/desfavorável multiplica por 1,05/0,95. O termo fixo `31` **não é o IV individual**: o IV do indivíduo entra depois, nesse multiplicador limitado. HP usa a fórmula correspondente de HP, o IV de HP e `vidaX` nos chefes autorizados. Natureza não altera HP. IVs e natureza combinados podem produzir até +10,25% no stat favorecido, antes do arredondamento.

Quando o golpe acerta, o dano vem de:

\[
D=\operatorname{round}\left(\left(\left\lfloor\frac{\lfloor2L/5+2\rfloor\,P\,(A/D_f)}{50}\right\rfloor+2\right)T E C V\right)
\]

`P`: poder do golpe; `A/D_f`: Ataque/Defesa no físico ou Ataque Especial/Defesa Especial no especial; `T`: STAB, 1,5 se o tipo do golpe é do atacante; `E`: produto da efetividade nos tipos do defensor; `C`: 1 ou 1,5 no crítico; `V`: uniforme de 0,85 a 1. Há dano mínimo 1 quando não imune. Imunidade produz zero e não ganha crítico. O código conserva as operações e arredondamentos de `primitivas.mjs`.

A precisão é sorteada **antes** do dano: `acc` do golpe, ou 0,92 quando ausente. O tipo determina efetividade; não determina por si só a precisão. Crítico tem probabilidade 1/16 nos golpes que acertam e não são imunes. Pokémon do tipo Normal e golpes Normal podem dar crítico.

### Tipos e especialização precisam continuar valendo mais que otimização pequena de IV

Efetividades possíveis incluem 0, 0,25, 0,5, 1, 2 e 4. Uma fraqueza dupla pode quadruplicar o dano; IV alto não deve apagar isso. Distribuição de stats importa: dois Pokémon com a mesma soma base não são equivalentes se um ataca pelo lado especial e o outro pelo físico. Natureza/IV relevantes são os do papel desempenhado, não só o “potencial total”.

“Treinado” hoje significa nível, forma evoluída, golpes liberados/escolhidos e preparação do time. **EVs, habilidades, PP, prioridades, recargas e um sistema completo de status não estão implementados na TBE.** Shiny não é força. Não acrescentar buff oculto por tempo de conta ou por compra.

## 4. Metodologia e limites das medições

O pacote inclui [`estudo/estudo-combate.mjs`](estudo/estudo-combate.mjs) e [`estudo/resultados-combate.json`](estudo/resultados-combate.json), com fixtures, sementes, contagens e resultados detalhados. O script importa o jogo do checkout indicado e não escreve no banco nem altera o repositório.

- **932.000 simulações de combate** entre TBE, candidatos experimentais e arena comum; além de **40.000 runs de Avanço** e **800.000 tentativas de golpe**. Não somar estas unidades como se fossem o mesmo experimento.
- Confrontos fixos: 2.000 raízes, duas lutas por raiz com lados trocados, preset Equilibrado nos dois lados. Pontuação de vitória 1, derrota 0 e empate 0,5; onde não houve empate, pontuação e win rate coincidem.
- Espelho principal: Charizard, Blastoise, Venusaur, Dragonite, Snorlax e Alakazam, nível 60, IV 15 em cada atributo, natureza Hardy e moveset padrão válido. Ao aumentar nível, preservar os golpes para isolar atributos/dano. São fixtures de análise, sem afirmar que sejam a composição dominante.
- Diversidade: 120 pares de times distintos, seis espécies sem repetição sorteadas do elenco da arena; níveis 60 e golpes legais. Cada cenário melhora **ambos os lados separadamente**; 100 raízes por direção e troca de lados, 400 lutas por par/cenário. Isso retira o viés de uma amostra que por acaso sorteie times A melhores.
- Intervalos de 95% usam erro padrão por raiz no confronto fixo e por par de times na diversidade. As lutas trocadas não são tratadas como observações independentes. Empates de chance em 50% por simetria podem ter intervalo degenerado; resultados amostrais de 0%/100% não provam impossibilidade/certeza.
- Arena comum: 64 pools reais, 1.000 simulações por pool, clima sorteado como na precificação; mais uma pool fixa com 20.000 simulações. Comparação por soma de stats base é descritiva, não isola tipo, moveset ou velocidade.
- Avanço: Floresta estágio 1, HP inicial 100, sem poção/clima, sem crédito de XP durante o experimento e equipe fixa. `simularAvanco` usa o resolvedor real; não mede tempo da run contínua nem a progressão de XP dentro dela. Trio é diagnóstico do resolvedor, não comprovação do limite de envio da UI.
- Golpes: atacantes/defensores sintéticos com stats 100 e nível 60 para isolar precisão/tipo; 100.000 tentativas por cenário. Não são odds de Pokémon completos.

As 5 suítes relacionadas (`primitivas`, `treino-batalha`, `wave`, `jornada-equilibrio`, `liga-partida`) foram executadas pelo arnês do projeto: **51 testes, zero falhas**. Isso confirma o recorte verificado, não certifica o balanceamento nem representa a suíte completa.

## 5. Resultados: vantagem real e pontos de ruptura

| Melhoria no time | Espelho atual (intervalo 95%) | Times diferentes (intervalo 95%) |
|---|---|---|
| Nenhuma | 50,0% (50,0%–50,0%) | 50,0% (50,0%–50,0%) |
| +1 nível | 90,9% (89,7%–92,1%) | 56,9% (55,4%–58,3%) |
| +2 níveis | 92,1% (91,0%–93,3%) | 61,0% (59,1%–62,8%) |
| +5 níveis | 95,9% (95,0%–96,8%) | 80,4% (77,8%–83,1%) |
| +10 níveis | 99,8% (99,6%–100,0%) | 94,8% (93,2%–96,4%) |
| IV 15 → 16 em tudo | 90,4% (89,2%–91,7%) | Não medido neste recorte |
| IV 15 → 20 em tudo | 91,0% (89,8%–92,2%) | 57,4% (55,9%–58,9%) |
| IV 15 → 31 em tudo | 92,7% (91,6%–93,8%) | 67,7% (65,3%–70,0%) |
| Só IV de velocidade 15 → 31 | 91,0% (89,7%–92,2%) | 55,0% (53,6%–56,5%) |

A pontuação pareada de 50% na igualdade é uma identidade da troca de perspectivas; não testa viés por si só. No espelho sem troca de perspectiva, o lado A venceu **49,8% de 2.000 raízes** na TBE atual, 50,25% na candidata ±5% e 50,85% na ±10%. O recorte não evidenciou viés importante, mas não esgota efeitos de slots e presets.

### Arena comum: chance por espécie quando está presente

| Quartil por soma de stats base | Faixa de soma base | Vitória condicional à presença |
|---|---|---|
| 1 (19 espécies) | 288–450 | 4,4% |
| 2 (19 espécies) | 450–490 | 7,5% |
| 3 (19 espécies) | 490–505 | 9,4% |
| 4 (19 espécies) | 505–600 | 12,3% |

Cada rodada tem 12 participantes; uma média uniforme seria 8,33%. As espécies mais fortes venceram mais em média, sem garantir que toda espécie de soma maior supere qualquer uma de soma menor. Quartis têm 19 espécies e empates de soma podem atravessar limites. São frequências condicionais em 64 pools, não odds universais nem estimativa causal do stat base.

Na pool fixa de 20.000 simulações, Dragonite venceu 30,8%, Aerodactyl 27,5%, Starmie 5,9% e Ditto 1,0%. Aerodactyl (soma 515) superou Starmie (520) nessa composição: tipos, golpes e velocidade também importam. A chance deve ser calculada para a rodada e seu clima, como o código já faz.

### Avanço atual: nível ajuda; IV não entra

| Controle Floresta 1 | Chance da primeira wave | Run completada na amostra |
|---|---|---|
| Bulbasaur nível 1 | 72,1% | 42,5% |
| Bulbasaur nível 12, IV 15 | 85,9% | 99,0% |
| Bulbasaur nível 12, IV 0 | 85,9% | 99,0% |
| Bulbasaur nível 12, IV 31 | 85,9% | 99,0% |
| Bulbasaur nível 30 | 94,0% | 100,0% |
| Bulbasaur nível 40 | 95,0% | 100,0% |
| Venusaur nível 40 | 95,0% | 100,0% |

100% significa nenhuma falha nas 5.000 runs daquele controle, não garantia. Nível/forma podem melhorar HP final e ritmo mesmo quando sucesso satura. Mais 1.000 controles com as mesmas sementes confirmaram resultados idênticos ao alterar os campos ignorados de IV/natureza/golpes/tipo ofensivo, conservando força/pool/clima. Tipos continuam relevantes para elegibilidade de bioma e bônus climático fora desse controle.

### Dano, precisão e crítico: controles com stats iguais

| Golpe e tipos do defensor | Precisão declarada | Efetividade | Erros medidos | Críticos nos acertos | Dano médio por tentativa |
|---|---|---|---|---|---|
| Surf → normal | 100,0% | 1× | 0,0% | 6,3% | 68,70 |
| Hydro Pump → normal | 80,0% | 1× | 20,1% | 6,3% | 67,45 |
| Surf → fire | 100,0% | 2× | 0,0% | 6,3% | 137,41 |
| Surf → rock/ground | 100,0% | 4× | 0,0% | 6,3% | 274,81 |
| Surf → water | 100,0% | 0,5× | 0,0% | 6,3% | 34,36 |
| Surf → water/dragon | 100,0% | 0,25× | 0,0% | 6,3% | 17,19 |
| Thunderbolt → ground | 92,0% | 0× | 8,1% | 0,0% | 0 |
| Body Slam → normal | 92,0% | 1× | 8,0% | 6,3% | 40,40 |

Atacante Água, stats ofensivos/defensivos 100, nível 60. Surf/Hydro Pump têm STAB; Body Slam/Thunderbolt não. Imunidade não sorteia crítico: a coluna de Thunderbolt contra Terrestre fica zero. A precisão continua sendo checada antes; erro e imunidade são eventos distintos.


### A pequena mudança de IV pode ser invisível no power e enorme no espelho

IV 15 para 16 em todos os atributos manteve o power do time em **4.575 nos dois lados**, mas a vitória foi a cerca de 90%. O arredondamento dos stats e o desempate de velocidade mudaram quem age primeiro. IV só de velocidade de 15 para 31 deu cerca de 91%; IV só de HP ou Ataque físico ficou perto de 50% nesse espelho específico. Isso não torna esses stats inúteis: outros alvos, categorias e pontos de KO podem valorizá-los.

O `power` dá 10 pontos por nível e só até 10 pontos por potencial individual. Não lê natureza, precisão, categorias de dano, ameaças de tipo ou ordem real de ações. **Não é probabilidade de vitória.** Nem um filtro de power exatamente igual detectaria esse caso. Mostrar IV por atributo e velocidade comparada importa mais que vender “31 em tudo” como selo universal.

### Por que o 6×6 amplifica a velocidade

Todos os seis sobreviventes podem agir a cada turno. Quem cai antes da própria ação perde a resposta. A IA concentra golpes nos pares com maior dano esperado. Um pequeno ganho de velocidade pode iniciar uma cascata de KOs. A maioria dos espelhos estudados terminou em cerca de três turnos. Um limite de ±5% nos stats não controla sozinho essa cascata.

### A antiga faixa proposta ainda permitiria um massacre

O espelho de nível 70 contra 60 tem power 5.175/4.575 = **1,131** e diferença média de nível 10. Passaria pela sugestão anterior de razão até 1,20 e diferença até 10, embora tenha vencido cerca de **99,8%**. Essa sugestão foi retirada dos documentos como parâmetro do piloto. Apenas estreitar power também não resolve o caso de IV 15/16 com power igual.

## 6. Precisão, crítico e “sensação Game Boy”

**Sim, os jogos originais têm crítico.** A desmontagem verificável de Red/Blue em [pret/pokered](https://github.com/pret/pokered) contém `CriticalHitTest` e `MoveHitTest` em [`engine/battle/core.asm`](https://github.com/pret/pokered/blob/master/engine/battle/core.asm). Ali, a taxa de crítico usa velocidade base; a checagem de acerto usa precisão/evasão e tem a particularidade histórica de 255/256 em vez de 100% para golpes comuns na precisão máxima.

A referência serve para tipos, atributos, golpes, precisão, crítico, velocidade e quatro opções. **Não recomendo copiar bugs históricos ou dar ao rápido simultaneamente ordem melhor e taxa maior de crítico.** O projeto já tem IV 0–31, naturezas e categorias por golpe, que compõem uma adaptação posterior. Manter crítico fixo de 6,25%, dano crítico 1,5× e golpes de precisão 1 com acerto real de 100% é uma escolha explícita de balanceamento.

No catálogo atual há 66 golpes: 40 sem precisão explícita, portanto 92%; 11 com 100%; os demais têm precisões entre 60% e 96%. Os nomes não garantem a mecânica do jogo original. Quick Attack não ganha prioridade, Solar Beam não carrega, Hyper Beam não recarrega, Body Slam não paralisa e Psyshock não mira automaticamente Defesa física apenas pelo nome. O comportamento vem de `p`, `cat`, `acc` e tipo.

### Risco do golpe e qualidade da IA

Surf tem poder 90 e precisão 100%; Hydro Pump, 110 e 80%. No controle, o dano médio por tentativa foi aproximadamente **68,70 contra 67,45**. Hydro Pump bate mais quando acerta; Surf rende mais na média. A IA Equilibrada também prefere Surf se os demais fatores forem iguais: compara 90 contra 88 antes dos outros multiplicadores.

Isso mostra que “mais poder” não significa “melhor golpe”. Hydro Pump pode ser útil quando seu dano maior permite um KO que Surf não consegue; a seleção atual não calcula essa probabilidade de KO de forma completa. Fire Blast, por outro lado, supera Flamethrower no escore esperado do catálogo (110×0,85 contra 90×0,92); sem PP/custos/efeitos adicionais, o segundo pode perder função na mesma situação.

AT6-14 deve tornar precisão explícita, auditar golpes dominados e revisar a IA. Preservar precisão por golpe, com risco informado, em vez de transformar ataques de todo um tipo em imprecisos. Crit chance elevada só para golpes específicos, se adicionada depois, precisa de metadado, novo equilíbrio e versão — não inferir pelo nome de Slash, por exemplo.

## 7. Candidatos testados para iniciativa

A cópia experimental muda apenas a ordenação das ações. Para cada sobrevivente, a chave de iniciativa por turno é:

\[
J=S_{vel}\,(1+j(2u-1)),\quad u\sim U[0,1]
\]

`j` foi testado em 0,05 e 0,10. O sorteio reaproveita o número que a TBE já gera para desempates; nenhum sorteio extra foi acrescentado ao laço. Ordenar por `J` e desempatar por `u`. Dano, IV, natureza, precisão, crítico, alvos e HP ficam iguais. A cópia sem alteração foi comparada ao motor real em **100 fixtures com eventos completos**, todas idênticas.

| Cenário | TBE atual | Iniciativa ±5% | Iniciativa ±10% |
|---|---|---|---|
| Espelho: +1 nível | 90,9% | 64,6% | 58,1% |
| Espelho: +5 níveis | 95,9% | 94,8% | 88,5% |
| Espelho: IV 15 → 16 | 90,4% | 57,8% | 54,1% |
| Espelho: IV 15 → 31 | 92,7% | 83,5% | 72,0% |
| Times diferentes: +1 nível | 56,9% | 55,9% | 56,0% |
| Times diferentes: +5 níveis | 80,4% | 80,4% | 80,3% |
| Times diferentes: IV 15 → 31 | 67,7% | 68,3% | 68,5% |

**Recomendação de piloto: ±10%.** Pequenas diferenças viram vantagens menores; diferenças maiores continuam fortes. Com ±10%, se a razão das velocidades passar de 1,10/0,90 ≈ 1,222, o mais rápido age primeiro em qualquer sorteio. Nos demais casos, ele tem maior chance de agir primeiro. A variável é iniciativa por turno, não desvio secreto do stat persistido.

Esse candidato aproxima os espelhos da vantagem observada em times diferentes, mas **não resolve sozinho todo o metagame**. IV 31 em tudo ainda rendeu aproximadamente 68% nos times diferentes; natureza, composição, exclusividade dos golpes, presets e spread de níveis precisam de ensaios adicionais. O estudo não testou todas as 25 naturezas nem todos os pares de presets.

O evento de replay deve expor velocidade calculada, iniciativa sorteada e ordem. Explicar que um pouco mais de velocidade aumenta a chance de agir antes; velocidade muito maior garante a precedência. Mudar isso exige atualizar a Spec, criar uma nova versão de combate e repetir a calibragem dos ginásios. A regra não é idêntica ao Game Boy e deve ser apresentada com clareza.

## 8. Contrato de balanceamento e pareamento do piloto

| Aspecto | Critério proposto |
|---|---|
| Espelho sem diferença | Simetria e ausência de vantagem persistente de lado/slot; investigar desvios em amostras sem pareamento artificial |
| Ganho pequeno | +1 nível ou melhora pequena de IV: referência de 55–65% para +1 nível e 52–65% para pequena melhora de IV em vários espelhos; não exigir em cada matchup |
| Ganho moderado | Vantagem mensurável e crescente; tipos/cobertura podem superá-la; não impor um teto artificial à luta |
| Grande diferença | Vitória ampla é legítima; filtro competitivo impede exploração de iniciantes |
| Cláusula inicial | Seis membros, uma ocorrência de cada espécie no ranked; nenhuma normalização universal de nível |
| MMR | Começar com diferença até 150, em vez de aceitar automaticamente os 300 atuais; calibrar com disponibilidade real |
| Nível | Diferença média até 1 e diferença até 2 em cada posição dos vetores de níveis ordenados |
| Power | Razão simétrica até 1,05 como filtro auxiliar; não certifica equilíbrio |
| Falta de rivais | Não ampliar silenciosamente; oferecer treino/amistoso, sem cobrança nem MMR |
| Exploração de composição | Pareamento não remove counters nem iguala odds de cada time; estratégia precisa continuar valendo |

Os filtros acima são **prudência para o piloto**, não limites validados por todos os cenários. “Mais forte” precisa ser contextual: contra o mesmo tipo/alvo, mais Ataque deve melhorar dano; no agregado de muitos confrontos, treino deve melhorar resultado. Não exigir monotonicidade de cada seed ou matchup completo, pois alvos e ordem mudam.

Não selecionar automaticamente só o adversário que produza 50% ou compensar IVs melhores com handicap. A melhora dentro da faixa deve continuar útil. Com o amadurecimento do ranking, um jogador forte enfrenta rivais melhores: treino ajuda a subir, mas não promete win rate crescente indefinidamente.

**Não ligar stake ao novo desenho antes de AT6-12/14 e da validação dos filtros.** O adversário, snapshot e filtros são revalidados no servidor antes da reserva financeira. As regras experimentais não podem entrar em partidas antigas por acidente.

## 9. Ginásios, Liga e Avanço: a mesma preparação deve fazer sentido

Na Jornada real, o estudo encontrou um salto do Bulbasaur de nível 4 para 5 contra o Rattata de nível 5 da Rota 1: aproximadamente 4% para 84%. Isso inclui mudança de stats; nos cenários de Jornada, o moveset padrão de cada nível também pode mudar. Outro caso: Bulbasaur/Squirtle nível 10 contra Brock venceu cerca de 99%, enquanto Charmander/Pidgey nível 14 não venceu na amostra. Tipos estão funcionando e podem importar mais que quatro níveis extras.

Ivysaur/Pikachu contra Misty passou de aproximadamente 0,6% no nível 18 a 71% no 21. Não concluir que “Misty está quebrada”: são duas composições específicas, a espécie e os golpes do rival importam. Porém, degraus tão abruptos justificam revisar velocidade e pontos de KO, com referência de times reais de quem chegou ao nó.

Ao adotar iniciativa nova, refazer o mapa da Jornada por nó: time iniciante plausível, time que aplica a lição, time com quatro níveis extras e composição desfavorável. Medir tentativas, derrotas, duração, ganho por preparar corretamente e progresso depois da derrota. A lição não deve depender de um item premium ou IV perfeito. Mostrar dano, efetividade, crítico e erro derivados dos eventos reais, e a correção pós-luta apontar o que efetivamente ocorreu.

Para Avanço, AT6-13 deve manter encontros, captura, stamina, foco, clima e economia, mas substituir a decisão abstrata da wave por combate real na versão nova. Introduzir adaptador de inimigos com espécie/nível/golpes definidos no pack; reutilizar montagem de stats, precisão e dano. Não criar outra tabela de tipos ou outra fórmula de IV.

Persistir HP por criatura e estado determinístico por wave; iniciar a seguinte com as sobreviventes e saúde restante. A barra agregada passa a ser apresentação dos HP reais. Fixar a entrada da wave ao iniciá-la; aplicar níveis/XP ganhos à entrada da próxima wave, preservando ganhos legítimos durante a run e sem cap diário novo. Corrigir esse contrato na Spec antes de implementar. Captura continua sobre encontros válidos e não reaparece só por reprocessar replay. Curas precisam de alvo/efeito definido e idempotência.

Não trocar runs antigas em andamento: conservar o resolvedor anterior até acabar. Recalibrar ameaça/duração/recompensas da versão nova com dados; não encaixar crítico e imunidade apenas no roteiro antigo, pois isso continuaria sem efeito na vitória.

## 10. Aposta e monetização dependem de transparência do combate

Bronze: cada jogador entra com 50; pote 100; vencedor recebe 90; casa recebe 10. Com probabilidade de vitória `p`, o retorno líquido esperado é **90p − 50**. A chance de equilíbrio financeiro é **55,56%**, mesmo sem considerar custos indiretos de treinamento.

| Chance | Resultado líquido esperado por partida Bronze |
|---|---|
| 50% | −5 PokéCash |
| 55% | −0,50 PokéCash |
| 60% | +4 PokéCash |
| 65% | +8,50 PokéCash |

Uma leve vantagem competitiva não garante lucro. Explicar entrada, perda máxima, premiação e taxa; não prometer que comprar, treinar ou capturar produzirá renda. O rake PvP de 10% do pote continua distinto da margem da precificação da arena comum. Preservar a contabilidade e os limites promocionais de `02`/`07`; não monetizar acerto, crítico, iniciativa ou manipulação de pareamento.

## 11. Aplicação ao código e critérios de liberação

As fichas novas **AT6-12, AT6-13 e AT6-14** estão em `04_STORIES_DE_IMPLEMENTACAO.md`. Contratos e migração de versão estão em `03`; requisitos do produto, em `01`; protocolo de validação, em `05`; aplicação durante a campanha, em `06`. Incorporar as fichas ao roadmap canônico sem criar outra fila viva.

Antes do piloto com stake: aprovar a regra na Spec; executar comparação antiga/nova sem dinheiro; validar amostras de jogadores sem uso comercial da seed; separar um conjunto de validação não usado para escolher ±10%; conferir counters, presets, extremos de IV/natureza, lados/slots, níveis heterogêneos e mercado; versionar snapshots e replay; somente então liberar para um grupo limitado. Não chamar as 932 mil simulações deste pacote de validação final: grande parte é diagnóstico controlado e a seleção da candidata usou esse mesmo conjunto.

Reproduzir, a partir de um checkout da base informada:

```bash
node estudo/estudo-combate.mjs --repo=/caminho/Pokemon --out=/caminho/resultados-combate.json
```

Use Node 24 ou ambiente compatível com os módulos do repositório. O script grava somente o JSON indicado. O JSON registra o commit efetivamente importado; resultados de outro commit não substituem esta medição sem comparação. O catálogo original do jogo é a fonte dos nomes/tipos, e as regras devem continuar independentes do tema.
