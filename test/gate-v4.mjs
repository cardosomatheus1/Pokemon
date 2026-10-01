/* Q1/Q3/Q6/Q9 · A JORNADA ENSINA A APOSTAR? — a telemetria e o gate da V4
 * (ST-10.20 · F4.9 · Spec §8.15, §8.16).
 *
 * A pergunta do épico é uma só, e a resposta sai com número e n, ou "amostra
 * insuficiente": depois de vencer o Brock, o jogador PREVÊ melhor na Liga de
 * Previsão? Duas armadilhas, e as duas têm teste:
 *
 *   a janela     antes e depois com o MESMO número de previsões — janela
 *                desigual dá ao lado maior uma média mais estável, sempre
 *   a prática    quem joga mais prevê melhor com o tempo, tenha vencido o
 *                Brock ou não; o efeito é a melhora de quem venceu MENOS a
 *                de quem não venceu, no mesmo ponto da própria história
 *
 * E "nunca mede só quem terminou": a conclusão de cada ginásio divide por
 * quem TENTOU, e o abandono conta quem parou numa derrota.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { aprendizadoDaJornada, kpisDaV4, gateDaV4, rebuilds, META_V4 } from '../engine/gate-v4.mjs';
import { gateDaV4Servidor } from '../server/gate-v4.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { cadastrar } from '../server/auth.mjs';
import { receberDoCliente, DO_CLIENTE, emitir } from '../server/telemetria.mjs';
import { relatorioDoPiloto } from '../server/piloto.mjs';
import { eventoDaLuta, eventoDoGinasio, eventoDaChance } from '../app/modules/telemetria-v4.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const H = 3600e3, DIA = 24 * H, T0 = Date.UTC(2026, 8, 1, 15);
const prevs = (briers, desde) => briers.map((brier, i) => ({ em: desde + i * H, brier }));

export function suite() {
  const s = criarSuite('gate-v4');

  s.teste('o aprendizado: a MESMA janela dos dois lados, e a prática descontada', () => {
    /* Tratado: 7 antes (as 5 ÚLTIMAS contam) e 5 depois. */
    const t = { previsoes: [...prevs([0.9, 0.9, 0.8, 0.8, 0.8, 0.8, 0.8], T0), ...prevs([0.5, 0.5, 0.5, 0.5, 0.5], T0 + 20 * H)], brock: T0 + 10 * H };
    /* Controle: nunca venceu o Brock; 10 previsões, partidas ao MEIO. */
    const c = { previsoes: prevs([0.8, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7, 0.7, 0.7, 0.7], T0), brock: null };
    const r = aprendizadoDaJornada([t, c]);
    igual(r.tratados.n, 1, 'o tratado não entrou');
    ok(Math.abs(r.tratados.antes - 0.8) < 1e-9, `a janela de antes não é a das K últimas: ${r.tratados.antes}`);
    ok(Math.abs(r.tratados.melhora - 0.3) < 1e-9, `a melhora do tratado (Brier menor é melhor): ${r.tratados.melhora}`);
    igual(r.controle.n, 1, 'o controle não entrou');
    ok(Math.abs(r.controle.melhora - 0.1) < 1e-9, `a melhora do controle: ${r.controle.melhora}`);
    ok(Math.abs(r.efeito - 0.2) < 1e-9, `o efeito não desconta a prática: ${r.efeito}`);
    /* Poucas previsões de um lado: fica de fora, e não vira 1 contra 1. */
    igual(aprendizadoDaJornada([{ previsoes: [...prevs([0.5, 0.5], T0), ...prevs([0.4, 0.4, 0.4, 0.4, 0.4], T0 + 9 * H)], brock: T0 + 5 * H }]).tratados.n, 0, 'janela menor que o mínimo entrou');
    /* Sem controle, não há efeito — só a melhora crua, ao lado. */
    const so = aprendizadoDaJornada([t]);
    igual(so.efeito, null, 'efeito sem grupo de controle');
    ok(so.tratados.melhora > 0, 'a melhora crua some sem controle');
  });

  s.teste('os KPIs do §8.15: quem TENTOU, quem parou numa derrota, e o time refeito', () => {
    const L = (user, em, no, venceu, especies, p = 0.5) => ({ user, em, no, venceu, p, especies, tamanho: especies.length });
    const lutas = [
      L('a', T0, 'pewter', false, [4]), L('a', T0 + H, 'pewter', true, [7, 16]),              // refez o time e venceu
      L('b', T0, 'pewter', false, [4]), L('b', T0 + H, 'pewter', false, [4]),                  // mesmo time, perdeu de novo — e parou
      L('c', T0, 'pewter', true, [1, 4, 7, 16, 19, 25]),                                       // time completo
      L('d', T0, 'pewter', true, [25]),                                                        // venceu e descansou — não é abandono
    ];
    const k = kpisDaV4({ lutas, atividade: { a: T0 + 9 * DIA, b: T0 + H, c: T0 + 9 * DIA, d: T0 + H }, agora: T0 + 10 * DIA });
    /* Conclusão: 2 de 3 que TENTARAM — e não 2 de 2 que terminaram. */
    igual(`${k.conclusao.pewter.venceram}/${k.conclusao.pewter.tentaram}`, '3/4', 'a conclusão mede só quem terminou');
    igual(`${k.abandono.pararam}/${k.abandono.n}`, '1/4', 'o abandono por dificuldade (quem venceu e descansou não conta)');
    igual(`${k.rebuilds.refeitos}/${k.rebuilds.derrotas}`, '1/2', 'o time refeito depois da derrota');
    ok(Math.abs(k.timeCompleto.valor - 1 / 4) < 1e-9 && k.timeCompleto.n === 4, `o time completo: ${JSON.stringify(k.timeCompleto)}`);
    igual(k.variedade, 6, 'a variedade de espécies');
    igual(`${k.concentracao.dex}:${k.concentracao.n}`, '4:12', 'a espécie mais usada, e o n (aparições nas lutas)');
    ok(Math.abs(k.concentracao.valor - 4 / 12) < 1e-9, `a concentração do meta: ${k.concentracao.valor}`);
    ok(Math.abs(k.lutasPorJogadorDia - 6 / 4) < 1e-9, `lutas por jogador-dia: ${k.lutasPorJogadorDia}`);
    /* A chance exibida é calibrada? Por faixa, com o n. */
    const faixa = k.calibracao.find(f => f.de === 0.3);
    igual(`${faixa.n}:${faixa.venceu}`, '6:3', 'a faixa do meio');
    /* O time refeito é DERIVADO da sequência — o cliente não o declara. */
    igual(rebuilds([L('x', T0, 'g', false, [1]), L('x', T0 + 1, 'h', true, [2]), L('x', T0 + 2, 'g', true, [1])]).refeitos, 0, 'outro nó contou como time refeito');
  });

  s.teste('o gate da V4 (§8.16): mede e não tranca; abaixo da amostra, "amostra insuficiente"', () => {
    const vazio = kpisDaV4({ lutas: [], atividade: {}, agora: T0 });
    const g0 = gateDaV4({ kpis: vazio, aprendizado: aprendizadoDaJornada([]) });
    /* "Base ativa" é CONTAGEM, e não amostra: sem ninguém, a base não existe. */
    igual(g0.criterios.base.veredito, 'não passou', 'base ativa sem ninguém passou');
    igual(g0.criterios.balanceamento.veredito, 'amostra insuficiente', 'o balanceamento decidido sem lutas');
    igual(g0.veredito, 'não passou', 'o veredito do gate vazio');
    for (const c of Object.values(g0.criterios)) ok('n' in c || c.veredito === 'medido', `critério sem o n: ${JSON.stringify(c)}`);
    /* O meta concentrado reprova o balanceamento, com n suficiente. */
    const lutas = Array.from({ length: META_V4.lutasBalanceamento }, (_, i) => ({ user: `u${i % 40}`, em: T0 + i, no: 'pewter', venceu: true, p: 0.5, especies: [6, i % 7 + 10], tamanho: 2 }));
    const g1 = gateDaV4({ kpis: kpisDaV4({ lutas, atividade: {}, agora: T0 }), aprendizado: aprendizadoDaJornada([]) });
    igual(g1.criterios.balanceamento.veredito, 'não passou', `o Charizard em metade dos times passou: ${JSON.stringify(g1.criterios.balanceamento)}`);
    igual(g1.criterios.aprendizado.veredito, 'amostra insuficiente', 'aprendizado sem tratados');
  });

  /* ST-13.5f · L-208: a luta e o ginásio são FATOS do servidor; o aparelho
     só relata a chance que mostrou. */
  s.teste('o cliente: só a chance; a luta e o ginásio são do servidor, e o time refeito também', () => {
    ok(DO_CLIENTE.includes('p_exibida'), 'a chance exibida não está na lista do cliente');
    for (const n of ['pve_iniciado', 'ginasio_vencido']) ok(!DO_CLIENTE.includes(n), `o cliente ainda declara ${n}`);
    ok(!DO_CLIENTE.includes('time_refeito'), 'o cliente pode declarar que refez o time');
    const A = [{ dex: 7, nivel: 14 }, { dex: 16, nivel: 13 }];
    const e1 = eventoDaLuta({ no: 'pewter', semente: 123, p: 0.61234, preset: 'balanced', timeA: A, venceu: true, agora: T0 });
    igual(e1.nome, 'pve_iniciado', 'o nome');
    igual(eventoDaLuta({ no: 'pewter', semente: 123, p: 0.6, preset: 'balanced', timeA: A, venceu: true, agora: T0 + 999 }).chave, e1.chave, 'a chave depende do relógio');
    igual(`${e1.campos.especies}|${e1.campos.tamanho}|${e1.campos.p}`, '7,16|2|0.612', 'os campos da luta');
    ok(Object.values(e1.campos).every(v => typeof v !== 'string' || v.length <= 40), 'campo de texto maior que o servidor aceita');
    igual(eventoDoGinasio({ no: 'pewter', insignia: 'rocha', agora: T0 }).chave, 'gin:pewter', 'a chave do ginásio');
    const c1 = eventoDaChance({ no: 'pewter', p: 0.4, preset: 'balanced', timeA: A, agora: T0 });
    igual(eventoDaChance({ no: 'pewter', p: 0.4, preset: 'balanced', timeA: A, agora: T0 + H }).chave, c1.chave, 'a mesma chance no mesmo dia virou dois eventos');
    ok(eventoDaChance({ no: 'pewter', p: 0.4, preset: 'defensive', timeA: A, agora: T0 }).chave !== c1.chave, 'outro preset é outra chance');
    const tela = semComentario(fonte('../app/modules/jornada-tela.mjs'));
    ok(/relatarChance\(\{/.test(tela) && !/relatarLuta/.test(tela), 'a tela não relata a chance, ou ainda relata a luta');
  });

  s.teste('o servidor: lê as lutas que ELE anotou e as previsões do banco; o relato do aparelho é recusado', () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    try {
      const u = cadastrar(srv.db, { username: 'g41', email: 'g41@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
      const A = [{ dex: 4, nivel: 12 }];
      const fatos = [
        eventoDaLuta({ no: 'pewter', semente: 1, p: 0.1, preset: 'balanced', timeA: A, venceu: false, agora: T0 }),
        eventoDaLuta({ no: 'pewter', semente: 2, p: 0.9, preset: 'balanced', timeA: [{ dex: 7, nivel: 12 }], venceu: true, agora: T0 + 1 }),
        eventoDoGinasio({ no: 'pewter', insignia: 'rocha', agora: T0 + 1 })];
      const r1 = receberDoCliente(srv.db, { userId: u, agora: T0, eventos: [...fatos, { nome: 'time_refeito', chave: 'tr:1', campos: {} }] });
      igual(`${r1.aceitos}/${r1.recusados}`, '0/4', 'o aparelho declarou a luta, o ginásio ou o time refeito');
      /* como o servidor anota quando ele luta (`lutarNaConta`): chave `srv:` e origem */
      for (const e of fatos) emitir(srv.db, { nome: e.nome, userId: u, chave: `srv:${e.chave}`, campos: { ...e.campos, origem: 'servidor' }, agora: T0 });
      const g = gateDaV4Servidor(srv.db, { agora: T0 + DIA, primeiroGinasio: 'pewter' });
      igual(`${g.kpis.conclusao.pewter.venceram}/${g.kpis.conclusao.pewter.tentaram}`, '1/1', 'a conclusão do servidor');
      igual(`${g.kpis.rebuilds.refeitos}/${g.kpis.rebuilds.derrotas}`, '1/1', 'o servidor não derivou o time refeito');
      igual(g.gate.criterios.aprendizado.veredito, 'amostra insuficiente', 'um jogador decidiu o aprendizado');
      ok(/FROM predictions/.test(fonte('../server/gate-v4.mjs')), 'as previsões não vêm do banco');
      igual(JSON.stringify(relatorioDoPiloto(srv.db, { agora: T0 + DIA }).v4.gate), JSON.stringify(g.gate), 'o relatório do piloto tem outra conta');
      ok(/GATE 4→5/.test(fonte('../tools/relatorio-piloto.mjs')), 'o relatório impresso não mostra o gate da V4');
    } finally { srv.fechar?.(); }
  });

  return s;
}
