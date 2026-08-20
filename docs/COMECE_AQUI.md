# Comece aqui

Você acabou de entrar num projeto que tem método próprio, e o método é a parte
que não é óbvia. Este documento é a hora e meia que te economiza uma semana.

Leia nesta ordem: **este arquivo → `CLAUDE.md` → `docs/POKEARENA_DOCUMENT_INDEX_v1.5.md`.**

---

## 1. O que é o produto

**PokéArena** — battle royale automático de apostas com **moeda simulada**.

Doze lutadores sorteados de um elenco de 76. As odds saem de **154.000
simulações** do mesmo motor que roda a luta. Trinta segundos para apostar. A
batalha é **determinística**: mesma semente, mesma luta, sempre — qualquer um
pode reproduzir e conferir o resultado depois.

O diferencial do produto é **odd auditável**. Guarde essa frase; ela decide
discussões de interface. Uma tela que erra o número da própria auditoria gasta
exatamente a confiança que o produto vende.

Sem dinheiro real. O PokéCash é simulado, não tem saque, e a decisão do dono do
projeto foi **tirar o `R$` de toda anotação de valor** — a única coisa em reais
que sobrou é o preço dos pacotes da loja simulada.

---

## 2. Como rodar

```bash
git clone <repo> && cd Pokemon
npm run assets          # baixa a arte de terceiros para assets/ (fora do git)
npm run serve           # abre o jogo
```

**O projeto tem ZERO dependências.** Não há `node_modules`. O `package.json`
existe só pelos scripts. Isso é regra, não acidente — ver §7.

O único software externo é o `playwright-core`, e ele é instalado **fora do
repositório** (ver `tools/README.md`). Sem ele, `npm test` pula o portão de
navegador com aviso.

---

## 3. Os comandos que você vai usar todo dia

```bash
npm run rapido             # 21 suítes sem navegador ......... 10 s  (ver D-017)
node test/run.mjs --so=carteira,exposicao   # só o que interessa  0,8 s
npm test                   # a suíte inteira, 596 testes ..... ~4 min
npm run gerar:visual       # regrava só a linha de base visual . 49 s
npm run olhar              # captura as telas em PNG .......... ~5 min
npm run sabotagem:tocados  # Q2 só dos arquivos que você mexeu
npm run sabotagem          # O PORTÃO Q2 ...... 4 min quente, 44 min frio
npm run sabotagem:completo # Q2 ignorando o cache — antes de uma tag
npm run portoes            # O PORTÃO DE FECHAMENTO
```

**`--so` acelera a CONSTRUÇÃO e não fecha bloco nenhum.** `npm run portoes`
recusa a bandeira de propósito. Portão que parece inteiro sem ser é pior que
portão ausente.

### O Q2 não reavalia o que não pôde mudar, e é isso que o mantém em minutos

Ele custava **~100 min** e crescia em dois eixos: bloco novo traz defeitos novos
*e* engrossa a suíte que cada defeito roda. Hoje:

```
Q2 do zero, sem cache        44 min          239 defeitos plantados
Q2 sem nada ter mudado      4 min 09 s      194 de 208 reaproveitados (medido em 208)
```

A regra é que o veredito de um defeito é função de **três coisas e de mais
nada**: a definição dele, o conteúdo do arquivo onde ele é plantado, e o fecho
da suíte que o pegou (tudo que ela lê e executa). Iguais byte a byte aos da
última avaliação, reavaliar devolve a mesma resposta.

**Isto não é amostragem.** O `--tocados` PULA defeitos e por isso grita que não é
o portão. Aqui todos seguem respondidos: cada um foi reavaliado agora, ou nada
de que ele depende mudou. O relatório diz quantos de cada.

**E há teto de tempo por mutante.** O S234 foi o primeiro defeito da história do
projeto que **trava** em vez de falhar, e a execução ficou pendurada sem
veredito. Estourar o teto conta como vermelho: um portão que pendura é pior que
um vermelho, porque vermelho tem endereço.

Três coisas que você precisa saber antes de mexer nisso, e todas têm teste em
`test/portao.mjs`:

