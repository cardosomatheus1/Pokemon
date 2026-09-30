/* A LEITURA DO IDLE DA CONTA (ST-13.5a · E13) — camada 4.
 *
 * Pede `GET /api/idle` e os doces, passa por `idleDaConta` e grava no save do
 * aparelho, que as telas leem. Sem resposta, o save fica como estava e é
 * MARCADO desatualizado — a tela avisa em vez de inventar.
 */
import { api as apiPadrao } from './api.mjs';
import { carregar, salvar } from './idle-dados.mjs';
import { idleDaConta } from './idle-conta.mjs';

export async function sincronizarIdleDaConta({ api = apiPadrao, deposito = globalThis.localStorage } = {}) {
  const [r, d] = await Promise.all([api.get('/api/idle'), api.get('/api/doces')]);
  const local = carregar(deposito);
  if (!r.ok || !r.corpo) {
    local.conta = { ...(local.conta ?? {}), desatualizado: true };
    salvar(local, deposito);
    return { ok: false, status: r.status };
  }
  salvar(idleDaConta(local, r.corpo, { doces: d.ok ? d.corpo?.doces ?? null : null }), deposito);
  return { ok: true };
}
