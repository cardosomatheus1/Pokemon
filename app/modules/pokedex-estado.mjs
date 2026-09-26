/* A ESCADA DE INFORMAÇÃO DA POKÉDEX — vista, encontrada, capturada, dominada
 * (ST-9.2 · F3.10 · Spec §7.4).
 *
 * Camada 0: decide em que degrau cada espécie da Arena está e o que falta para
 * o próximo. A tela (ST-9.3) pinta; o dossiê (ST-9.1) é o que cada degrau
 * libera.
 *
 * ── OS DEGRAUS, DECLARADOS ────────────────────────────────────────────────
 *
 *   VISTA        esteve numa rodada que o jogador recebeu, ou ele a viu no
 *                idle (o registro, que já é "ter visto" desde o 1.22)
 *   ENCONTRADA   apostou nela, ou ela foi a escolha de MAIOR peso numa
 *                previsão da Liga (R3: sob limite de proteção a Liga continua
 *                sendo caminho de progressão, §6.13)
 *   CAPTURADA    possui ou JÁ POSSUIU a forma, por captura ou evolução (C5 do
 *                PLANO: com a DEC-08 a captura entrega a forma mostrada)
 *   DOMINADA     capturada, e o registro DA LINHA completo — fragmentos da
 *                base e das evoluções somados contra o alvo da raridade da
 *                base. Pelo dex da forma final ninguém dominaria o Charizard:
 *                formas finais quase não aparecem na natureza
 *
 * MONOTÔNICA: soltar ou evoluir nunca desce um degrau. Por isso "já possuiu"
 * é um campo gravado (`jaPossuiu`), sincronizado com as criaturas a cada
 * gravação — derivar só das criaturas atuais faria soltar a última apagar o
 * degrau.
 *
 * ── ONDE CADA MARCA MORA ─────────────────────────────────────────────────
 *
 * "Já possuiu" é sobre criaturas: mora no save do idle. "Viu" e "apostou" são
 * da ARENA, e moram numa chave própria (`ar_escada_arena`): gravá-las no save
 * do idle a partir da arena subiria a revisão dele (ST-3.2), e a próxima
 * gravação do idle esbarraria num conflito que ninguém causou de propósito.
 *
 * ── O QUE NÃO MUDA ────────────────────────────────────────────────────────
 *
 * Vagas e teto de encontros continuam contando SÓ o registro do idle
 * (`especiesVistas`). Ver o Charizard na Arena não dá vaga de expedição: a
 * escada do 1.19 é do idle, e esta é da informação.
 */
import { capturados, vistosDe } from './pokedex-dados.mjs';
import { linhaDe, baseDe } from '../../engine/evolucao.mjs';
import { raridadeDe } from '../../engine/bioma.mjs';
import { alvoRegistro } from '../../engine/captura.mjs';
import { DOSSIES } from '../../content/escolhido.mjs';

export const DEGRAUS = Object.freeze(['desconhecida', 'vista', 'encontrada', 'capturada', 'dominada']);

/* O que cada degrau libera no dossiê — cumulativo: quem está em "capturada"
   vê também o que "vista" e "encontrada" liberam. */
export const LIBERA = Object.freeze({
  vista: ['vitoria'],
  encontrada: ['abates', 'caiCedo'],
  capturada: ['porClima', 'rival'],
  dominada: ['posicoes'],
});

const conjunto = v => new Set((Array.isArray(v) ? v : []).map(Number).filter(Number.isFinite));

/* O campo novo do save do idle, aditivo: num save antigo, "já possuiu" nasce
   das criaturas atuais. */
export function camposDaEscada(cru, criaturas = []) {
  return { jaPossuiu: [...new Set([...conjunto(cru?.jaPossuiu), ...capturados({ criaturas })])] };
}
export const sincronizarPossuidas = e => { e.jaPossuiu = [...new Set([...(e.jaPossuiu ?? []), ...capturados(e)])]; };

