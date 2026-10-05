/* OS QUATRO GOLPES QUE O JOGADOR ESCOLHE (ST-9.12 · F3.6 · Spec §7.11, §8.6).
 *
 * Camada 0. Cada criatura usa até quatro golpes entre os que o NÍVEL dela já
 * liberou (`repertorio`, 1.x). O campo `golpes` da criatura é aditivo: sem
 * ele (save antigo), valem os quatro mais recentes do repertório.
 *
 * ── O QUE O MOVESET NÃO TOCA (P4) ──────────────────────────────────────────
 *
 * A Arena escolhe os golpes dela por `atribuirGolpes`, e nada aqui chega lá.
 * Runs antigas do Avanço usam esses nomes somente nos efeitos visuais.
 * Novas runs AT6-13 congelam o moveset e calculam cada golpe pela TBE,
 * como Jornada e Arena da coleção. A Arena comum continua independente.
 */
import { especieDe } from '../../engine/especie.mjs';
import { repertorio } from '../../engine/repertorio.mjs';
import { exclusivosAbertos } from '../../engine/exclusivos.mjs';

export const GOLPES_MAX = 4;

/* AS LISTAS DE ONDE ELA ESCOLHE — as mesmas da Arena (`atribuirGolpes`): uma
   por tipo, mais a reserva. Só a do primeiro tipo dava ao Charmander 40 dois
   golpes para escolher quatro (achado no teste). Cada lista conserva a
   PRÓPRIA escala de nível (`repertorio`, 1.x): juntá-las antes mudaria em
   que nível cada golpe abre. */
export const listasDaEspecie = (pack, dex) => {
  const e = especieDe(pack, dex);
  const g = pack?.golpes ?? {};
  const reserva = g[pack?.poolReserva ?? 'normal'] ?? g.normal ?? [];
  return [...(e?.t ?? []).map(t => g[t] ?? reserva), reserva];
};
/* A lista do PRIMEIRO tipo — a de sempre do balão, quando não há moveset. */
export const listaDaEspecie = (pack, dex) => listasDaEspecie(pack, dex)[0] ?? [];

/* Os golpes que o nível já abriu, sem repetir, na ordem das listas. */
const liberadosDasListas = (pack, dex, nivel) =>
  [...new Set(listasDaEspecie(pack, dex).flatMap(l => repertorio(nivel, l).map(g => g.n)))];

/* ST-10.3: e os EXCLUSIVOS — os que esta forma abriu no nível, mais os que a
   criatura GUARDOU ao evoluir (`guardados`, o campo `exclusivos` dela). */
export const liberados = (pack, dex, nivel, guardados = []) =>
  [...new Set([...liberadosDasListas(pack, dex, nivel), ...exclusivosAbertos(pack, dex, nivel), ...(guardados ?? [])])];

/* Quais, dos liberados, são exclusivos — a tela os marca. */
export const exclusivosDaCriatura = (pack, c) =>
  new Set([...exclusivosAbertos(pack, c?.dex, c?.nivel), ...(c?.exclusivos ?? [])]);

/* O padrão: os quatro mais recentes que o nível abriu NA LISTA DO TIPO —
   o que o balão já mostrava antes deste bloco, para o save antigo não mudar
   de golpes do nada; completa com os outros liberados se faltar. */
export function padraoDoMoveset(pack, dex, nivel) {
  const doTipo = repertorio(nivel, listaDaEspecie(pack, dex)).map(g => g.n).slice(-GOLPES_MAX);
  /* Sem os exclusivos: o padrão é o de sempre, e o save antigo não troca de
     golpe sozinho (ST-10.3). O exclusivo entra quando o jogador o escolhe. */
  const resto = liberadosDasListas(pack, dex, nivel).filter(n => !doTipo.includes(n));
  return [...doTipo, ...resto].slice(0, GOLPES_MAX);
}