- **só se guarda `PEGOU`.** Reaproveitar um `PASSOU` seria o portão herdando a
  própria falha;
- **dúvida no fecho resolve para `TUDO`** (`test/fecho.mjs`);
- **um defeito que passa pode ser MUTANTE EQUIVALENTE**, e três deste projeto
  eram. Antes de escrever teste novo, leia se o guarda que você mutou não tem
  outro logo abaixo dando a mesma resposta (**L-038**);
- **toda configuração que julga precisa da própria linha de base verde.** O
  portão valida cada uma na primeira vez que a usa e aborta nomeando a
  quebrada. Sem isso ele dá `PEGOU` falso — e `PEGOU` falso é pior que `PASSOU`
  falso, porque manda seguir em frente **e esconde os defeitos que escapam**.
  Ver `D-015`.

---

## 4. A regra central, e ela custou três versões

> **Um bloco constrói só o que está no escopo dele.**
> Ao fechar qualquer bloco, o jogo continua jogável e a suíte continua verde.

Na v0.6.1 uma correção de sprites virou troca de fonte de arte e o jogo inteiro
saiu errado. Três versões para voltar. Por isso:

**Achou algo fora do escopo? Nunca conserte em silêncio, e nunca ignore.**

| Achou | Vai para | Precisa conter |
|---|---|---|
| Algo **quebrado** hoje | `docs/DEFEITOS.md` | causa, medição, bloco dono, teste que trava |
| Algo **faltando** ou adiado | `docs/LACUNAS.md` | por que não cabe agora, bloco dono, o que a destrava |

**Sempre com bloco dono nomeado.** "Depois" não é bloco. Se nenhum bloco existente
serve, proponha um novo em `docs/POKEARENA_BUILD_BLOCKS_v1.2.md`, no mesmo commit,
com id, método, portões e sabotagem — como os outros.

---

## 5. O ciclo de um bloco

```
1. LER        o bloco + o estado do repositório
2. ESCREVER   os testes, ANTES do código
3. SABOTAR    quebrar de propósito; se a suíte não fica vermelha, o teste é
              decorativo — volte para o passo 2
4. CONSTRUIR  o escopo, e nada além
5. VERIFICAR  portões do bloco + suíte inteira
6. OLHAR      se mexeu em tela: capture e LEIA as telas afetadas
7. FECHAR     um commit, critério de saída marcado
8. RELATAR    o que mudou, o que foi para DEFEITOS/LACUNAS, com as capturas
```

O passo 3 é o que separa este projeto de um com muitos testes verdes e nenhuma
rede. **Um teste que não fica vermelho quando você quebra a coisa não testa
nada.** Já aconteceu várias vezes aqui, e está tudo registrado.

### Os nove portões

`Q1` comportamento · `Q2` sabotagem · `Q3` invariantes · `Q4` regressão
estatística · `Q5` visual · `Q6` segurança · `Q7` crítico cego · `Q8` carga e
concorrência · `Q9` telemetria.

**Q1 e Q2 são obrigatórios em todos os blocos.** Os demais conforme o bloco
declara. Bloco sem superfície nova escreve `Q6: sem superfície nova` —
explicitamente, para que a ausência seja decisão e não esquecimento.

### Q5 tem DUAS metades, e a segunda é OLHAR

O portão automatizado prova que a página **funciona**. Ele não prova que ela
está **legível**. São perguntas diferentes.

No V1.15, três defeitos passaram por **299 testes verdes**: um rótulo
transbordando o cartão, uma coluna empurrada para fora da dobra, e um campo
estreito demais para o próprio placeholder. Nenhum é erro de execução; todos são
erros de leitura.

Então: **todo bloco que mexe em tela fecha olhando as capturas.** `npm run olhar`
gera os PNG em `.telas/`, nas quatro larguras em que o layout muda de forma
(1920, 1440, 1100, 420). Abra. Leia o que está escrito. Não é conferir que abriu.

### O crítico cego (Q7)

Quando a tela muda de **arranjo** e não só de conteúdo, use um crítico que
**não sabe o que foi construído nem o que se espera ouvir**. Ele recebe as
imagens e uma barra **nomeada**.

