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
6. OLHAR      se o bloco mexeu em tela: capture e LEIA as telas afetadas.
              Verde não é legível — ver Q5, as duas metades.
7. FECHAR     um commit, critério de saída marcado
8. RELATAR    o que mudou, o que foi para DEFEITOS/LACUNAS, com as capturas
```

### Os nove portões

`Q1` comportamento · `Q2` sabotagem · `Q3` invariantes · `Q4` regressão
estatística · `Q5` visual · `Q6` segurança · `Q7` crítico cego · `Q8` carga e
concorrência · `Q9` telemetria.

**Q5 é o que pega erro de ligação.** Teste estático não vê símbolo não importado
nem atribuição a binding importado — os dois derrubam o app em execução e
passaram verdes pela suíte inteira mais de uma vez. O portão abre o jogo num
navegador de verdade e reprova em qualquer `pageerror`.

**Q5 tem DUAS metades, e a segunda é olhar.** O portão automatizado prova que a
página *funciona*; ele não prova que ela está *legível*. São perguntas
diferentes, e a segunda não tem como ser respondida por número.

No V1.15 três defeitos passaram por **299 testes verdes**: um rótulo de texto
transbordando o cartão e cobrindo a arte, uma coluna inteira empurrada para fora
da dobra por um `max-width` que ficou para trás, e um campo de formulário
estreito demais para o próprio placeholder. Nenhum deles é erro de execução;
todos são erros de leitura.

Por isso **todo bloco que mexe em tela fecha com inspeção visual**:

```
1. capture as telas afetadas em PNG, nas larguras que o layout muda de forma
   (hoje: 1920, 1440, 1100, 420 — inclua uma acima do `max-width` do `.app`)
2. OLHE cada uma. Não é conferir que abriu: é ler o que está escrito.
3. anexe as capturas ao relatório do bloco
```

**Quando a tela mudar de arranjo, e não só de conteúdo, use um crítico cego** —
é o portão Q7, e ele existe para isto. O crítico recebe as imagens e uma barra
**nomeada**; não recebe o que foi construído, nem o que se espera ouvir. Barra
vaga é o modo de falha nº 1 da metodologia GL: o crítico inventa a comparação e
aprova tudo.

A barra que está em uso, e que se pode reusar: **TESTE DOS 3 SEGUNDOS** — um
apostador que nunca viu o produto responde, sem instrução e sem rolar, quanto
tempo falta, em quem apostar e qual o retorno, quanto tem e quanto vai apostar,
e o que está acontecendo agora. Nota por pergunta e por largura, com o lugar
exato da tela onde o olho responde. *Nota sem localização não vale.*

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
npm run portoes            # suíte DUAS vezes com navegador + sabotagem
npm run repetir            # só a repetição — instável reprova como vermelho
npm run assets             # baixa a arte para assets/, fora do versionamento
npm test                   # suíte (pula Q5 se não houver navegador)
npm run sabotagem          # Q2 completo — obrigatório para fechar bloco
npm run sabotagem:tocados  # Q2 parcial, DURANTE a construção (ver abaixo)
npm run test:gerar         # regrava fixtures E linha de base visual (~5 min)
npm run gerar:visual       # SÓ a linha de base visual — 49 s (T3)
npm run rapido             # as 21 suítes sem navegador — 7 s (T3)
npm run snapshot           # regera o instantâneo do protótipo (paridade)
```

### O recorte `--so` acelera a construção, e não fecha bloco nenhum

`node test/run.mjs --so=contraste,visual` roda só as suítes nomeadas; a mesma
bandeira no `--gerar` regrava só as fixtures nomeadas. Medido no T3: o laço de
construção caiu de **2,5 min para 0,8 s**, e a regravação da linha de base de
**5 min para 49 s** — porque o Chromium não sobe quando o recorte não pede suíte
que precise dele.

**Ele não fecha bloco.** `npm run portoes` recusa a bandeira, o recorte grita que
foi parcial nas duas pontas, e nome que não casa com suíte nenhuma **reprova** em
vez de rodar vazio. Execução vazia com a palavra VERDE é a falha mais silenciosa
que este arnês pode ter, e é o defeito `S109`.

### `sabotagem:tocados` acelera a construção, e não fecha bloco nenhum

Roda só os defeitos ancorados em arquivo que o `git status` mostra alterado.
Medido no V1.14: **15 de 78 defeitos, 2,3 min em vez de 12**. Serve para saber
se os defeitos NOVOS do bloco funcionam, sem pagar o portão inteiro a cada
tentativa.

**Não substitui o `npm run sabotagem`.** Um bloco que mexe no `render.mjs` pode
quebrar um defeito ancorado na `coreografia.mjs`, e só a execução completa vê
isso — foi exatamente o que aconteceu com o S15 no V1.14. O modo grita isso no
começo e no fim, e o `npm run portoes` continua rodando o portão inteiro.

### O pré-voo

Antes de montar caixa de areia, a sabotagem confere que cada defeito ainda tem
onde ser plantado: âncora presente **exatamente uma vez**, arquivo legível, `de`
diferente de `para`, id único. Aborta em 0,1 s se algo estiver errado.

Existe porque o V1.14 gastou **19 dos seus 53 minutos de portão** com duas
falhas dessa classe. Âncora perdida quase sempre significa que um bloco moveu o
trecho — **realve o defeito para onde o comportamento mora hoje, não apague o
defeito.**

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

`margem.json` (F0.6) não é fotografia: é **medição**, com 300 rodadas × 8.000
simulações. A suíte roda um lote curto a cada execução e confere que continua
compatível com o arquivado. Fixture de medição se regrava quando a medição muda
de propósito — e o número novo vai na mensagem do commit, ao lado do antigo.

## Commits

Um bloco, um commit. A mensagem diz o que mudou, o que foi medido, e o que foi
para DEFEITOS/LACUNAS. Se regravou fixture, explique a diferença.

Branch de trabalho: `claude/pok-arena-repo-setup-qgcn76`.

---

## Nunca

- Corrigir fora do escopo do bloco, mesmo que seja "rapidinho".
- Fechar bloco com a suíte vermelha — ou com ela **instável**, que é pior:
  vermelho constante é defeito com endereço, instável escolhe quando aparecer.
- Regravar fixture sem explicar a diferença.
- Pular a sabotagem porque "o teste obviamente funciona".
- Substituir arte, som ou dado por outro de fonte diferente quando o original
  falhar. **O resgate busca a mesma coisa em outro endereço, nunca outra coisa** —
  lição registrada da v0.6.1.
- Versionar material de **terceiros**. `battle-theme.mp3` está fora por isso, e
  as folhas de sprite também — elas vêm por `npm run assets` para `assets/`,
  que não entra no git. **Arte NOSSA é o contrário: entra, em `arte/`.** Aplicar
  a regra ao contrário custou quase três imagens no porte da v1.0; ver
  `arte/README.md`.
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
