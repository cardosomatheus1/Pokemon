# Protótipo base v0.8

Estado congelado do protótipo original, arquivo único. É a entrada do bloco
F0.1 do `docs/POKEARENA_BUILD_BLOCKS_v1.1.md` e a fonte da qual `engine/` é
extraído.

**Não editar diretamente.** Mudanças de comportamento passam pelos blocos.

## Ausência deliberada

`battle-theme.mp3` (7,4 MB) **não** foi commitado. É uma faixa da franquia,
registrada como *placeholder* a trocar antes de qualquer publicação. Manter
material de terceiros versionado no repositório contradiz o §0.3.1 da Spec, que
fixa prazo para o ContentPack original. O jogo roda sem o arquivo — a trilha
simplesmente não toca.

## Inconsistências conhecidas, deliberadamente não corrigidas

Este diretório é um instantâneo congelado. Erros de documentação da v0.8 ficam
como estão, porque corrigi-los apagaria o registro do que de fato foi entregue.

- `LEIA-ME.md` linha 930 diz "51 golpes"; `GOLPES.md` diz 66. O número real de
  golpes definidos é **66**, dos quais **52 são alcançáveis** — ver lacuna L-001.
- `GOLPES.md` promete 66 golpes em jogo sem mencionar que 14 nunca são
  atribuídos a nenhum lutador do elenco.

Os dois pontos estão registrados em `docs/LACUNAS.md` com dono F1.12.
