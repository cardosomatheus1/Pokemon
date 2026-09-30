/* Q1/Q3 · A PARTIDA DA LIGA NO PALCO DA ARENA (ST-11.6d · pedido do dono, 30/09)
 *
 * A coreografia é função do TEMPO, e é afirmada em Node:
 *
 *   A FORMAÇÃO    doze lugares distintos na ilha, o jogador embaixo
 *   UM CAMINHO    a vida de cada um no fim do palco é a do `replayDoLog`
 *   O GOLPE       de contato avança até o alvo e volta; de longe, um passo;
 *                 a animação de ataque no impacto; o alvo treme ao levar
 *   A QUEDA       quem caiu fica caído, e não antes do golpe que o derrubou
 *   OS IMPACTOS   cada golpe estoura UMA vez, janela a janela
 *   O PALCO       próprio: não lê o `S` da Arena (a rodada viva), e pular
 *                 fica no fim
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { confrontoDaLiga, linhaDoLog, replayDoLog } from '../app/modules/partida-dados.mjs';
import { snapshotDoBot } from '../app/modules/pareamento-dados.mjs';
import { PALCO, TEMPO, formacao, deContato, coreografiaDoPalco, poseNoInstante, impactosEntre, numeroDoGolpe, fraseNoInstante, escalaDe, balaoNoInstante, logNoInstante, vivosNoInstante } from '../app/modules/liga-palco-dados.mjs';
import { MOVE_FX } from '../app/modules/efeitos-dados.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
function partida() {
  /* Dois treinadores da jornada com time cheio: a partida de teste tem quatro ou mais de cada lado. */
  const cheios = (PACK.treinadores ?? []).filter(t => (t.time ?? []).length >= 4 && !(t.time ?? []).some(x => x.vidaX)).map(t => snapshotDoBot(PACK, t));
  const c = confrontoDaLiga({ pack: PACK, a: cheios[0], b: cheios[1], raiz: 'abc123' });
  return c.log;
}
const nome = d => `#${d}`;

