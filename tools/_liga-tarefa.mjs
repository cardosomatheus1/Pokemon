/* Liga a TAREFA_1.27f_CARTAO.md nos documentos que apontam o caminho.
 * Âncora exata, aborta se não casar uma vez — a lição do D-094.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const trocar = (p, de, para, nome) => {
  let s = readFileSync(p, 'utf8');
  const n = s.split(de).length - 1;
  if (n !== 1) throw new Error(`${p}: âncora "${nome}" casa ${n}x — esperado 1`);
  writeFileSync(p, s.replace(de, para));
  console.log('  ligado:', p, '·', nome);
};

/* ── 1 · CONTINUAR.md: a seção 3 passa a apontar para a ordem de serviço ── */
trocar('docs/CONTINUAR.md',
`### 1º — refazer o cartão da equipe (1.27f)

**Por que é o primeiro:** é um pedido do dono que está em aberto desde 10/09, e
ele já o cobrou uma vez. E é trabalho que já foi feito e provado — refazer é
barato, redescobrir não.`,
`### 1º — refazer o cartão da equipe (1.27f)

> ## ⏳ A ORDEM DE SERVIÇO COMPLETA ESTÁ EM \`docs/TAREFA_1.27f_CARTAO.md\`
>
> Ela tem as seis mudanças arquivo a arquivo, os três testes que mudam junto, os
> quatro defeitos plantados novos, a ferramenta de olhar que se perdeu, e como
> fechar o bloco. **Quem for assumir começa por lá.**
>
> O resumo abaixo existe para você saber se é isto que quer fazer agora. A
> execução está lá.

**Por que é o primeiro:** é um pedido do dono que está em aberto desde 10/09, e
ele já o cobrou uma vez. E é trabalho que já foi feito e provado — refazer é
barato, redescobrir não.`, 'seção 3');

/* ── 2 · ROADMAP.md: a linha da fila aponta para a tarefa ────────────────── */
trocar('docs/ROADMAP.md',
'| 2 | **1.27f** · o cartão da equipe | **PERDIDO — refazer** | o dono pediu os stats e o nível de evolução de volta no cartão. Estava pronto e verde; eu o desfiz para separar commits e o backup evaporou. O que ele era está em `docs/CONTINUAR.md` §3 |',
'| 2 | **1.27f** · o cartão da equipe | **PERDIDO — refazer** | o dono pediu os stats e o nível de evolução de volta no cartão. Estava pronto e verde; eu o desfiz para separar commits e o backup evaporou. **A ordem de serviço completa está em `docs/TAREFA_1.27f_CARTAO.md`** — seis mudanças, três testes, quatro defeitos plantados, e como fechar |',
'fila do roadmap');

/* ── 3 · RETOMAR.md: idem ────────────────────────────────────────────────── */
trocar('docs/RETOMAR.md',
`O que ele era está descrito item a item em \`docs/CONTINUAR.md\` §3, com as
capturas de antes e depois em \`tools/previas/_cartao/\`.`,
`**A ordem de serviço para refazer está em \`docs/TAREFA_1.27f_CARTAO.md\`** —
escrita para ser executada por quem não acompanhou a conversa: as seis mudanças
arquivo a arquivo, os três testes que mudam junto, os quatro defeitos plantados
novos, e a ferramenta de olhar que se perdeu com ele.

As capturas de antes e depois estão em \`tools/previas/_cartao/\` e servem de
alvo.`, 'retomar');

/* ── 4 · o índice do pacote ──────────────────────────────────────────────── */
trocar('docs/LEIA-ME-DO-PACOTE.md',
`CONTINUAR.md       o estado EXATO em 13/09: o que está commitado, o que está na
                   árvore sem commit, o que se perdeu e precisa ser refeito, e a
                   ordem do que vem depois. É o arquivo mais importante daqui`,
`CONTINUAR.md       o estado EXATO em 13/09: o que está commitado, o que está na
                   árvore sem commit, o que se perdeu e precisa ser refeito, e a
                   ordem do que vem depois. É o arquivo mais importante daqui
TAREFA_1.27f_CARTAO.md
                   a ORDEM DE SERVIÇO do próximo bloco, escrita para ser
                   executada por quem não acompanhou nada: seis mudanças arquivo
                   a arquivo, três testes que mudam junto, quatro defeitos
                   plantados, e a pergunta que fecha a peça`, 'leia-me');

console.log('ok');
