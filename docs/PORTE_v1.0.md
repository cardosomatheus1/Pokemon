# Porte da v1.0 do trabalho paralelo

Um segundo desenvolvedor trabalhou **em cima do protótipo v0.8 congelado**, no
formato de arquivo único, enquanto esta linha reconstruía o jogo em blocos. Este
documento é o inventário do que ele fez, medido e não estimado, e o plano de
trazer tudo para cá sem perder nada dos dois lados.

**A partir da próxima rodada ele trabalha sobre esta versão.** Este porte é a
última vez que as duas linhas precisam se encontrar.

---

## A notícia boa, e ela decide o resto

**O motor não foi tocado.** O extrator de paridade (`tools/snapshot-prototipo.mjs`)
tirou as 26 declarações do motor dos dois arquivos e comparou:

```
26 declarações · 32.302 bytes de cada lado
diferença: 6 linhas, em UMA função
```

A única divergência é `showdownSlug`, que ele endureceu:

```js
/* protótipo v0.8 */  slug.replace(/-/g,'')
/* v1.0 do amigo  */  String(slug).toLowerCase()
                        .replace(/♀/g,'f').replace(/♂/g,'m')
                        .replace(/[^a-z0-9]/g,'')
```

Nosso `slugExterno` já é essa função **menos** o mapeamento de ♀/♂ — corrigimos o
mesmo problema no D-002, pelo outro lado: paramos de passar o nome de exibição
onde se espera o slug. Medido nas 146 espécies do pack: **zero diferenças de
saída** entre as duas versões.

**Consequência prática: nenhum golden muda, nenhuma fixture de batalha muda,
nada do que os blocos F0.1 a F0.12 construíram entra em conflito com o motor.**
Tudo o que ele fez está na camada de produto.

---

## O que ele adicionou

Medido por varredura de funções, ids de DOM e blocos de CSS.

| # | Família | Tamanho | Conflita com o que fizemos? |
|---|---|---|---|
| 1 | **Identidade Neon/Cyberpunk** — 2 temas, tokens, pele | 1.031 linhas de CSS novas + 215 de tokens, 3 imagens, fonte Orbitron | ✅ **PORTADO no V1.13** |
| 2 | **Bug do XP** (pré-existente) | 1 linha | **Nós temos o mesmo defeito** → D-006 |
| 3 | **Arenas variadas** — 6 biomas sorteados | 12 funções de desenho | Camada de render + linha de base visual |
| 4 | **Shinys** — GIF cosmético e skin de arena | 6 funções | ContentPack (`sprite()`) e a cópia local do F0.12 |
| 5 | **Baús** — economia calibrada, pity | 11 funções, 1 tela | **NÃO ENTRA NO PORTE** — decisão do dono. Ficam no nosso roadmap, com o nosso cálculo |
| 6 | **Painel de ADM** — `#adm`, PIN 7777 | 15 funções, 1 tela | **`CONF.MARGIN` mutável** vs. registro de precificação |
| 7 | **Colocação e pódio** — banner de batalha | 6 funções | — |
| 8 | **Fragmentos por rodada** | 1 função | Carteira |
| 9 | **Cancelar aposta** | 1 função | **Passivo do §4.4.6** — precisa liberar exposição |
| 10 | `showdownSlug` endurecido | 4 linhas | Já temos, menos ♀/♂ |

---

## Os cinco conflitos reais, e por que cada um é um bloco

Não é teimosia de processo: cada um destes muda uma garantia que já está sob
teste, e trazer o código como está apagaria a garantia sem ninguém notar.

### C1 · O painel de ADM mexe em `CONF.MARGIN`

Ele documenta a decisão bem: a margem do painel é a **mesma** exibida ao lado das
odds, de propósito, para o painel não criar odd secreta.

O problema é que `CONF` virou constante congelada do motor, e a margem agora
aparece em três lugares que se conferem: `margemConfigurada` e `margemEfetiva` no
registro de precificação (§4.4.5), e a fixture `margem.json`, que afirma 8 % em
300 rodadas × 8.000 simulações. Margem mutável em tempo de execução derruba a
medição — não por estar errada, mas por a fixture medir outra coisa.

**O encaixe certo:** a margem passa a ser parâmetro da rodada, gravada no
registro, e a fixture mede a margem *configurada naquela rodada*.

### C2 · Baús — resolvido tirando do porte

**Decisão do dono: os baús ficam no nosso roadmap, com o nosso cálculo.** A
implementação dele não é portada.

