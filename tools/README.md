# tools

Ferramentas de apoio. **Nada aqui é portão de qualidade** — portões vivem em
`test/` e rodam com `npm run portoes`.

## `verificar-visual.mjs`

Abre `app/index.html` num Chromium de verdade e confere que o jogo roda: boot
completo, elenco na arena, odds, batalha correndo, sprites carregando.

Precisa de duas coisas **fora do repositório**, para manter a dependência zero:

```bash
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright-core
python3 -m http.server 8791          # na raiz do repositório
NODE_USE_ENV_PROXY=1 node tools/verificar-visual.mjs
```

Ele intercepta as requisições de sprite e as serve pelo Node. Isso existe porque
em ambiente com proxy de egresso o Chromium pode não atravessar enquanto o Node
atravessa — e **o app não é alterado**: continua pedindo exatamente as URLs que
pediria em produção. A dependência de CDN em si é a lacuna L-017.

Q5 (visual) vira portão de verdade no F0.3, com captura de referência nos dois
temas e em três larguras.


## Arte local (F0.12)

```bash
npm run assets      # baixa 666 arquivos para assets/, fora do versionamento
```

O jogo resolve arte na ordem `local → origem → espelho`. Sem a cópia local ele
continua funcionando pela rede; com ela, abre com egresso fechado — e é isso que
o portão `sem-rede` verifica, abortando toda requisição externa em vez de
servi-la pelo Node.

`npm run portoes` **exige** a cópia local (`EXIGE_LOCAL=1`), pelo mesmo motivo
que já exige o navegador: portão que pula em silêncio é decorativo. `npm test`
avisa e segue.

**A arte não é versionada.** É material de terceiros — mesma razão pela qual o
`battle-theme.mp3` ficou de fora. O script baixa; o repositório não guarda. E o
resgate busca a MESMA coisa em outro endereço, nunca outra coisa: é a lição da
v0.6.1, e há teste que a afirma.

## `mapa-tiled.mjs` (ST-10.23)

O mapa da jornada é um DESENHO em texto (`content/mapa_kanto_v1.mjs`). Para
repintar com o mouse no [Tiled](https://www.mapeditor.org/) (livre):

```bash
node tools/mapa-tiled.mjs exportar   # → mapa-tiled/kanto-deitado.tmj, kanto-emPe.tmj, kanto-tiles.png
# abra o .tmj no Tiled, pinte as camadas chao / altura / obra, mova o rio, salve
node tools/mapa-tiled.mjs importar   # reescreve content/mapa_kanto_v1.mjs
npm test                             # o desenho novo passa pelas mesmas regras
```

O tileset é de cores (uma casa por chão, altura e obra) — serve para o arranjo;
a arte que o jogo pinta é a de `arte/chao/`. A ida e a volta são sem perda, e o
teste recusa `.tmj` velho: depois de mexer no texto, rode `exportar`.


### Validação dirigida AT6/GQ

`node tools/testar-arena.mjs --finalizacao` executa o recorte versionado
em arena-suites-finais.mjs. `progressao-offline` deve rodar isoladamente
por D-AT6-05-04. `node tools/sabotar-arena.mjs --grupo=finalizacao` executa
23 mutantes dirigidos; não é a sabotagem legada integral. Para o fluxo real:
`PW_MODULO=/caminho/playwright/index.mjs PW_CHROME=/caminho/chromium node tools/validar-arena-navegador.mjs`.
Nenhuma dependência de QA é instalada no produto. Relatório 13 e JSONs
em docs/arena-treinadores contêm critérios, resultados e limites.
