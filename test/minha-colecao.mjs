/* Q1/Q3 · MINHA COLEÇÃO, O PAINEL (ST-9.16a · F3.12 · Spec §7.15)
 *
 * As contagens batem com o save; o que o lutador faz na Arena só aparece de
 * ENCONTRADA para cima (a nota da ST-9.4) — nenhuma camada trancada vaza; e o
 * painel não recalcula nada do dossiê nem conhece o clima.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import pack from '../content/pokemon_kanto_v1.mjs';
import DOSSIE from '../content/dossie_pokemon_kanto_v1.mjs';
import * as E from './motor.mjs';
import { painelDaColecao } from '../app/modules/minha-colecao.mjs';
import { marcasVazias, marcarVistas, marcarEncontrada, DEGRAUS } from '../app/modules/pokedex-estado.mjs';
import { VAZIO } from '../app/modules/idle-dados.mjs';
import { sementes } from '../engine/seed.mjs';
import { baseDe } from '../engine/evolucao.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const T = Date.UTC(2026, 8, 1, 15);
const cria = (id, dex, naCaixa = false) => ({ id, dex, nivel: 5, xp: 0, vinculo: 0, foco: null, iv: [1, 1, 1, 1, 1, 1], natureza: 'Bold',
                                              origem: 'captura', stamina: 100, staminaEm: T, criadaEm: T, naCaixa });

export function suite() {
  const s = criarSuite('minha-colecao');
  const pool = E.sortearPool(sementes('minha-colecao').elenco);

  s.teste('as contagens batem com o save', () => {
    const e = VAZIO();
    e.criaturas = [cria('a', 4), cria('b', 7), cria('c', 4, true)];
    e.jaPossuiu = [1];
    e.doces = { 4: 5, 7: 2 };
    e.expedicoes = [{ id: 'x', colhidaEm: null, terminaEm: T - 1 }, { id: 'y', colhidaEm: null, terminaEm: T + 3600e3 }, { id: 'z', colhidaEm: T }];
    const { resumo } = painelDaColecao({ pack, estado: e, marcas: marcasVazias(), dossie: DOSSIE, agora: T });
    igual(JSON.stringify(resumo), JSON.stringify({ criaturas: 3, naEquipe: 2, naCaixa: 1, especies: 3, totalPokedex: pack.especies.length,
      doces: 7, expedicoesEmCampo: 2, prontas: 1 }), 'o resumo não bate com o save');
  });

  s.teste('a pool da rodada cruzada com o que o jogador sabe — e nada trancado vaza', () => {
    const e = VAZIO(), m = marcasVazias();
    marcarVistas(m, pool.map(f => f.dex));
    marcarEncontrada(m, pool[3].dex);
    e.criaturas = [cria('a', baseDe(pack, pool[5].dex))];
    e.doces = { [baseDe(pack, pool[5].dex)]: 4 };
    const odds = { lutadores: pool.map((f, idx) => ({ idx, odd: 2 + idx, prob: 1 / (2 + idx) })) };
    const { rodada } = painelDaColecao({ pack, estado: e, marcas: m, dossie: DOSSIE, pool, odds, agora: T });
    igual(rodada.length, 12, 'a rodada não tem os 12');
    igual(rodada.map(r => r.idx).join(), pool.map((_, i) => i).join(), 'a ordem não é a da odd');
    for (const r of rodada) {
      const deveTerNota = DEGRAUS.indexOf(r.degrau) >= DEGRAUS.indexOf('encontrada');
      igual(!!r.nota, deveTerNota, `${r.dex} (${r.degrau}): a nota ${r.nota ? 'apareceu' : 'sumiu'}`);
    }
    igual(rodada.find(r => r.idx === 3).degrau, 'encontrada', 'a apostada não está encontrada');
    const minha = rodada.find(r => r.idx === 5);
    ok(minha.minhasDaLinha === 1 && minha.docesDaLinha === 4, 'a linha do jogador não aparece na rodada');
    /* Nenhum campo de camada trancada, em lugar nenhum do painel. */
    ok(!/porClima|posicoes|abates|caiCedo|rival/.test(JSON.stringify(rodada)), 'o painel carrega uma camada do dossiê');
  });

  s.teste('nada recalculado fora do dossiê, e nada do clima', () => {
    const src = semComentario(fonte('../app/modules/minha-colecao.mjs'));
    ok(!/\.taxa\b|\.vitoria\b|\.especies\[|clima|weather/.test(src), 'o painel lê o dossiê ou o clima por conta própria');
    ok(/notaDaAposta\(\{ dossie, degrau: escada\.degrau, dex: f\.dex \}\)/.test(src), 'o painel não usa a nota da ST-9.4');
  });

  return s;
}
