/* A CARTEIRA NO SERVIDOR — ledger persistido, idempotente e atômico (F1.4).
 *
 * Fronteira: move dinheiro no banco. Não decide se uma aposta cabe (isso é
 * exposição), não sabe o que é uma rodada, não serve HTTP.
 *
 * ── O QUE ESTE ARQUIVO **NÃO** DECIDE ──────────────────────────────────────
 *
 * Nenhuma regra de dinheiro nasce aqui. A ordem de consumo, os buckets, a
 * proveniência do payout, os tipos de lançamento: tudo vem de
 * `engine/carteira.mjs`, que é a mesma fonte que o cliente usa. É a mesma
 * disciplina de `server/rodada.mjs` com o motor de batalha, e pelo mesmo motivo:
 * o dia em que o servidor tiver "a sua versão" das regras é o dia em que o
 * jogador vê um saldo na tela e outro no extrato.
 *
 * O que este arquivo acrescenta é o que só existe quando há um servidor:
 * persistência, idempotência e atomicidade.
 *
 * ── IDEMPOTÊNCIA ──────────────────────────────────────────────────────────
 *
 * `idem_key` é UNIQUE no esquema, e a chave é conferida DENTRO da transação.
 * Conferir antes seria o mesmo TOCTOU que a concorrência cria: duas chamadas
 * leem "não existe", as duas escrevem. Com a chave única, a segunda escrita
 * quebra — e quebrar é a resposta certa: a operação já aconteceu.
 *
 * ── ATOMICIDADE ───────────────────────────────────────────────────────────
 *
 * Saldo e ledger mudam na MESMA transação, sempre. Um ledger que registra o que
 * o saldo não refletiu (ou o contrário) é pior que nenhum ledger: ele parece
 * uma prova e é uma contradição, e quem for auditar vai acreditar nele.
 */
import { randomUUID } from 'node:crypto';
import { BUCKETS, ORDEM_CONSUMO, TIPOS } from '../engine/carteira.mjs';

export const ERRO_CARTEIRA = {
  VALOR:        'valor_invalido',
  SALDO:        'saldo_insuficiente',
  TIPO:         'tipo_desconhecido',
  BUCKET:       'bucket_desconhecido',
  JA_APLICADO:  'ja_aplicado',
};

const ehInteiroPositivo = v =>
  typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= Number.MAX_SAFE_INTEGER;

/* ── LEITURA ───────────────────────────────────────────────────────────────
 *
 * `carteiras` guarda o DISPONÍVEL por bucket; o RESERVADO é derivado do ledger.
 * Materializar os dois dobraria as chances de eles discordarem, e a
 * reconciliação existe justamente para provar que não discordam. */
export function saldos(db, userId) {
  const out = {};
  for (const b of BUCKETS) out[b] = 0;
  for (const r of db.prepare(`SELECT bucket, saldo FROM carteiras WHERE user_id = ?`).all(userId))
    out[r.bucket] = r.saldo;
  for (const b of BUCKETS) out['reservado_' + b] = 0;
  /* SOMA `reserva_delta`, e SÓ ele. A primeira versão somava `amount` para a
     reserva e o sinal saiu invertido: `amount` carrega o delta do DISPONÍVEL
     (negativo numa reserva), enquanto `reserva_delta` carrega o do reservado
     (positivo). São duas contas diferentes na mesma linha, e é por isso que as
     duas colunas existem. */
  for (const r of db.prepare(
    `SELECT bucket, SUM(reserva_delta) AS r
     FROM wallet_ledger WHERE user_id = ? GROUP BY bucket`).all(userId))
    out['reservado_' + r.bucket] = r.r || 0;
  return out;
}

export const ledgerDe = (db, userId) =>
  db.prepare(`SELECT * FROM wallet_ledger WHERE user_id = ? ORDER BY created_at, id`).all(userId);

