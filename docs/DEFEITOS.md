# Registro de defeitos

Defeitos encontrados pelo arnês e ainda não corrigidos, com o bloco a que
pertencem. Um defeito só sai desta lista quando o bloco dono fecha.

A disciplina de blocos proíbe corrigir fora de escopo — ver
`POKEARENA_BUILD_BLOCKS_v1.1.md`, seção 2. Este arquivo é onde o achado fica
enquanto espera o bloco certo.

---

## D-001 — o caminho rápido do motor perde o vencedor em varredura por tempestade ✅ CORRIGIDO

**Encontrado por:** F0.1, invariante I8 · **Corrigido em:** F0.2
**Gravidade:** baixa em magnitude, alta em princípio
**Testes que travam a regressão:** `test/invariantes.mjs` → `D-001` (duas asserções) e `test/paridade.mjs`

### O que acontece

`simulate(fighters, seed, false)` — o caminho rápido, usado pelas simulações de
Monte Carlo que produzem as odds — devolve `-1` quando um carimbo de tempestade
abate os últimos lutadores vivos no mesmo instante.

`simulate(fighters, seed, true)` — o caminho de gravação, que produz a batalha
que o jogador assiste — devolve um vencedor válido para a **mesma seed**.

### Causa

No ramo da tempestade, o desempate percorre o vetor `hits`:

```js
let w = -1, bp = -1;
for (const h of hits) if (h.beforePct > bp){ bp = h.beforePct; w = h.i; }
return record ? {winner:w, events:ev, duration:t} : w;
```

Mas `hits` só é alimentado dentro de `if (ev)`, e `ev` é `null` quando
`record === false`. No caminho rápido o vetor chega vazio, o laço não executa,
e `w` permanece `-1`.

### Consequência

Medido em 200.000 simulações: **0,034%** delas devolvem `-1`. O
`computeOdds` do protótipo descarta a amostra em silêncio (`if (w >= 0)`).

A magnitude é pequena, mas a natureza não: o descarte **não é aleatório**. Ele
remove exatamente as rodadas que terminam em varredura simultânea, e nessas
rodadas a batalha exibida *tem* vencedor. Os dois caminhos discordam.

Isso contradiz diretamente o princípio declarado do projeto — as odds saem das
20.000 simulações do *mesmo motor* que roda a luta. Hoje não saem: saem de um
motor que, numa fração das vezes, não concorda com o que aparece na tela.

### Como foi corrigido em F0.2

O desempate deixou de depender de `hits` e passou a ser acompanhado em duas
variáveis soltas (`ultimoIdx`, `ultimoPct`) dentro do mesmo laço. Correto nos dois
modos, e **sem alocar nada no caminho quente** — que era o motivo de `hits` só
existir sob `ev`.

**Goldens e baseline não mudaram**, ao contrário do que se previa. O modo gravação
já preenchia `hits`, então só o caminho rápido tinha comportamento errado. A
previsão de "muda comportamento agregado" estava errada, e é bom que a suíte tenha
provado isso em vez de a gente confiar na previsão.

Evidência da correção:

```text
seed 3846931268   rápido -1 -> 11   gravação 11
seed 3582205302   rápido -1 ->  5   gravação  5
seed 3060347309   rápido -1 ->  1   gravação  1
50.000 amostras   nenhum -1
```

Os testes agora afirmam a correção. Reverter o desempate é a sabotagem S7 e é
detectada por invariantes, estatística e paridade.

---

## D-002 — o nome exibido é usado onde se espera o slug, e quebra o resgate de imagem ✅ CORRIGIDO

**Encontrado por:** F0.3c, na primeira execução do portão Q5 · **Corrigido em:** F0.3d
**Gravidade:** baixa em impacto, alta como sinal
**Teste que registra:** `test/visual.mjs` → lista `CONHECIDOS`

### O que acontece

`dexImg(dex, slug, extra)` monta uma cadeia de espelhos e termina no Showdown,
que indexa por nome. O último elo faz `showdownSlug(slug)`.

`showdownSlug` remove hífens e **não remove apóstrofos, acentos ou espaços** —
ela foi escrita para receber o slug cru da PokeAPI, não o nome exibido.

**Correção do próprio registro.** Ao consertar, contei os chamadores de novo: eram
**dois** passando `m.n` de uma lista onde `n` é o slug cru — corretos — e **um**
passando `r.f.n`, que é o nome exibido. O registro original dizia "quatro
chamadas" e estava errado; o defeito real era de um lugar só.

```text
killfeed.mjs   dexImg(r.f.dex, r.f.n)              ← ERRADO: nome exibido
index.html     dexImg(m.dex, m.n, …)               ← ok: m.n é slug cru
index.html     dexImg(b.dex, slugDoDex(b.dex), …)  ← ok
```

Consequências, em ordem de visibilidade:

| Espécie | `showdownSlug(nome)` | Efeito |
|---|---|---|
| Farfetch'd | `Farfetch'd` | o apóstrofo fecha a string JS do `onerror` embutido → **SyntaxError**, e a cadeia de resgate morre. A imagem fica quebrada em vez de cair para o espelho |
| Nidoran♀ / ♂ | `Nidoran♀` | URL inválida; o último espelho nunca funciona. Silencioso |
| Mr. Mime | `Mr. Mime` | idem |

### Por que estava invisível

Nenhum teste estático pega: o erro só existe quando a imagem falha **e** a
espécie tem caractere especial no nome. As três espécies afetadas aparecem em
~4% das pools. Foi o portão Q5 — `pageerror` num navegador de verdade — que
achou, na primeira vez que rodou.

### Como foi corrigido em F0.3d

Duas camadas, e as duas importam:

1. **O chamador.** O killfeed passa `r.f.sp`, que é o slug, no lugar de `r.f.n`.
2. **A função.** `showdownSlug` passou a descartar tudo que não seja `[a-z0-9]`,
   não só hífen. Para as 146 espécies do pack a saída é **idêntica** — medido,
   zero diferenças — então goldens e fixtures não mudaram. O que muda é o que
   acontece quando alguém passa a coisa errada: agora degrada em URL inútil em
   vez de quebrar a sintaxe do handler.

A primeira conserta o caso; a segunda impede o próximo chamador de repetir.
Saiu da lista `CONHECIDOS` de `test/visual.mjs` — agora um apóstrofo escapando
volta a reprovar o portão.

---

## D-004 — o teste do corte por teto encheu a carteira por um campo morto ✅ CORRIGIDO

**Corrigido em:** F0.9, no commit seguinte
**Encontrado por:** execução repetida do portão Q5 depois de fechar o F0.9
**Gravidade:** o portão Q5 do F0.8 estava parcialmente cego, e o defeito entrou no repositório

### O que aconteceu

O teste `o corte por teto de payout aparece na tela`, escrito no F0.8, enchia a
carteira com `S.bal = preciso + 1000` antes de clicar no azarão.

O F0.9 **removeu `S.bal` do mundo**. A linha continuou existindo e virou
atribuição a um campo que ninguém lê: o saldo seguia em 1.000, a aposta saía em
1.000, e o teste só falhava quando o stake máximo do azarão passava de 1.000 —
ou seja, **dependia da odd sorteada naquela rodada**.

Medido: verde em duas execuções de cada três.

### Por que passou

Duas causas somadas.

A primeira é técnica: nenhum teste estático pega atribuição a um campo
inexistente de um objeto — `S.bal = x` é JavaScript válido. A varredura de
`test/carteira.mjs` proíbe **ler** `S.bal` nos módulos do app, e não olhava para
`test/`.

A segunda é de processo, e é minha: **fechei o F0.9 rodando o portão uma vez
só**. Um teste que passa em dois de três não se distingue de um teste que passa,
se ninguém rodar duas vezes.

### Como entrou no repositório

O comando de fechamento era `node test/run.mjs | grep -E "VERDE|VERMELHO" &&
git commit`. O `grep` casou com a palavra **VERMELHO** e devolveu sucesso, então
o `&&` seguiu e o commit aconteceu **com a suíte vermelha** — contra a regra
central do projeto. O erro foi meu, no encadeamento do comando, e está aqui
porque errar em silêncio é o que este arquivo existe para impedir.

### Correção

O teste passa a creditar pela API (`banco.creditarCompra`), que é o único
caminho que move dinheiro desde o F0.9. Três execuções seguidas do portão
completo: verde nas três.

**Fica como lacuna L-025** a varredura de `S.bal` alcançar também `test/`, e o
portão rodar mais de uma vez antes de fechar bloco.

---

## D-005 — o teste do relógio dependia da velocidade da máquina ✅ CORRIGIDO

**Corrigido em:** F0.11
**Encontrado por:** paralelizar a sabotagem — quatro execuções simultâneas
**Gravidade:** falso alarme, e falso alarme é caro: ele desqualifica o portão

### O que acontecia

O teste `a raiz não sai do relógio`, escrito no F0.5, esperava a virada do
milissegundo e então exigia **pelo menos 50 raízes tiradas dentro dele**:

```js
while (Date.now() === t0 && r.length < 2000) r.push(novaRaiz());
ok(r.length >= 50, `só ${r.length} raízes num milissegundo inteiro`);
```

Com a máquina livre, cabiam milhares. Com quatro sabotagens em paralelo,
cabiam **11** — e a suíte ficava vermelha com o código inteiramente correto.

### Por que isso é defeito, e não rigor

A propriedade afirmada é *"a raiz não sai do relógio"*. Quantas raízes cabem
num milissegundo não é propriedade do gerador: é propriedade da CPU. O teste
media a máquina e chamava aquilo de criptografia.

E o custo é maior que uma falha isolada: a sabotagem interpreta vermelho como
"o defeito plantado foi pego". Um teste que fica vermelho sozinho, sob carga,
transforma o relatório inteiro em ruído — foi assim que o S35 apareceu como
capturado no F0.9 sem o ser.

### Correção

A verificação passou a não ter orçamento de tempo. Tira 3.000 raízes anotando
o instante de cada uma, e afirma duas coisas independentes:

- raízes que compartilham o **mesmo instante lido** precisam ser diferentes;
- raízes **seguidas** não podem ficar próximas em valor — menos de 1 % a uma
  distância inferior a 2^16, contra ~0,003 % esperados por acaso.

Nenhuma das duas depende de quantas cabem num milissegundo.

---

## D-006 — a barra de XP do treinador novo é negativa ✅ CORRIGIDO

**Corrigido em:** porte da v1.0
**Encontrado por:** o trabalho paralelo da v1.0 — ver `docs/PORTE_v1.0.md`
**Gravidade:** cosmético, e visível para 100 % dos jogadores novos

### O que acontecia

```js
const xpParaNivel = n => Math.floor(100 * Math.pow(n, 1.5));
```

`xpParaNivel(1)` devolvia **100** em vez de 0. Como todo treinador nasce com
`xp: 0`, o cálculo de progresso dava:

| XP | O que a tela mostrava |
|---|---|
| 0 | NV1 **−100 / 182** (−54,9 %) |
| 50 | NV1 **−50 / 182** (−27,5 %) |
| 100 | NV1 0 / 182 (0 %) |

A primeira coisa que um jogador novo via no próprio perfil era uma barra
negativa.

### Por que passou por toda a Fase 0

Doze blocos, 214 testes, e nenhum olhava para o perfil. O que se testou até aqui
foi motor, semente, preço, exposição, carteira, assets e telemetria — as coisas
com dinheiro ou determinismo em jogo. **Defeito de tela precisa de teste de
tela**, e não havia nenhum.

Não é coincidência que quem o achou estava trabalhando na aparência: cada linha
de trabalho enxerga a classe de defeito que ela toca.

### Correção

```js
const xpParaNivel = n => (n <= 1 ? 0 : Math.floor(100 * Math.pow(n, 1.5)));
```

**Ninguém muda de nível com isso, e está provado por varredura completa.** O
outro uso de `xpParaNivel` é dentro de `nivelDe`, que chama sempre com `n + 1`
a partir de `n = 1` — a função nunca recebe 1 ali. Varridos os inteiros de 0 a
3.000.000 de XP: **zero divergências** de nível entre a curva antiga e a nova.

O denominador do nível 1 sobe de 182 para 282, que é o tamanho real dele: a
barra passou a ser honesta sobre quanto falta.

### O que mais saiu daqui

A curva estava dentro de `perfil.mjs`, que puxa `desafios → controles →
carteira → render` e abre um canvas. Testá-la exigia levantar meia interface, e
**defeito que exige teatro para ser testado é defeito que não é testado**. A
aritmética saiu para `app/modules/progressao.mjs`, sem import nenhum — mesmo
movimento de `sprites-dados.mjs` e `efeitos-dados.mjs` no F0.12.

---

## D-003 — o corte duro de tempo é suave ✅ CORRIGIDO

**Corrigido em:** F0.6
**Encontrado por:** F0.3d, ao escrever o teste da lacuna L-016
**Dono:** F0.6 (é o bloco que reexamina a distribuição de duração)
**Gravidade:** nenhuma hoje, mas contradiz uma invariante escrita na Spec
**Teste que afirma o defeito:** `test/invariantes.mjs` → `L-016 · o corte duro`

### O que acontece

A Spec §4.6 lista, entre as invariantes: *"nenhuma batalha excede hard cap"*.
O motor não cumpre.

O laço de `simulate()` avalia `t < CONF.MAX_TIME` **antes** de executar a ação.
A última ação pode ser agendada logo abaixo do corte e levar `t` para além dele
— até um intervalo de ataque depois, ou seja `BASE_CD` ajustado pela
velocidade do lutador.

Medido no cenário de imunidade mútua, com a tempestade desligada:

```text
CONF.MAX_TIME   56,00 s
duração real    56,47 s
```

### Por que ninguém viu

Duas camadas de sorte. Primeira: com a tempestade ligada, **nenhuma** das 10.000
rodadas do lote estatístico chega perto do corte — ela encerra tudo bem antes.
Segunda: o corte só é alcançável num empate por imunidade mútua, e o elenco de
Kanto **não produz esse empate** — o único Fantasma é Gengar, que é
Fantasma/Venenoso, e golpes Venenosos atingem Normal normalmente.

Ou seja: o caminho existe, é inalcançável em jogo, e por isso ficou sem
cobertura até alguém construir o cenário de propósito.

### Correção esperada em F0.6

Duas opções, e a escolha é de desenho:

1. **Truncar** — encerrar exatamente em `MAX_TIME`, descartando a ação que
   estouraria. Cumpre a invariante ao pé da letra e pode cortar um golpe no ar.
2. **Corrigir a invariante da Spec** — declarar que o corte é o instante a
   partir do qual nenhuma ação NOVA é agendada, e que a duração pode exceder em
   até um intervalo de ação. É o que o motor já faz, e é defensável.

A segunda parece mais honesta com o comportamento, mas é decisão de F0.6, não
deste bloco. O que não pode continuar é a Spec afirmar uma coisa e o motor
fazer outra.

### Como foi corrigido (F0.6)

**Escolhida a opção 1, truncar.** Um teto que não segura não é teto, e o nome já
dizia "hard". O laço descarta a ação agendada além do corte e a batalha encerra
em `MAX_TIME` exatos, com o desempate por % de vida que já existia:

```js
if (best >= CONF.MAX_TIME){ t = CONF.MAX_TIME; break; }
```

A opção 2 — reescrever a invariante — foi descartada porque trocaria uma
garantia forte por uma descrição do que o código fazia. Invariante que se
adapta ao código não é invariante.

**Nenhuma rodada do pack em uso mudou.** Os 20 goldens passaram byte a byte, o
que confirma a medição do F0.3d: com a tempestade ligada nenhuma batalha chega
perto do corte, e o caminho só era alcançável no cenário de imunidade mútua que
o elenco de Kanto não produz.

O teste que **afirmava o defeito de propósito** (`test/invariantes.mjs` → `L-016
· o corte duro`) ficou vermelho na hora da correção, como fora escrito para
fazer, e virou a invariante que a Spec §4.6 sempre pediu: `duration <= MAX_TIME`,
com igualdade exata no cenário construído. O defeito S36 planta a regressão.

---

## D-007 — os desafios diários emitem 6,5× o orçamento agregado ✅ CORRIGIDO

**Achado em:** V1.14 (fora do escopo — a pergunta era outra) ·
**Bloco dono:** **F1.10** · **Corrigido em:** pendências pós-F1.7

### O que estava quebrado

`app/modules/desafios.mjs` sorteava três desafios por dia e pagava cada um em
PC-B pelo campo `dia` (20/30/25/25/30/25/25/20, média 25):

```
3 × 25 × 7  =  ~525 PC-B por semana, por conta
```

O Estudo Econômico fixa `routine_pc_b_budget = até 80 PC-B/semana` como teto
**agregado**, dos quais a trilha de login usa até 50 e sobram **até 30 para
desafios**. Seis vírgula cinco vezes o agregado; **dezessete vezes e meia** o
sub-teto.

Não foi descuido: a calibragem de 75/dia é da v0.7 e estava comentada no próprio
módulo como decisão de UX — feita **antes** de o Estudo existir. Os dois
documentos se contradiziam e o código seguia o mais permissivo, que é sempre o
pior lado para errar numa economia.

### A DECISÃO, e ela era obrigatória

O verbete dava dois caminhos e exigia escolha explícita. **Escolhido o primeiro:
baixar a emissão.** O motivo é assimetria de evidência — o Estudo tem medição
(10 mil agentes × 52 semanas, emissão irrestrita levando a oferta de PC-B de
2,0 M para 26,4 M) e o código tem uma intuição de UX de duas versões atrás. Não
havia medição do outro lado para opor a essa.

> **Isto é reversível, e de propósito.** Se o dono do projeto preferir o segundo
> caminho — corrigir o Estudo com medição nova —, o que muda são três constantes
> em `engine/emissao.mjs` e os números do documento. O teste compara os dois e
> reprova se divergirem, então a troca não pode ser feita pela metade.

### O que mudou, e o custo de UX é real

Baixar 525 para 30 divididos por 21 conclusões daria **1,4 PC-B por desafio** —
poeira ao lado de uma aposta mínima de 50. **Recompensa que não se sente é pior
que recompensa ausente, porque ainda ocupa a tela.**

Então o PC-B **saiu do desafio** e foi para um **marco semanal**: doze conclusões
pagam o orçamento inteiro de uma vez. Mesma conta, mesma emissão, e a recompensa
volta a ser sentida — 30 PC-B chegando juntos é uma aposta mínima com sobra.

**O XP continua por desafio, sempre, sem teto.** Ele não é moeda.

### E o teto de saldo, que é o que segura o modelo

`soft_issuance_ceiling = 500` **não existia no código**, e é ele que faz a
simulação do Estudo estabilizar a oferta em ~5,35 M em vez de 26,4 M. Ele não é
teto de emissão: é teto de **saldo**. Acima dele o jogador para de receber moeda
e passa a receber substituto não monetário — *"quem gasta recebe reposição, quem
acumula não"*.

**A ordem importa e está testada:** o teto de saldo é conferido ANTES do
orçamento. Se o orçamento viesse primeiro, quem acumula continuaria recebendo — e
é exatamente esse jogador que o teto existe para parar.

O Estudo é explícito no tom: *"Nunca mostrar como se o usuário tivesse 'perdido'
uma recompensa; a substituição deve ser prevista na trilha."* A função devolve
sempre alguma coisa.

### O campo morto foi REMOVIDO, não zerado

`dia:` saiu do pool. Campo que ninguém lê é convite para alguém religá-lo, e
religar aquele campo é o D-007 inteiro de volta — multiplicado por 21 conclusões
por semana. Há teste (`D-007 · o pool não voltou a ter recompensa por conclusão`)
e defeito plantado (`S181`) para isso.

**E a tela deixou de prometer o que não paga:** o perfil dizia
`Recompensa: +60 XP e 💵 25` em cada desafio. Prometer por desafio um dinheiro
que só sai no marco seria a tela mentindo.

### Os testes

`test/emissao.mjs` (13 testes) — e o principal deles **lê o orçamento do
DOCUMENTO**, não uma cópia dele. Copiar o número para dentro do teste deixaria os
dois concordando entre si e discordando da fonte, que é literalmente como este
defeito nasceu.

`test/invariantes.mjs` → `D-007 · a emissão semanal cabe no orçamento`. Ele
reprova nos **dois sentidos**: emissão acima do orçamento (o defeito antigo) e
emissão **zerada** — a "correção" preguiçosa que faz o número caber apagando a
recompensa.

### O que isto destrava

**A L-026 e o V1.19.** O baú agora tem contra o que ser calibrado: sobram 30
PC-B/semana de orçamento de desafios, e o teto de saldo já existe para segurar
o que vier.

---

## D-008 — a aposta era contada a cada clique, não no fecho da janela ✅ CORRIGIDO

**Achado em:** V1.15, ao trazer o cancelamento · **Bloco dono:** V1.15 · **Corrigido no mesmo bloco**

`app/modules/fases.mjs` chamava `recordBetPlaced` dentro de `placeBet`, ou seja,
a cada clique. Trocar de lutador três vezes contava **três apostas** e
triplicava `totalBet` no perfil.

O defeito veio do v0.8 e é nosso. A v1.0 do porte já o tinha corrigido, movendo
a contagem para `startFight` — e é a correção certa, porque a aposta só é um
fato quando a janela fecha.

**Por que virou urgente agora:** o cancelamento do V1.15 piora o defeito de
"conta demais" para "conta o que não existe". Uma aposta cancelada entrava na
estatística do jogador e no total apostado.

**Correção:** `recordBetPlaced` saiu de `placeBet` e entra em `startFight`,
condicionada a haver aposta viva.

**Teste:** portão Q5 — três cliques (escolher, trocar, trocar) precisam contar
**uma** aposta. O defeito **S86** planta a regressão, e ele escapou da suíte
estática na primeira execução: quem conta é o fluxo, e só o navegador o percorre.

---

## D-009 — três dos dezesseis avatares de treinador nunca existiram ✅ CORRIGIDO

**Achado em:** V1.15, pelo portão de egresso fechado · **Bloco dono:** V1.15 · **Corrigido no mesmo bloco**

`leaf`, `agatha` e `lorelei` respondem **404** no endereço usado. Os arquivos
estão lá, sob `leaf-gen3`, `agatha-gen1` e `lorelei-gen1`.

**Como ficou escondido:** o `<img>` da grade tinha
`onerror="this.closest('.opt').remove()"`. A opção quebrada simplesmente sumia.
Ninguém via erro no console, e ninguém via os três avatares — a tela prometia
dezesseis e mostrava treze.

**Correção:** os ids apontam para o **mesmo personagem em outro endereço**, que
é a regra do resgate do `CLAUDE.md`. A diferença aqui é literal: não se trocou
Leaf por outro treinador, trocou-se o caminho do arquivo da Leaf.

**Achado de tabela:** o vazamento de rede que expôs isto existia desde antes —
`trainerURL` devolvia o endereço do Showdown cru, sem cascata, e o baixador não
conhecia a família. O portão do F0.12 nunca o viu porque abre o jogo **sem
sessão**, e sem sessão nenhum avatar é pedido. O banner de batalha do V1.15
passou a desenhá-lo já no boot, e as quatro requisições apareceram.

> **A lição é do F0.12 outra vez:** dependência que ninguém exercita não é
> dependência ausente — é dependência que ainda não foi vista.

---

## D-010 — um componente inteiro cabe sob o limite da linha de base visual ✅ CORRIGIDO

**Achado em:** V1.15 · **Bloco dono:** **T2** · **Corrigido no:** T2

### A medição original

O V1.15 acrescentou à tela da arena um card inteiro de colocação — doze linhas
com retrato, nome e estado. Medido contra a linha de base de então:

```
arena@largo      média 0,85   pico  56
arena@medio      média 0,01   pico   3
arena@estreito   média 0,00   pico   0
```

O limite do portão era `média > 3` **ou** `pico > 60`. **Um componente inteiro
passou 7 % sob o limite.**

### O que NÃO era o defeito

Não era cegueira à periferia, e valeu corrigir o diagnóstico porque a primeira
versão deste verbete dizia isso. Uma mudança **grosseira** na mesma coluna —
cinco colunas da amostra achatadas em cinza — marcava **pico 123** e reprovava.
O portão enxergava a lateral.

### O que ERA o defeito

Ele não separava **componente novo** de **ruído de renderização** quando o
componente respeita a paleta em volta. E respeitar a paleta é exatamente o que
um card bem desenhado faz: fundo de painel, texto em `--dim`, mesma borda. Num
quadro de 32×32, um card assim mexe poucos pixels e mexe pouco em cada um — e a
média da tela inteira dilui o pouco que ele mexe em muito que ele não mexe.

Somava-se a segunda metade: **as larguras**. A linha de base capturava em 1440,
1100 e 700 px, e o `.app` da arena tem `max-width: 1560px` — o arranjo completo,
com as goteiras dos dois lados, não existia em nenhuma largura capturada. Medido:
mexer no próprio `max-width`, que reposiciona uma coluna inteira, movia a digital
em **média 0,03 · pico 2**.

### A correção, metade 1 — a comparação passa a ser por REGIÃO

A digital continua 32×32 em RGB; o arquivo não cresceu. O que mudou é que ela é
comparada em **8×8 regiões de 4×4 px**, cada uma com o seu próprio limite. Um
componente ocupa uma região; medir por região é medir onde ele está.

A grade e o limite são **medidos, não escolhidos**. Duas capturas da mesma
interface, quatro larguras, quatro telas:

| grade | pior média de região (ruído) | mesma métrica no componente do V1.15 |
|---|---|---|
| 1×1 | 0,04 | 0,82 |
| 2×2 | 0,07 | 1,75 |
| 4×4 | 0,15 | 3,50 |
| **8×8** | **0,38** | **7,00** |

A 8×8 é a que mais separa: **18× entre ruído e sinal**. O limite de `média de
região > 2` fica 5× acima do ruído medido e 3,5× abaixo do sinal — folga dos
dois lados, que é o que impede tanto o falso positivo quanto o afrouxamento
silencioso.

E o relatório passa a dizer **onde**: `arena@largo: 8 de 64 regiões fora — região
7,2 (média 7,0, pico 56)`. Isso é diagnóstico; `média 0,9` era um número.

### A correção, metade 2 — uma quarta largura, acima do `max-width`

`panoramico` (1920×1000) fica acima dos 1560 px em que o `.app` para de crescer.
A linha de base foi de 12 para 16 telas.

O teste que garante isso **lê o `max-width` do CSS de verdade** em vez de repetir
o número: quem subir o `max-width` amanhã encontra o teste vermelho, e não uma
cobertura que calou.

### O limite de pico saiu, e a medição é que o tirou

O plano era apertar o pico de 60 para 30 (o pior pico de ruído observado foi 3).
A sabotagem mostrou que ele virara **botão morto**: numa célula de 4×4 px são 48
valores, e um único pixel mexendo 33 pontos já leva a média da região a passar de
2 — a faixa exclusiva do pico seria um pixel entre 30 e 32. Devolver o pico a 60
não acendeu teste nenhum. O número continua no relatório — diagnóstico não é
limite —, mas deixou de ser portão.

### Os testes, e por que são três

Em `test/portao.mjs`, e andam juntos de propósito:

1. **`um componente inteiro na coluna lateral reprova`** — a magnitude medida do
   V1.15 (média global 0,85 · pico 56), que agora tem que ser pega. É o teste que
   afirmava o defeito, com a afirmação invertida.
2. **`um componente em paleta quase idêntica reprova`** — nasceu **da
   sabotagem**. Pôr `GRADE = 1` deixou o teste 1 vermelho mesmo assim: quem o
   pegava era o pico, não a grade, e a grade estava passando sem prova. Este é o
   caso que **só ela** pega — um bloco de 8×4 px em Δ22, invisível ao portão
   antigo (média global 0,7, pico 22) e média 22 na região.
3. **`ruído de renderização não reprova`** — o preço dos outros dois. Apertar o
   limite até tudo reprovar passaria os dois primeiros sozinho, e é exatamente a
   sabotagem que o T2 declarou. O ruído no formato medido tem que continuar
   passando.

Em `test/visual.mjs` → `suiteBase`: `alguma largura capturada fica acima do
max-width do .app`.

---

## D-011 — a tela diz 20.000 simulações; o motor roda 154.000 ✅ CORRIGIDO

**Achado em:** inspeção visual pós-V1.15 · **Bloco dono:** **F0.7** (é dele a
mudança que deixou o texto para trás) · **Corrigido no:** T2 (junto com o D-010,
por serem o mesmo defeito de método: número copiado envelhece)

O F0.7 subiu `CONF.SIMS` de 20.000 para **154.000**, dimensionado pela cauda
(§4.4.2) — e o texto da interface ficou onde estava. Cinco lugares visíveis, não
quatro; o quinto só apareceu com a varredura:

```
app/index.html  boot .............. "simulando 20.000 batalhas…"    VISÍVEL
app/index.html  home .............. "odds calculadas por 20.000…"   VISÍVEL
app/index.html  como funciona ..... "roda 20.000 batalhas…"         VISÍVEL
app/index.html  regras ............ "vem de 20.000 simulações…"     VISÍVEL
navegacao.mjs   cartões da home ... "20.000 simulações/odd"         VISÍVEL  <- este
+ sete comentários de código em app/ e engine/
```

### Por que isto era grave neste projeto especificamente

O painel da rodada mostra **"154K SIMS · CASA 8.0%"** ao lado das odds, e o
painel de ADM publica `SIMULAÇÕES 154.000` no registro do §4.4.5. Ou seja: a tela
de Regras afirmava um número e a tela da arena afirmava outro, na mesma sessão.

**"Odd auditável" é a promessa escrita na tela de Regras.** Uma página que erra o
número da própria auditoria gasta exatamente a confiança que o produto usa como
diferencial — e o §P1 põe transparência como pilar, não como enfeite.

### A correção: a página deixou de ter o número

Trocar os cinco textos teria sido trabalho de minutos e teria durado até a
próxima vez que a constante mudasse. O que não dura é o número copiado; o que
dura é a página não tê-lo.

`app/modules/sims.mjs` (camada 0) lê `CONF.SIMS` e preenche os marcadores
`<b class="sims"></b>` no boot, antes de qualquer tela — inclusive a de boot, que
é a primeira que o jogador lê. `data-sims="k"` pede a forma curta.

Os comentários de código que afirmavam 20.000 como fato de hoje passaram a citar
`CONF.SIMS` ou a omitir o número. Os que registram **história** ficaram: "os
20.000 herdados da base v0.8 dimensionavam a faixa média" é medição datada, e
medição datada não envelhece.

### Os testes, e por que são três

1. `test/conteudo.mjs` → **`nenhum texto visível redigita o número de
   simulações`**. Varre `app/index.html` fora de `<script>` e de comentário, e
   todos os módulos de `app/modules/` fora de comentário. Ficou **vermelho** na
   primeira execução, com os quatro trechos do HTML.
2. `test/conteudo.mjs` → **`as quatro telas que citam o Monte Carlo trazem o
   marcador`**. O outro lado: proibir o número redigitado é passado com louvor
   por uma página que apagou a frase inteira.
3. `test/visual.mjs` → **`o número de simulações na tela é o que o motor roda`**.
   O Q5, e é o que prova a peça: um marcador que ninguém preenche passa nos dois
   testes estáticos e deixa a página com um buraco onde estava a promessa de
   auditoria. **Testar a declaração não testa a peça** — a lição do S30, S53,
   S65, S69, S77, S78, S86 e S89, agora também aqui.

> Ele conta **três** marcadores vivos, e não os quatro do HTML: o quarto mora
> dentro do `#boot`, que é removido assim que a primeira rodada fica pronta.

---

## D-012 — a tela de resultado comemorava retorno igual ou menor que a aposta ✅ CORRIGIDO

**Achado em:** F1.9, ao implementar o §28.5 · **Bloco dono:** **F1.9** · **Corrigido no:** F1.9

O `BUILD_BLOCKS` do F1.9 chamava este caso de "o caso que hoje não existe". Ele
existe:

```
aposta 30 · odd 1,03 · floor(30 × 1,03) = 30
```

O jogador acerta o campeão, recebe exatamente o que apostou, e a tela mostrava
troféu, saco de dinheiro, confete e **`+PC 30`** em corpo grande. É a *perda
disfarçada de ganho* que o §28.5 existe para nomear, e ela chegou por aritmética,
não por desenho.

A condição da festa era `S.myBet.idx === S.champ` — **"acertei o campeão?"**. A
pergunta certa é **"eu ganhei dinheiro?"**, e as duas só coincidem enquanto toda
odd for maior que 1. Não são: o mercado mútuo do V2 tem odd abaixo de 1 por
construção sempre que o bolo se concentra num lutador.

### A correção

A decisão saiu da tela e virou `engine/resultado.mjs`, com uma pergunta só —
`comemora: liquido > 0`. A tela de resultado, o KillFeed, o histórico e a
carteira passam a ter uma fonte; a quarta superfície, que ainda vai ser escrita,
nasce certa.

Uma terceira tela nasceu para o caso — **acertou e não ganhou** —, sem
coreografia, com o líquido em destaque e o bruto em segundo plano, e sem
nenhuma variante de "quase lá" (o §28.7 proíbe linguagem que sugira que o
resultado é influenciável).

