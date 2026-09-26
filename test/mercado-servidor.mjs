/* Q1/Q3/Q6/Q8 · O BOLO NO SERVIDOR: TABELAS, ENTRADA E LIMITE (ST-12.3 · F2.1a)
 *
 * O bolo de abates nasce com a rodada, aceita entrada só com a janela aberta,
 * trava no mesmo instante que as apostas, e a entrada reserva o dinheiro no
 * ledger com tipo próprio (§6.11). A liquidação é a ST-12.4.
 *
 * As três regras que custariam caro se caíssem:
 *
 *   A FASE É DO SCHEDULER     entrada depois do lock é apostar no passado
 *   UM LIMITE SÓ (§6.13)      o §28.3 soma a aposta e o bolo; limite por
 *                             mercado deixaria o jogador dobrar a exposição
 *                             abrindo uma aba nova
 *   O PREÇO NÃO SAI (§6.6)    a composição do bolo é pública; o preço do
 *                             modelo, nunca durante a janela
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, saldos, reconciliarNoBanco } from '../server/carteira.mjs';
import { apostar } from '../server/aposta.mjs';
import { definirLimite, ERRO_LIMITE } from '../server/limites.mjs';
import { pausar, ERRO_PROTECAO } from '../server/protecao.mjs';
import { entrarNoMercado, sairDoMercado, mercadoParaCliente, ERRO_MERCADO } from '../server/mercado.mjs';
import { ERRO_APOSTA } from '../server/aposta.mjs';
import { TIPOS } from '../engine/carteira.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);
const SENHA = 'senha-longa-o-bastante-1';

function montar() {
  let t = T0;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 300,
                            laco: false, relogio: () => t });
  let n = 0;
  const jogador = (saldo = 1000) => {
    const id = cadastrar(s.db, { username: `j${n}`, email: `j${n++}@x.test`, senha: SENHA,
                                 nascimento: '1990-01-01', agora: t }).id;
    creditar(s.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: saldo, idem: `w${id}`, agora: t });
    return id;
  };
  return { s, db: s.db, sched: s.sched, jogador, andar: ms => { t += ms; }, agora: () => t };
}
const lancou = (f, codigo) => { try { f(); } catch (e) { return e.codigo === codigo ? true : e.codigo ?? e.message; } return false; };
const entrar = (c, userId, selecao, valor) =>
  entrarNoMercado(c.db, { sched: c.sched, userId, selecao, valor, agora: c.agora() });

export async function suite() {
  const s = criarSuite('mercado-servidor');

  s.teste('a rodada abre com o bolo de abates: mesmas travas, taxa e destino declarados', async () => {
    const c = montar();
    try {
      const r = c.sched.abrirRodada();
      const m = c.db.prepare(`SELECT * FROM markets WHERE round_id = ?`).all(r.id);
      igual(m.length, 1, 'um mercado por vez (§6.5)');
      igual(m[0].kind, 'abates', 'o primeiro mercado é o de abates');
      igual(m[0].status, 'aberto', 'o bolo não nasceu aberto');
      igual(m[0].locks_at, r.travaEm, 'o bolo trava num instante diferente das apostas');
      ok(m[0].fee_rate > 0 && m[0].fee_rate < 0.5, `taxa ${m[0].fee_rate}`);
      ok(['devolver', 'tesouraria'].includes(m[0].no_winner_destination), 'o destino "sem acerto" não está declarado');
      /* ST-12.5: o preço do modelo nasce GRAVADO com a rodada, e não publicado. */
      ok(m[0].model_price_json && m[0].model_priced_at === m[0].opens_at, 'o preço do modelo não foi carimbado na abertura');
      igual(m[0].published_at, null, 'o preço do modelo nasceu publicado');
      for (const t of ['MARKET_ENTRY_RESERVE', 'MARKET_ENTRY_RELEASE', 'MARKET_LOSS', 'MARKET_PAYOUT_TRANSFERABLE',
                       'MARKET_PAYOUT_BONUS', 'MARKET_FEE', 'MARKET_RESIDUE'])
        ok(TIPOS.includes(t), `o ledger não conhece ${t} (§6.11)`);
    } finally { await c.s.fechar(); }
  });

  s.teste('entrar reserva no ledger com tipo próprio; trocar é uma entrada só; sair devolve', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const u = c.jogador(1000);
      entrar(c, u, 3, 200);
      igual(saldos(c.db, u).transferivel, 800, 'a entrada não saiu do disponível');
      const tipos = c.db.prepare(`SELECT type FROM wallet_ledger WHERE user_id = ? AND type LIKE 'MARKET%'`).all(u).map(x => x.type);
      igual(tipos.join(), 'MARKET_ENTRY_RESERVE', 'a reserva do bolo usou o tipo da aposta');
      entrar(c, u, 5, 80);
      igual(saldos(c.db, u).transferivel, 920, 'trocar cobrou as duas entradas');
      const ent = c.db.prepare(`SELECT selection, amount FROM market_entries WHERE user_id = ? AND status = 'aberta'`).all(u);
      igual(JSON.stringify(ent), '[{"selection":5,"amount":80}]', 'trocar criou uma segunda posição');
      sairDoMercado(c.db, { sched: c.sched, userId: u, agora: c.agora() });
      igual(saldos(c.db, u).transferivel, 1000, 'sair não devolveu');
      entrar(c, u, 1, 50);
      igual(saldos(c.db, u).transferivel, 950, 'voltar depois de sair não funcionou');
      igual(reconciliarNoBanco(c.db, u).length, 0, `ledger × saldo: ${reconciliarNoBanco(c.db, u)}`);
    } finally { await c.s.fechar(); }
  });

  s.teste('depois do lock: entrada recusada, e o bolo e as entradas travam juntos com as apostas', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const u = c.jogador();
      entrar(c, u, 0, 100);
      for (let i = 0; i < 60 && c.sched.rodadaAtual().status === ESTADOS.ABERTA; i++) { c.andar(1000); c.sched.tick(); }
      igual(c.sched.rodadaAtual().status, ESTADOS.TRAVADA, 'a rodada não travou');
      igual(lancou(() => entrar(c, u, 1, 10), ERRO_APOSTA.JANELA_FECHADA), true, 'aceitou entrada depois do lock');
      igual(lancou(() => sairDoMercado(c.db, { sched: c.sched, userId: u, agora: c.agora() }), ERRO_APOSTA.JANELA_FECHADA),
        true, 'saiu do bolo depois do lock');
      igual(c.db.prepare(`SELECT status FROM markets`).get().status, 'travado', 'o bolo não travou');
      igual(c.db.prepare(`SELECT status FROM market_entries`).get().status, 'travada', 'a entrada não travou');
    } finally { await c.s.fechar(); }
  });

  s.teste('entrada inválida, conta pausada ou saldo curto: recusa sem mexer na carteira', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const u = c.jogador(100);
      igual(lancou(() => entrar(c, u, 12, 10), ERRO_MERCADO.SELECAO), true, 'seleção fora da pool aceita');
      igual(lancou(() => entrar(c, u, -1, 10), ERRO_MERCADO.SELECAO), true, 'seleção negativa aceita');
      igual(lancou(() => entrar(c, u, 0, 2.5), ERRO_APOSTA.VALOR), true, 'valor fracionário aceito');
      igual(lancou(() => entrar(c, u, 0, 0), ERRO_APOSTA.VALOR), true, 'valor zero aceito');
      igual(lancou(() => entrar(c, u, 0, 101), ERRO_APOSTA.SALDO), true, 'entrada maior que o saldo aceita');
      igual(saldos(c.db, u).transferivel, 100, 'uma recusa mexeu na carteira');
      const p = c.jogador();
      pausar(c.db, { userId: p, tipo: 'cooloff', duracao: '24h', agora: c.agora() });
      igual(lancou(() => entrar(c, p, 0, 10), ERRO_PROTECAO.PAUSADO), true, 'conta em pausa entrou no bolo');
    } finally { await c.s.fechar(); }
  });

  s.teste('§6.13: o limite por rodada soma a aposta e o bolo, nos dois sentidos', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const a = c.jogador(), b = c.jogador();
      for (const u of [a, b]) definirLimite(c.db, { userId: u, tipo: 'max_stake_per_round', valor: 100, agora: c.agora() });
      apostar(c.db, { sched: c.sched, userId: a, slot: 0, valor: 60, agora: c.agora() });
      igual(lancou(() => entrar(c, a, 1, 50), ERRO_LIMITE.BLOQUEADO), true, 'aposta 60 + bolo 50 passou do limite de 100');
      entrar(c, a, 1, 40);
      entrar(c, b, 2, 50);
      igual(lancou(() => apostar(c.db, { sched: c.sched, userId: b, slot: 0, valor: 60, agora: c.agora() }),
        ERRO_LIMITE.BLOQUEADO), true, 'bolo 50 + aposta 60 passou do limite de 100');
      entrar(c, b, 3, 90);   // trocar 50 por 90: os 50 antigos não contam (90 ≤ 100)
      entrar(c, b, 3, 20);
      apostar(c.db, { sched: c.sched, userId: b, slot: 0, valor: 60, agora: c.agora() });
    } finally { await c.s.fechar(); }
  });

  s.teste('§28.3: aposta e bolo na mesma rodada contam UMA rodada', async () => {
    const c = montar();
    try {
      c.sched.abrirRodada();
      const u = c.jogador();
      entrar(c, u, 1, 10);
      apostar(c.db, { sched: c.sched, userId: u, slot: 0, valor: 10, agora: c.agora() });
      entrar(c, u, 2, 15);
      const n = c.db.prepare(`SELECT COUNT(*) n FROM player_activity WHERE user_id = ? AND tipo = 'rodada'`).get(u).n;
      igual(n, 1, `a mesma rodada contou ${n} vezes`);
    } finally { await c.s.fechar(); }
  });

  s.teste('§6.6: a composição sai; o preço do modelo, nunca — lista branca', async () => {
    const c = montar();
    try {
      const r = c.sched.abrirRodada();
      const [u1, u2, u3] = [c.jogador(), c.jogador(), c.jogador()];
      entrar(c, u1, 4, 100); entrar(c, u2, 4, 50); entrar(c, u3, 7, 30);
      /* O preço carimbado (ST-12.5) já existe no banco durante a janela: é
         exatamente o caso que a lista branca defende. */
      c.db.prepare(`UPDATE markets SET model_price_json = ?, model_priced_at = ? WHERE round_id = ?`)
        .run(JSON.stringify({ 4: 0.3141, 7: 0.2718 }), c.agora(), r.id);
      const m = mercadoParaCliente(c.db, { sched: c.sched, userId: u1 });
      igual(m.bruto, 180, 'o bruto não é a soma das entradas');
      const s4 = m.selecoes.find(x => x.selecao === 4);
      igual(s4.total, 150, 'o total da seleção 4');
      igual(s4.entradas, 2, 'quantas entradas na seleção 4');
      igual(m.selecoes.length, 12, 'as doze seleções aparecem, vazias inclusive');
      igual(JSON.stringify(m.minha), '{"selecao":4,"valor":100}', 'a entrada do próprio jogador');
      ok(m.regra?.empate && m.regra?.zero, 'a regra do mercado não vai junto');
      const txt = JSON.stringify(m);
      ok(!/model|modelo|preco|price|0\.3141|0\.2718|3141|2718/i.test(txt), `o preço do modelo vazou: ${txt.slice(0, 300)}`);
      ok(!/user|j0|j1|j2/.test(txt.replace('"minha"', '')), 'a composição expõe quem entrou');
    } finally { await c.s.fechar(); }
  });

  s.teste('pela rota: sessão obrigatória, id de mercado do corpo ignorado, 100 entradas somam exato', async () => {
    let agora = T0;
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 300,
                                laco: false, relogio: () => agora });
    const porta = await srv.ouvir(0);
    const pedir = (caminho, { metodo = 'GET', corpo, sessao } = {}) =>
      fetch(`http://127.0.0.1:${porta}${caminho}`, { method: metodo, headers: {
        [CABECALHO_VERSAO]: API_VERSAO, ...(sessao ? { authorization: `Bearer ${sessao}` } : {}),
        ...(corpo ? { 'content-type': 'application/json' } : {}) },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}) })
        .then(async r => ({ status: r.status, corpo: await r.json().catch(() => null) }));
    try {
      srv.sched.abrirRodada();
      igual((await pedir('/api/mercado/entrar', { metodo: 'POST', corpo: { selecao: 0, valor: 10 } })).status, 401,
        'entrou no bolo sem sessão');
      const sessoes = [];
      for (let i = 0; i < 100; i++) {
        const r = await pedir('/api/auth/cadastrar', { metodo: 'POST', corpo: {
          username: `p${i}`, email: `p${i}@x.test`, senha: SENHA, nascimento: '1990-01-01' } });
        sessoes.push(r.corpo.sessao);
      }
      const res = await Promise.all(sessoes.map((sessao, i) => pedir('/api/mercado/entrar', { metodo: 'POST', sessao,
        corpo: { selecao: i % 12, valor: 1 + i, mercado: 'outro', rodada: 'outra', odd: 99 } })));
      const falhas = res.filter(r => r.status !== 200);
      igual(falhas.length, 0, `entradas recusadas: ${JSON.stringify(falhas[0]?.corpo)}`);
      const m = await pedir('/api/mercado', { sessao: sessoes[0] });
      igual(m.status, 200, 'a composição não respondeu');
      igual(m.corpo.bruto, 5050, 'o bruto de 100 entradas concorrentes não é a soma exata');
      igual(srv.db.prepare(`SELECT COUNT(DISTINCT market_id) n FROM market_entries`).get().n, 1,
        'o corpo escolheu o mercado');
      const sair = await pedir('/api/mercado/sair', { metodo: 'POST', sessao: sessoes[1] });
      igual(sair.status, 200, 'sair pela rota falhou');
    } finally { await srv.fechar(); }
  });

  return s;
}
