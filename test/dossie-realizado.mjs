/* Q1/Q3/Q6/Q8 · O DOSSIÊ REALIZADO, DO SERVIDOR (ST-9.5 · F3.9 · Spec §7.12, §7.17)
 *
 * As rodadas que este servidor lutou, por lutador, gravadas depois do fim a
 * partir da raiz revelada. Liquidar duas vezes grava uma; rodada aberta ou
 * travada nunca entra; os números são os de `resultadoDaRodada`; e a rota
 * pública não muda durante a janela de apostas.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { ESTADOS } from '../server/scheduler.mjs';
import { gravarResultadosPendentes, dossieRealizado } from '../server/dossie-realizado.mjs';
import { API_VERSAO, CABECALHO_VERSAO } from '../server/contrato.mjs';

const T0 = Date.UTC(2026, 8, 1, 15);

/* Um servidor de teste que gira rodadas pela mão: abre, anda até encerrar e
   dá um passo do laço (que liquida e grava). */
function montar() {
  let t = T0;
  const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40,
                              laco: false, relogio: () => t });
  const girar = () => {
    const r = srv.sched.abrirRodada();
    for (let i = 0; i < 300 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) { t += 1000; srv.sched.tick(); }
    srv.laco.passo();
    return r.id;
  };
  return { srv, girar, avancar: ms => { t += ms; } };
}
const linhas = (db, id) => db.prepare(`SELECT * FROM round_results WHERE round_id = ? ORDER BY slot`).all(id);

