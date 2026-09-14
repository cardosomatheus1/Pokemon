/* Atualiza o `docs/RETOMAR.md` — o ponto exato de onde continuar.
 *
 * Uso único, versionado junto. Âncora exata, aborta se não casar uma vez.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'docs/RETOMAR.md';
let s = readFileSync(P, 'utf8');

const i = s.indexOf('## 1. O que ler primeiro, nesta ordem');
if (i < 0) throw new Error('ancora secao 1');

const novo = `## 0. ONDE PARAMOS — 13/09/2026

\`\`\`text
o LINK     http://localhost:8099/app/index.html
           sobe com:  node tools/servir.mjs --porta 8099
a PASTA    C:\\Users\\gdult\\pa4
o ESTADO   b0fe29f no git · o 1.32 (clima) VERDE na árvore, esperando commit
\`\`\`

### Duas coisas que você precisa saber antes de qualquer outra

**1. O bloco 1.32 está pronto e NÃO commitado.** Clima do Avanço: sete climas,
o bônus saindo da raridade do tipo, cinco canais, véu e partículas na cena,
cartão e linha no log. Q1 verde 2043/2043. Falta o Q2 e o commit — a mensagem
está pronta em \`docs/CONTINUAR.md\` §4.

**2. O bloco do cartão da equipe (1.27f) se PERDEU e precisa ser refeito.** Ele
estava construído e verde. Eu o desfiz com as próprias mãos para separar dois
blocos em dois commits, guardei o backup em \`/tmp\`, a sessão foi interrompida, e
três dias depois o \`/tmp\` tinha sido limpo.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** O
> lugar de pôr trabalho de lado neste projeto é um commit de rascunho.

O que ele era está descrito item a item em \`docs/CONTINUAR.md\` §3, com as
capturas de antes e depois em \`tools/previas/_cartao/\`.

### E um estrago que o mesmo episódio causou, já consertado

O script de reversão cortou o \`app/index.html\` por índice de string e duplicou
**3 725 linhas** — de 7 861 para 11 586, com zero remoções. O arquivo abria,
rodava, e tinha metade do conteúdo duas vezes.

Quem pegou foi o pré-voo do Q2, com trinta defeitos plantados de âncora
ambígua — porque o trecho que cada um procura passou a existir duas vezes.

\`\`\`text
o conserto   tools/conserta-index.mjs — reconstrói de HEAD e reaplica as duas
             inserções do 1.32, CONFERINDO o tamanho final e cada marcador
o resultado  7 861 -> 7 906 linhas (base + 45 do clima)
\`\`\`

> Editar um arquivo de 8 000 linhas por recorte de string é operação sem rede.
> Ela não falha com erro: falha com um arquivo que abre e roda.

---

`;

s = s.slice(0, i) + novo + s.slice(i);
writeFileSync(P, s);
console.log('ok —', s.split('\n').length, 'linhas');
