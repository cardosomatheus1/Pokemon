/* UMA FOTO DO BANNER DE VERDADE, para a prévia parar de inventar um.
 *
 * ── O ERRO QUE ESTA FERRAMENTA CONSERTA ──────────────────────────────────
 *
 * Ao pôr o banner na prévia do Avanço eu DESENHEI um — gradiente, nome em
 * degradê, selos inventados. O dono corrigiu na hora:
 *
 *   > "é o mesmo formato de banner qual usamos já na ARENA, e implementamos no
 *   >  ROTAS, e agora vamos implementar no ATUAL ROTAS"
 *
 * E ele está certo. O banner existe desde a trilha R (R3 e R10), é desenhado
 * por `renderBattleBanner`, e o idle já o mostra desde o bloco 1.6c —
 * `#battleBannerIdle`. Inventar outro é a mesma classe de erro do cenário
 * desenhado de lado:
 *
 *   > Uma prévia que redesenha o que já existe não está prevendo a nossa tela.
 *   > Está prevendo outra, e ainda por cima uma que ninguém vai construir.
 *
 * ── E ELA É UMA FERRAMENTA, E NÃO UM PRINT ──────────────────────────────
 *
 * O banner é cosmético: molduras, cenas e efeitos mudam, e o dono tem 64 peças
 * só para ele. Um print guardado numa pasta envelheceria calado. Rodar isto de
 * novo é o que atualiza a prévia.
 *
 * Uso:
 *   node tools/foto-banner-real.mjs [--seletor "#battleBannerIdle"]
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
const BASE = arg('base', 'http://localhost:8099');
const SELETOR = arg('seletor', '#battleBannerIdle');
const SAIDA = join(RAIZ, arg('saida', 'app/previa/banner-real.png'));

const { chromium } = await import(pathToFileURL(PW).href);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const pg = await (await b.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,      /* o banner tem texto: a 1x ele sai borrado na prévia */
})).newPage();

await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'domcontentloaded' });
await pg.click('.nav[data-view="viewIdle"]');
await pg.waitForTimeout(1200);
/* A escolha da primeira criatura só aparece para quem ainda não tem uma. */
const escolha = await pg.$('.idleInicial');
if (escolha) { await escolha.click(); await pg.waitForTimeout(1600); }

const el = await pg.$(SELETOR);
if (!el) { await b.close(); console.error(`"${SELETOR}" não está na tela`); process.exit(1); }
const caixa = await el.boundingBox();
if (!caixa || caixa.height < 10) {
  await b.close();
  console.error(`"${SELETOR}" está na página mas não tem tamanho — ` +
                'o banner só desenha quando há expedição em campo?');
  process.exit(1);
}
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, await el.screenshot());
await b.close();
console.log(`${SELETOR}  ${Math.round(caixa.width)}x${Math.round(caixa.height)} -> ${SAIDA}`);
