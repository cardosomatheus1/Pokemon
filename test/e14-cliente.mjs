/* Q1/Q3/Q6 · E14 · O QUE O SERVIDOR DECIDE CHEGA À TELA DO LANCE (ST-14.0D)
 *
 * O shiny do encontro, a bola garantida e a consequência de gastar uma bola de
 * lote preso eram do servidor e não apareciam: o jogador escolhia a bola sem
 * saber que o encontro brilhava, não achava a bola do Campeão, e descobria
 * DEPOIS que a criatura nasceu presa. A decisão mora em
 * `app/modules/encontro-dados.mjs` (camada 0) e a tela só pinta.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync } from 'node:fs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa, lancarPendente } from '../server/idle.mjs';
import { colecaoDe } from '../server/colecao-rotas.mjs';
import { idleDaConta } from '../app/modules/idle-conta.mjs';
import * as D from '../app/modules/idle-dados.mjs';
import { bolasDoLance, seloDoEncontro, consequenciaDoLance, confirmacaoDoLance } from '../app/modules/encontro-dados.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const GARANTIDA = PACK.catalogo.find(i => i.guaranteed_capture === true).id;
const fonte = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  return { db, uid: cadastrar(db, { username: 'cli', email: 'cli@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id };
};

export async function suite() {
  const s = criarSuite('e14-cliente');

  s.teste('as bolas do quadro: as do pack sempre; a garantida só quando se tem', () => {
    const ids = bolsa => bolasDoLance(PACK, bolsa).map(b => `${b.id}:${b.tem}:${b.garantida}`).join(',');
    const comuns = PACK.bolas.map(b => `${b.id}:0:false`).join(',');
    igual(ids({}), comuns, 'sem bolsa');
    igual(ids({ [GARANTIDA]: 0 }), comuns, 'a garantida zerada virou botão apagado');
    igual(ids({ [GARANTIDA]: 2 }), `${comuns},${GARANTIDA}:2:true`, 'a garantida que se tem não aparece');
  });

  s.teste('o selo do shiny, o aviso do lote preso e a pergunta da garantida', () => {
    igual(JSON.stringify(seloDoEncontro({ shiny: true })), JSON.stringify({ texto: '✦ brilhante', classe: 'encShiny' }), 'o selo do shiny');
    igual(seloDoEncontro({ shiny: false }), null, 'selo sem shiny');
    const p = PACK.bolas[0].id;
    igual(consequenciaDoLance({ [p]: [{ classe: 'legacy_unverified', quantidade: 2 }, { classe: 'verified_earned', quantidade: 3 }] }, p)?.classe, 'legacy_unverified', 'o lote mais antigo preso não avisa');
    igual(consequenciaDoLance({ [p]: [{ classe: 'legacy_unverified', quantidade: 0 }, { classe: 'verified_earned', quantidade: 3 }] }, p), null, 'o lote vazio avisou');
    igual(consequenciaDoLance({ [p]: [{ classe: 'p2p_verified', quantidade: 1 }] }, p), null, 'o lote livre avisou');
    igual(consequenciaDoLance({ [p]: [{ classe: 'verified_earned', quantidade: 1 }, { classe: 'legacy_unverified', quantidade: 5 }] }, p), null, 'avisou pelo lote que o débito NÃO gasta agora');
    igual(consequenciaDoLance(undefined, p), null, 'sem lotes (sem conta) avisou');
    igual(confirmacaoDoLance(PACK, { bola: p, nome: 'Pidgey' }), null, 'a bola comum pede confirmação');
    const q = confirmacaoDoLance(PACK, { bola: GARANTIDA, nome: 'Pidgey', shiny: true });
    ok(q && q.includes('Pidgey') && q.includes('brilhante') && q.includes('não volta'), `a pergunta da garantida: ${q}`);
  });

  s.teste('a leitura da conta traz o shiny, a origem e os lotes na ordem do débito', () => {
    const { db, uid } = novo();
    const c = gerar(db, { userId: uid, pack: PACK, dex: 16, proveniencia: 'promotional_bound' });
    db.prepare(`UPDATE criaturas SET is_shiny = 1 WHERE id = ?`).run(c.id);
    creditarBolsa(db, uid, 'poke', 2, { classe: 'legacy_unverified', fonte: 'migracao', agora: AGORA });
    creditarBolsa(db, uid, 'poke', 3, { fonte: 'colheita:x', agora: AGORA + 1 });
    db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em, is_shiny, shiny_versao) VALUES ('k1', ?, 'avanco', 19, 'comum', 'floresta', ?, 1, 't')`).run(uid, AGORA);
    const srv = colecaoDe(db, { userId: uid, agora: AGORA + 10 });
    const cc = srv.criaturas.find(x => x.id === c.id);
    igual(`${cc.shiny}|${cc.proveniencia}|${srv.encontros[0].shiny}`, 'true|promotional_bound|true', 'a leitura não traz o shiny ou a origem');
    igual(JSON.stringify(srv.lotes.poke), JSON.stringify([{ classe: 'legacy_unverified', quantidade: 2 }, { classe: 'verified_earned', quantidade: 3 }]), 'os lotes fora da ordem do débito');
    /* O reservado não conta: metade reservada desce como metade; o lote todo
       reservado sai da lista. */
    const reservar = n => db.prepare(`UPDATE bolsa_lotes SET reservada = ? WHERE user_id = ? AND classe = 'legacy_unverified'`).run(n, uid);
    const poke = () => JSON.stringify(colecaoDe(db, { userId: uid, agora: AGORA + 10 }).lotes.poke);
    reservar(1);
    igual(poke(), JSON.stringify([{ classe: 'legacy_unverified', quantidade: 1 }, { classe: 'verified_earned', quantidade: 3 }]), 'o reservado contou como livre');
    reservar(2);
    igual(poke(), JSON.stringify([{ classe: 'verified_earned', quantidade: 3 }]), 'o lote todo reservado desceu');
    db.prepare(`UPDATE bolsa_lotes SET reservada = 0 WHERE user_id = ?`).run(uid);
    const e = idleDaConta(D.VAZIO(), srv);
    igual(`${e.lotes.poke.length}|${e.encontros[0].shiny}`, '2|true', 'a conta não desceu os lotes ou o shiny');
    igual(JSON.stringify(idleDaConta(D.VAZIO(), { ...srv, lotes: 'lixo' }).lotes), '{}', 'lotes inválidos chegaram ao aparelho');
    /* O aviso acerta: o débito gasta o lote que a tela disse que prende. */
    const aviso = consequenciaDoLance(e.lotes, 'poke');
    let r = null;
    for (let i = 0; i < 2 && !r?.criatura; i++) {
      if (i) db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em) VALUES ('k2', ?, 'avanco', 19, 'comum', 'floresta', ?)`).run(uid, AGORA);
      r = lancarPendente(db, { userId: uid, pack: PACK, chave: i ? 'k2' : 'k1', bola: 'poke', agora: AGORA + 20 });
    }
    if (r?.criatura) igual(db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ?`).get(r.criatura.id).proveniencia, aviso.classe, 'a tela avisou uma classe e o débito gastou outra');
  });

  s.teste('a tela pinta o que a camada 0 decide, e pergunta antes do lance raro', () => {
    const p = fonte('app/modules/idle-paineis.mjs');
    ok(/bolasDoLance\(PACK, E\.bolsa\)/.test(p) && /seloDoEncontro\(en\)/.test(p) && /consequenciaDoLance\(E\.lotes, b\.id\)/.test(p), 'o quadro decide fora da camada 0');
    const t = fonte('app/modules/idle-tela.mjs');
    const i = t.indexOf('await confirmarLance('), j = t.indexOf('await lancarNa(');
    ok(i > 0 && j > i, 'o lance não pergunta antes, ou pergunta depois');
  });

  return s;
}