**A Spec foi corrigida no mesmo commit.** O §28.5 dizia "retorno menor que o
valor apostado"; passou a dizer "menor **ou igual**".

### O teste que trava

`test/resultado.mjs` — `retorno IGUAL à aposta não comemora` e `retorno MENOR
que a aposta não comemora`. Mais duas varreduras estáticas sobre
`app/modules/fases.mjs`: a tela precisa chamar `resultadoDaAposta`, e **nenhum
`dropConfetti` pode existir num caminho que não consultou `comemora`**. Defeitos
plantados: `S195` (a condição volta a ser o palpite), `S196` (a fronteira vira
`>= 0`) e `S197` (o bruto volta ao destaque).

---

## D-013 — o teste do cooldown comparava a constante consigo mesma ✅ CORRIGIDO

**Achado em:** F1.8, pelo portão Q2 · **Bloco dono:** **F1.8** · **Corrigido no:** F1.8

Vinte testes cobriam a assimetria do §28.3 e nenhum via o cooldown encolher,
porque todos escreviam a mesma coisa:

```js
ok(r.efetivoEm >= c.agoraDe() + COOLDOWN_MS)   // importado de limites.mjs
```

O defeito plantado `S186` troca `24 * 60 * 60 * 1000` por `24 * 60 * 1000` — 24
minutos. A constante encolhe, o teste encolhe junto, e os dois continuam
concordando. **A suíte inteira ficou verde com o cooldown do §28.3 valendo 24
minutos.**

É a mesma classe do **D-007**: dois lugares concordando entre si e discordando
da fonte. Lá era o código contra o Estudo Econômico; aqui é o teste contra a
Spec.

### A correção

Um teste que lê o número **do documento**, como `test/emissao.mjs` faz com o
Estudo:

```js
const m = spec.match(/aumentar limite\s*->\s*pedido registrado \+ cooldown de (\d+)\s*h/);
igual(COOLDOWN_MS, Number(m[1]) * 60 * 60 * 1000);
```

Se a âncora sumir do documento, o teste reprova em vez de passar vazio.

---

## D-014 — nada exercitava o caminho do settlement até o limite de perda ✅ CORRIGIDO

**Achado em:** F1.8, pelo portão Q2 · **Bloco dono:** **F1.8** · **Corrigido no:** F1.8

`max_loss` conta perda **líquida**. Dezenove testes chamavam `registrarPerda`
direto com o número certo e provavam que a função soma direito — e nenhum
provava que **alguém a chama com o número certo**.

O defeito `S193` troca, no settlement, `t.stake - retorno` por `t.stake`. O
jogador aposta 1.000, ganha 1.850, e o limite de perda diária de 200 passa a
bloquear a próxima aposta: perda contada por VOLUME, que é exatamente o que a
Spec §28.3 escreve para não fazer. **Passou verde.**

> **Testar a peça não testa o encaixe.** Terceira vez que esta frase entra
> nestes documentos — F1.4, F1.7 e agora F1.8.

### O teste que trava

Dois, e o segundo é o contrapeso do primeiro:

- `a VITÓRIA no settlement não conta como perda no limite diário` — aposta de
  verdade, rodada de verdade, `liquidarRodada` de verdade, e a avaliação do
  limite depois;
- `a DERROTA no settlement conta a perda inteira` — sem ele, um settlement que
  não lançasse **nada** passaria no primeiro.

---

## D-015 — a passada estreita da sabotagem dava PEGOU falso a todo defeito de navegador ✅ CORRIGIDO

**Achado em:** F1.13, ao conferir uma captura que não fazia sentido ·
**Bloco dono:** a mudança de estratégia do Q2 · **Corrigido no:** F1.13

`SABOTAGEM_ESTREITA=1` foi criado para a suíte visual rodar **uma** largura em
vez de quatro — 34 s em vez de 65 s por mutante. A linha de base gravada tem as
quatro. E dois testes da `visual-base` cobravam a base contra o número de
larguras **desta execução**:

```js
const esperado = 4 * LARGURAS.length;          // 4 na passada estreita
ok(Object.keys(base).length === esperado);     // a base tem 16 → VERMELHO
```

Resultado: **a `visual-base` ficava vermelha para qualquer mutante**, e a
sabotagem lia isso como captura. Todo defeito que sobrevivia às suítes sem
navegador ganhava um `PEGOU` — pelo motivo errado.

### Por que isto é pior que um PASSOU falso

Um `PASSOU` falso manda investigar. Um `PEGOU` falso manda seguir em frente, e
ainda **esconde os defeitos que de fato escapam**: um mutante que nenhuma suíte
pega volta como pego, e a cobertura que não existe aparece como cobertura.

Uma execução completa do Q2 foi reportada como `VERDE — 208/208` sob este
defeito. **Aquele veredito não valia**, e foi refeito.

### Como apareceu

Não foi um teste que pegou: foi conferir uma linha do relatório que não fazia
sentido. O `S212` — mutação na rota de aposta — voltou como pego por
`navegador: visual-base`, e mutar `server/rotas.mjs` não tem como mexer na
linha de base visual do cliente. Ao investigar, o `S212` também se revelou
**decorativo** (a mutação não tinha efeito nenhum), o que fechou o diagnóstico:
o `PEGOU` só podia ser falso.

### A correção

- `compararBase` ignora, **e só no modo estreito**, a largura que não foi
  capturada. Fora dele, captura ausente continua sendo falha;
- os dois testes que julgam a BASE GRAVADA passam a contar contra
  `LARGURAS_TODAS`, que é o que eles sempre quiseram dizer.

### O teste que trava

`test/portao.mjs` — `quem julga a linha de base gravada conta as quatro
larguras`, varredura estática das duas metades: quem julga a BASE conta contra
`LARGURAS_TODAS`, quem julga a CAPTURA conta contra `LARGURAS`.

A primeira versão do teste subia um processo filho com a suíte visual. Duas
coisas quebraram: no sandbox o filho herda `SEM_VISUAL=1`, a suíte não existe, o
`--so` aborta, e a linha de base do portão inteiro ficou vermelha; e, se
funcionasse, cobraria 35 s de navegador em toda execução barata — desfazendo o
que a mudança de estratégia do Q2 tinha acabado de comprar.

### A regra que fecha a CLASSE, e não só este caso

O portão validava UMA configuração como verde e JULGAVA em quatro. Nas três não
validadas ele acreditava em qualquer vermelho. Agora:

> **toda configuração usada para julgar precisa da própria linha de base verde.**

`garantirBase` valida cada configuração na primeira vez que ela é usada, numa
caixa de areia que nunca recebe mutante, e aborta nomeando a configuração
quebrada. É preguiçoso porque validar as quatro sempre custaria ~3 min e a
execução quente inteira leva 4.

Verificado com o mecanismo real: uma quebra plantada só na configuração estreita
fez o portão abortar com *"a suíte já está vermelha na configuração
com-golden/navegador-estreito, SEM nenhum defeito plantado"*.

### O que ele estava escondendo

Dois defeitos que **escapavam de verdade**, e voltavam como pegos:

- **S217** — o saldo inicial da rota divergindo do motor. A suíte de rotas nunca
  afirmava QUANTO uma conta nova nasce;
- **S215** — na versão original, decorativa (a chave de idempotência já era
  única por cadastro). Substituída pelo defeito que tem consequência: o grant
  caindo em `bonus` em vez de `transferivel`. Pelo §5.5 o payout herda a origem
  da stake, então a conta nunca mais teria saldo transferível — outra economia,
  sem ninguém ter decidido.

Os dois agora têm teste: `conta nova nasce com o saldo inicial do motor, em
transferível`, com o valor lido de `engine/carteira.mjs` e não copiado.

---

## D-016 — duas sondas de navegador mediam o relógio, e não o produto ✅ CORRIGIDO

**Achado em:** T4, pelo portão abortando · **Bloco dono:** **F0.10** (é dele a
sonda de colocação viva) · **Corrigido no:** T4

`test/visual.mjs` esperava por uma queda e então lia, no mesmo `evaluate`, duas
coisas:

```js
mortos:         (S.ents || []).filter(e => !e.alive).length,   // estado de AGORA
caidosNoQuadro: document.querySelectorAll('#pickList .pick.fechado').length,
```

Parece atômico e não é. `S.ents` muda **no instante** da queda; a lista só é
redesenhada no `requestAnimationFrame` seguinte. O que a igualdade comparava era
o estado de agora com o DOM do último quadro.

Na máquina do desenvolvedor os dois coincidem quase sempre. Sob a carga que o
**próprio portão** cria — quatro caixas de areia, cada uma com um Chromium — o
rAF atrasa, os dois divergem por uma queda, e a suíte fica vermelha sem nada
estar errado.

### Por que ele foi caro

O portão validou a configuração de navegador quando o primeiro mutante chegou
nela — e abortou ali, **aos 28 minutos**, com "a suíte já está vermelha na
configuração com-golden/navegador-completo".

O aborto está certo: é a regra do D-015 funcionando, e ela impediu 200 e poucos
`PEGOU` falsos. O que estava errado era o custo de descobrir.

### A correção, e o que ela NÃO enfraquece

A sonda passa a **esperar o quadro alcançar o estado** (8 s de teto) em vez de
comparar os dois num instante qualquer.

Isso preserva o que o teste existe para pegar. O defeito `S89` — a ordem de
quedas saindo do gancho que credita o abate — deixa o quadro **congelado**: ele
nunca alcança, e a espera estoura. Um quadro apenas um frame atrasado alcança em
milissegundos. A igualdade continua sendo afirmada **depois** de o quadro ter
alcançado, e ali ela não é mais sobre tempo: é sobre verdade.

### E o custo de descobrir também foi corrigido

Numa execução em que mais de 50 defeitos serão reavaliados, as três
configurações de julgamento são validadas **antes** do laço começar: ~100 s de
custo, e o erro volta em ~100 s em vez de 28 min. Numa execução quente, com
poucas reavaliações, a validação continua preguiçosa — pagar navegador para
validar uma configuração que ninguém vai usar seria desfazer o que o cache
comprou.

### A SEGUNDA sonda, achada pelo mesmo caminho

Com a primeira corrigida, o portão abortou de novo — agora na configuração
`navegador-estreito`, com `sem-rede` vermelha em duas afirmações: *"o jogo abre
com a rede externa desligada"* e *"a arte vem do disco, e é a mesma arte"*.

Ela passava sozinha, passava com as sete suítes de navegador juntas, e passava
numa réplica da caixa de areia. **Só falhava quando o portão a rodava** — e a
diferença é que ali há até cinco Chromiums vivos ao mesmo tempo.

A causa é a mesma em outra roupa: depois de esperar a lista de lutadores, a
sonda dormia **2,5 s fixos** e lia. Sob carga, os retratos ainda não tinham
terminado de carregar do disco, e a leitura media a máquina em vez do produto.

A espera agora é pela própria afirmação do teste — todo retrato veio de
`assets/` e tem largura natural. Se a arte NÃO vier do disco, que é o defeito
que a suíte existe para pegar, a condição nunca fecha e a espera estoura.

> **Relógio fixo mede a máquina; condição mede o produto.** Duas sondas caíram
> nisso, e as duas só apareceram porque o portão passou a validar cada
> configuração antes de julgar nela.

---

## D-017 — `npm run rapido` cobre 21 suítes das 35 que não precisam de navegador ✅ CORRIGIDO

**Achado em:** F1.14 · **Bloco dono:** **T5** · **Medido:** 261 de 596 testes

A lista está escrita à mão no `package.json`:

```
"rapido": "node test/run.mjs --so=golden,fonte-unica,estado,modulos,conteudo,
           carteira,banco,exposicao,assets,telemetria,commit,saida-v09,
           progressao,tema,arenas,portao,colocacao,banner,shiny,adm,semente"
```

Ela foi escrita quando o projeto tinha 21 suítes sem navegador. Hoje tem 35, e
as 14 que faltam são **todas as do servidor** — `servidor`, `auth`,
`banco-servidor`, `carteira-servidor`, `scheduler`, `transporte`,
`aposta-servidor`, `concorrencia`, `limites`, `protecao`, `resultado`, `rotas`,
`laco`, `sala-cliente`. Ou seja: o atalho que se usa durante a construção não
roda nada do que os últimos catorze blocos construíram.

**Por que isto é um defeito e não uma preferência:** o comando se chama
`rapido`, imprime `VERDE — 261/261`, e não diz que ficou de fora do que não
rodou. É exatamente o modo de falha que o `--so` tem e que o `S109` existe para
impedir — atalho que mente sobre o que cobriu. A diferença é que o `--so` grita
que foi parcial nas duas pontas, e o `rapido` não grita nada, porque ele não
sabe que é parcial: para ele aquela lista É o conjunto.

**Como se mede:** `npm run rapido` devolve 261; `npm test` devolve 596. A conta
não fecha por 335 testes, e nenhum dos dois números diz isso.

**Teste que trava:** nenhum, ainda. Um teste que afirmasse "a lista do `rapido`
tem toda suíte sem navegador" ficaria vermelho hoje — e é o T5 que o escreve,
junto com a correção, que é derivar a lista em vez de mantê-la.

**Por que não foi corrigido no F1.14:** é `package.json` e `run.mjs`, arnês
puro, fora do escopo de um bloco que muda o laço de jogo. E a correção certa
não é acrescentar catorze nomes à lista — é fazer a lista deixar de existir,
porque **derivar não pode dessincronizar**. Isso é um bloco, não um remendo.


**CORRIGIDO.** A lista deixou de ser escrita à mão: `--sem-navegador` roda tudo
que não está em `COM_NAVEGADOR`. Suíte nova entra sozinha.

Medido: a cobertura passou de **264 para 663 testes** na mesma execução — as
catorze suítes que faltavam eram as que nasceram depois de alguém escrever a
lista, exatamente como a lacuna previa.

E a derivação achou um defeito na primeira execução: `engine/rodada-digital.mjs`
importando de `content/`. A lista à mão o teria escondido, porque a suíte que o
pega não estava nela.
---

## D-018 — a raiz da rodada cabia num brute force ✅ CORRIGIDO no F1.15

**Achado em:** F1.14 · **Bloco dono:** **F1.15** (proposto no `BUILD_BLOCKS`
neste commit) · **Gravidade:** o mais grave que este projeto já registrou

> **Com a janela de aposta ABERTA, dá para saber o campeão.** Só com o que a
> rota pública devolve, sem sessão, sem privilégio, sem bug de implementação.

### A cadeia, e ela é curta

A raiz da rodada tem **32 bits** — `randomInt(0, 0xFFFFFFFF)` no servidor,
`crypto.getRandomValues(new Uint32Array(1))` no cliente. Dela descem os cinco
ramos do §P3 por `derivar()`, que é o finalizador do splitmix32.

`GET /api/rodada` publica os doze lutadores **enquanto a janela está aberta** —
tem que publicar, é a rodada. E os doze saem de `sortearPool(derivar(raiz,
'elenco'))`, um embaralhamento de Fisher–Yates sobre 76 espécies.

Doze de 76, ordenados, são cerca de **74 bits de informação** sobre um segredo
de **32**. A pool publicada não estreita o espaço da raiz: ela o **determina**.

```
pool publicada → busca as 2^32 raízes → a raiz → derivar(raiz,'batalha') → o campeão
```

### Medido, e não argumentado

```
raiz escolhida        12.345.678        (faixa baixa, para a demonstração caber)
pool publicada        99,134,42,94,128,136,139,53,57,114,126,91
raiz recuperada       12.345.678        em 10,2 s
campeão previsto      dex 94            com a janela ABERTA
odd publicada dele    1,94
```

Taxa medida: **1,21 M raízes/s num núcleo de JavaScript**. O espaço inteiro sai
em **~59 min num núcleo**, ~7 min em oito, e a busca é **embaraçosamente
paralela** — cada raiz é independente de todas as outras. Em C com SIMD são
minutos; numa GPU, segundos.

**E o custo é de UMA VEZ.** O mapa `sementeElenco → doze dex` não depende da
rodada. Quem o tabular uma vez responde qualquer rodada futura em tempo de
consulta. A janela de 30 s do §5.5 não protege nada contra alguém que fez o
trabalho ontem.

### O que isto quer dizer para o §4.5

O commit-reveal está implementado corretamente e é **decorativo**. Ele prova que
a casa não trocou o resultado depois — e não era essa a ameaça. A ameaça é o
apostador saber antes, e ele sabe.

Vale dizer o que **não** é a causa: não é o commit, não é o `comprometer()`, não
é o sal, não é o scheduler. Todos estão certos. A causa é o tamanho do segredo.

### A tentativa que este defeito matou antes de nascer

O F1.14 ia publicar `sementeElenco` e `sementeVisual` na abertura, para o
cliente montar a pool e a arena sem esperar o reveal. Medido antes de escrever:
**`misturar()` é bijetiva** — é o finalizador do splitmix32, e cada passo dele
se desfaz (o `+` subtraindo, o `imul` pelo inverso modular, o `xor-shift` por
iteração). Confirmado em 200.000/200.000 casos.

Publicar QUALQUER semente de ramo devolve a raiz em **O(1)**, sem busca nenhuma:

```
raiz real 3141592653 · recuperada de sementeElenco: 3141592653 · IGUAIS
```

Ou seja: a ideia trocaria uma hora de GPU por uma linha de aritmética. Ela foi
descartada, e o registro fica porque a próxima pessoa vai ter a mesma ideia.

### A correção, e por que ela é um bloco e não um remendo

**A raiz precisa sair de 32 bits.** 128 é o tamanho óbvio, e os ramos podem
continuar de 32 — o que quebra hoje não é a largura do ramo, é o fato de os
cinco descerem de um segredo estreito o bastante para ser varrido. Com raiz
larga, recuperar `sementeElenco` por força bruta continua possível e passa a não
servir para nada: ela não leva a `sementeBatalha`.

Isso toca `engine/seed.mjs`, `novaRaiz` nos dois lados, `derivar` (que precisa
de um hash de verdade, síncrono e sem dependência), `?raiz=` na rota de preço e
a paridade. É o **F1.15**.

**O alcance foi medido, e é menor do que a primeira leitura sugeriu.** O
`golden.json` não guarda raiz nenhuma — ele fixa *sementes de batalha*, que
continuam de 32 bits, e os 20 goldens byte a byte seguem valendo sem regravação.
As fixtures de medição (`margem`, `precisao`, `informacao`, `baseline`) são
agregados, e a distribuição dos ramos não muda. A coluna `round_seed_reveal` já
é TEXT. Isso derruba o bloco de G para **M**.

O cuidado que sobra tem número: `derivarIndice(raiz,'simulacao',i)` roda
**154.000 vezes por rodada** no `engine/preco.mjs`. O hash caro precisa rodar uma
vez por ramo, memoizado, e a expansão por índice continua sendo a mistura barata
de hoje — os 154.000 não são segredo, só precisam estar bem espalhados.

### Enquanto ele não fecha

**Nenhuma feature de valor econômico real pode ser ligada** — o §25.1 já dizia
isso, e agora há um motivo concreto e medido. O item entra na lista de saída da
v0.9 junto do L-012.

### ✅ Fechado no F1.15

A raiz passou a ter **128 bits**, em hex. Os ramos continuam de 32 — o que
quebrava não era a largura do ramo, era os cinco descerem de um segredo
varrível.

`derivar()` despacha **por tipo**: `number` segue no splitmix32, `string` vai
para SHA-256. A versão da raiz é o tipo dela, e é isso que mantém toda rodada já
publicada recalculável — §25.2 não pode quebrar retroativamente.

O que o bloco encontrou e que não estava previsto:

- **`(raiz >>> 0)` na mensagem do commit devolve 0** para raiz larga. Todo commit
  sairia sobre a raiz zero, igual em todas as rodadas — e conferiria, porque
  compromisso e verificação passam pela mesma função. Era o item nº 1 da
  sabotagem do bloco, vivo no código.
- **Essa linha estava DUPLICADA** em `engine/commit.mjs` e
  `server/scheduler.mjs`. Duas fontes para o formato do compromisso, com um só
  sintoma possível: uma auditoria que não fecha, meses depois. Agora é uma.
- **A rota de auditoria só aceitava raiz numérica.** As rodadas do esquema NOVO
  nasceriam inauditáveis, e a suíte inteira ficava verde porque nenhum teste
  pedia hex.
- **`lerRaiz()`**: a coluna é TEXT e cada leitor decidia sozinho como convertê-la.
  `Number('1bfd…')` é `NaN`, e o sintoma seria a auditoria acusando o servidor
  de ter mentido.

Os dois testes que afirmavam este defeito de propósito ficaram vermelhos quando
o bloco fechou — que era o combinado — e sumiram no mesmo commit. No lugar
deles entrou o ataque: dada a pool publicada, não existe busca que devolva a
raiz.

---

## D-019 — o servidor de produção importa um arquivo de `test/` ✅ CORRIGIDO

**Achado em:** F1.14 (lendo os pontos de contato do F1.15) · **Bloco dono:**
**F1.15** · **Gravidade:** latente — não quebra hoje

```
server/servidor.mjs:19    import { digital } from '../test/rodada-digital.mjs';
```

É a única ocorrência em todo o código de produção (`server/`, `engine/`,
`content/`, `app/`), e não existe guarda contra ela.

**Por que existe:** `rodada-digital.mjs` é um módulo legítimo e compartilhado —
ele reconstrói a rodada a partir da raiz e roda nos dois ambientes, Node e
Chromium, para o teste de determinismo. O comentário dele explica bem por que é
fonte única. O que está errado é o **endereço**: ele é código de motor morando
na pasta de teste, e a rota `GET /api/rodada/digital` o expõe em produção.

**Por que é latente e não vivo:** hoje o repositório inteiro é a unidade de
entrega — não há `Dockerfile`, `Procfile` nem campo `files` no `package.json`.
Um deploy que empacote o conjunto natural (`server/`, `engine/`, `content/`,
`app/`) falha no `import` antes de abrir a porta, e o sintoma aparece no
primeiro deploy real, que é o pior momento para descobri-lo.

**Efeito colateral que já custa hoje:** `test/` entra no fecho do
`server/servidor.mjs`. Mexer num arquivo de teste invalida veredito de defeito
plantado no servidor, sem que nada do servidor tenha mudado.

**A correção:** mover para `engine/rodada-digital.mjs`, que é onde ele mora
conceitualmente — reconstruir a rodada a partir da raiz é motor, não teste. E
vem com a guarda que faltava: **nada em `server/`, `engine/`, `content/` ou
`app/` importa de `test/`**. Sem a guarda, a próxima ocorrência nasce igual.

**Por que no F1.15 e não agora:** aquele bloco reescreve a assinatura de
`digital(raiz)` de qualquer forma — a raiz deixa de ser um número. Mover o
arquivo em outro commit faria o diff do F1.15 misturar a mudança de endereço com
a de tipo, e uma esconderia a outra.


**CORRIGIDO.** `test/rodada-digital.mjs` virou `engine/rodada-digital.mjs` —
reconstruir a rodada a partir da raiz é motor, não teste. E veio com a guarda
que faltava: **nada em `engine/`, `server/`, `content/` ou `app/` importa de
`test/`**, verificada em `test/modulos.mjs`. Sem a guarda, a próxima ocorrência
nasceria igual: o arquivo está ali, exporta o que se precisa, e importar dele
parece inofensivo.

**A mudança de endereço achou outra coisa.** A primeira versão importava o
ContentPack escolhido, e a suíte reprovou na hora: *o motor não importa nada de
`content/`* — a dependência é ao contrário, e é o §0.3 inteiro. Virou fábrica,
`criarDigital(pack)`, na mesma forma do `criarMotor(pack)` que já existia. Quem
chama liga o pack; o módulo continua sem saber de tema nenhum.
---

## D-020 — valor ilegível de limite virava PEDIDO DE REMOÇÃO ✅ CORRIGIDO

**Achado em:** F1.14, investigando por que o S211 escapava do portão ·
**Corrigido no mesmo commit** · **Spec §28.3**

```js
valor: corpo?.valor === null ? null : inteiro(corpo?.valor)
```

`inteiro()` devolve `null` para tudo que não é inteiro. E `null` é o sentinela
de **remoção** do §28.3. As duas coisas juntas, na mesma expressão:

| o cliente manda | o domínio recebia | o que acontecia |
|---|---|---|
| `valor: 500` | `500` | limite definido ✔ |
| `valor: '500'` | `null` | **pedido de remoção do limite** |
| `valor: 12.5` | `null` | **pedido de remoção do limite** |
| `{ tipo }` sem `valor` | `null` | **pedido de remoção do limite** |
| `valor: null` | `null` | pedido de remoção ✔ |

**A direção da falha é o que torna isto grave.** Quem manda um valor que a rota
não entende está tentando **se limitar**, e saía de lá com um pedido de
**afrouxamento** em andamento. O §28.3 exige que afrouxar seja deliberado —
pedido, 24 h de cooldown e confirmação ativa. "Não consegui ler o que você
mandou" não é decisão de ninguém.

**Latente com o nosso cliente, vivo na API.** `app/modules/protecao-tela.mjs`
valida antes de mandar (`Math.floor(Number(...))` e recusa não inteiro), então a
tela de hoje não dispara. Mas isto é uma API HTTP: outro cliente, um corpo
truncado numa retentativa, ou a tela de amanhã caem nele.

### Como apareceu, e o método que o revelou

O portão Q2 devolveu `S211 [PASSOU]` — o defeito que troca a leitura campo a
campo por `...corpo`. Ao medir se ele era explorável, o resultado veio ao
contrário do esperado: **com o defeito plantado o comportamento ficava MELHOR**
(400 em vez de remoção) em três entradas.

> Mutante que melhora o produto é sinal de que o código limpo está errado.

O S211 em si era **mutante equivalente** — `definirLimite` lê só
`{ userId, tipo, valor, agora }` e `validar()` já recusa valor não inteiro, então
os campos a mais do `...corpo` são ignorados. Quarta ocorrência da forma da
**L-038**. Ele foi reapontado para o guarda que a correção criou, e um defeito
novo (**S240**) cobre o outro lado: a remoção explícita não pode deixar de
funcionar.

### A correção

`null` explícito continua sendo remoção; qualquer outra coisa que não seja
inteiro positivo é **400**, com mensagem que diz como remover. Dois testes em
`test/rotas.mjs`: o caso ilegível (quatro entradas mais o corpo truncado) e o
contrapeso da remoção — sem ele, o teste seria satisfeito por uma rota que
recusa tudo.

---

## D-021 — testes apostavam valor fixo contra uma rodada de raiz aleatória ✅ CORRIGIDO

**Achado em:** F1.14, caçando a linha de base instável do portão ·
**Corrigido no mesmo commit**

O portão Q2 abortou com `a suíte já está vermelha` numa execução e passou verde
na seguinte, sem nada relevante ter mudado entre as duas. **Instável é pior que
vermelho** — vermelho tem endereço, instável escolhe quando aparecer, e escolheu
o pior lugar possível: a linha de base, que aborta o Q2 inteiro.

### A caça, e por que ela precisou de três etapas

`npm run repetir` na caixa de areia, 12 vezes: **1 vermelha em 11**, em
`[protecao] chasing é aumento de stake APÓS PERDA`. A suíte sozinha, 25 vezes:
todas verdes — ou seja, não era contenção nem ordem.

A única fonte de aleatoriedade ali é a **raiz da rodada**. Rodando o cenário do
teste 200 vezes com raízes de verdade, o sinal `chasing` nunca acendeu — mas
apareceram **15 exceções `teto_de_payout`**. O teste não capturava a exceção, e
o `ok()` que ele mostrava no relatório nunca chegava a rodar.

### A causa, medida

O teto de payout do §4.4.6 depende da **odd**, a odd depende da **raiz**, e a
raiz é sorteada. Apostar valor fixo é apostar contra o sorteio:

| valor | rodadas recusadas por `teto_de_payout` (de 300) |
|---|---|
| 50, 100, 200, 300 | 0 — 0,0% |
| 500 | 2 — 0,7% |
| 1.000 | 21 — 7,0% |

Dois pontos expostos em 20 chamadas com valor fixo: `test/protecao.mjs` (500) e
`test/limites.mjs` (1.000).

### A correção

`stakeQueCabe(sched, slot, desejado)` no arnês: o teste **pergunta à rodada**
quanto cabe, em vez de escolher um número. `stakeMax` já é publicado por
`paraCliente()` e é exatamente o número que o §4.4.6 usa para recusar.

E onde o valor importa para o que o teste mede, ele **declara o que precisa**:
o teste da perda cobra `perda > 200` antes de apostar. Medido em 3.600 slots, o
menor `stakeMax` foi **212** e cinco ficaram abaixo de 300 — cortar em
`stakeMax` quase nunca desce abaixo do limite, e "quase nunca" não é nunca. Sem
a afirmação, a rodada que aceitasse menos de 200 faria o teste medir outra coisa
**em silêncio**.

### O que fica de lição

Um teste que não captura exceção mostra no relatório a asserção que ele NÃO
alcançou. Foi por isso que a caça começou olhando `chasing` — um sinal que nunca
acendeu.

---

## D-022 — a sonda `sem-rede` espera o Monte Carlo e o teto media a máquina ✅ CORRIGIDO

**Achado em:** F1.15 (o portão abortou ao validar uma configuração) ·
**Corrigido no mesmo commit** · **Família do D-016**

O portão abortou assim:

```
ABORTADO: a suíte já está vermelha na configuração com-golden/navegador-estreito,
SEM nenhum defeito plantado.
  [sem-rede] o jogo abre com a rede externa desligada
      a fase de apostas não abriu sem rede
```

**O abort está certo, e é o D-015 funcionando.** `garantirBase` recusa julgar
numa configuração que já está vermelha — sem ela, todo defeito avaliado ali
voltaria `PEGOU` sem ter sido pego.

### O que foi medido

| condição | resultado |
|---|---|
| configuração estreita, isolada, 6× | 6 verdes |
| configuração estreita, com 4 laços de CPU, 3× | 3 verdes |
| dentro do portão | 1 vermelha |

Nove verdes e uma vermelha, sem reprodução fora do portão.

### A causa provável, e por que ela é específica

A espera aguarda `.pick` aparecer — e `.pick` só aparece depois de o cliente
terminar **154.000 simulações de Monte Carlo** dentro do Chromium, numa thread
só. O portão roda até **cinco Chromiums ao mesmo tempo**. O teto era de 90 s.

Laço de CPU em bash não reproduz isso: o escalonador reparte tempo, mas cinco
Chromiums disputam também memória e GPU de software.

### A correção, e as duas metades dela

**O teto não é medida de nada** — ele existe para o teste falhar em vez de
pendurar a suíte. Quem impede o portão de ficar pendurado é o teto por mutante
de 10 min que o F1.14 acrescentou; então este pode ser largo. 90 s → 240 s. Um
verde lento continua verde; um vermelho de verdade — o app que não abre sem
rede — não chega perto disso.

**E a mensagem passa a dizer quanto esperou.** `a fase de apostas não abriu` não
distingue "o app quebrou" de "faltaram dois segundos", e a diferença é toda a
investigação. Agora ela diz o número e o que ele significa.

É a terceira vez que o projeto paga por uma sonda de navegador cujo teto media a
máquina, e a segunda vez em dois dias que a correção é *dizer o número em vez de
adivinhar*.

---

## D-023 — sete Chromiums ao mesmo tempo, e o portão parou de terminar ✅ CORRIGIDO

**Achado em:** o portão Q2 completo do fim da Fase 1 · **Corrigido no mesmo
commit** · **Família do D-016 e do D-022, e desta vez a causa é outra**

O portão abortou na configuração `com-golden/navegador-estreito` — de novo, e
corretamente: `garantirBase` recusa julgar numa configuração vermelha.

### O número que não fechava

A mensagem que o D-022 acrescentou disse:

```
esperei 30.0 s
```

E o teto que o D-022 tinha posto era de **240 s**. Trinta segundos não é estouro
de tempo: é o **renderer morrendo**. `waitForFunction` rejeita por dois motivos
— o tempo acabou ou o alvo caiu —, e os dois viravam `pronto = false` com a
mesma mensagem.

Sem aquele número, a investigação teria repetido a do D-022: medir contenção de
CPU, achar tudo verde, e ficar sem explicação. Foi o diagnóstico que apontou
para o lugar certo, e ele custou três linhas.

### A causa

`test/run.mjs` rodava **sete sondas de navegador em `Promise.all`**, cada uma com
um Chromium próprio. O F1.14 acrescentou duas — `sem-backend` e
`rodada-completa`. Dentro da caixa de areia do portão, com até quatro mutantes
em paralelo, o limite deixou de ser CPU e passou a ser **memória**.

Não é hipótese: o processo inteiro já tinha sido morto por OOM (código 137) mais
cedo na mesma sessão.

| medição | resultado |
|---|---|
| `sem-rede` sozinha, estreita | verde |
| as 9 suítes de navegador juntas, fora da caixa, 2× | verdes |
| as 9 juntas, dentro de uma caixa de areia | verde |
| dentro do portão, com mutantes em paralelo | **vermelha** |

Só a última tem os dois ao mesmo tempo — e é a única que falha.

### A correção, e as duas metades

