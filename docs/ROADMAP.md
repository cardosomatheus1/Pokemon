# PokéArena — Roadmap

**O que é:** o mapa único do projeto. De onde viemos, o que existe hoje, e o que
vem depois em ordem de prioridade.

**Atualizado em:** 25/09/2026, fim do dia — o **T14** fechou (a suíte de 6 min
10 s para 1 min 45 s; o Q2 que fecha bloco de horas para minutos), e o
cruzamento documentos × código achou **três defeitos novos** que passam para a
frente da fila. A fila está em **O QUE FALTA**, logo abaixo da Parte I; as
fichas de cada entrega, em `docs/PLANO_DE_IMPLEMENTACAO.md`.

> ~~**O último bloco fechado:** 1.32 · **O próximo:** refazer o 1.27f ·
> **Para retomar:** `docs/CONTINUAR.md`~~ — **velho desde 16/09**; ficou no
> cabeçalho até 25/09, que é exatamente o que a GOV-01 existe para impedir. O
> estado mora no `docs/RETOMAR.md`.

**Em 13/09/2026 — a Prioridade 0 FECHOU.** O Avanço está
inteiro: o jogador escolhe a rota numa sala que diz quem mora nela, entra,
atravessa o mapa por dez waves de duelo dentro do cenário do bioma, enfrenta um
chefe 1x1 com anúncio na décima, usa poção, e recebe o que a run rendeu num
quadro que diz o que apareceu.

Depois dela fecharam mais quatro blocos da fila de 08/09 — a Rota OFF como aba
própria, a boutique de PokéCash, o Estilhaço, e o clima do Avanço.


**Antes, em 04/09/2026:** a trilha V1.x inteira (blocos 0.1 a 1.26) entrou neste
documento pela primeira vez, e a Prioridade 0 passou a ser **o Avanço**
(Spec §7.22).

**De onde ele sai:** do `git log` (o que foi construído e medido), do
`POKEARENA_BUILD_BLOCKS_v1.2.md` (a decomposição planejada), da
`POKEARENA_SPEC_MASTER_V1-V5_v1.5` (o destino), do **QUADRO DE IDEIAS** do dono
do projeto, e das conversas que produziram os blocos R.

**Como ler o estado:**

| marca | quer dizer |
|---|---|
| ✅ | construído, com suíte verde e sabotagem provada |
| 🟡 | construído em parte — o que falta está dito |
| ⏳ | planejado, com escopo escrito, ainda não começado |
| 💤 | ideia registrada, sem escopo fechado |
| ⏸️ | construído ou planejado, e PAUSADO por decisão — nunca descartado |
| ❌ | descartado, com o motivo |

> **Uma advertência sobre "pronto".** Quatro vezes neste projeto uma coisa
> estava construída, passava na suíte e **não chegava à tela**: classes sem CSS
> (`D-028`), CSS sem elemento (R7), aba nunca olhada (R8), arte baixada e não
> usada (R13). Neste documento, ✅ significa *medido na tela*, não *escrito no
> código*.

---

## Parte I — O que já existe

### v0.8 — o protótipo (ponto de partida)

Arquivo único de navegador. Battle royale de 12 lutadores, odds por Monte Carlo,
janela de aposta, batalha determinística. Congelado em `prototype/`.

### v0.9 — Fundação ✅ *(blocos F0.1 a F0.12)*

Tornar o protótipo confiável, modular e testável.

| bloco | o que entregou |
|---|---|
| F0.1 ✅ | arnês de regressão e captura do comportamento |
| F0.2 ✅ | motor como módulo, fora da interface |
| F0.3a–d ✅ | separação de interface, economia e perfil |
| F0.4 ✅ | **ContentPack** — o motor deixa de conhecer o tema |
| F0.5 ✅ | **seed raiz por rodada** (§P3): a rodada inteira sai de um número |
| F0.6 ✅ | clima dentro do modelo probabilístico |
| F0.7 ✅ | estimador de odds — **154.000 simulações**, erro < 2% |
| F0.8 ✅ | tetos de exposição (§4.4.6) |
| F0.9 ✅ | carteira com proveniência (§5.5) |
| F0.10 ✅ | commit-reveal e telemetria |
| F0.11 ✅ | vazamento de informação pela pool — corrigido |
| F0.12 ✅ | cache local de assets; **o jogo abre com a rede desligada** |

### V1 — Arena Online ✅ *(blocos F1.1 a F1.17)*

De protótipo de um jogador para produto multiplayer com servidor autoritativo.

| bloco | o que entregou |
|---|---|
| F1.1 ✅ | esqueleto do backend e contrato de API versionado |
| F1.2 ✅ | banco, migrações e modelo de dados |
| F1.3 ✅ | autenticação real, com barreira de idade |
| F1.4 ✅ | **wallet ledger no servidor** — o cliente deixa de ser fonte de dinheiro |
| F1.5 ✅ | **round scheduler autoritativo**: o servidor é dono do relógio e da semente |
| F1.6 ✅ | transporte realtime, sala e reconexão |
| F1.7 ✅ | aposta, trava e settlement |
| F1.8 ✅ | proteção do jogador — limites (§28.3) |
| F1.9 ✅ | proteção do jogador — pausa, autoexclusão e sinais de risco |
| F1.10 ✅ | perfil, desafios e login streak — **fechado no R21**, que achou o `D-034` e o `D-035` |
| F1.11 ✅ | admin, telemetria e painel econômico — **fechado no R20**: o §10.9 chegou à tela |
| F1.12 🟡 | ContentPack original — software fechado, **arte ainda aberta** |
| F1.13 ✅ | as rotas e o cliente ligado |
| F1.14 ✅ | o laço de jogo contra o servidor |
| F1.15 ✅ | raiz da rodada sai de 32 para 128 bits (defeito `D-018`) |
| F1.16 ✅ | o cliente não é fonte de dinheiro nem por um instante |
| F1.17 ✅ | **o operador do painel prova quem é** — senha + segundo fator |

### Trilha R — a tela que o jogador usa ✅ *(22 e 23 de agosto de 2026)*

Nasceu da sua lista de 12 mudanças de interface. Cada bloco é um commit com o
raciocínio inteiro; `git show <hash>` mostra o quê e o porquê.

| bloco | o que mudou | commit |
|---|---|---|
| R0 ✅ | a suíte volta a ficar verde no Windows (`D-019`) | `370e15e` |
| R1 ✅ | três botões que não faziam o que diziam | `4b29438` `979a114` |
| R2 ✅ | o log acompanha a batalha e a caixa cresce | `1763837` |
| R3 ✅ | o banner de batalha sai do perfil e vai para a rodada | `1763837` |
| R4 ✅ | pódio ao vivo, derrotado riscado, abates em neon; sai a barra de volume | `06bbd39` |
| R5 ✅ | o resultado volta para o centro | `fc4b882` |
| R6 ✅ | nome na barra de vida e nome do golpe legíveis | `f507ce9` |
| R7 ✅ | a identidade visual chega à tela: letrado, pokébola, arte de entrada | `31c88a2` |
| R8 ✅ | o guarda-roupa shiny — **já existia; faltava olhá-lo** | `53ad377` |
| R9 ✅ | **um caminho só para o painel de ADM**, e é o do servidor | `33979a2` |
| R10 ✅ | uma arte de banner, três enquadramentos | `23b963e` |
| R11 ✅ | a arena mantém a proporção que declara | `1ffa220` |
| R12 ✅ | o portão de fechamento volta a poder ficar verde (`D-029`) | `67adfdc` |
| R13 ✅ | o campeão comemora **animado** (e o shiny animado passa a ser baixado) | `e014ac3` |
| R14 ✅ | o menu e os títulos ganham o brilho do tema | `e014ac3` |
| R15 ✅ | o aviso de nocaute fica legível | `e014ac3` |
| R16 ✅ | o `3, 2, 1 · BATTLE!!` no letrado do tema | `e014ac3` |
| R17 ✅ | o Rayquaza ao fundo da arena | `e014ac3` |
| R18 ✅ | a margem da casa tem caminho, com papel e auditoria | `e014ac3` |
| R19 ✅ | o portão de contraste enxerga `filter` | `e014ac3` |