**Barra vaga é o modo de falha nº 1 desta metodologia** — o crítico inventa a
comparação e aprova tudo. A barra em uso, e que você deve reusar para as notas
serem comparáveis:

> **TESTE DOS 3 SEGUNDOS** — um apostador que nunca viu o produto responde, sem
> instrução e sem rolar: quanto tempo falta, em quem apostar e qual o retorno,
> quanto tem e quanto vai apostar, e o que está acontecendo agora. **Nota por
> pergunta e por largura, com o lugar exato da tela onde o olho responde. Nota
> sem localização não vale.**

Ele funciona. Na terceira passada ele achou que em 420 px a lista de odds ficava
**fora da dobra** — a única ação que o produto pede, invisível no celular — com
a suíte inteira verde e eu tendo olhado as capturas.

---

## 6. As duas metodologias, e quando usar cada uma

- **GL — Gauntlet Loop**: onde existe barra **nomeada, buscável e comparável**.
  Espetáculo, identidade visual, texto, telas.
- **INV — dirigido por invariante**: onde a correção é binária. Motor, seed,
  precificação, ledger, settlement, economia competitiva, contraste WCAG.

**Não force gauntlet no INV**: a barra viraria uma especificação e o loop
degenera em concordância.

---

## 7. Os "nunca", e o preço de cada um

- **Corrigir fora do escopo do bloco**, mesmo que seja "rapidinho".
- **Fechar bloco com a suíte vermelha** — ou com ela **instável**, que é pior:
  vermelho constante é defeito com endereço, instável escolhe quando aparecer.
- **Regravar fixture sem explicar a diferença** na mensagem do commit. É a forma
  mais fácil de esconder uma regressão.
- **Pular a sabotagem** porque "o teste obviamente funciona".
- **Substituir arte, som ou dado por outro de fonte diferente** quando o original
  falhar. **O resgate busca a MESMA coisa em outro endereço, nunca outra coisa.**
- **Versionar material de terceiros.** As folhas de sprite e o `battle-theme.mp3`
  ficam fora; vêm por `npm run assets` para `assets/`, que não entra no git.
  **Arte NOSSA é o contrário: entra, em `arte/`.**
- **Adicionar dependência npm.** Zero é regra. Se você acha que precisa de uma,
  o problema quase sempre é outro.
- **Ligar feature de valor econômico real** sem o checkpoint do §25.1 da Spec.

---

## 8. Como o código está organizado

```
engine/          o MOTOR. Não sabe o que é um Pokémon.
                 Determinístico, testável no Node, sem DOM.
content/         o ContentPack. Todo identificador da franquia mora aqui.
app/modules/     a aplicação, em camadas (ver test/modulos.mjs)
app/index.html   a página: CSS, markup e o boot
test/            as suítes e o portão
tools/           ferramentas (baixador de assets, capturador de telas)
docs/            a Spec, os blocos, os estudos, os defeitos e as lacunas
prototype/       o v0.8 congelado, para paridade
```

### A tabela de camadas é lei

`test/modulos.mjs` declara a camada de cada módulo, e **dependência aponta numa
direção só**. Módulo novo exige decidir onde ele entra no grafo — o teste reprova
se você esquecer.

Camada 0 é dado puro e ligação com o motor; a 4 é aplicação. Um `*-dados.mjs` é
sempre a parte pura e testável no Node; o irmão sem sufixo é quem toca o DOM.
Essa separação existe porque **a parte que costuma estar errada é a pura**.

### O motor é agnóstico ao tema

Nenhum identificador da franquia fora do `content/`. Há um teste que varre
`engine/` procurando por isso. Se você precisa que o motor saiba o que é
"Pikachu", a modelagem está errada.

### A árvore de sementes (Spec §P3)

`raiz → elenco, ambiente, batalha, visual, recompensa`, derivada **por rótulo**
e não por posição — assim um ramo novo não move os que já existem. Se você
precisa de aleatoriedade, ela sai de um ramo nomeado da árvore. **Nunca de
`Math.random()`**; há defeito plantado para isso.