E é a decisão certa pelo motivo que este verbete já apontava. A tabela dele
resolve a distribuição, que é a parte fácil. A parte difícil é o que o §5.5
obriga a decidir: PokéCash de baú é PC-T ou PC-B? Em PC-T seria dinheiro sacável
nascendo de graça — exatamente o que a proveniência da carteira existe para
impedir. Herdar a implementação junto com a economia seria herdar a decisão sem
tomá-la.

**O que fica como insumo, e é bom:** 3.000.000 de aberturas com qui-quadrado em
cinco sementes, medição de independência entre prêmios consecutivos,
autossustento de 4,7 %, e o desenho da garantia com pior caso em 20.000
jogadores simulados. Em `prototype-v1.0/IDENTIDADE-VISUAL.md`.

### C3 · Cancelar aposta libera passivo

O F0.8 registra passivo por lutador na confirmação. Cancelar sem devolver o
passivo trava o mercado daquele lutador pelo resto da rodada; devolver sem
cuidado abre a corrida que o teste do §4.4.6 fecha.

### C4 · Skin shiny troca o sprite dentro da luta

O `sprite()` é do ContentPack desde o F0.4, e o F0.12 baixa a arte para `assets/`.
Shiny são **mais 304 folhas** (76 × 4) e mais 76 GIFs. O baixador cobre o que o
pack pede; skin shiny muda o que o pack pede.

### C5 · Tema e arenas mudam a linha de base visual

12 telas gravadas. Regravar é o certo — é mudança intencional —, e a regra do
`CLAUDE.md` exige explicar a diferença no mesmo commit.

---

## O que dá para trazer sem bloco

- **D-006, o bug do XP.** É defeito nosso, que ele encontrou. Correção de uma
  linha, com prova de que nenhum nível muda.
- **♀/♂ no `slugExterno`.** Quatro caracteres de reforço; nossa correção do D-002
  já resolve pelo caller, e isto é rede.

---

## Onde a referência está guardada

`prototype-v1.0/` — a v1.0 dele, congelada, **sem a arte de terceiros**
(`assets/`, `battle-theme.mp3` removidos pelo mesmo motivo de sempre). Ela não
roda a partir dali; serve para consultar código durante o porte, como
`prototype/` serve de referência do v0.8 desde o F0.1.

As três artes que ele criou (`portal-arena.jpg`, `cidade-neon.jpg`,
`nucleo-orbe.jpg`) **entram no repositório**, em `arte/`.

> **Eu tinha aplicado a regra errada e tirado as três.** A regra do `CLAUDE.md`
> é *não versionar material de terceiros* — as folhas do PMDCollab, os GIFs do
> Showdown, o `battle-theme.mp3`. Estas foram **geradas para este projeto**, e
> ele escreve isso na própria documentação: *"não somam nenhuma dependência de
> terceiro"*. Arte nossa fora do repositório não é disciplina, é trabalho
> perdido.
>
> A separação virou explícita, com `arte/README.md` a explicando: **`arte/` é
> nossa e entra no git; `assets/` é de terceiros e não entra.** Confundir as
> duas custa dos dois lados — versionar arte de terceiros é problema de licença,
> e deixar a nossa de fora é perder trabalho.

## Ordem proposta

1. ~~**D-006**~~ ✅ — o defeito, corrigido.
2. ~~**V1.13 Identidade visual**~~ ✅ — a maior peça e a de menor risco lógico.
3. **V1.14 Arenas variadas** — render, depois do tema (compartilham a pele).
4. **V1.15 Colocação, pódio e banner de batalha** — sem conflito.
5. **V1.17 Shinys** — a fonte do cosmético vira decisão do bloco, já que o baú
   saiu do porte.
6. **V1.18 Painel de ADM** — por último: resolve C1. Sem o simulador de baús.
8. **Cancelar aposta** entra no V1.15, que é o bloco que mexe na tela de aposta.

Os seis blocos estão escritos em `POKEARENA_BUILD_BLOCKS`, com escopo, método,
portões e sabotagem, como os outros.

## O portão de egresso fechado continua fechado

As três artes serem nossas resolve o que eu tinha levantado como pendência: elas
já estão no repositório, servidas da mesma origem que o resto do jogo, então o
teste do F0.12 — que aborta **toda** requisição externa — segue valendo sem
exceção nenhuma. Não há endereço de origem a combinar.

> **Por que o tema vem antes das arenas e dos baús:** a pele é o que dá coerência
> visual a tudo o que vier depois. Portar baú com a pele antiga significaria
> reestilizar o baú duas vezes.
