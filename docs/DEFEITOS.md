# Registro de defeitos

Defeitos encontrados pelo arnês e ainda não corrigidos, com o bloco a que
pertencem. Um defeito só sai desta lista quando o bloco dono fecha.

A disciplina de blocos proíbe corrigir fora de escopo — ver
`POKEARENA_BUILD_BLOCKS_v1.1.md`, seção 2. Este arquivo é onde o achado fica
enquanto espera o bloco certo.

---

## D-001 — o caminho rápido do motor perde o vencedor em varredura por tempestade ✅ CORRIGIDO

**Encontrado por:** F0.1, invariante I8 · **Corrigido em:** F0.2
**Gravidade:** baixa em magnitude, alta em princípio
**Testes que travam a regressão:** `test/invariantes.mjs` → `D-001` (duas asserções) e `test/paridade.mjs`

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

### Como foi corrigido em F0.2

O desempate deixou de depender de `hits` e passou a ser acompanhado em duas
variáveis soltas (`ultimoIdx`, `ultimoPct`) dentro do mesmo laço. Correto nos dois
modos, e **sem alocar nada no caminho quente** — que era o motivo de `hits` só
existir sob `ev`.

**Goldens e baseline não mudaram**, ao contrário do que se previa. O modo gravação
já preenchia `hits`, então só o caminho rápido tinha comportamento errado. A
previsão de "muda comportamento agregado" estava errada, e é bom que a suíte tenha
provado isso em vez de a gente confiar na previsão.

Evidência da correção:

```text
seed 3846931268   rápido -1 -> 11   gravação 11
seed 3582205302   rápido -1 ->  5   gravação  5
seed 3060347309   rápido -1 ->  1   gravação  1
50.000 amostras   nenhum -1
```

Os testes agora afirmam a correção. Reverter o desempate é a sabotagem S7 e é
detectada por invariantes, estatística e paridade.

---

## D-002 — o nome exibido é usado onde se espera o slug, e quebra o resgate de imagem

**Encontrado por:** F0.3c, na primeira execução do portão Q5
**Dono:** F0.3d (é onde moram customização, perfil e killfeed)
**Gravidade:** baixa em impacto, alta como sinal
**Teste que registra:** `test/visual.mjs` → lista `CONHECIDOS`

### O que acontece

`dexImg(dex, slug, extra)` monta uma cadeia de espelhos e termina no Showdown,
que indexa por nome. O último elo faz `showdownSlug(slug)`.

`showdownSlug` remove hífens e **não remove apóstrofos, acentos ou espaços** —
ela foi escrita para receber o slug cru da PokeAPI, não o nome exibido.

Quatro chamadas passam o nome exibido:

```text
app/index.html:3062   dexImg(m.dex, m.n, …)      ← nome exibido
app/index.html:3074   dexImg(m.dex, m.n, …)      ← nome exibido
app/index.html:3422   dexImg(r.f.dex, r.f.n)     ← nome exibido
app/index.html:3038   dexImg(b.dex, slugDoDex(b.dex), …)   ← correto
```

Consequências, em ordem de visibilidade:

| Espécie | `showdownSlug(nome)` | Efeito |
|---|---|---|
| Farfetch'd | `Farfetch'd` | o apóstrofo fecha a string JS do `onerror` embutido → **SyntaxError**, e a cadeia de resgate morre. A imagem fica quebrada em vez de cair para o espelho |
| Nidoran♀ / ♂ | `Nidoran♀` | URL inválida; o último espelho nunca funciona. Silencioso |
| Mr. Mime | `Mr. Mime` | idem |

### Por que estava invisível

Nenhum teste estático pega: o erro só existe quando a imagem falha **e** a
espécie tem caractere especial no nome. As três espécies afetadas aparecem em
~4% das pools. Foi o portão Q5 — `pageerror` num navegador de verdade — que
achou, na primeira vez que rodou.

### Correção esperada em F0.3d

Passar sempre o slug cru, como a linha 3038 já faz, e endurecer `showdownSlug`
para descartar tudo que não seja `[a-z0-9]`. As duas coisas: a primeira conserta
as chamadas, a segunda impede que o próximo chamador repita o erro.

Enquanto não for corrigido, `test/visual.mjs` mantém o defeito na lista
`CONHECIDOS` — ele aparece no relatório e não reprova o portão.
