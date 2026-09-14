/* EMPACOTAR O SISTEMA INTEIRO NUM ZIP.
 *
 * Pedido do dono do projeto: "deixe disponível link local e pasta completa com
 * todo nosso sistema".
 *
 * ── O QUE ENTRA, E O QUE NÃO ──────────────────────────────────────────────
 *
 * O que o `git` versiona, e mais nada. Não é economia de espaço: é a diferença
 * entre "o sistema" e "a minha máquina". Ficam de fora, por decisão e não por
 * esquecimento:
 *
 *   dados/           o banco SQLite local, que é estado de UMA execução;
 *   .telas/          capturas do passo OLHAR, que se regeram em um comando;
 *   .git/            a história inteira, que multiplicaria o pacote por dez —
 *                    quem quiser a história clona o repositório.
 *
 * O `assets/` ENTRA. A regra mudou por decisão do dono quando o build passou a
 * ser privado (ver CLAUDE.md): quem abre o pacote consegue jogar sem rodar um
 * comando a mais, que é o ponto de existir um pacote.
 *
 * ── ZERO DEPENDÊNCIA, INCLUSIVE AQUI ─────────────────────────────────────
 *
 * O Windows tem `Compress-Archive` embutido no PowerShell. Chamar o que o
 * sistema já tem é mais honesto que trazer uma biblioteca de zip para dentro de
 * um projeto cuja regra número um é não ter dependência.
 *
 *   node tools/empacotar.mjs             -> pokearena-<data>.zip na área de trabalho
 *   node tools/empacotar.mjs --saida X   -> outro destino
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};

const hoje = new Date().toISOString().slice(0, 10);
const SAIDA = resolve(arg('--saida',
  join(process.env.USERPROFILE || process.env.HOME || RAIZ, 'Desktop', `pokearena-${hoje}.zip`)));

/* A LISTA VEM DO GIT, e não de uma lista escrita à mão que envelhece. Arquivo
   novo entra no pacote no mesmo dia em que entra no repositório. */
const versionados = execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean);

if (!versionados.length) {
  console.error('o `git ls-files` não devolveu nada — isto aqui é um repositório?');
  process.exit(1);
}

/* Copia para uma pasta temporária com o NOME do projeto, para que o zip abra
   como `pokearena/` e não como um monte de arquivos soltos na área de trabalho
   de quem descompactar. */
const palco = mkdtempSync(join(tmpdir(), 'pokearena-pacote-'));
const dentro = join(palco, 'pokearena');
let bytes = 0;
for (const rel of versionados) {
  const de = join(RAIZ, rel);
  if (!existsSync(de)) continue;          // arquivo removido e ainda no índice
  const para = join(dentro, rel);
  mkdirSync(dirname(para), { recursive: true });
  cpSync(de, para);
  bytes += statSync(de).size;
}

/* O LEIA-ME DO PACOTE. Quem abre o zip daqui a três meses não tem esta
   conversa; tem esta pasta. */
const leiame = `PokéArena — pacote de ${hoje}

COMO ABRIR O JOGO

  1. instale o Node 22 ou mais novo (nodejs.org)
  2. nesta pasta, rode:  node tools/servir.mjs
  3. abra o endereço que ele imprimir

Não há \`npm install\`: o projeto não tem dependência nenhuma. É regra, não
economia — ver CLAUDE.md.

  ATENÇÃO — DOIS CLIQUES NO app/index.html NÃO FUNCIONAM.

  A tela abre, mostra "simulando batalhas" e trava ali para sempre. Não é
  defeito: o jogo usa módulos JavaScript, e todo navegador BLOQUEIA módulos
  carregados por \`file://\`. É regra de segurança dele, e não há como
  contorná-la do lado da página.

  O \`tools/servir.mjs\` existe exatamente para isso. Ele não instala nada, não
  abre porta para fora da máquina, e para com ctrl+c.

O QUE TEM AQUI

  app/        o jogo no navegador
  engine/     o motor: batalha, preço, semente, calibração. Não sabe o que é
              um Pokémon — o tema inteiro mora em content/
  server/     o servidor da V2: contas, carteira, rodadas, Liga de Previsão
  content/    o ContentPack. Trocar de tema é trocar este arquivo
  arte/       arte nossa, incluindo o acervo derivado por tools/preparar-acervo
  assets/     cópia local dos sprites, para o jogo abrir sem rede
  test/       a suíte inteira e os defeitos plantados do portão Q2
  docs/       a Spec, o roadmap, os defeitos e as lacunas registradas

POR ONDE COMEÇAR A LER

  docs/PATCHNOTES.pdf            o que mudou, em português e sem jargão
  docs/PASSAGEM.md               para quem PEGA o projeto: as armadilhas e as
                                 decisões já tomadas
  CLAUDE.md                      como se trabalha neste projeto
  docs/POKEARENA_DOCUMENT_INDEX  o índice de todos os documentos
  docs/ROADMAP.md                o que está feito e o que falta
  docs/DEFEITOS.md               defeitos achados, com medição e bloco dono
  docs/LACUNAS.md                trabalho identificado e adiado, com o motivo

RODAR A SUÍTE

  npm test              a suíte (pula o portão visual sem navegador)
  npm run rapido        só o que não precisa de navegador, ~7 s
  npm run portoes       a suíte duas vezes + a sabotagem completa

O portão visual e o Q2 precisam do playwright-core, que mora FORA do
repositório de propósito — ver tools/README.md.
`;
const { writeFileSync } = await import('node:fs');
writeFileSync(join(dentro, 'LEIA-ME.txt'), leiame);

mkdirSync(dirname(SAIDA), { recursive: true });
rmSync(SAIDA, { force: true });

/* `-Force` para sobrescrever, `-CompressionLevel Optimal` porque o pacote é
   feito uma vez e aberto muitas. */
execFileSync('powershell', ['-NoProfile', '-Command',
  `Compress-Archive -Path '${dentro}' -DestinationPath '${SAIDA}' -CompressionLevel Optimal -Force`],
  { stdio: 'inherit' });

rmSync(palco, { recursive: true, force: true });

const mb = n => (n / 1024 / 1024).toFixed(1);
console.log(`\n${versionados.length} arquivos · ${mb(bytes)} MB antes de comprimir`);
console.log(`pacote: ${SAIDA} (${mb(statSync(SAIDA).size)} MB)`);