export function movesetValido(pack, dex, nivel, golpes, guardados = []) {
  if (!Array.isArray(golpes) || golpes.length < 1) return { ok: false, motivo: 'escolha ao menos um golpe' };
  if (golpes.length > GOLPES_MAX) return { ok: false, motivo: `no máximo ${GOLPES_MAX} golpes` };
  if (new Set(golpes).size !== golpes.length) return { ok: false, motivo: 'golpe repetido' };
  const pode = new Set(liberados(pack, dex, nivel, guardados));
  /* O ÍNDICE, e não o elemento (ST-13.3b): `find` devolve o próprio golpe
     inválido — e quando ele é vazio (`undefined`, ''), o `if` o lia como "não
     achou" e o moveset passava. O servidor passou a confiar nesta regra. */
  const i = golpes.findIndex(g => typeof g !== 'string' || !pode.has(g));
  if (i >= 0) return { ok: false, motivo: `${golpes[i] || 'um golpe vazio'} ainda não foi liberado para ela` };
  return { ok: true };
}

/* O moveset EM VIGOR: o escolhido, se ainda vale; senão, o padrão. Um
   escolhido que deixou de valer (o pack mudou) cai no padrão em vez de
   calar o balão. */
export function golpesDaCriatura(pack, c) {
  const nivel = Number(c?.nivel) || 1;
  return movesetValido(pack, c?.dex, nivel, c?.golpes, c?.exclusivos).ok ? [...c.golpes] : padraoDoMoveset(pack, c?.dex, nivel);
}

/* Liga/desliga um golpe no moveset, devolvendo o NOVO (ou a recusa). */
export function alternarGolpe(pack, c, nome) {
  const atual = golpesDaCriatura(pack, c);
  const novo = atual.includes(nome) ? atual.filter(g => g !== nome) : [...atual, nome];
  const v = movesetValido(pack, c.dex, Number(c.nivel) || 1, novo, c.exclusivos);
  return v.ok ? { ok: true, golpes: novo } : v;
}

/* O MOVESET DO RIVAL (ST-10.13 · L-200): os quatro liberados que mais BATEM
   por quem os usa — poder × precisão × mesmo tipo (1,5) × categoria. A
   categoria conta pela maior das duas forças: golpe físico num atacante
   especial vale metade, e o inverso também. Sem isso o Chansey (ataque 5,
   especial 35) recebia quatro golpes físicos e vencia 0,1% no nível 50 — um
   ginásio com ele ensinaria que a espécie é inútil, e não que o golpe estava
   errado.

   Só o RIVAL usa esta regra. O padrão do jogador continua o de sempre, para o
   save antigo não trocar de golpe sozinho (ST-9.12); o jogador escolhe os
   dele. Os golpes vêm da mesma lista liberada pelo nível — o rival não tem
   golpe que o jogador não pudesse ter. Empate de nota: ordem alfabética. */
export function movesetDoRival(pack, dex, nivel) {
  const e = especieDe(pack, dex);
  if (!e) return padraoDoMoveset(pack, dex, nivel);
  const fisico = e.s[1] >= e.s[3];
  const todos = Object.values(pack.golpes ?? {}).flat();
  const nota = n => {
    const g = todos.find(x => x.n === n);
    if (!g) return 0;
    return g.p * (g.acc ?? 1) * (e.t.includes(g.t) ? 1.5 : 1) * ((g.cat === 'fis') === fisico ? 1 : 0.5);
  };
  const lista = liberadosDasListas(pack, dex, nivel).map(n => [n, nota(n)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
  /* L-201 (decidida na ST-10.19c): o rival é ESPECIALISTA — luta com os golpes
     do próprio tipo, e a reserva só completa quando ele tem menos de dois.
     Acima do nível 45 a reserva dava o Skull Bash (130, o maior poder da
     lista) a quase todo rival: a Lorelei deixava de usar Água e Gelo, e a
     lição do ginásio sumia debaixo de um golpe Normal. */
  const tipo = n => todos.find(x => x.n === n)?.t;
  const cat = n => todos.find(x => x.n === n)?.cat;
  const proprios = lista.filter(n => e.t.includes(tipo(n)));
  /* E dentro do tipo, a categoria da força dele (L-200), se sobrarem dois. */
  const naForca = proprios.filter(n => (cat(n) === 'fis') === fisico);
  return (naForca.length >= 2 ? naForca : proprios.length >= 2 ? proprios : lista).slice(0, GOLPES_MAX);
}
