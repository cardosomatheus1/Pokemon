# Os outfits do treinador

**Solte os PNGs aqui.** É só isso — o resto é comigo.

## O que gerar

```text
TRÊS VISTAS, lado a lado:   frente · perfil · costas
FUNDO                        magenta liso (#ff00ff). Branco também serve.
TAMANHO                      LIVRE — a bancada descobre a grade nativa sozinha
PÉS                          na base do desenho, as três na mesma linha
PALETA                       poucas cores (a bancada avisa acima de 40)
DIREITA                      não se desenha: é o perfil esquerdo espelhado
```

**Um traje = um arquivo.** O nome do arquivo vira o id do outfit — use
minúsculas sem espaço: `sucateiro.png`, `capuz-neon.png`.

## O que sai disso

A bancada — `tools/previas/outfits-bancada.html` — devolve a folha de **nove
quadros** no formato do cartucho:

```text
0 frente · 1 costas · 2 perfil
3-4 passo de frente · 5-6 passo de costas · 7-8 passo de perfil
```

Os seis passos são **derivados por código**, e você não precisa desenhá-los. A
única exceção é a folha 3×3 (linha = direção, coluna = quadro): nela os passos
são desenhados, e desenhado ganha de derivado sempre.

## O que a bancada NÃO conserta

```text
antisserrilhado forte na borda     deixa franja; suba a tolerância ou clique na cor
pés em alturas diferentes          a sombra sai errada em uma das vistas
mais de 40 cores                   sinal de que a grade nativa não foi achada
```

## Por que a arte própria importa

Os trajes que estão nas prévias vêm do `pokeemerald` — material de terceiros.
Arte de treinador própria resolve metade do **§0.3.1** de graça: é arte que pode
ser publicada.

Ver a **L-067** em `docs/LACUNAS.md` para a decisão inteira, e a **L-070** para a
divisão entre o que é do jogador e o que é NPC.
