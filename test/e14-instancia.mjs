/* Q1/Q3 · E14 · A INSTÂNCIA JÁ EXISTENTE EVOLUI (ST-14.2)
 *
 * A criatura passa a ter identidade que sobrevive a tudo o que a E14 vai fazer
 * com ela (evoluir, trocar, vender, soltar): shiny da instância, treinador
 * original, espécie de origem, o encontro que a gerou, e um histórico
 * append-only. Sem coleção paralela: `criaturas.id` continua sendo o id.
 *
 * O histórico nasce por GATILHO (nasceu, evoluiu, baixa) — todo caminho de
 * escrita, sem cada rota lembrar. Soltar deixa de apagar a identidade: a linha
 * vai para `criaturas_baixadas`, e o resto do jogo continua lendo `criaturas`.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar, doJogador } from '../server/criaturas.mjs';
import { soltarNaConta } from '../server/colecao.mjs';
import { creditarBolsa, lancarPendente } from '../server/idle.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  const uid = cadastrar(db, { username: 'ins', email: 'ins@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid };
};
const historico = (db, id) => db.prepare(`SELECT evento, user_id, dex, detalhe FROM criaturas_historico WHERE criatura_id = ? ORDER BY id`).all(id);
const linha = (db, id) => db.prepare(`SELECT * FROM criaturas WHERE id = ?`).get(id);

export async function suite() {
  const s = criarSuite('e14-instancia');

  s.teste('a criatura nasce com treinador original, espécie de origem, shiny falso e o evento no histórico', () => {
    const { db, uid } = novo();
    const c = gerar(db, { userId: uid, pack: PACK, dex: 4 });
    const l = linha(db, c.id);
    igual(`${l.ot_user_id === uid}|${l.especie_original}|${l.is_shiny}`, 'true|4|0', 'a identidade da captura não foi gravada');
    igual(JSON.stringify(historico(db, c.id)), JSON.stringify([{ evento: 'nasceu', user_id: uid, dex: 4, detalhe: 'captura' }]), 'o nascimento não entrou no histórico');
    igual(`${c.shiny}|${c.ot === uid}|${c.especieOriginal}`, 'false|true|4', 'a hidratação não traz a identidade nova');
  });

  s.teste('evoluir muda a espécie e só ela: o id, o shiny, os ocultos e o treinador original ficam', () => {
    const { db, uid } = novo();
    const c = gerar(db, { userId: uid, pack: PACK, dex: 4 });
    db.prepare(`UPDATE criaturas SET is_shiny = 1 WHERE id = ?`).run(c.id);   // o shiny que a ST-14.1 vai sortear
    const antes = linha(db, c.id);
    db.prepare(`UPDATE criaturas SET dex = 5 WHERE id = ?`).run(c.id);
    const depois = linha(db, c.id);
    igual(`${depois.dex}|${depois.is_shiny}|${depois.ot_user_id === antes.ot_user_id}|${depois.especie_original}|${depois.o_hp === antes.o_hp && depois.semente === antes.semente}`,
      '5|1|true|4|true', 'a evolução rerrolou o shiny, os ocultos ou a origem');
    const h = historico(db, c.id);
    igual(`${h.length}|${h[1]?.evento}|${h[1]?.dex}|${h[1]?.detalhe}`, '2|evolucao|5|4', 'a evolução não entrou no histórico com de/para');
    igual(doJogador(db, uid, PACK).find(x => x.id === c.id)?.shiny, true, 'a instância shiny é lida como normal');
  });

  s.teste('soltar arquiva a identidade, o doce sai uma vez, e o histórico diz a baixa', () => {
    const { db, uid } = novo();
    gerar(db, { userId: uid, pack: PACK, dex: 1, origem: 'inicial' });
    const c = gerar(db, { userId: uid, pack: PACK, dex: 16 });
    db.prepare(`UPDATE criaturas SET na_caixa = 1 WHERE id = ?`).run(c.id);   // só se solta quem está na caixa
    const r = soltarNaConta(db, { userId: uid, pack: PACK, id: c.id, agora: AGORA });
    const arq = db.prepare(`SELECT * FROM criaturas_baixadas WHERE id = ?`).get(c.id);
    igual(`${!!arq}|${arq?.user_id === uid}|${arq?.dex}|${arq?.ot_user_id === uid}|${!!arq?.semente}`, 'true|true|16|true|true', 'a criatura solta sumiu sem deixar a identidade');
    igual(historico(db, c.id).map(h => h.evento).join(','), 'nasceu,baixa', 'a baixa não entrou no histórico');
    let erro = null;
    try { soltarNaConta(db, { userId: uid, pack: PACK, id: c.id, agora: AGORA }); } catch (e) { erro = e.message; }
    const doces = db.prepare(`SELECT COUNT(*) n FROM candy_ledger WHERE user_id = ? AND motivo = 'soltar'`).get(uid).n;
    ok(erro && doces === (r.doce > 0 ? 1 : 0), `soltar duas vezes pagou o doce duas vezes, ou não recusou: ${erro} ${doces}`);
  });

  s.teste('o histórico é append-only, e um encontro não gera duas criaturas', () => {
    const { db, uid } = novo();
    const c = gerar(db, { userId: uid, pack: PACK, dex: 7 });
    for (const sql of [`UPDATE criaturas_historico SET dex = 1`, `DELETE FROM criaturas_historico`]) {
      let erro = null;
      try { db.exec(sql); } catch (e) { erro = e.message; }
      ok(/append-only/.test(erro ?? ''), `o histórico aceitou: ${sql}`);
    }
    db.prepare(`UPDATE criaturas SET encontro_chave = 'enc:1' WHERE id = ?`).run(c.id);
    const d = gerar(db, { userId: uid, pack: PACK, dex: 7 });
    let dup = null;
    try { db.prepare(`UPDATE criaturas SET encontro_chave = 'enc:1' WHERE id = ?`).run(d.id); } catch (e) { dup = e.message; }
    ok(/UNIQUE/.test(dup ?? ''), 'o mesmo encontro ficou em duas criaturas');
  });

  s.teste('o lance grava o encontro que gerou a criatura', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 60);
    /* O lance é sorteado: um encontro comum por vez até um capturar. */
    let r = null;
    for (let i = 0; i < 60 && !r?.criatura; i++) {
      db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em) VALUES (?, ?, 'avanco', 16, 'comum', 'floresta', ?)`).run(`x-1:${i}`, uid, AGORA);
      r = lancarPendente(db, { userId: uid, pack: PACK, chave: `x-1:${i}`, bola: 'poke', agora: AGORA });
    }
    ok(r?.criatura, 'nenhum lance capturou em 60 tentativas');
    igual(linha(db, r.criatura.id).encontro_chave, r.chave, 'a criatura capturada não guarda o encontro que a gerou');
  });

  s.teste('a migração não inventa história: a criatura de antes vira "migração", sem treinador nem espécie de origem', () => {
    const db = abrirBanco(':memory:'); migrar(db, MIGRACOES.length - 1);
    const uid = cadastrar(db, { username: 'v', email: 'v@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    /* A criatura como o banco de antes a gravava (o `gerar` de hoje já escreve as colunas novas). */
    const c = { id: 'velha-1' };
    db.prepare(`INSERT INTO criaturas (id, user_id, pack_id, dex, o_hp, o_atq, o_def, o_spa, o_spd, o_vel, natureza, semente, origem, criada_em)
                VALUES (?, ?, ?, 25, 1, 2, 3, 4, 5, 6, 'Firme', 'abc', 'captura', ?)`).run(c.id, uid, PACK.id, AGORA);
    migrar(db);
    const l = linha(db, c.id);
    igual(`${l.ot_user_id}|${l.especie_original}|${l.is_shiny}`, 'null|null|0', 'a migração inventou treinador original ou espécie de origem');
    igual(historico(db, c.id).map(h => `${h.evento}:${h.user_id === uid}`).join(','), 'migracao:true', 'a migração não registrou a criatura como "migração"');
    /* Migrar de novo não duplica; e a descida devolve a tabela de antes. */
    migrar(db);
    igual(historico(db, c.id).length, 1, 'migrar de novo duplicou o histórico');
    db.exec('BEGIN'); MIGRACOES.find(m => m.nome === 'instancia-st14.2').desce(db);
    const cols = db.prepare(`PRAGMA table_info(criaturas)`).all().map(x => x.name);
    db.exec('ROLLBACK');
    ok(!cols.includes('is_shiny') && !cols.includes('ot_user_id'), 'a descida da migração deixou colunas da instância');
  });

  return s;
}
