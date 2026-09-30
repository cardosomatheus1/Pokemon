/* OLHAR A LIGA DE TIMES — a segunda metade do Q5 para a ST-11.6.
 *
 *   node tools/olhar-liga.mjs [pasta]
 *     padrão: tools/previas/_liga
 *
 * Sobe o servidor NESTE processo (banco em memória, o jogo servido junto),
 * semeia contas com times de verdade e partidas — contra gente, fora do
 * ranking e contra o bot — e captura a aba "Liga de times" nos estados que
 * importam, nas larguras em que o arranjo muda. Imprime os erros de página.
 * As capturas são para LER, não para conferir que abriram.
 */
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import PACK from '../content/escolhido.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { gerar } from '../server/criaturas.mjs';
import { publicarTime } from '../server/liga-equipe.mjs';
import { criarPartida } from '../server/partida.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const PW = process.env.PW_MODULO || '/tmp/pw/node_modules/playwright-core/index.mjs';
const CHROME = process.env.PW_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASTA = process.argv[2] || 'tools/previas/_liga';
const LARGURAS = (process.env.LARGURAS || '1920,1440,1100,420').split(',').map(Number);
mkdirSync(PASTA, { recursive: true });
const { chromium } = await import(pathToFileURL(PW).href);

const agora = Date.now(), H = 3_600_000;
const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, servirJogo: true }, banco: ':memory:', sims: 40, laco: false });
const porta = await srv.ouvir(0);
const BASE = `http://127.0.0.1:${porta}`;
const pedir = (c, corpo) => fetch(BASE + c, { method: 'POST', headers: { 'x-api-versao': '1', 'content-type': 'application/json' }, body: JSON.stringify(corpo) }).then(r => r.json());
const conta = async nome => {
  const r = await pedir('/api/auth/cadastrar', { username: nome, email: `${nome.toLowerCase()}@ensaio.test`, senha: 'ensaio-senha-longa-1', nascimento: '1994-02-03' });
  return { sessao: r.sessao, id: srv.db.prepare(`SELECT id FROM users WHERE username = ?`).get(nome).id };
};
const time = (u, lista) => lista.forEach(([dex, nivel]) => {
  const c = gerar(srv.db, { userId: u, pack: PACK, dex, origem: 'captura' });
  srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
});

/* Eu: seis no time. Os outros: times na minha faixa de power. */
const eu = await conta('Treinadora'), ana = await conta('AnaKanto'), rui = await conta('RuiDaRota'), vazio = await conta('SemTime');
time(eu.id, [[6, 32], [9, 30], [3, 31], [25, 28], [143, 30], [94, 29]]);
time(ana.id, [[65, 31], [68, 30], [59, 32], [130, 29], [112, 30], [131, 31]]);
time(rui.id, [[34, 30], [45, 30], [62, 31], [76, 29], [97, 30], [121, 30]]);
const meu = publicarTime(srv.db, { userId: eu.id, preset: 'aggressive', agora: agora - 30 * H });
const dela = publicarTime(srv.db, { userId: ana.id, preset: 'balanced', agora: agora - 30 * H });
const dele = publicarTime(srv.db, { userId: rui.id, preset: 'focus', agora: agora - 30 * H });
/* O histórico: contra a Ana e o Rui, e uma contra o bot (a busca sozinha). */
criarPartida(srv.db, { userId: eu.id, meu: meu.id, adversario: dela.id, chaveIdem: 'olhar-000001', agora: agora - 26 * H });
criarPartida(srv.db, { userId: rui.id, meu: dele.id, adversario: meu.id, chaveIdem: 'olhar-000002', agora: agora - 20 * H });
criarPartida(srv.db, { userId: eu.id, meu: meu.id, adversario: dele.id, chaveIdem: 'olhar-000003', agora: agora - 12 * H });
/* A INSÍGNIA (ST-11.7b): ela só nasce quando uma temporada fecha, e a de
   agora é a primeira — então a captura grava uma à mão, para LER o cartão
   com ela. É o único dado fabricado aqui. */
srv.db.prepare(`INSERT INTO liga_insignias (temporada, user_id, tier, posicao, partidas, criado_em) VALUES (1, ?, 'Gold', 4, 12, ?)`).run(eu.id, agora);

