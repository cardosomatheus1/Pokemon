# Registro de lacunas

Trabalho **identificado e deliberadamente adiado**. Diferente de `DEFEITOS.md`,
que registra o que está quebrado: aqui fica o que está faltando, ou o que foi
notado enquanto se fazia outra coisa e não cabia naquele bloco.

## Como usar

Toda lacuna precisa de **dono nomeado**. "Depois" não é dono.

O dono é um **bloco** de `POKEARENA_BUILD_BLOCKS`. Quando nenhum bloco serve, o
dono é uma **trilha fora de bloco** — `documento`, `arte`, `jurídico`, `dados de
produção` — e isso precisa estar escrito, porque trilha fora de bloco não é
resolvida por ninguém escrevendo código e some do radar se não for nomeada.

Se nenhum bloco existente serve e o trabalho é de código, **proponha o bloco no
mesmo commit** — com id, método, portões e sabotagem, igual aos outros.

Uma lacuna sai daqui quando o bloco dono fecha. O bloco dono cita a lacuna no
seu critério de saída.

---

### L-019 — a varredura de símbolos não é verificador de escopo ✅ FECHADA

**Fechada em:** F0.3c · **Notada em:** F0.3b

`test/modulos.mjs` pega símbolo conhecido usado sem import, que foi a classe de
erro real da extração. Mas ele varre por texto, não por escopo: uma variável
local com o mesmo nome de um símbolo exportado suprime o alerta, e um símbolo
usado só dentro de string dinâmica passa.

Escrever um verificador de escopo em JS puro é caro, e trazer um parser fere a
regra de dependência zero. **A alternativa boa é o navegador**: um `pageerror`
na verificação visual pega qualquer símbolo indefinido, sem heurística nenhuma.

**Fechada por redundância, como previsto.** `test/visual.mjs` virou portão no
F0.3c: sobe servidor próprio, abre o app num Chromium de verdade e reprova em
qualquer `pageerror`. A varredura de texto continua existindo como rede
secundária — e ganhou duas correções no caminho: passou a excluir chave de
objeto e a exigir que o símbolo apareça solto no código mascarado **e** no texto
cru, porque o mascarador não entende literal de expressão regular e inventava
ocorrências.

Na primeira execução o portão achou o defeito **D-002**, que nenhum teste
estático via.

## Achados que NÃO são lacunas

Registrados aqui para não serem redescobertos.

### A-001 — os sprites das pré-evoluções já existem no app

**Medido em:** F0.2

A tabela `PMD` do app cobre **146 espécies** — todo o Kanto menos os cinco
lendários — e não apenas os 76 lutadores da arena. As **68 pré-evoluções** que a
Fase 3 precisa (Charmander, Squirtle, Bulbasaur, Abra, Machop, Gastly, Magikarp,
Dratini e as demais) **já têm metadado de sprite embutido**, com largura, altura e
duração de quadro por animação.

Verificado upstream numa amostra de 13 pré-evoluções: as quatro folhas
(Walk, Idle, Attack, Hurt) respondem 200 em todas.

Consequência: a Fase 3 **não precisa de trabalho de sprite para pré-evolução**.
Quem montou a tabela já extraiu o Kanto inteiro. Sobram exatamente dois itens de
arte: o ovo (L-018) e os cinco lendários, que estão fora por decisão de escopo.

## Elenco e balanceamento

As quatro primeiras foram medidas pelo arnês de F0.1 e têm o **mesmo dono, por
uma razão de economia de esforço**: o elenco Kanto vai embora em F1.12, quando o
ContentPack original passa a ser o pack de lançamento. Rebalancear um elenco que
será substituído é trabalho descartável. O valor está em **projetar o elenco
original já sabendo destes quatro números**.

### L-001 — 14 dos 66 golpes nunca são atribuídos a ninguém

**Dono:** F1.12 · **Medido em:** F0.1

