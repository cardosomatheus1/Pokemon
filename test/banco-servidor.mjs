/* Q1/Q3/Q6 · O BANCO — esquema, migrações e estado impossível (F1.2).
 *
 * TRÊS AFIRMAÇÕES:
 *
 *   1. As dez tabelas existem, com as constraints que tornam estado impossível
 *      IMPOSSÍVEL — não improvável. Saldo negativo, aposta órfã, ledger com
 *      valor zero, duas apostas do mesmo usuário na mesma rodada: cada um
 *      desses tem que ser recusado pelo BANCO, e não por quem escreve nele.
 *   2. As migrações sobem e DESCEM limpas, e a versão fica gravada.
 *   3. Nenhum caminho concatena valor de usuário em SQL.
 *
 * POR QUE A CONSTRAINT E NÃO A VALIDAÇÃO NA APLICAÇÃO. As duas vão existir; a
 * diferença é o que acontece quando alguém escreve um caminho novo e esquece a
 * validação. Com constraint, ele descobre no primeiro teste. Sem ela, descobre
 * quando um jogador tiver saldo negativo em produção — e aí o dado já está lá.
 *
 * `:memory:` em toda suíte: banco em disco não roda em paralelo consigo mesmo, e
 * o T3 acabou de comprar paralelo.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { abrirBanco, migrar, desmigrar, versaoDoBanco, MIGRACOES } from '../server/banco.mjs';

const novo = () => { const db = abrirBanco(':memory:'); migrar(db); return db; };

/* Roda e devolve o erro, ou `null` se passou. Um `try` por asserção deixaria o
   teste ilegível, e ler o teste é metade do que ele serve. */
const recusa = fn => { try { fn(); return null; } catch (e) { return e; } };

/* Um usuário mínimo, para as tabelas que dependem dele. */
function semearUsuario(db, id = 'u1') {
  db.prepare(`INSERT INTO users (id, username, email, password_hash, status, birth_date, created_at)
              VALUES (?, ?, ?, ?, 'ativo', '1990-01-01', 1000)`)
    .run(id, 'jogador_' + id, id + '@exemplo.test', 'hash');
  return id;
}
function semearRodada(db, id = 'r1', status = 'aberta') {
  db.prepare(`INSERT INTO rounds (id, status, round_seed_commit, engine_version,
              content_version, betting_opens_at, betting_locks_at, environment)
              VALUES (?, ?, 'commit', '0.9', 'kanto-v1', 1000, 1030, 'teste')`)
    .run(id, status);
  return id;
}

