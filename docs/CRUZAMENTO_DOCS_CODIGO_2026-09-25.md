# Cruzamento documentos × código — 25/09/2026

> **O que é este arquivo.** Uma fotografia datada: cada promessa dos documentos
> de planejamento conferida contra o código do commit `fd33fae` (branch
> `claude/docs-planning-tests-6hjthq`). Ele **não é fila** (GOV-01): a fila mora
> no `ROADMAP.md`, o estado no `RETOMAR.md`, e o detalhe de cada entrega no
> `PLANO_DE_IMPLEMENTACAO.md`. Aqui fica a evidência que justifica o plano.
>
> **Por que ele existe se a Revisão 2.0 já foi conferida em 25/09.** A
> `revisao-2026-09-24/CONFERENCIA.md` conferiu os 22 achados do revisor. Ela
> não desceu às entregas que vêm DEPOIS do 1.33 (INT-01, INT-02, UX-01, 1.32b),
> e foi descendo nelas que apareceram os três defeitos novos da seção 2, e um
> deles fura o §P5.

---

## 1. Método

```text
base             commit fd33fae, 25/09/2026, árvore limpa
o que se leu     ROADMAP (a fila), RETOMAR, LACUNAS, DEFEITOS, BUILD_BLOCKS,
                 Revisão 2.0 (REVISAO_POKEARENA + CONFERENCIA), cartão 1.33
o que se fez     cada item da fila e cada DEC conferido contra o código, com
                 arquivo:linha; os três defeitos novos REPRODUZIDOS em Node
o que NÃO se fez jogar a run no navegador de ponta a ponta com conta real — é
                 exatamente o que falta à suíte, e virou critério de aceite
```

Quatro frentes, em paralelo: economia e integridade (INT-01, DEC-08/09), posse
e sessão (INT-02, DEC-06/07), tela e conteúdo (1.32b, UX-01), e coerência entre
os próprios documentos.

---

## 2. Três defeitos novos — nenhum aparecia em documento nenhum

Os três estão em `DEFEITOS.md` com bloco dono, e cada um tem **teste que afirma
o defeito** — verde hoje, vermelho no dia em que for consertado.

### D-107 · o teto de encontros do Avanço volta cheio depois de colher — **fura o §P5**

```text
reproduzido     livre 30  ->  durante a run 24  ->  depois de colher 4 encontros: 30
causa           encontrosHoje só soma e.expedicoes      app/modules/idle-dados.mjs:298-301
                a run colhida vai para e.avancos        app/modules/avanco-estado.mjs:502
                e.avancos nem é lido pelo carregar      app/modules/idle-dados.mjs:102-133
consequência    Avanço atrás de Avanço = captura sem teto (inclusive chefes evoluídos)
teste-trava     test/avanco-estado.mjs  "D-107 (afirma o defeito)"
```

O teste existente (`avanco-estado.mjs:61`) confere a reserva **durante** a run,
e ela funciona. A perda está no instante seguinte, que nenhum teste olhava.

### D-108 · com conta real, o cosmético da boutique sai de graça

```text
causa           comprarPeca debita a carteira LOCAL e grava a posse LOCAL
                                                       app/modules/loja-cash.mjs:233-253
                em modo servidor salvar() não grava nada app/modules/banco.mjs:148
                não existe rota de cosmético no servidor server/rotas.mjs
consequência    o próximo hidratar() devolve o saldo do servidor; a peça fica
teste-trava     test/modo-servidor.mjs  "D-108 (afirma o defeito)"
```

### D-109 · o botão ⏻ não desloga uma conta real

```text
causa           o Sair apaga 'ar_session' (o PIN local) app/modules/navegacao.mjs:91-98
                o token real mora em 'ar_sessao'         app/modules/api.mjs:21
                sessaoAtiva() é verdadeira com o token   app/modules/navegacao.mjs:76
                api.esquecerSessao existe e ninguém chama app/modules/api.mjs:83
agravante       token de 7 dias, sem revogação no servidor server/auth.mjs:216-246
teste-trava     test/modo-servidor.mjs  "D-109 (afirma o defeito)"
```

