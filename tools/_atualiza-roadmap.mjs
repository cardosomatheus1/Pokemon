/* Atualiza o `docs/ROADMAP.md` — cabeçalho, estado e a fila do que falta.
 *
 * Script de uso único, versionado junto com a mudança que ele faz: editar um
 * documento de 783 linhas à mão, por recorte, é a operação que duplicou 3 725
 * linhas do `app/index.html` em 10/09. Aqui cada substituição tem âncora
 * exata e ABORTA se ela não casar uma vez só.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'docs/ROADMAP.md';
let s = readFileSync(P, 'utf8');

const trocar = (de, para, nome) => {
  const n = s.split(de).length - 1;
  if (n !== 1) throw new Error(`âncora "${nome}" casa ${n} vez(es) — esperado 1`);
  s = s.replace(de, para);
};

/* ── 1 · O CABEÇALHO ──────────────────────────────────────────────────── */
const cabecalhoVelho = `**Atualizado em:** 08/09/2026, noite — **o AVANÇO está jogável de ponta a
ponta**. O jogador escolhe a rota, entra, assiste dez waves de duelo dentro do
cenário do bioma, usa poção e bola, e recebe o que a run rendeu.

Faltam duas peças do A4 (a caixa e o modo ausente na mesma aba), e aí a
Prioridade 0 fecha. A pauta do que está pausado continua em
\`docs/PAUTA_2026-09-08.md\`.`;

const cabecalhoNovo = `**Atualizado em:** 13/09/2026 — **a Prioridade 0 FECHOU.** O Avanço está
inteiro: o jogador escolhe a rota numa sala que diz quem mora nela, entra,
atravessa o mapa por dez waves de duelo dentro do cenário do bioma, enfrenta um
chefe 1x1 com anúncio na décima, usa poção, e recebe o que a run rendeu num
quadro que diz o que apareceu.

Depois dela fecharam mais quatro blocos da fila de 08/09 — a Rota OFF como aba
própria, a boutique de PokéCash, o Estilhaço, e o clima do Avanço.

**O que está em voo agora:** o **1.32** (clima) está construído e verde na árvore
de trabalho, esperando o portão Q2 virar commit. E o **1.27f** (o cartão da
equipe) precisa ser REFEITO — ele estava pronto e se perdeu; o que ele era está
descrito em \`docs/CONTINUAR.md\`, seção 3.

**Para retomar o trabalho:** \`docs/CONTINUAR.md\` é o ponto exato de onde seguir.
A pauta do que está pausado continua em \`docs/PAUTA_2026-09-08.md\`.`;

trocar(cabecalhoVelho, cabecalhoNovo, 'cabeçalho');

/* ── 2 · A PRIORIDADE 0 FECHOU ────────────────────────────────────────── */
const p0Velho = `### 🥇 Prioridade 0 — O AVANÇO: o idle passa a ser assistido ⏳ *(§7.22, decidido em 04/09/2026)*`;
const p0Novo = `### ✅ Prioridade 0 — O AVANÇO: o idle passa a ser assistido *(§7.22 — FECHADA em 10/09/2026)*

> **Esta prioridade está cumprida.** A ficha abaixo é o que ela pedia, mantida
> porque ela explica POR QUE o Avanço entrou na frente de tudo — e essa razão
> continua governando os blocos de clima, dia e noite que vêm depois.
>
> O que ficou de pé, medido: dez waves com quatro mobs cada e um chefe 1x1 na
> décima; a batalha dentro do cenário do bioma, com o treinador atravessando o
> mapa; golpes liberados por nível; sprites de efeito da Arena caindo sobre o
> alvo; o quadro do "quem apareceu"; e o clima como buff de farm.
>
> **A fila que veio depois dela está em \`docs/ORDEM_APOS_O_AVANCO.md\`**, e o
> estado dela está na seção *O que falta*, logo abaixo.

---

#### A ficha original, preservada`;

trocar(p0Velho, p0Novo, 'prioridade 0');

/* ── 3 · A FILA DO QUE FALTA, no topo da Parte II ─────────────────────── */
const ancora = `## Parte II — O que está pendente, em ordem de prioridade

A ordem não é a da Spec. Ela segue três critérios, nesta ordem:

1. **o que bloqueia uma decisão de negócio** vem antes do que só acrescenta;
2. **o que fecha um risco** vem antes do que abre superfície nova;
3. **o que é barato e destrava muito** vem antes do caro.

---
`;

