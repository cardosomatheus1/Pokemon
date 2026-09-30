/* Q1/Q3/Q6 · A ESCADA DA POKÉDEX E AS MISSÕES DA SEMANA NA CONTA (ST-13.9b · D-136)
 *
 * Com conta, o prêmio da missão resgatada sumia na leitura seguinte da conta
 * (a bolsa é do servidor), e a missão ficava marcada como resgatada no
 * aparelho. As marcas da Arena e o "já possuiu" eram por aparelho. Agora:
 *   - "já possuiu" e "apostou" entram por GATILHO no banco, em todo caminho;
 *   - "viu" entra pela rodada assistida — o servidor marca os lutadores dela;
 *   - a semana (base e resgatadas) é da conta, e o prêmio vai para a bolsa
 *     do servidor na mesma transação que marca a resgatada.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditar } from '../server/carteira.mjs';
import { criarScheduler } from '../server/scheduler.mjs';
import { apostar } from '../server/aposta.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarRegistro, quantosNaBolsa } from '../server/idle.mjs';
import { marcasDe, jaPossuiuDe, marcarVistasDaRodada, missoesDaConta, resgatarMissaoNaConta, VISTA_VALE_MS } from '../server/escada.mjs';
import { idleDaConta } from '../app/modules/idle-conta.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { MISSOES } from '../app/modules/colecao-dados.mjs';
import { idDaMoeda } from '../engine/economia-idle.mjs';

const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const AGORA = Date.UTC(2026, 0, 15);
const conta = (db, nome = 'esc') => cadastrar(db, { username: nome, email: `${nome}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
const novoBanco = () => { const db = abrirBanco(':memory:'); migrar(db); return db; };
const FICHAS = MISSOES.find(m => m.id === 'fichas');

export async function suite() {
  const s = criarSuite('escada-conta');

  s.teste('"já possuiu" por gatilho: a criatura que nasce, a que evolui, e ele fica depois de soltar', () => {
    const db = novoBanco(), uid = conta(db);
    const c = gerar(db, { userId: uid, pack: PACK, dex: 1 });
    igual(jaPossuiuDe(db, uid, PACK.id).join(','), '1', 'a criatura nova não entrou no "já possuiu"');
    db.prepare(`UPDATE criaturas SET dex = 2 WHERE id = ?`).run(c.id);
    igual(jaPossuiuDe(db, uid, PACK.id).join(','), '1,2', 'a evolução não entrou no "já possuiu"');
    db.prepare(`DELETE FROM criaturas WHERE id = ?`).run(c.id);
    igual(jaPossuiuDe(db, uid, PACK.id).join(','), '1,2', 'soltar apagou o "já possuiu"');
  });

  s.teste('a migração traz o que já existia: criaturas de hoje e apostas feitas', () => {
    const db = abrirBanco(':memory:'); migrar(db, MIGRACOES.length - 1);
    const uid = conta(db);
    gerar(db, { userId: uid, pack: PACK, dex: 4 });
    migrar(db);
    igual(jaPossuiuDe(db, uid, PACK.id).join(','), '4', 'a criatura de antes da migração ficou fora do "já possuiu"');
  });

  s.teste('apostar marca "encontrada" a espécie e "vista" a rodada inteira', () => {
    const db = novoBanco(), uid = conta(db);
    let agora = AGORA;
    creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 1000, idem: 'seed', agora });
    const sched = criarScheduler({ db, sims: 600, relogio: () => agora });
    const r = sched.abrirRodada();
    const fav = db.prepare(`SELECT slot, species_id FROM round_fighters WHERE round_id = ? ORDER BY offered_odd LIMIT 1`).get(r.id);
    apostar(db, { sched, userId: uid, slot: fav.slot, valor: 50, agora });
    const m = marcasDe(db, uid);
    const lutadores = db.prepare(`SELECT COUNT(DISTINCT species_id) n FROM round_fighters WHERE round_id = ?`).get(r.id).n;
    igual(`${m.encontradas.join(',')}|${m.vistas.length}`, `${fav.species_id}|${lutadores}`, 'a aposta não marcou a escada');
  });

  s.teste('a rodada assistida marca os lutadores DELA; inexistente e velha são recusadas', () => {
    const db = novoBanco(), uid = conta(db);
    let agora = AGORA;
    const sched = criarScheduler({ db, sims: 600, relogio: () => agora });
    const r = sched.abrirRodada();
    const lutadores = db.prepare(`SELECT species_id FROM round_fighters WHERE round_id = ? ORDER BY species_id`).all(r.id).map(l => l.species_id);
    marcarVistasDaRodada(db, { userId: uid, rodada: r.id, agora });
    igual(marcasDe(db, uid).vistas.join(','), [...new Set(lutadores)].join(','), 'as vistas não são os lutadores da rodada');
    let msg = '';
    try { marcarVistasDaRodada(db, { userId: uid, rodada: 'inventada', agora }); } catch (e) { msg = e.message; }
    ok(/não existe/.test(msg), `a rodada inventada foi aceita: ${msg}`);
    msg = '';
    try { marcarVistasDaRodada(db, { userId: uid, rodada: r.id, agora: agora + VISTA_VALE_MS + 60_000 }); } catch (e) { msg = e.message; }
    ok(/já passou/.test(msg), `a rodada velha virou "vi hoje": ${msg}`);
  });

  s.teste('a missão da semana: a base abre na primeira leitura, o prêmio vai para a bolsa da conta, e uma vez só (D-136)', () => {
    const db = novoBanco(), uid = conta(db);
    const abre = missoesDaConta(db, { userId: uid, pack: PACK, agora: AGORA });
    ok(abre.missoes?.semana != null && abre.quadro.every(m => !m.pronta), 'a semana não abriu, ou abriu pronta');
    /* Fragmentos DEPOIS da base: a missão "fichas" fica pronta. */
    creditarRegistro(db, uid, PACK.id, 16, FICHAS.meta, AGORA);
    igual(missoesDaConta(db, { userId: uid, pack: PACK, agora: AGORA + 1000 }).quadro.find(m => m.id === 'fichas').pronta, true, 'a missão não ficou pronta com os fragmentos da semana');
    const r = resgatarMissaoNaConta(db, { userId: uid, pack: PACK, id: 'fichas', agora: AGORA + 2000 });
    const moeda = idDaMoeda(PACK);
    igual(`${quantosNaBolsa(db, uid, moeda)}|${quantosNaBolsa(db, uid, 'great')}`, `${FICHAS.premio.pokecoin}|${FICHAS.premio.great}`, 'o prêmio não foi para a bolsa da conta');
    igual(JSON.stringify(r.premio), JSON.stringify(FICHAS.premio), 'a resposta não diz o prêmio');
    let msg = '';
    try { resgatarMissaoNaConta(db, { userId: uid, pack: PACK, id: 'fichas', agora: AGORA + 3000 }); } catch (e) { msg = e.message; }
    ok(/já resgatada/.test(msg) && quantosNaBolsa(db, uid, moeda) === FICHAS.premio.pokecoin, `resgatou duas vezes: ${msg}`);
    msg = '';
    try { resgatarMissaoNaConta(db, { userId: uid, pack: PACK, id: 'capturar', agora: AGORA + 3000 }); } catch (e) { msg = e.message; }
    ok(/faltam/.test(msg), `resgatou a missão que não estava pronta: ${msg}`);
  });

  s.teste('a conta desce para o aparelho: "já possuiu", a semana resgatada, e as marcas somam às do aparelho', () => {
    const e = idleDaConta({ ...D.VAZIO(), jaPossuiu: [99] }, { agora: AGORA, pack: PACK.id, jaPossuiu: [1, 4],
      missoes: { semana: 2900, base: { fichas: 0 }, resgatadas: ['fichas'] } });
    igual(`${e.jaPossuiu.join(',')}|${e.missoes.semana}|${e.missoes.resgatadas.join(',')}`, '1,4|2900|fichas', 'a conta não desceu a escada e a semana');
    const t = fonte('app/modules/idle-servidor.mjs');
    ok(/marcarVistas\(m, r\.corpo\.marcas\.vistas/.test(t) && /gravarMarcas\(m, deposito\)/.test(t), 'as marcas da conta não chegam ao aparelho');
    ok(fonte('app/modules/colecao-tela.mjs').includes("naContaOu('/api/idle/missao', { id: b.dataset.missao }"), 'o resgate da missão não passa pela conta');
    ok(/api\.post\('\/api\/idle\/vistas', \{ rodada: r\.id \}\)/.test(fonte('app/modules/fases.mjs')), 'a rodada assistida não chega à conta');
  });

  return s;
}
