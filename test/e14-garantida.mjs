/* Q1/Q3/Q6/Q8 · E14 · A BOLA DE CAPTURA GARANTIDA E A EMISSÃO CONTROLADA (ST-14.4)
 *
 * A garantia é CAPACIDADE do item (`guaranteed_capture`), lida pelo motor sem
 * nome nenhum, e vale ANTES do teto — mas só contra encontro capturável. E o
 * item só nasce por fonte com orçamento: por conta e no total, sob versão, um
 * evento uma vez; o orçamento esgotado recusa o pedido novo e nunca retira o
 * que já saiu.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa, quantosNaBolsa, lancarPendente } from '../server/idle.mjs';
import { lotesDe } from '../server/inventario.mjs';
import { emTransacao } from '../server/carteira.mjs';
import { emitirControlado, regraDeEmissao, emitidos } from '../server/emissao-controlada.mjs';
import { lutarNaConta } from '../server/jornada.mjs';
import { chanceDe, tentar, garantida, TETO_CAPTURA } from '../engine/captura.mjs';
import { xpParaNivel } from '../engine/nivel-criatura.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const GARANTIDA = PACK.catalogo.find(i => i.guaranteed_capture === true)?.id;
const FONTE = Object.keys(PACK.catalogo.find(i => i.id === GARANTIDA)?.emissao?.fontes ?? {})[0];
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const conta = (db, n) => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
const novo = () => { const db = abrirBanco(':memory:'); migrar(db); return { db, uid: conta(db, 'gar1'), outro: conta(db, 'gar2') }; };
const pendente = (db, uid, chave, { raridade = 'raro', dex = 16, shiny = false } = {}) =>
  db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em, is_shiny, shiny_versao) VALUES (?, ?, 'avanco', ?, ?, 'floresta', ?, ?, 't')`)
    .run(chave, uid, dex, raridade, AGORA, shiny ? 1 : 0);
/* O pack com outro orçamento — para medir o teto global sem 500 contas. */
const comOrcamento = (porConta, global) => ({ ...PACK, catalogo: PACK.catalogo.map(i => i.id !== GARANTIDA ? i
  : { ...i, emissao: { ...i.emissao, fontes: { ...i.emissao.fontes, [FONTE]: { porConta, global } } } }) });

