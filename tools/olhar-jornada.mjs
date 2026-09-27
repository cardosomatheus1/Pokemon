/* OLHAR O MAPA DE KANTO — a segunda metade do Q5 para a ST-10.12.
 *
 *   node tools/olhar-jornada.mjs [endereco] [pasta]
 *
 * Três pontos do caminho (o começo, o meio, o fim) nas quatro larguras, com a
 * chance do nó escolhido já calculada; e uma luta tirada do mapa em 1440 e
 * 420, com o resultado e o mapa depois dela.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.argv[2] || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PASTA = process.argv[3] || 'tools/previas/_jornada';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const PONTOS = {
  comeco: { vencidos: [], insignias: [], time: [[4, 5]] },
  meio: { vencidos: ['rota1', 'floresta'], insignias: [], time: [[4, 12], [16, 10], [10, 9]] },
  /* ST-10.13: diante de Brock, com a lição aplicada (Squirtle) — a luta dá a insígnia. */
  ginasio: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra'], insignias: [], time: [[7, 14], [16, 13], [19, 13]] },
  /* ST-10.14: diante de Misty com o MESMO Raichu 22 da medição — o que passa
     o Starmie (oculto de velocidade 31) e o que não passa (0). */
  misty: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter'], insignias: ['rocha'], time: [[26, 22, 31]] },
  mistyLento: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter'], insignias: ['rocha'], time: [[26, 22, 0]] },
  /* ST-10.15: diante de Lt. Surge, com e sem um imune a Elétrico — o mesmo
     Raticate ao lado, como na medição. */
  surge: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean'], insignias: ['rocha', 'cascata'], time: [[111, 22], [20, 22]] },
  surgeSem: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean'], insignias: ['rocha', 'cascata'], time: [[59, 22], [20, 22]] },
  /* ST-10.19a: diante da Erika, com e sem quem resiste (Arbok × Tauros); e
     diante do Koga, o MESMO time com o preset errado e com o certo. */
  erika: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion'], insignias: ['rocha', 'cascata', 'trovao'], time: [[24, 36], [20, 30]] },
  erikaSem: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion'], insignias: ['rocha', 'cascata', 'trovao'], time: [[128, 36], [20, 30]] },
  koga: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris'], time: [[112, 42], [135, 38]], preset: 'balanced' },
  kogaCerto: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris'], time: [[112, 42], [135, 38]], preset: 'defensive' },
  /* ST-10.16: diante de Sabrina, o MESMO Arcanine 42 com golpes só físicos
     × só especiais (escolhidos, como o jogador escolhe na aba Time). */
  sabrina: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma'],
             time: [[59, 42, 15, ['Fire Punch', 'Body Slam', 'Extreme Speed', 'Quick Attack']], [143, 36]] },
  sabrinaEsp: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma'],
             time: [[59, 42, 15, ['Flamethrower', 'Hyper Voice']], [143, 36]] },
  /* ST-10.19b: diante do Blaine, o MESMO time (Blastoise e Starmie 44) com o
     preset errado e com o certo; diante do Giovanni, Machamp × Golduck com o
     mesmo Snorlax e o mesmo Arcanine ao lado, como na medição. */
  blaine: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano'], time: [[9, 44], [121, 44]], preset: 'balanced' },
  blaineCerto: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano'], time: [[9, 44], [121, 44]], preset: 'aggressive' },
  giovanni: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano', 'vulcao'], time: [[68, 50], [143, 50], [59, 50]] },
  giovanniCerto: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano', 'vulcao'], time: [[55, 50], [143, 50], [59, 50]] },
  /* ST-10.18: diante do chefe (Zapdos 50), com um time de fim de jogo. */
  chefe: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano', 'vulcao', 'terra'],
           time: [[76, 45], [65, 45], [91, 45]] },
  fim: { vencidos: ['rota1', 'floresta', 'rota22', 'pedra', 'pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian', 'usina'], insignias: ['rocha', 'cascata', 'trovao', 'arcoiris', 'alma', 'pantano', 'vulcao', 'terra'], time: [[5, 18], [17, 17], [25, 15]] },
};

