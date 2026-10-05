/* A LEITURA DO IDLE DA CONTA (ST-13.5a · E13) — camada 4.
 *
 * Pede `GET /api/idle` e os doces, passa por `idleDaConta` e grava no save do
 * aparelho, que as telas leem. Sem resposta, o save fica como estava e é
 * MARCADO desatualizado — a tela avisa em vez de inventar.
 */
import { api as apiPadrao } from './api.mjs';
import { carregar, salvar } from './idle-dados.mjs';
import { idleDaConta, desvioDoRelogio } from './idle-conta.mjs';
import { carregarMarcas, gravarMarcas, marcarVistas, marcarEncontrada } from './pokedex-estado.mjs';

export async function sincronizarIdleDaConta({ api = apiPadrao, deposito = globalThis.localStorage } = {}) {
  const treino = await api.post('/api/idle/treino', {});
  const [r, d] = await Promise.all([api.get('/api/idle'), api.get('/api/doces')]);
  const local = carregar(deposito);
  if (!r.ok || !r.corpo) {
    local.conta = { ...(local.conta ?? {}), desatualizado: true };
    salvar(local, deposito);
    return { ok: false, status: r.status };
  }
  const novo = idleDaConta(local, r.corpo, { doces: d.ok ? d.corpo?.doces ?? null : null, docesPresos: d.ok ? d.corpo?.presos ?? null : null });
  // Treino indisponível não apaga uma leitura válida nem mantém uma run fantasma.
  if (!treino.ok) novo.conta.desatualizado = true;
  /* O desvio do relógio (D-145): a hora do servidor contra a do aparelho na
     chegada — a run da tela anda no relógio do servidor. */
  novo.conta.desvio = desvioDoRelogio({ servidor: r.corpo.agora, local: Date.now() });
  salvar(novo, deposito);
  /* AS MARCAS DA ESCADA (ST-13.9b): as da conta SOMAM às do aparelho — as
     telas leem daqui, e a marca é só acréscimo. O que a missão mede é o que
     o servidor tem; a soma daqui só pinta. */
  if (r.corpo.marcas) {
    const m = carregarMarcas(deposito);
    marcarVistas(m, r.corpo.marcas.vistas ?? []);
    for (const dex of r.corpo.marcas.encontradas ?? []) marcarEncontrada(m, dex);
    gravarMarcas(m, deposito);
  }
  return { ok: treino.ok, ...(treino.ok ? {} : { status: treino.status }), treino: treino.corpo?.ganhos ?? [] };
}