**As sondas rodam em FILA.** O pico de memória passa a ser de um navegador em
vez de sete. A execução fica um pouco mais longa e passa a **terminar** — e
portão que não termina não julga nada.

**E a espera diz por que parou**, não só quando. Longe do teto e com "Target
crashed": foi memória. Perto do teto: o Monte Carlo não terminou. Nenhum dos
dois: o app não abriu mesmo. Três diagnósticos que antes eram a mesma frase.

### A lição, e ela é sobre o anterior

O D-022 subiu o teto de 90 s para 240 s achando que o problema era tempo. **A
correção estava errada e o diagnóstico estava certo** — foi o número que ela
mandou imprimir que revelou a causa verdadeira, um portão depois. Vale registrar
que a parte útil daquela correção não foi o teto: foi mandar o teste dizer o
número.

---

## D-024 — versionar `assets/` derrubou o portão antes do primeiro defeito ✅ CORRIGIDO

**Achado em:** a primeira execução do Q2 depois da decisão de versionar a arte ·
**Corrigido no mesmo commit**

```
Error: EEXIST: file already exists,
  symlink '/home/user/Pokemon/assets' -> '/tmp/pokearena-sabotagem-ZIPtIZ/assets'
```

O portão morreu em **0,3 s**, antes de plantar o primeiro defeito.

### A causa, e ela é uma consequência direta de uma decisão de produto

A lista de pastas que a caixa de areia copia vem do `git ls-files` — de
propósito, para não dessincronizar quando uma pasta nova nasce. Foi a correção
que duas execuções de portão pagaram, e ela está certa.

Quando `assets/` entrou no versionamento, o `git` passou a devolvê-lo, e a caixa
passou a **copiá-lo**. Duas consequências:

1. **18 MB copiados cinco vezes por execução** — puro desperdício, e a razão de
   o link simbólico existir desde o começo;
2. o `symlinkSync` logo abaixo colidia com a pasta recém-copiada, e o processo
   morria com `EEXIST`.

### A correção

`assets/` sai da lista de cópia explicitamente. A razão do link simbólico **não
mudou com o versionamento**: nenhum defeito plantado mexe em arte, então a caixa
pode olhar para a mesma pasta que a árvore de trabalho.

### A lição

Uma lista DERIVADA é melhor que uma escrita à mão — isso continua valendo, e o
D-017 é sobre exatamente isso. Mas derivar não dispensa perguntar **o que a
derivação passa a incluir** quando a fonte muda. Aqui a fonte era o `git`, e a
decisão de versionar a arte mudou a resposta dela sem ninguém mexer numa linha
do portão.

---

## D-028 — o cartão `SEU LUTADOR` não tinha CSS nenhum

**Achado em:** R3, ao levantar o terreno antes de mexer.
**Bloco dono:** R3, que o removeu no mesmo commit.
**Estado:** CORRIGIDO por remoção.

O `meu-lutador.mjs` desenhava o cartão da zona de ação com seis classes:

```
ml-topo   ml-mon   ml-id   ml-hp   ml-est   ml-linha
```

**Nenhuma das seis existia na folha de estilo.** Medido com `grep` em `app/`:
as únicas ocorrências no repositório inteiro eram as do próprio módulo que as
escrevia. A barra de vida era literalmente isto:

```html
<div class="ml-hp"><i style="width:84%"></i></div>
```

Uma `<div>` sem altura, sem cor e sem fundo, com um `<i>` dentro que recebia
largura e mais nada. Ela não desenhava barra nenhuma — ocupava zero pixel.

### Por que ninguém viu

O cartão só aparece com `S.state === 'fighting' || 'result'` **e** com aposta
feita. A captura de telas do passo 6 pega a luta, mas com o jogador FORA da
rodada, onde o cartão cai no ramo `<div class="tiny">Você ficou de fora</div>`
— que é texto simples e parece certo. O caminho com aposta viva nunca foi
olhado.

É a mesma classe do V1.15: não é erro de execução, é erro de leitura. A suíte
inteira passava verde porque nada nela pergunta se uma classe usada existe.

### A correção

O R3 removeu o cartão: o banner de batalha ocupa aquele lugar e é desenhado.
O rodapé do banner herdou o que o cartão dizia — valor apostado, retorno
possível, odd, vida e colocação.

### A lição, e ela vale para os blocos seguintes

**Classe escrita por JavaScript não é verificada por ninguém.** O `test/banner.mjs`
já cobria esse par nos dois sentidos para os cosméticos (`.cn-*` e `.ef-*`),
justamente porque cosmético sem CSS "não quebra, só não aparece". A mesma
pergunta não era feita para o resto do app — e a resposta era pior aqui, porque
o que não apareceu foi a barra de vida do lutador do jogador.

---

## D-029 — o portão de fechamento não passa: ele proíbe o que a própria suíte testa

**Achado em:** ao rodar `npm run repetir` antes de fechar o R9/R10/R11.
**Anterior a este trabalho:** sim — presente em `bc9d5bd`, a base como recebida.
**Bloco dono:** **R12**, aberto para isto.
**Estado:** **CORRIGIDO** no R12.

`npm run repetir` e `npm run portoes` rodam a suíte com `EXIGE_VISUAL=1`. E o
`test/run.mjs` recusa o recorte `--so` quando essa variável está ligada:

```js
if (SO && process.env.EXIGE_VISUAL === '1') {
  console.error('\n--so não vale no portão de fechamento. Rode npm run portoes inteiro.');
  process.exit(2);
}
```

A recusa está **certa**: recorte parcial não pode fechar bloco, e o `S109`
existe para guardar isso.

O problema é que a suíte `portao` TESTA justamente esse recorte, e ela o testa
disparando processos-filho:

```js
env: { ...process.env, SEM_VISUAL: '1' } },
```

`...process.env` carrega o `EXIGE_VISUAL=1` do pai. O filho é recusado antes de
rodar, e os dois testes que verificam o comportamento do recorte falham:

```
[portao] o recorte com nome inexistente REPROVA, em vez de rodar vazio
[portao] o recorte se anuncia como parcial
```

**Medido, e é determinístico — não é instabilidade:**

```
node test/run.mjs --so=portao                 38/38 VERDE
npm test (suíte inteira, sem a marca)        793/793 VERDE

npm run repetir   execução 1 de 2            VERMELHO — 2/793
                  execução 2 de 2            VERMELHO — 2/793
                  e são OS MESMOS DOIS testes
```

Duas execuções, as mesmas duas falhas. O `repetir` existe justamente para
separar "vermelho constante" de "instável", e ele respondeu **constante**: a
suíte é estável, e o que está quebrado é o portão — não o produto.

### Por que isso importa mais do que parece

O `npm run portoes` é o portão que o `CLAUDE.md` manda rodar para fechar bloco:
"suíte DUAS vezes com navegador + sabotagem". **Ele não passa hoje**, e não
passa por um motivo que nada tem a ver com o produto. Um portão que nunca fica
verde deixa de ser consultado — e aí ele não guarda mais nada.

### A correção proposta

Uma linha: o filho não pode herdar a marca de fechamento, porque ele existe
justamente para exercitar o que a marca proíbe.

```js
env: { ...process.env, SEM_VISUAL: '1', EXIGE_VISUAL: '' } },
```

### Por que NÃO foi corrigido no R11

Porque não é do R11. O `CLAUDE.md` é explícito — "corrigir fora do escopo do
bloco, mesmo que seja rapidinho" está na lista do NUNCA —, e a correção precisa
do ciclo dela: teste que fique vermelho se a herança voltar, e defeito plantado
que prove o teste. Fazer em silêncio dentro de outro bloco seria exatamente o
padrão que custou três versões ao projeto.

**Como fechar os blocos até o R12 existir:** `npm test` (suíte inteira, com
navegador) e `npm run sabotagem` (Q2 completo) — que é o que foi usado em todos
os blocos da trilha R, e o que cada mensagem de commit declara ter medido.

---

## D-030 — clone limpo não sobe: o SQLite não cria o diretório do banco

**Achado em:** 23/08/2026, ao subir o servidor para o dono testar.
**Bloco dono:** 0.3 — higiene de arnês, que o fechou.
**Estado:** CORRIGIDO em 29/08/2026. Ver "A correção, medida num clone de
verdade" no fim desta ficha.

### O que acontece

`config.mjs:62` resolve o banco para `dados/pokearena.db` em qualquer ambiente
que não seja teste. `abrirBanco` (`banco.mjs:31`) entrega esse caminho direto ao
`DatabaseSync`, e o SQLite **não cria diretório** — só arquivo.

Num clone limpo `dados/` não existe (não é versionado, e não deve ser: é dado de
execução). Então:

```text
npm run servidor
→ Error: unable to open database file   errcode 14
```

### Por que é pior do que parece

A mensagem do SQLite não diz "diretório ausente". Diz "unable to open database
file", que é a mesma mensagem de permissão negada, disco cheio e caminho
inválido. Quem clonar vai procurar defeito em quatro lugares antes do certo.

E o `principal.mjs` é, por desenho, o único arquivo do backend com efeito
colateral — então não há outro lugar onde isto possa ser notado antes.

### A correção

`abrirBanco` criar o diretório do caminho antes de abrir, quando ele não for
`:memory:`. Uma linha de `mkdirSync(dirname(caminho), { recursive: true })`.

**O teste que precisa existir antes:** abrir um banco em caminho cujo diretório
não existe, num diretório temporário, e conferir que sobe. Sem esse teste, o
defeito plantado que remove a criação não tem quem o pegue — a suíte roda em
`:memory:` justamente para não escrever em disco, e por isso nunca passou por
aqui.

### A correção, medida num clone de verdade

Fechada no bloco 0.3. `abrirBanco` cria o diretório do caminho antes de abrir,
quando ele não é `:memory:`. A linha ficou ali, e não no `principal.mjs`,
porque este é o único ponto por onde todo caminho que abre banco passa — no
ponto de entrada, a próxima ferramenta que abrir um banco repetiria o defeito.

A medição foi feita no cenário real, com `git clone` do repositório num
diretório novo, sem `dados/`:

```text
sem a correção    FALHOU: unable to open database file
com a correção    SUBIU o banco — versão 8, e dados/pokearena.db criado
```

**O teste saiu de `:memory:`, e é a parte que importa.** Ele é o único da suíte
que escreve em disco, com diretório temporário próprio e remoção no `finally`
— inclusive quando a asserção falha, porque deixar caixa para trás é o D-036 e
não valia plantá-lo de novo aqui.

Um defeito que só aparece fora de `:memory:` precisa de um teste que saia de
`:memory:`. Foi por não ter um que ele atravessou cinquenta blocos.

**Dois defeitos plantados, e não um:** o `S519` remove a criação, e o `S520`
remove só o `recursive`. O segundo existe porque um `mkdirSync` sem ele passa
com um nível e quebra com dois — e `dados/` vira `var/dados/` no dia em que
alguém mexer no `config.mjs`. Os dois foram plantados à mão e reprovam a suíte
em 14/15.

---

## D-031 — o backend escuta só em `127.0.0.1`, e nenhum ajuste de firewall muda isso

**Achado em:** 23/08/2026, investigando por que o Safari do iPhone não abria.
**Bloco dono:** ainda sem dono. **Precisa de decisão antes de correção.**
**Estado:** ABERTO, e é decisão de produto/segurança, não conserto mecânico.

### O que acontece

`servidor.mjs:234`:

```js
servidor.listen(porta ?? config.porta, '127.0.0.1', () => {
```

O endereço está fixo no código. `127.0.0.1` é loopback: só alcança processos da
própria máquina. Um celular no mesmo Wi-Fi não alcança, e **não há configuração
de rede, perfil de firewall ou regra de porta que faça alcançar** — o socket não
está escutando naquela interface.

Isto encerra a investigação anterior: o perfil "Público" da rede era pista
falsa. O firewall nunca chegou a ser o obstáculo.

### Por que NÃO foi corrigido junto com o achado

Porque trocar para `0.0.0.0` **expõe o backend inteiro à rede local** — as rotas
de aposta, de carteira e de admin. Hoje o loopback é a única coisa entre elas e
qualquer aparelho no mesmo Wi-Fi. É uma mudança de superfície de ataque, e
merece bloco com Q6, não uma linha trocada de passagem.

### As opções, para o dono escolher

| opção | o que dá | o que custa |
|---|---|---|
| manter `127.0.0.1` | superfície mínima | não se testa em celular |
| endereço por variável de ambiente, padrão `127.0.0.1` | quem quiser expõe, de propósito, e o padrão continua seguro | uma variável a mais |
| `0.0.0.0` fixo | testa em qualquer aparelho | expõe admin e carteira à LAN |

**Recomendação:** a segunda. O padrão continua sendo o seguro, expor vira ato
deliberado, e o teste em celular deixa de exigir mudança de código.

Nota: o servidor estático (`tools/jogar.mjs`) é outro processo, com outra porta
e sem rota de dinheiro — se o objetivo for só ver a tela no celular, ele é o
alvo certo da discussão, e o risco é bem menor.

---

## D-032 — `semTexto` perde a sincronia em literal de expressão regular com aspas

**Achado em:** R20, ao escrever `app/modules/grafico.mjs`.
**Bloco dono:** ainda sem dono. Candidato: o bloco que tocar o arnês estático.
**Estado:** ABERTO. Contornado no R20 evitando o literal, não corrigido.

### O que acontece

`semTexto` (`test/modulos.mjs:192`) mascara comentários e strings para que os
testes estáticos perguntem sobre CÓDIGO e não sobre texto. Ele não entende
literal de expressão regular — e o próprio comentário do teste de símbolos já
sabia disso.

O caso que dói é a expressão regular que contém uma aspa:

```js
.replace(/"/g, '&quot;')
```

A aspa dentro de `/"/ ` é lida como início de string. O mascaramento passa a
consumir a partir dali com a paridade trocada, e **o resto do arquivo fica
mascarado errado**.

### Por que é pior do que o sintoma

O sintoma no R20 foi um FALSO POSITIVO: `grafico.mjs` foi acusado de usar `$`
sem importar, porque os `${…}` dos literais de template deixaram de ser
mascarados. Falso positivo é barulhento e alguém investiga.

O risco real é o contrário. Com a paridade trocada, trechos de CÓDIGO passam a
ser mascarados como se fossem string — e um símbolo usado sem importar
**desaparece antes de ser procurado**. Isso é um `PEGOU` falso: o teste fica
verde por não ter enxergado. O `CLAUDE.md` é explícito sobre qual dos dois é o
pior.

### A correção

`semTexto` precisa reconhecer literal de expressão regular. A distinção entre
`/` de divisão e `/` de regex depende do token anterior — a heurística usual é
olhar o último caractere não-branco: depois de `)`, `]`, identificador ou número
é divisão; caso contrário é literal.

**O teste que precisa existir antes:** um arquivo de amostra com `/"/g`,
`/'/g`, `` /`/g `` e uma divisão logo depois de `)`, conferindo que o
mascaramento continua alinhado até o fim.

### O contorno usado no R20

`grafico.mjs` monta a expressão com `new RegExp('[&<>"]', 'g')` em vez do
literal. O código ficou melhor por outro motivo — uma passada só, sem a ordem
delicada de quatro `replace` encadeados —, mas isso é sorte, e não conserto: o
defeito continua armado para o próximo arquivo que use um literal com aspas.

---

## D-033 — a linha de base visual fotografa GIF animado, e por isso depende do relógio

**Achado em:** R20, quando o portão Q2 abortou na pré-checagem.
**Bloco dono:** R25, que o fechou.
**Estado:** CORRIGIDO em 24/08/2026.

### O sintoma

O portão Q2 aborta antes de avaliar qualquer defeito:

```text
ABORTADO: a suíte já está vermelha na configuração com-golden/navegador-completo
  arena@panoramico: 2 de 64 regiões fora — região 1,5 (média 3.9, pico 17)
