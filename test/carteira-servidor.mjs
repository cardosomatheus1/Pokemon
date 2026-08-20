/* Q1/Q3/Q6/Q8 · A CARTEIRA NO SERVIDOR — ledger, idempotência e concorrência (F1.4).
 *
 * O QUE MUDA EM RELAÇÃO AO `engine/carteira.mjs`: nada nas REGRAS. A ordem de
 * consumo, a proveniência do payout, os tipos de lançamento — tudo continua
 * vindo do motor, que é a fonte única. O que este bloco acrescenta é o que só
 * existe quando há um servidor:
 *
 *   PERSISTÊNCIA   o saldo e o ledger vivem no banco, não na memória de um
 *                  navegador que o jogador controla;
 *   IDEMPOTÊNCIA   a mesma chave repetida não duplica efeito — é o §16.4.1, e é
 *                  a diferença entre "o cliente reenviou" e "o jogador ganhou
 *                  duas vezes";
 *   CONCORRÊNCIA   cem reservas sobre o mesmo saldo não podem produzir saldo
 *                  negativo nem duas reservas do mesmo dinheiro.
 *
 * O TESTE DE CONCORRÊNCIA É O CORAÇÃO DO BLOCO, e ele precisa ser honesto sobre
 * o que prova: `node:sqlite` é SÍNCRONO, então "concorrência" aqui é
 * intercalação de transações, não paralelismo real de threads. Ele pega o erro
 * que de fato acontece — ler o saldo, decidir, e escrever com base numa leitura
 * que envelheceu (TOCTOU). Ele NÃO prova nada sobre dois processos, e isso está
 * escrito no bloco como lacuna.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import {
  creditar, reservarNoBanco, liberarNoBanco, liquidarNoBanco,
  saldos, ledgerDe, reconciliarNoBanco, ERRO_CARTEIRA,
} from '../server/carteira.mjs';

const AGORA = Date.UTC(2026, 0, 15);
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

function comUsuario(saldoInicial = {}) {
  const db = abrirBanco(':memory:'); migrar(db);
  const u = cadastrar(db, {
    username: 'j', email: 'j@exemplo.test', senha: 'senha-longa-o-bastante-1',
    nascimento: '1990-01-01', agora: AGORA,
  });
  for (const [bucket, valor] of Object.entries(saldoInicial))
    creditar(db, { userId: u.id, tipo: 'ADMIN_ADJUSTMENT', bucket, valor,
                   idem: `seed-${bucket}`, agora: AGORA });
  return { db, u };
}

export function suite() {
  const s = criarSuite('carteira-servidor');

  /* --- o básico ----------------------------------------------------------- */

  s.teste('creditar move o saldo E grava no ledger', () => {
    const { db, u } = comUsuario();
    creditar(db, { userId: u.id, tipo: 'WELCOME_GRANT', bucket: 'bonus', valor: 500,
                   idem: 'boas-vindas', agora: AGORA });
    igual(saldos(db, u.id).bonus, 500, 'o saldo não subiu');
    const l = ledgerDe(db, u.id);
    igual(l.length, 1, `${l.length} lançamentos, esperado 1`);
    igual(l[0].amount, 500, 'o lançamento não tem o valor');
  });

  s.teste('a reserva segue a ordem de consumo do motor e grava a composição', () => {
    const { db, u } = comUsuario({ bonus: 70, transferivel: 100 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'aposta-1', agora: AGORA });
    ok(r.ok, `reserva recusada: ${r.motivo}`);
    /* Bônus primeiro (ORDEM_CONSUMO do motor): 70 de bônus, 30 de transferível.
       É a regra que impede a Arena de virar conversor de bônus em saldo real. */
    igual(r.composicao.bonus, 70, 'não gastou o bônus primeiro');
    igual(r.composicao.transferivel, 30, 'a sobra não veio do transferível');
    const sal = saldos(db, u.id);
    igual(sal.bonus, 0, 'o bônus disponível não zerou');
    igual(sal.transferivel, 70, 'o transferível disponível está errado');
    igual(sal.reservado_bonus, 70, 'o bônus não foi para reservado');
  });

  s.teste('reserva acima do saldo é recusada, e nada muda', () => {
    const { db, u } = comUsuario({ transferivel: 50 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 51, ref: 'x', agora: AGORA });
    ok(!r.ok, 'reservou mais do que tinha');
    igual(saldos(db, u.id).transferivel, 50, 'o saldo mudou numa reserva recusada');
    igual(ledgerDe(db, u.id).filter(l => l.type === 'BET_RESERVE').length, 0,
      'a reserva recusada deixou lançamento no ledger');
  });

  /* --- PROVENIÊNCIA: o §5.5 inteiro cabe neste teste --------------------- */

  s.teste('o payout HERDA a origem da stake — bônus paga bônus', () => {
    const { db, u } = comUsuario({ bonus: 100 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a1', agora: AGORA });
    liquidarNoBanco(db, { userId: u.id, composicao: r.composicao, ganhou: true, odd: 3,
                          ref: 'a1', idem: 'liq-a1', agora: AGORA });
    const sal = saldos(db, u.id);
    igual(sal.bonus, 300, `o payout foi para bônus? veio ${sal.bonus}`);
    igual(sal.transferivel, 0,
      'apostar bônus creditou TRANSFERÍVEL. É exatamente a brecha que o §5.5 ' +
      'fecha: a Arena viraria um conversor de bônus gratuito em saldo real.');
  });

  s.teste('stake mista paga proporcional, cada parcela ao seu bucket', () => {
    const { db, u } = comUsuario({ bonus: 70, transferivel: 30 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a2', agora: AGORA });
    liquidarNoBanco(db, { userId: u.id, composicao: r.composicao, ganhou: true, odd: 2,
                          ref: 'a2', idem: 'liq-a2', agora: AGORA });
    const sal = saldos(db, u.id);
    igual(sal.bonus, 140, `bônus: 70 x 2 = 140, veio ${sal.bonus}`);
    igual(sal.transferivel, 60, `transferível: 30 x 2 = 60, veio ${sal.transferivel}`);
  });

  s.teste('aposta perdida some do reservado e não volta para disponível', () => {
    const { db, u } = comUsuario({ transferivel: 100 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a3', agora: AGORA });
    liquidarNoBanco(db, { userId: u.id, composicao: r.composicao, ganhou: false,
                          ref: 'a3', idem: 'liq-a3', agora: AGORA });
    const sal = saldos(db, u.id);
    igual(sal.transferivel, 0, 'a aposta perdida voltou para o disponível');
    igual(sal.reservado_transferivel, 0, 'a aposta perdida ficou reservada para sempre');
  });

  s.teste('liberar devolve a reserva INTACTA, bucket a bucket', () => {
    const { db, u } = comUsuario({ bonus: 70, transferivel: 30 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a4', agora: AGORA });
    liberarNoBanco(db, { userId: u.id, composicao: r.composicao, ref: 'a4',
                         idem: 'lib-a4', agora: AGORA });
    const sal = saldos(db, u.id);
    igual(sal.bonus, 70, 'o bônus não voltou inteiro');
    igual(sal.transferivel, 30,
      'devolveu o VALOR e não a COMPOSIÇÃO — cancelar aposta virou conversor de bônus');
  });

  /* --- IDEMPOTÊNCIA (§16.4.1) -------------------------------------------- */

  s.teste('a mesma chave de idempotência NÃO duplica efeito', () => {
    const { db, u } = comUsuario();
    for (let i = 0; i < 5; i++)
      creditar(db, { userId: u.id, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 100,
                     idem: 'diaria-2026-01-15', agora: AGORA });
    igual(saldos(db, u.id).bonus, 100,
      'cinco chamadas com a MESMA chave creditaram mais de uma vez. É a diferença ' +
      'entre "o cliente reenviou" e "o jogador ganhou cinco vezes".');
    igual(ledgerDe(db, u.id).length, 1, 'o ledger ganhou linhas duplicadas');
  });

  s.teste('chaves diferentes creditam as duas vezes', () => {
    const { db, u } = comUsuario();
    creditar(db, { userId: u.id, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 100, idem: 'd1', agora: AGORA });
    creditar(db, { userId: u.id, tipo: 'DAILY_REWARD', bucket: 'bonus', valor: 100, idem: 'd2', agora: AGORA });
    igual(saldos(db, u.id).bonus, 200,
      'idempotência agressiva demais: chaves diferentes foram tratadas como a mesma');
  });

  s.teste('a liquidação repetida NÃO paga duas vezes', () => {
    const { db, u } = comUsuario({ transferivel: 100 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a5', agora: AGORA });
    for (let i = 0; i < 3; i++)
      liquidarNoBanco(db, { userId: u.id, composicao: r.composicao, ganhou: true, odd: 2,
                            ref: 'a5', idem: 'liq-a5', agora: AGORA });
    igual(saldos(db, u.id).transferivel, 200,
      'pagou mais de uma vez. É a invariante "payout ocorre uma única vez" do §4.6.');
  });

  /* --- Q6: o dinheiro do outro ------------------------------------------- */

  s.teste('não dá para reservar contra a carteira de OUTRO usuário', () => {
    const { db, u } = comUsuario({ transferivel: 100 });
    const outro = cadastrar(db, { username: 'b', email: 'b@exemplo.test',
      senha: 'senha-longa-o-bastante-2', nascimento: '1990-01-01', agora: AGORA });
    const r = reservarNoBanco(db, { userId: outro.id, valor: 100, ref: 'x', agora: AGORA });
    ok(!r.ok, 'reservou 100 de uma carteira que tem 0 — o saldo está sendo lido do usuário errado');
    igual(saldos(db, u.id).transferivel, 100, 'o saldo da vítima mudou');
  });

  s.teste('valor não inteiro, negativo ou gigante é recusado', () => {
    const { db, u } = comUsuario({ transferivel: 1000 });
    for (const v of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2, '100'])
      ok(!reservarNoBanco(db, { userId: u.id, valor: v, ref: 'x', agora: AGORA }).ok,
        `valor ${String(v)} foi aceito`);
    igual(saldos(db, u.id).transferivel, 1000, 'algum valor inválido mexeu no saldo');
  });

  s.teste('o memo do ledger não é interpretado, é dado', () => {
    const { db, u } = comUsuario();
    const veneno = `'); DROP TABLE users; --`;
    creditar(db, { userId: u.id, tipo: 'ADMIN_ADJUSTMENT', bucket: 'bonus', valor: 10,
                   idem: 'm1', memo: veneno, agora: AGORA });
    const l = ledgerDe(db, u.id);
    igual(l[0].memo, veneno, 'o memo foi alterado no caminho');
    ok(db.prepare(`SELECT COUNT(*) c FROM users`).get().c === 1,
      'a tabela users sumiu — o memo foi concatenado em SQL');
  });

  /* --- Q3: a reconciliação ------------------------------------------------ */

  s.teste('o saldo materializado reconcilia com o ledger', () => {
    const { db, u } = comUsuario({ bonus: 70, transferivel: 130 });
    const r = reservarNoBanco(db, { userId: u.id, valor: 100, ref: 'a6', agora: AGORA });
    liquidarNoBanco(db, { userId: u.id, composicao: r.composicao, ganhou: true, odd: 2,
                          ref: 'a6', idem: 'liq-a6', agora: AGORA });
    const p = reconciliarNoBanco(db, u.id);
    igual(p.length, 0, `o saldo divergiu do ledger: ${JSON.stringify(p)}`);
  });

  s.teste('a reconciliação DETECTA um saldo adulterado', () => {
    const { db, u } = comUsuario({ transferivel: 100 });
    /* Escrita direta na tabela de saldo, sem ledger — é o que um bug de caminho
       novo faz, e é o que a reconciliação existe para achar. */
    db.prepare(`UPDATE carteiras SET saldo = 999 WHERE user_id=? AND bucket='transferivel'`).run(u.id);
    const p = reconciliarNoBanco(db, u.id);
    ok(p.length > 0,
      'saldo adulterado passou na reconciliação — ela está recalculando a partir ' +
      'do próprio saldo em vez do ledger');
  });

  /* --- Q8: CONCORRÊNCIA ---------------------------------------------------- */

  /* O TESTE QUE JUSTIFICA O BLOCO.
   *
   * Cem reservas de 10 sobre um saldo de 100: exatamente dez podem passar. O
   * erro que este teste pega é o TOCTOU — ler o saldo, decidir, e escrever com
   * base numa leitura que envelheceu entre as duas coisas.
   *
   * HONESTIDADE SOBRE O QUE ELE PROVA: `node:sqlite` é síncrono, então isto é
   * intercalação de transações num processo, não paralelismo de threads. Ele
   * pega o erro que de fato acontece no código; ele NÃO prova nada sobre dois
   * processos do F1.6. Está registrado como lacuna no bloco. */
  s.teste('cem reservas concorrentes sobre o mesmo saldo não criam dinheiro', () => {
    const { db, u } = comUsuario({ transferivel: 100 });
    let aceitas = 0;
    for (let i = 0; i < 100; i++)
      if (reservarNoBanco(db, { userId: u.id, valor: 10, ref: `c${i}`, agora: AGORA }).ok) aceitas++;
    igual(aceitas, 10, `${aceitas} reservas de 10 sobre saldo 100 — esperado exatamente 10`);
    const sal = saldos(db, u.id);
    igual(sal.transferivel, 0, `sobrou ${sal.transferivel} disponível`);
    igual(sal.reservado_transferivel, 100, `reservado ficou ${sal.reservado_transferivel}`);
    igual(reconciliarNoBanco(db, u.id).length, 0, 'o ledger não fecha com o saldo depois da rajada');
  });

  s.teste('o saldo NUNCA fica negativo, mesmo com liberações e liquidações misturadas', () => {
    const { db, u } = comUsuario({ transferivel: 100, bonus: 50 });
    const refs = [];
    for (let i = 0; i < 30; i++) {
      const r = reservarNoBanco(db, { userId: u.id, valor: 7, ref: `m${i}`, agora: AGORA });
      if (r.ok) refs.push({ ref: `m${i}`, composicao: r.composicao });
    }
    refs.forEach((x, i) => {
      if (i % 3 === 0) liberarNoBanco(db, { userId: u.id, ...x, idem: `lib${i}`, agora: AGORA });
      else liquidarNoBanco(db, { userId: u.id, ...x, ganhou: i % 2 === 0, odd: 2,
                                 idem: `liq${i}`, agora: AGORA });
    });
    const sal = saldos(db, u.id);
    for (const [k, v] of Object.entries(sal))
      ok(v >= 0, `${k} ficou negativo: ${v}`);
    igual(reconciliarNoBanco(db, u.id).length, 0, 'o ledger não fecha depois da mistura');
  });

  return s;
}
