/* EVOLUIR OU ESPERAR — os golpes exclusivos da forma pré-evoluída
 * (ST-10.3 · F3.5 · Spec §7.10).
 *
 * O pack declara, por forma, golpes que SÓ ela aprende, cada um a partir de
 * um nível. Evoluir antes desse nível torna o golpe inalcançável; evoluir
 * depois o GUARDA na criatura (`criatura.exclusivos`), e ele segue liberado
 * para o moveset da forma nova.
 *
 * ── O QUE ISTO NÃO TOCA (P4) ──────────────────────────────────────────────
 *
 * A Arena escolhe os golpes dela por `atribuirGolpes`, e nada daqui chega lá:
 * o golpe exclusivo só luta na Trainer Battle Engine, porque só lá o golpe é
 * o que o jogador escolheu.
 */
import { saidasDe } from './evolucao.mjs';

export const exclusivosDe = (pack, dex) => pack?.exclusivos?.[Number(dex)] ?? [];

/* Os que ESTA forma, neste nível, já aprendeu. */
export const exclusivosAbertos = (pack, dex, nivel) =>
  exclusivosDe(pack, dex).filter(x => Number(nivel) >= x.nivel).map(x => x.n);

/* Os que a criatura leva ao evoluir: os que já trazia, mais os desta forma. */
export const guardadosAoEvoluir = (pack, criatura) =>
  [...new Set([...(criatura?.exclusivos ?? []), ...exclusivosAbertos(pack, criatura?.dex, criatura?.nivel)])];

/* O que se perde se evoluir AGORA: os desta forma que o nível ainda não abriu. */
export const perdidosAoEvoluir = (pack, criatura) =>
  exclusivosDe(pack, criatura?.dex).filter(x => Number(criatura?.nivel) < x.nivel);

/* A frase da tela de evolução. `null` quando não se perde nada. */
export function avisoDeEvolucao(pack, criatura) {
  const perde = perdidosAoEvoluir(pack, criatura);
  if (!perde.length) return null;
  return `Evoluir agora perde ${perde.map(x => `${x.n} (nível ${x.nivel})`).join(' e ')} — só esta forma aprende`;
}

/* As formas que vêm DEPOIS desta, na linha (todas as saídas, recursivamente). */
export function formasSeguintes(pack, dex) {
  const vistas = new Set(), fila = [Number(dex)];
  while (fila.length) for (const e of saidasDe(pack, fila.shift()))
    if (!vistas.has(e.para)) { vistas.add(e.para); fila.push(e.para); }
  return [...vistas];
}

/* A validação do conteúdo: a forma existe e evolui, o golpe existe, o nível
   está na faixa, e NENHUMA forma seguinte alcança o tipo do golpe — senão
   ele não é exclusivo, é só adiantado. */
export function problemasDosExclusivos(pack) {
  const problemas = [];
  const golpe = n => Object.values(pack.golpes ?? {}).flat().find(g => g.n === n);
  const reserva = pack.poolReserva ?? 'normal';
  for (const [k, lista] of Object.entries(pack.exclusivos ?? {})) {
    const dex = Number(k);
    const esp = (pack.especies ?? []).find(e => e.dex === dex);
    if (!esp) { problemas.push(`exclusivos: a forma ${k} não existe`); continue; }
    if (!saidasDe(pack, dex).length) problemas.push(`exclusivos: ${esp.n} não evolui — golpe dela não é "de antes"`);
    if (!Array.isArray(lista) || !lista.length || lista.length > 2) problemas.push(`exclusivos: ${esp.n} precisa de 1 a 2`);
    for (const x of lista ?? []) {
      const g = golpe(x.n);
      if (!g) { problemas.push(`exclusivos: ${esp.n} — golpe "${x.n}" não existe no pack`); continue; }
      if (!Number.isInteger(x.nivel) || x.nivel < 1 || x.nivel > 100) problemas.push(`exclusivos: ${esp.n} — nível ${x.nivel}`);
      for (const f of formasSeguintes(pack, dex)) {
        const fe = pack.especies.find(e => e.dex === f);
        if (fe && [...fe.t, reserva].includes(g.t)) problemas.push(`exclusivos: ${x.n} (${g.t}) de ${esp.n} é alcançável por ${fe.n}`);
      }
    }
  }
  return problemas;
}

