# Arnês — bloco F0.1

Portões cobertos: **Q1** (comportamento), **Q2** (sabotagem), **Q3** (invariantes),
**Q4** (regressão estatística). Zero dependências, igual ao protótipo.

```bash
npm run portoes      # extrai o motor, roda a suíte e a sabotagem
npm test             # só a suíte
npm run sabotagem    # só o portão Q2
npm run test:gerar   # regrava fixtures — só quando a mudança é intencional
```

## O que cada arquivo faz

| Arquivo | Portão | Papel |
|---|---|---|
| `../engine/extract.mjs` | — | extrai o motor de `prototype/index.html` por nome de declaração, com casamento de chaves. Não usa intervalo de linhas, que quebraria em silêncio na primeira edição do protótipo |
| `golden.mjs` | Q1 | 20 seeds fixas, fluxo de eventos byte a byte |
| `invariantes.mjs` | Q3 | 8 propriedades sobre 2.000 rodadas aleatorizadas, mais o defeito registrado D-001 |
| `estatistica.mjs` | Q4 | 10.000 rodadas; duração, abates, tempestade, crítico, erro, amplitude do elenco |
| `sabotagem.mjs` | Q2 | planta 6 defeitos e exige que a suíte fique vermelha para cada um |

## Por que a sabotagem existe

Uma suíte que nunca ficou vermelha não prova nada — pode estar testando o próprio
dublê ou nunca chegando na linha que importa. `sabotagem.mjs` inverte o ônus da
prova: para cada defeito plantado, a suíte **precisa** falhar.

## Limitação conhecida deste arnês

Os golden tests são byte-exatos, então qualquer sabotagem que mude comportamento
os derruba. Isso faz Q2 passar com facilidade demais. O sinal que interessa é a
coluna "pego por": se um defeito só cai no golden e não toca invariantes nem
estatística, a cobertura de propriedade está fraca naquela área, mesmo com Q2
verde. Hoje os 6 defeitos caem nas três suítes.

Refinamento para um bloco futuro: sabotagens que preservem as 20 seeds do golden
e só desloquem o agregado.

## Fixtures

`fixtures/golden.json` e `fixtures/baseline.json` são o comportamento fotografado
da base v0.8. **F0.1 fotografa, não conserta** — inclusive o defeito D-001, que
está registrado em `../docs/DEFEITOS.md` e é corrigido em F0.2.

Blocos que mudam comportamento de propósito (F0.2, F0.6, F0.7, F0.8) regravam as
fixtures **no mesmo commit**, com a diferença explicada na mensagem.
