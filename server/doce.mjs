/* O DOCE DA CONTA REAL — nasce na liquidação, desce ao aparelho no resgate (ST-9.9 · F3.8 · §7.8, §P2, §16.2).
 *
 * A REGRA É A DO MOTOR (`engine/doce.mjs`), importada e não copiada: a mesma
 * função decide o doce sem conta (ST-9.8) e com conta. Duas implementações
 * divergiriam no primeiro ajuste.
 *
 * ── DENTRO DA LIQUIDAÇÃO ─────────────────────────────────────────────────
 *
 * `creditarDoceDaAposta` é chamado DENTRO da transação do bilhete, em
 * `liquidarRodada`: uma falha depois do crédito desfaz a aposta e o doce
 * juntos. A proteção (§28.4) é conferida no instante da liquidação — quem
 * pediu pausa entre apostar e a rodada acabar não recebe.
 *
 * ── O RESGATE ─────────────────────────────────────────────────────────────
 *
 * O save do idle ainda é do aparelho (o idle vai ao servidor no E13). O doce
 * nasce aqui e DESCE: `resgatarDoces` zera o saldo e devolve o que havia, com
 * a chave de quem pede. A mesma chave devolve a mesma resposta — o aparelho
 * que caiu no meio pede de novo e não perde, nem dobra.
 */
import { doceDaAposta, chaveDoDoce, apostasComDoceNoDia } from '../engine/doce.mjs';
import { pausaAtiva } from './protecao.mjs';
import { emTransacao } from './carteira.mjs';
import { anotar } from './telemetria.mjs';
import { doceLivreDaAposta } from '../engine/doce-origem.mjs';

export const ERRO_DOCE = Object.freeze({ CHAVE: 'DOCE_CHAVE_INVALIDA' });

/* `composicao`: de que bolsos a aposta foi paga (ST-14.14c) — paga com o que
   não negocia, o doce nasce PRESO. Sem ela (legado), preso também. */
export function creditarDoceDaAposta(db, { pack, userId, betId, speciesId, venceu, composicao = null, agora = Date.now() }) {
  const hoje = db.prepare(`SELECT created_at FROM candy_ledger WHERE user_id = ? AND motivo = 'aposta'
                            AND created_at > ?`).all(userId, agora - 2 * 86_400_000).map(x => x.created_at);
  const quantidade = doceDaAposta({ venceu: !!venceu, houveAposta: true, protecaoAtiva: !!pausaAtiva(db, userId, agora),
                                    comDoceHoje: apostasComDoceNoDia(hoje, agora) });
  if (quantidade <= 0) return { quantidade: 0 };
  const linha = chaveDoDoce(pack, speciesId);
  const r = db.prepare(`INSERT OR IGNORE INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at)
                        VALUES (?, ?, ?, 'aposta', ?, ?)`).run(userId, linha, quantidade, `aposta:${betId}`, agora);
  if (r.changes === 0) return { quantidade: 0, repetida: true };
  const presos = doceLivreDaAposta(composicao) ? 0 : quantidade;
  db.prepare(`INSERT INTO species_candy (user_id, species_id, quantidade, presos) VALUES (?, ?, ?, ?)
              ON CONFLICT (user_id, species_id) DO UPDATE SET quantidade = quantidade + excluded.quantidade, presos = presos + excluded.presos`)
    .run(userId, linha, quantidade, presos);
  anotar(db, { nome: 'candy_credited', userId, chave: String(betId), agora, campos: { quantidade, venceu: !!venceu } });
  return { quantidade, linha };
}

export function docesDe(db, userId) {
  return Object.fromEntries(db.prepare(`SELECT species_id, quantidade FROM species_candy WHERE user_id = ? AND quantidade > 0`)
    .all(userId).map(x => [x.species_id, x.quantidade]));
}

const CHAVE_OK = /^[\w-]{8,64}$/;

export function resgatarDoces(db, { userId, chaveIdem, agora = Date.now() }) {
  if (typeof chaveIdem !== 'string' || !CHAVE_OK.test(chaveIdem))
    throw Object.assign(new Error('chave de resgate inválida'), { codigo: ERRO_DOCE.CHAVE });
  const prefixo = `resgate:${userId}:${chaveIdem}:`;
  return emTransacao(db, () => {
    /* A MESMA CHAVE, A MESMA RESPOSTA: o que ela já levou está no livro. */
    const ja = db.prepare(`SELECT species_id, delta FROM candy_ledger WHERE user_id = ? AND idem_key >= ? AND idem_key < ?`)
      .all(userId, prefixo, prefixo + '￿');
    if (ja.length) return { doces: Object.fromEntries(ja.map(x => [x.species_id, -x.delta])), repetido: true };
    const saldo = docesDe(db, userId);
    for (const [linha, n] of Object.entries(saldo)) {
      db.prepare(`INSERT INTO candy_ledger (user_id, species_id, delta, motivo, idem_key, created_at)
                  VALUES (?, ?, ?, 'resgate', ?, ?)`).run(userId, Number(linha), -n, prefixo + linha, agora);
      db.prepare(`UPDATE species_candy SET quantidade = quantidade - ?, presos = 0 WHERE user_id = ? AND species_id = ?`).run(n, userId, Number(linha));
    }
    return { doces: saldo, repetido: false };
  });
}
