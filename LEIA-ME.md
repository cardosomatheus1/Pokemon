# PokéArena — leia-me

Battle royale automático de apostas com **moeda simulada**. Doze lutadores
sorteados de um elenco, odds calculadas por Monte Carlo, uma janela de 30
segundos para apostar, e uma batalha determinística que o jogador assiste até o
fim. Em volta disso, um metagame de treinador em construção.

Nada aqui envolve dinheiro real. A moeda é **PC**, criada e destruída pelo
próprio jogo, e o §25.1 da Spec exige um checkpoint formal antes de qualquer
feature com valor econômico real — checkpoint que **não foi feito**.

---

## Rodar

Precisa só de **Node.js 22 ou mais novo** (o projeto usa `node:sqlite`, que
chegou no 22). Não há nada para instalar: **zero dependências**, de propósito.

```bash
node --version      # precisa ser >= 22
```

### Jogar

```bash
npm run jogar
```

E abrir <http://localhost:8792/app/index.html>.

**Duplo clique no `app/index.html` não funciona** — a tela fica preta e não diz
por quê. O jogo é feito de módulos ES, e `file://` bloqueia `import`. O
`npm run jogar` existe exatamente para isso: serve os arquivos a partir da raiz
do repositório, que é onde `/assets/` e `/app/` precisam estar para se enxergar.

Nesse modo o jogo roda **inteiro no navegador**: carteira no `localStorage`,
rodadas geradas na própria máquina. É o modo de quem só quer ver o jogo.

### Rodar o servidor

```bash
npm run servidor
```

Sobe o backend em `http://localhost:8080` (`PORTA=` muda) (autenticação, carteira com ledger,
scheduler de rodadas, apostas, settlement, limites de proteção, painel
administrativo). Em desenvolvimento o segredo de sessão é **sorteado a cada
processo** e o servidor avisa em voz alta — sessão morre quando o processo
reinicia, e isso é de propósito. Em produção, segredo ausente é erro de partida.

Quando o cliente fala com o servidor, **o servidor manda**: a carteira local sai
de cena inteira, e a projeção que a tela mostra é do servidor.

### Rodar os testes

```bash
npm run rapido     # 666 testes sem navegador — 7 s
npm test           # a suíte inteira (pula o portão visual se não houver Chromium)
npm run sabotagem  # o portão Q2 — planta 292 defeitos e exige que a suíte pegue os 292
npm run portoes    # a suíte DUAS vezes, com navegador, mais a sabotagem
```

O portão visual e os testes de integração precisam de `playwright-core`,
instalado **fora** do projeto para manter a dependência zero — ver
`tools/README.md`. `npm test` pula esses com aviso; `npm run portoes` exige,
porque portão que pula em silêncio é decorativo.

---

## Onde está o quê

```
app/          o cliente — a tela, o jogo, os módulos ES
engine/       o motor: combate, odds, seed, hash. Agnóstico ao tema.
content/      os ContentPacks. `escolhido.mjs` decide qual está no ar.
server/       o backend: auth, carteira, rodadas, apostas, proteção, admin
test/         a suíte e o portão de sabotagem
tools/        apoio — NADA aqui é portão de qualidade
docs/         a Spec e os documentos de projeto. Comece pelo índice.
assets/       arte de terceiros, para o build privado (ver abaixo)
arte/         arte NOSSA
prototype/    o protótipo v0.8 congelado, e o v1.0 ao lado
```

**O motor é agnóstico ao tema.** Nenhum identificador da franquia aparece fora
do ContentPack, e há um teste que reprova se aparecer. Trocar o elenco inteiro é
trocar um arquivo em `content/`.

### Os documentos, em ordem

