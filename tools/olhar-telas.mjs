/* OLHAR — captura as telas do jogo em PNG, para leitura humana.
 *
 * É o passo 6 do ciclo do bloco (`CLAUDE.md`). NÃO é portão: não reprova nada,
 * não compara com nada. Ele produz o que um portão não sabe produzir — uma
 * imagem para alguém ler.
 *
 * POR QUE ISTO EXISTE. No V1.15 três defeitos passaram por 299 testes verdes:
 * um rótulo transbordando o cartão e cobrindo a arte, uma coluna inteira
 * empurrada para fora da dobra, e um campo estreito demais para o próprio
 * placeholder. Nenhum é erro de execução; todos são erros de leitura. O portão
 * Q5 prova que a página FUNCIONA — legibilidade é outra pergunta.
 *
 * AS LARGURAS NÃO SÃO ARBITRÁRIAS: são aquelas em que o layout muda de FORMA.
 * 1920 existe porque o `.app` tem `max-width: 1790px` e o arranjo de cinco
 * colunas só aparece acima disso — a linha de base visual captura em 1440, 1000
 * e 480, e por isso não enxerga esse arranjo (ver D-010).
 *
 * A RAIZ É FIXA por padrão, para que duas execuções sejam comparáveis: mesma
 * pool, mesma arena, mesmo clima. `--raiz aleatoria` desliga isso quando se quer
 * variedade — útil para conferir arenas diferentes.
 *
 * Uso:
 *   node tools/olhar-telas.mjs                    todas as telas, raiz fixa
 *   node tools/olhar-telas.mjs --saida /tmp/x     outro destino
 *   node tools/olhar-telas.mjs --raiz aleatoria   pool e arena variadas
 *
 * Dependência: `playwright-core`, o mesmo do portão Q5. Ver tools/README.md.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, sep } from 'node:path';

const RAIZ_REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PW = '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
};
const SAIDA = arg('--saida', join(RAIZ_REPO, '.telas'));
const RAIZ_FIXA = arg('--raiz', 'fixa') !== 'aleatoria';

if (!existsSync(PW) || !existsSync(CHROME)) {
  console.error('playwright-core ou o Chromium não estão instalados — ver tools/README.md');
  process.exit(2);
}
mkdirSync(SAIDA, { recursive: true });

const MIME = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript', '.js':'text/javascript',
               '.css':'text/css', '.png':'image/png', '.gif':'image/gif', '.jpg':'image/jpeg', '.mp3':'audio/mpeg' };

const srv = await new Promise(res => {
  const s = createServer((q, r) => {
    const p = join(RAIZ_REPO, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(RAIZ_REPO + sep) || !existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    r.end(readFileSync(p));
  });
  s.listen(0, '127.0.0.1', () => res({ s, porta: s.address().port }));
});

const { chromium } = await import(PW);
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const erros = [];
const avisos = [];

async function abrir(largura, altura, preparar) {
  const ctx = await b.newContext({ viewport: { width: largura, height: altura } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  /* SESSÃO ATIVA: sem ela o boot cai na home e a arena nunca aparece. Custou uma
     rodada inteira de capturas descobrir isso. */
  await pg.addInitScript(() => { try { localStorage.setItem('ar_session', '1'); } catch {} });
  if (RAIZ_FIXA) await pg.addInitScript(() => {
    let n = 0x51117777 >>> 0;
    crypto.getRandomValues = a => {
      for (let i = 0; i < a.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; a[i] = n; }
      return a;
    };
  });
  if (preparar) await preparar(pg);
  await pg.goto(`http://127.0.0.1:${srv.porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  /* Esperar ESTADO, não relógio: a rodada custa ~5 s de Monte Carlo e a espera
     fixa pegaria o meio do "calculando odds" numa máquina mais lenta. */
  await pg.waitForFunction(() => {
    const f = document.querySelector('#phase')?.textContent;
    return f && f !== '—' && document.querySelectorAll('.pick').length > 0;
  }, { timeout: 90000, polling: 250 }).catch(() => avisos.push('a fase de apostas não abriu a tempo'));
  await pg.waitForTimeout(1000);
  return { ctx, pg };
}

async function tela(nome, largura, altura, roteiro) {
  const { ctx, pg } = await abrir(largura, altura);
  if (roteiro) await roteiro(pg);
  await pg.screenshot({ path: join(SAIDA, nome + '.png') });
  /* Rolagem horizontal é defeito de layout, sempre — e é barato conferir aqui,
     já que a página está aberta. */
  const r = await pg.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  if (r.doc > r.win) avisos.push(`${nome}: ROLAGEM HORIZONTAL (documento ${r.doc}px em janela ${r.win}px)`);
  await ctx.close();
  console.log(`  ${nome}.png`);
}

const emLuta = async pg => {
  await pg.$eval('#btnStart', el => el.click()).catch(() => {});
  await pg.waitForFunction(() => (+(document.querySelector('#kfTotal')?.textContent || 0)) >= 2,
    { timeout: 60000, polling: 400 }).catch(() => avisos.push('a luta não chegou a dois abates'));
  await pg.waitForTimeout(400);
};

console.log(`capturando em ${SAIDA} (raiz ${RAIZ_FIXA ? 'fixa' : 'aleatória'})\n`);

/* AS QUATRO LARGURAS EM QUE O LAYOUT MUDA DE FORMA. 1920 está aqui porque é a
   única acima do `max-width` do `.app` — é onde o arranjo de cinco colunas
   existe, e é justamente o que a linha de base visual não cobre (D-010). */
for (const [nome, w, h] of [['arena-1920',1920,1000], ['arena-1440',1440,900],
                            ['arena-1100',1100,900], ['arena-420',420,900]])
  await tela(nome, w, h);

await tela('luta', 1440, 900, emLuta);
await tela('luta-larga', 1920, 1000, emLuta);

await tela('aposta-feita', 1440, 900, async pg => {
  await pg.evaluate(async () => {
    const banco = await import('/app/modules/banco.mjs');
    banco.creditarCompra(20000, 'olhar');
    document.querySelector('.pick')?.click();
  });
  await pg.waitForTimeout(600);
});

await tela('perfil', 1100, 1500, async pg => {
  await pg.evaluate(async () => {
    const { S } = await import('/app/modules/estado.mjs');
    const { saveProfile } = await import('/app/modules/perfil.mjs');
    const sh = await import('/app/modules/shiny-dados.mjs');
    S.profile.xp = 40000;
    sh.desbloquear(S.profile, 6, 99); sh.alternar(S.profile, 'skin', 6);
    saveProfile(S.profile);
    (await import('/app/modules/customizacao.mjs')).renderProfile();
    document.querySelector('#profileModal')?.classList.add('show');
  });
  await pg.waitForTimeout(800);
});

await tela('adm', 1440, 1400, async pg => {
  await pg.evaluate(async () => (await import('/app/modules/adm.mjs')).admAbrir());
  await pg.waitForTimeout(800);
});

/* A prova do cosmético: MESMA raiz, mesma pool, mesma arena — muda só a pele.
   Sem fixar a raiz as duas capturas não seriam comparáveis, e "o shiny mudou
   alguma coisa?" viraria opinião. */
for (const [nome, ligado] of [['shiny-nao', false], ['shiny-sim', true]]) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1100 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(String(e).split('\n')[0]));
  await pg.addInitScript(() => { try { localStorage.setItem('ar_session', '1'); } catch {} });
  await pg.addInitScript(() => {
    let n = 0x51117777 >>> 0;
    crypto.getRandomValues = a => {
      for (let i = 0; i < a.length; i++) { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; a[i] = n; }
      return a;
    };
  });
  if (ligado) await pg.addInitScript(() => {
    const p = { xp: 40000, shiny: { gifs: [], skins: [], onGif: {}, onSkin: {} } };
    for (let d = 1; d <= 151; d++) {
      p.shiny.gifs.push(d); p.shiny.skins.push(d); p.shiny.onGif[d] = true; p.shiny.onSkin[d] = true;
    }
    try { localStorage.setItem('ar_profile', JSON.stringify(p)); } catch {}
  });
  await pg.goto(`http://127.0.0.1:${srv.porta}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0,
    { timeout: 90000, polling: 250 }).catch(() => {});
  await emLuta(pg);
  await (await pg.$('#arena')).screenshot({ path: join(SAIDA, nome + '.png') });
  await ctx.close();
  console.log(`  ${nome}.png`);
}

await b.close(); srv.s.close();
console.log(`\nerros de página: ${erros.length ? erros.join(' · ') : 'nenhum'}`);
console.log(`avisos de layout: ${avisos.length ? '\n  ' + avisos.join('\n  ') : 'nenhum'}`);
console.log('\nAgora OLHE as imagens. Verde não é legível.');
