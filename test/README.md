# Arnês — blocos F0.1 a F0.4

Portões cobertos: **Q1** (comportamento), **Q2** (sabotagem), **Q3** (invariantes),
**Q4** (regressão estatística), **Q5** (visual) e **Q6** (validação de pack como
superfície). Zero dependências no repositório — o Q5 usa um `playwright-core`
instalado FORA da árvore, ver abaixo.

```bash
npm run portoes         # a suíte e a sabotagem
npm test                # só a suíte
npm run test:sem-golden # a suíte sem os golden tests — ver "limitação" abaixo
npm run sabotagem       # só o portão Q2
npm run test:gerar      # regrava fixtures — só quando a mudança é intencional
npm run snapshot        # regera o instantâneo do protótipo para a paridade
```

## O que cada arquivo faz

| Arquivo | Portão | Papel |
|---|---|---|
| `../tools/snapshot-prototipo.mjs` | — | extrai o motor do protótipo congelado por nome de declaração, com casamento de chaves. Serve só à paridade; o motor de trabalho é `engine/engine.mjs`. Saiu de `engine/` no F0.4 para não precisar de exceção no teste de vazamento |
| `golden.mjs` | Q1 | 20 seeds fixas, fluxo de eventos byte a byte |
| `invariantes.mjs` | Q3 | 8 propriedades sobre 2.000 rodadas aleatorizadas, mais duas asserções de não-regressão do D-001 |
| `estatistica.mjs` | Q4 | 10.000 rodadas; duração, abates, tempestade, crítico, erro, amplitude do elenco |
| `fonte-unica.mjs` | Q1/Q3 | o app não redeclara nada do motor, importa do módulo, e o motor não conhece o DOM |
| `paridade.mjs` | Q4 | motor vivo contra o do protótipo: toda divergência precisa estar declarada |
| `estado.mjs` | Q1/Q3 | a superfície de estado compartilhado é a declarada, nem mais nem menos |
| `modulos.mjs` | Q1/Q3 | limite de tamanho, tabela de camadas, dependência numa direção só, símbolo usado sem importar, atribuição a binding importado |
| `conteudo.mjs` | Q1/Q3/Q6 | Content Layer: pack sintético gera rodada válida, pack inválido é recusado na porta, pack malformado não executa nada, e nenhum identificador da franquia sobra em `engine/` |
| `pack-sintetico.mjs` | — | 12 criaturas e 5 tipos inventados. Existe para provar que o motor não sabe o que é um Pokémon |
| `visual.mjs` | Q5 | sobe servidor próprio, abre o app num Chromium de verdade, reprova em `pageerror` e compara impressão digital 32×32 RGB de 4 telas × 3 larguras |
| `sabotagem.mjs` | Q2 | planta 24 defeitos numa cópia do repositório e exige vermelho, com e sem os golden tests |

## Por que a sabotagem existe

Uma suíte que nunca ficou vermelha não prova nada — pode estar testando o próprio
dublê ou nunca chegando na linha que importa. `sabotagem.mjs` inverte o ônus da
prova: para cada defeito plantado, a suíte **precisa** falhar.

## A limitação do golden, e como ela foi resolvida

Golden byte-exato pega **qualquer** mudança de comportamento, então ele sozinho faz
Q2 passar sem esforço e não prova cobertura.

O F0.2 resolveu isso rodando cada sabotagem **duas vezes**, com e sem os goldens
(`SEM_GOLDEN=1`). A coluna que interessa no relatório é "sem golden": defeito que só
o golden pega é sinalizado como cobertura de propriedade fraca naquela área.

Estado atual (F0.4): **24 de 24 defeitos são pegos, nenhum dependendo só do
golden.** Um deles — S20, cor do tema alterada — só é pego pelo navegador, e é
justamente por isso que o Q5 virou portão.

A execução acontece numa **cópia do repositório em `/tmp`**. As duas primeiras
versões plantavam o defeito no lugar e restauravam depois; isso deu errado duas
vezes no F0.3d, e o motivo vale registrar: enquanto o processo está parado dentro
do `execFileSync` que roda a suíte, o laço de eventos do Node não gira e nenhum
handler de restauração dispara.

A tentativa anterior — inventar uma sabotagem que preservasse as 20 seeds — falhou
de forma instrutiva e virou a lacuna L-016: cortar `MAX_TIME` de 56 para 50 não é
pego por nada, porque nenhuma rodada do lote chega perto do corte.

## Divergências em relação ao protótipo

`paridade.mjs` compara o motor vivo com o do protótipo congelado. Hoje há **uma**
divergência declarada, o D-001. Qualquer outra reprova o bloco — é o que impede o
motor de derivar em silêncio da referência de onde os goldens vieram.

## Fixtures

`fixtures/golden.json` e `fixtures/baseline.json` são o comportamento fotografado
da base v0.8, e **não mudaram no F0.2**. A correção do D-001 só afetava o caminho
rápido, que os goldens não usam — a previsão de que mudariam estava errada, e a
suíte provou isso.

**O F0.4 também não mudou fixture nenhuma.** A Content Layer move dado de lugar;
se um golden tivesse mudado, teria mudado comportamento junto — e o bloco teria
falhado no próprio critério de saída.

Blocos que mudam comportamento de propósito (F0.6, F0.7, F0.8) regravam as
fixtures **no mesmo commit**, com a diferença explicada na mensagem.
