/* QUAIS BOLOS ESTE SERVIDOR ABRE (ST-12.7 · §6.5) — só a lista e a leitura da
 * variável, sem motor: o `config.mjs` importa isto, e config não carrega pack.
 * O registro do que cada mercado FAZ é `mercado-tipos.mjs`; um teste confere
 * que as duas listas são a mesma. */
export const MERCADOS_CONHECIDOS = Object.freeze(['abates', 'podio']);
export const MERCADOS_PADRAO = Object.freeze(['abates']);

/* `MERCADOS=abates,podio`. Nome desconhecido RECUSA o processo — um erro de
   digitação que abrisse zero mercados em silêncio é o bolo sumindo sem aviso. */
export function lerMercados(texto) {
  if (!texto) return [...MERCADOS_PADRAO];
  const lista = [...new Set(String(texto).split(',').map(x => x.trim()).filter(Boolean))];
  const errados = lista.filter(k => !MERCADOS_CONHECIDOS.includes(k));
  if (errados.length || !lista.length)
    throw new Error(`MERCADOS desconhecido: ${errados.join(', ') || '(vazio)'}. Conhecidos: ${MERCADOS_CONHECIDOS.join(', ')}`);
  return lista;
}