21% do conteúdo de golpes é inalcançável: os 6 Sombrios inteiros, Shadow Ball,
Lick, Iron Head, Iron Tail, Meteor Mash, Dragon Pulse, Focus Blast, Ancient Power.

Causa: `assignMoves` é determinístico por dex, e tipos com um único representante
no elenco sempre tiram os mesmos golpes. Magneton é o único Aço e sempre sai com
Flash Cannon e Bullet Punch. Kanto não tem nenhum Sombrio na tipagem moderna, então
aquele pool inteiro é morto.

`GOLPES.md` promete 66. Alcançáveis: 52.

**Requisito para o elenco original:** nenhum tipo com menos de 3 representantes,
ou pool de golpes dimensionado ao número de representantes.

### L-002 — um lutador vence 4× mais que a média

**Dono:** F1.12 · **Medido em:** F0.1 (baseline: 35,24%)

Gengar vence ~35% das rodadas contra os 8,33% de média esperada em 12 lutadores.

Causa medida: **35,2% de todos os golpes do elenco são do tipo Normal**, contra
5,6% que seria o esperado por acaso entre 18 tipos. Isso acontece porque
`MASTER_MOVES.normal` é o pool de reserva de `assignMoves` — entra em 38% dos
sorteios de preenchimento e sempre como último recurso. Gengar é imune a Normal,
e Kanto não tem Sombrio para puni-lo.

**Requisito para o elenco original:** o pool de reserva não pode ser de um tipo
único. Distribuir a reserva ou torná-la neutra.

### L-003 — 13 dos 76 lutadores não conseguem causar dano a um oponente específico

**Dono:** F1.12 · **Medido em:** F0.1

Raticate, Persian, Primeape, Machamp, Hitmonlee, Hitmonchan, Lickitung, Chansey,
Kangaskhan, Tauros, Ditto, Porygon e Snorlax têm o kit **inteiro** imune contra
Gengar. Não arranham. Quando caem na mesma pool, são alimento.

**Requisito:** nenhum lutador pode ter kit com efetividade zero contra outro
lutador do elenco. É invariante testável e deve virar teste em F1.12.

### L-004 — amplitude de 16,6× entre o melhor e o pior do elenco

**Dono:** F1.12 · **Medido em:** F0.1

Do melhor (35,24%) ao pior (Ditto, ~1,6%). Amplitude grande **não é defeito por
si** — é o que cria o azarão que paga alto e dá graça à aposta. Fica registrada
porque interage com dois outros itens: o teto de exposição de F0.8 e o
dimensionamento do Monte Carlo de F0.7, que é ditado pela cauda.

**Decisão pendente para F1.12:** qual amplitude o elenco original deve ter. Menor
amplitude = odds mais próximas = menos emoção, menos passivo, menos simulações
necessárias. É trade-off de produto, não de engenharia.

---

## Motor e protótipo

### L-005 — animação de entrada não acompanha o relógio da fase ✅ FECHADA

**Fechada em:** F0.3c · **Notada em:** leitura do protótipo

**A causa registrada estava incompleta.** Não é o controle de velocidade: a
entrada acontece na contagem, que não é escalada. O problema é a **fonte de
tempo**.

`releaseAll()` agendava com `setTimeout`, ou seja, tempo de parede. A fase
avança por `S.clock`, que soma o delta do `requestAnimationFrame` **limitado a
0,05 s por quadro**. A 60 fps as duas andam juntas; quando o navegador
estrangula a aba, `S.clock` fica para trás e a pokébola abre antes de o relógio
da fase chegar lá.

**Corrigido:** a entrada virou uma fila consumida pelo mesmo `S.clock` que
decide o fim da contagem. Uma fonte de tempo só. A única marcação que continua
em tempo de parede é a remoção da classe `opening`, porque ela acompanha a
duração de uma animação CSS — o relógio ali é o do CSS.

### L-006 — a rodada depende de `requestAnimationFrame`

**Dono:** F1.5 · **Notado em:** leitura do protótipo