```

Pelo `D-015`, vermelho na configuração de julgamento não é captura: é a
configuração quebrada, e **nenhum defeito chega a ser medido**. Um portão que
não roda não protege nada.

Rodando sozinho, `--so=visual-base` deu VERDE três vezes seguidas. O portão roda
quatro caixas de areia em paralelo (`N_TRAB = min(cpus, 4)`), e é sob essa
disputa de CPU que o vermelho aparece.

### A causa

Os retratos da lista de lutadores são **GIFs animados** —
`sprites/ani/*.gif`, via `imgTag` em `app/modules/sprites.mjs:154`.

O quadro que um GIF exibe depende do **tempo de parede desde que ele começou**.
A captura espera `waitForTimeout(700)` depois de trocar de tela; com a máquina
livre, os 700 ms caem sempre no mesmo quadro, e a linha de base parece estável.
Sob disputa, caem em quadro diferente.

`reducedMotion: 'reduce'` — que o R7 acrescentou e resolveu o pulso do letrado —
**não congela GIF**: ele não é animação de CSS.

A linha de base não estava estável. Estava com sorte, e a sorte é função da
carga da máquina.

### A prova

Ao investigar, foi acrescentada em `test/visual.mjs` uma espera pelo `decode()`
das imagens de pseudo-elemento — correta em si, e ela **tornou o vermelho
permanente**, inclusive rodando sozinho (média subiu de 3,9 para 5,6).

Isso é o experimento que fecha o diagnóstico: acrescentar tempo real mudou a
foto. Se a foto dependesse só de layout e cor, não mudaria. A alteração foi
revertida — ela expõe o defeito, não o corrige, e corrigi-la de verdade exige
regravar, o que não cabia no R20.

### A correção proposta

Servir, durante a captura, o **PNG estático** no lugar do GIF animado. O
`imgTag` já declara esse endereço como sua própria cascata de fallback, então
não é arte de outra fonte — é a mesma coisa, parada.

O quadro passa a ser o mesmo sempre, e o portão continua guardando layout, cor e
conteúdo, que é o que ele existe para guardar.

**Exige regravar** `arena@*` e as demais telas com retrato, com a explicação no
commit: a linha de base deixa de fotografar um quadro de animação.

### Por que NÃO foi corrigido no R20

Porque não é do R20, e porque a correção passa por regravar fixture — que este
projeto só aceita com motivo escrito e revisado. Fazer isso de passagem, dentro
de um bloco sobre política monetária, seria esconder uma mudança de linha de
base dentro de um commit que ninguém abriria para procurá-la.

**Enquanto não for corrigido:** o portão Q2 pode abortar na pré-checagem. Rodar
de novo costuma passar. Isso é contorno, não conserto, e o custo é que um aborto
legítimo vira ruído indistinguível.

---

## D-034 — o §4.7 inteiro está construído e nunca é chamado

**Achado em:** R21, ao levantar o terreno para fechar o F1.10.
**Bloco dono:** R21, que o corrige no mesmo commit.
**Estado:** ABERTO ao ser achado.
**Gravidade:** alta. Atinge o portão Q9 de **quatro** blocos — F1.8, F1.9,
F1.10 e F1.11.

### O que acontece

`server/telemetria.mjs` implementa o §4.7 por inteiro:

- os **20 eventos de proteção**, nomeados;
- os **campos obrigatórios de cada um**, declarados evento a evento — e não os
  sete do §4.7 em todos, justamente para impedir preenchimento com `null`;
- a regra de que **evento de proteção nunca é amostrado**, com teste;
- validação que recusa evento sem campo obrigatório.

E `emitir()` **não é chamado em nenhum caminho de produção**. A busca por
`emitir(` em `server/`, `engine/` e nos módulos de servidor não devolve
chamada nenhuma; `from './telemetria.mjs'` só aparece em `test/`.

A tabela `telemetry_events` fica **vazia para sempre**.

### O que isso significa na prática

Nenhum destes fatos é registrado:

```text
cooloff_started              alguém entrou em pausa
self_exclusion_started       alguém se autoexcluiu
self_exclusion_reentry_blocked   alguém tentou voltar e foi barrado
limit_blocked_action         um limite recusou uma aposta
risk_signal_raised           um sinal de risco foi levantado
rescue_grant_issued          um resgate foi concedido
rescue_grant_blocked_by_policy   um resgate foi negado, e por quê
age_verification_failed      uma verificação de idade falhou
```

São exatamente os eventos que existem para **provar** que a proteção do jogador
funcionou. Sem eles, "a Arena protege quem joga" é uma afirmação sem registro —
e o §28.7 não pede boa intenção, pede evidência.

### A confusão que o escondeu

Existe `app/modules/telemetria.mjs`, do CLIENTE, e ele **é** chamado — nove
lugares, com `bet_confirmed`, `round_viewed`, `battle_started`. Uma busca
apressada por `emitir(` acha essas nove e conclui que a telemetria funciona.

Mas são módulos diferentes, com propósitos diferentes: o do cliente grava num
anel em memória, para a aba, e não chega ao servidor. Nenhum evento de proteção
está nele — nem poderia, porque proteção é decidida no servidor.

### Por que nenhum teste pegou

Porque todo teste do §4.7 chama `emitir()` **diretamente**. Eles provam que a
função valida, que não amostra proteção, que recusa campo faltando — e todos
passam, porque a função está certa. O que ninguém testou foi se **alguém a
chama**.

É a mesma família do `D-028` e do R20: a peça está correta e desligada. E é a
sexta ocorrência no projeto.

### A correção (feita no R21)

Ligar os 20 eventos nos pontos de decisão que já existem, e acrescentar o teste
que faltava: **cada evento de proteção do §4.7 tem pelo menos um chamador em
código de produção**. Sem esse teste, a correção de hoje volta a se desligar no
próximo bloco que mexer nos módulos, e ninguém sente falta.

---

## D-035 — a semana do §28.8 era `NaN-WNaN`, e o resgate virou um por conta

**Achado em:** R21, no passo OLHAR — o painel de eventos mostrou
`"semana":"NaN-WNaN"` nos campos de uma recusa de resgate.
**Bloco dono:** R21, que o corrige no mesmo commit.
**Estado:** CORRIGIDO.
**Gravidade:** alta, e silenciosa.

### O que acontecia

`semanaDe(dataISO)` (`engine/emissao.mjs`) monta a semana ISO concatenando a
hora na data recebida:

```js
const d = new Date(dataISO + 'T00:00:00Z');
```

Com uma data pura — `'2026-03-02'` — funciona. Com um **instante ISO
completo** produz `'2026-03-02T12:00:00.000ZT00:00:00Z'`, que é data inválida,
e a função devolvia a string `NaN-WNaN`.

E o servidor chamava exatamente assim, nos dois lugares:

```js
semanaDe(new Date(agora).toISOString())    // progressao.mjs:173 e :231
```

### A consequência

**Toda** data caía no mesmo balde. Como `RESGATE_MAX_POR_SEMANA = 1`, a conta
recebia **um resgate na vida**, e não um por semana — o §28.8 passava a negar
para sempre a partir do segundo pedido.

Medido depois da correção, com uma conta em ruína em duas semanas seguidas:

```text
antes:   semana 1 CONCEDIDO · semana 2 negado (ja_recebeu_nesta_semana)
depois:  semana 1 CONCEDIDO · semana 2 CONCEDIDO
         baldes: 2026-W10, 2026-W11
```

### Por que nenhum teste pegou, e é a parte que ensina

Dois motivos, e o segundo é o grave.

**Primeiro:** todos os testes de `semanaDe` em `test/emissao.mjs` a chamavam com
data PURA — `semanaDe('2026-01-12')`. Nenhum usava a forma que a produção usa. É
a mesma lição do `S379` no R20: **o dado do teste é parte do teste**, e um valor
de entrada escolhido com cuidado demais esconde o caso real.

**Segundo, e pior:** `NaN-WNaN === NaN-WNaN`. A string com NaN é **comparável a
si mesma**, então a pergunta "é a mesma semana?" continuava respondendo `true`
com toda a aparência de correção. Os testes de resgate — que comparam semanas
entre si dentro de uma janela — passavam. Só um teste que ATRAVESSASSE uma
semana pegaria, e não havia nenhum.

Um valor errado que se compara igual a si mesmo é pior que um erro: ele imita
a regra certa.

### A correção

Duas, e a segunda é a que fecha:

1. `semanaDe` corta a entrada em 10 caracteres, aceitando as duas formas;
2. **lança** em data inválida, em vez de devolver uma string. Um balde que não
   pode ser calculado não pode virar um balde.

Testes acrescentados: instante completo dá a mesma semana que a data pura;
semanas distintas continuam distintas com instante completo; e data impossível
lança em vez de virar balde.

---

## D-036 — o portão Q2 abandona as caixas de areia quando aborta

**Achado em:** R23, investigando por que o portão estava demorando 31 min em
vez dos 10 a 15 habituais.
**Bloco dono:** 0.3 — higiene de arnês, que o fechou.
**Estado:** CORRIGIDO em 29/08/2026. Ver "A correção, e o vazamento que a ficha
não tinha visto" no fim.

### O que acontece

`test/sabotagem.mjs` cria `N_TRAB + 1` caixas de areia em `tmpdir()`, cada uma
uma cópia do repositório versionado. A última linha do arquivo remove todas:

```js
for (const c of CAIXAS) rmSync(c, { recursive:true, force:true });
```

Essa linha só é alcançada quando o portão **termina**. Quando ele **aborta** —
e ele aborta com frequência pelo `D-033`, a instabilidade da linha de base
visual — a execução sai antes, e as caixas ficam.

### O tamanho do problema, medido

```text
75 caixas abandonadas em C:/Users/.../Temp
4,9 GB ocupados

por dia:  30 de 20/08 · 2 de 21/08 · 15 de 22/08 · 17 de 23/08 · 11 de 24/08
```

Depois da limpeza manual: 0 caixas, 2,6 GB no Temp — **2,3 GB liberados**.

### Por que é pior do que ocupar disco

O portão que está rodando disputa I/O com os restos dos que não terminaram. A
execução do R23 levou **31 minutos** contra os 10 a 15 normais, com 75 cópias
do repositório no mesmo diretório temporário.

Ou seja: o `D-033` faz o portão abortar; o aborto deixa lixo; o lixo faz o
portão seguinte demorar mais; demorar mais dá mais janela para o `D-033`
aparecer de novo. Os dois defeitos se alimentam.

### A correção

A remoção precisa acontecer em `finally`, ou registrada em `process.on('exit')`
— não na última linha do caminho feliz. E vale limpar caixas órfãs de execuções
anteriores no início, que é a única forma de o conserto valer para as que já
existem.

**O teste que precisa existir antes:** rodar o portão de um jeito que aborte
(uma configuração deliberadamente vermelha) e conferir que `tmpdir()` não ganhou
diretório `pokearena-sabotagem-*` nenhum.

### A correção, e o vazamento que a ficha não tinha visto

Fechada no bloco 0.3, e a leitura achou uma segunda fonte de vazamento:

```js
const CAIXA_BASE = CAIXAS.pop();          // sai da lista
for (const c of CAIXAS) rmSync(c, …);     // limpa a lista
```

**A `CAIXA_BASE` nunca era removida — nem no caminho feliz.** Toda execução
BEM-SUCEDIDA deixava uma caixa para trás. Somado ao aborto, é como se chega a
120 sem ninguém notar.

Medição do dia, e ela é maior que a de 24/08 registrada acima:

```text
antes    120 caixas    3,25 GB
depois     8 caixas    0,42 GB    (as 8 são da execução em andamento)
```

**A limpeza não podia ser cega.** O caminho de aborto PRESERVA a caixa de
propósito: ele imprime `reproduza com: cd <caixa>`, e essa linha é o
diagnóstico inteiro. Apagar tudo transformaria a instrução numa mentira. Então
`preservar()` marca a que o aborto quer manter, e o resto vai embora — no
`exit`, no `SIGINT` e no `SIGTERM`.

**As órfãs antigas saem por idade, e não todas.** Seis horas: longo o bastante
para uma investigação caber, curto o bastante para o disco não acumular semanas.
Apagar todas na entrada apagaria justamente a caixa que alguém foi olhar.

### Por que a REGRA virou módulo, e o gancho não tem teste direto

`test/caixas.mjs` nasceu com oito testes próprios — o que preservar, o que
remover, o que já é órfão —, incluindo dois que este defeito ensinou: que a
caixa preservada sobrevive, e que uma caixa fora da lista principal também é
removida.

O teste de ponta a ponta que esta ficha pedia não foi escrito, e a **L-056**
registra os três motivos: custo (o único aborto depois das caixas existirem
exige rodar a suíte inteira dentro de uma), sinal no Windows (não confiável), e
que a alternativa seria uma variável de ambiente que só o teste percorre —
dentro do arnês que existe para pegar exatamente isso.

O gancho é coberto por asserção estática em `test/portao.mjs`, com os
comentários removidos pela lição do `S125`, e por dois defeitos plantados:
`S521` (o gancho de saída some) e `S522` (a `CAIXA_BASE` sai do limpador).

---

## D-037 — as fontes do tema nunca carregaram: a folha é servida como binário

**Achado em:** R25, medindo a tela antes de mexer nela — o dono disse que "não
sentiu diferença" nas três correções de letrado (R14, R15, R16).
**Bloco dono:** R25, que o corrige.
**Estado:** ABERTO ao ser achado.
**Gravidade:** alta em efeito, invisível em sintoma. **Explica retroativamente
por que R14, R15 e R16 não mudaram nada aos olhos de quem pediu.**

### O que acontece

A cópia local da folha de fontes mora em `assets/fonts_googleapis_com/css2` —
**sem extensão**, porque o espelho copia o caminho da URL original
(`fonts.googleapis.com/css2?family=...`).

Os dois servidores estáticos do projeto resolvem MIME por extensão:

```js
MIME[extname(arquivo).toLowerCase()] || 'application/octet-stream'
```

`extname('css2')` é string vazia. A folha sai como `application/octet-stream`,
e **o navegador recusa folha de estilo com MIME que não seja CSS** — é
conferência estrita, não sniffing.

Medido:

```text
GET /assets/fonts_googleapis_com/css2   →  200 · Content-Type: application/octet-stream
document.fonts                          →  (nenhuma face registrada)
largura de "COMO FUNCIONA" em Orbitron  →  354.4 px
largura da mesma em Segoe UI            →  352.9 px      ← praticamente idêntica
```

### O efeito

**A identidade tipográfica inteira nunca apareceu.** `--dsp` (Orbitron) e
`--px` (Press Start 2P) caem para `Segoe UI` em toda a interface: nav, títulos,
contagem, aviso de nocaute, painel.

Isso vale para os dois servidores — `tools/jogar.mjs`, que é como o jogo é
aberto, e `test/visual.mjs`, que é como a linha de base é gravada.

**Consequência para o portão Q5:** a linha de base visual foi gravada COM O
TEMA CAÍDO. Corrigir o MIME muda legitimamente todas as telas, e exige
regravar — com a explicação no commit.

### Por que nenhum teste pegou, e é a parte que ensina

`test/ortografia.mjs` tem um teste chamado *"as duas fontes do tema vêm da
cópia local"*, e o comentário dele prevê o sintoma com todas as letras:

> "Se o `<link>` perder o `assets/`, a página cai no Segoe UI inteira e o tema
> some sem nada quebrar."

Mas ele cobra a STRING do `href`:

```js
ok(/href="\.\.\/assets\/fonts_googleapis_com\/css2"/.test(APP), ...)
```

O `href` está certo. O arquivo existe. Os `.ttf` existem. Os caminhos relativos
resolvem. **Tudo o que o teste consegue ver está correto** — e a fonte não
carrega, porque o que falha é o cabeçalho da resposta, que nenhuma leitura do
HTML alcança.

É a lição que este projeto já registrou três vezes com outro nome: **o teste
cobra a palavra, não a construção.** Aqui ele cobrava o endereço, não o
carregamento.

### A correção (feita no R25)

Dar extensão ao arquivo espelhado — `css2.css` — para que o MIME por extensão
funcione em qualquer servidor, agora e nos que vierem. O espelho já adapta o
nome do host (pontos viram sublinhados); acrescentar a extensão é a mesma
adaptação, pelo mesmo motivo.

E o teste passa a conferir o que importa: **a face carrega**, medido no
navegador comparando a largura do mesmo texto contra o fallback.

Os tipos de fonte (`.ttf`) também foram acrescentados aos mapas MIME. O
navegador é tolerante com MIME de fonte, então isso não era o defeito — mas
servir binário de fonte como `application/octet-stream` é a mesma falta de
cuidado que causou o defeito real.

### Adendo — como o D-033 foi fechado (R25)

Ele deixou de ser intermitente e virou bloqueio: depois de regravar a linha de
base no R25, `arena@largo` passou a falhar de forma CONSISTENTE, sempre na
região 1,5, sempre com os mesmos números (média 2,8 · pico 6). Sinal claro de
que a foto guardava um quadro de animação e a execução ao vivo caía noutro.

A correção é a proposta original: **congelar os GIFs antes de fotografar**.
`test/visual.mjs` troca, no instante da captura, cada `<img>` de GIF pelo PNG do
mesmo dex — que é a própria cascata de resgate que o `imgTag` já declara. Não é
arte de outra fonte: é a mesma coisa, sem o relógio.

O portão continua guardando layout, cor, presença e tamanho dos retratos. Deixa
de guardar em que quadro da animação a máquina estava, que nunca foi informação
sobre a interface.

Medido: três execuções seguidas de `--so=visual-base`, três VERDES.

---

## D-038 — a música de batalha pede um arquivo que não existe

**Achado em:** R26, ao varrer as respostas da página durante o OLHAR.
**Bloco dono:** ainda sem dono. Candidato: o bloco que tocar `audio.mjs`.
**Estado:** ABERTO. Sem relação com o R26 — achado de passagem.

### O que acontece

Carregar o jogo produz um 404:

```text
404  /app/battle-theme.mp3
```

O arquivo não está no repositório. A música de batalha simplesmente não toca, e
nada avisa: `<audio>` que falha não lança, então o silêncio é indistinguível de
"o jogador desligou o som".

### Por que é pior do que um arquivo faltando

O F0.12 fez o jogo abrir com a rede desligada, e a promessa dele é que todo
asset tem cópia local. Este contradiz a promessa sem quebrar nada — a mesma
família do `D-037`, e a mesma do `R13`: algo declarado, ausente na prática, e
sem sintoma.

### A correção

Ou o arquivo entra no repositório (e no `baixar-assets.mjs`, para o portão de
egresso o conhecer), ou a chamada sai. **O que não pode ficar é o pedido de um
arquivo que ninguém pretende ter** — 404 em produção é ruído que ensina a
ignorar 404.

**O teste que precisa existir antes:** carregar a página no portão visual e
exigir ZERO respostas com status ≥ 400. Hoje ninguém olha isso, e foi por acaso
que este apareceu.

---

## D-039 — a caixa de areia do Q2 julgava contra uma linha de base velha

**Achado em:** R26, perseguindo o `arena@largo` região 1,5 que voltava a abortar
o portão mesmo depois de o `D-033` ter sido corrigido.
**Bloco dono:** R26, que o corrige.
**Estado:** ABERTO ao ser achado.
**Gravidade:** alta, e ele explica um histórico inteiro de abortos.

### O desenho, que está certo

Há DUAS linhas de base visuais, e a separação é deliberada:

```text
test/fixtures/visual-base.json         REFERÊNCIA — versionada, compartilhada
test/fixtures/visual-base-local.json   desta máquina — IGNORADA pelo git
```

A impressão digital depende da build do Chromium, então cada máquina grava a
sua. A referência serve para comparar entre máquinas. Nada disso é erro.

### O defeito

`test/sabotagem.mjs` monta cada caixa de areia copiando o que o `git`
versiona — `DIRS_VERSIONADOS` e `ARQUIVOS_RAIZ`, ambos derivados de
`git ls-files`. A linha de base LOCAL é ignorada pelo git, então **ela nunca
chegava à caixa**.

Dentro da caixa, a captura caía na REFERÊNCIA. Medido no dia do achado:

```text
visual-base-local.json   24/08 17:14   (regravado no R26)
visual-base.json         21/08 12:24   (três dias e dois blocos atrás)
```

A referência não tinha as fontes do tema, que só passaram a carregar no R25
(`D-037`), nem a marca desenhada do R26.

### O sintoma, e por que ele enganou

O portão abortava na pré-checagem dizendo *"a suíte já está vermelha na
configuração de julgamento"* — o `D-015`. A mensagem está certa e a conclusão
que ela induz está errada: a configuração não estava quebrada, a **foto de
comparação estava velha**.

Sempre na mesma tela e quase sempre na mesma região, o que parecia ruído
aleatório do `D-033`. Depois que o `D-033` foi corrigido de verdade e o sintoma
continuou — sozinho verde três vezes, na caixa vermelho — ficou claro que eram
dois defeitos diferentes com a mesma cara.

### A correção

A caixa de areia roda NESTA máquina. Então a linha de base desta máquina é a
verdade dela, e passa a ser copiada junto — uma linha em `sabotagem.mjs`, ao
lado do `symlink` de `assets`, que existe pelo mesmo motivo: nem tudo que a
caixa precisa está no `git`.

### O que fica de lição

`git ls-files` é a fonte certa para "o que o projeto versiona" e a fonte errada
para "o que uma execução precisa". As duas listas se pareciam o bastante para
ninguém notar a diferença — até um arquivo não versionado passar a importar.

---

## D-040 — o portão Q2 aborta por variação na região do banner

**Achado em:** R27. **Investigado a fundo em:** R29. **FECHADO em:** R30.
**Estado:** RESOLVIDO. Eram **três causas em camadas**, e cada uma escondia a
seguinte — por isso treze hipóteses e três blocos até o fim.
**Impacto (enquanto durou):** o portão Q2 abortava na pré-checagem (`D-015`) e
não avaliava defeito nenhum. Era bloqueio de instrumentação, não de produto.

### As três causas, na ordem em que apareceram

| # | causa | corrigida em | desvio na região do banner depois |
|---|---|---|---|
| 1 | `.ef-*` com `animation ... infinite` sem guarda de `prefers-reduced-motion` | R29 | média 4,7 · pico 11 |
| 2 | `.cn-*::after` (a varredura de CRT das cenas), mesmo defeito | R30 | média 2,1 · pico 5 |
| 3 | **o relógio da rodada** | R30 | estável — quatro execuções verdes seguidas |

A medição de partida, entre duas capturas locais da mesma tela, era
**5,35% dos pixels diferentes · desvio médio 8 · pico 175**.

### Por que a terceira demorou tanto a aparecer

As duas primeiras são a mesma classe de defeito — animação de CSS ignorando a
preferência do sistema — e o arnês captura com `reducedMotion:'reduce'`. Cada
animação que ignorava a preferência era **um relógio livre correndo durante a
foto**. Corrigidas as duas, o desvio caiu de pico 175 para pico 5, e o que
sobrou mudou de assunto sem mudar de sintoma.

A terceira não é animação: a fase de aposta vira contagem quando
`CONF.BET_WINDOW - S.clock <= 0`, e a captura caía **ora de um lado da
fronteira, ora do outro**. Dois estados discretos, com o `3` do centro superior
valendo pico 62 na região `4,1` do `arena@medio`. O comentário do próprio
`test/visual.mjs` já registrava esse sintoma desde uma tentativa anterior, mas
tratando-o como efeito colateral de outra mudança — e não como a causa que
faltava.

**Nenhuma espera resolvia**, e é o que confundiu a investigação por três blocos:
não há evento para esperar. Quanto mais cedo a foto sai, mais perto do começo da
janela ela cai — e qualquer mudança de custo em outro ponto do arnês desloca a
fronteira de novo. Aconteceu quando o aquecimento do canvas mudou de lugar, e
outra vez quando o reset de movimento reduzido entrou no R30.

### A correção

Duas linhas, e as duas são de produto antes de serem de portão:

1. o **reset de movimento reduzido** no `index.html` — `animation-duration`
   desprezível e `animation-iteration-count:1` em tudo. Este arquivo declara
   mais de trinta animações `infinite` e as guardas cobriam dez, uma a uma,
   conforme alguém lembrava. Quem marca "reduzir movimento" no sistema estava
   sendo ignorado trinta vezes;
2. o **relógio fixado antes da digital**, em `test/visual.mjs`. Mesma decisão do
   `D-033` com os GIFs: o portão deixa de guardar *em que segundo a máquina
   estava*, que nunca foi informação sobre a interface, e continua guardando que
   a arena desenha a fase de aposta com lista, odds e controles.

### O que fica de lição

**Instabilidade não tem uma causa; tem uma pilha delas.** Cada correção real
reduziu o desvio e revelou a próxima com o MESMO sintoma — região do banner
fora da linha de base. Foi por isso que a investigação passou tanto tempo
convencida de que a hipótese anterior tinha falhado, quando ela tinha
funcionado e destapado a seguinte.

E: **medir o desvio a cada passo foi o que salvou.** Sem os números (175 → 11 →
5 → estável) não haveria como distinguir "a hipótese estava errada" de "a
hipótese estava certa e havia outra atrás".

---

## D-041 — a varredura das cenas ignorava movimento reduzido

**Achado em:** R30, ao reescrever as regras `.cn-*`. **Corrigido em:** R30.
**Bloco dono:** R30, que passou a ser o dono dessas regras.

`.cn-cidade::after`, `.cn-portal::after` e `.cn-nucleo::after` rodavam
`animation: cnVarre 7s linear infinite` — a linha de varredura de tubo — sem
guarda nenhuma. Irmão exato do que o R29 corrigiu nos `.ef-*`.

Corrigido dentro do R30 e não num bloco à parte porque deixar um defeito
conhecido dentro das linhas que o bloco estava reescrevendo seria pior que
corrigi-lo com o registro ao lado. Ele acabou sendo a **segunda camada do
D-040** — ver a tabela acima.

### O sintoma

Uma região da arena — quase sempre a do BANNER DE BATALHA — sai fora da linha
de base. Reprodutível, com desvio pequeno, e resistente a espera.

### O que o R29 PROVOU, e vale mais que o sintoma

**A variação é LOCAL, não da caixa de areia.** Duas capturas seguidas da mesma
tela, na mesma máquina, fora de qualquer caixa:

```text
5,35% dos pixels diferentes · desvio médio 8 · pico 175
concentrados nas zonas 1,5 e 0,5 — o banner
em BANDAS HORIZONTAIS
```

Isso derruba de uma vez todas as hipóteses sobre a caixa de areia, e explica por
que nenhuma delas funcionou.

### DUAS CAUSAS ACHADAS E CORRIGIDAS

**1. Os efeitos de nome do banner eram animações infinitas sem guarda.**

`.ef-chama`, `.ef-gelo`, `.ef-veneno`, `.ef-trovao`, `.ef-fantasma`, `.ef-neon`,
`.ef-glitch`, `.ef-holo` — oito laços de halo pulsante, e nenhum respeitava
`prefers-reduced-motion`. O `reducedMotion:'reduce'` da captura só desliga
animação que o CSS protege.

**Isto é defeito de acessibilidade antes de ser de teste:** quem pediu menos
movimento continuava recebendo brilho pulsando no próprio nome.

**2. `arte/cidade-neon.jpg` era JPEG PROGRESSIVO.**

Progressivo decodifica em PASSADAS: o navegador pinta grosseiro e vai refinando.
As bandas horizontais do diff são a assinatura disso. Num fundo de interface de
136 KB, progressivo não traz benefício nenhum — ele existe para foto grande em
conexão lenta.

Reencodado como baseline por `tools/reencodar-baseline.mjs`, sem dependência:
Chromium desenha num canvas e exporta, e canvas não conhece progressivo. Mesma
imagem, mesma dimensão, só a ordem dos bytes muda. Custo: +33% de arquivo.

### O QUE SOBRA

Depois das duas correções, ainda falha — desvio de 3 a 6 na mesma região.
Melhorou e não fechou.

**Treze hipóteses investigadas, cada uma com medição.** As onze descartadas:
GIF animado (`D-033`, era real) · linha de base velha na caixa (`D-039`, era
real) · decodificação da arte da vista · da arte dos filhos · contenção de CPU ·
ambiente da caixa isolada · cópias separadas de `arte/` · validação de base
concorrente · canvas frio · `<img>` comuns · achatamento do cenário.

### Por onde continuar

A ferramenta está pronta e é o que faltava nas primeiras dez tentativas:

```bash
DEPURAR_VISUAL=<pasta> node test/run.mjs --so=visual-base
```

Cada captura vira também um PNG. Duas execuções em pastas diferentes, e um diff
amplificado mostra ONDE — foi assim que as duas causas apareceram.

O que ainda não foi olhado: se `renderBattleBanner` é chamado ENTRE a espera e a
foto (ele roda a cada `setPhase`, e recria o elemento do cenário), e o
`retratoAnimado` do lutador apostado.

**`LIM_MEDIA_REGIAO` continua em 2.** Ele foi subido para 4 durante a
investigação e REVERTIDO: a sabotagem `S96` existe exatamente para punir "subir
o número até calar", e ela estava certa.

---

## D-042 — movimento reduzido apagava todo aviso da arena

**Introduzido em:** R30. **Achado em:** R32, por relato do dono do projeto.
**Corrigido em:** R32. **Bloco dono:** R32.

### O que aconteceu

O R30 fechou o `D-040` trazendo o reset padrão de acessibilidade para o
`index.html`:

```css
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{ animation-duration:.01ms !important; … }
}
```

Esse reset parte de uma premissa que **não vale neste arquivo**: a de que
animação é decoração. Aqui ela é o CICLO DE VIDA do conteúdo:

```css
#koToast.show{animation:koToastIn 2.6s ease-out forwards}
@keyframes koToastIn{ 0%{opacity:0} 10%{opacity:1} … 100%{opacity:0} }
```

O último quadro é o estado ESCONDIDO — é assim que o aviso some sozinho. Com
duração desprezível e `forwards`, a animação termina no instante em que começa
e o `forwards` segura o quadro 100%. O aviso nunca aparece.

### A medição

Com a arena aberta, amostrando a opacidade ao longo do tempo:

| | `#koToast` | `#streakToast` |
|---|---|---|
| movimento normal | pico **1,0** | pico **1,0** |
| movimento reduzido, antes | pico **0** | pico **0** |
| movimento reduzido, depois | pico **1,0** | pico **1,0** |

Os emblemas de canto (`#weatherBadge`, `#arenaBadge`, `#stormBadge`) **não**
foram atingidos: eles usam `transition` e o estado final é `opacity:1`.

### A correção, e a lição que ela carrega

O R30 resolveu um problema **de quem MEDE** dentro do **produto**, e foi isso
que quebrou o produto. As duas coisas foram separadas:

- **acessibilidade** fica no `index.html`: `animation-iteration-count:1`, que
  mata movimento perpétuo — o que a preferência de fato pede — sem encostar em
  animação finita;
- **determinismo** foi para `test/visual.mjs`, que conclui todas as animações
  (`getAnimations().finish()`) antes da digital. A linha de base seguiu estável
  em 4 de 4 execuções com a determinística no lugar certo.

`finish()` e não `pause()` em tempo zero: rebobinar levaria as animações de
ENTRADA ao quadro 0%, que costuma ser `opacity:0`, e a foto perderia elementos
que na tela estão visíveis há segundos.

### Por que a suíte não pegou

Nenhum teste estático alcançava: a regra que quebrou apenas zerava uma duração,
e o dano vinha do `forwards` declarado a duzentas linhas dali. A linha de base
visual fotografa a fase de APOSTA, onde nenhum aviso está na tela.

Agora há os dois lados: `test/arena-legivel.mjs` proíbe regra larga mexer em
`animation-duration` sob movimento reduzido, e `test/visual.mjs` mede a
opacidade dos avisos **com a preferência ligada**, no navegador. As sabotagens
`S448` e `S449` guardam os dois.

### Duas armadilhas de medição, registradas para o próximo

A primeira e a segunda tentativa de medir isto deram "está tudo quebrado"
quando estava tudo certo:

1. **animação CSS não roda dentro de ancestral escondido.** Os avisos vivem em
   `#arena`, e o app não abre nessa aba — sem ativar a view, lê-se a opacidade
   base;
2. **`#streakToast` anima pela classe `.anim`, não pela `.show`.** Só `.show`
   deixa o elemento visível-por-display e transparente.

---

## D-043 — o painel do protótipo continua sendo desenhado para o vazio

**Achado em:** R35, ao procurar onde moram as cores do pódio.
**Bloco dono:** um bloco de higiene do cliente. **NÃO corrigido aqui** — remover
encosta em três módulos, e o R35 é um bloco de cor.

### O que está acontecendo

`killfeed.mjs` tem duas funções que escrevem num painel que **não existe**:

```text
renderPodio()     -> #pdList, #pdNote
renderKillfeed()  -> #kfList, #kfNote
```

Os quatro ids estão ausentes do `app/index.html` — conferido, zero ocorrências
de cada. Eles existem no `prototype-v1.0/index.html` (linhas 2352 e 2361) e
**nunca foram portados**, porque o R4 UNIFICOU colocação, odds e abates no mesmo
painel `#pickList`. A unificação foi aprovada pelo dono do projeto e fica; o que
sobrou foi o desenho antigo, ainda sendo chamado.

Ambas começam com `if (!lista) return;`, então não quebram nada. Elas rodam a
cada abate e a cada aposta, montam nada, e voltam.

### O que isso arrasta junto

O CSS `.pdrow` e `.kfrow` — cerca de vinte regras, incluindo os enfeites de
primeiro lugar e a animação `brilhoLider` — é **inalcançável**. Ele não aparece
como órfão em varredura nenhuma porque as classes SÃO emitidas: por um
JavaScript que as escreve num elemento que não está na página.

É o `D-028` ao contrário. Lá havia classe emitida sem CSS; aqui há CSS e classe,
e não há onde pendurar.

### Por que não foi corrigido no R35

O `CLAUDE.md` é explícito: "corrigir fora do escopo do bloco, mesmo que seja
rapidinho" está na lista do NUNCA. Remover as duas funções toca `killfeed.mjs`,
`aposta.mjs` e `fases.mjs`, e as três chamadas precisam ser conferidas uma a uma
— `renderKillfeed` é chamada de dentro de `registrarAbate`, e `registrarAbate`
faz outras coisas que continuam valendo.

### O que a correção precisa cuidar

- `conferirAbates`, `conferirColocacao`, `mostrarPodio`, `limparPodio` e
  `resetKillfeed` do mesmo módulo **continuam em uso** e não saem junto —
  `test/visual.mjs` depende da conferência de fim de rodada;
- o cabeçalho de `test/painel-rodada.mjs` cita as regras `.pdrow` como o
  MODELO do que se recuperou na unificação. Ao remover o CSS, aquele comentário
  precisa dizer que ele virou histórico, ou o próximo leitor vai procurar
  regras que não existem mais.

---

## D-044 — um teste de aposta depende da odd sorteada, e reprova sozinho

**Achado em:** R37a, quando ele reprovou UMA vez dentro da caixa de areia do Q2.
**Bloco dono:** H1 — higiene da suíte, que o fechou.
**Estado:** CORRIGIDO em 29/08/2026. Ver "A correção, e o que a medição mudou
nela" no fim desta ficha.

### O sintoma

```text
[aposta-servidor] trocar para um valor MAIOR reserva a diferença, e para menor devolve
    o retorno passaria do teto por bilhete (50000)
```

### A causa

O teste aposta **300 no slot 0**. O teto por bilhete é 50.000, então ele reprova
sempre que a odd do slot 0 daquela rodada passar de ~166.

A odd vem do sorteio da rodada, e a raiz sai do CSPRNG — **muda a cada
execução**. Na esmagadora maioria das vezes o slot 0 tem odd baixa e o teste
passa; de vez em quando ele cai num azarão extremo e reprova por um motivo que
não tem nada a ver com o que ele afirma.

### A medição

    árvore de trabalho, 15 execuções          15 verdes
    com o ambiente da caixa, 10 execuções     10 verdes
    dentro do Q2                              1 vermelho observado

Ou seja: raro o bastante para passar despercebido por muitos blocos, e presente
o bastante para abortar um portão — que foi o que aconteceu.

**Isto é exatamente o que o `CLAUDE.md` chama de pior que vermelho constante:**
"vermelho constante é defeito com endereço, instável escolhe quando aparecer".

### O que a correção precisa fazer

O teste afirma uma coisa sobre RESERVA DE SALDO, e o valor apostado é acessório.
Duas saídas, e a primeira é melhor:

1. escolher o slot pela odd — apostar no de MENOR odd da rodada, que é o
   favorito, e cujo retorno cabe folgado no teto. O teste passa a depender de um
   fato estável ("existe um favorito") em vez de um sorteado;
2. derivar o valor da odd, apostando `min(300, teto/odd)`. Funciona, e deixa o
   teste com uma conta que o leitor precisa refazer para entender o que ele
   afirma.

Vale conferir se outros testes de `aposta-servidor` apostam valor fixo em slot
fixo — a mesma armadilha provavelmente está em mais de um.

### A correção, e o que a medição mudou nela

Fechado no **H1**, em 29/08/2026, pela saída 1 — apostar no favorito. Antes de
mexer, 150 rodadas medidas com o `sims=600` desta suíte:

```text
odd do FAVORITO       mediana  4,17   p95   6,40   máximo    7,13
odd do slot 0         mediana 12,51   p95  46,92   máximo  187,68
odd do CAMPEÃO        mediana  8,66   p95  31,28   máximo  112,61
MAIOR odd da rodada   mediana 46,92   p95 140,76   máximo  563,04

apostando 300 no slot 0      1 rodada de 150 reprova
apostando 300 no favorito    0 de 150
```

A medição confirmou a suspeita da ficha e a limitou. **Confirmou:** o slot fixo
é instável, e a cauda é aberta — `ODD_MAX` é `null` no `engine.mjs`, então nenhum
valor fixo é seguro por construção, e a maior odd observada (x563) estoura o teto
até com aposta de 100. **Limitou:** só o teste de 300 reprovava de fato; nos de
100 e 50 a armadilha existe e não foi observada em 150 rodadas.

Nove testes trocaram slot fixo por `c.fav`. Três NÃO trocaram, de propósito, e o
comentário do `maisBaratos` diz por quê: o teste do teto precisa estourar o teto,
e os de settlement precisam apostar no campeão ou num perdedor.

**O que protege a correção de se desfazer:** o teste
`a aposta no favorito cabe no teto com folga de 10×`. Ele não afirma o conserto,
afirma a margem que o conserto comprou — porque bastaria um bloco futuro escrever
`slot: 0` de novo para o defeito voltar, e voltar raro.

Sabotagem que prova que ele não é decorativo: inverter a ordenação do
`maisBaratos` para `DESC` — o "favorito" passa a ser o azarão. A suíte foi a
**18/19**, e o vermelho foi só nesse teste. Os outros dezoito seguiram verdes com
a sabotagem plantada, que é a razão de ele existir: nenhum deles pega a regressão.

Medição de estabilidade depois da correção: **25 execuções, 25 verdes**. E ela
vale pouco sozinha — o defeito antigo aparecia em ~0,7% das execuções, então 25
verdes seriam o resultado esperado mesmo sem conserto nenhum. **A prova é a
margem, não a repetição:** 300 × 7,13 = 2.139 contra um teto de 50.000.

## D-045 — a progressão do F1.10 está inteira no servidor, e o app nunca a chama

**Achado em:** bloco 0.1, ao conferir o critério de saída do F1.10.
**Bloco dono:** 0.1 (fechar o F1.10). **Estado:** ABERTO — precisa de decisão do
dono do projeto sobre o tamanho do bloco antes da correção.

### O sintoma, na frase do próprio bloco

O `BUILD_BLOCKS` declara como critério de saída do F1.10:

```text
progressão sobrevive a limpar o navegador
```

Hoje ela não sobrevive. Limpar o armazenamento local apaga XP, nível, medalhas,
progresso de desafio e trilha de login do jogador.

### A medição

As rotas de progressão existem, respondem e estão testadas de ponta a ponta:

```text
GET  /api/perfil          perfil, desafios, sequência, emitido na semana
POST /api/perfil/entrar   registra o dia da trilha
POST /api/resgate         o §28.8 inteiro
```

As rotas que o CLIENTE de fato chama, levantadas por varredura em `app/`:

```text
/api/admin/entrar     /api/aposta            /api/limites
/api/admin/margem     /api/aposta/cancelar   /api/limites/confirmar
/api/admin/painel     /api/carteira          /api/protecao
                                             /api/protecao/pausar
                                             /api/sala
```

**Nenhuma das três rotas de progressão aparece.** O perfil do app é lido e
gravado em `localStorage`, na chave `ar_profile` (`app/modules/perfil.mjs:57`
e `:82`), e os desafios são sorteados no cliente a partir da data, com a
recompensa creditada localmente (`app/modules/desafios.mjs`).

### Por que isto não apareceu antes

Existe um teste de "limpar o navegador" verde — `test/laco-servidor.mjs:75`. Ele
mede o **saldo**, e é o critério de saída do **F1.14**, não do F1.10. O dinheiro
sobrevive porque a carteira foi ligada no F1.16; a progressão não foi ligada em
bloco nenhum.

Um teste que checa algo PARECIDO com o que importa não protege nada — é a lição
registrada no R40, e aqui ela custou a impressão de que o F1.10 estava a uma
verificação de fechar.

### A classe do defeito, e ela tem nome neste projeto

É a SÉTIMA ocorrência do padrão que abre o `ROADMAP.md`: construído, suíte verde,
sabotagem provada, e não chega à tela. As anteriores são `D-028`, R7, R8, R13, o
R20 (quinta) e o `D-034` no R21 (sexta) — e o R20 registrou a sua com a frase
que serve aqui inteira: a conta mais importante era feita a cada chamada e
jogada fora sem ninguém ver.

**E há uma agravante que só aparece olhando a ficha da P1.2 no `ROADMAP.md`:**
o F1.10 foi marcado como formalmente FECHADO no R21, no mesmo dia em que o
`D-034` era registrado como a sexta ocorrência do mesmo padrão. O bloco foi
declarado fechado sobre um critério de saída — *progressão sobrevive a limpar o
navegador* — que **ninguém tinha medido**, e que era falso naquele momento e
continuou falso por seis dias.

O que faltava não era rigor: a P1.2 foi fechada depois de uma leitura cuidadosa
do código, que corrigiu a própria ficha e achou o `D-034`. Faltava um teste com
a forma do critério. É a lição do R40 na sua forma mais cara: **verificar as
sabotagens de um bloco não é o mesmo que verificar o critério de saída dele**,
e as duas coisas se parecem o bastante para uma passar pela outra.

Aqui é pior de um jeito específico: **o servidor está certo e o cliente está
sozinho.** As quatro sabotagens do bloco (S261, S262, S263, S266), os três itens
de Q6 (S210 entre eles) e o teto de emissão do §28.8 protegem um caminho que
nenhum jogador percorre.

### E ele está isolado nas DUAS pontas, não em uma

A varredura seguinte foi atrás de quem ALIMENTA a progressão no servidor, e a
resposta é ninguém:

```text
darXP            chamado em app/modules/perfil.mjs (a versão do cliente),
                 em server/progressao.mjs (a definição) e em
                 test/progressao-servidor.mjs. NENHUM chamador em server/
                 fora da própria definição.
registrarFeito   idem: só a definição e os testes.
```

Ou seja: mesmo que o cliente passasse a LER `/api/perfil` hoje, ele leria
`xp = 0` para sempre, porque nada no caminho de aposta, de liquidação ou do laço
da rodada chama `darXP` ou `registrarFeito`. A rota devolve fielmente um perfil
que nunca cresce.

Isso muda o tamanho da correção e o que ela significa. Ligar não é hidratar o
cliente: é **fechar o circuito**.

```text
hoje      cliente calcula XP e desafio  ->  localStorage
          servidor sabe calcular        ->  ninguém chama, ninguém lê

depois    cliente diz o que FEZ         ->  servidor deriva XP e desafio
          servidor é a fonte            ->  cliente projeta, como a carteira
```

A frase do §5.10 que o comentário das rotas já promete — *"elas recebem o que
ele FEZ, e o servidor deriva"* — hoje é verdadeira sobre a forma das rotas e
falsa sobre o sistema, porque o que ele fez nunca chega lá.

### O que a correção precisa fazer

Ligar o perfil ao servidor no mesmo desenho que a carteira já usa — hidratar do
servidor quando há sessão, manter o modo local completo quando não há. O §5.10 e
o F1.16 já dizem como: o cliente não é fonte do dado.

**O que a torna maior do que parece:** o cliente hoje CALCULA desafio e paga
recompensa. Ligar não é só ler — é tirar do cliente a emissão, que é a mesma
classe de mudança do F1.16 com a carteira. Enquanto isso não acontece, o teto de
emissão do Estudo Econômico vale no servidor e não vale no app.

### O que impede de escapar de novo

Um teste com a forma do `laco-servidor`, mas medindo PROGRESSÃO: cadastrar,
ganhar XP e um dia de trilha, `armazem.clear()`, entrar de novo, e exigir que XP,
nível e sequência voltem iguais. Ele fica vermelho hoje, de propósito, como o
`D-001` — e vira verde quando a ligação existir.

## D-046 — o portão de módulos é cego a símbolo usado só dentro de template literal

**Achado em:** bloco 0.1, ao sabotar o `modulos` para conferir que uma mudança
nele não o tinha enfraquecido. **Bloco dono:** 0.4 — higiene do arnês estático,
que o fechou. **Estado:** CORRIGIDO em 29/08/2026. Ver o fim da ficha.

### A medição

Tirei `tituloDe` do import de `app/modules/faixa.mjs`, que é um import de
verdade e o módulo quebraria em execução:

```text
import { avatarURL, avatarEhArte, avatarEnquadramento, trainerURL } from './perfil.mjs';
...
if (nv) nv.textContent = `NV ${np.nivel} · ${tituloDe(np.nivel)}`;
```

```text
modulos    VERDE 13/13     ← devia estar vermelho
```

O mesmo teste, com um símbolo usado em código comum — `recordBetPlaced` em
`fases.mjs`, chamada solta numa linha — reprova como deve:

```text
modulos    VERMELHO 12/13   fases.mjs usa sem importar: recordBetPlaced
```

### A causa

O teste exige que o símbolo apareça no código MASCARADO por `semTexto` e também
no texto cru. O `semTexto` mascara template literal inteiro, incluindo o que
está dentro de `${...}` — que é código, e não texto. O símbolo some do
mascarado, a primeira condição falha, e o defeito passa.

A condição dupla existe por um bom motivo, escrito ali: sem ela, menção em
comentário viraria falso positivo, e artefato de mascaramento também. O erro não
é a condição — é o mascarador tratar `${}` como parte do texto.

### É a mesma família do `D-032`

Aquele registra o `semTexto` perdendo a sincronia em literal de expressão
regular com aspas, e a ficha dele já diz a frase que vale aqui inteira: *código
mascarado como se fosse texto vira símbolo que desaparece antes de ser
procurado*. São duas manifestações do mesmo mascarador incompleto, e a correção
provavelmente é uma só.

### Quanto isso vale hoje

Não é hipótese: `faixa.mjs` é um caso real, e a interpolação é o jeito normal de
escrever texto de tela neste projeto. Todo símbolo que só apareça dentro de
`${...}` está fora da rede — e a rede existe porque três erros de import em
sequência custaram caro no F0.3b.

### O que a correção precisa fazer

`semTexto` preservar o conteúdo de `${...}` dentro de template literal, mascarando
só as partes literais. Fecha o `D-032` no mesmo movimento se a reescrita tratar
os três casos (aspas, crase com interpolação, literal de regex) num analisador
só, em vez de três remendos.

### A correção, e o que ela NÃO fez de propósito

Fechada no bloco 0.4. O percurso virou mútuo: `emCodigo` anda pelo código e
entrega o comando ao `emTemplate` na crase; `emTemplate` mascara as partes
literais e devolve o comando dentro de `${…}`. Aninha nos dois sentidos, porque
é recursão de verdade e não um contador.

**O D-032 continua aberto, e isso é decisão.** A sugestão acima era resolver os
três casos num analisador só. Distinguir `/` que abre expressão regular de `/`
que divide exige contexto que este percurso não tem — é um problema de risco
diferente, e resolvê-lo junto faria um bloco entregar duas correções que
merecem mensagens separadas.

### O que apareceu no caminho: o mascarador não tinha teste nenhum

Três suítes dependem dele — `modulos`, `carteira` e `tema` — e nenhuma o media.
Entraram sete testes diretos, incluindo o caso do defeito e o do template
aninhado dentro de interpolação.

```text
antes da correção   4 dos 7 vermelhos
depois              19/19 na suíte modulos · 50/50 com carteira e tema
```

**A prova é o caso real, e não o sintético:** tirar `tituloDe` do import de
`app/modules/faixa.mjs` — onde ele só aparece dentro de `${…}` — deixava o
portão VERDE. Agora reprova nomeando o símbolo e o módulo dono.

Rodar a suíte inteira com o mascarador mais afiado **não revelou nenhum import
ausente escondido**: 1079/1079 verde. A cegueira existia e não estava cobrindo
nada quebrado hoje.

### O defeito plantado que escapou, e o que ele ensinou

O `S524` — fazer a interpolação fechar na primeira chave — **passou** na
primeira tentativa. A causa era o teste: ele usava `${ g({ a: usado }) }`, com o
símbolo ANTES da chave que fecha o objeto, e ali ele sobrevive dos dois jeitos,
porque o mascaramento errado só começa DEPOIS dela.

Corrigido para `${ g({ a: 1 }, depoisDaChave) }`. É a terceira vez neste dia que
a sabotagem mostra um teste medindo algo adjacente ao que o nome dele promete —
as outras foram o `D-048` e os `S514`/`S515`/`S516`.

## D-047 — o modo servidor não tem caminho até o navegador

**Achado em:** bloco 0.1, ao tentar subir o backend para o dono do projeto
testar. **Bloco dono:** sem dono; precisa de decisão junto com o `D-031`.
**Estado:** ABERTO.

### A medição

```text
tools/servir.mjs    porta 8099   entrega app/, e NÃO tem /api  -> 404
server/principal.mjs porta 8080  entrega /api, e NÃO tem app/
app/modules/api.mjs  base = ''   ou seja: MESMA ORIGEM
```

Com `base` vazio, o app pede `/api/...` na origem em que ele mesmo foi servido.
Servido pelo 8099, ele pergunta ao 8099, que não tem API. Servido pelo 8080 —
que não serve HTML — ele nem abre.

**Consequência: não existe hoje uma forma de rodar o jogo contra o backend num
navegador.** Cadastro, carteira do servidor, rodada autoritativa, Liga e
progressão são alcançáveis apenas pela suíte, que chama `configurarApi({ base })`
e aponta para o servidor de teste.

### Por que isto importa mais do que parece

É a explicação de por que o `D-045` sobreviveu tanto tempo. A progressão do
servidor não era lida pelo cliente, e ninguém percebeu — porque **nenhum
caminho de navegador chega ao modo servidor**, então o sintoma nunca apareceu
para ninguém olhando a tela. O mesmo vale para tudo que o F1.14 e o F1.16
construíram: eles são medidos por teste e nunca por uso.

O cabeçalho do `tools/servir.mjs` registra a intenção com todas as letras — *"é
o que basta para jogar o modo local"* —, então isto não é um descuido de
implementação: é uma peça que nunca foi projetada, e a ausência dela não estava
escrita em lugar nenhum.

### As três saídas, e nenhuma é para dentro deste bloco

1. **o backend serve `app/`** — uma origem só, nada de CORS, e é o que a
   produção vai precisar de qualquer jeito;
2. **`servir.mjs` encaminha `/api` para o 8080** — menor, mas cria uma segunda
   forma de subir o jogo que só existe em desenvolvimento;
3. **`configurarApi({ base })` no boot, por parâmetro** — o mais barato e o pior:
   abre CORS e credencial entre origens para resolver conveniência local.

A (1) é a que a Spec já implica, e é decisão de arquitetura — não conserto de
passagem. Some-se a isso o `D-031`, que trata de em qual interface esse servidor
escuta, e as duas decisões são a mesma conversa.

### Por que não foi corrigido no bloco 0.1

O escopo dele é fechar o circuito da progressão, e o critério de saída foi
medido onde ele pode ser medido hoje — `test/progressao-ligada.mjs`, com servidor
de verdade e armazenamento de verdade. Servir o app pelo backend é superfície
nova, com Q6 próprio, e entraria num commit cuja mensagem fala de outra coisa.

## D-048 — o teste do perfil de leitura se declarava determinístico e não era

**Achado em:** bloco 0.1, quando o `npm run portoes` fechou INSTÁVEL — 1 de 2
execuções verdes. **Bloco dono:** H2 — higiene da suíte, que o fechou.
**Estado:** CORRIGIDO em 29/08/2026.

### O sintoma

```text
[liga-servidor] o perfil de leitura não esconde as previsões ruins
    nenhuma das duas certezas errou (notas: 0, 0)

✗ PORTÃO INSTÁVEL: 1 de 2 execuções verdes.
```

### A causa está no próprio comentário do teste

Ele fazia duas previsões de certeza, em slots diferentes, em DUAS RODADAS, e
justificava assim:

> *DUAS previsões de certeza, em slots DIFERENTES, em duas rodadas. (…) o que dá
> é garantir que PELO MENOS UMA das duas erre*

O raciocínio valeria na MESMA rodada, onde só um slot pode vencer. Em duas
rodadas independentes as duas podem estar certas — o campeão da primeira ser o
slot 0 e o da segunda ser o slot 1. Nenhuma nota 2, e o teste reprova por não
conseguir provar o que afirma.

**Estruturalmente ~0,083 × 0,083 ≈ 0,7% das execuções** — a mesma ordem de
grandeza do `D-044`, e baixo o bastante para 40 execuções isoladas voltarem
todas verdes. Ele aparece onde dói: abortando o portão.

### A correção, e o SEGUNDO defeito que ela revelou

Primeira parte: espiar o campeão — só o teste pode — e cravar a certeza num slot
que NÃO é ele. Erro garantido por construção, uma rodada só, zero sorteio.

Ao sabotar esse conserto (trocar `slotErrado` por `slotCampeao`, fazendo a
certeza acertar), **a suíte continuou VERDE**. A asserção era
`notas.some(x => x === 2)`: a segunda previsão, que pode acertar ou errar,
satisfazia o teste sozinha em ~92% das vezes. Ou seja, a asserção não media o
que o nome dela promete, e o teste teria voltado a depender do sorteio por outro
caminho.

Segunda parte, e é a que importa: a asserção passou a ser sobre a previsão
ESPECÍFICA que o teste garantiu ruim — `score === 2` na previsão daquela rodada.

```text
normal      17/17 VERDE
sabotado    16/17 VERMELHO   ← a certeza acerta, e a nota vem 0
```

### A lição, e ela não é sobre este teste

O conserto de instabilidade tem duas metades, e a segunda é fácil de pular:
tornar o fato determinístico, **e conferir que a asserção depende daquele fato**.
Sem a segunda, o teste fica verde por outro motivo — que é o mesmo modo de falha
do `S490`, com três asserções verdes sobre uma guarda que já não existia.

A sabotagem do próprio conserto é o que pegou. Ela custou dois minutos.

---

## D-049 — o `--tocados` perde o arquivo que foi RENOMEADO

**Achado em:** 30/08/2026, durante o bloco 1.1.
**Bloco dono:** T4 (arnês).
**Estado:** registrado, **não corrigido** — está fora do escopo do 1.1.

### O sintoma, medido

O bloco 1.1 trouxe `engine/instancia.mjs` por `git mv` a partir de
`tools/previas/instancia-proposta.mjs`, e plantou sete defeitos novos. O modo
incremental avaliou **cinco dos sete**:

```text
⚠  MODO INCREMENTAL — 16 de 524 defeitos.
S527 ✓ PEGOU   bioma
S528 ✓ PEGOU   evolucao
S529 ✓ PEGOU   evolucao
S530 ✓ PEGOU   evolucao
S531 ✓ PEGOU   evolucao
                       ← S525 e S526, ancorados em engine/instancia.mjs, não
                         apareceram na lista de alvos
```

### A causa

`arquivosTocados()` lê `git status --porcelain` e corta os três primeiros
caracteres de cada linha. Para um arquivo renomeado, a linha inteira é

```text
RM tools/previas/instancia-proposta.mjs -> engine/instancia.mjs
```

e o corte devolve `tools/previas/instancia-proposta.mjs -> engine/instancia.mjs`,
que não casa com âncora nenhuma. O destino da renomeação some da lista.

### Por que é registrado e não corrigido agora

O `--tocados` **não fecha bloco nenhum** — é ferramenta de laço de construção, e
o `npm run sabotagem` inteiro cobriu os sete no fechamento do 1.1. O prejuízo é
de confiança durante a construção, não de portão.

Mas ele é da família do `S109`, que é a família que este projeto trata como a
mais perigosa: **redução silenciosa**. O modo anuncia "16 de 524" com a mesma
segurança com que anunciaria 18, e quem lê não tem como saber que dois defeitos
novos ficaram de fora justamente do arquivo que o bloco criou.

### O que o T4 tem de fazer

Partir a linha no `' -> '` e ficar com o **destino** — o lado esquerdo é um
caminho que já não existe, e ancorar defeito nele seria erro de pré-voo. Vale
também para `C` (cópia), que tem a mesma forma.

O defeito plantado que trava a correção: renomear um arquivo com defeito
ancorado e conferir que o `--tocados` o inclui.

---

## D-050 — o portão saiu INSTÁVEL uma vez, e não reproduziu

**Achado em:** 31/08/2026, no fecho do bloco 1.2d.
**Bloco dono:** T4 (arnês).
**Estado:** registrado, **causa não confirmada**. Um candidato foi endurecido.

### O que aconteceu

```text
✗ PORTÃO INSTÁVEL: 1 de 2 execuções verdes.
```

E o nome do teste que falhou **se perdeu**: eu rodei `npm run portoes` com a
saída passando por `tail -12`, e as doze últimas linhas não incluíam a falha.

Isso é o primeiro achado, e é de processo: **o portão grita uma vez.** Quando a
saída é truncada, a instabilidade vira boato. Daqui para a frente a execução do
portão vai para arquivo inteiro, e o `tail` lê o arquivo.

### O que foi medido depois

```text
suíte inteira        10 execuções verdes seguidas
  · 2 npm test
  · 8 dentro de 4 `npm run repetir`
idle-servidor        60 voltas seguidas, zero falhas
```

Os dois testes do 1.2d que usam sorteio real estão a **mais de sete desvios** da
barra que afirmam — `criadas > 30` de 60 a 85%, e `falhas > 25` de 40 a 1,5%.
Não é ali.

### O candidato, e por que ele não foi confirmado

Sobraram **quatro** caixas `pokearena-d030-*` no temporário. Elas vêm do teste
do D-030 em `test/banco-servidor.mjs`, que cria um diretório, abre um banco de
verdade dentro dele e apaga tudo num `finally`:

```js
finally { rmSync(raiz, { recursive: true, force: true }); }
```

**No Windows, apagar um arquivo de banco recém-fechado pode dar `EPERM`/`EBUSY`**
enquanto o sistema ainda solta o descritor. E `force: true` **não** cobre isso —
ele silencia `ENOENT` e mais nada. Um `rmSync` que lança dentro de um `finally`
propaga a exceção e **reprova o teste**, mesmo com o corpo do `try` inteiro
verde.

O sintoma casaria perfeitamente: falha intermitente, dependente de carga, que
deixa exatamente a caixa que foi encontrada. E o portão é justamente quando há
carga — a sabotagem martela o disco com trabalhadores em paralelo.

**Não reproduziu isolado:** 40 voltas de abrir/migrar/fechar/apagar, zero falhas
e zero sobras. Isolado não é a condição do portão.

### O que foi feito

O `finally` ganhou `maxRetries`/`retryDelay` — o remédio documentado do Node
para `EBUSY` — e um `try/catch` em volta: **falhar em limpar não pode reprovar
um teste que passou.** Caixa esquecida é vazamento a reportar (D-036), não
resultado de teste.

Isso REMOVE UM CANDIDATO. Não prova que era ele.

### O que o T4 tem de fazer

1. **Fazer o portão gravar a falha em arquivo**, sempre. Um `repetir-portao.mjs`
   que só escreve na saída padrão depende de quem o chamou não truncar;
2. **Contar as caixas sobreviventes ao fim do portão** e reprovar se houver —
   hoje elas são achadas por acaso, e foi por acaso que esta apareceu;
3. se a instabilidade voltar **com o nome**, este registro é o ponto de partida.

### A regra que fica

Bloco não fecha com portão instável. O 1.2d só fechou porque a instabilidade
está **registrada com endereço**, um candidato foi removido, e dez execuções
seguidas ficaram verdes. Se voltar, o dono é este defeito.

### Por que este conserto NÃO ganhou defeito plantado

A regra do projeto é clara: defeito registrado ganha teste que o afirma de
propósito. Aqui ela **não se aplica**, e a exceção merece estar escrita.

Um mutante que devolvesse o `rmSync` cru só seria pego **quando a corrida
acontecesse** — e ela acontece raramente, sob carga. Um defeito plantado que
depende de sorte para ser detectado não mede o arnês: ele **torna o portão Q2
instável**, que é exatamente a doença que este registro está tratando.

Plantar aqui seria trocar uma instabilidade rara na suíte por uma instabilidade
rara no portão. A trava certa é a do item 2 do T4 — **contar as caixas
sobreviventes ao fim do portão** —, que é determinística e pega a família
inteira em vez deste caso.

### CORREÇÃO DO PRÓPRIO DIAGNÓSTICO (31/08/2026, mesma sessão)

O portão seguinte veio **VERDE nas duas execuções** e Q2 **565/565** — e trouxe
o fato que enfraquece o candidato acima.

Sobrou **uma** caixa `pokearena-d030-*`, e o aviso que o `catch` novo imprime
(`⚠ não consegui apagar …`) **não apareceu em lugar nenhum do log**. Ou seja: a
caixa vazou sem o `rmSync` ter falhado.

**A explicação inocente é o teto de tempo por mutante.** A sabotagem mata o
processo do mutante que pendura (ver `test/sabotagem.mjs`, "TETO DE TEMPO POR
MUTANTE"). Processo morto **não roda `finally` nenhum** — e cada mutante roda a
suíte inteira, `banco-servidor` incluída.

Então:

```text
o que eu inferi     as caixas provam que o rmSync falha sob carga
o que se mediu      as caixas são explicadas por worker morto no teto de tempo
```

**A evidência que motivou o conserto tinha explicação inocente.** O conserto
continua certo — `rmSync` sem `maxRetries` num `finally` é frágil no Windows por
construção, e limpar não pode reprovar teste que passou. Mas ele é **defesa em
profundidade, e não a correção de uma causa provada.**

Isto fica escrito porque diagnóstico errado no registro é pior que registro
nenhum: quem chegar depois confia nele e procura no lugar errado.

**A causa da instabilidade continua desconhecida.** O que o T4 tem de fazer não
muda — e o item 2 (contar caixas ao fim do portão) precisa agora **descontar as
que morreram no teto de tempo**, senão ele reprova o portão por um vazamento que
é do próprio portão.

---

## D-051 — o pack original tinha UMA espécie comum, e a suíte inteira estava verde

**Achado em:** 31/08/2026, no bloco 1.3b, escolhendo as criaturas iniciais.
**Bloco dono:** 1.3b. **Estado: CORRIGIDO no mesmo commit.**

### O que foi medido

```text
              n    min  p25  mediana  p75  max
kanto       146    195  320    405    490  600
original     76    288  450    490    505  600

              comum  incomum  raro  muitoRaro  lendario
kanto            52       27    35         31         1
original          1        8    35         31         1
```

**Uma espécie comum em setenta e seis.** Oitenta e oito por cento dos encontros
do pack original cairiam em "raro" ou pior — faixas com captura de 14%, 6% e
1,5%. O farm ali seria injogável: o jogador olharia para uma lista de criaturas
que não consegue tocar.

### A causa

As faixas de raridade viraram dado do pack no bloco 1.2b, e eu **copiei os tetos
de Kanto para o pack original**. Os dois elencos têm distribuições de força
muito diferentes: a mediana do original é 490 contra 405, e o primeiro quartil é
450 contra 320. Os mesmos tetos, sobre outra distribuição, produzem outro jogo.

### Por que NENHUM teste pegou

E esta é a parte que importa. Havia cinco testes sobre raridade, e todos
passavam:

```text
a raridade cresce com a força, sem exceção          ✓ passava
toda espécie do pack tem pelo menos um bioma        ✓ passava
o elenco de um bioma vem ordenado por força         ✓ passava
§Gen2 · a captura funciona com a escala de OUTRO pack ✓ passava
§Gen2 · o pack ORIGINAL tem biomas e naturezas próprios ✓ passava
```

Todos perguntavam se a raridade era **coerente**. Nenhum perguntava se ela era
**jogável**. Cada teste respondia corretamente a pergunta que sabia fazer, e a
pergunta que faltava não tinha dono.

É a mesma família do `S542` do bloco 1.2a: um teste que existe, roda, fica
verde, e não mede o que o nome dele promete medir.

### O conserto

Os tetos do pack original passaram a sair dos quantis **dele**, mirando a forma
que Kanto produz:

```text
kanto     comum 35,6%  incomum 18,5%  raro 24,0%  muitoRaro 21,2%
original  comum 35,5%  incomum 22,4%  raro 19,7%  muitoRaro 21,1%
```

A **chance de captura e o alvo de dossiê continuam iguais** nos dois packs, de
propósito: eles são a DIFICULDADE da faixa, e dificuldade não muda de tema. O
que muda é onde cada faixa começa.

### A trava, e ela é o que faz este registro valer

`test/bioma.mjs` ganhou um invariante que mede a DISTRIBUIÇÃO em vez da
coerência: entre 20% e 55% do elenco tem de ser comum, e nenhuma faixa
não-lendária pode ter menos de três espécies.

Sabotado de volta, ele reprova com o número na cara:

```text
[original] 1.3% do elenco é comum (1 de 76). Abaixo de 20% o farm vira loteria.
```

---

## D-053 — o conferidor de módulos lê `let a = 1, b = 2` como símbolo global

**Achado em:** 31/08/2026, ao registrar o `outfit.mjs` na tabela de camadas.
**Bloco dono:** T4 (ferramental de portão). **Medição:** abaixo.

### O que acontece

O `test/modulos.mjs` afirma que nenhum módulo usa símbolo conhecido sem
importar. É um bom portão — foi ele que pegou mais de um erro de ligação que a
suíte inteira deixava passar. Mas ele **não enxerga declaração múltipla**:

```js
let ox = lx1, oy = ly1, fx = -1, fy = -1;   // acharGrade, em outfit.mjs
```

Ele reconhece `ox` como declarado e para no primeiro; `fx` fica de fora, casa
com o `fx` exportado pelo `render.mjs`, e o portão acusa:

```text
outfit.mjs usa sem importar: fx (de render.mjs)
```

### Por que isso importa mais do que um falso positivo

Falso positivo cansa, e portão que cansa é portão que alguém desliga. Mas o
erro é simétrico e o outro lado é pior: **um símbolo REALMENTE não importado,
declarado na segunda posição de um `let` múltiplo em outro arquivo, passaria
despercebido** — porque a mesma leitura que inventa este alarme deixa de ver o
caso legítimo. O portão existe justamente para o erro de ligação que derruba o
app em execução e passa verde na suíte.

### Medição

```text
declarações múltiplas no repositório   verificar no bloco T4
falsos positivos hoje                  1 (este), contornado renomeando
falsos negativos hoje                  desconhecido — e é esse o problema
```

### O contorno de hoje, e por que ele não é a correção

`fx`/`fy` viraram `fimX`/`fimY` no `outfit.mjs`. Os nomes ficaram melhores —
`fx` num arquivo de imagem sugere efeito, e ali significa "x final" — mas
renomear a vítima não conserta a arma. **O defeito fica aberto**, e a correção
é o conferidor passar a ler todos os declaradores de um `let`/`const`/`var`.

### O teste que trava quando alguém corrigir

`test/modulos.mjs` ganha um caso que declara dois símbolos numa linha, sendo o
segundo o nome de um export conhecido, e afirma que o conferidor **não** acusa.
Hoje ele acusa, e por isso o teste nasce afirmando o defeito — como o D-001.

---

## D-054 — a chave de cor da aba de rotas apagava o contorno de todo outfit

**Achado em:** 31/08/2026, pelo dono, olhando. **Bloco dono:** 1.5c — corrigido
no mesmo dia. **Estado:** CORRIGIDO, com teste.

### O que acontecia

O `carregarAtor` do `idle-tela.mjs` tirava o fundo lendo a cor do canto da
folha. Fazia sentido com a folha do cartucho, que vem com fundo chapado.

A folha NOSSA sai da esteira **com alfa**. O canto é transparente — e os canais
de cor de um pixel transparente são zero. A chave passava a valer, literalmente:

```js
const [r0, g0, b0] = p;        // 0, 0, 0
if (p[i] === 0 && p[i+1] === 0 && p[i+2] === 0) p[i+3] = 0;
```

**"Apague todo pixel preto"** — e preto é o contorno de todo outfit em pixel
art, mais as botas, o cabelo escuro, as alças da mochila.

### Por que nenhum teste pegou

Porque não é erro de execução. Apagar pixel é uma operação perfeitamente
válida: a página carrega, o boneco anda, o `pageerror` do Q5 não dispara, e a
digital visual do Q5 não cobre o canvas do idle.

E porque a MESMA folha ficava perfeita na bancada. Duas telas, um arquivo,
resultados diferentes — o tipo de coisa que só aparece comparando as duas, que
foi exatamente o que o dono fez.

### A correção

```js
if (p[3] > 8) { /* só então chavear */ }
```

Uma linha. Se o canto já é transparente, não há fundo para tirar.

### O teste que trava

`test/idle-tela.mjs` afirma que a tela confere o alfa do canto antes de
chavear. Sabotado — removendo a guarda — a suíte fica vermelha.

---

## D-055 — a vara de pescar colava duas vistas numa célula só

**Achado em:** 31/08/2026, pelo dono ("o fisherman está saindo perfil e
costas"). **Bloco dono:** 1.5c — corrigido no mesmo dia. **Estado:** CORRIGIDO.

### O que acontecia

`celulas` separava as vistas procurando colunas **completamente vazias**. O
`trainer_fisherman` tem três vistas legítimas lado a lado — mas a vara de pesca
do perfil sobe em diagonal e cruza o vão até a figura de costas. Nenhuma coluna
daquele vão fica vazia: sobra um pixel de linha de nylon.

Resultado: duas células em vez de três, a do meio com 47 px e DUAS figuras
dentro. No mundo, o jogador via dois pescadores lado a lado dentro do mesmo
quadro, andando juntos.

### A correção, e por que ela é geral

O que separa uma figura de um adereço não é existir, é a **densidade**:

```text
uma perna, mesmo fina    cobre a altura inteira da figura   centenas de px
uma vara de pesca        cruza a coluna em diagonal         1 a 3 px
```

Duas ordens de grandeza entre os dois, e é por isso que um limiar de 2% da
altura resolve sem ajuste por arquivo. Vale para vara, cabo, antena, cauda —
qualquer coisa que o dono gere depois e que atravesse o vão.

### Medido

```text
antes    fisherman  vistas 21/47/21 px   (a do meio com duas figuras)
depois   fisherman  vistas 21/22/23 px
```

---

## D-056 — a base visual local ficou anterior ao botão ROTAS no menu

> **CORRIGIDO PARCIALMENTE POR D-057.** A causa nomeada aqui era plausível e
> NÃO era a causa da tela de início — aquela era uma colisão de classe CSS, um
> defeito de verdade, e eu regravei a base por cima dele. O que segue continua
> valendo como medição; a conclusão, não. Leia o D-057 junto.

**Achado em:** 31/08/2026, no primeiro `npm test` com navegador da sessão.
**Bloco dono:** 1.5f — resolvido no mesmo dia. **Estado:** RESOLVIDO, com causa
nomeada.

### O que acontecia

O portão Q5 acusou **16 telas fora da base**, incluindo `inicio`, `arena` e
`regras` — telas que o bloco não tinha tocado.

### A medição que mudou o diagnóstico

Duas execuções seguidas, números idênticos ao dígito:

```text
inicio@medio      63 de 64 regiões — região 2,1 (média 55.3, pico 196)
arena@estreito     2 de 64 regiões — região 0,0 (média 13.3, pico 105)
regras@estreito    2 de 64 regiões — região 0,0 (média 13.0, pico 104)
comofunciona@estreito  2 de 64 — região 0,0 (média 13.0, pico 104)
```

**Instável** seria tremulação — animação não congelada, sorteio na tela. Isso
pediria caçar não-determinismo. **Estável** é mudança real, e mudança real pede
causa nomeada: regravar sem explicar a diferença está no `CLAUDE.md` sob
"Nunca".

Repare que as três telas `@estreito` acusam as MESMAS duas regiões com os
MESMOS valores. Assinatura idêntica em telas diferentes é sempre algo
compartilhado — e o que as três compartilham é o cabeçalho.

### A causa

```diff
+    <button class="nav" data-view="viewIdle">Rotas</button>
```

Acrescentado às 10:50, no commit `123d6cd` (1.3b+1.3c). A base local é de 09:50.

Um item novo no menu aparece em **todas** as telas. Ele desloca o canto superior
esquerdo — regiões 0,0 e 1,0, exatamente onde as três telas estreitas acusam — e,
onde o menu quebra linha, empurra a página inteira para baixo, fazendo quase
toda região da impressão digital divergir. Daí os 63 de 64 do `inicio`.

O diff confirmou o resto por eliminação: nenhuma remoção no HTML, nenhuma regra
CSS global nova (todas escopadas em `#viewIdle`, `.outfit`, `.vivo`), e um único
módulo compartilhado tocado — `sprites.mjs`, com exports novos e nada mais.