const b = await chromium.launch({ executablePath: CHROME });
const erros = [], achados = [];
async function abrir(w, ponto) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 } });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => erros.push(`${w}/${ponto}: ${e.message}`));
  await pg.addInitScript(p => {
    if (sessionStorage.getItem('ja')) return;
    sessionStorage.setItem('ja', '1');
    const agora = Date.now();
    const cria = (id, dex, nivel, vel = 15, golpes) => ({ id, dex, nivel, ...(golpes ? { golpes } : {}), xp: Math.round(4 * Math.pow(nivel, 2.2)), vinculo: 1, foco: null,
      iv: [15, 15, 15, 15, 15, vel], natureza: 'Hardy', origem: 'inicial', stamina: 100, staminaEm: agora, criadaEm: agora, naCaixa: false });
    localStorage.setItem('ar_session', '1');
    localStorage.setItem('ar_treino_aba', 'jornada');
    if (p.preset) localStorage.setItem('ar_treino_preset', p.preset);
    localStorage.setItem('ar_idle', JSON.stringify({ v: 1, registro: {}, bolsa: {}, expedicoes: [], encontros: [], doces: {},
      criaturas: p.time.map(([dex, nivel, vel, golpes], i) => cria(`c${i}`, dex, nivel, vel, golpes)), jornada: { vencidos: p.vencidos, insignias: p.insignias } }));
  }, PONTOS[ponto]);
  await pg.goto(`${BASE}/app/index.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForFunction(() => document.querySelectorAll('.pick').length > 0, null, { timeout: 90000, polling: 250 });
  await pg.$eval('.nav[data-view="viewTreino"]', el => el.click());
  await pg.waitForFunction(() => { const n = document.getElementById('jnNumero'); return n && !n.classList.contains('parcial') && /%/.test(n.textContent); },
    null, { timeout: 120000, polling: 250 });
  return { ctx, pg };
}

/* `SO=erika,koga` captura só esses pontos (e as lutas deles): com 15 pontos a
   passada inteira passa de 10 min (ST-10.19a). Sem SO, tudo. */
const SO = process.env.SO ? new Set(process.env.SO.split(',')) : null;
const quer = p => !SO || SO.has(p);
for (const ponto of Object.keys(PONTOS).filter(quer)) for (const w of [1920, 1440, 1100, 420]) {
  const { ctx, pg } = await abrir(w, ponto);
  await (await pg.$('#viewTreino .card')).screenshot({ path: `${PASTA}/mapa-${ponto}-${w}.png` });
  const r = await pg.evaluate(() => {
    const caixa = document.querySelector('.jnMapa').getBoundingClientRect();
    const nos = [...document.querySelectorAll('.jnNo')].map(n => n.getBoundingClientRect());
    const fora = nos.filter(r => r.left < caixa.left || r.right > caixa.right || r.top < caixa.top || r.bottom > caixa.bottom).length;
    let sobre = 0;
    for (let i = 0; i < nos.length; i++) for (let j = i + 1; j < nos.length; j++) {
      const a = nos[i], c = nos[j];
      if (a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom) sobre++;
    }
    return { topo: document.querySelector('.jnTopo')?.textContent.replace(/\s+/g, ' ').trim(), painel: document.querySelector('#jnPainel h4')?.textContent,
      chance: document.getElementById('jnNumero')?.textContent, erro: document.getElementById('jnErro')?.textContent,
      lutar: document.getElementById('jnLutar')?.disabled === false, fora, sobre };
  });
  achados.push(`${ponto} ${w}: ${JSON.stringify(r)}`);
  if (r.fora || r.sobre) erros.push(`${ponto} ${w}: ${r.fora} nós fora da caixa, ${r.sobre} pares sobrepostos`);
  await ctx.close();
}

for (const [w, ponto] of [[1440, 'meio'], [420, 'meio'], [1440, 'ginasio'], [420, 'ginasio'], [1440, 'misty'], [420, 'misty'], [1440, 'surge'], [420, 'surge'], [1440, 'sabrina'], [420, 'sabrina'], [1440, 'chefe'], [420, 'chefe'], [1440, 'erika'], [420, 'kogaCerto'], [1440, 'blaine'], [420, 'giovanniCerto']].filter(([, p]) => quer(p))) {
  const { ctx, pg } = await abrir(w, ponto);
  await pg.$eval('#jnLutar', el => el.click());
  await pg.waitForSelector('#jnLuta #pvePalco', { timeout: 10000 });
  await pg.waitForTimeout(2400);
  await (await pg.$('#jnLuta')).screenshot({ path: `${PASTA}/luta-${ponto}-meio-${w}.png` });
  await pg.$eval('#jnLuta [data-pve-pular]', el => el.click());
  await pg.waitForTimeout(600);
  await (await pg.$('#jnLuta')).screenshot({ path: `${PASTA}/luta-${ponto}-fim-${w}.png` });
  if (ponto === 'ginasio' || ponto === 'misty' || ponto === 'surge' || ponto === 'sabrina' || ponto === 'erika' || ponto === 'kogaCerto' || ponto === 'giovanniCerto') await (await pg.$('.jnTopo')).screenshot({ path: `${PASTA}/estojo-entrando-${ponto}-${w}.png` });
  await pg.waitForFunction(() => { const n = document.getElementById('jnNumero'); return n && !n.classList.contains('parcial'); }, null, { timeout: 120000, polling: 250 });
  const resultado = await pg.evaluate(() => ({ fim: document.querySelector('#pveFim h4')?.textContent, texto: document.querySelector('#pveFim p')?.textContent }));
  await pg.$eval('#jnLuta [data-pve-fechar]', el => el.click());
  await pg.waitForTimeout(1600);
  await (await pg.$('#viewTreino .card')).screenshot({ path: `${PASTA}/mapa-depois-${ponto}-${w}.png` });
  const r = await pg.evaluate(() => ({
    topo: document.querySelector('.jnTopo')?.textContent.replace(/\s+/g, ' ').trim(), painel: document.querySelector('#jnPainel h4')?.textContent,
    salvo: JSON.parse(localStorage.getItem('ar_idle')).jornada, nova: !!document.querySelector('.jnInsignia.nova'), painelVisivel: !!document.getElementById('jnPainel')?.offsetParent }));
  Object.assign(r, resultado);
  if (!r.painelVisivel) erros.push(`luta ${ponto} ${w}: o painel não voltou`);
  achados.push(`luta ${ponto} ${w}: ${JSON.stringify(r)}`);
  if (!r.fim) erros.push(`luta ${w}: sem resultado`);
  await ctx.close();
}
await b.close();
console.log(achados.join('\n'));
console.log(erros.length ? `ERROS:\n  ${erros.join('\n  ')}` : 'sem erro de página');
