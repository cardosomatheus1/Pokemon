# Como rodar o PokéArena

**Para quem acabou de receber este repositório e nunca o viu.**
Do zero até o jogo aberto no navegador: **um comando.**

---

## 1. O que você precisa antes

```text
Node.js 20 ou mais novo        node --version
git                            só se for clonar em vez de descompactar
```

**E nada mais.** O repositório **não tem dependências** — não há `node_modules`,
não há `npm install`. Isso é decisão de método, não economia: dependência que
não existe não quebra, não desatualiza e não precisa de auditoria.

---

## 2. A arte JÁ VEM JUNTO

São **2 121 arquivos** em `assets/` — sprites, folhas de animação, efeitos,
fontes e avatares. Você não precisa fazer nada.

Se algum dia faltar alguma coisa (arquivo corrompido, cópia incompleta):

```bash
npm run assets
```

Ele baixa o que faltar e pula o que já está lá.

**Por que ela vem junto:** é arte de terceiros (PMDCollab, PokeAPI), e o build é
privado — jogado por amigos, sem venda e sem monetização. Essa é a condição que
permite usá-la, e está escrita no `CLAUDE.md`, na seção *Nunca*.

> **Sem a arte, cinco testes reprovam** — medido. A suíte não finge que está
> tudo bem: ela diz que a folha de ícones não está em disco, e que o painel de
> encontros desenharia 151 quadrados vazios.

> Se o comando falhar por rede, rode de novo. Ele tem espelho para cada arquivo
> e busca **sempre o mesmo arquivo em outro endereço, nunca outro arquivo** —
> essa regra custou três versões ao projeto quando foi quebrada.

---

## 3. Abrir o jogo

```bash
node tools/servir.mjs --porta 8099
```

E abra **http://localhost:8099/app/index.html**.

Pronto. Crie um treinador, escolha um inicial, e a aba **ROTAS** é o modo que
está em construção agora.

---

## 4. Rodar os testes

```bash
npm run rapido      # 96 suítes sem navegador — ~1 min 25 s
npm test            # a suíte inteira (pula o portão visual sem navegador)
npm run sabotagem   # o Q2: planta 987 defeitos e confere que a suíte pega
npm run portoes     # suíte DUAS vezes + sabotagem. É o que fecha um bloco
```

### O portão visual precisa de um navegador, e ele mora FORA do projeto

`npm test` pula o Q5 com aviso se não achar. Para tê-lo:

```bash
mkdir -p /tmp/pw && cd /tmp/pw
npm i playwright-core
npx playwright install chromium
```

E, se o caminho for outro, aponte:

```bash
export PW_MODULO=/caminho/playwright-core/index.mjs
export PW_CHROME=/caminho/chrome
```

Os detalhes estão em `tools/README.md`.

> **Ele fica fora do projeto de propósito.** O repositório tem zero
> dependências, e o portão que precisa de navegador não pode ser a exceção que
> abre a porta para as outras.

### Uma armadilha do primeiro clone

O arquivo `test/fixtures/visual-base-local.json` está no `.gitignore` — ele é a
linha de base visual **desta máquina**. Num clone novo ele não existe, e a suíte
visual passa **sem comparar nada**.

```bash
npm run gerar:visual    # grava a linha de base LOCAL — 49 s
```

Verde sem esse arquivo pode querer dizer *"não olhei"*. É o **D-093**, e está
registrado em `docs/DEFEITOS.md`.

---

## 5. Antes de escrever uma linha de código

**Leia `CLAUDE.md` inteiro.** Ele governa como se trabalha aqui, e o método é a
parte que não é óbvia — nove portões, testes antes do código, um bloco por
commit, e um conjunto de regras que o dono do projeto fixou e que não se
renegociam.

Depois:

```text
docs/RETOMAR.md                  o estado exato — onde paramos (o ÚNICO estado)
docs/ROADMAP.md                  a fila — o que falta, em que ordem (a ÚNICA fila)
docs/PLANO_DE_IMPLEMENTACAO.md   as fichas de cada entrega: escopo, aceite, sabotagem
docs/COMECE_AQUI.md              o produto e o método, com calma
```

Se você for retomar com o Claude Code, a frase é:

```
leia docs/RETOMAR.md e continue de onde paramos
```

(`CONTINUAR.md` e `TAREFA_1.27f_CARTAO.md`, que esta seção apontava, foram para
`docs/historico/` em 25/09/2026 — ver o `LEIA-ME` de lá.)

---

## 6. Os atalhos que valem saber

```bash
node tools/olhar-idle.mjs    # fotografa a aba ROTAS e a tela da RUN
node tools/olhar-telas.mjs   # fotografa a Arena
npm run jogar                # abre o jogo com estado de teste plantado
npm run test:gerar           # regrava fixtures E linha de base (~5 min)
```

As capturas saem em `tools/previas/`. Elas não são enfeite: **a segunda metade
do portão Q5 é olhar**, e três defeitos já passaram por 299 testes verdes neste
projeto — todos de leitura, nenhum de execução.
