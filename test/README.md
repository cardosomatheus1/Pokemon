# Arnês — blocos F0.1 a F0.9

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
| `banco.mjs` | Q6 | o BOOT da carteira, com `localStorage` mínimo: adulteração e ledger truncado precisam ser reconstruídos. Existe porque `carteira.mjs` prova que a reconciliação funciona, e isso não prova que alguém a chama |
| `carteira.mjs` | Q1/Q3/Q6/Q8 | buckets e ledger do §5.5: apostar bônus devolve bônus, saldo nunca negativo, adulteração detectada pela reconciliação, e duas reservas não gastam o mesmo PC |
| `exposicao.mjs` | Q1/Q3/Q6 | tetos de payout e de passivo: corte antes da confirmação, mercado que fecha ao saturar, e as três formas de furar o teto — stake manipulado, tickets divididos, corrida entre confirmações |
| `precisao.mjs` | Q4 | precisão do estimador: erro relativo e viés de convexidade por lutador, registro de precificação do §4.4.5, e a dispersão de 8 cálculos sobre a mesma pool |
| `margem.mjs` | Q4 | margem realizada por grupo de tipo OBSERVÁVEL. É o teste que fecha o defeito do clima fora do preço: antes, quem tinha tipo buffável saía a −0,61% e o resto a +14,96% |
| `semente.mjs` | Q1/Q3/Q6 | a árvore do §P3: a mesma raiz reproduz a rodada, dois ramos nunca coincidem, o preço sai da raiz, e a raiz não vem de relógio, contador nem da rodada anterior |
| `rodada-digital.mjs` | — | reconstrói a rodada a partir da raiz. Importado pelo Node **e** pelo Chromium: é o que faz "dois ambientes JS" ser comparação de verdade, e é a referência contra a qual a rodada real do app é conferida |
| `visual.mjs` | Q5/Q3 | sobe servidor próprio, abre o app num Chromium de verdade, reprova em `pageerror`, compara impressão digital 32×32 RGB de 4 telas × 3 larguras, e confere o determinismo da rodada entre Node e navegador |
| `sabotagem.mjs` | Q2 | planta 53 defeitos numa cópia do repositório e exige vermelho, com e sem os golden tests |

## Resultado instável não conta como captura

"Vermelho com golden, verde sem golden" é o sinal que este relatório existe para
dar — cobertura fraca naquela área. É **também** o que uma falha transitória
produz. No F0.9 o defeito S35 apareceu como capturado e, em caixa limpa, passava
nos dois modos: a execução vermelha tinha sido um acidente.

Contar falha instável como captura é pior que reportar um escape, porque esconde
o buraco. O caso suspeito agora é reconfirmado com uma segunda execução do par;
discordando, o defeito vira `INSTÁVEL` e não conta como pego.

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

Estado atual (F0.9): **53 defeitos plantados**, nenhum dependendo só do
golden. Um deles — S20, cor do tema alterada — só é pego pelo navegador, e é
justamente por isso que o Q5 virou portão.

A execução acontece numa **cópia do repositório em `/tmp`**. As duas primeiras
versões plantavam o defeito no lugar e restauravam depois; isso deu errado duas
vezes no F0.3d, e o motivo vale registrar: enquanto o processo está parado dentro
do `execFileSync` que roda a suíte, o laço de eventos do Node não gira e nenhum
handler de restauração dispara.

A tentativa anterior — inventar uma sabotagem que preservasse as 20 seeds — falhou
de forma instrutiva e virou a lacuna L-016: cortar `MAX_TIME` de 56 para 50 não é
pego por nada, porque nenhuma rodada do lote chega perto do corte.

## Quanto tempo custa

`npm run portoes` roda a suíte com o navegador e depois a sabotagem. Desde o
F0.9 a suíte leva ~36 s e a sabotagem roda 106 execuções — as 53 com e sem
golden —, ou seja **~65 min**. As duas medições caras ficam fora da suíte, em
`npm run test:gerar`: margem (300 × 8.000 simulações) e precisão (8 cálculos de
154.000).

**A espera do portão Q5 é por ESTADO, não por relógio.** A captura da linha de
base tinha uma espera fixa de 4 s; quando o F0.7 levou a rodada de 0,6 s para
4,6 s, ela passou a cair no meio do "calculando odds…" e acusava 6 a 9 telas
fora sem nada ter mudado. Agora ela espera a fase de apostas abrir com a lista
de odds montada.

## Divergências em relação ao protótipo

`paridade.mjs` compara o motor vivo com o do protótipo congelado. Hoje há **uma**
divergência declarada, o D-001. Qualquer outra reprova o bloco — é o que impede o
motor de derivar em silêncio da referência de onde os goldens vieram.

## Fixtures

`fixtures/golden.json` e `fixtures/baseline.json` são o comportamento fotografado
da base v0.8, e **não mudaram no F0.2**. A correção do D-001 só afetava o caminho
rápido, que os goldens não usam — a previsão de que mudariam estava errada, e a
suíte provou isso.

**Do F0.4 ao F0.7, nenhum golden mudou.** O F0.4 move dado de
lugar; o F0.5 muda de onde vêm as sementes, não o que o motor faz com elas; e o
F0.6 muda o PREÇO, que nenhuma fixture cobria — a previsão do bloco de que os
goldens mudariam estava errada, e a medição corrigiu. O F0.7 muda o ESTIMADOR,
que também nenhuma fixture de batalha cobria. As fixtures novas são de MEDIÇÃO,
não de fotografia: `margem.json` (300 rodadas × 8.000) e `precisao.json`
(8 cálculos × 154.000).

**O F0.4 não mudou fixture nenhuma.** A Content Layer move dado de lugar;
se um golden tivesse mudado, teria mudado comportamento junto — e o bloco teria
falhado no próprio critério de saída.

Blocos que mudam comportamento de propósito (F0.6, F0.7, F0.8) regravam as
fixtures **no mesmo commit**, com a diferença explicada na mensagem.