**O que os três têm em comum:** todos vivem no caminho **com conta real**, que é
o caminho que a suíte menos percorre. A suíte de navegador joga a Arena com
servidor (`rodada-completa`), mas não joga o idle, a boutique nem o Sair com
sessão. É o REV-11 da revisão — "suíte verde pode não observar a jornada
principal" — com endereço.

---

## 3. A fila do ROADMAP contra o código

| item da fila | o documento diz | o código hoje | veredito |
|---|---|---|---|
| **1.32b** · L-177 | o jogador não sabe que climas existem | tabela em `content/pokemon_kanto_v1.mjs:371-388` (7 climas + neutro, 8 tipos); só a run a lê (`avanco-clima.mjs:56`); nenhuma legenda na escolha | **aberto** |
| **1.32b** · L-183 | 2 das 11 rotas mudam de noite no estágio 4 | medido de novo: E1 6/11 · E2 7/11 · E3 3/11 · E4 2/11 | **aberto**, número confere |
| 1.32b (novo) | — | efeito do clima no elenco, 44 estágios: **Sol 0**, chuva 8, vendaval 4, tempestade 1, névoa 17, pólen 9, nevasca 2 | uma legenda "o clima muda quem aparece" **mentiria para o Sol** |
| **INT-01** · L-159 | o baú entrega item inteiro, não Estilhaço | confirmado: `avanco-estado.mjs:418-439`; `est:` só entra pela troca na loja | **aberto** |
| INT-01 · reservas | a run reserva 6 e devolve a sobra | a reserva é derivada (`idle-dados.mjs:325`) e some ao colher — é o **D-107**; `reservarAvanco`/`colherAvanco` (`engine/avanco.mjs:69-90`) sem chamador | **divergente** |
| INT-01 · resgate concorrente | testar duas colheitas e retry | servidor: `server/idle.mjs:173-222` é transacional **mas não tem rota HTTP** — só os testes o chamam. Cliente: guarda em memória; duas abas podem colher de novo (inferido) | **o idle inteiro é autoridade do navegador** |
| INT-01 · faucets | a run paga tudo menos espécie depois do teto | confirmado (`avanco-estado.mjs:367-439`): XP, moeda, baú sem teto; só a stamina freia | conforme decisão; **falta o mapa de emissão por hora** |
| **INT-02** · L-055, L-157 | posse de cosmético só no navegador; duas listas | confirmado: `pa.cosmeticos.v1` (`cosmeticos.mjs:187-218`) e `pa.outfit.v1` (`outfit-acervo.mjs:127-147`); `player_profile` sem cosmético (`server/banco.mjs:474-482`) | **aberto** — e agravado pelo D-108 |
| INT-02 · equipar | exige posse | traje: `tem()` mas `MODO_VITRINE=true` libera tudo (`outfit-acervo.mjs:47`); cena/moldura/efeito/avatar gravados sem checar posse (`customizacao.mjs:412-419`) | **não atende** |
| INT-02 · 1.26 (cadeado §5.5) | 🟡 "só falta commit" | motor tem o balde `comprado` (`engine/carteira.mjs:24,45-59`); o **servidor não** (`server/banco.mjs:63`); nada usa o propósito `'poder'`; não há rota de compra de PokéCash | 🟡 é mais que commit: **falta o servidor** |
| **UX-01** · L-176 | `battle-theme.mp3` e `lojas.mp4` dão 404 | os dois arquivos **não existem** no repositório (`audio.mjs:174`, `loja-tela.mjs:60`, `index.html:7168,7196,7374`) | **aberto** |
| UX-01 · D-082 | rodapé do banner sob o mon da vitrine | `.bnRodape{left:0;right:0}` (`index.html:3101`) sem reservar os 104 px do `.bnMon.vitrine` | **aberto** |
| UX-01 · L-160 | `est:folha` aparece cru | sem nome em `itens-nome.mjs` nem ícone em `itens-icone.mjs` | **aberto** (latente) |
| UX-01 · L-171 | falta `cast` e `proj` | só o `hit` (`avanco-efeito.mjs:73-79`); o `MOVE_FX` já tem os dois | **metade** |
| UX-01 · L-172 | 1–3 pares de dano se tocam em 420 px | `pontoLivre` (`avanco-geometria.mjs:444-470`) grampeia em x | **parcial** |
| UX-01 · L-175 | 130 px de mundo em 420 px | `zoom = 3` fixo (`idle-mundo.mjs:80`) | **aberto** |
| D-086 | `sala-cliente` instável | teto fixo de 3 s no `ate()` (`test/sala-cliente.mjs:56-60`); a suspeita escrita (estado observado tarde) **não se sustenta** no código: `aoEstado` é síncrono | **aberto**, causa provável é o teto sob carga |
| D-093 | base visual local invisível ao git | a passada completa GRAVA a base local e compara a captura com ela mesma, VERDE (`test/run.mjs:365-390`) | **parcial**: avisa, mas conta como verde |
| L-167 | `avanco-bola.mjs` órfão | só `test/ausente.mjs:20` o importa | **aberto** |

