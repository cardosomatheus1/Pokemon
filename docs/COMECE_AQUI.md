# Comece aqui

Você acabou de entrar num projeto que tem método próprio, e o método é a parte
que não é óbvia. Este documento é a hora e meia que te economiza uma semana.

Leia nesta ordem: **este arquivo → `CLAUDE.md` → `docs/POKEARENA_DOCUMENT_INDEX_v1.4.md`.**

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
npm run rapido             # 21 suítes, sem navegador ......... 7 s
node test/run.mjs --so=carteira,exposicao   # só o que interessa  0,8 s
npm test                   # a suíte inteira ................. ~2,5 min
npm run gerar:visual       # regrava só a linha de base visual . 49 s
npm run olhar              # captura as 11 telas em PNG ....... ~2 min
npm run sabotagem:tocados  # Q2 só dos arquivos que você mexeu
npm run portoes            # O PORTÃO DE FECHAMENTO .......... ~25 min
```

**`--so` acelera a CONSTRUÇÃO e não fecha bloco nenhum.** `npm run portoes`
recusa a bandeira de propósito. Portão que parece inteiro sem ser é pior que
portão ausente.

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

**`F1.1` a `F1.7` estão construídos.** O ciclo econômico roda no servidor:

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
```

**Zero dependências vale aqui também.** `node:sqlite` é embutido desde o Node
22.5; `node:crypto` faz senha (scrypt), sessão (HMAC) e commit. Nenhum
`node_modules`.

**SSE e não WebSocket.** O Node não traz servidor WebSocket, o tráfego é de uma
via, e SSE traz reconexão automática e `Last-Event-ID` de graça. A escolha está
declarada em `server/transporte.mjs`, com o que se perde.

```bash
npm run servidor     # sobe o serviço
```

O contrato está em **`docs/API.md`** — leia antes de escrever cliente.

### O que vem a seguir

**F1.8** (limites do jogador) e **F1.9** (pausa e autoexclusão) — as três tabelas
do capítulo 28 já existem desde o F1.2, vazias, esperando. **F1.10** destrava o
**D-007**, e o D-007 destrava os baús.

O porte da versão anterior está fechado (V1.13 a V1.20, mais T1–T3 de
ferramenta).

**Aberto agora:**

| item | o que é | dono |
|---|---|---|
| **D-007** | desafios diários emitem 6,5× o orçamento agregado do Estudo Econômico | **F1.10** |
| **L-032** | a idempotência tem duas redes e a suíte só alcança uma (`node:sqlite` é síncrono) | **F1.6** |
| **L-031** | os 9 itens da terceira passada do crítico cego (1920 estica em vez de agrupar) | **V1.21** |
| **L-026** | o baú não tem contra o que ser calibrado enquanto D-007 durar | **V1.19** |
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