**Estado medido no fecho:** suíte **836/836 verde** com navegador · Q2
**357/357 defeitos plantados detectados** · `npm run repetir` estável.


### V1.x — O metagame do treinador ✅🟡 *(blocos 0.1 a 1.26, 29/08 a 04/09/2026)*

**O que é:** a trilha que construiu o jogo em volta da Arena — a criatura do
jogador, o mundo do idle, a Pokédex, a captura, a evolução, a economia de itens
e a loja. É a maior trilha do projeto até hoje, e **não existia neste documento
até 04/09/2026** — que é exatamente o defeito que o `ROADMAP` existe para não
ter.

#### A fundação da criatura e do farm

| bloco | o que entregou |
|---|---|
| 0.1 ✅ | o circuito da progressão fecha, e o F1.10 fecha de verdade (`D-045`) |
| 0.3a–b ✅ | clone limpo sobe o banco (`D-030`) · as caixas de areia do Q2 somem (`D-036`) |
| 0.4 ✅ | o mascarador do arnês enxerga código dentro de `${…}` (`D-046`) |
| 1.1 ✅ | **a criatura do jogador existe**: nasce, é auditável e evolui |
| 1.2a ✅ | **a expedição** — a duração vira decisão, e o teto não tem parâmetro |
| 1.2b ✅ | o encontro vira captura, e a chance não olha para dinheiro |
| 1.2c ✅ | os drops, e a bola vira o recurso escasso que dá a decisão |
| 1.2d ✅ | o idle ganha memória, e a semente do saque nasce na colheita |
| 1.6a ✅ | `D-052`: o teto diário passa a contar **encontros**, e não expedições |

#### O mundo que se olha por horas

| bloco | o que entregou |
|---|---|
| 1.3a–c ✅ | o cenário vira módulo, a aba do idle existe, a primeira criatura é escolha |
| 1.4 ✅ | as rotas por nível, derivadas da linha evolutiva |
| 1.5a–c ✅ | a esteira de outfit, o retrato na seleção, e **o mundo vira mapa** |
| 1.5d–g ✅ | a vida do bioma, a folha de caminhada, a fauna de cenário |
| 1.5h–n ✅ | o companheiro com época, tamanho e lugar · as suítes que faltavam |
| 1.5L ✅ | **o relevo que parece relevo**, e a luz que diz que lugar é este |
| 1.5o–r ✅ | os controles que desobedeciam · a decoração, a colisão, a prévia ao vivo |
| 1.5j(b) ✅ | quem mora dentro do lago, e a água que reage a ele |
| 1.15 ✅ | a composição do bioma: a estrada curva, e o chão ganha lugares |

#### A profundidade

| bloco | o que entregou |
|---|---|
| 1.6 ✅ | a captura ao vivo, a equipe de seis e a caixa |
| 1.6b–c ✅ | o painel do idle · o banner de batalha · os ícones de cabeça (`D-064`) |
| 1.7a ✅ | os treinadores que moram no bioma |
| 1.7b ✅ | **a batalha contra o treinador**, e o encontro que ela ocupa |
| 1.9 + 1.11 ✅ | a economia do idle e as **quatro expedições paralelas** |
| 1.10 ✅ | **os estágios**: quão fundo ir, e o que mora lá |
| 1.12 ✅ | o catálogo de itens, as quatro portas, e a wiki |
| 1.13 ✅ | as notas do dono entram na aposta, no depósito e na carteira |
| 1.14 ✅ | o nível e o vínculo andam, e a barra de XP enfim aparece |
| 1.16–1.18 ✅ | o foco, o painel, e três ajustes que o dono pediu |
| 1.19 ✅ | o dossiê vira **Pokédex**, e a segunda metade da escada aparece |
| 1.20 ✅ | a Pokédex: o que existe, onde mora, e quanto falta |
| 1.21 ✅ | **a evolução**, e a transição que ela merecia |
| 1.22 ✅ | a aba que morreu em silêncio, e o portão que mentia no cabeçalho |
| 1.23 ✅ | a captura vira um momento, e as cinco faixas passam a se ver |
| 1.24 ✅ | os momentos que faltavam: a confirmação e o interruptor |
| 1.25 🟡 | **a loja PvE** — vendedora com vídeo, compra e venda, o balcão como mapa de objetivos |
| 1.26 🟡 | **o cadeado do saldo comprado** (§5.5) — o que se paga não vira poder |
| D-076 🟡 | "menos movimento" apagava a cena da captura inteira — achado pelo dono |

> **O 🟡 do 1.25, 1.26 e D-076 é de COMMIT, e não de construção.** Os três estão
> construídos e com a suíte verde em 1792/1792; o Q2 fecha em 3 sondas de 809,
> e as três são cegueira da minha própria sonda, não defeito de produto. Não se
> fecha bloco com o Q2 vermelho — a regra existe justamente para eu não me
> convencer de que "é só teste".

#### As ferramentas que a trilha obrigou a construir

| ferramenta | por que ela existe |
|---|---|
| `tools/contato-gif.mjs` · `contato-video.mjs` | **eu não vejo movimento.** Elas extraem quadros para que "vi a referência" seja verdade |
| `tools/folha-captura.mjs` | a tira de contato das bolas — e ela mentia calada até a casa deixar de ser escrita à mão |
| `tools/medir-drops.mjs` | ler a tabela diz o que foi projetado; **rodar** diz o que acontece |
| `test/origem.mjs` | a peneira de símbolo órfão que o cabeçalho do `ligacao.mjs` prometia e o corpo nunca teve |

### O seu QUADRO DE IDEIAS — item a item

| ideia | estado | onde foi feito |
|---|---|---|
| só últimas evoluções e base — 76 Pokémon | ✅ | ContentPack, F0.4 |
| melhor visualização ao ganhar e ao perder | ✅ | F1.9 + **R5** (voltou ao centro) |
| definição PokéCash | ✅ | ContentPack (`MOEDA`) |
| marcação do Pokémon escolhido na arena | ✅ | anel de seleção + **R4** (linha destacada) |
| avatar, perfil e banner personalizáveis | ✅ | F1.10 + **R3**, **R10** |
| sistema de badges no perfil | ✅ | `medalhas.mjs`, F1.10 |
| killstreak com buff gradativo e aviso | ✅ | motor + aviso na arena |
| tempo de aposta 30 s | ✅ | `FASE_MS.APOSTA = 30_000` |
| layout do site: cadastro, login, arenas, regras | ✅ | F1.3 + **R7**, **R14** |
| sistema de leveling do treinador | ✅ | `progressao.mjs`, F1.10 |
| desafios diários | ✅ | `desafios.mjs`, F1.10 |
| aviso de nocaute do seu Pokémon | ✅ | + **R15** (agora legível) |
| destaque na barra de HP do escolhido | ✅ | `.plate.mine` + pokébola |
| balanceamento à distância × corpo-a-corpo | ✅ | medido no motor |
| valores de aposta 50/100/300/500/1000 + personalizado | ✅ | `CHIP_VALUES` + campo livre |
| ícone de cédula no lugar do diamante | ✅ | `MOEDA.simbolo` |
| **painel de ADM com gráficos de favorecimento** | ✅ | acesso **R9**, margem **R18**, gráficos **R20** |
| **sistema VIP de 7/15/30 dias** | 💤 | nunca teve escopo — ver Parte III |
| **artes das cédulas de PokéCash** | ⏳ | esperando os arquivos de imagem |

---

## Parte II — O que está pendente, em ordem de prioridade

A ordem não é a da Spec. Ela segue três critérios, nesta ordem:

1. **o que bloqueia uma decisão de negócio** vem antes do que só acrescenta;
2. **o que fecha um risco** vem antes do que abre superfície nova;
3. **o que é barato e destrava muito** vem antes do caro.

---

## O QUE FALTA — a fila de hoje, 25/09/2026

