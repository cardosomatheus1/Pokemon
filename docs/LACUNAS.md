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

### L-017 — a dependência de CDN de terceiros em tempo de execução ✅ FECHADA

**Fechada em:** F0.12 · **Notada em:** F0.2, ao verificar os sprites no navegador

**Como fechou, e a lacuna estava SUBESTIMADA.** A cascata `local → origem →
espelho` entrou em `app/modules/assets.mjs`, e `tools/baixar-assets.mjs` baixa
666 arquivos para `assets/`, fora do versionamento. Medido: zero requisições
externas com a rede desligada.

O verbete falava em "~200 folhas de sprite". Com as 449 folhas de sprite já em
disco, o portão de egresso fechado mostrou **148 requisições ainda saindo**: as
folhas de EFEITO (outro repositório), os retratos do dex e a fonte de pixel do
Google Fonts. A conta certa só apareceu quando alguém tentou desligar a rede —
até então o arnês interceptava e servia pelo Node, o que escondia a dependência
em vez de medi-la.

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

### L-021 — o motor exige um pool de golpes chamado `normal` ✅ FECHADA

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

### L-022 — a garantia de tipo na pool é um canal de informação sobre o clima ✅ FECHADA

**Fechada em:** F0.11 · **Notada em:** F0.6

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

**Como fechou.** Escolhida a segunda opção: a pool é sorteada sem conhecer o
clima, e o clima sai entre os que a pool suporta. Medido em 300 rodadas, a
vantagem do apostador bayesiano foi de **+1,52 % ± 2,80** para
**−0,83 % ± 0,86**, e as rodadas em que a informação mudava a aposta caíram de
**108 para 12**.

O canal não foi eliminado — foi **invertido e encolhido**. Uma pool sem Gelo
agora diz que Nevasca é impossível. Qualquer acoplamento entre pool e clima
vaza; zerar exigiria clima independente da pool, e aí o efeito climático
simplesmente não aconteceria em parte das rodadas.

### L-023 — o viés de convexidade é medido, mas não corrigido ✅ FECHADA

**Dono:** F1.5 · **Notada em:** F0.7 · **Fechada no:** F1.5 —
**e a premissa dela estava errada**

### O que ela dizia

Que `odd = 1/p` é convexa, logo `E[1/p̂] > 1/p`; que o desvio é sistemático e
**sempre a favor do apostador**; e que valia **2,49 %** da odd no pior perfil com
154.000 simulações — cerca de 31 % da margem de 8 %, entregue na cauda.

### O que a medição achou

O F1.5 fez o que a lacuna exigia — validar contra simulação de referência antes
de a correção virar preço — e achou **duas coisas erradas**.

**1. A fórmula publicada estava com a escala errada.** O código calculava
`(1-p)/(n·p²)` e o comentário dizia que isso era "a fração da odd justa". Não é:
expandindo, `E[1/p̂] ≈ (1/p)·(1 + (1-p)/(n·p))`, então a fração é **`(1-p)/(n·p)`**.
O que estava lá é a fração dividida por `p` — o viés em PONTOS de odd. Na cauda a
diferença é de quase **sessenta vezes**.

**2. O viés observado é NEGATIVO.** Simulação de referência, 8.000 repetições por
ponto, com o mesmo `rng` do motor e a mesma suavização de Laplace `(k+1)/(n+12)`:

| p | n = 154.000, observado | `(1-p)/(n·p)` | `(1-p)/(n·p²)` |
|---|---|---|---|
| 0,071 | **−0,102 %** | 0,008 % | 0,120 % |
| 0,029 | **−0,111 %** | 0,022 % | 0,750 % |
| 0,017 | **−0,167 %** | 0,038 % | 2,209 % |

E isolando o Laplace, com p = 0,017 e n = 20.000: **sem** ele o viés observado é
`+0,041 %`, **com** ele é `−0,193 %`. Ou seja, **a suavização já absorve o viés e
passa um pouco do ponto** — o que sobra é dois décimos de por cento, na direção
da casa, e não do apostador.

### A decisão, e por que ela é o contrário do que a lacuna pedia

**A correção analítica NÃO foi aplicada.** `justa / (1 + (1-p̂)/(n·p̂))` empurraria
a odd na direção errada: corrigiria um viés positivo que não existe nesta
amostragem, tornando as odds piores para o jogador em cerca de 0,04 % na cauda.

O que foi feito:

- `engine/preco.mjs` passa a publicar `(1-p)/(n·p)`, com a medição no comentário;
- `test/precisao.mjs` inverteu a afirmação que dizia "na cauda o viés é MAIOR que
  o erro relativo" — ela vinha da escala errada. O erro é `sqrt((1-p)/(n·p))`, e
  a raiz de um número menor que 1 é maior que ele: na cauda o erro passa de 1 % e
  o viés fica em 0,04 %.

> **A lição é a do projeto inteiro, aparecendo numa fórmula:** a lacuna tinha
> número, tinha fonte e tinha três parágrafos de justificativa — e o número
> estava errado por um fator de sessenta porque ninguém tinha medido. **Medir
> antes de mexer** valeu aqui para não mexer.


**FECHADA no F1.12.** O pack passou a DECLARAR qual dos seus pools é o de
reserva (`poolReserva`). Quem não declarar continua valendo se tiver um
`normal`, porque o pack de desenvolvimento tem e mudar o arquivo dele seria
mexer no que já foi medido.

A lacuna virou bloqueio real quando o `original_v1` chegou: a roda dele tem oito
tipos e nenhum genérico, e ele era recusado no carregamento **por um nome**.
---


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

### L-025 — o portão fecha bloco com uma execução só ✅ FECHADA

**Fechada em:** F0.10 · **Notada em:** F0.9, ao investigar o D-004

**Como fechou.** As duas metades:

1. A varredura de dinheiro de `test/carteira.mjs` passou a alcançar `test/`, com
   as strings e comentários mascarados antes — o próprio enunciado dos testes
   cita `S.bal` para explicar a regra, e varredura crua acusaria a explicação.
   Regra que não sabe se distinguir da própria descrição não serve.
2. `npm run portoes` passou a rodar a suíte **duas vezes** e a reprovar se as
   execuções discordarem (`tools/repetir-portao.mjs`). Duas e não cinco: pega a
   instabilidade grosseira — a classe do D-004, que falhava em 1 de 3 — sem
   triplicar um passo de ~50 s. **Instável reprova diferente de vermelho:**
   vermelho constante é defeito com endereço, instável é defeito que escolhe
   quando aparecer.

O defeito D-004 passava em **duas de cada três** execuções do portão Q5, e
entrou no repositório porque o bloco foi fechado rodando o portão uma vez.

Duas coisas faltam, e as duas são baratas:

1. **A varredura de `S.bal` não alcança `test/`.** `test/carteira.mjs` proíbe os
   módulos do app de citar o campo morto; o próprio arnês ficou de fora, e foi
   exatamente ali que a linha sobreviveu.
2. **O portão não repete.** Teste que passa em dois de três é indistinguível de
   teste que passa, se ninguém rodar duas vezes. O portão Q5 tem componentes
   dependentes de sorteio (a odd do azarão muda a cada rodada), então uma
   execução não é evidência suficiente.

**Por que não cabe agora.** Repetir o portão inteiro triplica um passo que já
leva ~40 s com navegador, e escolher *o que* repetir exige saber quais testes
dependem de sorteio — levantamento que não cabe no fim de um bloco de carteira.

**O que a destrava:** F0.10 fecha a v0.9 e é o bloco que verifica o §4.8 item a
item. Um critério de saída que se verifica uma vez só tem o mesmo problema, em
escala maior — então a repetição precisa existir antes daquela verificação valer.

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

---

### L-026 — o baú não tem contra o que ser calibrado ✅ DESTRAVADA

**Dono:** V1.19 · **Destravada por:** a correção do **D-007**

Ela dizia que não dava para calibrar o baú enquanto a nossa própria
implementação estourasse o orçamento em 6,5× — reconciliar vinha primeiro.

**Reconciliou.** A emissão de desafios cabe nos 30 PC-B/semana do sub-teto, e o
`soft_issuance_ceiling = 500` passou a existir no código, em
`engine/emissao.mjs`. O baú do V1.19 tem agora duas coisas contra as quais se
calibrar:

- **o que sobra do orçamento agregado** — 80 no total, até 50 para a trilha de
  login, 30 para desafios; o que o baú consumir sai de dentro desses 30, ou
  exige rediscutir a repartição com medição;
- **o teto de saldo**, que já está implementado e vale para qualquer fonte
  rotineira nova. Um baú que emita PC-B herda o mesmo regulador de graça: quem
  acumula para de receber moeda e recebe substituto.

> **O número que o V1.19 precisa bater:** o baú da v1.0 emitia **1,45 PC-B por
> rodada**. Cinquenta e cinco rodadas por semana consomem sozinhas os 80
> agregados; vinte e uma consomem os 30 que sobram. Esse continua sendo o
> problema de desenho — a diferença é que agora ele é um problema de calibragem,
> e não de contradição entre dois documentos.

**A lacuna sai da lista; o desenho do baú continua sendo escopo do V1.19.**

---


### L-027 — o véu de cor por arena foi documentado e não construído ✅ FECHADA

**Dono:** V1.20 · **Fechada no:** V1.20

O catálogo da v1.0 documentava cinco campos por arena e implementava quatro. O
quinto, `brilho` — *"véu de cor por cima, para dar unidade ao conjunto"* —
aparecia só no comentário. O V1.14 portou os quatro que existem e **não inventou
o quinto**: a regra do resgate vale para desenho também.

### Como ficou

Três campos, não um: `brilho` (a cor), `veu` (a força) e `mistura` (o modo de
composição). O véu é uma camada de CSS sobre o `#arena` inteiro — chão,
lutadores e efeitos juntos —, e não pintura no canvas do mapa. **Unidade que não
alcança o lutador não é unidade:** seria um filtro no fundo com o decalque
continuando decalque em cima dele, que é exatamente o problema que o campo
parecia querer resolver.

| arena | cor | força | mistura |
|---|---|---|---|
| Ilha Tropical | `#ffd98a` | 0,07 | soft-light |
| Campo Gelado | `#bcdcff` | 0,08 | soft-light |
| Coliseu | `#e8c98f` | 0,06 | soft-light |
| Praia | `#ffe3a6` | 0,07 | soft-light |
| Cratera Vulcânica | `#ff8a4a` | 0,09 | soft-light |

`soft-light` escurece e clareia conforme o que está embaixo — ele UNIFICA sem
achatar. `multiply` apagaria as sombras do chão; `overlay` estouraria os claros
do gelo. Os dois foram testados no bloco.

### O teto é regra, e o motivo é o item 9 da L-030

`VEU_MAX = 0,10`. Véu forte é a maneira mais fácil de dar unidade cromática e a
mais fácil de tornar o campo ilegível — e quase ninguém reprova, porque fica
bonito. Subir o véu para "unificar melhor" agravaria exatamente o item que ele
deveria ajudar. O teste `test/arenas.mjs` exige véu em toda arena e nenhum acima
do teto; o Q5 confere no COMPUTADO que a camada está no ar, porque catálogo com
campo e módulo que escreve a propriedade são duas coisas que passam com o
seletor CSS errado.

**Sabotagem:** `S103` (véu acima do teto) e `S104` (véu declarado e não
aplicado — literalmente a forma desta lacuna).

---

### L-028 — o porte fechou; o que ele deixou aberto

**Dono:** nenhum bloco novo · **Estado:** informativo

O V1.15 fechou o porte da v1.0 do amigo. Fora dele ficaram, por decisão
registrada:

| O quê | Onde está | Por quê |
|---|---|---|
| **Baús** | V1.19, nosso roadmap | Decisão do dono do projeto; bloqueado pelo D-007 |
| **Fragmentos por rodada** | junto com os baús | É a moeda de entrada do baú, não faz sentido sozinha |
| **Simulador de baús no painel** | junto com os baús | Portar o simulador seria portar a economia junto |
| **Campo `brilho` das arenas** | L-027 ✅ | Ele documentou e nunca construiu; construído no V1.20 |

**Nada mais dele ficou de fora.** A varredura que sustenta isso é a mesma do
inventário: as funções que existem na v1.0 e não existiam na v0.8, conferidas uma
a uma contra o que entrou nos blocos V1.13 a V1.15.

**A partir daqui ele trabalha em cima da nossa versão**, e a tabela de precedência
do `PORTE_v1.0.md` deixa de ser necessária — ela existia para reconciliar dois
ramos que andaram em paralelo.

---

### L-029 — a tela principal reprova no teste dos 3 segundos

**Dono:** trilha `R` (proposta abaixo) · **Achado por:** crítico cego, portão Q7

Primeira aplicação do Q7 ao produto. Um crítico recebeu dez capturas em quatro
larguras e uma barra nomeada — **TESTE DOS 3 SEGUNDOS**: um apostador novo, sem
instrução e sem rolar, responde quanto tempo falta (P1), em quem apostar e com
que retorno (P2), quanto tem e quanto vai apostar (P3), o que está acontecendo
(P4) e, na luta, se o lutador dele está vivo e em que posição (P5). Nota de 0 a 5
por pergunta e por largura, com **o lugar exato da tela** onde o olho responde —
nota sem localização não valia.

Ele não sabia o que tinha sido construído, nem por quem, nem o que se esperava
ouvir.

```
              1920   1440   1100    420
P1 tempo        1      1      0      0
P2 em quem      3      3      1      0
P3 quanto       4      4      4      3
P4 o que é      2      2      1      1
P5 vivo/pos    2/3    2/0    0/0    0/0
```

**Os cinco, em ordem de gravidade:**

1. **Abaixo de 1440 o objeto da aposta sai da tela.** A 1100 px a arena, o cartão
   de escolha, o relógio e o botão de iniciar estão TODOS abaixo da dobra, e nada
   sinaliza que há algo lá. O layout degrada por *amputação do centro*, não por
   reordenação: a coluna que some é a única clicável. Numa janela de 30 s, o
   jogador gasta o começo dela rolando para descobrir onde se clica.
2. **Não existe relógio.** O produto inteiro é uma janela de 30 s e o cronômetro
   é um sufixo de ~7 px (`QUEM VENCE? — 29s`) dentro de um cabeçalho, sem barra e
   sem rótulo. É o menor texto de uma tela com tipografia display sobrando em
   cinco lugares. Um número grande e uma barra que esvazia **reduzem** ansiedade
   — prazo previsível é o contrário de pressão artificial (cap. 28).
3. **Duas listas concorrentes, nenhuma completa — e a probabilidade real só
   existe no painel de ADM.** `ODDS AO VIVO` mostra **100 % nas doze linhas**
   durante a aposta (é vida, não chance — lê como defeito); o cartão clicável
   mostra **8 de 12** sem dizer que faltam quatro; e o `p 5,96 % ±1,01 %` por
   lutador, que é o argumento de venda do produto, está na tela de depuração.
   **É problema de posicionamento, não de layout:** vendemos odd auditável e
   escondemos a auditoria do cliente.
4. **Durante a luta não dá para saber se VOCÊ está vivo.** São ~30 s sem nenhuma
   ação disponível: a tela tem uma função só, responder P5, e não responde. Os 12
   sprites do campo são anônimos, o seu é marcado por um chip de 10 px com texto
   de 6 px, e a colocação está fora da tela em 1440.
5. **A tela do jogador exibe erro de build, hash de commit e painel `DEV`.**
   `⚠ trilha não encontrada — coloque battle-theme.mp3…`, `commit 5dbaccab…`,
   `Velocidade do replay 1.0x`. Ocupa a quarta coluna de cinco em 1920 — espaço
   nobre gasto para reduzir credibilidade num produto que pede confiança.

**O que ele mandou NÃO mexer**, e vale tanto quanto a crítica: as fichas de valor
(único elemento nota 4 nas quatro larguras); a confirmação de aposta repetida em
quatro lugares (parece redundância num diff, é o que faz o jogador confiar que a
aposta entrou); o botão `Cancelar aposta e ficar de fora` com texto por extenso;
o `ODDS AO VIVO` durante a luta com os eliminados riscados; e o aviso do painel
de ADM sobre o PIN.

**Uma correção ao relatório dele:** ele apontou a arte do Coliseu e do Campo
Gelado como "borrada". Não é. O `#overlay` da fase de aposta tem
`backdrop-filter: blur(4px)` desde o V1.13, de propósito, para o cartão de
escolha ficar em foco — ele comparou telas de fases diferentes. **Mas o achado
por baixo do erro é bom:** o jogador passa metade da rodada sem ver a arena que o
V1.14 construiu, e ninguém tinha reparado.

**Por que isto é lacuna e não defeito:** nada aqui está quebrado. A tela funciona,
e os 299 testes que dizem isso continuam certos. O que ela não faz é ser lida em
três segundos — e isso é trabalho de desenho, com escopo próprio, não conserto.

---

### L-032 — a idempotência tem duas redes e a suíte só alcança uma ✅ FECHADA

**Dono:** F1.6 · **Achada por:** sabotagem do F1.4 · **Fechada com:**
`test/concorrencia.mjs` — **e a premissa dela também estava errada**

### O que ela dizia

Que a carteira protege a idempotência duas vezes — consulta prévia dentro da
transação e `UNIQUE` em `wallet_ledger.idem_key` — e que num processo só elas
são redundantes, porque `node:sqlite` é síncrono. Que o `UNIQUE` era **a rede do
TOCTOU entre processos**: dois lendo "não existe" no mesmo instante e os dois
escrevendo. E que fechá-la exigia um arnês com processos de verdade.

### O arnês foi construído

`tools/q8-worker.mjs` é um processo de verdade; `test/concorrencia.mjs` dispara
até doze deles contra o **mesmo arquivo** de banco, com **barreira por instante
combinado** — cada filho espera até um `alvoMs` e só então dispara. Sinal do pai
chegaria em ordens diferentes, e o teste mediria a ordem de entrega em vez da
corrida.

O arnês **prova a si mesmo**: ele mede a janela de término e reprova se os
processos rodaram em fila, senão seria um teste que passa por não testar.

### O que a medição achou

**1. O TOCTOU entre processos NÃO EXISTE com este armazenamento.** Com oito
processos de verdade e a mesma chave:

| removido | oito processos |
|---|---|
| só o `UNIQUE` | **passa** |
| só a consulta prévia | **passa** |
| as duas | reprova (creditou **800** em vez de 100) |

É o mesmo resultado da suíte de um processo. O motivo é o `BEGIN IMMEDIATE`:
ele adquire o lock de escrita na abertura, então **a consulta prévia já é atômica
em relação aos outros escritores**. A janela que a lacuna descrevia está fechada
antes de qualquer uma das duas redes agir.

**2. E o `BEGIN IMMEDIATE` é a guarda que ninguém estava protegendo.** Com as
duas redes no lugar e a transação em `BEGIN DEFERRED`, **três dos cinco testes
caem** — e não por dinheiro duplicado, por `database is locked`: dois leitores
tentando virar escritor no mesmo instante é um impasse que o `busy_timeout` não
resolve. Quatro dos oito processos voltam com erro.

> **O modo da transação decide se há concorrência ou impasse.** Havia defeito
> plantado para a transação SUMIR (`S151`) e nenhum para ela ser REBAIXADA — que
> é o erro que alguém comete de verdade ao "simplificar" a linha. Virou o `S174`.

### Onde a redundância continua fazendo sentido

O `UNIQUE` fica. Ele não guarda contra um buraco vivo — guarda contra a troca de
armazenamento. Um banco com lock por LINHA em vez de por arquivo (Postgres, por
exemplo) não serializa escritores, e ali a consulta prévia volta a ter janela. A
constraint é a rede que sobrevive à migração, e o custo dela é zero.

---


### L-033 — o backend inteiro existe e nada dele é alcançável por HTTP ✅ FECHADA

**Dono:** **F1.13** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:** F1.8

Os módulos do F1.3 ao F1.9 estão construídos e testados: autenticação, carteira,
scheduler, transporte, aposta, limites, proteção. O `servidor.mjs` continua com
as **três rotas do F1.1** — `/saude`, `/api/rodada/digital`, `/api/rodada/preco`.
Nada mais tem porta.

Cada bloco construiu a sua peça e nenhum montou o serviço. Não é descuido de um
bloco: **nenhum bloco tinha isso no escopo**, e o roteiro da Fase 1 vai do
transporte (F1.6) direto ao perfil (F1.10) sem passar pela montagem.

Duas consequências concretas, e as duas são de portão:

1. **O Q6 do F1.8 e do F1.9 não pôde ser exercido como o bloco pede.** "Burlar o
   limite chamando a API direto" e "contornar a autoexclusão por API direta"
   pressupõem uma API. As duas garantias existem na fronteira do domínio — a
   `apostar()` recusa —, e é ali que elas foram testadas. **A rota vai precisar
   do mesmo teste quando nascer**, porque rota nova é caminho novo.
2. **A tela de limites do §28.3 não tem como existir.** O cliente hoje é
   offline e fala com `app/modules/banco.mjs`; uma tela de limites contra o
   armazenamento local ou duplicaria a regra no cliente — que é exatamente o
   item "deixar o limite valer só na interface e não no servidor" da lista de
   sabotagem do F1.8 — ou seria uma tela morta.

**O que a destrava:** o F1.13, que expõe as rotas e liga o cliente a elas. As
telas de limites e de autoexclusão do §28.7 ("acessíveis a partir da carteira e
do perfil, em no máximo dois níveis") saem com ele, e é lá que o Q7 dessas telas
acontece.

**FECHADA no F1.14, e não no F1.13 — a diferença importa.** O F1.13a deu porta a
tudo e cobriu as duas consequências nomeadas acima:

| consequência | onde ela é medida hoje |
|---|---|
| Q6 do F1.8 pela rota | `test/rotas.mjs` · `o limite do §28.3 bloqueia a APOSTA PELA ROTA`, `o cooldown de aumento NÃO pode ser encurtado pela rota` |
| Q6 do F1.9 pela rota | `test/rotas.mjs` · `a pausa do §28.4 bloqueia a aposta PELA ROTA`, `NÃO existe rota que encerre uma pausa` |
| a tela de limites do §28.7 | `app/modules/protecao-tela.mjs` · `test/protecao-tela.mjs` |

**O que faltava e ninguém tinha notado:** ter porta não é a mesma coisa que ter
serviço. Depois do F1.13a as rotas existiam e **nada girava atrás delas** — nada
chamava `tick()`, nada nunca chamou `transmitir()`, e `GET /api/rodada`
respondia `{ rodada: null }` num servidor de verdade. A lacuna dizia "nada é
alcançável por HTTP"; a resposta completa exigia que houvesse o que alcançar.

O `server/laco.mjs` e a porta `GET /api/sala` (F1.14, primeira metade) são essa
parte. O teste que fecha a lacuna é `um servidor que só subiu já tem rodada, sem
ninguém pedir`, em `test/laco.mjs` — o `principal.mjs` inteiro, sem uma linha a
mais para alguém lembrar de escrever.

**O que NÃO é desta lacuna:** ligar o cliente às rotas. Isso é a segunda metade
do F1.14, e está na **L-036**.

---

### L-034 — dois dos sete sinais de risco não têm de onde medir

**Dono:** `recovery_deposit` → **F2.x, o gate do §25.1** · `odd_hour` → **F1.11**
· **Notada em:** F1.9

`sinaisDeRisco` mede cinco dos sete do §28.6. Os outros dois estão na lista
`SINAIS` — ela é o contrato do documento e não pode encolher — e não acendem:

- **`recovery_deposit`** é "compra de PC-T logo após perda relevante". Não existe
  compra de PC-T, e ela não pode existir antes do checkpoint do §25.1. Medir
  antes seria medir zero e chamar de calmaria.
- **`odd_hour`** é "deslocamento sistemático do horário de jogo". Precisa de
  semanas do histórico da PRÓPRIA conta para haver horário habitual de que se
  deslocar — o §28.6 é explícito em que a base é a conta, não a população. Com
  contas de dias, qualquer horário é o primeiro horário.

Os três limiares que já medem (`chasing`, `velocity`, `depth`) são chute educado,
e isso já está na **L-011**. Esta lacuna é sobre os dois que nem chute têm.

**O que a destrava:** dados. O F1.11 traz o painel e a série temporal por conta;
o `odd_hour` é calculável no dia em que houver quatro semanas de histórico.

---

### L-035 — suíte que dispara processo filho invalida o cache do Q2 inteiro ✅ FECHADA

**Dono:** **T4** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:** a
mudança de estratégia do Q2

O cache de vereditos derrubou o portão Q2 de ~100 min para **4 min** quando nada
muda, porque um veredito só é reavaliado quando alguma coisa de que ele depende
mudou. Isso depende de saber de que a suíte depende — e `test/fecho.mjs` sabe,
**menos quando a suíte dispara um processo**:

```
portao         TUDO      roda `node test/run.mjs` numa caixa de areia
concorrencia   TUDO      roda `tools/q8-worker.mjs`, oito processos de verdade
```

`TUDO` é o fecho universal: qualquer mudança em qualquer arquivo invalida os
vereditos dos defeitos que essas duas pegam. **É decisão, e é a decisão certa**
— o que um processo filho toca não se lê estaticamente, e a regra do arquivo é
que toda dúvida resolve para `TUDO`, porque errar para mais custa uma
reavaliação e errar para menos faz o portão mentir.

**Medido: 14 dos 202 defeitos indexados** têm captor de fecho universal —
`portao` 9, `concorrencia` 1, e **quatro que a medição revelou**: defeitos cuja
mutação quebra o carregamento do módulo. Nesses, a execução morre antes de
qualquer teste, nenhuma suíte é nomeada, e sem nome de captor não há fecho de que
depender. Continua sendo vermelho — o defeito É pego —, mas eles pagam o caminho
completo para sempre.

**O que está adiado não é a correção, é a precisão.** Hoje o custo é pequeno:
189 dos 208 defeitos continuaram reaproveitados. O incômodo é a direção — cada
bloco novo que escrever um teste com processo filho joga mais defeitos no balde
universal, e o teto desce sozinho.

**Fechada pelo T4.** O fecho segue o script disparado quando o caminho é
literal, e segue os imports dele junto: `concorrencia` saiu de `TUDO` para 9
entradas, com `server/carteira.mjs` e `server/banco.mjs` entre elas. O caso
`(não carrega)` ganhou fecho próprio — o arquivo mutado mais o arnês.

O que continua universal, e por decisão: comando que não é `node` nem binário
conhecido, caminho vindo de variável, e disparo que o leitor não consegue ler.
Cinco defeitos plantados guardam essas recusas, porque num bloco que encolhe
fecho o perigo não é encolher de menos.

### E os "14 de fecho universal" viraram ZERO no T13 (16/09/2026)

A frase *"os 14 reavaliados com o repositório intocado"* aparece aqui e no
`CLAUDE.md`, e **deixou de ser verdade**. Medido com a árvore idêntica entre
duas execuções:

```text
antes do T13    14 reavaliados     os de fecho universal
depois do T13    0 reavaliados     1002 reaproveitados, em 3 min 02 s
```

Fecho universal **não** quer dizer "reavalia sempre": quer dizer "reavalia se
QUALQUER arquivo mudar". Com a árvore intocada, nenhum muda — e os 14 só
reavaliavam porque alguma coisa mudava toda execução. Eram as saídas do próprio
portão e, depois do D-106, o `test/defeitos-plantados.mjs`.

**O balde universal continua sendo um problema de direção**, e o parágrafo acima
segue valendo: o que ele custa aparece quando o bloco de fato mexe em algo, e aí
os 22 fechos `TUDO` cobram 114. Reduzi-los é trabalho separado e ainda sem
bloco.

---

### L-038 — três mutantes equivalentes, e todos com a mesma forma

**Dono:** **T5** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:** F1.14

Três defeitos plantados neste bloco nasceram **equivalentes** — mutação
aplicada, comportamento idêntico, teste verde para sempre:

| | guarda mutado | guarda que já bastava |
|---|---|---|
| S222 | `caminho literal?` no fecho | `existsSync` logo abaixo |
| S234 | `clearTimeout` no `sair()` | `if (!ligada)` no `conectar()` e no `recuar()` |
| S238 | `quadro.startsWith(':')` | `if (!tipo \|\| !dados) return` |
| S211 | leitura campo a campo na rota | `validar()` no domínio já recusa |
| S125 | `--others` no `ls-files` da caixa | árvore limpa: as duas listas coincidem |

A forma é sempre a mesma: **guarda redundante sobre guarda que já basta**. Os
dois só divergem em entradas onde o mutante ACERTA — e por isso nenhum teste
pode separá-los, hoje nem nunca.

**A defesa em profundidade fica.** Ela é boa: três guardas independentes contra
sala fantasma é exatamente o que se quer num caminho que corrompe a tela do
jogador. O que estava errado era onde o defeito foi plantado, e os três foram
reapontados para o guarda que de fato segura alguma coisa.

**Cinco, não três — e o quinto tem outra roupa.** O S125 não é guarda redundante
sobre guarda: é a mesma ENTRADA vista por dois caminhos que só divergem num
estado que a suíte não cria. Numa árvore limpa, `git ls-files` e
`git ls-files --others` devolvem o mesmo conjunto, e o mutante fica idêntico —
ele só é observável durante um bloco em construção, que é justamente quando o
portão costuma rodar. Generalizando: **mutante equivalente é equivalente SOB O
ESTADO QUE O TESTE MONTA**, e às vezes o que falta não é o teste, é o estado.

**E um deles não era equivalente — era um defeito nosso.** Ao medir se o S211
era explorável, o mutante saiu MELHOR que o original em três entradas. Mutante
que melhora o produto é sinal de que o código limpo está errado, e estava: era
o **D-020**, valor ilegível virando pedido de remoção de limite. A investigação
de mutante equivalente vale por si.

**O que isto custa hoje:** os três primeiros só foram descobertos porque o Q2
completo rodou e devolveu `PASSOU`. Dois deles custaram um portão inteiro cada — 44 min
na primeira vez. Um mutante equivalente é indistinguível de um teste faltando
até alguém sentar e ler os dois guardas.

**O que a destrava:** um passo de pré-voo que rode cada defeito NOVO contra a
suíte antes de o portão inteiro começar, e reprove o que passar — o mesmo lugar
onde hoje se confere âncora. Custa segundos por defeito novo e devolve a
resposta no minuto zero em vez de no minuto 44. Não elimina o mutante
equivalente (nada elimina — é indecidível em geral), mas move a descoberta para
antes do custo.

**Por que não coube no F1.14:** o bloco já estava mexendo no `sabotagem.mjs`
para o teto por mutante, e duas mudanças no arnês do portão no mesmo commit
seriam duas coisas para desconfiar quando o portão desse errado.

---

### L-036 — o cliente ainda guarda a própria carteira

**Dono:** **F1.14** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:** F1.13

O F1.13 pôs de pé as rotas e as telas de proteção do §28.7. O que ele **não**
fez é o laço de jogo: `app/modules/banco.mjs` continua guardando a carteira em
`localStorage`, a rodada continua sendo sorteada no cliente, e a aposta continua
sendo local. O servidor sabe fazer as três coisas desde o F1.4, F1.5 e F1.7 — e
agora tem rota para elas — e ninguém as chama.

**Por que não coube junto, e a razão não é tamanho:** as duas metades têm risco
oposto. As rotas são adição pura — nada do que existia mudou, e a suíte foi de
546 para 559 sem regressão. O laço de jogo muda a natureza de toda tela que
mostra saldo: o primeiro quadro deixa de ter saldo, a linha de base visual
inteira se refaz, e nascem três estados que o app nunca teve — carregando, sem
rede, reconectando.

Juntar as duas faria a regravação da linha de base acontecer no mesmo commit em
que as rotas nascem, e aí não haveria como saber qual das duas mudou a tela. É
a regra do `CLAUDE.md` sobre fixture regravada sem explicação, aplicada antes de
o problema existir.

**Meio caminho andado, e a metade feita é a inerte.** `app/modules/banco.mjs`
ganhou `modoServidor()` e `hidratar()`: com sessão, a carteira vira projeção do
que o servidor diz. O critério de saída já é medido — `test/laco-servidor.mjs`,
`limpar o armazenamento local não muda o saldo do jogador` — e passa, medido
pelo MÓDULO que o app carrega, não pela rota.

**O app não liga isso ainda, e há um teste afirmando a ausência de propósito**
(molde do `D-001`): quem chamar `hidratar()` no boot encontra
`o app ainda NÃO liga o modo servidor` vermelho. O vermelho é o lembrete de que
a rodada e a aposta precisam ir junto — ligar só a carteira daria duas fontes
para o mesmo dinheiro, que é pior que qualquer um dos dois modos inteiros.

**O que falta:** a rodada vindo do scheduler pela sala SSE em vez de
`newRound()` local, e a aposta indo por `/api/aposta`. É a metade que refaz a
linha de base visual inteira, porque o primeiro quadro deixa de ter saldo.

**O que a destrava:** o resto do F1.14, e o critério de saída dele é uma frase:
`localStorage.clear()` não muda nada do que o jogador tem.

**A ordem mudou depois do D-018.** O resto do F1.14 é o cliente reconstruindo a
rodada a partir de `revelado.raiz`, e o **F1.15** vai trocar essa raiz de 32
para 128 bits. Construir o cliente sobre a raiz velha é retrabalho garantido, e
por isso o F1.15 vem antes. A primeira metade do F1.14 — as duas pontas do
transporte — já está no ar e é inerte.

---

### L-037 — a tela "acertou e não ganhou" nunca foi lida de perto ✅ FECHADA

**Dono:** **V1.21** (é onde moram os itens de leitura da tela) · **Notada em:** F1.13,
ao consertar o driver de captura

O F1.9 criou a terceira tela de resultado — acertou o campeão e o retorno não
passou da aposta — e o Q5 daquele bloco pedia a captura dela. **Ela não foi
capturada no fechamento do F1.9**: o driver de captura não chegava ao estado de
resultado, e as três telas voltaram com "a rodada não chegou ao resultado". Eu
reportei o bloco como fechado com inspeção visual sem essa parte ter acontecido.

Consertado aqui, e a captura saiu. **O que dá para afirmar olhando:** a tela
NÃO comemora — não há troféu, confete nem saco de dinheiro, e o banner é
neutro. A regra do §28.5 está de pé na tela, e não só no teste.

**O que NÃO dá para afirmar:** se a linha do resultado líquido é legível. Ela
fica abaixo do banner, em corpo pequeno e contraste baixo, e no tamanho da
captura eu não consegui lê-la. É a linha mais importante daquela tela — "o
valor exibido é o líquido, com o bruto em segundo plano" —, e uma linha
importante que não se lê é o mesmo problema que a L-031 lista em outros pontos.

**Fechada.** A captura virou determinística e a caixa foi lida.

**O que travava era o arnês, e o diagnóstico estava errado.** Eu tinha
registrado que a semente fixa "não funciona porque o `getRandomValues` é
consumido antes de `novaRaiz()`". Rastreando o consumo de verdade:

```
Uint8Array(8)    id de sessão da telemetria
Uint32Array(1)   ← a raiz da rodada
Uint8Array(16)   o sal do commit
```

O primeiro inteiro de 32 bits **é** a raiz. O mecanismo estava certo desde o
começo; o que estava errado era a minha verificação, que clicava no lutador
antes de a lista existir e concluía "sem aposta". As raízes **2, 4, 5, 6 e 9**
têm o favorito como campeão — medidas com os 154.000 sims reais —, e com a raiz
2 plantada a captura acerta na primeira tentativa, sempre.

**O que ler a caixa mostrou, e nenhum teste tinha visto:**

```
destaque:    "0 💵"   14px, cor rgb(255,77,109) — o VERMELHO DE PERDA
explicação:  "o retorno de 💵 50 foi igual ao valor apostado"   7px
```

Três coisas erradas na tela que o F1.9 criou:

1. **zero líquido pintado de vermelho de perda.** Zero não é perda: é o dinheiro
   de volta. O §28.5 existe para impedir que a tela exagere para o lado
   otimista — exagerar para o pessimista é errar do mesmo jeito;
2. **a explicação em 7px**, herdada de `.loss small`. Na caixa de derrota
   aquela linha é decoração; nesta ela é o sentido inteiro da tela;
3. **a caixa reusava a classe `lose`**, e com ela a moldura vermelha de K.O.
   para um desfecho que não é derrota.

E, ao corrigir o corpo da fonte, apareceu a quarta: em tamanho legível a frase
ficava mais larga que a caixa e vazava por cima da arena, que é fundo desenhado
e de contraste imprevisível.

**A correção:** moldura própria (`.devolvido`, neutra), painel com largura
máxima para a frase quebrar dentro dele, e o texto reescrito para dizer a conta
— *"Você apostou 💵 50 e recebeu 💵 50 — o mesmo valor de volta."* O vermelho
fica só para `perda_parcial`, que é perda de verdade.

---

### L-031 — o que a TERCEIRA passada do crítico abriu

**Dono:** **V1.21** (proposto no `BUILD_BLOCKS`) · **Achado por:** crítico cego,
Q7, terceira medição, mesma barra

O V1.20 fechou os dez itens da L-030 e o crítico mediu de novo com o TESTE DOS 3
SEGUNDOS. Notas: **1920 → 6,25 · 1440 → 7,00 · 420 → 5,50** (P1–P4).

**Um achado dele foi corrigido dentro do V1.20 porque era regressão, não
acabamento:** em 420 px a lista de odds ficava fora da dobra, e dois textos
mandavam o jogador ir até ela. Era a única ação que o produto pede, invisível no
celular. A ordem em coluna única passou a mudar com a fase.

O que sobrou, por ordem de gravidade:

1. **A arena fica vazia durante a aposta, e lê como página que não carregou.**
   É o maior elemento da tela, e os lutadores só entram quando a luta começa. O
   crítico descreveu "fundo marrom desfocado com manchas". Não é defeito de
   execução — é o desenho da fase. A pergunta é se a entrada dos lutadores deve
   antecipar a luta.
2. **Em 1920 o layout ESTICA em vez de agrupar.** Nada cresce de corpo, então
   tudo fica pequeno e disperso: saldo e caixa de aposta ficam a 1.500 px um do
   outro. É a pior das três larguras **por ser a maior** — 6,25 contra 7,00 em
   1440. O `max-width` do `.app` resolveu o transbordo do V1.16 e não resolveu a
   densidade.
3. **`Iniciar rodada` em vermelho-vinho ao lado de `Auto: ON` em verde.** A ação
   primária tem cor de cancelar e a secundária tem cor de confirmar — hierarquia
   de cor invertida. E os dois se contradizem: se está em automático, para que
   serve iniciar?
4. **A identidade do jogador aparece duas vezes em 70 px.** `Treinador / NV 1` no
   header e `Treinador / NV 1 · Novato` no cartão logo abaixo, com o mesmo
   avatar, ocupando o topo — que é onde moram tempo, saldo e ação.
5. **A coluna esquerda se rearranja inteira quando a luta começa.** `Iniciar
   rodada` sobe, `SUA APOSTA` some, `SEU LUTADOR` nasce no meio. O olho tem que
   reaprender a tela no momento em que menos tem tempo.
6. **O retorno em dinheiro só existe DEPOIS de apostar.** Antes, a lista oferece
   `x5.26`; a linha `retorno se vencer: 263` só aparece com a aposta feita. A
   pergunta "quanto ganho se acertar" fica para o jogador resolver de cabeça,
   com um relógio de 29 s correndo.
7. **`±0,6` colado no `%`, minúsculo e sem explicação em lugar nenhum da tela.**
   É a margem de erro do estimador — informação que sustenta a promessa de odd
   auditável — e lê como ruído grudado no número mais importante da lista.
8. **Uma placa de vida aparece vazia e sem nome** no topo do painel central
   durante a luta. Pode ser lutador cujo sprite não chegou; pode ser defeito.
   **Precisa de medição antes de virar correção.**
9. **O emoji `💵` é usado como ícone de moeda inline E como botão no header** —
   o mesmo grafismo com dois significados, e em corpo pequeno vira um borrão.

**Um item da lista dele NÃO é defeito do produto:** o saldo pular de `20.950`
para `1.000` entre `aposta-feita.png` e `luta.png`. São contextos de navegador
diferentes na mesma execução do `npm run olhar` — artefato da ferramenta, não da
tela. Fica registrado aqui para o próximo crítico não gastar o achado de novo.

---

### L-030 — o que a segunda passada do crítico deixou aberto ✅ FECHADA

**Dono:** V1.20 · **Achado por:** crítico cego, Q7, segunda medição ·
**Fechada no:** V1.20

Os dez itens, e o que foi feito com cada um:

**1. `R$` ao lado de cada valor — DECISÃO DO DONO, e ele decidiu tirar.**
Perguntado entre tirar de tudo, manter só no depósito ou manter como estava, o
dono escolheu **tirar de tudo**. Cada ficha dizia "50 / R$ 5,00", o saldo dizia
"1.000 / R$ 100,00", o retorno dizia "263 (R$ 26,30)" — ensinava a taxa de 10 PC
= R$ 1,00 como se fosse regra e fazia a PERDA ser sentida em reais, que é o que
uma moeda simulada não deveria conseguir fazer (§P1, cap. 28).

> **O que ficou em reais, e por quê:** o **preço dos pacotes** da loja simulada.
> Ali o real não traduz um saldo — ele é o produto, e a tela já se declara
> simulada. Tirar o preço da loja não deixaria a moeda mais simulada; deixaria a
> loja sem preço. `emReais` foi **deletada**, não comentada: função exportada que
> ninguém chama é convite para a anotação voltar sem decisão.

**2. A grade de HP na fase de aposta.** `#hud.dormindo{display:none}`. Some de
vez em vez de esmaecer: doze barras a 30 % continuam sendo doze barras e
continuariam disputando a primeira fixação com o painel de odds. Na luta ela
volta igual.

**3. "até 9.505" invertia a intuição de odds.** Virou `máx 9.505`, com a
explicação inteira no `title` e o rótulo `stake máx` na faixa de coluna. "Até",
lido depressa, é o teto do que se GANHA; o §4.4.6 limita o que se APOSTA.

**4. O `%` mudava de significado entre as fases.** Resolvido por **faixa de
coluna**, e a primeira tentativa foi descartada olhando a captura: pôr "CHANCE"
em cima de cada número resolvia o significado e custava uma linha por lutador,
o que empurrou a **odd** — o segundo número mais importante da tela — para o
menor corpo da linha. A faixa diz `lutador · chance · odd · stake máx` uma vez,
no topo, e troca para `lutador · vida · odd · abates` na luta.

**5. A barra do cronômetro não tinha trilho.** Tinha, em `rgba(0,0,0,.55)` sobre
fundo escuro — invisível. Sem o comprimento total à vista, 18 px não se leem
como "resta um sexto". O trilho é o denominador da fração.

**6. A CTA central não mudava depois da aposta confirmada.** Duas coisas erradas
de uma vez: o painel dizia "escolha na arena" e o canvas dizia "escolha na lista
de odds" — duas instruções para a mesma ação apontando para lugares diferentes —
e nenhuma saía depois de cumprida. Agora `atualizarCTA()` deriva do estado, num
lugar só. **Dois defeitos apareceram só na captura:** a confirmação caiu em cima
do selo de arena (que tem z-index maior) e saiu cortada no meio da palavra —
mudou para o canto inferior direito, o único livre dos três selos; e o texto do
painel dizia "na lista **ao lado**", verdade em três das quatro larguras e
mentira em 420 px, onde a lista desce.

**7. O bracket decorativo atravessava a primeira letra.** Não bastou recuar o
título: o `box-shadow` de 8 px espalhava o brilho da quina para dentro da letra.
Cantoneira de 12 px com halo de 4 px, e o título recuado 14 px. A cantoneira de
BAIXO tinha o mesmo problema, e apareceu no mesmo olhar — a última palavra de
"Seu lutador" terminava dentro dela.

**8. O rodapé de auditoria reprovava em contraste.** Medido: **3,55:1** contra o
piso de 4,5:1 da WCAG AA. Passou a usar `--dim`, que mede **5,46:1** e já
existia. Ganhou suíte própria — `test/contraste.mjs` —, que mede **no pixel**:
a cor que o jogador vê é `--panel` com alfa sobre `--bg` com gradiente por cima,
e ler o token responderia outra pergunta.

**9. A variante shiny piorava a leitura do campo.** A paleta shiny é arte de
terceiro e não se repinta — o que é nosso é a **separação**. Medido na cratera,
com a luta correndo:

| mediana de contraste lutador/piso | sem contorno | com contorno |
|---|---|---|
| normal | 1,43:1 | **1,75:1** |
| shiny | 1,26:1 | **1,99:1** |

A medição **confirma a queixa** (shiny ERA pior que normal) e a inverte: o halo
escuro rende mais onde o sprite é mais claro, que é o caso das paletas
alternativas. E resolve de quebra o Lapras azul-claro na cratera, que é o mesmo
defeito na variante normal.

**10. O perfil mostrava NV 54 com 0 rodadas.** O campo é `betsCount` e conta
APOSTAS FECHADAS; quem assiste sem apostar sobe de nível e não entra na conta. O
rótulo é que mentia. "rodadas" → "apostas", "rodadas disputadas" → "apostas
fechadas".

### A ressalva metodológica dele, e o que foi feito

Nenhuma captura de luta tinha aposta viva, então **P5 não tinha sido avaliado por
inteiro**. `npm run olhar` já produz `aposta-feita.png` e `luta.png` com aposta,
e a terceira passada do crítico cego recebeu as duas.

---


---

### L-039 — em modo servidor o cliente ainda cria uma carteira local no boot ✅ FECHADA

**Dono:** **F1.16** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:**
F1.14, pelo teste que joga uma rodada inteira no navegador

O boot chama `atualizarSaldo()` antes de `ligarModoServidor()`, e
`atualizarSaldo` chama `carregar()` — que cria a carteira local com o
`WELCOME_GRANT` de boas-vindas. Só depois o `hidratar()` substitui `S.carteira`
pela projeção do servidor.

**O que isso custa hoje:** nada de dinheiro. A projeção do servidor sobrescreve
a local antes de qualquer tela, e o `localStorage.clear()` continua não mudando
nada do que o jogador tem — o critério de saída do F1.14 vale. O que sobra é um
`WELCOME_GRANT` órfão no armazenamento de quem joga com conta.

**O que isso custa depois, e é por isso que fica registrado:** o teste
`em modo servidor o cliente NÃO escreve dinheiro no armazenamento` precisou
EXCLUIR o `WELCOME_GRANT` da conta para poder afirmar o resto. Toda exclusão
dessas é uma janela: no dia em que outro lançamento de boot aparecer, ele passa
pela mesma brecha sem ninguém notar. A afirmação forte — "em modo servidor o
cliente não escreve dinheiro nenhum" — só é possível quando o boot souber o modo
antes de criar carteira.

**O que a destrava:** inverter a ordem no boot, para que `modoServidor()` seja
consultado antes do primeiro `carregar()`. Parece uma linha e não é: `carregar()`
é chamado de vários lugares, e a versão certa é a fachada saber que, em modo
servidor, ela não é fonte — não que cada chamador lembre de perguntar.


**FECHADA no F1.16.** A fachada passou a saber que, em modo servidor, ela não é
fonte — em vez de cada chamador lembrar de perguntar. `carregar()` devolve uma
carteira VAZIA e espera a projeção; `salvar()` não escreve.

A exceção saiu do teste: ele afirma agora o ledger local **vazio**, sem lista de
tipos permitidos.

**O que a construção ensinou, e vale mais que o conserto.** As duas guardas
MASCARAM UMA À OUTRA: sem `salvar`, a carteira local criada não persiste; sem
`carregar` local, nada chama `salvar`. Olhando só o armazenamento, os dois
defeitos plantados passavam verdes. E amostrar o boot a cada 4 ms pegava o
primeiro por CORRIDA — teste cuja força depende de timing é teste que às vezes
não testa (D-021, quarta ocorrência).

A medição que funciona pergunta à fachada diretamente, com sessão ativa: o que
`carregar()` devolve, e se `salvar()` escreveu. Determinística, e cobra as duas
pontas separadamente.
---

### L-040 — o valor do resgate é chute educado até haver coorte

**Dono:** trilha `dados de produção` · **Mecanismo:** F1.10 · **Notada em:** F1.10

O §28.8 exige que o `rescue grant` tenha valor **fixo** e não diz qual. O F1.10
escolheu **20 PC-B**: é o que cabe no pote rotineiro de 30 sem consumi-lo
inteiro, deixando 10 para os desafios da mesma semana.

**Não é um número medido.** A pergunta que o calibra é econômica e precisa de
gente jogando: *quanto de resgate mantém o jogador arruinado no produto sem
virar a razão de ele ter zerado?* Alto demais e o resgate ensina que perder tudo
é o caminho mais curto para receber; baixo demais e ele é teatro — o jogador sai
mesmo assim, e a proteção do §28 não protege ninguém.

É a mesma classe da **L-011** (limiares de risco) e pelo mesmo motivo: até haver
coorte, não há de onde calibrar. Ficam nomeados e num lugar só —
`RESGATE_VALOR` em `engine/emissao.mjs` — para que a calibragem seja uma linha e
não uma caçada.

**O que a destrava:** o painel do F1.11 com série por conta, e semanas de
histórico. Duas medidas bastam: quantos jogadores arruinados voltam a jogar
depois do resgate, e quantos zeram de novo dentro da mesma semana. A segunda
subindo é o sinal de que o valor virou incentivo.

---

### L-041 — o operador do painel se declara, não se prova ✅ FECHADA

**Dono:** **F1.17** (proposto no `BUILD_BLOCKS` neste commit) · **Notada em:** F1.11

O F1.11 construiu **autorização**, **auditoria** e **confirmação** para o painel
admin. O que ele não construiu é **autenticação**: o operador chega num
cabeçalho `x-operador` com o próprio id, e o servidor confia.

**Por que ficou assim, e por que isso não é descuido:** as três camadas que o
§5.11 nomeia — papel, registro, confirmação — são de desenho, e desenho errado
não se conserta com login. Autenticação de operador é outra coisa: precisa de
credencial separada, segundo fator e rotação, e cada uma dessas é uma decisão de
produto que não cabia no escopo declarado do bloco. Construir meia autenticação
teria sido pior que nenhuma — ela pareceria proteção.

**O que já protege hoje, e não é nada:** um id de operador é um UUID, não é
enumerável pela rota (operador inexistente e sem papel dão a MESMA resposta), a
rota admin não aceita sessão de jogador, e toda ação fica registrada com quem,
o quê, de, para e por quê. O que falta é impedir que alguém que descubra um id
o use.

**O que a destrava:** o F1.17. Enquanto ele não existe, o painel só pode ser
exposto em rede fechada — e isso precisa estar escrito onde quem faz o deploy
vai ler, não só aqui.

**FECHADA no F1.17.** O operador entra com senha (scrypt, os mesmos parâmetros
do jogador) **e** segundo fator (TOTP com HMAC-SHA-256, sobre o SHA-256 que o
F1.15 escreveu — o projeto continua sem dependências). A sessão vive 8 h e gira
a cada 30 min, matando o token anterior na hora.

`x-operador` **deixou de ser aceito**. Mantê-lo "por compatibilidade" seria
manter aberta exatamente a porta que o bloco existe para fechar — e o teste que
prova o critério de saída manda o id do operador como token e cobra que não
abra nada.

O painel pode ser exposto em rede aberta.

---

### L-042 — o ContentPack original existe, é jogável, e não tem arte

**Dono:** trilha `arte` · **Bloqueia:** a troca de `ID_ESCOLHIDO`, que é o
critério de saída do F1.12 e o fim da Fase 1 · **Notada em:** F1.12

O pack `original_v1` está completo em tudo que é software: 76 criaturas com
nomes autorais, oito tipos numa roda fechada, golpes, climas, moeda e rótulos.
Ele passa no contrato, joga 300 rodadas sem falhar, e a distribuição de força do
elenco é a mesma sobre a qual margem, ruína e precisão de odd foram medidas.

**O que falta são 76 desenhos.** Enquanto eles não existem, cada criatura
aparece com a silhueta procedural de `silhuetaDe()` — nossa, determinística e
declaradamente provisória.

**Por que o produto NÃO trocou de pack mesmo com tudo pronto:** lançar com 76
silhuetas trocaria um risco comercial por um problema de produto. O §0.3.1 quer
a telemetria de retenção medida sobre o pack que será lançado; medi-la sobre
silhuetas mede outra coisa, e erra na direção oposta à da nostalgia.

**A troca é UMA LINHA** — `ID_ESCOLHIDO` em `content/escolhido.mjs` — e essa é
exatamente a promessa que a Content Layer fazia. Todo o resto está feito e
testado: a varredura garante zero identificadores da franquia em produção, e o
pack não tem caminho para cair no outro.

**O que a destrava:** os desenhos. `arte/original/README.md` diz como cada um
entra, e `COM_ARTE` é o livro-razão — ele responde "quanto falta?" sem ninguém
contar arquivo.

**O que ela destrava:** o Q5 e o Q7 do F1.12 — "o jogo inteiro capturado nos dois
packs" e o crítico cego com a barra do bloco. Os dois portões precisam de tela
com arte para julgar, e por isso o F1.12 fica **aberto no visual e fechado no
resto**.


---

## Estado de hoje: ARTE EMPRESTADA (build entre amigos)

**Decisão do dono do projeto**, e ela é legítima: enquanto o build for privado —
jogado por amigos, sem aquisição paga, sem monetização e sem a telemetria de
retenção sendo usada para decisão de negócio —, o pack original veste a arte que
o pack de desenvolvimento baixa, em vez das 76 silhuetas.

```
content/escolhido.mjs   ID_ESCOLHIDO        = 'original_v1'
                        ARTE_EMPRESTADA_DE  = 'pokemon_kanto_v1'
```

O empréstimo é **posicional**, e essa é a propriedade que o faz funcionar: o
elenco original foi gerado com os mesmos percentis de força, então a criatura de
índice `i` veste o lutador `i` de lá. O mais fraco veste o mais fraco, o mais
forte veste o mais forte — a arte acompanha o poder, e o jogador lê isso sem ler
número nenhum.

**O que continua NÃO satisfeito.** O §0.3.1 proíbe PUBLICAR um produto com stake
econômico sobre assets de terceiros. Um build entre amigos não é isso, mas a
distância entre os dois estados é **uma linha** — e é exatamente por isso que
ela mora num lugar só, gritando, com `test/saida-v09.mjs` cobrando este registro
enquanto ela estiver ligada.

**A L-042 continua aberta**, e o que ela pede não mudou: 76 desenhos próprios.
`COM_ARTE` em `content/original_v1.mjs` é o livro-razão que os recebe um a um.

**Desligar é apagar uma linha:** `ARTE_EMPRESTADA_DE = null` volta às silhuetas.
---

### L-043 — o pack original tem outra distribuição de desfecho, e a economia foi medida na antiga

**Dono:** **F2.1** (a recalibragem econômica da Fase 2) · **Notada em:** ao trocar
`ID_ESCOLHIDO` para `original_v1` e OLHAR a tela de odds

O F1.12 herdou de propósito a distribuição de **força** do elenco medido: os
totais de base stats são os mesmos percentis. O que ele NÃO herdou — também de
propósito, para o pack não ser uma renomeação — foi o **recorte** entre os seis
stats, que é sorteado.

A consequência apareceu na tela, não em teste nenhum: o favorito da rodada saía
a **x5,22** onde antes saía perto de x2,10. Medido em 40 rodadas × 3.000
simulações:

| | favorito médio | × da média (8,3%) | odd máxima média |
|---|---|---|---|
| `pokemon_kanto_v1` | 24,5% | **2,9×** | 48,4 |
| `original_v1` | 19,0% | **2,3×** | 57,9 |

**O pack original é mais PLANO e tem cauda mais LONGA.** Nenhum lutador domina
tanto — o que é uma melhora em relação à **L-002**, que registra "um lutador
vence 4× mais que a média" como defeito do elenco antigo — e o azarão mais fraco
é mais fraco.

**O que NÃO mudou, e está verificado:** a margem da casa continua em 8,0%, e
`fixtures/margem.json` passa com o pack novo. Os tetos do §4.4.6 seguem valendo
e `test/exposicao.mjs` está verde. A troca não quebrou a economia.

**O que fica em aberto:** o Estudo Econômico mediu a **curva de ruína** — 100%
das simulações, mediana de 128 rodadas — sobre a distribuição antiga. Com odds
mais planas e cauda mais longa, a variância do jogador muda, e a mediana de
ruína provavelmente também. O número que o §28.8 cita para justificar o resgate
é daquela medição.

**O que a destrava:** refazer a medição de ruína sobre o pack que vai ser
lançado. É barato — o simulador existe — e não cabia neste bloco, que era sobre
o pack existir e ser jogável.

---

### L-044 — o balão do golpe passa por baixo do crachá de clima ✅ FECHADA POR DECISÃO

**Achado em:** R6, olhando a captura depois de o balão crescer.
**Bloco dono:** **R11** — o dimensionamento da arena, que reordena as camadas.

O balão do golpe vive no `#uiLayer` (`z-index:4`) e os crachás de canto são
`z-index:6`. Um Pokémon no canto superior esquerdo tem o nome do golpe coberto
pelo crachá de clima. Com o balão a 7px isso passava despercebido — era um
borrão atrás de outro. A 10px o nome é legível, e por isso a oclusão passou a
ser visível.

**Por que não foi corrigido no R6:** a correção óbvia — subir o `#uiLayer` —
está errada. O `#overlay`, que desenha a contagem e o resultado, é `z-index:5`.
Subir a camada dos balões acima dos crachás a colocaria também acima do
resultado, e o nome de um golpe passaria por cima do "venceu a rodada".

A ordem certa é `arena < sprites < balões < crachás < resultado`, e reorganizar
isso é mexer no empilhamento inteiro da arena — que é exatamente o que o R11
faz. Fazer aqui seria mexer duas vezes.

**O que a destrava:** o R11 declarar a pilha de camadas da arena de uma vez, com
os cinco níveis nomeados.

---

### L-045 — o portão de contraste não enxerga `filter` ✅ FECHADA no R19

**Achado em:** R6, ao consertar o nome do derrotado na barra de vida.
**Bloco dono:** **R11**, junto com a pilha de camadas da arena.

O `contrastes` do `test/visual.mjs` lê `getComputedStyle().color` e caminha para
cima somando `backgroundColor`. Isso é correto para tudo que o portão mede hoje
— e **é cego para `filter`**.

`.plate.dead{filter:grayscale(1) brightness(.62)}` escurece a barra INTEIRA,
texto incluído. Medir aquele elemento pela cor declarada devolveria um número
que não é o que está na tela: a razão real é menor, porque as duas cores foram
escurecidas depois.

**Por isso a barra de vida NÃO foi acrescentada aos `ALVOS`.** Um alvo que
devolve o número errado é pior que um alvo ausente: o primeiro afirma, o segundo
cala. A legibilidade do nome do derrotado foi verificada OLHANDO a captura, e o
teste que a protege cobra a cor declarada ser clara — que é o que se pode
afirmar sem medir o resultado do filtro.

**O que a destrava:** medir a cor RESULTANTE, lendo o pixel da captura em vez do
CSS. O portão visual já captura e já lê pixel; é ali que isto encaixa.

---

### L-046 — o Rayquaza ao fundo das arenas ✅ FECHADA no R17

**Achado em:** R7, ao levantar o que existe de arte.
**Bloco dono:** **R7 (continuação)** — depende de material do dono do projeto.

O pedido inclui "o Rayquaza ao fundo das arenas". O único Rayquaza que existe no
projeto está em `arte/Gemini_Generated_Image_9rqhy19rqhy19rqh.jpg`, e ele **não
é uma arte de fundo**: é um mockup de tela inteira, com navegação falsa legível
embutida no pixel — `Home`, `About Us`, `Events`, `Contact Us`, `ENTER THE
ARENA`, `ABOUT`.

Usá-lo como fundo da arena colocaria uma barra de navegação falsa atrás da luta.
Recortá-lo por CSS para "pescar" o dragão de dentro do mockup produziria um
enquadramento que ninguém escolheu e que nenhum teste sabe julgar.

**Por que não foi substituído por outra coisa:** é a regra do `CLAUDE.md`, e ela
custou uma versão ao projeto — "o resgate busca a MESMA coisa em outro endereço,
nunca outra coisa". Um Rayquaza de outra fonte não é este Rayquaza.

**O que a destrava:** o Rayquaza separado do mockup, como o `LOGO-SEPARADO.jpg`
e o `LETRADO SHADOW-SEPARADO.jpg` já foram separados — fundo transparente ou
preto chapado, sem texto. Em `arte/`, que é a pasta versionada da arte nossa.

**O que JÁ foi feito no R7 sem depender disso:** o letrado e a pokébola cyber
voltaram à topbar, e a arte de fundo voltou à tela de entrada. As três regras
existiam no CSS e não eram usadas por elemento nenhum do corpo.

---

### L-047 — `margem.definir` tem papel e auditoria, e não tem rota ✅ FECHADA no R18

**Achado em:** R9, ao unificar o caminho do painel de ADM.
**Bloco dono:** um bloco de servidor, a propor no `BUILD_BLOCKS` — não é do R9,
que é sobre o CAMINHO e não sobre a capacidade.

O servidor já declara `margem.definir` como ação **destrutiva**, com papel
exigido em `EXIGE` e passagem obrigatória pelo `agir`, que registra auditoria e
cobra confirmação. Tudo isso existe.

**O que não existe é a rota.** As administrativas hoje são:

```
POST /api/admin/entrar     GET /api/admin/painel
POST /api/admin/sair       GET /api/admin/auditoria
```

Nenhuma delas define margem. Ou seja: a ação está desenhada e desarmada.

**Consequência de hoje, e ela é aceitável:** ninguém define margem por caminho
nenhum, e toda rodada usa a do motor — que é a única auditável. O painel diz
isso na tela, com o número.

**Por que o R9 não abriu a rota:** o escopo dele é fechar o caminho fraco, e ele
o fechou. Abrir uma rota administrativa nova é superfície de ataque nova, e
superfície nova pede o portão Q6 do próprio bloco dela — com teste de papel
insuficiente, de confirmação ausente e de auditoria não gravada. Enfiar isso
aqui seria construir a defesa e o ataque no mesmo commit, sem portão para
nenhum dos dois.

**O que a destrava:** um bloco de servidor que exponha `margem.definir` com os
três testes de recusa e o de registro, e o cliente que a consuma pelo `apiAdm`
que o R9 já deixou pronto.

---

## Como as quatro lacunas do R7–R11 fecharam (23/08/2026)

**L-044 — o balão sob o crachá de clima. FECHADA POR DECISÃO DO DONO.**

> "Acho que após o ajuste de largura da dimensão da arena, os balões ficaram
>  visíveis e com melhor visualização dos ataques. Por hora pode-se deixar
>  como está."

A lacuna nasceu porque o balão cresceu no R6 e passou a colidir com o crachá.
O R11 corrigiu a proporção da arena e a caixa mudou de forma; o dono olhou o
resultado e decidiu que o problema deixou de valer a correção. **Não foi
resolvida tecnicamente — foi dispensada**, e a diferença importa: se o balão
voltar a incomodar, a análise do R7 continua válida e a ordem de camadas
(`arena < sprites < balões < crachás < resultado`) continua sendo o desenho
certo.

**L-045 — o portão de contraste cego para `filter`. FECHADA no R19.**

Ele passou a CONTAR o efeito do filtro em vez de ignorá-lo. A conta mora em
`app/modules/filtro-cor.mjs`, pura e testada em `test/filtro-cor.mjs` com
valores conhecidos da especificação de Filter Effects.

Ler o pixel da captura foi descartado por dois motivos, e o segundo é o que
decide: exigiria decodificar PNG, e o projeto não tem dependência — mas, acima
disso, **um pixel é uma amostra**. Texto é antialiasado, e a borda de uma letra
devolve uma mistura que não é nem a cor do texto nem a do fundo.

Com a conta no lugar, a barra de vida do derrotado entrou nos alvos do portão —
o alvo que o R6 deixou de fora de propósito. Ele é medido e **passa**: a
correção de cor que o R6 fez se confirma sob medição real.

**L-046 — o Rayquaza. FECHADA no R17.**

O dono pediu que eu mesmo removesse os textos. `tools/preparar-arte-arena.mjs`
recorta a faixa sem a interface falsa e escurece o letrado, e é reprodutível:
as medidas do corte são o registro do que foi removido.

**L-047 — a rota de margem. FECHADA no R18.**

A ação existia com papel, confirmação e auditoria desde o F1.11, e não tinha
rota — desenhada e desarmada. Agora tem `POST /api/admin/margem`, a margem é
dado do servidor (`casa_config`), e a rodada a usa. O teste que fecha a lacuna
é o que prova que a rodada USA o valor: margem que se grava e não precifica é
configuração decorativa.

### L-048 — as três cenas antigas não passam pelo catálogo do acervo

**Registrada em:** R30. **Bloco dono:** um bloco futuro de arte, quando houver
motivo para mexer nelas de novo.

`cidade`, `portal` e `nucleo` ganharam `--foco` e `--tira` no R30, como as dez
novas, e a faixa do topo delas passou a ser enquadrada de propósito. O que ficou
para trás é que elas **não estão em `CENAS_ARTE`**: os valores delas moram só no
CSS, e o teste `os valores do CSS batem com os do catálogo` não as cobre.

A consequência prática, hoje, é uma duplicação incômoda: `tools/folha-acervo.mjs`
repete os três valores num `TIRA_ANTIGA` só para a régua desenhar a fatia certa.
Duas cópias do mesmo número, e nenhuma delas com teste amarrando.

**Por que não cabe agora:** as três não passaram pela esteira — os arquivos delas
estão em `arte/`, não em `arte/acervo/`, em tamanhos e proporções diferentes das
derivadas. Trazê-las para o catálogo sem derivá-las faria `arquivoCena()` mentir
sobre onde o arquivo mora, e derivá-las agora é retrabalho de arte fora do escopo
do R30.

**O que a destrava:** rodar as três pela esteira, para `arte/acervo/`, e apagar o
`TIRA_ANTIGA`. O teste do catálogo passa a cobrir treze cenas em vez de dez.

### L-049 — a linha de base visual não fotografa mais a fase de contagem

**Registrada em:** R30, ao fechar o D-040. **Bloco dono:** um bloco futuro de
instrumentação visual.

A última causa do D-040 era o relógio: a captura da arena caía ora antes, ora
depois da virada de `betting` para `countdown`, e nenhuma espera resolve porque
não há evento para esperar. O conserto fixa `S.clock` antes da digital, e com
isso a linha de base passa a fotografar SEMPRE a fase de aposta.

**O que se perdeu:** a fase de contagem — `3, 2, 1 · BATTLE!!`, o maior texto da
tela — deixou de ser fotografada. Dois defeitos plantados que dependiam disso
(`S355`, `S410`) ganharam asserção direta no R30 e estão cobertos, com vantagem:
eles agora dizem O QUE está errado em vez de só acusar pixels diferentes. Mas o
ESTADO em si não é mais visto por ninguém.

**Por que não cabe agora:** capturar a contagem de forma determinística exige
fixar o relógio num valor DE CONTAGEM e esperar a entrada dos lutadores
estabilizar — que é uma sequência animada com custo próprio. Fazer isso dentro
do R30 seria mexer no arnês visual pela terceira vez no mesmo bloco, e foi
justamente mexer nele sem medir que criou o D-040.

**O que a destrava:** uma tela `contagem` no `telas` de `test/visual.mjs`, com
`S.clock` fixado num valor de contagem e a entrada já concluída, medindo
estabilidade em quatro execuções antes de entrar na linha de base — o mesmo
critério que fechou o D-040.

### L-050 — a Liga sabe colapsar contas ligadas, e ninguém as liga sozinho

**Registrada em:** R36. **Bloco dono:** um bloco de antifraude, sem escopo ainda.

O §6.8 exige que "contas ligadas não somam", e o R36 cumpre a regra: o ranking
colapsa o grupo inteiro num competidor só, com fecho transitivo, e representa o
grupo pela conta de MAIOR AMOSTRA — o que faz espalhar previsões entre contas
PIORAR a posição, em vez de melhorar.

**O que falta é o gatilho.** A `identidade_ligada` guarda que duas contas foram
ligadas e por qual CLASSE de sinal, e quem escreve nela hoje é operador, à mão.
Detecção automática — dispositivo, rede, padrão de horário, que é o que o §1546
da Spec descreve como vetor de farm — não tem dono em bloco nenhum.

Na prática: **a regra existe e não é acionada sozinha.** Uma pessoa que abre
cinco contas hoje aparece como cinco competidores até alguém ligar as contas.

**Por que não cabe agora:** detecção de multi-conta é um bloco inteiro, com
decisões que não são de engenharia — que sinais o produto coleta, por quanto
tempo guarda, e o que acontece com um falso positivo. O comentário da própria
`identidade_ligada` registra a fronteira: ela guarda a CLASSE do sinal e não o
sinal, "porque o §28 é requisito de proteção, não de vigilância". Um bloco de
antifraude que ignore isso transforma a tabela de proteção num alvo.

**O que a destrava:** a política de sinais decidida pelo dono do projeto. A
mecânica já está pronta dos dois lados — `ligarContas` para escrever e
`contasLigadas` para ler.

### L-051 — os testes de settlement apostam valor fixo no campeão, e a cauda continua aberta

**Registrada em:** H1, ao fechar o D-044. **Bloco dono:** um bloco futuro de
higiene da suíte, ou o primeiro que mexer em `aposta-servidor`.

O D-044 foi fechado trocando slot fixo por favorito nos testes em que o slot é
**acessório**. Cinco testes não puderam ser trocados porque o slot é o que eles
afirmam: os de settlement apostam no **campeão** ou num **perdedor**, e trocar
isso apagaria o teste.

Esses cinco continuam apostando valor fixo (100) numa odd sorteada. Medido em
150 rodadas, a odd do campeão ficou entre x1,60 e x112,61, e o teto de 50.000
só reprova acima de x500 — então **o defeito não foi observado ali**. Mas
`ODD_MAX` é `null` no `engine.mjs`, a maior odd de rodada observada foi x563, e
nada impede o campeão de ser esse lutador.

**Por que não cabe agora:** a saída é derivar o valor da odd
(`min(100, teto/odd/folga)`), e ela deixa cada asserção de saldo com uma conta
que o leitor precisa refazer para entender o que o teste afirma — foi a saída 2
que a própria ficha do D-044 rejeitou. A saída boa é outra e é mais cara: uma
rodada de **odds fixadas** para os testes de settlement, o que exige um caminho
de semente controlada no `criarScheduler` que hoje não existe.

**O que a destrava:** o caminho de semente controlada. Ele também serve à L-049
e a qualquer teste futuro que precise de uma rodada reprodutível — o que faz
dele um bloco com mais de um cliente, e por isso vale ser feito direito.

### L-052 — três testes de aposta aceitam QUALQUER recusa, e uma delas seria a errada

**Registrada em:** H1, ao ler o `aposta-servidor` inteiro por causa do D-044.
**Bloco dono:** o mesmo da L-051.

Os testes de **slot inexistente**, **apostar em nome de outro** e **conta
congelada** afirmam só `ok(recusa(...))`: qualquer erro os satisfaz. Se a guarda
que eles medem sumisse e outra recusasse por outro motivo — o teto, o limite do
§28.3, a janela — eles seguiriam verdes.

Não é hipótese: o próprio arquivo já registra esse padrão como defeito, no teste
`liquidar antes do fim da rodada é recusado PELO MOTIVO CERTO`, com o comentário
que explica por que a primeira versão dele não protegia nada — *"duas guardas
seguidas e um teste que aceita qualquer uma delas é um teste que cobre só a
segunda"*.

**Por que não cabe agora:** o H1 é um bloco de higiene com escopo declarado — a
instabilidade do D-044 — e conferir código de erro em três testes é construção
de cobertura nova, não a mesma coisa. Misturar as duas faria o bloco entregar
mais do que a mensagem do commit diz.

**O que a destrava:** nada; é barato. Um `igual(e.codigo, ERRO_APOSTA.SLOT)` e
seus dois irmãos, com a sabotagem que prova cada um.

### L-053 — o `conferirAbates` do killfeed continua com a própria travessia

**Registrada em:** bloco 0.1, ao mover a aritmética de colocação para o motor.
**Bloco dono:** o próximo que tocar `app/modules/killfeed.mjs`.

Existem hoje três contagens de abate, e as três precisam concordar:

```text
killfeed.abatesDe(i)          o acúmulo AO VIVO, somado a cada abate
engine abatesNosEventos(i,ev) a recontagem dos eventos (nova, do bloco 0.1)
killfeed.conferirAbates()     uma TERCEIRA travessia, que existe para conferir
                              a primeira contra os eventos no fim da rodada
```

A terceira é hoje uma cópia da segunda, escrita antes dela existir. Enquanto for
cópia, ela pode divergir no dia em que o formato do evento mudar — que é
exatamente o risco que o cabeçalho do `colocacao.mjs` descreve, e o `S398` é o
defeito plantado que guarda esse caso.

**Por que não cabe agora:** o bloco 0.1 fecha o circuito da progressão. Reescrever
o conferidor do placar ao vivo é higiene do killfeed, com sabotagem própria, e
misturar as duas faria o commit entregar mais do que a mensagem diz.

**O que a destrava:** nada; é barato. `conferirAbates` passa a chamar
`abatesNosEventos` para o número por lutador, mantendo a contagem de tempestade
que só ela faz.

### L-054 — três dos cinco tipos de desafio ainda não têm quem os alimente

**Registrada em:** bloco 0.1, ao ligar `registrarFeito` à liquidação.
**Bloco dono:** sem dono; candidato natural é o bloco que ligar a sala ao perfil.

A liquidação passou a alimentar dois tipos do `POOL_PADRAO`:

```text
apostar       ✔  a liquidação sabe que houve aposta
vencer        ✔  a liquidação sabe se venceu
assistir      ✗  depende de presença na sala, que é do F1.6
variedade     ✗  depende de quantas ESPÉCIES distintas o jogador apostou no dia
aposta_alta   ✗  depende do tamanho relativo da aposta
```

Como o sorteio de `desafiosDe` é determinístico por (conta, dia) e tira três dos
cinco, há dias em que o jogador recebe um desafio que **não tem como progredir**.

**Por que não cabe agora:** cada um dos três precisa de um fato que a liquidação
não tem, e dois deles exigem decidir a regra antes de escrever o código —
"aposta alta" contra o quê, e se "variedade" conta espécie ou lutador. Adivinhar
aqui produziria um número plausível e errado, que é pior que a ausência.

**O que a destrava:** `assistir` sai de graça no bloco que ligar a sala;
`variedade` precisa de uma consulta às apostas do dia por espécie, que já é
derivável de `bets` + `round_fighters`; `aposta_alta` precisa da regra decidida
pelo dono do projeto.

### L-055 — o cosmético não sobrevive a limpar o navegador, e o F1.10 não o possui

**Registrada em:** bloco 0.1, ao fechar o `D-045`. **Bloco dono:** sem dono;
candidato é um bloco de perfil no servidor, depois da V1.

O bloco 0.1 fez XP, desafios e trilha de login sobreviverem a
`localStorage.clear()`. **Cosmético não sobrevive**, e a fronteira é decisão
declarada, não esquecimento:

```text
o servidor TEM coluna    xp · nome · avatar · banner_dex
o servidor NÃO TEM       battle (cena, efeito de nome, moldura)
                         shiny  (gifs, skins, onGif, onSkin)
                         estatística de aposta (mons, types, winMons, histBets)
```

`player_profile` nasceu na migração `progressao-5.10`, do F1.10. Os cosméticos
nasceram na V1.15, do R24 ao R43 — **depois**. O F1.10 não os possui, e o
critério de saída dele não fala deles.

**Por que não cabia no bloco 0.1.** A tentação era copiar a regra da carteira —
*com sessão não se escreve* — para o perfil inteiro. Isso teria apagado moldura,
skin equipada e desbloqueio shiny no primeiro reload: o bloco desfazendo vinte
blocos de arte para fechar um critério. A regra ficou dividida de propósito, e o
teste `com sessão, o cosmético continua sendo gravado localmente` é o que impede
essa linha de ser desfeita em silêncio.

**O efeito hoje, dito com todas as letras:** um jogador com sessão que limpe o
navegador volta com XP, nível e trilha intactos, e **perde** avatar escolhido,
cena, efeito de nome, moldura e os desbloqueios shiny. É melhor que antes, e não
é o que a frase "progressão sobrevive" faz alguém esperar.

**O que a destrava:** colunas para cosmético em `player_profile` — ou uma tabela
própria, que é provavelmente o desenho certo, porque o guarda-roupa cresce e um
JSON solto na linha do perfil vira o campo que ninguém migra. Depende também de
decidir se cosmético desbloqueado é INVENTÁRIO (e então tem regra de emissão e
antifraude, como qualquer coisa que se possa vender) ou preferência de tela.
Essa segunda pergunta é do dono do projeto, e ela muda o desenho.

### L-056 — o gancho que limpa as caixas não tem teste direto

**Registrada em:** bloco 0.3, ao fechar o `D-036`. **Bloco dono:** o próximo que
tocar `test/sabotagem.mjs`.

A ficha do D-036 pedia este teste: *rodar o portão de um jeito que aborte e
conferir que `tmpdir()` não ganhou diretório `pokearena-sabotagem-*` nenhum.*

Ele não foi escrito assim, e a REGRA foi extraída para `test/caixas.mjs` com
oito testes próprios — o que preservar, o que remover, o que já é órfão. O que
ficou sem teste direto é o GANCHO: que `process.on('exit')` e os sinais chamam
`limparCaixas` com a lista certa.

**Por que não cabia agora, em três motivos:**

1. **custo** — o único aborto que acontece DEPOIS das caixas existirem é o
   `base.vermelha`, e chegar nele exige copiar cinco caixas e rodar a suíte
   inteira dentro de uma. É um teste de minutos dentro de uma suíte que roda em
   7 s;
2. **sinal no Windows** — matar o processo de fora para exercitar `SIGTERM` não
   é confiável no Node em Windows, então metade do gancho não seria medida de
   qualquer forma;
3. **seam de teste** — a alternativa é uma variável de ambiente que faça o
   portão sair logo depois de criar as caixas. Isso é código que só o teste
   percorre dentro do arnês que existe para pegar exatamente esse tipo de coisa.

**O que cobre enquanto isso:** dois defeitos plantados. O `S521` remove o
`process.on('exit', limpar)` e o `S522` tira a `CAIXA_BASE` da lista que vai
para o limpador — o vazamento do caminho feliz, que é o que passou despercebido
por cinquenta blocos.

**O que a destrava:** um modo do portão que rode com UM defeito e uma caixa só,
já usado pelo `sabotagem:tocados`. Com ele o aborto fica barato o bastante para
um teste de ponta a ponta caber, e aí o seam deixa de ser necessário.

### L-057 — os lendários como raid cooperativa, e o elenco de cada modo

**Registrada em:** 30/08/2026, a partir de decisão do dono do projeto.
**Bloco dono:** sem dono — é Fase 4 (§8.9, combate PvE). Registrado agora para
o bloco 1.1 nascer sabendo, e não para ser construído já.

#### A decisão que já está tomada, e ela é do dono

```text
ARENA          só evoluções finais e bases sem evolução   (76 espécies, como hoje)
IDLE + TORRE   as 151 de Kanto, COM os intermediários
FORA DOS DOIS  Mew, Mewtwo, Articuno, Zapdos, Moltres
```

Os cinco não são capturáveis no farm normal. Eles são **bosses de raid**.

Consequência para o `1.1`: o `species` da coleção é MAIOR que o elenco da Arena.
Charmeleon, Kadabra e Graveler existem no seu time e nunca aparecem numa rodada.
Não muda o desenho; muda o tamanho da conta de arte do `P1.3` lá na frente.

#### O desenho da raid, com a correção que importa

**O boss NÃO dropa o lendário.** Ele dropa **essência** daquela espécie, e N
essências montam um.

O motivo é o único que interessa: um drop de 2% faz 98% dos participantes
saírem sentindo que perderam a noite. Com fragmento, **toda tentativa conta** —
é a diferença entre um sistema que prende e um que frustra, e é o mesmo
raciocínio que o dono do projeto já tinha escrito no QUADRO DE IDEIAS para os
fragmentos de chave de baú.

```text
cadência        um boss ativo por janela, rodando entre os cinco
                dias úteis alternados · fim de semana reservado ao mais raro
entrada         nível mínimo do TREINADOR, não do Pokémon — é o que faz dela
                objetivo de fim de jogo sem virar parede para quem tem sorte
recompensa      por CONTRIBUIÇÃO medida, e não por dar o último golpe
drop            essência da espécie do boss + itens de evolução + Trainer Coins
```

**Recompensa por contribuição, e não por abate**, porque a alternativa é o
roubo de kill — e num jogo com mercado isso vira serviço vendido em dois dias.

#### A regra econômica, e ela é a que protege o mercado

**A instância lendária nasce presa à conta.** Os DROPS dela — essência, itens —
são negociáveis; o Pokémon montado não é.

Sem isso o lendário vira o item mais caro do jogo na primeira semana e puxa toda
a atenção do mercado para uma loteria que não conversa com o resto. É o mesmo
motivo pelo qual o shiny fica preso à conta.

Com a essência negociável, quem não tem tempo de raid ainda participa do
mercado, e quem faz raid tem o que vender. O mercado ganha liquidez sem ganhar
um item que o domina.

#### Por que NÃO agora

Raid é combate PvE cooperativo, e o motor de combate de time é o `§8.2` — a
Fase 4. Construir raid antes da Torre seria construir o telhado antes da parede.

**O que a destrava:** o Trainer Battle Engine do §8.2, e a decisão sobre
quantas essências montam um lendário — que só faz sentido depois de medir
quanto tempo uma raid leva de verdade.

### L-058 — a carência antes de anunciar no mercado não tem número

**Registrada em:** 30/08/2026. **Bloco dono:** Fase 2, o bloco do escrow.

O dono decidiu que o que sai do farm só pode ser anunciado depois de uma
carência, e levantou 24 h e 48 h. A decisão do NÚMERO fica em aberto de
propósito.

**Por que a carência existe:** contra a conta descartável — farmar em conta
nova, despejar no mercado e sumir. Ela dá janela para a detecção de multi-conta
(`L-050`) agir antes de o valor sair.

**Por que o número não pode ser palpite:** carência curta demais não dá janela
nenhuma; longa demais pune o jogador honesto que capturou algo bom e quer
vender. O ponto certo depende de quanto tempo a detecção leva para decidir — e
esse dado só existe depois da Fase 1 rodando com gente de verdade.

**O que a destrava:** medir o tempo mediano entre o cadastro e o primeiro sinal
de conta ligada, com a `L-050` já construída. A carência é esse tempo mais folga.

### L-059 — as três decisões visuais do sub-jogo

**Registrada em:** 30/08/2026. **Bloco dono:** um bloco de direção visual,
antes do 1.5 (a Torre).

Decidido: sprite GBA fiel, tema neon na INTERFACE e não no mundo, treinador
visível com outfit trocável. Ver `docs/DESENHO_FASE1.md` §8.

Em aberto, e cada uma muda o que se constrói:

1. **como se assiste ao farm idle** — o treinador anda pelo cenário? A animação
   é opcional, de modo que dê para sair e ir jogar na arena enquanto roda?
2. **a batalha da Torre é automática, manual, ou escolha do jogador?** A
   referência citada é o Pokerogue, e a regra de cópia do `CLAUDE.md` se aplica:
   a nossa versão precisa de uma diferença que se possa nomear.
3. **as sprites do idle e da torre podem divergir das da arena?**

**O que a destrava:** direções visuais navegáveis, apresentadas como prévia em
`tools/previas/`, para o dono escolher ANTES de qualquer arte final ser
produzida. O caro em arte é decidir, não desenhar.


### L-060 — os 76 são da ARENA; o idle e a torre são 151, e faltam 75 sprites

**Registrada em:** 30/08/2026, correção do dono do projeto. **Bloco dono:** 1.1
para o dado; um bloco de arte para as folhas.

O dono corrigiu uma leitura minha: **a regra dos 76 vale só para a Arena.**

```text
ARENA          76 · só evoluções finais e bases sem evolução
IDLE + TORRE   151 · a Pokédex de Kanto inteira
FORA           Mew, Mewtwo, Articuno, Zapdos, Moltres — são raid (L-057)
```

**A consequência é concreta e ela é de asset.** As folhas de overworld do
`PMDCollab/SpriteCollab` que temos hoje cobrem exatamente as 76 da Arena —
foram baixadas para ela. Charmander, Kadabra e Graveler **não têm sprite**, e
são justamente os que só existem no idle.

Faltam ~75 espécies × 4 folhas. Não é código: o `tools/baixar-assets.mjs` já
sabe buscá-las com origem e espelho, e o que muda é a lista de dex que ele
percorre.

**O que isso exige do 1.1:** que o `species` NÃO derive do elenco da Arena. São
duas listas com propósitos diferentes, e tratá-las como uma só é o erro que faz
o intermediário sumir da coleção.

### L-061 — o mato alto, e por que ele não é enfeite

**Registrada em:** 30/08/2026, pedido do dono. **Bloco dono:** 1.2 (a captura).

O clássico: o treinador **entra na moita** e o encontro acontece ali. Só nos
biomas com vegetação — floresta, campo, oásis, estufa, praia. Gelo, caverna,
vulcão, deserto e ferro-velho não têm mato, e o encontro acontece no terreno.

**Por que ele importa mais do que parece.** Hoje o §7.5 diz que o encontro nasce
da RODADA — o jogador aposta e às vezes encontra. O mato dá ao encontro um
**lugar**: ele deixa de ser um sorteio invisível e vira uma coisa que o jogador
vê acontecer, num ponto da tela que ele escolheu pisar.

É a diferença entre "você encontrou um Oddish" numa caixa de texto e ver o mato
mexer. Custa quase nada e é metade da sensação.

**O que a destrava:** dois tiles de mato (parado e mexendo) e a regra de onde
ele nasce por bioma. O tile de mato ALTO também serve de oclusão — o personagem
entra e o mato passa na frente dos pés, que é o efeito que faz ele estar dentro
da cena.

### L-062 — a estética e a estrutura dos combates da Torre

**Registrada em:** 30/08/2026, a partir da ideia do dono. **Bloco dono:** 1.5.
**Não construir antes de decidir**; está aqui para amadurecer.

#### A ideia do dono, e por que ela é boa

> andares, com um líder de ginásio no fim de cada um, e a ORDEM DAS TIPAGENS
> mudando a cada partida — numa rodada o chefe do primeiro andar é elétrico, na
> seguinte é veneno.

O que ela resolve, e é o problema mais difícil deste gênero: **impede montar um
time e coastar.** Se a ordem fosse fixa, existiria uma resposta ótima e todo
mundo copiaria ela em duas semanas. Com a ordem rodando, cada subida exige
adaptar — e adaptar é perícia, que é exatamente o teto de habilidade que o
ROADMAP diz faltar na Arena.

#### A correção que ela precisa, e é uma só

**Sorteio desconhecido não é perícia, é cara ou coroa.** Se o jogador descobre
que o chefe é elétrico só quando a luta começa, ele não decidiu nada — ele
torceu.

> **O tipo do chefe é anunciado UM ANDAR ANTES.**

No fim do andar 3 aparece: *"andar 4 — chefe de VENENO"*. Aí a decisão existe:
subir com o time que está, gastar recurso para trocar, ou sair com o prêmio. O
sorteio continua; o que muda é que ele acontece **antes** da decisão em vez de
depois.

É o mesmo princípio do §4.5 na Arena — a odd é publicada ANTES da aposta. A
casa não esconde o que sabe; ela cobra para agir sobre isso.

#### A estética: reusar a batalha da Arena, e não inventar uma terceira

**Recomendação forte.** A Arena já tem uma apresentação de batalha construída e
polida por vinte blocos — sprites, coreografia, killfeed, pódio, efeitos de
nome, moldura. A Torre usar a mesma tela significa:

```text
uma linguagem de batalha para o jogo inteiro
a Torre nasce com o acabamento do R13 ao R44 de graça
quem aprende a ler uma, lê a outra
```

O mundo em vista de cima é a **exploração**; a batalha entra por cima, do jeito
que a Arena já faz. Inventar uma terceira estética seria pagar de novo por algo
que já está pago — e dividir a identidade do produto em duas.

#### Automático ou manual: os dois, e a escolha é do jogador

O dono citou o Pokerogue, e a regra de cópia do `CLAUDE.md` se aplica.

```text
AUTOMÁTICO por padrão   é um jogo idle; o jogador precisa poder sair e ir
                        apostar na Arena enquanto a torre sobe
"ASSUMIR O CONTROLE"    um botão, disponível a qualquer momento, que passa
                        aquela batalha para manual
```

**A diferença que se pode nomear**, e a regra exige nomear: no Pokerogue a
torre é o jogo. Aqui ela **alimenta a Arena** — o que você enfrenta na torre
vira dossiê, e o dossiê melhora a sua leitura na aposta. Nenhum outro tem isso,
porque nenhum outro tem a Arena atrás.

#### O que fica em aberto, e precisa de decisão

1. **quantos andares** por subida, e onde fica o ponto de sair com o prêmio;
2. **o que a derrota custa** — o quadro do dono fala em perder stamina, e o
   quanto muda o jogo inteiro;
3. **se o chefe é líder de ginásio nomeado** ou um treinador genérico do tipo.
   Nomeado é mais gostoso e amarra ao pack de conteúdo; genérico escala para
   qualquer ContentPack, inclusive o original do §0.3.1.

### L-063 — o cenário precisa de mais que árvore e pedra

**Registrada em:** 30/08/2026, observação do dono. **Bloco dono:** o bloco de
direção visual da L-059.

Duas coisas que o dono viu na prévia e estão certas:

**1. O nadador está fora da água.** O traje de cada cena foi escolhido pelo
bioma, mas a POSIÇÃO não — swimmer_m e swimmer_f estão em terra firme na praia
e no gelo. Ou eles entram na água, ou o traje deles não é o daquela cena.

**2. Só há árvore e pedra.** São os dois únicos props baixados, e eles se
repetem em onze biomas. Falta: mato alto (ver L-061), tronco caído, flor,
poste, placa, cerca, ruína de coluna, sucata, cristal, cacto. O `pokeemerald`
tem muitos deles em `graphics/object_events/pics/misc`, e o mesmo baixador
serve.

**A regra que vale para os dois:** o dono pediu que NPC e Pokémon pareçam
INSERIDOS no cenário, e não sobre ele. Já foram consertadas a densidade de
pixel, a era da arte, a oclusão e a sombra. O que falta é **coerência de
posição** — o nadador na água, o mineiro perto da pedra, o entomologista no
mato. Um personagem no lugar errado denuncia a colagem mesmo com tudo o resto
certo.

### L-064 — o 1.1 construiu a criatura, e ninguém a vê ainda

**Registrada em:** 30/08/2026, no fecho do bloco 1.1. **Bloco dono:** 1.3 (a aba
do dossiê).

O 1.1 fecha com a criatura **existindo de verdade**: ela nasce no servidor, é
auditável pela raiz, evolui pela linha do material de origem e é gravada com
CHECK em cada oculto. O que ela ainda não tem é **tela**.

```text
existe e está testado      geração, potencial, natureza, bioma, raridade,
                           linha evolutiva, item, banco, auditoria
não existe                 qualquer pixel que mostre isso a um jogador
```

Isto é escopo, e não esquecimento: o bloco 1.1 declarou "a criatura, sem
captura e sem tela", e as duas ficaram de fora de propósito. A captura é o 1.2
(com o mato alto da L-061); o dossiê é o 1.3.

**O que a destrava:** nada. As duas metades já conversam — `doJogador()` devolve
a coleção hidratada com potencial e forma, que é exatamente o que a tela pede.

### L-065 — `foco` existe na criatura e ninguém escreve nele

**Registrada em:** 30/08/2026, no fecho do bloco 1.1. **Bloco dono:** o bloco do
treino (Fase 1, ainda sem número).

A instância nasce com `foco: null` e a coluna existe no banco. É o lugar do
treino direcionado — a substituição dos EVs, na conversa com o dono. Nada
escreve nele hoje, e nada lê.

**Por que fica assim:** a coluna custa nada agora e custaria uma migração
depois; o comportamento, esse sim, precisa de decisão que ainda não foi tomada —
quanto o foco muda, se é reversível, e se é reversível quanto custa reverter. É
a mesma pergunta da natureza, que o dono já resolveu com "não se troca".

**O que a destrava:** decidir se o foco é reversível. Se for, ele não pode
viajar na venda pelo mesmo motivo que a natureza não pode ser trocada — senão o
comprador paga por um atributo que o vendedor podia refazer de graça.

### L-066 — a loja de dinheiro real, e o boost de stamina

**Registrada em:** 30/08/2026, decisão do dono do projeto. **Bloco dono:** o
bloco da loja, Fase 2 — **não existe ainda, e não pode existir antes do §25.1.**

#### A decisão do dono

Haverá loja com valores em reais: cosméticos e um **boost de stamina** com
limite de compra diário.

#### O problema, dito na cara

Num jogo em que o que se farma é **vendável**, vender farm é vender dinheiro.
Boost → mais expedição → mais criatura → mais venda. Isso é pay-to-win pelo
§P5, e é exatamente a classe de feature que o **§25.1** existe para travar.

#### As três regras que fazem a loja caber

```text
1. O BOOST SÓ TOCA STAMINA
   nunca raridade, nunca chance de captura, nunca potencial. O que decide o
   VALOR de uma criatura fica no mesmo relógio para todo mundo.

2. O TETO DIÁRIO É O MESMO PARA QUEM PAGA E PARA QUEM NÃO PAGA
   4 expedições concluídas por conta por dia. Comprar não levanta o teto.

3. O TETO É ALCANÇÁVEL DE GRAÇA
   coleção madura bate 4/dia sem comprar nada.
```

O que sobra para a loja vender é **horário, não vantagem**: quem tem coleção
pequena chega ao teto hoje em vez de daqui a duas semanas. Para quem já está no
teto, o boost não faz nada — e isso é a prova de que ele não é vantagem.

É a mesma frase que resolveu o loop arena→farm→mercado: **sorte e tempo viajam
na venda, gasto não.**

#### Medido no desenho

```text
boost          restaura a stamina de UMA criatura · limite 2/dia
compra ~200 de stamina/dia   contra ~1.200/dia que uma coleção madura produz
e mesmo esses 200 não viram expedição quando o teto de 4 já foi batido
```

O limite diário de compra é a SEGUNDA tranca na mesma porta. A primeira é o teto
de 4 expedições, que vive no motor e não na loja.

#### O que a destrava

O checkpoint do §25.1, e nada menos. O mecanismo pode ser CONSTRUÍDO antes —
com a chave desligada, no mesmo padrão do `ARTE_EMPRESTADA_DE` que hoje trava a
tag da v0.9 — mas não pode ser LIGADO.

#### O que ainda é decisão do dono

1. **o preço** do boost;
2. **se a loja vende só cosmético + boost**, ou mais que isso. Cosmético puro é
   o único item que não esbarra em nada disto.

### L-067 — outfits autorais no lugar dos do Emerald

**Registrada em:** 30/08/2026, decisão do dono do projeto. **Bloco dono:** 1.3
(a aba do idle) para o consumo; a arte chega antes, por fora.

#### A decisão

Os trajes de treinador que estão nas prévias vieram do `pokeemerald` — são
material de terceiros e são **100% padrão**, que é a crítica do dono. Ele está
produzindo outfits autorais em outra ferramenta e quer substituí-los.

**Isto é viável, e é a direção certa** — inclusive porque resolve metade do
§0.3.1 de graça: arte de treinador própria é arte que pode ser publicada.

#### O que é fácil e o que é trabalho

```text
FÁCIL      trocar a folha. O recorte, a oclusão, a sombra e a escala já
           existem e não olham para QUEM está desenhado.
TRABALHO   a animação. Ela não vem junto de uma imagem estática.
```

A movimentação eu construo, e a referência de RITMO pode ser a do Emerald —
copiar tempo de quadro não é copiar arte. Vale a regra do `CLAUDE.md`: entra
como matéria-prima, sai como coisa nossa.

#### A ESPECIFICAÇÃO, para a arte nascer usável

Este é o motivo de a lacuna existir agora e não depois: se a folha vier em outro
formato, ou ela é refeita, ou eu escrevo um conversor — e os dois custam mais
que acertar na origem.

```text
FOLHA       144 × 32 px, PNG, fundo TRANSPARENTE de verdade (canal alfa)
QUADRO      16 × 32 px — nove quadros lado a lado, sem espaço entre eles
ORDEM       0  parado, de frente        (olhando para baixo, para o jogador)
            1  parado, de costas
            2  parado, de perfil        (olhando para a ESQUERDA)
            3  andando de frente, passo A
            4  andando de frente, passo B
            5  andando de costas,  passo A
            6  andando de costas,  passo B
            7  andando de perfil,  passo A
            8  andando de perfil,  passo B
DIREITA     NÃO se desenha. É o perfil esquerdo espelhado — desenhar o outro
            lado dobraria o trabalho e criaria divergência entre os dois.
PÉS         na LINHA DE BAIXO do quadro. A sombra e a oclusão do cenário são
            calculadas a partir dela; um personagem flutuando meio pixel
            denuncia a colagem, que é exatamente o que o dono reclamou antes.
PALETA      poucas cores, sem antisserrilhado nas bordas externas. O cenário é
            GBA e mistura de densidade de pixel foi o defeito nº 1 das prévias.
```

**Um traje = uma folha.** O nome do arquivo vira o id do outfit.

#### Se vier em outro formato

Não é impeditivo, mas custa: uma folha em outra grade exige um conversor, e um
personagem sem alfa exige recorte por cor — que é o que já se faz com o
`pokeemerald` e que **é a fonte de metade dos defeitos visuais das prévias**.
Vale insistir no alfa de verdade.

#### O que fica em aberto

1. quantos outfits no primeiro lote;
2. se o traje é puramente cosmético (recomendação: **sim** — §P5) ou se marca
   algo, como bioma de afinidade. Cosmético puro não esbarra em nada.

#### CORREÇÃO (30/08/2026) — a especificação acima está SUPERADA

A tabela de "144 × 32, nove quadros de 16×32" que está logo acima **está
errada**, e fica registrada só para o histórico. O que a substitui saiu de
medir arte de verdade na `tools/previas/outfits-bancada.html`.

**O que mudou, e por quê.** O defeito de "parecem estar sobre o cenário" não era
o TAMANHO do sprite. Era o tamanho do PIXEL.

```text
DENSIDADE   quantos pixels de tela um pixel de arte ocupa   ← tem de bater
TAMANHO     quantos pixels de arte o personagem tem         ← é estilo
```

Um outfit nativamente **40×52** desenhado em 2× tem a MESMA densidade do chão.
Ele só fica mais alto que um do cartucho — dois tiles e meio em vez de dois — e
isso é escolha de estilo, não defeito. Esmagar para 16×32 jogaria fora o bolso,
o gorro e o cabo, que é justamente o que distingue um outfit do outro.

#### A ESPECIFICAÇÃO QUE VALE

```text
GERAR       TRÊS VISTAS: frente · perfil · costas, lado a lado
            (ou uma folha 3×3: LINHA = direção, COLUNA = quadro do passo —
             aí os seis passos são desenhados, e desenhado ganha de derivado)

FUNDO       magenta liso (#ff00ff) é a melhor matéria-prima. Branco também
            serve. O que atrapalha é antisserrilhado forte na borda.

TAMANHO     livre. A bancada DESCOBRE a grade nativa da arte e reduz para a
            altura alvo. Não precisa acertar pixel nenhum na origem.

PÉS         na base do desenho, os três na mesma linha. A sombra sai daí.

PALETA      poucas cores. A bancada avisa acima de 40 — o cartucho usa 16.

DIREITA     não se desenha. É o perfil esquerdo espelhado.
```

**Um traje = um arquivo.** O nome do arquivo vira o id do outfit.

O que EU derivo, e que você não precisa gerar: os seis quadros de caminhada
(quando a folha é de três vistas), o espelho da direita, o contorno reforçado,
a chave de cor e o corte das vistas.

#### Onde isto vive

`tools/previas/outfits-bancada.html` — arrasta o PNG, sai a folha de nove
quadros e o personagem andando nos cenários. Roda no navegador, sem instalar
nada, e o arquivo não sai do computador.

### L-068 — cinco biomas sem item de assinatura

**Registrada em:** 30/08/2026, no bloco 1.2c. **Bloco dono:** o primeiro bloco
que introduzir um CONSUMIDOR de item novo — treino, loja ou raid.

#### O que foi medido

Seis dos onze biomas de Kanto têm um item exclusivo; cinco não têm:

```text
Floresta         Pedra das Folhas
Praia            Pedra da Água
Campo            Pedra do Trovão
Montanha         Pedra da Lua
Vulcão           Pedra do Fogo
Ruína Afogada    Elo de Ligação
─────────────────────────────────────────
Caverna de gelo  —
Deserto          —
Oásis            —
Estufa Rachada   —
Ferro-Velho      —
```

**Não é defeito de rendimento.** O `tabelaDo()` redistribui o peso da classe
impossível, então esses cinco rendem exatamente a mesma quantidade — há teste
que mede isso, e ele existe justamente porque render menos por um motivo que
nenhuma tela explica é a pior forma de desequilíbrio.

#### O que falta, então

**Uma razão para ir lá que não seja o elenco.** Hoje a única coisa que
distingue a Estufa da Floresta é quem aparece. Para os cinco, escolher a rota é
escolher o elenco — o que é uma razão, mas é só uma.

#### Por que NÃO foi resolvido agora

Inventar cinco itens exclusivos hoje produziria **dado morto**: nada no jogo os
consome. O único consumidor de item que existe é a evolução, e ela já tem as
cinco pedras e o Elo.

Item sem consumidor é pior que item faltando — ele ocupa espaço na bolsa, na
tela e na cabeça do jogador, e ensina que colecionar item não serve para nada.

#### O que a destrava

O primeiro sistema que consuma item novo. Três candidatos, e cada um pede uma
coisa diferente:

```text
TREINO (o foco, L-065)     um item por bioma que empurre um atributo
LOJA   (L-066)             material que a Essência não compra
RAID   (L-057)             o fragmento de lendário, que já está no desenho
```

O **fragmento de lendário** é o mais provável, e é o que já está desenhado no
`docs/DESENHO_FASE1.md`: ele cai em biomas específicos e é o passe da raid.
Cinco biomas sem item e cinco lendários é uma coincidência boa demais para não
ser olhada quando a L-057 for construída.

### L-069 — o idle inteiro ainda não persiste

**Registrada em:** 30/08/2026, no bloco 1.2c. **Bloco dono:** **1.2d**, o
servidor do idle — próximo bloco, e ele existe por causa desta lacuna.

#### O que existe e o que falta

```text
EXISTE, puro e testado    expedição · stamina · encontro · captura · drops
EXISTE, no banco          a criatura (bloco 1.1, tabela `criaturas`)
NÃO EXISTE                expedição em campo · bolsa · dossiê
```

Ou seja: o motor sabe fazer tudo, e **nada sobrevive a um F5**. Uma Vigília de
oito horas não tem onde ser gravada, e uma bola sorteada não tem bolsa para
cair.

#### Por que ficou assim, e por que está certo

Os blocos 1.2a, 1.2b e 1.2c fecharam o MOTOR das três peças, cada um com o
próprio portão. Fazer o banco junto teria triplicado o escopo de cada um e
misturado dois tipos de defeito muito diferentes:

```text
no motor    a regra está errada          → pega em teste puro, barato
no banco    a regra some entre requests  → pega em teste de banco, caro
```

Separar deixou os três primeiros baratos de fechar. Agora o quarto paga o preço
uma vez só, e paga sabendo exatamente o que precisa guardar.

#### O que o 1.2d tem de construir

```text
expedicoes    quem, qual bioma, qual perfil, quando termina, a raiz do saque
bolsa         user_id · item_id · quantidade   (com CHECK de não negativo)
dossie        user_id · pack_id · dex · fragmentos
```

Três regras que já estão decididas e que o 1.2d tem de fazer valer:

1. **O saque é sorteado no SERVIDOR, na colheita** (§P2), com a raiz gravada
   como a da criatura — auditável pela mesma porta do §25.2;
2. **a raiz é sorteada na COLHEITA e não no início**, senão o jogador que
   soubesse o resultado poderia cancelar a expedição ruim;
3. **o teto diário e a stamina são conferidos no servidor**, mesmo que o cliente
   já tenha conferido — o cliente confere para desenhar o botão.

### L-070 — de onde vem cada outfit: as quatro procedências

**Registrada em:** 31/08/2026, decisão do dono do projeto; **ampliada no mesmo
dia** por ele, que trocou a pergunta de "jogador ou NPC" para "por qual porta
esse outfit entra". **Bloco dono:** o bloco que introduzir NPC no idle (batalha
de treinador) — ainda sem número — para as gavetas `npc`; o bloco da loja para
`loja`; o bloco do baú para `fragmento`.

#### A decisão do dono

Os dezessete outfits autorais não são todos para o jogador, e os que são não
começam todos abertos. São QUATRO gavetas, não duas:

```text
padrao      aberto para todos desde o primeiro login — o guarda-roupa inicial
loja        comprado. É a monetização, e o que se compra fica preso ao dono:
            não vai a market, não vira RMT (regra do dono, 30/08/2026)
npc         nunca do jogador. Veste o treinador que aparece no idle para
            batalha, e o chefe de andar da Torre (L-062)
fragmento   drop de baú. Fecha X fragmentos e SORTEIA entre N outfits — o
            sistema de baú já existe, o que falta é a tabela do sorteio
```

**A separação NÃO vai ser feita agora** — palavra dele: *"por hora não vamos
fazer a separação deles"*. O dono vai trazer o levantamento com as dezessete
artes, e a classificação é decisão dele.

#### O que a espera CUSTA, e por isso não se espera de graça

Classificar depois é barato; **inventar o campo depois é caro.** Se os outfits
entrarem sem procedência, no dia da separação existem dezessete peças na tela
sem lugar para escrever a resposta — e o mesmo vale para moldura, avatar,
cenário e efeito de nome, que são muito mais que dezessete.

Por isso a peça cosmética nasce **com** o campo, valendo `padrao` para todas
enquanto o dono testa. É uma linha hoje e um bloco depois. Ver L-072, que é onde
esse campo é desenhado para a área cosmética inteira.

#### O que já está resolvido, e não precisa esperar

A ESTEIRA. `arte/outfits/` recebe o PNG, a bancada devolve a folha de nove
quadros, e o 1.3 consome. **Não depende de ter os dezessete** — um outfit
funcionando prova o caminho, e o resto entra um arquivo por vez.

#### O que precisa de decisão junto com a separação

1. **como o jogador vê a diferença.** Um NPC vestido igual ao jogador confunde
   quem está na tela. Três saídas possíveis, e a escolha é de desenho:
   ```text
   conjuntos DISJUNTOS   nenhum traje é dos dois — mais simples, e custa arte
   marcador visual       um contorno, um ícone sobre a cabeça, um nome
   silhueta              NPC com paleta dessaturada, jogador saturado
   ```
   **Recomendação:** conjuntos disjuntos para o primeiro lote, porque é a única
   que não exige nada de código e não pode ser lida errado. Marcador visual
   depois, quando um traje precisar servir aos dois.

2. **se o traje é puramente cosmético.** Recomendação continua sendo **sim**
   (§P5) — traje que muda número é traje que se compra por vantagem.

3. **quantos entram no primeiro lote do jogador.** Nenhum é o errado: sem
   escolha, a personalização não existe; com dezessete, nenhuma tem valor.
   Quatro a seis é a faixa em que escolher significa alguma coisa.

### L-071 — o dossiê explicado ao dono, e o que ele ainda não faz

**Registrada em:** 31/08/2026, a pedido do dono. **Bloco dono:** 1.6 (a aba do
dossiê) para o que falta; a explicação é entrega de documento, não de código.

#### O que o dono pediu

Uma explicação **resumida e didática de como o dossiê funciona na prática** —
não a especificação, e sim o que acontece do ponto de vista de quem joga.

#### O que já existe, e é pouco

```text
EXISTE   o fragmento cai no ENCONTRO (não na captura) — bloco 1.2b
EXISTE   o alvo por raridade: comum 8 · incomum 12 · raro 20 · muitoRaro 30
EXISTE   a tabela `dossie` no banco e no navegador — bloco 1.2d e 1.3b
EXISTE   um resumo de duas linhas na aba: quantas espécies, quantos fragmentos
NÃO EXISTE  a ficha em si, o que ela mostra, e o que completá-la DÁ
```

#### A pergunta que a explicação precisa responder, e que ainda não tem resposta

**Para que serve completar uma ficha?**

O desenho diz "melhora a sua leitura na Arena" (é a ponte entre os dois modos),
mas o QUE isso é concretamente nunca foi decidido. Três candidatos, e a escolha
muda o produto:

```text
INFORMAÇÃO   a ficha revela o moveset e os stats reais do lutador na Arena
             — não muda o resultado, muda o que você SABE antes de apostar
COSMÉTICO    a ficha completa vira uma moldura, um selo no perfil
ECONÔMICO    a ficha completa vale Essência, ou desconto no mercado
```

**Recomendação: INFORMAÇÃO.** É a única das três que faz o idle e a Arena se
alimentarem de verdade, e a única que não esbarra no §P5 — informação não é
vantagem comprável, porque ela vem de jogar. As outras duas transformam o
dossiê em mais uma moeda, e o jogo já tem duas.

E é o que sustenta a frase que o projeto usa desde o começo: *o que você farma
vira dossiê, e o dossiê melhora a sua leitura na aposta.* Hoje essa frase é
promessa; com INFORMAÇÃO ela vira mecânica.

---

### L-072 — como a área cosmética inteira separa o que é dado do que é ganho

**Registrada em:** 31/08/2026, **a pedido explícito do dono do projeto**, que
mandou guardar e pensar: *"vá me cobrando"*, *"vá pensando"*. **Bloco dono:** o
bloco do guarda-roupa — ainda sem número; proposta abaixo. **Destrava:** o dono
decidir; não depende de código nenhum para começar.

#### O pedido, na palavra dele

> GRANDE parte cosmética será ganhada através de "recompensas" ou compras, não
> estarão disponíveis inicialmente. [...] mesma regra que se leva para tudo
> cosmético. HOJE em desenvolvimento de projeto, EU DEV tenho tudo liberado até
> pra ir testando e ver oque fica bom ou não.

Duas coisas, e elas são diferentes:

```text
A REGRA      cosmético se ganha ou se compra; quase nada nasce aberto
O ESTADO     hoje tudo está aberto, porque o dono precisa ver o que fica bom
```

O erro que isso evita é confundir os dois. Um cosmético aberto hoje **não é**
um cosmético gratuito — é um cosmético em teste, e o produto final o tranca.

#### Por que não é só uma trava

Já existe no repositório um catálogo cosmético com posse e equipado separados
(`shiny-dados.mjs`: `gifs`/`skins` guardam o desbloqueado, `onGif`/`onSkin` o
equipado). Esse desenho está certo e é o modelo. O que ele **não** tem é a
resposta para *de onde veio* — e é essa a pergunta que a loja, o baú e a missão
vão fazer, cada uma por um motivo diferente:

```text
a loja      precisa saber o que pode VENDER (e o que jamais pode: os de NPC)
o baú       precisa da tabela de sorteio, e ela não pode conter os de loja
a missão    precisa de um cosmético que não esteja em nenhuma das outras portas
o market    precisa RECUSAR o que veio da loja — regra do dono, 30/08/2026
```

Quatro consumidores, uma pergunta. Isso é um campo, não uma trava.

#### O que eu vou propor quando o dono chamar

Não é para construir agora. Fica escrito para não se perder, e para o dono
poder discordar antes de virar código:

```text
1. TODA peça cosmética ganha `procedencia`, e ela é OBRIGATÓRIA no ContentPack
   padrao · loja · fragmento · missao · npc
   Um teste recusa peça sem procedência — do mesmo jeito que o portão
   `conteudo` recusa identificador de franquia fora do pack. Esquecer passa a
   ser vermelho, e não silêncio.

2. `npc` NÃO É DESBLOQUEÁVEL, e essa é a única gaveta com regra dura:
   nenhuma porta a concede, nem loja, nem baú, nem missão, nem admin. Se o
   traje do adversário puder ser vestido pelo jogador, o mundo do idle deixa de
   ter gente própria — vira um espelho.

3. A LIBERAÇÃO DE HOJE É UMA CHAVE, e não a ausência de trava
   `MODO_VITRINE` liga tudo para o dono testar. O caminho de posse continua
   existindo e sendo exercido por trás; o que a chave faz é responder "tem" a
   qualquer consulta. Assim o dia de desligar é uma linha — e não a descoberta
   de que a posse nunca foi escrita.

4. UM TESTE DE DIETA, que é o que impede a loja de comer o jogo
   proporção mínima do acervo em `padrao` + `fragmento` + `missao`. O §P5
   proíbe pay-to-win e cosmético não é poder — mas um guarda-roupa em que 90%
   tem preço deixa de ser recompensa e vira catálogo, e aí o baú não vale nada.
   O número é decisão do dono; a existência do teto é recomendação minha.
```

#### Por que não cabe agora

O dono foi explícito: *"mas tratamos futuramente"*. E há um motivo técnico do
mesmo lado: a lista de dezessete outfits ainda não chegou inteira, e classificar
metade do acervo produz uma tabela que vai ser reescrita. O que **não** espera é
o campo — ver L-070.

---

### L-073 — o alinhamento pela base do outfit não é exercido por nenhuma arte

**Registrada em:** 31/08/2026, durante a sabotagem do bloco 1.5. **Bloco dono:**
o próprio 1.5, quando as demais artes do dono chegarem. **Destrava:** um outfit
cujos nove quadros não tenham todos a mesma altura.

#### O que a sabotagem mostrou

O `montarFolha` alinha os quadros pelos PÉS:

```js
g.drawImage(q, i * w + ((w - q.width) >> 1), h - q.height)
```

Sabotado para `0` — alinhar pelo topo — a suíte **continuou verde**. O teste
"todos os quadros se alinham pela BASE" não é fraco: ele afirma a coisa certa e
mediria a diferença. O que não existe é a **condição** que faz as duas fórmulas
divergirem, porque hoje os nove quadros saem do `passo`, que preserva a altura
do quadro de origem. Com `h === q.height` para todos, `h - q.height` é zero e a
sabotagem é um não-evento.

É a mesma classe do S577: **guarda não exercido**, e não teste decorativo. A
diferença importa — teste decorativo se reescreve, guarda não exercido se
alimenta.

#### Por que não se conserta agora

Fabricar um quadro de altura diferente só para o teste provaria que o teste
funciona sobre um caso que a esteira não produz. O caso REAL chega sozinho: um
outfit com cabelo alto de costas e boné baixo de frente sai com vistas de
alturas diferentes da redução, e aí o alinhamento passa a decidir alguma coisa.

**O que fica combinado:** quando as três artes pendentes forem convertidas,
medir as alturas dos nove quadros. Se alguma divergir, sabotar de novo e o
guarda passa a ser exercido de graça. Se nenhuma divergir, o alinhamento vira
código morto e a decisão passa a ser removê-lo ou provar que ele é necessário —
e as duas são respostas melhores que a de hoje.

---

### L-074 — três outfits só têm a vista de frente na arte de origem

**Registrada em:** 31/08/2026, ao converter o acervo inteiro. **Bloco dono:**
1.5c (mundo vivo). **Destrava:** arte, não código — o dono gerar as vistas de
costas e de perfil desses três.

#### O que acontece

A esteira lê a arte e encontra quantas vistas ela tem. Nove trajes converteram;
três vieram com material incompleto:

```text
femgirl      1 vista   (só a frente)
bugcatcher   1 vista   (só a frente)
fisherman    2 vistas  (falta uma)
```

`converter` completa repetindo a frente — a alternativa seria devolver `null` e
o traje sumir da aba. Repetir é o certo aqui, e por um motivo específico: **o
RETRATO desses três está perfeito**, e é o retrato que a aba de outfits mostra.
O buraco só aparece no mundo do farm, e só quando o boneco anda para cima ou
para o lado: ele continua de frente para a tela.

#### Por que não se resolve espelhando ou inventando

Espelhar a frente dá as costas de um boneco que tem mochila — o `bugcatcher`
tem cabos numa das mãos e o `fisherman` tem vara. Gerar as costas a partir da
frente por software é inventar arte, e o `CLAUDE.md` já proíbe a versão
genérica disso: *"o resgate busca a mesma coisa em outro endereço, nunca outra
coisa"*.

#### O que fazer, e é uma linha para o dono

Gerar `femgirl`, `bugcatcher` e `fisherman` no mesmo formato de grade dos que
deram certo — três fileiras: frente, perfil andando, costas — e jogar na pasta.
A esteira reconhece a grade sozinha e regrava a folha; o retrato não muda.

Enquanto isso os três ficam no acervo com `vistas: 1` (ou `2`), que é o campo
por onde qualquer teste ou tela pode saber que aquele traje ainda está
incompleto sem ter de olhar o PNG.

---

### L-075 — o Pokémon que acompanha usa o sprite de BATALHA

**Registrada em:** 31/08/2026, olhando a cena depois de ligar o companheiro.
**Bloco dono:** 1.5d (a fauna). **Destrava:** nada — a arte já está em disco.

#### O que acontece

`spriteCompanheiro` usa `dexURL`, que devolve o sprite frontal do PokeAPI — a
pose de batalha, de frente, parada. Num overworld visto de cima, ele fica
errado por três motivos ao mesmo tempo:

```text
PERSPECTIVA  é uma vista de frente reta, e o mundo é visto de cima
ESCALA       a arte tem margem transparente larga; desenhada em 32×32, o bicho
             visível ocupa ~12 px e some ao lado de um treinador de 52
MOVIMENTO    não tem quadro de andar, então ele desliza
```

#### O que resolve, e já está aqui

O bloco 1.5c baixou **33 sprites de overworld em GBA nativo** para
`assets/raw_githubusercontent_com/pret/pokeemerald/ow_*.png` — Psyduck,
Slowpoke, Machop, Pidgey, Wingull, Snorlax, Lapras e mais 26. Eles têm a
perspectiva certa, a paleta certa e quadros de caminhada.

Falta o mapa de espécie → sprite, e ele mora no ContentPack (§0.3): o pack de
Kanto diz qual arte cada dex usa, e o pack original terá a própria. Isso é
exatamente o trabalho do 1.5d, junto com a fauna decorativa.

#### Enquanto isso

O sprite de batalha fica. Some-lo seria pior: o jogador escolheu aquela criatura
para a expedição e ela precisa estar na cena. Feio e presente vence bonito e
ausente — e feio é visível, que é o que garante que ninguém esqueça.

---

### L-076 — o caderno de ideias do dono, tudo que ele lançou e ainda não virou bloco

**Registrada em:** 31/08/2026. **Bloco dono:** cada linha aponta o seu.
**Por que existe:** ele pediu, com estas palavras — *"só não perca as ideias,
procure armazenar literalmente tudo que for de implementação de ideias, pra não
acabar se perdendo"*.

A metodologia já manda registrar (`CLAUDE.md`, "A divisão de trabalho"): ideia
solta REGISTRA e ENCAIXA, não vira desvio de rota. Esta é a lista de encaixe.

#### Decoração e mundo vivo

```text
1.5f  A FAUNA DE CENÁRIO — Pokémon como NPC sem interação, por bioma.
      33 sprites de overworld já em disco. A regra dele é CURADORIA:
      "não é pra você poluir os biomas, é com olhar artístico adicionar
       oque pode ir em cada bioma" — e coerência: nada de Charizard na
      caverna de gelo, nada de Staryu no meio da floresta.
      Sai com PRÉVIA para ele apontar bioma por bioma.

1.5f  DECORAÇÃO NÃO É SÓ POKÉMON — "pode ser qualquer tipo de item
      decorativo relacionado ao universo". Árvore de Cut e rocha de Smash
      já estão em disco; o resto é busca.

1.5f  NÃO SE LIMITAR A UMA FONTE — "existe MILHARES de outros jogos,
      MILHARES DE FÃ GAMES". Vale para arte de decoração; continua valendo
      o §0.3.1 (publicar com stake econômico sobre arte de terceiro é que
      está proibido) e a regra de cópia do CLAUDE.md: referência entra
      como matéria-prima e sai com uma diferença que se possa NOMEAR.
```

#### Cosmético e economia

```text
—     AS QUATRO PORTAS dos outfits: padrao · loja · npc · fragmento.
      Campo já existe; a classificação é decisão dele. Ver L-070 e L-072.
—     O CHECK-LIST DA LOJA, que ele quer fazer antes da implementação.
—     A LOJA NÃO IMPACTA O MARKET: o que se compra fica presa ao dono e
      não vira RMT. Regra dele, 30/08.
```

#### Decisões dele que continuam abertas

```text
DEC-019  o `foco` é reversível?
DEC-075  quantos andares tem a Torre?
L-074    as três vistas de `femgirl` e `bugcatcher` — é arte, não código
```

#### O que EU devo cobrar

Ele pediu explicitamente que eu cobre o que ele esquecer. Cada item acima entra
no relatório de bloco até ser decidido; "ele não respondeu" não arquiva nada.

---

### L-077 — a tela da rota ajustável pelo jogador, e o relevo próprio de cada bioma

**Registrada em:** 31/08/2026, à noite, antes de o dono dormir. **Bloco dono:**
1.5i (a tela) e 1.5j (o relevo). **Estado:** em construção nesta ordem.

#### 1 · A TELA SE AJUSTA AO GOSTO DO JOGADOR

> "pode manter desse tamanho porém será regulado e extendido ao gosto do player,
>  na barra do canto inferior esquerdo similar a barra da arrastar do log de
>  batalha, o player pode ajustar a tela ao gosto dele, precisa ser muito bem
>  feito e testado para ir se ajustando a resolução"

Duas coisas, e a segunda é a que dá trabalho:

```text
A ALÇA      canto inferior, arrastar para crescer e encolher — o mesmo gesto
            que o log de batalha já tem, para o jogador não aprender dois
O AJUSTE    "muito bem feito e testado para ir se ajustando a resolução":
            a altura escolhida tem de sobreviver a trocar de janela, a rodar
            noutro monitor e a virar o celular
```

#### 2 · A CENA ESTÁ ESTICADA

> "essa pégada mesmo de agora ficou muito esticadona, precisa dar uma ajustada"

A proporção da janela era um número solto (`W * 0.58`), sem relação com o mundo.
O mundo é 704×448, proporção 1,57; a janela saía em 1,72 — mais larga e mais
baixa que o lugar que ela mostra, e o olho lê isso como esticado mesmo com o
pixel quadrado.

#### 3 · OS BIOMAS SÃO TODOS IGUAIS

> "atualmente todos cenários são basicamente iguais, da pra se fazer uma
>  diferença visual neles, ainda mais agora que boneco e pokémon rodam o
>  cenário [...] uma cachoeira em um bioma que caiba, um laguinho no meio com um
>  pokémon de água se refrescando, na caverna de gelo os flocos de gelo caindo,
>  e um pedaço de gelo rachado no chão, no vulcão as brasas voando e a lava
>  rachada em alguns locais do chão"

Isto é RELEVO, e não partícula. Hoje todo bioma tem a mesma planta — grama,
trilha, margem, água — e só troca de cor e de partícula. O que ele descreve são
acidentes do terreno, com lugar próprio:

```text
cachoeira      um bioma com desnível; a água cai e some na massa
laguinho       água NO MEIO do mapa, não só na borda — e alguém dentro dela
gelo rachado   trinca no chão, parada, que muda a leitura da superfície
lava rachada   fenda com luz por baixo, no vulcão
```

E a barra é dele: *"veja uma maneira que fique bonita e harmônica, não com cara
de amadora"*.

#### 4 · A DECORAÇÃO NÃO SE LIMITA AOS JOGOS

Reforçado de novo: qualquer elemento do universo, não só sprite de cartucho.
Continua valendo o §0.3.1 e a regra de cópia do `CLAUDE.md` — referência entra
como matéria-prima e sai com uma diferença que se possa NOMEAR.

---

### L-078 — a batalha de NPC, que é o resto do 1.7

> **FECHADA em 02/09/2026, no bloco 1.7b.** A recomendação abaixo foi construída
> como está. E a sabotagem dirigida achou, ao lado do defeito plantado, um
> defeito de verdade que eu tinha acabado de criar: o teto diário contava só os
> encontros SELVAGENS, então ir fundo dava encontros a mais por dia. Corrigido —
> `x.encontros` conta o total sorteado, porque o encontro FOI GASTO.

> **DESTRAVADA em 02/09/2026, e não por eu ter recebido o desenho.** O dono
> corrigiu duas vezes que DEC-095 a DEC-097 estão DECIDIDOS no mapa dele, e
> mandou seguir. Eu continuo sem o TEXTO das decisões — o que mudou é que
> esperar por ele deixou de ser o certo.
>
> Então vale a outra metade da regra da divisão de trabalho: **recomendação
> minha é o padrão, e ela tem de estar escrita antes de eu construir.** É o que
> segue. Se o mapa dele disser outra coisa, o custo é trocar NÚMEROS — a
> estrutura foi desenhada para isso, e as quatro constantes ficam juntas, no
> topo do módulo, com o nome do que decidem.

#### A recomendação, respondendo às quatro perguntas que eu mesmo listei

```text
QUANDO APARECE   durante a expedição, como fração dos encontros, e a fração
                 vem do ESTÁGIO. É o número que a L-084 pediu que a prévia
                 mostrasse, e ele passa a existir de verdade.

QUEM COMEÇA      automática. O jogador não está lá — é um idle. Pedir que ele
                 aceite exigiria presença, que é exatamente o que o modo não
                 tem. O resultado aparece na colheita.

O QUE RENDE      XP e Essência melhores (DEC-095). E o NPC OCUPA o encontro:
                 em vez de uma criatura para capturar, veio um treinador.

O QUE CUSTA      nada além disso — e é aí que o desenho fecha.
```

#### Por que "ocupa o encontro" é a peça que faz tudo funcionar

É o custo honesto, e ele resolve três problemas de uma vez:

```text
NÃO PRECISA de teto novo — o teto de encontros já limita, e a batalha entra
            dentro dele
NÃO PRECISA de custo de stamina — a expedição já pagou
É UMA TROCA de verdade: você abre mão de uma chance de CAPTURA em troca de
            XP e material melhores
```

Sem isso, a batalha de NPC seria renda extra pendurada no farm, e o §P5 voltaria
à mesa. Com isso, ela é uma moeda trocando por outra dentro do mesmo orçamento.

#### E ela não pune quem não está olhando

O resultado depende do nível da equipe contra o do treinador, e ele **escala a
recompensa** — nunca tira nada. Ganhar rende o bônus cheio; perder rende um
consolo.

> Um idle que castiga o jogador por estar ausente está castigando o jogador por
> usar o produto como ele foi feito.

E isso dá de brinde um portão SUAVE que complementa o duro: o estágio acima do
seu nível continua acessível e rende menos, em vez de ser uma parede a mais.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.7b. **Destrava:** o dono
reler o desenho dele.

#### O que já existe

Os treinadores MORAM no bioma (1.7a): dois por lugar, escolhidos por coerência,
andando com o mesmo passeio do jogador. A presença está pronta.

#### O que falta, e por que eu parei aqui

A batalha. Ela está no MAPA DE DECISÕES do dono, em DEC-095 a DEC-097, e eu não
tenho esse desenho nos documentos do repositório — só a menção em L-070 de que
o NPC dá "XP extra, marcado no log".

Construir a partir dessa frase seria inventar as regras que faltam: com que
frequência ele aparece, se a batalha é automática ou pedida, o que se ganha e o
que se arrisca, se há custo de stamina, se o NPC pode ser derrotado mais de uma
vez por dia. Cada uma dessas é uma decisão de economia, e a economia deste jogo
tem dono.

**A regra que eu apliquei**: recomendação minha é o padrão e eu sigo sem pedir —
mas ISTO não é uma recomendação minha, é uma decisão dele que existe e que eu
não consigo ler. A diferença importa: inventar por cima de uma decisão tomada é
pior que perguntar.

#### O que eu preciso dele, em uma frase

O trecho DEC-095 a DEC-097 do mapa de decisões, ou a resposta a estas quatro:

```text
quando aparece    de vez em quando no farm? ao colher? probabilidade?
quem começa       automática ou o jogador aceita?
o que rende       XP extra em quanto? item? fragmento?
o que custa       stamina? nada? uma vez por dia por NPC?
```

---

### L-079 — sete defeitos plantados que nenhuma afirmação pega

> **FECHADA — OS SETE** (01/09/2026): cinco no 1.5k, o **S614** no 1.5m e o
> **S592** no 1.5n. Cada um conferido por sabotagem dirigida: plantado a mao no
> modulo real, suite rodada, arquivo restaurado e conferido intacto.
>
> ```
> S587  concluidasHoje conta a JANELA de hoje       ✓ PEGOU  idle-dados
> S591  tabela de regra do motor no app             ✓ PEGOU  fonte-unica
> S616  o piso do zoom                              ✓ PEGOU  viewport
> S617  um lance por encontro, MESMO na falha       ✓ PEGOU  idle-dados
> S621  a semente do lance e DERIVADA               ✓ PEGOU  idle-dados
> S614  o lago cabe inteiro no mapa, com margem      ✓ PEGOU  relevo (1.5m)
> S592  a cena LE a caixa, nunca a impoe            ✓ PEGOU  visual (1.5n)
> ```
>
> **O S614 tinha caído da minha lista por erro de transcrição** — eram sete e eu
> escrevi seis. Quem o trouxe de volta foi a sabotagem completa, e não eu. Vale
> a nota: a lista escrita à mão de uma saída que a máquina já produziu é mais um
> lugar onde derivar não pode dessincronizar.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.5k (proposto: as suítes de
`idle-mundo` e `idle-dados`). **Estado:** aberta, com a lista fechada.

O `npm run sabotagem` completo, rodado sobre o `e8e81fb`, voltou **Q2 VERMELHO —
7 de 615 não foram pegos**. Não é ruído: são sete comportamentos que eu posso
quebrar hoje sem que uma linha da suíte reclame.

```
S587  o teto diario local vira teto para sempre      idle-dados.mjs
S591  a aba passa a ter a propria tabela de perfis    idle-mundo.mjs
S592  a cena volta a IMPOR a caixa em vez de LER      idle-mundo.mjs
S616  o zoom perde o piso e a imagem estica           idle-mundo.mjs
S617  o encontro sobrevive ao lance                   idle-dados.mjs
S621  o lance passa a sortear semente nova            idle-dados.mjs
```

(S592 e S616 já foram confirmados de novo na sabotagem parcial de hoje, junto
com o S623, que era meu e foi corrigido no mesmo bloco em que nasceu.)

#### Por que escaparam, que é a parte útil

Dois grupos, e a causa de cada um é diferente:

```text
idle-mundo.mjs    NÃO TEM SUÍTE. É camada 4 e depende de DOM, e foi por isso
                  que ficou de fora — mas S591 (tabela de perfis duplicada) é
                  fonte única, e isso se testa sem navegador nenhum.
idle-dados.mjs    TEM SUÍTE, e ela não cobre a JANELA (S587), a REMOÇÃO do
                  encontro (S617) nem a DERIVAÇÃO da semente (S621). São as
                  três regras que o dono mais vai sentir se quebrarem.
```

O S617 é o mais grave da lista. *Uma bola por encontro* é a diferença que o
`CLAUDE.md` manda NOMEAR frente ao material de origem: com o encontro
sobrevivendo ao lance, quem tem bolsa cheia joga até pegar e a escolha da bola
deixa de valer alguma coisa. O jogo continua funcionando e perde a decisão.

O S621 é o segundo: semente sorteada em vez de derivada quebra a auditabilidade
do §25.2 — e quebra em silêncio, porque o resultado continua parecendo aleatório.

#### O que a destrava

Uma suíte para `idle-dados` cobrindo as três regras (dá para escrever hoje, sem
navegador), e uma para `idle-mundo` separando o que é puro do que precisa de
DOM. O S592 e o S616 são de leitura de caixa e piso de zoom: esses dois pedem
navegador e entram junto do Q5.

#### A regra que isto expõe, e que vale escrever

Bloco fechado com Q2 vermelho é bloco fechado com o portão desligado. O 1.5i, o
1.5j, o 1.6 e o 1.6a fecharam assim — eu plantei os defeitos no fim de cada um e
não escrevi as afirmações que os pegam. **Plantar o defeito é metade; a outra
metade é a afirmação, e ela não é opcional.**


---

### L-080 — REGRA PERMANENTE: todo sprite de Pokémon mostrado ao jogador é GIF animado

**Registrada em:** 01/09/2026, a pedido direto do dono: *"os GIFS DE POKÉMON DO
PERFIL PRECISAM SER ANIMADOS, TODOS ESSES E TODOS FUTUROS QUE FOREM ADICIONADOS,
armazene isso"*. **Bloco dono:** todos. **Estado:** REGRA, não tarefa.

Vale para **normal e shiny**, e para todo lugar onde um Pokémon aparece ao
jogador: banner de perfil, equipe do idle, bolsa de drops, dossiê, prévia de
stage. A exceção é o **overworld**, que é folha de caminhada por natureza — lá o
movimento vem da folha, não do GIF.

Isto já custou um bloco inteiro (o `1.5c`, quatro sprites errados antes do
certo), e a lição de lá continua valendo do outro lado: **quem tem animação
própria vira elemento; quem eu animo fica no canvas.** GIF é elemento.

---

### L-081 — O banner do idle: o Pokémon do PERFIL, e o que o banner diz

**Bloco dono:** 1.6c. **Estado:** especificada.

Mesmo modelo visual do banner de batalha da arena. Três diferenças:

```
QUEM APARECE   o Pokémon escolhido na CUSTOMIZAÇÃO DE PERFIL — não o da arena
O QUE DIZ      bioma + stage + tempo restante de farm
               ex.: "Floresta de Viridian - Stage 2 - 02:45 restantes"
               NADA de odd, colocação ou informação de arena
QUAL DELES     só o que está COM O TREINADOR. Os outros três aparecem no
               quadro do L-083, e não aqui
```

**E falta um "NENHUM".** Hoje, escolhido um Pokémon de banner, só dá para trocar
por outro — não dá para tirar. Isso é uma porta que só abre num sentido, e o
jogador que se arrependeu fica preso à escolha.

O banner da **arena** não muda. Este é o formato do idle.

**E ele NÃO depende do painel (L-086).** Eu tinha posto essa dependência na
ordem de aplicação e o dono cortou, com razão: *"é o mesmo banner de batalha
qual já usamos na arena, você só vai fazer ele aparecer também na tela do
iddle"*. O componente existe; o que muda é onde ele aparece e o que ele diz.
Inventar dependência atrasa trabalho que já podia estar pronto.

**A linha de informação segue o Pokémon que está COM O TREINADOR em campo** —
*"precisa ser coerente ao pokémon que está junto ao seu treinador em campo"*. São
duas fontes diferentes no mesmo banner, e confundi-las é o erro fácil aqui:

```
a ARTE     o Pokémon do PERFIL (customização), animado, normal ou shiny
o TEXTO    o bioma + stage + tempo de quem está com o treinador AGORA
```

---

### L-082 — quatro expedições simultâneas, cada uma no seu bioma

> **CONSTRUÍDA em 02/09/2026, no bloco 1.9.** As vagas saíram de um campo do
> estado salvo (que era forjável — D-072) e passaram a ser DERIVADAS do dossiê:
> 1 vaga de saída, e mais uma a cada 10, 25 e 45 espécies vistas. O máximo
> subiu de 3 para 4, como o dono pediu.

**Registrada em:** 31/08/2026. **Atualizada em:** 01/09/2026, com a pergunta do
dono e a resposta que o código já tinha.
**Bloco dono:** 1.9. **Estado:** aberta, e DESTRAVADA — ver abaixo.

O dono perguntou, e a pergunta é boa:

> *"já foi implementada questão que pedi de enviar qualquer outro pokémon
> sozinho para outro bioma? isso se aplicava a quantidade de envio no teto e
> agora sendo encontro por teto como funciona? [...] ou você acha que não fica
> viável, até pela questão do farm não ficar muito pesado, o que você
> recomenda?"*

**Não foi implementada.** `E.simultaneas` existe, começa em 1, e a tela recusa
com "já há uma expedição em campo".

#### A recomendação, e ela é FAZER — com o motivo

**A troca do teto de envios para o teto de ENCONTROS já pagou o preço disto.**

Essa é a resposta inteira, e ela não é opinião: está em `comprometido()`.

```text
ANTES (teto por envio, 4/dia)
  cada expedição paralela era UM ENVIO A MAIS por dia
  4 slots = 4× o farm. Paralelismo era PODER, e caro de equilibrar.

HOJE (teto por encontro, 30/dia, com RESERVA)
  a expedição reserva o MÁXIMO do perfil ao sair, e devolve a sobra ao colher
  4 Trilhas juntas reservam 32 > 30 — a quarta é recusada na hora do clique
  paralelismo muda QUANDO você colhe, nunca QUANTO você colhe
```

O teto virou um orçamento do dia, e a reserva é o que impede gastá-lo duas
vezes. Com isso, mandar quatro bichos para quatro biomas não é uma alavanca de
farm: é **conveniência e imersão**, que é exatamente o que o dono queria dela.

> Em uma frase: **o paralelismo ficou de graça no dia em que o teto passou a
> contar o que sai, e não quantas vezes você clica.**

#### O que muda de verdade, e é bom

```text
ESCOLHA      quatro biomas ao mesmo tempo = quatro tabelas de drop ao mesmo
             tempo. Hoje o jogador escolhe UM bioma e desiste dos outros.
RITMO        Batida de 45 min ao lado de Vigília de 8 h: uma para quando ele
             está aqui, outra para a noite. Hoje as duas competem pelo mesmo
             espaço e a Vigília sempre ganha.
A TELA       o mapa passa a ter gente nele. É a regra do cenário vivo
             chegando pela mecânica, e não pela partícula.
```

#### O que ela NÃO pode virar, e a guarda

Slot vendido é §P5 caindo: quem compra slots compra tempo. Os slots entram por
**progressão** (nível do treinador / marcos do dossiê), nunca por loja — e o
`test/protecao.mjs` ganha a afirmação de que `simultaneas` não tem porta de
fora, do mesmo jeito que o teto já tem.

#### Ordem de aplicação

Depois do 1.6b e junto do 1.9. Precisa de: `E.simultaneas` subir por marco
(L-099 é vizinha: `nivel` não anda), o quadro "quem farma onde" (L-083), e a
recusa por reserva já escrita no 1.6b — que é a peça que faltava para a recusa
fazer sentido com várias expedições em campo.

### L-083 — O quadro de "onde está cada um"

> **CONSTRUÍDA em 02/09/2026, no bloco 1.9.** O chip de cada bioma ganhou a
> marca de quem farma nele, e o painel EM CAMPO passou a mostrar o retrato da
> criatura e a cor do bioma em cada linha. Antes dizia "1 criatura(s) em
> campo" — que bastava quando só havia uma expedição, e não distingue nada
> quando há quatro.

**Bloco dono:** 1.9. **Estado:** especificada.

Ao lado do banner, embaixo dele, ou dentro do próprio cartão da expedição — a
colocação é minha. O conteúdo é dele:

```
ícone do Pokémon | bioma + stage | tempo restante
```

Um por linha, quatro linhas. É o que o banner NÃO mostra: o banner conta só o
que está com o treinador, este conta todos.

---

### L-084 — Stages por bioma: como se abrem, e o que eles mostram antes

> **CONSTRUÍDA em 02/09/2026, nos blocos 1.10 e 1.7b.** A % de batalha contra
> treinador — a parte que faltava — chegou no 1.7b, junto do que a faz
> acontecer. O desbloqueio por nível existe, a
> prévia mostra quem mora em cada estágio antes de gastar as horas, e a parede
> foi contida por uma regra que tem teste: **nenhuma porta custa mais que o
> dobro de tudo que veio antes dela.**
>
> Duas partes do pedido NÃO entraram, e as duas por decisão escrita:
>
> - **a % de batalha contra NPC.** A batalha é o 1.7b e ainda não existe;
>   mostrar a porcentagem de uma coisa que não acontece é a moldura vazia que a
>   L-099 já cobrou caro deste projeto.
> - **o "nível recomendado" como número separado.** O nível que abre a porta JÁ
>   é a recomendação. Dois números para a mesma coisa é o jogo pedindo que o
>   jogador descubra qual dos dois vale.
>
> E uma correção de rota importante: a primeira versão só somava viés de
> raridade, e medindo antes de seguir eu vi que acima de ~1,4 **a ordem das
> faixas inverte** — "muito raro" ficava mais provável que "comum". Números
> corretos, significado quebrado. O estágio passou a trocar a LISTA: o fundo
> derruba os comuns, e o muito raro fica provável lá porque não há mais comum
> diluindo — e não porque alguém inverteu a tabela.

**Bloco dono:** 1.10. **Estado:** DESENHO MEU PENDENTE — o dono pediu
explicitamente que eu estude e decida: *"precisamos estudar como será esse
desbloqueio, acho interessante da maneira quais vós fala, veja melhor maneira de
aplicação dentro da nossa metodologia e siga"*.

O que ele fixou:

```
CLICAR NO BIOMA    abre a lista de stages daquele bioma
CLICAR NO STAGE    mostra, ANTES de gastar as horas:
                     · quais Pokémon aparecem (com GIF animado — L-080)
                     · probabilidades de drop de item
                     · % de chance de batalha contra NPC TRAINER
                     · nível recomendado
DESBLOQUEIO        por NÍVEL de Pokémon: o jogo vê que o jogador tem alguém no
                   nível exigido e libera a entrada
NPC vs SELVAGEM    a batalha de NPC rende essência e XP MELHORES (DEC-095)
```

**A parte que é minha, e o critério que vou usar:** o desbloqueio por nível tem
um modo de falha conhecido — ele vira parede. O jogador com um time de nível 12
diante de um stage que pede 15 não tem o que fazer *hoje*, e "volte amanhã" é a
pior resposta que um idle pode dar. O desenho tem de responder **o que fazer
agora**, e a resposta natural é que o stage anterior renda o suficiente para
chegar lá numa sessão. Isso é calibração, e calibração se mede.

---

### L-085 — O battle log do idle: provavelmente NÃO fazer

**Bloco dono:** 1.6b. **Estado:** RECOMENDAÇÃO MINHA — não construir.

O próprio dono levantou a dúvida e chegou à resposta: *"se tratando de iddle
pouco importa se enfrentou 20 ou 80 e sim oque farmou e isso já temos a bolsa de
drop correto?"*.

Concordo, e o argumento é mais forte do que ele colocou: um log de batalha existe
para o jogador **entender uma decisão que ele tomou**. Na arena ele tomou uma —
apostou. No idle ele escolheu o bioma e foi dormir; o que aconteceu no meio não
é decisão dele, é resultado. Um log ali é ruído com cara de informação.

**O que fica no lugar:** uma linha no resumo da expedição — *"7 treinadores
enfrentados"* — junto do que ela rendeu. Custa uma linha e responde a mesma
pergunta.

---

### L-086 — A mochila, a equipe e o status: o painel que a prévia mostrava

**Bloco dono:** 1.6b. **Estado:** especificada. **É a queixa central do dono
sobre a tela.**

> *"o layout do iddle está muito desorganizado, o player tem que scrolar pra
>  baixo pra ver a equipe onde vai mandar"*

Medido em 01/09, janela de 1194×1022: a equipe começa em **y = 1825**, oitocentos
pixels abaixo da dobra. Ele tem razão, e a causa é o palco (L-088).

O que precisa estar na tela:

```
EQUIPE       com GIF animado (L-080), não sprite fixo
XP e STATUS  de cada um — hoje não aparecem em lugar nenhum
MOCHILA      os itens que o jogador tem, visualizáveis
BOLSA/DOSSIÊ GIF animado do Pokémon ou imagem do item, ao lado da contagem
```

A prévia que eu mesmo trouxe já tinha esse painel, e ele foi perdido no caminho
— o dono lembrou disso, e ele está certo.

---

### L-087 — A moeda do idle ainda não tem nome nem cara

**Bloco dono:** 1.8. **Estado:** DECISÃO DO DONO PENDENTE, sem pressa declarada.

*"depois vamos elaborar uma cara pra essência e tem chance de mudar nome para
PokéCoin, vamos ver. Porque tem que ver também a de 'cash da loja'"*.

Três moedas em jogo e duas sem cara: **essência/PokéCoin** (farm), **PokéCash**
(aposta) e **cash da loja** (compra). O `DEC-097` já fixa a regra que importa —
*a moeda que pinga no idle é Essência, NUNCA PokéCash* —, então o nome pode
esperar. O que não pode esperar é as três serem visualmente distintas antes de a
loja existir.

---

### L-088 — A tela da rota é maior que a janela

**Bloco dono:** 1.5o. **Estado:** em construção, é o próximo.

Medido em 01/09, janela de 1194×1022:

```
palco    1145 × 897     mais ALTO que a janela inteira
piso     2,00           = max(1145/704, 897/448)
```

Duas consequências, e as duas são queixas dele:

1. **o zoom 1× e 2× não fazem nada.** `usar = max(zoom, piso)` — com piso 2,00 os
   dois viram 2,00 e renderizam idêntico, enquanto o rótulo continua dizendo
   "1×". Foi o piso anti-esticado do `1.5i` que comeu os dois níveis de baixo;
2. **tudo cai fora da dobra**, que é a L-086.

**A alça de arrastar EXISTE** (`resize: vertical` no palco, com o pontinho no
canto) e ele não a achou. Para um recurso que ele pediu, não ser achado é o
mesmo que não existir — o acabamento é parte da entrega.

---

### L-089 — O som da arena toca em abas onde a arena não está

**Bloco dono:** 1.5p. **Estado:** em construção.

> *"as vezes você ta na aba das rotas ou da liga e ouvindo o som da arena"*

Começa mutado. Quem quiser, liga.

---

### L-090 — A Torre: treze andares, e o que se perde ao sair

**Bloco dono:** 2.x. **Estado:** especificada pelo dono; **uma peça vai ao
§25.1**.

```
13 ANDARES     8 com líderes de ginásio de Kanto, ordem RNG para surpreender
POR ANDAR      dificuldade sobe, recompensa sobe
DURANTE        batalhas rendem só XP e essência
AO SAIR        o loot grande vem de CONCLUIR o andar e sair
BOSS + SAIR    recompensa melhor ainda
MORRER         jogado para fora, perde parte grande do farm
O FARM É POR   andar fechado é andar pago: subir para o segundo não arrisca o
ANDAR          que o primeiro já rendeu
CUSTO          não se paga para ENTRAR na torre; paga-se para SAIR
```

Isto exige composição, stats e moveset pensados — especialmente na Elite 4 —, e é
onde o dono quis o revés morar: *"aqui também existe frustração"*.

#### A peça que vai ao §25.1: o `ropebelt`

Comprado com cash da loja, sai do andar com o farm intacto e **sem pagar o custo
de saída**. O dono já antecipou a objeção e pôs "Vantagem" entre aspas.

**A objeção, escrita para não se perder:** o item não muda batalha nenhuma, mas
**aumenta o ganho líquido por corrida** numa moeda compartilhada. Vantagem
econômica comprada com dinheiro é o que o §P5 chama de p2w, mesmo quando não
mexe em stat.

**O que resolve, e não é recusar:** o §25.1 pede o número. Medir *quanto custa
sair* contra *quanto o item economiza*. Se a diferença for pequena o bastante
para não separar quem compra de quem não compra ao fim de vinte corridas, o
argumento do dono — *você não paga para entrar, paga para sair* — se sustenta
sozinho e o item entra. Se for grande, o mesmo item funciona vendido por
essência, e aí não há objeção nenhuma.

A decisão é do dono. O que não pode acontecer é ele entrar sem o número.

**Ele já apontou a mitigação, no mesmo dia:** *"ele pode ter limite diário de
compra e uso reduzido também não sei, vamos vendo"*. Teto diário é exatamente o
que separa "vantagem" de "vantagem sem fim" — com ele, o comprador ganha um piso
melhor, e não uma curva melhor.

**Mas aqui o teto TEM parâmetro, e o do idle não tem.** A distinção importa e é
fácil de perder: o teto diário do idle é ausência de porta (§P5) — não existe
número a mexer, porque qualquer número seria uma porta. O teto do `ropebelt` é
uma porta com número, e número em porta de dinheiro é justamente o que o §25.1
manda medir antes de abrir. Os dois se chamam "teto diário" e são coisas
diferentes; quem for calibrar precisa saber qual está mexendo.

---

### L-091 — o S642 escapa porque a sonda manda no bioma que ja esta na tela

> **FECHADA no 1.6b** (01/09/2026), e nao pelo caminho que esta ficha propunha.
> A ficha dizia "a sonda escolher um bioma diferente antes de mandar"; o que
> resolveu foi tirar a REGRA do DOM.  virou funcao pura em
> , e o S642 passou a reprovar em microssegundos — junto com o
> S643 e o S644, que escapavam pelo mesmo motivo.
>
> A licao vale mais que a correcao: **eu tentei consertar a sonda seis vezes
> antes de mover a regra.** Comportamento que so o navegador enxerga e
> comportamento sem guarda, e a saida nunca e uma sonda mais esperta.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.9. **Estado:** aberta.

O defeito  — a aba abrir no primeiro bioma da lista em vez de onde a
expedicao esta — continua PASSANDO pelo Q2, mesmo com a sonda de recarga que o
1.6c acrescentou.

A causa e a mesma familia do D-058 e do S614, pela quinta vez: **a sonda manda a
expedicao no bioma que ja esta selecionado**, que na caixa do portao e o
primeiro da lista. Nessa condicao o defeito nao pode aparecer — abrir "no
primeiro" e abrir "onde a expedicao esta" dao o mesmo resultado.

**O que a destrava:** a sonda escolher um bioma DIFERENTE do primeiro antes de
mandar. Nao fiz agora porque isso mexe na ordem de cliques de uma sonda que
acabou de custar quatro testes de arena quebrados por posicao errada, e o 1.9
vai reescrever essa tela inteira — a sonda vai junto.

O comportamento **esta correto e conferido a mao** (aba abre na Caverna de gelo
com a expedicao la); o que falta e a afirmacao que o guarda.

---

### L-092 — A ECONOMIA DE ITENS: de onde vem cada coisa

> **CONSTRUÍDA em 02/09/2026, no bloco 1.12.** O dono mandou os dois PDFs com
> a lista, e a análise está em `docs/ECONOMIA_DE_ITENS.md`. Quatro portas —
> drop, troca, baú e loja — mais uma quinta que existe e está VAZIA: nenhum
> item de poder se compra com dinheiro real, e há teste que reprova por um só.
>
> A regra que separa: **a loja de dinheiro vende o que se VÊ e o que se
> ESCOLHE; nunca o que decide uma batalha.** Ela é comercial antes de ser
> conformidade — numa loja que vende poder, quem não compra sai, e base que sai
> não compra a próxima skin.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.11 (proposto). **Estado:**
desenho meu, pendente de veredito do dono só onde marcado.

O dono mandou a folha de ícones e delegou a ordenação inteira: *"você também vai
precisar analisar e separar TODOS esses itens aplicando em como serão"*.

#### O PRINCÍPIO, e ele resolve quase todos os casos sozinho

> **O que o item FAZ decide de onde ele vem.**

Não é arrumação: é a regra que impede o modo de falha clássico do gênero. O idle
é o laço de BAIXO ESFORÇO — ele roda enquanto o jogador vê um filme. Se poder de
combate cair dali, o laço de ALTO esforço (arena, Torre) perde a razão de
existir, e o jogo inteiro colapsa para "deixe aberto".

O próprio dono já tinha sentido isso: *"você não pode dropar um held item por
exemplo com facilidade no iddle"*.

```text
CONVENIÊNCIA      bolas, cura, tesouro (pepita, pérola, pó)
  → dropa no idle, compra na loja de essência, cai em baú
  Repor o que se gasta não é poder. Faltar bola é atrito, não desafio.

PROGRESSÃO        pedras evolutivas, doce raro, vitaminas
  → SÓ o idle farm, e com raridade
  Decisão do dono, literal: "Evolution stones só pode ser dropada pelo iddle
  farm". É a recompensa de PERSISTIR, e persistir é o que o idle mede.

PODER DE COMBATE  held items — leftovers, life orb, focus sash, choice, eviolite
  → NUNCA cai solto no idle. Vem da Torre, ou de FRAGMENTOS (abaixo)
  É o que separa quem joga de quem deixa aberto. Solto no idle, apaga a Torre.

COSMÉTICO         outfit, banner, avatar, efeito de nome, moldura
  → loja, baú, missão. Já é a L-070/L-072, e nada muda.

TM / GOLPE        (quando existirem)
  → Torre e loja de essência. Golpe é poder, mas é poder ESCOLHIDO — e escolha
  merece porta própria, não sorteio.
```

#### O FRAGMENTO É A PONTE, e é a melhor parte da ideia dele

O dono propôs: *"sistema de 'novos fragmentos' [...] onde o jogador farma x
quantidade e consegue trocar por forma de RNG algum desses itens"*.

Isso resolve exatamente a tensão acima, e é por isso que vale construir: o idle
CONTRIBUI para poder, mas por um canal **limitado por esforço** em vez de por
sorte bruta. Quem farma muito chega lá; quem só deixa aberto, não chega tão
rápido; e ninguém abre o jogo e recebe um Life Orb de graça.

```text
O QUE FARMA     fragmento, no idle, em toda expedição
A TROCA         N fragmentos → UM item de poder, sorteado numa tabela
O QUE CALIBRA   N. O dono já deu a barra: "não pode ser nada muito baixo nem
                muito alto" — e isso é medição, não opinião. O número sai do
                estudo de economia, como a margem da casa saiu.
```

**O nome ainda não existe.** `Essência` já é a moeda do farm (DEC-097); o
fragmento precisa ser outra coisa, e o dossiê já usa "fragmento de dossiê".
Três nomes parecidos para três coisas diferentes é confusão garantida — ver a
L-087, que já registra que as moedas precisam ser visualmente distintas antes
de a loja existir.

---

### L-093 — A WIKI DE ITENS, e o que ela destrava

> **CONSTRUÍDA em 02/09/2026, no bloco 1.12**, no formato exato que o dono
> pediu — ícone, nome, utilidade — mais a coluna de ONDE SE CONSEGUE, que
> responde as outras duas perguntas da L-092. Busca por nome, nome em inglês e
> pelo TEXTO da utilidade: a pergunta real quase nunca é o nome, é *"o que me
> dá velocidade?"*.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.12 (proposto).

> "seria interessante no nosso próprio site conter uma espécie de aba como
>  'wiki' [...] com sistema de busca onde ele digita nome do item e vai para o
>  item especificando oque é, onde dropa, oque faz"

E o dono nomeou a consequência, que é maior que a aba: *"isso também DESBLOQUEIA
O SISTEMA DE STAGE COM IDENTIFICAÇÃO DE DROPS"*.

Ele está certo, e a razão é uma só: **a prévia do stage (L-084) promete mostrar
"possibilidades de drop", e uma tabela de drops sem lugar onde o jogador leia o
que aquilo FAZ é uma lista de nomes.** A wiki não é enfeite — é a outra metade
da tela que já foi prometida.

```text
CADA ITEM TEM    ícone · nome · o que faz · ONDE vem (a tabela da L-092)
A BUSCA          por nome, e por origem — "o que cai na floresta?" é a
                 pergunta que o jogador de idle faz de verdade
O PDF            baixável, como ele pediu; mas a fonte de verdade é a tabela
                 do jogo, e o PDF é gerado dela. Dois lugares divergem.
```

**Uma correção ao pedido, e ela é minha recomendação:** os PDFs que ele mandou
foram feitos por outra ferramenta e ele mesmo já achou erros (*"focus sash, life
orb, flame orb e etc"*). Servir aquele PDF seria publicar o erro. O que a wiki
serve é um PDF **gerado da nossa tabela** — assim ele nunca diverge do jogo, e
corrigir um item corrige o documento.

---

### L-094 — O MERCADO DE DINHEIRO REAL: a porta que muda a categoria do produto

**Registrada em:** 01/09/2026. **Bloco dono:** nenhum ainda. **Estado:**
**BLOQUEADA POR DECISÃO E POR CONSULTA.** Não construir.

O dono propôs, no fim da mesma mensagem:

> "esse item dropado se torna 'rmt' pro player depois de sei lá 48hrs ele pode
>  vender no Market de grana real"

**Preciso ser exato sobre o que isto muda**, porque não é uma questão de grau.

Tudo que o projeto fez até aqui usa moeda **simulada**. O §P5 proíbe pay-to-win,
o §28 protege o jogador, e o §0.5.1 já mantém uma consulta de enquadramento
regulatório ABERTA — ela bloqueia a tag da v0.9 até hoje.

O que ele descreve é outra coisa: **aquisição por RNG + revenda por dinheiro
real**. Essa combinação específica é a que legisladores tratam como caixa de
recompensa COM SAQUE, e é a forma mais estritamente regulada que existe — foi
exatamente ela que motivou as proibições na Bélgica e na Holanda, e é o centro
do debate legislativo em vários outros lugares, inclusive aqui.

Não é o sorteio que pesa. Não é o mercado que pesa. **É a soma dos dois**, e o
projeto hoje não tem nenhum dos dois.

#### A recomendação, e ela não é "não faça"

**Os dois lados se separam, e o lado bom não depende do outro.**

```text
CONSTRUIR AGORA   o laço de fragmento → RNG → item de poder (L-092)
                  Ele é bom desenho, resolve a tensão do held item, e não
                  toca em dinheiro real nenhum.

DEIXAR FECHADO    o saque. Ele não melhora o laço acima em nada — só muda a
                  categoria jurídica do produto inteiro.
```

Se o dono quiser o mercado, ele entra pelo §25.1 **e** pela consulta do §0.5.1,
que já está aberta e já bloqueia a tag. Não é burocracia inventada por mim: é o
checkpoint que este projeto já se deu, aplicado ao caso que mais precisa dele.

**A decisão é dele.** O que não pode acontecer é isso entrar junto de um bloco
de itens, como se fosse mais uma linha da tabela de drops.

---

### L-095 — AS TRÊS MOEDAS TÊM NOME, e a `Essência` mudou de papel

> **CONSTRUÍDA em 02/09/2026, no bloco 1.11.** O que segue é o registro da
> decisão; o que foi feito está no commit do 1.11. Uma correção de rota
> importante ficou pelo caminho e vale ler: o portão `conteudo` reprovou a
> primeira versão porque o motor escrevia o NOME da moeda numa constante. Foi a
> quarta vez que ele empurra nomenclatura para o ContentPack neste projeto, e
> as quatro vezes o resultado ficou melhor. **Um id é nome tanto quanto um
> rótulo** — quem lê a chave da bolsa num arquivo do motor já sabe de que
> franquia é o jogo.

**Registrada em:** 01/09/2026, decisão do dono. **Bloco dono:** 1.11.
**Estado:** DECIDIDA — fecha a pergunta que a L-087 e a L-092 deixaram abertas.

> "a nossa moeda dinheiro de PvE será o PokéCoin e estou te enviando a imagem
>  para você remover o fundo e adicionar também como ícone, para mochila e as
>  essências se tornam o 'novo fragmento'"

```text
PokéCash    a APOSTA. Moeda da arena, simulada. Não muda em nada.
PokéCoin    o DINHEIRO do PvE. Compra na loja de essência, e é o que o idle
            e a Torre pagam por trabalho feito.
Essência    o MATERIAL. Deixou de ser dinheiro e virou o "novo fragmento" da
            L-092: farma-se uma quantidade e troca-se, por RNG, por um item
            de poder.
```

#### A mudança que isto causa, e ela não é só de nome

O `DEC-097` dizia *"a moeda que pinga é Essência, NUNCA PokéCash"*. A regra
continua inteira — o que muda é que agora há **duas** coisas pingando, e elas
têm papéis diferentes:

```text
o idle produz    PokéCoin (dinheiro, gasta na loja)
                 Essência (material, troca por item de poder)
```

E isso é melhor do que uma moeda só, pelo motivo do princípio da L-092:
**dinheiro compra o que já tem preço; material compra o que não devia ter
preço.** Um held item comprável por dinheiro é a loja vendendo poder. O mesmo
item saindo de uma troca por material farmado é recompensa de persistência.

#### O que ainda falta, e é medição

Quanto de cada um pinga por hora, e quantas Essências valem uma troca. O dono já
deu a barra: *"não pode ser nada muito baixo nem muito alto"*. Isso é o estudo
de economia, não opinião — mesmo caminho da margem da casa.

#### A arte

`arte/moedas/pokecoin.png`, chaveada de `pokecoin-bruto.jpg` por
`tools/chavear-moeda.mjs`. Conferida sobre fundo escuro E claro: a segunda prova
é a que mostra a franja, que só aparece contra o oposto.

**O `pokécash.jpg` NÃO passa por essa ferramenta**, e a razão está escrita nela:
aquilo é uma folha de cédulas sobre papel claro, o canto cai no próprio papel, e
a chave come a arte. Rodei sem olhar e comi 76% dela — desfeito.

---

### L-096 — O TETO DE USO, e por que ele é melhor que o teto de compra

**Registrada em:** 01/09/2026, ideia do dono. **Bloco dono:** 1.11.

> "além do teto de compra diária tem limite de uso, exemplo o exp share só pode
>  ser usado em 1 run, seja de 45min, 3hrs ou 8hrs [...] quer usar mais? Compre
>  mais, esse é um item perfeito por exemplo a loja monetizada"

A ideia é boa e vale escrever **por que** ela é boa, porque a razão não é óbvia e
ela decide o desenho de vários itens de uma vez.

```text
TETO DE COMPRA   limita quanto se ACUMULA. Quem compra todo dia acumula assim
                 mesmo, e em duas semanas tem estoque para nunca mais pensar.
TETO DE USO      limita quanto se APROVEITA. O estoque deixa de ser vantagem
                 permanente e vira quantas vezes ele pode agir.
```

O segundo é o que impede o item de virar p2w de verdade: com teto de compra, o
jogador que gasta acaba com uma prateleira cheia e uma vantagem contínua. Com
teto de uso, **ele compra exatamente o número de vezes que vai usar**, e a
diferença entre quem paga e quem não paga é ritmo, não patamar.

#### E o `Exp. Share` é o exemplo perfeito, por acidente feliz

O dono escolheu bem: o item já é, na origem, sobre **repartir** — *"você equipa
em um Pokémon pra ir pra expedição e linka com outro que não precisa estar
farmando"*. Uma expedição, um uso; a duração não muda o custo, então usá-lo numa
Vigília de oito horas é a jogada certa e o jogador sente que escolheu bem.

Isso dá a forma geral: **item consumível por RUN, e não por tempo.** Cobrar por
hora premiaria só quem tem mais horas; cobrar por run premia quem escolhe onde
gastar.

#### O que ainda é meu, e é análise item a item

Cada item da folha precisa de uma leitura: o que ele faz, e daí sai se ele é
permanente (pedra evolutiva), consumível por run (Exp. Share, Lucky Egg,
Macho Brace), consumível por batalha (Focus Sash, as X-items), ou passivo
enquanto equipado (Leftovers, Choice). **A categoria de uso decide a porta de
aquisição** — é a L-092 aplicada uma camada abaixo.

---

### L-097 — O REBALANCEAMENTO DA ESCALA: por que 100 parece mais que 10

> **CONSTRUÍDA em 02/09/2026, no bloco 1.11**, com uma correção de números que
> só apareceu porque eu calculei antes de escrever: os primeiros valores
> deixavam a **Trilha dominada** — pior que a Vigília por hora E pior por
> encontro. Um perfil dominado não é uma opção, é uma armadilha, e o jogo cobra
> a descoberta em horas de expedição. Os números finais fazem as duas leituras
> andarem em direções opostas, e a suíte afirma isso nos dois eixos.

**Registrada em:** 01/09/2026. **Bloco dono:** 1.11. **Estado:** desenho meu,
com um alerta que precisa ser lido antes de aplicar.

> "acho que você tem que ver melhor a questão do drop e deixar equilibrado, falo
>  no sentido do player talvez ver uma maior quantidade, ele ver dropando 100,
>  maior que 10 já cria uma sensação de +farm, nós aplicamos esse conceito
>  anteriormente na arena"

Ele está certo, e o efeito é real: **a grandeza do número carrega recompensa
percebida independente do poder de compra dele.** Multiplicar drops e preços
pelo mesmo fator não muda nada mecanicamente e muda tudo na sensação. A arena já
usa isso — as apostas são 50, 100, 300, 500, 1.000, e nenhuma delas precisava
ser assim.

#### O alerta, e ele é o que decide QUANDO aplicar

**A escala se escolhe UMA VEZ.** Reescalar uma economia viva quebra dois
contratos ao mesmo tempo:

```text
o SALDO SALVO   quem tinha 40 passa a ter 400, ou continua com 40 num mundo
                onde tudo custa dez vezes mais. Migração de dado, e é a
                primeira coisa da lista de "caro de desfazer" do CLAUDE.md.
o PREÇO NA      o jogador decora quanto custa uma Ultra Ball. Mudar isso uma
CABEÇA          vez é confusão; duas vezes é desconfiança.
```

Por isso: **aplicar ANTES de a loja existir e antes de haver saldo salvo de
verdade.** Hoje ainda dá; depois do 1.11 fica caro. É a razão de este registro
existir agora e não depois.

#### O fator, e por que 10 e não 100

Dez põe os drops na faixa de dezenas e centenas — que é onde o número parece
recompensa e ainda cabe na tela sem virar ruído. Cem levaria a bolsa a milhares
por expedição, e a partir de certo tamanho o número deixa de ser lido e vira
paisagem: ninguém sente diferença entre 12.400 e 13.900.

#### O que NÃO pode escalar junto

O dono já nomeou: *"sem perder a questão do equilíbrio do farm de xp onde já
existe o drop rate"*. XP e taxa de encontro **não** multiplicam. Se multiplicassem
juntos, o rebalanceamento não seria percepção — seria inflação de verdade, e a
progressão inteira andaria. O que muda é a MOEDA, e só ela.

E isso tem teste: a suíte de economia já mede a margem; ela passa a medir também
que a razão entre XP por hora e PokéCoin por hora ficou onde estava.

#### A TABELA CONCRETA, e a decisão que ela embute

Escrita em 01/09/2026 para que o 1.11 seja construção e não discussão. Segue a
regra da divisão de trabalho: recomendação minha, escrita antes de eu construir.

**O PokéCoin sai da tabela de sorteio e vira pagamento POR ENCONTRO.**

Essa é a decisão, e ela não é cosmética. Hoje a Essência é uma das seis classes
da tabela: 30% de peso, 1 a 3 por vez. Isso significa que **duas expedições
iguais pagam valores diferentes de dinheiro**, e que existe expedição que volta
sem nenhum. Para um objeto isso é bom — é a loteria, é o que dá graça. Para o
dinheiro é ruim, e por um motivo prático:

> **O dinheiro é o que o jogador usa para PLANEJAR. Loteria não se planeja.**

Quem sabe que a Vigília rende ~1.200 decide comprar; quem não sabe, guarda. Um
idle em que o jogador guarda por precaução é um idle onde a loja não é usada.

```text
            por ENCONTRO   PC/hora   expedição cheia      no dia (teto de 30)
  Batida    25– 45 PC        187      75– 225 PC
  Trilha    50– 92 PC        166     300– 736 PC          ~1.500 a 2.900 PC
  Vigília   65–130 PC        146     650–1.820 PC
```

**As duas leituras andam em direções opostas, e é isso que faz a troca existir.**
Por ENCONTRO o valor sobe com a duração; por HORA ele desce.

A primeira versão destes números falhava aqui, e eu só vi porque calculei antes
de construir: a Trilha rendia 140 PC/h contra 158 da Vigília — pior nas duas
pontas. **Um perfil dominado não é uma opção, é uma armadilha**, e o jogo cobra
a descoberta em horas de expedição. A suíte afirma a monotonia nos dois eixos.

O encontro raro paga mais que o comum — a Vigília rende mais por encontro E tem
encontros melhores, que é o que faz oito horas valerem a pena sem que ela
precise render mais VEZES. E a Batida continua sendo o melhor ritmo por hora,
que é o que faz valer a pena jogar acordado.

**A tabela de sorteio fica só com objeto**, e a Essência continua nela — porque
Essência deixou de ser dinheiro (L-095) e virou material:

```text
  bolaBarata  34      o consumível de todo dia
  bolaMedia   12
  bolaBoa      3
  essencia    30      1 a 3 — MATERIAL, e é ele que compra o que não tem preço
  pedra        9
  elo          1
```

#### Por que isto atende o pedido do dono melhor que multiplicar por dez

Ele pediu *"ele ver dropando 100"*. Com o PokéCoin por encontro, **todo encontro
pinga um número de dois ou três dígitos** — não às vezes, sempre. Multiplicar a
Essência por dez daria números grandes em 30% das vezes e zero nas outras 70%, e
a sensação de farm mora na FREQUÊNCIA tanto quanto no tamanho.

E o material continua raro e pequeno, que é o que ele precisa ser: o número de
Essências tem de doer para juntar, senão a troca por item de poder (L-092) vira
compra e o §P5 cai.

#### O que isto exige antes de aplicar

```text
1  bolsa com DUAS moedas separadas — hoje `essencia` é chave de bolsa
2  o ícone do PokéCoin na mochila (arte já pronta: arte/moedas/pokecoin.png)
3  a suíte de economia afirmando que XP/hora NÃO andou
4  a colheita mostrando o PokéCoin somado, e não item a item
```

Nenhum deles depende de decisão do dono; todos são do bloco 1.11.


---

### L-098 — A ARTE DO POKÉCASH — RESOLVIDA no mesmo dia

> **FECHADA.** O dono esclareceu: *"esqueça o arquivo pokécash, nossos arquivos
> serão os outros"* — as cinco notas 50/100/300/500/1k, que não têm marca
> d'água nenhuma. A pergunta abaixo não precisou ser feita, e fica registrada
> porque ela volta no dia em que chegar arte com marca.

### L-098(a) — a pergunta, para quando ela voltar

**Registrada em:** 01/09/2026, lembrete do dono. **Bloco dono:** nenhum ainda.

> "lembre-se que lá atrás fiquei de enviar as artes novas para alteração e você
>  ia fazer a camuflagem da marca d'água, não lembro o porquê não foi feito"

Fica registrado para não se perder de novo. **Mas antes de aplicar eu preciso
saber de quem é a marca**, porque as três respostas levam a caminhos diferentes:

```text
MARCA DELE          arte própria com assinatura que ele quer tirar
                    → tiro, é dele e ele manda

PRÉVIA DE COMPRA    arte de banco de imagens ainda não licenciada, com a marca
                    que o banco põe justamente para impedir o uso
                    → não tiro. O caminho é comprar a versão limpa, que é
                    barato e resolve de vez

ARTE DE TERCEIRO    assinatura de quem desenhou
                    → não tiro. Retirar assinatura de obra alheia é o oposto
                    do que o §0.3.1 protege, e este projeto já leva a sério a
                    diferença entre arte nossa e emprestada — é o motivo de
                    `arte/` e `assets/` serem pastas separadas
```

Não é hesitação: é que "camuflar marca d'água" descreve as três, e só uma delas
eu posso fazer. Quando ele mandar as artes, uma frase resolve.

---

### L-099 — `nivel`, `vinculo` e `foco` existem e ninguém os move

> **FECHADA em 02/09/2026, no bloco 1.14 — dois dos três.**
>
> `nivel` e `vinculo` andam: a colheita credita XP determinístico (o XP não é
> sorteado — experiência não é loteria) e vínculo por TEMPO junto. O nível é
> DERIVADO do XP, e não guardado ao lado dele — mesma razão do `potencial` no
> 1.1. A barra de XP entrou no cartão da equipe, que era o pedido original do
> dono no 1.6b e que eu recusei por escrito enquanto o número não andava.
>
> **`foco` continua parado, e de propósito.** O comentário do `instancia.mjs`
> já dizia o que ele é: *"escolhidos DEPOIS, pelo jogador e pelo tempo"*. Nível
> e vínculo vêm do tempo — e chegaram. O foco vem da ESCOLHA, e escolha precisa
> de uma tela que a ofereça. Fazê-lo andar sozinho aqui seria inventar uma
> decisão do jogador em nome dele.
>
> Fica em **L-102**, com bloco dono próprio.

**Registrada em:** 01/09/2026, achado ao montar o painel do 1.6b.
**Bloco dono:** 1.14 (proposto: a progressão da criatura). **Estado:** aberta.

`criar()` grava `nivel: 1`, `vinculo: 0`, `foco: null` em toda criatura, e nenhum
caminho do jogo escreve nesses três depois. É a mesma situação da `L-065`, que
já registrava o `foco` — agora são três, e o `nivel` é o que dói.

#### Por que isto MUDOU o escopo do 1.6b

O dono pediu *"barra de experiência e status do seu Pokémon da equipe"*. A barra
é fácil de desenhar; o problema é o que ela mostraria.

> **Um número que nunca anda ensina o jogador que o número é falso.**

E isso é pior que a ausência: a ausência ele lê como "ainda não tem"; o número
parado ele lê como "tem, e eu não entendi como funciona" — e a partir daí
desconfia dos outros números também. Numa tela cujo trabalho inteiro é dizer o
que está acontecendo, isso é caro.

#### O que o painel mostra em vez disso, e é decisão minha

O que EXISTE e MEXE, ou existe e identifica:

```text
stamina      mexe, e decide se a criatura pode ir a campo
potencial    fixo, mas é a identidade dela — é o que separa duas iguais
forma        ofensiva · defesa · velocidade, as três leituras do potencial
natureza     fixa, e explica parte da forma
exemplar     o ✦, que é raro e o jogador quer ver
```

A barra de XP entra no 1.14, junto do que a faz andar. Desenhá-la antes seria
entregar a moldura de uma coisa que não existe.

---

### L-100 — a esteira de OLHAR não sabia abrir a aba do idle

**Registrada em:** 02/09/2026, ao fechar o 1.6b. **Bloco dono:** 1.6b.
**Estado:** RESOLVIDA no mesmo bloco — `tools/olhar-idle.mjs`.

`olhar-telas.mjs` fotografa a Arena: início, aposta, contagem, luta, resultado,
proteção, adm — sete telas, quatro larguras. Ele nunca fotografou a aba da rota.

Isso passou despercebido pelos **seis blocos em que o idle foi construído
inteiro**, e só apareceu quando o 1.6b tentou cumprir o passo 6 do ciclo. O
bloco mexeu no cartão da equipe, na mochila, no contador do teto e nas três
leituras de forma, e a esteira não sabia mostrar nenhuma das quatro.

> **Não dá para cumprir a segunda metade do Q5 numa tela que a esteira não sabe
> abrir.** E enquanto ela não soube, a única inspeção visual que o idle recebeu
> foram os prints que o próprio dono mandava — que é o oposto da ordem certa.

#### Por que uma ferramenta separada, e não uma tela a mais na existente

O idle exige ESTADO: um treinador, uma criatura inicial, uma equipe, uma
expedição em campo, saque na mochila. Produzir esse estado é metade do trabalho,
e a Arena não precisa de nada disso. Juntar os dois pioraria os dois.

O estado vai ao `localStorage` pelas MESMAS funções que o jogo usa (`salvar`,
`saveProfile`) — nunca por um JSON escrito à mão, que envelheceria no primeiro
bloco a mudar o formato e passaria a mentir em silêncio.

#### As duas armadilhas, porque elas vão voltar

As duas produziram **quatro fotos da tela errada com relatório verde**:

```text
1  plantar o estado do idle sem plantar o TREINADOR
   sem perfil, a aba abre como visitante e não pinta nada

2  clicar em [data-view="viewRotas"]
   a aba se chama ROTAS na barra e `viewIdle` no código — nome de produto e
   nome de implementação divergiram. `pg.$` devolve null EM SILÊNCIO, e o
   ramo de reserva mexeu na classe de uma vista inexistente
```

Nos dois casos o relatório disse "sem erro", e estava certo: não havia erro
nenhum. Havia só um jogo esperando alguém entrar, e uma ferramenta fotografando
a tela de início quatro vezes.

> **Ferramenta de OLHAR que erra a tela é pior que nenhuma: ela produz evidência
> falsa**, e evidência falsa é aceita sem ser conferida — que é o motivo de ela
> existir.

Por isso os dois passos ABORTAM em vez de continuar, e há uma conferência de
conteúdo antes de cada foto: a vista tem de estar visível, sem `primeiraVez`, e
com bioma na tela. Página sem erro e página com o que fotografar são perguntas
diferentes, e só a segunda interessa aqui.

#### O que ela achou na primeira foto de verdade

```text
0/30 encontros hoje +8 reservados22 livres
```

As classes `tetoRes` e `tetoLivre` tinham sido criadas e o CSS delas, não. Os
três números colaram. O texto estava certo e ilegível — corrigido no mesmo
bloco, com cor e peso próprios para cada parcela.

---

### L-101 — no panorâmico o mundo fica largo e VAZIO

**Registrada em:** 02/09/2026, olhando a captura de 1920 px que a L-100
destravou. **Bloco dono:** 1.15 (proposto: a composição do bioma).
**Estado:** CONSTRUÍDA em 02/09/2026.

A trilha CURVA — duas ondas fora de fase, uma curva a cada ~18 colunas, e o
número de curvas cresce com a largura — e o chão ganhou CLAREIRAS e MATAS:
regiões que REDISTRIBUEM o mesmo detalhe em vez de acrescentar ruído, que era
exatamente o que esta lacuna avisou para não fazer. Ver `composicao.mjs` e a
suíte `test/composicao.mjs`.

Dois erros meus no caminho, e os dois ensinam mais que a lacuna:

  a ESCADA     a primeira curva saiu em degraus de 16 px em ângulo reto.
               Passava em TODOS os testes e era feia — eu pintei por tile o que
               já tinha calculado como curva contínua. Corrigido pintando a
               curva, com a beira esfarelada em ±2 px.
  o SUMIÇO     o oásis perdeu 38% do detalhe do chão em silêncio. `aceita`
               bebia do MESMO gerador congruencial que sorteia a linha, e
               valores consecutivos de um LCG andam numa rede: a decisão de
               aceitar saía amarrada à linha, que é justo o que decide o peso.
               Três biomas, três respostas para uma fórmula só (62%, 85%, 95%).
               Só apareceu porque havia teste comparando o entregue com o
               PEDIDO, e não com a constante que produziu o pedido.

A 1920 px o mundo ocupa ~1830 px de largura e mostra um campo aberto com poucas
coisas nele. A densidade de partículas e decoração JÁ escala com a área — isso
foi corrigido quando o dono reclamou de "mais neve, mais brasas". O que não
escala é a **composição**.

```text
DENSIDADE    quantos vaga-lumes, quantas folhas          — escala com √área
COMPOSIÇÃO   onde ficam o lago, a estrada, o bosque      — não escala com nada
```

Num mundo estreito, uma estrada no meio e um lago num canto preenchem a tela.
No panorâmico, a mesma estrada corta um vazio três vezes maior e o lago vira um
detalhe distante. Não há nada errado; há pouco acontecendo.

> É a regra do `CLAUDE.md`: **o cenário do idle nunca está pronto.** Esta é a
> tela que fica aberta por horas ao lado de um filme, e "não há nada errado"
> nunca foi o critério dela.

#### O que investigar quando o bloco chegar

Não é "mais coisas" — densidade já resolve isso e a resposta seria ruído. É
**mais LUGARES**: uma clareira, uma curva de estrada, um trecho de mata fechada.
Em mundo largo, a paisagem precisa de regiões; em mundo estreito, uma região
basta. A geração de relevo já sabe fazer regiões (`relevo.mjs` faz fenda, veio e
cascata) — falta ela ser convocada em função da largura, e não só do bioma.

---

### L-102 — o `foco` é uma escolha, e ainda não há onde fazê-la

**Registrada em:** 02/09/2026, ao fechar a L-099 no bloco 1.14.
**Bloco dono:** 1.16 (proposto: a especialização da criatura). **Estado:** aberta.

`criar()` grava `foco: null` desde o bloco 1.1, e o 1.14 fez `nivel` e `vinculo`
andarem sem tocar nele. Isso foi decisão, e ela está no comentário original do
`engine/instancia.mjs`:

> "Escolhidos DEPOIS, pelo jogador e pelo tempo — não sorteados."

Nível e vínculo vêm do TEMPO, e chegaram com a expedição. O foco vem da
**escolha**, e escolha precisa de uma tela que a ofereça.

#### Por que não foi feito junto

Fazer o foco andar sozinho seria inventar uma decisão do jogador em nome dele —
e o foco é justamente a decisão que diferencia duas criaturas idênticas depois
que o potencial já as separou. Um foco atribuído automaticamente não é
especialização: é um segundo atributo aleatório.

#### O que o bloco dono precisa responder, e são três coisas

```text
QUANDO      em que momento o jogo pergunta. Cedo demais e o jogador escolhe
            sem saber o que está escolhendo; tarde demais e ele já decidiu
            sozinho qual criatura importa.
O QUE       quantos focos existem, e o que cada um muda. Se a diferença for
            numérica, é um bônus com nome bonito; ela precisa mudar COMO a
            criatura é usada.
DESFAZER    troca de foco custa o quê? Grátis, o foco não é escolha. Caro
            demais, o jogador não experimenta — e um sistema que ninguém
            experimenta não ensina nada.
```

A terceira é a que precisa do §25.1 se a resposta envolver a loja.

#### E há uma frase que já vale como guarda

A mesma da L-099, que fechou hoje:

> **Um número que nunca anda ensina o jogador que o número é falso.**

Enquanto o foco não tiver onde ser escolhido, ele **não aparece na tela** — pelo
mesmo motivo que a barra de XP não apareceu antes do 1.14. Moldura vazia é pior
que ausência.

---

### L-103 — nenhuma guarda barata confere que um `import` acha o que importa

**Registrada em:** 02/09/2026, no bloco 1.10, depois de uma extração de módulo
apagar `export function renderIdle` por acidente.
**Bloco dono:** T8. **Estado:** CONSTRUÍDA em 02/09/2026, dentro do bloco 1.15.

`test/ligacao.mjs` varre `app/modules`, `engine`, `server` e o `index.html`,
extrai os imports relativos e os exports de cada arquivo, e reprova quando um
nome importado não existe na fonte. Três testes: a varredura, uma auto-conferência
num caso sintético (para a afirmação não passar vazia) e a existência dos caminhos.

Provada nos três casos reais antes de valer: `renderIdle` sumindo, arquivo
inexistente, nome inexistente. Milissegundos, contra os ~200 s do portão visual.

E ela pagou no mesmo dia: pegou a extração do `relevo-pincel.mjs` horas depois
de nascer, quando meu recorte deixou o `export` antes do comentário em vez da
função.

O `index.html` faz `import { renderIdle } from './modules/idle-tela.mjs'`. A
função sumiu numa extração, e:

```text
node test/run.mjs --so=modulos,idle-tela,estagios    VERDE 48/48
o app no navegador                                    não boota
```

A aba inteira ficou travada atrás do `#boot`, com o erro certo no console — e
nenhuma suíte de Node disse nada. Quem pega isso hoje é o portão Q5, que precisa
de Chromium e leva 200 s.

#### Por que a suíte não vê

`test/modulos.mjs` confere SINTAXE varrendo os arquivos como texto — foi o que
o D-017 construiu, e ele pega arquivo que não analisa. Não pega **ligação**:
`import { X }` de um módulo que não exporta `X` é sintaxe válida nos dois lados.

É a mesma família do Q5 que o `CLAUDE.md` já descreve — *teste estático não vê
símbolo não importado nem atribuição a binding importado* — e a resposta que o
projeto deu na época foi "abra um navegador". Ela funciona e é cara.

#### O que a guarda barata seria

Uma varredura de texto, sem executar nada e sem navegador:

```text
1  achar todo `import { a, b } from './x.mjs'` nos arquivos do app
2  achar todo `export` do arquivo apontado (nomeado, `export {}`, e default)
3  cada nome importado tem de aparecer na lista do arquivo de origem
```

Custaria milissegundos e teria pegado isto na hora, no laço de construção, em
vez de na execução completa vinte minutos depois. **Portão que só existe caro é
portão que se roda pouco.**

#### O que ela NÃO pega, e por isso não substitui o Q5

Reexportação em cadeia, `export * from`, e nome montado em tempo de execução. A
guarda barata é uma peneira grossa que devolve a maioria dos casos em
milissegundos; o Q5 continua sendo quem julga.

---

### L-104 — sete itens ainda sem ícone confirmado

**Bloco dono:** 1.12b. **Estado:** CONSTRUÍDA em 02/09/2026.

O dono mandou as sete artes. Elas entraram nas casas **371 a 377** da folha,
pela mesma porta das nossas três (Elo, Essência, PokéCoin): linha extra no fim,
recorte por caixa alfa e a MESMA ocupação de quadro do resto — que é o que
corrigiu o "ultrabll qualidade saiu péssima".

**Elas destoam do estilo da folha do BDSP, e isso foi decisão dele:**

  > "não se prenda a isso, não precisa necessariamente seguir um padrão se
  >  essas imagens você conseguir aplicar com boa qualidade pode usar"

Ele está certo, e o motivo é o tamanho: **num ícone de 32 px, legibilidade
ganha de coerência de estilo.** Uma maçã mordida de contorno grosso se lê de
relance; a mesma maçã em sombreado suave vira uma mancha vermelha. Olhado
ampliado 4× depois de aplicado.

E a régua do teste mudou junto: era `SEM_ICONE.length <= 8` — um teto, para a
lista não crescer enquanto faltava arte. Virou `=== 0`. Teto que já não morde é
folga, e folga na régua é defeito passando: um item novo entraria sem arte e o
número ficaria em 1, dentro do teto, sem ninguém ver.

O caminho para acrescentar arte nova está no comentário de `SETE_DA_L104`, em
`tools/normalizar-itens.mjs` — e **a ordem daquela lista é a ordem do índice**,
então trocar duas linhas de lugar troca dois ícones no jogo, em silêncio.

#### O que foi possível, e como

`tools/casar-itens.mjs` compara cada referência do PDF com cada célula da folha,
os dois renormalizados no mesmo quadro. Onde a margem foi folgada e o par
conferido a olho, o índice é `medido`. Onde a forma é inconfundível — o leque do
Sol, a folha nervurada, o novelo do Nó do Destino — é `olhado`. Onde os vizinhos
medidos fixam a ordem do bloco, é `ordem`.

Onde nada disso fechou, é `falta` — e são estes sete.

> **Identificação por posição é um palpite com aparência de método.** Eu já
> errei duas vezes assim, e numa delas declarei a Poké Ball errada porque o
> render dela sai alaranjado. Marcar é mais barato que consertar depois.

#### O que resolve, e é barato

Uma tela de conferência: nome, função e a folha inteira em 32 px, e o dono
clica. Ele conhece estes itens melhor que qualquer casador de imagem, e são sete
cliques — contra uma tarde minha de arqueologia visual com risco de errar em
silêncio.

Enquanto isso os sete aparecem na wiki com `?` no lugar do ícone, que é honesto:
**um ícone errado é pior que nenhum — ele parece certo, e ninguém confere o que
parece certo.**

---

### L-105 — a escada de estágios acaba no dia 13, e o nível vai até o 168

**Registrada em:** 02/09/2026, respondendo a uma pergunta do dono.
**Bloco dono:** 1.18. **Estado:** aberta, e o desenho já foi aprovado por ele.

Ele perguntou, e a pergunta continha a resposta:

> "o stage 4 será o último, se o level for maior 100 [...] então acredito seja
>  necessário implementação de novos stages, correto?"

Correto, e medido é pior do que ele imaginou. Ele falou em "88 níveis sobrando";
são **69 níveis e 155 dias**:

```text
nível  destrava            dias no teto de 30 encontros/dia
    1  estágio 1                 —
   12  estágio 2                 2
   19  estágio 3                 5
   31  estágio 4 — o ÚLTIMO     13
  100  NADA                    168
```

Depois do dia 13, subir de nível só serve para vencer treinador NPC. Isso não é
progressão — é um número andando, e **um número que nunca abre nada ensina o
jogador que o número é falso.** É a mesma lição do 1.14, chegando por outra
porta: lá o número não andava; aqui ele anda e não leva a lugar nenhum.

#### O desenho aprovado: oito estágios, e o quinto casa com a evolução

```text
e1  nv  1      e5  nv 36   ← onde o GBA entrega o Charizard
e2  nv 12      e6  nv 50
e3  nv 19      e7  nv 68
e4  nv 31      e8  nv 85
```

O **estágio 5 no nível 36 não é coincidência.** É onde a primeira evolução final
acontece, e pôr a porta nova no MESMO dia faz o jogador viver duas recompensas
juntas, em vez de nenhuma. Uma porta a cada ~3 semanas, no lugar de nada por
cinco meses.

#### O saque escala, e os ENCONTROS NÃO — e isso é a decisão

O saque de hoje é `[1 · 1,35 · 1,8 · 2,4]`. Estende mantendo a curva:

```text
e5 3,2   ·   e6 4,3   ·   e7 5,8   ·   e8 7,8
```

O dono levantou a pergunta certa, e ela merece a resposta inteira:

> "level maior, farm maior, recompensa maior, justo não? Foi gasto mais tempo,
>  investimento, às vezes cara comprou algo"

Justo, e é por isso que o **saque** e a **raridade** escalam. O que NÃO escala é
o teto de 30 encontros por dia:

> **Um jogador antigo ganha coisa MELHOR, nunca coisa MAIS RÁPIDA.**

Se o teto diário subisse junto, quem joga há cinco meses farmaria 8× mais POR
DIA que um novato — e aí ninguém novo alcança ninguém, o mercado entre jogadores
trava (não há o que o veterano queira comprar) e a base para de crescer. É a
mesma regra que já governa a loja de dinheiro real, no `ECONOMIA_DE_ITENS.md`:
vende-se o que se VÊ, nunca o que ANDA MAIS RÁPIDO. Aqui ela reaparece sem
dinheiro nenhum envolvido, o que é sinal de que a regra é de desenho e não de
conformidade.

---

### L-106 — a evolução não existe, e as dez pedras não são consumidas por nada

**Registrada em:** 02/09/2026, ao medir a L-105.
**Bloco dono:** 1.17. **Estado:** aberta, e o desenho já foi aprovado.

Procurado no código: **não há linha evolutiva em lugar nenhum.** A espécie do
pack tem `dex, n, t, s` e mais nada. As dez pedras entraram no catálogo no 1.12,
uma por bioma, com drop medido — e **nenhuma é consumida por coisa alguma**.

```text
Vulcão, estágio 4  →  Pedra do Fogo, 100% do pool
                      e ela não faz nada com ninguém
```

Isso torna sem efeito o melhor resultado do 1.12, que foi a evolução ganhar
endereço no mapa E profundidade. O endereço existe; o destino, não.

#### E é o que trava a L-105

Sem evolução, o estágio 8 só pode oferecer **os mesmos bichos com raridade mais
alta**. É exatamente o degrau que a L-101 ensinou a não dar: *mais do mesmo não
é mais fundo*. O dono pediu "mesclar com Pokémon mais forte" — e os mais fortes
de Kanto SÃO as evoluções finais. Elas precisam existir antes.

#### O desenho, decidido pelo dono

> "as duas, por espécie, segue"

**Nível E pedra, escolhido por espécie.** Charmander evolui por nível 36; Vulpix
pede a Pedra do Fogo. É o que o material já traz, e é o que dá razão às dez
pedras estarem espalhadas uma por bioma — a pedra vira o motivo de escolher
aquela rota, que era a promessa do 1.10 e do 1.12 juntas.

---

### L-107 — o Vulcão está magro e SEM O MEIO DA TABELA

**Registrada em:** 02/09/2026, medindo a distribuição a pedido do dono.
**Bloco dono:** 1.18. **Estado:** aberta.

Ele pediu a conferência:

> "hoje todos pokémon de nossa lista estão distribuídos corretamente em seus
>  biomas e stage correto? É preciso essa análise minuciosa também"

Está — as 146 espécies estão todas usadas, em 314 vagas. Mas o reparto é
desigual, e um bioma tem um buraco de verdade:

```text
bioma          espécies   e1   e2   e3   e4
vulcao               14    7    7   10    6     <-- e ZERO de raridade `raro`
deserto              17    9   13   13    8
ferrovelho           22   11   18   13   11
...
ruina                46   24   31   30   22
oasis                40   21   29   24   19
```

O estágio 3 pede `incomum · raro · muitoRaro`. No Vulcão o `raro` não existe,
então ir fundo ali **pula um degrau de raridade** — o jogador passa de incomum
direto para muitoRaro sem que nada na tela explique. Não quebra; mente.

#### Cuidado que o bloco dono precisa ter

Não é "acrescentar bioma". Com 314 vagas e 146 espécies, um bioma novo teria de
reciclar quem já mora em outro — e aí ele não é um lugar, é um filtro com nome
diferente. O que falta é ENCHER estes três, dentro dos tipos que cada um já
declara, e o material para isso são as evoluções da L-106.

---

### L-108 — a tipagem e os stats não influenciam o idle, e deveriam

**Registrada em:** 02/09/2026. **Bloco dono:** 1.19. **Estado:** aberta.

O dono perguntou e eu fui medir em `engine/expedicao.mjs` em vez de responder de
memória. A criatura entra na expedição assim, e só assim:

```js
equipe: equipe.map(c => c.id)      // só o ID
custo:  custoDe(perfil, tamanho)   // só o TAMANHO da equipe
```

```text
tipagem            NAO influencia nada
ATQ / DEF / VEL    NAO influenciam nada
potencial / IV     NAO influenciam nada
nível              só em DOIS lugares — destrava estágio, e a batalha de NPC
```

Um Charmander no bioma de água farma **exatamente igual** a um Squirtle.

#### A recomendação, e ela tem três partes separadas

**TIPAGEM: bônus por afinidade, NUNCA penalidade.** Charmander na água não deve
farmar menos; Squirtle na água deve farmar mais. A conta é quase a mesma e o
efeito no jogador é oposto: com penalidade, é preciso manter onze equipes, uma
por bioma, ou sentir que se está jogando errado — isso não é profundidade, é
dever de casa. E ninguém é punido por levar o bicho de que gosta.

**STATS: só a VELOCIDADE entra, e de leve.** VEL lê-se naturalmente como "cobre
mais terreno". ATQ e DEF ficam para a Torre e a arena — e a razão é o mercado
que o dono quer: se todos os stats valessem em todo lugar, existiria UM Pokémon
melhor e o mercado desabaria numa curva de preço só. Separando qual stat vale
onde, um bicho de VEL alta é caro para quem farma e um de ATQ alta é caro para
quem sobe a Torre. Dois produtos, dois preços, duas razões para o mercado
existir.

**POTENCIAL: continua fora.** Ele é SORTE. Se mandasse no farm também, sorte
decidiria junto com tempo e escolha, e o foco (L-102) deixaria de ser a única
coisa que o jogador decide.

---

### L-109 — o HISTÓRICO DA EXPEDIÇÃO, e o VS que a batalha de NPC merece

**Registrada em:** 02/09/2026, do checklist do dono.
**Bloco dono:** 1.19. **Estado:** aberta, com o desenho fechado por ele.

#### O problema, e ele é de INVISIBILIDADE e não de mecânica

A batalha de treinador existe desde o 1.7b e é resolvida **em silêncio** na
colheita. Ela ocupa o encontro, mexe no XP e na bolsa, e **nada na tela conta**.
O dono viu o `6% treinador` no cartão do estágio e perguntou:

> "o que acontece quando tem aquele 6% treinador [...] não acontece nada"

Está certo. É a mesma classe do número que nunca anda: a mecânica acontece, o
jogador não sabe que existe, e por isso ela não é uma mecânica — é um ruído no
saldo.

#### E ele MESMO descartou a saída errada

> "acho melhor [...] a batalha idle não importa visualizar, mas depois eu te
>  pedi que contesse essa informação no histórico"

Assistir à batalha do idle seria o oposto do que o idle é: a tela fica aberta
por horas ao lado de um filme. O que falta não é espetáculo — é **prestação de
contas**.

#### O que o quadro precisa mostrar, decidido por ele

```text
o TREINADOR      nome do NPC, e o nível dos Pokémon dele
o VS             ícones de cabeça dos DOIS lados — os seus e os dele
o RESULTADO      vitória ou derrota
o GANHO          XP, PokéCoin, material, itens
o RESTO          quanto tempo durou, quantos encontros, o que foi capturado
```

O ícone de cabeça já é usado em dois lugares (painel de encontros, chip de
bioma). Este é o terceiro, e essa repetição é a vantagem: **o jogador aprende o
símbolo uma vez.**

#### Os nomes dos NPC entram como TEORIA, e isso está combinado

> "você pode teorizar os nomes e quando definirmos os outfits de npc trainer
>  battle faz a distribuição na hora de aplicar corretamente"

Então a tabela de nomes nasce provisória e **declarada como provisória no
código** — do mesmo jeito que o `comoAchei` do catálogo de itens. Nome de NPC
inventado que se passa por definitivo é a mesma armadilha do ícone errado: ele
parece certo, e ninguém confere o que parece certo.

#### E o battle log separado morreu aqui

O dono propôs um quadro só para contar NPCs e ele mesmo respondeu:

> "pouco importa se enfrentou 20 ou 80 e sim o que farmou"

Exato. O número de treinadores vira uma LINHA dentro do histórico, onde ele
significa alguma coisa, em vez de um painel onde não significa.

---

### L-110 — o quadro de colocação da Arena é pequeno demais para decidir

**Registrada em:** 02/09/2026, do checklist do dono.
**Bloco dono:** 1.23. **Estado:** aberta.

> "aumentar o quadro de colocação DA ARENA com odds, abates e etc. precisa ficar
>  maior a visualização de escolha atualmente está muito reduzido para os padrão
>  de zoom 100%"

É o mesmo defeito de leitura que o painel do idle tinha, do outro lado: lá a
cena era grande demais, aqui a ficha é pequena demais. E o critério é o mesmo —
**a tela onde se DECIDE precisa caber a decisão sem esforço.** Trinta segundos
para escolher entre doze lutadores, lendo odd e abate em tipo miúdo, é pedir que
o jogador chute.

---

### L-111 — o Pokémon SAI DA POKÉBOLA quando entra na equipe

**Registrada em:** 02/09/2026, do checklist do dono, com print.
**Bloco dono:** 1.24. **Estado:** aberta.

> "invés de deixar opção de selecionar o Pokémon na equipe ele fica marcado pra
>  aparecer a sprite em campo [...] ao clicar ativa como se ele saísse da
>  pokebola e fica andando do lado oposto do outro [...] ao desligar você meio
>  que puxa o Pokémon de volta pra pokebola"

O idle é visual — a escolha da equipe não muda o farm de quem aparece na cena.
Então a seleção deixa de ser uma marca no cartão e vira **um acontecimento no
mundo**: liga, e ele sai; desliga, e ele volta.

É a diferença entre marcar uma caixa e tomar uma decisão que se VÊ. E é grátis
em mecânica: o que muda é só quem anda na tela.

Junto, e é o mesmo assunto:

```text
o BOTÃO de selecionar   precisa chamar mais — hoje ele é um contorno
os PERFIS               Batida/Trilha/Vigília precisam de destaque na escolha
```

---

### L-112 — a aposta precisa ser CONFIRMADA, e a janela vai para 40 s

**Registrada em:** 02/09/2026, do checklist do dono.
**Bloco dono:** 1.27. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)* **Estado:** aberta. **MEXE NA SPEC.**

> "adicione um botão de CONFIRMAR (verde) e ao lado um CANCELAR (vermelho) [...]
>  ao selecionar agora é preciso confirmar logo, se você não confirmar outro
>  jogador pode escolher o Pokémon que você estava querendo"

Duas mudanças, e a segunda é de regra e não de tela:

```text
a TELA      confirmar ✓ verde e cancelar ✗ vermelho, ao lado das cédulas.
            Confirmado, o cancelamento leva as cédulas junto.
a JANELA    30 s -> 40 s
```

#### E o segundo item CONFLITA COM A SPEC — ela vence, então ela muda junto

`BET_WINDOW: 30` está em `engine/engine.mjs`, e os 30 s aparecem em quatro
lugares da Spec, um deles como hipótese declarada:

```text
§ (linha 889)   "odds são congeladas no início da janela de 30 s"
§ H2            "30 segundos é uma janela adequada para decidir a aposta"
```

A H2 é uma HIPÓTESE, e o dono acabou de reprová-la na prática — junto com a
L-110, que diz por quê: a ficha é pequena demais para se ler em trinta segundos.
As duas lacunas são a mesma queixa por dois caminhos.

Então o bloco dono corrige a Spec **no mesmo commit**, com o número velho ao
lado do novo, como manda o `CLAUDE.md`. Trocar o código e deixar a Spec dizendo
30 é como um documento envelhece e passa a mentir — que é o D-059.

#### O que precisa ser medido antes

O estudo do §12 afirma que 154.000 simulações cabem "folgadamente antes de abrir
a janela de 30 s". Com 40 s a folga só aumenta, então **este lado não trava**.
O que muda é a economia: uma janela maior é mais tempo por rodada, menos rodadas
por hora, e menos volume de aposta por sessão. O bloco dono mede isso antes de
fechar.

---

### L-113 — a tela fica PEQUENA em 2560×1440, e não pode piorar em 1920×1080

**Registrada em:** 02/09/2026, do checklist do dono, com dois prints lado a lado.
**Bloco dono:** 1.26. **Estado:** aberta.

> "a tela da arena e idle ficam confortáveis [...] em zoom 100% e resolução de
>  1920x1080 porém no segundo print você consegue observar que já não fica tão
>  visível pra enxergar os Pokémon [...] para quem usar resolução de 2560x1440
>  que nem eu, porém não pode afetar quem já usa em 1920x1080 pois está show"

#### Por que acontece, e não é bug

Um pixel de CSS é o mesmo em toda tela. Numa de 2560 px de largura, a mesma
interface ocupa **75% da área relativa** que ocupava numa de 1920 — tudo fica
igual em pixel e menor em proporção da tela. O navegador só resolveria isso com
zoom, e pedir ao jogador que ajuste o zoom é entregar o problema para ele.

#### A restrição é a parte difícil

> "não pode afetar quem já usa em 1920x1080 pois está show"

Então NÃO serve mexer em tamanho base. O que serve é a interface **crescer a
partir** de uma largura, e ficar intocada abaixo dela.

#### O caminho, e ele precisa de medição antes

O projeto mistura `px` e `rem`. Uma escada de `font-size` na raiz só levanta o
que está em `rem`; o que está em `px` fica para trás e o arranjo desmonta.

```text
1. MEDIR   quanto da interface está em rem e quanto em px, por tela
2. DECIDIR se a escada é no `html { font-size }` ou num `zoom`/`scale` do `.app`
3. TESTAR  a suíte visual em 2560 — hoje ela mede 1920, 1440, 1100 e 420, e
           NENHUMA dessas larguras enxerga o problema que o dono descreveu
```

O passo 3 é o que mais importa: **a largura em que o defeito aparece não está na
lista de larguras que o portão fotografa.** Enquanto não estiver, qualquer
correção aqui é opinião — e é a mesma lição do D-058.

---

### L-114 — a EVOLUÇÃO existe no motor e ninguém a chama

**Registrada em:** 02/09/2026. **Bloco dono:** 1.21.
**Estado:** aberta. **CORRIGE A L-106, que eu registrei errado.**

Eu disse ao dono que "a evolução não existe". **Está errado, e o erro foi meu:**

```text
engine/evolucao.mjs     130 linhas — evoluir(), linhaDe(), estagioDe(),
                        evolucoesDisponiveis(), baseDe()
content/…evolucoes      72 arestas: { de:1, para:2, exige:{ nivel:16 } }
                        Charmander -> Charmeleon no 16, e assim por diante
```

O motor e os dados estão inteiros. **O que falta é uma tela que chame.** Nenhum
caminho do app usa `evoluir`, então a criatura sobe de nível para sempre e nunca
muda de forma.

Isso torna a L-106 muito menor do que registrei, e a Pokédex ganha de graça a
LINHA EVOLUTIVA para desenhar (`linhaDe` já devolve).

#### E a tela de transição é requisito, não enfeite

Decisão do dono, e o argumento é dele:

> "Pokémon que não tem uma tela de evolução nem mínima que seja não é um
>  Pokémon, essa tela de transição de evolução reinam desde os primórdios da
>  franquia"

Ele mandou um vídeo comparando as animações da franquia e escolheu a do
**Omega Ruby / Alpha Sapphire** como referência, dispensando as quatro primeiras
(as mais antigas).

**Eu não consigo assistir ao vídeo** — digo isso porque a diferença entre
"conheço o padrão" e "vi a referência" é exatamente o que este projeto não deixa
passar. O que vou construir a partir do padrão que conheço, para ele corrigir se
não for:

```text
1. a cena escurece e o mundo sai de foco
2. a criatura vira SILHUETA branca sobre o escuro
3. aneis de luz saem dela em pulso, e ela alterna entre as duas formas —
   rapido, e cada vez mais rapido
4. um estouro branco cobre a tela
5. a forma nova aparece, com faiscas caindo, e o nome dela e escrito
```

E o passo 3 é o que faz a coisa funcionar: **a alternancia entre as duas formas
e a animacao inteira.** Sem ela, e um flash com um sprite trocado.

Vestido no tema: os aneis em neon na cor do tipo da criatura, e a silhueta com o
contorno de varredura que a interface ja usa.

---

### L-115 — a captura não tem animação — CONSTRUÍDA no 1.23

**Registrada em:** 02/09/2026, do checklist do dono, com vídeo de referência.
**Bloco dono:** 1.23. **Estado:** CONSTRUÍDA em 03/09/2026.

> "hoje a mensagem de captura é muito vaga ela só aparece embaixo do 'mandar
>  expedição' e some rapidamente, deve aparecer algum alerta, animação de que o
>  Pokémon fugiu, uma espécie de popup"

O momento mais importante do idle — a criatura entrou ou fugiu — é hoje uma
linha de texto que aparece longe do olho e some. **É o oposto de onde a atenção
está.**

#### O que o bloco dono precisa entregar

```text
a BOLA CERTA     jogar uma Great e ver a animação da Ultra é pior que não ter
                 animação nenhuma — a arte tem de casar com o objeto usado
o SUCESSO        estrelinhas subindo, brilho, e o som de trava
a FUGA           tratamento próprio, e não a ausência do de sucesso
o POPUP          o resultado espera ser lido, em vez de sumir sozinho
```

#### E a referência é vídeo, que eu não consigo ver

O dono mandou `youtube.com/watch?v=yppucI8v9c8`. **Eu busco a página e leio o
título; não vejo os quadros.** Digo isso porque a diferença entre "conheço o
padrão" e "vi a referência" é o que este projeto não deixa passar.

O padrão que eu conheço, e que o bloco dono vai construir para o dono corrigir:

```text
1. a bola voa em arco ate a criatura
2. a criatura vira luz e e sugada para dentro
3. a bola cai, e BALANCA — uma, duas, tres vezes, com uma pausa entre elas
4. sucesso  -> trava, um brilho, e estrelas subindo
   fuga     -> a bola abre, a luz sai, e a criatura reaparece
```

O passo 3 é a animação inteira: **a pausa entre os balanços é o suspense**, e
sem ela o resto é decoração.

---

### L-116 — as faixas de raridade precisam de destaque — CONSTRUÍDA no 1.23

**Registrada em:** 02/09/2026, do checklist do dono. **Bloco dono:** 1.23. **Estado:** CONSTRUÍDA em 03/09/2026 — e o que se achou
medindo foi PIOR que a lacuna: três telas definiam as cores e as três
discordavam, e a mais rara usava `var(--gold)`, que muda com o TEMA.

#### O retrato de hoje, medido

```text
tier         cor atual          chance   vagas no mapa
comum        cinza-azulado       45%       116
incomum      verde               28%        53
raro         azul                14%        68
muitoRaro    roxo                 6%        76
lendario     NENHUMA            1,5%         1
```

**O `lendario` existe na tabela de pesos e não tem tratamento visual nenhum.**
Ele cai no estilo padrão. A coisa mais rara do jogo — uma vaga no mapa inteiro —
é desenhada como se fosse comum.

#### O desenho do dono encaixa no que já existe

```text
comum       CINZA, e continua cinza — mas com presenca de verdade
incomum     VERDE neon
raro        AZUL neon
muitoRaro   ROXO neon
lendario    VERMELHO neon        <- resolve o orfao
```

Precisao do dono, quando eu perguntei se o comum mudava de cor:

> "o comum pode se manter um cinza mas com melhor visualizacao, intencao de
>  fato e realce e destaque para as cores"

**O pedido nao e trocar a paleta — e fazer a paleta APARECER.** Hoje as cores
existem e sao aplicadas em `border-color` com opacidade baixa: `rgba(...,.35)`
no comum, `.42` no incomum. Numa borda de 1 px sobre fundo escuro, isso e
quase invisivel — a informacao esta la e o olho nao a alcanca.

O que o bloco dono precisa entregar, entao, nao e cor nova:

```text
OPACIDADE   subir a borda para valores que se leem de relance
BRILHO      um halo curto na cor do tier, como o HUD ja usa
AREA        a cor precisa tocar mais que 1 px de contorno
```

E o cinza do comum entra nessa conta tambem: **cinza sem presenca le como
"ainda nao carregou"**, e nao como "esta e a faixa mais simples".

#### E a recomendação é NÃO criar o tier "épico"

O dono cogitou um sexto degrau em dourado. Recomendo não:

```text
CINCO ja e muito para guardar de cabeca, e a diferenca entre "epico" e
"muito raro" nao se explica em uma frase — e tier que nao se explica em uma
frase e tier que o jogador ignora.

O `lendario` com UMA vaga no mapa ja e o topo, e um topo com uma vaga so nao
precisa de vizinho.
```

O **dourado** fica melhor no que já existe e ninguém destaca: o **shiny**, que é
ORTOGONAL à raridade (um comum pode ser shiny) e hoje ganha só um `✦`. Duas
escalas cruzadas dão mais combinações do que uma escala mais longa.

Sobre o pseudo-lendário: o dono citou o Dragonite. Ele é `muitoRaro` hoje —
penúltimo degrau, que é onde deve estar. "Pseudo-lendário" é categoria de fora
do jogo, e importá-la criaria um degrau que só quem já joga há anos entende.

---

### L-117 — o REPASSE DO RMT: o PokéCash bloqueado como trava contábil

**Registrada em:** 02/09/2026. **Bloco dono:** nenhum ainda.
**Estado:** PENDENTE DE DECISÃO DO DONO. Não implica em nada hoje — nenhuma
linha do que está construído toca dinheiro real.

O dono pediu que o nome fosse este: **"repasse do RMT"**, e não "saque".

#### A ideia é dele, e ela inverte a ordem certa

> "o vendedor deixa a chave dele disponível e nós staff fazemos pix, e
>  descontamos o saldo de PokéCash dele, o PokéCash meio que um 'empréstimo' e
>  fica bloqueado pra uso, só uma maneira de assegurar que ele vai receber esse
>  dinheiro"

**Em vez de segurar dinheiro que não é seu, ele segura CRÉDITO que é.** O
PokéCash bloqueado impede o vendedor de gastar duas vezes o mesmo valor enquanto
o repasse não sai — e crédito interno se pode reter sem intermediar nada.

E resolve o furo do PIX direto de uma vez: **o comprador paga o JOGO**, então o
valor está na mão de quem libera o item.

#### O furo, e é um só

```text
Entre o comprador pagar e o staff repassar, o dinheiro esta com a plataforma.
Isso e CUSTODIA — nao importa que seja manual, nem rapido.
```

#### E ele se fecha sem perder a ideia

A trava do PokéCash **não depende de o dinheiro passar pela plataforma**. Ela é
contábil, não financeira. Então o mesmo desenho roda nos dois modos:

```text
BETA        manual, como o dono desenhou. Risco operacional, volume conhecido.
ESCALA      identico, com um PSP fazendo o repasse (split de pagamento):
            o comprador paga o PSP, o vendedor recebe do PSP, e o PokeCash
            bloqueado continua sendo a trava.
```

**Trocar o motor de pagamento não muda o desenho** — que é a melhor propriedade
da ideia dele.

#### Três acréscimos, cada um tapa um golpe conhecido

```text
a TAXA sai do PokéCash    automatica, e nao depende de alguem lembrar
LIMITE por vendedor        ex. R$500/semana no inicio. Golpista testa o teto
                           antes de investir; teto baixo torna o golpe caro.
o COMPRADOR confirma       o prazo so corre depois. Sem confirmacao o prazo
                           nunca comeca, e o item volta.
```

#### E a regra que emoldura tudo isto

> **O RMT é indispensável.** Decisão do dono, e o argumento é econômico: num
> idle, quem ganha dinheiro é quem gasta dinheiro. Nenhuma proposta futura pode
> ser "tirar o RMT" — as propostas são sobre COMO operá-lo.

---

### L-118 — a TORRE tem cura e poção, e o HP nasce lá

**Registrada em:** 02/09/2026. **Bloco dono:** 2.0 (a Torre).
**Estado:** aberta, e o dono trará os detalhes na hora.

O dono perguntou como a criatura se cura no idle e o que acontece se ela morrer.
**A resposta é que não existe HP no idle**, e isso é decisão registrada:

```text
stamina   quanto ela aguenta ir a campo    recupera 8/h, cheia em 12,5 h
XP        progresso para o proximo nivel   so sobe
ATQ/DEF/VEL                                fixos
```

A batalha de treinador é resolvida por chance, e a derrota custa **XP menor** —
nunca a criatura. *"Barra de energia do jogador é a mecânica que todo mundo
odeia; stamina na criatura diz outra coisa — esta equipe está cansada, mande
outra."*

**Mas a pergunta continua boa, e a resposta dela é a Torre.** Lá o PvE é de
verdade, e lá morrer precisa custar:

> "na torre será possível o drop de curas, e poções, o sistema precisa ser BEM
>  PARECIDO COM SISTEMA DO POKELIKE que você já conhece porém iremos apresentar
>  em um estilo diferente"

O dono trará os detalhes quando o bloco chegar. O que fica registrado agora:

```text
a TORRE tem HP           e o idle continua sem
CURA e POCAO caem la     e sao consumiveis de la
o ESTILO e nosso         referencia entra como materia-prima e sai como coisa
                         nossa, com uma diferenca que se possa NOMEAR
```

---

### L-119 — O CLIMA NO IDLE ✅ CONSTRUÍDA no 1.32 (10/09/2026)

**O que ficou de pé, medido no pack de referência:**

```text
CLIMA          TIPO(S)        COBERTURA   PASSO   EQUIPE CHEIA   CANAL
Sol Forte      fogo             11 esp     8,6%      +18%        XP
Chuva          água             32 esp     5,1%      +11%        ritmo
Vendaval       voador           16 esp     7,2%      +15%        moeda
Tempestade     terra+pedra      19 esp     6,6%      +14%        material
Névoa Tóxica   veneno           33 esp     5,0%      +10%        item raro
Pólen          planta           14 esp     7,7%      +16%        material
Nevasca        gelo              4 esp    14,3%      +30%        item raro
Tempo Firme    —                  —          —         —         (40% do peso)
```

**O passo SAI da raridade** e não de uma tabela escrita à mão. O dono levantou o
Gelo, e a resposta não foi escrever um número maior na linha dele: foi fazer o
número vir da cobertura, para que ninguém precise reescrever nada quando o
elenco mudar. Veneno — o maior tipo do elenco e o órfão que a lacuna apontou —
ganhou a Névoa.

**O ticket de clima** (compra em PokéCash) NÃO foi construído. Ele continua
aberto, e o desenho dele está preservado abaixo, na versão original desta
lacuna. Bloco dono: **1.31b**. As três travas que o mantêm honesto continuam
valendo, e a terceira é a que decide: o ticket vende PREVISIBILIDADE, nunca um
clima melhor que o sorteado.

**A trava de sprite** por bioma também segue aberta, registrada como decisão do
dono e sem bloco.

---

#### A lacuna original, preservada

### L-119 — O CLIMA NO IDLE: buff de FARM, e não de dano

**Registrada em:** 02/09/2026, do checklist do dono. **Bloco dono:** 1.32. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)*
**Estado:** aberta, com o desenho dele.

A arena já tem clima (`pack.clima`) e ele muda DANO. No idle o eixo é outro:

> "o clima sol forte no iddle pode aumentar em 2.5% de xp a mais no farm da rota
>  isso usando um Pokémon de fogo obvio [...] o player precisa sentir a
>  'melhoria' do buff na prática"

```text
o SORTEIO    o clima da run e RNG, e nao acontece sempre
a TIPAGEM    so buffa quem e do tipo, e so quem FOI a expedicao
o LOG        "+52 PokeCoin por buff de clima: Vendaval" — sem isso o buff
             acontece e o jogador nao sabe que aconteceu
```

E a regra que ele nomeou: **o que importa é o Pokémon ENVIADO, não o que aparece
na cena.** A sprite é visual e não entra na conta.

#### A análise dos tipos, medida

```text
poison 33 · water 32 · normal 22 · flying 16 · grass 14 · ground 14
bug 12 · psychic 12 · fire 11 · rock 11 · electric 8 · fighting 8
fairy 5 · ice 4 · ghost 3 · dragon 3 · steel 2
```

O dono levantou o gelo (4 espécies) e está certo — **mas ele não é o pior.**
Fantasma tem 3, dragão 3 e aço 2. E o achado que muda a lista: **VENENO é o
MAIOR tipo do elenco, com 33 espécies, e não tem clima nenhum.**

Recomendação de quais climas existir, por cobertura:

```text
Sol Forte      fire 11         +XP                    (ja existe na arena)
Chuva          water 32        +velocidade de farm    (ja existe na arena)
Vendaval       flying 16       +PokeCoin
Tempestade     ground+rock 25  +material
Nevoa Toxica   poison 33       +chance de item raro   <- o tipo orfao
Polen          grass 14        +material
Nevasca        ice 4           +MUITO, e raro         <- ver abaixo
```

**O gelo FICA, e vira o clima de sorte grande.** Quatro espécies num elenco de
146 é raridade real; então o buff dele é o maior da tabela, e sair um Nevasca com
um Lapras na equipe é um acontecimento. É melhor desenho que remover: um clima
que quase ninguém aproveita, quando aproveitado, vale história.

#### O ticket de clima, e por que ele é a peça mais delicada

> "ticket do clima, o jogador compra por x valor de pokécash e pode ativar em uma
>  run que ele queira um clima especifico"

É item de loja de dinheiro real que dá vantagem de farm — cai direto na regra do
dono (*todo item pago precisa ser sentido*) E no §P5. O que o mantém honesto:

```text
TETO DIARIO de compra     sem ele, dinheiro vira farm sem limite
LIMITE por run            um por run, e nao empilhavel
o BUFF e o MESMO do RNG   comprar antecipa a sorte, nao a supera
```

A terceira é a que decide: se o ticket desse um clima MELHOR que o sorteado, ele
venderia poder. Dando o mesmo, ele vende **previsibilidade** — que é tempo, e não
vantagem.

#### E a trava de sprite

> "o Pokémon qual sprite estiver setado em bioma com clima ativo fica com sprite
>  travada para aquele bioma"

Registrado como decisão dele.

---

### L-120 — POP-UPS DE CONFIRMAÇÃO — a da EXPEDIÇÃO construída no 1.24

**Registrada em:** 02/09/2026. **Bloco dono:** 1.24 (expedição) e 1.29 (arena).
**Estado:** METADE CONSTRUÍDA em 03/09/2026 — a da expedição está de pé; a da
ARENA continua aberta, junto da janela de 40 s, na L-112.

Dois pedidos que são o mesmo assunto:

```text
a ARENA       confirmar a aposta antes de ela valer (ja registrado na L-112)
a EXPEDICAO   "Voce confirma x Pokemon para x rota x tempo?" com (V) e (X)
```

#### E a crítica que veio de fora, que é a parte importante

Um amigo do dono olhou o projeto e disse que o site é **"muito linear, site de
velho, anos 2000"**. O dono concordou, e eu também:

> Hoje quase tudo acontece **em linha**: clica, muda, e a página segue. Não há
> momento em que o jogo PARE para confirmar, celebrar ou avisar. Uma interface
> sem momentos é uma lista de formulários.

O pop-up de confirmação não é só proteção contra o clique errado — **é o primeiro
momento**. Ele diz "isto aqui importa", e é a mesma família da tela do foco (1.16)
e da transição de evolução (1.21).

---

### L-121 — A SELEÇÃO DA EQUIPE — a pokébola construída no 1.24

**Registrada em:** 02/09/2026, do checklist do dono, com print de simulação.
**Bloco dono:** 1.24. **Estado:** METADE CONSTRUÍDA em 03/09/2026.

```text
a POKÉBOLA como interruptor    CONSTRUÍDA — acesa vai, apagada fica
as SPRITES lado a lado         ABERTA — a cena mostra UM companheiro, e o
                               pedido é a equipe inteira ao lado do treinador
```

A segunda metade fica para o bloco do CENÁRIO, e não por preguiça: quem anda na
cena é decidido em `idle-quem.mjs`, e passar de **um para três** mexe na
caminhada, na colisão com a água e na câmera — três coisas que `vida.mjs`
resolve hoje para UM corpo. É trabalho de cenário, e cenário tem bloco próprio.

> "a hora de escolha desse Pokémon pode ser bem simples com um ícone [...] a
>  pokebola [...] ao clicar ele fica aceso e libera o pokémon, ao guardar Pokémon
>  ele se apaga e fica escuro"

A **mesma pokébola da Pokédex**, agora como interruptor no cartão da equipe:
acesa = está em campo; apagada = guardada. É o quarto lugar do mesmo símbolo, e
essa repetição é a vantagem.

E na cena, as sprites ficam LADO A LADO com o treinador — o print do dono mostra o
arranjo. O movimento é o mesmo que já existe; muda só a posição.

---

### L-122 — O MOBILE, e a pergunta que ninguém tinha feito

**Registrada em:** 02/09/2026. **Bloco dono:** trilha M (paralela). **Estado:** aberta.
**PRIORIDADE CORRIGIDA PELO DONO — ver a L-127.** Eu tinha posto o mobile em
terceiro na fila; ele decidiu que é trilha paralela e não bloqueia o desktop.

O amigo do dono perguntou: **"e essa tela no mobile fica como?"**

E a resposta honesta é: **ninguém sabe.** O portão visual fotografa 1920, 1440,
1100 e 420 px — o 420 é largura de celular, mas:

```text
LARGURA        e testada
ALTURA         nao. O portao usa alturas de desktop.
TOQUE          nao ha teste nenhum. O arraste do palco e `resize`, que NAO
               EXISTE em toque. A alca do painel simplesmente nao funciona num
               celular, e nada no projeto sabe disso.
ROLAGEM        a aba do idle tem 3.800 px de altura em 420 px de largura
```

O último número é o que assusta: **3.800 px de rolagem** numa tela que o dono quer
que fique aberta por horas.

#### O que o bloco dono precisa fazer, em ordem

```text
1. MEDIR   fotografar em alturas de celular de verdade (844, 915, 667) e com
           emulacao de toque — hoje o portao nao enxerga isso
2. DECIDIR o que vira aba, o que vira acordeao, e o que some no estreito
3. TROCAR  a alca de `resize` por algo que exista em toque
```

O passo 1 vem primeiro pela mesma razão de sempre: **a largura em que o defeito
aparece não está na lista que o portão fotografa** — e enquanto não estiver,
qualquer correção é opinião.

---

### L-123 — AS DUAS LOJAS, e a moeda de cada uma

**Registrada em:** 02/09/2026. **Bloco dono:** 1.31 (as duas lojas). *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)*
**Estado:** aberta, com a moeda decidida pelo dono.

#### A decisão que ele tomou, e ela melhora o desenho

> "para não implementarmos mais uma moeda o pokécash se torna TAMBÉM a moeda de
>  compra na loja de outfits, banners, efeito de nome, avatar"

Concordo, e por mais do que economizar uma moeda: **hoje o PokéCash só serve para
apostar**, então quem não gosta de apostar não tem razão nenhuma para comprar. Com
três saídas — aposta, cosmético e boost — a mesma moeda serve a três públicos, e
quem compra pelo outfit acaba conhecendo a arena porque já tem saldo.

```text
PokéCash    compra-se com dinheiro real   aposta · cosmético · boost
PokéCoin    farma-se no idle e na Torre   loja PvE
Essência    farma-se                      troca por item de poder
```

#### A LOJA PvE — abre dentro do idle

```text
ONDE      logo na tela do bioma, ao lado da mochila, E embaixo perto da caixa
NPC       a vendedora, em retrato, falando por balão de HQ; uma de ~10 frases
          sorteada na abertura
COMPRA    item, ícone, informação, e o jogador escolhe a quantidade
VENDA     mostra TUDO que se pode vender. O que ele não tem aparece APAGADO,
          com o valor visível — para o preço ser conhecido antes de ter o item
```

A segunda metade da venda é a boa ideia: **um catálogo que mostra o que você ainda
não tem, com o preço, transforma a loja num mapa de objetivos.**

Os preços precisam ser calibrados contra o farm atual, e a pedra e o Pokémon
entram por raridade e estágio de evolução.

#### A LOJA POKÉCASH — aba separada

Fica estruturada e declarada em construção. O NPC (o homem, do vídeo) já aparece.

---

### L-124 — DIA E NOITE, o relógio, e o banner que não anda ✅ FECHADA

**Registrada em:** 02/09/2026. **Bloco dono:** 1.34. **Estado:** ✅ **FECHADA em
25/09/2026** — Q2 VERDE 1017/1017, suíte VERDE 2184/2184.

> **O que ficou na tela:** a JANELA DO CÉU no canto do palco (o sol e a lua no
> mesmo arco, a lua mordida, as estrelas acendendo, um horizonte de morros); a
> luz da hora como camada com `multiply` sobre a cena inteira; e o BRILHO DA
> NOITE — brasa, vaga-lume e neve somados ao escuro, 1,85× mais fortes. O banner
> da expedição passou a andar a cada segundo.
>
> **Duas tentativas foram reprovadas olhando** antes da que ficou — estrelas na
> grama e neblina cinza; depois azul puro cobrindo o chão. As duas estão no
> histórico de commits, e não foram apagadas.
>
> **E o fuso:** a revisão externa de 24/09 perguntou qual relógio governa o
> mundo, e a cena lia o UTC cru — três horas adiantada no Brasil. O dono
> decidiu: **Brasília para todos** (DEC-10). `relogioDoMundo` em
> `app/modules/hora-do-dia.mjs`.

Visual, e o dono foi específico sobre o cuidado:

```text
DIA        sol num canto, tela mais clara
TARDE      alaranjado, sol se pondo
NOITE      estrelas, lua NO LADO OPOSTO de onde o sol nasceu
```

> "se atente a esse pequeno detalhe. Onde sol nasce e se põe e o mesmo para lua"

E o melhor do pedido: **à noite os efeitos do cenário ficam mais fortes** — a brasa
do vulcão acesa, o floco de neve brilhando ao entardecer. É a regra do cenário que
nunca está pronto, aplicada a uma dimensão nova.

#### E um DEFEITO dentro do pedido

> "percebo que atualmente a contagem que já existe no banner de batalha no iddle
>  marcando a expedição ele não atualiza de forma continua e simultânea"

Isso não é pedido de recurso: **é um número parado**, e o projeto já tem regra para
isso — *um número que nunca anda ensina o jogador que o número é falso.* O bloco
dono conserta junto, e ele vale um D próprio quando for confirmado.

---

### L-125 — OS NPCs DAS LOJAS, e o som que só toca com a loja aberta

**Registrada em:** 02/09/2026. **Bloco dono:** 1.31. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)*
**Estado:** aberta. **O material está em disco.**

```text
video   .../PokeArena/NPC LOJA POKÉCOIN E POKÉCASH/vídeo_npc.mp4  (5,41 MB)
        DOIS NPCs no mesmo arquivo, separados por uma linha no meio:
        o HOMEM  -> loja PokéCash (sala)
        a MULHER -> loja PvE (holograma)
```

#### O NPC SAI DO VÍDEO, e não do retrato parado

Precisão do dono, 02/09/2026:

> "você vai usar o vídeo pra deixar de maneira como GIF ANIMADO, e mantendo o
>  som[;] a imagem PNG no momento não vai ter serventia"

O retrato estático fica de reserva. **Um NPC parado num balão de HQ lê como
ilustração; um NPC que se mexe lê como alguém atendendo** — e é a diferença
entre uma loja e uma tabela de preços.

O caminho técnico já existe e foi medido no 1.20: o gif da pokébola tinha
5,71 MB e virou uma tira de 113 KB. **Vídeo é ainda melhor que gif** — ele já é
comprimido para movimento e carrega o som junto, que o gif não carrega. Então a
decisão do bloco dono é usar `<video>` com `muted` por padrão e som ao ABRIR,
e não converter para gif: converter perderia o áudio que o próprio pedido exige.

E a regra que o dono fixou junto:

> "mantenha o som do vídeo na hora de abertura de suas respectivas lojas [...] ao
>  fechar o som não é permitido ouvir, em aba alguma do site"

#### O CORTE, e quem vai para qual loja (registrado em 03/09/2026)

Pedido do dono, no meio do 1.22:

> "lembre-se também de cortar e separar a mulher pra loja do iddle de poké coin
>  e o homem de terno pra loja do pokécash"

O material está em disco e **eu olhei**. É um díptico — os dois NPCs no mesmo
quadro, separados por uma linha vertical no meio:

```text
pasta   C:/Users/gdult/OneDrive/Documentos/PokeArena/NPC LOJA POKÉCOIN E POKÉCASH/
        vídeo_npc.mp4                                  5,41 MB
        Gemini_Generated_Image_emjtaremjtaremjt.jpg    3,47 MB · 2816 × 1536

ESQUERDA   o HOMEM DE TERNO   -> loja PokéCash
           sala fechada, vitrines de vidro com joia, tablet holográfico
           escrito na cena: "Cash Coins · Gold"

DIREITA    a MULHER           -> loja PokéCoin (a do idle)
           banca de rua, fiação exposta, multidão ao fundo, jaqueta de remendos
           escrito na cena: "GAME COINS! RARE! HUSTLE!"
```

**A arte já resolveu o enquadramento sozinha, e vale reparar nisso**: a loja de
dinheiro de verdade é *silenciosa, limpa e fechada*; a loja de moeda de jogo é
*barulhenta, suja e aberta na rua*. Isso não estava no pedido e é exatamente o
que separa as duas de relance, sem legenda. O corte tem de preservar essa
diferença — recortar as duas em close no rosto jogaria fora a metade que
informa.

#### Como o corte é feito

```text
1. PARTIR ao meio          2816 -> duas telas de 1408 × 1536
2. ENQUADRAR cada uma      o NPC ocupa ~60% da largura; o resto é a loja dele,
                           e a loja fica
3. REDUZIR                 múltiplo inteiro, como toda arte deste projeto
4. O VÍDEO tem o mesmo corte, e é ele que entra: `<video>` com som ao ABRIR
                           (ver a decisão acima) — a imagem é a reserva
```

#### Uma linha sobre a origem

A imagem é gerada (Gemini) a pedido do dono, então a arte é dele — mas ela
carrega marcas da franquia na jaqueta da personagem. O status é o mesmo dos
sprites: sem problema para o build privado, e coberto pelo §0.3.1 no dia da
publicação paga. Não abre item novo; só não pode ser esquecido junto com o
resto.


**O material chegou todo em 02/09/2026:**

```text
ÍCONES GERAIS/pokemart.png        o logo da loja PvE
ÍCONES GERAIS/catchpokeball.gif   a bola de captura (L-115)
NPC LOJA .../vídeo_npc.mp4        os dois NPCs, um em cada metade
NPC LOJA .../Gemini_...jpg        retrato
```

---

### L-126 — O POKÉCASH COMPRADO USA CADEADO, e ele já tem onde morar

**Registrada em:** 02/09/2026, do checklist do dono. **Bloco dono:** 1.28.
**Estado:** aberta, e é a regra mais importante da economia até agora.

#### O medo dele, e ele está certo

> "A INTENÇÃO DESSE CAP DO USO DO POKÉCASH: O CARA DOAR NÃO SEI QUANTO E NO
>  PRIMEIRO DIA TER DINHEIRO PRA DEIXAR POKÉMON BOOSTADO FORTÃO"

Sem essa separação, o requisito da pedra (*o dinheiro compra velocidade, a pedra
cobra presença*) **é contornável**: quem comprasse muito PokéCash zeraria a
coluna do dinheiro em todos os degraus de uma vez, e a pedra viraria o único
freio — que é o cenário que a própria calibração descartou por travar tudo.

#### A regra, na palavra dele

```text
PokéCash COMPRADO   aposta na arena  ·  cosmético           <- CADEADO
PokéCash GANHO      livre — inclusive BOOST no laboratório
                    (lucro de arena, farm, recompensa, tudo)
```

E o detalhe que fecha o laço:

> "GANHANDO, o seu LUCRO SE SOMA À CARTEIRA [livre]; PERDENDO, ELE PERDE O
>  DINHEIRO"

**O cadeado se abre GANHANDO.** Comprar não dá boost; comprar dá tentativas, e
o boost vem do que se ganhou. Isso é elegante: o dinheiro entra no jogo e ainda
assim o progresso continua sendo conquistado.

#### E a estrutura JÁ EXISTE — isto é um balde, não uma reforma

`engine/carteira.mjs` tem, desde o F0.9:

```js
export const BUCKETS = ['transferivel', 'pendente', 'bonus', 'competitivo'];
export const ORDEM_CONSUMO = ['bonus', 'competitivo', 'transferivel'];
```

É o **`separação Bonus/Transferable queues`** que está literalmente listado no
§25.1 da Spec. O que falta é:

```text
1. um balde `comprado`, alimentado pelo depósito
2. a ORDEM DE CONSUMO poe `comprado` na FRENTE na aposta e no cosmetico —
   gasta-se primeiro o que e restrito, e o livre fica guardado
3. o BOOST recusa o balde `comprado`. E a unica recusa nova.
4. o LUCRO da aposta cai em balde LIVRE, mesmo tendo sido apostado com o
   comprado — e essa e a linha que faz o cadeado se abrir jogando
5. o CADEADO na tela: um icone no saldo, e o numero separado em duas parcelas
```

O item 2 não é detalhe: se o livre fosse gasto primeiro, o jogador acabaria com
uma bolsa só de PokéCash restrito e a sensação seria de estar sendo punido por
ter comprado — o oposto do que se quer.

#### O que isto obriga na loja de cosméticos

Cosmético aceita os DOIS baldes. É a saída que faz o PokéCash comprado valer a
pena mesmo para quem não aposta — e ela não conflita com nada, porque cosmético
não é poder.

---

### L-127 — O MOBILE É TRILHA PARALELA, e não bloqueia nada

**Registrada em:** 02/09/2026. **SUBSTITUI a prioridade que eu tinha dado à
L-122.** **Bloco dono:** trilha M (paralela). **Estado:** aberta.

Eu tinha posto o mobile em terceiro na fila. O dono corrigiu a prioridade:

> "O MOBILE DEVE SEGUIR DE FORMA PARALELA E INCLUSIVE NÃO PRECISA
>  NECESSARIAMENTE SER LANÇADA JUNTO [...] NÃO DESPERDICE MUITO TEMPO E TOKENS
>  EM EXCESSO COM ISSO AGORA, A NÃO SER QUE SEJA FUNDAMENTAL SER MOLDADO DESDE
>  JÁ PARA O FUTURO"

**Ele está certo, e a ressalva dele é a pergunta certa.** Então a resposta, em
duas partes:

#### O que É fundamental moldar desde já — e é pouco

```text
NADA de layout.    Refazer arranjo agora seria construir para um alvo que
                   ninguem mediu.
SIM, o TOQUE.      A alca do palco e `resize`, que NAO EXISTE em toque. Toda
                   peca nova que dependa de arrastar nasce quebrada no celular.
SIM, uma REGRA.    Nenhuma interacao nova pode ser SO por arrastar ou SO por
                   passar o mouse. Sempre tem de haver um caminho por clique.
```

A terceira é a que se paga: ela custa zero hoje e evita refazer dez peças
depois. Fica valendo a partir de agora.

#### O que ESPERA a trilha paralela

Medir em altura de celular (844, 915, 667) com toque emulado, decidir o que vira
aba ou acordeão, e resolver os **3.800 px de rolagem** que a aba do idle tem em
420 px de largura.

Nada disso bloqueia o desktop, e por isso sai da fila principal.

---

### L-128 — a criatura DADA conta para a escada — DECIDIDA, conta

**Registrada em:** 03/09/2026, saindo do D-075. **Bloco dono:** 1.27.
**Estado:** FECHADA em 03/09/2026, pelo dono. **A inicial CONTA.**

> Palavra dele: *"acho que devia se manter a liberação através da dex"*, e sobre
> a escada em geral: *"não precisa ser algo desenfreado, mas pode dar uma
> melhorada sobre a questão do teto atual"*.

**O argumento que decidiu não foi generosidade — foi haver UM número.** Como a
inicial é +1 para todo jogador, sempre, contar ou não contar é equivalente a
deslocar todos os marcos em um. Não desequilibra nada, e tira a contradição de
duas contagens com o mesmo nome. A linha `vistas em campo` que eu tinha
proposto deixa de ser necessária: com um número só, não há o que separar.

O que segue vivo saiu DESTA conversa e é maior que a pergunta original — ver a
L-132.

O D-075 corrigiu a TELA: ter a criatura passou a contar como ter visto a
espécie, porque desenhar `007 ? ???` ao lado do selo de "capturada" era a linha
se contradizendo.

O que **não** mudou, e de propósito:

```text
pokedex.mjs        vistos = registro ∪ capturados      (tela — corrigido)
idle-dados.mjs     especiesVistas = só o registro      (economia — intocado)
```

`especiesVistas` move duas coisas que valem dinheiro de jogo:

```text
o TETO diário de encontros    +1 a cada 60/80/100/120 espécies
a ESCADA de vagas             a 2ª vaga abre com 10 espécies
```

Somar a inicial ali dá **uma espécie de graça a todo jogador no minuto zero**, e
a 2ª vaga passa a exigir 9 encontros em vez de 10. É pouco, e é exatamente por
ser pouco que não pode entrar sem alguém decidir: mexer no numerador de uma
escada de progressão sem querer é como se perde o equilíbrio de um jogo.

**As duas leituras são defensáveis**, e é por isso que isto é pergunta e não
tarefa:

```text
CONTA      "a Pokédex é uma só; se a tela diz que eu vi, o teto tem de
           concordar" — e duas contagens com o mesmo nome é o tipo de coisa
           que vira defeito daqui a seis blocos
NÃO CONTA  "a escada mede o que você EXPLOROU, e a inicial foi dada" — quem
           nunca saiu de casa não avançou na Pokédex
```

**Minha recomendação, e é a que eu sigo se ele não responder:** *NÃO conta*, e a
tela passa a dizer isso em uma linha — `"vistas em campo: 2 de 146"` — para as
duas contagens pararem de parecer a mesma coisa com números diferentes. A escada
existe para empurrar o jogador para fora de casa, e uma vaga adiantada no minuto
zero é justamente o oposto.

---

### L-129 — a Pokébola gira, exceto para quem desligou animação no sistema

**Registrada em:** 03/09/2026. **Bloco dono:** 1.24 (o mesmo dos pop-ups).
**Estado:** aberta.

Queixa do dono, 03/09/2026: *"percebi que na pokedex não está com o gif animado
da pokebola que te mandei"*.

Medido no navegador de automação, e o número explica metade da queixa:

```text
.pdxBola  animationName: none
matchMedia('(prefers-reduced-motion: reduce)').matches === true
```

O selo **está** na tela, com a tira de 24 quadros e o `background-size` certo. O
que o desligou foi a nossa própria regra:

```css
@media (prefers-reduced-motion:reduce){.pdxBola{animation:none}}
```

Ela foi escrita com um motivo bom — *o selo carrega informação, e informação não
pode depender de animação* — e continua valendo. O problema é que **"reduzir
movimento" no Windows é uma caixa que muita gente desmarca sem saber**, e o
resultado é uma peça que o dono pediu especificamente e que ele pode nunca ver.

A outra metade da queixa é o D-075, e essa já está corrigida: as espécies dele
que tinham o selo apareciam como `???`, então o selo estava na linha errada.

#### O que o bloco dono decide

```text
1. um quadro PARADO que não seja o quadro 1
   hoje o `animation:none` congela no primeiro quadro da tira, que é a bola
   fechada de frente — o mais parecido com "não é um selo, é um ícone"
2. ou uma animação MÍNIMA que respeite o pedido sem sumir
   um brilho lento no lugar do giro: movimento que não desloca não é o que a
   regra de acessibilidade existe para conter
```

Fica aqui e não vai para o 1.22 porque é decisão de desenho com trilha de
acessibilidade junto, e o 1.22 é um bloco de defeito.

---

### L-130 — a Pokédex abre numa ficha vazia, e a proporção está invertida em 1440

**Registrada em:** 03/09/2026, olhando a captura nova do 1.22.
**Bloco dono:** 1.24. **Estado:** aberta.

Isto não é defeito — nada está quebrado, e nenhum teste tem o que reprovar. É a
segunda metade do Q5, e as três coisas só aparecem para quem abre a imagem.

```text
lista   285 px          ficha   1.100 px      em 1440 de largura
```

#### 1 · A ficha ocupa 75% da tela para mostrar uma silhueta e uma frase

`grid-template-columns: minmax(220px,290px) 1fr`. O `1fr` cresce sem limite, e a
ficha de uma espécie NÃO VISTA tem três linhas de conteúdo — o resto é um
retângulo escuro de 1.100 × 550. A ficha de uma espécie vista preenche melhor,
mas continua sobrando.

**A lista é que devia crescer.** Ela tem 146 linhas e é por onde se navega; a
ficha tem tamanho quase fixo. Hoje a coluna que cresce é a que não precisa.

#### 2 · A Pokédex abre selecionando a `001`, que quase nunca foi vista

Quem abre a aba pela primeira vez vê **uma silhueta e "Ainda não encontrada"**.
A tela se apresenta pelo que o jogador NÃO tem.

Abrir na primeira espécie **vista** mostraria a Pokédex fazendo o que ela faz —
o retrato, os stats, onde mora, a linha de evolução. É uma linha de código e
muda a primeira impressão inteira da tela.

E há um caso de borda que precisa de resposta junto: **quem não viu nada**. Aí a
`001` é a escolha certa, e a frase "Ainda não encontrada" passa a ser exatamente
o que se quer dizer.

#### 3 · Sobra vertical embaixo

`.pdxColuna` tem `max-height: min(62vh, 620px)`. Numa janela de 900 isso deixa
~165 px de painel vazio abaixo da lista. O `62vh` foi escolhido quando a tela
tinha outra coisa embaixo; hoje não tem.

#### Por que fica para o 1.24, e não entra agora

O 1.22 é um bloco de DEFEITO — ele existe porque o jogo do dono parou. Misturar
rearranjo de tela num bloco de correção é o que a regra central deste projeto
proíbe, e é como uma correção de sprites virou troca de fonte de arte na v0.6.1.

---

### L-131 — o treinador é cortado no topo da cena a 420 px

**Registrada em:** 03/09/2026, na captura nova do 1.22. **Bloco dono:** o mesmo
da L-127 (trilha mobile). **Estado:** aberta.

A 420 px o palco cai para a `min-height` de 204 px e o zoom continua em 3×. O
resultado, na imagem: **o treinador é maior que um terço da cena e a cabeça dele
encosta na borda de cima**, ao lado do rótulo do bioma.

```text
1440   palco ~830 × 528   o treinador ocupa ~1/6 da altura
 420   palco  400 × 245   o treinador ocupa ~2/3 e é cortado
```

A causa não é o palco: é o **zoom não acompanhar a caixa**. `niveisAtuais` já é
derivado da largura do palco — o piso existe —, mas o NÍVEL ESCOLHIDO fica onde
o jogador (ou o padrão) deixou. Numa caixa de 400 px, 3× mostra 133 px de mundo.

Fica na trilha paralela por decisão do dono: *"o mobile deve seguir de forma
paralela"*, e *"não desperdice muito tempo e tokens em excesso com isso agora"*.
Registrada para não ser redescoberta.

---

### L-132 — a escada da dex é rala no meio e mesquinha no fim

**Registrada em:** 03/09/2026, **levantada pelo dono** ao ler a L-128.
**Bloco dono:** 1.27. **Estado:** aberta — desenho meu, com passagem obrigatória
pelo estudo de economia.

A pergunta dele era outra e melhor que a minha:

> "é complicado achar todos pokémon então não são todos que vão fazer esse
>  feito, então acho justo manter e a premiação [...] não precisa ser algo
>  desenfreado, mas pode dar uma melhorada sobre a questão do teto atual"

#### O retrato de hoje, medido

```text
vagas simultâneas   1 -> 2 -> 3 -> 4      com 0 · 10 · 25 · 45 espécies
teto diário         30 encontros
                    +1 com 60 · 80 · 100 · 120
                    +2 ao COMPLETAR
                    máximo 36  (+20% sobre a base)
```

**Duas coisas erradas, e ele viu a segunda antes de mim:**

```text
o MEIO É MORTO      quem chega a 45 já tem as quatro vagas, e passa QUINZE
                    espécies (45 -> 60) sem ganhar nada em escada nenhuma
o FIM É MESQUINHO   completar a dex — o feito mais difícil do jogo — vale +2
                    num teto de 30. Seis por cento.
```

#### A curva proposta

```text
espécies    teto    ganho
   —         30     base
  25         32     +2   o primeiro degrau chega CEDO
  50         34     +2
  75         37     +3
 100         40     +3
 125         44     +4
COMPLETO     50     +6   o maior degrau, e o único que DOBRA o passo
```

30 -> 50 é **+67% para quem terminou**, contra +20% hoje, e o degrau final passa
a valer 12% do teto em vez de 6%. A curva sobe o tempo todo em vez de dormir
sessenta espécies e acordar mesquinha.

O último degrau continua sendo o dobro do anterior de propósito — pela mesma
razão que já está escrita no `expedicao.mjs`: *completar não pode render o mesmo
que mais um degrau qualquer, ou o degrau final deixa de ser um fim.*

#### O que NÃO se decide sem medir

> **O teto diário é o que limita a renda de um dia.**

Subir 30 -> 50 sobe o teto de renda diária em 67%, e com o RMT vivo isso tem
dimensão de dinheiro real. A curva passa pelo `POKEARENA_ECONOMY_STUDY` antes de
entrar, e o número que importa é o de **quem terminou a dex** — o jogador com
mais horas é justamente o que mais se aproxima de vender.

Não é decisão do dono; é trabalho do bloco dono, e o dono já disse o que quer:
*melhorar sem ser desenfreado*, mantendo a liberação pela dex.

---

### L-133 — a Poké Ball estava LARANJA — CORRIGIDA no 1.25

**Registrada em:** 03/09/2026, construindo a tira da captura no 1.23.
**Bloco dono:** 1.25. **Estado:** CORRIGIDA em 03/09/2026, por decisao do dono:
*"prefiro a fidelidade de cores, se e vermelho e vermelho e nao laranja"*.

A Poke Ball vermelha estava na **casa 15** o tempo todo, em rgb(236,66,52). O
catalogo apontava para a casa 3, que e uma bola laranja.

A cor da bola na animação é **amostrada do ícone que o jogo já usa**, e não
inventada por mim — é a regra do resgate: *a mesma coisa em outro endereço,
nunca outra coisa*. Medindo, achei isto:

```text
casa 0   Master Ball   roxo
casa 1   Ultra Ball    amarelo/preto     -> catálogo diz `ultra`  ✓
casa 2   Great Ball    azul/vermelho     -> catálogo diz `great`  ✓
casa 3   ???           LARANJA           -> catálogo diz `poke`
```

O histograma da metade de cima da casa 3 não tem vermelho nenhum: a cor cheia é
`rgb(245,144,59)`, laranja de verdade. Três das quatro casas casam com a ordem
clássica (Master, Ultra, Great, Poké), então a casa 3 **é** a que o pack quer —
o que não sabemos é se a folha do acervo tem uma Poké Ball vermelha noutra casa.

#### Por que a animação seguiu o laranja

Porque a alternativa é pior. Palavra do dono, sobre este mesmo bloco:

> "jogar uma Great e ver a animação da Ultra é pior que não ter animação
>  nenhuma — a arte tem de casar com o objeto usado"

A mochila mostra a bola laranja. Uma animação vermelha discordaria da mochila —
o mesmo defeito que ele nomeou, chegando por dentro. **Coerência primeiro; a cor
"certa" é a próxima pergunta.**

#### O que o bloco dono decide

```text
1. procurar na folha (368 ícones) se existe uma Poké Ball vermelha
2. se existir, trocar a casa em `content/itens_v1.mjs` — UM número
3. e regerar a tira: `node tools/folha-captura.mjs`
```

O passo 3 não é opcional: a cor da animação e a cor do ícone saem da **mesma
medição**, e é isso que impede as duas de divergirem.

---

### L-134 — `min-width: 320px` no palco garante rolagem lateral abaixo de 320

**Registrada em:** 03/09/2026, medindo o transbordo durante o 1.23.
**Bloco dono:** o mesmo da L-127 (trilha mobile). **Estado:** aberta.

```text
janela   306 px
doc      335 px   -> barra de rolagem horizontal
causa    #idlePalco { min-width: 320px }
```

Rolagem horizontal é defeito de layout, sempre — e a esteira de captura já o
acusa sozinha (`olhar-telas.mjs` mede `scrollWidth > innerWidth`). Aqui ele não
dispara porque a largura mais estreita capturada é 420.

**Não é urgente**: 306 px é mais estreito que qualquer telefone em uso (o menor
comum é 375). Fica registrado porque a causa é conhecida e a correção é uma
linha — `min-width: min(320px, 100%)` —, e porque descobri-la de novo custaria a
mesma meia hora.

---

### L-135 — os preços da loja ainda não passaram pelo estudo de economia

**Registrada em:** 03/09/2026, construindo a loja no 1.25.
**Bloco dono:** 1.27 (junto da curva da L-132). **Estado:** aberta.

A loja está de pé e as invariantes que importam estão fechadas com teste:
comprar-e-vender dá prejuízo, a recusa é explícita, e o preço sobe com a
raridade. **O que não passou por conta nenhuma são os VALORES.**

```text
FRACAO_DE_VENDA   0,4    a loja paga 40% do preço de compra
VALOR_DA_FAIXA    comum 30 · incomum 75 · raro 190 · muitoRaro 480 · lendario 1200
```

Foram escolhidos para serem conservadores e para a razão entre degraus (~2,5)
acompanhar a queda de peso entre faixas — **não para fechar com a renda de um
dia de farm.**

#### A conta que falta, e ela tem duas pontas

```text
QUANTO ENTRA   o teto diário de encontros limita quantos itens caem por dia.
               A venda herda esse limite e não cria um novo — é o que impede a
               loja de ser uma torneira mesmo com preço errado.
QUANTO SAI     uma Ultra custa 500 e a Vigília rende N raros. Se vender o que
               cai numa Vigília paga três Ultras, a bola deixa de ser decisão.
```

A segunda ponta é a que importa: **a loja não pode tornar a escolha da bola
irrelevante.** Se o farm de um dia paga o estoque de uma semana, a chance de
captura vira um detalhe e a mecânica que o 1.23 acabou de construir perde o
assunto.

Junto da L-132 porque as duas mexem no mesmo número — a renda de um dia.

---

### L-136 — a LOJA POKÉCASH ainda não existe, e o NPC dela já está pronto

**Registrada em:** 03/09/2026. **Bloco dono:** 1.31. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)* **Estado:** aberta.

O vídeo tem os dois NPCs e o corte já é uma variável:

```text
--foco: 100%   a vendedora   -> loja PokéCoin   CONSTRUÍDA no 1.25
--foco:   0%   o homem       -> loja PokéCash   falta a aba
```

**A metade cara já está feita**, e é a estrutura: a `loja-tela.mjs` recebe COMO
ler e COMO salvar, e o `engine/loja.mjs` não sabe qual moeda está em jogo além
do que o pack declara. Uma segunda loja é outra vitrine e outra moeda.

O que ela precisa, e que a PvE não precisou:

```text
o CADEADO     o PokéCash comprado só serve para aposta e cosmético (L-126) —
              a loja tem de saber distinguir os dois baldes
declarada     "em construção", como o dono pediu, até o §25.1 ser cumprido

```

O §25.1 continua sendo o portão: nenhuma feature de valor econômico real entra
sem o checkpoint, e a loja de PokéCash é exatamente isso.

---


> **Conferido em 08/09/2026, por cobrança do dono.** Ele lembrou que o NPC de
> terno já foi enviado, e ele está certo — **o corte também já está resolvido**,
> e isso reduz o 1.31 ao que ele de fato é.
>
> Olhei o vídeo de novo com o `contato-video.mjs`. `assets/npc/lojas.mp4` tem
> 1280×720 e os DOIS NPCs no mesmo quadro:
>
> ```text
> METADE ESQUERDA   o homem de terno, tablet na mão, vitrine limpa com
>                   expositores  ->  a loja de POKÉCASH, cosméticos
> METADE DIREITA    a moça de cabelo colorido, banca de rua em neon,
>                   "GAME COINS! RARE! HUSTLE!"  ->  a loja de POKÉCOIN, PvE
> ```
>
> A técnica da janela do bloco 1.25 já corta as duas SEM RECODIFICAR: caixa em
> 8:9 (640×720) e `object-position` escolhendo a metade.
>
> ```text
> a loja PvE, hoje         --foco: 100%   ->  a moça      ✅ já no ar
> a loja PokéCash          --foco: 0%     ->  o de terno  ← é só isso
> ```
>
> **Então o que falta no 1.31 é só a TELA**, e nem a arte nem o corte nem o
> cadeado. O motor da loja (`engine/loja.mjs`), a moldura, a fala e o som já
> existem e são os mesmos.

### L-137 — a qualidade dos ícones de item, e ela é 34 e não 368

**Registrada em:** 03/09/2026, **pelo dono**. **Bloco dono:** 1.30.
**Estado:** aberta, e o dono a RECOBROU em 08/09/2026 — com razão.

> **Atualizada em 08/09/2026.** Duas coisas mudaram, e nenhuma é o escopo:
>
> 1. **O bloco dono estava divergente.** Esta ficha dizia 1.27 e o ROADMAP
>    dizia 1.30. Duas verdades sobre o mesmo trabalho são o começo de duas
>    filas — fica **1.30**, que é o que o ROADMAP publica.
> 2. **São 34 agora, e não 30.** O bloco A3 acrescentou as quatro poções
>    (Poção, Super, Hiper e Máxima), e elas apontam para as células 17 a 20 da
>    folha antiga. Entram na mesma troca.
>
> E o motivo da pausa fica escrito, porque ele foi decisão e não esquecimento:
> o dono trouxe a mecânica nova do §7.22, e construir os ícones antes dela
> seria construir para telas que iam mudar de forma. **Nada aqui foi
> descartado** — está na Prioridade 1 do ROADMAP, e é um dos dois blocos
> pausados que NÃO dependem do Avanço para entrar.

> "a qualidade das imagens estão horríveis [...] os únicos que estão com
>  qualidade boa são os 7 que mandei ontem [...] eu quero nesse mesmo padrão:
>  ícone do item com qualidade e limpo"

#### O problema é MENOR do que a folha sugere

A folha tem 391 casas. **O jogo usa 40** — o catálogo inteiro. E dez delas já
estão no padrão bom, na 17ª linha, que é a nossa:

```text
catálogo          40 itens
já com arte boa   10   Restos · Faixa Muscular · Orbe da Vida · Ovo da Sorte
                       Lenço da Escolha · Faixa do Foco · Faixa Firme
                       Elo de Ligação · Essência · PokéCoin
faltam            30
```

#### O padrão-alvo está medido

Os que o dono mandou são **PNG de 160×160, ~15 KB cada**, e a esteira que os
compôs na 17ª linha já existe. **O caminho está provado** — o que falta é a ARTE
dos outros trinta.

#### E a cor da Poké Ball é sintoma disto, e não causa

O dono pediu fidelidade: *"se é vermelho é vermelho e não laranja"*. Eu troquei a
casa 3 pela 15 e errei — a 15 é uma bola vermelha INTEIRA, e a Poké Ball é
vermelha, preta e branca. A casa 3 está certa; ela só está renderizada num
vermelho quente que a 32 px lê como laranja.

> **Trocar de casa não conserta arte ruim.** A cor certa vem com o ícone novo.

#### O que o bloco dono faz

```text
1. BUSCAR   arte de 160 px para os trinta, em fontes que o dono autorizou —
            *"você pode pesquisar em DIVERSAS FONTES"*
2. NORMALIZAR  para o padrão dos dez que já estão bons
3. COMPOR   na nossa linha da folha, com a esteira que já existe
4. OLHAR    a 96 px, que é o tamanho em que o jogador vê — e não a 32,
            onde a diferença entre laranja e vermelho não cabe
```

---

### L-138 — a ESSÊNCIA é 53% de tudo que cai e não tem uso nenhum

**Registrada em:** 03/09/2026, **pelo dono**. **Bloco dono:** 1.29. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)*
**Estado:** aberta. **Prioridade alta — é o maior buraco de economia aberto.**

> "hoje as essências já dropam beleza, mas onde é feita a troca? [...] afinal
>  hoje se dropam as essências mas até momento sem uso"

#### O número dá o tamanho do buraco

Medido em 20.000 Vigílias, com `tools/medir-drops.mjs`:

```text
Essência   52,85% de tudo que cai   ·   9,2 por Vigília
```

**Metade de tudo que o jogo entrega não serve para nada.** Não é um item
esquecido: é a maior torneira do jogo despejando em terra.

#### O desenho que o dono propôs, e ele é bom

Uma terceira aba na loja PvE, depois de Comprar e Vender:

```text
HELD ITEMS DALI   mostra o que cai naquele bioma — a aba vira mapa da rota
PACOTE de bolas   estilos de bola por essência
PACOTE MAIOR      de essência, para quem acumulou muito
BÔNUS DE XP       de farm no idle, por expedição (batida · trilha · vigília)
FRAGMENTOS        7 partes viram um held item
```

**O quinto é o melhor**, e vale dizer por quê: um held item comprado direto
tornaria a expedição desnecessária. Sete partes fazem a essência virar
**progresso visível** sem tirar o motivo de sair a campo — e dão à essência
exatamente o papel que falta a ela, que é o de moeda de paciência.

#### O nome das partes

O dono sugeriu `fragheld` e pediu um nome. **Recomendo "Estilhaço"** — e a
recomendação tem motivo:

```text
fragmento   JA E USADO pelo registro de espécies (o fragmento de Pokédex).
            Dois "fragmentos" diferentes na mesma tela é o jogador aprendendo
            que a palavra não quer dizer nada.
fragheld    mistura português com inglês num jogo que fala português, e não
            se lê em voz alta
estilhaço   é pedaço de uma coisa quebrada, cabe em qualquer item, e não
            colide com nada que já existe
```

Sete Estilhaços do Lodo Negro viram um Lodo Negro. O nome do item aparece na
parte, então o jogador sabe o que está juntando.

#### O que precisa ser decidido antes de construir

```text
QUANTAS essências por estilhaço, e por faixa do item
o estilhaço é SORTEADO — decisão do dono, 03/09/2026. Escolher tiraria a
   frustração; sortear mantém a paciência como custo real, e é o que faz sete
   partes valerem alguma coisa. O nome é ESTILHAÇO, também decidido por ele.
o BÔNUS DE XP não pode virar pay-to-win: essência é farmada, e não comprada,
   então ele passa pelo §P5 sem problema — mas o TAMANHO dele é economia
```

Junto da L-132 e da L-135: as três mexem na mesma coisa, que é a renda de um
dia de farm.

---

### L-139 — 21 dos 40 itens da wiki têm porta que ainda não existe

**Registrada em:** 03/09/2026, medindo os drops. **Bloco dono:** 1.29. *(bloco realinhado ao ROADMAP em 08/09/2026 — ver T8)*
**Estado:** aberta.

Pergunta do dono: *"esses itens realmente estão com chance de drop?"*. Medido em
20.000 Vigílias, a resposta é sim — **para dezenove deles**:

```text
porta 'drop'    19 itens   TODOS caindo, zero nunca-caiu
porta 'loja'     5 itens   à venda; três deles também caem
porta 'troca'   10 itens   a troca NÃO EXISTE ainda
porta 'bau'      6 itens   o baú NÃO EXISTE ainda
```

**Dezesseis itens aparecem na wiki como obteníveis por uma porta que o jogo não
tem.** Não é um defeito de código — é uma promessa que a tela faz e o jogo não
cumpre, e ela é da mesma família do D-067.

#### O que fazer, e é decisão de desenho

```text
MARCAR      a wiki diz "em breve" nos itens de porta ainda fechada — honesto,
            e transforma a lista num mapa do que vem
ou ABRIR    a troca é justamente a L-138 (essência), e o baú é do bloco de
            recompensas
```

A troca já tem dono: a aba de essência da L-138 **é** a porta `troca`. Fechando
a L-138, dez dos dezesseis deixam de ser promessa vazia.

---

### L-140 — mandar DOIS no mesmo bioma custa o dobro e rende igual

**Registrada em:** 03/09/2026, **cobrada pelo dono**, e medida no motor.
**Bloco dono:** 1.27. **Estado:** aberta.

> "SE POR ACASO o jogador querer mandar 2 pokémon pro mesmo bioma, teoricamente
>  é para ele farmar mais ali, essa distribuição de farm a + precisa ser feito e
>  equilibrado por você"

#### O que existe, e o que não existe

As **vagas simultâneas** funcionam: 1 → 4, liberadas com 0/10/25/45 espécies na
dex. Mandar um para a Caverna e outro para a Floresta ao mesmo tempo já é
possível hoje.

O que não existe é o outro caso. Medido:

```text
custo        custoDe(perfil, equipe.length)   ×2, ×3   ESCALA
encontros    do PERFIL, não da equipe          igual   NÃO escala
itens        do PERFIL, não da equipe          igual   NÃO escala
XP           cada uma recebe o total           ×2, ×3  escala
```

> **Botar dois no mesmo bioma custa o dobro de stamina e traz exatamente os
> mesmos itens.** O único ganho é nivelar duas de uma vez — e isso é o oposto
> do que o pedido descreve.

#### A curva proposta, e por que ela NÃO é linear

```text
1 criatura    ×1,00 encontros e itens
2 criaturas   ×1,55
3 criaturas   ×2,00
```

**Com ×2 exato, concentrar seria idêntico a espalhar** — mandar três num bioma
daria o mesmo que mandar um em três —, e aí a escolha de rota, que é a mecânica
inteira do idle, deixaria de existir.

Com retorno decrescente as duas estratégias valem e são DIFERENTES:

```text
CONCENTRAR   mais itens do MESMO lugar — quem caça uma pedra específica
ESPALHAR     variedade de pedras — quem está montando linhas evolutivas
```

O dono foi explícito sobre o critério: *"o jogador precisa sentir a recompensa,
claro, mas não pode ser nada surreal e quebrado"*. Decrescente é o que dá
sensação sem quebrar.

#### O que precisa ser conferido junto

```text
o TETO diário reserva pelo MÁXIMO do perfil — com o multiplicador, ele precisa
  reservar pelo máximo VEZES a curva, ou o teto vira furo
a STAMINA já escala; o item é que não. Escalar os dois mantém a decisão
```

---

### L-141 — o QUADRO DE LOG da expedição, e ele já foi pedido duas vezes

**Registrada em:** 03/09/2026. **Bloco dono:** 1.28 → **absorvido pelo A4**.
**Estado:** aberta na tela, **e a base dela já está construída**.

> **08/09/2026, bloco A4a — a metade difícil desta ficha foi resolvida sem que
> ela fosse o escopo.** `avancarRun` devolve, junto com a run avançada, a lista
> do que aconteceu desde a última consulta. Quem está olhando recebe essa lista
> a cada segundo; quem voltou depois de oito horas recebe a mesma lista de uma
> vez.
>
> É por isso que o quadro ao vivo e o relatório de volta **são uma peça só, e
> não duas que precisam concordar** — a frase do dono sobre o 1.28 (*"está
> incluso no novo layout"*) estava certa, e agora ela tem código embaixo.
>
> O que falta desta ficha é o DESENHO: os ícones, as quantias, a linha por
> expedição guardada. Isso é o A4b.

> "um quadro na aba do IDLE informando o seu histórico de expedição, quem
>  enfrentou, o que farmou, quanto de XP farmou, quanto tempo, quais itens,
>  precisa ser um quadro com informações completas de forma resumida com seus
>  respectivos ícones e quantias"

#### O que existe hoje, e é pouco

`pintarSaque` escreve *"A expedição voltou"*, uma linha sobre treinadores e os
ícones dos encontros. Comparado ao pedido:

```text
quem enfrentou (NPC)        ~  uma linha de texto, sem ícone
quantas batalhas selvagens  X
o que dropou, com QUANTIA   ~  ícone sim, quantidade não
quanto de XP                X
quanto de dinheiro          X
quanto tempo durou          X
HISTÓRICO de expedições     X  — só a última, e ela some na próxima
```

#### O que o bloco dono entrega

```text
UMA LINHA POR EXPEDIÇÃO, guardada — o histórico é o que transforma o idle numa
  narrativa em vez de um contador. Quem volta depois de oito horas quer saber
  o que ACONTECEU, e não só o que sobrou.
ÍCONES de item E de criatura, com a quantia ao lado
XP, moeda, tempo e bioma na mesma linha
ABERTA a linha mostra o detalhe: cada encontro, cada batalha, cada drop
```

E o critério do dono para o painel: *"esse quadro precisa ser bem feito e bem
explicado"*. Ele é a única prova que o jogador tem de que as oito horas
renderam alguma coisa.

#### Por que ele vale mais que parece

O idle é a tela que fica aberta por horas sem interação. **O log é o único lugar
onde ela conta uma história** — e sem ele, voltar de uma Vigília é ler um saldo
que mudou sozinho.


---

### L-142 — o AVANÇO: as três decisões que o dono ainda precisa tomar

**Registrada em:** 04/09/2026. **Bloco dono:** A1 a A7 (Spec §7.22).
**Estado:** aberta, e ela BLOQUEIA o arranjo da tela.

O desenho inteiro está no **§7.22** da Spec e foi aprovado por mim com um
"sim" — a análise, os números e a aritmética do teto estão lá. O que sobra são
três coisas que eu não posso decidir sem inventar:

#### 1. O layout — ✅ **as capturas chegaram em 07/09/2026**

Três prints do Baiak Idle e um vídeo de 87 s. A prévia que saiu deles está em
`app/previa-avanco.html`, com as três vistas, e as capturas em
`.telas/previa-avanco/`. **O que falta agora é o veredito do dono sobre ela.**

#### 1. (o texto original)

> "o layout também tá bem confuso, eu depois irei mandar alguns prints de
>  basicamente como eu penso"

Nada de arranjo entra antes disso. É a mesma regra do cenário do idle: eu já
entreguei o mínimo três vezes nessa tela e as três o dono pegou olhando.

#### 2. As referências — 🟡 **parcialmente resolvido**

O **Baiak Idle** eu vi: três prints e um vídeo. O que o vídeo dá é densidade,
continuidade e câmera parada; **número nenhum é legível nele** (800×480, monitor
filmado por celular), e os prints é que carregam as mecânicas.

O **TBH / Task Hero Bar** continua sem referência. Ele foi citado como alvo de
mecânica e eu não o conheço — se ele importar, precisa de print.

#### 2. (o texto original)

**Baiak Idle** e **TBH / Task Hero Bar** foram citadas como alvo de mecânica.
Eu não as conheço com confiança suficiente para desenhar a partir delas, e
desenhar de memória seria a versão de sempre do erro:

> "conheço o padrão" é eu construindo de memória e pedindo correção;
> "vi a referência" é eu construindo o que ele mandou.

As capturas do dono são a fonte. Até elas chegarem, o §7.22 é **o desenho que
eu deduzi do que ele descreveu**, e não uma leitura das referências.

#### 3. O chefe é fixo ou sorteado — ✅ **DECIDIDO em 07/09/2026**

> **Palavra do dono:** *"irei seguir sua recomendação: fixo na wave 10, com o
> PAR sorteado quando houver mais de dois"*.

Fica como recomendado, e o resto desta ficha é o registro do porquê.

#### 3. (o texto original da decisão)

O dono descreveu os chefes como surgindo *"de forma RNG"*. O §7.22 os colocou
fixos na wave 10, e as duas leituras dão jogos diferentes:

```text
FIXO na wave 10       a run tem um clímax previsível — o jogador sabe para o
                      que está guardando a poção
SORTEADO entre pares  a wave 10 é uma surpresa, e a mesma floresta rende runs
                      diferentes — mas a preparação vira sorte
PODE APARECER ANTES   tensão constante, e o risco de a run acabar na wave 3
                      por azar puro, que é a forma mais cruel de um idle punir
```

**Minha recomendação, e ela é o padrão se ele não disser nada:** fixo na wave
10, com o PAR sorteado quando o estágio tem mais de dois chefes possíveis. Dá a
surpresa sem tirar do jogador a capacidade de se preparar — e preparação é o
que o §8.1 chama de "onde se aprende a ler o motor".

#### O que NÃO está aberto, e já foi decidido no §7.22

```text
mob ≠ encontro           a separação das três unidades é o que salva o teto
o chefe é a EVOLUÇÃO     sai do pack, e não de tabela escrita à mão
falhar custa o BAÚ       nunca o farm — regra herdada do 1.7b
os dois modos dividem    o teto de encontros não muda, e não ganha irmão
```

---

### L-143 — o VULCÃO não tem gente para quatro estágios

**Registrada em:** 08/09/2026. **Bloco dono:** A1 (construído) e o próximo passe
de conteúdo. **Estado:** aberta, e ela é de CONTEÚDO, não de código.

#### O que a medição mostrou

Quatro estágios pedem **vinte e quatro vagas de elenco** por bioma — 4 comuns +
2 chefes, quatro vezes. O `estagiosDoBioma` mede quantos o bioma sustenta com
elencos distintos:

```text
floresta praia campo montanha gelo deserto oasis ruina estufa ferrovelho   4
vulcao                                                                     1
```

Dez de onze passam. O vulcão tem **catorze espécies** e — o que decide — **zero
na faixa "raro"**. As faixas do estágio 2 (comum · incomum · raro) acabam sendo
exatamente as do estágio 1, então não existe recorte que produza elenco novo
sem quebrar a faixa que a prévia promete ao jogador.

#### Por que eu NÃO contornei

Havia duas saídas fáceis, e as duas custavam mais do que resolviam:

```text
abrir a FAIXA        um lendário guardou o estágio 2 num teste. Quebra a
                     promessa da prévia E o §8.12 (lendário não é conteúdo de
                     rotina) de uma vez só
abrir o BIOMA        um "comum" entrou no estágio 4, que só aceita as duas
                     faixas mais raras
```

> A faixa não é preferência interna: é o que a tela do estágio PROMETE antes de
> o jogador gastar as horas. Quebrá-la para caber é fazer a prévia mentir com
> números corretos.

#### O que fica, e o que precisa de decisão do dono

O motor **sabe dizer** até onde cada bioma vai — `estagiosDoBioma` — e há teste
que trava o número em 1 para o vulcão, com a data. Se alguém acrescentar
espécies e ele melhorar, a suíte reprova e pede que o número seja reescrito.

O que falta é o que a TELA faz com isso, e são dois caminhos:

```text
MOSTRAR O FUNDO REAL   o vulcão exibe 1 estágio em vez de 4 travados. Honesto,
                       e o jogador não tenta abrir porta que não leva a lugar
                       novo. Custa: o mapa fica desigual.
ENCHER O BIOMA         acrescentar espécies de faixa "raro" ao vulcão no
                       próximo passe de conteúdo. Custa: conteúdo.
```

**Minha recomendação, e é o padrão se ele não disser nada:** as duas, nessa
ordem. Mostrar o fundo real agora, porque é barato e verdadeiro; encher o bioma
depois, porque é a correção de verdade — um bioma inteiro com um estágio só é
pobre para uma tela que o jogador olha por horas.

---

### L-144 — o LABORATÓRIO: conversado, e sem bloco

**Registrada em:** 08/09/2026, **por conferência do dono**. **Bloco dono:** a
definir. **Estado:** aberta, e ela é de ESCOPO — não de descoberta.

#### A minha frase estava errada, e a correção é dele

Eu escrevi que o laboratório "não existe em bloco nenhum" e que ele estava
*perdido*. O dono corrigiu:

> "impossível, conversamos já sobre [...] acho que você só se passou pois já
>  conversamos por alto"

**Ele está certo, e a distinção que eu não fiz é esta:**

```text
CONVERSADO   sim — e há rastro escrito: o PARECER_MOEDAS_E_MERCADO cita
             "laboratório, boost B1..B7" em duas listas
EM BLOCO     não — sem escopo, sem portões, sem sabotagem, sem linha no ROADMAP
```

> Chamar de "perdido" o que foi conversado e deixou rastro é a coisa errada a
> dizer. O que faltava era ele ter LUGAR NA FILA — e isso é o que esta ficha
> conserta.

#### O que o dono descreveu, e agora está escrito

```text
O QUE CUSTA   o LUCRO DE PokéCash DA ARENA, junto com as STONES
O QUE FAZ     boost geral nos stats — "aumenta um pouco de tudo"
A ESCADA      B1 a B7; quanto mais alto, mais forte
O CRITÉRIO    "sem abusar, nem deixar muito OP, mas o jogador precisa sentir
               a eficácia — de fato sentir o bicho mais forte"
```

#### E ele JÁ ESTÁ PROTEGIDO pelo §P5, sem nada novo

Esta é a parte que vale registrar, porque não era óbvia: o custo ser **PokéCash
da arena** o torna compatível com o §P5 de graça — e por causa de um bloco que
já foi construído.

O **cadeado do 1.26** separa o PokéCash em baldes por proveniência:

```text
GANHO jogando    livre, inclusive para PODER
COMPRADO         aposta e cosmético — TRANCADO para poder
```

Boost pago com lucro de arena é poder comprado com tempo e leitura, que é
exatamente o que o produto quer premiar. Boost pago com PokéCash comprado seria
pay-to-win — e a porta já está fechada, sem uma linha nova.

> O cadeado foi construído em 1.26 sem que esta feature existisse no papel, e
> ela chegou encaixando. É o sinal de que a regra estava no eixo certo.

#### Por que ele importa agora, e não depois

O A3 acabou de fixar que a stamina e a poção **não mexem em stats**, e a razão
escrita foi *"stats são do laboratório"*. Uma decisão que aponta para um lugar
que não existe é uma decisão sem endereço.

E o mesmo vale para o TRAINER AUSENTE (A7): ele não pode treinar stats, e o
motivo é o mesmo. Duas peças já dependem desta.

#### O que falta, e é do dono

```text
O QUE É       B1..B7 são o quê? Faixas de boost? Andares? Slots de melhoria?
              A única fonte é uma lista solta no PARECER.
O QUE ELE UPA stats, e mais o quê? Só a criatura, ou o treinador também?
O QUE CUSTA   moeda de jogo, essência, tempo? A resposta muda o §P5 inteiro:
              boost comprável com dinheiro real é a linha que não se cruza.
QUANDO        depende da Fase — o §7 (coleção) ou o §8 (time e jornada)?
```

**Minha recomendação:** ele NÃO entra na trilha A. O Avanço é uma mecânica de
sessão; o laboratório é de progressão de longo prazo, e misturar os dois faria
o bloco A crescer sem fim.

Ele ganha bloco próprio — **B1** — quando o dono fechar a curva: quanto cada
degrau de B1..B7 custa em PokéCash e em stones, e quanto ele soma nos stats.
O critério dele já está escrito e é o que a medição vai perseguir: *sentir o
bicho mais forte, sem ficar OP*.

E as duas decisões do A3 e do A7 que apontam para cá continuam válidas — o que
elas dizem é *"stats não são aqui"*, e isso é verdade agora que o "lá" tem
endereço.

---

### L-145 — o VÍNCULO é uma barra invisível que agora decide combate

**Registrada em:** 08/09/2026, **por pergunta do dono**. **Bloco dono:** A4 (a
tela) e 1.27 (a escada). **Estado:** aberta, e ela ficou URGENTE hoje.

O dono perguntou três coisas, e as três respostas são desconfortáveis:

> "atualmente esse vínculo é mostrado ao treinador onde? Como ele upa esse
>  vínculo além do trainer off? Ele ganha mais alguma coisa além de conseguir
>  evoluir alguns pokémon com vínculo?"

#### 1. Onde ele aparece: em lugar nenhum

Conferido no código. `vinculo` aparece na tela **duas vezes**, e as duas são a
EXIGÊNCIA, nunca o valor:

```text
pokedex-dados.mjs:102   "vínculo 220"   — o que a evolução PEDE
evolucao-idle.mjs:83    "vínculo 220"   — idem

o valor da SUA criatura                 — não aparece em lugar nenhum
```

> O jogador tem uma barra que sobe sozinha, decide combate, e que ele não pode
> olhar. É a moldura vazia da L-099 pelo avesso: lá o número aparecia e não
> andava; aqui ele anda e não aparece.

#### 2. Como ele sobe: por TEMPO de expedição, e agora por treino

```text
vinculoDaExpedicao   1 ponto + 1 a cada 2 h    (Vigília de 8 h = 5 pontos)
treino ausente       1 ponto por hora           (bloco A7, hoje)
teto                 255 — ~51 Vigílias para encher
```

E ele **não conta encontros de propósito**: se contasse, viraria um segundo XP,
e duas barras que sobem juntas são uma barra com duas cores.

#### 3. O que ele dá hoje — e a resposta mudou ONTEM

```text
EVOLUÇÃO    a condição EXISTE e funciona (`engine/evolucao.mjs`), e o pack de
            Kanto tem ZERO evoluções que a usam
COMBATE     desde o bloco A2, até +25% de poder no Avanço
```

**Esta é a parte grave.** Eu liguei o vínculo ao poder de combate e não notei que
ele é invisível. O jogador entra numa wave com até 25% a mais de força e não tem
como saber por quê.

#### E o dono levantou uma dúvida sobre esse zero — vale a conferência

> "você está errado com isso, lembra que implementamos para aplicar nos pokémon
>  que só evoluem por troca ou outros meios? Por isso colocamos o vínculo logo,
>  e foi sugestão sua"

**Ele está certo sobre o PROBLEMA e sobre ele ter sido resolvido. A solução foi
outra**, e a diferença importa porque as duas coisas ficaram parecidas na
memória. Conferido no pack, com as 72 evoluções na mão:

```text
as chaves de exigência que o pack USA:   nivel · item      (só estas duas)

Machoke  -> Machamp     exige: { item: "elo" }
Kadabra  -> Alakazam    exige: { item: "elo" }
Graveler -> Golem       exige: { item: "elo" }
Haunter  -> Gengar      exige: { item: "elo" }
```

**A evolução por troca foi resolvida com o ELO DE LIGAÇÃO** — o item `elo`,
muitoRaro, que cai de expedição. Não com vínculo. As quatro linhas de troca do
material de origem estão cobertas, e o exemplo que ele mandou é uma delas.

#### Então por que o vínculo existe, se nada o usa?

Porque ele foi construído para as evoluções por AFINIDADE, e **Kanto não tem
nenhuma**. As da série — Golbat, Chansey, Eevee para as formas do dia e da noite
— são todas da geração seguinte. O `nivel-criatura.mjs` já diz isso, escrito no
bloco 1.14:

> "no dia em que a Gen 2 entrar, `exige: { vinculo: 220 }` já tem por onde
> acontecer"

**Está tudo coerente.** O que não está é ele decidir combate hoje sem aparecer.

#### ✅ DECIDIDO PELO DONO em 08/09/2026

> "mantemos o elo de ligação como está e deixa registrado questão do vínculo,
>  FUTURAMENTE ao aplicarmos a 2ª GEN você já vai estar com ele pronto. Registre
>  isso sobre o combate e veja melhor maneira de corrigir, não pode ser nada
>  absurdo nem surreal, mas óbvio que o jogador sinta a melhora."

```text
O ELO      fica como está. As quatro linhas de troca continuam resolvidas por
           item, e nada muda.
O VÍNCULO  fica PRONTO e ADORMECIDO. Quando a Gen 2 entrar, as evoluções por
           afinidade escrevem `exige: { vinculo: N }` e ele já funciona.
O COMBATE  o efeito FICA — mas tem de aparecer, e tem de ser sentido sem ser
           absurdo. É o que esta ficha resolve abaixo.
```

#### O que eu vou fazer com o combate, e o número

O efeito hoje é **até +25%**, e ele some sozinho porque o jogador não vê a
barra. As duas metades do pedido dele — *"sinta a melhora"* e *"nada absurdo"* —
são exatamente os dois lados de uma faixa, então a decisão é uma faixa:

```text
O TETO fica em +25%      é sensível e não decide sozinho: o nível dá 2,4x na
                         escada inteira, e o vínculo dá 1,25x no máximo
                         — ou seja, ele TEMPERA, e não substitui
A CURVA passa a ser      hoje é linear em 255, e linear num teto de 255 quer
CEDO E DEPOIS DEVAGAR    dizer que os 50 primeiros pontos não fazem nada.
                         Quem acabou de capturar não sente NADA, e é justamente
                         quem precisa sentir.
```

> Um bônus que só aparece depois de cinquenta Vigílias não é um bônus que o
> jogador *sente*: é um que ele lê num changelog.

**A forma:** raiz em vez de reta. Metade do bônus chega em ~1/4 do caminho, e o
resto se arrasta até o teto — é a curva que dá sensação cedo sem tirar motivo
para continuar.

```text
vínculo    0     25     64    128    255
linear   +0%   +2%    +6%   +13%   +25%     ← hoje: os primeiros dias são nada
raiz     +0%   +8%   +13%   +18%   +25%     ← proposta: o primeiro dia já paga
```

**E ele passa a APARECER**, que é a metade que falta e a mais urgente:

```text
NA EQUIPE      a barra, o número e o bônus atual em % — do lado do HP e da
               stamina, que é onde o jogador já olha
NA POKÉDEX     o valor da criatura ao lado da exigência, quando houver
NA PRIMEIRA    uma linha de explicação: o que é, como sobe, e o que dá
VEZ            — o §7.22 tem "como funciona" no 1.34, e ele é o dono disto
```

**Bloco dono:** **A4** para mostrar, e **A2** para a curva. As duas entram
juntas — mostrar um número que está prestes a mudar de forma seria ensinar o
jogador uma coisa errada.

#### E a decisão que eu tinha escrito continua de pé, com o prazo do dono

Eu tinha escrito que tiraria o `POR_VINCULO` se ele continuasse invisível ao
fim do A4. **Isso não vai ser preciso** — o dono acabou de mandar mostrar. A
frase fica registrada porque ela era o certo antes da decisão dele, e porque a
regra que a produziu continua valendo:

> Um número oculto que decide combate é pior que um número que não faz nada.


---

### L-146 — as decisões do dono sobre o modo ausente, 08/09/2026

**Registrada em:** 08/09/2026. **Bloco dono:** A7 (motor, FEITO) e A4 (tela).
**Estado:** metade construída.

#### O que ele decidiu, e o que já está de pé

```text
✅ a HUNT OFF rende um pouco MENOS      FATOR_AUSENTE = 0,9 em XP e moeda
                                        (nos encontros não — ver a ficha)
✅ funciona com stamina zerada          passou a custar RESERVA (§7.22.13)
✅ HUNT OFF e TRAINER OFF são coisas    dois modos, e o treino não dá encontro
   diferentes                           nem item (§7.22.14)
⏳ na MESMA ABA, e o jogador escolhe    é tela — A4
⏳ ao escolher, a conta DESLOGA         é tela — A4
⏳ ao logar, um POP-UP com o tempo,     é tela — A4, e reaproveita o quadro de
   a barra de progresso e o %           log (L-141)
```

> **A frase dele sobre o log muda a ordem do 1.28:** *"isso com novo formato do
> novo idle, acredito que não haverá necessidade pois está incluso no novo
> layout"*. Ele tem razão — o quadro de log e o pop-up de volta são a MESMA
> peça vista de dois lugares, e construir os dois seria construir duas.
>
> **O 1.28 não morre: ele é absorvido pelo A4.** A L-141 continua sendo a
> especificação do que o quadro tem de mostrar; o que muda é onde ele nasce.

#### O que ainda é dele

```text
1.30  SEGURAR — ele vai mandar os ícones um a um, e eu substituo item a item
1.31  "está pronto, só falta aplicar?" — resposta na ficha da L-136: o CADEADO
      e o VÍDEO do NPC estão prontos; a TELA da loja não existe ainda
```

---

### L-147 — O BANNER É A IDENTIDADE DO JOGADOR, e ele é indispensável

**Registrada em:** 08/09/2026, **pelo dono, ao aprovar o layout do A4**.
**Bloco dono:** A4, e **toda tela daqui em diante**. **Estado:** aberta.

> "ali somente um detalhe: veja melhor local de aplicação para o banner, ele é
>  indispensável sair, o banner é a identidade do jogador, **registre e armazene
>  isso pra não esquecer mais**"

#### Isto não é um item de lista. É uma REGRA de tela.

A frase dele tem duas metades, e a segunda é a que importa: *"registre e
armazene isso pra não esquecer mais"*. Ele não está pedindo o banner nesta tela
— está dizendo que ele some das minhas telas, e que isso pare.

**E ele tem razão, com histórico.** O banner já custou dois blocos da trilha R:

```text
R3    "o banner de batalha sai do perfil e vai para a rodada"
R10   "uma arte de banner, três enquadramentos"
```

Construído duas vezes, e eu desenhei a prévia do Avanço inteira sem ele.

> Uma peça que carrega IDENTIDADE não é decoração da tela em que aparece. É a
> assinatura do jogador em todas elas — e a única forma de ela não sumir é
> alguém perguntar "onde está o banner?" antes de fechar qualquer arranjo.

#### A regra, e ela vale para o que vier

```text
TODA TELA que o jogador habita mostra o banner dele.
        A Arena já mostra. O Avanço tem de mostrar. A loja, o registro e o
        que vier depois entram por esta porta.

NÃO É UM CANTO SOBRANDO. O lugar é decisão de desenho, e o critério é o de
        sempre: ele tem de parecer que pertence àquele lugar, e não colado.
```

#### O que o A4 faz com ele

O arranjo aprovado tem três colunas. Onde o banner cabe **sem roubar a cena** —
que é a tela olhada por horas — é a minha decisão de desenho, e a recomendação
fica escrita antes de construir:

```text
NO TOPO DA COLUNA DA EQUIPE, à direita, acima dos slots.
```

O motivo: é a coluna que já responde *"quem sou eu nesta run"* — a equipe, as
vagas, a bolsa. O banner é a mesma pergunta um nível acima. E ali ele não
disputa espaço com o bioma nem empurra a barra de ação para baixo da dobra, que
é o defeito que o passo OLHAR pegou a 1920.

**Alternativa se o dono preferir:** faixa fina no topo da tela inteira, acima do
menu. Mais visível, e custa altura da cena — que é o recurso mais escasso desta
tela específica.

---

### L-148 — a LOJA DE POKÉCASH: as abas, e o inventário do que já é cosmético

**Registrada em:** 08/09/2026, **pelo dono**. **Bloco dono:** 1.31.
**Estado:** aberta, e o escopo agora está fechado.

> "no momento oportuno da criação da loja de PokéCash você fará a inclusão
>  somente do homem de terno, e vai criar as abas da loja, outfits, banners,
>  avatar, efeito de nome etc. **FILTRE tudo que temos hoje de cosmético** e
>  você vai adicionar a essa loja"

#### O inventário, contado agora e não estimado

```text
OUTFITS          9    outfit-acervo.mjs · e já tem procedência declarada:
                      padrao · loja · fragmento · missao · npc
BANNER  cenas   34    banner-dados.mjs (BN_CENAS)
        molduras 18   BN_MOLDURAS
        efeitos  12   BN_EFEITOS
AVATARES        16    avatares-dados.mjs (TRAINER_AVATARS)
ARTE    avatares  7   artes-dados.mjs — arte nossa
        banners  14
ARENAS           5    arenas-dados.mjs — a pintura da arena
SKIN SHINY       —    shiny-dados.mjs, por vagas de nível

                115 peças cosméticas já construídas
```

**Cento e quinze.** A loja não precisa de arte nova para abrir — precisa de
vitrine.

#### E o `outfit-acervo.mjs` já tem a peça que a loja pede

`PROCEDENCIAS` distingue `padrao · loja · fragmento · missao · npc`. **A porta
"loja" já existe no dado**, e é exatamente o filtro que o dono pediu. O que
falta é o mesmo campo nas outras quatro famílias — banner, avatar, arena e
skin —, e ele deve ser copiado dali em vez de inventado.

> Uma segunda forma de dizer "isto se compra" seria a sexta ocorrência do
> padrão que este projeto mais paga: duas verdades sobre a mesma coisa.

#### As abas

```text
LOJA        o balcão geral — o que a moeda compra hoje
OUTFITS     o guarda-roupa · a tela já existe (outfit-tela.mjs)
BANNERS     cenas, molduras e efeitos — 64 peças
AVATAR      16 + 7 de arte nossa
EFEITO DE NOME   ← NÃO EXISTE AINDA. É a única família nova da lista dele.
```

**O efeito de nome é o único que precisa ser construído do zero.** Os outros
quatro são vitrine para o que já está no disco.

#### O NPC já está resolvido

Ver a **L-136**: `assets/npc/lojas.mp4` tem os dois no mesmo quadro, e a técnica
da janela do 1.25 corta sem recodificar. O de terno é `--foco: 0%`.

#### Ordem

O dono deixou explícito que a ordem é minha, e ela está no ROADMAP: **depois do
novo idle**. Esta ficha existe para o escopo não ser redescoberto quando a vez
chegar.

---

### L-149 — a CAIXA precisa estar no layout novo

**Registrada em:** 08/09/2026, **pelo dono**, ao aprovar o arranjo do A4.
**Bloco dono:** A4. **Estado:** aberta.

> "outra coisa que não pode faltar é nossa box, caixa, o depot de substituição
>  dos pokémon, precisa estar inserida no novo layout"

A caixa existe desde o bloco **1.6** — *"a captura ao vivo, a equipe de seis e a
caixa"*. Ela é onde a criatura vai quando a equipe está cheia, e é de onde sai a
substituição.

**E ela é indispensável no Avanço por um motivo que o próprio desenho criou:**

> O idle inteiro se apoia em *"o teto do farm é o tamanho da coleção"*, e a
> stamina obriga a rodar criaturas. Trocar quem sai é uma decisão que o jogador
> vai tomar **várias vezes por dia** — e hoje ela mora noutra tela.

Uma decisão frequente que exige sair da tela é uma decisão que o jogador deixa
de tomar. Ele mantém a mesma equipe cansada e o modo perde o eixo.

#### Onde, e é decisão de desenho

Recomendação escrita antes de construir: **na coluna da equipe, como uma gaveta
que abre no lugar dela** — não como uma quinta coluna nem como outra aba. O
gesto é "trocar quem está aqui", e ele deve acontecer onde "quem está aqui" é
mostrado.

---

### L-150 — a run acontece na tela e ainda não PAGA nada

**Registrada em:** 08/09/2026, por mim, ao fechar o A4b.
**Bloco dono:** A4c. **Estado:** aberta, e é uma lacuna DECLARADA — não um
esquecimento.

Ao fim do A4b a run inteira acontece: as dez waves, a queda, o recuo, o log, a
cena. O que ela ainda não faz é **cobrar e pagar**:

```text
NÃO COBRA   a stamina das waves alcançadas (`staminaAteWave`, já construída)
NÃO PAGA    XP, moeda, os drops, e o baú do estágio (`premioDo`, já construído)
NÃO ABRE    o estágio seguinte quando limpa
NÃO CREDITA os encontros no teto do dia — a reserva sai, e nada entra
```

#### Por que ela foi deixada aberta de propósito

Porque pagamento é ECONOMIA, e economia não se constrói junto com layout. As
três coisas que faltam têm de passar pelo estudo — quanto vale um abate, quanto
vale limpar, e como isso se compara ao que a expedição paga hoje. Amarrar
números no mesmo commit da tela seria escolher a economia pelo que coube na
pressa.

E há uma consequência boa: **a tela pôde ser olhada sem que um número errado
fosse gravado no save de ninguém.**

#### O que ela NÃO deixa quebrado

```text
o teto      a run RESERVA ao começar, e a reserva some quando ela termina.
            Nada vaza; o que falta é o crédito do que de fato apareceu
a stamina   a guarda exige os 23 ANTES de começar, então ninguém avança de
            graça — o que falta é o desconto no fim
```

#### O que a destrava

O A4c, e ele já tem tudo de que precisa no motor: `premioDo` (A3/A5),
`staminaAteWave` (A3), `colherAvanco` (A5), e o saque da expedição como forma
pronta. Falta a decisão de **quanto**, e ela vai junto com a L-135 (os preços
que nunca passaram pelo estudo).

#### A recomendação, escrita ANTES de construir

Regra do `CLAUDE.md`: recomendação minha é o padrão, e ela tem de estar escrita
e visível antes de eu construir em cima dela.

```text
O ENCONTRO paga o mesmo que na expedição — XP e moeda por ESPÉCIE, pela
           mesma função (`xpDaExpedicao`, `moedasDa`). Não uma tabela nova.
O ABATE    paga um extra pequeno, e ele é o único número novo do bloco.
           Proposta: 1/30 do que um encontro paga, por abate.
O BAÚ      é o saque da expedição, sorteado pela mesma `sortearItens` com o
           viés do estágio — mais o desbloqueio do estágio seguinte.
```

**Por que o encontro paga IGUAL, e não mais:** o avanço já rende 9 encontros por
hora contra 5,3 da Batida. Ele compra **tempo**, não teto — e o teto do dia é o
mesmo para os dois. Pagar mais por encontro além disso somaria as duas
vantagens, e o modo ausente viraria decoração.

**Por que o abate paga pouco, mas paga:** o §7.22.2 diz que ele é espetáculo, e
espetáculo que rende zero ensina o jogador a não olhar. O bastante é a coluna do
saque se mexer durante a wave — a peça de retenção que a referência tem e que
vale copiar.

**E o número tem de ser pequeno de verdade.** A primeira proposta que escrevi
foi 1/10, e ela contradizia o parágrafo anterior no mesmo fôlego:

```text
1/10   58 × 0,1 = 5,8 contra 6 dos encontros  ->  DOBRA a run
       o avanço passaria a pagar 2× por encontro do que a expedição, que é
       exatamente a paridade que eu tinha acabado de defender
1/30   58 ÷ 30  = 1,9 contra 6                ->  +32%
```

Fica **1/30**. Quem assiste ganha cerca de um terço a mais por run, além de
ganhar tempo — e isso é o prêmio por estar presente, não um segundo salário.

Este número entra na medição do A4c, e sai de lá com teste que o refaz.

---

### L-151 — o TETO limita o que a run RENDE, e não o direito de rodá-la

**Registrada em:** 08/09/2026, **por pergunta do dono, e APROVADA por ele no
mesmo dia**. **Bloco dono:** A4c. **Estado:** decidida, falta construir.

> "e como vai ficar questão do teto no novo iddle? Isso não vai acabar
>  limitando muito? Confesso que fiquei confuso"

#### A confusão dele era um FURO, e não uma dúvida

```text
o teto conta ESPÉCIES que apareceram, e nunca abates
um avanço  =  58 abates, mas no máximo 6 espécies
teto       =  30/dia  ->  30 ÷ 6  =  5 avanços
5 avanços  ≈  3 h de tela, e depois ACABOU
```

**A tela feita para ficar aberta por horas trava em três.**

E o furo tem uma causa que vale escrever, porque ela é do tipo que se repete:
o teto foi desenhado para a EXPEDIÇÃO, onde cinco envios *são* o dia inteiro —
cada um custa horas de relógio. No Avanço, cinco runs cabem numa tarde. O
mesmo número protege a mesma coisa em dois ritmos diferentes, e num deles ele
vira parede.

> Um limite calibrado no ritmo de um modo não sobrevive à chegada de outro. Ele
> não fica errado: ele fica *no lugar errado*.

#### A decisão

> **O teto limita o que a run RENDE EM ESPÉCIES, não o direito de rodá-la.**

```text
COM teto disponível    tudo como hoje: abates, XP, moeda, drops, baú, e até
                       6 ESPÉCIES que entram no registro e aceitam bola
SEM teto               a run acontece igual — abates, XP, moeda, drops e baú
                       o que PARA é o encontro: nenhuma espécie nova entra,
                       e a bola não tem em quem ser usada
```

#### Por que esta é a saída certa, e não afrouxar o número

```text
O §P5 FICA INTEIRO   o que ele protege é a economia de ESPÉCIES — elas vão
                     para a Arena e viram dinheiro. Isso segue em 30/dia,
                     exatamente como hoje
A PAREDE MORRE       a tela de horas passa a suportar horas
NASCE UMA DECISÃO    "vale gastar stamina numa run sem encontros?" — vale se
                     você quer XP e drops, não vale se quer coleção. Isso é
                     jogo, e hoje não existe
```

Aumentar o teto faria o oposto das três: mexeria na economia que o §P5 guarda,
adiaria a parede em vez de matá-la, e não criaria decisão nenhuma.

#### O que o A4c constrói

```text
a run COMEÇA mesmo com o teto esgotado — a guarda `cabeAvanco` deixa de
  recusar, e passa a marcar a run como SEM ENCONTROS
"quem apareceu" não recebe espécie nova numa run assim
a bola fica desabilitada, com o motivo escrito no botão
a tela DIZ o estado antes de o jogador entrar, e não depois
```

O último item é o que impede a mudança de virar armadilha: uma run que rende
menos e não avisa é pior que uma run recusada.

---

### L-152 — a DURAÇÃO da run não responde à força, e o dono pegou isso na conta

**Registrada em:** 08/09/2026, **por pergunta do dono**, ao ler a medição do
fecho da trilha A. **Bloco dono:** A4d. **Estado:** aberta, **medida**.

> "essa média de tempo é o cálculo INICIAL correto? Porque a depender da força
>  e da run, por exemplo o cara tá com os pokémon level 30 tudo evoluído, ele
>  vai levar 40min pra fazer a floresta no stage 1? Esse tempo é baseado em
>  quê?"

#### A resposta é não, e a medição é esta

```text
nível | limpou | duração média | wave média
    4 |  24/40 |      35.9 min | 9.4
    8 |  36/40 |      37.2 min | 9.9
   15 |  40/40 |      35.0 min | 10.0
   30 |  40/40 |      32.3 min | 10.0
   50 |  40/40 |      31.9 min | 10.0
```

**Nível 50 leva 31,9 min contra 35,9 do nível 4 — onze por cento.** Um
treinador com o time evoluído gasta praticamente o mesmo tempo que um novato
para limpar a floresta no estágio 1.

#### Por que, e a causa é de uma linha

A duração da wave é sorteada entre 2 e 4 minutos e **não olha para o poder**:

```js
const duracao = Math.round(entre(r, DURACAO_MIN_MS, DURACAO_MAX_MS) / 1000) * 1000;
```

O que a força muda hoje é só a CHANCE de vencer, e ela já está quase no teto
cedo:

```text
nível | poder | ameaça | razão | chance
    4 |   376 |    216 |  1.74 |  77%
   15 |   535 |    216 |  2.48 |  88%
   50 |  1041 |    216 |  4.82 |  95%
```

Da razão 1,74 para 4,82 — **quase três vezes mais forte** — a chance sobe 18
pontos e para no teto do §7.22.6. Como o teto existe por um bom motivo (*nada
é certo, nos dois sentidos*), a força deixa de ter para onde ir.

> A força tinha UM lugar para aparecer, e esse lugar tem teto. Ela precisava de
> um segundo, e o segundo é o RELÓGIO.

#### A recomendação, escrita antes de construir

> **A wave dura menos quando a folga de poder é maior.**

O duelo é uma troca de golpes: quem bate mais forte precisa de menos golpes. O
número de golpes já sai do tempo (`golpesPorLeva`), então basta o tempo
responder à razão.

```text
razão ~1     (equilibrado)     100% da faixa — 2 a 4 min, como hoje
razão ~2,5   (folgado)          ~65%          — 1,3 a 2,6 min
razão ~5     (esmagando)        ~40%          — 48 s a 1,6 min
piso                             35%, e ele existe para a wave não virar um
                                 piscar: abaixo disso não há o que assistir
teto                            130%, para quem está abaixo do estágio sentir
                                 o peso sem a run virar castigo
```

Com isso, a floresta 1 no nível 50 passa de ~32 min para **~13 min**, e no
nível 4 continua em ~36. É o que o dono espera, e é o que qualquer jogador
espera: **ficar forte tem de ENCURTAR o caminho já andado.**

E há uma consequência boa que não foi pedida: o teto de encontros deixa de ser
a única razão para subir de estágio. Hoje o jogador farma o estágio 1 porque é
seguro; com a duração respondendo à força, o estágio 1 vira rápido **e** pobre,
e o 2 passa a valer o risco.

---

### L-153 — o FOCO não entra no Avanço, e os cinco existentes são de expedição

**Registrada em:** 08/09/2026, **por observação do dono**. **Bloco dono:** A4d.
**Estado:** aberta.

> "são MUITAS variáveis, stats do pokémon, foco — que agora o foco deve ser
>  aplicado nesse novo modo"

#### Conferido no código, e ele está certo

`poderDaEquipe` usa `forca`, `nivel` e `vinculo`. **Não usa `foco`.** E os
cinco focos que existem são todos de EXPEDIÇÃO:

```text
batedor    +30% encontros, -20% material      (perfil batida)
vigia      -20% encontros, +1 garantido       (perfil vigília)
trilheiro  +35% material,  -15% encontros
sortudo    +40% item raro, -15% material
guia       +25% para os ALIADOS
```

Nenhum deles fala de combate — e um deles, o `guia`, **já é combate** e não
está sendo aplicado em lugar nenhum do Avanço.

#### A recomendação: reaproveitar, e não inventar cinco novos

```text
guia        entra no PODER da equipe — ele já diz "+25% aliados", e o Avanço
            é o único modo onde isso tem onde acontecer
batedor     mais ESPÉCIES por run: o elenco do estágio tem 6, e ele empurra a
            chance de os seis aparecerem antes da décima wave
trilheiro   mais material no BAÚ
sortudo     melhor item no BAÚ
vigia       neutro no Avanço, como já é fora do perfil dele
```

Isso mantém UMA tabela de foco para os dois modos. Cinco focos de combate
novos seriam uma segunda tabela para calibrar em paralelo, e elas divergiriam
— é o mesmo raciocínio que fez o Avanço pagar pelo perfil `trilha` em vez de
ganhar um perfil próprio.

---

### L-154 — o modo antigo vira ABA PRÓPRIA, e não uma escolha dentro de ROTAS

**Registrada em:** 08/09/2026, **decisão do dono**. **Bloco dono:** A4e.
**Estado:** decidida. **CORRIGE a L-146.**

> "o antigo modo não é pra ficar na mesma aba, ele se torna uma aba com nome de
>  ROTA OFF/TRAINER OFF — e o nosso novo iddle, somente ROTAS"

#### O que muda em relação ao que estava escrito

A L-146 registrou *"na MESMA aba, e o jogador escolhe"*, e o A4e ia construir
um seletor. **Está cancelado.** São duas abas:

```text
ROTAS                 o Avanço. O jogador assiste.
ROTA OFF / TRAINER    o modo de hoje: Batida, Trilha, Vigília, e o treino do
OFF                   banco. O jogador fecha o jogo.
```

E a decisão é melhor que a anterior por uma razão que vale escrever: os dois
modos pedem **posturas opostas**. Um é para ficar; o outro é para sair. Uma aba
que oferece os dois lado a lado pede que o jogador decida entre "ficar" e
"sair" no mesmo clique — e a tela que ele está olhando enquanto decide é a do
modo que pede para ele ficar.

> Separar em abas não é organização: é parar de fazer a pergunta errada.

O que continua valendo da L-146: ao escolher o modo ausente a conta DESLOGA, e
ao voltar há um pop-up com o tempo, a barra e o quanto rendeu. Isso agora mora
na aba ROTA OFF.

---

### L-155 — o log da run sabe desenhar item e treinador, e ninguém os emite

**Registrada em:** 08/09/2026. **Bloco dono:** 1.29 (o item) e 1.27 (o
treinador). **Estado:** aberta, com a metade da tela já pronta.

Pedido do dono, no A4g:

> "qualquer item que aparecer ali também deve aparecer ícone; para batalhas com
>  treinador NPC, o nome do treinador e algum ícone pra diferenciar"

Ele está certo sobre o desenho, e a tabela `ROTULO` do `avanco-painel.mjs` já
tem as duas linhas escritas — com ícone de item pelo `estiloItem` e a pastilha
👤 do treinador. **O que falta é o motor emitir os eventos.**

```text
o ITEM       hoje cai só no BAÚ, na colheita (§7.22.8) — durante a run não
             existe drop. Quem abre essa porta é o Estilhaço, no 1.29
o TREINADOR  existe na EXPEDIÇÃO (`engine/npc.mjs`, bloco 1.7b) e não na run.
             Levá-lo para cá é desenho de wave, e é do 1.27
```

**Por que a linha da tela foi escrita antes:** o custo dela é uma entrada de
tabela, e o custo de NÃO escrevê-la é o próximo bloco redesenhar o log inteiro
para caber um tipo novo.

---

### L-156 — um portão que pegue variável de CSS que não existe

**Registrada em:** 08/09/2026. **Bloco dono:** T8 (manutenção do arnês).
**Estado:** aberta. **Nasce do D-079.**

Sete nomes de cor usados em ~24 regras da tela do Avanço nunca existiram na
paleta, e **nada** pegou: as suítes de Node leem CSS como texto, o Q5 só reprova
em `pageerror`, e a linha de base visual nasceu já errada.

> `color: var(--naoExiste)` não avisa, não quebra a regra, e não aparece no
> console. A declaração é descartada e a propriedade herda.

O portão é barato e estático: varrer o `index.html` por `var(--nome)` e conferir
que existe um `--nome:` declarado. Ele teria pego o D-079 no commit que o
criou, três sessões antes de o dono ter de cobrar duas vezes.

**O que a destrava:** nada. É meia hora de trabalho e não depende de ninguém —
está na fila do T8 por ordem, não por bloqueio.

---

### L-157 — a posse do traje e a posse dos cosméticos são duas listas

**Registrada em:** 09/09/2026, ao construir o 1.31. **Bloco dono:** o primeiro
bloco que puser um traje à venda. **Estado:** aberta, e hoje **não custa nada**.

A boutique guarda o que foi comprado em `pa.cosmeticos.v1`, com chaves
`familia:id`. O acervo de trajes tem posse própria desde que ele existe, em
`pa.outfit.v1`, e ela guarda também **qual está vestido** — coisa que as outras
cinco famílias não têm.

```text
pa.outfit.v1       { posse:[ids], vestido }   só trajes, e sabe o vestido
pa.cosmeticos.v1   ['familia:id', ...]        as outras cinco famílias
```

#### Por que isso está certo hoje, e errado amanhã

**Nenhum dos 9 trajes está à venda.** Todos nascem `padrao`, e por isso as duas
listas não se sobrepõem em nada — não há como divergirem sobre uma peça que só
uma delas conhece.

No dia em que o primeiro traje for `loja`, a compra escreveria em
`pa.cosmeticos.v1` e o guarda-roupa leria `pa.outfit.v1`. **O jogador pagaria e
não veria o traje.**

#### O que a destrava

Uma decisão de desenho, e ela é pequena: ou o acervo passa a ler a posse da
boutique, ou a boutique delega a família `outfit` ao acervo. A segunda é a que
eu recomendo — o acervo já sabe coisas que a boutique não sabe (o vestido, o
`MODO_VITRINE`, a recusa do traje de NPC), e mudar quem manda seria mover a
regra para o lado que sabe menos.

---

### L-158 — os 9 trajes são arte NOSSA e nenhum está à venda

**Registrada em:** 09/09/2026, ao construir o 1.31. **Bloco dono:** decisão do
dono. **Estado:** **STAND BY, por decisão dele em 09/09/2026.**

> "o L-158 deixa de stand by, isso não é prioridade; futuramente definimos.
>  Deixa em registro pra lembrar quando formos definir os cosméticos"

**Ela não bloqueia nada.** A aba Trajes abre mostrando os nove como "seu", que
é verdade — a boutique já vende 33 peças das outras cinco famílias. Esta ficha
existe para a decisão não se perder no dia em que os cosméticos entrarem em
pauta, e é para lá que ela vai.

A regra da boutique é *"vende-se o que é nosso; o herdado fica de graça"*, e ela
foi aplicada às cinco famílias que eu podia decidir sozinho. Nos trajes eu
**não** decidi, e de propósito: o `outfit-acervo.mjs` declara os nove como
`padrao`, e essa declaração é anterior a este bloco.

```text
o que ela diz hoje    os 9 nascem com o jogador
o que o MODO_VITRINE  "EU DEV tenho tudo liberado até pra ir testando"
diz ao lado dela      — estado temporário, e o dono escreveu isso
```

**Os trajes são o cosmético mais caro da tabela** (1.250), e por um motivo que
o próprio desenho dá: é o boneco que anda pelo bioma por horas, na tela que o
jogador deixa aberta. É a peça com mais superfície e mais tempo — e é
justamente a que não tem nada à venda.

#### O que eu preciso dele, e é uma linha

**Quais dos 9 trajes continuam de graça, e quais vão para a vitrine.** A minha
recomendação, escrita antes: os **dois primeiros** de graça (um por gênero de
sprite, para ninguém começar sem opção) e os **sete restantes** à venda.

Enquanto ele não decidir, a aba Trajes abre mostrando os nove como "seu" — o
que é verdade, e não uma tela quebrada.

---

### L-159 — o Estilhaço e o baú do estágio ainda não se conhecem ✅ FECHADA

**Registrada em:** 09/09/2026, ao fechar o 1.29. **Bloco dono:** 1.27.
**Estado:** ✅ **FECHADA em 25/09/2026, na ST-3.1** (a recomendação abaixo, construída).

> **O que foi construído, e medido:** `lancamentoDoBau` (`engine/estilhaco.mjs`)
> — até o estágio 3, o item estilhaçável do baú vira partes, **1, 2 e 3 por
> unidade** conforme o estágio; do 4 em diante vem inteiro. Estilhaçável é o
> que a loja do Estilhaço vende: porta de estilhaço **e** bioma de origem — a
> primeira versão olhava só a porta e fez "Estilhaço de Essência" (pego na
> sondagem, antes da tela). Em 60 runs por estágio: Floresta e Vulcão só têm
> item montável no baú a partir do 3; Estufa e Praia já no 1 e no 2. O baú do
> estágio 3 com três pedras, que dava três inteiras, dá nove partes — uma pedra
> e dois sétimos. **A calibragem (1·2·3) é recomendação minha e é reversível**:
> é uma linha no motor.

O Estilhaço fechou a porta da Essência, e no caminho ficou visível uma segunda
que ainda não existe: **a run do Avanço não paga estilhaço.**

```text
a EXPEDIÇÃO   paga Essência, e a Essência agora vira estilhaço na loja
a RUN         paga o BAÚ do estágio, e o baú entrega o item INTEIRO
```

São duas economias que não se falam. Quem joga o Avanço junta essência pelo
mesmo caminho de quem manda expedição — mas o baú entrega o item pronto, e o
estilhaço existe justamente para o item pronto não sair fácil.

#### O que eu recomendo, escrito antes de construir

**O baú passa a poder cair em estilhaço**, e não só em item inteiro — com o
inteiro reservado para o estágio 4. Assim o baú do estágio 1 continua valendo a
pena sem atropelar as duas semanas que a curva cobra do muito raro.

Não construí porque isso é desenho de wave, e desenho de wave é do **1.27** —
que é justamente onde a L-140 já mudou de forma.

---

### L-160 — o Estilhaço não aparece na mochila nem na wiki ✅ FECHADA

**Registrada em:** 09/09/2026. **Bloco dono:** 1.30 (os ícones) ou o primeiro
bloco que passar pela mochila. **Estado:** ✅ **FECHADA em 25/09/2026, na ST-3.1**
— que foi o primeiro bloco a pôr `est:<id>` num saque: `nomeDoItem` diz
"Estilhaço de <item>" e `estiloItem` usa o ícone do item de origem.

As partes são guardadas na bolsa sob `est:<id>` e **só a aba do Estilhaço as
mostra**. A mochila lista a bolsa e vai listá-las com o id cru — `est:folha` —
que é exatamente o defeito que o 1.12 corrigiu para os itens:

> Id na tela não é um nome faltando: é um nome ERRADO, porque o jogador lê e
> acha que aquilo é o nome.

Hoje isso não aparece porque a mochila filtra por catálogo, e `est:folha` não
está nele. **O risco é o inverso do normal:** a peça está invisível, e um dia
alguém vai afrouxar o filtro e ela vira lixo na tela.

**O que ela precisa:** um nome (`Estilhaço de Pedra das Folhas`) e um ícone
derivado do item de origem. Os dois são uma linha cada em `itens-nome.mjs` e
`itens-icone.mjs`.

---

### L-161 — AS DECISÕES DO DONO DE 09/09/2026, e o que elas desfazem

**Registrada em:** 09/09/2026, **pelo dono**, depois de olhar a run rodando.
**Bloco dono:** 1.27 (o que é tela) e A8 (o que é regra nova).
**Estado:** decidido por ele; construção pendente.

Ele parou o trabalho e reprovou o conjunto. Registro aqui **antes de
construir** porque foi exatamente por não registrar que eu segui adiante em
duas coisas que ele não tinha aprovado.

#### ✅ O QUE ELE DECIDIU, e é definitivo

```text
o VÍNCULO       sai do combate INTEIRO — os +25% e o painel. Vai para a Gen 2
                junto com a evolução por afinidade.
                MAS: é preciso outra forma de ver o FOCO, que é escolhido no
                nível 12 e continua existindo
a QUEDA         a run ACABA quando o Pokémon cai. Sem substituição.
o DUPLO USO     a MESMA criatura não pode avançar e ir à expedição ao mesmo
                tempo — recusa, como o treino do banco já recusa
a POÇÃO         pode e deve ser usada DURANTE as waves
a BOLA          NÃO durante a run. Ao final dela aparece o quadro
                "QUEM APARECEU" com o que apareceu, e é ALI que ele decide as
                capturas — inclusive indo à loja comprar bola antes
o QUADRO        ele dura até a run seguinte, e é substituído por ela
ROTAS           o layout de hoje FICA. O que muda é a seleção de rota, que
                passa a ser como a do Baiak — clica e já vê nível e elenco
ROTA OFF        volta ao layout ANTERIOR, e hoje ela nem mostra os do bioma
```

#### 🔴 OS DEFEITOS QUE ELE APONTOU

```text
SPRITE QUEBRADA   em DIVERSOS mapas, e não só na Caverna de Gelo
                  → CAUSA ACHADA: a troca de folha do A4g. Ver a nota longa
                    em `vivos.mjs` — corrigida com a técnica da arena
SPRITE DE ATAQUE  "na arena SAEM TODOS OS SPRITES, é só copiar"
                  → mesma causa, mesma correção
HITBOX "-31"      terceira cobrança. Existe no código e não chega aos olhos
LOG DA RUN        ele quer o ícone do "QUEM APARECEU", e não o retrato do dex
ABA EQUIPE        imagem estática; ele quer o gif animado, como na stamina
WAVE LENTA        2 a 4 min por wave, e ela REPETE inteira ao perder — quase
                  impossível passar da primeira com equipe de começo
BARRA DE AÇÃO     "essa barra aí com bola, recuar etc. será o quê?" — ela não
                  se explica
```

#### E a frase que resume a cobrança

> "Faz o básico e simples bem feito, que não tem erro. Está errando demais."

Ele está certo sobre o padrão: eu construí camadas por cima de uma cena que
ainda não estava boa, em vez de deixar a cena boa primeiro.

---

### L-162 — a MESMA criatura podia avançar e ir à expedição

**Registrada em:** 09/09/2026, por pergunta do dono. **Bloco dono:** 1.27.
**Estado:** aberta. **É um furo, e não uma escolha.**

> "Como eu consigo mandar 1 pokémon avançar e o mesmo pokémon na expedição?"

Conferido: `porQueNaoAvancar` confere stamina, caixa, estágio e teto — e **não
confere se a criatura já está em campo**. `iniciarExpedicao` também não olha a
run.

O motor do treino do banco (`podeTreinar`) já recusa exatamente isso, com a
frase certa escrita ao lado:

> Quem está em aventura NÃO pode estar em treino. Sem esta recusa, a mesma
> criatura renderia nos dois lugares ao mesmo tempo — e o dia dobraria por uma
> porta que ninguém abriu de propósito.

A regra existe; ela só não foi aplicada ao Avanço. **A recusa vale nos dois
sentidos** — nem avançar com quem está em campo, nem mandar a campo quem está
avançando.

---

### L-163 — o DESLOGAR da Rota OFF, e o teto de tempo ausente

**Registrada em:** 09/09/2026, por pergunta do dono. **Bloco dono:** A4e (o que
sobrou da L-146). **Estado:** aberta.

> "Quando você deixa na hunt off ou trainer off, a conta desloga e não fica
>  logada; quando você retornar recebe o pop-up do que farmou. Obviamente
>  existe um limite, né — o cara não vai largar 1 semana off e voltar full."

Duas coisas, e a segunda **já existe e ele não sabia**:

```text
o DESLOGAR    ainda não acontece. É a metade da L-146 que ficou de fora do
              A4e, e ela é tela
o TETO        JÁ EXISTE, e é a RESERVA (`engine/ausente.mjs`, bloco A7):
              12 h de teto, e 1 h de tela vale 1 h de reserva
```

**Quem larga uma semana não volta full: ele volta com 12 h**, e só se tiver
jogado 12 h para ganhá-las. O que falta é a tela DIZER isso — hoje a reserva
não aparece em lugar nenhum, que é o mesmo defeito do vínculo por outra porta.

---

### L-164 — o que os vídeos do Baiak mostram, OLHADOS

**Registrada em:** 09/09/2026, depois de extrair os quadros com
`tools/contato-video.mjs`. **Bloco dono:** 1.27. **Estado:** aberta.

Os três vídeos estão em `assets/ref/`. **Eu tinha olhado só o terceiro** e pedi
ao dono que os mandasse de novo — o erro foi meu, e ele custou uma rodada.

> A ferramenta para isso existe desde o 1.25 e está escrita no próprio
> cabeçalho dela: *"o dono manda referência em movimento e eu não vejo
> movimento"*. Tê-la e não usá-la nos três é pior que não tê-la.

#### `v1` — A SELEÇÃO DE HUNT, e é isto que ele quer na aba Rotas

Uma SALA de pedra com uma **grade de criaturas**, cada uma com uma etiqueta
verde por cima dizendo o nome e o nível entre colchetes. O jogador anda até a
que quer e entra.

```text
o que a tela RESPONDE sem um clique:
  quais criaturas moram em cada hunt   — elas estão desenhadas ali
  que nível cada uma pede              — a etiqueta diz
  quantas opções existem               — a sala inteira é a lista
```

E é exatamente a frase dele: *"o cara só clica, já informa o nível, quais
criaturas tem lá e etc."*

**A diferença para o que temos:** hoje a rota é um CHIP com o nome do bioma.
O nome não diz quem mora lá nem o que ele pede — o jogador tem de clicar nos
onze para descobrir. A sala responde antes do clique.

#### `v2` — A MOVIMENTAÇÃO, e ela contradiz o que eu construí

O boneco **ATRAVESSA o mapa** e vai lutando pelo caminho: ele avança, encontra,
resolve, avança de novo. A câmera acompanha.

> "veja como funciona a movimentação, realmente faz sentido: o boneco vai
>  avançando e batalhando de forma progressiva"

**O que eu construí é o oposto.** No A4g eu ancorei a batalha no treinador
PARADO — ele congela quando há selvagem em cena, e o campo se arma à frente
dele. Foi a correção certa para o pega-pega, e ela resolveu o defeito que
existia; mas a leitura que ela produz é "duas criaturas brigando num quadro
estático", e não "uma jornada".

```text
o que ficou certo   ninguém persegue ninguém; o campo tem âncora
o que falta         a âncora ANDAR entre as waves, em vez de o treinador
                    parar no mesmo pixel a run inteira
```

**Recomendação, escrita antes de construir:** o treinador avança um trecho a
cada wave vencida, e para para lutar. A wave passa a ser um PONTO DO CAMINHO em
vez de um round no mesmo lugar — e a barra de dez waves do topo vira o mapa
daquele avanço, que é o que ela já promete visualmente.

#### `v3` — a nossa tela, e o que ele chamou de bagunça

A aba Rotas com a tira horizontal de cartões de criatura. Cada cartão traz
retrato, nome, nível, barra de energia, barra de XP, ATQ/DEF/VEL, potencial,
natureza, e ainda os selos de foco e evolução — **dez informações num cartão de
90 px**, repetidas por criatura.

> "olha o último vídeo do nosso layout pra pré-selecionar: uma loucura,
>  bagunça total, muito feio e confuso"

Ele está certo, e a causa é acúmulo: cada bloco acrescentou um dado ao cartão
porque cabia, e ninguém perguntou o que a tela PRECISA responder na hora de
escolher quem vai. São três perguntas — *quem é, se pode ir, e o que ele soma*
— e o resto é ficha, não escolha.

---

### L-166 — a bola saiu da run; o "QUEM APARECEU" é o momento

**Registrada em:** 09/09/2026, por decisão do dono. **Bloco dono:** 1.27.
**Estado:** FECHADA no mesmo bloco — está aqui porque a decisão precisa ficar
escrita, e não porque falte trabalho.

> "A poção pode e deve ser usada durante as waves, porém as bolas, não. Quando
>  você clica em bola simplesmente não avisa nada no log — se capturou, se
>  fugiu, você não sabe o que aconteceu com suas bolas. O padrão a se manter é
>  o qual já existe com o 'QUEM APARECEU' ao final da run, mesmo se o jogador
>  falhar. Exemplo: na wave 6 aparece ao final da run o quadro, e o jogador tem
>  AQUELE MOMENTO pra decidir suas capturas. Ele pode acessar a loja e comprar
>  ball também caso esteja sem, e aí vai da sorte dele. Ao fechar e iniciar
>  outra RUN, esse quadro vai sumir e será atualizado com o da nova run."

**O que estava errado, e não era só o aviso.** Escrever "a bola falhou" no log
resolveria a queixa literal e deixaria o problema de pé: durante a wave a tela
ANDA, o botão jogava a primeira bola da bolsa no primeiro alvo da lista, e não
havia como comparar nada. A decisão que o §7.22.12 chama de central estava
sendo tomada no reflexo.

**O que ficou:**

```text
a POÇÃO       fica na barra da wave — ela É uma decisão de combate
a BOLA        sai da barra e vai para o quadro do fim, onde todas as espécies
              e todas as bolas aparecem com a chance escrita em cada botão
o QUADRO      é o MESMO da Rota OFF. Uma tela para os dois modos: o jogador
              aprende uma vez, e elas não têm como divergir
a LOJA        entra no cabeçalho do quadro. O momento tem prazo — mandar o
              jogador procurar a loja é gastar o prazo procurando
o PRAZO       começar outra run limpa o quadro, e SÓ o que a run trouxe. Sem
              isso os aparecidos empilhariam e o momento perderia o custo
```

**A regra do §7.22.12 não foi perdida: mudou de guardião.** Era `avanco-bola`
quem segurava "uma tentativa por espécie, por run", com a lista `tentadas`.
Hoje quem a segura é a FORMA do quadro — uma espécie, um cartão, uma bola, e o
cartão sai da lista ao receber a bola. A regra virou estrutura, e estrutura não
tem como ser esquecida.

---

### L-167 — `engine/avanco-bola.mjs` ficou sem chamador

**Registrada em:** 09/09/2026, consequência da L-166. **Bloco dono:** 1.27b (o
fecho da trilha do Avanço). **Estado:** aberta.

O módulo continua no repositório, testado em `test/ausente.mjs`, e sem ninguém
o chamando desde que a bola saiu da run.

**Por que não foi apagado no mesmo commit.** A regra central deste projeto é que
um bloco constrói só o que está no escopo dele, e apagar motor testado no commit
que muda uma tela é exatamente o arrasto que ela existe para impedir — foi assim
que uma correção de sprites virou troca de fonte de arte na v0.6.1.

**O que a destrava:** o quadro do fim provar-se em uso — uma sessão do dono com
capturas feitas por ali. Se ele pedir a bola de volta na wave, o módulo está
inteiro e volta a ser ligado; se não pedir, ele sai com os testes e os defeitos
plantados que o cobrem, num commit que só faz isso.


---

### L-168 — os golpes têm de ser LIBERADOS pelo nível

**Registrada em:** 09/09/2026, por observação do dono. **Bloco dono:** 1.27c.
**Estado:** aberta. **É defeito, e não pedido.**

> "um charmander lv 1-2 era pra usar fire blast? Flamethrower? Tem que se
>  atentar a isso, os poderes são liberados gradativamente com o nível."

Ele está certo, e o furo é meu: o balão sorteia entre TODOS os golpes da
espécie, sem olhar o nível de quem bate. Um lv 1 anunciando o golpe mais forte
da linha não é enfeite errado — é a tela contando uma história que o resto do
sistema desmente. O nível decide o poder em todo lugar menos ali.

**O que isso obriga:** o pack precisa dizer em que nível cada golpe entra, e o
sorteio precisa passar por essa peneira. Onde a informação não existir, a
peneira tem de degradar para "os primeiros da lista" em vez de recusar — golpe
faltando é balão vazio, e balão vazio é pior que golpe simples.

---

### L-169 — quatro por wave, e não seis

**Registrada em:** 09/09/2026, decisão do dono. **Bloco dono:** 1.27c.
**Estado:** aberta.

> "To achando também que 6 Pokémon por wave está muito, vamos reduzir para 4
>  por wave."

É calibração de RITMO, e ela conversa com o item 5 da ordem anterior: a wave
encurtou para 45–90 s e passou a espremer seis duelos nesse tempo. Menos
selvagens é o outro lado da mesma correção — e não uma troca dela.

**O que medir junto:** o `GOLPES_MIN` do D-084 existe porque a leva ficou
apertada. Com quatro, cada duelo ganha metade a mais de tempo, e o piso pode
deixar de ser o que manda. A medição tem de ser refeita, e o número novo vai no
commit ao lado do antigo.

---

### L-170 — o chefe do estágio vira UM boss, em 1x1, com anúncio

**Registrada em:** 09/09/2026, decisão do dono. **Bloco dono:** 1.27c.
**Estado:** aberta. **É a maior das cinco.**

> "no final podem vir os boss em forma de luta 1x1, porém coloca exemplo
>  primeiro mapa beedrill e butterfree, como um boss só, ele é mais difícil,
>  aparece com hp em destaque e nome no meio da tela estilo o boss do baiak.
>  Essa questão de aparecer um ou outro vai ocorrer de forma RNG."

Hoje o estágio tem DOIS chefes e eles entram como uma leva comum. A decisão
muda três coisas:

```text
QUANTOS     um só, sorteado entre os chefes do estágio — RNG, e é ele que faz
            duas runs do mesmo lugar terem finais diferentes
COMO        1x1, e não leva. O chefe é o único momento em que a wave para de
            ser fila e vira duelo
O ANÚNCIO   nome no meio da tela e HP em destaque. É o que separa "mais um" de
            "o dono deste lugar"
```

**E ele é MAIS DIFÍCIL**, o que precisa sair do motor e não de um número na
tela: chefe com a mesma vida do comum anunciado com fanfarra é a tela
prometendo o que o motor não entrega.

**O que já existe a favor:** `elencoDoEstagio` já separa `comuns` de `chefes`,
e o `roteiro-wave` já sabe montar levas. O sorteio entre os dois chefes cabe na
semente da run, então ele é determinístico e auditável como todo o resto.

---

### L-171 — a arena tem SPRITE DE EFEITO, e o Avanço não

**Registrada em:** 09/09/2026, com três capturas da Arena. **Bloco dono:** 1.27c.
**Estado:** aberta.

> "olha a diferença das sprites de ataque da arena. Eu quero que seja assim"

Nas capturas da Arena o golpe tem DUAS metades, e o Avanço só construiu uma:

```text
o QUE BATE    a folha de ataque do atacante        — o Avanço tem (A4g)
o QUE ACERTA  o EFEITO desenhado SOBRE o alvo      — o Avanço NÃO tem
              os anéis azuis do Surf, o estouro de fogo, a estrela do impacto
```

Sem a segunda, o golpe acontece e nada toca o alvo: o balão diz o nome, o
número sobe, e a distância entre os dois sprites fica vazia. É por isso que o
combate "não se vê" mesmo com tudo funcionando — e é a mesma classe do D-083,
onde o número existia e não chegava aos olhos.

**A regra de cópia deste projeto se aplica ao contrário do usual:** a Arena é
NOSSA. Copiar dela não é copiar de fora — é parar de manter duas linguagens
visuais para a mesma coisa. **A técnica é o que se traz**, e não as constantes;
foi assim que o sprite do mob se consertou no bloco passado.

---

## FECHADA em 10/09/2026 — e o trabalho era LIGAR, não construir

`MOVE_FX` e `fxSheet` **já eram exportados** pelo `efeitos.mjs`. Eles nunca
tinham sido chamados do Avanço. É literalmente o que o dono escreveu em letras
maiúsculas duas rodadas antes:

> "na arena SAEM TODOS OS SPRITES, É SÓ VOCÊ COPIAR E TRAZER PRA CÁ"

**Medido antes de ligar** — porque uma tabela que não casa com os nomes do pack
teria "funcionado" e nunca aparecido:

```text
golpes do pack               66
com entrada no MOVE_FX       66   ← todos
com folha de IMPACTO         60
```

**Medido depois, na tela da run** (28 s de wave 1):

```text
14 estouros agendados · 413 desenhos
```

Os 413 são os 14 desenhados ~30 vezes cada — meio segundo a 60 quadros. A conta
bate, e é ela que prova que o efeito chega aos olhos e não só ao código.

**E a sonda quase mentiu de novo:** a primeira versão perguntava "quantos estão
no ar AGORA", e um estouro vive meio segundo — a resposta era zero quase sempre,
e zero parece ausência. Foi preciso contar os que NASCERAM, que é a mesma
armadilha do número do dano no D-083.

### O que ficou de fora, e por quê

`cast` (a carga no atacante) e `proj` (o que VIAJA até o alvo) pedem a posição
do atacante e a linha entre os dois. A cena do Avanço publica a posição do alvo
e não a do par — trazer o que não dá para posicionar seria pôr o efeito no lugar
errado, que foi exatamente o D-083.

**Bloco dono do resto:** 1.27d, junto do avanço progressivo — é ele que vai
precisar da linha entre os dois de qualquer jeito.

---

### L-172 — os números de dano se atropelam

**Registrada em:** 09/09/2026, por observação do dono. **Bloco dono:** 1.27c.
**Estado:** aberta.

> "o hitbox também tá meio zoado, os números aparecem de forma confusa"

O D-083 pôs o número no lugar certo, e o D-084 fez ele variar. O que sobrou é o
ARRANJO: com dois selvagens e o companheiro trocando golpes no mesmo canto, os
números nascem uns sobre os outros — a mesma doença que as placas tinham, e que
o D-081 resolveu com um passo de separação.

**MEDIR ANTES DE MEXER:** a esteira já conta placas sobrepostas; ela passa a
contar números sobrepostos também. É o que transforma "meio zoado" num número, e
"meio zoado" sem número é onde eu erro há três rodadas.

---

## O QUE FOI MEDIDO, E O QUE SOBROU

```text
                        ANTES              DEPOIS
pares sobrepostos       5   (de 25)        1 a 3
fora da janela (420)    2   (de 25)        0
no duelo do chefe       0   (de 12)        0 a 1   — ele é 1x1
```

**A correção:** `pontoLivre`, na geometria pura. Cada número que nasce desvia
dos que ainda estão no ar — para CIMA, que é a direção que a animação já usa; de
lado ele desgrudaria do lutador que causou o dano. *A cor diz de quem é o dano;
a posição diz de qual golpe.*

**E a sonda errou duas vezes antes de acertar**, o que vale mais que a correção:

```text
1ª  contava retângulos de NASCIMENTO dentro de 1,2 s — e contava pares que o
    jogador nunca viu juntos, porque o mais velho já tinha subido
2ª  a caixa que eu escrevi (46×20) não era a medida: a real é 21–33 × 9 no
    instante do nascimento, quando o `floatUp` ainda está em `scale(.6)`
```

> Sonda que mede o instante errado dá um número, e número parece medição.

**O QUE SOBROU, e é honesto dizer:** de um a três pares ainda se tocam. As
suspeitas, nesta ordem: o grampo da janela pode empurrar dois números para o
mesmo x quando os dois nascem na borda; e o modelo de subida da sonda é uma
aproximação da curva do `floatUp`, não a curva.

**O que o destrava:** ler os dois pares que sobram — a sonda já sabe imprimir a
caixa real, e falta ela imprimir o PAR. Sem essa leitura, a próxima tentativa é
chute, e chute em arranjo visual é como eu gastei três rodadas.

---

### L-173 — varrer as ferramentas de plantio por campo DERIVADO escrito à mão

**Registrada em:** 09/09/2026, consequência do D-087. **Bloco dono:** 1.27b.
**Estado:** aberta.

O `olhar-idle.mjs` escrevia `raridade: esp.raridade ?? 'comum'` sobre um campo
que o motor DERIVA, e a foto saiu afirmando que Charizard é comum. O `??` fazia
parecer cuidado; ele era o defeito.

**O que varrer:** todo `?? 'literal'` e todo campo escrito à mão nas ferramentas
que plantam estado (`olhar-idle`, `olhar-telas`, `foto-*`), cruzado com a lista
de campos derivados que o `hidratar` calcula — hoje `potencial`, `forma` e
`nivel`, mais `raridade` do `elencoDoBioma`.

**Por que não foi feito no mesmo commit:** é varredura, e varredura no meio de um
bloco de tela é como uma correção de sprites vira troca de fonte de arte. Ela
cabe num commit que só faz isso, e o resultado é auditável.

---

### L-174 — o portão de navegador não alcança a TELA DA RUN

**Registrada em:** 10/09/2026, consequência do D-089. **Bloco dono:** T7 (a
esteira). **Estado:** aberta.

O D-089 matou a cena inteira — zero placas, zero números, zero efeitos — e a
suíte ficou VERDE. O `test/origem` não pega porque varre símbolos CHAMADOS e o
que faltava era uma variável LIDA. O Q5 não pega porque **ele nunca abre a tela
da run**: ele carrega a página e confere `pageerror`, e a run só existe depois
de o jogador entrar nela.

```text
o que o Q5 abre hoje    a página, as abas, a Arena
o que ele NÃO abre      a tela da run — que é onde sete blocos foram construídos
```

**A esteira de OLHAR já sabe entrar na run** desde o 1.27 (ela planta o estado,
clica a aba, espera o duelo e conta placas, números e estouros). O que falta é
essa entrada virar PORTÃO: hoje ela produz um relatório para alguém ler, e
ninguém reprova nada.

**O que a destrava:** transformar as três contagens em afirmação — placas > 0,
números > 0, estouros > 0 numa wave de 28 s — e ligar isso ao Q5. As três foram
a zero de uma vez no D-089, e três zeros juntos não são coincidência.

**Por que não foi feito no mesmo commit:** o portão fica mais lento (a entrada
na run custa ~30 s por largura), e mudar o custo do Q5 é decisão de bloco de
esteira, com medição antes e depois. Fazê-lo no meio de um bloco de tela é
exatamente o arrasto que a regra central proíbe.

---

### L-175 — em 420 px a janela da câmera tem 130 px de mundo

**Registrada em:** 10/09/2026, achada pela esteira ao investigar o D-092.
**Bloco dono:** o do CENÁRIO. **Estado:** aberta.

O contador novo de "estouro fora da tela" acusou 134 em 420 px e **zero** nas
outras larguras. A pergunta seguinte separou dois defeitos diferentes — está
fora o estouro, ou o mob em quem ele cai? A esteira mediu:

```text
             CANVAS      PALCO       ESCALA
panorâmico   403x207   1209x620          3
estreito     130x207    390x620          3
```

**Cento e trinta pixels de mundo.** Uma criatura tem 32 a 40 px, então cabem
três lado a lado — e o bando de quatro, mais o companheiro e o treinador, não
cabe. O que sai da janela não é o efeito: é a luta.

O zoom fica em 3× em todas as larguras porque o piso do `viewport.mjs` é o
mesmo. Em 1920 isso dá uma janela confortável; em 420 dá uma fresta.

**O que a destrava:** o zoom da run deixar de herdar o piso da aba de escolha e
passar a ser função da LARGURA — a wave precisa caber, e "caber" é um número
(o bando de quatro mais o posto de batalha). É desenho de câmera, e câmera tem
bloco próprio.

**Por que não foi feito aqui:** mexer no piso do zoom é o defeito S616, que já
apagou a cena esticada uma vez. Fazer isso no meio de um bloco de conserto de
sprite é exatamente o arrasto que a regra central proíbe.

---

### L-176 — o som e o vídeo dos NPCs dão 404 na tela da run

**Registrada em:** 10/09/2026, pela esteira, quando ela parou de FILTRAR os 404.
**Bloco dono:** 1.31b (as lojas). **Estado:** aberta.

```text
404 na tela da run: 3 pedido(s), 2 arquivo(s) — battle-theme.mp3, lojas.mp4
```

Nenhum dos dois é folha de sprite, e nenhum dos dois quebra a run. Mas os dois
são pedidos que saem para fora em toda abertura, e a L-125 já decidiu que o NPC
sai do vídeo — então o arquivo tem de estar em disco como qualquer outra arte.

**O que a esteira mudou junto, e vale mais que a lacuna:** ela FILTRAVA os 404
para não poluir o relatório. Filtrava justamente a classe de erro que custou
três dias — setenta espécies pediam `Attack-Anim.png`, levavam 404, e o
`background-image` ficava vazio, sem exceção e sem console vermelho.

> Ruído escondido é sinal escondido. O que se filtra por ser comum é o que
> deixa de ser lido quando importa.

Agora eles saem contados e **com nome**.

---

### L-177 — o jogador não sabe QUE CLIMAS EXISTEM antes de escolher a equipe ✅ FECHADA

**Registrada em:** 10/09/2026, consequência do 1.32. **Bloco dono:** 1.32b.
**Estado:** ✅ **FECHADA em 25/09/2026, no 1.32b (ST-2.1 e ST-2.2).**

> **O que foi construído:** a sala de rotas tem a legenda dos climas (fechada
> por padrão) — nome, faixa de frequência, o bônus, e **em quantas rotas do
> estágio do jogador o elenco troca um rosto**, perguntado ao motor rota por
> rota (`app/modules/climas-legenda.mjs`). O Sol diz "não muda quem aparece",
> porque não muda em estágio nenhum. A legenda não recebe nada da run: o clima
> sorteado continua oculto até ela começar. E ao começar, o log diz quem a
> condição trouxe — "🌼 Pólen trouxe Paras no lugar de Metapod". Capturas em
> `tools/previas/_climas/`. A L-183 (o veterano quase não vê a noite) segue
> aberta: é a ST-2.3, decisão de conteúdo.

O clima é revelado ao ENTRAR na run, e essa decisão está certa — é a mesma da
Arena, e o motivo está escrito no `avanco-clima.mjs`: sabido antes, a escolha de
equipe viraria uma conta ("hoje deu Nevasca, levo os quatro de gelo") e o resto
do time deixaria de existir.

**Mas saber que climas EXISTEM é outra coisa, e essa o jogador precisa.** Hoje
ele descobre a tabela inteira por tentativa: sete climas, sete tipos, cinco
canais. Sem uma legenda em algum lugar, "levar um de água às vezes acelera a
run" é um padrão que só aparece depois de vinte runs — e a maioria fecha a aba
antes.

```text
o que ele SABE       o clima de agora, o que ele paga, e quem da equipe aproveita
o que ele NÃO SABE   que existe um clima de gelo que paga o dobro dos outros
```

**O que a destrava:** uma legenda na aba de escolha — os sete, o tipo de cada um
e o que rende — ou uma linha no "COMO FUNCIONA". É informação de PLANEJAMENTO, e
por isso ela não fere a surpresa: continua sem dizer qual vai cair.

**Por que não entrou aqui:** o 1.32 já cobre motor, dados, três packs, colheita,
cartão, log e a encenação na cena. Uma tela a mais é outro bloco, e a regra
central do `CLAUDE.md` chama isso pelo nome.

---

### L-178 — o clima não muda o ELENCO da wave, só o que ela rende

**Registrada em:** 10/09/2026. **Bloco dono:** **1.33** — o 1.34 fechou a metade
visual em 25/09. **Estado:** ✅ **FECHADA no 1.33, 25/09/2026.**

> **Como fechou.** O motor recebe PREFERÊNCIAS por tipo (`elencoDoEstagio(pack,
> bioma, estagio, preferencias)`) e faz no máximo UMA troca por preferência: entra
> o favorecido mais fraco e novo da mesma raridade, sai o desfavorecido (ou o
> mais forte), e os chefes são recalculados. A noite mora no pack
> (`preferenciasDaNoite`), e o clima usa a MESMA tabela `climaIdle[].tipos` que
> já decidia o bônus — uma tabela para as duas perguntas, como esta lacuna
> pedia. A tradução hora/clima → tipos é camada 0 (`elenco-condicao.mjs`).
>
> **Medido:** 18 dos 44 estágios mudam à noite; sem condição, os 44 são
> idênticos à fixture `elenco-base.json`, fotografada ANTES de mexer no motor. A
> run guarda `regraElenco`; a run antiga fica no elenco-base até acabar. A sala
> de rotas mostra a noite (anel e lua no rosto que só sai de noite) e cala sobre
> o clima, que continua oculto até a run começar (L-177).
>
> **Uma regra da proposta caiu na medição:** tipo duplo NEUTRALIZAVA (veneno +
> inseto = 0), e com ela a Floresta nunca mudava de noite. Ficou "um tipo
> favorecido basta" — e é a regra que o jogador conhece: Oddish é da noite.
> Plantado como `S1025`.

> **Destravada em 25/09/2026.** O que a travava — *"alguém tem de decidir quem
> aparece na chuva"* — deixa de ser uma tabela escrita à mão: a condição
> REORDENA a escolha dentro do que já mora no bioma, pelo TIPO, como todo o
> elenco já é derivado. E o relógio que decide "noite" foi decidido pelo dono
> (DEC-10: Brasília). O cartão completo está em `docs/PROXIMO_BLOCO_1.33.md`,
> adotado da Revisão 2.0 e conciliado com o código.

A L-119 pedia buff de farm, e é isso que o 1.32 entrega. Mas o pedido do dono
sobre a trilha inteira diz mais:

> "o CLIMA muda o que aparece E como a luta acontece"

O **como** está de pé: a Chuva encurta as waves, e o véu e as partículas ficam
na tela enquanto isso acontece. O **o que aparece** não: o elenco do estágio
continua o mesmo com chuva ou sem.

**Por que ficou para o 1.33/1.34:** dia e noite pedem exatamente a mesma peça —
*"o elenco do estágio muda com a luz"* —, e construir duas vezes o mesmo
mecanismo de "condição que altera o sorteio do elenco" seria duas tabelas para
uma pergunta. Elas nascem juntas, ou nascem divergentes.

**O que a destrava:** o `elencoDoEstagio` passar a receber uma CONDIÇÃO
(clima, hora) e o pack declarar quem entra e quem sai em cada uma. É desenho de
conteúdo além de código — alguém tem de decidir quem aparece na chuva.

---

### L-179 — o Q2 encostou no teto de tempo do dono, e o número do `CLAUDE.md` mente em 3,5x

**Registrada em:** 14/09/2026, depois de um Q2 de **6 h 45 min** num clone limpo.
**Bloco dono:** T9 — o custo do portão (novo; proposto junto com esta lacuna).
**Critério de saída, fixado pelo dono:** **o portão completo em no máximo 30 min.**
Não é meta de conforto — é requisito, e ele disse com todas as letras que não
aceita nada diferente disso.

### A medição, e ela corrige duas coisas que estavam escritas errado

```text
aqui, a frio      405 min / 962 mutantes  =  25 s por mutante
documentado        68 min / 283 mutantes  =  14 s por mutante
```

A máquina de medição é 1,7x mais lenta; o portão é **3,5x maior**. 1,7 × 3,5 ≈ 6,
que é a diferença inteira. Duas conclusões saem daí:

**1. O `CLAUDE.md` anuncia 68 min para um portão que hoje custa ~4 h a frio na
máquina do dono.** O número foi medido com 283 defeitos e nunca foi refeito; são
987. É o D-059 outra vez, e desta vez na linha mais cara do arquivo.

**2. O caso QUENTE já está em ~24 min.** O `RETOMAR.md` registra do bloco 1.32:
*"99 reavaliados agora, 888 reaproveitados"*. 99 × 14,4 s ≈ 24 min. O dono não
pediu uma melhoria — ele percebeu que o portão acabou de encostar no limite dele.
No ritmo de crescimento atual (283 -> 987 em poucas semanas), o caso quente
estoura os 30 min dentro de um ou dois blocos.

### E o clone limpo não tem caso quente nenhum

```text
.gitignore:20    test/fixtures/q2-veredito.json
```

O cache de vereditos está fora do repositório. Quem clona paga as 4 h, sempre, na
primeira execução. É a terceira ocorrência do mesmo padrão no mesmo dia — junto
com o D-093 (linha de base visual) e o D-096 (a criação dela): **o que faz o
portão ser rápido e correto mora fora do repositório, e só existe na máquina do
dono.**

### As três propostas, em ordem de leverage

**1 · A cobertura dirige a seleção.** Hoje o cache pergunta *"algum arquivo do
fecho mudou?"* — pergunta de ARQUIVO. A pergunta exata é *"esta suíte executa a
linha mutada?"*, e isso é cobertura. `NODE_V8_COVERAGE` é built-in do Node, zero
dependência: uma execução instrumentada diz, por defeito, quais suítes tocam
aquela linha.

> Suíte que não executa a linha **não pode** pegar o mutante. É dedução, e é a
> mesma lógica de "só pode condenar" que a onda 1 já usa — não é amostragem, e
> por isso continua fechando bloco.

De 139 suítes por mutante para 1–3. Ataca o multiplicador dos **dois** casos.

**2 · Um navegador, recarga em vez de relançamento.** A cauda cara é a dos
mutantes que precisam de Chromium. Hoje cada um custa caixa de areia + processo
novo. O servidor de teste pode substituir os bytes de UM arquivo em memória e a
página recarrega — segundos em vez de dezenas.

**3 · Versionar o cache de vereditos.** O comentário do `.gitignore` justifica a
exclusão com *"é medição local e muda a cada execução"*, e isso merece ser
contestado: o veredito é função de **(definição do defeito, conteúdo do arquivo,
fecho da suíte)** — as três moram no repositório. Diferente da linha de base
visual, aqui nada depende da máquina. Se a análise se confirmar, todo clone nasce
com o caminho quente.

### O primeiro passo é MEDIR, e isso é parte do escopo

Duas vezes em 14/09 eu raciocinei em cima de número documentado que estava velho.
O bloco **começa** decompondo os 25 s por mutante:

```text
quanto é montar/preparar a caixa de areia
quanto é rodar suíte que não tinha como pegar aquele defeito
quanto é Chromium subindo, por mutante
```

Sem essa decomposição, "cobertura resolve" é palpite. Com ela, dá para dizer qual
das três entrega os 30 min sozinha — e construir só essa.

**O que a destrava:** nada. É trabalho de arnês, sem dependência de conteúdo nem
de decisão do dono além do limite que ele já fixou.

---

### L-180 — dois `elencoDoEstagio` no motor, com significados diferentes

**Registrada em:** 25/09/2026, conciliando o cartão 1.33 com o código.
**Bloco dono:** o bloco que mexer no sorteio da EXPEDIÇÃO — até lá, o 1.33
apenas não toca o homônimo. **Estado:** aberta.

`engine/elenco-estagio.mjs` exporta `elencoDoEstagio(pack, biomaId, estagio)`: o
elenco das waves do Avanço, 4 comuns + 2 candidatos a chefe. `engine/expedicao.mjs`
exporta OUTRA `elencoDoEstagio(pack, bioma, elenco, estagio)`: a lista filtrada
por raridade das expedições. Mesmo nome, assinaturas e respostas diferentes.

Não é defeito hoje — cada módulo importa a sua. É uma armadilha: quem importar a
errada recebe outra lista, **sem erro nenhum**. Achei ao conferir o cartão, e
por um instante li como defeito; conferir antes de afirmar foi o que evitou
registrar um falso.

**O que a fecha:** renomear a da expedição (`especiesDaExpedicao`, por exemplo)
no bloco que já estiver mexendo nela, com os defeitos plantados realvados.

---

### L-181 — a chave do cache do Q2 não inclui a versão do Chromium

**Registrada em:** 25/09/2026 — REV-12 da Revisão 2.0, conferido: **procede em
parte.** **Bloco dono:** nenhum agora. O arnês está CONGELADO (`CLAUDE.md`, 16/09):
isto entra quando IMPEDIR alguma coisa. **Estado:** aberta.

A chave já inclui `process.version`. Não inclui a versão do navegador que as
suítes visuais usam. Trocar o Chromium sem mudar nenhum arquivo deixaria o portão
reaproveitar um `PEGOU` julgado por outro navegador.

**O que a destrava:** uma troca de Chromium acontecer. Até lá, a mitigação é
manual e custa uma linha: ao trocar o navegador, rodar `npm run sabotagem:completo`.

---

### L-183 — o veterano quase não vê a noite: 2 das 11 rotas mudam no estágio 4 ✅ FECHADA (no teto do conteúdo)

**Registrada em:** 25/09/2026, na captura da sala de rotas do 1.33. **Bloco
dono:** **1.32b** — o bloco que ensina ao jogador que as condições existem é o
que precisa de uma condição que ele consiga ver em todo estágio. **Estado:**
✅ **FECHADA em 25/09/2026, na ST-2.3 — no teto que o conteúdo permite.**

> **Medido e decidido.** Um quarto tipo sozinho leva o estágio 4 a no máximo 3
> de 11 (fada, elétrico ou voador); combinações não passam de 3. A outra saída
> desta ficha — "aceitar a troca na faixa vizinha" — é vetada pelo invariante 3
> do cartão 1.33 (a troca não muda a raridade do slot). **Fada entrou**, porque
> Clefairy é o Pokémon da lua e a sala diz "quem tem a lua só sai a esta hora":
> 6·7·3·2 → **7·8·3·3**. Passar de 3 no estágio 4 pede ESPÉCIES noturnas raras
> (outro pack, outra geração), e não regra nova. Teste: `elenco-estagio` cobra
> ≥ 3 de 11 em todo estágio; defeito S1064.

**Medido:** 18 dos 44 estágios mudam à noite, mas concentrados no começo:

```text
estágio 1    6 de 11 rotas mudam      estágio 3    3 de 11
estágio 2    7 de 11                  estágio 4    2 de 11  (ruína, estufa)
```

A causa é de conteúdo, e não de motor: o estágio 4 é a faixa raro/muito raro, e
Kanto tem poucos fantasmas, venenosos e psíquicos nela que ainda não foram
usados nos estágios anteriores. Quem está no estágio 4 — o jogador que mais
tempo passa na sala — é o que menos vê a regra que o dono pediu VISÍVEL.

**Por que não cabe no 1.33:** mudar a tabela da noite é balanceamento de
conteúdo, e o 1.33 fechou a peça; mexer nos tipos agora seria recalibrar o que
acabou de ser medido, no mesmo bloco que o mediu.

**O que a destrava:** medir, por estágio, quantos candidatos cada tipo teria
(o 1.33 deixa isso a uma linha de `elencoDoEstagio` por tipo), e decidir com o
número se a noite ganha um quarto tipo ou se o estágio 4 aceita a troca na faixa
vizinha.

---

### L-184 — a fauna de cenário do idle não sabe que é noite

**Registrada em:** 25/09/2026, pela regra "o cenário do idle nunca está pronto".
**Bloco dono:** **o do CENÁRIO** (o mesmo da L-175). **Estado:** aberta.

O 1.33 fez a WAVE ficar noturna — os mobs da run que começou de noite são outros.
Mas os moradores de ENFEITE do cenário (`fauna.mjs`, lidos do pack) são os
mesmos às 14h e às 2h: o Psyduck continua na margem, acordado, sob a lua. É a
tela que o jogador deixa aberta por horas, e a noite nela é só luz.

**O que a destrava:** o pack declarar, por morador de enfeite, se ele dorme
(quadro parado, olhos fechados) ou se é trocado por um noturno — pela mesma
`preferenciasDaNoite` que o elenco já usa, para as duas nunca discordarem.

---

### L-182 — DEC-11: manter os 154.000 sims?

**Registrada em:** 25/09/2026, saída da conferência do REV-03. **Dono da
decisão:** o dono do projeto — é econômica. **Estado:** aberta, esperando veredito.

O argumento que justificava os 154.000 sims — *"viés de convexidade de +19,22%,
o dobro da margem"* — era conta errada (ver as notas de correção na Spec §4.4.3 e
no estudo de economia §4.1). O viés real é 0,31%. **E eu repeti o número errado
ao dono em 16/09**, quando ele perguntou se os testes precisavam de tantas
simulações.

O que resta como justificativa é o RUÍDO: erro-padrão relativo de ~5,5% no pior
lutador com 20.000 sims, ~2,0% com 154.000. Ruído não custa margem a quem aposta
sem informação; custa contra quem SELECIONA o lutador sobrepago calculando o `p`
verdadeiro fora do jogo.

**Opções:** manter 154.000; reduzir (servidor e testes mais baratos, ruído maior);
ou reduzir só na captura visual, que não julga odd nenhuma — a ideia do dono de
16/09, que vale ~5 s por largura.
