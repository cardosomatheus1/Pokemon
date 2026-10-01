/* Q1/Q3 · E14 · O SHINY DO SNAPSHOT NO PALCO E NO REPLAY DA LIGA (ST-14.3c · L-226)
 *
 * O snapshot grava o shiny de cada criatura (ST-14.3a), mas o log da partida
 * sai do motor, que não recebe aparência — então o palco pintava todo mundo
 * com a folha normal. Agora o replay leva a aparência dos dois times, e o
 * palco a cruza com o lado do log PELA POSIÇÃO:
 *
 *   A ORDEM     a do snapshot é a do log (o motor monta o lado na mesma ordem)
 *   O LADO      quem assiste do lado B vê o próprio time à esquerda — o shiny
 *               troca de lado junto
 *   O ANTIGO    snapshot sem o campo e partida contra o bot ficam normais
 *   A TELA      folha recolorida, halo e ✦ da Arena, e o ✦ na placa
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida, buscarPartida, partidaDe } from '../server/partida.mjs';
import { aparenciaDosTimes, linhaDoLog, confrontoDaLiga } from '../app/modules/partida-dados.mjs';
import { coreografiaDoPalco } from '../app/modules/liga-palco-dados.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const T0 = Date.UTC(2026, 9, 1, 14);
const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');

function cena({ soUm = false } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('palco0'), conta('palco1')];
  const time = (dono, lista) => lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = 1 WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  });
  const idsA = time(u, [[6, 36], [9, 36], [3, 36]]), idsB = time(v, [[65, 36], [68, 36], [76, 36]]);
  db.prepare(`UPDATE criaturas SET is_shiny = 1 WHERE id = ?`).run(idsA[1]);
  db.prepare(`UPDATE criaturas SET is_shiny = 1 WHERE id = ?`).run(idsB[2]);
  const sa = criarSnapshot(db, { userId: u, pack: PACK, ids: idsA, preset: 'defensive', agora: T0 });
  /* `soUm`: só um time publicado — a fila fica vazia e a busca cai no bot. */
  const sb = soUm ? null : criarSnapshot(db, { userId: v, pack: PACK, ids: idsB, preset: 'aggressive', agora: T0 });
  return { db, u, v, sa, sb };
}
const lista = l => l.map(x => (x ? 1 : 0)).join('');

export async function suite() {
  const s = criarSuite('e14-palco-shiny');

  s.teste('motor: a aparência sai do snapshot na ordem dele; sem campo ou sem snapshot, normal', () => {
    const a = { time: [{ shiny: false }, { shiny: true }, {}] }, b = { time: [{ shiny: true }] };
    const ap = aparenciaDosTimes(a, b);
    igual(`${lista(ap.A)}|${lista(ap.B)}`, '010|1', 'a aparência saiu fora da ordem do snapshot');
    igual(`${lista(aparenciaDosTimes(null, b).A)}|${aparenciaDosTimes(null, b).A.length}`, '|0', 'o bot ganhou aparência');
    /* Só `true` é shiny: um valor que "parece" verdade não pinta ouro. */
    igual(lista(aparenciaDosTimes({ time: [{ shiny: 1 }, { shiny: 'sim' }] }, null).A), '00', 'um shiny não-booleano virou shiny');
  });

  s.teste('a linha do replay põe o shiny no lutador certo, e troca de lado com quem assiste', () => {
    const c = cena();
    const ap = aparenciaDosTimes(c.sa, c.sb);
    const r = confrontoDaLiga({ pack: PACK, a: c.sa, b: c.sb, raiz: 'abc123' });
    const deA = linhaDoLog(r.log, d => `#${d}`, 'A', ap), deB = linhaDoLog(r.log, d => `#${d}`, 'B', ap);
    igual(`${lista(deA.lados.A.map(x => x.shiny))}|${lista(deA.lados.B.map(x => x.shiny))}`, '010|001', 'o shiny não caiu na posição do snapshot');
    /* Quem assiste do lado B vê o próprio time à esquerda, com o brilho dele. */
    igual(`${lista(deB.lados.A.map(x => x.shiny))}|${lista(deB.lados.B.map(x => x.shiny))}`, '001|010', 'o shiny não trocou de lado com quem assiste');
    /* O dex do lutador com o brilho é o da criatura shiny do snapshot. */
    igual(deA.lados.A[1].dex, c.sa.time[1].dex, 'o shiny foi para outra espécie');
    /* Sem aparência (a partida antiga), todo mundo normal. */
    ok(linhaDoLog(r.log, d => `#${d}`, 'A').lados.A.every(x => x.shiny === false), 'o replay sem aparência inventou shiny');
    const palco = coreografiaDoPalco(deA);
    igual(lista(palco.lutadores.map(l => l.shiny)), '010001', 'o palco perdeu o shiny da linha');
  });

  s.teste('servidor: o replay da partida diz a aparência dos dois snapshots; o do bot, só a do jogador', () => {
    const c = cena();
    const p = criarPartida(c.db, { userId: c.u, meu: c.sa.id, adversario: c.sb.id, chaveIdem: 'palco-0001', agora: T0 });
    const vista = partidaDe(c.db, p.id);
    /* O lado A do log é o DEFENSOR (o time desafiado), o B quem desafiou. */
    igual(`${lista(vista.aparencia.A)}|${lista(vista.aparencia.B)}`, '001|010', 'o replay trocou os lados da aparência');
    ok(!JSON.stringify(vista.aparencia).includes(c.sa.time[0].id), 'o id da criatura viajou com a aparência');
    /* Contra o bot (ninguém na fila): o lado A é o bot, sem snapshot. */
    const db2 = cena({ soUm: true });
    const bot = buscarPartida(db2.db, { userId: db2.u, meu: db2.sa.id, chaveIdem: 'palco-bot-1', agora: T0 });
    ok(bot.bot, 'a busca sem fila não caiu no bot');
    const vb = partidaDe(db2.db, bot.id);
    igual(`${vb.aparencia.A.length}|${lista(vb.aparencia.B)}`, '0|010', 'o replay do bot errou a aparência');
  });

  s.teste('a tela: a folha shiny, a marca da Arena e o ✦ na placa — e o replay passa a aparência', () => {
    const palco = fonte('../app/modules/liga-palco.mjs'), tela = fonte('../app/modules/liga-equipe-tela.mjs');
    ok(/sheetURL\(e\.l\.dex, anim, e\.l\.shiny\)/.test(palco), 'a animação continua pedindo a folha normal');
    ok(/sheetURL\(l\.dex, k, l\.shiny\)/.test(palco), 'a pré-carga pede a folha normal e a shiny chega atrasada');
    ok(/l\.shiny \? ' shiny opening' : ''/.test(palco), 'o lutador shiny não ganhou a marca da Arena');
    ok(/l\.shiny \? '<i aria-label="shiny">✦<\/i> ' : ''/.test(palco), 'a placa não diz o shiny fora da cor');
    ok(/dexImg\(l\.dex, l\.nome, 'class="lpEstatico"', l\.shiny\)/.test(palco), 'o sprite parado ficou normal');
    ok(/linhaDoLog\(p\.log, nomeDo, linha\.lado, p\.aparencia\)/.test(tela), 'o replay não passa a aparência ao palco');
  });

  return s;
}
