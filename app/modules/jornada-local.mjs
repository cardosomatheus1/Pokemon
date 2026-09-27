/* A LUTA DE JORNADA, GRAVADA (ST-10.11 · F4.5).
 *
 * Camada 1. Monta os dois times (o do jogador é a equipe do idle; o do rival,
 * o do nó com o padrão do moveset), luta pela regra do motor e grava o
 * progresso com a revisão da ST-3.2. A SEMENTE é escolhida ANTES: se a
 * gravação esbarrar noutra aba e tentar de novo, é a MESMA luta que roda — uma
 * segunda tentativa com outra semente seria jogar o dado até dar certo.
 */
import { comRevisao } from './doce-local.mjs';
import { entradasDoTime, rivalDe, treinador } from './treino-dados.mjs';
import { lutarNo, nosDa } from '../../engine/jornada.mjs';

export function lutarNaJornadaLocal({ pack, id, preset = 'balanced', semente = crypto.getRandomValues(new Uint32Array(1))[0] },
                                    deposito = globalThis.localStorage) {
  let saida = null;
  const r = comRevisao(e => {
    const no = nosDa(pack).find(n => n.id === id);
    if (!no) return { ok: false, motivo: `nó desconhecido: ${id}` };
    const timeA = entradasDoTime(pack, e), timeB = rivalDe(pack, treinador(pack, no.rival));
    if (!timeA.length) return { ok: false, motivo: 'o time está vazio' };
    try {
      saida = { ...lutarNo(pack, e.jornada, id, timeA, timeB, { semente, preset }), semente, timeA, timeB };
    } catch (x) { return { ok: false, motivo: x.message }; }
    e.jornada = saida.progresso;
    return { ok: true };
  }, deposito);
  return r?.ok === false || r?.conflito ? r : { ok: true, ...saida };
}