> **Esta é a FILA ÚNICA do projeto** (GOV-01, adotada da Revisão 2.0 de 24/09).
> O `RETOMAR.md` é o ESTADO ÚNICO. Nenhum outro documento pode ter uma lista de
> "próximo passo" — foi assim que a `TAREFA_1.27f` continuou dizendo "a fazer"
> depois de feita, e que o T11 apareceu na frente com o arnês congelado.
>
> E três estados diferentes, que nenhuma linha desta tabela confunde (GOV-04):
> **implementado** (suíte e portão verdes), **validado com jogadores** (ninguém
> ainda jogou isto fora da suíte) e **pronto para vender** (depende de direitos,
> pagamento e decisões do dono — DEC-01 a 03).

### Fechado nesta leva

| bloco | fechou em | evidência |
|---|---|---|
| **1.27f** · o cartão da equipe | 16/09 | Q2 998/998 · capturas em `tools/previas/_cartao/` |
| **T9 · T10 · T13 · T11a** · o arnês | 16/09 | portão de 7 h para 3 min com a árvore intocada |
| **1.34** · dia, tarde e noite | 25/09 | Q2 1017/1017 · suíte 2184/2184 · capturas em `tools/previas/_hora/` |
| **1.33** · o elenco muda com a hora e o clima | 25/09 | 18 de 44 estágios mudam à noite · Q2 e suíte no commit · capturas `tools/previas/_hora/sala-*` |
| **ST-5.7** · comparação visual não executada não é verde (D-093) | 25/09 | "VERDE COM LACUNA" no npm test, NÃO FECHA no portão · carimbo na base local · S1086–S1088 |
| **ST-5.2** · o rodapé do banner entre o avatar e o Pokémon (D-082) | 25/09 | a primeira correção caiu sobre o avatar e a FOTO pegou · a ferramenta mede os dois lados · S1084–S1085 |
| **ST-3.3** · o mapa de emissão por recurso | 25/09 | fixture de medição determinística · achou a L-185 (maratona: 8,7× a Essência calibrada) · S1082–S1083 |
| **ST-3.4 · ST-3.5** · DEC-08 travada por teste; o custo da nova tentativa antes de entrar | 25/09 | as duas decisões aplicadas como padrão (recomendação = código) · S1079–S1081 |
| **ST-3.2** · duas abas não colhem a mesma coisa duas vezes | 25/09 | save com revisão (otimista) + evento `storage` · S1072–S1076 |
| **T14c** · Q2 do bloco por TRECHO, não por arquivo | 25/09 | o 1.32b ia a 130 mutantes (~2,7 h) por 30 linhas no index.html · S1077–S1078 |
| **ST-3.1** · o baú cai em Estilhaço até o estágio 3 (L-159, e a L-160 junto) | 25/09 | 1·2·3 partes por unidade; inteiro no 4 · S1065–S1071 |
| **ST-2.3** · o veterano vê a noite (L-183) | 25/09 | fada na noite: 7·8·3·3 rotas · S1064 |
| **1.32b · ST-2.1 · ST-2.2** · os climas à vista (fecha a L-177) | 25/09 | legenda por estágio, perguntada ao motor · a run diz quem a condição trouxe · S1057–S1063 · capturas `tools/previas/_climas/` |
| **ST-1.2 · ST-1.3** · o Sair desloga; a boutique não vende sem cobrar (D-109, D-108) | 25/09 | `sair.mjs` em camada 0 · `podeComprar` com `contaOnline` · S1050–S1056 |
| **ST-1.1** · o teto sente a run colhida (D-107) | 25/09 | 6 testes · S1044–S1049 · reserva até a colheita |
| **T14** · os testes em minutos | 25/09 | `npm test` 6 min 10 s → 1 min 45 s · `repetir` 2/2 · Q2 do bloco 39/39 em 13 min · pedido do dono |

### A fila, na ordem

> **As fichas** (escopo, fora, aceite, sabotagem) de cada linha abaixo estão em
> `docs/PLANO_DE_IMPLEMENTACAO.md`, pelo id `ST-x.y`. A evidência, em
> `docs/CRUZAMENTO_DOCS_CODIGO_2026-09-25.md`.

| # | bloco | o que é | por que aqui |
|---|---|---|---|
| 1 | ~~**1.32b (resto)** · ST-2.3~~ | ✅ fechada em 25/09 — a noite muda 7·8·3·3 rotas | — | a revisão juntou os dois (PROD-134): o jogador entende as POSSIBILIDADES antes e o elenco efetivo depois, sem revelar o clima oculto. A prévia da NOITE já está na sala desde o 1.33 |
| 2 | ~~**INT-01**~~ | ✅ fechado em 25/09 (ST-1.1, 3.1 a 3.5). Sobra a **ST-3.6** (calibrar a emissão), que espera a **DEC-14** | — | integridade de economia vem antes de calibrar quantidade |
| 3 | **INT-02** · uma posse confiável | cosméticos e outfit entre dispositivos (L-157, L-055) | compra e equipar não podem depender do navegador |
| 4 | **1.27g · UX-01** (resto) · ST-5.5b, 5.6, 5.8 | L-186 (o jato), L-175 (⏸️ DEC-15), D-086 — o banner (D-082), o `est:` cru (L-160), a base visual (D-093), os números de dano (L-172, ST-5.4) e a carga e o projétil (L-171, ST-5.5) fecharam; os 404 (L-176) esperam o dono commitar os dois arquivos | o que impede ENTENDER a ação vem antes do que a enfeita |
| 5 | **1.30** · os 34 ícones de item | L-137 | ⏸️ **espera o dono** mandar a arte |
| — | **E6** · higiene documental | ST-6.1 a 6.4 | não é código: corre em paralelo, um commit por story |
| — | **ST-0.6** · CI no GitHub | `npm test` a cada push; Q2 fatiado à noite | espera a **DEC-13** |
| — | **T11 · T12 · T7** · arnês | ❄️ **CONGELADO** — *(ST-6.2, 25/09: a linha dizia "T11 · T8 · T4 · T7", e só o T11 era arnês pendente: o **T4 está fechado ✅** no BUILD_BLOCKS, e o **T8** era a tarefa de documentos feita em 08/09. Entram o **T12** — dono do D-105, que estava órfão da fila — e o **T7**, dono da L-173, que ainda não tem ficha)* | entra só quando IMPEDIR um bloco desta tabela, com orçamento nomeado antes (`CLAUDE.md`, 16/09) |

### Esperando decisão do dono

| id | a pergunta | o que depende dela |
|---|---|---|
| **DEC-11** | manter os 154.000 sims? O argumento dos 19% caiu (L-182) | custo de servidor; nos testes é só 30% das sondas de navegador (medido, ST-0.8) — decide-se pela economia |
| **DEC-15** | L-175: em 420 px a run mostra 130 px de mundo (cabem 3 criaturas; a luta tem 6). Proposta: na tela estreita, o zoom EFETIVO vira `min(zoom escolhido, largura ÷ 260)` — no largo nada muda (3× cabe). Mas "acima do piso o zoom é do jogador e ninguém mexe" é regra sua, e os 3× foram aprovados por você: afastar a câmera sozinha passaria por cima disso | ST-5.6 — não construída sem o seu sim |
| **L-176** | commitar `assets/npc/lojas.mp4` e `battle-theme.mp3` do seu PC (só existem aí) | ST-5.1 — a regra do resgate proíbe trocar por outro arquivo |
| **DEC-14** | a emissão do Avanço (L-185): teto por recurso, rendimento decrescente, ou recalibrar o Estilhaço? | ST-3.6 · recomendação: rendimento decrescente por run no mesmo dia |
| **DEC-13** | CI no GitHub Actions? | ST-0.6 — minutos de Actions num repositório privado |
| ✅ DEC-12 | ~~o Q2 do bloco pode adiar o que só mudou de fecho?~~ **adotada** pelo pedido do dono de 25/09 ("minutos"); o preço está na ST-0.4 | o `portoes` |
| DEC-01 · 02 · 03 | tema e direitos · RMT · pagamento e poder | qualquer coisa com dinheiro real |
| DEC-07 | o que o OFF encerra (o Sair já foi consertado, ST-1.2) | a ST-1.2b (revogar token no servidor) |
| ✅ DEC-08 · 09 | ~~captura mostrada ou base · stamina por tentativa~~ aplicadas como padrão em 25/09 (a recomendação era o código); o dono pode reverter — é um teste e uma frase | — |
| DEC-04 · 05 · 06 | curva do laboratório · Vulcão sem raro · outfits à venda | os blocos donos, quando chegarem |
| ✅ DEC-10 | ~~qual relógio governa o mundo~~ **Brasília para todos** (25/09) | o 1.34 e o 1.33 |

