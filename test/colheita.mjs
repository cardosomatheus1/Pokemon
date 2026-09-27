/* Q1/Q3 · A COLHEITA É UMA CONTA SÓ (ST-13.2a · E13 · Spec §7.14, §P2, §P3)
 *
 * O servidor do idle parou no 1.2d: sorteava sem a equipe, sem o estágio e sem
 * o foco, e não pagava moeda, XP, vínculo, treino nem batalha. A conta saiu do
 * cliente para `engine/colheita.mjs`, e os dois a chamam.
 *
 * A AFIRMAÇÃO CENTRAL é de identidade: a mesma expedição, as mesmas criaturas
 * e a mesma raiz, colhidas no save do cliente e no banco do servidor, pagam a
 * MESMA coisa — a resposta byte a byte, a bolsa, o registro, o XP e o vínculo
 * de quem foi, o treino de quem ficou, e os encontros pendentes.
 *
 * E as três que fecham o que o servidor não fazia: o estágio conferido no
 * início, a reserva do teto pelo tamanho da equipe, e o teto que sobe com o
 * registro (1.19).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { iniciar, colher as colherNoServidor, estadoDoTeto, bolsaDe, registroDe, creditarRegistro } from '../server/idle.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { colher as colherNoCliente } from '../app/modules/idle-colheita.mjs';
import { PERFIS, STAMINA_MAX, restamEncontros, TETO_ENCONTROS, tetoDeEncontros } from '../engine/expedicao.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';
import { novaRaiz } from '../engine/seed.mjs';

const T0 = Date.UTC(2026, 8, 27, 9);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* A mesma situação nos dois lados: quatro criaturas (xp e foco escolhidos),
   uma expedição com `equipe` dela, e o resto no banco. */
