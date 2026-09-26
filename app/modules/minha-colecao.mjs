/* MINHA COLEÇÃO — o álbum do treinador e o painel do apostador (ST-9.16a · F3.12 · §7.15).
 *
 * Camada 0. Junta o que já existe — equipe, escada da Pokédex, doces,
 * expedições, dossiê — e CRUZA a pool da rodada atual com o que o jogador
 * sabe de cada lutador. Critério do §7.15: dá para decidir em quem apostar
 * sem sair dela.
 *
 * ── NADA AQUI SABE MAIS DO QUE A ESCADA DEIXA ─────────────────────────────
 *
 * O que o lutador fez na Arena vem SÓ de `notaDaAposta` (ST-9.4), que já
 * respeita o degrau: quem só viu não ganha número nenhum. Este módulo não lê
 * taxa do dossiê, não recalcula nada, e não tem campo para clima — o painel é
 * o mesmo em qualquer clima da rodada (a técnica da ST-2.1).
 */
import { escadaDe } from './pokedex-estado.mjs';
import { notaDaAposta } from './dossie-ficha.mjs';
import { capturados } from './pokedex-dados.mjs';
import { baseDe } from '../../engine/evolucao.mjs';
import { pronta } from './idle-dados.mjs';

export function painelDaColecao({ pack, estado, marcas, dossie, pool = null, odds = null, agora = 0 }) {
  const e = estado;
  const tem = new Set([...(e.jaPossuiu ?? []).map(Number), ...capturados(e)]);
  const emCampo = (e.expedicoes ?? []).filter(x => !x.colhidaEm);
  const resumo = {
    criaturas: e.criaturas.length,
    naEquipe: e.criaturas.filter(c => !c.naCaixa).length,
    naCaixa: e.criaturas.filter(c => c.naCaixa).length,
    especies: tem.size,
    totalPokedex: pack.especies.length,
    doces: Object.values(e.doces ?? {}).reduce((a, b) => a + b, 0),
    expedicoesEmCampo: emCampo.length,
    prontas: emCampo.filter(x => pronta(x, agora)).length,
  };
  const rodada = !pool ? null : pool.map((f, idx) => {
    const escada = escadaDe(pack, e, f.dex, marcas);
    const linha = baseDe(pack, f.dex);
    const o = odds?.lutadores?.find(l => l.idx === idx) ?? null;
    return {
      idx, dex: f.dex, nome: f.n,
      degrau: escada.degrau, falta: escada.falta,
      nota: notaDaAposta({ dossie, degrau: escada.degrau, dex: f.dex }),
      minhasDaLinha: e.criaturas.filter(c => baseDe(pack, c.dex) === linha).length,
      docesDaLinha: e.doces?.[linha] ?? 0,
      odd: o?.odd ?? null, chance: o?.prob ?? null,
    };
  }).sort((a, b) => (a.odd ?? Infinity) - (b.odd ?? Infinity));
  return { resumo, rodada };
}