Série DEC-01 a DEC-11 = Revisão 2.0 (`docs/revisao-2026-09-24/`); DEC-019,
DEC-075, DEC-095… = mapa de decisões do dono. Não confundir.

### Aberto e sem bloco na fila — o que o Avanço deixou

Todos com dono nomeado, todos em `docs/LACUNAS.md`.

| lacuna | o que é | bloco dono |
|---|---|---|
| ~~**L-171**~~ | ✅ fechada na ST-5.5 (25/09): a carga e o projétil saem antes e chegam no instante do dano | — |
| **L-186** | o jato (`beam`) — Surf no nível 20; Flamethrower, Thunderbolt, Ice Beam… no 50 | 1.27g (ST-5.5b) |
| ~~**L-172**~~ | ✅ fechada na ST-5.4 (25/09): 0 pares em 3 execuções — os "1 a 3" eram a sonda contando o mesmo número duas vezes | — |
| **L-175** | em 420 px a janela da câmera tem **130 px de mundo** contra 403 no panorâmico. Cabem três criaturas, e o bando é de quatro mais companheiro e treinador — o que sai da janela não é o efeito, é a luta | o do CENÁRIO |
| **L-177** | o jogador não sabe QUE CLIMAS EXISTEM antes de montar a equipe. Revelar qual vai cair estragaria a escolha; revelar a tabela, não | 1.32b |
| ~~L-178~~ | ✅ fechada no 1.33 — a noite e o clima mudam o elenco | — |
| **L-183** | o veterano quase não vê a noite: 2 das 11 rotas mudam no estágio 4 | 1.32b |
| **L-184** | a fauna de enfeite do cenário não sabe que é noite | o do CENÁRIO |
| **L-167** | `engine/avanco-bola.mjs` ficou sem chamador desde que a bola saiu da run | 1.27b |
| **L-173** | varrer as ferramentas de plantio por campo DERIVADO escrito à mão (consequência do D-087) | T7 |
| **L-176** | `battle-theme.mp3` e `lojas.mp4` dão 404 na abertura | 1.31b |
| **L-158** | quais dos 9 outfits vão à venda | ⏸️ espera o dono |
| **L-117** | o repasse do RMT | ⏸️ decisão de negócio, segurada duas vezes |
| **L-143** | o Vulcão tem 14 espécies e ZERO na faixa "raro" | ⏸️ recomendação escrita, esperando veredito |
| **L-144** | a curva do laboratório B1..B7 | ⏸️ espera o dono |

### Defeitos abertos

> **Critério desta tabela:** os defeitos que um bloco da fila vai tocar. A
> contagem inteira, depois da ST-6.3 (25/09, marcas postas só onde o corpo já
> registrava o conserto): **15 fichas sem marca de fechada** em `DEFEITOS.md` —
> D-031, 034, 038, 039, 040, 047, 050, 053, 056, 060, 077, 078, 086, 097, 108.
> Em `LACUNAS.md` a normalização ficha a ficha segue aberta (128 sem marca, 57
> sem linha de Estado) — é o resto da ST-6.3.

| defeito | o que é | estado |
|---|---|---|
| ~~D-107~~ | o teto de encontros volta cheio depois de colher a run | ✅ ST-1.1, 25/09 |
| D-108 | com conta real, o cosmético da boutique sai de graça | 🟡 mitigado na ST-1.3 (não vende); o conserto é o E4 |
| ~~D-109~~ | o ⏻ não desloga a conta real | ✅ ST-1.2, 25/09 |
| ~~D-082~~ | o rodapé do banner passa por baixo do mon da vitrine na tela da run | ✅ ST-5.2, 25/09 |
| **D-086** | `sala-cliente` é INSTÁVEL — vermelho uma vez, verde na seguinte | aberto · não reproduzido em 20 execuções sob carga (25/09) |
| ~~D-093~~ | a linha de base visual LOCAL comparava consigo mesma num clone novo | ✅ ST-5.7, 25/09 |

### E as três que travam o projeto e não são código

Estão na Parte IV, e continuam sem dono:

```text
1. a consulta de enquadramento regulatório (Spec §0.5.1) — BLOQUEIA a tag da v0.9
2. a arte do ContentPack original (Spec §0.3.1) — prazo: antes do fim da V1
3. a política de publicidade e afiliados — sem dono em nenhum documento
```

---


### ✅ Prioridade 0 — O AVANÇO: o idle passa a ser assistido *(§7.22 — FECHADA em 10/09/2026)*

> **Esta prioridade está cumprida.** A ficha abaixo é o que ela pedia, mantida
> porque ela explica POR QUE o Avanço entrou na frente de tudo — e essa razão
> continua governando os blocos de clima, dia e noite que vêm depois.
>
> O que ficou de pé, medido: dez waves com quatro mobs cada e um chefe 1x1 na
> décima; a batalha dentro do cenário do bioma, com o treinador atravessando o
> mapa; golpes liberados por nível; sprites de efeito da Arena caindo sobre o
> alvo; o quadro do "quem apareceu"; e o clima como buff de farm.
>
> **A fila que veio depois dela está em `docs/ORDEM_APOS_O_AVANCO.md`**, e o
> estado dela está na seção *O que falta*, logo abaixo.

---

#### A ficha original, preservada

**Por que ela entra na frente de tudo:** porque ela muda a forma de todos os
blocos que estavam na fila. Construir o quadro de log, o farm multi-bioma e a
loja de essência no desenho antigo seria construir para uma tela que já se sabe
que vai mudar — e é exatamente o que a regra central do `CLAUDE.md` proíbe.

> É a exceção prevista na *divisão de trabalho*: a ideia que **muda o bloco em
> curso** entra agora, porque terminar na forma antiga seria construir algo que
> já se sabe errado.

**O desenho está inteiro no §7.22 da Spec.** O resumo em cinco linhas:

```text
o jogador escolhe o estágio de um bioma e ASSISTE
10 waves — 9 de 6 mobs, a 10ª com os dois chefes = 58 mobs
o CHEFE é a evolução do mob, e sai do pack: não há tabela escrita à mão
mob NÃO consome teto; ESPÉCIE consome — 6 por avanço, 5 avanços no dia
o modo de hoje continua vivo como o modo AUSENTE, e divide o mesmo teto
```

| bloco | escopo | tamanho |
|---|---|---|
| **A1** ⏳ | o elenco do estágio: 4 + 2 derivados do pack e da linha evolutiva | M |
| **A2** ⏳ | a resolução da wave — poder × ameaça, roteiro por wave a partir da semente | M |
| **A3** ⏳ | HP dentro do avanço · stamina por wave · a poção · falhar custa o baú | M |
| **A4** ⏳ | **a batalha na tela** — a coreografia da Arena vestida no bioma | G |
| **A5** ⏳ | as três unidades separadas de verdade: abate, encontro, avanço | M |
| **A6** ⏳ | a bola durante o avanço, e "quem apareceu" alimentado pelas waves | P |
| **A7** ⏳ | o modo AUSENTE ganha nome, aviso ao enviar e relatório ao voltar | P |


#### O que a trilha A já entregou ✅ *(08/09/2026)*

Motor puro, camada 0, com portão fechado. **Não são protótipos** — é produto,
commitado e sabotado.