Com a aba em segundo plano o `rAF` não roda, então a janela de aposta de 30 s
estica e a batalha congela. Localmente é irrelevante; com relógio compartilhado é
inaceitável, e é exatamente o que F1.5 resolve ao tornar o servidor dono do
relógio. Registrado para que ninguém "conserte" no cliente antes disso.

### L-007 — sabotagem fácil demais enquanto os goldens forem byte-exatos ✅ FECHADA

**Fechada em:** F0.2 · **Notada em:** F0.1

Qualquer sabotagem que mude comportamento derruba os golden tests, então Q2 passa
sem esforço. O sinal real é a coluna "pego por" do relatório de sabotagem: se um
defeito só cai no golden e não toca invariantes nem estatística, a cobertura de
propriedade está fraca naquela área mesmo com Q2 verde.

**Como foi resolvida.** A tentativa óbvia — inventar uma sabotagem que preserve as
20 seeds — falhou de forma instrutiva: cortar `MAX_TIME` de 56 para 50 não é pego
por **nada**, porque nenhuma das 10.000 rodadas do lote estatístico passa de 50 s
(ver L-016). Uma sabotagem que ninguém pega não mede cobertura, mede sorte.

A solução foi estrutural em vez de pontual: `test/run.mjs` aceita `SEM_GOLDEN=1`, e
a sabotagem roda **cada defeito duas vezes**, com e sem os golden tests. O relatório
mostra quem pegou o defeito sem o golden. Defeito que só o golden pega é sinalizado
como cobertura de propriedade fraca naquela área.

Resultado no F0.2: **10 de 10 defeitos são pegos sem o golden.** Invariantes,
estatística e paridade sustentam sozinhas, e o golden é rede extra em vez de
muleta.

---

### L-014 — `spriteURL` mora no motor e é dado de conteúdo ✅ FECHADA

**Fechada em:** F0.4 · **Notada em:** F0.2

`buildRoster` grava `f.sprite` e a interface usa esse campo. Para não mudar
comportamento no F0.2, `spriteURL` ficou dentro de `engine/engine.mjs`. É função
pura e sem DOM, então não fere o teste de motor limpo — mas é **dado de conteúdo**
morando no motor, exatamente o que a Content Layer existe para eliminar.

Em F0.4, `spriteURL` sai do motor e vira responsabilidade do ContentPack.

**Como fechou.** `sprite(esp)` é agora uma função do pack, exigida por
`validarPack`; `montarElenco` chama `pack.sprite(p)` e não conhece endereço
nenhum. O pack sintético devolve um data URI, e a rodada dele passa — prova de
que o motor não presume HTTP nem espelho.

### L-015 — quatro handlers `onclick` embutidos no HTML ✅ FECHADA

**Fechada em:** F0.3d · **Notada em:** F0.2

Os botões de fechar modal usam `onclick="closeModal(...)"` no HTML. Escopo de
módulo não é global, então o F0.2 precisou de `window.closeModal = closeModal`
para não mudar comportamento.

Funciona, e é feio. Em F0.3, que separa a interface, trocar por `addEventListener`
e remover a exposição no `window`.

### L-016 — o corte duro de tempo nunca é exercitado ✅ FECHADA

**Fechada em:** F0.3d · **Notada em:** F0.2

`CONF.MAX_TIME` é 56 s, mas **nenhuma** das 10.000 rodadas do lote estatístico passa
de 50 s — a tempestade encerra tudo antes. O corte duro é um seguro que nunca
dispara nos testes, então nenhuma suíte cobre o caminho.

Descoberto ao tentar construir uma sabotagem para a L-007: baixar `MAX_TIME` de 56
para 50 não é detectado por nada.

**O que fazer em F0.3:** um teste com pool sintética de tipos mutuamente imunes,
que force a batalha a alcançar o corte. É justamente o cenário que o corte existe
para cobrir, segundo o comentário do próprio protótipo.

### L-017 — a dependência de CDN de terceiros em tempo de execução