---

## 9. As fixtures, e o que cada uma significa

`test/fixtures/` guarda o comportamento **fotografado**.

- `golden.json` — 20 rodadas byte a byte
- `visual-base.json` — impressão digital 32×32 em RGB de 16 telas (4 telas × 4
  larguras). **Não é PNG**: a captura conteria arte de terceiros, e comparar PNG
  exigiria dependência. Os sprites são bloqueados na captura, então a linha de
  base mede a **nossa** interface. A comparação é **por região** (grade 8×8), e
  o relatório diz **qual** região mudou.
- `margem.json`, `precisao.json`, `informacao.json` — **medição**, não fotografia
  (300 rodadas × 8.000 simulações, etc.). Regrava-se quando a medição muda de
  propósito, e **o número novo vai na mensagem do commit, ao lado do antigo**.

---

## 10. O servidor

**`F1.1` a `F1.9`, `F1.13` e metade do `F1.14` estão construídos.** O ciclo
econômico e a proteção do jogador rodam no servidor, e o serviço **anda
sozinho**: sem cliente nenhum conectado, a rodada abre, fecha, simula e encerra.

```
server/contrato.mjs    a versão da API e os códigos de erro
server/config.mjs      configuração por ambiente; produção sem segredo NÃO SOBE
server/servidor.mjs    node:http, cabeçalhos de segurança, CORS por lista
server/banco.mjs       node:sqlite, dez tabelas, migrações que descem
server/auth.mjs        cadastro, sessão, e a barreira de idade do §28.2
server/carteira.mjs    ledger append-only, idempotente, atômico
server/scheduler.mjs   dono do relógio: gera, precifica, abre, fecha, simula
server/transporte.mjs  SSE — a sala, o estado e a reconexão
server/aposta.mjs      aposta, lock e settlement
server/limites.mjs     os limites do §28.3 e a assimetria de mudança
server/protecao.mjs    pausa, autoexclusão, marketing, reality check e risco
server/rotas.mjs       a superfície HTTP sobre tudo acima
server/laco.mjs        o motor que gira o scheduler e avisa a sala
```

**O laço existe porque durante oito blocos ele não existiu.** Do F1.5 ao F1.13 o
backend teve scheduler autoritativo, sala com retomada, aposta e settlement — e
**nada em produção chamava `tick()`, nada nunca chamou `transmitir()`**. Um
servidor subido pelo `principal.mjs` respondia `{ rodada: null }` para sempre.
Terceira vez que o projeto encontra esta forma de defeito: **testar a peça não
testa o encaixe**. Ele liga com o `ouvir()`, e não com a fábrica — quem abre
porta está servindo jogo, e ligar à mão seria a garantia que depende de
lembrança.

**A porta da sala vive numa MESA SEPARADA da de rotas.** Rota comum devolve
`{ status, corpo }` e nunca vê o `res` — é o `responder()` que aplica os
cabeçalhos de segurança. Com o `res` no contexto de todas, qualquer rota poderia
contorná-lo, e a que contornasse não pareceria diferente no diff. Quem escreve
no socket está numa lista de dois nomes.

**ROTA NOVA NASCE PRIVADA.** A sessão é conferida no despacho e
`ROTAS_PUBLICAS` é a exceção declarada. O desenho oposto — cada rota conferindo
a sua — é aquele em que a rota nova nasce aberta, porque quem a escreveu não
sabia que precisava lembrar.

E o **usuário sai da sessão, nunca do pedido**: nenhuma rota lê `userId` do
corpo ou da query. O corpo é lido campo a campo e nunca espalhado com
`...corpo` — é o que impede um `cooldownMs` no JSON de encurtar o cooldown do
§28.3.

No cliente, três módulos novos:

```
app/modules/api.mjs            a única porta do app para o servidor
app/modules/protecao-tela.mjs  a tela de limites e pausa (§28.7)
app/modules/protecao-texto.mjs os rótulos e a frase da recusa, puros
app/modules/sala.mjs           o fluxo do servidor e a reconexão
```

