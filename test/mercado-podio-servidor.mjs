/* Q1/Q3/Q6 · O PÓDIO NO SERVIDOR (ST-12.7 · §6.5, §6.13)
 *
 * Fechado por padrão (um mercado por vez); aberto por `MERCADOS`. Quando
 * aberto: trinca validada, preço carimbado, limite somando os DOIS bolos e a
 * aposta, e a liquidação pagando as trincas da posição final do motor.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar, reconciliarNoBanco } from '../server/carteira.mjs';
import { apostar } from '../server/aposta.mjs';
import { definirLimite, ERRO_LIMITE } from '../server/limites.mjs';
import { entrarNoMercado, mercadoParaCliente, resultadoDoMercado, leituraNoBolo, ERRO_MERCADO } from '../server/mercado.mjs';
import { TIPOS_DE_MERCADO, MERCADOS_CONHECIDOS, lerMercados } from '../server/mercado-tipos.mjs';
import { codificar, vencedorasPorPosicoes } from '../engine/mercado-podio.mjs';
import { ROTAS } from '../server/rotas.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);
function montar(mercados) {
  let t = T0;
  const s = criarServidor({ config: { ambiente: 'teste', silencioso: true, ...(mercados ? { mercados } : {}) },
                            banco: ':memory:', sims: 40, laco: false, relogio: () => t });
  let n = 0;
  const jogador = (saldo = 10000) => {
    const id = cadastrar(s.db, { username: `p${n}`, email: `p${n++}@x.test`, senha: 'senha-longa-o-bastante-1',
                                 nascimento: '1990-01-01', agora: t }).id;
    creditar(s.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: saldo, idem: `w${id}`, agora: t });
    return id;
  };
  const encerrar = () => {
    for (let i = 0; i < 200 && s.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; s.sched.tick(); }
  };
  return { s, db: s.db, sched: s.sched, jogador, encerrar, agora: () => t };
}
const lancou = (f, codigo) => { try { f(); } catch (e) { return e.codigo === codigo || e.codigo; } return false; };

export async function suite() {
  const s = criarSuite('mercado-podio-servidor');

  s.teste('a lista de mercados: abates por padrão; nome desconhecido recusa; as duas listas batem', () => {
    igual(JSON.stringify(lerMercados('')), '["abates"]', 'padrão');
    igual(JSON.stringify(lerMercados('abates, podio')), '["abates","podio"]', 'os dois');
    let recusou = false; try { lerMercados('abates,podiu'); } catch { recusou = true; }
    ok(recusou, 'um erro de digitação abriu zero mercados em silêncio');
    igual(JSON.stringify(MERCADOS_CONHECIDOS), JSON.stringify(Object.keys(TIPOS_DE_MERCADO)),
      'a lista da config e o registro de tipos divergem');
  });

  s.teste('fechado por padrão: o pódio não nasce e não aceita entrada', async () => {
    const c = montar();
    try {
      const r = c.sched.abrirRodada();
      igual(c.db.prepare(`SELECT COUNT(*) n FROM markets WHERE round_id = ?`).get(r.id).n, 1, 'abriu mais de um bolo');
      const u = c.jogador();
      igual(lancou(() => entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'podio',
        selecao: codificar([0, 1, 2]), valor: 10, agora: c.agora() }), ERRO_MERCADO.SEM_MERCADO), true, 'entrou num pódio fechado');
      igual(lancou(() => entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'qualquer', selecao: 0, valor: 10,
        agora: c.agora() }), ERRO_MERCADO.SEM_MERCADO), true, 'mercado inventado aceito');
    } finally { await c.s.fechar(); }
  });

  s.teste('aberto: trinca validada, preço carimbado, e o limite soma os dois bolos e a aposta', async () => {
    const c = montar(['abates', 'podio']);
    try {
      const r = c.sched.abrirRodada();
      const pod = c.db.prepare(`SELECT * FROM markets WHERE round_id = ? AND kind = 'podio'`).get(r.id);
      ok(pod && pod.model_price_json && pod.model_priced_at === pod.opens_at, 'o pódio não nasceu com o preço carimbado');
      const u = c.jogador();
      igual(lancou(() => entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'podio',
        selecao: codificar([3, 3, 1]), valor: 10, agora: c.agora() }), ERRO_MERCADO.SELECAO), true, 'trinca com repetido aceita');
      definirLimite(c.db, { userId: u, tipo: 'max_stake_per_round', valor: 100, agora: c.agora() });
      apostar(c.db, { sched: c.sched, userId: u, slot: 0, valor: 40, agora: c.agora() });
      entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'abates', selecao: 1, valor: 30, agora: c.agora() });
      igual(lancou(() => entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'podio',
        selecao: codificar([0, 1, 2]), valor: 31, agora: c.agora() }), ERRO_LIMITE.BLOQUEADO), true,
        'aposta 40 + abates 30 + pódio 31 passou do limite de 100');
      entrarNoMercado(c.db, { sched: c.sched, userId: u, kind: 'podio', selecao: codificar([0, 1, 2]), valor: 30, agora: c.agora() });
      const m = mercadoParaCliente(c.db, { sched: c.sched, userId: u, kind: 'podio' });
      igual(m.selecoes.length, 1, 'o pódio listou trincas sem entrada');
      ok(!/model|0\.\d{4}/.test(JSON.stringify(m)), 'o preço do pódio vazou na composição');
      igual(m.regra.pergunta, TIPOS_DE_MERCADO.podio.regra.pergunta, 'a regra do pódio não vai junto');
      /* A query na FORMA REAL do servidor (URLSearchParams): com um objeto simples
         o teste passava e a rota ignorava o pedido. */
      const rota = ROTAS['GET /api/mercado']({ db: c.db, sched: c.sched, userId: u, query: new URLSearchParams({ kind: 'podio' }) });
      igual(rota.corpo.kind, 'podio', 'a rota ignorou ?kind=podio e devolveu outro bolo');
      igual(JSON.stringify(rota.corpo.abertos), '["abates","podio"]', 'a rota não diz quais bolos estão abertos');
    } finally { await c.s.fechar(); }
  });

  s.teste('a liquidação paga as trincas da posição final do motor, e a conta fecha', async () => {
    const c = montar(['abates', 'podio']);
    try {
      const r = c.sched.abrirRodada();
      /* O teste espia o resultado (o segredo está em memória) para pôr uma
         entrada na trinca que vai vencer — no jogo, ninguém tem isto. */
      const certas = vencedorasPorPosicoes(c.sched.resultadoDaRodada(r.id).map(x => x.pos));
      const [a, b, x] = [c.jogador(), c.jogador(), c.jogador()];
      entrarNoMercado(c.db, { sched: c.sched, userId: a, kind: 'podio', selecao: certas[0], valor: 200, agora: c.agora() });
      const errada = [codificar([0, 1, 2]), codificar([2, 1, 0])].find(t => !certas.includes(t));
      entrarNoMercado(c.db, { sched: c.sched, userId: b, kind: 'podio', selecao: errada, valor: 300, agora: c.agora() });
      entrarNoMercado(c.db, { sched: c.sched, userId: x, kind: 'abates', selecao: 4, valor: 50, agora: c.agora() });
      c.encerrar();
      c.s.laco.passo();
      const pod = c.db.prepare(`SELECT * FROM markets WHERE round_id = ? AND kind = 'podio'`).get(r.id);
      igual(pod.status, 'liquidado', 'o pódio não foi pago');
      igual(pod.winners_json, JSON.stringify(certas), 'os vencedores gravados não são as trincas da posição final');
      const ea = c.db.prepare(`SELECT status, payout FROM market_entries WHERE user_id = ?`).get(a);
      igual(`${ea.status}/${ea.payout}`, `ganha/${pod.pot_net}`, 'quem acertou o pódio sozinho não levou o líquido');
      igual(c.db.prepare(`SELECT payout FROM market_entries WHERE user_id = ?`).get(b).payout, 0, 'quem errou recebeu');
      const casa = c.db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM treasury_ledger WHERE reference_id = ?`).get(pod.id).s;
      igual(ea.payout + casa, 500, 'o pódio não fecha no bruto');
      for (const u of [a, b, x]) igual(reconciliarNoBanco(c.db, u).length, 0, 'ledger × saldo');
      const res = resultadoDoMercado(c.db, { kind: 'podio', userId: a });
      ok(res.selecoes.some(s => s.selecao === certas[0] && s.pagou > 1), 'o resultado do pódio não mostra quanto pagou');
      ok(res.selecoes.every(s => s.modelo !== null && s.modelo >= 0), 'o modelo do pódio não saiu no resultado');
      const leitura = leituraNoBolo(c.db, { userId: a, kind: 'podio' });
      igual(leitura.n, 1, 'a leitura do pódio');
    } finally { await c.s.fechar(); }
  });

  return s;
}
