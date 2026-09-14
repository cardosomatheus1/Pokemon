/* UMA FOTO DO CENÁRIO DO BIOMA, para a prévia do Avanço (§7.22).
 *
 * Por que existe, e por que ela é uma FERRAMENTA e não um print à mão:
 *
 * A primeira prévia do Avanço desenhou o cenário à mão, DE LADO — gradiente
 * verde, copas em bolha, criaturas flutuando. O cenário de verdade é TOP-DOWN
 * em tile GBA, e ele já está construído há dez blocos (1.5c a 1.15).
 *
 *   > Uma prévia que desenha por cima um cenário PIOR que o que já existe não
 *   > está prevendo a nossa tela: está prevendo outra, e mais feia.
 *
 * E a descoberta que a foto trouxe vale mais que a foto: **a nossa vista já é
 * a vista do Baiak.** Top-down, tile, criaturas andando pelo chão. O que falta
 * para o Avanço não é uma câmera nova — é o que se move dentro dela.
 *
 * A foto sai do <canvas> do próprio jogo, pela mesma porta que o Q5 usa. Se o
 * cenário melhorar amanhã, rodar isto de novo é o que atualiza a prévia — e é
 * por isso que ela não pode ser um print guardado numa pasta.
 *
 * Uso:
 *   node tools/foto-cena.mjs [--bioma floresta] [--saida app/previa/cena.png]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.PW_MODULO;
const CHROME = process.env.PW_CHROME;
if (!PW) { console.error('falta PW_MODULO — ver tools/README.md'); process.exit(2); }

const arg = (n, p) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : p;
};
const BIOMA = arg('bioma', 'floresta');
const SAIDA = join(RAIZ, arg('saida', `app/previa/cena-${BIOMA}.png`));
const BASE = arg('base', 'http://localhost:8099');

/* Caminho do Windows não é URL: sem `pathToFileURL` o `import` recusa o
   esquema. Mesma linha do `contato-video.mjs`, e pelo mesmo motivo. */
const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'domcontentloaded' });
await pg.click('.nav[data-view="viewIdle"]');
await pg.waitForTimeout(1200);

/* A escolha da primeira criatura só aparece para quem ainda não tem uma.
   Clicar sem conferir quebraria a foto do save que já escolheu.

   O seletor é `.idleInicial`, e eu tinha escrito `[data-inicial]` — um atributo
   que não existe. O sintoma não foi "não achei o botão": foi o CANVAS ficando
   escondido oito segundos, porque a tela de escolha é que estava por cima.

     Seletor errado não falha onde ele é escrito. Falha no passo seguinte. */
const escolha = await pg.$('.idleInicial');
if (escolha) { await escolha.click(); await pg.waitForTimeout(1600); }

/* ── O BIOMA SE ESCOLHE PELA FAIXA DE BAIXO ────────────────────────────────
   Casar por TEXTO parecia certo e não era: o rótulo aparece em quatro lugares
   — a faixa, o título do mapa, a prévia do estágio e a wiki — e o localizador
   resolveu para quatro elementos, sendo o primeiro o próprio canvas.

     O dataset é o que a tela PROMETE; o texto é só o que ela mostra. */
const alvo = await pg.$(`[data-bioma="${BIOMA}"]`);
if (alvo) { await alvo.click(); await pg.waitForTimeout(1800); }

/* O cenário é canvas, e ele tem nome. A folha nasce de DENTRO dele, e não de
   um recorte da janela — assim ela não carrega borda de interface, não depende
   do scroll, e sai na resolução própria do mundo. */
await pg.waitForSelector('#idleMundo', { timeout: 8000 });
await pg.waitForTimeout(2500);            /* deixa a fauna e a água andarem */
/* ── E ELA SAI AMPLIADA EM NUMERO INTEIRO ─────────────────────────────────
   O canvas do mundo tem 273x174 de verdade e e esticado por CSS ate ~817 com
   `image-rendering: pixelated`. Fotografar o buffer cru devolveria uma imagem
   quatro vezes menor que a que o jogador ve, e olhar num tamanho onde a
   diferenca nao cabe e o mesmo que nao olhar — foi a licao da Poke Ball.

   Ampliar por 3 com o alisamento DESLIGADO e o unico jeito honesto: o pixel
   vira um quadrado de 3x3 e a arte continua sendo a mesma arte. Fator inteiro
   de proposito; 2,5 borraria a grade do tile. */
const dados = await pg.evaluate(() => {
  /* ── SÃO DUAS TELAS, E NÃO UMA ────────────────────────────────────────
     A primeira foto saiu SÓ COM O CHÃO — verde e vazia, sem árvore, sem água,
     sem criatura. O mundo é desenhado em camadas: `#idleMundo` é o terreno e
     `#idleAtor` é tudo que se mexe. Fotografar a de baixo e chamar de cena é
     o mesmo erro de sempre: eu peguei o primeiro elemento que casou com o
     nome e não conferi se ele era a coisa inteira.

       Uma camada não é a cena. A cena é a soma delas, na ordem. */
  const c = document.querySelector('#idleMundo');
  const a = document.querySelector('#idleAtor');
  if (!c || c.width < 100) return null;
  const F = 3;
  const g = document.createElement('canvas');
  g.width = c.width * F; g.height = c.height * F;
  const x = g.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(c, 0, 0, g.width, g.height);
  if (a && a.width === c.width) x.drawImage(a, 0, 0, g.width, g.height);
  return g.toDataURL('image/png');
});
await b.close();

if (!dados) { console.error('nenhum canvas de cenário na tela'); process.exit(1); }
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, Buffer.from(dados.split(',')[1], 'base64'));
console.log(`${BIOMA} -> ${SAIDA}`);
