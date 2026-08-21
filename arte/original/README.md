# arte/original — os desenhos do ContentPack que a V1 lança

**Esta pasta é versionada.** É a regra do projeto e ela é o CONTRÁRIO da dos
assets de terceiros: arte de terceiros fica fora do git e vem por
`npm run assets`; **arte nossa entra**. Aplicar a regra ao contrário custou quase
três imagens no porte da v1.0 — ver `arte/README.md`.

## O que falta

76 desenhos, um por criatura de `content/original_v1.mjs`. Enquanto não chegam,
cada criatura aparece com a **silhueta procedural** de `silhuetaDe()`: uma forma
derivada do próprio dex, determinística, distinta entre espécies e obviamente
provisória para quem olha.

## Como um desenho entra

Dois passos, no **mesmo commit**:

1. o arquivo vai para `arte/original/<slug>.png`, onde `<slug>` é o `n` da
   espécie em minúsculas;
2. o slug entra em `COM_ARTE`, em `content/original_v1.mjs`.

`test/pack-original.mjs` cobra que todo slug listado tenha o arquivo — um nome
na lista sem PNG correspondente vira imagem quebrada na tela, que é pior que a
silhueta assumida.

**Por que uma lista e não um `onerror` no `<img>`:** um `onerror` transforma
"ainda não desenhamos" em "falhou o carregamento", e as duas coisas pedem
respostas opostas. Além disso o navegador só descobriria depois de pedir — 76
requisições que sabemos que vão falhar.

## O que NÃO fazer

Nunca cair para a arte do pack de desenvolvimento quando um desenho faltar. **O
resgate busca a mesma coisa em outro endereço, nunca outra coisa** — v0.6.1. O
defeito plantado `S279` existe para manter isso vermelho.
