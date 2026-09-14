# Pacote de continuidade — PokéArena

**Gerado em:** 13/09/2026.
**O que é:** tudo que alguém precisa para retomar o desenvolvimento deste
projeto sem estar na máquina dele e sem ter acompanhado a conversa.

---

## Por onde começar

| se você é | leia nesta ordem |
|---|---|
| **eu, numa aba nova ou noutra máquina** | `CONTINUAR.md` → `CLAUDE.md` → `ROADMAP.md` |
| **alguém que nunca viu o projeto** | `COMECE_AQUI.md` → `CLAUDE.md` → `CONTINUAR.md` |
| **quem quer só saber o que falta** | `ROADMAP.md`, seção *O QUE FALTA* |

**Uma frase reabre o trabalho:** `leia docs/CONTINUAR.md e siga daqui`.

---

## O que tem aqui dentro

### Os que governam o trabalho

```text
CLAUDE.md          COMO se trabalha. Vence qualquer outro documento em
                   conflito. Nove portões, o ciclo de um bloco, as regras que o
                   dono fixou e não se renegociam
CONTINUAR.md       o estado EXATO em 13/09: o que está commitado, o que está na
                   árvore sem commit, o que se perdeu e precisa ser refeito, e a
                   ordem do que vem depois. É o arquivo mais importante daqui
TAREFA_1.27f_CARTAO.md
                   a ORDEM DE SERVIÇO do próximo bloco, escrita para ser
                   executada por quem não acompanhou nada: seis mudanças arquivo
                   a arquivo, três testes que mudam junto, quatro defeitos
                   plantados, e a pergunta que fecha a peça
ROADMAP.md         o mapa inteiro: tudo que foi construído desde o protótipo, e
                   tudo que falta, em ordem de prioridade
RETOMAR.md         o histórico curto dos últimos blocos, com as lições deles
```

### Os que dizem o que o produto é

```text
COMECE_AQUI.md                          o produto e o método, para quem nunca viu
POKEARENA_SPEC_MASTER_V1-V5_v1.5...md   o QUÊ. Fonte de verdade. Em conflito,
                                        a Spec vence — e se ela estiver errada,
                                        corrija a Spec no mesmo commit
POKEARENA_BUILD_BLOCKS_v1.2.md          o COMO, e em que ordem
POKEARENA_DESIGN_DEPTH_v1.1.md          por que o metagame é assim
POKEARENA_DOCUMENT_INDEX_v1.5.md        o índice de todos os documentos
```

### Os que guardam o que foi achado e adiado

```text
LACUNAS.md     179 lacunas — trabalho identificado e adiado, cada uma com BLOCO
               DONO nomeado. "Depois" não é bloco
DEFEITOS.md    94 defeitos — cada um com causa, medição e bloco dono
ORDEM_APOS_O_AVANCO.md   a fila decidida em 08/09, e o critério que a produziu
PAUTA_2026-09-08.md      tudo que está pausado, lacuna a lacuna
```

### Os de economia e negócio

```text
POKEARENA_ECONOMY_STUDY_v1.2.md          a economia do jogo
POKEARENA_UNIT_ECONOMICS_STUDY_v1.2.md   a economia da empresa
PARECER_MOEDAS_E_MERCADO.md              o parecer sobre moedas e mercado
ECONOMIA_DE_ITENS.md                     a economia dos itens
```

---

## O que este pacote NÃO tem

**O código.** Ele está no repositório, em `C:\Users\gdult\pa4`. Estes documentos
descrevem o estado dele, e várias seções citam arquivo e linha — mas nenhum
deles substitui o `git log`, que é onde o projeto guarda o porquê de cada
decisão (as mensagens de commit são longas de propósito).

**A arte.** `assets/` tem ~1 645 arquivos de terceiros e entra no repositório
por decisão do dono, para quem clona poder jogar sem rodar um comando a mais.
`npm run assets` rebaixa o que faltar.

---

## Três coisas que valem saber antes de mexer em qualquer coisa

### 1. Um bloco constrói só o que está no escopo dele

É a regra central, e a ausência dela custou três versões ao projeto. Achou algo
fora do escopo? **Registre em `LACUNAS.md` ou `DEFEITOS.md` com bloco dono
nomeado, e feche o bloco que já estava aberto.**

### 2. Testes ANTES do código, e sabotagem depois

O portão Q2 planta 987 defeitos de propósito e confere que a suíte pega cada um.
Um teste que não fica vermelho quando o código quebra é decorativo.

### 3. Verde não é legível

O portão Q5 tem duas metades, e a segunda é **olhar**. Três defeitos já passaram
por 299 testes verdes neste projeto — todos de leitura, nenhum de execução.
Todo bloco que mexe em tela fecha capturando e LENDO as telas afetadas.

> A pergunta que fecha qualquer peça visual: *se um jogador visse isto pela
> primeira vez, sem explicação, ele acharia que é de um jogo publicado — ou que
> é um protótipo?*
