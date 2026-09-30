/* Q1/Q3 · E14 · O INVENTÁRIO POR LOTE E A PROVENIÊNCIA DOS DERIVADOS (ST-14.0C)
 *
 * A `bolsa` somava quantidades sem origem: não havia como dizer se a bola veio
 * do farm ou de um save antigo. Agora cada crédito é um LOTE com a classe e a
 * fonte, a `bolsa` é a projeção (atualizada na mesma transação), o débito
 * consome o lote mais antigo primeiro e diz de que classe saiu — e o derivado
 * herda a classe mais restrita do que o gerou (bola → captura, pedra →
 * evolução, moeda → item comprado).
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { creditarBolsa, debitarBolsa, quantosNaBolsa, lancarPendente } from '../server/idle.mjs';
import { lotesDe, conferirInventario } from '../server/inventario.mjs';
import { lojaDoIdleNaConta } from '../server/loja-idle.mjs';
import { evoluirNaConta } from '../server/colecao.mjs';
import { gerar } from '../server/criaturas.mjs';
import { CLASSES, maisRestrita, negociavelPelaOrigem } from '../engine/proveniencia.mjs';
import { aVenda } from '../engine/loja.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const MOEDA = PACK.moedaPve?.id ?? 'pokecoin';
const novo = (ate) => {
  const db = abrirBanco(':memory:'); migrar(db, ate);
  const uid = cadastrar(db, { username: 'inv', email: 'inv@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid };
};

export async function suite() {
  const s = criarSuite('e14-inventario');

  s.teste('motor: as classes, a mais restrita vence, e só o que foi ganho no jogo negocia', () => {
    igual(CLASSES.join(','), 'verified_earned,p2p_verified,promotional_bound,admin_review,legacy_unverified,test_only', 'as classes da spec E14 §4.3');
    igual(maisRestrita(['verified_earned', 'legacy_unverified', 'p2p_verified']), 'legacy_unverified', 'a mistura não ficou com a mais restrita');
    igual(maisRestrita([]), 'verified_earned', 'sem insumo, o derivado não nasceu do jogo');
    igual(CLASSES.filter(negociavelPelaOrigem).join(','), 'verified_earned,p2p_verified', 'o que negocia pela origem');
  });

  s.teste('o crédito é um lote com classe e fonte, e a bolsa é a soma dos lotes', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 3, { fonte: 'colheita:x1' });
    creditarBolsa(db, uid, 'poke', 2, { classe: 'promotional_bound', fonte: 'teste' });
    const l = lotesDe(db, uid, 'poke');
    igual(l.map(x => `${x.quantidade}:${x.classe}:${x.fonte}`).join(','), '3:verified_earned:colheita:x1,2:promotional_bound:teste', 'os lotes');
    igual(`${quantosNaBolsa(db, uid, 'poke')}|${conferirInventario(db, uid).length}`, '5|0', 'a bolsa não é a soma dos lotes');
    let erro = null;
    try { creditarBolsa(db, uid, 'poke', 1, { classe: 'inventada', fonte: 'x' }); } catch (e) { erro = e.message; }
    ok(/classe de origem desconhecida/.test(erro ?? ''), `uma classe inventada chegou ao banco: ${erro}`);
  });

  s.teste('o débito consome o lote mais antigo primeiro, diz as classes, e recusa sem mexer', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 2, { classe: 'legacy_unverified', fonte: 'migracao' });
    creditarBolsa(db, uid, 'poke', 3, { fonte: 'colheita:x1' });
    const r = debitarBolsa(db, uid, 'poke', 3);
    igual(`${!!r}|${[...r.classes].sort().join(',')}|${lotesDe(db, uid, 'poke').map(x => x.quantidade).join(',')}`, 'true|legacy_unverified,verified_earned|0,2', 'o FIFO ou as classes consumidas');
    igual(`${debitarBolsa(db, uid, 'poke', 9)}|${quantosNaBolsa(db, uid, 'poke')}`, 'false|2', 'o débito maior que o saldo mexeu na bolsa');
    /* O jogador escolhe a classe: só do lote daquela classe — aqui o MAIS NOVO,
       para a escolha não coincidir com a ordem de chegada. */
    creditarBolsa(db, uid, 'poke', 1, { classe: 'legacy_unverified', fonte: 'migracao' });
    const so = debitarBolsa(db, uid, 'poke', 1, { classe: 'legacy_unverified' });
    igual(`${[...so.classes].join(',')}|${lotesDe(db, uid, 'poke').filter(x => x.quantidade > 0).map(x => `${x.classe}:${x.quantidade}`).join(',')}`, 'legacy_unverified|verified_earned:2', 'a escolha da classe não foi respeitada');
    igual(conferirInventario(db, uid).length, 0, 'a bolsa divergiu dos lotes');
  });

  s.teste('a captura herda a classe da bola; a compra herda a classe da moeda', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 60, { classe: 'legacy_unverified', fonte: 'migracao' });
    let r = null;
    for (let i = 0; i < 60 && !r?.criatura; i++) {
      db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em) VALUES (?, ?, 'avanco', 16, 'comum', 'floresta', ?)`).run(`k:${i}`, uid, AGORA);
      r = lancarPendente(db, { userId: uid, pack: PACK, chave: `k:${i}`, bola: 'poke', agora: AGORA });
    }
    ok(r?.criatura, 'nenhum lance capturou');
    igual(db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ?`).get(r.criatura.id).proveniencia, 'legacy_unverified', 'a bola de save antigo gerou uma criatura "ganha no jogo"');

    const item = aVenda(PACK)[0].id;
    creditarBolsa(db, uid, MOEDA, 1000, { classe: 'promotional_bound', fonte: 'teste' });
    lojaDoIdleNaConta(db, { userId: uid, pack: PACK, acao: 'comprar', id: item, quantos: 1 });
    igual(lotesDe(db, uid, item).map(x => x.classe).join(','), 'promotional_bound', 'o item comprado com moeda promocional nasceu livre');
  });

  s.teste('a pedra presa prende a forma nova; a pedra livre não solta a criatura presa', () => {
    const { db, uid } = novo();
    const c = gerar(db, { userId: uid, pack: PACK, dex: 25 });
    creditarBolsa(db, uid, 'trovao', 1, { classe: 'promotional_bound', fonte: 'teste' });
    evoluirNaConta(db, { userId: uid, pack: PACK, id: c.id });
    igual(db.prepare(`SELECT dex, proveniencia FROM criaturas WHERE id = ?`).get(c.id).proveniencia, 'promotional_bound', 'a evolução com pedra promocional deixou a criatura livre');
    const d = gerar(db, { userId: uid, pack: PACK, dex: 25, proveniencia: 'legacy_unverified' });
    creditarBolsa(db, uid, 'trovao', 1, { fonte: 'colheita:x' });
    evoluirNaConta(db, { userId: uid, pack: PACK, id: d.id });
    igual(db.prepare(`SELECT proveniencia FROM criaturas WHERE id = ?`).get(d.id).proveniencia, 'legacy_unverified', 'a pedra livre lavou a origem da criatura presa');
  });

  s.teste('a migração: o que já estava na bolsa vira lote "sem prova", e a soma fecha', () => {
    const { db, uid } = novo(MIGRACOES.findIndex(m => m.nome === 'inventario-st14.0c'));
    db.prepare(`INSERT INTO bolsa (user_id, item_id, quantidade) VALUES (?, 'poke', 7), (?, 'great', 2)`).run(uid, uid);
    migrar(db);
    igual(lotesDe(db, uid).map(x => `${x.item_id}:${x.quantidade}:${x.classe}`).sort().join(','), 'great:2:legacy_unverified,poke:7:legacy_unverified', 'o estoque antigo não virou lote sem prova');
    igual(conferirInventario(db, uid).length, 0, 'a soma dos lotes não fecha com a bolsa depois da migração');
  });

  s.teste('todo crédito do servidor diz de onde veio', () => {
    const faltando = [];
    for (const f of readdirSync(new URL('../server/', import.meta.url)).filter(x => x.endsWith('.mjs') && x !== 'inventario.mjs')) {
      const t = readFileSync(new URL(`../server/${f}`, import.meta.url), 'utf8');
      for (const m of t.matchAll(/creditarBolsa\(([^;]*?)\);/g)) if (!/\bfonte\b/.test(m[1])) faltando.push(`${f}: creditarBolsa(${m[1].slice(0, 50)}…)`);
    }
    igual(faltando.join(' | '), '', 'crédito sem fonte — estoque sem evento');
  });

  return s;
}