| bloco | o que entregou | onde |
|---|---|---|
| **A1** ✅ | o elenco do estágio SAI DO PACK — e devolveu os quatro que o dono nomeou de cabeça | `engine/elenco-estagio.mjs` |
| **A2** ✅ | a resolução da wave: poder × ameaça, escala-livre, aparada nas duas pontas | `engine/wave.mjs` |
| **A3** ✅ | HP, stamina por wave, as quatro poções canônicas, e o baú | `engine/avanco.mjs` |
| **A5** ✅ | as TRÊS UNIDADES: abate ≠ encontro ≠ avanço — é o que salva o teto do §P5 | `engine/avanco.mjs` |
| **A6** ✅ | a bola durante o avanço — **uma por espécie, por run** | `engine/avanco-bola.mjs` |
| **A7** ✅ | a RESERVA, o que cada modo rende, e o treino do banco | `engine/ausente.mjs` |
| **A4a** ✅ | a run acontece NO RELÓGIO — o roteiro da wave, e quem fecha a aba recebe a mesma run | `engine/roteiro-wave.mjs` · `engine/run-avanco.mjs` |

**O A4 é grande (G), e foi cortado em cinco.** O corte é por ENTREGA e não por
tamanho: cada um deles fecha com o jogo jogável e a suíte verde, que é a regra
central do `CLAUDE.md`. O veredito do dono chegou em 08/09 e nada mais bloqueia.

| bloco | escopo | estado |
|---|---|---|
| **A4a** ✅ | o roteiro da wave e a run no relógio — motor puro | feito em 08/09 |
| **A4b** ✅ | a batalha NA TELA: três colunas, a cena DENTRO do cenário, o log, o vínculo, o banner | feito em 08/09 |
| **A4c** ✅ | a mão do jogador (poção, bola), o que a run PAGA, e o teto da L-151 | feito em 08/09 |
| **A4d** ✅ | a duração pela FORÇA e o foco valendo no Avanço (L-152, L-153) | nível 50 caiu de 31,9 min para 11,5; nível 4 segue em 33,8 |
| **A4e** ✅ | **ROTA OFF / TRAINER OFF vira aba própria** (L-154), e o banco treina | a L-146 previa os dois modos na MESMA aba; o dono corrigiu, e ele está certo — ROTAS pede que o jogador FIQUE, ROTA OFF que ele SAIA |
| **A4f** ✅ | a leitura da run: Hunt Analyzer (L-141), ícones no log, verde/vermelho na wave, retratos na coluna | a caixa estava desenhada e aprovada na prévia, e chegou pela metade |
| **A4g** ✅ | a batalha que se LÊ — folha de ataque, o companheiro com placa e balão, números de dano visíveis, e o **D-079** | o dono cobrou "barra preta" duas vezes; a causa eram SETE variáveis de cor que nunca existiram |

**Medido no fecho da trilha A, e cada número tem teste que o refaz:**

```text
elenco da mata 1   caterpie · weedle · metapod · kakuna + butterfree · beedrill
                   — derivados do pack, e não escritos
a curva            porta do estágio 1: limpa 45% · 2: 42% · 3: 14% · 4: 45%
o dano             ~5 por wave vencida · ~15 por perdida · ~95 a run, de 100
a stamina          23 por avanço — 4 runs por criatura, e o dia comporta 5
o ritmo            avanço 9,0 enc/h · Batida 5,3 · Trilha 2,3 · Vigília 1,5

A RUN INTEIRA      37,3 min de média (60 runs, nível 5, sem poção)
                   mínimo 29 · máximo 45 · wave média alcançada 9,8
                   O §7.22.5 previa "~40 min" antes de qualquer medição
a wave             2 a 4 min · levas de DOIS mobs, em duelo
o duelo            12 a 90 s cada, e o teste afirma a faixa
o abate            1/30 do que um encontro paga — +32% na run, e não o dobro

suíte              1765 → 1831 · com navegador 1910
Q2                 862 → 892 defeitos plantados
```

**O que a trilha A custou em defeitos achados, e todos entraram com ficha:**

```text
D-078   a guarda de reduced-motion escrita ANTES da declaração não pega, e
        ela abortava o Q2 numa execução a cada três
        (achado ao fechar o A4b; era pré-existente, e de acessibilidade
         antes de ser do portão)
```

**Sete sabotagens escaparam ao longo da trilha, e as sete viraram afirmação.**
A lição que elas repetem é a que abre o `CLAUDE.md`, e ela apareceu em quatro
formas distintas: medir um lugar e falar do conjunto; afirmar contra si mesmo;
conferir uma coisa contra ela própria; e usar `dentro(v, alvo, tol)` como se
fosse faixa.



**Três correções do dono entraram no meio da trilha:**

```text
os SPRITES     "tem que ser as MESMAS da ARENA" — folhas PMD, e não GIF
a STAMINA      35 travava o novato em duas runs. Virou 23, e ele tinha razão
a CURA         "os danos precisam ser coniventes com a cura" — virou TESTE
               MEDIDO, e não dois números escritos lado a lado
```


**Portões que a trilha exige:** Q1 Q2 **Q4** (a curva de vitória é
estatística) **Q5 nas duas metades** (é a tela olhada por horas) Q7 (o arranjo
muda inteiro) Q9.

**O que ela NÃO faz, e é decisão:** não toca no motor da Arena. A Arena resolve
12 lutadores com Monte Carlo e precificação; o avanço resolve 1 a 3 criaturas
contra 6 mobs. **O que se reaproveita é a linguagem da encenação — resolve
primeiro, encena depois —, e não o motor.**

**Bloqueado por:** as capturas de layout do dono, e a decisão sobre o chefe RNG
(§7.22.11). Nada de arranjo se decide antes delas.

---

### 🥈 Prioridade 1 — os blocos PAUSADOS, que voltam DENTRO do Avanço ⏸️

Ordem congelada em 04/09/2026, por decisão do dono: *"você no momento irá pausar
e armazenar, não descarte"*. **Nenhum deles foi descartado**, e todos têm lacuna
aberta com bloco dono nomeado.

> **A pauta completa está em `docs/historico/PAUTA_2026-09-08.md`** — pedida pelo
> dono em 08/09, e ela lista lacuna a lacuna, com quem pediu cada uma. Arquivada
> em 25/09 (ST-6.1): é registro, e a fila é a seção *O QUE FALTA*.

#### T8 — alinhar as fichas ao mapa ✅ *(feito em 08/09/2026)*

Ao montar a pauta apareceu uma divergência SISTEMÁTICA: sete fichas da
`LACUNAS.md` apontavam para blocos diferentes dos que este documento publica.

```text
L-112  dizia 1.25    ->  1.27       L-123  dizia 1.32/1.33  ->  1.31
L-136  dizia 1.26    ->  1.31       L-125  dizia 1.32/1.33  ->  1.31
L-138  dizia 1.28    ->  1.29       L-119  dizia 1.29       ->  1.32
L-139  dizia 1.28    ->  1.29
```

A causa é conhecida: as fichas foram escritas em 02–03/09 com uma numeração, e
este mapa foi reescrito em 04/09 com a fila reorganizada em volta do Avanço.
As fichas não vieram junto.

> Duas verdades sobre o mesmo trabalho são o começo de duas filas. Foi o
> defeito que a **L-137** tinha sozinha — e que o dono pegou ao conferir. Ele
> estava em outros seis lugares.

**O ROADMAP vence, porque é ele que publica a ordem.** As sete foram alinhadas,
e cada ficha diz que foi realinhada e quando.

