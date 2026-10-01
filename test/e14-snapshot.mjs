/* Q1/Q3/Q6 · E14 · O SHINY NO TIME DA LIGA, E O TIME QUE AINDA PODE LUTAR (ST-14.3a)
 *
 * O snapshot da Liga grava a APARÊNCIA shiny de cada criatura — o motor de luta
 * nunca a recebe, e o power não muda. E o snapshot é imutável, mas a posse
 * não: uma partida NOVA só sai de time cujas criaturas ainda são de quem o
 * publicou. A partida já feita continua com o replay dela.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { criarPartida, buscarPartida, partidaDe, ERRO_PARTIDA } from '../server/partida.mjs';
import { soltarNaConta } from '../server/colecao.mjs';
import { snapshotDoTime, timeDoSnapshot, snapshotPodeLutar } from '../app/modules/snapshot-dados.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const T0 = Date.UTC(2026, 8, 28, 14);
const H = 3_600_000;
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function cena() {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const [u, v] = [conta('snap0'), conta('snap1')];
  const time = (dono, lista) => lista.map(([dex, nivel]) => {
    const c = gerar(db, { userId: dono, pack: PACK, dex, origem: 'captura' });
    db.prepare(`UPDATE criaturas SET xp = ?, na_caixa = 1 WHERE id = ?`).run(xpParaNivel(nivel), c.id);
    return c.id;
  });
  /* Cada conta tem uma inicial fora do time, para soltar não esvaziar a equipe. */
  for (const d of [u, v]) gerar(db, { userId: d, pack: PACK, dex: 1, origem: 'inicial' });
  const idsA = time(u, [[6, 36], [9, 36], [3, 36]]), idsB = time(v, [[65, 36], [68, 36], [76, 36]]);
  db.prepare(`UPDATE criaturas SET is_shiny = 1 WHERE id = ?`).run(idsA[1]);
  const sa = criarSnapshot(db, { userId: u, pack: PACK, ids: idsA, preset: 'defensive', agora: T0 });
  const sb = criarSnapshot(db, { userId: v, pack: PACK, ids: idsB, preset: 'aggressive', agora: T0 });
  return { db, u, v, sa, sb, idsA, idsB };
}

export async function suite() {
  const s = criarSuite('e14-snapshot');

  s.teste('o snapshot grava o shiny de cada criatura, e a luta não o vê', () => {
    const c = cena();
    igual(c.sa.time.map(x => x.shiny).join(','), 'false,true,false', 'o snapshot não gravou o shiny da instância');
    ok(timeDoSnapshot(c.sa).every(x => !('shiny' in x)), 'o shiny chegou ao motor de luta');
    /* A mesma criatura, normal e shiny: o power e a entrada de luta são iguais. */
    const base = { id: 'x', dex: 25, iv: [10, 10, 10, 10, 10, 10], natureza: 'Firme', xp: xpParaNivel(20), vinculo: 0, exemplar: false };
    const n = snapshotDoTime({ pack: PACK, criaturas: [base], ids: ['x'] }), sh = snapshotDoTime({ pack: PACK, criaturas: [{ ...base, shiny: true }], ids: ['x'] });
    igual(`${n.power === sh.power}|${JSON.stringify(timeDoSnapshot(n)) === JSON.stringify(timeDoSnapshot(sh))}|${sh.time[0].shiny}`, 'true|true|true', 'o shiny mudou o power ou a luta');
  });

  s.teste('motor: o time pode lutar só com todas as criaturas ainda do dono', () => {
    const snap = { time: [{ id: 'a' }, { id: 'b' }] };
    igual(snapshotPodeLutar(snap, 'eu', new Map([['a', 'eu'], ['b', 'eu']])).ok, true, 'o time inteiro meu foi recusado');
    igual(snapshotPodeLutar(snap, 'eu', new Map([['a', 'eu'], ['b', 'ele']])).ok, false, 'a criatura de outro passou');
    igual(snapshotPodeLutar(snap, 'eu', new Map([['a', 'eu']])).ok, false, 'a criatura que sumiu passou');
  });

  s.teste('soltar uma criatura do time: o desafio contra ele recusa, a busca o pula, e o próprio time não luta', () => {
    const c = cena();
    /* Uma partida ANTES de soltar — o replay dela tem de sobreviver. */
    const antes = criarPartida(c.db, { userId: c.u, meu: c.sa.id, adversario: c.sb.id, chaveIdem: 'antes-0001', agora: T0 });
    soltarNaConta(c.db, { userId: c.v, pack: PACK, id: c.idsB[0], agora: T0 + H });
    const e1 = recusa(() => criarPartida(c.db, { userId: c.u, meu: c.sa.id, adversario: c.sb.id, chaveIdem: 'depois-001', agora: T0 + 7 * H }));
    igual(e1?.codigo, ERRO_PARTIDA.INELEGIVEL, `o desafio contra o time com criatura solta foi aceito: ${e1?.message}`);
    const busca = buscarPartida(c.db, { userId: c.u, meu: c.sa.id, chaveIdem: 'busca-0001', agora: T0 + 8 * H });
    ok(busca.bot && busca.defensor !== c.sb.id, `a busca pareou com o time inelegível: ${JSON.stringify(busca.defensor)}`);
    /* O dono do time desfeito desafiando direto também não luta com ele. */
    const e2 = recusa(() => criarPartida(c.db, { userId: c.v, meu: c.sb.id, adversario: c.sa.id, chaveIdem: 'direto-001', agora: T0 + 10 * H }));
    igual(e2?.codigo, ERRO_PARTIDA.INELEGIVEL, `o dono desafiou com o time de uma criatura solta: ${e2?.message}`);
    /* E sem ninguém elegível na fila, nem contra o bot. */
    soltarNaConta(c.db, { userId: c.u, pack: PACK, id: c.idsA[0], agora: T0 + 11 * H });
    const e3 = recusa(() => buscarPartida(c.db, { userId: c.v, meu: c.sb.id, chaveIdem: 'busca-0002', agora: T0 + 12 * H }));
    igual(e3?.codigo, ERRO_PARTIDA.INELEGIVEL, `o dono lutou contra o bot com o time de uma criatura solta: ${e3?.message}`);
    /* Uma terceira conta, sem cooldown com ninguém: a fila não lhe oferece
       nenhum dos dois times desfeitos — ela luta contra o bot. */
    const w = cadastrar(c.db, { username: 'snap2', email: 'snap2@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
    const idsW = [[25, 36], [4, 36], [7, 36]].map(([dex, nivel]) => {
      const x = gerar(c.db, { userId: w, pack: PACK, dex, origem: 'captura' });
      c.db.prepare(`UPDATE criaturas SET xp = ? WHERE id = ?`).run(xpParaNivel(nivel), x.id);
      return x.id;
    });
    const sw = criarSnapshot(c.db, { userId: w, pack: PACK, ids: idsW, preset: 'balanced', agora: T0 });
    const dela = buscarPartida(c.db, { userId: w, meu: sw.id, chaveIdem: 'busca-0003', agora: T0 + 13 * H });
    ok(dela.bot, `a fila ofereceu um time desfeito à terceira conta: ${dela.defensor}`);
    const replay = partidaDe(c.db, antes.id);
    ok(replay && replay.vencedor === antes.vencedor, 'o replay da partida de antes se perdeu');
  });

  return s;
}
