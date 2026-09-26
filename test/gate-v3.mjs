/* Q1/Q3/Q6/Q9 · A TELEMETRIA E O GATE DA V3 (ST-9.18 · F3.13 · Spec §7.20, §7.21)
 *
 * Evento fora da lista é recusado; o reenvio não duplica; nada é amostrado; o
 * gate sai com n, ou com "amostra insuficiente"; e as duas comparações
 * (diversidade antes/depois do dossiê, D7 de quem capturou) controlam o tempo
 * de jogo — sem isso elas medem o apetite do jogador, e não o efeito.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import { diversidadeAntesDepois, d7PorCaptura, gateDaV3, META } from '../engine/gate-v3.mjs';
import { gateDaV3Servidor } from '../server/gate-v3.mjs';
import { criarServidor } from '../server/servidor.mjs';
import { cadastrar } from '../server/auth.mjs';
import { receberDoCliente, DO_CLIENTE } from '../server/telemetria.mjs';
import { relatorioDoPiloto } from '../server/piloto.mjs';
import { eventoDoDossie, eventoDoComparador, eventosDoGesto } from '../app/modules/telemetria-v3.mjs';
import { eventosDoEstado } from '../app/modules/telemetria-servidor.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const H = 3600e3, DIA = 24 * H, T0 = Date.UTC(2026, 8, 1, 15);
const apostas = (especies, desde) => especies.map((especie, i) => ({ em: desde + i * H, especie }));
const cria = (id, dex, extra = {}) => ({ id, dex, nivel: 5, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                                       origem: 'captura', stamina: 100, staminaEm: T0, criadaEm: T0, ...extra });
const V3 = ['dossie_consultado', 'moveset_comparado', 'doce_gasto', 'evolucao_feita', 'criatura_solta', 'creature_captured'];

export function suite() {
  const s = criarSuite('gate-v3');

  s.teste('diversidade: a MESMA janela dos dois lados, e só com o mínimo de apostas', () => {
    /* Antes: 5 no mesmo lutador e depois 5 distintos — são as 5 ÚLTIMAS antes
       que contam (janela igual à de depois). A janela inteira daria 6/10. */
    const antes = apostas([1, 1, 1, 1, 1, 2, 3, 4, 5, 6], T0);
    const depois = apostas([7, 8, 9, 10, 11], T0 + 20 * H);
    const r = diversidadeAntesDepois([{ apostas: [...depois, ...antes], primeiraConsulta: T0 + 15 * H }]);
    igual(r.n, 1, 'o par não entrou');
    igual(r.antes, 1, 'a janela de antes não é a das K últimas — diversidade medida em janela desigual');
    igual(r.depois, 1, 'depois');
    /* Poucas apostas de um lado: fica de fora, e não vira 1/1. */
    igual(diversidadeAntesDepois([{ apostas: [...apostas([1, 1, 1, 1, 1, 1], T0), ...apostas([2, 3, 4, 5], T0 + 20 * H)],
                                     primeiraConsulta: T0 + 10 * H }]).n, 0, 'janela menor que o mínimo entrou');
    igual(diversidadeAntesDepois([{ apostas: antes, primeiraConsulta: null }]).n, 0, 'quem nunca consultou entrou');
    const sobe = diversidadeAntesDepois([{ apostas: [...apostas([1, 1, 1, 1, 1], T0), ...apostas([1, 2, 3, 4, 5], T0 + 9 * H)],
                                           primeiraConsulta: T0 + 8 * H }]);
    ok(sobe.subiram === 1 && sobe.desceram === 0 && sobe.depois > sobe.antes, `subir: ${JSON.stringify(sobe)}`);
  });

  s.teste('D7 de quem capturou: dentro da faixa de atividade, e a diferença crua ao lado', () => {
    /* Simpson de propósito: em cada faixa capturar NÃO muda o D7 (20% e 80%),
       mas quem captura joga mais — a diferença crua é 36 pontos de puro apetite. */
    const grupo = (n, capturou, atividadeDia0, voltaram) =>
      Array.from({ length: n }, (_, i) => ({ capturou, atividadeDia0, voltouD7: i < voltaram }));
    const us = [...grupo(5, true, 1, 1), ...grupo(20, false, 1, 4), ...grupo(20, true, 12, 16), ...grupo(5, false, 12, 4),
                { capturou: true, atividadeDia0: 5, voltouD7: null }];
    const r = d7PorCaptura(us);
    ok(Math.abs(r.diferenca) < 1e-9, `a diferença não controla o tempo de jogo: ${r.diferenca}`);
    ok(Math.abs(r.diferencaCrua - 0.36) < 1e-9, `a crua: ${r.diferencaCrua}`);
    igual(r.n, 50, 'a coorte sem sete dias entrou, ou uma faixa sumiu');
  });

  s.teste('o gate: n, ou "amostra insuficiente" — e a antifraude que não existe não passa', () => {
    const pouco = gateDaV3({ diversidade: { n: META.usuariosDossie - 1, antes: 0.2, depois: 0.9, subiram: 19, desceram: 0 },
                             capturas: { total: 0, jogadorDias: 0 } });
    igual(pouco.criterios.dossie.veredito, 'amostra insuficiente', 'passou por falta de contra-exemplo');
    igual(pouco.criterios.dossie.n, META.usuariosDossie - 1, 'sem o n');
    igual(pouco.criterios.captura.veredito, 'amostra insuficiente', 'captura sem jogador-dia');
    igual(pouco.criterios.antifraude.veredito, 'não passou', 'a antifraude não construída passou');
    igual(pouco.veredito, 'não passou', 'o veredito geral ignorou um "não passou"');
    const muito = gateDaV3({ diversidade: { n: 30, antes: 0.3, depois: 0.5, subiram: 20, desceram: 5 },
                             capturas: { total: 12, jogadorDias: 40 }, antifraudeConstruida: true });
    igual(muito.criterios.dossie.veredito, 'passou', 'o dossiê mudou o comportamento e não passou');
    igual(muito.criterios.captura.valor, 0.3, 'capturas por jogador-dia');
    igual(muito.veredito, 'passou', 'com tudo medido e o P4 coberto');
    igual(gateDaV3({ diversidade: { n: 30, antes: 0.5, depois: 0.5, subiram: 10, desceram: 10 }, capturas: { total: 1, jogadorDias: 1 },
                     antifraudeConstruida: true }).criterios.dossie.veredito, 'não passou', 'sem mudança passou');
  });

  s.teste('o servidor: evento fora da lista recusado, reenvio não duplica, nada amostrado, gate com n', () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    try {
      for (const nome of V3) ok(DO_CLIENTE.includes(nome), `${nome} não está na lista do cliente`);
      const u = cadastrar(srv.db, { username: 'g3', email: 'g3@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
      const r1 = receberDoCliente(srv.db, { userId: u, agora: T0, eventos: [
        { nome: 'bet_placed', chave: 'x1', campos: { valor: 9999 } },         // o cliente não diz quanto apostou
        { nome: 'dossie_hackeado', chave: 'x2', campos: {} },
        eventoDoDossie({ dex: 6, rodada: 'r1', antesDeApostar: true, agora: T0 })] });
      igual(`${r1.aceitos}/${r1.recusados}`, '1/2', 'a lista não é fechada');
      /* 40 consultas distintas: todas guardadas — métrica de gate não se amostra. */
      const lote = Array.from({ length: 40 }, (_, i) => eventoDoDossie({ dex: i + 1, rodada: 'r2', antesDeApostar: false, agora: T0 }));
      receberDoCliente(srv.db, { userId: u, agora: T0, eventos: lote });
      receberDoCliente(srv.db, { userId: u, agora: T0 + 1, eventos: lote });   // o reenvio
      const n = srv.db.prepare(`SELECT COUNT(*) AS n FROM telemetry_events WHERE nome = 'dossie_consultado'`).get().n;
      igual(n, 41, 'o reenvio duplicou, ou o evento foi amostrado');
      const g = gateDaV3Servidor(srv.db, { agora: T0 + DIA });
      igual(g.gate.criterios.dossie.veredito, 'amostra insuficiente', 'um jogador decidiu o gate');
      igual(g.gate.criterios.dossie.n, 0, 'sem o n');
      igual(g.kpis.consultas, 41, 'as consultas');
      ok(Math.abs(g.kpis.consultasAntesDeApostar - 1 / 41) < 1e-9, `antes de apostar: ${g.kpis.consultasAntesDeApostar}`);
      /* O relatório do piloto leva o gate, pela mesma leitura. */
      igual(JSON.stringify(relatorioDoPiloto(srv.db, { agora: T0 + DIA }).v3.gate), JSON.stringify(g.gate), 'o relatório tem outra conta');
      ok(/GATE 3→4/.test(fonte('../tools/relatorio-piloto.mjs')), 'o relatório impresso não mostra o gate da V3');
    } finally { srv.fechar?.(); }
  });

  s.teste('o servidor lê as apostas do banco e o D7 da coorte', () => {
    const srv = criarServidor({ config: { ambiente: 'teste', silencioso: true }, banco: ':memory:', sims: 40, laco: false, relogio: () => T0 });
    try {
      const u = cadastrar(srv.db, { username: 'g4', email: 'g4@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
      receberDoCliente(srv.db, { userId: u, agora: T0, eventos: [
        { nome: 'creature_captured', chave: 'cap:a', campos: { em: T0, dex: 1 } }] });
      receberDoCliente(srv.db, { userId: u, agora: T0 + 7 * DIA, eventos: [{ nome: 'session_started', chave: 'dia:x', campos: {} }] });
      /* Uma coorte de 3 dias ainda não tem D7: fica de fora, e não conta como "não voltou". */
      cadastrar(srv.db, { username: 'g5', email: 'g5@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 + 5 * DIA });
      const g = gateDaV3Servidor(srv.db, { agora: T0 + 8 * DIA });
      igual(g.d7.estratos.reduce((a, e) => a + e.capturou.n + e.naoCapturou.n, 0), 1, 'a coorte sem sete dias entrou no D7');
      igual(g.d7.estratos.reduce((a, e) => a + e.capturou.n, 0), 1, 'quem capturou não entrou na coorte');
      igual(g.d7.estratos.find(e => e.capturou.n).capturou.d7, 1, 'a volta no D7 não foi vista');
      igual(g.kpis.capturas, 1, 'a captura');
      /* A leitura das apostas é de `bets`, e não de evento do cliente. */
      ok(/FROM bets WHERE status <> 'cancelada'/.test(fonte('../server/gate-v3.mjs')), 'as apostas não vêm do banco');
    } finally { srv.fechar?.(); }
  });

  s.teste('o cliente: o gesto pelo save, a chave do fato, e a captura como estado', () => {
    const antes = { criaturas: [cria('a', 4, { nivel: 10, xp: 3 }), cria('b', 7), cria('c', 1)], doces: { 4: 5, 7: 2 } };
    const evo = eventosDoGesto(pack, antes, { ...antes, criaturas: [{ ...antes.criaturas[0], dex: 5 }, antes.criaturas[1], antes.criaturas[2]] },
                               { id: 'a', agora: T0 });
    igual(JSON.stringify(evo.map(e => [e.nome, e.chave, e.campos.de, e.campos.para])), '[["evolucao_feita","evo:a:4:5",4,5]]', 'a evolução');
    const doce = eventosDoGesto(pack, antes, { doces: { 4: 3, 7: 2 }, criaturas: [{ ...antes.criaturas[0], xp: 7 }, ...antes.criaturas.slice(1)] },
                                { id: 'a', agora: T0 });
    igual(JSON.stringify(doce.map(e => [e.nome, e.chave, e.campos.quantidade])), '[["doce_gasto","doce:a:10:3",2]]', 'o doce');
    const solta = eventosDoGesto(pack, antes, { ...antes, criaturas: antes.criaturas.slice(1) }, { id: 'a', agora: T0 });
    igual(solta.map(e => e.nome).join(), 'criatura_solta', 'a soltura');
    igual(eventosDoGesto(pack, antes, antes, { id: 'b', agora: T0 }).length, 0, 'um clique recusado virou evento');
    igual(eventosDoGesto(pack, antes, antes, { id: 'zz', agora: T0 }).length, 0, 'criatura que não existe');
    /* A chave é do FATO: o mesmo gesto relatado duas vezes (duas abas) é o mesmo evento. */
    igual(eventosDoGesto(pack, antes, { ...antes, criaturas: antes.criaturas.slice(1) }, { id: 'a', agora: T0 + 999 })[0].chave,
          solta[0].chave, 'a chave depende do relógio');
    const d1 = eventoDoDossie({ dex: 6, rodada: 'r9', antesDeApostar: 'sim', agora: T0 });
    igual(d1.chave, 'dossie:r9:6', 'a chave da consulta');
    igual(d1.campos.antesDeApostar, false, 'um valor que não é true virou "antes de apostar"');
    igual(eventoDoDossie({ dex: 6, antesDeApostar: true, agora: T0 }).chave, eventoDoDossie({ dex: 6, antesDeApostar: true, agora: T0 + H }).chave,
          'fora da rodada, a consulta não é uma por dia');
    igual(eventoDoComparador({ id: 'a', dex: 4, agora: T0 }).chave, eventoDoComparador({ id: 'a', dex: 4, agora: T0 + H }).chave, 'o comparador');
    /* A captura é estado: só a de origem captura, e recente. */
    const e = { criaturas: [cria('a', 4), cria('b', 7, { origem: 'inicial' }), cria('c', 1, { criadaEm: T0 - 3 * DIA })] };
    igual(eventosDoEstado(e, T0 + H).filter(x => x.nome === 'creature_captured').map(x => x.chave).join(), 'cap:a', 'as capturas relatadas');
  });

  s.teste('a fiação: os gestos na captura do clique, a ficha chama a consulta, e o módulo é carregado', () => {
    const tela = semComentario(fonte('../app/modules/telemetria-v3-tela.mjs'));
    ok(/'\[data-evoluir\],\[data-dar-doce\],\[data-soltar\]'/.test(tela) && /\}, true\);\s*document\.addEventListener\('toggle'/.test(tela),
      'o gesto não é ouvido na captura — o dono do clique pode parar a propagação');
    ok(/eventosDoGesto\(PACK, antes, carregar\(\)/.test(tela), 'o gesto não é lido pelo save');
    ok(/antesDeApostar: S\.state === 'betting' && !S\.myBet/.test(tela), 'antes de apostar');
    ok(/if \(d\.secoes\.some\(s => !s\.trancada\)\) consultouDossie\(e\.dex\);/.test(fonte('../app/modules/pokedex.mjs')), 'a ficha não relata a consulta');
    ok(/import '\.\/modules\/telemetria-v3-tela\.mjs';/.test(fonte('../app/index.html')), 'o módulo não é carregado');
  });

  return s;
}