**Dono:** F0.12 · **Notada em:** F0.2, ao verificar os sprites no navegador

> **Esta lacuna ficou órfã e ninguém percebeu na hora.** O dono era o F0.4, que
> fechou sem ela. O F0.4 entregou metade do que está escrito abaixo — a função
> de sprite virou responsabilidade do ContentPack, e isso fechou a L-014 — mas
> **não** entregou a cascata `local → origem → espelho` nem o script de download.
> A outra metade é trabalho de app e de ferramenta, não de camada de conteúdo, e
> teria misturado dois assuntos num bloco só; o erro não foi deixar de fazer, foi
> fechar o F0.4 sem dizer que a lacuna continuava aberta e sem dono.
>
> Descoberto ao levantar o que falta para fechar a base. Dono novo: **F0.12**,
> proposto no mesmo commit.

O app busca as folhas de sprite direto do `raw.githubusercontent.com` a cada
sessão, com espelho no jsDelivr. Uma rodada carrega ~200 folhas.

Isso já custou três versões ao projeto (v0.6.1 a v0.6.3) e o próprio mapa mental
classifica "dependência de sprites externos" como risco 🟡. A hipótese registrada
para os sprites terem sumido "sem nada ter mudado no código" é acúmulo de limite
de requisições — e ela continua válida.

Também impede o app de rodar em ambiente com egresso restrito: a verificação
visual do F0.2 só funcionou porque o harness intercepta as requisições e as serve
pelo Node.

**O que fazer em F0.12:** a resolução de asset ganha a ordem
`local → origem → espelho`. Um script baixa as folhas para um diretório **fora do
versionamento**. O ponto de extensão já existe desde o F0.4: quem decide o
endereço é `pack.sprite(esp)`, e o pack sintético dos testes já prova que o motor
não presume HTTP — devolve um data URI e a rodada roda.

> **Não versionar as folhas.** São arte de terceiros, mesma razão pela qual o
> `battle-theme.mp3` ficou de fora. O script baixa; o repositório não guarda.

### L-018 — não existe sprite de ovo

**Dono:** F3.2 · **Notada em:** F0.2

O §7.5 da Spec define que a captura entrega a forma base — "você viu o campeão,
leva um ovo". O ovo precisa de arte e não existe.

Sondagem do que há no PMDCollab: `sprite/0000/Walk-Anim.png` e
`portrait/0000/Normal.png` respondem 200, mas 0000 é slot de placeholder e
precisa de inspeção visual antes de virar ovo.

De todo modo o ovo é **genérico**, não é de espécie — então é o candidato natural
a ser a **primeira peça de arte original** do projeto, e não depende da troca de
tema inteira para existir. Ver L-008.

### L-020 — a ligação exporta 13 apelidos herdados ✅ FECHADA

**Fechada em:** F0.5 · **Notada em:** F0.4

`app/modules/motor.mjs` exporta `KANTO_DEX`, `CHART`, `simulate`, `buildRoster`,
`pickLineup`, `rollWeather`, `applyWeather`, `displayName`, `showdownSlug`,
`spriteURL` e mais três, todos apontando para os nomes novos em português.

Existem porque o F0.4 é a Content Layer, não uma renomeação: reescrever 11
módulos e 3 fixtures no mesmo bloco misturaria duas mudanças e tornaria
impossível dizer qual quebrou o quê. Mas `KANTO_DEX` num arquivo que promete
independência de tema é justamente o que o bloco veio tirar — o apelido carrega
o nome da franquia de volta para dentro do app.

**O que destrava:** F0.5 já mexe em toda a superfície de sorteio para plantar a
seed raiz. Renomear no mesmo passo é um `sed` com o parser de escopo que o F0.3a
já usou, e o teste de vazamento passa a valer para `app/modules/` também.

