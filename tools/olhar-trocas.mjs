/* OLHAR A TROCA — a segunda metade do Q5 para a ST-14.7b.
 *
 *   node tools/olhar-trocas.mjs [pasta]
 *     padrão: tools/previas/_trocas
 *
 * Sobe o servidor NESTE processo (banco em memória, o jogo servido junto, as
 * bandeiras de troca ligadas — a DEC-21 as liga desde o gate C, e a captura
 * "desligada" as desliga como o operador), monta trocas de verdade em cada etapa e
 * captura a aba "Trocas" da Pokédex nas larguras em que o arranjo muda.
 * Cada largura tem as SUAS contas e a SUA troca: a troca anda, e a captura
 * de uma largura não pode herdar o que a anterior fez. Imprime os erros de
 * página. As capturas são para LER, não para conferir que abriram.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar } from '../server/carteira.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { criarTroca, ofertar, pronto, confirmar, detalheDaTroca } from '../server/trocas.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_trocas';
const LARGURAS = (process.env.LARGURAS || '1920,1440,1100,420').split(',').map(Number);
const CP = 'DEC-99';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, servirJogo: true }, banco: ':memory:', sims: 40, laco: false });
const porta = await srv.ouvir(0);
const BASE = `http://127.0.0.1:${porta}`;
const db = srv.db;
const bandeiras = v => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, ?, ?, 'olhar')
                ON CONFLICT (nome) DO UPDATE SET ligada = excluded.ligada`).run(n, v, Date.now());
  db.exec('PRAGMA foreign_keys = ON');
};
bandeiras(1);
const pedir = (c, corpo) => fetch(BASE + c, { method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' }, body: JSON.stringify(corpo) }).then(r => r.json());
const conta = async nome => {
  const r = await pedir('/api/auth/cadastrar', { username: nome, email: `${nome.toLowerCase()}@ensaio.test`, senha: 'ensaio-senha-longa-1', nascimento: '1994-02-03' });
  return { sessao: r.sessao, id: db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id, nome };
};
const bicho = (u, dex, nivel, shiny = false) => {
  const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura', shiny });
  db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
  return c.id;
};
const ctx = (u, extra = {}) => ({ userId: u, pack: PACK, agora: Date.now(), checkpoint: CP, ...extra });

/* Uma mesa por largura, já na etapa pedida. */
async function mesa(w, etapa) {
  const eu = await conta(`Treinadora${etapa}${w}`), ana = await conta(`AnaKanto${etapa}${w}`);
  const meus = [bicho(eu.id, 25, 18, true), bicho(eu.id, 16, 12), bicho(eu.id, 129, 9), bicho(eu.id, 63, 15), bicho(eu.id, 1, 5)];
  creditarBolsa(db, eu.id, 'poke', 6, { fonte: 'olhar', agora: Date.now() });
  creditarBolsa(db, eu.id, 'great', 2, { fonte: 'olhar', agora: Date.now() });
  bicho(ana.id, 133, 20);
  creditar(db, { userId: ana.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 900, idem: `olhar-${etapa}-${w}`, agora: Date.now() });
  creditar(db, { userId: eu.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 400, idem: `olhar-eu-${etapa}-${w}`, agora: Date.now() });
  if (etapa === 'nova') return eu;
  const t = criarTroca(db, { ...ctx(eu.id), contraparteId: ana.id, ativos: { criaturas: [meus[0], meus[1]], itens: [{ itemId: 'poke', quantidade: 2 }] } });
  const r2 = ofertar(db, { trocaId: t.id, ...ctx(ana.id), ativos: { moeda: 350 } });
  pronto(db, { trocaId: t.id, ...ctx(ana.id), revisao: r2.revisao });
  if (etapa === 'revisar' || etapa === 'editor') return eu;
  pronto(db, { trocaId: t.id, ...ctx(eu.id), revisao: r2.revisao });
  if (etapa === 'travada') return eu;
  const d = detalheDaTroca(db, { trocaId: t.id, userId: ana.id });
  confirmar(db, { trocaId: t.id, userId: ana.id, revisao: d.revisao, hash: d.hash, agora: Date.now(), checkpoint: CP });
  confirmar(db, { trocaId: t.id, userId: eu.id, revisao: d.revisao, hash: d.hash, agora: Date.now(), checkpoint: CP });
  return eu;
}

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
async function capturar(nome, sessao, w, { clicar = null, espera = '#trocasCorpo .trMesa' } = {}) {
  const c = await b.newContext({ viewport: { width: w, height: w > 500 ? 1100 : 1000 } });
  await c.addInitScript(([s]) => { if (s) localStorage.setItem('ar_sessao', s); localStorage.setItem('ar_session', '1'); localStorage.setItem('ar_pdx_aba', 'trocas'); }, [sessao]);
  const pg = await c.newPage();
  pg.on('pageerror', e => erros.push(`${nome} ${w}: ${String(e).slice(0, 160)}`));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => !document.querySelector('#boot') && document.querySelector('.nav[data-view="viewPokedex"]'), null, { timeout: 90000 });
  await pg.$eval('.nav[data-view="viewPokedex"]', el => el.click());
  await pg.waitForFunction(s => document.querySelector(s), espera, { timeout: 20000 });
  if (clicar) { await pg.click(clicar); await pg.waitForFunction(s => document.querySelector(s), clicar.includes('editar') ? '#trocasCorpo .trEditor' : '#trocasCorpo .trRecibo', { timeout: 20000 }); }
  await pg.waitForTimeout(500);
  await (await pg.$('#viewPokedex .card')).screenshot({ path: `${PASTA}/${nome}-${w}.png` });
  await c.close();
}

for (const w of LARGURAS) {
  await capturar('nova', (await mesa(w, 'nova')).sessao, w);
  await capturar('revisar', (await mesa(w, 'revisar')).sessao, w);
  await capturar('editor', (await mesa(w, 'editor')).sessao, w, { clicar: '[data-tr-acao="editar"]' });
  await capturar('travada', (await mesa(w, 'travada')).sessao, w);
  await capturar('concluida', (await mesa(w, 'concluida')).sessao, w, { clicar: '[data-tr-abrir]' });
}
/* As bandeiras desligadas: é o que o jogo mostra hoje, até a DEC-21. */
bandeiras(0);
for (const w of LARGURAS) await capturar('desligada', (await conta(`Desligada${w}`)).sessao, w);
for (const w of LARGURAS) await capturar('semconta', null, w);
await b.close();
await srv.fechar();
console.log(erros.length ? `ERROS DE PÁGINA:\n${erros.join('\n')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