export function suite() {
  const s = criarSuite('banco-servidor');

  /* --- o esquema ---------------------------------------------------------- */

  s.teste('as dez tabelas do §5.13 e do cap. 28 existem', () => {
    const db = novo();
    const nomes = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all().map(r => r.name);
    const ESPERADAS = [
      'users', 'trainer_profiles', 'rounds', 'round_fighters', 'bets',
      'wallet_ledger', 'daily_challenges',
      /* Do capítulo 28 — criadas AGORA mesmo só sendo usadas no F1.8.
         Acrescentar coluna em tabela com dados de produção é o caro. */
      'player_limits', 'self_exclusions', 'responsible_play_events',
    ];
    for (const t of ESPERADAS)
      ok(nomes.includes(t), `tabela ${t} ausente. Existem: ${nomes.join(', ')}`);
  });

  s.teste('a versão do esquema fica gravada no próprio banco', () => {
    const db = novo();
    igual(versaoDoBanco(db), MIGRACOES.length,
      'a versão gravada não bate com o número de migrações aplicadas');
  });

  /* --- as migrações sobem E DESCEM --------------------------------------- */

  /* MIGRAÇÃO QUE NÃO DESCE NÃO É REVERSÍVEL, É UM CAMINHO SÓ.
     O valor de poder descer não é desfazer em produção — é poder TESTAR o
     caminho de volta antes de precisar dele às três da manhã. */
  s.teste('as migrações descem limpas, e o banco volta ao vazio', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    igual(versaoDoBanco(db), MIGRACOES.length, 'não subiu');
    desmigrar(db, 0);
    igual(versaoDoBanco(db), 0, 'a versão não voltou a zero');
    const sobrou = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
       AND name <> 'schema_versao'`).all().map(r => r.name);
    igual(sobrou.length, 0, `sobraram tabelas depois de descer: ${sobrou.join(', ')}`);
  });

  s.teste('subir duas vezes é inofensivo', () => {
    const db = abrirBanco(':memory:');
    migrar(db); migrar(db);
    igual(versaoDoBanco(db), MIGRACOES.length, 'a segunda subida mexeu na versão');
  });

  s.teste('descer e subir de novo reconstrói o mesmo esquema', () => {
    const db = abrirBanco(':memory:');
    migrar(db);
    const antes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all().map(r => r.sql).join('\n');
    desmigrar(db, 0); migrar(db);
    const depois = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all().map(r => r.sql).join('\n');
    igual(depois, antes, 'o esquema reconstruído não é idêntico ao original');
  });

  /* --- Q3: ESTADO IMPOSSÍVEL É IMPOSSÍVEL -------------------------------- */

  s.teste('o esquema NÃO permite saldo negativo', () => {
    const db = novo();
    const u = semearUsuario(db);
    const e = recusa(() => db.prepare(
      `INSERT INTO carteiras (user_id, bucket, saldo) VALUES (?, 'transferivel', -1)`).run(u));
    ok(e, 'o banco aceitou saldo negativo. A invariante do §4.6 vira promessa da ' +
          'aplicação, e aplicação esquece num caminho novo.');
  });

  s.teste('o esquema NÃO permite lançamento de valor zero no ledger', () => {
    const db = novo();
    const u = semearUsuario(db);
    const e = recusa(() => db.prepare(
      `INSERT INTO wallet_ledger (id, user_id, type, bucket, amount, created_at)
       VALUES ('l0', ?, 'aposta', 'transferivel', 0, 1)`).run(u));
    ok(e, 'lançamento de zero aceito. Ledger append-only com linha nula é ruído ' +
          'que atrapalha exatamente quem for auditar.');
  });

  s.teste('o esquema NÃO permite aposta órfã de rodada', () => {
    const db = novo();
    const u = semearUsuario(db);
    const e = recusa(() => db.prepare(
      `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd, status, created_at)
       VALUES ('b0', ?, 'rodada-que-nao-existe', 0, 25, 50, 2.0, 'aberta', 1)`).run(u));
    ok(e, 'aposta em rodada inexistente aceita — a chave estrangeira não está ligada');
  });

  s.teste('o esquema NÃO permite duas apostas do mesmo usuário na mesma rodada', () => {
    const db = novo();
    const u = semearUsuario(db), r = semearRodada(db);
    const ins = db.prepare(
      `INSERT INTO bets (id, user_id, round_id, slot_apostado, species_id, stake, odd, status, created_at)
       VALUES (?, ?, ?, 0, 25, 50, 2.0, 'aberta', 1)`);
    ins.run('b1', u, r);
    const e = recusa(() => ins.run('b2', u, r));
    ok(e, 'duas apostas do mesmo usuário na mesma rodada. O §5.6 diz UMA posição ' +
          'por usuário, e "troca de lutador" é UPDATE, não INSERT.');
  });

  s.teste('o esquema NÃO permite stake nem odd não positivos', () => {
    const db = novo();
    const u = semearUsuario(db), r = semearRodada(db);
    for (const [campo, sql] of [
      ['stake', `INSERT INTO bets (id,user_id,round_id,slot_apostado,species_id,stake,odd,status,created_at)
                 VALUES ('bx',?,?,0,25,0,2.0,'aberta',1)`],
      ['odd',   `INSERT INTO bets (id,user_id,round_id,slot_apostado,species_id,stake,odd,status,created_at)
                 VALUES ('by',?,?,0,25,50,0,'aberta',1)`],
    ]) ok(recusa(() => db.prepare(sql).run(u, r)), `${campo} não positivo foi aceito`);
  });

  s.teste('o esquema NÃO permite status fora do conjunto declarado', () => {
    const db = novo();
    const u = semearUsuario(db), r = semearRodada(db);
    const e = recusa(() => db.prepare(
      `INSERT INTO bets (id,user_id,round_id,slot_apostado,species_id,stake,odd,status,created_at)
       VALUES ('bz',?,?,0,25,50,2.0,'estado-inventado',1)`).run(u, r));
    ok(e, 'status arbitrário aceito em `bets`. Enum sem CHECK é comentário.');
  });

  /* A DATA DE NASCIMENTO É OBRIGATÓRIA JÁ NO ESQUEMA (§28.2). Ela é o que
     sustenta o bloqueio por idade do F1.3, e coluna anulável é como um usuário
     sem idade declarada entra pela porta de trás de um caminho novo. */
  s.teste('o esquema NÃO permite usuário sem data de nascimento', () => {
    const db = novo();
    const e = recusa(() => db.prepare(
      `INSERT INTO users (id, username, email, password_hash, status, created_at)
       VALUES ('u9','x','x@y.z','h','ativo',1)`).run());
    ok(e, 'usuário sem data de nascimento aceito — o §28.2 exige que ela seja obrigatória');
  });

  s.teste('o ledger é append-only: UPDATE e DELETE são recusados', () => {
    const db = novo();
    const u = semearUsuario(db);
    db.prepare(`INSERT INTO wallet_ledger (id,user_id,type,bucket,amount,created_at)
                VALUES ('l1',?,'deposito','transferivel',100,1)`).run(u);
    ok(recusa(() => db.prepare(`UPDATE wallet_ledger SET amount = 999 WHERE id='l1'`).run()),
      'o ledger aceitou UPDATE. Append-only que se pode editar é um log comum ' +
      'com um nome melhor.');
    ok(recusa(() => db.prepare(`DELETE FROM wallet_ledger WHERE id='l1'`).run()),
      'o ledger aceitou DELETE');
  });

  /* --- Q6: SQL ------------------------------------------------------------ */

  /* NENHUM CAMINHO CONCATENA VALOR DE USUÁRIO EM SQL.
     Varredura estática, e é a certa: o teste dinâmico provaria que os caminhos
     que EU escrevi estão seguros; este reprova o caminho que alguém escrever
     amanhã. */
  s.teste('nenhum módulo do servidor monta SQL por concatenação', () => {
    const SRV = new URL('../server/', import.meta.url);
    for (const f of readdirSync(SRV).filter(x => x.endsWith('.mjs'))) {
      const txt = readFileSync(new URL(f, SRV), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ');
      /* SQL seguido de interpolação ou de `+`. O padrão pega o que importa:
         template literal com `${` no meio de um comando, e concatenação. */
      const suspeitas = [...txt.matchAll(
        /(SELECT|INSERT|UPDATE|DELETE|WHERE|VALUES)[^`'"\n]{0,80}(\$\{|['"]\s*\+)/gi)]
        .map(m => m[0].replace(/\s+/g, ' ').slice(0, 70));
      ok(suspeitas.length === 0,
        `server/${f} parece montar SQL por concatenação:\n      ` +
        suspeitas.join('\n      ') +
        `\n      Use consulta parametrizada. Nome de tabela vindo de constante do ` +
        `próprio arquivo é aceitável — mas então extraia para uma constante e o ` +
        `padrão para de casar.`);
    }
  });

  return s;
}