**Como fechou.** Os treze saíram, mais `newSeed`. A renomeação foi feita com
guarda de ponto (`(?<![.\w$])`), em duas passadas — nome solto e acesso por
namespace (`E.simulate`) — porque `PROTO.simulate`, que aponta para o protótipo
congelado, precisa continuar com o nome antigo. Em `sprites.mjs` a função do
pack entra como `sprite as enderecoSprite`: o lutador já tem um campo
`f.sprite`, e dois nomes iguais no mesmo arquivo é convite a erro de leitura.
A lista de nomes proibidos de `test/fonte-unica.mjs` guardou os apelidos
removidos — reaparecer é regressão desta lacuna, não conveniência.

### L-021 — o motor exige um pool de golpes chamado `normal`

**Dono:** F1.12 · **Notada em:** F0.4

`atribuirGolpes` cai em `golpes.normal` quando o pool do próprio tipo se esgota,
e `validarPack` exige que a chave exista. Ou seja: o motor não conhece o tema,
mas conhece **uma palavra** do tema. Um pack sem nada equivalente a "golpe
genérico" — só afinidades exclusivas — não consegue nascer.

Não cabe agora porque trocar o contrato exige decidir o que substitui: um campo
`golpes.reserva` explícito no pack, um pool derivado, ou permitir moveset menor
que quatro. As três mudam distribuição de dano, e distribuição de dano move as
odds — medição de F1.3, que é o bloco do balanceamento de golpes.

**O que destrava:** F1.12 constrói um ContentPack do zero, e é ali que o
contrato aperta de verdade — um tema original pode não ter nada equivalente a
"golpe genérico". A escolha sai de lá, junto com a medição de cobertura de golpe
por espécie (os 14 de 66 nunca atribuídos, do baseline do F0.1).

> **Correção de registro:** este verbete nasceu com dono F1.3, por engano — F1.3
> é autenticação real, não balanceamento. Corrigido no F0.6.

### L-022 — a garantia de tipo na pool é um canal de informação sobre o clima

**Dono:** F0.11 · **Notada em:** F0.6

Depois do F0.6 a margem por grupo **observável** fecha em 8 %. Condicionada ao
clima que de fato saiu, ela continua torta: **−45 % para quem foi buffado**
contra **+13 % no resto**, 58 pontos de diferença.

Isso seria inofensivo se o clima fosse imprevisível. Não é totalmente: `sortearPool`
**garante 1 lutador do tipo favorecido** na pool, para que o clima tenha em quem
bater. Ver um único lutador de Gelo entre 12 é evidência de Nevasca — e evidência
é preço.

**Medido, e é por isso que é lacuna e não defeito.** Em 400 rodadas,
estratificando a margem pelo número de lutadores daquele tipo na pool, nenhuma
célula ficou negativa com confiança: `fire:1` deu −2,02 % ± 6,69, `ice:1` deu
+1,23 % ± 4,64. O canal existe por construção; a exploração não foi demonstrada.

**Por que não cabe agora.** Medir a exploração de verdade exige um apostador
bayesiano — posterior do clima dado a contagem de tipos na pool, e probabilidade
de vitória por clima — e o intervalo de confiança precisa ser menor que a
vantagem procurada. Com o estimador de hoje a dispersão no azarão é de ~22 %
(baseline do F0.1); qualquer edge de 1 a 2 pontos some no ruído. **Fechar o
estimador vem primeiro**, e isso é o F0.7.

**O que a destrava:** F0.7 derruba a dispersão para menos de 3 %. Aí a medição
passa a distinguir uma vantagem real de ruído, e o F0.11 — proposto no mesmo
commit — decide entre tirar a garantia, sortear o clima depois da pool, ou
condicionar o preço à mesma informação que o apostador tem.

### L-023 — o viés de convexidade é medido, mas não corrigido

**Dono:** F1.5 · **Notada em:** F0.7

`odd = 1/p` é convexa, então `E[1/p̂] > 1/p`: o erro amostral **não se cancela**
entre rodadas, é sistemático e sempre a favor do apostador. O termo de segunda
ordem, como fração da odd justa, é `(1-p)/(n·p²)`.

