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

