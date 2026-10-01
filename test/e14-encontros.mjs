/* Q1/Q3/Q6 · E14 · O SHINY DO ENCONTRO E O RECIBO DO LANCE (ST-14.1)
 *
 * O shiny nasce quando o servidor GRAVA o encontro — raiz própria do CSPRNG,
 * nunca a semente da colheita, que vai para o jogador — e o lance só o leva
 * para a criatura. O lance grava o RECIBO na mesma transação que debita a bola
 * e cria a criatura: o retry de quem perdeu a resposta recebe o mesmo lance,
 * e nunca uma segunda tentativa.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import PACK from '../content/escolhido.mjs';
import { abrirBanco, migrar, MIGRACOES } from '../server/banco.mjs';
import { cadastrar } from '../server/auth.mjs';
import { gerar } from '../server/criaturas.mjs';
import { creditarBolsa, quantosNaBolsa, lancarPendente, pendentesDe, iniciar, colher } from '../server/idle.mjs';
import { comecarRun, recuarNaRun, colherRun } from '../server/run.mjs';
import { STAMINA_MAX } from '../engine/expedicao.mjs';
import { SHINY_PADRAO, regraDoShiny, sortearShiny } from '../engine/shiny.mjs';
import { PERFIS } from '../engine/expedicao.mjs';

const AGORA = Date.UTC(2026, 0, 15, 12);
const raizDe = k => (0x5eed000 + k).toString(16).padStart(32, '0');
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };
const novo = () => {
  const db = abrirBanco(':memory:'); migrar(db);
  const conta = n => cadastrar(db, { username: n, email: `${n}@x.test`, senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
  return { db, uid: conta('enc1'), outro: conta('enc2') };
};
const pendente = (db, uid, chave, { shiny = false, raridade = 'comum', dex = 16, origem = 'avanco' } = {}) =>
  db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em, is_shiny, shiny_versao)
              VALUES (?, ?, ?, ?, ?, 'floresta', ?, ?, 'teste')`).run(chave, uid, origem, dex, raridade, AGORA, shiny ? 1 : 0);
const linha = (db, chave) => db.prepare(`SELECT * FROM encontros_pendentes WHERE chave = ?`).get(chave);

export async function suite() {
  const s = criarSuite('e14-encontros');

  s.teste('motor: o sorteio no zero, no um e no limiar; a regra vem do pack, com versão', () => {
    const r = { taxa: 0.25, versao: 'v' };
    igual(`${sortearShiny(() => 0, r).shiny}|${sortearShiny(() => 0.2499999, r).shiny}|${sortearShiny(() => 0.25, r).shiny}|${sortearShiny(() => 0.9999, r).shiny}`,
      'true|true|false|false', 'o limiar do sorteio');
    igual(sortearShiny(() => 0, r).versao, 'v', 'o sorteio não diz sob qual regra');
    igual(regraDoShiny({}), SHINY_PADRAO, 'sem regra no pack, a baseline');
    igual(regraDoShiny({ shiny: { taxa: 1, versao: 'x' } }).taxa, 1, 'o pack não traz a própria regra');
    for (const ruim of [{ taxa: 0, versao: 'x' }, { taxa: 2, versao: 'x' }, { taxa: 0.1 }])
      ok(recusa(() => regraDoShiny({ id: 'p', shiny: ruim })), `regra inválida aceita: ${JSON.stringify(ruim)}`);
    igual(SHINY_PADRAO.taxa, 1 / 2000, 'a baseline do piloto (spec §13: 1/2.000, não aprovada)');
  });

  s.teste('a colheita grava o shiny do encontro, e a releitura da conta mostra — sem rerrolar', () => {
    const { db, uid } = novo();
    const pack = { ...PACK, shiny: { taxa: 1, versao: 'teste-todos' } };
    const ini = gerar(db, { userId: uid, pack, dex: PACK.iniciais[0], origem: 'inicial' });
    const x = iniciar(db, { userId: uid, pack, bioma: 'floresta', perfil: 'vigilia', equipe: [ini.id], agora: AGORA });
    const col = colher(db, { id: x.id, pack, agora: AGORA + PERFIS.vigilia.minutos * 60_000, raiz: raizDe(1) });
    ok(col.encontros.length > 0, 'a vigília não rendeu encontro — o teste não mede nada');
    ok(col.encontros.every(e => !('shiny' in e)), 'a resposta da colheita mudou de forma — ela é a conta do aparelho');
    const p1 = pendentesDe(db, uid), p2 = pendentesDe(db, uid);
    igual(`${p1.every(p => p.shiny)}|${JSON.stringify(p1) === JSON.stringify(p2)}`, 'true|true', 'a leitura rerrolou ou não mostra o shiny');
    igual([...new Set(db.prepare(`SELECT shiny_versao v FROM encontros_pendentes WHERE user_id = ?`).all(uid).map(l => l.v))].join(','), 'teste-todos', 'a versão da regra não foi gravada');
    /* E com a regra que nunca sorteia, nenhum: o shiny é do sorteio, não da rota. */
    const { db: db2, uid: u2 } = novo();
    const nunca = { ...PACK, shiny: { taxa: Number.MIN_VALUE, versao: 'nunca' } };
    const i2 = gerar(db2, { userId: u2, pack: nunca, dex: PACK.iniciais[0], origem: 'inicial' });
    const x2 = iniciar(db2, { userId: u2, pack: nunca, bioma: 'floresta', perfil: 'vigilia', equipe: [i2.id], agora: AGORA });
    colher(db2, { id: x2.id, pack: nunca, agora: AGORA + PERFIS.vigilia.minutos * 60_000, raiz: raizDe(1) });
    igual(pendentesDe(db2, u2).some(p => p.shiny), false, 'a colheita fez shiny sem o sorteio');
  });

  s.teste('a semente publicada da colheita não decide o shiny', () => {
    /* A mesma colheita (mesma raiz, mesma expedição) duas vezes, com taxa de
       meio a meio: se o shiny saísse da raiz publicada, os dois quadros seriam
       iguais. */
    const quadro = () => {
      const { db, uid } = novo();
      const pack = { ...PACK, shiny: { taxa: 0.5, versao: 'meio' } };
      const ini = gerar(db, { userId: uid, pack, dex: PACK.iniciais[0], origem: 'inicial' });
      const x = iniciar(db, { userId: uid, pack, bioma: 'floresta', perfil: 'vigilia', equipe: [ini.id], agora: AGORA });
      colher(db, { id: x.id, pack, agora: AGORA + PERFIS.vigilia.minutos * 60_000, raiz: raizDe(7) });
      return pendentesDe(db, uid).map(e => e.shiny ? 1 : 0).join('');
    };
    const quadros = new Set(Array.from({ length: 6 }, quadro));
    ok(quadros.size > 1, `o shiny se repetiu com a raiz da colheita: ${[...quadros].join(' ')}`);
  });

  s.teste('o shiny vai para a criatura, com a MESMA chance do normal', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 20, { fonte: 'colheita:x' });
    const lado = [];
    for (const shiny of [false, true]) {
      const chave = `cap:${shiny}`;
      pendente(db, uid, chave, { shiny });
      lado.push(lancarPendente(db, { userId: uid, pack: PACK, chave, bola: 'poke', agora: AGORA, raiz: raizDe(3) }));
    }
    igual(`${lado[0].chance}|${lado[0].capturou}`, `${lado[1].chance}|${lado[1].capturou}`, 'o shiny mudou a chance ou o sorteio do lance');
    let r = null;
    for (let i = 0; i < 40 && !r?.criatura; i++) {
      pendente(db, uid, `cs:${i}`, { shiny: true });
      r = lancarPendente(db, { userId: uid, pack: PACK, chave: `cs:${i}`, bola: 'poke', agora: AGORA, raiz: raizDe(100 + i) });
    }
    ok(r?.criatura, 'nenhum lance capturou');
    igual(`${r.shiny}|${r.criatura.shiny}|${db.prepare(`SELECT is_shiny FROM criaturas WHERE id = ?`).get(r.criatura.id).is_shiny}`, 'true|true|1', 'a criatura não herdou o shiny do encontro');
  });

  s.teste('o retry devolve o MESMO recibo: captura, falha, e com outra bola', () => {
    const { db, uid } = novo();
    creditarBolsa(db, uid, 'poke', 40, { fonte: 'colheita:x' });
    creditarBolsa(db, uid, 'ultra', 5, { fonte: 'colheita:x' });
    const visto = { captura: null, falha: null };
    for (let i = 0; i < 40 && !(visto.captura && visto.falha); i++) {
      pendente(db, uid, `r:${i}`, { raridade: 'incomum' });
      const r = lancarPendente(db, { userId: uid, pack: PACK, chave: `r:${i}`, bola: 'poke', agora: AGORA, raiz: raizDe(200 + i) });
      visto[r.capturou ? 'captura' : 'falha'] ??= r;
    }
    ok(visto.captura && visto.falha, 'não houve captura e falha para comparar');
    for (const [tipo, r] of Object.entries(visto)) {
      const poke = quantosNaBolsa(db, uid, 'poke'), ultra = quantosNaBolsa(db, uid, 'ultra');
      const de_novo = lancarPendente(db, { userId: uid, pack: PACK, chave: r.chave, bola: 'poke', agora: AGORA + 5000 });
      const outra = lancarPendente(db, { userId: uid, pack: PACK, chave: r.chave, bola: 'ultra', agora: AGORA + 6000 });
      const { repetida: _a, ...semMarca1 } = de_novo, { repetida: _b, ...semMarca2 } = outra;
      igual(JSON.stringify(semMarca1), JSON.stringify(r), `o retry da ${tipo} não devolveu o mesmo recibo`);
      igual(JSON.stringify(semMarca2), JSON.stringify(r), `trocar a bola deu uma segunda tentativa à ${tipo}`);
      igual(`${de_novo.repetida}|${quantosNaBolsa(db, uid, 'poke')}|${quantosNaBolsa(db, uid, 'ultra')}`, `true|${poke}|${ultra}`, `o retry da ${tipo} gastou bola`);
      igual(linha(db, r.chave).resolucao, tipo, 'a resolução gravada');
    }
    igual(db.prepare(`SELECT COUNT(*) n FROM criaturas WHERE encontro_chave = ?`).get(visto.captura.chave).n, 1, 'o retry criou outra criatura');
  });

  s.teste('sem bola nada se perde; o encontro de outro não responde; o descarte da run fica escrito', () => {
    const { db, uid, outro } = novo();
    pendente(db, uid, 'sem');
    const e = recusa(() => lancarPendente(db, { userId: uid, pack: PACK, chave: 'sem', bola: 'poke', agora: AGORA }));
    const l = linha(db, 'sem');
    ok(e && l.resolvido_em == null && l.resolucao == null && l.recibo_json == null, `o lance sem bola consumiu o encontro: ${e?.message}`);
    creditarBolsa(db, uid, 'poke', 1, { fonte: 'colheita:x' });
    const meu = lancarPendente(db, { userId: uid, pack: PACK, chave: 'sem', bola: 'poke', agora: AGORA });
    creditarBolsa(db, outro, 'poke', 1, { fonte: 'colheita:x' });
    const dele = recusa(() => lancarPendente(db, { userId: outro, pack: PACK, chave: 'sem', bola: 'poke', agora: AGORA }));
    ok(dele && !String(dele.message).includes(String(meu.capturou)) && quantosNaBolsa(db, outro, 'poke') === 1, `o encontro de outro respondeu: ${dele?.message}`);

    const ini = gerar(db, { userId: uid, pack: PACK, dex: PACK.iniciais[0], origem: 'inicial' });
    db.prepare(`UPDATE criaturas SET stamina = 100, stamina_em = ? WHERE id = ?`).run(AGORA, ini.id);
    pendente(db, uid, 'velho');
    comecarRun(db, { userId: uid, pack: PACK, bioma: 'floresta', equipe: [ini.id], agora: AGORA, raiz: raizDe(9) });
    igual(`${!!linha(db, 'velho').resolvido_em}|${linha(db, 'velho').resolucao}`, 'true|descarte', 'a run nova encerrou o quadro sem dizer que foi descarte');
  });

  s.teste('a run também grava o shiny dos encontros dela', () => {
    const { db, uid } = novo();
    const pack = { ...PACK, shiny: { taxa: 1, versao: 'teste-run' } };
    const ini = gerar(db, { userId: uid, pack, dex: PACK.iniciais[0], origem: 'inicial' });
    db.prepare(`UPDATE criaturas SET stamina = ?, stamina_em = ? WHERE id = ?`).run(STAMINA_MAX, AGORA - 3600_000, ini.id);
    comecarRun(db, { userId: uid, pack, bioma: 'floresta', equipe: [ini.id], agora: AGORA, raiz: raizDe(11) });
    const fim = AGORA + 90 * 60_000;
    try { recuarNaRun(db, { userId: uid, pack, agora: fim }); } catch {}
    colherRun(db, { userId: uid, pack, agora: fim + 1000, raiz: raizDe(12) });
    const p = db.prepare(`SELECT is_shiny, shiny_versao FROM encontros_pendentes WHERE user_id = ? AND origem = 'avanco'`).all(uid);
    ok(p.length > 0, 'a run não rendeu encontro — o teste não mede nada');
    igual(p.every(l => l.is_shiny === 1 && l.shiny_versao === 'teste-run'), true, 'a run gravou o encontro sem o shiny sorteado');
  });

  s.teste('a migração não inventa shiny nem resolução; a descida devolve a tabela', () => {
    const db = abrirBanco(':memory:'); migrar(db, MIGRACOES.findIndex(m => m.nome === 'encontros-st14.1'));
    const uid = cadastrar(db, { username: 'm', email: 'm@x.test', senha: 'senha-longa-o-bastante-1', nascimento: '1990-01-01', agora: AGORA }).id;
    db.prepare(`INSERT INTO encontros_pendentes (chave, user_id, origem, dex, raridade, bioma, em, resolvido_em) VALUES ('a', ?, 'avanco', 16, 'comum', 'floresta', ?, ?), ('b', ?, 'avanco', 19, 'comum', 'floresta', ?, NULL)`)
      .run(uid, AGORA, AGORA + 1, uid, AGORA);
    migrar(db);
    igual(db.prepare(`SELECT chave, is_shiny, resolucao, recibo_json FROM encontros_pendentes ORDER BY chave`).all().map(l => `${l.chave}:${l.is_shiny}:${l.resolucao}:${l.recibo_json}`).join(','),
      'a:0:null:null,b:0:null:null', 'a migração inventou shiny ou resolução');
    let erro = null;
    try { db.prepare(`UPDATE encontros_pendentes SET resolucao = 'inventada' WHERE chave = 'a'`).run(); } catch (e) { erro = e.message; }
    ok(/CHECK/.test(erro ?? ''), 'uma resolução inventada entrou');
    db.exec('BEGIN'); MIGRACOES.find(m => m.nome === 'encontros-st14.1').desce(db);
    const cols = db.prepare(`PRAGMA table_info(encontros_pendentes)`).all().map(x => x.name);
    db.exec('ROLLBACK');
    ok(!cols.includes('is_shiny') && !cols.includes('recibo_json'), 'a descida deixou colunas');
  });

  return s;
}