export async function suite() {
  const s = criarSuite('dossie-realizado');

  s.teste('cada rodada encerrada grava os 12, com a posição e os abates da conta que paga', async () => {
    const { srv, girar } = montar();
    try {
      const ids = [girar(), girar(), girar()];
      for (const id of ids) {
        const gravado = linhas(srv.db, id);
        const conta = srv.sched.resultadoDaRodada(id);
        igual(gravado.length, 12, `rodada ${id}: ${gravado.length} lutadores gravados`);
        igual(JSON.stringify(gravado.map(x => [x.dex, x.pos, x.abates])), JSON.stringify(conta.map(x => [x.dex, x.pos, x.abates])),
          `rodada ${id}: o gravado não é o resultado da rodada`);
        ok(gravado.every(x => x.clima === conta.clima) && conta.clima, `rodada ${id}: clima ${gravado[0].clima} ≠ ${conta.clima}`);
        igual(gravado.filter(x => x.pos === 1).length, 1, 'um campeão por rodada');
      }
    } finally { await srv.fechar(); }
  });

  s.teste('liquidar duas vezes grava uma', async () => {
    const { srv, girar } = montar();
    try {
      const id = girar();
      igual(gravarResultadosPendentes(srv.db, { sched: srv.sched }), 0, 'a rodada já gravada foi gravada de novo');
      srv.laco.passo();
      igual(linhas(srv.db, id).length, 12, 'duplicou');
    } finally { await srv.fechar(); }
  });

  s.teste('rodada aberta ou travada nunca entra, e a rota não muda durante a janela', async () => {
    const { srv, girar, avancar } = montar();
    const porta = await srv.ouvir(0);
    const pedir = c => fetch(`http://127.0.0.1:${porta}${c}`, { headers: { [CABECALHO_VERSAO]: API_VERSAO } })
      .then(async r => ({ status: r.status, texto: await r.text() }));
    try {
      girar(); girar();
      const antes = await pedir('/api/rodada/dossie');
      igual(antes.status, 200, 'a rota pública pediu sessão');
      igual(JSON.parse(antes.texto).rodadas, 2, 'o agregado não conta as duas encerradas');
      const r = srv.sched.abrirRodada();
      /* Com a rodada ABERTA e depois TRAVADA: nenhuma linha dela, e a resposta
         idêntica byte a byte — nada da rodada em curso vaza pelo agregado. */
      let viuTravada = false;
      for (let i = 0; i < 300 && srv.sched.rodadaAtual().status !== ESTADOS.ENCERRADA; i++) {
        const st = srv.sched.rodadaAtual().status;
        viuTravada ||= st === ESTADOS.TRAVADA;
        if (i % 5 === 0) {
          gravarResultadosPendentes(srv.db, { sched: srv.sched });
          igual(linhas(srv.db, r.id).length, 0, `a rodada em curso (${st}) entrou no dossiê`);
          igual((await pedir('/api/rodada/dossie')).texto, antes.texto, `a rota mudou com a rodada ${st}`);
        }
        avancar(1000); srv.sched.tick();
      }
      ok(viuTravada, 'o teste nunca viu a rodada travada');
      srv.laco.passo();
      igual(linhas(srv.db, r.id).length, 12, 'a rodada encerrada não entrou');
      igual(JSON.parse((await pedir('/api/rodada/dossie')).texto).rodadas, 3, 'o agregado não subiu depois do fim');
    } finally { await srv.fechar(); }
  });

  s.teste('uma linha de rodada não encerrada, entrada por outro caminho, não vira número público', async () => {
    const { srv, girar } = montar();
    try {
      girar();
      const antes = JSON.stringify(dossieRealizado(srv.db));
      const r = srv.sched.abrirRodada();
      srv.db.prepare(`INSERT INTO round_results (round_id, slot, dex, pos, abates, clima) VALUES (?, 0, 6, 1, 11, 'sol')`).run(r.id);
      igual(JSON.stringify(dossieRealizado(srv.db)), antes, 'o agregado leu a rodada em curso');
    } finally { await srv.fechar(); }
  });

  s.teste('os números batem com o gravado, cada um com o seu n', async () => {
    const { srv, girar } = montar();
    try {
      const ids = Array.from({ length: 30 }, girar);
      const d = dossieRealizado(srv.db);
      igual(d.rodadas, ids.length, 'rodadas');
      const todas = srv.db.prepare(`SELECT * FROM round_results`).all();
      let somaN = 0, somaV = 0;
      for (const [dex, e] of Object.entries(d.especies)) {
        const dela = todas.filter(x => x.dex === Number(dex));
        igual(e.n, dela.length, `${dex}: n`);
        igual(e.vitoria.n, e.n, `${dex}: vitória sem o n`);
        igual(Math.round(e.vitoria.taxa * e.n), dela.filter(x => x.pos === 1).length, `${dex}: vitórias`);
        ok(Math.abs(e.abates.media * e.n - dela.reduce((a, x) => a + x.abates, 0)) < 1e-9, `${dex}: abates`);
        igual(Math.round(e.caiCedo.taxa * e.n), dela.filter(x => x.pos >= 10).length, `${dex}: cai cedo`);
        somaN += e.n; somaV += Math.round(e.vitoria.taxa * e.n);
      }
      igual(somaN, 12 * ids.length, 'as aparições não somam 12 por rodada');
      igual(somaV, ids.length, 'uma vitória por rodada');
    } finally { await srv.fechar(); }
  });

  s.teste('rodada que o motor de hoje não reproduz não entra — e o erro tem endereço', async () => {
    const { srv, girar } = montar();
    try {
      const id = girar();
      srv.db.prepare(`DELETE FROM round_results WHERE round_id = ?`).run(id);
      srv.db.prepare(`UPDATE round_fighters SET species_id = species_id + 1 WHERE round_id = ? AND slot = 0`).run(id);
      let erro = null;
      try { gravarResultadosPendentes(srv.db, { sched: srv.sched }); } catch (e) { erro = e; }
      ok(erro && /não bate com a publicada/.test(erro.message), `sem erro de divergência: ${erro?.message}`);
      igual(linhas(srv.db, id).length, 0, 'a rodada divergente entrou no dossiê');
    } finally { await srv.fechar(); }
  });

  return s;
}