Com os 20.000 sims herdados valia **19,12 %** no pior perfil — mais que o dobro
da margem configurada. O F0.7 subiu a amostra para 154.000 e ele caiu para
**2,49 %**. Continua sendo ~31 % da margem de 8 %, entregue na cauda.

O F0.7 **publica** o viés por lutador no registro de precificação (§4.4.5), o que
permite atribuir a margem realizada. Não o **corrige**.

**Por que não cabe agora.** Corrigir é uma linha —
`justa_corrigida = justa / (1 + (1-p̂)/(n·p̂))` — e é justamente por ser barato
que não deve entrar de contrabando: mudar o estimador muda TODA odd exibida, e
o escopo do F0.7 é `restaurar Laplace, elevar SIMS_MIN, registrar erro,
gravar o registro`. Nada ali diz "trocar o estimador". Além disso a correção
analítica é de primeira ordem e precisa ser validada contra uma simulação de
referência antes de virar preço — medição que exige amostra grande e tempo.

**Por que não abre bloco na Fase 0.** O §4.4.4 aceita `SIMS_MIN` como a resposta
da v0.9 e o critério de saída do §4.8 fala em erro relativo registrado, não em
viés corrigido. É melhoria, não pendência de saída.

**O que a destrava:** F1.5, quando o preço passa a ser calculado pelo servidor.
Ali o custo de uma simulação de referência deixa de competir com a janela de
30 s do cliente, e o registro de precificação já carrega o campo para comparar
antes e depois.

### L-024 — o bucket `pendente` existe e nada o preenche

**Dono:** F1.4 · **Notada em:** F0.9

O §5.5 define `pending_transferable`: PC-T comprado e ainda sob hold, que **não
pode entrar em mercado transferível** enquanto não liquidar. O bucket existe na
carteira do F0.9 e fica fora da ordem de consumo, que é o comportamento certo.

O que não existe é quem o preencha: `PC_T_PURCHASE_PENDING`,
`PC_T_PURCHASE_CLEARED`, `PC_T_PURCHASE_REVERSED`, `CHARGEBACK_DEBIT`,
`TRANSFER_HOLD_APPLIED` e `TRANSFER_HOLD_RELEASED` são tipos de ledger que só
fazem sentido com **compra de verdade** — gateway, prazo de liquidação, risco de
estorno. Na v0.9 a compra é simulada e credita direto em `transferivel`.

**Por que não cabe agora.** Simular hold sem gateway é inventar prazo: o número
de dias, o gatilho de liberação e a regra de estorno saem do contrato com o
adquirente, não de escolha nossa. Codificar um palpite agora significaria
reescrever quando o contrato existir — e, pior, apresentar ao jogador um prazo
que ninguém prometeu.

**O que a destrava:** F1.4, o wallet ledger no servidor, é onde a compra deixa
de ser simulada. A estrutura já está pronta para receber: o bucket existe, está
fora da ordem de consumo, e os tipos estão nomeados na Spec.

## Conteúdo e identidade

### L-008 — o jogo não tem trilha sonora própria

**Dono:** F1.12 · **Trilha paralela:** arte

`battle-theme.mp3` é faixa da franquia e não foi versionado — ver
`prototype/README.md`. O jogo roda sem ela. O ContentPack original precisa incluir
áudio original, e áudio é produção externa que precisa começar muito antes de F1.12.

---

## Fora de bloco

Trabalho real que **nenhum bloco resolve**. Fica aqui para não sumir do radar.

> **Estado da trilha `documento`: sem pendências.** L-009 e L-013 fechadas em
> 18/08/2026. As lacunas restantes desta seção dependem de terceiros — jurídico,
> arte e dados de produção — e não de escrita.

### L-009 — os simuladores não incorporam os cenários novos ✅ FECHADA

**Fechada em:** 18/08/2026 · **Dono:** trilha `documento`

