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
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function abrirBanco(caminho) {
  /* O SQLITE NÃO CRIA DIRETÓRIO, SÓ ARQUIVO — e é o D-030.
   *
   * `config.mjs` resolve o banco para `dados/pokearena.db` em todo ambiente que
   * não seja teste. Num clone limpo `dados/` não existe, e não deve existir: é
   * dado de execução. O erro que sai dali é `unable to open database file`, que
   * é também a mensagem de permissão negada, de disco cheio e de caminho
   * inválido — quem clona procura em quatro lugares antes do certo.
   *
   * `recursive` não é enfeite: ele cobre o caminho inteiro, não só o último
   * nível. `dados/` pode virar `var/dados/` no dia em que alguém mexer na
   * configuração, e um `mkdirSync` sem ele passaria hoje e quebraria lá.
   *
   * AQUI E NÃO NO `principal.mjs`: este é o único ponto por onde todo caminho
   * que abre banco passa. No ponto de entrada, a próxima ferramenta que abrir
   * um banco — um script de migração, uma exportação — repetiria o defeito. */
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
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

  /* ── F1.10 · A PROGRESSÃO SAI DO NAVEGADOR ─────────────────────────────────
   *
   * Até aqui XP, medalhas, desafios e trilha de login moravam no
   * `localStorage`: limpar o navegador apagava semanas de jogo, e forjar
   * progresso era editar um JSON. O §5.10 quer os dois lados resolvidos.
   *
   * QUATRO TABELAS, e a divisão não é arbitrária:
   *
   *   player_profile   o que o jogador É — nível, XP, cosméticos escolhidos
   *   challenges       o que ele TEM PARA FAZER hoje, e o quanto andou
   *   login_streak     a trilha de dias, que é uma série e não um contador
   *   rescue_grants    cada resgate concedido, com o motivo e o valor
   *
   * O `rescue_grants` guarda até os NEGADOS, com o motivo. Sem eles, "por que
   * este jogador não recebeu?" não tem resposta, e o §4.7 pede
   * `rescue_grant_blocked_by_policy` como evento de telemetria — evento sem
   * registro é número sem auditoria. */
  {
    nome: 'progressao-5.10',
    sobe: db => {
      db.exec(`
        CREATE TABLE player_profile (
          user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          xp         INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
          nome       TEXT,
          avatar     TEXT,
          banner_dex INTEGER,
          criado_em  INTEGER NOT NULL,
          visto_em   INTEGER NOT NULL
        )`);

      /* UM DESAFIO POR (conta, dia, slot). A chave composta é o que impede
         reivindicar o mesmo desafio duas vezes — a regra mora no esquema, e
         não numa checagem que alguém pode esquecer de chamar. É o item nº 4 da
         sabotagem deste bloco. */
      db.exec(`
        CREATE TABLE challenges (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          dia        TEXT NOT NULL,
          slot       INTEGER NOT NULL CHECK (slot >= 0 AND slot < 3),
          tipo       TEXT NOT NULL,
          alvo       INTEGER NOT NULL CHECK (alvo > 0),
          progresso  INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0),
          concluido_em INTEGER,
          pago_em    INTEGER,
          PRIMARY KEY (user_id, dia, slot)
        )`);

      /* A TRILHA É UMA SÉRIE, e não um contador. Um `dias_seguidos INTEGER`
         não distingue "sete dias seguidos" de "sete logins" — e é exatamente
         essa diferença que o item de sabotagem "farmar streak manipulando
         fuso horário" ataca. Com uma linha por dia, o servidor recalcula a
         sequência a partir dos fatos, e o relógio do cliente não participa. */
      db.exec(`
        CREATE TABLE login_streak (
          user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          dia      TEXT NOT NULL,
          pcb      INTEGER NOT NULL DEFAULT 0 CHECK (pcb >= 0),
          criado_em INTEGER NOT NULL,
          PRIMARY KEY (user_id, dia)
        )`);

      db.exec(`
        CREATE TABLE rescue_grants (
          id        TEXT PRIMARY KEY,
          user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          semana    TEXT NOT NULL,
          concedido INTEGER NOT NULL,
          valor     INTEGER NOT NULL DEFAULT 0 CHECK (valor >= 0),
          motivo    TEXT NOT NULL,
          criado_em INTEGER NOT NULL
        )`);
      db.exec(`CREATE INDEX idx_rescue_semana ON rescue_grants(user_id, semana, concedido)`);

      /* A RUÍNA É UM INSTANTE, e o §28.8 conta o cooldown a partir dele. Sem
         guardá-lo, "24 h após a ruína" viraria "24 h após o pedido" — que é
         outra regra, e a errada: dá para pedir tarde e receber na hora. */
      db.exec(`ALTER TABLE users ADD COLUMN ruina_em INTEGER`);
    },
    desce: db => {
      for (const t of ['rescue_grants', 'login_streak', 'challenges', 'player_profile'])
        db.exec(`DROP TABLE IF EXISTS ${t}`);
      db.exec(`DROP INDEX IF EXISTS idx_rescue_semana`);
      db.exec(`ALTER TABLE users DROP COLUMN ruina_em`);
    },
  },

  /* ── F1.11 · TELEMETRIA E ADMINISTRAÇÃO ───────────────────────────────────
   *
   * TRÊS TABELAS, e a primeira tem uma coluna que explica o bloco inteiro:
   * `amostravel`. O §4.7 fecha a lista de eventos de proteção com uma frase
   * que não é sugestão — "nenhum destes eventos pode ser amostrado: são
   * registro de conformidade, não métrica de produto".
   *
   * Amostragem é a otimização óbvia de qualquer telemetria com volume, e é por
   * isso que a proibição precisa morar no ESQUEMA e não numa convenção: o dia
   * em que alguém ligar amostragem para conter custo, os eventos de proteção
   * precisam recusar em vez de participar.
   *
   * `admin_operadores` e `admin_auditoria` existem pelo §5.11: o painel é a
   * superfície de maior valor do sistema. Nenhuma ação administrativa sem
   * operador identificado, e nenhuma sem registro — a auditoria não é log, é
   * parte do produto. */
  {
    nome: 'telemetria-admin-17',
    sobe: db => {
      db.exec(`
        CREATE TABLE telemetry_events (
          id          TEXT PRIMARY KEY,
          nome        TEXT NOT NULL,
          user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
          round_id    TEXT,
          amostravel  INTEGER NOT NULL DEFAULT 1 CHECK (amostravel IN (0, 1)),
          campos      TEXT NOT NULL,
          criado_em   INTEGER NOT NULL
        )`);
      db.exec(`CREATE INDEX idx_telemetria_nome ON telemetry_events(nome, criado_em)`);
      db.exec(`CREATE INDEX idx_telemetria_user ON telemetry_events(user_id, criado_em)`);

      db.exec(`
        CREATE TABLE admin_operadores (
          id        TEXT PRIMARY KEY,
          email     TEXT NOT NULL UNIQUE,
          papel     TEXT NOT NULL CHECK (papel IN ('leitura', 'suporte', 'economia', 'dono')),
          ativo     INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em INTEGER NOT NULL
        )`);

      /* A AUDITORIA GUARDA O ANTES E O DEPOIS. "Fulano mudou a margem" não
         responde nada seis meses depois; "de 0,08 para 0,12" responde. */
      db.exec(`
        CREATE TABLE admin_auditoria (
          id          TEXT PRIMARY KEY,
          operador_id TEXT NOT NULL REFERENCES admin_operadores(id),
          acao        TEXT NOT NULL,
          alvo        TEXT,
          de          TEXT,
          para        TEXT,
          motivo      TEXT NOT NULL,
          criado_em   INTEGER NOT NULL
        )`);
      db.exec(`CREATE INDEX idx_auditoria_operador ON admin_auditoria(operador_id, criado_em)`);
    },
    desce: db => {
      for (const t of ['admin_auditoria', 'admin_operadores', 'telemetry_events'])
        db.exec(`DROP TABLE IF EXISTS ${t}`);
    },
  },

  /* ── F1.17 · O OPERADOR PROVA QUEM É ──────────────────────────────────────
   *
   * O F1.11 deixou o painel com autorização, auditoria e confirmação — e SEM
   * autenticação: o operador chegava num cabeçalho com o próprio id, e o
   * servidor confiava. Um id vazado — e ele aparece em toda linha de auditoria
   * — abria tudo.
   *
   * `admin_sessoes` é uma tabela SEPARADA da de sessões de jogador, e essa é a
   * decisão central do bloco. Se as duas fossem a mesma, um vazamento de sessão
   * de jogador viraria acesso administrativo, e o raio do incidente passaria de
   * uma conta para TODAS.
   *
   * `operador_id` da auditoria passa a aceitar NULO: uma tentativa de login com
   * e-mail inexistente não tem operador, e é justamente essa que se quer
   * contar — cem recusas seguidas é o sinal mais barato de ataque que existe. */
  {
    nome: 'admin-auth-5.11',
    sobe: db => {
      db.exec(`ALTER TABLE admin_operadores ADD COLUMN senha_hash TEXT`);
      db.exec(`ALTER TABLE admin_operadores ADD COLUMN totp_segredo TEXT`);
      db.exec(`ALTER TABLE admin_operadores ADD COLUMN credencial_em INTEGER`);

      db.exec(`
        CREATE TABLE admin_sessoes (
          token        TEXT PRIMARY KEY,
          operador_id  TEXT NOT NULL REFERENCES admin_operadores(id) ON DELETE CASCADE,
          criada_em    INTEGER NOT NULL,
          expira_em    INTEGER NOT NULL,
          girada_em    INTEGER NOT NULL,
          /* O código do segundo fator que abriu esta sessão. Guardado para que
             ele não possa abrir OUTRA dentro da mesma janela de 30 s — quem vê
             o número por cima do ombro o reusaria. Não é credencial guardada:
             ele já foi usado e vale zero. */
          totp_usado   TEXT,
          encerrada_em INTEGER
        )`);
      db.exec(`CREATE INDEX idx_admin_sessao_op ON admin_sessoes(operador_id, encerrada_em)`);

      /* SQLite não afrouxa NOT NULL por ALTER. A tabela é recriada, e a
         auditoria antiga é PRESERVADA — apagá-la para mudar uma restrição seria
         perder exatamente o que ela existe para guardar. */
      db.exec(`ALTER TABLE admin_auditoria RENAME TO admin_auditoria_v1`);
      db.exec(`
        CREATE TABLE admin_auditoria (
          id          TEXT PRIMARY KEY,
          operador_id TEXT REFERENCES admin_operadores(id),
          acao        TEXT NOT NULL,
          alvo        TEXT,
          de          TEXT,
          para        TEXT,
          motivo      TEXT NOT NULL,
          criado_em   INTEGER NOT NULL
        )`);
      db.exec(`INSERT INTO admin_auditoria SELECT * FROM admin_auditoria_v1`);
      db.exec(`DROP TABLE admin_auditoria_v1`);
    },
    desce: db => {
      db.exec(`DROP INDEX IF EXISTS idx_admin_sessao_op`);
      db.exec(`DROP TABLE IF EXISTS admin_sessoes`);
      for (const c of ['senha_hash', 'totp_segredo', 'credencial_em'])
        db.exec(`ALTER TABLE admin_operadores DROP COLUMN ${c}`);
    },
  },

  {
    nome: 'margem-da-casa',
    /* A MARGEM VIRA DADO DO SERVIDOR (R18, fecha a L-047).
     *
     * Ela vivia em `localStorage` no cliente, e o R9 a removeu de lá: preço
     * decidido sem papel, sem confirmação e sem registro, por qualquer um que
     * abrisse o console. Desde então a rodada usa a do motor, que é a única
     * auditável — e definir margem não tinha caminho nenhum.
     *
     * A tabela é de UMA LINHA, e isso é decisão. A margem é uma configuração
     * da casa, não uma série: quem quiser a história de quem mudou o quê tem a
     * `admin_auditoria`, que guarda `de` e `para` de cada mudança. Duas fontes
     * para a mesma história é como elas divergem.
     *
     * `atualizado_por` referencia o operador de propósito: uma margem sem dono
     * é uma margem que ninguém responde por. */
    sobe: db => {
      db.exec(`
        CREATE TABLE casa_config (
          id             INTEGER PRIMARY KEY CHECK (id = 1),
          margem         REAL,
          atualizado_em  INTEGER,
          atualizado_por TEXT REFERENCES admin_operadores(id)
        )`);
      /* `margem NULL` é "use a do motor", e é diferente de `0`, que é uma casa
         sem margem nenhuma. A linha nasce com NULL: o comportamento de hoje
         continua sendo o de hoje até alguém decidir o contrário. */
      db.exec(`INSERT INTO casa_config (id, margem) VALUES (1, NULL)`);
    },
    desce: db => { db.exec(`DROP TABLE IF EXISTS casa_config`); },
  },

  {
    nome: 'liga-previsao-6.8',
    /* A LIGA DE PREVISÃO (R36, Spec §6.8 e §6.10).
     *
     * Ranking por CALIBRAÇÃO, sem stake e sem risco econômico. Por não
     * movimentar valor, ela é a única via competitiva que não depende do
     * checkpoint do §25.1 — foi por isso que a Spec a antecipou da Fase 5 para
     * a V2. Nada aqui toca `carteiras` nem `wallet_ledger`, e é de propósito:
     * previsão que pagasse seria outro produto, com outro enquadramento.
     *
     * A CONTA não mora aqui. Ela é `engine/calibracao.mjs`, pura e testada
     * sozinha; estas tabelas guardam o que foi dito, quando, e sob qual regra.
     */
    sobe: db => {
      /* `distribution_json` guarda o que o jogador DISSE, no texto em que ele
         disse. Guardar a distribuição já normalizada perderia a diferença
         entre "ele mandou algo inválido" e "nós consertamos" — e o §6.8 exige
         que previsão liquidada não reabra, o que só tem sentido se o que foi
         dito estiver preservado.

         `score` NULO é "ainda não liquidada". Zero é a NOTA PERFEITA em Brier,
         então usar zero como ausência poria quem nunca foi pontuado no topo —
         a mesma armadilha que o `engine/calibracao.mjs` documenta.

         `scoring_version` viaja com a nota (§6.10): mudar a fórmula não pode
         reescrever a história. A nota foi dada sob uma regra e o jogador jogou
         sob ela. */
      db.exec(`
        CREATE TABLE predictions (
          id                TEXT PRIMARY KEY,
          round_id          TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
          user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          market_kind       TEXT NOT NULL,
          distribution_json TEXT NOT NULL,
          created_at        INTEGER NOT NULL,
          score             REAL,
          scored_at         INTEGER,
          scoring_version   INTEGER,
          /* UMA PREVISÃO POR RODADA POR MERCADO. Sem isto, quem manda doze
             previsões na mesma rodada fica com a melhor delas depois — que é
             o oposto de medir calibração. */
          UNIQUE (user_id, round_id, market_kind),
          /* A NOTA E A VERSÃO ANDAM JUNTAS. Nota sem versão é nota que ninguém
             sabe sob qual regra nasceu; versão sem nota é lixo. */
          CHECK ((score IS NULL) = (scoring_version IS NULL)),
          CHECK ((score IS NULL) = (scored_at IS NULL))
        )`);
      /* A liquidação percorre uma rodada inteira; o ranking percorre um
         jogador. Os dois caminhos têm índice. */
      db.exec(`CREATE INDEX idx_pred_rodada ON predictions(round_id)`);
      db.exec(`CREATE INDEX idx_pred_user ON predictions(user_id, scored_at)`);

      /* O RANKING MATERIALIZADO POR TEMPORADA.
       *
       * `sample_size` fica visível de propósito: é a regra de honestidade do
       * §28.5 aplicada ao ranking — esconder o tamanho da amostra esconde o
       * quanto a nota vale. E é o que o §6.8 exige para "volume não substitui
       * qualidade" ser conferível por quem olha, e não só por quem calcula.
       *
       * `rank` NULO é "não alcançou a amostra mínima". Ele existe como coluna
       * e não como derivação porque a tela precisa mostrar a linha do jogador
       * COM o motivo — sumir da lista esconderia justamente a informação de
       * que falta amostra. */
      db.exec(`
        CREATE TABLE calibration_ratings (
          user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          season_id   TEXT NOT NULL,
          sample_size INTEGER NOT NULL CHECK (sample_size >= 0),
          score       REAL,
          rank        INTEGER CHECK (rank IS NULL OR rank >= 1),
          updated_at  INTEGER NOT NULL,
          PRIMARY KEY (user_id, season_id)
        )`);
      db.exec(`CREATE INDEX idx_calib_temporada ON calibration_ratings(season_id, rank)`);
    },
    desce: db => {
      db.exec(`DROP TABLE IF EXISTS calibration_ratings`);
      db.exec(`DROP TABLE IF EXISTS predictions`);
    },
  },
  {
    nome: 'criaturas-do-jogador-1.1',
    /* AS CRIATURAS QUE O JOGADOR POSSUI (bloco 1.1, §7.9 e §7.17).
     *
     * ── A DECISÃO QUE MUDOU O PLANO DESTE BLOCO ─────────────────────────────
     *
     * O plano do 1.1 previa TRÊS tabelas: `species`, `evolution_chain` e as
     * instâncias. Só a terceira entra, e a razão é a mesma que fez os biomas
     * saírem do motor.
     *
     * Espécie e linha evolutiva são DADO DO PACK. Copiá-las para o banco cria
     * uma segunda fonte de verdade que pode divergir da primeira — e divergir
     * em silêncio, porque nada obriga as duas a andarem juntas. Pior: com a
     * linha evolutiva no banco, acrescentar a Gen 2 deixa de ser editar um
     * arquivo e passa a exigir uma MIGRAÇÃO, que é exatamente o custo que o
     * dono do projeto mandou não pagar.
     *
     * O servidor carrega o pack como o cliente carrega, do mesmo arquivo
     * versionado. Aqui fica só o que o pack não pode saber: quem é de quem.
     *
     * ── O POTENCIAL NÃO É COLUNA, E ISSO É PROTEÇÃO ─────────────────────────
     *
     * Ele sai dos seis ocultos por uma conta de uma linha. Guardado ao lado
     * deles, passaria a existir um estado em que os dois DISCORDAM — e esse
     * estado é a fraude: um UPDATE em `potencial` valoriza uma criatura sem
     * tocar em nada que o jogo confira.
     *
     * Não guardar é a única defesa que não depende de ninguém lembrar de
     * conferir. Mesmo raciocínio de `forma` e do estágio evolutivo.
     *
     * ── A SEMENTE VIAJA COM A CRIATURA (§P3, §25.2) ─────────────────────────
     *
     * `semente` é a raiz que gerou os ocultos. Guardá-la é o que torna a
     * captura AUDITÁVEL do mesmo jeito que a rodada é: dado o número, qualquer
     * um regera a criatura e confere que os seis ocultos gravados são os que o
     * sorteio produziu.
     *
     * Sem ela, "esta criatura foi sorteada honestamente" é uma afirmação que só
     * a casa pode fazer — e o §25.2 existe justamente para que não seja assim.
     * Num jogo onde criatura vale dinheiro, é a diferença entre um mercado
     * conferível e um mercado onde se acredita. */
    sobe: db => {
      /* OS OCULTOS SÃO SEIS COLUNAS, e não um JSON.
       *
       * JSON caberia num campo e pouparia digitação; o que ele não faz é
       * RECUSAR. Em coluna, o banco impede 0..31 de ser violado — e o valor
       * impossível para de depender de o código estar certo no dia. É a mesma
       * escolha do CHECK de saldo não negativo em `carteiras`, pelo mesmo
       * motivo: a última linha de defesa não pode ser código de aplicação. */
      db.exec(`
        CREATE TABLE criaturas (
          id            TEXT PRIMARY KEY,
          user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          /* O PACK VIAJA COM A LINHA. Um \`dex\` sozinho é ambíguo: o 25 de um
             pack não é o 25 do outro, e trocar o ContentPack sem esta coluna
             transformaria silenciosamente a coleção inteira de todo mundo. */
          pack_id       TEXT NOT NULL,
          dex           INTEGER NOT NULL CHECK (dex >= 1),
          o_hp          INTEGER NOT NULL CHECK (o_hp  BETWEEN 0 AND 31),
          o_atq         INTEGER NOT NULL CHECK (o_atq BETWEEN 0 AND 31),
          o_def         INTEGER NOT NULL CHECK (o_def BETWEEN 0 AND 31),
          o_spa         INTEGER NOT NULL CHECK (o_spa BETWEEN 0 AND 31),
          o_spd         INTEGER NOT NULL CHECK (o_spd BETWEEN 0 AND 31),
          o_vel         INTEGER NOT NULL CHECK (o_vel BETWEEN 0 AND 31),
          natureza      TEXT,
          exemplar      INTEGER NOT NULL DEFAULT 0 CHECK (exemplar IN (0, 1)),
          nivel         INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1),
          vinculo       INTEGER NOT NULL DEFAULT 0 CHECK (vinculo >= 0),
          foco          TEXT,
          /* A raiz que gerou os ocultos — ver o comentário acima. */
          semente       TEXT NOT NULL,
          /* De onde ela veio. Nasce restrita de propósito: 'mercado' só entra
             quando o mercado existir, e o checkpoint do §25.1 for cumprido. */
          origem        TEXT NOT NULL CHECK (origem IN ('captura','inicial','raid')),
          criada_em     INTEGER NOT NULL
        )`);
      /* A coleção de um jogador é o caminho quente: é o que a aba do registro
         pede a cada abertura. */
      db.exec(`CREATE INDEX idx_criaturas_dono ON criaturas(user_id, criada_em)`);
      /* E o registro por espécie, que é como a tela agrupa. */
      db.exec(`CREATE INDEX idx_criaturas_especie ON criaturas(user_id, pack_id, dex)`);
    },
    desce: db => { db.exec(`DROP TABLE IF EXISTS criaturas`); },
  },
  {
    nome: 'idle-1.2d',
    /* O SERVIDOR DO IDLE (bloco 1.2d, §P2, §P3, §25.2).
     *
     * Os blocos 1.2a, 1.2b e 1.2c fecharam o MOTOR da expedição, do encontro e
     * do saque — puro, testado, e sem nada que sobreviva a um F5. Este é o
     * bloco que dá memória a eles (L-069).
     *
     * ── A DECISÃO QUE GOVERNA O ESQUEMA ─────────────────────────────────────
     *
     * **A semente do saque é sorteada NA COLHEITA, e nunca no início.**
     *
     * Se a raiz nascesse junto com a expedição, ela existiria no banco durante
     * oito horas ANTES de o jogador colher. Quem tivesse acesso a ela — um
     * vazamento, um administrador, o próprio jogador num cliente adulterado —
     * saberia o resultado antes, e poderia CANCELAR a expedição ruim.
     *
     * Sorteada na colheita, não há janela: no instante em que o resultado
     * existe, ele já é do jogador.
     *
     * O CHECK abaixo torna isso ESTRUTURAL e não uma promessa:
     *
     *     CHECK ((colhida_em IS NULL) = (semente IS NULL))
     *
     * Uma semente sem colheita é um estado que o banco RECUSA. É a mesma
     * família do CHECK de `score`/`scoring_version` na liga de previsão, e
     * pelo mesmo motivo: dois campos que só fazem sentido juntos não podem
     * poder existir separados.
     *
     * ── A STAMINA VAI PARA A CRIATURA ───────────────────────────────────────
     *
     * O 1.2a decidiu que a stamina é da criatura e não do jogador — é o que faz
     * a coleção ter função em vez de ser enfeite. Aqui isso vira coluna.
     *
     * Guardada como (valor, instante) e DERIVADA no presente, exatamente como o
     * motor faz: derivar funciona mesmo com o servidor desligado a semana
     * inteira, enquanto guardar o valor atualizado exigiria alguém rodando um
     * relógio. */
    sobe: db => {
      db.exec(`ALTER TABLE criaturas ADD COLUMN stamina INTEGER NOT NULL DEFAULT 100`);
      db.exec(`ALTER TABLE criaturas ADD COLUMN stamina_em INTEGER NOT NULL DEFAULT 0`);

      db.exec(`
        CREATE TABLE expedicoes (
          id           TEXT PRIMARY KEY,
          user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          pack_id      TEXT NOT NULL,
          bioma        TEXT NOT NULL,
          perfil       TEXT NOT NULL,
          /* os ids das criaturas enviadas, na ordem em que foram escolhidas */
          equipe_json  TEXT NOT NULL,
          custo        INTEGER NOT NULL CHECK (custo >= 0),
          iniciada_em  INTEGER NOT NULL,
          termina_em   INTEGER NOT NULL,
          colhida_em   INTEGER,
          semente      TEXT,
          /* Expedição que termina antes de começar seria tempo negativo, e
             tempo negativo vira teto diário de graça. */
          CHECK (termina_em > iniciada_em),
          /* A SEMENTE E A COLHEITA ANDAM JUNTAS — ver o comentário acima. */
          CHECK ((colhida_em IS NULL) = (semente IS NULL))
        )`);
      /* O caminho quente é "o que está em campo agora", e ele é por jogador. */
      db.exec(`CREATE INDEX idx_exped_campo ON expedicoes(user_id, colhida_em, termina_em)`);

      /* A BOLSA.
       *
       * Uma linha por (jogador, item) e não uma por unidade: guardar vinte
       * linhas de "uma bola barata" seria vinte escritas onde cabe uma.
       *
       * O CHECK de não negativo é a última linha de defesa, e ela não pode
       * depender de o código de aplicação estar certo no dia — é a mesma
       * escolha do saldo da carteira, pelo mesmo motivo. Bolsa negativa é bola
       * de graça, e bola de graça é criatura de graça. */
      db.exec(`
        CREATE TABLE bolsa (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_id    TEXT NOT NULL,
          quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
          PRIMARY KEY (user_id, item_id)
        )`);

      /* O REGISTRO.
       *
       * Conta FRAGMENTOS e não porcentagem: a porcentagem sai do alvo da faixa,
       * que é dado do pack e pode ser rebalanceado. Guardar a porcentagem
       * congelaria o balanço de hoje na conta de todo mundo.
       *
       * `pack_id` viaja com a linha pelo mesmo motivo da criatura: o dex 25 de
       * um pack não é o 25 do outro. */
      db.exec(`
        CREATE TABLE registro (
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          pack_id    TEXT NOT NULL,
          dex        INTEGER NOT NULL CHECK (dex >= 1),
          fragmentos INTEGER NOT NULL DEFAULT 0 CHECK (fragmentos >= 0),
          visto_em   INTEGER NOT NULL,
          PRIMARY KEY (user_id, pack_id, dex)
        )`);
    },
    /* O SQLite deste projeto suporta DROP COLUMN, mas descer uma migração que
       ALTERA tabela é onde se perde dado por engano. As colunas de stamina
       ficam: elas têm padrão, não estorvam quem não as usa, e a versão gravada
       continua contando a história certa. */
    desce: db => {
      db.exec(`DROP TABLE IF EXISTS registro`);
      db.exec(`DROP TABLE IF EXISTS bolsa`);
      db.exec(`DROP TABLE IF EXISTS expedicoes`);
    },
  },
  {
    nome: 'idle-1.6a-encontros',
    /* O TETO DIÁRIO PASSA A CONTAR ENCONTROS (D-052).
     *
     * Contava expedições, e o que o jogador leva para casa não são expedições:
     * quatro Vigílias rendiam até 56 encontros contra os 27 do dia desenhado.
     * Ver o comentário do §P5 em `engine/expedicao.mjs`.
     *
     * A coluna guarda quantos encontros a colheita rendeu. `DEFAULT 0` e não
     * `NOT NULL` sem padrão: as expedições já colhidas antes desta migração não
     * têm o número, e inventá-lo seria pior que zerá-lo — zero as deixa fora da
     * conta do dia, e a janela móvel de 24 h as descarta sozinha em um dia. */
    sobe: db => {
      db.exec(`ALTER TABLE expedicoes ADD COLUMN encontros INTEGER NOT NULL DEFAULT 0`);
      /* O caminho quente do teto é "quantos encontros neste jogador desde
         ontem" — user_id e colhida_em, que o índice de campo não cobre porque
         ele filtra por colhida_em IS NULL. */
      db.exec(`CREATE INDEX idx_exped_colhidas
                 ON expedicoes(user_id, colhida_em)`);
    },
    desce: db => {
      db.exec(`DROP INDEX IF EXISTS idx_exped_colhidas`);
      db.exec(`ALTER TABLE expedicoes DROP COLUMN encontros`);
    },
  },
  {
    nome: 'sessao-revogada-st1.2b',
    /* O SAIR REVOGA NO SERVIDOR (ST-1.2b, DEC-07).
     *
     * A sessão continua sem estado — o token é assinado, e é isso que deixa o
     * servidor ter mais de um processo sem sessão pegajosa. O que entra aqui é
     * só a EXCEÇÃO: os tokens que o jogador matou antes do prazo.
     *
     * `expira_em` é o vencimento do próprio token: depois dele, a linha não
     * protege nada (o token já é recusado pela assinatura), e é apagada. A
     * lista tem o tamanho de "quantos Sair nos últimos 7 dias", e não cresce.
     *
     * ADITIVA e com volta: descer apaga a tabela, e o único efeito é o Sair
     * voltar a valer só no aparelho — que é o comportamento do ST-1.2. */
    sobe: db => {
      db.exec(`
        CREATE TABLE sessoes_revogadas (
          nonce       TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL,
          expira_em   INTEGER NOT NULL,
          revogada_em INTEGER NOT NULL
        )`);
      db.exec(`CREATE INDEX idx_revogadas_expira ON sessoes_revogadas(expira_em)`);
    },
    desce: db => { db.exec(`DROP TABLE IF EXISTS sessoes_revogadas`); },
  },
  {
    nome: 'posse-cosmetica-e4',
    /* A POSSE DE COSMÉTICO MORA NO SERVIDOR (E4 · INT-02).
     *
     * Só o que foi ADQUIRIDO: o padrão é derivado do catálogo, como no
     * cliente — guardar o padrão congelaria o catálogo de hoje na conta de todo
     * mundo, e uma peça que vira padrão amanhã não chegaria a ninguém.
     *
     * `origem` diz como veio. `npc` não está na lista de propósito: a roupa de
     * um NPC nunca é do jogador, e o CHECK é a última linha disso.
     *
     * O EQUIPADO numa tabela à parte, um por slot: equipar é escolha, e posse
     * é fato. Misturar faria "trocar de moldura" reescrever a linha que prova
     * a compra.
     *
     * ADITIVA e com volta: descer apaga as duas; a posse volta a ser do
     * navegador (o estado do ST-1.3, com a compra fechada com sessão). */
    sobe: db => {
      const familias = `'outfit','avatar','cena','moldura','efeito','arena'`;
      db.exec(`
        CREATE TABLE cosmetic_ownership (
          user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          familia      TEXT NOT NULL CHECK (familia IN (${familias})),
          item_id      TEXT NOT NULL,
          origem       TEXT NOT NULL CHECK (origem IN ('loja','fragmento','missao','concessao')),
          adquirido_em INTEGER NOT NULL,
          PRIMARY KEY (user_id, familia, item_id)
        )`);
      db.exec(`
        CREATE TABLE cosmetic_equipped (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          familia TEXT NOT NULL CHECK (familia IN (${familias})),
          item_id TEXT NOT NULL,
          PRIMARY KEY (user_id, familia)
        )`);
    },
    desce: db => {
      db.exec(`DROP TABLE IF EXISTS cosmetic_equipped`);
      db.exec(`DROP TABLE IF EXISTS cosmetic_ownership`);
    },
  },
  {
    nome: 'telemetria-chave-st7.1',
    /* O EVENTO REPETIDO CONTA UMA VEZ (ST-7.1a, OBS-01).
     *
     * O cliente relata o ESTADO (as runs do dia), e não o clique — então ele
     * reenvia o mesmo fato várias vezes, de propósito. A chave é do FATO
     * (`run:<instante>`, `exp:<id>`, a chave de idempotência da compra), e o
     * índice único por (usuário, evento, chave) faz o banco contar uma vez.
     * Parcial: os eventos de proteção antigos não têm chave, e seguem valendo.
     *
     * ADITIVA: descer apaga o índice e a coluna; os eventos ficam. */
    sobe: db => {
      db.exec(`ALTER TABLE telemetry_events ADD COLUMN chave TEXT`);
      db.exec(`CREATE UNIQUE INDEX idx_telemetria_chave
                 ON telemetry_events(user_id, nome, chave) WHERE chave IS NOT NULL`);
    },
    desce: db => {
      db.exec(`DROP INDEX IF EXISTS idx_telemetria_chave`);
      db.exec(`ALTER TABLE telemetry_events DROP COLUMN chave`);
    },
  },
  {
    nome: 'mercados-mutuos-st12.3',
    /* O BOLO MÚTUO (ST-12.3 · F2.1 · Spec §6.10).
     *
     * `markets` guarda o que o jogador leu ANTES de entrar — taxa e destino
     * "sem acerto" (§6.4: "escolhido por parâmetro e exibido antes") — e o que
     * a liquidação escreve depois. As colunas do preço do modelo nascem aqui e
     * ficam nulas até a ST-12.5; nenhuma rota as lê durante a janela (§6.6).
     *
     * UMA POSIÇÃO POR JOGADOR POR MERCADO, como no §5.6: trocar é UPDATE, e
     * sair-e-voltar reaproveita a linha. Várias posições no mesmo bolo não
     * dariam vantagem (a taxa come a cobertura), mas fariam o limite do §28.3
     * contar posições em vez de exposição.
     *
     * ADITIVA: descer apaga as duas; os lançamentos MARKET_* do ledger ficam,
     * porque o ledger é append-only e é a história do dinheiro. */
    sobe: db => {
      db.exec(`
        CREATE TABLE markets (
          id                    TEXT PRIMARY KEY,
          round_id              TEXT NOT NULL REFERENCES rounds(id),
          kind                  TEXT NOT NULL CHECK (kind IN ('abates','podio','duracao')),
          status                TEXT NOT NULL CHECK (status IN ('aberto','travado','liquidado','cancelado')),
          opens_at              INTEGER NOT NULL,
          locks_at              INTEGER NOT NULL,
          settled_at            INTEGER,
          fee_rate              REAL NOT NULL CHECK (fee_rate >= 0 AND fee_rate <= 0.5),
          no_winner_destination TEXT NOT NULL CHECK (no_winner_destination IN ('devolver','tesouraria')),
          residue_destination   TEXT NOT NULL DEFAULT 'tesouraria',
          pot_gross             INTEGER,
          pot_net               INTEGER,
          model_price_json      TEXT,
          model_priced_at       INTEGER,
          published_at          INTEGER,
          UNIQUE (round_id, kind),
          CHECK (locks_at > opens_at)
        )`);
      db.exec(`
        CREATE TABLE market_entries (
          id              TEXT PRIMARY KEY,
          market_id       TEXT NOT NULL REFERENCES markets(id),
          user_id         TEXT NOT NULL REFERENCES users(id),
          selection       INTEGER NOT NULL CHECK (selection >= 0),
          amount          INTEGER NOT NULL CHECK (amount > 0),
          stake_breakdown TEXT NOT NULL,
          status          TEXT NOT NULL
                            CHECK (status IN ('aberta','travada','cancelada','ganha','perdida','devolvida')),
          created_at      INTEGER NOT NULL,
          locked_at       INTEGER,
          payout          INTEGER CHECK (payout IS NULL OR payout >= 0),
          settled_at      INTEGER,
          UNIQUE (market_id, user_id)
        )`);
      db.exec(`CREATE INDEX idx_market_entries_mercado ON market_entries(market_id, status)`);
    },
    desce: db => {
      db.exec(`DROP TABLE IF EXISTS market_entries`);
      db.exec(`DROP TABLE IF EXISTS markets`);
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
