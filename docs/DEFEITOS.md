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

