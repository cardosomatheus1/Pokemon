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

/* Os limites do §28.3, pelo mesmo motivo dos buckets: o CHECK da tabela e o
   módulo que os aplica precisam concordar, e concordar por cópia é como se
   dessincroniza. `max_deposit` NÃO está aqui — a Spec diz que ele "só existe
   quando houver compra de PC-T", e limite que não pode ser exercido é promessa
   de tela. Ele entra no bloco que ligar a compra.

   Todos são "quanto maior, mais permissivo". A assimetria do §28.3 depende
   disso, e um limite futuro que inverta a ordem precisa dizer isso aqui em vez
   de deixar `limites.mjs` adivinhar. */
export const TIPOS_LIMITE = [
  'max_stake_per_round',   // por rodada
  'max_loss_dia', 'max_loss_semana', 'max_loss_mes',   // perda LÍQUIDA
  'max_rounds_dia',        // frequência, não valor
  'max_session_time',      // minutos de sessão
];

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

  /* ── 2 · OS LIMITES DO §28.3 GANHAM FORMA (F1.8) ─────────────────────────
   *
   * A `player_limits` do esquema-v1 foi criada em F1.2 com quatro tipos
   * chutados (`deposito_diario`, `aposta_diaria`, `tempo_diario`,
   * `perda_diaria`) e `valor > 0` obrigatório. Nenhum dos dois sobrevive ao
   * §28.3: os tipos são outros, e **remover um limite precisa ser gravável** —
   * é a terceira linha da assimetria, e ela vira `valor NULL`.
   *
   * A tabela é RECRIADA e não alterada. Ela nunca recebeu escrita (o F1.2 a
   * criou vazia de propósito, ver o comentário lá em cima), então recriar não
   * perde dado nenhum e deixa o CHECK certo desde a primeira linha. Se um dia
   * ela tiver dados, esta migração precisa virar cópia — e é por isso que a
   * nota está aqui, e não no commit.
   */
  {
    nome: 'limites-28.3',
    sobe: db => {
      db.exec(`DROP TABLE IF EXISTS player_limits`);

      /* O HISTÓRICO É A TABELA. Cada mudança é uma linha com o instante em que
         passou a valer; o limite de hoje é a linha mais recente com
         `vigente_em <= agora`. Guardar só o valor atual apagaria justamente o
         que o §28.6 lê como `limit_pressure`. */
      db.exec(`
        CREATE TABLE player_limits (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo       TEXT NOT NULL CHECK (tipo IN (${emAspas(TIPOS_LIMITE)})),
          valor      INTEGER CHECK (valor IS NULL OR valor > 0),
          vigente_em INTEGER NOT NULL,
          criado_em  INTEGER NOT NULL,
          PRIMARY KEY (user_id, tipo, vigente_em)
        )`);

      /* UM PEDIDO PENDENTE POR (usuário, tipo), e a chave primária é quem
         garante. Dois pedidos vivos para o mesmo limite seriam dois prazos, e
         o jogador confirmaria o que vencesse primeiro — que é o encurtamento
         que o §28.3 proíbe, entrando pela porta do modelo de dados. */
      db.exec(`
        CREATE TABLE limit_requests (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo       TEXT NOT NULL CHECK (tipo IN (${emAspas(TIPOS_LIMITE)})),
          valor      INTEGER CHECK (valor IS NULL OR valor > 0),
          pedido_em  INTEGER NOT NULL,
          efetivo_em INTEGER NOT NULL,
          PRIMARY KEY (user_id, tipo),
          CHECK (efetivo_em > pedido_em)
        )`);

      /* O QUE OS LIMITES MEDEM. Separada do ledger de propósito: o ledger é
         dinheiro e é append-only por gatilho; isto é exposição, e inclui
         evento que não move dinheiro nenhum (uma rodada jogada). Misturar as
         duas coisas faria a auditoria financeira ler comportamento. */
      db.exec(`
        CREATE TABLE player_activity (
          id        TEXT PRIMARY KEY,
          user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo      TEXT NOT NULL CHECK (tipo IN ('perda','rodada')),
          valor     INTEGER NOT NULL,
          criado_em INTEGER NOT NULL
        )`);
      db.exec(`CREATE INDEX idx_activity_user ON player_activity(user_id, criado_em)`);
    },
    desce: db => {
      for (const t of ['player_activity', 'limit_requests', 'player_limits'])
        db.exec(`DROP TABLE IF EXISTS ${t}`);
      /* Volta EXATAMENTE a `player_limits` do esquema-v1: descer e subir de novo
         tem que reconstruir o mesmo banco, e "quase igual" quebra isso. */
      db.exec(`
        CREATE TABLE player_limits (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tipo       TEXT NOT NULL CHECK (tipo IN ('deposito_diario','aposta_diaria','tempo_diario','perda_diaria')),
          valor      INTEGER NOT NULL CHECK (valor > 0),
          vigente_em INTEGER NOT NULL,
          criado_em  INTEGER NOT NULL,
          PRIMARY KEY (user_id, tipo, vigente_em)
        )`);
    },
  },

  /* ── 3 · PAUSA, AUTOEXCLUSÃO E IDENTIDADE (F1.9) ─────────────────────────
   *
   * A `self_exclusions` do esquema-v1 sabe COMEÇAR uma pausa e não sabe
   * terminá-la — e terminar é onde mora a regra: "ao expirar, a reentrada é
   * ativa (o jogador precisa pedir), nunca automática". Sem uma coluna para o
   * pedido e outra para a concessão, a pausa cairia sozinha ao vencer o prazo,
   * que é o produto decidindo pelo jogador que ele quer voltar.
   *
   * `identidade_ligada` é a tabela que faz a autoexclusão valer por PESSOA e
   * não por conta. Ela não guarda documento nem impressão de dispositivo:
   * guarda que duas contas foram ligadas e por qual CLASSE de sinal. Guardar o
   * sinal em si transformaria a tabela de proteção num alvo — e o §28 é
   * requisito de proteção, não de vigilância.
   */
  {
    nome: 'protecao-28.4',
    sobe: db => {
      db.exec(`ALTER TABLE self_exclusions ADD COLUMN reentrada_pedida_em INTEGER`);
      db.exec(`ALTER TABLE self_exclusions ADD COLUMN reentrada_em INTEGER`);
      db.exec(`CREATE INDEX idx_pausa_user ON self_exclusions(user_id, ate)`);

      /* A ligação NÃO TEM DIREÇÃO: `conta_a < conta_b` por convenção de escrita,
         e a consulta olha os dois lados. Sem a ordem canônica, (A,B) e (B,A)
         seriam duas linhas e o `UNIQUE` não seguraria nada. */
      db.exec(`
        CREATE TABLE identidade_ligada (
          conta_a   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          conta_b   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          sinal     TEXT NOT NULL,
          criado_em INTEGER NOT NULL,
          PRIMARY KEY (conta_a, conta_b, sinal),
          CHECK (conta_a < conta_b)
        )`);

      /* Os campos do §28.9 que faltavam em `users`. `protection_status` é
         DERIVADO das pausas e existe como cache legível pelo painel do F1.11;
         a verdade continua sendo `self_exclusions`, e é ela que `pausaAtiva`
         consulta. Cache que vira fonte é a próxima classe de defeito. */
      db.exec(`ALTER TABLE users ADD COLUMN protection_status TEXT NOT NULL DEFAULT 'normal'`);
      db.exec(`ALTER TABLE users ADD COLUMN age_verification_status TEXT NOT NULL DEFAULT 'declared'`);
      /* §28.9: "bets.blocked_by_limit — quando a aposta foi recusada por
         limite". Fica no ticket para o painel poder contar recusa ao lado de
         aposta aceita, que é a comparação que diz se o limite está apertado
         demais ou de menos. */
      db.exec(`ALTER TABLE bets ADD COLUMN blocked_by_limit TEXT`);
    },
    desce: db => {
      db.exec(`DROP TABLE IF EXISTS identidade_ligada`);
      db.exec(`DROP INDEX IF EXISTS idx_pausa_user`);
      for (const [t, c] of [['self_exclusions', 'reentrada_pedida_em'],
                            ['self_exclusions', 'reentrada_em'],
                            ['users', 'protection_status'],
                            ['users', 'age_verification_status'],
                            ['bets', 'blocked_by_limit']])
        db.exec(`ALTER TABLE ${t} DROP COLUMN ${c}`);
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
