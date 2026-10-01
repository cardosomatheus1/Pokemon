/* OLHAR O MARKET — a segunda metade do Q5 para a ST-14.13.
 *
 *   node tools/olhar-mercado.mjs [pasta]
 *     padrão: tools/previas/_mercado
 *
 * Sobe o servidor NESTE processo (banco em memória, o jogo servido junto, e
 * o Market ligado só aqui — `checkpointTeste`, que o servidor só aceita em
 * `ambiente: 'teste'`), anuncia de verdade (a taxa queima, a reserva prende),
 * compra de verdade, e captura a aba "Market" da Pokédex nas larguras em que
 * o arranjo muda. O HISTÓRICO de uma série precisa de 10 vendas entre 5 e 5
 * contas: elas são feitas pela própria compra, conta a conta — nada gravado
 * à mão. Imprime os erros de página. As capturas são para LER.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditar } from '../server/carteira.mjs';
import { creditarBolsa } from '../server/inventario.mjs';
import { anunciar, comprar } from '../server/mercado-jogadores.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_mercado';
const LARGURAS = (process.env.LARGURAS || '1920,1440,1100,420').split(',').map(Number);
const CP = 'DEC-99';
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, servirJogo: true, checkpointTeste: CP }, banco: ':memory:', sims: 40, laco: false });
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
let n = 0;
const conta = async (nome, pct = 5000) => {
  const r = await pedir('/api/auth/cadastrar', { username: nome, email: `${nome.toLowerCase()}@ensaio.test`, senha: 'ensaio-senha-longa-1', nascimento: '1994-02-03' });
  const id = db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id;
  creditar(db, { userId: id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: pct, idem: `olhar-${nome}`, agora: Date.now() });
  return { sessao: r.sessao, id };
};
const bicho = (u, dex, nivel, shiny = false) => {
  const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'captura', shiny });
  db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
  return c.id;
};
const anuncia = (u, ativo, preco) => anunciar(db, { userId: u, pack: PACK, ativo, preco, agora: Date.now(), checkpoint: CP });

/* A vitrine: cinco vendedoras, criaturas e lotes. */
const vendedoras = [];
for (let i = 0; i < 5; i++) vendedoras.push(await conta(`Vendedora${i}`));
const [v0, v1, v2] = vendedoras;
anuncia(v0.id, { criaturaId: bicho(v0.id, 25, 22, true) }, 4800);
anuncia(v1.id, { criaturaId: bicho(v1.id, 6, 36) }, 2600);
anuncia(v2.id, { criaturaId: bicho(v2.id, 133, 14) }, 900);
anuncia(v0.id, { criaturaId: bicho(v0.id, 131, 30) }, 3200);
for (const v of vendedoras) { creditarBolsa(db, v.id, 'poke', 10, { fonte: 'olhar', agora: Date.now() }); creditarBolsa(db, v.id, PACK.material.id, 6, { fonte: 'olhar', agora: Date.now() }); }
anuncia(v1.id, { itemId: 'poke', quantidade: 5 }, 400);
anuncia(v2.id, { itemId: PACK.material.id, quantidade: 3 }, 600);
/* A série com amostra: dez Pidgey normais (faixa do potencial que sair), de
   cinco vendedoras para cinco compradores — vendas de verdade. */
const compradores = [];
for (let i = 0; i < 5; i++) compradores.push(await conta(`Compradora${i}`));
let serieDex = 16;
for (let i = 0; i < 10; i++) {
  const v = vendedoras[i % 5], c = compradores[i % 5];
  const a = anuncia(v.id, { criaturaId: bicho(v.id, serieDex, 10 + i) }, 300 + i * 20);
  comprar(db, { userId: c.id, anuncioId: a.id, versao: a.versao, preco: a.preco, chaveIdem: `olhar-serie-${i}`, agora: Date.now(), checkpoint: CP });
}

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
async function capturar(nome, sessao, w, passos = []) {
  const c = await b.newContext({ viewport: { width: w, height: w > 500 ? 1100 : 1000 } });
  await c.addInitScript(([s]) => { if (s) localStorage.setItem('ar_sessao', s); localStorage.setItem('ar_session', '1'); localStorage.setItem('ar_pdx_aba', 'mercado'); }, [sessao]);
  const pg = await c.newPage();
  pg.on('pageerror', e => erros.push(`${nome} ${w}: ${String(e).slice(0, 160)}`));
  await pg.goto(BASE + '/');
  await pg.waitForFunction(() => !document.querySelector('#boot') && document.querySelector('.nav[data-view="viewPokedex"]'), null, { timeout: 90000 });
  await pg.$eval('.nav[data-view="viewPokedex"]', el => el.click());
  await pg.waitForFunction(() => document.querySelector('#mercadoCorpo .mkGrade, #mercadoCorpo .mkVazio, #mercadoCorpo .trComo, #mercadoCorpo .mkVenda'), null, { timeout: 20000 });
  for (const [clicar, espera] of passos) { await pg.click(clicar); await pg.waitForFunction(s => document.querySelector(s), espera, { timeout: 20000 }); }
  await pg.waitForTimeout(500);
  await (await pg.$('#viewPokedex .card')).screenshot({ path: `${PASTA}/${nome}-${w}.png` });
  await c.close();
}

for (const w of LARGURAS) {
  const eu = await conta(`Olhando${w}`);
  await capturar('vitrine', eu.sessao, w);
  /* o Pidgey vendido dez vezes: o detalhe com o histórico de amostra */
  const p = anuncia(v1.id, { criaturaId: bicho(v1.id, serieDex, 15) }, 380);
  await capturar('detalhe', eu.sessao, w, [[`[data-mk-abrir="${p.id}"]`, '#mercadoCorpo .mkHist dl']]);
  await capturar('confirma', eu.sessao, w, [[`[data-mk-abrir="${p.id}"]`, '#mercadoCorpo .mkHist dl'], ['[data-mk-comprar]', '#mercadoCorpo .mkConfirma']]);
  await capturar('comprado', eu.sessao, w, [[`[data-mk-abrir="${p.id}"]`, '#mercadoCorpo .mkHist dl'], ['[data-mk-comprar]', '#mercadoCorpo .mkConfirma'], ['[data-mk-confirmar]', '#mercadoCorpo .mkOk']]);
  await capturar('bolas', eu.sessao, w, [['[data-mk-aba="bolas"]', '#mercadoCorpo .mkGrade']]);
  const dono = await conta(`Anunciante${w}`);
  bicho(dono.id, 1, 12); bicho(dono.id, 147, 25, true);
  creditarBolsa(db, dono.id, 'great', 4, { fonte: 'olhar', agora: Date.now() });
  anuncia(dono.id, { criaturaId: bicho(dono.id, 39, 9) }, 700);
  await capturar('meus', dono.sessao, w, [['[data-mk-aba="meus"]', '#mercadoCorpo .mkVenda select option[value^="c:"]']]);
  n++;
}
bandeiras(0);
for (const w of LARGURAS) await capturar('desligado', (await conta(`Desligado${w}`)).sessao, w);
for (const w of LARGURAS) await capturar('semconta', null, w);
await b.close();
await srv.fechar();
console.log(erros.length ? `ERROS DE PÁGINA:\n${erros.join('\n')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