### A lição, que é a parte que fica

**Base visual gerada no meio de um bloco não é base.** A de 09:50 foi capturada
de uma árvore de trabalho que ainda não era commit: uma hora depois o menu
mudou, e a base passou a descrever um app que nunca existiu num commit.

Regravar a base é ato de FECHO de bloco, junto com o commit, e não um comando
que se roda quando dá vontade. É o que o `CLAUDE.md` já diz sobre fixture, e
vale igual aqui.

### O que NÃO foi tocado

`test/fixtures/visual-base.json`, a referência do projeto. O que se regravou é a
base LOCAL desta máquina (`win32-chromium-151`), que é a que o portão compara
aqui — e ela é ignorada pelo versionamento de propósito.

---

## D-057 — a classe `.vivo` colidiu com o letrado da marca, e o logo cobriu o título

**Achado em:** 31/08/2026, **pelo dono**, olhando a tela de início.
**Bloco dono:** 1.5d, que introduziu a colisão. **Estado:** CORRIGIDO.

### O que acontecia

A camada de elementos do idle nasceu com a classe `.vivo`. Mas `.vivo` **já
existia neste arquivo**, como modificador do letrado da marca:

```html
<span class="letrado vivo" id="heroMarca"><i></i><b></b></span>
```

A minha regra pôs `position:absolute` nele. Absoluto sai do fluxo, o
`.hero-mark` colapsou para **altura zero**, e o logo passou a flutuar por cima
do `<h1>` da tela de início.

```text
antes da correção   .hero-mark  altura 0    ·  arte de 124 px transbordando
                    h1          começa em 174, arte termina em 280 — 106 px
                                de sobreposição
depois              .hero-mark  altura 124  ·  h1 começa em 298, sem encostar
```

### E ESTE É O PONTO QUE IMPORTA: eu regravei a base visual por cima disto

O portão Q5 acusou 16 telas fora da base, `inicio` entre elas. Eu investiguei,
achei que o botão ROTAS no menu — acrescentado depois da base — explicava tudo,
e regravei.

**A explicação estava errada, e eu a dei com confiança.** O botão pode ter
contribuído; a causa real da tela de início era esta colisão, e ela é um defeito
de verdade. Regravar a base assou o defeito na referência: a partir dali o
portão passaria a exigir a tela QUEBRADA.

Foi o dono quem viu — *"o nosso LETRADO+LOGO fixou na tela de inicio"* — depois
de eu ter olhado a mesma tela e dito que ela renderizava corretamente.

### As duas lições, e a segunda é a cara

1. **Nome de classe curto e genérico num arquivo de 4.000 linhas é colisão
   esperando acontecer.** O prefixo custa cinco letras: a regra agora é
   `#idleVivos .vivo`. Barato demais para ter sido deixado de fora.

2. **Causa plausível não é causa verificada.** Eu provei que o botão ROTAS
   entrou DEPOIS da base — verdade — e concluí que ele era a causa, que não
   segue. A prova que faltava era simples e eu não fiz: desfazer a mudança
   suspeita e ver a diferença sumir.

   Regravar base ou fixture exige causa **verificada**, e não causa plausível.
   O `CLAUDE.md` diz "com a diferença explicada"; fica valendo mais forte —
   explicada E confirmada desfazendo.

### O que corrige o D-056

O D-056 fica registrado com a causa que eu dei, e com esta correção ao lado:
a parte verificável dele (a base era anterior ao botão) continua verdadeira; a
conclusão (que isso explicava as 16 telas) não. A base foi regravada de novo
DEPOIS da correção, e é essa que vale.

---

## D-058 — o alargamento do painel da rota nunca chegou a valer

**Achado em:** 31/08/2026, **pelo dono** — *"outro detalhe você também não fez o
aumento da tela né?"*. **Bloco dono:** 1.5e. **Estado:** CORRIGIDO.

### O que acontecia

Eu escrevi a regra, expliquei no commit, e ela **nunca casou com nada**:

```css
#viewIdle .painel:first-of-type { width:96vw; margin-inline:calc(50% - 48vw) }
```

O painel da rota não tem a classe `.painel`. Ele é `.card.idleDepois`, dentro de
um `.app` — e `.app` tem `max-width:1560px`, que é a largura de leitura da Arena.
A regra ficou no arquivo, bonita e inerte.

### Como eu não vi

Medi no navegador e o palco deu 1054 px numa janela de 1099. Bateu com o que eu
esperava do 96vw — **mas batia igual sem a regra**, porque naquela janela a
coluna do app já era quase a tela toda. Medi numa largura em que o defeito não
aparece, e chamei de verificado.

```text
janela 1099   com a regra 1054  ·  sem a regra 1054   ← indistinguível
janela 1600   com a regra 1536  ·  sem a regra 1180   ← aqui aparece
```

### A correção

O cartão ganhou nome próprio (`.cardRota`) em vez de depender de posição e de
uma classe que ele não tem. Medido em 1600 px: painel 1536, palco 1534, cartões
de leitura intactos em 1557, sem rolagem lateral.

### A lição, que é a mesma do D-057 de outra forma

**Medir numa configuração onde o defeito não pode aparecer não é medir.** É a
mesma família do `garantirBase` do portão Q2 — validar UMA configuração e julgar
em quatro — e é a terceira vez que ela morde neste projeto.

Regra que fica para mudança de layout: medir na largura em que a mudança DEVE
fazer diferença, e não na primeira que estiver aberta.

---

## D-052 — o teto diário conta EXPEDIÇÕES, e devia contar ENCONTROS

**Achado em:** 30/08/2026, respondendo a uma pergunta do dono sobre quantos
Pokémon aparecem num dia. **Registrado aqui em:** 31/08/2026 — ele existia no
mapa de decisões como "A CORRIGIR" e **nunca foi escrito neste arquivo**, o que
é falha de processo minha: eu disse que estava registrado e não estava.
**Bloco dono:** 1.6a. **Estado:** CORRIGIDO em 31/08/2026, nas três camadas.

### O que acontece

`TETO_DIARIO = 4` limita quantas expedições se conclui por dia. Mas o que o
jogador leva para casa não são expedições: são ENCONTROS, e cada perfil rende um
número muito diferente deles.

```text
perfil     encontros por expedição     4 expedições rendem
batida            3 a 5                    12 a 20
trilha            6 a 8                    24 a 32
vigília          10 a 14                   40 a 56
```

O dia CHEIO desenhado — uma Vigília dormindo, uma Trilha à noite e duas Batidas
entre rodadas — rende de 22 a 32, com meio em **27**. Quatro Vigílias rendem até
**56**: mais que o dobro, com a mesma contagem de "quatro expedições".

### Por que isso não é um detalhe de número

O teto existe pelo §P5, e o comentário do próprio `expedicao.mjs` explica: num
jogo em que o que se farma é VENDÁVEL, o teto é o que impede tempo virar
dinheiro sem limite. Contando expedições, o teto não limita o que sai — limita
quantas vezes se clica. Quem descobre a Vigília ganha o dobro pelo mesmo teto, e
a descoberta vira a estratégia dominante.

E arruína o desenho dos perfis: eles deveriam ser uma TROCA (ritmo por hora
contra total por sessão). Com teto por expedição, não há troca: a Vigília
domina em tudo.

### A correção, e a parte difícil dela

Contar encontros. A parte difícil é que **o número de encontros só existe na
COLHEITA** — a semente é sorteada ali, e é isso que torna o saque auditável
(bloco 1.2d). No início da expedição ninguém sabe quantos serão.

A solução que preserva as duas coisas é RESERVA:

```text
ao INICIAR    reserva o MÁXIMO do perfil. Recusa se o que já foi colhido
              hoje + o reservado das que estão em campo + o máximo do perfil
              passar do teto.
ao COLHER     desconta o real e devolve a diferença à reserva.
```

Assim o teto nunca é ultrapassado, a recusa acontece no clique (onde o jogador
consegue entender) e a semente continua nascendo na colheita.

### O que NÃO pode mudar junto

O §P5 como AUSÊNCIA DE PORTA. `iniciar()` não aceita parâmetro que mude o teto,
e o teste que tenta cinco parâmetros venenosos continua valendo com o teto novo
— senão a correção abre exatamente a porta que o teto existe para fechar.

### Como ficou

```text
TETO_ENCONTROS = 30    o dia cheio pede até 32 e rende 27 no meio; 30 corta a
                       cauda de sorte máxima, e não o dia. Cortar em 27 puniria
                       quem teve sorte na Vigília tirando dele a última Batida.
reserva                iniciar() reserva o MÁXIMO do perfil; colher desconta o
                       REAL, e a diferença volta sozinha porque a reserva é
                       DERIVADA do que está em campo, e não guardada.
```

Nas três camadas, todas perguntando ao motor: `engine/expedicao.mjs` decide,
`app/modules/idle-dados.mjs` e `server/idle.mjs` perguntam. O banco ganhou a
coluna `encontros`, gravada DENTRO da transação que marca a colheita — fora
dela, uma queda entre as duas escritas daria encontros de graça.

A tela dizia "4 expedições hoje" e passou a dizer "0/30 encontros hoje": com o
teto em encontros, cinco Batidas cabem e duas Vigílias não, e mostrar a unidade
errada faria o jogador contar a coisa errada e ser recusado sem entender.

### O efeito no desenho, que era o ponto

```text
antes   4 Batidas = 12 a 20 encontros   ·   4 Vigílias = 40 a 56
depois  ~6 Batidas cabem                ·   2 Vigílias cabem
```

O perfil pequeno rende MAIS vezes e o grande MENOS vezes. Os perfis voltaram a
ser uma troca — ritmo por hora contra total por sessão — em vez de a Vigília
dominar em tudo.

---

