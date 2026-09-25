# PokéArena

Battle royale automático de apostas com **moeda simulada**. Doze lutadores
sorteados, chances calculadas simulando 154 mil batalhas, trinta segundos para
apostar, e uma batalha determinística que o jogador assiste.

**Nada aqui envolve dinheiro real.**

---

## Rodar

Você precisa de **Node 22 ou mais novo** ([nodejs.org](https://nodejs.org)) e um
navegador. Mais nada.

```bash
node tools/servir.mjs
```

Abra o endereço que ele imprimir. Para parar: `Ctrl+C`.

> **Dois cliques no `app/index.html` não funcionam.** A tela abre, mostra
> "simulando batalhas" e trava ali. Não é defeito: todo navegador **bloqueia**
> módulos JavaScript carregados por `file://`, e não há contorno do lado da
> página. O servidor acima existe exatamente para isso — ele não instala nada e
> não abre porta para fora da máquina.

Não existe `npm install`: o projeto **não tem dependência nenhuma**. É regra, não
economia.

---

## Por onde começar

| arquivo | para quem |
|---|---|
| [`docs/PATCHNOTES.pdf`](docs/PATCHNOTES.pdf) | quem quer **entender o jogo**, sem jargão |
| [`docs/PASSAGEM.md`](docs/PASSAGEM.md) | quem vai **pegar o projeto**: as armadilhas e as decisões já tomadas |
| [`CLAUDE.md`](CLAUDE.md) | **como se trabalha aqui** — o método, e ele não é opcional |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | o que está feito, o que falta, em que ordem |

E leia os comentários do código. Este projeto comenta o **porquê**, e quase todo
comentário longo existe porque alguém já errou ali.

---

## Estado

```
suíte        2274 testes, verde — 1 min 40 s com navegador (medido 25/09/2026;
             era 1116 quando esta linha foi escrita)
sabotagem    1080 defeitos plantados; o Q2 do bloco fecha em minutos (T14)
o estado     docs/RETOMAR.md · a fila: docs/ROADMAP.md
```

```bash
npm test              a suíte (pula o portão visual sem navegador)
npm run rapido        só o que não precisa de navegador, ~7 s
npm run sabotagem     o portão Q2 — obrigatório antes de fechar um bloco
```

O portão visual e o Q2 precisam do `playwright-core`, que mora **fora** do
repositório de propósito — ver [`tools/README.md`](tools/README.md).

---

## O mapa das pastas

```
app/        o jogo no navegador
engine/     o motor: batalha, preço, semente, calibração.
            Não sabe o que é um Pokémon — o tema mora em content/
server/     contas, carteira, rodadas, Liga de Previsão
content/    o ContentPack. Trocar de tema é trocar este arquivo
arte/       arte nossa
assets/     cópia local dos sprites, para o jogo abrir sem rede
test/       a suíte inteira e os defeitos plantados do portão Q2
tools/      servidor local, empacotador, instrumentos de prévia
docs/       a Spec, o roadmap, os defeitos e as lacunas registradas
```

---

## Uma coisa que precisa ficar dita

Este repositório é **privado**, e a razão é concreta: `assets/` contém arte de
**terceiros** — sprites e ilustrações que não são nossas. Isso foi permitido por
decisão do dono do projeto porque o build é privado, jogado entre amigos, sem
aquisição paga e sem monetização.

**Publicar** um produto com stake econômico sobre esses assets é o que o §0.3.1
da Spec proíbe. A distância entre os dois estados é uma linha —
`ARTE_EMPRESTADA_DE` em `content/escolhido.mjs` — e o `test/saida-v09.mjs`
recusa a tag de saída enquanto ela estiver preenchida.

Se este repositório virar público algum dia, essa conversa precisa acontecer
antes.
