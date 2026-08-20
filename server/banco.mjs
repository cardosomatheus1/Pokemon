/* O BANCO — esquema, migrações e conexão (F1.2).
 *
 * Fronteira: abre o banco, aplica migrações, e nada mais. Não conhece rodada,
 * não conhece aposta, não serve HTTP.
 *
 * `node:sqlite`, embutido no Node desde a 22.5. Zero dependências vale para o
 * backend também, e a alternativa seria trazer um driver com dezenas de pacotes
 * transitivos para um esquema de dez tabelas.
 *
 * ── A REGRA QUE GOVERNA CADA CONSTRAINT DESTE ARQUIVO ──────────────────────
 *
 * Estado impossível tem que ser IMPOSSÍVEL, não improvável.
 *
 * Saldo negativo, aposta órfã, lançamento de valor zero, duas posições do mesmo
 * usuário na mesma rodada: cada um desses vai ter validação na aplicação
 * TAMBÉM. A diferença aparece no dia em que alguém escreve um caminho novo e
 * esquece a validação. Com constraint, ele descobre no primeiro teste; sem ela,
 * descobre quando um jogador tiver saldo negativo em produção — e aí o dado já
 * está lá, e limpar dado errado é sempre mais caro que recusá-lo.
 *
 * ── POR QUE MIGRAÇÃO QUE DESCE ─────────────────────────────────────────────
 *
 * O valor de poder descer não é desfazer em produção; quase ninguém desfaz. É
 * poder TESTAR o caminho de volta antes de precisar dele às três da manhã — e é
 * o que permite ao teste conferir que subir, descer e subir de novo reconstrói
 * exatamente o mesmo esquema.
 */
import { DatabaseSync } from 'node:sqlite';