| arquivo | o que responde |
|---|---|
| `docs/POKEARENA_DOCUMENT_INDEX_v1.4.md` | o índice — **comece por ele** |
| `docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md` | o **quê** — fonte de verdade |
| `docs/POKEARENA_BUILD_BLOCKS_v1.2.md` | o **como**, e em que ordem |
| `docs/POKEARENA_DESIGN_DEPTH_v1.1.md` | por que o metagame é assim |
| `docs/POKEARENA_ECONOMY_STUDY_v1.2.md` | a economia do jogo |
| `docs/POKEARENA_UNIT_ECONOMICS_STUDY_v1.2.md` | a economia da empresa |
| `docs/DEFEITOS.md` | defeitos achados e **não** corrigidos, com bloco dono |
| `docs/LACUNAS.md` | trabalho identificado e adiado, com bloco dono |

Conflito entre documentos: **a Spec vence**. Se a Spec estiver errada, ela é
corrigida no mesmo commit — nunca contornada no código.

E `CLAUDE.md`, na raiz, governa **como** se trabalha aqui: o ciclo de um bloco,
os nove portões, e a regra que custou três versões ao projeto quando faltava.

---

## Estado

**Fase 1 fechada.** Blocos F1.1 a F1.17 construídos, medidos no mesmo estado da
árvore:

```
npm test              723/723 VERDE   (com navegador)
npm run sabotagem     292/292 detectados, 41 min
```

O que a Fase 1 trouxe: backend com contrato de API, banco e migrações,
autenticação real, carteira com ledger de dupla entrada, scheduler autoritativo
de rodadas, transporte em tempo real com reconexão, aposta com lock e
settlement, limites de proteção do jogador, pausa e autoexclusão, progressão e
desafios, painel administrativo com dois fatores, e o laço de jogo do cliente
rodando **contra o servidor** em vez de contra si mesmo.

### O que falta, e não é código

Três coisas travam o projeto e nenhuma delas se resolve escrevendo software.
Estão registradas com dono nomeado, e a suíte **recusa marcar como cumprido** o
que não foi cumprido:

- **L-042 — a arte do ContentPack original.** São 76 criaturas originais já
  escritas em `content/original_v1.mjs`, sem desenho. Enquanto não existirem, o
  jogo roda com o pack de desenvolvimento.
- **L-012 — consulta de enquadramento regulatório** (Spec §0.5.1). Bloqueia a
  tag v0.9.
- **L-010 — política de publicidade e afiliados.** Sem dono em nenhum documento.

### Sobre a arte em `assets/`

O repositório versiona arte de terceiros porque **este build é privado** —
jogado por amigos, sem aquisição paga e sem monetização. Foi decisão explícita
do dono do projeto, e está registrada no `CLAUDE.md`.

O que a regra original protegia continua valendo, e só mudou de lugar:
**publicar** um produto com stake econômico sobre assets de terceiros é o que o
§0.3.1 proíbe, e isso não mudou. A distância entre os dois estados é uma linha —
`ARTE_EMPRESTADA_DE`, em `content/escolhido.mjs` — e `test/saida-v09.mjs` recusa
a tag enquanto ela estiver preenchida sem a L-042 registrar o empréstimo.

**Arte nossa é o contrário: entra, em `arte/`.** Aplicar a regra ao avesso custou
quase três imagens no porte da v1.0; a lição está em `arte/README.md`.

---

## Duas coisas que este projeto leva a sério

**Proteção do jogador é requisito, não conformidade** (Spec cap. 28). As duas
garantias centrais são **ausências**: o cooldown de 24 h para aumentar limite e a
irreversibilidade da autoexclusão não são conferências que recusam — são
caminhos que não existem. Não há por onde encerrar uma pausa. Há teste que cobra
a ausência da função, porque função exportada é convite.

**Um teste que não fica vermelho quando o código quebra é decorativo.** É para
isso que serve o portão de sabotagem: ele planta 292 defeitos, um de cada vez, e
exige que a suíte pegue os 292. Já pegou testes que comparavam uma constante
consigo mesma, e uma suíte inteira verde com o cooldown do §28.3 valendo 24
minutos.
