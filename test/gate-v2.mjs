/* Q1/Q3/Q9 · OS INDICADORES DO BOLO E O GATE DA V2 (ST-12.10 · F2.8 · §6.14, §6.15)
 *
 * O gate MEDE e não tranca (decisão do dono, 26/09). O que ele não pode fazer
 * é fingir: abaixo da amostra declarada, "amostra insuficiente" — nunca um
 * "passou" por falta de contra-exemplo. E uma divergência de liquidação
 * reprova sozinha, sem amostra mínima.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { indicadoresDoBolo, calibracaoPorSemana, gateDaV2, concentracao, META } from '../engine/gate-v2.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { ROTAS } from '../server/rotas.mjs';
import { liquidarMercado } from '../server/mercado.mjs';
import { gateDaV2Servidor } from '../server/gate-v2.mjs';
import { politicaMonetaria } from '../server/politica.mjs';
import { relatorioDoPiloto } from '../server/piloto.mjs';

const bolo = (pares, { saiu } = {}) => {
  const totais = new Array(12).fill(0);
  for (const [, sel, v] of pares) totais[sel] += v;
  const entrou = pares.reduce((a, [, , v]) => a + v, 0);
  return { entradas: pares.map(([user, selecao, valor]) => ({ user, selecao, valor })), totais, entrou, saiu: saiu ?? entrou };
};
const calib = (p, d, bp = 0.2, bd = 0.2) => ({ primeira: { n: p, brier: bp }, depois: { n: d, brier: bd } });

export async function suite() {
  const s = criarSuite('gate-v2');

  s.teste('indicadores: pessoas DISTINTAS por bolo, concentração, divergências', () => {
    const i = indicadoresDoBolo([
      bolo([['a', 0, 10], ['a', 0, 10], ['b', 1, 10]]),                   // 2 pessoas, 3 entradas
      bolo([['a', 0, 5], ['b', 1, 5], ['c', 2, 5], ['d', 3, 5]]),          // 4 pessoas
      bolo([]),                                                             // bolo vazio
      bolo([['e', 5, 50]], { saiu: 49 }),                                   // 1 divergência
    ]);
    igual(i.bolos, 4, 'bolos'); igual(i.bolosComEntrada, 3, 'com entrada');
    igual(i.entrantesPorBolo, 2, 'mediana de pessoas contou entradas, não pessoas');
    igual(i.entradasPorBolo, 3, 'mediana de entradas');
    igual(i.divergencias, 1, 'a divergência não foi contada');
    igual(i.jogadores, 5, 'jogadores distintos');
    igual(concentracao([0, 100, 0]), 1, 'tudo num lutador');
    igual(concentracao(new Array(12).fill(7)).toFixed(4), (1 / 12).toFixed(4), 'espalhado por igual');
  });

  s.teste('calibração: a primeira semana de conta contra o resto', () => {
    const d = 86_400_000;
    const c = calibracaoPorSemana([{ score: 0.3, criadoEm: 2 * d, contaCriadaEm: 0 }, { score: 0.1, criadoEm: 9 * d, contaCriadaEm: 0 },
                                   { score: 0.2, criadoEm: 8 * d, contaCriadaEm: 0 }]);
    igual(c.primeira.n, 1, 'primeira semana'); igual(c.depois.n, 2, 'depois');
    igual(c.depois.brier.toFixed(3), '0.150', 'média do depois');
  });

  s.teste('abaixo da amostra: "amostra insuficiente", nunca "passou"', () => {
    const pouco = indicadoresDoBolo(Array.from({ length: 10 }, () => bolo([['a', 0, 1], ['b', 1, 1], ['c', 2, 1], ['d', 3, 1], ['e', 4, 1]])));
    const g = gateDaV2({ indicadores: pouco, calibracao: calib(5, 5, 0.3, 0.1), ligaJogadores: 2, ativos: 4 });
    igual(g.criterios.liquidez.veredito, 'amostra insuficiente', '10 bolos com 5 pessoas "passou" a liquidez');
    igual(g.criterios.melhorando.veredito, 'amostra insuficiente', '5 previsões "passou" a calibração');
    igual(g.veredito, 'amostra insuficiente', 'o gate inteiro fingiu passar');
    igual(g.criterios.participacao.valor, 0.5, 'participação na Liga');
  });

  s.teste('com amostra: a meta decide; uma divergência reprova sozinha', () => {
    const cinco = [['a', 0, 1], ['b', 1, 1], ['c', 2, 1], ['d', 3, 1], ['e', 4, 1]];
    const bons = indicadoresDoBolo(Array.from({ length: META.bolosMinimos }, () => bolo(cinco)));
    const cal = calib(40, 40, 0.3, 0.2);
    igual(gateDaV2({ indicadores: bons, calibracao: cal, ligaJogadores: 3, ativos: 5 }).veredito, 'passou', 'tudo certo não passou');
    const quatro = indicadoresDoBolo(Array.from({ length: META.bolosMinimos }, () => bolo(cinco.slice(0, 4))));
    igual(gateDaV2({ indicadores: quatro, calibracao: cal, ligaJogadores: 3, ativos: 5 }).criterios.liquidez.veredito,
      'não passou', '4 pessoas por bolo passou a liquidez');
    igual(gateDaV2({ indicadores: bons, calibracao: calib(40, 40, 0.2, 0.3), ligaJogadores: 3, ativos: 5 }).criterios.melhorando.veredito,
      'não passou', 'calibração piorando passou');
    const umErrado = indicadoresDoBolo([bolo([['a', 0, 10]], { saiu: 11 })]);
    const g = gateDaV2({ indicadores: umErrado, calibracao: calib(0, 0), ligaJogadores: 0, ativos: 0 });
    igual(g.veredito, 'não passou', 'uma divergência de liquidação ficou escondida atrás de "amostra insuficiente"');
  });

  s.teste('no servidor: eventos sem amostragem e sem duplicar, e o gate no painel e no piloto', async () => {
    let t = Date.UTC(2026, 8, 1, 15);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40,
                                laco: false, relogio: () => t });
    try {
      const us = Array.from({ length: 3 }, (_, i) => {
        const id = cadastrar(srv.db, { username: `g${i}`, email: `g${i}@x.test`, senha: 'senha-longa-o-bastante-1',
                                       nascimento: '1990-01-01', agora: t }).id;
        creditar(srv.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 10000, idem: `w${id}`, agora: t });
        return id;
      });
      srv.sched.abrirRodada();
      for (const [i, u] of us.entries()) {
        const r = ROTAS['POST /api/mercado/entrar']({ db: srv.db, sched: srv.sched, userId: u, agora: t,
                                                     corpo: { selecao: i, valor: 100 + i } });
        igual(r.status ?? 200, 200, `a entrada pela rota falhou: ${JSON.stringify(r.corpo)}`);
      }
      const nEntradas = srv.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome = 'market_entry'`).get().n;
      igual(nEntradas, 3, 'a entrada no bolo não virou evento');
      for (let i = 0; i < 200 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
      srv.laco.passo();
      const ev = () => srv.db.prepare(`SELECT COUNT(*) n FROM telemetry_events WHERE nome = 'market_settled'`).get().n;
      igual(ev(), 3, 'um evento por entrada paga');
      const m = srv.db.prepare(`SELECT id FROM markets`).get();
      srv.db.prepare(`UPDATE markets SET status = 'travado' WHERE id = ?`).run(m.id);
      try { liquidarMercado(srv.db, { sched: srv.sched, marketId: m.id, agora: t }); } catch { /* a chave da tesouraria recusa */ }
      igual(ev(), 3, 'reprocessar duplicou o evento');
      srv.db.prepare(`UPDATE markets SET status = 'liquidado' WHERE id = ?`).run(m.id);

      const g = gateDaV2Servidor(srv.db, { agora: t });
      igual(g.indicadores.bolosComEntrada, 1, 'bolos com entrada');
      igual(g.indicadores.entrantesPorBolo, 3, 'entrantes');
      igual(g.indicadores.divergencias, 0, 'o servidor diverge de si mesmo');
      igual(g.gate.criterios.liquidez.veredito, 'amostra insuficiente', 'um bolo "passou" a liquidez');
      ok(politicaMonetaria(srv.db, { agora: t }).bolo?.gate, 'o painel de política não traz o gate');
      ok(relatorioDoPiloto(srv.db, { agora: t }).bolo?.indicadores, 'o relatório do piloto não traz o bolo');
    } finally { await srv.fechar(); }
  });

  return s;
}
