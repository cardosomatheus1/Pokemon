# PokéArena — instruções do projeto

Leia isto antes de tocar em qualquer coisa. Ele governa **como** se trabalha aqui;
o que construir está nos documentos de `docs/`.

## O que é

Battle royale automático de apostas com moeda simulada. 12 lutadores sorteados de
um elenco, odds por Monte Carlo, 30 s de aposta, batalha determinística que o
jogador assiste. Em torno disso, um metagame de treinador em construção.

Estado: protótipo v0.8 congelado em `prototype/`, sendo reconstruído em blocos.

## Hierarquia dos documentos

```
docs/POKEARENA_SPEC_MASTER_V1-V5_v1.5_COMPLETE.md   o QUÊ — fonte de verdade
docs/POKEARENA_BUILD_BLOCKS_v1.2.md                 o COMO e em que ordem
docs/POKEARENA_DESIGN_DEPTH_v1.1.md                 por que o metagame é assim
docs/POKEARENA_ECONOMY_STUDY_v1.2.md                economia do jogo
docs/POKEARENA_UNIT_ECONOMICS_STUDY_v1.2.md         economia da empresa
docs/POKEARENA_DOCUMENT_INDEX_v1.4.md               índice; começa por ele
docs/DEFEITOS.md                                    defeitos achados, não corrigidos
docs/LACUNAS.md                                     trabalho identificado, adiado
```

Conflito entre documentos: a Spec vence. Se a Spec estiver errada, corrija a Spec
no mesmo commit — não contorne no código.

---

## A regra central

> **Um bloco constrói só o que está no escopo dele.**
> Ao fechar qualquer bloco, o jogo continua jogável e a suíte continua verde.

Foi a ausência dessa regra que custou três versões ao projeto (v0.6.1 → v0.6.3):
uma correção de sprites virou troca de fonte de arte e o jogo inteiro saiu errado.

### Quando você encontrar algo fora do escopo

Nunca conserte em silêncio, e nunca ignore. **Registre e aponte o bloco dono.**

| Achou | Vai para | Precisa conter |
|---|---|---|
| Algo **quebrado** hoje | `docs/DEFEITOS.md` | causa, medição, bloco dono, teste que trava |
| Algo **faltando** ou adiado | `docs/LACUNAS.md` | por que não cabe agora, bloco dono, o que a destrava |

Ambos exigem **bloco dono nomeado**. "Depois" não é bloco. Se nenhum bloco
existente serve, proponha um novo em `BUILD_BLOCKS` no mesmo commit — com id,
método, portões e sabotagem, como os outros.

Defeito registrado ganha teste que **afirma o defeito de propósito**, para ficar
vermelho quando alguém corrigir. Ver `D-001` em `test/invariantes.mjs`.

---

## O ciclo de um bloco

```
1. LER        o bloco + o estado do repositório
2. ESCREVER   os testes, antes do código
3. SABOTAR    quebrar de propósito; se a suíte não fica vermelha, o teste é
              decorativo — volte para o passo 2
4. CONSTRUIR  o escopo, e nada além
5. VERIFICAR  portões do bloco + suíte inteira
6. FECHAR     um commit, critério de saída marcado
7. RELATAR    o que mudou, o que foi para DEFEITOS/LACUNAS
```

### Os nove portões

`Q1` comportamento · `Q2` sabotagem · `Q3` invariantes · `Q4` regressão
estatística · `Q5` visual · `Q6` segurança · `Q7` crítico cego · `Q8` carga e
concorrência · `Q9` telemetria.

**Q5 é o que pega erro de ligação.** Teste estático não vê símbolo não importado
nem atribuição a binding importado — os dois derrubam o app em execução e
passaram verdes pela suíte inteira mais de uma vez. O portão abre o jogo num
navegador de verdade e reprova em qualquer `pageerror`.

**Q1 e Q2 são obrigatórios em todos os blocos.** Os demais conforme o bloco
declara. Um bloco sem superfície nova escreve `Q6: sem superfície nova` —
explicitamente, para que a ausência seja decisão e não esquecimento.

### As duas metodologias

- **GL — Gauntlet Loop** (`.claude/skills/gauntlet-loop`, CC BY 4.0, ver
  `ATTRIBUTION.md`): onde existe barra **nomeada, buscável e comparável**.
  Espetáculo, identidade visual, texto, telas. Barra vaga é o modo de falha nº 1:
  o crítico inventa a comparação e aprova tudo.
- **INV — dirigido por invariante**: onde a correção é binária. Motor, seed,
  precificação, ledger, settlement, economia competitiva. Não force gauntlet
  aqui; a barra seria uma especificação e o loop degenera em concordância.

---

## Comandos

```bash
npm run portoes      # suíte com o portão de navegador + sabotagem
npm test             # suíte (pula Q5 se não houver navegador)
npm run sabotagem    # Q2 — leva ~9 min
npm run test:gerar   # regrava fixtures E linha de base visual
npm run snapshot     # regera o instantâneo do protótipo (paridade)
```

**Zero dependências no repositório.** O portão Q5 precisa de `playwright-core`,
instalado **fora** do projeto — ver `tools/README.md`. `npm test` pula Q5 com
aviso; `npm run portoes` exige, porque portão que pula em silêncio é decorativo.

## Fixtures

`test/fixtures/` é o comportamento fotografado da base v0.8, mais a linha de base
visual. Regravar **só** em bloco que muda comportamento de propósito, **no mesmo
commit**, com a diferença explicada na mensagem. Fixture regravada sem explicação
é a forma mais fácil de esconder uma regressão.

`visual-base.json` guarda impressão digital de 32×32 em RGB, não PNG: a captura
conteria arte de terceiros, e comparar PNG exigiria dependência. Os sprites são
bloqueados durante a captura, então a linha de base mede a **nossa** interface.

## Commits

Um bloco, um commit. A mensagem diz o que mudou, o que foi medido, e o que foi
para DEFEITOS/LACUNAS. Se regravou fixture, explique a diferença.

Branch de trabalho: `claude/pok-arena-repo-setup-qgcn76`.

---

## Nunca

- Corrigir fora do escopo do bloco, mesmo que seja "rapidinho".
- Fechar bloco com a suíte vermelha.
- Regravar fixture sem explicar a diferença.
- Pular a sabotagem porque "o teste obviamente funciona".
- Substituir arte, som ou dado por outro de fonte diferente quando o original
  falhar. **O resgate busca a mesma coisa em outro endereço, nunca outra coisa** —
  lição registrada da v0.6.1.
- Versionar material de terceiros. `battle-theme.mp3` está fora por isso.
- Ligar qualquer feature de valor econômico real sem o checkpoint do §25.1.

## Sempre

- Medir antes de mexer. É o método do projeto e já evitou várias decisões erradas.
- Comentar o **porquê**, não o quê. O protótipo faz isso bem; mantenha.
- Tratar proteção do jogador como requisito, não como conformidade (Spec cap. 28).
- Manter o motor agnóstico ao tema. Nenhum identificador da franquia fora do
  ContentPack.

## Três coisas que travam o projeto e não são código

1. Consulta de enquadramento regulatório (Spec §0.5.1).
2. Arte do ContentPack original (Spec §0.3.1) — prazo: antes do fim da V1.
3. Política de publicidade e afiliados — sem dono em nenhum documento.