/* ── ESCRITA ───────────────────────────────────────────────────────────────
 *
 * TODO movimento passa por aqui. Um único ponto de escrita é o que permite
 * afirmar que ledger e saldo nunca divergem — e é o que torna a reconciliação
 * uma conferência e não uma esperança.
 *
 * `linhas` = [{ bucket, tipo, delta, reservaDelta }], onde `delta` mexe no
 * disponível e `reservaDelta` no reservado. Os dois na mesma linha porque uma
 * reserva é uma coisa só: sai do disponível E entra no reservado, e separá-las
 * em dois lançamentos criaria um instante em que o dinheiro não está em lugar
 * nenhum. */
function aplicar(db, { userId, linhas, ref, refTipo, idem, memo, agora }) {
  for (const l of linhas) {
    if (!TIPOS.includes(l.tipo)) throw erro(ERRO_CARTEIRA.TIPO, `tipo desconhecido: ${l.tipo}`);
    if (!BUCKETS.includes(l.bucket)) throw erro(ERRO_CARTEIRA.BUCKET, `bucket desconhecido: ${l.bucket}`);
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    /* A CHAVE É CONFERIDA DENTRO DA TRANSAÇÃO, e por inserção — não por
       consulta prévia. Consultar antes é o mesmo TOCTOU da concorrência: duas
       chamadas leem "não existe" e as duas escrevem. */
    if (idem) {
      const ja = db.prepare(`SELECT 1 FROM wallet_ledger WHERE idem_key = ?`).get(idem);
      if (ja) { db.exec('ROLLBACK'); return { ok: true, repetida: true }; }
    }

    for (const [i, l] of linhas.entries()) {
      if (l.delta !== 0) {
        /* `saldo = saldo + ?` e não `saldo = ?`: escrever o valor calculado fora
           da transação é o TOCTOU de novo, com outra roupa. O CHECK do esquema
           recusa o resultado negativo, e a recusa aborta a transação inteira. */
        const r = db.prepare(
          `UPDATE carteiras SET saldo = saldo + ? WHERE user_id = ? AND bucket = ?`)
          .run(l.delta, userId, l.bucket);
        if (r.changes === 0) throw erro(ERRO_CARTEIRA.BUCKET, 'carteira inexistente para o bucket');
      }
      db.prepare(
        `INSERT INTO wallet_ledger (id, user_id, type, bucket, amount, reserva_delta,
                                    reference_type, reference_id, idem_key, memo, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .run(randomUUID(), userId, l.tipo, l.bucket,
             l.delta !== 0 ? l.delta : (l.reservaDelta || 0), l.reservaDelta || 0,
             refTipo ?? null, ref ?? null,
             /* Só a PRIMEIRA linha carrega a chave: ela é única no esquema, e um
                movimento de vários buckets é UMA operação. */
             i === 0 ? (idem ?? null) : null,
             memo ?? null, agora);
    }
    db.exec('COMMIT');
    return { ok: true };
  } catch (e) {
    db.exec('ROLLBACK');
    if (/CHECK constraint failed|saldo/.test(e.message))
      return { ok: false, motivo: ERRO_CARTEIRA.SALDO };
    if (/UNIQUE constraint failed: wallet_ledger.idem_key/.test(e.message))
      return { ok: true, repetida: true };
    throw e;
  }
}

const erro = (codigo, mensagem) => Object.assign(new Error(mensagem), { codigo });

/* ── AS OPERAÇÕES ─────────────────────────────────────────────────────────*/

export function creditar(db, { userId, tipo, bucket, valor, ref, refTipo, idem, memo, agora = Date.now() }) {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: ERRO_CARTEIRA.VALOR };
  return aplicar(db, { userId, ref, refTipo, idem, memo, agora,
    linhas: [{ bucket, tipo, delta: valor, reservaDelta: 0 }] });
}

/* RESERVAR — a ordem de consumo vem do MOTOR, e a composição volta para o
   ticket. O §5.5 é explícito: o ticket nunca grava só `stake = 100`; grava de
   onde os 100 saíram. Sem isso, o settlement não tem como preservar a origem. */
export function reservarNoBanco(db, { userId, valor, ref, agora = Date.now() }) {
  if (!ehInteiroPositivo(valor)) return { ok: false, motivo: ERRO_CARTEIRA.VALOR };

  const disp = saldos(db, userId);
  const composicao = {};
  let falta = valor;
  for (const b of ORDEM_CONSUMO) {
    if (falta <= 0) break;
    const usa = Math.min(falta, disp[b] || 0);
    if (usa > 0) { composicao[b] = usa; falta -= usa; }
  }
  if (falta > 0) return { ok: false, motivo: ERRO_CARTEIRA.SALDO };

  const r = aplicar(db, { userId, ref, refTipo: 'bet', agora,
    linhas: Object.entries(composicao).map(([bucket, n]) =>
      ({ bucket, tipo: 'BET_RESERVE', delta: -n, reservaDelta: n })) });
  return r.ok ? { ok: true, composicao } : r;
}

export function liberarNoBanco(db, { userId, composicao, ref, idem, agora = Date.now() }) {
  return aplicar(db, { userId, ref, refTipo: 'bet', idem, agora,
    linhas: Object.entries(composicao).map(([bucket, n]) =>
      ({ bucket, tipo: 'BET_RELEASE', delta: n, reservaDelta: -n })) });
}

/* LIQUIDAR — o payout HERDA A ORIGEM (§5.5), e é esta função que impede a Arena
   de virar conversor de bônus gratuito em saldo transferível. Um tipo POR
   BUCKET, não um só: um ledger que diz "BET_PAYOUT" sem dizer em quê não prova
   nada depois, e é justamente depois que alguém vai auditar. */
const TIPO_PAYOUT = {
  transferivel: 'BET_PAYOUT_TRANSFERABLE',
  pendente:     'BET_PAYOUT_TRANSFERABLE',
  bonus:        'BET_PAYOUT_BONUS',
  competitivo:  'BET_PAYOUT_COMPETITIVE',
};

export function liquidarNoBanco(db, { userId, composicao, ganhou, odd, ref, idem, agora = Date.now() }) {
  if (ganhou && (!Number.isFinite(odd) || odd <= 0))
    return { ok: false, motivo: ERRO_CARTEIRA.VALOR };
  const linhas = Object.entries(composicao).map(([bucket, n]) => ganhou
    ? { bucket, tipo: TIPO_PAYOUT[bucket], delta: Math.floor(n * odd), reservaDelta: -n }
    : { bucket, tipo: 'BET_LOSS', delta: 0, reservaDelta: -n });
  return aplicar(db, { userId, ref, refTipo: 'bet', idem, agora, linhas });
}

/* ── RECONCILIAÇÃO ────────────────────────────────────────────────────────
 *
 * Recalcula o saldo PELO LEDGER e compara com o materializado. É o que
 * transforma "saldo adulterado" em "saldo adulterado E DETECTADO" — e o que um
 * caminho novo com bug produz é exatamente isso: escrita direta na tabela de
 * saldo sem o lançamento correspondente. */
export function reconciliarNoBanco(db, userId) {
  const problemas = [];
  const calc = Object.fromEntries(BUCKETS.map(b => [b, 0]));
  for (const l of ledgerDe(db, userId)) {
    /* `amount` carrega o delta do DISPONÍVEL quando ele existe; quando o
       movimento só mexe em reservado (a perda), `amount` traz o delta da
       reserva e não deve entrar nesta soma. */
    if (l.type === 'BET_LOSS') continue;
    calc[l.bucket] += l.type === 'BET_RESERVE' ? -Math.abs(l.amount) : l.amount;
  }
  const guardado = saldos(db, userId);
  for (const b of BUCKETS)
    if (calc[b] !== guardado[b])
      problemas.push(`${b}: ledger diz ${calc[b]}, carteira diz ${guardado[b]}`);
  return problemas;
}