`api.mjs` **não lança**: falha de rede vira `{ ok:false, indisponivel:true }`.
E resposta sem JSON também — porque sem backend no ar o app é servido por um
servidor de arquivos estático, que responde 404 em HTML a `/api/...`. Tratar
isso como recusa fazia a tela dizer "você precisa entrar na sua conta" para quem
não tinha servidor nenhum do outro lado.

**Duas garantias deste backend são AUSÊNCIAS, e é de propósito.** O cooldown de
24 h para aumentar limite não pode ser encurtado, e a autoexclusão não pode ser
encerrada por ninguém. Nos dois casos a defesa não é um `if` que recusa: é não
existir o caminho. `definirLimite` não tem por onde receber um prazo, e
`protecao.mjs` não exporta nada que encerre uma pausa — há um teste que cobra
exatamente essa ausência, porque o painel administrativo do F1.11 vai procurar
uma função dessas e usar de boa-fé.

**Zero dependências vale aqui também.** `node:sqlite` é embutido desde o Node
22.5; `node:crypto` faz senha (scrypt), sessão (HMAC) e commit. Nenhum
`node_modules`.

**SSE e não WebSocket.** O Node não traz servidor WebSocket e o tráfego é de uma
via. A escolha está declarada em `server/transporte.mjs`, com o que se perde.

**Mas o cliente lê o SSE com `fetch`, e não com `EventSource`** — e essa é uma
premissa do F1.6 que mudou. `EventSource` **não aceita cabeçalho nenhum**, e a
sessão viaja em `authorization: Bearer`; com ele, o token teria que ir na URL, e
token em query string entra em log de acesso, em `Referer` e no histórico. O
formato na rede continua SSE e o servidor não muda uma linha. O que se perde é a
reconexão automática — que teria que ser escrita de qualquer forma, porque o
§5.9 pede uma TELA de reconexão e o `EventSource` reconecta por baixo sem contar
para ninguém.

**Fechar o servidor fecha a sala primeiro.** `servidor.close()` espera as
conexões abertas terminarem, e um SSE por definição não termina: sem despejar a
sala, um deploy nunca conclui enquanto houver uma aba aberta.

```bash
npm run servidor     # sobe o serviço
```

O contrato está em **`docs/API.md`** — leia antes de escrever cliente.

### O que vem a seguir

**F1.15 — a raiz da rodada sai de 32 bits.** É o **D-018**, e é a coisa mais
séria registrada neste projeto: **com a janela de aposta aberta, dá para saber o
campeão**. Só com o que a rota pública devolve.

A cadeia é curta. A raiz tem 32 bits; `GET /api/rodada` publica os doze
lutadores enquanto a janela está aberta — tem que publicar, é a rodada —, e os
doze saem de `sortearPool(derivar(raiz,'elenco'))`. Doze de 76, ordenados, são
~74 bits de informação sobre um segredo de 32: a pool publicada não estreita o
espaço da raiz, ela o **determina**.

```
pool publicada    99,134,42,94,128,136,139,53,57,114,126,91
raiz recuperada   12.345.678 em 10,2 s
campeão previsto  dex 94, com a janela ABERTA, odd 1,94
```

Medido: 1,21 M raízes/s num núcleo de JS — o espaço inteiro em ~59 min num
núcleo, ~7 em oito, segundos numa GPU. E o custo é de UMA vez, porque o mapa
`sementeElenco → doze dex` não depende da rodada.

O commit-reveal está implementado **corretamente** e é **decorativo**: ele prova
que a casa não trocou o resultado depois, e a ameaça é o apostador saber antes.
Não é bug de implementação — é o tamanho do segredo.

O bloco é **M**, e não G: o `golden.json` fixa *sementes de batalha* e não
raízes, então os 20 goldens byte a byte não se movem; as fixtures de medição são
agregados. O cuidado que sobra tem número —
`derivarIndice(raiz,'simulacao',i)` roda 154.000 vezes por rodada, então o hash
caro roda uma vez por ramo e a expansão por índice continua barata.