function cena({ perfil = 'trilha', estagio = 1, equipe = 2, xp = [0, 0, 0, 0], foco = [null, null, null, null] } = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, { username: 'col', email: 'col@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: T0 }).id;
  const ids = [1, 4, 7, 25].map((dex, i) => {
    const c = gerar(db, { userId: u, pack: PACK, dex, origem: 'inicial' });
    db.prepare(`UPDATE criaturas SET xp = ?, foco = ?, stamina = ?, stamina_em = ?, criada_em = ? WHERE id = ?`)
      .run(xp[i], foco[i], STAMINA_MAX, T0, T0 + i, c.id);
    return c.id;
  });
  const exp = iniciar(db, { userId: u, pack: PACK, bioma: 'floresta', perfil, equipe: ids.slice(0, equipe), agora: T0, estagio });
  const e = VAZIO();
  e.criaturas = ids.map((id, i) => ({ id, dex: [1, 4, 7, 25][i], xp: xp[i], nivel: 1, vinculo: 0, foco: foco[i],
                                     stamina: STAMINA_MAX, staminaEm: T0 }));
  e.expedicoes.push({ id: exp.id, pack: PACK.id, bioma: 'floresta', perfil, estagio, equipe: ids.slice(0, equipe),
                      iniciadaEm: exp.iniciada_em, terminaEm: exp.termina_em, colhidaEm: null, semente: null });
  return { db, u, ids, exp, e, fim: exp.termina_em };
}

const doServidor = (db, u) => ({
  bolsa: Object.fromEntries(bolsaDe(db, u).map(b => [b.item_id, b.quantidade])),
  registro: Object.fromEntries(registroDe(db, u, PACK.id).map(r => [r.dex, r.fragmentos])),
  criaturas: db.prepare(`SELECT id, xp, nivel, vinculo, treinado_ate FROM criaturas WHERE user_id = ? ORDER BY criada_em`).all(u)
    .map(l => [l.id, l.xp, l.nivel, l.vinculo, l.treinado_ate ?? null]),
  pendentes: db.prepare(`SELECT chave, dex, raridade FROM encontros_pendentes WHERE user_id = ? ORDER BY chave`).all(u)
    .map(l => [l.chave, l.dex, l.raridade]),
});
const doCliente = e => ({
  bolsa: Object.fromEntries(Object.entries(e.bolsa).sort()),
  registro: e.registro,
  criaturas: e.criaturas.map(c => [c.id, c.xp, c.nivel, c.vinculo, c.treinadoAte ?? null]),
  pendentes: e.encontros.map(p => [p.chave, p.dex, p.raridade]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
});
const ordenada = o => JSON.stringify({ ...o, bolsa: Object.fromEntries(Object.entries(o.bolsa).sort()) });

export function suite() {
  const s = criarSuite('colheita');

  s.teste('identidade: a mesma raiz paga o MESMO no cliente e no servidor — resposta, bolsa, registro, XP, treino, pendentes', () => {
    const casos = [
      { perfil: 'batida', equipe: 1 },
      { perfil: 'trilha', equipe: 2, foco: ['sortudo', 'trilheiro', null, null] },
      { perfil: 'vigilia', equipe: 3, foco: ['guia', 'vigia', 'batedor', null] },
      { perfil: 'vigilia', equipe: 2, estagio: 3, xp: [xpParaNivel(20), 0, 0, 0] },
      { perfil: 'trilha', equipe: 3, estagio: 4, xp: [xpParaNivel(31), xpParaNivel(18), 0, 0] },
    ];
    let comparadas = 0, comNpc = 0, comTreino = 0;
    for (const caso of casos) for (let k = 0; k < 6; k++) {
      const c = cena(caso);
      const raiz = novaRaiz();
      const rs = colherNoServidor(c.db, { id: c.exp.id, pack: PACK, agora: c.fim, raiz });
      const rc = colherNoCliente(c.e, { pack: PACK, id: c.exp.id, agora: c.fim, raiz, bonus: null });
      igual(JSON.stringify(rs), JSON.stringify(rc), `${caso.perfil}/${caso.equipe}: a resposta do servidor e a do cliente divergem`);
      igual(ordenada(doServidor(c.db, c.u)), ordenada(doCliente(c.e)), `${caso.perfil}/${caso.equipe}: o que foi escrito diverge`);
      comparadas++; if (rs.npc.quantas) comNpc++; if (rs.treino.length) comTreino++;
    }
    ok(comNpc > 0, 'nenhuma colheita teve treinador — a batalha não foi comparada');
    ok(comTreino === comparadas, 'houve colheita sem treino do banco — o banco não foi comparado');
  });

  s.teste('o servidor agora paga o que o 1.2d não pagava: moeda, XP e vínculo de quem foi, treino de quem ficou', () => {
    const c = cena({ perfil: 'vigilia', equipe: 2 });
    const r = colherNoServidor(c.db, { id: c.exp.id, pack: PACK, agora: c.fim });
    const o = doServidor(c.db, c.u);
    ok(r.moedas > 0 && o.bolsa[PACK.moedaPve.id] >= r.moedas, 'a moeda não entrou na bolsa');
    const [foi, , ficou] = o.criaturas;
    ok(foi[1] === r.xp && foi[3] > 0, `quem foi não ganhou XP e vínculo: ${JSON.stringify(foi)}`);
    igual(ficou[4], c.fim, 'a marca do treino de quem ficou');
    ok(ficou[1] > 0, 'quem ficou não treinou');
    igual(JSON.parse(c.db.prepare(`SELECT resultado_json AS j FROM expedicoes WHERE id = ?`).get(c.exp.id).j).xp, r.xp,
      'a resposta da colheita não foi gravada');
    igual(o.pendentes.length, r.encontros.length, 'os pendentes do servidor');
    ok(recusa(() => colherNoServidor(c.db, { id: c.exp.id, pack: PACK, agora: c.fim + 1 })), 'colheu duas vezes');
    igual(JSON.stringify(doServidor(c.db, c.u)), JSON.stringify(o), 'a segunda colheita escreveu alguma coisa');
  });

  s.teste('o estágio é conferido no servidor: acima do que a coleção abre, recusa; com o nível, sai e fica gravado', () => {
    const e = recusa(() => cena({ estagio: 2 }));
    ok(e && /estágio 2/.test(e.message), `o estágio 2 com todos no nível 1: ${e?.message}`);
    const c = cena({ estagio: 2, xp: [xpParaNivel(12), 0, 0, 0] });
    igual(c.db.prepare(`SELECT estagio FROM expedicoes WHERE id = ?`).get(c.exp.id).estagio, 2, 'o estágio gravado');
  });

  s.teste('o teto do servidor é o do cliente: a reserva conhece a equipe (L-140) e o registro levanta o teto (1.19)', () => {
    const um = cena({ perfil: 'vigilia', equipe: 1 }), tres = cena({ perfil: 'vigilia', equipe: 3 });
    const restam = c => restamEncontros(estadoDoTeto(c.db, c.u, T0, PACK));
    ok(restam(tres) < restam(um), `a Vigília de três reservou o mesmo que a de um: ${restam(tres)} × ${restam(um)}`);
    igual(estadoDoTeto(um.db, um.u, T0, PACK).vistas, 4, 'as quatro da caixa são vistas');
    for (let d = 100; d < 160; d++) creditarRegistro(um.db, um.u, PACK.id, d, 1, T0);
    const est = estadoDoTeto(um.db, um.u, T0, PACK);
    igual(est.vistas, 64, 'caixa + registro, sem contar duas vezes');
    ok(tetoDeEncontros(est.vistas, est.total) > TETO_ENCONTROS, 'o registro não levantou o teto do servidor');
  });

  return s;
}
