import { readFileSync, writeFileSync } from 'node:fs';
const P = 'docs/DEFEITOS.md';
let s = readFileSync(P, 'utf8');
if (s.includes('## D-094')) throw new Error('ja existe');

s = s.replace(/\s*$/, '\n') + `

---

## D-094 — um script de reversão duplicou 3 725 linhas do \`app/index.html\`

**Achado em:** 13/09/2026, pelo pré-voo do portão Q2.
**Bloco dono:** 1.32. **Estado:** CORRIGIDO — \`tools/conserta-index.mjs\`.

Ao separar o bloco do clima do bloco do cartão em dois commits, escrevi um
script que **desfazia** o segundo. Ele cortava o arquivo por índice de string
(\`indexOf\` + \`slice\`) e remontava as partes. Uma das âncoras casou no lugar
errado:

\`\`\`text
antes     7 861 linhas
depois   11 586 linhas
o diff    3 725 inserções, ZERO remoções — puro texto duplicado
\`\`\`

### O arquivo abria, rodava, e tinha metade do conteúdo duas vezes

Não houve erro de sintaxe, não houve \`pageerror\`, e a suíte sem navegador
passou. O HTML tolera um \`<style>\` com regras repetidas e uma \`<div>\` a mais —
a última regra ganha, e a tela fica parecida o bastante para ninguém desconfiar.

> **Editar um arquivo de 8 000 linhas por recorte de string é operação sem
> rede.** Ela não falha com uma exceção: falha com um arquivo que abre.

### Quem pegou, e por que ele pegou

O **pré-voo do Q2**, que confere que cada defeito plantado ainda tem onde ser
plantado — âncora presente **exatamente uma vez**:

\`\`\`text
30 defeito(s) plantado(s) sem valor:
S310 [ÂNCORA AMBÍGUA] app/index.html — casa 2 vezes; planta na primeira
S325 [ÂNCORA AMBÍGUA] ...
\`\`\`

Ele existe para outra coisa — achar defeito cuja âncora um bloco moveu — e
acabou sendo o único mecanismo do arnês capaz de ver duplicação. Trinta âncoras
ficando ambíguas de uma vez não é coincidência, e é a mesma assinatura do D-089
(três contadores indo a zero juntos).

### A correção, e o método dela é a parte que fica

Procurar e apagar o trecho duplicado exigiria acertar as MESMAS fronteiras que
já tinham errado uma vez. Em vez disso, \`tools/conserta-index.mjs\`:

\`\`\`text
1. parte de uma base que o git garante   git show HEAD:app/index.html
2. reaplica as duas inserções do 1.32    pequenas, e verificáveis uma a uma
3. CONFERE o tamanho final               base + o que foi inserido, exato
4. CONFERE cada marcador                 nenhum pode aparecer duas vezes
\`\`\`

O passo 3 é o que faltava na primeira vez. Um script que edita e não confere o
que produziu está apostando que a âncora dele estava certa — e âncora de string
num arquivo grande é exatamente a coisa que não se deve apostar.

### E o episódio custou mais do que este defeito

O mesmo script era a metade "desfazer" de uma manobra para separar dois commits.
A outra metade — um backup do bloco em \`/tmp\` — **evaporou** quando a sessão foi
interrompida e o diretório temporário foi limpo três dias depois. O bloco do
cartão da equipe (1.27f) teve de ser refeito do zero.

> **Backup em diretório temporário não é backup: é uma aposta com prazo.** Para
> pôr trabalho de lado neste repositório existe um mecanismo que não evapora, e
> é um commit — mesmo que seja um commit de rascunho que depois se reescreve.

A regra que fica, e ela vale para qualquer manobra futura de separar commits:

\`\`\`text
NUNCA   git checkout <commit> -- <arquivos>   sobrescreve o ÍNDICE junto, e
        leva o trabalho staged sem avisar. Já custou quatro arquivos em 10/09
NUNCA   backup em /tmp para atravessar uma sessão
SEMPRE  commit de rascunho, e reescrita depois com rebase ou amend
\`\`\`
`;
writeFileSync(P, s);
console.log('ok');