## 4. As decisões do dono contra o código

| DEC | a pergunta | o que o código JÁ faz | consequência |
|---|---|---|---|
| DEC-07 | o que o OFF encerra | o "Enviar" da Rota OFF é local (`idle-tela.mjs:567-588`), não fala com o servidor; o ⏻ não desloga (D-109) | a decisão tem dois pedaços: o OFF (presença) e o Sair (sessão). O segundo é **defeito**, não decisão |
| DEC-08 | captura: espécie mostrada ou a base | entrega a espécie mostrada (`idle-lance.mjs:46`), **inclusive chefe evoluído** | o código já segue a recomendação; falta registrar — e o D-107 torna o chefe evoluído capturável sem teto |
| DEC-09 | stamina por tentativa ou por vitória | cobra **por wave alcançada** no fim (2/wave, 5 no chefe, total 23: `engine/avanco.mjs:139-153`); queda encerra a run e a próxima é run nova | o texto da revisão ("por tentativa iniciada") **não descreve o código**; o painel não mostra o custo de nova tentativa (`avanco-painel.mjs:59,79-81`) |
| DEC-11 | manter 154.000 sims | cada página e cada servidor precificam 154 k (~5 s de CPU) | é também o **maior custo restante da suíte de navegador** — ver seção 6 |

## 5. Os documentos contra eles mesmos

A regra GOV-01 (uma fila, um estado) foi adotada em 25/09 e **só o ROADMAP e o
RETOMAR foram ajustados**. O resto continua dando ordens velhas:

| arquivo | o problema | tratamento |
|---|---|---|
| `RETOMAR.md` (raiz) | segundo arquivo de estado, parado em 30/08; ninguém aponta para ele | nota de topo apontando o `docs/RETOMAR.md` (feito neste commit) |
| `docs/ROADMAP.md:6-22` | cabeçalho diz "atualizado 13/09, o próximo é refazer o 1.27f" | corrigido neste commit |
| `docs/ROADMAP.md:311-317` | "Defeitos abertos" lista 3; a contagem dá ~21 | a tabela passa a dizer o critério; revisão ficha a ficha é a ST-6.3 |
| `docs/ROADMAP.md:480` × `:275` | o mesmo id **T8** para duas coisas (fichas ✅ e arnês congelado) | ST-6.2 |
| `CLAUDE.md:24,26,527` | aponta o cartão 1.33 como "próximo", um índice v1.4 que não existe, e um branch velho | corrigido neste commit |
| `docs/CONTINUAR.md`, `ORDEM_APOS_O_AVANCO.md`, `PAUTA_2026-09-08.md`, `LEIA-ME-DO-PACOTE.md`, `COMO_RODAR.md:118-127` | cada um ainda tem uma fila própria ("1º refazer o 1.27f", "5º 1.32·1.33·1.34") | ST-6.1: nota HISTÓRICO no topo e mover para `docs/historico/` |
| `docs/RETOMAR.md:286-299`, `:795-812` | listas de "próximo" de 16/09 e de 08/09 dentro do arquivo de estado | marcadas como histórico neste commit |
| `POKEARENA_BUILD_BLOCKS_v1.2.md` | **nenhuma** ficha de 1.27 em diante (1.32b, INT-01, INT-02, UX-01, 1.33, 1.34); T4 ✅ colide com "T4 congelado" | as fichas novas moram no `PLANO_DE_IMPLEMENTACAO.md`; ficha T14 entrou neste commit |
| `LACUNAS.md` | L-119 duplicada (`:4933` e `:4968`, estados opostos); L-138 e L-168 "abertas" depois de fechadas; sem campo de estado padrão | ST-6.3 |
| `COMECE_AQUI.md:438-452`, `README.md:47-51`, `PASSAGEM.md:25-32` | contagens de teste de 596 a 1116 e "D-018 aberto" (fechou no F1.15) | ST-6.1 |

