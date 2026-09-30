/* Q1/Q3/Q6 · OS LEAGUE POINTS (ST-11.7a · Spec §9.10, §10.1, §10.12)
 *
 *   A FONTE       a partida CONTADA paga os dois lados — quem desafia sempre um
 *                 pouco, quem defende só quando o time segura; a fora do
 *                 ranking e a do bot não pagam
 *   O TETO        o que vem de partida para no teto do dia do mundo
 *   A VIRADA      só 10% do saldo atravessa, e o prêmio do tier em que a
 *                 temporada FECHOU entra para quem jogou o mínimo — uma vez
 *   O LIVRO       próprio, só de inserção, cada lançamento com chave única
 *   NUNCA VIRA    PokéCash: o livro não é balde da carteira, o arquivo não a
 *                 importa, e nada disto lança no `wallet_ledger`
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida } from '../server/partida.mjs';
import { sincronizarTemporada } from '../server/temporada.mjs';
import { saldoDePontos, extratoDePontos, creditarPartida } from '../server/pontos-liga.mjs';
import { ligaDaConta } from '../server/liga-equipe.mjs';
import { PONTOS, PREMIO_DO_TIER, ganhoDaPartida, carryoverDe, premioDaTemporada, viradaDaConta } from '../engine/pontos-liga.mjs';
import { TIPOS, BUCKETS } from '../engine/carteira.mjs';
import { temporadaDe } from '../engine/temporada.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const H = 3_600_000, DIA = 86_400_000, T0 = Date.UTC(2026, 9, 1, 12);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v, w] = [conta('lp0'), conta('lp1'), conta('lp2')];
  const snap = (dono, lista) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  }) });
  return { db, u, v, w, forte: snap(u, [[6, 60], [9, 60], [3, 60]]), fracoV: snap(v, [[10, 5]]), fracoW: snap(w, [[13, 5]]) };
}
const carteiraMexeu = db => db.prepare(`SELECT COUNT(*) AS n FROM wallet_ledger`).get().n;

export async function suite() {
  const s = criarSuite('liga-pontos');

  s.teste('o ganho: quem desafia sempre um pouco, quem defende só quando segura, e o teto do dia', () => {
    const g = (papel, vencedor, jaHoje) => ganhoDaPartida({ papel, vencedor, jaHoje });
    igual([g('desafiante', 'B'), g('desafiante', 'empate'), g('desafiante', 'A')].join(), '30,15,10', 'o desafiante');
    igual([g('defensor', 'A'), g('defensor', 'empate'), g('defensor', 'B')].join(), '10,0,0', 'o defensor');
    igual([g('desafiante', 'B', 185), g('desafiante', 'B', 200), g('desafiante', 'B', 999), g('x', 'B')].join(), '15,0,0,0', 'o teto corta o excedente');
    igual(PONTOS.tetoDiario, 200, 'o teto');
  });

  s.teste('a virada: 10% atravessa, arredondado para baixo; o prêmio pelo tier, com o mínimo de partidas', () => {
    igual([carryoverDe(500), carryoverDe(59), carryoverDe(0), carryoverDe(-30)].join(), '50,5,0,0', 'o carryover');
    igual([premioDaTemporada({ tier: 'Gold', partidas: 5 }), premioDaTemporada({ tier: 'Gold', partidas: 4 }), premioDaTemporada({ tier: 'Nada', partidas: 9 })].join(), '175,0,0', 'o prêmio');
    const ordem = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Champion'].map(t => PREMIO_DO_TIER[t]);
    ok(ordem.every((x, i) => i === 0 || x > ordem[i - 1]), 'o prêmio não cresce com o tier');
    igual(JSON.stringify(viradaDaConta({ saldo: 500, tier: 'Gold', partidas: 5 })), '{"reset":-450,"premio":175}', 'a virada de uma conta');
    igual(JSON.stringify(viradaDaConta({ saldo: 0, tier: 'Bronze', partidas: 0 })), '{"reset":0,"premio":0}', 'a conta vazia');
  });

  s.teste('no servidor: a partida contada paga os dois lados, uma vez, e a carteira não se mexe', () => {
    const c = cena();
    const cart = carteiraMexeu(c.db);
    const p = criarPartida(c.db, { userId: c.v, meu: c.fracoV.id, adversario: c.forte.id, chaveIdem: 'lp-000001', agora: T0 });
    igual(`${p.rated}|${p.vencedor}`, 'true|A', 'o time forte não segurou');
    igual(`${saldoDePontos(c.db, c.u)}|${saldoDePontos(c.db, c.v)}`, '10|10', 'a defesa e a derrota');
    igual(extratoDePontos(c.db, c.v).map(x => `${x.tipo}:${x.delta}:${x.temporada}`).join(), 'partida:10:1', 'o extrato');
    creditarPartida(c.db, { id: p.id, userA: c.u, userB: c.v, vencedor: 'A', agora: T0 });
    igual(saldoDePontos(c.db, c.v), 10, 'creditar de novo a mesma partida pagou duas vezes');
    igual(carteiraMexeu(c.db), cart, 'os pontos lançaram na carteira');
    igual(ligaDaConta(c.db, { userId: c.v, agora: T0 }).pontos, 10, 'a Liga não mostra o saldo');
  });

  s.teste('no servidor: a partida fora do ranking não paga', () => {
    const c = cena();
    const joga = (k, t) => criarPartida(c.db, { userId: c.v, meu: c.fracoV.id, adversario: c.forte.id, chaveIdem: `lp-${String(k).padStart(6, '0')}`, agora: t });
    for (let k = 1; k <= 4; k++) joga(k, T0 + (k - 1) * 7 * H);
    igual(saldoDePontos(c.db, c.v), 40, 'as quatro contadas');
    igual(joga(5, T0 + 28 * H).rated, false, 'a quinta entrou no ranking');
    igual(saldoDePontos(c.db, c.v), 40, 'a partida fora do ranking pagou');
    igual(saldoDePontos(c.db, c.u), 40, 'a defesa fora do ranking pagou');
  });

  s.teste('o teto do dia no servidor: o excedente não entra, e o dia seguinte abre de novo', () => {
    const c = cena();
    for (let k = 0; k < 8; k++) creditarPartida(c.db, { id: `teto-${k}`, userA: c.u, userB: c.v, vencedor: 'B', agora: T0 + k * 60_000 });
    igual(saldoDePontos(c.db, c.v), 200, 'oito vitórias passaram do teto');
    igual(extratoDePontos(c.db, c.v, 99).map(x => x.delta).join(), '20,30,30,30,30,30,30', 'o corte e o lançamento zero');
    creditarPartida(c.db, { id: 'teto-amanha', userA: c.u, userB: c.v, vencedor: 'B', agora: T0 + DIA });
    igual(saldoDePontos(c.db, c.v), 230, 'o dia seguinte não abriu');
  });

  s.teste('a virada no servidor: reset forte, o prêmio do tier de ANTES do soft reset, uma vez só', () => {
    const c = cena();
    sincronizarTemporada(c.db, { agora: T0 });
    for (let k = 0; k < 4; k++) criarPartida(c.db, { userId: c.v, meu: c.fracoV.id, adversario: c.forte.id, chaveIdem: `lpv-${String(k).padStart(6, '0')}`, agora: T0 + k * 7 * H });
    criarPartida(c.db, { userId: c.w, meu: c.fracoW.id, adversario: c.forte.id, chaveIdem: 'lpw-000001', agora: T0 + 30 * H });
    /* u defendeu 5 (50 pontos, Bronze); v perdeu 4 (40, abaixo do mínimo); w perdeu 1 (10). */
    igual([c.u, c.v, c.w].map(x => saldoDePontos(c.db, x)).join(), '50,40,10', 'os saldos da temporada 1');
    /* Um Gold de verdade: o prêmio é do rating de ANTES do soft reset. */
    c.db.prepare(`UPDATE liga_mmr SET rating = 1300 WHERE user_id = ?`).run(c.u);
    const cart = carteiraMexeu(c.db);
    const t2 = temporadaDe(T0).fim + H;
    sincronizarTemporada(c.db, { agora: t2 });
    igual([c.u, c.v, c.w].map(x => saldoDePontos(c.db, x)).join(), `${5 + PREMIO_DO_TIER.Gold},4,1`, 'o carryover e o prêmio');
    igual(extratoDePontos(c.db, c.u).slice(0, 2).map(x => `${x.tipo}:${x.delta}:${x.temporada}`).join(), 'premio:175:2,reset:-45:1', 'a ordem e a temporada dos lançamentos');
    sincronizarTemporada(c.db, { agora: t2 + H });
    igual(saldoDePontos(c.db, c.u), 180, 'a virada pagou duas vezes');
    igual(carteiraMexeu(c.db), cart, 'a virada lançou na carteira');
  });

  s.teste('o livro é próprio, só de inserção, e a migração sobe e desce', () => {
    const c = cena();
    creditarPartida(c.db, { id: 'x1', userA: c.u, userB: c.v, vencedor: 'B', agora: T0 });
    ok(/append-only/.test(recusa(() => c.db.prepare(`UPDATE liga_pontos SET delta = 999`).run())?.message ?? ''), 'o livro aceitou UPDATE');
    ok(/append-only/.test(recusa(() => c.db.prepare(`DELETE FROM liga_pontos`).run())?.message ?? ''), 'o livro aceitou DELETE');
    ok(recusa(() => c.db.prepare(`INSERT INTO liga_pontos (user_id, temporada, dia, tipo, delta, idem, criado_em) VALUES (?, 1, 1, 'cambio', 5, 'k', 1)`).run(c.u)), 'o livro aceitou um tipo de fora');
    const db = abrirBanco(':memory:'); migrar(db);
    const m = MIGRACOES.find(x => x.nome === 'pontos-liga-st11.7a');
    const n = () => db.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'liga_pontos%'`).get().n;
    m.desce(db); igual(n(), 0, 'a descida deixou restos');
    m.sobe(db); igual(n(), 4, 'a subida não refez tudo');
  });

  s.teste('nunca vira PokéCash: sem balde na carteira, sem tipo no livro dela, sem import', () => {
    ok(!BUCKETS.some(b => /liga|league|pont/i.test(b)), 'os pontos viraram balde da carteira');
    ok(!TIPOS.some(t => /LEAGUE|LIGA|PONT/i.test(t)), 'a carteira tem tipo de pontos');
    const srv = semComentario(fonte('../server/pontos-liga.mjs'));
    ok(!/carteira|wallet_ledger|treasury/.test(srv), 'o livro dos pontos toca a carteira');
    ok(!/BEGIN|emTransacao/.test(srv), 'os pontos abrem transação própria');
    ok(!/`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{/.test(srv), 'SQL montado com interpolação');
    ok(!/taxa|cambio|converte|paridade/i.test(semComentario(fonte('../engine/pontos-liga.mjs'))), 'o motor dos pontos tem uma conversão');
  });

  s.teste('pela porta: o saldo e as regras; a partida do bot não paga', async () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    const porta = await srv.ouvir(0);
    const url = r => `http://127.0.0.1:${porta}${r}`;
    try {
      const cad = await fetch(url('/api/auth/cadastrar'), { method: 'POST', headers: { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'LpPorta', email: 'lpporta@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01' }) }).then(r => r.json());
      const H2 = { [CABECALHO_VERSAO]: API_VERSAO, 'content-type': 'application/json', authorization: `Bearer ${cad.sessao}` };
      const uid = srv.db.prepare(`SELECT id FROM users WHERE username = 'LpPorta'`).get().id;
      const cr = gerar(srv.db, { userId: uid, pack: PACK, dex: 6, origem: 'captura' });
      srv.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(30), cr.id);
      igual((await fetch(url('/api/equipe/pontos'), { headers: { [CABECALHO_VERSAO]: API_VERSAO } })).status, 401, 'os pontos sem sessão');
      const pub = await fetch(url('/api/equipe/publicar'), { method: 'POST', headers: H2, body: JSON.stringify({ preset: 'focus' }) }).then(r => r.json());
      const busca = await fetch(url('/api/equipe/buscar'), { method: 'POST', headers: H2, body: JSON.stringify({ meu: pub.snapshot.id, chaveIdem: 'lpporta-01' }) }).then(r => r.json());
      ok(busca.partida?.bot, 'sozinho na fila não caiu no bot');
      const p = await fetch(url('/api/equipe/pontos'), { headers: H2 }).then(r => r.json());
      igual(`${p.saldo}|${p.extrato.length}|${p.regras.vitoria}|${p.premios.Champion}`, '0|0|30|750', 'o bot pagou, ou as regras não vieram');
    } finally { await srv.fechar(); }
  });

  return s;
}