## D-059 — `--sem-navegador` sobe os cinco Chromium e joga o resultado fora

> **CORRIGIDO no T6** (01/09/2026). A decisao saiu do `run.mjs` e virou
> `test/bandeiras.mjs`, com tabela-verdade em `test/bandeiras-suite.mjs` e o
> defeito plantado `S625`. **Medido: 3 min 30 s -> 1 min 25 s**, 96 suites,
> 1375/1375 verde. Os 84 s que sobram sao trabalho de verdade: `servidor`
> custa 39 s sozinha. A ficha fica pelo raciocinio, que se repete.

**Achado em:** 01/09/2026, medindo por que o laço de construção tinha ficado
lento. **Bloco dono:** T6 (proposto no mesmo commit). **Estado:** registrado.

### A medição, que é o que denuncia

O `CLAUDE.md` registra `npm run rapido` em **7 s**. Medido hoje, na mesma
máquina, com a mesma bandeira:

```
npm run rapido                              3 min 30 s
node test/run.mjs --sem-navegador --so=fauna     0,26 s
node test/run.mjs --sem-navegador --so=visual    2 min 04 s
```

A terceira linha é a que não fecha: `visual` **está** na lista `COM_NAVEGADOR`,
e mesmo assim custa dois minutos com a bandeira que existe para não pagar
navegador.

### A causa

`test/run.mjs:228`

```js
const COM_NAVEGADOR = ['visual','visual-base','ambientes','rodada-viva', ...];
const precisaNavegador = !SO || SO.some(n => COM_NAVEGADOR.includes(n));
```

`precisaNavegador` consulta `SO` e **não consulta `semNavegador`**. Com
`--sem-navegador` e sem `--so`, `!SO` é verdadeiro, a condição abre, e as cinco
partidas de Chromium acontecem. Trinta e sete linhas depois, `test/run.mjs:370`
remove do resultado toda suíte que precisaria delas:

```js
const suites = SO ? todas.filter(x => querSo(x.nome))
  : semNavegador ? todas.filter(x => !COM_NAVEGADOR.includes(x.nome))
  : todas;
```

Os cinco navegadores sobem, medem, e **ninguém lê o que eles mediram**. Não é
lentidão: é trabalho inteiro jogado no lixo, três minutos e meio por execução.

### Por que passou despercebido

O comentário logo acima da linha errada descreve a intenção certa e cobre o
outro caso:

> *"Com `--so` fora desta lista, as cinco partidas de Chromium não acontecem —
> é o que faz `--so=carteira` custar 0,2 s em vez de 95 s."*

Quem escreveu — eu — pensou no `--so` e esqueceu do `--sem-navegador`, que é
justamente a bandeira a que o número documentado se refere. E o defeito não
tem sintoma: a suíte fica **verde**, com a contagem **certa**. Só o relógio
sabe, e ninguém olha o relógio de um comando que se chama `rapido`.

É a mesma família do D-058: uma condição que nunca casa, e um número que eu
mesmo publiquei sem medir de novo depois.

### O que o corrige, e o que ele NÃO é

Uma condição:

```js
const precisaNavegador = !semNavegador && (!SO || SO.some(n => COM_NAVEGADOR.includes(n)));
```

**Não é para fazer junto de outro bloco.** Ela mexe no arnês que julga todos os
outros blocos, e mudança de arnês entra sozinha, com a medição antes e depois no
commit — do contrário não há como saber se o tempo caiu por causa dela ou por
causa do que veio junto.

### O teste que trava

Defeito plantado que devolve `precisaNavegador` à forma antiga, pego por uma
afirmação nova em `test/portao.mjs`: **com `--sem-navegador` e sem `--so`,
nenhum processo de Chromium é iniciado.** Sem essa afirmação a correção é
verde dos dois lados, que foi exatamente como o defeito nasceu.

### O número documentado também está errado, e por outro motivo

O `CLAUDE.md` diz *"as 21 suítes sem navegador — 7 s (T3)"*. Hoje o `rapido`
roda **95 de 105 suítes**. O 21 é de quando a bandeira carregava uma lista
escrita à mão; o D-017 a tornou derivada e o número nunca foi reescrito. As duas
correções vão no T5, e o número novo é medido, não estimado.


---

## D-060 — `sala-cliente` falha com `fetch failed`, raramente, e aborta o Q2

> **MEDIDO EM 02/09/2026, e ele encareceu.** Ele abortou o Q2 DUAS vezes no
> mesmo dia, e cada aborto custa a execução inteira do portão — ~12 min. Nos
> dois casos a caixa de areia preservada reproduziu VERDE quando rodada à mão,
> que é a assinatura do intermitente e não de um defeito do bloco.
>
> Enquanto ele era raro, conviver custava paciência. Agora custa **tempo de
> portão**, e tempo de portão é o que decide se a sabotagem roda antes de cada
> commit ou se alguém começa a pulá-la — que é como um portão morre.
>
> **Sobe de prioridade.** O sintoma é `fetch failed` na subida do servidor de
> teste, e o suspeito é corrida entre o `listen` e a primeira requisição.

> **OBSERVAÇÃO NOVA — 02/09/2026, e ela é observação e não causa.**
>
> Aconteceu de novo, agora na suíte `laco` e em DUAS afirmações de uma vez
> (`a sala nasce PRIVADA` e `os cabeçalhos de segurança`), as duas com
> `fetch failed`. O que mudou é o contexto: foi na primeira execução **logo
> depois de o portão Q2 terminar** — quatro caixas de areia acabando de
> liberar servidores em portas efêmeras.
>
> Duas reexecuções imediatas: VERDE 1554/1554 nas duas.
>
> Isso é uma CORRELAÇÃO, e ela vale registrar porque as tentativas anteriores
> não tinham nenhuma. Não vale chamar de causa — `causa plausível não é causa
> verificada` (D-057), e "portas efêmeras esgotadas" é exatamente o tipo de
> explicação que soa boa demais para ser aceita sem medida.
>
> **O que ela sugere testar quando o T7 chegar:** contar sockets em TIME_WAIT
> antes de cada execução, e reproduzir liberando quatro servidores de propósito
> um instante antes. Se o padrão for esse, a correção não é no teste — é o
> arnês esperar as portas de verdade em vez de assumir que fechar o servidor
> as devolve na hora.

**Achado em:** 01/09/2026, na segunda de duas execuções completas seguidas.
**Bloco dono:** T7 (proposto). **Estado:** registrado, **não reproduzido**.

### O que foi observado, e só isso

```
execução completa 1   VERDE — 1473/1473
execução completa 2   VERMELHO — 1/1473
                      [sala-cliente] a reconexão manda o último id visto
                          fetch failed
```

Antes disso, a sabotagem completa **abortou** em 438/624 pela guarda do D-015:
*"a suíte já está vermelha na configuração **com-golden/navegador-completo**, SEM
nenhum defeito plantado"*. O aborto não nomeia o teste; esta é a única falha
observada naquela configuração no mesmo período, e é a candidata.

### O que NÃO foi observado, e por que isso importa

Tentei reproduzir e não consegui:

```
--so=sala-cliente, seis vezes seguidas              6× VERDE
--so=sala-cliente,servidor,laco,concorrencia
  três em paralelo, para disputar porta e CPU       3× VERDE (49/49)
```

**Uma ocorrência em ~10 execuções completas.** Não sei a causa. `fetch failed` no
Node é erro de transporte — porta que não subiu, servidor que ainda não escutava,
ou soquete derrubado — e nenhuma dessas três está distinguida pela mensagem.

Registro sem causa de propósito. A alternativa seria escrever a causa que me
parece mais provável e seguir em frente, e é exatamente isso que o **D-057**
proíbe: *causa plausível não é causa verificada*.

### Por que ele não pode ficar assim

Instável é pior que vermelho constante, e o `CLAUDE.md` diz por quê: *"vermelho
constante é defeito com endereço, instável escolhe quando aparecer"*. Aqui ele
escolheu aparecer dentro do portão Q2, e o efeito não é um teste vermelho — é a
**sabotagem inteira abortar**, depois de 438 mutantes avaliados. Cada aborto
custa a execução toda.

### O que o resolve

Não é "aumentar o tempo limite". É fazer o teste **provar que o servidor está
escutando** antes de falar com ele, em vez de assumir — e, se não estiver,
falhar dizendo *isso*, e não `fetch failed`. É a mesma correção que a medição da
cena da rota acabou de receber no 1.5n(b): a espera passa a ser pelo ESTADO, e
não pelo relógio.

O T7 também deve fazer o aborto do Q2 **nomear o teste** que estava vermelho. Um
aborto que diz "alguma coisa está vermelha" gasta uma execução inteira para
descobrir o quê.


---

## D-067 — a tela recusa a expedição pelo teto e esconde o número que explica

**Achado por:** o dono do projeto, 01/09/2026, lendo a própria tela.
**Bloco dono:** 1.6b. **Estado:** CORRIGIDO no mesmo bloco.

> "diz que estou no teto de 30 encontros porém ali embaixo marca 15/30, não
>  entendi [...] Mas a marcação está certa mesmo, veja bem"

### As duas frases estavam certas, e juntas mentiam

```text
"15/30 encontros hoje"          o que já foi COLHIDO
"Teto de 30 encontros hoje"     a razão de o botão estar barrado
```

Faltava o número do meio. Uma expedição que sai a campo **reserva o máximo do
perfil dela** — é o mecanismo, escrito em `comprometido()`, que impede alguém de
mandar três Vigílias juntas e furar o teto por 12 encontros. A sobra volta na
colheita, porque a reserva é derivada de quem está em campo e não guardada.

No estado do dono: 15 colhidos + 8 reservados pela Trilha em campo = 23
comprometidos. A próxima Trilha reserva mais 8, daria 31, e é recusada.

### Por que isto é defeito, e não "o jogador não entendeu"

> **Um limite que o jogador não consegue prever é indistinguível de um limite
> quebrado.**

Ele vê folga (15 de 30) e leva um não. Não há como aprender a regra observando a
tela, porque a metade que decide nunca foi desenhada. E o custo não é confusão:
é desconfiança nos outros números — que numa tela cujo trabalho inteiro é dizer
o que está acontecendo, é o pior estrago possível.

### A correção

O contador mostra as três parcelas — `15/30 · +8 reservados · 7 livres` — e a
recusa passa a dizer a conta em vez do limite:

```text
antes  "Teto de 30 encontros hoje"
agora  "Só restam 7 encontros — a Trilha reserva até 8. Colha o que está em
        campo para liberar o resto."
```

A segunda metade da frase é a que importa: ela diz **o que fazer**, e não só o
que aconteceu.

### A lição, que é maior que este defeito

Este é o terceiro caso do dia da mesma família: um estado interno correto que
nunca chegou à tela. O anterior foi a `forma` da criatura, calculada e não
mostrada; antes dele, o `potencial` não hidratado.

> **Regra que o motor aplica e a tela não mostra vira, para o jogador, regra que
> o jogo não tem.**

---

## D-068 — `loading="lazy"` nas notas da aposta: a ficha pode aparecer vazia

**Achado em:** 01/09/2026, caçando o D-069. **Bloco dono:** 1.6b.
**Estado:** CORRIGIDO.

As cinco fichas de aposta trazem a arte da nota (50/100/300/500/1k PC), e eu as
marquei `loading="lazy"` por reflexo — imagem em lista, adia. Estava errado por
dois motivos, e o segundo eu não previ.

### O motivo previsível

São cinco JPEG pequenos que aparecem **sempre** que a tela de aposta abre. Não há
lista longa, não há rolagem: o adiamento não economiza uma requisição sequer que
o jogador não fosse fazer no segundo seguinte. E cobra: quem troca de aba
encontra a ficha vazia por um quadro, numa tela onde o jogador está prestes a
apostar dinheiro.

### O motivo que eu não previ, e é o caro

**Imagem preguiçosa numa vista escondida nunca entra na fila do navegador.** Ela
fica `complete === false` para sempre — não carregada, não falhada, pendente.
Medido: as cinco, em `#viewHome`, com `naturalWidth === 0`, depois de 3 s de
página aberta.

Isso derrubou o portão visual por mais de 300 s — ver **D-069**, que é o defeito
de verdade. Este aqui é só o gatilho.

### A correção

`loading="lazy"` sai das notas. Fica onde ele serve: as galerias de customização,
o painel de administração e a lista da liga, que têm dezenas de sprites e
rolagem de verdade.

> **Adiar carga é otimização, e otimização sem medida é chute com custo.**

---

## D-069 — o portão visual espera para sempre por uma imagem pendente

**Achado em:** 01/09/2026, depois de a suíte com navegador não terminar em nove
minutos e não imprimir uma linha. **Bloco dono:** 1.6b. **Estado:** CORRIGIDO.

### O sintoma, e por que ele custou tanto para virar diagnóstico

```text
npm run rapido           VERDE 1470/1470 em 88 s
node test/run.mjs        nada. exit 124 aos 540 s, log vazio
```

Log vazio é o pior sintoma possível, e ele mentiu duas vezes:

1. **A saída do Node vai bufferizada para arquivo.** Log vazio parecia "travou
   antes de imprimir"; era "não terminou, então não descarregou". Duas execuções
   anteriores foram descartadas como travadas sem terem sido.
2. **O Chromium ficava VIVO e ocioso.** Sem processo consumindo CPU, o palpite
   natural é rede ou espera de servidor — e não era nenhum dos dois.

O que achou foi uma sonda que escreve marcas em disco com `appendFileSync`, que
não bufferiza. `visual.rodar()` em 29 s; `capturarBase` sem responder.

### A causa

```js
await pg.evaluate(() => Promise.all(
  [...document.images].filter(i => i.src && !i.complete)
    .map(i => i.decode().catch(() => {}))));
```

`decode()` de uma imagem **pendente** não resolve nem rejeita. O `catch` cobre
rejeição, e rejeição é exatamente o caso que não acontece. `Promise.all` nunca
assenta, `pg.evaluate` não tem teto próprio, e a suíte para — quatro larguras
vezes quatro telas, cada uma esperando o infinito.

### A correção, e por que ela é do ARNÊS e não só do app

O gatilho foi o D-068, e ele está corrigido. Mas corrigir só o app deixaria a
armadilha armada: **qualquer imagem pendente, em qualquer bloco futuro, travaria
o portão de novo** — e travaria do mesmo jeito silencioso.

A espera ganhou prazo de 5 s, e o argumento é uma frase que este arquivo já
tinha, escrita para o D-023:

> **Portão que não termina não julga nada.**

Perder a espera custa, no pior caso, uma foto fora da linha de base — que é um
vermelho com endereço, investigável em minutos. Travar custa a execução inteira
e não deixa nem por onde começar.

```text
antes   capturarBase  > 300 s, não terminava
depois  capturarBase    49,1 s, 16 telas
```

### A lição, e ela é a terceira do dia da mesma família

Toda espera de portão tem de ter prazo. `waitForFunction` já tinha; `evaluate`
não tinha, porque ninguém tinha imaginado um `await` que não termina dentro
dele. Espera sem prazo é a mesma classe de erro que medição sem teto: funciona
até o dia em que o valor esperado não chega, e nesse dia ela não falha — ela
some.

---

## D-070 — a afirmação da janela de 24 h era satisfeita pela STAMINA

**Achado por:** o portão Q2, no fecho do 1.6b — `S568 [PASSOU]`.
**Bloco dono:** 1.6b. **Estado:** CORRIGIDO.

O `S568` apaga o `AND colhida_em > ?` da soma de encontros, transformando o teto
diário em **teto para sempre**: quem farmou um dia nunca mais farma. Ele passou
pela suíte inteira.

### Por que passou

A afirmação era esta:

```js
ok(iniciarPadrao(db, u, [equipe[0]], { agora: t + 25 * H }),
  'depois de 24 h o teto não abriu');
```

Manda uma expedição 25 h depois e exige que seja aceita. Parece medir a janela.
Não mede — porque **o laço acima para por stamina, e não por teto**:

```text
Batida custa 20 de stamina · a criatura tem 100  ->  cinco envios
cinco Batidas rendem ~20 encontros · o teto é 30  ->  o teto NUNCA enche
```

Com o teto nunca cheio, remover a janela não muda nada. Vinte e cinco horas
depois o envio passa porque a **stamina voltou** — e teria passado igual com a
janela apagada, com ela intacta, ou sem janela nenhuma.

### A frase que já estava escrita, e que voltou inteira

> **Medir onde o defeito não pode aparecer não é medir.** (D-058)

É a sexta vez que esta família aparece neste projeto. O padrão é sempre o mesmo:
a afirmação observa um EFEITO que tem mais de uma causa, e a causa que ela queria
observar é a que menos acontece.

### A correção

Perguntar à janela, e não ao envio:

```js
igual(encontrosHoje(db, u.id, t + 25 * H), 0, ...)
igual(concluidasHoje(db, u.id, t + 25 * H), 0, ...)
```

Nenhuma regeneração de stamina, nenhuma vaga simultânea e nenhum custo de perfil
pode fazer uma soma de 24 h devolver zero. **Só a própria janela pode.**

Acompanha uma guarda contra o teste passar por vazio — `encontrosHoje(t) > 0`
antes —, que é o modo de falha que a afirmação nova cria ao ser tão direta.

O `ok(iniciarPadrao(...))` fica, agora como **consequência e não como prova**.

---

## D-071 — o título e a legenda da seção colidem a 420 px

**Achado em:** 02/09/2026, na primeira foto que a esteira de OLHAR conseguiu
tirar da aba da rota (L-100). **Bloco dono:** 1.13 (proposto: a passada de
leitura no estreito). **Estado:** CORRIGIDO no bloco 1.15.

A regra `.card h3` era `space-between` sem `gap`. Em tela larga o `space-between`
afasta os dois e a ausencia de folga e inofensiva; a 420 px cada metade quebra em
duas linhas, elas encostam no meio, e a ultima palavra de uma cola na primeira da
outra — saia **EXPEDICAOREND E** na tela.

Duas correcoes: `gap` resolve o encosto, e abaixo de 560 px os dois EMPILHAM. Com
quatro colunas de texto em 420 px cada metade fica com vinte caracteres, e vinte
caracteres nao sao uma frase. Olhado a 420 px depois de corrigido.

```text
A
EXPEDIÇÃO      DURAÇÃO, EQUIPE, E O QUE CADA UMA
               RENDE
```

Na tela, sem o espaço que este arquivo tem, sai **`EXPEDIÇÃORENDE`** — duas
palavras de frases diferentes lidas como uma só.

### A causa

```css
.card h3{ display:flex; justify-content:space-between; align-items:center }
```

Título à esquerda, legenda à direita, `gap` nenhum. Em telas largas o
`space-between` mantém os dois afastados e a ausência de `gap` é inofensiva. A
420 px os dois quebram em duas linhas cada um, encostam no meio, e a última
palavra de um cola na primeira do outro.

### Por que NÃO foi corrigido no 1.6b

`.card h3` é a regra de TODA seção do produto — Arena, regras, carteira,
perfil, liga. Mexer nela dentro de um bloco chamado "o painel do idle" é
exatamente o que a regra central deste projeto proíbe, e é como uma correção de
sprites virou troca de fonte de arte na v0.6.1.

O defeito também não é deste bloco: ele existe desde que a seção existe, e só
apareceu agora porque **antes não havia como fotografar esta tela** (L-100). É
um caso limpo de "a esteira nova achou o que a esteira velha não olhava".

### A correção, para quem pegar o bloco

`flex-wrap:wrap` mais um `gap`, e abaixo de ~560 px empilhar: título numa linha,
legenda na outra, ambas à esquerda. Duas linhas curtas se leem; duas linhas
coladas, não.

**Vai mexer na linha de base visual em 480 px** — e isso é esperado, porque o
arranjo muda de propósito. Regravar com a diferença explicada, como manda o
`CLAUDE.md`.

---

## D-072 — o número de vagas simultâneas era lido do `localStorage`

**Achado em:** 02/09/2026, ao começar o 1.9. **Bloco dono:** 1.9.
**Estado:** CORRIGIDO.

```js
e.simultaneas = Math.min(SIMULTANEAS_MAX,
  Math.max(SIMULTANEAS_INICIAIS, Number(cru.simultaneas) || SIMULTANEAS_INICIAIS));
```

O estado salvo trazia quantas expedições o jogador pode ter em campo, e o
carregamento aceitava o número — apertado no máximo, o que dá a essa linha uma
aparência de cuidado que ela não merece.

### Por que o clamp não salva

`localStorage` está a um F12 de distância. Escrever `simultaneas: 3` dava três
vagas a quem nunca tinha visto uma espécie. O clamp limitava o exagero e não
impedia a vantagem: **um campo de poder, lido de onde o jogador escreve.**

E o custo não é cosmético. Vaga simultânea é tempo — quatro expedições rendem o
dia inteiro mais cedo. Num jogo em que o que se farma é vendável, isso é o §P5
pela porta dos fundos, e sem nem precisar de loja.

### A correção não é uma guarda melhor: é a ausência do campo

As vagas passaram a ser DERIVADAS do dossiê — quantas espécies o jogador viu.
`simultaneas` deixou de ser lido, deixou de ser gravado, e deixou de existir no
formato. Um estado antigo que ainda o traga é ignorado e o diagnóstico avisa.

> **Enquanto não houver onde escrever, não há o que forjar.**

É a mesma forma de três outras decisões deste projeto, e vale reunir:

```text
o TETO diário     é constante, e `iniciar()` não aceita nada que o mude
o POTENCIAL       é calculado do IV, nunca guardado ao lado dele (1.1)
a SEMENTE         nasce na colheita, não na partida (§25.2)
as VAGAS          vêm do dossiê, e o dossiê vem do encontro
```

Nos quatro casos a alternativa era validar melhor. Nos quatro, tirar o campo
saiu mais barato **e** mais seguro — porque guarda é código que alguém pode
esquecer de chamar, e campo inexistente não tem como ser lido.

### Por que o dossiê, e não o nível

`nivel` não anda (L-099). O dossiê anda sozinho, cresce com o jogo, e mede
VARIEDADE — que é o que a vaga premia: rodar biomas diferentes. O laço fecha do
lado bom: mais biomas ao mesmo tempo dão mais variedade, que dá mais vagas.

## D-073 — o viés do Vigia é comido pelo teto, e o foco fica só com o custo

**Achado em:** 02/09/2026, dentro do bloco 1.16, por uma sabotagem dirigida que
PASSOU quando não devia. **Bloco dono:** 1.16. **Estado:** CORRIGIDO no mesmo
bloco.

O foco `vigia` trocava −20% de encontros por +0,30 de viés de raridade. Medido,
o viés some:

```text
perfil    base   com o foco     estágio
vigilia   1,00   -> 1,30        1
vigilia   1,10   -> 1,30        2   COMIDO
vigilia   1,20   -> 1,30        3   COMIDO
vigilia   1,30   -> 1,30        4   COMIDO por inteiro
```

`VIES_TETO` é 1,3 e existe por um motivo que continua valendo: acima de ~1,4 a
raridade INVERTE — `muitoRaro` passa a sair mais que `comum`. Subir o teto para
acomodar o foco quebraria a coisa que o teto protege.

O resultado é o pior tipo de defeito de desenho: **um foco que só cobra.** E ele
cobra justamente no lugar onde deveria brilhar — o estágio 4 da Vigília, que é
o canto mais raro do jogo.

E há uma segunda lição, sobre o método:

> A sabotagem dirigida encontrou isto porque o teste que eu escrevi para o viés
> **não conseguia ficar vermelho** — o efeito que ele media não existia. Um
> teste que não consegue falhar está denunciando o código, e não a si mesmo.

#### A correção: o Vigia deixa de empurrar o viés e passa a GARANTIR

O teto não tem folga; então o benefício sai de onde há folga. Um encontro da
expedição passa a vir, garantidamente, da faixa mais rara que aquele estágio
oferece.

```text
antes   −20% de encontros, +0,30 de viés   (que o teto engolia)
agora   −20% de encontros, +1 encontro garantido da faixa mais rara do estágio
```

Funciona em todo estágio, não encosta no teto, e é explicável numa frase: *o
Vigia sempre acha pelo menos um raro.* É melhor que o desenho original também
por outro motivo — viés é uma probabilidade que o jogador não vê; a garantia ele
vê acontecer.

---

## D-074 — um símbolo que eu inventei derrubou a aba de Rotas com a suíte VERDE

**Achado em:** 02/09/2026, **pelo dono**, jogando.
**Bloco dono:** 1.22 — **CORRIGIDO no mesmo bloco.** Origem: 1.21.
**Gravidade:** alta. O jogo ficou injogável para quem tinha uma criatura de
evolução por item — e é quase todo mundo depois da primeira semana.

### O relato

> "o meu pokémon no local que uso navegador opera bugou olha como está, sendo
>  que estava pra coletar recompensa atualizei e ficou assim"

Na captura dele: o banner contando **Campo · 00:00 restantes**, e três painéis
**em branco** logo abaixo — EQUIPE sem nenhum cartão, EM CAMPO sem nem a frase
"Nenhuma expedição em campo", BOLSA vazia. A recompensa estava pronta e não
havia botão para colher.

### A causa, em uma linha

`app/modules/idle-tela.mjs`, escrito por mim no bloco 1.21:

```js
${seloDaEvolucao(c, E.bolsa, idItem => nomeDoItemPack(idItem))}
```

**`nomeDoItemPack` não existe em lugar nenhum do repositório.** Eu inventei o
nome enquanto escrevia a linha, e nunca o escrevi de verdade.

A função morre, `renderIdle` morre junto, e tudo que vem depois de `pintarEquipe`
nunca é desenhado. O banner e o HUD já tinham sido pintados antes — foi por isso
que a tela ficou meio viva, que é o que confunde de verdade.

### Por que só apareceu para o dono

```text
o caminho só executa quando `oQueFalta` precisa NOMEAR um item
isso só acontece quando a evolução mais perto exige um ITEM que falta
o save de teste tinha um inicial de nível 7 — que espera NÍVEL, não pedra
o save dele tinha um Vulpix — que espera a Pedra do Fogo
```

> **Um caminho que o dado de teste nunca toma é um caminho que o portão não
> abriu.** O Q5 abriu o jogo num navegador de verdade e reprovaria no
> `pageerror`; ele nunca chegou na linha.

### E a razão de fundo é pior, porque é sobre o método

`test/ligacao.mjs` existe exatamente para esta classe de erro. O cabeçalho dele
prometia, com estas palavras:

```text
PEGA        nome importado que o arquivo de origem não exporta
PEGA        símbolo usado como função e que não tem origem no arquivo
```

**A segunda linha nunca foi construída.** O corpo confere `import` contra
`export` e mais nada — e este defeito não tinha import nenhum para conferir.

> **Cabeçalho não é portão.** Eu li aquela promessa, acreditei nela, e deixei de
> escrever o teste que o bloco 1.21 pedia porque "já estava coberto".

Suíte VERDE em 1724 testes. Q2 VERDE em 748 defeitos. Console limpo para quem
não abrisse o inspetor. E o jogo do dono parado.

### A correção

Duas metades, e a segunda vale mais que a primeira.

**1. O nome do item ganhou endereço.** `app/modules/itens-nome.mjs`, camada 0. A
resolução existia desde o 1.12 **presa dentro de `pintarBolsa`** — e enquanto só
a mochila precisava, isso estava certo. Quando a Pokédex (1.20) e o cartão da
criatura (1.21) passaram a precisar do mesmo, cada um inventou uma saída:

```text
Pokédex     chamou `falaDaExigencia(exige)` SEM resolvedor  -> escrevia `firestone`
idle-tela   chamou `nomeDoItemPack(id)`, que não existe     -> derrubou a aba
```

> **Quando a função certa não tem endereço público, o segundo chamador inventa
> um.** Um inventou o silêncio; o outro inventou o nome.

**2. A peneira que faltava.** `test/origem.mjs`: para cada `NOME(` do
repositório, procura uma origem no mesmo arquivo — import, declaração,
parâmetro, método, global conhecido. Sem origem, é chamada para o vazio.

Ela lê texto, não executa nada, e roda em milissegundos — que é o ponto: *portão
que só existe caro é portão que se roda pouco*, e o Q5 leva 200 s.

### O que a construção dela ensinou

Quatro alarmes falsos apareceram antes de ela ficar limpa, e cada um é uma
gramática que eu não tinha:

