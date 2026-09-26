/* OS QUATRO GOLPES QUE O JOGADOR ESCOLHE (ST-9.12 · F3.6 · Spec §7.11, §8.6).
 *
 * Camada 0. Cada criatura usa até quatro golpes entre os que o NÍVEL dela já
 * liberou (`repertorio`, 1.x). O campo `golpes` da criatura é aditivo: sem
 * ele (save antigo), valem os quatro mais recentes do repertório.
 *
 * ── O QUE O MOVESET NÃO TOCA (P4) ──────────────────────────────────────────
 *
 * A Arena escolhe os golpes dela por `atribuirGolpes`, e nada aqui chega lá.
 * No Avanço (R8) o moveset é VISUAL nesta fase: muda o nome do balão e o
 * efeito, e nunca o poder da wave — o motor sorteia um índice, e o tamanho da
 * lista só decide qual nome sai. O combate com golpe de verdade é o E10.
 */
import { repertorio } from '../../engine/repertorio.mjs';

export const GOLPES_MAX = 4;

/* AS LISTAS DE ONDE ELA ESCOLHE — as mesmas da Arena (`atribuirGolpes`): uma
   por tipo, mais a reserva. Só a do primeiro tipo dava ao Charmander 40 dois
   golpes para escolher quatro (achado no teste). Cada lista conserva a
   PRÓPRIA escala de nível (`repertorio`, 1.x): juntá-las antes mudaria em
   que nível cada golpe abre. */
export const listasDaEspecie = (pack, dex) => {
  const e = (pack?.especies ?? []).find(x => x.dex === dex);
  const g = pack?.golpes ?? {};
  const reserva = g[pack?.poolReserva ?? 'normal'] ?? g.normal ?? [];
  return [...(e?.t ?? []).map(t => g[t] ?? reserva), reserva];
};
/* A lista do PRIMEIRO tipo — a de sempre do balão, quando não há moveset. */
export const listaDaEspecie = (pack, dex) => listasDaEspecie(pack, dex)[0] ?? [];

/* Os golpes que o nível já abriu, sem repetir, na ordem das listas. */
export const liberados = (pack, dex, nivel) =>
  [...new Set(listasDaEspecie(pack, dex).flatMap(l => repertorio(nivel, l).map(g => g.n)))];

/* O padrão: os quatro mais recentes que o nível abriu NA LISTA DO TIPO —
   o que o balão já mostrava antes deste bloco, para o save antigo não mudar
   de golpes do nada; completa com os outros liberados se faltar. */
export function padraoDoMoveset(pack, dex, nivel) {
  const doTipo = repertorio(nivel, listaDaEspecie(pack, dex)).map(g => g.n).slice(-GOLPES_MAX);
  const resto = liberados(pack, dex, nivel).filter(n => !doTipo.includes(n));
  return [...doTipo, ...resto].slice(0, GOLPES_MAX);
}

export function movesetValido(pack, dex, nivel, golpes) {
  if (!Array.isArray(golpes) || golpes.length < 1) return { ok: false, motivo: 'escolha ao menos um golpe' };
  if (golpes.length > GOLPES_MAX) return { ok: false, motivo: `no máximo ${GOLPES_MAX} golpes` };
  if (new Set(golpes).size !== golpes.length) return { ok: false, motivo: 'golpe repetido' };
  const pode = new Set(liberados(pack, dex, nivel));
  const fora = golpes.find(g => !pode.has(g));
  if (fora) return { ok: false, motivo: `${fora} ainda não foi liberado para ela` };
  return { ok: true };
}

/* O moveset EM VIGOR: o escolhido, se ainda vale; senão, o padrão. Um
   escolhido que deixou de valer (o pack mudou) cai no padrão em vez de
   calar o balão. */
export function golpesDaCriatura(pack, c) {
  const nivel = Number(c?.nivel) || 1;
  return movesetValido(pack, c?.dex, nivel, c?.golpes).ok ? [...c.golpes] : padraoDoMoveset(pack, c?.dex, nivel);
}

/* Liga/desliga um golpe no moveset, devolvendo o NOVO (ou a recusa). */
export function alternarGolpe(pack, c, nome) {
  const atual = golpesDaCriatura(pack, c);
  const novo = atual.includes(nome) ? atual.filter(g => g !== nome) : [...atual, nome];
  const v = movesetValido(pack, c.dex, Number(c.nivel) || 1, novo);
  return v.ok ? { ok: true, golpes: novo } : v;
}
