/* Q1/Q3/Q4 · O MERCADO DE FAIXA DE DURAÇÃO (ST-12.8 · F2.2 · Spec §6.5)
 *
 * Quatro faixas de tempo de luta, com limites MEDIDOS (a fixture guarda a
 * medição) para cada uma ter entre 15% e 35% de chance. A duração é a do
 * motor — a mesma luta, com clima, que o servidor paga (D-119).
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { LIMITES_DURACAO, ROTULOS_DURACAO, faixaDaDuracao, selecoesDaDuracao, vencedorasPorDuracao,
         precoDoModeloDuracao, REGRA_DURACAO } from '../engine/mercado-duracao.mjs';
import { medir } from '../tools/medir-duracao.mjs';
import * as E from './motor.mjs';
import { sementes } from '../engine/seed.mjs';
import { rotuloDoMercado, textoDasRegras } from '../app/modules/bolo-dados.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { entrarNoMercado, ERRO_MERCADO } from '../server/mercado.mjs';
import { TIPOS_DE_MERCADO } from '../server/mercado-tipos.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/duracao.json', import.meta.url), 'utf8'));

export async function suite() {
  const s = criarSuite('mercado-duracao');

  s.teste('as faixas cobrem tudo, sem sobrepor, e cada luta cai em exatamente uma', () => {
    igual(selecoesDaDuracao().length, 4, 'quatro faixas');
    let antes = 0;
    for (let d = 0; d <= 60; d += 0.05) {
      const f = faixaDaDuracao(d);
      ok(f >= 0 && f <= 3, `duração ${d} fora das faixas`);
      ok(f >= antes, `a faixa voltou atrás em ${d}`);
      antes = f;
    }
    igual(faixaDaDuracao(27.999), 0, 'abaixo de 28'); igual(faixaDaDuracao(28), 1, '28 abre a segunda');
    igual(faixaDaDuracao(33), 3, '33 abre a última');
    igual(JSON.stringify(vencedorasPorDuracao(31.2)), '[2]', 'uma vencedora só');
    igual(JSON.stringify(vencedorasPorDuracao(undefined)), '[]', 'sem duração, inventou faixa');
    igual(ROTULOS_DURACAO.length, 4, 'rótulos');
    ok(REGRA_DURACAO.empate && REGRA_DURACAO.pergunta, 'a regra não está escrita');
  });

  s.teste('a fixture de medição: os limites são os do código, e cada faixa fica entre 15% e 35%', () => {
    igual(JSON.stringify(FIXTURE.limites), JSON.stringify(LIMITES_DURACAO), 'a fixture mede outros limites');
    igual(FIXTURE.rodadas, 10000, 'a fixture não é a medição de 10.000 rodadas');
    for (const p of FIXTURE.parcelas) ok(p >= 0.15 && p <= 0.35, `faixa com ${p} — fora de 15–35%`);
    igual(Math.round(FIXTURE.parcelas.reduce((a, b) => a + b, 0) * 1000), 1000, 'as parcelas não somam 1');
  });

  s.teste('um lote NOVO continua compatível com a medição arquivada', () => {
    const agora = medir(1500, 'dur-conferencia');
    agora.parcelas.forEach((p, i) =>
      ok(Math.abs(p - FIXTURE.parcelas[i]) <= 0.05,
        `faixa ${i}: ${p} agora contra ${FIXTURE.parcelas[i]} arquivado — o ritmo das lutas mudou; remeça com tools/medir-duracao.mjs`));
  });

  s.teste('o preço do modelo: determinístico e somando as simulações', () => {
    const t = sementes('duracao-preco');
    const pool = E.sortearPool(t.elenco);
    const a = precoDoModeloDuracao(E.M, pool, 'duracao-preco', 300);
    igual(JSON.stringify(a), JSON.stringify(precoDoModeloDuracao(E.M, pool, 'duracao-preco', 300)), 'mesma raiz, preço diferente');
    igual(a.vence.reduce((x, y) => x + y, 0), 300, 'cada simulação cai em uma faixa');
  });

  s.teste('a tela lê as faixas pelo rótulo do mercado', () => {
    igual(JSON.stringify(rotuloDoMercado('duracao', ['A', 'B'])), JSON.stringify(ROTULOS_DURACAO), 'rótulo das faixas');
    igual(rotuloDoMercado('abates', ['A', 'B'])[1], 'B', 'rótulo dos lutadores');
    const regras = textoDasRegras({ regra: REGRA_DURACAO, taxa: 0.08, semAcerto: 'devolver' }).join(' ');
    ok(/Não há empate/.test(regras) && !/proporção|paga menos/.test(regras),
      `a regra da duração fala em dividir um empate que não existe: ${regras}`);
  });

  /* DETERMINÍSTICO: a rodada do teste abaixo sai de uma raiz sorteada, e em
     ~22% delas a faixa vencedora já é a 0 — um registro que pagasse "sempre a
     0" passava nessas (achado pelo Q2: S1296 escapou uma vez). Aqui, uma
     duração conhecida em cada faixa. */
  s.teste('o registro do servidor paga a faixa da duração que recebe — as quatro', () => {
    for (const [d, faixa] of [[20, 0], [29, 1], [31.5, 2], [40, 3]]) {
      const resultado = Object.assign([], { duracao: d });
      igual(JSON.stringify(TIPOS_DE_MERCADO.duracao.vencedoras(resultado)), `[${faixa}]`, `duração ${d} s`);
    }
  });

  s.teste('no servidor: aberto por configuração, e a liquidação paga a faixa da luta de verdade', async () => {
    let t = Date.UTC(2026, 8, 1, 15);
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true, mercados: ['abates', 'duracao'] },
                                banco: ':memory:', sims: 40, laco: false, relogio: () => t });
    try {
      const r = srv.sched.abrirRodada();
      const ids = [0, 1, 2, 3].map(i => {
        const id = cadastrar(srv.db, { username: `d${i}`, email: `d${i}@x.test`, senha: 'senha-longa-o-bastante-1',
                                       nascimento: '1990-01-01', agora: t }).id;
        creditar(srv.db, { userId: id, tipo: 'WELCOME_GRANT', bucket: 'transferivel', valor: 1000, idem: `w${id}`, agora: t });
        entrarNoMercado(srv.db, { sched: srv.sched, userId: id, kind: 'duracao', selecao: i, valor: 100, agora: t });
        return id;
      });
      let recusou = false;
      try { entrarNoMercado(srv.db, { sched: srv.sched, userId: ids[0], kind: 'duracao', selecao: 4, valor: 10, agora: t }); }
      catch (e) { recusou = e.codigo === ERRO_MERCADO.SELECAO; }
      ok(recusou, 'a faixa 4 (que não existe) foi aceita');
      const certa = faixaDaDuracao(srv.sched.resultadoDaRodada(r.id).duracao);
      for (let i = 0; i < 200 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
      srv.laco.passo();
      const m = srv.db.prepare(`SELECT * FROM markets WHERE round_id = ? AND kind = 'duracao'`).get(r.id);
      igual(m.status, 'liquidado', 'o bolo de duração não foi pago');
      igual(m.winners_json, JSON.stringify([certa]), 'a faixa vencedora não é a da luta paga');
      const ganhou = srv.db.prepare(`SELECT payout FROM market_entries WHERE user_id = ?`).get(ids[certa]).payout;
      igual(ganhou, m.pot_net, 'quem acertou a faixa sozinho não levou o líquido');
    } finally { await srv.fechar(); }
  });

  return s;
}
