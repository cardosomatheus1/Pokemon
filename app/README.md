# app — o jogo

Versão viva do PokéArena. É este arquivo que se abre para jogar.

```bash
npm run serve     # http://localhost:8792 -> abrir /app/index.html
```

## O que mudou em relação ao protótipo

`prototype/index.html` continua congelado como referência de onde os goldens
vieram. `app/index.html` nasceu dele no bloco F0.2, com uma diferença:

> **o motor de combate não mora mais aqui.** Ele é importado de
> `engine/engine.mjs`, que é a fonte única.

O script virou `type="module"` por causa do import. Isso tem um efeito colateral
registrado como lacuna L-015: os quatro botões de fechar modal usam `onclick`
embutido no HTML, que não enxerga escopo de módulo, então o app expõe
`window.closeModal`. É feio e some no F0.3.

## O que ainda está aqui e não deveria

Tudo o que não é motor: interface, animação, carteira, perfil, killfeed, áudio,
economia. Separar isso é o bloco F0.3 — nenhum módulo deve passar de ~600 linhas
ao fim dele.

## Uma cópia divergente do motor aqui é o modo de falha desta troca

`test/fonte-unica.mjs` reprova o build se qualquer símbolo do motor for
redeclarado neste arquivo, ou se o import sumir. As sabotagens S9 e S10 provam
que o teste funciona.
