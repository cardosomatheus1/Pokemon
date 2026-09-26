/* O RESGATE DA MISSÃO, GRAVADO (ST-9.15) — com a revisão da ST-3.2: a recusa
   por conflito relê e tenta uma vez; na releitura, a missão resgatada pela
   outra aba já está anotada. */
import { carregar, salvar } from './idle-dados.mjs';
import { resgatarMissao, missoesDaSemana } from './colecao-dados.mjs';

export function resgatarMissaoLocal(pack, args, deposito = globalThis.localStorage) {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const e = carregar(deposito);
    const r = resgatarMissao(pack, e, args);
    if (!r.ok) return r;
    if (salvar(e, deposito)) return r;
  }
  return { ok: false, motivo: 'outra aba gravou ao mesmo tempo — tente de novo' };
}

/* Abrir a semana também grava (a base precisa existir antes do progresso). */
export function quadroDaSemana(args, deposito = globalThis.localStorage) {
  const e = carregar(deposito);
  const antes = e.missoes?.semana;
  const quadro = missoesDaSemana(e, args);
  if (antes !== e.missoes.semana) salvar(e, deposito);
  return { e, quadro };
}