const b = await chromium.launch({ executablePath: CHROME });
const erros = [];
async function capturar(nome, sessao, { clicar, larguras = LARGURAS, replay = null, stake = null } = {}) {
  for (const w of larguras) {
    const ctx = await b.newContext({ viewport: { width: w, height: w > 500 ? 1100 : 1000 } });
    await ctx.addInitScript(([s]) => { if (s) localStorage.setItem('ar_sessao', s); localStorage.setItem('ar_session', '1'); localStorage.setItem('ar_treino_aba', 'liga'); }, [sessao]);
    const pg = await ctx.newPage();
    /* O STAKE (ST-11.11) está DESLIGADO no servidor — ligar é a D2, do dono. Para LER a seção,
       só a leitura dele é interceptada no navegador; o servidor não ganha porta nenhuma. */
    if (stake) await pg.route('**/api/equipe/stake', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stake) }));
    pg.on('pageerror', e => erros.push(`${nome} ${w}: ${String(e).slice(0, 160)}`));
    await pg.goto(BASE + '/');
    /* A abertura some quando o boot termina (no modo local, depois das simulações). */
    await pg.waitForFunction(() => !document.querySelector('#boot') && document.querySelector('.nav[data-view="viewTreino"]'), null, { timeout: 90000 });
    await pg.$eval('.nav[data-view="viewTreino"]', el => el.click());
    await pg.waitForFunction(() => document.querySelector('#ligaEqCorpo .leHome'), null, { timeout: 20000 });
    if (clicar) { await pg.click(clicar); await pg.waitForFunction(() => document.querySelector('#ligaEqCorpo .leResultado, #ligaEqCorpo .leErro, #ligaEqCorpo .leLjAviso, #ligaEqCorpo .leStkConf'), null, { timeout: 30000 }); }
    /* O replay: abre a primeira partida, espera a prova da semente e captura no meio
       (o palco) e no fim (o resultado, depois de "pular"). */
    if (replay) {
      await pg.click('[data-le-replay]');
      await pg.waitForFunction(() => document.querySelector('#leReplay .pveTopo span.leProva'), null, { timeout: 20000 });
      await pg.waitForTimeout(replay === 'meio' ? 6200 : 200);
      if (replay === 'fim') { await pg.click('#leReplay [data-lp-pular]'); await pg.waitForFunction(() => document.querySelector('#leReplay')?.dataset.estado === 'fim', null, { timeout: 20000 }); }
    }
    await pg.waitForTimeout(400);
    await (await pg.$('#viewTreino .card')).screenshot({ path: `${PASTA}/${nome}-${w}.png` });
    await ctx.close();
  }
}
await capturar('pronto', eu.sessao);
/* O resultado com uma conta NOVA por largura (o mesmo time e o mesmo
   histórico): sem isso cada largura mostrava as buscas das anteriores, e a
   leitura comparava partidas diferentes. */
for (const w of LARGURAS) {
  const x = await conta(`Treinadora${w}`);
  time(x.id, [[6, 32], [9, 30], [3, 31], [25, 28], [143, 30], [94, 29]]);
  const seu = publicarTime(srv.db, { userId: x.id, preset: 'aggressive', agora: agora - 30 * H });
  criarPartida(srv.db, { userId: x.id, meu: seu.id, adversario: dela.id, chaveIdem: `olhar-${w}-1`, agora: agora - 26 * H });
  criarPartida(srv.db, { userId: rui.id, meu: dele.id, adversario: seu.id, chaveIdem: `olhar-${w}-2`, agora: agora - 20 * H });
  await capturar('resultado', x.sessao, { clicar: '[data-le-acao="buscar"]', larguras: [w] });
}
/* Contra o BOT: um time fraco, fora da faixa de power de todo mundo. */
for (const w of LARGURAS) {
  const nova = await conta(`Novata${w}`);
  time(nova.id, [[16, 6], [19, 5], [10, 6]]);
  publicarTime(srv.db, { userId: nova.id, preset: 'balanced', agora: agora - 5 * H });
  await capturar('bot', nova.sessao, { clicar: '[data-le-acao="buscar"]', larguras: [w] });
  /* Fora da faixa de rating depois de capturada: a próxima Novata não a pareia, e cai no bot. */
  srv.db.prepare(`INSERT INTO liga_mmr (user_id, rating, partidas, atualizado_em) VALUES (?, 3000, 1, ?)
                  ON CONFLICT (user_id) DO UPDATE SET rating = 3000`).run(nova.id, agora);
}
/* A LOJA (ST-11.7c) com saldo para comprar: um prêmio de temporada gravado à
   mão (como a insígnia — a primeira virada de verdade ainda não aconteceu), e
   a captura depois de comprar a primeira bola. Uma conta por largura, para o
   limite não somar as compras das larguras anteriores. */
for (const w of LARGURAS) {
  const x = await conta(`Loja${w}`);
  time(x.id, [[6, 32], [9, 30], [3, 31], [25, 28], [143, 30], [94, 29]]);
  const seu = publicarTime(srv.db, { userId: x.id, preset: 'aggressive', agora: agora - 30 * H });
  criarPartida(srv.db, { userId: x.id, meu: seu.id, adversario: dela.id, chaveIdem: `olhar-loja-${w}`, agora: agora - 26 * H });
  srv.db.prepare(`INSERT INTO liga_pontos (user_id, temporada, dia, tipo, delta, ref, idem, criado_em) VALUES (?, 1, 0, 'premio', 600, 'olhar', ?, ?)`).run(x.id, `olhar-premio-${w}`, agora);
  await capturar('loja', x.sessao, { clicar: '[data-le-comprar="bola:great"]', larguras: [w] });
}
const ESTADO_DO_STAKE = { ligado: true, inscrito: true, tier: 'Bronze', stake: 50, pot: 100, rake: 10, payout: 90, elegivel: 340, bonus: 40, competitivo: 300, pausa: false };
await capturar('stake', eu.sessao, { stake: ESTADO_DO_STAKE });
await capturar('stakeconfirma', eu.sessao, { stake: ESTADO_DO_STAKE, clicar: '[data-le-stake-buscar]' });
await capturar('semtime', vazio.sessao);
await capturar('replaymeio', eu.sessao, { replay: 'meio' });
await capturar('replayfim', eu.sessao, { replay: 'fim' });
await capturar('semconta', null);
await b.close();
await srv.fechar();
console.log(erros.length ? `ERROS DE PÁGINA:\n${erros.join('\n')}` : 'sem erro de página');
console.log(`capturas em ${PASTA}`);
