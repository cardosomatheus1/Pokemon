/* O DOCE DA CONTA DESCE AO APARELHO (ST-9.9 · R5).
 *
 * Com conta, o doce nasce no servidor, na liquidação. O idle ainda mora no
 * aparelho (E13), então o doce precisa DESCER: pede-se o resgate com uma chave
 * guardada ANTES do pedido. Se a resposta se perder, ou a aba fechar entre a
 * resposta e a gravação, o próximo pedido usa a MESMA chave e o servidor
 * devolve a MESMA resposta — que o save reconhece e não credita de novo.
 */
import { api as apiPadrao } from './api.mjs';
import { creditarResgateLocal } from './doce-local.mjs';
import { IDLE_NA_CONTA } from './idle-conta.mjs';
import { sincronizarIdleDaConta } from './idle-servidor.mjs';

const CHAVE_PENDENTE = 'ar_doce_resgate';
const ler = () => { try { return localStorage.getItem(CHAVE_PENDENTE); } catch { return null; } };
const gravar = v => { try { v ? localStorage.setItem(CHAVE_PENDENTE, v) : localStorage.removeItem(CHAVE_PENDENTE); } catch { /* privativo */ } };
const novaChave = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ── COM O IDLE NA CONTA, O DOCE NÃO DESCE (ST-2.22a, D-144) ──────────────
 * Desde a ST-13.5e a conta é a fonte do idle — e do doce. O resgate abaixo
 * continuou rodando depois de todo resultado da Arena: zerava o doce da conta
 * e o somava ao save, a tela mostrava o dobro, e o "dar doce" (que pergunta
 * à conta) recusava com "sem doce da linha dela". Agora o fim da rodada só
 * RELÊ a conta. O resgate fica para o idle no aparelho, que é o caso em que
 * ele foi desenhado. */
let emVoo = null;
export function trazerDocesDoServidor({ api = apiPadrao, deposito = globalThis.localStorage } = {}) {
  if (!api.temSessao() || emVoo) return emVoo;
  if (IDLE_NA_CONTA) {
    emVoo = sincronizarIdleDaConta({ api, deposito }).finally(() => { emVoo = null; });
    return emVoo;
  }
  const chave = ler() ?? novaChave();
  gravar(chave);
  emVoo = api.post('/api/doces/resgatar', { chaveIdem: chave }).then(r => {
    if (!r.ok) return null;
    const c = creditarResgateLocal({ chave, doces: r.corpo?.doces ?? {} });
    if (!c?.conflito) gravar(null);
    return c;
  }).finally(() => { emVoo = null; });
  return emVoo;
}
