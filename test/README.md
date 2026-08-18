# Arnês — blocos F0.1 e F0.2

Portões cobertos: **Q1** (comportamento), **Q2** (sabotagem), **Q3** (invariantes),
**Q4** (regressão estatística). Zero dependências, igual ao protótipo.

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
| `../engine/snapshot-prototipo.mjs` | — | extrai o motor do protótipo congelado por nome de declaração, com casamento de chaves. Serve só à paridade; o motor de trabalho é `engine/engine.mjs` |
| `golden.mjs` | Q1 | 20 seeds fixas, fluxo de eventos byte a byte |
| `invariantes.mjs` | Q3 | 8 propriedades sobre 2.000 rodadas aleatorizadas, mais duas asserções de não-regressão do D-001 |
| `estatistica.mjs` | Q4 | 10.000 rodadas; duração, abates, tempestade, crítico, erro, amplitude do elenco |
| `fonte-unica.mjs` | Q1/Q3 | o app não redeclara nada do motor, importa do módulo, e o motor não conhece o DOM |
| `paridade.mjs` | Q4 | motor vivo contra o do protótipo: toda divergência precisa estar declarada |
| `sabotagem.mjs` | Q2 | planta 10 defeitos e exige vermelho, com e sem os golden tests |

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

Estado atual: **10 de 10 defeitos são pegos sem o golden.** Invariantes, estatística
e paridade sustentam sozinhas.

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

Blocos que mudam comportamento de propósito (F0.2, F0.6, F0.7, F0.8) regravam as
fixtures **no mesmo commit**, com a diferença explicada na mensagem.
