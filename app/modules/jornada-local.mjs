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
import { recompensaPve } from '../../engine/recompensa-pve.mjs';
import { chaveDoDoce } from '../../engine/doce.mjs';
import { diaDoMundo } from '../../engine/avanco.mjs';
import { idDaMoeda } from '../../engine/economia-idle.mjs';

/* ST-10.17: a luta PAGA na mesma gravação em que conta — a vitória e o
   pagamento não podem se separar (uma aba que grava a vitória e perde o
   pagamento, ou o contrário, é moeda criada ou sumida). */
export function lutarNaJornadaLocal({ pack, id, preset = 'balanced', semente = crypto.getRandomValues(new Uint32Array(1))[0], agora = Date.now() },
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
    const linhas = [...new Set(timeA.map(c => chaveDoDoce(pack, c.dex)))];
    const chefe = no.chefe ? treinador(pack, no.rival) : null;
    const rec = recompensaPve({ no: { id, ginasio: !!no.insignia, chefe: !!no.chefe, essencia: chefe?.essencia }, venceu: saida.resultado.vencedor === 'A', primeiraVez: saida.primeiraVez,
                                dia: diaDoMundo(agora), hoje: e.jornada?.pve, linhas });
    e.jornada = { ...saida.progresso, pve: rec.hoje };
    e.bolsa ??= {};
    if (rec.pokecoin) e.bolsa[idDaMoeda(pack)] = (e.bolsa[idDaMoeda(pack)] ?? 0) + rec.pokecoin;
    for (const [b, n] of Object.entries(rec.bolas)) e.bolsa[b] = (e.bolsa[b] ?? 0) + n;
    e.doces ??= {};
    for (const [l, n] of Object.entries(rec.doces)) e.doces[l] = (e.doces[l] ?? 0) + n;
    /* A essência do chefe vai para a bolsa, com a espécie na chave — nunca a
       criatura (L-057). */
    for (const [d, n] of Object.entries(rec.essencias ?? {})) e.bolsa[`essencia:${d}`] = (e.bolsa[`essencia:${d}`] ?? 0) + n;
    saida.recompensa = rec;
    return { ok: true };
  }, deposito);
  return r?.ok === false || r?.conflito ? r : { ok: true, ...saida };
}