| bloco | o que era | por que ele muda de forma no §7.22 |
|---|---|---|
| **1.27** ✅ | **a Arena legível, o farm que concentra, e a ORDEM que o dono aprovou** — commit `7a85cac` | a ficha 37→53 px, a janela a 40 s (a Spec mudou junto), concentrar ×1,55/×2,00, a escada da dex a 50. E os cinco itens da ordem dele: o FOCO no lugar do vínculo, a recusa do duplo uso (L-162), a bola no fim da run (L-166), o hitbox e os ícones, a wave lenta. Q1 2055/2055 · Q2 940/940 |
| **1.27b** ✅ | **a SALA de rotas e o cartão dobrado** — a L-164, que é o dono reprovando a tela | a rota virou cartão: quem mora, quantas espécies, e a faixa delas — a única linha que DIFERE entre as onze. O cartão da criatura caiu de dez informações para três, com a ficha inteira a um clique. Fechado pelo 1.27d: a Rota OFF voltou ao layout anterior, e o avanço progressivo (v2 dos vídeos) está de pé |
| **1.27c** ✅ | **o combate que o dono pediu em 09/09** — os cinco pedidos | L-168 os golpes liberados por NÍVEL · L-169 quatro por wave (com a densidade separada, senão o estágio 1 virava 100%) · L-170 o chefe 1x1 sorteado, com anúncio · L-171 as sprites de EFEITO da Arena, medidas em 14 estouros por wave · L-172 os números de dano, de 5 pares sobrepostos para 1–3 |
| **1.27d** ✅ | **o que sobrou do L-164** | a prévia das espécies voltou à Rota OFF (0 → 12), e o boneco ATRAVESSA o mapa: wave 1 em [0,103], wave 10 em [601,704]. Achou o D-088 (um `escrever` de outro escopo) e o D-089 (a cena morta com a suíte verde). **Falta**: o `cast` e o `proj` do efeito, que pedem a linha entre atacante e alvo |
| **1.27e** ✅ | **o SUMIÇO da sprite e o efeito FORA DA TELA** — o dono cobrando a mesma tela por três dias | uma linha de `tools/baixar-assets.mjs` pedia as folhas de combate só para o elenco da ARENA (76 de 146): **70 espécies entravam na wave sem `Attack` nem `Hurt` em disco e SUMIAM no golpe**, com a placa de nome no ar. E o estouro do efeito era posto em coordenada de TELA e pintado num canvas de MUNDO — a 3× de escala, fora da janela. Attack/Hurt em disco 76 → **146**; estouros fora da tela **0**; e a esteira passou a esperar o instante do golpe para FOTOGRAFAR. D-090, D-091, D-092 |
| 1.28 ⏸️ | **o quadro de log** (L-141, L-109) — cobrado duas vezes · *(25/09: a base foi absorvida pelo A4 e o log da run existe; o HISTÓRICO permanente de runs segue aberto — `e.avancos` virou só o lançamento do teto no ST-1.1)* | vira o quadro dos DOIS modos (§7.22.9), e é a peça que mais ganha com a mudança |
| ~~1.29 ⏸️~~ | ~~a essência ganha uso~~ — *linha velha: o 1.29 FECHOU (linha de baixo), e o baú virou porta do Estilhaço na ST-3.1 (25/09)* | — |
| **1.29** ✅ | **a Essência vira ESTILHAÇO** — sete partes viram um held item, e o bolso é do BIOMA | fecha o maior buraco de economia aberto: 52,85% de tudo que caía não tinha porta. Feito em 09/09 |
| **1.31** ✅ | **a BOUTIQUE de PokéCash** — o catálogo, a procedência, o preço e a vitrine | 101 peças catalogadas, 33 à venda, 19.750 a coleção inteira. Feito em 09/09 |
| 1.30 ⏸️ | os **34** ícones de item (L-137) — o dono recobrou em 08/09 | não muda de forma — entra assim que a arte chegar |
| 1.31b ⏸️ | as duas lojas e os NPCs (L-136, L-123, L-125) — *renomeado de "1.31" na ST-6.2: o 1.31 é a boutique, fechada; este é o resto, e é o dono da L-176 (os 404 de `lojas.mp4`)* | não muda de forma; depende do cadeado do 1.26, que já existe |
| **1.32** ✅ | **o CLIMA do Avanço** (L-119) — buff de FARM, e não de dano | sete climas mais o Tempo Firme, e o quanto SAI da raridade do tipo: Gelo (4 espécies) paga +30% com equipe cheia, Veneno (33, o órfão que a lacuna apontou) paga +10%. Cinco canais — XP, moeda, material, item raro e **ritmo**, que encurta a wave e é o único que se vê sem ler número. O bônus só paga quem foi ENVIADO, com a mesma régua de vaga do combate. E a chuva na tela é a mesma que mexe no farm: véu, partículas, cartão e linha no log |
| 1.33–1.34 ✅ | dia e noite (L-124) · "como funciona" | a hora do dia passa a ter efeito **visível na wave**; o elenco por condição nasce junto (L-178) |

> **Dois deles não dependem do Avanço em nada** — os ícones (1.30) e as lojas
> (1.31). São candidatos a correr em PARALELO com o A4, e essa é uma decisão de
> ordem que eu tomo quando a arte chegar.


---

### 🥉 Prioridade 2 — fechar a V1 de verdade

Eram três blocos 🟡. O **R20 fechou o F1.11** e o **R21 fechou o F1.10**, os dois
em 23/08/2026. Resta um — a arte do ContentPack original, que depende de você. Enquanto ele
não fecha, "a V1 está pronta" é uma afirmação que não se sustenta.

#### P1.1 — O painel de política monetária ✅ *(R20, 23/08/2026 — fechou o F1.11)*

**Por que foi primeiro:** era a sua ideia do quadro que continuava aberta, e a
única desta lista que responde a uma pergunta de NEGÓCIO — *"a economia está
saudável?"*. O R18 deu a alavanca (definir a margem); faltava o mostrador.

**O que ficou na tela**, em três seções novas do painel:

| seção | o que responde |
|---|---|
| **Favorecimento** | a casa está ficando com mais do que declarou? — edge realizado contra margem configurada, com alerta quando descola |
| **Política monetária** | por onde a moeda entra e sai · FSR e velocidade por balde · DAU, WAU e moeda por usuário ativo |
| **Distribuição** | percentis, Gini, share do topo, fatia abaixo de 1 e 5 stakes Bronze, e o overhang do §10.9 |

E duas correções que a construção obrigou: o bloco de saldos **deixou de ler
`S.carteira`** — um painel de auditoria não pode ler o auditado —, e a
divergência ledger×cache ganhou destaque próprio em vez de uma linha igual às
outras.

> **Escopo ajustado em 23/08/2026, depois de ler o código.** A descrição
> original desta ficha dizia que a conta precisava ser construída. Ela **já
> existe**: `painelEconomico()` (`server/admin.mjs:139`) calcula faucets, sinks,
> circulação, passivo e a divergência ledger×cache — tudo do ledger.
>
> O problema é outro, e é o de sempre: `faucet`, `sink`, `emCirculacao` e
> `divergencia` aparecem **zero vezes** em `app/modules/adm.mjs`. A conta é feita
> a cada chamada e **jogada fora sem ninguém ver** — quinta ocorrência do padrão
> que a advertência no topo deste documento descreve.
>
> **O escopo fechado está em `docs/P1.1_ESCOPO.md`.**

**Das 16 séries do §10.9:** 4 já eram calculadas e passaram a ser desenhadas, 9
foram escritas, e **3 não foram construídas** — League rake, P2P fee e Exchange
só existem a partir da V2. Devolvê-las como zero seria pior que omiti-las: num
painel de auditoria, `0` significa *"medi e deu nada"*, e a ausência significa
*"não medi"*. Na tela as duas se leem igual.

Gráfico é SVG escrito à mão; o projeto não tem dependência e não vai ter.

**O que o OLHAR pegou e a suíte não:** com `height:auto`, o medidor esticava para
~220 px numa coluna de 740 — a geometria estava certa dentro do `viewBox`, e o
CSS a deformava depois. Quinta vez que o passo de olhar pega o que o teste não
pega, e a razão é sempre a mesma: o teste mede o que eu mandei medir.

**Portões:** Q1 Q2 **Q5** Q6 Q9 — o Q5 foi acréscimo ao previsto, e se pagou.

#### P1.2 — Fechar F1.10 formalmente ✅ *(R21, 23/08/2026 — e REABERTO e refechado no bloco 0.1, 29/08/2026)*