`support/unit_economics/pokearena_unit_economics_model_v1.2.py` substitui a v1.1 e
gera os quatro cenários — atual, restrito, com conformidade, e restrito mais
conformidade — em `unit_economics_scenarios_v1_2.csv`,
`restricted_regime_break_even.csv`, `compliance_cost_sensitivity.csv` e
`combined_worst_case.csv`.

Todos os números publicados no Estudo v1.2 conferem, com **uma correção**: o pior
caso combinado é 71.344 MAU e não 71.345. A diferença veio de arredondar um valor
intermediário antes da divisão, e é exatamente o tipo de erro que existir o
simulador impede. O estudo foi corrigido.

### L-010 — não existe política de publicidade e afiliados

**Dono:** trilha `jurídico` / produto

Nenhum documento do conjunto cobre. Necessária antes de qualquer aquisição paga, e
interage com o capítulo 28: publicidade de produto de aposta tem restrição própria,
e afiliado remunerado por depósito é um incentivo em rota de colisão com proteção
do jogador.

### L-011 — os limiares de risco são chute educado até haver coorte

**Dono:** trilha `dados de produção` · **Mecanismo:** F1.9

Os sete sinais do §28.6 e seus limiares só ficam úteis depois de meses de dados.
F1.9 entrega o mecanismo e a instrumentação; a calibração é pós-V1 e precisa de
dono declarado quando a V1 estiver em produção, senão o sistema roda para sempre
com os números de exemplo.

### L-013 — os capítulos 6 a 9 da Spec ficaram desatualizados ✅ FECHADA

**Fechada em:** 18/08/2026 pela **Spec v1.5** · **Dono:** trilha `documento`

Os capítulos 6 e 7 foram reescritos, o 8 reposicionado, e o 3, 5.6, 9, 10, 22 e 25
ajustados. A exceção temporária de precedência no `CLAUDE.md` foi removida: a Spec
volta a valer integralmente para todas as fases. Registro do estado anterior abaixo.

As três decisões tomadas sobre profundidade — mercados de apuração mútua, V3
absorvido em V2, Liga de Previsão antecipada — mudam o que V2 a V5 são. A Spec
v1.4 ainda descreve a estrutura anterior:

| Capítulo da Spec | Estado |
|---|---|
| §3 Mapa de versões | desatualizado: nomes e conteúdo das fases mudaram |
| §5.6 Aposta | incompleto: descreve só o Winner Market de odd fixa; falta apuração mútua |
| §6 V2 Collection | precisa virar V3 e ganhar a camada de informação/dossiê |
| §7 V3 Trainer Idle | deixa de ser capítulo próprio; expedições viram pesquisa dentro da Collection |
| §8 V4 Team & Journey | reposicionamento: ginásios como ensino do motor, não segundo jogo |
| §9 V5 League | falta a Liga de Previsão, que sobe para a V2 |
| §10 Economia | falta a taxa de mercado mútuo como sink, e informação como recompensa não monetária |
| §22 Decisões separadas | falta `Informação != Probabilidade` como invariante |

**Por que não foi feito junto:** reescrever oito capítulos da fonte de verdade é
trabalho de documento, não de bloco, e fazê-lo no mesmo commit que o plano de
execução misturaria duas revisões independentes. O `BUILD_BLOCKS v1.2` já reflete
as decisões e é o que vale para executar; a Spec vira v1.5 quando esta lacuna
fechar.

**Resolvido.** A Spec v1.5 incorporou tudo, e a exceção de precedência saiu do
`CLAUDE.md`. Ver o changelog §30 da Spec.

### L-012 — a consulta de enquadramento regulatório não foi feita

**Dono:** trilha `jurídico` · **Bloqueia:** Etapa A item 8, Fase 5 inteira

Spec §0.5.1. É a única pendência do projeto capaz de reordenar o roadmap
econômico inteiro. Está listada como entrada de arquitetura da v0.9 e ainda não
tem data.
