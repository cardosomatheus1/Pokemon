# Registro de defeitos

Defeitos encontrados pelo arnês e ainda não corrigidos, com o bloco a que
pertencem. Um defeito só sai desta lista quando o bloco dono fecha.

A disciplina de blocos proíbe corrigir fora de escopo — ver
`POKEARENA_BUILD_BLOCKS_v1.1.md`, seção 2. Este arquivo é onde o achado fica
enquanto espera o bloco certo.

---

## D-001 — o caminho rápido do motor perde o vencedor em varredura por tempestade

**Encontrado por:** F0.1, invariante I8
**Dono:** F0.2 (motor como módulo — fonte única de comportamento)
**Gravidade:** baixa em magnitude, alta em princípio
**Teste que trava:** `test/invariantes.mjs` → `D-001`

### O que acontece

`simulate(fighters, seed, false)` — o caminho rápido, usado pelas simulações de
Monte Carlo que produzem as odds — devolve `-1` quando um carimbo de tempestade
abate os últimos lutadores vivos no mesmo instante.

`simulate(fighters, seed, true)` — o caminho de gravação, que produz a batalha
que o jogador assiste — devolve um vencedor válido para a **mesma seed**.

### Causa

No ramo da tempestade, o desempate percorre o vetor `hits`:

```js
let w = -1, bp = -1;
for (const h of hits) if (h.beforePct > bp){ bp = h.beforePct; w = h.i; }
return record ? {winner:w, events:ev, duration:t} : w;
```

Mas `hits` só é alimentado dentro de `if (ev)`, e `ev` é `null` quando
`record === false`. No caminho rápido o vetor chega vazio, o laço não executa,
e `w` permanece `-1`.

### Consequência

Medido em 200.000 simulações: **0,034%** delas devolvem `-1`. O
`computeOdds` do protótipo descarta a amostra em silêncio (`if (w >= 0)`).

A magnitude é pequena, mas a natureza não: o descarte **não é aleatório**. Ele
remove exatamente as rodadas que terminam em varredura simultânea, e nessas
rodadas a batalha exibida *tem* vencedor. Os dois caminhos discordam.

Isso contradiz diretamente o princípio declarado do projeto — as odds saem das
20.000 simulações do *mesmo motor* que roda a luta. Hoje não saem: saem de um
motor que, numa fração das vezes, não concorda com o que aparece na tela.

### Correção esperada em F0.2

Alimentar o desempate independentemente de `record`, mantendo `ev` como a única
coisa que o modo rápido pula. A correção muda comportamento agregado, então F0.2
passa a atualizar goldens e baseline no mesmo commit, com a diferença explicada.