> **Esta ficha estava errada, e a leitura do código mostrou.** Ela dizia que as
> sabotagens do bloco nunca tinham sido provadas. **Estavam todas lá** — S261 a
> S264 para o resgate, S265 a S270 para a progressão, S175 a S180 para o teto —
> e verdes.
>
> É a segunda vez seguida (ver a P1.1) que a minha própria ficha superestimou o
> que faltava. A conclusão vale para o resto deste documento: **ler o código
> antes de aplicar é parte do bloco**, não preparação para ele.

**O que faltava de verdade, e era muito maior — `D-034`:** `server/telemetria.mjs`
implementa o §4.7 inteiro — os 20 eventos de proteção, os campos obrigatórios de
cada um, a regra de que evento de proteção nunca é amostrado — e **`emitir()` não
era chamado em nenhum caminho de produção**. A tabela ficava vazia para sempre.

Nenhum destes fatos era registrado: cool-off iniciado, autoexclusão iniciada,
tentativa de reentrada barrada, limite bloqueando uma aposta, sinal de risco
levantado, resgate concedido ou negado, verificação de idade falhando. São
exatamente os eventos que existem para **provar** que a proteção funcionou —
e o §28.7 não pede boa intenção, pede evidência.

Sexta ocorrência do padrão "construído e desligado", e a maior: atingia o portão
Q9 de **quatro** blocos. Os 20 foram ligados, e ficou o teste que impede o
desligamento silencioso — **declarar um evento em `PROTECAO` passa a ser um
compromisso**: sem chamador, a suíte fica vermelha.

**E o `D-035`, que o passo OLHAR pegou:** a semana do §28.8 era `NaN-WNaN`.
`semanaDe` concatenava a hora na data recebida, e o servidor passava um instante
ISO completo — resultado, data inválida para toda entrada. Como
`NaN-WNaN === NaN-WNaN`, a pergunta *"é a mesma semana?"* continuava respondendo
certo, e a vida inteira do jogador ficava arquivada numa semana só: **um resgate
por conta, para sempre**, em vez de um por semana.

Um valor errado que se compara igual a si mesmo é pior que um erro — ele imita a
regra certa.

**Portões:** Q1 Q2 Q6 Q9. **Tamanho real:** M, e não o P que esta ficha previa.

---

##### O que este fechamento não pegou, e custou seis dias — `D-045`

Em 29/08 o bloco 0.1 foi abrir esta ficha para conferir o que faltava, e achou
que **o critério de saída do F1.10 era falso**:

> progressão sobrevive a limpar o navegador

Não sobrevivia. `darXP` e `registrarFeito` existiam em `server/progressao.mjs`
com um chamador cada — os próprios testes. Nenhuma rota de aposta, liquidação ou
laço os acionava, e `app/` não citava `/api/perfil` em lugar nenhum. A máquina
estava pronta e **isolada nas duas pontas**. Limpar o navegador apagava XP,
nível, medalhas, progresso de desafio e trilha.

**Por que o fechamento do R21 não viu.** Ele conferiu as SABOTAGENS do bloco, e
elas estavam todas lá e verdes — a ficha acima registra isso com precisão. O que
ninguém conferiu foi o CRITÉRIO DE SAÍDA, que é outra pergunta e se parece o
bastante com a primeira para passar por ela. Havia até um teste de "limpar o
navegador" verde no repositório: `test/laco-servidor.mjs`, que mede o **saldo** —
critério do F1.14, não deste.

*Um teste que checa algo PARECIDO com o que importa não protege nada* — a lição
do R40, aqui na sua forma mais cara.

**O que fechou de verdade, no bloco 0.1:** a liquidação passou a conceder XP e
desafio, derivando posição e abates da simulação (sem migração: a batalha é
determinística a partir da raiz já guardada); a regra de XP e a aritmética de
colocação mudaram para `engine/`, porque passaram a ter dois donos; o cliente
ganhou `perfil-dados.mjs` com o contrato de modo servidor; e o boot hidrata o
perfil junto com a carteira.

E ficou o teste com a forma do critério — `test/progressao-ligada.mjs` —, mais
seis defeitos plantados (S513 a S518) que sabotam a LIGAÇÃO, e não as regras.

**A regra é dividida, e isso é decisão:** o servidor é dono de XP, desafios e
trilha; o `localStorage` continua dono do cosmético, porque o esquema do servidor
não tem coluna para `battle` nem `shiny` — que nasceram na V1.15, depois do
F1.10. Copiar o "com sessão não se escreve" da carteira teria apagado do R24 ao
R43. Ver a `L-055`.

#### P1.3 — A arte do ContentPack original ⏳ *(fecha F1.12, e é a `L-042`)*

**Por que:** é uma das **três coisas que travam o projeto** listadas no
`CLAUDE.md`, e a única com prazo — *"antes do fim da V1"*.

**Onde exatamente estamos, conferido no código:** `ARTE_EMPRESTADA_DE` está
`null` em `content/escolhido.mjs`, então **o empréstimo de arte não está
travando a tag hoje**. O jogo roda no pack de desenvolvimento inteiro — nome e
arte vindos do mesmo lugar, que é a decisão certa.

Isso não fecha o F1.12: o que falta é o pack `original_v1` ter os **próprios
desenhos**. Hoje ele pinta silhueta para toda espécie sem arquivo em
`arte/original/`. Enquanto isso, ele existe e é jogável, mas não é o produto que
o §0.3.1 descreve.

**O que NÃO fazer, e está escrito no código:** vestir o pack original com a arte
do pack de desenvolvimento. Já foi tentado e produziu *"um Pinsir chamado
Lúmenara"* — as duas metades certas, a combinação sem sentido. Arte emprestada
só faz sentido quando arte e nome vêm do mesmo tema.

**Depende de você**, como o Rayquaza dependia.

---

### Prioridade 3 — o que você pediu e ainda não tem escopo

#### P2.1 — As cédulas de PokéCash ⏳

Você disse que mandaria os arquivos. Quando chegarem: a carteira mostra a nota
com a arte, e o depósito passa a exibir a cédula da quantia.

**Uma sugestão de desenho, para você decidir:** a nota como **objeto que se
acumula**, e não só como ícone — a carteira mostrando quantas de cada valor você
tem, do jeito que uma carteira real mostra. Dá peso ao saldo sem mudar regra
nenhuma, e encaixa com o §5.5, que já separa o dinheiro em baldes por
proveniência.

**Tamanho:** P. **Depende de:** os arquivos.

#### P2.2 — O sistema VIP 💤 → precisa de decisão antes de escopo

Esta é a ideia do quadro que **nunca foi marcada OK**, e eu preciso ser direto:
**do jeito que está descrita, ela conflita com um princípio permanente da Spec.**

> **P5 — Progressão sem pay-to-win competitivo.**

A descrição diz que o VIP teria "vantagem na hora de escolha para determinados
Pokémon considerados melhores", com "maiores chances de vir esses Pokémon" na
pool. Isso é **pool diferente por dinheiro pago** — e a pool decide a odd. Dois
jogadores na mesma arena deixariam de estar na mesma arena.

Há um problema pior que o de princípio: a Arena publica o commit-reveal do §4.5
justamente para provar que a rodada é a mesma para todos. Pool preferencial
quebra essa prova.

**Três caminhos que dão a sensação de VIP sem quebrar o P5** — todos preservam
"mesma pool, mesma odd, mesma prova":

| caminho | o que o VIP ganha | por que não quebra o P5 |
|---|---|---|
| **conforto** | temas exclusivos, cenários de banner, molduras, mais vagas de skin shiny | nada toca probabilidade |
| **informação** | histórico estendido, comparador de odds, exportar o próprio ledger | a informação já é pública; o VIP paga por *conveniência* |
| **cadência** | mais desafios diários, trilha de login mais longa, XP acelerado | mexe em progressão, e o P5 só proíbe vantagem **competitiva** |

**A minha recomendação:** conforto + cadência. Informação estendida é a que mais
se aproxima da linha, porque "ver melhor" numa casa de apostas *é* vantagem — e
o §28.7 tem coisas a dizer sobre isso.

**Precisa da sua decisão antes de virar bloco.**

---

