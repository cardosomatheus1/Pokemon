/* Q1/Q3/Q6/Q8 · E14 · AS RESERVAS E O ESCROW (ST-14.6)
 *
 * O que uma oferta prende fica preso até liberar, expirar ou liquidar: nada de
 * dupla reserva da mesma criatura, nada de gastar o lote reservado, nada de
 * evoluir, soltar, mandar a campo ou dar doce ao que está oferecido. Tudo ou
 * nada numa transação; liberar duas vezes libera uma.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco, migrar } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa, debitarBolsa, quantosNaBolsa, iniciar } from '../server/idle.mjs';
import { lotesDe } from '../server/inventario.mjs';
import { creditar, saldos } from '../server/carteira.mjs';
import { soltarNaConta, evoluirNaConta, darDoceNaConta } from '../server/colecao.mjs';
import { comecarRun } from '../server/run.mjs';
import { reservarOferta, liberarOferta, expirarVencidas, holdsAtivos } from '../server/reservas.mjs';
import { elegibilidadeDaCriatura } from '../server/elegibilidade.mjs';
import { criarSnapshot } from '../server/equipe.mjs';
import { buscarPartida, ERRO_PARTIDA } from '../server/partida.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const H = 3_600_000;
const CHECKPOINT = 'DEC-99';
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const ligar = db => {
  db.exec('PRAGMA foreign_keys = OFF');
  for (const n of ['p2p_transfer_enabled', 'p2p_trade_enabled', 'player_market_enabled'])
    db.prepare(`INSERT INTO feature_flags (nome, ligada, atualizada_em, atualizada_por) VALUES (?, 1, ?, 'teste')`).run(n, AGORA);
  db.exec('PRAGMA foreign_keys = ON');
};
function cena(arquivo = ':memory:') {
  const db = abrirBanco(arquivo); migrar(db); ligar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  const uid = conta('res1');
  gerar(db, { userId: uid, pack: PACK, dex: 1, origem: 'inicial' });
  const farm = gerar(db, { userId: uid, pack: PACK, dex: 25 });
  const outra = gerar(db, { userId: uid, pack: PACK, dex: 16 });
  creditarBolsa(db, uid, 'poke', 5, { fonte: 'colheita:x', agora: AGORA });
  creditarBolsa(db, uid, 'poke', 4, { classe: 'promotional_bound', fonte: 'teste', agora: AGORA + 1 });
  creditar(db, { userId: uid, tipo: 'ADMIN_ADJUSTMENT', bucket: 'transferivel', valor: 300, idem: 'pc-t', agora: AGORA });
  return { db, uid, farm, outra };
}
/* `tipo: 'market'` onde o teste precisa de várias ofertas abertas ao mesmo
   tempo: a ST-14.14 limita a UMA troca aberta por conta (e dez anúncios). */
const reservar = (c, id, ativos, { tipo = 'trade', ...extra } = {}) =>
  reservarOferta(c.db, { userId: c.uid, pack: PACK, dono: { tipo, id }, ativos, expiraEm: AGORA + 24 * H, agora: AGORA, checkpoint: CHECKPOINT, ...extra });