**Contagem honesta:** `DEFEITOS.md` tem 96 fichas, ~75 com marca de fechada e
**~21 sem marca** (D-031, 032, 034, 037, 038, 039, 041, 042, 043, 047, 049, 050,
053, 060, 077, 078, 082, 086, 093, 097, 105) — algumas podem estar fechadas sem
marcador. `LACUNAS.md` tem 185 títulos e ~130–143 sem marca de fechada, inflados
por estados velhos. **Nenhuma contagem exata é confiável sem revisar ficha a
ficha**, e é por isso que ela virou story (ST-6.3), não número no relatório.

---

## 6. Os testes: onde estavam as horas

Medido nesta máquina (4 núcleos, 15 GB), 25/09/2026:

```text
                                      ANTES            DEPOIS (T14, este commit)
npm test, com navegador               6 min 10 s       1 min 45 s
npm run rapido (sem navegador)        3 min 10 s       38,6 s
npm run repetir (2 execuções)         ~12 min          3 min 27 s, estável 2/2
suíte `servidor` sozinha              92,5 s           ~2 s
Q2 para fechar um bloco como o 1.33   589 mutantes     147 mutantes (--bloco)
Q2 que fechou o próprio T14           —                39 avaliados, 13 min 17 s
```

**Por que custava horas, em três causas medidas:**

1. **Uma suíte de 92 s que não precisava custar 2.** A `servidor` subia 14
   servidores, e cada `ouvir()` precificava a primeira rodada com 154.000
   batalhas (~5,2 s). Nenhum teste dela lê essa rodada. As outras suítes que
   sobem servidor já passavam `sims` curto; esta era a exceção.
2. **Tudo em fila num núcleo.** As ~150 suítes rodavam uma depois da outra, e
   as 8 sondas do Chromium também: 176 s de navegador esperando 194 s de CPU,
   sem que uma lesse nada da outra.
3. **O Q2 de fecho de bloco respondia a pergunta errada.** Ele reavaliava todo
   mutante cuja CHAVE mudou, e a chave inclui o fecho da suíte que o pegou.
   Mexer no pack de conteúdo ou no `index.html` muda o fecho de centenas. No
   1.33: 32 arquivos tocados, **147** mutantes ancorados neles, **589** com a
   chave mudada. Os 442 de diferença perguntam "algum teste distante ficou
   decorativo?" — pergunta legítima, que passa a ser respondida no Q2 completo
   (tag, ou fatiado entre máquinas), e deixa de travar cada bloco.

O que **não** mudou: nenhum teste foi removido, pulado ou afrouxado. As mesmas
suítes rodam com os mesmos dados; a sabotagem continua em fila dentro da caixa
de areia (o D-100 continua valendo); o Q2 completo continua existindo com o
cache de sempre.

**O que resta de lento, com dono:** a sonda `base` (62 s, 4 larguras) e as
páginas que precificam 154 k no navegador (~5 s por carga). A primeira é o T11
(congelado); a segunda depende da **DEC-11**. Ver o plano, épico E0.