export async function suite() {
  const s = criarSuite('e14-garantida');

  s.teste('motor: chance 1 em toda raridade capturável, antes do teto; zero no que não é capturável', () => {
    ok(GARANTIDA && FONTE, 'o pack não declara bola garantida com fonte de emissão');
    const raridades = (PACK.raridade ?? []).map(f => f[0]).filter(r => chanceDe(PACK, { raridade: r, bola: PACK.bolas[0].id }) > 0);
    ok(raridades.length >= 3, 'raridades capturáveis de menos — o teste não mede nada');
    igual(raridades.map(r => chanceDe(PACK, { raridade: r, bola: GARANTIDA })).join(','), raridades.map(() => 1).join(','), 'a garantida não é 1 em alguma raridade');
    igual(chanceDe(PACK, { raridade: 'inventada', bola: GARANTIDA }), 0, 'a garantida legitimou um encontro que não existe');
    ok(raridades.every(r => chanceDe(PACK, { raridade: r, bola: PACK.bolas.at(-1).id }) <= TETO_CAPTURA), 'as outras bolas passaram do teto');
    igual(tentar(() => 0.9999999, PACK, { raridade: raridades.at(-1), bola: GARANTIDA }).capturou, true, 'o sorteio mais alto escapou da garantida');
    igual(garantida(PACK, PACK.bolas[0].id), false, 'a bola comum ficou garantida');
    igual(garantida({ ...PACK, catalogo: PACK.catalogo.map(i => ({ ...i, guaranteed_capture: undefined })) }, GARANTIDA), false, 'a garantia não vem da marca do pack');
  });

  s.teste('o lance com ela captura sempre, gasta uma, e não muda espécie nem shiny; sem estoque recusa', () => {
    const { db, uid } = novo();
    pendente(db, uid, 'g0', { raridade: 'raro' });
    ok(recusa(() => lancarPendente(db, { userId: uid, pack: PACK, chave: 'g0', bola: GARANTIDA, agora: AGORA })), 'lançou sem ter a bola');
    igual(db.prepare(`SELECT resolvido_em FROM encontros_pendentes WHERE chave = 'g0'`).get().resolvido_em, null, 'o lance sem estoque consumiu o encontro');
    creditarBolsa(db, uid, GARANTIDA, 2, { fonte: 'teste' });
    const caps = [];
    for (const [i, shiny] of [[1, false], [2, true]]) {
      pendente(db, uid, `g${i}`, { raridade: 'raro', dex: 25, shiny });
      caps.push(lancarPendente(db, { userId: uid, pack: PACK, chave: `g${i}`, bola: GARANTIDA, agora: AGORA }));
    }
    igual(caps.map(r => `${r.capturou}:${db.prepare(`SELECT dex FROM criaturas WHERE id = ?`).get(r.criatura?.id)?.dex}:${r.criatura?.shiny}`).join(','), 'true:25:false,true:25:true', 'a garantida falhou ou mudou a criatura');
    const de_novo = lancarPendente(db, { userId: uid, pack: PACK, chave: 'g2', bola: GARANTIDA, agora: AGORA + 1 });
    igual(`${de_novo.repetida}|${quantosNaBolsa(db, uid, GARANTIDA)}`, 'true|0', 'o retry gastou outra bola garantida');
  });

  s.teste('a emissão: fonte aprovada emite uma, o mesmo evento não emite de novo, e a conta tem teto', () => {
    const { db, uid } = novo();
    ok(recusa(() => emitirControlado(db, { userId: uid, pack: PACK, itemId: GARANTIDA, fonte: 'inventada', evento: 'e0', agora: AGORA })), 'uma fonte sem regra emitiu');
    ok(recusa(() => emitirControlado(db, { userId: uid, pack: PACK, itemId: PACK.bolas[0].id, fonte: FONTE, evento: 'e0', agora: AGORA })), 'um item sem orçamento passou pela emissão');
    const a = emitirControlado(db, { userId: uid, pack: PACK, itemId: GARANTIDA, fonte: FONTE, evento: 'e1', agora: AGORA });
    const b = emitirControlado(db, { userId: uid, pack: PACK, itemId: GARANTIDA, fonte: FONTE, evento: 'e1', agora: AGORA + 1 });
    igual(`${a.ok}|${b.ok}|${b.repetida}|${quantosNaBolsa(db, uid, GARANTIDA)}`, 'true|true|true|1', 'o mesmo evento emitiu duas vezes');
    igual(lotesDe(db, uid, GARANTIDA).map(l => `${l.classe}:${l.fonte}`).join(','), `verified_earned:emissao:${FONTE}:e1`, 'o lote não diz a emissão');
    const c = emitirControlado(db, { userId: uid, pack: PACK, itemId: GARANTIDA, fonte: FONTE, evento: 'e2', agora: AGORA + 2 });
    igual(`${c.ok}|${c.motivo}|${quantosNaBolsa(db, uid, GARANTIDA)}`, `false|conta|1`, 'o teto por conta não segurou');
    igual(regraDeEmissao(PACK, GARANTIDA, FONTE).porConta, 1, 'a regra do piloto é uma por conta');
  });

  s.teste('o teto global recusa o pedido novo e não retira o que já saiu', () => {
    const { db } = novo();
    const pack = comOrcamento(1, 2);
    const contas = ['t1', 't2', 't3'].map(n => conta(db, n));
    const r = contas.map((u, i) => emitirControlado(db, { userId: u, pack, itemId: GARANTIDA, fonte: FONTE, evento: `g:${i}`, agora: AGORA + i }));
    igual(r.map(x => x.ok ? 'ok' : x.motivo).join(','), 'ok,ok,global', 'o teto global');
    igual(contas.map(u => quantosNaBolsa(db, u, GARANTIDA)).join(','), '1,1,0', 'o teto retirou o que já tinha saído, ou deu ao terceiro');
    igual(emitidos(db, { itemId: GARANTIDA, fonte: FONTE, versao: regraDeEmissao(pack, GARANTIDA, FONTE).versao }), 2, 'a contagem do emitido');
  });

  s.teste('dois pedidos ao mesmo tempo não leem o mesmo saldo de orçamento (Q8)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'garantida-'));
    try {
      const arq = join(dir, 'b.db');
      const A = abrirBanco(arq); migrar(A);
      const u1 = conta(A, 'c1'), u2 = conta(A, 'c2');
      const B = abrirBanco(arq);
      B.exec('PRAGMA busy_timeout = 0');
      const pack = comOrcamento(1, 1);
      /* A segura a trava com o pedido dele no meio; o de B, nesse instante,
         não pode ler o orçamento velho — ele espera (aqui, falha na hora). */
      let deB = null;
      emTransacao(A, () => {
        emitirControlado(A, { userId: u1, pack, itemId: GARANTIDA, fonte: FONTE, evento: 'x1', agora: AGORA });
        deB = recusa(() => emitirControlado(B, { userId: u2, pack, itemId: GARANTIDA, fonte: FONTE, evento: 'x2', agora: AGORA }));
      });
      ok(deB && /locked|busy/i.test(deB.message), `o segundo pedido leu o orçamento durante o primeiro: ${deB?.message}`);
      const depois = emitirControlado(B, { userId: u2, pack, itemId: GARANTIDA, fonte: FONTE, evento: 'x2', agora: AGORA + 1 });
      igual(`${depois.ok}|${depois.motivo}|${quantosNaBolsa(B, u2, GARANTIDA)}`, 'false|global|0', 'depois do primeiro, o segundo passou do teto');
      A.close(); B.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  s.teste('a jornada paga pela fonte: a primeira vitória no nó emite, a segunda não', () => {
    const { db, uid } = novo();
    for (const [i, [dex, nivel]] of [[4, 16], [7, 15], [1, 15], [25, 14], [16, 13], [19, 12]].entries()) {
      const c = gerar(db, { userId: uid, pack: PACK, dex, origem: 'captura' });
      db.prepare(`UPDATE criaturas SET xp = ?, criada_em = ? WHERE id = ?`).run(xpParaNivel(nivel), AGORA + i, c.id);
    }
    /* O nó de teste é o primeiro do caminho, com a fonte do nó final — vencer
       o Campeão num teste custaria a jornada inteira. */
    const final = PACK.jornada.find(n => n.emissaoControlada);
    ok(final?.final, 'a emissão controlada não está no nó final da jornada');
    const pack = { ...PACK, jornada: PACK.jornada.map((n, i) => i === 0 ? { ...n, emissaoControlada: final.emissaoControlada } : n) };
    const no = pack.jornada[0].id;
    let r = null;
    for (let k = 0; k < 20 && !r?.venceu; k++)
      r = lutarNaConta(db, { userId: uid, pack, id: no, chaveIdem: `luta-000${k}`, agora: AGORA + k, semente: k + 1 });
    ok(r?.venceu, 'o time não venceu o primeiro nó — o teste não mede nada');
    igual(`${r.emissao?.ok}|${quantosNaBolsa(db, uid, GARANTIDA)}`, 'true|1', 'a primeira vitória não emitiu');
    let outra = null;
    for (let k = 30; k < 50 && !outra?.venceu; k++)
      outra = lutarNaConta(db, { userId: uid, pack, id: no, chaveIdem: `luta-00${k}`, agora: AGORA + 100 + k, semente: k });
    ok(outra?.venceu, 'não houve segunda vitória para comparar');
    igual(`${'emissao' in outra}|${quantosNaBolsa(db, uid, GARANTIDA)}`, 'false|1', 'a segunda vitória emitiu de novo');
  });

  return s;
}