export function abrirBanco(caminho) {
  const db = new DatabaseSync(caminho);
  /* CHAVE ESTRANGEIRA NÃO É LIGADA POR PADRÃO NO SQLITE, e essa é a pegadinha
     mais cara dele: sem esta linha, toda `REFERENCES` do esquema abaixo vira
     documentação. Aposta órfã passaria calada. */
  db.exec('PRAGMA foreign_keys = ON');
  /* WAL: leitura não bloqueia escrita. O scheduler do F1.5 escreve enquanto
     dezenas de leitores consultam a rodada. Ignorado em `:memory:`. */
  if (caminho !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  return db;
}

/* Os buckets de proveniência do §5.5. Lista aqui e não em texto solto porque o
   CHECK abaixo e a aplicação precisam concordar, e concordar por cópia é como
   se dessincroniza. */
export const BUCKETS = ['transferivel', 'pendente', 'bonus', 'competitivo'];

const emAspas = lista => lista.map(x => `'${x}'`).join(',');

/* ── AS MIGRAÇÕES ───────────────────────────────────────────────────────────
 *
 * Cada uma tem `sobe` e `desce`. A ordem é a ordem de aplicação, e o índice+1 é
 * a versão. Migração nova entra NO FIM — nunca no meio, porque a versão gravada
 * de um banco existente é um índice nesta lista.
 */
export const MIGRACOES = [
  {
    nome: 'esquema-v1',
    sobe: db => {
      /* users — §5.13 mais os campos do cap. 28.
         `birth_date` é NOT NULL de propósito: ela sustenta o bloqueio por idade
         do F1.3, e coluna anulável é como um usuário sem idade declarada entra
         pela porta de trás de um caminho novo. Ela também é IMUTÁVEL (§28.2), e
         isso é garantido por gatilho mais abaixo — CHECK não vê o valor antigo. */
      db.exec(`
        CREATE TABLE users (
          id            TEXT PRIMARY KEY,
          username      TEXT NOT NULL UNIQUE,
          email         TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'ativo'
                          CHECK (status IN ('ativo','congelado','autoexcluido')),
          birth_date    TEXT NOT NULL
                          CHECK (birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
          created_at    INTEGER NOT NULL,
          last_login_at INTEGER
        )`);

      db.exec(`
        CREATE TABLE trainer_profiles (
          user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          display_name TEXT NOT NULL,
          avatar_id    TEXT,
          banner_id    TEXT,
          level        INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
          xp           INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0)
        )`);

      /* rounds — o ciclo do §5.5 e o commit-reveal do §4.5.
         `round_seed_reveal` é anulável de propósito: ele NÃO EXISTE antes do
         fechamento da janela, e é exatamente essa ausência que o §4.5 promete.
         Nulo aqui é a promessa escrita no esquema. */
      db.exec(`
        CREATE TABLE rounds (
          id                  TEXT PRIMARY KEY,
          status              TEXT NOT NULL
                                CHECK (status IN ('agendada','aberta','travada','emLuta','encerrada','cancelada')),
          round_seed_commit   TEXT NOT NULL,
          round_seed_reveal   TEXT,
          round_seed_sal      TEXT,
          engine_version      TEXT NOT NULL,
          content_version     TEXT NOT NULL,
          betting_opens_at    INTEGER NOT NULL,
          betting_locks_at    INTEGER NOT NULL,
          battle_starts_at    INTEGER,
          closed_at           INTEGER,
          environment         TEXT NOT NULL,
          champion_species_id INTEGER,
          sims                INTEGER,
          margem_efetiva      REAL,
          CHECK (betting_locks_at > betting_opens_at)
        )`);

      /* round_fighters — o registro de preço do §4.4.5. Guardado por rodada
         porque "odd auditável" quer dizer que a odd OFERECIDA fica gravada, e
         não recalculada depois com o código de hoje. */
      db.exec(`
        CREATE TABLE round_fighters (
          round_id     TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
          slot         INTEGER NOT NULL CHECK (slot >= 0 AND slot < 12),
          species_id   INTEGER NOT NULL,
          probability  REAL NOT NULL CHECK (probability > 0 AND probability < 1),
          erro_relativo REAL NOT NULL CHECK (erro_relativo >= 0),
          fair_odd     REAL NOT NULL CHECK (fair_odd > 1),
          offered_odd  REAL NOT NULL CHECK (offered_odd > 1),
          PRIMARY KEY (round_id, slot),
          /* A odd oferecida é sempre MENOR que a justa: a diferença é a margem
             da casa. Maior seria a casa pagando para operar, e é o tipo de sinal
             invertido que passa despercebido num refactor de precificação. */
          CHECK (offered_odd <= fair_odd)
        )`);

      /* bets — §5.6. UMA posição por usuário por rodada, e isso é UNIQUE e não
         convenção: "trocar de lutador" é UPDATE. */
      db.exec(`
        CREATE TABLE bets (
          id         TEXT PRIMARY KEY,
          user_id    TEXT NOT NULL REFERENCES users(id),
          round_id   TEXT NOT NULL REFERENCES rounds(id),
          /* O SLOT E A ESPÉCIE, os dois. O slot é a posição na rodada — é por
             ele que o cliente aposta. A espécie é o que o settlement compara
             com o campeão. Guardar só o slot obrigaria o settlement a
             reconsultar a rodada para saber quem era; guardar só a espécie
             perderia a posição, e duas rodadas com o mesmo lutador em slots
             diferentes ficariam indistinguíveis no histórico. */
          slot_apostado INTEGER NOT NULL CHECK (slot_apostado >= 0 AND slot_apostado < 12),
          species_id INTEGER NOT NULL,
          stake      INTEGER NOT NULL CHECK (stake > 0),
          odd        REAL NOT NULL CHECK (odd > 1),
          status     TEXT NOT NULL
                       CHECK (status IN ('aberta','travada','ganha','perdida','cancelada')),
          payout     INTEGER CHECK (payout IS NULL OR payout >= 0),
          stake_breakdown TEXT,
          created_at INTEGER NOT NULL,
          locked_at  INTEGER,
          settled_at INTEGER,
          UNIQUE (user_id, round_id)
        )`);

      /* carteiras — o saldo POR BUCKET (§5.5). Não está no §5.13 porque lá o
         saldo é derivado do ledger; aqui ele é materializado, e a reconciliação
         entre os dois é uma invariante do §16.4.1 que o F1.4 vai verificar.
         `saldo >= 0` é a invariante do §4.6 escrita onde ela não pode ser
         esquecida. */
      db.exec(`
        CREATE TABLE carteiras (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          bucket  TEXT NOT NULL CHECK (bucket IN (${emAspas(BUCKETS)})),
          saldo   INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),
          PRIMARY KEY (user_id, bucket)
        )`);

      /* wallet_ledger — append-only, §5.5.
         `amount <> 0` porque lançamento nulo é ruído que atrapalha exatamente
         quem for auditar. A imutabilidade vem dos gatilhos abaixo. */
      db.exec(`
        CREATE TABLE wallet_ledger (
          id             TEXT PRIMARY KEY,
          user_id        TEXT NOT NULL REFERENCES users(id),
          type           TEXT NOT NULL,
          bucket         TEXT NOT NULL CHECK (bucket IN (${emAspas(BUCKETS)})),
          amount         INTEGER NOT NULL CHECK (amount <> 0),
          /* O delta do RESERVADO, separado do delta do disponível. Uma reserva
             tira do disponível e põe no reservado NA MESMA LINHA: separá-las em
             dois lançamentos criaria um instante em que o dinheiro não está em
             lugar nenhum, e é nesse instante que uma falha deixa o ledger
             contando uma história que o saldo não conta. */
          reserva_delta  INTEGER NOT NULL DEFAULT 0,
          reference_type TEXT,
          reference_id   TEXT,
          idem_key       TEXT UNIQUE,
          memo           TEXT,
          created_at     INTEGER NOT NULL
        )`);

      /* APPEND-ONLY DE VERDADE. Sem estes dois gatilhos, "append-only" é uma
         convenção que a primeira correção manual em produção quebra — e é
         justamente o registro que existe para ser confiável depois. */
      db.exec(`
        CREATE TRIGGER ledger_sem_update BEFORE UPDATE ON wallet_ledger
        BEGIN SELECT RAISE(ABORT, 'wallet_ledger é append-only'); END`);
      db.exec(`
        CREATE TRIGGER ledger_sem_delete BEFORE DELETE ON wallet_ledger
        BEGIN SELECT RAISE(ABORT, 'wallet_ledger é append-only'); END`);

      /* A DATA DE NASCIMENTO É IMUTÁVEL (§28.2). CHECK não serve: ele não
         enxerga o valor antigo. O gatilho enxerga os dois. */
      db.exec(`
        CREATE TRIGGER nascimento_imutavel BEFORE UPDATE OF birth_date ON users
        WHEN OLD.birth_date <> NEW.birth_date
        BEGIN SELECT RAISE(ABORT, 'data de nascimento é imutável (§28.2)'); END`);

      db.exec(`
        CREATE TABLE daily_challenges (
          id             TEXT PRIMARY KEY,
          user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date           TEXT NOT NULL,
          challenge_type TEXT NOT NULL,
          target         INTEGER NOT NULL CHECK (target > 0),
          progress       INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
          completed_at   INTEGER,
          claimed_at     INTEGER,
          UNIQUE (user_id, date, challenge_type),
          /* Recompensa reclamada sem desafio concluído é a forma mais direta de
             o D-007 virar dinheiro. */
          CHECK (claimed_at IS NULL OR completed_at IS NOT NULL)
        )`);

      /* ── CAPÍTULO 28: as três tabelas de proteção ──────────────────────────
         Criadas AGORA, mesmo só sendo usadas no F1.8. Acrescentar coluna em
         tabela com dados de produção é o caro; criar tabela vazia é de graça. */
      db.exec(`
        CREATE TABLE player_limits (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo       TEXT NOT NULL CHECK (tipo IN ('deposito_diario','aposta_diaria','tempo_diario','perda_diaria')),
          valor      INTEGER NOT NULL CHECK (valor > 0),
          vigente_em INTEGER NOT NULL,
          criado_em  INTEGER NOT NULL,
          PRIMARY KEY (user_id, tipo, vigente_em)
        )`);

      /* AUTOEXCLUSÃO NÃO TEM FIM ANULÁVEL POR ACIDENTE: `ate` nulo é
         permanente, e isso é decisão registrada, não omissão. */
      db.exec(`
        CREATE TABLE self_exclusions (
          id        TEXT PRIMARY KEY,
          user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          de        INTEGER NOT NULL,
          ate       INTEGER,
          motivo    TEXT,
          criado_em INTEGER NOT NULL,
          CHECK (ate IS NULL OR ate > de)
        )`);

      db.exec(`
        CREATE TABLE responsible_play_events (
          id        TEXT PRIMARY KEY,
          user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo      TEXT NOT NULL,
          detalhe   TEXT,
          criado_em INTEGER NOT NULL
        )`);

      /* Índices onde a consulta VAI doer: o scheduler busca por status e por
         relógio, o settlement busca as apostas de uma rodada, e a auditoria
         busca o ledger de um usuário em ordem. */
      db.exec(`CREATE INDEX idx_rounds_status ON rounds(status, betting_locks_at)`);
      db.exec(`CREATE INDEX idx_bets_round ON bets(round_id, status)`);
      db.exec(`CREATE INDEX idx_ledger_user ON wallet_ledger(user_id, created_at)`);
    },
    desce: db => {
      for (const g of ['ledger_sem_update', 'ledger_sem_delete', 'nascimento_imutavel'])
        db.exec(`DROP TRIGGER IF EXISTS ${g}`);
      /* Ordem inversa da criação: as filhas antes das mães, senão a chave
         estrangeira recusa — e recusar aqui é o comportamento certo. */
      for (const t of ['responsible_play_events', 'self_exclusions', 'player_limits',
                       'daily_challenges', 'wallet_ledger', 'carteiras', 'bets',
                       'round_fighters', 'rounds', 'trainer_profiles', 'users'])
        db.exec(`DROP TABLE IF EXISTS ${t}`);
    },
  },
];

const TABELA_VERSAO = `
  CREATE TABLE IF NOT EXISTS schema_versao (
    versao INTEGER NOT NULL,
    aplicada_em INTEGER NOT NULL
  )`;

export function versaoDoBanco(db) {
  db.exec(TABELA_VERSAO);
  const r = db.prepare(`SELECT MAX(versao) AS v FROM schema_versao`).get();
  return r?.v ?? 0;
}

/* Sobe até a última. Idempotente: subir duas vezes não mexe em nada, porque a
   versão gravada é consultada antes de cada passo. */
export function migrar(db, ate = MIGRACOES.length) {
  db.exec(TABELA_VERSAO);
  let v = versaoDoBanco(db);
  while (v < ate) {
    const m = MIGRACOES[v];
    /* TRANSAÇÃO POR MIGRAÇÃO. Sem ela, uma migração que falha no meio deixa o
       banco num estado que não é nem o antigo nem o novo — e a versão gravada
       mente sobre qual dos dois é. */
    db.exec('BEGIN');
    try { m.sobe(db); db.prepare(`INSERT INTO schema_versao VALUES (?, ?)`)
            .run(v + 1, Date.now()); db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw new Error(`migração ${v + 1} (${m.nome}) falhou: ${e.message}`); }
    v++;
  }
  return v;
}

export function desmigrar(db, ate = 0) {
  db.exec(TABELA_VERSAO);
  let v = versaoDoBanco(db);
  while (v > ate) {
    const m = MIGRACOES[v - 1];
    db.exec('BEGIN');
    try { m.desce(db); db.prepare(`DELETE FROM schema_versao WHERE versao = ?`).run(v);
          db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw new Error(`reversão ${v} (${m.nome}) falhou: ${e.message}`); }
    v--;
  }
  return v;
}
