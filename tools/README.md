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