/* ── AS MARCAS DA ARENA, NA CHAVE PRÓPRIA ─────────────────────────────── */
export const CHAVE_MARCAS = 'ar_escada_arena';
export const marcasVazias = () => ({ vistas: [], encontradas: [] });
export function carregarMarcas(deposito = globalThis.localStorage) {
  try {
    const c = JSON.parse(deposito?.getItem(CHAVE_MARCAS) ?? 'null');
    return { vistas: [...conjunto(c?.vistas)], encontradas: [...conjunto(c?.encontradas)] };
  } catch { return marcasVazias(); }
}
export function gravarMarcas(m, deposito = globalThis.localStorage) {
  try { deposito?.setItem(CHAVE_MARCAS, JSON.stringify(m)); return true; } catch { return false; }
}
/* Quem vê a rodada e quem aposta chamam isto: lê, acrescenta, grava. */
export function registrarVistas(dexes, deposito = globalThis.localStorage) {
  const m = carregarMarcas(deposito); marcarVistas(m, dexes); return gravarMarcas(m, deposito);
}
export function registrarEncontrada(dex, deposito = globalThis.localStorage) {
  const m = carregarMarcas(deposito); marcarEncontrada(m, dex); return gravarMarcas(m, deposito);
}
/* Cada uma só ACRESCENTA. */
export const marcarVistas = (m, dexes) => { m.vistas = [...new Set([...(m.vistas ?? []), ...dexes.map(Number)])]; };
export const marcarEncontrada = (m, dex) => { m.encontradas = [...new Set([...(m.encontradas ?? []), Number(dex)])]; };

/* Fragmentos da LINHA e o alvo da raridade da base. */
export function registroDaLinha(pack, e, dex) {
  const linha = linhaDe(pack, dex);
  const fragmentos = linha.reduce((a, d) => a + (Number(e?.registro?.[d]) || 0), 0);
  const base = (pack.especies ?? []).find(x => x.dex === baseDe(pack, dex));
  const alvo = base ? alvoRegistro(pack, raridadeDe(pack, base)) : 0;
  return { fragmentos, alvo, completo: alvo > 0 && fragmentos >= alvo };
}

export function degrauDe(pack, e, dex, marcas = marcasVazias()) {
  const d = Number(dex);
  const possuiu = conjunto(e?.jaPossuiu).has(d) || capturados(e).has(d);
  if (possuiu && registroDaLinha(pack, e, d).completo) return 'dominada';
  if (possuiu) return 'capturada';
  if (conjunto(marcas?.encontradas).has(d)) return 'encontrada';
  if (conjunto(marcas?.vistas).has(d) || vistosDe(e).has(d)) return 'vista';
  return 'desconhecida';
}

/* O que o degrau atual já libera, e o que falta para o próximo — em frase que
   a tela usa sem montar texto. */
export function escadaDe(pack, e, dex, marcas) {
  const degrau = degrauDe(pack, e, dex, marcas);
  const i = DEGRAUS.indexOf(degrau);
  const liberado = DEGRAUS.slice(1, i + 1).flatMap(g => LIBERA[g]);
  const reg = registroDaLinha(pack, e, dex);
  const falta = {
    desconhecida: 'veja-a numa rodada da Arena',
    vista: 'aposte nela uma vez, ou dê a ela o maior peso numa previsão da Liga',
    encontrada: 'tenha uma: capture ou evolua até ela',
    /* "da linha, somando as formas": sem isso o topo dizia "3 de 8" e o rodapé
       da ficha "0 fragmento(s)" — os dois certos, e a leitura sem saída (Q7). */
    capturada: `junte os fragmentos da linha nos encontros do idle (${reg.fragmentos} de ${reg.alvo}, somando as formas)`,
    dominada: null,
  }[degrau];
  return { degrau, liberado, proximo: DEGRAUS[i + 1] ?? null, falta };
}

/* O que a POKÉDEX conta como visto: o que o idle viu, mais o que a Arena
   mostrou. Só a Pokédex — vagas e teto seguem com `especiesVistas`. */
export const vistosNaPokedex = (e, marcas) => new Set([...vistosDe(e), ...conjunto(marcas?.vistas)]);

/* O dossiê DESTE pack (ST-9.3). Um pack sem dossiê gerado não inventa um:
   a seção "Na Arena" simplesmente não aparece. */
export const dossieDoPack = pack => DOSSIES[pack?.id] ?? null;