export async function suite() {
  const s = criarSuite('e14-reservas');

  s.teste('a criatura reservada: uma reserva só, e a política diz ocupada', () => {
    const c = cena();
    const r = reservar(c, 'of-1', { criaturas: [c.farm.id] });
    igual(r.ids.length, 1, 'a reserva não foi criada');
    /* A regra é do BANCO, e não só da política: uma segunda reserva ativa
       gravada por qualquer caminho — inclusive um que esquecesse de perguntar —
       estoura no índice único. */
    const porFora = recusa(() => c.db.prepare(`INSERT INTO asset_holds (id, dono_tipo, dono_id, user_id, tipo, criatura_id, quantidade, expira_em, criado_em)
                                              VALUES ('h-x', 'market', 'm-1', ?, 'criatura', ?, 1, ?, ?)`).run(c.uid, c.farm.id, AGORA + H, AGORA));
    ok(/UNIQUE/.test(porFora?.message ?? ''), `o banco aceitou duas reservas ativas da mesma criatura: ${porFora?.message}`);
    const dupla = recusa(() => reservar(c, 'of-2', { criaturas: [c.farm.id] }, { tipo: 'market' }));
    ok(dupla && /ASSET_BUSY|UNIQUE/.test(`${dupla.reason_code} ${dupla.message}`), `a mesma criatura em duas ofertas: ${dupla?.message}`);
    igual(elegibilidadeDaCriatura(c.db, { userId: c.uid, pack: PACK, id: c.farm.id, acao: 'evoluir', agora: AGORA, checkpoint: CHECKPOINT }).reason_code, 'ASSET_BUSY', 'a política não sabe da reserva');
  });

  s.teste('o que está reservado não evolui, não sai a campo, não entra na run, não ganha doce e não é solto', () => {
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.farm.id] });
    c.db.prepare(`UPDATE criaturas SET na_caixa = 1 WHERE id = ?`).run(c.outra.id);
    const tentativas = {
      evoluir: () => evoluirNaConta(c.db, { userId: c.uid, pack: PACK, id: c.farm.id }),
      expedicao: () => iniciar(c.db, { userId: c.uid, pack: PACK, bioma: 'floresta', perfil: 'batida', equipe: [c.farm.id], agora: AGORA }),
      run: () => comecarRun(c.db, { userId: c.uid, pack: PACK, bioma: 'floresta', equipe: [c.farm.id], agora: AGORA }),
      doce: () => darDoceNaConta(c.db, { userId: c.uid, pack: PACK, id: c.farm.id, chaveIdem: 'doce-00001', agora: AGORA }),
    };
    const passou = Object.entries(tentativas).filter(([, f]) => !/reservada/.test(recusa(f)?.message ?? '')).map(([k]) => k);
    igual(passou.join(','), '', 'mexeram na criatura reservada');
    c.db.prepare(`UPDATE criaturas SET na_caixa = 1 WHERE id = ?`).run(c.farm.id);
    ok(recusa(() => soltarNaConta(c.db, { userId: c.uid, pack: PACK, id: c.farm.id, agora: AGORA })), 'soltou a criatura reservada');
    ok(c.db.prepare(`SELECT 1 FROM criaturas WHERE id = ?`).get(c.farm.id), 'a criatura reservada sumiu');
  });

  s.teste('o item: só os lotes limpos se reservam, reservas coexistem com quantidade, e o débito não gasta o reservado', () => {
    const c = cena();
    reservar(c, 'of-1', { itens: [{ itemId: 'poke', quantidade: 2 }] }, { tipo: 'market' });
    reservar(c, 'of-2', { itens: [{ itemId: 'poke', quantidade: 3 }] }, { tipo: 'market' });
    igual(lotesDe(c.db, c.uid, 'poke').map(l => `${l.classe}`).join(','), 'verified_earned,promotional_bound', 'os lotes');
    igual(c.db.prepare(`SELECT reservada FROM bolsa_lotes WHERE user_id = ? AND item_id = 'poke' ORDER BY id`).all(c.uid).map(l => l.reservada).join(','), '5,0', 'reservou o lote preso, ou não reservou o limpo');
    const terceira = recusa(() => reservar(c, 'of-3', { itens: [{ itemId: 'poke', quantidade: 1 }] }, { tipo: 'market' }));
    igual(terceira?.reason_code, 'ASSET_BUSY', `a terceira reserva passou do limpo livre: ${terceira?.message}`);
    /* O lote PRESO mais antigo não entra no escrow, nem quando vem primeiro. */
    creditarBolsa(c.db, c.uid, 'great', 3, { classe: 'legacy_unverified', fonte: 'migracao', agora: AGORA - H });
    creditarBolsa(c.db, c.uid, 'great', 3, { fonte: 'colheita:y', agora: AGORA });
    reservar(c, 'of-g', { itens: [{ itemId: 'great', quantidade: 2 }] }, { tipo: 'market' });
    igual(c.db.prepare(`SELECT classe || ':' || reservada r FROM bolsa_lotes WHERE user_id = ? AND item_id = 'great' ORDER BY criado_em`).all(c.uid).map(l => l.r).join(','),
      'legacy_unverified:0,verified_earned:2', 'o escrow prendeu o lote de origem presa');
    /* A bolsa tem 9; 5 estão presas em ofertas; o débito só alcança as 4 livres. */
    igual(`${debitarBolsa(c.db, c.uid, 'poke', 5)}|${!!debitarBolsa(c.db, c.uid, 'poke', 4)}|${quantosNaBolsa(c.db, c.uid, 'poke')}`, 'false|true|5', 'o débito gastou o reservado');
  });

  s.teste('tudo ou nada: o último ativo recusado desfaz a oferta inteira, inclusive o PC-T', () => {
    const c = cena();
    const antes = saldos(c.db, c.uid);
    const e = recusa(() => reservar(c, 'of-x', { criaturas: [c.farm.id], moeda: 100, itens: [{ itemId: 'poke', quantidade: 99 }] }));
    ok(e, 'a oferta impossível foi aceita');
    igual(`${holdsAtivos(c.db, { tipo: 'trade', id: 'of-x' }).length}|${JSON.stringify(saldos(c.db, c.uid)) === JSON.stringify(antes)}|${c.db.prepare(`SELECT SUM(reservada) n FROM bolsa_lotes WHERE user_id = ?`).get(c.uid).n}`,
      '0|true|0', 'a recusa deixou reserva, PC-T preso ou lote reservado');
    const pobre = recusa(() => reservar(c, 'of-y', { criaturas: [c.farm.id], moeda: 1000 }));
    igual(`${pobre?.reason_code}|${holdsAtivos(c.db, { tipo: 'trade', id: 'of-y' }).length}`, 'INSUFFICIENT_FUNDS|0', 'o PC-T insuficiente deixou a criatura presa');
  });

  s.teste('liberar devolve uma vez; expirar segue o relógio do servidor', () => {
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.farm.id], itens: [{ itemId: 'poke', quantidade: 2 }], moeda: 120 });
    igual(saldos(c.db, c.uid).reservado_transferivel, 120, 'o PC-T não foi reservado');
    igual(liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA + H }).liberadas, 3, 'a liberação');
    igual(liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA + 2 * H }).liberadas, 0, 'liberou duas vezes');
    igual(`${saldos(c.db, c.uid).reservado_transferivel}|${saldos(c.db, c.uid).transferivel}|${c.db.prepare(`SELECT SUM(reservada) n FROM bolsa_lotes WHERE user_id = ?`).get(c.uid).n}`, '0|300|0', 'a liberação não devolveu tudo, ou devolveu demais');
    igual(c.db.prepare(`SELECT COUNT(*) n FROM wallet_ledger WHERE user_id = ? AND type = 'P2P_RELEASE'`).get(c.uid).n, 1, 'o PC-T voltou duas vezes');
    reservar(c, 'of-2', { criaturas: [c.farm.id] }, { expiraEm: AGORA + 5 * H, agora: AGORA + 3 * H });
    igual(expirarVencidas(c.db, { agora: AGORA + 5 * H - 1 }).expiradas, 0, 'expirou antes do prazo');
    igual(expirarVencidas(c.db, { agora: AGORA + 5 * H }).expiradas, 1, 'não expirou no prazo');
    ok(!recusa(() => reservar(c, 'of-3', { criaturas: [c.farm.id] }, { agora: AGORA + 6 * H, expiraEm: AGORA + 30 * H })), 'a criatura liberada pela expiração continua presa');
    igual(c.db.prepare(`SELECT GROUP_CONCAT(evento) e FROM (SELECT evento FROM asset_holds_eventos e JOIN asset_holds h ON h.id = e.hold_id WHERE h.dono_id = 'of-2' ORDER BY e.id)`).get().e, 'ativa,expirada', 'o livro da reserva');
  });

  s.teste('o time da Liga com uma criatura reservada não luta partida nova', () => {
    const c = cena();
    const snap = criarSnapshot(c.db, { userId: c.uid, pack: PACK, ids: [c.farm.id, c.outra.id], preset: 'balanced', agora: AGORA });
    ok(buscarPartida(c.db, { userId: c.uid, meu: snap.id, chaveIdem: 'antes-0001', agora: AGORA }).bot, 'o time livre não lutou');
    reservar(c, 'of-1', { criaturas: [c.farm.id] });
    igual(recusa(() => buscarPartida(c.db, { userId: c.uid, meu: snap.id, chaveIdem: 'depois-001', agora: AGORA + 1 }))?.codigo, ERRO_PARTIDA.INELEGIVEL,
      'o time com a criatura reservada lutou');
    liberarOferta(c.db, { dono: { tipo: 'trade', id: 'of-1' }, agora: AGORA + 2 });
    ok(buscarPartida(c.db, { userId: c.uid, meu: snap.id, chaveIdem: 'livre-0001', agora: AGORA + 3 }).bot, 'liberada a reserva, o time não voltou a lutar');
  });

  s.teste('a reserva não sai sem bandeira, e o livro é append-only', () => {
    const db = abrirBanco(':memory:'); migrar(db);
    const uid = cadastrar(db, { username: 'sem', email: 'sem@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    const farm = gerar(db, { userId: uid, pack: PACK, dex: 25 });
    const e = recusa(() => reservarOferta(db, { userId: uid, pack: PACK, dono: { tipo: 'trade', id: 'of' }, ativos: { criaturas: [farm.id] }, expiraEm: AGORA + H, agora: AGORA }));
    igual(e?.reason_code, 'FEATURE_DISABLED', `reservou com a troca desligada: ${e?.message}`);
    const c = cena();
    reservar(c, 'of-1', { criaturas: [c.farm.id] });
    ok(/append-only/.test(recusa(() => c.db.exec(`DELETE FROM asset_holds_eventos`))?.message ?? ''), 'o livro das reservas aceitou apagar');
  });

  s.teste('duas conexões reservando a mesma criatura: uma só vence (Q8)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'reservas-'));
    try {
      const arq = join(dir, 'r.db');
      const c = cena(arq);
      const B = abrirBanco(arq); B.exec('PRAGMA busy_timeout = 0');
      const r = [c.db, B].map((db, i) => recusa(() => reservarOferta(db, { userId: c.uid, pack: PACK, dono: { tipo: 'trade', id: `of-${i}` }, ativos: { criaturas: [c.farm.id] }, expiraEm: AGORA + H, agora: AGORA, checkpoint: CHECKPOINT })));
      igual(`${r[0]}|${!!r[1]}`, 'null|true', 'as duas conexões reservaram a mesma criatura');
      igual(B.prepare(`SELECT COUNT(*) n FROM asset_holds WHERE criatura_id = ? AND estado = 'ativa'`).get(c.farm.id).n, 1, 'duas reservas ativas da mesma criatura');
      c.db.close(); B.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  return s;
}
