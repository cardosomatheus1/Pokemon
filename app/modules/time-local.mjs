/* MEXER NO TIME — a gravação (ST-10.7).
 *
 * Camada 1. Tirar, pôr e trocar mexem só no `naCaixa` das criaturas, pela regra
 * de sempre (`mover`: teto de seis, e a equipe nunca vazia), e gravam com a
 * revisão da ST-3.2 — a mesma de doce-local. Trocar é tirar e pôr NA MESMA
 * gravação: duas gravações deixariam, entre elas, um time de cinco ou de sete.
 */
import { mover, equipeCheia } from './idle-dados.mjs';
import { comRevisao } from './doce-local.mjs';

const tentar = fn => e => { try { fn(e); return { ok: true }; } catch (x) { return { ok: false, motivo: x.message }; } };

export const moverLocal = ({ id, paraCaixa }, deposito = globalThis.localStorage) =>
  comRevisao(tentar(e => mover(e, id, paraCaixa)), deposito);

export const trocarLocal = ({ sai, entra }, deposito = globalThis.localStorage) =>
  /* A ORDEM depende do time: cheio, tira antes de pôr (o teto é seis); senão,
     põe antes de tirar (um time de um não pode ficar vazio no meio). */
  comRevisao(tentar(e => {
    if (equipeCheia(e)) { mover(e, sai, true); mover(e, entra, false); }
    else { mover(e, entra, false); mover(e, sai, true); }
  }), deposito);
