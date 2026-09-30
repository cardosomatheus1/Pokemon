/* A OPERAÇÃO ECONÔMICA IDEMPOTENTE (ST-14.0B2 · E14 · spec E14 §8).
 *
 * Toda troca, anúncio e compra entre jogadores é UMA operação: vários passos
 * na carteira, na bolsa e na coleção, e ou todos acontecem ou nenhum.
 *
 * Três regras, e cada uma fecha um jeito conhecido de perder ou duplicar:
 *   - RECUSA É EXCEÇÃO. As funções da carteira recusam devolvendo
 *     `{ ok: false }`, e dentro de uma transação isso NÃO desfaz os passos
 *     anteriores — o débito de A ficaria gravado com o crédito de B recusado.
 *     `passo(r)` transforma a recusa em exceção, e a exceção desfaz tudo.
 *   - A CHAVE É DA CONTA. Repetir a mesma chave com o mesmo pedido devolve o
 *     recibo gravado, sem refazer nada (o timeout que se repete); a mesma
 *     chave com OUTRO pedido é conflito — nunca "a primeira vence em silêncio".
 *   - O PEDIDO É COMPARADO PELO HASH da forma canônica (chaves ordenadas): a
 *     ordem dos campos não muda o pedido.
 */
import { createHash, randomUUID } from 'node:crypto';
import { emTransacao } from './carteira.mjs';

export const ERRO_OPERACAO = Object.freeze({
  CHAVE: 'OPERACAO_CHAVE_INVALIDA',
  CONFLITO: 'OPERACAO_CONFLITO',
  RECUSA: 'OPERACAO_RECUSADA',
});
const erro = (codigo, msg) => Object.assign(new Error(msg), { codigo });

const canonico = v => (Array.isArray(v) ? `[${v.map(canonico).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null));
export const hashDoPedido = (tipo, pedido) => createHash('sha256').update(canonico({ tipo, pedido })).digest('hex');

/* A recusa vira exceção — e a exceção desfaz a operação inteira. */
export function passo(r) {
  if (r && r.ok === false) throw erro(ERRO_OPERACAO.RECUSA, r.motivo ?? 'recusado');
  return r;
}

export function executarOperacao(db, { userId, tipo, chave, pedido, agora = Date.now() }, fazer) {
  if (typeof chave !== 'string' || !/^[\w-]{8,64}$/.test(chave)) throw erro(ERRO_OPERACAO.CHAVE, 'chave da operação inválida');
  const hash = hashDoPedido(tipo, pedido);
  return emTransacao(db, () => {
    const ja = db.prepare(`SELECT hash, resultado_json FROM economic_operations WHERE user_id = ? AND chave = ?`).get(userId, chave);
    if (ja) {
      if (ja.hash !== hash) throw erro(ERRO_OPERACAO.CONFLITO, 'esta chave já foi usada em outro pedido');
      return { ...JSON.parse(ja.resultado_json), repetida: true };
    }
    const resultado = fazer();
    db.prepare(`INSERT INTO economic_operations (id, user_id, chave, tipo, hash, resultado_json, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), userId, chave, tipo, hash, JSON.stringify(resultado ?? {}), agora);
    return resultado;
  });
}