const fila = `## Parte II — O que está pendente, em ordem de prioridade

A ordem não é a da Spec. Ela segue três critérios, nesta ordem:

1. **o que bloqueia uma decisão de negócio** vem antes do que só acrescenta;
2. **o que fecha um risco** vem antes do que abre superfície nova;
3. **o que é barato e destrava muito** vem antes do caro.

---

## O QUE FALTA — a fila de hoje, 13/09/2026

Esta seção é a resposta curta. O resto da Parte II é o detalhe de cada item, e
continua valendo.

### Em voo — termine isto antes de abrir qualquer coisa nova

| # | bloco | estado | o que falta exatamente |
|---|---|---|---|
| 1 | **1.32** · o clima do Avanço | construído, Q1 verde 2043/2043 | rodar \`npm run sabotagem\` e commitar. A mensagem está pronta em \`docs/CONTINUAR.md\` §4 |
| 2 | **1.27f** · o cartão da equipe | **PERDIDO — refazer** | o dono pediu os stats e o nível de evolução de volta no cartão. Estava pronto e verde; eu o desfiz para separar commits e o backup evaporou. O que ele era está em \`docs/CONTINUAR.md\` §3 |

### A seguir, na ordem decidida em 08/09

| # | bloco | o que é | por que aqui |
|---|---|---|---|
| 3 | **1.33 · 1.34** | dia, tarde e noite, e o "como funciona" | a regra do dono governa: *efeito VISÍVEL na wave*. Na forma antiga a hora do dia mexia no sorteio do encontro — um número que ninguém vê. Agora o cenário muda de luz, os efeitos do bioma ficam mais fortes à noite, e o elenco do estágio muda com a hora (a L-178 nasce junto) |
| 4 | **T8 · T4 · T7** | a manutenção do arnês | D-049, D-050, D-053, D-060+D-077 (que são o mesmo e devem ser fundidos), o D-078, e o D-093 (a linha de base visual que envelhece calada). Junto: a L-174 — o portão de navegador nunca abre a TELA DA RUN, e a esteira já sabe entrar |
| 5 | **1.30** | os 34 ícones de item (L-137) | ⏸️ **espera o dono**: ele manda a arte um a um |

### Aberto e sem bloco na fila — o que o Avanço deixou

Todos com dono nomeado, todos em \`docs/LACUNAS.md\`.

| lacuna | o que é | bloco dono |
|---|---|---|
| **L-171** (metade) | o \`cast\` e o \`proj\` do efeito — a carga no atacante e o projétil viajando até o alvo. Pedem a linha atacante→alvo, que a cena não publica | 1.27g |
| **L-172** (resto) | de 1 a 3 pares de números de dano ainda se tocam em 420 px | 1.27g |
| **L-175** | em 420 px a janela da câmera tem **130 px de mundo** contra 403 no panorâmico. Cabem três criaturas, e o bando é de quatro mais companheiro e treinador — o que sai da janela não é o efeito, é a luta | o do CENÁRIO |
| **L-177** | o jogador não sabe QUE CLIMAS EXISTEM antes de montar a equipe. Revelar qual vai cair estragaria a escolha; revelar a tabela, não | 1.32b |
| **L-178** | o clima não muda o ELENCO da wave, só o que ela rende | 1.33/1.34 |
| **L-167** | \`engine/avanco-bola.mjs\` ficou sem chamador desde que a bola saiu da run | 1.27b |
| **L-173** | varrer as ferramentas de plantio por campo DERIVADO escrito à mão (consequência do D-087) | T7 |
| **L-176** | \`battle-theme.mp3\` e \`lojas.mp4\` dão 404 na abertura | 1.31b |
| **L-158** | quais dos 9 outfits vão à venda | ⏸️ espera o dono |
| **L-117** | o repasse do RMT | ⏸️ decisão de negócio, segurada duas vezes |
| **L-143** | o Vulcão tem 14 espécies e ZERO na faixa "raro" | ⏸️ recomendação escrita, esperando veredito |
| **L-144** | a curva do laboratório B1..B7 | ⏸️ espera o dono |

### Defeitos abertos

| defeito | o que é | estado |
|---|---|---|
| **D-082** | o rodapé do banner passa por baixo do mon da vitrine na tela da run | aberto |
| **D-086** | \`sala-cliente\` é INSTÁVEL — vermelho uma vez, verde na seguinte | aberto |
| **D-093** | a linha de base visual LOCAL é invisível ao git e envelhece calada. Um clone novo não a tem, e a suíte passa **sem comparar nada** | a deriva foi regravada; a causa de fundo segue aberta |

### E as três que travam o projeto e não são código

Estão na Parte IV, e continuam sem dono:

\`\`\`text
1. a consulta de enquadramento regulatório (Spec §0.5.1) — BLOQUEIA a tag da v0.9
2. a arte do ContentPack original (Spec §0.3.1) — prazo: antes do fim da V1
3. a política de publicidade e afiliados — sem dono em nenhum documento
\`\`\`

---
`;

trocar(ancora, fila, 'parte II');

writeFileSync(P, s);
console.log('ok —', s.split('\n').length, 'linhas');
