/* O VARREDOR DA ECONOMIA ENTRE JOGADORES (ST-14.16 · E14 · spec E14 §§8, 15).
 *
 * Duas tarefas, numa passada curta e repetível:
 *
 *   vencer       as ofertas cujo prazo passou, em LOTE limitado e da mais
 *                antiga — a oferta e as reservas dela juntas (`expirarOferta`)
 *   conciliar    medir o escrow contra o ledger e os lotes, e escrever o que
 *                não fecha (`conciliacao-economia.mjs`)
 *
 * SEPARADO DO LAÇO DA ARENA, de propósito: o laço gira a cada 250 ms e decide
 * quando a fase da rodada vira; amarrar a liquidação de trocas ao tick da
 * batalha faria uma conciliação lenta atrasar a janela de aposta. Aqui o
 * intervalo é de minuto, e quem tem pressa (a aceitação de uma oferta)
 * confere o prazo sozinho com `exigirVigente` — o varredor atrasado nunca
 * deixa passar uma oferta vencida, só demora a devolver o que ela prendia.
 *
 * REPETIR NÃO DUPLICA: vencer só muda reserva ATIVA, e a conciliação só abre
 * divergência que não está aberta. Por isso a passada que roda ao ligar —
 * depois de um crash, com tudo que venceu durante a queda — é a mesma de
 * sempre, e não um caminho de recuperação à parte.
 *
 * O ERRO NÃO PARA O VARREDOR NEM O JOGO: cada tarefa tenta poucas vezes
 * (`TENTATIVAS`), registra e segue. Insistir para sempre é o laço que
 * esquenta a CPU em cima do mesmo registro quebrado.
 */
import { expirarVencidas } from './reservas.mjs';
import { conciliarEconomia } from './conciliacao-economia.mjs';
import { emitir } from './telemetria.mjs';

export const INTERVALO_ECONOMIA_MS = 60_000;
export const LOTE_ECONOMIA = 200;
export const TENTATIVAS = 3;

function tentar(fn, { tentativas = TENTATIVAS, aoErro }) {
  let ultimo = null;
  for (let k = 0; k < tentativas; k++) {
    try { return { ok: true, valor: fn(), tentativas: k + 1 }; }
    catch (e) { ultimo = e; }
  }
  aoErro?.(ultimo);
  return { ok: false, erro: ultimo, tentativas };
}

/* Uma passada. Síncrona, e o `agora` é do SERVIDOR. */
export function passoEconomia(db, { agora, lote = LOTE_ECONOMIA, entidades = {}, aoErro = null, tentativas = TENTATIVAS }) {
  const venc = tentar(() => expirarVencidas(db, { agora, limite: lote, entidades, aoFalhar: e => aoErro?.(e) }), { tentativas, aoErro });
  const conc = tentar(() => conciliarEconomia(db, { agora }), { tentativas, aoErro });
  const m = {
    expiradas: venc.ok ? venc.valor.expiradas : 0,
    ofertas: venc.ok ? venc.valor.ofertas : 0,
    divergenciasNovas: conc.ok ? conc.valor.novas : 0,
    divergenciasAbertas: conc.ok ? conc.valor.abertas : null,
    falhas: (venc.ok ? venc.valor.falhas : 1) + (conc.ok ? 0 : 1),
  };
  /* A MÉTRICA SÓ QUANDO HÁ O QUE CONTAR: uma linha por minuto dizendo "nada"
     encheria a telemetria sem responder pergunta nenhuma. */
  if (m.expiradas || m.divergenciasNovas || m.falhas)
    emitir(db, { nome: 'economy_worker_pass', campos: m, chave: `econ:${agora}`, agora });
  return m;
}

export function criarWorkerEconomia({ db, relogio = Date.now, intervalo = INTERVALO_ECONOMIA_MS, lote = LOTE_ECONOMIA,
                                      entidades = {}, aoErro = null }) {
  let timer = null;
  const estado = { passos: 0, expiradas: 0, falhas: 0, ultimo: null };
  function passo() {
    const m = passoEconomia(db, { agora: relogio(), lote, entidades, aoErro });
    estado.passos++; estado.expiradas += m.expiradas; estado.falhas += m.falhas; estado.ultimo = m;
    return m;
  }
  return {
    passo,
    estado: () => ({ ...estado }),
    iniciar() { if (!timer) { timer = setInterval(passo, intervalo); timer.unref?.(); } },
    parar() { if (timer) { clearInterval(timer); timer = null; } },
    ativo: () => timer !== null,
  };
}
