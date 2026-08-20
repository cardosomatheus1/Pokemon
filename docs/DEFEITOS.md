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

## D-017 — `npm run rapido` cobre 21 suítes das 35 que não precisam de navegador

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

---

## D-018 — a raiz da rodada cabe num brute force, e o commit-reveal é decorativo

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

---

## D-019 — o servidor de produção importa um arquivo de `test/`

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
