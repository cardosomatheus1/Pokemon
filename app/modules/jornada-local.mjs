/* A LUTA DE JORNADA, GRAVADA (ST-10.11 · F4.5).
 *
 * Camada 1. Monta os dois times (o do jogador é a equipe do idle; o do rival,
 * o do nó com o padrão do moveset), luta pela regra do motor e grava o
 * progresso com a revisão da ST-3.2. A SEMENTE é escolhida ANTES: se a
 * gravação esbarrar noutra aba e tentar de novo, é a MESMA luta que roda — uma
 * segunda tentativa com outra semente seria jogar o dado até dar certo.
 */
import { comRevisao } from './doce-local.mjs';
import { contaDaLuta } from './jornada-conta.mjs';
import { diaDoMundo } from '../../engine/avanco.mjs';

/* ST-10.17: a luta PAGA na mesma gravação em que conta — a vitória e o
   pagamento não podem se separar (uma aba que grava a vitória e perde o
   pagamento, ou o contrário, é moeda criada ou sumida). ST-13.7: a conta é a
   `contaDaLuta`, a mesma do servidor; aqui só se grava o que ela devolveu. */
export function lutarNaJornadaLocal({ pack, id, preset = 'balanced', semente = crypto.getRandomValues(new Uint32Array(1))[0], agora = Date.now() },
                                    deposito = globalThis.localStorage) {
  let saida = null;
  const r = comRevisao(e => {
    const c = contaDaLuta({ pack, criaturas: e.criaturas, jornada: e.jornada, id, preset, semente, dia: diaDoMundo(agora) });
    if (!c.ok) return c;
    const { jornada, credito, ...resto } = c;
    saida = resto;
    e.jornada = jornada;
    e.bolsa ??= {};
    for (const [k, n] of Object.entries(credito.bolsa)) e.bolsa[k] = (e.bolsa[k] ?? 0) + n;
    e.doces ??= {};
    for (const [l, n] of Object.entries(credito.doces)) e.doces[l] = (e.doces[l] ?? 0) + n;
    return { ok: true };
  }, deposito);
  return r?.ok === false || r?.conflito ? r : { ok: true, ...saida };
}