Se você for mexer em semente: **`misturar()` é bijetiva**. Publicar qualquer
semente de ramo devolve a raiz em O(1), sem busca nenhuma (confirmado em
200.000/200.000 casos). A ideia de publicar `sementeElenco` para o cliente
montar a pool sem esperar o reveal já foi tentada e morreu na medição.

**F1.14 — o laço de jogo contra o servidor. Metade construída, metade parada de
propósito.**

A primeira metade está no ar e é inerte: `server/laco.mjs` gira o scheduler e
anuncia à sala, `GET /api/sala` é a porta, `app/modules/sala.mjs` lê o fluxo. A
segunda metade — o cliente reconstruindo a rodada a partir de `revelado.raiz` e
a aposta indo por `/api/aposta` — **espera o F1.15**, porque construir sobre uma
raiz de 32 bits que vai virar 128 é retrabalho garantido.

Há um teste que **afirma a ausência de propósito** (molde do `D-001`): quem
ligar `hidratar()` no boot encontra `o app ainda NÃO liga o modo servidor`
vermelho. O vermelho é o lembrete de que a rodada e a aposta precisam ir junto —
ligar só a carteira daria duas fontes para o mesmo dinheiro.

**Depois:** **F1.10** (perfil e desafios no servidor), **F1.11** (admin e painel
econômico) e **F1.12** (ContentPack original) fecham a Fase 1. **T5** é trilha de
ferramenta: pré-voo que reprova defeito plantado inútil em segundos, e o
`npm run rapido` derivando a lista em vez de mantê-la.

O porte da versão anterior está fechado (V1.13 a V1.20, mais T1–T4 de
ferramenta).

**Uma armadilha que já pegou três defeitos plantados neste projeto:** *mutante
equivalente*. Você planta a mutação, o comportamento não muda, e o teste fica
verde para sempre. Os três tinham a mesma forma — **guarda redundante sobre
guarda que já basta** — e só apareceram depois de o portão inteiro rodar. Está
em **L-038**. Defesa em profundidade é boa e fica; o que muda é onde se planta o
defeito.

**Aberto agora:**

| item | o que é | dono |
|---|---|---|
| **D-018** | com a janela aberta dá para saber o campeão | **F1.15** ⛔ bloqueia a tag da v0.9 |
| **L-036** | o cliente ainda guarda a própria carteira (metade feita) | **F1.14** |
| **L-038** | três mutantes equivalentes, todos com a mesma forma | **T5** |
| **D-017** | `npm run rapido` cobre 21 das 35 suítes sem navegador | **T5** |
| **L-031** | os 9 itens da terceira passada do crítico cego (1920 estica em vez de agrupar) | **V1.21** |
| **L-034** | `recovery_deposit` e `odd_hour` não têm de onde medir | **§25.1** e **F1.11** |
| **L-024** | o bucket `pendente` existe e nada o preenche | **F1.4** |
| **L-011** | os limiares de risco são chute educado até haver coorte | **F1.11** |
| **L-029** | a tela principal reprova no teste dos 3 segundos | trilha **R** |
| **L-001..004, L-021** | balanceamento do elenco: 14 golpes órfãos, amplitude de 16,6× | **F1.12** |
| **L-012** | consulta de enquadramento regulatório | ⏳ não se resolve com software |
| **L-010** | política de publicidade e afiliados | ⏳ sem dono |

**As três coisas que travam o projeto e não são código:** a consulta regulatória
(§0.5.1), a arte do ContentPack original (§0.3.1) e a política de publicidade.

---

## 11. Se você só ler cinco linhas

1. **Um bloco constrói só o que está no escopo dele.**
2. **Escreva o teste antes, e quebre o código de propósito para ver o teste ficar
   vermelho.** Se não ficar, o teste é decorativo.
3. **Achou algo fora do escopo? Registre em DEFEITOS ou LACUNAS com bloco dono.**
   Nunca conserte em silêncio, nunca ignore.
4. **Mexeu em tela? Olhe as capturas.** Verde não é legível.
5. **Meça antes de mexer.** É o método do projeto e já evitou várias decisões
   erradas — inclusive uma otimização minha que a medição reprovou no mesmo dia.

Bem-vindo.