export async function suite() {
  const s = criarSuite('liga-palco');
  const log = partida();

  s.teste('a formação: doze lugares distintos, dentro da ilha, o jogador embaixo', () => {
    const pts = ['A', 'B'].flatMap(l => [0, 1, 2, 3, 4, 5].map(i => ({ l, ...formacao(l, i) })));
    igual(new Set(pts.map(p => `${p.x},${p.y}`)).size, 12, 'dois lutadores no mesmo lugar');
    ok(pts.every(p => ((p.x - PALCO.CX) / 134) ** 2 + ((p.y - PALCO.CY) / 176) ** 2 < 1), 'alguém ficou fora da grama');
    ok(pts.filter(p => p.l === 'A').every(p => p.y > PALCO.CY) && pts.filter(p => p.l === 'B').every(p => p.y < PALCO.CY), 'os lados trocaram');
    /* Os números do palco são os da Arena. */
    ok(/const W = 300, H = 400;/.test(fonte('../app/modules/render.mjs')) && PALCO.W === 300 && PALCO.H === 400, 'o palco saiu do espaço da Arena');
  });

  s.teste('um caminho só: a vida do fim do palco é a do replayDoLog, lutador a lutador — dos dois lados de quem assiste', () => {
    for (const eu of ['A', 'B']) {
      const palco = coreografiaDoPalco(linhaDoLog(log, nome, eu));
      const r = replayDoLog(log);
      igual(palco.atos.length, log.eventos.length, 'o palco perdeu golpe');
      const noFim = palco.lutadores.map(l => poseNoInstante(palco, l.slot, palco.duracao).vida);
      const doLog = palco.lutadores.map(l => r.final[l.slot[0]][Number(l.slot.slice(1))]);
      igual(JSON.stringify(noFim), JSON.stringify(doLog), `a vida do palco divergiu do log (eu = ${eu})`);
      igual(palco.lutadores.filter(l => l.lado === 'A').map(l => l.slot[0]).join(''), eu.repeat(palco.lutadores.filter(l => l.lado === 'A').length), 'o lado de quem assiste não ficou embaixo');
    }
  });

  s.teste('o golpe: de contato avança e volta; de longe, um passo; ataque no impacto; o alvo treme', () => {
    const palco = coreografiaDoPalco(linhaDoLog(log, nome, 'A'));
    const perto = palco.atos.find(a => a.contato && !a.errou), longe = palco.atos.find(a => !a.contato && !a.errou);
    ok(perto && longe, 'a partida de teste não tem os dois tipos de golpe');
    for (const [a, alcance] of [[perto, 0.78], [longe, 0.12]]) {
      const de = palco.lutadores.find(l => l.slot === a.de), para = palco.lutadores.find(l => l.slot === a.para);
      const p = poseNoInstante(palco, a.de, a.impacto);
      const andou = Math.hypot(p.x - de.x, p.y - de.y) / Math.hypot(para.x - de.x, para.y - de.y);
      ok(Math.abs(andou - alcance) < 0.02, `${a.contato ? 'o de contato' : 'o de longe'} andou ${andou.toFixed(2)} do caminho`);
      igual(p.anim, 'a', 'no impacto não está atacando');
      const volta = poseNoInstante(palco, a.de, a.impacto + TEMPO.voltaMs + 1);
      ok(Math.hypot(volta.x - de.x, volta.y - de.y) < 0.01, 'quem avançou não voltou ao lugar');
    }
    const acerto = palco.atos.find(a => !a.errou && a.dano > 0 && !a.caiu);
    igual(poseNoInstante(palco, acerto.para, acerto.impacto + 10).anim, 'h', 'o alvo não levou o golpe');
    igual(poseNoInstante(palco, acerto.para, acerto.impacto - 10).vida > acerto.vidaDoAlvo || acerto.dano === 0, true, 'a vida caiu antes do impacto');
  });

  s.teste('a queda: caído depois do golpe que derruba, e não antes', () => {
    const palco = coreografiaDoPalco(linhaDoLog(log, nome, 'A'));
    const ko = palco.atos.find(a => a.caiu);
    ok(ko, 'ninguém caiu na partida de teste');
    igual(`${poseNoInstante(palco, ko.para, ko.impacto - 1).caido}|${poseNoInstante(palco, ko.para, ko.impacto).caido}|${poseNoInstante(palco, ko.para, palco.duracao).caido}`, 'false|true|true', 'a queda fora de hora');
    ok(!palco.atos.some(a => a.de === ko.para && a.inicio > ko.impacto), 'um caído atacou no palco');
  });

  s.teste('os impactos: cada golpe estoura uma vez, e a frase é a do último que acertou', () => {
    const palco = coreografiaDoPalco(linhaDoLog(log, nome, 'A'));
    const vistos = [];
    for (let t = -700; t < palco.duracao; t += 97) vistos.push(...impactosEntre(palco, t, t + 97).map(a => a.n));
    igual(vistos.join(), palco.atos.map(a => a.n).join(), 'um golpe estourou duas vezes, ou nenhuma');
    /* Janelas que começam EXATAMENTE num impacto: o intervalo é (de, ate] — o golpe do começo já foi. */
    const alinhadas = palco.atos.slice(1).map((a, k) => impactosEntre(palco, palco.atos[k].impacto, a.impacto).map(x => x.n).join());
    igual(alinhadas.join('|'), palco.atos.slice(1).map(a => String(a.n)).join('|'), 'a janela que começa num impacto o repetiu');
    const a3 = palco.atos[3];
    igual(fraseNoInstante(palco, a3.impacto), a3.texto, 'a frase não é a do golpe que acertou');
    igual(fraseNoInstante(palco, -1), 'a luta vai começar…', 'a frase antes da luta');
    igual(JSON.stringify([numeroDoGolpe({ errou: true }), numeroDoGolpe({ eff: 0 }), numeroDoGolpe({ dano: 30, eff: 2 }), numeroDoGolpe({ dano: 9, eff: 1, crit: true }), numeroDoGolpe({ dano: 4, eff: 0.5 })].map(n => `${n.texto}:${n.classe}`)),
      '["errou:miss","imune:miss","-30:super","-9:crit","-4:weak"]', 'o número do golpe');
  });

  s.teste('a Arena: o balão do golpe sobre quem ataca, o mini log de três linhas, e ninguém congelado', () => {
    const palco = coreografiaDoPalco(linhaDoLog(log, nome, 'A'));
    const a = palco.atos[2];
    igual(`${balaoNoInstante(palco, a.de, a.inicio)}|${balaoNoInstante(palco, a.de, a.impacto + TEMPO.levaMs - 1)}|${balaoNoInstante(palco, a.de, a.impacto + TEMPO.levaMs)}|${balaoNoInstante(palco, a.para, a.inicio)}`,
      `${a.golpe}|${a.golpe}|null|null`, 'o balão fora de hora, ou em quem leva');
    const linhas = logNoInstante(palco, palco.atos[5].impacto);
    igual(linhas.map(l => l.texto).join('|'), palco.atos.slice(3, 6).map(x => x.texto).join('|'), 'o mini log não é o das três últimas');
    ok(linhas.every((l, k) => l.classe === (palco.atos[3 + k].caiu ? 'l-ko' : palco.atos[3 + k].crit ? 'l-crit' : '')), 'a marca da queda ou do crítico');
    igual(logNoInstante(palco, -1).length, 0, 'o mini log antes da luta');
    /* No meio de um golpe (começou, ainda não acertou), ele ainda não está no log. */
    igual(logNoInstante(palco, palco.atos[6].impacto - 10).map(l => l.texto).join('|'), palco.atos.slice(3, 6).map(x => x.texto).join('|'), 'o mini log contou o golpe antes do acerto');
    /* Parado balança pouco, e cada um no seu ritmo. */
    const livre = (l, ms) => !palco.atos.some(x => (x.de === l.slot || x.para === l.slot) && x.inicio <= ms && ms < x.fim) && !poseNoInstante(palco, l.slot, ms).caido;
    const quieto = palco.lutadores.find(l => livre(l, 5000) && livre(l, 5400));
    ok(quieto, 'ninguém ficou parado de pé na janela do teste');
    const p1 = poseNoInstante(palco, quieto.slot, 5000), p2 = poseNoInstante(palco, quieto.slot, 5400);
    ok(Math.hypot(p1.x - quieto.x, p1.y - quieto.y) <= 3 && (p1.x !== p2.x || p1.y !== p2.y), 'o parado está congelado, ou saiu do lugar');
  });

  s.teste('a energia da Arena: golpes no ar ao mesmo tempo, na ordem do log, e o placar de quem está de pé', () => {
    const palco = coreografiaDoPalco(linhaDoLog(log, nome, 'A'));
    const noAr = ms => palco.atos.filter(a => a.inicio <= ms && ms < a.fim).length;
    ok(palco.atos.some(a => noAr(a.impacto) >= 2), 'nunca há dois golpes no ar — o palco volta a ser um de cada vez');
    ok(palco.atos.every((a, k) => k === 0 || a.impacto > palco.atos[k - 1].impacto), 'os impactos saíram da ordem do log');
    const total = { A: palco.lutadores.filter(l => l.lado === 'A').length, B: palco.lutadores.filter(l => l.lado === 'B').length };
    igual(JSON.stringify(vivosNoInstante(palco, -1)), JSON.stringify(total), 'antes da luta, todos de pé');
    const ko = palco.atos.find(a => a.caiu), lado = palco.lutadores.find(l => l.slot === ko.para).lado;
    igual(vivosNoInstante(palco, ko.impacto)[lado], vivosNoInstante(palco, ko.impacto - 1)[lado] - 1, 'a queda não baixou o placar no impacto');
    const fim = vivosNoInstante(palco, palco.duracao);
    igual(`${fim.A > 0 && fim.B === 0 ? 'A' : fim.B > 0 && fim.A === 0 ? 'B' : 'empate'}`, palco.vencedor, 'o placar do fim não é o vencedor do log');
  });

  s.teste('o golpe de contato é o que não tem carga, projétil nem jato — a leitura do Avanço', () => {
    ok(deContato('Body Slam') && !deContato('Flamethrower') && deContato('Golpe Inventado'), 'a leitura do contato');
    ok(Object.keys(MOVE_FX).every(k => deContato(k) === !(MOVE_FX[k].cast || MOVE_FX[k].proj || MOVE_FX[k].beam)), 'a tabela de efeitos discorda');
    ok(escalaDe(6) > 0 && escalaDe(6) <= 1, 'a escala do sprite animado');
  });

  s.teste('o palco é próprio: não lê o S da Arena, pinta a ilha pela pintura exportada, e pular fica no fim', () => {
    const palco = fonte('../app/modules/liga-palco.mjs');
    ok(!/estado\.mjs|\bS\./.test(palco.replace(/\/\*[\s\S]*?\*\//g, '')), 'o palco da Liga lê o estado da Arena');
    ok(/pinturaDa\(arena\.key\)/.test(palco) && /pintura\.fundo\(agora \/ 1000, mapa\)/.test(palco), 'o palco não usa a pintura da Arena');
    ok(/const ms = pulou \? palco\.duracao : agora - inicio;/.test(palco), 'pular não fica no fim');
    ok(/poseNoInstante\(palco, e\.l\.slot/.test(palco), 'o palco decide a pose sozinho');
    ok(/montarPalco\(alvo, \{ linha: linhaDoLog\(p\.log, nomeDo, linha\.lado\)/.test(fonte('../app/modules/liga-equipe-tela.mjs')), 'o replay não vai para o palco da Arena');
  });

  return s;
}
