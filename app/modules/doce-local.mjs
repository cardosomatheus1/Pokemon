/* O DOCE SEM CONTA — a gravação (ST-9.8 · F3.8).
 *
 * Lê o save do DISCO, aplica a regra de `doce-dados.mjs` e grava com a revisão
 * da ST-3.2. Uma recusa por conflito (outra aba gravou no meio) recarrega e
 * tenta de novo UMA vez: na segunda leitura a rodada já está anotada, se foi a
 * outra aba que creditou. Com conta, quem credita é o servidor (ST-9.9).
 */
import { carregar, salvar, ondeAventura } from './idle-dados.mjs';
import { aplicarDoceDaAposta, soltarCriatura, aplicarResgate, darDoce } from './doce-dados.mjs';

export function comRevisao(fn, deposito) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const e = carregar(deposito);
    const r = fn(e);
    if (!r || r.repetida || r.ok === false) return r;
    if (salvar(e, deposito)) return r;
  }
  return { quantidade: 0, conflito: true };
}

export const creditarDoceLocal = (args, deposito = globalThis.localStorage) =>
  comRevisao(e => aplicarDoceDaAposta(e, args), deposito);

export const soltarLocal = ({ pack, id }, deposito = globalThis.localStorage) =>
  comRevisao(e => soltarCriatura(e, { pack, id, ondeAventura }), deposito);

export const creditarResgateLocal = (args, deposito = globalThis.localStorage) =>
  comRevisao(e => aplicarResgate(e, args), deposito);

export const darDoceLocal = (args, deposito = globalThis.localStorage) =>
  comRevisao(e => darDoce(e, args), deposito);