### Prioridade 4 — V2, e é aqui que o jogo ganha profundidade

A Spec é clara sobre por que a V2 mudou de "Coleção" para "Mercados":

> **A Arena não tem teto de habilidade.** Com odd derivada de `1/p`, o valor
> esperado é idêntico para toda aposta. **Não há o que dominar.**

Isso é o diagnóstico mais importante do documento inteiro, e ele explica por que
a retenção tem limite hoje: quem joga bem e quem joga mal têm o mesmo resultado
esperado. Um produto assim entretém, mas não fideliza.

#### P3.1 — Liga de Previsão ⏳ *(§6.8 — antecipada de propósito)*

**Por que ANTES dos mercados mútuos:** é barata, **não tem risco regulatório**
(não move dinheiro) e ataca a retenção imediatamente. A Spec a antecipou da V5
para a V2 exatamente por isso.

**O que é:** o jogador registra um palpite sem apostar, e acumula uma pontuação
de **acurácia** — não de lucro. Ranking por quem lê melhor o motor.

**Por que funciona:** cria o teto de habilidade que a Arena não tem, sem tocar
na economia. E produz o dado que a P3.2 precisa para calibrar.

**Tamanho:** M. **Portões:** Q1 Q2 Q4 Q9.

#### P3.2 — Mercados mútuos ⏳ *(§6.3 a §6.7)*

Preço formado por jogadores, com apuração mútua e rake — em vez de odd fixa da
casa. É a mudança que dá teto de habilidade de verdade.

**Aviso de dependência:** o §25.1 exige o checkpoint antes de ligar qualquer
coisa de valor econômico real, e a **consulta de enquadramento regulatório**
(§0.5.1) é a primeira das três coisas que travam o projeto. Mercado mútuo é
onde isso deixa de ser teórico.

**Tamanho:** G. **Depende de:** P3.1 (para calibração) e do checkpoint §25.1.

---

### Prioridade 5 — o metagame

**V3 Coleção, Criação e Informação** (§7) · **V4 Time e Jornada** (§8) ·
**V5 Liga** (§9).

Estão especificados em detalhe e **não devem começar antes da V2**. A razão está
na própria Spec: sem teto de habilidade, o metagame vira um segundo jogo dentro
do mesmo aplicativo — foi o erro que a v1.5 corrigiu.

---

## Parte III — Ideias minhas, para você julgar

Nenhuma destas está na Spec nem no seu quadro. Vão em ordem do que eu acho que
mais agrega pelo que custa.

#### I.1 — A rodada tem história 🟢 *barato, alto retorno*

Hoje a rodada acaba e some. O commit-reveal já guarda tudo o que é preciso para
**reproduzi-la**: raiz, sal, elenco, odds.

**A ideia:** um endereço permanente por rodada — "rodada #4821" — que qualquer
um abre e vê a luta acontecer de novo, com as odds daquele momento. Compartilhar
uma virada vira um link.

**Por que agrega:** transforma a promessa de auditabilidade, que hoje é um
parágrafo na tela de Regras, em algo que se **usa**. E é aquisição orgânica: um
link de uma virada boa é um convite.

**Custo:** P. A infraestrutura já existe inteira.

#### I.2 — O "quase" contado com honestidade 🟢

Quando o seu lutador cai em 2º, a tela diz que você perdeu. O motor sabe muito
mais: quantos por cento de vida faltaram, em que segundo virou.

**A ideia:** uma linha só, factual, no lugar da frase de incentivo genérica —
*"Blastoise caiu com 12% de vida, no segundo 38 de 45"*.

**O cuidado, e é o que a torna aceitável:** o §28.7 proíbe linguagem que sugira
que o resultado é influenciável. "Quase!" é proibido. **Um fato medido não é** —
e ele respeita mais o jogador do que uma frase de consolo.

**Custo:** P.

#### I.3 — O dossiê do treinador 🟡

O perfil mostra o que você fez. Não mostra **como você aposta**: se prefere
favorito ou zebra, se acerta mais em qual clima, qual tipo lhe rende.

**Por que agrega:** é a ponte natural para a Liga de Previsão (P3.1) — o dossiê
é onde a acurácia vira identidade. E é o tipo de coisa que faz voltar.

**O cuidado:** mostrar padrão de aposta a um apostador é informação de risco
(§28.7). O mesmo dado que ajuda a "melhorar" ajuda a perseguir prejuízo. **Eu
proporia construí-lo junto com o sinal de risco**, e não antes.

**Custo:** M.

#### I.4 — Arenas com regra própria 🟡

Hoje as quatro arenas mudam a pintura, e o clima muda os stats. As duas coisas
são independentes.

**A ideia:** cada arena com uma regra que **muda a leitura da odd** — a Praia
favorece Água de forma publicada, o Vulcão encurta a luta. Publicada antes da
aposta, entra no Monte Carlo, aparece no registro do §4.4.5.

**Por que agrega:** dá o que pensar antes de apostar, que é o embrião do teto de
habilidade — e é bem mais barato que os mercados mútuos.

**O cuidado:** mexe no motor e na precificação. Exige Q4 (regressão estatística)
e refazer a `margem.json`.

**Custo:** M-G. **Não fazer antes da V2** — pode conflitar com o desenho dos
mercados.

#### I.5 — Modo espectador ❌ *proposta e descartada*

Assistir sem conta. Registro aqui porque a análise vale: parece aquisição
barata, mas a sala é autenticada por desenho (F1.6), e abrir um caminho não
autenticado ao fluxo da rodada é superfície nova de ataque por um ganho que a
I.1 (rodada com história) entrega **melhor e sem risco** — porque um replay não
precisa de conexão viva.

---

## Parte IV — As três coisas que travam o projeto e não são código

Do `CLAUDE.md`, e continuam abertas:

1. **Consulta de enquadramento regulatório** (§0.5.1) — bloqueia a P3.2.
2. **Arte do ContentPack original** (§0.3.1) — prazo: antes do fim da V1 (P1.3).
3. **Política de publicidade e afiliados** — sem dono em nenhum documento.

---

## Parte V — O que fica registrado e ainda não tem bloco

Ver `docs/LACUNAS.md` e `docs/DEFEITOS.md`. Em 23/08/2026 as quatro lacunas
abertas da trilha R foram fechadas (L-044 a L-047) e os dois defeitos também
(`D-028`, `D-029`).

No mesmo dia, ao subir o servidor para teste, **dois defeitos novos apareceram**
— nenhum no escopo da P1.1, e ambos registrados em vez de consertados de
passagem:

- **D-030** — clone limpo não sobe: o SQLite não cria o diretório `dados/`, e a
  mensagem de erro não diz isso.
- **D-031** — o backend escuta só em `127.0.0.1`. **É por isso que o celular
  nunca abriu**, e nenhum ajuste de firewall mudaria. Precisa de decisão antes
  de correção: trocar por `0.0.0.0` expõe carteira e admin à rede local.
- **D-032** — o `semTexto` do arnês perde a sincronia em literal de expressão
  regular que contenha aspas. O sintoma no R20 foi barulhento (falso positivo),
  mas o risco é o contrário: código mascarado como se fosse texto vira símbolo
  que **desaparece antes de ser procurado** — um `PEGOU` falso.
- **D-033** — a linha de base visual **fotografa GIF animado**, e por isso
  depende do relógio: o quadro que um GIF mostra é função do tempo de parede.
  `reducedMotion` não congela GIF. Ela não estava estável — estava com sorte, e
  a sorte é função da carga da máquina. Faz o portão Q2 abortar de vez em
  quando. Corrigir exige regravar linhas de base, então precisa de bloco próprio.
- **D-034** — o §4.7 inteiro estava construído e **nunca era chamado**. Achado e
  **corrigido no R21**: os 20 eventos de proteção foram ligados, e ficou o teste
  que impede o desligamento silencioso.
- **D-035** — a semana do §28.8 era `NaN-WNaN` para toda data, o que transformava
  "um resgate por semana" em "um resgate por conta, para sempre". Achado no
  passo OLHAR e **corrigido no R21**.
