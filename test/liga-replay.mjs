/* Q1/Q3 · O REPLAY DA LIGA NA TELA (ST-11.6b · Spec §12 tela 27, §9.13)
 *
 *   UM CAMINHO SÓ   a linha do tempo que sai do LOG é a mesma, golpe a golpe,
 *                   que a encenação da jornada tira do motor
 *   O LADO          o jogador fica à esquerda, os slots são os da partida, e o
 *                   vencedor é dito do ponto de vista dele
 *   O ESPELHO       Snorlax contra Snorlax: a frase diz "seu" e "rival"
 *   A PROVA         o compromisso gravado confere com a raiz revelada, e a
 *                   semente é a dessa raiz — mexer em qualquer um reprova
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida, partidaDe } from '../server/partida.mjs';
import { minhasPartidas } from '../server/liga-equipe.mjs';
import { linhaDoLog, provaDaPartida, replayDoLog } from '../app/modules/partida-dados.mjs';
import { timeDoSnapshot } from '../app/modules/snapshot-dados.mjs';
import { linhaDoTempo } from '../app/modules/pve-dados.mjs';
import { linhaDaPartida, replayNaTela, ROTULO_BOT } from '../app/modules/liga-equipe-dados.mjs';
import { simular } from '../engine/treino-batalha.mjs';
import { sementeDaPartida } from '../app/modules/partida-dados.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const T0 = Date.UTC(2026, 9, 1, 12);
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

function cena(lista) {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('Rep0'), conta('Rep1')];
  const snap = (dono, l) => criarSnapshot(db, { userId: dono, pack: PACK, agora: T0, ids: l.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  }) });
  const a = snap(u, lista.a), b = snap(v, lista.b);
  const p = criarPartida(db, { userId: v, meu: b.id, adversario: a.id, chaveIdem: 'rep-000001', agora: T0 });
  return { db, u, v, a, b, p };
}
const nomeDoDex = d => { const n = PACK.especies.find(e => e.dex === d)?.n ?? `#${d}`; return n[0].toUpperCase() + n.slice(1); };

export async function suite() {
  const s = criarSuite('liga-replay');

  s.teste('um caminho só: a linha do LOG é, golpe a golpe, a que o motor dá à encenação', () => {
    const c = cena({ a: [[6, 30], [9, 30], [3, 30]], b: [[25, 32], [143, 30], [94, 31]] });
    const partida = partidaDe(c.db, c.p.id);
    const r = simular(PACK, timeDoSnapshot(c.a), timeDoSnapshot(c.b), sementeDaPartida(partida.raiz), { preset: c.a.preset, presetRival: c.b.preset });
    const doMotor = linhaDoTempo(PACK, timeDoSnapshot(c.a), timeDoSnapshot(c.b), r, n => n);
    const doLog = linhaDoLog(partida.log, nomeDoDex, 'A');
    ok(doLog.passos.length > 3, 'a partida quase não teve golpe');
    igual(JSON.stringify(doLog.passos.map(p => [p.de, p.para, p.dano, p.vidaDoAlvo, p.caiu, +p.fracaoDoAlvo.toFixed(6)])), JSON.stringify(doMotor.passos.map(p => [p.de, p.para, p.dano, p.vidaDoAlvo, p.caiu, +p.fracaoDoAlvo.toFixed(6)])), 'o replay divergiu da luta');
    igual(JSON.stringify(doLog.lados.A.map(x => [x.slot, x.dex, x.maxHp])), JSON.stringify(doMotor.lados.A.map(x => [x.slot, x.dex, x.maxHp])), 'os lutadores do log não são os da luta');
    igual(doLog.vencedor, doMotor.vencedor, 'o vencedor do replay não é o da luta');
  });

  s.teste('o lado: o jogador à esquerda, os slots da partida, e o vencedor do ponto de vista dele', () => {
    const c = cena({ a: [[6, 60], [9, 60]], b: [[10, 5]] });
    const log = partidaDe(c.db, c.p.id).log;
    const comoA = linhaDoLog(log, nomeDoDex, 'A'), comoB = linhaDoLog(log, nomeDoDex, 'B');
    igual(`${comoB.lados.A.map(x => x.slot).join()}|${comoB.lados.B.map(x => x.slot).join()}`, 'B0|A0,A1', 'o desafiante não ficou à esquerda');
    igual(`${replayDoLog(log).vencedor}|${comoA.vencedor}|${comoB.vencedor}`, 'A|A|B', 'o vencedor não virou com o lado');
    igual(JSON.stringify(comoA.passos.map(p => p.vidaDoAlvo)), JSON.stringify(comoB.passos.map(p => p.vidaDoAlvo)), 'virar o lado mudou a luta');
    /* E o servidor diz de que lado cada um estava. */
    igual(`${minhasPartidas(c.db, c.u)[0].lado}|${minhasPartidas(c.db, c.v)[0].lado}`, 'A|B', 'o lado na lista');
  });

  s.teste('o espelho: "seu" e "rival" na frase, e a placa só com o nome', () => {
    const c = cena({ a: [[143, 30]], b: [[143, 30]] });
    const L = linhaDoLog(partidaDe(c.db, c.p.id).log, nomeDoDex, 'B');
    const p = L.passos.find(x => x.de[0] === 'B');
    ok(p && /^seu Snorlax usou/.test(p.texto) && /Snorlax rival/.test(L.passos.find(x => x.de[0] === 'A').texto), `a frase não diz de quem é: ${p?.texto}`);
    igual(L.lados.A[0].nome, 'Snorlax', 'a placa ganhou o "seu"');
  });

  s.teste('a prova: o compromisso e a semente conferem, e mexer em qualquer um reprova', async () => {
    const c = cena({ a: [[6, 30]], b: [[9, 30]] });
    const p = partidaDe(c.db, c.p.id);
    igual(JSON.stringify(await provaDaPartida(p)), '{"ok":true,"commit":true,"semente":true}', 'a partida de verdade não conferiu');
    igual((await provaDaPartida({ ...p, sal: p.sal.replace(/.$/, x => (x === '0' ? '1' : '0')) })).ok, false, 'o sal trocado conferiu');
    igual((await provaDaPartida({ ...p, semente: (p.semente + 1) >>> 0 })).ok, false, 'a semente trocada conferiu');
    igual((await provaDaPartida({ ...p, raiz: 'ffff' })).ok, false, 'a raiz trocada conferiu');
  });

  s.teste('a tela do replay: o topo, o fim com o selo, a prova e os rótulos dos lados — o bot com o dele', () => {
    const linha = linhaDaPartida({ id: 'x', lado: 'B', resultado: 'perdeu', rated: true, turnos: 5, tier: { antes: 'Silver', depois: 'Bronze' }, contra: { tipo: 'jogador', nome: 'Ana' } });
    const t = replayNaTela(linha, null);
    igual(`${t.topo}|${t.fim.titulo}|${t.fim.classe}|${t.fim.selo.texto}|${t.fim.texto}|${t.rotulos.A}|${t.rotulos.B}`, 'replay · contra Ana|Você perdeu|perdeu|contou · desceu para Bronze||seu time|Ana', 'a tela do replay');
    igual(`${t.prova}|${t.provaOk}`, 'conferindo…|null', 'antes da prova');
    /* ST-11.6e: o banner do fim diz o que a partida rendeu. */
    igual(replayNaTela(linhaDaPartida({ id: 'p', lado: 'B', resultado: 'venceu', rated: true, pontos: 30, turnos: 4, contra: { tipo: 'jogador', nome: 'Ana' } }), null).fim.pontos, '+30 LP', 'o fim sem os pontos');
    igual(t.fim.pontos, '0 LP · teto do dia', 'o fim da partida sem pontos não diz por quê');
    igual(replayNaTela(linha, { ok: true }).prova, 'resultado travado antes da luta — conferido', 'a prova para quem joga');
    igual(replayNaTela(linha, { ok: false }).provaOk, false, 'a prova que falhou passou');
    ok(/NÃO confere/.test(replayNaTela(linha, { ok: false }).prova), 'a prova que falhou não diz');
    const bot = replayNaTela(linhaDaPartida({ id: 'b', lado: 'B', resultado: 'venceu', rated: false, turnos: 3, contra: { tipo: 'bot', nome: 'Brock' } }), { ok: true });
    igual(`${bot.rotulos.B}|${bot.fim.titulo}`, 'Brock · bot|Você venceu', 'o bot no replay');
    igual(`${bot.fim.selo.texto}|${bot.fim.texto}`, 'não contou · bot|ninguém da sua faixa na fila — por isso um bot', 'o fim do replay do bot');
    void ROTULO_BOT;
  });

  s.teste('a tela encena SÓ o log: nenhuma simulação no caminho do replay', () => {
    const tela = fonte('../app/modules/liga-equipe-tela.mjs');
    const f = tela.slice(tela.indexOf('async function verReplay'), tela.indexOf('document.addEventListener'));
    ok(/linhaDoLog\(p\.log, nomeDo, linha\.lado, p\.aparencia\)/.test(f) && /provaDaPartida\(p\)/.test(f), 'o replay não vem do log, ou não confere a prova');
    ok(!/simular|confrontoDaLiga|treino-batalha/.test(tela), 'a tela da Liga chama o motor');
    ok(/data-le-replay/.test(tela), 'a linha não tem o botão do replay');
    /* D-130: o acerto adiado de cada golpe respeita a geração — senão "pular" termina e o golpe que estava no ar reescreve o fim. */
    const pve = fonte('../app/modules/pve-tela.mjs');
    ok(/setTimeout\(\(\) => \{ if \(g === geracao\) acerta\(\); \}, 260\)/.test(pve), 'D-130: o acerto adiado ignora a geração');
  });

  return s;
}