```text
`async (`                    palavra da linguagem colada num parêntese
`a(inventado(1))`            grupo que CONSOME o caractere anterior perde a
                             chamada aninhada — precisa de lookbehind
`aposta(s) liquidada(s)`     português dentro de template lido como chamada
`laçoDoAtor`                 identificador ASCII lia `oDoAtor`, o pedaço depois
                             da cedilha, e acusava função declarada acima
```

E o mais instrutivo veio depois, do próprio Q2: **três sabotagens da peneira
passaram.** A auto-verificação chamava `chamados`/`origens` por baixo, e não o
caminho que a suíte usa — desligar a comparação deixava o repositório mudo e o
caso montado verde.

> **Auto-verificação que não percorre o mesmo caminho da afirmação não verifica
> a afirmação: verifica outra coisa parecida.**

É a mesma família do `|| conta(semFoco) === 0` do 1.18 — a régua com folga posta
por quem escreve o teste. `orfaosDe()` passou a ser o caminho único, e o caso
montado agora inclui uma chamada dentro de `${…}`, que é onde o D-074 morava.

### Medido

```text
suíte                      VERDE 1734/1734  (eram 1724)
alarmes falsos no repo     0 em ~120 arquivos, 2.000+ chamadas varridas
custo da peneira           milissegundos — roda no laço de construção
estender para REFERÊNCIA   302 alarmes, 0 defeitos  -> descartado, e escrito
                           no cabeçalho com a medição do lado
```

---

## D-075 — a Pokédex desenhava `007 ? ???` com a Pokébola de "capturada" ao lado

**Achado em:** 03/09/2026, no save do dono, indo atrás de outra queixa dele.
**Bloco dono:** 1.22 — **CORRIGIDO no mesmo bloco.**

### O fato

```text
criaturas   dex 7 (inicial) e dex 37 (captura)
registro    dex 11 e dex 48
```

`vistos` saía só do `registro`, que é alimentado pelo fragmento — e **o fragmento
cai no ENCONTRO**. Só que encontro não é o único caminho até a caixa: a inicial é
**dada**, e nunca passou por encontro nenhum.

Resultado na tela: a linha da criatura que o dono tem na mão saía mascarada como
não encontrada, `???`, **com o selo de capturada ao lado**. As duas metades da
mesma linha se contradizendo.

### O que torna isto uma lição, e não um descuido

A invariante já estava **escrita**, em `pokedex-dados.mjs`, dentro de
`progresso`:

```js
/* Capturados NUNCA passa de vistos: quem tem a criatura viu a espécie. */
pegos: Math.min(p, n, total),
```

Ela era aplicada num `Math.min` sobre o CONTADOR. O número parava de acusar; o
fato continuava lá, e aparecia na linha.

> **Invariante aplicada só onde ela é contada continua sendo violada onde ela é
> desenhada.**

### A correção

`vistosDe` passou para `pokedex-dados.mjs` (camada 0, ao lado de `capturados`) e
devolve a UNIÃO. Mudou de camada de propósito: enquanto era uma linha privada da
tela, nenhum teste de Node conseguia falar sobre ela — a mesma razão pela qual
`itens-nome.mjs` precisou sair de dentro de `pintarBolsa` no mesmo bloco.

A união mora **na tela, e não em `especiesVistas`**. Aquela é outra pergunta: ela
move o teto diário de encontros e a escada de vagas, que são economia. Somar a
inicial ali daria uma vaga de graça a todo mundo no primeiro minuto — decisão do
dono, e não efeito colateral de uma correção de tela. Fica na **L-128**.

---

## D-076 — "menos movimento" apagava a cena da captura inteira

**Achado em:** 03/09/2026, **pelo dono**, jogando. **Bloco dono:** 1.26 —
**CORRIGIDO no mesmo bloco.** Origem: 1.23.

### As três queixas eram uma só

> "ao capturar ou fugir não acontece mais a animação"
> "não existe mais animação de abertura da ball"
> "quando ganhar não tem muita diferença, ambas parecem a mesma coisa"

A terceira é consequência das duas primeiras: **sem a cena, o que resta é o
laudo — e dois laudos diferem só na cor e na frase.**

### A causa

`captura-cena.mjs` tinha a animação inteira atrás de:

```js
if (!menosMovimento()) { …a cena toda… }
```

O sistema do dono reporta `prefers-reduced-motion: reduce`, e a cena era pulada.

**E havia um defeito dentro do defeito:** o caminho reduzido não punha nem o
QUADRO FINAL. A bola ficava na casa 0 — fechada — mesmo numa FUGA, que termina
com ela aberta. A captura que ele mandou mostra exatamente isso: bola fechada,
criatura em cima, laudo de "escapou".

### A distinção que eu não fiz

```text
MOVIMENTO   sacudir, voar, pulsar, tremer — isso incomoda quem pediu menos
            movimento, e some
QUADRO      a bola abrir e fechar é INFORMAÇÃO desenhada. Ela fica.
```

> `prefers-reduced-motion` pede menos **movimento**. Apagar o acontecimento
> inteiro é responder outra pergunta — e deixa o jogador sem saber o que houve.

Foi o mesmo erro do selo da Pokébola na Pokédex (L-129), e ali eu já tinha
escrito a regra certa — *"informação não pode depender de animação"* — e mesmo
assim apliquei o contrário na cena.

### A correção, em três partes

**1. A cena SEMPRE toca.** O modo curto ENCURTA o relógio (fator 0,34) e o CSS
desliga as transformações. A troca de quadro fica.

**2. O jogador manda.** `pa.anim` vence o sistema nos dois sentidos — pedido
literal do dono: *"quero opção com animação"*. Quem tem "reduzir animações"
ligado no Windows sem querer não fica sem a cena.

**3. Os dois finais passam a diferir por NATUREZA, e não por matiz.**

```text
PEGOU   a bola TRAVA e sobe · brilho quente · estrelas · ela FICA, inteira
FUGIU   a bola ARREBENTA e cai · a tela treme · cinza · ela é DESCARTADA,
        e o bicho volta
```

> Ganhar termina com algo na mão. Perder termina com algo no chão. É essa a
> diferença que o corpo lê antes da palavra.

### E um terceiro, achado ao OLHAR a correção

Na captura, a criatura continuava desenhada **sobre** a bola travada. As regras
de esconder eram por GRUPO (`abrir`, `fechar`, `balanco`), e no veredito o grupo
muda — então nenhuma se aplicava.

> Um final que desenha as duas coisas ao mesmo tempo não é um final: é os dois
> estados sobrepostos.

---

## D-077 — a suíte `rotas` falhou UMA vez com `fetch failed`, e não reproduziu

**Achado em:** 08/09/2026, no fecho dos blocos A5 + A3.
**Estado:** aberto, **sem reprodução**. **Bloco dono:** T7 (estabilidade do arnês).

```text
[rotas] conta nova nasce com o saldo inicial do motor, em transferível
    fetch failed
```

A execução seguinte, sem tocar em nada, voltou **VERDE 1746/1746**.

#### Por que isto entra aqui em vez de ser esquecido

O `CLAUDE.md` é explícito, e a frase é dele:

> Fechar bloco com a suíte **instável** é pior que com ela vermelha: vermelho
> constante é defeito com endereço, instável escolhe quando aparecer.

Não reproduzir não é o mesmo que não existir. Registrar é o que impede a
segunda ocorrência de ser tratada como a primeira.

#### A suspeita, e ela é minha

Eu tinha um servidor de mão de pé na porta 8099 — a regra do *"o dono nunca
fica sem o jogo na mão"* — enquanto a suíte subia o dela. A `rotas` fala com um
servidor por `fetch`, e uma corrida de porta explicaria uma falha única que não
volta.

**Isso é suspeita, e não medição.** Se fosse medição estaria em LACUNAS com um
conserto; aqui só existe a coincidência de as duas coisas estarem de pé.

#### O que o bloco dono precisa fazer

```text
MEDIR      rodar a suíte N vezes com e sem servidor de mão na 8099
DECIDIR    se for corrida de porta: a suíte escolhe porta livre, e não fixa
NÃO FAZER  aumentar timeout. Espera maior esconde corrida; não a conserta.
```

---

## D-078 — a linha de base visual da ARENA é INSTÁVEL no estreito, e ela aborta o Q2

**Achado em:** 08/09/2026, ao fechar o A4b. **Estado:** aberto, **medido**.
**Bloco dono:** T7 (estabilidade do arnês), junto do D-060 e do D-077.

```text
arena@estreito: 1 de 64 regiões fora — região 1,1
```

#### A medição, e ela é o que torna isto um defeito e não um palpite

Quatro execuções seguidas, **sem tocar em nada** entre elas:

```text
média 2.3 · pico  8     vermelho
média 3.4 · pico 12     vermelho
                        VERDE
                        VERDE
```

E o mais importante: **ela aparece no commit anterior**. Guardei o A4b inteiro
com `git stash`, rodei na árvore do A4a — que fechou com `npm test` VERDE,
1907/1907 — e o vermelho continuou. Não é regressão deste bloco; é uma
instabilidade que já estava lá e que escolheu aparecer agora.

#### Por que ele é pior que um vermelho constante

Palavra do `CLAUDE.md`, e ela é a razão de este defeito ter ficha:

> Fechar bloco com a suíte vermelha — ou com ela **instável**, que é pior:
> vermelho constante é defeito com endereço, instável escolhe quando aparecer.

E aqui ele custa mais que um teste: **o Q2 ABORTA**. O portão valida cada
configuração antes de julgar (`garantirBase`, D-015), e uma linha de base
vermelha faz toda avaliação naquela configuração voltar `PEGOU` sem ter pego.
Abortar é o comportamento certo — mas o efeito prático é que o portão inteiro
fica refém de uma região de 88×113 pixels.

#### O que já está descartado

A suíte visual **já** trata as três causas conhecidas de foto instável, e as
três estão documentadas no `test/visual.mjs`:

```text
animação de CSS    `reducedMotion:'reduce'`
GIF                `congelarGifs`, com a cascata local do F0.12
arte de fundo      `esperarArte`, com `decode()` do pseudo-elemento
```

Então a causa é uma quarta coisa, e a região aponta para onde procurar: no
`estreito` (700×900), a região 1,1 de uma grade 8×8 cobre **x 87–175, y
112–225** — o alto da arena.

#### O que NÃO se deve fazer, e por que isto está escrito aqui

**Não regravar a linha de base.** Ela está certa: a foto de referência é a que
o portão gravou, e o que varia é a execução. Regravar trocaria um defeito
medido por um número novo que voltaria a divergir na semana seguinte — e o
`CLAUDE.md` chama isso pelo nome:

> Fixture regravada sem explicação é a forma mais fácil de esconder uma
> regressão.

#### O que o destrava

Achar a quarta fonte de variação naquela região. O caminho mais barato é
capturar a mesma tela dez vezes e diferenciar as fotos entre si — em vez de
contra a linha de base —, que diz **o que** muda em vez de **quanto**.

---

## D-079 — a tela do Avanço pedia sete cores que a paleta não tem

**Achado em:** 08/09/2026, medindo no navegador o que o dono cobrava pela
terceira vez. **Bloco dono:** A4g (corrigido no mesmo commit).
**Estado:** CORRIGIDO.

### O sintoma, na palavra dele

> "o HP continua uma barra preta"
> "a barra toda preta e os números tudo branco pequeno complica"

Duas sessões seguidas na mesma queixa, e nas duas eu mexi no tamanho da barra —
que não era o problema.

### A medição

```js
getComputedStyle(document.documentElement)
  --gold    "#00e5ff"   existe
  --green   "#3df2a6"   existe
  --ok      ""          NÃO EXISTE
  --perigo  ""          NÃO EXISTE
  --aviso   ""          NÃO EXISTE
  --ink --ink2 --ink3 --neon    NÃO EXISTEM
```

A paleta do projeto tem `--gold`, `--green`, `--red`, `--neon2`, `--txt`,
`--dim`. A tela do Avanço, escrita desde o A4b, pedia **outro conjunto de
nomes** — e em ~24 regras.

A barra de vida do mob era pintada por JavaScript com
`barra.style.background = 'var(--ok)'`. Valor inválido ⟹ declaração
descartada ⟹ o preenchimento fica **sem fundo** ⟹ o trilho escuro aparece
inteiro. **A barra preta era a barra sem cor nenhuma.**

### Por que nada pegou

```text
suítes de Node    leem o CSS como TEXTO — `var(--ok)` é sintaxe válida
o portão Q5       reprova em `pageerror`; variável inexistente não lança
a linha de base   nasceu JÁ ERRADA, no bloco que introduziu as regras
o console         fica limpo: o navegador descarta a declaração em silêncio
```

> `color: var(--naoExiste)` não avisa, não quebra o resto da regra, e não
> aparece em lugar nenhum. Ele herda.

É a mesma família do **D-074** e da **L-103** — sintaxe válida dos dois lados,
e o defeito mora no encontro — só que na linguagem do CSS, onde não existe nem
o `ReferenceError` que denuncia as outras duas.

### A correção

Um bloco de APELIDOS no `:root` (e no tema `shadow`), mapeando os nomes que a
tela usa para as cores que a paleta tem. Não é uma troca em 24 lugares: quem já
escreveu continua certo, e `var()` resolve na hora do uso, então trocar de tema
arrasta os apelidos junto.

### O que fica em aberto

**Nada garante que não haja um oitavo nome.** Um portão que varra o CSS
procurando `var(--x)` sem `--x:` declarado é o que fecha esta porta de vez, e
ele está registrado como **L-156**, bloco dono **T8**.

---

## D-080 — um teste de limites afirmava o que PEDIU, e não o que conseguiu

**Achado em:** 08/09/2026, numa execução da suíte que voltou vermelha e não
repetiu. **Bloco dono:** A4g (corrigido no mesmo commit). **Estado:** CORRIGIDO.

```text
[limites] a DERROTA no settlement conta a perda inteira
    contou 212 de perda — esperado 300, veio 212
```

Passou nas cinco execuções seguintes, o que é o pior resultado possível: **um
vermelho que não repete não tem endereço, e o instinto é encolher os ombros.**

### A causa estava escrita no próprio arquivo, vinte linhas acima

O comentário do **D-021**, no mesmo teste:

> "Medido em 3.600 slots: o menor `stakeMax` foi 212 e cinco ficaram abaixo de
> 300 — cortar em `stakeMax` quase nunca desce abaixo do limite de 200, mas
> *quase nunca* não é nunca."

O teste pede uma perda de 300; `stakeQueCabe` corta no `stakeMax` da rodada, que
é sorteado. E a asserção final comparava com o **300 pedido** em vez de com a
**`perda` conseguida**.

```text
quando a rodada aceitava 300    verde
quando ela cortava para 212     vermelho, dizendo "esperado 300, veio 212"
```

O número da mensagem de erro estava certo dos dois lados. O errado era a
expectativa.

### A correção é MAIS estrita, e não menos

`igual(v.usado, perda, …)`. Agora ele cobra a contagem inteira para **qualquer**
valor que a rodada aceite, e não só para o caso feliz em que ela aceita tudo.

> Um teste que afirma o que ele PEDIU em vez do que ele CONSEGUIU não é
> rigoroso: é instável. E instável é pior que vermelho — o vermelho tem
> endereço, o instável escolhe quando aparecer.


---

## D-081 — as placas da cena empilham, e a leitura vira mingau

**Achado em:** 09/09/2026, no passo OLHAR do 1.27, na PRIMEIRA foto que este
projeto já tirou da tela da run. **Bloco dono:** 1.27, item 4 da ordem do dono.
**Estado:** CORRIGIDO no mesmo bloco — `separarPlacas`, medido de 1 par
sobreposto para 0 nas duas larguras.

A ferramenta `olhar-idle.mjs` ganhou a foto da run neste bloco (ver L-166). Ela
mostrou, em 28 s de wave 1, três defeitos que sete blocos de Avanço não viram —
porque **nenhuma foto da tela da run existia**.

```text
1  TRÊS PLACAS NO MESMO PONTO   "Charmander 97/100" e "Metapod 0/100" desenhadas
                                uma sobre a outra, a poucos pixels. O nome de
                                uma cobre o número da outra e nenhuma das duas
                                se lê
2  MOB EM 0/100 AINDA EM CENA   dois "Metapod 0 / 100" ao mesmo tempo. Existe
                                teste ("quem o motor abateu SAI da cena") e ele
                                está verde — então ou a saída demora demais, ou
                                a placa sobrevive ao mob
3  BALÃO ÓRFÃO                  "X-Scissor" flutuando à direita do treinador,
                                sem sprite embaixo. O balão diz DE QUEM ele é
                                pelo ícone, e aqui não há de quem
```

**Por que isto é a queixa do dono, e não um detalhe.** Ele escreveu *"uma
confusão, não dá pra ver nada, tudo bagunçado e confuso"* e *"o combate
simplesmente está RIDÍCULO"*. Esta foto é a primeira evidência do que ele estava
vendo — até aqui eu estava corrigindo por descrição.

**O que trava o conserto:** nada. É o próximo item da ordem que ele aprovou.

**O teste que trava:** contar placas cujos retângulos se sobrepõem, e reprovar
acima de zero. A cena já converte tudo para coordenadas de tela, então a conta
existe no mesmo lugar que desenha.

---

## D-082 — o rodapé do banner passa por baixo do Pokémon de vitrine

**Achado em:** 09/09/2026, na mesma foto. **Bloco dono:** o do banner (trilha R).
**Estado:** aberto.

`.bnRodape` é uma faixa de largura inteira com texto centralizado; `.bnMon.vitrine`
é uma arte de 104 px ancorada em `right:6px; bottom:14px`. Os dois ocupam o mesmo
canto, e na tela da run — onde o rodapé diz "NENHUMA EXPEDIÇÃO EM CAMPO", que é
a frase mais longa que ele tem — a pílula atravessa a arte inteira.

```text
o que se vê   letras claras sobre o sprite, sem contraste, em cima do bicho
por que agora  a frase curta ("Floresta · 1h40 restantes") cabia; a longa não
```

**A correção provável é uma linha** — reservar à direita a largura do mon quando
ele existe —, e ela NÃO foi feita aqui de propósito: o bloco em curso mexe na
bola e no quadro do fim, e "rapidinho" fora do escopo é exatamente o que custou
três versões a este projeto na v0.6.1.


---

## D-083 — o número do dano nascia no canto, e não sobre o lutador

**Achado em:** 09/09/2026, medindo em vez de olhar. **Bloco dono:** 1.27, item 4.
**Estado:** CORRIGIDO no mesmo bloco.

O dono cobrou o hitbox **quatro vezes**, e nas três primeiras eu respondi que o
código estava lá. Estava. E ele não estava errado.

```text
o que se via   nada, no lugar onde ele olhava
o que havia    10 números em 28 s, 17 px, peso 800, todos "dentro da janela"
onde estavam   x = -19 para todo "-1", x = -32 para todo "-100" — o mesmo pixel
```

**A causa é uma regra do navegador.** `.dmg` traz `animation: floatUp`, e todo
quadro-chave do `floatUp` define `transform`. **Propriedade animada vence
`style` inline** — o `translate(x, y)` que punha o número sobre o lutador era
descartado antes de o primeiro quadro rodar. Em 420 px os dez saíam da janela.

**A correção separa posição de movimento:** uma âncora de tamanho zero leva o
`transform` da cena e não anima; o número é filho dela e leva o `floatUp`. Dois
`transform` em dois elementos não competem — compõem.

### E ela só apareceu porque a esteira aprendeu a MEDIR

Uma foto não resolvia: o número vive 1,2 s, e qualquer instantâneo cai no
intervalo entre dois. O `olhar-idle.mjs` ganhou um observador que registra cada
número que nasce, com texto, tamanho, cor e posição calculados pelo navegador.

> Zero registros é prova de ausência. Dez registros no mesmo pixel é prova de
> outra coisa — e as duas conversas são diferentes.

**A sonda também errou primeiro, e vale registrar.** Depois da correção ela
passou a reportar ZERO números — porque olhava só o nó adicionado, e o número
passara a nascer DENTRO de um nó adicionado. Por pouco eu "conserto" um produto
que não estava quebrado: a sonda estava medindo a si mesma.

---

## D-084 — o duelo virou um soco só, e o "-31" nunca teve como aparecer

**Achado em:** 09/09/2026, na mesma medição. **Bloco dono:** 1.27, item 4.
**Estado:** CORRIGIDO no mesmo bloco.

Com o número do dano finalmente no lugar certo, o que ele mostrava era:

```text
que eu dou     -100  -100  -100  -100
que eu levo      -1    -1    -1
```

Quatro selvagens, quatro golpes, cada um levando os 100 de HP inteiros.

**A causa é minha, e é do item anterior da mesma ordem.** O item 5 encurtou a
wave (2–4 min → 45–90 s) e subiu o `RITMO_PISO`. `meusGolpes` saía de quanto
tempo CABIA no duelo, e com a janela curta passou a caber **um**; aí
`repartir(100, 1)` devolve `[100]`.

**E é por isso que o pedido do dono nunca chegou.** Ele escreveu *"-13"*,
*"-35"*, *"-31"* — três números **diferentes**, porque o que ele quer ver é a
troca. Um "-100" fixo cumpre a letra do pedido e nega o espírito dele.

**A correção põe piso na CONTAGEM, e nunca no tempo** (`GOLPES_MIN = 3`): com
pouco tempo os golpes se aproximam em vez de sumirem. Um piso de tempo desfaria
o item 5 pela porta dos fundos, sem ninguém decidir isso.

```text
antes    10 números por wave    -100 -100 -100 -100
depois   29 números por wave    -27 -30 -37 -33 -28 -23 -44 -46 -28 -31 -26 …
```

---

## D-085 — apertar uma constante apagou o que um teste enxergava

**Achado em:** 09/09/2026, pelo portão Q2. **Bloco dono:** 1.27.
**Estado:** CORRIGIDO no mesmo bloco.

O defeito plantado **S902** — trocar a razão `p / a` pela diferença `p - a` no
`fatorDoRitmo` — **passou**. Ele era pego antes de o item 5 subir o
`RITMO_PISO` de 0,35 para 0,65.

As afirmações que existiam mediam os **extremos**, e extremo é onde os dois
grampos mandam. Estreitar a faixa aproximou os dois lados do grampo, e as duas
fórmulas passaram a devolver os mesmos valores nos pontos medidos.

> Calibrar não é mexer só no produto: uma constante mais apertada pode apagar a
> diferença que um teste usava para enxergar. O teste continua verde, e passou
> a não afirmar nada.

**A correção mede o que a razão TEM e a diferença NÃO tem:** invariância de
escala. Dobrar poder e ameaça juntos não pode mudar o ritmo — e a afirmação
acontece em dois pontos **interiores** à faixa, longe dos grampos, com o produto
`fator × razão` conferido em ambos.


---

## D-086 — `sala-cliente` é INSTÁVEL, e instável é pior que vermelho

**Achado em:** 09/09/2026, no fecho do 1.27. **Bloco dono:** F1.8 (a sala do
cliente). **Estado:** aberto.

```text
execução 1   VERMELHO — 1/1955   [sala-cliente] entrar na sala traz o estado
                                 e acende o "no ar"
execução 2   VERDE — 1955/1955   sem tocar em nada
```

O bloco em curso não encosta em sala, servidor nem WebSocket, então isto não é
regressão dele — é uma corrida que estava lá e escolheu aparecer agora.

**Por que ele entra em DEFEITOS mesmo sendo de outro bloco.** O `CLAUDE.md` é
explícito, e a frase é a razão inteira:

> Fechar bloco com a suíte **instável** é pior que com ela vermelha: vermelho
> constante é defeito com endereço, instável escolhe quando aparecer.

Um teste que pisca ensina a suíte a ser ignorada. Na terceira vez que alguém
roda de novo "porque às vezes falha", ele parou de proteger qualquer coisa.

**A suspeita, e ela é suspeita e não medição:** o teste espera dois sinais em
sequência — o primeiro evento (`estado`) e depois o estado `NO_AR` —, e afirma
no meio que a tela passou por `CONECTANDO`. Se a conexão sobe rápido demais, a
transição pode ser observada depois de já ter passado.

**O que o destrava:** rodar `npm run repetir` num laço até reproduzir, e ler
qual das três afirmações caiu. Sem essa leitura, qualquer correção é chute — e
chute em teste instável costuma virar espera maior, que esconde o defeito em
vez de corrigi-lo.


---

## D-087 — a ferramenta de OLHAR inventava a raridade, e eu usei a foto como prova

**Achado em:** 09/09/2026, **pelo dono, olhando uma captura que eu anexei**.
**Bloco dono:** 1.27b (a esteira). **Estado:** CORRIGIDO no mesmo bloco.

> "a prévia do quem apareceu não está aparecendo o tier de destaque do pokémon,
>  um charizard desde quando é 'comum'?"

**O jogo estava certo.** Medido no motor:

```text
charizard   força 534  ->  muitoRaro
blastoise   força 530  ->  muitoRaro
wartortle   força 405  ->  incomum
squirtle    força 314  ->  comum
```

O que mentia era o `olhar-idle.mjs`. Ao plantar encontros para fotografar o
quadro, ele escrevia `raridade: esp.raridade ?? 'comum'` — e **a espécie não tem
campo de raridade**: ela é DERIVADA da força pelo `raridadeDe`, exatamente como
o `elencoDoBioma` faz. Então o `??` pegava sempre, e os quatro saíam "comum",
com as chances de bola erradas junto.

### Por que este defeito é pior que um defeito de produto

O cabeçalho da própria ferramenta já avisa que **foto vazia com relatório verde
é evidência falsa**. Este caso é a versão pior dela:

> Foto BONITA que afirma o que é falso não levanta suspeita nenhuma. Eu a
> anexei ao relatório do bloco como prova de que o quadro estava pronto, e o
> dono teve de conferir por mim o que a esteira existia para conferir.

### A regra que fica, e ela vale para todo estado plantado

**Campo DERIVADO se pergunta à função que o deriva.** Escrever o valor à mão é
assumir que ele nunca muda — e ele muda no primeiro rebalanceamento de força,
sem que nada fique vermelho.

A ferramenta já seguia essa regra em dois lugares (o Pokédex é conquistado, e o
estado vai ao disco pela mesma `salvar` do jogo). Ela falhou justamente no campo
que ninguém pensou em conferir, porque o `??` fazia parecer um cuidado.

**O que ficou de pé:** vale varrer as outras ferramentas de plantio pelo mesmo
padrão `?? 'valor'` sobre campo derivado. Registrado como L-173.


---

## D-088 — `pintarPrevia` chamava um `escrever` que não é dela

**Achado em:** 10/09/2026, LENDO o código antes de mexer nele. **Bloco dono:**
1.27d. **Estado:** CORRIGIDO no mesmo bloco.

A linha do estágio vazio chamava `escrever(...)`, e essa `const` mora dentro da
`pintarEstagios` — outra função, no mesmo arquivo. Fora dali ela é um
`ReferenceError`, e ele derruba o desenho da aba inteira.

```js
export function pintarPrevia(bioma, perfil, estagio) {
  ...
  if (!lista.length) {
    escrever('<p class="tiny">Nada aparece aqui neste estágio.</p>');  // ← daqui não
```

**Por que ele nunca disparou.** Só existe quando o estágio não tem espécie
nenhuma, e isso não acontece no pack de Kanto. Um save que cite bioma removido,
ou um pack novo com um estágio vazio, e a aba cai.

> Erro que espera um dado que ainda não existe é o pior de achar: ele não tem
> sintoma até o dia em que tem, e nesse dia ninguém liga a causa ao lugar.

### E ele foi achado LENDO, e não por teste

Nenhum dos portões o pegaria: o estático não vê escopo de closure entre funções
irmãs, e o Q5 não o pega porque o caminho não é alcançável com o conteúdo atual.
Ele apareceu porque o bloco precisava mexer naquela função e eu li o corpo dela
antes.

**A metade que vale mais:** o mesmo arquivo tinha o padrão CERTO três funções
acima — `const escrever = html => { for (const el of alvos) ... }` —, e a
`pintarPrevia` escrevia direto em `alvo.innerHTML`. Ela nunca tinha sido
convertida para as duas abas, e a chamada solta era o resto de uma conversão
pela metade.


---

## D-089 — a cena inteira morreu, e a suíte ficou VERDE

**Achado em:** 10/09/2026, pela esteira de OLHAR — e **não** pela suíte.
**Bloco dono:** 1.27d. **Estado:** CORRIGIDO no mesmo bloco.

Ao dividir o `idle-mundo.mjs` (quarta vez que ele passou de 600 linhas), as
funções da vida do bioma foram para `idle-bioma-vivo.mjs` **lendo uma `let` de
módulo que ficou para trás**:

```text
plantaAtual is not defined   — a cada quadro, dentro do laço de desenho
```

O laço parava na primeira exceção, e tudo depois dela sumia:

```text
                 ANTES DA DIVISÃO      DEPOIS
placas                    3                 0
números de dano          24                 0
estouros de efeito       14                 0
```

### E o portão que existe para isso não pegou

`test/origem` é o teste do D-074, escrito exatamente para "símbolo que não
existe em execução". Ele varre símbolos **CHAMADOS** — `foo(...)` — e não
variáveis apenas **LIDAS**. `plantaAtual` nunca é chamada; ela é lida.

> **Estado de módulo lido de fora é acoplamento invisível.** Ele não aparece em
> nenhum `import`, então nenhuma varredura o segue quando o arquivo se divide —
> e a divisão é exatamente o momento em que ele quebra.

### A correção não foi reexportar a variável

Foi o pintor **RECEBER o que ele pinta**. Assim a dependência fica escrita na
assinatura, e a próxima divisão não tem como perdê-la — reexportar teria
mantido o acoplamento e só mudado o endereço dele.

### O que ficou de pé

Ampliar o `test/origem` para identificadores LIDOS é caro em falso positivo
(toda variável local viraria candidata) e é o mesmo teto que a varredura por
texto já tem — registrado como **L-174**, com a alternativa: o portão de
navegador alcançar a TELA DA RUN, que hoje ele não abre.

**O que salvou:** a esteira de OLHAR, que passou a contar placas, números e
estouros. Os três foram a zero de uma vez, e três zeros juntos não são
coincidência. Sem eles, este commit teria ido para o repositório com a cena
morta e a suíte verde.


---

## D-090 — o baixador de arte só cobria o elenco da ARENA

**Achado em:** 10/09/2026, depois de o dono cobrar a mesma tela por **três dias**.
**Bloco dono:** 1.27e. **Estado:** CORRIGIDO.

> "as sprites continuam bugadas sem sair os efeitos de ataque, e os pokémon
>  selvagem ficam sumindo as sprite, precisamos resolver isso logo, 3 dias
>  praticamente na mesma coisa"

Uma linha, em `tools/baixar-assets.mjs`:

```js
const elenco = pack.especies.filter(p => pack.elenco.includes(p.dex));
```

`pack.elenco` é quem luta na **Arena**: 76 espécies de 146. Estava certo
enquanto a Arena era o único lugar que trocava de folha de animação.

O **Avanço** chegou e passou a pôr na tela o elenco do **ESTÁGIO**, que sai dos
BIOMAS e não conhece essa lista. O resultado, medido:

```text
                     EM DISCO      O QUE A CENA PEDE
Walk-Anim.png            146                    146
Attack-Anim.png           76                    146      <-- 70 faltando
Hurt-Anim.png             76                    146      <-- 70 faltando
```

> Uma lista escrita para um consumidor não fica errada quando chega o segundo:
> ela fica **CURTA**, e curta não avisa.

### E o baixador relatava tudo em ordem

```text
1423 arquivos a conferir em assets/
já tinha: 1423 · origem: 0 · espelho: 0 · falhou: 0
```

Um relatório honesto sobre a pergunta errada. Ele conferia o que a própria
lista pedia, e a lista é que era curta.

### E nunca foi limite da arte de origem

Eu tinha escrito, num comentário do bloco anterior, que *"só 82 das 146
espécies têm essas folhas em disco"* — e construí a queda para trás em cima
dessa frase, como se fosse um fato da natureza. Medido em 10/09/2026:

```text
0016/Attack-Anim.png  ->  200        0039/Attack-Anim.png  ->  200
0016/Hurt-Anim.png    ->  200        0004/Attack-Anim.png  ->  200
```

Todas existem. **Eu aceitei um download pela metade como se fosse a fronteira
do material** e passei um bloco inteiro desenhando em volta dela.

### O portão que faltava, e ele existia para a família de arte ao lado

`test/assets.mjs` já cobrava *"a cópia local cobre as folhas de EFEITO"* desde
o F0.12. A mesma cobrança para as folhas de CRIATURA nunca foi escrita.

> Um portão escrito para uma família de arte não cobre a família ao lado. Ele
> só faz parecer que cobre.

Agora são duas asserções: o **disco** cobre as três folhas de combate das 146,
e a **lista do baixador** não pode voltar a sair de `pack.elenco`.

---

## D-091 — a escolha da folha perguntava à TABELA, e a tabela não sabe o que existe

**Achado em:** 10/09/2026, junto do D-090. **Bloco dono:** 1.27e.
**Estado:** CORRIGIDO.

Este é o defeito que transformava o D-090 em **sumiço**. A linha era:

```js
const anim = batendo && grade.a ? 'a' : (apanhando && grade.h ? 'h' : 'w');
```

`grade` é a tabela do PMD, e ela promete `a` e `h` para as **146**. Em disco
havia 76. Então a cena trocava para uma folha inexistente, o
`background-image` vinha vazio, e a criatura **sumia no instante exato do
golpe** — enquanto a placa de nome, que é outro elemento, continuava no ar.

É literalmente o que as capturas do dono mostram: *"Jigglypuff 0/100"* pairando
sobre o nada, e *"Pidgey 22/100"* empilhado sem corpo. Os dois — 0039 e 0016 —
estão na lista dos 70 sem folha.

> A tabela diz o que a arte **PODERIA** ter. Só o carregamento diz o que ela
> **TEM**. Perguntar à tabela é perguntar a quem não sabe.

### E o companheiro do jogador sofria o mesmo

`idle-companheiro.mjs` fazia `ANIM_DO_COMBATE[p.anim] ?? 'Walk'` — traduzir a
chave não é conferir o arquivo. O Charmander do dono (0004) está entre os 70: o
bicho que ele escolheu sumia no golpe dele.

### A correção não foi um `try`

Foi separar quem DECIDE de quem CARREGA. `app/modules/folha-viva.mjs`, camada
0, guarda o veredito de cada endereço e devolve a folha do momento **só quando
ele é `true`**. Três estados, e os três importam:

```text
true        carregou      ->  pode usar
false       não existe    ->  cai na caminhada, para sempre
undefined   ninguém sabe  ->  cai na caminhada, ATÉ a sonda responder
```

O terceiro é o que impede o buraco de um quadro. A parte que precisa de
navegador — pedir a imagem e ver se ela veio — é uma `Image()` de sete linhas
em `vivos.mjs`, e ela não decide nada.

**Sétima vez neste bloco que a mesma lição aparece:** a linha morava colada ao
`style.backgroundImage`, e por isso nenhum teste sem navegador podia afirmá-la.

---

## D-092 — o estouro era posto em coordenada de TELA e pintado num canvas de MUNDO

**Achado em:** 10/09/2026. **Bloco dono:** 1.27e. **Estado:** CORRIGIDO.

A cena do idle desenha em **dois espaços ao mesmo tempo**:

```text
o CANVAS   W x H pixels de MUNDO, esticados pelo CSS. Quem desenha nele
           escreve `x - cam.x`, sem escala nenhuma
o HTML     as molduras vivas são elementos de verdade, em pixels de TELA — e
           lá o mesmo ponto é `(x - cam.x) * escala`
```

O estouro nascia com a conta do HTML e era pintado no CANVAS. Medido: a escala
da tela da run é **3×**. Cada estouro caía ao triplo da distância da borda da
câmera — longe do alvo quando ainda cabia, e fora da janela na maior parte das
vezes.

### E o contador dizia 413 desenhos

Foi assim que o bloco 1.27c fechou: *"14 estouros agendados, 413 desenhos"*. Os
dois números estavam certos. A função rodou 413 vezes.

> **Contador conta CHAMADA.** Ele não olha para a tela, e por isso não sabe se
> o que foi desenhado caiu no lugar — ou se caiu fora dela.

É a mesma família do D-083 (o número do dano existia e não chegava aos olhos) e
do D-087 (a foto bonita que afirmava o que era falso). **Quinta vez neste bloco
que uma sonda mede a coisa errada**, e a mais cara das cinco.

### A correção é estrutural, e não aritmética

Multiplicar por `escala` no lugar certo consertaria o número e deixaria o
defeito possível. O que foi feito: `estourar` passou a **receber o ponto do
MUNDO e a câmera**, e a converter sozinho. O espaço da posição e o espaço do
desenho passam a ser decididos no mesmo arquivo, e não têm como discordar — que
era a única forma de o defeito existir.

### E o instrumento que faltava

`desenharEstouros` passou a contar quantos caíram **fora do canvas**, e a
esteira passou a esperar o instante em que há estouro no ar para **fotografar**.
As duas coisas juntas viraram o número que estava faltando:

```text
                       ANTES DA CORREÇÃO      DEPOIS
agendados                          14             15
desenhados                        413          1.023
FORA DA TELA                 (ninguém contava)       0
foto com estouro no ar       (nunca existiu)      tirada
```


---

## D-093 — a linha de base visual LOCAL é invisível ao git, e envelhece calada

**Achado em:** 10/09/2026, fechando o 1.27e. **Bloco dono:** T7 (a esteira).
**Estado:** a deriva foi regravada; **a causa de fundo continua aberta.**

O portão Q2 ABORTOU antes de plantar um único defeito, porque a configuração de
julgamento já estava vermelha:

```text
inicio@estreito         1 de 64 regiões fora — região 3,3 (média 2,1, pico 8)
regras@estreito         1 de 64 regiões fora — região 1,2 (média 2,1, pico 7)
comofunciona@estreito   1 de 64 regiões fora — região 2,1 (média 2,2, pico 14)
```

### E eu gastei SEIS experimentos concluindo o contrário do que era verdade

Nesta ordem, e todos errados pela mesma razão:

```text
1  rodei --so=visual sozinho             VERDE  -> "é oscilação"
   ERRADO: --so=visual não roda a suite visual-base. Li o verde de outra coisa
2  tirei as folhas de Idle novas         VERMELHO
3  tirei as folhas de Attack/Hurt novas  VERMELHO
   INVÁLIDOS: tirar o arquivo local não restaura o comportamento antigo — ele
   cria um TERCEIRO, em que o jogo sai para a rede e leva 404
4  árvore anterior num worktree          VERDE  -> "então a deriva é MINHA"
5  worktree + assets novos               VERDE
6  worktree + assets + meu código todo   VERDE  -> "então não é o código???"
```

O 4, o 5 e o 6 eram **vacuosos**. E a razão está numa linha do `.gitignore`:

```text
test/fixtures/visual-base-local.json
```

**A linha de base contra a qual o portão compara não está no repositório.** Um
worktree limpo não a tem, então não havia nada com que comparar, e a suíte
passava sem afirmar coisa nenhuma. Três "verdes" seguidos que só diziam
"não olhei".

> **Portão sem a referência não reprova — e ele também não avisa que está sem
> ela.** Verde por ausência de comparação é a forma mais silenciosa de um
> portão mentir, e é a mesma família do D-015.

Com o arquivo copiado para o worktree, a árvore **anterior ao bloco** deu
exatamente o mesmo vermelho, com os mesmos três recortes e os mesmos números.
**A deriva nunca foi deste bloco.**

### O que ela é, então

```text
visual-base.json         2026-08-21 12:24   REFERÊNCIA, versionada
visual-base-local.json   2026-09-09 12:46   LOCAL, fora do git
```

A local foi gravada **antes de três commits do bloco anterior** (`1fc9665`,
`e6f4247`, `cf1f9ea`). Ela envelheceu ali e ninguém viu, porque um arquivo que
o git não mostra não aparece em nenhum `status`, em nenhum diff e em nenhuma
revisão. A deriva ficou esperando o próximo bloco para reprovar — e o próximo
bloco fui eu.

### O que foi feito, e o que NÃO foi

```text
FEITO       regravada a LOCAL, com npm run gerar:visual. A REFERÊNCIA versionada
            não foi tocada — o ambiente não bate com o dela, e é por isso que
            existe uma local
NÃO FEITO   afrouxar a tolerância. Ela existe para pegar o rótulo que transborda
            e a coluna fora da dobra — os três defeitos do V1.15 que passaram
            por 299 testes verdes. Subir o limiar apagaria a razão do portão
ABERTO      o que mudou naquelas três telas entre 09/09 e agora. Média 2,1 num
            canal de 0 a 255, numa digital de 32x32 da página inteira: é pequeno
            demais para ser componente fora do lugar, e grande o bastante para
            não ser nada
```

### O que o portão precisa passar a fazer

**Dizer em voz alta quando está julgando sem referência.** Hoje, sem a local e
sem casar o ambiente da de referência, ele passa. Deveria dizer
`SEM LINHA DE BASE — nada afirmado`, que é a diferença entre "conferi e está
igual" e "não tinha com o que conferir".

E **carimbar a data e o commit** em que a local foi gravada, para que uma base
velha se denuncie sozinha em vez de esperar o bloco seguinte.

### E a ferramenta que nasceu disto

`tools/olhar-base.mjs`: fotografa a tela reprovada, na mesma largura, com a
grade 8x8 do portão desenhada por cima e a região acusada em vermelho.

> "região 3,3" é um endereço numa miniatura de 32 px. Ninguém olha para uma
> miniatura e reconhece o que mudou.

Eu gastei seis experimentos adivinhando antes de olhar uma vez. A ferramenta
existe para que o próximo comece pelo olho.


---

## D-094 — um script de reversão duplicou 3 725 linhas do `app/index.html`

**Achado em:** 13/09/2026, pelo pré-voo do portão Q2.
**Bloco dono:** 1.32. **Estado:** CORRIGIDO — `tools/conserta-index.mjs`.

Ao separar o bloco do clima do bloco do cartão em dois commits, escrevi um
script que **desfazia** o segundo. Ele cortava o arquivo por índice de string
(`indexOf` + `slice`) e remontava as partes. Uma das âncoras casou no lugar
errado:

```text
antes     7 861 linhas
depois   11 586 linhas
o diff    3 725 inserções, ZERO remoções — puro texto duplicado
```

### O arquivo abria, rodava, e tinha metade do conteúdo duas vezes

Não houve erro de sintaxe, não houve `pageerror`, e a suíte sem navegador
passou. O HTML tolera um `<style>` com regras repetidas e uma `<div>` a mais —
a última regra ganha, e a tela fica parecida o bastante para ninguém desconfiar.

> **Editar um arquivo de 8 000 linhas por recorte de string é operação sem
> rede.** Ela não falha com uma exceção: falha com um arquivo que abre.

### Quem pegou, e por que ele pegou

O **pré-voo do Q2**, que confere que cada defeito plantado ainda tem onde ser
plantado — âncora presente **exatamente uma vez**:

```text
30 defeito(s) plantado(s) sem valor:
S310 [ÂNCORA AMBÍGUA] app/index.html — casa 2 vezes; planta na primeira
S325 [ÂNCORA AMBÍGUA] ...
```

Ele existe para outra coisa — achar defeito cuja âncora um bloco moveu — e
acabou sendo o único mecanismo do arnês capaz de ver duplicação. Trinta âncoras
ficando ambíguas de uma vez não é coincidência, e é a mesma assinatura do D-089
(três contadores indo a zero juntos).

### A correção, e o método dela é a parte que fica

Procurar e apagar o trecho duplicado exigiria acertar as MESMAS fronteiras que
já tinham errado uma vez. Em vez disso, `tools/conserta-index.mjs`:

```text
1. parte de uma base que o git garante   git show HEAD:app/index.html
2. reaplica as duas inserções do 1.32    pequenas, e verificáveis uma a uma
3. CONFERE o tamanho final               base + o que foi inserido, exato
4. CONFERE cada marcador                 nenhum pode aparecer duas vezes
```

O passo 3 é o que faltava na primeira vez. Um script que edita e não confere o
que produziu está apostando que a âncora dele estava certa — e âncora de string
num arquivo grande é exatamente a coisa que não se deve apostar.

### E o episódio custou mais do que este defeito

O mesmo script era a metade "desfazer" de uma manobra para separar dois commits.
A outra metade — um backup do bloco em `/tmp` — **evaporou** quando a sessão foi
interrompida e o diretório temporário foi limpo três dias depois. O bloco do
cartão da equipe (1.27f) teve de ser refeito do zero.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** Para
> pôr trabalho de lado neste repositório existe um mecanismo que não evapora, e
> é um commit — mesmo que seja um commit de rascunho que depois se reescreve.

A regra que fica, e ela vale para qualquer manobra futura de separar commits:

```text
NUNCA   git checkout <commit> -- <arquivos>   sobrescreve o ÍNDICE junto, e
        leva o trabalho staged sem avisar. Já custou quatro arquivos em 10/09
NUNCA   backup em /tmp para atravessar uma sessão
SEMPRE  commit de rascunho, e reescrita depois com rebase ou amend
```

---

## D-095 — os `tools/` calculam a raiz por um idioma que só existe no Windows

**Achado em:** 14/09/2026, pela suíte `servir` num clone POSIX.
**Bloco dono:** este mesmo commit. **Estado:** CORRIGIDO — `fileURLToPath` nos sete.

O `npm run rapido` voltou **VERMELHO — 1/2043** num clone limpo em Linux, com um
único teste caído: *"o app continua sendo servido no caminho dele"*, pedindo
`/app/index.html` e recebendo **404** numa árvore em que o arquivo existe.

A causa não estava no roteamento. Estava na primeira linha executável do
`tools/servir.mjs`:

```js
const RAIZ = resolve(dirname(new URL(import.meta.url).pathname.slice(1)), '..');
```

### O `.slice(1)` é certo no Windows e errado em todo o resto

```text
Windows   new URL('file:///C:/Users/gdult/pa4/tools/servir.mjs').pathname
          -> "/C:/Users/gdult/pa4/tools/servir.mjs"
          o .slice(1) tira a barra e sobra o caminho absoluto. CERTO.

POSIX     new URL('file:///home/user/Pokemon/tools/servir.mjs').pathname
          -> "/home/user/Pokemon/tools/servir.mjs"
          o .slice(1) tira a barra e o caminho vira RELATIVO. O resolve()
          então o cola no diretório de trabalho:

              servindo      /home/user/Pokemon/home/user/Pokemon
```

O servidor subia, imprimia o link, e respondia **302 na raiz** — porque o
redirecionamento é aritmética de string e não toca o disco. Só o pedido que
precisa **abrir um arquivo** revelava a raiz dobrada.

### Por que ninguém tinha visto

Porque o projeto é desenvolvido em `C:\Users\gdult\pa4`, onde a linha está
certa. A suíte é verde na máquina do dono e vermelha em qualquer outra — e o
`tools/servir.mjs` é, pelo `CLAUDE.md`, *"a única porta pela qual o jogo chega a
alguém"*.

### O achado maior: eram SETE, e só um tinha teste

```text
tools/servir.mjs           <- o único com suíte que o executa; o único vermelho
tools/empacotar.mjs
tools/folha-acervo.mjs
tools/folha-gifs.mjs
tools/folha-shiny.mjs
tools/patchnotes.mjs
tools/preparar-acervo.mjs
```

Consertar o `servir.mjs` e deixar os outros seis teria devolvido a suíte ao
verde **e deixado o defeito de pé** — a falha de derivar pela metade, que já
custou um portão inteiro a este projeto (ver `CLAUDE.md`, o D-017 e o D-024).

### A guarda que fica

`test/servir.mjs` ganhou uma peneira **derivada**: ela lê `tools/*.mjs` do
diretório e reprova qualquer arquivo que leia o próprio caminho por
`new URL(import.meta.url).pathname`. Ferramenta nova que repita o idioma nasce
reprovada, sem ninguém precisar lembrar.

A peneira é sobre o **idioma** e não sobre o resultado, de propósito: medir a
raiz de cada ferramenta exigiria importá-la, e importar ferramenta é executá-la.

> **Um caminho que só resolve numa plataforma é um caminho que não resolve.** O
> que atravessa as duas é o `fileURLToPath` — que o próprio `test/servir.mjs` já
> usava, quatro linhas acima de onde o defeito morava.

---

## D-096 — a passada ESTREITA do Q2 escrevia a linha de base que ela deveria só consultar

**Achado em:** 14/09/2026, no primeiro `npm run sabotagem` de um clone POSIX.
**Bloco dono:** este mesmo commit. **Estado:** CORRIGIDO — a criação recusa passada reduzida.
**Família:** D-093 (a base local é invisível ao git) e D-015 (configuração que julga sem base própria).

O portão abortou em 6 minutos, sem plantar um único defeito:

```text
ABORTADO: a suíte já está vermelha na configuração com-golden/navegador-estreito,
          SEM nenhum defeito plantado.
  [visual-base] a linha de base cobre as telas e larguras declaradas
      linha de base tem 4 entradas, esperado 16 (4 telas x 4 larguras)
```

### A acusação estava certa e o culpado era outro

A configuração não estava quebrada. A **referência** dela é que tinha nascido
pela metade, e nascido ali mesmo:

```text
1. a base versionada é de `windows-chromium-NNN`; esta máquina é
   `linux-chromium-141`. Digital de pixel não viaja, então vale a base LOCAL
2. a base local mora em `test/fixtures/visual-base-local.json`, que o
   `.gitignore` mantém fora do repositório — num clone novo ela NÃO EXISTE
3. ela é criada, preguiçosamente, pela primeira passada que não a encontra
4. num clone novo, a primeira passada é a do próprio Q2 — e o Q2 roda a suíte
   visual ESTREITA, com uma largura em vez de quatro

       nasce com   4 entradas   (4 telas x 1 largura)
       e a cobertura cobra 16   (4 telas x 4 larguras, contra LARGURAS_TODAS)
```

A partir daí o arquivo está envenenado: toda execução seguinte compara contra
uma base de 4 entradas e aborta acusando a configuração.

### A regra que faltava, e ela é a terceira metade de uma regra que já existia

O `CLAUDE.md` e o cabeçalho da passada estreita dizem o que a redução pode e o
que não pode:

```text
PODE      condenar — vermelho em uma largura é vermelho nas quatro
NÃO PODE  absolver — verde em uma largura não conclui nada
```

Faltava a terceira, e é a que mordeu:

> **Uma configuração reduzida também não pode ESCREVER a referência.** Se ela
> não pode concluir que está verde, ela muito menos pode definir o que "verde"
> quer dizer para as próximas execuções.

O D-015 tinha corrigido o lado do *esperado* — o teste passou a contar contra
`LARGURAS_TODAS` em vez de `LARGURAS`. Ficou de pé o lado do *observado*: a
base capturada por uma largura.

### A correção

`test/visual.mjs` exporta `passadaCompleta()`. O `test/run.mjs` só cria a base
local quando a passada é completa; numa passada estreita sem base local ele
**recusa e diz o remédio**, em vez de escrever um arquivo pela metade:

```text
linha de base visual LOCAL ausente, e esta passada é ESTREITA.
  Uma largura não pode escrever a referência das quatro [...]
  Rode `npm run gerar:visual` uma vez nesta máquina e repita o portão.
```

Medido: com o arquivo removido e `SABOTAGEM_ESTREITA=1`, a execução sai com
código 2 e essa mensagem. Com `npm run gerar:visual` rodado uma vez, a base
local nasce com **16 entradas** e o portão anda.

> Recusar com endereço custa uma execução. Escrever a referência errada custa
> todas as seguintes, e ainda manda procurar o defeito no lugar errado.

---

## D-097 — o portão reprova a si mesmo: quatro navegadores em quatro núcleos

**Achado em:** 14/09/2026, na primeira execução QUENTE do Q2 depois do D-096.
**Bloco dono:** T9 (o portão em 30 minutos). **Estado:** ABERTO — o conserto é a
mesma peça que o T9 precisa reescrever.
**Gravidade:** alta. Instável reprovando é o que o `CLAUDE.md` chama de pior que
vermelho constante — *"vermelho constante é defeito com endereço, instável
escolhe quando aparecer."*

O Q2 abortou aos 10 min acusando a configuração com navegador de estar quebrada:

```text
[visual] a colocação está viva durante a luta, não só correta no fim
    nenhuma queda em 45 s de luta — o cenário não foi exercitado
```

O mesmo teste tinha passado na execução FRIA, na mesma árvore.

### Medido, e as três medições juntas são o diagnóstico

```text
sozinho, 3 execuções        VERDE 3/3     226 · 227 · 224 s   (±1,5 s)
4 em paralelo               VERDE 1/4     386 s de parede
                            a VERMELHO 4/49 · b VERMELHO 1/49 · d VERMELHO 4/49
```

**75% das execuções reprovam sob exatamente a carga que o portão impõe.** E o
paralelismo compra menos do que custa: 4 execuções em 386 s contra 904 s em
série — **2,3x de ganho em 4 núcleos**, pago com três quartos dos vereditos.

### A causa, e são duas falhas somadas numa linha

```js
const houveQueda = aoVivo && await pg.waitForFunction(
  () => document.querySelectorAll('#pickList .pick.fechado').length > 0,
  { timeout: 45000, polling: 400 }).then(() => true).catch(() => false);
```

**1. O prazo é de PAREDE e o trabalho é de ANIMAÇÃO.** A batalha avança no
relógio da página. Os dois relógios só coincidem quando sobra CPU; com quatro
Chromiums em quatro núcleos, 45 s de parede compram bem menos que 45 s de luta.
O teste passa a medir a carga da máquina em vez do jogo.

**2. O `.catch(() => false)` apaga a distinção que importa.** *"Não houve queda
em 45 s"* e *"a espera estourou sem a página ter tido chance de rodar"* devolvem
o mesmo `false`. A asserção então acusa **"o cenário não foi exercitado"**, que é
falso: o cenário foi exercitado e não teve CPU para chegar na primeira queda.

> É o D-022 outra vez, e a frase de lá serve inteira: *"log vazio não é 'travou
> antes de imprimir': é 'não terminou, então não descarregou'."* Aqui: **`false`
> não é "não caiu ninguém": é "não deu tempo de olhar".** A acusação com o
> endereço errado custou meia hora procurando defeito no cenário.

O segundo sintoma da mesma fome aparece na sonda irmã, duas vezes nas quatro
execuções: `"não deu para ler a colocação viva: a luta não chegou a acontecer"`.

### Por que ele é do T9, e não um conserto solto

Há um remendo barato — subir o prazo de 45 s. Ele está **errado** pela regra que
o próprio arnês já aprendeu no D-022: aumentar o teto esconde o sintoma e o
defeito volta na próxima máquina mais lenta. Pior, aqui ele agrava o problema que
o dono levantou, porque prazo maior é portão mais lento.

O conserto certo tem duas metades, e as duas são o T9:

```text
esperar PROGRESSO DO JOGO, e não relógio de parede — o placar de abates já é
lido logo abaixo e o comentário do arquivo explica por que ele é independente

UM navegador vivo em vez de quatro disputando — que é a mudança que o T9
precisa fazer de qualquer forma para caber em 30 min
```

A segunda resolve as duas coisas de uma vez, e é a razão de este defeito não ter
bloco próprio: **a instabilidade e o custo do portão são o mesmo defeito visto de
dois ângulos.**

---

## D-098 — o booleano do navegador era grosso demais, e subia sete sondas para ler uma

**Achado em:** 14/09/2026, medindo o custo do portão para a L-179.
**Bloco dono:** T9. **Estado:** CORRIGIDO — `sondasNecessarias()` devolve o conjunto.
**Família:** D-059, no mesmo arquivo criado para contê-lo.

```js
const precisaNavegador = ...                 // booleano: "precisa?"
if (precisaNavegador) emFila([ 7 sondas ])   // o "sim" virava "sobe todas"
```

`--so=visual` subia sete Chromiums, lia um resultado e descartava seis. O portão
paga isso **por mutante de navegador**, e são 294 dos 981.

### Quem denunciou foi a medição das larguras, e ela quase enganou

```text
visual, 4 larguras     226 s
visual, 1 largura      152 s     <- cortar três larguras poupa só 33%
```

Se as larguras fossem o custo, cortar três teria poupado três quartos. Os ~127 s
que sobravam não eram largura: eram as seis sondas que ninguém lia.

### É o D-059 pela segunda vez, no arquivo criado para impedi-lo

Da primeira, o booleano estava **errado** — esquecia o `--sem-navegador`, e o
`npm run rapido` subia cinco Chromium para descartá-los: 3 min 30 s onde o
`CLAUDE.md` prometia 7 s. Consertaram o valor e extraíram a regra para
`bandeiras.mjs`, com tabela-verdade e teste.

Ninguém notou que ela é do **tipo** errado. A pergunta nunca foi *"precisa de
navegador?"* e sim *"de QUAIS sondas?"* — e booleano não responde isso.

> **Consertar o valor de uma decisão não conserta a forma dela.** O módulo que
> existe para conter este defeito carregava a segunda metade dele.

### A correção, e as duas guardas que a tornam segura

`SONDA_DA_SUITE` mapeia suíte → sonda, e `sondasNecessarias()` devolve o
conjunto. A tabela é **escrita e não derivada do nome**, de propósito:
`rodada-viva` e `contraste` vivem do resultado que a sonda `rodar()` já
capturou, e derivar erraria exatamente nesses três.

Cortar sondas é a maior economia do portão **e** a forma mais fácil de uma suíte
sumir calada, que é o S109. Por isso duas guardas:

```text
a antiga    "resultado ausente não pode virar suíte ausente" passa a cobrar só
            a sonda PEDIDA — antes exigia as quatro sempre
a nova      DERIVADA das duas fontes que poderiam divergir: sonda que subiu e
            não virou suíte ABORTA, nomeando a sonda
```

A segunda foi sabotada antes de merecer confiança — apontei `visual` para uma
sonda inexistente e ela pegou. Sem ela, aquela sabotagem daria **VERDE com zero
testes visuais**. A mensagem nomeia a **sonda** e não a suíte: errar isso
repetiria o D-097, cuja acusação mandou procurar defeito no cenário por meia
hora.

### Medido

```text
--so=visual        226 s  ->  82 s      mesmos 49 testes, VERDE
suíte bandeiras    5 testes -> 11
portão (projeção)  7 h -> ~90 min aqui · ~53 min na máquina do dono
```

### O que ele NÃO resolve, e está medido

Depois do corte, `--so=visual` estreita custa 64 s, e o cronômetro por fase
(`Q2_TEMPOS=1`, que nasce neste bloco) diz onde:

```text
13779 ms  esperando a fase virar (entrada + AO VIVO)
13675 ms  esperando a luta avançar até a primeira queda
 4005 ms  sono fixo de 4 s
```

**Metade do custo restante é a partida sendo jogada em tempo real.** Quatro dos
49 testes dependem da luta e custam 27,5 s dos 64. Partir a sonda para que só
eles paguem é o **T10**.

---

## D-099 — a tela da arena não reproduz ✅ RESOLVIDO, e a resolução é uma DESISTÊNCIA MEDIDA

**Achado em:** 14/09/2026, tentando fechar o T9. **Bloco dono:** T9. **Estado:** RESOLVIDO em 14/09 — a arena saiu da digital de pixel.

### A resolução, e ela não é o conserto que eu procurei

Cinco tentativas, todas medidas, todas parciais:

```text
D-033   congelar os GIFs                      reduziu, não zerou
D-040   esperar arte, <img>, fontes           nove hipóteses, não zerou
—       reducedMotion:'reduce'                é CSS, não toca o rAF
—       impressaoEstavel (duas amostras)      animação lenta atravessa
D-099   relógio de quadros determinístico     3 larguras de 4
D-099   esconder os canvas vivos              3 de 4 — e incluir o véu PIOROU
                                              (arena@largo de pico 1 para 21)
```

**A arena saiu da digital de pixel.** Ficam as outras três telas, que são
idênticas byte a byte nas quatro larguras.

O que se perde: detectar por PIXEL uma mudança não intencional dentro da arena.
Isso nunca funcionou de forma estável — não é cobertura removida, é cobertura
que se fingia ter. O que cobre no lugar são as outras 49 asserções da suíte
`visual`, que leem a arena pelo DOM, mais a segunda metade do Q5, que é olhar.

O custo de insistir já estava pago: **quatro abortos do Q2 em 14/09**, cada um
matando a execução inteira antes do primeiro mutante.

> Ruído na configuração de julgamento não deixa o portão mais rigoroso. Deixa o
> portão **inexistente**.

Medido depois: `SABOTAGEM_ESTREITA=1 --so=visual-base` quatro vezes, 4/4 VERDE.
Suíte completa com navegador: VERDE 2144/2144.

### O diagnóstico original, que continua valendo

O D-093 registrou a deriva e disse: *"a deriva foi regravada; a causa de fundo
continua aberta."* Ela está aqui.

### A medição que fecha o diagnóstico

Duas execuções de `npm run gerar:visual` seguidas — mesma árvore, mesma máquina,
nenhum teste no meio — e a comparação das duas linhas de base entre si:

```text
arena@panoramico    média 0,06   pico 8
arena@estreito      média 0,06   pico 8
arena@medio         média 0,09   pico 4
arena@largo         média 0,00   pico 1
inicio / regras / comofunciona, nas 4 larguras:   0

telas idênticas byte a byte: 12 de 16
```

**Só as quatro telas de `arena` não reproduzem.** As outras doze são idênticas.
Não é a máquina, não é carga, não é o rasterizador: é aquela tela.

### O que foi descartado, com medição

```text
o SORTEIO da arena     descartado. Com RAIZ_FIXA instalado, três capturas
                       seguidas trazem a MESMA arena (🏝️ Ilha Tropical).
                       Sem ele vinham três diferentes — foi o meu primeiro
                       probe, e ele media outro experimento
os GIFs                já congelados desde o D-033
reducedMotion          é preferência de CSS: não toca `requestAnimationFrame`
impressaoEstavel       mede duas vezes com 140 ms e aceita quando concordam
                       dentro de 1. Animação LENTA produz duas amostras
                       concordantes e continua andando
```

### E congelar o rAF NÃO resolve — foi tentado e medido

Parar `requestAnimationFrame` antes de fotografar impede o canvas de mudar
**durante** a medição, e não torna o conteúdo determinístico: ele para num
quadro arbitrário, e o quadro de duas execuções não é o mesmo. Medido: a
instabilidade virou vermelho **constante** de magnitude 4,8.

> Virar constante é diagnosticamente melhor — *vermelho constante é defeito com
> endereço* — mas não é conserto, e foi revertido.

**Esta tela já consumiu nove hipóteses** (D-040, região 1,5 da mesma
`arena@largo`; agora 1,1 e 1,2). Cada uma acertava uma causa e deixava a
seguinte. O padrão é a pista: não faltam causas, falta uma que as cubra.

### A direção recomendada, e ela tem precedente no próprio arquivo

`RAIZ_FIXA` pinça o **acaso** sobrescrevendo `crypto.getRandomValues` num
`addInitScript`. O que falta é o par dele: pinçar o **tempo**.

```text
RAIZ_FIXA      crypto.getRandomValues -> LCG determinístico     JÁ EXISTE
RELOGIO_FIXO   performance.now()      -> passo fixo por chamada  FALTA
```

O laço do app é `S.clock += raw`, com `raw` derivado de `performance.now()`. Com
o relógio em passo fixo, todo quadro computa o mesmo delta e o canvas evolui
igual em toda execução — determinismo pela mesma porta por onde o acaso já foi
domado, em vez da décima hipótese sobre qual elemento se mexeu.

**O risco a medir antes de construir:** passo fixo pode fazer alguma divisão por
delta virar `NaN`, e a fase de aposta precisa avançar para a captura acontecer.

### Por que ele bloqueia

`garantirBase` valida a configuração de julgamento antes de plantar defeito, e
com razão (D-015). Uma tela que não reproduz deixa essa validação vermelha, e o
portão **aborta antes do primeiro mutante**. Foi o que aconteceu três vezes em
14/09.

Na máquina do dono o caminho é outro — o ambiente casa com o da referência
versionada —, mas a não-reprodutibilidade é da captura, e não do arquivo.

---

## D-100 — o portão afoga a máquina e lê o afogamento como captura

**Achado em:** 14/09/2026, medindo o paralelismo (item 4 do T10).
**Bloco dono:** T9. **Estado:** CORRIGIDO — `N_TRAB` passa a ser meio núcleo por caixa.
**Gravidade:** ALTA, e não é desempenho: é `PEGOU` falso.

```js
const N_TRAB = Math.max(1, Math.min(cpus().length, 4));   // uma caixa por núcleo
```

A conta parece certa e não é. **Cada caixa sobe um NAVEGADOR, e um navegador são
~10 processos.** Não é uma por núcleo; são dez por núcleo. Medido durante uma
execução real: carga 11,3 em 4 núcleos, 40 processos Chromium vivos.

### A medição, mesma carga, três concorrências

```text
concorrência 1     55 s     1/1 verdes     vazão 1,09/min
concorrência 2     76 s     2/2 verdes     vazão 1,57/min
concorrência 4    147 s     0/4 verdes     vazão 1,63/min
```

**De 2 para 4 a vazão sobe quatro por cento e a corretude vai a zero.**

### E o prejuízo é mentira, não lentidão

No portão, mutante cuja suíte reprova conta como **PEGOU**. Suíte que reprova
por falta de CPU vira captura que não aconteceu:

```text
garantirBase   valida a configuração SOZINHO, antes dos mutantes  ->  passa
os mutantes    rodam N em paralelo, na máquina afogada            ->  reprovam
o portão       lê "reprovou" como "o defeito foi pego"            ->  PEGOU FALSO
```

É o **D-015 por outra porta**. Lá a configuração de julgamento estava quebrada;
aqui ela está sã e a MÁQUINA é que não dá conta. O `garantirBase` não tem como
pegar: ele mede antes, quando ainda há CPU sobrando.

> `PEGOU` falso é pior que `PASSOU` falso — o segundo manda investigar, o
> primeiro manda seguir em frente **e esconde os defeitos que de fato escapam**.

**Isto põe em dúvida o `Q2 VERDE 987/987` de 14/09 pela manhã**, que fechou o
D-095 e o D-096. Não está provado falso; está provado **não confiável**, e a
diferença é o que este registro existe para preservar.

### Quem tornou o defeito visível

O conserto do **D-097**, feito horas antes por outro motivo. As quatro execuções
não falharam em silêncio — elas disseram, com estas palavras:

```text
a página não avançou dentro do teto — o relógio DO JOGO não chegou a 12s.
Isto não é o cenário: é a máquina sem CPU para rodar a luta (D-097).
```

A mensagem escrita de manhã para não mandar procurar no lugar errado é a que
trouxe o diagnóstico à noite. **Recusa com endereço se paga.**

### A correção

```js
const N_TRAB = Math.max(1, Math.min(
  Number(process.env.Q2_TRAB) || Math.floor(cpus().length / 2), 4));
```

Meio núcleo por caixa é o que a medição sustenta. O teto de 4 fica: acima disso
a memória volta a ser o limite (D-023). `Q2_TRAB` permite remedir noutra máquina
sem editar o arquivo — o número tem data, e número documentado envelhece
(D-059).

---

## D-101 — o portão era dependência de si mesmo, e consertá-lo custava o portão inteiro

**Achado em:** 14/09/2026, depois de três execuções abortadas e ~13 h de portão.
**Bloco dono:** T9. **Estado:** CORRIGIDO — o contrato de execução saiu para `test/execucao.mjs`.

```js
// test/fecho.mjs
export const ARNES = ['test/harness.mjs', 'test/sabotagem.mjs', 'test/fecho.mjs'];
// e, em fechoDeArquivo:
const fora = new Set([...ARNES, ...prefixos]);     // em TODO fecho
```

`test/sabotagem.mjs` — **o próprio portão** — estava no fecho de toda suíte.
Qualquer edição nele invalidava os 991 vereditos de uma vez.

### O que isso significa na prática

```text
consertar o CUSTO do portão exigia PAGAR o portão inteiro,
e o que se estava consertando era justamente o preço dele
```

Em 14/09 a `sabotagem.mjs` mudou três vezes — todas para baratear o Q2 — e as
três zeraram o cache. Medido: `avanco`, uma suíte de motor que não tem nada a
ver com o portão, tinha `test/sabotagem.mjs` dentro do fecho.

### A suposição que estava escrita, e era falsa

O comentário que justificava a lista dizia, com todas as letras:

> *"Sobra o que de fato muda a pergunta: o `harness` [...] e a própria
> `sabotagem` [...] **Os dois mudam raramente**."*

Mudaram três vezes em um dia. E o array tinha **três** itens onde o comentário
justificava **dois** — o `fecho.mjs` entrou sem argumento nenhum.

### O que muda um veredito, e o que não muda

É a separação do D-098 outra vez — **orquestrar não é julgar**:

```text
MUDA      como o filho é invocado: bandeiras, ambiente, recorte, teto de tempo
NÃO MUDA  quantas caixas em paralelo, limpeza de sandbox, relatório,
          contabilidade de cache, pré-voo, ordem da fila
```

O que MUDA foi para `test/execucao.mjs` — `rodar()`, `SUITES_NAVEGADOR`,
`TETO_MUTANTE_MS` — e é ele que entra no ARNES.

**E o `fecho.mjs` sai por ser redundante:** se o algoritmo de fecho muda, a
DIGITAL que ele produz muda junto, e a chave já difere por isso. Estar na lista
só acrescentava uma invalidação total a cada ajuste no próprio cálculo.

```js
export const ARNES = ['test/harness.mjs', 'test/execucao.mjs'];
```

### A guarda, porque split que apodrece devolve o defeito em silêncio

`test/portao.mjs` passa a exigir três coisas: que `execucao.mjs` esteja no
ARNES, que `sabotagem.mjs` **não** esteja, e que a invocação do mutante
(`execFile('node', args, …)`) não tenha voltado para a sabotagem. Sem a
terceira, alguém devolve o código e a lista continua "certa".

### A ressalva, e ela é real

O **D-100** mostrou que o número de trabalhadores PODE mudar um veredito: com a
máquina afogada, a suíte reprova por falta de CPU e o portão lê `PEGOU`. Isso é
um defeito, e a resposta é não afogar a máquina — não invalidar o cache toda vez
que alguém ajusta a concorrência.

> Veredito que depende da carga não é veredito, e nenhuma chave de cache
> conserta isso.

### Medido

```text
antes    fecho de `avanco`: 15 arquivos, com test/sabotagem.mjs dentro
depois   fecho de `avanco`: 14 arquivos, sem ela
         suítes cujo fecho ainda contém sabotagem.mjs: 0

npm run rapido   VERDE 2050/2050
--so=portao      VERDE 40/40
```

**O que este conserto NÃO faz:** ressuscitar o cache atual. As chaves guardadas
foram calculadas com o ARNES antigo, então esta transição ainda paga uma
execução fria. Ele paga a partir da próxima.

